import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth, formatTHB } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ClosingActions } from "@/components/closing/closing-actions";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default" | "info"> = {
  DRAFT: "default",
  CALCULATED: "info",
  ACCOUNTING_REVIEW: "warning",
  FINALIZED: "success",
  PAID: "success",
};

export default async function MonthlyClosingPage() {
  await requireRole("ACCOUNTING", "ADMIN");

  const settlements = await prisma.monthlyCommissionSettlement.findMany({
    include: { salesPerson: true },
    orderBy: [{ commissionMonth: "desc" }, { salesPerson: { name: "asc" } }],
  });

  const byMonth = new Map<string, typeof settlements>();
  for (const s of settlements) {
    const key = s.commissionMonth.toISOString();
    byMonth.set(key, [...(byMonth.get(key) ?? []), s]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Monthly Closing</h1>
        <p className="text-sm text-slate-500">DRAFT → CALCULATED → ACCOUNTING_REVIEW → FINALIZED → PAID</p>
      </div>

      {Array.from(byMonth.entries()).map(([monthKey, rows]) => {
        const status = rows[0]?.status ?? "DRAFT";
        const totalFinal = rows.reduce((sum, r) => sum + Number(r.totalFinalCommission), 0);
        return (
          <Card key={monthKey}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800">
                {formatMonth(rows[0].commissionMonth)}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                <ClosingActions commissionMonth={monthKey} status={status} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <THead>
                  <TR>
                    <TH>Sales</TH>
                    <TH>Revenue</TH>
                    <TH>Commission Before Cap</TH>
                    <TH>Adjustment</TH>
                    <TH>Final Commission</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((r) => (
                    <TR key={r.id}>
                      <TD>{r.salesPerson.name}</TD>
                      <TD>{formatTHB(Number(r.totalRevenue))}</TD>
                      <TD>{formatTHB(Number(r.totalCommissionBeforeCap))}</TD>
                      <TD>{formatTHB(Number(r.totalAdjustment))}</TD>
                      <TD className="font-medium">{formatTHB(Number(r.totalFinalCommission))}</TD>
                    </TR>
                  ))}
                  <TR>
                    <TD className="font-medium">รวม</TD>
                    <TD />
                    <TD />
                    <TD />
                    <TD className="font-semibold">{formatTHB(totalFinal)}</TD>
                  </TR>
                </TBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {settlements.length === 0 && (
        <p className="text-sm text-slate-400">ยังไม่มีข้อมูลรอบเดือน — Import Sales Report ก่อน</p>
      )}
    </div>
  );
}
