"use client";

import { useActionState } from "react";
import { createEntitlement, type ActionResult } from "@/lib/actions/entitlements";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const initialState: ActionResult = { ok: false };

export function EntitlementForm({
  salesPeople,
}: {
  salesPeople: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(createEntitlement, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
      <div className="space-y-1">
        <Label>Sales</Label>
        <Select name="salesPersonId" required defaultValue="">
          <option value="" disabled>
            -- เลือก Sales --
          </option>
          {salesPeople.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Customer Code</Label>
        <Input name="customerCode" required />
      </div>
      <div className="space-y-1">
        <Label>Customer Name</Label>
        <Input name="customerName" required />
      </div>
      <div className="space-y-1">
        <Label>Entitlement Type</Label>
        <Select name="entitlementType" required defaultValue="NEW_CUSTOMER">
          <option value="NORMAL">NORMAL</option>
          <option value="NEW_CUSTOMER">NEW_CUSTOMER</option>
          <option value="LEGACY_TRANSITION">LEGACY_TRANSITION</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Start Month</Label>
        <Input name="startMonth" type="month" required />
      </div>
      <div className="space-y-1">
        <Label>End Month (NORMAL เท่านั้น — NEW_CUSTOMER คำนวณให้อัตโนมัติ 12 เดือน)</Label>
        <Input name="endMonth" type="month" />
      </div>
      <div className="space-y-1">
        <Label>Legacy Rule ID</Label>
        <Input name="legacyRuleId" placeholder="เว้นว่างถ้าไม่ใช่ Legacy" />
      </div>
      <div className="space-y-1">
        <Label>Legacy Rate (%)</Label>
        <Input name="legacyRatePercent" type="number" step="0.01" placeholder="เช่น 0.60" />
      </div>
      <div className="space-y-1">
        <Label>Source Reference</Label>
        <Input name="sourceReference" />
      </div>
      <div className="sm:col-span-3 space-y-1">
        <Label>Notes</Label>
        <Input name="notes" />
      </div>
      {state.error && <p className="sm:col-span-3 text-sm text-red-600">{state.error}</p>}
      <div className="sm:col-span-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "กำลังบันทึก..." : "เพิ่มเข้า Registry"}
        </Button>
      </div>
    </form>
  );
}
