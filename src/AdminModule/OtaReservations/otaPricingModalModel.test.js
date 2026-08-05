/** @format */

import {
	applyTouchedOtaDistributions,
	otaPricingInitializationDecision,
	otaPricingNumberValue,
	parseLocalizedMoney,
	preferredOtaPricingRooms,
	prepareOtaPricingSave,
	resolveInitialOtaCommissionInput,
	resolveSavedOtaCommission,
	roundOtaMoney,
} from "./otaPricingModalModel";
import { recalculateOtaPricingDay } from "./otaPricingEditor";

const day = (date, clientPrice, rootPrice, netAfterExpenses) => ({
	date,
	price: clientPrice,
	clientPrice,
	mainPrice: clientPrice,
	totalPriceWithCommission: clientPrice,
	rootPrice,
	totalPriceWithoutCommission: rootPrice,
	netAfterExpenses,
	netAfterOtaExpenses: netAfterExpenses,
	otaExpenseAmount: clientPrice - netAfterExpenses,
	platformMargin: netAfterExpenses - rootPrice,
});

describe("localized OTA pricing money", () => {
	test("matches the backend grammar for localized decimals and grouping", () => {
		expect(parseLocalizedMoney("82,50")).toMatchObject({
			status: "valid",
			value: 82.5,
		});
		expect(parseLocalizedMoney("82.50")).toMatchObject({
			status: "valid",
			value: 82.5,
		});
		expect(parseLocalizedMoney("\u200f١٬٢٣٤٫٥٠\u200e")).toMatchObject({
			status: "valid",
			value: 1234.5,
		});
		expect(parseLocalizedMoney("\u2066۱٬۲۳۴٫۵۰\u2069")).toMatchObject({
			status: "valid",
			value: 1234.5,
		});
		expect(parseLocalizedMoney("1,234.50")).toMatchObject({
			status: "valid",
			value: 1234.5,
		});
		expect(parseLocalizedMoney("1.234,50")).toMatchObject({
			status: "valid",
			value: 1234.5,
		});
		expect(parseLocalizedMoney("1 234,50")).toMatchObject({
			status: "valid",
			value: 1234.5,
		});
		expect(parseLocalizedMoney("۱٬۲۳۴")).toMatchObject({
			status: "valid",
			value: 1234,
		});
		expect(parseLocalizedMoney("-۱۲٫۵")).toMatchObject({
			status: "valid",
			value: -12.5,
		});
	});

	test("distinguishes missing input and rejects values the backend rejects", () => {
		expect(parseLocalizedMoney(" \u200f ").status).toBe("missing");
		expect(parseLocalizedMoney(null).status).toBe("missing");
		for (const value of [
			"١٢x",
			"--12",
			"−۱۲٫۵",
			"82.500",
			"82,500",
			"82.5000",
			"1234,567",
			"1,23,4",
			"82,",
			".50",
			"1 23,50",
			"٨٢٬٥٠",
		]) {
			expect(parseLocalizedMoney(value).status).toBe("invalid");
		}
		expect(parseLocalizedMoney(82.555).status).toBe("invalid");
		expect(parseLocalizedMoney("90071992547410").status).toBe("invalid");
	});

	test("keeps computed float tails without relaxing typed-string validation", () => {
		const screenshotClientTotal = 69.85 * 11;
		const screenshotMarginRate = (-31.78 / 43.22) * 100;

		expect(roundOtaMoney(otaPricingNumberValue(screenshotClientTotal))).toBe(
			768.35,
		);
		expect(roundOtaMoney(otaPricingNumberValue(screenshotMarginRate))).toBe(
			-73.53,
		);
		expect(otaPricingNumberValue("82.500")).toBe(0);
	});
});

describe("OTA pricing draft initialization", () => {
	test("preserves an explicit zero commission instead of replacing it with 10 percent", () => {
		const reservation = {
			adminPricing: { commissionAmount: 0 },
			commission: 165,
		};

		expect(resolveSavedOtaCommission(reservation)).toMatchObject({
			status: "valid",
			value: 0,
			source: "adminPricing.commissionAmount",
		});
		expect(resolveInitialOtaCommissionInput(reservation, 825)).toMatchObject({
			value: 0,
			inputValue: "0.00",
		});
	});

	test("uses the projected saved commission and only defaults when none exists", () => {
		expect(
			resolveInitialOtaCommissionInput({ commission: "١٦٥٫٠٠" }, 825),
		).toMatchObject({
			value: 165,
			inputValue: "165.00",
			source: "commission",
		});
		expect(resolveInitialOtaCommissionInput({}, 825)).toMatchObject({
			status: "default",
			value: 82.5,
			inputValue: "82.50",
		});
	});

	test("prefers non-empty pickedRoomsPricing to match the backend contract", () => {
		const typeRooms = [{ displayName: "type source" }];
		const pricingRooms = [{ displayName: "pricing source" }];
		expect(
			preferredOtaPricingRooms({
				pickedRoomsType: typeRooms,
				pickedRoomsPricing: pricingRooms,
			}),
		).toBe(pricingRooms);
		expect(
			preferredOtaPricingRooms({
				pickedRoomsType: typeRooms,
				pickedRoomsPricing: [],
			}),
		).toBe(typeRooms);
	});

	test("initializes once per open reservation and resets only after close", () => {
		const firstOpen = otaPricingInitializationDecision({
			open: true,
			reservationKey: "reservation-1",
			initializedKey: "",
		});
		expect(firstOpen).toEqual({
			initialize: true,
			nextInitializedKey: "reservation-1",
		});
		expect(
			otaPricingInitializationDecision({
				open: true,
				reservationKey: "reservation-1",
				initializedKey: firstOpen.nextInitializedKey,
			}),
		).toEqual({ initialize: false, nextInitializedKey: "reservation-1" });
		expect(
			otaPricingInitializationDecision({
				open: false,
				reservationKey: "reservation-1",
				initializedKey: "reservation-1",
			}),
		).toEqual({ initialize: false, nextInitializedKey: "" });
	});
});

describe("touched OTA pricing distributions", () => {
	const variedRooms = () => [
		{
			room_type: "doubleRooms",
			displayName: "Double",
			count: 1,
			pricingByDay: [
				day("2026-08-16", 100, 50, 80),
				day("2026-08-17", 200, 60, 150),
			],
		},
	];

	test("changes only fields the user deliberately touched", () => {
		const original = variedRooms();
		const result = applyTouchedOtaDistributions({
			rooms: original,
			distributionValues: { client: "300", root: "١٢٠٫٠٠", net: "230" },
			distributionTouched: { client: false, root: true, net: false },
		});

		expect(result.ok).toBe(true);
		expect(result.appliedFields).toEqual(["root"]);
		expect(result.rooms[0].pricingByDay.map((row) => row.clientPrice)).toEqual([
			100, 200,
		]);
		expect(
			result.rooms[0].pricingByDay.map((row) => row.netAfterExpenses),
		).toEqual([80, 150]);
		expect(result.rooms[0].pricingByDay.map((row) => row.rootPrice)).toEqual([
			60, 60,
		]);
	});

	test("applies a valid touched draft during Save and preserves commission", () => {
		const result = prepareOtaPricingSave({
			rooms: variedRooms(),
			distributionValues: { root: "١٢٠٫٠٠" },
			distributionTouched: { root: true },
			commissionInput: "٨٢٫٥٠",
		});

		expect(result.ok).toBe(true);
		expect(result.appliedFields).toEqual(["root"]);
		expect(result.payload).toMatchObject({
			total_amount: 300,
			sub_total: 120,
			commission: 82.5,
			adminPricing: {
				clientTotal: 300,
				rootTotal: 120,
				commissionAmount: 82.5,
			},
		});
	});

	test("builds the screenshot totals without floating-point loss", () => {
		const rooms = [
			{
				room_type: "doubleRooms",
				displayName: "Double Room – Comfort & Relaxation",
				count: 1,
				pricingByDay: Array.from({ length: 11 }, (_, index) =>
					day(`2026-08-${String(index + 16).padStart(2, "0")}`, 69.85, 75, 43.22),
				),
			},
		];

		const result = prepareOtaPricingSave({
			rooms,
			commissionInput: "82,50",
		});

		expect(result.ok).toBe(true);
		expect(result.payload).toMatchObject({
			total_amount: 768.35,
			sub_total: 825,
			commission: 82.5,
			adminPricing: {
				netAfterExpensesTotal: 475.42,
				otaExpenseTotal: 292.93,
				platformMarginTotal: -349.58,
				commissionAmount: 82.5,
			},
		});
	});

	test("blocks a total that cannot be represented exactly for the room count", () => {
		const rooms = [
			{
				room_type: "doubleRooms",
				displayName: "Double",
				count: 2,
				pricingByDay: [day("2026-08-16", 20, 5, 15)],
			},
		];
		const result = applyTouchedOtaDistributions({
			rooms,
			distributionValues: { root: "10.01" },
			distributionTouched: { root: true },
		});

		expect(result).toMatchObject({
			ok: false,
			code: "inexact_distribution",
			requestedTotal: 10.01,
			actualTotal: 10,
		});
		expect(rooms[0].pricingByDay[0].rootPrice).toBe(5);
	});

	test("preserves exact cents with mixed room weights and supports explicit zero", () => {
		const rooms = [
			{
				room_type: "doubleRooms",
				displayName: "Double",
				count: 2,
				pricingByDay: [day("2026-08-16", 20, 5, 15)],
			},
			{
				room_type: "singleRooms",
				displayName: "Single",
				count: 1,
				pricingByDay: [day("2026-08-16", 10, 5, 8)],
			},
		];
		const exact = applyTouchedOtaDistributions({
			rooms,
			distributionValues: { root: "10.01" },
			distributionTouched: { root: true },
		});
		expect(exact.ok).toBe(true);
		expect(exact.rooms.map((room) => room.pricingByDay[0].rootPrice)).toEqual([
			3.34, 3.33,
		]);

		const zero = applyTouchedOtaDistributions({
			rooms: exact.rooms,
			distributionValues: { root: "٠" },
			distributionTouched: { root: true },
		});
		expect(zero.ok).toBe(true);
		expect(zero.rooms.map((room) => room.pricingByDay[0].rootPrice)).toEqual([
			0, 0,
		]);
	});

	test("never coerces missing, malformed, or negative commission to zero", () => {
		for (const commissionInput of ["", "٨٢x", "-١", "82.5000"]) {
			const result = prepareOtaPricingSave({
				rooms: variedRooms(),
				commissionInput,
			});
			expect(result.ok).toBe(false);
			expect(["invalid_commission", "negative_commission"]).toContain(
				result.code,
			);
		}
	});

	test("blocks cleared or malformed daily prices while allowing explicit zero", () => {
		const rooms = variedRooms();
		const cleared = recalculateOtaPricingDay(rooms[0].pricingByDay[0], {
			rootPrice: "",
		});
		const changedAnotherCell = recalculateOtaPricingDay(cleared, {
			clientPrice: "101",
		});
		rooms[0].pricingByDay[0] = changedAnotherCell;
		expect(changedAnotherCell.rootPrice).toBe("");
		expect(
			prepareOtaPricingSave({ rooms, commissionInput: "10" }),
		).toMatchObject({ ok: false, code: "invalid_daily_pricing" });

		const corrected = recalculateOtaPricingDay(changedAnotherCell, {
			rootPrice: "0",
		});
		rooms[0].pricingByDay[0] = corrected;
		expect(corrected.rootPrice).toBe(0);
		expect(prepareOtaPricingSave({ rooms, commissionInput: "10" }).ok).toBe(
			true,
		);

		for (const patch of [
			{ netAfterExpenses: "not-money" },
			{ rootPrice: "82,50" },
		]) {
			rooms[0].pricingByDay[0] = recalculateOtaPricingDay(corrected, patch);
			expect(
				prepareOtaPricingSave({ rooms, commissionInput: "10" }),
			).toMatchObject({ ok: false, code: "invalid_daily_pricing" });
		}
	});
});
