'use client';

import { useEffect, useState } from 'react';
import { Calendar, MessageSquare } from 'lucide-react';
import MensajesSubNav from '@/components/mensajes/MensajesSubNav';

export default function MensajesLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(
      new Date().toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    );
  }, []);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-[#e8ecf1] bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
                <MessageSquare className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#0f172a]">Mensajes</h1>
                <p className="mt-1.5 max-w-2xl text-[15px] text-slate-600">
                  WhatsApp (Builderbot): campañas salientes preparadas para conversación entrante cuando el contacto
                  responde. Misma línea visual que el resto de NutriHome.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm capitalize text-slate-600">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span suppressHydrationWarning>{mounted ? currentDate : '…'}</span>
            </div>
          </div>
        </div>
        <MensajesSubNav />
      </header>

      <div className="p-6">{children}</div>
    </div>
  );
}
