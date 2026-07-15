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

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const hasNonZeroMoney = (...values) =>
  values.some((value) => value !== null && value !== 0);

const resolveAvailablePlatformAmount = ({
  adminPricing,
  otaFinancialSummary,
} = {}) => {
  const savedMargin = finiteMoneyOrNull(adminPricing?.platformMarginTotal);
  const savedNet = finiteMoneyOrNull(adminPricing?.netAfterExpensesTotal);
  const savedRoot = finiteMoneyOrNull(adminPricing?.rootTotal);
  const hasSavedPricingEvidence = hasNonZeroMoney(savedNet, savedRoot);

  // A non-zero saved margin is authoritative. For legacy list rows, zero can
  // also mean that the field was absent, so derive from net/root when those
  // calculated values are available before accepting zero as genuine.
  if (savedMargin !== null && savedMargin !== 0) return savedMargin;

  const summaryMargin = finiteMoneyOrNull(
    otaFinancialSummary?.platformProfit ?? otaFinancialSummary?.profit,
  );
  const summaryNet = finiteMoneyOrNull(
    otaFinancialSummary?.netAfterExpenses ??
      otaFinancialSummary?.netAfterOtaExpenses ??
      otaFinancialSummary?.totalAfterOtaExpenses,
  );
  const summaryRoot = finiteMoneyOrNull(
    otaFinancialSummary?.hotelVisibleAmount ??
      otaFinancialSummary?.hotel_visible_amount,
  );
  const hasSummaryPricingEvidence = hasNonZeroMoney(summaryNet, summaryRoot);

  // A trusted non-zero summary margin takes precedence over deriving from
  // compacted list fields, where a missing root can be serialized as zero.
  if (summaryMargin !== null && summaryMargin !== 0) return summaryMargin;
  if (
    summaryNet !== null &&
    summaryRoot !== null &&
    hasSummaryPricingEvidence
  ) {
    return roundMoney(summaryNet - summaryRoot);
  }
  if (savedNet !== null && savedRoot !== null && hasSavedPricingEvidence) {
    return roundMoney(savedNet - savedRoot);
  }
  return null;
};

/**
 * The payment inputs record the gross amount collected from the guest. For a
 * configured super-admin, the footer may additionally present the privileged
 * platform amount that remains after OTA and hotel expenses. Keeping this as a
 * display-only resolver prevents the lower platform amount from changing the
 * gross payment validation or API payload.
 */
export const getPaymentBreakdownTotalDisplay = ({
  grossTotal,
  hasOtaPricing = false,
  adminPricing,
  otaFinancialSummary,
  canViewPlatformProfit = false,
} = {}) => {
  const fallbackAmount = finiteMoneyOrNull(grossTotal) ?? 0;
  const platformAmount = resolveAvailablePlatformAmount({
    adminPricing,
    otaFinancialSummary,
  });
  const usesPlatformAmount =
    canViewPlatformProfit === true &&
    hasOtaPricing === true &&
    platformAmount !== null;

  return {
    amount: usesPlatformAmount ? platformAmount : fallbackAmount,
    usesPlatformAmount,
  };
};
