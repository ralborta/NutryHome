import { NextResponse } from 'next/server';

export async function GET() {
  const conversationId = 'conv_8701k59fbew6ea881fgb6ht20v0r';
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  
  const results = {
    conversationId,
    tests: {} as any,
    transcript: '' as string
  };
  
  // 1. Obtener detalles de la conversación
  try {
    const convResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        headers: {
          'xi-api-key': apiKey,
          'Accept': 'application/json'
        }
      }
    );
    
    if (convResponse.ok) {
      const data = await convResponse.json();
      
      results.tests.conversation = {
        found: true,
        hasTranscript: !!(data.transcript || data.analysis?.transcript),
        transcriptLocation: data.transcript ? 'root' : data.analysis?.transcript ? 'analysis' : 'none',
        duration: data.call_duration_secs || data.metadata?.call_duration_secs,
        historyItemId: data.metadata?.history_item_id || data.history_item_id,
        audioUrl: data.audio_url,
        recordingUrl: data.recording_url,
        metadataKeys: Object.keys(data.metadata || {})
      };
      
            // Extraer transcripción (puede ser array o string)
            let transcriptText = '';
            if (data.transcript) {
              if (Array.isArray(data.transcript)) {
                transcriptText = data.transcript.map((msg: any) => `${msg.role}: ${msg.message}`).join('\n');
              } else if (typeof data.transcript === 'string') {
                transcriptText = data.transcript;
              }
            } else if (data.analysis?.transcript) {
              if (Array.isArray(data.analysis.transcript)) {
                transcriptText = data.analysis.transcript.map((msg: any) => `${msg.role}: ${msg.message}`).join('\n');
              } else if (typeof data.analysis.transcript === 'string') {
                transcriptText = data.analysis.transcript;
              }
            }
            results.transcript = transcriptText.substring(0, 200) + '...';
    } else {
      results.tests.conversation = { found: false, status: convResponse.status };
    }
  } catch (error) {
    results.tests.conversation = { error: error instanceof Error ? error.message : 'Unknown error' };
  }
  
  // 2. Probar audio endpoint 1
  try {
    const audioResponse1 = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
      {
        headers: {
          'xi-api-key': apiKey,
          'Accept': 'audio/mpeg'
        }
      }
    );
    
    results.tests.audio_conversations = {
      status: audioResponse1.status,
      ok: audioResponse1.ok,
      contentType: audioResponse1.headers.get('content-type')
    };
  } catch (error) {
    results.tests.audio_conversations = { error: error instanceof Error ? error.message : 'Unknown error' };
  }
  
  // 3. Probar audio endpoint 2 (history)
  try {
    const audioResponse2 = await fetch(
      `https://api.elevenlabs.io/v1/history/${conversationId}/audio`,
      {
        headers: {
          'xi-api-key': apiKey,
          'Accept': 'audio/mpeg'
        }
      }
    );
    
    results.tests.audio_history = {
      status: audioResponse2.status,
      ok: audioResponse2.ok,
      contentType: audioResponse2.headers.get('content-type')
    };
  } catch (error) {
    results.tests.audio_history = { error: error instanceof Error ? error.message : 'Unknown error' };
  }
  
  // 4. Si hay history_item_id, probarlo
  if (results.tests.conversation?.historyItemId) {
    try {
      const historyId = results.tests.conversation.historyItemId;
      const audioResponse3 = await fetch(
        `https://api.elevenlabs.io/v1/history/${historyId}/audio`,
        {
          headers: {
            'xi-api-key': apiKey,
            'Accept': 'audio/mpeg'
          }
        }
      );
      
      results.tests.audio_history_item = {
        historyId,
        status: audioResponse3.status,
        ok: audioResponse3.ok
      };
    } catch (error) {
      results.tests.audio_history_item = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
