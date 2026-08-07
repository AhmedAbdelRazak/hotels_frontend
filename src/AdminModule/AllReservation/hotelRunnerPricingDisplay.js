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

  const summary = {
    subTotal: firstMoney(canonical.subTotal, canonical.sub_total),
    extrasTotal: firstMoney(canonical.extrasTotal, canonical.extras_total),
    adjustmentsTotal: firstMoney(
      canonical.adjustmentsTotal,
      canonical.adjustments_total,
    ),
    itemTotal: firstMoney(canonical.itemTotal, canonical.item_total),
    taxTotal: firstMoney(canonical.taxTotal, canonical.tax_total),
    grandTotal: firstMoney(
      canonical.grandTotal,
      canonical.grand_total,
      canonical.total,
    ),
    // HotelRunner's paid amount is a payment-state value. It must never be
    // presented as the OTA payout or the hotel's net proceeds.
    paidAmount: firstMoney(canonical.paidAmount, canonical.paid_amount),
  };
  const hasCanonicalSummary = Object.values(summary).some(
    (value) => value !== null,
  );

  return {
    isHotelRunner: true,
    available: hasCanonicalSummary || rooms.length > 0 || payments.length > 0,
    currency,
    summary,
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
  };
};

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);

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
  return {
    isHotelRunner: true,
    currency: pricing.currency,
    grossAmount: firstMoney(pricing.summary?.grandTotal),
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
 * Resolves the amount charged to the guest without confusing HotelRunner's
 * canonical gross with the local reservation amount. Legacy reservations keep
 * their existing total_amount behavior.
 */
export const getReservationGuestGrossDisplay = (reservation = {}) => {
  const pricing = getHotelRunnerPricingDisplay(reservation);
  const amount = pricing.isHotelRunner
    ? finiteMoneyOrNull(pricing.summary?.grandTotal)
    : finiteMoneyOrNull(reservation?.total_amount);

  return {
    isHotelRunner: pricing.isHotelRunner,
    available: amount !== null,
    amount,
    currency: pricing.isHotelRunner
      ? pricing.currency
      : normalizedCurrency(reservation?.currency),
  };
};

export const formatHotelRunnerReportAmount = (value) => {
  const amount = finiteMoneyOrNull(value);
  return amount === null ? "—" : amount.toLocaleString();
};

export { finiteMoneyOrNull };
