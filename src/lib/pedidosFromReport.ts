/**
 * Agrupa filas del reporte de productos por paciente.
 */

export type ReportRow = Record<string, unknown>;

export type PedidoLinea = {
  producto: string;
  cantidad: string;
  unidad?: string;
  presentacion?: string;
  fecha: string;
};

export type PedidoPaciente = {
  key: string;
  nombre_paciente: string;
  nombre_contacto: string;
  telefono: string;
  domicilio: string;
  localidad: string;
  delegacion: string;
  ultimaFecha: string;
  resumen: string;
  lineas: PedidoLinea[];
};

function str(v: unknown): string {
  return v != null ? String(v).trim() : '';
}

function patientKey(row: ReportRow): string {
  const tel = str(row.telefono);
  const nombre = str(row.nombre_paciente).toLowerCase();
  return tel || nombre || 'sin-identificar';
}

export function agruparPedidosPorPaciente(rows: ReportRow[]): PedidoPaciente[] {
  const map = new Map<string, PedidoPaciente>();

  rows.forEach((row) => {
    const key = patientKey(row);
    const existing = map.get(key) ?? {
      key,
      nombre_paciente: str(row.nombre_paciente) || 'Sin identificar',
      nombre_contacto: str(row.nombre_contacto),
      telefono: str(row.telefono),
      domicilio: str(row.domicilio_actual),
      localidad: str(row.localidad),
      delegacion: str(row.delegacion),
      ultimaFecha: str(row.fecha_llamada),
      resumen: str(row.summary),
      lineas: [],
    };

    if (str(row.fecha_llamada) >= existing.ultimaFecha) {
      existing.ultimaFecha = str(row.fecha_llamada);
      if (str(row.summary)) existing.resumen = str(row.summary);
    }

    for (let i = 1; i <= 5; i++) {
      const producto = str(row[`producto${i}`]);
      if (!producto) continue;
      const cantidad = str(row[`cantidad${i}`]);
      const unidad = str(row[`unidad_cantidad${i}`]);
      const presentacion = str(row[`presentacion${i}`]);
      const fecha = str(row.fecha_llamada);
      const dup = existing.lineas.some(
        (l) => l.producto === producto && l.cantidad === cantidad && l.fecha === fecha,
      );
      if (!dup) {
        existing.lineas.push({ producto, cantidad, unidad, presentacion, fecha });
      }
    }

    map.set(key, existing);
  });

  return Array.from(map.values())
    .filter((p) => p.lineas.length > 0 || p.nombre_paciente !== 'Sin identificar')
    .sort((a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha));
}

export function filtrarPedidos(pedidos: PedidoPaciente[], query: string): PedidoPaciente[] {
  const q = query.trim().toLowerCase();
  if (!q) return pedidos;
  return pedidos.filter(
    (p) =>
      p.nombre_paciente.toLowerCase().includes(q) ||
      p.telefono.includes(q) ||
      p.localidad.toLowerCase().includes(q) ||
      p.lineas.some((l) => l.producto.toLowerCase().includes(q)),
  );
}
