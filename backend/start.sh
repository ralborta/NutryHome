#!/bin/bash

echo "🚀 Iniciando NutryHome Backend..."

# Verificar variables de entorno
echo "📋 Verificando variables de entorno..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está configurada"
    exit 1
fi

echo "✅ DATABASE_URL configurada"

# Generar cliente Prisma
echo "🔧 Generando cliente Prisma..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Fallo al generar cliente Prisma"
    exit 1
fi

echo "✅ Cliente Prisma generado"

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Fallo al ejecutar migraciones"
    exit 1
fi

echo "✅ Migraciones ejecutadas"

# Iniciar servidor
echo "🚀 Iniciando servidor..."
node src/server.js 