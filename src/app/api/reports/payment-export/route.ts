import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatMonth } from "@/lib/utils";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Payment Export. Format is a Config/Placeholder (Generic CSV) — PRD.md
 * section 12 item 11 — until the real Accounting file format is confirmed.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  if (!monthParam) {
    return NextResponse.json({ error: "month query param is required" }, { status: 400 });
  }
  const commissionMonth = new Date(monthParam);

  const settlements = await prisma.monthlyCommissionSettlement.findMany({
    where: { commissionMonth },
    include: { salesPerson: true },
  });

  const header = [
    "Commission Month",
    "Sales Code",
    "Sales Name",
    "Total Revenue",
    "Commission Before Cap",
    "Adjustment",
    "Final Commission",
    "Status",
  ];

  const rows = settlements.map((s) => [
    formatMonth(s.commissionMonth),
    s.salesPerson.code ?? "",
    s.salesPerson.name,
    Number(s.totalRevenue).toFixed(2),
    Number(s.totalCommissionBeforeCap).toFixed(2),
    Number(s.totalAdjustment).toFixed(2),
    Number(s.totalFinalCommission).toFixed(2),
    s.status,
  ]);

  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payment-export-${monthParam}.csv"`,
    },
  });
}
