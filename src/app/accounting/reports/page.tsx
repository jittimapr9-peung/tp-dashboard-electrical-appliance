import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REPORTS = [
  { href: "/accounting/reports/summary", label: "Monthly Commission Summary", desc: "Revenue, Commission Before Cap, Adjustment, Final Commission ต่อ Sales" },
  { href: "/accounting/reports/detail", label: "Commission Detail", desc: "รายละเอียดต่อ Transaction พร้อม Policy Version" },
  { href: "/accounting/reports/exceptions", label: "Accounting Review / Exception Report", desc: "Missing Margin, Expired Entitlement, Missing Legacy Rule, Invalid Data, Duplicate" },
  { href: "/accounting/reports/expiry", label: "Entitlement Expiry Report", desc: "ลูกค้าที่กำลังจะหมด/หมดสิทธิ์แล้ว" },
  { href: "/accounting/reports/payment-export", label: "Payment Export", desc: "Export ข้อมูลคอมมิชชั่นที่ Finalize แล้ว (CSV)" },
];

export default async function ReportsIndexPage() {
  await requireRole("ACCOUNTING", "ADMIN");

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Reports</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full hover:border-slate-400">
              <CardHeader>
                <CardTitle className="text-slate-900">{r.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">{r.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
