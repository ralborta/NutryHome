const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRealData() {
  try {
    console.log('🔍 Verificando datos reales en la base de datos...\n');

    // Verificar campañas
    console.log('📋 CAMPAÑAS:');
    const campaigns = await prisma.campaign.findMany({
      include: {
        batches: true
      }
    });
    
    if (campaigns.length === 0) {
      console.log('   ❌ No hay campañas en la base de datos');
    } else {
      console.log(`   ✅ Encontradas ${campaigns.length} campañas:`);
      campaigns.forEach(campaign => {
        console.log(`      🎯 Campaña: ${campaign.nombre}`);
        console.log(`         ID: ${campaign.id}`);
        console.log(`         Estado: ${campaign.estado}`);
        console.log(`         Fecha: ${campaign.createdAt}`);
        console.log(`         Batches: ${campaign.batches.length}`);
        
        campaign.batches.forEach(batch => {
          console.log(`            📦 Batch: ${batch.nombre}`);
          console.log(`               ID: ${batch.id}`);
          console.log(`               Estado: ${batch.estado}`);
          console.log(`               Total Calls: ${batch.totalCalls}`);
          console.log(`               Completadas: ${batch.completedCalls}`);
          console.log(`               Fallidas: ${batch.failedCalls}`);
        });
        console.log('');
      });
    }

    // Verificar contactos
    console.log('👥 CONTACTOS:');
    const contacts = await prisma.contact.findMany({
      take: 10, // Solo los primeros 10 para no saturar
      include: {
        batch: {
          include: {
            campaign: true
          }
        }
      }
    });

    if (contacts.length === 0) {
      console.log('   ❌ No hay contactos en la base de datos');
    } else {
      console.log(`   ✅ Encontrados ${contacts.length} contactos (mostrando primeros 10):`);
      contacts.forEach((contact, index) => {
        console.log(`      ${index + 1}. ${contact.nombre_paciente || contact.nombre || 'Sin nombre'}`);
        console.log(`         Teléfono: ${contact.phone_number}`);
        if (contact.nombre_contacto) {
          console.log(`         Contacto: ${contact.nombre_contacto}`);
        }
        if (contact.producto1) {
          console.log(`         Producto: ${contact.producto1}`);
        }
        if (contact.cantidad1) {
          console.log(`         Cantidad: ${contact.cantidad1}`);
        }
        if (contact.domicilio_actual) {
          console.log(`         Domicilio: ${contact.domicilio_actual}`);
        }
        console.log('');
      });
    }

    // Verificar llamadas outbound
    console.log('📞 LLAMADAS OUTBOUND:');
    const outboundCalls = await prisma.outboundCall.findMany({
      take: 5,
      include: {
        contact: true,
        batch: true
      }
    });

    if (outboundCalls.length === 0) {
      console.log('   ❌ No hay llamadas outbound registradas');
    } else {
      console.log(`   ✅ Encontradas ${outboundCalls.length} llamadas outbound (mostrando primeras 5):`);
      outboundCalls.forEach((call, index) => {
        console.log(`      ${index + 1}. Llamada ID: ${call.id}`);
        console.log(`         Estado: ${call.estado}`);
        console.log(`         Teléfono: ${call.telefono}`);
        console.log(`         Contacto: ${call.contact?.nombre_paciente || call.contact?.nombre || 'N/A'}`);
        console.log(`         Fecha: ${call.createdAt}`);
        console.log('');
      });
    }

    // Verificar llamadas generales
    console.log('📞 LLAMADAS GENERALES:');
    const calls = await prisma.call.findMany({
      take: 5
    });

    if (calls.length === 0) {
      console.log('   ❌ No hay llamadas generales registradas');
    } else {
      console.log(`   ✅ Encontradas ${calls.length} llamadas generales (mostrando primeras 5):`);
      calls.forEach((call, index) => {
        console.log(`      ${index + 1}. Llamada ID: ${call.id}`);
        console.log(`         Estado: ${call.status}`);
        console.log(`         Duración: ${call.duracion} segundos`);
        console.log(`         Teléfono: ${call.telefono}`);
        console.log(`         Fecha: ${call.createdAt}`);
        console.log('');
      });
    }

    // Estadísticas generales
    console.log('📊 ESTADÍSTICAS GENERALES:');
    const totalCampaigns = await prisma.campaign.count();
    const totalBatches = await prisma.batch.count();
    const totalContacts = await prisma.contact.count();
    const totalOutboundCalls = await prisma.outboundCall.count();
    const totalCalls = await prisma.call.count();

    console.log(`   🎯 Total Campañas: ${totalCampaigns}`);
    console.log(`   📦 Total Batches: ${totalBatches}`);
    console.log(`   👥 Total Contactos: ${totalContacts}`);
    console.log(`   📞 Total Llamadas Outbound: ${totalOutboundCalls}`);
    console.log(`   📞 Total Llamadas Generales: ${totalCalls}`);

  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealData();
