"use client";

import { useActionState } from "react";
import { finalizeMonth, markMonthPaid, moveMonthToAccountingReview } from "@/lib/actions/closing";
import type { ActionResult } from "@/lib/actions/entitlements";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { ok: false };

function ActionButton({
  action,
  commissionMonth,
  label,
}: {
  action: typeof finalizeMonth;
  commissionMonth: string;
  label: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="inline-block">
      <input type="hidden" name="commissionMonth" value={commissionMonth} />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "..." : label}
      </Button>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export function ClosingActions({ commissionMonth, status }: { commissionMonth: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === "CALCULATED" && (
        <ActionButton action={moveMonthToAccountingReview} commissionMonth={commissionMonth} label="เริ่ม Accounting Review" />
      )}
      {status === "ACCOUNTING_REVIEW" && (
        <ActionButton action={finalizeMonth} commissionMonth={commissionMonth} label="Finalize" />
      )}
      {status === "FINALIZED" && (
        <ActionButton action={markMonthPaid} commissionMonth={commissionMonth} label="Mark Paid" />
      )}
    </div>
  );
}
