const dateValue = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const localeWithLatinDigits = (locale = "en-US") =>
	String(locale).toLowerCase().startsWith("ar")
		? "ar-SA-u-nu-latn"
		: "en-US-u-nu-latn";

export const formatReservationSummaryDate = (
	value,
	{ locale = "en-US", calendar = "gregory", month = "short" } = {}
) => {
	const date = dateValue(value);
	if (!date) return "\u2014";
	return new Intl.DateTimeFormat(localeWithLatinDigits(locale), {
		timeZone: "Asia/Riyadh",
		calendar,
		numberingSystem: "latn",
		year: "numeric",
		month,
		day: "numeric",
	}).format(date);
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
