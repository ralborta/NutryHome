-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "elevenLabsBatchId" TEXT;

-- AlterTable
ALTER TABLE "outbound_calls" ADD COLUMN     "elevenlabsCallId" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "variables" JSONB;
