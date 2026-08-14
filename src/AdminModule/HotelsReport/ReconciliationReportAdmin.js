import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Button, Checkbox, Input, Select, Spin, message } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileExcelOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { isAuthenticated } from "../../auth";
import { useCartContext } from "../../cart_context";
import {
  gettingHotelDetailsForAdminAll,
  getReconciliationReportAdmin,
  updateReconciliationStatusAdmin,
} from "../apiAdmin";
import { getReservationRoomSummary } from "../AllReservation/reservationRoomDetails";
import { isSuperAdminUser } from "../utils/superUsers";
import PaidReportDateControls from "./PaidReportDateControls";
import {
  getPaidReportCurrentMonth,
  getPaidReportCurrentYear,
  resolvePaidReportPeriods,
} from "./paidReportDateFilter";
import {
  PAYMENT_BREAKDOWN_KEYS,
  PAYMENT_METHOD_LABELS,
  RECONCILIATION_STATUSES,
  amountForPaymentKey,
  bilingualPaymentMethodLabel,
  filterReservationsByReconciliation,
  moneyCents,
  normalizePaymentBreakdownKeys,
  normalizeReconciliationStatus,
  paymentAmountCentsForKey,
  summarizeReservationReconciliation,
} from "./paymentReconciliation";

const PREFERRED_HOTEL_ID = "6a40b6a1a6efe70450536038";
const PAGE_LIMIT = 500;
const MAX_PAGES = 100;
const MAX_DOCUMENTS = PAGE_LIMIT * MAX_PAGES;
const MUTATION_BATCH_SIZE = 100;
const DATE_FIELDS = new Set(["createdAt", "checkin_date", "checkout_date"]);

const TEXT = {
  en: {
    selectHotel: "Select hotel",
    searchPlaceholder: "Search customer, confirmation number, or source",
    search: "Search",
    methods: "Payment methods",
    methodsPlaceholder: "Select payment methods",
    allMethodsRequired: "Keep at least one payment method selected.",
    statusFilter: "Reconciliation status",
    all: "All",
    reconciled: "Reconciled",
    waiting: "Awaiting reconciliation",
    total: "Total paid in selected methods (SAR)",
    totalCount: "reservations in scope",
    reconciledTotal: "Reconciled (SAR)",
    waitingTotal: "Awaiting reconciliation (SAR)",
    selectedReservations: "Selected reservations",
    selectedAmount: "Selected amount (SAR)",
    markReconciled: "Mark selected as reconciled",
    markWaiting: "Return selected to awaiting",
    exportExcel: "Export to Excel",
    exportDone: "Excel report exported.",
    exportFailed: "Could not prepare the Excel report.",
    noRowsToExport: "There are no rows to export.",
    selectRowsFirst: "Select at least one reservation first.",
    loadError: "Could not load the reconciliation report.",
    updateError: "Could not update reconciliation. The report was refreshed.",
    readOnly:
      "Only the configured super admin can change reconciliation status.",
    conflict:
      "Some reservations changed since this report loaded. Nothing stale was overwritten; the report was refreshed.",
    updated: (count) =>
      `${count.toLocaleString("en-US")} reservation${
        count === 1 ? "" : "s"
      } updated.`,
    selectHotelFirst: "Select a hotel to view its reconciliation report.",
    noRows: "No reservations match these filters.",
    selectAll: "Select all displayed reservations",
    selectReservation: (confirmation) =>
      `Select reservation ${confirmation || "without confirmation number"}`,
    index: "#",
    customer: "Customer name",
    confirmation: "Confirmation number",
    source: "Main source",
    nights: "Nights",
    roomNumber: "Accommodation room number",
    otaTotal: "Total OTA amount (SAR)",
    pricingTotal: "Price breakdown total (SAR)",
    status: "Reconciliation status",
    unavailable: "N/A",
    exportTitle: "Payment Reconciliation Report",
    generatedAt: "Generated at",
    hotel: "Hotel",
    filters: "Filters",
    exportTotal: "Displayed total",
  },
  ar: {
    selectHotel:
      "\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0646\u062f\u0642",
    searchPlaceholder:
      "\u0627\u0628\u062d\u062b \u0628\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064a\u0644 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f \u0623\u0648 \u0627\u0644\u0645\u0635\u062f\u0631",
    search: "\u0628\u062d\u062b",
    methods: "\u0637\u0631\u0642 \u0627\u0644\u062f\u0641\u0639",
    methodsPlaceholder:
      "\u0627\u062e\u062a\u0631 \u0637\u0631\u0642 \u0627\u0644\u062f\u0641\u0639",
    allMethodsRequired:
      "\u0627\u062d\u062a\u0641\u0638 \u0628\u0637\u0631\u064a\u0642\u0629 \u062f\u0641\u0639 \u0648\u0627\u062d\u062f\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644.",
    statusFilter:
      "\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0633\u0648\u064a\u0629",
    all: "\u0627\u0644\u0643\u0644",
    reconciled: "\u062a\u0645\u062a \u0627\u0644\u062a\u0633\u0648\u064a\u0629",
    waiting:
      "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629",
    total:
      "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0641\u0648\u0639 \u0644\u0644\u0637\u0631\u0642 \u0627\u0644\u0645\u062d\u062f\u062f\u0629 (\u0631.\u0633)",
    totalCount:
      "\u062d\u062c\u0632 \u0636\u0645\u0646 \u0627\u0644\u0646\u0637\u0627\u0642",
    reconciledTotal:
      "\u062a\u0645\u062a \u0627\u0644\u062a\u0633\u0648\u064a\u0629 (\u0631.\u0633)",
    waitingTotal:
      "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629 (\u0631.\u0633)",
    selectedReservations:
      "\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u062d\u062f\u062f\u0629",
    selectedAmount:
      "\u0645\u0628\u0644\u063a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u062d\u062f\u062f\u0629 (\u0631.\u0633)",
    markReconciled:
      "\u062a\u0633\u0648\u064a\u0629 \u0627\u0644\u0645\u062d\u062f\u062f",
    markWaiting:
      "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u062f\u062f \u0644\u0644\u0627\u0646\u062a\u0638\u0627\u0631",
    exportExcel: "\u062a\u0635\u062f\u064a\u0631 \u0625\u0644\u0649 Excel",
    exportDone:
      "\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u062a\u0642\u0631\u064a\u0631 Excel.",
    exportFailed:
      "\u062a\u0639\u0630\u0631 \u062a\u062c\u0647\u064a\u0632 \u062a\u0642\u0631\u064a\u0631 Excel.",
    noRowsToExport:
      "\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u0648\u0641 \u0644\u0644\u062a\u0635\u062f\u064a\u0631.",
    selectRowsFirst:
      "\u062d\u062f\u062f \u062d\u062c\u0632\u064b\u0627 \u0648\u0627\u062d\u062f\u064b\u0627 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0623\u0648\u0644\u0627\u064b.",
    loadError:
      "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629.",
    updateError:
      "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0633\u0648\u064a\u0629. \u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0642\u0631\u064a\u0631.",
    readOnly:
      "\u064a\u0645\u0643\u0646 \u0644\u0644\u0645\u0634\u0631\u0641 \u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u0645\u0639\u062f \u0641\u0642\u0637 \u062a\u063a\u064a\u064a\u0631 \u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0633\u0648\u064a\u0629.",
    conflict:
      "\u062a\u063a\u064a\u0631\u062a \u0628\u0639\u0636 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0645\u0646\u0630 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0642\u0631\u064a\u0631. \u0644\u0645 \u062a\u064f\u0633\u062a\u0628\u062f\u0644 \u0623\u064a \u0628\u064a\u0627\u0646\u0627\u062a \u0642\u062f\u064a\u0645\u0629\u060c \u0648\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0642\u0631\u064a\u0631.",
    updated: (count) =>
      `\u062a\u0645 \u062a\u062d\u062f\u064a\u062b ${count.toLocaleString(
        "en-US",
      )} \u062d\u062c\u0632.`,
    selectHotelFirst:
      "\u0627\u062e\u062a\u0631 \u0641\u0646\u062f\u0642\u064b\u0627 \u0644\u0639\u0631\u0636 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629.",
    noRows:
      "\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u062a\u0635\u0641\u064a\u0629.",
    selectAll:
      "\u062a\u062d\u062f\u064a\u062f \u0643\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0638\u0627\u0647\u0631\u0629",
    selectReservation: (confirmation) =>
      `\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u062d\u062c\u0632 ${
        confirmation ||
        "\u0628\u062f\u0648\u0646 \u0631\u0642\u0645 \u062a\u0623\u0643\u064a\u062f"
      }`,
    index: "#",
    customer: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064a\u0644",
    confirmation:
      "\u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
    source:
      "\u0627\u0644\u0645\u0635\u062f\u0631 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
    nights: "\u0627\u0644\u0644\u064a\u0627\u0644\u064a",
    roomNumber:
      "\u0631\u0642\u0645 \u063a\u0631\u0641\u0629 \u0627\u0644\u0625\u0642\u0627\u0645\u0629",
    otaTotal: "\u0625\u062c\u0645\u0627\u0644\u064a OTA (\u0631.\u0633)",
    pricingTotal:
      "\u0625\u062c\u0645\u0627\u0644\u064a \u062a\u0641\u0635\u064a\u0644 \u0627\u0644\u0633\u0639\u0631 (\u0631.\u0633)",
    status:
      "\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0633\u0648\u064a\u0629",
    unavailable: "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d",
    exportTitle:
      "\u062a\u0642\u0631\u064a\u0631 \u062a\u0633\u0648\u064a\u0629 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a",
    generatedAt:
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
    hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
    filters: "\u0627\u0644\u062a\u0635\u0641\u064a\u0629",
    exportTotal:
      "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0635\u0641\u0648\u0641 \u0627\u0644\u0638\u0627\u0647\u0631\u0629",
  },
};

const normalizeDateRanges = (ranges) => {
  if (!Array.isArray(ranges)) return [];
  return Array.from(
    new Map(
      ranges
        .map((range) => ({
          dateFrom: String(range?.dateFrom || "").trim(),
          dateTo: String(range?.dateTo || "").trim(),
        }))
        .filter((range) => range.dateFrom && range.dateTo)
        .map((range) => [`${range.dateFrom}|${range.dateTo}`, range]),
    ).values(),
  ).sort(
    (left, right) =>
      left.dateFrom.localeCompare(right.dateFrom) ||
      left.dateTo.localeCompare(right.dateTo),
  );
};

const parseDateRanges = (value) =>
  normalizeDateRanges(
    String(value || "")
      .split(",")
      .map((range) => {
        const [dateFrom, dateTo] = range.split("..");
        return { dateFrom, dateTo };
      }),
  );

const initialPaidDateFilter = (referenceDate = new Date()) => {
  const year = getPaidReportCurrentYear("hijri", referenceDate);
  const month = getPaidReportCurrentMonth("hijri", referenceDate);
  const resolved = resolvePaidReportPeriods({
    calendarType: "hijri",
    year: year == null ? "all" : String(year),
    months: month == null ? ["all"] : [String(month)],
    referenceDate,
  });
  return {
    dateBy: "checkin_date",
    dateFrom: resolved.error ? "" : resolved.dateFrom,
    dateTo: resolved.error ? "" : resolved.dateTo,
    dateRanges: resolved.error ? [] : normalizeDateRanges(resolved.dateRanges),
  };
};

export const readReconciliationQuery = (search = "", referenceDate) => {
  const params = new URLSearchParams(search || "");
  const defaults = initialPaidDateFilter(referenceDate);
  const hasDateFilter =
    params.has("dateBy") ||
    params.has("dateFrom") ||
    params.has("dateTo") ||
    params.has("dateRanges");
  const methods = normalizePaymentBreakdownKeys(
    params.get("reconciliationMethods") || "",
  );
  const requestedHotel = String(params.get("hotelId") || "").trim();
  return {
    hotelId:
      requestedHotel && requestedHotel.toLowerCase() !== "all"
        ? requestedHotel
        : PREFERRED_HOTEL_ID,
    search: String(params.get("search") || "").trim(),
    methods: methods.length ? methods : [...PAYMENT_BREAKDOWN_KEYS],
    status: normalizeReconciliationStatus(params.get("reconciliationStatus")),
    dateFilter: hasDateFilter
      ? {
          dateBy: DATE_FIELDS.has(params.get("dateBy"))
            ? params.get("dateBy")
            : "checkin_date",
          dateFrom: String(params.get("dateFrom") || "").trim(),
          dateTo: String(params.get("dateTo") || "").trim(),
          dateRanges: parseDateRanges(params.get("dateRanges")),
        }
      : defaults,
  };
};

const paginationError = () =>
  new Error("Invalid or excessive reconciliation pagination metadata");

export const validateReconciliationReportPage = (
  payload,
  requestedPage,
  expected = null,
) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw paginationError();
  }
  const { data, totalDocuments, page, limit } = payload;
  if (
    !Array.isArray(data) ||
    !Number.isSafeInteger(totalDocuments) ||
    totalDocuments < 0 ||
    totalDocuments > MAX_DOCUMENTS ||
    !Number.isSafeInteger(page) ||
    page !== requestedPage ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > PAGE_LIMIT ||
    data.length > limit
  ) {
    throw paginationError();
  }
  const totalPages = Math.max(1, Math.ceil(totalDocuments / limit));
  if (totalPages > MAX_PAGES) throw paginationError();
  if (
    expected &&
    (expected.totalDocuments !== totalDocuments ||
      expected.limit !== limit ||
      expected.totalPages !== totalPages)
  ) {
    throw paginationError();
  }
  return { data, totalDocuments, page, limit, totalPages };
};

export const mergeReconciliationPages = (pages, totalDocuments) => {
  const byId = new Map();
  pages.flat().forEach((reservation) => {
    const id = String(reservation?._id || "").trim();
    if (!id || byId.has(id)) throw paginationError();
    byId.set(id, reservation);
  });
  if (byId.size !== totalDocuments) throw paginationError();
  return Array.from(byId.values());
};

const safeCount = (value, fallback = 0) =>
  Number.isSafeInteger(Number(value)) && Number(value) >= 0
    ? Number(value)
    : fallback;

const scorecardCents = (scorecards, centsField, amountField, fallback) => {
  const cents = Number(scorecards?.[centsField]);
  if (Number.isSafeInteger(cents) && cents >= 0) return cents;
  if (
    scorecards &&
    Object.prototype.hasOwnProperty.call(scorecards, amountField)
  ) {
    return Math.max(moneyCents(scorecards[amountField]), 0);
  }
  return fallback;
};

const normalizeScorecards = (payload, rows, methods) => {
  const fallback = rows.reduce(
    (acc, reservation) => {
      const summary = summarizeReservationReconciliation(reservation, methods);
      acc.totalAmountCents += summary.totalCents;
      acc.reconciledAmountCents += summary.reconciledCents;
      acc.waitingAmountCents += summary.waitingCents;
      acc.reservationsCount += 1;
      if (summary.status === RECONCILIATION_STATUSES.RECONCILED) {
        acc.reconciledReservationsCount += 1;
      } else {
        acc.waitingReservationsCount += 1;
      }
      return acc;
    },
    {
      totalAmountCents: 0,
      reconciledAmountCents: 0,
      waitingAmountCents: 0,
      reservationsCount: 0,
      reconciledReservationsCount: 0,
      waitingReservationsCount: 0,
    },
  );
  const source = payload?.scorecards || {};
  const normalized = {
    totalAmountCents: scorecardCents(
      source,
      "totalAmountCents",
      "totalAmount",
      fallback.totalAmountCents,
    ),
    reconciledAmountCents: scorecardCents(
      source,
      "reconciledAmountCents",
      "reconciledAmount",
      fallback.reconciledAmountCents,
    ),
    waitingAmountCents: scorecardCents(
      source,
      "waitingAmountCents",
      "waitingAmount",
      fallback.waitingAmountCents,
    ),
    reservationsCount: safeCount(
      source.reservationsCount,
      fallback.reservationsCount,
    ),
    reconciledReservationsCount: safeCount(
      source.reconciledReservationsCount,
      fallback.reconciledReservationsCount,
    ),
    waitingReservationsCount: safeCount(
      source.waitingReservationsCount,
      fallback.waitingReservationsCount,
    ),
  };
  if (
    normalized.totalAmountCents !==
      normalized.reconciledAmountCents + normalized.waitingAmountCents ||
    normalized.reservationsCount !==
      normalized.reconciledReservationsCount +
        normalized.waitingReservationsCount
  ) {
    throw new Error("Reconciliation scorecards do not add up");
  }
  return normalized;
};

const extractHotels = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of ["hotels", "data", "results", "items", "docs", "list"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return Object.values(payload).find(Array.isArray) || [];
};

const reservationName = (reservation = {}) =>
  reservation?.customer_details?.fullName ||
  reservation?.customer_details?.name ||
  reservation?.customer_details?.guestName ||
  reservation?.customer_name ||
  "";

const reservationNights = (reservation = {}) => {
  const explicit = Number(
    reservation?.nights || reservation?.days_of_residence || 0,
  );
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  const start = new Date(reservation?.checkin_date || "");
  const end = new Date(reservation?.checkout_date || "");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(Math.round((end.getTime() - start.getTime()) / 86400000), 0);
};

const moneyText = (cents) =>
  (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const optionalMoneyText = (amount, available, unavailable) =>
  available === false || amount === null || amount === undefined
    ? unavailable
    : moneyText(moneyCents(amount));

const otaTotal = (reservation) => ({
  amount:
    reservation?.ota_total_amount_cents !== undefined
      ? Number(reservation.ota_total_amount_cents) / 100
      : reservation?.ota_total_amount,
  available: reservation?.ota_total_available !== false,
});

const pricingBreakdownTotal = (reservation) => ({
  amount:
    reservation?.pricing_breakdown_client_total_cents !== undefined
      ? Number(reservation.pricing_breakdown_client_total_cents) / 100
      : reservation?.pricing_breakdown_client_total,
  available: reservation?.pricing_breakdown_client_total_available !== false,
});

export const buildReconciliationMutationReservations = (rows, methods) =>
  rows.map((reservation) => ({
    reservationId: String(reservation?._id || ""),
    __v: reservation?.__v,
    updatedAt: reservation?.updatedAt,
    displayedAmountsCents: normalizePaymentBreakdownKeys(methods).reduce(
      (amounts, key) => {
        amounts[key] = paymentAmountCentsForKey(reservation, key);
        return amounts;
      },
      {},
    ),
  }));

const ReconciliationReportAdmin = () => {
  const { chosenLanguage } = useCartContext();
  const { user, token } = isAuthenticated() || {};
  const canUpdateReconciliation = isSuperAdminUser(user);
  const isArabic = chosenLanguage === "Arabic";
  const labels = TEXT[isArabic ? "ar" : "en"];
  const history = useHistory();
  const location = useLocation();
  const initialQuery = useRef(readReconciliationQuery(location.search)).current;
  const mountedRef = useRef(true);
  const requestSequence = useRef(0);
  const [hotels, setHotels] = useState([]);
  const [hotelsLoaded, setHotelsLoaded] = useState(false);
  const [hotelId, setHotelId] = useState(initialQuery.hotelId);
  const [searchBox, setSearchBox] = useState(initialQuery.search);
  const [search, setSearch] = useState(initialQuery.search);
  const [dateFilter, setDateFilter] = useState(initialQuery.dateFilter);
  const [methods, setMethods] = useState(initialQuery.methods);
  const [status, setStatus] = useState(initialQuery.status);
  const [reservations, setReservations] = useState([]);
  const [scorecards, setScorecards] = useState(() =>
    normalizeScorecards({}, [], initialQuery.methods),
  );
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const methodsKey = methods.join(",");
  const dateRangesKey = normalizeDateRanges(dateFilter.dateRanges)
    .map((range) => `${range.dateFrom}..${range.dateTo}`)
    .join(",");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSequence.current += 1;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    params.set("tab", "reconciliation");
    params.set("hotelId", hotelId || "all");
    params.set("dateBy", dateFilter.dateBy || "checkin_date");
    params.set("dateFrom", dateRangesKey ? "" : dateFilter.dateFrom || "");
    params.set("dateTo", dateRangesKey ? "" : dateFilter.dateTo || "");
    if (dateRangesKey) params.set("dateRanges", dateRangesKey);
    else params.delete("dateRanges");
    params.set("search", search);
    params.set("reconciliationMethods", methodsKey);
    params.set("reconciliationStatus", status);
    params.set("page", "1");
    const nextSearch = `?${params.toString()}`;
    if (nextSearch !== location.search) {
      history.replace({ pathname: location.pathname, search: nextSearch });
    }
  }, [
    dateFilter.dateBy,
    dateFilter.dateFrom,
    dateFilter.dateTo,
    dateRangesKey,
    history,
    hotelId,
    location.pathname,
    location.search,
    methodsKey,
    search,
    status,
  ]);

  useEffect(() => {
    if (!user?._id || !token) return undefined;
    let active = true;
    gettingHotelDetailsForAdminAll(user._id, token, "summary=true")
      .then((payload) => {
        if (!active || !mountedRef.current) return;
        const list = extractHotels(payload)
          .filter(
            (hotel) =>
              Boolean(hotel) &&
              hotel?.activateHotel !== false &&
              hotel?.xHotelProActive !== false,
          )
          .sort((left, right) =>
            String(left?.hotelName || "").localeCompare(
              String(right?.hotelName || ""),
              undefined,
              { sensitivity: "base" },
            ),
          );
        setHotels(list);
        setHotelId((currentHotelId) => {
          if (
            currentHotelId &&
            list.some((hotel) => String(hotel?._id) === String(currentHotelId))
          ) {
            return currentHotelId;
          }
          const preferred = list.find(
            (hotel) => String(hotel?._id) === PREFERRED_HOTEL_ID,
          );
          return String((preferred || list[0])?._id || "");
        });
        setHotelsLoaded(true);
      })
      .catch(() => {
        if (active && mountedRef.current) {
          setHotels([]);
          setHotelId("");
          setHotelsLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [token, user?._id]);

  const fetchReport = useCallback(async () => {
    if (!user?._id || !token || !hotelsLoaded || !hotelId || !methods.length)
      return;
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    try {
      const filters = {
        hotelId,
        searchQuery: search,
        dateBy: dateFilter.dateBy,
        dateFrom: dateFilter.dateFrom,
        dateTo: dateFilter.dateTo,
        dateRanges: normalizeDateRanges(dateFilter.dateRanges),
        paymentBreakdownKeys: methods,
        reconciliationStatus: status,
        limit: PAGE_LIMIT,
      };
      const firstPayload = await getReconciliationReportAdmin(user._id, token, {
        ...filters,
        page: 1,
      });
      if (!mountedRef.current || requestId !== requestSequence.current) return;
      const firstPage = validateReconciliationReportPage(firstPayload, 1);
      const pages = [firstPage.data];
      for (let page = 2; page <= firstPage.totalPages; page += 1) {
        const payload = await getReconciliationReportAdmin(user._id, token, {
          ...filters,
          page,
          includeScorecards: false,
        });
        if (!mountedRef.current || requestId !== requestSequence.current)
          return;
        pages.push(
          validateReconciliationReportPage(payload, page, firstPage).data,
        );
      }
      const merged = mergeReconciliationPages(pages, firstPage.totalDocuments);
      const eligible = merged.filter(
        (reservation) =>
          summarizeReservationReconciliation(reservation, methods).totalCents >
          0,
      );
      const filtered = filterReservationsByReconciliation(
        eligible,
        methods,
        status,
      );
      if (filtered.length !== merged.length) throw paginationError();
      if (!mountedRef.current || requestId !== requestSequence.current) return;
      setReservations(filtered);
      setScorecards(normalizeScorecards(firstPayload, filtered, methods));
      setSelectedIds(new Set());
    } catch (error) {
      if (!mountedRef.current || requestId !== requestSequence.current) return;
      console.error("Failed to load reconciliation report", error);
      message.error(labels.loadError);
      setReservations([]);
      setScorecards(normalizeScorecards({}, [], methods));
      setSelectedIds(new Set());
    } finally {
      if (mountedRef.current && requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [
    dateFilter.dateBy,
    dateFilter.dateFrom,
    dateFilter.dateRanges,
    dateFilter.dateTo,
    hotelId,
    hotelsLoaded,
    labels.loadError,
    methods,
    search,
    status,
    token,
    user?._id,
  ]);

  useEffect(() => {
    if (!hotelsLoaded || !hotelId) {
      requestSequence.current += 1;
      setReservations([]);
      setSelectedIds(new Set());
      setLoading(false);
      return;
    }
    fetchReport();
  }, [fetchReport, hotelId, hotelsLoaded]);

  const selectedRows = useMemo(
    () => reservations.filter((row) => selectedIds.has(String(row?._id))),
    [reservations, selectedIds],
  );
  const selectedAmountCents = useMemo(
    () =>
      selectedRows.reduce(
        (total, row) =>
          total + summarizeReservationReconciliation(row, methods).totalCents,
        0,
      ),
    [selectedRows, methods],
  );
  const allSelected =
    reservations.length > 0 && selectedRows.length === reservations.length;
  const partiallySelected = selectedRows.length > 0 && !allSelected;

  const selectedHotelName = useMemo(
    () =>
      hotels.find((hotel) => String(hotel?._id) === String(hotelId))
        ?.hotelName || "",
    [hotelId, hotels],
  );

  const changeMethods = (nextMethods) => {
    const normalized = normalizePaymentBreakdownKeys(nextMethods);
    if (!normalized.length) {
      message.info(labels.allMethodsRequired);
      return;
    }
    requestSequence.current += 1;
    setMethods(normalized);
  };

  const changeStatus = (nextStatus) => {
    const normalized = normalizeReconciliationStatus(nextStatus);
    if (normalized === status) return;
    requestSequence.current += 1;
    setStatus(normalized);
  };

  const applyDateFilter = (nextFilter = {}) => {
    const ranges = normalizeDateRanges(nextFilter.dateRanges);
    requestSequence.current += 1;
    setDateFilter({
      dateBy: DATE_FIELDS.has(nextFilter.dateBy)
        ? nextFilter.dateBy
        : "checkin_date",
      dateFrom: ranges.length ? "" : nextFilter.dateFrom || "",
      dateTo: ranges.length ? "" : nextFilter.dateTo || "",
      dateRanges: ranges,
    });
  };

  const applySearch = () => {
    const nextSearch = searchBox.trim();
    if (nextSearch === search) return;
    requestSequence.current += 1;
    setSearch(nextSearch);
  };

  const toggleAll = (checked) => {
    setSelectedIds(
      checked
        ? new Set(reservations.map((row) => String(row?._id)))
        : new Set(),
    );
  };

  const toggleRow = (reservationId, checked) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(String(reservationId));
      else next.delete(String(reservationId));
      return next;
    });
  };

  const updateSelectedStatus = async (nextStatus) => {
    if (!selectedRows.length) {
      message.info(labels.selectRowsFirst);
      return;
    }
    if (!canUpdateReconciliation) {
      message.error(labels.readOnly);
      return;
    }
    const assertions = buildReconciliationMutationReservations(
      selectedRows,
      methods,
    );
    const invalidAssertion = assertions.some(
      (item) =>
        !item.reservationId ||
        !Number.isSafeInteger(item.__v) ||
        !item.updatedAt,
    );
    if (invalidAssertion) {
      message.error(labels.conflict);
      await fetchReport();
      return;
    }

    setUpdating(true);
    let updatedCount = 0;
    try {
      for (
        let offset = 0;
        offset < assertions.length;
        offset += MUTATION_BATCH_SIZE
      ) {
        const payload = await updateReconciliationStatusAdmin(user._id, token, {
          hotelId,
          status: nextStatus,
          paymentBreakdownKeys: methods,
          reservations: assertions.slice(offset, offset + MUTATION_BATCH_SIZE),
        });
        updatedCount += safeCount(
          payload?.updatedCount,
          Math.min(MUTATION_BATCH_SIZE, assertions.length - offset),
        );
        if (safeCount(payload?.conflictCount) > 0) {
          const conflictError = new Error("Reconciliation conflict");
          conflictError.status = 409;
          throw conflictError;
        }
      }
      message.success(labels.updated(updatedCount));
    } catch (error) {
      console.error("Failed to update reconciliation", error);
      if (error?.status === 409 || error?.payload?.conflicts?.length) {
        message.warning(labels.conflict);
      } else {
        message.error(labels.updateError);
      }
    } finally {
      if (mountedRef.current) {
        setUpdating(false);
        await fetchReport();
      }
    }
  };

  const exportExcel = async () => {
    if (!reservations.length) {
      message.info(labels.noRowsToExport);
      return;
    }
    let XLSX;
    try {
      const spreadsheetModule = await import("xlsx-js-style");
      XLSX = spreadsheetModule?.utils
        ? spreadsheetModule
        : spreadsheetModule.default;
    } catch (error) {
      console.error("Failed to load Excel exporter", error);
      message.error(labels.exportFailed);
      return;
    }
    const dynamicHeaders = methods.map(
      (key) => PAYMENT_METHOD_LABELS[key]?.[isArabic ? "ar" : "en"] || key,
    );
    const headers = [
      labels.index,
      labels.customer,
      labels.confirmation,
      labels.source,
      labels.nights,
      labels.roomNumber,
      labels.otaTotal,
      labels.pricingTotal,
      ...dynamicHeaders,
      labels.status,
    ];
    const dataRows = reservations.map((reservation, index) => {
      const rooms = getReservationRoomSummary(reservation);
      const ota = otaTotal(reservation);
      const pricing = pricingBreakdownTotal(reservation);
      const summary = summarizeReservationReconciliation(reservation, methods);
      return [
        index + 1,
        reservationName(reservation),
        reservation?.confirmation_number || "",
        reservation?.booking_source || "",
        reservationNights(reservation),
        rooms.roomNumberText,
        ota.available ? ota.amount : labels.unavailable,
        pricing.available ? pricing.amount : labels.unavailable,
        ...methods.map((key) => amountForPaymentKey(reservation, key)),
        summary.status === RECONCILIATION_STATUSES.RECONCILED
          ? labels.reconciled
          : labels.waiting,
      ];
    });
    const totalRow = Array(headers.length).fill("");
    totalRow[1] = labels.exportTotal;
    methods.forEach((key, methodIndex) => {
      totalRow[8 + methodIndex] =
        reservations.reduce(
          (total, reservation) =>
            total + paymentAmountCentsForKey(reservation, key),
          0,
        ) / 100;
    });
    const filterDescription = `${labels.status}: ${labels[status]}; ${
      labels.methods
    }: ${methods
      .map((key) => PAYMENT_METHOD_LABELS[key]?.[isArabic ? "ar" : "en"] || key)
      .join(" | ")}`;
    const rows = [
      [labels.exportTitle],
      [`${labels.hotel}: ${selectedHotelName}`],
      [`${labels.generatedAt}: ${new Date().toLocaleString("en-US")}`],
      [`${labels.filters}: ${filterDescription}`],
      [],
      headers,
      ...dataRows,
      totalRow,
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const lastColumn = headers.length - 1;
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } }];
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 5, c: 0 },
        e: { r: 5 + dataRows.length, c: lastColumn },
      }),
    };
    worksheet["!views"] = [
      { state: "frozen", ySplit: 6, rightToLeft: isArabic },
    ];
    worksheet["!cols"] = headers.map((header, columnIndex) => ({
      wch: Math.min(
        Math.max(
          String(header).length + 3,
          ...dataRows.map((row) => String(row[columnIndex] ?? "").length + 2),
          12,
        ),
        38,
      ),
    }));
    const titleCell = worksheet.A1;
    if (titleCell) {
      titleCell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
        fill: { fgColor: { rgb: "0B4F71" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
    for (let column = 0; column <= lastColumn; column += 1) {
      const address = XLSX.utils.encode_cell({ r: 5, c: column });
      if (worksheet[address]) {
        worksheet[address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1677A6" } },
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
          border: {
            top: { style: "thin", color: { rgb: "D9E6EF" } },
            bottom: { style: "thin", color: { rgb: "D9E6EF" } },
            left: { style: "thin", color: { rgb: "D9E6EF" } },
            right: { style: "thin", color: { rgb: "D9E6EF" } },
          },
        };
      }
    }
    const totalRowIndex = rows.length - 1;
    for (let column = 0; column <= lastColumn; column += 1) {
      const address = XLSX.utils.encode_cell({ r: totalRowIndex, c: column });
      if (worksheet[address]) {
        worksheet[address].s = {
          font: { bold: true, color: { rgb: "17324D" } },
          fill: { fgColor: { rgb: "E8F2F8" } },
        };
      }
    }
    for (let row = 6; row < 6 + dataRows.length; row += 1) {
      for (let column = 6; column < 8 + methods.length; column += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: column });
        if (worksheet[address] && typeof worksheet[address].v === "number") {
          worksheet[address].z = "#,##0.00";
        }
      }
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reconciliation");
    const hotelSegment =
      String(selectedHotelName || "hotel")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "hotel";
    XLSX.writeFile(
      workbook,
      `reconciliation-${hotelSegment}-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`,
    );
    message.success(labels.exportDone);
  };

  const methodOptions = PAYMENT_BREAKDOWN_KEYS.map((key) => ({
    value: key,
    label: bilingualPaymentMethodLabel(key, isArabic),
  }));

  return (
    <ReportShell dir={isArabic ? "rtl" : "ltr"} $isArabic={isArabic}>
      <FilterPanel>
        <TopFilterRow>
          <Select
            aria-label={labels.selectHotel}
            placeholder={labels.selectHotel}
            value={hotelId || undefined}
            disabled={updating}
            onChange={(value) => {
              requestSequence.current += 1;
              setHotelId(value || "");
            }}
            options={hotels.map((hotel) => ({
              value: String(hotel?._id || ""),
              label: hotel?.hotelName || hotel?._id,
            }))}
            showSearch
            optionFilterProp="label"
          />
          <SearchGroup>
            <Input
              aria-label={labels.searchPlaceholder}
              placeholder={labels.searchPlaceholder}
              value={searchBox}
              onChange={(event) => setSearchBox(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              disabled={!hotelId || updating}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={applySearch}
              disabled={!hotelId || updating}
            >
              {labels.search}
            </Button>
          </SearchGroup>
        </TopFilterRow>
        <MethodFilter>
          <FilterLabel>{labels.methods}</FilterLabel>
          <Select
            aria-label={labels.methods}
            mode="multiple"
            value={methods}
            onChange={changeMethods}
            options={methodOptions}
            placeholder={labels.methodsPlaceholder}
            optionFilterProp="label"
            maxTagCount="responsive"
            disabled={!hotelId || updating}
          />
        </MethodFilter>
        <DateAndStatusRow>
          <PaidReportDateControls
            isArabic={isArabic}
            disabled={!hotelId || updating}
            value={dateFilter}
            onApply={applyDateFilter}
          />
          <StatusFilter role="group" aria-label={labels.statusFilter}>
            <FilterLabel>{labels.statusFilter}</FilterLabel>
            <StatusButtons>
              {Object.values(RECONCILIATION_STATUSES).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={status === value}
                  className={status === value ? "active" : ""}
                  onClick={() => changeStatus(value)}
                  disabled={!hotelId || updating}
                >
                  {labels[value]}
                </button>
              ))}
            </StatusButtons>
          </StatusFilter>
        </DateAndStatusRow>
      </FilterPanel>

      {!hotelsLoaded || loading ? (
        <LoadingState>
          <Spin size="large" />
        </LoadingState>
      ) : !hotelId ? (
        <EmptyState>{labels.selectHotelFirst}</EmptyState>
      ) : (
        <>
          <ScorecardGrid>
            <Scorecard $tone="total">
              <span>{labels.total}</span>
              <strong>{moneyText(scorecards.totalAmountCents)}</strong>
              <small>
                {scorecards.reservationsCount.toLocaleString("en-US")}{" "}
                {labels.totalCount}
              </small>
            </Scorecard>
            <Scorecard $tone="reconciled">
              <span>{labels.reconciledTotal}</span>
              <strong>{moneyText(scorecards.reconciledAmountCents)}</strong>
              <small>
                {scorecards.reconciledReservationsCount.toLocaleString("en-US")}
              </small>
            </Scorecard>
            <Scorecard $tone="waiting">
              <span>{labels.waitingTotal}</span>
              <strong>{moneyText(scorecards.waitingAmountCents)}</strong>
              <small>
                {scorecards.waitingReservationsCount.toLocaleString("en-US")}
              </small>
            </Scorecard>
            <Scorecard $tone="selected">
              <span>{labels.selectedReservations}</span>
              <strong>{selectedRows.length.toLocaleString("en-US")}</strong>
            </Scorecard>
            <Scorecard $tone="selectedAmount">
              <span>{labels.selectedAmount}</span>
              <strong>{moneyText(selectedAmountCents)}</strong>
            </Scorecard>
          </ScorecardGrid>

          <ActionBar>
            {!canUpdateReconciliation ? (
              <ReadOnlyNotice role="status">{labels.readOnly}</ReadOnlyNotice>
            ) : null}
            <Button
              className="reconciled-action"
              icon={<CheckCircleOutlined />}
              disabled={
                !canUpdateReconciliation || !selectedRows.length || updating
              }
              loading={updating}
              onClick={() =>
                updateSelectedStatus(RECONCILIATION_STATUSES.RECONCILED)
              }
            >
              {labels.markReconciled}
            </Button>
            <Button
              className="waiting-action"
              icon={<ClockCircleOutlined />}
              disabled={
                !canUpdateReconciliation || !selectedRows.length || updating
              }
              onClick={() =>
                updateSelectedStatus(RECONCILIATION_STATUSES.WAITING)
              }
            >
              {labels.markWaiting}
            </Button>
            <Button
              className="excel-action"
              icon={<FileExcelOutlined />}
              disabled={!reservations.length || updating}
              onClick={exportExcel}
            >
              {labels.exportExcel}
            </Button>
          </ActionBar>

          {!reservations.length ? (
            <EmptyState>{labels.noRows}</EmptyState>
          ) : (
            <TableFrame>
              <ReportTable $isArabic={isArabic}>
                <thead>
                  <tr>
                    <th className="checkbox-cell">
                      <Checkbox
                        aria-label={labels.selectAll}
                        checked={allSelected}
                        indeterminate={partiallySelected}
                        disabled={!canUpdateReconciliation || updating}
                        onChange={(event) => toggleAll(event.target.checked)}
                      />
                    </th>
                    <th>{labels.index}</th>
                    <th>{labels.customer}</th>
                    <th>{labels.confirmation}</th>
                    <th>{labels.source}</th>
                    <th>{labels.nights}</th>
                    <th>{labels.roomNumber}</th>
                    <th>{labels.otaTotal}</th>
                    <th>{labels.pricingTotal}</th>
                    {methods.map((key) => (
                      <th
                        key={key}
                        title={bilingualPaymentMethodLabel(key, isArabic)}
                      >
                        {PAYMENT_METHOD_LABELS[key]?.[isArabic ? "ar" : "en"] ||
                          key}
                      </th>
                    ))}
                    <th>{labels.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation, index) => {
                    const id = String(reservation?._id || "");
                    const room = getReservationRoomSummary(reservation);
                    const summary = summarizeReservationReconciliation(
                      reservation,
                      methods,
                    );
                    const ota = otaTotal(reservation);
                    const pricing = pricingBreakdownTotal(reservation);
                    return (
                      <tr
                        key={id}
                        className={selectedIds.has(id) ? "selected-row" : ""}
                      >
                        <td className="checkbox-cell">
                          <Checkbox
                            aria-label={labels.selectReservation(
                              reservation?.confirmation_number,
                            )}
                            checked={selectedIds.has(id)}
                            disabled={!canUpdateReconciliation || updating}
                            onChange={(event) =>
                              toggleRow(id, event.target.checked)
                            }
                          />
                        </td>
                        <td>{index + 1}</td>
                        <td>
                          <CellText title={reservationName(reservation)}>
                            {reservationName(reservation) || labels.unavailable}
                          </CellText>
                        </td>
                        <td>
                          <CellText title={reservation?.confirmation_number}>
                            {reservation?.confirmation_number ||
                              labels.unavailable}
                          </CellText>
                        </td>
                        <td>
                          {reservation?.booking_source || labels.unavailable}
                        </td>
                        <td>{reservationNights(reservation)}</td>
                        <td>{room.roomNumberText || labels.unavailable}</td>
                        <td className="money-cell">
                          {optionalMoneyText(
                            ota.amount,
                            ota.available,
                            labels.unavailable,
                          )}
                        </td>
                        <td className="money-cell">
                          {optionalMoneyText(
                            pricing.amount,
                            pricing.available,
                            labels.unavailable,
                          )}
                        </td>
                        {methods.map((key) => (
                          <td key={key} className="money-cell">
                            {moneyText(
                              paymentAmountCentsForKey(reservation, key),
                            )}
                          </td>
                        ))}
                        <td>
                          <StatusPill $status={summary.status}>
                            {summary.status ===
                            RECONCILIATION_STATUSES.RECONCILED ? (
                              <CheckCircleOutlined />
                            ) : (
                              <ClockCircleOutlined />
                            )}
                            {summary.status ===
                            RECONCILIATION_STATUSES.RECONCILED
                              ? labels.reconciled
                              : labels.waiting}
                          </StatusPill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </ReportTable>
            </TableFrame>
          )}
        </>
      )}
    </ReportShell>
  );
};

export default ReconciliationReportAdmin;

const ReportShell = styled.div`
  width: 100%;
  direction: ${({ $isArabic }) => ($isArabic ? "rtl" : "ltr")};
  text-align: ${({ $isArabic }) => ($isArabic ? "right" : "left")};
  color: #17324d;
`;

const FilterPanel = styled.section`
  background: linear-gradient(145deg, #f8fbfe 0%, #edf5fa 100%);
  border: 1px solid #cfe0eb;
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 8px 22px rgba(17, 71, 101, 0.08);
  margin-bottom: 16px;
`;

const TopFilterRow = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(300px, 1fr);
  gap: 12px;
  margin-bottom: 12px;
  .ant-select {
    width: 100%;
  }
  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;

const SearchGroup = styled.div`
  display: flex;
  gap: 8px;
  .ant-input {
    min-width: 0;
  }
  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const MethodFilter = styled.div`
  display: grid;
  grid-template-columns: 170px 1fr;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  .ant-select {
    width: 100%;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const FilterLabel = styled.span`
  font-size: 0.82rem;
  font-weight: 700;
  color: #35566e;
`;

const DateAndStatusRow = styled.div`
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
  > *:first-child {
    flex: 1 1 650px;
  }
`;

const StatusFilter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 370px;
  @media (max-width: 560px) {
    min-width: 100%;
  }
`;

const StatusButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(100px, 1fr));
  border: 1px solid #bad2e1;
  border-radius: 9px;
  overflow: hidden;
  button {
    border: 0;
    border-inline-end: 1px solid #d5e3ec;
    background: #fff;
    color: #35566e;
    font-weight: 700;
    padding: 8px 10px;
    cursor: pointer;
    transition: 0.18s ease;
  }
  button:last-child {
    border-inline-end: 0;
  }
  button.active {
    background: linear-gradient(135deg, #0c5f86, #087ca6);
    color: #fff;
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    button {
      border-inline-end: 0;
      border-bottom: 1px solid #d5e3ec;
    }
  }
`;

const ScorecardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 720px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 470px) {
    grid-template-columns: 1fr;
  }
`;

const scorecardColor = {
  total: ["#eaf4fb", "#1677a6"],
  reconciled: ["#eaf8f0", "#16834d"],
  waiting: ["#fff7e5", "#b66a00"],
  selected: ["#f2edff", "#6a48a8"],
  selectedAmount: ["#e8f8f8", "#087f83"],
};

const Scorecard = styled.div`
  background: ${({ $tone }) => scorecardColor[$tone]?.[0] || "#f7fafc"};
  border: 1px solid
    ${({ $tone }) => `${scorecardColor[$tone]?.[1] || "#789"}35`};
  border-top: 4px solid ${({ $tone }) => scorecardColor[$tone]?.[1] || "#789"};
  border-radius: 12px;
  padding: 12px 14px;
  min-height: 106px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  span {
    color: #4a6477;
    font-size: 0.79rem;
    font-weight: 700;
    line-height: 1.4;
  }
  strong {
    color: ${({ $tone }) => scorecardColor[$tone]?.[1] || "#17324d"};
    font-size: 1.28rem;
  }
  small {
    color: #6b7f8d;
  }
`;

const ActionBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  padding: 10px;
  margin-bottom: 12px;
  background: #f8fafc;
  border: 1px solid #dce7ee;
  border-radius: 10px;
  .reconciled-action {
    background: #16834d;
    border-color: #16834d;
    color: #fff;
  }
  .waiting-action {
    background: #fff7e5;
    border-color: #d99a2b;
    color: #8a5700;
  }
  .excel-action {
    margin-inline-start: auto;
    background: #0f7b55;
    border-color: #0f7b55;
    color: #fff;
    font-weight: 700;
  }
  @media (max-width: 650px) {
    button,
    .excel-action {
      width: 100%;
      margin-inline-start: 0;
    }
  }
`;

const ReadOnlyNotice = styled.span`
  align-self: center;
  padding: 5px 9px;
  border-radius: 8px;
  background: #eef3f7;
  color: #536b7c;
  font-size: 0.78rem;
  font-weight: 700;
`;

const TableFrame = styled.div`
  width: 100%;
  max-height: 690px;
  overflow: auto;
  border: 1px solid #cfdde6;
  border-radius: 12px;
  box-shadow: 0 7px 20px rgba(24, 70, 96, 0.08);
`;

const ReportTable = styled.table`
  width: 100%;
  min-width: 1450px;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  th,
  td {
    padding: 9px 10px;
    border-bottom: 1px solid #e4edf2;
    border-inline-end: 1px solid #edf2f5;
    font-size: 12px;
    white-space: nowrap;
    text-align: ${({ $isArabic }) => ($isArabic ? "right" : "left")};
    vertical-align: middle;
  }
  th {
    position: sticky;
    top: 0;
    z-index: 3;
    background: linear-gradient(180deg, #0e648c, #0a5376);
    color: #fff;
    font-weight: 700;
    line-height: 1.35;
  }
  tbody tr:nth-child(even) {
    background: #f8fbfd;
  }
  tbody tr:hover,
  tbody tr.selected-row {
    background: #e8f4fa;
  }
  .checkbox-cell {
    width: 44px;
    min-width: 44px;
    text-align: center;
  }
  .money-cell {
    text-align: end;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
`;

const CellText = styled.span`
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  font-weight: 700;
  color: ${({ $status }) => ($status === "reconciled" ? "#12623d" : "#8a5700")};
  background: ${({ $status }) =>
    $status === "reconciled" ? "#def5e8" : "#fff0c9"};
  border: 1px solid
    ${({ $status }) => ($status === "reconciled" ? "#a9dfbf" : "#efd18d")};
`;

const EmptyState = styled.div`
  padding: 36px 18px;
  text-align: center;
  color: #5f7280;
  font-weight: 700;
  background: #f8fbfd;
  border: 1px dashed #c4d6e1;
  border-radius: 12px;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  padding: 46px 12px;
`;
