'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Upload,
  ArrowLeft,
  History,
  HelpCircle,
  Database,
  Check,
  Clock,
  Shield,
  Phone,
  Download,
  ArrowRight,
  Lock,
  ListChecks,
  FileSpreadsheet,
  Columns,
  HardDriveUpload,
  Lightbulb,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  IllustrationClipboardTarget,
  IllustrationFolderExcel,
  IllustrationMiniExcelBadge,
  IllustrationShieldCheck,
  IllustrationTargetArrow,
} from '@/components/upload/UploadPageIllustrations';
import * as XLSX from 'xlsx';

interface UploadResult {
  success: boolean;
  message: string;
  totalCalls?: number;
  errors?: string[];
  batchId?: string;
}

const MAX_MB = 10;

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [batchName, setBatchName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gradientBtn =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-900/15 transition hover:from-violet-500 hover:to-purple-600 disabled:opacity-50';

  const validateFile = (file: File) => {
    const okExt = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!okExt) {
      toast.error('El archivo debe ser Excel (.xlsx o .xls)');
      return false;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Archivo muy grande — máximo ${MAX_MB}MB`);
      return false;
    }
    return true;
  };

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
    const excel = files.find(
      (f) =>
        f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || f.name.endsWith('.xlsx'),
    );
    if (excel && validateFile(excel)) setSelectedFile(excel);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Seleccioná un archivo Excel');
      return;
    }
    if (!batchName.trim()) {
      toast.error('Ingresá el nombre del batch');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('batchName', batchName.trim());

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://nutryhome-production.up.railway.app'}/api/campaigns/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (response.ok) {
        const result = await response.json();
        setUploadResult({
          success: true,
          message: result.message || 'Archivo procesado correctamente',
          totalCalls: result.totalCalls || 0,
          errors: result.errors || [],
          batchId: result.batchId,
        });
      } else {
        await simulateUpload(selectedFile);
      }

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      await simulateUpload(selectedFile);
    } finally {
      setUploading(false);
    }
  };

  const simulateUpload = async (file: File) => {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName ?? ''];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const contacts = jsonData.filter((row: any) => {
        const phone = row.telefono || row.phone_number;
        return phone && String(phone).trim() !== '';
      });
      setUploadResult({
        success: true,
        message: `Archivo procesado (modo prueba) — ${contacts.length} contactos`,
        totalCalls: contacts.length,
        errors: [],
        batchId: `test-${Date.now()}`,
      });
      toast.success('Procesamiento de prueba completo');
    } catch {
      setUploadResult({ success: false, message: 'Error al leer el Excel' });
      toast.error('No se pudo leer el archivo');
    }
  };

  const downloadTemplate = () => {
    try {
      const ws = XLSX.utils.aoa_to_sheet([
        ['phone_number', 'nombre', 'apellido', 'ciudad'],
        ['+5491137710010', 'Juan', 'Pérez', 'Buenos Aires'],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
      XLSX.writeFile(wb, 'nutryhome-template.xlsx');
      toast.success('Template descargado');
    } catch {
      toast.error('No se pudo generar el template');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb] pb-14 pt-6">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-1 items-start gap-4">
            <Link
              href="/calls/campanas"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex min-w-0 items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-purple-900/25">
                <Upload className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-[#1e2748] lg:text-[1.85rem]">Carga de Llamadas</h1>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 lg:text-[15px]">
                  Sube archivos Excel con datos de contactos para crear campañas outbound
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/calls/campanas"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <History className="h-4 w-4 text-violet-600" />
              Historial de cargas
            </Link>
            <button
              type="button"
              onClick={() => toast('Aquí puedes cargar batches Excel con phone_number (+54…) y datos de contacto.', {
                duration: 5000,
                icon: '❔',
              })}
              className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-violet-600"
              aria-label="Ayuda"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Columna principal */}
          <div className="space-y-6 lg:col-span-8">
            <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)] lg:p-8">
              <div className="mb-8 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-purple-900/20">
                  <Database className="h-5 w-5" strokeWidth={2} />
                </div>
                <h2 className="text-lg font-bold text-[#1e2748]">Nuevo Batch de Contactos</h2>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre del Batch</label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Ej: Verificación Stock Domicilio - Enero 2025"
                maxLength={100}
                className="mt-2 w-full rounded-xl border-2 border-violet-400/55 bg-white px-4 py-3 text-[15px] font-medium text-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none ring-violet-200 transition placeholder:text-slate-400 focus:border-violet-600 focus:ring-4"
              />
              <p className="mt-2 text-[13px] text-slate-500">
                Ingresa un nombre descriptivo para identificar este grupo de contactos
              </p>

              <div
                className={[
                  'relative mt-8 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition',
                  selectedFile ? 'border-emerald-400 bg-emerald-50/60' : isDragging ? 'border-sky-500 bg-sky-50/80' : 'border-sky-200/90 bg-gradient-to-b from-sky-50/40 to-white',
                ].join(' ')}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
                {!selectedFile ? (
                  <>
                    <div className="mx-auto mb-5 flex max-w-[200px] justify-center">
                      <IllustrationFolderExcel className="h-36 w-auto" />
                    </div>
                    <p className="text-base font-semibold text-[#1e2748]">Arrastra tu archivo Excel aquí o haz clic para seleccionar</p>
                    <button type="button" className={`mt-6 ${gradientBtn}`} onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4" strokeWidth={2.5} />
                      Seleccionar Archivo
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
                    <p className="font-semibold text-[#1e2748]">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button type="button" className="text-sm font-semibold text-violet-600 underline" onClick={() => setSelectedFile(null)}>
                      Elegir otro archivo
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  <Check className="h-3.5 w-3.5" />
                  Formato Excel (.xlsx)
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
                  <Clock className="h-3.5 w-3.5" />
                  Máximo {MAX_MB}MB por archivo
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900">
                  <Shield className="h-3.5 w-3.5" />
                  Validación automática
                </span>
              </div>

              <div className="mt-8 grid gap-5 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 to-blue-50/50 p-5 md:grid-cols-[1fr,min(160px,32%)] md:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-900">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-sky-600 text-[10px] text-white">
                      i
                    </span>
                    Formato requerido
                  </div>
                  <ul className="space-y-2 text-[13px] leading-relaxed text-sky-950/85">
                    <li>Archivo Excel <strong>.xlsx</strong> con las columnas del template oficial.</li>
                    <li>
                      <strong>phone_number</strong> con prefijo +54 (ej. +5491137710010).
                    </li>
                    <li>Los encabezados deben coincidir exactamente con el template descargable.</li>
                  </ul>
                </div>
                <div className="flex justify-center md:justify-end">
                  <IllustrationClipboardTarget className="h-36 w-auto max-w-[140px]" />
                </div>
              </div>

              <div className="mt-5 grid gap-5 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-5 md:grid-cols-[1fr,min(140px,30%)] md:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-900">
                    <Phone className="h-5 w-5 text-emerald-600" />
                    Formato de números de teléfono
                  </div>
                  <p className="text-[13px] font-semibold text-emerald-900">+54XXXXXXXXXX (13 dígitos totales)</p>
                  <div className="mt-3 grid gap-1 text-xs text-emerald-800 sm:grid-cols-2">
                    <span>• +5491137710010 (Buenos Aires)</span>
                    <span>• +5491145623789</span>
                    <span>• +5493511234567 (Córdoba)</span>
                    <span>• +5493411234567 (Rosario)</span>
                  </div>
                  <p className="mt-4 text-[12px] font-medium italic text-emerald-800">
                    Importante: NutriHome requiere este formato exacto para procesar llamadas sin errores.
                  </p>
                </div>
                <div className="flex justify-center md:justify-end">
                  <IllustrationShieldCheck className="h-32 w-auto max-w-[120px]" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className={`${gradientBtn} mt-8 w-full py-3 text-[15px] font-bold shadow-lg shadow-purple-900/25`}
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" /> Procesando…
                  </>
                ) : (
                  <>
                    Procesar archivo <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </>
                )}
              </button>
              <p className="mt-4 flex items-center justify-center gap-2 text-center text-[12px] text-slate-500">
                <Lock className="h-3.5 w-3.5 text-violet-500" />
                Tus datos están seguros y encriptados en tránsito hacia NutriHome
              </p>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:col-span-4">
            <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
              <h3 className="font-bold text-[#1e2748]">Formato requerido</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-violet-600" />
                  Archivo Excel (.xlsx)
                </li>
                <li className="flex items-center gap-2">
                  <Columns className="h-4 w-4 shrink-0 text-violet-600" />
                  Columnas específicas
                </li>
                <li className="flex items-center gap-2">
                  <HardDriveUpload className="h-4 w-4 shrink-0 text-amber-500" />
                  Máximo {MAX_MB}MB
                </li>
              </ul>
              <button type="button" className="mt-5 w-full rounded-xl border border-violet-300 bg-violet-50 py-3 text-sm font-bold text-violet-800 shadow-sm transition hover:bg-violet-100" onClick={downloadTemplate}>
                <span className="inline-flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" />
                  Descargar template
                </span>
              </button>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
              <div className="absolute right-4 top-4">
                <IllustrationMiniExcelBadge className="h-11 w-11 opacity-95" />
              </div>
              <h3 className="font-bold text-[#1e2748]">Vista previa del template</h3>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-emerald-500 text-[11px] font-bold uppercase tracking-wide text-white">
                      <th className="px-2 py-2">phone_number</th>
                      <th className="px-2 py-2">nombre</th>
                      <th className="px-2 py-2">apellido</th>
                      <th className="px-2 py-2">ciudad</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white text-slate-700">
                    <tr className="border-t border-slate-100">
                      <td className="px-2 py-2 font-mono">+5491137710010</td>
                      <td className="px-2 py-2">Juan</td>
                      <td className="px-2 py-2">Pérez</td>
                      <td className="px-2 py-2">Buenos Aires</td>
                    </tr>
                    <tr className="border-t border-slate-100 bg-slate-50/50">
                      <td className="px-2 py-2 font-mono">+5493511234567</td>
                      <td className="px-2 py-2">Ana</td>
                      <td className="px-2 py-2">Gómez</td>
                      <td className="px-2 py-2">Córdoba</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-purple-100 bg-gradient-to-b from-violet-50/70 to-white p-6 shadow-[0_10px_40px_rgba(139,92,246,0.08)]">
              <div className="mb-4 flex items-center gap-2 font-bold text-[#1e2748]">
                <Lightbulb className="h-5 w-5 text-amber-400" /> Consejos para una carga exitosa
              </div>
              <ul className="space-y-3 text-[13px] text-slate-600">
                <li className="flex gap-2">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> Revisa que las celdas de teléfono estén como texto (+54 sin espacios).
                </li>
                <li className="flex gap-2">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> No merges ni filas vacías antes del encabezado.
                </li>
                <li className="flex gap-2">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> Compará tus columnas con la vista previa antes de subir.
                </li>
              </ul>
              <div className="mt-6 flex justify-center">
                <IllustrationTargetArrow className="h-36 w-auto max-w-[160px]" />
              </div>
            </section>

            {uploadResult && (
              <section
                className={`rounded-2xl border bg-white p-6 shadow-md ${
                  uploadResult.success ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  {uploadResult.success ? (
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  )}
                  <h3 className="font-bold text-[#1e2748]">
                    {uploadResult.success ? 'Resultado del procesamiento' : 'Error'}
                  </h3>
                </div>
                <p className="text-sm text-slate-600">{uploadResult.message}</p>
                {uploadResult.success && uploadResult.totalCalls !== undefined ? (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{uploadResult.totalCalls} contactos</p>
                ) : null}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
