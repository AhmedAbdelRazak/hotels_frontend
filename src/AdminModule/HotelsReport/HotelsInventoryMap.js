import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import styled, { createGlobalStyle } from "styled-components";
import {
	Alert,
	Button,
	Card,
	DatePicker,
	Modal,
	Progress,
	Select,
	Spin,
	Switch,
	Tag,
	Tooltip,
} from "antd";
import {
	ApartmentOutlined,
	BankOutlined,
	BarChartOutlined,
	CalendarOutlined,
	CheckCircleOutlined,
	CreditCardOutlined,
	DatabaseOutlined,
	DollarCircleOutlined,
	FilterOutlined,
	FundOutlined,
	LoginOutlined,
	ProfileOutlined,
	TagsOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import moment from "moment-hijri";
import { useHistory, useLocation } from "react-router-dom";
import { isAuthenticated } from "../../auth";
import EnhancedContentTable from "../AllReservation/EnhancedContentTable";
import ReservationDetail from "../../HotelModule/ReservationsFolder/ReservationDetail";
import MoreDetails from "../AllReservation/MoreDetails";
import { singlePreReservationById } from "../../HotelModule/apiAdmin";
import {
	getHotelOccupancyCalendar,
	getHotelOccupancyDayReservations,
	getHotelOccupancyWarnings,
	getBookingSourcePaymentSummary,
	getCheckoutDatePaymentSummary,
	getSpecificListOfReservations,
	gettingHotelDetailsForAdmin,
	distinctBookingSources as getDistinctBookingSources,
} from "../apiAdmin";
import WarningsModal from "./WarningsModal";
import {
	formatSaudiGregorianDate,
	formatSaudiHijriDate,
} from "../../utils/saudiDates";

const { Option } = Select;

const ModalZFix = createGlobalStyle`
	.day-details-modal .ant-modal,
	.reservation-details-modal .ant-modal {
		z-index: 4001 !important;
	}
	.day-details-modal .ant-modal-mask,
	.reservation-details-modal .ant-modal-mask {
		z-index: 4000 !important;
	}
	.report-reservations-modal .ant-modal,
	.report-reservations-modal .ant-modal-mask {
		z-index: 4002 !important;
	}
	.report-reservations-modal .ant-modal {
		max-width: calc(100vw - 24px);
	}
	.payment-breakdown-modal .ant-modal,
	.payment-breakdown-modal .ant-modal-wrap {
		z-index: 50050 !important;
	}
	.payment-breakdown-modal .ant-modal-mask {
		z-index: 50049 !important;
	}

	.day-details-modal .ant-modal-content,
	.report-reservations-modal .ant-modal-content {
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid rgba(45, 93, 145, 0.22);
		box-shadow: 0 24px 70px rgba(6, 26, 47, 0.28);
	}

	.day-details-modal .ant-modal-header,
	.report-reservations-modal .ant-modal-header {
		margin: 0;
		padding: 16px 22px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
			linear-gradient(180deg, #244e7d 0%, #102033 100%);
		border-bottom: 1px solid rgba(103, 167, 223, 0.5);
	}

	.day-details-modal .ant-modal-title,
	.report-reservations-modal .ant-modal-title {
		color: #ffffff;
		font-weight: 950;
		font-size: 15px;
		line-height: 1.45;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.22);
	}

	.day-details-modal .ant-modal-close,
	.report-reservations-modal .ant-modal-close {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		inset-block-start: 12px;
	}

	.day-details-modal .ant-modal-close:hover,
	.report-reservations-modal .ant-modal-close:hover {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.2);
	}

	.day-details-modal .ant-modal-body,
	.report-reservations-modal .ant-modal-body {
		background:
			linear-gradient(135deg, rgba(229, 243, 255, 0.55), rgba(255, 255, 255, 0.98) 42%),
			#ffffff;
		max-height: calc(100vh - 96px);
		overflow-y: auto;
		padding: 12px 16px 16px;
	}
`;

const heatColor = (rate = 0) => {
	const clamped = Math.min(Math.max(Number(rate) || 0, 0), 1);
	const start = [229, 243, 255];
	const end = clamped >= 0.78 ? [185, 28, 28] : [16, 91, 150];
	const mix = start.map((s, i) => Math.round(s + (end[i] - s) * clamped));
	return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
};

const heatBackground = (rate = 0, overbooked = false) => {
	const r = Math.min(Math.max(Number(rate) || 0, 0), 1);
	if (overbooked) {
		return "linear-gradient(135deg, #fff1f2 0%, #fb7185 46%, #991b1b 100%)";
	}
	if (r >= 0.86) {
		return "linear-gradient(135deg, #fee2e2 0%, #ef4444 48%, #7f1d1d 100%)";
	}
	if (r >= 0.64) {
		return "linear-gradient(135deg, #dbeafe 0%, #2563eb 54%, #102033 100%)";
	}
	if (r >= 0.32) {
		return "linear-gradient(135deg, #eef7ff 0%, #7db7ec 58%, #24547d 100%)";
	}
	return "linear-gradient(135deg, #ffffff 0%, #edf7ff 58%, #cde7ff 100%)";
};

const heatBorder = (rate = 0, overbooked = false) => {
	if (overbooked) return "#991b1b";
	const r = Math.min(Math.max(Number(rate) || 0, 0), 1);
	if (r >= 0.86) return "#b91c1c";
	if (r >= 0.64) return "#1d4ed8";
	if (r >= 0.32) return "#2f74b5";
	return "#b8d8f3";
};

const heatShadow = (rate = 0, overbooked = false) => {
	if (overbooked) return "inset 0 0 0 1px #991b1b";
	const r = Math.min(Math.max(Number(rate) || 0, 0), 1);
	if (r >= 0.86) return "inset 0 0 0 1px rgba(185, 28, 28, 0.45)";
	if (r >= 0.64) return "inset 0 0 0 1px rgba(29, 78, 216, 0.42)";
	return "inset 0 0 0 1px rgba(47, 116, 181, 0.28)";
};

const getReadableCellColors = (rate = 0) => {
	const r = Math.min(Math.max(Number(rate) || 0, 0), 1);
	const isDark = r >= 0.58;
	return {
		text: isDark ? "#ffffff" : "#1f1f1f",
		muted: isDark ? "rgba(255,255,255,0.92)" : "#334155",
	};
};

const metricTone = (tone = "blue") =>
	({
		money: {
			main: "#0f766e",
			soft: "rgba(15, 118, 110, 0.12)",
			border: "rgba(15, 118, 110, 0.22)",
		},
		arrival: {
			main: "#2563eb",
			soft: "rgba(37, 99, 235, 0.12)",
			border: "rgba(37, 99, 235, 0.22)",
		},
		occupancy: {
			main: "#0f766e",
			soft: "rgba(15, 118, 110, 0.12)",
			border: "rgba(15, 118, 110, 0.22)",
		},
		nights: {
			main: "#24547d",
			soft: "rgba(36, 84, 125, 0.12)",
			border: "rgba(36, 84, 125, 0.22)",
		},
		rooms: {
			main: "#4f46e5",
			soft: "rgba(79, 70, 229, 0.11)",
			border: "rgba(79, 70, 229, 0.22)",
		},
		mapping: {
			main: "#16a34a",
			soft: "rgba(22, 163, 74, 0.12)",
			border: "rgba(22, 163, 74, 0.22)",
		},
		peak: {
			main: "#b45309",
			soft: "rgba(180, 83, 9, 0.13)",
			border: "rgba(180, 83, 9, 0.24)",
		},
		warning: {
			main: "#b91c1c",
			soft: "rgba(185, 28, 28, 0.1)",
			border: "rgba(185, 28, 28, 0.22)",
		},
	}[tone] || {
		main: "#24547d",
		soft: "rgba(36, 84, 125, 0.12)",
		border: "rgba(36, 84, 125, 0.22)",
	});

const extractHotels = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (payload?.hotels && Array.isArray(payload.hotels)) return payload.hotels;
	const firstArray = Object.values(payload || {}).find(Array.isArray);
	return firstArray || [];
};

const hijriMonthsEn = [
	"Muharram",
	"Safar",
	"Rabi Al-Awwal",
	"Rabi Al-Thani",
	"Jumada Al-Awwal",
	"Jumada Al-Thani",
	"Rajab",
	"Sha'ban",
	"Ramadan",
	"Shawwal",
	"Dhul-Qadah",
	"Dhul-Hijjah",
];

const hijriMonthsAr = [
	"\u0645\u062d\u0631\u0645",
	"\u0635\u0641\u0631",
	"\u0631\u0628\u064a\u0639 \u0627\u0644\u0623\u0648\u0644",
	"\u0631\u0628\u064a\u0639 \u0627\u0644\u062b\u0627\u0646\u064a",
	"\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0623\u0648\u0644\u0649",
	"\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0622\u062e\u0631\u0629",
	"\u0631\u062c\u0628",
	"\u0634\u0639\u0628\u0627\u0646",
	"\u0631\u0645\u0636\u0627\u0646",
	"\u0634\u0648\u0627\u0644",
	"\u0630\u0648 \u0627\u0644\u0642\u0639\u062f\u0629",
	"\u0630\u0648 \u0627\u0644\u062d\u062c\u0629",
];

const INVENTORY_TEXT = {
	en: {
		date: "Date",
		total: "Total",
		availableShort: "Avail",
		monthTotal: "Month total",
		dayOverDay: "Day-over-day occupancy",
		cellHint: "Cells show booked/capacity, availability, and occupancy%.",
		hijri: "Hijri",
		gregorian: "Gregorian",
		legendLow: "0-30%",
		legendMid: "30-70%",
		legendHigh: "70-100%",
		derived: "Derived",
		derivedTooltip:
			"Derived from reservations (not found in HotelDetails inventory).",
		shared: "Shared",
		single: "Single",
		double: "Double",
		triple: "Triple",
		quad: "Quad",
		familyBeds: "Family {beds} Beds",
		room: "Room",
		filtersTitle: "Inventory filters",
		hotel: "Hotel",
		selectHotel: "Select a hotel",
		calendar: "Calendar",
		month: "Month",
		hijriMonth: "Hijri Month",
		columnLabels: "Column labels",
		displayNameDefault: "Display name (default)",
		roomTypeGrouped: "Room type (grouped)",
		includeCancelledNoShow: "Include cancelled / no-show",
		paymentStatus: "Payment status",
		all: "All",
		clear: "Clear",
		bookingSource: "Booking source",
		allBookingSources: "All booking sources",
		filterTip: "You can select multiple statuses and booking sources.",
		prev: "Prev",
		next: "Next",
		loading: "Loading occupancy...",
		loadError: "Could not load occupancy data",
		selectHotelMessage: "Select a hotel to view its occupancy map.",
		paymentStatusLabels: {
			"Not Paid": "Not Paid",
			"Not Captured": "Not Captured",
			Captured: "Captured",
			"Paid Offline": "Paid Offline",
		},
		totalAmountSar: "Total Amount (SAR)",
		grossCheckoutBasis: "Gross (checkout-date basis)",
		reservationsCheckedOut: "Reservations checked out",
		checkinReservationsSelectedPeriod:
			"Check-in Reservations (Selected Period)",
		totalCheckins: "Total check-ins",
		checkinGrossSar: "Check-in gross (SAR)",
		averageOccupancyCapped: "Average Occupancy (capped)",
		occupiedFormula: "Occupied = min(booked, capacity) per day / room.",
		roomNights: "Room Nights",
		occupied: "Occupied",
		remaining: "Remaining",
		capacity: "Capacity",
		bookedRaw: "Booked (raw)",
		roomCounts: "Room Counts",
		inventoryUnits: "Inventory units",
		physicalRooms: "Physical rooms",
		inventoryMapping: "Inventory mapping",
		unmappedTypes: "Unmapped types",
		unmapped: "Unmapped",
		unmappedMessage:
			"These types exist in reservations but not HotelDetails inventory.",
		viewList: "View list",
		allMapped: "All mapped",
		allMappedMessage:
			"All reservation room labels matched HotelDetails inventory.",
		peakDay: "Peak Day",
		booked: "Booked",
		warnings: "Warnings",
		overbooked: "Overbooked",
		more: "more",
		noOverbooking: "No overbooking detected",
		occupancyByRoomType: "Occupancy by room type",
		occupiedNights: "occupied nights",
		bookedLower: "booked",
		paymentStatusBreakdown: "Payment status breakdown",
		bookingSourceTotalsCheckoutSar:
			"Booking source totals by checkout date (SAR)",
		bookingSourceHeader: "Booking source",
		totalSar: "Total (SAR)",
		unknown: "Unknown",
		noBookingSourceData: "No booking source data in this range",
		paymentStatusTotals: "Payment status totals",
		status: "Status",
		reservations: "Reservations",
		totalAmount: "Total amount",
		paidAmount: "Paid amount",
		onsitePaid: "Onsite paid",
		noPaymentData: "No payment data in this range",
		checkinDateTotalsSar: "Checkin date totals by payment status (SAR)",
		checkinDate: "Checkin date",
		noCheckinPaymentData: "No checkin-date payment data in this range",
		checkoutDateTotalsSar: "Checkout date totals by payment status (SAR)",
		checkoutDate: "Checkout date",
		noCheckoutPaymentData: "No checkout-date payment data in this range",
		detailedReservationsList: "Detailed Reservations List",
		loadingReservations: "Loading reservations...",
		noReservationsFound: "No reservations found",
		reservationsOn: "Reservations on",
		selectedDay: "selected day",
		unableDayReservations: "Unable to load reservations for this day",
		selectedHotelFallback: "Selected hotel",
		allRoomTypes: "All room types",
		bookedCapacity: "Booked / Capacity",
		overBy: "Over by",
		confirmation: "Confirmation",
		guest: "Guest",
		phone: "Phone",
		checkIn: "Check-in",
		checkOut: "Check-out",
		roomTypeHeader: "Room Type",
		count: "Count",
		payment: "Payment",
		showDetails: "Show Details",
		noReservationsDay: "No reservations for this day.",
		loadingReservationDetails: "Loading reservation details...",
	},
	ar: {
		date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
		total: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
		availableShort: "\u0645\u062a\u0627\u062d",
		monthTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0649",
		dayOverDay: "\u0627\u0644\u0625\u0634\u063a\u0627\u0644 \u064a\u0648\u0645\u0627\u064b \u0628\u064a\u0648\u0645",
		cellHint:
			"\u0627\u0644\u062e\u0644\u0627\u064a\u0627 \u062a\u0639\u0631\u0636 \u0627\u0644\u0645\u062d\u062c\u0648\u0632/\u0627\u0644\u0637\u0627\u0642\u0629 \u0648\u0627\u0644\u0645\u062a\u0627\u062d \u0648\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0634\u063a\u0627\u0644.",
		hijri: "\u0647\u062c\u0631\u064a",
		gregorian: "\u0645\u064a\u0644\u0627\u062f\u064a",
		legendLow: "0-30%",
		legendMid: "30-70%",
		legendHigh: "70-100%",
		derived: "\u0645\u0633\u062a\u0646\u062a\u062c",
		derivedTooltip:
			"\u0645\u0633\u062a\u0646\u062a\u062c \u0645\u0646 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0648\u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f \u0641\u064a \u0645\u062e\u0632\u0648\u0646 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0641\u0646\u062f\u0642.",
		shared: "\u0645\u0634\u062a\u0631\u0643\u0629",
		single: "\u0641\u0631\u062f\u064a\u0629",
		double: "\u0645\u0632\u062f\u0648\u062c\u0629",
		triple: "\u062b\u0644\u0627\u062b\u064a\u0629",
		quad: "\u0631\u0628\u0627\u0639\u064a\u0629",
		familyBeds: "\u0639\u0627\u0626\u0644\u064a\u0629 {beds} \u0623\u0633\u0631\u0629",
		room: "\u063a\u0631\u0641\u0629",
		filtersTitle: "\u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u0645\u062e\u0632\u0648\u0646",
		hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
		selectHotel: "\u0627\u062e\u062a\u0631 \u0641\u0646\u062f\u0642\u0627\u064b",
		calendar: "\u0627\u0644\u062a\u0642\u0648\u064a\u0645",
		month: "\u0627\u0644\u0634\u0647\u0631",
		hijriMonth: "\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0647\u062c\u0631\u064a",
		columnLabels: "\u0639\u0646\u0627\u0648\u064a\u0646 \u0627\u0644\u0623\u0639\u0645\u062f\u0629",
		displayNameDefault:
			"\u0627\u0633\u0645 \u0627\u0644\u0639\u0631\u0636 (\u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a)",
		roomTypeGrouped:
			"\u0646\u0648\u0639 \u0627\u0644\u063a\u0631\u0641\u0629 (\u0645\u062c\u0645\u0639)",
		includeCancelledNoShow:
			"\u062a\u0636\u0645\u064a\u0646 \u0627\u0644\u0645\u0644\u063a\u0649 \u0648\u0639\u062f\u0645 \u0627\u0644\u062d\u0636\u0648\u0631",
		paymentStatus: "\u062d\u0627\u0644\u0629 \u0627\u0644\u062f\u0641\u0639",
		all: "\u0627\u0644\u0643\u0644",
		clear: "\u0645\u0633\u062d",
		bookingSource: "\u0645\u0635\u062f\u0631 \u0627\u0644\u062d\u062c\u0632",
		allBookingSources:
			"\u0643\u0644 \u0645\u0635\u0627\u062f\u0631 \u0627\u0644\u062d\u062c\u0632",
		filterTip:
			"\u064a\u0645\u0643\u0646\u0643 \u0627\u062e\u062a\u064a\u0627\u0631 \u0623\u0643\u062b\u0631 \u0645\u0646 \u062d\u0627\u0644\u0629 \u062f\u0641\u0639 \u0648\u0645\u0635\u062f\u0631 \u062d\u062c\u0632.",
		prev: "\u0627\u0644\u0633\u0627\u0628\u0642",
		next: "\u0627\u0644\u062a\u0627\u0644\u064a",
		loading:
			"\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u0634\u063a\u0627\u0644...",
		loadError:
			"\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0625\u0634\u063a\u0627\u0644",
		selectHotelMessage:
			"\u0627\u062e\u062a\u0631 \u0641\u0646\u062f\u0642\u0627\u064b \u0644\u0639\u0631\u0636 \u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0625\u0634\u063a\u0627\u0644.",
		paymentStatusLabels: {
			"Not Paid": "\u063a\u064a\u0631 \u0645\u062f\u0641\u0648\u0639",
			"Not Captured": "\u063a\u064a\u0631 \u0645\u062d\u0635\u0644",
			Captured: "\u0645\u062d\u0635\u0644",
			"Paid Offline": "\u0645\u062f\u0641\u0648\u0639 \u062e\u0627\u0631\u062c\u064a\u0627\u064b",
		},
		totalAmountSar: "إجمالي المبلغ (ر.س)",
		grossCheckoutBasis: "الإجمالي حسب تاريخ المغادرة",
		reservationsCheckedOut: "حجوزات تمت مغادرتها",
		checkinReservationsSelectedPeriod: "حجوزات الوصول في المدى المحدد",
		totalCheckins: "إجمالي الوصول",
		checkinGrossSar: "إجمالي الوصول (ر.س)",
		averageOccupancyCapped: "متوسط الإشغال",
		occupiedFormula: "الإشغال = الأقل بين المحجوز والطاقة لكل يوم / غرفة.",
		roomNights: "ليالي الغرف",
		occupied: "مشغول",
		remaining: "متبقي",
		capacity: "الطاقة",
		bookedRaw: "المحجوز الخام",
		roomCounts: "أعداد الغرف",
		inventoryUnits: "وحدات المخزون",
		physicalRooms: "الغرف الفعلية",
		inventoryMapping: "مطابقة المخزون",
		unmappedTypes: "أنواع غير مطابقة",
		unmapped: "غير مطابق",
		unmappedMessage:
			"هذه الأنواع موجودة في الحجوزات وليست موجودة في مخزون بيانات الفندق.",
		viewList: "عرض القائمة",
		allMapped: "كلها مطابقة",
		allMappedMessage: "كل أسماء غرف الحجوزات مطابقة لمخزون بيانات الفندق.",
		peakDay: "أعلى يوم",
		booked: "محجوز",
		warnings: "تنبيهات",
		overbooked: "حجز زائد",
		more: "أخرى",
		noOverbooking: "لا يوجد حجز زائد",
		occupancyByRoomType: "الإشغال حسب نوع الغرفة",
		occupiedNights: "ليالي مشغولة",
		bookedLower: "محجوز",
		paymentStatusBreakdown: "تفصيل حالات الدفع",
		bookingSourceTotalsCheckoutSar:
			"إجماليات مصدر الحجز حسب تاريخ المغادرة (ر.س)",
		bookingSourceHeader: "مصدر الحجز",
		totalSar: "الإجمالي (ر.س)",
		unknown: "غير معروف",
		noBookingSourceData: "لا توجد بيانات لمصادر الحجز في هذا المدى",
		paymentStatusTotals: "إجماليات حالات الدفع",
		status: "الحالة",
		reservations: "الحجوزات",
		totalAmount: "إجمالي المبلغ",
		paidAmount: "المبلغ المدفوع",
		onsitePaid: "المدفوع في الفندق",
		noPaymentData: "لا توجد بيانات دفع في هذا المدى",
		checkinDateTotalsSar: "إجماليات تاريخ الوصول حسب حالة الدفع (ر.س)",
		checkinDate: "تاريخ الوصول",
		noCheckinPaymentData: "لا توجد بيانات دفع حسب تاريخ الوصول في هذا المدى",
		checkoutDateTotalsSar: "إجماليات تاريخ المغادرة حسب حالة الدفع (ر.س)",
		checkoutDate: "تاريخ المغادرة",
		noCheckoutPaymentData:
			"لا توجد بيانات دفع حسب تاريخ المغادرة في هذا المدى",
		detailedReservationsList: "قائمة الحجوزات التفصيلية",
		loadingReservations: "جاري تحميل الحجوزات...",
		noReservationsFound: "لا توجد حجوزات",
		reservationsOn: "الحجوزات في",
		selectedDay: "اليوم المحدد",
		unableDayReservations: "تعذر تحميل حجوزات هذا اليوم",
		selectedHotelFallback: "الفندق المحدد",
		allRoomTypes: "كل أنواع الغرف",
		bookedCapacity: "المحجوز / الطاقة",
		overBy: "زيادة بمقدار",
		confirmation: "رقم التأكيد",
		guest: "النزيل",
		phone: "الهاتف",
		checkIn: "الوصول",
		checkOut: "المغادرة",
		roomTypeHeader: "نوع الغرفة",
		count: "العدد",
		payment: "الدفع",
		showDetails: "عرض التفاصيل",
		noReservationsDay: "لا توجد حجوزات لهذا اليوم.",
		loadingReservationDetails: "جاري تحميل تفاصيل الحجز...",
	},
};

const PAYMENT_STATUS_OPTIONS = [
	"Not Paid",
	"Not Captured",
	"Captured",
	"Paid Offline",
];

const EMPTY_LIST = [];

const shortLabel = (label = "") => {
	const words = String(label || "")
		.split(/\s+/)
		.filter(Boolean);
	return words.slice(0, 6).join(" ");
};

// ---------- Room sorting + header helpers ----------
const normLower = (v) => String(v || "").toLowerCase();

const isSharedRoom = (rt = {}) => {
	const label = normLower(rt.label);
	const roomType = normLower(rt.roomType);
	return (
		label.includes("shared") ||
		label.includes("women only") ||
		label.includes("men only") ||
		roomType === "individualbed"
	);
};

const detectBedCount = (rt = {}) => {
	const label = String(rt.label || "");
	const lower = label.toLowerCase();

	// Digits: "7 Beds", "5 bed"
	const digitMatch = lower.match(/(\d+)\s*(?:beds?|bed)\b/);
	if (digitMatch) {
		const n = parseInt(digitMatch[1], 10);
		return Number.isFinite(n) ? n : null;
	}

	// Words
	if (/\bsingle\b/.test(lower)) return 1;
	if (/\bdouble\b/.test(lower)) return 2;
	if (/\btriple\b/.test(lower)) return 3;
	if (/\bquad\b|\bquadruple\b/.test(lower)) return 4;
	if (/\bquintuple\b|\bpentuple\b/.test(lower)) return 5;
	if (/\bsextuple\b/.test(lower)) return 6;
	if (/\bseptuple\b/.test(lower)) return 7;
	if (/\boctuple\b/.test(lower)) return 8;

	return null;
};

const roomSortRank = (rt = {}) => {
	// Shared always last
	if (isSharedRoom(rt)) return 1000;

	const beds = detectBedCount(rt);
	if (beds != null) return beds; // 1..8

	// Unknown types after known but before shared
	const label = normLower(rt.label);
	if (label.includes("family")) return 50;
	return 80;
};

const roomHeaderMain = (rt = {}, isArabic = false) => {
	const text = INVENTORY_TEXT[isArabic ? "ar" : "en"];
	if (isSharedRoom(rt)) return text.shared;
	const beds = detectBedCount(rt);

	if (beds === 1) return text.single;
	if (beds === 2) return text.double;
	if (beds === 3) return text.triple;
	if (beds === 4) return text.quad;
	if (beds && beds >= 5) {
		return text.familyBeds.replace("{beds}", beds);
	}

	// Fallback (rare)
	return shortLabel(rt.label) || text.room;
};

const roomHeaderSub = (rt = {}) => {
	const label = String(rt.label || "").trim();
	if (!label) return "";

	const beds = detectBedCount(rt);
	const parts = label
		.split("–")
		.map((p) => p.trim())
		.filter(Boolean);

	if (parts.length >= 2) {
		const left = parts[0];
		const right = parts.slice(1).join(" – ").trim();

		const rightHasBeds =
			beds != null && new RegExp(`\\b${beds}\\s*beds?\\b`, "i").test(right);

		if (rightHasBeds) {
			let remainder = right
				.replace(new RegExp(`\\b${beds}\\s*beds?\\b`, "i"), "")
				.replace(/^[\s\-–—:]+/, "")
				.trim();
			if (remainder) return `${left} • ${remainder}`;
			return left;
		}

		return right || left;
	}

	// Hyphen fallback
	const hy = label
		.split("-")
		.map((p) => p.trim())
		.filter(Boolean);
	if (hy.length >= 2) return hy.slice(1).join(" - ").trim();

	return "";
};

const QUERY_KEYS = {
	hotelId: "invHotel",
	calendarType: "invCal",
	month: "invMonth",
	hijriMonth: "invHMonth",
	hijriYear: "invHYear",
	start: "invStart",
	end: "invEnd",
	includeCancelled: "invIncCancelled",
	paymentStatuses: "invPayStatuses",
	bookingSources: "invBookingSources",
	displayMode: "invDisplay",
	warningsOpen: "invWarnOpen",
	dayOpen: "invDayOpen",
	dayDate: "invDayDate",
	dayRoomKey: "invDayRoomKey",
	dayRoomLabel: "invDayRoomLabel",
	reportOpen: "invReportOpen",
	reportDate: "invReportDate",
	reportType: "invReportType",
	reportPage: "invReportPage",
	reportSize: "invReportSize",
	reportSearch: "invReportSearch",
	detailsOpen: "invDetailsOpen",
	detailsReservationId: "invDetailsReservationId",
};

const toCleanString = (value) => String(value || "").trim();
const isSameArray = (a = [], b = []) =>
	a.length === b.length && a.every((item, idx) => item === b[idx]);
const normalizeBoolFlag = (value) => {
	const normalized = toCleanString(value).toLowerCase();
	return normalized === "1" || normalized === "true" || normalized === "yes";
};
const normalizeCsvList = (value) =>
	Array.from(
		new Set(
			toCleanString(value)
				.split(",")
				.map((entry) => toCleanString(entry))
				.filter(Boolean),
		),
	);
const normalizeBookingSourcesList = (values = []) =>
	Array.from(
		new Set(
			(values || []).map((source) => toCleanString(source)).filter(Boolean),
		),
	).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
const normalizePaymentStatusesList = (values = []) => {
	const set = new Set((values || []).map((item) => toCleanString(item)));
	return PAYMENT_STATUS_OPTIONS.filter((status) => set.has(status));
};
const normalizeMonthParam = (value) => {
	const normalized = toCleanString(value);
	if (!/^\d{4}-\d{2}$/.test(normalized)) return "";
	const parsed = dayjs(`${normalized}-01`);
	return parsed.isValid() ? normalized : "";
};
const normalizeDateParam = (value) => {
	const normalized = toCleanString(value);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "";
	return dayjs(normalized).isValid() ? normalized : "";
};
const makeDateRangeLabel = (start, end) =>
	start && end ? `${start} - ${end}` : "";
const normalizePositiveInt = (value, fallback, min = 1, max = 9999) => {
	const parsed = Number.parseInt(String(value || ""), 10);
	if (!Number.isFinite(parsed)) return fallback;
	if (parsed < min || parsed > max) return fallback;
	return parsed;
};
const normalizeCalendarType = (value, fallback = "gregorian") => {
	const normalized = toCleanString(value).toLowerCase();
	return normalized === "hijri" ? "hijri" : fallback;
};
const getReservationId = (reservation) =>
	toCleanString(reservation?._id || reservation?.id || "");

const formatHijriCellDate = (date, isArabic = false) => {
	if (!date || !supportsMomentHijri()) return "";
	return formatSaudiHijriDate(date, {
		language: isArabic ? "Arabic" : "English",
		month: "long",
		fallback: "",
	});
};

const supportsMomentHijri = () =>
	typeof moment?.fn?.iMonth === "function" &&
	typeof moment?.fn?.iYear === "function";

const HotelsInventoryMap = ({ chosenLanguage = "English" }) => {
	const isArabic = chosenLanguage === "Arabic";
	const tableLabels = INVENTORY_TEXT[isArabic ? "ar" : "en"];
	const { user, token } = isAuthenticated() || {};

	const supportsHijri = supportsMomentHijri();

	const nowHijri = supportsHijri ? moment() : null;
	const defaultHijriMonth = supportsHijri ? nowHijri.iMonth() : 0;
	const defaultHijriYear = supportsHijri
		? nowHijri.iYear()
		: new Date().getFullYear();
	const defaultHijriStart = supportsHijri
		? nowHijri.clone().startOf("iMonth")
		: null;

	const pickerPopupStyle = { zIndex: 20010 };
	const pickerContainerGetter = (trigger) =>
		(trigger && trigger.parentNode) || document.body;
	const history = useHistory();
	const location = useLocation();
	const initialQueryParamsRef = useRef(
		new URLSearchParams(location.search || ""),
	);
	const initialQueryParams = initialQueryParamsRef.current;

	const initialCalendarFromQuery = normalizeCalendarType(
		initialQueryParams.get(QUERY_KEYS.calendarType),
		defaultHijriStart ? "hijri" : "gregorian",
	);
	const initialCalendarType =
		!supportsHijri && initialCalendarFromQuery === "hijri"
			? "gregorian"
			: initialCalendarFromQuery;
	const initialHijriMonth = normalizePositiveInt(
		initialQueryParams.get(QUERY_KEYS.hijriMonth),
		defaultHijriMonth,
		0,
		11,
	);
	const initialHijriYear = normalizePositiveInt(
		initialQueryParams.get(QUERY_KEYS.hijriYear),
		defaultHijriYear,
		1300,
		1700,
	);
	const initialRangeStartParam = normalizeDateParam(
		initialQueryParams.get(QUERY_KEYS.start),
	);
	const initialRangeEndParam = normalizeDateParam(
		initialQueryParams.get(QUERY_KEYS.end),
	);
	const initialMonthParam = normalizeMonthParam(
		initialQueryParams.get(QUERY_KEYS.month),
	);
	const initialHijriStartMoment =
		supportsHijri && initialCalendarType === "hijri"
			? moment()
					.iYear(initialHijriYear)
					.iMonth(initialHijriMonth)
					.startOf("iMonth")
			: null;
	const initialHijriEndMoment =
		supportsHijri && initialCalendarType === "hijri"
			? moment()
					.iYear(initialHijriYear)
					.iMonth(initialHijriMonth)
					.endOf("iMonth")
			: null;
	const initialRangeStart =
		initialRangeStartParam ||
		(initialHijriStartMoment
			? dayjs(initialHijriStartMoment.toDate()).format("YYYY-MM-DD")
			: "");
	const initialRangeEnd =
		initialRangeEndParam ||
		(initialHijriEndMoment
			? dayjs(initialHijriEndMoment.toDate()).format("YYYY-MM-DD")
			: "");
	const initialExplicitRange =
		Boolean(initialRangeStartParam) && Boolean(initialRangeEndParam);
	const initialRangeOverride =
		initialExplicitRange || (initialCalendarType === "hijri" && initialRangeStart && initialRangeEnd)
			? {
					start: initialRangeStart,
					end: initialRangeEnd,
					label:
						initialCalendarType === "hijri"
							? `${hijriMonthsEn[initialHijriMonth]} ${initialHijriYear}`
							: makeDateRangeLabel(initialRangeStart, initialRangeEnd),
			  }
			: null;
	const initialMonthValue =
		initialCalendarType === "gregorian" && initialMonthParam
			? dayjs(`${initialMonthParam}-01`).startOf("month")
			: initialRangeOverride?.start
			  ? dayjs(initialRangeOverride.start)
			  : defaultHijriStart
			    ? dayjs(defaultHijriStart.toDate())
			    : dayjs().startOf("month");
	const initialDisplayMode =
		toCleanString(initialQueryParams.get(QUERY_KEYS.displayMode)) === "roomType"
			? "roomType"
			: "displayName";
	const initialIncludeCancelled = normalizeBoolFlag(
		initialQueryParams.get(QUERY_KEYS.includeCancelled),
	);
	const initialPaymentStatuses = normalizePaymentStatusesList(
		normalizeCsvList(initialQueryParams.get(QUERY_KEYS.paymentStatuses)),
	);
	const initialBookingSources = normalizeBookingSourcesList(
		normalizeCsvList(initialQueryParams.get(QUERY_KEYS.bookingSources)),
	);
	const initialWarningsOpen = normalizeBoolFlag(
		initialQueryParams.get(QUERY_KEYS.warningsOpen),
	);
	const initialDayOpen = normalizeBoolFlag(
		initialQueryParams.get(QUERY_KEYS.dayOpen),
	);
	const initialDayContext = {
		date: normalizeDateParam(initialQueryParams.get(QUERY_KEYS.dayDate)),
		roomKey: toCleanString(initialQueryParams.get(QUERY_KEYS.dayRoomKey)),
		roomLabel: toCleanString(initialQueryParams.get(QUERY_KEYS.dayRoomLabel)),
	};
	const initialReportTypeRaw = toCleanString(
		initialQueryParams.get(QUERY_KEYS.reportType),
	).toLowerCase();
	const initialReportType =
		initialReportTypeRaw === "checkin" ? "checkin" : "checkout";
	const initialReportOpen = normalizeBoolFlag(
		initialQueryParams.get(QUERY_KEYS.reportOpen),
	);
	const initialReportContext = {
		date: normalizeDateParam(initialQueryParams.get(QUERY_KEYS.reportDate)),
		dateType: initialReportType,
	};
	const initialReportPage = normalizePositiveInt(
		initialQueryParams.get(QUERY_KEYS.reportPage),
		1,
		1,
		2000,
	);
	const initialReportSize = normalizePositiveInt(
		initialQueryParams.get(QUERY_KEYS.reportSize),
		50,
		1,
		2000,
	);
	const initialReportSearch = toCleanString(
		initialQueryParams.get(QUERY_KEYS.reportSearch),
	);
	const initialDetailsOpen = normalizeBoolFlag(
		initialQueryParams.get(QUERY_KEYS.detailsOpen),
	);
	const initialDetailsReservationId = toCleanString(
		initialQueryParams.get(QUERY_KEYS.detailsReservationId),
	);

	const [allHotels, setAllHotels] = useState([]);
	const [selectedHotelId, setSelectedHotelId] = useState(() =>
		toCleanString(initialQueryParams.get(QUERY_KEYS.hotelId)),
	);

	const [monthValue, setMonthValue] = useState(() => initialMonthValue);

	const [calendarType, setCalendarType] = useState(initialCalendarType);
	const [hijriMonth, setHijriMonth] = useState(initialHijriMonth);
	const [hijriYear, setHijriYear] = useState(initialHijriYear);

	const [rangeOverride, setRangeOverride] = useState(
		() => initialRangeOverride,
	);

	const [includeCancelled, setIncludeCancelled] = useState(
		initialIncludeCancelled,
	);
	const [paymentStatuses, setPaymentStatuses] = useState(
		initialPaymentStatuses,
	);
	const [bookingSources, setBookingSources] = useState(initialBookingSources);
	const [allBookingSources, setAllBookingSources] = useState([]);
	const [displayMode, setDisplayMode] = useState(initialDisplayMode);

	const [data, setData] = useState(null);
	const [bookingSourceSummary, setBookingSourceSummary] = useState(null);
	const [checkinDateSummary, setCheckinDateSummary] = useState(null);
	const [checkoutDateSummary, setCheckoutDateSummary] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [warningsModalOpen, setWarningsModalOpen] =
		useState(initialWarningsOpen);
	const [warningsLoading, setWarningsLoading] = useState(false);
	const [warningsData, setWarningsData] = useState([]);

	const [dayDetailsOpen, setDayDetailsOpen] = useState(initialDayOpen);
	const [dayDetailsLoading, setDayDetailsLoading] = useState(initialDayOpen);
	const [dayDetails, setDayDetails] = useState(null);
	const [dayDetailsError, setDayDetailsError] = useState("");
	const [dayDetailsContext, setDayDetailsContext] = useState(initialDayContext);

	const [detailsModalOpen, setDetailsModalOpen] = useState(initialDetailsOpen);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [detailsModalLoading, setDetailsModalLoading] =
		useState(initialDetailsOpen);
	const [detailsReservationId, setDetailsReservationId] = useState(
		initialDetailsReservationId,
	);
	const [reportModalOpen, setReportModalOpen] = useState(initialReportOpen);
	const [reportModalLoading, setReportModalLoading] =
		useState(initialReportOpen);
	const [reportModalContext, setReportModalContext] =
		useState(initialReportContext);
	const [reportModalData, setReportModalData] = useState({
		data: [],
		totalDocuments: 0,
		scorecards: {},
	});
	const [reportCurrentPage, setReportCurrentPage] = useState(initialReportPage);
	const [reportPageSize, setReportPageSize] = useState(initialReportSize);
	const [reportSearchTerm, setReportSearchTerm] = useState(initialReportSearch);
	const dayRestoreKeyRef = useRef("");
	const reportRestoreKeyRef = useRef("");
	const detailsRestoreKeyRef = useRef("");

	const formatInt = (val = 0) => Number(val || 0).toLocaleString("en-US");
	const formatCurrency = (val = 0) =>
		Number(val || 0).toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});

	const sortedHotels = useMemo(() => {
		const hotels = Array.isArray(allHotels) ? allHotels : [];
		return hotels
			.map((h) => ({ _id: h?._id, hotelName: h?.hotelName || "" }))
			.filter((h) => h._id && h.hotelName)
			.sort((a, b) =>
				a.hotelName.localeCompare(b.hotelName, undefined, {
					sensitivity: "base",
				}),
			);
	}, [allHotels]);

	const days = data?.days || [];
	const summary = data?.summary || {};

	// ✅ Sort room types in requested order (1..7, shared last, derived after non-derived in same rank)
	const roomTypes = useMemo(() => {
		const rawRoomTypes = data?.roomTypes || [];
		const list = Array.isArray(rawRoomTypes) ? [...rawRoomTypes] : [];
		list.sort((a, b) => {
			const ra = roomSortRank(a);
			const rb = roomSortRank(b);
			if (ra !== rb) return ra - rb;

			// keep derived after normal if same category
			const da = !!a?.derived;
			const db = !!b?.derived;
			if (da !== db) return da ? 1 : -1;

			return String(a?.label || "").localeCompare(
				String(b?.label || ""),
				undefined,
				{
					sensitivity: "base",
				},
			);
		});
		return list;
	}, [data?.roomTypes]);

	const derivedRoomTypes = useMemo(
		() => roomTypes.filter((rt) => !!rt?.derived),
		[roomTypes],
	);

	const derivedCount = derivedRoomTypes.length;
	const derivedTooltip = useMemo(() => {
		if (!derivedCount) return "";
		return derivedRoomTypes.map((rt) => rt.label || rt.key).join(", ");
	}, [derivedCount, derivedRoomTypes]);

	const hijriAvailable = supportsHijri;

	const capacityRoomNights =
		Number(summary.capacityRoomNights) ||
		Number(summary.availableRoomNights) ||
		0;
	const occupiedRoomNights =
		Number(summary.occupiedRoomNights) || Number(summary.soldRoomNights) || 0;
	const remainingRoomNights =
		typeof summary.remainingRoomNights === "number"
			? Number(summary.remainingRoomNights)
			: Math.max(capacityRoomNights - occupiedRoomNights, 0);

	const bookedRoomNights =
		typeof summary.bookedRoomNights === "number"
			? summary.bookedRoomNights
			: null;

	const totalRoomsAll =
		Number(summary.totalRoomsAll) || Number(summary.totalRooms) || 0;
	const totalPhysicalRooms = Number(summary.totalPhysicalRooms) || 0;

	const paymentBreakdown = Array.isArray(summary.paymentBreakdown)
		? summary.paymentBreakdown
		: [];
	const bookingSourceMatrix = bookingSourceSummary || {};
	const checkinDateMatrix = checkinDateSummary || {};
	const checkoutDateMatrix = checkoutDateSummary || {};
	const bookingSourceStatusesRaw = Array.isArray(bookingSourceMatrix.statuses)
		? bookingSourceMatrix.statuses
		: [];
	const checkinDateStatusesRaw = Array.isArray(checkinDateMatrix.statuses)
		? checkinDateMatrix.statuses
		: [];
	const checkoutDateStatusesRaw = Array.isArray(checkoutDateMatrix.statuses)
		? checkoutDateMatrix.statuses
		: [];
	const paymentStatusOrder = [
		"Captured",
		"Paid Offline",
		"Not Captured",
		"Not Paid",
	];
	const paymentStatusHeaders =
		bookingSourceStatusesRaw.length ||
		checkinDateStatusesRaw.length ||
		checkoutDateStatusesRaw.length
			? [
					...paymentStatusOrder.filter(
						(status) =>
							bookingSourceStatusesRaw.includes(status) ||
							checkinDateStatusesRaw.includes(status) ||
							checkoutDateStatusesRaw.includes(status),
					),
					...Array.from(
						new Set([
							...bookingSourceStatusesRaw,
							...checkinDateStatusesRaw,
							...checkoutDateStatusesRaw,
						]),
					).filter((status) => !paymentStatusOrder.includes(status)),
			  ]
			: paymentStatusOrder;
	const bookingSourceRows = Array.isArray(bookingSourceMatrix.rows)
		? bookingSourceMatrix.rows
		: EMPTY_LIST;
	const bookingSourceOptions = useMemo(() => {
		const merged = new Set();
		(allBookingSources || []).forEach((source) => {
			const cleaned = String(source || "").trim();
			if (cleaned) merged.add(cleaned);
		});
		bookingSourceRows.forEach((row) => {
			const cleaned = String(row?.booking_source || "").trim();
			if (cleaned) merged.add(cleaned);
		});
		(bookingSources || []).forEach((source) => {
			const cleaned = String(source || "").trim();
			if (cleaned) merged.add(cleaned);
		});
		return Array.from(merged).sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: "base" }),
		);
	}, [allBookingSources, bookingSourceRows, bookingSources]);
	const bookingSourceColumnTotals = bookingSourceMatrix.columnTotals || {};
	const bookingSourceOverallTotal = Number(
		bookingSourceMatrix.overallTotal || 0,
	);
	const checkinDateRows = Array.isArray(checkinDateMatrix.rows)
		? checkinDateMatrix.rows
		: EMPTY_LIST;
	const checkinDateColumnTotals = checkinDateMatrix.columnTotals || {};
	const checkinDateOverallTotal = Number(checkinDateMatrix.overallTotal || 0);
	const checkinDateOverallReservations = Number(
		checkinDateMatrix.overallReservationsCount || 0,
	);
	const checkoutDateRows = Array.isArray(checkoutDateMatrix.rows)
		? checkoutDateMatrix.rows
		: EMPTY_LIST;
	const checkoutDateColumnTotals = checkoutDateMatrix.columnTotals || {};
	const checkoutDateOverallTotal = Number(checkoutDateMatrix.overallTotal || 0);
	const checkoutDateOverallReservations = Number(
		checkoutDateMatrix.overallReservationsCount || 0,
	);
	const checkoutGrossAmount = checkoutDateOverallTotal;
	const checkoutReservationsCount = checkoutDateOverallReservations;
	const checkinReservationsCount = Number(
		checkinDateMatrix.overallReservationsCount ??
			summary.checkinReservationsCount ??
			0,
	);
	const checkinGrossAmount = Number(
		checkinDateMatrix.overallTotal ?? summary.checkinGrossTotal ?? 0,
	);

	const selectedHotelName = useMemo(() => {
		const byId = sortedHotels.find(
			(h) => String(h._id) === String(selectedHotelId),
		);
		if (byId?.hotelName) return byId.hotelName;
		const fromPayload = data?.hotel?.hotelName;
		return fromPayload ? String(fromPayload) : "";
	}, [data?.hotel?.hotelName, selectedHotelId, sortedHotels]);

	const monthLabel = useMemo(() => {
		if (rangeOverride?.start && rangeOverride?.end) {
			if (calendarType !== "hijri") {
				const language = isArabic ? "Arabic" : "English";
				const startLabel = formatSaudiGregorianDate(rangeOverride.start, {
					language,
					month: "long",
					fallback: rangeOverride.start,
				});
				const endLabel = formatSaudiGregorianDate(rangeOverride.end, {
					language,
					month: "long",
					fallback: rangeOverride.end,
				});
				return `${tableLabels.gregorian}: ${startLabel} - ${endLabel}`;
			}
			const months = isArabic ? hijriMonthsAr : hijriMonthsEn;
			const monthName = months[Number(hijriMonth)] || rangeOverride?.label || "";
			return `${tableLabels.hijri}: ${monthName} ${hijriYear}`;
		}
		if (calendarType === "hijri") {
			const months = isArabic ? hijriMonthsAr : hijriMonthsEn;
			const monthName = months[Number(hijriMonth)] || "";
			return `${tableLabels.hijri}: ${monthName} ${hijriYear}`;
		}
		const gregorianLabel = isArabic
			? new Intl.DateTimeFormat("ar-EG", {
					month: "long",
					year: "numeric",
			  }).format(monthValue.toDate())
			: monthValue.format("MMMM YYYY");
		return `${tableLabels.gregorian}: ${gregorianLabel}`;
	}, [
		calendarType,
		hijriMonth,
		hijriYear,
		isArabic,
		monthValue,
		rangeOverride?.end,
		rangeOverride?.label,
		rangeOverride?.start,
		tableLabels.gregorian,
		tableLabels.hijri,
	]);

	const firstWarning = summary?.warnings?.[0];

	// ✅ Make columns dynamic width depending on how many room types exist
	const colWidth = useMemo(() => {
		const n = roomTypes.length;
		if (n <= 3) return 200;
		if (n <= 4) return 185;
		if (n <= 6) return 160;
		if (n <= 8) return 145;
		if (n <= 10) return 130;
		if (n <= 12) return 118;
		if (n <= 15) return 110;
		return 105;
	}, [roomTypes.length]);

	// Build occupancyByType in same sorted order, plus derived flag
	const occupancyByTypeSorted = useMemo(() => {
		const arr = Array.isArray(summary?.occupancyByType)
			? summary.occupancyByType
			: [];
		const map = new Map(arr.map((x) => [x.key, x]));
		const out = roomTypes
			.map((rt) => {
				const it = map.get(rt.key);
				if (!it) return null;
				return {
					...it,
					label: rt.label || it.label,
					color: rt.color || it.color,
					derived: !!rt.derived,
				};
			})
			.filter(Boolean);

		// In case backend returned a key not present in roomTypes (rare), append it.
		arr.forEach((it) => {
			if (!map.has(it.key)) return;
			const exists = out.some((x) => x.key === it.key);
			if (!exists) out.push(it);
		});

		return out;
	}, [roomTypes, summary?.occupancyByType]);

	const getPaymentStatusStyles = (status = "") => {
		const s = String(status || "").toLowerCase();
		if (s === "captured") return { backgroundColor: "var(--badge-bg-green)" };
		if (s === "paid offline")
			return {
				backgroundColor: "var(--accent-color-dark-green)",
				color: "#fff",
			};
		if (s === "not captured")
			return { backgroundColor: "var(--background-accent-yellow)" };
		if (s === "not paid")
			return { backgroundColor: "var(--badge-bg-red)", color: "#fff" };
		return { backgroundColor: "var(--background-light)" };
	};

	const getReservationStatusStyles = (status = "") => {
		const s = String(status || "").toLowerCase();
		if (s === "confirmed")
			return { backgroundColor: "var(--background-light)" };
		if (s === "inhouse")
			return { backgroundColor: "var(--background-accent-yellow)" };
		if (s === "checked_out" || s === "early_checked_out")
			return { backgroundColor: "var(--badge-bg-green)" };
		if (s === "no_show")
			return { backgroundColor: "var(--accent-color-orange)" };
		if (s === "cancelled")
			return { backgroundColor: "var(--badge-bg-red)", color: "#fff" };
		return {};
	};

	const paymentLabel = (status, label) => label || status || "-";

	const formatDualDate = useCallback(
		(dateValue) => {
			const language = isArabic ? "Arabic" : "English";
			const gregDate = formatSaudiGregorianDate(dateValue, {
				language,
				month: "long",
				fallback: dateValue || "n/a",
			});
			const hijriDate =
				hijriAvailable && dateValue
					? formatSaudiHijriDate(dateValue, {
							language,
							month: "long",
							fallback: "",
					  })
					: "";
			return { gregDate, hijriDate };
		},
		[hijriAvailable, isArabic],
	);

	// ------------------ Load hotels ------------------
	const loadHotels = useCallback(() => {
		if (!user?._id || !token) return;
		gettingHotelDetailsForAdmin(user._id, token)
			.then((res) => setAllHotels(extractHotels(res)))
			.catch(() => setAllHotels([]));
	}, [token, user?._id]);

	useEffect(() => {
		loadHotels();
	}, [loadHotels]);

	const loadBookingSources = useCallback(() => {
		if (!user?._id || !token) return;
		getDistinctBookingSources(user._id, token)
			.then((sources) =>
				setAllBookingSources(Array.isArray(sources) ? sources : []),
			)
			.catch(() => setAllBookingSources([]));
	}, [token, user?._id]);

	useEffect(() => {
		loadBookingSources();
	}, [loadBookingSources]);

	// ------------------ Fetch occupancy ------------------
	const fetchOccupancy = useCallback(async () => {
		if (!user?._id || !token || !selectedHotelId) return;

		setLoading(true);
		setError("");

		try {
			const [
				occupancyResult,
				bookingSourceResult,
				checkoutDateResult,
				checkinDateResult,
			] = await Promise.allSettled([
				getHotelOccupancyCalendar(user._id, token, {
					hotelId: selectedHotelId,
					month: rangeOverride ? null : monthValue.format("YYYY-MM"),
					start: rangeOverride?.start || null,
					end: rangeOverride?.end || null,
					includeCancelled,
					display: displayMode,
					paymentStatuses,
					bookingSources,
				}),
				getBookingSourcePaymentSummary(user._id, token, {
					hotelId: selectedHotelId,
					month: rangeOverride ? null : monthValue.format("YYYY-MM"),
					start: rangeOverride?.start || null,
					end: rangeOverride?.end || null,
					includeCancelled,
					paymentStatuses,
					dateBasis: "checkout",
					bookingSources,
				}),
				getCheckoutDatePaymentSummary(user._id, token, {
					hotelId: selectedHotelId,
					month: rangeOverride ? null : monthValue.format("YYYY-MM"),
					start: rangeOverride?.start || null,
					end: rangeOverride?.end || null,
					includeCancelled,
					paymentStatuses,
					bookingSources,
					dateBasis: "checkout",
				}),
				getCheckoutDatePaymentSummary(user._id, token, {
					hotelId: selectedHotelId,
					month: rangeOverride ? null : monthValue.format("YYYY-MM"),
					start: rangeOverride?.start || null,
					end: rangeOverride?.end || null,
					includeCancelled,
					paymentStatuses,
					bookingSources,
					dateBasis: "checkin",
				}),
			]);

			if (occupancyResult.status === "fulfilled") {
				setData(occupancyResult.value);
			} else {
				setError(occupancyResult.reason?.message || "Failed to load occupancy");
				setData(null);
			}

			if (bookingSourceResult.status === "fulfilled") {
				setBookingSourceSummary(
					bookingSourceResult.value?.data || bookingSourceResult.value || null,
				);
			} else {
				setBookingSourceSummary(null);
			}
			if (checkoutDateResult.status === "fulfilled") {
				setCheckoutDateSummary(
					checkoutDateResult.value?.data || checkoutDateResult.value || null,
				);
			} else {
				setCheckoutDateSummary(null);
			}
			if (checkinDateResult.status === "fulfilled") {
				setCheckinDateSummary(
					checkinDateResult.value?.data || checkinDateResult.value || null,
				);
			} else {
				setCheckinDateSummary(null);
			}
		} catch (err) {
			setError(err?.message || "Failed to load occupancy");
			setData(null);
			setBookingSourceSummary(null);
			setCheckoutDateSummary(null);
			setCheckinDateSummary(null);
		} finally {
			setLoading(false);
		}
	}, [
		displayMode,
		bookingSources,
		includeCancelled,
		monthValue,
		rangeOverride,
		selectedHotelId,
		token,
		user?._id,
		paymentStatuses,
	]);

	useEffect(() => {
		fetchOccupancy();
	}, [fetchOccupancy]);

	const onMonthChange = (val) => {
		if (val) {
			setMonthValue(val.startOf("month"));
			setRangeOverride(null);
		}
	};

	const onHijriChange = (nextMonth, nextYear) => {
		if (!supportsHijri) return;

		const hStart = moment().iYear(nextYear).iMonth(nextMonth).startOf("iMonth");
		const hEnd = moment().iYear(nextYear).iMonth(nextMonth).endOf("iMonth");

		setHijriMonth(nextMonth);
		setHijriYear(nextYear);

		setRangeOverride({
			start: dayjs(hStart.toDate()).format("YYYY-MM-DD"),
			end: dayjs(hEnd.toDate()).format("YYYY-MM-DD"),
			label: `${hijriMonthsEn[nextMonth]} ${nextYear}`,
		});

		setMonthValue(dayjs(hStart.toDate()));
	};

	useEffect(() => {
		const params = new URLSearchParams(location.search || "");
		const nextHotelId = toCleanString(params.get(QUERY_KEYS.hotelId));
		const nextCalendarRaw = normalizeCalendarType(
			params.get(QUERY_KEYS.calendarType),
			supportsHijri ? "hijri" : "gregorian",
		);
		const nextCalendarType =
			!supportsHijri && nextCalendarRaw === "hijri"
				? "gregorian"
				: nextCalendarRaw;
		const nextHijriMonth = normalizePositiveInt(
			params.get(QUERY_KEYS.hijriMonth),
			defaultHijriMonth,
			0,
			11,
		);
		const nextHijriYear = normalizePositiveInt(
			params.get(QUERY_KEYS.hijriYear),
			defaultHijriYear,
			1300,
			1700,
		);
		const nextDisplayMode =
			toCleanString(params.get(QUERY_KEYS.displayMode)) === "roomType"
				? "roomType"
				: "displayName";
		const nextIncludeCancelled = normalizeBoolFlag(
			params.get(QUERY_KEYS.includeCancelled),
		);
		const nextPaymentStatuses = normalizePaymentStatusesList(
			normalizeCsvList(params.get(QUERY_KEYS.paymentStatuses)),
		);
		const nextBookingSources = normalizeBookingSourcesList(
			normalizeCsvList(params.get(QUERY_KEYS.bookingSources)),
		);
		const nextWarningsOpen = normalizeBoolFlag(
			params.get(QUERY_KEYS.warningsOpen),
		);
		const nextDayOpen = normalizeBoolFlag(params.get(QUERY_KEYS.dayOpen));
		const nextDayContext = {
			date: normalizeDateParam(params.get(QUERY_KEYS.dayDate)),
			roomKey: toCleanString(params.get(QUERY_KEYS.dayRoomKey)),
			roomLabel: toCleanString(params.get(QUERY_KEYS.dayRoomLabel)),
		};
		const nextReportOpen = normalizeBoolFlag(params.get(QUERY_KEYS.reportOpen));
		const nextReportTypeRaw = toCleanString(
			params.get(QUERY_KEYS.reportType),
		).toLowerCase();
		const nextReportContext = {
			date: normalizeDateParam(params.get(QUERY_KEYS.reportDate)),
			dateType: nextReportTypeRaw === "checkin" ? "checkin" : "checkout",
		};
		const nextReportPage = normalizePositiveInt(
			params.get(QUERY_KEYS.reportPage),
			1,
			1,
			2000,
		);
		const nextReportSize = normalizePositiveInt(
			params.get(QUERY_KEYS.reportSize),
			50,
			1,
			2000,
		);
		const nextReportSearch = toCleanString(params.get(QUERY_KEYS.reportSearch));
		const nextDetailsOpen = normalizeBoolFlag(
			params.get(QUERY_KEYS.detailsOpen),
		);
		const nextDetailsReservationId = toCleanString(
			params.get(QUERY_KEYS.detailsReservationId),
		);

		setSelectedHotelId((prev) => (prev === nextHotelId ? prev : nextHotelId));
		setCalendarType((prev) =>
			prev === nextCalendarType ? prev : nextCalendarType,
		);
		setHijriMonth((prev) => (prev === nextHijriMonth ? prev : nextHijriMonth));
		setHijriYear((prev) => (prev === nextHijriYear ? prev : nextHijriYear));
		setDisplayMode((prev) =>
			prev === nextDisplayMode ? prev : nextDisplayMode,
		);
		setIncludeCancelled((prev) =>
			prev === nextIncludeCancelled ? prev : nextIncludeCancelled,
		);
		setPaymentStatuses((prev) =>
			isSameArray(prev, nextPaymentStatuses) ? prev : nextPaymentStatuses,
		);
		setBookingSources((prev) =>
			isSameArray(prev, nextBookingSources) ? prev : nextBookingSources,
		);
		setWarningsModalOpen((prev) =>
			prev === nextWarningsOpen ? prev : nextWarningsOpen,
		);
		setDayDetailsOpen((prev) => (prev === nextDayOpen ? prev : nextDayOpen));
		setDayDetailsContext((prev) =>
			prev?.date === nextDayContext.date &&
			prev?.roomKey === nextDayContext.roomKey &&
			prev?.roomLabel === nextDayContext.roomLabel
				? prev
				: nextDayContext,
		);
		setReportModalOpen((prev) =>
			prev === nextReportOpen ? prev : nextReportOpen,
		);
		setReportModalContext((prev) =>
			prev?.date === nextReportContext.date &&
			prev?.dateType === nextReportContext.dateType
				? prev
				: nextReportContext,
		);
		setReportCurrentPage((prev) =>
			prev === nextReportPage ? prev : nextReportPage,
		);
		setReportPageSize((prev) =>
			prev === nextReportSize ? prev : nextReportSize,
		);
		setReportSearchTerm((prev) =>
			prev === nextReportSearch ? prev : nextReportSearch,
		);
		setDetailsModalOpen((prev) =>
			prev === nextDetailsOpen ? prev : nextDetailsOpen,
		);
		setDetailsReservationId((prev) =>
			prev === nextDetailsReservationId ? prev : nextDetailsReservationId,
		);

		const dateStart = normalizeDateParam(params.get(QUERY_KEYS.start));
		const dateEnd = normalizeDateParam(params.get(QUERY_KEYS.end));
		if (dateStart && dateEnd) {
			const nextRange = {
				start: dateStart,
				end: dateEnd,
				label:
					nextCalendarType === "hijri"
						? `${hijriMonthsEn[nextHijriMonth]} ${nextHijriYear}`
						: makeDateRangeLabel(dateStart, dateEnd),
			};
			setRangeOverride((prev) =>
				prev?.start === nextRange.start &&
				prev?.end === nextRange.end &&
				prev?.label === nextRange.label
					? prev
					: nextRange,
			);
			setMonthValue((prev) => {
				const nextMonthDate = dayjs(nextRange.start);
				return prev?.isSame(nextMonthDate, "day") ? prev : nextMonthDate;
			});
		} else if (nextCalendarType === "hijri" && supportsHijri) {
			const fallbackStart = dayjs(
				moment()
					.iYear(nextHijriYear)
					.iMonth(nextHijriMonth)
					.startOf("iMonth")
					.toDate(),
			).format("YYYY-MM-DD");
			const fallbackEnd = dayjs(
				moment()
					.iYear(nextHijriYear)
					.iMonth(nextHijriMonth)
					.endOf("iMonth")
					.toDate(),
			).format("YYYY-MM-DD");
			const nextRange = {
				start: dateStart || fallbackStart,
				end: dateEnd || fallbackEnd,
				label: `${hijriMonthsEn[nextHijriMonth]} ${nextHijriYear}`,
			};
			setRangeOverride((prev) =>
				prev?.start === nextRange.start &&
				prev?.end === nextRange.end &&
				prev?.label === nextRange.label
					? prev
					: nextRange,
			);
			setMonthValue((prev) => {
				const nextMonthDate = dayjs(nextRange.start);
				return prev?.isSame(nextMonthDate, "day") ? prev : nextMonthDate;
			});
		} else {
			const nextMonthParam = normalizeMonthParam(params.get(QUERY_KEYS.month));
			const nextMonthDate = nextMonthParam
				? dayjs(`${nextMonthParam}-01`).startOf("month")
				: dayjs().startOf("month");
			setRangeOverride((prev) => (prev === null ? prev : null));
			setMonthValue((prev) =>
				prev?.isSame(nextMonthDate, "month") ? prev : nextMonthDate,
			);
		}

		if (!nextDayOpen) {
			setDayDetailsLoading(false);
			setDayDetailsError("");
		}
		if (!nextReportOpen) {
			setReportModalLoading(false);
		}
		if (!nextDetailsOpen) {
			setDetailsModalLoading(false);
			setSelectedReservation(null);
		}
	}, [defaultHijriMonth, defaultHijriYear, location.search, supportsHijri]);

	useEffect(() => {
		const params = new URLSearchParams(location.search || "");
		let changed = false;
		const setParam = (key, value) => {
			const normalized = toCleanString(value);
			if (!normalized) {
				if (params.has(key)) {
					params.delete(key);
					changed = true;
				}
				return;
			}
			if (params.get(key) !== normalized) {
				params.set(key, normalized);
				changed = true;
			}
		};
		const deleteParam = (key) => {
			if (params.has(key)) {
				params.delete(key);
				changed = true;
			}
		};

		const normalizedBookingSources =
			normalizeBookingSourcesList(bookingSources);
		const normalizedPaymentStatuses =
			normalizePaymentStatusesList(paymentStatuses);
		const activeDayDate = normalizeDateParam(
			dayDetailsContext?.date || dayDetails?.date || "",
		);
		const activeDayRoomKey = toCleanString(
			dayDetailsContext?.roomKey || dayDetails?.roomKey || "",
		);
		const activeDayRoomLabel = toCleanString(
			dayDetailsContext?.roomLabel || dayDetails?.roomLabel || "",
		);
		const activeReportDate = normalizeDateParam(reportModalContext?.date || "");
		const activeReportType =
			reportModalContext?.dateType === "checkin" ? "checkin" : "checkout";
		const activeDetailsReservationId =
			toCleanString(detailsReservationId) ||
			getReservationId(selectedReservation);

		setParam(QUERY_KEYS.hotelId, selectedHotelId);
		setParam(
			QUERY_KEYS.calendarType,
			calendarType === "hijri" && supportsHijri ? "hijri" : "gregorian",
		);
		if (calendarType === "hijri" && supportsHijri) {
			const fallbackHijriStart = dayjs(
				moment().iYear(hijriYear).iMonth(hijriMonth).startOf("iMonth").toDate(),
			).format("YYYY-MM-DD");
			const fallbackHijriEnd = dayjs(
				moment().iYear(hijriYear).iMonth(hijriMonth).endOf("iMonth").toDate(),
			).format("YYYY-MM-DD");
			setParam(QUERY_KEYS.hijriMonth, String(hijriMonth));
			setParam(QUERY_KEYS.hijriYear, String(hijriYear));
			setParam(QUERY_KEYS.start, rangeOverride?.start || fallbackHijriStart);
			setParam(QUERY_KEYS.end, rangeOverride?.end || fallbackHijriEnd);
			deleteParam(QUERY_KEYS.month);
		} else {
			deleteParam(QUERY_KEYS.hijriMonth);
			deleteParam(QUERY_KEYS.hijriYear);
			if (rangeOverride?.start && rangeOverride?.end) {
				setParam(QUERY_KEYS.start, rangeOverride.start);
				setParam(QUERY_KEYS.end, rangeOverride.end);
				deleteParam(QUERY_KEYS.month);
			} else {
				setParam(QUERY_KEYS.month, monthValue?.format("YYYY-MM"));
				deleteParam(QUERY_KEYS.start);
				deleteParam(QUERY_KEYS.end);
			}
		}
		setParam(QUERY_KEYS.includeCancelled, includeCancelled ? "1" : "");
		setParam(
			QUERY_KEYS.paymentStatuses,
			normalizedPaymentStatuses.length
				? normalizedPaymentStatuses.join(",")
				: "",
		);
		setParam(
			QUERY_KEYS.bookingSources,
			normalizedBookingSources.length ? normalizedBookingSources.join(",") : "",
		);
		setParam(
			QUERY_KEYS.displayMode,
			displayMode === "roomType" ? "roomType" : "",
		);
		setParam(QUERY_KEYS.warningsOpen, warningsModalOpen ? "1" : "");

		if (dayDetailsOpen && activeDayDate) {
			setParam(QUERY_KEYS.dayOpen, "1");
			setParam(QUERY_KEYS.dayDate, activeDayDate);
			setParam(QUERY_KEYS.dayRoomKey, activeDayRoomKey);
			setParam(QUERY_KEYS.dayRoomLabel, activeDayRoomLabel);
		} else {
			deleteParam(QUERY_KEYS.dayOpen);
			deleteParam(QUERY_KEYS.dayDate);
			deleteParam(QUERY_KEYS.dayRoomKey);
			deleteParam(QUERY_KEYS.dayRoomLabel);
		}

		if (reportModalOpen && activeReportDate) {
			setParam(QUERY_KEYS.reportOpen, "1");
			setParam(QUERY_KEYS.reportDate, activeReportDate);
			setParam(QUERY_KEYS.reportType, activeReportType);
			setParam(QUERY_KEYS.reportPage, String(reportCurrentPage || 1));
			setParam(QUERY_KEYS.reportSize, String(reportPageSize || 50));
			setParam(QUERY_KEYS.reportSearch, reportSearchTerm);
		} else {
			deleteParam(QUERY_KEYS.reportOpen);
			deleteParam(QUERY_KEYS.reportDate);
			deleteParam(QUERY_KEYS.reportType);
			deleteParam(QUERY_KEYS.reportPage);
			deleteParam(QUERY_KEYS.reportSize);
			deleteParam(QUERY_KEYS.reportSearch);
		}

		if (detailsModalOpen && activeDetailsReservationId) {
			setParam(QUERY_KEYS.detailsOpen, "1");
			setParam(QUERY_KEYS.detailsReservationId, activeDetailsReservationId);
		} else {
			deleteParam(QUERY_KEYS.detailsOpen);
			deleteParam(QUERY_KEYS.detailsReservationId);
		}

		if (!changed) return;
		const nextSearch = params.toString();
		history.replace({
			pathname: location.pathname,
			search: nextSearch ? `?${nextSearch}` : "",
		});
	}, [
		bookingSources,
		calendarType,
		dayDetails?.date,
		dayDetails?.roomKey,
		dayDetails?.roomLabel,
		dayDetailsContext?.date,
		dayDetailsContext?.roomKey,
		dayDetailsContext?.roomLabel,
		dayDetailsOpen,
		detailsModalOpen,
		detailsReservationId,
		displayMode,
		history,
		hijriMonth,
		hijriYear,
		includeCancelled,
		location.pathname,
		location.search,
		monthValue,
		paymentStatuses,
		rangeOverride?.end,
		rangeOverride?.start,
		reportCurrentPage,
		reportModalContext?.date,
		reportModalContext?.dateType,
		reportModalOpen,
		reportPageSize,
		reportSearchTerm,
		selectedHotelId,
		selectedReservation,
		supportsHijri,
		warningsModalOpen,
	]);

	// ------------------ Warnings ------------------
	const fetchWarnings = useCallback(async () => {
		if (!user?._id || !token || !selectedHotelId) return;

		setWarningsLoading(true);
		try {
			const payload = await getHotelOccupancyWarnings(user._id, token, {
				hotelId: selectedHotelId,
				month: rangeOverride ? null : monthValue.format("YYYY-MM"),
				start: rangeOverride?.start || null,
				end: rangeOverride?.end || null,
				includeCancelled,
				display: displayMode,
				paymentStatuses,
				bookingSources,
			});
			setWarningsData(payload?.warnings || []);
		} catch {
			setWarningsData([]);
		} finally {
			setWarningsLoading(false);
		}
	}, [
		displayMode,
		bookingSources,
		includeCancelled,
		monthValue,
		rangeOverride,
		selectedHotelId,
		token,
		user?._id,
		paymentStatuses,
	]);

	useEffect(() => {
		if (warningsModalOpen) fetchWarnings();
	}, [fetchWarnings, warningsModalOpen]);

	// ------------------ Day details ------------------
	const fetchDayDetails = useCallback(
		async ({ date, roomType } = {}) => {
			const normalizedDate = normalizeDateParam(date);
			if (!user?._id || !token || !selectedHotelId || !normalizedDate) return;
			const roomKey = toCleanString(roomType?.key);
			const roomLabel = toCleanString(roomType?.label);
			dayRestoreKeyRef.current = [
				selectedHotelId,
				normalizedDate,
				roomKey,
				roomLabel,
			].join("|");
			setDayDetailsContext({
				date: normalizedDate,
				roomKey,
				roomLabel,
			});

			setDayDetailsOpen(true);
			setDayDetailsLoading(true);
			setDayDetailsError("");

			try {
				const payload = await getHotelOccupancyDayReservations(
					user._id,
					token,
					{
						hotelId: selectedHotelId,
						date: normalizedDate,
						roomKey: roomType?.key || null,
						roomLabel: roomType?.label || null,
						includeCancelled,
						display: displayMode,
						paymentStatuses,
						bookingSources,
					},
				);
				setDayDetails(payload);
				setDayDetailsContext((prev) => ({
					date: toCleanString(payload?.date || prev?.date || normalizedDate),
					roomKey: toCleanString(
						payload?.roomKey || prev?.roomKey || roomType?.key || "",
					),
					roomLabel: toCleanString(
						payload?.roomLabel || prev?.roomLabel || roomType?.label || "",
					),
				}));
			} catch (err) {
				setDayDetails(null);
				setDayDetailsError(
					err?.message || "Failed to load reservations for this day.",
				);
			} finally {
				setDayDetailsLoading(false);
			}
		},
		[
			displayMode,
			bookingSources,
			includeCancelled,
			paymentStatuses,
			selectedHotelId,
			token,
			user?._id,
		],
	);

	const handleReservationUpdated = useCallback(
		(updated) => {
			if (updated) {
				setSelectedReservation((prev) => {
					const merged = prev ? { ...prev, ...updated } : updated;
					if (
						prev?.hotelId &&
						(!merged.hotelId ||
							typeof merged.hotelId !== "object" ||
							!merged.hotelId.hotelName)
					) {
						merged.hotelId = prev.hotelId;
					}
					return merged;
				});
			}

			if (dayDetailsOpen && dayDetails?.date) {
				fetchDayDetails({
					date: dayDetails.date,
					roomType: dayDetails.roomKey
						? { key: dayDetails.roomKey, label: dayDetails.roomLabel }
						: null,
				});
			}

			fetchOccupancy();
			if (warningsModalOpen) fetchWarnings();
		},
		[
			dayDetails?.date,
			dayDetails?.roomKey,
			dayDetails?.roomLabel,
			dayDetailsOpen,
			fetchDayDetails,
			fetchOccupancy,
			fetchWarnings,
			warningsModalOpen,
		],
	);

	const normalizeReservationForDetails = useCallback((reservation) => {
		if (!reservation) return null;
		const customer = reservation?.customer_details || {};
		return {
			...reservation,
			total_amount: reservation?.total_amount ?? 0,
			paid_amount: reservation?.paid_amount ?? 0,
			pickedRoomsType: Array.isArray(reservation?.pickedRoomsType)
				? reservation.pickedRoomsType
				: [],
			customer_details: customer,
			payment_details: reservation?.payment_details || {},
			roomId: Array.isArray(reservation?.roomId)
				? reservation.roomId
				: reservation?.roomId
				  ? [reservation.roomId]
				  : [],
			roomDetails: Array.isArray(reservation?.roomDetails)
				? reservation.roomDetails
				: [],
			room_numbers: Array.isArray(reservation?.room_numbers)
				? reservation.room_numbers
				: [],
			bedNumber: Array.isArray(reservation?.bedNumber)
				? reservation.bedNumber
				: [],
			comment: reservation?.comment || "",
			total_guests: reservation?.total_guests ?? customer?.total_guests ?? 0,
			booked_at: reservation?.booked_at || reservation?.createdAt || null,
		};
	}, []);

	const openReservationDetails = useCallback(
		async (reservation) => {
			if (!reservation) return;
			const reservationId = getReservationId(reservation);
			if (!reservationId) return;
			detailsRestoreKeyRef.current = reservationId;
			const initial = normalizeReservationForDetails({
				...reservation,
				_id: reservationId,
			});
			setSelectedReservation(initial);
			setDetailsReservationId(reservationId);
			setDetailsModalOpen(true);
			setDetailsModalLoading(true);
			try {
				const full = await singlePreReservationById(reservationId);
				if (full && !full?.error && !full?.message) {
					const merged = normalizeReservationForDetails({
						...initial,
						...full,
						hotelId: full?.hotelId || initial?.hotelId,
					});
					setSelectedReservation(merged);
				}
			} catch (err) {
				console.error("Failed to fetch full reservation details", err);
			} finally {
				setDetailsModalLoading(false);
			}
		},
		[normalizeReservationForDetails],
	);

	const openReservationDetailsById = useCallback(
		async (reservationId) => {
			const normalizedReservationId = toCleanString(reservationId);
			if (!normalizedReservationId) return;
			detailsRestoreKeyRef.current = normalizedReservationId;

			setDetailsReservationId(normalizedReservationId);
			setDetailsModalOpen(true);
			setDetailsModalLoading(true);
			try {
				const full = await singlePreReservationById(normalizedReservationId);
				if (full && !full?.error && !full?.message) {
					setSelectedReservation(normalizeReservationForDetails(full));
				} else {
					setSelectedReservation(null);
				}
			} catch (err) {
				console.error("Failed to fetch full reservation details", err);
				setSelectedReservation(null);
			} finally {
				setDetailsModalLoading(false);
			}
		},
		[normalizeReservationForDetails],
	);

	const handleReportSearch = useCallback(() => {
		setReportCurrentPage(1);
	}, []);

	const openReportReservationsByDate = useCallback(
		async ({ date, dateType, preserveViewState = false } = {}) => {
			const normalizedDate = normalizeDateParam(date);
			if (!normalizedDate || !dateType || !user?._id || !token) return;

			const safeType = dateType === "checkin" ? "checkin" : "checkout";
			reportRestoreKeyRef.current = [
				normalizedDate,
				safeType,
				selectedHotelName || "all",
				includeCancelled ? "1" : "0",
			].join("|");
			const queryKey =
				safeType === "checkin"
					? `checkinDate_${normalizedDate}`
					: `checkoutDate_${normalizedDate}`;

			setReportModalContext({ date: normalizedDate, dateType: safeType });
			setReportModalLoading(true);
			setReportModalOpen(true);

			try {
				const payload = await getSpecificListOfReservations(user._id, token, {
					[queryKey]: 1,
					hotels: selectedHotelName || "all",
					excludeCancelled: !includeCancelled,
				});

				const normalized = {
					data: Array.isArray(payload?.data)
						? payload.data
						: Array.isArray(payload)
						  ? payload
						  : [],
					totalDocuments:
						payload?.totalDocuments ||
						(Array.isArray(payload) ? payload.length : 0),
					scorecards: payload?.scorecards || {},
				};

				setReportModalData(normalized);
				if (!preserveViewState) {
					setReportCurrentPage(1);
					setReportSearchTerm("");
				}
			} catch (err) {
				setReportModalData({ data: [], totalDocuments: 0, scorecards: {} });
				console.error("Failed to load reservation details", err);
			} finally {
				setReportModalLoading(false);
			}
		},
		[includeCancelled, selectedHotelName, token, user?._id],
	);

	useEffect(() => {
		if (!dayDetailsOpen || !dayDetailsContext?.date || !selectedHotelId) {
			dayRestoreKeyRef.current = "";
			return;
		}
		const restoreKey = [
			selectedHotelId,
			dayDetailsContext.date,
			dayDetailsContext.roomKey || "",
			dayDetailsContext.roomLabel || "",
		].join("|");
		if (dayRestoreKeyRef.current === restoreKey) return;
		dayRestoreKeyRef.current = restoreKey;
		fetchDayDetails({
			date: dayDetailsContext.date,
			roomType:
				dayDetailsContext.roomKey || dayDetailsContext.roomLabel
					? {
							key: dayDetailsContext.roomKey || "",
							label: dayDetailsContext.roomLabel || "",
					  }
					: null,
		});
	}, [
		dayDetailsContext?.date,
		dayDetailsContext?.roomKey,
		dayDetailsContext?.roomLabel,
		dayDetailsOpen,
		fetchDayDetails,
		selectedHotelId,
	]);

	useEffect(() => {
		if (
			!reportModalOpen ||
			!reportModalContext?.date ||
			!reportModalContext?.dateType
		) {
			reportRestoreKeyRef.current = "";
			return;
		}
		const restoreKey = [
			reportModalContext.date,
			reportModalContext.dateType,
			selectedHotelName || "all",
			includeCancelled ? "1" : "0",
		].join("|");
		if (reportRestoreKeyRef.current === restoreKey) return;
		reportRestoreKeyRef.current = restoreKey;
		openReportReservationsByDate({
			date: reportModalContext.date,
			dateType: reportModalContext.dateType,
			preserveViewState: true,
		});
	}, [
		includeCancelled,
		openReportReservationsByDate,
		reportModalContext?.date,
		reportModalContext?.dateType,
		reportModalOpen,
		selectedHotelName,
	]);

	useEffect(() => {
		if (!detailsModalOpen || !detailsReservationId) {
			detailsRestoreKeyRef.current = "";
			return;
		}
		const selectedReservationId = getReservationId(selectedReservation);
		if (
			selectedReservationId &&
			selectedReservationId === detailsReservationId &&
			(selectedReservation?.hotelId || detailsModalLoading)
		) {
			return;
		}
		if (detailsRestoreKeyRef.current === detailsReservationId) return;
		detailsRestoreKeyRef.current = detailsReservationId;
		openReservationDetailsById(detailsReservationId);
	}, [
		detailsModalLoading,
		detailsModalOpen,
		detailsReservationId,
		openReservationDetailsById,
		selectedReservation,
	]);

	// ------------------ Payment filter buttons ------------------
	const togglePaymentStatus = (status) => {
		setPaymentStatuses((prev) => {
			const set = new Set(prev || []);
			if (set.has(status)) set.delete(status);
			else set.add(status);
			return PAYMENT_STATUS_OPTIONS.filter((s) => set.has(s));
		});
	};

	const paymentAllActive = paymentStatuses.length === 0;
	const bookingSourceAllActive = bookingSources.length === 0;
	const hijriMonthOptions = isArabic ? hijriMonthsAr : hijriMonthsEn;
	const renderMetricTitle = (Icon, label) => (
		<CardTitle>
			<span className='title-icon'>
				<Icon />
			</span>
			<span>{label}</span>
		</CardTitle>
	);

	return (
		<Wrapper dir={isArabic ? "rtl" : "ltr"} $isArabic={isArabic}>
			<ModalZFix />

			<FilterShell $isArabic={isArabic}>
				<div className='filter-header'>
					<span className='filter-icon'>
						<FilterOutlined />
					</span>
					<span>{tableLabels.filtersTitle}</span>
				</div>
			<ControlBar>
				<div className='control'>
					<FieldLabel>
						<BankOutlined />
						<span>{tableLabels.hotel}</span>
					</FieldLabel>
					<Select
						showSearch
						style={{ minWidth: 220 }}
						value={selectedHotelId || undefined}
						onChange={(val) => setSelectedHotelId(val)}
						placeholder={tableLabels.selectHotel}
						optionFilterProp='children'
						filterOption={(input, option) =>
							String(option?.children || "")
								.toLowerCase()
								.includes(String(input || "").toLowerCase())
						}
					>
						{sortedHotels.map((h) => (
							<Option key={h._id} value={h._id}>
								{h.hotelName}
							</Option>
						))}
					</Select>
				</div>

				<div className='control'>
					<FieldLabel>
						<CalendarOutlined />
						<span>{tableLabels.calendar}</span>
					</FieldLabel>
					<Select
						value={calendarType}
						onChange={(v) => {
							setCalendarType(v);
							if (v === "gregorian") {
								setRangeOverride(null);
								setMonthValue(dayjs().startOf("month"));
							} else {
								onHijriChange(hijriMonth, hijriYear);
							}
						}}
					>
						<Option value='gregorian'>{tableLabels.gregorian}</Option>
					<Option value='hijri' disabled={!moment?.fn?.iMonth}>
							{tableLabels.hijri}
						</Option>
					</Select>
				</div>

				<div className='control month-picker'>
					<FieldLabel>
						<CalendarOutlined />
						<span>
						{calendarType === "hijri"
							? tableLabels.hijriMonth
							: tableLabels.month}
						</span>
					</FieldLabel>

					{calendarType === "hijri" && moment?.fn?.iMonth ? (
						<div className='hijri-controls'>
							<div className='hijri-row'>
								<Select
									value={hijriMonth}
									onChange={(v) => onHijriChange(Number(v), hijriYear)}
									style={{ minWidth: 170 }}
								>
									{hijriMonthOptions.map((m, idx) => (
										<Option key={m} value={idx}>
											{m}
										</Option>
									))}
								</Select>

								<Select
									value={hijriYear}
									onChange={(v) => onHijriChange(hijriMonth, Number(v))}
									style={{ width: 120 }}
								>
									{Array.from({ length: 6 }).map((_, idx) => {
										const base = moment().iYear();
										const y = base - 1 + idx;
										return (
											<Option key={y} value={y}>
												{formatInt(y)}
											</Option>
										);
									})}
								</Select>
							</div>

							{rangeOverride?.start && (
								<div className='muted'>
									{rangeOverride.start} - {rangeOverride.end}
								</div>
							)}
						</div>
					) : (
						<div className='month-actions'>
							<DatePicker
								picker='month'
								value={monthValue}
								onChange={onMonthChange}
								allowClear={false}
								getPopupContainer={pickerContainerGetter}
								popupStyle={pickerPopupStyle}
							/>
							<Button
								size='small'
								onClick={() => {
									setRangeOverride(null);
									setMonthValue((m) => m.subtract(1, "month"));
								}}
							>
								{tableLabels.prev}
							</Button>
							<Button
								size='small'
								onClick={() => {
									setRangeOverride(null);
									setMonthValue((m) => m.add(1, "month"));
								}}
							>
								{tableLabels.next}
							</Button>
							{rangeOverride?.start && rangeOverride?.end ? (
								<div className='muted'>
									{rangeOverride.start} - {rangeOverride.end}
								</div>
							) : null}
						</div>
					)}
				</div>

				<div className='control'>
					<FieldLabel>
						<TagsOutlined />
						<span>{tableLabels.columnLabels}</span>
					</FieldLabel>
					<Select
						value={displayMode}
						onChange={(v) => setDisplayMode(v)}
						style={{ minWidth: 180 }}
					>
						<Option value='displayName'>
							{tableLabels.displayNameDefault}
						</Option>
						<Option value='roomType'>{tableLabels.roomTypeGrouped}</Option>
					</Select>
				</div>

				<SwitchRow>
					<Switch
						size='small'
						checked={includeCancelled}
						onChange={(checked) => setIncludeCancelled(checked)}
					/>
					<span className='switch-text'>{tableLabels.includeCancelledNoShow}</span>
				</SwitchRow>
			</ControlBar>

			{/* Payment filter row */}
			<PaymentStatusBar>
				<div className='filters-row'>
					<div className='filter-panel'>
						<FieldLabel className='label'>
							<CreditCardOutlined />
							<span>{tableLabels.paymentStatus}</span>
						</FieldLabel>
						<div className='buttons'>
							<StatusButton
								size='small'
								onClick={() => setPaymentStatuses([])}
								isActive={paymentAllActive}
							>
								{tableLabels.all}
							</StatusButton>

							{PAYMENT_STATUS_OPTIONS.map((status) => (
								<StatusButton
									key={status}
									size='small'
									onClick={() => togglePaymentStatus(status)}
									isActive={paymentStatuses.includes(status)}
								>
									{tableLabels.paymentStatusLabels?.[status] || status}
								</StatusButton>
							))}

							{!paymentAllActive && (
								<Button size='small' onClick={() => setPaymentStatuses([])}>
									{tableLabels.clear}
								</Button>
							)}
						</div>
					</div>

					<div className='filter-panel'>
						<FieldLabel className='label'>
							<ProfileOutlined />
							<span>{tableLabels.bookingSource}</span>
						</FieldLabel>
						<div className='source-controls'>
							<Select
								mode='multiple'
								allowClear
								placeholder={tableLabels.allBookingSources}
								value={bookingSources}
								onChange={(values) =>
									setBookingSources(
										Array.isArray(values)
											? values.filter((v) => String(v || "").trim())
											: [],
									)
								}
								style={{ width: "100%" }}
								maxTagCount='responsive'
								optionFilterProp='children'
								filterOption={(input, option) =>
									String(option?.children || "")
										.toLowerCase()
										.includes(String(input || "").toLowerCase())
								}
							>
								{bookingSourceOptions.map((source) => (
									<Option key={source} value={source}>
										{source}
									</Option>
								))}
							</Select>

							{!bookingSourceAllActive && (
								<Button size='small' onClick={() => setBookingSources([])}>
									{tableLabels.clear}
								</Button>
							)}
						</div>
					</div>
				</div>

				<div className='hint muted'>
					{tableLabels.filterTip}
				</div>
			</PaymentStatusBar>
			</FilterShell>

			{error && (
				<Alert
					type='error'
					message={tableLabels.loadError}
					description={error}
					showIcon
					style={{ marginBottom: 12 }}
				/>
			)}

			{loading ? (
				<Spin tip={tableLabels.loading} />
			) : !data ? (
				<Alert
					type='info'
					message={tableLabels.selectHotelMessage}
					showIcon
				/>
			) : (
				<>
					<FinancialSummaryRow>
						<MetricCard
							size='small'
							$tone='money'
							title={renderMetricTitle(DollarCircleOutlined, tableLabels.totalAmountSar)}
						>
							<div className='metric'>
								<span>{tableLabels.grossCheckoutBasis}</span>
								<b>{formatCurrency(checkoutGrossAmount)}</b>
							</div>
							<div className='metric muted'>
								<span>{tableLabels.reservationsCheckedOut}</span>
								<b>{formatInt(checkoutReservationsCount)}</b>
							</div>
						</MetricCard>

						<MetricCard
							size='small'
							$tone='arrival'
							title={renderMetricTitle(
								LoginOutlined,
								tableLabels.checkinReservationsSelectedPeriod,
							)}
						>
							<div className='metric'>
								<span>{tableLabels.totalCheckins}</span>
								<b>{formatInt(checkinReservationsCount)}</b>
							</div>
							<div className='metric muted'>
								<span>{tableLabels.checkinGrossSar}</span>
								<b>{formatCurrency(checkinGrossAmount)}</b>
							</div>
						</MetricCard>
					</FinancialSummaryRow>

					<SummaryGrid>
						<MetricCard
							size='small'
							$tone='occupancy'
							title={renderMetricTitle(BarChartOutlined, tableLabels.averageOccupancyCapped)}
						>
							<Progress
								percent={Math.round(
									(Number(summary.averageOccupancyRate || 0) || 0) * 100,
								)}
								status='active'
								strokeColor='#007f6b'
							/>
							<div className='muted' style={{ marginTop: 6 }}>
								{tableLabels.occupiedFormula}
							</div>
						</MetricCard>

						<MetricCard
							size='small'
							$tone='nights'
							title={renderMetricTitle(FundOutlined, tableLabels.roomNights)}
						>
							<div className='metric'>
								<span>{tableLabels.occupied}</span>
								<b>{formatInt(occupiedRoomNights)}</b>
							</div>
							<div className='metric'>
								<span>{tableLabels.remaining}</span>
								<b>{formatInt(remainingRoomNights)}</b>
							</div>
							<div className='metric muted'>
								<span>{tableLabels.capacity}</span>
								<b>{formatInt(capacityRoomNights)}</b>
							</div>
							{typeof bookedRoomNights === "number" && (
								<div className='metric muted'>
									<span>{tableLabels.bookedRaw}</span>
									<b>{formatInt(bookedRoomNights)}</b>
								</div>
							)}
						</MetricCard>

						<MetricCard
							size='small'
							$tone='rooms'
							title={renderMetricTitle(ApartmentOutlined, tableLabels.roomCounts)}
						>
							<div className='metric'>
								<span>{tableLabels.inventoryUnits}</span>
								<b>{formatInt(totalRoomsAll)}</b>
							</div>
							<div className='metric muted'>
								<span>{tableLabels.physicalRooms}</span>
								<b>{formatInt(totalPhysicalRooms)}</b>
							</div>
						</MetricCard>

						<MetricCard
							size='small'
							$tone='mapping'
							title={renderMetricTitle(CheckCircleOutlined, tableLabels.inventoryMapping)}
						>
							{derivedCount ? (
								<>
									<Tag color='orange'>
										{tableLabels.unmappedTypes}: {formatInt(derivedCount)}
									</Tag>
									<div className='muted' style={{ marginTop: 6 }}>
										{tableLabels.unmappedMessage}
									</div>
									<Tooltip title={derivedTooltip}>
										<div className='muted' style={{ marginTop: 6 }}>
											{tableLabels.viewList}
										</div>
									</Tooltip>
								</>
							) : (
								<>
									<Tag color='green'>{tableLabels.allMapped}</Tag>
									<div className='muted' style={{ marginTop: 6 }}>
										{tableLabels.allMappedMessage}
									</div>
								</>
							)}
						</MetricCard>

						<MetricCard
							size='small'
							$tone='peak'
							title={renderMetricTitle(CalendarOutlined, tableLabels.peakDay)}
						>
							<div className='metric'>
								<span>{summary?.peakDay?.date || "n/a"}</span>
								<b>
									{Math.round(
										(Number(summary?.peakDay?.occupancyRate || 0) || 0) * 100,
									)}
									%
								</b>
							</div>
							{typeof summary?.peakDay?.booked === "number" && (
								<div className='muted' style={{ marginTop: 6 }}>
									{tableLabels.booked} {formatInt(summary.peakDay.booked)} /{" "}
									{tableLabels.capacity}{" "}
									{formatInt(summary.peakDay.capacity || 0)}
								</div>
							)}
						</MetricCard>

						<MetricCard
							size='small'
							$tone='warning'
							title={renderMetricTitle(WarningOutlined, tableLabels.warnings)}
							bodyStyle={{ cursor: firstWarning ? "pointer" : "default" }}
							onClick={() => firstWarning && setWarningsModalOpen(true)}
						>
							{firstWarning ? (
								<div className='warning single'>
									<Tag color='red'>{tableLabels.overbooked}</Tag>{" "}
									{firstWarning.date} -{" "}
									{firstWarning.roomType} ({firstWarning.booked}/
									{firstWarning.capacity})
									{summary.warnings?.length > 1 && (
										<span className='muted'>
											{" "}
											+{formatInt(summary.warnings.length - 1)}{" "}
											{tableLabels.more}
										</span>
									)}
								</div>
							) : (
								<span className='muted'>{tableLabels.noOverbooking}</span>
							)}
						</MetricCard>
					</SummaryGrid>

					<SectionCard
						size='small'
						title={
							<TitleWithFlag>
								<span className='section-title-icon'>
									<DatabaseOutlined />
								</span>
								<span>{tableLabels.occupancyByRoomType}</span>
								{derivedCount ? (
									<Tooltip title={derivedTooltip}>
										<span className='flag'>
											{tableLabels.unmapped}: {formatInt(derivedCount)}
										</span>
									</Tooltip>
								) : null}
							</TitleWithFlag>
						}
					>
						<TypeGrid>
							{occupancyByTypeSorted.map((item) => (
								<div key={item.key} className='type-card'>
									<div className='type-title'>
										<Tooltip title={item.label}>
											<span className='type-main'>
												{roomHeaderMain({ label: item.label }, isArabic)}
											</span>
										</Tooltip>
										{item.derived ? (
											<Tooltip title={tableLabels.derivedTooltip}>
												<span className='derived-pill'>{tableLabels.derived}</span>
											</Tooltip>
										) : null}
									</div>

									<div className='type-sub muted'>
										{roomHeaderSub({ label: item.label })}
									</div>

									<Progress
										percent={Math.round(
											(Number(item.occupancyRate || 0) || 0) * 100,
										)}
										strokeColor={item.color || "#008c73"}
										size='small'
									/>

									<div className='type-meta muted'>
										{formatInt(item.occupiedNights || 0)}/
										{formatInt(item.capacityNights || 0)}{" "}
										{tableLabels.occupiedNights}
										{typeof item.bookedNights === "number" && (
											<>
												{" "}
												| {tableLabels.bookedLower}{" "}
												{formatInt(item.bookedNights)}
											</>
										)}
									</div>
								</div>
							))}
						</TypeGrid>
					</SectionCard>

					<SectionCard
						size='small'
						title={
							<HeaderRow>
								<div className='card-title-text'>
									<span className='section-title-icon'>
										<BarChartOutlined />
									</span>
									{tableLabels.dayOverDay} | {data?.hotel?.hotelName || ""} |{" "}
									{monthLabel}
									{derivedCount ? (
										<Tooltip title={derivedTooltip}>
											<span className='inline-flag'>
												{tableLabels.unmapped}: {formatInt(derivedCount)}
											</span>
										</Tooltip>
									) : null}
								</div>

								<Legend>
									<div className='legend-swatch'>
										<span className='swatch low' /> <span>{tableLabels.legendLow}</span>
									</div>
									<div className='legend-swatch'>
										<span className='swatch mid' /> <span>{tableLabels.legendMid}</span>
									</div>
									<div className='legend-swatch'>
										<span className='swatch high' /> <span>{tableLabels.legendHigh}</span>
									</div>
								</Legend>
							</HeaderRow>
						}
						extra={
							<span className='muted'>
								{tableLabels.cellHint}
							</span>
						}
					>
						<TableWrapper
							$isArabic={isArabic}
							style={{
								"--col-w": `${colWidth}px`,
								"--date-col-w": "130px",
								"--total-col-w": "120px",
							}}
						>
							<table>
								<thead>
									<tr>
										<th className='sticky-left date-th'>{tableLabels.date}</th>

										{roomTypes.map((rt) => {
											const main = roomHeaderMain(rt, isArabic);
											const sub = roomHeaderSub(rt);
											return (
												<th key={rt.key} className='room-th'>
													<div className='th-inner'>
														<Tooltip title={rt.label}>
															<div className='th-main'>{main}</div>
														</Tooltip>
														{sub ? <div className='th-sub'>{sub}</div> : null}
														{rt.derived ? (
															<Tooltip title={tableLabels.derivedTooltip}>
																<span className='derived-flag'>{tableLabels.derived}</span>
															</Tooltip>
														) : null}
													</div>
												</th>
											);
										})}

										<th className='sticky-right total-th'>{tableLabels.total}</th>
									</tr>
								</thead>

								<tbody>
									{days.map((day) => {
										const totals = day?.totals || {};
										const totalCapacity = Number(totals.capacity ?? 0) || 0;
										const totalBooked = Number(totals.booked ?? 0) || 0;
										const totalOccupied = Number(totals.occupied ?? 0) || 0;
										const totalAvail = Number(totals.available ?? 0) || 0;

										const totalOccRate =
											typeof totals.occupancyRate === "number"
												? Number(totals.occupancyRate)
												: totalCapacity
												  ? totalOccupied / totalCapacity
												  : 0;

										const totalIsOver =
											Boolean(totals.overbooked) || totalBooked > totalCapacity;
										const totalColors = getReadableCellColors(totalOccRate);

										return (
											<tr key={day.date}>
												<td className='sticky-left date-td'>
													{hijriAvailable && (
														<div className='hijri-date'>
															{formatHijriCellDate(day.date, isArabic)}
														</div>
													)}
											<div className='greg-date'>
												{formatSaudiGregorianDate(day.date, {
													language: isArabic ? "Arabic" : "English",
													month: "long",
													fallback: day.date,
												})}
											</div>
												</td>

												{roomTypes.map((rt) => {
													const cell = day?.rooms?.[rt.key] || {};
													const capacity =
														Number(cell.capacity ?? rt.totalRooms ?? 0) || 0;
													const booked = Number(cell.booked || 0) || 0;

													const occupied =
														typeof cell.occupied === "number"
															? Number(cell.occupied)
															: Math.min(booked, capacity);

													const available =
														typeof cell.available === "number"
															? Number(cell.available)
															: Math.max(capacity - occupied, 0);

													const occRate =
														typeof cell.occupancyRate === "number"
															? Number(cell.occupancyRate)
															: capacity
															  ? occupied / capacity
															  : 0;

													const isOver =
														Boolean(cell.overbooked) || booked > capacity;
													const overage =
														typeof cell.overage === "number"
															? Number(cell.overage)
															: Math.max(booked - capacity, 0);

													const colors = getReadableCellColors(occRate);

													return (
														<td
															key={`${day.date}-${rt.key}`}
															className='cell clickable'
															style={{
																background: heatBackground(occRate, isOver),
																color: colors.text,
																borderColor: heatBorder(occRate, isOver),
																boxShadow: heatShadow(occRate, isOver),
															}}
															onClick={() =>
																fetchDayDetails({
																	date: day.date,
																	roomType: rt,
																})
															}
														>
															<div className='cell-top'>
																<span className='numbers'>
																	{formatInt(booked)}/{formatInt(capacity)}
																</span>
																{isOver ? (
																	<span className='over-pill'>
																		+{formatInt(overage)}
																	</span>
																) : null}
															</div>

															<div className='cell-bottom'>
																<span
																className='muted'
																style={{ color: colors.muted }}
															>
																	{tableLabels.availableShort} {formatInt(available)}
																</span>

																<span className='percent'>
																	{Math.round(occRate * 100)}%
																</span>
															</div>
														</td>
													);
												})}

												<td
													className='sticky-right cell total clickable'
													style={{
														background: heatBackground(totalOccRate, totalIsOver),
														color: totalColors.text,
														borderColor: heatBorder(totalOccRate, totalIsOver),
														boxShadow: heatShadow(totalOccRate, totalIsOver),
													}}
													onClick={() => fetchDayDetails({ date: day.date })}
												>
													<div className='cell-top'>
														<span className='numbers'>
															{formatInt(totalBooked)}/
															{formatInt(totalCapacity)}
														</span>
													</div>
													<div className='cell-bottom'>
														<span
															className='muted'
															style={{ color: totalColors.muted }}
														>
															{tableLabels.availableShort} {formatInt(totalAvail)}
														</span>
														<span className='percent'>
															{Math.round(totalOccRate * 100)}%
														</span>
													</div>
												</td>
											</tr>
										);
									})}

									{/* ✅ Month total row */}
									{data?.summary?.occupancyByType?.length ? (
										<tr className='month-total-row'>
											<td className='sticky-left date-td month-total-left'>
												<div className='month-total-title'>{tableLabels.monthTotal}</div>
												<div className='muted'>{monthLabel}</div>
											</td>

											{roomTypes.map((rt) => {
												const it =
													occupancyByTypeSorted.find((x) => x.key === rt.key) ||
													{};
												const capN = Number(it.capacityNights || 0);
												const bookedN = Number(it.bookedNights || 0);
												const occN = Number(it.occupiedNights || 0);

												const occRate =
													typeof it.occupancyRate === "number"
														? Number(it.occupancyRate)
														: capN
														  ? occN / capN
														  : 0;

												const availN = Math.max(capN - occN, 0);
												const colors = getReadableCellColors(occRate);

												const over = bookedN > capN && capN > 0;
												const overBy = over ? Math.max(bookedN - capN, 0) : 0;

												return (
													<td
														key={`month-total-${rt.key}`}
														className='cell month-total-cell'
														style={{
															background: heatBackground(occRate, over),
															color: colors.text,
															borderColor: heatBorder(occRate, over),
															boxShadow: heatShadow(occRate, over),
														}}
													>
														<div className='cell-top'>
															<span className='numbers'>
																{formatInt(bookedN)}/{formatInt(capN)}
															</span>
															{over ? (
																<span className='over-pill'>
																	+{formatInt(overBy)}
																</span>
															) : null}
														</div>
														<div className='cell-bottom'>
															<span
															className='muted'
															style={{ color: colors.muted }}
														>
																{tableLabels.availableShort} {formatInt(availN)}
															</span>
															<span className='percent'>
																{Math.round(occRate * 100)}%
															</span>
														</div>
													</td>
												);
											})}

											{(() => {
												const cap = Number(summary.capacityRoomNights || 0);
												const booked = Number(summary.bookedRoomNights || 0);
												const occ = Number(summary.occupiedRoomNights || 0);
												const occRate = cap ? occ / cap : 0;
												const colors = getReadableCellColors(occRate);
												const over = booked > cap && cap > 0;

												return (
													<td
														className='sticky-right cell total month-total-cell'
														style={{
															background: heatBackground(occRate, over),
															color: colors.text,
															borderColor: heatBorder(occRate, over),
															boxShadow: heatShadow(occRate, over),
														}}
													>
														<div className='cell-top'>
															<span className='numbers'>
																{formatInt(booked)}/{formatInt(cap)}
															</span>
														</div>
														<div className='cell-bottom'>
															<span
															className='muted'
															style={{ color: colors.muted }}
														>
																{tableLabels.availableShort}{" "}
																{formatInt(Math.max(cap - occ, 0))}
															</span>
															<span className='percent'>
																{Math.round(occRate * 100)}%
															</span>
														</div>
													</td>
												);
											})()}
										</tr>
									) : null}
								</tbody>
							</table>
						</TableWrapper>
					</SectionCard>

					<Card size='small' title={tableLabels.paymentStatusBreakdown}>
						<BreakdownTablesRow>
							<BreakdownTable>
								<div className='table-title'>
									{tableLabels.bookingSourceTotalsCheckoutSar}
								</div>
								<table>
									<thead>
										<tr>
											<th>{tableLabels.bookingSourceHeader}</th>
											{paymentStatusHeaders.map((status) => (
												<th key={status}>
													{tableLabels.paymentStatusLabels?.[status] || status}
												</th>
											))}
											<th>{tableLabels.totalSar}</th>
										</tr>
									</thead>
									<tbody>
										{bookingSourceRows.length ? (
											bookingSourceRows.map((row) => (
												<tr key={row.booking_source || tableLabels.unknown}>
													<td>{row.booking_source || tableLabels.unknown}</td>
													{paymentStatusHeaders.map((status) => (
														<td key={`${row.booking_source}-${status}`}>
															{formatCurrency(
																row?.totalsByStatus?.[status] || 0,
															)}
														</td>
													))}
													<td>{formatCurrency(row.rowTotal || 0)}</td>
												</tr>
											))
										) : (
											<tr>
												<td
													colSpan={paymentStatusHeaders.length + 2}
													className='empty'
												>
													{tableLabels.noBookingSourceData}
												</td>
											</tr>
										)}
									</tbody>
									{bookingSourceRows.length ? (
										<tfoot>
											<tr className='totals'>
												<td>{tableLabels.total}</td>
												{paymentStatusHeaders.map((status) => (
													<td key={`total-${status}`}>
														{formatCurrency(
															bookingSourceColumnTotals?.[status] || 0,
														)}
													</td>
												))}
												<td>{formatCurrency(bookingSourceOverallTotal)}</td>
											</tr>
										</tfoot>
									) : null}
								</table>
							</BreakdownTable>

							<BreakdownTable>
								<div className='table-title'>
									{tableLabels.paymentStatusTotals}
								</div>
								<table>
									<thead>
										<tr>
											<th>{tableLabels.status}</th>
											<th>{tableLabels.reservations}</th>
											<th>{tableLabels.totalAmountSar}</th>
											<th>{tableLabels.paidAmount}</th>
											<th>{tableLabels.onsitePaid}</th>
										</tr>
									</thead>
									<tbody>
										{paymentBreakdown.length ? (
											paymentBreakdown.map((pmt) => (
												<tr key={pmt.status}>
													<td>
														{tableLabels.paymentStatusLabels?.[pmt.status] ||
															paymentLabel(pmt.status, pmt.label)}
													</td>
													<td>{formatInt(pmt.count)}</td>
													<td>{formatCurrency(pmt.totalAmount)}</td>
													<td>{formatCurrency(pmt.paidAmount)}</td>
													<td>{formatCurrency(pmt.onsitePaidAmount)}</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan={5} className='empty'>
													{tableLabels.noPaymentData}
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</BreakdownTable>
						</BreakdownTablesRow>

						<BreakdownTablesRow style={{ marginTop: 12 }}>
							<BreakdownTable>
								<div className='table-title'>
									{tableLabels.checkinDateTotalsSar}
								</div>
								<table>
									<thead>
										<tr>
											<th>{tableLabels.checkinDate}</th>
											<th>{tableLabels.reservations}</th>
											{paymentStatusHeaders.map((status) => (
												<th key={`checkin-date-${status}`}>
													{tableLabels.paymentStatusLabels?.[status] || status}
												</th>
											))}
											<th>{tableLabels.totalSar}</th>
										</tr>
									</thead>
									<tbody>
										{checkinDateRows.length ? (
											checkinDateRows.map((row) => {
												const dateKey = row?.checkin_date || row?.date || "";
												const { gregDate, hijriDate } = formatDualDate(dateKey);
												return (
													<tr
														key={`checkin-${dateKey || "unknown-date"}`}
														className={dateKey ? "clickable-row" : ""}
														onClick={() =>
															dateKey
																? openReportReservationsByDate({
																		date: dateKey,
																		dateType: "checkin",
																  })
																: null
														}
														role={dateKey ? "button" : undefined}
														tabIndex={dateKey ? 0 : undefined}
														onKeyDown={(e) => {
															if (!dateKey) return;
															if (e.key === "Enter" || e.key === " ") {
																e.preventDefault();
																openReportReservationsByDate({
																	date: dateKey,
																	dateType: "checkin",
																});
															}
														}}
													>
														<td className='date-cell'>
															{hijriDate ? (
																<div className='hijri-date'>{hijriDate}</div>
															) : null}
															<div className='greg-date'>{gregDate}</div>
														</td>
														<td>{formatInt(row?.reservationsCount || 0)}</td>
														{paymentStatusHeaders.map((status) => (
															<td key={`checkin-${dateKey}-${status}`}>
																{formatCurrency(
																	row?.totalsByStatus?.[status] || 0,
																)}
															</td>
														))}
														<td>{formatCurrency(row?.rowTotal || 0)}</td>
													</tr>
												);
											})
										) : (
											<tr>
												<td
													colSpan={paymentStatusHeaders.length + 3}
													className='empty'
												>
													{tableLabels.noCheckinPaymentData}
												</td>
											</tr>
										)}
									</tbody>
									{checkinDateRows.length ? (
										<tfoot>
											<tr className='totals'>
												<td>{tableLabels.total}</td>
												<td>{formatInt(checkinDateOverallReservations)}</td>
												{paymentStatusHeaders.map((status) => (
													<td key={`checkin-date-total-${status}`}>
														{formatCurrency(
															checkinDateColumnTotals?.[status] || 0,
														)}
													</td>
												))}
												<td>{formatCurrency(checkinDateOverallTotal)}</td>
											</tr>
										</tfoot>
									) : null}
								</table>
							</BreakdownTable>

							<BreakdownTable>
								<div className='table-title'>
									{tableLabels.checkoutDateTotalsSar}
								</div>
								<table>
									<thead>
										<tr>
											<th>{tableLabels.checkoutDate}</th>
											<th>{tableLabels.reservations}</th>
											{paymentStatusHeaders.map((status) => (
												<th key={`date-${status}`}>
													{tableLabels.paymentStatusLabels?.[status] || status}
												</th>
											))}
											<th>{tableLabels.totalSar}</th>
										</tr>
									</thead>
									<tbody>
										{checkoutDateRows.length ? (
											checkoutDateRows.map((row) => {
												const dateKey = row?.checkout_date || row?.date || "";
												const { gregDate, hijriDate } = formatDualDate(dateKey);
												return (
													<tr
														key={`checkout-${dateKey || "unknown-date"}`}
														className={dateKey ? "clickable-row" : ""}
														onClick={() =>
															dateKey
																? openReportReservationsByDate({
																		date: dateKey,
																		dateType: "checkout",
																  })
																: null
														}
														role={dateKey ? "button" : undefined}
														tabIndex={dateKey ? 0 : undefined}
														onKeyDown={(e) => {
															if (!dateKey) return;
															if (e.key === "Enter" || e.key === " ") {
																e.preventDefault();
																openReportReservationsByDate({
																	date: dateKey,
																	dateType: "checkout",
																});
															}
														}}
													>
														<td className='date-cell'>
															{hijriDate ? (
																<div className='hijri-date'>{hijriDate}</div>
															) : null}
															<div className='greg-date'>{gregDate}</div>
														</td>
														<td>{formatInt(row?.reservationsCount || 0)}</td>
														{paymentStatusHeaders.map((status) => (
															<td key={`checkout-${dateKey}-${status}`}>
																{formatCurrency(
																	row?.totalsByStatus?.[status] || 0,
																)}
															</td>
														))}
														<td>{formatCurrency(row?.rowTotal || 0)}</td>
													</tr>
												);
											})
										) : (
											<tr>
												<td
													colSpan={paymentStatusHeaders.length + 3}
													className='empty'
												>
													{tableLabels.noCheckoutPaymentData}
												</td>
											</tr>
										)}
									</tbody>
									{checkoutDateRows.length ? (
										<tfoot>
											<tr className='totals'>
												<td>{tableLabels.total}</td>
												<td>{formatInt(checkoutDateOverallReservations)}</td>
												{paymentStatusHeaders.map((status) => (
													<td key={`checkout-date-total-${status}`}>
														{formatCurrency(
															checkoutDateColumnTotals?.[status] || 0,
														)}
													</td>
												))}
												<td>{formatCurrency(checkoutDateOverallTotal)}</td>
											</tr>
										</tfoot>
									) : null}
								</table>
							</BreakdownTable>
						</BreakdownTablesRow>
					</Card>
				</>
			)}

			<Modal
				title={tableLabels.detailedReservationsList}
				open={reportModalOpen}
				onCancel={() => {
					setReportModalOpen(false);
					setReportModalLoading(false);
					setReportModalContext({ date: "", dateType: "checkout" });
				}}
				footer={null}
				width='96vw'
				style={{ top: 12, maxWidth: "none", paddingBottom: 12 }}
				wrapClassName='report-reservations-modal'
			>
				{reportModalLoading ? (
					<Spin tip={tableLabels.loadingReservations} />
				) : reportModalData.data.length === 0 ? (
					<p>{tableLabels.noReservationsFound}</p>
				) : (
					<EnhancedContentTable
						data={reportModalData.data}
						totalDocuments={reportModalData.totalDocuments}
						currentPage={reportCurrentPage}
						pageSize={reportPageSize}
						setCurrentPage={setReportCurrentPage}
						setPageSize={setReportPageSize}
						searchTerm={reportSearchTerm}
						setSearchTerm={setReportSearchTerm}
						handleSearch={handleReportSearch}
						scorecardsObject={reportModalData.scorecards}
						fromPage='reports'
						onReservationUpdated={handleReservationUpdated}
						chosenLanguage={chosenLanguage}
					/>
				)}
			</Modal>

			{/* Day details modal */}
			<Modal
				title={`${tableLabels.reservationsOn} ${
					dayDetails?.date || tableLabels.selectedDay
				}${
					dayDetails?.roomLabel ? ` | ${dayDetails.roomLabel}` : ""
				}`}
				open={dayDetailsOpen}
				onCancel={() => {
					setDayDetailsOpen(false);
					setDayDetailsLoading(false);
					setDayDetails(null);
					setDayDetailsContext({ date: "", roomKey: "", roomLabel: "" });
					setDayDetailsError("");
				}}
				footer={null}
				width='95%'
				style={{ top: 20, zIndex: 3000 }}
				styles={{
					body: { padding: 12 },
					mask: { backdropFilter: "blur(1px)", zIndex: 2999 },
				}}
				zIndex={3000}
				wrapClassName='day-details-modal'
			>
				{dayDetailsLoading ? (
					<Spin tip={tableLabels.loadingReservations} />
				) : (
					<>
						{dayDetailsError && (
							<Alert
								type='error'
								message={tableLabels.unableDayReservations}
								description={dayDetailsError}
								showIcon
								style={{ marginBottom: 8 }}
							/>
						)}

						{dayDetails && (
							<DetailsSummary>
								<div>
									<div className='label'>{tableLabels.hotel}</div>
									<div className='value'>
										{dayDetails?.hotel?.hotelName ||
											data?.hotel?.hotelName ||
											tableLabels.selectedHotelFallback}
									</div>
								</div>

								<div>
									<div className='label'>{tableLabels.date}</div>
									<div className='value'>{dayDetails?.date || "n/a"}</div>
								</div>

								<div>
									<div className='label'>{tableLabels.room}</div>
									<div className='value'>
										{dayDetails?.roomLabel || tableLabels.allRoomTypes}
									</div>
								</div>

								<div>
									<div className='label'>{tableLabels.bookedCapacity}</div>
									<div className='value'>
										{formatInt(dayDetails?.booked || 0)} /{" "}
										{formatInt(dayDetails?.capacity || 0)}
										{dayDetails?.overbooked && (
											<Tag color='red' style={{ marginLeft: 6 }}>
												{tableLabels.overBy}{" "}
												{formatInt(dayDetails?.overage || 0)}
											</Tag>
										)}
									</div>
								</div>
							</DetailsSummary>
						)}

						{dayDetails?.reservations?.length ? (
							<DetailTableWrapper>
								<DetailTable>
									<thead>
										<tr>
											<th>#</th>
											<th>{tableLabels.confirmation}</th>
											<th>{tableLabels.guest}</th>
											<th>{tableLabels.phone}</th>
											<th>{tableLabels.status}</th>
											<th>{tableLabels.checkIn}</th>
											<th>{tableLabels.checkOut}</th>
											<th>{tableLabels.roomTypeHeader}</th>
											<th>{tableLabels.count}</th>
											<th>{tableLabels.bookingSourceHeader}</th>
											<th>{tableLabels.payment}</th>
											<th>{tableLabels.totalSar}</th>
											<th>{tableLabels.showDetails}</th>
										</tr>
									</thead>
									<tbody>
										{dayDetails.reservations.map((res, idx) => {
											const breakdownArray = Array.isArray(res?.roomBreakdown)
												? res.roomBreakdown
												: [];
											const roomLabelString = breakdownArray
												.map((rb) => rb?.label || rb?.key || "-")
												.join(", ");
											const roomCountString = breakdownArray
												.map((rb) => formatInt(rb?.count || 0))
												.join(", ");

											const paymentStatus =
												res?.payment_status || "Not Captured";
											const paymentHint = res?.payment_status_hint || "";

											return (
												<tr
													key={res?._id || res?.confirmation_number || `${idx}`}
												>
													<td>{idx + 1}</td>
													<td>{res?.confirmation_number || "N/A"}</td>
													<td>{res?.customer_details?.name || "N/A"}</td>
													<td>{res?.customer_details?.phone || "N/A"}</td>
													<td
														style={getReservationStatusStyles(
															res?.reservation_status,
														)}
													>
														{res?.reservation_status || "N/A"}
													</td>
													<td>
												{formatSaudiGregorianDate(res?.checkin_date, {
													language: isArabic ? "Arabic" : "English",
													month: "long",
													fallback: "N/A",
												})}
													</td>
													<td>
												{formatSaudiGregorianDate(res?.checkout_date, {
													language: isArabic ? "Arabic" : "English",
													month: "long",
													fallback: "N/A",
												})}
													</td>
													<td>{roomLabelString || "-"}</td>
													<td>{roomCountString || "-"}</td>
													<td>{res?.booking_source || "-"}</td>
													<td style={getPaymentStatusStyles(paymentStatus)}>
														{paymentHint ? (
															<Tooltip title={paymentHint}>
																<span>
																	{tableLabels.paymentStatusLabels?.[
																		paymentStatus
																	] || paymentStatus}
																</span>
															</Tooltip>
														) : (
															tableLabels.paymentStatusLabels?.[paymentStatus] ||
															paymentStatus
														)}
													</td>
													<td>{formatCurrency(res?.total_amount || 0)}</td>
													<td>
														<Button
															size='small'
														onClick={() => openReservationDetails(res)}
													>
														{tableLabels.showDetails}
													</Button>
												</td>
												</tr>
											);
										})}
									</tbody>
								</DetailTable>
							</DetailTableWrapper>
						) : (
							<div className='muted'>{tableLabels.noReservationsDay}</div>
						)}
					</>
				)}
			</Modal>

			<WarningsModal
				open={warningsModalOpen}
				onClose={() => setWarningsModalOpen(false)}
				warnings={warningsData.length ? warningsData : summary?.warnings || []}
				loading={warningsLoading}
			/>

			{/* Reservation details modal */}
			<Modal
				open={detailsModalOpen}
				onCancel={() => {
					setDetailsModalOpen(false);
					setDetailsModalLoading(false);
					setDetailsReservationId("");
					setSelectedReservation(null);
				}}
				footer={null}
				className='float-right'
				width='95%'
				style={{ position: "absolute", left: "2.5%", top: "2%", zIndex: 3000 }}
				styles={{
					body: { padding: 0 },
					mask: { backdropFilter: "blur(1px)", zIndex: 2999 },
				}}
				zIndex={3000}
				wrapClassName='reservation-details-modal'
			>
				{detailsModalLoading && !selectedReservation ? (
					<div style={{ padding: "24px 0", textAlign: "center" }}>
						<Spin tip={tableLabels.loadingReservationDetails} />
					</div>
				) : selectedReservation && selectedReservation.hotelId ? (
					<MoreDetails
						selectedReservation={normalizeReservationForDetails(
							selectedReservation,
						)}
						hotelDetails={selectedReservation.hotelId}
						reservation={normalizeReservationForDetails(selectedReservation)}
						setReservation={setSelectedReservation}
						onReservationUpdated={handleReservationUpdated}
					/>
				) : selectedReservation ? (
					<ReservationDetail
						reservation={selectedReservation}
						hotelDetails={selectedReservation.hotelId}
					/>
				) : null}
			</Modal>
		</Wrapper>
	);
};

export default HotelsInventoryMap;

/* ------------------ styles ------------------ */

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 14px;
	font-family: ${(p) =>
		p.$isArabic
			? "'Droid Arabic Kufi', 'Cairo', Tahoma, Arial, sans-serif"
			: "inherit"};

	.metric {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		margin-bottom: 6px;
		color: #102033;
		line-height: 1.35;
	}

	.metric b {
		color: #061a2f;
		font-size: ${(p) => (p.$isArabic ? "1rem" : "0.96rem")};
		font-weight: 950;
		white-space: nowrap;
	}

	.warning {
		font-size: 12px;
		margin-bottom: 4px;
	}

	.warning.single {
		transition:
			transform 0.1s ease,
			color 0.1s ease;
	}

	.warning.single:hover {
		transform: translateX(2px);
		color: #006d5b;
	}

	.muted {
		color: #5f7285;
		font-size: 12px;
		line-height: 1.45;
	}
`;

const FilterShell = styled.section`
	border: 1px solid rgba(45, 93, 145, 0.2);
	border-radius: 12px;
	background:
		linear-gradient(135deg, rgba(229, 243, 255, 0.5), rgba(255, 255, 255, 0.98) 46%),
		linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(247, 251, 255, 0.96)),
		#ffffff;
	box-shadow: 0 10px 24px rgba(16, 32, 51, 0.06);
	padding: 14px;
	display: flex;
	flex-direction: column;
	gap: 12px;

	.filter-header {
		color: #102033;
		font-weight: 900;
		font-size: ${(p) => (p.$isArabic ? "1rem" : "0.95rem")};
		line-height: 1.3;
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.filter-icon {
		width: 28px;
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: #ffffff;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
			linear-gradient(180deg, #2f74b5 0%, #102033 100%);
		box-shadow: 0 6px 14px rgba(16, 32, 51, 0.14);
	}
`;

const FieldLabel = styled.label`
	display: inline-flex;
	align-items: center;
	gap: 7px;
	color: #102033;
	font-size: 12px;
	font-weight: 900;
	line-height: 1.25;

	.anticon {
		color: #2f74b5;
		font-size: 14px;
	}
`;

const ControlBar = styled.div`
	display: grid;
	grid-template-columns: minmax(260px, 1.2fr) minmax(160px, 0.7fr) minmax(
			300px,
			1.25fr
		) minmax(220px, 0.9fr) minmax(240px, 0.9fr);
	gap: 12px;
	align-items: stretch;

	.control {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	label {
		color: #102033;
		font-size: 12px;
		font-weight: 900;
		line-height: 1.25;
	}

	.month-picker .month-actions {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		align-items: center;
	}

	.hijri-controls {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.hijri-row {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: nowrap;
	}

	.ant-select,
	.ant-picker {
		width: 100%;
	}

	@media (max-width: 1300px) {
		grid-template-columns: repeat(3, minmax(220px, 1fr));
	}

	@media (max-width: 900px) {
		grid-template-columns: repeat(2, minmax(220px, 1fr));
	}

	@media (max-width: 640px) {
		grid-template-columns: 1fr;

		.hijri-row {
			flex-wrap: wrap;
		}
	}
`;

const PaymentStatusBar = styled.div`
	border: 1px solid rgba(45, 93, 145, 0.14);
	border-radius: 10px;
	padding: 10px 12px;
	background: rgba(255, 255, 255, 0.74);
	display: flex;
	flex-direction: column;
	gap: 8px;

	.filters-row {
		display: grid;
		grid-template-columns: minmax(360px, 1.05fr) minmax(420px, 1.25fr);
		gap: 12px;
		align-items: start;
	}

	.filter-panel {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}

	.label {
		font-weight: 600;
		color: #102033;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}

	.source-controls {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}

	.source-controls .ant-select {
		flex: 1;
		min-width: 220px;
	}

	.hint {
		margin-top: 2px;
		font-weight: 700;
	}

	@media (max-width: 992px) {
		.filters-row {
			grid-template-columns: 1fr;
		}

		.source-controls {
			flex-direction: column;
			align-items: stretch;
		}
	}
`;

const StatusButton = styled(Button)`
	font-size: 12px;
	border-color: ${(p) => (p.isActive ? "#0f7e6b" : "initial")};
	background-color: ${(p) => (p.isActive ? "#dff3ef" : "initial")};
	color: ${(p) => (p.isActive ? "#0a5a4c" : "initial")};
`;

const SwitchRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	justify-content: center;
	font-size: 12px;
	color: #102033;
	font-weight: 900;
	border: 1px solid rgba(45, 93, 145, 0.14);
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.78);
	padding: 8px 10px;
	min-height: 42px;

	.switch-text {
		line-height: 1.35;
	}
`;

const SummaryGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
	gap: 12px;
`;

const FinancialSummaryRow = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(280px, 1fr));
	gap: 12px;

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const CardTitle = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 8px;
	color: #102033;
	font-weight: 950;
	line-height: 1.3;

	.title-icon {
		width: 28px;
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: var(--metric-main, #24547d);
		background: var(--metric-soft, rgba(36, 84, 125, 0.12));
		border: 1px solid var(--metric-border, rgba(36, 84, 125, 0.22));
	}
`;

const MetricCard = styled(Card)`
	--metric-main: ${(p) => metricTone(p.$tone).main};
	--metric-soft: ${(p) => metricTone(p.$tone).soft};
	--metric-border: ${(p) => metricTone(p.$tone).border};
	position: relative;
	overflow: hidden;
	border: 1px solid var(--metric-border);
	border-radius: 10px;
	background:
		linear-gradient(135deg, var(--metric-soft), rgba(255, 255, 255, 0.96) 42%),
		#ffffff;
	box-shadow: 0 9px 22px rgba(16, 32, 51, 0.055);

	&::before {
		content: "";
		position: absolute;
		inset-block: 0;
		inset-inline-start: 0;
		width: 4px;
		background: var(--metric-main);
	}

	.ant-card-head {
		min-height: 46px;
		border-bottom-color: rgba(45, 93, 145, 0.1);
		padding-inline: 12px;
	}

	.ant-card-body {
		padding: 12px 14px;
	}

	.ant-progress-inner {
		background: rgba(16, 32, 51, 0.08);
	}
`;

const SectionCard = styled(Card)`
	border: 1px solid rgba(45, 93, 145, 0.16);
	border-radius: 12px;
	box-shadow: 0 10px 24px rgba(16, 32, 51, 0.055);

	.ant-card-head {
		min-height: 48px;
		border-bottom-color: rgba(45, 93, 145, 0.12);
		background: linear-gradient(180deg, rgba(247, 251, 255, 0.9), rgba(255, 255, 255, 0.98));
	}

	.ant-card-body {
		padding: 12px;
	}
`;

const TitleWithFlag = styled.div`
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	font-weight: 950;
	color: #102033;

	.section-title-icon {
		width: 28px;
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: #24547d;
		background: rgba(36, 84, 125, 0.11);
		border: 1px solid rgba(36, 84, 125, 0.2);
	}

	.flag {
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 999px;
		background: #fff7e6;
		border: 1px solid #ffd591;
		color: #ad6800;
	}
`;

const Legend = styled.div`
	display: flex;
	gap: 12px;
	align-items: center;
	flex-wrap: wrap;

	.legend-swatch {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #555;
	}

	.swatch {
		display: inline-block;
		width: 18px;
		height: 10px;
		border-radius: 6px;
	}
	.swatch.low {
		background: ${heatColor(0.1)};
	}
	.swatch.mid {
		background: ${heatColor(0.5)};
	}
	.swatch.high {
		background: ${heatColor(0.9)};
	}
`;

const HeaderRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	align-items: center;
	justify-content: space-between;

	.card-title-text {
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		color: #102033;
	}

	.section-title-icon {
		width: 28px;
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: #24547d;
		background: rgba(36, 84, 125, 0.11);
		border: 1px solid rgba(36, 84, 125, 0.2);
	}

	.inline-flag {
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 999px;
		background: #fff7e6;
		border: 1px solid #ffd591;
		color: #ad6800;
	}
`;

const TableWrapper = styled.div`
	width: 100%;
	overflow: auto;
	-webkit-overflow-scrolling: touch;
	border: 1px solid rgba(45, 93, 145, 0.22);
	border-radius: 12px;
	background: #ffffff;
	box-shadow: 0 12px 28px rgba(16, 32, 51, 0.07);

	/* dynamic column width */
	--col-w: 145px;
	--date-col-w: 180px;
	--total-col-w: 120px;

	table {
		width: 100%;
		min-width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-size: ${(p) => (p.$isArabic ? "12.5px" : "12px")};
		table-layout: fixed;
	}

	th,
	td {
		border-inline-end: 1px solid rgba(45, 93, 145, 0.12);
		border-bottom: 1px solid rgba(45, 93, 145, 0.12);
		padding: 8px 8px;
		text-align: center;
		min-width: var(--col-w);
		width: var(--col-w);
		max-width: var(--col-w);
		font-variant-numeric: tabular-nums;
		vertical-align: middle;
	}

	thead th {
		position: sticky;
		top: 0;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
			linear-gradient(180deg, #244e7d 0%, #102033 100%);
		color: #ffffff;
		z-index: 5;
		height: 52px;
		border-bottom-color: rgba(103, 167, 223, 0.5);
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.24);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
	}

	.date-th,
	.date-td {
		min-width: var(--date-col-w);
		width: var(--date-col-w);
		max-width: var(--date-col-w);
		text-align: ${(p) => (p.$isArabic ? "right" : "left")};
	}

	.date-th {
		text-align: center;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
			linear-gradient(180deg, #244e7d 0%, #102033 100%);
		color: #ffffff;
		font-weight: 900;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.24);
	}

	.sticky-left {
		position: sticky;
		left: ${(p) => (p.$isArabic ? "auto" : "0")};
		right: ${(p) => (p.$isArabic ? "0" : "auto")};
		z-index: 6;
		box-shadow: ${(p) =>
			p.$isArabic
				? "-6px 0 12px rgba(16, 32, 51, 0.06)"
				: "6px 0 12px rgba(16, 32, 51, 0.06)"};
	}

	.total-th,
	.total {
		min-width: var(--total-col-w);
		width: var(--total-col-w);
		max-width: var(--total-col-w);
		font-weight: 700;
	}

	.sticky-right {
		position: sticky;
		right: ${(p) => (p.$isArabic ? "auto" : "0")};
		left: ${(p) => (p.$isArabic ? "0" : "auto")};
		z-index: 6;
		box-shadow: ${(p) =>
			p.$isArabic
				? "6px 0 12px rgba(16, 32, 51, 0.06)"
				: "-6px 0 12px rgba(16, 32, 51, 0.06)"};
	}

	thead .sticky-left,
	thead .sticky-right {
		z-index: 8;
	}

	.room-th .th-inner {
		display: flex;
		flex-direction: column;
		gap: 4px;
		align-items: center;
		justify-content: center;
		line-height: 1.15;
	}

	.th-main {
		font-weight: 900;
		color: #ffffff;
		max-width: calc(var(--col-w) - 16px);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
	}

	.th-sub {
		font-size: ${(p) => (p.$isArabic ? "11.5px" : "11px")};
		color: rgba(224, 241, 255, 0.96);
		font-weight: 850;
		max-width: calc(var(--col-w) - 16px);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
	}

	.derived-flag {
		font-size: 10px;
		padding: 1px 8px;
		border-radius: 999px;
		background: rgba(255, 247, 230, 0.98);
		border: 1px solid #ffd591;
		color: #9a4f00;
		text-shadow: none;
		font-weight: 900;
	}

	.date-td,
	.month-total-left {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(244, 249, 255, 0.98));
		color: #102033;
	}

	.hijri-date {
		font-weight: 900;
		color: #102033;
		line-height: 1.25;
	}

	.greg-date {
		color: #47637f;
		font-weight: 800;
		margin-top: 2px;
		line-height: 1.25;
	}

	.cell {
		cursor: default;
		position: relative;
		overflow: hidden;
		background-image:
			linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 42%),
			linear-gradient(0deg, rgba(0, 0, 0, 0.07), rgba(0, 0, 0, 0));
	}

	.clickable {
		cursor: pointer;
		transition:
			box-shadow 0.12s ease,
			transform 0.12s ease;
	}

	.clickable:hover {
		box-shadow: inset 0 0 0 2px rgba(16, 32, 51, 0.22);
		transform: translateY(-1px);
	}

	.cell-top {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-weight: 800;
		position: relative;
		z-index: 1;
	}

	.numbers {
		font-size: 13px;
		font-weight: 900;
		direction: ltr;
		unicode-bidi: isolate;
	}

	.over-pill {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 999px;
		background: rgba(255, 77, 79, 0.14);
		border: 1px solid rgba(255, 77, 79, 0.35);
		color: rgba(255, 77, 79, 1);
		font-weight: 800;
	}

	.cell-bottom {
		display: flex;
		justify-content: space-between;
		margin-top: 8px;
		gap: 10px;
		position: relative;
		z-index: 1;
	}

	.percent {
		font-weight: 900;
		direction: ltr;
		unicode-bidi: isolate;
	}

	.cell .muted,
	.cell-bottom .muted {
		font-weight: 850;
		opacity: 0.96;
	}

	.month-total-row td {
		font-weight: 800;
		border-top: 2px solid rgba(16, 32, 51, 0.18);
	}

	.month-total-row .cell {
		background-image:
			linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0) 42%),
			linear-gradient(0deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0));
	}

	.month-total-title {
		font-weight: 900;
		color: #102033;
	}

	@media (max-width: 720px) {
		--col-w: 126px;
		--date-col-w: 118px;
		--total-col-w: 108px;

		table {
			font-size: ${(p) => (p.$isArabic ? "11.5px" : "11px")};
		}

		th,
		td {
			padding: 7px 6px;
		}

		.th-sub {
			font-size: 10px;
		}
	}
`;

const BreakdownTable = styled.div`
	overflow-x: auto;
	display: inline-block;
	min-width: 420px;
	max-width: 100%;
	flex: 1 1 420px;

	&.full-width {
		display: block;
		min-width: 100%;
		width: 100%;
		flex: 1 1 100%;
	}

	.table-title {
		font-weight: 600;
		margin-bottom: 6px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	th,
	td {
		border: 1px solid #f0f0f0;
		padding: 6px 8px;
		text-align: left;
	}

	th {
		background: #f6f8f8;
		font-weight: 600;
	}

	.clickable-row {
		cursor: pointer;
	}

	.clickable-row:hover td {
		background: #f6fbfa;
	}

	.date-cell {
		min-width: 170px;
		white-space: normal;
	}

	.hijri-date {
		font-weight: 700;
		color: #234f45;
	}

	.greg-date {
		color: #666;
		margin-top: 2px;
	}

	tfoot td,
	.totals td {
		font-weight: 700;
		background: #fafafa;
	}

	.empty {
		text-align: center;
		color: #777;
	}

	@media (max-width: 768px) {
		min-width: 100%;
		flex: 1 1 100%;
	}
`;

const BreakdownTablesRow = styled.div`
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	align-items: flex-start;
`;

const TypeGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 12px;
	width: 100%;

	.type-card {
		padding: 10px 12px;
		border: 1px solid #f0f0f0;
		border-radius: 10px;
		background: #fcfcfc;
		min-width: 0;
	}

	.type-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 4px;
	}

	.type-main {
		font-weight: 800;
	}

	.type-sub {
		margin-bottom: 8px;
	}

	.derived-pill {
		font-size: 10px;
		padding: 1px 8px;
		border-radius: 999px;
		background: #fff7e6;
		border: 1px solid #ffd591;
		color: #ad6800;
		white-space: nowrap;
	}

	.type-meta {
		margin-top: 6px;
	}
`;

const DetailsSummary = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	gap: 12px;
	margin-bottom: 14px;

	> div {
		position: relative;
		border: 1px solid rgba(45, 93, 145, 0.16);
		border-radius: 10px;
		background:
			linear-gradient(135deg, rgba(229, 243, 255, 0.8), rgba(255, 255, 255, 0.98) 54%),
			#ffffff;
		padding: 12px 14px;
		min-height: 70px;
		box-shadow: 0 8px 18px rgba(16, 32, 51, 0.055);
		overflow: hidden;
	}

	> div::before {
		content: "";
		position: absolute;
		inset-block: 0;
		inset-inline-start: 0;
		width: 4px;
		background: linear-gradient(180deg, #2f74b5 0%, #102033 100%);
	}

	.label {
		color: #5f7285;
		font-size: 11px;
		font-weight: 850;
		letter-spacing: 0;
		line-height: 1.3;
		margin-bottom: 7px;
	}

	.value {
		color: #102033;
		font-size: 13px;
		font-weight: 950;
		line-height: 1.35;
		word-break: break-word;
	}
`;

const DetailTableWrapper = styled.div`
	overflow: auto;
	max-height: min(58vh, 620px);
	border: 1px solid rgba(45, 93, 145, 0.18);
	border-radius: 12px;
	background: #ffffff;
	box-shadow: 0 14px 30px rgba(16, 32, 51, 0.08);
	-webkit-overflow-scrolling: touch;
`;

const DetailTable = styled.table`
	width: 100%;
	min-width: 1180px;
	border-collapse: separate;
	border-spacing: 0;
	font-size: 12px;
	table-layout: auto;

	th,
	td {
		border-inline-end: 1px solid rgba(45, 93, 145, 0.1);
		border-bottom: 1px solid rgba(45, 93, 145, 0.1);
		padding: 9px 10px;
		text-align: start;
		white-space: nowrap;
		vertical-align: middle;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 3;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
			linear-gradient(180deg, #244e7d 0%, #102033 100%);
		color: #ffffff;
		font-weight: 950;
		height: 44px;
		border-bottom-color: rgba(103, 167, 223, 0.5);
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.22);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
	}

	tbody tr {
		background: #ffffff;
		transition:
			background 0.12s ease,
			box-shadow 0.12s ease;
	}

	tbody tr:nth-child(even) {
		background: #f8fbff;
	}

	tbody tr:hover {
		background: #edf7ff;
		box-shadow: inset 0 0 0 1px rgba(47, 116, 181, 0.18);
	}

	td {
		color: #102033;
		font-weight: 650;
	}

	td:first-child,
	th:first-child {
		text-align: center;
		width: 54px;
	}

	td:nth-child(2),
	td:nth-child(3),
	td:nth-child(4) {
		font-weight: 800;
	}

	td:nth-child(12) {
		font-weight: 950;
		color: #0f766e;
	}

	.ant-btn {
		border-radius: 8px;
		border-color: rgba(47, 116, 181, 0.36);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(237, 247, 255, 0.95)),
			#ffffff;
		color: #17405f;
		font-weight: 850;
		box-shadow: 0 5px 12px rgba(16, 32, 51, 0.06);
	}

	.ant-btn:hover,
	.ant-btn:focus {
		border-color: #2f74b5;
		color: #102033;
		background: #edf7ff;
	}

	@media (max-width: 768px) {
		min-width: 980px;

		th,
		td {
			font-size: 11px;
			padding: 8px;
		}
	}
`;
