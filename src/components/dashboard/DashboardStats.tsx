import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardStatsProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  change: string;
  changeType: 'positive' | 'negative';
}

const colorClasses = {
  primary: {
    bg: 'bg-primary-50',
    icon: 'text-primary-600',
    border: 'border-primary-200',
  },
  secondary: {
    bg: 'bg-secondary-50',
    icon: 'text-secondary-600',
    border: 'border-secondary-200',
  },
  success: {
    bg: 'bg-success-50',
    icon: 'text-success-600',
    border: 'border-success-200',
  },
  warning: {
    bg: 'bg-warning-50',
    icon: 'text-warning-600',
    border: 'border-warning-200',
  },
  danger: {
    bg: 'bg-danger-50',
    icon: 'text-danger-600',
    border: 'border-danger-200',
  },
  info: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'border-blue-200',
  },
};

export default function DashboardStats({
  title,
  value,
  icon: Icon,
  color,
  change,
  changeType,
}: DashboardStatsProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`stat-card border ${colors.border} hover:${colors.border.replace('200', '300')}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${colors.icon}`} />
            </div>
            <div className="ml-4 flex-1">
              <p className="stat-label">{title}</p>
              <p className="stat-value">{value}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <div className={`flex items-center text-sm font-medium ${
            changeType === 'positive' ? 'text-success-600' : 'text-danger-600'
          }`}>
            {changeType === 'positive' ? (
              <ArrowUpRight className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 mr-1" />
            )}
            {change}
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progreso</span>
          <span>{changeType === 'positive' ? 'Mejorando' : 'Necesita atención'}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              changeType === 'positive' ? 'bg-success-500' : 'bg-danger-500'
            }`}
            style={{
              width: `${Math.min(100, Math.abs(parseInt(change.replace('%', ''))))}%`,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
} 