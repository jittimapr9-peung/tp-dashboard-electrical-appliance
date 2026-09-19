import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { CONFIG_PLACEHOLDERS } from "@/lib/commission-engine";
import { Card, CardContent, CardHeader, CardTitle, CardValue } from "@/components/ui/card";

export default async function AdminHomePage() {
  await requireRole("ADMIN");

  const [pendingReview, activeEntitlements, userCount] = await Promise.all([
    prisma.commissionCalculation.count({ where: { reviewStatus: "REVIEW_REQUIRED" } }),
    prisma.customerEntitlement.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Admin Overview</h1>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>{pendingReview}</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Entitlements</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>{activeEntitlements}</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>{userCount}</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>รอยืนยัน Business Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>{CONFIG_PLACEHOLDERS.length}</CardValue>
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-slate-500">
        ดูรายละเอียดที่ยังไม่ยืนยันได้ที่{" "}
        <Link className="underline" href="/admin/configuration">
          Admin → Configuration
        </Link>
      </p>
    </div>
  );
}
