import { ContactData } from '../types/batch.types';
import * as XLSX from 'xlsx';

export interface CSVProcessingResult {
  success: boolean;
  contacts: ContactData[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

class CSVProcessor {
  /**
   * Procesa un archivo Excel/CSV y valida los datos médicos
   */
  async processFile(file: File): Promise<CSVProcessingResult> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length < 2) {
        return {
          success: false,
          contacts: [],
          errors: ['El archivo debe tener al menos una fila de encabezados y una fila de datos'],
          warnings: [],
          totalRows: rawData.length,
          validRows: 0,
          invalidRows: rawData.length
        };
      }

      const headers = rawData[0] as string[];
      const dataRows = rawData.slice(1);
      
      // Validar encabezados requeridos
      const requiredHeaders = [
        'phone_number', 'nombre_contacto', 'nombre_paciente', 
        'domicilio_actual', 'localidad', 'delegacion', 'fecha_envio'
      ];
      
      const missingHeaders = requiredHeaders.filter(header => 
        !headers.some(h => h.toLowerCase().includes(header.toLowerCase()))
      );
      
      if (missingHeaders.length > 0) {
        return {
          success: false,
          contacts: [],
          errors: [`Encabezados faltantes: ${missingHeaders.join(', ')}`],
          warnings: [],
          totalRows: dataRows.length,
          validRows: 0,
          invalidRows: dataRows.length
        };
      }

      // Procesar filas de datos
      const contacts: ContactData[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      let validRows = 0;
      let invalidRows = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as any[];
        const rowNumber = i + 2; // +2 porque empezamos desde la fila 2 (después de encabezados)
        
        try {
          const contact = this.parseRow(headers, row, rowNumber);
          const validation = this.validateContact(contact, rowNumber);
          
          if (validation.isValid) {
            contacts.push(contact);
            validRows++;
            
            // Agregar warnings si hay campos opcionales vacíos
            if (!contact.producto1 || !contact.cantidad1) {
              warnings.push(`Fila ${rowNumber}: No hay productos especificados`);
            }
          } else {
            invalidRows++;
            errors.push(...validation.errors);
          }
        } catch (error) {
          invalidRows++;
          errors.push(`Fila ${rowNumber}: Error procesando datos - ${error}`);
        }
      }

      return {
        success: validRows > 0,
        contacts,
        errors,
        warnings,
        totalRows: dataRows.length,
        validRows,
        invalidRows
      };

    } catch (error) {
      console.error('Error procesando archivo:', error);
      return {
        success: false,
        contacts: [],
        errors: [`Error procesando archivo: ${error}`],
        warnings: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0
      };
    }
  }

  /**
   * Parsea una fila de datos del CSV
   */
  private parseRow(headers: string[], row: any[], rowNumber: number): ContactData {
    const contact: Partial<ContactData> = {};
    
    headers.forEach((header, index) => {
      const value = row[index] || '';
      const cleanHeader = header.toLowerCase().trim();
      
      // Mapear encabezados a campos del modelo
      if (cleanHeader.includes('phone_number') || cleanHeader.includes('telefono')) {
        contact.phone_number = this.cleanPhoneNumber(value);
      } else if (cleanHeader.includes('nombre_contacto') || cleanHeader.includes('contacto')) {
        contact.nombre_contacto = String(value).trim();
      } else if (cleanHeader.includes('nombre_paciente') || cleanHeader.includes('paciente')) {
        contact.nombre_paciente = String(value).trim();
      } else if (cleanHeader.includes('domicilio') || cleanHeader.includes('direccion')) {
        contact.domicilio_actual = String(value).trim();
      } else if (cleanHeader.includes('localidad')) {
        contact.localidad = String(value).trim();
      } else if (cleanHeader.includes('delegacion')) {
        contact.delegacion = String(value).trim();
      } else if (cleanHeader.includes('fecha_envio') || cleanHeader.includes('fecha')) {
        contact.fecha_envio = this.parseDate(value);
      } else if (cleanHeader.includes('observaciones') || cleanHeader.includes('notas')) {
        contact.observaciones = String(value).trim();
      } else if (cleanHeader.includes('prioridad')) {
        contact.prioridad = this.parsePriority(value);
      } else if (cleanHeader.includes('estado_pedido')) {
        contact.estado_pedido = this.parseOrderStatus(value);
      }
      
      // Procesar productos (hasta 5)
      for (let i = 1; i <= 5; i++) {
        if (cleanHeader.includes(`producto${i}`) || cleanHeader.includes(`medicamento${i}`)) {
          contact[`producto${i}` as keyof ContactData] = String(value).trim();
        } else if (cleanHeader.includes(`cantidad${i}`) || cleanHeader.includes(`qty${i}`)) {
          contact[`cantidad${i}` as keyof ContactData] = String(value).trim();
        }
      }
    });

    // Validar que los campos requeridos estén presentes
    if (!contact.phone_number) {
      throw new Error('Número de teléfono es requerido');
    }
    if (!contact.nombre_contacto) {
      throw new Error('Nombre del contacto es requerido');
    }
    if (!contact.nombre_paciente) {
      throw new Error('Nombre del paciente es requerido');
    }
    if (!contact.domicilio_actual) {
      throw new Error('Domicilio es requerido');
    }

    return contact as ContactData;
  }

  /**
   * Valida un contacto individual
   */
  private validateContact(contact: ContactData, rowNumber: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar número de teléfono
    if (!this.isValidPhoneNumber(contact.phone_number)) {
      errors.push(`Fila ${rowNumber}: Número de teléfono inválido: ${contact.phone_number}`);
    }

    // Validar que al menos un producto esté presente
    let hasProducts = false;
    for (let i = 1; i <= 5; i++) {
      const producto = contact[`producto${i}` as keyof ContactData] as string;
      const cantidad = contact[`cantidad${i}` as keyof ContactData] as string;
      
      if (producto && cantidad) {
        hasProducts = true;
        // Validar que la cantidad sea un número válido
        if (isNaN(Number(cantidad)) || Number(cantidad) <= 0) {
          errors.push(`Fila ${rowNumber}: Cantidad inválida para ${producto}: ${cantidad}`);
        }
        break;
      }
    }

    if (!hasProducts) {
      errors.push(`Fila ${rowNumber}: Al menos un producto es requerido`);
    }

    // Validar fecha de envío
    if (contact.fecha_envio && contact.fecha_envio !== 'Fecha no especificada') {
      const date = new Date(contact.fecha_envio);
      if (isNaN(date.getTime())) {
        errors.push(`Fila ${rowNumber}: Fecha de envío inválida: ${contact.fecha_envio}`);
      }
    }

    // Validar campos de texto (no vacíos y longitud razonable)
    if (contact.nombre_contacto && contact.nombre_contacto.length > 100) {
      errors.push(`Fila ${rowNumber}: Nombre del contacto demasiado largo`);
    }
    if (contact.nombre_paciente && contact.nombre_paciente.length > 100) {
      errors.push(`Fila ${rowNumber}: Nombre del paciente demasiado largo`);
    }
    if (contact.domicilio_actual && contact.domicilio_actual.length > 200) {
      errors.push(`Fila ${rowNumber}: Domicilio demasiado largo`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Limpia y formatea un número de teléfono
   */
  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Eliminar espacios, guiones, paréntesis y puntos
    let cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');
    
    // Si empieza con 0, removerlo
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Si no tiene código de país, asumir Argentina (54)
    if (!cleaned.startsWith('54') && !cleaned.startsWith('+54')) {
      cleaned = '54' + cleaned;
    }
    
    // Asegurar que empiece con +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Valida que un número de teléfono sea válido
   */
  private isValidPhoneNumber(phone: string): boolean {
    if (!phone) return false;
    
    // Debe empezar con + y tener al menos 10 dígitos
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Parsea una fecha del Excel
   */
  private parseDate(value: any): string {
    if (!value) return '';
    
    try {
      // Si es un número (fecha de Excel), convertirlo
      if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
          return new Date(date.y, date.m - 1, date.d).toISOString().split('T')[0];
        }
      }
      
      // Si es una fecha válida
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Parsea la prioridad del pedido
   */
  private parsePriority(value: any): 'BAJA' | 'MEDIA' | 'ALTA' {
    if (!value) return 'MEDIA';
    
    const priority = String(value).toUpperCase().trim();
    
    if (priority.includes('ALTA') || priority.includes('HIGH')) return 'ALTA';
    if (priority.includes('BAJA') || priority.includes('LOW')) return 'BAJA';
    
    return 'MEDIA';
  }

  /**
   * Parsea el estado del pedido
   */
  private parseOrderStatus(value: any): 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO' {
    if (!value) return 'PENDIENTE';
    
    const status = String(value).toUpperCase().trim();
    
    if (status.includes('COMPLETADO') || status.includes('COMPLETED')) return 'COMPLETADO';
    if (status.includes('EN_PROCESO') || status.includes('PROCESSING')) return 'EN_PROCESO';
    if (status.includes('CANCELADO') || status.includes('CANCELLED')) return 'CANCELADO';
    
    return 'PENDIENTE';
  }

  /**
   * Genera un reporte de validación
   */
  generateValidationReport(result: CSVProcessingResult): string {
    let report = `📊 REPORTE DE VALIDACIÓN CSV\n`;
    report += `================================\n\n`;
    report += `📁 Total de filas: ${result.totalRows}\n`;
    report += `✅ Filas válidas: ${result.validRows}\n`;
    report += `❌ Filas inválidas: ${result.invalidRows}\n`;
    report += `⚠️  Advertencias: ${result.warnings.length}\n\n`;
    
    if (result.errors.length > 0) {
      report += `🚨 ERRORES ENCONTRADOS:\n`;
      result.errors.forEach(error => {
        report += `   • ${error}\n`;
      });
      report += `\n`;
    }
    
    if (result.warnings.length > 0) {
      report += `⚠️  ADVERTENCIAS:\n`;
      result.warnings.forEach(warning => {
        report += `   • ${warning}\n`;
      });
      report += `\n`;
    }
    
    if (result.contacts.length > 0) {
      report += `✅ CONTACTOS VÁLIDOS:\n`;
      result.contacts.forEach((contact, index) => {
        report += `   ${index + 1}. ${contact.nombre_contacto} → ${contact.nombre_paciente}\n`;
        report += `      📞 ${contact.phone_number}\n`;
        report += `      📍 ${contact.domicilio_actual}, ${contact.localidad}\n`;
        
        // Mostrar productos
        let productos = '';
        for (let i = 1; i <= 5; i++) {
          const producto = contact[`producto${i}` as keyof ContactData] as string;
          const cantidad = contact[`cantidad${i}` as keyof ContactData] as string;
          if (producto && cantidad) {
            productos += `${cantidad}x ${producto}, `;
          }
        }
        if (productos) {
          report += `      💊 ${productos.slice(0, -2)}\n`;
        }
        report += `\n`;
      });
    }
    
    return report;
  }
}

export default new CSVProcessor();
