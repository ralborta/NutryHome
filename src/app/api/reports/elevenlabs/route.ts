import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

function headers() {
  return { 'xi-api-key': process.env.ELEVENLABS_API_KEY || '' };
}

// Caché simple en memoria (se reinicia entre despliegues / lambdas)
type CacheEntry = { timestamp: number; rows: any[] };
const CACHE: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 1000 * 120; // 2 minutos

export async function GET(req: NextRequest) {
  try {
    const base = (process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io').replace(/\/$/, '').replace(/\/v1$/, '');
    const agentId = process.env.ELEVENLABS_AGENT_ID || '';
    if (!agentId) return NextResponse.json({ error: 'ELEVENLABS_AGENT_ID missing' }, { status: 400 });

    const format = (req.nextUrl.searchParams.get('format') || 'json').toLowerCase();
    const maxToFetch = Math.min(parseInt(req.nextUrl.searchParams.get('max') || '200'), 1000);
    const pageSize = Math.min(parseInt(req.nextUrl.searchParams.get('page_size') || '100'), 100);

    const cacheKey = `rows|${agentId}|${maxToFetch}|${pageSize}`;
    const now = Date.now();
    const cached = CACHE.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      if (format === 'xlsx') {
        const wb = XLSX.utils.book_new();
        const perProductRows: any[] = [];
        cached.rows.forEach((r: any) => {
          const baseRow = {
            nombre_contacto: r.nombre_contacto,
            nombre_paciente: r.nombre_paciente,
            domicilio_actual: r.domicilio_actual,
            localidad: r.localidad,
            delegacion: r.delegacion,
            fecha_llamada: r.fecha_llamada,
            transcript: r.transcript,
            summary: r.summary,
          };
          const entries = [
            { producto: r.producto1, cantidad: r.cantidad1 },
            { producto: r.producto2, cantidad: r.cantidad2 },
            { producto: r.producto3, cantidad: r.cantidad3 },
            { producto: r.producto4, cantidad: r.cantidad4 },
            { producto: r.producto5, cantidad: r.cantidad5 },
          ];
          let pushed = false;
          entries.forEach(e => {
            if (e.producto) {
              perProductRows.push({ ...baseRow, producto: e.producto, cantidad: e.cantidad ?? '' });
              pushed = true;
            }
          });
          if (!pushed) perProductRows.push({ ...baseRow, producto: '', cantidad: '' });
        });
        const ws = XLSX.utils.json_to_sheet(perProductRows);
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
      return NextResponse.json({ count: cached.rows.length, data: cached.rows });
    }

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
        messages: det.messages || det.turns || null,
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
    const SPANISH_NUMBERS: Record<string, number> = {
      'cero': 0,
      'medio': 0.5,
      'media': 0.5,
      'un': 1,
      'uno': 1,
      'una': 1,
      'dos': 2,
      'tres': 3,
      'cuatro': 4,
      'cinco': 5,
      'seis': 6,
      'siete': 7,
      'ocho': 8,
      'nueve': 9,
      'diez': 10,
      'once': 11,
      'doce': 12,
      'trece': 13,
      'catorce': 14,
      'quince': 15,
      'dieciseis': 16,
      'dieciséis': 16,
      'diecisiete': 17,
      'dieciocho': 18,
      'diecinueve': 19,
      'veinte': 20
    };

    const wordsToNumber = (s: string): number | null => {
      const t = s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const tokens = t.split(/[^a-z0-9\.]+/).filter(Boolean);
      let base: number | null = null;
      let hasHalf = false;
      for (let i = 0; i < tokens.length; i++) {
        const w = tokens[i];
        if (SPANISH_NUMBERS[w] !== undefined) {
          if (w === 'medio' || w === 'media') {
            hasHalf = true;
          } else {
            base = SPANISH_NUMBERS[w];
          }
        }
        if (w === 'y' && (tokens[i + 1] === 'medio' || tokens[i + 1] === 'media')) {
          hasHalf = true;
        }
      }
      if (base !== null) return base + (hasHalf ? 0.5 : 0);
      if (hasHalf) return 0.5;
      return null;
    };

    const extractQtyAround = (snippet: string): string | null => {
      const numMatch = snippet.match(/(\d+(?:[\.,]\d+)?)/);
      if (numMatch) return numMatch[1].replace(',', '.');
      const wordsMatch = wordsToNumber(snippet);
      return wordsMatch !== null ? String(wordsMatch) : null;
    };

    // --- Unidades, empaque y normalización ---
    type Packaging = 'caja' | 'blister' | 'pack' | 'frasco' | 'botella' | 'ampolla' | 'sobre' | 'sachet' | 'tira' | 'paquete' | 'bolsa';
    type QtyUnit = 'mg' | 'ml' | 'unidades' | 'empaques';

    const detectDose = (text: string): { value: number; unit: 'mg' | 'ml' } | null => {
      const t = normalize(text);
      const m = t.match(/(\d+(?:[\.,]\d+)?)\s*(mg|ml|cc|g|gr)\b/);
      if (!m) return null;
      let unit = m[2].toLowerCase();
      if (unit === 'cc') unit = 'ml';
      if (unit === 'g' || unit === 'gr') return { value: parseFloat(m[1].replace(',', '.')) * 1000, unit: 'mg' };
      return { value: parseFloat(m[1].replace(',', '.')), unit: unit as 'mg' | 'ml' };
    };

    const PACK_WORDS: Packaging[] = ['caja','blister','pack','frasco','botella','ampolla','sobre','sachet','tira','paquete','bolsa'];
    const detectPackaging = (text: string): Packaging | null => {
      const t = normalize(text);
      for (const w of PACK_WORDS) {
        const re = new RegExp(`\\b${w}s?\\b`);
        if (re.test(t)) return w;
      }
      return null;
    };

    const inferPackageSizeFromText = (text: string): number | null => {
      const t = normalize(text);
      // patrones tipo: x20, x 20, por 20, de 20, 20u, 20 unidades, 20 caps, 20 comprimidos
      const patterns = [
        /x\s*(\d{1,3})\b/,
        /\bpor\s*(\d{1,3})\b/,
        /\bde\s*(\d{1,3})\b/,
        /\b(\d{1,3})\s*(?:u|unidades|caps?|c[aá]psulas|comprimidos|tabs?|tabletas)\b/
      ];
      for (const pat of patterns) {
        const m = t.match(pat);
        if (m) return parseInt(m[1], 10);
      }
      return null;
    };

    const extractContextSnippet = (transcript: string, product: string): string => {
      const t = normalize(transcript);
      const p = normalize(product);
      const variations = [p, p.replace(/[^a-z0-9]+/g, ''), p.split(' ')[0], p.split(' ').slice(0, 2).join(' ')].filter(Boolean);
      for (const v of variations) {
        const idx = t.indexOf(v);
        if (idx >= 0) {
          const start = Math.max(0, idx - 80);
          const end = Math.min(t.length, idx + v.length + 120);
          return t.slice(start, end);
        }
      }
      return t.slice(0, Math.min(200, t.length));
    };

    const extractQtyDetailed = (transcript: string, product: string): {
      value: number | null;
      unit: QtyUnit | null;
      packaging: Packaging | null;
      unitsPerPackage: number | null;
      doseValue: number | null;
      doseUnit: 'mg' | 'ml' | null;
    } => {
      const snippet = extractContextSnippet(transcript, product);
      const pkg = detectPackaging(snippet) || detectPackaging(product);
      const perPack = inferPackageSizeFromText(product) || inferPackageSizeFromText(snippet);
      const dose = detectDose(product) || detectDose(snippet);
      const numStr = extractQtyAround(snippet);
      const numVal = numStr ? parseFloat(numStr.replace(',', '.')) : null;

      // Determinar unidad de cantidad
      let unit: QtyUnit | null = null;
      if (/\bmg\b/.test(snippet) || /\bmg\b/.test(product.toLowerCase())) unit = 'mg';
      else if (/\bml\b|\bcc\b/.test(snippet) || /\bml\b|\bcc\b/.test(product.toLowerCase())) unit = 'ml';
      else if (pkg) unit = 'empaques';
      else unit = 'unidades';

      return {
        value: Number.isFinite(numVal as number) ? (numVal as number) : null,
        unit,
        packaging: pkg,
        unitsPerPackage: perPack,
        doseValue: dose ? dose.value : null,
        doseUnit: dose ? dose.unit : null,
      };
    };

    const extractQty = (transcript: string, product: string): string | null => {
      if (!transcript || !product) return null;
      const t = normalize(transcript);
      const p = normalize(product);
      const variations = [p, p.replace(/[^a-z0-9]+/g, ''), p.split(' ')[0], p.split(' ').slice(0, 2).join(' ')].filter(Boolean);
      for (const v of variations) {
        const idx = t.indexOf(v);
        if (idx >= 0) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(t.length, idx + v.length + 80);
          const snippet = t.slice(start, end);
          const qty = extractQtyAround(snippet);
          if (qty) return qty;
        }
      }
      // fallback: buscar una cantidad global cerca de palabras clave
      const idx2 = t.search(/(producto|productos|cantidad|unidades|stock|tengo|queda|quedan|restan)/i);
      if (idx2 >= 0) {
        const snippet = t.slice(Math.max(0, idx2 - 40), Math.min(t.length, idx2 + 100));
        const qty = extractQtyAround(snippet);
        if (qty) return qty;
      }
      return null;
    };

    // Detectar cantidad desde la primera respuesta del cliente tras la pregunta del agente sobre productos
    const extractFirstClientReplyQty = (rawTranscript: any, rawMessages: any): string | null => {
      const isAgentMsg = (m: any): boolean => {
        const role = (m?.role || m?.speaker || m?.from || '').toString().toLowerCase();
        const name = (m?.name || m?.author || '').toString().toLowerCase();
        return role.includes('agent') || role.includes('assistant') || name.includes('agent') || name.includes('isabela');
      };
      const isUserMsg = (m: any): boolean => {
        const role = (m?.role || m?.speaker || m?.from || '').toString().toLowerCase();
        const name = (m?.name || m?.author || '').toString().toLowerCase();
        return role.includes('user') || role.includes('caller') || role.includes('customer') || role.includes('client') || role.includes('usuario') || name.includes('cliente');
      };
      const textOf = (m: any): string => toText(m?.content ?? m?.message ?? m?.text ?? m);
      const looksLikeProductQuestion = (s: string): boolean => {
        const t = s.toLowerCase();
        return /(producto|productos|cantidad|cu[aá]nt[oa]s?)/.test(t);
      };
      const numberFrom = (s: string): string | null => {
        const m = s.match(/(\d+(?:[\.,]\d+)?)/);
        if (m) return m[1].replace(',', '.');
        const w = wordsToNumber(s);
        return w !== null ? String(w) : null;
      };

      const msgs = Array.isArray(rawMessages) ? rawMessages : (Array.isArray(rawTranscript) ? rawTranscript : null);
      if (Array.isArray(msgs)) {
        for (let i = 0; i < msgs.length; i++) {
          const m = msgs[i];
          if (isAgentMsg(m) && looksLikeProductQuestion(textOf(m))) {
            for (let j = i + 1; j < msgs.length; j++) {
              if (isUserMsg(msgs[j])) {
                const n = numberFrom(textOf(msgs[j]));
                if (n) return n;
              }
            }
          }
        }
      }

      const t = toText(rawTranscript);
      const idx = t.toLowerCase().search(/(producto|productos|cantidad|cu[aá]nt[oa]s?)/);
      if (idx >= 0) {
        const slice = t.slice(idx);
        const m = slice.match(/(\d+(?:[\.,]\d+)?)/);
        if (m) return m[1].replace(',', '.');
      }
      return null;
    };

    // Map to rows
    const filtered = detailed.filter(d => {
      const failed = String(d.status || '').toLowerCase() === 'failed';
      const noInfo = (!d.transcript || String(d.transcript).trim() === '') && (!d.call_duration_secs || d.call_duration_secs === 0);
      return !failed && !noInfo; // descartar llamadas totalmente vacías o fallidas
    });
    const rows = filtered.map(d => {
      const v: any = d.dynamic_variables || {};
      // Productos base
      const products: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const pv = v[`producto${i}`] || (i === 1 ? v['producto'] : undefined);
        if (pv) products.push(toText(pv));
      }
      // Cantidades desde transcript
      const firstReplyQty = extractFirstClientReplyQty(d.transcript, (d as any).messages);
      const qty: (string | null)[] = products.map((p, idx) => (idx === 0 && firstReplyQty ? firstReplyQty : extractQty(toText(d.transcript), p)));

      // Fallback a cantidades en dynamic_variables si no se detectó
      const getVarQty = (i: number): string | null => {
        const keys = [
          `cantidad${i}`, `cantidad_${i}`, `qty${i}`, `qty_${i}`, `stock${i}`, `stock_${i}`
        ];
        for (const k of keys) {
          if (v[k] !== undefined && v[k] !== null) return toText(v[k]);
        }
        return null;
      };
      for (let i = 0; i < qty.length; i++) {
        if (!qty[i] || String(qty[i]).trim() === '') {
          const fallback = getVarQty(i + 1);
          if (fallback) qty[i] = fallback;
        }
      }
      // Detalle IA de reglas por producto
      const details = products.map((p) => extractQtyDetailed(toText(d.transcript), p));
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
        unidad_cantidad1: details[0]?.unit || '',
        presentacion1: details[0]?.packaging || '',
        unidades_por_empaque1: details[0]?.unitsPerPackage ?? '',
        cantidad_normalizada_unidades1: (() => {
          const d0 = details[0];
          if (!d0 || d0.value == null) return '';
          if (d0.unit === 'empaques' && d0.unitsPerPackage) return String(d0.value * d0.unitsPerPackage);
          if (d0.unit === 'unidades') return String(d0.value);
          return '';
        })(),
        dosis1: details[0]?.doseValue ?? '',
        dosis_unidad1: details[0]?.doseUnit || '',
        unidad_cantidad2: details[1]?.unit || '',
        presentacion2: details[1]?.packaging || '',
        unidades_por_empaque2: details[1]?.unitsPerPackage ?? '',
        cantidad_normalizada_unidades2: (() => {
          const d1 = details[1];
          if (!d1 || d1.value == null) return '';
          if (d1.unit === 'empaques' && d1.unitsPerPackage) return String(d1.value * d1.unitsPerPackage);
          if (d1.unit === 'unidades') return String(d1.value);
          return '';
        })(),
        dosis2: details[1]?.doseValue ?? '',
        dosis_unidad2: details[1]?.doseUnit || '',
        unidad_cantidad3: details[2]?.unit || '',
        presentacion3: details[2]?.packaging || '',
        unidades_por_empaque3: details[2]?.unitsPerPackage ?? '',
        cantidad_normalizada_unidades3: (() => {
          const d2 = details[2];
          if (!d2 || d2.value == null) return '';
          if (d2.unit === 'empaques' && d2.unitsPerPackage) return String(d2.value * d2.unitsPerPackage);
          if (d2.unit === 'unidades') return String(d2.value);
          return '';
        })(),
        dosis3: details[2]?.doseValue ?? '',
        dosis_unidad3: details[2]?.doseUnit || '',
        unidad_cantidad4: details[3]?.unit || '',
        presentacion4: details[3]?.packaging || '',
        unidades_por_empaque4: details[3]?.unitsPerPackage ?? '',
        cantidad_normalizada_unidades4: (() => {
          const d3 = details[3];
          if (!d3 || d3.value == null) return '';
          if (d3.unit === 'empaques' && d3.unitsPerPackage) return String(d3.value * d3.unitsPerPackage);
          if (d3.unit === 'unidades') return String(d3.value);
          return '';
        })(),
        dosis4: details[3]?.doseValue ?? '',
        dosis_unidad4: details[3]?.doseUnit || '',
        unidad_cantidad5: details[4]?.unit || '',
        presentacion5: details[4]?.packaging || '',
        unidades_por_empaque5: details[4]?.unitsPerPackage ?? '',
        cantidad_normalizada_unidades5: (() => {
          const d4 = details[4];
          if (!d4 || d4.value == null) return '';
          if (d4.unit === 'empaques' && d4.unitsPerPackage) return String(d4.value * d4.unitsPerPackage);
          if (d4.unit === 'unidades') return String(d4.value);
          return '';
        })(),
        dosis5: details[4]?.doseValue ?? '',
        dosis_unidad5: details[4]?.doseUnit || '',
        transcript: d.transcript || '',
        summary: d.summary || ''
      };
    });

    // Guardar en caché
    CACHE.set(cacheKey, { timestamp: now, rows });

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      // Crear una fila por producto
      const perProductRows: any[] = [];
      rows.forEach(r => {
        const base = {
          nombre_contacto: r.nombre_contacto,
          nombre_paciente: r.nombre_paciente,
          domicilio_actual: r.domicilio_actual,
          localidad: r.localidad,
          delegacion: r.delegacion,
          fecha_llamada: r.fecha_llamada,
          transcript: r.transcript,
          summary: r.summary,
        };
        const entries = [
          { producto: r.producto1, cantidad: r.cantidad1, unidad_cantidad: r.unidad_cantidad1, presentacion: r.presentacion1, unidades_por_empaque: r.unidades_por_empaque1, cantidad_normalizada_unidades: r.cantidad_normalizada_unidades1, dosis: r.dosis1, dosis_unidad: r.dosis_unidad1 },
          { producto: r.producto2, cantidad: r.cantidad2, unidad_cantidad: r.unidad_cantidad2, presentacion: r.presentacion2, unidades_por_empaque: r.unidades_por_empaque2, cantidad_normalizada_unidades: r.cantidad_normalizada_unidades2, dosis: r.dosis2, dosis_unidad: r.dosis_unidad2 },
          { producto: r.producto3, cantidad: r.cantidad3, unidad_cantidad: r.unidad_cantidad3, presentacion: r.presentacion3, unidades_por_empaque: r.unidades_por_empaque3, cantidad_normalizada_unidades: r.cantidad_normalizada_unidades3, dosis: r.dosis3, dosis_unidad: r.dosis_unidad3 },
          { producto: r.producto4, cantidad: r.cantidad4, unidad_cantidad: r.unidad_cantidad4, presentacion: r.presentacion4, unidades_por_empaque: r.unidades_por_empaque4, cantidad_normalizada_unidades: r.cantidad_normalizada_unidades4, dosis: r.dosis4, dosis_unidad: r.dosis_unidad4 },
          { producto: r.producto5, cantidad: r.cantidad5, unidad_cantidad: r.unidad_cantidad5, presentacion: r.presentacion5, unidades_por_empaque: r.unidades_por_empaque5, cantidad_normalizada_unidades: r.cantidad_normalizada_unidades5, dosis: r.dosis5, dosis_unidad: r.dosis_unidad5 },
        ];
        let pushed = false;
        entries.forEach(e => {
          if (e.producto) {
            perProductRows.push({
              ...base,
              producto: e.producto,
              cantidad: e.cantidad ?? '',
              unidad_cantidad: (e as any).unidad_cantidad ?? '',
              presentacion: (e as any).presentacion ?? '',
              unidades_por_empaque: (e as any).unidades_por_empaque ?? '',
              cantidad_normalizada_unidades: (e as any).cantidad_normalizada_unidades ?? '',
              dosis: (e as any).dosis ?? '',
              dosis_unidad: (e as any).dosis_unidad ?? ''
            });
            pushed = true;
          }
        });
        if (!pushed) perProductRows.push({ ...base, producto: '', cantidad: '' });
      });
      const ws = XLSX.utils.json_to_sheet(perProductRows);
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


