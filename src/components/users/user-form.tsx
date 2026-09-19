"use client";

import { useActionState } from "react";
import { createUser } from "@/lib/actions/users";
import type { ActionResult } from "@/lib/actions/entitlements";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const initialState: ActionResult = { ok: false };

export function UserForm({ salesPeople }: { salesPeople: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(createUser, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label>ชื่อ</Label>
        <Input name="name" required />
      </div>
      <div className="space-y-1">
        <Label>อีเมล</Label>
        <Input name="email" type="email" required />
      </div>
      <div className="space-y-1">
        <Label>บทบาท</Label>
        <Select name="role" required defaultValue="SALES">
          <option value="ADMIN">ADMIN</option>
          <option value="ACCOUNTING">ACCOUNTING</option>
          <option value="SALES">SALES</option>
          <option value="MANAGEMENT">MANAGEMENT</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Sales (เฉพาะ role = SALES)</Label>
        <Select name="salesPersonId" defaultValue="">
          <option value="">-- ไม่ระบุ --</option>
          {salesPeople.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label>รหัสผ่านเริ่มต้น</Label>
        <Input name="password" type="password" required minLength={8} />
      </div>
      {state.error && <p className="sm:col-span-2 text-sm text-red-600">{state.error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
        </Button>
      </div>
    </form>
  );
}
