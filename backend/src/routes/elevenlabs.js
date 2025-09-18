const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ ENDPOINT: GET /api/elevenlabs/conversations
// Obtiene conversaciones con transcripciones desde ElevenLabs
router.get('/conversations', async (req, res) => {
  try {
    console.log('📥 Fetching conversations from ElevenLabs...');
    
    const { limit = 50, include_transcripts = 'true' } = req.query;
    
    // 1. Obtener conversaciones de ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${process.env.ELEVENLABS_AGENT_ID}&limit=${limit}`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    const conversations = data.conversations || [];

    // 2. Obtener detalles completos (incluyendo transcripciones)
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        try {
          // Primero verificar si tenemos la transcripción en DB
          const dbConversation = await prisma.isabelaConversation.findUnique({
            where: { conversationId: conv.conversation_id }
          });

          // Si tenemos transcripción en DB y es reciente, usarla
          if (dbConversation?.transcript) {
            console.log(`✅ Using cached transcript for ${conv.conversation_id}`);
            return {
              ...conv,
              transcript: dbConversation.transcript,
              summary: dbConversation.summary,
              variables: dbConversation.variables,
              source: 'database'
            };
          }

          // Si no, obtener de ElevenLabs
          console.log(`🔄 Fetching fresh data for ${conv.conversation_id}`);
          const detailResponse = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`,
            {
              headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Accept': 'application/json'
              }
            }
          );

          if (detailResponse.ok) {
            const details = await detailResponse.json();
            
            // Guardar en DB para cache
            if (details.transcript || details.analysis?.transcript) {
              await prisma.isabelaConversation.upsert({
                where: { conversationId: conv.conversation_id },
                update: {
                  transcript: details.transcript || details.analysis?.transcript,
                  summary: details.analysis?.transcript_summary,
                  variables: details.conversation_initiation_client_data?.dynamic_variables,
                  updatedAt: new Date()
                },
                create: {
                  conversationId: conv.conversation_id,
                  transcript: details.transcript || details.analysis?.transcript,
                  summary: details.analysis?.transcript_summary,
                  variables: details.conversation_initiation_client_data?.dynamic_variables
                }
              });
            }

            return {
              ...conv,
              ...details,
              transcript: include_transcripts === 'true' ? (details.transcript || details.analysis?.transcript) : undefined,
              summary: details.analysis?.transcript_summary || conv.call_summary_title,
              variables: details.conversation_initiation_client_data?.dynamic_variables,
              source: 'elevenlabs'
            };
          }
        } catch (error) {
          console.error(`Error fetching details for ${conv.conversation_id}:`, error);
        }
        return conv;
      })
    );

    res.json({
      success: true,
      conversations: conversationsWithDetails,
      total: conversationsWithDetails.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// ✅ ENDPOINT: GET /api/elevenlabs/audio/:id
// Proxy para obtener audio de ElevenLabs
router.get('/audio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔊 Fetching audio for: ${id}`);

    // Obtener audio de ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${id}/audio`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Accept': 'audio/mpeg'
        }
      }
    );

    if (!response.ok) {
      // Intentar con el endpoint de history si falla
      const historyResponse = await fetch(
        `https://api.elevenlabs.io/v1/history/${id}/audio`,
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Accept': 'audio/mpeg'
          }
        }
      );

      if (!historyResponse.ok) {
        throw new Error('Audio not found');
      }

      const audioBuffer = await historyResponse.arrayBuffer();
      res.set('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(audioBuffer));
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error(`❌ Error fetching audio ${req.params.id}:`, error);
    res.status(404).json({
      success: false,
      error: 'Audio not found'
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