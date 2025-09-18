import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`Vercel: Fetching transcript for ${id} from Railway`);

    // Llamar a Railway
    const response = await fetch(
      `${RAILWAY_API}/api/elevenlabs/conversation/${id}`,
      {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(`Railway returned ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      transcript: data.transcript || 'No hay transcripción disponible',
      summary: data.summary,
      source: data.source
    });

  } catch (error) {
    console.error('Vercel API error:', error);
    return NextResponse.json(
      { 
        success: false,
        transcript: 'Error obteniendo transcripción',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
