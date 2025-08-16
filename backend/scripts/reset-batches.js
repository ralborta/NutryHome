const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetBatches() {
  try {
    console.log('🔄 Reseteando estados de batches...');
    
    // Resetear batch "Completado" a "Pendiente"
    const completedBatch = await prisma.batch.updateMany({
      where: { 
        estado: 'COMPLETED'
      },
      data: { 
        estado: 'PENDING'
      }
    });
    
    console.log(`✅ Batch completado reseteado: ${completedBatch.count} registros`);
    
    // Resetear batch "Falló" a "Pendiente"
    const failedBatch = await prisma.batch.updateMany({
      where: { 
        estado: 'FAILED'
      },
      data: { 
        estado: 'PENDING'
      }
    });
    
    console.log(`✅ Batch fallido reseteado: ${failedBatch.count} registros`);
    
    // Mostrar estado actual
    const batches = await prisma.batch.findMany({
      select: {
        id: true,
        nombre: true,
        estado: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n📊 Estado actual de batches:');
    batches.forEach(batch => {
      console.log(`- ${batch.nombre}: ${batch.estado}`);
    });
    
    console.log('\n🎯 Ahora puedes probar el botón PLAY en cualquier batch pendiente');
    
  } catch (error) {
    console.error('❌ Error reseteando batches:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetBatches();
