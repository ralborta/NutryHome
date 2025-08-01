# NutryHome - Sistema de Gestión de Llamadas

Sistema fullstack moderno para gestión de llamadas tipo call center con integración de webhooks de ElevenLabs.

## 🚀 Características

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: Next.js + TailwindCSS + Recharts
- **Deployment**: Railway (backend/DB) + Vercel (frontend)
- **Integración**: Webhooks de ElevenLabs para datos de llamadas
- **Dashboard**: Visualizaciones en tiempo real con métricas de call center

## 📁 Estructura del Proyecto

```
NutryHome/
├── backend/           # API REST con Node.js + Express
├── frontend/          # Aplicación Next.js
├── docs/             # Documentación técnica
└── README.md         # Este archivo
```

## 🛠️ Tecnologías

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Validación**: Joi
- **Autenticación**: JWT
- **Deployment**: Railway

### Frontend
- **Framework**: Next.js 14
- **Estilos**: TailwindCSS
- **Gráficas**: Recharts
- **Estado**: Zustand
- **Deployment**: Vercel

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurar variables de entorno
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Configurar variables de entorno
npm run dev
```

## 📊 API Endpoints

### Llamadas
- `GET /api/calls` - Listar llamadas con paginación
- `GET /api/calls/:id` - Obtener detalle de llamada
- `POST /api/calls` - Crear llamada manualmente
- `POST /api/webhooks/elevenlabs` - Webhook de ElevenLabs

### Estadísticas
- `GET /api/stats/overview` - Resumen global
- `GET /api/stats/derivations` - Top motivos de derivación
- `GET /api/stats/complaints` - Estadísticas de reclamos

## 🔧 Variables de Entorno

### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
ELEVENLABS_WEBHOOK_SECRET=your-webhook-secret
PORT=3001
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=NutryHome
```

## 📈 Funcionalidades Principales

1. **Recepción de Webhooks**: Procesamiento automático de datos de ElevenLabs
2. **Dashboard en Tiempo Real**: Métricas y visualizaciones interactivas
3. **Gestión de Llamadas**: CRUD completo con transcripciones
4. **Reportes Avanzados**: Exportación y análisis de datos
5. **Autenticación Segura**: JWT con roles y permisos

## 🔒 Seguridad

- Validación de entrada con Joi
- Autenticación JWT
- Rate limiting
- CORS configurado
- Sanitización de datos

## 📱 Responsive Design

- Mobile-first approach
- Componentes adaptativos
- Accesibilidad WCAG 2.1
- PWA ready

## 🚀 Deployment

### Railway (Backend)
1. Conectar repositorio GitHub
2. Configurar variables de entorno
3. Deploy automático en push

### Vercel (Frontend)
1. Conectar repositorio GitHub
2. Configurar variables de entorno
3. Deploy automático en push

## 🤝 Contribución

1. Fork el proyecto
2. Crear feature branch
3. Commit cambios
4. Push al branch
5. Abrir Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte técnico, crear un issue en GitHub o contactar al equipo de desarrollo. 