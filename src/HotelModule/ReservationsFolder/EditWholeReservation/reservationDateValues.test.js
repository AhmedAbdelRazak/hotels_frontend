import dayjs from "dayjs";
import moment from "moment";
import { dateOnlyKey, datePickerValue } from "./reservationDateValues";

describe("hotel reservation editor date values", () => {
	test("keeps the calendar day selected by Ant Design", () => {
		const selectedCheckout = dayjs("2026-07-28");

		expect(dateOnlyKey(selectedCheckout)).toBe("2026-07-28");
		expect(datePickerValue(selectedCheckout).format("YYYY-MM-DD")).toBe(
			"2026-07-28",
		);
	});

	test("supports stored ISO strings without timezone day shifting", () => {
		expect(dateOnlyKey("2026-07-28T00:00:00.000Z")).toBe("2026-07-28");
	});

	test("supports existing Moment values during gradual library migration", () => {
		expect(dateOnlyKey(moment("2026-08-03", "YYYY-MM-DD"))).toBe(
			"2026-08-03",
		);
	});

	test("rejects empty and invalid date values", () => {
		expect(dateOnlyKey(null)).toBe("");
		expect(dateOnlyKey(dayjs("not-a-date"))).toBe("");
		expect(datePickerValue("not-a-date")).toBeNull();
	});
});
