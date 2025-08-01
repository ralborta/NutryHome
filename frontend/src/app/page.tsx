'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Phone, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Activity 
} from 'lucide-react';
import DashboardStats from '@/components/dashboard/DashboardStats';
import CallsChart from '@/components/dashboard/CallsChart';
import DerivationsChart from '@/components/dashboard/DerivationsChart';
import RecentCalls from '@/components/dashboard/RecentCalls';
import PerformanceMetrics from '@/components/dashboard/PerformanceMetrics';

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);

  // Datos de ejemplo para el dashboard
  const stats = [
    {
      title: 'Total de Llamadas',
      value: 1247,
      icon: Phone,
      color: 'primary' as const,
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      title: 'Duración Promedio',
      value: '4m 32s',
      icon: Clock,
      color: 'secondary' as const,
      change: '+5%',
      changeType: 'positive' as const,
    },
    {
      title: 'Tasa de Éxito',
      value: '87%',
      icon: TrendingUp,
      color: 'success' as const,
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      title: 'Derivaciones',
      value: 89,
      icon: AlertTriangle,
      color: 'warning' as const,
      change: '-3%',
      changeType: 'negative' as const,
    },
    {
      title: 'Reclamos',
      value: 23,
      icon: Users,
      color: 'danger' as const,
      change: '-15%',
      changeType: 'positive' as const,
    },
    {
      title: 'Tiempo Total',
      value: '94h 12m',
      icon: Activity,
      color: 'info' as const,
      change: '+7%',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Resumen de actividad del call center
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Llamadas por Día
            </h2>
            <CallsChart />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Razones de Derivación
            </h2>
            <DerivationsChart />
          </motion.div>
        </div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mb-8"
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