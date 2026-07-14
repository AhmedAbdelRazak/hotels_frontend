import moment from "moment-hijri";

const GREGORIAN_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const HIJRI_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const PAID_REPORT_DATE_ERRORS = Object.freeze({
  INVALID_CALENDAR: "invalid_calendar",
  INVALID_FROM: "invalid_from",
  INVALID_TO: "invalid_to",
  REVERSED_RANGE: "reversed_range",
});

export const normalizeDateDigits = (value = "") =>
  String(value ?? "")
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660),
    )
    .replace(/[\u06f0-\u06f9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0),
    );

const pad2 = (value) => String(value).padStart(2, "0");

export const normalizeGregorianDateKey = (value = "") => {
  const normalized = normalizeDateDigits(value).trim();
  const match = normalized.match(GREGORIAN_DATE_KEY_PATTERN);
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";

  // setUTCFullYear avoids Date.UTC's special handling of years 0 through 99.
  const probe = new Date(Date.UTC(2000, 0, 1, 12, 0, 0, 0));
  probe.setUTCFullYear(year, month - 1, day);
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return "";
  }

  return `${match[1]}-${pad2(month)}-${pad2(day)}`;
};

const supportsHijriCalendar = () =>
  typeof moment?.fn?.iYear === "function" &&
  typeof moment?.fn?.iMonth === "function" &&
  typeof moment?.fn?.iDate === "function" &&
  typeof moment?.fn?.iDaysInMonth === "function";

export const hijriDateToGregorianKey = (value = "") => {
  if (!supportsHijriCalendar()) return "";

  const normalized = normalizeDateDigits(value).trim();
  const match = normalized.match(HIJRI_DATE_KEY_PATTERN);
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return "";

  // moment-hijri's strict parser normalizes overflowing values instead of
  // rejecting them. Build from day one, validate the real month length, and
  // then round-trip every Hijri component before accepting the conversion.
  const probe = moment()
    .locale("en")
    .iDate(1)
    .iYear(year)
    .iMonth(month - 1)
    .startOf("day");
  const daysInMonth = probe.iDaysInMonth();
  if (
    !probe.isValid() ||
    probe.iYear() !== year ||
    probe.iMonth() !== month - 1 ||
    !Number.isInteger(daysInMonth) ||
    day > daysInMonth
  ) {
    return "";
  }

  probe.iDate(day);
  if (
    probe.iYear() !== year ||
    probe.iMonth() !== month - 1 ||
    probe.iDate() !== day
  ) {
    return "";
  }

  return normalizeGregorianDateKey(probe.locale("en").format("YYYY-MM-DD"));
};

export const gregorianDateToHijriKey = (value = "") => {
  if (!supportsHijriCalendar()) return "";

  const gregorianKey = normalizeGregorianDateKey(value);
  if (!gregorianKey) return "";

  const probe = moment(gregorianKey, "YYYY-MM-DD", true).locale("en");
  if (!probe.isValid()) return "";

  const year = probe.iYear();
  const month = probe.iMonth() + 1;
  const day = probe.iDate();
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return "";
  }

  const hijriKey = `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(
    day,
  )}`;
  return hijriDateToGregorianKey(hijriKey) === gregorianKey ? hijriKey : "";
};

export const normalizePaidReportCalendarType = (value = "gregorian") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized || normalized === "gregorian") return "gregorian";
  if (normalized === "hijri") return "hijri";
  return "";
};

export const gregorianDateToCalendarKey = (
  value = "",
  calendarType = "gregorian",
) => {
  const normalizedCalendar = normalizePaidReportCalendarType(calendarType);
  if (!normalizedCalendar) return "";
  return normalizedCalendar === "hijri"
    ? gregorianDateToHijriKey(value)
    : normalizeGregorianDateKey(value);
};

export const resolvePaidReportDateRange = ({
  calendarType = "gregorian",
  from = "",
  to = "",
} = {}) => {
  const normalizedCalendar = normalizePaidReportCalendarType(calendarType);
  if (!normalizedCalendar) {
    return {
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.INVALID_CALENDAR,
    };
  }

  const normalizedFromInput = normalizeDateDigits(from).trim();
  const normalizedToInput = normalizeDateDigits(to).trim();
  const convert =
    normalizedCalendar === "hijri"
      ? hijriDateToGregorianKey
      : normalizeGregorianDateKey;
  const dateFrom = normalizedFromInput ? convert(normalizedFromInput) : "";
  const dateTo = normalizedToInput ? convert(normalizedToInput) : "";

  if (normalizedFromInput && !dateFrom) {
    return {
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.INVALID_FROM,
    };
  }
  if (normalizedToInput && !dateTo) {
    return {
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.INVALID_TO,
    };
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return {
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.REVERSED_RANGE,
    };
  }

  return { dateFrom, dateTo };
};
