-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboundCallStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboundCallResult" AS ENUM ('ANSWERED', 'NO_ANSWER', 'BUSY', 'INVALID_NUMBER', 'VOICEMAIL', 'HANGUP', 'ERROR');

-- CreateEnum
CREATE TYPE "LlamadaStatus" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'FALLIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PedidoStatus" AS ENUM ('PENDIENTE', 'ENVIADO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('CALIDAD', 'SERVICIO', 'TECNICO', 'FACTURACION', 'OTRO');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'AGENTE', 'ANALISTA');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "tipo" TEXT NOT NULL DEFAULT 'verificacion_stock',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "estado" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "completedCalls" INTEGER NOT NULL DEFAULT 0,
    "failedCalls" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "nombre_contacto" TEXT,
    "nombre_paciente" TEXT,
    "phone_number" TEXT,
    "domicilio_actual" TEXT,
    "localidad" TEXT,
    "delegacion" TEXT,
    "fecha_envio" TIMESTAMP(3),
    "producto1" TEXT,
    "cantidad1" TEXT,
    "producto2" TEXT,
    "cantidad2" TEXT,
    "producto3" TEXT,
    "cantidad3" TEXT,
    "producto4" TEXT,
    "cantidad4" TEXT,
    "producto5" TEXT,
    "cantidad5" TEXT,
    "observaciones" TEXT,
    "prioridad" "Priority" NOT NULL DEFAULT 'MEDIA',
    "estado_pedido" "PedidoStatus" NOT NULL DEFAULT 'PENDIENTE',
    "estado_llamada" "LlamadaStatus" NOT NULL DEFAULT 'PENDIENTE',
    "resultado_llamada" TEXT,
    "fecha_llamada" TIMESTAMP(3),
    "duracion_llamada" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_calls" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "contactId" TEXT,
    "telefono" TEXT NOT NULL,
    "nombre" TEXT,
    "estado" "OutboundCallStatus" NOT NULL DEFAULT 'PENDING',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "maxIntentos" INTEGER NOT NULL DEFAULT 3,
    "fechaProgramada" TIMESTAMP(3),
    "fechaEjecutada" TIMESTAMP(3),
    "resultado" "OutboundCallResult",
    "notas" TEXT,
    "duracion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "callId" TEXT,

    CONSTRAINT "outbound_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "telefono" TEXT NOT NULL,
    "duracion" INTEGER NOT NULL,
    "transcript" TEXT NOT NULL,
    "dataCollection" JSONB NOT NULL,
    "criteriaResults" JSONB NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'ACTIVE',
    "tipo" "CallType" NOT NULL DEFAULT 'INBOUND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "derivations" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "descripcion" TEXT,
    "prioridad" "Priority" NOT NULL DEFAULT 'MEDIA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "derivations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "tipo" "ComplaintType" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "severidad" "Severity" NOT NULL DEFAULT 'MEDIA',
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltoAt" TIMESTAMP(3),

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "UserRole" NOT NULL DEFAULT 'AGENTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbound_calls_callId_key" ON "outbound_calls"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "calls_callId_key" ON "calls"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_calls" ADD CONSTRAINT "outbound_calls_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_calls" ADD CONSTRAINT "outbound_calls_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_calls" ADD CONSTRAINT "outbound_calls_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derivations" ADD CONSTRAINT "derivations_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
