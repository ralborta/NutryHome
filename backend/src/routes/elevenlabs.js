const express = require('express');
const router = express.Router();

// Endpoint simple para obtener resumen de conversación
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
        message: 'No se pudo obtener la conversación'
      });
    }
    
    const conversation = await response.json();
    
    // Extraer solo el resumen
    const summary = conversation.analysis?.transcript_summary || 'Sin resumen disponible';
    
    res.json({
      conversation_id: conversation.conversation_id,
      summary: summary,
      status: conversation.status,
      agent_id: conversation.agent_id
    });
    
  } catch (error) {
    console.error('Error ElevenLabs:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

module.exports = router;
