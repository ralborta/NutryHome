'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Package,
  Calendar,
  Search,
  RefreshCw,
  Loader2,
  MapPin,
  Phone,
  Users,
  ListChecks,
  FileText,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { agruparPedidosPorPaciente, filtrarPedidos, type PedidoPaciente } from '@/lib/pedidosFromReport';

export default function PedidosPage() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get('paciente')?.toLowerCase() ?? '';

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(highlight);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(
      new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    );
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch('/api/reports/elevenlabs?format=json&max=200&page_size=100', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRows(data.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pedidos = useMemo(() => agruparPedidosPorPaciente(rows), [rows]);
  const filtered = useMemo(() => filtrarPedidos(pedidos, query), [pedidos, query]);

  useEffect(() => {
    if (highlight && pedidos.length > 0) {
      const match = pedidos.find((p) => p.nombre_paciente.toLowerCase().includes(highlight));
      if (match) setExpanded(match.key);
    }
  }, [highlight, pedidos]);

  const stats = useMemo(
    () => ({
      pacientes: pedidos.length,
      productos: pedidos.reduce((a, p) => a + p.lineas.length, 0),
      conDomicilio: pedidos.filter((p) => p.localidad).length,
    }),
    [pedidos],
  );

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-[#e8ecf1] bg-white px-6 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md">
              <Package className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#0f172a]">Pedidos</h1>
              <p className="mt-1.5 max-w-3xl text-[15px] text-slate-600">
                Productos confirmados en llamadas, agrupados por paciente.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden items-center gap-2 text-sm capitalize text-slate-600 sm:flex">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span suppressHydrationWarning>{mounted ? currentDate : '…'}</span>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refrescar
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-6">
        {error && (
          <div className="flex items-center gap-2 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard icon={Users} label="Pacientes con pedido" value={stats.pacientes} accent="from-emerald-500 to-teal-600" loading={loading} />
          <StatCard icon={ListChecks} label="Líneas de producto" value={stats.productos} accent="from-blue-500 to-cyan-600" loading={loading} />
          <StatCard icon={MapPin} label="Con localidad" value={stats.conDomicilio} accent="from-violet-500 to-indigo-600" loading={loading} />
        </div>

        <section className="rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 border-b border-[#eef2f6] p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-[#0f172a]">Pedidos por paciente</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar paciente, teléfono o producto…"
                className="w-full rounded-[10px] border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-20 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando pedidos…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-20 text-center text-slate-500">
              {pedidos.length === 0
                ? 'No hay pedidos detectados en las llamadas recientes.'
                : 'No hay resultados para la búsqueda.'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <PedidoCard
                  key={p.key}
                  pedido={p}
                  open={expanded === p.key}
                  onToggle={() => setExpanded(expanded === p.key ? null : p.key)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function PedidoCard({
  pedido: p,
  open,
  onToggle,
}: {
  pedido: PedidoPaciente;
  open: boolean;
  onToggle: () => void;
}) {
  const initials = p.nombre_paciente
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <li className="transition-colors hover:bg-slate-50/50">
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-4 px-5 py-4 text-left">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-800">{p.nombre_paciente}</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              {p.lineas.length} {p.lineas.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {p.telefono && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {p.telefono}
              </span>
            )}
            {p.localidad && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {p.localidad}
              </span>
            )}
            {p.ultimaFecha && <span>Última llamada: {p.ultimaFecha}</span>}
          </p>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-5 pb-5 pt-3">
          {p.resumen && (
            <div className="mb-4 rounded-[10px] border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-sky-950">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-sky-700">
                <FileText className="h-3.5 w-3.5" /> Resumen de la llamada
              </p>
              {p.resumen}
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="pb-2 text-left">Producto</th>
                <th className="pb-2 text-left">Cantidad</th>
                <th className="pb-2 text-left">Presentación</th>
                <th className="pb-2 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {p.lineas.map((l, i) => (
                <tr key={i}>
                  <td className="py-2 font-medium text-slate-800">{l.producto}</td>
                  <td className="py-2 text-slate-600">
                    {l.cantidad || '—'}
                    {l.unidad ? ` ${l.unidad}` : ''}
                  </td>
                  <td className="py-2 text-slate-600">{l.presentacion || '—'}</td>
                  <td className="py-2 text-slate-500">{l.fecha || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/calls`}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver en llamadas
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-[#0f172a]">
        {loading ? <span className="text-slate-300">—</span> : value}
      </p>
      <p className="mt-1 text-[13px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
