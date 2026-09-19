import "server-only";

import type { Role } from "@prisma/client";
import { getSession, type SessionPayload } from "./session";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Server-side gate: every Server Action / Route Handler that touches
 * protected data must call this (never trust a client-side role check
 * alone). Throws UnauthorizedError / ForbiddenError which callers should
 * translate to a 401/403 response.
 */
export async function requireRole(
  ...allowedRoles: Role[]
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  if (!allowedRoles.includes(session.role)) {
    throw new ForbiddenError(
      `Role ${session.role} is not permitted to perform this action`,
    );
  }
  return session;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

/**
 * Sales must never see another Sales person's commission/customers/data.
 * Call this whenever a Sales-scoped resource is read or written, passing
 * the salesPersonId the resource belongs to.
 */
export async function requireSelfSalesPersonOrElevated(
  targetSalesPersonId: string,
): Promise<SessionPayload> {
  const session = await requireSession();

  if (session.role === "ADMIN" || session.role === "ACCOUNTING") {
    return session;
  }

  if (session.role === "SALES") {
    if (session.salesPersonId !== targetSalesPersonId) {
      throw new ForbiddenError("Sales cannot view another Sales person's data");
    }
    return session;
  }

  if (session.role === "MANAGEMENT") {
    return session; // Management dashboard is aggregate/read-only by design.
  }

  throw new ForbiddenError();
}
