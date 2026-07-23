export const BOFA_VCC_TIME_ZONE = "Asia/Riyadh";

export const formatPostalCode = (value) =>
	String(value || "")
		.toUpperCase()
		.replace(/[^A-Z0-9 -]/g, "")
		.replace(/\s+/g, " ")
		.slice(0, 14);

const dateKey = (value, timeZone = BOFA_VCC_TIME_ZONE) => {
	const date = value instanceof Date ? value : new Date(value);
	if (!value || Number.isNaN(date.getTime())) return "";
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);
	const get = (type) => parts.find((part) => part.type === type)?.value || "";
	return `${get("year")}-${get("month")}-${get("day")}`;
};

export const getCheckinEligibility = (checkinDate, now = new Date()) => {
	const checkinDateKey = dateKey(checkinDate);
	const todayDateKey = dateKey(now);
	if (!checkinDateKey) {
		return {
			ok: false,
			message: "The reservation check-in date is missing or invalid.",
			checkinDate: "",
			todayDate: todayDateKey,
		};
	}
	if (checkinDateKey > todayDateKey) {
		return {
			ok: false,
			message: `This card cannot be processed before check-in. Check-in is ${checkinDateKey}; today is ${todayDateKey} (Asia/Riyadh).`,
			checkinDate: checkinDateKey,
			todayDate: todayDateKey,
		};
	}
	return { ok: true, checkinDate: checkinDateKey, todayDate: todayDateKey };
};

export const resolveVccProvider = (bookingSource) => {
	const source = String(bookingSource || "").trim().toLowerCase();
	if (source.includes("expedia")) return "expedia";
	if (source.includes("agoda")) return "agoda";
	if (
		source.includes("booking.com") ||
		source === "booking"
	)
		return "booking";
	return "other";
};

export const providerLabel = (provider) =>
	({ expedia: "Expedia", agoda: "Agoda", booking: "Booking.com" }[provider] ||
		"OTA");

export const requiresBillingPostalCode = (provider) =>
	provider !== "expedia" && provider !== "agoda";

export const initialVccForm = (reservation = {}) => {
	const metadata = reservation?.vcc_payment?.metadata || {};
	const sourceCurrency = String(metadata.amount_to_charge_currency || "").toUpperCase();
	const sourceAmount = Number(metadata.amount_to_charge || 0);
	const savedUsd =
		Number(metadata.amount_to_charge_usd || 0) ||
		(sourceCurrency === "USD" ? sourceAmount : 0);
	const provider = resolveVccProvider(reservation?.booking_source);
	return {
		amountUsd: savedUsd > 0 ? savedUsd.toFixed(2) : "",
		...(requiresBillingPostalCode(provider) ? { billingPostalCode: "" } : {}),
	};
};

export const validateVccForm = (
	form,
	_now = new Date(),
	{ requirePostalCode = false } = {},
) => {
	if (!/^\d+(?:\.\d{1,2})?$/.test(String(form.amountUsd || "").trim())) {
		return "Enter a valid amount in USD with no more than two decimals.";
	}
	if (!(Number(form.amountUsd) > 0)) return "The USD amount must be greater than 0.";
	if (requirePostalCode) {
		const postalCode = String(form.billingPostalCode || "")
			.trim()
			.toUpperCase();
		if (!postalCode) return "Enter the ZIP / postal code provided for this virtual card.";
		if (
			postalCode.length < 3 ||
			postalCode.length > 14 ||
			!/^[A-Z0-9](?:[A-Z0-9 -]*[A-Z0-9])?$/.test(postalCode)
		) {
			return "Enter a valid ZIP / postal code using 3 to 14 letters, numbers, spaces, or hyphens.";
		}
	}
	return "";
};
