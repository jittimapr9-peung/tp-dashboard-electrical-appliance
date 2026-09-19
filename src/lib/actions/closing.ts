"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { applyCommissionCap, MONTHLY_COMMISSION_CAP } from "@/lib/commission-engine";
import type { ActionResult } from "@/lib/actions/entitlements";

const monthSchema = z.object({ commissionMonth: z.coerce.date() });

/**
 * Recomputes the per-Sales settlement totals for a month from the current
 * CommissionCalculation + CommissionAdjustment rows, and applies the
 * Commission Cap here — once per (Sales, Month) — because the Cap is
 * 20,000 THB per Sales person PER MONTH, not per transaction (PRD.md
 * section 4.3). Safe to call repeatedly (e.g. after every recalculation,
 * Margin verification, or Adjustment) while the month is still
 * DRAFT/CALCULATED — it never touches a FINALIZED/PAID month.
 */
export async function recalculateSettlementsForMonth(commissionMonth: Date) {
  const transactions = await prisma.salesTransaction.findMany({
    where: { commissionMonth, salesPersonId: { not: null } },
    include: { calculation: { include: { adjustments: true } } },
  });

  const bySalesPerson = new Map<
    string,
    { revenue: number; beforeCap: number; adjustment: number }
  >();

  for (const tx of transactions) {
    if (!tx.salesPersonId) continue;
    const bucket = bySalesPerson.get(tx.salesPersonId) ?? {
      revenue: 0,
      beforeCap: 0,
      adjustment: 0,
    };
    bucket.revenue += Number(tx.revenue);

    if (tx.calculation && tx.calculation.reviewStatus === "OK") {
      const before = Number(tx.calculation.commissionBeforeCap ?? 0);
      const adj = tx.calculation.adjustments.reduce((sum, a) => sum + Number(a.amount), 0);
      bucket.beforeCap += before;
      bucket.adjustment += adj;
    }

    bySalesPerson.set(tx.salesPersonId, bucket);
  }

  for (const [salesPersonId, totals] of bySalesPerson) {
    const existing = await prisma.monthlyCommissionSettlement.findUnique({
      where: { commissionMonth_salesPersonId: { commissionMonth, salesPersonId } },
    });

    if (existing && (existing.status === "FINALIZED" || existing.status === "PAID")) {
      continue; // Locked — must be Reopened by Admin before it can change.
    }

    const cap = applyCommissionCap(totals.beforeCap, MONTHLY_COMMISSION_CAP);
    const totalFinalCommission = cap.finalCommission + totals.adjustment;

    await prisma.monthlyCommissionSettlement.upsert({
      where: { commissionMonth_salesPersonId: { commissionMonth, salesPersonId } },
      create: {
        commissionMonth,
        salesPersonId,
        status: "CALCULATED",
        totalRevenue: totals.revenue,
        totalCommissionBeforeCap: totals.beforeCap,
        totalAdjustment: totals.adjustment,
        totalFinalCommission,
        capAmount: cap.capAmount,
        cappedAmount: cap.cappedAmount,
        capStatus: cap.capStatus,
      },
      update: {
        status: existing?.status === "DRAFT" ? "CALCULATED" : existing?.status,
        totalRevenue: totals.revenue,
        totalCommissionBeforeCap: totals.beforeCap,
        totalAdjustment: totals.adjustment,
        totalFinalCommission,
        capAmount: cap.capAmount,
        cappedAmount: cap.cappedAmount,
        capStatus: cap.capStatus,
      },
    });
  }
}

export async function moveMonthToAccountingReview(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("ACCOUNTING", "ADMIN");
  const parsed = monthSchema.safeParse({ commissionMonth: formData.get("commissionMonth") });
  if (!parsed.success) return { ok: false, error: "เดือนไม่ถูกต้อง" };

  await prisma.monthlyCommissionSettlement.updateMany({
    where: { commissionMonth: parsed.data.commissionMonth, status: "CALCULATED" },
    data: { status: "ACCOUNTING_REVIEW" },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "MOVE_TO_ACCOUNTING_REVIEW",
    entity: "MonthlyCommissionSettlement",
    entityId: parsed.data.commissionMonth.toISOString(),
    reason: "Accounting started review",
  });

  revalidatePath("/accounting/closing");
  return { ok: true };
}

/**
 * US-019: Finalize. Refuses to finalize while any transaction in the
 * month is still REVIEW_REQUIRED — exceptions must be resolved (via
 * Margin Review, Entitlement fix, or Adjustment) first (US-018).
 */
export async function finalizeMonth(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("ACCOUNTING", "ADMIN");
  const parsed = monthSchema.safeParse({ commissionMonth: formData.get("commissionMonth") });
  if (!parsed.success) return { ok: false, error: "เดือนไม่ถูกต้อง" };
  const { commissionMonth } = parsed.data;

  const pendingReview = await prisma.commissionCalculation.count({
    where: { reviewStatus: "REVIEW_REQUIRED", salesTransaction: { commissionMonth } },
  });

  if (pendingReview > 0) {
    return {
      ok: false,
      error: `ยังมีรายการที่ต้อง Review อยู่ ${pendingReview} รายการ กรุณาแก้ไขก่อน Finalize`,
    };
  }

  await prisma.monthlyCommissionSettlement.updateMany({
    where: { commissionMonth, status: "ACCOUNTING_REVIEW" },
    data: { status: "FINALIZED", finalizedById: session.userId, finalizedAt: new Date() },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "FINALIZE",
    entity: "MonthlyCommissionSettlement",
    entityId: commissionMonth.toISOString(),
    reason: "Monthly commission finalized",
  });

  revalidatePath("/accounting/closing");
  return { ok: true };
}

export async function markMonthPaid(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("ACCOUNTING", "ADMIN");
  const parsed = monthSchema.safeParse({ commissionMonth: formData.get("commissionMonth") });
  if (!parsed.success) return { ok: false, error: "เดือนไม่ถูกต้อง" };

  await prisma.monthlyCommissionSettlement.updateMany({
    where: { commissionMonth: parsed.data.commissionMonth, status: "FINALIZED" },
    data: { status: "PAID" },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "MARK_PAID",
    entity: "MonthlyCommissionSettlement",
    entityId: parsed.data.commissionMonth.toISOString(),
    reason: "Payment export completed",
  });

  revalidatePath("/accounting/closing");
  return { ok: true };
}

const reopenSchema = monthSchema.extend({
  reason: z.string().trim().min(1, "ต้องระบุเหตุผลในการ Reopen"),
});

/**
 * US-020: only Admin can Reopen a FINALIZED month, and only with a
 * mandatory reason — recorded in the Audit Log together with who and when.
 */
export async function reopenMonth(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const parsed = reopenSchema.safeParse({
    commissionMonth: formData.get("commissionMonth"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const { commissionMonth, reason } = parsed.data;

  const result = await prisma.monthlyCommissionSettlement.updateMany({
    where: { commissionMonth, status: { in: ["FINALIZED", "PAID"] } },
    data: {
      status: "ACCOUNTING_REVIEW",
      reopenedById: session.userId,
      reopenedAt: new Date(),
      reopenReason: reason,
    },
  });

  if (result.count === 0) {
    return { ok: false, error: "ไม่พบเดือนที่ Finalize แล้วสำหรับ Reopen" };
  }

  await writeAuditLog({
    userId: session.userId,
    action: "REOPEN",
    entity: "MonthlyCommissionSettlement",
    entityId: commissionMonth.toISOString(),
    reason,
  });

  revalidatePath("/accounting/closing");
  revalidatePath("/admin/periods");
  return { ok: true };
}
