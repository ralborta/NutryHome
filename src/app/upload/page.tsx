'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  X,
  Download,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface UploadResult {
  success: boolean;
  message: string;
  totalCalls?: number;
  errors?: string[];
  campaignId?: string;
  batchId?: string;
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para manejar el drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.xlsx')
    );
    
    if (excelFile) {
      setSelectedFile(excelFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona un archivo Excel');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Conectar con el backend real
      const response = await fetch('https://nutryhome-production.up.railway.app/api/campaigns/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message || 'Archivo procesado correctamente',
          totalCalls: result.totalCalls || 0,
          errors: result.errors || [],
          batchId: result.batchId
        });
        
        // Limpiar archivo seleccionado
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadResult({
          success: false,
          message: result.error || 'Error al procesar el archivo'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setUploadResult({
        success: false,
        message: 'Error de conexión con el servidor'
      });
    } finally {
      setUploading(false);
    }
  };



  const downloadTemplate = () => {
    // Crear un enlace temporal para descargar el template
    const link = document.createElement('a');
    link.href = '/templates/nutryhome-template.xlsx';
    link.download = 'nutryhome-template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Carga de Llamadas
          </h1>
          <p className="text-gray-600">
            Sube archivos Excel con datos de contactos para crear campañas outbound
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel de Carga */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Subir Archivo Excel
              </h2>

              {/* Área de Drag & Drop */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                  }
                  ${selectedFile ? 'border-green-500 bg-green-50' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-4">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Arrastra tu archivo Excel aquí
                      </p>
                      <p className="text-sm text-gray-500">
                        o haz clic para seleccionar
                      </p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Seleccionar Archivo
                    </button>
                  </div>
                )}
              </div>

              {/* Información del archivo */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  📋 Formato Requerido
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Archivo Excel (.xlsx) con las columnas exactas del template</p>
                  <p>• phone_number debe ser texto (ejemplo: 5491137710010)</p>
                  <p>• Los nombres de columnas son obligatorios y exactos</p>
                  <p>• Descarga el template para ver el formato correcto</p>
                </div>
              </div>

              {/* Botón de Subida */}
              <div className="mt-6">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className={`
                    w-full py-3 px-6 rounded-lg font-medium transition-colors
                    ${uploading || !selectedFile
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  {uploading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    'Procesar Archivo'
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Panel de Información */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Información del Formato */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Formato Requerido
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                  <span>Archivo Excel (.xlsx)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Columnas específicas requeridas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span>Máximo 10MB por archivo</span>
                </div>
              </div>
              
              <button
                onClick={downloadTemplate}
                className="mt-4 w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Template</span>
              </button>
            </div>

            {/* Resultado de la Subida */}
            {uploadResult && (
              <div className={`bg-white rounded-xl shadow-lg p-6 ${
                uploadResult.success ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
              }`}>
                <div className="flex items-center space-x-2 mb-3">
                  {uploadResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <h3 className="font-semibold text-gray-900">
                    {uploadResult.success ? 'Subida Exitosa' : 'Error en la Subida'}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {uploadResult.message}
                </p>

                {uploadResult.success && uploadResult.totalCalls && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>{uploadResult.totalCalls}</strong> contactos procesados
                    </p>
                  </div>
                )}

                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded-lg mt-3">
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>{uploadResult.errors.length}</strong> errores encontrados:
                    </p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      {uploadResult.errors.slice(0, 3).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {uploadResult.errors.length > 3 && (
                        <li>• ... y {uploadResult.errors.length - 3} más</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
} 