import { getRoomTypeDisplayLabel } from "../AllReservation/reservationRoomDetails";
import {
	formatSaudiGregorianDate,
	formatSaudiHijriDate,
} from "../../utils/saudiDates";

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
	const text = String(value ?? fallback);
	return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
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
		"Amount Verification": spreadsheetSafeText(
			reservation.amountQuality?.status,
			"unverified"
		),
		Currency: spreadsheetSafeText(reservation.currency, "SAR"),
		"Booking Source": spreadsheetSafeText(reservation.bookingSource, "N/A"),
	}));
