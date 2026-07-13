import {
	canonicalPackageDateKey,
	classifyFixedPackage,
	getDefaultEligibleGregorianMonth,
	getGregorianMonthRange,
	getHijriMonthRange,
	isSameMonthlyPackageSelection,
	parseHijriMonthSelection,
	partitionFixedPackageRows,
} from "./packagePolicy";

describe("fixed package policy", () => {
	const today = "2026-07-16";

	it("uses an ISO date prefix without browser-time-zone shifting", () => {
		expect(canonicalPackageDateKey("2026-07-15T21:00:00.000Z")).toBe(
			"2026-07-15",
		);
	});

	it("rejects a package that has already started", () => {
		expect(
			classifyFixedPackage(
				{
					type: "offer",
					from: "2026-07-15",
					to: "2026-08-15",
					total: 3200,
				},
				today,
			),
		).toMatchObject({ eligible: false, status: "started" });
	});

	it("accepts a complete package beginning today or later", () => {
		expect(
			classifyFixedPackage(
				{
					type: "offer",
					from: "2026-07-16",
					to: "2026-08-16",
					total: 3200,
				},
				today,
			).eligible,
		).toBe(true);
		expect(
			classifyFixedPackage(
				{
					type: "offer",
					from: "2026-07-17",
					to: "2026-08-17",
					total: 3200,
				},
				today,
			).eligible,
		).toBe(true);
	});

	it("rejects invalid ranges and non-positive totals", () => {
		expect(
			classifyFixedPackage(
				{
					type: "offer",
					from: "2026-08-15",
					to: "2026-08-15",
					total: 100,
				},
				today,
			).eligible,
		).toBe(false);
		expect(
			classifyFixedPackage(
				{
					type: "offer",
					from: "2026-08-15",
					to: "2026-09-15",
					total: 0,
				},
				today,
			).eligible,
		).toBe(false);
	});

	it("allows an omitted or zero root total but rejects a negative root", () => {
		const base = {
			type: "offer",
			from: "2026-08-01",
			to: "2026-08-31",
			total: 3000,
		};
		expect(classifyFixedPackage(base, today).eligible).toBe(true);
		expect(classifyFixedPackage({ ...base, rootTotal: 0 }, today).eligible).toBe(
			true,
		);
		expect(
			classifyFixedPackage({ ...base, rootTotal: -1 }, today),
		).toMatchObject({ eligible: false, status: "invalid-root" });
	});

	it("defaults to the next untouched Gregorian month", () => {
		expect(getDefaultEligibleGregorianMonth(today)).toEqual({
			year: 2026,
			month: 7,
		});
		expect(getDefaultEligibleGregorianMonth("2026-07-01")).toEqual({
			year: 2026,
			month: 6,
		});
	});

	it("generates checkout-exclusive Gregorian and Hijri month ranges", () => {
		expect(getGregorianMonthRange(2026, 6)).toEqual({
			from: "2026-07-01",
			to: "2026-08-01",
		});
		const firstHijriMonth = getHijriMonthRange(1448, 0);
		const secondHijriMonth = getHijriMonthRange(1448, 1);
		expect(firstHijriMonth.to).toBe(secondHijriMonth.from);
		expect(firstHijriMonth.fromHijri).toBe("1448-01-01");
		expect(firstHijriMonth.toHijri).toBe("1448-02-01");
	});

	it("parses an explicit Hijri month without Gregorian conversion", () => {
		expect(parseHijriMonthSelection("1448-09-01")).toEqual({
			year: 1448,
			month: 8,
		});
		expect(parseHijriMonthSelection("١٤٤٨-٠٩-٠١")).toEqual({
			year: 1448,
			month: 8,
		});
		expect(parseHijriMonthSelection("1448-13-01")).toBeNull();
	});

	it("distinguishes price-only monthly edits from calendar changes", () => {
		const original = { calendarType: "hijri", year: 1448, month: 8 };
		expect(
			isSameMonthlyPackageSelection(original, {
				calendarType: "hijri",
				year: "1448",
				month: "8",
			}),
		).toBe(true);
		expect(
			isSameMonthlyPackageSelection(original, {
				calendarType: "hijri",
				year: 1448,
				month: 9,
			}),
		).toBe(false);
		expect(
			isSameMonthlyPackageSelection(original, {
				calendarType: "gregorian",
				year: 2027,
				month: 1,
			}),
		).toBe(false);
	});

	it("applies the public duration limits by package type", () => {
		expect(
			classifyFixedPackage(
				{
					type: "offer",
					from: "2026-08-01",
					to: "2026-09-15",
					total: 3000,
				},
				today,
			).eligible,
		).toBe(true);
		expect(
			classifyFixedPackage(
				{
					type: "offer",
					from: "2026-08-01",
					to: "2026-09-16",
					total: 3000,
				},
				today,
			),
		).toMatchObject({ eligible: false, status: "invalid-duration" });
		expect(
			classifyFixedPackage(
				{
					type: "monthly",
					from: "2026-08-01",
					to: "2026-10-15",
					total: 6000,
				},
				today,
			).eligible,
		).toBe(true);
		expect(
			classifyFixedPackage(
				{
					type: "monthly",
					from: "2026-08-01",
					to: "2026-10-16",
					total: 6000,
				},
				today,
			),
		).toMatchObject({ eligible: false, status: "invalid-duration" });
	});

	it("rejects starts beyond the Saudi current year plus five", () => {
		expect(
			classifyFixedPackage(
				{
					type: "offer",
					from: "2031-12-01",
					to: "2031-12-31",
					total: 3000,
				},
				today,
			).eligible,
		).toBe(true);
		expect(
			classifyFixedPackage(
				{
					type: "offer",
					from: "2032-01-01",
					to: "2032-01-31",
					total: 3000,
				},
				today,
			),
		).toMatchObject({ eligible: false, status: "too-far" });
	});

	it("keeps multiple source rows separate and preserves their totals", () => {
		const rows = [
			{
				_id: "first",
				monthFrom: "2026-08-01",
				monthTo: "2026-08-31",
				monthPrice: 3000,
			},
			{
				_id: "second",
				monthFrom: "2026-09-01",
				monthTo: "2026-09-30",
				monthPrice: 4100,
			},
		];
		const result = partitionFixedPackageRows(rows, {
			type: "monthly",
			getFrom: (row) => row.monthFrom,
			getTo: (row) => row.monthTo,
			getTotal: (row) => row.monthPrice,
			getRootTotal: (row) => row.monthRootPrice,
			todayKey: today,
		});

		expect(result.active).toHaveLength(2);
		expect(result.active.map(({ row }) => row._id)).toEqual([
			"first",
			"second",
		]);
		expect(result.active.map(({ row }) => row.monthPrice)).toEqual([
			3000,
			4100,
		]);
	});
});
