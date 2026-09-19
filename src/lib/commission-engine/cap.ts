import { MONTHLY_COMMISSION_CAP } from "./policy";
import type { CapResult } from "./types";

/**
 * Applies the monthly commission cap to a single amount.
 * Whether the cap applies to Legacy commission at all is an unconfirmed
 * Production Decision (see config-placeholders.ts:capAppliesToLegacy) —
 * callers decide whether to invoke this function for a given calculation.
 */
export function applyCommissionCap(
  commissionBeforeCap: number,
  capAmount: number = MONTHLY_COMMISSION_CAP,
): CapResult {
  const isCapped = commissionBeforeCap > capAmount;
  const finalCommission = isCapped ? capAmount : commissionBeforeCap;
  const cappedAmount = isCapped ? commissionBeforeCap - capAmount : 0;

  return {
    commissionBeforeCap,
    capAmount,
    cappedAmount,
    finalCommission,
    capStatus: isCapped ? "CAP_APPLIED" : "NOT_APPLIED",
  };
}
