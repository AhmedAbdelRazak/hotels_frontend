import {
	normalizePricingRowForEditor,
	resolvePricingCommissionDraft,
	summarizePricingRowsForEditor,
} from "./EditPricingModal";

test("legacy pricing normalization keeps its existing derived commercial fields", () => {
	const row = normalizePricingRowForEditor({
		date: "2026-08-10",
		clientPrice: 120,
		rootPrice: 80,
	});

	expect(row.netAfterExpenses).toBe(120);
	expect(row.otaExpenseAmount).toBe(0);
	expect(row.platformMargin).toBe(40);
});

test("HotelRunner normalization preserves source prices without inventing commercial values", () => {
	const row = normalizePricingRowForEditor(
		{
			date: "2026-08-10",
			price: 120,
			rootPrice: 80,
			netAfterExpenses: null,
			otaExpenseAmount: null,
			platformMargin: null,
		},
		{ hotelRunnerSourceOwned: true }
	);

	expect(row.clientPrice).toBe(120);
	expect(row.rootPrice).toBe(80);
	expect(row.netAfterExpenses).toBeNull();
	expect(row.netAfterOtaExpenses).toBeNull();
	expect(row.otaExpenseAmount).toBeNull();
	expect(row.platformMargin).toBeNull();
	expect(row.commissionRate).toBeNull();
});

test("verified HotelRunner commercial values remain explicit and missing values remain unavailable", () => {
	const row = normalizePricingRowForEditor(
		{
			clientPrice: 120,
			rootPrice: 80,
			netAfterExpenses: 100,
			otaExpenseAmount: null,
			platformMargin: null,
		},
		{
			hotelRunnerSourceOwned: true,
			hotelRunnerCommercialVerified: true,
		}
	);

	expect(row.netAfterExpenses).toBe(100);
	expect(row.otaExpenseAmount).toBeNull();
	expect(row.platformMargin).toBeNull();
});

test("HotelRunner totals fail closed when any nightly commercial amount is unavailable", () => {
	const totals = summarizePricingRowsForEditor(
		[
			{ clientPrice: 100, rootPrice: 70, netAfterExpenses: 90 },
			{ clientPrice: 110, rootPrice: 75, netAfterExpenses: null },
		],
		{ hotelRunnerSourceOwned: true }
	);

	expect(totals.client).toBe(210);
	expect(totals.root).toBe(145);
	expect(totals.net).toBeNull();
	expect(totals.expense).toBeNull();
	expect(totals.margin).toBeNull();
});

test("HotelRunner never calculates platform commission from the gross/root spread", () => {
	expect(
		resolvePricingCommissionDraft({
			hotelRunnerSourceOwned: true,
			clientTotal: 120,
			rootTotal: 80,
		})
	).toBeNull();

	expect(
		resolvePricingCommissionDraft({
			hotelRunnerSourceOwned: true,
			commissionAmountIsOverride: true,
			commissionDraft: 0,
			clientTotal: 120,
			rootTotal: 80,
		})
	).toBe(0);
});
