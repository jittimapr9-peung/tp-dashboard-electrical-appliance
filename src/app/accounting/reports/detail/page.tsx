import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth, formatPercent, formatTHB } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function CommissionDetailReportPage() {
  await requireRole("ACCOUNTING", "ADMIN");

  const calculations = await prisma.commissionCalculation.findMany({
    include: {
      salesTransaction: { include: { salesPerson: true } },
      policyVersion: true,
      customerEntitlement: true,
      adjustments: true,
    },
    orderBy: { calculatedAt: "desc" },
    take: 300,
  });

  const settlements = await prisma.monthlyCommissionSettlement.findMany();
  const settlementBySalesMonth = new Map(
    settlements.map((s) => [`${s.salesPersonId}|${s.commissionMonth.toISOString()}`, s]),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Commission Detail</h1>
      <Table>
        <THead>
          <TR>
            <TH>เดือน</TH>
            <TH>Customer</TH>
            <TH>Revenue</TH>
            <TH>Margin/Rate</TH>
            <TH>Entitlement</TH>
            <TH>Cap</TH>
            <TH>Adjustment</TH>
            <TH>Line Total (ก่อน Cap รายเดือน)</TH>
            <TH>Policy</TH>
          </TR>
        </THead>
        <TBody>
          {calculations.map((c) => {
            const adj = c.adjustments.reduce((s, a) => s + Number(a.amount), 0);
            const final = Number(c.finalCommissionBeforeAdjustment ?? 0) + adj;
            const settlement = c.salesTransaction.salesPersonId
              ? settlementBySalesMonth.get(
                  `${c.salesTransaction.salesPersonId}|${c.salesTransaction.commissionMonth.toISOString()}`,
                )
              : undefined;
            return (
              <TR key={c.id}>
                <TD>{formatMonth(c.salesTransaction.commissionMonth)}</TD>
                <TD>
                  {c.salesTransaction.customerName}
                  <div className="text-xs text-slate-400">{c.salesTransaction.customerCode}</div>
                </TD>
                <TD>{formatTHB(Number(c.salesTransaction.revenue))}</TD>
                <TD>{formatPercent(c.rateApplied != null ? Number(c.rateApplied) : null)}</TD>
                <TD>{c.customerEntitlement?.entitlementType ?? "-"}</TD>
                <TD>
                  {/* Cap is evaluated per (Sales, Month), not per transaction — see the Sales person's monthly settlement. */}
                  <Badge variant={settlement?.capStatus === "CAP_APPLIED" ? "warning" : "default"}>
                    {settlement?.capStatus ?? "-"}
                  </Badge>
                </TD>
                <TD>{formatTHB(adj)}</TD>
                <TD className="font-medium">
                  {c.reviewStatus === "REVIEW_REQUIRED" ? (
                    <Badge variant="danger">REVIEW_REQUIRED</Badge>
                  ) : (
                    formatTHB(final)
                  )}
                </TD>
                <TD className="text-xs text-slate-400">{c.policyVersion.versionCode}</TD>
              </TR>
            );
          })}
          {calculations.length === 0 && (
            <TR>
              <TD colSpan={9} className="text-center text-slate-400">
                ไม่มีข้อมูล
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}
