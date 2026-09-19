"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { createAdjustmentSchema } from "@/lib/validation/adjustment";
import { recalculateSettlementsForMonth } from "@/lib/actions/closing";
import type { ActionResult } from "@/lib/actions/entitlements";

/**
 * US-017: Accounting Adjustment. Calculated Commission is never edited
 * directly — Final Commission = Calculated Commission + Adjustment, and
 * every adjustment is its own audited row.
 */
export async function createAdjustment(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("ACCOUNTING", "ADMIN");

  const parsed = createAdjustmentSchema.safeParse({
    commissionCalculationId: formData.get("commissionCalculationId"),
    amount: formData.get("amount"),
    reasonCode: formData.get("reasonCode"),
    reasonText: formData.get("reasonText"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const data = parsed.data;

  const calculation = await prisma.commissionCalculation.findUnique({
    where: { id: data.commissionCalculationId },
    include: { salesTransaction: { select: { commissionMonth: true } } },
  });
  if (!calculation) {
    return { ok: false, error: "ไม่พบรายการคำนวณคอมมิชชั่นนี้" };
  }

  const adjustment = await prisma.commissionAdjustment.create({
    data: {
      commissionCalculationId: data.commissionCalculationId,
      amount: data.amount,
      reasonCode: data.reasonCode,
      reasonText: data.reasonText,
      adjustedById: session.userId,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "CREATE",
    entity: "CommissionAdjustment",
    entityId: adjustment.id,
    newValue: JSON.parse(JSON.stringify(adjustment)),
    reason: data.reasonText,
  });

  await recalculateSettlementsForMonth(calculation.salesTransaction.commissionMonth);

  revalidatePath("/accounting/review");
  revalidatePath("/accounting/adjustments");
  revalidatePath("/accounting/closing");
  return { ok: true };
}
