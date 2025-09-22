import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  try {
    const candidates = [
      process.env.NEXT_PUBLIC_API_URL,
      process.env.BACKEND_URL,
      'https://nutryhome-production.up.railway.app',
      'https://nutryhome-backend-production.up.railway.app',
    ].filter(Boolean) as string[];

    let lastError: any = null;
    for (const base of candidates) {
      try {
        const url = `${base.replace(/\/$/, '')}/api/reports/productos`;
        const resp = await fetch(url, { headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
        if (!resp.ok) {
          lastError = { status: resp.status, text: await resp.text().catch(() => '') };
          continue;
        }
        const buf = await resp.arrayBuffer();
        return new NextResponse(buf, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="reporte_productos_${new Date().toISOString().split('T')[0]}.xlsx"`,
          },
        });
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    return NextResponse.json({ error: 'No se pudo contactar al backend', detail: String(lastError) }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}


