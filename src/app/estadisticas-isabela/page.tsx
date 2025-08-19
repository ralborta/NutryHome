'use client';

import React from "react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"; // shadcn/ui
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
  MessageSquareText,
  BadgeCheck,
  StickyNote,
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
  call_successful?: string; // "true" | "false"
  summary?: string;
  telefono_destino?: string;
  nombre_paciente?: string;
  producto?: string;
  rating?: number; // opcional
  resultado?: string; // ej: "Venta"
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/estadisticas-isabela");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e?.message ?? "Error al cargar");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Conversaciones</h1>
        <p className="text-sm text-slate-500">Historial y gestión de las conversaciones</p>
      </div>

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

      {/* Lista de conversaciones (Cards) */}
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
  const success = c.call_successful === "true" || c.status === "done";
  const failed = c.call_successful === "false" || c.status === "failed";
  const estadoLabel = success ? "Completada" : failed ? "Fallida" : c.status ?? "—";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="grid h-12 w-12 flex-none place-items-center rounded-full bg-violet-100 text-violet-700 font-semibold">👤</div>

        {/* Centro: nombre, tags, agente */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-lg font-semibold text-slate-900">
              {c.nombre_paciente || "Sin nombre"}
            </div>
            {/* (chips de ejemplo) */}
            {success && (
              <span className="ml-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Completada</span>
            )}
            {c.resultado && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{c.resultado}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4"/>{formatDate(c.start_time_unix_secs)}</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4"/>{formatDuration(c.call_duration_secs)}</span>
            <span className="inline-flex items-center gap-1"><Info className="h-4 w-4"/>{estadoLabel}</span>
            {c.producto && <span className="inline-flex items-center gap-1">🧪 {c.producto}</span>}
            {c.telefono_destino && <span className="inline-flex items-center gap-1">📞 {c.telefono_destino}</span>}
          </div>
        </div>

        {/* Rating */}
        {typeof c.rating === "number" && (
          <div className="hidden sm:flex items-center gap-1 text-slate-700">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
            <span className="text-sm font-medium">{c.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Botón play rojo */}
        <button
          title="Reproducir"
          className="grid h-10 w-10 place-items-center rounded-full bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 transition"
          onClick={() => onAction("resumen")}
        >
          <Play className="h-4 w-4"/>
        </button>

        {/* Menú de tres puntos */}
        <MoreMenu onAction={onAction} />
      </div>
    </div>
  );
}

// ===== Menú =====
type ActionId =
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
        <MenuItem icon={<MessageSquareText className="h-4 w-4"/>} label="Transcripción" onClick={() => onAction("transcripcion")} />
        <MenuItem icon={<BadgeCheck className="h-4 w-4"/>} label="Evaluación" onClick={() => onAction("evaluacion")} />
        <MenuItem icon={<StickyNote className="h-4 w-4"/>} label="Notas" onClick={() => onAction("notas")} />
        <DropdownMenuSeparator className="my-1" />
        <MenuItem icon={<Info className="h-4 w-4"/>} label="Ver detalles" onClick={() => onAction("detalles")} />
        <MenuItem icon={<Download className="h-4 w-4"/>} label="Descargar" onClick={() => onAction("descargar")} />
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
  switch (action) {
    case "resumen":
      alert(c.summary ? c.summary : "Sin resumen disponible");
      break;
    case "transcripcion":
      alert("Transcripción en desarrollo");
      break;
    case "evaluacion":
      alert(`Mensajes: ${c.message_count ?? "N/A"}`);
      break;
    case "notas":
      alert("Notas en desarrollo");
      break;
    case "detalles":
      alert(JSON.stringify(c, null, 2));
      break;
    case "descargar":
      alert("Descarga en desarrollo");
      break;
    case "compartir":
      alert("Compartir en desarrollo");
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
