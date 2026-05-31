import React, { useEffect, useMemo, useState } from "react";
import { DatePicker, Drawer, Input, message, Select } from "antd";
import {
	BarChartOutlined,
	BankOutlined,
	CalendarOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CloseCircleOutlined,
	CreditCardOutlined,
	DollarCircleOutlined,
	ExclamationCircleOutlined,
	EyeOutlined,
	FileExcelOutlined,
	FilterOutlined,
	GlobalOutlined,
	LoginOutlined,
	LogoutOutlined,
	ReloadOutlined,
	SearchOutlined,
	SortAscendingOutlined,
	SortDescendingOutlined,
	UserAddOutlined,
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

Object.assign(RESERVATION_SCORECARD_TEXT.en, {
	pendingReservationsTitle: "All pending reservations",
	pendingReservationsLabel: "Pending reservations",
	newReservationsToday: "New reservations",
	scoreTotalValue: "Total value",
	scoreHotelsCount: "Hotel count",
	scoreNights: "Nights",
	acceptedScore: "Accepted",
	rejectedScore: "Rejected",
	waitingScore: "Waiting / pending",
	viewScorecard: "View",
});

Object.assign(RESERVATION_SCORECARD_TEXT.ar, {
	pendingReservationsTitle: "\u0643\u0644 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062d\u062c\u0632 \u0627\u0644\u0645\u0639\u0644\u0642\u0629",
	pendingReservationsLabel: "\u0637\u0644\u0628\u0627\u062a \u062d\u062c\u0632 \u0645\u0639\u0644\u0642\u0629",
	newReservationsToday: "\u0637\u0644\u0628\u0627\u062a \u062d\u062c\u0632 \u062c\u062f\u064a\u062f\u0629",
	scoreTotalValue: "\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a\u0629",
	scoreHotelsCount: "\u0639\u062f\u062f \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
	scoreNights: "\u0644\u064a\u0627\u0644",
	acceptedScore: "\u0645\u0642\u0628\u0648\u0644",
	rejectedScore: "\u0645\u0631\u0641\u0648\u0636",
	waitingScore: "\u0645\u0646\u062a\u0638\u0631 / \u0645\u0639\u0644\u0642",
	viewScorecard: "\u0639\u0631\u0636",
});

const RESERVATION_FILTER_TEXT = {
	en: {
		dateByLabel: "Date By",
		creationDate: "Creation Date",
		checkinDate: "Checkin Date",
		checkoutDate: "Checkout Date",
		fromDate: "From date",
		toDate: "To date",
		filtersButton: "Filters",
		filtersDrawerTitle: "Reservation filters",
		applyFilters: "Apply filters",
		sortOrderLabel: "Sort order",
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

Object.assign(RESERVATION_FILTER_TEXT.ar, {
	filtersButton: "\u0641\u0644\u0627\u062a\u0631",
	filtersDrawerTitle: "\u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
	applyFilters: "\u062a\u0637\u0628\u064a\u0642 \u0627\u0644\u0641\u0644\u0627\u062a\u0631",
	sortOrderLabel: "\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u062a\u0631\u062a\u064a\u0628",
});

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
	{ value: "createdAt", label: labels.createdAt, icon: <CalendarOutlined /> },
	{ value: "booking_source", label: labels.source, icon: <GlobalOutlined /> },
	{ value: "hotelName", label: labels.hotel, icon: <BankOutlined /> },
	{ value: "checkin_date", label: labels.checkIn, icon: <LoginOutlined /> },
	{ value: "checkout_date", label: labels.checkOut, icon: <LogoutOutlined /> },
	{ value: "payment", label: labels.payment, icon: <CreditCardOutlined /> },
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
	align-items: center;
	gap: 0.55rem;
	direction: ltr;
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
		justify-content: stretch;
		flex-wrap: wrap;

		.overall-centered-search-input {
			flex: 1 1 auto;
			width: auto;
			min-width: 0;
		}
	}

	@media (max-width: 520px) {
		.overall-centered-search-input {
			flex: 1 1 100%;
			width: 100%;
		}
	}
`;

const FilterDrawerButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.38rem;
	flex: 0 0 auto;
	min-height: 34px;
	min-width: 106px;
	padding: 0 0.78rem;
	border: 1px solid rgba(141, 76, 157, 0.82);
	border-radius: 7px;
	background: var(--pms-metal-purple-bg, linear-gradient(135deg, #24102d, #64166e));
	color: #ffffff;
	font-size: 0.78rem;
	font-weight: 950;
	box-shadow:
		inset 0 1px rgba(255, 255, 255, 0.18),
		0 8px 18px rgba(80, 23, 96, 0.18);
	transition: transform 0.16s ease, filter 0.16s ease, box-shadow 0.16s ease;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	&:hover {
		filter: brightness(1.06) saturate(1.05);
		transform: translateY(-1px);
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.22),
			0 12px 22px rgba(80, 23, 96, 0.24);
	}

	@media (max-width: 420px) {
		min-width: 92px;
		padding: 0 0.62rem;
	}
`;

const SearchRowActionButton = styled(FilterDrawerButton)`
	border-color: rgba(23, 148, 86, 0.85);
	background: linear-gradient(135deg, #0f8f4f 0%, #18b86f 52%, #6ee7b7 100%);
	color: #ffffff;
	box-shadow:
		inset 0 1px rgba(255, 255, 255, 0.22),
		0 8px 18px rgba(15, 143, 79, 0.22);

	&:hover {
		border-color: rgba(110, 231, 183, 0.95);
		color: #ffffff;
		filter: brightness(1.05) saturate(1.06);
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.26),
			0 12px 24px rgba(15, 143, 79, 0.28);
	}

	&:disabled {
		opacity: 0.58;
		cursor: not-allowed;
		transform: none;
		filter: none;
	}
`;

const FilterCount = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 18px;
	height: 18px;
	padding: 0 0.25rem;
	border-radius: 999px;
	background: #ffffff;
	color: #64166e;
	font-size: 0.68rem;
	font-weight: 950;
	line-height: 1;
`;

const ReservationFilterToolbar = styled(OverallToolbar)`
	grid-template-columns: 1fr;
	gap: 10px;
	padding: 0;
	border: 0;
	border-radius: 0;
	background: transparent;
	box-shadow: none;

	> input,
	> select,
	.overall-centered-search-input.ant-input,
	.overall-centered-search-input.ant-input-affix-wrapper,
	.overall-date-picker.ant-picker,
	.overall-filter-select .ant-select-selector {
		width: 100%;
		min-height: 38px !important;
		font-size: 0.8rem !important;
		border-radius: 7px !important;
	}

	> input,
	> select,
	.overall-centered-search-input.ant-input,
	.overall-centered-search-input.ant-input-affix-wrapper {
		padding: 0 10px;
		text-align: inherit;
	}

	.overall-date-picker.ant-picker {
		padding: 0 10px;
	}

	.overall-centered-search-input.ant-input-affix-wrapper .ant-input,
	.overall-date-picker .ant-picker-input > input,
	.overall-filter-select .ant-select-selection-placeholder,
	.overall-filter-select .ant-select-selection-item {
		font-size: 0.8rem;
		font-weight: 850;
	}

	.overall-filter-select .ant-select-selector {
		padding: 0 10px !important;
	}

	.overall-filter-select .ant-select-selection-overflow {
		align-items: center;
		min-height: 36px;
	}

	.overall-filter-select .ant-select-selection-search-input {
		height: 36px !important;
	}

	button {
		width: 100%;
		min-height: 38px;
		border-radius: 7px;
		font-size: 0.8rem;
		padding: 0 12px;
		gap: 0.34rem;
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.16),
			0 6px 14px rgba(80, 23, 96, 0.15);
	}
`;

const ReservationScorecardStrip = styled.section`
	direction: ltr;
	display: grid;
	grid-template-columns: minmax(430px, 0.92fr) minmax(470px, 1.08fr);
	grid-template-areas: "side main";
	align-items: center;
	gap: 50px;
	margin-top: -0.45rem;
	min-height: 170px;
	padding: 8px 18px;
	background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
	border-top: 1px solid #eef2f7;
	border-bottom: 1px solid #e9edf5;

	.score-main {
		grid-area: main;
		display: grid;
		gap: 9px;
		justify-self: stretch;
		align-self: center;
		min-width: 0;
		width: 100%;
	}

	.score-summary-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(100px, 1fr));
		gap: 10px;
		justify-content: stretch;
		direction: ltr;
		width: 100%;
	}

	.score-status-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(132px, 1fr));
		gap: 10px;
		justify-content: stretch;
		direction: ltr;
		width: 100%;
	}

	.score-side {
		grid-area: side;
		display: grid;
		gap: 6px;
		justify-self: stretch;
		align-self: center;
		margin-bottom: 0;
		min-width: 0;
		width: 100%;
		transform: translateY(-5px);
	}

	.score-side-note {
		color: #000000;
		font-size: 0.78rem;
		font-weight: 950;
		line-height: 1.25;
		text-align: center;
		justify-self: end;
		width: min(100%, 194px);
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	}

	.score-side-grid {
		display: grid;
		grid-template-columns: minmax(252px, 1fr) minmax(158px, 0.62fr);
		align-items: end;
		gap: 12px;
		min-width: 0;
		width: 100%;
		direction: ltr;
	}

	.score-mini-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(78px, 1fr));
		gap: 6px;
		width: 100%;
	}

	.score-card {
		appearance: none;
		border: 1px solid #c4c4c4;
		border-radius: 0;
		background: linear-gradient(180deg, #d4d4d4 0%, #c9c9c9 100%);
		color: #000000;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 2px;
		min-width: 0;
		min-height: 72px;
		padding: 6px 8px;
		text-align: center;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
		cursor: pointer;
		box-shadow: none;
		transition: filter 0.14s ease, transform 0.14s ease;
	}

	.score-card:hover,
	.score-card:focus-visible {
		filter: brightness(0.98);
		transform: translateY(-1px);
		outline: none;
	}

	.score-card.active {
		box-shadow: inset 0 -4px 0 rgba(0, 80, 179, 0.55);
	}

	.score-card.mini {
		width: 100%;
		min-height: 74px;
		padding-inline: 6px;
	}

	.score-card.feature {
		width: 100%;
		min-height: 88px;
	}

	.score-card.status {
		min-height: 62px;
		border: 1px solid #0f2842;
		border-radius: 19px;
		background: #ffffff;
	}

	.score-card.summary {
		width: 100%;
		min-height: 86px;
		padding-inline: 7px;
	}

	.score-copy {
		display: grid;
		justify-items: center;
		gap: 1px;
		min-width: 0;
		width: 100%;
	}

	.score-label-line {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
		max-width: 100%;
		min-width: 0;
		direction: inherit;
	}

	.score-label-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		color: #26384f;
		font-size: 0.68rem;
		line-height: 1;
	}

	.score-card.status .score-label-icon {
		color: #123453;
	}

	.score-card.active .score-label-icon {
		color: #0050b3;
	}

	.score-label {
		color: #000000;
		font-size: 0.7rem;
		font-weight: 950;
		line-height: 1.15;
		min-width: 0;
		white-space: normal;
		overflow: visible;
		text-overflow: clip;
		overflow-wrap: anywhere;
	}

	.score-value {
		color: #000000;
		font-size: 1.42rem;
		font-weight: 950;
		line-height: 1.05;
		max-width: 100%;
		direction: ltr;
		unicode-bidi: plaintext;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-variant-numeric: tabular-nums;
	}

	.score-card.long-value .score-value {
		font-size: 1.08rem;
	}

	.score-card.feature .score-value {
		font-size: 2.02rem;
	}

	.score-card.status .score-value {
		font-size: 1.42rem;
	}

	.score-view {
		color: #004fc5;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 3px;
		font-size: 0.64rem;
		font-weight: 950;
		line-height: 1.05;
		text-decoration: none;
		margin-top: 1px;
		letter-spacing: 0;
		direction: inherit;
	}

	.score-view svg {
		font-size: 0.58rem;
	}

	@media (max-width: 1320px) {
		grid-template-columns: 1fr;
		grid-template-areas:
			"main"
			"side";
		gap: 12px;
		justify-items: center;
		min-height: auto;

		.score-main,
		.score-side {
			justify-self: center;
		}

		.score-side-note {
			justify-self: center;
		}

		.score-side {
			margin-bottom: 0;
			transform: none;
		}
	}

	@media (max-width: 760px) {
		margin-top: 0;
		gap: 10px;
		padding: 10px 8px;

		.score-summary-row {
			grid-template-columns: repeat(2, minmax(104px, 1fr));
			width: 100%;
		}

		.score-status-row {
			grid-template-columns: 1fr;
			width: 100%;
		}

		.score-side-grid {
			display: grid;
			grid-template-columns: 1fr;
			justify-items: center;
		}

		.score-side-note {
			width: 100%;
		}

		.score-mini-row {
			grid-template-columns: repeat(3, minmax(78px, 1fr));
			width: 100%;
		}

		.score-card.summary,
		.score-card.status,
		.score-card.mini,
		.score-card.feature {
			width: 100%;
		}
	}

	@media (max-width: 420px) {
		.score-summary-row,
		.score-mini-row {
			grid-template-columns: 1fr;
		}
	}
`;

const ReservationControlsBar = styled(ReservationTableControls)`
	display: grid;
	grid-template-columns: minmax(240px, 0.82fr) auto minmax(560px, 1.45fr);
	grid-template-areas: "calendar action sort";
	align-items: center;
	column-gap: 0.85rem;
	row-gap: 0;
	direction: ltr;
	min-height: 64px;
	margin-top: -1rem;
	padding: 9px 22px;
	border: 1px solid #1f2937;
	border-radius: 0;
	background: #ffffff;
	box-shadow: none;

	.control-group {
		width: auto;
		min-width: 0;
	}

	.calendar-control {
		grid-area: calendar;
		justify-self: start;
		align-self: center;
		justify-content: start;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	}

	.sort-control {
		grid-area: sort;
		display: flex;
		flex-wrap: wrap;
		justify-self: end;
		align-self: center;
		align-content: center;
		justify-content: end;
		row-gap: 0.32rem;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	}

	.sort-control .control-label {
		flex: 0 0 100%;
		height: 18px;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
		line-height: 1.1;
	}

	.summary-control {
		grid-area: action;
		position: static;
		justify-self: center;
		align-self: center;
		width: auto;
		transform: none;
		pointer-events: auto;
	}

	button.summary-trigger {
		min-width: 152px;
	}

	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.42rem;
		direction: inherit;
	}

	.button-icon,
	.sort-option-icon,
	.sort-arrow-icon,
	.control-label-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		line-height: 1;
	}

	.button-icon,
	.sort-option-icon {
		font-size: 0.86rem;
	}

	.sort-button-content,
	.control-label {
		display: inline-flex;
		align-items: center;
		gap: 0.34rem;
		min-width: 0;
		direction: inherit;
	}

	.sort-option-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sort-arrow-icon {
		font-size: 0.72rem;
		opacity: 0.95;
	}

	@media (max-width: 1120px) {
		grid-template-columns: 1fr;
		grid-template-areas:
			"action"
			"sort"
			"calendar";
		grid-template-rows: auto;

		.calendar-control,
		.sort-control,
		.summary-control {
			justify-content: center;
			justify-self: center;
			width: 100%;
		}

		.sort-control .control-label {
			text-align: center;
		}
	}

	@media (max-width: 640px) {
		.control-group {
			width: 100%;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.sort-control {
			grid-template-columns: 1fr;
		}
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

	table.reservation-main-table tbody td.status-cell,
	table.reservation-main-table tbody td.source-cell {
		font-size: 0.64rem;
		line-height: 1.2;
	}

	table.reservation-main-table tbody td.status-cell .status-pill {
		min-height: 20px;
		min-width: 0;
		padding: 0.08rem 0.32rem;
		gap: 0.22rem;
		font-size: 0.6rem;
		line-height: 1.1;
		letter-spacing: 0;
	}

	table.reservation-main-table tbody td.status-cell .status-pill::before {
		width: 5px;
		height: 5px;
		flex-basis: 5px;
	}

	table.reservation-main-table tbody td.source-cell .table-truncate {
		font-size: 0.62rem;
		line-height: 1.18;
		font-weight: 800;
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
		scorecardScope: "",
		actionRequiredOnly: "",
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
	const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

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
	const scorecardToday = result.scorecards?.today || {};
	const scorecardActionRequired = result.scorecards?.actionRequired || {};
	const scorecardStatusCounts =
		result.scorecards?.todayStatusCounts || result.scorecards?.statusCounts || {};
	const selectedStatusKey = (Array.isArray(filters.status) ? filters.status : [])
		.map((value) => String(value || "").toLowerCase())
		.sort()
		.join("|");
	const scorecardStatusKey = (values = []) =>
		(Array.isArray(values) ? values : [])
			.map((value) => String(value || "").toLowerCase())
			.sort()
			.join("|");
	const scoreNumber = (value) =>
		Number(value || 0).toLocaleString("en-US");
	const scorecardFilterActive = ({
		statusValues = [],
		scorecardScope = "",
		actionRequiredOnly = "",
	} = {}) =>
		selectedStatusKey === scorecardStatusKey(statusValues) &&
		String(filters.scorecardScope || "") === String(scorecardScope || "") &&
		String(filters.actionRequiredOnly || "") ===
			String(actionRequiredOnly || "");
	const applyScorecardFilter = ({
		statusValues = [],
		scorecardScope = "",
		actionRequiredOnly = "",
	} = {}) => {
		setFilters((previous) => {
			const nextStatusKey = scorecardStatusKey(statusValues);
			const nextScope = String(scorecardScope || "");
			const nextActionRequired = actionRequiredOnly ? "true" : "";
			const isSameScorecard =
				scorecardStatusKey(previous.status) === nextStatusKey &&
				String(previous.scorecardScope || "") === nextScope &&
				String(previous.actionRequiredOnly || "") === nextActionRequired &&
				!previous.search &&
				!previous.dateFrom &&
				!previous.dateTo &&
				String(previous.dateBy || "createdAt") === "createdAt";

			return {
				...previous,
				search: "",
				status: isSameScorecard ? [] : statusValues,
				dateBy: "createdAt",
				dateFrom: "",
				dateTo: "",
				scorecardScope: isSameScorecard ? "" : nextScope,
				actionRequiredOnly: isSameScorecard ? "" : nextActionRequired,
			};
		});
		setPage(1);
	};
	const activeFilterCount = [
		Array.isArray(filters.hotelId) && filters.hotelId.length,
		Array.isArray(filters.status) && filters.status.length,
		filters.dateBy !== "createdAt",
		filters.dateFrom,
		filters.dateTo,
		filters.scorecardScope,
		filters.actionRequiredOnly,
		filters.sortBy !== "createdAt",
		filters.sortOrder !== "desc",
	].filter(Boolean).length;
	const resetReservationFilters = () => {
		setFilters({
			search: "",
			hotelId: [],
			status: [],
			dateBy: "createdAt",
			dateFrom: "",
			dateTo: "",
			scorecardScope: "",
			actionRequiredOnly: "",
			sortBy: "createdAt",
			sortOrder: "desc",
		});
		setPage(1);
	};
	const summaryScorecardsBase = [
		{
			key: "all",
			label: labels.newReservationsToday,
			value: scoreNumber(
				scorecardToday.reservationsCount ?? scorecardTotals.todayCreated
			),
			statusValues: [],
			scorecardScope: "today",
			active: scorecardFilterActive({ scorecardScope: "today" }),
			icon: <UserAddOutlined />,
			showView: true,
		},
		{
			key: "totalAmount",
			label: labels.scoreTotalValue,
			value: formatMoney(scorecardToday.totalAmount),
			statusValues: [],
			scorecardScope: "today",
			active: false,
			icon: <DollarCircleOutlined />,
			showView: false,
		},
		{
			key: "nights",
			label: labels.scoreNights,
			value: scoreNumber(scorecardToday.nights),
			statusValues: [],
			scorecardScope: "today",
			active: false,
			icon: <CalendarOutlined />,
			showView: false,
		},
		{
			key: "hotels",
			label: labels.scoreHotelsCount,
			value: scoreNumber(scorecardToday.hotelsCount),
			statusValues: [],
			scorecardScope: "today",
			active: false,
			icon: <BankOutlined />,
			showView: false,
		},
	];
	const summaryScorecards = isRTL
		? [
				summaryScorecardsBase[3],
				summaryScorecardsBase[2],
				summaryScorecardsBase[1],
				summaryScorecardsBase[0],
		  ]
		: summaryScorecardsBase;
	const primaryStatusScorecardsBase = [
		{
			key: "confirmed",
			label: labels.acceptedScore,
			value: scoreNumber(scorecardStatusCounts.confirmed),
			statusValues: ["confirmed"],
			scorecardScope: "today",
			active: scorecardFilterActive({
				statusValues: ["confirmed"],
				scorecardScope: "today",
			}),
			icon: <CheckCircleOutlined />,
			showView: true,
		},
		{
			key: "rejected",
			label: labels.rejectedScore,
			value: scoreNumber(
				Number(scorecardStatusCounts.cancelled || 0) +
					Number(scorecardStatusCounts.noShow || 0)
			),
			statusValues: ["cancelled", "no_show"],
			scorecardScope: "today",
			active: scorecardFilterActive({
				statusValues: ["cancelled", "no_show"],
				scorecardScope: "today",
			}),
			icon: <CloseCircleOutlined />,
			showView: true,
		},
		{
			key: "pendingStatus",
			label: labels.waitingScore,
			value: scoreNumber(scorecardStatusCounts.pending),
			statusValues: ["pending"],
			scorecardScope: "today",
			active: scorecardFilterActive({
				statusValues: ["pending"],
				scorecardScope: "today",
			}),
			icon: <ClockCircleOutlined />,
			showView: true,
		},
	];
	const primaryStatusScorecards = isRTL
		? [
				primaryStatusScorecardsBase[2],
				primaryStatusScorecardsBase[1],
				primaryStatusScorecardsBase[0],
		  ]
		: primaryStatusScorecardsBase;
	const secondaryStatusScorecards = [
		{
			key: "sideTotalAmount",
			label: labels.scoreTotalValue,
			value: formatMoney(scorecardActionRequired.totalAmount),
			statusValues: [],
			actionRequiredOnly: true,
			active: false,
			icon: <DollarCircleOutlined />,
			showView: false,
		},
		{
			key: "sideNights",
			label: labels.scoreNights,
			value: scoreNumber(scorecardActionRequired.nights),
			statusValues: [],
			actionRequiredOnly: true,
			active: false,
			icon: <CalendarOutlined />,
			showView: false,
		},
		{
			key: "sideHotels",
			label: labels.scoreHotelsCount,
			value: scoreNumber(scorecardActionRequired.hotelsCount),
			statusValues: [],
			actionRequiredOnly: true,
			active: false,
			icon: <BankOutlined />,
			showView: false,
		},
	];
	const pendingScorecard = {
		key: "pending",
		label: labels.pendingReservationsLabel,
		value: scoreNumber(scorecardActionRequired.reservationsCount),
		statusValues: [],
		actionRequiredOnly: true,
		active: scorecardFilterActive({ actionRequiredOnly: "true" }),
		icon: <ExclamationCircleOutlined />,
		showView: true,
	};
	const renderScorecard = (item, className = "") => {
		const valueText = String(item.value ?? "");
		return (
			<button
				type='button'
				key={item.key}
				className={`score-card ${className} ${
					valueText.length > 6 ? "long-value" : ""
				} ${item.active ? "active" : ""}`}
				aria-pressed={item.active}
				onClick={() => applyScorecardFilter(item)}
			>
				<span className='score-copy'>
					<span className='score-label-line'>
						{item.icon ? (
							<span className='score-label-icon' aria-hidden='true'>
								{item.icon}
							</span>
						) : null}
						<span className='score-label'>{item.label}</span>
					</span>
					<strong className='score-value'>{item.value}</strong>
					{item.showView ? (
						<span className='score-view'>
							<EyeOutlined aria-hidden='true' />
							<span>{labels.viewScorecard}</span>
						</span>
					) : null}
				</span>
			</button>
		);
	};

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
				<FilterDrawerButton
					type='button'
					$isRTL={isRTL}
					onClick={() => setFilterDrawerOpen(true)}
					aria-label={labels.filtersButton}
				>
					<FilterOutlined />
					<span>{labels.filtersButton}</span>
					{activeFilterCount ? <FilterCount>{activeFilterCount}</FilterCount> : null}
				</FilterDrawerButton>
				<SearchRowActionButton
					type='button'
					$isRTL={isRTL}
					onClick={openSummary}
				>
					<BarChartOutlined />
					<span>{summaryLabels.showSummary}</span>
				</SearchRowActionButton>
			</ReservationSearchWrap>

			<Drawer
				open={filterDrawerOpen}
				onClose={() => setFilterDrawerOpen(false)}
				placement='right'
				width='min(92vw, 430px)'
				title={labels.filtersDrawerTitle}
				destroyOnClose={false}
				bodyStyle={{ padding: 14 }}
				className={isRTL ? "reservation-filter-drawer rtl" : "reservation-filter-drawer"}
			>
				<ReservationFilterToolbar
					onSubmit={(event) => {
						event.preventDefault();
						setPage(1);
						setFilterDrawerOpen(false);
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
				<Select
					showSearch
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.sortBy}
					onChange={(value) => updateFilter("sortBy", value || "createdAt")}
					placeholder={labels.sortBy}
					optionFilterProp='label'
					options={sortOptions(labels)}
					aria-label={labels.sortBy}
				/>
				<Select
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.sortOrder}
					onChange={(value) => updateFilter("sortOrder", value || "desc")}
					placeholder={labels.sortOrderLabel}
					optionFilterProp='label'
					options={[
						{ value: "desc", label: labels.sortDescending },
						{ value: "asc", label: labels.sortAscending },
					]}
					aria-label={labels.sortOrderLabel}
				/>
				<button type='submit'>
					<SearchOutlined />
					<span>{labels.applyFilters}</span>
				</button>
				<button
					type='button'
					className='secondary'
					onClick={resetReservationFilters}
				>
					<ReloadOutlined />
					<span>{labels.reset}</span>
				</button>
				</ReservationFilterToolbar>
			</Drawer>

			<ReservationScorecardStrip
				$isRTL={isRTL}
				aria-label={labels.scorecardLabel}
			>
				<div className='score-side'>
					<div className='score-side-note'>{labels.pendingReservationsTitle}</div>
					<div className='score-side-grid'>
						<div className='score-mini-row'>
							{secondaryStatusScorecards.map((item) =>
								renderScorecard(item, "mini")
							)}
						</div>
						{renderScorecard(pendingScorecard, "feature")}
					</div>
				</div>
				<div className='score-main'>
					<div className='score-summary-row'>
						{summaryScorecards.map((item) => renderScorecard(item, "summary"))}
					</div>
					<div className='score-status-row'>
						{primaryStatusScorecards.map((item) =>
							renderScorecard(item, "status")
						)}
					</div>
				</div>
			</ReservationScorecardStrip>

			<ReservationControlsBar $isRTL={isRTL}>
				<div className='control-group calendar-control'>
					<button
						type='button'
						className={dateMode === "gregorian" ? "active" : ""}
						aria-pressed={dateMode === "gregorian"}
						onClick={() => setDateMode("gregorian")}
					>
						<CalendarOutlined className='button-icon' aria-hidden='true' />
						<span>{labels.gregorianDates}</span>
					</button>
					<button
						type='button'
						className={`calendar-hijri ${
							dateMode === "hijri" ? "active" : ""
						}`}
						aria-pressed={dateMode === "hijri"}
						onClick={() => setDateMode("hijri")}
					>
						<CalendarOutlined className='button-icon' aria-hidden='true' />
						<span>{labels.hijriDates}</span>
					</button>
				</div>
				<div className='summary-control'>
					<button
						type='button'
						className='summary-trigger'
						disabled={exporting}
						onClick={handleExportExcel}
					>
						<FileExcelOutlined className='button-icon' aria-hidden='true' />
						<span>{exporting ? labels.exportingExcel : labels.exportExcel}</span>
					</button>
				</div>
				<div className='control-group sort-control'>
					<span className='control-label'>
						<SortDescendingOutlined
							className='control-label-icon'
							aria-hidden='true'
						/>
						<span>{labels.sortBy}</span>
					</span>
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
								<span className='sort-button-content'>
									<span className='sort-option-icon' aria-hidden='true'>
										{option.icon}
									</span>
									<span className='sort-option-label'>{option.label}</span>
									{active ? (
										filters.sortOrder === "asc" ? (
											<SortAscendingOutlined
												className='sort-arrow-icon'
												aria-hidden='true'
											/>
										) : (
											<SortDescendingOutlined
												className='sort-arrow-icon'
												aria-hidden='true'
											/>
										)
									) : null}
								</span>
							</button>
						);
					})}
				</div>
			</ReservationControlsBar>

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
									<td className='status-cell'>
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
