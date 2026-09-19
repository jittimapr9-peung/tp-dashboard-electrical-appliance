import { requireRole } from "@/lib/auth/rbac";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage() {
  await requireRole("ACCOUNTING", "ADMIN");

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Import Sales Report</h1>
      <p className="text-sm text-slate-500">
        Upload → Select Month → Select Sheet → Column Mapping → Preview → Validation → Confirm → Calculate
      </p>
      <ImportWizard />
    </div>
  );
}
