import { getReceiptPricingDisplay } from "./receiptPricingDisplay";

const hotelRunnerReservation = (overrides = {}) => ({
  total_amount: 1000,
  sub_total: 700,
  adminPricing: {
    mode: "hotelrunner_api",
    rootTotal: 700,
    commercialVerified: false,
  },
  supplierData: {
    hotelRunner: {
      transport: "hotelrunner_api",
      reservationId: "hr-reservation-1",
      pricing: {
        currency: "SAR",
        grandTotal: 1000,
      },
    },
  },
  ...overrides,
});

const withVerifiedGross = (reservation = hotelRunnerReservation()) => ({
  ...reservation,
  adminPricing: {
    ...reservation.adminPricing,
    commercialVerified: true,
    clientTotal: 1000,
  },
  supplierData: {
    ...reservation.supplierData,
    hotelRunnerEmailCommercialEvidence: {
      version: 2,
      verified: true,
      source: "authenticated_ota_email",
      provider: "agoda",
      grossTotalSar: 1000,
      currency: "SAR",
      evidenceHash: "a".repeat(64),
    },
  },
});

test("preserves the legacy receipt amount and wording for non-HotelRunner reservations", () => {
  expect(
    getReceiptPricingDisplay(
      { total_amount: 155, sub_total: 100, booking_source: "Website" },
      155,
    ),
  ).toEqual({
    isHotelRunner: false,
    available: true,
    accommodationLabel: "Net Accommodation Charge",
    amount: 155,
    currency: "SAR",
  });
});

test("labels only verified HotelRunner guest gross and never substitutes the local base", () => {
	const display = getReceiptPricingDisplay(withVerifiedGross(), 700);

  expect(display).toEqual({
    isHotelRunner: true,
    available: true,
    accommodationLabel: "Gross Reservation Total",
    amount: 1000,
    currency: "SAR",
  });
  expect(display.amount).not.toBe(700);
});

test("keeps HotelRunner gross unavailable when the canonical total is absent", () => {
  const reservation = hotelRunnerReservation({
    total_amount: "1,250.50",
    supplierData: {
      hotelRunner: {
        transport: "hotelrunner_api",
        reservationId: "hr-reservation-2",
        pricing: { currency: "USD" },
      },
    },
  });

  expect(getReceiptPricingDisplay(reservation, 600)).toEqual({
    isHotelRunner: true,
    available: false,
    accommodationLabel: "Gross Reservation Total",
    amount: null,
    currency: "SAR",
  });
});

test("verified commercial net evidence never replaces the guest gross on a receipt", () => {
  const display = getReceiptPricingDisplay(
    hotelRunnerReservation({
      adminPricing: {
        mode: "hotelrunner_api",
        rootTotal: 700,
        commercialVerified: true,
        netAfterExpensesTotal: 850,
        otaExpenseTotal: 150,
      },
    }),
    700,
  );

	expect(display.available).toBe(false);
	expect(display.amount).toBeNull();
	expect(display.accommodationLabel).toBe("Gross Reservation Total");
});
