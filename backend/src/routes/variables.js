const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../database/client');

const router = express.Router();

// Middleware de validación
const validateTemplate = [
  body('nombre').trim().isLength({ min: 1, max: 100 }).withMessage('El nombre es requerido y máximo 100 caracteres'),
  body('descripcion').optional().trim().isLength({ max: 500 }).withMessage('La descripción máximo 500 caracteres'),
  body('variables').isArray().withMessage('Las variables deben ser un array'),
  body('variables.*').isString().withMessage('Cada variable debe ser un string')
];

// GET /variables/templates - Listar todas las plantillas
router.get('/templates', async (req, res) => {
  try {
    const { page = 1, limit = 10, activo } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const [templates, total] = await Promise.all([
      prisma.variableTemplate.findMany({
        where,
        include: {
          _count: {
            select: {
              campaigns: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.variableTemplate.count({ where })
    ]);

    res.json({
      templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando plantillas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /variables/templates/:id - Obtener plantilla específica
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.variableTemplate.findUnique({
      where: { id },
      include: {
        campaigns: {
          select: {
            id: true,
            nombre: true,
            estado: true
          }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error obteniendo plantilla:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /variables/templates - Crear nueva plantilla
router.post('/templates', validateTemplate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, descripcion, variables } = req.body;

    const template = await prisma.variableTemplate.create({
      data: {
        nombre,
        descripcion,
        variables
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creando plantilla:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una plantilla con ese nombre' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /variables/templates/:id - Actualizar plantilla
router.put('/templates/:id', validateTemplate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nombre, descripcion, variables, activo } = req.body;

    const template = await prisma.variableTemplate.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        variables,
        activo
      }
    });

    res.json(template);
  } catch (error) {
    console.error('Error actualizando plantilla:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una plantilla con ese nombre' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /variables/templates/:id - Eliminar plantilla
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay campañas usando esta plantilla
    const campaignsUsingTemplate = await prisma.campaign.count({
      where: { variableTemplateId: id }
    });

    if (campaignsUsingTemplate > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la plantilla porque está siendo usada por campañas',
        campaignsCount: campaignsUsingTemplate
      });
    }

    await prisma.variableTemplate.delete({
      where: { id }
    });

    res.json({ message: 'Plantilla eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando plantilla:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /variables/available - Obtener variables disponibles
router.get('/available', async (req, res) => {
  try {
    const templates = await prisma.variableTemplate.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        variables: true
      }
    });

    // Extraer todas las variables únicas de todas las plantillas
    const allVariables = new Set();
    templates.forEach(template => {
      if (Array.isArray(template.variables)) {
        template.variables.forEach(variable => allVariables.add(variable));
      }
    });

    res.json({
      templates,
      allVariables: Array.from(allVariables).sort()
    });
  } catch (error) {
    console.error('Error obteniendo variables disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 