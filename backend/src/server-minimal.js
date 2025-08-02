const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS básico
app.use(cors({
  origin: true,
  credentials: true
}));

// Middleware básico
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
    deploy: 'MINIMAL_SERVER'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'NutryHome API v1.0.1 - Minimal Server',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// API básica
app.get('/api', (req, res) => {
  res.json({
    message: 'NutryHome API v1.0.1 - Minimal Server',
    endpoints: {
      health: '/health',
      root: '/'
    },
    status: 'MINIMAL_MODE'
  });
});

// Test endpoint
app.post('/api/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor NutryHome MINIMAL ejecutándose en puerto ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📚 API Docs: http://0.0.0.0:${PORT}/api`);
  console.log(`🔧 CORS configurado para permitir todos los origins`);
  console.log(`📅 Deploy timestamp: ${new Date().toISOString()}`);
});

// Manejo de errores
process.on('unhandledRejection', (err, promise) => {
  console.error('Error no manejado:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
});

module.exports = app; 