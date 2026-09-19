-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ACCOUNTING', 'SALES', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('B2C', 'B2B_PRIVATE', 'SME', 'B2B_GOV');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('UPLOADED', 'MAPPED', 'PREVIEWED', 'VALIDATED', 'CONFIRMED', 'CALCULATED', 'ERROR');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('VALID', 'INVALID', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "EntitlementType" AS ENUM ('NORMAL', 'NEW_CUSTOMER', 'LEGACY_TRANSITION');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVIEW_REQUIRED', 'PENDING_APPROVAL');

-- CreateEnum
CREATE TYPE "EntitlementAlert" AS ENUM ('EXPIRING_THIS_MONTH', 'EXPIRED', 'EXPIRED_WITH_SALES', 'MISSING_ENTITLEMENT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('OK', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "CapStatus" AS ENUM ('NOT_APPLIED', 'CAP_APPLIED');

-- CreateEnum
CREATE TYPE "AdjustmentReasonCode" AS ENUM ('DATA_CORRECTION', 'MARGIN_CORRECTION', 'CUSTOMER_CLASSIFICATION', 'DUPLICATE_REMOVAL', 'MANAGEMENT_ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'CALCULATED', 'ACCOUNTING_REVIEW', 'FINALIZED', 'PAID');

-- CreateEnum
CREATE TYPE "PolicyRuleType" AS ENUM ('STANDARD_RATE', 'GOV_MARGIN_TIER', 'COMMISSION_CAP', 'CONFIG_PLACEHOLDER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "salesPersonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_people" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "commissionMonth" TIMESTAMP(3) NOT NULL,
    "filename" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "columnMapping" JSONB NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'UPLOADED',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "validRowCount" INTEGER NOT NULL DEFAULT 0,
    "errorRowCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_transactions" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "commissionMonth" TIMESTAMP(3) NOT NULL,
    "salesPersonNameRaw" TEXT NOT NULL,
    "salesPersonId" TEXT,
    "customerCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerTypeRaw" TEXT NOT NULL,
    "customerType" "CustomerType",
    "revenue" DECIMAL(18,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'VALID',
    "validationErrors" JSONB,
    "isDuplicateOf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_policy_versions" (
    "id" TEXT NOT NULL,
    "versionCode" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_policy_rules" (
    "id" TEXT NOT NULL,
    "policyVersionId" TEXT NOT NULL,
    "ruleType" "PolicyRuleType" NOT NULL,
    "customerType" "CustomerType",
    "marginMin" DECIMAL(6,4),
    "marginMax" DECIMAL(6,4),
    "rate" DECIMAL(6,4),
    "capAmount" DECIMAL(18,2),
    "configKey" TEXT,
    "configValue" TEXT,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "commission_policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_entitlements" (
    "id" TEXT NOT NULL,
    "salesPersonId" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "entitlementType" "EntitlementType" NOT NULL,
    "startMonth" TIMESTAMP(3) NOT NULL,
    "endMonth" TIMESTAMP(3) NOT NULL,
    "legacyRuleId" TEXT,
    "legacyRate" DECIMAL(6,4),
    "sourceReference" TEXT,
    "notes" TEXT,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "margin_reviews" (
    "id" TEXT NOT NULL,
    "salesTransactionId" TEXT NOT NULL,
    "margin" DECIMAL(6,4),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "margin_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_calculations" (
    "id" TEXT NOT NULL,
    "salesTransactionId" TEXT NOT NULL,
    "policyVersionId" TEXT NOT NULL,
    "customerEntitlementId" TEXT,
    "rateApplied" DECIMAL(6,4),
    "commissionBeforeCap" DECIMAL(18,2),
    "capAmount" DECIMAL(18,2),
    "cappedAmount" DECIMAL(18,2),
    "finalCommissionBeforeAdjustment" DECIMAL(18,2),
    "capStatus" "CapStatus" NOT NULL DEFAULT 'NOT_APPLIED',
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'OK',
    "reviewReason" TEXT,
    "entitlementAlert" "EntitlementAlert",
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_adjustments" (
    "id" TEXT NOT NULL,
    "commissionCalculationId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reasonCode" "AdjustmentReasonCode" NOT NULL,
    "reasonText" TEXT NOT NULL,
    "adjustedById" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_commission_settlements" (
    "id" TEXT NOT NULL,
    "commissionMonth" TIMESTAMP(3) NOT NULL,
    "salesPersonId" TEXT NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "totalRevenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCommissionBeforeCap" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAdjustment" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalFinalCommission" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "finalizedById" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "reopenedById" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_commission_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_salesPersonId_key" ON "users"("salesPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_people_code_key" ON "sales_people"("code");

-- CreateIndex
CREATE UNIQUE INDEX "import_batches_commissionMonth_filename_fileHash_key" ON "import_batches"("commissionMonth", "filename", "fileHash");

-- CreateIndex
CREATE INDEX "sales_transactions_commissionMonth_idx" ON "sales_transactions"("commissionMonth");

-- CreateIndex
CREATE INDEX "sales_transactions_customerCode_idx" ON "sales_transactions"("customerCode");

-- CreateIndex
CREATE INDEX "sales_transactions_salesPersonId_idx" ON "sales_transactions"("salesPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "commission_policy_versions_versionCode_key" ON "commission_policy_versions"("versionCode");

-- CreateIndex
CREATE INDEX "customer_entitlements_customerCode_idx" ON "customer_entitlements"("customerCode");

-- CreateIndex
CREATE INDEX "customer_entitlements_salesPersonId_idx" ON "customer_entitlements"("salesPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "margin_reviews_salesTransactionId_key" ON "margin_reviews"("salesTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "commission_calculations_salesTransactionId_key" ON "commission_calculations"("salesTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_commission_settlements_commissionMonth_salesPersonI_key" ON "monthly_commission_settlements"("commissionMonth", "salesPersonId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "sales_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "sales_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_policy_rules" ADD CONSTRAINT "commission_policy_rules_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "commission_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_entitlements" ADD CONSTRAINT "customer_entitlements_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "sales_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_entitlements" ADD CONSTRAINT "customer_entitlements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "margin_reviews" ADD CONSTRAINT "margin_reviews_salesTransactionId_fkey" FOREIGN KEY ("salesTransactionId") REFERENCES "sales_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "margin_reviews" ADD CONSTRAINT "margin_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_salesTransactionId_fkey" FOREIGN KEY ("salesTransactionId") REFERENCES "sales_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "commission_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_customerEntitlementId_fkey" FOREIGN KEY ("customerEntitlementId") REFERENCES "customer_entitlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_commissionCalculationId_fkey" FOREIGN KEY ("commissionCalculationId") REFERENCES "commission_calculations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_commission_settlements" ADD CONSTRAINT "monthly_commission_settlements_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "sales_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_commission_settlements" ADD CONSTRAINT "monthly_commission_settlements_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_commission_settlements" ADD CONSTRAINT "monthly_commission_settlements_reopenedById_fkey" FOREIGN KEY ("reopenedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
