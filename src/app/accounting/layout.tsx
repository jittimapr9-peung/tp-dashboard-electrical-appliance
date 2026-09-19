import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

const NAV_ITEMS = [
  { href: "/accounting", label: "Dashboard" },
  { href: "/accounting/import", label: "Import" },
  { href: "/accounting/review", label: "Review Queue" },
  { href: "/accounting/margin-review", label: "GOV Margin Review" },
  { href: "/accounting/entitlements", label: "Entitlement Registry" },
  { href: "/accounting/closing", label: "Monthly Closing" },
  { href: "/accounting/reports", label: "Reports" },
];

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      title="Accounting"
      userName={session.name}
      userRole={session.role}
      navItems={NAV_ITEMS}
    >
      {children}
    </AppShell>
  );
}
