import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth, formatTHB } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { MarginReviewForm } from "@/components/margin-review/margin-review-form";

export default async function MarginReviewPage() {
  await requireRole("ACCOUNTING", "ADMIN");

  const transactions = await prisma.salesTransaction.findMany({
    where: { customerType: "B2B_GOV", status: "VALID" },
    include: { marginReview: true, salesPerson: true },
    orderBy: { commissionMonth: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">GOV Margin Review</h1>
        <p className="text-sm text-slate-500">
          US-015/US-016 — ระบบไม่คำนวณ Margin เอง ต้องยืนยันที่นี่เท่านั้น มิฉะนั้นสถานะจะเป็น REVIEW_REQUIRED
        </p>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>เดือน</TH>
            <TH>Customer</TH>
            <TH>Sales</TH>
            <TH>Revenue</TH>
            <TH>Margin</TH>
            <TH>สถานะ</TH>
            <TH>Action</TH>
          </TR>
        </THead>
        <TBody>
          {transactions.map((tx) => (
            <TR key={tx.id}>
              <TD>{formatMonth(tx.commissionMonth)}</TD>
              <TD>
                {tx.customerName}
                <div className="text-xs text-slate-400">{tx.customerCode}</div>
              </TD>
              <TD>{tx.salesPerson?.name ?? tx.salesPersonNameRaw}</TD>
              <TD>{formatTHB(Number(tx.revenue))}</TD>
              <TD>{tx.marginReview?.margin != null ? `${Number(tx.marginReview.margin)}%` : "-"}</TD>
              <TD>
                {tx.marginReview?.verified ? (
                  <Badge variant="success">Verified</Badge>
                ) : (
                  <Badge variant="danger">REVIEW_REQUIRED</Badge>
                )}
              </TD>
              <TD>
                <MarginReviewForm salesTransactionId={tx.id} />
              </TD>
            </TR>
          ))}
          {transactions.length === 0 && (
            <TR>
              <TD colSpan={7} className="text-center text-slate-400">
                ไม่มีรายการ GOV
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}
