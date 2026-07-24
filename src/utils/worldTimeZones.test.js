import {
	formatZoneDateTime,
	formatZoneHijriDate,
	SAUDI_TIME_ZONE,
} from "./worldTimeZones";

describe("world time-zone date formatting", () => {
	const value = "2026-07-24T12:00:00Z";

	it("keeps the Gregorian month before day and year", () => {
		expect(
			formatZoneDateTime(value, SAUDI_TIME_ZONE, false, {
				includeZoneName: false,
			}),
		).toMatch(/^Jul 24, 2026/);
	});

	it("keeps the localized Arabic month before day and year", () => {
		expect(
			formatZoneDateTime(value, SAUDI_TIME_ZONE, true, {
				includeZoneName: false,
			}),
		).toMatch(/^يوليو 24، 2026/);
	});

	it("keeps Hijri clock dates month first", () => {
		expect(formatZoneHijriDate(value, SAUDI_TIME_ZONE, false)).toMatch(
			/^\S+(?:\s\S+)* \d{1,2}, \d{4}/,
		);
	});
});
