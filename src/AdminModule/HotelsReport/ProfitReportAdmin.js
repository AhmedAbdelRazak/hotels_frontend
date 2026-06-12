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
		platformMargin: "Platform margin",
		otaExpense: "OTA expenses",
		profitMargin: "Profit margin",
		profitRate: "Profit rate",
		bookingSourceBreakdown: "Profit by booking source",
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
		platformMargin:
			"\u0647\u0627\u0645\u0634 \u0627\u0644\u0645\u0646\u0635\u0629",
		otaExpense:
			"\u0645\u0635\u0627\u0631\u064a\u0641 \u0627\u0644\u0645\u0646\u0635\u0627\u062a",
		profitMargin: "\u0647\u0627\u0645\u0634 \u0627\u0644\u0631\u0628\u062d",
		profitRate: "\u0646\u0633\u0628\u0629 \u0627\u0644\u0631\u0628\u062d",
		bookingSourceBreakdown:
			"\u0627\u0644\u0631\u0628\u062d \u062d\u0633\u0628 \u0627\u0644\u0645\u0635\u062f\u0631",
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
			[labels.platformMargin]: safeNumber(metrics.platformMargin),
			[labels.otaExpense]: safeNumber(metrics.otaExpense),
			[labels.profitMargin]: safeNumber(metrics.profitMargin),
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
			key: "platform",
			label: labels.platformMargin,
			value: moneyText(scorecards.platformMargin, labels),
			tone: "green",
			icon: <DollarCircleOutlined />,
		},
		{
			key: "profit",
			label: labels.profitMargin,
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
		{
			key: "ota",
			label: labels.otaExpense,
			value: moneyText(scorecards.otaExpense, labels),
			tone: "rose",
			icon: <DollarCircleOutlined />,
		},
	];

	const activeTimeline = Array.isArray(report.timeline?.[filters.granularity])
		? report.timeline[filters.granularity]
		: [];
	const timelineCategories = activeTimeline.map((row) => row.groupKey);
	const timelineOptions = {
		chart: {
			id: "admin-profit-timeline",
			toolbar: { show: false },
			fontFamily: isArabic
				? '"Droid Arabic Kufi", "Tajawal", Arial, sans-serif'
				: '"Inter", "Segoe UI", Arial, sans-serif',
		},
		colors: ["#059669", "#2563eb", "#475569", "#f59e0b"],
		dataLabels: { enabled: false },
		stroke: { curve: "smooth", width: [3, 2, 2, 2] },
		fill: { opacity: [0.18, 0.08, 0.08, 0.08] },
		grid: { borderColor: "#e2e8f0" },
		xaxis: {
			categories: timelineCategories,
			labels: { rotate: -35, trim: true },
		},
		yaxis: {
			labels: {
				formatter: (value) => formatMoney(value),
			},
		},
		tooltip: {
			y: {
				formatter: (value) => moneyText(value, labels),
			},
		},
		legend: { position: "top", horizontalAlign: isArabic ? "right" : "left" },
	};
	const timelineSeries = [
		{
			name: labels.profitMargin,
			data: activeTimeline.map((row) => safeNumber(row.profitMargin)),
		},
		{
			name: labels.clientPaid,
			data: activeTimeline.map((row) => safeNumber(row.clientTotal)),
		},
		{
			name: labels.hotelTotal,
			data: activeTimeline.map((row) => safeNumber(row.hotelTotal)),
		},
		{
			name: labels.commission,
			data: activeTimeline.map((row) => safeNumber(row.commission)),
		},
	];

	const bookingSourceRows = (Array.isArray(report.bookingSources)
		? report.bookingSources
		: []
	).slice(0, 14);
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
				barHeight: "62%",
			},
		},
		colors: ["#0f766e"],
		dataLabels: { enabled: false },
		grid: { borderColor: "#e2e8f0" },
		xaxis: {
			categories: bookingSourceRows.map((row) => row.source || "Unknown"),
			labels: { formatter: (value) => formatMoney(value) },
		},
		tooltip: {
			y: {
				formatter: (value) => moneyText(value, labels),
			},
		},
	};
	const sourceSeries = [
		{
			name: labels.profitMargin,
			data: bookingSourceRows.map((row) => safeNumber(row.profitMargin)),
		},
	];

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

	const columns = [
		{
			title: "#",
			width: 58,
			render: (_value, _row, index) => (page - 1) * PAGE_SIZE + index + 1,
		},
		{
			title: labels.fullName,
			width: 190,
			render: (_value, row) => (
				<DetailText value={fullNameForReservation(row)} max={26} />
			),
		},
		{
			title: dateByLabel,
			width: 130,
			render: (_value, row) =>
				formatDate(profitMetricsForReservation(row).reportDate),
		},
		{
			title: labels.confirmation,
			width: 165,
			render: (_value, row) => (
				<DetailText value={row.confirmation_number || ""} max={20} />
			),
		},
		{
			title: labels.checkIn,
			width: 120,
			render: (_value, row) => formatDate(row.checkin_date),
		},
		{
			title: labels.checkOut,
			width: 120,
			render: (_value, row) => formatDate(row.checkout_date),
		},
		{
			title: labels.hotel,
			width: 220,
			render: (_value, row) => (
				<DetailText value={hotelNameForReservation(row)} max={30} />
			),
		},
		{
			title: labels.source,
			width: 150,
			render: (_value, row) => (
				<DetailText value={row.booking_source || ""} max={20} />
			),
		},
		{
			title: labels.clientPaid,
			width: 150,
			align: "center",
			render: (_value, row) =>
				moneyText(profitMetricsForReservation(row).clientTotal, labels),
		},
		{
			title: labels.hotelTotal,
			width: 150,
			align: "center",
			render: (_value, row) =>
				moneyText(profitMetricsForReservation(row).hotelTotal, labels),
		},
		{
			title: labels.commission,
			width: 130,
			align: "center",
			render: (_value, row) =>
				moneyText(profitMetricsForReservation(row).commission, labels),
		},
		{
			title: labels.profitMargin,
			width: 150,
			align: "center",
			render: (_value, row) => {
				const value = profitMetricsForReservation(row).profitMargin;
				return (
					<ProfitValue $negative={safeNumber(value) < 0}>
						{moneyText(value, labels)}
					</ProfitValue>
				);
			},
		},
		{
			title: labels.profitRate,
			width: 120,
			align: "center",
			render: (_value, row) => (
				<ProfitValue
					$negative={safeNumber(profitMetricsForReservation(row).profitRate) < 0}
				>
					{formatPercent(profitMetricsForReservation(row).profitRate)}
				</ProfitValue>
			),
		},
		{
			title: labels.details,
			width: 130,
			align: "center",
			fixed: "right",
			render: (_value, row) => (
				<Button
					type='primary'
					size='small'
					icon={<EyeOutlined />}
					onClick={() => loadDetails(row)}
				>
					{labels.showDetails}
				</Button>
			),
		},
	];

	return (
		<ProfitReportWrapper dir={isArabic ? "rtl" : "ltr"} $isRTL={isArabic}>
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
						<ScoreTile key={card.key} className={`tone-${card.tone}`}>
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
							<Chart
								options={timelineOptions}
								series={timelineSeries}
								type='area'
								height={340}
							/>
						) : (
							<EmptyBlock>{labels.noData}</EmptyBlock>
						)}
					</ChartPanel>

					<ChartPanel>
						<header>
							<h4>{labels.bookingSourceBreakdown}</h4>
						</header>
						{bookingSourceRows.length ? (
							<Chart
								options={sourceOptions}
								series={sourceSeries}
								type='bar'
								height={340}
							/>
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
						pagination={false}
						scroll={{ x: 1680 }}
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
				width='min(94vw, 1380px)'
				style={{ top: "3%" }}
				destroyOnClose
				zIndex={25000}
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
	width: 100%;
	min-width: 0;
	display: grid;
	gap: 14px;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	font-family: ${(props) =>
		props.$isRTL
			? `"Droid Arabic Kufi", "Tajawal", "Cairo", "Segoe UI", Tahoma, Arial, sans-serif`
			: `"Inter", "Segoe UI", Arial, sans-serif`};

	.ant-btn {
		font-weight: 850;
		border-radius: 7px;
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

const ScoreGrid = styled.section`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 10px;

	@media (max-width: 1160px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 620px) {
		grid-template-columns: 1fr;
	}
`;

const ScoreTile = styled.div`
	min-width: 0;
	min-height: 108px;
	display: grid;
	grid-template-columns: auto 1fr;
	grid-template-areas:
		"icon label"
		"value value";
	align-items: center;
	gap: 8px 10px;
	padding: 12px;
	border: 1px solid #d6e3f3;
	border-radius: 8px;
	background: #ffffff;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);

	.score-icon {
		grid-area: icon;
		width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: #e0f2fe;
		color: #075985;
	}

	.score-label {
		grid-area: label;
		color: #475569;
		font-size: 0.76rem;
		font-weight: 900;
		line-height: 1.25;
	}

	strong {
		grid-area: value;
		min-width: 0;
		color: #0f172a;
		font-size: clamp(1.05rem, 2.1vw, 1.38rem);
		font-weight: 950;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}

	&.tone-green .score-icon,
	&.tone-emerald .score-icon {
		background: #dcfce7;
		color: #166534;
	}

	&.tone-amber .score-icon {
		background: #fef3c7;
		color: #92400e;
	}

	&.tone-rose .score-icon,
	&.tone-red .score-icon {
		background: #ffe4e6;
		color: #9f1239;
	}

	&.tone-indigo .score-icon {
		background: #e0e7ff;
		color: #3730a3;
	}

	&.tone-slate .score-icon {
		background: #e2e8f0;
		color: #334155;
	}

	&.tone-cyan .score-icon {
		background: #cffafe;
		color: #155e75;
	}
`;

const ChartsGrid = styled.section`
	display: grid;
	grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.85fr);
	gap: 12px;

	@media (max-width: 1100px) {
		grid-template-columns: 1fr;
	}
`;

const ChartPanel = styled.section`
	min-width: 0;
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
		font-size: 0.74rem;
	}

	.profit-report-table .ant-table-thead > tr > th {
		background: linear-gradient(180deg, #173a5f 0%, #102a43 100%);
		color: #fff;
		text-align: center;
		font-weight: 950;
		white-space: nowrap;
	}

	.profit-report-table .ant-table-tbody > tr > td {
		font-weight: 760;
		color: #1f2937;
		vertical-align: middle;
	}

	.profit-table-text {
		display: inline-block;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		vertical-align: middle;
	}

	.ant-table-cell-fix-right {
		background: #ffffff;
	}
`;

const ProfitValue = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 92px;
	min-height: 28px;
	padding: 4px 8px;
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
