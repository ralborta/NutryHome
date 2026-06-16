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
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Boxes,
  Hash,
  Truck,
  User,
  ClipboardList,
  ExternalLink,
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
    .join('')
    .toUpperCase();

  const totalUnidades = p.lineas.reduce((acc, l) => {
    const n = parseFloat(String(l.cantidad).replace(',', '.'));
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <li
      className={`transition-all ${open ? 'bg-gradient-to-b from-emerald-50/30 to-white' : 'hover:bg-slate-50/50'}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-md shadow-emerald-500/20 ring-2 ring-white">
          {initials}
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
            <ShoppingBag className="h-3 w-3" strokeWidth={2.5} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-bold tracking-tight text-slate-900">{p.nombre_paciente}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              <Package className="h-3 w-3" />
              {p.lineas.length} {p.lineas.length === 1 ? 'ítem' : 'ítems'}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {p.telefono && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> {p.telefono}
              </span>
            )}
            {p.localidad && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {p.localidad}
              </span>
            )}
            {p.ultimaFecha && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> {p.ultimaFecha}
              </span>
            )}
          </p>
        </div>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
            open ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'
          }`}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-emerald-100/80 px-5 pb-6 pt-4">
          {/* Cabecera del detalle */}
          <div className="mb-5 flex flex-col gap-4 rounded-[14px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 p-4 shadow-sm lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <ClipboardList className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">Detalle del pedido</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{p.nombre_paciente}</p>
                {p.nombre_contacto && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <User className="h-3.5 w-3.5" /> Contacto: {p.nombre_contacto}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <DetailChip icon={Package} label={`${p.lineas.length} productos`} tone="emerald" />
              {totalUnidades > 0 && (
                <DetailChip icon={Hash} label={`~${totalUnidades} uds.`} tone="blue" />
              )}
              <DetailChip icon={Truck} label="Confirmado en llamada" tone="violet" />
            </div>
          </div>

          {/* Datos de entrega */}
          {(p.domicilio || p.localidad || p.delegacion) && (
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              {p.domicilio && (
                <InfoTile icon={MapPin} label="Domicilio" value={p.domicilio} accent="sky" />
              )}
              {p.localidad && (
                <InfoTile icon={MapPin} label="Localidad" value={p.localidad} accent="indigo" />
              )}
              {p.delegacion && (
                <InfoTile icon={MapPin} label="Delegación" value={p.delegacion} accent="violet" />
              )}
            </div>
          )}

          {/* Resumen de llamada */}
          {p.resumen && (
            <div className="mb-5 overflow-hidden rounded-[14px] border border-sky-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-sky-50 bg-gradient-to-r from-sky-50 to-blue-50/50 px-4 py-2.5">
                <FileText className="h-4 w-4 text-sky-600" />
                <p className="text-xs font-bold uppercase tracking-wide text-sky-800">Resumen de la llamada</p>
              </div>
              <p className="px-4 py-3 text-sm leading-relaxed text-slate-700">{p.resumen}</p>
            </div>
          )}

          {/* Líneas de producto */}
          <div className="mb-4">
            <div className="mb-3 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Productos del pedido</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {p.lineas.map((l, i) => (
                <ProductoLineaCard key={`${l.producto}-${i}`} linea={l} index={i} />
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Link
              href="/calls"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Phone className="h-3.5 w-3.5" />
              Ver llamada origen
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Link>
            <Link
              href={`/pacientes`}
              className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <User className="h-3.5 w-3.5" />
              Ficha del paciente
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

const CHIP_TONES = {
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  blue: 'bg-sky-50 text-sky-800 border-sky-200',
  violet: 'bg-violet-50 text-violet-800 border-violet-200',
} as const;

function DetailChip({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: keyof typeof CHIP_TONES;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${CHIP_TONES[tone]}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

const TILE_ACCENTS = {
  sky: 'from-sky-500 to-blue-600',
  indigo: 'from-indigo-500 to-violet-600',
  violet: 'from-violet-500 to-fuchsia-600',
} as const;

function InfoTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: keyof typeof TILE_ACCENTS;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-slate-100 bg-white p-3 shadow-sm">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${TILE_ACCENTS[accent]} text-white shadow-sm`}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-slate-800">{value}</p>
      </div>
    </div>
  );
}

const PRODUCT_PALETTE = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-cyan-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
] as const;

function ProductoLineaCard({
  linea: l,
  index,
}: {
  linea: { producto: string; cantidad: string; unidad?: string; presentacion?: string; fecha: string };
  index: number;
}) {
  const accent = PRODUCT_PALETTE[index % PRODUCT_PALETTE.length];

  return (
    <div className="group relative overflow-hidden rounded-[14px] border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-100 hover:shadow-md">
      <div className="absolute right-3 top-3 opacity-[0.07] transition group-hover:opacity-[0.12]">
        <Package className="h-16 w-16 text-emerald-900" strokeWidth={1} />
      </div>
      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md`}
        >
          <Package className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="pr-8 text-sm font-bold leading-tight text-slate-900">{l.producto}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 px-2.5 py-2">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <Hash className="h-2.5 w-2.5" /> Cantidad
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-800">
                {l.cantidad || '—'}
                {l.unidad ? <span className="ml-1 text-xs font-medium text-slate-500">{l.unidad}</span> : null}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2.5 py-2">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <Boxes className="h-2.5 w-2.5" /> Presentación
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">{l.presentacion || '—'}</p>
            </div>
          </div>
          {l.fecha && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Calendar className="h-3 w-3" />
              Confirmado: {l.fecha}
            </p>
          )}
        </div>
      </div>
    </div>
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
