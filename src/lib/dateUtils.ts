/**
 * Utilidades para manejo seguro de fechas
 * Previene errores de "Invalid time value"
 */

/**
 * Valida si una fecha es válida
 */
export function isValidDate(date: any): boolean {
  if (!date || date === null || date === undefined) {
    return false;
  }
  
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Formatea una fecha de forma segura
 */
export function formatDateSafe(date: any, options?: Intl.DateTimeFormatOptions): string {
  if (!isValidDate(date)) {
    return 'Sin fecha';
  }
  
  try {
    const parsed = new Date(date);
    return parsed.toLocaleDateString('es-ES', options);
  } catch (error) {
    console.warn('Error formateando fecha:', date, error);
    return 'Fecha inválida';
  }
}

/**
 * Formatea una fecha y hora de forma segura
 */
export function formatDateTimeSafe(date: any, options?: Intl.DateTimeFormatOptions): string {
  if (!isValidDate(date)) {
    return 'Sin fecha';
  }
  
  try {
    const parsed = new Date(date);
    return parsed.toLocaleString('es-ES', options);
  } catch (error) {
    console.warn('Error formateando fecha y hora:', date, error);
    return 'Fecha inválida';
  }
}

/**
 * Formatea solo la hora de forma segura
 */
export function formatTimeSafe(date: any, options?: Intl.DateTimeFormatOptions): string {
  if (!isValidDate(date)) {
    return 'Sin hora';
  }
  
  try {
    const parsed = new Date(date);
    return parsed.toLocaleTimeString('es-ES', options);
  } catch (error) {
    console.warn('Error formateando hora:', date, error);
    return 'Hora inválida';
  }
}

/**
 * Convierte timestamp Unix a fecha de forma segura
 */
export function fromUnixTimestamp(timestamp: number | string | null | undefined): Date | null {
  if (!timestamp) {
    return null;
  }
  
  try {
    const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
    if (isNaN(numTimestamp)) {
      return null;
    }
    
    const date = new Date(numTimestamp * 1000);
    return isValidDate(date) ? date : null;
  } catch (error) {
    console.warn('Error convirtiendo timestamp Unix:', timestamp, error);
    return null;
  }
}

/**
 * Crea una fecha de forma segura
 */
export function createDateSafe(dateInput: any): Date | null {
  if (!dateInput) {
    return null;
  }
  
  try {
    const date = new Date(dateInput);
    return isValidDate(date) ? date : null;
  } catch (error) {
    console.warn('Error creando fecha:', dateInput, error);
    return null;
  }
}

/**
 * Debug helper para fechas
 */
export function debugDate(date: any, label: string = 'Fecha'): void {
  console.log(`${label}:`, date);
  console.log(`${label} tipo:`, typeof date);
  console.log(`${label} válida:`, isValidDate(date));
  
  if (isValidDate(date)) {
    const parsed = new Date(date);
    console.log(`${label} parseada:`, parsed);
    console.log(`${label} ISO:`, parsed.toISOString());
  }
}
