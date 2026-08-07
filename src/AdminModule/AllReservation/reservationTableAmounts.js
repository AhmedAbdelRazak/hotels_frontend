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

export const getAdminReservationDisplayTotal = (
  reservation = {},
  { preferNetAfterExpenses = false } = {},
) => {
  const guestGross = getReservationGuestGrossDisplay(reservation);
  const fallbackTotal = guestGross.isHotelRunner
    ? guestGross.amount
    : finiteMoneyOrNull(reservation?.total_amount) ?? 0;
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
