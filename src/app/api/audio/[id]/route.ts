import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${id}/audio`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Accept': 'audio/mpeg'
        }
      }
    );
    
    if (!response.ok) {
      return new Response('Audio no disponible', { status: 404 });
    }
    
    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
}
