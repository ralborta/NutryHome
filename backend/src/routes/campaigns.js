const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../database/client');
const xlsx = require('xlsx');

// Forzar runtime Node.js para evitar Edge Runtime
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const router = express.Router();

// ———— ENV saneado ————
const ELEVENLABS_API_KEY = (process.env.ELEVENLABS_API_KEY ?? '').trim();
const ELEVENLABS_PROJECT_ID = (process.env.ELEVENLABS_PROJECT_ID ?? '').trim(); // opcional
const ELEVENLABS_BASE_URL = ((process.env.ELEVENLABS_BASE_URL ?? 'https://api.elevenlabs.io').trim()).replace(/\/+$/, '');
const ELEVENLABS_AGENT_ID = (process.env.ELEVENLABS_AGENT_ID ?? '').trim().replace(/^=+/, '');
const ELEVENLABS_PHONE_NUMBER_ID = (process.env.ELEVENLABS_PHONE_NUMBER_ID ?? '').trim().replace(/^=+/, '');

// La validación se hace en validateElevenLabsConfig() cuando sea necesario

// ———— Normalizadores de teléfono ————
function toE164PlusAR(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/[^\d]/g, '');
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('54')) p = '54' + p;
  return '+' + p;
}

function dbPhoneKey(phone) {
  // para buscar en tu DB (sin '+')
  return String(phone).replace(/[^\d]/g, '').replace(/^0/, '').replace(/^(\d)$/, '$1').replace(/^\+/, '');
}

// ———— Fechas / casteos ————
function toYMD(input) {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

const NUMERIC_KEYS = new Set(['stock_teorico','cantidad1','cantidad2','cantidad3','cantidad4','cantidad5']);

function castValue(key, val) {
  if (val === null || typeof val === 'undefined') return '';
  if (NUMERIC_KEYS.has(key)) {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }
  return String(val);
}

function keepProduct(nombre, cantidad) {
  const n = (nombre ?? '').trim();
  if (!n || n.toUpperCase() === 'NA') return false;
  const c = Number(cantidad ?? 0);
  return Number.isFinite(c) && c > 0;
}

// ———— Builder de dynamic_variables (según tu modelo actual) ————
function buildDynamicVariables(contact) {
  const out = {
    nombre_contacto: contact.nombre_contacto ?? '',
    nombre_paciente: contact.nombre_paciente ?? '',
    domicilio_actual: contact.domicilio_actual ?? '',
    localidad: contact.localidad ?? '',
    delegacion: contact.delegacion ?? '',
    fecha_envio: toYMD(contact.fecha_envio),
    observaciones: contact.observaciones ?? '',
    stock_teorico: castValue('stock_teorico', contact.stock_teorico ?? ''),
  };

  for (let i = 1; i <= 5; i++) {
    const p = contact[`producto${i}`];
    const c = contact[`cantidad${i}`];
    const u = contact[`unidad${i}`]; // si la tenés
    if (keepProduct(p, c)) {
      out[`producto${i}`] = castValue(`producto${i}`, p);
      out[`cantidad${i}`] = castValue(`cantidad${i}`, c);
      if (u) out[`unidad${i}`] = String(u);
    }
  }
  return out;
}

// ———— Mapper al enum Prisma (ajusta a tu enum exacto si difiere) ————
function mapStatusToPrisma(s = '') {
  s = String(s).toLowerCase();
  if (['success','completed','answered','ok'].some(x=>s.includes(x))) return 'COMPLETED';
  if (['busy','line_busy'].some(x=>s.includes(x)))              return 'FAILED';
  if (['rejected','declined','blocked'].some(x=>s.includes(x)))return 'FAILED';
  if (['no_answer','timeout','ringout'].some(x=>s.includes(x)))return 'FAILED';
  if (['queued','processing','ongoing','in_progress','pending'].some(x=>s.includes(x))) return 'IN_PROGRESS';
  if (['failed','error'].some(x=>s.includes(x)))               return 'FAILED';
  return 'FAILED'; // fallback seguro para evitar "Invalid value for argument `estado`"
}

// ———— Parser defensivo del status de batch ————
function parseBatchResponse(raw) {
  const root = raw?.data || raw?.batch || raw || {};
  const rows = root.calls || root.recipients || root.results || root.items || [];
  const batchStatus = root.status || root.state || 'unknown';

  const normalized = Array.isArray(rows) ? rows.map(r => ({
    call_id:      r.call_id || r.id || r.callId || null,
    phone_number: toE164PlusAR(r.phone_number || r.to || r.recipient || r.phone || ''),
    status_raw:   r.status || r.state || r.result || 'unknown',
    status_norm:  mapStatusToPrisma(r.status || r.state || r.result || 'unknown'),
    duration_sec: Number(r.duration_sec ?? r.duration ?? r.call_duration ?? 0),
    started_at:   r.started_at || r.start_time || r.started || null,
    ended_at:     r.ended_at   || r.end_time   || r.ended   || null,
    _raw: r
  })) : [];

  return { batchStatus, rows: normalized };
}

// Validar configuración ElevenLabs
function validateElevenLabsConfig() {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY vacío');
  }
  if (!ELEVENLABS_AGENT_ID) {
    throw new Error('ELEVENLABS_AGENT_ID vacío');
  }
  if (!ELEVENLABS_PHONE_NUMBER_ID) {
    throw new Error('ELEVENLABS_PHONE_NUMBER_ID vacío');
  }
  return true;
}

// Función para ejecutar batch usando DB (tu función existente)
async function executeBatchWithElevenLabs(batchId) {
  try {
    // 1) Traer batch + contactos desde **tu DB**
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { contacts: true }
    });
    if (!batch) throw new Error('Batch no encontrado');
    if (batch.estado !== 'PENDING') throw new Error('Batch no está en estado pendiente');

    // 2) Armamos recipients desde contactos (DB → dynamic_variables correctas)
    const recipients = batch.contacts.map(contact => ({
      phone_number: toE164PlusAR(contact.phone_number),
      dynamic_variables: buildDynamicVariables(contact)
    }));

    // 3) Submit a ElevenLabs
    const fullUrl = `${ELEVENLABS_BASE_URL}/v1/convai/batch-calling/submit`;
    const body = {
      call_name: batch.nombre || `Entrega Médica - Batch ${batchId}`,
      agent_id: ELEVENLABS_AGENT_ID,
      agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
      scheduled_time_unix: Math.floor(Date.now() / 1000),
      recipients
    };
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        ...(ELEVENLABS_PROJECT_ID ? { 'xi-project-id': ELEVENLABS_PROJECT_ID } : {})
      },
      body: JSON.stringify(body)
    });
    const raw = await res.text();
    let data; try { data = JSON.parse(raw); } catch { data = { raw }; }
    if (!res.ok) throw new Error(`ElevenLabs API Error ${res.status}: ${JSON.stringify(data)}`);
    if (!data?.id) throw new Error('Respuesta ElevenLabs sin id');

    // 4) Guardar en DB: estado + id de ElevenLabs
    await prisma.batch.update({
      where: { id: batchId },
      data: { estado: 'PROCESSING', elevenLabsBatchId: data.id }
    });

    // 5) Pre-crear outboundCall por cada contacto (DB como fuente)
    const outboundCalls = batch.contacts.map(contact => ({
      batchId,
      contactId: contact.id,
      telefono: dbPhoneKey(contact.phone_number), // sin '+'
      estado: 'SCHEDULED',
      nombre: contact.nombre_paciente || contact.nombre_contacto || 'Sin nombre',
      intentos: 0
    }));
    await prisma.outboundCall.createMany({ data: outboundCalls });

    return { success: true, elevenLabsBatchId: data.id, total: recipients.length };
  } catch (err) {
    await prisma.batch.update({ where: { id: batchId }, data: { estado: 'FAILED', errorMessage: String(err) } });
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

// GET /campaigns/batch/:batchId/sync - Sincronizar estado del batch con ElevenLabs
router.get('/campaigns/batch/:batchId/sync', async (req, res) => {
  const { batchId } = req.params;
  try {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch?.elevenLabsBatchId) return res.status(400).json({ ok:false, error:'Falta elevenLabsBatchId' });

    const r = await fetch(`${ELEVENLABS_BASE_URL}/v1/convai/batch-calling/${batch.elevenLabsBatchId}`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        ...(ELEVENLABS_PROJECT_ID ? { 'xi-project-id': ELEVENLABS_PROJECT_ID } : {})
      }
    });
    const txt = await r.text();
    let json; try { json = JSON.parse(txt); } catch { json = { raw: txt }; }
    if (!r.ok) return res.status(r.status).json({ ok:false, payload: json });

    const { batchStatus, rows } = parseBatchResponse(json);

    for (const row of rows) {
      const whereByPhone = { batchId, telefono: dbPhoneKey(row.phone_number) };
      const data = {
        estado: mapStatusToPrisma(row.status_raw),
        duracion: row.duration_sec,
        fechaEjecutada: row.started_at ? new Date(row.started_at) : undefined,
        callId: row.call_id ?? undefined,
        resultado: row.status_raw
      };

      // intenta por call_id si ya existe
      if (row.call_id) {
        const updById = await prisma.outboundCall.updateMany({
          where: { ...whereByPhone, callId: row.call_id },
          data
        });
        if (updById.count > 0) continue;
      }

      // sino por phone (lo más confiable en este flujo)
      const updByPhone = await prisma.outboundCall.updateMany({ where: whereByPhone, data });
      if (updByPhone.count === 0) {
        // opcional: crear si no existía
        await prisma.outboundCall.create({
          data: { 
            batchId, 
            telefono: dbPhoneKey(row.phone_number), 
            estado: mapStatusToPrisma(row.status_raw),
            duracion: row.duration_sec,
            fechaEjecutada: row.started_at ? new Date(row.started_at) : undefined,
            callId: row.call_id ?? undefined,
            resultado: row.status_raw,
            nombre: 'Contacto sincronizado',
            intentos: 0
          }
        });
      }
    }

    await prisma.batch.update({
      where: { id: batchId },
      data: { estado: mapStatusToPrisma(batchStatus), updatedAt: new Date() }
    });

    const counts = rows.reduce((acc, r) => (acc[mapStatusToPrisma(r.status_raw)] = (acc[mapStatusToPrisma(r.status_raw)]||0) + 1, acc), {});
    res.json({ ok:true, batchId, batchStatus: mapStatusToPrisma(batchStatus), counts });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e) });
  }
});

// GET /campaigns/batch/:batchId/calls - Obtener llamadas de un batch específico
router.get('/campaigns/batch/:batchId/calls', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        contacts: true,
        outboundCalls: {
          include: {
            contact: {
              select: {
                nombre_contacto: true,
                nombre_paciente: true,
                phone_number: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        error: 'Batch no encontrado' 
      });
    }

    // Mapear las llamadas con información del contacto
    const callsWithContactInfo = batch.outboundCalls.map(call => ({
      id: call.id,
      telefono: call.telefono,
      estado: call.estado,
      duracion: call.duracion,
      fechaEjecutada: call.fechaEjecutada,
      resultado: call.resultado,
      intentos: call.intentos,
      callId: call.callId,
      variables: call.variables,
      createdAt: call.createdAt,
      contact: call.contact ? {
        nombre_contacto: call.contact.nombre_contacto,
        nombre_paciente: call.contact.nombre_paciente,
        phone_number: call.contact.phone_number
      } : null
    }));

    // Calcular estadísticas
    const totalCalls = batch.outboundCalls.length;
    const completedCalls = batch.outboundCalls.filter(call => call.estado === 'COMPLETED').length;
    const failedCalls = batch.outboundCalls.filter(call => call.estado === 'FAILED').length;
    const inProgressCalls = batch.outboundCalls.filter(call => call.estado === 'IN_PROGRESS').length;
    const pendingCalls = batch.outboundCalls.filter(call => call.estado === 'SCHEDULED').length;

    res.json({
      success: true,
      batch: {
        id: batch.id,
        nombre: batch.nombre,
        estado: batch.estado,
        elevenLabsBatchId: batch.elevenLabsBatchId,
        totalCalls,
        completedCalls,
        failedCalls,
        inProgressCalls,
        pendingCalls
      },
      calls: callsWithContactInfo,
      total: totalCalls
    });

  } catch (error) {
    console.error('Error obteniendo llamadas del batch:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contacta al administrador'
    });
  }
});

// GET /campaigns/batch/:batchId/status - Obtener estado del batch
router.get('/batch/:batchId/status', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { 
        contacts: true
      }
    });

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        error: 'Batch no encontrado' 
      });
    }

    // Calcular progreso basado en el estado del batch
    const totalContacts = batch.contacts.length;
    const completedCalls = batch.estado === 'COMPLETED' ? totalContacts : 0;
    const failedCalls = batch.estado === 'FAILED' ? totalContacts : 0;
    const inProgressCalls = batch.estado === 'PROCESSING' ? totalContacts : 0;
    const pendingCalls = batch.estado === 'PENDING' ? totalContacts : 0;
    
    const progress = totalContacts > 0 ? Math.round(((completedCalls + failedCalls) / totalContacts) * 100) : 0;

    // Obtener estado de ElevenLabs si está en progreso
    let elevenLabsStatus = null;
    if (batch.estado === 'PROCESSING') {
      try {
        // Por ahora usamos el estado del batch
        elevenLabsStatus = {
          calls: batch.contacts.map(contact => ({
            call_id: contact.id,
            status: 'queued',
            variables: contact
          }))
        };
      } catch (error) {
        console.warn('No se pudo obtener estado de ElevenLabs:', error.message);
      }
    }

    const response = {
      batchId: batch.id,
      status: batch.estado,
      progress,
      totalContacts,
      completedCalls,
      failedCalls,
      inProgressCalls,
      pendingCalls,
      calls: elevenLabsStatus?.calls || [],
      estimatedCompletion: batch.estado === 'PROCESSING' ? 
        new Date(Date.now() + (pendingCalls * 60000)) : undefined // Estimación: 1 minuto por llamada pendiente
    };

    res.json(response);

  } catch (error) {
    console.error('Error obteniendo estado del batch:', error);
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