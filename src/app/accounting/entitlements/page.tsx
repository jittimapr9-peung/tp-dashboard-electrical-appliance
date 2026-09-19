import { requireRole } from "@/lib/auth/rbac";
import { EntitlementsPageContent } from "@/components/entitlements/entitlements-page-content";

export default async function AccountingEntitlementsPage() {
  await requireRole("ACCOUNTING", "ADMIN");
  return <EntitlementsPageContent />;
}
