import {
  PAID_REPORT_DATE_ERRORS,
  gregorianDateToCalendarKey,
  gregorianDateToHijriKey,
  hijriDateToGregorianKey,
  normalizeDateDigits,
  normalizeGregorianDateKey,
  normalizePaidReportCalendarType,
  resolvePaidReportDateRange,
} from "./paidReportDateFilter";

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
});
