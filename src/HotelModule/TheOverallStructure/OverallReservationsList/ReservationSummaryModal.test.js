import {
  buildReservationSummary,
  buildReservationSummaryTableRows,
  summaryText,
} from "./ReservationSummaryModal";

const hotelRunnerReservation = (overrides = {}) => ({
  confirmation_number: "HR-1",
  hotelId: "hotel-1",
  booking_source: "Trip.com",
  reservation_status: "confirmed",
  createdAt: "2026-08-06T12:00:00.000Z",
  checkin_date: "2026-08-10",
  checkout_date: "2026-08-11",
  total_amount: 1000,
  paid_amount: 0,
  commission: 0,
  adminPricing: {
    mode: "hotelrunner_api",
    commercialVerified: false,
  },
  supplierData: {
    hotelRunner: {
      transport: "hotelrunner_api",
      reservationId: "hotelrunner-1",
    },
  },
  ...overrides,
});

const summaryExportRow = (row) => {
  const text = summaryText("English");
  return buildReservationSummaryTableRows({
    rows: [row],
    type: text.bookingSource,
    text,
    labels: {},
  })[0];
};

describe("HotelRunner reservation summary commission availability", () => {
  it("aggregates verified HotelRunner guest gross", () => {
    const summary = buildReservationSummary({
      reservations: [
        hotelRunnerReservation({
          adminPricing: {
            mode: "hotelrunner_api",
            commercialVerified: true,
            clientTotal: 1000,
          },
          supplierData: {
            hotelRunner: {
              transport: "hotelrunner_api",
              reservationId: "hotelrunner-1",
              pricing: { grandTotal: 1000 },
            },
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
        }),
      ],
      chosenLanguage: "English",
    });

    expect(summary.totals.totalAmount).toBe(1000);
    expect(summary.dateRows[0].totalAmount).toBe(1000);
    expect(summary.sourceRows[0].totalAmount).toBe(1000);
    expect(summary.statusRows[0].totalAmount).toBe(1000);
    expect(summary.roomTypeRows[0].totalAmount).toBe(1000);
  });

  it("keeps missing HotelRunner canonical gross unavailable and excluded", () => {
    const summary = buildReservationSummary({
      reservations: [hotelRunnerReservation({ total_amount: 1000 })],
      chosenLanguage: "English",
    });
    const source = summary.sourceRows[0];
    const exported = summaryExportRow(source);
    const text = summaryText("English");

    expect(summary.totals).toMatchObject({
      totalAmount: null,
      totalAmountAvailability: "unavailable",
      totalAmountAvailableCount: 0,
      totalAmountUnavailableCount: 1,
    });
    expect(summary.dateRows[0].totalAmount).toBeNull();
    expect(summary.sourceRows[0].totalAmount).toBeNull();
    expect(summary.statusRows[0].totalAmount).toBeNull();
    expect(summary.roomTypeRows[0].totalAmount).toBeNull();
    expect(exported[text.totalAmount]).toBe("");
  });

  it("sums known gross while excluding a missing HotelRunner gross from mixed totals", () => {
    const summary = buildReservationSummary({
      reservations: [
        {
          confirmation_number: "LEGACY-GROSS",
          booking_source: "Direct",
          reservation_status: "confirmed",
          createdAt: "2026-08-06T13:00:00.000Z",
          total_amount: 500,
        },
        hotelRunnerReservation({ booking_source: "Direct" }),
      ],
      chosenLanguage: "English",
    });

    expect(summary.totals).toMatchObject({
      totalAmount: 500,
      totalAmountAvailability: "partial",
      totalAmountAvailableCount: 1,
      totalAmountUnavailableCount: 1,
    });
    expect(summary.sourceRows[0]).toMatchObject({
      totalAmount: 500,
      totalAmountAvailability: "partial",
    });
  });

  it("keeps an unreviewed direct HotelRunner commission unavailable instead of zero", () => {
    const summary = buildReservationSummary({
      reservations: [hotelRunnerReservation()],
      chosenLanguage: "English",
    });
    const source = summary.sourceRows[0];
    const exported = summaryExportRow(source);
    const text = summaryText("English");

    expect(summary.totals).toMatchObject({
      commissions: null,
      commissionAvailability: "unavailable",
      commissionAvailableCount: 0,
      commissionUnavailableCount: 1,
    });
    expect(source).toMatchObject({
      commissions: null,
      commissionAvailability: "unavailable",
      commissionUnavailableCount: 1,
    });
    expect(exported[text.commissions]).toBe("");
    expect(exported[text.commissionAvailability]).toBe(
      "Unavailable — Awaiting finance review",
    );
  });

  it("marks mixed aggregates partial and sums only known commission", () => {
    const legacyReservation = {
      confirmation_number: "LEGACY-1",
      booking_source: "Trip.com",
      reservation_status: "confirmed",
      createdAt: "2026-08-06T13:00:00.000Z",
      checkin_date: "2026-08-10",
      checkout_date: "2026-08-11",
      total_amount: 500,
      paid_amount: 100,
      commission: 35,
    };
    const summary = buildReservationSummary({
      reservations: [legacyReservation, hotelRunnerReservation()],
      chosenLanguage: "English",
    });
    const source = summary.sourceRows[0];
    const exported = summaryExportRow(source);
    const text = summaryText("English");

    expect(summary.totals).toMatchObject({
      commissions: 35,
      commissionAvailability: "partial",
      commissionAvailableCount: 1,
      commissionUnavailableCount: 1,
    });
    expect(source).toMatchObject({
      commissions: 35,
      commissionAvailability: "partial",
      commissionAvailableCount: 1,
      commissionUnavailableCount: 1,
    });
    expect(exported[text.commissions]).toBe(35);
    expect(exported[text.commissionAvailability]).toBe(
      "Partial — 1 reservation without reviewed commission",
    );
  });

  it("accepts an explicitly reviewed HotelRunner zero as available", () => {
    const summary = buildReservationSummary({
      reservations: [
        hotelRunnerReservation({
          financial_cycle: {
            commissionAssigned: true,
            commissionAmount: 0,
          },
        }),
      ],
      chosenLanguage: "English",
    });

    expect(summary.totals).toMatchObject({
      commissions: 0,
      commissionAvailability: "available",
      commissionAvailableCount: 1,
      commissionUnavailableCount: 0,
    });
  });

  it("fails closed and identifies conflicting reviewed evidence", () => {
    const summary = buildReservationSummary({
      reservations: [
        hotelRunnerReservation({
          commissionData: { assigned: true, amount: 15 },
          financial_cycle: {
            commissionAssigned: true,
            commissionAmount: 20,
          },
        }),
      ],
      chosenLanguage: "English",
    });
    const source = summary.sourceRows[0];
    const exported = summaryExportRow(source);
    const text = summaryText("English");

    expect(source.commissions).toBeNull();
    expect(source.commissionAvailability).toBe("unavailable");
    expect(exported[text.commissions]).toBe("");
    expect(exported[text.commissionAvailability]).toBe(
      "Unavailable — Conflicting finance evidence",
    );
  });
});
