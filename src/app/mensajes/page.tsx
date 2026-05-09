'use client';

import { MessageSquare } from 'lucide-react';

/** Bandeja y gestión de mensajes (WhatsApp / canales): pantalla en construcción. */
export default function MensajesPage() {
  return (
    <div className="min-h-full bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25">
          <MessageSquare className="h-6 w-6" strokeWidth={2} />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Mensajes</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          Este módulo será independiente de la gestión de llamadas (historial operativo, Isabela, etc.). Acá irá la
          bandeja de mensajes, plantillas y lo que definan para NutriHome.
        </p>
        <p className="mt-4 inline-flex rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
          En desarrollo: cuando tengas la primera versión, reemplazamos este placeholder.
        </p>
      </div>
    </div>
  );
}
