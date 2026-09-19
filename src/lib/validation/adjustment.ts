import { z } from "zod";

export const ADJUSTMENT_REASON_CODES = [
  "DATA_CORRECTION",
  "MARGIN_CORRECTION",
  "CUSTOMER_CLASSIFICATION",
  "DUPLICATE_REMOVAL",
  "MANAGEMENT_ADJUSTMENT",
  "OTHER",
] as const;

export const createAdjustmentSchema = z.object({
  commissionCalculationId: z.string().min(1),
  amount: z.coerce.number(),
  reasonCode: z.enum(ADJUSTMENT_REASON_CODES),
  reasonText: z.string().trim().min(1, "ต้องระบุเหตุผล"),
});
