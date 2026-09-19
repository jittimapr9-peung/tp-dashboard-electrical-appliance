import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth, formatTHB } from "@/lib/utils";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function MonthlySummaryReportPage() {
  await requireRole("ACCOUNTING", "ADMIN");

  const settlements = await prisma.monthlyCommissionSettlement.findMany({
    include: { salesPerson: true },
    orderBy: [{ commissionMonth: "desc" }, { salesPerson: { name: "asc" } }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Monthly Commission Summary</h1>
      <Table>
        <THead>
          <TR>
            <TH>เดือน</TH>
            <TH>Sales</TH>
            <TH>Revenue</TH>
            <TH>Commission Before Cap</TH>
            <TH>Adjustment</TH>
            <TH>Final Commission</TH>
            <TH>สถานะ</TH>
          </TR>
        </THead>
        <TBody>
          {settlements.map((s) => (
            <TR key={s.id}>
              <TD>{formatMonth(s.commissionMonth)}</TD>
              <TD>{s.salesPerson.name}</TD>
              <TD>{formatTHB(Number(s.totalRevenue))}</TD>
              <TD>{formatTHB(Number(s.totalCommissionBeforeCap))}</TD>
              <TD>{formatTHB(Number(s.totalAdjustment))}</TD>
              <TD className="font-medium">{formatTHB(Number(s.totalFinalCommission))}</TD>
              <TD>{s.status}</TD>
            </TR>
          ))}
          {settlements.length === 0 && (
            <TR>
              <TD colSpan={7} className="text-center text-slate-400">
                ไม่มีข้อมูล
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}
