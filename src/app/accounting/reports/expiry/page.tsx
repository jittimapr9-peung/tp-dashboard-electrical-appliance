import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getEntitlementAlert } from "@/lib/commission-engine";

const ALERT_VARIANT: Record<string, "warning" | "danger" | "default"> = {
  EXPIRING_THIS_MONTH: "warning",
  EXPIRED: "default",
  EXPIRED_WITH_SALES: "danger",
  MISSING_ENTITLEMENT: "warning",
};

export default async function ExpiryReportPage() {
  await requireRole("ACCOUNTING", "ADMIN");

  const now = new Date();
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const entitlements = await prisma.customerEntitlement.findMany({
    include: { salesPerson: true },
    orderBy: { endMonth: "asc" },
  });

  const rows = entitlements
    .map((e) => ({
      entitlement: e,
      alert: getEntitlementAlert(
        { entitlementType: e.entitlementType, startMonth: e.startMonth, endMonth: e.endMonth, status: e.status },
        currentMonth,
        false,
      ),
    }))
    .filter((r) => r.alert !== null);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Entitlement Expiry Report</h1>
      <Table>
        <THead>
          <TR>
            <TH>Sales</TH>
            <TH>Customer</TH>
            <TH>End Month</TH>
            <TH>Alert</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map(({ entitlement, alert }) => (
            <TR key={entitlement.id}>
              <TD>{entitlement.salesPerson.name}</TD>
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
          {rows.length === 0 && (
            <TR>
              <TD colSpan={4} className="text-center text-slate-400">
                ไม่มีรายการแจ้งเตือน
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}
