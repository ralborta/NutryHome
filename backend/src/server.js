const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar cliente de base de datos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// Función para verificar conexión a la base de datos
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    return false;
  }
}

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

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/** 1) Orígenes permitidos (limpios) */
const allowedOrigins = [
  "http://localhost:3000",
  "https://nutry-home.vercel.app",                               // prod
  /^https:\/\/nutry-home-[a-z0-9-]+-nivel-41\.vercel\.app$/      // previews del proyecto
];

/** 2) UNA sola config CORS reutilizable en todo */
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/postman
    const ok = allowedOrigins.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    return ok ? cb(null, true) : cb(new Error(`CORS: origin no permitido (${origin})`));
  },
  credentials: true, // si NO usás cookies desde el browser, poné false y luego origin:"*"
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With","Idempotency-Key","xi-api-key"],
};

/** 3) Debe ir ANTES de cualquier ruta */
app.use(cors(corsOptions));

/** 4) Preflight con la MISMA config (clave: no uses cors() "pelado") */
app.options("*", cors(corsOptions));

/** 5) "Sellador" de CORS para cualquier respuesta (incluye 404/304/streams) */
app.use((req, res, next) => {
  const { origin } = req.headers;
  if (origin && allowedOrigins.some((o)=> typeof o==="string" ? o===origin : o.test(origin))) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header("Vary", "Origin");
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

// Health check endpoint mejorado
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await checkDatabaseConnection();
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.2',
      cors: 'TEMPORAL_ALLOW_ALL',
      deploy: 'FORCED_UPDATE',
      database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
      port: PORT
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Health check para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
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

// Health check simple para Railway
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'NutryHome API',
    timestamp: new Date().toISOString(),
    message: 'Servidor funcionando correctamente'
  });
});

// Middleware para manejo de errores
app.use(notFound);
app.use(errorHandler);

/** 6) 404 explícito con CORS (por si hay paths que no matchean) */
app.use((req, res) => {
  const { origin } = req.headers;
  if (origin && allowedOrigins.some((o)=> typeof o==="string" ? o===origin : o.test(origin))) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header("Vary", "Origin");
  res.status(404).json({ code: "NOT_FOUND", path: req.originalUrl });
});

/** 7) Handler de errores al final (mantiene CORS) */
app.use((err, req, res, _next) => {
  const { origin } = req.headers;
  if (origin && allowedOrigins.some((o)=> typeof o==="string" ? o===origin : o.test(origin))) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Idempotency-Key, xi-api-key");
  res.header("Vary", "Origin");
  res.status(err.status || 500).json({ code: "ERROR", message: err.message || "Internal error" });
});

// Iniciar servidor
async function startServer() {
  try {
    // Verificar conexión a la base de datos
    const dbConnected = await checkDatabaseConnection();
    
    if (dbConnected) {
      // Solo ejecutar migraciones si la base de datos está conectada
      try {
        console.log('🔄 Ejecutando migraciones de base de datos...');
        const { execSync } = require('child_process');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Migraciones ejecutadas correctamente');
      } catch (migrationError) {
        console.warn('⚠️  Error ejecutando migraciones:', migrationError.message);
        console.log('🔄 Continuando sin migraciones...');
      }
    } else {
      console.warn('⚠️  Advertencia: No se pudo conectar a la base de datos, pero el servidor continuará');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor NutryHome COMPLETO ejecutándose en puerto ${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`📚 API Docs: http://0.0.0.0:${PORT}/api`);
      console.log(`🔧 CORS configurado para permitir todos los origins`);
      console.log(`📅 Deploy timestamp: ${new Date().toISOString()}`);
      console.log(`🔄 SERVIDOR COMPLETO CON PRISMA ACTIVO`);
      console.log(`🗄️  Base de datos: ${dbConnected ? 'CONECTADA' : 'DESCONECTADA'}`);
    });
  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (err, promise) => {
  console.error('Error no manejado:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  process.exit(1);
});

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('🔄 Señal SIGTERM recibida, cerrando servidor gracefulmente...');
  try {
    await prisma.$disconnect();
    console.log('✅ Base de datos desconectada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante cierre graceful:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🔄 Señal SIGINT recibida, cerrando servidor gracefulmente...');
  try {
    await prisma.$disconnect();
    console.log('✅ Base de datos desconectada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante cierre graceful:', error);
    process.exit(1);
  }
});

// Iniciar el servidor
startServer();

module.exports = app; 