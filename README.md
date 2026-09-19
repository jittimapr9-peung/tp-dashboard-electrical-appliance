# TP Logistics Sales Commission System

ระบบคำนวณ ตรวจสอบ และสรุปค่าคอมมิชชั่นฝ่ายขาย บริษัท ไทยพาร์เซิลโลจิสติกส์ จำกัด

- ข้อกำหนดโครงการ: [`PRD.md`](./PRD.md)
- User Stories: [`userstory.md`](./userstory.md)

## Tech Stack

Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL + Prisma ·
Zod · xlsx (SheetJS) · Recharts · Vitest

## Getting Started

```bash
npm install
cp .env.example .env   # then set DATABASE_URL and AUTH_SECRET

npx prisma migrate dev --name init
npm run db:seed

npm run dev
```

`npm run db:seed` creates the Commission Policy (COMMISSION-2026-V1), the
4 Sales team members, and one login per role. Every seeded account uses
the password `ChangeMe123!` — change it immediately outside of local
development.

| Role | Email |
|---|---|
| Admin | admin@tplogistics.local |
| Accounting | accounting@tplogistics.local |
| Management | management@tplogistics.local |
| Sales | warunrat@tplogistics.local, anonglak@tplogistics.local, jittima@tplogistics.local, manchirin@tplogistics.local |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest suite, including the 12 Mandatory Tests |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed policy version, Sales team, and role accounts |

## Business rules still pending confirmation

This project never guesses an unconfirmed business rule. Everything
listed in **PRD.md §12** (GOV Margin formula/source, exact Legacy rate,
whether the cap applies to Legacy, the "6 months inactive" definition,
VAT/discount/credit-note/refund treatment, commission date basis,
multiple Sales owners per customer, payment export format, management
visibility) ships as an explicit Config/Placeholder — visible at
**Admin → Configuration** — and must be confirmed by the business before
Production use.

## Legacy assets

`legacy-assets/` holds the pre-existing electrical-appliance factory
dashboard HTML file from this repository's previous, unrelated project;
it is kept for reference and is not part of the Commission System.
