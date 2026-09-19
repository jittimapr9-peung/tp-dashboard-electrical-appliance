"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getSystemUserId } from "@/lib/system-user";
import { recalculateTransaction } from "@/lib/actions/calculation";
import { recalculateSettlementsForMonth } from "@/lib/actions/closing";
import type { ActionResult } from "@/lib/actions/types";

const verifyMarginSchema = z.object({
  salesTransactionId: z.string().min(1),
  marginPercent: z.coerce.number(),
  notes: z.string().trim().optional(),
});

/**
 * The system never computes GOV Margin itself — it only records what
 * gets confirmed here, then re-runs the commission calculation.
 */
export async function verifyMargin(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getSystemUserId();

  const parsed = verifyMarginSchema.safeParse({
    salesTransactionId: formData.get("salesTransactionId"),
    marginPercent: formData.get("marginPercent"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { salesTransactionId, marginPercent, notes } = parsed.data;

  const existing = await prisma.marginReview.findUnique({
    where: { salesTransactionId },
  });

  const review = await prisma.marginReview.upsert({
    where: { salesTransactionId },
    create: {
      salesTransactionId,
      margin: marginPercent,
      verified: true,
      reviewedById: userId,
      reviewedAt: new Date(),
      notes,
    },
    update: {
      margin: marginPercent,
      verified: true,
      reviewedById: userId,
      reviewedAt: new Date(),
      notes,
    },
  });

  await writeAuditLog({
    userId,
    action: existing ? "UPDATE" : "CREATE",
    entity: "MarginReview",
    entityId: review.id,
    oldValue: existing ? JSON.parse(JSON.stringify(existing)) : null,
    newValue: JSON.parse(JSON.stringify(review)),
    reason: "GOV Margin verified",
  });

  await recalculateTransaction(salesTransactionId, userId);

  const transaction = await prisma.salesTransaction.findUnique({
    where: { id: salesTransactionId },
    select: { commissionMonth: true },
  });
  if (transaction) {
    await recalculateSettlementsForMonth(transaction.commissionMonth);
  }

  revalidatePath("/");
  return { ok: true };
}
