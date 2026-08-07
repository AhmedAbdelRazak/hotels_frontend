import { getPaymentBreakdownTotalDisplay } from "./paymentBreakdownDisplay";

describe("admin payment breakdown total display", () => {
  it("shows the privileged platform amount for the reported OTA example", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 86.25,
        hasOtaPricing: true,
        adminPricing: {
          clientTotal: 86.25,
          rootTotal: 1,
          netAfterExpensesTotal: 61.74,
          otaExpenseTotal: 24.51,
          platformMarginTotal: 60.74,
          commissionAmount: 5,
        },
        canViewPlatformProfit: true,
      }),
    ).toEqual({ amount: 60.74, usesPlatformAmount: true });
  });

  it("does not expose platform profit to a regular admin employee", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 86.25,
        hasOtaPricing: true,
        adminPricing: { platformMarginTotal: 60.74 },
        canViewPlatformProfit: false,
      }),
    ).toEqual({ amount: 86.25, usesPlatformAmount: false });
  });

  it("keeps the gross amount for reservations without OTA pricing", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: "1,200.50",
        hasOtaPricing: false,
        adminPricing: { platformMarginTotal: 400 },
        canViewPlatformProfit: true,
      }),
    ).toEqual({ amount: 1200.5, usesPlatformAmount: false });
  });

  it.each([0, -10])(
    "preserves a finite privileged platform amount of %p",
    (platformAmount) => {
      expect(
        getPaymentBreakdownTotalDisplay({
          grossTotal: 500,
          hasOtaPricing: true,
          adminPricing: {
            netAfterExpensesTotal: platformAmount === 0 ? 100 : 90,
            rootTotal: platformAmount === 0 ? 100 : 100,
            platformMarginTotal: platformAmount,
          },
          canViewPlatformProfit: true,
        }),
      ).toEqual({ amount: platformAmount, usesPlatformAmount: true });
    },
  );

  it("derives a legacy platform amount when the compacted margin is zero", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 86.25,
        hasOtaPricing: true,
        adminPricing: {
          rootTotal: 1,
          netAfterExpensesTotal: 61.74,
          otaExpenseTotal: 24.51,
          platformMarginTotal: 0,
        },
        canViewPlatformProfit: true,
      }),
    ).toEqual({ amount: 60.74, usesPlatformAmount: true });
  });

  it("uses the trusted OTA financial summary when saved pricing is absent", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 86.25,
        hasOtaPricing: true,
        adminPricing: {},
        otaFinancialSummary: {
          netAfterExpenses: 61.74,
          hotelVisibleAmount: 1,
          platformProfit: 60.74,
        },
        canViewPlatformProfit: true,
      }),
    ).toEqual({ amount: 60.74, usesPlatformAmount: true });
  });

  it("prefers a trusted margin over a compacted missing root serialized as zero", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 86.25,
        hasOtaPricing: true,
        adminPricing: {
          rootTotal: 0,
          netAfterExpensesTotal: 61.74,
          platformMarginTotal: 0,
        },
        otaFinancialSummary: {
          netAfterExpenses: 61.74,
          hotelVisibleAmount: 1,
          platformProfit: 60.74,
        },
        canViewPlatformProfit: true,
      }),
    ).toEqual({ amount: 60.74, usesPlatformAmount: true });
  });

  it.each([undefined, null, "", "not money", Number.NaN, false, {}])(
    "falls back safely when the privileged amount is unavailable: %p",
    (platformAmount) => {
      expect(
        getPaymentBreakdownTotalDisplay({
          grossTotal: 86.25,
          hasOtaPricing: true,
          adminPricing: { platformMarginTotal: platformAmount },
          canViewPlatformProfit: true,
        }),
      ).toEqual({ amount: 86.25, usesPlatformAmount: false });
    },
  );

  it("does not mistake uncalculated schema-default zeros for a real total", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 86.25,
        hasOtaPricing: true,
        adminPricing: {
          rootTotal: 0,
          netAfterExpensesTotal: 0,
          otaExpenseTotal: 0,
          platformMarginTotal: 0,
        },
        canViewPlatformProfit: true,
      }),
    ).toEqual({ amount: 86.25, usesPlatformAmount: false });
  });

  it("ignores an all-zero generated summary whose only value is gross expense", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 86.25,
        hasOtaPricing: true,
        adminPricing: {
          rootTotal: 0,
          netAfterExpensesTotal: 0,
          otaExpenseTotal: 0,
          platformMarginTotal: 0,
        },
        otaFinancialSummary: {
          netAfterExpenses: 0,
          hotelVisibleAmount: 0,
          otaExpenseTotal: 86.25,
          platformProfit: 0,
        },
        canViewPlatformProfit: true,
      }),
    ).toEqual({ amount: 86.25, usesPlatformAmount: false });
  });

  it("never substitutes an unverified HotelRunner commercial amount for gross", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 1000,
        hasOtaPricing: true,
        adminPricing: {
          mode: "hotelrunner_api",
          rootTotal: 700,
          netAfterExpensesTotal: 1000,
          platformMarginTotal: 300,
          commercialVerified: false,
        },
        canViewPlatformProfit: true,
        isHotelRunner: true,
        commercialVerified: false,
      }),
    ).toEqual({ amount: 1000, usesPlatformAmount: false });
  });

  it("permits a verified HotelRunner commercial amount", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 1000,
        hasOtaPricing: true,
        adminPricing: {
          commercialVerified: true,
          rootTotal: 700,
          netAfterExpensesTotal: 850,
          platformMarginTotal: 150,
        },
        canViewPlatformProfit: true,
        isHotelRunner: true,
      }),
    ).toEqual({ amount: 150, usesPlatformAmount: true });
  });

  it("preserves an explicitly reviewed HotelRunner zero margin", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 1000,
        hasOtaPricing: true,
        adminPricing: {
          commercialVerified: true,
          platformMarginTotal: 0,
        },
        canViewPlatformProfit: true,
        isHotelRunner: true,
      }),
    ).toEqual({ amount: 0, usesPlatformAmount: true });
  });

  it("does not treat verified net evidence as platform-margin verification", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 1000,
        hasOtaPricing: true,
        adminPricing: {
          commercialVerified: true,
          netAfterExpensesTotal: 850,
        },
        canViewPlatformProfit: true,
        isHotelRunner: true,
      }),
    ).toEqual({ amount: 1000, usesPlatformAmount: false });
  });

  it("fails closed on conflicting HotelRunner margin evidence", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: 1000,
        hasOtaPricing: true,
        reservation: {
          adminPricing: {
            mode: "hotelrunner_api",
            commercialVerified: true,
            netAfterExpensesTotal: 850,
            platformMarginTotal: 150,
          },
          ota_financial_summary: {
            commercialVerified: true,
            netAfterExpenses: 850,
            platformProfit: 140,
          },
        },
        canViewPlatformProfit: true,
        isHotelRunner: true,
      }),
    ).toEqual({ amount: 1000, usesPlatformAmount: false });
  });

  it("keeps a missing HotelRunner canonical gross unavailable", () => {
    expect(
      getPaymentBreakdownTotalDisplay({
        grossTotal: null,
        hasOtaPricing: true,
        adminPricing: { mode: "hotelrunner_api" },
        canViewPlatformProfit: false,
        isHotelRunner: true,
      }),
    ).toEqual({ amount: null, usesPlatformAmount: false });
  });
});
