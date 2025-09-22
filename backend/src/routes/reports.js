const express = require('express');
const { prisma } = require('../database/client');
const xlsx = require('xlsx');

const router = express.Router();

// Helpers ElevenLabs
function getElevenLabsBaseUrl() {
  const RAW_BASE = (process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io').trim();
  return RAW_BASE.replace(/\/+$/, '').replace(/\/v1$/, '');
}

function elevenLabsHeaders() {
  return {
    'xi-api-key': (process.env.ELEVENLABS_API_KEY || '').trim(),
    'Accept': 'application/json'
  };
}

// Función para extraer productos y cantidades de transcripción
function extractProductsFromTranscript(transcript, sentProducts) {
  if (!transcript) return [];
  
  const products = [];
  const transcriptLower = transcript.toLowerCase();
  
  // Buscar cada producto enviado en la transcripción
  sentProducts.forEach((product, index) => {
    if (!product) return;
    
    const productLower = product.toLowerCase();
    
    // Buscar variaciones del nombre del producto
    const productVariations = [
      productLower,
      productLower.replace(/\s+/g, ''),
      productLower.replace(/[^a-z0-9]/g, ''),
      productLower.split(' ')[0], // primera palabra
      productLower.split(' ').slice(0, 2).join(' ') // primeras dos palabras
    ];
    
    // Buscar el producto en la transcripción
    let found = false;
    let mentionedQuantity = null;
    
    for (const variation of productVariations) {
      if (transcriptLower.includes(variation)) {
        found = true;
        
        // Buscar cantidad asociada
        const quantityPatterns = [
          new RegExp(`(?:tengo|tiene|cantidad|unidades?)\\s*(?:de\\s+)?(?:${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})?\\s*(?:es\\s*)?(\\d+)`, 'gi'),
          new RegExp(`(?:${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*(?:tengo|tiene|cantidad|unidades?)\\s*(?:es\\s*)?(\\d+)`, 'gi'),
          new RegExp(`(\\d+)\\s*(?:unidades?|cantidad|tengo|tiene)\\s*(?:de\\s+)?(?:${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        ];
        
        for (const pattern of quantityPatterns) {
          const match = pattern.exec(transcript);
          if (match && match[1]) {
            mentionedQuantity = parseInt(match[1]);
            break;
          }
        }
        break;
      }
    }
    
    if (found) {
      products.push({
        producto: product,
        cantidadMencionada: mentionedQuantity,
        encontrado: true
      });
    } else {
      products.push({
        producto: product,
        cantidadMencionada: null,
        encontrado: false
      });
    }
  });
  
  return products;
}

// GET /reports/productos - Generar reporte de productos de transcripciones
router.get('/productos', async (req, res) => {
  try {
    console.log('📊 Generando reporte de productos de transcripciones (ElevenLabs only)...');
    
    // Política: NO consultar DB. Ir directo a ElevenLabs
    {
      // Consultar directamente a ElevenLabs (sin tocar Isabela)
      console.log('⚠️ No hay registros en outbound_calls. Consultando a ElevenLabs...');
      const base = getElevenLabsBaseUrl();
      const agentId = (process.env.ELEVENLABS_AGENT_ID || '').trim();
      if (!agentId) {
        return res.status(400).json({ success: false, message: 'ELEVENLABS_AGENT_ID no configurado' });
      }

      const limit = parseInt(req.query.limit || '100');
      const url = `${base}/v1/convai/conversations?agent_id=${agentId}&limit=${limit}`;
      const listResp = await fetch(url, { headers: elevenLabsHeaders() });
      if (!listResp.ok) {
        const txt = await listResp.text().catch(() => '');
        return res.status(502).json({ success: false, message: 'Error listando conversaciones ElevenLabs', detail: txt, status: listResp.status });
      }
      const listData = await listResp.json();
      const conversations = Array.isArray(listData.conversations) ? listData.conversations : [];

      if (conversations.length === 0) {
        return res.status(404).json({ success: false, message: 'No hay conversaciones en ElevenLabs para generar el reporte' });
      }

      // Obtener detalles por conversación
      const detailed = [];
      for (const c of conversations) {
        try {
          const cid = c.conversation_id || c.conversationId || c.id;
          if (!cid) continue;
          const detailResp = await fetch(`${base}/v1/convai/conversations/${cid}`, { headers: elevenLabsHeaders() });
          if (!detailResp.ok) continue;
          const detail = await detailResp.json();
          detailed.push({
            conversation_id: cid,
            start_time_unix_secs: detail.metadata?.start_time_unix_secs || c.start_time_unix_secs,
            call_duration_secs: detail.metadata?.call_duration_secs || detail.duration || c.call_duration_secs || 0,
            status: detail.status || c.status || 'completed',
            dynamic_variables: detail.dynamic_variables || detail.conversation_initiation_client_data?.dynamic_variables || {},
            transcript: detail.transcript || detail.analysis?.transcript || null,
            summary: detail.summary || detail.analysis?.transcript_summary || null
          });
        } catch (_) { /* continuar */ }
      }

      if (detailed.length === 0) {
        return res.status(404).json({ success: false, message: 'No se pudieron recuperar detalles de conversaciones de ElevenLabs' });
      }

      // Construir data de reporte desde ElevenLabs
      const reportData = detailed.map(d => {
        const vars = d.dynamic_variables || {};
        // Extraer productos base desde variables
        const sentProducts = [];
        for (let i = 1; i <= 5; i++) {
          const p = vars[`producto${i}`];
          if (p) sentProducts.push(String(p));
        }
        const mentionedProducts = extractProductsFromTranscript(d.transcript || '', sentProducts);
        return {
          telefono: vars.phone_number || vars.telefono || '',
          nombreContacto: vars.nombre_contacto || '',
          nombrePaciente: vars.nombre_paciente || '',
          domicilio: vars.domicilio_actual || '',
          localidad: vars.localidad || '',
          delegacion: vars.delegacion || '',
          fechaLlamada: d.start_time_unix_secs ? new Date(d.start_time_unix_secs * 1000).toLocaleDateString('es-AR') : '',
          duracion: d.call_duration_secs || 0,
          estado: d.status || '',
          productos: mentionedProducts,
          transcripcion: d.transcript ? String(d.transcript).substring(0, 500) + '...' : ''
        };
      });

      // Generar XLSX igual que antes
      const workbook = xlsx.utils.book_new();
      const productosSheet = [];
      reportData.forEach(entry => {
        if (!entry.productos || entry.productos.length === 0) {
          // Al menos una fila por llamada
          productosSheet.push({
            'Teléfono': entry.telefono,
            'Nombre Contacto': entry.nombreContacto,
            'Nombre Paciente': entry.nombrePaciente,
            'Producto Enviado': '',
            'Cantidad Mencionada': 'No mencionada',
            'Encontrado en Transcripción': 'No',
            'Localidad': entry.localidad,
            'Delegación': entry.delegacion,
            'Fecha Llamada': entry.fechaLlamada,
            'Duración (min)': Math.round(entry.duracion / 60) || 0
          });
        } else {
          entry.productos.forEach(product => {
            productosSheet.push({
              'Teléfono': entry.telefono,
              'Nombre Contacto': entry.nombreContacto,
              'Nombre Paciente': entry.nombrePaciente,
              'Producto Enviado': product.producto,
              'Cantidad Mencionada': product.cantidadMencionada || 'No mencionada',
              'Encontrado en Transcripción': product.encontrado ? 'Sí' : 'No',
              'Localidad': entry.localidad,
              'Delegación': entry.delegacion,
              'Fecha Llamada': entry.fechaLlamada,
              'Duración (min)': Math.round(entry.duracion / 60) || 0
            });
          });
        }
      });
      const productosWS = xlsx.utils.json_to_sheet(productosSheet);
      xlsx.utils.book_append_sheet(workbook, productosWS, 'Productos Mencionados');

      const llamadasSheet = reportData.map(entry => ({
        'Teléfono': entry.telefono,
        'Nombre Contacto': entry.nombreContacto,
        'Nombre Paciente': entry.nombrePaciente,
        'Domicilio': entry.domicilio,
        'Localidad': entry.localidad,
        'Delegación': entry.delegacion,
        'Fecha Llamada': entry.fechaLlamada,
        'Duración (min)': Math.round(entry.duracion / 60) || 0,
        'Estado': entry.estado,
        'Productos Encontrados': entry.productos ? entry.productos.filter(p => p.encontrado).length : 0,
        'Total Productos': entry.productos ? entry.productos.length : 0
      }));
      const llamadasWS = xlsx.utils.json_to_sheet(llamadasSheet);
      xlsx.utils.book_append_sheet(workbook, llamadasWS, 'Resumen Llamadas');

      const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const filename = `reporte_productos_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      console.log(`✅ Reporte generado desde ElevenLabs: ${filename} (${reportData.length} llamadas)`);
      return res.send(excelBuffer);
    }

    // (Ruta anterior basada en DB removida por política: solo ElevenLabs)
    
    // Procesar cada llamada
    const reportData = [];
    
    for (const call of calls) {
      try {
        // Extraer productos enviados de las variables (con fallback a variablesDinamicas)
        const sentProducts = [];
        const baseVars = call.variables || call.variablesDinamicas || {};
        if (baseVars) {
          for (let i = 1; i <= 5; i++) {
            const product = baseVars[`producto${i}`];
            if (product) {
              sentProducts.push(product);
            }
          }
        }
        
        // Extraer productos mencionados en la transcripción (si hay transcript)
        const mentionedProducts = extractProductsFromTranscript(call.transcriptCompleto, sentProducts);
        
        // Crear entrada del reporte
        const reportEntry = {
          telefono: call.telefono,
          nombreContacto: baseVars?.nombre_contacto || 'Sin nombre',
          nombrePaciente: baseVars?.nombre_paciente || 'Sin nombre',
          domicilio: baseVars?.domicilio_actual || 'Sin dirección',
          localidad: baseVars?.localidad || 'Sin localidad',
          delegacion: baseVars?.delegacion || 'Sin delegación',
          fechaLlamada: call.fechaEjecutada ? call.fechaEjecutada.toLocaleDateString('es-AR') : 'Sin fecha',
          duracion: call.duracion || 0,
          estado: call.estado,
          productos: mentionedProducts,
          transcripcion: call.transcriptCompleto ? call.transcriptCompleto.substring(0, 500) + '...' : 'Sin transcripción'
        };
        
        reportData.push(reportEntry);
        
      } catch (error) {
        console.error(`❌ Error procesando llamada ${call.id}:`, error);
        continue;
      }
    }
    
    // Generar Excel
    const workbook = xlsx.utils.book_new();
    
    // Hoja 1: Resumen de productos
    const productosSheet = [];
    reportData.forEach(entry => {
      entry.productos.forEach(product => {
        productosSheet.push({
          'Teléfono': entry.telefono,
          'Nombre Contacto': entry.nombreContacto,
          'Nombre Paciente': entry.nombrePaciente,
          'Producto Enviado': product.producto,
          'Cantidad Mencionada': product.cantidadMencionada || 'No mencionada',
          'Encontrado en Transcripción': product.encontrado ? 'Sí' : 'No',
          'Localidad': entry.localidad,
          'Delegación': entry.delegacion,
          'Fecha Llamada': entry.fechaLlamada,
          'Duración (min)': Math.round(entry.duracion / 60) || 0
        });
      });
    });
    
    const productosWS = xlsx.utils.json_to_sheet(productosSheet);
    xlsx.utils.book_append_sheet(workbook, productosWS, 'Productos Mencionados');
    
    // Hoja 2: Resumen por llamada
    const llamadasSheet = reportData.map(entry => ({
      'Teléfono': entry.telefono,
      'Nombre Contacto': entry.nombreContacto,
      'Nombre Paciente': entry.nombrePaciente,
      'Domicilio': entry.domicilio,
      'Localidad': entry.localidad,
      'Delegación': entry.delegacion,
      'Fecha Llamada': entry.fechaLlamada,
      'Duración (min)': Math.round(entry.duracion / 60) || 0,
      'Estado': entry.estado,
      'Productos Encontrados': entry.productos.filter(p => p.encontrado).length,
      'Total Productos': entry.productos.length
    }));
    
    const llamadasWS = xlsx.utils.json_to_sheet(llamadasSheet);
    xlsx.utils.book_append_sheet(workbook, llamadasWS, 'Resumen Llamadas');
    
    // Generar buffer del Excel
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Configurar headers para descarga
    const filename = `reporte_productos_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    console.log(`✅ Reporte generado: ${filename} (${calls.length} llamadas procesadas)`);
    
    res.send(excelBuffer);
    
  } catch (error) {
    console.error('❌ Error generando reporte de productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando reporte de productos',
      details: error.message
    });
  }
});

module.exports = router;
