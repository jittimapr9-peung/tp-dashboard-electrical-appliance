"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { createUserSchema } from "@/lib/validation/user";
import type { ActionResult } from "@/lib/actions/entitlements";

/** ADMIN — Manage users (PRD.md section 2). */
export async function createUser(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    salesPersonId: formData.get("salesPersonId") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const data = parsed.data;

  if (data.role === "SALES" && !data.salesPersonId) {
    return { ok: false, error: "ต้องเลือก Sales ที่จะผูกกับบัญชีนี้" };
  }

  const passwordHash = await hashPassword(data.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        passwordHash,
        salesPersonId: data.role === "SALES" ? data.salesPersonId : null,
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
      reason: "User created by Admin",
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { ok: false, error: "อีเมลนี้ถูกใช้แล้ว" };
    }
    throw err;
  }

  revalidatePath("/admin/users");
  return { ok: true };
}
