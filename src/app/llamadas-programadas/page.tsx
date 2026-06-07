'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Calendar,
  Clock,
  Phone,
  Plus,
  Search,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

type EstadoProgramada = 'programada' | 'pendiente' | 'reprogramada';

type LlamadaProgramada = {
  id: string;
  paciente: string;
  telefono: string;
  fecha: string; // ISO
  motivo: string;
  estado: EstadoProgramada;
};

/** Datos de ejemplo: se reemplazan cuando se conecte la agenda real de llamadas. */
const DEMO: LlamadaProgramada[] = [
  {
    id: 'lp-1',
    paciente: 'María González',
    telefono: '+54 9 11 3771 0010',
    fecha: addDaysIso(0, 10, 30),
    motivo: 'Verificación de stock mensual',
    estado: 'programada',
  },
  {
    id: 'lp-2',
    paciente: 'Jorge Pereyra',
    telefono: '+54 9 11 5582 1144',
    fecha: addDaysIso(0, 15, 0),
    motivo: 'Recordatorio de entrega',
    estado: 'pendiente',
  },
  {
    id: 'lp-3',
    paciente: 'Lucía Fernández',
    telefono: '+54 9 351 410 2233',
    fecha: addDaysIso(1, 9, 0),
    motivo: 'Seguimiento de consumo',
    estado: 'programada',
  },
  {
    id: 'lp-4',
    paciente: 'Roberto Díaz',
    telefono: '+54 9 11 6090 7788',
    fecha: addDaysIso(2, 11, 15),
    motivo: 'Confirmación de pedido',
    estado: 'reprogramada',
  },
];

function addDaysIso(days: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const ESTADO_STYLES: Record<EstadoProgramada, { label: string; chip: string; dot: string }> = {
  programada: { label: 'Programada', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  pendiente: { label: 'Pendiente', chip: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  reprogramada: { label: 'Reprogramada', chip: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
};

function formatFecha(iso: string): { dia: string; hora: string } {
  const d = new Date(iso);
  return {
    dia: d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }),
    hora: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  };
}

/** Agenda de llamadas salientes programadas (reemplaza la antigua pantalla de webhooks). */
export default function LlamadasProgramadasPage() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(
      new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    );
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = [...DEMO].sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha));
    if (!q) return base;
    return base.filter(
      (r) => r.paciente.toLowerCase().includes(q) || r.telefono.includes(q) || r.motivo.toLowerCase().includes(q),
    );
  }, [query]);

  const stats = useMemo(() => {
    const now = new Date();
    const hoy = DEMO.filter((r) => new Date(r.fecha).toDateString() === now.toDateString()).length;
    const semana = DEMO.filter((r) => {
      const diff = (+new Date(r.fecha) - +now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
    const pendientes = DEMO.filter((r) => r.estado === 'pendiente').length;
    return { total: DEMO.length, hoy, semana, pendientes };
  }, []);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-[#e8ecf1] bg-white px-6 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <CalendarClock className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#0f172a]">Llamadas Programadas</h1>
              <p className="mt-1.5 max-w-3xl text-[15px] text-slate-600">
                Agenda de llamadas salientes pendientes de ejecución. Planificá y hacé seguimiento de los próximos
                contactos con pacientes.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm capitalize text-slate-600">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span suppressHydrationWarning>{mounted ? currentDate : '…'}</span>
            </div>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white opacity-60 shadow-sm"
              title="Disponible próximamente"
            >
              <Plus className="h-4 w-4" />
              Programar llamada
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={CalendarDays} label="Total programadas" value={stats.total} accent="from-violet-500 to-indigo-600" />
          <StatCard icon={Clock} label="Para hoy" value={stats.hoy} accent="from-sky-500 to-blue-600" />
          <StatCard icon={CalendarClock} label="Próximos 7 días" value={stats.semana} accent="from-emerald-500 to-teal-600" />
          <StatCard icon={AlertCircle} label="Pendientes de confirmar" value={stats.pendientes} accent="from-amber-500 to-orange-600" />
        </div>

        <section className="rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 border-b border-[#eef2f6] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-bold text-[#0f172a]">Próximas llamadas</h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar paciente, teléfono o motivo…"
                className="w-full rounded-[10px] border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CalendarClock className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-700">No hay llamadas programadas</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Cuando se agenden llamadas salientes aparecerán acá ordenadas por fecha y hora.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eef2f6] text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                    <th className="px-5 py-3.5">Paciente</th>
                    <th className="px-5 py-3.5">Teléfono</th>
                    <th className="px-5 py-3.5">Fecha y hora</th>
                    <th className="px-5 py-3.5">Motivo</th>
                    <th className="px-5 py-3.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => {
                    const f = formatFecha(r.fecha);
                    const est = ESTADO_STYLES[r.estado];
                    return (
                      <tr key={r.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-xs font-bold text-white">
                              {r.paciente.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                            </div>
                            <span className="font-semibold text-slate-800">{r.paciente}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-600">{r.telefono}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold capitalize text-slate-800">{f.dia}</span>
                            <span className="text-xs text-slate-500">{f.hora} hs</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{r.motivo}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${est.chip}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${est.dot}`} />
                            {est.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="flex items-center gap-2 px-1 text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Datos de ejemplo. La agenda se completará automáticamente al programar llamadas reales.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-[14px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-[#0f172a]">{value}</p>
      <p className="mt-1 text-[13px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
