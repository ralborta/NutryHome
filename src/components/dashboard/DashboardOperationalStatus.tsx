'use client';

import { AlertCircle, Clock, PhoneMissed, PackageSearch } from 'lucide-react';

export type OpRow = {
  key: string;
  label: string;
  count: number;
  tone: 'red' | 'amber' | 'blue' | 'emerald';
};

const toneStyles: Record<
  OpRow['tone'],
  { bg: string; icon: string; Icon: typeof AlertCircle }
> = {
  red: { bg: 'bg-rose-50', icon: 'text-rose-600', Icon: AlertCircle },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', Icon: Clock },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', Icon: PhoneMissed },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', Icon: PackageSearch },
};

export default function DashboardOperationalStatus({ rows, loading }: { rows: OpRow[]; loading: boolean }) {
  return (
    <div className="rounded-[14px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <h2 className="text-lg font-bold text-[#0f172a]">Estado Operativo</h2>
      <p className="text-sm text-slate-500">Resumen en tiempo real</p>
      <ul className="mt-4 space-y-2.5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="h-[52px] animate-pulse rounded-[10px] bg-slate-100" />
            ))
          : rows.map((r) => {
              const t = toneStyles[r.tone];
              const Icon = t.Icon;
              return (
                <li
                  key={r.key}
                  className="flex items-center justify-between rounded-[10px] border border-[#eef2f6] bg-[#fafbfc] px-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${t.bg}`}>
                      <Icon className={`h-[18px] w-[18px] ${t.icon}`} strokeWidth={2} />
                    </span>
                    <span className="truncate text-sm font-medium text-slate-800">{r.label}</span>
                  </div>
                  <span className="shrink-0 text-xl font-bold tabular-nums text-[#0f172a]">{r.count}</span>
                </li>
              );
            })}
      </ul>
    </div>
  );
}
