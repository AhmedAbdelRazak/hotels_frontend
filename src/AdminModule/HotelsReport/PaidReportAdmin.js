import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Button, Input, Modal, Select, Spin, message } from "antd";
import * as XLSX from "xlsx";
import { isAuthenticated } from "../../auth";
import { useCartContext } from "../../cart_context";
import {
	gettingHotelDetailsForAdminAll,
	getPaidBreakdownReportAdmin,
} from "../apiAdmin";
import MoreDetails from "../AllReservation/MoreDetails";
import { getReservationRoomSummary } from "../AllReservation/reservationRoomDetails";
import PaidReportDateControls from "./PaidReportDateControls";
import ReportTotalModeToggle from "./ReportTotalModeToggle";
import {
	DEFAULT_REPORT_TOTAL_MODE,
	REPORT_TOTAL_MODES,
	normalizeReportTotalMode,
} from "./reportTotalMode";
import {
	getPaidReportCurrentMonth,
	getPaidReportCurrentYear,
	resolvePaidReportPeriods,
} from "./paidReportDateFilter";
import { formatSaudiGregorianDate } from "../../utils/saudiDates";

const { Option } = Select;

const breakdownKeys = [
	"paid_online_via_link",
	"paid_at_hotel_cash",
	"paid_at_hotel_card",
	"paid_to_hotel",
	"paid_online_jannatbooking",
	"paid_online_other_platforms",
	"paid_online_via_instapay",
	"paid_no_show",
];

const PREFERRED_PAID_REPORT_HOTEL_ID = "6a40b6a1a6efe70450536038";
const PAID_REPORT_PAGE_LIMIT = 500;
const MAX_PAID_REPORT_PAGES = 100;
const MAX_PAID_REPORT_DOCUMENTS =
	PAID_REPORT_PAGE_LIMIT * MAX_PAID_REPORT_PAGES;

const EMPTY_SCORECARDS = Object.freeze({
	totalAmount: null,
	paidAmount: 0,
	breakdownTotals: {},
	financialCoverage: null,
});

const safeNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value, locale = "en-US") =>
	safeNumber(value).toLocaleString(locale, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const finiteMoneyCentsOrNull = (value) => {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	const cents = Math.round(value * 100);
	return Number.isSafeInteger(cents) ? cents : null;
};

const finiteMoneyOrNull = (value) => {
	const cents = finiteMoneyCentsOrNull(value);
	return cents === null ? null : cents / 100;
};

const reportTotalAmountOrNull = (reservation) => {
	if (reservation?.report_total_available !== true) return null;
	if (String(reservation?.financial_totals_currency || "").toUpperCase() !== "SAR") {
		return null;
	}
	return finiteMoneyOrNull(reservation?.report_total_amount);
};

const formatOptionalMoney = (value, locale, unavailableLabel) =>
	value === null || value === undefined
		? unavailableLabel
		: formatMoney(value, locale);

const nonNegativeIntegerOrNull = (value) => {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
		? value
		: null;
};

const resolveScorecardFinancialCoverage = (
	scorecardPayload,
	expectedScopeCount = null,
) => {
	const metadata = scorecardPayload?.financialMetadata;
	if (!metadata || typeof metadata !== "object") return null;

	const includedCount = nonNegativeIntegerOrNull(
		scorecardPayload?.financialIncludedCount,
	);
	const unavailableCount = nonNegativeIntegerOrNull(metadata.unavailable);
	const foreignCurrencyCount = nonNegativeIntegerOrNull(
		metadata.foreignCurrency,
	);
	const netFallbackCount = nonNegativeIntegerOrNull(metadata.netFallback);
	if (
		includedCount === null ||
		unavailableCount === null ||
		foreignCurrencyCount === null ||
		netFallbackCount === null
	) {
		return null;
	}

	const excludedCount = unavailableCount + foreignCurrencyCount;
	const scopeCount = includedCount + excludedCount;
	if (!Number.isSafeInteger(excludedCount) || !Number.isSafeInteger(scopeCount)) {
		return null;
	}
	if (netFallbackCount > includedCount + foreignCurrencyCount) return null;
	if (expectedScopeCount !== null && scopeCount !== expectedScopeCount) return null;
	return {
		includedCount,
		unavailableCount,
		foreignCurrencyCount,
		excludedCount,
		scopeCount,
		netFallbackCount,
	};
};

const sumMoneyValues = (values) => {
	let totalCents = 0;
	for (const value of values) {
		const cents = finiteMoneyCentsOrNull(value);
		if (cents === null || !Number.isSafeInteger(totalCents + cents)) return null;
		totalCents += cents;
	}
	return totalCents / 100;
};

const responseTotalModesMatch = (payload, rows, expectedMode) => {
	const modeMatches = (mode) =>
		typeof mode === "string" && mode.trim().toLowerCase() === expectedMode;
	return (
		modeMatches(payload?.totalMode) &&
		modeMatches(payload?.scorecards?.totalMode) &&
		rows.every((row) => modeMatches(row?.report_total_mode))
	);
};

const normalizeAppliedDateRanges = (dateRanges) => {
	if (!Array.isArray(dateRanges) || !dateRanges.length) return [];
	return Array.from(
		new Map(
			dateRanges
				.filter((range) => range && typeof range === "object")
				.map((range) => ({
					dateFrom: String(range.dateFrom || "").trim(),
					dateTo: String(range.dateTo || "").trim(),
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

const dateRangesKey = (dateRanges) =>
	normalizeAppliedDateRanges(dateRanges)
		.map((range) => `${range.dateFrom}..${range.dateTo}`)
		.join(",");

const invalidPaidReportPagination = () =>
	new Error("Invalid or excessive paid report pagination metadata");

const validatePaidReportPage = (
	payload,
	requestedPage,
	expectedPagination = null,
) => {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		throw invalidPaidReportPagination();
	}

	const { data, totalDocuments, page, limit } = payload;
	if (
		!Array.isArray(data) ||
		!Number.isSafeInteger(totalDocuments) ||
		totalDocuments < 0 ||
		totalDocuments > MAX_PAID_REPORT_DOCUMENTS ||
		!Number.isSafeInteger(page) ||
		page !== requestedPage ||
		!Number.isSafeInteger(limit) ||
		limit < 1 ||
		limit > PAID_REPORT_PAGE_LIMIT ||
		data.length > limit
	) {
		throw invalidPaidReportPagination();
	}

	const totalPages = Math.max(1, Math.ceil(totalDocuments / limit));
	if (totalPages > MAX_PAID_REPORT_PAGES) {
		throw invalidPaidReportPagination();
	}
	if (
		expectedPagination &&
		(totalDocuments !== expectedPagination.totalDocuments ||
			limit !== expectedPagination.limit ||
			totalPages !== expectedPagination.totalPages)
	) {
		throw invalidPaidReportPagination();
	}

	return { data, totalDocuments, limit, totalPages };
};

const mergePaidReportPages = (pageLists, expectedTotalDocuments) => {
	const reservationsById = new Map();
	pageLists.forEach((pageList) => {
		pageList.forEach((reservation) => {
			const reservationId = String(reservation?._id || "").trim();
			if (!reservationId) throw invalidPaidReportPagination();
			if (!reservationsById.has(reservationId)) {
				reservationsById.set(reservationId, reservation);
			}
		});
	});

	const merged = Array.from(reservationsById.values());
	if (merged.length !== expectedTotalDocuments) {
		throw invalidPaidReportPagination();
	}
	return merged;
};

const createInitialPaidReportDateFilter = (referenceDate = new Date()) => {
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
		dateRanges: resolved.error
			? []
			: normalizeAppliedDateRanges(resolved.dateRanges),
	};
};

const formatDate = (value, locale = "en-US", fallback = "N/A") =>
	formatSaudiGregorianDate(value, {
		language: String(locale).toLowerCase().startsWith("ar")
			? "Arabic"
			: "English",
		month: "long",
		fallback,
	});

const extractHotels = (payload) => {
	if (Array.isArray(payload)) return payload;
	const candidateKeys = ["hotels", "data", "results", "items", "docs", "list"];
	if (payload && typeof payload === "object") {
		for (const key of candidateKeys) {
			if (Array.isArray(payload[key])) return payload[key];
		}
		const firstArray = Object.values(payload).find(Array.isArray);
		if (Array.isArray(firstArray)) return firstArray;
	}
	return [];
};

const sanitizeFileSegment = (value, fallback = "report") => {
	const cleaned = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return cleaned || fallback;
};

const buildWorksheetCols = (rows, headers) =>
	headers.map((header) => {
		const maxCellLength = rows.reduce((maxLen, row) => {
			const currentLen = String(row?.[header] ?? "").length;
			return Math.max(maxLen, currentLen);
		}, String(header || "").length);
		return { wch: Math.min(Math.max(maxCellLength + 2, 12), 48) };
	});

const PaidReportAdmin = () => {
	const { chosenLanguage } = useCartContext();
	const { user, token } = isAuthenticated() || {};
	const reportRequestSequence = useRef(0);
	const mountedRef = useRef(true);
	const [hotels, setHotels] = useState([]);
	const [selectedHotelId, setSelectedHotelId] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [searchBoxValue, setSearchBoxValue] = useState("");
	const [appliedDateFilter, setAppliedDateFilter] = useState(() =>
		createInitialPaidReportDateFilter(),
	);
	const [totalMode, setTotalMode] = useState(DEFAULT_REPORT_TOTAL_MODE);
	const [loading, setLoading] = useState(false);
	const [reservations, setReservations] = useState([]);
	const [scorecards, setScorecards] = useState(EMPTY_SCORECARDS);
	const [detailsVisible, setDetailsVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);

	const isArabic = chosenLanguage === "Arabic";
	const numberLocale = "en-US";
	const labels = useMemo(
		() => ({
			selectHotel: isArabic ? "اختر الفندق" : "Select hotel",
			searchPlaceholder: isArabic
				? "ابحث برقم التأكيد أو الهاتف أو الاسم أو الفندق..."
				: "Search by confirmation, phone, name, or hotel name...",
			search: isArabic ? "بحث" : "Search",
			exportExcel: isArabic ? "تصدير إكسل" : "Export Excel",
			noDataToExport: isArabic
				? "لا توجد بيانات متاحة للتصدير."
				: "No data available to export.",
			emptySelect: isArabic
				? "يرجى اختيار فندق لعرض تقرير المدفوعات."
				: "Select a hotel to view the paid breakdown report.",
			emptyData: isArabic
				? "لا توجد سجلات لبيان الدفع."
				: "No paid breakdown records found.",
			name: isArabic ? "الاسم" : "Name",
			hotel: isArabic ? "الفندق" : "Hotel",
			confirmation: isArabic ? "رقم التأكيد" : "Confirmation #",
			checkin: isArabic ? "تاريخ الوصول" : "Check-in",
			checkout: isArabic ? "تاريخ المغادرة" : "Check-out",
			roomType: isArabic
				? "\u0646\u0648\u0639 \u0627\u0644\u063a\u0631\u0641\u0629"
				: "Room Type",
			roomNumber: isArabic
				? "\u0631\u0642\u0645 \u0627\u0644\u063a\u0631\u0641\u0629"
				: "Room Number",
			source: isArabic ? "\u0645\u0635\u062f\u0631 \u0627\u0644\u062d\u062c\u0632" : "Booking Source",
			breakdown: {
				paid_online_via_link: isArabic
					? "مدفوع أونلاين (رابط الدفع) (ر.س)"
					: "Paid Online (Link) (SAR)",
				paid_at_hotel_cash: isArabic
					? "مدفوع في الفندق (نقداً) (ر.س)"
					: "Paid at Hotel (Cash) (SAR)",
				paid_at_hotel_card: isArabic
					? "مدفوع في الفندق (بطاقة) (ر.س)"
					: "Paid at Hotel (Card) (SAR)",
				paid_to_hotel: isArabic
					? "\u0645\u062f\u0641\u0648\u0639 \u0625\u0644\u0649 \u0627\u0644\u0641\u0646\u062f\u0642 (ر.س)"
					: "Paid To Hotel (SAR)",
				paid_online_jannatbooking: isArabic
					? "مدفوع أونلاين (جنات بوكينغ) (ر.س)"
					: "Paid Online (Jannat Booking) (SAR)",
				paid_online_other_platforms: isArabic
					? "مدفوع أونلاين (منصات أخرى) (ر.س)"
					: "Paid Online (Other Platforms) (SAR)",
				paid_online_via_instapay: isArabic
					? "مدفوع أونلاين (إنستاباي) (ر.س)"
					: "Paid Online (InstaPay) (SAR)",
				paid_no_show: isArabic
					? "مدفوع عدم حضور (ر.س)"
					: "Paid No Show (SAR)",
			},
			paidBreakdown: isArabic ? "تفاصيل الدفع" : "Paid Breakdown",
			breakdownTotalsTitle: isArabic
				? "إجمالي تفاصيل الدفع (ر.س)"
				: "Breakdown Totals (SAR)",
			totalPaid: isArabic ? "إجمالي المدفوع (ر.س)" : "Total Paid (SAR)",
			grossTotal: isArabic ? "الإجمالي (ر.س)" : "Gross Total (SAR)",
			netTotal: isArabic ? "الصافي (ر.س)" : "Net Total (SAR)",
			availableGrossSubtotal: isArabic
				? "المجموع الفرعي الإجمالي المتاح (ر.س)"
				: "Available Gross Subtotal (SAR)",
			availableNetSubtotal: isArabic
				? "المجموع الفرعي الصافي المتاح (ر.س)"
				: "Available Net Subtotal (SAR)",
			financialCoverage: ({
				includedCount,
				scopeCount,
				excludedCount,
				netFallbackCount,
			}) => {
				const fallbackNote = netFallbackCount
					? isArabic
						? ` استُخدم الإجمالي الموثوق بدلاً من الصافي في ${netFallbackCount} حجز.`
						: ` Verified Gross was used when Net was unavailable for ${netFallbackCount} reservation(s).`
					: "";
				const coverageNote = excludedCount
					? isArabic
						? `تغطية الإجماليات الموثوقة بالريال السعودي: ${includedCount}/${scopeCount} حجزًا ضمن نطاق الفندق والتاريخ. استُبعد ${excludedCount} من هذا المجموع الفرعي لعدم توفر الإجمالي المحدد.`
						: `Verified SAR total coverage: ${includedCount}/${scopeCount} reservations in this hotel/date scope. ${excludedCount} excluded from this subtotal because the selected total is unavailable.`
					: "";
				return `${coverageNote}${fallbackNote} ${
					isArabic ? "المبالغ المدفوعة لم تتغير." : "Paid amounts are unchanged."
				}`.trim();
			},
			tableFinancialCoverage: ({
				includedCount,
				rowCount,
				excludedCount,
				netFallbackCount,
			}) => {
				const selectedNote = excludedCount
					? isArabic
						? `يعتمد المجموع الفرعي والمتبقي على الصفوف المتاحة بالريال السعودي فقط (${includedCount}/${rowCount})؛ وتظل الصفوف المستبعدة «غير متاح».`
						: `Selected subtotal and remaining use available SAR rows only (${includedCount}/${rowCount}); excluded rows remain N/A.`
					: "";
				const fallbackNote = netFallbackCount
					? isArabic
						? ` استُخدم الإجمالي الموثوق بدلاً من الصافي في ${netFallbackCount} صف.`
						: ` Verified Gross was used when Net was unavailable in ${netFallbackCount} row(s).`
					: "";
				return `${selectedNote}${fallbackNote} ${
					isArabic ? "تشمل المبالغ المدفوعة جميع الصفوف." : "Paid amounts include all rows."
				}`.trim();
			},
			exportPartialTotalsRow: ({
				includedCount,
				rowCount,
				netFallbackCount,
			}) =>
				isArabic
					? `الإجماليات — الصفوف المتاحة للإجمالي المحدد والمتبقي: ${includedCount}/${rowCount}${
							netFallbackCount
								? `؛ استُخدم الإجمالي بدل الصافي: ${netFallbackCount}`
								: ""
						  }`
					: `Totals — selected total/remaining available rows: ${includedCount}/${rowCount}${
							netFallbackCount
								? `; Gross fallback for Net: ${netFallbackCount}`
								: ""
						  }`,
			availableSubtotalRow: isArabic
				? "المجموع الفرعي المتاح"
				: "Available subtotal",
			remaining: isArabic ? "المتبقي (ر.س)" : "Remaining (SAR)",
			details: isArabic ? "التفاصيل" : "Details",
			viewDetails: isArabic ? "عرض التفاصيل" : "View Details",
			totalRow: isArabic ? "الإجمالي" : "Total",
			scorePaidAmount: isArabic
				? "إجمالي المدفوع (ر.س)"
				: "Paid Amount (SAR)",
			na: isArabic ? "غير متاح" : "N/A",
			missingHotel: isArabic
				? "بيانات الفندق غير متوفرة لهذا الحجز."
				: "Hotel details are missing for this reservation.",
			loadError: isArabic
				? "تعذر تحميل تقرير بيان الدفع."
				: "Failed to load paid breakdown report",
		}),
		[isArabic],
	);
	const selectedTotalLabel =
		totalMode === REPORT_TOTAL_MODES.GROSS
			? labels.grossTotal
			: labels.netTotal;
	const selectedAvailableSubtotalLabel =
		totalMode === REPORT_TOTAL_MODES.GROSS
			? labels.availableGrossSubtotal
			: labels.availableNetSubtotal;
	const appliedDateRangesSignature = useMemo(
		() => dateRangesKey(appliedDateFilter.dateRanges),
		[appliedDateFilter.dateRanges],
	);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			reportRequestSequence.current += 1;
		};
	}, []);

	const fetchHotels = useCallback(() => {
		if (!user?._id || !token) return;
		gettingHotelDetailsForAdminAll(user._id, token, "summary=true")
			.then((data) => {
				const list = extractHotels(data)
					.filter(Boolean)
					.sort((a, b) =>
						(a?.hotelName || "").localeCompare(b?.hotelName || "", undefined, {
							sensitivity: "base",
						}),
					);
				if (!mountedRef.current) return;
				setHotels(list);
				const preferredHotel = list.find(
					(hotel) =>
						String(hotel?._id) === PREFERRED_PAID_REPORT_HOTEL_ID &&
						hotel?.activateHotel === true &&
						hotel?.xHotelProActive !== false,
				);
				if (preferredHotel) {
					setSelectedHotelId((currentHotelId) =>
						currentHotelId ? currentHotelId : PREFERRED_PAID_REPORT_HOTEL_ID,
					);
				}
			})
			.catch((err) => {
				console.error("Failed to load hotels", err);
				if (mountedRef.current) setHotels([]);
			});
	}, [user?._id, token]);

	useEffect(() => {
		fetchHotels();
	}, [fetchHotels]);

	const fetchReport = useCallback(async () => {
		if (!user?._id || !token || !selectedHotelId) return;
		const requestId = reportRequestSequence.current + 1;
		reportRequestSequence.current = requestId;
		setLoading(true);
		try {
			const requestFilters = {
				hotelId: selectedHotelId,
				searchQuery: searchTerm,
				dateBy: appliedDateFilter.dateBy,
				dateFrom: appliedDateFilter.dateFrom,
				dateTo: appliedDateFilter.dateTo,
				dateRanges: normalizeAppliedDateRanges(appliedDateFilter.dateRanges),
				totalMode,
				limit: PAID_REPORT_PAGE_LIMIT,
			};
			const firstPayload = await getPaidBreakdownReportAdmin(
				user._id,
				token,
				{ ...requestFilters, page: 1 },
			);
			if (!mountedRef.current || requestId !== reportRequestSequence.current) {
				return;
			}

			const firstPage = validatePaidReportPage(firstPayload, 1);
			const pageLists = [firstPage.data];
			for (let page = 2; page <= firstPage.totalPages; page += 1) {
				if (!mountedRef.current || requestId !== reportRequestSequence.current) {
					return;
				}
				const pagePayload = await getPaidBreakdownReportAdmin(
					user._id,
					token,
					{ ...requestFilters, page, includeScorecards: false },
				);
				if (!mountedRef.current || requestId !== reportRequestSequence.current) {
					return;
				}
				const validatedPage = validatePaidReportPage(pagePayload, page, firstPage);
				pageLists.push(validatedPage.data);
			}

			const list = mergePaidReportPages(
				pageLists,
				firstPage.totalDocuments,
			);
			if (!mountedRef.current || requestId !== reportRequestSequence.current) {
				return;
			}
			if (!responseTotalModesMatch(firstPayload, list, totalMode)) {
				throw new Error("Paid report total mode mismatch");
			}
			const scorecardPayload = firstPayload.scorecards;
			const fallbackPaidAmount = list.reduce(
				(sum, reservation) =>
					sum +
					safeNumber(
						reservation?.paid_breakdown_total ??
							breakdownKeys.reduce(
								(innerSum, key) =>
									innerSum +
									safeNumber(reservation?.paid_amount_breakdown?.[key]),
								0,
							),
					),
				0,
			);
			const financialCoverage = resolveScorecardFinancialCoverage(
				scorecardPayload,
				searchTerm ? null : firstPage.totalDocuments,
			);
			const hasApiTotalAmount =
				scorecardPayload &&
				Object.prototype.hasOwnProperty.call(scorecardPayload, "totalAmount");
			const apiTotalAmount = hasApiTotalAmount
				? finiteMoneyOrNull(scorecardPayload.totalAmount)
				: null;
			const scorecardTotalAmount = financialCoverage
				? financialCoverage.includedCount > 0
					? apiTotalAmount
					: financialCoverage.scopeCount === 0 && apiTotalAmount === 0
						? 0
						: null
				: null;
			setReservations(list);
			setScorecards({
				totalAmount: scorecardTotalAmount,
				paidAmount: safeNumber(
					scorecardPayload?.paidAmount ?? fallbackPaidAmount,
				),
				breakdownTotals: scorecardPayload?.breakdownTotals || {},
				financialCoverage,
			});
		} catch (err) {
			if (!mountedRef.current || requestId !== reportRequestSequence.current) {
				return;
			}
			console.error("Failed to fetch paid breakdown report", err);
			message.error(labels.loadError);
			setReservations([]);
			setScorecards(EMPTY_SCORECARDS);
		} finally {
			if (mountedRef.current && requestId === reportRequestSequence.current) {
				setLoading(false);
			}
		}
	}, [
		user?._id,
		token,
		selectedHotelId,
		searchTerm,
		appliedDateFilter.dateBy,
		appliedDateFilter.dateFrom,
		appliedDateFilter.dateTo,
		appliedDateFilter.dateRanges,
		totalMode,
		labels.loadError,
	]);

	useEffect(() => {
		if (!selectedHotelId) {
			reportRequestSequence.current += 1;
			setLoading(false);
			setReservations([]);
			setScorecards(EMPTY_SCORECARDS);
			return;
		}
		fetchReport();
	}, [fetchReport, selectedHotelId]);

	const handleSearch = () => {
		const nextSearchTerm = searchBoxValue.trim();
		if (nextSearchTerm === searchTerm) return;
		reportRequestSequence.current += 1;
		setSearchTerm(nextSearchTerm);
	};

	const handleSearchKey = (event) => {
		if (event.key === "Enter") {
			handleSearch();
		}
	};

	const handleHotelChange = (value) => {
		reportRequestSequence.current += 1;
		setSelectedHotelId(value || "");
	};

	const handleTotalModeChange = useCallback(
		(nextMode) => {
			const normalizedMode = normalizeReportTotalMode(nextMode);
			if (normalizedMode === totalMode) return;
			reportRequestSequence.current += 1;
			setTotalMode(normalizedMode);
		},
		[totalMode],
	);

	const handleApplyDateFilter = useCallback(
		(nextFilter) => {
			const nextDateRanges = normalizeAppliedDateRanges(nextFilter?.dateRanges);
			const nextAppliedFilter = {
				dateBy: nextFilter?.dateBy || "checkin_date",
				dateFrom: nextDateRanges.length ? "" : nextFilter?.dateFrom || "",
				dateTo: nextDateRanges.length ? "" : nextFilter?.dateTo || "",
				dateRanges: nextDateRanges,
			};
			if (
				appliedDateFilter.dateBy === nextAppliedFilter.dateBy &&
				appliedDateFilter.dateFrom === nextAppliedFilter.dateFrom &&
				appliedDateFilter.dateTo === nextAppliedFilter.dateTo &&
				appliedDateRangesSignature === dateRangesKey(nextDateRanges)
			) {
				return;
			}
			reportRequestSequence.current += 1;
			setAppliedDateFilter(nextAppliedFilter);
		},
		[
			appliedDateFilter.dateBy,
			appliedDateFilter.dateFrom,
			appliedDateFilter.dateTo,
			appliedDateRangesSignature,
		],
	);

	const rows = useMemo(() => {
		return reservations.map((reservation) => {
			const breakdown = reservation?.paid_amount_breakdown || {};
			const paidTotal =
				Number.isFinite(reservation?.paid_breakdown_total) &&
				reservation?.paid_breakdown_total !== null
					? reservation.paid_breakdown_total
					: breakdownKeys.reduce(
							(sum, key) => sum + safeNumber(breakdown[key]),
							0,
						  );
			const totalAmount = reportTotalAmountOrNull(reservation);
			const totalAmountCents = finiteMoneyCentsOrNull(totalAmount);
			const paidTotalCents = finiteMoneyCentsOrNull(paidTotal);
			return {
				...reservation,
				paidTotal,
				totalAmount,
				remainingAmount:
					totalAmountCents === null || paidTotalCents === null
						? null
						: Math.max(totalAmountCents - paidTotalCents, 0) / 100,
			};
		});
	}, [reservations]);

	const tableTotals = useMemo(() => {
		const breakdownTotals = breakdownKeys.reduce((acc, key) => {
			acc[key] = rows.reduce(
				(sum, reservation) =>
					sum + safeNumber(reservation?.paid_amount_breakdown?.[key]),
				0,
			);
			return acc;
		}, {});
		const totalPaid = rows.reduce(
			(sum, reservation) => sum + safeNumber(reservation?.paidTotal),
			0,
		);
		const availableRows = rows.filter(
			(reservation) => reservation?.totalAmount !== null,
		);
		const hasAvailableRows = availableRows.length > 0 || rows.length === 0;
		const totalAmount = hasAvailableRows
			? sumMoneyValues(availableRows.map((reservation) => reservation.totalAmount))
			: null;
		const remainingAmount = hasAvailableRows
			? sumMoneyValues(
					availableRows.map((reservation) => reservation.remainingAmount),
			  )
			: null;
		return {
			breakdownTotals,
			totalPaid,
			totalAmount,
			remainingAmount,
			includedCount: availableRows.length,
			excludedCount: rows.length - availableRows.length,
			netFallbackCount:
				totalMode === REPORT_TOTAL_MODES.NET
					? rows.filter(
							(reservation) =>
								reservation?.report_total_net_fallback === true,
						  ).length
					: 0,
		};
	}, [rows, totalMode]);

	const breakdownSummary = useMemo(() => {
		const fromApi = scorecards.breakdownTotals;
		if (fromApi && typeof fromApi === "object" && Object.keys(fromApi).length) {
			return breakdownKeys.reduce((acc, key) => {
				acc[key] = safeNumber(fromApi[key]);
				return acc;
			}, {});
		}
		return tableTotals.breakdownTotals;
	}, [scorecards.breakdownTotals, tableTotals]);

	const hasPartialScorecardCoverage =
		scorecards.financialCoverage?.includedCount > 0 &&
		scorecards.financialCoverage?.excludedCount > 0;
	const scorecardTotalLabel = hasPartialScorecardCoverage
		? selectedAvailableSubtotalLabel
		: selectedTotalLabel;
	const scorecardCoverage = scorecards.financialCoverage
		? {
				...scorecards.financialCoverage,
				netFallbackCount:
					totalMode === REPORT_TOTAL_MODES.NET
						? scorecards.financialCoverage.netFallbackCount
						: 0,
			  }
		: null;
	const scorecardCoverageMessage =
		scorecardCoverage &&
		(scorecardCoverage.excludedCount > 0 ||
			scorecardCoverage.netFallbackCount > 0)
			? labels.financialCoverage(scorecardCoverage)
			: "";
	const tableCoverageMessage =
		tableTotals.excludedCount > 0 || tableTotals.netFallbackCount > 0
			? labels.tableFinancialCoverage({
					includedCount: tableTotals.includedCount,
					rowCount: rows.length,
					excludedCount: tableTotals.excludedCount,
					netFallbackCount: tableTotals.netFallbackCount,
			  })
			: "";

	const selectedHotelName = useMemo(() => {
		if (!selectedHotelId) return "";
		const hotel = hotels.find((item) => String(item?._id) === String(selectedHotelId));
		return hotel?.hotelName || "";
	}, [hotels, selectedHotelId]);

	const handleExportExcel = useCallback(() => {
		if (!rows.length) {
			message.info(labels.noDataToExport);
			return;
		}

		const headers = [
			labels.name,
			labels.confirmation,
			labels.hotel,
			labels.roomType,
			labels.roomNumber,
			labels.source,
			labels.checkin,
			labels.checkout,
			...breakdownKeys.map((key) => labels.breakdown[key] || key),
			labels.paidBreakdown,
			labels.totalPaid,
			selectedTotalLabel,
			labels.remaining,
		];

		const exportRows = rows.map((reservation) => {
			const roomSummary = getReservationRoomSummary(reservation);
			const row = {
				[labels.name]: reservation?.customer_details?.name || "",
				[labels.confirmation]: reservation?.confirmation_number || "",
				[labels.hotel]:
					reservation?.hotelId?.hotelName || selectedHotelName || "",
				[labels.roomType]: roomSummary.roomTypeText,
				[labels.roomNumber]: roomSummary.roomNumberText,
				[labels.source]: reservation?.booking_source || "",
				[labels.checkin]: formatDate(
					reservation?.checkin_date,
					numberLocale,
					"",
				),
				[labels.checkout]: formatDate(
					reservation?.checkout_date,
					numberLocale,
					"",
				),
				[labels.paidBreakdown]:
					reservation?.paid_amount_breakdown?.payment_comments || "",
				[labels.totalPaid]: safeNumber(reservation?.paidTotal),
				[selectedTotalLabel]: reservation?.totalAmount ?? "",
				[labels.remaining]: reservation?.remainingAmount ?? "",
			};

			breakdownKeys.forEach((key) => {
				row[labels.breakdown[key] || key] = safeNumber(
					reservation?.paid_amount_breakdown?.[key],
				);
			});

			return row;
		});

		const totalsRow = {
			[labels.name]:
				tableTotals.excludedCount > 0 || tableTotals.netFallbackCount > 0
					? labels.exportPartialTotalsRow({
							includedCount: tableTotals.includedCount,
							rowCount: rows.length,
							netFallbackCount: tableTotals.netFallbackCount,
						  })
					: labels.totalRow,
			[labels.confirmation]: "",
			[labels.hotel]: "",
			[labels.roomType]: "",
			[labels.roomNumber]: "",
			[labels.source]: "",
			[labels.checkin]: "",
			[labels.checkout]: "",
			[labels.paidBreakdown]: "",
			[labels.totalPaid]: safeNumber(tableTotals.totalPaid),
			[selectedTotalLabel]: tableTotals.totalAmount ?? "",
			[labels.remaining]: tableTotals.remainingAmount ?? "",
		};

		breakdownKeys.forEach((key) => {
			totalsRow[labels.breakdown[key] || key] = safeNumber(
				tableTotals.breakdownTotals?.[key],
			);
		});

		const rowsWithTotals = [...exportRows, totalsRow];
		const worksheet = XLSX.utils.json_to_sheet(rowsWithTotals, {
			header: headers,
		});
		worksheet["!cols"] = buildWorksheetCols(rowsWithTotals, headers);
		worksheet["!autofilter"] = {
			ref: XLSX.utils.encode_range({
				s: { r: 0, c: 0 },
				e: { r: rowsWithTotals.length, c: headers.length - 1 },
			}),
		};

		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Paid Breakdown");

		const fileDate = new Date().toISOString().slice(0, 10);
		const hotelSegment = sanitizeFileSegment(selectedHotelName, "hotel");
		const fileName = `paid-breakdown-admin-${hotelSegment}-${fileDate}.xlsx`;
		XLSX.writeFile(workbook, fileName);
	}, [
		rows,
		labels,
		selectedTotalLabel,
		selectedHotelName,
		numberLocale,
		tableTotals,
	]);

	const handleOpenDetails = (reservation) => {
		if (!reservation?.hotelId) {
			message.error(labels.missingHotel);
			return;
		}
		setSelectedReservation(reservation);
		setDetailsVisible(true);
	};

	const handleCloseDetails = () => {
		setSelectedReservation(null);
		setDetailsVisible(false);
	};

	const handleReservationUpdated = (updated) => {
		if (!updated?._id) return;
		setReservations((prev) =>
			prev.map((reservation) =>
				reservation?._id === updated._id
					? { ...reservation, ...updated }
					: reservation,
			),
		);
		setSelectedReservation((prev) =>
			prev && prev._id === updated._id ? { ...prev, ...updated } : prev,
		);
		fetchReport();
	};

	return (
		<Wrapper dir={isArabic ? "rtl" : "ltr"} $isArabic={isArabic}>
			<ControlsRow>
				<Select
					style={{ minWidth: 220, width: "100%", maxWidth: 260 }}
					placeholder={labels.selectHotel}
					value={selectedHotelId || undefined}
					onChange={handleHotelChange}
				>
					{hotels.map((hotel) => (
						<Option key={hotel._id} value={hotel._id}>
							{hotel.hotelName}
						</Option>
					))}
				</Select>

				<SearchRow>
					<Input
						placeholder={labels.searchPlaceholder}
						style={{ width: "100%", maxWidth: 500 }}
						value={searchBoxValue}
						onChange={(e) => setSearchBoxValue(e.target.value)}
						onKeyDown={handleSearchKey}
						disabled={!selectedHotelId}
					/>
					<Button type='primary' onClick={handleSearch} disabled={!selectedHotelId}>
						{labels.search}
					</Button>
					<Button
						onClick={handleExportExcel}
						disabled={!selectedHotelId || loading || rows.length === 0}
						className='report-export-btn'
					>
						{labels.exportExcel}
					</Button>
				</SearchRow>
			</ControlsRow>
			<ReportFilterRow data-testid='paid-report-date-total-row'>
				<PaidReportDateControls
					isArabic={isArabic}
					disabled={!selectedHotelId}
					value={appliedDateFilter}
					onApply={handleApplyDateFilter}
				/>
				<ReportTotalModeToggle
					value={totalMode}
					onChange={handleTotalModeChange}
					isArabic={isArabic}
					disabled={!selectedHotelId}
				/>
			</ReportFilterRow>

			{!selectedHotelId ? (
				<EmptyState>{labels.emptySelect}</EmptyState>
			) : loading ? (
				<LoadingWrapper>
					<Spin size='large' />
				</LoadingWrapper>
			) : (
				<>
					<ScorecardsRow>
						<Scorecard>
							<span>{scorecardTotalLabel}</span>
							<strong>
								{formatOptionalMoney(
									scorecards.totalAmount,
									numberLocale,
									labels.na,
								)}
							</strong>
						</Scorecard>
						<Scorecard>
							<span>{labels.scorePaidAmount}</span>
							<strong>{formatMoney(scorecards.paidAmount, numberLocale)}</strong>
						</Scorecard>
					</ScorecardsRow>
					{scorecardCoverageMessage ? (
						<FinancialCoverageNotice
							data-testid='paid-scorecard-coverage-notice'
							role='status'
						>
							{scorecardCoverageMessage}
						</FinancialCoverageNotice>
					) : null}
					<BreakdownTotals>
						<BreakdownTotalsTitle>
							{labels.breakdownTotalsTitle}
						</BreakdownTotalsTitle>
						<BreakdownTotalsGrid>
							{breakdownKeys.map((key) => (
								<BreakdownTotalsItem key={key}>
									<span>{labels.breakdown[key]}</span>
									<strong>
										{formatMoney(breakdownSummary[key], numberLocale)}
									</strong>
								</BreakdownTotalsItem>
							))}
						</BreakdownTotalsGrid>
					</BreakdownTotals>
					{rows.length === 0 ? (
						<EmptyState>{labels.emptyData}</EmptyState>
					) : (
						<>
							{tableCoverageMessage ? (
								<FinancialCoverageNotice
									data-testid='paid-table-coverage-notice'
									role='status'
								>
									{tableCoverageMessage}
								</FinancialCoverageNotice>
							) : null}
						<TableWrapper>
							<StyledTable $isArabic={isArabic}>
						<thead>
							<tr>
								<th>{labels.name}</th>
								<th>{labels.confirmation}</th>
								<th>{labels.checkin}</th>
								<th>{labels.checkout}</th>
								{breakdownKeys.map((key) => (
									<th key={key}>{labels.breakdown[key]}</th>
								))}
								<th>{labels.paidBreakdown}</th>
								<th>{labels.totalPaid}</th>
								<th>{selectedTotalLabel}</th>
								<th>{labels.remaining}</th>
								<th>{labels.details}</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((reservation) => {
								const nameValue =
									reservation?.customer_details?.name || labels.na;
								const confirmationValue =
									reservation?.confirmation_number || labels.na;
								const commentsValue =
									reservation?.paid_amount_breakdown?.payment_comments ||
									labels.na;
								return (
									<tr key={reservation._id}>
										<td>
											<EllipsisText title={nameValue} $maxWidth='160px'>
												{nameValue}
											</EllipsisText>
										</td>
										<td>
											<EllipsisText title={confirmationValue} $maxWidth='140px'>
												{confirmationValue}
											</EllipsisText>
										</td>
									<td>
										{formatDate(
											reservation?.checkin_date,
											numberLocale,
											labels.na,
										)}
									</td>
									<td>
										{formatDate(
											reservation?.checkout_date,
											numberLocale,
											labels.na,
										)}
									</td>
									{breakdownKeys.map((key) => (
										<td key={key}>
											{formatMoney(
												reservation?.paid_amount_breakdown?.[key],
												numberLocale,
											)}
										</td>
									))}
									<td>
										<EllipsisText title={commentsValue} $maxWidth='160px'>
											{commentsValue}
										</EllipsisText>
									</td>
									<td>{formatMoney(reservation?.paidTotal, numberLocale)}</td>
									<td>
										{formatOptionalMoney(
											reservation?.totalAmount,
											numberLocale,
											labels.na,
										)}
									</td>
									<td>
										{formatOptionalMoney(
											reservation?.remainingAmount,
											numberLocale,
											labels.na,
										)}
									</td>
									<td>
										<Button onClick={() => handleOpenDetails(reservation)}>
											{labels.viewDetails}
										</Button>
									</td>
								</tr>
								);
							})}
						</tbody>
						<tfoot>
							<tr>
								<td>
									{tableTotals.excludedCount > 0
										? labels.availableSubtotalRow
										: labels.totalRow}
								</td>
								<td></td>
								<td></td>
								<td></td>
								{breakdownKeys.map((key) => (
									<td key={key}>
										{formatMoney(
											tableTotals.breakdownTotals[key],
											numberLocale,
										)}
									</td>
								))}
								<td></td>
								<td>{formatMoney(tableTotals.totalPaid, numberLocale)}</td>
								<td>
									{formatOptionalMoney(
										tableTotals.totalAmount,
										numberLocale,
										labels.na,
									)}
								</td>
								<td>
									{formatOptionalMoney(
										tableTotals.remainingAmount,
										numberLocale,
										labels.na,
									)}
								</td>
								<td></td>
							</tr>
						</tfoot>
							</StyledTable>
						</TableWrapper>
						</>
					)}
				</>
			)}

			<Modal
				open={detailsVisible}
				onCancel={handleCloseDetails}
				footer={null}
				width='90%'
				style={{ top: "3%" }}
				destroyOnClose
			>
				{selectedReservation ? (
					<MoreDetails
						reservation={selectedReservation}
						setReservation={setSelectedReservation}
						hotelDetails={selectedReservation.hotelId}
						onReservationUpdated={handleReservationUpdated}
					/>
				) : null}
			</Modal>
		</Wrapper>
	);
};

export default PaidReportAdmin;

const Wrapper = styled.div`
	width: 100%;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};
`;

const ControlsRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	align-items: center;
	margin-bottom: 10px;

	@media (max-width: 992px) {
		align-items: stretch;
		gap: 10px;
	}
`;

const ReportFilterRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 12px;
	margin-bottom: 16px;

	@media (max-width: 992px) {
		align-items: stretch;
	}
`;

const SearchRow = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	flex: 1;
	min-width: 300px;

	input {
		flex: 1;
	}

	@media (max-width: 992px) {
		min-width: 100%;
		width: 100%;

		button {
			width: 100%;
		}
	}
`;

const TableWrapper = styled.div`
	width: 100%;
	max-height: 680px;
	overflow: auto;
	-webkit-overflow-scrolling: touch;
	max-width: 100%;
	border: 1px solid #f0f0f0;

	@media (max-width: 992px) {
		max-height: none;
		border-radius: 10px;
	}
`;

const StyledTable = styled.table`
	width: 100%;
	border-collapse: collapse;
	min-width: 1200px;

	th,
	td {
		border: 1px solid #f0f0f0;
		padding: 6px 8px;
		font-size: 12px;
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
		white-space: nowrap;
	}

	th {
		background-color: #fafafa;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	tfoot tr {
		background-color: #f5f5f5;
		font-weight: 600;
	}

	@media (max-width: 992px) {
		min-width: 980px;

		th,
		td {
			font-size: 11px;
			padding: 6px;
		}

		th:first-child,
		td:first-child {
			position: sticky;
			left: ${(props) => (props.$isArabic ? "auto" : "0")};
			right: ${(props) => (props.$isArabic ? "0" : "auto")};
			background: #fff;
			z-index: 2;
		}

		thead th:first-child {
			background: #fafafa;
			z-index: 3;
		}

		tfoot td:first-child {
			background: #f5f5f5;
		}
	}
`;

const EllipsisText = styled.span`
	display: inline-block;
	max-width: ${(props) => props.$maxWidth || "180px"};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	vertical-align: bottom;
`;

const EmptyState = styled.div`
	padding: 24px 12px;
	text-align: center;
	color: #666;
	font-weight: 600;
`;

const LoadingWrapper = styled.div`
	padding: 24px 12px;
	text-align: center;
`;

const ScorecardsRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	margin-bottom: 16px;
`;

const FinancialCoverageNotice = styled.div`
	margin: -6px 0 16px;
	padding: 8px 12px;
	border: 1px solid #e5c16c;
	border-radius: 8px;
	background: #fff9e8;
	color: #6b4f0d;
	font-size: 0.82rem;
	font-weight: 600;
	line-height: 1.55;
`;

const Scorecard = styled.div`
	background: #f7f9fc;
	border: 1px solid #dfe6f1;
	border-radius: 10px;
	padding: 12px 18px;
	min-width: 220px;
	display: flex;
	flex-direction: column;
	gap: 6px;

	span {
		font-size: 0.85rem;
		color: #4a5568;
	}

	strong {
		font-size: 1.1rem;
		color: #1a202c;
	}

	@media (max-width: 768px) {
		min-width: calc(50% - 6px);
		padding: 10px 12px;
	}

	@media (max-width: 520px) {
		min-width: 100%;
	}
`;

const BreakdownTotals = styled.div`
	margin-bottom: 16px;
`;

const BreakdownTotalsTitle = styled.div`
	font-weight: 600;
	margin-bottom: 8px;
	color: #1f2933;
`;

const BreakdownTotalsGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 12px;

	@media (max-width: 768px) {
		grid-template-columns: 1fr;
	}
`;

const BreakdownTotalsItem = styled.div`
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 10px;
	padding: 10px 14px;
	display: flex;
	flex-direction: column;
	gap: 4px;

	span {
		font-size: 0.82rem;
		color: #4a5568;
	}

	strong {
		font-size: 1rem;
		color: #1a202c;
	}
`;
