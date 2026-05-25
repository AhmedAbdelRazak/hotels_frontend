import React, { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Modal, Select, Spin } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import {
	formatDate,
	formatMoney,
	getReservationNights,
	localizeStatus,
	titleCase,
} from "../overallShared";

const { RangePicker } = DatePicker;

const SUMMARY_TEXT = {
	en: {
		showSummary: "Show Summary",
		title: "Reservations Summary",
		subtitle: "Aggregated view for the current filtered reservation table.",
		filtersApplied: "Filters applied",
		groupDateBy: "Group date table by",
		summaryHotel: "Summary hotel",
		summaryDateRange: "Summary date range",
		fromDate: "From date",
		toDate: "To date",
		exportReport: "Export report",
		exportingReport: "Exporting...",
		byDate: "Summary by date",
		bySource: "Summary by booking source",
		byStatus: "Summary by status",
		byRoomType: "Summary by room type",
		date: "Date",
		bookingSource: "Booking source",
		roomType: "Room type",
		reservationCount: "Reservation count",
		roomCount: "Room count",
		totalAmount: "Total amount",
		paidAmount: "Paid amount",
		commissions: "Commissions",
		allHotels: "All hotels",
		allStatuses: "All statuses",
		search: "Search",
		noSearch: "No search",
		dateRange: "Date range",
		allDates: "All dates",
		to: "to",
		sortedBy: "Sorted by",
		generatedAt: "Generated at",
		filteredReservations: "Filtered reservations",
		noData: "No summary data.",
		noDate: "No date",
		noSource: "No source",
		noStatus: "No status",
		noRoomType: "No room type",
		overview: "Report overview",
		filter: "Filter",
		value: "Value",
	},
	ar: {
		showSummary: "Show Summary",
		title: "ملخص الحجوزات",
		subtitle: "ملخص تجميعي حسب الفلاتر الحالية في جدول الحجوزات.",
		filtersApplied: "الفلاتر المطبقة",
		groupDateBy: "تجميع جدول التاريخ حسب",
		exportReport: "تصدير التقرير",
		exportingReport: "جاري التصدير...",
		byDate: "ملخص حسب التاريخ",
		bySource: "ملخص حسب مصدر الحجز",
		byStatus: "ملخص حسب الحالة",
		byRoomType: "ملخص حسب نوع الغرفة",
		date: "التاريخ",
		bookingSource: "مصدر الحجز",
		roomType: "نوع الغرفة",
		reservationCount: "عدد الحجوزات",
		roomCount: "عدد الغرف",
		totalAmount: "إجمالي المبلغ",
		paidAmount: "المبلغ المدفوع",
		commissions: "العمولات",
		allHotels: "كل الفنادق",
		allStatuses: "كل الحالات",
		search: "البحث",
		noSearch: "لا يوجد بحث",
		dateRange: "نطاق التاريخ",
		allDates: "كل التواريخ",
		to: "إلى",
		sortedBy: "الترتيب حسب",
		generatedAt: "تاريخ إنشاء التقرير",
		filteredReservations: "الحجوزات المطابقة للفلاتر",
		noData: "لا توجد بيانات للملخص.",
		noDate: "بدون تاريخ",
		noSource: "بدون مصدر",
		noStatus: "بدون حالة",
		noRoomType: "بدون نوع غرفة",
		overview: "نظرة عامة على التقرير",
		filter: "الفلتر",
		value: "القيمة",
	},
};

export const summaryText = (chosenLanguage) =>
	SUMMARY_TEXT[chosenLanguage === "Arabic" ? "ar" : "en"];

export const summaryDateOptions = (labels = {}) => [
	{ value: "createdAt", label: labels.creationDate || "Creation Date" },
	{ value: "checkin_date", label: labels.checkinDate || "Checkin Date" },
	{ value: "checkout_date", label: labels.checkoutDate || "Checkout Date" },
];

const numberValue = (value) => {
	if (value === null || value === undefined || value === "") return 0;
	const parsed = Number(String(value).replace(/,/g, ""));
	return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value) => Math.round(numberValue(value) * 100) / 100;

const normalizeValueId = (value) => String(value?._id || value?.id || value || "");

const toDayjsValue = (value = "") => {
	if (!value) return null;
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed : null;
};

const dateFieldValue = (reservation = {}, dateBy = "createdAt") => {
	if (dateBy === "checkin_date") return reservation.checkin_date;
	if (dateBy === "checkout_date") return reservation.checkout_date;
	return reservation.createdAt || reservation.booked_at;
};

const dateKey = (reservation = {}, dateBy = "createdAt", text = SUMMARY_TEXT.en) => {
	const formatted = formatDate(dateFieldValue(reservation, dateBy), "English");
	return formatted === "-" ? text.noDate : formatted;
};

const reservationCommission = (reservation = {}) =>
	roundMoney(
		reservation.commission ||
			reservation.commision ||
			reservation?.financial_cycle?.commissionAmount ||
			reservation?.commissionData?.commissionAmount ||
			0
	);

const incrementSummary = (
	map,
	key,
	{
		totalAmount = 0,
		paidAmount = 0,
		commission = 0,
		reservationCount = 1,
		roomCount = 0,
	} = {}
) => {
	const previous = map.get(key) || {
		key,
		reservationCount: 0,
		roomCount: 0,
		totalAmount: 0,
		paidAmount: 0,
		commissions: 0,
	};
	previous.reservationCount += reservationCount;
	previous.roomCount += roomCount;
	previous.totalAmount = roundMoney(previous.totalAmount + totalAmount);
	previous.paidAmount = roundMoney(previous.paidAmount + paidAmount);
	previous.commissions = roundMoney(previous.commissions + commission);
	map.set(key, previous);
};

const sortedRows = (map, sortByKey = false) =>
	Array.from(map.values()).sort((first, second) => {
		if (sortByKey) return String(first.key).localeCompare(String(second.key));
		const amountDelta =
			numberValue(second.totalAmount) - numberValue(first.totalAmount);
		if (amountDelta) return amountDelta;
		return String(first.key).localeCompare(String(second.key));
	});

const roomLineLabel = (line = {}, text = SUMMARY_TEXT.en) =>
	String(
		line.displayName ||
			line.display_name ||
			line.roomDisplayName ||
			line.room_type ||
			line.roomType ||
			line.displayName_OtherLanguage ||
			""
	).trim() || text.noRoomType;

const roomLinesForReservation = (reservation = {}) => {
	const pickedRoomsType = Array.isArray(reservation.pickedRoomsType)
		? reservation.pickedRoomsType
		: [];
	if (pickedRoomsType.length) return pickedRoomsType;

	const pickedRoomsPricing = Array.isArray(reservation.pickedRoomsPricing)
		? reservation.pickedRoomsPricing
		: [];
	if (pickedRoomsPricing.length) return pickedRoomsPricing;

	const roomDetails = Array.isArray(reservation.roomDetails)
		? reservation.roomDetails
		: [];
	return roomDetails.map((room) => ({
		room_type: room.room_type || room.roomType,
		displayName: room.display_name || room.displayName || room.room_type,
		count: 1,
	}));
};

const lineAmount = (line = {}, nights = 1) => {
	if (Array.isArray(line.pricingByDay) && line.pricingByDay.length) {
		return line.pricingByDay.reduce(
			(total, day) =>
				total +
				numberValue(
					day.totalPriceWithCommission ||
						day.total ||
						day.price ||
						day.rootPrice ||
						0
				),
			0
		);
	}
	return numberValue(line.total || line.chosenTotal || line.chosenPrice) *
		Math.max(nights, 1);
};

const buildRoomTypeRows = (reservations = [], text = SUMMARY_TEXT.en) => {
	const grouped = new Map();

	(Array.isArray(reservations) ? reservations : []).forEach((reservation) => {
		const reservationAmount = roundMoney(reservation.total_amount);
		const paidAmount = roundMoney(reservation.paid_amount);
		const commission = reservationCommission(reservation);
		const lines = roomLinesForReservation(reservation);
		const safeLines = lines.length ? lines : [{ displayName: text.noRoomType, count: 1 }];
		const nights = Math.max(getReservationNights(reservation), 1);
		const lineAmounts = safeLines.map((line) => ({
			line,
			roomCount: Math.max(numberValue(line.count) || 1, 1),
			amount: roundMoney(lineAmount(line, nights)),
		}));
		const totalLineAmount = roundMoney(
			lineAmounts.reduce((total, item) => total + item.amount, 0)
		);
		const totalRoomCount = lineAmounts.reduce(
			(total, item) => total + item.roomCount,
			0
		);
		const seenInReservation = new Set();

		lineAmounts.forEach((item) => {
			const key = roomLineLabel(item.line, text);
			const fallbackShare = totalRoomCount ? item.roomCount / totalRoomCount : 0;
			const amountShare = totalLineAmount ? item.amount / totalLineAmount : fallbackShare;
			incrementSummary(grouped, key, {
				totalAmount: totalLineAmount
					? item.amount
					: reservationAmount * fallbackShare,
				paidAmount: paidAmount * amountShare,
				commission: commission * amountShare,
				reservationCount: seenInReservation.has(key) ? 0 : 1,
				roomCount: item.roomCount,
			});
			seenInReservation.add(key);
		});
	});

	return sortedRows(grouped);
};

export const buildReservationSummary = ({
	reservations = [],
	dateBy = "createdAt",
	chosenLanguage,
}) => {
	const text = summaryText(chosenLanguage);
	const byDate = new Map();
	const bySource = new Map();
	const byStatus = new Map();

	(Array.isArray(reservations) ? reservations : []).forEach((reservation) => {
		const totalAmount = roundMoney(reservation.total_amount);
		const paidAmount = roundMoney(reservation.paid_amount);
		const commission = reservationCommission(reservation);
		incrementSummary(byDate, dateKey(reservation, dateBy, text), {
			totalAmount,
		});
		incrementSummary(
			bySource,
			String(reservation.booking_source || "").trim() || text.noSource,
			{ totalAmount, paidAmount, commission }
		);
		incrementSummary(
			byStatus,
			localizeStatus(
				reservation.reservation_status || reservation.state || text.noStatus,
				chosenLanguage
			) || text.noStatus,
			{ totalAmount, paidAmount, commission }
		);
	});

	const totals = (Array.isArray(reservations) ? reservations : []).reduce(
		(acc, reservation) => ({
			reservationCount: acc.reservationCount + 1,
			totalAmount: roundMoney(acc.totalAmount + roundMoney(reservation.total_amount)),
			paidAmount: roundMoney(acc.paidAmount + roundMoney(reservation.paid_amount)),
			commissions: roundMoney(acc.commissions + reservationCommission(reservation)),
		}),
		{ reservationCount: 0, totalAmount: 0, paidAmount: 0, commissions: 0 }
	);

	return {
		totals,
		dateRows: sortedRows(byDate, true),
		sourceRows: sortedRows(bySource),
		statusRows: sortedRows(byStatus),
		roomTypeRows: buildRoomTypeRows(reservations, text),
	};
};

const hotelFilterLabel = (filters = {}, hotels = [], labels = {}, text = SUMMARY_TEXT.en) => {
	const selected = Array.isArray(filters.hotelId) ? filters.hotelId : [];
	if (!selected.length) return labels.allHotels || text.allHotels;
	const names = selected
		.map((hotelId) => hotels.find((hotel) => String(hotel._id) === String(hotelId)))
		.map((hotel) => titleCase(hotel?.hotelName || ""))
		.filter(Boolean);
	return names.length ? names.join(", ") : `${selected.length} ${labels.hotels || "Hotels"}`;
};

const statusFilterLabel = (filters = {}, labels = {}, text = SUMMARY_TEXT.en) => {
	const selected = Array.isArray(filters.status) ? filters.status : [];
	if (!selected.length) return labels.allStatuses || text.allStatuses;
	return selected
		.map((status) => localizeStatus(status, labels.chosenLanguage) || status)
		.join(", ");
};

const dateByLabel = (dateBy = "createdAt", labels = {}) =>
	(summaryDateOptions(labels).find((option) => option.value === dateBy) || {})
		.label || dateBy;

const reservationMatchesSummaryDateRange = (
	reservation = {},
	dateBy = "createdAt",
	dateRange = {}
) => {
	if (!dateRange?.from && !dateRange?.to) return true;
	const date = toDayjsValue(dateFieldValue(reservation, dateBy));
	if (!date) return false;
	if (dateRange.from && date.isBefore(dayjs(dateRange.from), "day")) {
		return false;
	}
	if (dateRange.to && date.isAfter(dayjs(dateRange.to), "day")) {
		return false;
	}
	return true;
};

const reservationMatchesSummaryHotel = (reservation = {}, hotelId = "") => {
	if (!hotelId) return true;
	return normalizeValueId(reservation.hotelId) === normalizeValueId(hotelId);
};

const summaryHotelOptions = (hotels = [], reservations = [], text = SUMMARY_TEXT.en) => {
	const options = new Map();
	(Array.isArray(hotels) ? hotels : []).forEach((hotel) => {
		const hotelId = normalizeValueId(hotel);
		if (!hotelId) return;
		options.set(hotelId, titleCase(hotel.hotelName || hotel.name || ""));
	});
	(Array.isArray(reservations) ? reservations : []).forEach((reservation) => {
		const hotelId = normalizeValueId(reservation.hotelId);
		if (!hotelId || options.has(hotelId)) return;
		options.set(
			hotelId,
			titleCase(reservation.hotelName || reservation.hotel?.hotelName || "")
		);
	});
	return [
		{ value: "", label: text.allHotels },
		...Array.from(options.entries()).map(([value, label]) => ({
			value,
			label: label || value,
		})),
	];
};

export const buildSummaryFilterRows = ({
	filters = {},
	hotels = [],
	labels = {},
	chosenLanguage,
	totalReservations = 0,
}) => {
	const text = summaryText(chosenLanguage);
	const range =
		filters.dateFrom || filters.dateTo
			? `${filters.dateFrom || text.allDates} ${text.to} ${
					filters.dateTo || text.allDates
			  }`
			: text.allDates;
	return [
		{ [text.filter]: labels.hotels || "Hotels", [text.value]: hotelFilterLabel(filters, hotels, labels, text) },
		{ [text.filter]: labels.status || "Status", [text.value]: statusFilterLabel(filters, { ...labels, chosenLanguage }, text) },
		{ [text.filter]: text.dateRange, [text.value]: `${dateByLabel(filters.dateBy, labels)}: ${range}` },
		{ [text.filter]: text.search, [text.value]: filters.search || text.noSearch },
		{
			[text.filter]: text.sortedBy,
			[text.value]: `${dateByLabel(filters.sortBy, labels) || filters.sortBy || "-"} ${
				filters.sortOrder || ""
			}`.trim(),
		},
		{ [text.filter]: text.filteredReservations, [text.value]: totalReservations },
		{ [text.filter]: text.generatedAt, [text.value]: new Date().toLocaleString() },
	];
};

const tableRows = ({ rows = [], type, text, labels }) =>
	rows.map((row) => {
		const base = {
			[type]: row.key,
			[text.reservationCount]: row.reservationCount,
			[text.totalAmount]: row.totalAmount,
		};
		if (row.roomCount) base[text.roomCount] = row.roomCount;
		if (type !== text.date) {
			base[text.paidAmount] = row.paidAmount;
			base[text.commissions] = row.commissions;
		}
		return base;
	});

const safeFileSegment = (value = "reservation-summary") =>
	String(value || "reservation-summary")
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.toLowerCase()
		.slice(0, 80) || "reservation-summary";

const safeSheetName = (value = "Sheet") =>
	String(value || "Sheet")
		.replace(/[\\/?*[\]:]/g, " ")
		.slice(0, 31) || "Sheet";

const loadStyledXlsx = async () => {
	const xlsxModule = await import("xlsx-js-style");
	return xlsxModule.default || xlsxModule["module.exports"] || xlsxModule;
};

const columnWidth = (key, rows = []) => {
	const contentWidth = rows.reduce((max, row) => {
		const value = row?.[key];
		return Math.max(max, String(value ?? "").length + 3);
	}, String(key || "").length + 4);
	return Math.min(Math.max(contentWidth, 12), 32);
};

const appendJsonSheet = (XLSX, workbook, rows, sheetName, emptyText) => {
	const safeRows = Array.isArray(rows) && rows.length ? rows : [{ Message: emptyText }];
	const worksheet = XLSX.utils.json_to_sheet(safeRows);
	const headers = Object.keys(safeRows[0] || {});
	worksheet["!cols"] = headers.map((key) => ({ wch: columnWidth(key, safeRows) }));
	if (worksheet["!ref"]) {
		const range = XLSX.utils.decode_range(worksheet["!ref"]);
		worksheet["!autofilter"] = { ref: worksheet["!ref"] };
		worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
		worksheet["!rows"] = Array.from({ length: range.e.r + 1 }, (_, index) => ({
			hpt: index === 0 ? 30 : 25,
		}));
		for (let column = range.s.c; column <= range.e.c; column += 1) {
			const address = XLSX.utils.encode_cell({ r: 0, c: column });
			if (!worksheet[address]) continue;
			worksheet[address].s = {
				fill: { patternType: "solid", fgColor: { rgb: "D9EAF7" } },
				font: { bold: true, color: { rgb: "0F2842" } },
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
					alignment: { vertical: "top", wrapText: true },
					border: { bottom: { style: "thin", color: { rgb: "E5E7EB" } } },
				};
				if (worksheet[address].t === "n") worksheet[address].z = "#,##0.00";
			}
		}
	}
	XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(sheetName));
};

export const exportReservationSummaryWorkbook = async ({
	reservations = [],
	dateBy = "createdAt",
	filters = {},
	hotels = [],
	labels = {},
	chosenLanguage,
	filePrefix = "overall-reservation-summary",
}) => {
	const text = summaryText(chosenLanguage);
	const summary = buildReservationSummary({ reservations, dateBy, chosenLanguage });
	const XLSX = await loadStyledXlsx();
	const workbook = XLSX.utils.book_new();
	appendJsonSheet(
		XLSX,
		workbook,
		buildSummaryFilterRows({
			filters,
			hotels,
			labels,
			chosenLanguage,
			totalReservations: summary.totals.reservationCount,
		}),
		text.overview,
		text.noData
	);
	appendJsonSheet(
		XLSX,
		workbook,
		tableRows({ rows: summary.dateRows, type: text.date, text, labels }),
		text.byDate,
		text.noData
	);
	appendJsonSheet(
		XLSX,
		workbook,
		tableRows({ rows: summary.sourceRows, type: text.bookingSource, text, labels }),
		text.bySource,
		text.noData
	);
	appendJsonSheet(
		XLSX,
		workbook,
		tableRows({ rows: summary.statusRows, type: labels.status || "Status", text, labels }),
		text.byStatus,
		text.noData
	);
	appendJsonSheet(
		XLSX,
		workbook,
		tableRows({ rows: summary.roomTypeRows, type: text.roomType, text, labels }),
		text.byRoomType,
		text.noData
	);
	const fileDate = new Date().toISOString().slice(0, 10);
	XLSX.writeFile(workbook, `${safeFileSegment(filePrefix)}-${fileDate}.xlsx`, {
		cellStyles: true,
	});
};

const MoneyCell = ({ value, labels }) => (
	<span className='money-cell'>
		{formatMoney(value)} {labels.sar}
	</span>
);

const SummaryTable = ({ title, typeLabel, rows, text, labels, showRoomCount = false, showFinancials = true }) => (
	<section className='summary-section'>
		<h3>{title}</h3>
		<div className='summary-table-scroll'>
			<table>
				<thead>
					<tr>
						<th>{typeLabel}</th>
						<th>{text.reservationCount}</th>
						{showRoomCount ? <th>{text.roomCount}</th> : null}
						<th>{text.totalAmount}</th>
						{showFinancials ? <th>{text.paidAmount}</th> : null}
						{showFinancials ? <th>{text.commissions}</th> : null}
					</tr>
				</thead>
				<tbody>
					{rows.length ? (
						rows.map((row) => (
							<tr key={row.key}>
								<td dir='auto'>{row.key}</td>
								<td>{row.reservationCount}</td>
								{showRoomCount ? <td>{row.roomCount}</td> : null}
								<td>
									<MoneyCell value={row.totalAmount} labels={labels} />
								</td>
								{showFinancials ? (
									<td>
										<MoneyCell value={row.paidAmount} labels={labels} />
									</td>
								) : null}
								{showFinancials ? (
									<td>
										<MoneyCell value={row.commissions} labels={labels} />
									</td>
								) : null}
							</tr>
						))
					) : (
						<tr>
							<td colSpan={showFinancials ? (showRoomCount ? 6 : 5) : 3}>
								{text.noData}
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	</section>
);

const ReservationSummaryModal = ({
	open,
	onClose,
	reservations = [],
	loading = false,
	exporting = false,
	filters = {},
	hotels = [],
	labels = {},
	chosenLanguage,
	summaryDateBy = "createdAt",
	onSummaryDateByChange,
	onExport,
}) => {
	const isRTL = chosenLanguage === "Arabic";
	const text = summaryText(chosenLanguage);
	const modalText = useMemo(
		() => ({
			...text,
			summaryHotel:
				text.summaryHotel ||
				(isRTL ? "\u0641\u0646\u062f\u0642\u0020\u0627\u0644\u0645\u0644\u062e\u0635" : "Summary hotel"),
			summaryDateRange:
				text.summaryDateRange ||
				(isRTL
					? "\u0646\u0637\u0627\u0642\u0020\u062a\u0627\u0631\u064a\u062e\u0020\u0627\u0644\u0645\u0644\u062e\u0635"
					: "Summary date range"),
			fromDate:
				text.fromDate || (isRTL ? "\u0645\u0646\u0020\u062a\u0627\u0631\u064a\u062e" : "From date"),
			toDate:
				text.toDate || (isRTL ? "\u0625\u0644\u0649\u0020\u062a\u0627\u0631\u064a\u062e" : "To date"),
		}),
		[isRTL, text]
	);
	const [summaryHotelId, setSummaryHotelId] = useState("");
	const [summaryDateRange, setSummaryDateRange] = useState({
		from: "",
		to: "",
	});

	useEffect(() => {
		if (!open) return;
		const selectedHotels = Array.isArray(filters.hotelId) ? filters.hotelId : [];
		setSummaryHotelId(selectedHotels.length === 1 ? selectedHotels[0] : "");
		setSummaryDateRange({
			from: filters.dateFrom || "",
			to: filters.dateTo || "",
		});
	}, [filters.dateFrom, filters.dateTo, filters.hotelId, open]);

	const modalHotelOptions = useMemo(
		() => summaryHotelOptions(hotels, reservations, modalText),
		[hotels, modalText, reservations]
	);
	const filteredReservations = useMemo(
		() =>
			(Array.isArray(reservations) ? reservations : []).filter(
				(reservation) =>
					reservationMatchesSummaryHotel(reservation, summaryHotelId) &&
					reservationMatchesSummaryDateRange(
						reservation,
						summaryDateBy,
						summaryDateRange
					)
			),
		[reservations, summaryDateBy, summaryDateRange, summaryHotelId]
	);
	const appliedSummaryFilters = useMemo(
		() => ({
			...filters,
			hotelId: summaryHotelId
				? [summaryHotelId]
				: Array.isArray(filters.hotelId)
				  ? filters.hotelId
				  : [],
			dateBy: summaryDateBy,
			dateFrom: summaryDateRange.from,
			dateTo: summaryDateRange.to,
		}),
		[filters, summaryDateBy, summaryDateRange.from, summaryDateRange.to, summaryHotelId]
	);
	const summary = useMemo(
		() =>
			buildReservationSummary({
				reservations: filteredReservations,
				dateBy: summaryDateBy,
				chosenLanguage,
			}),
		[chosenLanguage, filteredReservations, summaryDateBy]
	);
	const filterRows = useMemo(
		() =>
			buildSummaryFilterRows({
				filters: appliedSummaryFilters,
				hotels,
				labels,
				chosenLanguage,
				totalReservations: summary.totals.reservationCount,
			}),
		[
			appliedSummaryFilters,
			chosenLanguage,
			hotels,
			labels,
			summary.totals.reservationCount,
		]
	);
	const rangePickerValue =
		summaryDateRange.from || summaryDateRange.to
			? [
					toDayjsValue(summaryDateRange.from),
					toDayjsValue(summaryDateRange.to),
			  ]
			: null;
	const exportVisibleSummary = () =>
		onExport?.({
			reservations: filteredReservations,
			dateBy: summaryDateBy,
			filters: appliedSummaryFilters,
		});

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			width={1180}
			centered
			destroyOnClose={false}
			title={null}
		>
			<SummaryModalBody $isRTL={isRTL}>
				<div className='summary-header'>
					<div>
						<h2>{text.title}</h2>
						<p>{text.subtitle}</p>
					</div>
					<Button
						type='primary'
						icon={<FileExcelOutlined />}
						onClick={exportVisibleSummary}
						disabled={loading || exporting || !filteredReservations.length}
					>
						{exporting ? text.exportingReport : text.exportReport}
					</Button>
				</div>

				<div className='filter-panel'>
					<strong>{text.filtersApplied}</strong>
					<div className='filter-chip-grid'>
						{filterRows.map((row) => (
							<span key={row[text.filter]} className='filter-chip'>
								<b>{row[text.filter]}</b>
								<em dir='auto'>{row[text.value]}</em>
							</span>
						))}
					</div>
				</div>

				<div className='summary-toolbar'>
					<label>
						<span>{text.groupDateBy}</span>
						<Select
							value={summaryDateBy}
							onChange={onSummaryDateByChange}
							options={summaryDateOptions(labels)}
							className='summary-date-select'
							direction={isRTL ? "rtl" : "ltr"}
							popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
						/>
					</label>
					<label>
						<span>{modalText.summaryDateRange}</span>
						<RangePicker
							allowClear
							format='YYYY-MM-DD'
							value={rangePickerValue}
							placeholder={[modalText.fromDate, modalText.toDate]}
							onChange={(_, dateStrings) =>
								setSummaryDateRange({
									from: dateStrings?.[0] || "",
									to: dateStrings?.[1] || "",
								})
							}
							className='summary-date-range'
							inputReadOnly
							getPopupContainer={() => document.body}
							popupStyle={{ zIndex: 2600 }}
						/>
					</label>
					<label>
						<span>{modalText.summaryHotel}</span>
						<Select
							value={summaryHotelId}
							onChange={(value) => setSummaryHotelId(value || "")}
							options={modalHotelOptions}
							className='summary-hotel-select'
							direction={isRTL ? "rtl" : "ltr"}
							showSearch
							optionFilterProp='label'
							popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
						/>
					</label>
				</div>

				{loading ? (
					<div className='summary-loading'>
						<Spin />
					</div>
				) : (
					<div className='summary-grid'>
						<SummaryTable
							title={text.byDate}
							typeLabel={text.date}
							rows={summary.dateRows}
							text={text}
							labels={labels}
							showFinancials={false}
						/>
						<SummaryTable
							title={text.bySource}
							typeLabel={text.bookingSource}
							rows={summary.sourceRows}
							text={text}
							labels={labels}
						/>
						<SummaryTable
							title={text.byStatus}
							typeLabel={labels.status || "Status"}
							rows={summary.statusRows}
							text={text}
							labels={labels}
						/>
						<SummaryTable
							title={text.byRoomType}
							typeLabel={text.roomType}
							rows={summary.roomTypeRows}
							text={text}
							labels={labels}
							showRoomCount
						/>
					</div>
				)}
			</SummaryModalBody>
		</Modal>
	);
};

export default ReservationSummaryModal;

const SummaryModalBody = styled.div`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	display: grid;
	gap: 0.9rem;
	font-family: ${(props) =>
		props.$isRTL
			? `"Droid Arabic Kufi", "Tajawal", "Cairo", "Noto Kufi Arabic", "Segoe UI", Tahoma, Arial, sans-serif`
			: `"Inter", "Segoe UI", Arial, sans-serif`};

	.summary-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.85rem;
		padding-block-end: 0.65rem;
		border-bottom: 1px solid #e6ecf4;
	}

	h2,
	h3,
	p {
		margin: 0;
	}

	h2 {
		color: #172033;
		font-size: 1.25rem;
		font-weight: 950;
		line-height: 1.35;
	}

	p {
		margin-top: 0.22rem;
		color: #667085;
		font-size: 0.84rem;
		font-weight: 800;
		line-height: 1.45;
	}

	.filter-panel {
		display: grid;
		gap: 0.6rem;
		padding: 0.78rem;
		border: 1px solid #dbe7f4;
		background: #f8fbff;
	}

	.filter-panel > strong {
		color: #172033;
		font-size: 0.86rem;
		font-weight: 950;
	}

	.filter-chip-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.5rem;
	}

	.filter-chip {
		display: grid;
		gap: 0.16rem;
		min-width: 0;
		padding: 0.5rem 0.58rem;
		border: 1px solid #d8e4f2;
		background: #ffffff;
	}

	.filter-chip b {
		color: #35516d;
		font-size: 0.7rem;
		font-weight: 950;
	}

	.filter-chip em {
		color: #101828;
		font-size: 0.78rem;
		font-style: normal;
		font-weight: 900;
		overflow-wrap: anywhere;
	}

	.summary-toolbar {
		display: grid;
		grid-template-columns: repeat(3, minmax(180px, 1fr));
		gap: 0.65rem;
		align-items: end;
	}

	.summary-toolbar label {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.55rem;
		margin: 0;
		color: #344054;
		font-size: 0.78rem;
		font-weight: 950;
	}

	.summary-date-select,
	.summary-date-range,
	.summary-hotel-select {
		min-width: 0;
		width: 100%;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.8rem;
	}

	.summary-section {
		min-width: 0;
		border: 1px solid #e5edf6;
		background: #ffffff;
	}

	.summary-section h3 {
		padding: 0.62rem 0.72rem;
		border-bottom: 1px solid #dbe7f4;
		background: linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%);
		color: #102033;
		font-size: 0.88rem;
		font-weight: 950;
		line-height: 1.35;
	}

	.summary-table-scroll {
		max-height: 290px;
		overflow: auto;
	}

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		min-width: 520px;
	}

	th,
	td {
		padding: 0.48rem 0.55rem;
		border-bottom: 1px solid #edf2f7;
		border-inline-end: 1px solid #edf2f7;
		color: #101828;
		font-size: 0.75rem;
		font-weight: 850;
		text-align: start;
		vertical-align: middle;
		white-space: nowrap;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: #d9eaf7;
		color: #0f2842;
		font-weight: 950;
	}

	td:not(:first-child),
	th:not(:first-child) {
		text-align: center;
	}

	.money-cell {
		direction: ltr;
		font-weight: 950;
	}

	.summary-loading {
		display: grid;
		place-items: center;
		min-height: 260px;
		border: 1px solid #e5edf6;
		background: #ffffff;
	}

	@media (max-width: 860px) {
		.summary-header {
			display: grid;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}

		.summary-toolbar {
			grid-template-columns: 1fr;
		}

		.summary-toolbar label {
			width: 100%;
			grid-template-columns: 1fr;
		}
	}
`;
