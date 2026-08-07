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

const normalizedToken = (value = "") =>
	String(value || "")
		.trim()
		.toLowerCase();

const isHotelRunnerManaged = (reservation = {}) => {
	const hotelRunner = reservation?.supplierData?.hotelRunner || {};
	return (
		normalizedToken(reservation?.otaPlatformReview?.source) ===
			"hotelrunner_api" ||
		normalizedToken(hotelRunner?.transport) === "hotelrunner_api" ||
		reservation?.otaPlatformReview?.hotelRunnerManaged === true
	);
};

const titleCase = (value = "") =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());

export const formatOtaReservationStatus = (value = "", reservation = {}) => {
	const normalized = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
	if (
		normalized === "ota platform review" &&
		isHotelRunnerManaged(reservation)
	) {
		return "OTA Platform Review HotelRunner";
	}
	return STATUS_LABELS[normalized] || titleCase(normalized || "ota review");
};
