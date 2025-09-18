import { NextRequest, NextResponse } from 'next/server';

// IMPORTANTE: Definir el runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }  // Cambio importante aquí
) {
  try {
    // Asegurarse de que params existe
    const conversationId = context.params.id;
    
    console.log(`[Vercel] Fetching transcript for: ${conversationId}`);
    console.log(`[Vercel] Railway API: ${RAILWAY_API}`);

    // Validar que el ID existe
    if (!conversationId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Conversation ID is required',
          transcript: 'ID de conversación no proporcionado'
        },
        { status: 400 }
      );
    }

    // Llamar a Railway backend
    const railwayUrl = `${RAILWAY_API}/api/elevenlabs/conversation/${conversationId}`;
    console.log(`[Vercel] Calling Railway: ${railwayUrl}`);
    
    const response = await fetch(railwayUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      // No cachear para obtener siempre datos frescos
      cache: 'no-store'
    });

    console.log(`[Vercel] Railway response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Vercel] Railway error: ${errorText}`);
      
      return NextResponse.json(
        { 
          success: false,
          error: `Railway API error: ${response.status}`,
          transcript: 'Error obteniendo transcripción del servidor',
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Vercel] Data received:`, data);
    
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
    console.log(`[Vercel] First 200 chars: ${processedTranscript.substring(0, 200)}`);
    
    return NextResponse.json({
      success: true,
      conversationId: conversationId,
      transcript: processedTranscript,
      summary: data.summary || null,
      source: data.source || 'unknown',
      // Incluir también la transcripción original para debugging
      rawTranscript: data.transcript
    });

  } catch (error) {
    console.error('[Vercel] API Route Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        transcript: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Agregar método OPTIONS para CORS si es necesario
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}