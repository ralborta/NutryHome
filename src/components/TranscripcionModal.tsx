'use client';

import React from 'react';
import { X, MessageSquare, User, Bot } from 'lucide-react';

interface Conversation {
  conversation_id?: string;
  nombre_paciente?: string;
  telefono_destino?: string;
  transcript?: string | any[];
}

interface TranscripcionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
}

const TranscripcionModal: React.FC<TranscripcionModalProps> = ({ 
  isOpen, 
  onClose, 
  conversation 
}) => {
  if (!isOpen || !conversation) return null;

  // DEBUG: Verificar qué datos llegan
  console.log('📋 Transcripción modal data:', {
    conversation_id: conversation.conversation_id,
    has_transcript: !!conversation.transcript,
    transcript_type: typeof conversation.transcript,
    transcript_length: conversation.transcript?.length,
    transcript_sample: conversation.transcript?.slice(0, 2)
  });

  const transcript = conversation.transcript || [];
  
  // Función para renderizar el contenido del transcript
  const renderTranscriptContent = () => {
    // Si es un array (formato esperado)
    if (Array.isArray(transcript) && transcript.length > 0) {
      return (
        <div className="space-y-3">
          {transcript.map((message, index) => (
            <div key={index} className={`p-3 rounded-lg ${
              message.role === 'agent' || message.speaker === 'agent'
                ? 'bg-blue-50 border-l-4 border-blue-400' 
                : 'bg-green-50 border-l-4 border-green-400'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {message.role === 'agent' || message.speaker === 'agent' ? (
                  <Bot className="h-4 w-4 text-blue-600" />
                ) : (
                  <User className="h-4 w-4 text-green-600" />
                )}
                <span className="font-medium text-sm text-gray-700">
                  {message.role === 'agent' || message.speaker === 'agent' ? 'Isabela' : 'Cliente'}
                </span>
                <span className="text-xs text-gray-500">
                  Mensaje {index + 1}
                </span>
              </div>
              <div className="text-sm text-gray-800">
                {message.message || message.content || message.text || message.transcript || 'Mensaje sin contenido'}
              </div>
              {message.timestamp && (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString('es-ES')}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // Si es un string (transcript simple)
    if (typeof transcript === 'string' && transcript.trim().length > 0) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-800 whitespace-pre-wrap">
            {transcript}
          </div>
        </div>
      );
    }
    
    // Si no hay transcript o está vacío
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">No hay transcripción disponible</p>
        <div className="text-xs text-gray-400 space-y-1">
          <p>Tipo de transcript: {typeof conversation.transcript}</p>
          <p>Contenido: {JSON.stringify(conversation.transcript)?.substring(0, 100)}...</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Transcripción Completa</h3>
            <p className="text-sm text-gray-500 mt-1">
              Conversación ID: {conversation.conversation_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Información del cliente */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Cliente:</span>
                <span className="ml-2 text-gray-900">
                  {conversation.nombre_paciente || 'Sin nombre'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Teléfono:</span>
                <span className="ml-2 text-gray-900">
                  {conversation.telefono_destino || 'No disponible'}
                </span>
              </div>
            </div>
          </div>

          {/* Transcripción */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              <h4 className="font-medium text-gray-900">Transcripción de la Conversación</h4>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {renderTranscriptContent()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranscripcionModal;
