// Tipos para el sistema de Batch Calling con ElevenLabs

export interface ContactData {
  phone_number: string;
  nombre_contacto: string;
  nombre_paciente: string;
  domicilio_actual: string;
  localidad: string;
  delegacion: string;
  fecha_envio: string;
  producto1?: string;
  cantidad1?: string;
  producto2?: string;
  cantidad2?: string;
  producto3?: string;
  cantidad3?: string;
  producto4?: string;
  cantidad4?: string;
  producto5?: string;
  cantidad5?: string;
  observaciones?: string;
  prioridad?: 'BAJA' | 'MEDIA' | 'ALTA';
  estado_pedido?: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';
}

export interface BatchCall {
  id: string;
  batchId: string;
  contactId: string;
  phoneNumber: string;
  status: CallStatus;
  elevenlabsCallId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  result?: string;
  error?: string;
  retryCount: number;
  variables: ContactData;
  createdAt: Date;
  updatedAt: Date;
}

export interface Batch {
  id: string;
  campaignId: string;
  name: string;
  status: BatchStatus;
  totalContacts: number;
  completedCalls: number;
  failedCalls: number;
  inProgressCalls: number;
  pendingCalls: number;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ElevenLabsBatchCallRequest {
  agent_id: string;
  phone_number_id: string;
  contacts: Array<{
    phone_number: string;
    variables: Record<string, string>;
  }>;
  project_id?: string;
  metadata?: Record<string, any>;
}

export interface ElevenLabsBatchCallResponse {
  batch_id: string;
  status: string;
  total_calls: number;
  calls: Array<{
    call_id: string;
    phone_number: string;
    status: string;
  }>;
}

export interface ElevenLabsCallStatus {
  call_id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  duration?: number;
  result?: string;
  error?: string;
  variables?: Record<string, string>;
}

export type CallStatus = 
  | 'pending'
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export type BatchStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface BatchExecutionResult {
  success: boolean;
  batchId: string;
  message: string;
  totalCalls: number;
  queuedCalls: number;
  errors?: string[];
}

export interface BatchStatusResponse {
  batchId: string;
  status: BatchStatus;
  progress: number;
  totalContacts: number;
  completedCalls: number;
  failedCalls: number;
  inProgressCalls: number;
  pendingCalls: number;
  calls: ElevenLabsCallStatus[];
  startedAt?: Date;
  estimatedCompletion?: Date;
}
