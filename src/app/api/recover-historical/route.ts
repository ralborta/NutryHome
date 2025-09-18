import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting historical data recovery from frontend...');
    
    // Verificar que las variables de entorno estén disponibles
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) {
      throw new Error('Missing ElevenLabs API credentials');
    }

    // Obtener todas las conversaciones de ElevenLabs
    const conversationsResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${process.env.ELEVENLABS_AGENT_ID}&limit=50`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        }
      }
    );
    
    if (!conversationsResponse.ok) {
      throw new Error(`Failed to fetch conversations: ${conversationsResponse.status}`);
    }
    
    const conversationsData = await conversationsResponse.json();
    const conversations = conversationsData.conversations || [];
    
    console.log(`📊 Found ${conversations.length} conversations`);
    
    // Procesar cada conversación
    const results = {
      processed: 0,
      withTranscript: 0,
      withAudio: 0,
      errors: 0,
      conversations: []
    };
    
    for (const conv of conversations.slice(0, 10)) { // Limitar a 10 para prueba
      try {
        console.log(`🔍 Processing: ${conv.conversation_id}`);
        
        // Obtener detalles completos
        const detailResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`,
          {
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY!
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
          details.messages?.map((m: any) => `${m.role}: ${m.content || m.message}`).join('\n') ||
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
              'xi-api-key': process.env.ELEVENLABS_API_KEY!,
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
          variables: variables,
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
    
    return NextResponse.json({
      success: true,
      message: 'Historical data recovery completed',
      results
    });
    
  } catch (error) {
    console.error('❌ Recovery error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
