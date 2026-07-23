export const BOFA_VCC_TIME_ZONE = "Asia/Riyadh";

export const digitsOnly = (value, maxLength = 99) =>
	String(value || "")
		.replace(/\D/g, "")
		.slice(0, maxLength);

export const formatCardNumber = (value) =>
	digitsOnly(value, 19)
		.replace(/(\d{4})(?=\d)/g, "$1 ")
		.trim();

export const formatExpiry = (value) => {
	const digits = digitsOnly(value, 4);
	if (digits.length <= 2) return digits;
	return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

export const isLuhnValid = (value) => {
	const number = digitsOnly(value, 19);
	if (!number || /^(\d)\1+$/.test(number)) return false;
	let sum = 0;
	let doubleDigit = false;
	for (let index = number.length - 1; index >= 0; index -= 1) {
		let digit = Number(number[index]);
		if (doubleDigit) {
			digit *= 2;
			if (digit > 9) digit -= 9;
		}
		sum += digit;
		doubleDigit = !doubleDigit;
	}
	return sum % 10 === 0;
};

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
	const source = String(bookingSource || "").toLowerCase();
	if (source.includes("expedia")) return "expedia";
	if (source.includes("agoda")) return "agoda";
	if (source.includes("booking")) return "booking";
	return "other";
};

export const providerLabel = (provider) =>
	({ expedia: "Expedia", agoda: "Agoda", booking: "Booking.com" }[provider] ||
		"OTA");

export const initialVccForm = (reservation = {}) => {
	const provider = resolveVccProvider(reservation.booking_source);
	const metadata = reservation?.vcc_payment?.metadata || {};
	const sourceCurrency = String(metadata.amount_to_charge_currency || "").toUpperCase();
	const sourceAmount = Number(metadata.amount_to_charge || 0);
	const savedUsd =
		Number(metadata.amount_to_charge_usd || 0) ||
		(sourceCurrency === "USD" ? sourceAmount : 0);
	const isExpedia = provider === "expedia";
	return {
		amountUsd: savedUsd > 0 ? savedUsd.toFixed(2) : "",
		cardholderName: `${providerLabel(provider)} Virtual Card`,
		cardNumber: "",
		expiry: "",
		cvv: "",
		address1: isExpedia ? "1111 Expedia Group Way W" : "",
		locality: isExpedia ? "Seattle" : "",
		administrativeArea: isExpedia ? "WA" : "",
		postalCode: isExpedia ? "98119" : "",
		countryCode: "US",
	};
};

export const validateVccForm = (form, now = new Date()) => {
	if (!/^\d+(?:\.\d{1,2})?$/.test(String(form.amountUsd || "").trim())) {
		return "Enter a valid amount in USD with no more than two decimals.";
	}
	if (!(Number(form.amountUsd) > 0)) return "The USD amount must be greater than 0.";
	const cardNumber = digitsOnly(form.cardNumber, 19);
	if (cardNumber.length < 12 || !isLuhnValid(cardNumber)) {
		return "Enter a valid card number.";
	}
	const expiryMatch = String(form.expiry || "").match(/^(\d{2})\/(\d{2})$/);
	if (!expiryMatch) return "Enter the expiration date in MM/YY format.";
	const month = Number(expiryMatch[1]);
	const year = 2000 + Number(expiryMatch[2]);
	if (month < 1 || month > 12) return "Enter a valid expiration month.";
	if (
		year < now.getUTCFullYear() ||
		(year === now.getUTCFullYear() && month < now.getUTCMonth() + 1)
	) {
		return "This virtual card is expired.";
	}
	const cvv = digitsOnly(form.cvv, 4);
	if (cvv.length < 3 || cvv.length > 4) return "Enter a valid card security code.";
	if (!String(form.cardholderName || "").trim()) return "Enter the cardholder name.";
	const requiredBilling = [
		["billing address", form.address1],
		["city/locality", form.locality],
		["state/administrative area", form.administrativeArea],
		["postal code", form.postalCode],
	];
	const missing = requiredBilling.find(([, value]) => !String(value || "").trim());
	if (missing) return `Enter the ${missing[0]} shown by the OTA.`;
	if (!/^[A-Za-z]{2}$/.test(String(form.countryCode || "").trim())) {
		return "Enter a two-letter billing country code.";
	}
	return "";
};
