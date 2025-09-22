'use client';

import { useState, useEffect } from 'react';
import { formatDateSafe, formatTimeSafe, fromUnixTimestamp, debugDate } from '@/lib/dateUtils';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing,
  Play,
  Pause,
  MoreVertical,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  FileText,
  Star,
  MessageSquare,
  Download,
  Share2,
  Bookmark,
  Tag,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  RotateCcw,
  Eye,
  FileAudio,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock3,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';

interface Conversation {
  id: string;
  contactName: string;
  phoneNumber: string;
  date: string;
  time: string;
  duration: number;
  status: 'completed' | 'failed' | 'in-progress' | 'missed';
  type: 'inbound' | 'outbound';
  recordingUrl?: string;
  agentName: string;
  satisfaction?: number;
  result: 'sale' | 'follow-up' | 'rejected' | 'no-answer' | 'callback';
  tags: string[];
  notes?: string;
  transcription?: string;
  evaluation?: {
    score: number;
    comments: string;
  };
}

export default function Conversations() {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound' | 'isabela'>('outbound');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<string | null>(null);
  const [isabelaConversations, setIsabelaConversations] = useState<any[]>([]);
  const [isabelaLoading, setIsabelaLoading] = useState(true);

  // Datos de ejemplo
  const conversations: Conversation[] = [
    {
      id: '1',
      contactName: 'María García López',
      phoneNumber: '+5491137710010',
      date: '2024-01-15',
      time: '10:30',
      duration: 245,
      status: 'completed',
      type: 'outbound',
      recordingUrl: '/recordings/call-1.mp3',
      agentName: 'Isabela',
      satisfaction: 4.5,
      result: 'sale',
      tags: ['cliente premium', 'interesado'],
      notes: 'Cliente muy interesado en el producto premium. Solicita información adicional.',
      transcription: 'Hola, soy Isabela de NutryHome. ¿Cómo está? Me gustaría presentarle nuestros productos...',
      evaluation: {
        score: 8.5,
        comments: 'Excelente conversación, cliente muy receptivo'
      }
    },
    {
      id: '2',
      contactName: 'Juan López Fernández',
      phoneNumber: '+5491145623789',
      date: '2024-01-15',
      time: '11:15',
      duration: 180,
      status: 'completed',
      type: 'inbound',
      recordingUrl: '/recordings/call-2.mp3',
      agentName: 'Isabela',
      satisfaction: 3.8,
      result: 'follow-up',
      tags: ['consulta', 'seguimiento'],
      notes: 'Cliente consulta sobre precios y disponibilidad.',
      transcription: 'Buenos días, llamo para consultar sobre los precios de sus productos...',
      evaluation: {
        score: 7.0,
        comments: 'Buena atención, necesita seguimiento'
      }
    },
    {
      id: '3',
      contactName: 'Carmen Rodríguez',
      phoneNumber: '+5491156345678',
      date: '2024-01-15',
      time: '14:20',
      duration: 0,
      status: 'failed',
      type: 'outbound',
      agentName: 'Isabela',
      result: 'no-answer',
      tags: ['sin respuesta'],
      notes: 'No contesta el teléfono'
    },
    {
      id: '4',
      contactName: 'Pedro Sánchez',
      phoneNumber: '+5491164567890',
      date: '2024-01-15',
      time: '16:45',
      duration: 320,
      status: 'completed',
      type: 'outbound',
      recordingUrl: '/recordings/call-4.mp3',
      agentName: 'Isabela',
      satisfaction: 4.8,
      result: 'sale',
      tags: ['nuevo cliente', 'venta confirmada'],
      notes: 'Venta confirmada de producto premium. Cliente muy satisfecho.',
      transcription: 'Perfecto, entonces procedemos con la venta del producto premium...',
      evaluation: {
        score: 9.0,
        comments: 'Excelente venta, cliente muy satisfecho'
      }
    }
  ];

  const filteredConversations = activeTab === 'isabela' 
    ? isabelaConversations.filter(conv => {
        const matchesSearch = (conv.nombre_paciente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (conv.telefono_destino || '').includes(searchTerm);
        return matchesSearch;
      })
    : conversations.filter(conv => {
        const matchesType = conv.type === activeTab;
        const matchesSearch = conv.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             conv.phoneNumber.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
        
        return matchesType && matchesSearch && matchesStatus;
      });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'missed': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'sale': return 'text-green-600 bg-green-50 border-green-200';
      case 'follow-up': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'no-answer': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'callback': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayRecording = (conversationId: string) => {
    setIsPlaying(isPlaying === conversationId ? null : conversationId);
    // Aquí iría la lógica para reproducir la grabación
    console.log('Reproduciendo grabación:', conversationId);
  };

  // Función para manejar audio de ElevenLabs
  const handlePlayElevenLabsAudio = (conversationId: string) => {
    if (isPlaying === conversationId) {
      // Si está reproduciéndose, pausar
      setIsPlaying(null);
      // Aquí podrías agregar lógica para pausar el audio si es necesario
    } else {
      // Si no está reproduciéndose, reproducir
      setIsPlaying(conversationId);
      console.log('Reproduciendo audio ElevenLabs:', conversationId);
      
      // Reproducir audio usando la API
      const audioUrl = `/api/get-audio?id=${conversationId}`;
      const audio = new Audio(audioUrl);
      
      audio.play().then(() => {
        console.log('Audio ElevenLabs reproduciéndose correctamente');
      }).catch((error) => {
        console.error('Error reproduciendo audio ElevenLabs:', error);
        alert('No se pudo reproducir el audio. Puede que no esté disponible para esta conversación.');
        setIsPlaying(null);
      });
    }
  };

  // Cargar conversaciones de NutriHome desde la API
  useEffect(() => {
    const fetchIsabelaConversations = async () => {
      try {
        setIsabelaLoading(true);
        const response = await fetch('/api/estadisticas-isabela');
        if (response.ok) {
          const data = await response.json();
          setIsabelaConversations(data.conversations || []);
        }
      } catch (error) {
        console.error('Error fetching Isabela conversations:', error);
      } finally {
        setIsabelaLoading(false);
      }
    };

    fetchIsabelaConversations();
  }, []);

  const handleContextMenu = (conversationId: string) => {
    setShowContextMenu(showContextMenu === conversationId ? null : conversationId);
  };

  // Función para generar reporte de productos
  const handleGenerateProductReport = async () => {
    try {
      console.log('📊 Generando reporte de productos...');
      
      // Mostrar indicador de carga
      const button = document.querySelector('button[onclick*="handleGenerateProductReport"]') as HTMLButtonElement;
      if (button) {
        button.disabled = true;
        button.textContent = 'Generando...';
      }
      
      // URL del backend en Railway
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://nutryhome-backend-production.up.railway.app';
      const reportUrl = `${backendUrl}/api/reports/productos`;
      
      console.log(`🔗 Llamando a: ${reportUrl}`);
      
      // Llamar directamente al backend de Railway
      const response = await fetch(reportUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_productos_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('✅ Reporte descargado exitosamente');
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      alert('Error generando el reporte. Por favor, intenta de nuevo.');
    } finally {
      // Restaurar botón
      const button = document.querySelector('button[onclick*="handleGenerateProductReport"]') as HTMLButtonElement;
      if (button) {
        button.disabled = false;
        button.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>Reporte de Productos';
      }
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case 'sale': return 'Venta';
      case 'follow-up': return 'Seguimiento';
      case 'rejected': return 'Rechazado';
      case 'no-answer': return 'Sin respuesta';
      case 'callback': return 'Llamar de vuelta';
      default: return result;
    }
  };

  // Función para formatear datos de Isabela
  const formatIsabelaData = (conv: any) => {
    // Debug para fechas
    debugDate(conv.start_time_unix_secs, 'start_time_unix_secs');
    
    const unixDate = fromUnixTimestamp(conv.start_time_unix_secs);
    
    // Replicar la misma lógica que en estadisticas-isabela
    const displayName = conv.nombre_paciente && conv.nombre_paciente !== "Cliente NutryHome" 
      ? conv.nombre_paciente 
      : "Sin nombre";
    
    return {
      id: conv.conversation_id || conv.id,
      contactName: displayName,
      phoneNumber: conv.telefono_destino || 'Sin teléfono',
      date: unixDate ? unixDate.toISOString().split('T')[0] : 'N/A',
      time: unixDate ? formatTimeSafe(unixDate, { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      duration: conv.call_duration_secs || 0,
      status: conv.call_successful === 'true' ? 'completed' : 'failed',
      type: 'outbound' as const,
      agentName: 'Isabela',
      result: conv.call_successful === 'true' ? 'follow-up' : 'no-answer',
      tags: [conv.producto || 'Sin producto'].filter(Boolean),
      notes: conv.summary || 'Sin resumen disponible',
      transcription: conv.summary || 'Sin transcripción disponible'
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <MessageSquare className="w-8 h-8 mr-3 text-green-500" />
                Conversaciones
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Historial de mensajes
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Conversación
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('outbound')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'outbound'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <PhoneOutgoing className="w-4 h-4 inline mr-2" />
              Llamadas Salientes
            </button>
            <button
              onClick={() => setActiveTab('inbound')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inbound'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <PhoneIncoming className="w-4 h-4 inline mr-2" />
              Llamadas Entrantes
            </button>
            <button
              onClick={() => setActiveTab('isabela')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'isabela'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              NutriHome (IA)
            </button>
          </nav>
        </div>

        {/* Filters and Search */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>


            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="completed">Completadas</option>
                <option value="failed">Fallidas</option>
                <option value="in-progress">En progreso</option>
                <option value="missed">Perdidas</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas las fechas</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Más filtros
                {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Cualquier duración</option>
                  <option value="short">Corta (0-2 min)</option>
                  <option value="medium">Media (2-5 min)</option>
                  <option value="long">Larga (5+ min)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Cualquier resultado</option>
                  <option value="sale">Venta</option>
                  <option value="follow-up">Seguimiento</option>
                  <option value="rejected">Rechazado</option>
                  <option value="no-answer">Sin respuesta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agente</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Todos los agentes</option>
                  <option value="isabela">Isabela</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="mt-6 space-y-4">
          {filteredConversations.map((conversation) => {
            const displayConversation = activeTab === 'isabela' ? formatIsabelaData(conversation) : conversation;
            
            return (
              <div
                key={displayConversation.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
              <div className="flex items-start justify-between">
                {/* Left side - Conversation info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    {/* Contact info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {displayConversation.contactName}
                          </h3>
                          <p className="text-sm text-gray-500">{displayConversation.phoneNumber}</p>
                        </div>
                      </div>
                    </div>

                    {/* Date and time */}
                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateSafe(displayConversation.date)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                        <Clock className="w-4 h-4" />
                        <span>{displayConversation.time}</span>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="text-center">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Clock3 className="w-4 h-4" />
                        <span>{formatDuration(displayConversation.duration)}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(conversation.status)}`}>
                        {displayConversation.status === 'completed' && 'Completada'}
                        {displayConversation.status === 'failed' && 'Fallida'}
                        {displayConversation.status === 'in-progress' && 'En Progreso'}
                        {displayConversation.status === 'missed' && 'Perdida'}
                      </span>
                    </div>

                    {/* Result */}
                    <div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getResultColor(conversation.result)}`}>
                        {getResultText(displayConversation.result)}
                      </span>
                    </div>

                    {/* Satisfaction */}
                    {displayConversation.satisfaction && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium text-gray-900">
                          {displayConversation.satisfaction}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {displayConversation.tags.length > 0 && (
                    <div className="flex items-center space-x-2 mt-3">
                      {displayConversation.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Agent */}
                  <div className="flex items-center space-x-2 mt-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      Agente: {displayConversation.agentName}
                    </span>
                  </div>
                </div>

                {/* Right side - Actions */}
                <div className="flex items-center space-x-3 ml-6">
                  {/* Recording Play Button - para grabaciones locales */}
                  {conversation.recordingUrl && (
                    <button
                      onClick={() => handlePlayRecording(conversation.id)}
                      className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {isPlaying === conversation.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-1" />
                      )}
                    </button>
                  )}

                  {/* Audio Button - para conversaciones de NutriHome (IA) */}
                  {activeTab === 'isabela' && conversation.id && (
                    <button
                      onClick={() => handlePlayElevenLabsAudio(conversation.id)}
                      className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      title="Reproducir audio de la conversación"
                    >
                      {isPlaying === conversation.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-1" />
                      )}
                    </button>
                  )}

                  {/* Context Menu */}
                  <div className="relative">
                    <button
                      onClick={() => handleContextMenu(conversation.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>

                    {showContextMenu === conversation.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            Resumen
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Transcripción
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <Star className="w-4 h-4 mr-2" />
                            Evaluación
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <Bookmark className="w-4 h-4 mr-2" />
                            Notas
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalles
                          </button>
                          <hr className="my-1" />
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <Download className="w-4 h-4 mr-2" />
                            Descargar
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <Share2 className="w-4 h-4 mr-2" />
                            Compartir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

          {filteredConversations.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay conversaciones</h3>
              <p className="mt-1 text-sm text-gray-500">
                No se encontraron conversaciones con los filtros aplicados.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Audio Player (Fixed at bottom) */}
      {isPlaying && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsPlaying(null)}
                className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white"
              >
                <Pause className="w-5 h-5" />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Reproduciendo: {conversations.find(c => c.id === isPlaying)?.contactName}
                </p>
                <p className="text-xs text-gray-500">
                  {conversations.find(c => c.id === isPlaying)?.phoneNumber}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <SkipBack className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <SkipForward className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Volume2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 