import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

const NAV_ITEMS = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/entitlements", label: "Entitlement Registry" },
  { href: "/admin/periods", label: "Monthly Periods / Reopen" },
  { href: "/admin/users", label: "Users & Sales" },
  { href: "/admin/configuration", label: "Configuration" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      title="Admin"
      userName={session.name}
      userRole={session.role}
      navItems={NAV_ITEMS}
    >
      {children}
    </AppShell>
  );
}
