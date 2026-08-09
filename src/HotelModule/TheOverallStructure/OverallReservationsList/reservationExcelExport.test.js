import { buildReservationExportRows } from "./reservationExcelExport";

const labels = {
  index: "#",
  hotel: "Hotel",
  confirmation: "Confirmation",
  guest: "Guest",
  phone: "Phone",
  email: "Email",
  source: "Source",
  status: "Status",
  bookedAt: "Booked at",
  createdAt: "Created at",
  checkIn: "Check in",
  checkOut: "Check out",
  nights: "Nights",
  pricePerDay: "Price per day",
  totalAmount: "Total amount",
  paidAmount: "Paid amount",
  commission: "Commission",
  commissionAvailability: "Commission availability",
  payment: "Payment",
  roomNumbers: "Rooms",
};

const hotelRunnerReservation = (overrides = {}) => ({
  confirmation_number: "HR-1",
  booking_source: "Trip.com",
  reservation_status: "confirmed",
  createdAt: "2026-08-06T12:00:00.000Z",
  checkin_date: "2026-08-10",
  checkout_date: "2026-08-11",
  total_amount: 1000,
  paid_amount: 0,
  commission: 0,
  adminPricing: { mode: "hotelrunner_api" },
  supplierData: {
    hotelRunner: {
      transport: "hotelrunner_api",
      reservationId: "hotelrunner-1",
    },
  },
  ...overrides,
});

const exportOne = (reservation) =>
  buildReservationExportRows({
    reservations: [reservation],
    labels,
    chosenLanguage: "English",
  })[0];

describe("HotelRunner reservation spreadsheet commission availability", () => {
  it("exports verified HotelRunner guest gross", () => {
    const row = exportOne(
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
    );

    expect(row[labels.totalAmount]).toBe(1000);
    expect(row[labels.pricePerDay]).toBe(1000);
  });

  it("leaves HotelRunner gross blank when canonical pricing is unavailable", () => {
    const row = exportOne(hotelRunnerReservation());

    expect(row[labels.totalAmount]).toBe("");
    expect(row[labels.pricePerDay]).toBe("");
  });

  it("exports blank commission with an explicit unreviewed status", () => {
    const row = exportOne(hotelRunnerReservation());

    expect(row[labels.commission]).toBe("");
    expect(row[labels.commissionAvailability]).toBe(
      "Unavailable — Awaiting finance review",
    );
  });

  it("exports blank commission when reviewed evidence conflicts", () => {
    const row = exportOne(
      hotelRunnerReservation({
        commissionData: { assigned: true, amount: 10 },
        financial_cycle: {
          commissionAssigned: true,
          commissionAmount: 12,
        },
      }),
    );

    expect(row[labels.commission]).toBe("");
    expect(row[labels.commissionAvailability]).toBe(
      "Unavailable — Conflicting finance evidence",
    );
  });

  it("exports an explicitly reviewed zero as available", () => {
    const row = exportOne(
      hotelRunnerReservation({
        financial_cycle: {
          commissionAssigned: true,
          commissionAmount: 0,
        },
      }),
    );

    expect(row[labels.commission]).toBe(0);
    expect(row[labels.commissionAvailability]).toBe(
      "Available — finance reviewed",
    );
  });

  it("preserves the legacy non-HotelRunner commission output and shape", () => {
    const row = exportOne({
      confirmation_number: "LEGACY-1",
      booking_source: "Direct",
      reservation_status: "confirmed",
      checkin_date: "2026-08-10",
      checkout_date: "2026-08-11",
      total_amount: 200,
      paid_amount: 50,
      commission: 12.5,
    });

    expect(row[labels.commission]).toBe(12.5);
    expect(row[labels.totalAmount]).toBe(200);
    expect(row).not.toHaveProperty(labels.commissionAvailability);
  });
});
