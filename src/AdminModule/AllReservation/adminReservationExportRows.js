import {
	getReservationRoomSummary,
	getRoomTypeDisplayLabel,
} from "./reservationRoomDetails";

export const ADMIN_RESERVATION_EXPORT_HEADERS = Object.freeze([
	"Confirmation Number",
	"Name",
	"Phone",
	"Hotel Name",
	"Booking Source",
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

export const ADMIN_RESERVATION_EXPORT_ARABIC_HEADERS = Object.freeze([
	"رقم التأكيد",
	"اسم الضيف",
	"رقم الهاتف",
	"اسم الفندق",
	"مصدر الحجز",
	"حالة الحجز",
	"تاريخ الوصول",
	"تاريخ المغادرة",
	"حالة الدفع",
	"المبلغ الإجمالي",
	"المبلغ المدفوع إلكترونيًا",
	"نوع الغرفة",
	"رقم الغرفة",
	"عدد الغرف",
	"المدفوع في الفندق",
	"تاريخ الحجز",
]);

export const getAdminReservationExportHeaders = (chosenLanguage = "English") =>
	chosenLanguage === "Arabic"
		? ADMIN_RESERVATION_EXPORT_ARABIC_HEADERS
		: ADMIN_RESERVATION_EXPORT_HEADERS;

const localizeReservationStatus = (value, chosenLanguage) => {
	const raw = String(value || "");
	if (chosenLanguage !== "Arabic") return raw;
	const normalized = raw.toLowerCase().replace(/[_-]+/g, " ").trim();
	const labels = {
		confirmed: "مؤكد",
		"pending confirmation": "بانتظار التأكيد",
		"pending finance review": "بانتظار المراجعة المالية",
		inhouse: "داخل الفندق",
		"in house": "داخل الفندق",
		"checked out": "تم تسجيل المغادرة",
		"early checked out": "مغادرة مبكرة",
		cancelled: "ملغي",
		"no show": "لم يحضر",
	};
	return labels[normalized] || raw;
};

const localizePaymentStatus = (value, chosenLanguage) => {
	const raw = String(value || "");
	if (chosenLanguage !== "Arabic") return raw;
	const normalized = raw.toLowerCase().replace(/[_-]+/g, " ").trim();
	const labels = {
		captured: "تم التحصيل",
		"not captured": "لم يتم التحصيل",
		"paid offline": "مدفوع في الفندق",
		"not paid": "غير مدفوع",
	};
	return labels[normalized] || raw;
};

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

const firstAvailableRoomType = (...values) =>
	values
		.map(blankUnavailableRoomValue)
		.map(getRoomTypeDisplayLabel)
		.find(Boolean) || "";

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
	chosenLanguage = "English",
) =>
	(Array.isArray(dataArray) ? dataArray : []).map((item = {}) => {
		const roomSummary = getReservationRoomSummary(item);
		const customerDetails = item.customer_details || {};
		const hotelDetails = item.hotelId || {};
		const roomType = firstAvailableRoomType(
			item.room_type_display,
			roomSummary.roomTypeText,
			item.room_type,
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
			"Booking Source": firstAvailable(
				item.booking_source,
				item.customer_booking_source,
				customerDetails.booking_source,
			) || "",
			Status: localizeReservationStatus(
				item.reservation_status,
				chosenLanguage,
			),
			"Checkin Date": exportDate(item.checkin_date, localeForDate),
			"Checkout Date": exportDate(item.checkout_date, localeForDate),
			"Payment Status": localizePaymentStatus(
				item.payment_status,
				chosenLanguage,
			),
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
