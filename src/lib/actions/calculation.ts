import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { calculateCommission, type EntitlementInput } from "@/lib/commission-engine";
import type { CustomerEntitlement } from "@prisma/client";

async function findEntitlementForTransaction(
  customerCode: string,
  salesPersonId: string | null,
  commissionMonth: Date,
): Promise<CustomerEntitlement | null> {
  if (!salesPersonId) return null;

  return prisma.customerEntitlement.findFirst({
    where: {
      customerCode,
      salesPersonId,
      startMonth: { lte: commissionMonth },
    },
    orderBy: { startMonth: "desc" },
  });
}

function toEntitlementInput(entitlement: CustomerEntitlement | null): EntitlementInput | null {
  if (!entitlement) return null;
  return {
    entitlementType: entitlement.entitlementType,
    startMonth: entitlement.startMonth,
    endMonth: entitlement.endMonth,
    status: entitlement.status,
    legacyRuleId: entitlement.legacyRuleId,
    legacyRate: entitlement.legacyRate != null ? Number(entitlement.legacyRate) : null,
  };
}

async function getActivePolicyVersion() {
  const policy = await prisma.commissionPolicyVersion.findFirst({
    where: { isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!policy) {
    throw new Error(
      "No active Commission Policy Version found. Run `npm run db:seed` first.",
    );
  }
  return policy;
}

/**
 * Runs the commission engine for one transaction and upserts the
 * CommissionCalculation row. Called after import Confirm, and again
 * whenever a Margin Review or Entitlement changes so the calculation
 * always reflects the latest confirmed inputs.
 */
export async function recalculateTransaction(
  salesTransactionId: string,
  actingUserId: string,
) {
  const transaction = await prisma.salesTransaction.findUniqueOrThrow({
    where: { id: salesTransactionId },
  });

  if (!transaction.customerType) {
    return; // Invalid customer type — stays flagged by import validation, no calc row.
  }

  const [entitlement, marginReview, policyVersion] = await Promise.all([
    findEntitlementForTransaction(
      transaction.customerCode,
      transaction.salesPersonId,
      transaction.commissionMonth,
    ),
    prisma.marginReview.findUnique({ where: { salesTransactionId } }),
    getActivePolicyVersion(),
  ]);

  const result = calculateCommission({
    revenue: Number(transaction.revenue),
    customerType: transaction.customerType,
    transactionMonth: transaction.commissionMonth,
    entitlement: toEntitlementInput(entitlement),
    marginReview: marginReview
      ? { margin: marginReview.margin != null ? Number(marginReview.margin) : null, verified: marginReview.verified }
      : null,
  });

  const existing = await prisma.commissionCalculation.findUnique({
    where: { salesTransactionId },
  });

  const saved = await prisma.commissionCalculation.upsert({
    where: { salesTransactionId },
    create: {
      salesTransactionId,
      policyVersionId: policyVersion.id,
      customerEntitlementId: entitlement?.id ?? null,
      rateApplied: result.rateApplied,
      commissionBeforeCap: result.commissionBeforeCap,
      capAmount: result.capAmount,
      cappedAmount: result.cappedAmount,
      finalCommissionBeforeAdjustment: result.finalCommission,
      capStatus: result.capStatus ?? "NOT_APPLIED",
      reviewStatus: result.reviewStatus,
      reviewReason: result.reviewReason,
      entitlementAlert: result.entitlementAlert,
    },
    update: {
      policyVersionId: policyVersion.id,
      customerEntitlementId: entitlement?.id ?? null,
      rateApplied: result.rateApplied,
      commissionBeforeCap: result.commissionBeforeCap,
      capAmount: result.capAmount,
      cappedAmount: result.cappedAmount,
      finalCommissionBeforeAdjustment: result.finalCommission,
      capStatus: result.capStatus ?? "NOT_APPLIED",
      reviewStatus: result.reviewStatus,
      reviewReason: result.reviewReason,
      entitlementAlert: result.entitlementAlert,
    },
  });

  await writeAuditLog({
    userId: actingUserId,
    action: existing ? "RECALCULATE" : "CALCULATE",
    entity: "CommissionCalculation",
    entityId: saved.id,
    oldValue: existing ? JSON.parse(JSON.stringify(existing)) : null,
    newValue: JSON.parse(JSON.stringify(saved)),
    reason: "Commission engine run",
  });

  return saved;
}

export async function recalculateBatch(importBatchId: string, actingUserId: string) {
  const transactions = await prisma.salesTransaction.findMany({
    where: { importBatchId, status: "VALID" },
    select: { id: true },
  });

  for (const tx of transactions) {
    await recalculateTransaction(tx.id, actingUserId);
  }

  await prisma.importBatch.update({
    where: { id: importBatchId },
    data: { status: "CALCULATED" },
  });
}
