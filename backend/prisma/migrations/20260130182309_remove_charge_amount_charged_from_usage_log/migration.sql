/*
  Warnings:

  - You are about to drop the column `chargeAmount` on the `UsageLog` table. All the data in the column will be lost.
  - You are about to drop the column `charged` on the `UsageLog` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "UsageLog_apiKeyId_timestamp_idx";

-- DropIndex
DROP INDEX "UsageLog_userId_charged_timestamp_idx";

-- AlterTable
ALTER TABLE "UsageLog" DROP COLUMN "chargeAmount",
DROP COLUMN "charged";

-- CreateIndex
CREATE INDEX "UsageLog_userId_timestamp_idx" ON "UsageLog"("userId", "timestamp");
