import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chart from "react-apexcharts";
import { Alert, Button, message, Modal, Pagination, Select, Spin } from "antd";
import {
	BankOutlined,
	BarChartOutlined,
	CalendarOutlined,
	CarryOutOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	DollarCircleOutlined,
	DownloadOutlined,
	FieldTimeOutlined,
	FilterOutlined,
	FullscreenOutlined,
	HistoryOutlined,
	LoginOutlined,
	LogoutOutlined,
	PlusCircleOutlined,
	ShareAltOutlined,
	TableOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import styled, { createGlobalStyle } from "styled-components";
import dayjs from "dayjs";
import moment from "moment-hijri";
import {
	getOverallExecutiveInventoryDayReport,
	getOverallExecutiveInventoryReport,
	getOverallExecutivePaidReport,
	getOverallExecutiveReservationsReport,
	getOverallReservations,
	trackOverallReservationSummaryExport,
} from "../../apiAdmin";
import HotelInventory from "../../HotelReports/HotelInventory";
import OverallReservationDetailsModal from "../OverallReservationsList/OverallReservationDetailsModal";
import {
	formatDate,
	formatMoney,
	getReservationNights,
	getReservationPricePerDay,
	localizeStatus,
	normalizeId,
	OverallCard,
	OverallCards,
	OverallTableWrap,
	statusTone,
	StatusPill,
	TableTooltipText,
	titleCase,
} from "../overallShared";

const SUMMARY_MODAL_Z_INDEX = 11000;

const paidBreakdownLabels = {
	paid_online_via_link: "Online Link",
	paid_at_hotel_cash: "Hotel Cash",
	paid_at_hotel_card: "Hotel Card",
	paid_to_hotel: "Paid To Hotel",
	paid_online_jannatbooking: "Jannat Online",
	paid_online_other_platforms: "Other Platforms",
	paid_online_via_instapay: "InstaPay",
	paid_no_show: "No Show",
};

const reportText = {
	en: {
		refresh: "Refresh",
		loading: "Loading...",
		noData: "No data found.",
		excludeCancelled: "Exclude cancelled",
		totalAmount: "Total Amount",
		reservations: "Reservations",
		paidAmount: "Paid Amount",
		commission: "Commission",
		remaining: "Remaining",
		hotels: "Hotels",
		hotel: "Hotel",
		date: "Date",
		status: "Status",
		source: "Source",
		count: "Count",
		creationDate: "Creation Date",
		checkins: "Arrivals",
		checkouts: "Departures",
		topHotels: "Top Hotels",
		bookingSources: "Booking Sources",
		statusSummary: "Status Summary",
		totalRooms: "Total Rooms",
		todayOccupied: "Occupied Today",
		todayAvailable: "Available Today",
		roomNights: "Room Nights",
		occupancyRate: "Occupancy Rate",
		rangeOccupancy: "Range Occupancy",
		dailyOccupancy: "Daily Occupancy",
		inventoryByHotel: "Inventory By Hotel",
		dailySummary: "Daily Summary",
		selectHotel: "All hotels",
		inventorySelectHotel: "Select one hotel",
		inventoryRequired:
			"Select one hotel, calendar type, month, and year to display this report.",
		calendar: "Calendar",
		gregorian: "Gregorian",
		hijri: "Hijri",
		month: "Month",
		year: "Year",
		searchPlaceholder: "Search guest, confirmation, phone, source",
		search: "Search",
		reset: "Reset",
		confirmation: "Confirmation",
		guest: "Guest",
		checkIn: "Check-in",
		checkOut: "Checkout",
		pricePerDay: "Price / Day",
		breakdown: "Paid Breakdown",
		paymentMethods: "Payment Methods",
		payment: "Payment",
		booked: "Booked",
		nights: "Nights",
		total: "Total",
		moreDetails: "Details",
		prev: "Prev",
		next: "Next",
		page: "Page",
		of: "of",
		sar: "SAR",
		expandChart: "Expand chart",
		cancelledExcluded: "Cancelled and No Show are excluded",
		cancelledIncluded: "Cancelled and No Show are included",
		cancelledScopeHint: "This setting controls the report totals and charts.",
		cancelledScopeLocked: "The selected status requires including these reservations.",
		excludeShort: "Exclude",
		includeShort: "Include",
		exportExcel: "Export to Excel",
		exportingExcel: "Exporting...",
		exportNoData: "No reservations report data is ready to export.",
		exportSuccess: "Reservations report exported.",
		exportError: "Could not export reservations report.",
		reportSummary: "Report Summary",
		reportRow: "Report Row",
		metric: "Metric",
		value: "Value",
		arrivalsDepartures: "Arrivals / Departures",
		statusCreation: "Status / Creation",
		hotelsSources: "Hotels / Sources",
		capturedPayments: "Captured Payments",
		underlyingReservations: "Underlying Reservations",
		rowsShown: "Rows shown",
		openInReservationList: "Open in reservation list",
		scorecardHint: "Click to view the reservations behind this number.",
		chartHint: "Click a chart point to view its reservations.",
		noRowsForSelection: "No reservations found for this selection.",
	},
	ar: {
		refresh: "تحديث",
		loading: "جاري التحميل...",
		noData: "لا توجد بيانات.",
		excludeCancelled: "استبعاد الملغي",
		totalAmount: "إجمالي المبلغ",
		reservations: "الحجوزات",
		paidAmount: "المبلغ المدفوع",
		commission: "العمولة",
		remaining: "المتبقي",
		hotels: "الفنادق",
		hotel: "الفندق",
		date: "التاريخ",
		status: "الحالة",
		source: "المصدر",
		count: "العدد",
		creationDate: "تاريخ الإنشاء",
		checkins: "الوصول",
		checkouts: "المغادرة",
		topHotels: "أفضل الفنادق",
		bookingSources: "مصادر الحجز",
		statusSummary: "ملخص الحالات",
		totalRooms: "إجمالي الغرف",
		todayOccupied: "المشغول اليوم",
		todayAvailable: "المتاح اليوم",
		roomNights: "ليالي الغرف",
		occupancyRate: "نسبة الإشغال",
		rangeOccupancy: "إشغال الفترة",
		dailyOccupancy: "الإشغال اليومي",
		inventoryByHotel: "المخزون حسب الفندق",
		dailySummary: "ملخص الأيام",
		selectHotel: "كل الفنادق",
		searchPlaceholder: "ابحث بالضيف أو التأكيد أو الهاتف أو المصدر",
		search: "بحث",
		reset: "إعادة ضبط",
		confirmation: "رقم التأكيد",
		guest: "الضيف",
		checkIn: "الوصول",
		checkOut: "المغادرة",
		pricePerDay: "\u0633\u0639\u0631 \u0627\u0644\u0644\u064a\u0644\u0629",
		payment: "\u0627\u0644\u062f\u0641\u0639",
		booked: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062d\u062c\u0632",
		nights: "\u0644\u064a\u0627\u0644\u064a",
		total: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
		moreDetails: "\u062a\u0641\u0627\u0635\u064a\u0644",
		breakdown: "تفاصيل المدفوعات",
		paymentMethods: "طرق الدفع",
		prev: "السابق",
		next: "التالي",
		page: "صفحة",
		of: "من",
		sar: "ر.س",
		expandChart: "تكبير الرسم",
		cancelledExcluded: "المُلغى وعدم الحضور مستبعدان",
		cancelledIncluded: "المُلغى وعدم الحضور مضمنان",
		cancelledScopeHint: "هذا الإعداد يطابق أرقام التقرير والرسوم.",
		cancelledScopeLocked: "فلتر الحالة المختار يتطلب تضمين هذه الحجوزات.",
		excludeShort: "استبعاد",
		includeShort: "تضمين",
		exportExcel: "\u062a\u0635\u062f\u064a\u0631 \u0625\u0644\u0649 Excel",
		exportingExcel: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631...",
		exportNoData:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u062d\u062c\u0648\u0632\u0627\u062a \u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u062a\u0635\u062f\u064a\u0631.",
		exportSuccess:
			"\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a.",
		exportError:
			"\u062a\u0639\u0630\u0631 \u062a\u0635\u062f\u064a\u0631 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a.",
		reportSummary:
			"\u0645\u0644\u062e\u0635 \u0627\u0644\u062a\u0642\u0631\u064a\u0631",
		reportRow: "\u0635\u0641 \u0627\u0644\u062a\u0642\u0631\u064a\u0631",
		metric: "\u0627\u0644\u0645\u0624\u0634\u0631",
		value: "\u0627\u0644\u0642\u064a\u0645\u0629",
		arrivalsDepartures:
			"\u0627\u0644\u0648\u0635\u0648\u0644 / \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		statusCreation:
			"\u0627\u0644\u062d\u0627\u0644\u0627\u062a / \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
		hotelsSources:
			"\u0627\u0644\u0641\u0646\u0627\u062f\u0642 / \u0645\u0635\u0627\u062f\u0631 \u0627\u0644\u062d\u062c\u0632",
		capturedPayments:
			"\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u062d\u0635\u0644\u0629",
		underlyingReservations:
			"\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0643\u0648\u0646\u0629 \u0644\u0644\u0631\u0642\u0645",
		rowsShown:
			"\u0627\u0644\u0635\u0641\u0648\u0641 \u0627\u0644\u0645\u0639\u0631\u0648\u0636\u0629",
		openInReservationList:
			"\u0641\u062a\u062d \u0641\u064a \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		scorecardHint:
			"\u0627\u0636\u063a\u0637 \u0644\u0639\u0631\u0636 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u062e\u0644\u0641 \u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645.",
		chartHint:
			"\u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u0646\u0642\u0637\u0629 \u0641\u064a \u0627\u0644\u0631\u0633\u0645 \u0644\u0639\u0631\u0636 \u062d\u062c\u0648\u0632\u0627\u062a\u0647\u0627.",
		noRowsForSelection:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0644\u0647\u0630\u0627 \u0627\u0644\u0627\u062e\u062a\u064a\u0627\u0631.",
	},
};

const getLabels = (chosenLanguage) =>
	reportText[chosenLanguage === "Arabic" ? "ar" : "en"];

const safeRows = (rows) => (Array.isArray(rows) ? rows : []);

const toNumber = (value) => {
	const parsed = Number(value || 0);
	return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value, labels) => `${formatMoney(value)} ${labels.sar}`;

const currencyNumber = (value) => Math.round(toNumber(value) * 100) / 100;

const escapeHtml = (value = "") =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const INVENTORY_QUERY_KEYS = {
	hotelId: "invHotel",
	calendarType: "invCal",
	hijriMonth: "invHMonth",
	hijriYear: "invHYear",
	start: "invStart",
	end: "invEnd",
	includeCancelled: "invIncCancelled",
	paymentStatuses: "invPaymentStatuses",
};

const normalizeInventoryCalendarType = (value = "") =>
	["gregorian", "hijri"].includes(String(value || "").toLowerCase())
		? String(value || "").toLowerCase()
		: "";

const normalizeInventoryDate = (value = "") => {
	const raw = String(value || "").trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
	const parsed = dayjs(raw);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

const normalizeInventoryNumber = (value, fallback, limits = {}) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) return fallback;
	if (limits.min !== undefined && parsed < limits.min) return fallback;
	if (limits.max !== undefined && parsed > limits.max) return fallback;
	return parsed;
};

const normalizeInventoryHijriMonth = (value, fallback) =>
	normalizeInventoryNumber(value, fallback, { min: 0, max: 11 });

const normalizeInventoryHijriYear = (value, fallback) =>
	normalizeInventoryNumber(value, fallback, { min: 1300, max: 1600 });

const normalizeInventoryBool = (value) =>
	["1", "true", "yes"].includes(String(value || "").toLowerCase());

const csvList = (value = "") =>
	String(value || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

const inventoryDateRangeFromQuery = (query, shouldHonorQueryPeriod) => {
	if (!shouldHonorQueryPeriod) return { start: "", end: "" };
	const inventoryStart = normalizeInventoryDate(
		query.get(INVENTORY_QUERY_KEYS.start),
	);
	const inventoryEnd = normalizeInventoryDate(
		query.get(INVENTORY_QUERY_KEYS.end),
	);
	const sharedStart = normalizeInventoryDate(query.get("dateFrom"));
	const sharedEnd = normalizeInventoryDate(query.get("dateTo"));
	const selectedMonths = csvList(query.get("invMonths"));
	if (selectedMonths.length > 1 && sharedStart && sharedEnd) {
		return { start: sharedStart, end: sharedEnd };
	}
	return { start: inventoryStart, end: inventoryEnd };
};

const supportsHijriCalendar = () =>
	typeof moment?.fn?.iMonth === "function" &&
	typeof moment?.fn?.iYear === "function";

const currentHijriSelection = () => {
	if (!supportsHijriCalendar()) return { month: 0, year: dayjs().year() };
	const now = moment();
	return { month: now.iMonth(), year: now.iYear() };
};

const inventoryMonthRange = (calendarType, month, year) => {
	const parsedMonth = Number(month);
	const parsedYear = Number(year);
	if (!Number.isInteger(parsedMonth) || !Number.isInteger(parsedYear)) {
		return { start: "", end: "" };
	}
	if (calendarType === "hijri" && supportsHijriCalendar()) {
		const start = moment()
			.iYear(parsedYear)
			.iMonth(parsedMonth)
			.startOf("iMonth");
		const end = moment()
			.iYear(parsedYear)
			.iMonth(parsedMonth)
			.endOf("iMonth");
		return {
			start: dayjs(start.toDate()).format("YYYY-MM-DD"),
			end: dayjs(end.toDate()).format("YYYY-MM-DD"),
		};
	}
	const start = dayjs().year(parsedYear).month(parsedMonth).startOf("month");
	return {
		start: start.format("YYYY-MM-DD"),
		end: start.endOf("month").format("YYYY-MM-DD"),
	};
};

const monthSelectionFromRange = (calendarType, startDate = "") => {
	const parsed = dayjs(startDate);
	if (!parsed.isValid()) {
		return calendarType === "hijri"
			? currentHijriSelection()
			: { month: dayjs().month(), year: dayjs().year() };
	}
	if (calendarType === "hijri" && supportsHijriCalendar()) {
		const hijri = moment(parsed.toDate());
		return { month: hijri.iMonth(), year: hijri.iYear() };
	}
	return { month: parsed.month(), year: parsed.year() };
};

const chartFont = (isRTL) =>
	isRTL
		? `"Droid Arabic Kufi", "Tajawal", "Cairo", "Segoe UI", sans-serif`
		: `"Inter", "Segoe UI", Arial, sans-serif`;

const chartCategoriesFromOptions = (options = {}) => {
	const categories = options?.w?.config?.xaxis?.categories;
	return Array.isArray(categories) ? categories : [];
};

const chartIndexFromOptions = (options = {}) => {
	const candidates = [
		options?.dataPointIndex,
		options?.tickIndex,
		options?.i,
		options?.index,
	];
	const index = candidates.find(
		(value) => Number.isInteger(Number(value)) && Number(value) >= 0
	);
	return index === undefined ? -1 : Number(index);
};

const resolveChartCategory = (value = "", options = {}) => {
	const categories = chartCategoriesFromOptions(options);
	const optionIndex = chartIndexFromOptions(options);
	if (categories[optionIndex]) return categories[optionIndex];
	if (typeof value === "number" && categories[value]) return categories[value];
	if (/^\d+$/.test(String(value || "")) && categories[Number(value)]) {
		return categories[Number(value)];
	}
	return value;
};

const resolveTooltipCategory = ({ row = {}, w, seriesIndex, dataPointIndex }) => {
	const directRowDate = row.groupKey || row.date || row.day || row._id;
	if (directRowDate) return directRowDate;
	const categories = chartCategoriesFromOptions({ w });
	if (categories[dataPointIndex]) return categories[dataPointIndex];
	const globalCandidates = [
		w?.globals?.categoryLabels?.[dataPointIndex],
		w?.globals?.labels?.[dataPointIndex],
		w?.globals?.timescaleLabels?.[dataPointIndex],
		w?.globals?.seriesX?.[seriesIndex]?.[dataPointIndex],
	];
	const resolvedGlobal = globalCandidates.find(
		(value) => value !== undefined && value !== null && value !== ""
	);
	if (resolvedGlobal) {
		return resolveChartCategory(resolvedGlobal, { w, dataPointIndex });
	}
	return resolveChartCategory(dataPointIndex, { w, dataPointIndex });
};

const formatChartDateLabel = (value = "", options = {}) => {
	const raw = String(value || "");
	const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
	if (!isoMatch) return raw;
	const parsed = dayjs(isoMatch[1]);
	return parsed.isValid()
		? parsed.format(options.full ? "MMM D, YYYY" : "MMM D")
		: raw;
};

const riyadhDayUtcRange = (value = "") => {
	const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return {};
	const [, year, month, day] = match.map(Number);
	const startMs = Date.UTC(year, month - 1, day) - 3 * 60 * 60 * 1000;
	return {
		dateFrom: new Date(startMs).toISOString(),
		dateTo: new Date(startMs + 24 * 60 * 60 * 1000 - 1).toISOString(),
	};
};

const chartLabelFormatter = () => (value, _timestamp, options) =>
	formatChartDateLabel(resolveChartCategory(value, options));

const chartTooltip = ({
	labels,
	isRTL,
	rows = [],
	countLabel = "",
	showAmount = true,
}) => ({
	custom: ({ series, seriesIndex, dataPointIndex, w }) => {
		const seriesName = w?.config?.series?.[seriesIndex]?.name || labels.count;
		const row = Array.isArray(rows) ? rows[dataPointIndex] || {} : {};
		const rawDate = resolveTooltipCategory({
			row,
			w,
			seriesIndex,
			dataPointIndex,
		});
		const title = formatChartDateLabel(rawDate, { full: true }) || "-";
		const value = toNumber(
			row.reservationsCount ?? series?.[seriesIndex]?.[dataPointIndex] ?? 0
		);
		const amount = currencyNumber(row.total_amount);
		const color = w?.globals?.colors?.[seriesIndex] || "#24547d";
		const valueLabel = countLabel || seriesName || labels.reservations;
		const amountRow = showAmount
			? `
				<div class="tooltip-row tooltip-amount">
					<span>${escapeHtml(labels.totalAmount)}</span>
					<strong>${escapeHtml(money(amount, labels))}</strong>
				</div>
			`
			: "";
		return `
			<div class="executive-chart-tooltip" dir="${isRTL ? "rtl" : "ltr"}">
				<div class="tooltip-date">
					<span>${escapeHtml(labels.date || "Date")}</span>
					<strong>${escapeHtml(title)}</strong>
				</div>
				<div class="tooltip-row tooltip-count">
					<span class="tooltip-dot" style="background:${color}"></span>
					<span>${escapeHtml(valueLabel)}</span>
					<strong>${escapeHtml(formatMoney(value))}</strong>
				</div>
				${amountRow}
			</div>
		`;
	},
});

const chartTickAmount = (categories = [], expanded = false) => {
	const count = Array.isArray(categories) ? categories.length : 0;
	if (!count) return 1;
	return Math.min(count, expanded ? 16 : 9);
};

const normalizeStatusText = (status = "") =>
	String(status || "")
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");

const readableStatusLabel = (status = "", chosenLanguage = "English") => {
	const normalized = normalizeStatusText(status);
	if (!normalized) return "-";
	const localized = localizeStatus(status, chosenLanguage);
	if (chosenLanguage === "Arabic" && localized && localized !== status) {
		return localized;
	}
	const labels = {
		"pending finance review": "Pending Finance Review",
		"pending confirmation": "Pending Confirmation",
		"pending agent commission approval": "Pending Agent Approval",
		"inhouse": "In House",
		"in house": "In House",
		"checked in": "Checked In",
		"checked out": "Checked Out",
		"early checked out": "Early Checked Out",
		"no show": "No Show",
		"finance rejected": "Finance Rejected",
	};
	return labels[normalized] || titleCase(normalized);
};

const toneChartColors = {
	red: "#b91c1c",
	orange: "#d97706",
	green: "#059669",
	softGreen: "#0f766e",
	blue: "#2563eb",
	purple: "#7c3aed",
	slate: "#64748b",
};

const statusChartColor = (status = "") => {
	const normalized = normalizeStatusText(status);
	if (/pending finance|finance review/.test(normalized)) return "#f97316";
	if (/pending confirmation|pending/.test(normalized)) return "#d99225";
	if (/agent|commission/.test(normalized)) return "#7c3aed";
	if (/finance rejected|reject/.test(normalized)) return "#b91c1c";
	if (/cancel/.test(normalized)) return "#dc2626";
	if (/no show/.test(normalized)) return "#475569";
	if (/early checked out/.test(normalized)) return "#16a34a";
	if (/checked out|closed/.test(normalized)) return "#059669";
	if (/inhouse|in house|checked in/.test(normalized)) return "#0f766e";
	if (/confirm|approved/.test(normalized)) return "#2563eb";
	return toneChartColors[statusTone(status)] || toneChartColors.slate;
};

const statusNeedsCancelledScope = (status = "") =>
	/cancel|no\s?show/.test(normalizeStatusText(status));

const barOptions = ({
	categories,
	labels,
	isRTL,
	colors = ["#7a328b"],
	expanded = false,
	rows = [],
	countLabel = "",
	showAmount = true,
	showAllXLabels = false,
	onPointClick,
}) => ({
	chart: {
		toolbar: { show: false },
		fontFamily: chartFont(isRTL),
		events: {
			dataPointSelection: (_event, _chartContext, config) => {
				const index = Number(config?.dataPointIndex);
				if (
					typeof onPointClick === "function" &&
					Number.isInteger(index) &&
					index >= 0
				) {
					onPointClick(rows[index] || {}, index, config);
				}
			},
		},
	},
	colors,
	dataLabels: { enabled: false },
	grid: { borderColor: "#edf2f7" },
	xaxis: {
		type: "category",
		categories,
		tickAmount: showAllXLabels
			? Math.max((categories || []).length - 1, 1)
			: chartTickAmount(categories, expanded),
		tickPlacement: "on",
		axisBorder: { color: "#dbe6f3" },
		axisTicks: { color: "#dbe6f3" },
		labels: {
			show: true,
			rotate: showAllXLabels ? -42 : expanded ? -35 : -25,
			rotateAlways: true,
			trim: false,
			hideOverlappingLabels: !showAllXLabels,
			showDuplicates: showAllXLabels,
			minHeight: showAllXLabels ? 76 : expanded ? 76 : 58,
			maxHeight: showAllXLabels ? 104 : expanded ? 96 : 72,
			formatter: chartLabelFormatter(),
			style: {
				fontWeight: 850,
				colors: "#334155",
				fontSize: showAllXLabels ? "9.5px" : expanded ? "12px" : "11px",
			},
		},
		tooltip: {
			enabled: true,
			formatter: (value, options) =>
				formatChartDateLabel(resolveChartCategory(value, options), {
					full: true,
				}),
		},
	},
	yaxis: {
		labels: {
			formatter: (value) => formatMoney(value),
			style: { fontWeight: 800 },
		},
	},
	tooltip: {
		...chartTooltip({ labels, isRTL, rows, countLabel, showAmount }),
		x: {
			formatter: (value, options) =>
				formatChartDateLabel(resolveChartCategory(value, options), {
					full: true,
				}),
		},
		y: { formatter: (value) => formatMoney(value) },
	},
	legend: {
		position: "top",
		horizontalAlign: isRTL ? "right" : "left",
		labels: { colors: "#18212f" },
	},
	noData: { text: labels.noData },
});

const lineOptions = (config) => {
	const base = barOptions(config);
	return {
		...base,
		chart: {
			...base.chart,
			zoom: { enabled: true },
			type: "line",
		},
		stroke: {
			curve: "straight",
			width: 3.5,
			lineCap: "round",
		},
		markers: {
			size: 0,
			strokeWidth: 2,
			hover: { size: 5 },
		},
		fill: {
			opacity: 1,
		},
	};
};

const donutOptions = ({
	labels: sliceLabels,
	colors,
	text,
	isRTL,
	rows = [],
	onPointClick,
}) => ({
	chart: {
		toolbar: { show: false },
		fontFamily: chartFont(isRTL),
		events: {
			dataPointSelection: (_event, _chartContext, config) => {
				const index = Number(config?.dataPointIndex);
				if (
					typeof onPointClick === "function" &&
					Number.isInteger(index) &&
					index >= 0
				) {
					onPointClick(rows[index] || {}, index, config);
				}
			},
		},
	},
	labels: sliceLabels,
	colors,
	stroke: {
		width: 4,
		colors: ["#ffffff"],
	},
	plotOptions: {
		pie: {
			expandOnClick: false,
			donut: {
				size: "72%",
				labels: {
					show: true,
					name: {
						show: true,
						fontWeight: 900,
						color: "#172033",
						offsetY: -4,
					},
					value: {
						show: true,
						fontWeight: 950,
						color: "#102033",
						offsetY: 4,
						formatter: (value) => formatMoney(value),
					},
					total: {
						show: true,
						label: text.reservations,
						fontWeight: 950,
						color: "#17395f",
						formatter: (context) =>
							formatMoney(
								context.globals.seriesTotals.reduce(
									(total, value) => total + Number(value || 0),
									0
								)
							),
					},
				},
			},
		},
	},
	legend: {
		position: "bottom",
		horizontalAlign: "center",
		fontWeight: 800,
		labels: { colors: "#18212f" },
		formatter: (seriesName, opts) => {
			const value = opts?.w?.globals?.series?.[opts.seriesIndex] || 0;
			return `${seriesName} (${formatMoney(value)})`;
		},
		markers: {
			width: 10,
			height: 10,
			radius: 10,
		},
		itemMargin: {
			horizontal: 10,
			vertical: 6,
		},
	},
	dataLabels: {
		enabled: true,
		dropShadow: { enabled: false },
		style: {
			fontWeight: 950,
			colors: ["#ffffff"],
		},
		formatter: (value) =>
			Number(value || 0) >= 4
				? `${Number(value || 0).toFixed(value < 10 ? 1 : 0)}%`
				: "",
	},
	tooltip: {
		custom: ({ seriesIndex, w }) => {
			const row = Array.isArray(rows) ? rows[seriesIndex] || {} : {};
			const label =
				sliceLabels?.[seriesIndex] ||
				w?.globals?.labels?.[seriesIndex] ||
				text.status;
			const count = toNumber(row.reservationsCount ?? w?.globals?.series?.[seriesIndex]);
			const amount = currencyNumber(row.total_amount);
			const color = colors?.[seriesIndex] || "#24547d";
			return `
				<div class="executive-chart-tooltip donut-tooltip" dir="${isRTL ? "rtl" : "ltr"}">
					<div class="tooltip-date">
						<span>${escapeHtml(text.status || "Status")}</span>
						<strong>${escapeHtml(label)}</strong>
					</div>
					<div class="tooltip-row">
						<span class="tooltip-dot" style="background:${color}"></span>
						<span>${escapeHtml(text.reservations)}</span>
						<strong>${escapeHtml(formatMoney(count))}</strong>
					</div>
					<div class="tooltip-row tooltip-amount">
						<span>${escapeHtml(text.totalAmount)}</span>
						<strong>${escapeHtml(money(amount, text))}</strong>
					</div>
				</div>
			`;
		},
	},
	responsive: [
		{
			breakpoint: 640,
			options: {
				plotOptions: { pie: { donut: { size: "68%" } } },
				legend: { fontSize: "11px", itemMargin: { horizontal: 6, vertical: 4 } },
			},
		},
	],
	noData: { text: text.noData },
});

const loadStyledXlsx = async () => {
	const xlsxModule = await import("xlsx-js-style");
	return xlsxModule.default || xlsxModule["module.exports"] || xlsxModule;
};

const safeSheetName = (value = "Sheet") => {
	const cleaned = String(value || "Sheet")
		.replace(/[\\/?*:]/g, " ")
		.replace(/\[/g, " ")
		.replace(/\]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 31);
	return cleaned || "Sheet";
};

const safeFileSegment = (value = "") =>
	String(value || "")
		.replace(/[<>:"/\\|?*]+/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 120) || "report";

const getExportColumnWidth = (key, rows = []) => {
	const headerWidth = Math.ceil(String(key || "").length * 0.9) + 3;
	const contentWidth = rows.reduce((max, row) => {
		const value = row?.[key];
		const length =
			value === null || value === undefined ? 0 : String(value).length;
		return Math.max(max, Math.ceil(length * 0.85) + 3);
	}, headerWidth);
	return Math.min(34, Math.max(12, contentWidth));
};

const appendJsonSheet = (XLSX, workbook, rows, sheetName, emptyText) => {
	const safeRows =
		Array.isArray(rows) && rows.length ? rows : [{ Message: emptyText }];
	const worksheet = XLSX.utils.json_to_sheet(safeRows);
	const headers = Object.keys(safeRows[0] || {});
	worksheet["!cols"] = headers.map((key) => ({
		wch: getExportColumnWidth(key, safeRows),
	}));
	if (worksheet["!ref"]) {
		const range = XLSX.utils.decode_range(worksheet["!ref"]);
		worksheet["!autofilter"] = { ref: worksheet["!ref"] };
		worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
		worksheet["!rows"] = Array.from({ length: range.e.r + 1 }, (_, index) => ({
			hpt: index === 0 ? 28 : 24,
		}));
		for (let column = range.s.c; column <= range.e.c; column += 1) {
			const headerAddress = XLSX.utils.encode_cell({ r: 0, c: column });
			if (!worksheet[headerAddress]) continue;
			worksheet[headerAddress].s = {
				fill: { patternType: "solid", fgColor: { rgb: "12324D" } },
				font: { bold: true, color: { rgb: "FFFFFF" } },
				alignment: { horizontal: "center", vertical: "center", wrapText: true },
				border: {
					top: { style: "thin", color: { rgb: "B7D7F0" } },
					bottom: { style: "thin", color: { rgb: "B7D7F0" } },
					left: { style: "thin", color: { rgb: "B7D7F0" } },
					right: { style: "thin", color: { rgb: "B7D7F0" } },
				},
			};
		}
		for (let row = 1; row <= range.e.r; row += 1) {
			for (let column = range.s.c; column <= range.e.c; column += 1) {
				const address = XLSX.utils.encode_cell({ r: row, c: column });
				if (!worksheet[address]) continue;
				worksheet[address].s = {
					fill: {
						patternType: "solid",
						fgColor: { rgb: row % 2 ? "FFFFFF" : "F7FBFF" },
					},
					alignment: { vertical: "top", wrapText: true },
					border: {
						bottom: { style: "thin", color: { rgb: "E5E7EB" } },
					},
				};
				if (worksheet[address].t === "n") {
					worksheet[address].z = "#,##0.00";
				}
			}
		}
	}
	XLSX.utils.book_append_sheet(
		workbook,
		worksheet,
		safeSheetName(sheetName)
	);
};

const buildTimelineExportRows = (rows, section, labels) =>
	safeRows(rows).map((row) => ({
		[labels.reportRow]: section,
		[labels.date]: formatChartDateLabel(row.groupKey, { full: true }),
		[labels.reservations]: toNumber(row.reservationsCount),
		[labels.totalAmount]: currencyNumber(row.total_amount),
		[labels.paidAmount]: currencyNumber(row.paidAmount),
		[labels.commission]: currencyNumber(row.commission),
		[labels.capturedPayments]: toNumber(row.capturedCount),
	}));

const ExpandableChartPanel = ({ title, labels, renderChart }) => {
	const [open, setOpen] = useState(false);
	const expandText = labels.expandChart || "Expand chart";
	return (
		<section className='report-panel chart-panel'>
			<header>
				<span>{title}</span>
				<Button
					type='text'
					size='small'
					icon={<FullscreenOutlined />}
					aria-label={expandText}
					title={expandText}
					onClick={() => setOpen(true)}
				/>
			</header>
			{renderChart(300, { expanded: false })}
			<Modal
				open={open}
				onCancel={() => setOpen(false)}
				footer={null}
				centered
				destroyOnClose
				getContainer={() => document.body}
				zIndex={SUMMARY_MODAL_Z_INDEX}
				rootClassName='overall-summary-modal-root'
				wrapClassName='overall-summary-chart-modal-wrap'
				className='overall-summary-chart-modal'
				width='min(1180px, calc(100vw - 24px))'
				title={title}
				maskStyle={{ zIndex: SUMMARY_MODAL_Z_INDEX - 1 }}
				styles={{
					mask: { zIndex: SUMMARY_MODAL_Z_INDEX - 1 },
				}}
			>
				<ExpandedChartWrap>{renderChart(560, { expanded: true })}</ExpandedChartWrap>
			</Modal>
		</section>
	);
};

const ReportTable = ({ columns, rows, emptyText, className = "" }) => (
	<OverallTableWrap className={`executive-report-table ${className}`}>
		<table>
			<thead>
				<tr>
					{columns.map((column) => (
						<th key={column.key}>{column.label}</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.length ? (
					rows.map((row, index) => {
						const rowKey =
							row._id ||
							row.hotelId?._id ||
							row.hotelId ||
							row.source ||
							row.date ||
							row.groupKey ||
							index;
						return (
						<tr key={String(rowKey)}>
							{columns.map((column) => (
								<td key={column.key}>
									{column.render ? column.render(row, index) : row[column.key]}
								</td>
							))}
						</tr>
						);
					})
				) : (
					<tr>
						<td colSpan={columns.length}>{emptyText}</td>
					</tr>
				)}
			</tbody>
		</table>
	</OverallTableWrap>
);

const buildDrilldownExportRows = ({
	rows = [],
	labels = {},
	chosenLanguage,
}) =>
	(Array.isArray(rows) ? rows : []).map((reservation, index) => ({
		[labels.index || "#"]: index + 1,
		[labels.hotel]: titleCase(reservation.hotelName || "-"),
		[labels.confirmation]: reservation.confirmation_number || "",
		[labels.guest]: reservation.customer_details?.name || "",
		[labels.source]: reservation.booking_source || "",
		[labels.status]: localizeStatus(
			reservation.reservation_status || reservation.state,
			chosenLanguage
		),
		[labels.payment]: reservation.payment || "",
		[labels.booked]: formatDate(
			reservation.booked_at || reservation.createdAt,
			chosenLanguage
		),
		[labels.checkIn]: formatDate(reservation.checkin_date, chosenLanguage),
		[labels.checkOut]: formatDate(reservation.checkout_date, chosenLanguage),
		[labels.nights]: Number(getReservationNights(reservation) || 0),
		[labels.pricePerDay]: currencyNumber(
			getReservationPricePerDay(reservation)
		),
		[labels.total]: currencyNumber(reservation.total_amount),
		[labels.paidAmount]: currencyNumber(reservation.paid_amount),
	}));

const ReservationDrilldownModal = ({
	open,
	title,
	rows = [],
	loading,
	error,
	labels,
	isRTL,
	chosenLanguage,
	onClose,
	onOpenReservation,
}) => {
	const dateCell = (value) => formatDate(value, chosenLanguage, { max: 16 }) || "-";
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);
	const [exporting, setExporting] = useState(false);
	const safeRowsForModal = useMemo(
		() => (Array.isArray(rows) ? rows : []),
		[rows]
	);
	const totalRows = safeRowsForModal.length;
	const pagedRows = useMemo(() => {
		const start = (page - 1) * pageSize;
		return safeRowsForModal.slice(start, start + pageSize);
	}, [page, pageSize, safeRowsForModal]);
	const pageStartNumber = totalRows ? (page - 1) * pageSize + 1 : 0;

	useEffect(() => {
		if (open) setPage(1);
	}, [open, title]);

	useEffect(() => {
		const maxPage = Math.max(1, Math.ceil(totalRows / pageSize));
		if (page > maxPage) setPage(maxPage);
	}, [page, pageSize, totalRows]);

	const handleExportRows = useCallback(async () => {
		if (!safeRowsForModal.length) {
			message.info(labels.exportNoData);
			return;
		}
		setExporting(true);
		try {
			const XLSX = await loadStyledXlsx();
			const workbook = XLSX.utils.book_new();
			appendJsonSheet(
				XLSX,
				workbook,
				buildDrilldownExportRows({
					rows: safeRowsForModal,
					labels,
					chosenLanguage,
				}),
				labels.underlyingReservations,
				labels.noRowsForSelection || labels.noData
			);
			XLSX.writeFile(
				workbook,
				`${safeFileSegment(title || labels.underlyingReservations)}-${dayjs().format(
					"YYYY-MM-DD-HHmm"
				)}.xlsx`,
				{ compression: true }
			);
			message.success(labels.exportSuccess);
		} catch (error) {
			message.error(labels.exportError);
		} finally {
			setExporting(false);
		}
	}, [chosenLanguage, labels, safeRowsForModal, title]);

	return (
		<>
			<SummaryModalLayerStyle />
			<Modal
				open={open}
				onCancel={onClose}
				footer={null}
				centered
				destroyOnClose
				getContainer={() => document.body}
				zIndex={SUMMARY_MODAL_Z_INDEX}
				rootClassName='overall-summary-modal-root'
				wrapClassName='overall-summary-drilldown-modal-wrap'
				className='overall-summary-drilldown-modal'
				width='min(1560px, calc(100vw - 16px))'
				title={
					<DrilldownTitle dir={isRTL ? "rtl" : "ltr"}>
						<strong>
							<TableOutlined aria-hidden='true' />
							<span>{title || labels.underlyingReservations}</span>
						</strong>
						<span className='drilldown-title-count'>
							{labels.rowsShown}: {totalRows.toLocaleString("en-US")}
						</span>
					</DrilldownTitle>
				}
				maskStyle={{ zIndex: SUMMARY_MODAL_Z_INDEX - 1 }}
				styles={{
					mask: { zIndex: SUMMARY_MODAL_Z_INDEX - 1 },
				}}
			>
				<DrilldownModalBody $isRTL={isRTL}>
					{loading ? (
						<div className='drilldown-loading'>
							<Spin />
							<span>{labels.loading}</span>
						</div>
					) : error ? (
						<Alert type='error' showIcon message={error} />
					) : (
						<>
							<div className='drilldown-toolbar'>
								<div className='drilldown-count'>
									<strong>{totalRows.toLocaleString("en-US")}</strong>
									<span>{labels.underlyingReservations}</span>
								</div>
								<Button
									type='primary'
									icon={<DownloadOutlined />}
									loading={exporting}
									disabled={!totalRows}
									onClick={handleExportRows}
									className='drilldown-export-btn'
								>
									{exporting ? labels.exportingExcel : labels.exportExcel}
								</Button>
							</div>
							<OverallTableWrap>
								<table className='reservation-list-table reservation-main-table'>
								<thead>
									<tr>
										<th>#</th>
										<th>{labels.hotel}</th>
										<th>{labels.confirmation}</th>
										<th>{labels.guest}</th>
										<th>{labels.source}</th>
										<th>{labels.status}</th>
										<th>{labels.payment}</th>
										<th>{labels.booked}</th>
										<th>{labels.checkIn}</th>
										<th>{labels.checkOut}</th>
										<th>{labels.nights}</th>
										<th>{labels.pricePerDay}</th>
										<th>{labels.total}</th>
										<th>{labels.paidAmount}</th>
										<th>{labels.moreDetails}</th>
									</tr>
								</thead>
								<tbody>
									{pagedRows.length ? (
										pagedRows.map((reservation, index) => (
											<tr key={normalizeId(reservation._id) || index}>
												<td>{pageStartNumber + index}</td>
												<td className='hotel-cell'>
													<TableTooltipText
														value={titleCase(reservation.hotelName || "-")}
														className='table-truncate'
													/>
												</td>
												<td>{reservation.confirmation_number || "-"}</td>
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
													<StatusPill
														$tone={statusTone(reservation.reservation_status)}
													>
														<TableTooltipText
															value={localizeStatus(
																reservation.reservation_status,
																chosenLanguage
															)}
														/>
													</StatusPill>
												</td>
												<td>
													<TableTooltipText value={reservation.payment || "-"} />
												</td>
												<td className='date-cell'>
													{dateCell(reservation.booked_at || reservation.createdAt)}
												</td>
												<td className='date-cell'>
													{dateCell(reservation.checkin_date)}
												</td>
												<td className='date-cell'>
													{dateCell(reservation.checkout_date)}
												</td>
												<td className='amount-cell'>
													{getReservationNights(reservation)}
												</td>
												<td className='amount-cell'>
													{money(getReservationPricePerDay(reservation), labels)}
												</td>
												<td className='amount-cell'>
													{money(reservation.total_amount, labels)}
												</td>
												<td className='amount-cell'>
													{money(reservation.paid_amount, labels)}
												</td>
												<td>
													<button
														type='button'
														className='link-btn'
														onClick={() => onOpenReservation(reservation)}
													>
														{labels.moreDetails}
													</button>
												</td>
											</tr>
										))
									) : (
										<tr>
											<td colSpan='15'>{labels.noRowsForSelection}</td>
										</tr>
									)}
								</tbody>
							</table>
						</OverallTableWrap>
						{totalRows > 0 && (
							<div className='drilldown-pagination'>
								<Pagination
									current={page}
									pageSize={pageSize}
									total={totalRows}
									showSizeChanger
									pageSizeOptions={["10", "15", "25", "50", "100"]}
									size='small'
									showLessItems
									onChange={(nextPage, nextSize) => {
										setPage(nextPage);
										setPageSize(nextSize);
									}}
									onShowSizeChange={(_current, nextSize) => {
										setPage(1);
										setPageSize(nextSize);
									}}
								/>
							</div>
						)}
					</>
				)}
				</DrilldownModalBody>
			</Modal>
		</>
	);
};

const LoadingBlock = ({ loading, error, labels, children }) => {
	if (loading) {
		return (
			<div className='report-loading'>
				<Spin />
				<span>{labels.loading}</span>
			</div>
		);
	}
	if (error) return <Alert type='error' showIcon message={error} />;
	return children;
};

const SummaryModalLayerStyle = createGlobalStyle`
	.overall-summary-modal-root .ant-modal-mask {
		background: rgba(15, 23, 42, 0.62) !important;
		backdrop-filter: blur(2px);
		z-index: ${SUMMARY_MODAL_Z_INDEX - 1} !important;
	}

	.overall-summary-modal-root .ant-modal-wrap,
	.overall-summary-modal-root .ant-modal,
	.overall-summary-drilldown-modal-wrap,
	.overall-summary-chart-modal-wrap {
		z-index: ${SUMMARY_MODAL_Z_INDEX} !important;
	}

	.overall-summary-drilldown-modal,
	.overall-summary-chart-modal {
		z-index: ${SUMMARY_MODAL_Z_INDEX} !important;
	}
`;

const mySummaryText = {
	en: {
		title: "Reservation Department Report",
		subtitle: "Main report",
		agentTitle: "My Agent Reservation Report",
		agentSubtitle: "Only reservations tied to my agent account",
		filterHint: "Use the filters button above to change hotels, dates, status, and search.",
		allPendingTitle: "All Reservation Requests",
		agentAllPendingTitle: "My Reservation Requests",
		pendingRequests: "Pending Reservation Requests",
		agentPendingRequests: "My Pending Requests",
		show: "View",
		allReservationCount: "All Reservation Count",
		agentReservationCount: "My Reservation Count",
		totalAmount: "Total Amount",
		nights: "Nights",
		hotels: "Hotels",
		sources: "Sources",
		newToday: "New Reservations Today",
		newReservations: "New Reservations",
		todayOperation: "Today's Operation",
		arrivals: "Arrivals",
		departures: "Departures",
		checkedIn: "Checked In",
		noShow: "No Show",
		futureOperation: "Group Future Operation",
		agentFutureOperation: "My Future Operation",
		arrivalsByDay: "Arrivals by day",
		departuresByDay: "Departures by day",
		checkInReservations: "Arrival reservations",
		checkOutReservations: "Departure reservations",
		checkIn: "Arrival",
		checkOut: "Departure",
		occupancyToday: "Occupancy Today",
		booked: "Booked",
		available: "Available",
		blocked: "Blocked",
		today: "Today",
		yesterday: "Yesterday",
		thisMonth: "This Month",
		all: "All",
		topHotel: "Top Hotel",
		topSource: "Top Booking Source",
		agentTopHotel: "My Top Assigned Hotel",
		agentTopSource: "My Top Booking Source",
		rankingPeriod: "Ranking Period",
		new: "New",
		arrival: "Arrival",
		departure: "Departure",
		reservationUnit: "reservations",
		noRankingData: "No ranking data for this selection.",
	},
	ar: {
		title: "\u062a\u0642\u0631\u064a\u0631 \u0642\u0633\u0645 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		subtitle: "\u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
		agentTitle: "\u062a\u0642\u0631\u064a\u0631 \u062d\u062c\u0648\u0632\u0627\u062a\u064a \u0643\u0648\u0643\u064a\u0644",
		agentSubtitle:
			"\u0641\u0642\u0637 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u062d\u0633\u0627\u0628\u064a \u0643\u0648\u0643\u064a\u0644",
		filterHint:
			"\u0627\u0633\u062a\u062e\u062f\u0645 \u0632\u0631 \u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0623\u0639\u0644\u0627\u0647 \u0644\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0648\u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0648\u0627\u0644\u062d\u0627\u0644\u0629 \u0648\u0627\u0644\u0628\u062d\u062b.",
		allPendingTitle: "\u0643\u0644 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062d\u062c\u0632",
		agentAllPendingTitle: "\u0637\u0644\u0628\u0627\u062a \u062d\u062c\u0632\u064a",
		pendingRequests:
			"\u0637\u0644\u0628\u0627\u062a \u062d\u062c\u0632 \u0645\u0639\u0644\u0642\u0629",
		agentPendingRequests:
			"\u0637\u0644\u0628\u0627\u062a\u064a \u0627\u0644\u0645\u0639\u0644\u0642\u0629",
		show: "\u0639\u0631\u0636",
		allReservationCount:
			"\u0639\u062f\u062f \u0643\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		agentReservationCount:
			"\u0639\u062f\u062f \u062d\u062c\u0648\u0632\u0627\u062a\u064a",
		totalAmount: "\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a\u0629",
		nights: "\u0644\u064a\u0627\u0644\u064a",
		hotels: "\u0639\u062f\u062f \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		sources: "\u0627\u0644\u0645\u0635\u0627\u062f\u0631",
		newToday: "\u062d\u062c\u0648\u0632\u0627\u062a \u062c\u062f\u064a\u062f\u0629 \u0627\u0644\u064a\u0648\u0645",
		newReservations: "\u062d\u062c\u0632 \u062c\u062f\u064a\u062f",
		todayOperation: "\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u064a\u0648\u0645",
		arrivals: "\u0627\u0644\u0648\u0635\u0648\u0644",
		departures: "\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		checkedIn: "\u062a\u0645 \u0627\u0644\u062a\u0633\u0643\u064a\u0646",
		noShow: "\u0639\u062f\u0645 \u062d\u0636\u0648\u0631",
		futureOperation:
			"\u0627\u0644\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u0642\u0628\u0644\u064a \u0644\u0644\u0645\u062c\u0645\u0648\u0639\u0629",
		agentFutureOperation:
			"\u062a\u0634\u063a\u064a\u0644 \u062d\u062c\u0648\u0632\u0627\u062a\u064a \u0627\u0644\u0642\u0627\u062f\u0645\u0629",
		arrivalsByDay:
			"\u062a\u0633\u062c\u064a\u0644\u0627\u062a \u0627\u0644\u0648\u0635\u0648\u0644 \u062d\u0633\u0628 \u0627\u0644\u064a\u0648\u0645",
		departuresByDay:
			"\u062a\u0633\u062c\u064a\u0644\u0627\u062a \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629 \u062d\u0633\u0628 \u0627\u0644\u064a\u0648\u0645",
		checkInReservations:
			"\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u062f\u062e\u0648\u0644",
		checkOutReservations:
			"\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u062e\u0631\u0648\u062c",
		checkIn: "\u062f\u062e\u0648\u0644",
		checkOut: "\u062e\u0631\u0648\u062c",
		occupancyToday: "\u0625\u0634\u063a\u0627\u0644 \u0627\u0644\u064a\u0648\u0645",
		booked: "\u0645\u062d\u062c\u0648\u0632",
		available: "\u0645\u062a\u0627\u062d",
		blocked: "\u0645\u062d\u062c\u0648\u0628",
		today: "\u0627\u0644\u064a\u0648\u0645",
		yesterday: "\u0623\u0645\u0633",
		thisMonth: "\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631",
		all: "\u0627\u0644\u0643\u0644",
		topHotel: "\u0627\u0644\u0641\u0646\u062f\u0642 \u0627\u0644\u0623\u0639\u0644\u0649",
		topSource: "\u0627\u0644\u0645\u0635\u062f\u0631 \u0627\u0644\u0623\u0639\u0644\u0649",
		agentTopHotel:
			"\u0623\u0639\u0644\u0649 \u0641\u0646\u062f\u0642 \u0645\u062e\u0635\u0635 \u0644\u064a",
		agentTopSource:
			"\u0623\u0639\u0644\u0649 \u0645\u0635\u062f\u0631 \u0644\u062d\u062c\u0648\u0632\u0627\u062a\u064a",
		rankingPeriod: "\u0641\u062a\u0631\u0629 \u0627\u0644\u062a\u0635\u0646\u064a\u0641",
		new: "\u062c\u062f\u064a\u062f",
		arrival: "\u062f\u062e\u0648\u0644",
		departure: "\u062e\u0631\u0648\u062c",
		reservationUnit: "\u062d\u062c\u0632",
		noRankingData:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0647\u0630\u0627 \u0627\u0644\u0627\u062e\u062a\u064a\u0627\u0631.",
	},
};

const getMySummaryText = (chosenLanguage) =>
	mySummaryText[chosenLanguage === "Arabic" ? "ar" : "en"];

const pendingSummaryStatusRegex =
	/pending[-_\s]?confirmation|pending[-_\s]?finance[-_\s]?review|pending[-_\s]?agent[-_\s]?commission[-_\s]?approval|finance[-_\s]?rejected|rejected/i;
const inHouseSummaryStatusRegex = /house|in[-_\s]?house|checked[-_\s]?in/i;
const noShowSummaryStatusRegex = /no[-_\s]?show/i;

const statusTextFromReservation = (reservation = {}) =>
	`${reservation.reservation_status || ""} ${reservation.state || ""}`;

const matchesReservationStatus = (reservation = {}, regex) =>
	regex.test(statusTextFromReservation(reservation));

const riyadhYmd = (value) => {
	if (!value) return "";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone: "Asia/Riyadh",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).formatToParts(parsed);
		const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
		return map.year && map.month && map.day
			? `${map.year}-${map.month}-${map.day}`
			: "";
	} catch (error) {
		return dayjs(parsed).format("YYYY-MM-DD");
	}
};

const summarizeReservationRows = (rows = []) => {
	const hotels = new Set();
	const sources = new Set();
	return safeRows(rows).reduce(
		(summary, reservation) => {
			summary.count += 1;
			summary.totalAmount += toNumber(reservation.total_amount);
			summary.nights += toNumber(getReservationNights(reservation));
			const hotelId = normalizeId(reservation.hotelId);
			if (hotelId) hotels.add(hotelId);
			const source = String(reservation.booking_source || "").trim();
			if (source) sources.add(source.toLowerCase());
			return summary;
		},
		{
			count: 0,
			totalAmount: 0,
			nights: 0,
			get hotelCount() {
				return hotels.size;
			},
			get sourceCount() {
				return sources.size;
			},
		}
	);
};

const createdTodayReportParams = (params = {}, range = {}) => {
	const next = { ...(params || {}) };
	[
		"dateFrom",
		"dateTo",
		"invStart",
		"invEnd",
		"invCal",
		"invHMonth",
		"invHYear",
		"invMonths",
		"reportMonths",
		"bucketDateBy",
		"bucketDateField",
		"bucketDateFrom",
		"bucketDateTo",
		"bucketFrom",
		"bucketTo",
	].forEach((key) => delete next[key]);
	return {
		...next,
		range: "custom",
		dateBy: "createdAt",
		sortBy: "createdAt",
		sortOrder: "desc",
		dateFrom: range.dateFrom,
		dateTo: range.dateTo,
	};
};

const operationsWindowForToday = (todayKey = currentRiyadhDate()) => {
	const center = dayjs(todayKey);
	const start = center.subtract(14, "day");
	const days = Array.from({ length: 29 }).map((_, index) =>
		start.add(index, "day").format("YYYY-MM-DD")
	);
	const startRange = riyadhDayUtcRange(days[0]);
	const endRange = riyadhDayUtcRange(days[days.length - 1]);
	return {
		days,
		dateFrom: startRange.dateFrom,
		dateTo: endRange.dateTo,
	};
};

const hotelScopedOperationsParams = (params = {}, dateField, range = {}) => {
	const selectedHotels = params.hotelId || params.invHotel || "";
	return {
		ownerId: params.ownerId || "",
		hotelId: selectedHotels,
		invHotel: selectedHotels,
		range: "custom",
		dateBy: dateField,
		sortBy: dateField,
		sortOrder: "asc",
		dateFrom: range.dateFrom,
		dateTo: range.dateTo,
		status: "",
		search: "",
		bookingSource: "",
		payment: "",
		includeCancelled: false,
		excludeCancelled: true,
	};
};

const timelineRowsForWindow = (rows = [], days = []) => {
	const byDay = new Map(
		safeRows(rows).map((row) => [row.groupKey, row])
	);
	return days.map((groupKey) => {
		const existing = byDay.get(groupKey) || {};
		return {
			...existing,
			groupKey,
			reservationsCount: toNumber(existing.reservationsCount),
			total_amount: toNumber(existing.total_amount),
		};
	});
};

const timelineChartValue = (row = {}) =>
	toNumber(row.reservationsCount) > 0 ? toNumber(row.reservationsCount) : 0.08;

const sameRiyadhDate = (field, groupKey) => (reservation = {}) =>
	riyadhYmd(reservation?.[field]) === groupKey;

const currentRiyadhDate = () => riyadhYmd(new Date());

const previousRiyadhDate = () => riyadhYmd(dayjs().subtract(1, "day").toDate());

const rankingFieldForMode = (mode) => {
	if (mode === "arrival") return "checkin_date";
	if (mode === "departure") return "checkout_date";
	return "createdAt";
};

const rankingRowsForPeriod = (rows = [], mode = "new", period = "all") => {
	const field = rankingFieldForMode(mode);
	const today = currentRiyadhDate();
	const yesterday = previousRiyadhDate();
	const monthPrefix = today.slice(0, 7);
	return safeRows(rows).filter((reservation) => {
		const key = riyadhYmd(reservation?.[field]);
		if (!key) return false;
		if (period === "today") return key === today;
		if (period === "yesterday") return key === yesterday;
		if (period === "month") return key.startsWith(monthPrefix);
		return true;
	});
};

const buildRankingRows = (rows = [], type = "hotel") => {
	const map = new Map();
	safeRows(rows).forEach((reservation) => {
		const id =
			type === "hotel"
				? normalizeId(reservation.hotelId)
				: String(reservation.booking_source || "").trim().toLowerCase();
		if (!id) return;
		const label =
			type === "hotel"
				? titleCase(reservation.hotelName || reservation.hotel?.hotelName || "Hotel")
				: titleCase(reservation.booking_source || "Unknown");
		if (!map.has(id)) {
			map.set(id, {
				id,
				label,
				value: 0,
				totalAmount: 0,
				nights: 0,
				hotelId: type === "hotel" ? id : "",
				source: type === "source" ? reservation.booking_source || "" : "",
			});
		}
		const row = map.get(id);
		row.value += 1;
		row.totalAmount += toNumber(reservation.total_amount);
		row.nights += toNumber(getReservationNights(reservation));
	});
	return [...map.values()]
		.sort((a, b) => b.value - a.value || b.totalAmount - a.totalAmount)
		.slice(0, 6);
};

const modeIcon = (value) => {
	if (value === "arrival" || value === "checkin") return <LoginOutlined />;
	if (value === "departure" || value === "checkout") return <LogoutOutlined />;
	return <PlusCircleOutlined />;
};

const periodIcon = (value) => {
	if (value === "today") return <CalendarOutlined />;
	if (value === "yesterday") return <HistoryOutlined />;
	if (value === "month") return <CarryOutOutlined />;
	return <FilterOutlined />;
};

const IconText = ({ icon, children }) => (
	<>
		{icon ? (
			<span className='button-icon' aria-hidden='true'>
				{icon}
			</span>
		) : null}
		<span>{children}</span>
	</>
);

const SectionHeading = ({ icon, children }) => (
	<h3>
		{icon ? (
			<span className='section-title-icon' aria-hidden='true'>
				{icon}
			</span>
		) : null}
		<span>{children}</span>
	</h3>
);

const MySummaryMetric = ({ label, value, onClick, large = false, icon }) => (
	<button
		type='button'
		className={large ? "metric-chip large" : "metric-chip"}
		onClick={onClick}
	>
		{icon ? (
			<span className='metric-icon' aria-hidden='true'>
				{icon}
			</span>
		) : null}
		<span className='metric-label'>{label}</span>
		<strong>{value}</strong>
	</button>
);

const MySummaryRankingPanel = ({
	title,
	type,
	rows,
	labels,
	onOpenRow,
}) => {
	const maxValue = Math.max(...rows.map((row) => row.value), 1);
	return (
		<section className='ranking-panel'>
			<SectionHeading icon={type === "hotel" ? <BankOutlined /> : <ShareAltOutlined />}>
				{title}
			</SectionHeading>
			<div className='ranking-list'>
				{rows.length ? (
					rows.map((row) => {
						const percent = row.value ? Math.max((row.value / maxValue) * 100, 7) : 0;
						return (
							<button
								key={row.id}
								type='button'
								className='ranking-row'
								onClick={() => onOpenRow(row)}
								title={`${row.label}: ${row.value}`}
							>
								<span className='ranking-value'>
									{formatMoney(row.value)} {labels.reservationUnit}
								</span>
								<span className='ranking-name'>
									<span className='ranking-row-icon' aria-hidden='true'>
										{type === "hotel" ? <BankOutlined /> : <ShareAltOutlined />}
									</span>
									<span className='ranking-name-text'>{row.label}</span>
								</span>
								<span className='ranking-track'>
									<span style={{ width: `${percent}%` }} />
								</span>
							</button>
						);
					})
				) : (
					<div className='ranking-empty'>{labels.noRankingData}</div>
				)}
			</div>
		</section>
	);
};

export const ExecutiveMySummaryReport = ({
	active,
	userId,
	token,
	params,
	chosenLanguage,
	agentOnly = false,
}) => {
	const modalLabels = getLabels(chosenLanguage);
	const labels = { ...modalLabels, ...getMySummaryText(chosenLanguage) };
	if (agentOnly) {
		labels.title = labels.agentTitle || labels.title;
		labels.subtitle = labels.agentSubtitle || labels.subtitle;
		labels.allPendingTitle = labels.agentAllPendingTitle || labels.allPendingTitle;
		labels.pendingRequests = labels.agentPendingRequests || labels.pendingRequests;
		labels.allReservationCount =
			labels.agentReservationCount || labels.allReservationCount;
		labels.futureOperation = labels.agentFutureOperation || labels.futureOperation;
		labels.topHotel = labels.agentTopHotel || labels.topHotel;
		labels.topSource = labels.agentTopSource || labels.topSource;
	}
	const isRTL = chosenLanguage === "Arabic";
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [report, setReport] = useState(null);
	const [createdTodayReport, setCreatedTodayReport] = useState(null);
	const [operationsReports, setOperationsReports] = useState({
		checkin: null,
		checkout: null,
	});
	const [todayOperationRows, setTodayOperationRows] = useState([]);
	const [reservationRows, setReservationRows] = useState([]);
	const [chartMode, setChartMode] = useState("checkin");
	const [hotelRankMode, setHotelRankMode] = useState("new");
	const [sourceRankMode, setSourceRankMode] = useState("new");
	const [rankPeriod, setRankPeriod] = useState("all");
	const [drilldown, setDrilldown] = useState({
		open: false,
		title: "",
		rows: [],
		loading: false,
		error: "",
	});
	const [selectedReservation, setSelectedReservation] = useState(null);
	const requestRef = useRef(0);
	const drilldownRequestRef = useRef(0);
	const statusRequiresCancelledScope = statusNeedsCancelledScope(params?.status);
	const includeCancelledFromFilters =
		String(params?.includeCancelled || "").toLowerCase() === "true";
	const effectiveExcludeCancelled =
		!includeCancelledFromFilters && !statusRequiresCancelledScope;

	const reportParams = useMemo(
		() => ({
			...(params || {}),
			includeCancelled: !effectiveExcludeCancelled,
			excludeCancelled: effectiveExcludeCancelled,
		}),
		[effectiveExcludeCancelled, params]
	);

	const drilldownBaseParams = useMemo(
		() => ({
			...reportParams,
			page: 1,
			exportAll: "true",
			limit: 5000,
		}),
		[reportParams]
	);
	const createdTodayKey = currentRiyadhDate();
	const createdTodayRange = useMemo(
		() => riyadhDayUtcRange(createdTodayKey),
		[createdTodayKey]
	);
	const createdTodayParams = useMemo(
		() => createdTodayReportParams(reportParams, createdTodayRange),
		[createdTodayRange, reportParams]
	);
	const operationsWindow = useMemo(
		() => operationsWindowForToday(createdTodayKey),
		[createdTodayKey]
	);
	const checkinOperationsParams = useMemo(
		() =>
			hotelScopedOperationsParams(
				reportParams,
				"checkin_date",
				operationsWindow
			),
		[operationsWindow, reportParams]
	);
	const checkoutOperationsParams = useMemo(
		() =>
			hotelScopedOperationsParams(
				reportParams,
				"checkout_date",
				operationsWindow
			),
		[operationsWindow, reportParams]
	);
	const todayCheckinParams = useMemo(
		() => ({
			...hotelScopedOperationsParams(
				reportParams,
				"checkin_date",
				createdTodayRange
			),
			page: 1,
			exportAll: "true",
			limit: 5000,
		}),
		[createdTodayRange, reportParams]
	);
	const todayCheckoutParams = useMemo(
		() => ({
			...hotelScopedOperationsParams(
				reportParams,
				"checkout_date",
				createdTodayRange
			),
			page: 1,
			exportAll: "true",
			limit: 5000,
		}),
		[createdTodayRange, reportParams]
	);
	const todayCheckinStatusParams = useMemo(
		() => ({
			...todayCheckinParams,
			includeCancelled: true,
			excludeCancelled: false,
		}),
		[todayCheckinParams]
	);

	useEffect(() => {
		if (!active || !userId || !token) return;
		const requestId = requestRef.current + 1;
		requestRef.current = requestId;
		setLoading(true);
		setError("");
		Promise.all([
			getOverallExecutiveReservationsReport(userId, token, reportParams),
			getOverallExecutiveReservationsReport(userId, token, createdTodayParams),
			getOverallExecutiveReservationsReport(userId, token, checkinOperationsParams),
			getOverallExecutiveReservationsReport(userId, token, checkoutOperationsParams),
			getOverallReservations(userId, token, todayCheckinStatusParams),
			getOverallReservations(userId, token, drilldownBaseParams),
		])
			.then(([
				reportData,
				createdTodayData,
				checkinOperationsData,
				checkoutOperationsData,
				todayOperationRowsData,
				rowsData,
			]) => {
				if (requestRef.current !== requestId) return;
				if (
					reportData?.error ||
					createdTodayData?.error ||
					checkinOperationsData?.error ||
					checkoutOperationsData?.error ||
					todayOperationRowsData?.error ||
					rowsData?.error
				) {
					setError(
						reportData?.error ||
							createdTodayData?.error ||
							checkinOperationsData?.error ||
							checkoutOperationsData?.error ||
							todayOperationRowsData?.error ||
							rowsData?.error ||
							modalLabels.exportError
					);
					setReport(null);
					setCreatedTodayReport(null);
					setOperationsReports({ checkin: null, checkout: null });
					setTodayOperationRows([]);
					setReservationRows([]);
					return;
				}
				setReport(reportData || null);
				setCreatedTodayReport(createdTodayData || null);
				setOperationsReports({
					checkin: checkinOperationsData || null,
					checkout: checkoutOperationsData || null,
				});
				setTodayOperationRows(
					Array.isArray(todayOperationRowsData?.reservations)
						? todayOperationRowsData.reservations
						: []
				);
				setReservationRows(
					Array.isArray(rowsData?.reservations) ? rowsData.reservations : []
				);
			})
			.catch(() => {
				if (requestRef.current !== requestId) return;
				setError(modalLabels.exportError);
				setReport(null);
				setCreatedTodayReport(null);
				setOperationsReports({ checkin: null, checkout: null });
				setTodayOperationRows([]);
				setReservationRows([]);
			})
			.finally(() => {
				if (requestRef.current === requestId) setLoading(false);
			});
	}, [
		active,
		checkinOperationsParams,
		checkoutOperationsParams,
		createdTodayParams,
		drilldownBaseParams,
		modalLabels.exportError,
		reportParams,
		todayCheckinStatusParams,
		token,
		userId,
	]);

	const statsFromRows = useMemo(
		() => summarizeReservationRows(reservationRows),
		[reservationRows]
	);
	const stats = report?.stats || {};
	const baseStats = {
		count: toNumber(stats.reservationsCount || statsFromRows.count),
		totalAmount: toNumber(stats.total_amount || statsFromRows.totalAmount),
		nights: toNumber(stats.roomNights || statsFromRows.nights),
		hotelCount: toNumber(
			stats.hotelsWithReservations || statsFromRows.hotelCount
		),
		sourceCount: toNumber(
			stats.sourcesWithReservations || statsFromRows.sourceCount
		),
	};
	const createdTodayStats = createdTodayReport?.stats || {};
	const newTodayStats = {
		count: toNumber(createdTodayStats.reservationsCount),
		totalAmount: toNumber(createdTodayStats.total_amount),
		nights: toNumber(createdTodayStats.roomNights),
		hotelCount: toNumber(createdTodayStats.hotelsWithReservations),
		sourceCount: toNumber(createdTodayStats.sourcesWithReservations),
	};
	const statusRows = safeRows(report?.reservationsByBookingStatus);
	const pendingCount = statusRows.length
		? statusRows
				.filter((row) => pendingSummaryStatusRegex.test(row.reservation_status || ""))
				.reduce((total, row) => total + toNumber(row.reservationsCount), 0)
		: reservationRows.filter((row) =>
				matchesReservationStatus(row, pendingSummaryStatusRegex)
		  ).length;
	const noShowCount = todayOperationRows.filter((row) =>
		matchesReservationStatus(row, noShowSummaryStatusRegex)
	).length;
	const checkedInCount = todayOperationRows.filter((row) =>
		matchesReservationStatus(row, inHouseSummaryStatusRegex)
	).length;
	const checkinRows = timelineRowsForWindow(
		operationsReports.checkin?.checkinsByDay,
		operationsWindow.days
	);
	const checkoutRows = timelineRowsForWindow(
		operationsReports.checkout?.checkoutsByDay,
		operationsWindow.days
	);
	const todayCheckinCount = toNumber(
		checkinRows.find((row) => row.groupKey === createdTodayKey)?.reservationsCount
	);
	const todayCheckoutCount = toNumber(
		checkoutRows.find((row) => row.groupKey === createdTodayKey)?.reservationsCount
	);
	const activeTimelineRows = chartMode === "checkin" ? checkinRows : checkoutRows;
	const chartField = chartMode === "checkin" ? "checkin_date" : "checkout_date";
	const rankingTabs = [
		{ value: "new", label: labels.new },
		{ value: "arrival", label: labels.arrival },
		{ value: "departure", label: labels.departure },
	];
	const periodTabs = [
		{ value: "today", label: labels.today },
		{ value: "yesterday", label: labels.yesterday },
		{ value: "month", label: labels.thisMonth },
		{ value: "all", label: labels.all },
	];
	const hotelRankingRows = useMemo(
		() =>
			buildRankingRows(
				rankingRowsForPeriod(reservationRows, hotelRankMode, rankPeriod),
				"hotel"
			),
		[hotelRankMode, rankPeriod, reservationRows]
	);
	const sourceRankingRows = useMemo(
		() =>
			buildRankingRows(
				rankingRowsForPeriod(reservationRows, sourceRankMode, rankPeriod),
				"source"
			),
		[rankPeriod, reservationRows, sourceRankMode]
	);

	const closeDrilldown = useCallback(() => {
		setDrilldown((current) => ({ ...current, open: false }));
	}, []);

	const openDrilldown = useCallback(
		({ title, extraParams = {}, clientFilter = null } = {}) => {
			if (!userId || !token) return;
			const requestId = drilldownRequestRef.current + 1;
			drilldownRequestRef.current = requestId;
			setDrilldown({
				open: true,
				title: title || labels.underlyingReservations,
				rows: [],
				loading: true,
				error: "",
			});
			getOverallReservations(userId, token, {
				...drilldownBaseParams,
				...extraParams,
			})
				.then((data) => {
					if (drilldownRequestRef.current !== requestId) return;
					if (data?.error) {
						setDrilldown((current) => ({
							...current,
							loading: false,
							error: data.error,
							rows: [],
						}));
						return;
					}
					const rows = Array.isArray(data?.reservations) ? data.reservations : [];
					setDrilldown((current) => ({
						...current,
						loading: false,
						error: "",
						rows:
							typeof clientFilter === "function"
								? rows.filter(clientFilter)
								: rows,
					}));
				})
				.catch(() => {
					if (drilldownRequestRef.current !== requestId) return;
					setDrilldown((current) => ({
						...current,
						loading: false,
						error: modalLabels.exportError,
						rows: [],
					}));
				});
		},
		[
			drilldownBaseParams,
			labels.underlyingReservations,
			modalLabels.exportError,
			token,
			userId,
		]
	);

	const openReservationDetails = useCallback((reservation = {}) => {
		setSelectedReservation(reservation);
	}, []);

	const handleReservationUpdated = useCallback((nextReservation = {}) => {
		if (!nextReservation) return;
		const nextId = normalizeId(nextReservation._id || nextReservation.id);
		setSelectedReservation(nextReservation);
		if (!nextId) return;
		setDrilldown((current) => ({
			...current,
			rows: current.rows.map((row) =>
				normalizeId(row._id || row.id) === nextId
					? { ...row, ...nextReservation }
					: row
			),
		}));
		setReservationRows((rows) =>
			rows.map((row) =>
				normalizeId(row._id || row.id) === nextId
					? { ...row, ...nextReservation }
					: row
			)
		);
	}, []);

	const openDateBucket = (row = {}) => {
		if (!row.groupKey) return;
		const range = riyadhDayUtcRange(row.groupKey);
		const dayParams = hotelScopedOperationsParams(reportParams, chartField, range);
		openDrilldown({
			title: `${chartMode === "checkin" ? labels.arrivals : labels.departures}: ${formatChartDateLabel(
				row.groupKey,
				{ full: true }
			)}`,
			extraParams: {
				...dayParams,
				bucketDateBy: chartField,
				bucketDateFrom: range.dateFrom,
				bucketDateTo: range.dateTo,
			},
			clientFilter: sameRiyadhDate(chartField, row.groupKey),
		});
	};

	const openRankingRow = (row, type, mode) => {
		openDrilldown({
			title: row.label,
			extraParams:
				type === "hotel"
					? { hotelId: row.hotelId }
					: { bookingSource: row.source },
			clientFilter: (reservation) => {
				const matchesTarget =
					type === "hotel"
						? normalizeId(reservation.hotelId) === row.hotelId
						: String(reservation.booking_source || "").trim().toLowerCase() ===
						  String(row.source || "").trim().toLowerCase();
				if (!matchesTarget) return false;
				return rankingRowsForPeriod([reservation], mode, rankPeriod).some(
					(item) => item === reservation
				);
			},
		});
	};

	const chartOptions = {
		...barOptions({
			categories: activeTimelineRows.map((row) => row.groupKey),
			labels,
			isRTL,
			colors: ["#18b879"],
			rows: activeTimelineRows,
			countLabel:
				chartMode === "checkin"
					? labels.checkInReservations
					: labels.checkOutReservations,
			showAmount: false,
			showAllXLabels: true,
			onPointClick: openDateBucket,
		}),
		plotOptions: {
			bar: {
				borderRadius: 8,
				columnWidth: "38%",
				dataLabels: { position: "center" },
			},
		},
		dataLabels: {
			enabled: true,
			formatter: (_value, options) =>
				formatMoney(
					activeTimelineRows?.[options?.dataPointIndex]?.reservationsCount || 0
				),
			style: {
				colors: ["#ffffff"],
				fontWeight: 950,
			},
		},
		yaxis: {
			labels: {
				formatter: (value) => formatMoney(Math.floor(toNumber(value))),
				style: { fontWeight: 800 },
			},
		},
		grid: {
			borderColor: "#edf0f5",
			strokeDashArray: 4,
		},
	};

	return (
		<MySummaryShell $isRTL={isRTL}>
			<LoadingBlock loading={loading} error={error} labels={modalLabels}>
				<section className='summary-top-layout'>
					<div className='overview-stack'>
						<div className='pending-summary-block'>
							<SectionHeading icon={<ClockCircleOutlined />}>
								{labels.allPendingTitle}
							</SectionHeading>
							<div className='compact-metrics'>
								<MySummaryMetric
									icon={<TableOutlined />}
									label={labels.allReservationCount}
									value={formatMoney(baseStats.count)}
									onClick={() =>
										openDrilldown({ title: labels.allReservationCount })
									}
								/>
								<MySummaryMetric
									icon={<DollarCircleOutlined />}
									label={labels.totalAmount}
									value={formatMoney(baseStats.totalAmount)}
									onClick={() => openDrilldown({ title: labels.totalAmount })}
								/>
								<MySummaryMetric
									icon={<FieldTimeOutlined />}
									label={labels.nights}
									value={formatMoney(baseStats.nights)}
									onClick={() => openDrilldown({ title: labels.nights })}
								/>
								<MySummaryMetric
									icon={<BankOutlined />}
									label={labels.hotels}
									value={formatMoney(baseStats.hotelCount)}
									onClick={() => openDrilldown({ title: labels.hotels })}
								/>
								<MySummaryMetric
									large
									icon={<ClockCircleOutlined />}
									label={labels.pendingRequests}
									value={formatMoney(pendingCount)}
									onClick={() =>
										openDrilldown({
											title: labels.pendingRequests,
											extraParams: { status: "pending" },
											clientFilter: (row) =>
												matchesReservationStatus(
													row,
													pendingSummaryStatusRegex
												),
										})
									}
								/>
							</div>
						</div>
					</div>

					<div className='new-reservations-block'>
						<SectionHeading icon={<PlusCircleOutlined />}>
							{labels.newToday}
						</SectionHeading>
						<div className='new-metrics-box'>
							<MySummaryMetric
								icon={<PlusCircleOutlined />}
								label={labels.newReservations}
								value={formatMoney(newTodayStats.count)}
								onClick={() =>
									openDrilldown({
										title: labels.newReservations,
										extraParams: createdTodayParams,
									})
								}
							/>
							<MySummaryMetric
								icon={<DollarCircleOutlined />}
								label={labels.totalAmount}
								value={formatMoney(newTodayStats.totalAmount)}
								onClick={() =>
									openDrilldown({
										title: labels.totalAmount,
										extraParams: createdTodayParams,
									})
								}
							/>
							<MySummaryMetric
								icon={<FieldTimeOutlined />}
								label={labels.nights}
								value={formatMoney(newTodayStats.nights)}
								onClick={() =>
									openDrilldown({
										title: labels.nights,
										extraParams: createdTodayParams,
									})
								}
							/>
							<MySummaryMetric
								icon={<BankOutlined />}
								label={labels.hotels}
								value={formatMoney(newTodayStats.hotelCount)}
								onClick={() =>
									openDrilldown({
										title: labels.hotels,
										extraParams: createdTodayParams,
									})
								}
							/>
							<MySummaryMetric
								icon={<ShareAltOutlined />}
								label={labels.sources}
								value={formatMoney(newTodayStats.sourceCount)}
								onClick={() =>
									openDrilldown({
										title: labels.sources,
										extraParams: createdTodayParams,
									})
								}
							/>
						</div>
					</div>

					<section className='operation-section'>
						<SectionHeading icon={<CarryOutOutlined />}>
							{labels.todayOperation}
						</SectionHeading>
						<div className='operation-cards'>
							<button
								type='button'
								className='operation-card arrival'
								onClick={() =>
									openDrilldown({
										title: labels.arrivals,
										extraParams: todayCheckinParams,
										clientFilter: sameRiyadhDate(
											"checkin_date",
											createdTodayKey
										),
									})
								}
							>
								<span className='operation-icon' aria-hidden='true'>
									<LoginOutlined />
								</span>
								<strong>{formatMoney(todayCheckinCount)}</strong>
								<span className='operation-label'>{labels.arrivals}</span>
							</button>
							<button
								type='button'
								className='operation-card departure'
								onClick={() =>
									openDrilldown({
										title: labels.departures,
										extraParams: todayCheckoutParams,
										clientFilter: sameRiyadhDate(
											"checkout_date",
											createdTodayKey
										),
									})
								}
							>
								<span className='operation-icon' aria-hidden='true'>
									<LogoutOutlined />
								</span>
								<strong>{formatMoney(todayCheckoutCount)}</strong>
								<span className='operation-label'>{labels.departures}</span>
							</button>
							<button
								type='button'
								className='operation-card checked'
								onClick={() =>
									openDrilldown({
										title: labels.checkedIn,
										extraParams: {
											...todayCheckinStatusParams,
											status: "InHouse",
										},
										clientFilter: (row) =>
											matchesReservationStatus(
												row,
												inHouseSummaryStatusRegex
											),
									})
								}
							>
								<span className='operation-icon' aria-hidden='true'>
									<CheckCircleOutlined />
								</span>
								<strong>{formatMoney(checkedInCount)}</strong>
								<span className='operation-label'>{labels.checkedIn}</span>
							</button>
							<button
								type='button'
								className='operation-card noshow'
								onClick={() =>
									openDrilldown({
										title: labels.noShow,
										extraParams: {
											...todayCheckinStatusParams,
											status: "no_show",
										},
										clientFilter: (row) =>
											matchesReservationStatus(
												row,
												noShowSummaryStatusRegex
											),
									})
								}
							>
								<span className='operation-icon' aria-hidden='true'>
									<WarningOutlined />
								</span>
								<strong>{formatMoney(noShowCount)}</strong>
								<span className='operation-label'>{labels.noShow}</span>
							</button>
						</div>
					</section>
				</section>

				<section className='future-section'>
					<SectionHeading icon={<BarChartOutlined />}>
						{labels.futureOperation}
					</SectionHeading>
					<div className='chart-mode-tabs'>
						<button
							type='button'
							className={chartMode === "checkin" ? "active" : ""}
							onClick={() => setChartMode("checkin")}
						>
							<IconText icon={<LoginOutlined />}>{labels.checkIn}</IconText>
						</button>
						<button
							type='button'
							className={chartMode === "checkout" ? "active" : ""}
							onClick={() => setChartMode("checkout")}
						>
							<IconText icon={<LogoutOutlined />}>{labels.checkOut}</IconText>
						</button>
					</div>
					<div className='future-grid'>
						<section className='chart-panel summary-chart-panel'>
							<header>
								{chartMode === "checkin"
									? labels.arrivalsByDay
									: labels.departuresByDay}
							</header>
							<Chart
								type='bar'
								height={220}
								options={chartOptions}
								series={[
									{
										name:
											chartMode === "checkin"
												? labels.arrivals
												: labels.departures,
										data: activeTimelineRows.map((row) =>
											timelineChartValue(row)
										),
									},
								]}
							/>
						</section>
					</div>
				</section>

				<section className='ranking-section'>
					<div className='ranking-controls-row'>
						<div className='ranking-mode-group' aria-label={labels.topSource}>
							<div className='ranking-tabs'>
								{rankingTabs.map((tab) => (
									<button
										key={tab.value}
										type='button'
										className={sourceRankMode === tab.value ? "active" : ""}
										onClick={() => setSourceRankMode(tab.value)}
									>
										<IconText icon={modeIcon(tab.value)}>{tab.label}</IconText>
									</button>
								))}
							</div>
						</div>
						<div className='ranking-period-controls'>
							<span>{labels.rankingPeriod}</span>
							<div className='period-tabs'>
								{periodTabs.map((tab) => (
									<button
										key={tab.value}
										type='button'
										className={rankPeriod === tab.value ? "active" : ""}
										onClick={() => setRankPeriod(tab.value)}
									>
										<IconText icon={periodIcon(tab.value)}>{tab.label}</IconText>
									</button>
								))}
							</div>
						</div>
						<div className='ranking-mode-group' aria-label={labels.topHotel}>
							<div className='ranking-tabs'>
								{rankingTabs.map((tab) => (
									<button
										key={tab.value}
										type='button'
										className={hotelRankMode === tab.value ? "active" : ""}
										onClick={() => setHotelRankMode(tab.value)}
									>
										<IconText icon={modeIcon(tab.value)}>{tab.label}</IconText>
									</button>
								))}
							</div>
						</div>
					</div>

					<section className='ranking-grid'>
						<MySummaryRankingPanel
							title={labels.topSource}
							type='source'
							rows={sourceRankingRows}
							labels={labels}
							onOpenRow={(row) =>
								openRankingRow(row, "source", sourceRankMode)
							}
						/>
						<MySummaryRankingPanel
							title={labels.topHotel}
							type='hotel'
							rows={hotelRankingRows}
							labels={labels}
							onOpenRow={(row) => openRankingRow(row, "hotel", hotelRankMode)}
						/>
					</section>
				</section>
			</LoadingBlock>
			<ReservationDrilldownModal
				open={drilldown.open}
				title={drilldown.title}
				rows={drilldown.rows}
				loading={drilldown.loading}
				error={drilldown.error}
				labels={modalLabels}
				isRTL={isRTL}
				chosenLanguage={chosenLanguage}
				onClose={closeDrilldown}
				onOpenReservation={openReservationDetails}
			/>
			<OverallReservationDetailsModal
				reservations={drilldown.rows}
				selectedReservation={selectedReservation}
				setSelectedReservation={setSelectedReservation}
				ownerId={params?.ownerId}
				onReservationUpdated={handleReservationUpdated}
				chosenLanguage={chosenLanguage}
			/>
		</MySummaryShell>
	);
};

export const ExecutiveReservationsReport = ({
	active,
	userId,
	token,
	params,
	chosenLanguage,
}) => {
	const labels = getLabels(chosenLanguage);
	const isRTL = chosenLanguage === "Arabic";
	const [reloadKey, setReloadKey] = useState(0);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [error, setError] = useState("");
	const [report, setReport] = useState(null);
	const [drilldown, setDrilldown] = useState({
		open: false,
		title: "",
		rows: [],
		loading: false,
		error: "",
	});
	const [selectedReservation, setSelectedReservation] = useState(null);
	const reservationsRequestRef = useRef(0);
	const drilldownRequestRef = useRef(0);
	const statusRequiresCancelledScope = statusNeedsCancelledScope(params?.status);
	const includeCancelledFromFilters =
		String(params?.includeCancelled || "").toLowerCase() === "true";
	const effectiveExcludeCancelled =
		!includeCancelledFromFilters && !statusRequiresCancelledScope;
	const drilldownBaseParams = useMemo(
		() => ({
			...(params || {}),
			includeCancelled: !effectiveExcludeCancelled,
			excludeCancelled: effectiveExcludeCancelled,
			page: 1,
			exportAll: "true",
			limit: 5000,
		}),
		[effectiveExcludeCancelled, params]
	);

	useEffect(() => {
		if (!active || !userId || !token) return;
		const requestId = reservationsRequestRef.current + 1;
		reservationsRequestRef.current = requestId;
		setLoading(true);
		setError("");
		getOverallExecutiveReservationsReport(userId, token, {
			...params,
			includeCancelled: !effectiveExcludeCancelled,
			excludeCancelled: effectiveExcludeCancelled,
		})
			.then((data) => {
				if (reservationsRequestRef.current !== requestId) return;
				if (data?.error) {
					setError(data.error);
					setReport(null);
					return;
				}
				setReport(data || null);
			})
			.catch(() => {
				if (reservationsRequestRef.current === requestId) {
					setError("Could not load reservations report.");
				}
			})
			.finally(() => {
				if (reservationsRequestRef.current === requestId) setLoading(false);
			});
	}, [active, effectiveExcludeCancelled, params, reloadKey, token, userId]);

	const creationRows = safeRows(report?.reservationsByDay);
	const checkinRows = safeRows(report?.checkinsByDay);
	const checkoutRows = safeRows(report?.checkoutsByDay);
	const statusRows = safeRows(report?.reservationsByBookingStatus);
	const topHotels = safeRows(report?.topHotels);
	const bookingSources = safeRows(report?.bookingSources);
	const stats = useMemo(() => report?.stats || {}, [report]);
	const closeDrilldown = useCallback(() => {
		setDrilldown((current) => ({ ...current, open: false }));
	}, []);
	const openDrilldown = useCallback(
		({ title, extraParams = {}, clientFilter = null } = {}) => {
			if (!userId || !token) return;
			const requestId = drilldownRequestRef.current + 1;
			drilldownRequestRef.current = requestId;
			setDrilldown({
				open: true,
				title: title || labels.underlyingReservations,
				rows: [],
				loading: true,
				error: "",
			});
			getOverallReservations(userId, token, {
				...drilldownBaseParams,
				...extraParams,
			})
				.then((data) => {
					if (drilldownRequestRef.current !== requestId) return;
					if (data?.error) {
						setDrilldown((current) => ({
							...current,
							loading: false,
							error: data.error,
							rows: [],
						}));
						return;
					}
					const rows = Array.isArray(data?.reservations)
						? data.reservations
						: [];
					setDrilldown((current) => ({
						...current,
						loading: false,
						error: "",
						rows:
							typeof clientFilter === "function"
								? rows.filter(clientFilter)
								: rows,
					}));
				})
				.catch(() => {
					if (drilldownRequestRef.current !== requestId) return;
					setDrilldown((current) => ({
						...current,
						loading: false,
						error: labels.exportError,
						rows: [],
					}));
				});
		},
		[drilldownBaseParams, labels.exportError, labels.underlyingReservations, token, userId]
	);
	const openReservationDetails = useCallback((reservation = {}) => {
		setSelectedReservation(reservation);
	}, []);
	const handleReservationUpdated = useCallback((nextReservation = {}) => {
		if (!nextReservation) return;
		const nextId = normalizeId(nextReservation._id || nextReservation.id);
		setSelectedReservation(nextReservation);
		if (!nextId) return;
		setDrilldown((current) => ({
			...current,
			rows: current.rows.map((row) =>
				normalizeId(row._id || row.id) === nextId
					? { ...row, ...nextReservation }
					: row
			),
		}));
	}, []);
	const keyboardOpen =
		(callback) =>
		(event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				callback();
			}
		};
	const scorecardProps = (title, extraParams = {}, clientFilter = null) => {
		const onOpen = () => openDrilldown({ title, extraParams, clientFilter });
		return {
			$clickable: true,
			role: "button",
			tabIndex: 0,
			title: labels.scorecardHint,
			onClick: onOpen,
			onKeyDown: keyboardOpen(onOpen),
		};
	};
	const dateDrilldownTitle = (label, groupKey) =>
		`${label}: ${formatChartDateLabel(groupKey, { full: true })}`;

	const commonColumns = [
		{ key: "name", label: labels.source },
		{
			key: "reservationsCount",
			label: labels.reservations,
			render: (row) => formatMoney(row.reservationsCount),
		},
		{
			key: "total_amount",
			label: labels.totalAmount,
			render: (row) => money(row.total_amount, labels),
		},
		{
			key: "paidAmount",
			label: labels.paidAmount,
			render: (row) => money(row.paidAmount, labels),
		},
		{
			key: "commission",
			label: labels.commission,
			render: (row) => money(row.commission, labels),
		},
	];

	const handleExportExcel = useCallback(async () => {
		const hasData =
			creationRows.length ||
			checkinRows.length ||
			checkoutRows.length ||
			statusRows.length ||
			topHotels.length ||
			bookingSources.length;
		if (!hasData || !report) {
			message.info(labels.exportNoData);
			return;
		}

		setExporting(true);
		try {
			const XLSX = await loadStyledXlsx();
			const workbook = XLSX.utils.book_new();
			const summaryRows = [
				{
					[labels.metric]: labels.date,
					[labels.value]: `${params?.dateFrom || "-"} - ${params?.dateTo || "-"}`,
				},
				{
					[labels.metric]: labels.cancelledExcluded,
					[labels.value]: effectiveExcludeCancelled
						? labels.excludeShort
						: labels.includeShort,
				},
				{
					[labels.metric]: labels.hotels,
					[labels.value]: toNumber(stats.totalHotels),
				},
				{
					[labels.metric]: labels.reservations,
					[labels.value]: toNumber(stats.reservationsCount),
				},
				{
					[labels.metric]: labels.totalAmount,
					[labels.value]: currencyNumber(stats.total_amount),
				},
				{
					[labels.metric]: labels.paidAmount,
					[labels.value]: currencyNumber(stats.paidAmount),
				},
				{
					[labels.metric]: labels.commission,
					[labels.value]: currencyNumber(stats.commission),
				},
			];
			const arrivalsDeparturesRows = [
				...buildTimelineExportRows(checkinRows, labels.checkins, labels),
				...buildTimelineExportRows(checkoutRows, labels.checkouts, labels),
			];
			const statusCreationRows = [
				...statusRows.map((row) => ({
					[labels.reportRow]: labels.statusSummary,
					[labels.status]: readableStatusLabel(
						row.reservation_status,
						chosenLanguage
					),
					[labels.date]: "",
					[labels.reservations]: toNumber(row.reservationsCount),
					[labels.totalAmount]: currencyNumber(row.total_amount),
					[labels.paidAmount]: currencyNumber(row.paidAmount),
					[labels.commission]: currencyNumber(row.commission),
					[labels.capturedPayments]: toNumber(row.capturedCount),
				})),
				...buildTimelineExportRows(creationRows, labels.creationDate, labels).map(
					(row) => ({
						...row,
						[labels.status]: "",
					})
				),
			];
			const hotelSourceRows = [
				...topHotels.map((row) => ({
					[labels.reportRow]: labels.topHotels,
					[labels.hotel]: titleCase(row.hotelName),
					[labels.source]: "",
					[labels.reservations]: toNumber(row.reservationsCount),
					[labels.totalAmount]: currencyNumber(row.total_amount),
					[labels.paidAmount]: currencyNumber(row.paidAmount),
					[labels.commission]: currencyNumber(row.commission),
					[labels.capturedPayments]: toNumber(row.capturedCount),
				})),
				...bookingSources.map((row) => ({
					[labels.reportRow]: labels.bookingSources,
					[labels.hotel]: "",
					[labels.source]: titleCase(row.source),
					[labels.reservations]: toNumber(row.reservationsCount),
					[labels.totalAmount]: currencyNumber(row.total_amount),
					[labels.paidAmount]: currencyNumber(row.paidAmount),
					[labels.commission]: currencyNumber(row.commission),
					[labels.capturedPayments]: toNumber(row.capturedCount),
				})),
			];

			appendJsonSheet(
				XLSX,
				workbook,
				summaryRows,
				labels.reportSummary,
				labels.noData
			);
			appendJsonSheet(
				XLSX,
				workbook,
				arrivalsDeparturesRows,
				labels.arrivalsDepartures,
				labels.noData
			);
			appendJsonSheet(
				XLSX,
				workbook,
				statusCreationRows,
				labels.statusCreation,
				labels.noData
			);
			appendJsonSheet(
				XLSX,
				workbook,
				hotelSourceRows,
				labels.hotelsSources,
				labels.noData
			);

			await trackOverallReservationSummaryExport(
				userId,
				token,
				{
					filters: {
						...(params || {}),
						includeCancelled: !effectiveExcludeCancelled,
						excludeCancelled: effectiveExcludeCancelled,
					},
					dataset: "overall_reservation_summary_charts",
					format: "XLSX",
					dateBy: params?.dateBy || report?.period?.dateBy || "createdAt",
					totalRows:
						summaryRows.length +
						arrivalsDeparturesRows.length +
						statusCreationRows.length +
						hotelSourceRows.length,
					summary: stats,
					reservations: topHotels.map((row) => ({
						hotelId: row.hotelId,
						hotelName: row.hotelName,
						reservationsCount: row.reservationsCount,
						total_amount: row.total_amount,
					})),
				},
				params
			);

			XLSX.writeFile(
				workbook,
				`${safeFileSegment("overall-reservations-summary")}-${dayjs().format(
					"YYYY-MM-DD-HHmm"
				)}.xlsx`,
				{ compression: true }
			);
			message.success(labels.exportSuccess);
		} catch (error) {
			message.error(labels.exportError);
		} finally {
			setExporting(false);
		}
	}, [
		bookingSources,
		checkinRows,
		checkoutRows,
		chosenLanguage,
		creationRows,
		effectiveExcludeCancelled,
		labels,
		params,
		report,
		stats,
		statusRows,
		token,
		topHotels,
		userId,
	]);

	const renderCreationChart = (height = 300, options = {}) => (
		<Chart
			type='bar'
			height={height}
			options={barOptions({
				categories: creationRows.map((row) => row.groupKey),
				labels,
				isRTL,
				colors: ["#24547d"],
				expanded: !!options.expanded,
				rows: creationRows,
				countLabel: labels.reservations,
				onPointClick: (row) =>
					openDrilldown({
						title: dateDrilldownTitle(labels.creationDate, row.groupKey),
						extraParams: {
							dateBy: "createdAt",
							...riyadhDayUtcRange(row.groupKey),
							sortBy: "createdAt",
							sortOrder: "desc",
						},
					}),
			})}
			series={[
				{
					name: labels.reservations,
					data: creationRows.map((row) => toNumber(row.reservationsCount)),
				},
			]}
		/>
	);

	const renderCheckinChart = (height = 300, options = {}) => (
		<Chart
			type='line'
			height={height}
			options={lineOptions({
				categories: checkinRows.map((row) => row.groupKey),
				labels,
				isRTL,
				colors: ["#0f766e"],
				expanded: !!options.expanded,
				rows: checkinRows,
				countLabel: labels.checkins,
				onPointClick: (row) =>
					openDrilldown({
						title: dateDrilldownTitle(labels.checkins, row.groupKey),
						extraParams: {
							dateBy: "checkin_date",
							...riyadhDayUtcRange(row.groupKey),
							sortBy: "checkin_date",
							sortOrder: "asc",
						},
					}),
			})}
			series={[
				{
					name: labels.checkins,
					data: checkinRows.map((row) => toNumber(row.reservationsCount)),
				},
			]}
		/>
	);

	const renderCheckoutChart = (height = 300, options = {}) => (
		<Chart
			type='line'
			height={height}
			options={lineOptions({
				categories: checkoutRows.map((row) => row.groupKey),
				labels,
				isRTL,
				colors: ["#d97706"],
				expanded: !!options.expanded,
				rows: checkoutRows,
				countLabel: labels.checkouts,
				onPointClick: (row) =>
					openDrilldown({
						title: dateDrilldownTitle(labels.checkouts, row.groupKey),
						extraParams: {
							dateBy: "checkout_date",
							...riyadhDayUtcRange(row.groupKey),
							sortBy: "checkout_date",
							sortOrder: "asc",
						},
					}),
			})}
			series={[
				{
					name: labels.checkouts,
					data: checkoutRows.map((row) => toNumber(row.reservationsCount)),
				},
			]}
		/>
	);

	const renderStatusChart = (height = 300) => (
		<Chart
			type='donut'
			height={height}
			options={donutOptions({
				labels: statusRows.map((row) =>
					readableStatusLabel(row.reservation_status, chosenLanguage)
				),
				colors: statusRows.map((row) => statusChartColor(row.reservation_status)),
				text: labels,
				isRTL,
				rows: statusRows,
				onPointClick: (row) =>
					openDrilldown({
						title: `${labels.status}: ${readableStatusLabel(
							row.reservation_status,
							chosenLanguage
						)}`,
						extraParams: {
							status: row.reservation_status,
							sortBy: "updatedAt",
							sortOrder: "desc",
						},
					}),
			})}
			series={statusRows.map((row) => toNumber(row.reservationsCount))}
		/>
	);

	return (
		<ExecutiveReportShell $isRTL={isRTL}>
			<div className='report-toolbar compact'>
				<div className='filter-switch-card'>
					<div className='filter-switch-copy'>
						<strong>
							{effectiveExcludeCancelled
								? labels.cancelledExcluded
								: labels.cancelledIncluded}
						</strong>
						<span>
							{statusRequiresCancelledScope
								? labels.cancelledScopeLocked
								: labels.cancelledScopeHint}
						</span>
					</div>
				</div>
				<div className='report-actions'>
					<Button
						type='primary'
						icon={<DownloadOutlined />}
						loading={exporting}
						disabled={loading || !report}
						onClick={handleExportExcel}
					>
						{exporting ? labels.exportingExcel : labels.exportExcel}
					</Button>
					<Button onClick={() => setReloadKey((value) => value + 1)}>
						{labels.refresh}
					</Button>
				</div>
			</div>

			<LoadingBlock loading={loading} error={error} labels={labels}>
				<OverallCards>
					<OverallCard
						{...scorecardProps(labels.reservations, {
							sortBy: "createdAt",
							sortOrder: "desc",
						})}
					>
						<strong>{formatMoney(stats.reservationsCount)}</strong>
						<span>{labels.reservations}</span>
					</OverallCard>
					<OverallCard
						{...scorecardProps(labels.totalAmount, {
							sortBy: "total_amount",
							sortOrder: "desc",
						})}
					>
						<strong>{money(stats.total_amount, labels)}</strong>
						<span>{labels.totalAmount}</span>
					</OverallCard>
					<OverallCard
						{...scorecardProps(labels.paidAmount, {
							sortBy: "total_amount",
							sortOrder: "desc",
						})}
					>
						<strong>{money(stats.paidAmount, labels)}</strong>
						<span>{labels.paidAmount}</span>
					</OverallCard>
					<OverallCard
						{...scorecardProps(
							labels.commission,
							{ sortBy: "total_amount", sortOrder: "desc" },
							(reservation) =>
								toNumber(
									reservation.commission ||
										reservation?.financial_cycle?.commissionAmount
								) > 0
						)}
					>
						<strong>{money(stats.commission, labels)}</strong>
						<span>{labels.commission}</span>
					</OverallCard>
				</OverallCards>

				<div className='report-grid chart-line-row'>
					<ExpandableChartPanel
						title={labels.checkins}
						labels={labels}
						renderChart={renderCheckinChart}
					/>
					<ExpandableChartPanel
						title={labels.checkouts}
						labels={labels}
						renderChart={renderCheckoutChart}
					/>
				</div>

				<div className='report-grid chart-secondary-row'>
					<ExpandableChartPanel
						title={labels.statusSummary}
						labels={labels}
						renderChart={renderStatusChart}
					/>
					<ExpandableChartPanel
						title={labels.creationDate}
						labels={labels}
						renderChart={renderCreationChart}
					/>
				</div>

				<div className='chart-click-hint'>{labels.chartHint}</div>

				<div className='report-grid two'>
					<section className='report-panel table-panel'>
						<header>{labels.topHotels}</header>
						<ReportTable
							className='compact-table'
							emptyText={labels.noData}
							rows={topHotels}
							columns={[
								{
									key: "hotelName",
									label: labels.hotel,
									render: (row) => titleCase(row.hotelName),
								},
								...commonColumns.slice(1),
							]}
						/>
					</section>
					<section className='report-panel table-panel'>
						<header>{labels.bookingSources}</header>
						<ReportTable
							className='compact-table'
							emptyText={labels.noData}
							rows={bookingSources}
							columns={[
								{
									key: "source",
									label: labels.source,
									render: (row) => titleCase(row.source),
								},
								...commonColumns.slice(1),
							]}
						/>
					</section>
				</div>
			</LoadingBlock>
			<ReservationDrilldownModal
				open={drilldown.open}
				title={drilldown.title}
				rows={drilldown.rows}
				loading={drilldown.loading}
				error={drilldown.error}
				labels={labels}
				isRTL={isRTL}
				chosenLanguage={chosenLanguage}
				onClose={closeDrilldown}
				onOpenReservation={openReservationDetails}
			/>
			<OverallReservationDetailsModal
				reservations={drilldown.rows}
				selectedReservation={selectedReservation}
				setSelectedReservation={setSelectedReservation}
				ownerId={params?.ownerId}
				onReservationUpdated={handleReservationUpdated}
				chosenLanguage={chosenLanguage}
			/>
		</ExecutiveReportShell>
	);
};

export const ExecutiveInventoryReport = ({
	active,
	userId,
	token,
	params,
	chosenLanguage,
	availableHotels = [],
}) => {
	const labels = getLabels(chosenLanguage);
	const isRTL = chosenLanguage === "Arabic";
	const inventoryLabels = isRTL
		? {
				inventorySelectHotel:
					"\u0627\u062e\u062a\u0631\u0020\u0641\u0646\u062f\u0642\u0627\u0020\u0648\u0627\u062d\u062f\u0627",
				inventoryRequired:
					"\u0627\u062e\u062a\u0631\u0020\u0641\u0646\u062f\u0642\u0627\u0020\u0648\u0627\u062d\u062f\u0627\u0020\u0648\u0627\u0644\u062a\u0642\u0648\u064a\u0645\u0020\u0648\u0627\u0644\u0634\u0647\u0631\u0020\u0648\u0627\u0644\u0633\u0646\u0629\u0020\u0644\u0639\u0631\u0636\u0020\u0627\u0644\u062a\u0642\u0631\u064a\u0631.",
				calendar: "\u0627\u0644\u062a\u0642\u0648\u064a\u0645",
				gregorian: "\u0645\u064a\u0644\u0627\u062f\u064a",
				hijri: "\u0647\u062c\u0631\u064a",
				month: "\u0627\u0644\u0634\u0647\u0631",
				year: "\u0627\u0644\u0633\u0646\u0629",
		  }
		: labels;
	const history = useHistory();
	const location = useLocation();
	const query = useMemo(
		() => new URLSearchParams(location.search || ""),
		[location.search],
	);
	const inventoryRequestParamsSignature = useMemo(() => {
		const passthrough = {};
		const blockedKeys = new Set([
			...Object.values(INVENTORY_QUERY_KEYS),
			"hotelId",
			"includeCancelled",
			"excludeCancelled",
			"paymentStatuses",
		]);
		new URLSearchParams(location.search || "").forEach((value, key) => {
			if (!blockedKeys.has(key)) passthrough[key] = value;
		});
		return JSON.stringify(passthrough);
	}, [location.search]);
	const inventoryRequestParams = useMemo(
		() => JSON.parse(inventoryRequestParamsSignature || "{}"),
		[inventoryRequestParamsSignature],
	);
	const defaultHijri = useMemo(() => currentHijriSelection(), []);
	const defaultRange = useMemo(
		() => inventoryMonthRange("hijri", defaultHijri.month, defaultHijri.year),
		[defaultHijri.month, defaultHijri.year],
	);
	const queryHotelIds = csvList(query.get(INVENTORY_QUERY_KEYS.hotelId));
	const paramHotelIds = csvList(params.hotelId);
	const initialSelectedHotelId =
		queryHotelIds.length === 1
			? queryHotelIds[0]
			: paramHotelIds.length === 1
			? paramHotelIds[0]
			: "";
	const [selectedHotelId, setSelectedHotelId] = useState(initialSelectedHotelId);
	const [inventoryFilter, setInventoryFilter] = useState(() => {
		const shouldHonorQueryPeriod = Boolean(initialSelectedHotelId);
		const calendarType = shouldHonorQueryPeriod
			? normalizeInventoryCalendarType(
					query.get(INVENTORY_QUERY_KEYS.calendarType),
			  ) || "hijri"
			: "hijri";
		const queryRange = inventoryDateRangeFromQuery(
			query,
			shouldHonorQueryPeriod,
		);
		const queryStart = queryRange.start;
		const queryEnd = queryRange.end;
		const selected = monthSelectionFromRange(calendarType, queryStart);
		const month =
			calendarType === "hijri"
				? shouldHonorQueryPeriod
					? normalizeInventoryHijriMonth(
							query.get(INVENTORY_QUERY_KEYS.hijriMonth),
							defaultHijri.month,
					  )
					: defaultHijri.month
				: selected.month;
		const year =
			calendarType === "hijri"
				? shouldHonorQueryPeriod
					? normalizeInventoryHijriYear(
							query.get(INVENTORY_QUERY_KEYS.hijriYear),
							defaultHijri.year,
					  )
					: defaultHijri.year
				: selected.year;
		const range =
			queryStart && queryEnd
				? { start: queryStart, end: queryEnd }
				: inventoryMonthRange(calendarType, month, year);
		return {
			calendarType,
			hijriMonth: calendarType === "hijri" ? month : undefined,
			hijriYear: calendarType === "hijri" ? year : undefined,
			start: range.start || defaultRange.start,
			end: range.end || defaultRange.end,
			includeCancelled: normalizeInventoryBool(
				query.get(INVENTORY_QUERY_KEYS.includeCancelled),
			),
			paymentStatuses: csvList(query.get(INVENTORY_QUERY_KEYS.paymentStatuses)),
		};
	});
	const syncInventoryQuery = useCallback(
		(next = {}) => {
			const nextQuery = new URLSearchParams(location.search || "");
			nextQuery.set("summaryTab", "inventory");
			nextQuery.delete("invMonths");
			const setOrDelete = (key, value) => {
				if (value === undefined || value === null || value === "") {
					nextQuery.delete(key);
					return;
				}
				nextQuery.set(key, String(value));
			};

			setOrDelete(INVENTORY_QUERY_KEYS.hotelId, next.hotelId);
			setOrDelete(INVENTORY_QUERY_KEYS.calendarType, next.calendarType);
			setOrDelete(INVENTORY_QUERY_KEYS.hijriMonth, next.hijriMonth);
			setOrDelete(INVENTORY_QUERY_KEYS.hijriYear, next.hijriYear);
			setOrDelete(INVENTORY_QUERY_KEYS.start, next.start);
			setOrDelete(INVENTORY_QUERY_KEYS.end, next.end);
			setOrDelete(
				INVENTORY_QUERY_KEYS.includeCancelled,
				next.includeCancelled ? "1" : "",
			);
			setOrDelete(
				INVENTORY_QUERY_KEYS.paymentStatuses,
				Array.isArray(next.paymentStatuses) && next.paymentStatuses.length
					? next.paymentStatuses.join(",")
					: "",
			);

			const search = nextQuery.toString();
			const current = new URLSearchParams(location.search || "").toString();
			if (search !== current) {
				history.replace({
					pathname: location.pathname,
					search: search ? `?${search}` : "",
				});
			}
		},
		[history, location.pathname, location.search],
	);

	useEffect(() => {
		const nextQueryHotelIds = csvList(query.get(INVENTORY_QUERY_KEYS.hotelId));
		const nextParamHotelIds = csvList(params.hotelId);
		const nextSelected =
			nextQueryHotelIds.length === 1
				? nextQueryHotelIds[0]
				: nextParamHotelIds.length === 1
				? nextParamHotelIds[0]
				: "";
		setSelectedHotelId((previous) =>
			previous === nextSelected ? previous : nextSelected,
		);
		setInventoryFilter((previous) => {
			const shouldHonorQueryPeriod = Boolean(nextSelected);
			const calendarType = shouldHonorQueryPeriod
				? normalizeInventoryCalendarType(
						query.get(INVENTORY_QUERY_KEYS.calendarType),
				  ) ||
				  previous.calendarType ||
				  "hijri"
				: "hijri";
			const queryRange = inventoryDateRangeFromQuery(
				query,
				shouldHonorQueryPeriod,
			);
			const queryStart = queryRange.start;
			const queryEnd = queryRange.end;
			const selected = monthSelectionFromRange(calendarType, queryStart);
			const month =
				calendarType === "hijri"
					? shouldHonorQueryPeriod
						? normalizeInventoryHijriMonth(
								query.get(INVENTORY_QUERY_KEYS.hijriMonth),
								previous.hijriMonth ?? defaultHijri.month,
						  )
						: defaultHijri.month
					: selected.month;
			const year =
				calendarType === "hijri"
					? shouldHonorQueryPeriod
						? normalizeInventoryHijriYear(
								query.get(INVENTORY_QUERY_KEYS.hijriYear),
								previous.hijriYear ?? defaultHijri.year,
						  )
						: defaultHijri.year
					: selected.year;
			const range =
				queryStart && queryEnd
					? { start: queryStart, end: queryEnd }
					: inventoryMonthRange(calendarType, month, year);
			const next = {
				...previous,
				calendarType,
				hijriMonth: calendarType === "hijri" ? month : undefined,
				hijriYear: calendarType === "hijri" ? year : undefined,
				start: range.start || previous.start || defaultRange.start,
				end: range.end || previous.end || defaultRange.end,
				includeCancelled: normalizeInventoryBool(
					query.get(INVENTORY_QUERY_KEYS.includeCancelled),
				),
				paymentStatuses: csvList(
					query.get(INVENTORY_QUERY_KEYS.paymentStatuses),
				),
			};
			return JSON.stringify(next) === JSON.stringify(previous)
				? previous
				: next;
		});
	}, [defaultHijri.month, defaultHijri.year, defaultRange.end, defaultRange.start, params.hotelId, query]);

	const hotelOptions = safeRows(availableHotels).length
		? safeRows(availableHotels)
		: [];
	const selectedHotelAllowed = hotelOptions.some(
		(hotel) => hotel._id === selectedHotelId,
	);
	const hasInventorySelection =
		Boolean(selectedHotelId) &&
		Boolean(inventoryFilter.start) &&
		Boolean(inventoryFilter.end) &&
		(!hotelOptions.length || selectedHotelAllowed);

	const handleInventoryHotelChange = useCallback(
		(value) => {
			const nextHotelId = value || "";
			const nextFilter = nextHotelId
				? inventoryFilter
				: {
						...inventoryFilter,
						calendarType: "hijri",
						hijriMonth: defaultHijri.month,
						hijriYear: defaultHijri.year,
						...inventoryMonthRange(
							"hijri",
							defaultHijri.month,
							defaultHijri.year,
						),
				  };
			setSelectedHotelId(nextHotelId);
			setInventoryFilter((previous) =>
				JSON.stringify(previous) === JSON.stringify(nextFilter)
					? previous
					: nextFilter,
			);
			syncInventoryQuery({
				...nextFilter,
				hotelId: nextHotelId,
			});
		},
		[defaultHijri.month, defaultHijri.year, inventoryFilter, syncInventoryQuery],
	);

	const handleInventoryFilterChange = useCallback(
		(next) => {
			if (!next) return;
			const calendarType =
				normalizeInventoryCalendarType(next.calendarType) || "hijri";
			const hijriMonth = normalizeInventoryHijriMonth(
				next.hijriMonth,
				inventoryFilter.hijriMonth ?? defaultHijri.month,
			);
			const hijriYear = normalizeInventoryHijriYear(
				next.hijriYear,
				inventoryFilter.hijriYear ?? defaultHijri.year,
			);
			const monthRange =
				calendarType === "hijri"
					? inventoryMonthRange(calendarType, hijriMonth, hijriYear)
					: null;
			const normalized = {
				calendarType,
				hijriMonth: calendarType === "hijri" ? hijriMonth : undefined,
				hijriYear: calendarType === "hijri" ? hijriYear : undefined,
				start:
					normalizeInventoryDate(next.start) ||
					monthRange?.start ||
					inventoryFilter.start,
				end:
					normalizeInventoryDate(next.end) ||
					monthRange?.end ||
					inventoryFilter.end,
				includeCancelled: !!next.includeCancelled,
				paymentStatuses: Array.isArray(next.paymentStatuses)
					? next.paymentStatuses
					: [],
			};
			const nextHotelId = next.hotelId || selectedHotelId;
			setInventoryFilter((previous) =>
				JSON.stringify(previous) === JSON.stringify(normalized)
					? previous
					: normalized,
			);
			if (nextHotelId !== selectedHotelId) setSelectedHotelId(nextHotelId);
			syncInventoryQuery({
				...normalized,
				hotelId: nextHotelId,
			});
		},
		[
			inventoryFilter.end,
			inventoryFilter.hijriMonth,
			inventoryFilter.hijriYear,
			inventoryFilter.start,
			defaultHijri.month,
			defaultHijri.year,
			selectedHotelId,
			syncInventoryQuery,
		],
	);

	const fetchScopedCalendar = useCallback(
		(hotelId, options = {}) =>
			getOverallExecutiveInventoryReport(userId, token, {
				...inventoryRequestParams,
				hotelId,
				invHotel: hotelId,
				invCal: inventoryFilter.calendarType,
				invHMonth: inventoryFilter.hijriMonth,
				invHYear: inventoryFilter.hijriYear,
				invStart: options.start,
				invEnd: options.end,
				includeCancelled: !!options.includeCancelled,
				excludeCancelled: !options.includeCancelled,
				paymentStatuses: options.paymentStatuses,
			}).then((data) => {
				if (data?.error) return data;
				if (data?.calendar) return data.calendar;
				return {
					error: data?.calendarError || "Could not load inventory calendar.",
				};
			}),
		[
			inventoryFilter.calendarType,
			inventoryFilter.hijriMonth,
			inventoryFilter.hijriYear,
			inventoryRequestParams,
			token,
			userId,
		],
	);

	const fetchScopedDayReservations = useCallback(
		(hotelId, options = {}) =>
			getOverallExecutiveInventoryDayReport(userId, token, {
				...inventoryRequestParams,
				hotelId,
				invHotel: hotelId,
				date: options.date,
				roomKey: options.roomKey,
				includeCancelled: !!options.includeCancelled,
				paymentStatuses: options.paymentStatuses,
			}),
		[inventoryRequestParams, token, userId],
	);

	if (!active) return null;

	return (
		<ExecutiveReportShell $isRTL={isRTL}>
			{!hasInventorySelection ? (
				<InventorySelectGate $isRTL={isRTL}>
					<label>
						<span>{inventoryLabels.inventorySelectHotel}</span>
						<Select
							value={selectedHotelAllowed ? selectedHotelId : undefined}
							onChange={handleInventoryHotelChange}
							options={hotelOptions.map((hotel) => ({
								value: hotel._id,
								label: titleCase(hotel.hotelName),
							}))}
							showSearch
							optionFilterProp='label'
							placeholder={inventoryLabels.inventorySelectHotel}
							allowClear
						/>
					</label>
					<InventoryRequiredPanel>
						{inventoryLabels.inventoryRequired}
					</InventoryRequiredPanel>
				</InventorySelectGate>
			) : (
				<HotelInventory
					key={selectedHotelId || "inventory"}
					chosenLanguage={chosenLanguage}
					hotelId={selectedHotelId}
					hotelOptions={hotelOptions}
					onHotelChange={handleInventoryHotelChange}
					fetchCalendarApi={fetchScopedCalendar}
					fetchDayReservationsApi={fetchScopedDayReservations}
					initialCalendarType={inventoryFilter.calendarType}
					initialHijriMonth={inventoryFilter.hijriMonth}
					initialHijriYear={inventoryFilter.hijriYear}
					initialRange={{
						start: inventoryFilter.start,
						end: inventoryFilter.end,
					}}
					initialIncludeCancelled={inventoryFilter.includeCancelled}
					initialPaymentStatuses={inventoryFilter.paymentStatuses}
					onFilterChange={handleInventoryFilterChange}
				/>
			)}
		</ExecutiveReportShell>
	);
};

export const ExecutivePaidReport = ({
	active,
	userId,
	token,
	params,
	chosenLanguage,
}) => {
	const labels = getLabels(chosenLanguage);
	const isRTL = chosenLanguage === "Arabic";
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [report, setReport] = useState(null);
	const paidRequestRef = useRef(0);

	useEffect(() => {
		setPage((value) => (value === 1 ? value : 1));
	}, [params]);

	useEffect(() => {
		if (!active || !userId || !token) return;
		const requestId = paidRequestRef.current + 1;
		paidRequestRef.current = requestId;
		setLoading(true);
		setError("");
		getOverallExecutivePaidReport(userId, token, {
			...params,
			searchQuery: params.search || "",
			page,
			limit: 50,
		})
			.then((data) => {
				if (paidRequestRef.current !== requestId) return;
				if (data?.error) {
					setError(data.error);
					setReport(null);
					return;
				}
				setReport(data || null);
			})
			.catch(() => {
				if (paidRequestRef.current === requestId) {
					setError("Could not load paid report.");
				}
			})
			.finally(() => {
				if (paidRequestRef.current === requestId) setLoading(false);
			});
	}, [active, page, params, token, userId]);

	const scorecards = report?.scorecards || {};
	const reservationRows = safeRows(report?.data);
	const byHotel = safeRows(report?.byHotel);
	const byBookingSource = safeRows(report?.byBookingSource);
	const pages = Math.max(Number(report?.pages || 1), 1);

	const hotelBreakdownTable = (
		<section className='report-panel table-panel hotel-breakdown-panel'>
			<header>{labels.hotels}</header>
			<ReportTable
				className='compact-table'
				emptyText={labels.noData}
				rows={byHotel}
				columns={[
					{
						key: "hotelName",
						label: labels.hotel,
						render: (row) => titleCase(row.hotelName),
					},
					{
						key: "reservationsCount",
						label: labels.reservations,
						render: (row) => formatMoney(row.reservationsCount),
					},
					{
						key: "total_amount",
						label: labels.totalAmount,
						render: (row) => money(row.total_amount, labels),
					},
					{
						key: "paidAmount",
						label: labels.paidAmount,
						render: (row) => money(row.paidAmount, labels),
					},
					{
						key: "commission",
						label: labels.commission,
						render: (row) => money(row.commission, labels),
					},
				]}
			/>
		</section>
	);

	return (
		<ExecutiveReportShell $isRTL={isRTL}>
			<LoadingBlock loading={loading} error={error} labels={labels}>
				<OverallCards>
					<OverallCard>
						<strong>{formatMoney(scorecards.reservationsCount)}</strong>
						<span>{labels.reservations}</span>
					</OverallCard>
					<OverallCard>
						<strong>{money(scorecards.totalAmount, labels)}</strong>
						<span>{labels.totalAmount}</span>
					</OverallCard>
					<OverallCard>
						<strong>{money(scorecards.paidAmount, labels)}</strong>
						<span>{labels.paidAmount}</span>
					</OverallCard>
					<OverallCard>
						<strong>{money(scorecards.remainingAmount, labels)}</strong>
						<span>{labels.remaining}</span>
					</OverallCard>
					<OverallCard>
						<strong>{money(scorecards.commission, labels)}</strong>
						<span>{labels.commission}</span>
					</OverallCard>
				</OverallCards>

				{hotelBreakdownTable}

				<div className='report-grid two'>
					<section className='report-panel table-panel'>
						<header>{labels.paymentMethods}</header>
						<ReportTable
							className='compact-table'
							emptyText={labels.noData}
							rows={Object.entries(scorecards.breakdownTotals || {}).map(
								([key, value]) => ({
									_id: key,
									method: paidBreakdownLabels[key] || key,
									value,
								})
							)}
							columns={[
								{ key: "method", label: labels.source },
								{
									key: "value",
									label: labels.paidAmount,
									render: (row) => money(row.value, labels),
								},
							]}
						/>
					</section>
					<section className='report-panel table-panel'>
						<header>{labels.bookingSources}</header>
						<ReportTable
							className='compact-table'
							emptyText={labels.noData}
							rows={byBookingSource}
							columns={[
								{
									key: "source",
									label: labels.source,
									render: (row) => titleCase(row.source),
								},
								{
									key: "reservationsCount",
									label: labels.reservations,
									render: (row) => formatMoney(row.reservationsCount),
								},
								{
									key: "paidAmount",
									label: labels.paidAmount,
									render: (row) => money(row.paidAmount, labels),
								},
								{
									key: "commission",
									label: labels.commission,
									render: (row) => money(row.commission, labels),
								},
							]}
						/>
					</section>
				</div>

				<section className='report-panel table-panel'>
					<header>{labels.breakdown}</header>
					<ReportTable
						emptyText={labels.noData}
						rows={reservationRows}
						columns={[
							{
								key: "confirmation_number",
								label: labels.confirmation,
								render: (row) => row.confirmation_number || "-",
							},
							{
								key: "guest",
								label: labels.guest,
								render: (row) => row.customer_details?.name || "-",
							},
							{
								key: "hotel",
								label: labels.hotel,
								render: (row) => titleCase(row.hotelId?.hotelName || "-"),
							},
							{
								key: "checkin_date",
								label: labels.checkIn,
								render: (row) => formatDate(row.checkin_date, chosenLanguage),
							},
							{
								key: "checkout_date",
								label: labels.checkOut,
								render: (row) => formatDate(row.checkout_date, chosenLanguage),
							},
							{
								key: "total_amount",
								label: labels.totalAmount,
								render: (row) => money(row.total_amount, labels),
							},
							{
								key: "paid_breakdown_total",
								label: labels.paidAmount,
								render: (row) => money(row.paid_breakdown_total, labels),
							},
							{
								key: "paid_breakdown_remaining",
								label: labels.remaining,
								render: (row) => money(row.paid_breakdown_remaining, labels),
							},
						]}
					/>
					<div className='report-pagination'>
						<Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
							{labels.prev}
						</Button>
						<span>
							{labels.page} {page} {labels.of} {pages}
						</span>
						<Button
							disabled={page >= pages}
							onClick={() => setPage((value) => value + 1)}
						>
							{labels.next}
						</Button>
					</div>
				</section>
			</LoadingBlock>
		</ExecutiveReportShell>
	);
};

const MySummaryShell = styled.div`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	display: grid;
	gap: 7px;
	min-width: 0;
	padding: 6px 10px 8px;
	background: #ffffff;
	color: #111827;
	font-family: "Droid Arabic Kufi", "Tajawal", "Cairo", "Segoe UI", sans-serif;

	button {
		font-family: inherit;
	}

	.summary-top-layout {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-template-areas:
			"overall spacer"
			"new operation";
		gap: 8px;
		align-items: start;
		min-width: 0;
		direction: ltr;
	}

	.overview-stack {
		grid-area: overall;
		display: grid;
		gap: 0;
		min-width: 0;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	}

	.pending-summary-block,
	.new-reservations-block,
	.operation-section,
	.future-section,
	.ranking-section,
	.ranking-panel {
		display: grid;
		gap: 6px;
		min-width: 0;
		padding: 7px;
		border: 1px solid #e8edf5;
		border-radius: 10px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 251, 255, 0.98)),
			linear-gradient(135deg, rgba(36, 84, 125, 0.04), rgba(111, 31, 120, 0.04));
		box-shadow: 0 8px 18px rgba(17, 24, 39, 0.035);
	}

	.compact-metrics {
		display: flex;
		flex-wrap: nowrap;
		gap: 6px;
		align-items: stretch;
		justify-content: ${(props) => (props.$isRTL ? "flex-start" : "flex-start")};
		width: fit-content;
		max-width: 100%;
		padding: 7px;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		background: #fafbfe;
		overflow-x: auto;
		scrollbar-width: thin;
	}

	.new-reservations-block {
		grid-area: new;
		align-self: start;
		margin-top: 0;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	}

	.operation-section {
		grid-area: operation;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	}

	.overview-stack h3,
	.new-reservations-block h3,
	.operation-section h3,
	.future-section > h3,
	.ranking-panel h3 {
		position: relative;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 7px;
		justify-content: center;
		width: 100%;
		max-width: 100%;
		min-height: 28px;
		padding: 6px 36px;
		border: 1px solid #e3e9f2;
		border-inline-start: 4px solid #6f1f78;
		border-radius: 8px;
		background:
			linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%),
			linear-gradient(90deg, rgba(111, 31, 120, 0.08), rgba(36, 84, 125, 0.04));
		color: #111827;
		font-size: clamp(0.72rem, 0.88vw, 0.84rem);
		font-weight: 950;
		line-height: 1.15;
		text-align: center;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
	}

	.section-title-icon {
		position: absolute;
		inset-inline-start: 9px;
		top: 50%;
		transform: translateY(-50%);
		display: inline-grid;
		place-items: center;
		flex: 0 0 22px;
		width: 22px;
		height: 22px;
		border-radius: 7px;
		background:
			linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(224, 228, 236, 0.76)),
			#eef2f8;
		color: #6f1f78;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.9),
			0 5px 12px rgba(111, 31, 120, 0.12);
		font-size: 0.78rem;
	}

	.overview-stack h3 > span:last-child,
	.new-reservations-block h3 > span:last-child,
	.operation-section h3 > span:last-child,
	.future-section > h3 > span:last-child,
	.ranking-panel h3 > span:last-child {
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
	}

	.new-metrics-box {
		display: flex;
		flex-wrap: nowrap;
		gap: 6px;
		align-items: stretch;
		width: fit-content;
		max-width: 100%;
		padding: 7px;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		background: #fafbfe;
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: thin;
	}

	.metric-chip {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-content: center;
		align-items: center;
		justify-items: start;
		gap: 2px 7px;
		width: auto;
		min-width: 112px;
		min-height: 50px;
		padding: 6px 12px;
		border: 0;
		border-radius: 8px;
		background:
			linear-gradient(145deg, rgba(255, 255, 255, 0.75), rgba(208, 211, 216, 0.72)),
			#d9d9d9;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.78),
			inset 0 -1px 0 rgba(95, 100, 110, 0.18),
			0 8px 18px rgba(17, 24, 39, 0.08);
		color: #050505;
		cursor: pointer;
		transition: transform 0.16s ease, box-shadow 0.16s ease;
	}

	.metric-icon {
		grid-row: 1 / span 2;
		display: inline-grid;
		place-items: center;
		width: 25px;
		height: 25px;
		border-radius: 8px;
		background:
			linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(223, 227, 234, 0.75)),
			#eef1f6;
		color: #64166e;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.9),
			0 5px 12px rgba(17, 24, 39, 0.09);
		font-size: 0.88rem;
	}

	.metric-chip.large {
		min-width: 154px;
		min-height: 50px;
	}

	.metric-chip:hover,
	.metric-chip:focus-visible {
		outline: none;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.9),
			0 12px 24px rgba(17, 24, 39, 0.14);
		transform: translateY(-2px);
	}

	.metric-chip .metric-label {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		min-height: 16px;
		font-size: 0.54rem;
		font-weight: 950;
		line-height: 1.15;
		white-space: nowrap;
		text-align: inherit;
	}

	.metric-chip strong {
		justify-self: start;
		width: max-content;
		color: #000000;
		font-size: clamp(0.98rem, 1.08vw, 1.22rem);
		font-weight: 950;
		line-height: 1;
		white-space: nowrap;
		direction: ltr;
		unicode-bidi: isolate;
	}

	.operation-cards {
		display: flex;
		flex-wrap: nowrap;
		gap: 8px;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: thin;
	}

	.operation-card {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		justify-items: start;
		align-content: center;
		gap: 2px 8px;
		flex: 1 0 118px;
		width: auto;
		min-width: 118px;
		min-height: 52px;
		padding: 7px 12px;
		border: 0;
		border-radius: 6px;
		color: #050505;
		cursor: pointer;
		text-align: center;
		transition: transform 0.16s ease, box-shadow 0.16s ease;
	}

	.operation-icon {
		grid-row: 1 / span 2;
		display: inline-grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.58);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.82),
			0 6px 14px rgba(17, 24, 39, 0.09);
		font-size: 0.96rem;
	}

	.operation-card:hover,
	.operation-card:focus-visible {
		outline: none;
		box-shadow: 0 12px 22px rgba(17, 24, 39, 0.12);
		transform: translateY(-2px);
	}

	.operation-card.arrival {
		background: linear-gradient(135deg, #e8f5ff 0%, #d4ecfb 100%);
	}

	.operation-card.departure {
		background: linear-gradient(135deg, #faedfd 0%, #efd9f3 100%);
	}

	.operation-card.checked {
		background: linear-gradient(135deg, #fff7e7 0%, #ffedc8 100%);
	}

	.operation-card.noshow {
		background: linear-gradient(135deg, #ff7a82 0%, #ff646f 100%);
	}

	.operation-card strong {
		justify-self: start;
		font-size: clamp(1.04rem, 1.28vw, 1.34rem);
		font-weight: 950;
		line-height: 1;
		white-space: nowrap;
		direction: ltr;
		unicode-bidi: isolate;
	}

	.operation-card .operation-label {
		justify-self: start;
		font-size: clamp(0.6rem, 0.74vw, 0.74rem);
		font-weight: 950;
		line-height: 1.12;
		white-space: nowrap;
	}

	.operation-card .operation-icon {
		justify-self: start;
	}

	.future-section {
		gap: 6px;
	}

	.chart-mode-tabs,
	.period-tabs,
	.ranking-tabs {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.chart-mode-tabs button,
	.period-tabs button,
	.ranking-tabs button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		min-width: 66px;
		min-height: 30px;
		padding: 5px 10px;
		border: 0;
		border-radius: 6px;
		background: #e6f3fe;
		color: #050505;
		font-size: 0.7rem;
		font-weight: 950;
		cursor: pointer;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.82),
			0 5px 12px rgba(17, 24, 39, 0.05);
		transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
	}

	.button-icon {
		display: inline-grid;
		place-items: center;
		font-size: 0.78rem;
		line-height: 1;
	}

	.chart-mode-tabs button:not(.active):nth-child(even),
	.period-tabs button:not(.active):nth-child(even),
	.ranking-tabs button:not(.active):nth-child(even) {
		background: #f6e8f8;
	}

	.chart-mode-tabs button.active,
	.period-tabs button.active,
	.ranking-tabs button.active {
		background:
			linear-gradient(145deg, rgba(255, 255, 255, 0.55), rgba(207, 211, 218, 0.66)),
			#dfe2e7;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.75),
			0 7px 14px rgba(100, 22, 110, 0.12);
	}

	.chart-mode-tabs button:hover,
	.period-tabs button:hover,
	.ranking-tabs button:hover,
	.chart-mode-tabs button:focus-visible,
	.period-tabs button:focus-visible,
	.ranking-tabs button:focus-visible {
		outline: none;
		transform: translateY(-1px);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.9),
			0 8px 16px rgba(17, 24, 39, 0.1);
	}

	.future-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0;
		align-items: center;
		min-width: 0;
	}

	.summary-chart-panel {
		min-width: 0;
		padding: 4px 8px 0;
		background: #ffffff;
		border: 1px solid #eef1f5;
		border-radius: 10px;
		box-shadow: 0 8px 20px rgba(17, 24, 39, 0.04);
	}

	.summary-chart-panel header {
		margin-bottom: 2px;
		color: #1f2937;
		font-size: 0.72rem;
		font-weight: 900;
		text-align: center;
	}

	.executive-chart-tooltip {
		display: grid;
		gap: 7px;
		min-width: 190px;
		padding: 10px 12px;
		border: 1px solid #d4e4f7;
		border-radius: 10px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.98)),
			linear-gradient(135deg, rgba(36, 84, 125, 0.08), rgba(111, 31, 120, 0.05));
		box-shadow: 0 14px 30px rgba(15, 40, 66, 0.18);
		color: #102033;
		font-family: inherit;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.executive-chart-tooltip .tooltip-date {
		display: grid;
		gap: 2px;
		padding-bottom: 7px;
		border-bottom: 1px solid #e4edf8;
	}

	.executive-chart-tooltip .tooltip-date span {
		color: #64748b;
		font-size: 0.64rem;
		font-weight: 900;
		line-height: 1.2;
	}

	.executive-chart-tooltip .tooltip-date strong {
		color: #102033;
		font-size: 0.86rem;
		font-weight: 950;
		line-height: 1.25;
		white-space: nowrap;
	}

	.executive-chart-tooltip .tooltip-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 7px;
		min-height: 32px;
		padding: 6px 8px;
		border-radius: 8px;
		background: #f4f8ff;
		color: #1e293b;
		font-size: 0.75rem;
		font-weight: 850;
	}

	.executive-chart-tooltip .tooltip-row strong {
		color: #102033;
		font-size: 0.9rem;
		font-weight: 950;
		line-height: 1;
		white-space: nowrap;
	}

	.executive-chart-tooltip .tooltip-dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
	}

	.occupancy-panel {
		display: grid;
		justify-items: center;
		gap: 0;
		min-width: 0;
		padding: 8px 10px;
		background: #f6f7fb;
	}

	.occupancy-panel h4 {
		margin: 0;
		color: #111827;
		font-size: 0.72rem;
		font-weight: 950;
	}

	.occupancy-panel ul {
		display: grid;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
		color: #4b5563;
		font-size: 0.6rem;
		font-weight: 900;
	}

	.occupancy-panel li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		justify-content: center;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
	}

	.dot.booked {
		background: #1687d9;
	}

	.dot.available {
		background: #08a75a;
	}

	.dot.blocked {
		background: #646b73;
	}

	.period-tabs {
		justify-content: center;
		margin-top: 0;
	}

	.ranking-section {
		gap: 8px;
	}

	.ranking-controls-row {
		display: grid;
		grid-template-columns: minmax(210px, 1fr) minmax(340px, auto) minmax(210px, 1fr);
		align-items: center;
		gap: 8px;
		min-width: 0;
		padding: 6px 8px;
		border: 1px solid #e3e9f2;
		border-radius: 8px;
		background: #ffffff;
	}

	.ranking-mode-group,
	.ranking-period-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
	}

	.ranking-period-controls {
		gap: 6px;
	}

	.ranking-period-controls > span {
		color: #25364d;
		font-size: 0.7rem;
		font-weight: 950;
		white-space: nowrap;
	}

	.ranking-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(320px, 1fr));
		gap: 8px;
		align-items: start;
		min-width: 0;
	}

	.ranking-panel {
		gap: 6px;
		padding: 7px;
		background: #ffffff;
	}

	.ranking-list {
		display: grid;
		align-content: start;
		gap: 8px;
		padding: 10px 12px;
		background: #f5f7fb;
		min-height: 124px;
	}

	.ranking-row {
		display: grid;
		grid-template-columns: minmax(82px, 0.25fr) minmax(140px, 1fr);
		gap: 6px 10px;
		align-items: center;
		min-height: 36px;
		min-width: 0;
		border: 0;
		background: transparent;
		color: #111827;
		cursor: pointer;
		text-align: inherit;
	}

	.ranking-row:hover .ranking-name,
	.ranking-row:focus-visible .ranking-name {
		color: #24547d;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.ranking-value {
		color: #1f2937;
		font-size: 0.66rem;
		font-weight: 800;
		white-space: nowrap;
	}

	.ranking-name {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		color: #111827;
		font-size: 0.72rem;
		font-weight: 950;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ranking-row-icon {
		display: inline-grid;
		place-items: center;
		flex: 0 0 19px;
		width: 19px;
		height: 19px;
		border-radius: 6px;
		background: #ffffff;
		color: #64166e;
		box-shadow: inset 0 0 0 1px rgba(100, 22, 110, 0.1);
		font-size: 0.68rem;
	}

	.ranking-name-text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ranking-track {
		grid-column: 2;
		display: block;
		height: 11px;
		background: #dbeafe;
		border-radius: 999px;
		overflow: hidden;
	}

	.ranking-track span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: #3f8df5;
	}

	.ranking-empty {
		display: grid;
		place-items: center;
		min-height: 72px;
		color: #6b7280;
		font-size: 0.68rem;
		font-weight: 850;
		text-align: center;
	}

	.report-loading {
		display: grid;
		place-items: center;
		gap: 10px;
		min-height: 320px;
		color: #6b7280;
		font-weight: 900;
	}

	@media (max-width: 1180px) {
		.summary-top-layout,
		.future-grid,
		.ranking-grid {
			grid-template-columns: 1fr;
		}

		.summary-top-layout {
			grid-template-areas:
				"overall"
				"new"
				"operation";
		}

		.new-reservations-block {
			margin-top: 0;
		}
	}

	@media (max-width: 900px) {
		.ranking-controls-row {
			grid-template-columns: 1fr;
			justify-items: stretch;
		}

		.ranking-mode-group,
		.ranking-period-controls {
			justify-content: center;
		}

		.ranking-period-controls {
			flex-wrap: wrap;
		}
	}

	@media (max-width: 760px) {
		padding: 8px;

		.new-metrics-box {
			padding: 8px;
			border-radius: 10px;
		}

		.ranking-row {
			grid-template-columns: 1fr;
		}

		.ranking-track {
			grid-column: 1;
		}

	}

	@media (max-width: 460px) {
		.metric-chip,
		.operation-card {
			min-height: 48px;
		}

		.period-tabs,
		.chart-mode-tabs,
		.ranking-tabs {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.period-tabs button,
		.chart-mode-tabs button,
		.ranking-tabs button {
			min-width: 0;
		}
	}
`;

const DrilldownTitle = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	min-width: 0;

	strong {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		color: #172033;
		font-size: 1rem;
		font-weight: 950;
		overflow-wrap: anywhere;
	}

	strong > .anticon {
		flex: 0 0 auto;
		color: #64166e;
		font-size: 1rem;
	}

	strong > span {
		min-width: 0;
		color: inherit;
		font-size: inherit;
		font-weight: inherit;
	}

	.drilldown-title-count {
		flex: 0 0 auto;
		color: #667085;
		font-size: 0.78rem;
		font-weight: 850;
	}

	@media (max-width: 640px) {
		align-items: flex-start;
		flex-direction: column;
		gap: 4px;
	}
`;

const DrilldownModalBody = styled.div`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	display: grid;
	gap: 8px;

	.drilldown-loading {
		min-height: 220px;
		display: grid;
		place-items: center;
		gap: 10px;
		color: #667085;
		font-weight: 850;
	}

	.drilldown-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px 10px;
		border: 1px solid rgba(45, 93, 145, 0.16);
		border-radius: 8px;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.98)),
			linear-gradient(135deg, rgba(36, 84, 125, 0.08), rgba(111, 31, 120, 0.06));
		box-shadow: 0 6px 16px rgba(16, 32, 51, 0.05);
	}

	.drilldown-count {
		display: inline-flex;
		align-items: baseline;
		gap: 7px;
		min-width: 0;
		color: #172033;
	}

	.drilldown-count strong {
		color: #64166e;
		font-size: 1rem;
		font-weight: 950;
		line-height: 1;
	}

	.drilldown-count span {
		min-width: 0;
		color: #53627a;
		font-size: 0.76rem;
		font-weight: 900;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.drilldown-export-btn.ant-btn {
		min-height: 32px;
		height: 32px;
		padding: 0 12px;
		border: 0;
		border-radius: 7px;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
			linear-gradient(135deg, #24102d 0%, #64166e 58%, #8d4c9d 100%);
		color: #ffffff;
		font-size: 0.78rem;
		font-weight: 950;
		box-shadow: 0 8px 18px rgba(80, 23, 96, 0.2);
	}

	.drilldown-export-btn.ant-btn:hover,
	.drilldown-export-btn.ant-btn:focus {
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
			linear-gradient(135deg, #2d1238 0%, #731f82 58%, #9c5cac 100%);
		color: #ffffff;
	}

	table.reservation-main-table {
		min-width: 1280px;
	}

	table.reservation-main-table th,
	table.reservation-main-table td {
		padding-top: 6px;
		padding-bottom: 6px;
	}

	.link-btn {
		border: 0;
		background: transparent;
		color: #24547d;
		font-weight: 950;
		padding: 0;
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}

	.drilldown-pagination {
		display: flex;
		justify-content: center;
		padding: 2px 0 0;
	}

	.drilldown-pagination .ant-pagination {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 2px;
		align-items: center;
		justify-content: center;
	}

	.drilldown-pagination .ant-pagination-item,
	.drilldown-pagination .ant-pagination-prev,
	.drilldown-pagination .ant-pagination-next,
	.drilldown-pagination .ant-pagination-options {
		margin-inline-end: 4px;
	}

	.drilldown-pagination .ant-pagination-item-active {
		border-color: #64166e;
	}

	.drilldown-pagination .ant-pagination-item-active a {
		color: #64166e;
		font-weight: 950;
	}

	@media (max-width: 700px) {
		gap: 7px;

		.drilldown-toolbar {
			align-items: stretch;
			display: grid;
			grid-template-columns: 1fr;
			padding: 8px;
		}

		.drilldown-count {
			justify-content: center;
		}

		.drilldown-export-btn.ant-btn {
			width: 100%;
		}

		.drilldown-pagination {
			justify-content: center;
		}

		.drilldown-pagination .ant-pagination {
			justify-content: center;
		}
	}
`;

const ExecutiveReportShell = styled.div`
	display: grid;
	gap: 1rem;
	min-width: 0;
	max-width: 100%;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	.report-toolbar {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.4fr) auto auto;
		gap: 10px;
		align-items: center;
		min-width: 0;
		padding: 12px 14px;
		border: 1px solid #d9e6f7;
		border-radius: 8px;
		background: #ffffff;
		box-shadow: 0 1px 0 rgba(16, 24, 40, 0.06);
	}

	.report-toolbar.compact {
		grid-template-columns: minmax(180px, 1fr) auto;
	}

	.report-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		min-width: 0;
	}

	.report-actions .ant-btn {
		min-height: 38px;
		border-radius: 8px;
		font-weight: 900;
	}

	.report-toolbar.inventory-summary-toolbar {
		align-items: center;
	}

	.toolbar-note {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
		color: #172033;
		font-size: 0.78rem;
		font-weight: 850;
	}

	.toolbar-note strong {
		color: #102033;
		font-size: 0.92rem;
		font-weight: 950;
	}

	.toolbar-note span {
		color: #53627a;
		overflow-wrap: anywhere;
	}

	.filter-switch-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-width: 0;
		min-height: 54px;
		padding: 10px 12px;
		border: 1px solid #d8e6f7;
		border-radius: 8px;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.98)),
			linear-gradient(135deg, rgba(45, 93, 145, 0.08), rgba(111, 31, 120, 0.05));
		box-shadow: inset 0 1px rgba(255, 255, 255, 0.75);
	}

	.filter-switch-copy {
		display: grid;
		gap: 3px;
		min-width: 0;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.filter-switch-copy strong {
		color: #172033;
		font-size: 0.86rem;
		font-weight: 950;
		line-height: 1.35;
	}

	.filter-switch-copy span {
		color: #64748b;
		font-size: 0.72rem;
		font-weight: 850;
		line-height: 1.35;
	}

	.scope-switch {
		flex: 0 0 auto;
		min-width: 82px;
	}

	.scope-switch.ant-switch-checked {
		background: linear-gradient(135deg, #24102d 0%, #64166e 58%, #8d4c9d 100%) !important;
	}

	.toolbar-select,
	.toolbar-input {
		min-width: 0;
		width: 100%;
	}

	.report-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
		min-width: 0;
	}

	.report-grid.two {
		grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
	}

	.report-grid.chart-line-row,
	.report-grid.chart-secondary-row {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		align-items: stretch;
	}

	.report-panel {
		min-width: 0;
		max-width: 100%;
		padding: 14px;
		border: 1px solid #dde8f6;
		border-radius: 8px;
		background: #ffffff;
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
	}

	.report-panel > header {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-items: center;
		justify-items: center;
		gap: 10px;
		min-height: 30px;
		margin-bottom: 10px;
		color: #162033;
		font-size: 0.96rem;
		font-weight: 950;
		line-height: 1.35;
		text-align: center;
		overflow-wrap: anywhere;
	}

	.report-panel > header > span {
		min-width: 0;
		max-width: calc(100% - 72px);
		text-align: center;
		overflow-wrap: anywhere;
	}

	.report-panel > header .ant-btn {
		position: absolute;
		inset-inline-end: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	.chart-panel {
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.98)),
			linear-gradient(135deg, rgba(45, 93, 145, 0.08), rgba(111, 31, 120, 0.06));
	}

	.chart-click-hint {
		margin-top: -0.35rem;
		color: #667085;
		font-size: 0.8rem;
		font-weight: 800;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.chart-panel .ant-btn {
		flex: 0 0 auto;
		color: #24547d;
		border: 1px solid rgba(45, 93, 145, 0.16);
		border-radius: 8px;
	}

	.chart-panel .ant-btn:hover {
		color: #6f1f78;
		border-color: rgba(111, 31, 120, 0.36);
		background: rgba(111, 31, 120, 0.06);
	}

	.executive-chart-tooltip {
		display: grid;
		gap: 7px;
		min-width: 190px;
		padding: 10px 12px;
		border: 1px solid #d4e4f7;
		border-radius: 10px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.98)),
			linear-gradient(135deg, rgba(36, 84, 125, 0.08), rgba(111, 31, 120, 0.05));
		box-shadow: 0 14px 30px rgba(15, 40, 66, 0.18);
		color: #102033;
		font-family: inherit;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.executive-chart-tooltip .tooltip-date {
		display: grid;
		gap: 2px;
		padding-bottom: 7px;
		border-bottom: 1px solid #e4edf8;
	}

	.executive-chart-tooltip .tooltip-date span {
		color: #64748b;
		font-size: 0.64rem;
		font-weight: 900;
		line-height: 1.2;
	}

	.executive-chart-tooltip .tooltip-date strong {
		color: #102033;
		font-size: 0.86rem;
		font-weight: 950;
		line-height: 1.25;
		white-space: nowrap;
	}

	.executive-chart-tooltip .tooltip-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 7px;
		min-height: 32px;
		padding: 6px 8px;
		border-radius: 8px;
		background: #f4f8ff;
		color: #1e293b;
		font-size: 0.75rem;
		font-weight: 850;
	}

	.executive-chart-tooltip .tooltip-row strong {
		color: #102033;
		font-size: 0.9rem;
		font-weight: 950;
		line-height: 1;
		white-space: nowrap;
	}

	.executive-chart-tooltip .tooltip-amount {
		color: #334155;
	}

	.executive-chart-tooltip .tooltip-dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
	}

	.table-panel {
		overflow: hidden;
	}

	.executive-report-table {
		box-shadow: none;
	}

	.executive-report-table table {
		min-width: 920px;
	}

	.executive-report-table.compact-table table {
		min-width: 620px;
	}

	.executive-report-table th,
	.executive-report-table td {
		font-size: 0.76rem;
		padding: 8px 9px;
	}

	.report-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 220px;
		color: #334155;
		font-weight: 900;
	}

	.report-pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		margin-top: 12px;
		color: #172033;
		font-size: 0.82rem;
		font-weight: 900;
	}

	.ant-btn-primary {
		background: var(--pms-metal-purple-bg, linear-gradient(135deg, #24102d, #64166e));
		border-color: var(--pms-metal-purple-lift, #8d4c9d);
		font-weight: 900;
	}

	@media (max-width: 860px) {
		.report-toolbar,
		.report-toolbar.compact,
		.report-toolbar.paid-toolbar {
			grid-template-columns: 1fr;
		}

		.report-grid,
		.report-grid.chart-line-row,
		.report-grid.chart-secondary-row,
		.report-grid.two {
			grid-template-columns: 1fr;
		}

		.report-actions {
			justify-content: stretch;
		}

		.report-actions .ant-btn {
			flex: 1 1 0;
		}
	}

	@media (max-width: 520px) {
		gap: 0.75rem;

		.report-toolbar {
			padding: 10px;
			gap: 8px;
		}

		.report-actions {
			flex-direction: column;
		}

		.report-actions .ant-btn {
			width: 100%;
		}

		.report-panel {
			padding: 10px;
		}

		.filter-switch-card {
			align-items: stretch;
			flex-direction: column;
			gap: 8px;
		}

		.scope-switch {
			align-self: ${(props) => (props.$isRTL ? "flex-start" : "flex-end")};
		}

		.report-panel > header {
			font-size: 0.84rem;
		}

		.executive-report-table table {
			min-width: 720px;
		}

		.executive-report-table.compact-table table {
			min-width: 560px;
		}

		.executive-report-table th,
		.executive-report-table td {
			font-size: 0.7rem;
			padding: 6px 7px;
		}

		.report-pagination {
			flex-wrap: wrap;
			gap: 8px;
			font-size: 0.74rem;
		}
	}

	@media (max-width: 380px) {
		.executive-report-table table {
			min-width: 640px;
		}

		.executive-report-table.compact-table table {
			min-width: 500px;
		}
	}
`;

const ExpandedChartWrap = styled.div`
	min-height: 560px;
	padding: 10px 0 0;

	@media (max-width: 640px) {
		min-height: 420px;
	}
`;

const InventorySelectGate = styled.div`
	display: grid;
	gap: 12px;
	min-width: 0;
	padding: clamp(12px, 1.4vw, 18px);
	border: 1px solid #d9e6f7;
	border-radius: 10px;
	background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
	box-shadow: 0 10px 24px rgba(16, 32, 51, 0.06);
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	label {
		display: grid;
		gap: 6px;
		width: min(520px, 100%);
	}

	label > span {
		color: #102033;
		font-size: 0.86rem;
		font-weight: 950;
	}

	.ant-select {
		width: 100%;
	}
`;

const InventoryRequiredPanel = styled.div`
	min-height: 220px;
	display: grid;
	place-items: center;
	padding: 24px;
	border: 1px dashed #b8c9df;
	border-radius: 8px;
	background: #f8fbff;
	color: #24324a;
	font-size: 0.95rem;
	font-weight: 950;
	text-align: center;
	line-height: 1.8;
`;
