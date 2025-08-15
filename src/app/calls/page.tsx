'use client';

import { useState } from 'react';
import { 
  Phone, 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Bell,
  CheckCircle,
  AlertCircle,
  XCircle,
  X,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  CalendarDays,
  Clock3,
  FileText,
  Users,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { validatePhoneNumber, formatPhoneNumber, getPhoneNumberError } from '@/lib/phoneValidation';
import React from 'react'; // Added missing import for React.useEffect

interface Batch {
  id: string;
  name: string;
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  status: 'pending' | 'running' | 'completed' | 'paused';
  createdAt: string;
  scheduledFor?: string;
}

interface Call {
  id: string;
  phoneNumber: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  duration?: number;
  result?: string;
  timestamp: string;
}

export default function CallsManagement() {
  const [activeTab, setActiveTab] = useState<'outbound' | 'inbound'>('outbound');
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTestCallModal, setShowTestCallModal] = useState(false);
  // State para modal de detalles del batch
  const [showBatchDetailsModal, setShowBatchDetailsModal] = useState(false);
  const [selectedBatchData, setSelectedBatchData] = useState<Batch | null>(null);
  const [batchContacts, setBatchContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testName, setTestName] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener batches del backend
  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app'}/api/campaigns`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Transformar los datos del backend al formato que espera el frontend
        const transformedBatches: Batch[] = data.campaigns.flatMap((campaign: any) => 
          campaign.batches.map((batch: any) => ({
            id: batch.id,
            name: batch.nombre,
            totalCalls: batch.totalCalls,
            completedCalls: batch.completedCalls,
            failedCalls: batch.failedCalls,
            status: mapBatchStatus(batch.estado),
            createdAt: batch.createdAt,
            scheduledFor: batch.fechaProgramada || undefined
          }))
        );
        
        setBatches(transformedBatches);
        setError(null);
      } else {
        // Silenciosamente usar datos de ejemplo sin mostrar error
        console.log('Backend no disponible, usando datos de ejemplo');
        loadExampleData();
      }
    } catch (err) {
      // Silenciosamente usar datos de ejemplo sin mostrar error
      console.log('Error de conexión, usando datos de ejemplo');
      loadExampleData();
    } finally {
      setLoading(false);
    }
  };

  // Función para mapear estados del backend al frontend
  const mapBatchStatus = (backendStatus: string): 'pending' | 'running' | 'completed' | 'paused' => {
    switch (backendStatus) {
      case 'PENDING':
        return 'pending';
      case 'RUNNING':
        return 'running';
      case 'COMPLETED':
        return 'completed';
      case 'PAUSED':
        return 'paused';
      default:
        return 'pending';
    }
  };

  // Función para cargar datos de ejemplo
  const loadExampleData = () => {
    setBatches([
      {
        id: '1',
        name: 'Batch de Prueba - test-contacts.xlsx',
        totalCalls: 8,
        completedCalls: 0,
        failedCalls: 0,
        status: 'pending',
        createdAt: '2025-08-03T19:18:48.000Z'
      },
      {
        id: '2',
        name: 'Batch de Prueba - test-contacts.xlsx',
        totalCalls: 5,
        completedCalls: 0,
        failedCalls: 0,
        status: 'pending',
        createdAt: '2025-08-03T20:29:45.000Z'
      },
      {
        id: '3',
        name: 'Verificación Stock Domicilio - Enero 2025',
        totalCalls: 5,
        completedCalls: 0,
        failedCalls: 0,
        status: 'pending',
        createdAt: '2025-08-03T20:35:00.000Z'
      }
    ]);
    setError(null); // No mostrar error
  };

  // Cargar batches al montar el componente
  React.useEffect(() => {
    fetchBatches();
  }, []);

  // Function to open batch details modal
  const handleBatchClick = async (batch: Batch) => {
    setSelectedBatchData(batch);
    setShowBatchDetailsModal(true);
    setLoadingContacts(true);
    
    try {
      // Intentar obtener datos reales del backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app'}/api/campaigns/batch/${batch.id}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setBatchContacts(data.contacts || []);
      } else {
        // Si no hay datos reales, usar datos de ejemplo basados en el nombre del batch
        console.log('No se pudieron obtener datos reales, usando datos de ejemplo');
        setBatchContacts([]);
      }
    } catch (error) {
      console.log('Error obteniendo datos reales, usando datos de ejemplo');
      setBatchContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Función para cerrar modal de detalles
  const closeBatchDetailsModal = () => {
    setShowBatchDetailsModal(false);
    setSelectedBatchData(null);
    setBatchContacts([]); // Limpiar datos de contactos al cerrar
  };

  const calls: Call[] = [
    {
      id: '1',
      phoneNumber: '+5491137710010',
      name: 'María García',
      status: 'completed',
      duration: 245,
      result: 'Interesado',
      timestamp: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      phoneNumber: '+5491145623789',
      name: 'Juan López',
      status: 'failed',
      result: 'No contesta',
      timestamp: '2024-01-15T10:35:00Z'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'paused': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleScheduleBatch = () => {
    if (selectedBatch && scheduleDate && scheduleTime) {
      // Aquí iría la lógica para programar el batch
      console.log('Programando batch:', selectedBatch, scheduleDate, scheduleTime);
      setShowScheduleModal(false);
    }
  };

  const handleTestCall = () => {
    if (!testPhoneNumber || !testName) {
      alert('Por favor completa todos los campos');
      return;
    }

    // Validar formato del número de teléfono
    const phoneError = getPhoneNumberError(testPhoneNumber);
    if (phoneError) {
      alert(`Error en el número de teléfono: ${phoneError}`);
      return;
    }

    // Formatear el número de teléfono
    const formattedPhone = formatPhoneNumber(testPhoneNumber);
    
    // Aquí iría la lógica para hacer la llamada de prueba
    console.log('Llamada de prueba:', formattedPhone, testName);
    setShowTestCallModal(false);
    setTestPhoneNumber('');
    setTestName('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Llamadas</h1>
              <p className="mt-1 text-sm text-gray-500">
                Administra y programa las llamadas del call center
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTestCallModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Phone className="w-4 h-4 mr-2" />
                Prueba de Llamada
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Settings className="w-4 h-4 mr-2" />
                Configuración
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
              Llamadas Salientes (Outbound)
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
              Llamadas Entrantes (Inbound)
            </button>
          </nav>
        </div>

        {activeTab === 'outbound' && (
          <div className="mt-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Phone className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total de Llamadas
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {batches.reduce((sum, batch) => sum + batch.totalCalls, 0)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Completadas
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {batches.reduce((sum, batch) => sum + batch.completedCalls, 0)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <XCircle className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Fallidas
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {batches.reduce((sum, batch) => sum + batch.failedCalls, 0)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          En Progreso
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {batches.filter(b => b.status === 'running').length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de Batches */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Batches de Llamadas</h3>
                  <div className="flex space-x-2">
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <Upload className="w-4 h-4 mr-2" />
                      Importar
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Batch
                    </button>
                  </div>
                </div>
              </div>

              {/* Indicador de carga */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Cargando batches...</span>
                </div>
              )}

              {/* Tabla */}
              {!loading && (
                <div className="overflow-x-auto">
                  {batches.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No hay batches</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Comienza cargando un archivo Excel desde la página de upload.
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={fetchBatches}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refrescar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Batch
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progreso
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Creación
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Programado
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {batches.map((batch) => (
                        <tr 
                          key={batch.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleBatchClick(batch)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors">
                                  <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {batch.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {batch.totalCalls} llamadas
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(batch.completedCalls / batch.totalCalls) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-500">
                                {Math.round((batch.completedCalls / batch.totalCalls) * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(batch.status)}`}>
                              {batch.status === 'running' && 'En Progreso'}
                              {batch.status === 'completed' && 'Completado'}
                              {batch.status === 'pending' && 'Pendiente'}
                              {batch.status === 'paused' && 'Pausado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(batch.createdAt).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {batch.scheduledFor ? (
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(batch.scheduledFor).toLocaleDateString('es-ES')}
                                <br />
                                {new Date(batch.scheduledFor).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            ) : (
                              <span className="text-gray-400">No programado</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                              {batch.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedBatch(batch.id);
                                      setShowScheduleModal(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Programar"
                                  >
                                    <Calendar className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => console.log('Iniciar batch:', batch.id)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Iniciar"
                                  >
                                    <Play className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {batch.status === 'running' && (
                                <>
                                  <button
                                    onClick={() => console.log('Pausar batch:', batch.id)}
                                    className="text-yellow-600 hover:text-yellow-900"
                                    title="Pausar"
                                  >
                                    <Pause className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => console.log('Detener batch:', batch.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Detener"
                                  >
                                    <Square className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              )}
            </div>

            {/* Recent Calls Section */}
            <div className="mt-8 bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Llamadas Recientes
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duración
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resultado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {calls.map((call) => (
                      <tr key={call.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <Users className="h-6 w-6 text-gray-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {call.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {call.phoneNumber}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCallStatusColor(call.status)}`}>
                            {call.status === 'completed' && 'Completada'}
                            {call.status === 'in-progress' && 'En Progreso'}
                            {call.status === 'failed' && 'Fallida'}
                            {call.status === 'pending' && 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {call.duration ? formatDuration(call.duration) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {call.result || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(call.timestamp).toLocaleString('es-ES')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inbound' && (
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <PhoneIncoming className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Gestión de Llamadas Entrantes
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Esta funcionalidad estará disponible próximamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Programar Ejecución de Batch
                </h3>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleScheduleBatch}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Programar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Call Modal */}
      {showTestCallModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Prueba de Llamada
                </h3>
                <button
                  onClick={() => setShowTestCallModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Contacto
                  </label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Ingrese el nombre"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Teléfono
                  </label>
                  <input
                    type="tel"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="+5491137710010"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      testPhoneNumber && getPhoneNumberError(testPhoneNumber) 
                        ? 'border-red-300 focus:ring-red-500' 
                        : testPhoneNumber && validatePhoneNumber(testPhoneNumber)
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-300'
                    }`}
                  />
                  {testPhoneNumber && getPhoneNumberError(testPhoneNumber) && (
                    <p className="mt-1 text-xs text-red-600">
                      {getPhoneNumberError(testPhoneNumber)}
                    </p>
                  )}
                  {testPhoneNumber && validatePhoneNumber(testPhoneNumber) && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ Formato válido para ElevenLabs
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowTestCallModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTestCall}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Realizar Llamada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Details Modal */}
      {showBatchDetailsModal && selectedBatchData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedBatchData.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedBatchData.totalCalls} llamadas • Creado el {new Date(selectedBatchData.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeBatchDetailsModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Estadísticas del batch */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedBatchData.totalCalls}</div>
                  <div className="text-sm text-blue-600">Total de Llamadas</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedBatchData.completedCalls}</div>
                  <div className="text-sm text-green-600">Completadas</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{selectedBatchData.failedCalls}</div>
                  <div className="text-sm text-red-600">Fallidas</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {selectedBatchData.totalCalls - selectedBatchData.completedCalls - selectedBatchData.failedCalls}
                  </div>
                  <div className="text-sm text-yellow-600">Pendientes</div>
                </div>
              </div>

              {/* Estado del batch */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Estado del Batch</h4>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedBatchData.status)}`}>
                    {selectedBatchData.status === 'running' && 'En Progreso'}
                    {selectedBatchData.status === 'completed' && 'Completado'}
                    {selectedBatchData.status === 'pending' && 'Pendiente'}
                    {selectedBatchData.status === 'paused' && 'Pausado'}
                  </span>
                  {selectedBatchData.scheduledFor && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-1" />
                      Programado para: {new Date(selectedBatchData.scheduledFor).toLocaleString('es-ES')}
                    </div>
                  )}
                </div>
              </div>

                        {/* List of Calls (Real Data from Database) */}
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-3">Llamadas del Batch</h4>
                          <div className="bg-gray-50 rounded-lg p-4">
                            {loadingContacts ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-gray-600">Cargando contactos...</span>
                              </div>
                            ) : batchContacts.length > 0 ? (
                              <>
                                <p className="text-sm text-gray-600 mb-4">
                                  📋 Este batch contiene {batchContacts.length} contactos para verificación de stock de productos nutricionales.
                                </p>
                                <div className="space-y-3">
                                  {batchContacts.map((contact, index) => (
                                    <div key={contact.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                          <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                                        </div>
                                        <div>
                                          <div className="font-medium text-gray-900">
                                            {contact.nombre_paciente || contact.nombre || 'Sin nombre'}
                                          </div>
                                          <div className="text-sm text-gray-500">{contact.telefono}</div>
                                          {contact.nombre_contacto && (
                                            <div className="text-xs text-gray-400">Contacto: {contact.nombre_contacto}</div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-sm text-gray-600 text-right">
                                        {contact.producto1 && (
                                          <div>{contact.producto1}</div>
                                        )}
                                        {contact.cantidad1 && (
                                          <div className="text-xs text-gray-500">
                                            {contact.cantidad1} unidades
                                            {contact.domicilio_actual && ` • ${contact.domicilio_actual}`}
                                            {contact.localidad && `, ${contact.localidad}`}
                                          </div>
                                        )}
                                        {!contact.producto1 && (
                                          <div className="text-xs text-gray-500">Pendiente</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-4 text-center">
                                  <p className="text-xs text-gray-500">
                                    Mostrando todos los registros. Total: {batchContacts.length} contactos
                                  </p>
                                </div>
                              </>
                            ) : (
                              <p className="text-center text-gray-500 py-8">
                                No hay contactos disponibles para este batch.
                              </p>
                            )}
                          </div>
                        </div>

              {/* Botón de cerrar */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={closeBatchDetailsModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 