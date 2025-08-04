#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function setupRailwayDatabase() {
  console.log('🚀 Configurando base de datos en Railway...\n');

  // Verificar variables de entorno
  console.log('📋 Verificando configuración:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NO DEFINIDA'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'DEFINIDA' : 'NO DEFINIDA'}`);
  
  if (!process.env.DATABASE_URL) {
    console.log('\n❌ ERROR: DATABASE_URL no está configurada');
    console.log('\n🔧 Para solucionarlo:');
    console.log('   1. Ve a Railway Dashboard (https://railway.app)');
    console.log('   2. Selecciona tu proyecto NutryHome');
    console.log('   3. Ve a la pestaña "Variables"');
    console.log('   4. Agrega la variable DATABASE_URL');
    console.log('   5. O conecta un servicio PostgreSQL desde Railway');
    console.log('\n📋 Opciones para DATABASE_URL:');
    console.log('   a) Usar PostgreSQL de Railway (recomendado)');
    console.log('   b) Usar PostgreSQL externo (Supabase, Neon, etc.)');
    console.log('   c) Usar PostgreSQL local para desarrollo');
    return;
  }

  try {
    console.log('\n🔗 Conectando a la base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa');

    console.log('\n📊 Verificando estructura de la base de datos...');
    
    // Verificar si las tablas existen
    const campaigns = await prisma.campaign.findMany({
      take: 1,
      include: {
        batches: {
          take: 1
        }
      }
    });

    console.log(`   ✅ Tabla campaigns: ${campaigns.length} registros`);
    
    if (campaigns.length > 0) {
      console.log(`   ✅ Tabla batches: ${campaigns[0].batches.length} registros`);
      
      // Mostrar algunos datos de ejemplo
      console.log('\n📋 Datos encontrados:');
      campaigns.forEach(campaign => {
        console.log(`   🏷️  Campaña: ${campaign.nombre}`);
        campaign.batches.forEach(batch => {
          console.log(`      📦 Batch: ${batch.nombre} (${batch.totalCalls} llamadas)`);
        });
      });
    } else {
      console.log('   ⚠️  No hay datos en la base de datos');
      console.log('\n🔧 Para agregar datos de prueba:');
      console.log('   npm run db:seed');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('DATABASE_URL')) {
      console.log('\n🔧 Solución:');
      console.log('   1. Verifica que DATABASE_URL esté configurada en Railway');
      console.log('   2. Asegúrate de que el servicio PostgreSQL esté activo');
      console.log('   3. Verifica las credenciales de la base de datos');
    } else if (error.message.includes('connection')) {
      console.log('\n🔧 Solución:');
      console.log('   1. Verifica que el servicio PostgreSQL esté ejecutándose');
      console.log('   2. Revisa la URL de conexión');
      console.log('   3. Verifica que el puerto esté abierto');
    } else if (error.message.includes('migration')) {
      console.log('\n🔧 Solución:');
      console.log('   1. Ejecuta las migraciones: npx prisma migrate deploy');
      console.log('   2. Genera el cliente: npx prisma generate');
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n🎯 Estado final:');
  console.log(`   Base de datos: ${process.env.DATABASE_URL ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
  console.log(`   Conexión: ${process.env.DATABASE_URL ? 'FUNCIONAL' : 'NO FUNCIONAL'}`);
}

setupRailwayDatabase()
  .catch(console.error)
  .finally(() => process.exit(0)); 