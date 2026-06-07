'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  LineChart as LineChartIcon,
  Calendar,
  Phone,
  PhoneOff,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  PhoneMissed,
  Smile,
  Meh,
  Frown,
  type LucideIcon,
} from 'lucide-react';

type Periodo = '7d' | '30d';

const CHART_BLUE = '#2563eb';

/** Genera una serie diaria de ejemplo, determinística por cantidad de días. */
function buildSerie(days: number) {
  const out: { label: string; llamadas: number; atendidas: number; duracion: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const base = 40 + Math.round(35 * Math.abs(Math.sin((i + 3) * 1.1)));
    const atendidas = Math.round(base * (0.6 + 0.18 * Math.abs(Math.cos(i * 0.9))));
    out.push({
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      llamadas: base,
      atendidas,
      duracion: 150 + Math.round(80 * Math.abs(Math.sin(i * 0.7))),
    });
  }
  return out;
}

const HOURLY = [
  { h: '08', llamadas: 12 },
  { h: '09', llamadas: 34 },
  { h: '10', llamadas: 58 },
  { h: '11', llamadas: 71 },
  { h: '12', llamadas: 49 },
  { h: '13', llamadas: 28 },
  { h: '14', llamadas: 44 },
  { h: '15', llamadas: 67 },
  { h: '16', llamadas: 73 },
  { h: '17', llamadas: 52 },
  { h: '18', llamadas: 31 },
  { h: '19', llamadas: 14 },
];

const RESULTADOS = [
  { name: 'Atendidas', value: 612, color: '#10b981' },
  { name: 'No contesta', value: 188, color: '#f59e0b' },
  { name: 'Buzón de voz', value: 96, color: '#6366f1' },
  { name: 'Ocupado', value: 54, color: '#f43f5e' },
  { name: 'Nº inválido', value: 22, color: '#94a3b8' },
];

const MOTIVOS = [
  { motivo: 'Verificación de stock', pct: 38, count: 372 },
  { motivo: 'Confirmación de pedido', pct: 24, count: 235 },
  { motivo: 'Recordatorio de entrega', pct: 16, count: 157 },
  { motivo: 'Seguimiento de consumo', pct: 13, count: 127 },
  { motivo: 'Reclamos', pct: 9, count: 88 },
];

const SENTIMIENTO = [
  { label: 'Positivo', value: 64, icon: Smile, color: 'text-emerald-600', bar: 'bg-emerald-500' },
  { label: 'Neutral', value: 27, icon: Meh, color: 'text-amber-600', bar: 'bg-amber-500' },
  { label: 'Negativo', value: 9, icon: Frown, color: 'text-red-600', bar: 'bg-red-500' },
];

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('7d');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(
      new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    );
  }, []);

  const serie = useMemo(() => buildSerie(periodo === '7d' ? 7 : 30), [periodo]);

  const kpis = useMemo(() => {
    const totalLlamadas = serie.reduce((a, b) => a + b.llamadas, 0);
    const totalAtendidas = serie.reduce((a, b) => a + b.atendidas, 0);
    const answerRate = totalLlamadas ? Math.round((totalAtendidas / totalLlamadas) * 100) : 0;
    const aht = Math.round(serie.reduce((a, b) => a + b.duracion, 0) / serie.length);
    return { totalLlamadas, totalAtendidas, answerRate, aht };
  }, [serie]);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-[#e8ecf1] bg-white px-6 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md">
              <LineChartIcon className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#0f172a]">Analytics de Llamadas</h1>
              <p className="mt-1.5 max-w-3xl text-[15px] text-slate-600">
                Indicadores operativos del call center: volumen, contactabilidad, duración y resultados.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden items-center gap-2 text-sm capitalize text-slate-600 sm:flex">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span suppressHydrationWarning>{mounted ? currentDate : '…'}</span>
            </div>
            <div className="flex rounded-[10px] border border-slate-200 bg-white p-1 shadow-sm">
              {(['7d', '30d'] as Periodo[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  className={`rounded-[7px] px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    periodo === p ? 'bg-[#2563eb] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p === '7d' ? 'Últimos 7 días' : 'Últimos 30 días'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={Phone} label="Llamadas totales" value={kpis.totalLlamadas.toLocaleString('es-AR')} accent="from-blue-500 to-cyan-600" trend={+12} />
          <KpiCard icon={CheckCircle2} label="Tasa de contacto" value={`${kpis.answerRate}%`} accent="from-emerald-500 to-teal-600" trend={+4} />
          <KpiCard icon={Clock} label="Duración promedio" value={`${Math.floor(kpis.aht / 60)}m ${kpis.aht % 60}s`} accent="from-violet-500 to-fuchsia-600" trend={-6} invert />
          <KpiCard icon={PhoneMissed} label="Llamadas sin contacto" value={(kpis.totalLlamadas - kpis.totalAtendidas).toLocaleString('es-AR')} accent="from-amber-500 to-orange-600" trend={-3} invert />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Panel title="Volumen de llamadas" subtitle="Llamadas realizadas vs. atendidas">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serie} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="8%" stopColor={CHART_BLUE} stopOpacity={0.2} />
                        <stop offset="92%" stopColor={CHART_BLUE} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="fillAt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="8%" stopColor="#10b981" stopOpacity={0.18} />
                        <stop offset="92%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Area type="monotone" dataKey="llamadas" name="Realizadas" stroke={CHART_BLUE} strokeWidth={2.5} fill="url(#fillTotal)" dot={false} />
                    <Area type="monotone" dataKey="atendidas" name="Atendidas" stroke="#10b981" strokeWidth={2.5} fill="url(#fillAt)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <Legend items={[{ label: 'Realizadas', color: CHART_BLUE }, { label: 'Atendidas', color: '#10b981' }]} />
            </Panel>
          </div>

          <Panel title="Resultado de llamadas" subtitle="Distribución por estado final">
            <div className="relative mx-auto h-[230px] w-full max-w-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={RESULTADOS} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={56} outerRadius={80} paddingAngle={2}>
                    {RESULTADOS.map((e, i) => (
                      <Cell key={i} fill={e.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-2xl font-bold leading-none text-[#0f172a]">
                  {RESULTADOS.reduce((a, b) => a + b.value, 0).toLocaleString('es-AR')}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 border-t border-[#eef2f6] pt-4 text-[13px] text-slate-700">
              {RESULTADOS.map((d) => {
                const total = RESULTADOS.reduce((a, b) => a + b.value, 0);
                const pct = ((d.value / total) * 100).toFixed(1);
                return (
                  <li key={d.name} className="flex justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-slate-900">
                      {d.value} <span className="text-slate-500">({pct}%)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Panel title="Llamadas por franja horaria" subtitle="Identificá los picos de actividad del día">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={HOURLY} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                    <XAxis dataKey="h" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(v: number) => [`${v} llamadas`, 'Volumen']}
                      labelFormatter={(l) => `${l}:00 hs`}
                    />
                    <Bar dataKey="llamadas" fill={CHART_BLUE} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel title="Sentimiento de conversación" subtitle="Tono detectado en las llamadas">
            <div className="space-y-5 py-2">
              {SENTIMIENTO.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className={`flex items-center gap-2 font-semibold ${s.color}`}>
                        <Icon className="h-4 w-4" />
                        {s.label}
                      </span>
                      <span className="font-bold text-slate-800">{s.value}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${s.value}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 border-t border-[#eef2f6] pt-4 text-xs text-slate-500">
              Análisis automático del tono de las conversaciones para priorizar seguimientos.
            </p>
          </Panel>
        </div>

        <Panel title="Principales motivos de llamada" subtitle="Distribución por tipo de gestión">
          <ul className="space-y-4 py-1">
            {MOTIVOS.map((m, i) => (
              <li key={m.motivo}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5 font-medium text-slate-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">
                      {i + 1}
                    </span>
                    {m.motivo}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {m.count} <span className="text-slate-400">· {m.pct}%</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${m.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <p className="flex items-center gap-2 px-1 text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Datos de ejemplo para visualización. Los indicadores se calcularán con las llamadas reales al conectar la fuente.
        </p>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#0f172a]">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[#eef2f6] pt-3 text-xs text-slate-600">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  trend,
  invert,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  trend: number;
  invert?: boolean;
}) {
  const positive = invert ? trend < 0 : trend > 0;
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-[14px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
            positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          <TrendIcon className="h-3 w-3" />
          {trend > 0 ? '+' : ''}
          {trend}%
        </span>
      </div>
      <p className="mt-4 text-[28px] font-bold leading-none tracking-tight text-[#0f172a]">{value}</p>
      <p className="mt-2 text-[13px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
