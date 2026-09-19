import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth, formatTHB } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { BarBreakdownChart } from "@/components/charts/bar-breakdown-chart";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";

export default async function ManagementDashboardPage() {
  await requireRole("MANAGEMENT", "ADMIN");

  const [transactions, settlements] = await Promise.all([
    prisma.salesTransaction.findMany({
      where: { status: "VALID" },
      include: { calculation: true, salesPerson: true },
    }),
    // Total/by-Sales/trend Commission come from settlements: the Cap is
    // evaluated once per (Sales, Month), not per transaction (PRD.md §4.3),
    // so summing settlement totals is the only way to get a correctly
    // capped figure.
    prisma.monthlyCommissionSettlement.findMany({ include: { salesPerson: true } }),
  ]);

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.revenue), 0);
  const totalCommission = settlements.reduce((sum, s) => sum + Number(s.totalFinalCommission), 0);
  const exceptions = transactions.filter((t) => t.calculation?.reviewStatus === "REVIEW_REQUIRED").length;

  const bySales = new Map<string, number>();
  for (const s of settlements) {
    const name = s.salesPerson.name;
    bySales.set(name, (bySales.get(name) ?? 0) + Number(s.totalFinalCommission));
  }

  // Commission by Customer Type is shown pre-Cap (Commission Before Cap):
  // once the monthly Cap applies, splitting the capped total back across
  // customer types would need an arbitrary allocation rule that
  // Specification does not define.
  const byCustomerType = new Map<string, number>();
  for (const t of transactions) {
    const key = t.customerType ?? "UNKNOWN";
    const before = Number(t.calculation?.commissionBeforeCap ?? 0);
    byCustomerType.set(key, (byCustomerType.get(key) ?? 0) + before);
  }

  const trendMap = new Map<string, { revenue: number; commission: number }>();
  for (const s of settlements) {
    const key = formatMonth(s.commissionMonth);
    const bucket = trendMap.get(key) ?? { revenue: 0, commission: 0 };
    bucket.revenue += Number(s.totalRevenue);
    bucket.commission += Number(s.totalFinalCommission);
    trendMap.set(key, bucket);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Management Dashboard</h1>
        <p className="text-sm text-slate-500">ภาพรวมทุก Sales และทุกประเภทลูกค้า</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>{formatTHB(totalRevenue)}</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>{formatTHB(totalCommission)}</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>{exceptions}</CardValue>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission by Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <BarBreakdownChart data={Array.from(bySales.entries()).map(([label, value]) => ({ label, value }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission by Customer Type</CardTitle>
        </CardHeader>
        <CardContent>
          <BarBreakdownChart
            color="#f97316"
            data={Array.from(byCustomerType.entries()).map(([label, value]) => ({ label, value }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={Array.from(trendMap.entries()).map(([month, v]) => ({ month, ...v }))} />
        </CardContent>
      </Card>
    </div>
  );
}
