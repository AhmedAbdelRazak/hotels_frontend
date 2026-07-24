import {
	formatSaudiDate,
	formatSaudiDateTime,
	formatSaudiGregorianDate,
} from "./saudiDates";

describe("localized Saudi date presentation", () => {
	const value = "2026-07-24T12:00:00.000Z";

	test("formats English dates with the full month name first", () => {
		expect(formatSaudiGregorianDate(value)).toBe("July 24, 2026");
		expect(formatSaudiDate(value)).toBe("July 24, 2026");
	});

	test("formats Arabic dates with the localized full month name first", () => {
		expect(
			formatSaudiGregorianDate(value, { language: "Arabic" }),
		).toBe("يوليو 24، 2026");
	});

	test("keeps the same date order when a time is included", () => {
		expect(
			formatSaudiDateTime(value, { language: "English" }),
		).toMatch(/^July 24, 2026 - /);
		expect(
			formatSaudiDateTime(value, { language: "Arabic" }),
		).toMatch(/^يوليو 24، 2026 - /);
	});

	test("preserves the requested fallback for invalid values", () => {
		expect(
			formatSaudiGregorianDate("not-a-date", { fallback: "N/A" }),
		).toBe("N/A");
	});
});
