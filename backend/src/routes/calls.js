const express = require('express');
const Joi = require('joi');
const { prisma } = require('../database/client');

const router = express.Router();

// Esquemas de validación
const createCallSchema = Joi.object({
  telefono: Joi.string().required().min(1).max(20),
  batchId: Joi.string().required(),
  estado: Joi.string().valid('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'FALLIDA').default('PENDIENTE'),
  resultado: Joi.string(),
  duracion: Joi.number().integer().min(0),
  transcriptCompleto: Joi.string(),
  resumen: Joi.string(),
  variablesDinamicas: Joi.object(),
});

const updateCallSchema = Joi.object({
  telefono: Joi.string().min(1).max(20),
  batchId: Joi.string(),
  estado: Joi.string().valid('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'FALLIDA'),
  resultado: Joi.string(),
  duracion: Joi.number().integer().min(0),
  transcriptCompleto: Joi.string(),
  resumen: Joi.string(),
  variablesDinamicas: Joi.object(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  estado: Joi.string().valid('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'FALLIDA'),
  telefono: Joi.string(),
  fechaDesde: Joi.date().iso(),
  fechaHasta: Joi.date().iso(),
  sortBy: Joi.string().valid('fechaEjecutada', 'duracion', 'createdAt').default('fechaEjecutada'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * @route   GET /api/calls
 * @desc    Obtener lista de llamadas con paginación y filtros
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    // Validar query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const {
      page,
      limit,
      estado,
      telefono,
      fechaDesde,
      fechaHasta,
      sortBy,
      sortOrder,
    } = value;

    // Construir filtros
    const where = {};
    if (estado) where.estado = estado;
    if (telefono) where.telefono = { contains: telefono, mode: 'insensitive' };
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
      if (fechaHasta) where.createdAt.lte = new Date(fechaHasta);
    }

    // Calcular offset
    const offset = (page - 1) * limit;

    // Obtener llamadas con relaciones
    const [calls, total] = await Promise.all([
      prisma.outboundCall.findMany({
        where,
        include: {
          batch: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      }),
      prisma.outboundCall.count({ where }),
    ]);

    // Calcular métricas
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        calls,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/calls/:id
 * @desc    Obtener detalle de una llamada específica
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const call = await prisma.outboundCall.findUnique({
      where: { id },
      include: {
        batch: true,
      },
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        error: { message: 'Llamada no encontrada' },
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/calls
 * @desc    Crear una nueva llamada manualmente
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    // Validar datos de entrada
    const { error, value } = createCallSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const {
      callId,
      telefono,
      duracion,
      transcript,
      dataCollection,
      criteriaResults,
    } = value;

    // Verificar si ya existe una llamada con ese callId
    const existingCall = await prisma.call.findUnique({
      where: { callId },
    });

    if (existingCall) {
      return res.status(409).json({
        success: false,
        error: { message: 'Ya existe una llamada con ese ID' },
      });
    }

    // Crear la llamada
    const newCall = await prisma.call.create({
      data: {
        callId,
        telefono,
        duracion,
        transcript,
        dataCollection,
        criteriaResults,
      },
      include: {
        derivations: true,
        complaints: true,
      },
    });

    res.status(201).json({
      success: true,
      data: newCall,
      message: 'Llamada creada exitosamente',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/calls/:id
 * @desc    Actualizar una llamada existente
 * @access  Public
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error, value } = updateCallSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    // Verificar si la llamada existe
    const existingCall = await prisma.call.findUnique({
      where: { id },
    });

    if (!existingCall) {
      return res.status(404).json({
        success: false,
        error: { message: 'Llamada no encontrada' },
      });
    }

    // Actualizar la llamada
    const updatedCall = await prisma.call.update({
      where: { id },
      data: value,
      include: {
        derivations: true,
        complaints: true,
      },
    });

    res.json({
      success: true,
      data: updatedCall,
      message: 'Llamada actualizada exitosamente',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/calls/:id
 * @desc    Eliminar una llamada (soft delete)
 * @access  Public
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar si la llamada existe
    const existingCall = await prisma.call.findUnique({
      where: { id },
    });

    if (!existingCall) {
      return res.status(404).json({
        success: false,
        error: { message: 'Llamada no encontrada' },
      });
    }

    // Soft delete - cambiar status a DELETED
    await prisma.call.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    res.json({
      success: true,
      message: 'Llamada eliminada exitosamente',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 