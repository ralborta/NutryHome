'use client';

import React from "react";
import { useEffect, useState, useRef } from "react";
import ConversacionesList from "@/components/ConversacionesList";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Play,
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
}

interface StatsData {
  total_calls: number;
  total_minutes: number;
  conversations: Conversation[];
}

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

  // ✅ CORREGIDO: no-store, cache-bust, abort de requests previos, y adaptación de datos
  const fetchStats = async () => {
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);

      // NOTA: si cambiaste el dominio, ajusta esta URL:
      const url = `https://nutryhome-production.up.railway.app/api/isabela/conversations?limit=50&ts=${Date.now()}`;

      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'accept': 'application/json' },
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      // ✅ El backend ya devuelve datos enriquecidos, solo mapear los campos necesarios
      const adaptedData = {
        total_calls: json.total ?? 0,
        total_minutes: Math.floor((json.conversations ?? []).reduce((acc: number, c: any) => acc + (c.call_duration_secs || 0), 0) / 60),
        conversations: (json.conversations ?? []).map((c: any) => ({
          conversation_id: c.conversationId ?? c.conversation_id ?? c.id,
          summary: c.summary ?? '',
          start_time_unix_secs: c.start_time_unix_secs ?? (c.createdAt ? Math.floor(new Date(c.createdAt).getTime()/1000) : undefined),
          nombre_paciente: c.nombre_paciente ?? 'Cliente NutryHome',
          telefono_destino: c.telefono_destino ?? 'N/A',
          call_duration_secs: c.call_duration_secs ?? 0,
          status: c.status ?? 'completed',
          producto: c.producto ?? 'NutryHome',
          agent_name: c.agent_name ?? 'Isabela',
          agent_id: c.agent_id,
          message_count: c.message_count ?? 0,
          call_successful: c.call_successful ?? 'true',
          resultado: c.resultado ?? 'Completada',
          rating: c.rating ?? null,
        })),
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
          <button className="pb-3 text-sm text-slate-500 hover:text-slate-700">Isabela (ElevenLabs)</button>
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
          <ConversationCard key={c.conversation_id ?? i} c={c} onAction={(a) => handleAction(a, c)} />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 text-center text-xs text-slate-400">
        Última actualización: {new Date().toLocaleString("es-AR")}
      </div>
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

function ConversationCard({ c, onAction }: { c: Conversation; onAction: (a: ActionId) => void }) {
  // Lógica corregida: solo uno de los estados
  const isSuccessful = c.call_successful === "true";
  const isFailed = c.call_successful === "false";
  
  // Obtener nombre real del contacto o fallback
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
          {c.telefono_destino && c.telefono_destino !== "N/A" && (
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4"/>
              {c.telefono_destino}
            </span>
          )}
        </div>
      </div>

      {/* Botón de reproducir audio */}
      <button
        title="Reproducir grabación"
        className="grid h-10 w-10 place-items-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
        onClick={() => onAction("audio")}
      >
        <Play className="h-4 w-4"/>
      </button>

      {/* Menú de tres puntos */}
      <MoreMenu onAction={onAction} />
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

function MoreMenu({ onAction }: { onAction: (a: ActionId) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Más opciones"
          className="ml-1 grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5"
      >
        <MenuItem icon={<FileText className="h-4 w-4"/>} label="Resumen" onClick={() => onAction("resumen")} />
        <MenuItem icon={<MessageSquare className="h-4 w-4"/>} label="Transcripción" onClick={() => onAction("transcripcion")} />
        <MenuItem icon={<BadgeCheck className="h-4 w-4"/>} label="Evaluación" onClick={() => onAction("evaluacion")} />
        <MenuItem icon={<StickyNote className="h-4 w-4"/>} label="Notas" onClick={() => onAction("notas")} />
        <DropdownMenuSeparator className="my-1" />
        <MenuItem icon={<Info className="h-4 w-4"/>} label="Ver detalles" onClick={() => onAction("detalles")} />
        <MenuItem icon={<Download className="h-4 w-4"/>} label="Descargar Audio" onClick={() => onAction("descargar")} />
        <MenuItem icon={<Share2 className="h-4 w-4"/>} label="Compartir" onClick={() => onAction("compartir")} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 focus:bg-indigo-50 focus:text-indigo-700 cursor-pointer"
    >
      <span className="text-slate-500 group-hover:text-indigo-700">{icon}</span>
      <span>{label}</span>
    </DropdownMenuItem>
  );
}

// ===== Lógica de acciones (placeholder) =====
function handleAction(action: ActionId, c: Conversation) {
  console.log("🔍 DEBUG conversación completa:", c);
  
  switch (action) {
    case "audio": {
      if (!c.conversation_id) { 
        alert("ID de conversación no disponible"); 
        break; 
      }
      
      // Verificar si el audio está disponible
      const audioUrl = `https://nutryhome-production.up.railway.app/api/audio/${c.conversation_id}`;
      
      // Mostrar mensaje temporal
      alert(`🎵 AUDIO DE GRABACIÓN\n\n⚠️ No disponible por el momento\n\nEsta funcionalidad será habilitada próximamente.`);
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
      alert("📝 Transcripción en desarrollo");
      break;
    case "evaluacion":
      console.log("🔍 DEBUG evaluation_data:", c.evaluation_data);
      
      if (!c.evaluation_data) {
        alert("📊 No hay datos de evaluación disponibles para esta conversación");
        break;
      }

      // Procesar datos de evaluación de ElevenLabs
      const evalData = c.evaluation_data;
      let evaluacion = "📊 EVALUACIÓN DE LA LLAMADA:\n\n";

      // Información básica
      evaluacion += "🎯 MÉTRICAS GENERALES:\n";
      evaluacion += `🔹 Estado: ${c.call_successful === "true" ? "✅ Completada exitosamente" : c.call_successful === "false" ? "❌ Falló" : "❓ No definido"}\n`;
      evaluacion += `🔹 Duración: ${formatDuration(c.call_duration_secs)}\n`;
      evaluacion += `🔹 Mensajes: ${c.message_count ?? "0"}\n`;
      
      // Datos de análisis de ElevenLabs
      if (evalData.call_successful) {
        evaluacion += `\n✅ RESULTADO GENERAL:\n🔹 ${evalData.call_successful}\n`;
      }

      if (evalData.summary) {
        evaluacion += `\n📋 RESUMEN DE EVALUACIÓN:\n🔹 ${evalData.summary}\n`;
      }

      // Evaluación específica de ElevenLabs - evalData ES evaluation_criteria_results
      if (evalData && Object.keys(evalData).length > 0) {
        evaluacion += "\n📝 CRITERIOS DE EVALUACIÓN:\n";
        
        Object.entries(evalData).forEach(([key, criteriaObj]) => {
          if (criteriaObj && typeof criteriaObj === 'object') {
            const criteria = criteriaObj as any;
            evaluacion += `\n🔸 ${key.toUpperCase()}:\n`;
            
            if (criteria.result) {
              evaluacion += `   ✅ Resultado: ${criteria.result}\n`;
            }
            
            if (criteria.rationale) {
              evaluacion += `   📋 Descripción: ${criteria.rationale}\n`;
            }
            
            if (criteria.value) {
              evaluacion += `   🔹 Valor: ${criteria.value}\n`;
            }
          }
        });
      }

      // Rating si está disponible
      if (c.rating) {
        evaluacion += `\n⭐ CALIFICACIÓN:\n🔹 ${c.rating.toFixed(1)}/5 estrellas\n`;
      }

      // Otros campos de análisis
      if (evalData.customer_satisfaction) {
        evaluacion += `\n😊 SATISFACCIÓN DEL CLIENTE:\n🔹 ${evalData.customer_satisfaction}\n`;
      }

      if (evalData.agent_performance) {
        evaluacion += `\n🤖 DESEMPEÑO DEL AGENTE:\n🔹 ${evalData.agent_performance}\n`;
      }

      // Información adicional del análisis
      if (Object.keys(evalData).length > 0) {
        evaluacion += "\n📋 DATOS ADICIONALES:\n";
        Object.entries(evalData).forEach(([key, value]) => {
          if (!['call_successful', 'summary', 'criteria', 'evaluation_criteria', 'customer_satisfaction', 'agent_performance'].includes(key) && value) {
            evaluacion += `🔹 ${key}: ${value}\n`;
          }
        });
      }

      alert(evaluacion);
      break;
    case "notas":
      console.log("🔍 DEBUG data_collection:", c.data_collection);
      
      if (!c.data_collection) {
        alert("📝 No hay datos de recolección disponibles para esta conversación");
        break;
      }

      // Procesar data collection en formato tabla
      const data = c.data_collection;
      const productos = [
        { campo: "Producto 1", valor: data.producto1, cantidad: data.cantidad1 },
        { campo: "Producto 2", valor: data.producto2, cantidad: data.cantidad2 },
        { campo: "Producto 3", valor: data.producto3, cantidad: data.cantidad3 }
      ];

      let notasHTML = "📝 DATOS RECOLECTADOS EN LA LLAMADA:\n\n";
      
      // Productos
      notasHTML += "🛒 PRODUCTOS MENCIONADOS:\n";
      productos.forEach(p => {
        if (p.valor && p.valor !== "NA" && p.valor !== "N/A") {
          const cantidadText = p.cantidad && p.cantidad !== "0" ? ` (${p.cantidad} unidades)` : "";
          notasHTML += `• ${p.campo}: ${p.valor}${cantidadText} ✅\n`;
        } else {
          notasHTML += `• ${p.campo}: No aplica 🚫\n`;
        }
      });

      // Información del paciente
      if (data.nombre_paciente || data.nombre_contacto) {
        notasHTML += "\n👤 INFORMACIÓN DEL PACIENTE:\n";
        if (data.nombre_paciente) notasHTML += `• Nombre: ${data.nombre_paciente}\n`;
        if (data.nombre_contacto && data.nombre_contacto !== data.nombre_paciente) {
          notasHTML += `• Contacto: ${data.nombre_contacto}\n`;
        }
        if (data.localidad) notasHTML += `• Localidad: ${data.localidad}\n`;
        if (data.delegacion) notasHTML += `• Delegación: ${data.delegacion}\n`;
        if (data.domicilio_actual) notasHTML += `• Domicilio: ${data.domicilio_actual}\n`;
      }

      // Información de envío
      if (data.fecha_envio) {
        notasHTML += "\n📦 INFORMACIÓN DE ENVÍO:\n";
        notasHTML += `• Fecha de envío: ${data.fecha_envio}\n`;
      }

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
      
      // Mostrar mensaje de descarga no disponible
      alert(`💾 DESCARGAR AUDIO\n\n⚠️ No disponible por el momento\n\nEsta funcionalidad será habilitada próximamente.`);
      break;
    case "compartir":
      alert("🔗 Compartir en desarrollo");
      break;
  }
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





