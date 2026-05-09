'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import DashboardKpiCards from '@/components/dashboard/DashboardKpiCards';
import DashboardCallsEvolution from '@/components/dashboard/DashboardCallsEvolution';
import DashboardOperationalStatus from '@/components/dashboard/DashboardOperationalStatus';
import DashboardPatientDonut from '@/components/dashboard/DashboardPatientDonut';
import DashboardCallsTable from '@/components/dashboard/DashboardCallsTable';
import { buildDashboardPayload, type DashboardConversation } from '@/lib/dashboardMetrics';

/** Serie últimos 7 días para gráficos cuando no hay datos aún */
function fallbackSeries7d(): Array<{ dateKey: string; label: string; llamadas: number }> {
  const out: Array<{ dateKey: string; label: string; llamadas: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      dateKey: dk,
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      llamadas: 0,
    });
  }
  return out;
}

type ApiPayload = {
  conversations?: DashboardConversation[];
  dashboard?: ReturnType<typeof buildDashboardPayload>;
  error?: string;
  warning?: string;
  configured?: boolean;
};

export default function DashboardPage() {
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/estadisticas-isabela', { cache: 'no-store' });
      const json = (await res.json()) as ApiPayload;
      if (!res.ok) {
        setData({
          error: (json as { error?: string }).error || 'Error al cargar',
          conversations: [],
          dashboard: json.dashboard ?? buildDashboardPayload([]),
        });
        return;
      }
      setData(json);
    } catch {
      setData({
        error: 'Error de red',
        conversations: [],
        dashboard: buildDashboardPayload([]),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setMounted(true);
    setCurrentDate(
      new Date().toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );
  }, []);

  const conversations = data?.conversations ?? [];
  const dashboard =
    data?.dashboard != null
      ? data.dashboard
      : buildDashboardPayload(conversations);

  const kpis = dashboard.kpis;
  const series7d = dashboard.series7d.length > 0 ? dashboard.series7d : fallbackSeries7d();
  const weekTrendPct = dashboard.weekTrendPct;
  const operational = dashboard.operational;
  const donut = dashboard.donut;
  const donutTotal = dashboard.donutTotal;

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-[#e8ecf1] bg-white px-6 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#0f172a]">Dashboard</h1>
            <p className="mt-1.5 text-[15px] text-slate-600">
              Centro operativo de llamadas y seguimiento de pacientes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm capitalize text-slate-600">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span suppressHydrationWarning>{mounted ? currentDate : '…'}</span>
            </div>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-6">
        {data?.warning && (
          <div className="rounded-[14px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            {data.warning}
            {data?.configured === false ? (
              <span className="mt-1 block text-xs text-sky-800">
                Archivo{' '}
                <code className="rounded bg-white/80 px-1">.env.local</code> en la raíz del proyecto:{' '}
                <code className="rounded bg-white/80 px-1">ELEVENLABS_API_KEY</code>,{' '}
                <code className="rounded bg-white/80 px-1">ELEVENLABS_AGENT_ID</code>
              </span>
            ) : null}
          </div>
        )}
        {data?.error && (
          <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {data.error}
          </div>
        )}

        <DashboardKpiCards items={kpis} loading={loading} />

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8 xl:col-span-6">
            <DashboardCallsEvolution series={series7d} weekTrendPct={weekTrendPct} loading={loading} />
          </div>
          <div className="lg:col-span-4 xl:col-span-3">
            <DashboardOperationalStatus rows={operational} loading={loading} />
          </div>
          <div className="lg:col-span-12 xl:col-span-3">
            <DashboardPatientDonut data={donut} total={donutTotal} loading={loading} />
          </div>
        </div>

        <DashboardCallsTable conversations={conversations} loading={loading} />
      </div>
    </div>
  );
}
