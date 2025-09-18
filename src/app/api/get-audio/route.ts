import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('id');
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'ID de conversación requerido' },
        { status: 400 }
      );
    }

    console.log(`[Vercel] Fetching audio for: ${conversationId}`);

    // Proxy a Railway
    const response = await fetch(
      `${RAILWAY_API}/api/elevenlabs/audio/${conversationId}`,
      {
        headers: {
          'Accept': 'audio/mpeg'
        }
      }
    );

    if (!response.ok) {
      console.error(`[Vercel] Audio not found: ${response.status}`);
      return NextResponse.json(
        { error: 'Audio no disponible' },
        { status: 404 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600'
      }
    });

  } catch (error) {
    console.error('[Vercel] Audio error:', error);
    return NextResponse.json(
      { error: 'Error al obtener audio' },
      { status: 500 }
    );
  }
}
