import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Datos de ejemplo para derivaciones
const derivationsData = [
  { name: 'Consulta Técnica', value: 45, color: '#3b82f6' },
  { name: 'Facturación', value: 32, color: '#10b981' },
  { name: 'Soporte', value: 28, color: '#f59e0b' },
  { name: 'Reclamo', value: 22, color: '#ef4444' },
  { name: 'Información', value: 18, color: '#8b5cf6' },
  { name: 'Otros', value: 15, color: '#06b6d4' },
];

const barData = [
  { motivo: 'Consulta Técnica', cantidad: 45, porcentaje: 28 },
  { motivo: 'Facturación', cantidad: 32, porcentaje: 20 },
  { motivo: 'Soporte', cantidad: 28, porcentaje: 18 },
  { motivo: 'Reclamo', cantidad: 22, porcentaje: 14 },
  { motivo: 'Información', cantidad: 18, porcentaje: 11 },
];

export default function DerivationsChart() {
  return (
    <div className="space-y-6">
      {/* Gráfico de barras */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="motivo" 
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: any, name: any) => [
                `${value} derivaciones`,
                'Cantidad'
              ]}
            />
            <Bar 
              dataKey="cantidad" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico circular */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={derivationsData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              {derivationsData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: any, name: any) => [
                `${value} derivaciones`,
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Resumen de derivaciones */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-primary-50 rounded-lg">
          <p className="text-2xl font-bold text-primary-600">
            {derivationsData.reduce((sum, item) => sum + item.value, 0)}
          </p>
          <p className="text-sm text-gray-600">Total Derivaciones</p>
        </div>
        <div className="text-center p-3 bg-warning-50 rounded-lg">
          <p className="text-2xl font-bold text-warning-600">
            {Math.max(...derivationsData.map(item => item.value))}
          </p>
          <p className="text-sm text-gray-600">Máximo por Motivo</p>
        </div>
      </div>

      {/* Lista de motivos */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Distribución por Motivo</h4>
        {derivationsData.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-600">{item.name}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {item.value} ({((item.value / derivationsData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 