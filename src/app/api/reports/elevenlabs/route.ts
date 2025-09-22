import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

function headers() {
  return { 'xi-api-key': process.env.ELEVENLABS_API_KEY || '' };
}

export async function GET(req: NextRequest) {
  try {
    const base = (process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io').replace(/\/$/, '').replace(/\/v1$/, '');
    const agentId = process.env.ELEVENLABS_AGENT_ID || '';
    if (!agentId) return NextResponse.json({ error: 'ELEVENLABS_AGENT_ID missing' }, { status: 400 });

    const format = (req.nextUrl.searchParams.get('format') || 'json').toLowerCase();
    const maxToFetch = Math.min(parseInt(req.nextUrl.searchParams.get('max') || '200'), 1000);
    const pageSize = Math.min(parseInt(req.nextUrl.searchParams.get('page_size') || '100'), 100);

    // List with pagination like Estadísticas Isabela
    let conversations: any[] = [];
    let nextPageToken: string | null = null;
    let hasMore = true;
    while (hasMore && conversations.length < maxToFetch) {
      let url = `${base}/v1/convai/conversations?agent_id=${agentId}&page_size=${pageSize}`;
      if (nextPageToken) url += `&page_token=${nextPageToken}`;
      const r = await fetch(url, { headers: headers() });
      if (!r.ok) return NextResponse.json({ error: 'List failed', status: r.status, body: await r.text() }, { status: 502 });
      const data = await r.json();
      conversations = conversations.concat(data.conversations || []);
      nextPageToken = data.next_page_token || null;
      hasMore = Boolean(nextPageToken);
    }

    // Details
    const detailed: any[] = [];
    for (const conv of conversations) {
      const cid = conv.conversation_id || conv.conversationId || conv.id;
      if (!cid) continue;
      const d = await fetch(`${base}/v1/convai/conversations/${cid}`, { headers: headers() });
      if (!d.ok) continue;
      const det = await d.json();
      detailed.push({
        conversation_id: cid,
        start_time_unix_secs: det.metadata?.start_time_unix_secs || conv.start_time_unix_secs,
        call_duration_secs: det.metadata?.call_duration_secs || det.duration || conv.call_duration_secs || 0,
        status: det.status || conv.status || 'completed',
        dynamic_variables: det.dynamic_variables || det.conversation_initiation_client_data?.dynamic_variables || {},
        transcript: det.transcript || det.analysis?.transcript || null,
        summary: det.summary || det.analysis?.transcript_summary || null
      });
    }

    // Map to rows
    const rows = detailed.map(d => {
      const v: any = d.dynamic_variables || {};
      return {
        telefono: v.phone_number || v.telefono || '',
        nombre_contacto: v.nombre_contacto || '',
        nombre_paciente: v.nombre_paciente || '',
        domicilio_actual: v.domicilio_actual || '',
        localidad: v.localidad || '',
        delegacion: v.delegacion || '',
        fecha_llamada: d.start_time_unix_secs ? new Date(d.start_time_unix_secs * 1000).toLocaleDateString('es-AR') : '',
        duracion_seg: d.call_duration_secs || 0,
        estado: d.status || '',
        producto1: v.producto1 || v.producto || '',
        cantidad1: v.cantidad1 || '',
        producto2: v.producto2 || '', cantidad2: v.cantidad2 || '',
        producto3: v.producto3 || '', cantidad3: v.cantidad3 || '',
        producto4: v.producto4 || '', cantidad4: v.cantidad4 || '',
        producto5: v.producto5 || '', cantidad5: v.cantidad5 || '',
        transcript: d.transcript || '',
        summary: d.summary || ''
      };
    });

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="reporte_productos_${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    }

    return NextResponse.json({ count: rows.length, data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}


