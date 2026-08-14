export const PAYMENT_BREAKDOWN_KEYS = Object.freeze([
  "paid_online_via_link",
  "paid_at_hotel_cash",
  "paid_at_hotel_card",
  "paid_to_hotel",
  "paid_online_jannatbooking",
  "paid_online_other_platforms",
  "paid_online_via_instapay",
  "paid_no_show",
]);

export const RECONCILIATION_STATUSES = Object.freeze({
  ALL: "all",
  RECONCILED: "reconciled",
  WAITING: "waiting",
});

export const PAYMENT_METHOD_LABELS = Object.freeze({
  paid_online_via_link: Object.freeze({
    en: "Paid Online (Payment Link) (SAR)",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0623\u0648\u0646\u0644\u0627\u064a\u0646 (\u0631\u0627\u0628\u0637 \u0627\u0644\u062f\u0641\u0639) (\u0631.\u0633)",
  }),
  paid_at_hotel_cash: Object.freeze({
    en: "Paid at Hotel (Cash) (SAR)",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0641\u064a \u0627\u0644\u0641\u0646\u062f\u0642 (\u0646\u0642\u062f\u0627\u064b) (\u0631.\u0633)",
  }),
  paid_at_hotel_card: Object.freeze({
    en: "Paid at Hotel (Card) (SAR)",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0641\u064a \u0627\u0644\u0641\u0646\u062f\u0642 (\u0628\u0637\u0627\u0642\u0629) (\u0631.\u0633)",
  }),
  paid_to_hotel: Object.freeze({
    en: "Paid to Hotel (SAR)",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0625\u0644\u0649 \u0627\u0644\u0641\u0646\u062f\u0642 (\u0631.\u0633)",
  }),
  paid_online_jannatbooking: Object.freeze({
    en: "Paid Online (Jannat Booking) (SAR)",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0623\u0648\u0646\u0644\u0627\u064a\u0646 (\u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u063a) (\u0631.\u0633)",
  }),
  paid_online_other_platforms: Object.freeze({
    en: "Paid Online (Other Platforms) (SAR)",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0623\u0648\u0646\u0644\u0627\u064a\u0646 (\u0645\u0646\u0635\u0627\u062a \u0623\u062e\u0631\u0649) (\u0631.\u0633)",
  }),
  paid_online_via_instapay: Object.freeze({
    en: "Paid Online (InstaPay) (SAR)",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0623\u0648\u0646\u0644\u0627\u064a\u0646 (\u0625\u0646\u0633\u062a\u0627\u0628\u0627\u064a) (\u0631.\u0633)",
  }),
  paid_no_show: Object.freeze({
    en: "Paid No-show (SAR)",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0639\u062f\u0645 \u062d\u0636\u0648\u0631 (\u0631.\u0633)",
  }),
});

const PAYMENT_BREAKDOWN_KEY_SET = new Set(PAYMENT_BREAKDOWN_KEYS);

export const normalizePaymentBreakdownKeys = (keys) => {
  const values = Array.isArray(keys)
    ? keys
    : String(keys || "")
        .split(",")
        .map((key) => key.trim());
  const selected = new Set(
    values.filter((key) => PAYMENT_BREAKDOWN_KEY_SET.has(key)),
  );
  return PAYMENT_BREAKDOWN_KEYS.filter((key) => selected.has(key));
};

export const normalizeReconciliationStatus = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  return Object.values(RECONCILIATION_STATUSES).includes(normalized)
    ? normalized
    : RECONCILIATION_STATUSES.ALL;
};

export const bilingualPaymentMethodLabel = (key, isArabic = false) => {
  const labels = PAYMENT_METHOD_LABELS[key];
  if (!labels) return String(key || "");
  return isArabic
    ? `${labels.ar} / ${labels.en}`
    : `${labels.en} / ${labels.ar}`;
};

export const moneyCents = (value) => {
  if (value === null || value === undefined || typeof value === "boolean") {
    return 0;
  }
  const normalized =
    typeof value === "string" ? value.replace(/,/g, "").trim() : value;
  if (normalized === "") return 0;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents : 0;
};

export const amountForPaymentKey = (reservation = {}, key) => {
  if (!PAYMENT_BREAKDOWN_KEY_SET.has(key)) return 0;
  return (
    Math.max(moneyCents(reservation?.paid_amount_breakdown?.[key]), 0) / 100
  );
};

export const paymentAmountCentsForKey = (reservation = {}, key) =>
  PAYMENT_BREAKDOWN_KEY_SET.has(key)
    ? Math.max(moneyCents(reservation?.paid_amount_breakdown?.[key]), 0)
    : 0;

const reconciliationEntryForKey = (reservation, key) =>
  reservation?.reconciliation_by_breakdown?.[key] ||
  reservation?.payment_reconciliation?.breakdown?.[key] ||
  null;

export const hasStoredReconciliationEntry = (reservation = {}, key) => {
  if (!PAYMENT_BREAKDOWN_KEY_SET.has(key)) return false;
  const safeEntry = reservation?.reconciliation_by_breakdown?.[key];
  if (
    safeEntry &&
    typeof safeEntry === "object" &&
    Object.prototype.hasOwnProperty.call(safeEntry, "hasStoredEntry")
  ) {
    return safeEntry.hasStoredEntry === true;
  }
  const legacyEntry = reservation?.payment_reconciliation?.breakdown?.[key];
  return Boolean(legacyEntry && typeof legacyEntry === "object");
};

const entryAmountCents = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  for (const field of [
    "amountCents",
    "amount_cents",
    "amountSnapshotCents",
    "amount_snapshot_cents",
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(entry, field) &&
      Number.isSafeInteger(Number(entry[field]))
    ) {
      return Number(entry[field]);
    }
  }
  return null;
};

export const isPaymentKeyReconciled = (reservation = {}, key) => {
  const currentAmountCents = paymentAmountCentsForKey(reservation, key);
  if (!PAYMENT_BREAKDOWN_KEY_SET.has(key) || currentAmountCents <= 0) {
    return false;
  }
  const entry = reconciliationEntryForKey(reservation, key);
  return (
    String(entry?.status || "").toLowerCase() ===
      RECONCILIATION_STATUSES.RECONCILED &&
    entryAmountCents(entry) === currentAmountCents
  );
};

const addCents = (total, amount) => {
  const next = total + amount;
  return Number.isSafeInteger(next) ? next : total;
};

export const summarizeReservationReconciliation = (
  reservation = {},
  keys = PAYMENT_BREAKDOWN_KEYS,
) => {
  const selectedKeys = normalizePaymentBreakdownKeys(keys);
  const positiveKeys = selectedKeys.filter(
    (key) => paymentAmountCentsForKey(reservation, key) > 0,
  );
  let totalCents = 0;
  let reconciledCents = 0;
  const byKey = {};

  positiveKeys.forEach((key) => {
    const amountCents = paymentAmountCentsForKey(reservation, key);
    const reconciled = isPaymentKeyReconciled(reservation, key);
    totalCents = addCents(totalCents, amountCents);
    if (reconciled) reconciledCents = addCents(reconciledCents, amountCents);
    byKey[key] = {
      amount: amountCents / 100,
      amountCents,
      status: reconciled
        ? RECONCILIATION_STATUSES.RECONCILED
        : RECONCILIATION_STATUSES.WAITING,
    };
  });

  const waitingCents = Math.max(totalCents - reconciledCents, 0);
  const hasReconciled = reconciledCents > 0;
  const hasWaiting = waitingCents > 0;
  const status =
    hasReconciled && hasWaiting
      ? "mixed"
      : hasReconciled
        ? RECONCILIATION_STATUSES.RECONCILED
        : RECONCILIATION_STATUSES.WAITING;

  return {
    status,
    selectedKeys,
    positiveKeys,
    byKey,
    totalCents,
    totalAmount: totalCents / 100,
    reconciledCents,
    reconciledAmount: reconciledCents / 100,
    waitingCents,
    waitingAmount: waitingCents / 100,
    hasReconciled,
    hasWaiting,
  };
};

export const filterReservationsByReconciliation = (
  rows = [],
  keys = PAYMENT_BREAKDOWN_KEYS,
  status = RECONCILIATION_STATUSES.ALL,
) => {
  const normalizedStatus = normalizeReconciliationStatus(status);
  if (normalizedStatus === RECONCILIATION_STATUSES.ALL) return [...rows];
  return rows.filter((reservation) => {
    const summary = summarizeReservationReconciliation(reservation, keys);
    return normalizedStatus === RECONCILIATION_STATUSES.RECONCILED
      ? summary.hasReconciled
      : summary.hasWaiting;
  });
};
