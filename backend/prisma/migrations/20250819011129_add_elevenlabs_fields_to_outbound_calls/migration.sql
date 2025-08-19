-- AlterTable
ALTER TABLE "outbound_calls" ADD COLUMN     "audioUrl" TEXT,
ADD COLUMN     "resumen" TEXT,
ADD COLUMN     "transcriptCompleto" TEXT,
ADD COLUMN     "variablesDinamicas" JSONB;
