const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Configurando base de datos para NutryHome...\n');

try {
  // Generar el cliente de Prisma
  console.log('📦 Generando cliente de Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Cliente de Prisma generado correctamente\n');

  // Crear migración inicial
  console.log('🔄 Creando migración inicial...');
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  console.log('✅ Migración creada y aplicada correctamente\n');

  // Verificar la conexión
  console.log('🔍 Verificando conexión a la base de datos...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Conexión verificada correctamente\n');

  console.log('🎉 ¡Base de datos configurada exitosamente!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Configura las variables de entorno en tu archivo .env');
  console.log('2. Ejecuta el servidor con: npm start');
  console.log('3. Prueba la API en: http://localhost:3001/api');

} catch (error) {
  console.error('❌ Error configurando la base de datos:', error.message);
  console.log('\n🔧 Soluciones posibles:');
  console.log('1. Verifica que DATABASE_URL esté configurada en tu .env');
  console.log('2. Asegúrate de que PostgreSQL esté ejecutándose');
  console.log('3. Verifica que tengas permisos para crear bases de datos');
  process.exit(1);
} 