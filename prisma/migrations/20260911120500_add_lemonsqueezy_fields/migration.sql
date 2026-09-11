-- AlterTable
ALTER TABLE "Device" ADD COLUMN "lemonSqueezyCustomerId" TEXT,
ADD COLUMN "lemonSqueezySubscriptionId" TEXT,
ADD COLUMN "subscriptionTier" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Device_lemonSqueezyCustomerId_key" ON "Device"("lemonSqueezyCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_lemonSqueezySubscriptionId_key" ON "Device"("lemonSqueezySubscriptionId");
