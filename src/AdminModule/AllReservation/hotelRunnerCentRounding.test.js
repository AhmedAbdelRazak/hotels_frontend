import {
  formatOtaAdminListGuestGross,
  formatOtaPricingModalGuestGross,
  resolveOtaPricingModalSavedTotals,
} from "../OtaReservations/otaPricingModalModel";
import {
  getAdminReservationGrossTotal,
  getAdminReservationNetTotal,
} from "./reservationTableAmounts";

const convertedTripReservation = () => ({
  total_amount: 421.58,
  sub_total: 525,
  currency: "SAR",
  adminPricing: {
    mode: "hotelrunner_api",
    commercialVerified: true,
    clientTotal: 421.58,
    rootTotal: 525,
    netAfterExpensesTotal: 398.21,
    sourceCurrency: "USD",
    propertyCurrency: "SAR",
  },
  ota_financial_summary: {
    commercialVerified: true,
    clientTotal: 421.58,
    netAfterExpenses: 398.21,
    netAfterOtaExpenses: 398.21,
    sourceCurrency: "USD",
    propertyCurrency: "SAR",
  },
  supplierData: {
    hotelRunner: {
      transport: "hotelrunner_api",
      reservationId: "hotelrunner-reservation",
    },
    otaCommercialEvidence: {
      contractVersion: 1,
      provider: "trip",
      sourceType: "authenticated_ota_email",
      sourceCurrency: "USD",
      propertyCurrency: "SAR",
      bookingBasis: "reservation_total",
      verificationState: "verified",
      evidenceHash: "a".repeat(64),
      currencyConversion: {
        verified: true,
        sourceCurrency: "USD",
        propertyCurrency: "SAR",
        rate: 3.75,
        sourceRef: "conversion",
      },
      provenance: {
        primary: {
          provider: "trip",
          sourceType: "authenticated_ota_email",
          sourceHash: "b".repeat(64),
          sourceTimestamp: "2026-08-10T10:01:45.000Z",
          sourceId: "trip-email-cent-rounding",
        },
        conversion: {
          provider: "exchange_rate_api",
          sourceType: "trusted_exchange_evidence",
          sourceHash: "c".repeat(64),
          sourceTimestamp: "2026-08-10T10:00:01.000Z",
          sourceId: "exchange-rate-usd-sar-cent-rounding",
        },
      },
      roles: {
        guestGross: {
          verified: true,
          sourceAmount: 112.42,
          sourceCurrency: "USD",
          propertyAmount: 421.58,
          propertyCurrency: "SAR",
          bookingBasis: "reservation_total",
          evidenceType: "authenticated_source",
          sourceRef: "primary",
        },
        hotelPayout: {
          verified: true,
          sourceAmount: 106.19,
          sourceCurrency: "USD",
          propertyAmount: 398.21,
          propertyCurrency: "SAR",
          bookingBasis: "reservation_total",
          evidenceType: "authenticated_source",
          sourceRef: "primary",
        },
      },
    },
  },
});

describe("HotelRunner converted-money cent rounding", () => {
  it("shows the verified 112.42 USD gross as 421.58 SAR in OTA review", () => {
    const reservation = convertedTripReservation();
    const totals = resolveOtaPricingModalSavedTotals(reservation);

    expect(totals).toMatchObject({
      guestGrossAvailable: true,
      guestGrossAmount: 421.58,
      guestGrossCurrency: "SAR",
      clientAvailable: true,
      clientTotal: 421.58,
      netAvailable: true,
      netAfterExpensesTotal: 398.21,
    });
    expect(formatOtaPricingModalGuestGross(totals)).toBe("421.58 SAR");
    expect(formatOtaAdminListGuestGross(reservation)).toBe("421.58 SAR");
  });

  it("shows the same verified gross and payout in all reservations", () => {
    const reservation = convertedTripReservation();

    expect(getAdminReservationGrossTotal(reservation)).toBe(421.58);
    expect(getAdminReservationNetTotal(reservation)).toBe(398.21);
  });
});
