# NutryHome API Documentation

## Base URL
```
https://nutryhome-backend.railway.app/api
```

## Autenticación
La API utiliza JWT (JSON Web Tokens) para la autenticación. Incluye el token en el header `Authorization`:

```
Authorization: Bearer <token>
```

## Endpoints

### Autenticación

#### POST /auth/login
Iniciar sesión de usuario.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": "user_id",
      "email": "usuario@ejemplo.com",
      "nombre": "Juan",
      "apellido": "Pérez",
      "rol": "AGENTE",
      "activo": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here",
    "expiresIn": "24h"
  }
}
```

#### POST /auth/register
Registrar nuevo usuario.

**Request Body:**
```json
{
  "email": "nuevo@ejemplo.com",
  "password": "contraseña123",
  "nombre": "María",
  "apellido": "García",
  "rol": "AGENTE"
}
```

#### GET /auth/me
Obtener información del usuario actual (requiere autenticación).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "usuario@ejemplo.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "rol": "AGENTE",
    "activo": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Llamadas

#### GET /calls
Obtener lista de llamadas con paginación y filtros.

**Query Parameters:**
- `page` (number): Página actual (default: 1)
- `limit` (number): Elementos por página (default: 10, max: 100)
- `status` (string): Filtrar por status (ACTIVE, ARCHIVED, DELETED)
- `telefono` (string): Buscar por teléfono
- `fechaDesde` (string): Fecha desde (ISO format)
- `fechaHasta` (string): Fecha hasta (ISO format)
- `sortBy` (string): Campo para ordenar (fecha, duracion, createdAt)
- `sortOrder` (string): Orden (asc, desc)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "calls": [
      {
        "id": "call_id",
        "callId": "CALL001",
        "fecha": "2024-01-01T10:00:00.000Z",
        "telefono": "+1234567890",
        "duracion": 180,
        "transcript": "Hola, necesito ayuda...",
        "dataCollection": {},
        "criteriaResults": {},
        "status": "ACTIVE",
        "createdAt": "2024-01-01T10:00:00.000Z",
        "updatedAt": "2024-01-01T10:00:00.000Z",
        "derivations": [],
        "complaints": [],
        "_count": {
          "derivations": 0,
          "complaints": 0
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### GET /calls/:id
Obtener detalle de una llamada específica.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "call_id",
    "callId": "CALL001",
    "fecha": "2024-01-01T10:00:00.000Z",
    "telefono": "+1234567890",
    "duracion": 180,
    "transcript": "Hola, necesito ayuda...",
    "dataCollection": {},
    "criteriaResults": {},
    "status": "ACTIVE",
    "derivations": [
      {
        "id": "derivation_id",
        "motivo": "Consulta técnica",
        "descripcion": "Cliente requiere asistencia",
        "prioridad": "MEDIA",
        "createdAt": "2024-01-01T10:00:00.000Z"
      }
    ],
    "complaints": []
  }
}
```

#### POST /calls
Crear una nueva llamada manualmente.

**Request Body:**
```json
{
  "callId": "CALL001",
  "telefono": "+1234567890",
  "duracion": 180,
  "transcript": "Hola, necesito ayuda...",
  "dataCollection": {
    "customer_id": "CUST123",
    "agent_id": "AGENT456"
  },
  "criteriaResults": {
    "sentiment": "positive",
    "satisfaction_score": 8.5
  }
}
```

#### PUT /calls/:id
Actualizar una llamada existente.

**Request Body:**
```json
{
  "telefono": "+1234567890",
  "duracion": 200,
  "transcript": "Transcripción actualizada...",
  "status": "ARCHIVED"
}
```

#### DELETE /calls/:id
Eliminar una llamada (soft delete).

### Estadísticas

#### GET /stats/overview
Obtener resumen global de estadísticas.

**Query Parameters:**
- `fechaDesde` (string): Fecha desde (ISO format, default: 30 días atrás)
- `fechaHasta` (string): Fecha hasta (ISO format, default: hoy)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": {
      "desde": "2024-01-01T00:00:00.000Z",
      "hasta": "2024-01-31T23:59:59.999Z"
    },
    "overview": {
      "totalCalls": 1250,
      "totalDuration": "45h 30m 15s",
      "totalDurationSeconds": 163815,
      "avgDuration": "2m 15s",
      "avgDurationSeconds": 135,
      "totalDerivations": 89,
      "totalComplaints": 23,
      "successRate": 87.5,
      "successfulCalls": 1094
    },
    "byStatus": {
      "ACTIVE": 1200,
      "ARCHIVED": 45,
      "DELETED": 5
    },
    "byDay": [
      {
        "fecha": "2024-01-01",
        "cantidad": 45
      }
    ]
  }
}
```

#### GET /stats/derivations
Obtener top motivos de derivación.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": {
      "desde": "2024-01-01T00:00:00.000Z",
      "hasta": "2024-01-31T23:59:59.999Z"
    },
    "topMotivos": [
      {
        "motivo": "Consulta técnica",
        "cantidad": 45
      }
    ],
    "porPrioridad": [
      {
        "prioridad": "MEDIA",
        "cantidad": 67
      }
    ]
  }
}
```

#### GET /stats/complaints
Obtener estadísticas de reclamos.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": {
      "desde": "2024-01-01T00:00:00.000Z",
      "hasta": "2024-01-31T23:59:59.999Z"
    },
    "porTipo": [
      {
        "tipo": "CALIDAD",
        "cantidad": 12
      }
    ],
    "porSeveridad": [
      {
        "severidad": "MEDIA",
        "cantidad": 15
      }
    ],
    "resumen": {
      "total": 23,
      "resueltos": 18,
      "pendientes": 5,
      "tasaResolucion": 78.26
    }
  }
}
```

#### GET /stats/performance
Obtener métricas de rendimiento.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": {
      "desde": "2024-01-01T00:00:00.000Z",
      "hasta": "2024-01-31T23:59:59.999Z"
    },
    "callsByHour": [
      {
        "hora": 9,
        "cantidad": 45
      }
    ],
    "avgDurationByDay": [
      {
        "dia": "2024-01-01",
        "duracionPromedio": 135
      }
    ],
    "peakHours": [
      {
        "hora": 10,
        "cantidad": 52
      }
    ]
  }
}
```

### Webhooks

#### POST /webhooks/elevenlabs
Recibir webhook de ElevenLabs (requiere autenticación con firma).

**Headers:**
```
X-ElevenLabs-Signature: <signature>
```

**Request Body:**
```json
{
  "call_id": "elevenlabs_call_id",
  "phone_number": "+1234567890",
  "duration": 180,
  "transcript": "Hola, necesito ayuda...",
  "data_collection": {
    "customer_id": "CUST123",
    "agent_id": "AGENT456"
  },
  "criteria_results": {
    "sentiment": "positive",
    "satisfaction_score": 8.5,
    "derivations": [
      {
        "reason": "Consulta técnica",
        "description": "Cliente requiere asistencia",
        "priority": "MEDIA"
      }
    ],
    "complaints": []
  },
  "timestamp": "2024-01-01T10:00:00.000Z",
  "status": "completed"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Llamada procesada exitosamente",
  "data": {
    "callId": "internal_call_id",
    "elevenLabsCallId": "elevenlabs_call_id",
    "status": "ACTIVE"
  }
}
```

## Códigos de Error

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "message": "Datos de entrada inválidos"
  },
  "timestamp": "2024-01-01T10:00:00.000Z",
  "path": "/api/calls",
  "method": "POST"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "Token de acceso requerido"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "message": "Llamada no encontrada"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "message": "Error interno del servidor"
  }
}
```

## Rate Limiting

La API implementa rate limiting:
- **Límite**: 100 requests por 15 minutos por IP
- **Headers de respuesta**:
  - `X-RateLimit-Limit`: Límite de requests
  - `X-RateLimit-Remaining`: Requests restantes
  - `X-RateLimit-Reset`: Tiempo de reset

## Ejemplos de Uso

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://nutryhome-backend.railway.app/api',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Obtener llamadas
const response = await api.get('/calls', {
  params: {
    page: 1,
    limit: 10,
    status: 'ACTIVE'
  }
});

// Crear llamada
const newCall = await api.post('/calls', {
  callId: 'CALL001',
  telefono: '+1234567890',
  duracion: 180,
  transcript: 'Hola...',
  dataCollection: {},
  criteriaResults: {}
});
```

### cURL
```bash
# Login
curl -X POST https://nutryhome-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"contraseña123"}'

# Obtener llamadas
curl -X GET https://nutryhome-backend.railway.app/api/calls \
  -H "Authorization: Bearer <token>"

# Crear llamada
curl -X POST https://nutryhome-backend.railway.app/api/calls \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"callId":"CALL001","telefono":"+1234567890","duracion":180,"transcript":"Hola...","dataCollection":{},"criteriaResults":{}}'
```

## Notas Importantes

1. **Autenticación**: Todos los endpoints (excepto login, register y webhooks) requieren autenticación JWT.
2. **Validación**: Todos los datos de entrada son validados con Joi.
3. **Paginación**: Los endpoints de listado soportan paginación.
4. **Filtros**: Se pueden aplicar múltiples filtros en los endpoints de listado.
5. **Webhooks**: Los webhooks de ElevenLabs requieren verificación de firma.
6. **Soft Delete**: Las eliminaciones son soft delete (cambian status a DELETED).
7. **Timestamps**: Todas las fechas están en formato ISO 8601 UTC. 