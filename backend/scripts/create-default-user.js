const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDefaultUser() {
  try {
    console.log('🔧 Creando usuario por defecto...');

    // Verificar si ya existe
    const existingUser = await prisma.user.findFirst({
      where: { email: 'admin@nutryhome.com' }
    });

    if (existingUser) {
      console.log('✅ Usuario por defecto ya existe');
      return existingUser;
    }

    // Crear usuario por defecto
    const defaultUser = await prisma.user.create({
      data: {
        nombre: 'Administrador',
        apellido: 'NutryHome',
        email: 'admin@nutryhome.com',
        password: 'admin123', // En producción debería ser hasheado
        rol: 'ADMIN',
        activo: true
      }
    });

    console.log('✅ Usuario por defecto creado:', defaultUser.id);
    return defaultUser;

  } catch (error) {
    console.error('❌ Error creando usuario por defecto:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createDefaultUser()
    .then(() => {
      console.log('🎉 Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

module.exports = { createDefaultUser }; 