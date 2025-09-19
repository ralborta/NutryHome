import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface DerivationsChartProps {
  data?: Array<{
    summary?: string;
    variables?: any;
    [key: string]: any;
  }>;
}

export default function DerivationsChart({ data = [] }: DerivationsChartProps) {
  // Procesar datos reales para derivaciones
  const processDerivationsData = () => {
    const derivations: { [key: string]: number } = {};
    
    data.forEach(conv => {
      // Extraer motivo de derivación del summary
      const summary = conv.summary || '';
      let motivo = 'Consulta General';
      
      if (summary.toLowerCase().includes('nutrición') || summary.toLowerCase().includes('aliment')) {
        motivo = 'Consulta Nutricional';
      } else if (summary.toLowerCase().includes('cita') || summary.toLowerCase().includes('turno')) {
        motivo = 'Solicitud de Cita';
      } else if (summary.toLowerCase().includes('precio') || summary.toLowerCase().includes('costo')) {
        motivo = 'Consulta de Precios';
      } else if (summary.toLowerCase().includes('información') || summary.toLowerCase().includes('info')) {
        motivo = 'Información General';
      } else if (summary.toLowerCase().includes('reclamo') || summary.toLowerCase().includes('queja')) {
        motivo = 'Reclamo';
      } else if (summary.toLowerCase().includes('soporte') || summary.toLowerCase().includes('ayuda')) {
        motivo = 'Soporte Técnico';
      }
      
      derivations[motivo] = (derivations[motivo] || 0) + 1;
    });

    // Convertir a array y ordenar
    const derivationsArray = Object.entries(derivations)
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6

    return derivationsArray;
  };

  const derivationsData = processDerivationsData();
  const barData = derivationsData.map(item => ({
    motivo: item.name,
    cantidad: item.value,
    porcentaje: Math.round((item.value / derivationsData.reduce((sum, i) => sum + i.value, 0)) * 100)
  }));
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