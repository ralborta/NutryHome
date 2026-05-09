/**
 * Variables de plantilla por contacto — mismo criterio que ElevenLabs (dynamic_variables)
 * y reutilizable para WhatsApp / Builderbot (componentes o contexto HTTP).
 */

function sanitizeString(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .substring(0, 500);
}

function formatDateForTemplate(dateValue) {
  if (!dateValue) return '';
  try {
    let date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      date = new Date(dateValue);
    }
    if (isNaN(date.getTime())) {
      return '';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/** E.164 Argentina robusto: +54 9 + (área) + número */
function formatPhoneNumberE164AR(phone) {
  if (!phone) return '';
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  if (!d.startsWith('54')) d = '54' + d;
  const after54 = d.slice(2);
  if (!after54.startsWith('9')) {
    d = d.replace(/^54(..|...|....)15/, '549$1');
    if (!/^549/.test(d)) d = d.replace(/^54/, '549');
  } else {
    d = d.replace(/^549(..|...|....)15/, '549$1');
  }
  return '+' + d;
}

/**
 * @param {object} contact — fila Prisma Contact o objeto compatible
 * @returns {Record<string, string>} claves al estilo ElevenLabs (solo strings no vacíos)
 */
function prepareTemplateVariablesFromContact(contact) {
  const raw = {
    nombre_contacto: sanitizeString(contact.nombre_contacto),
    nombre_paciente: sanitizeString(contact.nombre_paciente),
    domicilio_actual: sanitizeString(contact.domicilio_actual),
    localidad: sanitizeString(contact.localidad),
    delegacion: sanitizeString(contact.delegacion),
    fecha_envio: formatDateForTemplate(contact.fecha_envio),
    observaciones: sanitizeString(contact.observaciones),
    producto1: sanitizeString(contact.producto1),
    cantidad1: sanitizeString(contact.cantidad1),
    producto2: sanitizeString(contact.producto2),
    cantidad2: sanitizeString(contact.cantidad2),
    producto3: sanitizeString(contact.producto3),
    cantidad3: sanitizeString(contact.cantidad3),
    producto4: sanitizeString(contact.producto4),
    cantidad4: sanitizeString(contact.cantidad4),
    producto5: sanitizeString(contact.producto5),
    cantidad5: sanitizeString(contact.cantidad5),
  };
  const cleaned = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === '' || v === null || v === undefined) continue;
    if (typeof v === 'string' && v.toUpperCase() === 'NA') continue;
    if (/^cantidad\d+$/.test(k) && Number(v) === 0) continue;
    cleaned[k] = v;
  }
  return cleaned;
}

module.exports = {
  prepareTemplateVariablesFromContact,
  formatPhoneNumberE164AR,
  sanitizeString,
  formatDateForTemplate,
};
