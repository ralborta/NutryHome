#!/bin/bash

echo "🚀 Desplegando NutryHome - Sistema Completo"
echo "=============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio raíz
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "No se encontró la estructura del proyecto. Asegúrate de estar en el directorio raíz."
    exit 1
fi

print_status "Verificando estructura del proyecto..."

# Verificar backend
if [ ! -f "backend/package.json" ]; then
    print_error "No se encontró package.json en el backend"
    exit 1
fi

# Verificar frontend
if [ ! -f "src/app/page.tsx" ]; then
    print_error "No se encontró la estructura del frontend"
    exit 1
fi

print_success "Estructura del proyecto verificada"

echo ""
print_status "📋 PASOS PARA DESPLEGAR:"
echo ""

print_status "1. BACKEND (Railway):"
echo "   • Ve a https://railway.app"
echo "   • Crea un nuevo proyecto"
echo "   • Conecta tu repositorio de GitHub"
echo "   • Agrega un servicio PostgreSQL"
echo "   • Configura las variables de entorno:"
echo ""

# Mostrar variables de entorno necesarias
echo "   Variables de entorno para Railway:"
echo "   ┌─────────────────────────────────────────────────────────────┐"
echo "   │ NODE_ENV=production                                          │"
echo "   │ JWT_SECRET=364cf59d0102df92bf554d8c58f223f97d9c5504079c22d4770a4bbaa971e85d1f2d85487457413d553abfc41eb1c65a39f1cc8f5dd510e082b835ee89d9800d │"
echo "   │ JWT_EXPIRES_IN=24h                                           │"
echo "   │ CORS_ORIGIN=https://tu-frontend.vercel.app                  │"
echo "   │ RATE_LIMIT_WINDOW_MS=900000                                 │"
echo "   │ RATE_LIMIT_MAX_REQUESTS=100                                 │"
echo "   │ LOG_LEVEL=info                                              │"
echo "   └─────────────────────────────────────────────────────────────┘"
echo ""

print_status "2. FRONTEND (Vercel):"
echo "   • Ve a https://vercel.com"
echo "   • Conecta tu repositorio de GitHub"
echo "   • Configura las variables de entorno:"
echo ""

echo "   Variables de entorno para Vercel:"
echo "   ┌─────────────────────────────────────────────────────────────┐"
echo "   │ NEXT_PUBLIC_API_URL=https://tu-backend.railway.app          │"
echo "   └─────────────────────────────────────────────────────────────┘"
echo ""

print_status "3. VERIFICACIÓN:"
echo "   • Backend: https://tu-backend.railway.app/health"
echo "   • Frontend: https://tu-frontend.vercel.app"
echo "   • API Docs: https://tu-backend.railway.app/api"
echo ""

print_status "4. PRUEBAS:"
echo "   • Ir a la página de carga: /upload"
echo "   • Descargar template Excel"
echo "   • Crear campaña y batch"
echo "   • Subir archivo Excel"
echo ""

print_warning "⚠️  IMPORTANTE:"
echo "   • Actualiza CORS_ORIGIN con tu dominio de Vercel"
echo "   • Actualiza NEXT_PUBLIC_API_URL con tu dominio de Railway"
echo "   • Verifica que la base de datos PostgreSQL esté funcionando"
echo ""

print_success "✅ Script de despliegue completado"
echo ""
print_status "¿Necesitas ayuda con algún paso específico?" 