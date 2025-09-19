'use client';

import { useState, useEffect } from 'react';
import { formatDateSafe } from '@/lib/dateUtils';
import { motion } from 'framer-motion';
import { 
  Phone, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Activity,
  Calendar,
  RefreshCw,
  Eye,
  Download
} from 'lucide-react';
import DashboardStats from '@/components/dashboard/DashboardStats';
import CallsChart from '@/components/dashboard/CallsChart';
import DerivationsChart from '@/components/dashboard/DerivationsChart';
import RecentCalls from '@/components/dashboard/RecentCalls';
import PerformanceMetrics from '@/components/dashboard/PerformanceMetrics';

export default function DashboardPage() {
  const [isabelaStats, setIsabelaStats] = useState<any>(null);
  const [isabelaLoading, setIsabelaLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // Cargar estadísticas de Isabela
  useEffect(() => {
    const fetchIsabelaStats = async () => {
      try {
        setIsabelaLoading(true);
        const response = await fetch('/api/estadisticas-isabela');
        if (response.ok) {
          const data = await response.json();
          setIsabelaStats(data);
        }
      } catch (error) {
        console.error('Error fetching Isabela stats:', error);
      } finally {
        setIsabelaLoading(false);
      }
    };

    fetchIsabelaStats();
  }, []);

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
  }, []);

  // Calcular métricas reales basadas en datos de Isabela
  const calculateRealMetrics = () => {
    if (!isabelaStats?.conversations || isabelaLoading) {
      return {
        totalCalls: 0,
        avgDuration: '0m 0s',
        successRate: 0,
        derivations: 0,
        complaints: 0,
        totalTime: '0h 0m'
      };
    }

    const conversations = isabelaStats.conversations;
    const totalCalls = conversations.length;
    
    // Calcular duración promedio
    const totalSeconds = conversations.reduce((acc: number, conv: any) => 
      acc + (conv.call_duration_secs || 0), 0);
    const avgSeconds = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0;
    const avgMinutes = Math.floor(avgSeconds / 60);
    const avgRemainingSeconds = avgSeconds % 60;
    const avgDuration = `${avgMinutes}m ${avgRemainingSeconds}s`;

    // Calcular tasa de éxito
    const successfulCalls = conversations.filter((conv: any) => 
      conv.call_successful === 'true').length;
    const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

    // Calcular derivaciones (buscar en resúmenes y datos de evaluación)
    const derivations = conversations.filter((conv: any) => {
      const summary = conv.summary?.toLowerCase() || '';
      const evaluationData = conv.evaluation_data || {};
      
      // Buscar en resumen
      const hasDerivationInSummary = summary.includes('derivar') || 
                                   summary.includes('derivación') ||
                                   summary.includes('derivado') ||
                                   summary.includes('referir') ||
                                   summary.includes('especialista');
      
      // Buscar en datos de evaluación
      const hasDerivationInEvaluation = Object.values(evaluationData).some((criteria: any) => 
        criteria && typeof criteria === 'object' && 
        (criteria.rationale?.toLowerCase().includes('derivar') ||
         criteria.rationale?.toLowerCase().includes('derivación') ||
         criteria.result?.toLowerCase().includes('derivar'))
      );
      
      return hasDerivationInSummary || hasDerivationInEvaluation;
    }).length;

    // Calcular reclamos (buscar en resúmenes y datos de evaluación)
    const complaints = conversations.filter((conv: any) => {
      const summary = conv.summary?.toLowerCase() || '';
      const evaluationData = conv.evaluation_data || {};
      
      // Buscar en resumen
      const hasComplaintInSummary = summary.includes('reclamo') || 
                                  summary.includes('queja') ||
                                  summary.includes('complaint') ||
                                  summary.includes('insatisfecho') ||
                                  summary.includes('problema') ||
                                  summary.includes('malestar');
      
      // Buscar en datos de evaluación
      const hasComplaintInEvaluation = Object.values(evaluationData).some((criteria: any) => 
        criteria && typeof criteria === 'object' && 
        (criteria.rationale?.toLowerCase().includes('reclamo') ||
         criteria.rationale?.toLowerCase().includes('queja') ||
         criteria.result?.toLowerCase().includes('reclamo'))
      );
      
      return hasComplaintInSummary || hasComplaintInEvaluation;
    }).length;

    // Calcular tiempo total
    const totalMinutes = Math.round(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const totalTime = `${totalHours}h ${remainingMinutes}m`;

    return {
      totalCalls,
      avgDuration,
      successRate,
      derivations,
      complaints,
      totalTime
    };
  };

  const realMetrics = calculateRealMetrics();

  // Datos reales para el dashboard
  const stats: Array<{
    title: string;
    value: string | number;
    icon: any;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    change: string;
    changeType: 'positive' | 'negative';
  }> = [
    {
      title: 'Total de Llamadas',
      value: realMetrics.totalCalls,
      icon: Phone,
      color: 'primary',
      change: '+0%', // Por ahora estático, se puede calcular con datos históricos
      changeType: 'positive',
    },
    {
      title: 'Duración Promedio',
      value: realMetrics.avgDuration,
      icon: Clock,
      color: 'secondary',
      change: '+0%',
      changeType: 'positive',
    },
    {
      title: 'Tasa de Éxito',
      value: `${realMetrics.successRate}%`,
      icon: TrendingUp,
      color: realMetrics.successRate >= 80 ? 'success' : realMetrics.successRate >= 60 ? 'warning' : 'danger',
      change: '+0%',
      changeType: 'positive',
    },
    {
      title: 'Derivaciones',
      value: realMetrics.derivations,
      icon: AlertTriangle,
      color: 'warning',
      change: '+0%',
      changeType: 'negative',
    },
    {
      title: 'Reclamos',
      value: realMetrics.complaints,
      icon: Users,
      color: 'danger',
      change: '+0%',
      changeType: 'positive',
    },
    {
      title: 'Tiempo Total',
      value: realMetrics.totalTime,
      icon: Activity,
      color: 'info',
      change: '+0%',
      changeType: 'positive',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Resumen de actividad del call center
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span suppressHydrationWarning>
                {mounted ? currentDate : 'Cargando...'}
              </span>
            </div>
            <button 
              onClick={() => {
                const fetchIsabelaStats = async () => {
                  try {
                    setIsabelaLoading(true);
                    const response = await fetch('/api/estadisticas-isabela');
                    if (response.ok) {
                      const data = await response.json();
                      setIsabelaStats(data);
                    }
                  } catch (error) {
                    console.error('Error fetching Isabela stats:', error);
                  } finally {
                    setIsabelaLoading(false);
                  }
                };
                fetchIsabelaStats();
              }}
              disabled={isabelaLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isabelaLoading ? 'animate-spin' : ''}`} />
              <span>{isabelaLoading ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Stats Grid - Tarjetas principales con datos reales de Isabela */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <DashboardStats 
                {...stat} 
                isRealData={!isabelaLoading && isabelaStats?.conversations?.length > 0}
              />
            </motion.div>
          ))}
        </div>

        {/* Isabela Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  📊 Estadísticas de Isabela
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Agente ElevenLabs - Resumen de llamadas y conversaciones
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Agente Activo
                </span>
                <button 
                  onClick={() => {
                    const fetchIsabelaStats = async () => {
                      try {
                        setIsabelaLoading(true);
                        const response = await fetch('/api/estadisticas-isabela');
                        if (response.ok) {
                          const data = await response.json();
                          setIsabelaStats(data);
                        }
                      } catch (error) {
                        console.error('Error fetching Isabela stats:', error);
                      } finally {
                        setIsabelaLoading(false);
                      }
                    };
                    fetchIsabelaStats();
                  }}
                  disabled={isabelaLoading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 text-gray-600 ${isabelaLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total de Llamadas */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total de Llamadas</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {isabelaLoading ? '...' : (isabelaStats?.total_calls || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tiempo Total */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600">Tiempo Total</p>
                    <p className="text-2xl font-bold text-green-900">
                      {isabelaLoading ? '...' : `${isabelaStats?.total_minutes || 0} min`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tasa de Éxito */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-600">Conversaciones</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {isabelaLoading ? '...' : (isabelaStats?.conversations?.length || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Duración Promedio */}
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cyan-600">Duración Promedio</p>
                    <p className="text-2xl font-bold text-cyan-900">
                      {isabelaLoading ? '...' : 
                        isabelaStats?.conversations?.length > 0 
                          ? `${Math.round((isabelaStats.total_minutes || 0) / isabelaStats.conversations.length)} min`
                          : '0 min'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Llamadas por Día
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Últimos 7 días de actividad
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <CallsChart data={isabelaStats?.conversations?.map((conv: any) => ({
                fecha: conv.created_at,
                cantidad: 1
              })) || []} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Pacientes de Seguimiento
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Total de pacientes en seguimiento nutricional
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <DerivationsChart data={isabelaStats?.conversations || []} />
            </div>
          </motion.div>
        </div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <PerformanceMetrics />
        </motion.div>

        {/* Recent Calls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <RecentCalls data={isabelaStats?.conversations || []} />
        </motion.div>
      </div>
    </div>
  );
} 