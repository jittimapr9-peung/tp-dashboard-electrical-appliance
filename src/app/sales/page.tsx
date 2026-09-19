import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth, formatTHB } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";
import { getEntitlementAlert } from "@/lib/commission-engine";

const ALERT_VARIANT: Record<string, "warning" | "danger" | "default"> = {
  EXPIRING_THIS_MONTH: "warning",
  EXPIRED: "default",
  EXPIRED_WITH_SALES: "danger",
  MISSING_ENTITLEMENT: "warning",
};

export default async function SalesDashboardPage() {
  const session = await requireRole("SALES", "ADMIN");

  if (!session.salesPersonId) {
    return <p className="text-sm text-slate-500">บัญชีนี้ไม่ได้ผูกกับ Sales คนใด</p>;
  }

  const salesPersonId = session.salesPersonId;
  const now = new Date();
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [transactions, entitlements, settlements] = await Promise.all([
    prisma.salesTransaction.findMany({
      where: { salesPersonId, status: "VALID", commissionMonth: currentMonth },
    }),
    prisma.customerEntitlement.findMany({ where: { salesPersonId } }),
    // Final Commission is authoritative at the settlement level: the Cap
    // is evaluated per Sales/Month, not per transaction (PRD.md §4.3).
    prisma.monthlyCommissionSettlement.findMany({
      where: { salesPersonId },
      orderBy: { commissionMonth: "asc" },
    }),
  ]);

  const revenue = transactions.reduce((sum, t) => sum + Number(t.revenue), 0);
  const currentSettlement = settlements.find(
    (s) => s.commissionMonth.getTime() === currentMonth.getTime(),
  );
  const commission = Number(currentSettlement?.totalFinalCommission ?? 0);
  const customerCount = new Set(transactions.map((t) => t.customerCode)).size;

  const trendData = settlements.map((s) => ({
    month: formatMonth(s.commissionMonth),
    revenue: Number(s.totalRevenue),
    commission: Number(s.totalFinalCommission),
  }));

  const alerts = entitlements
    .map((e) => ({
      entitlement: e,
      alert: getEntitlementAlert(
        {
          entitlementType: e.entitlementType,
          startMonth: e.startMonth,
          endMonth: e.endMonth,
          status: e.status,
        },
        currentMonth,
        false,
      ),
    }))
    .filter((x) => x.alert !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Sales Dashboard</h1>
        <p className="text-sm text-slate-500">ข้อมูลของ {session.name} เท่านั้น — เดือน {formatMonth(currentMonth)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>{formatTHB(revenue)}</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>{formatTHB(commission)}</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Customer Count</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>{customerCount}</CardValue>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={trendData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expiry Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Customer</TH>
                <TH>End Month</TH>
                <TH>Alert</TH>
              </TR>
            </THead>
            <TBody>
              {alerts.map(({ entitlement, alert }) => (
                <TR key={entitlement.id}>
                  <TD>
                    {entitlement.customerName}
                    <div className="text-xs text-slate-400">{entitlement.customerCode}</div>
                  </TD>
                  <TD>{formatMonth(entitlement.endMonth)}</TD>
                  <TD>
                    <Badge variant={ALERT_VARIANT[alert!] ?? "default"}>{alert}</Badge>
                  </TD>
                </TR>
              ))}
              {alerts.length === 0 && (
                <TR>
                  <TD colSpan={3} className="text-center text-slate-400">
                    ไม่มีการแจ้งเตือน
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
