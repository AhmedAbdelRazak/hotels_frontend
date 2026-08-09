import * as XLSX from "xlsx";
import {
	formatDate,
	getReservationNights,
	getReservationPricePerDay,
	localizeStatus,
	titleCase,
} from "../overallShared";
import {
	getHotelRunnerPlatformFinanceDisplay,
	getReservationPropertyGuestGrossDisplay,
} from "../../../AdminModule/AllReservation/hotelRunnerPricingDisplay";

const commissionExportText = (chosenLanguage) =>
	chosenLanguage === "Arabic"
		? {
				column: "\u062d\u0627\u0644\u0629 \u0627\u0644\u0639\u0645\u0648\u0644\u0629",
				available: "\u0645\u062a\u0627\u062d\u0629 — \u062a\u0645\u062a \u0645\u0631\u0627\u062c\u0639\u062a\u0647\u0627 \u0645\u0627\u0644\u064a\u0627\u064b",
				unavailable: "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629",
				unreviewed: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
				conflict: "\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0627\u0644\u064a\u0629 \u0645\u062a\u0639\u0627\u0631\u0636\u0629",
				invalid: "\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0627\u0644\u064a\u0629 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u0629",
		  }
		: {
				column: "Commission availability",
				available: "Available — finance reviewed",
				unavailable: "Unavailable",
				unreviewed: "Awaiting finance review",
				conflict: "Conflicting finance evidence",
				invalid: "Invalid finance evidence",
		  };

const hotelRunnerCommissionStatus = (finance = {}, text = {}) => {
	if (finance.available) return text.available;
	if (finance.reason === "hotelrunner_platform_commission_conflict") {
		return `${text.unavailable} — ${text.conflict}`;
	}
	if (finance.reason === "hotelrunner_platform_commission_invalid") {
		return `${text.unavailable} — ${text.invalid}`;
	}
	return `${text.unavailable} — ${text.unreviewed}`;
};

const safeFileSegment = (value = "reservations") =>
	String(value || "reservations")
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, "-")
		.toLowerCase();

const roomNumbers = (reservation = {}) =>
	(Array.isArray(reservation.roomDetails) ? reservation.roomDetails : [])
		.map((room) => room?.room_number || room?.displayName || room?.room_type || "")
		.filter(Boolean)
		.join(", ");

const rejectionReason = (reservation = {}) =>
	String(
		reservation?.pendingConfirmation?.rejectionReason ||
			reservation?.pendingConfirmation?.cancelReason ||
			reservation?.agentDecisionSnapshot?.reason ||
			reservation?.agentDecisionSnapshot?.rejectionReason ||
			reservation?.financial_cycle?.financeRejectionComment ||
			reservation?.financial_cycle?.totalRejectionReason ||
			reservation?.financial_cycle?.totalReviewComment ||
			reservation?.commissionAgentApproval?.rejectionReason ||
			reservation?.reservation_rejection_reason ||
			reservation?.rejectionReason ||
			""
	).trim();

export const buildReservationExportRows = ({
	reservations = [],
	labels = {},
	chosenLanguage,
	includeRejectionReason = false,
}) =>
	(Array.isArray(reservations) ? reservations : []).map((reservation, index) => {
		const finance = getHotelRunnerPlatformFinanceDisplay(reservation);
		const guestGross = getReservationPropertyGuestGrossDisplay(reservation);
		const exportableGuestGross = guestGross.available ? guestGross.amount : null;
		const nights = getReservationNights(reservation);
		const commissionText = commissionExportText(chosenLanguage);
		const row = {
			[labels.index || "#"]: index + 1,
			[labels.hotel]: titleCase(reservation.hotelName || ""),
			[labels.confirmation]: reservation.confirmation_number || "",
			[labels.guest]: reservation.customer_details?.name || "",
			[labels.phone]: reservation.customer_details?.phone || "",
			[labels.email]: reservation.customer_details?.email || "",
			[labels.source]: reservation.booking_source || "",
			[labels.status]: localizeStatus(
				reservation.reservation_status || reservation.state,
				chosenLanguage
			),
			[labels.bookedAt]: formatDate(reservation.booked_at || reservation.createdAt, chosenLanguage),
			[labels.createdAt]: formatDate(reservation.createdAt, chosenLanguage),
			[labels.checkIn]: formatDate(reservation.checkin_date, chosenLanguage),
			[labels.checkOut]: formatDate(reservation.checkout_date, chosenLanguage),
			[labels.nights]: nights,
			[labels.pricePerDay]: guestGross.isHotelRunner
				? exportableGuestGross !== null && nights > 0
					? Number((exportableGuestGross / nights).toFixed(2))
					: ""
				: Number(getReservationPricePerDay(reservation) || 0),
			[labels.totalAmount]: guestGross.isHotelRunner
				? exportableGuestGross !== null
					? exportableGuestGross
					: ""
				: Number(reservation.total_amount || 0),
			[labels.paidAmount]: Number(reservation.paid_amount || 0),
			[labels.commission]: finance.isHotelRunner
				? finance.available
					? Number(finance.amount)
					: ""
				: Number(reservation.commission || reservation.commision || 0),
			[labels.payment]: reservation.payment || "",
			[labels.roomNumbers]: roomNumbers(reservation),
		};
		if (finance.isHotelRunner) {
			row[labels.commissionAvailability || commissionText.column] =
				hotelRunnerCommissionStatus(finance, commissionText);
		}
		if (includeRejectionReason) {
			row[labels.rejectionReason || "Rejection Reason"] =
				rejectionReason(reservation);
		}
		return row;
	});

export const downloadReservationWorkbook = ({
	reservations = [],
	labels = {},
	chosenLanguage,
	filePrefix = "overall-reservations",
	includeRejectionReason = false,
}) => {
	const rows = buildReservationExportRows({
		reservations,
		labels,
		chosenLanguage,
		includeRejectionReason,
	});
	const worksheet = XLSX.utils.json_to_sheet(rows);
	worksheet["!cols"] = [
		{ wch: 8 },
		{ wch: 24 },
		{ wch: 22 },
		{ wch: 22 },
		{ wch: 16 },
		{ wch: 28 },
		{ wch: 16 },
		{ wch: 18 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 10 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 20 },
	];
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "Reservations");
	const fileDate = new Date().toISOString().slice(0, 10);
	XLSX.writeFile(workbook, `${safeFileSegment(filePrefix)}-${fileDate}.xlsx`);
};
