import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, DatePicker, Input, message, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useHistory, useLocation } from "react-router-dom";
import styled, { css } from "styled-components";
import {
	exportOverallPendingReservations,
	exportOverallRejectedReservations,
	getHotelInventoryAvailability,
	getOverallPendingReservations,
	getOverallRejectedReservations,
	updatePendingConfirmationReservation,
} from "../../apiAdmin";
import { isAuthenticated } from "../../../auth";
import {
	ActionButton,
	buildOwnerParams,
	formatDateByCalendar,
	formatMoney,
	getOverallText,
	getReservationNights,
	getReservationPricePerDay,
	isTerminalPendingQueueReservation,
	localizeStatus,
	OVERALL_PAGE_SIZE,
	OverallCenteredSearch,
	OverallPageShell,
	OverallTableWrap,
	OverallToolbar,
	Pager,
	pageRowNumber,
	ReservationTableControls,
	StatusPill,
	statusTone,
	TableTooltipText,
	titleCase,
} from "../overallShared";
import OverallReservationDetailsModal, {
	setReservationIdInQuery,
} from "./OverallReservationDetailsModal";
import { downloadReservationWorkbook } from "./reservationExcelExport";
import PendingReservationInventoryBrief, {
	extractPendingInventoryRows,
	getPendingReservationInventoryRequest,
	PENDING_REVIEW_MODAL_CLASS,
} from "../../NewReservation/PendingReservationInventoryBrief";

const PENDING_RESERVATIONS_TEXT = {
	en: {
		title: "Overall Pending Reservations",
		subtitle: "Pending confirmation and finance-review reservations",
		confirmReservation: "Confirm",
		rejectReservation: "Reject",
		confirmTitle: "Confirm reservation",
		rejectTitle: "Reject reservation",
		confirmQuestion:
			"Confirm reservation #{confirmation} with {days} days / {nights} nights for {amount} SAR?",
		rejectQuestion:
			"Write a clear comment for the agent. The agent can update the reservation unless you cancel it completely.",
		rejectionReasonLabel: "Rejection / cancellation comment",
		rejectionReasonPlaceholder:
			"Example: guest name is missing, dates are not acceptable, room count needs correction...",
		cancelWholeReservation: "Cancel the whole reservation",
		cancelWholeReservationHelp:
			"Use only when the reservation is completely unacceptable. The agent will be notified, but cannot update this reservation.",
		yesConfirm: "Yes, confirm",
		yesReject: "Reject reservation",
		yesCancelReservation: "Cancel reservation",
		cancel: "Cancel",
		rejectionReasonRequired: "Please write a clear reason first.",
		updateSuccess: "Reservation updated.",
		updateError: "Could not update reservation.",
		notAllowedToConfirm: "This account cannot confirm pending reservations.",
		allBookingSources: "All booking sources",
		rejectedTitle: "Rejected Reservations",
		rejectedSubtitle:
			"Rejected reservations from agents, admins, and platform staff that need correction and resubmission.",
		rejectedTotalCard: "Rejected Reservations",
		rejectedTodayCard: "Rejected Today",
		rejectedHotelsCard: "Hotels With Rejections",
		rejectedValueCard: "Rejected Value",
		rejectionReason: "Rejection Reason",
		rejectedCorrectionAction: "Correct / Resubmit",
		rejectedCorrectionHint:
			"Open the reservation details, adjust what was rejected, then save to send it back to Pending Confirmation.",
		noRejectedReservationsFound: "No rejected reservations found.",
	},
	ar: {
		title: "الحجوزات المعلقة العامة",
		subtitle: "حجوزات بانتظار التأكيد أو مراجعة المالية",
		confirmReservation: "تأكيد",
		confirmTitle: "تأكيد الحجز",
		confirmQuestion:
			"هل تريد تأكيد الحجز رقم {confirmation} لمدة {days} أيام / {nights} ليال بقيمة {amount} ر.س؟",
		yesConfirm: "نعم، تأكيد",
		cancel: "إلغاء",
		updateSuccess: "تم تحديث الحجز.",
		updateError: "تعذر تحديث الحجز.",
		notAllowedToConfirm: "هذا الحساب غير مصرح له بتأكيد الحجوزات المعلقة.",
		allBookingSources: "كل مصادر الحجز",
	},
};

const REJECTED_RESERVATIONS_TEXT = {
	en: {
		rejectedTitle: "Rejected Reservations",
		rejectedSubtitle:
			"Rejected reservations from agents, admins, and platform staff that need correction and resubmission.",
		rejectedTotalCard: "Rejected Reservations",
		rejectedTodayCard: "Rejected Today",
		rejectedHotelsCard: "Hotels With Rejections",
		rejectedValueCard: "Rejected Value",
		rejectionReason: "Rejection Reason",
		rejectedCorrectionAction: "Correct / Resubmit",
		rejectedCorrectionHint:
			"Open the reservation details, adjust what was rejected, then save to send it back to Pending Confirmation.",
		noRejectedReservationsFound: "No rejected reservations found.",
	},
	ar: {
		rejectedTitle:
			"\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0631\u0641\u0648\u0636\u0629",
		rejectedSubtitle:
			"\u062d\u062c\u0648\u0632\u0627\u062a \u0645\u0631\u0641\u0648\u0636\u0629 \u0645\u0646 \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0648\u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0648\u0641\u0631\u064a\u0642 \u0627\u0644\u0645\u0646\u0635\u0629 \u0648\u062a\u062d\u062a\u0627\u062c \u062a\u0635\u062d\u064a\u062d\u0627 \u0648\u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644.",
		rejectedTotalCard:
			"\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0631\u0641\u0648\u0636\u0629",
		rejectedTodayCard:
			"\u0645\u0631\u0641\u0648\u0636 \u0627\u0644\u064a\u0648\u0645",
		rejectedHotelsCard:
			"\u0641\u0646\u0627\u062f\u0642 \u0628\u0647\u0627 \u0631\u0641\u0636",
		rejectedValueCard:
			"\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0631\u0641\u0648\u0636",
		rejectionReason: "\u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636",
		rejectedCorrectionAction:
			"\u062a\u0635\u062d\u064a\u062d / \u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644",
		rejectedCorrectionHint:
			"\u0627\u0641\u062a\u062d \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062d\u062c\u0632\u060c \u0639\u062f\u0644 \u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636\u060c \u062b\u0645 \u0627\u062d\u0641\u0638 \u0644\u0625\u0631\u0633\u0627\u0644\u0647 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649 \u0625\u0644\u0649 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0623\u0643\u064a\u062f.",
		noRejectedReservationsFound:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0645\u0631\u0641\u0648\u0636\u0629.",
	},
};

const PENDING_FILTER_TEXT = {
	en: {
		dateByLabel: "Date By",
		creationDate: "Creation Date",
		checkinDate: "Checkin Date",
		checkoutDate: "Checkout Date",
		fromDate: "From date",
		toDate: "To date",
	},
	ar: {
		dateByLabel: "حسب التاريخ",
		creationDate: "تاريخ الإنشاء",
		checkinDate: "تاريخ الوصول",
		checkoutDate: "تاريخ المغادرة",
		fromDate: "من تاريخ",
		toDate: "إلى تاريخ",
	},
};

const PENDING_DECISION_TEXT = {
	en: {
		rejectReservation: "Reject",
		rejectTitle: "Reject reservation",
		rejectQuestion:
			"Write a clear comment for the agent. The agent can update the reservation unless you cancel it completely.",
		rejectionReasonLabel: "Rejection / cancellation comment",
		rejectionReasonPlaceholder:
			"Example: guest name is missing, dates are not acceptable, room count needs correction...",
		cancelWholeReservation: "Cancel the whole reservation",
		cancelWholeReservationHelp:
			"Use only when the reservation is completely unacceptable. The agent will be notified, but cannot update this reservation.",
		yesReject: "Reject reservation",
		yesCancelReservation: "Cancel reservation",
		rejectionReasonRequired: "Please write a clear reason first.",
	},
	ar: {
		rejectReservation: "\u0631\u0641\u0636",
		rejectTitle: "\u0631\u0641\u0636 \u0627\u0644\u062d\u062c\u0632",
		rejectQuestion:
			"\u0627\u0643\u062a\u0628 \u062a\u0639\u0644\u064a\u0642\u0627 \u0648\u0627\u0636\u062d\u0627 \u0644\u0644\u0648\u0643\u064a\u0644. \u064a\u0633\u062a\u0637\u064a\u0639 \u0627\u0644\u0648\u0643\u064a\u0644 \u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062d\u062c\u0632 \u0625\u0644\u0627 \u0625\u0630\u0627 \u062a\u0645 \u0625\u0644\u063a\u0627\u0624\u0647 \u0628\u0627\u0644\u0643\u0627\u0645\u0644.",
		rejectionReasonLabel:
			"\u062a\u0639\u0644\u064a\u0642 \u0627\u0644\u0631\u0641\u0636 / \u0627\u0644\u0625\u0644\u063a\u0627\u0621",
		rejectionReasonPlaceholder:
			"\u0645\u062b\u0627\u0644: \u0627\u0633\u0645 \u0627\u0644\u0636\u064a\u0641 \u063a\u064a\u0631 \u0648\u0627\u0636\u062d\u060c \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u063a\u064a\u0631 \u0645\u0642\u0628\u0648\u0644\u0629\u060c \u0639\u062f\u062f \u0627\u0644\u063a\u0631\u0641 \u064a\u062d\u062a\u0627\u062c \u062a\u0635\u062d\u064a\u062d...",
		cancelWholeReservation:
			"\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062d\u062c\u0632 \u0628\u0627\u0644\u0643\u0627\u0645\u0644",
		cancelWholeReservationHelp:
			"\u0627\u0633\u062a\u062e\u062f\u0645\u0647\u0627 \u0641\u0642\u0637 \u0639\u0646\u062f\u0645\u0627 \u064a\u0643\u0648\u0646 \u0627\u0644\u062d\u062c\u0632 \u063a\u064a\u0631 \u0645\u0642\u0628\u0648\u0644 \u062a\u0645\u0627\u0645\u0627. \u0633\u064a\u0635\u0644 \u0625\u0634\u0639\u0627\u0631 \u0644\u0644\u0648\u0643\u064a\u0644 \u0648\u0644\u0646 \u064a\u0633\u062a\u0637\u064a\u0639 \u062a\u0639\u062f\u064a\u0644 \u0647\u0630\u0627 \u0627\u0644\u062d\u062c\u0632.",
		yesReject: "\u0631\u0641\u0636 \u0627\u0644\u062d\u062c\u0632",
		yesCancelReservation: "\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062d\u062c\u0632",
		rejectionReasonRequired:
			"\u064a\u0631\u062c\u0649 \u0643\u062a\u0627\u0628\u0629 \u0633\u0628\u0628 \u0648\u0627\u0636\u062d \u0623\u0648\u0644\u0627.",
	},
};

const getAccountRoleNumbers = (account = {}) =>
	[
		Number(account?.role),
		...(Array.isArray(account?.roles) ? account.roles.map(Number) : []),
	].filter(Boolean);

const getAccountRoleDescriptions = (account = {}) => [
	String(account?.roleDescription || "").toLowerCase(),
	...(Array.isArray(account?.roleDescriptions)
		? account.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const normalizeRoleKey = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/[\s_-]+/g, "");

const getPendingWorkflowPermissions = (account = {}) => {
	const roles = getAccountRoleNumbers(account);
	const descriptions = getAccountRoleDescriptions(account).map(normalizeRoleKey);
	const isManagerOrAdmin =
		roles.includes(1000) ||
		roles.includes(2000) ||
		roles.includes(10000) ||
		descriptions.includes("systemadmin") ||
		descriptions.includes("system admin") ||
		descriptions.includes("hotelmanager");
	const isFinance =
		roles.includes(6000) || descriptions.includes("finance");
	const isReservationEmployee =
		roles.includes(8000) || descriptions.includes("reservationemployee");
	const canUsePendingWorkflow =
		isManagerOrAdmin || isFinance || isReservationEmployee;
	const financeOnly = isFinance && !isManagerOrAdmin && !isReservationEmployee;

	return {
		canReviewStatus: canUsePendingWorkflow && !financeOnly,
	};
};

const getStayLength = (reservation = {}) => {
	const checkin = reservation.checkin_date
		? new Date(reservation.checkin_date)
		: null;
	const checkout = reservation.checkout_date
		? new Date(reservation.checkout_date)
		: null;
	const nights =
		checkin &&
		checkout &&
		!Number.isNaN(checkin.getTime()) &&
		!Number.isNaN(checkout.getTime())
			? Math.max(
					Math.round(
						(checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24)
					),
					0
			  )
			: Math.max(Number(reservation.days_of_residence || 0), 0);
	return { nights, days: nights + 1 };
};

const sortOptions = (labels) => [
	{ value: "createdAt", label: labels.createdAt },
	{ value: "booking_source", label: labels.source },
	{ value: "hotelName", label: labels.hotel },
	{ value: "checkin_date", label: labels.checkIn },
	{ value: "checkout_date", label: labels.checkOut },
];

const dateByOptions = (labels) => [
	{ value: "createdAt", label: labels.creationDate },
	{ value: "checkin_date", label: labels.checkinDate },
	{ value: "checkout_date", label: labels.checkoutDate },
];

const pendingStatusOptions = (labels) => [
	{ value: "Pending Confirmation", label: labels.pendingConfirmation },
	{ value: "Pending Finance Review", label: labels.pendingFinanceReview },
	{
		value: "Pending Agent Commission Approval",
		label: labels.pendingAgentCommissionApproval,
	},
	{ value: "Finance Rejected", label: labels.financeRejected },
	{ value: "rejected", label: labels.rejected },
];

const DEFAULT_PENDING_STATUS_FILTER = ["Pending Confirmation"];

const pageFromSearch = (search = "") =>
	Math.max(parseInt(new URLSearchParams(search || "").get("page"), 10) || 1, 1);

const toDatePickerValue = (value = "") => {
	if (!value) return null;
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed : null;
};

const isPendingConfirmationReservation = (reservation = {}) => {
	const statusText = String(
		reservation.reservation_status || reservation.state || ""
	).toLowerCase();
	const pendingStatus = String(reservation?.pendingConfirmation?.status || "")
		.trim()
		.toLowerCase();
	const reasons = Array.isArray(reservation.pendingReasons)
		? reservation.pendingReasons
		: [];
	return (
		statusText.includes("pending confirmation") ||
		pendingStatus === "pending" ||
		reasons.includes("pending_confirmation")
	);
};

const getRejectionReason = (reservation = {}) =>
	String(
		reservation?.pendingConfirmation?.rejectionReason ||
			reservation?.pendingConfirmation?.cancelReason ||
			reservation?.agentDecisionSnapshot?.reason ||
			reservation?.agentDecisionSnapshot?.rejectionReason ||
			reservation?.financial_cycle?.financeRejectionComment ||
			reservation?.financial_cycle?.totalRejectionReason ||
			reservation?.financial_cycle?.totalReviewComment ||
			reservation?.commissionAgentApproval?.rejectionReason ||
			reservation?.reservation_rejection_reason ||
			reservation?.rejectionReason ||
			""
	).trim();

const OverallPendingReservations = ({
	userId,
	token,
	ownerId,
	chosenLanguage,
	rejectedOnly = false,
	confirmationOnly = false,
	reservationsLoader = getOverallPendingReservations,
	reservationsExporter = exportOverallPendingReservations,
	DetailsModalComponent = OverallReservationDetailsModal,
	adminTheme = false,
	queryStateAdapter,
}) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = {
		...common,
		...PENDING_RESERVATIONS_TEXT[isRTL ? "ar" : "en"],
		...REJECTED_RESERVATIONS_TEXT[isRTL ? "ar" : "en"],
		...PENDING_FILTER_TEXT[isRTL ? "ar" : "en"],
		...PENDING_DECISION_TEXT[isRTL ? "ar" : "en"],
	};
	const history = useHistory();
	const location = useLocation();
	const auth = useMemo(() => isAuthenticated() || {}, []);
	const currentUser = useMemo(() => auth?.user || {}, [auth]);
	const workflowPermissions = useMemo(
		() => getPendingWorkflowPermissions(currentUser),
		[currentUser]
	);
	const defaultFilters = useMemo(
		() => ({
			search: "",
			hotelId: [],
			status: rejectedOnly ? [] : DEFAULT_PENDING_STATUS_FILTER,
			dateBy: "createdAt",
			dateFrom: "",
			dateTo: "",
			sortBy: "createdAt",
			sortOrder: "asc",
		}),
		[rejectedOnly]
	);
	const initialQueryState = useMemo(
		() =>
			queryStateAdapter
				? queryStateAdapter.read(location.search, { filters: defaultFilters })
				: { filters: defaultFilters, page: pageFromSearch(location.search) },
		// The URL-to-state effect owns subsequent navigation changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);
	const [filters, setFilters] = useState(initialQueryState.filters);
	const [page, setPage] = useState(initialQueryState.page);
	const syncingQueryFromSearchRef = useRef(false);
	const lastReadSearchRef = useRef(location.search || "");
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [result, setResult] = useState({ reservations: [], hotels: [], total: 0 });
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [confirmingReservationId, setConfirmingReservationId] = useState("");
	const [confirmModal, setConfirmModal] = useState({
		open: false,
		reservation: null,
		inventoryLoading: false,
		currentInventory: [],
	});
	const [rejectModal, setRejectModal] = useState({
		open: false,
		reservation: null,
		reason: "",
		cancelWholeReservation: false,
	});
	const [dateMode, setDateMode] = useState("gregorian");

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			...filters,
			page,
			limit: OVERALL_PAGE_SIZE,
		}),
		[filters, ownerId, page]
	);

	useEffect(() => {
		if (!userId || !token) return;
		const reservationLoader = rejectedOnly
			? getOverallRejectedReservations
			: reservationsLoader;
		setLoading(true);
		reservationLoader(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { reservations: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	}, [params, rejectedOnly, reservationsLoader, token, userId]);

	const loadPendingReservations = () => {
		if (!userId || !token) return;
		const reservationLoader = rejectedOnly
			? getOverallRejectedReservations
			: reservationsLoader;
		setLoading(true);
		reservationLoader(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { reservations: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	};

	const hotels = Array.isArray(result.hotels) ? result.hotels : [];
	const reservations = Array.isArray(result.reservations)
		? result.reservations.filter(
				(reservation) => !isTerminalPendingQueueReservation(reservation)
		  )
		: [];
	const pages = Math.max(Number(result.pages || 1), 1);

	useEffect(() => {
		if (lastReadSearchRef.current === (location.search || "")) return;
		lastReadSearchRef.current = location.search || "";
		const nextState = queryStateAdapter
			? queryStateAdapter.read(location.search, { filters: defaultFilters })
			: { filters, page: pageFromSearch(location.search) };
		const filtersChanged =
			queryStateAdapter &&
			JSON.stringify(nextState.filters) !== JSON.stringify(filters);
		const pageChanged = nextState.page !== page;
		if (!filtersChanged && !pageChanged) return;
		syncingQueryFromSearchRef.current = true;
		if (filtersChanged) setFilters(nextState.filters);
		if (pageChanged) setPage(nextState.page);
	}, [defaultFilters, filters, location.search, page, queryStateAdapter]);

	useEffect(() => {
		if (syncingQueryFromSearchRef.current) {
			syncingQueryFromSearchRef.current = false;
			return;
		}
		const nextSearch = queryStateAdapter
			? queryStateAdapter.write(location.search, { filters, page })
			: (() => {
					const query = new URLSearchParams(location.search || "");
					query.set("page", String(Math.max(Number(page) || 1, 1)));
					return `?${query.toString()}`;
			  })();
		if (nextSearch === (location.search || "")) return;
		history.replace({
			pathname: location.pathname,
			search: nextSearch,
		});
	}, [filters, history, location.pathname, location.search, page, queryStateAdapter]);

	const updateFilter = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value }));
		setPage(1);
	};

	const updateDateFilter = (key, value) => {
		const nextDate = value || "";
		setFilters((previous) => {
			const next = { ...previous, [key]: nextDate };
			if (
				key === "dateFrom" &&
				nextDate &&
				previous.dateTo &&
				dayjs(previous.dateTo).isBefore(dayjs(nextDate), "day")
			) {
				next.dateTo = "";
			}
			if (
				key === "dateTo" &&
				nextDate &&
				previous.dateFrom &&
				dayjs(nextDate).isBefore(dayjs(previous.dateFrom), "day")
			) {
				next.dateFrom = "";
			}
			return next;
		});
		setPage(1);
	};

	const updateSort = (sortBy) => {
		setFilters((previous) => ({
			...previous,
			sortBy,
			sortOrder:
				previous.sortBy === sortBy && previous.sortOrder === "asc"
					? "desc"
					: "asc",
		}));
		setPage(1);
	};

	const goToPage = (nextPage) =>
		setPage(Math.min(Math.max(Number(nextPage) || 1, 1), pages));

	const sortArrow = (sortBy) =>
		filters.sortBy === sortBy ? (filters.sortOrder === "asc" ? "▲" : "▼") : "";

	const sortableHeader = (label, sortBy) => (
		<button
			type='button'
			className='sortable-heading'
			onClick={() => updateSort(sortBy)}
			aria-pressed={filters.sortBy === sortBy}
		>
			<span>{label}</span>
			{sortArrow(sortBy) ? (
				<span className='sort-arrow'>{sortArrow(sortBy)}</span>
			) : null}
		</button>
	);

	const tableDate = (value) =>
		formatDateByCalendar(value, chosenLanguage, dateMode);
	const dateCell = (value) => (
		<TableTooltipText
			value={tableDate(value)}
			max={16}
			className='date-truncate'
		/>
	);

	const disabledStartDate = (current) =>
		Boolean(
			current &&
				filters.dateTo &&
				current.isAfter(dayjs(filters.dateTo), "day")
		);

	const disabledEndDate = (current) =>
		Boolean(
			current &&
				filters.dateFrom &&
				current.isBefore(dayjs(filters.dateFrom), "day")
		);

	const openMoreDetails = (reservation = {}) => {
		setSelectedReservation(reservation);
		setReservationIdInQuery(history, location, reservation);
	};

	const loadConfirmInventory = (reservation = {}) => {
		const inventoryRequest = getPendingReservationInventoryRequest(reservation);
		if (
			!inventoryRequest.hotelId ||
			!inventoryRequest.start ||
			!inventoryRequest.end
		) {
			setConfirmModal((previous) => ({
				...previous,
				inventoryLoading: false,
				currentInventory: [],
			}));
			return;
		}
		setConfirmModal((previous) => ({
			...previous,
			inventoryLoading: true,
			currentInventory: [],
		}));
		getHotelInventoryAvailability(inventoryRequest.hotelId, {
			start: inventoryRequest.start,
			end: inventoryRequest.end,
			agentId: inventoryRequest.agentId,
			includePendingConfirmation: true,
		})
			.then((inventory) => {
				setConfirmModal((previous) => ({
					...previous,
					inventoryLoading:
						String(previous.reservation?._id || "") === String(reservation?._id || "")
							? false
							: previous.inventoryLoading,
					currentInventory:
						String(previous.reservation?._id || "") === String(reservation?._id || "")
							? extractPendingInventoryRows(inventory)
							: previous.currentInventory,
				}));
			})
			.catch(() => {
				setConfirmModal((previous) => ({
					...previous,
					inventoryLoading:
						String(previous.reservation?._id || "") === String(reservation?._id || "")
							? false
							: previous.inventoryLoading,
					currentInventory:
						String(previous.reservation?._id || "") === String(reservation?._id || "")
							? []
							: previous.currentInventory,
				}));
			});
	};

	const refreshUpdatedReservation = (updatedReservation = {}) => {
		if (!updatedReservation || updatedReservation.error) {
			message.error(updatedReservation?.error || labels.updateError);
			return false;
		}
		setResult((previous) => ({
			...previous,
			reservations: (previous.reservations || []).map((reservation) =>
				reservation._id === updatedReservation._id
					? {
							...reservation,
							...updatedReservation,
							roomDetails: reservation.roomDetails || updatedReservation.roomDetails,
					  }
					: reservation
			),
		}));
		loadPendingReservations();
		return true;
	};

	const confirmPendingReservation = (reservation = {}) => {
		if (!workflowPermissions.canReviewStatus) {
			message.error(labels.notAllowedToConfirm);
			return;
		}
		if (!isPendingConfirmationReservation(reservation)) return;

		const actorId = currentUser?._id || userId;
		if (!reservation?._id || !actorId) {
			message.error(labels.updateError);
			return;
		}

		setConfirmModal({
			open: true,
			reservation,
			inventoryLoading: true,
			currentInventory: [],
		});
		loadConfirmInventory(reservation);
	};

	const closeConfirmModal = () => {
		if (confirmingReservationId) return;
		setConfirmModal({
			open: false,
			reservation: null,
			inventoryLoading: false,
			currentInventory: [],
		});
	};

	const openRejectModal = (reservation = {}) => {
		if (!workflowPermissions.canReviewStatus) {
			message.error(labels.notAllowedToConfirm);
			return;
		}
		if (!isPendingConfirmationReservation(reservation)) return;
		setRejectModal({
			open: true,
			reservation,
			reason: "",
			cancelWholeReservation: false,
		});
	};

	const closeRejectModal = () => {
		if (confirmingReservationId) return;
		setRejectModal({
			open: false,
			reservation: null,
			reason: "",
			cancelWholeReservation: false,
		});
	};

	const updateRejectModal = (patch = {}) => {
		setRejectModal((previous) => ({ ...previous, ...patch }));
	};

	const submitConfirmPendingReservation = () => {
		const reservation = confirmModal.reservation;
		const actorId = currentUser?._id || userId;
		if (!reservation?._id || !actorId) {
			message.error(labels.updateError);
			return;
		}
		setConfirmingReservationId(String(reservation._id));
		updatePendingConfirmationReservation({
			reservationId: reservation._id,
			userId: actorId,
			payload: { action: "confirm" },
		})
			.then((data) => {
				if (!data || data.error) {
					throw new Error(data?.error || labels.updateError);
				}
				refreshUpdatedReservation(data);
				message.success(labels.updateSuccess);
				setConfirmModal({
					open: false,
					reservation: null,
					inventoryLoading: false,
					currentInventory: [],
				});
			})
			.catch((error) => {
				message.error(error?.message || labels.updateError);
			})
			.finally(() => setConfirmingReservationId(""));
	};

	const submitRejectPendingReservation = () => {
		const reservation = rejectModal.reservation;
		const actorId = currentUser?._id || userId;
		const reason = String(rejectModal.reason || "").trim();
		if (!reservation?._id || !actorId) {
			message.error(labels.updateError);
			return;
		}
		if (!reason) {
			message.error(labels.rejectionReasonRequired);
			return;
		}
		const action = rejectModal.cancelWholeReservation ? "cancel" : "reject";
		setConfirmingReservationId(String(reservation._id));
		updatePendingConfirmationReservation({
			reservationId: reservation._id,
			userId: actorId,
			payload: {
				action,
				rejectionReason: reason,
				cancelReason: action === "cancel" ? reason : undefined,
			},
		})
			.then((data) => {
				if (!data || data.error) {
					throw new Error(data?.error || labels.updateError);
				}
				refreshUpdatedReservation(data);
				message.success(labels.updateSuccess);
				setRejectModal({
					open: false,
					reservation: null,
					reason: "",
					cancelWholeReservation: false,
				});
			})
			.catch((error) => {
				message.error(error?.message || labels.updateError);
			})
			.finally(() => setConfirmingReservationId(""));
	};

	const handleExportExcel = () => {
		if (!userId || !token || exporting) return;
		const exportReservations = rejectedOnly
			? exportOverallRejectedReservations
			: reservationsExporter;
		setExporting(true);
		exportReservations(userId, token, {
			...buildOwnerParams(ownerId),
			...filters,
			sortBy: filters.sortBy || "createdAt",
			sortOrder: filters.sortOrder || "asc",
		})
			.then((data) => {
				if (data?.error) {
					message.error(data.error || labels.exportFailed);
					return;
				}
				const rows = Array.isArray(data?.reservations)
					? data.reservations
					: [];
				if (!rows.length) {
					message.info(labels.noRowsToExport);
					return;
				}
				downloadReservationWorkbook({
					reservations: rows,
					labels,
					chosenLanguage,
					filePrefix: rejectedOnly
						? "overall-rejected-reservations"
						: "overall-pending-reservations",
					includeRejectionReason: rejectedOnly,
				});
			})
			.catch(() => message.error(labels.exportFailed))
			.finally(() => setExporting(false));
	};

	const confirmModalReservation = confirmModal.reservation || {};
	const confirmModalStayLength = getStayLength(confirmModalReservation);
	const tableColSpan = rejectedOnly ? 15 : 14;
	const scorecardTotals = result.scorecards?.totals || {};
	const scorecardToday = result.scorecards?.today || {};
	const rejectedScorecards = [
		{
			key: "total",
			label: labels.rejectedTotalCard,
			value: Number(result.total || scorecardTotals.reservationsCount || 0),
			meta: labels.rejectedCorrectionAction,
			tone: "red",
		},
		{
			key: "today",
			label: labels.rejectedTodayCard,
			value: Number(scorecardToday.reservationsCount || 0),
			meta: labels.createdAt,
			tone: "amber",
		},
		{
			key: "hotels",
			label: labels.rejectedHotelsCard,
			value: Number(scorecardTotals.hotelsCount || 0),
			meta: labels.hotels,
			tone: "blue",
		},
		{
			key: "value",
			label: labels.rejectedValueCard,
			value: `${formatMoney(scorecardTotals.totalAmount || 0)} ${labels.sar}`,
			meta: labels.totalAmount,
			tone: "green",
		},
	];

	return (
		<PendingPageShell $isRTL={isRTL} $adminTheme={adminTheme}>
			{rejectedOnly ? (
				<RejectedOverviewPanel $isRTL={isRTL}>
					<div className='rejected-header'>
						<div>
							<h2>{labels.rejectedTitle}</h2>
							<p>{labels.rejectedSubtitle}</p>
						</div>
						<span>{labels.rejectedCorrectionHint}</span>
					</div>
					<RejectedScorecardGrid>
						{rejectedScorecards.map((card) => (
							<div
								key={card.key}
								className={`rejected-scorecard tone-${card.tone}`}
							>
								<span>{card.label}</span>
								<strong>{card.value}</strong>
								<small>{card.meta}</small>
							</div>
						))}
					</RejectedScorecardGrid>
				</RejectedOverviewPanel>
			) : null}

			<OverallCenteredSearch $isRTL={isRTL}>
				<Input
					allowClear
					size='large'
					className='overall-centered-search-input'
					value={filters.search}
					onChange={(event) => updateFilter("search", event.target.value)}
					placeholder={labels.searchReservationPlaceholder}
					aria-label={labels.searchReservationPlaceholder}
					dir={isRTL ? "rtl" : "ltr"}
				/>
			</OverallCenteredSearch>

			<OverallToolbar
				onSubmit={(event) => {
					event.preventDefault();
					setPage(1);
				}}
			>
				<Select
					mode='multiple'
					allowClear
					showSearch
					maxTagCount='responsive'
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.hotelId}
					onChange={(value) => updateFilter("hotelId", value)}
					placeholder={labels.allHotels}
					optionFilterProp='label'
					options={hotels.map((hotel) => ({
						value: hotel._id,
						label: titleCase(hotel.hotelName),
					}))}
				/>
				<Select
					mode='multiple'
					allowClear
					showSearch
					maxTagCount='responsive'
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.status}
					onChange={(value) => updateFilter("status", value)}
					placeholder={labels.allStatuses}
					optionFilterProp='label'
					options={
						confirmationOnly
							? pendingStatusOptions(labels).slice(0, 1)
							: pendingStatusOptions(labels)
					}
				/>
				<Select
					showSearch
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.dateBy}
					onChange={(value) => updateFilter("dateBy", value || "createdAt")}
					placeholder={labels.dateByLabel}
					optionFilterProp='label'
					options={dateByOptions(labels)}
					aria-label={labels.dateByLabel}
				/>
				<DatePicker
					allowClear
					inputReadOnly
					size='middle'
					format='YYYY-MM-DD'
					className='overall-date-picker'
					value={toDatePickerValue(filters.dateFrom)}
					onChange={(_, dateString) => updateDateFilter("dateFrom", dateString)}
					disabledDate={disabledStartDate}
					placeholder={labels.fromDate}
					getPopupContainer={() => document.body}
					popupStyle={{ zIndex: 2100 }}
				/>
				<DatePicker
					allowClear
					inputReadOnly
					size='middle'
					format='YYYY-MM-DD'
					className='overall-date-picker'
					value={toDatePickerValue(filters.dateTo)}
					onChange={(_, dateString) => updateDateFilter("dateTo", dateString)}
					disabledDate={disabledEndDate}
					placeholder={labels.toDate}
					getPopupContainer={() => document.body}
					popupStyle={{ zIndex: 2100 }}
				/>
				<button type='submit'>{labels.search}</button>
				<button
					type='button'
					className='secondary'
					disabled={exporting}
					onClick={handleExportExcel}
				>
					{exporting ? labels.exportingExcel : labels.exportExcel}
				</button>
				<button
					type='button'
					className='secondary'
					onClick={() => {
						setFilters({
							search: "",
							hotelId: [],
							status: confirmationOnly
								? DEFAULT_PENDING_STATUS_FILTER
								: [],
							dateBy: "createdAt",
							dateFrom: "",
							dateTo: "",
							sortBy: "createdAt",
							sortOrder: "asc",
						});
						setPage(1);
					}}
				>
					{labels.reset}
				</button>
			</OverallToolbar>

			<ReservationTableControls>
				<div className='control-group'>
					<button
						type='button'
						className={dateMode === "gregorian" ? "active" : ""}
						aria-pressed={dateMode === "gregorian"}
						onClick={() => setDateMode("gregorian")}
					>
						{labels.gregorianDates}
					</button>
					<button
						type='button'
						className={`calendar-hijri ${
							dateMode === "hijri" ? "active" : ""
						}`}
						aria-pressed={dateMode === "hijri"}
						onClick={() => setDateMode("hijri")}
					>
						{labels.hijriDates}
					</button>
				</div>
				<div className='control-group'>
					<span className='control-label'>{labels.sortBy}</span>
					{sortOptions(labels).map((option) => {
						const active = filters.sortBy === option.value;
						return (
							<button
								type='button'
								key={option.value}
								className={active ? "active" : ""}
								aria-pressed={active}
								onClick={() => updateSort(option.value)}
							>
								{option.label}
								{active ? (filters.sortOrder === "asc" ? " ^" : " v") : ""}
							</button>
						);
					})}
				</div>
			</ReservationTableControls>

			<OverallTableWrap>
				<table className='reservation-list-table reservation-pending-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>{sortableHeader(labels.hotel, "hotelName")}</th>
							<th>{labels.confirmation}</th>
							<th>{labels.guest}</th>
							<th>{sortableHeader(labels.source, "booking_source")}</th>
							<th>{labels.status}</th>
							{rejectedOnly ? <th>{labels.rejectionReason}</th> : null}
							<th>{labels.action}</th>
							<th>{sortableHeader(labels.booked, "createdAt")}</th>
							<th>{sortableHeader(labels.checkIn, "checkin_date")}</th>
							<th>{sortableHeader(labels.checkOut, "checkout_date")}</th>
							<th>{labels.nights}</th>
							<th>{labels.pricePerDay}</th>
							<th>{labels.total}</th>
							<th>{labels.moreDetails}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={tableColSpan}>{labels.loading}</td>
							</tr>
						) : reservations.length ? (
							reservations.map((reservation, index) => (
								<tr key={reservation._id}>
									<td>{pageRowNumber(page, index, OVERALL_PAGE_SIZE)}</td>
									<td className='hotel-cell'>
										<TableTooltipText
											value={titleCase(reservation.hotelName || "-")}
											className='table-truncate'
										/>
									</td>
									<td>
										<button
											type='button'
											className='link-btn'
											onClick={() => openMoreDetails(reservation)}
										>
											{reservation.confirmation_number || "-"}
										</button>
									</td>
									<td className='guest-cell'>
										<TableTooltipText
											value={reservation.customer_details?.name || "-"}
											className='table-truncate'
										/>
									</td>
									<td className='source-cell'>
										<TableTooltipText
											value={reservation.booking_source || "-"}
											className='table-truncate'
										/>
									</td>
									<td>
										<StatusPill $tone={statusTone(reservation.reservation_status)}>
											<TableTooltipText
												value={localizeStatus(
													reservation.reservation_status,
													chosenLanguage
												)}
											/>
										</StatusPill>
									</td>
									{rejectedOnly ? (
										<td className='rejection-cell'>
											<TableTooltipText
												value={getRejectionReason(reservation) || "-"}
												className='table-truncate'
												max={42}
											/>
										</td>
									) : null}
									<td>
										{rejectedOnly ? (
											<ActionButton
												type='button'
												onClick={() => openMoreDetails(reservation)}
											>
												{labels.rejectedCorrectionAction}
											</ActionButton>
										) : isPendingConfirmationReservation(reservation) &&
										workflowPermissions.canReviewStatus ? (
											<PendingActionGroup>
												<ActionButton
													type='button'
													$success
													disabled={
														String(confirmingReservationId) ===
														String(reservation._id)
													}
													onClick={() => confirmPendingReservation(reservation)}
												>
													{String(confirmingReservationId) ===
													String(reservation._id)
														? labels.saving
														: labels.confirmReservation}
												</ActionButton>
												<ActionButton
													type='button'
													$danger
													disabled={
														String(confirmingReservationId) ===
														String(reservation._id)
													}
													onClick={() => openRejectModal(reservation)}
												>
													{labels.rejectReservation}
												</ActionButton>
											</PendingActionGroup>
										) : (
											"-"
										)}
									</td>
									<td className='date-cell'>{dateCell(reservation.booked_at || reservation.createdAt)}</td>
									<td className='date-cell'>{dateCell(reservation.checkin_date)}</td>
									<td className='date-cell'>{dateCell(reservation.checkout_date)}</td>
									<td className='amount-cell'>{getReservationNights(reservation)}</td>
									<td className='amount-cell'>
										{formatMoney(getReservationPricePerDay(reservation))} {labels.sar}
									</td>
									<td className='amount-cell'>
										{formatMoney(reservation.total_amount)} {labels.sar}
									</td>
									<td>
										<button
											type='button'
											className='link-btn'
											onClick={() => openMoreDetails(reservation)}
										>
											{labels.moreDetails}
										</button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={tableColSpan}>
									{rejectedOnly
										? labels.noRejectedReservationsFound
										: labels.noPendingReservationsFound}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</OverallTableWrap>

			<Pager>
				<button type='button' disabled={page <= 1} onClick={() => goToPage(1)}>
					«
				</button>
				<button type='button' disabled={page <= 1} onClick={() => goToPage(page - 1)}>
					{labels.previous}
				</button>
				<span className='pager-summary'>
					<span>{labels.page}</span>
					<strong>{page}</strong>
					<span>{labels.of}</span>
					<strong>{pages}</strong>
					<small>({Number(result.total || 0)})</small>
				</span>
				<button
					type='button'
					disabled={page >= pages}
					onClick={() => goToPage(page + 1)}
				>
					{labels.next}
				</button>
				<button type='button' disabled={page >= pages} onClick={() => goToPage(pages)}>
					»
				</button>
			</Pager>

			<Modal
				open={confirmModal.open}
				onCancel={closeConfirmModal}
				title={labels.confirmTitle}
				footer={null}
				destroyOnClose
				width={680}
				className={PENDING_REVIEW_MODAL_CLASS}
			>
				<ConfirmModalBody dir={isRTL ? "rtl" : "ltr"} $isRTL={isRTL}>
					<ConfirmQuestion>
						{labels.confirmQuestion
							.replace(
								"{confirmation}",
								confirmModalReservation.confirmation_number ||
									confirmModalReservation._id ||
									"-"
							)
							.replace("{days}", confirmModalStayLength.days)
							.replace("{nights}", confirmModalStayLength.nights)
							.replace("{amount}", formatMoney(confirmModalReservation.total_amount))}
					</ConfirmQuestion>
					<PendingReservationInventoryBrief
						reservation={confirmModalReservation}
						currentInventory={confirmModal.currentInventory}
						loading={confirmModal.inventoryLoading}
						isArabic={isRTL}
					/>
					<ConfirmModalActions>
						<Button htmlType='button' onClick={closeConfirmModal}>
							{labels.cancel}
						</Button>
						<Button
							htmlType='button'
							className='primary-confirm'
							disabled={!confirmModalReservation?._id}
							loading={
								String(confirmingReservationId) ===
								String(confirmModalReservation?._id || "")
							}
							onClick={submitConfirmPendingReservation}
						>
							{String(confirmingReservationId) ===
							String(confirmModalReservation?._id || "")
								? labels.saving
								: labels.yesConfirm}
						</Button>
					</ConfirmModalActions>
				</ConfirmModalBody>
			</Modal>

			<Modal
				open={rejectModal.open}
				onCancel={closeRejectModal}
				title={labels.rejectTitle}
				footer={null}
				destroyOnClose
				width={620}
				className={PENDING_REVIEW_MODAL_CLASS}
			>
				<DecisionModalBody dir={isRTL ? "rtl" : "ltr"} $isRTL={isRTL}>
					<DecisionNotice>
						<strong>
							{rejectModal.reservation?.confirmation_number ||
								rejectModal.reservation?._id ||
								"-"}
						</strong>
						<span>{labels.rejectQuestion}</span>
					</DecisionNotice>
					<label className='decision-label'>
						<span>{labels.rejectionReasonLabel}</span>
						<Input.TextArea
							value={rejectModal.reason}
							onChange={(event) =>
								updateRejectModal({ reason: event.target.value })
							}
							rows={5}
							maxLength={1200}
							showCount
							placeholder={labels.rejectionReasonPlaceholder}
							dir={isRTL ? "rtl" : "ltr"}
						/>
					</label>
					<CancelWholeReservationBox
						$isActive={rejectModal.cancelWholeReservation}
					>
						<Checkbox
							checked={rejectModal.cancelWholeReservation}
							onChange={(event) =>
								updateRejectModal({
									cancelWholeReservation: event.target.checked,
								})
							}
						>
							{labels.cancelWholeReservation}
						</Checkbox>
						<small>{labels.cancelWholeReservationHelp}</small>
					</CancelWholeReservationBox>
					<ConfirmModalActions>
						<Button htmlType='button' onClick={closeRejectModal}>
							{labels.cancel}
						</Button>
						<Button
							htmlType='button'
							danger={rejectModal.cancelWholeReservation}
							className={
								rejectModal.cancelWholeReservation
									? "danger-confirm"
									: "reject-confirm"
							}
							disabled={!rejectModal.reservation?._id}
							loading={
								String(confirmingReservationId) ===
								String(rejectModal.reservation?._id || "")
							}
							onClick={submitRejectPendingReservation}
						>
							{rejectModal.cancelWholeReservation
								? labels.yesCancelReservation
								: labels.yesReject}
						</Button>
					</ConfirmModalActions>
				</DecisionModalBody>
			</Modal>

			<DetailsModalComponent
				reservations={reservations}
				selectedReservation={selectedReservation}
				setSelectedReservation={setSelectedReservation}
				ownerId={ownerId}
				onReservationUpdated={refreshUpdatedReservation}
				chosenLanguage={chosenLanguage}
			/>
		</PendingPageShell>
	);
};

export default OverallPendingReservations;

const PendingPageShell = styled(OverallPageShell)`
	${({ $adminTheme }) =>
		$adminTheme &&
		css`
			--pms-metal-purple: var(--admin-metal-blue, #155d95);
			--pms-metal-purple-lift: var(--admin-metal-blue-lift, #2490c8);
			--pms-metal-purple-bg: var(
				--admin-metal-blue-bg,
				linear-gradient(135deg, #071827 0%, #0d3f6a 52%, #155d95 100%)
			);

			${OverallCenteredSearch} .overall-centered-search-input.ant-input-affix-wrapper-focused,
			${OverallCenteredSearch} .overall-centered-search-input.ant-input-affix-wrapper:focus-within {
				border-color: #2490c8;
				box-shadow: 0 0 0 3px rgba(36, 144, 200, 0.15);
			}

			${OverallToolbar} {
				border-color: #c9dff2;
				background: linear-gradient(180deg, #f8fcff 0%, #edf6fd 100%);
				box-shadow: inset 0 1px #ffffff, 0 8px 22px rgba(8, 42, 75, 0.08);
			}

			${OverallToolbar} > input:focus,
			${OverallToolbar} > select:focus,
			${OverallToolbar} .overall-filter-select.ant-select-focused .ant-select-selector,
			${OverallToolbar} .overall-date-picker.ant-picker-focused {
				box-shadow: 0 0 0 3px rgba(36, 144, 200, 0.15) !important;
			}

			${OverallToolbar} button {
				border-color: rgba(36, 144, 200, 0.92);
				box-shadow: inset 0 1px rgba(255, 255, 255, 0.2),
					0 9px 20px rgba(8, 42, 75, 0.22);
			}

			${OverallToolbar} button:hover {
				box-shadow: inset 0 1px rgba(255, 255, 255, 0.24),
					0 12px 24px rgba(8, 50, 87, 0.28);
			}

			${OverallToolbar} button.secondary {
				border-color: #b9d7ec;
				background: linear-gradient(180deg, #ffffff 0%, #eef7fd 100%);
				color: #183b5b;
				box-shadow: 0 5px 14px rgba(8, 50, 87, 0.1);
			}

			${OverallToolbar} button.secondary:hover {
				background: #eaf5fc;
			}

			${ReservationTableControls} {
				border-color: #c9dff2;
				background: linear-gradient(180deg, #fafdff 0%, #f1f8fd 100%);
				box-shadow: 0 4px 16px rgba(8, 42, 75, 0.08);
			}

			${ReservationTableControls} button.active,
			${ReservationTableControls} button.summary-trigger {
				border-color: #2490c8;
				box-shadow: 0 8px 18px rgba(8, 50, 87, 0.24);
			}

			${ReservationTableControls} button.calendar-hijri.active {
				border-color: #079b35;
				background: #079b35;
			}
		`}
`;

const RejectedOverviewPanel = styled.section`
	display: grid;
	gap: 12px;
	margin: 0 auto 14px;
	max-width: 1280px;
	width: 100%;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};

	.rejected-header {
		align-items: flex-end;
		display: flex;
		gap: 12px;
		justify-content: space-between;
		padding: 2px 4px 0;
	}

	h2 {
		color: #142033;
		font-size: 1.45rem;
		font-weight: 950;
		letter-spacing: 0;
		line-height: 1.25;
		margin: 0;
	}

	p {
		color: #506174;
		font-size: 0.86rem;
		font-weight: 800;
		line-height: 1.55;
		margin: 4px 0 0;
		max-width: 760px;
	}

	.rejected-header > span {
		background: #fff7ed;
		border: 1px solid #fed7aa;
		border-radius: 8px;
		color: #7c2d12;
		font-size: 0.78rem;
		font-weight: 850;
		line-height: 1.5;
		max-width: 420px;
		padding: 8px 10px;
	}

	@media (max-width: 860px) {
		.rejected-header {
			align-items: stretch;
			flex-direction: column;
		}

		.rejected-header > span {
			max-width: none;
		}
	}
`;

const RejectedScorecardGrid = styled.div`
	display: grid;
	gap: 10px;
	grid-template-columns: repeat(4, minmax(0, 1fr));

	.rejected-scorecard {
		border: 1px solid #d9e6f2;
		border-inline-start-width: 5px;
		border-radius: 8px;
		display: grid;
		gap: 4px;
		min-height: 108px;
		padding: 13px 14px;
	}

	.rejected-scorecard span {
		color: #243449;
		font-size: 0.82rem;
		font-weight: 900;
		line-height: 1.35;
	}

	.rejected-scorecard strong {
		color: #0f172a;
		font-size: 1.72rem;
		font-weight: 950;
		letter-spacing: 0;
		line-height: 1.1;
	}

	.rejected-scorecard small {
		color: #64748b;
		font-size: 0.72rem;
		font-weight: 850;
		line-height: 1.35;
	}

	.tone-red {
		background: #fff1f2;
		border-color: #fecdd3;
		border-inline-start-color: #dc2626;
	}

	.tone-amber {
		background: #fffbeb;
		border-color: #fde68a;
		border-inline-start-color: #d97706;
	}

	.tone-blue {
		background: #eff6ff;
		border-color: #bfdbfe;
		border-inline-start-color: #2563eb;
	}

	.tone-green {
		background: #ecfdf5;
		border-color: #bbf7d0;
		border-inline-start-color: #16a34a;
	}

	@media (max-width: 980px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 560px) {
		grid-template-columns: 1fr;
	}
`;

const PendingActionGroup = styled.div`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	flex-wrap: nowrap;
	white-space: nowrap;

	${ActionButton} {
		min-width: 42px;
		min-height: 29px;
		padding: 0.24rem 0.5rem;
		font-size: 0.68rem;
		line-height: 1.15;
	}

	@media (max-width: 480px) {
		${ActionButton} {
			min-width: 44px;
			min-height: 32px;
			padding-inline: 0.44rem;
		}
	}
`;

const ConfirmModalBody = styled.div`
	display: grid;
	gap: 12px;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};
`;

const DecisionModalBody = styled(ConfirmModalBody)`
	gap: 14px;

	.decision-label {
		display: grid;
		gap: 7px;
		margin: 0;
		color: #142033;
		font-weight: 900;
	}

	.ant-input {
		border-color: #d8e2ee;
		border-radius: 8px;
		font-weight: 750;
		line-height: 1.7;
	}

	.ant-input:focus,
	.ant-input-focused {
		border-color: #b91c1c;
		box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.12);
	}
`;

const ConfirmQuestion = styled.div`
	padding: 11px 12px;
	border: 1px solid #d9e9fa;
	border-radius: 8px;
	background: #f6fbff;
	color: #172c43;
	font-size: 0.95rem;
	font-weight: 850;
	line-height: 1.6;
	text-align: center;
`;

const DecisionNotice = styled.div`
	display: grid;
	gap: 4px;
	padding: 12px 14px;
	border: 1px solid #fde2e2;
	border-radius: 8px;
	background: linear-gradient(135deg, #fff7f7, #fff);
	color: #172033;
	line-height: 1.6;

	strong {
		color: #991b1b;
		font-size: 1rem;
	}

	span {
		font-weight: 800;
	}
`;

const CancelWholeReservationBox = styled.div`
	display: grid;
	gap: 5px;
	padding: 12px 14px;
	border: 1px solid ${(props) => (props.$isActive ? "#fecaca" : "#d8e2ee")};
	border-radius: 8px;
	background: ${(props) =>
		props.$isActive
			? "linear-gradient(135deg, #fff1f2, #fff)"
			: "linear-gradient(135deg, #f8fbff, #fff)"};

	.ant-checkbox-wrapper {
		margin: 0;
		color: ${(props) => (props.$isActive ? "#991b1b" : "#162033")};
		font-weight: 950;
	}

	small {
		color: ${(props) => (props.$isActive ? "#7f1d1d" : "#506174")};
		font-weight: 750;
		line-height: 1.55;
	}
`;

const ConfirmModalActions = styled.div`
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	flex-wrap: wrap;

	.primary-confirm {
		border-color: #53115f;
		background: #53115f;
		color: #fff;
		font-weight: 850;
	}

	.primary-confirm:hover,
	.primary-confirm:focus {
		border-color: #6e1b7b !important;
		background: #6e1b7b !important;
		color: #fff !important;
	}

	.reject-confirm,
	.danger-confirm {
		border-color: #b91c1c;
		background: linear-gradient(135deg, #991b1b, #dc2626);
		color: #fff;
		font-weight: 900;
	}

	.reject-confirm:hover,
	.reject-confirm:focus,
	.danger-confirm:hover,
	.danger-confirm:focus {
		border-color: #7f1d1d !important;
		background: linear-gradient(135deg, #7f1d1d, #b91c1c) !important;
		color: #fff !important;
	}
`;
