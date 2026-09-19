-- AlterTable
ALTER TABLE "monthly_commission_settlements" ADD COLUMN     "capAmount" DECIMAL(18,2),
ADD COLUMN     "capStatus" "CapStatus" NOT NULL DEFAULT 'NOT_APPLIED',
ADD COLUMN     "cappedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;
