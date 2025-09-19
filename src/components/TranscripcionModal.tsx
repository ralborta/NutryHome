'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, User, Bot, Loader2, Play, Pause, Square } from 'lucide-react';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Nuevas funciones de control de audio
  const handlePlay = () => {
    if (!conversation?.conversation_id) return;
    
    setAudioError(false);
    console.log(`[Modal] Playing audio for: ${conversation.conversation_id}`);
    
    // Si ya hay un audio reproduciéndose, reanudar
    if (audioRef.current && isPaused) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setIsPaused(false);
      }).catch(err => {
        console.error('[Modal] Audio resume error:', err);
        setAudioError(true);
      });
      return;
    }
    
    // Crear nuevo audio
    const audio = new Audio(`/api/get-audio?id=${conversation.conversation_id}`);
    audioRef.current = audio;
    
    audio.onerror = () => {
      console.error('[Modal] Audio playback error');
      setAudioError(true);
      alert('No se pudo reproducir el audio. Puede que no esté disponible.');
    };
    
    audio.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    
    audio.play().then(() => {
      setIsPlaying(true);
      setIsPaused(false);
    }).catch(err => {
      console.error('[Modal] Audio play error:', err);
      setAudioError(true);
    });
  };

  const handlePause = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
    }
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
          <div className="flex items-center gap-2">
            {/* Controles de Audio */}
            <div className="flex items-center gap-1">
              {/* Botón Play/Pause */}
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={audioError}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  audioError 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : isPlaying
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                title={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {audioError ? 'Error' : isPlaying ? 'Pausar' : 'Play'}
              </button>

              {/* Botón Stop */}
              <button
                onClick={handleStop}
                disabled={audioError || (!isPlaying && !isPaused)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  audioError || (!isPlaying && !isPaused)
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title="Detener audio"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            </div>
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
