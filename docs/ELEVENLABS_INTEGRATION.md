# Integración con ElevenLabs - NutryHome

## Descripción General

Esta integración permite ejecutar campañas de llamadas automáticas usando ElevenLabs como proveedor de servicios de voz. El sistema mantiene la base de datos como fuente de verdad y sincroniza el estado de las llamadas con ElevenLabs.

## Arquitectura

- **DB como Source of Truth**: La UI nunca lee ElevenLabs directamente
- **Sincronización Bidireccional**: API + sync en lugar de webhooks
- **Manejo Robusto de Errores**: Parsing defensivo y mapeo de estados
- **Variables Dinámicas Inteligentes**: Solo envía productos con cantidades > 0

## Endpoints Principales

### 1. Ejecutar Batch
```http
POST /campaigns/batch/:batchId/execute
```

**Descripción**: Inicia la ejecución de un batch en ElevenLabs.

**Flujo**:
1. Obtiene batch + contactos desde DB
2. Construye recipients con variables dinámicas
3. Envía a ElevenLabs API
4. Guarda `elevenLabsBatchId` en DB
5. Pre-crea registros `outboundCall`

**Respuesta**:
```json
{
  "success": true,
  "message": "Ejecución del batch iniciada",
  "batchId": "batch_id",
  "status": "PROCESSING"
}
```

### 2. Sincronizar Estado
```http
GET /campaigns/batch/:batchId/sync
```

**Descripción**: Sincroniza el estado del batch con ElevenLabs.

**Flujo**:
1. Obtiene estado actual desde ElevenLabs
2. Actualiza registros `outboundCall` en DB
3. Actualiza estado del `batch`
4. Retorna conteos por estado

**Respuesta**:
```json
{
  "ok": true,
  "batchId": "batch_id",
  "batchStatus": "COMPLETED",
  "counts": {
    "COMPLETED": 45,
    "FAILED": 5,
    "IN_PROGRESS": 0
  }
}
```

### 3. Obtener Llamadas del Batch
```http
GET /campaigns/batch/:batchId/calls
```

**Descripción**: Obtiene todas las llamadas de un batch específico.

**Respuesta**:
```json
{
  "success": true,
  "batch": {
    "id": "batch_id",
    "nombre": "Batch Entregas",
    "estado": "PROCESSING",
    "elevenLabsBatchId": "elevenlabs_batch_id",
    "totalCalls": 50,
    "completedCalls": 45,
    "failedCalls": 5,
    "inProgressCalls": 0,
    "pendingCalls": 0
  },
  "calls": [...],
  "total": 50
}
```

## Variables Dinámicas

### Estructura Automática
El sistema construye automáticamente las variables dinámicas basándose en el modelo `Contact`:

```javascript
{
  nombre_contacto: "Juan Pérez",
  nombre_paciente: "María González",
  domicilio_actual: "Av. Corrientes 123",
  localidad: "Buenos Aires",
  delegacion: "CABA",
  fecha_envio: "2024-01-15",
  observaciones: "Paciente con diabetes",
  producto1: "Insulina",
  cantidad1: 2,
  producto2: "Jeringas",
  cantidad2: 10
}
```

### Filtrado Inteligente
- Solo incluye productos con `cantidad > 0`
- Excluye productos marcados como "NA"
- Convierte automáticamente tipos de datos

## Estados de Llamada

### Mapeo ElevenLabs → Prisma
```javascript
// Estados exitosos
'success' → 'COMPLETED'
'completed' → 'COMPLETED'
'answered' → 'COMPLETED'

// Estados de fallo
'busy' → 'FAILED'
'rejected' → 'FAILED'
'no_answer' → 'FAILED'
'timeout' → 'FAILED'

// Estados en progreso
'queued' → 'IN_PROGRESS'
'processing' → 'IN_PROGRESS'
'ongoing' → 'IN_PROGRESS'
```

## Flujo de Uso Recomendado

### 1. Cargar Contactos
```javascript
// Subir Excel/CSV con contactos
POST /campaigns/upload
```

### 2. Ejecutar Batch
```javascript
// Iniciar llamadas
POST /campaigns/batch/:batchId/execute
```

### 3. Monitorear Progreso
```javascript
// Obtener estado actual
GET /campaigns/batch/:batchId/status
```

### 4. Sincronizar Estado
```javascript
// Actualizar desde ElevenLabs
GET /campaigns/batch/:batchId/sync
```

### 5. Ver Llamadas
```javascript
// Obtener detalles de llamadas
GET /campaigns/batch/:batchId/calls
```

## Configuración de Variables de Entorno

```bash
# Requeridas
ELEVENLABS_API_KEY=tu_api_key_aqui
ELEVENLABS_AGENT_ID=tu_agent_id_aqui
ELEVENLABS_PHONE_NUMBER_ID=tu_phone_number_id_aqui

# Opcionales
ELEVENLABS_BASE_URL=https://api.elevenlabs.io
ELEVENLABS_PROJECT_ID=tu_project_id_aqui
```

## Manejo de Errores

### Errores Comunes
- **API Key inválida**: Verificar `ELEVENLABS_API_KEY`
- **Agent ID no encontrado**: Verificar `ELEVENLABS_AGENT_ID`
- **Phone Number ID inválido**: Verificar `ELEVENLABS_PHONE_NUMBER_ID`
- **Batch no en estado PENDING**: Solo se pueden ejecutar batches pendientes

### Logs de Debug
El sistema incluye logs detallados para debugging:
- Configuración de variables de entorno
- Payload enviado a ElevenLabs
- Respuestas de la API
- Errores y excepciones

## Ventajas de esta Implementación

1. **Robustez**: Manejo defensivo de errores y parsing
2. **Eficiencia**: Solo sincroniza cuando es necesario
3. **Escalabilidad**: Maneja grandes volúmenes de contactos
4. **Mantenibilidad**: Código limpio y bien estructurado
5. **Compatibilidad**: Funciona con tu estructura de DB existente

## Próximos Pasos

- [ ] Implementar retry automático para llamadas fallidas
- [ ] Agregar métricas de performance
- [ ] Implementar notificaciones en tiempo real
- [ ] Agregar validación de números de teléfono
- [ ] Implementar rate limiting para evitar sobrecarga
