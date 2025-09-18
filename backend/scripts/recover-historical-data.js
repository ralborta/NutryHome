const fetch = require('node-fetch');

// Script para recuperar datos históricos de ElevenLabs
async function recoverHistoricalData() {
  try {
    console.log('🔄 Starting historical data recovery...');
    
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
    
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
      throw new Error('Missing ElevenLabs API credentials');
    }
    
    // 1. Obtener todas las conversaciones
    console.log('📋 Fetching all conversations...');
    const conversationsResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${ELEVENLABS_AGENT_ID}&limit=100`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );
    
    if (!conversationsResponse.ok) {
      throw new Error(`Failed to fetch conversations: ${conversationsResponse.status}`);
    }
    
    const conversationsData = await conversationsResponse.json();
    const conversations = conversationsData.conversations || [];
    
    console.log(`📊 Found ${conversations.length} conversations`);
    
    // 2. Procesar cada conversación
    const results = {
      processed: 0,
      withTranscript: 0,
      withAudio: 0,
      errors: 0
    };
    
    for (const conv of conversations) {
      try {
        console.log(`\n🔍 Processing: ${conv.conversation_id}`);
        
        // Obtener detalles completos
        const detailResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`,
          {
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY
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
          details.messages?.map(m => `${m.role}: ${m.content || m.message}`).join('\n') ||
          null;
        
        // Extraer resumen
        const summary = 
          details.analysis?.transcript_summary ||
          details.summary ||
          details.call_summary_title ||
          null;
        
        // Extraer variables dinámicas
        const variables = 
          details.conversation_initiation_client_data?.dynamic_variables ||
          details.context_variables ||
          details.dynamic_variables ||
          {};
        
        // Verificar si tiene audio
        const audioResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}/audio`,
          {
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Accept': 'audio/mpeg'
            }
          }
        );
        
        const hasAudio = audioResponse.ok && audioResponse.headers.get('content-length') > 1000;
        
        // Mostrar resultados
        console.log(`  📝 Transcript: ${transcript ? '✅' : '❌'} (${transcript?.length || 0} chars)`);
        console.log(`  📋 Summary: ${summary ? '✅' : '❌'} (${summary?.substring(0, 50) || 'None'}...)`);
        console.log(`  🔊 Audio: ${hasAudio ? '✅' : '❌'}`);
        console.log(`  🔧 Variables: ${Object.keys(variables).length} found`);
        
        if (transcript) results.withTranscript++;
        if (hasAudio) results.withAudio++;
        
        // TODO: Guardar en base de datos
        console.log(`  💾 Would save to database: ${conv.conversation_id}`);
        
        results.processed++;
        
        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing ${conv.conversation_id}:`, error.message);
        results.errors++;
      }
    }
    
    // Mostrar resumen final
    console.log('\n📊 RECOVERY SUMMARY:');
    console.log(`✅ Processed: ${results.processed}`);
    console.log(`📝 With transcript: ${results.withTranscript}`);
    console.log(`🔊 With audio: ${results.withAudio}`);
    console.log(`❌ Errors: ${results.errors}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Recovery failed:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  recoverHistoricalData()
    .then(() => {
      console.log('✅ Historical data recovery completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Recovery failed:', error);
      process.exit(1);
    });
}

module.exports = { recoverHistoricalData };
