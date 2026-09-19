import type { CustomerType } from "@/lib/commission-engine";
import type {
  BuiltImportRow,
  ColumnMapping,
  ImportRowErrorCode,
  RawImportRow,
} from "./types";

const CUSTOMER_TYPE_ALIASES: Record<string, CustomerType> = {
  B2C: "B2C",
  B2BPRIVATE: "B2B_PRIVATE",
  "B2B-PRIVATE": "B2B_PRIVATE",
  SME: "SME",
  B2BGOV: "B2B_GOV",
  "B2B-GOV": "B2B_GOV",
  GOV: "B2B_GOV",
};

function normalizeCustomerType(raw: string): CustomerType | null {
  const key = raw.trim().toUpperCase().replace(/[\s_]/g, "");
  return CUSTOMER_TYPE_ALIASES[key] ?? CUSTOMER_TYPE_ALIASES[key.replace(/-/g, "")] ?? null;
}

function parseDate(value: string | number | undefined): Date | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30).
    const utcDays = value - 25569;
    const ms = utcDays * 86400 * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRevenue(value: string | number | undefined): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function firstOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

interface BuildRowsOptions {
  rows: RawImportRow[];
  mapping: ColumnMapping;
  salesPeopleByName: Map<string, string>; // normalized name -> salesPersonId
}

/**
 * US-005: pure row-level validation shared by the dry-run Validation step
 * and the persisting Confirm step, so both stages agree on what counts as
 * a valid row. Duplicate detection here is within-file only (same date +
 * sales + customer code + revenue appearing more than once); the
 * file-level Duplicate Import Protection (US-006) is handled separately
 * via ImportBatch's (commissionMonth, filename, fileHash) uniqueness.
 */
export function buildImportRows({
  rows,
  mapping,
  salesPeopleByName,
}: BuildRowsOptions): BuiltImportRow[] {
  const seenKeys = new Set<string>();
  const built: BuiltImportRow[] = [];

  rows.forEach((row, index) => {
    const errors: ImportRowErrorCode[] = [];

    const dateRaw = row[mapping.date];
    const transactionDate = parseDate(dateRaw);
    if (!transactionDate) errors.push("MISSING_DATE");

    const salesPersonNameRaw = String(row[mapping.salesName] ?? "").trim();
    let salesPersonId: string | null = null;
    if (!salesPersonNameRaw) {
      errors.push("MISSING_SALES");
    } else {
      salesPersonId = salesPeopleByName.get(salesPersonNameRaw.toUpperCase()) ?? null;
      if (!salesPersonId) errors.push("SALES_NOT_FOUND");
    }

    const customerCode = String(row[mapping.customerCode] ?? "").trim();
    if (!customerCode) errors.push("MISSING_CUSTOMER_CODE");

    const customerName = String(row[mapping.customerName] ?? "").trim();
    if (!customerName) errors.push("MISSING_CUSTOMER_NAME");

    const customerTypeRaw = String(row[mapping.customerType] ?? "").trim();
    let customerType: CustomerType | null = null;
    if (!customerTypeRaw) {
      errors.push("MISSING_CUSTOMER_TYPE");
    } else {
      customerType = normalizeCustomerType(customerTypeRaw);
      if (!customerType) errors.push("INVALID_CUSTOMER_TYPE");
    }

    const revenue = parseRevenue(row[mapping.revenue]);
    if (revenue == null) errors.push("INVALID_REVENUE");

    const dedupeKey = `${transactionDate?.toISOString() ?? ""}|${salesPersonNameRaw.toUpperCase()}|${customerCode.toUpperCase()}|${revenue ?? ""}`;
    let status: BuiltImportRow["status"] = errors.length > 0 ? "INVALID" : "VALID";

    if (errors.length === 0) {
      if (seenKeys.has(dedupeKey)) {
        errors.push("DUPLICATE_ROW");
        status = "DUPLICATE";
      } else {
        seenKeys.add(dedupeKey);
      }
    }

    built.push({
      rowNumber: index + 1,
      transactionDate,
      salesPersonNameRaw,
      salesPersonId,
      customerCode,
      customerName,
      customerTypeRaw,
      customerType,
      revenue,
      errors,
      status,
    });
  });

  return built;
}

export function toCommissionMonth(transactionDate: Date, fallback: Date): Date {
  return firstOfMonthUTC(transactionDate ?? fallback);
}
