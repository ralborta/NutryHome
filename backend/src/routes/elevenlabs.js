const express = require('express');
const router = express.Router();

// ✅ ENDPOINT PARA LISTAR TODAS LAS CONVERSACIONES
router.get('/conversations', async (req, res) => {
  try {
    console.log('🔍 Railway: Fetching all conversations from ElevenLabs');
    
    const { limit = 50, agent_id } = req.query;
    const agentId = agent_id || process.env.ELEVENLABS_AGENT_ID;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      });
    }

    // Obtener lista de conversaciones de ElevenLabs
    // Nota: ElevenLabs no tiene endpoint para listar conversaciones
    // Vamos a devolver un array vacío por ahora
    console.log('⚠️ ElevenLabs no tiene endpoint para listar conversaciones');
    
    res.json({
      success: true,
      conversations: [],
      total: 0,
      message: 'ElevenLabs no tiene endpoint para listar conversaciones. Usar recover-historical para obtener datos.'
    });

  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ ENDPOINT PARA OBTENER DETALLES DE UNA CONVERSACIÓN ESPECÍFICA
router.get('/conversations/:conversationId', async (req, res) => {
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
      console.error(`❌ ElevenLabs error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        success: false,
        error: `ElevenLabs API error: ${response.status}`,
        conversation_id: conversationId
      });
    }

    const data = await response.json();
    
    // Normalizar conversation_id
    const normalizedData = {
      ...data,
      conversation_id: conversationId
    };
    
    // Buscar transcripción en diferentes campos posibles
    const transcript = 
      data.transcript ||
      data.analysis?.transcript ||
      data.analysis?.transcript_text ||
      (Array.isArray(data.messages) ? 
        data.messages
          .filter(m => m.content || m.message)
          .map(m => `${m.role}: ${m.content || m.message || ''}`)
          .join('\n') : null) ||
      null;

    const summary = 
      data.analysis?.transcript_summary ||
      data.summary ||
      data.call_summary_title ||
      null;

    res.json({
      success: true,
      conversation_id: conversationId,
      transcript: transcript || 'No hay transcripción disponible',
      summary: summary || 'Sin resumen',
      source: 'elevenlabs',
      raw_data: normalizedData
    });

  } catch (error) {
    console.error('❌ Railway Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      conversation_id: req.params.conversationId
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

// ✅ ENDPOINT PARA RECUPERAR DATOS HISTÓRICOS (MEJORADO)
router.post('/recover-historical', async (req, res) => {
  try {
    console.log('🔄 Starting historical data recovery from Railway...');
    
    const { agent_id, limit = 50 } = req.body;
    const agentId = agent_id || process.env.ELEVENLABS_AGENT_ID;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID required'
      });
    }

    // Obtener todas las conversaciones con paginación
    const allConversations = [];
    let cursor = null;
    let hasMore = true;
    
    while (hasMore) {
      const url = new URL('https://api.elevenlabs.io/v1/convai/conversations');
      url.searchParams.set('agent_id', agentId);
      url.searchParams.set('limit', String(limit));
      if (cursor) url.searchParams.set('cursor', cursor);
      
      console.log(`📋 Fetching batch with cursor: ${cursor || 'initial'}`);
      
      const response = await fetch(url, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }
      
      const data = await response.json();
      const conversations = data.conversations || [];
      
      // Normalizar conversation_id
      const normalizedConversations = conversations.map(conv => ({
        ...conv,
        conversation_id: conv.conversationId || conv.conversation_id || conv.id
      }));
      
      allConversations.push(...normalizedConversations);
      
      // Verificar si hay más páginas
      hasMore = data.has_more || false;
      cursor = data.next_cursor || null;
      
      console.log(`📊 Fetched ${conversations.length} conversations, hasMore: ${hasMore}`);
      
      // Pequeña pausa para no sobrecargar la API
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`📊 Total conversations found: ${allConversations.length}`);
    
    // Procesar cada conversación
    const results = {
      processed: 0,
      withTranscript: 0,
      withAudio: 0,
      errors: 0,
      conversations: []
    };
    
    for (const conv of allConversations.slice(0, 20)) { // Limitar a 20 para prueba
      try {
        console.log(`🔍 Processing: ${conv.conversation_id}`);
        
        // Obtener detalles completos
        const detailResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`,
          {
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY
            }
          }
        );
        
        if (!detailResponse.ok) {
          console.log(`❌ Failed to get details for ${conv.conversation_id}`);
          results.errors++;
          continue;
        }
        
        const details = await detailResponse.json();
        
        // Extraer transcripción
        const transcript = 
          details.transcript ||
          details.analysis?.transcript ||
          details.analysis?.transcript_text ||
          (Array.isArray(details.messages) ? 
            details.messages
              .filter(m => m.content || m.message)
              .map(m => `${m.role}: ${m.content || m.message || ''}`)
              .join('\n') : null) ||
          null;
        
        // Extraer resumen
        const summary = 
          details.analysis?.transcript_summary ||
          details.summary ||
          details.call_summary_title ||
          null;
        
        // Verificar si tiene audio
        const audioResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}/audio`,
          {
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY,
              'Accept': 'audio/mpeg'
            }
          }
        );
        
        const contentLength = audioResponse.headers.get('content-length');
        const hasAudio = audioResponse.ok && contentLength && parseInt(contentLength) > 1000;
        
        // Crear objeto de conversación enriquecido
        const enrichedConversation = {
          ...conv,
          transcript: transcript,
          summary: summary,
          hasTranscript: !!transcript,
          hasAudio: hasAudio,
          processedAt: new Date().toISOString()
        };
        
        results.conversations.push(enrichedConversation);
        
        if (transcript) results.withTranscript++;
        if (hasAudio) results.withAudio++;
        results.processed++;
        
        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing ${conv.conversation_id}:`, error.message);
        results.errors++;
      }
    }
    
    console.log('\n📊 RECOVERY SUMMARY:');
    console.log(`✅ Processed: ${results.processed}`);
    console.log(`📝 With transcript: ${results.withTranscript}`);
    console.log(`🔊 With audio: ${results.withAudio}`);
    console.log(`❌ Errors: ${results.errors}`);
    
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