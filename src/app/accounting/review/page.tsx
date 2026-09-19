import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatMonth, formatTHB } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { MarginReviewForm } from "@/components/margin-review/margin-review-form";

const REASON_LABEL: Record<string, string> = {
  MISSING_VERIFIED_MARGIN: "GOV without Verified Margin",
  MISSING_LEGACY_RULE: "Legacy without Approved Rule",
  POST_EXPIRY_SALES: "Post-expiry Sales",
  INVALID_CUSTOMER_TYPE: "Invalid Customer Type",
};

const IMPORT_ERROR_LABEL: Record<string, string> = {
  MISSING_DATE: "ไม่มีวันที่",
  MISSING_SALES: "ไม่มี Sales",
  SALES_NOT_FOUND: "ไม่พบชื่อ Sales ในระบบ",
  MISSING_CUSTOMER_CODE: "ไม่มี Customer Code",
  MISSING_CUSTOMER_NAME: "ไม่มี Customer Name",
  MISSING_CUSTOMER_TYPE: "ไม่มีประเภทลูกค้า",
  INVALID_CUSTOMER_TYPE: "ประเภทลูกค้าไม่ถูกต้อง",
  INVALID_REVENUE: "รายได้ไม่ถูกต้อง",
  DUPLICATE_ROW: "ข้อมูลซ้ำในไฟล์",
};

export default async function ReviewQueuePage() {
  await requireRole("ACCOUNTING", "ADMIN");

  const [reviewRequired, invalidRows] = await Promise.all([
    prisma.commissionCalculation.findMany({
      where: { reviewStatus: "REVIEW_REQUIRED" },
      include: {
        salesTransaction: { include: { salesPerson: true } },
      },
      orderBy: { calculatedAt: "desc" },
      take: 200,
    }),
    prisma.salesTransaction.findMany({
      where: { status: { in: ["INVALID", "DUPLICATE"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Review Queue</h1>
        <p className="text-sm text-slate-500">
          US-018 — รายการที่ต้องดำเนินการก่อน Finalize เดือนได้
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exceptions ต้อง Review ({reviewRequired.length})</CardTitle>
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
                    {formatMonth(calc.salesTransaction.commissionMonth)} · Revenue: {formatTHB(Number(calc.salesTransaction.revenue))}
                  </p>
                </div>
                <Badge variant="danger">{REASON_LABEL[calc.reviewReason ?? ""] ?? calc.reviewReason}</Badge>
              </div>
              {calc.reviewReason === "MISSING_VERIFIED_MARGIN" && (
                <div className="mt-2">
                  <MarginReviewForm salesTransactionId={calc.salesTransactionId} />
                </div>
              )}
              {calc.reviewReason === "MISSING_LEGACY_RULE" && (
                <p className="mt-2 text-xs text-slate-500">
                  แก้ไขได้ที่{" "}
                  <a className="underline" href="/accounting/entitlements">
                    Entitlement Registry
                  </a>{" "}
                  โดยเพิ่ม Legacy Rule ID และ Legacy Rate ที่อนุมัติแล้ว
                </p>
              )}
              {calc.reviewReason === "POST_EXPIRY_SALES" && (
                <p className="mt-2 text-xs text-slate-500">
                  ลูกค้าหมดสิทธิ์คอมมิชชั่นแล้วแต่ยังมียอดขายเกิดขึ้น — ตรวจสอบที่{" "}
                  <a className="underline" href="/accounting/entitlements">
                    Entitlement Registry
                  </a>
                </p>
              )}
            </div>
          ))}
          {reviewRequired.length === 0 && (
            <p className="text-sm text-slate-400">ไม่มีรายการที่ต้อง Review</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Validation Errors ({invalidRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Row</TH>
                <TH>Customer</TH>
                <TH>Sales (raw)</TH>
                <TH>สถานะ</TH>
                <TH>ปัญหา</TH>
              </TR>
            </THead>
            <TBody>
              {invalidRows.map((row) => (
                <TR key={row.id}>
                  <TD>{row.rowNumber}</TD>
                  <TD>{row.customerName || row.customerCode || "-"}</TD>
                  <TD>{row.salesPersonNameRaw}</TD>
                  <TD>
                    <Badge variant={row.status === "DUPLICATE" ? "warning" : "danger"}>{row.status}</Badge>
                  </TD>
                  <TD>
                    {((row.validationErrors as string[] | null) ?? [])
                      .map((e) => IMPORT_ERROR_LABEL[e] ?? e)
                      .join(", ")}
                  </TD>
                </TR>
              ))}
              {invalidRows.length === 0 && (
                <TR>
                  <TD colSpan={5} className="text-center text-slate-400">
                    ไม่มีข้อมูล Import ที่มีปัญหา
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
