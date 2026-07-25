/** @format */

import { allocateWeightedTotal } from "./otaPricingDistribution";

describe("allocateWeightedTotal", () => {
	it("preserves every cent when splitting a total across nights", () => {
		const allocation = allocateWeightedTotal(180.32, [1, 1, 1]);

		expect(allocation).toEqual({
			unitAmounts: [60.11, 60.11, 60.1],
			actualTotal: 180.32,
			exact: true,
		});
	});

	it("accounts for room counts while preserving the requested total", () => {
		const allocation = allocateWeightedTotal(10.01, [2, 1]);

		expect(allocation.unitAmounts).toEqual([3.34, 3.33]);
		expect(
			allocation.unitAmounts[0] * 2 + allocation.unitAmounts[1],
		).toBeCloseTo(10.01, 8);
		expect(allocation.exact).toBe(true);
	});
});

