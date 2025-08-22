'use client';

import { useMemo } from 'react';
import {
  Calendar, Clock3, Info, Phone, Play, MoreVertical, UserRound
} from 'lucide-react';

type Conversation = {
  conversation_id?: string;
  nombre_paciente?: string;
  telefono_destino?: string;
  start_time_unix_secs?: number;   // epoch secs
  call_duration_secs?: number;     // en segundos
  status?: string;                 // 'done' | 'failed' | ...
  call_successful?: 'true' | 'false';
};

export default function ConversacionesList({
  conversations,
  onPlayClick,
  onMenuClick,
}: {
  conversations: Conversation[];
  onPlayClick?: (c: Conversation) => void;
  onMenuClick?: (c: Conversation) => void;
}) {
  const items = useMemo(() => conversations ?? [], [conversations]);

  return (
    <div className="space-y-4">
      {items.map((c, i) => (
        <ConversationCard
          key={c.conversation_id ?? i}
          c={c}
          onPlayClick={onPlayClick}
          onMenuClick={onMenuClick}
        />
      ))}
    </div>
  );
}

function ConversationCard({
  c,
  onPlayClick,
  onMenuClick,
}: {
  c: Conversation;
  onPlayClick?: (c: Conversation) => void;
  onMenuClick?: (c: Conversation) => void;
}) {
  const estadoOk =
    c.call_successful === 'true' || (c.status ?? '').toLowerCase() === 'done';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500">
          <UserRound className="h-7 w-7" />
        </div>

        {/* Centro */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="truncate text-lg font-semibold text-slate-900">
              {c.nombre_paciente?.trim() || 'Sin nombre'}
            </div>

            {/* Pill estado */}
            <span
              className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                estadoOk
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700',
              ].join(' ')}
            >
              {estadoOk ? 'Completada' : 'Fallida'}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-5 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDateAR(c.start_time_unix_secs)}
            </span>

            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-4 w-4" />
              {formatDuration(c.call_duration_secs)}
            </span>

            <span className="inline-flex items-center gap-1">
              <Info className="h-4 w-4" />
              {estadoOk ? 'Completada' : (c.status ?? '—')}
            </span>

            {c.telefono_destino && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {c.telefono_destino}
              </span>
            )}
          </div>
        </div>

        {/* Botón Play rojo */}
        <button
          onClick={() => onPlayClick?.(c)}
          className="grid h-10 w-10 place-items-center rounded-full bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700"
          title="Reproducir"
        >
          <Play className="h-4 w-4" />
        </button>

        {/* Kebab */}
        <button
          onClick={() => onMenuClick?.(c)}
          className="ml-2 grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100"
          title="Más opciones"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ===== Helpers de formato (coinciden con el diseño) ===== */
function formatDateAR(epochSecs?: number) {
  if (!epochSecs) return '—';
  const d = new Date(epochSecs * 1000);
  const fecha = d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const hora = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${fecha}, ${hora}`;
}

function formatDuration(secs?: number) {
  if (secs === undefined || secs === null) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}


