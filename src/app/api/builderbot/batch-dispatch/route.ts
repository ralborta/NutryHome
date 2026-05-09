import { NextRequest, NextResponse } from 'next/server';
import { isBatchDispatchPayload, type BatchDispatchPayload } from '@/lib/builderbot/batchDispatchTypes';

export const dynamic = 'force-dynamic';

const SECRET_HEADER = 'x-nutryhome-dispatch-secret';

function verifySecret(req: NextRequest): boolean {
  const expected = process.env.WHATSAPP_BATCH_DISPATCH_SECRET?.trim();
  if (!expected) {
    console.warn('[builderbot/batch-dispatch] WHATSAPP_BATCH_DISPATCH_SECRET no definida: se acepta el POST sin firma (solo para desarrollo).');
    return true;
  }
  const got = req.headers.get(SECRET_HEADER)?.trim();
  return got === expected;
}

/**
 * Entrada del despacho de lotes WhatsApp desde Railway.
 * Acá podés enganchar n8n, una cola, o llamadas HTTP a Builderbot cuando tengas token/API de envío.
 */
export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  if (!isBatchDispatchPayload(body)) {
    return NextResponse.json(
      { ok: false, error: 'Payload inválido: se espera channel WHATSAPP, batchId, batchName, recipients[].' },
      { status: 400 },
    );
  }

  const payload = body as BatchDispatchPayload;
  const projectId = payload.meta?.builderbotProjectId || process.env.BUILDERBOT_PROJECT_ID;

  console.log('[builderbot/batch-dispatch] recibido', {
    batchId: payload.batchId,
    batchName: payload.batchName,
    recipients: payload.recipients.length,
    builderbotProjectId: projectId ?? null,
  });

  // Punto de extensión: reenviar a cola interna, SQS, o API Builderbot/Meta cuando esté cableado.
  return NextResponse.json({
    ok: true,
    accepted: payload.recipients.length,
    batchId: payload.batchId,
    builderbotProjectId: projectId ?? null,
    message:
      'Lote aceptado. Implementá envío real (Meta / Builderbot) en este handler o delegá a n8n con el mismo JSON.',
  });
}
