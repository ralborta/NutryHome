const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Endpoint para obtener resumen de conversación y guardarlo en DB
router.get('/conversations/:conversation_id', async (req, res) => {
  try {
    const { conversation_id } = req.params;
    
    // Verificar que tenemos la API key
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ 
        error: 'ELEVENLABS_API_KEY no configurada',
        message: 'Configura la variable de entorno ELEVENLABS_API_KEY'
      });
    }
    
    // 1. Verificar si ya tenemos el resumen en la DB
    let existingConversation = await prisma.isabelaConversation.findUnique({
      where: { conversationId: conversation_id }
    });
    
    if (existingConversation && existingConversation.summary) {
      console.log('✅ Resumen encontrado en DB:', conversation_id);
      return res.json({
        conversation_id: existingConversation.conversationId,
        summary: existingConversation.summary,
        source: 'database',
        cached: true
      });
    }
    
    // 2. Si no está en DB, obtenerlo de ElevenLabs
    console.log('🔄 Obteniendo resumen de ElevenLabs:', conversation_id);
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversation_id}`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        }
      }
    );
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Error ${response.status}: ${response.statusText}`,
        message: 'No se pudo obtener la conversación de ElevenLabs'
      });
    }
    
    const conversation = await response.json();
    
    // 3. Extraer el resumen
    const summary = conversation.analysis?.transcript_summary || 'Sin resumen disponible';
    
    // 4. Guardar en la DB
    try {
      if (existingConversation) {
        // Actualizar conversación existente
        await prisma.isabelaConversation.update({
          where: { conversationId: conversation_id },
          data: { 
            summary: summary,
            updatedAt: new Date()
          }
        });
      } else {
        // Crear nueva conversación
        await prisma.isabelaConversation.create({
          data: {
            conversationId: conversation_id,
            summary: summary
          }
        });
      }
      console.log('✅ Resumen guardado en DB:', conversation_id);
    } catch (dbError) {
      console.error('⚠️ Error guardando en DB:', dbError);
      // Continuar aunque falle la DB
    }
    
    // 5. Devolver respuesta
    res.json({
      conversation_id: conversation_id,
      summary: summary,
      source: 'elevenlabs',
      cached: false,
      status: conversation.status,
      agent_id: conversation.agent_id
    });
    
  } catch (error) {
    console.error('❌ Error ElevenLabs:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Endpoint para obtener todas las conversaciones con resúmenes
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await prisma.isabelaConversation.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        conversationId: true,
        summary: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.json({
      total: conversations.length,
      conversations: conversations
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo conversaciones:', error);
    res.status(500).json({ 
      error: 'Error obteniendo conversaciones de la DB',
      details: error.message 
    });
  }
});

module.exports = router;
