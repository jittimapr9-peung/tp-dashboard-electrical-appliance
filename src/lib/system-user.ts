import { prisma } from "@/lib/prisma";

const SYSTEM_USER_EMAIL = "admin@tplogistics.local";

/**
 * This app has no login — every mutation still needs a `userId` for the
 * Audit Log / adjustedBy / reviewedBy foreign keys, so they're all
 * attributed to this one seeded account instead of a real session.
 */
export async function getSystemUserId(): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });
  return user.id;
}
