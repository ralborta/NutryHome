const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../database/client');
const xlsx = require('xlsx');
const {
  prepareTemplateVariablesFromContact: prepareVariablesForElevenLabs,
  formatPhoneNumberE164AR: formatPhoneNumber,
} = require('../lib/contactTemplateVariables');

const router = express.Router();

// ==== HARDEN ENVs ====
const RAW_BASE = (process.env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io").trim();
const ELEVENLABS_BASE_URL = RAW_BASE.replace(/\/+$/, "").replace(/\/v1$/, ""); // quita /v1 si vino mal

const ELEVENLABS_API_KEY = (process.env.ELEVENLABS_API_KEY || "").trim();
// 🔧 FUNCIÓN CLEANID ROBUSTA: normaliza IDs y avisa si venían mal
function cleanId(v) {
  const raw = String(v ?? '').trim();
  const cleaned = raw.replace(/^[='"\s]+/, ''); // quita =, comillas o espacios iniciales
  if (raw !== cleaned) {
    console.warn(`⚠️ [EL] ID con prefijo sospechoso normalizado: "${raw}" -> "${cleaned}"`);
  }
  return cleaned;
}

const ELEVENLABS_AGENT_ID = cleanId(process.env.ELEVENLABS_AGENT_ID);
const ELEVENLABS_PHONE_NUMBER_ID = cleanId(process.env.ELEVENLABS_PHONE_NUMBER_ID);
const ELEVENLABS_PROJECT_ID = (process.env.ELEVENLABS_PROJECT_ID || "").trim();

// ==== PREFLIGHT ====
async function assertElevenLabsConfig() {
  const h = { "xi-api-key": ELEVENLABS_API_KEY };
  const u = (p) => `${ELEVENLABS_BASE_URL}/v1${p.startsWith("/") ? p : `/${p}`}`;

  console.log('🔍 Verificando configuración ElevenLabs...');
  console.log('📋 Configuración actual:', {
    base_url: ELEVENLABS_BASE_URL,
    agent_id: ELEVENLABS_AGENT_ID,
    phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
    api_key_fp: ELEVENLABS_API_KEY ? `${ELEVENLABS_API_KEY.slice(0, 8)}...` : 'EMPTY'
  });
  console.log('🧹 Limpieza aplicada:', {
    agent_id_original: process.env.ELEVENLABS_AGENT_ID,
    agent_id_limpio: ELEVENLABS_AGENT_ID,
    phone_id_original: process.env.ELEVENLABS_PHONE_NUMBER_ID,
    phone_id_limpio: ELEVENLABS_PHONE_NUMBER_ID
  });
  
  console.log('🔍 1. Verificando settings...');
  const s = await fetch(u("/convai/settings"), { headers: h });
  console.log(`📥 Settings response: ${s.status} ${s.statusText}`);
  if (!s.ok) throw new Error(`XI key inválida o sin permisos (settings): ${s.status}`);

  console.log('🔍 2. Verificando agent...');
  const agentUrl = u(`/convai/agents/${ELEVENLABS_AGENT_ID}`);
  console.log(`📤 Agent URL: ${agentUrl}`);
  const ag = await fetch(agentUrl, { headers: h });
  console.log(`📥 Agent response: ${ag.status} ${ag.statusText}`);
  if (!ag.ok) throw new Error(`agent_id inaccesible con esta key (${ag.status})`);

  console.log('🔍 3. Verificando phone number...');
  const phoneUrl = u(`/convai/phone-numbers/${ELEVENLABS_PHONE_NUMBER_ID}`);
  console.log(`📤 Phone URL: ${phoneUrl}`);
  const pn = await fetch(phoneUrl, { headers: h });
  console.log(`📥 Phone response: ${pn.status} ${pn.statusText}`);
  if (!pn.ok) throw new Error(`phone_number_id inaccesible con esta key (${pn.status})`);
  
  console.log('✅ Configuración ElevenLabs validada - todos los permisos OK');
}

// 🔧 FUNCIÓN PARA VALIDAR CONFIGURACIÓN DE ELEVENLABS (mantener compatibilidad)
function validateElevenLabsConfig() {
  const requiredVars = {
    ELEVENLABS_API_KEY,
    ELEVENLABS_AGENT_ID,
    ELEVENLABS_PHONE_NUMBER_ID,
    ELEVENLABS_BASE_URL
  };
  
  const missing = Object.entries(requiredVars)
    .filter(([name, value]) => !value)
    .map(([name]) => name);
  
  if (missing.length > 0) {
    throw new Error(`❌ Configuración de ElevenLabs incompleta. Variables faltantes: ${missing.join(', ')}`);
  }
  
  // 🔍 VALIDACIÓN DE FORMATO: fallar temprano si los IDs están mal formados
  if (!/^agent_[A-Za-z0-9]+$/.test(ELEVENLABS_AGENT_ID)) {
    throw new Error(`❌ ELEVENLABS_AGENT_ID mal formado: "${ELEVENLABS_AGENT_ID}" (debe ser agent_...)`);
  }
  
  if (!/^phnum_[A-Za-z0-9]+$/.test(ELEVENLABS_PHONE_NUMBER_ID)) {
    throw new Error(`❌ ELEVENLABS_PHONE_NUMBER_ID mal formado: "${ELEVENLABS_PHONE_NUMBER_ID}" (debe ser phnum_...)`);
  }
  
  console.log('✅ Configuración de ElevenLabs validada');
}

// 🔧 FUNCIÓN PRINCIPAL CORREGIDA para ElevenLabs Batch Calling
async function executeBatchWithElevenLabs(batchId) {
  try {
    console.log(`🚀 Iniciando ejecución de batch ${batchId}`);
    
    // Validar configuración de ElevenLabs
    validateElevenLabsConfig();
    
    // 🔍 PREFLIGHT: Verificar permisos antes de enviar batch
    await assertElevenLabsConfig();
    
    // Obtener el batch y sus contactos
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { contacts: true }
    });

    if (!batch) {
      throw new Error(`Batch ${batchId} no encontrado`);
    }

    if (batch.estado !== 'PENDING') {
      throw new Error(`Batch ${batchId} no está en estado PENDING (estado actual: ${batch.estado})`);
    }

    if (!batch.contacts || batch.contacts.length === 0) {
      throw new Error(`Batch ${batchId} no tiene contactos asociados`);
    }

    console.log(`📞 Procesando ${batch.contacts.length} contactos`);

    // Actualizar estado del batch a PROCESSING
    await prisma.batch.update({
      where: { id: batchId },
      data: { 
        estado: 'PROCESSING',
        updatedAt: new Date()
      }
    });

    // 🔥 ESTRUCTURA CORREGIDA para ElevenLabs API
    const requestBody = {
      call_name: batch.nombre || `Entrega Médica - Batch ${batchId}`,
      agent_id: ELEVENLABS_AGENT_ID,
      agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
      scheduled_time_unix: Math.floor(Date.now() / 1000), // Timestamp actual
      recipients: batch.contacts.map(contact => {
        const dynamicVars = prepareVariablesForElevenLabs(contact);
        return {
        phone_number: formatPhoneNumber(contact.phone_number),
          conversation_initiation_client_data: {
            type: "conversation_initiation_client_data",
            dynamic_variables: dynamicVars
            // opcional:
            // conversation_config_override: {
            //   agent: { language: "es" }
            // }
          }
        };
      })
    };

    console.log(`📤 Enviando request a ElevenLabs:`, {
      call_name: requestBody.call_name,
      agent_id: requestBody.agent_id,
      agent_phone_number_id: requestBody.agent_phone_number_id,
      recipients_count: requestBody.recipients.length,
      first_recipient_sample: requestBody.recipients[0] || {}
    });

    // Llamar a ElevenLabs API
    const fullUrl = `${ELEVENLABS_BASE_URL}/v1/convai/batch-calling/submit`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        'User-Agent': 'MedicalDelivery/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📥 ElevenLabs response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ ElevenLabs API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData,
        requestBody: JSON.stringify(requestBody, null, 2)
      });
      
      throw new Error(`ElevenLabs API Error: ${response.status} - ${errorData.detail || errorData.message || 'Unknown error'}`);
    }

    const elevenLabsResponse = await response.json();
    console.log(`✅ ElevenLabs response:`, elevenLabsResponse);

    // Crear registros de llamadas en la base de datos
    const outboundCallsData = batch.contacts.map((contact, index) => {
      // Buscar el call_id correspondiente en la respuesta
      const elevenLabsCall = elevenLabsResponse.calls?.find(
        call => call.phone_number === formatPhoneNumber(contact.phone_number)
      );

      return {
      batchId: batchId,
      contactId: contact.id,
        telefono: contact.phone_number, // ✅ CAMPO CORRECTO DEL SCHEMA
        estado: 'PENDING', // ✅ ENUM CORRECTO DEL SCHEMA
        elevenlabsCallId: elevenLabsCall?.call_id || null,
        variables: contact, // Guardar las variables originales
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    // Insertar las llamadas en la base de datos
    await prisma.outboundCall.createMany({ 
      data: outboundCallsData,
      skipDuplicates: true
    });

    // Actualizar el batch con el ID de ElevenLabs
    await prisma.batch.update({
      where: { id: batchId },
      data: { 
        estado: 'PROCESSING',
        elevenLabsBatchId: elevenLabsResponse.batch_id || elevenLabsResponse.id,
        updatedAt: new Date()
      }
    });

    console.log(`🎉 Batch ${batchId} ejecutado exitosamente`);

    return {
      success: true,
      batchId: batchId,
      elevenLabsBatchId: elevenLabsResponse.batch_id || elevenLabsResponse.id,
      totalCalls: batch.contacts.length,
      callsCreated: outboundCallsData.length,
      message: 'Batch ejecutado exitosamente con ElevenLabs'
    };

  } catch (error) {
    console.error(`❌ Error ejecutando batch ${batchId}:`, error);
    
    // Actualizar batch a estado FAILED
    try {
    await prisma.batch.update({
      where: { id: batchId },
        data: { 
          estado: 'FAILED',
          updatedAt: new Date()
        }
    });
    } catch (updateError) {
      console.error('Error actualizando batch a FAILED:', updateError);
    }

    throw error;
  }
}

/**
 * Batch WhatsApp / Builderbot: mismas variables por contacto que ElevenLabs (`dynamic_variables`).
 * Despacho opcional vía POST a WHATSAPP_BATCH_DISPATCH_URL o BUILDERBOT_BATCH_DISPATCH_URL.
 */
async function executeBatchWhatsApp(batchId) {
  const dispatchUrl = (
    process.env.WHATSAPP_BATCH_DISPATCH_URL ||
    process.env.BUILDERBOT_BATCH_DISPATCH_URL ||
    ''
  ).trim();

  console.log(
    `📱 Ejecutando batch WhatsApp ${batchId} — URL despacho: ${dispatchUrl ? 'sí' : 'no (solo log + COMPLETED)'}`,
  );

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { contacts: true },
  });

  if (!batch) {
    throw new Error(`Batch ${batchId} no encontrado`);
  }
  if (batch.estado !== 'PENDING') {
    throw new Error(`Batch ${batchId} no está en estado PENDING (estado actual: ${batch.estado})`);
  }
  if (!batch.contacts || batch.contacts.length === 0) {
    throw new Error(`Batch ${batchId} no tiene contactos asociados`);
  }

  await prisma.batch.update({
    where: { id: batchId },
    data: { estado: 'PROCESSING', updatedAt: new Date() },
  });

  const recipients = batch.contacts.map((contact) => ({
    phone_number: formatPhoneNumber(contact.phone_number),
    variables: prepareVariablesForElevenLabs(contact),
    contactId: contact.id,
  }));

  const payload = {
    channel: 'WHATSAPP',
    batchId: batch.id,
    batchName: batch.nombre || `Batch ${batchId}`,
    recipients,
    meta: {
      builderbotProjectId: process.env.BUILDERBOT_PROJECT_ID || null,
    },
  };

  try {
    if (dispatchUrl) {
      const headers = { 'Content-Type': 'application/json' };
      const secret = (process.env.WHATSAPP_BATCH_DISPATCH_SECRET || '').trim();
      if (secret) {
        headers['x-nutryhome-dispatch-secret'] = secret;
      }

      const response = await fetch(dispatchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Dispatch HTTP ${response.status}: ${text.slice(0, 400)}`);
      }
    } else {
      console.log(
        `📱 Payload WhatsApp batch (${recipients.length} destinos). Configurá WHATSAPP_BATCH_DISPATCH_URL para enviar a tu worker/Builderbot.`,
      );
      console.log(JSON.stringify({ ...payload, recipientsSample: recipients.slice(0, 2) }));
    }

    await prisma.batch.update({
      where: { id: batchId },
      data: {
        estado: 'COMPLETED',
        totalCalls: batch.contacts.length,
        completedCalls: batch.contacts.length,
        failedCalls: 0,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      batchId,
      message: dispatchUrl
        ? 'Batch WhatsApp despachado al endpoint configurado'
        : 'Batch WhatsApp: variables generadas (sin URL de despacho)',
      totalRecipients: recipients.length,
    };
  } catch (err) {
    console.error(`❌ executeBatchWhatsApp ${batchId}:`, err);
    try {
      await prisma.batch.update({
        where: { id: batchId },
        data: { estado: 'FAILED', updatedAt: new Date() },
      });
    } catch (e2) {
      console.error('Error marcando batch FAILED:', e2);
    }
    throw err;
  }
}

// Configuración de multer para archivos Excel y CSV
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    
    const hasValidMime = allowedMimes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (hasValidMime || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Middleware de validación
const validateCampaign = [
  body('nombre').trim().isLength({ min: 1, max: 100 }).withMessage('El nombre es requerido y máximo 100 caracteres'),
  body('descripcion').optional().trim().isLength({ max: 500 }).withMessage('La descripción máximo 500 caracteres'),
  body('fechaInicio').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  body('fechaFin').optional().isISO8601().withMessage('Fecha de fin inválida')
];

const validateBatch = [
  body('nombre').trim().isLength({ min: 1, max: 100 }).withMessage('El nombre es requerido y máximo 100 caracteres'),
  body('campaignId').isUUID().withMessage('ID de campaña inválido')
];

// GET /campaigns - Listar todas las campañas
router.get('/', async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    try {
      await prisma.$connect();
    } catch (dbError) {
      console.error('Error conectando a la base de datos:', dbError);
      return res.status(503).json({ 
        error: 'Servicio de base de datos no disponible',
        details: process.env.NODE_ENV === 'development' ? dbError.message : 'Contacta al administrador'
      });
    }

    const { page = 1, limit = 10, estado } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (estado) {
      where.estado = estado;
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true
            }
          },
          batches: {
            select: {
              id: true,
              nombre: true,
              estado: true,
              totalCalls: true,
              completedCalls: true,
              failedCalls: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              batches: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.campaign.count({ where })
    ]);

    res.json({
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando campañas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /campaigns/:id - Obtener campaña específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        },
        batches: {
          include: {
            outboundCalls: {
              select: {
                id: true,
                telefono: true,
                nombre: true,
                estado: true,
                resultado: true,
                fechaEjecutada: true
              }
            }
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Error obteniendo campaña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /campaigns - Crear nueva campaña
router.post('/', validateCampaign, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, descripcion, fechaInicio, fechaFin } = req.body;
    
    // TODO: Obtener el usuario actual del token JWT
    const createdById = req.user?.id || 'default-user-id';

    const campaign = await prisma.campaign.create({
      data: {
        nombre,
        descripcion,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        createdById
      },
      include: {
        createdBy: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creando campaña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /campaigns/:id - Actualizar campaña
router.put('/:id', validateCampaign, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nombre, descripcion, fechaInicio, fechaFin, estado } = req.body;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        estado
      },
      include: {
        createdBy: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        }
      }
    });

    res.json(campaign);
  } catch (error) {
    console.error('Error actualizando campaña:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /campaigns/:id - Eliminar campaña
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.campaign.delete({
      where: { id }
    });

    res.json({ message: 'Campaña eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando campaña:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /campaigns/:id/batches - Crear batch para una campaña
router.post('/:id/batches', validateBatch, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id: campaignId } = req.params;
    const { nombre } = req.body;

    // Verificar que la campaña existe
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }

    const batch = await prisma.batch.create({
      data: {
        nombre,
        campaignId
      },
      include: {
        campaign: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    res.status(201).json(batch);
  } catch (error) {
    console.error('Error creando batch:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /campaigns/:id/batches/:batchId/upload - Cargar archivo Excel/CSV con contactos
router.post('/:id/batches/:batchId/upload', upload.single('file'), async (req, res) => {
  try {
    const { id: campaignId, batchId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo Excel o CSV requerido' });
    }

    // Verificar que la campaña y batch existen
    const [campaign, batch] = await Promise.all([
      prisma.campaign.findUnique({ 
        where: { id: campaignId },
        include: { variableTemplate: true }
      }),
      prisma.batch.findUnique({ where: { id: batchId } })
    ]);

    if (!campaign || !batch) {
      return res.status(404).json({ error: 'Campaña o batch no encontrado' });
    }

    if (batch.campaignId !== campaignId) {
      return res.status(400).json({ error: 'El batch no pertenece a esta campaña' });
    }

    const contacts = [];
    const errors = [];
    const availableVariables = campaign.variableTemplate?.variables || [];

    // Determinar tipo de archivo y procesar
    const fileExtension = req.file.originalname.toLowerCase();
    const isExcel = fileExtension.endsWith('.xlsx') || fileExtension.endsWith('.xls');

    if (isExcel) {
      // Procesar archivo Excel
      try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        // Obtener headers (primera fila)
        const headers = rows[0];
        const dataRows = rows.slice(1);

        dataRows.forEach((row, index) => {
          // Convertir fila a objeto usando headers
          const rowData = {};
          headers.forEach((header, colIndex) => {
            rowData[header] = row[colIndex] || '';
          });

          // Validar campos requeridos
          if (!rowData.telefono && !rowData.phone_number) {
            errors.push(`Fila ${index + 2} sin teléfono: ${JSON.stringify(rowData)}`);
            return;
          }

          // Obtener teléfono (puede ser 'telefono' o 'phone_number')
          const telefono = String(rowData.telefono || rowData.phone_number || '').replace(/\D/g, '');
          if (telefono.length < 10) {
            errors.push(`Fila ${index + 2}: Teléfono inválido: ${rowData.telefono || rowData.phone_number}`);
            return;
          }

          // Extraer variables dinámicas
          const variables = {};
          availableVariables.forEach(variable => {
            if (rowData[variable] !== undefined && rowData[variable] !== '' && rowData[variable] !== null) {
              variables[variable] = String(rowData[variable]);
            }
          });

          contacts.push({
            telefono,
            nombre: rowData.nombre || rowData.nombre_contacto || null,
            email: rowData.email || null,
            variables: Object.keys(variables).length > 0 ? variables : null
          });
        });

        // Eliminar archivo temporal
        fs.unlinkSync(req.file.path);

        if (contacts.length === 0) {
          return res.status(400).json({ 
            error: 'No se encontraron contactos válidos en el archivo Excel',
            errors 
          });
        }

        // Crear llamadas outbound en batch
        const outboundCalls = await prisma.outboundCall.createMany({
          data: contacts.map(contact => ({
            batchId,
            telefono: contact.telefono,
            nombre: contact.nombre,
            email: contact.email,
            variables: contact.variables
          }))
        });

        // Actualizar estadísticas del batch
        await prisma.batch.update({
          where: { id: batchId },
          data: {
            totalCalls: contacts.length
          }
        });

        res.json({
          message: `${contacts.length} contactos cargados correctamente desde Excel`,
          totalCalls: contacts.length,
          errors: errors.length > 0 ? errors : undefined
        });

      } catch (error) {
        console.error('Error procesando archivo Excel:', error);
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Error procesando archivo Excel' });
      }
    } else {
      // Procesar archivo CSV
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          // Validar campos requeridos
          if (!row.telefono && !row.phone_number) {
            errors.push(`Fila sin teléfono: ${JSON.stringify(row)}`);
            return;
          }

          // Obtener teléfono (puede ser 'telefono' o 'phone_number')
          const telefono = (row.telefono || row.phone_number || '').replace(/\D/g, '');
          if (telefono.length < 10) {
            errors.push(`Teléfono inválido: ${row.telefono || row.phone_number}`);
            return;
          }

          // Extraer variables dinámicas del CSV
          const variables = {};
          availableVariables.forEach(variable => {
            if (row[variable] !== undefined && row[variable] !== '') {
              variables[variable] = row[variable];
            }
          });

          contacts.push({
            telefono,
            nombre: row.nombre || row.nombre_contacto || null,
            email: row.email || null,
            variables: Object.keys(variables).length > 0 ? variables : null
          });
        })
        .on('end', async () => {
          try {
            // Eliminar archivo temporal
            fs.unlinkSync(req.file.path);

            if (contacts.length === 0) {
              return res.status(400).json({ 
                error: 'No se encontraron contactos válidos en el archivo CSV',
                errors 
              });
            }

            // Crear llamadas outbound en batch
            const outboundCalls = await prisma.outboundCall.createMany({
              data: contacts.map(contact => ({
                batchId,
                telefono: contact.telefono,
                nombre: contact.nombre,
                email: contact.email,
                variables: contact.variables
              }))
            });

            // Actualizar estadísticas del batch
            await prisma.batch.update({
              where: { id: batchId },
              data: {
                totalCalls: contacts.length
              }
            });

            res.json({
              message: `${contacts.length} contactos cargados correctamente desde CSV`,
              totalCalls: contacts.length,
              errors: errors.length > 0 ? errors : undefined
            });

          } catch (error) {
            console.error('Error procesando contactos CSV:', error);
            res.status(500).json({ error: 'Error procesando contactos CSV' });
          }
        })
        .on('error', (error) => {
          console.error('Error leyendo CSV:', error);
          fs.unlinkSync(req.file.path);
          res.status(500).json({ error: 'Error procesando archivo CSV' });
        });
    }

  } catch (error) {
    console.error('Error en upload de contactos:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /campaigns/:id/batches/:batchId/contacts - Obtener contactos de un batch
router.get('/:campaignId/batches/:batchId/contacts', async (req, res) => {
  try {
    const { campaignId, batchId } = req.params;

    // Verificar que la campaña existe
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }

    // Verificar que el batch existe y pertenece a la campaña
    const batch = await prisma.batch.findFirst({
      where: { 
        id: batchId,
        campaignId: campaignId
      }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch no encontrado' });
    }

    // Obtener los contactos del batch usando la nueva tabla Contact
    const contacts = await prisma.contact.findMany({
      where: { batchId: batchId },
      select: {
        id: true,
        nombre_contacto: true,
        nombre_paciente: true,
        phone_number: true,
        domicilio_actual: true,
        localidad: true,
        delegacion: true,
        fecha_envio: true,
        producto1: true,
        cantidad1: true,
        producto2: true,
        cantidad2: true,
        producto3: true,
        cantidad3: true,
        producto4: true,
        cantidad4: true,
        producto5: true,
        cantidad5: true,
        observaciones: true,
        prioridad: true,
        estado_pedido: true,
        estado_llamada: true,
        resultado_llamada: true,
        fecha_llamada: true,
        duracion_llamada: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Procesar los contactos con la nueva estructura
    const processedContacts = contacts.map(contact => {
      return {
        id: contact.id,
        nombre: contact.nombre_paciente || contact.nombre_contacto || 'Sin nombre',
        telefono: contact.phone_number,
        nombre_contacto: contact.nombre_contacto,
        nombre_paciente: contact.nombre_paciente,
        domicilio_actual: contact.domicilio_actual,
        localidad: contact.localidad,
        delegacion: contact.delegacion,
        fecha_envio: contact.fecha_envio,
        producto1: contact.producto1,
        cantidad1: contact.cantidad1,
        producto2: contact.producto2,
        cantidad2: contact.cantidad2,
        producto3: contact.producto3,
        cantidad3: contact.cantidad3,
        producto4: contact.producto4,
        cantidad4: contact.cantidad4,
        producto5: contact.producto5,
        cantidad5: contact.cantidad5,
        observaciones: contact.observaciones,
        prioridad: contact.prioridad,
        estado_pedido: contact.estado_pedido,
        estado_llamada: contact.estado_llamada,
        resultado_llamada: contact.resultado_llamada,
        fecha_llamada: contact.fecha_llamada,
        duracion_llamada: contact.duracion_llamada,
        createdAt: contact.createdAt
      };
    });

    res.json({
      success: true,
      batch: {
        id: batch.id,
        nombre: batch.nombre,
        estado: batch.estado,
        totalCalls: batch.totalCalls,
        completedCalls: batch.completedCalls,
        failedCalls: batch.failedCalls
      },
      contacts: processedContacts,
      total: processedContacts.length
    });

  } catch (error) {
    console.error('Error obteniendo contactos del batch:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contacta al administrador'
    });
  }
});

// POST /campaigns/upload - Subir archivo CSV/Excel directamente (crea batch automáticamente)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    console.log('Archivo recibido:', req.file.originalname);

    // Obtener nombre personalizado del batch desde el body
    const batchName = req.body.batchName || `Batch ${new Date().toLocaleDateString()} - ${req.file.originalname}`;

    // Crear una campaña por defecto si no existe
    let defaultCampaign = await prisma.campaign.findFirst({
      where: { nombre: 'Campaña General' }
    });

    if (!defaultCampaign) {
      // Buscar o crear usuario por defecto
      let defaultUser = await prisma.user.findFirst({
        where: { email: 'admin@nutryhome.com' }
      });

      if (!defaultUser) {
        defaultUser = await prisma.user.create({
          data: {
            nombre: 'Administrador',
            apellido: 'NutryHome',
            email: 'admin@nutryhome.com',
            password: 'admin123',
            rol: 'ADMIN',
            activo: true
          }
        });
      }

      defaultCampaign = await prisma.campaign.create({
        data: {
          nombre: 'Campaña General',
          descripcion: 'Campaña por defecto para cargas directas',
          estado: 'ACTIVE',
          createdById: defaultUser.id
        }
      });
    }

    // Crear un batch con nombre personalizado
    const batch = await prisma.batch.create({
      data: {
        nombre: batchName,
        campaignId: defaultCampaign.id,
        estado: 'PENDING',
        totalCalls: 0,
        completedCalls: 0,
        failedCalls: 0
      }
    });

    // Procesar el archivo usando la lógica existente
    const contacts = [];
    const errors = [];

    // Determinar tipo de archivo y procesar
    const fileExtension = req.file.originalname.toLowerCase();
    const isExcel = fileExtension.endsWith('.xlsx') || fileExtension.endsWith('.xls');

    if (isExcel) {
      // Procesar archivo Excel
      try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        // Obtener headers (primera fila)
        const headers = rows[0];
        const dataRows = rows.slice(1);

        dataRows.forEach((row, index) => {
          // Convertir fila a objeto usando headers
          const rowData = {};
          headers.forEach((header, colIndex) => {
            rowData[header] = row[colIndex] || '';
          });

          // Validar campos requeridos
          if (!rowData.telefono && !rowData.phone_number) {
            errors.push(`Fila ${index + 2} sin teléfono: ${JSON.stringify(rowData)}`);
            return;
          }

          // Obtener teléfono (puede ser 'telefono' o 'phone_number')
          const telefono = String(rowData.telefono || rowData.phone_number || '').replace(/\D/g, '');
          if (telefono.length < 10) {
            errors.push(`Fila ${index + 2}: Teléfono inválido: ${rowData.telefono || rowData.phone_number}`);
            return;
          }

          // Extraer todas las variables dinámicas
          const variables = {};
          headers.forEach(header => {
            if (header !== 'telefono' && header !== 'phone_number' && header !== 'nombre' && header !== 'email') {
              if (rowData[header] !== undefined && rowData[header] !== '' && rowData[header] !== null) {
                variables[header] = String(rowData[header]);
              }
            }
          });

          contacts.push({
            telefono,
            nombre: rowData.nombre || rowData.nombre_contacto || null,
            email: rowData.email || null,
            variables: Object.keys(variables).length > 0 ? variables : null
          });
        });

        // Eliminar archivo temporal
        fs.unlinkSync(req.file.path);

        if (contacts.length === 0) {
          return res.status(400).json({ 
            error: 'No se encontraron contactos válidos en el archivo Excel',
            errors 
          });
        }

        // Crear contactos en la nueva tabla Contact
        console.log('🔍 DEBUG: Intentando crear contactos:', {
          batchId: batch.id,
          totalContacts: contacts.length,
          sampleContact: contacts[0]
        });

        try {
          const createdContacts = await prisma.contact.createMany({
            data: contacts.map(contact => {
              // Mapear variables del Excel a la nueva estructura
              const variables = contact.variables || {};
              const contactData = {
                batchId: batch.id,
                phone_number: contact.telefono,
                nombre_contacto: variables.nombre_contacto || contact.nombre || null,
                nombre_paciente: variables.nombre_paciente || contact.nombre || null,
                domicilio_actual: variables.domicilio_actual || null,
                localidad: variables.localidad || null,
                delegacion: variables.delegacion || null,
                fecha_envio: (() => {
                  if (!variables.fecha_envio) return null;
                  const date = new Date(variables.fecha_envio);
                  return isNaN(date.getTime()) ? null : date;
                })(),
                producto1: variables.producto1 || null,
                cantidad1: variables.cantidad1 || null,
                producto2: variables.producto2 || null,
                cantidad2: variables.cantidad2 || null,
                producto3: variables.producto3 || null,
                cantidad3: variables.cantidad3 || null,
                producto4: variables.producto4 || null,
                cantidad4: variables.cantidad4 || null,
                producto5: variables.producto5 || null,
                cantidad5: variables.cantidad5 || null,
                observaciones: variables.observaciones || null,
                prioridad: variables.prioridad || 'MEDIA',
                estado_pedido: variables.estado_pedido || 'PENDIENTE',
                estado_llamada: 'PENDIENTE'
              };
              
              console.log('🔍 DEBUG: Contacto a crear:', contactData);
              return contactData;
            })
          });
          
          console.log('✅ DEBUG: Contactos creados exitosamente:', createdContacts);
        } catch (error) {
          console.error('❌ DEBUG: Error creando contactos:', error);
          throw error;
        }

        // Actualizar estadísticas del batch
        await prisma.batch.update({
          where: { id: batch.id },
          data: {
            totalCalls: contacts.length
          }
        });

        res.json({
          message: `${contacts.length} contactos cargados correctamente desde Excel`,
          totalCalls: contacts.length,
          errors: errors.length > 0 ? errors : undefined,
          batchId: batch.id
        });

      } catch (error) {
        console.error('Error procesando Excel:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Error procesando archivo Excel' });
      }
    } else {
      // Procesar CSV
      const results = [];
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', async () => {
          try {
            results.forEach((row, index) => {
              // Validar campos requeridos
              if (!row.telefono && !row.phone_number) {
                errors.push(`Fila ${index + 2} sin teléfono: ${JSON.stringify(row)}`);
                return;
              }

              // Obtener teléfono
              const telefono = String(row.telefono || row.phone_number || '').replace(/\D/g, '');
              if (telefono.length < 10) {
                errors.push(`Fila ${index + 2}: Teléfono inválido: ${row.telefono || row.phone_number}`);
                return;
              }

              // Extraer variables dinámicas
              const variables = {};
              Object.keys(row).forEach(key => {
                if (key !== 'telefono' && key !== 'phone_number' && key !== 'nombre' && key !== 'email') {
                  if (row[key] !== undefined && row[key] !== '' && row[key] !== null) {
                    variables[key] = String(row[key]);
                  }
                }
              });

              contacts.push({
                telefono,
                nombre: row.nombre || row.nombre_contacto || null,
                email: row.email || null,
                variables: Object.keys(variables).length > 0 ? variables : null
              });
            });

            // Eliminar archivo temporal
            fs.unlinkSync(req.file.path);

            if (contacts.length === 0) {
              return res.status(400).json({ 
                error: 'No se encontraron contactos válidos en el archivo CSV',
                errors 
              });
            }

            // Crear contactos en la nueva tabla Contact
            console.log('🔍 DEBUG CSV: Intentando crear contactos:', {
              batchId: batch.id,
              totalContacts: contacts.length,
              sampleContact: contacts[0]
            });

            try {
              const createdContacts = await prisma.contact.createMany({
                data: contacts.map(contact => {
                  // Mapear variables del CSV a la nueva estructura
                  const variables = contact.variables || {};
                  const contactData = {
                    batchId: batch.id,
                    phone_number: contact.telefono,
                    nombre_contacto: variables.nombre_contacto || contact.nombre || null,
                    nombre_paciente: variables.nombre_paciente || contact.nombre || null,
                    domicilio_actual: variables.domicilio_actual || null,
                    localidad: variables.localidad || null,
                    delegacion: variables.delegacion || null,
                    fecha_envio: (() => {
                      if (!variables.fecha_envio) return null;
                      const date = new Date(variables.fecha_envio);
                      return isNaN(date.getTime()) ? null : date;
                    })(),
                    producto1: variables.producto1 || null,
                    cantidad1: variables.cantidad1 || null,
                    producto2: variables.producto2 || null,
                    cantidad2: variables.cantidad2 || null,
                    producto3: variables.producto3 || null,
                    cantidad3: variables.cantidad3 || null,
                    producto4: variables.producto4 || null,
                    cantidad4: variables.cantidad4 || null,
                    producto5: variables.producto5 || null,
                    cantidad5: variables.cantidad5 || null,
                    observaciones: variables.observaciones || null,
                    prioridad: variables.prioridad || 'MEDIA',
                    estado_pedido: variables.estado_pedido || 'PENDIENTE',
                    estado_llamada: 'PENDIENTE'
                  };
                  
                  console.log('🔍 DEBUG CSV: Contacto a crear:', contactData);
                  return contactData;
                })
              });
              
              console.log('✅ DEBUG CSV: Contactos creados exitosamente:', createdContacts);
            } catch (error) {
              console.error('❌ DEBUG CSV: Error creando contactos:', error);
              throw error;
            }

            // Actualizar estadísticas del batch
            await prisma.batch.update({
              where: { id: batch.id },
              data: {
                totalCalls: contacts.length
              }
            });

            res.json({
              message: `${contacts.length} contactos cargados correctamente desde CSV`,
              totalCalls: contacts.length,
              errors: errors.length > 0 ? errors : undefined,
              batchId: batch.id
            });

          } catch (error) {
            console.error('Error procesando contactos CSV:', error);
            res.status(500).json({ error: 'Error procesando contactos CSV' });
          }
        })
        .on('error', (error) => {
          console.error('Error leyendo CSV:', error);
          fs.unlinkSync(req.file.path);
          res.status(500).json({ error: 'Error procesando archivo CSV' });
        });
    }

  } catch (error) {
    console.error('Error en upload directo:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /campaigns/:id/contacts - Obtener contactos de una campaña (endpoint simple)
router.get('/:campaignId/contacts', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Verificar que la campaña existe
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        batches: {
          include: {
            contacts: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }

    // Obtener todos los contactos de todos los batches de la campaña
    const allContacts = [];
    campaign.batches.forEach(batch => {
      batch.contacts.forEach(contact => {
        allContacts.push({
          id: contact.id,
          batchId: batch.id,
          batchName: batch.nombre,
          nombre: contact.nombre_paciente || contact.nombre_contacto || 'Sin nombre',
          telefono: contact.phone_number,
          nombre_contacto: contact.nombre_contacto,
          nombre_paciente: contact.nombre_paciente,
          domicilio_actual: contact.domicilio_actual,
          localidad: contact.localidad,
          delegacion: contact.delegacion,
          fecha_envio: contact.fecha_envio,
          producto1: contact.producto1,
          cantidad1: contact.cantidad1,
          producto2: contact.producto2,
          cantidad2: contact.cantidad2,
          producto3: contact.producto3,
          cantidad3: contact.cantidad3,
          producto4: contact.producto4,
          cantidad4: contact.cantidad4,
          producto5: contact.producto5,
          cantidad5: contact.cantidad5,
          observaciones: contact.observaciones,
          prioridad: contact.prioridad,
          estado_pedido: contact.estado_pedido,
          estado_llamada: contact.estado_llamada,
          resultado_llamada: contact.resultado_llamada,
          fecha_llamada: contact.fecha_llamada,
          duracion_llamada: contact.duracion_llamada,
          createdAt: contact.createdAt
        });
      });
    });

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        nombre: campaign.nombre,
        estado: campaign.estado
      },
      contacts: allContacts,
      total: allContacts.length
    });

  } catch (error) {
    console.error('Error obteniendo contactos de la campaña:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contacta al administrador'
    });
  }
});

// 🔧 ENDPOINT PARA EJECUTAR BATCH
router.post('/batch/:batchId/execute', async (req, res) => {
  try {
    const { batchId } = req.params;
    const channel = String(req.body?.channel || 'VOICE').toUpperCase();
    const useWhatsApp = channel === 'WHATSAPP' || channel === 'MESSAGES';

    console.log(
      `🎯 Recibida solicitud para ejecutar batch: ${batchId} (channel=${useWhatsApp ? 'WHATSAPP' : 'VOICE'})`,
    );
    
    // Verificar que el batch existe antes de procesar
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { _count: { select: { contacts: true } } }
    });
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch no encontrado',
        batchId: batchId
      });
    }
    
    if (batch.estado === 'PROCESSING') {
      return res.status(400).json({
        success: false,
        error: 'El batch ya está siendo procesado',
        batchId: batchId,
        currentStatus: batch.estado
      });
    }
    
    res.json({
      success: true,
      message: 'Ejecución del batch iniciada',
      batchId,
      status: 'PROCESSING',
      totalContacts: batch._count.contacts,
      channel: useWhatsApp ? 'WHATSAPP' : 'VOICE',
    });
    
    const run = useWhatsApp ? executeBatchWhatsApp(batchId) : executeBatchWithElevenLabs(batchId);

    run
      .then(async (result) => {
        console.log(`✅ Batch ${batchId} completado exitosamente:`, result);

        if (!useWhatsApp) {
          try {
            console.log(`🔄 Iniciando sync automático para batch ${batchId}...`);
            await syncBatchWithElevenLabs(batchId);
            console.log(`✅ Sync automático completado para batch ${batchId}`);
          } catch (syncError) {
            console.error(`⚠️ Error en sync automático para batch ${batchId}:`, syncError);
          }
        }
      })
      .catch((error) => {
        console.error(`❌ Error ejecutando batch ${batchId}:`, error);
      });

  } catch (error) {
    console.error('❌ Error iniciando ejecución del batch:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error iniciando ejecución del batch',
      details: error.message 
    });
  }
});

// 🔧 ENDPOINT PARA OBTENER ESTADO DEL BATCH
router.get('/batch/:batchId/status', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { 
        _count: {
          select: {
            contacts: true,
            outboundCalls: true
          }
        },
        outboundCalls: {
          select: {
            estado: true,
            elevenlabsCallId: true
          }
        }
      }
    });

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        error: 'Batch no encontrado' 
      });
    }

    // Calcular estadísticas
    const callStats = batch.outboundCalls.reduce((acc, call) => {
      acc[call.estado] = (acc[call.estado] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      success: true,
      batch: {
        id: batch.id,
        nombre: batch.nombre,
        estado: batch.estado,
        elevenLabsBatchId: batch.elevenLabsBatchId,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
        totalContacts: batch._count.contacts,
        totalCalls: batch._count.outboundCalls,
        callStats
      }
    });
    
      } catch (error) {
    console.error('❌ Error obteniendo estado del batch:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado del batch',
      details: error.message
    });
  }
});

// 🔄 FUNCIÓN PARA SINCRONIZAR BATCH CON ELEVENLABS (reutilizable)
async function syncBatchWithElevenLabs(batchId) {
  try {
    console.log(`🔄 Iniciando sincronización del batch ${batchId}`);
    
    // Obtener el batch
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { outboundCalls: true }
    });
    
    if (!batch) {
      throw new Error('Batch no encontrado');
    }
    
    if (!batch.elevenLabsBatchId) {
      throw new Error('Batch no tiene elevenLabsBatchId');
    }
    
    console.log(`🔍 Sincronizando batch ElevenLabs: ${batch.elevenLabsBatchId}`);
    
    // 1️⃣ Obtener estado del batch desde ElevenLabs
    const batchResponse = await fetch(`${ELEVENLABS_BASE_URL}/v1/convai/batch-calling/${batch.elevenLabsBatchId}`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });
    
    if (!batchResponse.ok) {
      throw new Error(`ElevenLabs batch API error: ${batchResponse.status}`);
    }
    
    const batchData = await batchResponse.json();
    console.log(`📥 Batch data desde ElevenLabs:`, batchData);
    
    // 2️⃣ Obtener conversaciones para este batch
    const conversationsResponse = await fetch(`${ELEVENLABS_BASE_URL}/v1/convai/conversations?batch_id=${batch.elevenLabsBatchId}`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });
    
    if (!conversationsResponse.ok) {
      throw new Error(`ElevenLabs conversations API error: ${conversationsResponse.status}`);
    }
    
    const conversationsData = await conversationsResponse.json();
    console.log(`📥 Conversations data:`, conversationsData);
    
    // 3️⃣ Obtener detalles completos de cada conversación
    const detailedConversations = [];
    for (const conversation of conversationsData.conversations || []) {
      try {
        console.log(`🔍 Obteniendo detalles de conversación: ${conversation.conversation_id}`);
        
        // Obtener detalles completos de la conversación
        const detailResponse = await fetch(`${ELEVENLABS_BASE_URL}/v1/convai/conversations/${conversation.conversation_id}`, {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY
          }
        });
        
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          detailedConversations.push({
            ...conversation,
            ...detailData
          });
          console.log(`✅ Detalles obtenidos para: ${conversation.conversation_id}`);
        } else {
          console.warn(`⚠️ No se pudieron obtener detalles para: ${conversation.conversation_id}`);
          detailedConversations.push(conversation);
        }
      } catch (detailError) {
        console.error(`❌ Error obteniendo detalles de conversación:`, detailError);
        detailedConversations.push(conversation);
      }
    }
    
    // 4️⃣ Actualizar cada llamada con los datos completos de ElevenLabs
    let updatedCalls = 0;
    let failedCalls = 0;
    
    for (const conversation of detailedConversations) {
      try {
        // Buscar la llamada por phone_number
        const phoneNumber = conversation.phone_number;
        const outboundCall = batch.outboundCalls.find(call => 
          formatPhoneNumber(call.telefono) === phoneNumber
        );
        
        if (outboundCall) {
          // Actualizar con datos COMPLETOS de ElevenLabs
          await prisma.outboundCall.update({
            where: { id: outboundCall.id },
            data: {
              estado: mapElevenLabsStatus(conversation.status),
              elevenlabsCallId: conversation.conversation_id,
              resultado: conversation.summary?.text || conversation.status,
              duracion: conversation.duration || 0,
              fechaEjecutada: conversation.created_at ? new Date(conversation.created_at) : null,
              resumen: conversation.summary?.text || null,
              transcriptCompleto: conversation.transcript || null,
              variablesDinamicas: conversation.dynamic_variables || null,
              audioUrl: conversation.audio_url || null
            }
          });
          
          updatedCalls++;
          console.log(`✅ Llamada actualizada: ${outboundCall.id}`);
        }
      } catch (updateError) {
        console.error(`❌ Error actualizando llamada:`, updateError);
        failedCalls++;
      }
    }
    
    // 5️⃣ Actualizar estado del batch
    const batchStatus = batchData.status || 'unknown';
    await prisma.batch.update({
      where: { id: batchId },
      data: { estado: mapElevenLabsStatus(batchStatus) }
    });
    
    console.log(`✅ Sync completado: ${updatedCalls} llamadas actualizadas, ${failedCalls} fallidas`);
    return { success: true, updatedCalls, failedCalls };
    
      } catch (error) {
    console.error(`❌ Error en sync automático:`, error);
    throw error;
  }
}

// 🔄 ENDPOINT PARA SINCRONIZAR CON ELEVENLABS
router.get('/batch/:batchId/sync', async (req, res) => {
  try {
    const { batchId } = req.params;
    const result = await syncBatchWithElevenLabs(batchId);
    
    res.json({
      success: true,
      message: `Batch ${batchId} sincronizado exitosamente`,
      data: result
    });

  } catch (error) {
    console.error(`❌ Error en sync manual:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      batchId: req.params.batchId
    });
  }
});

// 🚀 SYNC MANUAL INDIVIDUAL (para batches antiguos)
router.post('/batch/:batchId/sync-manual', async (req, res) => {
  try {
    const batchId = req.params.batchId;
    console.log(`🔄 Sync manual solicitado para batch: ${batchId}`);
    
    const result = await syncBatchWithElevenLabs(batchId);
    
    res.json({ 
      success: true, 
      message: `Batch ${batchId} sincronizado manualmente`,
      data: result 
    });
    
  } catch (error) {
    console.error(`❌ Error en sync manual:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      batchId: req.params.batchId
    });
  }
});

// 📡 SYNC STREAM CON SERVER-SENT EVENTS (para frontend sin CORS)
router.get('/batch/:batchId/sync-stream', async (req, res) => {
  const batchId = req.params.batchId;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  try {
    console.log(`🔄 Sync stream iniciado para batch: ${batchId}`);
    res.write('data: {"status":"syncing","message":"Iniciando sincronización..."}\n\n');
    
    const result = await syncBatchWithElevenLabs(batchId);
    
    res.write(`data: ${JSON.stringify({status:"completed", message:"Sincronización completada", data:result})}\n\n`);
    console.log(`✅ Sync stream completado para batch: ${batchId}`);
    
  } catch (error) {
    console.error(`❌ Error en sync stream:`, error);
    res.write(`data: ${JSON.stringify({status:"error", message:"Error en sincronización", error:error.message})}\n\n`);
  }
  
  res.end();
});

// 🔧 FUNCIÓN PARA MAPEAR ESTADOS DE ELEVENLABS A PRISMA
function mapElevenLabsStatus(elevenLabsStatus) {
  const status = String(elevenLabsStatus || '').toLowerCase();
  
  if (['completed', 'success', 'answered'].includes(status)) return 'COMPLETED';
  if (['failed', 'error'].includes(status)) return 'FAILED';
  if (['in_progress', 'ongoing'].includes(status)) return 'IN_PROGRESS';
  if (['pending', 'queued'].includes(status)) return 'PENDING';
  if (['cancelled', 'canceled'].includes(status)) return 'CANCELLED';
  
  return 'FAILED'; // fallback
}

// POST /campaigns/batch/:batchId/cancel - Cancelar un batch en progreso
router.post('/batch/:batchId/cancel', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await prisma.batch.findUnique({
      where: { id: batchId }
    });

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        error: 'Batch no encontrado' 
      });
    }

    if (batch.estado !== 'PROCESSING') {
      return res.status(400).json({ 
        success: false, 
        error: 'Solo se pueden cancelar batches en progreso' 
      });
    }

    // Intentar cancelar en ElevenLabs
    try {
      // validateElevenLabsConfig(); // This function is not defined in the original file, so it's commented out
      
      const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/batch-calls/${batchId}/cancel`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      });

      if (response.ok) {
        console.log(`✅ Batch ${batchId} cancelado en ElevenLabs`);
      }
    } catch (error) {
      console.warn('No se pudo cancelar en ElevenLabs:', error.message);
    }

    // Actualizar estado en la base de datos
    await prisma.batch.update({
      where: { id: batchId },
      data: { 
        estado: 'CANCELLED'
      }
    });

    // Cancelar llamadas pendientes
    await prisma.outboundCall.updateMany({
      where: { 
        batchId: batchId,
        estado: { in: ['PENDING', 'SCHEDULED'] } // ✅ ENUMS CORRECTOS DEL SCHEMA
      },
      data: { estado: 'CANCELLED' }
    });

    res.json({ 
      success: true, 
      message: `Batch ${batchId} cancelado exitosamente` 
    });

  } catch (error) {
    console.error('Error cancelando batch:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error cancelando batch',
      details: error.message 
    });
  }
});

// GET /campaigns/batch/:batchId/contacts - Obtener contactos de un batch específico
router.get('/batch/:batchId/contacts', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const contacts = await prisma.contact.findMany({
      where: { batchId: batchId },
      orderBy: { createdAt: 'asc' }
    });

    res.json(contacts);
  } catch (error) {
    console.error('Error obteniendo contactos del batch:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error obteniendo contactos del batch' 
    });
  }
});

// DELETE /campaigns/batch/:batchId - Borrar un batch y todos sus contactos
router.delete('/batch/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;

    // Verificar que el batch existe
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        contacts: true,
        outboundCalls: true
      }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch no encontrado' });
    }

    // Verificar que no hay llamadas en progreso
    const hasActiveCalls = batch.outboundCalls.some(call => 
      call.estado === 'IN_PROGRESS' || call.estado === 'SCHEDULED'
    );

    if (hasActiveCalls) {
      return res.status(400).json({ 
        error: 'No se puede borrar un batch con llamadas en progreso o programadas' 
      });
    }

    // Borrar el batch (esto borrará automáticamente contactos y llamadas por las relaciones en cascada)
    await prisma.batch.delete({
      where: { id: batchId }
    });

    res.json({
      success: true,
      message: `Batch "${batch.nombre}" eliminado correctamente`,
      deletedItems: {
        batch: 1,
        contacts: batch.contacts.length,
        outboundCalls: batch.outboundCalls.length
      }
    });

  } catch (error) {
    console.error('Error eliminando batch:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contacta al administrador'
    });
  }
});

// GET /campaigns/test-elevenlabs - Test de configuración de ElevenLabs
router.get('/test-elevenlabs', async (req, res) => {
  try {
    validateElevenLabsConfig();
    
    console.log('🧪 Probando configuración de ElevenLabs...');
    
    // Test Agent ID
    console.log('🔍 Probando Agent ID...');
    const agentResponse = await fetch(`${ELEVENLABS_BASE_URL}/v1/agents`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });
    
    if (!agentResponse.ok) {
      throw new Error(`Agent API Error: ${agentResponse.status} - ${agentResponse.statusText}`);
    }
    
    const agents = await agentResponse.json();
    const targetAgent = agents.find(agent => agent.agent_id === ELEVENLABS_AGENT_ID);
    
    // Test Phone Numbers
    console.log('🔍 Probando Phone Numbers...');
    const phoneResponse = await fetch(`${ELEVENLABS_BASE_URL}/v1/phone-numbers`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });
    
    if (!phoneResponse.ok) {
      throw new Error(`Phone Numbers API Error: ${phoneResponse.status} - ${phoneResponse.statusText}`);
    }
    
    const phoneNumbers = await phoneResponse.json();
    const targetPhone = phoneNumbers.find(phone => phone.phone_number_id === ELEVENLABS_PHONE_NUMBER_ID);
    
    res.json({
      success: true,
      message: 'Configuración de ElevenLabs verificada correctamente',
      config: {
        baseUrl: ELEVENLABS_BASE_URL,
        agentId: ELEVENLABS_AGENT_ID,
        phoneNumberId: ELEVENLABS_PHONE_NUMBER_ID,
        projectId: ELEVENLABS_PROJECT_ID
      },
      testResults: {
        agent: targetAgent ? {
          found: true,
          name: targetAgent.name,
          status: targetAgent.status
        } : {
          found: false,
          availableAgents: agents.map(a => ({ id: a.agent_id, name: a.name }))
        },
        phoneNumber: targetPhone ? {
          found: true,
          number: targetPhone.phone_number,
          status: targetPhone.status
        } : {
          found: false,
          availableNumbers: phoneNumbers.map(p => ({ id: p.phone_number_id, number: p.phone_number }))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test de ElevenLabs:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando configuración de ElevenLabs',
      details: error.message
    });
  }
});

// ==== ENDPOINT DE DIAGNÓSTICO ====
router.get("/internal/diag/elevenlabs", async (_req, res) => {
  try {
    validateElevenLabsConfig();
    await assertElevenLabsConfig();
    return res.json({ 
      ok: true, 
      base_url: ELEVENLABS_BASE_URL,
      env: process.env.NODE_ENV,
      message: 'Configuración ElevenLabs validada correctamente'
    });
  } catch (e) {
    return res.status(500).json({ 
      ok: false, 
      error: String(e?.message || e),
      env: process.env.NODE_ENV
    });
  }
});

// 🎯 ENDPOINT SUPER SIMPLE: Obtener datos de ElevenLabs por batch
router.get('/batch/:batchId/elevenlabs-data', async (req, res) => {
  try {
    const { batchId } = req.params;
    console.log(`🔍 Consultando historial de ElevenLabs para batch: ${batchId}`);
    
    // 1️⃣ TRAER TODO EL HISTORIAL DE ELEVENLABS
    const historyResponse = await fetch('https://api.elevenlabs.io/v1/history', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });
    
    if (!historyResponse.ok) {
      throw new Error(`ElevenLabs API error: ${historyResponse.status}`);
    }
    
    const history = await historyResponse.json();
    console.log(`📥 Historial obtenido: ${history.history?.length || 0} items`);
    
    // 2️⃣ FILTRAR POR BATCH ID (o como los identifiques)
    const batchItems = history.history?.filter(item => {
      // Buscar por request_id, text, o cualquier campo que identifique tu batch
      return item.request_id === batchId || 
             item.text?.includes(`batch-${batchId}`) ||
             item.metadata?.batch_id === batchId;
    }) || [];
    
    console.log(`🎯 Items encontrados para batch ${batchId}: ${batchItems.length}`);
    
    // 3️⃣ OBTENER DETALLES COMPLETOS DE CADA ITEM
    const detailedItems = [];
    for (const item of batchItems) {
      try {
        // Obtener detalles completos del item
        const detailResponse = await fetch(`https://api.elevenlabs.io/v1/history/${item.history_item_id}`, {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY
          }
        });
        
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          detailedItems.push({
            ...item,
            ...detailData,
            audioUrl: `https://api.elevenlabs.io/v1/history/${item.history_item_id}/audio`
          });
        } else {
          detailedItems.push(item);
        }
      } catch (detailError) {
        console.warn(`⚠️ Error obteniendo detalles de item:`, detailError);
        detailedItems.push(item);
      }
    }
    
    res.json({
      success: true,
      message: `Datos obtenidos para batch ${batchId}`,
      batchId,
      totalItems: batchItems.length,
      data: detailedItems
    });
    
  } catch (error) {
    console.error(`❌ Error consultando ElevenLabs:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      batchId: req.params.batchId
    });
  }
});

// 🎯 ENDPOINT PARA UNA LLAMADA ESPECÍFICA
router.get('/calls/:callId/elevenlabs-info', async (req, res) => {
  try {
    const { callId } = req.params;
    
    // Buscar la llamada en la base de datos
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId }
    });
    
    if (!call) {
      return res.status(404).json({ error: 'Llamada no encontrada' });
    }
    
    if (!call.elevenlabsCallId) {
      return res.status(404).json({ error: 'No tiene ID de ElevenLabs' });
    }
    
    // 🎯 CONSULTA DIRECTA A ELEVENLABS
    const response = await fetch(
      `https://api.elevenlabs.io/v1/history/${call.elevenlabsCallId}`,
      { 
        headers: { 
          'xi-api-key': process.env.ELEVENLABS_API_KEY 
        } 
      }
    );
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }
    
    const conversationData = await response.json();
    
    res.json({
      success: true,
      callId,
      elevenlabsCallId: call.elevenlabsCallId,
      data: conversationData,
      audioUrl: `https://api.elevenlabs.io/v1/history/${call.elevenlabsCallId}/audio`
    });
    
  } catch (error) {
    console.error(`❌ Error obteniendo info de llamada:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      callId: req.params.callId
    });
  }
});

// 🎯 FUNCIÓN PARA OBTENER BATCH DE ELEVENLABS
async function getBatch(batchId) {
  try {
    const response = await fetch(`${process.env.ELEVENLABS_BASE_URL}/v1/convai/batch-calling/${batchId}`, {
      headers: { 
        "xi-api-key": process.env.ELEVENLABS_API_KEY 
      }
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs batch API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Error obteniendo batch:`, error);
    throw error;
  }
}

// 🎯 FUNCIÓN PARA OBTENER CONVERSACIÓN INDIVIDUAL
async function getConversation(convId) {
  try {
    const response = await fetch(`${process.env.ELEVENLABS_BASE_URL}/v1/convai/conversations/${convId}`, {
      headers: { 
        "xi-api-key": process.env.ELEVENLABS_API_KEY 
      }
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs conversation API error: ${response.status}`);
    }
    
    return await response.json(); // status, dynamic_variables, analysis, transcript, etc.
  } catch (error) {
    console.error(`❌ Error obteniendo conversación:`, error);
    throw error;
  }
}

// 🎯 ENDPOINT PARA OBTENER RESUMEN DEL BATCH (FRONTEND LEE TU DB)
router.get('/batch/:batchId/summary', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // 1️⃣ OBTENER BATCH DE TU DB
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { 
        outboundCalls: {
          select: {
            id: true,
            telefono: true,
            estado: true,
            elevenlabsCallId: true,
            resultado: true,
            duracion: true,
            fechaEjecutada: true,
            resumen: true,
            transcriptCompleto: true,
            variablesDinamicas: true,
            audioUrl: true
          }
        }
      }
    });
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch no encontrado' });
    }
    
    // 2️⃣ CALCULAR ESTADÍSTICAS
    const totalCalls = batch.outboundCalls.length;
    const completedCalls = batch.outboundCalls.filter(call => call.estado === 'COMPLETADA').length;
    const failedCalls = batch.outboundCalls.filter(call => call.estado === 'FALLIDA').length;
    const pendingCalls = batch.outboundCalls.filter(call => call.estado === 'PENDIENTE').length;
    
    res.json({
      success: true,
      batchId,
      batchName: batch.nombre,
      estado: batch.estado,
      totalCalls,
      completedCalls,
      failedCalls,
      pendingCalls,
      calls: batch.outboundCalls
    });
    
  } catch (error) {
    console.error(`❌ Error obteniendo resumen del batch:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      batchId: req.params.batchId
    });
  }
});

// 🎯 ENDPOINT PARA ACTUALIZAR BATCH DESDE ELEVENLABS (POLLING)
router.post('/batch/:batchId/update-from-elevenlabs', async (req, res) => {
  try {
    const { batchId } = req.params;
    console.log(`🔄 Actualizando batch ${batchId} desde ElevenLabs...`);
    
    // 1️⃣ OBTENER BATCH DE ELEVENLABS
    const batch = await prisma.batch.findUnique({
      where: { id: batchId }
    });
    
    if (!batch || !batch.elevenLabsBatchId) {
      return res.status(400).json({ error: 'Batch no tiene elevenLabsBatchId' });
    }
    
    // 2️⃣ POLLING AL BATCH DE ELEVENLABS
    const elevenLabsBatch = await getBatch(batch.elevenLabsBatchId);
    console.log(`📥 Batch obtenido de ElevenLabs:`, elevenLabsBatch);
    
    // 3️⃣ OBTENER CONVERSACIONES DEL BATCH
    const conversationsResponse = await fetch(
      `${process.env.ELEVENLABS_BASE_URL}/v1/convai/conversations?batch_id=${batch.elevenLabsBatchId}`,
      { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } }
    );
    
    if (!conversationsResponse.ok) {
      throw new Error(`ElevenLabs conversations API error: ${conversationsResponse.status}`);
    }
    
    const conversations = await conversationsResponse.json();
    console.log(`📥 Conversaciones obtenidas:`, conversations.conversations?.length || 0);
    
    // 4️⃣ ACTUALIZAR CADA LLAMADA CON DATOS COMPLETOS
    let updatedCalls = 0;
    for (const conversation of conversations.conversations || []) {
      try {
        // Obtener detalles completos de la conversación
        const conversationDetails = await getConversation(conversation.conversation_id);
        
        // Buscar la llamada por phone_number
        const outboundCall = await prisma.outboundCall.findFirst({
          where: { 
            batchId: batchId,
            telefono: { contains: conversation.phone_number.replace('+', '') }
          }
        });
        
        if (outboundCall) {
          // Actualizar con datos COMPLETOS de ElevenLabs
          await prisma.outboundCall.update({
            where: { id: outboundCall.id },
            data: {
              estado: conversation.status === 'completed' ? 'COMPLETADA' : 
                     conversation.status === 'failed' ? 'FALLIDA' : 'PENDIENTE',
              elevenlabsCallId: conversation.conversation_id,
              resultado: conversationDetails.analysis?.call_result || 'UNKNOWN',
              duracion: conversationDetails.metadata?.call_duration_secs || 0,
              fechaEjecutada: conversationDetails.metadata?.start_time_unix_secs ? 
                new Date(conversationDetails.metadata.start_time_unix_secs * 1000) : null,
              
              // 🔄 DATOS COMPLETOS DE LA CONVERSACIÓN
              resumen: conversationDetails.analysis?.summary || null,
              transcriptCompleto: conversationDetails.transcript || null,
              variablesDinamicas: conversationDetails.dynamic_variables || null,
              audioUrl: conversationDetails.audio_url || null,
              
              updatedAt: new Date()
            }
          });
          
          updatedCalls++;
          console.log(`✅ Llamada actualizada: ${outboundCall.id}`);
        }
      } catch (callError) {
        console.error(`❌ Error actualizando llamada:`, callError);
      }
    }
    
    // 5️⃣ ACTUALIZAR ESTADO DEL BATCH
    await prisma.batch.update({
      where: { id: batchId },
      data: { 
        estado: elevenLabsBatch.status === 'completed' ? 'COMPLETADO' : 
               elevenLabsBatch.status === 'failed' ? 'FALLIDO' : 'EN_PROCESO',
        updatedAt: new Date()
      }
    });
    
    console.log(`🎉 Batch ${batchId} actualizado: ${updatedCalls} llamadas actualizadas`);
    
    res.json({
      success: true,
      message: `Batch ${batchId} actualizado desde ElevenLabs`,
      batchId,
      updatedCalls,
      totalConversations: conversations.conversations?.length || 0
    });
    
  } catch (error) {
    console.error(`❌ Error actualizando batch desde ElevenLabs:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      batchId: req.params.batchId
    });
  }
});

module.exports = router; 