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

    // Helper: extraer cantidades desde transcripción
    const toText = (val: any): string => {
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        return val
          .map((m) => (typeof m === 'string' ? m : (m?.content || m?.message || '')))
          .join(' ');
      }
      if (val && typeof val === 'object') {
        return JSON.stringify(val);
      }
      return String(val ?? '');
    };
    const normalize = (s: any) => toText(s).toLowerCase().replace(/\s+/g, ' ').trim();
    const extractQty = (transcript: string, product: string): string | null => {
      if (!transcript || !product) return null;
      const t = normalize(transcript);
      const p = normalize(product);
      const variations = [p, p.replace(/[^a-z0-9]+/g, ''), p.split(' ')[0], p.split(' ').slice(0, 2).join(' ')];
      for (const v of variations) {
        if (!v) continue;
        // patrones: "12 unidades de v", "v 12", "cantidad 12 de v", soportar 1,5 y 1.5
        const num = '(?:\\d+(?:[\.,]\\d+)?)';
        const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [
          new RegExp(`${num}\\s*(?:u(?:nidades?)?|botes|pack|cant(?:idad)?)?\\s*(?:de\\s+)?${escaped}`, 'i'),
          new RegExp(`${escaped}[^\n\r\d]{0,10}${num}`, 'i'),
          new RegExp(`(?:tengo|queda|quedan|restan|stock|cantidad)\s*(?:de\s+)?${escaped}[^\n\r\d]{0,10}${num}`, 'i'),
        ];
        for (const pat of patterns) {
          const m = t.match(pat);
          if (m) {
            const val = m[1] || m[0].match(new RegExp(num))?.[0];
            if (val) return val.replace(',', '.');
          }
        }
      }
      return null;
    };

    // Map to rows
    const rows = detailed.map(d => {
      const v: any = d.dynamic_variables || {};
      // Productos base
      const products: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const pv = v[`producto${i}`] || (i === 1 ? v['producto'] : undefined);
        if (pv) products.push(toText(pv));
      }
      // Cantidades desde transcript
      const qty: (string | null)[] = products.map(p => extractQty(toText(d.transcript), p));
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
        producto1: products[0] || '', cantidad1: (qty[0] ?? '') || '',
        producto2: products[1] || '', cantidad2: (qty[1] ?? '') || '',
        producto3: products[2] || '', cantidad3: (qty[2] ?? '') || '',
        producto4: products[3] || '', cantidad4: (qty[3] ?? '') || '',
        producto5: products[4] || '', cantidad5: (qty[4] ?? '') || '',
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


