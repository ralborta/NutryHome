# Guía de Integración Frontend - Flujo Pull-Only Optimizado

## 🎯 **Arquitectura Recomendada: Opción A - Simple y Estable**

### **¿Por qué esta opción?**

✅ **Sin errores 401** - Las llamadas nunca fallan por autenticación  
✅ **Más estable** - No depende de webhooks en tiempo real  
✅ **Más simple** - Solo API calls para sincronizar  
✅ **Mejor UX** - El usuario no ve errores durante la llamada  

## 🔄 **Flujo de Trabajo Optimizado**

### **1. Ejecutar Batch**
```typescript
// POST /api/campaigns/batch/:batchId/execute
const executeBatch = async (batchId: string) => {
  try {
    const response = await fetch(`/api/campaigns/batch/${batchId}/execute`, {
      method: 'POST'
    });
    
    if (response.ok) {
      // Batch iniciado exitosamente
      setBatchStatus('PROCESSING');
      // Iniciar polling de estado
      startStatusPolling(batchId);
    }
  } catch (error) {
    console.error('Error ejecutando batch:', error);
  }
};
```

### **2. Polling de Estado (Opcional)**
```typescript
const startStatusPolling = (batchId: string) => {
  const interval = setInterval(async () => {
    const status = await getBatchStatus(batchId);
    
    if (status === 'COMPLETED' || status === 'FAILED') {
      clearInterval(interval);
      // Hacer sync final
      await syncBatch(batchId);
    }
  }, 10000); // Cada 10 segundos
  
  // Limpiar después de 5 minutos
  setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
};
```

### **3. Sincronización Manual (Recomendado)**
```typescript
// GET /api/campaigns/batch/:batchId/sync
const syncBatch = async (batchId: string) => {
  try {
    const response = await fetch(`/api/campaigns/batch/${batchId}/sync`);
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Sincronización completada:', data.summary);
      // Refrescar datos del batch
      await refreshBatchData(batchId);
    }
  } catch (error) {
    console.error('Error sincronizando batch:', error);
  }
};
```

### **4. Leer Datos desde DB**
```typescript
// GET /api/campaigns/batch/:batchId/calls
const getBatchCalls = async (batchId: string) => {
  try {
    const response = await fetch(`/api/campaigns/batch/${batchId}/calls`);
    const data = await response.json();
    
    if (data.success) {
      return {
        batch: data.batch,
        calls: data.calls,
        total: data.total
      };
    }
  } catch (error) {
    console.error('Error obteniendo llamadas:', error);
  }
};
```

## 🎨 **Componentes de UI Recomendados**

### **1. Botón de Sincronización**
```tsx
const SyncButton = ({ batchId, onSync }: { batchId: string, onSync: () => void }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncBatch(batchId);
      onSync(); // Callback para refrescar datos
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <button 
      onClick={handleSync} 
      disabled={isSyncing}
      className="btn btn-primary"
    >
      {isSyncing ? '🔄 Sincronizando...' : '🔄 Sincronizar'}
    </button>
  );
};
```

### **2. Indicador de Estado del Batch**
```tsx
const BatchStatusIndicator = ({ status, lastSynced }: { status: string, lastSynced?: string }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600';
      case 'PROCESSING': return 'text-blue-600';
      case 'FAILED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className={`font-medium ${getStatusColor(status)}`}>
        {status}
      </span>
      {lastSynced && (
        <span className="text-sm text-gray-500">
          Última sync: {new Date(lastSynced).toLocaleString()}
        </span>
      )}
    </div>
  );
};
```

### **3. Tabla de Llamadas con Estados**
```tsx
const CallsTable = ({ calls }: { calls: OutboundCall[] }) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'COMPLETED': { color: 'bg-green-100 text-green-800', label: '✅ Completada' },
      'IN_PROGRESS': { color: 'bg-blue-100 text-blue-800', label: '🔄 En Progreso' },
      'FAILED': { color: 'bg-red-100 text-red-800', label: '❌ Fallida' },
      'SCHEDULED': { color: 'bg-yellow-100 text-yellow-800', label: '⏰ Programada' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };
  
  return (
    <table className="min-w-full">
      <thead>
        <tr>
          <th>Teléfono</th>
          <th>Estado</th>
          <th>Duración</th>
          <th>Resultado</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {calls.map((call) => (
          <tr key={call.id}>
            <td>{call.telefono}</td>
            <td>{getStatusBadge(call.estado)}</td>
            <td>{call.duracion ? `${call.duracion}s` : '-'}</td>
            <td>{call.resultado || '-'}</td>
            <td>{call.fechaEjecutada ? new Date(call.fechaEjecutada).toLocaleString() : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

## 🔄 **Patrón de Uso Recomendado**

### **1. En la Página del Batch**
```tsx
const BatchPage = ({ batchId }: { batchId: string }) => {
  const [batchData, setBatchData] = useState(null);
  const [calls, setCalls] = useState([]);
  
  // Cargar datos iniciales
  useEffect(() => {
    loadBatchData();
  }, [batchId]);
  
  const loadBatchData = async () => {
    const data = await getBatchCalls(batchId);
    if (data) {
      setBatchData(data.batch);
      setCalls(data.calls);
    }
  };
  
  const handleSync = async () => {
    await syncBatch(batchId);
    await loadBatchData(); // Refrescar datos
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>Batch: {batchData?.nombre}</h1>
        <SyncButton batchId={batchId} onSync={handleSync} />
      </div>
      
      <BatchStatusIndicator 
        status={batchData?.estado} 
        lastSynced={batchData?.lastSyncedAt} 
      />
      
      <CallsTable calls={calls} />
    </div>
  );
};
```

### **2. En el Dashboard Principal**
```tsx
const Dashboard = () => {
  const [batches, setBatches] = useState([]);
  
  const refreshBatches = async () => {
    // Hacer sync de todos los batches activos
    const activeBatches = batches.filter(b => b.estado === 'PROCESSING');
    
    for (const batch of activeBatches) {
      try {
        await syncBatch(batch.id);
      } catch (error) {
        console.error(`Error sync batch ${batch.id}:`, error);
      }
    }
    
    // Refrescar lista de batches
    await loadBatches();
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>Dashboard</h1>
        <button onClick={refreshBatches} className="btn btn-secondary">
          🔄 Sincronizar Todos
        </button>
      </div>
      
      {/* Lista de batches */}
    </div>
  );
};
```

## 📱 **Responsive y UX**

### **1. Loading States**
```tsx
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2">Cargando...</span>
  </div>
);
```

### **2. Error Handling**
```tsx
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <div className="text-center p-8">
        <h3 className="text-red-600 mb-4">Algo salió mal</h3>
        <button 
          onClick={() => window.location.reload()} 
          className="btn btn-primary"
        >
          Recargar Página
        </button>
      </div>
    );
  }
  
  return children;
};
```

## 🚀 **Ventajas de esta Implementación**

1. **✅ Sin errores 401** - UX perfecta
2. **✅ Datos siempre actualizados** - Sync manual cuando necesites
3. **✅ Performance optimizada** - Solo API calls necesarias
4. **✅ Fácil debugging** - Logs claros en Railway
5. **✅ Escalable** - Funciona con miles de llamadas
6. **✅ Mantenible** - Código simple y claro

## 🔧 **Configuración en ElevenLabs**

**IMPORTANTE:** Desactiva todos los **Tools en vivo** en tu agente:
- ❌ Webhook/API Tool
- ❌ Create record
- ❌ Cualquier Tool que haga llamadas HTTP durante la llamada

**Mantén activo solo:**
- ✅ Post-call webhook (opcional, para logging)

¡Con esta implementación tendrás un sistema robusto y sin errores! 🎉
