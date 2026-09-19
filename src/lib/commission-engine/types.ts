export type CustomerType = "B2C" | "B2B_PRIVATE" | "SME" | "B2B_GOV";

export type EntitlementType = "NORMAL" | "NEW_CUSTOMER" | "LEGACY_TRANSITION";

export type EntitlementStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "REVIEW_REQUIRED"
  | "PENDING_APPROVAL";

export type EntitlementAlert =
  | "EXPIRING_THIS_MONTH"
  | "EXPIRED"
  | "EXPIRED_WITH_SALES"
  | "MISSING_ENTITLEMENT";

export type ReviewStatus = "OK" | "REVIEW_REQUIRED";

export type CapStatus = "NOT_APPLIED" | "CAP_APPLIED";

/** Reasons a transaction lands in REVIEW_REQUIRED — never guessed, always explicit. */
export type ReviewReason =
  | "MISSING_VERIFIED_MARGIN"
  | "MISSING_LEGACY_RULE"
  | "POST_EXPIRY_SALES"
  | "INVALID_CUSTOMER_TYPE";

export interface EntitlementInput {
  entitlementType: EntitlementType;
  startMonth: Date;
  endMonth: Date;
  status: EntitlementStatus;
  legacyRuleId?: string | null;
  /** Fraction, e.g. 0.006 for 0.60% */
  legacyRate?: number | null;
}

export interface MarginReviewInput {
  /** Percentage value, e.g. 21 for 21% */
  margin: number | null;
  verified: boolean;
}

export interface CommissionCalculationInput {
  revenue: number;
  customerType: CustomerType;
  /** First-of-month date the transaction belongs to. */
  transactionMonth: Date;
  entitlement?: EntitlementInput | null;
  marginReview?: MarginReviewInput | null;
}

export interface CapResult {
  commissionBeforeCap: number;
  capAmount: number;
  cappedAmount: number;
  finalCommission: number;
  capStatus: CapStatus;
}

export interface CommissionCalculationResult {
  rateApplied: number | null;
  commissionBeforeCap: number | null;
  capAmount: number | null;
  cappedAmount: number | null;
  finalCommission: number | null;
  capStatus: CapStatus | null;
  reviewStatus: ReviewStatus;
  reviewReason: ReviewReason | null;
  entitlementAlert: EntitlementAlert | null;
}
