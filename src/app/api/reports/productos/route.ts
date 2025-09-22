import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  try {
    const backend = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'https://nutryhome-production.up.railway.app';
    const url = `${backend.replace(/\/$/, '')}/api/reports/productos`;

    const resp = await fetch(url, { headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return NextResponse.json({ error: 'Backend error', status: resp.status, body: text }, { status: 502 });
    }

    const buf = await resp.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="reporte_productos_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}


