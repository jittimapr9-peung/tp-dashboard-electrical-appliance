import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Temporary deploy-diagnostic endpoint — exposes counts only, never
 * secrets (no password hashes, no env values). Remove once the first
 * production deploy is confirmed healthy.
 */
export async function GET() {
  try {
    const [userCount, users, salesPersonCount, policyVersion] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({ select: { email: true, role: true, isActive: true } }),
      prisma.salesPerson.count(),
      prisma.commissionPolicyVersion.findFirst({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      ok: true,
      databaseUrlHost: process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] ?? null,
      userCount,
      users,
      salesPersonCount,
      policyVersionCode: policyVersion?.versionCode ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
