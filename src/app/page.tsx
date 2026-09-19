import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  ACCOUNTING: "/accounting",
  SALES: "/sales",
  MANAGEMENT: "/management",
};

export default async function Home() {
  const session = await getSession();
  redirect(session ? (ROLE_HOME[session.role] ?? "/login") : "/login");
}
