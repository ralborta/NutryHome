// src/app/api/audio/[id]/route.ts
// Basado en tu código que funcionaba - solo audio bajo demanda

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return new Response('API key no configurada', { status: 500 });
    }

    if (!id || id.length < 10) {
      return new Response('ID de conversación inválido', { status: 400 });
    }

    console.log(`Obteniendo audio para conversación: ${id}`);

    // Llamada directa a ElevenLabs - igual que tenías funcionando
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
      console.log(`Audio no disponible para ${id}: ${response.status}`);
      if (response.status === 404) {
        return new Response('Audio no encontrado', { status: 404 });
      }
      return new Response(`Error ElevenLabs: ${response.status}`, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Validar que el audio no esté vacío
    if (audioBuffer.byteLength < 1000) {
      return new Response('Audio vacío o corrupto', { status: 404 });
    }

    console.log(`Audio obtenido para ${id}: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes'
      }
    });

  } catch (error) {
    console.error(`Error obteniendo audio para ${id}:`, error);
    return new Response('Error interno del servidor', { status: 500 });
  }
}