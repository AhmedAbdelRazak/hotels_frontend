import {
  getAdminReservationDisplayTotal,
  getAdminReservationFinancialCurrency,
  getAdminReservationGrossTotal,
  getAdminReservationNetTotal,
} from "./reservationTableAmounts";

describe("admin reservation table total", () => {
  it("uses the backend financial currency and safely defaults to SAR", () => {
    expect(
      getAdminReservationFinancialCurrency({
        financial_totals_currency: " usd ",
      }),
    ).toBe("USD");
    expect(getAdminReservationFinancialCurrency({})).toBe("SAR");
    expect(
      getAdminReservationFinancialCurrency({
        financial_totals_currency: "not-a-currency",
      }),
    ).toBe("SAR");
  });

  it("prefers backend-resolved gross and net roles for compact OTA rows", () => {
    const reservation = {
      booking_source: "agoda",
      gross_total_amount: " 73.50 ",
      net_total_amount: "45.47",
      total_amount: 75,
      paid_amount: 73.5,
      adminPricing: {
        mode: "hotelrunner_api",
        commercialVerified: false,
        rootTotal: 75,
      },
    };

    expect(getAdminReservationGrossTotal(reservation)).toBe(73.5);
    expect(getAdminReservationNetTotal(reservation)).toBe(45.47);
  });

  it("preserves explicit unavailable backend roles instead of using raw totals", () => {
    const reservation = {
      booking_source: "agoda",
      gross_total_amount: null,
      net_total_amount: null,
      total_amount: 500,
      paid_amount: 500,
      sub_total: 550,
    };

    expect(getAdminReservationGrossTotal(reservation)).toBeNull();
    expect(getAdminReservationNetTotal(reservation)).toBeNull();
  });

  it("keeps the client total when net preference is not requested", () => {
    expect(
      getAdminReservationDisplayTotal({
        total_amount: 1200,
        adminPricing: { netAfterExpensesTotal: 900 },
      }),
    ).toBe(1200);
  });

  it("prefers a valid net-after-expenses total for the all-reservations table", () => {
    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: 1200,
          adminPricing: { netAfterExpensesTotal: " 1,050.50 " },
        },
        { preferNetAfterExpenses: true },
      ),
    ).toBe(1050.5);
  });

  it("preserves a finite negative net total when expenses exceed revenue", () => {
    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: 1200,
          adminPricing: { netAfterExpensesTotal: -10 },
        },
        { preferNetAfterExpenses: true },
      ),
    ).toBe(-10);
  });

  it("uses only a commercially verified saved OTA net, never a derived summary", () => {
    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: 1200,
          adminPricing: {
            mode: "ota_platform_sync",
            commercialVerified: true,
            netAfterExpensesTotal: 1050,
          },
          ota_financial_summary: {
            show: true,
            netAfterExpenses: "1,025.75",
          },
        },
        { preferNetAfterExpenses: true },
      ),
    ).toBe(1050);

    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: 1200,
          ota_financial_summary: {
            show: true,
            netAfterExpenses: "1,025.75",
          },
        },
        { preferNetAfterExpenses: true },
      ),
    ).toBe(1200);
  });

  it("does not invent an OTA net from gross, paid amount, or root total", () => {
    expect(
      getAdminReservationNetTotal({
        booking_source: "trip.com",
        total_amount: 120.45,
        paid_amount: 120.45,
        sub_total: 125,
        adminPricing: {
          mode: "ota_platform_sync",
          rootTotal: 125,
          commercialVerified: false,
        },
      }),
    ).toBeNull();
  });

  it("falls back when the API marks an uncalculated net total unavailable", () => {
    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: 1200,
          adminPricing: { mode: "", netAfterExpensesTotal: null },
        },
        { preferNetAfterExpenses: true },
      ),
    ).toBe(1200);
  });

  it("preserves every explicit zero emitted by the API", () => {
    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: 1200,
          adminPricing: { netAfterExpensesTotal: 0 },
        },
        { preferNetAfterExpenses: true },
      ),
    ).toBe(0);
  });

  it.each([
    undefined,
    null,
    "",
    "   ",
    "900 SAR",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    {},
    [],
    false,
  ])(
    "falls back when the preferred value is unavailable or invalid: %p",
    (net) => {
      expect(
        getAdminReservationDisplayTotal(
          {
            total_amount: " 1,200.25 ",
            adminPricing: {
              mode: "admin_three_price",
              netAfterExpensesTotal: net,
            },
          },
          { preferNetAfterExpenses: true },
        ),
      ).toBe(1200.25);
    },
  );

  it("uses zero when neither the preferred value nor fallback is valid", () => {
    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: "not money",
          adminPricing: { netAfterExpensesTotal: null },
        },
        { preferNetAfterExpenses: true },
      ),
    ).toBe(0);
  });

  it("keeps an unverified HotelRunner total unavailable", () => {
    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: 1000,
          adminPricing: {
            mode: "hotelrunner_api",
            commercialVerified: false,
            netAfterExpensesTotal: 850,
          },
          supplierData: {
            hotelRunner: {
              transport: "hotelrunner_api",
              pricing: { grandTotal: 1000 },
            },
          },
        },
        { preferNetAfterExpenses: true },
      ),
    ).toBeNull();
  });

  it("does not treat a saved legacy HotelRunner total as verified guest gross", () => {
    expect(
      getAdminReservationDisplayTotal({
        total_amount: 91.14,
        adminPricing: { mode: "hotelrunner_api" },
        supplierData: {
          hotelRunner: { transport: "hotelrunner_api", reservationId: "hr-1" },
        },
      }),
    ).toBeNull();
  });

  it("fails closed when HotelRunner source and legacy totals have unknown roles", () => {
    expect(
      getAdminReservationDisplayTotal({
        total_amount: 91.14,
        adminPricing: { mode: "hotelrunner_api" },
        supplierData: {
          hotelRunner: {
            transport: "hotelrunner_api",
            reservationId: "r071469597",
            pricing: { grandTotal: 56.39 },
          },
        },
      }),
    ).toBeNull();
  });

  it("prefers the verified OTA client total over a raw HotelRunner amount that is actually the payout", () => {
    expect(
      getAdminReservationDisplayTotal({
        total_amount: 91.14,
        adminPricing: {
          mode: "hotelrunner_api",
          commercialVerified: true,
          clientTotal: 91.14,
          netAfterExpensesTotal: 56.39,
        },
        supplierData: {
          hotelRunnerEmailCommercialEvidence: {
            version: 2,
            verified: true,
            source: "authenticated_ota_email",
            provider: "agoda",
            grossTotalSar: 91.14,
            currency: "SAR",
            evidenceHash: "a".repeat(64),
          },
          hotelRunner: {
            transport: "hotelrunner_api",
            reservationId: "r071469597",
            pricing: { grandTotal: 56.39 },
          },
        },
      }),
    ).toBe(91.14);
  });

  it("uses a verified HotelRunner net total when net is requested", () => {
    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: 1000,
          adminPricing: {
            mode: "hotelrunner_api",
            commercialVerified: true,
            netAfterExpensesTotal: 850,
          },
          supplierData: {
            hotelRunner: { transport: "hotelrunner_api" },
          },
        },
        { preferNetAfterExpenses: true },
      ),
    ).toBe(850);
  });

  it("does not copy a verified HotelRunner guest gross into an unknown net role", () => {
    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: 1000,
          adminPricing: {
            mode: "hotelrunner_api",
            commercialVerified: false,
          },
          supplierData: {
            hotelRunner: {
              transport: "hotelrunner_api",
              pricing: { currency: "SAR", grandTotal: 1000 },
            },
            hotelRunnerEmailCommercialEvidence: {
              version: 2,
              verified: true,
              source: "authenticated_ota_email",
              provider: "agoda",
              grossTotalSar: 1000,
              currency: "SAR",
              evidenceHash: "c".repeat(64),
            },
          },
        },
        { preferNetAfterExpenses: true },
      ),
    ).toBeNull();
  });
});
