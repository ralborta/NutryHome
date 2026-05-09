'use client';

import { useMemo, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { buildTableRows, type DashboardConversation, type TableRow } from '@/lib/dashboardMetrics';

type Tab = 'todas' | 'exitosas' | 'sin_respuesta' | 'reclamos' | 'derivadas';

export default function DashboardCallsTable({
  conversations,
  loading,
}: {
  conversations: DashboardConversation[];
  loading: boolean;
}) {
  const [tab, setTab] = useState<Tab>('todas');

  const rows = useMemo(() => buildTableRows(conversations, 80), [conversations]);

  const filtered = useMemo(() => {
    if (tab === 'todas') return rows;
    if (tab === 'exitosas') return rows.filter((r) => r.status === 'exitosa');
    if (tab === 'sin_respuesta') return rows.filter((r) => r.status === 'sin_respuesta');
    if (tab === 'reclamos') return rows.filter((r) => r.status === 'reclamo');
    return rows.filter((r) => r.status === 'derivada');
  }, [rows, tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'exitosas', label: 'Exitosas' },
    { id: 'sin_respuesta', label: 'Sin respuesta' },
    { id: 'reclamos', label: 'Reclamos' },
    { id: 'derivadas', label: 'Derivadas' },
  ];

  const badge = (r: TableRow) => {
    const map: Record<TableRow['status'], { t: string; c: string }> = {
      exitosa: { t: 'Exitosa', c: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20' },
      sin_respuesta: { t: 'Sin respuesta', c: 'bg-sky-50 text-sky-800 ring-sky-600/20' },
      reclamo: { t: 'Reclamo', c: 'bg-rose-50 text-rose-800 ring-rose-600/20' },
      derivada: { t: 'Derivada', c: 'bg-violet-50 text-violet-900 ring-violet-500/25' },
    };
    const x = map[r.status];
    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${x.c}`}>
        {x.t}
      </span>
    );
  };

  return (
    <div className="rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 border-b border-[#eef2f6] p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-[#0f172a]">Últimas Llamadas</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-[#2563eb] text-white shadow-sm'
                  : 'border border-transparent bg-[#f1f5f9] text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Filtros
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#eef2f6] bg-[#fafbfc] text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
              <th className="whitespace-nowrap px-4 py-3">Paciente</th>
              <th className="whitespace-nowrap px-4 py-3">Estado</th>
              <th className="whitespace-nowrap px-4 py-3">Duración</th>
              <th className="min-w-[140px] px-4 py-3">Resultado</th>
              <th className="whitespace-nowrap px-4 py-3">Reclamo</th>
              <th className="min-w-[120px] px-4 py-3">Próxima acción</th>
              <th className="whitespace-nowrap px-4 py-3">Fecha y hora</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  Cargando datos reales…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  No hay llamadas en este filtro.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-xs font-bold text-white">
                        {r.patient.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{r.patient}</p>
                        <p className="text-xs text-slate-500">ID: {r.patientShortId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{badge(r)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{r.durationLabel}</td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-600">{r.resultado}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{r.reclamo ? 'Sí' : 'No'}</td>
                  <td className="max-w-[160px] px-4 py-3 text-slate-600">{r.nextAction}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.whenLabel}</td>
                  <td className="px-2 py-3 text-slate-400">
                    <button type="button" className="rounded p-1 hover:bg-slate-100" aria-label="Más">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 p-4 text-right">
        <Link href="/calls" className="text-sm font-semibold text-sky-600 hover:text-sky-800">
          Ver todas las llamadas →
        </Link>
      </div>
    </div>
  );
}
