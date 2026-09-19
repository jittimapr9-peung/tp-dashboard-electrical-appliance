# User Stories — TP Logistics Sales Commission System

อ้างอิงจาก PRD.md เวอร์ชัน 1.0 จัดกลุ่มเป็น 12 Epic ตาม Specification เดิม
พร้อม Acceptance Criteria และการอ้างอิงไปยังโมดูลที่ implement

---

## EPIC 1 — Authentication & Roles

### US-001 Login
As a user, I want to log in, so that I can access functions according to my role.

**Acceptance Criteria**
- [ ] Valid credentials สามารถ Login ได้
- [ ] Invalid credentials ถูกปฏิเสธพร้อมข้อความ error ทั่วไป (ไม่บอกว่า
      username หรือ password ผิด)
- [ ] Role authorization ตรวจสอบที่ Server-side เสมอ (ไม่พึ่ง client only)

### US-002 Role Based Access
- Sales เห็นเฉพาะข้อมูลของตนเอง
- Accounting: Review, Adjustment, Finalize
- Admin: Configuration
- Management: Summary
- ผู้ใช้ที่ไม่มีสิทธิ์ต้องเข้าถึงฟังก์ชันที่ป้องกันไว้ไม่ได้ (403)

---

## EPIC 2 — Import Sales

### US-003 Upload Sales Report
Accounting upload Sales Report รายเดือน ต้องมีฟิลด์: Date, Sales,
Customer Code, Customer Name, Customer Type, Revenue

### US-004 Column Mapping
Accounting map คอลัมน์ Excel เข้ากับ field ระบบ และเห็น: Detected
columns, Mapping, Preview

### US-005 Validation
ตรวจสอบ: Missing fields, Invalid Customer Type, Invalid Revenue,
Duplicate, Missing GOV Margin, Expired Entitlement, Missing Legacy Rule

### US-006 Duplicate Import Protection
ระบบตรวจจับการ Import ซ้ำรายเดือน (Commission Month + Filename +
File Hash)

---

## EPIC 3 — Commission Calculation

### US-007 Standard Commission
B2C / B2B-Private / SME = 0.50%

### US-008 GOV Commission
Verified Margin: >20% = 0.80%, 10–20% = 0.50%, <10% = 0.25%

### US-009 Commission Cap
20,000 THB / Sales / Month ระบบบันทึกผล Cap ทุกครั้ง

---

## EPIC 4 — New Customer

### US-010 New Customer Rule
ระบุ: ไม่เคยใช้บริการ หรือ หยุดใช้บริการ >6 เดือน → สิทธิ์ 12 เดือน

### US-011 Expiry Alert
แสดง: EXPIRING_THIS_MONTH, EXPIRED, EXPIRED_WITH_SALES,
MISSING_ENTITLEMENT

### US-012 2026 Transition
ลูกค้าที่เริ่มปี 2026 คงสิทธิ์ครบ 12 เดือนแม้ข้ามไปปี 2027

---

## EPIC 5 — Legacy

### US-013 Entitlement Registry
Admin/Accounting จัดการ Registry ครบทุกฟิลด์ตาม PRD หัวข้อ 6

### US-014 Missing Legacy Rule
ไม่มี Approved Rule → `REVIEW_REQUIRED`

---

## EPIC 6 — GOV Margin

### US-015 Margin Review
Accounting บันทึก/verify Margin พร้อม Margin, Verified status,
Reviewer, Timestamp

### US-016 Missing Margin
GOV ที่ไม่มี Verified Margin → `REVIEW_REQUIRED`

---

## EPIC 7 — Adjustment

### US-017 Accounting Adjustment
`Final = Calculated + Adjustment` พร้อม Amount, Reason Code, Reason
Text, User, Timestamp

---

## EPIC 8 — Monthly Closing

### US-018 Review Queue
Accounting เห็นรายการ Exception ที่ต้องจัดการ

### US-019 Finalize
Workflow: DRAFT → CALCULATED → ACCOUNTING_REVIEW → FINALIZED → PAID

### US-020 Reopen
Admin reopen เดือนที่ Finalize แล้วได้ พร้อม Reason + Audit Log

---

## EPIC 9 — Reports

### US-021 Monthly Summary — Revenue, Commission Before Cap, Adjustment, Final Commission, Sales
### US-022 Commission Detail — Transaction, Revenue, Margin, Rate, Entitlement, Cap, Adjustment, Final Commission, Policy Version
### US-023 Exception Report — Missing Margin, Expired Entitlement, Missing Legacy Rule, Invalid Data, Duplicate, Adjustment
### US-024 Expiry Report — สิทธิ์ที่กำลังจะหมด/หมดอายุแล้ว
### US-025 Payment Export — Export ข้อมูลคอมมิชชั่นที่ Finalize แล้ว

---

## EPIC 10 — Dashboard

### US-026 Accounting Dashboard
### US-027 Sales Dashboard — เฉพาะของ Sales ที่ Login
### US-028 Management Dashboard

---

## EPIC 11 — Audit

### US-029 Monthly History — ข้อมูลย้อนหลังเข้าถึงได้เสมอ ข้อมูล Finalize ห้ามถูกแก้แบบเงียบ
### US-030 Audit Log — User, Action, Entity, Entity ID, Old Value, New Value, Reason, Timestamp

---

## EPIC 12 — Memo (Phase 2)

### US-031 Commission Approval Memo (DOCX/PDF) — ไม่อยู่ใน Phase 1

---

## End-to-End Acceptance Scenario

1. Accounting uploads September 2026 Sales Report
2. ระบบ detect columns → 3. Accounting map columns → 4. Preview →
5. Validate → 6. Import valid records → 7. คำนวณ Rate มาตรฐาน →
8. GOV ต้องมี Verified Margin → 9. ตรวจ New Customer Entitlement →
10. ตรวจ Legacy Entitlement → 11. ใช้ Cap รายเดือน → 12. Exception เข้า
Review Queue → 13. Accounting review → 14. สร้าง Adjustment ตามจำเป็น →
15. บันทึก Audit Log → 16. Finalize เดือนกันยายน 2026 → 17. Lock ข้อมูล →
18. สร้าง Payment Export → 19. เก็บประวัติย้อนหลัง → 20. Phase 2 จะสร้าง
Memo ได้

---

## Mandatory Tests (→ `tests/commission-engine.test.ts`)

| # | Case | Input | Expected |
|---|---|---|---|
| 1 | B2C | Revenue 100,000 | Commission = 500 |
| 2 | B2B Private | Revenue 100,000 | Commission = 500 |
| 3 | SME | Revenue 100,000 | Commission = 500 |
| 4 | GOV | Margin 21% | Rate = 0.80% |
| 5 | GOV | Margin 20% | Rate = 0.50% |
| 6 | GOV | Margin 10% | Rate = 0.50% |
| 7 | GOV | Margin 9.99% | Rate = 0.25% |
| 8 | Cap | Before Cap 26,000 | Final = 20,000 |
| 9 | New Customer | Start June 2026 | End = May 2027 |
| 10 | Post-expiry Sales | — | `REVIEW_REQUIRED` |
| 11 | GOV without Verified Margin | — | `REVIEW_REQUIRED` |
| 12 | Legacy without Approved Rule | — | `REVIEW_REQUIRED` |
