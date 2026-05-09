'use client';

import React from 'react';
import { useEffect, useState, useRef, useMemo } from 'react';
import TranscripcionModal from '@/components/TranscripcionModal';
import {
  MoreVertical,
  Calendar,
  Clock3,
  Info,
  Download,
  Share2,
  FileText,
  MessageSquare,
  BadgeCheck,
  StickyNote,
  Phone,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  LineChart as LineChartIconLucide,
  Tag,
  TrendingUp,
  Users,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  Pause,
  Square,
} from 'lucide-react';

// ===== Tipos =====
interface Conversation {
  agent_id?: string;
  agent_name?: string;
  conversation_id?: string;
  start_time_unix_secs?: number; // epoch secs
  call_duration_secs?: number;
  message_count?: number;
  status?: string; // "done" | "failed" | etc
  call_successful?: "true" | "false"; // Solo estos valores específicos
  summary?: string;
  telefono_destino?: string;
  nombre_paciente?: string;
  producto?: string;
  rating?: number; // opcional
  resultado?: string; // ej: "Venta"
  data_collection?: Record<string, any>; // Datos recolectados de ElevenLabs
  evaluation_data?: Record<string, any>; // Datos de evaluación de ElevenLabs
  transcript?: string | any[]; // Transcripción completa de la conversación
  hasTranscript?: boolean;
  hasAudio?: boolean;
}

interface StatsData {
  total_calls: number;
  total_minutes: number;
  conversations: Conversation[];
}

/** Ejemplos cuando no hay ElevenLabs en .env.local: la tabla no queda vacía en desarrollo */
function demoNutriHomeConversations(nowUnixSecs: number): Conversation[] {
  const t0 = nowUnixSecs - 86400 * 4;
  return [
    {
      conversation_id: 'demo-nutri-1',
      nombre_paciente: 'RENDINO LAURA',
      telefono_destino: '+5492226554433',
      producto: 'KETOSTERIL',
      call_duration_secs: 192,
      start_time_unix_secs: t0 + 7200,
      status: 'done',
      call_successful: 'true',
      message_count: 14,
      agent_name: 'Isabela',
      summary: 'Verificación de stock en domicilio — sin incidencias.',
    },
    {
      conversation_id: 'demo-nutri-2',
      nombre_paciente: 'ZALAZAR ROMA',
      telefono_destino: '+5492244118899',
      producto: 'VITAL INFANTIL',
      call_duration_secs: 238,
      start_time_unix_secs: t0 + 10800,
      status: 'done',
      call_successful: 'true',
      message_count: 18,
      agent_name: 'Isabela',
      summary: 'Consulta cantidad solicitada para entrega próxima semana.',
    },
    {
      conversation_id: 'demo-nutri-3',
      nombre_paciente: 'GÓMEZ MARTÍN',
      telefono_destino: '+5492233110044',
      producto: 'NEPHAID',
      call_duration_secs: 95,
      start_time_unix_secs: t0 + 14400,
      status: 'done',
      call_successful: 'false',
      message_count: 6,
      agent_name: 'Isabela',
      summary: 'No contestó al segundo intento; dejar pendiente.',
    },
    {
      conversation_id: 'demo-nutri-4',
      nombre_paciente: 'PÉREZ ANA',
      telefono_destino: '+5492211007788',
      producto: 'RESOURCE DIABET',
      call_duration_secs: 421,
      start_time_unix_secs: t0 + 18000,
      status: 'done',
      call_successful: 'true',
      message_count: 22,
      agent_name: 'Isabela',
      summary: 'Paciente solicita reposición antes del fin de mes.',
    },
    {
      conversation_id: 'demo-nutri-5',
      nombre_paciente: 'SILVA MARCELO',
      telefono_destino: '+5492288776655',
      producto: 'GLUCERNA SR',
      call_duration_secs: 156,
      start_time_unix_secs: t0 + 21600,
      status: 'done',
      call_successful: 'true',
      message_count: 11,
      agent_name: 'Isabela',
      summary: 'Actualización de domicilio y confirmación de unidades.',
    },
  ];
}

type ActionId =
  | 'audio'
  | 'resumen'
  | 'transcripcion'
  | 'evaluacion'
  | 'notas'
  | 'detalles'
  | 'descargar'
  | 'compartir'
  | 'eliminar';

/** Historial Isabela / ElevenLabs: pantalla principal de gestión operativa */
export default function ConversacionesNutriHomeView() {
  return <ConversacionesUI />;
}

function ConversacionesUI() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showTranscripcion, setShowTranscripcion] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);

  // Abrir vista del reporte (sin tocar lógica de Isabela)
  const handleGenerateProductReport = () => {
    window.location.href = '/reportes/productos';
  };

  // ✅ CORREGIDO: no-store, cache-bust, abort de requests previos, y adaptación de datos
  const fetchStats = async () => {
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setPreviewBanner(null);

      // Usar el mismo endpoint que funciona en Conversaciones
      const res = await fetch('/api/estadisticas-isabela?t=' + Date.now(), {
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      // ✅ El backend ya devuelve datos enriquecidos y normalizados, usar directamente
      console.log('🔍 Datos recibidos de la API:', json.conversations?.[0]); // Debug
      console.log('🔍 Estructura completa de la API:', json); // Debug

      const configured = json.configured !== false;
      let conversationList = [...(json.conversations ?? [])];
      const apiWarning =
        typeof json.warning === 'string'
          ? json.warning
          : 'Sin claves de ElevenLabs: tabla de muestra hasta que configures ELEVENLABS_API_KEY y ELEVENLABS_AGENT_ID.';

      if (!configured && conversationList.length === 0) {
        conversationList = demoNutriHomeConversations(Math.floor(Date.now() / 1000));
        setPreviewBanner(
          `${apiWarning} Mostrando ${conversationList.length} llamadas de ejemplo (solo vista previa local).`,
        );
      }

      const mapConv = (c: any): Conversation => ({
        conversation_id: c.conversation_id,
        summary: c.summary ?? '',
        start_time_unix_secs:
          c.start_time_unix_secs ?? (c.createdAt ? Math.floor(new Date(c.createdAt).getTime() / 1000) : undefined),
        nombre_paciente: c.nombre_paciente || 'Sin nombre',
        telefono_destino: c.telefono_destino || 'Sin teléfono',
        call_duration_secs: c.call_duration_secs ?? 0,
        status: c.status ?? 'completed',
        producto: c.producto ?? 'NutryHome',
        agent_name: c.agent_name ?? 'Isabela',
        agent_id: c.agent_id,
        message_count: c.message_count ?? 0,
        call_successful: c.call_successful ?? 'true',
        resultado: c.resultado ?? 'Completada',
        rating: c.rating ?? null,
        transcript: c.transcript,
        hasTranscript: c.hasTranscript,
        hasAudio: c.hasAudio,
      });

      const mapped = conversationList.map((c: any) => {
        if (configured || !String(c?.conversation_id || '').startsWith('demo-nutri')) {
          console.log('🔍 Conversación individual:', {
            conversation_id: c.conversation_id,
            nombre_paciente: c.nombre_paciente,
            telefono_destino: c.telefono_destino,
            variables: c.variables,
            all_keys: Object.keys(c),
          }); // Debug
        }
        return mapConv(c);
      });

      const adaptedData = {
        total_calls:
          !configured && mapped.length > 0
            ? mapped.length
            : (json.total_calls ?? json.total ?? mapped.length ?? 0),
        total_minutes: Math.floor(mapped.reduce((acc: number, c: Conversation) => acc + (c.call_duration_secs || 0), 0) / 60),
        conversations: mapped,
      };

      setData(adaptedData);
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // se canceló a propósito
      setError(e?.message ?? 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!data?.conversations) return [];
    const q = searchTerm.trim().toLowerCase();
    return data.conversations.filter((c) => {
      const nombre = (c.nombre_paciente || '').toLowerCase();
      const tel = c.telefono_destino || '';
      const matchesQ = !q || nombre.includes(q) || tel.includes(q);
      const ok = c.call_successful === 'true';
      const bad = c.call_successful === 'false';
      const matchesS =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && ok) ||
        (statusFilter === 'failed' && bad);
      return matchesQ && matchesS;
    });
  }, [data?.conversations, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const sumDurationSecs = useMemo(
    () => filteredRows.reduce((acc, c) => acc + (c.call_duration_secs || 0), 0),
    [filteredRows]
  );

  const uniquePhones = useMemo(() => {
    const s = new Set<string>();
    for (const c of filteredRows) {
      const t = (c.telefono_destino || '').trim();
      if (t && t !== 'Sin teléfono') s.add(t);
    }
    return s.size;
  }, [filteredRows]);

  const avgSecs =
    filteredRows.length > 0 ? Math.round(sumDurationSecs / filteredRows.length) : null;

  // carga inicial
  useEffect(() => {
    fetchStats();
  }, []);

  // Click outside para cerrar menú
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.context-menu')) {
        setOpenMenuId(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // ===== Función de recuperación de datos históricos =====
  const recoverHistoricalData = async () => {
    try {
      setIsRecovering(true);
      console.log('🔄 Starting historical data recovery...');
      
      const response = await fetch('/api/recover-historical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Recovery failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Recovery completed:', result);
      
      // Debug: ver estructura de una conversación individual
      if (result.results?.conversations?.[0]) {
        console.log('🔍 Estructura de conversación individual:', result.results.conversations[0]);
        console.log('🔍 Variables de la conversación:', result.results.conversations[0].variables);
        console.log('🔍 Todos los campos disponibles:', Object.keys(result.results.conversations[0]));
      }
      
      // Mostrar resultados
      alert(`🔄 RECUPERACIÓN COMPLETADA:
      
✅ Procesadas: ${result.results.processed}
📝 Con transcripción: ${result.results.withTranscript}
🔊 Con audio: ${result.results.withAudio}
❌ Errores: ${result.results.errors}

Los datos se han recuperado correctamente.`);
      
      // Mostrar los datos recuperados directamente
      if (result.results.conversations && result.results.conversations.length > 0) {
        setPreviewBanner(null);
        const adaptedData = {
          total_calls: result.results.conversations.length,
          total_minutes: Math.floor(result.results.conversations.reduce((acc: number, c: any) => acc + (c.call_duration_secs || 0), 0) / 60),
          conversations: result.results.conversations.map((c: any) => ({
            conversation_id: c.conversation_id,
            summary: c.summary ?? '',
            start_time_unix_secs: c.start_time_unix_secs ?? (c.createdAt ? Math.floor(new Date(c.createdAt).getTime()/1000) : undefined),
            nombre_paciente: c.nombre_paciente || "Sin nombre",
            telefono_destino: c.telefono_destino || 'Sin teléfono',
            call_duration_secs: c.call_duration_secs ?? 0,
            status: c.status ?? 'completed',
            producto: c.producto ?? 'NutryHome',
            agent_name: c.agent_name ?? 'Isabela',
            agent_id: c.agent_id,
            message_count: c.message_count ?? 0,
            call_successful: c.call_successful ?? 'true',
            resultado: c.resultado ?? 'Completada',
            rating: c.rating ?? null,
            transcript: c.transcript,
            hasTranscript: c.hasTranscript,
            hasAudio: c.hasAudio,
          }))
        };
        setData(adaptedData);
      } else {
        // Si no hay datos recuperados, intentar cargar desde el endpoint
        await fetchStats();
      }
      
    } catch (error) {
      console.error('❌ Recovery error:', error);
      alert(`❌ Error en la recuperación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsRecovering(false);
    }
  };

  // ===== Funciones de control de audio =====
  const handlePlayAudio = (conversationId: string) => {
    if (!conversationId) {
      alert("ID de conversación no disponible");
      return;
    }

    // Si ya hay un audio reproduciéndose, reanudar
    if (audioRef.current && isPaused && isPlaying === conversationId) {
      audioRef.current.play().then(() => {
        setIsPlaying(conversationId);
        setIsPaused(false);
      }).catch(err => {
        console.error('Error reanudando audio:', err);
        alert('No se pudo reanudar el audio');
      });
      return;
    }

    // Crear nuevo audio
    const audioUrl = `/api/get-audio?id=${conversationId}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onerror = () => {
      console.error('Error de reproducción de audio');
      alert('No se pudo reproducir el audio. Puede que no esté disponible para esta conversación.');
      setIsPlaying(null);
      setIsPaused(false);
    };

    audio.onended = () => {
      setIsPlaying(null);
      setIsPaused(false);
    };

    audio.play().then(() => {
      setIsPlaying(conversationId);
      setIsPaused(false);
      console.log('Audio reproduciéndose correctamente');
    }).catch((error) => {
      console.error('Error reproduciendo audio:', error);
      alert(`🎵 AUDIO DE GRABACIÓN\n\n⚠️ No se pudo reproducir el audio\n\nPuede que no esté disponible para esta conversación.`);
      setIsPlaying(null);
      setIsPaused(false);
    });
  };

  const handlePauseAudio = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(null);
      setIsPaused(false);
    }
  };

  // ===== Lógica de acciones =====
  const handleAction = (action: ActionId, c: Conversation) => {
  switch (action) {
    case "audio": {
      if (!c.conversation_id) { 
        alert("ID de conversación no disponible"); 
        break; 
      }
      
      // Si ya está reproduciéndose, pausar
      if (isPlaying === c.conversation_id) {
        handlePauseAudio();
      } else {
        // Si está pausado, reanudar
        if (isPaused && isPlaying === c.conversation_id) {
          handlePlayAudio(c.conversation_id);
        } else {
          // Reproducir nuevo audio
          handlePlayAudio(c.conversation_id);
        }
      }
      break;
    }
    case "resumen": {
      if (!c.conversation_id) { 
        alert("conversation_id no disponible"); 
        break; 
      }
      
      if (c.summary) { 
        alert(`📋 RESUMEN:\n\n${c.summary}`); 
        break; 
      }

      // Fallback: obtener resumen del backend
      fetch(`https://nutryhome-production.up.railway.app/api/elevenlabs/conversations/${c.conversation_id}`)
        .then(r => r.json())
        .then(j => {
          const resumen = j.summary ?? j.analysis?.summary ?? "Sin resumen disponible";
          alert(`📋 RESUMEN:\n\n${resumen}`);
        })
        .catch(e => {
          alert("❌ Error al obtener el resumen: " + e.message);
        });
      break;
    }
    case "transcripcion":
        console.log('🔍 Opening transcript for:', c.conversation_id);
        console.log('🔍 Transcript data:', c.transcript);
        setSelectedConversation(c);
        setShowTranscripcion(true);
      break;
    case "evaluacion":
      if (!c.evaluation_data) {
        alert("📊 No hay datos de evaluación disponibles para esta conversación");
        break;
      }

      // Procesar datos de evaluación de NutriHome - SOLO evaluación
      const evalData = c.evaluation_data;
      let evaluacion = "📊 EVALUACIÓN DE LA LLAMADA:\n\n";

      // SOLO mostrar evaluation_criteria_results
      if (evalData && Object.keys(evalData).length > 0) {
        Object.entries(evalData).forEach(([key, criteriaObj]) => {
          if (criteriaObj && typeof criteriaObj === 'object') {
            const criteria = criteriaObj as any;
            evaluacion += `🔸 ${key.toUpperCase()}:\n`;
            
            if (criteria.result) {
              evaluacion += `✅ Resultado: ${criteria.result}\n`;
            }
            
            if (criteria.rationale) {
              evaluacion += `📋 Descripción: ${criteria.rationale}\n\n`;
            }
            
            if (criteria.value) {
              evaluacion += `🔹 Valor: ${criteria.value}\n\n`;
            }
          }
        });
      } else {
        evaluacion += "No hay datos de evaluación disponibles.";
      }

      alert(evaluacion);
      break;
    case "notas":
      if (!c.data_collection) {
        alert("📝 No hay datos de recolección disponibles para esta conversación");
        break;
      }

      // Procesar data collection - SOLO data collection
      const data = c.data_collection;
      let notasHTML = "📝 DATOS RECOLECTADOS:\n\n";
      
      // SOLO mostrar los datos recolectados tal como vienen de NutriHome
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "N/A" && value !== "") {
          notasHTML += `• ${key}: ${value}\n`;
        }
      });

      alert(notasHTML);
      break;
    case "detalles":
      const detalles = `
📞 DETALLES COMPLETOS DE LA LLAMADA:

👤 INFORMACIÓN DEL CLIENTE:
🔹 Nombre: ${c.nombre_paciente ?? "Cliente NutryHome"}
🔹 Teléfono: ${c.telefono_destino ?? "No disponible"}
🔹 Producto: ${c.producto ?? "NutryHome"}

📊 ESTADO DE LA LLAMADA:
🔹 ID: ${c.conversation_id ?? "N/A"}
🔹 Estado: ${c.status ?? "N/A"}
🔹 Éxito: ${c.call_successful === "true" ? "✅ Sí" : c.call_successful === "false" ? "❌ No" : "❓ No definido"}
🔹 Resultado: ${c.resultado ?? "No especificado"}

⏱️ MÉTRICAS:
🔹 Fecha: ${formatDate(c.start_time_unix_secs)}
🔹 Duración: ${formatDuration(c.call_duration_secs)}
🔹 Mensajes: ${c.message_count ?? "0"} mensajes
🔹 Rating: ${c.rating ? `${c.rating.toFixed(1)}/5 ⭐` : "No evaluado"}

🤖 AGENTE:
🔹 Nombre: ${c.agent_name ?? "Isabela"}
🔹 ID: ${c.agent_id ?? "N/A"}

📋 RESUMEN:
${c.summary ? c.summary.substring(0, 200) + (c.summary.length > 200 ? "..." : "") : "No disponible"}
      `.trim();
      alert(detalles);
      break;
    case "descargar":
      if (!c.conversation_id) { 
        alert("ID de conversación no disponible"); 
        break; 
      }
      try {
        const url = `/api/get-audio?id=${encodeURIComponent(c.conversation_id)}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = `audio_${c.conversation_id}.mp3`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e: any) {
        console.error('Error iniciando descarga de audio:', e);
        alert('No se pudo iniciar la descarga del audio.');
      }
      break;
    case 'compartir':
      alert('🔗 Compartir en desarrollo');
      break;
    case 'eliminar':
      alert(
        'Eliminar conversación no está disponible desde el cliente: los registros vienen de ElevenLabs.'
      );
      break;
    default:
      break;
  }
  };



  if (loading) return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <div className="animate-spin h-10 w-10 rounded-full border-2 border-slate-300 border-t-indigo-600" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <div className="text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-slate-700">{error ?? "Sin datos"}</p>
      </div>
    </div>
  );

  const kpisTotalCalls = filteredRows.length;
  const kpisTotalMins = Math.floor(sumDurationSecs / 60);
  const kpisAvgLabel = avgSecs != null ? formatDuration(avgSecs) : '—';

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestión de Llamadas</h1>
            <p className="mt-1 text-sm text-slate-500">
              NutriHome / Isabela: historial operativo de conversaciones salientes y seguimiento
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateProductReport}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 text-sky-600" />
              Reporte de Productos
            </button>
            <button
              type="button"
              onClick={recoverHistoricalData}
              disabled={isRecovering || loading}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              {isRecovering ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Recuperando…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Recuperar Histórico
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => fetchStats()}
              disabled={loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {previewBanner ? (
          <div className="mt-4 rounded-[12px] border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-sky-950 shadow-sm">
            <span className="font-semibold">Vista previa local.</span>{' '}
            {previewBanner}
          </div>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ConvKpiCard
            Icon={Phone}
            iconBg="bg-sky-100"
            iconClass="text-sky-600"
            label="Total de Llamadas"
            value={String(kpisTotalCalls)}
          />
          <ConvKpiCard
            Icon={Clock3}
            iconBg="bg-emerald-100"
            iconClass="text-emerald-600"
            label="Tiempo Total"
            value={`${kpisTotalMins} min`}
          />
          <ConvKpiCard
            Icon={TrendingUp}
            iconBg="bg-violet-100"
            iconClass="text-violet-600"
            label="Promedio por llamada"
            value={kpisAvgLabel}
          />
          <ConvKpiCard
            Icon={Users}
            iconBg="bg-orange-100"
            iconClass="text-orange-600"
            label="Contactos Únicos"
            value={String(uniquePhones)}
          />
        </div>

        <div className="mt-6 rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o teléfono..."
                className="h-10 w-full rounded-[10px] border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none ring-sky-500/30 focus:border-sky-300 focus:ring-2"
              />
            </div>
            <details className="relative shrink-0">
              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                <Filter className="h-4 w-4 text-slate-400" />
                {statusFilter === 'all'
                  ? 'Todos los estados'
                  : statusFilter === 'completed'
                    ? 'Completadas'
                    : 'Fallidas'}
              </summary>
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[11rem] rounded-[10px] border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setStatusFilter('all');
                  }}
                >
                  Todos los estados
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => setStatusFilter('completed')}
                >
                  Completadas
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => setStatusFilter('failed')}
                >
                  Fallidas
                </button>
              </div>
            </details>
            <button
              type="button"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Calendar className="h-4 w-4 text-slate-400" />
              Todas las fechas
            </button>
            <button
              type="button"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              Más filtros
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Detalles</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Duración</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.conversations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-slate-500">
                      No hay llamadas para mostrar. Revisá ElevenLabs o usá <strong>Recuperar Histórico</strong>.
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-slate-500">
                      Ningún resultado con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((c, i) => (
                    <ConversationTableRow
                      key={c.conversation_id ?? i}
                      c={c}
                      onAction={(a) => handleAction(a, c)}
                      isMenuOpen={openMenuId === c.conversation_id}
                      onToggleMenu={() =>
                        setOpenMenuId(openMenuId === c.conversation_id ? null : c.conversation_id || null)
                      }
                      isAudioPlaying={isPlaying === c.conversation_id && !isPaused}
                      hasAudioSession={isPlaying === c.conversation_id}
                      onPlayPause={() => {
                        if (!c.conversation_id) return;
                        if (isPlaying === c.conversation_id) {
                          if (isPaused) handlePlayAudio(c.conversation_id);
                          else handlePauseAudio();
                        } else {
                          handlePlayAudio(c.conversation_id);
                        }
                      }}
                      onStopAudio={() => {
                        if (isPlaying === c.conversation_id) handleStopAudio();
                      }}
                      onVerResumen={() => handleAction('resumen', c)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredRows.length > 0 ? (
          <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-1">
              <PaginationIconBtn
                label="Primera"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft className="h-4 w-4" />
              </PaginationIconBtn>
              <PaginationIconBtn
                label="Anterior"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </PaginationIconBtn>
              <PaginationIconBtn
                label="Siguiente"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </PaginationIconBtn>
              <PaginationIconBtn
                label="Última"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight className="h-4 w-4" />
              </PaginationIconBtn>
            </div>
            <PaginationPages
              current={page}
              total={totalPages}
              onSelect={setPage}
            />
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} por página
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-slate-400">
          Última actualización: {new Date().toLocaleString('es-AR')}
        </p>
      </div>

      <TranscripcionModal
        isOpen={showTranscripcion}
        onClose={() => {
          setShowTranscripcion(false);
          setSelectedConversation(null);
        }}
        conversation={selectedConversation}
      />
    </div>
  );
}

function ConvKpiCard({
  Icon,
  iconBg,
  iconClass,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">— vs período anterior</p>
        </div>
      </div>
    </div>
  );
}

function formatDateParts(epochSecs?: number): { date: string; time: string } {
  if (!epochSecs) return { date: '—', time: '' };
  const d = new Date(epochSecs * 1000);
  return {
    date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function contactInitials(name: string): string {
  const t = name.trim();
  if (!t || t === 'Cliente NutryHome' || t.toLowerCase() === 'sin nombre') return 'NO';
  const upper = t.toUpperCase();
  if (upper.includes(',')) {
    const [a, b] = upper.split(',').map((x) => x.trim());
    const B = (b ?? '').replace(/\s+/g, '');
    const A = (a ?? '').replace(/\s+/g, '');
    if (B[0] && A[0]) return `${B[0]}${A[0]}`.slice(0, 4);
  }
  const parts = upper.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[parts.length - 1]![0]!}${parts[0]![0]!}`;
  return upper.slice(0, 2);
}

function ConversationTableRow({
  c,
  onAction,
  isMenuOpen,
  onToggleMenu,
  isAudioPlaying,
  hasAudioSession,
  onPlayPause,
  onStopAudio,
  onVerResumen,
}: {
  c: Conversation;
  onAction: (a: ActionId) => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  isAudioPlaying: boolean;
  hasAudioSession: boolean;
  onPlayPause: () => void;
  onStopAudio: () => void;
  onVerResumen: () => void;
}) {
  const isSuccessful = c.call_successful === 'true';
  const isFailed = c.call_successful === 'false';
  const displayNameRaw =
    c.nombre_paciente && c.nombre_paciente !== 'Cliente NutryHome' ? c.nombre_paciente : 'Sin nombre';
  const nm = contactInitials(displayNameRaw === 'Sin nombre' ? '' : displayNameRaw);
  const fecha = formatDateParts(c.start_time_unix_secs);

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-100 text-[11px] font-bold uppercase text-sky-800">
            {nm}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold uppercase tracking-tight text-slate-900">
              {displayNameRaw.toUpperCase()}
            </div>
            <div className="truncate text-[13px] text-slate-500">
              {c.telefono_destino && c.telefono_destino !== 'Sin teléfono' ? c.telefono_destino : '—'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <span className="inline-flex gap-2 text-sky-600">
          <button
            type="button"
            className="rounded-lg bg-sky-50 p-1.5 hover:bg-sky-100"
            title="Insight"
            aria-label="Tendencia"
          >
            <LineChartIconLucide className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="rounded-lg bg-sky-50 p-1.5 hover:bg-sky-100"
            title={c.producto || 'NutriHome'}
            aria-label="Producto"
          >
            <Tag className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </span>
      </td>
      <td className="px-4 py-3 align-middle">
        {isSuccessful ? (
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Completada
          </span>
        ) : isFailed ? (
          <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
            Fallida
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {c.status || '—'}
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular-nums text-sm font-medium text-slate-800">
            {formatDuration(c.call_duration_secs || 0)}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPlayPause}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition ${
                isAudioPlaying ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
              title={isAudioPlaying ? 'Pausar grabación' : 'Reproducir grabación'}
              aria-label={isAudioPlaying ? 'Pausar grabación' : 'Reproducir grabación'}
            >
              {isAudioPlaying ? (
                <Pause className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <Play className="h-4 w-4 fill-current pl-0.5" strokeWidth={0} />
              )}
            </button>
            {hasAudioSession ? (
              <button
                type="button"
                onClick={onStopAudio}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-400 text-white shadow-sm transition hover:bg-slate-500"
                title="Detener grabación"
                aria-label="Detener grabación"
              >
                <Square className="h-3 w-3 fill-current" strokeWidth={0} />
              </button>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="text-[13px] font-medium tabular-nums text-slate-900">{fecha.date}</div>
        <div className="text-xs text-slate-500">{fecha.time}</div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onVerResumen}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FileText className="h-3.5 w-3.5 text-sky-600" />
            Ver resumen
          </button>
          <MoreMenu onAction={onAction} isOpen={isMenuOpen} onToggle={onToggleMenu} />
        </div>
      </td>
    </tr>
  );
}

function PaginationIconBtn({
  disabled,
  onClick,
  children,
  label,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PaginationPages({
  current,
  total,
  onSelect,
}: {
  current: number;
  total: number;
  onSelect: (n: number) => void;
}) {
  const items = useMemo<(number | '…')[]>(() => {
    if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
    const s = new Set<number>([1, 2, 3, total, current, current - 1, current + 1]);
    const nums = Array.from(s)
      .filter((n) => n >= 1 && n <= total)
      .sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    let prev = 0;
    for (const n of nums) {
      if (prev && n - prev > 1) out.push('…');
      out.push(n);
      prev = n;
    }
    return out;
  }, [current, total]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {items.map((p, i) =>
        p === '…' ? (
          <span key={`e-${i}`} className="px-2 text-sm text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(p)}
            className={`min-h-8 min-w-8 rounded-lg px-3 py-1 text-sm font-semibold tabular-nums ${
              p === current
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p}
          </button>
        ),
      )}
    </div>
  );
}

// ===== Menú =====
function MoreMenu({ 
  onAction, 
  isOpen, 
  onToggle 
}: { 
  onAction: (a: ActionId) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative context-menu">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Más opciones"
        className="ml-1 grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-8 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5">
          <MenuItem icon={<FileText className="h-4 w-4"/>} label="Resumen" onClick={() => onAction('resumen')} />
          <MenuItem icon={<MessageSquare className="h-4 w-4"/>} label="Transcripción" onClick={() => onAction('transcripcion')} />
          <MenuItem icon={<BadgeCheck className="h-4 w-4"/>} label="Evaluación" onClick={() => onAction('evaluacion')} />
          <MenuItem icon={<StickyNote className="h-4 w-4"/>} label="Notas" onClick={() => onAction('notas')} />
          <div className="my-1 h-px bg-slate-200" />
          <MenuItem icon={<Info className="h-4 w-4"/>} label="Ver detalles" onClick={() => onAction('detalles')} />
          <MenuItem icon={<Download className="h-4 w-4"/>} label="Descargar audio" onClick={() => onAction('descargar')} />
          <MenuItem icon={<Share2 className="h-4 w-4"/>} label="Compartir" onClick={() => onAction('compartir')} />
          <div className="my-1 h-px bg-slate-200" />
          <MenuDangerItem icon={<Trash2 className="h-4 w-4" />} label="Eliminar" onClick={() => onAction('eliminar')} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
    >
      <span className="text-slate-500 group-hover:text-indigo-700">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MenuDangerItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}


// ===== Formateadores =====
function formatDate(epochSecs?: number) {
  if (!epochSecs) return "—";
  const d = new Date(epochSecs * 1000);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    ", " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(secs?: number) {
  if (!secs && secs !== 0) return "N/A";
  const m = Math.floor(secs / 60);
  const s = Math.abs(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}





