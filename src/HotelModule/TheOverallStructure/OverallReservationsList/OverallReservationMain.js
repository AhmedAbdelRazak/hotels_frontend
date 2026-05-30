import React, { useEffect, useMemo, useState } from "react";
import { DatePicker, Input, message, Select } from "antd";
import {
	BarChartOutlined,
	BankOutlined,
	CalendarOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CloseCircleOutlined,
	DollarCircleOutlined,
	FileExcelOutlined,
	ProfileOutlined,
	ReloadOutlined,
	SearchOutlined,
	StopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import {
	exportOverallReservations,
	getOverallReservations,
	trackOverallReservationSummaryExport,
} from "../../apiAdmin";
import {
	buildOwnerParams,
	formatDateByCalendar,
	formatMoney,
	getReservationNights,
	getReservationPricePerDay,
	getOverallText,
	localizeStatus,
	normalizeId,
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
import ReservationSummaryModal, {
	buildReservationSummary,
	exportReservationSummaryWorkbook,
	summaryText,
} from "./ReservationSummaryModal";
import { downloadReservationWorkbook } from "./reservationExcelExport";

const RESERVATION_LIST_TEXT = {
	en: {
		reservationsList: "Reservations List",
		allReservationCount: "All Reservation Count",
	},
	ar: {
		reservationsList: "قائمة الحجوزات",
	},
};

const RESERVATION_SCORECARD_TEXT = {
	en: {
		scorecardLabel: "Reservation filters",
		allReservationCount: "All Reservation Count",
		availabilityColumn: "Availability",
		inHouseCard: "In House",
		checkedOutCard: "Checked Out",
		noShowCard: "No Show",
	},
	ar: {
		scorecardLabel: "فلاتر الحجوزات",
		allReservationCount: "كل طلبات الحجز",
		availabilityColumn: "الإتاحة",
		inHouseCard: "داخل الفندق",
		checkedOutCard: "تم الخروج",
		noShowCard: "عدم حضور",
	},
};

const RESERVATION_FILTER_TEXT = {
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

const statusOptions = (labels) => [
	{ value: "", label: labels.allStatuses },
	{ value: "active", label: labels.active },
	{ value: "confirmed", label: labels.confirmed },
	{ value: "pending", label: labels.pending },
	{ value: "Pending Finance Review", label: labels.pendingFinanceReview },
	{ value: "InHouse", label: labels.inHouse },
	{ value: "Checked Out", label: labels.checkedOut },
	{ value: "cancelled", label: labels.cancelled },
	{ value: "no_show", label: labels.noShow },
];

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

const pageFromSearch = (search = "") =>
	Math.max(parseInt(new URLSearchParams(search || "").get("page"), 10) || 1, 1);

const toDatePickerValue = (value = "") => {
	if (!value) return null;
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed : null;
};

const ReservationSearchWrap = styled(OverallCenteredSearch)`
	padding: 0 0.2rem;

	.overall-centered-search-input {
		width: min(44%, 560px);
		min-width: min(280px, 100%);
	}

	.overall-centered-search-input .ant-input,
	.overall-centered-search-input.ant-input {
		min-height: 34px;
		height: 34px;
		border-radius: 7px;
		font-size: 0.78rem;
		font-weight: 850;
		padding: 4px 11px;
	}

	.overall-centered-search-input.ant-input-affix-wrapper {
		min-height: 34px;
		height: 34px;
		border-radius: 7px;
		padding: 0 10px;
		box-shadow: 0 4px 14px rgba(26, 34, 54, 0.06);
	}

	.overall-centered-search-input.ant-input-affix-wrapper .ant-input {
		min-height: 28px;
		height: 28px;
		font-size: 0.78rem;
		padding: 0;
	}

	@media (max-width: 720px) {
		.overall-centered-search-input {
			width: 100%;
			min-width: 0;
		}
	}
`;

const ReservationFilterToolbar = styled(OverallToolbar)`
	grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
	gap: 8px;
	padding: 8px 10px;
	border-radius: 7px;

	> input,
	> select,
	.overall-date-picker.ant-picker,
	.overall-filter-select .ant-select-selector {
		min-height: 34px !important;
		font-size: 0.76rem !important;
	}

	> input,
	> select {
		padding: 0 9px;
	}

	.overall-date-picker.ant-picker {
		padding: 0 9px;
	}

	.overall-date-picker .ant-picker-input > input,
	.overall-filter-select .ant-select-selection-placeholder,
	.overall-filter-select .ant-select-selection-item {
		font-size: 0.76rem;
	}

	.overall-filter-select .ant-select-selector {
		padding: 0 9px !important;
	}

	.overall-filter-select .ant-select-selection-overflow {
		align-items: center;
		min-height: 32px;
	}

	.overall-filter-select .ant-select-selection-search-input {
		height: 32px !important;
	}

	button {
		min-height: 34px;
		border-radius: 5px;
		font-size: 0.76rem;
		padding: 0 11px;
		gap: 0.34rem;
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.16),
			0 6px 14px rgba(80, 23, 96, 0.15);
	}

	@media (max-width: 480px) {
		> input,
		> select,
		.overall-filter-select,
		.overall-date-picker,
		button {
			min-height: 36px;
			font-size: 0.76rem;
		}
	}
`;

const ReservationScorecardStrip = styled.section`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	display: grid;
	grid-template-columns: repeat(8, minmax(108px, 1fr));
	gap: 8px;
	padding: 8px;
	border: 1px solid #e3d1e9;
	border-radius: 8px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 246, 252, 0.98)),
		linear-gradient(140deg, rgba(255, 255, 255, 0.72), rgba(116, 133, 158, 0.12));
	box-shadow: 0 8px 22px rgba(31, 39, 57, 0.06);

	.score-card {
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 8px;
		min-width: 0;
		min-height: 66px;
		border: 1px solid rgba(136, 146, 164, 0.28);
		border-radius: 7px;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(235, 239, 245, 0.98)),
			linear-gradient(154deg, rgba(255, 255, 255, 0.8), rgba(120, 141, 166, 0.18));
		color: #111827;
		padding: 8px 10px;
		text-align: start;
		cursor: pointer;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.95),
			0 6px 14px rgba(31, 39, 57, 0.08);
		transition: transform 0.16s ease, border-color 0.16s ease,
			box-shadow 0.16s ease, background 0.16s ease;
	}

	.score-card:hover,
	.score-card:focus-visible {
		border-color: rgba(141, 76, 157, 0.72);
		transform: translateY(-1px);
		outline: none;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 1),
			0 10px 20px rgba(64, 38, 80, 0.14);
	}

	.score-card.active {
		border-color: rgba(100, 22, 110, 0.92);
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 238, 249, 0.98)),
			linear-gradient(135deg, rgba(100, 22, 110, 0.2), rgba(12, 103, 51, 0.12));
		box-shadow:
			inset 4px 0 0 rgba(100, 22, 110, 0.95),
			0 10px 22px rgba(80, 23, 96, 0.14);
	}

	.score-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 999px;
		background: #ffffff;
		color: var(--pms-metal-purple, #64166e);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.95),
			0 4px 10px rgba(31, 39, 57, 0.1);
	}

	.score-copy {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.score-label {
		color: #344054;
		font-size: 0.72rem;
		font-weight: 950;
		line-height: 1.15;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.score-value {
		color: #080b14;
		font-size: 1.18rem;
		font-weight: 950;
		line-height: 1.05;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (max-width: 1400px) {
		grid-template-columns: repeat(4, minmax(120px, 1fr));
	}

	@media (max-width: 760px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		padding: 7px;

		.score-card {
			min-height: 62px;
		}
	}

	@media (max-width: 420px) {
		grid-template-columns: 1fr;
	}
`;

const ReservationMainTableWrap = styled(OverallTableWrap)`
	table.reservation-main-table {
		min-width: 1320px;
	}

	table.reservation-main-table th,
	table.reservation-main-table td {
		text-align: center;
	}

	table.reservation-main-table .hotel-cell,
	table.reservation-main-table .guest-cell,
	table.reservation-main-table .source-cell {
		text-align: start;
	}

	table.reservation-main-table .highlight-column {
		background:
			linear-gradient(180deg, rgba(246, 247, 249, 0.98), rgba(224, 226, 230, 0.98)),
			linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(120, 132, 150, 0.12)) !important;
		color: #111827;
		box-shadow:
			inset 1px 0 rgba(255, 255, 255, 0.75),
			inset -1px 0 rgba(146, 154, 168, 0.18);
	}

	table.reservation-main-table th.highlight-column {
		background:
			linear-gradient(180deg, #eef0f3 0%, #d7d9dd 100%),
			linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(119, 129, 143, 0.16)) !important;
		color: #1d2433;
		font-weight: 950;
	}

	table.reservation-main-table tbody tr:hover td.highlight-column {
		background:
			linear-gradient(180deg, rgba(244, 239, 247, 0.98), rgba(224, 218, 230, 0.98)),
			linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(100, 22, 110, 0.1)) !important;
	}

	table.reservation-main-table .highlight-start {
		border-start-start-radius: 4px;
		border-end-start-radius: 4px;
	}

	table.reservation-main-table .highlight-end {
		border-start-end-radius: 4px;
		border-end-end-radius: 4px;
	}

	table.reservation-main-table .availability-cell {
		color: #14532d;
		font-weight: 950;
	}

	@media (min-width: 992px) {
		table.reservation-main-table {
			min-width: 1320px;
		}

		table.reservation-main-table th:nth-child(1),
		table.reservation-main-table td:nth-child(1) {
			width: 2.2%;
		}

		table.reservation-main-table th:nth-child(2),
		table.reservation-main-table td:nth-child(2) {
			width: 6.4%;
		}

		table.reservation-main-table th:nth-child(3),
		table.reservation-main-table td:nth-child(3) {
			width: 8.2%;
		}

		table.reservation-main-table th:nth-child(4),
		table.reservation-main-table td:nth-child(4) {
			width: 7.6%;
		}

		table.reservation-main-table th:nth-child(5),
		table.reservation-main-table td:nth-child(5) {
			width: 12.4%;
		}

		table.reservation-main-table th:nth-child(6),
		table.reservation-main-table td:nth-child(6) {
			width: 4.7%;
		}

		table.reservation-main-table th:nth-child(7),
		table.reservation-main-table td:nth-child(7),
		table.reservation-main-table th:nth-child(8),
		table.reservation-main-table td:nth-child(8) {
			width: 7%;
		}

		table.reservation-main-table th:nth-child(9),
		table.reservation-main-table td:nth-child(9) {
			width: 7.5%;
		}

		table.reservation-main-table th:nth-child(10),
		table.reservation-main-table td:nth-child(10) {
			width: 8.7%;
		}

		table.reservation-main-table th:nth-child(11),
		table.reservation-main-table td:nth-child(11),
		table.reservation-main-table th:nth-child(12),
		table.reservation-main-table td:nth-child(12) {
			width: 6.4%;
		}

		table.reservation-main-table th:nth-child(13),
		table.reservation-main-table td:nth-child(13) {
			width: 5.4%;
		}

		table.reservation-main-table th:nth-child(14),
		table.reservation-main-table td:nth-child(14) {
			width: 7.2%;
		}

		table.reservation-main-table th:nth-child(15),
		table.reservation-main-table td:nth-child(15) {
			width: 6%;
		}

		table.reservation-main-table th:nth-child(16),
		table.reservation-main-table td:nth-child(16) {
			width: 4.9%;
		}
	}
`;

const summaryAuditRows = (reservations = []) =>
	(Array.isArray(reservations) ? reservations : []).slice(0, 1000).map((reservation) => ({
		_id: normalizeId(reservation._id),
		hotelId: normalizeId(reservation.hotelId),
		hotelName: reservation.hotelName || reservation.hotel?.hotelName || "",
		confirmation_number: reservation.confirmation_number || "",
		booking_source: reservation.booking_source || "",
		reservation_status: reservation.reservation_status || reservation.state || "",
		total_amount: reservation.total_amount,
		paid_amount: reservation.paid_amount,
		commission: reservation.commission,
		checkin_date: reservation.checkin_date,
		checkout_date: reservation.checkout_date,
		createdAt: reservation.createdAt,
	}));

const OverallReservationMain = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = {
		...common,
		...RESERVATION_LIST_TEXT[isRTL ? "ar" : "en"],
		...RESERVATION_SCORECARD_TEXT[isRTL ? "ar" : "en"],
		...RESERVATION_FILTER_TEXT[isRTL ? "ar" : "en"],
	};
	const summaryLabels = summaryText(chosenLanguage);
	const history = useHistory();
	const location = useLocation();
	const [filters, setFilters] = useState({
		search: "",
		hotelId: [],
		status: [],
		dateBy: "createdAt",
		dateFrom: "",
		dateTo: "",
		sortBy: "createdAt",
		sortOrder: "desc",
	});
	const [page, setPage] = useState(() => pageFromSearch(location.search));
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [result, setResult] = useState({ reservations: [], hotels: [], total: 0 });
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [dateMode, setDateMode] = useState("gregorian");
	const [summaryOpen, setSummaryOpen] = useState(false);
	const [summaryRows, setSummaryRows] = useState([]);
	const [summaryLoading, setSummaryLoading] = useState(false);
	const [summaryExporting, setSummaryExporting] = useState(false);
	const [summaryDateBy, setSummaryDateBy] = useState("createdAt");

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			...filters,
			page,
			limit: OVERALL_PAGE_SIZE,
		}),
		[filters, ownerId, page]
	);

	const summaryParams = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			...filters,
			page: 1,
			exportAll: "true",
			sortBy: filters.sortBy || "createdAt",
			sortOrder: filters.sortOrder || "desc",
		}),
		[filters, ownerId]
	);

	useEffect(() => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallReservations(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { reservations: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	}, [params, token, userId]);

	useEffect(() => {
		if (!summaryOpen || !userId || !token) return;
		setSummaryLoading(true);
		getOverallReservations(userId, token, summaryParams)
			.then((data) => {
				setSummaryRows(Array.isArray(data?.reservations) ? data.reservations : []);
			})
			.finally(() => setSummaryLoading(false));
	}, [summaryOpen, summaryParams, token, userId]);

	const loadReservations = () => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallReservations(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { reservations: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	};

	const hotels = Array.isArray(result.hotels) ? result.hotels : [];
	const reservations = Array.isArray(result.reservations)
		? result.reservations
		: [];
	const pages = Math.max(Number(result.pages || 1), 1);
	const scorecardTotals = result.scorecards?.totals || {};
	const scorecardStatusCounts = result.scorecards?.statusCounts || {};
	const selectedStatusKey = (Array.isArray(filters.status) ? filters.status : [])
		.map((value) => String(value || "").toLowerCase())
		.sort()
		.join("|");
	const scoreNumber = (value) =>
		Number(value || 0).toLocaleString("en-US");
	const statusCardActive = (values = []) =>
		selectedStatusKey ===
		values
			.map((value) => String(value || "").toLowerCase())
			.sort()
			.join("|");
	const applyScorecardFilter = (values = []) => {
		setFilters((previous) => ({ ...previous, status: values }));
		setPage(1);
	};
	const scorecardItems = [
		{
			key: "all",
			label: labels.allReservationCount,
			value: scoreNumber(scorecardTotals.reservationsCount),
			icon: <ProfileOutlined />,
			statusValues: [],
			active: !selectedStatusKey,
		},
		{
			key: "totalAmount",
			label: labels.totalAmount,
			value: `${formatMoney(scorecardTotals.totalAmount)} ${labels.sar}`,
			icon: <DollarCircleOutlined />,
			statusValues: [],
			active: false,
		},
		{
			key: "hotels",
			label: labels.hotels,
			value: scoreNumber(scorecardTotals.hotelsCount),
			icon: <BankOutlined />,
			statusValues: [],
			active: false,
		},
		{
			key: "nights",
			label: labels.nights,
			value: scoreNumber(scorecardTotals.nights),
			icon: <CalendarOutlined />,
			statusValues: [],
			active: false,
		},
		{
			key: "confirmed",
			label: labels.confirmed,
			value: scoreNumber(scorecardStatusCounts.confirmed),
			icon: <CheckCircleOutlined />,
			statusValues: ["confirmed"],
			active: statusCardActive(["confirmed"]),
		},
		{
			key: "pending",
			label: labels.pending,
			value: scoreNumber(scorecardStatusCounts.pending),
			icon: <ClockCircleOutlined />,
			statusValues: ["pending"],
			active: statusCardActive(["pending"]),
		},
		{
			key: "cancelled",
			label: labels.cancelled,
			value: scoreNumber(scorecardStatusCounts.cancelled),
			icon: <CloseCircleOutlined />,
			statusValues: ["cancelled"],
			active: statusCardActive(["cancelled"]),
		},
		{
			key: "noShow",
			label: labels.noShowCard,
			value: scoreNumber(scorecardStatusCounts.noShow),
			icon: <StopOutlined />,
			statusValues: ["no_show"],
			active: statusCardActive(["no_show"]),
		},
	];

	useEffect(() => {
		const nextPage = pageFromSearch(location.search);
		setPage((previous) => (previous === nextPage ? previous : nextPage));
	}, [location.search]);

	useEffect(() => {
		const safePage = Math.max(Number(page) || 1, 1);
		const query = new URLSearchParams(location.search || "");
		if (query.get("page") === String(safePage)) return;
		query.set("page", String(safePage));
		history.replace({
			pathname: location.pathname,
			search: `?${query.toString()}`,
		});
	}, [history, location.pathname, location.search, page]);

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
	const availabilityCell = (reservation = {}) => {
		const snapshot = reservation.availabilitySnapshot || {};
		const rawAvailable =
			snapshot.availableRoomsAfterReservation ??
			snapshot.minAvailableAfter ??
			snapshot.availableRoomsAtCreation ??
			snapshot.minAvailableBefore;
		const availableCount = Number(rawAvailable);
		if (Number.isFinite(availableCount)) {
			return `${labels.available} ${Math.max(availableCount, 0)}`;
		}
		return labels.available;
	};

	const openSummary = () => {
		setSummaryDateBy("createdAt");
		setSummaryOpen(true);
	};

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

	const refreshUpdatedReservation = (updatedReservation = {}) => {
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
		loadReservations();
	};

	const handleExportExcel = () => {
		if (!userId || !token || exporting) return;
		setExporting(true);
		exportOverallReservations(userId, token, {
			...buildOwnerParams(ownerId),
			...filters,
			sortBy: filters.sortBy || "createdAt",
			sortOrder: filters.sortOrder || "desc",
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
					filePrefix: "overall-reservations",
				});
			})
			.catch(() => message.error(labels.exportFailed))
			.finally(() => setExporting(false));
	};

	const handleExportSummary = async (summaryPayload = {}) => {
		const exportRows = Array.isArray(summaryPayload.reservations)
			? summaryPayload.reservations
			: summaryRows;
		const exportDateBy = summaryPayload.dateBy || summaryDateBy;
		const exportFilters = summaryPayload.filters || filters;
		if (!exportRows.length) {
			message.info(labels.noRowsToExport);
			return;
		}
		setSummaryExporting(true);
		try {
			const summary = buildReservationSummary({
				reservations: exportRows,
				dateBy: exportDateBy,
				chosenLanguage,
			});
			const hotelIds = [
				...new Set(
					exportRows
						.map((reservation) => normalizeId(reservation.hotelId))
						.filter(Boolean)
				),
			];
			const tracking = await trackOverallReservationSummaryExport(
				userId,
				token,
				{
					dataset: "overall_reservation_summary",
					format: "XLSX",
					dateBy: exportDateBy,
					hotelIds,
					totalRows: exportRows.length,
					filters: {
						...buildOwnerParams(ownerId),
						...exportFilters,
						summaryDateBy: exportDateBy,
					},
					summary: {
						totals: summary.totals,
						byDateRows: summary.dateRows.length,
						byBookingSourceRows: summary.sourceRows.length,
						byStatusRows: summary.statusRows.length,
						byRoomTypeRows: summary.roomTypeRows.length,
					},
					reservations: summaryAuditRows(exportRows),
				},
				buildOwnerParams(ownerId)
			);
			if (!tracking || tracking.error || !tracking.exportTracked) {
				throw new Error(tracking?.error || "Could not track export");
			}
			await exportReservationSummaryWorkbook({
				reservations: exportRows,
				dateBy: exportDateBy,
				filters: exportFilters,
				hotels,
				labels,
				chosenLanguage,
				filePrefix: "overall-reservation-summary",
			});
		} catch (error) {
			console.error(error);
			message.error(labels.exportFailed);
		} finally {
			setSummaryExporting(false);
		}
	};

	return (
		<OverallPageShell $isRTL={isRTL}>
			<ReservationSearchWrap $isRTL={isRTL}>
				<Input
					allowClear
					size='middle'
					className='overall-centered-search-input'
					value={filters.search}
					onChange={(event) => updateFilter("search", event.target.value)}
					placeholder={labels.searchReservationPlaceholder}
					aria-label={labels.searchReservationPlaceholder}
					dir={isRTL ? "rtl" : "ltr"}
				/>
			</ReservationSearchWrap>

			<ReservationFilterToolbar
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
					options={statusOptions(labels)
						.filter((option) => option.value)
						.map((option) => ({
							value: option.value,
							label: option.label,
						}))}
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
				<button type='submit'>
					<SearchOutlined />
					<span>{labels.search}</span>
				</button>
				<button
					type='button'
					className='secondary'
					disabled={exporting}
					onClick={handleExportExcel}
				>
					<FileExcelOutlined />
					<span>{exporting ? labels.exportingExcel : labels.exportExcel}</span>
				</button>
				<button
					type='button'
					className='secondary'
					onClick={() => {
						setFilters({
							search: "",
							hotelId: [],
							status: [],
							dateBy: "createdAt",
							dateFrom: "",
							dateTo: "",
							sortBy: "createdAt",
							sortOrder: "desc",
						});
						setPage(1);
					}}
				>
					<ReloadOutlined />
					<span>{labels.reset}</span>
				</button>
			</ReservationFilterToolbar>

			<ReservationScorecardStrip
				$isRTL={isRTL}
				aria-label={labels.scorecardLabel}
			>
				{scorecardItems.map((item) => (
					<button
						type='button'
						key={item.key}
						className={`score-card ${item.active ? "active" : ""}`}
						aria-pressed={item.active}
						onClick={() => applyScorecardFilter(item.statusValues)}
					>
						<span className='score-icon'>{item.icon}</span>
						<span className='score-copy'>
							<span className='score-label'>{item.label}</span>
							<strong className='score-value'>{item.value}</strong>
						</span>
					</button>
				))}
			</ReservationScorecardStrip>

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
				<div className='summary-control'>
					<button
						type='button'
						className='summary-trigger'
						onClick={openSummary}
					>
						<BarChartOutlined />
						<span>{summaryLabels.showSummary}</span>
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

			<ReservationMainTableWrap>
				<table className='reservation-list-table reservation-main-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>{sortableHeader(labels.booked, "createdAt")}</th>
							<th>{sortableHeader(labels.hotel, "hotelName")}</th>
							<th>{labels.confirmation}</th>
							<th>{labels.guest}</th>
							<th className='highlight-column highlight-start'>{labels.nights}</th>
							<th className='highlight-column'>{labels.pricePerDay}</th>
							<th className='highlight-column highlight-end'>{labels.total}</th>
							<th>{labels.status}</th>
							<th>{sortableHeader(labels.source, "booking_source")}</th>
							<th>{sortableHeader(labels.checkIn, "checkin_date")}</th>
							<th>{sortableHeader(labels.checkOut, "checkout_date")}</th>
							<th>{labels.availabilityColumn}</th>
							<th>{labels.payment}</th>
							<th>{labels.paidAmount}</th>
							<th>{labels.moreDetails}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='16'>{labels.loading}</td>
							</tr>
						) : reservations.length ? (
							reservations.map((reservation, index) => (
								<tr key={reservation._id}>
									<td>{pageRowNumber(page, index, OVERALL_PAGE_SIZE)}</td>
									<td className='date-cell'>{dateCell(reservation.booked_at || reservation.createdAt)}</td>
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
									<td className='amount-cell highlight-column highlight-start'>{getReservationNights(reservation)}</td>
									<td className='amount-cell highlight-column'>
										{formatMoney(getReservationPricePerDay(reservation))} {labels.sar}
									</td>
									<td className='amount-cell highlight-column highlight-end'>
										{formatMoney(reservation.total_amount)} {labels.sar}
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
									<td className='source-cell'>
										<TableTooltipText
											value={reservation.booking_source || "-"}
											className='table-truncate'
										/>
									</td>
									<td className='date-cell'>{dateCell(reservation.checkin_date)}</td>
									<td className='date-cell'>{dateCell(reservation.checkout_date)}</td>
									<td className='availability-cell'>
										<TableTooltipText value={availabilityCell(reservation)} />
									</td>
									<td>
										<TableTooltipText value={reservation.payment || "-"} />
									</td>
									<td className='amount-cell'>
										{formatMoney(reservation.paid_amount)} {labels.sar}
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
								<td colSpan='16'>{labels.noReservationsFound}</td>
							</tr>
						)}
					</tbody>
				</table>
			</ReservationMainTableWrap>

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

			<ReservationSummaryModal
				open={summaryOpen}
				onClose={() => setSummaryOpen(false)}
				reservations={summaryRows}
				loading={summaryLoading}
				exporting={summaryExporting}
				filters={filters}
				hotels={hotels}
				labels={labels}
				chosenLanguage={chosenLanguage}
				summaryDateBy={summaryDateBy}
				onSummaryDateByChange={setSummaryDateBy}
				onExport={handleExportSummary}
			/>

			<OverallReservationDetailsModal
				reservations={reservations}
				selectedReservation={selectedReservation}
				setSelectedReservation={setSelectedReservation}
				ownerId={ownerId}
				onReservationUpdated={refreshUpdatedReservation}
				chosenLanguage={chosenLanguage}
			/>
		</OverallPageShell>
	);
};

export default OverallReservationMain;
