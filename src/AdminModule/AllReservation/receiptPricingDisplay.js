import { getHotelRunnerPricingDisplay } from "./hotelRunnerPricingDisplay";

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
 * HotelRunner's reservation total is the guest gross. It is not an OTA payout
 * or hotel net amount, even when a local contracted/base value also exists.
 */
export const getReceiptPricingDisplay = (
  reservation = {},
  legacyAmount = 0,
) => {
  const hotelRunnerPricing = getHotelRunnerPricingDisplay(reservation);
  const safeLegacyAmount = finiteAmountOrNull(legacyAmount) ?? 0;

  if (!hotelRunnerPricing.isHotelRunner) {
    return {
      isHotelRunner: false,
      available: true,
      accommodationLabel: "Net Accommodation Charge",
      amount: safeLegacyAmount,
      currency: "SAR",
    };
  }

  return {
    isHotelRunner: true,
    available:
      finiteAmountOrNull(hotelRunnerPricing.summary?.grandTotal) !== null,
    accommodationLabel: "Gross Reservation Total",
    amount: finiteAmountOrNull(hotelRunnerPricing.summary?.grandTotal),
    currency: hotelRunnerPricing.currency || "SAR",
  };
};

export { finiteAmountOrNull };
