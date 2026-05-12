const BLOCKED_COLORS = new Set([
	"black",
	"#000",
	"#000000",
	"rgb(0,0,0)",
	"rgb(0, 0, 0)",
]);

const normalizeText = (value) =>
	String(value || "")
		.trim()
		.toLowerCase();

const isBlockedColor = (color) => BLOCKED_COLORS.has(normalizeText(color));

const isRestrictedStatus = (value) =>
	[
		"blocked",
		"restricted",
		"unavailable",
		"closed",
		"ma7zoor",
		"ma7zor",
		"mahzoor",
		"mahzor",
		"محظور",
		"محجوب",
		"مقيد",
		"مقيّد",
	].includes(normalizeText(value));

const isExplicitRestrictedStatus = (value) =>
	["restricted", "unavailable", "closed", "مقيد", "مقيّد"].includes(
		normalizeText(value)
	);

export const isCalendarRateRestricted = (rate = {}) => {
	if (!rate) return false;

	const price = Number(rate.price);
	const rootPrice = Number(rate.rootPrice);
	const blockedByFlag = Boolean(
		rate.blocked ||
			rate.isBlocked ||
			rate.restricted ||
			rate.isRestricted ||
			rate.calendarBlocked ||
			rate.unavailable
	);
	const blockedByStatus =
		isRestrictedStatus(rate.status) ||
		isRestrictedStatus(rate.state) ||
		isRestrictedStatus(rate.availability) ||
		isRestrictedStatus(rate.type);
	const blockedByColor = isBlockedColor(rate.color || rate.backgroundColor);
	const blockedByZeroPrice = Number.isFinite(price) && price <= 0;
	const blockedByZeroRoot =
		Number.isFinite(rootPrice) && rootPrice <= 0 && blockedByColor;

	return (
		blockedByFlag ||
		blockedByStatus ||
		blockedByColor ||
		blockedByZeroPrice ||
		blockedByZeroRoot
	);
};

export const getCalendarRestrictionLabel = (rate = {}, isArabic = false) => {
	const restricted =
		rate.restricted ||
		rate.isRestricted ||
		isExplicitRestrictedStatus(rate.status) ||
		isExplicitRestrictedStatus(rate.state);

	if (restricted) return isArabic ? "مقيّد" : "Restricted";
	return isArabic ? "محظور" : "Blocked";
};

export const buildCalendarRateTitle = ({
	rate = {},
	isArabic = false,
	includeRoot = false,
}) => {
	if (isCalendarRateRestricted(rate)) {
		return getCalendarRestrictionLabel(rate, isArabic);
	}

	const priceLabel = isArabic ? "السعر" : "Price";
	const rootLabel = isArabic ? "التكلفة" : "Root";
	const price = rate.price ?? 0;
	const rootPrice = rate.rootPrice;

	return `${priceLabel}: ${price} SAR${
		includeRoot && rootPrice ? ` | ${rootLabel}: ${rootPrice} SAR` : ""
	}`;
};

export const getCalendarRateColor = (rate = {}, getColorForPrice) => {
	if (isCalendarRateRestricted(rate)) return "#111827";
	return rate.color || getColorForPrice?.(rate.price) || "#1e90ff";
};

export const getCalendarRateClassNames = (rate = {}) =>
	isCalendarRateRestricted(rate) ? ["calendar-rate-blocked"] : [];
