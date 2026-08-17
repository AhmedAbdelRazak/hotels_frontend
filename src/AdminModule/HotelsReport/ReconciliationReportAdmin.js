import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Button, Checkbox, Input, Modal, Select, Spin, message } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileExcelOutlined,
  SearchOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { isAuthenticated } from "../../auth";
import { useCartContext } from "../../cart_context";
import {
  gettingHotelDetailsForAdminAll,
  getAdminReservationById,
  getReconciliationClosestMatchAdmin,
  getReconciliationReportAdmin,
  updateReconciliationStatusAdmin,
} from "../apiAdmin";
import MoreDetails from "../AllReservation/MoreDetails";
import { getReservationRoomSummary } from "../AllReservation/reservationRoomDetails";
import { isSuperAdminUser } from "../utils/superUsers";
import { formatSaudiGregorianDate } from "../../utils/saudiDates";
import { toLatinDigits } from "../../utils/latinDigits";
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
  hasStoredReconciliationEntry,
  isPaymentKeyReconciled,
  moneyCents,
  normalizePaymentBreakdownKeys,
  normalizeReconciliationStatus,
  paymentAmountCentsForKey,
  summarizeReservationReconciliation,
} from "./paymentReconciliation";

const PREFERRED_HOTEL_ID = "6a40b6a1a6efe70450536038";
const DEFAULT_PAYMENT_METHOD = "paid_at_hotel_cash";
const PAGE_LIMIT = 500;
const MAX_PAGES = 100;
const MAX_DOCUMENTS = PAGE_LIMIT * MAX_PAGES;
const MAX_MUTATION_RESERVATIONS = 500;
export const CLOSEST_REQUEST_DEADLINE_MS = 30_000;
export const MUTATION_REQUEST_DEADLINE_MS = 120_000;
export const HOTEL_BOOTSTRAP_DEADLINE_MS = 30_000;
export const REPORT_REQUEST_DEADLINE_MS = 60_000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_COMMENT_LENGTH = 1000;
const ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const DATE_FIELDS = new Set(["createdAt", "checkin_date", "checkout_date"]);

const PAYOUT_PURPOSES = Object.freeze([
  "paid_out_to_zad",
  "paid_out_as_commission",
  "paid_out_to_jannat",
  "paid_out_other",
]);

const PAYOUT_PURPOSE_LABELS = Object.freeze({
  paid_out_to_zad: Object.freeze({
    en: "Paid out to Zad",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0625\u0644\u0649 \u0632\u0627\u062f",
  }),
  paid_out_as_commission: Object.freeze({
    en: "Paid out as commission",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0643\u0639\u0645\u0648\u0644\u0629",
  }),
  paid_out_to_jannat: Object.freeze({
    en: "Paid out to Jannat",
    ar: "\u0645\u062f\u0641\u0648\u0639 \u0625\u0644\u0649 \u062c\u0646\u0627\u062a",
  }),
  paid_out_other: Object.freeze({
    en: "Other payout",
    ar: "\u062f\u0641\u0639\u0629 \u0623\u062e\u0631\u0649",
  }),
});

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
    mixed: "Partially reconciled",
    total: "Total paid in selected methods (SAR)",
    totalCount: "reservations in scope",
    reconciledTotal: "Reconciled (SAR)",
    waitingTotal: "Awaiting reconciliation (SAR)",
    selectedReservations: "Selected reservations",
    selectedAmount: "Selected amount (SAR)",
    markReconciled: "Reconcile selected",
    markWaiting: "Unreconcile selected",
    miscellaneous: "Miscellaneous",
    exportExcel: "Export to Excel",
    exportDone: "Excel report exported.",
    exportFailed: "Could not prepare the Excel report.",
    noRowsToExport: "There are no rows to export.",
    selectRowsFirst: "Select at least one reservation first.",
    tooManySelected: `A maximum of ${MAX_MUTATION_RESERVATIONS} reservations can be reconciled at once. Narrow the filters or select fewer reservations.`,
    noEligibleRows:
      "None of the selected reservations has an awaiting positive amount in this payment category.",
    choosePurpose: "Choose a payout purpose before confirming.",
    invalidAttachment:
      "Attachment must be one PDF, JPEG, PNG, or WebP file up to 10 MB.",
    commentTooLong: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters.`,
    invalidTarget:
      "Enter a positive SAR amount with no more than two decimals.",
    loadError: "Could not load the reconciliation report.",
    reportTimeout:
      "The reconciliation report timed out after 60 seconds. Adjust the filters and try again.",
    hotelLoadError: "Could not load the accessible hotels. Please try again.",
    hotelLoadTimeout:
      "Loading the accessible hotels timed out after 30 seconds. Please try again.",
    updateError: "Could not update reconciliation. The report was refreshed.",
    mutationTimeout:
      "The reconciliation request timed out after 120 seconds. No confirmation was received; review the report before trying again.",
    invalidMutationResponse:
      "The reconciliation response did not pass the safety checks. The report was refreshed; review it before trying again.",
    readOnly:
      "Only the configured super admin can change reconciliation status.",
    conflict:
      "Some reservations changed since this report loaded. Nothing stale was overwritten; the report was refreshed.",
    updated: (count) =>
      `${count.toLocaleString("en-US")} reservation${
        count === 1 ? "" : "s"
      } updated.`,
    reconcileTitle: "Confirm reconciliation",
    reconcileIntro: "Review the exact category, amount, and reservation count.",
    category: "Payment category",
    payoutPurpose: "Payout purpose",
    comment: "Comment",
    commentPlaceholder: "Optional reconciliation comment",
    attachment: "Attachment (optional)",
    attachmentHint: "PDF, JPEG, PNG, or WebP; maximum 10 MB",
    chooseFile: "Choose file",
    removeFile: "Remove",
    confirm: "Confirm",
    cancel: "Cancel",
    amountToReconcile: "Amount to reconcile",
    eligibleReservations: "Eligible reservations",
    skippedReservations: "selected rows will be skipped for this category",
    reset: "Unreconcile",
    resetTitle: "Return this category to awaiting reconciliation?",
    resetDescription:
      "The active reconciliation record for this category will return to its default awaiting state. Other categories are not changed.",
    resetDone: "Reservation returned to awaiting reconciliation.",
    details: "More details",
    detailsLoadError:
      "Could not load complete reservation details. Close and try again.",
    checkin: "Check-in",
    checkout: "Check-out",
    actions: "Actions",
    miscellaneousTitle: "Miscellaneous reconciliation",
    miscellaneousIntro:
      "Enter a target and find the closest set of awaiting reservations in the selected date scope. Nothing changes until you confirm the proposal.",
    targetAmount: "Target amount (SAR)",
    targetPlaceholder: "For example, 20000.00",
    selectedScope: "Selected date scope",
    findClosest: "Find closest reservations",
    findingClosest: "Finding the closest safe combination. Please wait...",
    proposal: "Closest proposal",
    matchedAmount: "Matched amount",
    difference: "Difference",
    exactMatch: "Exact match",
    closestMatch: "Closest available match",
    approximateMatch: "Bounded approximate match",
    resolution: "Matching resolution",
    selectionLimitWarning:
      "The 500-reservation limit affected this search. Review this bounded proposal carefully before confirming.",
    proposedReservations: "Proposed reservations",
    adjustedSelection: "Adjusted selection",
    proposalSelectionHint:
      "Uncheck any reservation you do not want to include before confirming.",
    proposalExport: "Export proposal to Excel",
    proposalExportDone: "Proposal exported to Excel.",
    proposalExportTitle: "Miscellaneous Reconciliation Proposal",
    includedInReconciliation: "Selected for reconciliation",
    yes: "Yes",
    no: "No",
    previewOnly: "Preview only - no reservation has been changed.",
    noProposal:
      "No awaiting reservations can match this category and date scope.",
    closestTimeout:
      "The closest-match search timed out after 30 seconds. Narrow the date range or amount and try again.",
    closestCandidateLimit:
      "Too many reservations are in this scope. Narrow the dates or search and try again.",
    closestSelectionLimit:
      "This target would require more than 500 reservations. Narrow the scope or choose another amount.",
    closestCandidatesChanged:
      "Reservations changed while the match was being prepared. The report was refreshed; try again.",
    invalidProposal:
      "The match response did not pass the safety checks. The report was refreshed; try again.",
    miscellaneousError:
      "Could not prepare a safe reconciliation proposal. Please try again.",
    backToAmount: "Change amount",
    miscConfirm: "Confirm proposal",
    targetDirectionOver: "over target",
    targetDirectionUnder: "under target",
    targetDirectionExact: "exact",
    allDates: "All dates",
    dateScopeJoin: "to",
    scopeHotel: "Hotel",
    scopeDateField: "Date field",
    scopeRange: "Date range",
    scopeSearch: "Search filter",
    noSearchFilter: "No search filter",
    createdAt: "Created at",
    currency: "SAR",
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
    bookingStatus: "Reservation status",
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
    mixed:
      "\u062a\u0645\u062a \u062a\u0633\u0648\u064a\u0629 \u062c\u0632\u0621",
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
      "\u0625\u0644\u063a\u0627\u0621 \u062a\u0633\u0648\u064a\u0629 \u0627\u0644\u0645\u062d\u062f\u062f",
    miscellaneous: "\u0645\u062a\u0641\u0631\u0642\u0627\u062a",
    exportExcel: "\u062a\u0635\u062f\u064a\u0631 \u0625\u0644\u0649 Excel",
    exportDone:
      "\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u062a\u0642\u0631\u064a\u0631 Excel.",
    exportFailed:
      "\u062a\u0639\u0630\u0631 \u062a\u062c\u0647\u064a\u0632 \u062a\u0642\u0631\u064a\u0631 Excel.",
    noRowsToExport:
      "\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u0648\u0641 \u0644\u0644\u062a\u0635\u062f\u064a\u0631.",
    selectRowsFirst:
      "\u062d\u062f\u062f \u062d\u062c\u0632\u064b\u0627 \u0648\u0627\u062d\u062f\u064b\u0627 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0623\u0648\u0644\u0627\u064b.",
    tooManySelected: `\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u062a\u0633\u0648\u064a\u0629 \u0641\u064a \u0643\u0644 \u0645\u0631\u0629 \u0647\u0648 ${MAX_MUTATION_RESERVATIONS} \u062d\u062c\u0632\u064b\u0627. \u0642\u0644\u0644 \u0646\u0637\u0627\u0642 \u0627\u0644\u0628\u062d\u062b \u0623\u0648 \u0639\u062f\u062f \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a.`,
    noEligibleRows:
      "\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0628\u0644\u063a \u0645\u0648\u062c\u0628 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0641\u0626\u0629 \u0644\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
    choosePurpose:
      "\u0627\u062e\u062a\u0631 \u063a\u0631\u0636 \u0627\u0644\u062f\u0641\u0639 \u0642\u0628\u0644 \u0627\u0644\u062a\u0623\u0643\u064a\u062f.",
    invalidAttachment:
      "\u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0627\u0644\u0645\u0631\u0641\u0642 \u0645\u0644\u0641 PDF \u0623\u0648 JPEG \u0623\u0648 PNG \u0623\u0648 WebP \u0648\u0627\u062d\u062f\u064b\u0627 \u0628\u062d\u062c\u0645 \u0644\u0627 \u064a\u062a\u062c\u0627\u0648\u0632 10 \u0645\u064a\u063a\u0627\u0628\u0627\u064a\u062a.",
    commentTooLong: `\u064a\u062c\u0628 \u0623\u0644\u0627 \u064a\u062a\u062c\u0627\u0648\u0632 \u0627\u0644\u062a\u0639\u0644\u064a\u0642 ${MAX_COMMENT_LENGTH} \u062d\u0631\u0641.`,
    invalidTarget:
      "\u0623\u062f\u062e\u0644 \u0645\u0628\u0644\u063a\u064b\u0627 \u0645\u0648\u062c\u0628\u064b\u0627 \u0628\u0627\u0644\u0631\u064a\u0627\u0644 \u0648\u0628\u062d\u062f \u0623\u0642\u0635\u0649 \u0645\u0646\u0632\u0644\u062a\u064a\u0646 \u0639\u0634\u0631\u064a\u062a\u064a\u0646.",
    loadError:
      "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629.",
    reportTimeout:
      "\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u062a\u062d\u0645\u064a\u0644 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629 \u0628\u0639\u062f 60 \u062b\u0627\u0646\u064a\u0629. \u0639\u062f\u0651\u0644 \u0627\u0644\u062a\u0635\u0641\u064a\u0629 \u0648\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    hotelLoadError:
      "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u062a\u0627\u062d\u0629. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    hotelLoadTimeout:
      "\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0629 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u062a\u0627\u062d\u0629 \u0628\u0639\u062f 30 \u062b\u0627\u0646\u064a\u0629. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    updateError:
      "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0633\u0648\u064a\u0629. \u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0642\u0631\u064a\u0631.",
    mutationTimeout:
      "\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0637\u0644\u0628 \u0627\u0644\u062a\u0633\u0648\u064a\u0629 \u0628\u0639\u062f 120 \u062b\u0627\u0646\u064a\u0629. \u0644\u0645 \u064a\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u062a\u0623\u0643\u064a\u062f\u061b \u0631\u0627\u062c\u0639 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0642\u0628\u0644 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    invalidMutationResponse:
      "\u0644\u0645 \u064a\u062c\u062a\u0632 \u0631\u062f \u0627\u0644\u062a\u0633\u0648\u064a\u0629 \u0641\u062d\u0648\u0635\u0627\u062a \u0627\u0644\u0623\u0645\u0627\u0646. \u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0642\u0631\u064a\u0631\u061b \u0631\u0627\u062c\u0639\u0647 \u0642\u0628\u0644 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    readOnly:
      "\u064a\u0645\u0643\u0646 \u0644\u0644\u0645\u0634\u0631\u0641 \u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u0645\u0639\u062f \u0641\u0642\u0637 \u062a\u063a\u064a\u064a\u0631 \u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0633\u0648\u064a\u0629.",
    conflict:
      "\u062a\u063a\u064a\u0631\u062a \u0628\u0639\u0636 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0645\u0646\u0630 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0642\u0631\u064a\u0631. \u0644\u0645 \u062a\u064f\u0633\u062a\u0628\u062f\u0644 \u0623\u064a \u0628\u064a\u0627\u0646\u0627\u062a \u0642\u062f\u064a\u0645\u0629\u060c \u0648\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0642\u0631\u064a\u0631.",
    updated: (count) =>
      `\u062a\u0645 \u062a\u062d\u062f\u064a\u062b ${count.toLocaleString(
        "en-US",
      )} \u062d\u062c\u0632.`,
    reconcileTitle:
      "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062a\u0633\u0648\u064a\u0629",
    reconcileIntro:
      "\u0631\u0627\u062c\u0639 \u0641\u0626\u0629 \u0627\u0644\u062f\u0641\u0639 \u0648\u0627\u0644\u0645\u0628\u0644\u063a \u0648\u0639\u062f\u062f \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0628\u062f\u0642\u0629.",
    category: "\u0641\u0626\u0629 \u0627\u0644\u062f\u0641\u0639",
    payoutPurpose: "\u063a\u0631\u0636 \u0627\u0644\u062f\u0641\u0639",
    comment: "\u0627\u0644\u062a\u0639\u0644\u064a\u0642",
    commentPlaceholder:
      "\u062a\u0639\u0644\u064a\u0642 \u0627\u0644\u062a\u0633\u0648\u064a\u0629 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)",
    attachment:
      "\u0627\u0644\u0645\u0631\u0641\u0642 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)",
    attachmentHint:
      "PDF \u0623\u0648 JPEG \u0623\u0648 PNG \u0623\u0648 WebP\u060c \u0628\u062d\u062f \u0623\u0642\u0635\u0649 10 \u0645\u064a\u063a\u0627\u0628\u0627\u064a\u062a",
    chooseFile: "\u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0644\u0641",
    removeFile: "\u0625\u0632\u0627\u0644\u0629",
    confirm: "\u062a\u0623\u0643\u064a\u062f",
    cancel: "\u0625\u0644\u063a\u0627\u0621",
    amountToReconcile:
      "\u0645\u0628\u0644\u063a \u0627\u0644\u062a\u0633\u0648\u064a\u0629",
    eligibleReservations:
      "\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0624\u0647\u0644\u0629",
    skippedReservations:
      "\u0645\u0646 \u0627\u0644\u0635\u0641\u0648\u0641 \u0627\u0644\u0645\u062d\u062f\u062f\u0629 \u0633\u064a\u062a\u0645 \u062a\u062c\u0627\u0648\u0632\u0647\u0627 \u0644\u0647\u0630\u0647 \u0627\u0644\u0641\u0626\u0629",
    reset:
      "\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u0633\u0648\u064a\u0629",
    resetTitle:
      "\u0625\u0639\u0627\u062f\u0629 \u0647\u0630\u0647 \u0627\u0644\u0641\u0626\u0629 \u0644\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629\u061f",
    resetDescription:
      "\u0633\u064a\u0639\u0648\u062f \u0633\u062c\u0644 \u0627\u0644\u062a\u0633\u0648\u064a\u0629 \u0627\u0644\u0646\u0634\u0637 \u0644\u0647\u0630\u0647 \u0627\u0644\u0641\u0626\u0629 \u0625\u0644\u0649 \u062d\u0627\u0644\u0629 \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629. \u0644\u0646 \u062a\u062a\u063a\u064a\u0631 \u0627\u0644\u0641\u0626\u0627\u062a \u0627\u0644\u0623\u062e\u0631\u0649.",
    resetDone:
      "\u062a\u0645\u062a \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062d\u062c\u0632 \u0644\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629.",
    details:
      "\u0645\u0632\u064a\u062f \u0645\u0646 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
    detailsLoadError:
      "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062d\u062c\u0632 \u0627\u0644\u0643\u0627\u0645\u0644\u0629. \u0623\u063a\u0644\u0642 \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0648\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    checkin:
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0648\u0635\u0648\u0644",
    checkout:
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
    actions: "\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
    miscellaneousTitle:
      "\u062a\u0633\u0648\u064a\u0629 \u0645\u062a\u0641\u0631\u0642\u0629",
    miscellaneousIntro:
      "\u0623\u062f\u062e\u0644 \u0645\u0628\u0644\u063a\u064b\u0627 \u0645\u0633\u062a\u0647\u062f\u0641\u064b\u0627 \u0644\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0623\u0642\u0631\u0628 \u0645\u062c\u0645\u0648\u0639\u0629 \u062d\u062c\u0648\u0632\u0627\u062a \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629 \u0636\u0645\u0646 \u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u0645\u062d\u062f\u062f. \u0644\u0646 \u064a\u062a\u063a\u064a\u0631 \u0623\u064a \u062d\u062c\u0632 \u0642\u0628\u0644 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0627\u0642\u062a\u0631\u0627\u062d.",
    targetAmount:
      "\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0633\u062a\u0647\u062f\u0641 (\u0631.\u0633)",
    targetPlaceholder: "\u0645\u062b\u0627\u0644: 20000.00",
    selectedScope:
      "\u0646\u0637\u0627\u0642 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u062d\u062f\u062f",
    findClosest:
      "\u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0623\u0642\u0631\u0628 \u062d\u062c\u0648\u0632\u0627\u062a",
    findingClosest:
      "\u062c\u0627\u0631\u064d \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0623\u0642\u0631\u0628 \u0645\u062c\u0645\u0648\u0639\u0629 \u0622\u0645\u0646\u0629. \u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631...",
    proposal: "\u0623\u0642\u0631\u0628 \u0627\u0642\u062a\u0631\u0627\u062d",
    matchedAmount:
      "\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0637\u0627\u0628\u0642",
    difference: "\u0627\u0644\u0641\u0631\u0642",
    exactMatch: "\u0645\u0637\u0627\u0628\u0642\u0629 \u062a\u0627\u0645\u0629",
    closestMatch:
      "\u0623\u0642\u0631\u0628 \u0645\u0637\u0627\u0628\u0642\u0629 \u0645\u062a\u0627\u062d\u0629",
    approximateMatch:
      "\u0645\u0637\u0627\u0628\u0642\u0629 \u062a\u0642\u0631\u064a\u0628\u064a\u0629 \u0636\u0645\u0646 \u062d\u062f\u0648\u062f \u0627\u0644\u0628\u062d\u062b",
    resolution:
      "\u062f\u0642\u0629 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629",
    selectionLimitWarning:
      "\u0623\u062b\u0651\u0631 \u062d\u062f 500 \u062d\u062c\u0632 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0628\u062d. \u0631\u0627\u062c\u0639 \u0647\u0630\u0627 \u0627\u0644\u0627\u0642\u062a\u0631\u0627\u062d \u0627\u0644\u062a\u0642\u0631\u064a\u0628\u064a \u0628\u0639\u0646\u0627\u064a\u0629 \u0642\u0628\u0644 \u0627\u0644\u062a\u0623\u0643\u064a\u062f.",
    proposedReservations:
      "\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0642\u062a\u0631\u062d\u0629",
    adjustedSelection:
      "\u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0639\u062f\u0651\u0644",
    proposalSelectionHint:
      "\u0623\u0632\u0644 \u0627\u0644\u062a\u062d\u062f\u064a\u062f \u0639\u0646 \u0623\u064a \u062d\u062c\u0632 \u0644\u0627 \u062a\u0631\u064a\u062f \u0625\u062f\u0631\u0627\u062c\u0647 \u0642\u0628\u0644 \u0627\u0644\u062a\u0623\u0643\u064a\u062f.",
    proposalExport:
      "\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0627\u0642\u062a\u0631\u0627\u062d \u0625\u0644\u0649 Excel",
    proposalExportDone:
      "\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0627\u0642\u062a\u0631\u0627\u062d \u0625\u0644\u0649 Excel.",
    proposalExportTitle:
      "\u0627\u0642\u062a\u0631\u0627\u062d \u062a\u0633\u0648\u064a\u0629 \u0645\u062a\u0641\u0631\u0642\u0629",
    includedInReconciliation:
      "\u0645\u062d\u062f\u062f \u0644\u0644\u062a\u0633\u0648\u064a\u0629",
    yes: "\u0646\u0639\u0645",
    no: "\u0644\u0627",
    previewOnly:
      "\u0645\u0639\u0627\u064a\u0646\u0629 \u0641\u0642\u0637 \u2014 \u0644\u0645 \u064a\u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0623\u064a \u062d\u062c\u0632.",
    noProposal:
      "\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0633\u0648\u064a\u0629 \u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u0641\u0626\u0629 \u0648\u0627\u0644\u0646\u0637\u0627\u0642.",
    closestTimeout:
      "\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0627\u0644\u0628\u062d\u062b \u0639\u0646 \u0623\u0642\u0631\u0628 \u0645\u0637\u0627\u0628\u0642\u0629 \u0628\u0639\u062f 30 \u062b\u0627\u0646\u064a\u0629. \u0636\u064a\u0651\u0642 \u0646\u0637\u0627\u0642 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0623\u0648 \u0627\u0644\u0645\u0628\u0644\u063a \u0648\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    closestCandidateLimit:
      "\u064a\u062d\u062a\u0648\u064a \u0647\u0630\u0627 \u0627\u0644\u0646\u0637\u0627\u0642 \u0639\u0644\u0649 \u0639\u062f\u062f \u0643\u0628\u064a\u0631 \u062c\u062f\u064b\u0627 \u0645\u0646 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a. \u0636\u064a\u0651\u0642 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0623\u0648 \u0627\u0644\u0628\u062d\u062b \u0648\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    closestSelectionLimit:
      "\u064a\u062a\u0637\u0644\u0628 \u0647\u0630\u0627 \u0627\u0644\u0645\u0628\u0644\u063a \u0623\u0643\u062b\u0631 \u0645\u0646 500 \u062d\u062c\u0632. \u0636\u064a\u0651\u0642 \u0627\u0644\u0646\u0637\u0627\u0642 \u0623\u0648 \u0627\u062e\u062a\u0631 \u0645\u0628\u0644\u063a\u064b\u0627 \u0622\u062e\u0631.",
    closestCandidatesChanged:
      "\u062a\u063a\u064a\u0631\u062a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0623\u062b\u0646\u0627\u0621 \u0625\u0639\u062f\u0627\u062f \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629. \u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0642\u0631\u064a\u0631\u061b \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    invalidProposal:
      "\u0644\u0645 \u064a\u062c\u062a\u0632 \u0631\u062f \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0641\u062d\u0648\u0635\u0627\u062a \u0627\u0644\u0623\u0645\u0627\u0646. \u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0642\u0631\u064a\u0631\u061b \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    miscellaneousError:
      "\u062a\u0639\u0630\u0631 \u0625\u0639\u062f\u0627\u062f \u0627\u0642\u062a\u0631\u0627\u062d \u062a\u0633\u0648\u064a\u0629 \u0622\u0645\u0646. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
    backToAmount:
      "\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u0628\u0644\u063a",
    miscConfirm:
      "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0627\u0642\u062a\u0631\u0627\u062d",
    targetDirectionOver:
      "\u0641\u0648\u0642 \u0627\u0644\u0645\u0633\u062a\u0647\u062f\u0641",
    targetDirectionUnder:
      "\u0623\u0642\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062a\u0647\u062f\u0641",
    targetDirectionExact: "\u0645\u0637\u0627\u0628\u0642",
    allDates: "\u0643\u0644 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e",
    dateScopeJoin: "\u0625\u0644\u0649",
    scopeHotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
    scopeDateField:
      "\u062d\u0642\u0644 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
    scopeRange:
      "\u0646\u0637\u0627\u0642 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
    scopeSearch:
      "\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0628\u062d\u062b",
    noSearchFilter:
      "\u0628\u062f\u0648\u0646 \u062a\u0635\u0641\u064a\u0629 \u0628\u062d\u062b",
    createdAt:
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
    currency: "\u0631.\u0633",
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
    bookingStatus: "\u062d\u0627\u0644\u0629 \u0627\u0644\u062d\u062c\u0632",
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
  return {
    hotelId: PREFERRED_HOTEL_ID,
    search: String(params.get("search") || "").trim(),
    methods: [DEFAULT_PAYMENT_METHOD],
    status: RECONCILIATION_STATUSES.WAITING,
    dateFilter: defaults,
  };
};

const sortableDate = (value) => {
  const timestamp = new Date(value || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
};

export const sortReconciliationRows = (rows = []) =>
  [...rows].sort(
    (left, right) =>
      sortableDate(left?.checkin_date) - sortableDate(right?.checkin_date) ||
      sortableDate(left?.checkout_date) - sortableDate(right?.checkout_date) ||
      sortableDate(left?.createdAt) - sortableDate(right?.createdAt) ||
      String(left?._id || "").localeCompare(String(right?._id || "")),
  );

const paginationError = () =>
  new Error("Invalid or excessive reconciliation pagination metadata");

export const validateReconciliationReportPage = (
  payload,
  requestedPage,
  expected = null,
  expectedFilters = null,
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
    data.length > limit ||
    data.some((reservation) => isCancelledReservation(reservation))
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
  if (expectedFilters) {
    const expectedMethods = normalizePaymentBreakdownKeys(
      expectedFilters.paymentBreakdownKeys,
    );
    const echoedMethods = payload.selectedPaymentBreakdownKeys;
    if (
      !Array.isArray(echoedMethods) ||
      echoedMethods.length !== expectedMethods.length ||
      echoedMethods.some((key, index) => key !== expectedMethods[index]) ||
      payload.reconciliationStatus !== expectedFilters.reconciliationStatus
    ) {
      throw paginationError();
    }
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
  return sortReconciliationRows(Array.from(byId.values()));
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
      if (summary.hasReconciled) acc.reconciledReservationsCount += 1;
      if (summary.hasWaiting) acc.waitingReservationsCount += 1;
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
    normalized.reconciledAmountCents + normalized.waitingAmountCents
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

const isCancelledReservation = (reservation = {}) =>
  /cancel/i.test(
    `${reservation?.reservation_status || ""} ${reservation?.state || ""}`,
  );

const reservationStatusText = (reservation = {}, isArabic, fallback) => {
  const raw = String(
    reservation?.reservation_status || reservation?.state || "",
  ).trim();
  if (!raw) return fallback;
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");
  const labels = {
    checked_out: [
      "Checked out",
      "\u062a\u0645\u062a \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
    ],
    checkedout: [
      "Checked out",
      "\u062a\u0645\u062a \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
    ],
    inhouse: ["In house", "\u0645\u0642\u064a\u0645"],
    in_house: ["In house", "\u0645\u0642\u064a\u0645"],
    no_show: ["No-show", "\u0639\u062f\u0645 \u062d\u0636\u0648\u0631"],
    noshow: ["No-show", "\u0639\u062f\u0645 \u062d\u0636\u0648\u0631"],
    confirmed: ["Confirmed", "\u0645\u0624\u0643\u062f"],
  };
  return labels[normalized]?.[isArabic ? 1 : 0] || raw.replace(/_/g, " ");
};

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

export const parsePositiveSarCents = (value) => {
  const normalized = toLatinDigits(value ?? "")
    .replace(/\u066b/g, ".")
    .replace(/[\u066c,]/g, "")
    .trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
};

const bilingualPurposeLabel = (purpose, isArabic) => {
  const option = PAYOUT_PURPOSE_LABELS[purpose];
  if (!option) return purpose;
  return isArabic
    ? `${option.ar} / ${option.en}`
    : `${option.en} / ${option.ar}`;
};

const formatReportDate = (value, isArabic, fallback) =>
  formatSaudiGregorianDate(value, {
    language: isArabic ? "Arabic" : "English",
    month: "short",
    fallback,
  });

const actionRowsForCategory = (rows, category, action) =>
  rows.filter((reservation) => {
    const amountCents = paymentAmountCentsForKey(reservation, category);
    if (action === "reset") {
      return hasStoredReconciliationEntry(reservation, category);
    }
    return amountCents > 0 && !isPaymentKeyReconciled(reservation, category);
  });

const actionAmountCentsForRows = (rows, category) =>
  rows.reduce(
    (total, reservation) =>
      total + paymentAmountCentsForKey(reservation, category),
    0,
  );

const safeAttachment = (file) =>
  Boolean(
    file &&
      ATTACHMENT_TYPES.has(String(file.type || "").toLowerCase()) &&
      Number.isFinite(Number(file.size)) &&
      Number(file.size) > 0 &&
      Number(file.size) <= MAX_ATTACHMENT_BYTES,
  );

const createAbortRace = (controller) => {
  let abortListener;
  const promise = new Promise((_, reject) => {
    abortListener = () => {
      const error = new Error("Request aborted");
      error.name = "AbortError";
      reject(error);
    };
    if (controller.signal.aborted) abortListener();
    else
      controller.signal.addEventListener("abort", abortListener, {
        once: true,
      });
  });
  return {
    promise,
    dispose: () =>
      controller.signal.removeEventListener("abort", abortListener),
  };
};

const invalidClosestProposal = () => {
  const error = new Error("Invalid closest-match proposal");
  error.code = "invalid_closest_proposal";
  return error;
};

export const validateClosestMatchProposal = ({
  proposal,
  hotelId,
  category,
  targetAmountCents,
}) => {
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    throw invalidClosestProposal();
  }
  const rows = sortReconciliationRows(proposal.data || []);
  const snapshots = proposal.reservations;
  const selectedCount = Number(proposal.selectedCount);
  const matchedAmountCents = Number(proposal.matchedAmountCents);
  const differenceCents = Number(proposal.differenceCents);
  const resolutionCents = Number(proposal.resolutionCents);
  const candidateCount = Number(proposal.candidateCount);
  const elapsedMs = Number(proposal.elapsedMs);
  const expectedDifference = matchedAmountCents - targetAmountCents;
  const expectedDirection =
    expectedDifference === 0
      ? "exact"
      : expectedDifference < 0
        ? "under"
        : "over";
  if (
    proposal.code !== "reconciliation_closest_match" ||
    String(proposal.hotelId || "") !== String(hotelId || "") ||
    proposal.paymentBreakdownKey !== category ||
    Number(proposal.targetAmountCents) !== targetAmountCents ||
    !Array.isArray(proposal.data) ||
    !Array.isArray(snapshots) ||
    !Number.isSafeInteger(selectedCount) ||
    selectedCount < 0 ||
    selectedCount > MAX_MUTATION_RESERVATIONS ||
    rows.length !== selectedCount ||
    snapshots.length !== selectedCount ||
    !Number.isSafeInteger(matchedAmountCents) ||
    matchedAmountCents < 0 ||
    !Number.isSafeInteger(differenceCents) ||
    differenceCents !== expectedDifference ||
    proposal.direction !== expectedDirection ||
    typeof proposal.exactMatch !== "boolean" ||
    proposal.exactMatch !== (differenceCents === 0) ||
    typeof proposal.optimalityGuaranteed !== "boolean" ||
    (proposal.exactMatch && !proposal.optimalityGuaranteed) ||
    !Number.isSafeInteger(resolutionCents) ||
    resolutionCents < 1 ||
    !Number.isSafeInteger(candidateCount) ||
    candidateCount < selectedCount ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    typeof proposal.timedOut !== "boolean" ||
    typeof proposal.selectionLimitExceeded !== "boolean"
  ) {
    throw invalidClosestProposal();
  }

  const rowsById = new Map();
  let recomputedAmountCents = 0;
  rows.forEach((row) => {
    const reservationId = String(row?._id || "").trim();
    const amountCents = paymentAmountCentsForKey(row, category);
    if (
      !reservationId ||
      rowsById.has(reservationId) ||
      amountCents <= 0 ||
      isCancelledReservation(row) ||
      isPaymentKeyReconciled(row, category) ||
      !Number.isSafeInteger(recomputedAmountCents + amountCents)
    ) {
      throw invalidClosestProposal();
    }
    recomputedAmountCents += amountCents;
    rowsById.set(reservationId, { row, amountCents });
  });

  const snapshotsById = new Map();
  snapshots.forEach((snapshot) => {
    const reservationId = String(snapshot?.reservationId || "").trim();
    const amountKeys = Object.keys(snapshot?.displayedAmountsCents || {});
    const rowEntry = rowsById.get(reservationId);
    if (
      !reservationId ||
      snapshotsById.has(reservationId) ||
      !rowEntry ||
      !Number.isSafeInteger(snapshot?.__v) ||
      !String(snapshot?.updatedAt || "").trim() ||
      amountKeys.length !== 1 ||
      amountKeys[0] !== category ||
      !Number.isSafeInteger(snapshot.displayedAmountsCents[category]) ||
      snapshot.displayedAmountsCents[category] !== rowEntry.amountCents
    ) {
      throw invalidClosestProposal();
    }
    snapshotsById.set(reservationId, snapshot);
  });

  if (
    snapshotsById.size !== rowsById.size ||
    recomputedAmountCents !== matchedAmountCents
  ) {
    throw invalidClosestProposal();
  }
  return {
    ...proposal,
    data: rows,
    reservations: rows.map((row) => snapshotsById.get(String(row._id))),
    selectedCount,
    matchedAmountCents,
    differenceCents,
    resolutionCents,
    candidateCount,
    elapsedMs,
  };
};

const CLOSEST_ERROR_LABELS = Object.freeze({
  closest_match_timeout: "closestTimeout",
  closest_match_candidate_limit_exceeded: "closestCandidateLimit",
  closest_match_selection_limit_exceeded: "closestSelectionLimit",
  closest_match_candidates_changed: "closestCandidatesChanged",
});

export const validateReconciliationMutationSuccess = ({
  payload,
  action,
  category,
  expectedActionAmountCents,
  reservations,
}) => {
  const expectedIds = new Set(
    (reservations || []).map((item) => String(item?.reservationId || "")),
  );
  const updatedIds = Array.isArray(payload?.updated)
    ? payload.updated.map((id) => String(id || ""))
    : [];
  const updatedSet = new Set(updatedIds);
  const keys = payload?.paymentBreakdownKeys;
  if (
    payload?.success !== true ||
    payload?.code !== "reconciliation_updated" ||
    payload?.action !== action ||
    !Array.isArray(keys) ||
    keys.length !== 1 ||
    keys[0] !== category ||
    payload?.plannedActionAmountCents !== expectedActionAmountCents ||
    payload?.appliedActionAmountCents !== expectedActionAmountCents ||
    payload?.updatedCount !== expectedIds.size ||
    payload?.conflictCount !== 0 ||
    !Array.isArray(payload?.conflicts) ||
    payload.conflicts.length !== 0 ||
    updatedIds.length !== expectedIds.size ||
    updatedSet.size !== expectedIds.size ||
    [...expectedIds].some((id) => !id || !updatedSet.has(id))
  ) {
    const error = new Error("Invalid reconciliation mutation response");
    error.code = "invalid_mutation_response";
    throw error;
  }
  return payload;
};

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
  const hotelsAbortRef = useRef(null);
  const hotelsDeadlineRef = useRef(null);
  const reportAbortRef = useRef(null);
  const reportDeadlineRef = useRef(null);
  const reportInFlightRef = useRef(false);
  const detailsAbortRef = useRef(null);
  const closestAbortRef = useRef(null);
  const closestDeadlineRef = useRef(null);
  const closestRequestSequence = useRef(0);
  const closestInFlightRef = useRef(false);
  const mutationAbortRef = useRef(null);
  const mutationDeadlineRef = useRef(null);
  const mutationLockRef = useRef(false);
  const reconcileFileInputRef = useRef(null);
  const miscellaneousFileInputRef = useRef(null);
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
  const [actionModal, setActionModal] = useState(null);
  const [actionCategory, setActionCategory] = useState(DEFAULT_PAYMENT_METHOD);
  const [actionPurpose, setActionPurpose] = useState("");
  const [actionComment, setActionComment] = useState("");
  const [actionAttachment, setActionAttachment] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetCategory, setResetCategory] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsReservation, setDetailsReservation] = useState(null);
  const [miscellaneousOpen, setMiscellaneousOpen] = useState(false);
  const [miscellaneousCategory, setMiscellaneousCategory] = useState(
    DEFAULT_PAYMENT_METHOD,
  );
  const [miscellaneousTarget, setMiscellaneousTarget] = useState("");
  const [miscellaneousPurpose, setMiscellaneousPurpose] = useState("");
  const [miscellaneousComment, setMiscellaneousComment] = useState("");
  const [miscellaneousAttachment, setMiscellaneousAttachment] = useState(null);
  const [miscellaneousProposal, setMiscellaneousProposal] = useState(null);
  const [miscellaneousSelectedIds, setMiscellaneousSelectedIds] = useState(
    () => new Set(),
  );
  const [findingClosest, setFindingClosest] = useState(false);

  const methodsKey = methods.join(",");
  const dateRangesKey = normalizeDateRanges(dateFilter.dateRanges)
    .map((range) => `${range.dateFrom}..${range.dateTo}`)
    .join(",");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSequence.current += 1;
      closestRequestSequence.current += 1;
      if (hotelsDeadlineRef.current) clearTimeout(hotelsDeadlineRef.current);
      if (reportDeadlineRef.current) clearTimeout(reportDeadlineRef.current);
      if (closestDeadlineRef.current) clearTimeout(closestDeadlineRef.current);
      if (mutationDeadlineRef.current)
        clearTimeout(mutationDeadlineRef.current);
      hotelsDeadlineRef.current = null;
      reportDeadlineRef.current = null;
      closestDeadlineRef.current = null;
      mutationDeadlineRef.current = null;
      hotelsAbortRef.current?.abort();
      reportAbortRef.current?.abort();
      detailsAbortRef.current?.abort();
      closestAbortRef.current?.abort();
      mutationAbortRef.current?.abort();
      reportInFlightRef.current = false;
      closestInFlightRef.current = false;
      mutationLockRef.current = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
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
    let deadlineReached = false;
    setHotelsLoaded(false);
    hotelsAbortRef.current?.abort();
    if (hotelsDeadlineRef.current) clearTimeout(hotelsDeadlineRef.current);
    const controller = new AbortController();
    hotelsAbortRef.current = controller;
    const abortRace = createAbortRace(controller);
    const deadlineId = setTimeout(() => {
      if (hotelsAbortRef.current !== controller || controller.signal.aborted)
        return;
      deadlineReached = true;
      controller.abort();
    }, HOTEL_BOOTSTRAP_DEADLINE_MS);
    hotelsDeadlineRef.current = deadlineId;

    (async () => {
      try {
        const payload = await Promise.race([
          gettingHotelDetailsForAdminAll(user._id, token, "summary=true", {
            signal: controller.signal,
          }),
          abortRace.promise,
        ]);
        if (!active || !mountedRef.current || controller.signal.aborted) return;
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
      } catch (error) {
        if (!active || !mountedRef.current) return;
        if (deadlineReached) message.error(labels.hotelLoadTimeout);
        else if (controller.signal.aborted || error?.name === "AbortError")
          return;
        else message.error(labels.hotelLoadError);
        setHotels([]);
        setHotelId("");
        setHotelsLoaded(true);
      } finally {
        abortRace.dispose();
        if (hotelsDeadlineRef.current === deadlineId) {
          clearTimeout(deadlineId);
          hotelsDeadlineRef.current = null;
        }
        if (hotelsAbortRef.current === controller) {
          hotelsAbortRef.current = null;
        }
      }
    })();
    return () => {
      active = false;
      if (hotelsDeadlineRef.current === deadlineId) {
        clearTimeout(deadlineId);
        hotelsDeadlineRef.current = null;
      }
      if (hotelsAbortRef.current === controller) {
        hotelsAbortRef.current = null;
        controller.abort();
      }
    };
  }, [labels.hotelLoadError, labels.hotelLoadTimeout, token, user?._id]);

  const fetchReport = useCallback(async () => {
    if (!user?._id || !token || !hotelsLoaded || !hotelId || !methods.length)
      return;
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    reportAbortRef.current?.abort();
    if (reportDeadlineRef.current) clearTimeout(reportDeadlineRef.current);
    const controller = new AbortController();
    reportAbortRef.current = controller;
    reportInFlightRef.current = true;
    let deadlineReached = false;
    const abortRace = createAbortRace(controller);
    const deadlineId = setTimeout(() => {
      if (reportAbortRef.current !== controller || controller.signal.aborted)
        return;
      deadlineReached = true;
      controller.abort();
    }, REPORT_REQUEST_DEADLINE_MS);
    reportDeadlineRef.current = deadlineId;
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
      const expectedFilters = {
        paymentBreakdownKeys: methods,
        reconciliationStatus: status,
      };
      const firstPayload = await Promise.race([
        getReconciliationReportAdmin(
          user._id,
          token,
          { ...filters, page: 1 },
          { signal: controller.signal },
        ),
        abortRace.promise,
      ]);
      if (!mountedRef.current || requestId !== requestSequence.current) return;
      const firstPage = validateReconciliationReportPage(
        firstPayload,
        1,
        null,
        expectedFilters,
      );
      const pages = [firstPage.data];
      for (let page = 2; page <= firstPage.totalPages; page += 1) {
        const payload = await Promise.race([
          getReconciliationReportAdmin(
            user._id,
            token,
            { ...filters, page, includeScorecards: false },
            { signal: controller.signal },
          ),
          abortRace.promise,
        ]);
        if (!mountedRef.current || requestId !== requestSequence.current)
          return;
        pages.push(
          validateReconciliationReportPage(
            payload,
            page,
            firstPage,
            expectedFilters,
          ).data,
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
      if (controller.signal.aborted && !deadlineReached) return;
      console.error("Failed to load reconciliation report", error);
      message.error(deadlineReached ? labels.reportTimeout : labels.loadError);
      setReservations([]);
      setScorecards(normalizeScorecards({}, [], methods));
      setSelectedIds(new Set());
    } finally {
      abortRace.dispose();
      if (reportDeadlineRef.current === deadlineId) {
        clearTimeout(deadlineId);
        reportDeadlineRef.current = null;
      }
      if (reportAbortRef.current === controller) {
        reportAbortRef.current = null;
        reportInFlightRef.current = false;
      }
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
    labels.reportTimeout,
    methods,
    search,
    status,
    token,
    user?._id,
  ]);

  const cancelActiveReport = useCallback(() => {
    if (reportDeadlineRef.current) {
      clearTimeout(reportDeadlineRef.current);
      reportDeadlineRef.current = null;
    }
    const controller = reportAbortRef.current;
    reportAbortRef.current = null;
    reportInFlightRef.current = false;
    controller?.abort();
  }, []);

  useEffect(() => {
    if (!hotelsLoaded || !hotelId) {
      requestSequence.current += 1;
      cancelActiveReport();
      setReservations([]);
      setSelectedIds(new Set());
      setLoading(false);
      return;
    }
    fetchReport();
    return cancelActiveReport;
  }, [cancelActiveReport, fetchReport, hotelId, hotelsLoaded]);

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

  const miscellaneousRows = useMemo(
    () => miscellaneousProposal?.data || [],
    [miscellaneousProposal],
  );
  const miscellaneousSelectedRows = useMemo(
    () =>
      miscellaneousRows.filter((row) =>
        miscellaneousSelectedIds.has(String(row?._id || "")),
      ),
    [miscellaneousRows, miscellaneousSelectedIds],
  );
  const miscellaneousSelectedAmountCents = useMemo(
    () =>
      miscellaneousSelectedRows.reduce(
        (total, row) =>
          total + paymentAmountCentsForKey(row, miscellaneousCategory),
        0,
      ),
    [miscellaneousCategory, miscellaneousSelectedRows],
  );
  const miscellaneousDifferenceCents = miscellaneousProposal
    ? miscellaneousSelectedAmountCents -
      Number(miscellaneousProposal.targetAmountCents)
    : 0;
  const miscellaneousAllSelected =
    miscellaneousRows.length > 0 &&
    miscellaneousSelectedRows.length === miscellaneousRows.length;
  const miscellaneousPartiallySelected =
    miscellaneousSelectedRows.length > 0 && !miscellaneousAllSelected;
  const miscellaneousSelectionAdjusted =
    Boolean(miscellaneousProposal) && !miscellaneousAllSelected;

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
    cancelActiveReport();
    setMethods(normalized);
  };

  const changeStatus = (nextStatus) => {
    const normalized = normalizeReconciliationStatus(nextStatus);
    if (normalized === status) return;
    requestSequence.current += 1;
    cancelActiveReport();
    setStatus(normalized);
  };

  const applyDateFilter = (nextFilter = {}) => {
    const ranges = normalizeDateRanges(nextFilter.dateRanges);
    requestSequence.current += 1;
    cancelActiveReport();
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
    cancelActiveReport();
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

  const runReconciliationAction = async ({
    action,
    rows,
    category,
    expectedActionAmountCents,
    payoutPurpose = "",
    comment = "",
    attachment = null,
    snapshots = null,
  }) => {
    if (
      mutationLockRef.current ||
      reportInFlightRef.current ||
      updating ||
      loading ||
      !canUpdateReconciliation
    ) {
      return false;
    }
    if (!Array.isArray(rows) || !rows.length) {
      message.info(labels.noEligibleRows);
      return false;
    }
    if (rows.length > MAX_MUTATION_RESERVATIONS) {
      message.error(labels.tooManySelected);
      return false;
    }
    const assertions = Array.isArray(snapshots)
      ? snapshots
      : buildReconciliationMutationReservations(rows, [category]);
    const invalidAssertion = assertions.some(
      (item) =>
        !item.reservationId ||
        !Number.isSafeInteger(item.__v) ||
        !item.updatedAt ||
        !Number.isSafeInteger(item?.displayedAmountsCents?.[category]),
    );
    if (
      assertions.length !== rows.length ||
      invalidAssertion ||
      !Number.isSafeInteger(expectedActionAmountCents) ||
      expectedActionAmountCents < 0
    ) {
      message.error(labels.conflict);
      await fetchReport();
      return false;
    }

    const controller = new AbortController();
    mutationAbortRef.current = controller;
    mutationLockRef.current = true;
    let deadlineReached = false;
    const abortRace = createAbortRace(controller);
    const deadlineId = setTimeout(() => {
      if (mutationAbortRef.current !== controller || controller.signal.aborted)
        return;
      deadlineReached = true;
      controller.abort();
    }, MUTATION_REQUEST_DEADLINE_MS);
    mutationDeadlineRef.current = deadlineId;
    setUpdating(true);
    let successful = false;
    try {
      let payload;
      try {
        payload = await Promise.race([
          updateReconciliationStatusAdmin(
            user._id,
            token,
            {
              hotelId,
              action,
              paymentBreakdownKeys: [category],
              expectedActionAmountCents,
              reservations: assertions,
              ...(action === "reconcile"
                ? { payoutPurpose, comment: String(comment || "").trim() }
                : {}),
              ...(action === "reconcile" && attachment ? { attachment } : {}),
            },
            { signal: controller.signal },
          ),
          abortRace.promise,
        ]);
      } finally {
        abortRace.dispose();
        if (mutationDeadlineRef.current === deadlineId) {
          clearTimeout(deadlineId);
          mutationDeadlineRef.current = null;
        }
      }
      if (controller.signal.aborted || !mountedRef.current) return false;
      validateReconciliationMutationSuccess({
        payload,
        action,
        category,
        expectedActionAmountCents,
        reservations: assertions,
      });
      const updatedCount = payload.updatedCount;
      message.success(
        action === "reset" && rows.length === 1
          ? labels.resetDone
          : labels.updated(updatedCount),
      );
      successful = true;
    } catch (error) {
      if (deadlineReached) {
        if (mountedRef.current) message.error(labels.mutationTimeout);
        return false;
      }
      if (controller.signal.aborted || error?.name === "AbortError")
        return false;
      console.error("Failed to update reconciliation", error);
      if (error?.status === 409 || error?.payload?.conflicts?.length) {
        message.warning(labels.conflict);
      } else if (error?.code === "invalid_mutation_response") {
        message.error(labels.invalidMutationResponse);
      } else {
        message.error(labels.updateError);
      }
    } finally {
      abortRace.dispose();
      if (mutationDeadlineRef.current === deadlineId) {
        clearTimeout(deadlineId);
        mutationDeadlineRef.current = null;
      }
      if (mutationAbortRef.current === controller) {
        mutationAbortRef.current = null;
        mutationLockRef.current = false;
      }
      if (mountedRef.current) {
        setUpdating(false);
        setSelectedIds(new Set());
        void fetchReport();
      }
    }
    return successful;
  };

  const openActionModal = (action) => {
    if (!selectedRows.length) {
      message.info(labels.selectRowsFirst);
      return;
    }
    if (selectedRows.length > MAX_MUTATION_RESERVATIONS) {
      message.error(labels.tooManySelected);
      return;
    }
    setActionCategory(methods[0] || DEFAULT_PAYMENT_METHOD);
    setActionPurpose("");
    setActionComment("");
    setActionAttachment(null);
    if (reconcileFileInputRef.current) reconcileFileInputRef.current.value = "";
    setActionModal(action);
  };

  const closeActionModal = () => {
    if (mutationLockRef.current || updating) return;
    setActionModal(null);
    setActionAttachment(null);
    if (reconcileFileInputRef.current) reconcileFileInputRef.current.value = "";
  };

  const actionEligibleRows = useMemo(
    () =>
      actionModal
        ? actionRowsForCategory(selectedRows, actionCategory, actionModal)
        : [],
    [actionCategory, actionModal, selectedRows],
  );
  const actionExpectedAmountCents = useMemo(
    () => actionAmountCentsForRows(actionEligibleRows, actionCategory),
    [actionCategory, actionEligibleRows],
  );

  const confirmBulkAction = async () => {
    if (!actionModal || updating || loading || reportInFlightRef.current) {
      return;
    }
    if (!actionEligibleRows.length) {
      message.info(labels.noEligibleRows);
      return;
    }
    if (actionEligibleRows.length > MAX_MUTATION_RESERVATIONS) {
      message.error(labels.tooManySelected);
      return;
    }
    if (
      actionModal === "reconcile" &&
      !PAYOUT_PURPOSES.includes(actionPurpose)
    ) {
      message.error(labels.choosePurpose);
      return;
    }
    if (actionComment.trim().length > MAX_COMMENT_LENGTH) {
      message.error(labels.commentTooLong);
      return;
    }
    if (actionAttachment && !safeAttachment(actionAttachment)) {
      message.error(labels.invalidAttachment);
      return;
    }
    const successful = await runReconciliationAction({
      action: actionModal,
      rows: actionEligibleRows,
      category: actionCategory,
      expectedActionAmountCents: actionExpectedAmountCents,
      payoutPurpose: actionPurpose,
      comment: actionComment,
      attachment: actionAttachment,
    });
    if (successful && mountedRef.current) closeActionModal();
  };

  const resettableCategoriesForRow = (reservation) => {
    const visibleFirst = [
      ...methods,
      ...PAYMENT_BREAKDOWN_KEYS.filter((key) => !methods.includes(key)),
    ];
    return visibleFirst.filter((key) =>
      hasStoredReconciliationEntry(reservation, key),
    );
  };

  const openRowReset = (reservation) => {
    const categories = resettableCategoriesForRow(reservation);
    if (!categories.length || updating) return;
    setResetTarget(reservation);
    setResetCategory(categories[0]);
  };

  const closeRowReset = () => {
    if (mutationLockRef.current || updating) return;
    setResetTarget(null);
    setResetCategory("");
  };

  const confirmRowReset = async () => {
    if (
      !resetTarget ||
      !resetCategory ||
      updating ||
      loading ||
      reportInFlightRef.current
    ) {
      return;
    }
    const amountCents = paymentAmountCentsForKey(resetTarget, resetCategory);
    const successful = await runReconciliationAction({
      action: "reset",
      rows: [resetTarget],
      category: resetCategory,
      expectedActionAmountCents: amountCents,
    });
    if (successful && mountedRef.current) closeRowReset();
    else if (mountedRef.current) {
      setResetTarget(null);
      setResetCategory("");
    }
  };

  const openReservationDetails = (reservation) => {
    const reservationId = String(reservation?._id || "").trim();
    if (!reservationId || !token) return;
    detailsAbortRef.current?.abort();
    const controller = new AbortController();
    detailsAbortRef.current = controller;
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError("");
    setDetailsReservation(null);
    getAdminReservationById(reservationId, token, { signal: controller.signal })
      .then((fullReservation) => {
        if (
          controller.signal.aborted ||
          !mountedRef.current ||
          !fullReservation?._id ||
          String(fullReservation._id) !== reservationId ||
          fullReservation?.error
        ) {
          if (!controller.signal.aborted)
            throw new Error("Invalid reservation");
          return;
        }
        setDetailsReservation(fullReservation);
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === "AbortError") return;
        setDetailsError(labels.detailsLoadError);
        message.error(labels.detailsLoadError);
      })
      .finally(() => {
        if (!controller.signal.aborted && mountedRef.current) {
          setDetailsLoading(false);
        }
      });
  };

  const closeReservationDetails = () => {
    detailsAbortRef.current?.abort();
    detailsAbortRef.current = null;
    setDetailsOpen(false);
    setDetailsLoading(false);
    setDetailsError("");
    setDetailsReservation(null);
    if (hotelId) fetchReport();
  };

  const handleReservationUpdated = (updatedReservation) => {
    if (updatedReservation?._id) setDetailsReservation(updatedReservation);
    if (hotelId) fetchReport();
  };

  const dateScopeLabel = useMemo(() => {
    const ranges = normalizeDateRanges(dateFilter.dateRanges);
    const displayRanges = ranges.length
      ? ranges
      : dateFilter.dateFrom || dateFilter.dateTo
        ? [{ dateFrom: dateFilter.dateFrom, dateTo: dateFilter.dateTo }]
        : [];
    if (!displayRanges.length) return labels.allDates;
    return displayRanges
      .map((range) => {
        const from = formatReportDate(
          range.dateFrom,
          isArabic,
          range.dateFrom || labels.allDates,
        );
        const to = formatReportDate(
          range.dateTo,
          isArabic,
          range.dateTo || labels.allDates,
        );
        return `${from} ${labels.dateScopeJoin} ${to}`;
      })
      .join("; ");
  }, [
    dateFilter.dateFrom,
    dateFilter.dateRanges,
    dateFilter.dateTo,
    isArabic,
    labels,
  ]);
  const selectedDateFieldLabel =
    dateFilter.dateBy === "checkout_date"
      ? labels.checkout
      : dateFilter.dateBy === "createdAt"
        ? labels.createdAt
        : labels.checkin;

  const resetMiscellaneousForm = () => {
    setMiscellaneousCategory(methods[0] || DEFAULT_PAYMENT_METHOD);
    setMiscellaneousTarget("");
    setMiscellaneousPurpose("");
    setMiscellaneousComment("");
    setMiscellaneousAttachment(null);
    setMiscellaneousProposal(null);
    setMiscellaneousSelectedIds(new Set());
    if (miscellaneousFileInputRef.current) {
      miscellaneousFileInputRef.current.value = "";
    }
  };

  const openMiscellaneous = () => {
    resetMiscellaneousForm();
    setMiscellaneousOpen(true);
  };

  const closeMiscellaneous = () => {
    if (
      mutationLockRef.current ||
      closestInFlightRef.current ||
      updating ||
      findingClosest
    ) {
      return;
    }
    closestRequestSequence.current += 1;
    if (closestDeadlineRef.current) {
      clearTimeout(closestDeadlineRef.current);
      closestDeadlineRef.current = null;
    }
    closestAbortRef.current?.abort();
    closestAbortRef.current = null;
    closestInFlightRef.current = false;
    setFindingClosest(false);
    setMiscellaneousOpen(false);
    resetMiscellaneousForm();
  };

  const invalidateMiscellaneousProposal = () => {
    closestRequestSequence.current += 1;
    if (closestDeadlineRef.current) {
      clearTimeout(closestDeadlineRef.current);
      closestDeadlineRef.current = null;
    }
    closestAbortRef.current?.abort();
    closestAbortRef.current = null;
    closestInFlightRef.current = false;
    setFindingClosest(false);
    setMiscellaneousProposal(null);
    setMiscellaneousSelectedIds(new Set());
  };

  const toggleAllMiscellaneousRows = (checked) => {
    setMiscellaneousSelectedIds(
      checked
        ? new Set(miscellaneousRows.map((row) => String(row?._id || "")))
        : new Set(),
    );
  };

  const toggleMiscellaneousRow = (reservationId, checked) => {
    setMiscellaneousSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(String(reservationId));
      else next.delete(String(reservationId));
      return next;
    });
  };

  const findClosestReservations = async () => {
    if (
      closestInFlightRef.current ||
      findingClosest ||
      updating ||
      loading ||
      reportInFlightRef.current
    ) {
      return;
    }
    const targetAmountCents = parsePositiveSarCents(miscellaneousTarget);
    if (targetAmountCents === null) {
      message.error(labels.invalidTarget);
      return;
    }
    if (miscellaneousComment.trim().length > MAX_COMMENT_LENGTH) {
      message.error(labels.commentTooLong);
      return;
    }
    if (miscellaneousAttachment && !safeAttachment(miscellaneousAttachment)) {
      message.error(labels.invalidAttachment);
      return;
    }
    const requestId = closestRequestSequence.current + 1;
    closestRequestSequence.current = requestId;
    if (closestDeadlineRef.current) clearTimeout(closestDeadlineRef.current);
    closestAbortRef.current?.abort();
    const controller = new AbortController();
    closestAbortRef.current = controller;
    closestInFlightRef.current = true;
    let deadlineReached = false;
    const abortRace = createAbortRace(controller);
    const deadlineId = setTimeout(() => {
      if (closestAbortRef.current !== controller || controller.signal.aborted)
        return;
      deadlineReached = true;
      controller.abort();
    }, CLOSEST_REQUEST_DEADLINE_MS);
    closestDeadlineRef.current = deadlineId;
    setFindingClosest(true);
    setMiscellaneousProposal(null);
    try {
      const proposal = await Promise.race([
        getReconciliationClosestMatchAdmin(
          user._id,
          token,
          {
            hotelId,
            paymentBreakdownKey: miscellaneousCategory,
            targetAmountCents,
            dateBy: dateFilter.dateBy,
            dateFrom: dateFilter.dateFrom,
            dateTo: dateFilter.dateTo,
            dateRanges: normalizeDateRanges(dateFilter.dateRanges),
            searchQuery: search,
          },
          { signal: controller.signal },
        ),
        abortRace.promise,
      ]);
      if (
        controller.signal.aborted ||
        !mountedRef.current ||
        requestId !== closestRequestSequence.current
      ) {
        return;
      }
      const validatedProposal = validateClosestMatchProposal({
        proposal,
        hotelId,
        category: miscellaneousCategory,
        targetAmountCents,
      });
      if (!validatedProposal.selectedCount) {
        message.info(labels.noProposal);
        return;
      }
      setMiscellaneousProposal(validatedProposal);
      setMiscellaneousSelectedIds(
        new Set(validatedProposal.data.map((row) => String(row?._id || ""))),
      );
    } catch (error) {
      if (deadlineReached) {
        if (mountedRef.current) message.error(labels.closestTimeout);
      } else if (controller.signal.aborted || error?.name === "AbortError") {
        return;
      } else {
        console.error("Failed to find closest reconciliation match", error);
        const errorCode = error?.payload?.code || error?.code;
        const labelKey = CLOSEST_ERROR_LABELS[errorCode];
        message.error(
          errorCode === "invalid_closest_proposal"
            ? labels.invalidProposal
            : labelKey
              ? labels[labelKey]
              : labels.miscellaneousError,
        );
        if (
          errorCode === "invalid_closest_proposal" ||
          errorCode === "closest_match_candidates_changed"
        ) {
          void fetchReport();
        }
      }
    } finally {
      abortRace.dispose();
      if (closestDeadlineRef.current === deadlineId) {
        clearTimeout(deadlineId);
        closestDeadlineRef.current = null;
      }
      if (mountedRef.current && requestId === closestRequestSequence.current) {
        setFindingClosest(false);
      }
      if (closestAbortRef.current === controller) {
        closestAbortRef.current = null;
        closestInFlightRef.current = false;
      }
    }
  };

  const confirmMiscellaneousProposal = async () => {
    if (
      !miscellaneousProposal ||
      updating ||
      loading ||
      reportInFlightRef.current
    ) {
      return;
    }
    if (!PAYOUT_PURPOSES.includes(miscellaneousPurpose)) {
      message.error(labels.choosePurpose);
      return;
    }
    if (!miscellaneousSelectedRows.length) {
      message.error(labels.selectRowsFirst);
      return;
    }
    if (miscellaneousComment.trim().length > MAX_COMMENT_LENGTH) {
      message.error(labels.commentTooLong);
      return;
    }
    if (miscellaneousAttachment && !safeAttachment(miscellaneousAttachment)) {
      message.error(labels.invalidAttachment);
      return;
    }
    const snapshotsById = new Map(
      miscellaneousProposal.reservations.map((snapshot) => [
        String(snapshot?.reservationId || ""),
        snapshot,
      ]),
    );
    const successful = await runReconciliationAction({
      action: "reconcile",
      rows: miscellaneousSelectedRows,
      category: miscellaneousCategory,
      expectedActionAmountCents: miscellaneousSelectedAmountCents,
      payoutPurpose: miscellaneousPurpose,
      comment: miscellaneousComment,
      attachment: miscellaneousAttachment,
      snapshots: miscellaneousSelectedRows.map((row) =>
        snapshotsById.get(String(row?._id || "")),
      ),
    });
    if (successful && mountedRef.current) closeMiscellaneous();
    else if (mountedRef.current) setMiscellaneousProposal(null);
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
    try {
      const dynamicHeaders = methods.map(
        (key) => PAYMENT_METHOD_LABELS[key]?.[isArabic ? "ar" : "en"] || key,
      );
      const headers = [
        labels.index,
        labels.customer,
        labels.confirmation,
        labels.checkin,
        labels.checkout,
        labels.source,
        labels.bookingStatus,
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
        const summary = summarizeReservationReconciliation(
          reservation,
          methods,
        );
        return [
          index + 1,
          reservationName(reservation),
          reservation?.confirmation_number || "",
          formatReportDate(
            reservation?.checkin_date,
            isArabic,
            labels.unavailable,
          ),
          formatReportDate(
            reservation?.checkout_date,
            isArabic,
            labels.unavailable,
          ),
          reservation?.booking_source || "",
          reservationStatusText(reservation, isArabic, labels.unavailable),
          reservationNights(reservation),
          rooms.roomNumberText,
          ota.available ? ota.amount : labels.unavailable,
          pricing.available ? pricing.amount : labels.unavailable,
          ...methods.map((key) => amountForPaymentKey(reservation, key)),
          summary.status === "mixed"
            ? labels.mixed
            : summary.status === RECONCILIATION_STATUSES.RECONCILED
              ? labels.reconciled
              : labels.waiting,
        ];
      });
      const totalRow = Array(headers.length).fill("");
      totalRow[1] = labels.exportTotal;
      methods.forEach((key, methodIndex) => {
        totalRow[11 + methodIndex] =
          reservations.reduce(
            (total, reservation) =>
              total + paymentAmountCentsForKey(reservation, key),
            0,
          ) / 100;
      });
      const filterDescription = `${labels.status}: ${labels[status]}; ${
        labels.methods
      }: ${methods
        .map(
          (key) => PAYMENT_METHOD_LABELS[key]?.[isArabic ? "ar" : "en"] || key,
        )
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
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
      ];
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
        for (let column = 9; column < 11 + methods.length; column += 1) {
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
    } catch (error) {
      console.error("Failed to export reconciliation workbook", error);
      message.error(labels.exportFailed);
    }
  };

  const exportMiscellaneousExcel = async () => {
    if (!miscellaneousRows.length) {
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
      console.error("Failed to load proposal Excel exporter", error);
      message.error(labels.exportFailed);
      return;
    }
    try {
      const headers = [
        labels.includedInReconciliation,
        labels.index,
        labels.customer,
        labels.confirmation,
        labels.bookingStatus,
        labels.checkin,
        labels.checkout,
        labels.source,
        labels.nights,
        labels.roomNumber,
        PAYMENT_METHOD_LABELS[miscellaneousCategory]?.[
          isArabic ? "ar" : "en"
        ] || miscellaneousCategory,
      ];
      const dataRows = miscellaneousRows.map((reservation, index) => {
        const id = String(reservation?._id || "");
        const room = getReservationRoomSummary(reservation);
        return [
          miscellaneousSelectedIds.has(id) ? labels.yes : labels.no,
          index + 1,
          reservationName(reservation),
          reservation?.confirmation_number || "",
          reservationStatusText(reservation, isArabic, labels.unavailable),
          formatReportDate(
            reservation?.checkin_date,
            isArabic,
            labels.unavailable,
          ),
          formatReportDate(
            reservation?.checkout_date,
            isArabic,
            labels.unavailable,
          ),
          reservation?.booking_source || "",
          reservationNights(reservation),
          room.roomNumberText,
          amountForPaymentKey(reservation, miscellaneousCategory),
        ];
      });
      const totalRow = Array(headers.length).fill("");
      totalRow[2] = labels.selectedAmount;
      totalRow[headers.length - 1] = miscellaneousSelectedAmountCents / 100;
      const rows = [
        [labels.proposalExportTitle],
        [`${labels.hotel}: ${selectedHotelName}`],
        [
          `${labels.targetAmount}: ${moneyText(
            Number(miscellaneousProposal?.targetAmountCents || 0),
          )} ${labels.currency}`,
        ],
        [
          `${labels.selectedAmount}: ${moneyText(
            miscellaneousSelectedAmountCents,
          )} ${labels.currency}`,
        ],
        [],
        headers,
        ...dataRows,
        totalRow,
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const lastColumn = headers.length - 1;
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
      ];
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
      if (worksheet.A1) {
        worksheet.A1.s = {
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
          };
        }
      }
      const totalRowIndex = rows.length - 1;
      for (let column = 0; column <= lastColumn; column += 1) {
        const address = XLSX.utils.encode_cell({
          r: totalRowIndex,
          c: column,
        });
        if (worksheet[address]) {
          worksheet[address].s = {
            font: { bold: true, color: { rgb: "17324D" } },
            fill: { fgColor: { rgb: "E8F2F8" } },
          };
        }
      }
      for (let row = 6; row < 6 + dataRows.length; row += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: lastColumn });
        if (worksheet[address] && typeof worksheet[address].v === "number") {
          worksheet[address].z = "#,##0.00";
        }
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Proposal");
      const hotelSegment =
        String(selectedHotelName || "hotel")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "hotel";
      XLSX.writeFile(
        workbook,
        `reconciliation-proposal-${hotelSegment}-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`,
      );
      message.success(labels.proposalExportDone);
    } catch (error) {
      console.error("Failed to export reconciliation proposal workbook", error);
      message.error(labels.exportFailed);
    }
  };

  const methodOptions = PAYMENT_BREAKDOWN_KEYS.map((key) => ({
    value: key,
    label: bilingualPaymentMethodLabel(key, isArabic),
  }));
  const purposeOptions = PAYOUT_PURPOSES.map((purpose) => ({
    value: purpose,
    label: bilingualPurposeLabel(purpose, isArabic),
  }));
  const resetCategoryOptions = resetTarget
    ? resettableCategoriesForRow(resetTarget).map((key) => ({
        value: key,
        label: bilingualPaymentMethodLabel(key, isArabic),
      }))
    : [];
  const resetAmountCents = resetTarget
    ? paymentAmountCentsForKey(resetTarget, resetCategory)
    : 0;

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
            <FilterScorecard
              type="button"
              $tone="total"
              $active={status === RECONCILIATION_STATUSES.ALL}
              aria-pressed={status === RECONCILIATION_STATUSES.ALL}
              onClick={() => changeStatus(RECONCILIATION_STATUSES.ALL)}
              disabled={updating}
            >
              <span>{labels.total}</span>
              <strong>{moneyText(scorecards.totalAmountCents)}</strong>
              <small>
                {scorecards.reservationsCount.toLocaleString("en-US")}{" "}
                {labels.totalCount}
              </small>
            </FilterScorecard>
            <FilterScorecard
              type="button"
              $tone="reconciled"
              $active={status === RECONCILIATION_STATUSES.RECONCILED}
              aria-pressed={status === RECONCILIATION_STATUSES.RECONCILED}
              onClick={() => changeStatus(RECONCILIATION_STATUSES.RECONCILED)}
              disabled={updating}
            >
              <span>{labels.reconciledTotal}</span>
              <strong>{moneyText(scorecards.reconciledAmountCents)}</strong>
              <small>
                {scorecards.reconciledReservationsCount.toLocaleString("en-US")}
              </small>
            </FilterScorecard>
            <FilterScorecard
              type="button"
              $tone="waiting"
              $active={status === RECONCILIATION_STATUSES.WAITING}
              aria-pressed={status === RECONCILIATION_STATUSES.WAITING}
              onClick={() => changeStatus(RECONCILIATION_STATUSES.WAITING)}
              disabled={updating}
            >
              <span>{labels.waitingTotal}</span>
              <strong>{moneyText(scorecards.waitingAmountCents)}</strong>
              <small>
                {scorecards.waitingReservationsCount.toLocaleString("en-US")}
              </small>
            </FilterScorecard>
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
              onClick={() => openActionModal("reconcile")}
            >
              {labels.markReconciled}
            </Button>
            <Button
              className="miscellaneous-action"
              disabled={!canUpdateReconciliation || updating || !hotelId}
              onClick={openMiscellaneous}
            >
              {labels.miscellaneous}
            </Button>
            <Button
              className="waiting-action"
              icon={<ClockCircleOutlined />}
              disabled={
                !canUpdateReconciliation || !selectedRows.length || updating
              }
              onClick={() => openActionModal("reset")}
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
              <ReportTable $isArabic={isArabic} $methodCount={methods.length}>
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
                    <th className="index-cell">{labels.index}</th>
                    <th className="customer-cell">{labels.customer}</th>
                    <th className="confirmation-cell">{labels.confirmation}</th>
                    <th>{labels.checkin}</th>
                    <th>{labels.checkout}</th>
                    <th>{labels.source}</th>
                    <th>{labels.bookingStatus}</th>
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
                    <th className="actions-cell">{labels.actions}</th>
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
                    const resettableCategories =
                      resettableCategoriesForRow(reservation);
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
                        <td className="index-cell">{index + 1}</td>
                        <td className="customer-cell">
                          <CellText title={reservationName(reservation)}>
                            {reservationName(reservation) || labels.unavailable}
                          </CellText>
                        </td>
                        <td className="confirmation-cell">
                          <CellText title={reservation?.confirmation_number}>
                            {reservation?.confirmation_number ||
                              labels.unavailable}
                          </CellText>
                        </td>
                        <td className="date-cell">
                          {formatReportDate(
                            reservation?.checkin_date,
                            isArabic,
                            labels.unavailable,
                          )}
                        </td>
                        <td className="date-cell">
                          {formatReportDate(
                            reservation?.checkout_date,
                            isArabic,
                            labels.unavailable,
                          )}
                        </td>
                        <td>
                          <CellText title={reservation?.booking_source}>
                            {reservation?.booking_source || labels.unavailable}
                          </CellText>
                        </td>
                        <td>
                          <BookingStatusPill>
                            {reservationStatusText(
                              reservation,
                              isArabic,
                              labels.unavailable,
                            )}
                          </BookingStatusPill>
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
                              : summary.status === "mixed"
                                ? labels.mixed
                                : labels.waiting}
                          </StatusPill>
                        </td>
                        <td className="actions-cell">
                          <RowActions>
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() =>
                                openReservationDetails(reservation)
                              }
                              disabled={updating}
                            >
                              {labels.details}
                            </Button>
                            <Button
                              size="small"
                              className="reset-row-action"
                              icon={<UndoOutlined />}
                              onClick={() => openRowReset(reservation)}
                              disabled={
                                !canUpdateReconciliation ||
                                updating ||
                                !resettableCategories.length
                              }
                            >
                              {labels.reset}
                            </Button>
                          </RowActions>
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

      <Modal
        open={Boolean(actionModal)}
        title={
          actionModal === "reset" ? labels.markWaiting : labels.reconcileTitle
        }
        onCancel={closeActionModal}
        footer={null}
        width={680}
        destroyOnClose
        maskClosable={!updating}
        closable={!updating}
        keyboard={!updating}
      >
        {actionModal ? (
          <ModalForm>
            <ModalIntro>
              {actionModal === "reset"
                ? labels.resetDescription
                : labels.reconcileIntro}
            </ModalIntro>
            <FieldGroup>
              <label htmlFor="bulk-reconciliation-category">
                {labels.category}
              </label>
              <Select
                id="bulk-reconciliation-category"
                aria-label={labels.category}
                value={actionCategory}
                options={methodOptions}
                optionFilterProp="label"
                showSearch
                disabled={updating}
                onChange={setActionCategory}
              />
            </FieldGroup>
            <ConfirmationSummary>
              <div>
                <span>{labels.amountToReconcile}</span>
                <strong>
                  {moneyText(actionExpectedAmountCents)} {labels.currency}
                </strong>
              </div>
              <div>
                <span>{labels.eligibleReservations}</span>
                <strong>
                  {actionEligibleRows.length.toLocaleString("en-US")}
                </strong>
              </div>
            </ConfirmationSummary>
            {selectedRows.length > actionEligibleRows.length ? (
              <SkippedNotice role="status">
                {(
                  selectedRows.length - actionEligibleRows.length
                ).toLocaleString("en-US")}{" "}
                {labels.skippedReservations}
              </SkippedNotice>
            ) : null}
            {actionModal === "reconcile" ? (
              <>
                <FieldGroup>
                  <label htmlFor="bulk-reconciliation-purpose">
                    {labels.payoutPurpose} *
                  </label>
                  <Select
                    id="bulk-reconciliation-purpose"
                    aria-label={labels.payoutPurpose}
                    value={actionPurpose || undefined}
                    options={purposeOptions}
                    optionFilterProp="label"
                    placeholder={labels.payoutPurpose}
                    disabled={updating}
                    onChange={setActionPurpose}
                  />
                </FieldGroup>
                <FieldGroup>
                  <label htmlFor="bulk-reconciliation-comment">
                    {labels.comment}
                  </label>
                  <textarea
                    id="bulk-reconciliation-comment"
                    aria-label={labels.comment}
                    value={actionComment}
                    maxLength={MAX_COMMENT_LENGTH}
                    placeholder={labels.commentPlaceholder}
                    disabled={updating}
                    onChange={(event) => setActionComment(event.target.value)}
                  />
                  <FieldHint>
                    {actionComment.length}/{MAX_COMMENT_LENGTH}
                  </FieldHint>
                </FieldGroup>
                <AttachmentField>
                  <label htmlFor="bulk-reconciliation-attachment">
                    {labels.attachment}
                  </label>
                  <HiddenFileInput
                    ref={reconcileFileInputRef}
                    id="bulk-reconciliation-attachment"
                    aria-label={labels.attachment}
                    type="file"
                    tabIndex={-1}
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    disabled={updating}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      if (file && !safeAttachment(file)) {
                        message.error(labels.invalidAttachment);
                        event.target.value = "";
                        setActionAttachment(null);
                        return;
                      }
                      setActionAttachment(file);
                    }}
                  />
                  <FilePickerButton
                    type="button"
                    aria-controls="bulk-reconciliation-attachment"
                    disabled={updating}
                    onClick={() => reconcileFileInputRef.current?.click()}
                  >
                    {labels.chooseFile}
                  </FilePickerButton>
                  <FieldHint>{labels.attachmentHint}</FieldHint>
                  {actionAttachment ? (
                    <SelectedFile>
                      <span title={actionAttachment.name}>
                        {actionAttachment.name}
                      </span>
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => {
                          setActionAttachment(null);
                          if (reconcileFileInputRef.current) {
                            reconcileFileInputRef.current.value = "";
                          }
                        }}
                      >
                        {labels.removeFile}
                      </button>
                    </SelectedFile>
                  ) : null}
                </AttachmentField>
              </>
            ) : null}
            <ModalActions>
              <Button onClick={closeActionModal} disabled={updating}>
                {labels.cancel}
              </Button>
              <Button
                type="primary"
                className={
                  actionModal === "reset"
                    ? "reset-confirm"
                    : "reconcile-confirm"
                }
                loading={updating}
                disabled={!actionEligibleRows.length || updating || loading}
                onClick={confirmBulkAction}
              >
                {labels.confirm}
              </Button>
            </ModalActions>
          </ModalForm>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(resetTarget)}
        title={labels.resetTitle}
        onCancel={closeRowReset}
        footer={null}
        width={560}
        destroyOnClose
        maskClosable={!updating}
        closable={!updating}
        keyboard={!updating}
      >
        {resetTarget ? (
          <ModalForm>
            <ModalIntro>{labels.resetDescription}</ModalIntro>
            <FieldGroup>
              <label htmlFor="row-reset-category">{labels.category}</label>
              <Select
                id="row-reset-category"
                aria-label={labels.category}
                value={resetCategory || undefined}
                options={resetCategoryOptions}
                disabled={updating}
                onChange={setResetCategory}
              />
            </FieldGroup>
            <ConfirmationSummary>
              <div>
                <span>{labels.amountToReconcile}</span>
                <strong>
                  {moneyText(resetAmountCents)} {labels.currency}
                </strong>
              </div>
              <div>
                <span>{labels.confirmation}</span>
                <strong>
                  {resetTarget?.confirmation_number || labels.unavailable}
                </strong>
              </div>
            </ConfirmationSummary>
            <ModalActions>
              <Button onClick={closeRowReset} disabled={updating}>
                {labels.cancel}
              </Button>
              <Button
                className="reset-confirm"
                loading={updating}
                disabled={!resetCategory || updating || loading}
                onClick={confirmRowReset}
              >
                {labels.reset}
              </Button>
            </ModalActions>
          </ModalForm>
        ) : null}
      </Modal>

      <Modal
        open={detailsOpen}
        onCancel={closeReservationDetails}
        footer={null}
        width="min(98vw, 1720px)"
        centered
        className="admin-reservation-details-modal reservation-details-modal"
        rootClassName="admin-reservation-details-layer"
        wrapClassName="admin-reservation-details-wrap"
        destroyOnClose
        getContainer={() => document.body}
        zIndex={16000}
        styles={{
          mask: { zIndex: 15999 },
          header: { display: "none" },
          content: { padding: "6px 8px 8px" },
          body: { maxHeight: "92vh", overflowY: "auto", padding: 0 },
        }}
      >
        {detailsLoading ? (
          <DetailsState data-testid="reconciliation-details-loading">
            <Spin size="large" />
          </DetailsState>
        ) : detailsError ? (
          <DetailsState role="alert">{detailsError}</DetailsState>
        ) : detailsReservation ? (
          <MoreDetails
            key={String(detailsReservation?._id || "")}
            selectedReservation={detailsReservation}
            reservation={detailsReservation}
            setReservation={setDetailsReservation}
            hotelDetails={detailsReservation.hotelId}
            onReservationUpdated={handleReservationUpdated}
          />
        ) : null}
      </Modal>

      <Modal
        open={miscellaneousOpen}
        title={labels.miscellaneousTitle}
        onCancel={closeMiscellaneous}
        footer={null}
        width="min(98vw, 1720px)"
        destroyOnClose
        maskClosable={!findingClosest && !updating}
        closable={!findingClosest && !updating}
        keyboard={!findingClosest && !updating}
      >
        <MiscellaneousBody aria-busy={findingClosest || updating || loading}>
          <ModalIntro>{labels.miscellaneousIntro}</ModalIntro>
          <MiscellaneousGrid>
            <FieldGroup>
              <label htmlFor="miscellaneous-category">{labels.category}</label>
              <Select
                id="miscellaneous-category"
                aria-label={labels.category}
                value={miscellaneousCategory}
                options={methodOptions}
                optionFilterProp="label"
                showSearch
                disabled={findingClosest || updating}
                onChange={(value) => {
                  invalidateMiscellaneousProposal();
                  setMiscellaneousCategory(value);
                }}
              />
            </FieldGroup>
            <FieldGroup>
              <label htmlFor="miscellaneous-target">
                {labels.targetAmount}
              </label>
              <Input
                id="miscellaneous-target"
                aria-label={labels.targetAmount}
                inputMode="decimal"
                value={miscellaneousTarget}
                placeholder={labels.targetPlaceholder}
                disabled={findingClosest || updating}
                onChange={(event) => {
                  invalidateMiscellaneousProposal();
                  setMiscellaneousTarget(event.target.value);
                }}
              />
            </FieldGroup>
          </MiscellaneousGrid>
          <ScopeNotice aria-label={labels.selectedScope}>
            <div>
              <span>{labels.scopeHotel}</span>
              <strong>{selectedHotelName || hotelId}</strong>
            </div>
            <div>
              <span>{labels.scopeDateField}</span>
              <strong>{selectedDateFieldLabel}</strong>
            </div>
            <div>
              <span>{labels.scopeRange}</span>
              <strong>{dateScopeLabel}</strong>
            </div>
            <div>
              <span>{labels.scopeSearch}</span>
              <strong>{search || labels.noSearchFilter}</strong>
            </div>
          </ScopeNotice>
          <MiscellaneousGrid>
            <FieldGroup>
              <label htmlFor="miscellaneous-purpose">
                {labels.payoutPurpose} *
              </label>
              <Select
                id="miscellaneous-purpose"
                aria-label={labels.payoutPurpose}
                value={miscellaneousPurpose || undefined}
                options={purposeOptions}
                optionFilterProp="label"
                placeholder={labels.payoutPurpose}
                disabled={findingClosest || updating}
                onChange={setMiscellaneousPurpose}
              />
            </FieldGroup>
            <AttachmentField>
              <label htmlFor="miscellaneous-attachment">
                {labels.attachment}
              </label>
              <HiddenFileInput
                ref={miscellaneousFileInputRef}
                id="miscellaneous-attachment"
                aria-label={labels.attachment}
                type="file"
                tabIndex={-1}
                accept="application/pdf,image/jpeg,image/png,image/webp"
                disabled={findingClosest || updating}
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && !safeAttachment(file)) {
                    message.error(labels.invalidAttachment);
                    event.target.value = "";
                    setMiscellaneousAttachment(null);
                    return;
                  }
                  setMiscellaneousAttachment(file);
                }}
              />
              <FilePickerButton
                type="button"
                aria-controls="miscellaneous-attachment"
                disabled={findingClosest || updating}
                onClick={() => miscellaneousFileInputRef.current?.click()}
              >
                {labels.chooseFile}
              </FilePickerButton>
              <FieldHint>{labels.attachmentHint}</FieldHint>
              {miscellaneousAttachment ? (
                <SelectedFile>
                  <span title={miscellaneousAttachment.name}>
                    {miscellaneousAttachment.name}
                  </span>
                  <button
                    type="button"
                    disabled={findingClosest || updating}
                    onClick={() => {
                      setMiscellaneousAttachment(null);
                      if (miscellaneousFileInputRef.current) {
                        miscellaneousFileInputRef.current.value = "";
                      }
                    }}
                  >
                    {labels.removeFile}
                  </button>
                </SelectedFile>
              ) : null}
            </AttachmentField>
          </MiscellaneousGrid>
          <FieldGroup>
            <label htmlFor="miscellaneous-comment">{labels.comment}</label>
            <textarea
              id="miscellaneous-comment"
              aria-label={labels.comment}
              value={miscellaneousComment}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder={labels.commentPlaceholder}
              disabled={findingClosest || updating}
              onChange={(event) => setMiscellaneousComment(event.target.value)}
            />
            <FieldHint>
              {miscellaneousComment.length}/{MAX_COMMENT_LENGTH}
            </FieldHint>
          </FieldGroup>

          {findingClosest ? (
            <BlockingProgress role="status">
              <Spin size="large" />
              <strong>{labels.findingClosest}</strong>
            </BlockingProgress>
          ) : null}

          {miscellaneousProposal ? (
            <ProposalPanel>
              <ProposalHeading>
                <div>
                  <strong>{labels.proposal}</strong>
                  <span>{labels.previewOnly}</span>
                </div>
                <ProposalHeadingActions>
                  <ProposalBadge $exact={miscellaneousDifferenceCents === 0}>
                    {miscellaneousDifferenceCents === 0
                      ? labels.exactMatch
                      : miscellaneousSelectionAdjusted
                        ? labels.adjustedSelection
                        : miscellaneousProposal.optimalityGuaranteed === true
                          ? labels.closestMatch
                          : labels.approximateMatch}
                  </ProposalBadge>
                  <Button
                    icon={<FileExcelOutlined />}
                    onClick={exportMiscellaneousExcel}
                    disabled={updating}
                  >
                    {labels.proposalExport}
                  </Button>
                </ProposalHeadingActions>
              </ProposalHeading>
              <ProposalMetrics>
                <div>
                  <span>{labels.targetAmount}</span>
                  <strong>
                    {moneyText(Number(miscellaneousProposal.targetAmountCents))}{" "}
                    {labels.currency}
                  </strong>
                </div>
                <div>
                  <span>{labels.matchedAmount}</span>
                  <strong>
                    {moneyText(miscellaneousSelectedAmountCents)}{" "}
                    {labels.currency}
                  </strong>
                </div>
                <div>
                  <span>{labels.difference}</span>
                  <strong>
                    {moneyText(Math.abs(miscellaneousDifferenceCents))}{" "}
                    {labels.currency}
                  </strong>
                  <small>
                    {miscellaneousDifferenceCents > 0
                      ? labels.targetDirectionOver
                      : miscellaneousDifferenceCents < 0
                        ? labels.targetDirectionUnder
                        : labels.targetDirectionExact}
                  </small>
                </div>
                <div>
                  <span>{labels.proposedReservations}</span>
                  <strong>
                    {miscellaneousSelectedRows.length.toLocaleString("en-US")}
                  </strong>
                </div>
                <div>
                  <span>{labels.resolution}</span>
                  <strong>
                    {moneyText(miscellaneousProposal.resolutionCents)}{" "}
                    {labels.currency}
                  </strong>
                </div>
              </ProposalMetrics>
              {miscellaneousProposal.selectionLimitExceeded ? (
                <ProposalWarning role="alert">
                  {labels.selectionLimitWarning}
                </ProposalWarning>
              ) : null}
              <ProposalSelectionHint>
                {labels.proposalSelectionHint}
              </ProposalSelectionHint>
              <ProposalTableFrame>
                <ProposalTable $isArabic={isArabic}>
                  <thead>
                    <tr>
                      <th className="checkbox-cell">
                        <Checkbox
                          aria-label={labels.selectAll}
                          checked={miscellaneousAllSelected}
                          indeterminate={miscellaneousPartiallySelected}
                          disabled={updating}
                          onChange={(event) =>
                            toggleAllMiscellaneousRows(event.target.checked)
                          }
                        />
                      </th>
                      <th>{labels.index}</th>
                      <th>{labels.customer}</th>
                      <th>{labels.confirmation}</th>
                      <th>{labels.bookingStatus}</th>
                      <th>{labels.checkin}</th>
                      <th>{labels.checkout}</th>
                      <th>{labels.source}</th>
                      <th>{labels.roomNumber}</th>
                      <th>{labels.matchedAmount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miscellaneousRows.map((reservation, index) => {
                      const id = String(reservation?._id || "");
                      const room = getReservationRoomSummary(reservation);
                      const selected = miscellaneousSelectedIds.has(id);
                      return (
                        <tr
                          key={id || index}
                          className={selected ? "selected-row" : ""}
                        >
                          <td className="checkbox-cell">
                            <Checkbox
                              aria-label={labels.selectReservation(
                                reservation?.confirmation_number,
                              )}
                              checked={selected}
                              disabled={updating}
                              onChange={(event) =>
                                toggleMiscellaneousRow(id, event.target.checked)
                              }
                            />
                          </td>
                          <td>{index + 1}</td>
                          <td>
                            <CellText title={reservationName(reservation)}>
                              {reservationName(reservation) ||
                                labels.unavailable}
                            </CellText>
                          </td>
                          <td>
                            <CellText title={reservation?.confirmation_number}>
                              {reservation?.confirmation_number ||
                                labels.unavailable}
                            </CellText>
                          </td>
                          <td>
                            <BookingStatusPill>
                              {reservationStatusText(
                                reservation,
                                isArabic,
                                labels.unavailable,
                              )}
                            </BookingStatusPill>
                          </td>
                          <td className="date-cell">
                            {formatReportDate(
                              reservation?.checkin_date,
                              isArabic,
                              labels.unavailable,
                            )}
                          </td>
                          <td className="date-cell">
                            {formatReportDate(
                              reservation?.checkout_date,
                              isArabic,
                              labels.unavailable,
                            )}
                          </td>
                          <td>
                            {reservation?.booking_source || labels.unavailable}
                          </td>
                          <td>{room.roomNumberText || labels.unavailable}</td>
                          <td className="money-cell">
                            {moneyText(
                              paymentAmountCentsForKey(
                                reservation,
                                miscellaneousCategory,
                              ),
                            )}{" "}
                            {labels.currency}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </ProposalTable>
              </ProposalTableFrame>
            </ProposalPanel>
          ) : null}

          <ModalActions>
            <Button
              onClick={closeMiscellaneous}
              disabled={findingClosest || updating}
            >
              {labels.cancel}
            </Button>
            {miscellaneousProposal ? (
              <>
                <Button
                  onClick={() => {
                    setMiscellaneousProposal(null);
                    setMiscellaneousSelectedIds(new Set());
                  }}
                  disabled={updating || loading}
                >
                  {labels.backToAmount}
                </Button>
                <Button
                  type="primary"
                  className="reconcile-confirm"
                  loading={updating}
                  disabled={
                    updating || loading || !miscellaneousSelectedRows.length
                  }
                  onClick={confirmMiscellaneousProposal}
                >
                  {labels.miscConfirm}
                </Button>
              </>
            ) : (
              <Button
                type="primary"
                loading={findingClosest}
                disabled={findingClosest || updating || loading}
                onClick={findClosestReservations}
              >
                {labels.findClosest}
              </Button>
            )}
          </ModalActions>
        </MiscellaneousBody>
      </Modal>
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

const FilterScorecard = styled(Scorecard).attrs({ as: "button" })`
  appearance: none;
  width: 100%;
  text-align: inherit;
  cursor: pointer;
  font-family: inherit;
  outline: none;
  box-shadow: ${({ $active }) =>
    $active ? "0 0 0 3px rgba(14, 100, 140, 0.18)" : "none"};
  transform: ${({ $active }) => ($active ? "translateY(-1px)" : "none")};
  transition:
    box-shadow 0.18s ease,
    transform 0.18s ease;
  &:hover:not(:disabled),
  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(14, 100, 140, 0.18);
    transform: translateY(-1px);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
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
  .miscellaneous-action {
    background: linear-gradient(135deg, #6655a5, #7b61b8);
    border-color: #6655a5;
    color: #fff;
    font-weight: 700;
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
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  border: 1px solid #bdd2df;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(24, 70, 96, 0.11);
`;

const ReportTable = styled.table`
  width: 100%;
  min-width: ${({ $methodCount }) =>
    `${Math.max(1480, 1360 + Number($methodCount || 1) * 120)}px`};
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  th,
  td {
    padding: 10px 9px;
    border-bottom: 1px solid #e4edf2;
    border-inline-end: 1px solid #edf2f5;
    font-size: 12.5px;
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
    white-space: normal;
    overflow-wrap: anywhere;
    min-height: 48px;
    box-shadow: inset 0 -1px rgba(255, 255, 255, 0.16);
  }
  tbody tr {
    transition: background-color 0.16s ease;
  }
  tbody td {
    background: #fff;
  }
  tbody tr:nth-child(even) > td {
    background: #f7fafc;
  }
  tbody tr:hover > td {
    background: #edf7fb;
  }
  tbody tr.selected-row > td {
    background: #dff1f8;
  }
  tbody tr.selected-row > td:first-child {
    box-shadow: inset 4px 0 #0b789f;
  }
  .checkbox-cell {
    width: 44px;
    min-width: 44px;
    text-align: center;
    position: sticky;
    inset-inline-start: 0;
    z-index: 2;
  }
  thead .checkbox-cell {
    z-index: 5;
    background: linear-gradient(180deg, #0e648c, #0a5376);
  }
  .index-cell,
  .customer-cell,
  .confirmation-cell {
    position: sticky;
    z-index: 2;
  }
  .index-cell {
    inset-inline-start: 44px;
    width: 52px;
    text-align: center;
  }
  .customer-cell {
    inset-inline-start: 96px;
    width: 190px;
  }
  .confirmation-cell {
    inset-inline-start: 286px;
    width: 150px;
    font-weight: 750;
    color: #104f70;
  }
  thead .index-cell,
  thead .customer-cell,
  thead .confirmation-cell {
    z-index: 5;
    color: #fff;
    background: linear-gradient(180deg, #0e648c, #0a5376);
  }
  .money-cell {
    text-align: end;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .date-cell {
    width: 104px;
    white-space: normal;
    line-height: 1.35;
  }
  .actions-cell {
    width: 190px;
    position: sticky;
    inset-inline-end: 0;
    z-index: 2;
  }
  thead .actions-cell {
    z-index: 5;
    background: linear-gradient(180deg, #0e648c, #0a5376);
  }
  @media (max-width: 900px) {
    min-width: ${({ $methodCount }) =>
      `${Math.max(1280, 1160 + Number($methodCount || 1) * 110)}px`};
    th,
    td {
      padding: 6px;
      font-size: 11px;
    }
    .index-cell,
    .customer-cell,
    .confirmation-cell,
    .actions-cell {
      position: static;
    }
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
  color: ${({ $status }) =>
    $status === "reconciled"
      ? "#12623d"
      : $status === "mixed"
        ? "#4f3a8a"
        : "#8a5700"};
  background: ${({ $status }) =>
    $status === "reconciled"
      ? "#def5e8"
      : $status === "mixed"
        ? "#eee8ff"
        : "#fff0c9"};
  border: 1px solid
    ${({ $status }) =>
      $status === "reconciled"
        ? "#a9dfbf"
        : $status === "mixed"
          ? "#c9b9ef"
          : "#efd18d"};
`;

const BookingStatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border: 1px solid #c9dbe5;
  border-radius: 999px;
  background: #eef5f8;
  color: #315d73;
  font-weight: 700;
  text-transform: capitalize;
`;

const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  button {
    min-height: 28px;
    padding-inline: 7px;
    font-size: 11px;
  }
  .reset-row-action:not(:disabled) {
    border-color: #d99a2b;
    color: #8a5700;
    background: #fff8e8;
  }
`;

const ModalForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  direction: inherit;
`;

const ModalIntro = styled.p`
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #cfe0eb;
  border-radius: 9px;
  background: #f4f9fc;
  color: #35566e;
  line-height: 1.65;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  > label {
    color: #294b62;
    font-weight: 800;
    font-size: 0.83rem;
  }
  .ant-select,
  .ant-input {
    width: 100%;
  }
  textarea {
    width: 100%;
    min-height: 92px;
    resize: vertical;
    padding: 9px 11px;
    border: 1px solid #d2dde5;
    border-radius: 7px;
    font: inherit;
    color: #17324d;
  }
`;

const FieldHint = styled.small`
  color: #6a7d8a;
  line-height: 1.4;
`;

const ConfirmationSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  > div:first-child {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px;
    border-radius: 10px;
    background: #eef7fb;
    border: 1px solid #c9e0eb;
  }
  span {
    color: #557083;
    font-size: 0.8rem;
    font-weight: 700;
  }
  strong {
    color: #0a678c;
    font-size: 1.12rem;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const ProposalHeadingActions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const SkippedNotice = styled.div`
  padding: 8px 10px;
  border: 1px solid #ead39a;
  border-radius: 8px;
  background: #fff8e8;
  color: #805600;
  font-size: 0.8rem;
  font-weight: 700;
`;

const AttachmentField = styled(FieldGroup)`
  position: relative;
`;

const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const FilePickerButton = styled.button`
  width: fit-content;
  min-height: 36px;
  padding: 7px 14px;
  border: 1px solid #7fa9bd;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #edf6fa);
  color: #155a78;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  &:hover:not(:disabled),
  &:focus-visible {
    border-color: #16799d;
    box-shadow: 0 0 0 3px rgba(22, 121, 157, 0.14);
    outline: none;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const SelectedFile = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 9px;
  border-radius: 7px;
  background: #edf7f1;
  color: #175f42;
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  button {
    border: 0;
    background: transparent;
    color: #a03b32;
    font-weight: 800;
    cursor: pointer;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
  .reconcile-confirm {
    background: #16834d;
    border-color: #16834d;
  }
  .reset-confirm {
    background: #fff7e5;
    border-color: #d99a2b;
    color: #8a5700;
  }
  @media (max-width: 520px) {
    button {
      flex: 1 1 100%;
    }
  }
`;

const DetailsState = styled.div`
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: #5a6f7d;
  font-weight: 700;
`;

const MiscellaneousBody = styled(ModalForm)`
  position: relative;
`;

const MiscellaneousGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const ScopeNotice = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 10px 12px;
  border-inline-start: 4px solid #0d759a;
  border-radius: 8px;
  background: #eef8fc;
  > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  span {
    color: #587283;
    font-size: 0.79rem;
    font-weight: 700;
  }
  strong {
    color: #164d69;
    overflow-wrap: anywhere;
  }
  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const BlockingProgress = styled.div`
  min-height: 170px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 28px;
  border: 1px solid #c9dce7;
  border-radius: 12px;
  background: rgba(245, 250, 253, 0.96);
  color: #31576e;
  text-align: center;
`;

const ProposalPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid #b9d8c5;
  border-radius: 12px;
  background: #f7fcf9;
`;

const ProposalHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  strong {
    color: #1a523a;
    font-size: 1rem;
  }
  span {
    color: #60766a;
    font-size: 0.78rem;
  }
`;

const ProposalBadge = styled.span`
  padding: 5px 10px;
  border-radius: 999px;
  background: ${({ $exact }) => ($exact ? "#dff5e7" : "#fff3d2")};
  color: ${({ $exact }) => ($exact ? "#17613e" : "#875800")};
  border: 1px solid ${({ $exact }) => ($exact ? "#a9ddba" : "#ead08d")};
  font-weight: 800;
`;

const ProposalMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(130px, 1fr));
  gap: 8px;
  > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 9px;
    border: 1px solid #d6e8dd;
    border-radius: 8px;
    background: #fff;
  }
  span,
  small {
    color: #60766a;
    font-size: 0.74rem;
  }
  strong {
    color: #17613e;
  }
  @media (max-width: 780px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ProposalWarning = styled.div`
  padding: 11px 13px;
  border: 1px solid #e0a840;
  border-inline-start: 5px solid #bd7100;
  border-radius: 9px;
  background: #fff5dc;
  color: #754900;
  font-weight: 800;
  line-height: 1.55;
`;

const ProposalSelectionHint = styled.p`
  margin: 0;
  color: #496b5a;
  font-size: 0.82rem;
  font-weight: 700;
`;

const ProposalTableFrame = styled.div`
  width: 100%;
  max-height: 46vh;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  border: 1px solid #bfd8c9;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 7px 18px rgba(31, 91, 58, 0.08);
`;

const ProposalTable = styled.table`
  width: 100%;
  min-width: 1180px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  th,
  td {
    padding: 9px 10px;
    border-bottom: 1px solid #e4eee8;
    border-inline-end: 1px solid #eef4f0;
    font-size: 12px;
    vertical-align: middle;
    text-align: ${({ $isArabic }) => ($isArabic ? "right" : "left")};
    white-space: nowrap;
  }
  th {
    position: sticky;
    top: 0;
    z-index: 3;
    color: #fff;
    background: linear-gradient(180deg, #0e648c, #0a5376);
    white-space: normal;
    line-height: 1.35;
  }
  tbody tr:nth-child(even) td {
    background: #f8fbf9;
  }
  tbody tr:hover td {
    background: #edf8f2;
  }
  tbody tr.selected-row td {
    background: #e1f5e9;
  }
  .checkbox-cell {
    position: sticky;
    inset-inline-start: 0;
    z-index: 2;
    width: 46px;
    text-align: center;
    background: #fff;
  }
  thead .checkbox-cell {
    z-index: 5;
    background: linear-gradient(180deg, #0e648c, #0a5376);
  }
  tbody tr:nth-child(even) .checkbox-cell {
    background: #f8fbf9;
  }
  tbody tr:hover .checkbox-cell {
    background: #edf8f2;
  }
  tbody tr.selected-row .checkbox-cell {
    background: #e1f5e9;
    box-shadow: inset 4px 0 #16834d;
  }
  .date-cell {
    width: 112px;
    white-space: normal;
  }
  .money-cell {
    text-align: end;
    font-variant-numeric: tabular-nums;
    color: #17613e;
    font-weight: 800;
  }
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
