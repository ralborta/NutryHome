import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return new Response('API key not configured', { status: 500 });
    }

    console.log(`🎵 Fetching audio for conversation: ${id}`);

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
      console.log(`❌ Audio not available for ${id}: ${response.status}`);
      return new Response('Audio no disponible', { status: 404 });
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': audioBuffer.byteLength.toString()
      }
    });

  } catch (error) {
    console.error(`Error fetching audio for ${id}:`, error);
    return new Response('Error interno', { status: 500 });
  }
}