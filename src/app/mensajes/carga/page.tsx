'use client';

import { Upload, FileSpreadsheet, Info } from 'lucide-react';
import Link from 'next/link';

/** Carga de archivos / variables para campañas de mensajes (WhatsApp). Conectará a la misma lógica de campaña que llamadas donde aplique. */
export default function MensajesCargaPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-[14px] border border-[#eef2f6] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a]">Carga de datos</h2>
            <p className="mt-1 text-sm text-slate-600">
              Excel o CSV con columnas alineadas a variables de campaña (mismo criterio que carga de llamadas donde
              compartan modelo).
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex shrink-0 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Ver carga de llamadas
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[12px] border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <Upload className="h-7 w-7 text-sky-600" strokeWidth={1.75} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-800">Arrastrá o elegí archivo</p>
            <p className="mt-1 text-xs text-slate-500">.xlsx / .xls — próximo: endpoint de campaña mensajes</p>
            <button
              type="button"
              disabled
              className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white opacity-50 shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Subir (próximamente)
            </button>
          </div>

          <div className="rounded-[12px] border border-sky-200/80 bg-sky-50/60 p-5">
            <div className="flex gap-2">
              <Info className="h-5 w-5 shrink-0 text-sky-600" strokeWidth={2} />
              <div className="text-sm leading-relaxed text-sky-950">
                <p className="font-semibold">Outbound con soporte inbound</p>
                <p className="mt-2 text-sky-900/90">
                  Los lotes salientes pueden dejar contexto y variables listas para cuando el paciente responde: la
                  misma conversación continúa en la bandeja con historial completo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
