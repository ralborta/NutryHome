const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    const conversations = await prisma.isabelaConversation.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({ 
      conversations,
      total: conversations.length 
    });

  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
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

module.exports = router;
