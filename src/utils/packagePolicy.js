import { SAUDI_TIME_ZONE } from "./saudiDates";
import moment from "moment-hijri";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const HIJRI_MONTH_PATTERN = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const PACKAGE_MAX_NIGHTS = Object.freeze({
	offer: 45,
	monthly: 75,
});

const pad2 = (value) => String(value).padStart(2, "0");

const normalizeArabicDigits = (value) =>
	String(value || "")
		.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
		.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

export const parseHijriMonthSelection = (value) => {
	const match = normalizeArabicDigits(value).trim().match(HIJRI_MONTH_PATTERN);
	if (!match) return null;
	const year = Number(match[1]);
	const monthNumber = Number(match[2]);
	const day = match[3] === undefined ? 1 : Number(match[3]);
	if (
		!Number.isInteger(year) ||
		!Number.isInteger(monthNumber) ||
		monthNumber < 1 ||
		monthNumber > 12 ||
		!Number.isInteger(day) ||
		day < 1 ||
		day > 30
	) {
		return null;
	}
	return { year, month: monthNumber - 1 };
};

export const isSameMonthlyPackageSelection = (original, current) => {
	if (!original || !current) return false;
	return (
		String(original.calendarType || "").toLowerCase() ===
			String(current.calendarType || "").toLowerCase() &&
		Number(original.year) === Number(current.year) &&
		Number(original.month) === Number(current.month)
	);
};

export const dateKeyFromParts = (year, month, day) => {
	const numericYear = Number(year);
	const numericMonth = Number(month);
	const numericDay = Number(day);
	if (
		!Number.isInteger(numericYear) ||
		!Number.isInteger(numericMonth) ||
		!Number.isInteger(numericDay)
	) {
		return "";
	}

	const candidate = `${String(numericYear).padStart(4, "0")}-${pad2(
		numericMonth,
	)}-${pad2(numericDay)}`;
	const probe = new Date(
		Date.UTC(numericYear, numericMonth - 1, numericDay, 12, 0, 0),
	);
	if (
		probe.getUTCFullYear() !== numericYear ||
		probe.getUTCMonth() !== numericMonth - 1 ||
		probe.getUTCDate() !== numericDay
	) {
		return "";
	}
	return candidate;
};

const dateKeyFromIntl = (value, timeZone = SAUDI_TIME_ZONE) => {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	try {
		const parts = new Intl.DateTimeFormat("en-CA", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).formatToParts(date);
		const byType = Object.fromEntries(
			parts.filter((part) => part.type !== "literal").map((part) => [
				part.type,
				part.value,
			]),
		);
		return dateKeyFromParts(byType.year, byType.month, byType.day);
	} catch (error) {
		return "";
	}
};

/**
 * Package dates are calendar dates, not instants. Existing API values may be
 * ISO strings, so their explicit YYYY-MM-DD prefix is authoritative and avoids
 * shifting a Saudi package when the browser runs in another time zone.
 */
export const canonicalPackageDateKey = (value) => {
	if (typeof value === "string") {
		const match = value.trim().match(DATE_KEY_PATTERN);
		if (match) return dateKeyFromParts(match[1], match[2], match[3]);
	}
	return dateKeyFromIntl(value);
};

/** Convert a react-datepicker Date into the calendar day the user selected. */
export const localCalendarDateKey = (value) => {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
	return dateKeyFromParts(
		value.getFullYear(),
		value.getMonth() + 1,
		value.getDate(),
	);
};

export const localDateFromPackageDateKey = (value) => {
	const key = canonicalPackageDateKey(value);
	const match = key.match(DATE_KEY_PATTERN);
	if (!match) return null;
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
};

export const getHijriMonthRange = (hijriYear, zeroBasedMonth) => {
	const numericYear = Number(hijriYear);
	const numericMonth = Number(zeroBasedMonth);
	if (
		!Number.isInteger(numericYear) ||
		!Number.isInteger(numericMonth) ||
		numericMonth < 0 ||
		numericMonth > 11
	) {
		return { from: "", to: "", fromHijri: "", toHijri: "" };
	}
	const start = moment()
		.iDate(1)
		.iYear(numericYear)
		.iMonth(numericMonth)
		.startOf("iMonth");
	const end = start.clone().add(1, "iMonth").startOf("iMonth");
	const hijriKey = (value) =>
		`${value.iYear()}-${pad2(value.iMonth() + 1)}-${pad2(value.iDate())}`;
	return {
		from: localCalendarDateKey(start.toDate()),
		to: localCalendarDateKey(end.toDate()),
		fromHijri: hijriKey(start),
		toHijri: hijriKey(end),
	};
};

export const getSaudiTodayKey = (now = new Date()) =>
	dateKeyFromIntl(now, SAUDI_TIME_ZONE);

export const getGregorianMonthRange = (year, zeroBasedMonth) => {
	const numericYear = Number(year);
	const numericMonth = Number(zeroBasedMonth);
	if (
		!Number.isInteger(numericYear) ||
		!Number.isInteger(numericMonth) ||
		numericMonth < 0 ||
		numericMonth > 11
	) {
		return { from: "", to: "" };
	}
	const nextMonthYear = numericMonth === 11 ? numericYear + 1 : numericYear;
	const nextMonth = numericMonth === 11 ? 1 : numericMonth + 2;
	return {
		from: dateKeyFromParts(numericYear, numericMonth + 1, 1),
		to: dateKeyFromParts(nextMonthYear, nextMonth, 1),
	};
};

export const getDefaultEligibleGregorianMonth = (
	todayKey = getSaudiTodayKey(),
) => {
	const match = canonicalPackageDateKey(todayKey).match(DATE_KEY_PATTERN);
	if (!match) {
		const fallback = new Date();
		return { year: fallback.getFullYear(), month: fallback.getMonth() };
	}
	let year = Number(match[1]);
	let month = Number(match[2]) - 1;
	const day = Number(match[3]);
	if (day > 1) {
		month += 1;
		if (month > 11) {
			month = 0;
			year += 1;
		}
	}
	return { year, month };
};

export const isGregorianMonthEligible = (
	year,
	zeroBasedMonth,
	todayKey = getSaudiTodayKey(),
) => {
	const { from, to } = getGregorianMonthRange(year, zeroBasedMonth);
	return isFixedPackageEligible(
		{ type: "monthly", from, to, total: 1 },
		todayKey,
	);
};

const packageNightCount = (fromKey, toKey) => {
	const fromParts = fromKey.match(DATE_KEY_PATTERN);
	const toParts = toKey.match(DATE_KEY_PATTERN);
	if (!fromParts || !toParts) return 0;
	const fromUtc = Date.UTC(
		Number(fromParts[1]),
		Number(fromParts[2]) - 1,
		Number(fromParts[3]),
	);
	const toUtc = Date.UTC(
		Number(toParts[1]),
		Number(toParts[2]) - 1,
		Number(toParts[3]),
	);
	return Math.round((toUtc - fromUtc) / DAY_IN_MS);
};

export const classifyFixedPackage = (
	{ type, from, to, total, rootTotal } = {},
	todayKey = getSaudiTodayKey(),
) => {
	const fromKey = canonicalPackageDateKey(from);
	const toKey = canonicalPackageDateKey(to);
	const today = canonicalPackageDateKey(todayKey);
	const numericTotal = Number(total);
	const normalizedType = String(type || "").toLowerCase();
	const maximumNights = PACKAGE_MAX_NIGHTS[normalizedType];

	if (!fromKey || !toKey || !today || toKey <= fromKey) {
		return { eligible: false, status: "invalid", fromKey, toKey };
	}
	if (!maximumNights) {
		return { eligible: false, status: "invalid-type", fromKey, toKey };
	}
	if (!Number.isFinite(numericTotal) || numericTotal <= 0) {
		return { eligible: false, status: "invalid-price", fromKey, toKey };
	}
	const hasConfiguredRoot =
		rootTotal !== undefined && rootTotal !== null && rootTotal !== "";
	const numericRootTotal = Number(rootTotal);
	if (
		hasConfiguredRoot &&
		(!Number.isFinite(numericRootTotal) || numericRootTotal < 0)
	) {
		return { eligible: false, status: "invalid-root", fromKey, toKey };
	}
	const nights = packageNightCount(fromKey, toKey);
	if (nights < 1 || nights > maximumNights) {
		return {
			eligible: false,
			status: "invalid-duration",
			fromKey,
			toKey,
			nights,
		};
	}
	const startYear = Number(fromKey.slice(0, 4));
	const latestStartYear = Number(today.slice(0, 4)) + 5;
	if (startYear > latestStartYear) {
		return {
			eligible: false,
			status: "too-far",
			fromKey,
			toKey,
			nights,
		};
	}
	if (fromKey < today) {
		return {
			eligible: false,
			status: toKey < today ? "expired" : "started",
			fromKey,
			toKey,
			nights,
		};
	}
	return { eligible: true, status: "eligible", fromKey, toKey, nights };
};

export const isFixedPackageEligible = (packageDetails, todayKey) =>
	classifyFixedPackage(packageDetails, todayKey).eligible;

/**
 * Keeps every source row independent and retains its source index for safe
 * edit/delete operations even after the active view is sorted.
 */
export const partitionFixedPackageRows = (
	rows,
	{
		type,
		getType,
		getFrom,
		getTo,
		getTotal,
		getRootTotal,
		todayKey = getSaudiTodayKey(),
	},
) => {
	const entries = (Array.isArray(rows) ? rows : []).map((row, sourceIndex) => {
		const policy = classifyFixedPackage(
			{
				type: getType ? getType(row) : type,
				from: getFrom(row),
				to: getTo(row),
				total: getTotal(row),
				rootTotal: getRootTotal ? getRootTotal(row) : undefined,
			},
			todayKey,
		);
		return { row, sourceIndex, ...policy };
	});

	const active = entries
		.filter((entry) => entry.eligible)
		.sort(
			(a, b) =>
				a.fromKey.localeCompare(b.fromKey) || a.sourceIndex - b.sourceIndex,
		);
	const history = entries
		.filter((entry) => !entry.eligible)
		.sort(
			(a, b) =>
				b.fromKey.localeCompare(a.fromKey) || b.sourceIndex - a.sourceIndex,
		);

	return { active, history };
};
