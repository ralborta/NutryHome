# PASO 1: Configuración del Webhook Post-Call - ElevenLabs

## 🎯 **Objetivo del PASO 1**

Implementar el **webhook post-call** que se ejecuta **DESPUÉS** de que termine la llamada, sin interrumpir la conversación.

## ✅ **Lo que NO va a pasar más:**

- ❌ **Error 401 durante la llamada**
- ❌ **Conversación cortada por autenticación**
- ❌ **Tools en vivo fallando**

## 🔧 **Configuración en ElevenLabs**

### **1. Ir al Agente Isabela**
- Ve a tu dashboard de ElevenLabs
- Selecciona **"Agents"**
- Haz clic en **"Isabela"**

### **2. Configurar Webhook Post-Call**
- Ve a la pestaña **"Tools & Integrations"**
- Busca la sección **"Webhooks"** o **"Post-call"**
- **Activa** el webhook post-call

### **3. Configurar URL y Headers**
**URL del webhook:**
```
https://TU-APP.railway.app/api/elevenlabs/webhooks/post-call
```

**Headers requeridos:**
```
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json
```

### **4. DESACTIVAR Tools en Vivo (CRÍTICO)**
⚠️ **IMPORTANTE:** En la misma sección, **DESACTIVA** todos estos:
- ❌ **Webhook/API Tool**
- ❌ **Create record**
- ❌ **API Tool**
- ❌ **Cualquier Tool que haga HTTP durante la llamada**

**Solo mantén activo:**
- ✅ **Post-call webhook** (para después de la llamada)

## 🔑 **Configuración en Railway**

### **1. Variables de Entorno**
Agrega estas variables en tu proyecto de Railway:

```bash
ELEVENLABS_API_KEY=tu_api_key_aqui
ELEVENLABS_PROJECT_ID=tu_project_id_aqui
ELEVENLABS_WEBHOOK_TOKEN=un_token_largo_unico_aqui
ELEVENLABS_AGENT_ID=tu_agent_id_aqui
```

### **2. Generar Token Único**
```bash
# Opción 1: Con OpenSSL
openssl rand -hex 32

# Opción 2: Con UUID
uuidgen

# Opción 3: Online
# Ve a https://www.uuidgenerator.net/
```

## 🧪 **Test del Webhook**

### **1. Test Básico (30 segundos)**
```bash
curl -i -X POST https://TU-APP.railway.app/api/elevenlabs/webhooks/post-call \
  -H "Authorization: Bearer TU_TOKEN_GENERADO" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id":"conv_xxx"}'
```

### **2. Respuestas Esperadas**
- **200 OK**: Webhook configurado correctamente
- **401 Unauthorized**: Token incorrecto
- **404 Not Found**: Ruta no encontrada

## 📊 **Logs de Verificación**

### **1. En Railway**
Ve a los logs de tu aplicación para ver:
```
➡️ ElevenLabs hit POST /api/elevenlabs/webhooks/post-call { auth: 'present' }
🔄 Procesando webhook para conversación: conv_xxx
🔍 Buscando registro para teléfono: 5491123456789
✅ 1 registros actualizados para teléfono 5491123456789
✅ Webhook procesado exitosamente para conv_xxx
```

### **2. En ElevenLabs**
Verifica que el webhook se esté enviando correctamente.

## 🔄 **Flujo de Trabajo**

### **1. Llamada Inicia**
- ElevenLabs ejecuta la llamada **SIN Tools en vivo**
- **No hay errores 401** durante la conversación

### **2. Llamada Termina**
- ElevenLabs envía webhook post-call
- Railway responde **200 OK** inmediatamente
- Procesamiento en background

### **3. Base de Datos Actualizada**
- Estado de la llamada
- Duración
- Fecha de ejecución
- Resultado

### **4. Frontend Lee desde DB**
- UI siempre lee datos actualizados
- Sin llamadas directas a ElevenLabs

## ✅ **Checklist de Verificación**

- [ ] **Webhook post-call configurado** en ElevenLabs
- [ ] **Tools en vivo DESACTIVADOS** en ElevenLabs
- [ ] **Token configurado** en Railway
- [ ] **Test del webhook** responde 200
- [ ] **Logs muestran** procesamiento correcto
- [ ] **Llamada de prueba** sin errores 401

## 🚨 **Solución de Problemas**

### **Error 401:**
- Verificar token en Railway
- Verificar token en ElevenLabs
- Verificar ruta del webhook

### **Error 404:**
- Verificar que la ruta esté registrada en el servidor
- Verificar que Railway esté desplegado

### **Tools siguen fallando:**
- **Asegúrate** de que todos los Tools en vivo estén DESACTIVADOS
- Solo el webhook post-call debe estar activo

## 🎯 **Próximo Paso**

Una vez que el webhook post-call esté funcionando correctamente, pasaremos al **PASO 2: Fallback manual sync**.

¡Con este paso tendrás un sistema estable sin errores 401! 🚀
