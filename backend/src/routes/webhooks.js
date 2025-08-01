const express = require('express');
const Joi = require('joi');
const crypto = require('crypto');
const { prisma } = require('../database/client');

const router = express.Router();

// Esquema de validación para webhook de ElevenLabs
const elevenLabsWebhookSchema = Joi.object({
  call_id: Joi.string().required(),
  phone_number: Joi.string().required(),
  duration: Joi.number().integer().min(0).required(),
  transcript: Joi.string().required(),
  data_collection: Joi.object().required(),
  criteria_results: Joi.object().required(),
  timestamp: Joi.date().iso().required(),
  status: Joi.string().valid('completed', 'failed', 'cancelled').required(),
});

/**
 * Middleware para verificar la autenticidad del webhook de ElevenLabs
 */
const verifyElevenLabsWebhook = (req, res, next) => {
  const signature = req.headers['x-elevenlabs-signature'];
  const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(401).json({
      success: false,
      error: { message: 'Firma de webhook no válida' },
    });
  }

  // Verificar la firma del webhook
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({
      success: false,
      error: { message: 'Firma de webhook inválida' },
    });
  }

  next();
};

/**
 * @route   POST /api/webhooks/elevenlabs
 * @desc    Recibir webhook de ElevenLabs con datos de llamada
 * @access  Private (solo ElevenLabs)
 */
router.post('/elevenlabs', verifyElevenLabsWebhook, async (req, res, next) => {
  try {
    // Validar datos del webhook
    const { error, value } = elevenLabsWebhookSchema.validate(req.body);
    if (error) {
      console.error('Error de validación en webhook:', error.details);
      return res.status(400).json({
        success: false,
        error: { message: 'Datos del webhook inválidos' },
      });
    }

    const {
      call_id,
      phone_number,
      duration,
      transcript,
      data_collection,
      criteria_results,
      timestamp,
      status,
    } = value;

    // Verificar si ya existe una llamada con ese call_id
    const existingCall = await prisma.call.findUnique({
      where: { callId: call_id },
    });

    if (existingCall) {
      console.log(`Llamada duplicada recibida: ${call_id}`);
      return res.status(200).json({
        success: true,
        message: 'Llamada ya procesada anteriormente',
        callId: existingCall.id,
      });
    }

    // Procesar y guardar la llamada
    const newCall = await prisma.call.create({
      data: {
        callId: call_id,
        telefono: phone_number,
        duracion: duration,
        transcript: transcript,
        dataCollection: data_collection,
        criteriaResults: criteria_results,
        fecha: new Date(timestamp),
        status: status === 'completed' ? 'ACTIVE' : 'ARCHIVED',
      },
    });

    // Procesar derivaciones si existen en criteria_results
    if (criteria_results.derivations && Array.isArray(criteria_results.derivations)) {
      const derivations = criteria_results.derivations.map(derivation => ({
        callId: newCall.id,
        motivo: derivation.reason || 'Sin motivo especificado',
        descripcion: derivation.description || null,
        prioridad: derivation.priority || 'MEDIA',
      }));

      if (derivations.length > 0) {
        await prisma.derivation.createMany({
          data: derivations,
        });
      }
    }

    // Procesar reclamos si existen en criteria_results
    if (criteria_results.complaints && Array.isArray(criteria_results.complaints)) {
      const complaints = criteria_results.complaints.map(complaint => ({
        callId: newCall.id,
        tipo: complaint.type || 'OTRO',
        descripcion: complaint.description || 'Sin descripción',
        severidad: complaint.severity || 'MEDIA',
      }));

      if (complaints.length > 0) {
        await prisma.complaint.createMany({
          data: complaints,
        });
      }
    }

    console.log(`✅ Llamada procesada exitosamente: ${call_id}`);

    res.status(201).json({
      success: true,
      message: 'Llamada procesada exitosamente',
      data: {
        callId: newCall.id,
        elevenLabsCallId: call_id,
        status: newCall.status,
      },
    });
  } catch (error) {
    console.error('Error procesando webhook de ElevenLabs:', error);
    next(error);
  }
});

/**
 * @route   GET /api/webhooks/health
 * @desc    Endpoint de health check para webhooks
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint funcionando correctamente',
    timestamp: new Date().toISOString(),
    endpoints: {
      elevenlabs: 'POST /api/webhooks/elevenlabs',
    },
  });
});

/**
 * @route   POST /api/webhooks/test
 * @desc    Endpoint de prueba para simular webhook de ElevenLabs
 * @access  Public (solo en desarrollo)
 */
router.post('/test', async (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({
      success: false,
      error: { message: 'Endpoint no disponible en producción' },
    });
  }

  try {
    // Datos de prueba
    const testData = {
      call_id: `test_${Date.now()}`,
      phone_number: '+1234567890',
      duration: Math.floor(Math.random() * 300) + 60, // 1-6 minutos
      transcript: 'Hola, necesito ayuda con mi cuenta. Gracias por su tiempo.',
      data_collection: {
        customer_id: 'CUST123',
        agent_id: 'AGENT456',
        call_type: 'support',
        language: 'es',
      },
      criteria_results: {
        sentiment: 'positive',
        satisfaction_score: 8.5,
        derivations: [
          {
            reason: 'Consulta técnica',
            description: 'Cliente requiere asistencia técnica',
            priority: 'MEDIA',
          },
        ],
        complaints: [],
      },
      timestamp: new Date().toISOString(),
      status: 'completed',
    };

    // Simular el procesamiento del webhook
    const existingCall = await prisma.call.findUnique({
      where: { callId: testData.call_id },
    });

    if (existingCall) {
      return res.status(200).json({
        success: true,
        message: 'Llamada de prueba ya existe',
        data: existingCall,
      });
    }

    const newCall = await prisma.call.create({
      data: {
        callId: testData.call_id,
        telefono: testData.phone_number,
        duracion: testData.duration,
        transcript: testData.transcript,
        dataCollection: testData.data_collection,
        criteriaResults: testData.criteria_results,
        fecha: new Date(testData.timestamp),
        status: 'ACTIVE',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Llamada de prueba creada exitosamente',
      data: newCall,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 