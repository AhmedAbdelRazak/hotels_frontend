import {
	DEFAULT_REPORT_TOTAL_MODE,
	REPORT_TOTAL_MODES,
	normalizeReportTotalMode,
	reportTotalModeQueryValue,
} from "./reportTotalMode";

describe("report total mode", () => {
	it("defaults reports to Net Total", () => {
		expect(DEFAULT_REPORT_TOTAL_MODE).toBe(REPORT_TOTAL_MODES.NET);
		expect(normalizeReportTotalMode()).toBe(REPORT_TOTAL_MODES.NET);
	});

	it("accepts only canonical gross and net values", () => {
		expect(normalizeReportTotalMode(" GROSS ")).toBe(REPORT_TOTAL_MODES.GROSS);
		expect(normalizeReportTotalMode("net")).toBe(REPORT_TOTAL_MODES.NET);
		expect(normalizeReportTotalMode("paid")).toBe(REPORT_TOTAL_MODES.NET);
		expect(normalizeReportTotalMode("paid", REPORT_TOTAL_MODES.GROSS)).toBe(
			REPORT_TOTAL_MODES.GROSS,
		);
	});

	it("keeps Net implicit in inventory URLs and serializes only Gross", () => {
		expect(reportTotalModeQueryValue()).toBe("");
		expect(reportTotalModeQueryValue("net")).toBe("");
		expect(reportTotalModeQueryValue("invalid")).toBe("");
		expect(reportTotalModeQueryValue(" GROSS ")).toBe("gross");
	});
});
