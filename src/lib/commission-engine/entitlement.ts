import { NEW_CUSTOMER_ENTITLEMENT_MONTHS } from "./policy";
import type { EntitlementAlert, EntitlementInput } from "./types";

function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUTC(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

/**
 * New Customer / 2026 Transition rule: grants a full 12 commission months
 * starting from (and including) the start month — e.g. Start = June 2026
 * -> End = May 2027 — even when the window crosses into the next year.
 */
export function calculateNewCustomerEndMonth(startMonth: Date): Date {
  return addMonthsUTC(
    firstOfMonth(startMonth),
    NEW_CUSTOMER_ENTITLEMENT_MONTHS - 1,
  );
}

/** True when `month` falls strictly after the entitlement's end month. */
export function isPostExpiry(month: Date, endMonth: Date): boolean {
  return firstOfMonth(month).getTime() > firstOfMonth(endMonth).getTime();
}

function isSameMonth(a: Date, b: Date): boolean {
  return firstOfMonth(a).getTime() === firstOfMonth(b).getTime();
}

/**
 * US-011: entitlement expiry alerts for dashboards / expiry reports.
 * `hasSalesAfterExpiry` should be true when a sales transaction exists for
 * this customer in a month after `entitlement.endMonth`.
 */
export function getEntitlementAlert(
  entitlement: EntitlementInput | null | undefined,
  currentMonth: Date,
  hasSalesAfterExpiry: boolean,
): EntitlementAlert | null {
  if (!entitlement) {
    return "MISSING_ENTITLEMENT";
  }

  if (isPostExpiry(currentMonth, entitlement.endMonth)) {
    return hasSalesAfterExpiry ? "EXPIRED_WITH_SALES" : "EXPIRED";
  }

  if (isSameMonth(currentMonth, entitlement.endMonth)) {
    return "EXPIRING_THIS_MONTH";
  }

  return null;
}
