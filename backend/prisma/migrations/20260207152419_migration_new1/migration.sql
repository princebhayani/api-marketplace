/*
  Warnings:

  - The values [PAST_DUE] on the enum `SubscriptionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `documentationUrl` on the `Api` table. All the data in the column will be lost.
  - You are about to drop the column `openApiSpecUrl` on the `Api` table. All the data in the column will be lost.
  - You are about to drop the column `postmanCollectionUrl` on the `Api` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED');
ALTER TABLE "Subscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING ("status"::text::"SubscriptionStatus_new");
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "SubscriptionStatus_old";
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Api" DROP COLUMN "documentationUrl",
DROP COLUMN "openApiSpecUrl",
DROP COLUMN "postmanCollectionUrl";
