const ZERO_HOTEL_BASE_RELEASE_CODES = new Set([
	"ota_hotel_base_price_required",
	"ota_daily_base_price_required",
]);

const numberValue = (value) => {
	const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
	return Number.isFinite(parsed) ? parsed : 0;
};

export const assignedHotelIdForReservation = (reservation = {}) =>
	String(reservation?.hotelId?._id || reservation?.hotelId || "").trim();

export const hasAssignedHotel = (reservation = {}) =>
	Boolean(assignedHotelIdForReservation(reservation));

export const isZeroHotelBasePriceRelease = (reservation = {}) =>
	hasAssignedHotel(reservation) &&
	numberValue(reservation?.hotel_visible_amount) === 0 &&
	ZERO_HOTEL_BASE_RELEASE_CODES.has(
		String(reservation?.hotel_base_price_issue_code || "").trim(),
	);

export const isReleaseReady = (reservation = {}) =>
	hasAssignedHotel(reservation) &&
	((Boolean(reservation?.hotel_base_price_ready) &&
		numberValue(reservation?.hotel_visible_amount) > 0) ||
		isZeroHotelBasePriceRelease(reservation));

