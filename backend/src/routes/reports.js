const express = require('express');
const { prisma } = require('../database/client');
const xlsx = require('xlsx');

const router = express.Router();

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
    console.log('📊 Generando reporte de productos de transcripciones...');
    
    // Obtener llamadas completadas con transcripción
    const calls = await prisma.outboundCall.findMany({
      where: {
        estado: 'COMPLETED',
        transcriptCompleto: {
          not: null
        }
      },
      include: {
        batch: {
          include: {
            campaign: true
          }
        }
      },
      orderBy: {
        fechaEjecutada: 'desc'
      }
    });
    
    if (calls.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron llamadas completadas con transcripción'
      });
    }
    
    console.log(`📞 Procesando ${calls.length} llamadas completadas...`);
    
    // Procesar cada llamada
    const reportData = [];
    
    for (const call of calls) {
      try {
        // Extraer productos enviados de las variables
        const sentProducts = [];
        if (call.variables) {
          for (let i = 1; i <= 5; i++) {
            const product = call.variables[`producto${i}`];
            if (product) {
              sentProducts.push(product);
            }
          }
        }
        
        // Extraer productos mencionados en la transcripción
        const mentionedProducts = extractProductsFromTranscript(call.transcriptCompleto, sentProducts);
        
        // Crear entrada del reporte
        const reportEntry = {
          telefono: call.telefono,
          nombreContacto: call.variables?.nombre_contacto || 'Sin nombre',
          nombrePaciente: call.variables?.nombre_paciente || 'Sin nombre',
          domicilio: call.variables?.domicilio_actual || 'Sin dirección',
          localidad: call.variables?.localidad || 'Sin localidad',
          delegacion: call.variables?.delegacion || 'Sin delegación',
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
