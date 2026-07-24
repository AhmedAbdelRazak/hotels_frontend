import { getReservationRoomSummary } from "./reservationRoomDetails";

export const ADMIN_RESERVATION_EXPORT_HEADERS = Object.freeze([
	"Confirmation Number",
	"Name",
	"Phone",
	"Hotel Name",
	"Status",
	"Checkin Date",
	"Checkout Date",
	"Payment Status",
	"Total Amount",
	"Paid Amount (Online)",
	"Room Type",
	"Room Number",
	"Room Count",
	"Paid Offline",
	"Created At",
]);

const exportDate = (value, locale) => {
	if (!value) return "";
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString(locale);
};

const firstAvailable = (...values) =>
	values.find(
		(value) => value !== undefined && value !== null && String(value).trim() !== "",
	);

const blankUnavailableRoomValue = (value) => {
	const text = String(value === undefined || value === null ? "" : value).trim();
	return text
		.split(",")
		.map((part) => part.trim())
		.filter(
			(part) =>
				part && !["-", "n/a", "na"].includes(part.toLowerCase()),
		)
		.join(", ");
};

const firstAvailableRoomValue = (...values) =>
	values.map(blankUnavailableRoomValue).find(Boolean) || "";

const getReservedRoomCount = (item = {}) => {
	if (item.room_count !== undefined && item.room_count !== null) {
		return item.room_count;
	}
	if (!Array.isArray(item.pickedRoomsType)) return 0;
	return item.pickedRoomsType.reduce((sum, room = {}) => {
		const count = Number(room.count || 0);
		return sum + (Number.isFinite(count) ? count : 0);
	}, 0);
};

export const buildAdminReservationExportRows = (
	dataArray = [],
	localeForDate = "en-US",
) =>
	(Array.isArray(dataArray) ? dataArray : []).map((item = {}) => {
		const roomSummary = getReservationRoomSummary(item);
		const customerDetails = item.customer_details || {};
		const hotelDetails = item.hotelId || {};
		const roomType = firstAvailableRoomValue(
			item.room_type,
			item.room_type_display,
			roomSummary.roomTypeText,
		);
		const roomNumber = firstAvailableRoomValue(
			item.room_number,
			item.room_number_display,
			roomSummary.roomNumberText,
		);

		return {
			"Confirmation Number": item.confirmation_number || "",
			Name: firstAvailable(item.customer_name, customerDetails.name) || "",
			Phone: firstAvailable(item.customer_phone, customerDetails.phone) || "",
			"Hotel Name": firstAvailable(item.hotel_name, hotelDetails.hotelName) || "",
			Status: item.reservation_status || "",
			"Checkin Date": exportDate(item.checkin_date, localeForDate),
			"Checkout Date": exportDate(item.checkout_date, localeForDate),
			"Payment Status": item.payment_status || "",
			"Total Amount": firstAvailable(
				item.display_total_amount,
				item.total_amount,
			) || 0,
			"Paid Amount (Online)": firstAvailable(
				item.paid_amount_display,
				item.paid_amount,
			) || 0,
			"Room Type": roomType,
			"Room Number": roomNumber,
			"Room Count": getReservedRoomCount(item),
			"Paid Offline": firstAvailable(
				item.paid_offline,
				item.payment_details?.onsite_paid_amount,
			) || 0,
			"Created At": exportDate(
				firstAvailable(item.booked_at, item.createdAt),
				localeForDate,
			),
		};
	});
