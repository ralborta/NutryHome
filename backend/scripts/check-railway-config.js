#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkRailwayConfig() {
  console.log('🔍 Verificando configuración de Railway...\n');

  // Verificar variables de entorno
  console.log('📋 Variables de entorno:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NO DEFINIDA'}`);
  console.log(`   PORT: ${process.env.PORT || 'NO DEFINIDA'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'DEFINIDA' : 'NO DEFINIDA'}`);
  
  if (process.env.DATABASE_URL) {
    // Ocultar la URL completa por seguridad
    const urlParts = process.env.DATABASE_URL.split('@');
    if (urlParts.length > 1) {
      console.log(`   DATABASE_URL: ***@${urlParts[1]}`);
    } else {
      console.log(`   DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 20)}...`);
    }
  }

  console.log('\n🔗 Probando conexión a la base de datos...');
  
  try {
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos exitosa');
    
    // Verificar si las tablas existen
    console.log('\n📊 Verificando estructura de la base de datos...');
    
    const campaigns = await prisma.campaign.findMany({
      take: 1,
      include: {
        batches: {
          take: 1
        }
      }
    });
    
    console.log(`   ✅ Tabla campaigns: ${campaigns.length} registros encontrados`);
    
    if (campaigns.length > 0 && campaigns[0].batches.length > 0) {
      console.log(`   ✅ Tabla batches: ${campaigns[0].batches.length} registros encontrados`);
    } else {
      console.log('   ⚠️  Tabla batches: Sin registros');
    }
    
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    
    if (error.message.includes('DATABASE_URL')) {
      console.log('\n🔧 Solución:');
      console.log('   1. Verifica que Railway tenga configurada la variable DATABASE_URL');
      console.log('   2. Asegúrate de que el servicio de PostgreSQL esté activo en Railway');
      console.log('   3. Revisa los logs de Railway para más detalles');
    } else if (error.message.includes('connection')) {
      console.log('\n🔧 Solución:');
      console.log('   1. Verifica que el servicio de PostgreSQL esté ejecutándose');
      console.log('   2. Revisa las credenciales de la base de datos');
      console.log('   3. Verifica que la URL de conexión sea correcta');
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n🎯 Estado del sistema:');
  console.log(`   Backend: ${process.env.NODE_ENV === 'production' ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
  console.log(`   Puerto: ${process.env.PORT || 3001}`);
  console.log(`   Base de datos: ${process.env.DATABASE_URL ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
}

checkRailwayConfig()
  .catch(console.error)
  .finally(() => process.exit(0)); 