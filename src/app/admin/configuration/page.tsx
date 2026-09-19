import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { CONFIG_PLACEHOLDERS } from "@/lib/commission-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function AdminConfigurationPage() {
  await requireRole("ADMIN");

  const policy = await prisma.commissionPolicyVersion.findFirst({
    where: { isActive: true },
    include: { rules: true },
    orderBy: { effectiveFrom: "desc" },
  });

  const confirmedRules = policy?.rules.filter((r) => !r.requiresConfirmation) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Admin Configuration</h1>
        <p className="text-sm text-slate-500">
          Policy Version ปัจจุบัน: <Badge variant="info">{policy?.versionCode ?? "-"}</Badge>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Confirmed Rules (จาก Specification)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Rule Type</TH>
                <TH>Customer Type</TH>
                <TH>Margin Range</TH>
                <TH>Rate / Cap</TH>
                <TH>คำอธิบาย</TH>
              </TR>
            </THead>
            <TBody>
              {confirmedRules.map((r) => (
                <TR key={r.id}>
                  <TD>{r.ruleType}</TD>
                  <TD>{r.customerType ?? "-"}</TD>
                  <TD>
                    {r.marginMin != null || r.marginMax != null
                      ? `${r.marginMin != null ? `${Number(r.marginMin) * 100}%` : ""} - ${r.marginMax != null ? `${Number(r.marginMax) * 100}%` : "∞"}`
                      : "-"}
                  </TD>
                  <TD>{r.rate != null ? `${Number(r.rate) * 100}%` : r.capAmount != null ? Number(r.capAmount).toLocaleString() : "-"}</TD>
                  <TD>{r.description}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production Decisions — รอยืนยัน (ห้ามเดา)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CONFIG_PLACEHOLDERS.map((p) => (
            <div key={p.key} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-800">{p.label}</p>
                <Badge variant="warning">ต้องยืนยัน</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">{p.description}</p>
              <p className="mt-1 text-xs text-slate-400">Default: {p.defaultValue}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
