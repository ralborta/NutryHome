const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar rutas
const callsRoutes = require('./routes/calls');
const statsRoutes = require('./routes/stats');
const webhooksRoutes = require('./routes/webhooks');
const authRoutes = require('./routes/auth');
const campaignsRoutes = require('./routes/campaigns');
const variablesRoutes = require('./routes/variables');

// Importar middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Configuración de CORS
const allowedOrigins = [
  'http://localhost:3000',
  'https://nutry-home-lhultbqne-nivel-41.vercel.app',
  'https://nutry-home-bguuj0zcq-nivel-41.vercel.app',
  'https://nutry-home-b3ux8vjk7-nivel-41.vercel.app',
  'https://nutry-home.vercel.app',
  'https://nutry-home-git-main-nivel-41.vercel.app',
  // Permitir cualquier subdominio de vercel.app para NutryHome
  /^https:\/\/nutry-home-.*-nivel-41\.vercel\.app$/
];

// CORS simplificado para debuggear
app.use(cors({
  origin: true, // Permitir todos los origins temporalmente
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Log para debuggear
app.use((req, res, next) => {
  console.log('Request origin:', req.headers.origin);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por ventana
  message: {
    error: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 / 60),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting solo a endpoints específicos, no a toda la API
app.use('/api/auth', limiter);
app.use('/api/webhooks', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.1',
    cors: 'TEMPORAL_ALLOW_ALL',
    deploy: 'FORCED_UPDATE'
  });
});

// API Routes
app.use('/api/calls', callsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/variables', variablesRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'NutryHome API v1.0.0',
    endpoints: {
      calls: '/api/calls',
      stats: '/api/stats',
      webhooks: '/api/webhooks',
      auth: '/api/auth',
      campaigns: '/api/campaigns',
      variables: '/api/variables',
    },
    documentation: 'Ver README.md para documentación completa',
  });
});

// Middleware para manejo de errores
app.use(notFound);
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor NutryHome ejecutándose en puerto ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api`);
  console.log(`🔧 CORS configurado para permitir todos los origins`);
  console.log(`📅 Deploy timestamp: ${new Date().toISOString()}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err, promise) => {
  console.error('Error no manejado:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  process.exit(1);
});

module.exports = app; 