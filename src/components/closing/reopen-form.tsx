"use client";

import { useActionState } from "react";
import { reopenMonth } from "@/lib/actions/closing";
import type { ActionResult } from "@/lib/actions/entitlements";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: ActionResult = { ok: false };

export function ReopenForm({ commissionMonth }: { commissionMonth: string }) {
  const [state, formAction, isPending] = useActionState(reopenMonth, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="commissionMonth" value={commissionMonth} />
      <div className="min-w-56 flex-1 space-y-1">
        <Label className="text-xs">Reason (บังคับ)</Label>
        <Input name="reason" required placeholder="เหตุผลในการ Reopen" />
      </div>
      <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
        {isPending ? "..." : "Reopen"}
      </Button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
