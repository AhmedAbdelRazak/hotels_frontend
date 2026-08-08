import { getAdminReservationDisplayTotal } from "./reservationTableAmounts";

describe("admin reservation table total", () => {
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

  it("uses only the canonical saved field, never a derived summary value", () => {
    expect(
      getAdminReservationDisplayTotal(
        {
          total_amount: 1200,
          adminPricing: {
            mode: "ota_platform_sync",
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

  it("keeps HotelRunner gross total until the OTA payout is verified", () => {
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
    ).toBe(1000);
  });

  it("falls back to the saved PMS total in the admin table when canonical HotelRunner gross is absent", () => {
    expect(
      getAdminReservationDisplayTotal({
        total_amount: 91.14,
        adminPricing: { mode: "hotelrunner_api" },
        supplierData: {
          hotelRunner: { transport: "hotelrunner_api", reservationId: "hr-1" },
        },
      }),
    ).toBe(91.14);
  });

  it("keeps total_amount ahead of a conflicting HotelRunner source amount", () => {
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
    ).toBe(91.14);
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
});
