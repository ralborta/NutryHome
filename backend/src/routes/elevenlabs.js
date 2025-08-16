const express = require('express');
const router = express.Router();

// Webhook endpoint para ElevenLabs Tools
router.post('/elevenlabs/webhook', async (req, res) => {
  try {
    // Validar token de autenticación
    const expected = `Bearer ${process.env.ELEVENLABS_WEBHOOK_TOKEN}`;
    const got = req.get('authorization') || '';
    
    if (got !== expected) {
      console.log('❌ Webhook 401 - Token inválido:', { 
        expected: expected.substring(0, 20) + '...',
        got: got.substring(0, 20) + '...'
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Log del webhook recibido
    console.log('✅ Webhook ElevenLabs OK:', { 
      keys: Object.keys(req.body || {}),
      timestamp: new Date().toISOString(),
      userAgent: req.get('user-agent')
    });

    // Responder rápidamente para no cortar la llamada
    res.status(200).json({ 
      ok: true, 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });

    // TODO: Procesar en background (queue) para no bloquear la llamada
    // Aquí puedes agregar lógica para procesar los datos del webhook
    
  } catch (error) {
    console.error('❌ Error en webhook ElevenLabs:', error);
    
    // En caso de error, responder 200 para no cortar la llamada
    res.status(200).json({ 
      ok: false, 
      error: 'Internal error but call continues',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check para el webhook
router.get('/elevenlabs/webhook/health', (req, res) => {
  res.status(200).json({ 
    ok: true, 
    message: 'ElevenLabs webhook endpoint is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
