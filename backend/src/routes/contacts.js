/**
 * /api/contacts
 *
 * Endpoint consumido por Builderbot (add_http en flow F0 "Hidratar contacto")
 * para hidratar el state de la conversación con las variables del prompt de Ana.
 *
 * Builderbot llama: GET /api/contacts/by-phone?phone={{from}}
 *   Headers: X-Builderbot-Secret: <BUILDERBOT_PULL_SECRET>
 *
 * Respuesta:
 *   - found=true  → todas las variables (nombre_contacto, nombre_paciente, productoN, ...)
 *   - found=false → Builderbot rutea a F2 "Atención Ana (sin contexto)"
 */

const express = require('express');
const { prisma } = require('../database/client');
const {
  prepareTemplateVariablesFromContact,
  formatPhoneNumberE164AR,
  formatDateForTemplate,
} = require('../lib/contactTemplateVariables');

const router = express.Router();

function requireBuilderbotSecret(req, res, next) {
  const expected = (process.env.BUILDERBOT_PULL_SECRET || '').trim();
  if (!expected) {
    console.warn(
      '[contacts/by-phone] BUILDERBOT_PULL_SECRET no definido — aceptando sin firma (modo desarrollo).',
    );
    return next();
  }
  const got = String(req.headers['x-builderbot-secret'] || '').trim();
  if (got !== expected) {
    return res.status(401).json({ found: false, error: 'Unauthorized' });
  }
  return next();
}

// Tolera distintos formatos de teléfono entre Excel/Meta (con o sin '+', con o sin '54', con o sin '9').
function phoneVariants(raw) {
  const set = new Set();
  if (!raw) return [];
  const trimmed = String(raw).trim();
  set.add(trimmed);

  const digits = trimmed.replace(/\D/g, '');
  if (digits) {
    set.add(digits);
    set.add('+' + digits);
    if (digits.startsWith('54')) {
      const after = digits.slice(2);
      set.add(after);
      if (after.startsWith('9')) set.add('+54' + after);
      else set.add('+549' + after);
    } else {
      set.add('54' + digits);
      set.add('+54' + digits);
      set.add('+549' + digits);
    }
  }

  try {
    const e164 = formatPhoneNumberE164AR(trimmed);
    if (e164) set.add(e164);
  } catch (_) {
    /* noop */
  }

  return Array.from(set).filter(Boolean);
}

router.get('/by-phone', requireBuilderbotSecret, async (req, res) => {
  try {
    const raw = String(req.query.phone || '').trim();
    if (!raw) {
      return res.status(400).json({ found: false, error: 'phone requerido' });
    }

    const variants = phoneVariants(raw);

    const contact = await prisma.contact.findFirst({
      where: { phone_number: { in: variants } },
      orderBy: { createdAt: 'desc' },
      include: { batch: { select: { id: true, nombre: true, estado: true } } },
    });

    if (!contact) {
      console.log(
        `[contacts/by-phone] sin match — phone="${raw}" variants=${JSON.stringify(variants)}`,
      );
      return res.json({ found: false });
    }

    // Aplica filtros del prompt (productos NA y cantidad 0 fuera).
    const cleaned = prepareTemplateVariablesFromContact(contact);

    const payload = {
      found: true,
      nombre_contacto: cleaned.nombre_contacto || '',
      nombre_paciente: cleaned.nombre_paciente || '',
      phone_number: contact.phone_number || raw,
      domicilio_actual: cleaned.domicilio_actual || '',
      localidad: cleaned.localidad || '',
      delegacion: cleaned.delegacion || '',
      fecha_envio: cleaned.fecha_envio || formatDateForTemplate(contact.fecha_envio) || '',
      observaciones: cleaned.observaciones || '',
      producto1: cleaned.producto1 || '',
      cantidad1: cleaned.cantidad1 || '',
      producto2: cleaned.producto2 || '',
      cantidad2: cleaned.cantidad2 || '',
      producto3: cleaned.producto3 || '',
      cantidad3: cleaned.cantidad3 || '',
      // Metadata para auditoría / logs internos del bot
      contact_id: contact.id,
      batch_id: contact.batch?.id || '',
      batch_nombre: contact.batch?.nombre || '',
    };

    return res.json(payload);
  } catch (err) {
    console.error('[contacts/by-phone] error:', err);
    return res.status(500).json({ found: false, error: 'Error interno' });
  }
});

module.exports = router;
