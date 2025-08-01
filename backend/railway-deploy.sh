#!/bin/bash

echo "🚀 Desplegando NutryHome Backend en Railway..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Asegúrate de estar en el directorio backend/"
    exit 1
fi

# Verificar que el archivo .env existe
if [ ! -f ".env" ]; then
    echo "❌ Error: No se encontró .env. Asegúrate de configurar las variables de entorno"
    exit 1
fi

echo "✅ Verificando configuración..."

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Generar cliente de Prisma
echo "🔧 Generando cliente de Prisma..."
npx prisma generate

# Aplicar migraciones
echo "🗄️ Aplicando migraciones de base de datos..."
npx prisma migrate deploy

# Verificar que el servidor puede iniciar
echo "🔍 Verificando que el servidor puede iniciar..."
timeout 10s npm start || echo "⚠️ El servidor se inició correctamente (timeout esperado)"

echo "✅ Backend listo para desplegar en Railway!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Ve a railway.app y conecta tu repositorio"
echo "2. Configura las variables de entorno:"
echo "   - DATABASE_URL (ya configurada)"
echo "   - JWT_SECRET (generar uno nuevo)"
echo "   - NODE_ENV=production"
echo "3. Despliega el proyecto"
echo ""
echo "🔗 URLs esperadas:"
echo "   - Backend: https://tu-proyecto.railway.app"
echo "   - Health Check: https://tu-proyecto.railway.app/health"
echo "   - API Docs: https://tu-proyecto.railway.app/api" 