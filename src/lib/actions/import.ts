"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getSystemUserId } from "@/lib/system-user";
import { buildImportRows, toCommissionMonth } from "@/lib/import/build-rows";
import type { BuiltImportRow, ColumnMapping, RawImportRow } from "@/lib/import/types";
import { recalculateBatch } from "@/lib/actions/calculation";
import { recalculateSettlementsForMonth } from "@/lib/actions/closing";

const importPayloadSchema = z.object({
  commissionMonth: z.coerce.date(),
  filename: z.string().min(1),
  fileHash: z.string().min(1),
  sheetName: z.string().min(1),
  mapping: z.string().min(1),
  rows: z.string().min(1),
});

async function getSalesPeopleByName(): Promise<Map<string, string>> {
  const salesPeople = await prisma.salesPerson.findMany({ where: { isActive: true } });
  return new Map(salesPeople.map((sp) => [sp.name.trim().toUpperCase(), sp.id]));
}

function parsePayload(formData: FormData) {
  const parsed = importPayloadSchema.safeParse({
    commissionMonth: formData.get("commissionMonth"),
    filename: formData.get("filename"),
    fileHash: formData.get("fileHash"),
    sheetName: formData.get("sheetName"),
    mapping: formData.get("mapping"),
    rows: formData.get("rows"),
  });
  if (!parsed.success) return null;

  const mapping = JSON.parse(parsed.data.mapping) as ColumnMapping;
  const rows = JSON.parse(parsed.data.rows) as RawImportRow[];
  return { ...parsed.data, mapping, rows };
}

export interface ValidationSummary {
  ok: boolean;
  error?: string;
  results?: BuiltImportRow[];
  summary?: { total: number; valid: number; invalid: number; duplicate: number };
}

/** Dry run for the Validation step — never persists anything. */
export async function validateImportRows(
  _prevState: ValidationSummary,
  formData: FormData,
): Promise<ValidationSummary> {
  const payload = parsePayload(formData);
  if (!payload) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const salesPeopleByName = await getSalesPeopleByName();
  const results = buildImportRows({ rows: payload.rows, mapping: payload.mapping, salesPeopleByName });

  return {
    ok: true,
    results,
    summary: {
      total: results.length,
      valid: results.filter((r) => r.status === "VALID").length,
      invalid: results.filter((r) => r.status === "INVALID").length,
      duplicate: results.filter((r) => r.status === "DUPLICATE").length,
    },
  };
}

export interface ConfirmImportResult {
  ok: boolean;
  error?: string;
  importBatchId?: string;
}

/**
 * US-003/US-006: persists the ImportBatch + SalesTransactions, guarded by
 * the (commissionMonth, filename, fileHash) unique constraint so the same
 * file can never be imported twice for the same month. Immediately runs
 * the commission engine (Calculate step) afterwards.
 */
export async function confirmImport(
  _prevState: ConfirmImportResult,
  formData: FormData,
): Promise<ConfirmImportResult> {
  const userId = await getSystemUserId();

  const payload = parsePayload(formData);
  if (!payload) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const commissionMonth = new Date(
    Date.UTC(payload.commissionMonth.getUTCFullYear(), payload.commissionMonth.getUTCMonth(), 1),
  );

  const salesPeopleByName = await getSalesPeopleByName();
  const built = buildImportRows({ rows: payload.rows, mapping: payload.mapping, salesPeopleByName });

  let importBatch;
  try {
    importBatch = await prisma.importBatch.create({
      data: {
        commissionMonth,
        filename: payload.filename,
        fileHash: payload.fileHash,
        sheetName: payload.sheetName,
        columnMapping: JSON.parse(JSON.stringify(payload.mapping)),
        status: "CONFIRMED",
        rowCount: built.length,
        validRowCount: built.filter((r) => r.status === "VALID").length,
        errorRowCount: built.filter((r) => r.status !== "VALID").length,
        uploadedById: userId,
        confirmedAt: new Date(),
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return {
        ok: false,
        error: "ไฟล์นี้ถูก Import สำหรับเดือนนี้ไปแล้ว (Duplicate Import Protection)",
      };
    }
    throw err;
  }

  await prisma.salesTransaction.createMany({
    data: built.map((row) => ({
      importBatchId: importBatch.id,
      rowNumber: row.rowNumber,
      transactionDate: row.transactionDate ?? commissionMonth,
      commissionMonth: row.transactionDate
        ? toCommissionMonth(row.transactionDate, commissionMonth)
        : commissionMonth,
      salesPersonNameRaw: row.salesPersonNameRaw,
      salesPersonId: row.salesPersonId,
      customerCode: row.customerCode,
      customerName: row.customerName,
      customerTypeRaw: row.customerTypeRaw,
      customerType: row.customerType,
      revenue: row.revenue ?? 0,
      status: row.status,
      validationErrors: row.errors,
    })),
  });

  await writeAuditLog({
    userId,
    action: "CONFIRM_IMPORT",
    entity: "ImportBatch",
    entityId: importBatch.id,
    newValue: { filename: payload.filename, rowCount: built.length },
    reason: "Sales Report imported",
  });

  await recalculateBatch(importBatch.id, userId);
  await recalculateSettlementsForMonth(commissionMonth);

  revalidatePath("/");

  return { ok: true, importBatchId: importBatch.id };
}
