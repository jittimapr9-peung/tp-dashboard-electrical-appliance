"use client";

import { useActionState } from "react";
import { createAdjustment } from "@/lib/actions/adjustments";
import { ADJUSTMENT_REASON_CODES } from "@/lib/validation/adjustment";
import type { ActionResult } from "@/lib/actions/entitlements";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const initialState: ActionResult = { ok: false };

export function AdjustmentForm({ commissionCalculationId }: { commissionCalculationId: string }) {
  const [state, formAction, isPending] = useActionState(createAdjustment, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-2">
      <input type="hidden" name="commissionCalculationId" value={commissionCalculationId} />
      <div className="space-y-1">
        <Label className="text-xs">Amount (+/-)</Label>
        <Input name="amount" type="number" step="0.01" required className="w-28" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Reason Code</Label>
        <Select name="reasonCode" required defaultValue="" className="w-48">
          <option value="" disabled>
            -- เลือก --
          </option>
          {ADJUSTMENT_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-40 flex-1 space-y-1">
        <Label className="text-xs">Reason Text</Label>
        <Input name="reasonText" required />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "..." : "Adjust"}
      </Button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
