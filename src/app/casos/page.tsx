'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Calendar,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Phone,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { hasComplaint, type DashboardConversation } from '@/lib/dashboardMetrics';
import {
  actualizarEstadoCaso,
  buildCasoFromConversation,
  hasSupervisionNeed,
  loadCasos,
  type CasoEstado,
  type CasoOperativo,
  type CasoTipo,
} from '@/lib/operacionesCasos';

type Tab = 'reclamos' | 'supervision';

type Conv = DashboardConversation & { conversation_id?: string; telefono_destino?: string | null };

const ESTADO_STYLES: Record<CasoEstado, string> = {
  pendiente: 'bg-amber-50 text-amber-800 border-amber-200',
  en_proceso: 'bg-sky-50 text-sky-700 border-sky-200',
  resuelto: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const SEV_STYLES: Record<string, string> = {
  critica: 'bg-red-50 text-red-700',
  alta: 'bg-orange-50 text-orange-700',
  media: 'bg-amber-50 text-amber-800',
  baja: 'bg-slate-100 text-slate-600',
};

export default function CasosPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;

  const [tab, setTab] = useState<Tab>(tabParam === 'supervision' ? 'supervision' : 'reclamos');
  const [casos, setCasos] = useState<CasoOperativo[]>([]);
  const [sugerencias, setSugerencias] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(
      new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    );
  }, []);

  useEffect(() => {
    if (tabParam === 'reclamos' || tabParam === 'supervision') setTab(tabParam);
  }, [tabParam]);

  const refreshCasos = useCallback(() => setCasos(loadCasos()), []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      refreshCasos();
      const res = await fetch('/api/estadisticas-isabela', { cache: 'no-store' });
      const json = await res.json();
      const convs: Conv[] = json.conversations ?? [];
      const idsRegistrados = new Set(loadCasos().map((c) => c.conversationId).filter(Boolean));
      const sug = convs.filter((c) => {
        if (!c.conversation_id || idsRegistrados.has(c.conversation_id)) return false;
        if (hasComplaint(c)) return true;
        if (hasSupervisionNeed(c)) return true;
        return false;
      });
      setSugerencias(sug);
    } catch {
      toast.error('No se pudieron cargar las sugerencias');
    } finally {
      setLoading(false);
    }
  }, [refreshCasos]);

  useEffect(() => {
    load();
  }, [load]);

  const casosFiltrados = useMemo(() => {
    const tipo: CasoTipo = tab === 'reclamos' ? 'reclamo' : 'supervision';
    const q = query.trim().toLowerCase();
    return casos
      .filter((c) => c.tipo === tipo)
      .filter(
        (c) =>
          !q ||
          c.paciente.toLowerCase().includes(q) ||
          c.titulo.toLowerCase().includes(q) ||
          c.detalle.toLowerCase().includes(q),
      );
  }, [casos, tab, query]);

  const sugerenciasTab = useMemo(() => {
    return sugerencias.filter((c) => (tab === 'reclamos' ? hasComplaint(c) : hasSupervisionNeed(c)));
  }, [sugerencias, tab]);

  const stats = useMemo(() => {
    const reclamos = casos.filter((c) => c.tipo === 'reclamo' && c.estado !== 'resuelto');
    const supervision = casos.filter((c) => c.tipo === 'supervision' && c.estado !== 'resuelto');
    return {
      reclamos: reclamos.length,
      supervision: supervision.length,
      sugerencias: sugerencias.length,
    };
  }, [casos, sugerencias]);

  const confirmarSugerencia = (conv: Conv, tipo: CasoTipo) => {
    const caso = buildCasoFromConversation(conv, tipo, 'confirmado');
    if (!caso) {
      toast.error('Este caso ya fue registrado');
      return;
    }
    toast.success(tipo === 'reclamo' ? 'Reclamo confirmado' : 'Caso de supervisión registrado');
    refreshCasos();
    setSugerencias((prev) => prev.filter((s) => s.conversation_id !== conv.conversation_id));
  };

  const cambiarEstado = (id: string, estado: CasoEstado) => {
    actualizarEstadoCaso(id, estado);
    refreshCasos();
    toast.success('Estado actualizado');
  };

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-[#e8ecf1] bg-white px-6 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md">
              <ClipboardList className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#0f172a]">Casos</h1>
              <p className="mt-1.5 max-w-3xl text-[15px] text-slate-600">
                Gestión de reclamos y escalamientos a supervisión detectados en las llamadas.
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard icon={AlertTriangle} label="Reclamos abiertos" value={stats.reclamos} accent="from-red-500 to-rose-600" />
          <StatCard icon={ShieldAlert} label="Supervisión pendiente" value={stats.supervision} accent="from-violet-500 to-indigo-600" />
          <StatCard icon={Clock} label="Sugerencias sin confirmar" value={stats.sugerencias} accent="from-amber-500 to-orange-600" />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'reclamos' as Tab, label: 'Reclamos', icon: AlertTriangle },
              { id: 'supervision' as Tab, label: 'Supervisión', icon: ShieldAlert },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === id ? 'bg-[#2563eb] text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {sugerenciasTab.length > 0 && (
          <section className="rounded-[14px] border border-amber-200/80 bg-amber-50/50 p-5">
            <p className="text-sm font-bold text-amber-950">Sugerencias desde llamadas recientes</p>
            <p className="mt-1 text-xs text-amber-900/80">Detectadas por el resumen. Confirmá para agregarlas a la bandeja.</p>
            <ul className="mt-4 space-y-2">
              {sugerenciasTab.slice(0, 5).map((conv) => (
                <li
                  key={conv.conversation_id}
                  className="flex flex-col gap-2 rounded-[10px] border border-amber-200/60 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{conv.nombre_paciente || 'Sin identificar'}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{conv.summary || 'Sin resumen'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      confirmarSugerencia(conv, tab === 'reclamos' ? 'reclamo' : 'supervision')
                    }
                    className="shrink-0 rounded-[8px] bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Confirmar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 border-b border-[#eef2f6] p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-[#0f172a]">
              {tab === 'reclamos' ? 'Bandeja de reclamos' : 'Bandeja de supervisión'}
            </h2>
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

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-20 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : casosFiltrados.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">
              No hay casos en esta bandeja. Registrá uno desde el menú de una llamada o confirmá una sugerencia.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {casosFiltrados.map((c) => (
                <li key={c.id} className="px-5 py-4 transition-colors hover:bg-slate-50/70">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-800">{c.titulo}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEV_STYLES[c.severidad]}`}>
                          {c.severidad}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ESTADO_STYLES[c.estado]}`}>
                          {c.estado.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{c.detalle}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="font-medium text-slate-500">{c.paciente}</span>
                        {c.telefono && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {c.telefono}
                          </span>
                        )}
                        <span>{new Date(c.createdAt).toLocaleDateString('es-AR')}</span>
                        <span className="capitalize text-slate-400">Origen: {c.origen}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {c.estado === 'pendiente' && (
                        <button
                          type="button"
                          onClick={() => cambiarEstado(c.id, 'en_proceso')}
                          className="rounded-[8px] border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                        >
                          En proceso
                        </button>
                      )}
                      {c.estado !== 'resuelto' && (
                        <button
                          type="button"
                          onClick={() => cambiarEstado(c.id, 'resuelto')}
                          className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Resolver
                        </button>
                      )}
                      <Link
                        href="/calls"
                        className="inline-flex items-center gap-1 rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Llamadas <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="flex items-center gap-2 px-1 text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Los casos se guardan en este navegador. En una próxima fase se persistirán en el servidor.
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
