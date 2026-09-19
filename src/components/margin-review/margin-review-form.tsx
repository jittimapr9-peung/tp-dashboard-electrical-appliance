"use client";

import { useActionState } from "react";
import { verifyMargin } from "@/lib/actions/margin-review";
import type { ActionResult } from "@/lib/actions/entitlements";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: ActionResult = { ok: false };

export function MarginReviewForm({ salesTransactionId }: { salesTransactionId: string }) {
  const [state, formAction, isPending] = useActionState(verifyMargin, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-2">
      <input type="hidden" name="salesTransactionId" value={salesTransactionId} />
      <div className="space-y-1">
        <Label className="text-xs">Margin (%)</Label>
        <Input name="marginPercent" type="number" step="0.01" required className="w-28" />
      </div>
      <div className="min-w-40 flex-1 space-y-1">
        <Label className="text-xs">Notes</Label>
        <Input name="notes" />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "..." : "Verify Margin"}
      </Button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
