import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    // Obtener ID desde query params
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('id');
    
    if (!conversationId) {
      return NextResponse.json(
        { 
          success: false,
          transcript: 'ID de conversación requerido'
        },
        { status: 400 }
      );
    }

    console.log(`[Vercel] Fetching transcript for: ${conversationId}`);

    // Llamar a Railway
    const response = await fetch(
      `${RAILWAY_API}/api/elevenlabs/conversation/${conversationId}`,
      {
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      console.error(`[Vercel] Railway error: ${response.status}`);
      return NextResponse.json(
        { 
          success: false,
          transcript: 'Error obteniendo transcripción del servidor'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Vercel] Data received from Railway:`, data);
    
    // Procesar la transcripción para convertir array de objetos a texto simple
    let processedTranscript = 'No hay transcripción disponible';
    
    if (data.transcript) {
      if (Array.isArray(data.transcript)) {
        // Si es un array de mensajes, convertir a texto
        processedTranscript = data.transcript
          .filter((msg: any) => msg.message && msg.message.trim()) // Solo mensajes con contenido
          .map((msg: any) => {
            const role = msg.role === 'agent' ? 'Isabela' : 'Cliente';
            const message = msg.message || msg.content || '';
            return `${role}: ${message}`;
          })
          .join('\n\n');
      } else if (typeof data.transcript === 'string') {
        // Si ya es string, usar directamente
        processedTranscript = data.transcript;
      }
    }
    
    console.log(`[Vercel] Processed transcript length: ${processedTranscript.length}`);
    
    return NextResponse.json({
      success: true,
      conversationId: conversationId,
      transcript: processedTranscript,
      summary: data.summary || null,
      source: data.source || 'unknown'
    });

  } catch (error) {
    console.error('[Vercel] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        transcript: 'Error del servidor'
      },
      { status: 500 }
    );
  }
}
