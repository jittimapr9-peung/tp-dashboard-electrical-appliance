import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth, formatTHB } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardValue } from "@/components/ui/card";

export default async function AccountingDashboardPage() {
  await requireRole("ACCOUNTING", "ADMIN");

  const latest = await prisma.salesTransaction.findFirst({
    orderBy: { commissionMonth: "desc" },
    select: { commissionMonth: true },
  });

  const commissionMonth = latest?.commissionMonth;

  const [transactions, settlements] = commissionMonth
    ? await Promise.all([
        prisma.salesTransaction.findMany({
          where: { commissionMonth },
          include: { calculation: true },
        }),
        prisma.monthlyCommissionSettlement.findMany({ where: { commissionMonth } }),
      ])
    : [[], []];

  const revenue = transactions.reduce((sum, t) => sum + Number(t.revenue), 0);
  const commissionBeforeCap = transactions.reduce(
    (sum, t) => sum + Number(t.calculation?.commissionBeforeCap ?? 0),
    0,
  );
  // Final Commission (and whether the Cap kicked in) is authoritative at the
  // (Sales, Month) settlement level — the Cap is per Sales/Month, not
  // per transaction (PRD.md section 4.3).
  const adjustment = settlements.reduce((sum, s) => sum + Number(s.totalAdjustment), 0);
  const finalCommission = settlements.reduce((sum, s) => sum + Number(s.totalFinalCommission), 0);
  const salesCount = new Set(transactions.map((t) => t.salesPersonId).filter(Boolean)).size;
  const customerCount = new Set(transactions.map((t) => t.customerCode)).size;
  const pendingReview = transactions.filter((t) => t.calculation?.reviewStatus === "REVIEW_REQUIRED").length;
  const missingMargin = transactions.filter((t) => t.calculation?.reviewReason === "MISSING_VERIFIED_MARGIN").length;
  const expiredEntitlement = transactions.filter((t) => t.calculation?.reviewReason === "POST_EXPIRY_SALES").length;
  const capApplied = settlements.filter((s) => s.capStatus === "CAP_APPLIED").length;

  const cards = [
    { title: "Revenue", value: formatTHB(revenue) },
    { title: "Commission Before Cap", value: formatTHB(commissionBeforeCap) },
    { title: "Final Commission", value: formatTHB(finalCommission) },
    { title: "Adjustment", value: formatTHB(adjustment) },
    { title: "Sales Count", value: salesCount },
    { title: "Customer Count", value: customerCount },
    { title: "Pending Review", value: pendingReview },
    { title: "Missing Margin", value: missingMargin },
    { title: "Expired Entitlement", value: expiredEntitlement },
    { title: "Cap Applied", value: capApplied },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Accounting Dashboard</h1>
        <p className="text-sm text-slate-500">
          เดือนล่าสุด: {commissionMonth ? formatMonth(commissionMonth) : "ยังไม่มีข้อมูล"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader>
              <CardTitle>{c.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardValue>{c.value}</CardValue>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
