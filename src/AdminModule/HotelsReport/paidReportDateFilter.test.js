import {
  PAID_REPORT_ALL_PERIODS,
  PAID_REPORT_DATE_ERRORS,
  getPaidReportCurrentYear,
  getPaidReportYearValues,
  gregorianDateToCalendarKey,
  gregorianDateToHijriKey,
  hijriDateToGregorianKey,
  inferPaidReportPeriodSelection,
  normalizeDateDigits,
  normalizeGregorianDateKey,
  normalizePaidReportCalendarType,
  resolvePaidReportDateRange,
  resolvePaidReportPeriod,
} from "./paidReportDateFilter";

const REFERENCE_DATE = new Date("2026-07-14T12:00:00.000Z");

describe("paid report date filter helpers", () => {
  it("normalizes Arabic-Indic and Persian digits without changing other text", () => {
    expect(normalizeDateDigits("١٤٤٨-٠٢-٠١")).toBe("1448-02-01");
    expect(normalizeDateDigits("۱۴۴۸-۰۲-۰۱")).toBe("1448-02-01");
    expect(normalizeDateDigits(" ٢٠٢٦-٠٧-١٥ ")).toBe(" 2026-07-15 ");
  });

  it("accepts only exact, real Gregorian date keys", () => {
    expect(normalizeGregorianDateKey("2024-02-29")).toBe("2024-02-29");
    expect(normalizeGregorianDateKey("٢٠٢٦-٠٧-١٥")).toBe("2026-07-15");
    expect(normalizeGregorianDateKey("2026-02-29")).toBe("");
    expect(normalizeGregorianDateKey("2026-02-31")).toBe("");
    expect(normalizeGregorianDateKey("2026-13-01")).toBe("");
    expect(normalizeGregorianDateKey("2026-7-15")).toBe("");
    expect(normalizeGregorianDateKey("2026-07-15T00:00:00Z")).toBe("");
  });

  it("converts exact Hijri dates to ASCII Gregorian keys", () => {
    expect(hijriDateToGregorianKey("1448-01-29")).toBe("2026-07-14");
    expect(hijriDateToGregorianKey("١٤٤٨-٠٢-٠١")).toBe("2026-07-15");
    expect(hijriDateToGregorianKey("۱۴۴۸-۰۲-۰۱")).toBe("2026-07-15");
  });

  it("rejects overflowing and unsupported Hijri dates instead of normalizing them", () => {
    expect(hijriDateToGregorianKey("1448-01-30")).toBe("");
    expect(hijriDateToGregorianKey("1448-01-31")).toBe("");
    expect(hijriDateToGregorianKey("1448-13-01")).toBe("");
    expect(hijriDateToGregorianKey("1448-1-01")).toBe("");
    expect(hijriDateToGregorianKey("1300-01-01")).toBe("");
    expect(hijriDateToGregorianKey("1501-01-01")).toBe("");
  });

  it("converts Gregorian keys to exact ASCII Hijri keys and round-trips", () => {
    expect(gregorianDateToHijriKey("2026-07-14")).toBe("1448-01-29");
    expect(gregorianDateToHijriKey("٢٠٢٦-٠٧-١٥")).toBe("1448-02-01");
    expect(gregorianDateToHijriKey("2026-02-31")).toBe("");

    const hijri = gregorianDateToHijriKey("2030-01-05");
    expect(hijriDateToGregorianKey(hijri)).toBe("2030-01-05");
  });

  it("provides calendar-switch values without changing the canonical day", () => {
    expect(gregorianDateToCalendarKey("2026-07-15", "gregorian")).toBe(
      "2026-07-15",
    );
    expect(gregorianDateToCalendarKey("2026-07-15", "hijri")).toBe(
      "1448-02-01",
    );
    expect(gregorianDateToCalendarKey("2026-07-15", "unknown")).toBe("");
    expect(normalizePaidReportCalendarType()).toBe("gregorian");
    expect(normalizePaidReportCalendarType(" HIJRI ")).toBe("hijri");
  });

  it("resolves Gregorian ranges with empty sides and normalized digits", () => {
    expect(
      resolvePaidReportDateRange({
        calendarType: "gregorian",
        from: " ٢٠٢٦-٠٧-١٤ ",
        to: "2026-07-15",
      }),
    ).toEqual({ dateFrom: "2026-07-14", dateTo: "2026-07-15" });
    expect(resolvePaidReportDateRange({ from: "2026-07-14" })).toEqual({
      dateFrom: "2026-07-14",
      dateTo: "",
    });
    expect(resolvePaidReportDateRange({ to: "2026-07-15" })).toEqual({
      dateFrom: "",
      dateTo: "2026-07-15",
    });
    expect(resolvePaidReportDateRange()).toEqual({ dateFrom: "", dateTo: "" });
  });

  it("resolves Hijri ranges to their Gregorian API keys", () => {
    expect(
      resolvePaidReportDateRange({
        calendarType: "hijri",
        from: "1448-01-29",
        to: "1448-02-01",
      }),
    ).toEqual({ dateFrom: "2026-07-14", dateTo: "2026-07-15" });
  });

  it("returns stable errors for invalid and reversed ranges", () => {
    expect(
      resolvePaidReportDateRange({
        calendarType: "gregorian",
        from: "2026-02-31",
        to: "2026-07-15",
      }),
    ).toEqual({
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.INVALID_FROM,
    });
    expect(
      resolvePaidReportDateRange({
        calendarType: "hijri",
        from: "1448-01-29",
        to: "1448-01-30",
      }),
    ).toEqual({
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.INVALID_TO,
    });
    expect(
      resolvePaidReportDateRange({
        from: "2026-07-16",
        to: "2026-07-15",
      }),
    ).toEqual({
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.REVERSED_RANGE,
    });
    expect(
      resolvePaidReportDateRange({
        calendarType: "lunar",
        from: "2026-07-15",
      }),
    ).toEqual({
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.INVALID_CALENDAR,
    });
  });

  it("offers exactly the current Riyadh calendar year and two prior years", () => {
    expect(getPaidReportYearValues("gregorian", REFERENCE_DATE)).toEqual([
      "2026",
      "2025",
      "2024",
    ]);
    expect(getPaidReportYearValues("hijri", REFERENCE_DATE)).toEqual([
      "1448",
      "1447",
      "1446",
    ]);
  });

  it("uses Riyadh civil-day boundaries when resolving the current year", () => {
    expect(
      getPaidReportCurrentYear(
        "gregorian",
        new Date("2025-12-31T20:59:59.000Z"),
      ),
    ).toBe(2025);
    expect(
      getPaidReportCurrentYear(
        "gregorian",
        new Date("2025-12-31T21:00:00.000Z"),
      ),
    ).toBe(2026);
    expect(
      getPaidReportCurrentYear("hijri", new Date("2026-06-15T20:59:59.000Z")),
    ).toBe(1447);
    expect(
      getPaidReportCurrentYear("hijri", new Date("2026-06-15T21:00:00.000Z")),
    ).toBe(1448);
  });

  it("resolves complete Gregorian months and years without clamping to today", () => {
    expect(
      resolvePaidReportPeriod({
        calendarType: "gregorian",
        year: "2024",
        month: "2",
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({ dateFrom: "2024-02-01", dateTo: "2024-02-29" });
    expect(
      resolvePaidReportPeriod({
        calendarType: "gregorian",
        year: "2026",
        month: "2",
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({ dateFrom: "2026-02-01", dateTo: "2026-02-28" });
    expect(
      resolvePaidReportPeriod({
        calendarType: "gregorian",
        year: "2026",
        month: PAID_REPORT_ALL_PERIODS,
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({ dateFrom: "2026-01-01", dateTo: "2026-12-31" });
  });

  it("resolves complete 29-day, 30-day, and full Hijri periods", () => {
    expect(
      resolvePaidReportPeriod({
        calendarType: "hijri",
        year: "1448",
        month: "1",
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({ dateFrom: "2026-06-16", dateTo: "2026-07-14" });
    expect(
      resolvePaidReportPeriod({
        calendarType: "hijri",
        year: "1448",
        month: "2",
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({ dateFrom: "2026-07-15", dateTo: "2026-08-13" });
    expect(
      resolvePaidReportPeriod({
        calendarType: "hijri",
        year: "1448",
        month: PAID_REPORT_ALL_PERIODS,
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({ dateFrom: "2026-06-16", dateTo: "2027-06-05" });
  });

  it("keeps All dates unfiltered and rejects a month without a year", () => {
    expect(
      resolvePaidReportPeriod({
        year: PAID_REPORT_ALL_PERIODS,
        month: PAID_REPORT_ALL_PERIODS,
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({ dateFrom: "", dateTo: "" });
    expect(
      resolvePaidReportPeriod({
        year: PAID_REPORT_ALL_PERIODS,
        month: "7",
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({
      dateFrom: "",
      dateTo: "",
      error: PAID_REPORT_DATE_ERRORS.YEAR_REQUIRED,
    });
  });

  it("normalizes localized selections and rejects unavailable values", () => {
    expect(
      resolvePaidReportPeriod({
        calendarType: "hijri",
        year: "\u0661\u0664\u0664\u0668",
        month: "\u06f2",
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({ dateFrom: "2026-07-15", dateTo: "2026-08-13" });
    expect(
      resolvePaidReportPeriod({
        year: "2023",
        month: "1",
        referenceDate: REFERENCE_DATE,
      }).error,
    ).toBe(PAID_REPORT_DATE_ERRORS.INVALID_YEAR);
    expect(
      resolvePaidReportPeriod({
        year: "2026",
        month: "13",
        referenceDate: REFERENCE_DATE,
      }).error,
    ).toBe(PAID_REPORT_DATE_ERRORS.INVALID_MONTH);
  });

  it("infers only exact selectable full calendar periods", () => {
    expect(
      inferPaidReportPeriodSelection({
        calendarType: "gregorian",
        dateFrom: "2026-07-01",
        dateTo: "2026-07-31",
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({ year: "2026", month: "7" });
    expect(
      inferPaidReportPeriodSelection({
        calendarType: "hijri",
        dateFrom: "2026-06-16",
        dateTo: "2027-06-05",
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({ year: "1448", month: PAID_REPORT_ALL_PERIODS });
    expect(
      inferPaidReportPeriodSelection({
        calendarType: "hijri",
        dateFrom: "2026-07-01",
        dateTo: "2026-07-31",
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({
      year: PAID_REPORT_ALL_PERIODS,
      month: PAID_REPORT_ALL_PERIODS,
    });
  });
});
