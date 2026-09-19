"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { confirmImport, validateImportRows } from "@/lib/actions/import";
import type { BuiltImportRow, ColumnMapping, RawImportRow } from "@/lib/import/types";

const STEPS = [
  "Upload",
  "Select Sheet",
  "Column Mapping",
  "Preview",
  "Validation",
  "Confirm",
] as const;

const SYSTEM_FIELDS: { key: keyof ColumnMapping; label: string; defaultHeader: string }[] = [
  { key: "date", label: "วันที่", defaultHeader: "วันที่" },
  { key: "salesName", label: "Sales", defaultHeader: "Sales" },
  { key: "customerCode", label: "Customer Code", defaultHeader: "Customer Code" },
  { key: "customerName", label: "Customer Name", defaultHeader: "Customer Name" },
  { key: "customerType", label: "ประเภทลูกค้า", defaultHeader: "ประเภทลูกค้า" },
  { key: "revenue", label: "รายได้/ยอดขาย", defaultHeader: "รายได้/ยอดขาย" },
];

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

async function fileToHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function ImportWizard() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState("");
  const [commissionMonth, setCommissionMonth] = useState("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [rows, setRows] = useState<RawImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "",
    salesName: "",
    customerCode: "",
    customerName: "",
    customerType: "",
    revenue: "",
  });
  const [validationResults, setValidationResults] = useState<BuiltImportRow[] | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [importBatchId, setImportBatchId] = useState<string | null>(null);

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
    setFileHash(await fileToHash(selected));
    const buffer = await selected.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    setWorkbook(wb);
    setStep(1);
  }

  function handleSelectSheet(name: string) {
    if (!workbook) return;
    setSheetName(name);
    const ws = workbook.Sheets[name];
    const jsonRows = XLSX.utils.sheet_to_json<RawImportRow>(ws, { defval: "" });
    setRows(jsonRows);
    const detectedHeaders = jsonRows.length > 0 ? Object.keys(jsonRows[0]) : [];
    setHeaders(detectedHeaders);
    setMapping((prev) => {
      const next = { ...prev };
      for (const field of SYSTEM_FIELDS) {
        if (detectedHeaders.includes(field.defaultHeader)) {
          next[field.key] = field.defaultHeader;
        }
      }
      return next;
    });
    setStep(2);
  }

  function mappingComplete() {
    return SYSTEM_FIELDS.every((f) => mapping[f.key]);
  }

  async function runValidation() {
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

      const result = await validateImportRows({ ok: false }, formData);
      if (!result.ok || !result.results) {
        setMessage({ type: "error", text: result.error ?? "ตรวจสอบข้อมูลไม่สำเร็จ" });
        return;
      }
      setValidationResults(result.results);
      setStep(4);
    } finally {
      setIsBusy(false);
    }
  }

  async function runConfirm() {
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
      setImportBatchId(result.importBatchId ?? null);
      setMessage({ type: "success", text: "Import และคำนวณคอมมิชชั่นสำเร็จ" });
      setStep(5);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((label, i) => (
          <li key={label}>
            <Badge variant={i === step ? "info" : i < step ? "success" : "default"}>
              {i + 1}. {label}
            </Badge>
          </li>
        ))}
      </ol>

      {message && (
        <p className={message.type === "error" ? "text-sm text-red-600" : "text-sm text-emerald-700"}>
          {message.text}
        </p>
      )}

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="commissionMonth">เลือกเดือน (Commission Month)</Label>
              <Input
                id="commissionMonth"
                type="month"
                value={commissionMonth}
                onChange={(e) => setCommissionMonth(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="file">ไฟล์ Sales Report (.xlsx)</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={!commissionMonth}
                onChange={handleFileChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && workbook && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Select Sheet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {workbook.SheetNames.map((name) => (
              <Button key={name} variant="outline" onClick={() => handleSelectSheet(name)}>
                {name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3 — Column Mapping</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SYSTEM_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label>{field.label}</Label>
                <Select
                  value={mapping[field.key]}
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
            <div className="sm:col-span-2">
              <Button disabled={!mappingComplete()} onClick={() => setStep(3)}>
                ถัดไป: Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4 — Preview ({rows.length} rows)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <THead>
                <TR>
                  {SYSTEM_FIELDS.map((f) => (
                    <TH key={f.key}>{f.label}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {rows.slice(0, 10).map((row, i) => (
                  <TR key={i}>
                    {SYSTEM_FIELDS.map((f) => (
                      <TD key={f.key}>{String(row[mapping[f.key]] ?? "")}</TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
            <Button onClick={runValidation} disabled={isBusy}>
              {isBusy ? "กำลังตรวจสอบ..." : "ถัดไป: Validation"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && summary && validationResults && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5 — Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>ทั้งหมด: {summary.total}</span>
              <span className="text-emerald-700">ถูกต้อง: {summary.valid}</span>
              <span className="text-red-600">ผิดพลาด: {summary.invalid}</span>
              <span className="text-amber-700">ซ้ำ: {summary.duplicate}</span>
            </div>
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
                  .slice(0, 50)
                  .map((r) => (
                    <TR key={r.rowNumber}>
                      <TD>{r.rowNumber}</TD>
                      <TD>{r.customerCode || "-"}</TD>
                      <TD>
                        <Badge variant={r.status === "DUPLICATE" ? "warning" : "danger"}>
                          {r.status}
                        </Badge>
                      </TD>
                      <TD>{r.errors.map((e) => ERROR_LABEL[e] ?? e).join(", ")}</TD>
                    </TR>
                  ))}
              </TBody>
            </Table>
            <Button onClick={runConfirm} disabled={isBusy || summary.valid === 0}>
              {isBusy ? "กำลัง Import..." : `ยืนยัน Import (${summary.valid} rows) และคำนวณ`}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 6 — Confirm & Calculate เสร็จสิ้น</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Import Batch ID: {importBatchId}</p>
            <a className="underline" href="/accounting/review">
              ไปที่ Review Queue
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
