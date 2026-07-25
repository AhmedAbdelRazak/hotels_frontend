import {
	applyOtaRoomConfig,
	autoMapOtaPricingRooms,
	copyFirstOtaPricingRowValues,
	hasCurrentOtaRoomMapping,
	otaPricingRoomCount,
	summarizeOtaPricingRooms,
} from "./otaPricingEditor";

const roomOptions = [
	{
		hotelRoomConfigId: "triple-current",
		room_type: "tripleRooms",
		displayName: "Triple Room - Premium Comfort",
		configuredCount: 4,
	},
	{
		hotelRoomConfigId: "family-five",
		room_type: "familyRooms",
		displayName: "Family Five",
	},
	{
		hotelRoomConfigId: "family-six",
		room_type: "familyRooms",
		displayName: "Family Six",
	},
];

describe("OTA pricing editor room mapping and copy behavior", () => {
	test("repairs a renamed OTA room using a unique PMS room type without changing count", () => {
		const sourceRooms = [
			{
				room_type: "tripleRooms",
				displayName: "Triple Bed Room With Air Conditioning",
				count: 2,
				pricingByDay: [{ date: "2026-07-27", clientPrice: 67.67 }],
			},
		];
		const mapped = autoMapOtaPricingRooms(sourceRooms, roomOptions);

		expect(mapped[0]).toMatchObject({
			hotelRoomConfigId: "triple-current",
			room_type: "tripleRooms",
			displayName: "Triple Room - Premium Comfort",
			roomMappingStatus: "reviewed",
			count: 2,
		});
		expect(mapped[0].pricingByDay).toEqual(sourceRooms[0].pricingByDay);
		expect(hasCurrentOtaRoomMapping(mapped[0], roomOptions)).toBe(true);
		expect(otaPricingRoomCount(mapped[0])).toBe(2);
	});

	test("two rooms across three nights preserve the full OTA room count and total", () => {
		const pricingByDay = ["2026-07-27", "2026-07-28", "2026-07-29"].map(
			(date) => ({
				date,
				clientPrice: 67.67,
				rootPrice: 0,
				netAfterExpenses: 39.79,
				otaExpenseAmount: 27.88,
				platformMargin: 39.79,
			}),
		);
		const totals = summarizeOtaPricingRooms([
			{ count: 1, pricingByDay },
			{ count: 1, pricingByDay },
		]);

		expect(totals.totalRooms).toBe(2);
		expect(totals.clientTotal).toBeCloseTo(406.02, 8);
		expect(totals.netAfterExpensesTotal).toBeCloseTo(238.74, 8);
		expect(totals.otaExpenseTotal).toBeCloseTo(167.28, 8);
	});

	test("does not guess when a PMS room type has multiple active configurations", () => {
		const room = {
			room_type: "familyRooms",
			displayName: "Unrecognized OTA Family",
			count: 1,
		};

		expect(autoMapOtaPricingRooms([room], roomOptions)[0]).toEqual(room);
		expect(hasCurrentOtaRoomMapping(room, roomOptions)).toBe(false);
	});

	test("an explicit room choice keeps pricing and canonicalizes identity", () => {
		const selected = applyOtaRoomConfig(
			{
				room_type: "familyRooms",
				displayName: "OTA Family",
				count: 3,
				pricingByDay: [{ date: "2026-08-01", clientPrice: 100 }],
			},
			roomOptions[2],
		);

		expect(selected.hotelRoomConfigId).toBe("family-six");
		expect(selected.displayName).toBe("Family Six");
		expect(selected.count).toBe(3);
		expect(selected.pricingByDay[0].clientPrice).toBe(100);
	});

	test("copy first row updates every room-night while preserving dates, mappings, and counts", () => {
		const rooms = [
			{
				hotelRoomConfigId: "triple-current",
				count: 1,
				pricingByDay: [
					{
						date: "2026-07-27",
						clientPrice: 90,
						rootPrice: 60,
						netAfterExpenses: 75,
					},
					{
						date: "2026-07-28",
						clientPrice: 10,
						rootPrice: 5,
						netAfterExpenses: 8,
					},
				],
			},
			{
				hotelRoomConfigId: "triple-current",
				count: 2,
				pricingByDay: [
					{
						date: "2026-07-29",
						clientPrice: 20,
						rootPrice: 4,
						netAfterExpenses: 12,
					},
				],
			},
		];
		const copied = copyFirstOtaPricingRowValues(rooms);
		const days = copied.flatMap((room) => room.pricingByDay);

		expect(days.map((day) => day.date)).toEqual([
			"2026-07-27",
			"2026-07-28",
			"2026-07-29",
		]);
		days.forEach((day) => {
			expect(day.clientPrice).toBe(90);
			expect(day.rootPrice).toBe(60);
			expect(day.netAfterExpenses).toBe(75);
			expect(day.otaExpenseAmount).toBe(15);
			expect(day.platformMargin).toBe(15);
			expect(day.platformMarginRate).toBe(20);
		});
		expect(copied.map((room) => room.count)).toEqual([1, 2]);
		expect(copied.map((room) => room.hotelRoomConfigId)).toEqual([
			"triple-current",
			"triple-current",
		]);
	});
});
