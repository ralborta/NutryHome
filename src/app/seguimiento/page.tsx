'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Calendar,
  Search,
  AlertTriangle,
  Truck,
  TrendingDown,
  Clock,
  CheckCircle2,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

type Categoria = 'reclamo' | 'logistica' | 'consumo';
type EstadoCaso = 'pendiente' | 'en_proceso' | 'resuelto';
type Severidad = 'critica' | 'alta' | 'media' | 'baja';

type Caso = {
  id: string;
  paciente: string;
  categoria: Categoria;
  titulo: string;
  detalle: string;
  severidad: Severidad;
  estado: EstadoCaso;
  fecha: string; // ISO
  responsable: string;
};

function daysAgo(d: number): string {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x.toISOString();
}

/** Datos de ejemplo de casos de seguimiento hasta conectar la fuente real. */
const DEMO: Caso[] = [
  {
    id: 'c-1', paciente: 'María González', categoria: 'reclamo', titulo: 'Producto en mal estado',
    detalle: 'Refiere que la última caja de nutrición enteral llegó con envases dañados.',
    severidad: 'alta', estado: 'pendiente', fecha: daysAgo(1), responsable: 'Sin asignar',
  },
  {
    id: 'c-2', paciente: 'Roberto Díaz', categoria: 'logistica', titulo: 'Entrega no recibida',
    detalle: 'La entrega programada para esta semana no llegó al domicilio.',
    severidad: 'critica', estado: 'en_proceso', fecha: daysAgo(2), responsable: 'Logística',
  },
  {
    id: 'c-3', paciente: 'Elena Suárez', categoria: 'consumo', titulo: 'Consumo por debajo de lo esperado',
    detalle: 'Consumo del 40% respecto al plan; posible baja adherencia al tratamiento.',
    severidad: 'alta', estado: 'pendiente', fecha: daysAgo(3), responsable: 'Nutrición',
  },
  {
    id: 'c-4', paciente: 'Jorge Pereyra', categoria: 'logistica', titulo: 'Demora en reposición',
    detalle: 'Stock próximo a agotarse y la reposición figura demorada.',
    severidad: 'media', estado: 'pendiente', fecha: daysAgo(4), responsable: 'Logística',
  },
  {
    id: 'c-5', paciente: 'Carlos Romero', categoria: 'reclamo', titulo: 'Cobro incorrecto',
    detalle: 'Reclama una diferencia en la facturación del último pedido.',
    severidad: 'media', estado: 'en_proceso', fecha: daysAgo(5), responsable: 'Administración',
  },
  {
    id: 'c-6', paciente: 'Diego Torres', categoria: 'consumo', titulo: 'Consumo fallido reportado',
    detalle: 'No pudo completar la toma indicada; requiere seguimiento clínico.',
    severidad: 'critica', estado: 'pendiente', fecha: daysAgo(1), responsable: 'Sin asignar',
  },
  {
    id: 'c-7', paciente: 'Lucía Fernández', categoria: 'logistica', titulo: 'Cambio de domicilio',
    detalle: 'Solicita actualizar la dirección de entrega para próximos envíos.',
    severidad: 'baja', estado: 'resuelto', fecha: daysAgo(7), responsable: 'Logística',
  },
  {
    id: 'c-8', paciente: 'Ana Martínez', categoria: 'consumo', titulo: 'Bajo consumo recurrente',
    detalle: 'Tercer mes consecutivo con consumo inferior al 60%.',
    severidad: 'alta', estado: 'en_proceso', fecha: daysAgo(6), responsable: 'Nutrición',
  },
];

const CATEGORIA: Record<Categoria, { label: string; icon: LucideIcon; chip: string; accent: string }> = {
  reclamo: { label: 'Reclamo', icon: AlertTriangle, chip: 'bg-red-50 text-red-700 border-red-200', accent: 'from-red-500 to-rose-600' },
  logistica: { label: 'Logística / Entregas', icon: Truck, chip: 'bg-sky-50 text-sky-700 border-sky-200', accent: 'from-sky-500 to-blue-600' },
  consumo: { label: 'Consumo', icon: TrendingDown, chip: 'bg-amber-50 text-amber-800 border-amber-200', accent: 'from-amber-500 to-orange-600' },
};

const SEVERIDAD: Record<Severidad, { label: string; chip: string; dot: string }> = {
  critica: { label: 'Crítica', chip: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  alta: { label: 'Alta', chip: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  media: { label: 'Media', chip: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  baja: { label: 'Baja', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

const ESTADO: Record<EstadoCaso, { label: string; chip: string; icon: LucideIcon }> = {
  pendiente: { label: 'Pendiente', chip: 'bg-amber-50 text-amber-800 border-amber-200', icon: Clock },
  en_proceso: { label: 'En proceso', chip: 'bg-sky-50 text-sky-700 border-sky-200', icon: Loader2 },
  resuelto: { label: 'Resuelto', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

function relTime(iso: string): string {
  const diff = Math.floor((Date.now() - +new Date(iso)) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return `Hace ${diff} días`;
}

const FILTROS: { id: 'todos' | Categoria; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'reclamo', label: 'Reclamos' },
  { id: 'logistica', label: 'Logística / Entregas' },
  { id: 'consumo', label: 'Consumo' },
];

/** Seguimiento de casos pendientes: reclamos, logística/entregas y consumo. */
export default function SeguimientoPage() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<'todos' | Categoria>('todos');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(
      new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    );
  }, []);

  const stats = useMemo(() => {
    const pend = DEMO.filter((c) => c.estado !== 'resuelto');
    return {
      reclamos: pend.filter((c) => c.categoria === 'reclamo').length,
      logistica: pend.filter((c) => c.categoria === 'logistica').length,
      consumo: pend.filter((c) => c.categoria === 'consumo').length,
      criticos: pend.filter((c) => c.severidad === 'critica').length,
    };
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO.filter((c) => {
      const okFiltro = filtro === 'todos' ? true : c.categoria === filtro;
      const okQuery = !q || c.paciente.toLowerCase().includes(q) || c.titulo.toLowerCase().includes(q) || c.detalle.toLowerCase().includes(q);
      return okFiltro && okQuery;
    }).sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));
  }, [query, filtro]);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-[#e8ecf1] bg-white px-6 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md">
              <ClipboardList className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#0f172a]">Seguimiento</h1>
              <p className="mt-1.5 max-w-3xl text-[15px] text-slate-600">
                Casos pendientes de gestión: reclamos, logística y entregas, y alertas de consumo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm capitalize text-slate-600">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <span suppressHydrationWarning>{mounted ? currentDate : '…'}</span>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={AlertTriangle} label="Reclamos pendientes" value={stats.reclamos} accent="from-red-500 to-rose-600" />
          <StatCard icon={Truck} label="Logística / entregas" value={stats.logistica} accent="from-sky-500 to-blue-600" />
          <StatCard icon={TrendingDown} label="Alertas de consumo" value={stats.consumo} accent="from-amber-500 to-orange-600" />
          <StatCard icon={Clock} label="Casos críticos" value={stats.criticos} accent="from-violet-500 to-fuchsia-600" />
        </div>

        <section className="rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 border-b border-[#eef2f6] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-[#0f172a]">Casos abiertos</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar paciente o caso…"
                  className="w-full rounded-[10px] border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTROS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    filtro === f.id
                      ? 'bg-[#2563eb] text-white shadow-sm'
                      : 'border border-transparent bg-[#f1f5f9] text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <li className="px-5 py-16 text-center text-slate-500">No hay casos con los filtros actuales.</li>
            ) : (
              rows.map((c) => {
                const cat = CATEGORIA[c.categoria];
                const sev = SEVERIDAD[c.severidad];
                const est = ESTADO[c.estado];
                const CatIcon = cat.icon;
                const EstIcon = est.icon;
                return (
                  <li key={c.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cat.accent} text-white shadow-sm`}>
                      <CatIcon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-800">{c.titulo}</p>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sev.chip}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                          {sev.label}
                        </span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cat.chip}`}>
                          {cat.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{c.detalle}</p>
                      <p className="mt-1.5 text-xs text-slate-400">
                        <span className="font-medium text-slate-500">{c.paciente}</span> · {relTime(c.fecha)} · Responsable: {c.responsable}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${est.chip}`}>
                        <EstIcon className="h-3.5 w-3.5" />
                        {est.label}
                      </span>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <p className="flex items-center gap-2 px-1 text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Datos de ejemplo. Los casos se generarán automáticamente a partir de las llamadas y entregas reales.
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
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-[#0f172a]">{value}</p>
      <p className="mt-1 text-[13px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
