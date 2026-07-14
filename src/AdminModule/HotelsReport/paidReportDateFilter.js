import moment from "moment-hijri";

const GREGORIAN_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const HIJRI_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const PAID_REPORT_DATE_ERRORS = Object.freeze({
  INVALID_CALENDAR: "invalid_calendar",
  INVALID_FROM: "invalid_from",
  INVALID_TO: "invalid_to",
  REVERSED_RANGE: "reversed_range",
  INVALID_YEAR: "invalid_year",
  INVALID_MONTH: "invalid_month",
  YEAR_REQUIRED: "year_required",
});

export const PAID_REPORT_ALL_PERIODS = "all";
export const PAID_REPORT_YEAR_COUNT = 3;

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

const getReferenceMoment = (referenceDate = new Date()) => {
  const reference = new Date(referenceDate);
  if (Number.isNaN(reference.getTime())) return null;

  // The report backend applies day boundaries in Asia/Riyadh. Resolve the
  // visible "current year" in the same named timezone so admins around the
  // world receive identical options at calendar-year boundaries.
  const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const readPart = (type) => parts.find((part) => part.type === type)?.value;
  const dateKey = normalizeGregorianDateKey(
    `${readPart("year")}-${readPart("month")}-${readPart("day")}`,
  );
  if (!dateKey) return null;

  const probe = moment(dateKey, "YYYY-MM-DD", true).locale("en");
  return probe.isValid() ? probe : null;
};

export const getPaidReportCurrentYear = (
  calendarType = "gregorian",
  referenceDate = new Date(),
) => {
  const normalizedCalendar = normalizePaidReportCalendarType(calendarType);
  const probe = getReferenceMoment(referenceDate);
  if (!normalizedCalendar || !probe) return null;

  const year =
    normalizedCalendar === "hijri"
      ? probe.iYear()
      : Number(probe.format("YYYY"));
  return Number.isInteger(year) ? year : null;
};

export const getPaidReportYearValues = (
  calendarType = "gregorian",
  referenceDate = new Date(),
) => {
  const currentYear = getPaidReportCurrentYear(calendarType, referenceDate);
  if (!Number.isInteger(currentYear)) return [];

  return Array.from({ length: PAID_REPORT_YEAR_COUNT }, (_, index) =>
    String(currentYear - index),
  );
};

const gregorianMonthEndDay = (year, month) => {
  const probe = new Date(Date.UTC(2000, 0, 1, 12, 0, 0, 0));
  probe.setUTCFullYear(year, month, 0);
  return probe.getUTCDate();
};

const resolveGregorianPeriod = (year, month) => {
  const startMonth = month || 1;
  const endMonth = month || 12;
  const endDay = gregorianMonthEndDay(year, endMonth);

  return {
    dateFrom: `${String(year).padStart(4, "0")}-${pad2(startMonth)}-01`,
    dateTo: `${String(year).padStart(4, "0")}-${pad2(endMonth)}-${pad2(
      endDay,
    )}`,
  };
};

const resolveHijriPeriod = (year, month) => {
  const startMonth = month || 1;
  const endMonth = month || 12;
  const endMonthProbe = moment()
    .locale("en")
    .iDate(1)
    .iYear(year)
    .iMonth(endMonth - 1)
    .startOf("day");
  const endDay = endMonthProbe.iDaysInMonth();
  if (!Number.isInteger(endDay)) return null;

  const dateFrom = hijriDateToGregorianKey(
    `${String(year).padStart(4, "0")}-${pad2(startMonth)}-01`,
  );
  const dateTo = hijriDateToGregorianKey(
    `${String(year).padStart(4, "0")}-${pad2(endMonth)}-${pad2(endDay)}`,
  );
  return dateFrom && dateTo ? { dateFrom, dateTo } : null;
};

export const resolvePaidReportPeriod = ({
  calendarType = "gregorian",
  year = PAID_REPORT_ALL_PERIODS,
  month = PAID_REPORT_ALL_PERIODS,
  referenceDate = new Date(),
} = {}) => {
  const normalizedCalendar = normalizePaidReportCalendarType(calendarType);
  if (!normalizedCalendar) {
    return {
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.INVALID_CALENDAR,
    };
  }

  const normalizedYear = normalizeDateDigits(year).trim().toLowerCase();
  const normalizedMonth = normalizeDateDigits(month).trim().toLowerCase();
  const allYears =
    !normalizedYear || normalizedYear === PAID_REPORT_ALL_PERIODS;
  const allMonths =
    !normalizedMonth || normalizedMonth === PAID_REPORT_ALL_PERIODS;

  if (allYears) {
    if (!allMonths) {
      return {
        dateFrom: "",
        dateTo: "",
        error: PAID_REPORT_DATE_ERRORS.YEAR_REQUIRED,
      };
    }
    return { dateFrom: "", dateTo: "" };
  }

  const allowedYears = getPaidReportYearValues(
    normalizedCalendar,
    referenceDate,
  );
  if (
    !/^\d{4}$/.test(normalizedYear) ||
    !allowedYears.includes(normalizedYear)
  ) {
    return {
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.INVALID_YEAR,
    };
  }

  let monthNumber = null;
  if (!allMonths) {
    if (!/^(?:[1-9]|1[0-2])$/.test(normalizedMonth)) {
      return {
        dateFrom: "",
        dateTo: "",
        error: PAID_REPORT_DATE_ERRORS.INVALID_MONTH,
      };
    }
    monthNumber = Number(normalizedMonth);
  }

  const yearNumber = Number(normalizedYear);
  const resolved =
    normalizedCalendar === "hijri"
      ? resolveHijriPeriod(yearNumber, monthNumber)
      : resolveGregorianPeriod(yearNumber, monthNumber);

  return (
    resolved || {
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.INVALID_CALENDAR,
    }
  );
};

export const inferPaidReportPeriodSelection = ({
  calendarType = "gregorian",
  dateFrom = "",
  dateTo = "",
  referenceDate = new Date(),
} = {}) => {
  const emptySelection = {
    year: PAID_REPORT_ALL_PERIODS,
    month: PAID_REPORT_ALL_PERIODS,
  };
  const normalizedFrom = normalizeGregorianDateKey(dateFrom);
  const normalizedTo = normalizeGregorianDateKey(dateTo);
  if (!normalizedFrom && !normalizedTo) return emptySelection;
  if (!normalizedFrom || !normalizedTo) return emptySelection;

  const years = getPaidReportYearValues(calendarType, referenceDate);
  for (const year of years) {
    const fullYear = resolvePaidReportPeriod({
      calendarType,
      year,
      month: PAID_REPORT_ALL_PERIODS,
      referenceDate,
    });
    if (
      fullYear.dateFrom === normalizedFrom &&
      fullYear.dateTo === normalizedTo
    ) {
      return { year, month: PAID_REPORT_ALL_PERIODS };
    }

    for (let month = 1; month <= 12; month += 1) {
      const fullMonth = resolvePaidReportPeriod({
        calendarType,
        year,
        month: String(month),
        referenceDate,
      });
      if (
        fullMonth.dateFrom === normalizedFrom &&
        fullMonth.dateTo === normalizedTo
      ) {
        return { year, month: String(month) };
      }
    }
  }

  return emptySelection;
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
