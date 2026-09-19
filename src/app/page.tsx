import { prisma } from "@/lib/prisma";
import { formatMonth, formatTHB } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";
import { UploadSection } from "@/components/dashboard/upload-section";
import { MarginReviewForm } from "@/components/margin-review/margin-review-form";

// This dashboard reads live commission data straight from the database on
// every visit — it must never be served from a build-time static snapshot.
export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  MISSING_VERIFIED_MARGIN: "ลูกค้า GOV ยังไม่ระบุ Margin",
  MISSING_LEGACY_RULE: "ลูกค้า Legacy ยังไม่มี Rate ที่อนุมัติ",
  POST_EXPIRY_SALES: "ลูกค้าหมดสิทธิ์คอมมิชชั่นแล้ว",
  INVALID_CUSTOMER_TYPE: "ประเภทลูกค้าไม่ถูกต้อง",
};

export default async function HomePage() {
  const [settlements, reviewRequired] = await Promise.all([
    prisma.monthlyCommissionSettlement.findMany({
      include: { salesPerson: true },
      orderBy: [{ commissionMonth: "desc" }, { salesPerson: { name: "asc" } }],
    }),
    prisma.commissionCalculation.findMany({
      where: { reviewStatus: "REVIEW_REQUIRED" },
      include: { salesTransaction: { include: { salesPerson: true } } },
      orderBy: { calculatedAt: "desc" },
      take: 50,
    }),
  ]);

  const byMonth = new Map<string, typeof settlements>();
  for (const s of settlements) {
    const key = s.commissionMonth.toISOString();
    byMonth.set(key, [...(byMonth.get(key) ?? []), s]);
  }
  const months = Array.from(byMonth.entries());
  const latest = months[0];

  const trendData = months
    .slice()
    .reverse()
    .map(([, rows]) => ({
      month: formatMonth(rows[0].commissionMonth),
      revenue: rows.reduce((sum, r) => sum + Number(r.totalRevenue), 0),
      commission: rows.reduce((sum, r) => sum + Number(r.totalFinalCommission), 0),
    }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">TP Logistics — Commission Dashboard</h1>
        <p className="text-sm text-slate-500">อัปโหลด Sales Report รายเดือน แล้วดูค่าคอมมิชชั่นของแต่ละ Sales ได้ทันที</p>
      </div>

      <UploadSection />

      {reviewRequired.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ต้องตรวจสอบก่อน ({reviewRequired.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviewRequired.map((calc) => (
              <div key={calc.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">
                      {calc.salesTransaction.customerName} ({calc.salesTransaction.customerCode})
                    </p>
                    <p className="text-xs text-slate-500">
                      Sales: {calc.salesTransaction.salesPerson?.name ?? calc.salesTransaction.salesPersonNameRaw} ·{" "}
                      {formatMonth(calc.salesTransaction.commissionMonth)} · รายได้:{" "}
                      {formatTHB(Number(calc.salesTransaction.revenue))}
                    </p>
                  </div>
                  <Badge variant="danger">{REASON_LABEL[calc.reviewReason ?? ""] ?? calc.reviewReason}</Badge>
                </div>
                {calc.reviewReason === "MISSING_VERIFIED_MARGIN" && (
                  <div className="mt-2">
                    <MarginReviewForm salesTransactionId={calc.salesTransactionId} />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {latest && (
        <Card>
          <CardHeader>
            <CardTitle>ค่าคอมมิชชั่นเดือน {formatMonth(latest[1][0].commissionMonth)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>รายได้รวม</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardValue>{formatTHB(latest[1].reduce((s, r) => s + Number(r.totalRevenue), 0))}</CardValue>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>ค่าคอมรวม</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardValue>
                    {formatTHB(latest[1].reduce((s, r) => s + Number(r.totalFinalCommission), 0))}
                  </CardValue>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardValue>{latest[1].length}</CardValue>
                </CardContent>
              </Card>
            </div>

            <Table>
              <THead>
                <TR>
                  <TH>Sales</TH>
                  <TH>รายได้</TH>
                  <TH>คอมก่อน Cap</TH>
                  <TH>Cap</TH>
                  <TH>ค่าคอมสุทธิ</TH>
                </TR>
              </THead>
              <TBody>
                {latest[1].map((s) => (
                  <TR key={s.id}>
                    <TD className="font-medium">{s.salesPerson.name}</TD>
                    <TD>{formatTHB(Number(s.totalRevenue))}</TD>
                    <TD>{formatTHB(Number(s.totalCommissionBeforeCap))}</TD>
                    <TD>
                      {s.capStatus === "CAP_APPLIED" ? (
                        <Badge variant="warning">ถึงเพดาน</Badge>
                      ) : (
                        <Badge variant="default">ปกติ</Badge>
                      )}
                    </TD>
                    <TD className="font-semibold">{formatTHB(Number(s.totalFinalCommission))}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>แนวโน้มรายเดือน</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={trendData} />
          </CardContent>
        </Card>
      )}

      {months.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>ประวัติย้อนหลัง</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>เดือน</TH>
                  <TH>Sales</TH>
                  <TH>รายได้</TH>
                  <TH>ค่าคอมสุทธิ</TH>
                </TR>
              </THead>
              <TBody>
                {months.slice(1).flatMap(([, rows]) =>
                  rows.map((s) => (
                    <TR key={s.id}>
                      <TD>{formatMonth(s.commissionMonth)}</TD>
                      <TD>{s.salesPerson.name}</TD>
                      <TD>{formatTHB(Number(s.totalRevenue))}</TD>
                      <TD className="font-medium">{formatTHB(Number(s.totalFinalCommission))}</TD>
                    </TR>
                  )),
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {months.length === 0 && (
        <p className="text-center text-sm text-slate-400">ยังไม่มีข้อมูล — เริ่มจากอัปโหลด Sales Report ด้านบน</p>
      )}
    </div>
  );
}
