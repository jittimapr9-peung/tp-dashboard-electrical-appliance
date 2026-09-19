import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function AuditLogPage() {
  await requireRole("ADMIN");

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { timestamp: "desc" },
    take: 300,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-500">US-030 — บันทึกทุกการเปลี่ยนแปลงข้อมูลสำคัญ</p>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>เวลา</TH>
            <TH>ผู้ใช้</TH>
            <TH>Action</TH>
            <TH>Entity</TH>
            <TH>Entity ID</TH>
            <TH>เหตุผล</TH>
          </TR>
        </THead>
        <TBody>
          {logs.map((log) => (
            <TR key={log.id}>
              <TD className="whitespace-nowrap">{log.timestamp.toISOString()}</TD>
              <TD>{log.user.name}</TD>
              <TD>{log.action}</TD>
              <TD>{log.entity}</TD>
              <TD className="max-w-40 truncate">{log.entityId}</TD>
              <TD>{log.reason ?? "-"}</TD>
            </TR>
          ))}
          {logs.length === 0 && (
            <TR>
              <TD colSpan={6} className="text-center text-slate-400">
                ยังไม่มีบันทึก
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}
