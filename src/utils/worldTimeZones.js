import { SAUDI_TIME_ZONE, parseDateValue } from "./saudiDates";

export { SAUDI_TIME_ZONE };

export const EGYPT_TIME_ZONE = "Africa/Cairo";
export const USA_PACIFIC_TIME_ZONE = "America/Los_Angeles";

const ENGLISH_GREGORIAN_LOCALE = "en-US";
const ARABIC_GREGORIAN_LOCALE = "ar-EG-u-ca-gregory-nu-latn";
const ENGLISH_HIJRI_LOCALE = "en-US-u-ca-islamic-umalqura";
const ARABIC_HIJRI_LOCALE = "ar-SA-u-ca-islamic-umalqura-nu-latn";

const normalizeArabicText = (value = "") =>
	String(value || "")
		.replace(/\u060c/g, "")
		.replace(/\s+/g, " ")
		.trim();

const getZoneParts = (date, timeZone) =>
	new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	})
		.formatToParts(date)
		.reduce((acc, part) => {
			if (part.type !== "literal") acc[part.type] = part.value;
			return acc;
		}, {});

const fallbackOffsetLabel = (date, timeZone, fallback = "-") => {
	try {
		const parts = getZoneParts(date, timeZone);
		const hour = parts.hour === "24" ? "00" : parts.hour;
		const zoneWallUtc = Date.UTC(
			Number(parts.year),
			Number(parts.month) - 1,
			Number(parts.day),
			Number(hour),
			Number(parts.minute),
			Number(parts.second),
		);
		const offsetMinutes = Math.round((zoneWallUtc - date.getTime()) / 60000);
		const sign = offsetMinutes >= 0 ? "+" : "-";
		const absolute = Math.abs(offsetMinutes);
		const hours = Math.floor(absolute / 60);
		const minutes = absolute % 60;
		return `GMT${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
	} catch (error) {
		return fallback;
	}
};

const formatZone = (value, locale, options, fallback = "-") => {
	const date = parseDateValue(value);
	if (!date) return fallback;
	try {
		return normalizeArabicText(
			new Intl.DateTimeFormat(locale, options).format(date),
		);
	} catch (error) {
		return fallback;
	}
};

export const formatZoneDateTime = (
	value,
	timeZone,
	isArabic = false,
	{ includeZoneName = true, fallback = "-" } = {},
) => {
	const date = parseDateValue(value);
	if (!date) return fallback;
	const formatted = formatZone(
		date,
		isArabic ? ARABIC_GREGORIAN_LOCALE : ENGLISH_GREGORIAN_LOCALE,
		{
			timeZone,
			weekday: "short",
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
			timeZoneName: includeZoneName ? "shortOffset" : undefined,
		},
		fallback,
	);
	if (formatted !== fallback || !includeZoneName) return formatted;
	const withoutZone = formatZone(
		date,
		isArabic ? ARABIC_GREGORIAN_LOCALE : ENGLISH_GREGORIAN_LOCALE,
		{
			timeZone,
			weekday: "short",
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		},
		fallback,
	);
	const offset = fallbackOffsetLabel(date, timeZone, "");
	return withoutZone === fallback || !offset
		? withoutZone
		: `${withoutZone} ${offset}`;
};

export const formatZoneHijriDate = (
	value,
	timeZone,
	isArabic = false,
	fallback = "-",
) =>
	formatZone(
		value,
		isArabic ? ARABIC_HIJRI_LOCALE : ENGLISH_HIJRI_LOCALE,
		{
			timeZone,
			weekday: "short",
			day: "2-digit",
			month: "short",
			year: "numeric",
		},
		fallback,
	);

export const formatZoneOffset = (
	value,
	timeZone,
	isArabic = false,
	fallback = "-",
) => {
	const date = parseDateValue(value);
	if (!date) return fallback;
	try {
		const parts = new Intl.DateTimeFormat(
			isArabic ? ARABIC_GREGORIAN_LOCALE : ENGLISH_GREGORIAN_LOCALE,
			{
				timeZone,
				hour: "2-digit",
				minute: "2-digit",
				timeZoneName: "shortOffset",
			},
		).formatToParts(date);
		const zoneName = parts.find((part) => part.type === "timeZoneName")?.value;
		return zoneName
			? normalizeArabicText(zoneName)
			: fallbackOffsetLabel(date, timeZone, fallback);
	} catch (error) {
		return fallbackOffsetLabel(date, timeZone, fallback);
	}
};

export const getTimeZoneWallDate = (value, timeZone) => {
	const date = parseDateValue(value);
	if (!date) return new Date();
	try {
		const parts = getZoneParts(date, timeZone);
		const hour = parts.hour === "24" ? "00" : parts.hour;
		return new Date(
			`${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`,
		);
	} catch (error) {
		return date;
	}
};
