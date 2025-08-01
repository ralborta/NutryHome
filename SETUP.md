# NutryHome - Guía de Setup y Deployment

## 🚀 Configuración Inicial

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL 14+
- Git
- Cuenta en Railway (backend/DB)
- Cuenta en Vercel (frontend)

## 📦 Instalación Local

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/nutryhome.git
cd nutryhome
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Copiar archivo de variables de entorno
cp env.example .env

# Editar variables de entorno
nano .env
```

**Variables de entorno necesarias (.env):**
```env
# Base de datos
DATABASE_URL="postgresql://username:password@localhost:5432/nutryhome_db"

# Servidor
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=tu-super-secret-jwt-key-cambiar-en-produccion
JWT_EXPIRES_IN=24h

# ElevenLabs Webhook
ELEVENLABS_WEBHOOK_SECRET=tu-elevenlabs-webhook-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 3. Configurar Base de Datos

```bash
# Generar cliente de Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# (Opcional) Cargar datos de ejemplo
npm run db:seed
```

### 4. Configurar Frontend

```bash
cd ../frontend

# Instalar dependencias
npm install

# Copiar archivo de variables de entorno
cp .env.example .env.local

# Editar variables de entorno
nano .env.local
```

**Variables de entorno necesarias (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=NutryHome
```

### 5. Ejecutar Aplicación

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api

## 🚀 Deployment en Producción

### Backend en Railway

1. **Crear cuenta en Railway**
   - Ir a [railway.app](https://railway.app)
   - Conectar cuenta de GitHub

2. **Crear proyecto**
   - "New Project" → "Deploy from GitHub repo"
   - Seleccionar el repositorio
   - Seleccionar carpeta `backend`

3. **Configurar base de datos**
   - "New" → "Database" → "PostgreSQL"
   - Copiar la URL de conexión

4. **Configurar variables de entorno**
   - Ir a "Variables" tab
   - Agregar todas las variables del archivo `.env`
   - Usar la URL de PostgreSQL de Railway

5. **Configurar dominio personalizado (opcional)**
   - "Settings" → "Domains"
   - Agregar dominio personalizado

### Frontend en Vercel

1. **Crear cuenta en Vercel**
   - Ir a [vercel.com](https://vercel.com)
   - Conectar cuenta de GitHub

2. **Importar proyecto**
   - "New Project" → "Import Git Repository"
   - Seleccionar el repositorio
   - Configurar:
     - Framework Preset: Next.js
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Configurar variables de entorno**
   - "Settings" → "Environment Variables"
   - Agregar:
     - `NEXT_PUBLIC_API_URL`: URL del backend en Railway
     - `NEXT_PUBLIC_APP_NAME`: NutryHome

4. **Configurar dominio personalizado (opcional)**
   - "Settings" → "Domains"
   - Agregar dominio personalizado

## 🔧 Configuración de CI/CD

### GitHub Actions

1. **Configurar secrets en GitHub**
   - Ir a Settings → Secrets and variables → Actions
   - Agregar:
     - `RAILWAY_TOKEN`: Token de Railway
     - `VERCEL_TOKEN`: Token de Vercel
     - `VERCEL_ORG_ID`: ID de organización de Vercel
     - `VERCEL_PROJECT_ID`: ID de proyecto de Vercel
     - `DATABASE_URL`: URL de la base de datos
     - `JWT_SECRET`: Secret JWT
     - `NEXT_PUBLIC_API_URL`: URL del backend

2. **Los workflows se ejecutarán automáticamente**
   - Al hacer push a `main`
   - Al crear pull requests

## 🔐 Configuración de Seguridad

### Variables de Entorno Críticas

**Backend:**
- `JWT_SECRET`: Generar con `openssl rand -hex 32`
- `ELEVENLABS_WEBHOOK_SECRET`: Configurar en ElevenLabs
- `DATABASE_URL`: URL segura de PostgreSQL

**Frontend:**
- `NEXT_PUBLIC_API_URL`: URL del backend en producción

### Configuración de ElevenLabs

1. **Crear cuenta en ElevenLabs**
2. **Configurar webhook**
   - URL: `https://tu-backend.railway.app/api/webhooks/elevenlabs`
   - Secret: Usar el mismo valor que `ELEVENLABS_WEBHOOK_SECRET`

## 📊 Monitoreo y Logs

### Railway (Backend)
- Logs en tiempo real en el dashboard
- Métricas de rendimiento
- Health checks automáticos

### Vercel (Frontend)
- Analytics automáticos
- Logs de deployment
- Métricas de rendimiento

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend
npm run lint
npm run type-check
```

## 🔍 Troubleshooting

### Problemas Comunes

**Backend no inicia:**
- Verificar variables de entorno
- Verificar conexión a base de datos
- Revisar logs: `npm run dev`

**Frontend no conecta al backend:**
- Verificar `NEXT_PUBLIC_API_URL`
- Verificar CORS en backend
- Revisar Network tab en DevTools

**Base de datos no conecta:**
- Verificar `DATABASE_URL`
- Verificar que PostgreSQL esté corriendo
- Ejecutar migraciones: `npm run db:migrate`

**Webhooks no funcionan:**
- Verificar `ELEVENLABS_WEBHOOK_SECRET`
- Verificar firma en headers
- Revisar logs del endpoint

### Logs Útiles

**Backend:**
```bash
# Ver logs en Railway
railway logs

# Ver logs locales
npm run dev
```

**Frontend:**
```bash
# Ver logs de build
npm run build

# Ver logs de desarrollo
npm run dev
```

## 📈 Escalabilidad

### Optimizaciones Recomendadas

1. **Base de Datos**
   - Índices en campos frecuentemente consultados
   - Particionamiento por fecha
   - Connection pooling

2. **API**
   - Caching con Redis
   - Rate limiting por usuario
   - Compresión de respuestas

3. **Frontend**
   - Lazy loading de componentes
   - Optimización de imágenes
   - Service Worker para cache

## 🔄 Mantenimiento

### Actualizaciones Regulares

1. **Dependencias**
   ```bash
   # Backend
   cd backend && npm update
   
   # Frontend
   cd frontend && npm update
   ```

2. **Base de Datos**
   ```bash
   cd backend
   npm run db:migrate
   ```

3. **Deployment**
   - Los cambios se despliegan automáticamente
   - Revisar logs después de cada deployment

### Backup

**Base de Datos:**
- Railway proporciona backups automáticos
- Configurar backup manual si es necesario

**Código:**
- Todo el código está en GitHub
- Usar tags para versiones importantes

## 📞 Soporte

### Recursos Útiles
- [Documentación de la API](./docs/API_DOCUMENTATION.md)
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)

### Contacto
- Crear issue en GitHub para bugs
- Usar Discussions para preguntas
- Contactar al equipo de desarrollo

## 🎉 ¡Listo!

Tu aplicación NutryHome está configurada y lista para usar. 

**URLs de producción:**
- Frontend: https://tu-app.vercel.app
- Backend: https://tu-backend.railway.app
- API Docs: https://tu-backend.railway.app/api

**Próximos pasos:**
1. Configurar dominio personalizado
2. Configurar monitoreo avanzado
3. Implementar funcionalidades adicionales
4. Configurar alertas automáticas 