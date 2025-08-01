'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  BarChart3,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import DashboardStats from '@/components/dashboard/DashboardStats';
import CallsChart from '@/components/dashboard/CallsChart';
import DerivationsChart from '@/components/dashboard/DerivationsChart';
import RecentCalls from '@/components/dashboard/RecentCalls';
import PerformanceMetrics from '@/components/dashboard/PerformanceMetrics';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/lib/apiClient';

interface DashboardData {
  overview: {
    totalCalls: number;
    totalDuration: string;
    avgDuration: string;
    totalDerivations: number;
    totalComplaints: number;
    successRate: number;
    successfulCalls: number;
  };
  byDay: Array<{
    fecha: string;
    cantidad: number;
  }>;
  byStatus: {
    ACTIVE: number;
    ARCHIVED: number;
    DELETED: number;
  };
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    desde: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    hasta: new Date().toISOString(),
  });
  const { user } = useAuthStore();

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/stats/overview', {
        params: dateRange,
      });
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: 'Total de Llamadas',
      value: dashboardData?.overview.totalCalls || 0,
      icon: Phone,
      color: 'primary',
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      title: 'Duración Promedio',
      value: dashboardData?.overview.avgDuration || '0m 0s',
      icon: Clock,
      color: 'secondary',
      change: '+5%',
      changeType: 'positive' as const,
    },
    {
      title: 'Tasa de Éxito',
      value: `${dashboardData?.overview.successRate || 0}%`,
      icon: TrendingUp,
      color: 'success',
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      title: 'Derivaciones',
      value: dashboardData?.overview.totalDerivations || 0,
      icon: AlertTriangle,
      color: 'warning',
      change: '-3%',
      changeType: 'negative' as const,
    },
    {
      title: 'Reclamos',
      value: dashboardData?.overview.totalComplaints || 0,
      icon: Users,
      color: 'danger',
      change: '-15%',
      changeType: 'positive' as const,
    },
    {
      title: 'Tiempo Total',
      value: dashboardData?.overview.totalDuration || '0h 0m',
      icon: Activity,
      color: 'info',
      change: '+18%',
      changeType: 'positive' as const,
    },
  ];

  if (loading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center min-h-screen">
          <div className="loading-spinner"></div>
          <span className="ml-2 text-gray-600">Cargando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard
              </h1>
              <p className="text-gray-600">
                Bienvenido de vuelta, {user?.nombre} {user?.apellido}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(dateRange.desde).toLocaleDateString('es-ES')} - {new Date(dateRange.hasta).toLocaleDateString('es-ES')}
                </span>
              </div>
              <button
                onClick={fetchDashboardData}
                className="btn-primary btn-sm"
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
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
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calls Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                Llamadas por Día
              </h3>
              <p className="text-sm text-gray-500">
                Últimos 7 días
              </p>
            </div>
            <div className="card-body">
              <CallsChart data={dashboardData?.byDay || []} />
            </div>
          </motion.div>

          {/* Derivations Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                Top Derivaciones
              </h3>
              <p className="text-sm text-gray-500">
                Motivos más frecuentes
              </p>
            </div>
            <div className="card-body">
              <DerivationsChart />
            </div>
          </motion.div>
        </div>

        {/* Performance and Recent Calls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                Métricas de Rendimiento
              </h3>
            </div>
            <div className="card-body">
              <PerformanceMetrics />
            </div>
          </motion.div>

          {/* Recent Calls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                Llamadas Recientes
              </h3>
              <p className="text-sm text-gray-500">
                Últimas 5 llamadas
              </p>
            </div>
            <div className="card-body">
              <RecentCalls />
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Acciones Rápidas
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200">
                <Phone className="h-8 w-8 text-primary-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Nueva Llamada</span>
              </button>
              <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-success-300 hover:bg-success-50 transition-colors duration-200">
                <BarChart3 className="h-8 w-8 text-success-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Generar Reporte</span>
              </button>
              <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-warning-300 hover:bg-warning-50 transition-colors duration-200">
                <AlertTriangle className="h-8 w-8 text-warning-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Ver Derivaciones</span>
              </button>
              <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-danger-300 hover:bg-danger-50 transition-colors duration-200">
                <Users className="h-8 w-8 text-danger-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Gestionar Reclamos</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 