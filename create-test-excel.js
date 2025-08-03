const XLSX = require('xlsx');

// Datos de prueba para verificación de stock de productos nutricionales (basado en BatchTest2)
const testData = [
  {
    nombre_contacto: 'Joaquin',
    nombre_paciente: 'GALAN SERGIO EDER',
    phone_number: '+5491137710010',
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
  },
  {
    nombre_contacto: 'PAMELA',
    nombre_paciente: 'SAYAGO JOAQUIN',
    phone_number: '+5492235956604',
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
  },
  {
    nombre_contacto: 'SUSANA',
    nombre_paciente: 'GARAY LAUTARO',
    phone_number: '+5491132097353',
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
  },
  {
    nombre_contacto: 'GISELA',
    nombre_paciente: 'LOPEZ EMILIA',
    phone_number: '+5491132458252',
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
  },
  {
    nombre_contacto: 'MARIANA SALDIVIA',
    nombre_paciente: 'VILLEGAS SALDIVIA RODRIGO',
    phone_number: '+5491161557606',
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
];

// Crear workbook
const workbook = XLSX.utils.book_new();

// Crear worksheet
const worksheet = XLSX.utils.json_to_sheet(testData);

// Agregar el worksheet al workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Verificacion_Stock');

// Escribir el archivo
XLSX.writeFile(workbook, 'verificacion-stock-nutricional.xlsx');

console.log('✅ Archivo Excel de verificación de stock nutricional creado: verificacion-stock-nutricional.xlsx');
console.log(`📊 ${testData.length} pacientes incluidos`);
console.log('\n📋 Estructura del archivo:');
console.log('- nombre_contacto: Nombre del contacto/cuidador');
console.log('- nombre_paciente: Nombre completo del paciente');
console.log('- phone_number: Número de teléfono con formato +54XXXXXXXXXX');
console.log('- domicilio_actual: Dirección del paciente');
console.log('- localidad: Localidad del paciente');
console.log('- delegacion: Delegación/región');
console.log('- fecha_envio: Fecha de envío programado');
console.log('- producto1, producto2, producto3, producto4, producto5: Productos nutricionales');
console.log('- cantidad1, cantidad2, cantidad3, cantidad4, cantidad5: Cantidades de cada producto');
console.log('- observaciones: Notas sobre el estado del paciente y stock');
console.log('- prioridad: Prioridad del pedido (BAJA, MEDIA, ALTA, CRITICA)');
console.log('- estado_pedido: Estado del pedido (PENDIENTE, ENVIADO, ENTREGADO)');
console.log('\n🎯 Listo para verificación de saldo de productos nutricionales en domicilio!');
console.log('🔗 Compatible con variables dinámicas de ElevenLabs para generación de llamadas'); 