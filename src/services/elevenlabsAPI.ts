import { 
  ContactData, 
  ElevenLabsBatchCallRequest, 
  ElevenLabsBatchCallResponse,
  ElevenLabsCallStatus,
  BatchExecutionResult 
} from '../types/batch.types';

class ElevenLabsAPI {
  private apiKey: string;
  private baseUrl: string;
  private agentId: string;
  private phoneNumberId: string;
  private projectId?: string;
  private rateLimitPerMinute: number;
  private maxRetries: number;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.baseUrl = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io/v1';
    this.agentId = process.env.ELEVENLABS_AGENT_ID || '';
    this.phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID || '';
    this.projectId = process.env.ELEVENLABS_PROJECT_ID;
    this.rateLimitPerMinute = parseInt(process.env.ELEVENLABS_RATE_LIMIT_PER_MINUTE || '60');
    this.maxRetries = parseInt(process.env.ELEVENLABS_MAX_RETRIES || '3');
  }

  private validateConfig(): boolean {
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY no configurada');
    }
    if (!this.agentId) {
      throw new Error('ELEVENLABS_AGENT_ID no configurado');
    }
    if (!this.phoneNumberId) {
      throw new Error('ELEVENLABS_PHONE_NUMBER_ID no configurado');
    }
    return true;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    this.validateConfig();

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'xi-api-key': this.apiKey,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `ElevenLabs API Error: ${response.status} ${response.statusText} - ${errorData.detail || 'Unknown error'}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error en ElevenLabs API:', error);
      throw error;
    }
  }

  /**
   * Ejecuta un batch de llamadas usando ElevenLabs Batch Calling API
   */
  async executeBatchCall(
    contacts: ContactData[], 
    batchId: string
  ): Promise<ElevenLabsBatchCallResponse> {
    try {
      // Preparar los contactos para ElevenLabs
      const elevenlabsContacts = contacts.map(contact => ({
        phone_number: this.formatPhoneNumber(contact.phone_number),
        variables: this.prepareVariables(contact)
      }));

      const requestBody: ElevenLabsBatchCallRequest = {
        agent_id: this.agentId,
        phone_number_id: this.phoneNumberId,
        contacts: elevenlabsContacts,
        project_id: this.projectId,
        metadata: {
          batch_id: batchId,
          campaign_type: 'medical_delivery_confirmation',
          timestamp: new Date().toISOString()
        }
      };

      console.log(`🚀 Ejecutando batch ${batchId} con ${contacts.length} contactos`);

      const response = await this.makeRequest<ElevenLabsBatchCallResponse>(
        '/convai/batch-calls',
        {
          method: 'POST',
          body: JSON.stringify(requestBody)
        }
      );

      console.log(`✅ Batch ${batchId} iniciado exitosamente:`, response);
      return response;

    } catch (error) {
      console.error(`❌ Error ejecutando batch ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el estado de un batch específico
   */
  async getBatchStatus(batchId: string): Promise<ElevenLabsCallStatus[]> {
    try {
      const response = await this.makeRequest<{ calls: ElevenLabsCallStatus[] }>(
        `/convai/batch-calls/${batchId}`
      );
      return response.calls;
    } catch (error) {
      console.error(`❌ Error obteniendo estado del batch ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el estado de una llamada individual
   */
  async getCallStatus(callId: string): Promise<ElevenLabsCallStatus> {
    try {
      return await this.makeRequest<ElevenLabsCallStatus>(
        `/convai/calls/${callId}`
      );
    } catch (error) {
      console.error(`❌ Error obteniendo estado de llamada ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Cancela un batch en progreso
   */
  async cancelBatch(batchId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.makeRequest(
        `/convai/batch-calls/${batchId}/cancel`,
        { method: 'POST' }
      );
      return { success: true, message: `Batch ${batchId} cancelado exitosamente` };
    } catch (error) {
      console.error(`❌ Error cancelando batch ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Prepara las variables dinámicas para Isabela
   */
  private prepareVariables(contact: ContactData): Record<string, string> {
    const variables: Record<string, string> = {
      nombre_contacto: contact.nombre_contacto,
      nombre_paciente: contact.nombre_paciente,
      domicilio_actual: contact.domicilio_actual,
      localidad: contact.localidad,
      delegacion: contact.delegacion,
      fecha_envio: this.formatDate(contact.fecha_envio),
      observaciones: contact.observaciones || ''
    };

    // Agregar productos solo si existen
    for (let i = 1; i <= 5; i++) {
      const producto = contact[`producto${i}` as keyof ContactData] as string;
      const cantidad = contact[`cantidad${i}` as keyof ContactData] as string;
      
      if (producto && cantidad) {
        variables[`producto${i}`] = producto;
        variables[`cantidad${i}`] = cantidad;
      }
    }

    return variables;
  }

  /**
   * Formatea el número de teléfono para ElevenLabs
   */
  private formatPhoneNumber(phone: string): string {
    // Eliminar espacios, guiones y paréntesis
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Asegurar que empiece con +
    if (!cleaned.startsWith('+')) {
      // Si empieza con 54 (Argentina), agregar +
      if (cleaned.startsWith('54')) {
        cleaned = '+' + cleaned;
      } else {
        // Si no tiene código de país, asumir Argentina
        cleaned = '+54' + cleaned;
      }
    }
    
    return cleaned;
  }

  /**
   * Formatea la fecha para el sistema
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha no especificada';
      }
      return date.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha no especificada';
    }
  }

  /**
   * Valida que un contacto tenga los datos mínimos requeridos
   */
  validateContact(contact: ContactData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!contact.phone_number) {
      errors.push('Número de teléfono es requerido');
    }

    if (!contact.nombre_contacto) {
      errors.push('Nombre del contacto es requerido');
    }

    if (!contact.nombre_paciente) {
      errors.push('Nombre del paciente es requerido');
    }

    if (!contact.domicilio_actual) {
      errors.push('Domicilio es requerido');
    }

    // Verificar que al menos un producto esté presente
    let hasProducts = false;
    for (let i = 1; i <= 5; i++) {
      const producto = contact[`producto${i}` as keyof ContactData] as string;
      const cantidad = contact[`cantidad${i}` as keyof ContactData] as string;
      
      if (producto && cantidad) {
        hasProducts = true;
        break;
      }
    }

    if (!hasProducts) {
      errors.push('Al menos un producto es requerido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtiene información del agente Isabela
   */
  async getAgentInfo(): Promise<{ id: string; name: string; status: string }> {
    try {
      const response = await this.makeRequest<{ id: string; name: string; status: string }>(
        `/agents/${this.agentId}`
      );
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo información del agente:', error);
      throw error;
    }
  }

  /**
   * Obtiene información del número de teléfono configurado
   */
  async getPhoneNumberInfo(): Promise<{ id: string; number: string; status: string }> {
    try {
      const response = await this.makeRequest<{ id: string; number: string; status: string }>(
        `/phone-numbers/${this.phoneNumberId}`
      );
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo información del número:', error);
      throw error;
    }
  }
}

export default new ElevenLabsAPI();
