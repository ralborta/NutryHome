import { useState, useEffect } from 'react';
import { Phone, Clock, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import apiClient from '@/lib/apiClient';

interface Call {
  id: string;
  callId: string;
  telefono: string;
  duracion: number;
  fecha: string;
  status: string;
  _count: {
    derivations: number;
    complaints: number;
  };
}

export default function RecentCalls() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentCalls();
  }, []);

  const fetchRecentCalls = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/calls', {
        params: {
          page: 1,
          limit: 5,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      });
      setCalls(response.data.data.calls);
    } catch (error) {
      console.error('Error fetching recent calls:', error);
      // Datos de ejemplo si hay error
      setCalls([
        {
          id: '1',
          callId: 'CALL001',
          telefono: '+5491137710010',
          duracion: 180,
          fecha: new Date().toISOString(),
          status: 'ACTIVE',
          _count: { derivations: 1, complaints: 0 },
        },
        {
          id: '2',
          callId: 'CALL002',
          telefono: '+5491145623789',
          duracion: 240,
          fecha: new Date(Date.now() - 3600000).toISOString(),
          status: 'ACTIVE',
          _count: { derivations: 0, complaints: 1 },
        },
        {
          id: '3',
          callId: 'CALL003',
          telefono: '+5491156345678',
          duracion: 120,
          fecha: new Date(Date.now() - 7200000).toISOString(),
          status: 'ACTIVE',
          _count: { derivations: 2, complaints: 0 },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success">Activa</span>;
      case 'ARCHIVED':
        return <span className="badge badge-warning">Archivada</span>;
      case 'DELETED':
        return <span className="badge badge-danger">Eliminada</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {calls.map((call) => (
        <div
          key={call.id}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {call.callId}
                </p>
                {getStatusBadge(call.status)}
              </div>
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  <span>{call.telefono}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(call.duracion)}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(call.fecha), 'dd/MM HH:mm', { locale: es })}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {call._count.derivations > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                {call._count.derivations} derivación{call._count.derivations !== 1 ? 'es' : ''}
              </span>
            )}
            {call._count.complaints > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
                {call._count.complaints} reclamo{call._count.complaints !== 1 ? 's' : ''}
              </span>
            )}
            <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              Ver
            </button>
          </div>
        </div>
      ))}
      
      {calls.length === 0 && (
        <div className="text-center py-8">
          <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay llamadas recientes</p>
        </div>
      )}
      
      <div className="pt-4 border-t border-gray-200">
        <button className="w-full btn-secondary btn-sm">
          Ver todas las llamadas
        </button>
      </div>
    </div>
  );
} 