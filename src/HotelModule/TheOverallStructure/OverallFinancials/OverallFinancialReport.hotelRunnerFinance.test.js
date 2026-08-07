jest.mock("../../apiAdmin", () => ({}));

import {
	buildReservationExportRows,
	buildTotals,
	getFinancialReportCommission,
	getFinancialReportGross,
} from "./OverallFinancialReport";

const hotelRunnerReservation = (overrides = {}) => ({
	confirmation_number: "HR-REPORT-1",
	total_amount: 1000,
	sub_total: 700,
	commission: 0,
	adminPricing: { mode: "hotelrunner_api" },
	supplierData: {
		hotelRunner: {
			transport: "hotelrunner_api",
			reservationId: "hr-report-1",
		},
	},
	...overrides,
});

describe("overall financial HotelRunner commission guard", () => {
	it("exports and renders only canonical HotelRunner gross", () => {
		const canonical = hotelRunnerReservation({
			total_amount: 700,
			supplierData: {
				hotelRunner: {
					transport: "hotelrunner_api",
					reservationId: "hr-report-canonical",
					pricing: { grandTotal: 1000 },
				},
			},
		});
		const missing = hotelRunnerReservation({ total_amount: 700 });

		expect(getFinancialReportGross(canonical)).toMatchObject({
			available: true,
			amount: 1000,
		});
		expect(getFinancialReportGross(missing)).toMatchObject({
			available: false,
			amount: null,
		});
		expect(buildReservationExportRows([canonical, missing])).toEqual([
			expect.objectContaining({ Amount: 1000 }),
			expect.objectContaining({ Amount: "" }),
		]);
	});

	it("exports unreviewed commission as unavailable instead of known zero", () => {
		const reservation = hotelRunnerReservation();
		expect(getFinancialReportCommission(reservation)).toMatchObject({
			isHotelRunner: true,
			available: false,
			amount: null,
		});
		const [row] = buildReservationExportRows([reservation]);
		expect(row["Commission Due"]).toBe("");
		expect(row["Commission Finance Status"]).toMatch(/awaiting hotelrunner/i);
	});

	it("keeps a staff-reviewed zero available and fails closed on conflict", () => {
		const reviewedZero = hotelRunnerReservation({
			financial_cycle: { commissionAssigned: true, commissionAmount: 0 },
		});
		expect(getFinancialReportCommission(reviewedZero)).toMatchObject({
			available: true,
			amount: 0,
		});
		expect(buildReservationExportRows([reviewedZero])[0]).toMatchObject({
			"Commission Due": 0,
			"Commission Finance Status": "Commission reviewed",
		});

		const conflict = hotelRunnerReservation({
			commissionData: { assigned: true, amount: 25 },
			financial_cycle: { commissionAssigned: true, commissionAmount: 30 },
		});
		expect(getFinancialReportCommission(conflict)).toMatchObject({
			available: false,
			amount: null,
			reason: "hotelrunner_platform_commission_conflict",
		});

		const invalid = hotelRunnerReservation({
			financial_cycle: {
				commissionAssigned: true,
				commissionAmount: false,
			},
		});
		expect(getFinancialReportCommission(invalid)).toMatchObject({
			available: false,
			amount: null,
			reason: "hotelrunner_platform_commission_invalid",
		});
		expect(
			buildReservationExportRows([invalid])[0]["Commission Finance Status"],
		).toMatch(/invalid hotelrunner/i);
	});

	it("preserves legacy commission and totals while counting unavailable rows", () => {
		expect(
			getFinancialReportCommission({
				commission: 0,
				financial_cycle: { commissionAmount: 25 },
			}),
		).toMatchObject({ isHotelRunner: false, available: true, amount: 25 });
		expect(
			buildTotals([
				{ commissionPaid: 10, commissionDue: 15 },
				{
					commissionPaid: 0,
					commissionDue: 0,
					commissionUnavailableCount: 1,
				},
			]),
		).toMatchObject({
			commissionPaid: 10,
			commissionDue: 15,
			commissionUnavailableCount: 1,
		});
	});
});
