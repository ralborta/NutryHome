const express = require('express');
const { prisma } = require('../database/client');

const router = express.Router();

const EXPECTED = `Bearer ${process.env.ELEVENLABS_WEBHOOK_TOKEN}`;
const H = {
  'xi-api-key': process.env.ELEVENLABS_API_KEY,
  ...(process.env.ELEVENLABS_PROJECT_ID ? { 'xi-project-id': process.env.ELEVENLABS_PROJECT_ID } : {})
};

function mapStatus(s='') {
  s = String(s).toLowerCase();
  if (['success','completed','answered','ok'].some(x=>s.includes(x))) return 'COMPLETED';
  if (['busy','line_busy'].some(x=>s.includes(x))) return 'FAILED';
  if (['rejected','declined','blocked'].some(x=>s.includes(x))) return 'FAILED';
  if (['no_answer','timeout','ringout'].some(x=>s.includes(x))) return 'FAILED';
  if (['queued','processing','ongoing','in_progress','pending'].some(x=>s.includes(x))) return 'IN_PROGRESS';
  if (['failed','error'].some(x=>s.includes(x))) return 'FAILED';
  return 'FAILED';
}

router.post('/elevenlabs/webhooks/post-call', async (req, res) => {
  try {
    if ((req.get('authorization') || '') !== EXPECTED) {
      console.log('❌ Webhook unauthorized:', req.get('authorization'));
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // ACK inmediato (no bloquea ni reintenta)
    res.status(200).json({ ok: true });

    const { conversation_id } = req.body || {};
    if (!conversation_id) {
      console.log('⚠️ Webhook sin conversation_id');
      return;
    }

    console.log(`🔄 Procesando webhook para conversación: ${conversation_id}`);

    // 1) Traer detalle de la conversación
    const det = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversation_id}`, { headers: H });
    const conv = await det.json().catch(()=> ({}));

    const start = conv?.metadata?.start_time_unix_secs ?? null;
    const dur   = conv?.metadata?.call_duration_secs ?? null;
    const status = mapStatus(conv?.status || conv?.analysis?.call_result || '');

    console.log(`📊 Conversación ${conversation_id}:`, {
      status: conv?.status,
      call_result: conv?.analysis?.call_result,
      mapped_status: status,
      duration: dur,
      start_time: start
    });

    // 2) Actualizar tu DB (ajusta nombres de columnas!)
    try {
      const updateResult = await prisma.outboundCall.updateMany({
        where: { callId: conversation_id },
        data: {
          estado: status,
          duracion: dur ?? undefined,
          fechaEjecutada: start ? new Date(start * 1000) : undefined,
          resultado: conv?.status || conv?.analysis?.call_result || 'unknown'
        }
      });

      console.log(`✅ DB actualizada: ${updateResult.count} registros actualizados`);
    } catch (dbError) {
      console.error('❌ Error actualizando DB:', dbError);
      
      // Fallback: buscar por teléfono si no encuentra por callId
      if (conv?.metadata?.phone_number) {
        try {
          const phone = conv.metadata.phone_number.replace(/^\+/, '');
          const fallbackUpdate = await prisma.outboundCall.updateMany({
            where: { telefono: phone },
            data: {
              estado: status,
              duracion: dur ?? undefined,
              fechaEjecutada: start ? new Date(start * 1000) : undefined,
              resultado: conv?.status || conv?.analysis?.call_result || 'unknown'
            }
          });
          console.log(`🔄 Fallback por teléfono: ${fallbackUpdate.count} registros actualizados`);
        } catch (fallbackError) {
          console.error('❌ Error en fallback por teléfono:', fallbackError);
        }
      }
    }

    // 3) Si hay audio, bájalo (opcional: subir a S3 y guardar URL)
    if (conv?.has_audio) {
      console.log(`🎵 Descargando audio para conversación ${conversation_id}`);
      try {
        const a = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversation_id}/audio`, { headers: H });
        if (a.ok) {
          const buf = Buffer.from(await a.arrayBuffer());
          console.log(`✅ Audio descargado: ${buf.length} bytes`);
          // TODO: guardar buf en almacenamiento y persistir URL en tu DB
        }
      } catch (audioError) {
        console.error('❌ Error descargando audio:', audioError);
      }
    }

  } catch (e) {
    console.error('❌ post-call webhook error:', e);
  }
});

module.exports = router;
