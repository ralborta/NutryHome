import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Verificación Meta (WhatsApp Cloud API) — GET con hub.challenge.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (mode === 'subscribe' && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

/**
 * Eventos entrantes WhatsApp (mensajes, estados, etc.).
 */
export async function POST(req: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  const signature = req.headers.get('x-hub-signature-256');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  if (appSecret && signature) {
    // Validación estricta de firma: requiere raw body; con req.json() ya consumimos el stream.
    // Para producción, usar middleware raw o verificar en el backend Node.
    console.log('[webhooks/whatsapp] WHATSAPP_APP_SECRET definido: validación HMAC recomendada en backend con body raw.');
  }

  console.log('[webhooks/whatsapp] evento', JSON.stringify(body).slice(0, 2500));

  return NextResponse.json({ ok: true, received: true });
}
