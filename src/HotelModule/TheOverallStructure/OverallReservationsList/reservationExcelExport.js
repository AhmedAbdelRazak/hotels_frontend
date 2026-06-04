import * as XLSX from "xlsx";
import {
	formatDate,
	getReservationNights,
	getReservationPricePerDay,
	localizeStatus,
	titleCase,
} from "../overallShared";

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
			[labels.nights]: getReservationNights(reservation),
			[labels.pricePerDay]: Number(getReservationPricePerDay(reservation) || 0),
			[labels.totalAmount]: Number(reservation.total_amount || 0),
			[labels.paidAmount]: Number(reservation.paid_amount || 0),
			[labels.commission]: Number(
				reservation.commission || reservation.commision || 0
			),
			[labels.payment]: reservation.payment || "",
			[labels.roomNumbers]: roomNumbers(reservation),
		};
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
