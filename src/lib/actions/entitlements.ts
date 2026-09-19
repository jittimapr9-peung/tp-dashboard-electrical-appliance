"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { calculateNewCustomerEndMonth } from "@/lib/commission-engine";
import { createEntitlementSchema } from "@/lib/validation/entitlement";
import { recalculateTransaction } from "@/lib/actions/calculation";
import { recalculateSettlementsForMonth } from "@/lib/actions/closing";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * US-013: Admin/Accounting manage the Customer Commission Entitlement
 * Registry. Never hard-code customer names/rates in source — this is the
 * only place entitlements are created. A LEGACY_TRANSITION entry without a
 * Legacy Rule ID + Rate is forced into REVIEW_REQUIRED (PRD.md section 6).
 */
export async function createEntitlement(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "ACCOUNTING");

  const parsed = createEntitlementSchema.safeParse({
    salesPersonId: formData.get("salesPersonId"),
    customerCode: formData.get("customerCode"),
    customerName: formData.get("customerName"),
    entitlementType: formData.get("entitlementType"),
    startMonth: formData.get("startMonth"),
    endMonth: formData.get("endMonth") || undefined,
    legacyRuleId: formData.get("legacyRuleId") || undefined,
    legacyRatePercent: formData.get("legacyRatePercent") || undefined,
    sourceReference: formData.get("sourceReference") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const data = parsed.data;

  const endMonth =
    data.entitlementType === "NEW_CUSTOMER"
      ? calculateNewCustomerEndMonth(data.startMonth)
      : (data.endMonth ?? calculateNewCustomerEndMonth(data.startMonth));

  const isLegacy = data.entitlementType === "LEGACY_TRANSITION";
  const hasApprovedLegacyRule = Boolean(data.legacyRuleId) && data.legacyRatePercent != null;
  const status = isLegacy && !hasApprovedLegacyRule ? "REVIEW_REQUIRED" : "ACTIVE";

  const created = await prisma.customerEntitlement.create({
    data: {
      salesPersonId: data.salesPersonId,
      customerCode: data.customerCode,
      customerName: data.customerName,
      entitlementType: data.entitlementType,
      startMonth: data.startMonth,
      endMonth,
      legacyRuleId: data.legacyRuleId ?? null,
      legacyRate: data.legacyRatePercent != null ? data.legacyRatePercent / 100 : null,
      sourceReference: data.sourceReference ?? null,
      notes: data.notes ?? null,
      status,
      createdById: session.userId,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "CREATE",
    entity: "CustomerEntitlement",
    entityId: created.id,
    newValue: JSON.parse(JSON.stringify(created)),
    reason: "Entitlement Registry entry created",
  });

  // Retroactively re-run the engine for already-imported transactions this
  // entitlement now covers — e.g. adding an approved Legacy Rule should
  // move a previously REVIEW_REQUIRED transaction back to OK.
  const affectedTransactions = await prisma.salesTransaction.findMany({
    where: { customerCode: data.customerCode, salesPersonId: data.salesPersonId, status: "VALID" },
    select: { id: true, commissionMonth: true },
  });

  const affectedMonths = new Map<string, Date>();
  for (const tx of affectedTransactions) {
    await recalculateTransaction(tx.id, session.userId);
    affectedMonths.set(tx.commissionMonth.toISOString(), tx.commissionMonth);
  }
  for (const month of affectedMonths.values()) {
    await recalculateSettlementsForMonth(month);
  }

  revalidatePath("/admin/entitlements");
  revalidatePath("/accounting/entitlements");
  revalidatePath("/accounting/review");
  revalidatePath("/accounting/closing");
  return { ok: true };
}
