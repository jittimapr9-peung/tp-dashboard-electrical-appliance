import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth, formatTHB } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReopenForm } from "@/components/closing/reopen-form";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default" | "info"> = {
  DRAFT: "default",
  CALCULATED: "info",
  ACCOUNTING_REVIEW: "warning",
  FINALIZED: "success",
  PAID: "success",
};

export default async function AdminPeriodsPage() {
  await requireRole("ADMIN");

  const settlements = await prisma.monthlyCommissionSettlement.findMany({
    orderBy: { commissionMonth: "desc" },
  });

  const byMonth = new Map<
    string,
    { commissionMonth: Date; status: string; total: number; reopenedAt: Date | null; reopenReason: string | null }
  >();
  for (const s of settlements) {
    const key = s.commissionMonth.toISOString();
    const existing = byMonth.get(key);
    byMonth.set(key, {
      commissionMonth: s.commissionMonth,
      status: s.status,
      total: (existing?.total ?? 0) + Number(s.totalFinalCommission),
      reopenedAt: s.reopenedAt ?? existing?.reopenedAt ?? null,
      reopenReason: s.reopenReason ?? existing?.reopenReason ?? null,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Monthly Periods / Reopen</h1>
        <p className="text-sm text-slate-500">
          US-020 — เฉพาะ Admin เท่านั้นที่ Reopen เดือนที่ Finalize แล้วได้ ต้องระบุเหตุผลทุกครั้ง
        </p>
      </div>

      {Array.from(byMonth.entries()).map(([key, m]) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800">{formatMonth(m.commissionMonth)}</CardTitle>
            <Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-600">รวม Final Commission: {formatTHB(m.total)}</p>
            {m.reopenReason && (
              <p className="text-xs text-slate-400">Reopen ล่าสุด: {m.reopenReason}</p>
            )}
            {(m.status === "FINALIZED" || m.status === "PAID") && <ReopenForm commissionMonth={key} />}
          </CardContent>
        </Card>
      ))}

      {byMonth.size === 0 && <p className="text-sm text-slate-400">ยังไม่มีรอบเดือน</p>}
    </div>
  );
}
