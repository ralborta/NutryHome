import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    console.log(`Fetching audio ${id} from Railway...`);
    
    // Obtener audio del backend de Railway (usar endpoint que funciona)
    const response = await fetch(
      `${RAILWAY_API}/api/isabela/audio/${id}`,
      {
        headers: {
          'Accept': 'audio/mpeg'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Audio not found');
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error(`Error fetching audio:`, error);
    return NextResponse.json(
      { error: 'Audio not available' },
      { status: 404 }
    );
  }
}