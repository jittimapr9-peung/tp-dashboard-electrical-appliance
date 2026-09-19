import type { CustomerType } from "@/lib/commission-engine";

export type RawImportRow = Record<string, string | number | undefined>;

export interface ColumnMapping {
  date: string;
  salesName: string;
  customerCode: string;
  customerName: string;
  customerType: string;
  revenue: string;
}

export type ImportRowErrorCode =
  | "MISSING_DATE"
  | "MISSING_SALES"
  | "SALES_NOT_FOUND"
  | "MISSING_CUSTOMER_CODE"
  | "MISSING_CUSTOMER_NAME"
  | "MISSING_CUSTOMER_TYPE"
  | "INVALID_CUSTOMER_TYPE"
  | "INVALID_REVENUE"
  | "DUPLICATE_ROW";

export interface BuiltImportRow {
  rowNumber: number;
  transactionDate: Date | null;
  salesPersonNameRaw: string;
  salesPersonId: string | null;
  customerCode: string;
  customerName: string;
  customerTypeRaw: string;
  customerType: CustomerType | null;
  revenue: number | null;
  errors: ImportRowErrorCode[];
  status: "VALID" | "INVALID" | "DUPLICATE";
}
