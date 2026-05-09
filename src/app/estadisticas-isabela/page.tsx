'use client';

import React from "react";
import { useEffect, useState, useRef } from "react";
import ConversacionesList from "@/components/ConversacionesList";
import TranscripcionModal from "@/components/TranscripcionModal";
// DropdownMenu removido - usando menú personalizado
import {
  MoreVertical,
  Play,
  Pause,
  Square,
  Star,
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
  BarChart3,
} from "lucide-react";

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
}

interface StatsData {
  total_calls: number;
  total_minutes: number;
  conversations: Conversation[];
}

// Función para extraer nombre del cliente del summary
const extractNameFromSummary = (summary: string): string | null => {
  if (!summary) return null;
  
  // Buscar patrones comunes en el summary
  const patterns = [
    /contacted\s+([A-Za-z\s]+?)\s+regarding/i,  // "contacted Carlos Perez regarding"
    /Hola soy\s+([A-Za-z\s]+?)\s+de/i,          // "Hola soy [Nombre] de"
    /cliente\s+([A-Za-z\s]+?)\s+sobre/i,        // "cliente [Nombre] sobre"
    /([A-Z][a-z]+\s+[A-Z][a-z]+)/g,             // Cualquier "Nombre Apellido"
    /([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/g, // "Nombre Apellido Apellido"
    /([A-Z][a-z]+)/g                             // Cualquier nombre con mayúscula inicial
  ];
  
  for (const pattern of patterns) {
    const match = summary.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Filtrar nombres comunes que no son de clientes
      if (!['NutryHome', 'Isabela', 'Gregorio', 'AI', 'Agent'].includes(name)) {
        return name;
      }
    }
  }
  
  // Si no encuentra nada, buscar cualquier palabra con mayúscula
  const words = summary.match(/\b[A-Z][a-z]+\b/g);
  if (words && words.length > 0) {
    for (const word of words) {
      if (!['NutryHome', 'Isabela', 'Gregorio', 'AI', 'Agent', 'The', 'This', 'That'].includes(word)) {
        return word;
      }
    }
  }
  
  return null;
};

// Función para extraer teléfono del summary
const extractPhoneFromSummary = (summary: string): string | null => {
  if (!summary) return null;
  
  // Buscar patrones de teléfono
  const phonePatterns = [
    /(\+?54\s?9?\d{2}\s?\d{4}\s?\d{4})/g,        // +54 9 11 1234 5678
    /(\+?54\s?\d{2}\s?\d{4}\s?\d{4})/g,          // +54 11 1234 5678
    /(\d{2,4}\s?\d{4}\s?\d{4})/g,                // 11 1234 5678
    /(\+?\d{10,15})/g                             // Cualquier número de 10-15 dígitos
  ];
  
  for (const pattern of phonePatterns) {
    const match = summary.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
};

export default function ConversacionesPage() {
  return <ConversacionesUI/>;
}

// ============================
// Conversaciones – UI principal
// ============================
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
      const adaptedData = {
        total_calls: json.total_calls ?? json.total ?? 0,
        total_minutes: Math.floor((json.conversations ?? []).reduce((acc: number, c: any) => acc + (c.call_duration_secs || 0), 0) / 60),
        conversations: (json.conversations ?? []).map((c: any) => {
          console.log('🔍 Conversación individual:', { 
            conversation_id: c.conversation_id, 
            nombre_paciente: c.nombre_paciente,
            telefono_destino: c.telefono_destino,
            variables: c.variables,
            all_keys: Object.keys(c)
          }); // Debug
          return {
          // Usar siempre conversation_id (ya normalizado por el backend)
          conversation_id: c.conversation_id,
          summary: c.summary ?? '',
          start_time_unix_secs: c.start_time_unix_secs ?? (c.createdAt ? Math.floor(new Date(c.createdAt).getTime()/1000) : undefined),
          // Usar directamente los datos que vienen de la API (ya procesados desde variables dinámicas)
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
          // Campos adicionales del backend mejorado
          transcript: c.transcript,
          hasTranscript: c.hasTranscript,
          hasAudio: c.hasAudio,
        };
        }),
      };

      setData(adaptedData);
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // se canceló a propósito
      setError(e?.message ?? 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  // carga inicial
  useEffect(() => { fetchStats(); }, []);

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
    case "compartir":
      alert("🔗 Compartir en desarrollo");
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Conversaciones</h1>
            <p className="text-sm text-slate-500">Historial y gestión de las conversaciones</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerateProductReport}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-green-300 text-green-700 bg-green-50 text-sm hover:bg-green-100"
              title="Descargar reporte de productos"
            >
              <BarChart3 className="h-4 w-4" />
              Reporte de Productos
            </button>
            <button
              onClick={recoverHistoricalData}
              disabled={isRecovering || loading}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-green-500 text-white text-sm hover:bg-green-600 disabled:opacity-50"
              title="Recuperar datos históricos de NutriHome"
            >
              {isRecovering ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  Recuperando...
                </>
              ) : (
                '🔄 Recuperar Histórico'
              )}
            </button>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50"
              title="Traer últimos registros"
            >
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && <div className="max-w-6xl mx-auto px-6 mt-4"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Tabs + filtros (estáticos, visual) */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-6 border-b border-slate-200">
          <button className="relative pb-3 text-sm font-medium text-slate-900">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">📞</span>
              Llamadas Salientes
            </span>
            <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-indigo-600" />
          </button>
          <button className="pb-3 text-sm text-slate-500 hover:text-slate-700">Llamadas Entrantes</button>
          <button className="pb-3 text-sm text-slate-500 hover:text-slate-700">NutriHome (IA)</button>
          <div className="ml-auto flex gap-3 py-2">
            <div className="relative">
              <input
                placeholder="Buscar por nombre o teléfono..."
                className="h-10 w-80 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">Todos los estados</button>
            <button className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">Todas las fechas</button>
            <button className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">Más filtros ▾</button>
          </div>
        </div>
      </div>

      {/* Métricas resumen */}
      <div className="max-w-6xl mx-auto px-6 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard icon={<span className="text-indigo-600">🏷️</span>} label="Total de Llamadas" value={String(data.total_calls)} />
        <MetricCard icon={<span className="text-emerald-600">⏱️</span>} label="Tiempo Total" value={`${data.total_minutes} min`} />
      </div>

      {/* Lista de conversaciones */}
      <div className="max-w-6xl mx-auto px-6 mt-6 space-y-4">
        {data.conversations.map((c, i) => (
          <ConversationCard 
            key={c.conversation_id ?? i} 
            c={c} 
            onAction={(a) => handleAction(a, c)}
            isMenuOpen={openMenuId === c.conversation_id}
            onToggleMenu={() => setOpenMenuId(
              openMenuId === c.conversation_id ? null : (c.conversation_id || null)
            )}
            isPlaying={isPlaying === c.conversation_id}
            isPaused={isPaused}
            onPlay={() => handlePlayAudio(c.conversation_id!)}
            onPause={handlePauseAudio}
            onStop={handleStopAudio}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 text-center text-xs text-slate-400">
        Última actualización: {new Date().toLocaleString("es-AR")}
      </div>

      {/* Modal de Transcripción */}
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

// ====== Helpers UI ======
function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-xl">{icon}</div>
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function ConversationCard({ 
  c, 
  onAction, 
  isMenuOpen, 
  onToggleMenu,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onStop
}: { 
  c: Conversation; 
  onAction: (a: ActionId) => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}) {
  // Lógica corregida: solo uno de los estados
  const isSuccessful = c.call_successful === "true";
  const isFailed = c.call_successful === "false";
  
  // Replicar la misma lógica que funciona en conversaciones
  const displayName = c.nombre_paciente && c.nombre_paciente !== "Cliente NutryHome" 
    ? c.nombre_paciente 
    : "Sin nombre";

  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Avatar */}
      <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
        👤
      </div>

      {/* Información principal */}
      <div className="flex-1 min-w-0">
        {/* Nombre y estado */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-slate-900 truncate">
            {displayName}
          </h3>
          {isSuccessful && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
              Completada
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
              Fallida
            </span>
          )}
        </div>

        {/* Fecha, duración y teléfono */}
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4"/>
            {formatDate(c.start_time_unix_secs)}
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="h-4 w-4"/>
            {formatDuration(c.call_duration_secs || 0)}
          </span>
          {c.telefono_destino && c.telefono_destino !== "Sin teléfono" && (
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4"/>
              {c.telefono_destino}
            </span>
          )}
        </div>
      </div>

      {/* Controles de audio */}
      <div className="flex items-center gap-1">
        {/* Botón Play/Pause */}
        <button
          title={isPlaying ? "Pausar audio" : "Reproducir audio"}
          className={`grid h-10 w-10 place-items-center rounded-full text-white transition-colors ${
            isPlaying
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-green-500 hover:bg-green-600'
          }`}
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4"/>
          ) : (
            <Play className="h-4 w-4"/>
          )}
        </button>

        {/* Botón Stop */}
        <button
          title="Detener audio"
          className={`grid h-10 w-10 place-items-center rounded-full text-white transition-colors ${
            isPlaying || isPaused
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          onClick={onStop}
          disabled={!isPlaying && !isPaused}
        >
          <Square className="h-4 w-4"/>
        </button>
      </div>

      {/* Menú de tres puntos */}
      <MoreMenu 
        onAction={onAction} 
        isOpen={isMenuOpen}
        onToggle={onToggleMenu}
      />
    </div>
  );
}

// ===== Menú =====
type ActionId =
  | "audio"
  | "resumen"
  | "transcripcion"
  | "evaluacion"
  | "notas"
  | "detalles"
  | "descargar"
  | "compartir";

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
        onClick={onToggle}
        aria-label="Más opciones"
        className="ml-1 grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-8 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5">
          <MenuItem icon={<FileText className="h-4 w-4"/>} label="Resumen" onClick={() => onAction("resumen")} />
          <MenuItem icon={<MessageSquare className="h-4 w-4"/>} label="Transcripción" onClick={() => onAction("transcripcion")} />
          <MenuItem icon={<BadgeCheck className="h-4 w-4"/>} label="Evaluación" onClick={() => onAction("evaluacion")} />
          <MenuItem icon={<StickyNote className="h-4 w-4"/>} label="Notas" onClick={() => onAction("notas")} />
          <div className="my-1 h-px bg-slate-200" />
          <MenuItem icon={<Info className="h-4 w-4"/>} label="Ver detalles" onClick={() => onAction("detalles")} />
          <MenuItem icon={<Download className="h-4 w-4"/>} label="Descargar Audio" onClick={() => onAction("descargar")} />
          <MenuItem icon={<Share2 className="h-4 w-4"/>} label="Compartir" onClick={() => onAction("compartir")} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer text-left"
    >
      <span className="text-slate-500 group-hover:text-indigo-700">{icon}</span>
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





