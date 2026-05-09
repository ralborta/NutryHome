'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Phone,
  Calendar,
  Clock,
  Play,
  Pause,
  Plus,
  Upload,
  Settings,
  CheckCircle,
  XCircle,
  X,
  PhoneIncoming,
  PhoneOutgoing,
  FileText,
  RefreshCw,
  Trash2,
  Database,
  Copy,
  Eye,
  Users,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { validatePhoneNumber, formatPhoneNumber, getPhoneNumberError } from '@/lib/phoneValidation';
import { formatDateSafe, formatTimeSafe, formatDateTimeSafe, debugDate } from '@/lib/dateUtils';
import React from 'react'; // Added missing import for React.useEffect

interface Batch {
  id: string;
  name: string;
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  status: 'pending' | 'running' | 'completed' | 'paused' | 'cancelled' | 'failed';
  createdAt: string;
  scheduledFor?: string;
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
  
  // State para modal de confirmación de borrado
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testName, setTestName] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  
  // Descargar reporte de productos (transcripciones)
  const handleGenerateProductReport = async () => {
    try {
      const response = await fetch('/api/reports/productos', { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_productos_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert('No se pudo generar el reporte. Intenta nuevamente.');
    }
  };
  
  // Estados para NutriHome
  const [executingBatch, setExecutingBatch] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<any>(null);
  const [cancellingBatch, setCancellingBatch] = useState<string | null>(null);

  // Función para obtener batches del backend
  const fetchBatches = async () => {
    try {
      setLoading(true);
      
      // 🔍 DEBUG: Ver qué URL está usando
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app';
      console.log('🔍 DEBUG - API URL:', apiUrl);
      console.log('🔍 DEBUG - process.env.NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
      
      const response = await fetch(`${apiUrl}/api/campaigns`);
      
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
  const mapBatchStatus = (backendStatus: string): 'pending' | 'running' | 'completed' | 'paused' | 'cancelled' | 'failed' => {
    switch (backendStatus) {
      case 'PENDING':
        return 'pending';
      case 'RUNNING':
      case 'PROCESSING':
        return 'running';
      case 'COMPLETED':
        return 'completed';
      case 'PAUSED':
        return 'paused';
      case 'CANCELLED':
        return 'cancelled';
      case 'FAILED':
        return 'failed';
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
        setBatchContacts(data || []);
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

  // Función para abrir modal de confirmación de borrado
  const openDeleteModal = (batch: Batch) => {
    setBatchToDelete(batch);
    setShowDeleteModal(true);
  };

  // Función para cerrar modal de confirmación de borrado
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setBatchToDelete(null);
  };

  // Función para borrar batch
  const deleteBatch = async () => {
    if (!batchToDelete) return;
    
    try {
      setDeletingBatch(true);
      
      // Llamar al endpoint del backend para borrar el batch
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app'}/api/campaigns/batch/${batchToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remover el batch de la lista local
        setBatches(prevBatches => prevBatches.filter(b => b.id !== batchToDelete.id));
        
        // Cerrar modal y limpiar estado
        closeDeleteModal();
        
        // Mostrar mensaje de éxito
        alert('Batch eliminado correctamente');
      } else {
        const errorData = await response.json();
        alert(`Error al eliminar batch: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error eliminando batch:', error);
      alert('Error al eliminar batch. Intenta nuevamente.');
    } finally {
      setDeletingBatch(false);
    }
  };

  // Función para ejecutar batch con NutriHome
  const executeBatch = async (batchId: string) => {
    try {
      setExecutingBatch(batchId);
      setError(null);
      
      console.log(`🚀 Ejecutando batch ${batchId} con NutriHome...`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app'}/api/campaigns/batch/${batchId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Batch iniciado exitosamente:', result);
        
        // Mostrar mensaje de éxito
        alert(`✅ Batch iniciado exitosamente!\n\n${result.message}\nTotal de llamadas: ${result.totalCalls}`);
        
        // Iniciar monitoreo del batch
        startBatchMonitoring(batchId);
        
        // Actualizar estado del batch en la lista
        setBatches(prevBatches => 
          prevBatches.map(batch => 
            batch.id === batchId 
              ? { ...batch, status: 'running' as const }
              : batch
          )
        );
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido al ejecutar batch');
      }
      
    } catch (error) {
      console.error('❌ Error ejecutando batch:', error);
      setError(`Error al ejecutar batch: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      alert(`❌ Error al ejecutar batch:\n\n${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setExecutingBatch(null);
    }
  };

  // Función para monitorear el estado del batch
  const startBatchMonitoring = async (batchId: string) => {
    try {
      // Polling cada 5 segundos para obtener estado actualizado
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app'}/api/campaigns/batch/${batchId}/status`);
          
          if (response.ok) {
            const status = await response.json();
            setBatchStatus(status);
            
            // Si el batch está completado o falló, detener el monitoreo
            if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
              clearInterval(interval);
              
              // Actualizar estado en la lista de batches
              setBatches(prevBatches => 
                prevBatches.map(batch => 
                  batch.id === batchId 
                    ? { 
                        ...batch, 
                        status: status.status === 'completed' ? 'completed' : 'failed',
                        completedCalls: status.completedCalls,
                        failedCalls: status.failedCalls
                      }
                    : batch
                )
              );
              
              // Mostrar mensaje de finalización
              if (status.status === 'completed') {
                alert(`✅ Batch completado exitosamente!\n\nLlamadas completadas: ${status.completedCalls}\nLlamadas fallidas: ${status.failedCalls}`);
              } else if (status.status === 'failed') {
                alert(`❌ Batch falló!\n\nLlamadas completadas: ${status.completedCalls}\nLlamadas fallidas: ${status.failedCalls}`);
              }
            }
          }
        } catch (error) {
          console.error('Error obteniendo estado del batch:', error);
        }
      }, 5000);
      
      // Limpiar intervalo después de 10 minutos (tiempo máximo de ejecución)
      setTimeout(() => {
        clearInterval(interval);
      }, 10 * 60 * 1000);
      
    } catch (error) {
      console.error('Error iniciando monitoreo del batch:', error);
    }
  };

  // Función para cancelar batch en progreso
  const cancelBatch = async (batchId: string) => {
    try {
      setCancellingBatch(batchId);
      setError(null);
      
      console.log(`🛑 Cancelando batch ${batchId}...`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app'}/api/campaigns/batch/${batchId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Batch cancelado exitosamente:', result);
        
        // Mostrar mensaje de éxito
        alert(`✅ Batch cancelado exitosamente!\n\n${result.message}`);
        
        // Actualizar estado del batch en la lista
        setBatches(prevBatches => 
          prevBatches.map(batch => 
            batch.id === batchId 
              ? { ...batch, status: 'cancelled' as const }
              : batch
          )
        );
        
        // Limpiar estado del batch
        if (batchStatus?.batchId === batchId) {
          setBatchStatus(null);
        }
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido al cancelar batch');
      }
      
    } catch (error) {
      console.error('❌ Error cancelando batch:', error);
      setError(`Error al cancelar batch: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      alert(`❌ Error al cancelar batch:\n\n${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setCancellingBatch(null);
    }
  };

  // 🔄 Función para sincronizar batch con NutriHome
  const syncBatch = async (batchId: string) => {
    try {
      setError(null);
      console.log(`🔄 Sincronizando batch ${batchId} con NutriHome...`);
      
      // Mostrar indicador de sincronización
      const syncButton = document.querySelector(`[onclick="syncBatch('${batchId}')"]`);
      if (syncButton) {
        syncButton.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>';
        syncButton.setAttribute('disabled', 'true');
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app'}/api/campaigns/batch/${batchId}/sync`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Batch sincronizado exitosamente:', result);
        
        // Mostrar mensaje de éxito
        alert(`✅ Batch sincronizado exitosamente!\n\nLlamadas actualizadas: ${result.updatedCalls}\nLlamadas fallidas: ${result.failedCalls}\nEstado del batch: ${result.batchStatus}`);
        
        // Actualizar estado del batch en la lista
        setBatches(prevBatches => 
          prevBatches.map(batch => 
            batch.id === batchId 
              ? { 
                  ...batch, 
                  status: result.batchStatus === 'COMPLETED' ? 'completed' : 
                         result.batchStatus === 'FAILED' ? 'failed' : 
                         result.batchStatus === 'IN_PROGRESS' ? 'running' : 'pending'
                }
              : batch
          )
        );
        
        // Recargar la lista de batches para obtener datos actualizados
        fetchBatches();
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido al sincronizar batch');
      }
      
    } catch (error) {
      console.error('❌ Error sincronizando batch:', error);
      setError(`Error al sincronizar batch: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      alert(`❌ Error al sincronizar batch:\n\n${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      // Restaurar botón de sincronización
      const syncButton = document.querySelector(`[onclick="syncBatch('${batchId}')"]`);
      if (syncButton) {
        syncButton.innerHTML = '<RefreshCw className="w-4 h-4" />';
        syncButton.removeAttribute('disabled');
      }
    }
  };

  const totalBatches = batches.length;
  const completedLots = batches.filter((b) => b.status === 'completed').length;
  const failedLots = batches.filter((b) => b.status === 'failed').length;
  const inProgressLots = batches.filter((b) => b.status === 'running' || b.status === 'paused').length;

  const pctOfTotal = (n: number) => (totalBatches > 0 ? ((n / totalBatches) * 100).toFixed(1) : '0');

  const tableTotalPages = Math.max(1, Math.ceil(totalBatches / tablePageSize));
  const paginatedBatches = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return batches.slice(start, start + tablePageSize);
  }, [batches, tablePage, tablePageSize]);

  React.useEffect(() => {
    setTablePage((p) => Math.min(Math.max(1, p), tableTotalPages));
  }, [tableTotalPages]);

  React.useEffect(() => {
    setOpenActionMenuId(null);
  }, [tablePage, batches]);

  const batchProgressPct = (batch: Batch) => {
    if (batch.totalCalls <= 0) return batch.status === 'completed' ? 100 : 0;
    const raw = Math.round((batch.completedCalls / batch.totalCalls) * 100);
    return Math.min(100, raw);
  };

  const copyBatchRow = async (batch: Batch) => {
    try {
      await navigator.clipboard.writeText(`${batch.name} — ID: ${batch.id} — ${batch.totalCalls} llamadas`);
      toast.success('Datos del lote copiados');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const estadoPillClass = (status: Batch['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
      case 'running':
      case 'paused':
        return 'bg-blue-50 text-blue-800 ring-1 ring-blue-200';
      case 'pending':
        return 'bg-violet-50 text-violet-800 ring-1 ring-violet-200';
      case 'failed':
        return 'bg-red-50 text-red-800 ring-1 ring-red-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
    }
  };

  const estadoLabel = (status: Batch['status']) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'running':
      case 'paused':
        return 'En progreso';
      case 'pending':
        return 'Programado';
      case 'failed':
        return 'Fallido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
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

  const paginationItems = useMemo<(number | '…')[]>(() => {
    const total = tableTotalPages;
    const cur = tablePage;
    if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
    const s = new Set<number>([1, 2, 3, total, cur, cur - 1, cur + 1]);
    const nums = Array.from(s)
      .filter((n) => n >= 1 && n <= total)
      .sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    let prev = 0;
    for (const n of nums) {
      if (prev && n - prev > 1) out.push('…');
      out.push(n);
      prev = n;
    }
    return out;
  }, [tableTotalPages, tablePage]);

  const rowStart = totalBatches === 0 ? 0 : (tablePage - 1) * tablePageSize + 1;
  const rowEnd = Math.min(tablePage * tablePageSize, totalBatches);

  return (
    <div className="min-h-screen bg-[#f3f6fb] pb-12">
      <div className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[1.85rem] font-bold tracking-tight text-[#1e3a5f]">Campañas y Lotes</h1>
            <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-slate-500">
              Procesa y administra campañas outbound a partir de lotes de contactos
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateProductReport}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 text-blue-600" strokeWidth={1.75} />
              Reporte de Productos
            </button>
            <button
              type="button"
              onClick={() => setShowTestCallModal(true)}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-900/15 hover:bg-blue-700"
            >
              <Phone className="h-4 w-4" strokeWidth={1.75} />
              Prueba de Llamada
            </button>
            <button
              type="button"
              onClick={() => toast('Configuración de campañas disponible próximamente.', { icon: '⚙️' })}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <Settings className="h-4 w-4" strokeWidth={1.75} />
              Configuración
            </button>
          </div>
        </div>

        <div className="mt-10 border-b border-slate-200">
          <nav className="-mb-px flex gap-10">
            <button
              type="button"
              onClick={() => setActiveTab('outbound')}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
                activeTab === 'outbound'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <PhoneOutgoing className="h-4 w-4" strokeWidth={1.75} />
              Llamadas Salientes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inbound')}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
                activeTab === 'inbound'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <PhoneIncoming className="h-4 w-4" strokeWidth={1.75} />
              Llamadas Entrantes
            </button>
          </nav>
        </div>

        {activeTab === 'outbound' && (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[14px] border border-slate-200/90 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lotes totales</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-[#1e3a5f]">{totalBatches}</p>
                    <p className="mt-1 text-xs text-slate-500">Todos los lotes creados</p>
                  </div>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
                    <Phone className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                </div>
              </div>
              <div className="rounded-[14px] border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/90">Completadas</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-900">{completedLots}</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-700">{pctOfTotal(completedLots)}% del total</p>
                  </div>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-200/80 text-emerald-800 ring-2 ring-white">
                    <CheckCircle className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                </div>
              </div>
              <div className="rounded-[14px] border border-red-100 bg-red-50/70 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700/90">Fallidas</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-red-900">{failedLots}</p>
                    <p className="mt-1 text-xs font-semibold text-red-700">{pctOfTotal(failedLots)}% del total</p>
                  </div>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-200/70 text-red-800 ring-2 ring-white">
                    <XCircle className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                </div>
              </div>
              <div className="rounded-[14px] border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-800/80">En progreso</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-blue-950">{inProgressLots}</p>
                    <p className="mt-1 text-xs font-semibold text-blue-800">{pctOfTotal(inProgressLots)}% del total</p>
                  </div>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-200/70 text-blue-900 ring-2 ring-white">
                    <Clock className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[14px] border border-slate-200/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white">
                    <Database className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-lg font-bold text-[#1e3a5f]">Lotes de Campaña</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/upload"
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" strokeWidth={1.75} />
                    Importar Excel
                  </Link>
                  <Link
                    href="/upload"
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} />+ Nuevo lote
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-3 py-16 text-slate-600">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  Cargando lotes…
                </div>
              ) : batches.length === 0 ? (
                <div className="px-6 py-16 text-center text-slate-500">
                  <FileText className="mx-auto h-14 w-14 text-slate-300" />
                  <p className="mt-4 font-semibold text-slate-800">No hay lotes cargados</p>
                  <p className="mt-2 text-sm">Importá un Excel desde la sección de carga.</p>
                  <button type="button" onClick={() => fetchBatches()} className="mt-6 text-sm font-semibold text-blue-600 underline">
                    Reintentar
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-[920px] w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          <th className="whitespace-nowrap px-5 py-3">Lote</th>
                          <th className="whitespace-nowrap px-5 py-3">Llamadas</th>
                          <th className="min-w-[180px] px-5 py-3">Progreso</th>
                          <th className="whitespace-nowrap px-5 py-3">Estado</th>
                          <th className="whitespace-nowrap px-5 py-3">Fecha creación</th>
                          <th className="whitespace-nowrap px-5 py-3">Programado</th>
                          <th className="whitespace-nowrap px-5 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBatches.map((batch) => {
                          const livePct =
                            batch.status === 'running' && batchStatus?.batchId === batch.id
                              ? Number(batchStatus.progress ?? batchProgressPct(batch))
                              : batchProgressPct(batch);
                          const pct = Math.min(
                            100,
                            Number.isFinite(livePct) ? livePct : batchProgressPct(batch),
                          );
                          const barBg = pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-blue-500' : 'bg-transparent';
                          return (
                            <tr key={batch.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                              <td className="px-5 py-4 align-middle">
                                <button
                                  type="button"
                                  className="flex items-center gap-3 text-left transition hover:opacity-90"
                                  onClick={() => handleBatchClick(batch)}
                                >
                                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                                    <FileText className="h-5 w-5" strokeWidth={1.75} />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block font-semibold text-slate-900">{batch.name}</span>
                                    <span className="text-xs text-slate-500">{batch.totalCalls} llamadas</span>
                                  </span>
                                </button>
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 align-middle font-semibold tabular-nums text-slate-900">
                                {batch.totalCalls}
                              </td>
                              <td className="max-w-[220px] px-5 py-4 align-middle">
                                <div className="flex items-center gap-3">
                                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                                    <div className={`h-full rounded-full transition-all ${barBg}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="w-11 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-600">
                                    {pct}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4 align-middle">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${estadoPillClass(batch.status)}`}
                                >
                                  {estadoLabel(batch.status)}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 align-middle text-xs text-slate-600 leading-relaxed">
                                {formatDateTimeSafe(batch.createdAt)}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 align-middle text-xs text-slate-600 leading-relaxed">
                                {batch.scheduledFor ? formatDateTimeSafe(batch.scheduledFor) : '-- No programado'}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 align-middle text-right">
                                <div className="relative flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  {batch.status === 'completed' || batch.status === 'failed' ? (
                                    <>
                                      <button type="button" title="Actualizar estado" className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-blue-600 hover:bg-blue-50" onClick={() => syncBatch(batch.id)}>
                                        <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                                      </button>
                                      <button type="button" title="Copiar" className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-blue-600 hover:bg-blue-50" onClick={() => copyBatchRow(batch)}>
                                        <Copy className="h-4 w-4" strokeWidth={1.75} />
                                      </button>
                                      <button type="button" title="Eliminar" className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-red-600 hover:bg-red-50" onClick={() => openDeleteModal(batch)}>
                                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                      </button>
                                    </>
                                  ) : batch.status === 'running' || batch.status === 'paused' ? (
                                    <>
                                      <button
                                        type="button"
                                        title="Pausar / detener"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                                        onClick={() => cancelBatch(batch.id)}
                                        disabled={cancellingBatch === batch.id}
                                      >
                                        {cancellingBatch === batch.id ? (
                                          <span className="grid h-4 w-4 place-items-center">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                          </span>
                                        ) : (
                                          <Pause className="h-4 w-4" strokeWidth={1.75} />
                                        )}
                                      </button>
                                      <button type="button" title="Actualizar estado" className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-blue-600 hover:bg-blue-50" onClick={() => syncBatch(batch.id)}>
                                        <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                                      </button>
                                      <button type="button" title="Copiar" className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-blue-600 hover:bg-blue-50" onClick={() => copyBatchRow(batch)}>
                                        <Copy className="h-4 w-4" strokeWidth={1.75} />
                                      </button>
                                      <div className="relative">
                                        <button
                                          type="button"
                                          title="Más opciones"
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-slate-600 hover:bg-slate-100"
                                          onClick={() =>
                                            setOpenActionMenuId((id) => (id === batch.id ? null : batch.id))
                                          }
                                        >
                                          <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                                        </button>
                                        {openActionMenuId === batch.id && (
                                          <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                            <button
                                              type="button"
                                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-slate-50"
                                              onClick={() => {
                                                handleBatchClick(batch);
                                                setOpenActionMenuId(null);
                                              }}
                                            >
                                              Ver detalle
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        title="Ejecutar lote"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                                        onClick={() => executeBatch(batch.id)}
                                        disabled={executingBatch === batch.id}
                                      >
                                        {executingBatch === batch.id ? (
                                          <span className="grid h-4 w-4 place-items-center">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                          </span>
                                        ) : (
                                          <Play className="h-4 w-4" strokeWidth={1.75} />
                                        )}
                                      </button>
                                      <button type="button" title="Copiar" className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-blue-600 hover:bg-blue-50" onClick={() => copyBatchRow(batch)}>
                                        <Copy className="h-4 w-4" strokeWidth={1.75} />
                                      </button>
                                      <div className="relative">
                                        <button
                                          type="button"
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors text-slate-600 hover:bg-slate-100"
                                          onClick={() =>
                                            setOpenActionMenuId((id) => (id === batch.id ? null : batch.id))
                                          }
                                        >
                                          <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                                        </button>
                                        {openActionMenuId === batch.id && (
                                          <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                            <button
                                              type="button"
                                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-slate-50"
                                              onClick={() => {
                                                setSelectedBatch(batch.id);
                                                setShowScheduleModal(true);
                                                setOpenActionMenuId(null);
                                              }}
                                            >
                                              <Calendar className="h-3.5 w-3.5" />
                                              Programar
                                            </button>
                                            <button
                                              type="button"
                                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-slate-50"
                                              onClick={() => {
                                                handleBatchClick(batch);
                                                setOpenActionMenuId(null);
                                              }}
                                            >
                                              Ver detalle
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600">
                      Mostrando <span className="font-semibold text-slate-900">{rowStart}</span> a{' '}
                      <span className="font-semibold text-slate-900">{rowEnd}</span> de{' '}
                      <span className="font-semibold text-slate-900">{totalBatches}</span> lotes
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:flex-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          disabled={tablePage <= 1}
                          onClick={() => setTablePage(1)}
                          aria-label="Primera"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          disabled={tablePage <= 1}
                          onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                          aria-label="Anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          disabled={tablePage >= tableTotalPages}
                          onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
                          aria-label="Siguiente"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          disabled={tablePage >= tableTotalPages}
                          onClick={() => setTablePage(tableTotalPages)}
                          aria-label="Última"
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1">
                        {paginationItems.map((p, idx) =>
                          p === '…' ? (
                            <span key={`e-${idx}`} className="px-2 text-slate-400">
                              …
                            </span>
                          ) : (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setTablePage(p)}
                              className={`min-h-9 min-w-9 rounded-lg px-2 text-sm font-semibold tabular-nums ${
                                p === tablePage
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                    <select
                      value={tablePageSize}
                      onChange={(e) => {
                        setTablePageSize(Number(e.target.value));
                        setTablePage(1);
                      }}
                      className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      {[10, 25, 50].map((n) => (
                        <option key={n} value={n}>
                          {n} por página
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {activeTab === 'inbound' && (
          <div className="mt-10 rounded-[14px] border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
            <PhoneIncoming className="mx-auto h-14 w-14 text-slate-300" />
            <p className="mt-6 text-lg font-bold text-[#1e3a5f]">Gestión de llamadas entrantes</p>
            <p className="mt-2 text-sm text-slate-500">Próximamente podrás operar campañas entrantes desde esta vista.</p>
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
                      ✓ Formato válido para NutriHome
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-[2px]">
          <div className="mx-auto flex min-h-full w-full max-w-[1140px] items-center justify-center p-6">
            <div className="w-full rounded-[18px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-violet-100 text-violet-600">
                      <FileText className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <h3 className="text-[30px] font-bold leading-none text-[#1e3a5f]">{selectedBatchData.name}</h3>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        {selectedBatchData.totalCalls} llamadas • Creado el {formatDateSafe(selectedBatchData.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeBatchDetailsModal}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 px-6 py-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
                        <Phone className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[30px] leading-none font-bold text-[#2b4b84]">{selectedBatchData.totalCalls}</p>
                        <p className="mt-2 text-xs font-semibold text-[#2b4b84]">Total de llamadas</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[30px] leading-none font-bold text-emerald-700">{selectedBatchData.completedCalls}</p>
                        <p className="mt-2 text-xs font-semibold text-emerald-700">Completadas</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-red-100 bg-red-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 text-red-600">
                        <XCircle className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[30px] leading-none font-bold text-red-700">{selectedBatchData.failedCalls}</p>
                        <p className="mt-2 text-xs font-semibold text-red-700">Fallidas</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-600">
                        <Clock className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[30px] leading-none font-bold text-amber-700">
                          {Math.max(0, selectedBatchData.totalCalls - selectedBatchData.completedCalls - selectedBatchData.failedCalls)}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-amber-700">Pendientes</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Estado del lote</p>
                      <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${estadoPillClass(selectedBatchData.status)}`}>
                        {estadoLabel(selectedBatchData.status)}
                      </span>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-500">Progreso del lote</p>
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                selectedBatchData.totalCalls > 0
                                  ? Math.round(((selectedBatchData.completedCalls + selectedBatchData.failedCalls) / selectedBatchData.totalCalls) * 100)
                                  : 0,
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right text-xs font-semibold text-slate-600">
                          {Math.min(
                            100,
                            selectedBatchData.totalCalls > 0
                              ? Math.round(((selectedBatchData.completedCalls + selectedBatchData.failedCalls) / selectedBatchData.totalCalls) * 100)
                              : 0,
                          )}
                          %
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Este lote contiene {loadingContacts ? selectedBatchData.totalCalls : batchContacts.length || selectedBatchData.totalCalls} contactos para verificación de stock de productos nutricionales.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100 text-violet-600">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <h4 className="text-base font-semibold text-[#1e3a5f]">Contactos del lote</h4>
                    </div>
                  </div>
                  {loadingContacts ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-slate-600">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                      Cargando contactos...
                    </div>
                  ) : batchContacts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-[920px] w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Paciente</th>
                            <th className="px-4 py-3">Contacto</th>
                            <th className="px-4 py-3">Producto</th>
                            <th className="px-4 py-3">Cantidad</th>
                            <th className="px-4 py-3">Dirección / Localidad</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchContacts.slice(0, 8).map((contact, index) => (
                            <tr key={contact.id || `${contact.telefono}-${index}`} className="border-b border-slate-100 text-sm last:border-0">
                              <td className="px-4 py-3">
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {(contact.nombre_paciente || contact.nombre || 'SIN NOMBRE').toString().toUpperCase()}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {(contact.nombre_contacto || contact.telefono || '-').toString().toUpperCase()}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{contact.producto1 || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">
                                {contact.cantidad1 ? `${contact.cantidad1} ${Number(contact.cantidad1) === 1 ? 'unidad' : 'unidades'}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {[contact.domicilio_actual, contact.localidad].filter(Boolean).join(', ') || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Ver ficha
                                  </button>
                                  <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-12 text-center text-sm text-slate-500">No hay contactos disponibles para este lote.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Users className="h-4 w-4 text-violet-500" />
                  {loadingContacts ? selectedBatchData.totalCalls : batchContacts.length || selectedBatchData.totalCalls} contactos en este lote
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => handleBatchClick(selectedBatchData)}
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    Ver detalle completo
                  </button>
                  <button
                    onClick={closeBatchDetailsModal}
                    className="inline-flex h-10 items-center rounded-[10px] border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      {showDeleteModal && batchToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
                                </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                ¿Borrar Batch?
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  ¿Estás seguro de que quieres borrar el batch <strong>"{batchToDelete.name}"</strong>?
                </p>
                <p className="text-sm text-red-500 mt-2">
                  Esta acción eliminará permanentemente:
                </p>
                <ul className="text-sm text-red-500 mt-1 text-left">
                  <li>• El batch completo</li>
                  <li>• Todos los contactos ({batchToDelete.totalCalls})</li>
                  <li>• Todas las llamadas asociadas</li>
                </ul>
                <p className="text-sm text-red-500 mt-2">
                  <strong>Esta acción no se puede deshacer.</strong>
                                  </p>
                                </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={closeDeleteModal}
                  disabled={deletingBatch}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={deleteBatch}
                  disabled={deletingBatch}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {deletingBatch ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Borrando...
                    </>
                  ) : (
                    'Sí, Borrar Batch'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 