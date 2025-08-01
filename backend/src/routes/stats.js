const express = require('express');
const Joi = require('joi');
const { prisma } = require('../database/client');
const moment = require('moment');

const router = express.Router();

// Esquemas de validación
const dateRangeSchema = Joi.object({
  fechaDesde: Joi.date().iso().default(() => moment().subtract(30, 'days').toISOString()),
  fechaHasta: Joi.date().iso().default(() => moment().toISOString()),
});

/**
 * @route   GET /api/stats/overview
 * @desc    Obtener resumen global de estadísticas
 * @access  Public
 */
router.get('/overview', async (req, res, next) => {
  try {
    // Validar parámetros de fecha
    const { error, value } = dateRangeSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const { fechaDesde, fechaHasta } = value;

    // Construir filtros de fecha
    const dateFilter = {
      fecha: {
        gte: new Date(fechaDesde),
        lte: new Date(fechaHasta),
      },
      status: 'ACTIVE',
    };

    // Obtener estadísticas básicas
    const [
      totalCalls,
      totalDuration,
      avgDuration,
      totalDerivations,
      totalComplaints,
      callsByStatus,
      callsByDay,
    ] = await Promise.all([
      // Total de llamadas
      prisma.call.count({ where: dateFilter }),
      
      // Duración total
      prisma.call.aggregate({
        where: dateFilter,
        _sum: { duracion: true },
      }),
      
      // Duración promedio
      prisma.call.aggregate({
        where: dateFilter,
        _avg: { duracion: true },
      }),
      
      // Total de derivaciones
      prisma.derivation.count({
        where: {
          call: dateFilter,
        },
      }),
      
      // Total de reclamos
      prisma.complaint.count({
        where: {
          call: dateFilter,
        },
      }),
      
      // Llamadas por status
      prisma.call.groupBy({
        by: ['status'],
        where: dateFilter,
        _count: { id: true },
      }),
      
      // Llamadas por día (últimos 7 días)
      prisma.call.groupBy({
        by: ['fecha'],
        where: {
          fecha: {
            gte: moment().subtract(7, 'days').toDate(),
            lte: new Date(),
          },
          status: 'ACTIVE',
        },
        _count: { id: true },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    // Calcular métricas adicionales
    const totalDurationSeconds = totalDuration._sum.duracion || 0;
    const avgDurationSeconds = avgDuration._avg.duracion || 0;
    
    // Convertir duración a formato legible
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours}h ${minutes}m ${secs}s`;
    };

    // Calcular tasa de éxito (llamadas sin derivaciones ni reclamos)
    const successfulCalls = await prisma.call.count({
      where: {
        ...dateFilter,
        derivations: { none: {} },
        complaints: { none: {} },
      },
    });

    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: {
          desde: fechaDesde,
          hasta: fechaHasta,
        },
        overview: {
          totalCalls,
          totalDuration: formatDuration(totalDurationSeconds),
          totalDurationSeconds,
          avgDuration: formatDuration(Math.round(avgDurationSeconds)),
          avgDurationSeconds: Math.round(avgDurationSeconds),
          totalDerivations,
          totalComplaints,
          successRate: Math.round(successRate * 100) / 100,
          successfulCalls,
        },
        byStatus: callsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {}),
        byDay: callsByDay.map(item => ({
          fecha: moment(item.fecha).format('YYYY-MM-DD'),
          cantidad: item._count.id,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/stats/derivations
 * @desc    Obtener top motivos de derivación
 * @access  Public
 */
router.get('/derivations', async (req, res, next) => {
  try {
    // Validar parámetros de fecha
    const { error, value } = dateRangeSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const { fechaDesde, fechaHasta } = value;

    // Obtener top motivos de derivación
    const topDerivations = await prisma.derivation.groupBy({
      by: ['motivo'],
      where: {
        call: {
          fecha: {
            gte: new Date(fechaDesde),
            lte: new Date(fechaHasta),
          },
          status: 'ACTIVE',
        },
      },
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Obtener derivaciones por prioridad
    const derivationsByPriority = await prisma.derivation.groupBy({
      by: ['prioridad'],
      where: {
        call: {
          fecha: {
            gte: new Date(fechaDesde),
            lte: new Date(fechaHasta),
          },
          status: 'ACTIVE',
        },
      },
      _count: { id: true },
    });

    res.json({
      success: true,
      data: {
        period: {
          desde: fechaDesde,
          hasta: fechaHasta,
        },
        topMotivos: topDerivations.map(item => ({
          motivo: item.motivo,
          cantidad: item._count.id,
        })),
        porPrioridad: derivationsByPriority.map(item => ({
          prioridad: item.prioridad,
          cantidad: item._count.id,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/stats/complaints
 * @desc    Obtener estadísticas de reclamos
 * @access  Public
 */
router.get('/complaints', async (req, res, next) => {
  try {
    // Validar parámetros de fecha
    const { error, value } = dateRangeSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const { fechaDesde, fechaHasta } = value;

    // Obtener reclamos por tipo
    const complaintsByType = await prisma.complaint.groupBy({
      by: ['tipo'],
      where: {
        call: {
          fecha: {
            gte: new Date(fechaDesde),
            lte: new Date(fechaHasta),
          },
          status: 'ACTIVE',
        },
      },
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Obtener reclamos por severidad
    const complaintsBySeverity = await prisma.complaint.groupBy({
      by: ['severidad'],
      where: {
        call: {
          fecha: {
            gte: new Date(fechaDesde),
            lte: new Date(fechaHasta),
          },
          status: 'ACTIVE',
        },
      },
      _count: { id: true },
    });

    // Obtener reclamos resueltos vs pendientes
    const [resolvedComplaints, pendingComplaints] = await Promise.all([
      prisma.complaint.count({
        where: {
          call: {
            fecha: {
              gte: new Date(fechaDesde),
              lte: new Date(fechaHasta),
            },
            status: 'ACTIVE',
          },
          resuelto: true,
        },
      }),
      prisma.complaint.count({
        where: {
          call: {
            fecha: {
              gte: new Date(fechaDesde),
              lte: new Date(fechaHasta),
            },
            status: 'ACTIVE',
          },
          resuelto: false,
        },
      }),
    ]);

    const totalComplaints = resolvedComplaints + pendingComplaints;
    const resolutionRate = totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: {
          desde: fechaDesde,
          hasta: fechaHasta,
        },
        porTipo: complaintsByType.map(item => ({
          tipo: item.tipo,
          cantidad: item._count.id,
        })),
        porSeveridad: complaintsBySeverity.map(item => ({
          severidad: item.severidad,
          cantidad: item._count.id,
        })),
        resumen: {
          total: totalComplaints,
          resueltos: resolvedComplaints,
          pendientes: pendingComplaints,
          tasaResolucion: Math.round(resolutionRate * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/stats/performance
 * @desc    Obtener métricas de rendimiento
 * @access  Public
 */
router.get('/performance', async (req, res, next) => {
  try {
    // Validar parámetros de fecha
    const { error, value } = dateRangeSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const { fechaDesde, fechaHasta } = value;

    // Obtener métricas de rendimiento
    const [
      callsByHour,
      avgDurationByDay,
      peakHours,
    ] = await Promise.all([
      // Llamadas por hora del día
      prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM fecha) as hora,
          COUNT(*) as cantidad
        FROM calls 
        WHERE fecha >= ${new Date(fechaDesde)} 
          AND fecha <= ${new Date(fechaHasta)}
          AND status = 'ACTIVE'
        GROUP BY EXTRACT(HOUR FROM fecha)
        ORDER BY hora
      `,
      
      // Duración promedio por día
      prisma.$queryRaw`
        SELECT 
          DATE(fecha) as dia,
          AVG(duracion) as duracion_promedio
        FROM calls 
        WHERE fecha >= ${new Date(fechaDesde)} 
          AND fecha <= ${new Date(fechaHasta)}
          AND status = 'ACTIVE'
        GROUP BY DATE(fecha)
        ORDER BY dia
      `,
      
      // Horas pico (top 5 horas con más llamadas)
      prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM fecha) as hora,
          COUNT(*) as cantidad
        FROM calls 
        WHERE fecha >= ${new Date(fechaDesde)} 
          AND fecha <= ${new Date(fechaHasta)}
          AND status = 'ACTIVE'
        GROUP BY EXTRACT(HOUR FROM fecha)
        ORDER BY cantidad DESC
        LIMIT 5
      `,
    ]);

    res.json({
      success: true,
      data: {
        period: {
          desde: fechaDesde,
          hasta: fechaHasta,
        },
        callsByHour: callsByHour.map(item => ({
          hora: parseInt(item.hora),
          cantidad: parseInt(item.cantidad),
        })),
        avgDurationByDay: avgDurationByDay.map(item => ({
          dia: item.dia,
          duracionPromedio: Math.round(parseFloat(item.duracion_promedio)),
        })),
        peakHours: peakHours.map(item => ({
          hora: parseInt(item.hora),
          cantidad: parseInt(item.cantidad),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 