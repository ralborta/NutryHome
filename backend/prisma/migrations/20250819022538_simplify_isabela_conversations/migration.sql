/*
  Warnings:

  - You are about to drop the column `agentId` on the `isabela_conversations` table. All the data in the column will be lost.
  - You are about to drop the column `audioUrl` on the `isabela_conversations` table. All the data in the column will be lost.
  - You are about to drop the column `callDuration` on the `isabela_conversations` table. All the data in the column will be lost.
  - You are about to drop the column `callSuccessful` on the `isabela_conversations` table. All the data in the column will be lost.
  - You are about to drop the column `dynamicVariables` on the `isabela_conversations` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `isabela_conversations` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `isabela_conversations` table. All the data in the column will be lost.
  - You are about to drop the column `patientName` on the `isabela_conversations` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `isabela_conversations` table. All the data in the column will be lost.
  - You are about to drop the column `product` on the `isabela_conversations` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `isabela_conversations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "isabela_conversations" DROP COLUMN "agentId",
DROP COLUMN "audioUrl",
DROP COLUMN "callDuration",
DROP COLUMN "callSuccessful",
DROP COLUMN "dynamicVariables",
DROP COLUMN "endTime",
DROP COLUMN "metadata",
DROP COLUMN "patientName",
DROP COLUMN "phoneNumber",
DROP COLUMN "product",
DROP COLUMN "startTime";
