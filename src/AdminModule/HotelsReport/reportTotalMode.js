export const REPORT_TOTAL_MODES = Object.freeze({
	GROSS: "gross",
	NET: "net",
});

export const DEFAULT_REPORT_TOTAL_MODE = REPORT_TOTAL_MODES.NET;

export const normalizeReportTotalMode = (
	value,
	fallback = DEFAULT_REPORT_TOTAL_MODE,
) => {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	return Object.values(REPORT_TOTAL_MODES).includes(normalized)
		? normalized
		: fallback;
};

// Net is the report default and therefore needs no URL state. Keeping only the
// non-default value makes old inventory links remain canonical and shareable.
export const reportTotalModeQueryValue = (value) =>
	normalizeReportTotalMode(value) === REPORT_TOTAL_MODES.GROSS
		? REPORT_TOTAL_MODES.GROSS
		: "";
