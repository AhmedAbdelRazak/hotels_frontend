import {
  getHotelRunnerPayoutDisplay,
  getReservationPropertyGuestGrossDisplay,
} from "./hotelRunnerPricingDisplay";

const finiteMoneyOrNull = (value) => {
  if (value === null || value === undefined || typeof value === "boolean") {
    return null;
  }
  if (typeof value !== "number" && typeof value !== "string") return null;

  const normalized =
    typeof value === "string" ? value.replace(/,/g, "").trim() : value;
  if (normalized === "") return null;

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};

const verifiedOtaClientTotal = (reservation = {}) => {
  const sources = [
    reservation?.adminPricing,
    reservation?.ota_financial_summary,
    reservation?.otaFinancialSummary,
  ];

  for (const source of sources) {
    if (source?.commercialVerified !== true) continue;
    for (const value of [source.clientTotal, source.client_total]) {
      const amount = finiteMoneyOrNull(value);
      if (amount !== null) return amount;
    }
  }
  return null;
};

export const getAdminReservationDisplayTotal = (
  reservation = {},
  { preferNetAfterExpenses = false } = {},
) => {
  const guestGross = getReservationPropertyGuestGrossDisplay(reservation);
  if (guestGross.isHotelRunner) {
    const fallbackTotal = guestGross.available ? guestGross.amount : null;
    if (!preferNetAfterExpenses) return fallbackTotal;
    const hotelRunnerPayout = getHotelRunnerPayoutDisplay(reservation);
    // A caller asking for payout/net must never receive the guest gross as a
    // semantic fallback. Unknown HotelRunner payout remains unavailable.
    return hotelRunnerPayout.verified ? hotelRunnerPayout.netAmount : null;
  }
  const verifiedClientTotal = verifiedOtaClientTotal(reservation);
  // Preserve the legacy table precedence outside HotelRunner. The HotelRunner
  // branch above has already failed closed to verified property roles only.
  const fallbackTotal =
    finiteMoneyOrNull(reservation?.total_amount) ??
    verifiedClientTotal ??
    guestGross.amount ??
    0;
  if (!preferNetAfterExpenses) return fallbackTotal;

  const netAfterExpenses = finiteMoneyOrNull(
    reservation?.adminPricing?.netAfterExpensesTotal,
  );
  return netAfterExpenses ?? fallbackTotal;
};
