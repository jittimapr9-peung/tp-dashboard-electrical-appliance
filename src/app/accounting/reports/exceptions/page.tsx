import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function ExceptionReportPage() {
  await requireRole("ACCOUNTING", "ADMIN");

  const [reviewRequired, invalidRows, adjustments] = await Promise.all([
    prisma.commissionCalculation.findMany({
      where: { reviewStatus: "REVIEW_REQUIRED" },
      include: { salesTransaction: true },
    }),
    prisma.salesTransaction.findMany({ where: { status: { in: ["INVALID", "DUPLICATE"] } } }),
    prisma.commissionAdjustment.findMany({
      include: { adjustedBy: true, commissionCalculation: { include: { salesTransaction: true } } },
      orderBy: { timestamp: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Accounting Review / Exception Report</h1>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Missing Margin / Expired Entitlement / Missing Legacy Rule</h2>
        <Table>
          <THead>
            <TR>
              <TH>เดือน</TH>
              <TH>Customer</TH>
              <TH>Reason</TH>
            </TR>
          </THead>
          <TBody>
            {reviewRequired.map((c) => (
              <TR key={c.id}>
                <TD>{formatMonth(c.salesTransaction.commissionMonth)}</TD>
                <TD>{c.salesTransaction.customerName}</TD>
                <TD>
                  <Badge variant="danger">{c.reviewReason}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Invalid Data / Duplicate</h2>
        <Table>
          <THead>
            <TR>
              <TH>Row</TH>
              <TH>Customer</TH>
              <TH>สถานะ</TH>
            </TR>
          </THead>
          <TBody>
            {invalidRows.map((r) => (
              <TR key={r.id}>
                <TD>{r.rowNumber}</TD>
                <TD>{r.customerName || r.customerCode}</TD>
                <TD>
                  <Badge variant="warning">{r.status}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Adjustment</h2>
        <Table>
          <THead>
            <TR>
              <TH>Customer</TH>
              <TH>Amount</TH>
              <TH>Reason</TH>
              <TH>โดย</TH>
            </TR>
          </THead>
          <TBody>
            {adjustments.map((a) => (
              <TR key={a.id}>
                <TD>{a.commissionCalculation.salesTransaction.customerName}</TD>
                <TD>{Number(a.amount).toLocaleString()}</TD>
                <TD>{a.reasonCode}: {a.reasonText}</TD>
                <TD>{a.adjustedBy.name}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
