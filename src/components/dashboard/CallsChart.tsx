import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CallsChartProps {
  data?: Array<{
    fecha: string;
    cantidad: number;
  }>;
}

export default function CallsChart({ data = [] }: CallsChartProps) {
  // Formatear datos para el gráfico
  const chartData = data.map(item => ({
    fecha: format(new Date(item.fecha), 'dd/MM', { locale: es }),
    llamadas: item.cantidad,
    originalDate: item.fecha,
  }));

  // Si no hay datos, mostrar datos de ejemplo
  if (chartData.length === 0) {
    const today = new Date();
    const exampleData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      exampleData.push({
        fecha: format(date, 'dd/MM', { locale: es }),
        llamadas: Math.floor(Math.random() * 50) + 10,
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