'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, Play, Pause, Plus, ArrowRight } from 'lucide-react';

type BatchRow = {
  id: string;
  nombre: string;
  total: number;
  enviados: number;
  fallidos: number;
  estado: 'borrador' | 'programado' | 'en_curso' | 'completado' | 'pausado';
  creado: string;
};

const DEMO_BATCHES: BatchRow[] = [
  {
    id: 'msg-batch-1',
    nombre: 'Confirmación entrega — septiembre',
    total: 120,
    enviados: 118,
    fallidos: 2,
    estado: 'completado',
    creado: '2025-09-20',
  },
  {
    id: 'msg-batch-2',
    nombre: 'Recordatorio stock KETOSTERIL',
    total: 45,
    enviados: 12,
    fallidos: 0,
    estado: 'en_curso',
    creado: '2025-09-26',
  },
];

function badge(estado: BatchRow['estado']) {
  const map: Record<BatchRow['estado'], string> = {
    borrador: 'bg-slate-100 text-slate-700 ring-slate-400/20',
    programado: 'bg-sky-50 text-sky-900 ring-sky-600/20',
    en_curso: 'bg-amber-50 text-amber-900 ring-amber-600/20',
    completado: 'bg-emerald-50 text-emerald-900 ring-emerald-600/20',
    pausado: 'bg-violet-50 text-violet-900 ring-violet-500/25',
  };
  const labels: Record<BatchRow['estado'], string> = {
    borrador: 'Borrador',
    programado: 'Programado',
    en_curso: 'En curso',
    completado: 'Completado',
    pausado: 'Pausado',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${map[estado]}`}
    >
      {labels[estado]}
    </span>
  );
}

/** Gestión y ejecución de lotes de mensajes (paralelo conceptual a campañas de llamadas). */
export default function MensajesBatchesPage() {
  const [tab, setTab] = useState<'outbound' | 'inbound'>('outbound');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-bold text-[#0f172a]">Lotes y ejecución</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('outbound')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'outbound'
                ? 'bg-[#2563eb] text-white shadow-sm'
                : 'border border-transparent bg-[#f1f5f9] text-slate-600 hover:bg-slate-200'
            }`}
          >
            Outbound
          </button>
          <button
            type="button"
            onClick={() => setTab('inbound')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'inbound'
                ? 'bg-[#2563eb] text-white shadow-sm'
                : 'border border-transparent bg-[#f1f5f9] text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inbound / respuestas
          </button>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-[#eef2f6] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {tab === 'outbound'
              ? 'Colas de envío masivo y seguimiento por lote (integración Builderbot pendiente).'
              : 'Vista de conversaciones iniciadas por el contacto; enlazadas a la misma bandeja.'}
          </p>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white opacity-50 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nuevo lote
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#eef2f6] bg-[#fafbfc] text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <th className="whitespace-nowrap px-5 py-3">Lote</th>
                <th className="whitespace-nowrap px-5 py-3">Estado</th>
                <th className="whitespace-nowrap px-5 py-3">Progreso</th>
                <th className="whitespace-nowrap px-5 py-3">Creado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tab === 'outbound' ? (
                DEMO_BATCHES.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{b.nombre}</p>
                      <p className="text-xs text-slate-500">ID: {b.id}</p>
                    </td>
                    <td className="px-5 py-3.5">{badge(b.estado)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-700">
                      {b.enviados}/{b.total}
                      {b.fallidos > 0 ? (
                        <span className="ml-2 text-rose-600">({b.fallidos} error)</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{b.creado}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                          title="Pausar"
                          aria-label="Pausar"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                          title="Reanudar"
                          aria-label="Reanudar"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    Las respuestas entrantes aparecerán agrupadas por campaña cuando conectemos webhooks. Por ahora
                    usá la{' '}
                    <Link href="/mensajes/bandeja" className="font-semibold text-sky-600 hover:text-sky-800">
                      Bandeja
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 p-4 text-right">
          <Link
            href="/calls/campanas"
            className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-800"
          >
            Referencia campañas de llamadas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
