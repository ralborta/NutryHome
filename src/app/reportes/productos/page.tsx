'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  RefreshCw,
  Loader2,
  FileBarChart,
  Calendar,
  Search,
  Package,
  Users,
  ListChecks,
  MapPin,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

type ApiRow = Record<string, any>;

type ProductRow = {
  nombre_contacto: string;
  nombre_paciente: string;
  domicilio_actual: string;
  localidad: string;
  delegacion: string;
  fecha_llamada: string;
  producto: string;
  cantidad: string;
  unidad_cantidad?: string;
  presentacion?: string;
  unidades_por_empaque?: string | number;
  cantidad_normalizada_unidades?: string | number;
  dosis?: string | number;
  dosis_unidad?: string;
};

export default function ReporteProductosPage() {
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(
      new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    );
  }, []);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch('/api/reports/elevenlabs?format=json&max=200&page_size=100', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRows(data.data || []);
      setRefreshedAt(new Date());
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const downloadXlsx = async () => {
    try {
      setDownloading(true);
      const res = await fetch('/api/reports/elevenlabs?format=xlsx&max=200&page_size=100', { cache: 'no-store' });
      if (!res.ok) return alert('No se pudo descargar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_productos_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } finally {
      setDownloading(false);
    }
  };

  const productRows: ProductRow[] = useMemo(() => {
    const out: ProductRow[] = [];
    rows.forEach((r) => {
      const base = {
        nombre_contacto: r.nombre_contacto || '',
        nombre_paciente: r.nombre_paciente || '',
        domicilio_actual: r.domicilio_actual || '',
        localidad: r.localidad || '',
        delegacion: r.delegacion || '',
        fecha_llamada: r.fecha_llamada || '',
      };
      for (let i = 1; i <= 5; i++) {
        const producto = r[`producto${i}`];
        if (!producto) continue;
        out.push({
          ...base,
          producto,
          cantidad: r[`cantidad${i}`] ?? '',
          unidad_cantidad: r[`unidad_cantidad${i}`] ?? '',
          presentacion: r[`presentacion${i}`] ?? '',
          unidades_por_empaque: r[`unidades_por_empaque${i}`] ?? '',
          cantidad_normalizada_unidades: r[`cantidad_normalizada_unidades${i}`] ?? '',
          dosis: r[`dosis${i}`] ?? '',
          dosis_unidad: r[`dosis_unidad${i}`] ?? '',
        });
      }
      if (!out.length) {
        out.push({ ...base, producto: '', cantidad: '' });
      }
    });
    return out;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return productRows;
    return productRows.filter(
      (r) =>
        r.nombre_paciente.toLowerCase().includes(q) ||
        r.nombre_contacto.toLowerCase().includes(q) ||
        r.producto.toLowerCase().includes(q) ||
        r.localidad.toLowerCase().includes(q),
    );
  }, [productRows, query]);

  const stats = useMemo(() => {
    const conProducto = productRows.filter((r) => r.producto);
    const pacientes = new Set(productRows.map((r) => r.nombre_paciente).filter(Boolean));
    const productos = new Set(conProducto.map((r) => r.producto.toLowerCase()));
    const localidades = new Set(productRows.map((r) => r.localidad).filter(Boolean));
    return {
      registros: conProducto.length,
      pacientes: pacientes.size,
      productos: productos.size,
      localidades: localidades.size,
    };
  }, [productRows]);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-[#e8ecf1] bg-white px-6 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-md">
              <FileBarChart className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#0f172a]">Reporte de Productos</h1>
              <p className="mt-1.5 max-w-3xl text-[15px] text-slate-600">
                Productos y cantidades detectados en las conversaciones, listos para exportar.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden items-center gap-2 text-sm capitalize text-slate-600 sm:flex">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span suppressHydrationWarning>{mounted ? currentDate : '…'}</span>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refrescar
            </button>
            <button
              type="button"
              onClick={downloadXlsx}
              disabled={downloading || loading}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Descargar Excel
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-6">
        {error && (
          <div className="flex items-center gap-2 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={ListChecks} label="Registros de productos" value={stats.registros} accent="from-blue-500 to-cyan-600" loading={loading} />
          <StatCard icon={Users} label="Pacientes" value={stats.pacientes} accent="from-violet-500 to-fuchsia-600" loading={loading} />
          <StatCard icon={Package} label="Productos distintos" value={stats.productos} accent="from-emerald-500 to-teal-600" loading={loading} />
          <StatCard icon={MapPin} label="Localidades" value={stats.localidades} accent="from-amber-500 to-orange-600" loading={loading} />
        </div>

        <section className="rounded-[14px] border border-[#eef2f6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 border-b border-[#eef2f6] p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-[#0f172a]">Detalle por producto</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar paciente, producto o localidad…"
                className="w-full rounded-[10px] border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-20 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eef2f6] text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                    {['Paciente', 'Contacto', 'Producto', 'Cantidad', 'Presentación', 'Cant. norm.', 'Dosis', 'Localidad', 'Fecha'].map(
                      (h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3.5">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                        {productRows.length === 0 ? 'Sin datos para mostrar.' : 'No hay resultados para la búsqueda.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, i) => (
                      <tr key={i} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{r.nombre_paciente || '—'}</td>
                        <td className="px-4 py-3.5 text-slate-600">{r.nombre_contacto || '—'}</td>
                        <td className="px-4 py-3.5">
                          {r.producto ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              <Package className="h-3 w-3" />
                              {r.producto}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {r.cantidad}
                          {r.unidad_cantidad ? ` ${r.unidad_cantidad}` : ''}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{r.presentacion || '—'}</td>
                        <td className="px-4 py-3.5 text-slate-600">{r.cantidad_normalizada_unidades || '—'}</td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {r.dosis ? `${r.dosis}${r.dosis_unidad ? ` ${r.dosis_unidad}` : ''}` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{r.localidad || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">{r.fecha_llamada || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#eef2f6] px-5 py-3 text-xs text-slate-400">
            <span>
              {filteredRows.length} {filteredRows.length === 1 ? 'fila' : 'filas'}
            </span>
            {refreshedAt && <span suppressHydrationWarning>Actualizado: {refreshedAt.toLocaleString('es-AR')}</span>}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-[#0f172a]">
        {loading ? <span className="text-slate-300">—</span> : value}
      </p>
      <p className="mt-1 text-[13px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
