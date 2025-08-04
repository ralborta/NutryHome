const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRealData() {
  try {
    console.log('🔍 Verificando datos reales en la base de datos...\n');
    
    // Verificar campañas
    const campaigns = await prisma.campaign.findMany({
      include: {
        batches: {
          include: {
            outboundCalls: {
              take: 5
            }
          }
        }
      }
    });
    
    console.log('📊 CAMPAÑAS ENCONTRADAS:', campaigns.length);
    
    campaigns.forEach(campaign => {
      console.log(`\n🏷️  Campaña: ${campaign.nombre}`);
      console.log(`📝 Descripción: ${campaign.descripcion}`);
      console.log(`📦 Batches: ${campaign.batches.length}`);
      
      campaign.batches.forEach(batch => {
        console.log(`\n  📋 Batch: ${batch.nombre}`);
        console.log(`  📞 Llamadas: ${batch.outboundCalls.length}`);
        console.log(`  📊 Estado: ${batch.estado}`);
        
        if (batch.outboundCalls.length > 0) {
          console.log('  👥 Primeros 3 contactos:');
          batch.outboundCalls.slice(0, 3).forEach((call, index) => {
            console.log(`    ${index + 1}. ${call.nombre || 'Sin nombre'} - ${call.telefono}`);
            if (call.variables) {
              try {
                const vars = JSON.parse(call.variables);
                console.log(`       Variables disponibles: ${Object.keys(vars).join(', ')}`);
                if (vars.nombre_paciente) console.log(`       Paciente: ${vars.nombre_paciente}`);
                if (vars.nombre_contacto) console.log(`       Contacto: ${vars.nombre_contacto}`);
                if (vars.producto1) console.log(`       Producto: ${vars.producto1}`);
                if (vars.domicilio_actual) console.log(`       Domicilio: ${vars.domicilio_actual}`);
              } catch (e) {
                console.log(`       Variables: Error parsing JSON`);
              }
            }
          });
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealData(); 