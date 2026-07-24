export const SAUDI_TIME_ZONE = "Asia/Riyadh";

const ARABIC_GREGORIAN_LOCALE = "ar-SA-u-ca-gregory-nu-latn";
const ARABIC_HIJRI_LOCALE = "ar-SA-u-ca-islamic-umalqura-nu-latn";
const ENGLISH_GREGORIAN_LOCALE = "en-GB";
const ENGLISH_HIJRI_LOCALE = "en-GB-u-ca-islamic-umalqura-nu-latn";

const cleanArabicDateText = (value = "") =>
	String(value || "")
		.replace(/[\u200e\u200f]/g, "")
		.replace(/\s+/g, " ")
		.trim();

export const isArabicLanguage = (language) => language === "Arabic";

export const parseDateValue = (value) => {
	if (!value) return null;
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatWithIntl = (value, locale, options, fallback = "-") => {
	const date = parseDateValue(value);
	if (!date) return fallback;
	try {
		return cleanArabicDateText(
			new Intl.DateTimeFormat(locale, {
				timeZone: SAUDI_TIME_ZONE,
				...options,
			}).format(date),
		);
	} catch (error) {
		return fallback;
	}
};

const formatMonthDayYear = (
	value,
	locale,
	{
		includeWeekday = false,
		month = "long",
		calendar = "gregory",
		fallback = "-",
	} = {},
) => {
	const date = parseDateValue(value);
	if (!date) return fallback;
	try {
		const formatter = new Intl.DateTimeFormat(locale, {
			timeZone: SAUDI_TIME_ZONE,
			calendar,
			numberingSystem: "latn",
			weekday: includeWeekday ? "long" : undefined,
			month,
			day: "numeric",
			year: "numeric",
		});
		const parts = formatter.formatToParts(date);
		const part = (type) =>
			cleanArabicDateText(
				parts
					.filter((entry) => entry.type === type)
					.map((entry) => entry.value)
					.join(" "),
			);
		const monthText = part("month");
		const dayText = part("day");
		const yearText = part("year");
		const eraText = part("era");
		if (!monthText || !dayText || !yearText) return fallback;

		const isArabic = String(locale).toLowerCase().startsWith("ar");
		const yearWithEra = [yearText, eraText].filter(Boolean).join(" ");
		const dateText = isArabic
			? `${monthText} ${dayText}\u060c ${yearWithEra}`
			: `${monthText} ${dayText}, ${yearWithEra}`;
		const weekdayText = part("weekday");
		if (!includeWeekday || !weekdayText) return dateText;
		return isArabic
			? `${weekdayText}\u060c ${dateText}`
			: `${weekdayText}, ${dateText}`;
	} catch (error) {
		return fallback;
	}
};

export const formatSaudiGregorianDate = (
	value,
	{
		language = "English",
		includeWeekday = false,
		month = "long",
		fallback = "-",
	} = {},
) => {
	const isArabic = isArabicLanguage(language);
	return formatMonthDayYear(
		value,
		isArabic ? ARABIC_GREGORIAN_LOCALE : ENGLISH_GREGORIAN_LOCALE,
		{
			includeWeekday,
			month,
			calendar: "gregory",
			fallback,
		},
	);
};

export const formatSaudiHijriDate = (
	value,
	{
		language = "English",
		includeWeekday = false,
		month = "long",
		fallback = "-",
	} = {},
) => {
	const isArabic = isArabicLanguage(language);
	return formatMonthDayYear(
		value,
		isArabic ? ARABIC_HIJRI_LOCALE : ENGLISH_HIJRI_LOCALE,
		{
			includeWeekday,
			month,
			calendar: "islamic-umalqura",
			fallback,
		},
	);
};

export const formatSaudiTime = (
	value,
	{ language = "English", seconds = false, fallback = "-" } = {},
) =>
	formatWithIntl(
		value,
		isArabicLanguage(language) ? ARABIC_GREGORIAN_LOCALE : "en-US",
		{
			hour: "2-digit",
			minute: "2-digit",
			second: seconds ? "2-digit" : undefined,
			hour12: true,
		},
		fallback,
	);

export const formatSaudiDateTime = (
	value,
	{
		language = "English",
		includeHijri = false,
		includeWeekday = false,
		month = "long",
		fallback = "-",
	} = {},
) => {
	const date = parseDateValue(value);
	if (!date) return fallback;
	const gregorian = formatSaudiGregorianDate(date, {
		language,
		includeWeekday,
		month,
		fallback,
	});
	const time = formatSaudiTime(date, { language, fallback: "" });
	const base = [gregorian, time].filter(Boolean).join(" - ");
	if (!includeHijri) return base;
	const hijri = formatSaudiHijriDate(date, {
		language,
		includeWeekday: false,
		month: "long",
		fallback: "",
	});
	return hijri ? `${base} | ${hijri}` : base;
};

export const formatSaudiDate = (
	value,
	{
		language = "English",
		includeHijri = false,
		includeWeekday = false,
		month = "long",
		fallback = "-",
	} = {},
) => {
	const date = parseDateValue(value);
	if (!date) return fallback;
	const gregorian = formatSaudiGregorianDate(date, {
		language,
		includeWeekday,
		month,
		fallback,
	});
	if (!includeHijri) return gregorian;
	const hijri = formatSaudiHijriDate(date, {
		language,
		includeWeekday: false,
		month: "long",
		fallback: "",
	});
	return hijri ? `${gregorian} | ${hijri}` : gregorian;
};
