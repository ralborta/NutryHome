const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🆕 Creando datos de prueba...');
    
    // Conectar a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Crear usuario por defecto
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
    } else {
      console.log('👤 Usuario por defecto ya existe');
    }
    
    // Crear campaña de prueba
    const testCampaign = await prisma.campaign.create({
      data: {
        nombre: 'Campaña de Prueba - Carga Excel',
        descripcion: 'Campaña creada para probar la carga de archivos Excel',
        estado: 'ACTIVE',
        createdById: defaultUser.id
      }
    });
    
    console.log('✅ Campaña de prueba creada');
    
    // Crear batch de prueba
    const testBatch = await prisma.batch.create({
      data: {
        nombre: 'Batch de Prueba - test-contacts.xlsx',
        campaignId: testCampaign.id,
        estado: 'PENDING',
        totalCalls: 0,
        completedCalls: 0,
        failedCalls: 0
      }
    });
    
    console.log('✅ Batch de prueba creado');
    
    // Crear contactos de prueba (basado en BatchTest2 con variables dinámicas completas)
    const testContacts = [
      {
        telefono: '+5491137710010',
        nombre: 'GALAN SERGIO EDER',
        email: 'sergio.galan@email.com',
        variables: { 
          nombre_contacto: 'Joaquin',
          domicilio_actual: 'ALOE 183',
          localidad: 'CHACABUCO',
          delegacion: 'CHIVILCOY',
          fecha_envio: '2025-07-04',
          producto1: 'Fresubin Original 1000ml AR_ECO',
          cantidad1: 5,
          producto2: 'Fresubin Energy AR_ECO',
          cantidad2: 5,
          producto3: '',
          cantidad3: 0,
          producto4: '',
          cantidad4: 0,
          producto5: '',
          cantidad5: 0,
          observaciones: 'Paciente estable, consume según indicación médica',
          prioridad: 'MEDIA',
          estado_pedido: 'PENDIENTE'
        }
      },
      {
        telefono: '+5492235956604',
        nombre: 'SAYAGO JOAQUIN',
        email: 'joaquin.sayago@email.com',
        variables: { 
          nombre_contacto: 'PAMELA',
          domicilio_actual: 'C.163 N 1558 entre 64 y 65',
          localidad: 'LOS HORNOS',
          delegacion: 'LA PLATA',
          fecha_envio: '2025-07-22',
          producto1: 'Frebini Original E(AR/CL/PE)',
          cantidad1: 12,
          producto2: 'Frebini ENERGY FIBRE Drink Vanilla E(AR)',
          cantidad2: 5,
          producto3: '',
          cantidad3: 0,
          producto4: '',
          cantidad4: 0,
          producto5: '',
          cantidad5: 0,
          observaciones: 'Necesita refuerzo nutricional',
          prioridad: 'ALTA',
          estado_pedido: 'PENDIENTE'
        }
      },
      {
        telefono: '+5491132097353',
        nombre: 'GARAY LAUTARO',
        email: 'lautaro.garay@email.com',
        variables: { 
          nombre_contacto: 'SUSANA',
          domicilio_actual: 'INMIGRANTES ARABES 125',
          localidad: 'CHASCOMUS',
          delegacion: 'LA PLATA',
          fecha_envio: '2025-07-08',
          producto1: 'Fresubin Energy AR_ECO',
          cantidad1: 20,
          producto2: '',
          cantidad2: 0,
          producto3: '',
          cantidad3: 0,
          producto4: '',
          cantidad4: 0,
          producto5: '',
          cantidad5: 0,
          observaciones: 'Stock crítico, necesita reposición urgente',
          prioridad: 'CRITICA',
          estado_pedido: 'PENDIENTE'
        }
      },
      {
        telefono: '+5491132458252',
        nombre: 'LOPEZ EMILIA',
        email: 'emilia.lopez@email.com',
        variables: { 
          nombre_contacto: 'GISELA',
          domicilio_actual: 'Calle 16 2257 ENTRE 509 Y 510',
          localidad: 'LA PLATA',
          delegacion: 'LA PLATA',
          fecha_envio: '2025-07-15',
          producto1: 'Fresubin 2 kcal Creme Vanilla AR',
          cantidad1: 1,
          producto2: 'Frebini ENERGY Drink Banana AR',
          cantidad2: 3,
          producto3: 'Frebini ENERGY Drink Strawberry AR',
          cantidad3: 3,
          producto4: '',
          cantidad4: 0,
          producto5: '',
          cantidad5: 0,
          observaciones: 'Paciente con buena respuesta al tratamiento',
          prioridad: 'BAJA',
          estado_pedido: 'PENDIENTE'
        }
      },
      {
        telefono: '+5491161557606',
        nombre: 'VILLEGAS SALDIVIA RODRIGO',
        email: 'rodrigo.villegas@email.com',
        variables: { 
          nombre_contacto: 'MARIANA SALDIVIA',
          domicilio_actual: 'CALLE 24 518',
          localidad: 'Chivilcoy',
          delegacion: 'Chivilcoy',
          fecha_envio: '2025-07-10',
          producto1: 'FRESUBIN PLUS X 236 ML LIQ VAIN',
          cantidad1: 25,
          producto2: '',
          cantidad2: 0,
          producto3: '',
          cantidad3: 0,
          producto4: '',
          cantidad4: 0,
          producto5: '',
          cantidad5: 0,
          observaciones: 'Paciente preferencial, entrega prioritaria',
          prioridad: 'ALTA',
          estado_pedido: 'PENDIENTE'
        }
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
    
    console.log('\n🎉 ¡Datos de prueba creados exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   - Usuario: ${defaultUser.nombre} ${defaultUser.apellido}`);
    console.log(`   - Campaña: ${testCampaign.nombre}`);
    console.log(`   - Batch: ${testBatch.nombre}`);
    console.log(`   - Contactos: ${testContacts.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la creación de datos
createTestData(); 