const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Verificando base de datos...');
    
    // Conectar a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Verificar campañas
    const campaigns = await prisma.campaign.findMany({
      include: {
        batches: {
          include: {
            outboundCalls: true
          }
        }
      }
    });
    
    console.log(`\n📊 CAMPAÑAS ENCONTRADAS: ${campaigns.length}`);
    
    if (campaigns.length > 0) {
      campaigns.forEach((campaign, index) => {
        console.log(`\n🏷️ Campaña ${index + 1}: ${campaign.nombre}`);
        console.log(`   ID: ${campaign.id}`);
        console.log(`   Estado: ${campaign.estado}`);
        console.log(`   Fecha creación: ${campaign.createdAt}`);
        console.log(`   Batches: ${campaign.batches.length}`);
        
        campaign.batches.forEach((batch, batchIndex) => {
          console.log(`   📦 Batch ${batchIndex + 1}: ${batch.nombre}`);
          console.log(`      ID: ${batch.id}`);
          console.log(`      Total calls: ${batch.totalCalls}`);
          console.log(`      Completed: ${batch.completedCalls}`);
          console.log(`      Failed: ${batch.failedCalls}`);
          console.log(`      Contactos: ${batch.outboundCalls.length}`);
          
          if (batch.outboundCalls.length > 0) {
            console.log(`      📞 Primeros 3 contactos:`);
            batch.outboundCalls.slice(0, 3).forEach((call, callIndex) => {
              console.log(`         ${callIndex + 1}. ${call.telefono} - ${call.nombre || 'Sin nombre'}`);
            });
          }
        });
      });
    } else {
      console.log('❌ No hay campañas en la base de datos');
    }
    
    // Verificar llamadas outbound directamente
    const outboundCalls = await prisma.outboundCall.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📞 ÚLTIMAS 10 LLAMADAS OUTBOUND: ${outboundCalls.length}`);
    
    if (outboundCalls.length > 0) {
      outboundCalls.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.telefono} - ${call.nombre || 'Sin nombre'} (${call.estado})`);
      });
    } else {
      console.log('❌ No hay llamadas outbound en la base de datos');
    }
    
    // Verificar usuarios
    const users = await prisma.user.findMany();
    console.log(`\n👥 USUARIOS: ${users.length}`);
    
    if (users.length > 0) {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.nombre} ${user.apellido} (${user.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la verificación
checkDatabase(); 