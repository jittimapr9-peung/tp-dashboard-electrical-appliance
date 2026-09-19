import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth, formatTHB } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function PaymentExportPage() {
  await requireRole("ACCOUNTING", "ADMIN");

  const settlements = await prisma.monthlyCommissionSettlement.findMany({
    where: { status: { in: ["FINALIZED", "PAID"] } },
    include: { salesPerson: true },
    orderBy: { commissionMonth: "desc" },
  });

  const byMonth = new Map<string, { commissionMonth: Date; total: number }>();
  for (const s of settlements) {
    const key = s.commissionMonth.toISOString();
    const existing = byMonth.get(key);
    byMonth.set(key, {
      commissionMonth: s.commissionMonth,
      total: (existing?.total ?? 0) + Number(s.totalFinalCommission),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Payment Export</h1>
        <p className="text-sm text-slate-500">
          Phase 1 ใช้ CSV แบบ Generic — Format จริงของฝ่ายบัญชียังไม่ยืนยัน (ดู Admin → Configuration)
        </p>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>เดือน</TH>
            <TH>รวม Final Commission</TH>
            <TH>Export</TH>
          </TR>
        </THead>
        <TBody>
          {Array.from(byMonth.entries()).map(([key, m]) => (
            <TR key={key}>
              <TD>{formatMonth(m.commissionMonth)}</TD>
              <TD>{formatTHB(m.total)}</TD>
              <TD>
                <a
                  className="text-sm text-sky-700 underline"
                  href={`/api/reports/payment-export?month=${key}`}
                >
                  ดาวน์โหลด CSV
                </a>
              </TD>
            </TR>
          ))}
          {byMonth.size === 0 && (
            <TR>
              <TD colSpan={3} className="text-center text-slate-400">
                <Badge variant="default">ยังไม่มีเดือนที่ Finalize แล้ว</Badge>
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}
