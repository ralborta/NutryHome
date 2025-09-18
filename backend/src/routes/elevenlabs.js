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

module.exports = router;