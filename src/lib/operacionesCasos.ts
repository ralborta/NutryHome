/**
 * Casos operativos (reclamos y supervisión) — persistencia local fase 1.
 */

import { hasComplaint, hasDerivation, type DashboardConversation } from '@/lib/dashboardMetrics';

export type CasoTipo = 'reclamo' | 'supervision';
export type CasoEstado = 'pendiente' | 'en_proceso' | 'resuelto';
export type CasoOrigen = 'manual' | 'sugerido' | 'confirmado';
export type CasoSeveridad = 'critica' | 'alta' | 'media' | 'baja';

export type CasoOperativo = {
  id: string;
  tipo: CasoTipo;
  estado: CasoEstado;
  origen: CasoOrigen;
  paciente: string;
  telefono: string;
  conversationId?: string;
  titulo: string;
  detalle: string;
  resumen?: string;
  severidad: CasoSeveridad;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'nutryhome_casos_v1';

function lower(s: string | null | undefined) {
  return (s || '').toLowerCase();
}

/** Indicios de escalamiento a supervisión (además de derivación). */
export function hasSupervisionNeed(conv: DashboardConversation): boolean {
  if (hasDerivation(conv)) return true;
  const s = lower(conv.summary);
  return (
    s.includes('supervis') ||
    s.includes('escalar') ||
    s.includes('priorit') ||
    s.includes('urgent') ||
    s.includes('coordinar') ||
    s.includes('seguimiento especial')
  );
}

export function sugerirTituloReclamo(summary?: string | null): string {
  const s = lower(summary);
  if (s.includes('entrega') || s.includes('envío') || s.includes('envio')) return 'Incidencia en entrega';
  if (s.includes('factur') || s.includes('cobro')) return 'Reclamo de facturación';
  if (s.includes('calidad') || s.includes('dañad') || s.includes('mal estado')) return 'Reclamo de calidad';
  return 'Reclamo detectado en llamada';
}

export function sugerirTituloSupervision(summary?: string | null): string {
  const s = lower(summary);
  if (hasDerivation({ summary } as DashboardConversation)) return 'Derivación a especialista';
  if (s.includes('consumo')) return 'Seguimiento de consumo';
  if (s.includes('stock') || s.includes('reposición') || s.includes('reposicion')) return 'Supervisión de stock';
  return 'Escalamiento a supervisión';
}

export function inferirSeveridad(summary?: string | null, tipo?: CasoTipo): CasoSeveridad {
  const s = lower(summary);
  if (s.includes('urgent') || s.includes('crític') || s.includes('critico')) return 'critica';
  if (tipo === 'reclamo' && (s.includes('problema') || s.includes('insatisfecho'))) return 'alta';
  if (tipo === 'supervision' && s.includes('deriv')) return 'alta';
  return 'media';
}

export function loadCasos(): CasoOperativo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CasoOperativo[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCasos(casos: CasoOperativo[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(casos));
}

export function casoExists(conversationId: string | undefined, tipo: CasoTipo): boolean {
  if (!conversationId) return false;
  return loadCasos().some((c) => c.conversationId === conversationId && c.tipo === tipo);
}

export function crearCaso(input: {
  tipo: CasoTipo;
  origen: CasoOrigen;
  paciente: string;
  telefono: string;
  conversationId?: string;
  titulo: string;
  detalle: string;
  resumen?: string;
  severidad?: CasoSeveridad;
}): CasoOperativo | null {
  if (input.conversationId && casoExists(input.conversationId, input.tipo)) return null;

  const now = new Date().toISOString();
  const caso: CasoOperativo = {
    id: `caso-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipo: input.tipo,
    estado: 'pendiente',
    origen: input.origen,
    paciente: input.paciente,
    telefono: input.telefono,
    conversationId: input.conversationId,
    titulo: input.titulo,
    detalle: input.detalle,
    resumen: input.resumen,
    severidad: input.severidad ?? inferirSeveridad(input.resumen, input.tipo),
    createdAt: now,
    updatedAt: now,
  };

  const casos = loadCasos();
  casos.unshift(caso);
  saveCasos(casos);
  return caso;
}

export function actualizarEstadoCaso(id: string, estado: CasoEstado): CasoOperativo | null {
  const casos = loadCasos();
  const idx = casos.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  casos[idx] = { ...casos[idx], estado, updatedAt: new Date().toISOString() };
  saveCasos(casos);
  return casos[idx];
}

export function buildCasoFromConversation(
  conv: DashboardConversation & { conversation_id?: string; telefono_destino?: string | null },
  tipo: CasoTipo,
  origen: CasoOrigen,
): CasoOperativo | null {
  const titulo = tipo === 'reclamo' ? sugerirTituloReclamo(conv.summary) : sugerirTituloSupervision(conv.summary);
  const detalle = (conv.summary || '').trim() || 'Sin resumen disponible.';
  return crearCaso({
    tipo,
    origen,
    paciente: conv.nombre_paciente || 'Sin identificar',
    telefono: conv.telefono_destino || '',
    conversationId: conv.conversation_id,
    titulo,
    detalle,
    resumen: conv.summary ?? undefined,
    severidad: inferirSeveridad(conv.summary, tipo),
  });
}

export function sugerenciasDesdeConversacion(
  conv: DashboardConversation & { conversation_id?: string },
): { reclamo: boolean; supervision: boolean } {
  return {
    reclamo: hasComplaint(conv) && !casoExists(conv.conversation_id, 'reclamo'),
    supervision: hasSupervisionNeed(conv) && !casoExists(conv.conversation_id, 'supervision'),
  };
}
