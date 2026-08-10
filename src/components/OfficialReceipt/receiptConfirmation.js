const INVALID_CONFIRMATION_VALUES = new Set([
  "",
  "-",
  "--",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "not available",
  "not provided",
  "—",
  "غير متاح",
]);

const cleanConfirmationValue = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const cleaned = String(value).trim();
  return INVALID_CONFIRMATION_VALUES.has(cleaned.toLowerCase())
    ? ""
    : cleaned;
};

export const getReceiptConfirmationValues = (reservation = {}) => {
  const supplier = reservation?.supplierData || {};
  const customer = reservation?.customer_details || {};
  const alternateCustomer = reservation?.customerDetails || {};
  const candidates = [
    reservation?.confirmation_number,
    supplier?.platformConfirmationNumber,
    supplier?.otaConfirmationNumber,
    supplier?.suppliedBookingNo,
    supplier?.supplierBookingNo,
    supplier?.supplierBookingNumber,
    reservation?.otaPlatformReview?.confirmationNumber,
    customer?.confirmation_number2,
    customer?.confirmationNumber2,
    alternateCustomer?.confirmation_number2,
    alternateCustomer?.confirmationNumber2,
    reservation?.confirmation_number2,
    reservation?.confirmationNumber2,
    customer?.confirmation_number,
    alternateCustomer?.confirmation_number,
  ];
  const seen = new Set();

  return candidates.reduce((values, candidate) => {
    const cleaned = cleanConfirmationValue(candidate);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) return values;
    seen.add(key);
    values.push(cleaned);
    return values;
  }, []);
};

export const getReceiptConfirmationDisplay = (reservation = {}) =>
  getReceiptConfirmationValues(reservation).slice(0, 2).join(" / ") || "N/A";
