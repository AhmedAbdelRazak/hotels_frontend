import {
	reconcilePricingRowsToStay,
	totalFromRoomPricingRows,
} from "./reservationStayPricing";

describe("reservation stay pricing", () => {
	test("keeps every saved field and price for dates that remain in the stay", () => {
		const rows = [
			{
				date: "2026-07-25",
				price: 70,
				totalPriceWithCommission: 75,
				rootPrice: 60,
				commissionRate: 25,
				marker: "first",
			},
			{
				date: "2026-07-26",
				price: 85,
				totalPriceWithCommission: 90,
				rootPrice: 70,
				commissionRate: 20,
				marker: "second",
			},
		];

		expect(
			reconcilePricingRowsToStay({
				existingRows: rows,
				stayDates: ["2026-07-25", "2026-07-26"],
				fallbackNightlyPrice: 82.5,
			}),
		).toEqual(rows);
	});

	test("extends checkout using the nearest saved nightly price without altering old nights", () => {
		const rows = [
			{ date: "2026-07-25", price: 75, totalPriceWithCommission: 75 },
			{ date: "2026-07-26", price: 90, totalPriceWithCommission: 90 },
		];
		const result = reconcilePricingRowsToStay({
			existingRows: rows,
			stayDates: ["2026-07-25", "2026-07-26", "2026-07-27"],
			fallbackNightlyPrice: 82.5,
		});

		expect(result.slice(0, 2)).toEqual(rows);
		expect(result[2]).toMatchObject({
			date: "2026-07-27",
			price: 90,
			totalPriceWithCommission: 90,
		});
	});

	test("calculates the total from actual per-day rows rather than an average", () => {
		expect(
			totalFromRoomPricingRows([
				{
					count: 2,
					pricingByDay: [
						{ totalPriceWithCommission: 75 },
						{ totalPriceWithCommission: 90 },
					],
				},
				{ pricingByDay: [{ totalPriceWithCommission: 40.25 }] },
			]),
		).toBe(370.25);
	});
});
