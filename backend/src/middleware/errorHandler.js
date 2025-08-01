/**
 * Middleware para manejo centralizado de errores
 * Captura todos los errores y los formatea de manera consistente
 */

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error para debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Error de Prisma - Duplicado
  if (err.code === 'P2002') {
    const message = 'Valor duplicado en el campo único';
    error = { message, statusCode: 400 };
  }

  // Error de Prisma - Registro no encontrado
  if (err.code === 'P2025') {
    const message = 'Registro no encontrado';
    error = { message, statusCode: 404 };
  }

  // Error de validación de Joi
  if (err.isJoi) {
    const message = err.details.map(detail => detail.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = { message, statusCode: 401 };
  }

  // Error de validación de Express
  if (err.type === 'entity.parse.failed') {
    const message = 'JSON inválido en el body de la petición';
    error = { message, statusCode: 400 };
  }

  // Error de límite de tamaño
  if (err.type === 'entity.too.large') {
    const message = 'Archivo demasiado grande';
    error = { message, statusCode: 413 };
  }

  // Error de CORS
  if (err.message === 'Not allowed by CORS') {
    const message = 'Origen no permitido por CORS';
    error = { message, statusCode: 403 };
  }

  // Respuesta de error
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err,
      }),
    },
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  });
};

module.exports = errorHandler; 