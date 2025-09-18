import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const include_transcripts = searchParams.get('include_transcripts') || 'true';
    
    console.log('Fetching conversations from Railway backend...');
    
    // Llamar al backend de Railway (usar endpoint que funciona)
    const response = await fetch(
      `${RAILWAY_API}/api/isabela/conversations?limit=50`,
      {
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(`Railway API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch conversations' 
      },
      { status: 500 }
    );
  }
}
