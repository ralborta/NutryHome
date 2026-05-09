/**
 * Payload que envía Railway (`executeBatchWhatsApp`) al endpoint de despacho (Next u otro).
 * Mismas `variables` por contacto que ElevenLabs (strings).
 */
export type BatchDispatchRecipient = {
  phone_number: string;
  variables: Record<string, string>;
  contactId?: string;
};

export type BatchDispatchPayload = {
  channel: 'WHATSAPP';
  batchId: string;
  batchName: string;
  recipients: BatchDispatchRecipient[];
  meta?: {
    builderbotProjectId?: string | null;
  };
};

export function isBatchDispatchPayload(x: unknown): x is BatchDispatchPayload {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.channel !== 'WHATSAPP') return false;
  if (typeof o.batchId !== 'string' || !o.batchId) return false;
  if (typeof o.batchName !== 'string') return false;
  if (!Array.isArray(o.recipients)) return false;
  for (const r of o.recipients) {
    if (!r || typeof r !== 'object') return false;
    const row = r as Record<string, unknown>;
    if (typeof row.phone_number !== 'string' || !row.phone_number) return false;
    if (!row.variables || typeof row.variables !== 'object') return false;
  }
  return true;
}
