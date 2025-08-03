const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('🔍 Probando conexión a la base de datos...');
    
    // Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Verificar si hay campañas existentes
    const campaigns = await prisma.campaign.findMany({
      take: 5,
      include: {
        batches: {
          include: {
            outboundCalls: {
              take: 3
            }
          }
        }
      }
    });
    
    console.log(`📊 Encontradas ${campaigns.length} campañas`);
    
    campaigns.forEach((campaign, index) => {
      console.log(`\n🏷️ Campaña ${index + 1}: ${campaign.nombre}`);
      console.log(`   Estado: ${campaign.estado}`);
      console.log(`   Batches: ${campaign.batches.length}`);
      
      campaign.batches.forEach((batch, batchIndex) => {
        console.log(`   📦 Batch ${batchIndex + 1}: ${batch.nombre}`);
        console.log(`      Total calls: ${batch.totalCalls}`);
        console.log(`      Completed: ${batch.completedCalls}`);
        console.log(`      Failed: ${batch.failedCalls}`);
        console.log(`      Contactos: ${batch.outboundCalls.length}`);
        
        batch.outboundCalls.forEach((call, callIndex) => {
          console.log(`      📞 ${callIndex + 1}: ${call.telefono} - ${call.nombre || 'Sin nombre'}`);
        });
      });
    });
    
    // Crear una campaña de prueba si no hay ninguna
    if (campaigns.length === 0) {
      console.log('\n🆕 Creando campaña de prueba...');
      
      // Buscar o crear usuario por defecto
      let defaultUser = await prisma.user.findFirst({
        where: { email: 'admin@nutryhome.com' }
      });
      
      if (!defaultUser) {
        defaultUser = await prisma.user.create({
          data: {
            nombre: 'Administrador',
            apellido: 'NutryHome',
            email: 'admin@nutryhome.com',
            password: 'admin123',
            rol: 'ADMIN',
            activo: true
          }
        });
        console.log('👤 Usuario por defecto creado');
      }
      
      // Crear campaña
      const testCampaign = await prisma.campaign.create({
        data: {
          nombre: 'Campaña de Prueba',
          descripcion: 'Campaña creada para pruebas de carga',
          estado: 'ACTIVE',
          createdById: defaultUser.id
        }
      });
      
      console.log('✅ Campaña de prueba creada');
      
      // Crear batch
      const testBatch = await prisma.batch.create({
        data: {
          nombre: 'Batch de Prueba',
          campaignId: testCampaign.id,
          estado: 'PENDING',
          totalCalls: 0,
          completedCalls: 0,
          failedCalls: 0
        }
      });
      
      console.log('✅ Batch de prueba creado');
      
      // Crear contactos de prueba
      const testContacts = [
        {
          telefono: '+5491137710010',
          nombre: 'María García López',
          email: 'maria.garcia@email.com',
          variables: { empresa: 'NutryHome' }
        },
        {
          telefono: '+5491145623789',
          nombre: 'Juan López Fernández',
          email: 'juan.lopez@email.com',
          variables: { empresa: 'Empresa ABC' }
        },
        {
          telefono: '+5491156345678',
          nombre: 'Carmen Rodríguez',
          email: 'carmen.rodriguez@email.com',
          variables: { empresa: 'Compañía XYZ' }
        }
      ];
      
      const createdCalls = await prisma.outboundCall.createMany({
        data: testContacts.map(contact => ({
          batchId: testBatch.id,
          telefono: contact.telefono,
          nombre: contact.nombre,
          email: contact.email,
          variables: contact.variables,
          estado: 'PENDING'
        }))
      });
      
      console.log(`✅ ${createdCalls.count} contactos de prueba creados`);
      
      // Actualizar estadísticas del batch
      await prisma.batch.update({
        where: { id: testBatch.id },
        data: {
          totalCalls: testContacts.length
        }
      });
      
      console.log('✅ Estadísticas del batch actualizadas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la prueba
testDatabaseConnection(); 