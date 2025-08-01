const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../database/client');
const xlsx = require('xlsx');

const router = express.Router();

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
              failedCalls: true
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
router.get('/:id/batches/:batchId/contacts', async (req, res) => {
  try {
    const { id: campaignId, batchId } = req.params;
    const { page = 1, limit = 50, estado } = req.query;
    const skip = (page - 1) * limit;

    const where = { batchId };
    if (estado) {
      where.estado = estado;
    }

    const [contacts, total] = await Promise.all([
      prisma.outboundCall.findMany({
        where,
        select: {
          id: true,
          telefono: true,
          nombre: true,
          email: true,
          estado: true,
          intentos: true,
          resultado: true,
          fechaProgramada: true,
          fechaEjecutada: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.outboundCall.count({ where })
    ]);

    res.json({
      contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo contactos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 