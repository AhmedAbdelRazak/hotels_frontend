/** @format */

const STATUS_LABELS = {
	"ota platform review": "OTA Platform Review",
	"pending confirmation": "Pending Confirmation",
	confirmed: "Confirmed",
	cancelled: "Cancelled",
	canceled: "Cancelled",
	"no show": "No Show",
	no_show: "No Show",
	inhouse: "In House",
	"in house": "In House",
	checkedout: "Checked Out",
	checked_out: "Checked Out",
	"checked out": "Checked Out",
	rejected: "Rejected",
};

const titleCase = (value = "") =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());

export const formatOtaReservationStatus = (value = "") => {
	const normalized = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
	return STATUS_LABELS[normalized] || titleCase(normalized || "ota review");
};
