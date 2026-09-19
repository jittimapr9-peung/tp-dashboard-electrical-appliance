import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, type SessionPayload } from "@/lib/auth/session";

const ROLE_PREFIXES: Record<string, SessionPayload["role"][]> = {
  "/admin": ["ADMIN"],
  "/accounting": ["ADMIN", "ACCOUNTING"],
  "/sales": ["ADMIN", "SALES"],
  "/management": ["ADMIN", "MANAGEMENT"],
};

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

async function readSession(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const session = await readSession(request);

  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!matchedPrefix) {
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const allowedRoles = ROLE_PREFIXES[matchedPrefix];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/accounting/:path*", "/sales/:path*", "/management/:path*"],
};
