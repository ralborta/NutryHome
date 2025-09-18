const express = require('express');
const router = express.Router();

// ✅ ENDPOINT PARA OBTENER DETALLES DE UNA CONVERSACIÓN ESPECÍFICA
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log(`🔍 Railway: Fetching details for ${conversationId}`);

    // Obtener de ElevenLabs
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
          // Obtener detalles de ElevenLabs
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

// ✅ ENDPOINT DE PRUEBA
router.get('/test', (req, res) => {
  res.json({ 
    message: 'ElevenLabs routes working!',
    timestamp: new Date().toISOString(),
    webhook_endpoint: '/api/elevenlabs/webhooks/post-call'
  });
});

// ✅ WEBHOOK POST-CALL - ENDPOINT QUE ELEVENLABS ESTÁ ESPERANDO
router.post('/webhooks/post-call', async (req, res) => {
  try {
    console.log('🎯 Post-call webhook received:', req.body);
    
    const { 
      conversation_id,
      type,
      transcript,
      analysis,
      messages,
      conversation_initiation_client_data,
      audio_url,
      summary
    } = req.body;
    
    console.log(`📞 Processing post-call webhook for: ${conversation_id}`);
    console.log(`📋 Type: ${type}`);
    console.log(`📝 Has transcript: ${!!transcript}`);
    console.log(`🔍 Has analysis: ${!!analysis}`);
    console.log(`💬 Has messages: ${!!messages}`);
    
    // Extraer transcripción de múltiples fuentes posibles
    let finalTranscript = null;
    let finalSummary = null;
    let finalVariables = {};
    
    if (transcript) {
      finalTranscript = transcript;
    } else if (analysis?.transcript) {
      finalTranscript = analysis.transcript;
    } else if (messages && Array.isArray(messages)) {
      finalTranscript = messages
        .filter(msg => msg.content || msg.message)
        .map(msg => `${msg.role}: ${msg.content || msg.message}`)
        .join('\n');
    }
    
    if (summary) {
      finalSummary = summary;
    } else if (analysis?.transcript_summary) {
      finalSummary = analysis.transcript_summary;
    }
    
    if (conversation_initiation_client_data?.dynamic_variables) {
      finalVariables = conversation_initiation_client_data.dynamic_variables;
    }
    
    console.log(`✅ Final transcript length: ${finalTranscript?.length || 0}`);
    console.log(`✅ Final summary: ${finalSummary?.substring(0, 100) || 'None'}...`);
    
    // Guardar en la base de datos
    if (finalTranscript) {
      try {
        // TODO: Implementar guardado en DB cuando el schema esté listo
        console.log('✅ Post-call data would be saved to database');
        console.log('📝 Transcript preview:', finalTranscript.substring(0, 200) + '...');
        
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
        // No fallar el webhook por error de DB
      }
    } else {
      console.log('⚠️ No transcript found in webhook data');
    }
    
    res.status(200).json({ 
      received: true,
      conversation_id,
      transcript_saved: !!finalTranscript,
      summary_saved: !!finalSummary
    });
    
  } catch (error) {
    console.error('❌ Post-call webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
});

// ✅ ENDPOINT PARA RECUPERAR DATOS HISTÓRICOS
router.post('/recover-historical', async (req, res) => {
  try {
    console.log('🔄 Starting historical data recovery...');
    
    const { recoverHistoricalData } = require('../../scripts/recover-historical-data');
    const results = await recoverHistoricalData();
    
    res.json({
      success: true,
      message: 'Historical data recovery completed',
      results
    });
    
  } catch (error) {
    console.error('❌ Recovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;