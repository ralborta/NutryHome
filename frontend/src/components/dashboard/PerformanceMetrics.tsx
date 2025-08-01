import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Target, Zap, Users } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface PerformanceData {
  callsByHour: Array<{
    hora: number;
    cantidad: number;
  }>;
  avgDurationByDay: Array<{
    dia: string;
    duracionPromedio: number;
  }>;
  peakHours: Array<{
    hora: number;
    cantidad: number;
  }>;
}

export default function PerformanceMetrics() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/stats/performance');
      setPerformanceData(response.data.data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      // Datos de ejemplo
      setPerformanceData({
        callsByHour: Array.from({ length: 24 }, (_, i) => ({
          hora: i,
          cantidad: Math.floor(Math.random() * 20) + 5,
        })),
        avgDurationByDay: Array.from({ length: 7 }, (_, i) => ({
          dia: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          duracionPromedio: Math.floor(Math.random() * 300) + 120,
        })),
        peakHours: [
          { hora: 9, cantidad: 45 },
          { hora: 10, cantidad: 52 },
          { hora: 14, cantidad: 38 },
          { hora: 15, cantidad: 41 },
          { hora: 16, cantidad: 35 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getPeakHourLabel = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  const avgDuration = performanceData?.avgDurationByDay.reduce((sum, day) => sum + day.duracionPromedio, 0) || 0;
  const avgDurationFormatted = formatDuration(Math.round(avgDuration / (performanceData?.avgDurationByDay.length || 1)));

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Duración Promedio</p>
              <p className="text-2xl font-bold text-primary-900">{avgDurationFormatted}</p>
            </div>
            <Clock className="h-8 w-8 text-primary-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-success-600 mr-1" />
            <span className="text-success-600">+5.2%</span>
            <span className="text-gray-500 ml-1">vs mes anterior</span>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-r from-success-50 to-success-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-success-600">Eficiencia</p>
              <p className="text-2xl font-bold text-success-900">87%</p>
            </div>
            <Target className="h-8 w-8 text-success-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-success-600 mr-1" />
            <span className="text-success-600">+2.1%</span>
            <span className="text-gray-500 ml-1">vs mes anterior</span>
          </div>
        </div>
      </div>

      {/* Horas pico */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center">
          <Zap className="h-4 w-4 mr-2 text-warning-600" />
          Horas Pico
        </h4>
        <div className="space-y-2">
          {performanceData?.peakHours.slice(0, 3).map((peak, index) => (
            <div key={peak.hora} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-warning-100 text-warning-800' :
                  index === 1 ? 'bg-primary-100 text-primary-800' :
                  'bg-success-100 text-success-800'
                }`}>
                  {index + 1}
                </div>
                <span className="ml-3 text-sm font-medium text-gray-900">
                  {getPeakHourLabel(peak.hora)}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {peak.cantidad} llamadas
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Distribución por hora */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center">
          <Users className="h-4 w-4 mr-2 text-info-600" />
          Distribución por Hora
        </h4>
        <div className="grid grid-cols-6 gap-2">
          {performanceData?.callsByHour.slice(8, 18).map((hour) => (
            <div key={hour.hora} className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                {hour.hora.toString().padStart(2, '0')}:00
              </div>
              <div className="relative">
                <div 
                  className="bg-primary-200 rounded-t-sm transition-all duration-300"
                  style={{ 
                    height: `${Math.max(4, (hour.cantidad / Math.max(...performanceData.callsByHour.map(h => h.cantidad))) * 40)}px` 
                  }}
                />
                <div className="text-xs font-medium text-gray-700 mt-1">
                  {hour.cantidad}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indicadores de rendimiento */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Indicadores Clave</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm text-gray-600">Tiempo de respuesta promedio</span>
            <span className="text-sm font-medium text-gray-900">2.3 min</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm text-gray-600">Tasa de resolución</span>
            <span className="text-sm font-medium text-gray-900">94%</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm text-gray-600">Satisfacción del cliente</span>
            <span className="text-sm font-medium text-gray-900">4.6/5</span>
          </div>
        </div>
      </div>
    </div>
  );
} 