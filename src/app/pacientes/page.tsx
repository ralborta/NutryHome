'use client';

import { Users } from 'lucide-react';

/** Directorio y ficha de pacientes: pantalla en construcción (distinta a llamadas). */
export default function PacientesPage() {
  return (
    <div className="min-h-full bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25">
          <Users className="h-6 w-6" strokeWidth={2} />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Pacientes</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          Acá vivirá el módulo de pacientes (listado, búsqueda, historial clínico/comercial que definan). No duplica la
          pantalla de gestión de llamadas; son flujos distintos.
        </p>
        <p className="mt-4 inline-flex rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
          En desarrollo: conectamos esta ruta cuando avance el diseño y las APIs.
        </p>
      </div>
    </div>
  );
}
