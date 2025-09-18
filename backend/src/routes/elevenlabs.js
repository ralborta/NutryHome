const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ ENDPOINT PARA OBTENER DETALLES DE UNA CONVERSACIÓN ESPECÍFICA
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log(`🔍 Railway: Fetching details for ${conversationId}`);

    // 1. Verificar en base de datos primero
    const dbConversation = await prisma.isabelaConversation.findUnique({
      where: { conversationId }
    });

    if (dbConversation && dbConversation.variables?.transcript) {
      console.log('✅ Found in PostgreSQL');
      return res.json({
        success: true,
        transcript: dbConversation.variables.transcript,
        summary: dbConversation.summary,
        source: 'database'
      });
    }

    // 2. Si no está en DB, obtener de ElevenLabs
    console.log('📡 Fetching from ElevenLabs...');
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      // Intentar con history endpoint como fallback
      const historyResponse = await fetch(
        `https://api.elevenlabs.io/v1/history/${conversationId}`,
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY
          }
        }
      );

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        return res.json({
          success: true,
          transcript: historyData.text || 'No disponible',
          summary: historyData.text?.substring(0, 200),
          source: 'history'
        });
      }

      throw new Error('Not found in ElevenLabs');
    }

    const data = await response.json();
    
    // Buscar transcripción en diferentes campos posibles
    const transcript = 
      data.transcript ||
      data.analysis?.transcript ||
      data.analysis?.transcript_text ||
      data.messages?.map(m => `${m.role}: ${m.content}`).join('\n') ||
      null;

    const summary = 
      data.analysis?.transcript_summary ||
      data.summary ||
      data.call_summary_title ||
      null;

    // Guardar en DB si encontramos transcripción
    if (transcript) {
      await prisma.isabelaConversation.upsert({
        where: { conversationId },
        update: { 
          summary: summary,
          variables: { transcript: transcript }
        },
        create: { 
          conversationId, 
          summary: summary,
          variables: { transcript: transcript }
        }
      });
      console.log('✅ Saved to PostgreSQL');
    }

    res.json({
      success: true,
      transcript: transcript || 'No hay transcripción disponible',
      summary: summary || 'Sin resumen',
      source: 'elevenlabs'
    });

  } catch (error) {
    console.error('❌ Railway Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ ENDPOINT PRINCIPAL - LISTA DE CONVERSACIONES
router.get('/conversations', async (req, res) => {
  try {
    console.log('📋 Railway: Fetching all conversations');
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${process.env.ELEVENLABS_AGENT_ID}&limit=50`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        }
      }
    );

    const data = await response.json();
    const conversations = data.conversations || [];

    // Enriquecer cada conversación
    const enrichedConversations = await Promise.all(
      conversations.slice(0, 20).map(async (conv) => {
        try {
          // Verificar si tenemos datos en DB
          const dbData = await prisma.isabelaConversation.findUnique({
            where: { conversationId: conv.conversation_id }
          });

          if (dbData) {
            return {
              ...conv,
              transcript: dbData.variables?.transcript,
              summary: dbData.summary,
              hasTranscript: !!dbData.variables?.transcript,
              hasAudio: true
            };
          }

          // Si no, intentar obtener de ElevenLabs
          const detailResponse = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`,
            {
              headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY
              }
            }
          );

          if (detailResponse.ok) {
            const details = await detailResponse.json();
            return {
              ...conv,
              transcript: details.transcript || details.analysis?.transcript,
              summary: details.analysis?.transcript_summary,
              hasTranscript: !!(details.transcript || details.analysis?.transcript),
              hasAudio: true
            };
          }
        } catch (error) {
          console.error(`Error enriching ${conv.conversation_id}:`, error);
        }
        
        return {
          ...conv,
          hasTranscript: false,
          hasAudio: false
        };
      })
    );

    res.json({
      success: true,
      conversations: enrichedConversations,
      total: enrichedConversations.length
    });

  } catch (error) {
    console.error('❌ Railway conversations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ ENDPOINT PARA AUDIO - MEJORADO
router.get('/audio/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log(`🔊 Railway: Fetching audio for ${conversationId}`);

    // Intentar múltiples endpoints de ElevenLabs
    const endpoints = [
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
      `https://api.elevenlabs.io/v1/history/${conversationId}/audio`,
      `https://api.elevenlabs.io/v1/history/download/${conversationId}`
    ];

    for (const endpoint of endpoints) {
      console.log(`Trying: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Accept': 'audio/mpeg'
        }
      });

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        
        if (audioBuffer.byteLength > 1000) {
          console.log(`✅ Audio found at ${endpoint}`);
          res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.byteLength,
            'Cache-Control': 'public, max-age=3600'
          });
          return res.send(Buffer.from(audioBuffer));
        }
      }
    }

    throw new Error('Audio not found in any endpoint');

  } catch (error) {
    console.error('❌ Audio error:', error);
    res.status(404).json({
      success: false,
      error: 'Audio no disponible'
    });
  }
});

// ✅ WEBHOOK: POST /api/elevenlabs/webhook
// Recibe transcripciones de ElevenLabs
router.post('/webhook', async (req, res) => {
  try {
    console.log('📨 Webhook received from ElevenLabs');
    
    const {
      conversation_id,
      type,
      transcript,
      summary,
      analysis,
      metadata,
      conversation_initiation_client_data
    } = req.body;

    console.log(`Processing webhook type: ${type} for conversation: ${conversation_id}`);

    // Guardar en base de datos
    if (type === 'post_call_transcription' || type === 'conversation.completed') {
      await prisma.isabelaConversation.upsert({
        where: { conversationId: conversation_id },
        update: {
          transcript: transcript || analysis?.transcript,
          summary: summary || analysis?.transcript_summary,
          variables: conversation_initiation_client_data?.dynamic_variables,
          metadata: metadata,
          updatedAt: new Date()
        },
        create: {
          conversationId: conversation_id,
          transcript: transcript || analysis?.transcript,
          summary: summary || analysis?.transcript_summary,
          variables: conversation_initiation_client_data?.dynamic_variables,
          metadata: metadata
        }
      });

      console.log(`✅ Transcription saved for ${conversation_id}`);
    }

    // Responder inmediatamente a ElevenLabs
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;