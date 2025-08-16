const express = require('express');
const { prisma } = require('../database/client');

const router = express.Router();

// ===== Helpers =====
const H = {
  'xi-api-key': process.env.ELEVENLABS_API_KEY,
  ...(process.env.ELEVENLABS_PROJECT_ID ? { 'xi-project-id': process.env.ELEVENLABS_PROJECT_ID } : {})
};

function normalizeE164AR(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/[^\d]/g, '');
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('54')) p = '54' + p;
  return '+' + p;
}

function phoneDbKey(phone) {
  return normalizeE164AR(phone).replace(/^\+/, '');
}

function mapStatus(s='') {
  s = String(s).toLowerCase();
  if (['success','completed','answered','ok'].some(x=>s.includes(x))) return 'COMPLETED';
  if (['busy','line_busy'].some(x=>s.includes(x)))              return 'FAILED';
  if (['rejected','declined','blocked'].some(x=>s.includes(x)))return 'FAILED';
  if (['no_answer','timeout','ringout'].some(x=>s.includes(x)))return 'FAILED';
  if (['queued','processing','ongoing','in_progress','pending'].some(x=>s.includes(x))) return 'IN_PROGRESS';
  if (['failed','error'].some(x=>s.includes(x)))               return 'FAILED';
  return 'FAILED';
}

// intenta setear duration en duracion y si Prisma falla, usa duracion_llamada
async function updateDurationSmart(where, seconds) {
  try {
    await prisma.outboundCall.updateMany({ where, data: { duracion: seconds ?? null } });
    console.log(`✅ Duración actualizada: ${seconds}s`);
  } catch (error) {
    console.warn(`⚠️ Fallback duración: ${error.message}`);
    try {
      await prisma.outboundCall.updateMany({ where, data: { duracion_llamada: seconds ?? null } });
      console.log(`✅ Duración fallback actualizada: ${seconds}s`);
    } catch (fallbackError) {
      console.error(`❌ Error actualizando duración: ${fallbackError.message}`);
    }
  }
}

async function fetchConversation(convId) {
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${convId}`, { headers: H });
  if (!r.ok) throw new Error(`Conversation ${convId} => ${r.status}`);
  return await r.json();
}

// ===== Guard-rail logs (útil para diagnóstico) =====
router.use('/elevenlabs', (req, res, next) => {
  console.log('➡️ ElevenLabs hit', req.method, req.originalUrl, { 
    auth: req.get('authorization') ? 'present' : 'missing' 
  });
  next();
});

// ===== Webhook post-call (ACK inmediato + pull de detalles) =====
router.post('/elevenlabs/webhooks/post-call', async (req, res) => {
  try {
    const expected = `Bearer ${process.env.ELEVENLABS_WEBHOOK_TOKEN}`;
    if ((req.get('authorization') || '') !== expected) {
      console.log('❌ Webhook unauthorized:', req.get('authorization'));
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 1) ACK inmediato (no bloquea reintentos ni la UX)
    res.status(200).json({ ok: true });

    // 2) Procesar en background
    const { conversation_id } = req.body || {};
    if (!conversation_id) {
      console.log('⚠️ Webhook sin conversation_id');
      return;
    }

    console.log(`🔄 Procesando webhook para conversación: ${conversation_id}`);

    const conv = await fetchConversation(conversation_id);

    const calledNum =
      conv?.metadata?.phone_call?.external_number ||
      conv?.conversation_initiation_client_data?.dynamic_variables?.system__called_number ||
      null;

    const status = mapStatus(conv?.status || conv?.analysis?.call_result || '');
    const dur = conv?.metadata?.call_duration_secs ?? null;
    const startTime = conv?.metadata?.start_time_unix_secs;

    console.log(`📊 Conversación ${conversation_id}:`, {
      called_number: calledNum,
      status: conv?.status,
      call_result: conv?.analysis?.call_result,
      mapped_status: status,
      duration: dur,
      start_time: startTime
    });

    // match por número dentro de los batches abiertos más recientes
    const phoneKey = calledNum ? phoneDbKey(calledNum) : null;
    if (phoneKey) {
      console.log(`🔍 Buscando registro para teléfono: ${phoneKey}`);
      
      // actualiza registro(s) de la última hora con ese número
      const since = new Date(Date.now() - 1000 * 60 * 60);
      
      const updateResult = await prisma.outboundCall.updateMany({
        where: {
          telefono: phoneKey,
          createdAt: { gte: since },
          // evita tocar terminales si ya quedaron cerrados correctamente
          NOT: { estado: { in: ['COMPLETED', 'FAILED'] } }
        },
        data: { 
          estado: status,
          fechaEjecutada: startTime ? new Date(startTime * 1000) : undefined,
          resultado: conv?.status || conv?.analysis?.call_result || 'unknown'
        }
      });

      if (updateResult.count > 0) {
        console.log(`✅ ${updateResult.count} registros actualizados para teléfono ${phoneKey}`);
        
        // Actualizar duración
        await updateDurationSmart({ 
          telefono: phoneKey, 
          createdAt: { gte: since } 
        }, dur);
      } else {
        console.log(`⚠️ No se encontraron registros para actualizar en teléfono ${phoneKey}`);
      }
    } else {
      console.warn('❌ post-call: no pude determinar número llamado', { conversation_id });
    }

    console.log(`✅ Webhook procesado exitosamente para ${conversation_id}`);

  } catch (e) {
    console.error('❌ post-call webhook error:', e);
  }
});

// ===== Fallback manual: sync por agente (trae lo de hoy o desde ?after=UNIX) =====
router.get('/elevenlabs/conversations/sync', async (req, res) => {
  try {
    const agentId = (req.query.agent_id || process.env.ELEVENLABS_AGENT_ID || '').toString().trim();
    if (!agentId) {
      return res.status(400).json({ ok: false, error: 'agent_id requerido' });
    }

    console.log(`🔄 Iniciando sync manual para agente: ${agentId}`);

    const after = Number(req.query.after || Math.floor(Date.now() / 1000) - 60 * 60 * 12); // últimas 12h por defecto
    let cursor = null, imported = 0;

    do {
      const qs = new URLSearchParams({
        agent_id: agentId,
        page_size: '100',
        call_start_after_unix: String(after),
        ...(cursor ? { cursor } : {})
      });
      
      const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?${qs}`, { headers: H });
      if (!r.ok) {
        return res.status(r.status).json({ ok: false, error: `list => ${r.status}` });
      }
      
      const data = await r.json();
      console.log(`📄 Procesando página con ${data.conversations?.length || 0} conversaciones`);

      for (const item of (data.conversations || [])) {
        imported++;
        const conv = await fetchConversation(item.conversation_id);

        const calledNum =
          conv?.metadata?.phone_call?.external_number ||
          conv?.conversation_initiation_client_data?.dynamic_variables?.system__called_number || null;

        const status = mapStatus(conv?.status || item?.call_successful || '');
        const dur = conv?.metadata?.call_duration_secs ?? item?.call_duration_secs ?? null;

        if (calledNum) {
          const phoneKey = phoneDbKey(calledNum);
          const since = new Date((conv?.metadata?.start_time_unix_secs ?? after) * 1000 - 1000 * 60 * 30);
          
          const updateResult = await prisma.outboundCall.updateMany({
            where: { 
              telefono: phoneKey, 
              createdAt: { gte: since } 
            },
            data: { 
              estado: status,
              fechaEjecutada: conv?.metadata?.start_time_unix_secs ? 
                new Date(conv.metadata.start_time_unix_secs * 1000) : undefined,
              resultado: conv?.status || item?.call_successful || 'unknown'
            }
          });

          if (updateResult.count > 0) {
            console.log(`✅ Sync: ${updateResult.count} registros actualizados para ${phoneKey}`);
            await updateDurationSmart({ 
              telefono: phoneKey, 
              createdAt: { gte: since } 
            }, dur);
          }
        }
      }

      cursor = data.has_more ? data.next_cursor : null;
    } while (cursor);

    console.log(`✅ Sync manual completado: ${imported} conversaciones procesadas`);
    res.json({ ok: true, imported });

  } catch (e) {
    console.error('❌ Error en sync manual:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = router;
