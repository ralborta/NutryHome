/**
 * Utilidades para validación y formateo de números de teléfono argentinos
 * Formato requerido: +54XXXXXXXXXX (donde X son dígitos)
 */

export const validatePhoneNumber = (phone: string): boolean => {
  // Eliminar espacios y caracteres especiales
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Verificar que empiece con +54 y tenga 13 dígitos totales
  const phoneRegex = /^\+54\d{10}$/;
  
  return phoneRegex.test(cleanPhone);
};

export const formatPhoneNumber = (phone: string): string => {
  // Eliminar espacios y caracteres especiales
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Si no empieza con +54, agregarlo
  if (!cleanPhone.startsWith('+54')) {
    // Si empieza con 54, agregar el +
    if (cleanPhone.startsWith('54')) {
      cleanPhone = '+' + cleanPhone;
    } else {
      // Si empieza con 9 (código de área), agregar +54
      if (cleanPhone.startsWith('9')) {
        cleanPhone = '+54' + cleanPhone;
      } else {
        // Si empieza con 0, quitarlo y agregar +54
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '+54' + cleanPhone.substring(1);
        } else {
          // Para cualquier otro caso, agregar +54
          cleanPhone = '+54' + cleanPhone;
        }
      }
    }
  }
  
  return cleanPhone;
};

export const getPhoneNumberError = (phone: string): string | null => {
  if (!phone) {
    return 'El número de teléfono es requerido';
  }
  
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  if (!cleanPhone.startsWith('+54')) {
    return 'El número debe empezar con +54';
  }
  
  if (cleanPhone.length !== 13) {
    return 'El número debe tener 13 dígitos (incluyendo +54)';
  }
  
  if (!/^\+\d+$/.test(cleanPhone)) {
    return 'El número solo debe contener dígitos después del +54';
  }
  
  return null;
};

export const formatPhoneForDisplay = (phone: string): string => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleanPhone.startsWith('+54')) {
    const number = cleanPhone.substring(3);
    // Formato: +54 9 11 3771 0010
    return `+54 ${number.substring(0, 1)} ${number.substring(1, 3)} ${number.substring(3, 7)} ${number.substring(7)}`;
  }
  
  return phone;
};

// Ejemplos de números válidos para Argentina
export const phoneExamples = [
  '+5491137710010', // Buenos Aires
  '+5491145623789', // Buenos Aires
  '+5491156345678', // Buenos Aires
  '+5491164567890', // Buenos Aires
  '+5491171234567', // Buenos Aires
  '+5491189876543', // Buenos Aires
  '+5491198765432', // Buenos Aires
  '+5492211234567', // La Plata
  '+5492231234567', // Mar del Plata
  '+5492611234567', // Mendoza
  '+5492641234567', // San Juan
  '+5492661234567', // San Luis
  '+5492801234567', // Puerto Madryn
  '+5492911234567', // Bahía Blanca
  '+5492991234567', // Neuquén
  '+5493411234567', // Rosario
  '+5493421234567', // Santa Fe
  '+5493431234567', // Paraná
  '+5493511234567', // Córdoba
  '+5493521234567', // Río Cuarto
  '+5493531234567', // Villa María
  '+5493541234567', // Villa Carlos Paz
  '+5493561234567', // San Francisco
  '+5493571234567', // Villa María
  '+5493581234567', // Río Tercero
  '+5493591234567', // Villa Dolores
  '+5493701234567', // Resistencia
  '+5493711234567', // Corrientes
  '+5493721234567', // Formosa
  '+5493731234567', // Posadas
  '+5493741234567', // Jujuy
  '+5493751234567', // Salta
  '+5493761234567', // San Salvador de Jujuy
  '+5493771234567', // Corrientes
  '+5493781234567', // Resistencia
  '+5493791234567', // Formosa
  '+5493801234567', // Santiago del Estero
  '+5493811234567', // Tucumán
  '+5493821234567', // Catamarca
  '+5493831234567', // La Rioja
  '+5493841234567', // San Juan
  '+5493851234567', // Santiago del Estero
  '+5493861234567', // Tucumán
  '+5493871234567', // Salta
  '+5493881234567', // Jujuy
  '+5493891234567', // Catamarca
  '+5493901234567', // La Rioja
  '+5493911234567', // San Juan
  '+5493921234567', // Santiago del Estero
  '+5493931234567', // Tucumán
  '+5493941234567', // Salta
  '+5493951234567', // Jujuy
  '+5493961234567', // Catamarca
  '+5493971234567', // La Rioja
  '+5493981234567', // San Juan
  '+5493991234567', // Santiago del Estero
]; 