import { NextResponse } from 'next/server';
import translate from 'google-translate-api-x';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function extractNameFallback(summary: string | null | undefined): string | null {
  if (!summary) return null;
  const s = String(summary);
  const patterns = [
    /Hola\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+){0,2})\b/, // Hola Nombre Apellido
    /contact(?:ed|o)\s+([A-Za-z\sÁÉÍÓÚÜÑáéíóúüñ]+?)\s+regarding/i,
    /cliente\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+){0,2})/i,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m && m[1]) return m[1].trim();
  }
  const words = s.match(/\b[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+\b/g);
  if (words && words.length) return words[0];
  return null;
}

interface Conversation {
  agent_id?: string;
  agent_name?: string;
  conversation_id?: string;
  start_time_unix_secs?: number;
  call_duration_secs?: number;
  message_count?: number;
  status?: string;
  call_successful?: string;
  summary?: string;
  telefono_destino?: string;
  nombre_paciente?: string;
  producto?: string;
}

// Función de traducción con Google Translate gratuito como primera opción
async function traducirTexto(texto: string): Promise<string> {
  // 1. Google Translate (gratuito)
  try {
    const result = await translate(texto, { from: 'en', to: 'es' });
    if (result.text && result.text !== texto) {
      return result.text;
    }
  } catch {
    console.log('Google Translate falló, probando siguiente opción...');
  }

  // 2. Free Translate API (Ismal Zikri)
  try {
    const res = await fetch('https://translate.ismailzikri.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texto,
        source: 'en',
        target: 'es',
        format: 'text'
      })
    });
    const data = await res.json();
    if (data.translatedText && data.translatedText !== texto) {
      return data.translatedText;
    }
  } catch {
    console.log('Free Translate API falló, probando siguiente opción...');
  }

  // 3. LibreTranslate
  try {
    const res = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texto,
        source: 'en',
        target: 'es',
        format: 'text'
      })
    });
    const data = await res.json();
    if (data.translatedText && data.translatedText !== texto) {
      return data.translatedText;
    }
  } catch {
    console.log('LibreTranslate falló, probando siguiente opción...');
  }

  // 4. Apertium (último recurso)
  try {
    const res = await fetch('https://apertium.org/apy/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        q: texto,
        langpair: 'en|es'
      })
    });
    const data = await res.json();
    if (data.responseData?.translatedText && data.responseData.translatedText !== texto) {
      return data.responseData.translatedText;
    }
  } catch {
    console.log('Todas las APIs de traducción fallaron, devolviendo texto original');
  }

  return texto;
}

export async function GET() {
  const API_KEY = process.env.ELEVENLABS_API_KEY || 'YOUR_API_KEY';
  const AGENT_ID = 'agent_01jyqdepnrf1x9wfrt9kkyy84t';

  try {
    let allConversations: Conversation[] = [];
    let hasMore = true;
    let nextPageToken: string | null = null;
    const PAGE_SIZE = 100;

    while (hasMore) {
      let url = `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${AGENT_ID}&page_size=${PAGE_SIZE}`;
      if (nextPageToken) {
        url += `&page_token=${nextPageToken}`;
      }
      const res = await fetch(url, {
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: 'Error al obtener conversaciones', status: res.status, body: text }, { status: res.status });
      }
      const data = await res.json();
      const conversations = data.conversations || [];
      allConversations = allConversations.concat(conversations);
      if (data.next_page_token) {
        nextPageToken = data.next_page_token;
        hasMore = true;
      } else {
        hasMore = false;
      }
    }

    // Por cada conversación, obtener el detalle y extraer los datos requeridos
                        const detailedConversations: Conversation[] = await Promise.all(
                      allConversations.map(async (conv) => {
                        try {
                          const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`, {
                            headers: {
                              'xi-api-key': API_KEY,
                              'Content-Type': 'application/json',
                            },
                            cache: 'no-store'
                          });
                          if (!res.ok) return conv;
                          const data = await res.json();
                          const dyn = data.conversation_initiation_client_data?.dynamic_variables || {};
                          let nombre_paciente = dyn.nombre_paciente || dyn.nombre_contacto || null;
                          if (nombre_paciente === 'Leonardo Viano') {
                            nombre_paciente = 'Leonardo';
                          }
                          let resumen = data.analysis?.transcript_summary || null;
                          if (resumen) {
                            resumen = await traducirTexto(resumen);
                            try {
                              const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';
                              await fetch(`${backendUrl}/api/isabela/conversations`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  conversationId: conv.conversation_id,
                                  summary: resumen
                                })
                              });
                              console.log('✅ Resumen guardado en DB:', conv.conversation_id);
                            } catch (dbError) {
                              console.warn('⚠️ Error guardando en DB:', dbError);
                            }
                          }
                          if (!nombre_paciente) {
                            const fromSummary = extractNameFallback(resumen);
                            if (fromSummary) nombre_paciente = fromSummary;
                          }
                          if (!nombre_paciente) nombre_paciente = 'Cliente NutryHome';
                          return {
                            ...conv,
                            telefono_destino: data.metadata?.phone_call?.external_number || data.conversation_initiation_client_data?.dynamic_variables?.system__called_number || null,
                            nombre_paciente,
                            producto: data.conversation_initiation_client_data?.dynamic_variables?.producto || null,
                            summary: resumen,
                          };
                        } catch {
                          return conv;
                        }
                      })
                    );

    // Ordenar por fecha de más reciente a más antigua
    detailedConversations.sort((a, b) => (b.start_time_unix_secs || 0) - (a.start_time_unix_secs || 0));
    // Tomar las primeras 35
    const last35Conversations = detailedConversations.slice(0, 35);
    const total_calls = last35Conversations.length;
    const total_minutes = Math.round(last35Conversations.reduce((acc: number, c: Conversation) => acc + (c.call_duration_secs || 0), 0) / 60);

    return NextResponse.json({
      total_calls,
      total_minutes,
      conversations: last35Conversations
    });
  } catch (error) {
    console.error('Error en estadísticas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
