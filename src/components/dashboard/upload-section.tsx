"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { confirmImport, validateImportRows } from "@/lib/actions/import";
import type { BuiltImportRow, ColumnMapping, RawImportRow } from "@/lib/import/types";

const SYSTEM_FIELDS: { key: keyof ColumnMapping; label: string; aliases: string[] }[] = [
  {
    key: "date",
    label: "วันที่",
    aliases: ["วันที่", "วันที่ขาย", "วันที่บันทึก", "วันทีขาย", "date", "salesdate", "transactiondate"],
  },
  {
    key: "salesName",
    label: "Sales",
    aliases: [
      "sales",
      "salesname",
      "salesperson",
      "พนักงานขาย",
      "ชื่อพนักงานขาย",
      "เซล",
      "เซลล์",
      "ชื่อเซล",
      "ชื่อเซลล์",
      "ผู้ขาย",
      "พนักงาน",
    ],
  },
  {
    key: "customerCode",
    label: "Customer Code",
    aliases: ["customercode", "customerid", "รหัสลูกค้า", "รหัสลูกคา", "รหัสลค", "customercode."],
  },
  {
    key: "customerName",
    label: "Customer Name",
    aliases: ["customername", "customer", "ชื่อลูกค้า", "ชื่อลูกคา", "ลูกค้า"],
  },
  {
    key: "customerType",
    label: "ประเภทลูกค้า",
    aliases: ["customertype", "type", "ประเภทลูกค้า", "ประเภทลูกคา", "ประเภท"],
  },
  {
    key: "revenue",
    label: "รายได้/ยอดขาย",
    aliases: [
      "revenue",
      "รายได้ยอดขาย",
      "รายได้",
      "ยอดขาย",
      "ยอดขายสุทธิ",
      "มูลค่า",
      "มูลค่าขาย",
      "จำนวนเงิน",
      "amount",
      "sales(amount)",
    ],
  },
];

/** Strips spaces and punctuation, lowercases — so header/alias spelling and spacing differences don't matter. */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s._/\-()]/g, "");
}

const ERROR_LABEL: Record<string, string> = {
  MISSING_DATE: "ไม่มีวันที่",
  MISSING_SALES: "ไม่มี Sales",
  SALES_NOT_FOUND: "ไม่พบชื่อ Sales ในระบบ",
  MISSING_CUSTOMER_CODE: "ไม่มี Customer Code",
  MISSING_CUSTOMER_NAME: "ไม่มี Customer Name",
  MISSING_CUSTOMER_TYPE: "ไม่มีประเภทลูกค้า",
  INVALID_CUSTOMER_TYPE: "ประเภทลูกค้าไม่ถูกต้อง",
  INVALID_REVENUE: "รายได้ไม่ถูกต้อง",
  DUPLICATE_ROW: "ข้อมูลซ้ำในไฟล์",
};

/**
 * Best-effort column guess: exact normalized match first, then substring
 * match, so header spelling/spacing quirks in a real-world Sales Report
 * don't force the person to map every column by hand. Returns a partial
 * mapping — missing fields are left out for the person to pick manually.
 */
function guessMapping(headers: string[]): Partial<ColumnMapping> {
  const normalizedHeaders = headers.map((h) => ({ header: h, normalized: normalize(h) }));
  const used = new Set<string>();
  const mapping: Partial<ColumnMapping> = {};

  for (const field of SYSTEM_FIELDS) {
    const exact = normalizedHeaders.find(
      (h) => !used.has(h.header) && field.aliases.some((a) => normalize(a) === h.normalized),
    );
    if (exact) {
      mapping[field.key] = exact.header;
      used.add(exact.header);
    }
  }

  for (const field of SYSTEM_FIELDS) {
    if (mapping[field.key]) continue;
    const partial = normalizedHeaders.find(
      (h) =>
        !used.has(h.header) &&
        field.aliases.some((a) => {
          const na = normalize(a);
          return na.length > 1 && (h.normalized.includes(na) || na.includes(h.normalized));
        }),
    );
    if (partial) {
      mapping[field.key] = partial.header;
      used.add(partial.header);
    }
  }

  return mapping;
}

function isMappingComplete(mapping: Partial<ColumnMapping>): mapping is ColumnMapping {
  return SYSTEM_FIELDS.every((f) => Boolean(mapping[f.key]));
}

async function fileToHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Step = "upload" | "mapping" | "review" | "done";

export function UploadSection() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState("");
  const [commissionMonth, setCommissionMonth] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [rows, setRows] = useState<RawImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [needsManualMapping, setNeedsManualMapping] = useState(false);
  const [validationResults, setValidationResults] = useState<BuiltImportRow[] | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const summary = useMemo(() => {
    if (!validationResults) return null;
    return {
      total: validationResults.length,
      valid: validationResults.filter((r) => r.status === "VALID").length,
      invalid: validationResults.filter((r) => r.status === "INVALID").length,
      duplicate: validationResults.filter((r) => r.status === "DUPLICATE").length,
    };
  }, [validationResults]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setMessage(null);
    setFile(selected);
    const hash = await fileToHash(selected);
    setFileHash(hash);

    const buffer = await selected.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.SheetNames[0];
    const ws = workbook.Sheets[firstSheet];
    const jsonRows = XLSX.utils.sheet_to_json<RawImportRow>(ws, { defval: "" });

    setSheetName(firstSheet);
    setRows(jsonRows);
    const detectedHeaders = jsonRows.length > 0 ? Object.keys(jsonRows[0]) : [];
    setHeaders(detectedHeaders);

    // Pass these explicitly instead of reading the `file`/`fileHash`/`sheetName`
    // state we just set above — React hasn't re-rendered yet, so those state
    // variables are still their stale (pre-upload) values in this closure.
    const meta = { filename: selected.name, fileHash: hash, sheetName: firstSheet };

    const guessedMapping = guessMapping(detectedHeaders);
    setMapping(guessedMapping);

    if (isMappingComplete(guessedMapping)) {
      setNeedsManualMapping(false);
      await runValidation(guessedMapping, jsonRows, meta);
    } else {
      setNeedsManualMapping(true);
      setStep("mapping");
    }
  }

  async function runValidation(
    useMapping: ColumnMapping,
    useRows: RawImportRow[],
    meta: { filename: string; fileHash: string; sheetName: string },
  ) {
    setIsBusy(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("commissionMonth", `${commissionMonth}-01`);
      formData.set("filename", meta.filename);
      formData.set("fileHash", meta.fileHash);
      formData.set("sheetName", meta.sheetName);
      formData.set("mapping", JSON.stringify(useMapping));
      formData.set("rows", JSON.stringify(useRows));

      const result = await validateImportRows({ ok: false }, formData);
      if (!result.ok || !result.results) {
        setMessage({ type: "error", text: result.error ?? "ตรวจสอบข้อมูลไม่สำเร็จ" });
        return;
      }
      setValidationResults(result.results);
      setStep("review");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConfirmMapping() {
    if (!isMappingComplete(mapping)) return;
    await runValidation(mapping, rows, { filename: file?.name ?? "", fileHash, sheetName });
  }

  async function runConfirm() {
    if (!isMappingComplete(mapping)) return;
    setIsBusy(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("commissionMonth", `${commissionMonth}-01`);
      formData.set("filename", file?.name ?? "");
      formData.set("fileHash", fileHash);
      formData.set("sheetName", sheetName);
      formData.set("mapping", JSON.stringify(mapping));
      formData.set("rows", JSON.stringify(rows));

      const result = await confirmImport({ ok: false }, formData);
      if (!result.ok) {
        setMessage({ type: "error", text: result.error ?? "Import ไม่สำเร็จ" });
        return;
      }
      setMessage({ type: "success", text: "อัปโหลดและคำนวณค่าคอมมิชชั่นสำเร็จ" });
      setStep("done");
      setTimeout(() => window.location.reload(), 1200);
    } finally {
      setIsBusy(false);
    }
  }

  function reset() {
    setStep("upload");
    setFile(null);
    setRows([]);
    setMapping({});
    setValidationResults(null);
    setMessage(null);
    setNeedsManualMapping(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>อัปโหลด Sales Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <p className={message.type === "error" ? "text-sm text-red-600" : "text-sm text-emerald-700"}>
            {message.text}
          </p>
        )}

        {step === "upload" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>เดือน</Label>
              <Input
                type="month"
                value={commissionMonth}
                onChange={(e) => setCommissionMonth(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>ไฟล์ Sales Report (.xlsx)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={!commissionMonth || isBusy}
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {step === "mapping" && needsManualMapping && (
          <div className="space-y-3">
            <p className="text-sm text-amber-700">
              ระบบเดาบางคอลัมน์ให้แล้ว แต่ยังมีบางช่องที่เดาไม่ได้ — กรุณาช่วยเลือกให้ครบ (ดูตัวอย่างข้อมูลด้านล่างประกอบได้)
            </p>

            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">ตัวอย่างข้อมูลในไฟล์ (2 แถวแรก)</p>
              <Table>
                <THead>
                  <TR>
                    {headers.map((h) => (
                      <TH key={h}>{h}</TH>
                    ))}
                  </TR>
                </THead>
                <TBody>
                  {rows.slice(0, 2).map((row, i) => (
                    <TR key={i}>
                      {headers.map((h) => (
                        <TD key={h}>{String(row[h] ?? "")}</TD>
                      ))}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SYSTEM_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label>{field.label}</Label>
                  <Select
                    value={mapping[field.key] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  >
                    <option value="">-- เลือกคอลัมน์ --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConfirmMapping} disabled={isBusy || !isMappingComplete(mapping)}>
                {isBusy ? "กำลังตรวจสอบ..." : "ตรวจสอบข้อมูล"}
              </Button>
              <Button variant="outline" onClick={reset}>
                ยกเลิก
              </Button>
            </div>
          </div>
        )}

        {step === "review" && summary && validationResults && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>ทั้งหมด: {summary.total}</span>
              <span className="text-emerald-700">ถูกต้อง: {summary.valid}</span>
              <span className="text-red-600">ผิดพลาด: {summary.invalid}</span>
              <span className="text-amber-700">ซ้ำ: {summary.duplicate}</span>
            </div>
            {summary.invalid + summary.duplicate > 0 && (
              <Table>
                <THead>
                  <TR>
                    <TH>#</TH>
                    <TH>Customer Code</TH>
                    <TH>สถานะ</TH>
                    <TH>ปัญหา</TH>
                  </TR>
                </THead>
                <TBody>
                  {validationResults
                    .filter((r) => r.status !== "VALID")
                    .slice(0, 30)
                    .map((r) => (
                      <TR key={r.rowNumber}>
                        <TD>{r.rowNumber}</TD>
                        <TD>{r.customerCode || "-"}</TD>
                        <TD>
                          <Badge variant={r.status === "DUPLICATE" ? "warning" : "danger"}>{r.status}</Badge>
                        </TD>
                        <TD>{r.errors.map((e) => ERROR_LABEL[e] ?? e).join(", ")}</TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            )}
            <div className="flex gap-2">
              <Button onClick={runConfirm} disabled={isBusy || summary.valid === 0}>
                {isBusy ? "กำลังบันทึก..." : `ยืนยันและคำนวณ (${summary.valid} รายการ)`}
              </Button>
              <Button variant="outline" onClick={reset}>
                ยกเลิก
              </Button>
            </div>
          </div>
        )}

        {step === "done" && <p className="text-sm text-emerald-700">เสร็จสิ้น กำลังโหลดหน้าใหม่...</p>}
      </CardContent>
    </Card>
  );
}
