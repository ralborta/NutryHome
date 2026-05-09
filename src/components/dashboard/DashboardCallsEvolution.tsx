'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export type SeriesPoint = { dateKey: string; label: string; llamadas: number };

const CHART_BLUE = '#2563eb';

export default function DashboardCallsEvolution({
  series,
  weekTrendPct,
  loading,
}: {
  series: SeriesPoint[];
  weekTrendPct: number | null;
  loading: boolean;
}) {
  const data = series.length > 0 ? series : [];

  const showChart = !loading;

  return (
    <div className="rounded-[14px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#0f172a]">Evolución de Llamadas</h2>
          <p className="text-sm text-slate-500">Últimos 7 días</p>
        </div>
        {showChart && weekTrendPct !== null && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/15">
            {weekTrendPct >= 0 ? '+' : ''}
            {weekTrendPct}% vs semana anterior
          </span>
        )}
      </div>
      <div className="h-[240px] w-full">
        {!showChart ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Cargando…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillCallsNutri" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="8%" stopColor={CHART_BLUE} stopOpacity={0.22} />
                  <stop offset="92%" stopColor={CHART_BLUE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v} llamadas`, 'Total']}
                labelFormatter={(l) => `Día ${l}`}
              />
              <Area
                type="monotone"
                dataKey="llamadas"
                stroke={CHART_BLUE}
                strokeWidth={2.5}
                fill="url(#fillCallsNutri)"
                dot={{ r: 3, fill: CHART_BLUE, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {showChart && data.every((d) => d.llamadas === 0) ? (
        <p className="mt-2 text-center text-xs text-slate-500">Sin actividad registrada en estos días</p>
      ) : null}
    </div>
  );
}
