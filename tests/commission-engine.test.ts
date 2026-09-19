import { describe, expect, it } from "vitest";
import {
  applyCommissionCap,
  calculateCommission,
  calculateNewCustomerEndMonth,
  getGovRate,
} from "@/lib/commission-engine";

const month = (year: number, monthIndex1to12: number) =>
  new Date(Date.UTC(year, monthIndex1to12 - 1, 1));

describe("Mandatory Tests (Specification)", () => {
  it("TEST 1 — B2C, Revenue 100,000 -> Commission = 500", () => {
    const result = calculateCommission({
      revenue: 100_000,
      customerType: "B2C",
      transactionMonth: month(2026, 9),
    });
    expect(result.reviewStatus).toBe("OK");
    expect(result.finalCommission).toBe(500);
  });

  it("TEST 2 — B2B Private, Revenue 100,000 -> Commission = 500", () => {
    const result = calculateCommission({
      revenue: 100_000,
      customerType: "B2B_PRIVATE",
      transactionMonth: month(2026, 9),
    });
    expect(result.finalCommission).toBe(500);
  });

  it("TEST 3 — SME, Revenue 100,000 -> Commission = 500", () => {
    const result = calculateCommission({
      revenue: 100_000,
      customerType: "SME",
      transactionMonth: month(2026, 9),
    });
    expect(result.finalCommission).toBe(500);
  });

  it("TEST 4 — GOV, Margin 21% -> Rate = 0.80%", () => {
    expect(getGovRate(21)).toBeCloseTo(0.008);
  });

  it("TEST 5 — GOV, Margin 20% -> Rate = 0.50%", () => {
    expect(getGovRate(20)).toBeCloseTo(0.005);
  });

  it("TEST 6 — GOV, Margin 10% -> Rate = 0.50%", () => {
    expect(getGovRate(10)).toBeCloseTo(0.005);
  });

  it("TEST 7 — GOV, Margin 9.99% -> Rate = 0.25%", () => {
    expect(getGovRate(9.99)).toBeCloseTo(0.0025);
  });

  it("TEST 8 — Commission Before Cap = 26,000 -> Final Commission = 20,000", () => {
    const result = applyCommissionCap(26_000);
    expect(result.finalCommission).toBe(20_000);
    expect(result.capStatus).toBe("CAP_APPLIED");
    expect(result.cappedAmount).toBe(6_000);
  });

  it("TEST 9 — New Customer, Start June 2026 -> End May 2027", () => {
    const end = calculateNewCustomerEndMonth(month(2026, 6));
    expect(end.getUTCFullYear()).toBe(2027);
    expect(end.getUTCMonth()).toBe(4); // May = index 4
  });

  it("TEST 10 — Post-expiry Sales -> REVIEW_REQUIRED", () => {
    const result = calculateCommission({
      revenue: 50_000,
      customerType: "B2C",
      transactionMonth: month(2027, 6), // one month after entitlement end
      entitlement: {
        entitlementType: "NEW_CUSTOMER",
        startMonth: month(2026, 6),
        endMonth: month(2027, 5),
        status: "EXPIRED",
      },
    });
    expect(result.reviewStatus).toBe("REVIEW_REQUIRED");
    expect(result.reviewReason).toBe("POST_EXPIRY_SALES");
  });

  it("TEST 11 — GOV without Verified Margin -> REVIEW_REQUIRED", () => {
    const result = calculateCommission({
      revenue: 100_000,
      customerType: "B2B_GOV",
      transactionMonth: month(2026, 9),
      marginReview: { margin: null, verified: false },
    });
    expect(result.reviewStatus).toBe("REVIEW_REQUIRED");
    expect(result.reviewReason).toBe("MISSING_VERIFIED_MARGIN");
  });

  it("TEST 12 — Legacy without Approved Rule -> REVIEW_REQUIRED", () => {
    const result = calculateCommission({
      revenue: 100_000,
      customerType: "B2B_PRIVATE",
      transactionMonth: month(2026, 9),
      entitlement: {
        entitlementType: "LEGACY_TRANSITION",
        startMonth: month(2020, 1),
        endMonth: month(2030, 1),
        status: "REVIEW_REQUIRED",
        legacyRuleId: null,
        legacyRate: null,
      },
    });
    expect(result.reviewStatus).toBe("REVIEW_REQUIRED");
    expect(result.reviewReason).toBe("MISSING_LEGACY_RULE");
  });
});

describe("Additional engine coverage", () => {
  it("does not apply the cap when commission is under the threshold", () => {
    const result = applyCommissionCap(15_000);
    expect(result.capStatus).toBe("NOT_APPLIED");
    expect(result.finalCommission).toBe(15_000);
  });

  it("uses the approved Legacy rate when present", () => {
    const result = calculateCommission({
      revenue: 100_000,
      customerType: "B2B_PRIVATE",
      transactionMonth: month(2026, 9),
      entitlement: {
        entitlementType: "LEGACY_TRANSITION",
        startMonth: month(2020, 1),
        endMonth: month(2030, 1),
        status: "ACTIVE",
        legacyRuleId: "LEGACY-RULE-001",
        legacyRate: 0.006,
      },
    });
    expect(result.reviewStatus).toBe("OK");
    expect(result.rateApplied).toBeCloseTo(0.006);
    expect(result.finalCommission).toBeCloseTo(600);
  });

  it("calculates a verified GOV transaction end-to-end", () => {
    const result = calculateCommission({
      revenue: 100_000,
      customerType: "B2B_GOV",
      transactionMonth: month(2026, 9),
      marginReview: { margin: 25, verified: true },
    });
    expect(result.reviewStatus).toBe("OK");
    expect(result.rateApplied).toBeCloseTo(0.008);
    expect(result.finalCommission).toBeCloseTo(800);
  });
});
