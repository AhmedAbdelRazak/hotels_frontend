import {
	assignedHotelIdForReservation,
	isReleaseReady,
	isZeroHotelBasePriceRelease,
} from "./otaReleaseEligibility";

test("allows a normal reviewed OTA release with a positive hotel price", () => {
	const reservation = {
		hotelId: { _id: "hotel-1" },
		hotel_visible_amount: 120,
		hotel_base_price_ready: true,
	};

	expect(assignedHotelIdForReservation(reservation)).toBe("hotel-1");
	expect(isZeroHotelBasePriceRelease(reservation)).toBe(false);
	expect(isReleaseReady(reservation)).toBe(true);
});

test("allows an explicit confirmation flow when reviewed hotel pricing is exactly zero", () => {
	const reservation = {
		hotelId: "hotel-1",
		hotel_visible_amount: 0,
		hotel_base_price_ready: false,
		hotel_base_price_issue_code: "ota_hotel_base_price_required",
	};

	expect(isZeroHotelBasePriceRelease(reservation)).toBe(true);
	expect(isReleaseReady(reservation)).toBe(true);
});

test("does not bypass hotel assignment or non-price release failures", () => {
	expect(
		isReleaseReady({
			hotel_visible_amount: 0,
			hotel_base_price_issue_code: "ota_hotel_base_price_required",
		}),
	).toBe(false);
	expect(
		isReleaseReady({
			hotelId: "hotel-1",
			hotel_visible_amount: 0,
			hotel_base_price_issue_code: "ota_room_mapping_stale",
		}),
	).toBe(false);
});
