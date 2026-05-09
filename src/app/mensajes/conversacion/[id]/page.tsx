'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, User, Phone } from 'lucide-react';
import { getThreadById } from '@/lib/mensajesDemo';

/** Detalle de un hilo con transcripción extensa (scroll). */
export default function MensajesConversacionPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const thread = useMemo(() => getThreadById(id), [id]);

  if (!thread) {
    return (
      <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-5 py-8 text-center text-amber-900">
        <p className="font-medium">No se encontró la conversación.</p>
        <Link href="/mensajes/bandeja" className="mt-3 inline-block text-sm font-semibold text-sky-700 hover:underline">
          Volver a la bandeja
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/mensajes/bandeja"
        className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Bandeja
      </Link>

      <div className="rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="border-b border-[#eef2f6] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-600 text-lg font-bold text-white shadow-md">
                {thread.contacto.slice(0, 1)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0f172a]">{thread.contacto}</h2>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {thread.telefono}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4 text-slate-400" />
                    Estado: {thread.estado}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      thread.direccion === 'outbound'
                        ? 'bg-indigo-50 text-indigo-800'
                        : 'bg-teal-50 text-teal-900'
                    }`}
                  >
                    {thread.direccion === 'outbound' ? 'Saliente' : 'Entrante'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Transcripción</h3>
          <div className="mt-3 max-h-[min(70vh,520px)] overflow-y-auto rounded-[12px] border border-slate-200/90 bg-[#fafbfc] px-4 py-4">
            <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-slate-800">
              {thread.transcript}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
