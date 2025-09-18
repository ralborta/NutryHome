'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, User, Bot, Loader2 } from 'lucide-react';

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
  const [transcript, setTranscript] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    if (isOpen && conversation?.conversation_id) {
      fetchTranscript();
    }
  }, [isOpen, conversation?.conversation_id]);

  const fetchTranscript = async () => {
    if (!conversation?.conversation_id) return;
    
    try {
      setLoading(true);
      console.log(`[Modal] Fetching transcript for: ${conversation.conversation_id}`);
      
      // Usar query params en lugar de ruta dinámica
      const response = await fetch(`/api/get-transcript?id=${conversation.conversation_id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transcript: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[Modal] Transcript data received:', data);
      
      setTranscript(data.transcript || 'No hay transcripción disponible');
    } catch (error) {
      console.error('[Modal] Error fetching transcript:', error);
      setTranscript('Error cargando transcripción');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (!conversation?.conversation_id) return;
    
    setAudioError(false);
    console.log(`[Modal] Playing audio for: ${conversation.conversation_id}`);
    
    // Usar query params para el audio
    const audio = new Audio(`/api/get-audio?id=${conversation.conversation_id}`);
    
    audio.onerror = () => {
      console.error('[Modal] Audio playback error');
      setAudioError(true);
      alert('No se pudo reproducir el audio. Puede que no esté disponible.');
    };
    
    audio.play().catch(err => {
      console.error('[Modal] Audio play error:', err);
      setAudioError(true);
    });
  };

  if (!isOpen || !conversation) return null;
  
  // Función para renderizar el contenido del transcript
  const renderTranscriptContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando transcripción...</span>
        </div>
      );
    }
    
    // Si es un string (transcript procesado)
    if (typeof transcript === 'string' && transcript.trim().length > 0) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
            {transcript}
          </div>
        </div>
      );
    }
    
    // Si no hay transcript o está vacío
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">{transcript || 'No hay transcripción disponible'}</p>
        <div className="text-xs text-gray-400 space-y-1">
          <p>Conversación ID: {conversation.conversation_id}</p>
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
          <div className="flex items-center gap-3">
            {/* Botón de Audio */}
            <button
              onClick={playAudio}
              disabled={audioError}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                audioError 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L5.5 13H3a1 1 0 01-1-1V8a1 1 0 011-1h2.5l2.883-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
              {audioError ? 'Audio no disponible' : 'Audio'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
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
