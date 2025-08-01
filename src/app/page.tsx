'use client';

import { useState } from 'react';
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
              <span>
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
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
              <CallsChart />
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
              <DerivationsChart />
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
          <RecentCalls />
        </motion.div>
      </div>
    </div>
  );
} 