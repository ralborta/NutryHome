"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Loader2 } from "lucide-react";

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

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/reports/elevenlabs?format=json&max=200&page_size=100", { cache: "no-store" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRows(data.data || []);
      setRefreshedAt(new Date());
    } catch (e: any) {
      setError(e?.message || "Error");
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
      const res = await fetch("/api/reports/elevenlabs?format=xlsx&max=200&page_size=100", { cache: "no-store" });
      if (!res.ok) return alert("No se pudo descargar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_productos_${new Date().toISOString().split("T")[0]}.xlsx`;
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
        nombre_contacto: r.nombre_contacto || "",
        nombre_paciente: r.nombre_paciente || "",
        domicilio_actual: r.domicilio_actual || "",
        localidad: r.localidad || "",
        delegacion: r.delegacion || "",
        fecha_llamada: r.fecha_llamada || "",
      };
      for (let i = 1; i <= 5; i++) {
        const producto = r[`producto${i}`];
        if (!producto) continue;
        out.push({
          ...base,
          producto,
          cantidad: r[`cantidad${i}`] ?? "",
          unidad_cantidad: r[`unidad_cantidad${i}`] ?? "",
          presentacion: r[`presentacion${i}`] ?? "",
          unidades_por_empaque: r[`unidades_por_empaque${i}`] ?? "",
          cantidad_normalizada_unidades: r[`cantidad_normalizada_unidades${i}`] ?? "",
          dosis: r[`dosis${i}`] ?? "",
          dosis_unidad: r[`dosis_unidad${i}`] ?? "",
        });
      }
      // Garantizar al menos una fila aunque no haya productos
      if (!out.length) {
        out.push({ ...base, producto: "", cantidad: "" });
      }
    });
    return out;
  }, [rows]);

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Reporte de Productos (Isabela)</h1>
            <p className="text-sm text-gray-500">Listado por producto, sobrio y moderno</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onRefresh} variant="outline" disabled={refreshing || loading}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refrescar
            </Button>
            <Button onClick={downloadXlsx} disabled={downloading || loading}>
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Descargar Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  {[
                    "Paciente",
                    "Contacto",
                    "Producto",
                    "Cantidad",
                    "Unidad",
                    "Presentación",
                    "u/Empaque",
                    "Cant. Normalizada",
                    "Dosis",
                    "Fecha",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productRows.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 border-b">{r.nombre_paciente}</td>
                    <td className="px-3 py-2 border-b">{r.nombre_contacto}</td>
                    <td className="px-3 py-2 border-b">{r.producto}</td>
                    <td className="px-3 py-2 border-b">{r.cantidad}</td>
                    <td className="px-3 py-2 border-b">{r.unidad_cantidad || ""}</td>
                    <td className="px-3 py-2 border-b">{r.presentacion || ""}</td>
                    <td className="px-3 py-2 border-b">{r.unidades_por_empaque || ""}</td>
                    <td className="px-3 py-2 border-b">{r.cantidad_normalizada_unidades || ""}</td>
                    <td className="px-3 py-2 border-b">{r.dosis ? `${r.dosis}${r.dosis_unidad ? ` ${r.dosis_unidad}` : ""}` : ""}</td>
                    <td className="px-3 py-2 border-b whitespace-nowrap">{r.fecha_llamada}</td>
                  </tr>
                ))}
                {productRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-gray-500">
                      Sin datos para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500">
          {refreshedAt && (
            <span>Actualizado: {refreshedAt.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}


