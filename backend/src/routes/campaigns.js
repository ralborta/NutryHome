const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../database/client');
const xlsx = require('xlsx');

const router = express.Router();

// Configuración ElevenLabs
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io';
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const ELEVENLABS_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID;
const ELEVENLABS_PROJECT_ID = process.env.ELEVENLABS_PROJECT_ID;

// Validar configuración ElevenLabs
function validateElevenLabsConfig() {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY no configurada');
  }
  if (!ELEVENLABS_AGENT_ID) {
    throw new Error('ELEVENLABS_AGENT_ID no configurado');
  }
  if (!ELEVENLABS_PHONE_NUMBER_ID) {
    throw new Error('ELEVENLABS_PHONE_NUMBER_ID no configurado');
  }
  return true;
}

// Función para ejecutar batch con ElevenLabs
async function executeBatchWithElevenLabs(batchId) {
  try {
    validateElevenLabsConfig();
    
    // Obtener el batch y sus contactos
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { contacts: true }
    });

    if (!batch) {
      throw new Error(`Batch ${batchId} no encontrado`);
    }

    if (batch.estado !== 'PENDING') {
      throw new Error(`Batch ${batchId} no está en estado pendiente`);
    }

    // Actualizar estado del batch
    await prisma.batch.update({
      where: { id: batchId },
      data: { 
        estado: 'PROCESSING'
      }
    });

    // Preparar contactos para ElevenLabs (ahora se hace directamente en requestBody)

    // Crear request para ElevenLabs
    const requestBody = {
      call_name: batch.nombre || `Entrega Médica - Batch ${batchId}`,
      agent_id: ELEVENLABS_AGENT_ID,
      agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
      scheduled_time_unix: Math.floor(Date.now() / 1000),
      recipients: batch.contacts.map(contact => ({
        phone_number: formatPhoneNumber(contact.phone_number),
        dynamic_variables: prepareVariablesForElevenLabs(contact)
      }))
    };

    console.log(`🚀 Ejecutando batch ${batchId} con ${batch.contacts.length} contactos`);
    console.log(`🔑 Configuración ElevenLabs:`);
    console.log(`  - ELEVENLABS_BASE_URL: ${ELEVENLABS_BASE_URL}`);
    console.log(`  - ELEVENLABS_AGENT_ID: ${ELEVENLABS_AGENT_ID}`);
    console.log(`  - ELEVENLABS_PHONE_NUMBER_ID: ${ELEVENLABS_PHONE_NUMBER_ID}`);
    console.log(`  - ELEVENLABS_PROJECT_ID: ${ELEVENLABS_PROJECT_ID}`);
    console.log(`  - API Key: ${ELEVENLABS_API_KEY ? '✅ Configurada' : '❌ No configurada'}`);
    console.log(`  - Agent ID: ${ELEVENLABS_AGENT_ID ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`  - Phone Number ID: ${ELEVENLABS_PHONE_NUMBER_ID ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`  - Project ID: ${ELEVENLABS_PROJECT_ID ? '✅ Configurado' : '❌ No configurado'}`);

    // Test básico de conectividad - Verificar API key
    console.log(`🧪 Probando conectividad básica...`);
    try {
      const testResponse = await fetch(`${ELEVENLABS_BASE_URL}/v1/user`, {
        headers: { 'xi-api-key': ELEVENLABS_API_KEY }
      });
      console.log(`✅ API Key test status: ${testResponse.status}`);
      if (!testResponse.ok) {
        throw new Error(`API Key test failed: ${testResponse.status} - ${testResponse.statusText}`);
      }
      const userData = await testResponse.json();
      console.log(`✅ Usuario autenticado: ${userData.first_name || 'N/A'}`);
    } catch (error) {
      console.warn(`⚠️ API Key test warning: ${error.message}`);
    }

    // Llamar a ElevenLabs API
    const fullUrl = `${ELEVENLABS_BASE_URL}/v1/convai/batch-calling/submit`;
    console.log(`🔍 Debug URLs:`);
    console.log(`  - ELEVENLABS_BASE_URL: ${ELEVENLABS_BASE_URL}`);
    console.log(`  - URL completa: ${fullUrl}`);
    console.log(`  - API Key: ${ELEVENLABS_API_KEY?.substring(0, 10)}...`);
    console.log(`📡 Llamando a ElevenLabs API: ${fullUrl}`);
    console.log(`📋 Request body:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`ElevenLabs API Error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
    }

    const elevenLabsResponse = await response.json();
    console.log(`✅ Batch ${batchId} iniciado exitosamente en ElevenLabs:`, elevenLabsResponse);

    // Crear registros de llamadas en la base de datos
    const outboundCalls = batch.contacts.map(contact => ({
      batchId: batchId,
      contactId: contact.id,
      phoneNumber: contact.phone_number,
      estado: 'QUEUED',
      elevenlabsCallId: elevenLabsResponse.calls?.find(c => c.phone_number === formatPhoneNumber(contact.phone_number))?.call_id,
      variables: contact,
      retryCount: 0
    }));

    // Crear registros de llamadas en la base de datos
    await prisma.outboundCall.createMany({ data: outboundCalls });

    return {
      success: true,
      batchId: batchId,
      elevenLabsBatchId: elevenLabsResponse.id,
      totalCalls: batch.contacts.length,
      message: 'Batch ejecutado exitosamente'
    };

  } catch (error) {
    console.error(`❌ Error ejecutando batch ${batchId}:`, error);
    
    // Revertir estado del batch
    await prisma.batch.update({
      where: { id: batchId },
      data: { estado: 'FAILED' }
    });

    throw error;
  }
}

// Función para preparar variables para ElevenLabs
function prepareVariablesForElevenLabs(contact) {
  const variables = {
    nombre_contacto: contact.nombre_contacto || "",
    nombre_paciente: contact.nombre_paciente || "",
    domicilio_actual: contact.domicilio_actual || "",
    localidad: contact.localidad || "",
    delegacion: contact.delegacion || "",
    fecha_envio: formatDate(contact.fecha_envio) || "",
    observaciones: contact.observaciones || "",
    producto1: contact.producto1 || "",
    cantidad1: contact.cantidad1 || "",
    producto2: contact.producto2 || "",
    cantidad2: contact.cantidad2 || "",
    producto3: contact.producto3 || "",
    cantidad3: contact.cantidad3 || "",
    producto4: contact.producto4 || "",
    cantidad4: contact.cantidad4 || "",
    producto5: contact.producto5 || "",
    cantidad5: contact.cantidad5 || ""
  };

  // Asegurar que todas las variables estén presentes (ElevenLabs requiere todas)
  for (let i = 1; i <= 5; i++) {
    if (!variables[`producto${i}`]) variables[`producto${i}`] = "";
    if (!variables[`cantidad${i}`]) variables[`cantidad${i}`] = "";
  }

  return variables;
}

// Función para formatear número de teléfono
function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  let cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  if (!cleaned.startsWith('54') && !cleaned.startsWith('+54')) {
    cleaned = '54' + cleaned;
  }
  
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

// Función para formatear fecha
function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Fecha no especificada';
    }
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
      });
  } catch (error) {
    return 'Fecha no especificada';
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

// POST /campaigns/batch/:batchId/execute - Ejecutar un batch completo
router.post('/batch/:batchId/execute', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Ejecutar batch de forma asíncrona
    executeBatchWithElevenLabs(batchId)
      .then(result => {
        console.log(`✅ Batch ${batchId} ejecutado exitosamente:`, result);
      })
      .catch(error => {
        console.error(`❌ Error ejecutando batch ${batchId}:`, error);
      });

    res.json({ 
      success: true, 
      message: 'Ejecución del batch iniciada', 
      batchId: batchId, 
      status: 'PROCESSING' 
    });

  } catch (error) {
    console.error('Error iniciando ejecución del batch:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error iniciando ejecución del batch',
      details: error.message 
    });
  }
});

// GET /campaigns/batch/:id/status - Obtener estado del batch desde ElevenLabs
router.get('/batch/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const batch = await prisma.batch.findUnique({
      where: { id: id }
    });

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        error: 'Batch no encontrado' 
      });
    }

    // Si no tiene elevenLabsBatchId, no podemos obtener status
    if (!batch.elevenLabsBatchId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Batch no tiene ID de ElevenLabs' 
      });
    }

    // Obtener estado desde ElevenLabs
    const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/convai/batch-calling/${batch.elevenLabsBatchId}`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API Error: ${response.status} - ${response.statusText}`);
    }

    const elevenLabsData = await response.json();
    
    // Parsear progreso por destinatario
    const calls = elevenLabsData.calls || elevenLabsData.recipients || [];
    const progress = calls.map(call => ({
      phone_number: call.phone_number,
      status: call.status || call.state || 'unknown',
      duration: call.duration_sec || call.call_duration || 0,
      started_at: call.started_at || call.start_time,
      ended_at: call.ended_at || call.end_time
    }));

    res.json({
      success: true,
      batchId: id,
      elevenLabsBatchId: batch.elevenLabsBatchId,
      status: elevenLabsData.status || elevenLabsData.state,
      progress,
      totalCalls: calls.length,
      completedCalls: calls.filter(c => c.status === 'completed' || c.status === 'success').length,
      failedCalls: calls.filter(c => c.status === 'failed' || c.status === 'error').length,
      inProgressCalls: calls.filter(c => c.status === 'in_progress' || c.status === 'ongoing').length
    });

  } catch (error) {
    console.error('Error obteniendo estado del batch desde ElevenLabs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error obteniendo estado del batch',
      details: error.message 
    });
  }
});

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
        estado: { in: ['PENDING', 'QUEUED'] }
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

module.exports = router; 