# API de Campañas Outbound - NutryHome

## 📋 Descripción General

La API de Campañas Outbound permite gestionar campañas de llamadas salientes, incluyendo la creación de campañas, batches de contactos, y la carga masiva de datos desde archivos CSV.

## 🏗️ Estructura de Datos

### Campañas (Campaigns)
- **id**: Identificador único de la campaña
- **nombre**: Nombre de la campaña
- **descripcion**: Descripción opcional
- **estado**: Estado de la campaña (DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED)
- **fechaInicio**: Fecha de inicio de la campaña
- **fechaFin**: Fecha de finalización de la campaña
- **createdBy**: Usuario que creó la campaña

### Batches
- **id**: Identificador único del batch
- **nombre**: Nombre del batch
- **campaignId**: ID de la campaña a la que pertenece
- **estado**: Estado del batch (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)
- **totalCalls**: Total de llamadas en el batch
- **completedCalls**: Llamadas completadas
- **failedCalls**: Llamadas fallidas

### Llamadas Outbound (OutboundCall)
- **id**: Identificador único de la llamada
- **batchId**: ID del batch al que pertenece
- **telefono**: Número de teléfono
- **nombre**: Nombre del contacto (opcional)
- **email**: Email del contacto (opcional)
- **estado**: Estado de la llamada (PENDING, SCHEDULED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
- **intentos**: Número de intentos realizados
- **maxIntentos**: Máximo número de intentos permitidos
- **fechaProgramada**: Fecha programada para la llamada
- **fechaEjecutada**: Fecha en que se ejecutó la llamada
- **resultado**: Resultado de la llamada (ANSWERED, NO_ANSWER, BUSY, INVALID_NUMBER, VOICEMAIL, HANGUP, ERROR)

## 🔗 Endpoints

### Campañas

#### GET /api/campaigns
Lista todas las campañas con paginación.

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Límite de resultados por página (default: 10)
- `estado` (opcional): Filtrar por estado de campaña

**Respuesta:**
```json
{
  "campaigns": [
    {
      "id": "campaign-id",
      "nombre": "Campaña de Verificación",
      "descripcion": "Campaña para verificar datos de clientes",
      "estado": "ACTIVE",
      "fechaInicio": "2024-01-01T00:00:00Z",
      "fechaFin": "2024-01-31T23:59:59Z",
      "createdBy": {
        "id": "user-id",
        "nombre": "Juan",
        "apellido": "Pérez",
        "email": "juan@nutryhome.com"
      },
      "batches": [
        {
          "id": "batch-id",
          "nombre": "Batch 1",
          "estado": "COMPLETED",
          "totalCalls": 100,
          "completedCalls": 85,
          "failedCalls": 15
        }
      ],
      "_count": {
        "batches": 1
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

#### GET /api/campaigns/:id
Obtiene una campaña específica con todos sus batches y contactos.

#### POST /api/campaigns
Crea una nueva campaña.

**Body:**
```json
{
  "nombre": "Nueva Campaña",
  "descripcion": "Descripción de la campaña",
  "fechaInicio": "2024-01-01T00:00:00Z",
  "fechaFin": "2024-01-31T23:59:59Z"
}
```

#### PUT /api/campaigns/:id
Actualiza una campaña existente.

#### DELETE /api/campaigns/:id
Elimina una campaña y todos sus batches asociados.

### Batches

#### POST /api/campaigns/:id/batches
Crea un nuevo batch para una campaña.

**Body:**
```json
{
  "nombre": "Nuevo Batch"
}
```

### Carga de Contactos

#### POST /api/campaigns/:id/batches/:batchId/upload
Carga un archivo CSV con contactos para un batch específico.

**Form Data:**
- `file`: Archivo CSV con los contactos

**Formato del CSV:**
```csv
telefono,nombre,email
+34612345678,Juan Pérez,juan.perez@email.com
+34623456789,María García,maria.garcia@email.com
```

**Respuesta:**
```json
{
  "message": "100 contactos cargados correctamente",
  "totalCalls": 100,
  "errors": [
    "Teléfono inválido: 123",
    "Fila sin teléfono: {\"nombre\":\"Test\"}"
  ]
}
```

#### GET /api/campaigns/:id/batches/:batchId/contacts
Obtiene los contactos de un batch específico.

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Límite de resultados por página (default: 50)
- `estado` (opcional): Filtrar por estado de llamada

## 📊 Estados y Enums

### Estados de Campaña
- `DRAFT`: Borrador
- `ACTIVE`: Activa
- `PAUSED`: Pausada
- `COMPLETED`: Completada
- `CANCELLED`: Cancelada

### Estados de Batch
- `PENDING`: Pendiente
- `PROCESSING`: Procesando
- `COMPLETED`: Completado
- `FAILED`: Fallido
- `CANCELLED`: Cancelado

### Estados de Llamada Outbound
- `PENDING`: Pendiente
- `SCHEDULED`: Programada
- `IN_PROGRESS`: En progreso
- `COMPLETED`: Completada
- `FAILED`: Fallida
- `CANCELLED`: Cancelada

### Resultados de Llamada
- `ANSWERED`: Contestada
- `NO_ANSWER`: Sin respuesta
- `BUSY`: Ocupado
- `INVALID_NUMBER`: Número inválido
- `VOICEMAIL`: Buzón de voz
- `HANGUP`: Colgada
- `ERROR`: Error

## 🔧 Configuración

### Variables de Entorno Requeridas
```env
DATABASE_URL="postgresql://username:password@localhost:5432/nutryhome_db"
```

### Dependencias
```json
{
  "csv-parser": "^3.0.0",
  "multer": "^1.4.5-lts.1"
}
```

## 🚀 Uso Rápido

1. **Crear una campaña:**
```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Mi Campaña", "descripcion": "Descripción"}'
```

2. **Crear un batch:**
```bash
curl -X POST http://localhost:3001/api/campaigns/CAMPAIGN_ID/batches \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Mi Batch"}'
```

3. **Cargar contactos:**
```bash
curl -X POST http://localhost:3001/api/campaigns/CAMPAIGN_ID/batches/BATCH_ID/upload \
  -F "file=@contacts.csv"
```

## 📝 Notas Importantes

- Los archivos CSV deben tener al menos la columna `telefono`
- Los teléfonos se limpian automáticamente (se eliminan caracteres no numéricos)
- Se validan teléfonos con mínimo 10 dígitos
- Los archivos CSV tienen un límite de 10MB
- Solo se aceptan archivos con extensión .csv o MIME type text/csv 