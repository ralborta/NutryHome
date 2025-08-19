-- CreateTable
CREATE TABLE "isabela_conversations" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "patientName" TEXT,
    "product" TEXT,
    "summary" TEXT,
    "callDuration" INTEGER,
    "callSuccessful" BOOLEAN,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "dynamicVariables" JSONB,
    "audioUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "isabela_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "isabela_conversations_conversationId_key" ON "isabela_conversations"("conversationId");
