import { NextResponse } from 'next/server';
import translate from 'google-translate-api-x';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Máximo de conversaciones en la respuesta JSON (el total real sigue en total_calls). */
const MAX_CONVERSATIONS_IN_RESPONSE = 500;

function extractNameFallback(summary: string | null | undefined): string | null {
  if (!summary) return null;
  const s = String(summary);
  const patterns = [
    /Hola\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+){0,2})\b/,
    /contact(?:ed|o)\s+([A-Za-z\sÁÉÍÓÚÜÑáéíóúüñ]+?)\s+regarding/i,
    /cliente\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+){0,2})/i,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m?.[1]) return m[1].trim();
  }
  const words = s.match(/\b[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+\b/g);
  if (words?.length) return words[0];
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
  summary?: string | null;
  telefono_destino?: string | null;
  nombre_paciente?: string;
  producto?: string | null;
  evaluation_data?: Record<string, unknown>;
  transcript?: unknown;
  hasTranscript?: boolean;
  hasAudio?: boolean;
}

async function traducirTexto(texto: string): Promise<string> {
  try {
    const result = await translate(texto, { from: 'en', to: 'es' });
    if (result.text && result.text !== texto) return result.text;
  } catch {
    /* seguir */
  }
  try {
    const res = await fetch('https://translate.ismailzikri.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texto, source: 'en', target: 'es', format: 'text' }),
    });
    const data = await res.json();
    if (data.translatedText && data.translatedText !== texto) return data.translatedText;
  } catch {
    /* seguir */
  }
  return texto;
}

function emptyResponse(message: string) {
  return NextResponse.json({
    total_calls: 0,
    total_minutes: 0,
    conversations: [],
    configured: false,
    warning: message,
  });
}

export async function GET() {
  const API_KEY = (process.env.ELEVENLABS_API_KEY || '').trim();
  const AGENT_ID = (process.env.ELEVENLABS_AGENT_ID || '').trim();

  if (!API_KEY) {
    return emptyResponse(
      'ELEVENLABS_API_KEY no configurado. Configurá .env.local (o variables en Vercel) para listar llamadas reales.',
    );
  }
  if (!AGENT_ID) {
    return emptyResponse(
      'ELEVENLABS_AGENT_ID no configurado. Sin agente no se pueden listar conversaciones de ConvAI.',
    );
  }

  try {
    let allConversations: Conversation[] = [];
    let cursor: string | null = null;
    let pageToken: string | null = null;
    const PAGE_SIZE = 100;
    /** ElevenLabs ConvAI suele paginar con cursor/next_cursor/has_more; a veces con page_token. */
    const MAX_LIST_PAGES = 200;

    for (let page = 0; page < MAX_LIST_PAGES; page++) {
      const url = new URL('https://api.elevenlabs.io/v1/convai/conversations');
      url.searchParams.set('agent_id', AGENT_ID);
      url.searchParams.set('limit', String(PAGE_SIZE));
      url.searchParams.set('page_size', String(PAGE_SIZE));
      if (cursor) url.searchParams.set('cursor', cursor);
      else if (pageToken) url.searchParams.set('page_token', pageToken);

      const res = await fetch(url.toString(), {
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          { error: 'Error al obtener conversaciones', status: res.status, body: text },
          { status: res.status },
        );
      }
      const data = await res.json();
      const raw = data.conversations || [];
      const conversations: Conversation[] = raw.map((item: Record<string, unknown>) => ({
        ...(item as Conversation),
        conversation_id: String(
          (item as { conversationId?: string }).conversationId ||
            (item as { conversation_id?: string }).conversation_id ||
            (item as { id?: string }).id ||
            '',
        ),
      }));

      allConversations = allConversations.concat(conversations.filter((c) => c.conversation_id));

      const nextCursor = (data.next_cursor as string | undefined) ?? null;
      const nextPageTok = (data.next_page_token as string | undefined) ?? null;
      const hasMoreFlag = data.has_more === true;

      if (nextCursor) {
        cursor = nextCursor;
        pageToken = null;
        await new Promise((r) => setTimeout(r, 120));
        continue;
      }
      if (nextPageTok) {
        pageToken = nextPageTok;
        cursor = null;
        await new Promise((r) => setTimeout(r, 120));
        continue;
      }
      if (hasMoreFlag && raw.length >= PAGE_SIZE) {
        console.warn('[estadisticas-isabela] has_more sin cursor ni page_token; se detiene la lista.');
      }
      break;
    }

    const detailedConversations: Conversation[] = await Promise.all(
      allConversations.map(async (conv): Promise<Conversation> => {
        const id = conv.conversation_id;
        if (!id) return conv;
        try {
          const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${id}`, {
            headers: {
              'xi-api-key': API_KEY,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          });
          if (!res.ok) return conv;
          const data = await res.json();
          const dyn = data.conversation_initiation_client_data?.dynamic_variables || {};
          let nombre_paciente = dyn.nombre_paciente || dyn.nombre_contacto || null;
          if (nombre_paciente === 'Leonardo Viano') nombre_paciente = 'Leonardo';

          let resumen = data.analysis?.transcript_summary || null;
          if (resumen) {
            resumen = await traducirTexto(resumen);
            try {
              const backendUrl =
                process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';
              await fetch(`${backendUrl}/api/isabela/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  conversationId: id,
                  summary: resumen,
                }),
              });
            } catch {
              /* no bloquear */
            }
          }
          if (!nombre_paciente) {
            const fromSummary = extractNameFallback(resumen);
            if (fromSummary) nombre_paciente = fromSummary;
          }
          if (!nombre_paciente) nombre_paciente = 'Cliente NutryHome';

          const callSuccessfulRaw = data.analysis?.call_successful;
          const stLow = String(data.status || conv.status || '').toLowerCase();
          let call_successful: string | undefined =
            callSuccessfulRaw === 'success'
              ? 'true'
              : callSuccessfulRaw === 'failure'
                ? 'false'
                : conv.call_successful;
          if (call_successful == null || call_successful === '') {
            if (['failed'].includes(stLow)) call_successful = 'false';
            else if (['done', 'completed'].includes(stLow)) call_successful = 'true';
          }

          const phoneMeta = data.metadata?.phone_call;
          const dur =
            typeof data.metadata?.call_duration_secs === 'number'
              ? data.metadata.call_duration_secs
              : (data.call_duration_secs ?? conv.call_duration_secs ?? 0);
          const hasPhoneLayer = !!(phoneMeta && (phoneMeta.call_sid || phoneMeta.external_number));

          const out: Conversation = {
            ...conv,
            telefono_destino:
              phoneMeta?.external_number ||
              data.conversation_initiation_client_data?.dynamic_variables?.system__called_number ||
              conv.telefono_destino ||
              null,
            nombre_paciente,
            producto:
              dyn.producto ??
              conv.producto ??
              null,
            summary: resumen,
            call_successful: typeof call_successful === 'string' ? call_successful : conv.call_successful,
            evaluation_data: data.analysis?.evaluation_criteria_results || {},
            status: data.status || conv.status,
            message_count: data.message_count ?? conv.message_count,
            call_duration_secs: dur,
            agent_id: data.agent_id || conv.agent_id,
            agent_name: conv.agent_name,
            transcript: data.transcript,
            hasTranscript: !!data.transcript,
            /** Base: teléfono visto en metadata; el map final afloja si sólo falta ese campo */
            hasAudio: (hasPhoneLayer && dur > 2) || dur > 5,
          };
          return out;
        } catch {
          return conv;
        }
      }),
    );

    detailedConversations.sort(
      (a, b) => (b.start_time_unix_secs || 0) - (a.start_time_unix_secs || 0),
    );

    const totalAll = detailedConversations.length;

    const tableSlice = detailedConversations.slice(0, MAX_CONVERSATIONS_IN_RESPONSE);
    const total_minutes = Math.round(
      tableSlice.reduce((acc, c) => acc + (c.call_duration_secs || 0), 0) / 60,
    );

    const conversationsOut = tableSlice.map(({ transcript: tr, ...rest }) => {
      const secs = rest.call_duration_secs ?? 0;
      return {
        ...rest,
        hasTranscript: !!tr,
        hasAudio:
          !!rest.hasAudio || secs > 3,
      };
    });

    return NextResponse.json({
      total_calls: totalAll,
      returned_count: conversationsOut.length,
      total_minutes,
      conversations: conversationsOut,
      configured: true,
    });
  } catch (error) {
    console.error('Error en estadísticas:', error);
    return emptyResponse('Error al obtener datos de ElevenLabs (revisá API key, agent id y red).');
  }
}
