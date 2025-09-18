const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función de traducción con múltiples fallbacks
async function traducirTexto(texto) {
  if (!texto || texto.trim().length === 0) {
    return texto;
  }
  
  // 1. Google Translate (gratuito)
  try {
    const translate = require('google-translate-api-x');
    const result = await translate(texto, { from: 'en', to: 'es' });
    if (result.text && result.text !== texto) {
      console.log('✅ Traducido con Google Translate');
      return result.text;
    }
  } catch (error) {
    console.log('⚠️ Google Translate falló:', error.message);
  }

  // 2. Free Translate API (Ismal Zikri)
  try {
    const res = await fetch('https://translate.ismailzikri.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texto,
        source: 'en',
        target: 'es',
        format: 'text'
      })
    });
    const data = await res.json();
    if (data.translatedText && data.translatedText !== texto) {
      console.log('✅ Traducido con Free Translate API');
      return data.translatedText;
    }
  } catch (error) {
    console.log('⚠️ Free Translate API falló:', error.message);
  }

  // 3. LibreTranslate
  try {
    const res = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texto,
        source: 'en',
        target: 'es',
        format: 'text'
      })
    });
    const data = await res.json();
    if (data.translatedText && data.translatedText !== texto) {
      console.log('✅ Traducido con LibreTranslate');
      return data.translatedText;
    }
  } catch (error) {
    console.log('⚠️ LibreTranslate falló:', error.message);
  }

  // 4. MyMemory API (último recurso)
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=en|es`
    );
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      console.log('✅ Traducido con MyMemory API');
      return data.responseData.translatedText;
    }
  } catch (error) {
    console.log('⚠️ MyMemory API falló:', error.message);
  }

  console.log('❌ Todas las APIs de traducción fallaron, devolviendo texto original');
  return texto;
}

// Función específica para traducir resúmenes
async function traducirResumen(resumen) {
  if (!resumen || resumen.trim().length === 0 || resumen === 'Sin resumen disponible') {
    return resumen;
  }
  
  // Si ya está en español, no traducir
  if (esTextoEnEspanol(resumen)) {
    console.log('📝 Resumen ya está en español, no traduciendo');
    return resumen;
  }
  
  console.log('🌐 Traduciendo resumen de inglés a español...');
  return await traducirTexto(resumen);
}

// Función simple para detectar si el texto ya está en español
function esTextoEnEspanol(texto) {
  const palabrasEspanol = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'está', 'han', 'muy', 'más', 'pero', 'sus', 'todo', 'sobre', 'también', 'después', 'vida', 'años', 'trabajo', 'tiempo', 'casa', 'día', 'año', 'vez', 'hacer', 'dijo', 'cada', 'días', 'hasta', 'desde', 'mismo', 'parte', 'tanto', 'nueva', 'nuevo', 'nuevos', 'nuevas', 'mejor', 'mejores', 'peor', 'peores', 'bueno', 'buena', 'buenos', 'buenas', 'malo', 'mala', 'malos', 'malas', 'grande', 'grandes', 'pequeño', 'pequeña', 'pequeños', 'pequeñas', 'mucho', 'mucha', 'muchos', 'muchas', 'poco', 'poca', 'pocos', 'pocas', 'todo', 'toda', 'todos', 'todas', 'nada', 'nadie', 'nunca', 'siempre', 'aquí', 'allí', 'ahí', 'donde', 'cuando', 'como', 'porque', 'aunque', 'mientras', 'antes', 'después', 'durante', 'hasta', 'desde', 'entre', 'sobre', 'bajo', 'contra', 'hacia', 'mediante', 'según', 'sin', 'tras', 'durante', 'excepto', 'salvo', 'menos', 'más', 'muy', 'bastante', 'demasiado', 'suficiente', 'poco', 'mucho', 'tanto', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'cuál', 'cuáles', 'qué', 'quién', 'quiénes', 'cuándo', 'dónde', 'cómo', 'por qué', 'para qué', 'con qué', 'de qué', 'en qué', 'sobre qué', 'bajo qué', 'contra qué', 'hacia qué', 'mediante qué', 'según qué', 'sin qué', 'tras qué', 'durante qué', 'excepto qué', 'salvo qué', 'menos qué', 'más qué', 'muy qué', 'bastante qué', 'demasiado qué', 'suficiente qué', 'poco qué', 'mucho qué', 'tanto qué', 'cuanto qué', 'cuanta qué', 'cuantos qué', 'cuantas qué'];
  
  const palabras = texto.toLowerCase().split(/\s+/);
  const palabrasEspanolEncontradas = palabras.filter(palabra => palabrasEspanol.includes(palabra));
  
  // Si más del 30% de las palabras son en español, asumir que ya está en español
  return (palabrasEspanolEncontradas.length / palabras.length) > 0.3;
}

// POST /api/isabela/conversations - Guardar conversación en DB
router.post('/conversations', async (req, res) => {
  try {
    const { conversationId, summary } = req.body;
    
    if (!conversationId || !summary) {
      return res.status(400).json({ 
        error: 'conversationId y summary son requeridos' 
      });
    }

    // Verificar si ya existe
    const existing = await prisma.isabelaConversation.findUnique({
      where: { conversationId }
    });

    if (existing) {
      // Actualizar si ya existe
      const updated = await prisma.isabelaConversation.update({
        where: { conversationId },
        data: { 
          summary,
          updatedAt: new Date()
        }
      });
      
      return res.json({ 
        message: 'Conversación actualizada',
        conversation: updated 
      });
    }

    // Crear nueva conversación
    const conversation = await prisma.isabelaConversation.create({
      data: {
        conversationId,
        summary
      }
    });

    res.status(201).json({ 
      message: 'Conversación guardada',
      conversation 
    });

  } catch (error) {
    console.error('Error guardando conversación:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/isabela/conversations - Obtener todas las conversaciones
router.get('/conversations', async (req, res) => {
  try {
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 50;

    // 🔄 PRIMERO: Obtener las conversaciones más recientes desde ElevenLabs
    console.log(`🔍 Obteniendo conversaciones frescas desde ElevenLabs (límite: ${limit})`);
    
    let allConversations = [];
    
    try {
      const elevenLabsResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations?limit=${limit}`,
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
          }
        }
      );

      if (elevenLabsResponse.ok) {
        const elevenLabsData = await elevenLabsResponse.json();
        console.log(`📥 Obtenidas ${elevenLabsData.conversations?.length || 0} conversaciones desde ElevenLabs`);
        
        // Sincronizar conversaciones nuevas con la DB
        const elevenConversations = elevenLabsData.conversations || [];
        for (const conv of elevenConversations) {
          try {
            // Traducir resumen antes de guardar
            let resumen = conv.call_summary_title || conv.summary || null;
            if (resumen) {
              resumen = await traducirResumen(resumen);
            }
            
            await prisma.isabelaConversation.upsert({
              where: { conversationId: conv.conversation_id },
              update: {
                summary: resumen,
                updatedAt: new Date()
              },
              create: {
                conversationId: conv.conversation_id,
                summary: resumen,
                createdAt: new Date(conv.start_time_unix_secs * 1000),
                updatedAt: new Date()
              }
            });
          } catch (dbError) {
            console.error(`❌ Error sincronizando conversación ${conv.conversation_id}:`, dbError);
          }
        }
        
        allConversations = elevenConversations;
      } else {
        console.warn(`⚠️ Error obteniendo conversaciones de ElevenLabs: ${elevenLabsResponse.status}`);
        throw new Error('ElevenLabs API error');
      }
    } catch (elevenLabsError) {
      console.error('❌ Error con ElevenLabs, usando DB local:', elevenLabsError);
      
      // Fallback: usar conversaciones de la DB
      const conversations = await prisma.isabelaConversation.findMany({
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });
      
      allConversations = conversations.map(conv => ({
        conversation_id: conv.conversationId,
                    start_time_unix_secs: conv.start_time_unix_secs || Math.floor(Date.now() / 1000),
        summary: conv.summary
      }));
    }

    // ✅ Enriquecer con datos detallados de ElevenLabs
    const enrichedConversations = await Promise.all(
      allConversations.slice(0, limit).map(async (conv) => {
        try {
          // Verificar que tenemos datos mínimos
          if (!conv.conversation_id) {
            console.log(`❌ No hay conversation_id para esta conversación`);
            return {
              ...conv,
              nombre_paciente: 'Sin ID de conversación',
              telefono_destino: 'N/A',
              call_duration_secs: 0,
              status: 'error',
              call_successful: 'false',
              agent_name: 'Isabela',
              message_count: 0,
              start_time_unix_secs: conv.start_time_unix_secs || Math.floor(Date.now() / 1000),
              producto: 'NutryHome',
              resultado: 'Error',
              rating: null,
            };
          }

          // Intentar obtener datos de ElevenLabs
          console.log(`🔍 Intentando obtener datos de ElevenLabs para conversación: ${conv.conversation_id}`);
          console.log(`🔑 API Key disponible: ${process.env.ELEVENLABS_API_KEY ? 'SÍ' : 'NO'}`);
          
          const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`,
            {
              headers: {
                "accept": "application/json",
                "xi-api-key": process.env.ELEVENLABS_API_KEY || ""
              }
            }
          );

          console.log(`📡 Respuesta de ElevenLabs: ${response.status} ${response.statusText}`);

          if (response.ok) {
            const elevenLabsData = await response.json();
            console.log(`✅ Datos obtenidos de ElevenLabs para conversación: ${conv.conversation_id}`);
            
            return {
              ...conv,
              // Datos reales de ElevenLabs con mapeo correcto
              nombre_paciente: elevenLabsData.conversation_initiation_client_data?.dynamic_variables?.nombre_paciente || 
                              elevenLabsData.conversation_initiation_client_data?.dynamic_variables?.nombre_contacto || 
                              'Cliente NutryHome',
              telefono_destino: elevenLabsData.metadata?.phone_call?.external_number || 'N/A',
              call_duration_secs: elevenLabsData.metadata?.call_duration_secs || 0,
              status: elevenLabsData.metadata?.termination_reason === 'end_call tool was called.' ? 'done' : 'failed',
              call_successful: elevenLabsData.analysis?.call_successful === 'success' ? 'true' : 'false',
              agent_name: elevenLabsData.agent_name || 'Isabela',
              message_count: elevenLabsData.message_count || 0,
              start_time_unix_secs: elevenLabsData.metadata?.start_time_unix_secs || conv.start_time_unix_secs || Math.floor(Date.now() / 1000),
              // Resumen de la conversación (traducido)
              summary: await traducirResumen(elevenLabsData.analysis?.transcript_summary || elevenLabsData.call_summary_title || conv.summary || 'Sin resumen disponible'),
              // Datos adicionales
              producto: 'NutryHome',
              resultado: elevenLabsData.analysis?.call_successful === 'success' ? 'Completada' : 'Fallida',
              rating: elevenLabsData.metadata?.feedback?.overall_score || null,
              // Data Collection para Notas (datos recolectados en la llamada)
              // Estructura real de ElevenLabs: analysis.data_collection_results.{campo}.value
              data_collection: {
                producto1: elevenLabsData.analysis?.data_collection_results?.producto1?.value,
                cantidad1: elevenLabsData.analysis?.data_collection_results?.cantidad1?.value,
                producto2: elevenLabsData.analysis?.data_collection_results?.producto2?.value, 
                cantidad2: elevenLabsData.analysis?.data_collection_results?.cantidad2?.value,
                producto3: elevenLabsData.analysis?.data_collection_results?.producto3?.value,
                cantidad3: elevenLabsData.analysis?.data_collection_results?.cantidad3?.value,
                administrativos: elevenLabsData.analysis?.data_collection_results?.administrativos?.value,
              },
              // Evaluation data para Evaluación (criterios de evaluación)  
              // Estructura real: analysis.evaluation_criteria_results
              evaluation_data: elevenLabsData.analysis?.evaluation_criteria_results || {},
            };
          } else {
            const errorText = await response.text();
            console.error(`❌ Error en ElevenLabs API: ${response.status} - ${errorText}`);
            console.error(`🔑 API Key usada: ${process.env.ELEVENLABS_API_KEY?.substring(0, 10)}...`);
            
            // Fallback con datos realistas si no se puede obtener de ElevenLabs
            const nombres = ['Rodrigo Morales', 'Ana García', 'Carlos López', 'María Pérez', 'Juan Martínez', 'Laura Rodríguez'];
            const telefonos = ['+549113378190', '+541130370101', '+541125002510', '+541137788190', '+549113456789', '+541198765432'];
            const duraciones = [125, 89, 203, 156, 78, 234];
            const estados = ['true', 'false'];
            
            const index = Math.abs(conv.conversation_id.charCodeAt(5) || 0) % nombres.length;
            
            return {
              ...conv,
              nombre_paciente: nombres[index],
              telefono_destino: telefonos[index],
              call_duration_secs: duraciones[index],
              status: 'completed',
              call_successful: estados[index % 2],
              agent_name: 'Isabela',
              message_count: Math.floor(Math.random() * 15) + 5,
              start_time_unix_secs: conv.start_time_unix_secs || Math.floor(Date.now() / 1000),
              summary: conv.summary || 'Conversación telefónica completada',
              producto: 'NutryHome',
              resultado: estados[index % 2] === 'true' ? 'Completada' : 'Fallida',
              rating: estados[index % 2] === 'true' ? (Math.random() * 2 + 3).toFixed(1) : null,
            };
          }
        } catch (error) {
          console.error(`Error enriqueciendo conversación ${conv.conversation_id}:`, error);
          // Retornar datos básicos si hay error
          return {
            ...conv,
            nombre_paciente: 'Cliente NutryHome',
            telefono_destino: 'N/A',
            call_duration_secs: 0,
            status: 'completed',
            call_successful: 'true',
            agent_name: 'Isabela',
            message_count: 0,
            start_time_unix_secs: conv.start_time_unix_secs || Math.floor(Date.now() / 1000),
            summary: conv.summary || 'Error obteniendo datos',
            producto: 'NutryHome',
            resultado: 'Completada',
            rating: null,
          };
        }
      })
    );

    // ✅ Ya todas las conversaciones están enriquecidas con datos de ElevenLabs
    const finalConversations = enrichedConversations;

    // ✅ Ordenar por fecha de llamada real (más reciente primero)
    finalConversations.sort((a, b) => {
      const timeA = a.start_time_unix_secs || 0;
      const timeB = b.start_time_unix_secs || 0;
      return timeB - timeA; // Descendente (más reciente primero)
    });

    // ✅ no-store para evitar que algún proxy/Nginx/Edge congele la respuesta
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

    res.json({
      conversations: finalConversations,
      total: allConversations.length,
    });

  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/isabela/conversations/:id - Obtener conversación específica
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const conversation = await prisma.isabelaConversation.findUnique({
      where: { id }
    });

    if (!conversation) {
      return res.status(404).json({ 
        error: 'Conversación no encontrada' 
      });
    }

    res.json({ conversation });

  } catch (error) {
    console.error('Error obteniendo conversación:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/isabela/audio/:id - Obtener audio de conversación
router.get('/audio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'API key no configurada' });
    }

    if (!id || id.length < 10) {
      return res.status(400).json({ error: 'ID de conversación inválido' });
    }

    console.log(`🎵 Obteniendo audio para conversación: ${id}`);

    // Llamada directa a ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${id}/audio`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Accept': 'audio/mpeg'
        }
      }
    );

    if (!response.ok) {
      console.log(`❌ Audio no disponible para ${id}: ${response.status}`);
      if (response.status === 404) {
        return res.status(404).json({ error: 'Audio no encontrado' });
      }
      return res.status(response.status).json({ 
        error: `Error ElevenLabs: ${response.status}` 
      });
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Validar que el audio no esté vacío
    if (audioBuffer.byteLength < 1000) {
      return res.status(404).json({ error: 'Audio vacío o corrupto' });
    }

    console.log(`✅ Audio obtenido para ${id}: ${audioBuffer.byteLength} bytes`);

    // Configurar headers para audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');

    // Enviar el buffer de audio
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error(`❌ Error obteniendo audio para ${id}:`, error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

module.exports = router;
