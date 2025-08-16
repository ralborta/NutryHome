# Configuración del Webhook ElevenLabs - NutryHome

## 🚀 **Configuración en ElevenLabs**

### 1. **Ir al Agente en ElevenLabs**
- Ve a tu dashboard de ElevenLabs
- Selecciona el agente que quieres usar
- Ve a la sección **"Webhooks"** o **"Post-call"**

### 2. **Configurar Webhook Post-Call**
**URL del webhook:**
```
https://TU-APP.railway.app/api/elevenlabs/webhooks/post-call
```

**Headers requeridos:**
```
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json
```

### 3. **Desactivar Tools en Vivo**
⚠️ **IMPORTANTE:** Desactiva los **Tools en vivo** (Create record/API Tool) para evitar el error 401 durante la llamada.

## 🔧 **Configuración en Railway**

### 1. **Variables de Entorno**
Agrega estas variables en tu proyecto de Railway:

```bash
ELEVENLABS_WEBHOOK_TOKEN=un_token_largo_unico_aqui
ELEVENLABS_API_KEY=tu_api_key_aqui
ELEVENLABS_PROJECT_ID=tu_project_id_aqui
```

### 2. **Generar Token Único**
Puedes generar un token único con:
```bash
openssl rand -hex 32
# o usar un UUID
uuidgen
```

## 🧪 **Test del Webhook**

### 1. **Test Básico (30 segundos)**
```bash
curl -i -X POST https://TU-APP.railway.app/api/elevenlabs/webhooks/post-call \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id":"conv_xxx"}'
```

### 2. **Respuestas Esperadas**
- **200 OK**: Webhook configurado correctamente
- **401 Unauthorized**: Token incorrecto o ruta mal configurada
- **404 Not Found**: Ruta no encontrada en Railway

## 📊 **Logs de Verificación**

### 1. **En Railway**
Ve a los logs de tu aplicación para ver:
```
🔄 Procesando webhook para conversación: conv_xxx
📊 Conversación conv_xxx: { status: 'completed', ... }
✅ DB actualizada: 1 registros actualizados
```

### 2. **En ElevenLabs**
Verifica que el webhook se esté enviando correctamente.

## 🔄 **Plan de Fallback**

### **Si el webhook falla en 2 intentos:**

1. **Desactivar webhook** en ElevenLabs
2. **Cambiar a Pull-Only** (solo API)
3. **Usar endpoints existentes:**
   - `GET /api/campaigns/batch/:id/sync`
   - `GET /api/campaigns/batch/:id/calls`

## 🎯 **Endpoints Disponibles**

### **Webhook (Automático)**
```
POST /api/elevenlabs/webhooks/post-call
```

### **Sincronización Manual**
```
GET /api/campaigns/batch/:id/sync
```

### **Estado del Batch**
```
GET /api/campaigns/batch/:id/status
```

### **Llamadas del Batch**
```
GET /api/campaigns/batch/:id/calls
```

## ✅ **Checklist de Verificación**

- [ ] Webhook configurado en ElevenLabs
- [ ] Token configurado en Railway
- [ ] Tools en vivo desactivados
- [ ] Test del webhook responde 200
- [ ] Logs muestran procesamiento correcto
- [ ] Base de datos se actualiza automáticamente

## 🚨 **Solución de Problemas**

### **Error 401:**
- Verificar token en Railway
- Verificar token en ElevenLabs
- Verificar ruta del webhook

### **Error 404:**
- Verificar que la ruta esté registrada en el servidor
- Verificar que Railway esté desplegado

### **Error de Base de Datos:**
- Verificar conexión a PostgreSQL
- Verificar esquema de Prisma
- Verificar migraciones aplicadas

## 📞 **Soporte**

Si tienes problemas:
1. Revisar logs de Railway
2. Verificar configuración de variables
3. Testear endpoint manualmente
4. Verificar configuración en ElevenLabs
