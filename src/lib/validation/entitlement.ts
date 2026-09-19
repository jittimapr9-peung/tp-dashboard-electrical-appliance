import { z } from "zod";

export const createEntitlementSchema = z
  .object({
    salesPersonId: z.string().min(1),
    customerCode: z.string().min(1),
    customerName: z.string().min(1),
    entitlementType: z.enum(["NORMAL", "NEW_CUSTOMER", "LEGACY_TRANSITION"]),
    startMonth: z.coerce.date(),
    endMonth: z.coerce.date().optional(),
    legacyRuleId: z.string().trim().optional(),
    // Entered as a percentage in the UI (e.g. 0.6 = 0.60%), stored as a fraction.
    legacyRatePercent: z.coerce.number().positive().optional(),
    sourceReference: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (data) => data.entitlementType !== "NORMAL" || data.endMonth != null,
    { message: "endMonth is required for NORMAL entitlements", path: ["endMonth"] },
  );

export type CreateEntitlementInput = z.infer<typeof createEntitlementSchema>;
