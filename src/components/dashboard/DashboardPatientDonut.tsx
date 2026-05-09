'use client';

import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export type DonutSlice = { name: string; value: number; color: string };

const EMPTY_RING = [{ name: 'Sin datos', value: 1 }];

export default function DashboardPatientDonut({
  data,
  total,
  loading,
}: {
  data: DonutSlice[];
  total: number;
  loading: boolean;
}) {
  const chartData = data.filter((d) => d.value > 0);
  const hasSlices = chartData.length > 0 && total > 0;

  return (
    <div className="rounded-[14px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[#0f172a]">Distribución de Pacientes</h2>
          <p className="text-sm text-slate-500">Por estado (datos de conversaciones)</p>
        </div>
        <Link
          href="/estadisticas-isabela"
          className="shrink-0 rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Ver detalle
        </Link>
      </div>
      <div className="relative mx-auto h-[240px] w-full max-w-[280px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Cargando…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={hasSlices ? chartData : EMPTY_RING}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={78}
                paddingAngle={hasSlices ? 2 : 0}
              >
                {hasSlices
                  ? chartData.map((e, i) => (
                      <Cell key={`c-${i}`} fill={e.color} stroke="#fff" strokeWidth={2} />
                    ))
                  : <Cell fill="#e2e8f0" stroke="#fff" strokeWidth={2} />}
              </Pie>
              <Tooltip
                formatter={(v: number, n: string) => (hasSlices ? [`${v}`, n] : ['0', 'Conversaciones'])}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        {!loading && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-2xl font-bold leading-none text-[#0f172a]">{total}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
          </div>
        )}
      </div>
      {!loading && data.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-[#eef2f6] pt-4 text-[13px] text-slate-700">
          {data.map((d) => {
            const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
            return (
              <li key={d.name} className="flex justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="shrink-0 tabular-nums font-medium text-slate-900">
                  {d.value} <span className="text-slate-500">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <Link
        href="/calls"
        className="mt-5 block w-full rounded-[10px] bg-[#2563eb] py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        Ver pacientes
      </Link>
    </div>
  );
}
