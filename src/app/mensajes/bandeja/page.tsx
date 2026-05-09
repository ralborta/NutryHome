'use client';

import Link from 'next/link';
import { Inbox, MessageCircle } from 'lucide-react';
import { DEMO_THREADS } from '@/lib/mensajesDemo';

/** Lista de conversaciones; el detalle con transcripción extensa está en /mensajes/conversacion/[id]. */
export default function MensajesBandejaPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Inbox className="h-5 w-5 text-slate-400" />
        <h2 className="text-lg font-bold text-[#0f172a]">Bandeja</h2>
      </div>

      <div className="rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="border-b border-[#eef2f6] px-5 py-4">
          <p className="text-sm text-slate-600">
            Datos de demostración. Al integrar Builderbot, cada fila será un hilo real; al hacer clic abrís la
            transcripción completa del chat.
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {DEMO_THREADS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/mensajes/conversacion/${t.id}`}
                className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-slate-50/90 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                    <MessageCircle className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{t.contacto}</p>
                    <p className="truncate text-xs text-slate-500">{t.telefono}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.ultimoPreview}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      t.direccion === 'outbound'
                        ? 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-600/15'
                        : 'bg-teal-50 text-teal-900 ring-1 ring-teal-600/15'
                    }`}
                  >
                    {t.direccion === 'outbound' ? 'Saliente' : 'Entrante'}
                  </span>
                  <span className="text-xs tabular-nums text-slate-500">
                    {new Date(t.ultimoEn).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
