import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import Chart from "react-apexcharts";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import {
	Button,
	DatePicker,
	Input,
	message,
	Modal,
	Pagination,
	Select,
	Spin,
	Table,
} from "antd";
import {
	BankOutlined,
	BarChartOutlined,
	DollarCircleOutlined,
	EyeOutlined,
	FileExcelOutlined,
	ReloadOutlined,
	SearchOutlined,
} from "@ant-design/icons";
import { isAuthenticated } from "../../auth";
import { useCartContext } from "../../cart_context";
import {
	exportOverallProfitReport,
	getOverallProfitReport,
} from "../apiAdmin";
import MoreDetails from "../AllReservation/MoreDetails";
import {
	getHotelById,
	singlePreReservationById,
} from "../../HotelModule/apiAdmin";

const DEFAULT_PROFIT_FROM = "2026-05-01";
const PAGE_SIZE = 25;
const TABLE_SCROLL_X = 1180;
const PROFIT_DETAILS_MODAL_Z_INDEX = 14000;

const TEXT = {
	en: {
		title: "Profit Report",
		allHotels: "All hotels",
		dateBy: "Date by",
		createdAt: "Created at",
		checkin: "Check-in",
		checkout: "Checkout",
		fromDate: "From date",
		toDate: "To date",
		granularity: "Granularity",
		day: "Day over day",
		week: "Week over week",
		month: "Month over month",
		searchPlaceholder: "Search guest, confirmation, hotel, or source",
		search: "Search",
		refresh: "Refresh",
		exportExcel: "Export Excel",
		exporting: "Exporting...",
		reservations: "Reservations",
		clientPaid: "Client paid / total",
		hotelTotal: "Amount to hotel",
		commission: "Commission",
		otaExpense: "OTA expenses",
		totalProfit: "Total Profit",
		profitRate: "Profit rate",
		bookingSourceBreakdown: "Profit by original booking source",
		profitTimeline: "Profit timeline",
		fullName: "Full name",
		reportDate: "Report date",
		confirmation: "Confirmation #",
		hotel: "Hotel",
		source: "Source",
		checkIn: "Check-in",
		checkOut: "Checkout",
		details: "Details",
		showDetails: "Show Details",
		noData: "No reservations found.",
		loadError: "Could not load profit report.",
		exportFailed: "Could not export profit report.",
		noRowsToExport: "No rows available to export.",
		page: "Page",
		of: "of",
		sar: "SAR",
	},
	ar: {
		title: "\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0631\u0628\u062d",
		allHotels: "\u0643\u0644 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		dateBy: "\u062d\u0633\u0628 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
		createdAt: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
		checkin: "\u0627\u0644\u0648\u0635\u0648\u0644",
		checkout: "\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		fromDate: "\u0645\u0646 \u062a\u0627\u0631\u064a\u062e",
		toDate: "\u0625\u0644\u0649 \u062a\u0627\u0631\u064a\u062e",
		granularity: "\u0627\u0644\u0641\u062a\u0631\u0629",
		day: "\u064a\u0648\u0645 \u0628\u064a\u0648\u0645",
		week: "\u0623\u0633\u0628\u0648\u0639 \u0628\u0623\u0633\u0628\u0648\u0639",
		month: "\u0634\u0647\u0631 \u0628\u0634\u0647\u0631",
		searchPlaceholder:
			"\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0636\u064a\u0641 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f \u0623\u0648 \u0627\u0644\u0641\u0646\u062f\u0642 \u0623\u0648 \u0627\u0644\u0645\u0635\u062f\u0631",
		search: "\u0628\u062d\u062b",
		refresh: "\u062a\u062d\u062f\u064a\u062b",
		exportExcel: "\u062a\u0635\u062f\u064a\u0631 Excel",
		exporting: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631...",
		reservations: "\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		clientPaid:
			"\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0639\u0645\u064a\u0644",
		hotelTotal:
			"\u0627\u0644\u0645\u0628\u0644\u063a \u0644\u0644\u0641\u0646\u062f\u0642",
		commission: "\u0627\u0644\u0639\u0645\u0648\u0644\u0629",
		otaExpense:
			"\u0645\u0635\u0627\u0631\u064a\u0641 \u0627\u0644\u0645\u0646\u0635\u0627\u062a",
		totalProfit: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0631\u0628\u062d",
		profitRate: "\u0646\u0633\u0628\u0629 \u0627\u0644\u0631\u0628\u062d",
		bookingSourceBreakdown:
			"\u0627\u0644\u0631\u0628\u062d \u062d\u0633\u0628 \u0627\u0644\u0645\u0635\u062f\u0631 \u0627\u0644\u0623\u0635\u0644\u064a",
		profitTimeline:
			"\u0627\u0644\u0631\u0628\u062d \u062d\u0633\u0628 \u0627\u0644\u0648\u0642\u062a",
		fullName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644",
		reportDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0642\u0631\u064a\u0631",
		confirmation: "\u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
		hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
		source: "\u0627\u0644\u0645\u0635\u062f\u0631",
		checkIn: "\u0627\u0644\u0648\u0635\u0648\u0644",
		checkOut: "\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		details: "\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
		showDetails: "\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
		noData: "\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a.",
		loadError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0631\u0628\u062d.",
		exportFailed: "\u062a\u0639\u0630\u0631 \u062a\u0635\u062f\u064a\u0631 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0631\u0628\u062d.",
		noRowsToExport:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u0648\u0641 \u0644\u0644\u062a\u0635\u062f\u064a\u0631.",
		page: "\u0635\u0641\u062d\u0629",
		of: "\u0645\u0646",
		sar: "\u0631\u064a\u0627\u0644",
	},
};

const dateByOptions = (labels) => [
	{ value: "createdAt", label: labels.createdAt },
	{ value: "checkin_date", label: labels.checkin },
	{ value: "checkout_date", label: labels.checkout },
];

const granularityOptions = (labels) => [
	{ value: "week", label: labels.week },
	{ value: "day", label: labels.day },
	{ value: "month", label: labels.month },
];

const safeNumber = (value) => {
	const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
	return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeId = (value) =>
	String(value?._id || value?.id || value || "").trim();

const formatMoney = (value) =>
	safeNumber(value).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const formatPercent = (value) =>
	`${safeNumber(value).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}%`;

const formatDate = (value) => {
	if (!value) return "-";
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "-";
};

const safeFileSegment = (value = "admin-profit-report") =>
	String(value || "admin-profit-report")
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, "-")
		.toLowerCase();

const fullNameForReservation = (reservation = {}) =>
	reservation?.customer_details?.fullName ||
	reservation?.customer_details?.name ||
	reservation?.customer_details?.guestName ||
	reservation?.fullName ||
	"";

const hotelNameForReservation = (reservation = {}) =>
	reservation.hotelName ||
	reservation.hotelId?.hotelName ||
	reservation.hotel_name ||
	"";

const profitMetricsForReservation = (reservation = {}) =>
	reservation.profitMetrics || {};

const moneyText = (value, labels) => `${formatMoney(value)} ${labels.sar}`;

const buildExportRows = ({ rows = [], labels = {}, dateByLabel = "" }) =>
	rows.map((reservation, index) => {
		const metrics = profitMetricsForReservation(reservation);
		return {
			"#": index + 1,
			[labels.fullName]: fullNameForReservation(reservation),
			[dateByLabel || labels.reportDate]: formatDate(metrics.reportDate),
			[labels.confirmation]: reservation.confirmation_number || "",
			[labels.checkIn]: formatDate(reservation.checkin_date),
			[labels.checkOut]: formatDate(reservation.checkout_date),
			[labels.hotel]: hotelNameForReservation(reservation),
			[labels.source]: reservation.booking_source || "",
			[labels.clientPaid]: safeNumber(metrics.clientTotal),
			[labels.hotelTotal]: safeNumber(metrics.hotelTotal),
			[labels.commission]: safeNumber(metrics.commission),
			[labels.otaExpense]: safeNumber(metrics.otaExpense),
			[labels.totalProfit]: safeNumber(metrics.profitMargin),
			[labels.profitRate]: safeNumber(metrics.profitRate),
		};
	});

const downloadProfitWorkbook = ({ rows = [], labels = {}, dateByLabel = "" }) => {
	const exportRows = buildExportRows({ rows, labels, dateByLabel });
	const worksheet = XLSX.utils.json_to_sheet(exportRows);
	worksheet["!cols"] = [
		{ wch: 7 },
		{ wch: 24 },
		{ wch: 16 },
		{ wch: 22 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 26 },
		{ wch: 18 },
		{ wch: 18 },
		{ wch: 18 },
		{ wch: 14 },
		{ wch: 16 },
		{ wch: 16 },
		{ wch: 13 },
	];
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "Profit");
	const fileDate = dayjs().format("YYYY-MM-DD");
	XLSX.writeFile(
		workbook,
		`${safeFileSegment("admin-profit-report")}-${fileDate}.xlsx`,
	);
};

const DetailText = ({ value, max = 24 }) => {
	const text = value === null || value === undefined || value === "" ? "-" : String(value);
	const display = text.length > max ? `${text.slice(0, max)}...` : text;
	return (
		<span className='profit-table-text' title={text} dir='auto'>
			{display}
		</span>
	);
};

class ProfitChartBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error) {
		console.error("Profit chart failed to render:", error);
	}

	componentDidUpdate(previousProps) {
		if (
			this.state.hasError &&
			previousProps.resetKey !== this.props.resetKey
		) {
			this.setState({ hasError: false });
		}
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback || null;
		}
		return this.props.children;
	}
}

const ProfitReportAdmin = () => {
	const { chosenLanguage } = useCartContext();
	const { user, token } = isAuthenticated() || {};
	const isArabic = chosenLanguage === "Arabic";
	const labels = TEXT[isArabic ? "ar" : "en"];
	const [filters, setFilters] = useState({
		hotelId: "",
		dateBy: "createdAt",
		dateFrom: DEFAULT_PROFIT_FROM,
		dateTo: "",
		granularity: "week",
		search: "",
		sortBy: "createdAt",
		sortOrder: "desc",
	});
	const [searchDraft, setSearchDraft] = useState("");
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [report, setReport] = useState({
		reservations: [],
		scorecards: {},
		timeline: { day: [], week: [], month: [] },
		bookingSources: [],
		hotels: [],
		allHotels: [],
		total: 0,
		pages: 1,
	});
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [detailsLoading, setDetailsLoading] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [detailReservation, setDetailReservation] = useState(null);
	const [detailHotel, setDetailHotel] = useState(null);

	const dateByLabel = useMemo(() => {
		const found = dateByOptions(labels).find(
			(option) => option.value === filters.dateBy,
		);
		return found?.label || labels.reportDate;
	}, [filters.dateBy, labels]);

	const params = useMemo(
		() => ({
			hotelId: filters.hotelId,
			dateBy: filters.dateBy,
			dateFrom: filters.dateFrom,
			dateTo: filters.dateTo,
			search: filters.search,
			sortBy: filters.sortBy,
			sortOrder: filters.sortOrder,
			page,
			limit: PAGE_SIZE,
		}),
		[filters, page],
	);

	const loadReport = useCallback(() => {
		if (!user?._id || !token) return;
		setLoading(true);
		getOverallProfitReport(user._id, token, params)
			.then((data) => {
				if (data?.error) {
					message.error(data.error || labels.loadError);
					setReport((previous) => ({
						...previous,
						reservations: [],
						total: 0,
						pages: 1,
					}));
					return;
				}
				setReport({
					reservations: Array.isArray(data?.reservations)
						? data.reservations
						: [],
					scorecards: data?.scorecards || {},
					timeline: data?.timeline || { day: [], week: [], month: [] },
					bookingSources: Array.isArray(data?.bookingSources)
						? data.bookingSources
						: [],
					hotels: Array.isArray(data?.hotels) ? data.hotels : [],
					allHotels: Array.isArray(data?.allHotels) ? data.allHotels : [],
					total: safeNumber(data?.total),
					pages: Math.max(safeNumber(data?.pages) || 1, 1),
					period: data?.period || {},
				});
			})
			.catch(() => {
				message.error(labels.loadError);
			})
			.finally(() => setLoading(false));
	}, [labels.loadError, params, token, user?._id]);

	useEffect(() => {
		loadReport();
	}, [loadReport]);

	const updateFilter = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value || "" }));
		setPage(1);
	};

	const applySearch = () => {
		updateFilter("search", searchDraft.trim());
	};

	const handleSearchKeyDown = (event) => {
		if (event.key === "Enter") applySearch();
	};

	const handleExport = () => {
		if (!user?._id || !token || exporting) return;
		setExporting(true);
		exportOverallProfitReport(user._id, token, {
			hotelId: filters.hotelId,
			dateBy: filters.dateBy,
			dateFrom: filters.dateFrom,
			dateTo: filters.dateTo,
			search: filters.search,
			sortBy: filters.sortBy,
			sortOrder: filters.sortOrder,
			limit: 20000,
		})
			.then((data) => {
				if (data?.error) {
					message.error(data.error || labels.exportFailed);
					return;
				}
				const rows = Array.isArray(data?.reservations) ? data.reservations : [];
				if (!rows.length) {
					message.info(labels.noRowsToExport);
					return;
				}
				downloadProfitWorkbook({ rows, labels, dateByLabel });
			})
			.catch(() => message.error(labels.exportFailed))
			.finally(() => setExporting(false));
	};

	const hotelOptions = useMemo(() => {
		const source = report.allHotels?.length ? report.allHotels : report.hotels;
		return (Array.isArray(source) ? source : [])
			.map((hotel) => ({
				value: normalizeId(hotel._id),
				label: hotel.hotelName || "Hotel",
			}))
			.filter((hotel) => hotel.value)
			.sort((a, b) =>
				String(a.label).localeCompare(String(b.label), undefined, {
					sensitivity: "base",
				}),
			);
	}, [report.allHotels, report.hotels]);

	const scorecards = report.scorecards || {};
	const scorecardItems = [
		{
			key: "reservations",
			label: labels.reservations,
			value: safeNumber(scorecards.reservationsCount).toLocaleString("en-US"),
			tone: "blue",
			icon: <BarChartOutlined />,
		},
		{
			key: "client",
			label: labels.clientPaid,
			value: moneyText(scorecards.clientTotal, labels),
			tone: "cyan",
			icon: <DollarCircleOutlined />,
		},
		{
			key: "hotel",
			label: labels.hotelTotal,
			value: moneyText(scorecards.hotelTotal, labels),
			tone: "slate",
			icon: <BankOutlined />,
		},
		{
			key: "commission",
			label: labels.commission,
			value: moneyText(scorecards.commission, labels),
			tone: "amber",
			icon: <DollarCircleOutlined />,
		},
		{
			key: "profit",
			label: labels.totalProfit,
			value: moneyText(scorecards.profitMargin, labels),
			tone: safeNumber(scorecards.profitMargin) < 0 ? "red" : "emerald",
			icon: <DollarCircleOutlined />,
		},
		{
			key: "rate",
			label: labels.profitRate,
			value: formatPercent(scorecards.profitRate),
			tone: "indigo",
			icon: <BarChartOutlined />,
		},
	];

	const activeTimelineSource = Array.isArray(report.timeline?.[filters.granularity])
		? report.timeline[filters.granularity]
		: [];
	const activeTimeline = activeTimelineSource.slice(-120);
	const timelineCategories = activeTimeline.map((row) => row.groupKey);
	const timelineOptions = {
		chart: {
			id: "admin-profit-timeline",
			toolbar: {
				show: true,
				tools: {
					download: false,
					selection: true,
					zoom: true,
					zoomin: true,
					zoomout: true,
					pan: true,
					reset: true,
				},
			},
			zoom: { enabled: true },
			fontFamily: isArabic
				? '"Droid Arabic Kufi", "Tajawal", Arial, sans-serif'
				: '"Inter", "Segoe UI", Arial, sans-serif',
		},
		colors: ["#0f8b5f", "#d97706", "#b91c1c"],
		dataLabels: {
			enabled: activeTimeline.length <= 10,
			formatter: (value) => formatMoney(value),
			background: {
				enabled: true,
				borderRadius: 4,
				opacity: 0.86,
			},
			style: {
				fontSize: "10px",
				fontWeight: 900,
			},
		},
		markers: {
			size: 4,
			strokeWidth: 2,
			hover: { size: 7 },
		},
		stroke: { curve: "smooth", width: [4, 3, 3] },
		grid: {
			borderColor: "#d9e7f5",
			strokeDashArray: 3,
			padding: { left: 10, right: 18, bottom: 10 },
		},
		xaxis: {
			categories: timelineCategories,
			title: {
				text: granularityOptions(labels).find(
					(item) => item.value === filters.granularity,
				)?.label,
				style: { fontWeight: 950, color: "#334155" },
			},
			labels: {
				rotate: activeTimeline.length > 8 ? -35 : 0,
				trim: true,
				hideOverlappingLabels: false,
				style: { colors: "#334155", fontWeight: 850 },
			},
			axisBorder: { color: "#9db7d4" },
			axisTicks: { color: "#9db7d4" },
		},
		yaxis: {
			title: {
				text: labels.totalProfit,
				style: { fontWeight: 950, color: "#334155" },
			},
			forceNiceScale: true,
			labels: {
				formatter: (value) => formatMoney(value),
				style: { colors: "#334155", fontWeight: 850 },
			},
		},
		tooltip: {
			shared: true,
			intersect: false,
			x: { show: true },
			y: {
				formatter: (value) => moneyText(value, labels),
			},
		},
		legend: {
			position: "top",
			horizontalAlign: isArabic ? "right" : "left",
			fontWeight: 850,
			markers: { radius: 4 },
		},
	};
	const timelineSeries = [
		{
			name: labels.totalProfit,
			data: activeTimeline.map((row) => safeNumber(row.profitMargin)),
		},
		{
			name: labels.commission,
			data: activeTimeline.map((row) => safeNumber(row.commission)),
		},
		{
			name: labels.otaExpense,
			data: activeTimeline.map((row) => safeNumber(row.otaExpense)),
		},
	];

	const bookingSourceRows = (Array.isArray(report.bookingSources)
		? report.bookingSources
		: []
	).slice(0, 14);
	const sourceChartHeight = Math.max(
		300,
		Math.min(460, bookingSourceRows.length * 50 + 135),
	);
	const sourceOptions = {
		chart: {
			id: "admin-profit-booking-source",
			toolbar: { show: false },
			fontFamily: isArabic
				? '"Droid Arabic Kufi", "Tajawal", Arial, sans-serif'
				: '"Inter", "Segoe UI", Arial, sans-serif',
		},
		plotOptions: {
			bar: {
				horizontal: true,
				borderRadius: 3,
				barHeight: "42%",
				dataLabels: {
					position: "right",
				},
			},
		},
		colors: ["#0f766e"],
		dataLabels: {
			enabled: true,
			formatter: (value) => moneyText(value, labels),
			textAnchor: "middle",
			offsetX: -28,
			style: {
				colors: ["#ffffff"],
				fontSize: "11px",
				fontWeight: 950,
			},
			dropShadow: {
				enabled: true,
				top: 1,
				left: 1,
				blur: 1,
				opacity: 0.45,
			},
			background: {
				enabled: false,
			},
		},
		grid: {
			borderColor: "#d9e7f5",
			strokeDashArray: 3,
			padding: { left: 12, right: 48 },
		},
		xaxis: {
			categories: bookingSourceRows.map((row) => row.source || "Unknown"),
			title: {
				text: labels.totalProfit,
				style: { fontWeight: 950, color: "#334155" },
			},
			labels: {
				formatter: (value) => formatMoney(value),
				style: { colors: "#334155", fontWeight: 850 },
			},
			axisBorder: { color: "#9db7d4" },
			axisTicks: { color: "#9db7d4" },
		},
		yaxis: {
			labels: {
				minWidth: 105,
				maxWidth: 170,
				style: { colors: "#334155", fontWeight: 900 },
			},
		},
		tooltip: {
			x: { show: true },
			y: {
				formatter: (value) => moneyText(value, labels),
			},
		},
	};
	const sourceSeries = [
		{
			name: labels.totalProfit,
			data: bookingSourceRows.map((row) => safeNumber(row.profitMargin)),
		},
	];
	const chartResetKey = `${filters.granularity}-${activeTimeline.length}-${bookingSourceRows.length}-${filters.hotelId || "all"}`;

	const loadDetails = useCallback(
		async (reservation) => {
			if (!reservation) return;
			setDetailsOpen(true);
			setDetailsLoading(true);
			setSelectedReservation(reservation);
			setDetailReservation(null);
			setDetailHotel(null);
			try {
				const freshReservation = reservation._id
					? await singlePreReservationById(reservation._id, {
							view: "details",
					  }).catch(() => null)
					: null;
				const usableReservation =
					freshReservation &&
					!freshReservation.error &&
					!freshReservation.message
						? freshReservation
						: reservation;
				const candidateHotel =
					usableReservation.hotelId &&
					typeof usableReservation.hotelId === "object"
						? usableReservation.hotelId
						: null;
				const hotelId =
					normalizeId(candidateHotel) || normalizeId(reservation.hotelId);
				const freshHotel =
					candidateHotel?.roomCountDetails || !hotelId
						? candidateHotel
						: await getHotelById(hotelId, {
								view: "reservation-details",
						  }).catch(() => null);
				const normalizedHotel =
					freshHotel && !freshHotel.error
						? freshHotel
						: {
								_id: hotelId,
								hotelName: hotelNameForReservation(reservation),
								belongsTo: reservation.hotelOwnerId || reservation.belongsTo || "",
						  };
				const ownerId = normalizeId(
					normalizedHotel?.belongsTo ||
						usableReservation.belongsTo ||
						reservation.hotelOwnerId,
				);
				setDetailHotel(normalizedHotel);
				setDetailReservation({
					...reservation,
					...usableReservation,
					hotelId: normalizeId(normalizedHotel?._id || hotelId),
					belongsTo: ownerId,
					hotelOwnerId: ownerId,
					hotelName:
						normalizedHotel?.hotelName || hotelNameForReservation(reservation),
				});
			} finally {
				setDetailsLoading(false);
			}
		},
		[],
	);

	const closeDetails = () => {
		setDetailsOpen(false);
		setSelectedReservation(null);
		setDetailReservation(null);
		setDetailHotel(null);
	};

	const handleReservationUpdated = (updatedReservation = {}) => {
		setDetailReservation((previous) => ({
			...(previous || {}),
			...(updatedReservation || {}),
		}));
		loadReport();
	};

	const rowNumberColumn = {
		title: "#",
		width: 34,
		align: "center",
		render: (_value, _row, index) => (page - 1) * PAGE_SIZE + index + 1,
	};
	const guestColumn = {
		title: labels.fullName,
		width: 112,
		ellipsis: true,
		render: (_value, row) => (
			<DetailText value={fullNameForReservation(row)} max={15} />
		),
	};
	const totalProfitColumn = {
		title: labels.totalProfit,
		width: 104,
		align: "center",
		className: "profit-total-column",
		render: (_value, row) => {
			const value = profitMetricsForReservation(row).profitMargin;
			return (
				<ProfitValue $negative={safeNumber(value) < 0}>
					{moneyText(value, labels)}
				</ProfitValue>
			);
		},
	};
	const detailsColumn = {
		title: labels.details,
		width: 104,
		align: "center",
		className: "profit-details-action-cell",
		render: (_value, row) => (
			<Button
				type='primary'
				size='small'
				icon={<EyeOutlined />}
				onClick={() => loadDetails(row)}
				className='profit-details-button'
				aria-label={labels.showDetails}
			>
				{labels.showDetails}
			</Button>
		),
	};
	const reportColumns = [
		{
			title: dateByLabel,
			width: 88,
			align: "center",
			render: (_value, row) =>
				formatDate(profitMetricsForReservation(row).reportDate),
		},
		{
			title: labels.confirmation,
			width: 104,
			align: "center",
			ellipsis: true,
			render: (_value, row) => (
				<DetailText value={row.confirmation_number || ""} max={12} />
			),
		},
		{
			title: labels.checkIn,
			width: 78,
			align: "center",
			render: (_value, row) => formatDate(row.checkin_date),
		},
		{
			title: labels.checkOut,
			width: 82,
			align: "center",
			render: (_value, row) => formatDate(row.checkout_date),
		},
		{
			title: labels.hotel,
			width: 122,
			ellipsis: true,
			render: (_value, row) => (
				<DetailText value={hotelNameForReservation(row)} max={16} />
			),
		},
		{
			title: labels.source,
			width: 78,
			ellipsis: true,
			render: (_value, row) => (
				<DetailText value={row.booking_source || ""} max={10} />
			),
		},
		{
			title: labels.clientPaid,
			width: 98,
			align: "center",
			render: (_value, row) =>
				moneyText(profitMetricsForReservation(row).clientTotal, labels),
		},
		{
			title: labels.hotelTotal,
			width: 98,
			align: "center",
			render: (_value, row) =>
				moneyText(profitMetricsForReservation(row).hotelTotal, labels),
		},
		{
			title: labels.commission,
			width: 78,
			align: "center",
			render: (_value, row) =>
				moneyText(profitMetricsForReservation(row).commission, labels),
		},
	];
	const columns = isArabic
		? [
				rowNumberColumn,
				guestColumn,
				totalProfitColumn,
				detailsColumn,
				...reportColumns,
		  ]
		: [
				rowNumberColumn,
				guestColumn,
				...reportColumns,
				totalProfitColumn,
				detailsColumn,
		  ];

	return (
		<ProfitReportWrapper
			className='profit-report-wrapper'
			dir={isArabic ? "rtl" : "ltr"}
			$isRTL={isArabic}
		>
			<FiltersBar>
				<Select
					value={filters.hotelId}
					onChange={(value) => updateFilter("hotelId", value)}
					options={[{ value: "", label: labels.allHotels }, ...hotelOptions]}
					showSearch
					optionFilterProp='label'
					className='profit-filter-control'
				/>
				<Select
					value={filters.dateBy}
					onChange={(value) => updateFilter("dateBy", value)}
					options={dateByOptions(labels)}
					className='profit-filter-control'
				/>
				<DatePicker
					value={filters.dateFrom ? dayjs(filters.dateFrom) : null}
					onChange={(value) =>
						updateFilter(
							"dateFrom",
							value && value.isValid() ? value.format("YYYY-MM-DD") : "",
						)
					}
					placeholder={labels.fromDate}
					className='profit-date-control'
				/>
				<DatePicker
					value={filters.dateTo ? dayjs(filters.dateTo) : null}
					onChange={(value) =>
						updateFilter(
							"dateTo",
							value && value.isValid() ? value.format("YYYY-MM-DD") : "",
						)
					}
					placeholder={labels.toDate}
					className='profit-date-control'
				/>
				<Select
					value={filters.granularity}
					onChange={(value) => updateFilter("granularity", value)}
					options={granularityOptions(labels)}
					className='profit-filter-control'
				/>
				<Input
					value={searchDraft}
					onChange={(event) => setSearchDraft(event.target.value)}
					onKeyDown={handleSearchKeyDown}
					placeholder={labels.searchPlaceholder}
					prefix={<SearchOutlined />}
					className='profit-search-control'
					allowClear
				/>
				<Button icon={<SearchOutlined />} onClick={applySearch}>
					{labels.search}
				</Button>
				<Button icon={<ReloadOutlined />} onClick={loadReport}>
					{labels.refresh}
				</Button>
				<Button
					type='primary'
					icon={<FileExcelOutlined />}
					loading={exporting}
					onClick={handleExport}
				>
					{exporting ? labels.exporting : labels.exportExcel}
				</Button>
			</FiltersBar>

			<Spin spinning={loading}>
				<ScoreGrid>
					{scorecardItems.map((card) => (
						<ScoreTile
							key={card.key}
							$tone={card.tone}
							role='group'
							aria-label={`${card.label}: ${card.value}`}
						>
							<span className='score-icon'>{card.icon}</span>
							<span className='score-label'>{card.label}</span>
							<strong>{card.value}</strong>
						</ScoreTile>
					))}
				</ScoreGrid>

				<ChartsGrid>
					<ChartPanel>
						<header>
							<h4>{labels.profitTimeline}</h4>
							<span>{granularityOptions(labels).find((item) => item.value === filters.granularity)?.label}</span>
						</header>
						{activeTimeline.length ? (
							<ProfitChartBoundary
								resetKey={`timeline-${chartResetKey}`}
								fallback={<EmptyBlock>{labels.noData}</EmptyBlock>}
							>
								<Chart
									options={timelineOptions}
									series={timelineSeries}
									type='area'
									height={460}
								/>
							</ProfitChartBoundary>
						) : (
							<EmptyBlock>{labels.noData}</EmptyBlock>
						)}
					</ChartPanel>

					<ChartPanel>
						<header>
							<h4>{labels.bookingSourceBreakdown}</h4>
						</header>
						{bookingSourceRows.length ? (
							<ProfitChartBoundary
								resetKey={`source-${chartResetKey}`}
								fallback={<EmptyBlock>{labels.noData}</EmptyBlock>}
							>
								<Chart
									options={sourceOptions}
									series={sourceSeries}
									type='bar'
									height={sourceChartHeight}
								/>
							</ProfitChartBoundary>
						) : (
							<EmptyBlock>{labels.noData}</EmptyBlock>
						)}
					</ChartPanel>
				</ChartsGrid>

				<TableShell>
					<Table
						rowKey={(row) => row._id || row.confirmation_number}
						columns={columns}
						dataSource={Array.isArray(report.reservations) ? report.reservations : []}
						childrenColumnName='__profitReportChildren'
						pagination={false}
						scroll={{ x: TABLE_SCROLL_X }}
						size='small'
						locale={{ emptyText: labels.noData }}
						className='profit-report-table'
					/>
				</TableShell>

				<PagerBar>
					<span>
						{labels.page} {page} {labels.of} {Math.max(report.pages || 1, 1)}
					</span>
					<Pagination
						current={page}
						pageSize={PAGE_SIZE}
						total={safeNumber(report.total)}
						onChange={(nextPage) => setPage(nextPage)}
						showSizeChanger={false}
					/>
				</PagerBar>
			</Spin>

			<Modal
				open={detailsOpen}
				onCancel={closeDetails}
				footer={null}
				width='min(98vw, 1600px)'
				style={{ top: "2%" }}
				destroyOnClose
				zIndex={PROFIT_DETAILS_MODAL_Z_INDEX}
				getContainer={() => document.body}
				rootClassName='profit-details-modal-root'
				wrapClassName='profit-details-modal-wrap'
				styles={{
					mask: { zIndex: PROFIT_DETAILS_MODAL_Z_INDEX - 1 },
					content: {
						position: "relative",
						zIndex: PROFIT_DETAILS_MODAL_Z_INDEX + 1,
					},
					body: { maxHeight: "90vh", overflowY: "auto", padding: 0 },
				}}
				className={isArabic ? "profit-details-modal is-rtl" : "profit-details-modal"}
			>
				{detailsLoading ? (
					<DetailsLoading>
						<Spin size='large' />
					</DetailsLoading>
				) : detailReservation && detailHotel ? (
					<MoreDetails
						reservation={detailReservation}
						setReservation={setDetailReservation}
						hotelDetails={detailHotel}
						onReservationUpdated={handleReservationUpdated}
					/>
				) : selectedReservation ? (
					<EmptyBlock>{labels.noData}</EmptyBlock>
				) : null}
			</Modal>
		</ProfitReportWrapper>
	);
};

export default ProfitReportAdmin;

const ProfitReportWrapper = styled.div`
	width: min(100%, calc(100vw - var(--admin-sidebar-width, 285px) - 72px));
	min-width: 0;
	max-width: 100%;
	display: grid;
	gap: 14px;
	overflow-x: clip;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	font-family: ${(props) =>
		props.$isRTL
			? `"Droid Arabic Kufi", "Tajawal", "Cairo", "Segoe UI", Tahoma, Arial, sans-serif`
			: `"Inter", "Segoe UI", Arial, sans-serif`};

	.ant-btn {
		font-weight: 850;
		border-radius: 7px;
	}

	> *,
	.ant-spin-nested-loading,
	.ant-spin-container {
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
	}

	.ant-spin-nested-loading,
	.ant-spin-container {
		width: 100%;
		overflow: hidden;
	}

	.profit-details-modal .ant-modal-body {
		max-height: 86vh;
		overflow-y: auto;
		padding: 8px;
	}

	.profit-details-modal.is-rtl .ant-modal-close {
		left: 10px;
		right: auto;
	}
`;

const FiltersBar = styled.div`
	display: grid;
	grid-template-columns: minmax(180px, 1.1fr) 150px 140px 140px 160px minmax(230px, 1.5fr) auto auto auto;
	gap: 9px;
	align-items: center;
	padding: 10px;
	border: 1px solid #c4d8ef;
	background: linear-gradient(180deg, #fbfdff 0%, #eef6ff 100%);
	border-radius: 8px;

	.profit-filter-control,
	.profit-date-control,
	.profit-search-control {
		width: 100%;
	}

	@media (max-width: 1250px) {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	@media (max-width: 720px) {
		grid-template-columns: 1fr;

		button {
			width: 100%;
		}
	}
`;

const scoreTone = {
	blue: {
		accent: "#2d5d91",
		bg: "linear-gradient(135deg, #f7fbff 0%, #e8f3ff 100%)",
		text: "#102033",
	},
	cyan: {
		accent: "#0891b2",
		bg: "linear-gradient(135deg, #ecfeff 0%, #dcf3ff 100%)",
		text: "#083344",
	},
	slate: {
		accent: "#475569",
		bg: "linear-gradient(135deg, #f8fafc 0%, #e8eef5 100%)",
		text: "#1f2937",
	},
	amber: {
		accent: "#d97706",
		bg: "linear-gradient(135deg, #fff8e7 0%, #ffe7b5 100%)",
		text: "#4c3000",
	},
	emerald: {
		accent: "#0f8b5f",
		bg: "linear-gradient(135deg, #ecfdf5 0%, #d8f7e4 100%)",
		text: "#064e3b",
	},
	red: {
		accent: "#b91c1c",
		bg: "linear-gradient(135deg, #fff5f5 0%, #ffe1e6 100%)",
		text: "#5f1212",
	},
	indigo: {
		accent: "#7c3aed",
		bg: "linear-gradient(135deg, #fffaff 0%, #efe3ff 100%)",
		text: "#3b1248",
	},
};

const scoreToneFor = (toneKey = "blue") => scoreTone[toneKey] || scoreTone.blue;

const ScoreGrid = styled.section`
	display: grid;
	grid-template-columns: repeat(6, minmax(132px, 1fr));
	gap: 10px;
	margin: 2px 0 4px;
	padding: 10px;
	border: 1px solid #d7e9fb;
	border-radius: 10px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.96)),
		linear-gradient(135deg, rgba(45, 93, 145, 0.1), rgba(141, 76, 157, 0.09));
	box-shadow: 0 10px 28px rgba(16, 32, 51, 0.08);
	overflow: visible;

	@media (max-width: 1380px) {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
		gap: 10px;
		padding: 10px;
	}
`;

const ScoreTile = styled.div`
	position: relative;
	min-width: 0;
	min-height: 104px;
	display: grid;
	grid-template-columns: 30px minmax(0, 1fr);
	grid-template-rows: auto 1fr auto;
	grid-template-areas:
		"icon label"
		"spacer spacer"
		"value value";
	align-items: center;
	text-align: start;
	gap: 7px;
	padding: 10px;
	border: 1px solid rgba(191, 219, 254, 0.95);
	border-radius: 8px;
	background: ${(props) => scoreToneFor(props.$tone).bg};
	box-shadow: 0 8px 18px rgba(16, 32, 51, 0.08);
	color: ${(props) => scoreToneFor(props.$tone).text};
	overflow: hidden;

	&::after {
		content: "";
		position: absolute;
		inset-inline-end: -28px;
		inset-block-start: -28px;
		width: 82px;
		height: 82px;
		border-radius: 999px;
		background: ${(props) => `${scoreToneFor(props.$tone).accent}18`};
	}

	.score-icon {
		position: relative;
		z-index: 1;
		grid-area: icon;
		width: 30px;
		height: 30px;
		flex: 0 0 30px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: ${(props) => scoreToneFor(props.$tone).accent};
		color: #ffffff;
		box-shadow: inset 0 1px rgba(255, 255, 255, 0.24);
	}

	.score-label {
		position: relative;
		z-index: 1;
		grid-area: label;
		min-width: 0;
		color: inherit;
		font-size: 0.8rem;
		font-weight: 950;
		line-height: 1.25;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	strong {
		position: relative;
		z-index: 1;
		grid-area: value;
		min-width: 0;
		color: inherit;
		font-size: clamp(1.05rem, 1.22vw, 1.48rem);
		font-weight: 950;
		line-height: 1.08;
		letter-spacing: 0;
		overflow-wrap: anywhere;
	}
`;

const ChartsGrid = styled.section`
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 12px;
`;

const ChartPanel = styled.section`
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	border: 1px solid #d5e2f0;
	border-radius: 8px;
	background: #ffffff;
	padding: 10px;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.055);

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 4px;
	}

	h4 {
		margin: 0;
		color: #0f2b46;
		font-size: 0.94rem;
		font-weight: 950;
	}

	header span {
		color: #64748b;
		font-size: 0.76rem;
		font-weight: 850;
	}
`;

const EmptyBlock = styled.div`
	min-height: 180px;
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	color: #64748b;
	font-weight: 900;
`;

const TableShell = styled.div`
	min-width: 0;
	max-width: 100%;
	border: 1px solid #d5e2f0;
	border-radius: 8px;
	background: #ffffff;
	overflow: hidden;

	.profit-report-table .ant-table {
		font-size: 0.68rem;
	}

	.profit-report-table .ant-table-thead > tr > th {
		background: linear-gradient(180deg, #173a5f 0%, #102a43 100%);
		color: #fff;
		text-align: center;
		font-weight: 950;
		white-space: normal;
		padding: 7px 3px !important;
		line-height: 1.25;
	}

	.profit-report-table .ant-table-tbody > tr > td {
		font-weight: 760;
		color: #1f2937;
		vertical-align: middle;
		padding: 8px 3px !important;
		text-align: center;
	}

	.profit-table-text {
		display: inline-block;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		vertical-align: middle;
	}

	.ant-table-cell-fix-left,
	.ant-table-cell-fix-right {
		background: #ffffff;
		z-index: 3;
		box-shadow: 0 0 0 1px rgba(213, 226, 240, 0.75);
	}

	.profit-details-action-cell {
		min-width: 104px;
	}

	.profit-details-button {
		min-width: 94px;
		height: 25px;
		padding-inline: 6px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		white-space: nowrap;
	}
`;

const ProfitValue = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 80px;
	min-height: 27px;
	padding: 3px 5px;
	border-radius: 6px;
	background: ${(props) => (props.$negative ? "#fee2e2" : "#dcfce7")};
	color: ${(props) => (props.$negative ? "#b91c1c" : "#166534")};
	border: 1px solid ${(props) => (props.$negative ? "#fecaca" : "#86efac")};
	font-weight: 950;
	white-space: nowrap;
`;

const PagerBar = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
	padding: 8px 2px 0;

	span {
		color: #334155;
		font-weight: 850;
	}

	@media (max-width: 640px) {
		justify-content: center;
	}
`;

const DetailsLoading = styled.div`
	min-height: 360px;
	display: flex;
	align-items: center;
	justify-content: center;
`;
