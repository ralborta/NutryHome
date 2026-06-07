'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Calendar,
  Search,
  Phone,
  MapPin,
  HeartPulse,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Package,
  type LucideIcon,
} from 'lucide-react';

type Prioridad = 'critica' | 'alta' | 'media' | 'baja';
type EstadoPaciente = 'activo' | 'seguimiento' | 'inactivo';

type Paciente = {
  id: string;
  nombre: string;
  edad: number;
  telefono: string;
  localidad: string;
  productos: string[];
  prioridad: Prioridad;
  estado: EstadoPaciente;
  ultimaLlamada: string; // ISO o ''
  totalLlamadas: number;
  adherencia: number; // % 0-100
};

/** Datos de ejemplo para mostrar el listado mientras se conecta la fuente real. */
const DEMO: Paciente[] = [
  {
    id: 'p-1', nombre: 'María González', edad: 72, telefono: '+54 9 11 3771 0010', localidad: 'CABA',
    productos: ['Nutrición enteral', 'Espesante'], prioridad: 'critica', estado: 'activo',
    ultimaLlamada: daysAgo(1), totalLlamadas: 14, adherencia: 92,
  },
  {
    id: 'p-2', nombre: 'Jorge Pereyra', edad: 65, telefono: '+54 9 11 5582 1144', localidad: 'Lanús',
    productos: ['Suplemento proteico'], prioridad: 'alta', estado: 'seguimiento',
    ultimaLlamada: daysAgo(3), totalLlamadas: 8, adherencia: 74,
  },
  {
    id: 'p-3', nombre: 'Lucía Fernández', edad: 58, telefono: '+54 9 351 410 2233', localidad: 'Córdoba',
    productos: ['Fórmula pediátrica', 'Vitaminas'], prioridad: 'media', estado: 'activo',
    ultimaLlamada: daysAgo(6), totalLlamadas: 5, adherencia: 88,
  },
  {
    id: 'p-4', nombre: 'Roberto Díaz', edad: 80, telefono: '+54 9 11 6090 7788', localidad: 'Quilmes',
    productos: ['Nutrición enteral'], prioridad: 'critica', estado: 'seguimiento',
    ultimaLlamada: daysAgo(2), totalLlamadas: 21, adherencia: 61,
  },
  {
    id: 'p-5', nombre: 'Ana Martínez', edad: 47, telefono: '+54 9 261 555 9090', localidad: 'Mendoza',
    productos: ['Suplemento proteico', 'Fibra'], prioridad: 'baja', estado: 'activo',
    ultimaLlamada: daysAgo(12), totalLlamadas: 3, adherencia: 95,
  },
  {
    id: 'p-6', nombre: 'Carlos Romero', edad: 69, telefono: '+54 9 11 4477 2200', localidad: 'San Isidro',
    productos: ['Espesante', 'Vitaminas'], prioridad: 'alta', estado: 'activo',
    ultimaLlamada: daysAgo(4), totalLlamadas: 11, adherencia: 80,
  },
  {
    id: 'p-7', nombre: 'Elena Suárez', edad: 75, telefono: '+54 9 223 612 3344', localidad: 'Mar del Plata',
    productos: ['Nutrición enteral', 'Espesante'], prioridad: 'media', estado: 'inactivo',
    ultimaLlamada: daysAgo(45), totalLlamadas: 2, adherencia: 40,
  },
  {
    id: 'p-8', nombre: 'Diego Torres', edad: 53, telefono: '+54 9 341 700 8855', localidad: 'Rosario',
    productos: ['Suplemento proteico'], prioridad: 'baja', estado: 'seguimiento',
    ultimaLlamada: daysAgo(8), totalLlamadas: 6, adherencia: 70,
  },
];

function daysAgo(d: number): string {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x.toISOString();
}

const PRIORIDAD: Record<Prioridad, { label: string; chip: string; dot: string }> = {
  critica: { label: 'Crítica', chip: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  alta: { label: 'Alta', chip: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  media: { label: 'Media', chip: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  baja: { label: 'Baja', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

const ESTADO: Record<EstadoPaciente, { label: string; chip: string }> = {
  activo: { label: 'Activo', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  seguimiento: { label: 'En seguimiento', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  inactivo: { label: 'Inactivo', chip: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function relTime(iso: string): string {
  if (!iso) return 'Sin registro';
  const diff = Math.floor((Date.now() - +new Date(iso)) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 30) return `Hace ${diff} días`;
  return `Hace ${Math.floor(diff / 30)} mes(es)`;
}

const FILTROS: { id: 'todos' | Prioridad; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'critica', label: 'Críticos' },
  { id: 'alta', label: 'Prioridad alta' },
  { id: 'media', label: 'Prioridad media' },
  { id: 'baja', label: 'Prioridad baja' },
];

/** Directorio de pacientes con clasificación, adherencia y actividad de llamadas. */
export default function PacientesPage() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<'todos' | Prioridad>('todos');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(
      new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    );
  }, []);

  const stats = useMemo(() => {
    return {
      total: DEMO.length,
      activos: DEMO.filter((p) => p.estado === 'activo').length,
      seguimiento: DEMO.filter((p) => p.estado === 'seguimiento').length,
      criticos: DEMO.filter((p) => p.prioridad === 'critica').length,
    };
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO.filter((p) => {
      const okFiltro = filtro === 'todos' ? true : p.prioridad === filtro;
      const okQuery = !q || p.nombre.toLowerCase().includes(q) || p.localidad.toLowerCase().includes(q) || p.telefono.includes(q);
      return okFiltro && okQuery;
    });
  }, [query, filtro]);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-[#e8ecf1] bg-white px-6 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md">
              <Users className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#0f172a]">Pacientes</h1>
              <p className="mt-1.5 max-w-3xl text-[15px] text-slate-600">
                Directorio de pacientes con su clasificación, adherencia al tratamiento y actividad de llamadas.
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label="Total pacientes" value={stats.total} accent="from-violet-500 to-fuchsia-600" />
          <StatCard icon={HeartPulse} label="Activos" value={stats.activos} accent="from-emerald-500 to-teal-600" />
          <StatCard icon={Activity} label="En seguimiento" value={stats.seguimiento} accent="from-sky-500 to-blue-600" />
          <StatCard icon={ShieldAlert} label="Casos críticos" value={stats.criticos} accent="from-red-500 to-rose-600" />
        </div>

        <section className="rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 border-b border-[#eef2f6] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-[#0f172a]">Listado de pacientes</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar nombre, localidad o teléfono…"
                  className="w-full rounded-[10px] border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTROS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    filtro === f.id
                      ? 'bg-[#2563eb] text-white shadow-sm'
                      : 'border border-transparent bg-[#f1f5f9] text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#eef2f6] text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                  <th className="px-5 py-3.5">Paciente</th>
                  <th className="px-5 py-3.5">Localidad</th>
                  <th className="px-5 py-3.5">Productos</th>
                  <th className="px-5 py-3.5">Clasificación</th>
                  <th className="px-5 py-3.5">Adherencia</th>
                  <th className="px-5 py-3.5">Llamadas</th>
                  <th className="px-5 py-3.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                      No se encontraron pacientes con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => {
                    const pr = PRIORIDAD[p.prioridad];
                    const es = ESTADO[p.estado];
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-xs font-bold text-white">
                              {p.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">{p.nombre}</p>
                              <p className="flex items-center gap-1 text-xs text-slate-500">
                                <Phone className="h-3 w-3" /> {p.telefono} · {p.edad} años
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {p.localidad}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {p.productos.map((prod) => (
                              <span
                                key={prod}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                              >
                                <Package className="h-3 w-3 text-slate-400" />
                                {prod}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${pr.chip}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
                            {pr.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Adherencia value={p.adherencia} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{p.totalLlamadas}</span>
                            <span className="text-xs text-slate-500">{relTime(p.ultimaLlamada)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${es.chip}`}>
                            {es.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="flex items-center gap-2 px-1 text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Datos de ejemplo para visualización. El listado se poblará con los pacientes reales al conectar la fuente de datos.
        </p>
      </div>
    </div>
  );
}

function Adherencia({ value }: { value: number }) {
  const color = value >= 85 ? 'bg-emerald-500' : value >= 65 ? 'bg-amber-500' : 'bg-red-500';
  const text = value >= 85 ? 'text-emerald-700' : value >= 65 ? 'text-amber-700' : 'text-red-700';
  return (
    <div className="w-28">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${text}`}>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-[14px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-[#0f172a]">{value}</p>
      <p className="mt-1 text-[13px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
