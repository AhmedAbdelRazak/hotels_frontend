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

export const getPaidReportCurrentMonth = (
  calendarType = "gregorian",
  referenceDate = new Date(),
) => {
  const normalizedCalendar = normalizePaidReportCalendarType(calendarType);
  const probe = getReferenceMoment(referenceDate);
  if (!normalizedCalendar || !probe) return null;

  const month =
    normalizedCalendar === "hijri"
      ? probe.iMonth() + 1
      : Number(probe.format("M"));
  return Number.isInteger(month) && month >= 1 && month <= 12
    ? String(month)
    : null;
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

const emptyPeriodsResult = (error) => ({
  dateFrom: "",
  dateTo: "",
  dateRanges: [],
  ...(error ? { error } : {}),
});

const normalizePeriodMonths = (months) => {
  const values = Array.isArray(months)
    ? months
    : months === undefined || months === null || months === ""
      ? [PAID_REPORT_ALL_PERIODS]
      : [months];
  if (!values.length) return [PAID_REPORT_ALL_PERIODS];

  return Array.from(
    new Set(
      values.map((month) => normalizeDateDigits(month).trim().toLowerCase()),
    ),
  );
};

export const resolvePaidReportPeriods = ({
  calendarType = "gregorian",
  year = PAID_REPORT_ALL_PERIODS,
  months = [PAID_REPORT_ALL_PERIODS],
  referenceDate = new Date(),
} = {}) => {
  const normalizedCalendar = normalizePaidReportCalendarType(calendarType);
  if (!normalizedCalendar) {
    return emptyPeriodsResult(PAID_REPORT_DATE_ERRORS.INVALID_CALENDAR);
  }

  const normalizedYear = normalizeDateDigits(year).trim().toLowerCase();
  const allYears =
    !normalizedYear || normalizedYear === PAID_REPORT_ALL_PERIODS;
  const normalizedMonths = normalizePeriodMonths(months);
  const hasAllMonths = normalizedMonths.includes(PAID_REPORT_ALL_PERIODS);

  if (hasAllMonths && normalizedMonths.length > 1) {
    return emptyPeriodsResult(PAID_REPORT_DATE_ERRORS.INVALID_MONTH);
  }
  if (allYears) {
    return hasAllMonths
      ? emptyPeriodsResult()
      : emptyPeriodsResult(PAID_REPORT_DATE_ERRORS.YEAR_REQUIRED);
  }

  const allowedYears = getPaidReportYearValues(
    normalizedCalendar,
    referenceDate,
  );
  if (
    !/^\d{4}$/.test(normalizedYear) ||
    !allowedYears.includes(normalizedYear)
  ) {
    return emptyPeriodsResult(PAID_REPORT_DATE_ERRORS.INVALID_YEAR);
  }

  if (hasAllMonths) {
    const resolved = resolvePaidReportPeriod({
      calendarType: normalizedCalendar,
      year: normalizedYear,
      month: PAID_REPORT_ALL_PERIODS,
      referenceDate,
    });
    return resolved.error
      ? emptyPeriodsResult(resolved.error)
      : { ...resolved, dateRanges: [] };
  }

  if (
    !normalizedMonths.length ||
    normalizedMonths.some((month) => !/^(?:[1-9]|1[0-2])$/.test(month))
  ) {
    return emptyPeriodsResult(PAID_REPORT_DATE_ERRORS.INVALID_MONTH);
  }

  const sortedMonths = normalizedMonths
    .map(Number)
    .sort((left, right) => left - right);
  const dateRanges = sortedMonths.map((month) =>
    resolvePaidReportPeriod({
      calendarType: normalizedCalendar,
      year: normalizedYear,
      month: String(month),
      referenceDate,
    }),
  );
  const error = dateRanges.find((range) => range.error)?.error;
  if (error) return emptyPeriodsResult(error);

  if (dateRanges.length === 1) {
    return { ...dateRanges[0], dateRanges: [] };
  }

  return {
    dateFrom: "",
    dateTo: "",
    dateRanges,
  };
};

const periodSelection = (
  year = PAID_REPORT_ALL_PERIODS,
  months = [PAID_REPORT_ALL_PERIODS],
) => {
  const normalizedMonths = normalizePeriodMonths(months);
  return {
    year,
    month:
      normalizedMonths.length === 1
        ? normalizedMonths[0]
        : PAID_REPORT_ALL_PERIODS,
    months: normalizedMonths,
  };
};

const normalizedInferenceRanges = (dateRanges) => {
  if (!Array.isArray(dateRanges) || !dateRanges.length) return [];

  const normalized = [];
  for (const range of dateRanges) {
    if (!range || typeof range !== "object" || Array.isArray(range))
      return null;
    const dateFrom = normalizeGregorianDateKey(range.dateFrom);
    const dateTo = normalizeGregorianDateKey(range.dateTo);
    if (!dateFrom || !dateTo || dateFrom > dateTo) return null;
    normalized.push({ dateFrom, dateTo });
  }

  return Array.from(
    new Map(
      normalized.map((range) => [`${range.dateFrom}|${range.dateTo}`, range]),
    ).values(),
  ).sort(
    (left, right) =>
      left.dateFrom.localeCompare(right.dateFrom) ||
      left.dateTo.localeCompare(right.dateTo),
  );
};

export const inferPaidReportPeriodSelection = ({
  calendarType = "gregorian",
  dateFrom = "",
  dateTo = "",
  dateRanges = [],
  referenceDate = new Date(),
} = {}) => {
  const emptySelection = periodSelection();
  const normalizedRanges = normalizedInferenceRanges(dateRanges);
  if (normalizedRanges === null) return emptySelection;

  const years = getPaidReportYearValues(calendarType, referenceDate);
  if (normalizedRanges.length) {
    const matchedPeriods = normalizedRanges.map((range) => {
      for (const year of years) {
        const fullYear = resolvePaidReportPeriod({
          calendarType,
          year,
          month: PAID_REPORT_ALL_PERIODS,
          referenceDate,
        });
        if (
          fullYear.dateFrom === range.dateFrom &&
          fullYear.dateTo === range.dateTo
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
            fullMonth.dateFrom === range.dateFrom &&
            fullMonth.dateTo === range.dateTo
          ) {
            return { year, month: String(month) };
          }
        }
      }
      return null;
    });
    if (matchedPeriods.some((period) => !period)) return emptySelection;

    const matchedYears = new Set(matchedPeriods.map((period) => period.year));
    if (matchedYears.size !== 1) return emptySelection;
    if (
      matchedPeriods.some((period) => period.month === PAID_REPORT_ALL_PERIODS)
    ) {
      return matchedPeriods.length === 1
        ? periodSelection(matchedPeriods[0].year)
        : emptySelection;
    }

    const months = Array.from(
      new Set(matchedPeriods.map((period) => period.month)),
    ).sort((left, right) => Number(left) - Number(right));
    return periodSelection(matchedPeriods[0].year, months);
  }

  const normalizedFrom = normalizeGregorianDateKey(dateFrom);
  const normalizedTo = normalizeGregorianDateKey(dateTo);
  if (!normalizedFrom && !normalizedTo) return emptySelection;
  if (!normalizedFrom || !normalizedTo) return emptySelection;

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
      return periodSelection(year);
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
        return periodSelection(year, [String(month)]);
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
