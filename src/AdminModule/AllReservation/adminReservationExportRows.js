import {
	getReservationRoomSummary,
	getRoomTypeDisplayLabel,
} from "./reservationRoomDetails";
import { formatSaudiGregorianDate } from "../../utils/saudiDates";
import { toLatinDigits } from "../../utils/latinDigits";
import {
	getAdminReservationFinancialCurrency,
	getAdminReservationGrossTotal,
	getAdminReservationNetTotal,
} from "./reservationTableAmounts";

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
	"Gross Total (Before OTA Deductions)",
	"Net Total (After OTA Deductions)",
	"Currency",
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
	"إجمالي الحجز قبل خصم مصاريف منصات الحجز (OTA)",
	"صافي الحجز بعد خصم مصاريف منصات الحجز (OTA)",
	"العملة",
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

const exportDate = (value, locale, chosenLanguage) =>
	formatSaudiGregorianDate(value, {
		language:
			chosenLanguage === "Arabic" ||
			String(locale || "").toLowerCase().startsWith("ar")
				? "Arabic"
				: "English",
		month: "long",
		fallback: "",
	});

const firstAvailable = (...values) =>
	values.find(
		(value) => value !== undefined && value !== null && String(value).trim() !== "",
	);

const numericMoneyOrBlank = (value) => {
	if (value === null || value === undefined || typeof value === "boolean") {
		return "";
	}
	if (typeof value !== "number" && typeof value !== "string") return "";
	const normalized =
		typeof value === "string" ? value.replace(/,/g, "").trim() : value;
	if (normalized === "") return "";
	const number = Number(normalized);
	return Number.isFinite(number) ? number : "";
};

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
		const grossTotal = getAdminReservationGrossTotal(item);
		const netTotal = getAdminReservationNetTotal(item);
		const savedTotal = numericMoneyOrBlank(item.total_amount);
		const resolvedGrossTotal = numericMoneyOrBlank(grossTotal);
		const exportGrossTotal =
			resolvedGrossTotal === "" ? savedTotal : resolvedGrossTotal;
		const resolvedNetTotal = numericMoneyOrBlank(netTotal);
		const exportNetTotal =
			resolvedNetTotal === "" ? exportGrossTotal : resolvedNetTotal;
		const financialTotalsCurrency =
			getAdminReservationFinancialCurrency(item);

		return {
			"Confirmation Number": toLatinDigits(item.confirmation_number || ""),
			Name: toLatinDigits(
				firstAvailable(item.customer_name, customerDetails.name) || "",
			),
			Phone: toLatinDigits(
				firstAvailable(item.customer_phone, customerDetails.phone) || "",
			),
			"Hotel Name": toLatinDigits(
				firstAvailable(item.hotel_name, hotelDetails.hotelName) || "",
			),
			"Booking Source": toLatinDigits(firstAvailable(
				item.booking_source,
				item.customer_booking_source,
				customerDetails.booking_source,
			) || ""),
			Status: toLatinDigits(localizeReservationStatus(
				item.reservation_status,
				chosenLanguage,
			)),
			"Checkin Date": exportDate(
				item.checkin_date,
				localeForDate,
				chosenLanguage,
			),
			"Checkout Date": exportDate(
				item.checkout_date,
				localeForDate,
				chosenLanguage,
			),
			"Payment Status": toLatinDigits(localizePaymentStatus(
				item.payment_status,
				chosenLanguage,
			)),
			"Gross Total (Before OTA Deductions)":
				exportGrossTotal,
			"Net Total (After OTA Deductions)": exportNetTotal,
			Currency: financialTotalsCurrency,
			"Paid Amount (Online)": numericMoneyOrBlank(
				firstAvailable(item.paid_amount_display, item.paid_amount),
			),
			"Room Type": toLatinDigits(roomType),
			"Room Number": toLatinDigits(roomNumber),
			"Room Count": getReservedRoomCount(item),
			"Paid Offline": numericMoneyOrBlank(
				firstAvailable(
					item.paid_offline,
					item.payment_details?.onsite_paid_amount,
				),
			),
			"Created At": exportDate(
				firstAvailable(item.booked_at, item.createdAt),
				localeForDate,
				chosenLanguage,
			),
		};
	});
