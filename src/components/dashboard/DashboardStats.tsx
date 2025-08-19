import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardStatsProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  change?: string;
  changeType?: 'positive' | 'negative';
  isIsabela?: boolean;
}

const colorClasses = {
  primary: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    icon: 'text-blue-600',
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-100',
  },
  secondary: {
    bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
    icon: 'text-gray-600',
    border: 'border-gray-200',
    gradient: 'from-gray-500 to-gray-600',
    shadow: 'shadow-gray-100',
  },
  success: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100',
    icon: 'text-green-600',
    border: 'border-green-200',
    gradient: 'from-green-500 to-green-600',
    shadow: 'shadow-green-100',
  },
  warning: {
    bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
    icon: 'text-yellow-600',
    border: 'border-yellow-200',
    gradient: 'from-yellow-500 to-yellow-600',
    shadow: 'shadow-yellow-100',
  },
  danger: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100',
    icon: 'text-red-600',
    border: 'border-red-200',
    gradient: 'from-red-500 to-red-600',
    shadow: 'shadow-red-100',
  },
  info: {
    bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
    icon: 'text-cyan-600',
    border: 'border-cyan-200',
    gradient: 'from-cyan-500 to-cyan-600',
    shadow: 'shadow-cyan-100',
  },
};

export default function DashboardStats({
  title,
  value,
  icon: Icon,
  color,
  change,
  changeType,
  isIsabela = false,
}: DashboardStatsProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative overflow-hidden bg-white rounded-xl border ${colors.border} 
        shadow-sm hover:shadow-lg transition-all duration-300 group
      `}
    >
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              <div className={`
                flex-shrink-0 w-12 h-12 rounded-xl ${colors.bg} 
                flex items-center justify-center shadow-sm
                group-hover:shadow-md transition-shadow duration-300
              `}>
                <Icon className={`h-6 w-6 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
          {!isIsabela && change && changeType && (
            <div className="flex flex-col items-end space-y-1">
              <div className={`
                flex items-center text-sm font-semibold
                ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}
              `}>
                {changeType === 'positive' ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                {change}
              </div>
              <div className={`
                text-xs px-2 py-1 rounded-full font-medium
                ${changeType === 'positive' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
                }
              `}>
                {changeType === 'positive' ? 'Mejorando' : 'Necesita atención'}
              </div>
            </div>
          )}
        </div>
        
        {/* Progress bar - solo mostrar si no es Isabela y hay change */}
        {!isIsabela && change && changeType && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Progreso</span>
              <span>{changeType === 'positive' ? 'Mejorando' : 'Necesita atención'}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-2 rounded-full ${
                  changeType === 'positive' ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-red-400 to-red-600'
                }`}
                initial={{ width: 0 }}
                animate={{ 
                  width: `${Math.min(100, Math.abs(parseInt(change.replace('%', ''))))}%` 
                }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
} 