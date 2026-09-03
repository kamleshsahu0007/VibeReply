-- DropIndex
DROP INDEX "Device_stripeCustomerId_key";

-- DropIndex
DROP INDEX "Device_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "razorpaySubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Device_razorpaySubscriptionId_key" ON "Device"("razorpaySubscriptionId");
