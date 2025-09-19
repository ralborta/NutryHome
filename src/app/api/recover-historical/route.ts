import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Proxying recovery request to Railway backend...');
    
    const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';
    
    // Proxificar la request al backend de Railway
    const response = await fetch(`${RAILWAY_API}/api/elevenlabs/recover-historical`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        limit: 50
      })
    });
    
    if (!response.ok) {
      throw new Error(`Railway backend error: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Recovery completed via Railway backend');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Recovery proxy error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
