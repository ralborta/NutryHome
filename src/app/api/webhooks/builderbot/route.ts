import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function verifyBuilderbotWebhook(req: NextRequest): boolean {
  const secret = process.env.BUILDERBOT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn('[webhooks/builderbot] BUILDERBOT_WEBHOOK_SECRET no definida: se acepta el POST (solo desarrollo).');
    return true;
  }
  const token =
    req.headers.get('x-builderbot-signature')?.trim() ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    req.headers.get('x-webhook-secret')?.trim();
  return token === secret;
}

/**
 * Webhook genérico Builderbot → NutriHome.
 * Ajustá el cuerpo según lo que envíe tu despliegue (eventos, mensajes, estado).
 */
export async function POST(req: NextRequest) {
  if (!verifyBuilderbotWebhook(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  console.log('[webhooks/builderbot] evento recibido', JSON.stringify(body).slice(0, 2000));

  return NextResponse.json({ ok: true, received: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    path: '/api/webhooks/builderbot',
    method: 'POST para eventos',
  });
}
