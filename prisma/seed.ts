import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CONFIG_PLACEHOLDERS } from "../src/lib/commission-engine/config-placeholders";
import { ACTIVE_POLICY_VERSION, MONTHLY_COMMISSION_CAP, STANDARD_RATE } from "../src/lib/commission-engine/policy";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "ChangeMe123!";

const SALES_TEAM = [
  { code: "SP-01", name: "นางสาววรุณรัตน์ มีศิลสัตย์", email: "warunrat@tplogistics.local" },
  { code: "SP-02", name: "นางสาวอนงค์ลักษณ์ ผลสิทธิ์", email: "anonglak@tplogistics.local" },
  { code: "SP-03", name: "นางสาวจิตติมา ประสพ", email: "jittima@tplogistics.local" },
  { code: "SP-04", name: "นางสาวมัญชริน ประสิทธิ์เมตต์", email: "manchirin@tplogistics.local" },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // --- Commission Policy Version -------------------------------------
  const policy = await prisma.commissionPolicyVersion.upsert({
    where: { versionCode: ACTIVE_POLICY_VERSION },
    create: {
      versionCode: ACTIVE_POLICY_VERSION,
      effectiveFrom: new Date(Date.UTC(2026, 0, 1)),
      isActive: true,
      notes: "Confirmed rates from Specification v1.0 (PRD.md section 4).",
      rules: {
        create: [
          {
            ruleType: "STANDARD_RATE",
            customerType: "B2C",
            rate: STANDARD_RATE,
            description: "B2C standard commission rate",
          },
          {
            ruleType: "STANDARD_RATE",
            customerType: "B2B_PRIVATE",
            rate: STANDARD_RATE,
            description: "B2B-Private standard commission rate",
          },
          {
            ruleType: "STANDARD_RATE",
            customerType: "SME",
            rate: STANDARD_RATE,
            description: "SME standard commission rate",
          },
          {
            ruleType: "GOV_MARGIN_TIER",
            customerType: "B2B_GOV",
            marginMin: 0.20,
            rate: 0.008,
            description: "GOV margin > 20% -> 0.80% (exclusive lower bound)",
          },
          {
            ruleType: "GOV_MARGIN_TIER",
            customerType: "B2B_GOV",
            marginMin: 0.10,
            marginMax: 0.20,
            rate: 0.005,
            description: "GOV margin 10%-20% inclusive -> 0.50%",
          },
          {
            ruleType: "GOV_MARGIN_TIER",
            customerType: "B2B_GOV",
            marginMax: 0.10,
            rate: 0.0025,
            description: "GOV margin < 10% -> 0.25%",
          },
          {
            ruleType: "COMMISSION_CAP",
            capAmount: MONTHLY_COMMISSION_CAP,
            description: "Monthly commission cap per Sales person",
          },
          ...CONFIG_PLACEHOLDERS.map((placeholder) => ({
            ruleType: "CONFIG_PLACEHOLDER" as const,
            configKey: placeholder.key,
            configValue: placeholder.defaultValue,
            requiresConfirmation: true,
            description: `${placeholder.label} — ${placeholder.description}`,
          })),
        ],
      },
    },
    update: {},
  });

  // --- Users: Admin / Accounting / Management -------------------------
  await prisma.user.upsert({
    where: { email: "admin@tplogistics.local" },
    create: {
      email: "admin@tplogistics.local",
      passwordHash,
      name: "System Admin",
      role: "ADMIN",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "accounting@tplogistics.local" },
    create: {
      email: "accounting@tplogistics.local",
      passwordHash,
      name: "Accounting Team",
      role: "ACCOUNTING",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "management@tplogistics.local" },
    create: {
      email: "management@tplogistics.local",
      passwordHash,
      name: "Management",
      role: "MANAGEMENT",
    },
    update: {},
  });

  // --- Sales Team + linked Sales user accounts -------------------------
  for (const sp of SALES_TEAM) {
    const salesPerson = await prisma.salesPerson.upsert({
      where: { code: sp.code },
      create: { code: sp.code, name: sp.name },
      update: { name: sp.name },
    });

    await prisma.user.upsert({
      where: { email: sp.email },
      create: {
        email: sp.email,
        passwordHash,
        name: sp.name,
        role: "SALES",
        salesPersonId: salesPerson.id,
      },
      update: { salesPersonId: salesPerson.id },
    });
  }

  console.log(`Seed complete. Policy version: ${policy.versionCode}`);
  console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD} (change immediately).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
