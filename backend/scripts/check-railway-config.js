#!/usr/bin/env node

console.log('🔍 Verificando configuración de Railway...\n');

// Verificar variables de entorno críticas
const requiredEnvVars = [
  'DATABASE_URL',
  'NODE_ENV',
  'PORT'
];

console.log('📋 Variables de entorno requeridas:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName === 'DATABASE_URL' ? '***CONFIGURADA***' : value}`);
  } else {
    console.log(`❌ ${varName}: NO CONFIGURADA`);
  }
});

console.log('\n🔧 Configuración actual:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'no configurado'}`);
console.log(`PORT: ${process.env.PORT || 'no configurado'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'configurada' : 'NO CONFIGURADA'}`);

if (!process.env.DATABASE_URL) {
  console.log('\n🚨 PROBLEMA DETECTADO:');
  console.log('La variable DATABASE_URL no está configurada en Railway.');
  console.log('\n📋 Soluciones:');
  console.log('1. Ve a Railway Dashboard');
  console.log('2. Selecciona tu proyecto');
  console.log('3. Ve a "Variables"');
  console.log('4. Agrega DATABASE_URL con tu conexión PostgreSQL');
  console.log('5. O conecta un servicio PostgreSQL desde Railway');
} else {
  console.log('\n✅ Configuración correcta');
}

console.log('\n🎯 Próximos pasos:');
console.log('1. Verifica las variables en Railway Dashboard');
console.log('2. Asegúrate de que PostgreSQL esté conectado');
console.log('3. Ejecuta las migraciones si es necesario'); 