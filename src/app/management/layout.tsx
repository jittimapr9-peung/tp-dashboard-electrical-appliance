import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

const NAV_ITEMS = [{ href: "/management", label: "Dashboard" }];

export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      title="Management"
      userName={session.name}
      userRole={session.role}
      navItems={NAV_ITEMS}
    >
      {children}
    </AppShell>
  );
}
