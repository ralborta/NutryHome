/**
 * Métricas del dashboard NutriHome a partir de conversaciones ElevenLabs (datos reales).
 */

export type DashboardConversation = {
  conversation_id?: string;
  start_time_unix_secs?: number;
  call_duration_secs?: number;
  call_successful?: string;
  status?: string;
  summary?: string | null;
  evaluation_data?: Record<string, unknown>;
  nombre_paciente?: string;
  telefono_destino?: string | null;
  message_count?: number;
};

function lower(s: string | null | undefined) {
  return (s || '').toLowerCase();
}

export function hasComplaint(conv: DashboardConversation): boolean {
  const summary = lower(conv.summary);
  const evaluationData = conv.evaluation_data || {};
  const hasInSummary =
    summary.includes('reclamo') ||
    summary.includes('queja') ||
    summary.includes('complaint') ||
    summary.includes('insatisfecho') ||
    summary.includes('problema') ||
    summary.includes('malestar');
  const hasInEvaluation = Object.values(evaluationData).some((criteria: unknown) => {
    if (!criteria || typeof criteria !== 'object') return false;
    const c = criteria as { rationale?: string; result?: string };
    const r = lower(c.rationale);
    const res = lower(c.result);
    return r.includes('reclamo') || r.includes('queja') || res.includes('reclamo');
  });
  return hasInSummary || hasInEvaluation;
}

export function hasDerivation(conv: DashboardConversation): boolean {
  const summary = lower(conv.summary);
  const evaluationData = conv.evaluation_data || {};
  const hasInSummary =
    summary.includes('derivar') ||
    summary.includes('derivación') ||
    summary.includes('derivado') ||
    summary.includes('referir') ||
    summary.includes('especialista');
  const hasInEvaluation = Object.values(evaluationData).some((criteria: unknown) => {
    if (!criteria || typeof criteria !== 'object') return false;
    const c = criteria as { rationale?: string; result?: string };
    const r = lower(c.rationale);
    const res = lower(c.result);
    return r.includes('derivar') || r.includes('derivación') || res.includes('derivar');
  });
  return hasInSummary || hasInEvaluation;
}

export function isCallSuccessful(conv: DashboardConversation): boolean {
  if (conv.call_successful === 'true') return true;
  if (conv.call_successful === 'false') return false;
  const st = lower(conv.status);
  if (st === 'failed') return false;
  if (st === 'completed' || st === 'done') return true;
  return false;
}

export function isNoAnswer(conv: DashboardConversation): boolean {
  const st = lower(conv.status);
  if (st === 'failed') return true;
  if (conv.call_successful === 'false') return true;
  const dur = conv.call_duration_secs ?? 0;
  const msgs = conv.message_count ?? 0;
  if (dur <= 5 && msgs <= 2) return true;
  return false;
}

export function hasStockReviewMention(conv: DashboardConversation): boolean {
  const s = lower(conv.summary);
  return (
    s.includes('stock') ||
    s.includes('inventario') ||
    s.includes('verific') ||
    (s.includes('producto') && (s.includes('pedido') || s.includes('envío') || s.includes('envio')))
  );
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function ymdLocal(unixSecs: number | undefined): string | null {
  if (!unixSecs) return null;
  const d = new Date(unixSecs * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatSecs(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}m ${s}s`;
}

function formatTotalMinutes(totalSecs: number): string {
  const totalMin = Math.round(totalSecs / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function pctChange(current: number, previous: number): { text: string; up: boolean | null } {
  if (previous === 0) {
    if (current === 0) return { text: '= 0%', up: null };
    return { text: `+${current}`, up: true };
  }
  const raw = ((current - previous) / previous) * 100;
  const rounded = Math.round(raw * 10) / 10;
  if (Math.abs(rounded) < 0.05) return { text: '= 0%', up: null };
  const sign = rounded > 0 ? '+' : '';
  return { text: `${sign}${rounded}%`, up: rounded > 0 ? true : rounded < 0 ? false : null };
}

export type DashboardPayload = {
  kpis: Array<{
    key: string;
    title: string;
    value: string;
    sublabel: string;
    trendUp: boolean | null;
  }>;
  series7d: Array<{ dateKey: string; label: string; llamadas: number }>;
  weekTrendPct: number | null;
  operational: Array<{
    key: string;
    label: string;
    count: number;
    tone: 'red' | 'amber' | 'blue' | 'emerald';
  }>;
  donut: Array<{ name: string; value: number; color: string }>;
  donutTotal: number;
};

/** Colores alineados al mockup NutriHome (donut). */
const DONUT_COLORS = {
  seguimiento: '#3b82f6',
  reclamo: '#9333ea',
  pendiente: '#eab308',
  derivado: '#14b8a6',
};

export function buildDashboardPayload(conversations: DashboardConversation[]): DashboardPayload {
  const list = [...conversations].filter((c) => c.start_time_unix_secs || c.conversation_id);

  const totalCalls = list.length;
  const totalSecs = list.reduce((a, c) => a + (c.call_duration_secs || 0), 0);
  const avgSecs = totalCalls > 0 ? totalSecs / totalCalls : 0;
  const successfulN = list.filter(isCallSuccessful).length;
  const efficiency = totalCalls > 0 ? Math.round((successfulN / totalCalls) * 100) : 0;
  const complaintsN = list.filter(hasComplaint).length;
  const derivationsN = list.filter(hasDerivation).length;

  const now = new Date();
  const today = startOfLocalDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(yesterday);
  dayBefore.setDate(dayBefore.getDate() - 1);

  const yToday = ymdLocal(Math.floor(today.getTime() / 1000));
  const yYesterday = ymdLocal(Math.floor(yesterday.getTime() / 1000));
  const yBefore = ymdLocal(Math.floor(dayBefore.getTime() / 1000));

  const countOnDay = (ymd: string | null) => {
    if (!ymd) return 0;
    return list.filter((c) => ymdLocal(c.start_time_unix_secs) === ymd).length;
  };

  const cToday = countOnDay(yToday);
  const cYesterday = countOnDay(yYesterday);
  const cBefore = countOnDay(yBefore);

  const totalTimeYesterday = list
    .filter((c) => ymdLocal(c.start_time_unix_secs) === yYesterday)
    .reduce((a, c) => a + (c.call_duration_secs || 0), 0);
  const totalTimeBefore = list
    .filter((c) => ymdLocal(c.start_time_unix_secs) === yBefore)
    .reduce((a, c) => a + (c.call_duration_secs || 0), 0);

  const avgYesterday =
    cYesterday > 0
      ? list
          .filter((c) => ymdLocal(c.start_time_unix_secs) === yYesterday)
          .reduce((a, c) => a + (c.call_duration_secs || 0), 0) / cYesterday
      : 0;
  const avgBefore =
    cBefore > 0
      ? list
          .filter((c) => ymdLocal(c.start_time_unix_secs) === yBefore)
          .reduce((a, c) => a + (c.call_duration_secs || 0), 0) / cBefore
      : 0;

  const complaintsYesterday = list.filter((c) => ymdLocal(c.start_time_unix_secs) === yYesterday && hasComplaint(c)).length;
  const complaintsBefore = list.filter((c) => ymdLocal(c.start_time_unix_secs) === yBefore && hasComplaint(c)).length;

  const derivYesterday = list.filter((c) => ymdLocal(c.start_time_unix_secs) === yYesterday && hasDerivation(c)).length;
  const derivBefore = list.filter((c) => ymdLocal(c.start_time_unix_secs) === yBefore && hasDerivation(c)).length;

  const succYesterday = list.filter((c) => ymdLocal(c.start_time_unix_secs) === yYesterday && isCallSuccessful(c)).length;
  const succBefore = list.filter((c) => ymdLocal(c.start_time_unix_secs) === yBefore && isCallSuccessful(c)).length;
  const effYesterday = cYesterday > 0 ? Math.round((succYesterday / cYesterday) * 100) : 0;
  const effBefore = cBefore > 0 ? Math.round((succBefore / cBefore) * 100) : 0;

  const tCalls = pctChange(cYesterday, cBefore);
  const tTime = pctChange(totalTimeYesterday, totalTimeBefore);
  const tAvg = pctChange(avgYesterday, avgBefore);
  const tCompl = pctChange(complaintsYesterday, complaintsBefore);
  const tDeriv = pctChange(derivYesterday, derivBefore);
  const tEff = pctChange(effYesterday, effBefore);

  const kpis: DashboardPayload['kpis'] = [
    {
      key: 'total',
      title: 'Total de Llamadas',
      value: String(totalCalls),
      sublabel: `${tCalls.text} vs ayer`,
      trendUp: tCalls.up,
    },
    {
      key: 'time',
      title: 'Tiempo Total',
      value: formatTotalMinutes(totalSecs),
      sublabel: `${tTime.text} vs ayer`,
      trendUp: tTime.up,
    },
    {
      key: 'avg',
      title: 'Duración Promedio',
      value: formatSecs(avgSecs),
      sublabel: `${tAvg.text} vs ayer`,
      trendUp: tAvg.up,
    },
    {
      key: 'complaints',
      title: 'Reclamos',
      value: String(complaintsN),
      sublabel: `${tCompl.text} vs ayer`,
      trendUp: tCompl.up,
    },
    {
      key: 'deriv',
      title: 'Derivaciones',
      value: String(derivationsN),
      sublabel: `${tDeriv.text} vs ayer`,
      trendUp: tDeriv.up,
    },
    {
      key: 'eff',
      title: 'Eficiencia',
      value: `${efficiency}%`,
      sublabel: `${tEff.text} vs ayer`,
      trendUp: tEff.up,
    },
  ];

  const series7d: DashboardPayload['series7d'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = ymdLocal(Math.floor(d.getTime() / 1000));
    if (!key) continue;
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const llamadas = list.filter((c) => ymdLocal(c.start_time_unix_secs) === key).length;
    series7d.push({ dateKey: key, label, llamadas });
  }

  const thisWeek = series7d.reduce((a, b) => a + b.llamadas, 0);
  let prevWeek = 0;
  for (let i = 7; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = ymdLocal(Math.floor(d.getTime() / 1000));
    if (key) prevWeek += list.filter((c) => ymdLocal(c.start_time_unix_secs) === key).length;
  }
  let weekTrendPct: number | null = null;
  if (prevWeek > 0) weekTrendPct = Math.round(((thisWeek - prevWeek) / prevWeek) * 1000) / 10;

  const noAnswerN = list.filter(isNoAnswer).length;
  const stockN = list.filter((c) => isCallSuccessful(c) && hasStockReviewMention(c)).length;

  const operational: DashboardPayload['operational'] = [
    { key: 'c1', label: 'Reclamos detectados', count: complaintsN, tone: 'red' },
    { key: 'c2', label: 'Derivaciones pendientes', count: derivationsN, tone: 'amber' },
    { key: 'c3', label: 'Llamadas sin respuesta', count: noAnswerN, tone: 'blue' },
    { key: 'c4', label: 'Revisión de stock', count: stockN, tone: 'emerald' },
  ];

  const derivados = list.filter(hasDerivation).length;
  const conReclamo = list.filter((c) => hasComplaint(c) && !hasDerivation(c)).length;
  const pendientes = list.filter(
    (c) => !hasDerivation(c) && !hasComplaint(c) && !isCallSuccessful(c)
  ).length;
  const enSeguimiento = Math.max(0, totalCalls - derivados - conReclamo - pendientes);

  const donut: DashboardPayload['donut'] = [
    { name: 'En seguimiento', value: enSeguimiento, color: DONUT_COLORS.seguimiento },
    { name: 'Con reclamo', value: conReclamo, color: DONUT_COLORS.reclamo },
    { name: 'Pendientes de contacto', value: pendientes, color: DONUT_COLORS.pendiente },
    { name: 'Derivados', value: derivados, color: DONUT_COLORS.derivado },
  ];

  return {
    kpis,
    series7d,
    weekTrendPct,
    operational,
    donut,
    donutTotal: totalCalls,
  };
}

export type TableRow = {
  id: string;
  patient: string;
  patientShortId: string;
  status: 'exitosa' | 'sin_respuesta' | 'reclamo' | 'derivada';
  durationLabel: string;
  resultado: string;
  reclamo: boolean;
  nextAction: string;
  whenLabel: string;
};

export function buildTableRows(conversations: DashboardConversation[], max = 50): TableRow[] {
  const sorted = [...conversations].sort(
    (a, b) => (b.start_time_unix_secs || 0) - (a.start_time_unix_secs || 0)
  );
  return sorted.slice(0, max).map((c, idx) => {
    const id = c.conversation_id || `row-${idx}`;
    const tail = id.replace(/[^a-zA-Z0-9]/g, '').slice(-5) || String(idx + 10000);
    let status: TableRow['status'] = 'exitosa';
    if (hasComplaint(c)) status = 'reclamo';
    else if (hasDerivation(c)) status = 'derivada';
    else if (isNoAnswer(c)) status = 'sin_respuesta';

    const dur = c.call_duration_secs ?? 0;
    const summary = (c.summary || '').trim();
    let resultado = '—';
    if (summary) resultado = summary.length > 48 ? `${summary.slice(0, 48)}…` : summary;
    else if (isCallSuccessful(c)) resultado = 'Llamada completada';
    else resultado = 'Sin resumen';

    let nextAction = '—';
    if (hasDerivation(c)) nextAction = 'Coordinar derivación';
    else if (hasComplaint(c)) nextAction = 'Seguimiento reclamo';
    else if (isCallSuccessful(c)) nextAction = 'Seguimiento rutinario';

    const when = c.start_time_unix_secs
      ? new Date(c.start_time_unix_secs * 1000)
      : null;
    const whenLabel = when
      ? when.toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

    return {
      id,
      patient: c.nombre_paciente || c.telefono_destino || 'Sin identificar',
      patientShortId: tail,
      status,
      durationLabel: formatSecs(dur),
      resultado,
      reclamo: hasComplaint(c),
      nextAction,
      whenLabel,
    };
  });
}
