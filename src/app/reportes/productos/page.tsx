'use client';

import { useEffect, useState } from 'react';

export default function ReporteProductosPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/reports/elevenlabs?format=json&max=200&page_size=100');
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        setRows(data.data || []);
      } catch (e: any) {
        setError(e?.message || 'Error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const downloadXlsx = async () => {
    const res = await fetch('/api/reports/elevenlabs?format=xlsx&max=200&page_size=100');
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
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Reporte de Productos (Isabela)</h1>
        <button onClick={downloadXlsx} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Descargar Excel</button>
      </div>
      {loading && <div>Cargando…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                {['Paciente','Contacto','Producto1','Cantidad1','Producto2','Cantidad2','Fecha'].map(h => (
                  <th key={h} className="text-left px-3 py-2 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2 border-b">{r.nombre_paciente}</td>
                  <td className="px-3 py-2 border-b">{r.nombre_contacto}</td>
                  <td className="px-3 py-2 border-b">{r.producto1}</td>
                  <td className="px-3 py-2 border-b">{r.cantidad1}</td>
                  <td className="px-3 py-2 border-b">{r.producto2}</td>
                  <td className="px-3 py-2 border-b">{r.cantidad2}</td>
                  <td className="px-3 py-2 border-b">{r.fecha_llamada}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


