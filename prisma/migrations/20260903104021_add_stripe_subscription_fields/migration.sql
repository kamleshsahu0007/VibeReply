-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT,
ADD COLUMN     "subscriptionUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Device_stripeCustomerId_key" ON "Device"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_stripeSubscriptionId_key" ON "Device"("stripeSubscriptionId");
