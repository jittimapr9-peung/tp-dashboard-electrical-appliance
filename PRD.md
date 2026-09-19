# Product Requirements Document (PRD)
## TP Logistics Sales Commission System

**บริษัท:** ไทยพาร์เซิลโลจิสติกส์ จำกัด
**เวอร์ชันเอกสาร:** 1.0 (Phase 1)
**สถานะ:** Draft — รอการยืนยัน Business Rule บางส่วนก่อนขึ้น Production (ดูหัวข้อ 12)

---

## 1. ภาพรวมโครงการ (Overview)

ระบบคำนวณ ตรวจสอบ และสรุปค่าคอมมิชชั่นฝ่ายขาย (Sales Commission) ของบริษัท
ไทยพาร์เซิลโลจิสติกส์ จำกัด โดยรับข้อมูลจาก Sales Report รายเดือน คำนวณ
คอมมิชชั่นตามนโยบายที่กำหนด (Commission Policy) ตรวจสอบข้อยกเว้น (Exception)
ให้ฝ่ายบัญชีตรวจทาน ปรับปรุง (Adjustment) และปิดยอดรายเดือน (Monthly
Closing) พร้อมเก็บ Audit Log ครบถ้วนเพื่อรองรับการตรวจสอบย้อนหลัง

### 1.1 เป้าหมาย (Goals)

- ลดความผิดพลาดจากการคำนวณคอมมิชชั่นด้วยมือ (Excel)
- สร้างความโปร่งใสระหว่างฝ่ายขาย ฝ่ายบัญชี และผู้บริหาร
- รองรับกฎที่ซับซ้อน (GOV Margin, New Customer, Legacy/Transition, Cap)
  โดยไม่ Hard-code ข้อมูลลูกค้าในซอร์สโค้ด
- เก็บ Audit Trail ทุกการเปลี่ยนแปลงเพื่อรองรับการตรวจสอบ (Audit)
- แยก Business Rule ที่ยังไม่ยืนยันออกเป็น Configuration/Placeholder
  อย่างชัดเจน เพื่อไม่ให้ระบบ "เดา" กฎทางธุรกิจ

### 1.2 ขอบเขต Phase 1

- Import Sales Report (Excel) เป็นแหล่งข้อมูลหลัก (ไม่มี Customer Master
  เต็มรูปแบบ)
- คำนวณคอมมิชชั่นตามประเภทลูกค้า (B2C, B2B-Private, SME, B2B-GOV)
- Customer Commission Entitlement Registry (New Customer / Legacy)
- GOV Margin Review workflow
- Commission Cap (20,000 บาท/Sales/เดือน)
- Accounting Adjustment
- Monthly Closing Workflow (DRAFT → CALCULATED → ACCOUNTING_REVIEW →
  FINALIZED → PAID) พร้อม Reopen
- Dashboard (Accounting / Sales / Management)
- Reports (Summary, Detail, Exception, Expiry, Payment Export)
- Audit Log
- RBAC 4 บทบาท: Admin, Accounting, Sales, Management

### 1.3 ขอบเขต Phase 2 (ไม่รวมใน Phase 1)

- Commission Approval Memo (DOCX/PDF พร้อมลายเซ็น CFO/CEO)
- Import ไฟล์ GOV Margin ที่อนุมัติแล้วโดยตรง
- Advanced Customer Master
- Payment File ตาม Format จริงของฝ่ายบัญชี

---

## 2. ผู้ใช้งานและบทบาท (Roles)

| Role | ความรับผิดชอบหลัก |
|---|---|
| **ADMIN** | จัดการ Users, Sales, Commission Policy, Customer Entitlement, รอบเดือน, Reopen รอบที่ Finalize แล้ว, ดู Audit Log |
| **ACCOUNTING** | Upload Sales Report, ตรวจสอบข้อมูล, Review GOV Margin, Review Commission, ทำ Adjustment, Finalize รอบเดือน, Export ข้อมูลจ่ายเงิน |
| **SALES** | ดูยอดขาย/คอมมิชชั่น/ลูกค้า/สิทธิ์/แจ้งเตือนหมดสิทธิ์ **ของตนเองเท่านั้น** |
| **MANAGEMENT** | ดู Dashboard ภาพรวม: Total Revenue, Total Commission, Commission by Sales, Commission by Customer Type, Exceptions |

**กฎสำคัญ:** Sales ต้องไม่สามารถเห็นคอมมิชชั่นของ Sales คนอื่นได้ ต้องบังคับใช้
ที่ Server-side ทุกจุด (ไม่พึ่งพา UI ปิดบังอย่างเดียว)

รายชื่อฝ่ายขาย (Sales Team) เริ่มต้น:
1. นางสาววรุณรัตน์ มีศิลสัตย์
2. นางสาวอนงค์ลักษณ์ ผลสิทธิ์
3. นางสาวจิตติมา ประสพ
4. นางสาวมัญชริน ประสิทธิ์เมตต์

---

## 3. แหล่งข้อมูล (Data Source) — Sales Report

Phase 1 ใช้ Sales Report เป็นแหล่งข้อมูลหลัก ไม่มีการสร้าง Customer Master
เต็มรูปแบบ คอลัมน์ต้นทาง:

| คอลัมน์ | คำอธิบาย |
|---|---|
| วันที่ | วันที่ขาย/วันที่ในรายงาน |
| Sales | ชื่อพนักงานขาย |
| Customer Code | รหัสลูกค้า |
| Customer Name | ชื่อลูกค้า |
| ประเภทลูกค้า | B2C / B2B-Private / SME / B2B-GOV |
| รายได้/ยอดขาย | Revenue ที่ใช้คำนวณคอมมิชชั่น |

---

## 4. Commission Rules

### 4.1 Standard Rate

| ประเภทลูกค้า | Commission Rate |
|---|---|
| B2C | 0.50% |
| B2B - Private | 0.50% |
| SME | 0.50% |

**สูตร:** `Commission = Revenue × Commission Rate`

### 4.2 GOV Commission (B2B-GOV)

ใช้ Margin ที่ผ่านการ Verify แล้วเป็นตัวกำหนด Rate:

| Margin | Rate |
|---|---|
| Margin > 20% | 0.80% |
| Margin 10% – 20% (รวมขอบเขต) | 0.50% |
| Margin < 10% | 0.25% |

**Boundary (ยืนยันแล้ว):**
- Margin = 20% → 0.50%
- Margin = 10% → 0.50%

**ห้ามระบบเดา Margin** — หากไม่มี Verified Margin ให้สถานะรายการเป็น
`REVIEW_REQUIRED` และไม่คำนวณคอมมิชชั่นจนกว่าจะมีการ Verify

### 4.3 Commission Cap

- Cap = 20,000 บาท / Sales / เดือน
- ระบบต้องเก็บ: Commission Before Cap, Cap Amount, Capped Amount,
  Final Commission, Cap Status (`CAP_APPLIED` เมื่อ Before Cap > 20,000)
- **Placeholder ที่ต้องยืนยัน:** Cap มีผลกับ Legacy Commission หรือไม่
  (ดูหัวข้อ 12.3) — ค่าเริ่มต้นของระบบ (Config) กำหนดให้ Cap มีผลกับทุก
  ประเภทจนกว่าจะมีการยืนยันเป็นอย่างอื่น และสามารถเปลี่ยนค่าได้ผ่าน Admin
  Configuration โดยไม่ต้องแก้โค้ด

---

## 5. New Customer Entitlement

**นิยาม New Customer:**
1. ลูกค้าที่ไม่เคยใช้บริการมาก่อน หรือ
2. ลูกค้าที่หยุดใช้บริการเกิน 6 เดือน (นิยามที่แน่ชัดของ "หยุดใช้บริการ"
   ยังไม่ยืนยัน — ดูหัวข้อ 12.4 — ใช้ค่า Config เริ่มต้นคือ "ไม่มี Sales
   Transaction ของลูกค้ารายนั้นติดต่อกัน ≥ 6 เดือนปฏิทิน")

**สิทธิ์:** Commission 12 เดือน นับจากเดือนเริ่มใช้บริการ
ตัวอย่าง: Start Month = June 2026 → End Month = May 2027

### 5.1 2026 Transition Rule

ลูกค้าที่เริ่มใช้บริการในปี 2026 และอยู่ภายใต้สิทธิ์เดิม (Legacy) จะได้รับ
สิทธิ์ครบ 12 เดือนเสมอ แม้สิทธิ์จะข้ามไปถึงปี 2027 (เช่น Start = June 2026,
End = May 2027)

### 5.2 Entitlement Alert

ระบบต้องรองรับสถานะแจ้งเตือน:

| สถานะ | ความหมาย |
|---|---|
| `EXPIRING_THIS_MONTH` | สิทธิ์จะหมดอายุในเดือนปัจจุบัน |
| `EXPIRED` | สิทธิ์หมดอายุแล้ว (ยังไม่มียอดขายหลังหมดอายุ) |
| `EXPIRED_WITH_SALES` | สิทธิ์หมดอายุแล้ว แต่มียอดขายเกิดขึ้นหลังหมดอายุ |
| `MISSING_ENTITLEMENT` | ไม่มีข้อมูลสิทธิ์ของลูกค้ารายนี้ในระบบ |

---

## 6. Legacy / Transition — Customer Commission Entitlement Registry

**ห้าม Hard-code รายชื่อลูกค้าใน Source Code** ทุกสิทธิ์ต้องเก็บใน
Registry (ตาราง `customer_entitlements`) ซึ่งมีฟิลด์:

- Sales, Customer Code, Customer Name, Entitlement Type, Start Month,
  End Month, Legacy Rule ID, Legacy Rate, Source Reference, Notes, Status

**Entitlement Type:** `NORMAL`, `NEW_CUSTOMER`, `LEGACY_TRANSITION`

**ห้ามระบบเดา Legacy Rate** — หากไม่มี Approved Legacy Rule ให้สถานะ
`REVIEW_REQUIRED`

---

## 7. Accounting Adjustment

**ห้ามแก้ไข Calculated Commission โดยตรง** ต้องบันทึกผ่าน Adjustment เท่านั้น

**สูตร:** `Final Commission = Calculated Commission + Adjustment`

**Adjustment Fields:** Amount, Reason Code, Reason Text, Adjusted By,
Timestamp

**Reason Codes:** `DATA_CORRECTION`, `MARGIN_CORRECTION`,
`CUSTOMER_CLASSIFICATION`, `DUPLICATE_REMOVAL`, `MANAGEMENT_ADJUSTMENT`,
`OTHER`

---

## 8. Import Flow

```
Upload → Select Month → Select Sheet → Column Mapping → Preview
→ Validation → Confirm → Calculate
```

### 8.1 Validation Rules

- Missing Date / Sales / Customer Code / Customer Name / Customer Type
- Invalid Customer Type
- Invalid Revenue
- GOV without Verified Margin
- Expired Entitlement
- Missing Legacy Rule
- Duplicate Rows

### 8.2 Duplicate Import Protection

ตรวจสอบก่อน Import ซ้ำโดยใช้ 3 เกณฑ์ร่วมกัน: Commission Month, Filename,
File Hash (SHA-256 ของไฟล์)

---

## 9. Monthly Closing Workflow

```
DRAFT → CALCULATED → ACCOUNTING_REVIEW → FINALIZED → PAID
```

- หลัง `FINALIZED` ห้ามแก้ไขข้อมูลโดยตรง
- การแก้ไขต้องผ่าน Admin **Reopen** เท่านั้น พร้อมระบุ Reason, User,
  Timestamp และบันทึก Audit Log

---

## 10. Policy Versioning

Commission Policy ต้องมีเวอร์ชัน (เช่น `COMMISSION-2026-V1`) ทุกการคำนวณ
คอมมิชชั่นต้องอ้างอิงและบันทึก Policy Version ที่ใช้ ณ ขณะคำนวณ เพื่อให้
ข้อมูลย้อนหลังอ้างอิงกฎของเดือนนั้นได้ถูกต้อง แม้ Policy จะถูกแก้ไขในอนาคต

---

## 11. Data Model (สรุป)

| ตาราง | หน้าที่ |
|---|---|
| `users` | บัญชีผู้ใช้และบทบาท |
| `sales_people` | ข้อมูลพนักงานขาย |
| `import_batches` | ประวัติการ Upload/Import แต่ละครั้ง |
| `sales_transactions` | รายการขายจาก Sales Report |
| `commission_policy_versions` | เวอร์ชันของนโยบายคอมมิชชั่น |
| `commission_policy_rules` | กฎอัตราคอมมิชชั่นภายใต้แต่ละเวอร์ชัน |
| `customer_entitlements` | Registry สิทธิ์คอมมิชชั่นของลูกค้า |
| `margin_reviews` | บันทึกการ Verify Margin ของ GOV |
| `commission_calculations` | ผลการคำนวณคอมมิชชั่นต่อรายการ |
| `commission_adjustments` | รายการปรับปรุงคอมมิชชั่น |
| `monthly_commission_settlements` | สถานะปิดรอบรายเดือนต่อ Sales |
| `audit_logs` | บันทึกการเปลี่ยนแปลงทั้งหมด |

รายละเอียด Schema ทั้งหมดอยู่ที่ `prisma/schema.prisma`

---

## 12. Production Decisions ที่ยังไม่ยืนยัน (ห้ามเดา)

รายการต่อไปนี้ **ต้องได้รับการยืนยันจากธุรกิจก่อนขึ้น Production**
ระบบ Phase 1 จะ implement เป็น **Config/Placeholder** ที่ปรับได้จากหน้า
**Admin → Configuration** โดยไม่ต้องแก้โค้ด และจะแสดงเป็นรายการ "รอยืนยัน"
ในหน้าเดียวกัน:

1. Exact GOV Margin Formula / Source ของ Margin (ระบบยึดเฉพาะ Margin ที่
   บันทึกผ่าน Margin Review ว่า Verified เท่านั้น — ไม่คำนวณ Margin เอง)
2. Exact Legacy Commission Rule / Rate (ระบบไม่กำหนด Rate ล่วงหน้า
   ต้องมาจาก Approved Legacy Rule ใน Registry เท่านั้น)
3. Cap 20,000 มีผลกับ Legacy Commission หรือไม่ (Config Flag:
   `capAppliesToLegacy`, ค่าเริ่มต้น = true)
4. นิยามที่แน่ชัดของ "หยุดใช้บริการเกิน 6 เดือน" (Config: จำนวนเดือนที่ไม่มี
   Transaction, ค่าเริ่มต้น = 6)
5. VAT Treatment (Revenue ที่ใช้คำนวณรวม/ไม่รวม VAT) (Config Flag:
   `revenueVatMode` = `AS_IMPORTED` ค่าเริ่มต้น หมายถึงใช้ยอดตามที่ Import
   โดยไม่แตะต้อง)
6. Discount Treatment (หักส่วนลดก่อนคำนวณหรือไม่)
7. Credit Note Treatment (นับ Credit Note ในเดือนใด/หักคอมมิชชั่นหรือไม่)
8. Cancellation / Refund Treatment
9. Commission Date Basis (ใช้วันที่ขาย/วันที่วางบิล/วันที่รับชำระ)
   (Config: `commissionDateBasis` ค่าเริ่มต้น = `SALES_DATE` ตามคอลัมน์
   "วันที่" ใน Sales Report)
10. Multiple Sales Owners ต่อ Customer Code เดียวกัน (แบ่งคอมมิชชั่น
    อย่างไร)
11. Payment Export Format ตาม Format จริงของฝ่ายบัญชี (Phase 1 ใช้ CSV
    generic format)
12. Management Data Visibility (ผู้บริหารเห็นข้อมูลระดับ Sales รายบุคคล
    ทั้งหมดหรือบางส่วน)

ทุกรายการข้างต้นแสดงในตาราง `commission_policy_rules` /
Admin Configuration UI พร้อม Flag `requiresConfirmation = true` และจะไม่
ถูกเปลี่ยนแปลงโดยอัตโนมัติจากโค้ด

---

## 13. Mandatory Tests (Acceptance)

ดูรายละเอียดทั้งหมดใน `userstory.md` หัวข้อ "Mandatory Tests" และไฟล์ทดสอบ
อัตโนมัติที่ `tests/commission-engine.test.ts` (Test 1–12 ตาม Spec)

---

## 14. Tech Stack

| Layer | เทคโนโลยี |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js Server Actions / Route Handlers |
| Database | PostgreSQL + Prisma ORM |
| Validation | Zod |
| Import | SheetJS (xlsx) |
| Charts | Recharts |
| Auth/RBAC | Credentials login (bcrypt) + signed JWT session cookie (`jose`) + Server-side Role Guard |
| Testing | Vitest |

> หมายเหตุ implementation: ใช้ session แบบ JWT ที่เซ็นเองแทน NextAuth
> เนื่องจากช่วงที่พัฒนา NextAuth v4/v5 ยังไม่รองรับ Next.js 16 + React 19
> อย่างเสถียรเพียงพอ กลไก RBAC (ตรวจ role จาก session ที่ฝั่ง Server ทุก
> Request) ยังเป็นไปตามข้อกำหนดเดิมทุกประการ

---

## 15. Non-Goals (Phase 1)

- ไม่สร้าง Customer Master แบบเต็มรูปแบบ (ใช้ Sales Report + Entitlement
  Registry แทน)
- ไม่ Generate Memo/PDF/DOCX (Phase 2)
- ไม่เชื่อมต่อระบบบัญชี/ธนาคารจริง (Export เป็นไฟล์เท่านั้น)
