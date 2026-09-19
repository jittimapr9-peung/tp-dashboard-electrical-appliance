import { prisma } from "@/lib/prisma";
import { formatMonth } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EntitlementForm } from "./entitlement-form";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  ACTIVE: "success",
  EXPIRED: "default",
  REVIEW_REQUIRED: "danger",
  PENDING_APPROVAL: "warning",
};

export async function EntitlementsPageContent() {
  const [entitlements, salesPeople] = await Promise.all([
    prisma.customerEntitlement.findMany({
      include: { salesPerson: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.salesPerson.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Customer Commission Entitlement Registry</h1>
        <p className="text-sm text-slate-500">
          ห้าม Hard-code รายชื่อลูกค้าในซอร์สโค้ด — ทุกสิทธิ์ต้องบันทึกที่นี่
        </p>
      </div>

      <EntitlementForm salesPeople={salesPeople} />

      <Table>
        <THead>
          <TR>
            <TH>Sales</TH>
            <TH>Customer</TH>
            <TH>Type</TH>
            <TH>Start</TH>
            <TH>End</TH>
            <TH>Legacy Rule</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {entitlements.map((e) => (
            <TR key={e.id}>
              <TD>{e.salesPerson.name}</TD>
              <TD>
                {e.customerName}
                <div className="text-xs text-slate-400">{e.customerCode}</div>
              </TD>
              <TD>{e.entitlementType}</TD>
              <TD>{formatMonth(e.startMonth)}</TD>
              <TD>{formatMonth(e.endMonth)}</TD>
              <TD>{e.legacyRuleId ?? "-"}</TD>
              <TD>
                <Badge variant={STATUS_VARIANT[e.status] ?? "default"}>{e.status}</Badge>
              </TD>
            </TR>
          ))}
          {entitlements.length === 0 && (
            <TR>
              <TD colSpan={7} className="text-center text-slate-400">
                ยังไม่มีข้อมูลใน Registry
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}
