const dateValue = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

export const formatReservationSummaryDate = (
	value,
	{ locale = "en-US", dateOnly = false } = {}
) => {
	const date = dateValue(value);
	if (!date) return "—";
	return new Intl.DateTimeFormat(locale, {
		timeZone: "Asia/Riyadh",
		year: "numeric",
		month: "short",
		day: "numeric",
		...(dateOnly
			? {}
			: {
					hour: "2-digit",
					minute: "2-digit",
			  }),
	}).format(date);
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
		"Check-in": formatReservationSummaryDate(reservation.checkinDate, {
			locale,
			dateOnly: true,
		}),
		"Check-out": formatReservationSummaryDate(reservation.checkoutDate, {
			locale,
			dateOnly: true,
		}),
		Created: formatReservationSummaryDate(reservation.createdAt, { locale }),
		Status: spreadsheetSafeText(reservation.status, "unknown"),
		Rooms: Number(reservation.rooms) || 0,
		Guests: Number(reservation.guests) || 0,
		"Total Amount": Number(reservation.totalAmount) || 0,
		Currency: spreadsheetSafeText(reservation.currency, "SAR"),
		"Booking Source": spreadsheetSafeText(reservation.bookingSource, "N/A"),
	}));
