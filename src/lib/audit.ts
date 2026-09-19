import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface AuditLogInput {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  reason?: string | null;
}

/** US-030: every mutation to protected business data must be recorded. */
export async function writeAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      reason: input.reason ?? undefined,
    },
  });
}
