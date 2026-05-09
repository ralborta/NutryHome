'use client';

import {
  Phone,
  Clock,
  Timer,
  AlertTriangle,
  Users,
  Target,
  MoreHorizontal,
} from 'lucide-react';

export type KpiItem = {
  key: string;
  title: string;
  value: string;
  sublabel: string;
  trendUp: boolean | null;
};

type KpiStyle = {
  Icon: typeof Phone;
  box: string;
  iconClass: string;
};

const kpiStyles: Record<string, KpiStyle> = {
  total: { Icon: Phone, box: 'bg-sky-100', iconClass: 'text-sky-600' },
  time: { Icon: Clock, box: 'bg-emerald-100', iconClass: 'text-emerald-600' },
  avg: { Icon: Timer, box: 'bg-violet-100', iconClass: 'text-violet-600' },
  complaints: { Icon: Users, box: 'bg-rose-100', iconClass: 'text-rose-600' },
  deriv: { Icon: AlertTriangle, box: 'bg-amber-100', iconClass: 'text-amber-700' },
  eff: { Icon: Target, box: 'bg-teal-100', iconClass: 'text-teal-600' },
};

/** Más reclamos/derivaciones suele ser peor → sube el % en rojo */
function isInvertedKpi(key: string) {
  return key === 'complaints' || key === 'deriv';
}

function trendDisplay(k: KpiItem): { symbol: string; line: string } {
  const raw = k.sublabel.trim();
  if (raw.startsWith('=')) return { symbol: '=', line: raw };
  if (k.trendUp === true) {
    return { symbol: '↑', line: raw.replace(/^\++\s*/, '') };
  }
  if (k.trendUp === false) {
    return { symbol: '↓', line: raw.replace(/^-+/, '') };
  }
  return { symbol: '', line: raw };
}

function trendClass(k: KpiItem): string {
  if (k.trendUp === null) return 'text-slate-500';
  const inv = isInvertedKpi(k.key);
  const good = inv ? !k.trendUp : k.trendUp;
  if (good) return 'text-emerald-600';
  return 'text-rose-600';
}

export default function DashboardKpiCards({ items, loading }: { items: KpiItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[108px] animate-pulse rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((k) => {
        const style = kpiStyles[k.key] ?? kpiStyles.total;
        const { Icon } = style;
        const { symbol, line } = trendDisplay(k);
        const rowText =
          symbol === '=' ? line : symbol ? `${symbol} ${line}` : line;

        return (
          <div
            key={k.key}
            className="rounded-[14px] border border-[#eef2f6] bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.box}`}
                >
                  <Icon className={`h-[18px] w-[18px] ${style.iconClass}`} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1 pt-px">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{k.title}</p>
                  <p className="mt-0.5 text-lg font-bold leading-snug tracking-tight text-[#0f172a]">{k.value}</p>
                </div>
              </div>
              <button
                type="button"
                className="-mr-0.5 -mt-0.5 shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Más opciones"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <p className={`mt-2 text-[11px] font-semibold leading-tight ${trendClass(k)}`}>{rowText}</p>
          </div>
        );
      })}
    </div>
  );
}
