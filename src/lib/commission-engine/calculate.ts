import { isPostExpiry } from "./entitlement";
import { getGovRate, getStandardRate } from "./policy";
import type {
  CommissionCalculationInput,
  CommissionCalculationResult,
} from "./types";

const REVIEW_REQUIRED_RESULT = (
  reason: CommissionCalculationResult["reviewReason"],
  entitlementAlert: CommissionCalculationResult["entitlementAlert"] = null,
): CommissionCalculationResult => ({
  rateApplied: null,
  commissionBeforeCap: null,
  capAmount: null,
  cappedAmount: null,
  finalCommission: null,
  capStatus: null,
  reviewStatus: "REVIEW_REQUIRED",
  reviewReason: reason,
  entitlementAlert,
});

/**
 * Calculates commission for a single sales transaction under
 * COMMISSION-2026-V1. Never guesses a GOV Margin or a Legacy Rate: both
 * fall back to REVIEW_REQUIRED when not confirmed, per PRD.md sections
 * 4.2 and 6.
 *
 * Does NOT apply the Commission Cap: the Cap is 20,000 THB per Sales
 * person PER MONTH (PRD.md section 4.3), i.e. it applies to the sum of a
 * Sales person's commission across every transaction in the month, not
 * to any single transaction. Callers must aggregate every transaction's
 * `commissionBeforeCap` for a (Sales, Month) pair first, then run that
 * total through `applyCommissionCap` — see
 * `recalculateSettlementsForMonth` in src/lib/actions/closing.ts.
 */
export function calculateCommission(
  input: CommissionCalculationInput,
): CommissionCalculationResult {
  const { revenue, customerType, transactionMonth, entitlement, marginReview } =
    input;

  // Post-expiry sales are always flagged for review before rate lookup,
  // regardless of customer type or entitlement kind (Mandatory Test 10).
  if (entitlement && isPostExpiry(transactionMonth, entitlement.endMonth)) {
    return REVIEW_REQUIRED_RESULT("POST_EXPIRY_SALES", "EXPIRED_WITH_SALES");
  }

  let rateApplied: number;

  if (entitlement?.entitlementType === "LEGACY_TRANSITION") {
    const hasApprovedLegacyRule =
      entitlement.status !== "REVIEW_REQUIRED" &&
      Boolean(entitlement.legacyRuleId) &&
      entitlement.legacyRate != null;

    if (!hasApprovedLegacyRule) {
      return REVIEW_REQUIRED_RESULT("MISSING_LEGACY_RULE");
    }

    rateApplied = entitlement.legacyRate as number;
  } else if (customerType === "B2B_GOV") {
    if (!marginReview?.verified || marginReview.margin == null) {
      return REVIEW_REQUIRED_RESULT("MISSING_VERIFIED_MARGIN");
    }

    rateApplied = getGovRate(marginReview.margin);
  } else {
    const standardRate = getStandardRate(customerType);
    if (standardRate == null) {
      return REVIEW_REQUIRED_RESULT("INVALID_CUSTOMER_TYPE");
    }

    rateApplied = standardRate;
  }

  const commissionBeforeCap = revenue * rateApplied;

  return {
    rateApplied,
    commissionBeforeCap,
    capAmount: null,
    cappedAmount: null,
    finalCommission: commissionBeforeCap,
    capStatus: "NOT_APPLIED",
    reviewStatus: "OK",
    reviewReason: null,
    entitlementAlert: null,
  };
}
