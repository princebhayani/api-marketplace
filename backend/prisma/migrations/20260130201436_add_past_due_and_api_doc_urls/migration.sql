-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAST_DUE';

-- AlterTable
ALTER TABLE "Api" ADD COLUMN     "documentationUrl" TEXT,
ADD COLUMN     "openApiSpecUrl" TEXT,
ADD COLUMN     "postmanCollectionUrl" TEXT;
