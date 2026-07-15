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
  const fallbackTotal = finiteMoneyOrNull(reservation?.total_amount) ?? 0;
  if (!preferNetAfterExpenses) return fallbackTotal;

  const netAfterExpenses = finiteMoneyOrNull(
    reservation?.adminPricing?.netAfterExpensesTotal,
  );
  return netAfterExpenses ?? fallbackTotal;
};
