import { useState, useEffect } from 'react';
import { Phone, Clock, User, MessageSquare } from 'lucide-react';
import DashboardStats from './DashboardStats';

interface Conversation {
  agent_id?: string;
  agent_name?: string;
  conversation_id?: string;
  start_time_unix_secs?: number;
  call_duration_secs?: number;
  message_count?: number;
  status?: string;
  call_successful?: string;
  summary?: string;
  telefono_destino?: string;
  nombre_paciente?: string;
  producto?: string;
}

interface StatsData {
  total_calls: number;
  total_minutes: number;
  conversations: Conversation[];
}

export default function IsabelaStats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/estadisticas-isabela');
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const statsData = await response.json();
        setData(statsData);
      } catch (err) {
        console.error('Error fetching Isabela stats:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="col-span-full">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-700 mb-2">Error al cargar estadísticas</h3>
            <p className="text-red-600 text-sm">{error || 'No hay datos disponibles'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Calcular estadísticas adicionales
  const successfulCalls = data.conversations.filter(c => c.call_successful === 'true').length;
  const successRate = data.total_calls > 0 ? Math.round((successfulCalls / data.total_calls) * 100) : 0;
  const avgDuration = data.total_calls > 0 ? Math.round(data.total_minutes / data.total_calls) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total de Llamadas */}
      <DashboardStats
        title="Total de Llamadas"
        value={data.total_calls}
        icon={Phone}
        color="primary"
        isIsabela={true}
      />

      {/* Tiempo Total */}
      <DashboardStats
        title="Tiempo Total"
        value={`${data.total_minutes} min`}
        icon={Clock}
        color="success"
        isIsabela={true}
      />

      {/* Tasa de Éxito */}
      <DashboardStats
        title="Tasa de Éxito"
        value={`${successRate}%`}
        icon={User}
        color={successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'danger'}
        isIsabela={true}
      />

      {/* Duración Promedio */}
      <DashboardStats
        title="Duración Promedio"
        value={`${avgDuration} min`}
        icon={MessageSquare}
        color="info"
        isIsabela={true}
      />
    </div>
  );
}
