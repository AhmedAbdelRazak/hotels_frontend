import {
  getHotelRunnerPayoutDisplay,
  getReservationGuestGrossDisplay,
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
  const guestGross = getReservationGuestGrossDisplay(reservation);
  const verifiedClientTotal = verifiedOtaClientTotal(reservation);
  // The admin table's Total column is the PMS reservation total. HotelRunner's
  // raw `grandTotal` may represent a payout for some channel payloads, so it is
  // only a last-resort fallback when the local reservation has no saved total.
  const fallbackTotal =
    finiteMoneyOrNull(reservation?.total_amount) ??
    verifiedClientTotal ??
    guestGross.amount ??
    0;
  if (!preferNetAfterExpenses) return fallbackTotal;

  const hotelRunnerPayout = getHotelRunnerPayoutDisplay(reservation);
  if (hotelRunnerPayout.isHotelRunner) {
    return hotelRunnerPayout.verified
      ? hotelRunnerPayout.netAmount
      : fallbackTotal;
  }

  const netAfterExpenses = finiteMoneyOrNull(
    reservation?.adminPricing?.netAfterExpensesTotal,
  );
  return netAfterExpenses ?? fallbackTotal;
};
