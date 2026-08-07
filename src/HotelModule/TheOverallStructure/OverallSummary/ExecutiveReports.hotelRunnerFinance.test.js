jest.mock("../../apiAdmin", () => ({}));
jest.mock("react-apexcharts", () => () => null);
jest.mock("../../HotelReports/HotelInventory", () => () => null);
jest.mock("../OverallReservationsList/OverallReservationDetailsModal", () => () => null);

import { getExecutiveReservationCommission } from "./ExecutiveReports";

const hotelRunnerReservation = (overrides = {}) => ({
	total_amount: 1000,
	sub_total: 700,
	commission: 0,
	adminPricing: { mode: "hotelrunner_api" },
	supplierData: {
		hotelRunner: {
			transport: "hotelrunner_api",
			reservationId: "hr-executive-1",
		},
	},
	...overrides,
});

describe("executive HotelRunner commission guard", () => {
	it("does not infer commission from gross, root, or an unreviewed zero", () => {
		expect(
			getExecutiveReservationCommission(
				hotelRunnerReservation({
					adminPricing: { mode: "hotelrunner_api", rootTotal: 700 },
				}),
			),
		).toMatchObject({
			isHotelRunner: true,
			available: false,
			amount: null,
		});
	});

	it("accepts reviewed zero and rejects conflicting assigned evidence", () => {
		expect(
			getExecutiveReservationCommission(
				hotelRunnerReservation({
					financial_cycle: {
						commissionAssigned: true,
						commissionAmount: 0,
					},
				}),
			),
		).toMatchObject({ available: true, amount: 0 });

		expect(
			getExecutiveReservationCommission(
				hotelRunnerReservation({
					commissionData: { assigned: true, amount: 25 },
					financial_cycle: {
						commissionAssigned: true,
						commissionAmount: 30,
					},
				}),
			),
		).toMatchObject({
			available: false,
			amount: null,
			reason: "hotelrunner_platform_commission_conflict",
		});
	});

	it("preserves the legacy top-level then cycle fallback", () => {
		expect(
			getExecutiveReservationCommission({
				commission: 0,
				financial_cycle: { commissionAmount: 25 },
			}),
		).toEqual({
			isHotelRunner: false,
			available: true,
			amount: 25,
			reason: "",
		});
	});
});
