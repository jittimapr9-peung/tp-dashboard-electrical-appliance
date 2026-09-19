import type { CustomerType } from "./types";

/**
 * COMMISSION-2026-V1 — confirmed rules only.
 * Every rate here is confirmed by Specification; anything not confirmed
 * (GOV margin source, Legacy rate, cap-on-legacy, inactivity threshold,
 * etc.) lives in `config-placeholders.ts` instead and must never be
 * guessed here.
 */
export const ACTIVE_POLICY_VERSION = "COMMISSION-2026-V1";

/** B2C / B2B-Private / SME standard commission rate (0.50%). */
export const STANDARD_RATE = 0.005;

const STANDARD_CUSTOMER_TYPES: ReadonlySet<CustomerType> = new Set([
  "B2C",
  "B2B_PRIVATE",
  "SME",
]);

export function isStandardCustomerType(customerType: CustomerType): boolean {
  return STANDARD_CUSTOMER_TYPES.has(customerType);
}

export function getStandardRate(customerType: CustomerType): number | null {
  return isStandardCustomerType(customerType) ? STANDARD_RATE : null;
}

/**
 * GOV margin tiers. Boundaries are confirmed explicitly by Specification:
 *   margin > 20%        -> 0.80%
 *   10% <= margin <= 20% -> 0.50%   (both 10% and 20% land in this tier)
 *   margin < 10%         -> 0.25%
 *
 * `margin` is a percentage value (e.g. 21 means 21%), matching how the
 * Mandatory Tests express it.
 */
export function getGovRate(marginPercent: number): number {
  if (marginPercent > 20) return 0.008;
  if (marginPercent >= 10) return 0.005;
  return 0.0025;
}

/** Monthly commission cap per Sales person (THB). */
export const MONTHLY_COMMISSION_CAP = 20000;

/** New Customer commission entitlement length, in months, inclusive of the start month. */
export const NEW_CUSTOMER_ENTITLEMENT_MONTHS = 12;
