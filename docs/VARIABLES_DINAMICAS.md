# Variables Dinámicas - NutryHome

## 📋 Descripción General

El sistema de variables dinámicas permite personalizar las campañas outbound con datos específicos de cada contacto, como información de productos, direcciones, fechas, etc.

## 🏗️ Estructura de Variables Dinámicas

### Plantillas de Variables (VariableTemplate)
- **id**: Identificador único de la plantilla
- **nombre**: Nombre de la plantilla
- **descripcion**: Descripción de la plantilla
- **variables**: Array de variables disponibles
- **activo**: Estado de la plantilla

### Variables en Batches
- **variables**: Campo JSON que almacena variables específicas del batch
- Se pueden definir variables globales para todo el batch

### Variables en Llamadas Outbound
- **variables**: Campo JSON que almacena variables específicas de cada contacto
- Cada contacto puede tener valores únicos para las variables

## 📊 Variables Disponibles (Plantilla NutryHome)

### Información de Contacto
- `nombre_contacto` - Nombre de la persona de contacto
- `nombre_paciente` - Nombre del paciente/cliente
- `phone_number` - Número de teléfono
- `domicilio_actual` - Dirección actual
- `localidad` - Ciudad o localidad
- `delegacion` - Delegación o distrito

### Información de Pedido
- `fecha_envio` - Fecha de envío del pedido
- `producto1` - Primer producto
- `cantidad1` - Cantidad del primer producto
- `producto2` - Segundo producto
- `cantidad2` - Cantidad del segundo producto
- `producto3` - Tercer producto
- `cantidad3` - Cantidad del tercer producto
- `producto4` - Cuarto producto
- `cantidad4` - Cantidad del cuarto producto
- `producto5` - Quinto producto
- `cantidad5` - Cantidad del quinto producto

### Información Adicional
- `observaciones` - Observaciones especiales
- `prioridad` - Prioridad del pedido (BAJA, MEDIA, ALTA, CRITICA)
- `estado_pedido` - Estado del pedido (PENDIENTE, ENVIADO, ENTREGADO)

## 🔗 API de Variables Dinámicas

### Plantillas de Variables

#### GET /api/variables/templates
Lista todas las plantillas de variables.

#### GET /api/variables/templates/:id
Obtiene una plantilla específica.

#### POST /api/variables/templates
Crea una nueva plantilla.

**Body:**
```json
{
  "nombre": "Mi Plantilla",
  "descripcion": "Descripción de la plantilla",
  "variables": [
    "nombre_contacto",
    "phone_number",
    "producto1",
    "cantidad1"
  ]
}
```

#### PUT /api/variables/templates/:id
Actualiza una plantilla existente.

#### DELETE /api/variables/templates/:id
Elimina una plantilla (solo si no está siendo usada).

#### GET /api/variables/available
Obtiene todas las variables disponibles de todas las plantillas activas.

## 📁 Formato CSV con Variables Dinámicas

### Estructura del CSV
```csv
phone_number,nombre_contacto,nombre_paciente,domicilio_actual,localidad,delegacion,fecha_envio,producto1,cantidad1,producto2,cantidad2,producto3,cantidad3,observaciones,prioridad,estado_pedido
+34612345678,Juan Pérez,María García,Calle Mayor 123,Madrid,Centro,2024-01-15,NutryShake,2,Vitamina C,1,Omega 3,3,Cliente preferencial,ALTA,ENVIADO
```

### Campos Requeridos
- `phone_number` o `telefono` - Número de teléfono (obligatorio)

### Campos Opcionales
- `nombre` o `nombre_contacto` - Nombre del contacto
- `email` - Email del contacto
- Cualquier variable definida en la plantilla de la campaña

## 🚀 Uso en Campañas

### 1. Crear Campaña con Plantilla
```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Campaña NutryHome",
    "descripcion": "Campaña con variables dinámicas",
    "variableTemplateId": "TEMPLATE_ID"
  }'
```

### 2. Crear Batch
```bash
curl -X POST http://localhost:3001/api/campaigns/CAMPAIGN_ID/batches \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Batch con Variables"}'
```

### 3. Cargar Contactos con Variables
```bash
curl -X POST http://localhost:3001/api/campaigns/CAMPAIGN_ID/batches/BATCH_ID/upload \
  -F "file=@contacts-with-variables.csv"
```

## 💡 Ejemplos de Uso

### Variables en Scripts de Llamada
```javascript
// Ejemplo de uso en script de llamada
const variables = outboundCall.variables;

const script = `
Hola ${variables.nombre_contacto}, 
te llamo sobre el pedido de ${variables.producto1} 
para ${variables.nombre_paciente} 
en ${variables.domicilio_actual}, ${variables.localidad}.
`;

console.log(script);
```

### Filtrado por Variables
```javascript
// Buscar contactos por prioridad
const highPriorityCalls = await prisma.outboundCall.findMany({
  where: {
    batchId: batchId,
    variables: {
      path: ['prioridad'],
      equals: 'ALTA'
    }
  }
});
```

## 🔧 Configuración

### Crear Plantilla de Ejemplo
```bash
npm run create:template
```

### Ver Variables Disponibles
```bash
curl http://localhost:3001/api/variables/available
```

## 📝 Notas Importantes

- Las variables se almacenan como JSON para máxima flexibilidad
- Se pueden agregar nuevas variables sin cambiar el esquema de la base de datos
- Las variables son opcionales y pueden estar vacías
- Se valida que las variables del CSV coincidan con la plantilla de la campaña
- Se pueden usar variables tanto a nivel de batch como de contacto individual 