import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chart from "react-apexcharts";
import { Alert, Button, Modal, Select, Spin } from "antd";
import { FullscreenOutlined } from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import dayjs from "dayjs";
import moment from "moment-hijri";
import {
	getOverallExecutiveInventoryDayReport,
	getOverallExecutiveInventoryReport,
	getOverallExecutivePaidReport,
	getOverallExecutiveReservationsReport,
} from "../../apiAdmin";
import HotelInventory from "../../HotelReports/HotelInventory";
import {
	formatDate,
	formatMoney,
	localizeStatus,
	OverallCard,
	OverallCards,
	OverallTableWrap,
	statusTone,
	titleCase,
} from "../overallShared";

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
		breakdown: "Paid Breakdown",
		paymentMethods: "Payment Methods",
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

const normalizeInventoryDate = (value = "") =>
	/^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";

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

const formatChartDateLabel = (value = "", options = {}) => {
	const raw = String(value || "");
	const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
	if (!isoMatch) return raw;
	const parsed = dayjs(isoMatch[1]);
	return parsed.isValid()
		? parsed.format(options.full ? "MMM D, YYYY" : "MMM D")
		: raw;
};

const chartLabelFormatter = () => (value, _timestamp, options) =>
	formatChartDateLabel(resolveChartCategory(value, options));

const chartTooltip = ({ labels, isRTL }) => ({
	custom: ({ series, seriesIndex, dataPointIndex, w }) => {
		const categories = w?.config?.xaxis?.categories || [];
		const rawDate = categories[dataPointIndex] || "";
		const title = formatChartDateLabel(rawDate, { full: true });
		const seriesName = w?.config?.series?.[seriesIndex]?.name || labels.count;
		const value = series?.[seriesIndex]?.[dataPointIndex] || 0;
		const color = w?.globals?.colors?.[seriesIndex] || "#24547d";
		return `
			<div class="executive-chart-tooltip" dir="${isRTL ? "rtl" : "ltr"}">
				<div class="tooltip-date">${title}</div>
				<div class="tooltip-row">
					<span class="tooltip-dot" style="background:${color}"></span>
					<span>${seriesName}: <strong>${formatMoney(value)}</strong></span>
				</div>
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
}) => ({
	chart: {
		toolbar: { show: false },
		fontFamily: chartFont(isRTL),
	},
	colors,
	dataLabels: { enabled: false },
	grid: { borderColor: "#edf2f7" },
	xaxis: {
		type: "category",
		categories,
		tickAmount: chartTickAmount(categories, expanded),
		tickPlacement: "on",
		axisBorder: { color: "#dbe6f3" },
		axisTicks: { color: "#dbe6f3" },
		labels: {
			show: true,
			rotate: expanded ? -35 : -25,
			rotateAlways: true,
			trim: false,
			hideOverlappingLabels: true,
			showDuplicates: false,
			minHeight: expanded ? 76 : 58,
			maxHeight: expanded ? 96 : 72,
			formatter: chartLabelFormatter(),
			style: {
				fontWeight: 850,
				colors: "#334155",
				fontSize: expanded ? "12px" : "11px",
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
		...chartTooltip({ labels, isRTL }),
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

const donutOptions = ({ labels: sliceLabels, colors, text, isRTL }) => ({
	chart: {
		toolbar: { show: false },
		fontFamily: chartFont(isRTL),
	},
	labels: sliceLabels,
	colors,
	stroke: {
		width: 3,
		colors: ["#ffffff"],
	},
	plotOptions: {
		pie: {
			donut: {
				size: "66%",
				labels: {
					show: true,
					name: {
						show: true,
						fontWeight: 900,
						color: "#172033",
					},
					value: {
						show: true,
						fontWeight: 950,
						color: "#102033",
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
		formatter: (value) => `${Number(value || 0).toFixed(value < 10 ? 1 : 0)}%`,
	},
	tooltip: {
		y: { formatter: (value) => formatMoney(value) },
	},
	noData: { text: text.noData },
});

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
				width='min(1180px, calc(100vw - 24px))'
				title={title}
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
	const [error, setError] = useState("");
	const [report, setReport] = useState(null);
	const reservationsRequestRef = useRef(0);
	const statusRequiresCancelledScope = statusNeedsCancelledScope(params?.status);
	const includeCancelledFromFilters =
		String(params?.includeCancelled || "").toLowerCase() === "true";
	const effectiveExcludeCancelled =
		!includeCancelledFromFilters && !statusRequiresCancelledScope;

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
	const stats = report?.stats || {};

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
				<Button onClick={() => setReloadKey((value) => value + 1)}>
					{labels.refresh}
				</Button>
			</div>

			<LoadingBlock loading={loading} error={error} labels={labels}>
				<OverallCards>
					<OverallCard>
						<strong>{formatMoney(stats.reservationsCount)}</strong>
						<span>{labels.reservations}</span>
					</OverallCard>
					<OverallCard>
						<strong>{money(stats.total_amount, labels)}</strong>
						<span>{labels.totalAmount}</span>
					</OverallCard>
					<OverallCard>
						<strong>{money(stats.paidAmount, labels)}</strong>
						<span>{labels.paidAmount}</span>
					</OverallCard>
					<OverallCard>
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
		const queryStart = shouldHonorQueryPeriod
			? normalizeInventoryDate(query.get(INVENTORY_QUERY_KEYS.start))
			: "";
		const queryEnd = shouldHonorQueryPeriod
			? normalizeInventoryDate(query.get(INVENTORY_QUERY_KEYS.end))
			: "";
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
			calendarType === "hijri"
				? inventoryMonthRange(calendarType, month, year)
				: queryStart && queryEnd
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
			const queryStart = normalizeInventoryDate(
				shouldHonorQueryPeriod ? query.get(INVENTORY_QUERY_KEYS.start) : "",
			);
			const queryEnd = normalizeInventoryDate(
				shouldHonorQueryPeriod ? query.get(INVENTORY_QUERY_KEYS.end) : "",
			);
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
				calendarType === "hijri"
					? inventoryMonthRange(calendarType, month, year)
					: queryStart && queryEnd
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
					monthRange?.start ||
					normalizeInventoryDate(next.start) ||
					inventoryFilter.start,
				end:
					monthRange?.end ||
					normalizeInventoryDate(next.end) ||
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
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 10px;
		color: #162033;
		font-size: 0.96rem;
		font-weight: 950;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}

	.report-panel > header > span {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.chart-panel {
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.98)),
			linear-gradient(135deg, rgba(45, 93, 145, 0.08), rgba(111, 31, 120, 0.06));
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
		min-width: 132px;
		padding: 9px 11px;
		border: 1px solid #d7e7f8;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.98);
		box-shadow: 0 12px 28px rgba(15, 40, 66, 0.16);
		color: #102033;
		font-family: inherit;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.executive-chart-tooltip .tooltip-date {
		padding-bottom: 5px;
		border-bottom: 1px solid #e7eef8;
		color: #17395f;
		font-size: 0.8rem;
		font-weight: 950;
		white-space: nowrap;
	}

	.executive-chart-tooltip .tooltip-row {
		display: flex;
		align-items: center;
		gap: 7px;
		color: #1e293b;
		font-size: 0.78rem;
		font-weight: 850;
		white-space: nowrap;
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
	}

	@media (max-width: 520px) {
		gap: 0.75rem;

		.report-toolbar {
			padding: 10px;
			gap: 8px;
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
