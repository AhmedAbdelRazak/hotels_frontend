import {
  getReservationPropertyGuestGrossDisplay,
  isHotelRunnerReservation,
} from "./hotelRunnerPricingDisplay";

const finiteAmountOrNull = (value) => {
  if (value === null || value === undefined || typeof value === "boolean") {
    return null;
  }
  const amount = Number(
    typeof value === "string" ? value.replace(/,/g, "").trim() : value,
  );
  return Number.isFinite(amount) ? amount : null;
};

/**
 * Keeps receipt totals truthful without changing any legacy reservation output.
 * A HotelRunner receipt uses only a verified property-currency guest-gross
 * role. The generic HotelRunner total, source-only gross, local base, and OTA
 * payout are never substitutes in receipt arithmetic.
 */
export const getReceiptPricingDisplay = (
  reservation = {},
  legacyAmount = 0,
) => {
  const isHotelRunner = isHotelRunnerReservation(reservation);
  const safeLegacyAmount = finiteAmountOrNull(legacyAmount) ?? 0;

  if (!isHotelRunner) {
    return {
      isHotelRunner: false,
      available: true,
      accommodationLabel: "Net Accommodation Charge",
      amount: safeLegacyAmount,
      currency: "SAR",
    };
  }

  const guestGross = getReservationPropertyGuestGrossDisplay(reservation);

  return {
    isHotelRunner: true,
    available: guestGross.available === true,
    accommodationLabel: "Gross Reservation Total",
    amount: guestGross.available ? finiteAmountOrNull(guestGross.amount) : null,
    currency: guestGross.currency || "SAR",
  };
};

export { finiteAmountOrNull };
