'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Copy, Check, Webhook, Phone, MessageSquare, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';
  return raw.replace(/\/$/, '');
}

function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [done, setDone] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setDone(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  }, [value]);

  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <code className="mt-1.5 block break-all text-[13px] font-medium text-slate-900">{value}</code>
          {hint ? <p className="mt-2 text-xs text-slate-600">{hint}</p> : null}
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          title="Copiar"
          aria-label={`Copiar ${label}`}
        >
          {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/** Registro y documentación de URLs de webhooks (ElevenLabs, WhatsApp / Builderbot). */
export default function CallbacksPage() {
  const apiBase = useMemo(() => getApiBase(), []);
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

  const urls = useMemo(
    () => ({
      elevenUnified: `${apiBase}/api/webhooks/elevenlabs`,
      elevenPostCall: `${apiBase}/api/elevenlabs/webhooks/post-call`,
      whatsapp: `${apiBase}/api/webhooks/whatsapp`,
      builderbot: `${apiBase}/api/webhooks/builderbot`,
    }),
    [apiBase],
  );

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-[#e8ecf1] bg-white px-6 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <Webhook className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#0f172a]">Callbacks</h1>
              <p className="mt-1.5 max-w-3xl text-[15px] text-slate-600">
                URLs públicas que debés registrar en ElevenLabs, Meta (WhatsApp) o Builderbot. Los eventos llegan al
                backend (Railway); el front solo centraliza la referencia y copia. Las llamadas suelen generar muchos
                eventos; los mensajes, menos, pero el canal tiene que estar listo igual.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm capitalize text-slate-600">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <span suppressHydrationWarning>{mounted ? currentDate : '…'}</span>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-6">
        <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="flex gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Base de API</p>
              <p className="mt-1 text-amber-900/90">
                Se usa <code className="rounded bg-white/80 px-1">NEXT_PUBLIC_API_URL</code> si está definida; si no,
                el fallback es Railway. Verificá que coincida con el servidor donde están montados los endpoints
                reales.
              </p>
              <p className="mt-2 font-mono text-xs text-amber-900/80">{apiBase}</p>
            </div>
          </div>
        </div>

        <section className="rounded-[14px] border border-[#eef2f6] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#eef2f6] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
              <Phone className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0f172a]">Llamadas (ElevenLabs)</h2>
              <p className="text-sm text-slate-600">
                Post-conversación / post-llamada: alta frecuencia. Registrá <strong>una</strong> URL canónica en el
                panel del agente y alineá el backend.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <CopyField
              label="Webhook con verificación de firma (recomendado en docs)"
              value={urls.elevenUnified}
              hint="Variable típica: ELEVENLABS_WEBHOOK_SECRET — ver SETUP.md y backend /api/webhooks/elevenlabs."
            />
            <CopyField
              label="Alternativa post-call (si tu despliegue usa esta ruta)"
              value={urls.elevenPostCall}
              hint="Existe en backend como /api/elevenlabs/webhooks/post-call. Evitá tener dos destinos sin coordinar."
            />
            <p className="text-xs text-slate-500">
              En el dashboard de ElevenLabs (Conversational AI), configurá la URL de webhook y el mismo secreto que
              validás en el servidor.
            </p>
          </div>
        </section>

        <section className="rounded-[14px] border border-[#eef2f6] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#eef2f6] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <MessageSquare className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0f172a]">Mensajes (WhatsApp / Builderbot)</h2>
              <p className="text-sm text-slate-600">
                Menos frecuente que las llamadas, pero necesitás la misma capacidad: estado de envíos, respuestas
                entrantes, opt-in, errores de plantilla. Las rutas siguientes son <strong>plantilla</strong> hasta que
                implementemos los handlers.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <CopyField
              label="WhatsApp Cloud API (Meta) — webhook genérico"
              value={urls.whatsapp}
              hint="Meta envía verificación GET y eventos POST; requiere token de verificación y app secret en env."
            />
            <CopyField
              label="Builderbot (si expone webhook propio)"
              value={urls.builderbot}
              hint="Algunos flujos delegan en Builderbot; unificá en un solo pipeline si podés para no duplicar lógica."
            />
            <p className="text-xs text-slate-500">
              Cuando existan los route handlers, devolvé 200 rápido y procesá de forma idempotente (IDs de mensaje /
              conversación).
            </p>
          </div>
        </section>

        <section className="rounded-[14px] border border-sky-200/80 bg-sky-50/50 px-4 py-4 text-sm text-sky-950">
          <p className="font-semibold">Checklist rápido</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sky-900/90">
            <li>HTTPS público accesible desde internet (no localhost) para proveedores.</li>
            <li>Secreto compartido o firma validada en servidor antes de persistir.</li>
            <li>Un solo contrato por canal para no divergir DB y dashboards.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
