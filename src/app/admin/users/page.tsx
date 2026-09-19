import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { UserForm } from "@/components/users/user-form";

export default async function AdminUsersPage() {
  await requireRole("ADMIN");

  const [users, salesPeople] = await Promise.all([
    prisma.user.findMany({ include: { salesPerson: true }, orderBy: { createdAt: "asc" } }),
    prisma.salesPerson.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Users & Sales</h1>
        <p className="text-sm text-slate-500">US-001/US-002 — จัดการผู้ใช้และบทบาท</p>
      </div>

      <UserForm salesPeople={salesPeople} />

      <Table>
        <THead>
          <TR>
            <TH>ชื่อ</TH>
            <TH>อีเมล</TH>
            <TH>บทบาท</TH>
            <TH>Sales ที่ผูก</TH>
            <TH>สถานะ</TH>
          </TR>
        </THead>
        <TBody>
          {users.map((u) => (
            <TR key={u.id}>
              <TD>{u.name}</TD>
              <TD>{u.email}</TD>
              <TD>
                <Badge variant="info">{u.role}</Badge>
              </TD>
              <TD>{u.salesPerson?.name ?? "-"}</TD>
              <TD>
                <Badge variant={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Inactive"}</Badge>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
