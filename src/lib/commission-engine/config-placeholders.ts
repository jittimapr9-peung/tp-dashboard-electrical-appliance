/**
 * Production Decisions that are NOT yet confirmed by the business
 * (PRD.md section 12). Each entry is a Config/Placeholder: the system
 * ships with a safe, explicit default and surfaces the item on the
 * Admin → Configuration screen with `requiresConfirmation: true` until
 * someone with authority confirms it. Code must never silently assume a
 * different value — change the default here (or, once wired up, from
 * the Admin Configuration UI) only after the business confirms it.
 */

export type ConfigPlaceholder = {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
  requiresConfirmation: true;
};

export const CONFIG_PLACEHOLDERS: readonly ConfigPlaceholder[] = [
  {
    key: "govMarginFormulaSource",
    label: "GOV Margin Formula / Source",
    description:
      "สูตร/แหล่งที่มาของ Margin สำหรับ B2B-GOV ยังไม่ยืนยัน ระบบจะไม่คำนวณ Margin เอง ใช้เฉพาะ Margin ที่ผ่าน Margin Review และมีสถานะ Verified เท่านั้น",
    defaultValue: "MANUAL_VERIFIED_ONLY",
    requiresConfirmation: true,
  },
  {
    key: "legacyRateSource",
    label: "Legacy Commission Rule / Rate",
    description:
      "Legacy Rate ที่แน่ชัดยังไม่ยืนยัน ระบบใช้เฉพาะ Rate จาก Approved Legacy Rule ใน Customer Commission Entitlement Registry เท่านั้น",
    defaultValue: "APPROVED_REGISTRY_ONLY",
    requiresConfirmation: true,
  },
  {
    key: "capAppliesToLegacy",
    label: "Cap มีผลกับ Legacy Commission หรือไม่",
    description:
      "ค่าเริ่มต้น: Cap 20,000 บาท/Sales/เดือน มีผลกับทุกประเภทรวมถึง Legacy จนกว่าจะมีการยืนยันเป็นอย่างอื่น",
    defaultValue: "true",
    requiresConfirmation: true,
  },
  {
    key: "inactivityMonthsThreshold",
    label: 'นิยาม "หยุดใช้บริการเกิน 6 เดือน"',
    description:
      "จำนวนเดือนที่ไม่มี Sales Transaction ของลูกค้ารายนั้นติดต่อกัน ก่อนจะถือเป็น New Customer อีกครั้ง",
    defaultValue: "6",
    requiresConfirmation: true,
  },
  {
    key: "revenueVatMode",
    label: "VAT Treatment",
    description:
      "Revenue ที่ใช้คำนวณคอมมิชชั่นรวม/ไม่รวม VAT ยังไม่ยืนยัน ค่าเริ่มต้นใช้ยอดตามที่ Import โดยไม่ปรับแก้",
    defaultValue: "AS_IMPORTED",
    requiresConfirmation: true,
  },
  {
    key: "discountTreatment",
    label: "Discount Treatment",
    description: "ยังไม่ยืนยันว่าต้องหักส่วนลดก่อนคำนวณคอมมิชชั่นหรือไม่",
    defaultValue: "AS_IMPORTED",
    requiresConfirmation: true,
  },
  {
    key: "creditNoteTreatment",
    label: "Credit Note Treatment",
    description: "ยังไม่ยืนยันวิธีจัดการ Credit Note ต่อคอมมิชชั่น",
    defaultValue: "NOT_HANDLED",
    requiresConfirmation: true,
  },
  {
    key: "cancellationRefundTreatment",
    label: "Cancellation / Refund Treatment",
    description: "ยังไม่ยืนยันวิธีจัดการยกเลิก/คืนเงินต่อคอมมิชชั่น",
    defaultValue: "NOT_HANDLED",
    requiresConfirmation: true,
  },
  {
    key: "commissionDateBasis",
    label: "Commission Date Basis",
    description:
      'ยังไม่ยืนยันว่าใช้วันที่ขาย/วันที่วางบิล/วันที่รับชำระ ค่าเริ่มต้นใช้คอลัมน์ "วันที่" ใน Sales Report (วันที่ขาย)',
    defaultValue: "SALES_DATE",
    requiresConfirmation: true,
  },
  {
    key: "multipleSalesOwnersPerCustomer",
    label: "Multiple Sales Owners ต่อ Customer Code",
    description:
      "ยังไม่ยืนยันวิธีแบ่งคอมมิชชั่นเมื่อลูกค้ารายเดียวมี Sales มากกว่า 1 คน",
    defaultValue: "NOT_HANDLED",
    requiresConfirmation: true,
  },
  {
    key: "paymentExportFormat",
    label: "Payment Export Format",
    description:
      "ยังไม่ยืนยัน Format จริงของฝ่ายบัญชี Phase 1 ใช้ CSV แบบ Generic",
    defaultValue: "GENERIC_CSV",
    requiresConfirmation: true,
  },
  {
    key: "managementDataVisibility",
    label: "Management Data Visibility",
    description:
      "ยังไม่ยืนยันว่าผู้บริหารเห็นข้อมูลระดับ Sales รายบุคคลทั้งหมดหรือบางส่วน ค่าเริ่มต้นให้เห็นแบบสรุป (aggregate) ทุกมิติตาม Spec",
    defaultValue: "AGGREGATE_ALL",
    requiresConfirmation: true,
  },
];
