import { prisma } from "@/lib/prisma";
import { applyCommissionCap, MONTHLY_COMMISSION_CAP } from "@/lib/commission-engine";

/**
 * Recomputes the per-Sales settlement totals for a month from the current
 * CommissionCalculation + CommissionAdjustment rows, and applies the
 * Commission Cap here — once per (Sales, Month) — because the Cap is
 * 20,000 THB per Sales person PER MONTH, not per transaction (PRD.md
 * section 4.3). Safe to call repeatedly (e.g. after every import or
 * Margin verification).
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
