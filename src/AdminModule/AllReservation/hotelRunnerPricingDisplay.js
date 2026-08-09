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

const firstMoney = (...values) => {
  for (const value of values) {
    const amount = finiteMoneyOrNull(value);
    if (amount !== null) return amount;
  }
  return null;
};

const cleanText = (value) => String(value == null ? "" : value).trim();

const normalizedCurrency = (...values) => {
  for (const value of values) {
    const currency = cleanText(value).toUpperCase();
    if (/^[A-Z]{3,5}$/.test(currency)) return currency;
  }
  return "SAR";
};

const explicitCurrency = (...values) => {
  for (const value of values) {
    const currency = cleanText(value).toUpperCase();
    if (/^[A-Z]{3}$/.test(currency)) return currency;
  }
  return "";
};

const roundMoney = (value) => {
  const amount = finiteMoneyOrNull(value);
  return amount === null ? null : Number(amount.toFixed(2));
};

const sameMoney = (left, right) => {
  const leftAmount = roundMoney(left);
  const rightAmount = roundMoney(right);
  return (
    leftAmount !== null &&
    rightAmount !== null &&
    Math.abs(leftAmount - rightAmount) <= 0.009
  );
};

const normalizedArray = (value, limit = 100) =>
  Array.isArray(value) ? value.slice(0, limit) : [];

export const isHotelRunnerReservation = (reservation = {}) => {
  const supplier = reservation?.supplierData || {};
  const hotelRunner = supplier?.hotelRunner;
  const pricingMode = cleanText(reservation?.adminPricing?.mode).toLowerCase();
  const transport = cleanText(hotelRunner?.transport).toLowerCase();
  const pipeline = cleanText(supplier?.otaAutomationPipeline).toLowerCase();

  return Boolean(
    pricingMode === "hotelrunner_api" ||
      transport === "hotelrunner_api" ||
      pipeline === "hotelrunner-background-worker" ||
      (hotelRunner &&
        typeof hotelRunner === "object" &&
        (cleanText(hotelRunner.reservationId) ||
          cleanText(hotelRunner.hrNumber) ||
          hotelRunner.pricing)),
  );
};

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);

const SHA256_HEX_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i;
const MACHINE_MARKER_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const SOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const AUTHENTICATED_COMMERCIAL_SOURCE_TYPES = new Set([
  "authenticated_ota_email",
  "authenticated_ota_audit",
  "authenticated_provider_api",
  "authenticated_provider_portal",
]);
const TRUSTED_CONVERSION_SOURCE_TYPES = new Set([
  "provider_explicit_exchange",
  "hotelrunner_payment_exchange",
  "authenticated_exchange_audit",
  "trusted_exchange_evidence",
]);
const HOTELRUNNER_SOURCE_TYPES = new Set([
  "hotelrunner_api",
  "hotelrunner_email_relay",
  "hotelrunner_webhook",
]);

const evidenceSourceName = (evidence = {}) =>
  cleanText(
    typeof evidence.source === "object"
      ? evidence.source.type || evidence.source.name
      : evidence.sourceType || evidence.source,
  );

const evidenceHashIsPresent = (evidence = {}) => {
  const hash = cleanText(
    evidence.evidenceHash ||
      evidence.sourceHash ||
      evidence.provenanceHash ||
      evidence.source?.hash,
  );
  return SHA256_HEX_PATTERN.test(hash);
};

const validContractProvenance = (
  provenance,
  { provider = "", sourceType = "", allowedSourceTypes = null } = {},
) => {
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
    return false;
  }
  const provenanceProvider = cleanText(provenance.provider).toLowerCase();
  const provenanceSourceType = cleanText(provenance.sourceType).toLowerCase();
  const sourceTimestamp = cleanText(provenance.sourceTimestamp);
  return Boolean(
    MACHINE_MARKER_PATTERN.test(provenanceProvider) &&
      (!provider || provenanceProvider === provider) &&
      MACHINE_MARKER_PATTERN.test(provenanceSourceType) &&
      (!sourceType || provenanceSourceType === sourceType) &&
      (!allowedSourceTypes || allowedSourceTypes.has(provenanceSourceType)) &&
      SHA256_HEX_PATTERN.test(cleanText(provenance.sourceHash)) &&
      SOURCE_ID_PATTERN.test(cleanText(provenance.sourceId)) &&
      sourceTimestamp &&
      Number.isFinite(Date.parse(sourceTimestamp)),
  );
};

const evidenceIsVerified = (evidence = {}) => {
  const sourceType = evidenceSourceName(evidence).toLowerCase();
  const verificationState = cleanText(
    evidence.verificationState || evidence.state,
  ).toLowerCase();
  const provider = cleanText(evidence.provider).toLowerCase();
  if (
    !AUTHENTICATED_COMMERCIAL_SOURCE_TYPES.has(sourceType) ||
    !MACHINE_MARKER_PATTERN.test(provider) ||
    provider === "hotelrunner" ||
    !evidenceHashIsPresent(evidence)
  ) {
    return false;
  }

  if (Number(evidence.contractVersion) === 1) {
    const primary = evidence?.provenance?.primary;
    return Boolean(
      ["partial", "verified"].includes(verificationState) &&
        explicitCurrency(evidence.sourceCurrency) &&
        explicitCurrency(evidence.propertyCurrency) &&
        MACHINE_MARKER_PATTERN.test(
          cleanText(evidence.bookingBasis).toLowerCase(),
        ) &&
        validContractProvenance(primary, { provider, sourceType }),
    );
  }

  return (
    evidence.verified === true &&
    ["", "partial", "verified"].includes(verificationState)
  );
};

const propertyProjectionIsTrusted = (
  evidence,
  { sourceAmount, sourceCurrency, propertyAmount, propertyCurrency } = {},
) => {
  if (sourceCurrency === propertyCurrency) {
    return sameMoney(sourceAmount, propertyAmount);
  }
  const conversion = evidence?.currencyConversion;
  const conversionProvenance = evidence?.provenance?.conversion;
  const rate = finiteMoneyOrNull(conversion?.rate);
  const conversionSourceType = cleanText(
    conversionProvenance?.sourceType,
  ).toLowerCase();
  if (
    conversion?.verified !== true ||
    explicitCurrency(conversion.sourceCurrency) !== sourceCurrency ||
    explicitCurrency(conversion.propertyCurrency) !== propertyCurrency ||
    cleanText(conversion.sourceRef) !== "conversion" ||
    rate === null ||
    rate <= 0 ||
    !TRUSTED_CONVERSION_SOURCE_TYPES.has(conversionSourceType) ||
    !validContractProvenance(conversionProvenance, {
      sourceType: conversionSourceType,
      allowedSourceTypes: TRUSTED_CONVERSION_SOURCE_TYPES,
    }) ||
    (conversionSourceType === "provider_explicit_exchange" &&
      cleanText(conversionProvenance.provider).toLowerCase() !==
        cleanText(evidence.provider).toLowerCase()) ||
    (conversionSourceType === "hotelrunner_payment_exchange" &&
      cleanText(conversionProvenance.provider).toLowerCase() !== "hotelrunner")
  ) {
    return false;
  }
  return sameMoney(propertyAmount, sourceAmount * rate);
};

const verifiedRoleObject = (evidence = {}) => {
  const role = evidence?.roles?.guestGross;
  if (!role || typeof role !== "object" || Array.isArray(role)) return null;
  if (role.verified !== true) return null;

  const isProviderNeutralV1 = Number(evidence.contractVersion) === 1;
  if (
    isProviderNeutralV1 &&
    ![
      "verified",
      "sourceAmount",
      "sourceCurrency",
      "propertyAmount",
      "propertyCurrency",
      "bookingBasis",
      "evidenceType",
      "sourceRef",
    ].every((field) => hasOwn(role, field))
  ) {
    return null;
  }

  const sourceAmount = isProviderNeutralV1
    ? roundMoney(role.sourceAmount)
    : firstMoney(role.sourceAmount, role.amount, role.sourceTotal);
  const sourceCurrency = isProviderNeutralV1
    ? explicitCurrency(role.sourceCurrency)
    : explicitCurrency(
        role.sourceCurrency,
        role.currency,
        evidence.sourceCurrency,
        evidence.currency,
      );
  if (sourceAmount === null || sourceAmount < 0 || !sourceCurrency) return null;
  const evidenceSourceCurrency = explicitCurrency(
    evidence.sourceCurrency,
    evidence.currency,
  );
  if (evidenceSourceCurrency && evidenceSourceCurrency !== sourceCurrency) {
    return null;
  }

  if (
    isProviderNeutralV1 &&
    (cleanText(role.bookingBasis).toLowerCase() !==
      cleanText(evidence.bookingBasis).toLowerCase() ||
      cleanText(role.evidenceType).toLowerCase() !== "authenticated_source" ||
      cleanText(role.sourceRef).toLowerCase() !== "primary")
  ) {
    return null;
  }

  let propertyAmount = isProviderNeutralV1
    ? role.propertyAmount === null
      ? null
      : roundMoney(role.propertyAmount)
    : firstMoney(role.propertyAmount, role.propertyTotal);
  const rolePropertyCurrency = explicitCurrency(role.propertyCurrency);
  const evidencePropertyCurrency = explicitCurrency(evidence.propertyCurrency);
  if (
    rolePropertyCurrency &&
    evidencePropertyCurrency &&
    rolePropertyCurrency !== evidencePropertyCurrency
  ) {
    return null;
  }
  const declaredPropertyCurrency = explicitCurrency(
    rolePropertyCurrency,
    evidencePropertyCurrency,
  );
  let propertyCurrency = declaredPropertyCurrency;
  if (propertyAmount !== null && propertyAmount < 0) return null;
  if (
    isProviderNeutralV1 &&
    ((propertyAmount === null && cleanText(role.propertyCurrency)) ||
      (propertyAmount !== null &&
        rolePropertyCurrency !== evidencePropertyCurrency) ||
      (propertyAmount !== null &&
        !propertyProjectionIsTrusted(evidence, {
          sourceAmount,
          sourceCurrency,
          propertyAmount,
          propertyCurrency,
        })))
  ) {
    return null;
  }
  if (
    propertyAmount === null &&
    sourceCurrency === propertyCurrency &&
    Number(evidence.contractVersion) !== 1
  ) {
    propertyAmount = sourceAmount;
  }
  if (propertyAmount === null) propertyCurrency = "";
  if (propertyAmount !== null && !propertyCurrency) return null;

  const reported = evidence.hotelRunnerReportedAmount;
  const reportedBookingBasisMatches =
    !isProviderNeutralV1 ||
    (cleanText(reported?.bookingBasis).toLowerCase() ===
      cleanText(role.bookingBasis).toLowerCase() &&
      cleanText(reported?.sourceRef).toLowerCase() === "hotelrunner" &&
      validContractProvenance(evidence?.provenance?.hotelRunner, {
        provider: cleanText(evidence.provider).toLowerCase(),
        allowedSourceTypes: HOTELRUNNER_SOURCE_TYPES,
      }));
  const hotelRunnerRoleVerified = Boolean(
    reported?.roleVerified === true &&
      cleanText(reported.role).toLowerCase() === "guest_gross" &&
      reportedBookingBasisMatches &&
      ((sameMoney(reported.amount, sourceAmount) &&
        explicitCurrency(reported.currency) === sourceCurrency) ||
        (propertyAmount !== null &&
          sameMoney(reported.amount, propertyAmount) &&
          explicitCurrency(reported.currency) === propertyCurrency)),
  );
  return {
    sourceAmount: roundMoney(sourceAmount),
    sourceCurrency,
    propertyAmount: roundMoney(propertyAmount),
    propertyCurrency,
    declaredPropertyCurrency,
    hotelRunnerRoleVerified,
    contractType:
      Number(evidence.contractVersion) === 1 ? "provider_neutral_v1" : "role",
  };
};

const verifiedScalarGuestGross = (evidence = {}) => {
  const namedCandidates = [
    ["guestGrossTotal", evidence.guestGrossTotal],
    ["guestGrossTotalSar", evidence.guestGrossTotalSar],
    // Backwards-compatible Agoda evidence from PRs #47-#50. This field is
    // explicitly a gross role, unlike HotelRunner pricing.grandTotal.
    ["grossTotalSar", evidence.grossTotalSar],
  ];
  const selected = namedCandidates.find(([, value]) => value != null);
  if (!selected) return null;
  const [field, value] = selected;
  const amount = roundMoney(value);
  const currency = field.endsWith("Sar")
    ? "SAR"
    : explicitCurrency(
        evidence.sourceCurrency,
        evidence.propertyCurrency,
        evidence.currency,
      );
  return amount !== null && currency
    ? {
        sourceAmount: amount,
        sourceCurrency: currency,
        propertyAmount: amount,
        propertyCurrency: currency,
        declaredPropertyCurrency: currency,
        // The legacy authenticated-email bridge assigned this explicit gross
        // only after exact HotelRunner/email identity and amount matching.
        hotelRunnerRoleVerified: true,
        contractType: "legacy_email_v2",
      }
    : null;
};

const commercialEvidenceCandidates = (reservation = {}) => {
  const supplierData = reservation?.supplierData || {};
  const entries = [
    ["supplierData.otaCommercialEvidence", supplierData.otaCommercialEvidence],
    [
      "supplierData.hotelRunnerEmailCommercialEvidence",
      supplierData.hotelRunnerEmailCommercialEvidence,
    ],
  ];
  const seen = new Set();
  return entries.filter(([, evidence]) => {
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
      return false;
    }
    if (seen.has(evidence)) return false;
    seen.add(evidence);
    return true;
  });
};

const explicitPropertyCurrencies = (reservation = {}) =>
  [
    reservation?.adminPricing?.propertyCurrency,
    reservation?.ota_financial_summary?.propertyCurrency,
    reservation?.otaFinancialSummary?.propertyCurrency,
  ]
    .map((value) => explicitCurrency(value))
    .filter(Boolean);

const materializedGuestGross = (reservation = {}) => {
  const sources = [
    {
      source: reservation?.adminPricing,
      values: [reservation?.adminPricing?.clientTotal],
    },
    {
      source: reservation?.ota_financial_summary,
      values: [reservation?.ota_financial_summary?.clientTotal],
    },
    {
      source: reservation?.otaFinancialSummary,
      values: [reservation?.otaFinancialSummary?.clientTotal],
    },
  ];
  const amounts = [];
  for (const { values } of sources) {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      const amount = roundMoney(value);
      if (amount === null) {
        return { valid: false, amounts: [], explicitFalse: false };
      }
      amounts.push(amount);
    }
  }
  if (
    sources.some(({ source }) => source?.commercialVerified === true) &&
    hasOwn(reservation, "total_amount")
  ) {
    const total = roundMoney(reservation.total_amount);
    if (total === null) {
      return { valid: false, amounts: [], explicitFalse: false };
    }
    amounts.push(total);
  }
  return {
    valid: true,
    amounts,
    explicitFalse: sources.some(
      ({ source }) => source?.commercialVerified === false,
    ),
  };
};

const unavailableGuestGross = () => ({
  available: false,
  amount: null,
  currency: "",
  displayBasis: "",
  sourceAvailable: false,
  sourceAmount: null,
  sourceCurrency: "",
  propertyAvailable: false,
  propertyAmount: null,
  propertyCurrency: "",
  source: "",
  hotelRunnerRoleVerified: false,
});

/**
 * Resolves a HotelRunner guest/client gross only from persisted commercial
 * evidence that names and verifies that financial role. HotelRunner's generic
 * grand total remains source evidence and is never sufficient by itself.
 */
const resolveVerifiedHotelRunnerGuestGross = (reservation = {}) => {
  if (!isHotelRunnerReservation(reservation)) {
    return unavailableGuestGross();
  }

  const candidates = [];
  for (const [source, evidence] of commercialEvidenceCandidates(reservation)) {
    if (
      source === "supplierData.otaCommercialEvidence" &&
      Number(evidence.contractVersion) !== 1
    ) {
      continue;
    }
    if (!evidenceIsVerified(evidence)) continue;
    const role =
      verifiedRoleObject(evidence) ||
      (source === "supplierData.hotelRunnerEmailCommercialEvidence"
        ? verifiedScalarGuestGross(evidence)
        : null);
    if (!role || role.sourceAmount < 0) continue;
    candidates.push({ ...role, source });
  }
  if (!candidates.length) {
    return unavailableGuestGross();
  }

  const sourceCurrencies = new Set(
    candidates.map(({ sourceCurrency }) => sourceCurrency),
  );
  const sourceAmounts = new Set(
    candidates.map(({ sourceAmount }) => Number(sourceAmount).toFixed(2)),
  );
  if (sourceCurrencies.size !== 1 || sourceAmounts.size !== 1) {
    return unavailableGuestGross();
  }

  const propertyCandidates = candidates.filter(
    ({ propertyAmount }) => propertyAmount !== null,
  );
  const propertyCurrenciesFromEvidence = new Set(
    candidates
      .map(({ declaredPropertyCurrency }) => declaredPropertyCurrency)
      .filter(Boolean),
  );
  const propertyAmounts = new Set(
    propertyCandidates.map(({ propertyAmount }) =>
      Number(propertyAmount).toFixed(2),
    ),
  );
  const propertyCurrencies = new Set(explicitPropertyCurrencies(reservation));
  if (
    propertyCurrenciesFromEvidence.size > 1 ||
    propertyAmounts.size > 1 ||
    propertyCurrencies.size > 1 ||
    (propertyCandidates.length > 0 &&
      propertyCurrencies.size === 1 &&
      !propertyCurrencies.has(propertyCandidates[0].propertyCurrency))
  ) {
    return unavailableGuestGross();
  }

  const materialized = materializedGuestGross(reservation);
  if (
    !materialized.valid ||
    (materialized.explicitFalse &&
      candidates.every(
        ({ contractType }) => contractType === "legacy_email_v2",
      )) ||
    (propertyCandidates.length > 0 &&
      materialized.amounts.some(
        (amount) => !sameMoney(amount, propertyCandidates[0].propertyAmount),
      ))
  ) {
    return unavailableGuestGross();
  }

  const propertyAvailable = propertyCandidates.length > 0;
  const sourceAmount = candidates[0].sourceAmount;
  const sourceCurrency = candidates[0].sourceCurrency;
  const propertyAmount = propertyAvailable
    ? propertyCandidates[0].propertyAmount
    : null;
  const propertyCurrency = propertyAvailable
    ? propertyCandidates[0].propertyCurrency
    : [...propertyCurrenciesFromEvidence][0] ||
      [...propertyCurrencies][0] ||
      "";
  return {
    available: true,
    amount: propertyAvailable ? propertyAmount : sourceAmount,
    currency: propertyAvailable ? propertyCurrency : sourceCurrency,
    displayBasis: propertyAvailable ? "property" : "source",
    sourceAvailable: true,
    sourceAmount,
    sourceCurrency,
    propertyAvailable,
    propertyAmount,
    propertyCurrency,
    source: candidates.map(({ source }) => source).join(","),
    hotelRunnerRoleVerified: candidates.some(
      ({ hotelRunnerRoleVerified }) => hotelRunnerRoleVerified,
    ),
  };
};

const normalizeNight = (night = {}) => ({
  date: cleanText(night.date || night.day),
  price: firstMoney(night.price, night.finalPrice, night.final_price),
  originalPrice: firstMoney(night.originalPrice, night.original_price),
  discount: firstMoney(
    night.discount,
    night.discountAmount,
    night.discount_amount,
  ),
  rateCode: cleanText(night.rateCode || night.rate_code),
  ratePlanCode: cleanText(night.ratePlanCode || night.rate_plan_code),
  version: cleanText(night.version),
});

const normalizeExtra = (extra = {}, index = 0) => ({
  key: cleanText(extra.code || extra.id) || `hotelrunner-extra-${index + 1}`,
  name: cleanText(extra.name || extra.description),
  code: cleanText(extra.code),
  price: firstMoney(extra.price),
  basePrice: firstMoney(extra.basePrice, extra.base_price),
  promotionsTotal: firstMoney(extra.promotionsTotal, extra.promotions_total),
  total: firstMoney(extra.total),
  quantity: firstMoney(extra.quantity),
  repeatType: cleanText(extra.repeatType || extra.repeat_type),
  includedInPrice:
    typeof extra.includedInPrice === "boolean"
      ? extra.includedInPrice
      : typeof extra.included_in_price === "boolean"
        ? extra.included_in_price
        : null,
});

const normalizeRoom = (room = {}, index = 0) => ({
  key:
    cleanText(room.roomId || room.room_id || room.invCode || room.inv_code) ||
    `hotelrunner-room-${index + 1}`,
  name: cleanText(
    room.namePresentation ||
      room.name_presentation ||
      room.name ||
      room.roomName ||
      room.room_name,
  ),
  roomId: cleanText(room.roomId || room.room_id),
  invCode: cleanText(room.invCode || room.inv_code),
  rateCode: cleanText(room.rateCode || room.rate_code),
  ratePlanCode: cleanText(room.ratePlanCode || room.rate_plan_code),
  priceBeforeTax: firstMoney(
    room.priceBeforeTax,
    room.price_before_tax,
    room.price,
  ),
  totalAfterTax: firstMoney(
    room.totalAfterTax,
    room.total_after_tax,
    room.total,
  ),
  roomBasePrice: firstMoney(room.roomBasePrice, room.room_base_price),
  roomSubTotal: firstMoney(room.roomSubTotal, room.room_sub_total),
  extrasTotal: firstMoney(room.extrasTotal, room.extras_total),
  fixedAdjustmentsTotal: firstMoney(
    room.fixedAdjustmentsTotal,
    room.fixed_adjustments_total,
  ),
  includedTaxesTotal: firstMoney(
    room.includedTaxesTotal,
    room.included_taxes_total,
  ),
  excludedFeesAndTaxesTotal: firstMoney(
    room.excludedFeesAndTaxesTotal,
    room.excluded_fees_and_taxes_total,
  ),
  promotionsTotal: firstMoney(room.promotionsTotal, room.promotions_total),
  cancellationRefund: firstMoney(
    room.cancelationRefundTotal,
    room.cancelation_refund_total,
    room.cancellationRefund,
    room.cancellation_refund,
    room.refund,
  ),
  cancellationPenalty: firstMoney(
    room.cancelationPenaltyTotal,
    room.cancelation_penalty_total,
    room.cancellationPenalty,
    room.cancellation_penalty,
    room.penalty,
  ),
  cancellationRefundTaxType: cleanText(
    room.cancelationRefundTaxType ||
      room.cancelation_refund_tax_type ||
      room.cancellationRefundTaxType,
  ),
  cancellationPenaltyTaxType: cleanText(
    room.cancelationPenaltyTaxType ||
      room.cancelation_penalty_tax_type ||
      room.cancellationPenaltyTaxType,
  ),
  dailyPrices: normalizedArray(
    room.nightly || room.dailyPrices || room.daily_prices || room.nightlyPrices,
    370,
  ).map(normalizeNight),
  extras: normalizedArray(room.extras, 100).map(normalizeExtra),
});

const normalizePayment = (
  payment = {},
  index = 0,
  fallbackCurrency = "SAR",
) => ({
  key:
    cleanText(payment.id || payment.paymentId || payment.payment_id) ||
    `hotelrunner-payment-${index + 1}`,
  amount: firstMoney(payment.amount),
  state: cleanText(payment.state || payment.status),
  currency: normalizedCurrency(payment.currency, fallbackCurrency),
  exchangedAmount: firstMoney(
    payment.exchangedAmount,
    payment.exchanged_amount,
  ),
  propertyCurrency: normalizedCurrency(
    payment.exchangeCurrency,
    payment.exchange_currency,
    payment.propertyCurrency,
    payment.property_currency,
    fallbackCurrency,
  ),
  exchangeRate: firstMoney(payment.exchangeRate, payment.exchange_rate),
  paidAt: cleanText(payment.paidAt || payment.paid_at),
  method: cleanText(
    payment.methodName ||
      payment.method_name ||
      payment.method ||
      payment.paymentMethod ||
      payment.payment_method,
  ),
});

/**
 * Normalizes the bounded, display-safe HotelRunner pricing snapshot persisted
 * by the backend. The local reservation total is never treated as the
 * HotelRunner guest gross, OTA payout, or hotel net amount.
 */
export const getHotelRunnerPricingDisplay = (reservation = {}) => {
  const isHotelRunner = isHotelRunnerReservation(reservation);
  if (!isHotelRunner) return { isHotelRunner: false, available: false };

  const canonical =
    reservation?.supplierData?.hotelRunner?.pricing ||
    reservation?.hotelRunnerPricing ||
    reservation?.hotelrunnerPricing ||
    {};
  const currency = normalizedCurrency(
    canonical.currency,
    reservation?.currency,
    reservation?.adminPricing?.sourceCurrency,
  );
  const rooms = normalizedArray(canonical.rooms, 100).map(normalizeRoom);
  const payments = normalizedArray(canonical.payments, 100).map(
    (payment, index) => normalizePayment(payment, index, currency),
  );

  const sourceGrandTotal = firstMoney(
    canonical.grandTotal,
    canonical.grand_total,
    canonical.total,
  );
  const verifiedGuestGross = resolveVerifiedHotelRunnerGuestGross(reservation);
  const hotelRunnerGrandTotalIsVerifiedGuestGross = Boolean(
    verifiedGuestGross.hotelRunnerRoleVerified &&
      ((sameMoney(sourceGrandTotal, verifiedGuestGross.sourceAmount) &&
        currency === verifiedGuestGross.sourceCurrency) ||
        (verifiedGuestGross.propertyAvailable &&
          sameMoney(sourceGrandTotal, verifiedGuestGross.propertyAmount) &&
          currency === verifiedGuestGross.propertyCurrency)),
  );

  const summary = {
    subTotal: firstMoney(canonical.subTotal, canonical.sub_total),
    extrasTotal: firstMoney(canonical.extrasTotal, canonical.extras_total),
    adjustmentsTotal: firstMoney(
      canonical.adjustmentsTotal,
      canonical.adjustments_total,
    ),
    itemTotal: firstMoney(canonical.itemTotal, canonical.item_total),
    taxTotal: firstMoney(canonical.taxTotal, canonical.tax_total),
    // This semantic slot is intentionally blank unless verified commercial
    // evidence confirms that HotelRunner's generic total has the guest-gross
    // role. The untouched source value is retained below as sourceGrandTotal.
    grandTotal: hotelRunnerGrandTotalIsVerifiedGuestGross
      ? sourceGrandTotal
      : null,
    // HotelRunner's paid amount is a payment-state value. It must never be
    // presented as the OTA payout or the hotel's net proceeds.
    paidAmount: firstMoney(canonical.paidAmount, canonical.paid_amount),
  };
  const hasCanonicalSummary =
    sourceGrandTotal !== null ||
    Object.values(summary).some((value) => value !== null);

  return {
    isHotelRunner: true,
    available: hasCanonicalSummary || rooms.length > 0 || payments.length > 0,
    currency,
    summary,
    sourceGrandTotal,
    sourceSummary: {
      ...summary,
      grandTotal: sourceGrandTotal,
    },
    guestGross: verifiedGuestGross,
    rooms,
    payments,
  };
};

/**
 * HotelRunner's generic reservation schema does not promise OTA commission or
 * net payout. Only expose a net value after another trusted source has marked
 * the commercial figures verified and persisted an explicit net amount.
 */
const verifiedMoneyConsensus = (
  sources = [],
  { requireNonNegative = false } = {},
) => {
  const amounts = [];
  for (const source of sources) {
    if (source?.verified !== true) continue;
    for (const candidate of source.values || []) {
      if (candidate === null || candidate === undefined) continue;
      const amount = finiteMoneyOrNull(candidate);
      if (amount === null || (requireNonNegative && amount < 0)) {
        return { available: false, amount: null };
      }
      amounts.push(Number(amount.toFixed(2)));
    }
  }

  if (!amounts.length) return { available: false, amount: null };
  if (new Set(amounts.map((amount) => amount.toFixed(2))).size !== 1) {
    return { available: false, amount: null };
  }
  return { available: true, amount: amounts[0] };
};

const unavailableVerifiedPayoutEvidence = (present = false) => ({
  present,
  available: false,
  amount: null,
});

const providerNeutralPayoutEvidence = (reservation = {}) => {
  const evidence = reservation?.supplierData?.otaCommercialEvidence;
  if (
    !evidence ||
    typeof evidence !== "object" ||
    Array.isArray(evidence) ||
    Number(evidence.contractVersion) !== 1
  ) {
    return unavailableVerifiedPayoutEvidence(false);
  }

  const sourceType = evidenceSourceName(evidence).toLowerCase();
  if (!AUTHENTICATED_COMMERCIAL_SOURCE_TYPES.has(sourceType)) {
    return unavailableVerifiedPayoutEvidence(false);
  }
  if (!evidenceIsVerified(evidence)) {
    return unavailableVerifiedPayoutEvidence(true);
  }

  const projection = verifiedRoleObject({
    ...evidence,
    roles: {
      ...(evidence.roles || {}),
      guestGross: evidence?.roles?.hotelPayout,
    },
    hotelRunnerReportedAmount: null,
  });
  if (!projection || projection.propertyAmount === null) {
    return unavailableVerifiedPayoutEvidence(true);
  }
  return {
    present: true,
    available: true,
    amount: projection.propertyAmount,
    propertyCurrency: projection.propertyCurrency,
  };
};

const legacyEmailPayoutEvidence = (reservation = {}) => {
  const evidence =
    reservation?.supplierData?.hotelRunnerEmailCommercialEvidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return unavailableVerifiedPayoutEvidence(false);
  }
  if (!evidenceIsVerified(evidence)) {
    return unavailableVerifiedPayoutEvidence(true);
  }
  const candidates = [
    ["hotelPayoutTotalSar", evidence.hotelPayoutTotalSar],
    ["payoutTotalSar", evidence.payoutTotalSar],
    ["otaNetTotalSar", evidence.otaNetTotalSar],
    ["hotelPayoutTotal", evidence.hotelPayoutTotal],
    ["otaNetTotal", evidence.otaNetTotal],
  ];
  const selected = candidates.find(([, value]) => value != null);
  if (!selected) return unavailableVerifiedPayoutEvidence(true);
  const [field, value] = selected;
  const amount = roundMoney(value);
  const currency = field.endsWith("Sar")
    ? "SAR"
    : explicitCurrency(evidence.propertyCurrency, evidence.currency);
  if (amount === null || amount < 0 || !currency) {
    return unavailableVerifiedPayoutEvidence(true);
  }
  return { present: true, available: true, amount, propertyCurrency: currency };
};

export const getHotelRunnerPayoutDisplay = (reservation = {}) => {
  if (!isHotelRunnerReservation(reservation)) {
    return { isHotelRunner: false, verified: false, netAmount: null };
  }

  const adminPricing = reservation?.adminPricing || {};
  const snakeSummary = reservation?.ota_financial_summary || {};
  const camelSummary = reservation?.otaFinancialSummary || {};
  const sources = (adminValues, snakeValues, camelValues) => [
    {
      verified: adminPricing.commercialVerified,
      values: adminValues,
    },
    {
      verified: snakeSummary.commercialVerified,
      values: snakeValues,
    },
    {
      verified: camelSummary.commercialVerified,
      values: camelValues,
    },
  ];
  const net = verifiedMoneyConsensus(
    sources(
      [adminPricing.netAfterExpensesTotal],
      [
        snakeSummary.netAfterExpenses,
        snakeSummary.netAfterOtaExpenses,
        snakeSummary.totalAfterOtaExpenses,
      ],
      [
        camelSummary.netAfterExpenses,
        camelSummary.netAfterOtaExpenses,
        camelSummary.totalAfterOtaExpenses,
      ],
    ),
  );

  const otaExpense = verifiedMoneyConsensus(
    sources(
      [adminPricing.otaExpenseTotal],
      [snakeSummary.otaExpenseTotal],
      [camelSummary.otaExpenseTotal],
    ),
    { requireNonNegative: true },
  );
  const platformMargin = verifiedMoneyConsensus(
    sources(
      [adminPricing.platformMarginTotal],
      [snakeSummary.platformProfit, snakeSummary.profit],
      [camelSummary.platformProfit, camelSummary.profit],
    ),
  );

  const providerNeutral = providerNeutralPayoutEvidence(reservation);
  const legacyEmail = legacyEmailPayoutEvidence(reservation);
  const unresolvedProviderNeutralContract = Boolean(
    reservation?.supplierData?.otaCommercialEvidence &&
      Number(
        reservation.supplierData.otaCommercialEvidence.contractVersion,
      ) === 1,
  );
  const authoritativePayout = providerNeutral.present
    ? providerNeutral
    : legacyEmail.present
      ? legacyEmail
      : unresolvedProviderNeutralContract
        ? unavailableVerifiedPayoutEvidence(true)
        : null;

  if (authoritativePayout) {
    const conflictsWithMaterializedNet = Boolean(
      authoritativePayout.available &&
        net.available &&
        !sameMoney(authoritativePayout.amount, net.amount),
    );
    const netAvailable = Boolean(
      authoritativePayout.available && !conflictsWithMaterializedNet,
    );
    const materializedMetricsReconciled = Boolean(
      netAvailable && net.available && sameMoney(authoritativePayout.amount, net.amount),
    );
    return {
      isHotelRunner: true,
      verified: netAvailable,
      netAvailable,
      otaExpenseAvailable:
        materializedMetricsReconciled && otaExpense.available,
      platformMarginAvailable:
        materializedMetricsReconciled && platformMargin.available,
      netAmount: netAvailable ? authoritativePayout.amount : null,
      otaExpenseAmount:
        materializedMetricsReconciled && otaExpense.available
          ? otaExpense.amount
          : null,
      platformMarginAmount:
        materializedMetricsReconciled && platformMargin.available
          ? platformMargin.amount
          : null,
      ...(netAvailable && authoritativePayout.propertyCurrency
        ? { propertyCurrency: authoritativePayout.propertyCurrency }
        : {}),
    };
  }

  const propertyCurrency = explicitCurrency(
    adminPricing.propertyCurrency,
    snakeSummary.propertyCurrency,
    camelSummary.propertyCurrency,
  );
  return {
    isHotelRunner: true,
    // `verified` remains the backwards-compatible net/payout flag. Optional
    // commercial metrics deliberately expose their own availability so a
    // verified net can never authorize an unrelated expense or margin value.
    verified: net.available,
    netAvailable: net.available,
    otaExpenseAvailable: otaExpense.available,
    platformMarginAvailable: platformMargin.available,
    netAmount: net.available ? net.amount : null,
    otaExpenseAmount: otaExpense.available ? otaExpense.amount : null,
    platformMarginAmount: platformMargin.available
      ? platformMargin.amount
      : null,
    ...(net.available && propertyCurrency ? { propertyCurrency } : {}),
  };
};

const nonNegativeMoneyOrNull = (value) => {
  const amount = finiteMoneyOrNull(value);
  return amount !== null && amount >= 0
    ? Number(amount.toFixed(2))
    : null;
};

const resolveAssignedCommissionEvidence = (entries = []) => {
  if (!entries.length) return { valid: false, conflict: false };

  const normalized = entries.map(({ value, source }) => ({
    amount: nonNegativeMoneyOrNull(value),
    source,
  }));
  if (normalized.some(({ amount }) => amount === null)) {
    return { valid: false, conflict: false };
  }
  if (new Set(normalized.map(({ amount }) => amount.toFixed(2))).size !== 1) {
    return { valid: false, conflict: true };
  }

  return {
    valid: true,
    conflict: false,
    amount: normalized[0].amount,
    sources: normalized.map(({ source }) => source),
  };
};

const ownCommissionEntries = (source = {}, fields = [], prefix = "") =>
  fields
    .filter((field) => hasOwn(source, field))
    .map((field) => ({ value: source[field], source: `${prefix}${field}` }));

/**
 * HotelRunner's gross/local-base spread is not a PMS commission. Keep the
 * finance workflow unavailable until staff explicitly assigns the local PMS
 * commission. A reviewed zero is valid; conflicting or malformed assigned
 * evidence fails closed instead of silently selecting one value.
 */
export const getHotelRunnerPlatformFinanceDisplay = (reservation = {}) => {
  if (!isHotelRunnerReservation(reservation)) {
    return {
      isHotelRunner: false,
      available: true,
      amount: null,
      reason: "",
    };
  }

  const cycle = reservation?.financial_cycle || {};
  const commissionData = reservation?.commissionData || {};
  const cycleAssigned = cycle.commissionAssigned === true;
  const dataAssigned = commissionData.assigned === true;

  if (!cycleAssigned && !dataAssigned) {
    return {
      isHotelRunner: true,
      available: false,
      amount: null,
      reason: "hotelrunner_platform_commission_unreviewed",
    };
  }

  const evidence = [];
  if (cycleAssigned) {
    const assigned = resolveAssignedCommissionEvidence(
      ownCommissionEntries(
        cycle,
        ["commissionAmount", "commissionValue"],
        "financial_cycle.",
      ),
    );
    if (!assigned.valid) {
      return {
        isHotelRunner: true,
        available: false,
        amount: null,
        reason: assigned.conflict
          ? "hotelrunner_platform_commission_conflict"
          : "hotelrunner_platform_commission_invalid",
      };
    }
    evidence.push({
      amount: assigned.amount,
      source: assigned.sources.join(","),
    });
  }

  if (dataAssigned) {
    const dataEntries = ownCommissionEntries(
      commissionData,
      ["amount", "commissionAmount", "commissionValue"],
      "commissionData.",
    );
    if (hasOwn(reservation, "commission")) {
      dataEntries.push({ value: reservation.commission, source: "commission" });
    }
    const assigned = resolveAssignedCommissionEvidence(dataEntries);
    if (!assigned.valid) {
      return {
        isHotelRunner: true,
        available: false,
        amount: null,
        reason: assigned.conflict
          ? "hotelrunner_platform_commission_conflict"
          : "hotelrunner_platform_commission_invalid",
      };
    }
    evidence.push({
      amount: assigned.amount,
      source: assigned.sources.join(","),
    });
  }

  if (new Set(evidence.map(({ amount }) => amount.toFixed(2))).size !== 1) {
    return {
      isHotelRunner: true,
      available: false,
      amount: null,
      reason: "hotelrunner_platform_commission_conflict",
    };
  }

  return {
    isHotelRunner: true,
    available: true,
    amount: evidence[0].amount,
    reason: "",
    source: evidence.map(({ source }) => source).join(","),
  };
};

/**
 * Keeps legacy financial reports honest for HotelRunner reservations. The PMS
 * `sub_total` is a local contracted/base amount for this integration; it is not
 * an OTA payout. Likewise, an OTA expense is shown only when commercial
 * evidence has been explicitly verified.
 */
export const getHotelRunnerReportPricingDisplay = (reservation = {}) => {
  const pricing = getHotelRunnerPricingDisplay(reservation);
  if (!pricing.isHotelRunner) return { isHotelRunner: false };

  const payout = getHotelRunnerPayoutDisplay(reservation);
  const guestGross = resolveVerifiedHotelRunnerGuestGross(reservation);
  return {
    isHotelRunner: true,
    // Financial reports aggregate property-currency values. A verified source
    // gross remains available below for explicitly currency-labelled displays,
    // but is not injected into those property totals without trusted conversion.
    currency:
      guestGross.propertyCurrency ||
      normalizedCurrency(reservation?.adminPricing?.propertyCurrency),
    grossAmount: guestGross.propertyAvailable
      ? guestGross.propertyAmount
      : null,
    grossDisplayBasis: guestGross.displayBasis,
    grossSourceAmount: guestGross.sourceAmount,
    grossSourceCurrency: guestGross.sourceCurrency,
    grossPropertyAmount: guestGross.propertyAmount,
    grossPropertyCurrency: guestGross.propertyCurrency,
    localBaseAmount: firstMoney(
      reservation?.adminPricing?.rootTotal,
      reservation?.ota_financial_summary?.hotelVisibleAmount,
      reservation?.otaFinancialSummary?.hotelVisibleAmount,
      reservation?.sub_total,
    ),
    payoutVerified: payout.verified,
    netAmount: payout.netAmount,
    otaExpenseAmount: payout.otaExpenseAmount,
  };
};

/**
 * Resolves the UI amount charged to the guest without confusing HotelRunner's
 * canonical gross with the local reservation amount. HotelRunner's primary
 * display is property-currency-only; source values remain provenance fields.
 * Legacy reservations keep their existing total_amount behavior.
 */
export const getReservationGuestGrossDisplay = (reservation = {}) => {
  const isHotelRunner = isHotelRunnerReservation(reservation);
  const verifiedGuestGross = isHotelRunner
    ? resolveVerifiedHotelRunnerGuestGross(reservation)
    : null;
  const amount = isHotelRunner
    ? verifiedGuestGross.propertyAvailable
      ? verifiedGuestGross.propertyAmount
      : null
    : finiteMoneyOrNull(reservation?.total_amount);

  return {
    isHotelRunner,
    available: amount !== null,
    amount,
    verified: isHotelRunner ? verifiedGuestGross.propertyAvailable : false,
    source: isHotelRunner ? verifiedGuestGross.source : "",
    currency: isHotelRunner
      ? verifiedGuestGross.propertyCurrency ||
        normalizedCurrency(
          reservation?.adminPricing?.propertyCurrency,
          reservation?.currency,
        )
      : normalizedCurrency(reservation?.currency),
    displayBasis: isHotelRunner && amount !== null ? "property" : "",
    sourceAvailable: isHotelRunner
      ? verifiedGuestGross.sourceAvailable
      : amount !== null,
    sourceAmount: isHotelRunner ? verifiedGuestGross.sourceAmount : amount,
    sourceCurrency: isHotelRunner
      ? verifiedGuestGross.sourceCurrency
      : normalizedCurrency(reservation?.currency),
    propertyAvailable: isHotelRunner
      ? verifiedGuestGross.propertyAvailable
      : amount !== null,
    propertyAmount: isHotelRunner ? verifiedGuestGross.propertyAmount : amount,
    propertyCurrency: isHotelRunner
      ? verifiedGuestGross.propertyCurrency
      : normalizedCurrency(reservation?.currency),
  };
};

/**
 * Currency-homogeneous reports and exports must use only a verified property
 * amount. Source-currency gross remains available only through the source*
 * provenance fields above.
 */
export const getReservationPropertyGuestGrossDisplay = (reservation = {}) => {
  const gross = getReservationGuestGrossDisplay(reservation);
  if (!gross.isHotelRunner) return gross;
  return {
    ...gross,
    available: gross.propertyAvailable === true,
    amount: gross.propertyAvailable ? gross.propertyAmount : null,
    currency:
      gross.propertyCurrency ||
      normalizedCurrency(reservation?.adminPricing?.propertyCurrency),
  };
};

export const formatHotelRunnerReportAmount = (value) => {
  const amount = finiteMoneyOrNull(value);
  return amount === null ? "—" : amount.toLocaleString();
};

export { finiteMoneyOrNull };
