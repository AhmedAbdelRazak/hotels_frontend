import { getRoomTypeDisplayLabel } from "../AllReservation/reservationRoomDetails";
import {
	formatSaudiGregorianDate,
	formatSaudiHijriDate,
} from "../../utils/saudiDates";
import { toLatinDigits } from "../../utils/latinDigits";

export const RESERVATION_SUMMARY_EXPORT_HEADERS = Object.freeze([
	"Activity",
	"Confirmation Number",
	"Hotel",
	"Guest",
	"Room Type",
	"Room Number",
	"Check-in",
	"Check-out",
	"Created",
	"Status",
	"Rooms",
	"Guests",
	"Nights",
	"Average Per Night",
	"Total Amount",
	"Gross Total (Before OTA Deductions)",
	"Net Total (After OTA Deductions)",
	"Amount Verification",
	"Currency",
	"Booking Source",
]);

export const RESERVATION_SUMMARY_EXPORT_ARABIC_HEADERS = Object.freeze([
	"النشاط",
	"رقم التأكيد",
	"الفندق",
	"الضيف",
	"نوع الغرفة",
	"رقم الغرفة",
	"تاريخ الوصول",
	"تاريخ المغادرة",
	"تاريخ الإنشاء",
	"الحالة",
	"عدد الغرف",
	"عدد الضيوف",
	"عدد الليالي",
	"متوسط المبلغ لكل ليلة",
	"إجمالي المبلغ",
	"إجمالي الحجز قبل خصم مصاريف منصات الحجز (OTA)",
	"صافي الحجز بعد خصم مصاريف منصات الحجز (OTA)",
	"حالة التحقق من المبلغ",
	"العملة",
	"مصدر الحجز",
]);

export const getReservationSummaryExportHeaders = (locale = "en-US") =>
	String(locale).toLowerCase().startsWith("ar")
		? RESERVATION_SUMMARY_EXPORT_ARABIC_HEADERS
		: RESERVATION_SUMMARY_EXPORT_HEADERS;

export const formatReservationSummaryDate = (
	value,
	{ locale = "en-US", calendar = "gregory", month = "long" } = {},
) => {
	const options = {
		language: String(locale).toLowerCase().startsWith("ar")
			? "Arabic"
			: "English",
		month,
		fallback: "\u2014",
	};
	return calendar === "islamic-umalqura"
		? formatSaudiHijriDate(value, options)
		: formatSaudiGregorianDate(value, options);
};

export const formatReservationSummaryNumber = (value, options = {}) => {
	const number = Number(value);
	return new Intl.NumberFormat("en-US-u-nu-latn", {
		numberingSystem: "latn",
		maximumFractionDigits: 2,
		...options,
	}).format(Number.isFinite(number) ? number : 0);
};

export const reservationActivityText = (types = [], labels = {}) =>
	(Array.isArray(types) ? types : [])
		.map((type) => labels[type] || type)
		.filter(Boolean)
		.join(", ");

// Prevent user-controlled text from being interpreted as a formula by Excel.
export const spreadsheetSafeText = (value, fallback = "") => {
	const text = toLatinDigits(String(value ?? fallback));
	return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
};

const numericFinancialTotalOrBlank = (value, available) => {
	if (
		available === false ||
		value === null ||
		value === undefined ||
		typeof value === "boolean"
	) {
		return "";
	}
	const normalized =
		typeof value === "string" ? value.replace(/,/g, "").trim() : value;
	if (normalized === "") return "";
	const number = Number(normalized);
	return Number.isFinite(number) ? number : "";
};

const exportGrossTotal = (reservation = {}) => {
	const authoritativeGross = numericFinancialTotalOrBlank(
		reservation.grossTotalAmount,
		reservation.grossTotalAvailable,
	);
	if (authoritativeGross !== "") return authoritativeGross;
	return numericFinancialTotalOrBlank(reservation.totalAmount, true);
};

const exportNetTotal = (reservation = {}) => {
	const authoritativeNet = numericFinancialTotalOrBlank(
		reservation.netTotalAmount,
		reservation.netTotalAvailable,
	);
	return authoritativeNet !== ""
		? authoritativeNet
		: exportGrossTotal(reservation);
};

const exportCurrency = (reservation = {}) => {
	const normalized = String(
		reservation.financialTotalsCurrency || reservation.currency || "SAR",
	)
		.trim()
		.toUpperCase();
	return /^[A-Z]{3}$/.test(normalized) ? normalized : "SAR";
};

export const buildReservationSummaryExportRows = (
	reservations = [],
	{ locale = "en-US", activityLabels = {} } = {}
) =>
	(Array.isArray(reservations) ? reservations : []).map((reservation) => ({
		Activity: spreadsheetSafeText(
			reservationActivityText(reservation.activityTypes, activityLabels)
		),
		"Confirmation Number": spreadsheetSafeText(reservation.confirmationNumber, "N/A"),
		Hotel: spreadsheetSafeText(reservation.hotel?.name, "Unknown Hotel"),
		Guest: spreadsheetSafeText(reservation.guestName, "Guest"),
		"Room Type": spreadsheetSafeText(
			(Array.isArray(reservation.roomTypes) ? reservation.roomTypes : [])
				.filter(Boolean)
				.map(getRoomTypeDisplayLabel)
				.join(", ")
		),
		"Room Number": spreadsheetSafeText(
			(Array.isArray(reservation.roomNumbers) ? reservation.roomNumbers : [])
				.filter(Boolean)
				.join(", ")
		),
		"Check-in": formatReservationSummaryDate(reservation.checkinDate, { locale }),
		"Check-out": formatReservationSummaryDate(reservation.checkoutDate, { locale }),
		Created: formatReservationSummaryDate(reservation.createdAt, { locale }),
		Status: spreadsheetSafeText(reservation.status, "unknown"),
		Rooms: Number(reservation.rooms) || 0,
		Guests: Number(reservation.guests) || 0,
		Nights: Number(reservation.nights) || 0,
		"Average Per Night": Number(reservation.averageNightlyAmount) || 0,
		"Total Amount": Number(reservation.totalAmount) || 0,
		"Gross Total (Before OTA Deductions)": exportGrossTotal(reservation),
		"Net Total (After OTA Deductions)": exportNetTotal(reservation),
		"Amount Verification": spreadsheetSafeText(
			reservation.amountQuality?.status,
			"unverified"
		),
		Currency: exportCurrency(reservation),
		"Booking Source": spreadsheetSafeText(reservation.bookingSource, "N/A"),
	}));
