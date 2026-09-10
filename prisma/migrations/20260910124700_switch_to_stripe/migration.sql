-- DropIndex
DROP INDEX "Device_razorpaySubscriptionId_key";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "razorpaySubscriptionId",
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Device_stripeCustomerId_key" ON "Device"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_stripeSubscriptionId_key" ON "Device"("stripeSubscriptionId");
