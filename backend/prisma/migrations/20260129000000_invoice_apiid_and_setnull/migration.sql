-- Add apiId to Invoice so provider earnings still attribute after subscription is deleted
ALTER TABLE "Invoice" ADD COLUMN "apiId" TEXT;

-- Backfill apiId for existing invoices that have a subscription (so earnings survive future subscription deletes)
UPDATE "Invoice" i
SET "apiId" = ap."apiId"
FROM "Subscription" s
JOIN "ApiPlan" ap ON s."apiPlanId" = ap.id
WHERE i."subscriptionId" = s.id AND i."apiId" IS NULL;

-- Create index for revenue queries by apiId
CREATE INDEX "Invoice_apiId_status_idx" ON "Invoice"("apiId", "status");

-- Change Invoice -> Subscription FK to SET NULL so Invoice (and Payment) are preserved when Subscription is deleted
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_subscriptionId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
