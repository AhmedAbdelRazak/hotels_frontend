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

const hasOwn = (value, key) =>
  Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);

export const getAdminReservationFinancialCurrency = (reservation = {}) => {
  const normalized = String(reservation?.financial_totals_currency || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "SAR";
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

const verifiedOtaNetTotal = (reservation = {}) => {
  const sources = [
    reservation?.adminPricing,
    reservation?.ota_financial_summary,
    reservation?.otaFinancialSummary,
  ];

  for (const source of sources) {
    if (source?.commercialVerified !== true) continue;
    for (const value of [
      source.netAfterExpensesTotal,
      source.netAfterExpenses,
      source.net_after_expenses_total,
      source.net_after_expenses,
    ]) {
      const amount = finiteMoneyOrNull(value);
      if (amount !== null) return amount;
    }
  }
  return null;
};

const OTA_SOURCE_PATTERN =
  /(?:agoda|booking(?:\.com)?|expedia|hotels\.com|trip(?:\.com)?|ctrip|airbnb|traveloka|hotelbeds|hotelrunner|ota)/i;

const isOtaManagedReservation = (reservation = {}) => {
  const mode = String(reservation?.adminPricing?.mode || "");
  const source = [
    reservation?.booking_source,
    reservation?.customer_booking_source,
    reservation?.customer_details?.booking_source,
    reservation?.supplierData?.supplierName,
    reservation?.supplierData?.hotelRunner?.provider,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    /(?:hotelrunner|ota|platform_sync)/i.test(mode) ||
    OTA_SOURCE_PATTERN.test(source) ||
    Boolean(
      reservation?.supplierData?.otaCommercialEvidence ||
        reservation?.supplierData?.hotelRunner ||
        reservation?.supplierData?.hotelRunnerEmailCommercialEvidence,
    )
  );
};

export const getAdminReservationGrossTotal = (reservation = {}) => {
  if (hasOwn(reservation, "gross_total_amount")) {
    // The backend has already resolved the commercial role. An explicit null
    // means unavailable and must not be replaced with a raw/root-like total.
    return finiteMoneyOrNull(reservation.gross_total_amount);
  }

  const formattedTableGross = finiteMoneyOrNull(
    reservation?.display_total_amount,
  );
  if (formattedTableGross !== null) return formattedTableGross;

  const guestGross = getReservationPropertyGuestGrossDisplay(reservation);
  if (guestGross.isHotelRunner) {
    return guestGross.available ? guestGross.amount : null;
  }

  const verifiedClientTotal = verifiedOtaClientTotal(reservation);
  // Preserve the legacy table precedence outside HotelRunner. The HotelRunner
  // branch above has already failed closed to verified property roles only.
  return (
    finiteMoneyOrNull(reservation?.total_amount) ??
    verifiedClientTotal ??
    guestGross.amount ??
    0
  );
};

export const getAdminReservationNetTotal = (reservation = {}) => {
  const grossTotal = () => getAdminReservationGrossTotal(reservation);

  if (reservation?.net_total_available === false) {
    return grossTotal();
  }

  if (hasOwn(reservation, "net_total_amount")) {
    return finiteMoneyOrNull(reservation.net_total_amount) ?? grossTotal();
  }

  const formattedTableNet = finiteMoneyOrNull(
    reservation?.display_net_total_amount,
  );
  if (formattedTableNet !== null) return formattedTableNet;

  const guestGross = getReservationPropertyGuestGrossDisplay(reservation);
  if (guestGross.isHotelRunner) {
    const hotelRunnerPayout = getHotelRunnerPayoutDisplay(reservation);
    const verifiedPayout = hotelRunnerPayout.verified
      ? finiteMoneyOrNull(hotelRunnerPayout.netAmount)
      : null;
    return verifiedPayout ?? grossTotal();
  }

  if (isOtaManagedReservation(reservation)) {
    // Older full-record responses can still provide a commercially verified
    // net total. The reservation-list policy displays gross when net is not
    // available, while preserving every valid explicit zero or negative net.
    return verifiedOtaNetTotal(reservation) ?? grossTotal();
  }

  const savedNet = finiteMoneyOrNull(
    reservation?.adminPricing?.netAfterExpensesTotal,
  );
  return savedNet ?? grossTotal();
};

export const getAdminReservationDisplayTotal = (
  reservation = {},
  { preferNetAfterExpenses = false } = {},
) => {
  return preferNetAfterExpenses
    ? getAdminReservationNetTotal(reservation)
    : getAdminReservationGrossTotal(reservation);
};
