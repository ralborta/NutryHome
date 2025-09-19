import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateSafe, createDateSafe } from '@/lib/dateUtils';

interface CallsChartProps {
  data?: Array<{
    fecha: string;
    cantidad: number;
  }>;
}

export default function CallsChart({ data = [] }: CallsChartProps) {
  // Agrupar datos por día
  const groupedData: { [key: string]: number } = {};
  
  data.forEach(item => {
    const safeDate = createDateSafe(item.fecha);
    if (safeDate) {
      const dayKey = format(safeDate, 'yyyy-MM-dd');
      groupedData[dayKey] = (groupedData[dayKey] || 0) + item.cantidad;
    }
  });

  // Convertir a array y formatear
  const chartData = Object.entries(groupedData).map(([dateKey, cantidad]) => {
    const date = new Date(dateKey);
    return {
      fecha: format(date, 'dd/MM', { locale: es }),
      llamadas: cantidad,
      originalDate: dateKey,
    };
  }).sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());

  // Si no hay datos, mostrar datos de ejemplo
  if (chartData.length === 0) {
    const exampleData = [];
    for (let i = 6; i >= 0; i--) {
      const baseDate = new Date();
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      exampleData.push({
        fecha: format(date, 'dd/MM', { locale: es }),
        llamadas: Math.floor(Math.random() * 10) + 1,
        originalDate: date.toISOString(),
      });
    }
    chartData.push(...exampleData);
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="colorLlamadas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="fecha" 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#374151', fontWeight: '600' }}
            formatter={(value: any, name: any) => [
              `${value} llamadas`,
              'Cantidad'
            ]}
            labelFormatter={(label) => `Fecha: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="llamadas"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorLlamadas)"
            fillOpacity={1}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Estadísticas adicionales */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-primary-600">
            {chartData.reduce((sum, item) => sum + item.llamadas, 0)}
          </p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-success-600">
            {Math.round(chartData.reduce((sum, item) => sum + item.llamadas, 0) / chartData.length)}
          </p>
          <p className="text-xs text-gray-500">Promedio</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-warning-600">
            {Math.max(...chartData.map(item => item.llamadas))}
          </p>
          <p className="text-xs text-gray-500">Máximo</p>
        </div>
      </div>
    </div>
  );
} 