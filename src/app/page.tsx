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

  // Datos de ejemplo para el dashboard
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
      value: 1247,
      icon: Phone,
      color: 'primary',
      change: '+12%',
      changeType: 'positive',
    },
    {
      title: 'Duración Promedio',
      value: '4m 32s',
      icon: Clock,
      color: 'secondary',
      change: '+5%',
      changeType: 'positive',
    },
    {
      title: 'Tasa de Éxito',
      value: '87%',
      icon: TrendingUp,
      color: 'success',
      change: '+8%',
      changeType: 'positive',
    },
    {
      title: 'Derivaciones',
      value: 89,
      icon: AlertTriangle,
      color: 'warning',
      change: '-3%',
      changeType: 'negative',
    },
    {
      title: 'Reclamos',
      value: 23,
      icon: Users,
      color: 'danger',
      change: '-15%',
      changeType: 'positive',
    },
    {
      title: 'Tiempo Total',
      value: '94h 12m',
      icon: Activity,
      color: 'info',
      change: '+7%',
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
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <RefreshCw className="h-4 w-4" />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <DashboardStats {...stat} />
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
                    Razones de Derivación
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Top 5 motivos de derivación
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