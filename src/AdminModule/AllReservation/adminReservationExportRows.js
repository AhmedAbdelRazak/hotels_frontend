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

const exportDate = (value, locale) =>
	value ? new Date(value).toLocaleDateString(locale) : "";

export const buildAdminReservationExportRows = (
	dataArray = [],
	localeForDate = "en-US",
) =>
	(Array.isArray(dataArray) ? dataArray : []).map((item = {}) => ({
		"Confirmation Number": item.confirmation_number || "",
		Name: item.customer_name || "",
		Phone: item.customer_phone || "",
		"Hotel Name": item.hotel_name || "",
		Status: item.reservation_status || "",
		"Checkin Date": exportDate(item.checkin_date, localeForDate),
		"Checkout Date": exportDate(item.checkout_date, localeForDate),
		"Payment Status": item.payment_status || "",
		"Total Amount": item.total_amount || 0,
		"Paid Amount (Online)": item.paid_amount || 0,
		"Room Type": item.room_type || "",
		"Room Number": item.room_number || "",
		"Room Count": item.room_count || 0,
		"Paid Offline": item.paid_offline || 0,
		"Created At": exportDate(item.createdAt, localeForDate),
	}));
