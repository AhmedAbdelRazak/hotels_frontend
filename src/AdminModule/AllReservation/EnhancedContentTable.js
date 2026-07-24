// client/src/AdminModule/AllReservation/EnhancedContentTable.jsx
import React, { useState, useMemo, useEffect } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { Tooltip, Modal, Button, Input, message, Checkbox } from "antd";
import { CalendarOutlined, SyncOutlined } from "@ant-design/icons";
import ScoreCards from "./ScoreCards";
import MoreDetails from "./MoreDetails";
import ExportToExcelButton from "./ExportToExcelButton";
import DateFilterModal from "./DateFilterModal";
import { getAdminReservationDisplayTotal } from "./reservationTableAmounts";
import { getReservationRoomSummary } from "./reservationRoomDetails";
import { formatSaudiGregorianDate } from "../../utils/saudiDates";
import { useHistory, useLocation } from "react-router-dom";
import {
	applyOtaReservationSyncJob,
	prepareOtaReservationSyncJob,
	readOtaReservationSyncJob,
	runOtaReservationSyncCollector,
	submitOtaReservationSyncMfaCode,
} from "../apiAdmin";

const OTA_SYNC_RUNNING_STATUSES = new Set([
	"queued",
	"running",
	"needs_mfa",
]);

export const ADMIN_RESERVATION_TABLE_COLUMN_WIDTHS = Object.freeze([
	42, // row number
	100, // hotel
	110, // confirmation
	150, // guest
	70, // assigned room number
	96, // booking source
	104, // reservation status
	88, // payment status
	132, // booked
	132, // check-in
	132, // check-out
	56, // nights
	100, // price per day
	100, // total
	100, // paid amount
	76, // more details
]);

export const ADMIN_RESERVATION_TABLE_MIN_WIDTH =
	ADMIN_RESERVATION_TABLE_COLUMN_WIDTHS.reduce(
		(total, width) => total + width,
		0,
	);
const OTA_SYNC_BUCKET_LABELS = [
	{ key: "newReservations", label: "New candidates" },
	{ key: "skippedCancelled", label: "Skipped cancelled" },
	{ key: "matchedExisting", label: "Matched existing" },
	{ key: "statusChanged", label: "Status changes" },
	{ key: "conflicts", label: "Conflicts" },
	{ key: "needsReview", label: "Needs review" },
	{ key: "paymentOrVccAvailable", label: "Payment/VCC signals" },
	{ key: "appliedWrites", label: "Applied writes" },
];

const getReservationKey = (reservation) => {
	if (!reservation) return "";
	if (reservation._id) return String(reservation._id);
	if (reservation.confirmation_number)
		return String(reservation.confirmation_number);
	return "";
};

const matchesReservationKey = (reservation, key) => {
	if (!reservation || !key) return false;
	const normalized = String(key);
	if (reservation._id && String(reservation._id) === normalized) return true;
	if (
		reservation.confirmation_number &&
		String(reservation.confirmation_number) === normalized
	) {
		return true;
	}
	return false;
};

const isSameReservation = (a, b) => {
	if (!a || !b) return false;
	if (a._id && b._id) return String(a._id) === String(b._id);
	if (a.confirmation_number && b.confirmation_number) {
		return String(a.confirmation_number) === String(b.confirmation_number);
	}
	return false;
};

const reservationStateKey = (reservation = {}) =>
	JSON.stringify({
		updatedAt: reservation?.updatedAt || "",
		adminLastUpdatedAt: reservation?.adminLastUpdatedAt || "",
		supplierName: reservation?.supplierData?.supplierName || "",
		suppliedBookingNo: reservation?.supplierData?.suppliedBookingNo || "",
		bookingSource: reservation?.booking_source || "",
		payment: reservation?.payment || "",
		status: reservation?.reservation_status || reservation?.state || "",
	});

const mergeReservationPreservingRefs = (previous = {}, incoming = {}) => {
	const merged = { ...previous, ...incoming };
	if (
		previous?.hotelId &&
		(!merged.hotelId ||
			typeof merged.hotelId !== "object" ||
			!merged.hotelId.hotelName)
	) {
		merged.hotelId = previous.hotelId;
	}
	if (
		previous?.belongsTo &&
		(!merged.belongsTo ||
			typeof merged.belongsTo !== "object" ||
			!merged.belongsTo.name)
	) {
		merged.belongsTo = previous.belongsTo;
	}
	return merged;
};

const AdminTableTooltipText = ({ value, max = 20, className = "" }) => {
	const text =
		value === null || value === undefined || value === "" ? "-" : String(value);
	const display = text.length > max ? `${text.slice(0, max)}...` : text;
	const content = (
		<span className={className} dir='auto'>
			{display}
		</span>
	);
	if (text.length <= max) return content;
	return (
		<Tooltip title={<span dir='auto'>{text}</span>} placement='top'>
			{content}
		</Tooltip>
	);
};

const adminStatusTone = (status = "") => {
	const normalized = String(status || "")
		.toLowerCase()
		.replace(/[_-]+/g, " ");
	if (/cancel|reject|inactive|no\s?show/.test(normalized)) return "red";
	if (/early checked out|checked out|closed/.test(normalized)) return "green";
	if (/inhouse|in house|checked in/.test(normalized)) return "softGreen";
	if (/agent|commission/.test(normalized)) return "purple";
	if (/pending|review|unfinished|cleaning/.test(normalized)) return "orange";
	if (/confirm|approved/.test(normalized)) return "blue";
	if (/active|finish|done|clean/.test(normalized)) return "green";
	return "slate";
};

const adminLocalizeStatus = (status = "", chosenLanguage = "English") => {
	const raw = status || "-";
	if (chosenLanguage !== "Arabic") return raw;
	const normalized = String(status || "")
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.trim();
	const map = {
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
	return map[normalized] || raw;
};

const formatAdminMoney = (value) => {
	const number = Number(value || 0);
	return Number.isFinite(number) ? number.toFixed(2) : "0.00";
};

const formatAdminDate = (value, chosenLanguage = "English") =>
	formatSaudiGregorianDate(value, {
		language: chosenLanguage,
		month: "long",
		fallback: "-",
	});

const getAdminReservationNights = (reservation = {}) => {
	const explicit = Number(reservation.days_of_residence || 0);
	if (Number.isFinite(explicit) && explicit > 0) return explicit;
	const start = reservation.checkin_date ? new Date(reservation.checkin_date) : null;
	const end = reservation.checkout_date ? new Date(reservation.checkout_date) : null;
	if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		return 0;
	}
	const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
	return diff > 0 ? diff : 0;
};

const getAdminPaidAmount = (reservation = {}) => {
	const direct = Number(reservation.paid_amount || 0);
	if (Number.isFinite(direct) && direct > 0) return direct;
	const breakdown = reservation.paid_amount_breakdown || {};
	const breakdownTotal = Object.entries(breakdown).reduce((sum, [key, value]) => {
		if (key === "payment_comments") return sum;
		const number = Number(value || 0);
		return Number.isFinite(number) ? sum + number : sum;
	}, 0);
	if (breakdownTotal > 0) return breakdownTotal;
	const onsite = Number(reservation.payment_details?.onsite_paid_amount || 0);
	return Number.isFinite(onsite) ? onsite : 0;
};

const EnhancedContentTable = ({
	data,
	totalDocuments,
	currentPage,
	pageSize,
	setCurrentPage,
	setPageSize,
	searchTerm,
	setSearchTerm,
	handleSearch,
	fromPage,
	scorecardsObject,
	// Filter props from parent
	filterType = "",
	setFilterType = () => {},
	handleFilterClickFromParent = () => {},
	allHotelDetailsAdmin,

	// Reserved By (existing)
	reservedByOptions = [], // array of lowercase names (for super user view)
	activeReservedBy = "", // lowercase or ""
	onReservedByChange, // fn(lowercase or "")

	// NEW: Booking Source
	bookingSourceOptions = [], // array of lowercase booking_source values
	activeBookingSource = "", // lowercase or ""
	onBookingSourceChange, // fn(lowercase or "")

	// Date filter controls
	dateFilter, // { type, from, to }
	onDateFilterApply, // fn({type, from, to})
	onClearDateFilter, // fn()
	allowAllReservedBy = false, // super user id?
	selfReservedBy = "", // lowercase current employee name
	currentUserId, // not used here but passed through for future hooks
	onReservationUpdated = () => {},
	chosenLanguage = "English",
}) => {
	const history = useHistory();
	const location = useLocation();

	// ------------------ Search Box local state ------------------
	const [searchBoxValue, setSearchBoxValue] = useState(searchTerm || "");
	useEffect(() => {
		setSearchBoxValue(searchTerm || "");
	}, [searchTerm]);

	// ------------------ Payment isCaptured flags, for display only ------------------
	const capturedConfirmationNumbers = useMemo(() => ["2944008828"], []);
	const preferNetAfterExpensesTotal = fromPage === "AllReservations";

	const summarizePayment = (reservation) => {
		const pd = reservation?.paypal_details || {};
		const pmt = (reservation?.payment || "").toLowerCase();
		const legacyCaptured = !!reservation?.payment_details?.captured;
		const payOffline =
			Number(reservation?.payment_details?.onsite_paid_amount || 0) > 0 ||
			pmt === "paid offline";
		const breakdown = reservation?.paid_amount_breakdown || {};
		const breakdownCaptured = Object.keys(breakdown).some((key) => {
			if (key === "payment_comments") return false;
			const val = Number(breakdown[key]);
			return Number.isFinite(val) && val > 0;
		});

		// PayPal ledger signals
		const capTotal = Number(pd?.captured_total_usd || 0);
		const limitUsd =
			typeof pd?.bounds?.limit_usd === "number"
				? Number(pd.bounds.limit_usd)
				: 0;
		const pendingUsd = Number(pd?.pending_total_usd || 0);
		const initialCompleted =
			(pd?.initial?.capture_status || "").toUpperCase() === "COMPLETED";
		const anyMitCompleted =
			Array.isArray(pd?.mit) &&
			pd.mit.some(
				(c) => (c?.capture_status || "").toUpperCase() === "COMPLETED"
			);

		const isCaptured =
			legacyCaptured ||
			capTotal > 0 ||
			initialCompleted ||
			anyMitCompleted ||
			pmt === "paid online" ||
			breakdownCaptured;

		const isNotPaid = pmt === "not paid" && !isCaptured && !payOffline;

		let status = "Not Captured";
		if (isCaptured) status = "Captured";
		else if (payOffline) status = "Paid Offline";
		else if (isNotPaid) status = "Not Paid";

		let hint = "";
		const pieces = [];
		if (capTotal > 0) pieces.push(`captured $${capTotal.toFixed(2)}`);
		if (limitUsd > 0) pieces.push(`limit $${limitUsd.toFixed(2)}`);
		if (pendingUsd > 0) pieces.push(`pending $${pendingUsd.toFixed(2)}`);
		if (pieces.length) hint = `PayPal: ${pieces.join(" / ")}`;

		return { status, hint, isCaptured, paidOffline: payOffline };
	};

	const formattedReservations = useMemo(() => {
		return data.map((reservation) => {
			const { customer_details = {}, hotelId = {} } = reservation;
			const roomSummary = getReservationRoomSummary(reservation);
			const nights = getAdminReservationNights(reservation);
			const totalAmount = Number(reservation.total_amount || 0);
			const displayTotalAmount = getAdminReservationDisplayTotal(reservation, {
				preferNetAfterExpenses: preferNetAfterExpensesTotal,
			});
			const pricePerDay = nights > 0 ? totalAmount / nights : totalAmount;
			const paidAmount = getAdminPaidAmount(reservation);

			const manualOverrideCaptured = capturedConfirmationNumbers.includes(
				reservation.confirmation_number
			);

			const paypalAware = summarizePayment(reservation);
			const isCaptured =
				manualOverrideCaptured || paypalAware.isCaptured || false;

			let computedPaymentStatus;
			if (isCaptured) {
				computedPaymentStatus = "Captured";
			} else if (paypalAware.paidOffline) {
				computedPaymentStatus = "Paid Offline";
			} else if ((reservation.payment || "").toLowerCase() === "not paid") {
				computedPaymentStatus = "Not Paid";
			} else {
				computedPaymentStatus = "Not Captured";
			}

			return {
				...reservation,
				customer_name: customer_details.name || "N/A",
				customer_phone: customer_details.phone || "N/A",
				hotel_name: hotelId?.hotelName || "Unknown Hotel",
				room_type_display: roomSummary.roomTypeText || "-",
				room_number_display: roomSummary.roomNumberText || "-",
				createdAt: reservation.createdAt || null,
				payment_status: computedPaymentStatus,
				payment_status_hint: paypalAware.hint || "",
				reservation_nights: nights,
				price_per_day: pricePerDay,
				display_total_amount: displayTotalAmount,
				paid_amount_display: paidAmount,
			};
		});
	}, [data, capturedConfirmationNumbers, preferNetAfterExpensesTotal]);

	// ------------------ Sorting logic ------------------
	const [sortConfig, setSortConfig] = useState({
		sortField: null,
		direction: null,
	});

	const sortedData = useMemo(() => {
		if (!sortConfig.sortField || !sortConfig.direction) {
			return formattedReservations;
		}
		const { sortField, direction } = sortConfig;

		const toKey = (v) => (v == null ? "" : v);

		const sorted = [...formattedReservations].sort((a, b) => {
			let valA = toKey(a[sortField]);
			let valB = toKey(b[sortField]);

			if (
				sortField === "checkin_date" ||
				sortField === "checkout_date" ||
				sortField === "createdAt"
			) {
				valA = valA ? new Date(valA).getTime() : 0;
				valB = valB ? new Date(valB).getTime() : 0;
				return direction === "asc" ? valA - valB : valB - valA;
			}

			if (
				sortField === "total_amount" ||
				sortField === "display_total_amount" ||
				sortField === "reservation_nights" ||
				sortField === "price_per_day" ||
				sortField === "paid_amount_display"
			) {
				valA = Number(valA) || 0;
				valB = Number(valB) || 0;
				return direction === "asc" ? valA - valB : valB - valA;
			}

			const aStr = String(valA);
			const bStr = String(valB);
			const cmp = aStr.localeCompare(bStr, undefined, {
				numeric: true,
				sensitivity: "base",
			});
			return direction === "asc" ? cmp : -cmp;
		});

		return sorted;
	}, [formattedReservations, sortConfig]);

	// ------------------ Modal for "View Details" ------------------
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [otaSyncPreparing, setOtaSyncPreparing] = useState(false);
	const [otaSyncRunning, setOtaSyncRunning] = useState(false);
	const [otaSyncApplying, setOtaSyncApplying] = useState(false);
	const [otaSyncMfaSubmitting, setOtaSyncMfaSubmitting] = useState(false);
	const [otaSyncMfaCode, setOtaSyncMfaCode] = useState("");
	const [otaSyncJob, setOtaSyncJob] = useState(null);
	const [otaSyncSelectedHotelIds, setOtaSyncSelectedHotelIds] = useState([]);

	const updateQueryParams = (updates) => {
		const params = new URLSearchParams(location.search);
		Object.entries(updates).forEach(([key, value]) => {
			if (value === undefined || value === null || value === "") {
				params.delete(key);
			} else {
				params.set(key, String(value));
			}
		});
		const nextSearch = params.toString();
		history.replace({
			pathname: location.pathname,
			search: nextSearch ? `?${nextSearch}` : "",
		});
	};

	const updateSelectedReservation = (updated) => {
		if (!updated) return;
		setSelectedReservation((prev) => {
			if (!prev || !isSameReservation(prev, updated)) {
				return prev;
			}
			const merged = mergeReservationPreservingRefs(prev, updated);
			return reservationStateKey(prev) === reservationStateKey(merged)
				? prev
				: merged;
		});
	};

	const showDetailsModal = (reservation) => {
		setSelectedReservation(reservation);
		setIsModalVisible(true);
		updateQueryParams({ reservationId: getReservationKey(reservation) });
	};
	const handleModalClose = () => {
		setSelectedReservation(null);
		setIsModalVisible(false);
		updateQueryParams({ reservationId: "" });
	};

	const handleReservationUpdated = (updated) => {
		if (!updated) return;
		updateSelectedReservation(updated);
		onReservationUpdated(updated);
	};

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const reservationId = params.get("reservationId");
		if (!reservationId) return;

		const match = formattedReservations.find((reservation) =>
			matchesReservationKey(reservation, reservationId)
		);
		if (!match) return;

		setSelectedReservation((prev) => {
			if (prev && isSameReservation(prev, match)) {
				const merged = mergeReservationPreservingRefs(prev, match);
				return reservationStateKey(prev) === reservationStateKey(merged)
					? prev
					: merged;
			}
			return match;
		});
		if (!isModalVisible) {
			setIsModalVisible(true);
		}
	}, [location.search, formattedReservations, isModalVisible]);

	// ------------------ Filter Button Handlers ------------------
	const onFilterClick = (type) => {
		const newFilter = filterType === type ? "" : type;
		setFilterType(newFilter);
		handleFilterClickFromParent(newFilter);
	};

	const handleSortLabelClick = (colKey) => {
		setSortConfig((prev) => {
			if (prev.sortField === colKey) {
				if (prev.direction === "asc") {
					return { sortField: colKey, direction: "desc" };
				} else if (prev.direction === "desc") {
					return { sortField: null, direction: null };
				}
			}
			return { sortField: colKey, direction: "asc" };
		});
	};

	const handleClearAllFilters = () => {
		setFilterType("");
		setSortConfig({ sortField: null, direction: null });
		handleFilterClickFromParent("");

		// ReservedBy behavior:
		if (allowAllReservedBy) {
			onReservedByChange && onReservedByChange(""); // clear to All
		} else {
			// enforce self
			onReservedByChange && onReservedByChange(selfReservedBy);
		}

		// Booking Source (always allow All)
		onBookingSourceChange && onBookingSourceChange("");

		// Date
		onClearDateFilter && onClearDateFilter();
	};

	// ---- SAFER: Route to New Reservation with robust id extraction ----
	const safeId = (maybeObj) => {
		if (!maybeObj) return null;
		if (typeof maybeObj === "object" && maybeObj._id)
			return String(maybeObj._id);
		return String(maybeObj);
	};

	const handleHotelClick = (record) => {
		const hotelId = safeId(record?.hotelId);
		const belongsToId = safeId(record?.belongsTo);

		if (!hotelId || !belongsToId) {
			Modal.warning({
				title: "Missing hotel reference",
				content:
					"This reservation has no linked hotel or owner reference. Please fix the data or open the reservation details for manual handling.",
			});
			return;
		}

		const selectedHotel =
			record?.hotelId && typeof record.hotelId === "object"
				? { ...record.hotelId, belongsTo: record.belongsTo }
				: {
						_id: hotelId,
						hotelName: record?.hotel_name || "Unknown Hotel",
						belongsTo: record?.belongsTo || belongsToId,
				  };

		try {
			localStorage.setItem("selectedHotel", JSON.stringify(selectedHotel));
		} catch (_) {}

		window.location.href = `/hotel-management/new-reservation/${belongsToId}/${hotelId}?list`;
	};

	// ------------------ Date Filter Modal ------------------
	const [dateModalOpen, setDateModalOpen] = useState(false);
	const openDateModal = () => setDateModalOpen(true);
	const closeDateModal = () => setDateModalOpen(false);

	const applyDateFilter = ({ type, from, to }) => {
		onDateFilterApply && onDateFilterApply({ type, from, to });
		setDateModalOpen(false);
	};

	const clearDateFilter = () => {
		onClearDateFilter && onClearDateFilter();
		setDateModalOpen(false);
	};

	const canPrepareOtaSync = fromPage === "AllReservations" && currentUserId;
	const handlePrepareOtaSync = () => {
		if (!currentUserId) {
			message.error("Missing admin user context.");
			return;
		}

		Modal.confirm({
			title: "Prepare OTA reservation sync?",
			content:
				"This creates a read-only sync preview job for every OTA-mapped hotel. Provider: Expedia. No reservation writes will be performed.",
			okText: "Prepare Sync",
			cancelText: "Cancel",
			centered: true,
			zIndex: 30180,
			rootClassName: "ota-reservation-sync-confirm-root",
			className: "ota-reservation-sync-confirm-modal",
			onOk: async () => {
				setOtaSyncPreparing(true);
				try {
					const response = await prepareOtaReservationSyncJob(currentUserId, {
						provider: "expedia",
						source: "admin_all_reservations",
					});
					if (!response || response.ok === false || !response.job) {
						message.error(
							response?.error || "Could not prepare OTA reservation sync.",
						);
						return Promise.reject(
							new Error(response?.error || "ota_sync_prepare_failed"),
						);
					}
					setOtaSyncJob(response.job);
					setOtaSyncSelectedHotelIds(
						(response.job.targetHotels || [])
							.map((hotel) => String(hotel.hotelId || ""))
							.filter(Boolean),
					);
					message.success("OTA reservation sync preview was prepared.");
					return response.job;
				} finally {
					setOtaSyncPreparing(false);
				}
			},
		});
	};

	const handleRunOtaCollector = async () => {
		if (!currentUserId || !otaSyncJob?._id) {
			message.error("Missing OTA sync job context.");
			return;
		}
		const availableHotelIds = new Set(
			(otaSyncJob.targetHotels || [])
				.map((hotel) => String(hotel.hotelId || ""))
				.filter(Boolean),
		);
		const selectedHotelIds = otaSyncSelectedHotelIds.filter((hotelId) =>
			availableHotelIds.has(String(hotelId)),
		);
		if (!selectedHotelIds.length) {
			message.error("Please select at least one hotel to sync.");
			return;
		}
		setOtaSyncRunning(true);
		try {
			const response = await runOtaReservationSyncCollector(
				currentUserId,
				otaSyncJob._id,
				{ selectedHotelIds },
			);
			if (!response || response.ok === false || !response.job) {
				message.error(
					response?.error || "Could not run OTA reservation sync collector.",
				);
				return;
			}
			setOtaSyncJob(response.job);
			message.success(
				response.alreadyRunning
					? "OTA collector is already running."
					: "OTA read-only collector started.",
			);
		} finally {
			setOtaSyncRunning(false);
		}
	};

	const handleSubmitOtaMfaCode = async () => {
		if (!currentUserId || !otaSyncJob?._id) {
			message.error("Missing OTA sync job context.");
			return;
		}
		const code = otaSyncMfaCode.trim();
		if (!code) {
			message.error("Enter the Expedia verification code.");
			return;
		}
		setOtaSyncMfaSubmitting(true);
		try {
			const response = await submitOtaReservationSyncMfaCode(
				currentUserId,
				otaSyncJob._id,
				{ code },
			);
			if (!response || response.ok === false) {
				if (response?.job) setOtaSyncJob(response.job);
				message.error(
					response?.error || "Could not submit Expedia verification code.",
				);
				return;
			}
			setOtaSyncMfaCode("");
			if (response.job) setOtaSyncJob(response.job);
			message.success("Expedia verification code submitted.");
		} finally {
			setOtaSyncMfaSubmitting(false);
		}
	};

	const handleApplyOtaSync = () => {
		if (!currentUserId || !otaSyncJob?._id) {
			message.error("Missing OTA sync job context.");
			return;
		}
		const status = String(otaSyncJob.status || "").toLowerCase();
		if (!["preview_ready", "apply_needs_review"].includes(status)) {
			message.error("Run the read-only collector and wait for a safe preview first.");
			return;
		}
		const summary = otaSyncJob.resultSummary || {};
		const newCount = Number(summary.newReservations || 0);
		const statusCount = Number(summary.statusChanged || 0);
		const safeWriteCount = newCount + statusCount;
		if (!safeWriteCount) {
			message.info("There are no safe OTA sync writes to save.");
			return;
		}

		Modal.confirm({
			title: "Save safe OTA sync writes?",
			content: `This will create up to ${newCount} new Expedia reservation(s) and apply ${statusCount} cancelled/no-show status change(s). Existing reservation pricing, payment breakdowns, commission, and finance fields will not be overwritten.`,
			okText: "Save Safe Writes",
			cancelText: "Cancel",
			centered: true,
			zIndex: 30180,
			rootClassName: "ota-reservation-sync-confirm-root",
			className: "ota-reservation-sync-confirm-modal",
			onOk: async () => {
				setOtaSyncApplying(true);
				try {
					const response = await applyOtaReservationSyncJob(
						currentUserId,
						otaSyncJob._id,
						{ source: "admin_all_reservations" },
					);
					if (!response || response.ok === false || !response.job) {
						if (response?.job) setOtaSyncJob(response.job);
						message.error(
							response?.error || "Could not save OTA reservation sync writes.",
						);
						return Promise.reject(
							new Error(response?.error || "ota_sync_apply_failed"),
						);
					}
					setOtaSyncJob(response.job);
					const applySummary =
						response.summary || response.job.applyResults?.summary || {};
					message.success(
						`Saved ${Number(applySummary.appliedWrites || 0)} OTA sync write(s).`,
					);
					if (Number(applySummary.appliedWrites || 0) > 0) {
						onReservationUpdated();
					}
					return response.job;
				} finally {
					setOtaSyncApplying(false);
				}
			},
		});
	};

	useEffect(() => {
		const jobId = otaSyncJob?._id;
		const status = String(otaSyncJob?.status || "").toLowerCase();
		if (
			!currentUserId ||
			!jobId ||
			!OTA_SYNC_RUNNING_STATUSES.has(status)
		) {
			return undefined;
		}

		let cancelled = false;
		const refreshJob = async () => {
			const response = await readOtaReservationSyncJob(currentUserId, jobId);
			if (!cancelled && response?.ok !== false && response?.job) {
				setOtaSyncJob(response.job);
			}
		};
		const timer = window.setInterval(refreshJob, 2500);
		refreshJob();
		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [currentUserId, otaSyncJob?._id, otaSyncJob?.status]);

	// ------------------ Render ------------------
	const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 1;
	const totalPages = Math.ceil(totalDocuments / safePageSize);
	const baseIndex =
		(Number(currentPage) > 1 ? Number(currentPage) - 1 : 0) * safePageSize;
	const reservedByActive = (val) => (activeReservedBy || "") === (val || "");
	const bookingSourceActive = (val) =>
		(activeBookingSource || "") === (val || "");
	const showReservedByFilter =
		typeof onReservedByChange === "function" &&
		(allowAllReservedBy || Boolean(selfReservedBy));
	const showBookingSourceFilter =
		typeof onBookingSourceChange === "function";
	const isArabicTable = chosenLanguage === "Arabic";
	const tableLabels = isArabicTable
		? {
				hotel: "الفندق",
				confirmation: "رقم التأكيد",
				guest: "الضيف",
				roomType: "\u0646\u0648\u0639 \u0627\u0644\u063a\u0631\u0641\u0629",
				roomNumber: "\u0631\u0642\u0645 \u0627\u0644\u063a\u0631\u0641\u0629",
				source: "مصدر الحجز",
				status: "الحالة",
				payment: "الدفع",
				booked: "تاريخ الحجز",
				checkIn: "الوصول",
				checkOut: "المغادرة",
				nights: "الليالي",
				pricePerDay: "سعر الليلة",
				total: "الإجمالي",
				paidAmount: "المدفوع",
				moreDetails: "التفاصيل",
				sar: "ريال",
				noReservationsFound: "لا توجد حجوزات",
		  }
		: {
				hotel: "Hotel",
				confirmation: "Confirmation",
				guest: "Guest",
				roomType: "Room Type",
				roomNumber: "Room #",
				source: "Source",
				status: "Status",
				payment: "Payment",
				booked: "Booked",
				checkIn: "Check In",
				checkOut: "Check Out",
				nights: "Nights",
				pricePerDay: "Price/Day",
				total: "Total",
				paidAmount: "Paid Amount",
				moreDetails: "More Details",
				sar: "SAR",
				noReservationsFound: "No reservations found",
		  };
	const otaSyncTargetHotels = otaSyncJob?.targetHotels || [];
	const otaSyncSelectedSet = new Set(
		otaSyncSelectedHotelIds.map((hotelId) => String(hotelId)),
	);
	const otaSyncStatus = String(otaSyncJob?.status || "").toLowerCase();
	const otaSyncCollectorActive =
		OTA_SYNC_RUNNING_STATUSES.has(otaSyncStatus);
	const otaSyncMissingCredentials =
		Boolean(otaSyncJob?.credentialSummary?.missing?.length) ||
		otaSyncStatus === "needs_credentials";
	const otaSyncSelectedCount = otaSyncTargetHotels.filter((hotel) =>
		otaSyncSelectedSet.has(String(hotel.hotelId || "")),
	).length;
	const canRunOtaCollector =
		Boolean(otaSyncJob?._id) &&
		Boolean(currentUserId) &&
		otaSyncSelectedCount > 0 &&
		!otaSyncCollectorActive &&
		!otaSyncApplying &&
		!otaSyncMissingCredentials;
	const otaSyncSummary = otaSyncJob?.resultSummary || {};
	const otaSyncNewCount = Number(otaSyncSummary.newReservations || 0);
	const otaSyncStatusChangeCount = Number(otaSyncSummary.statusChanged || 0);
	const otaSyncSafeWriteCount = otaSyncNewCount + otaSyncStatusChangeCount;
	const otaSyncApplyRetryable = ["preview_ready", "apply_needs_review"].includes(
		otaSyncStatus,
	);
	const canApplyOtaSync =
		Boolean(otaSyncJob?._id) &&
		Boolean(currentUserId) &&
		otaSyncApplyRetryable &&
		otaSyncSafeWriteCount > 0 &&
		!otaSyncCollectorActive &&
		!otaSyncApplying;
	const otaSyncCollectorState = otaSyncJob?.collectorState || {};
	const otaSyncArtifacts = otaSyncJob?.collectorArtifacts || {};
	const otaSyncApplySummary = otaSyncJob?.applyResults?.summary || null;
	const otaSyncNeedsMfa = otaSyncStatus === "needs_mfa";
	const otaSyncExpediaPropertyCount =
		typeof otaSyncArtifacts.propertyCount === "number"
			? otaSyncArtifacts.propertyCount
			: null;
	const toggleOtaSyncHotel = (hotelId, checked) => {
		const normalized = String(hotelId || "");
		setOtaSyncSelectedHotelIds((prev) => {
			const next = new Set(prev.map((id) => String(id)));
			if (checked) next.add(normalized);
			else next.delete(normalized);
			return Array.from(next);
		});
	};
	const selectAllOtaSyncHotels = () => {
		setOtaSyncSelectedHotelIds(
			otaSyncTargetHotels
				.map((hotel) => String(hotel.hotelId || ""))
				.filter(Boolean),
		);
	};
	const clearOtaSyncHotels = () => setOtaSyncSelectedHotelIds([]);
	const sortArrow = (field) => {
		if (sortConfig.sortField !== field) return "";
		return sortConfig.direction === "asc" ? "^" : "v";
	};
	const sortableHeader = (label, field) => (
		<button
			type='button'
			className='sortable-heading'
			onClick={() => handleSortLabelClick(field)}
			aria-pressed={sortConfig.sortField === field}
		>
			<span>{label}</span>
			{sortArrow(field) ? (
				<span className='sort-arrow'>{sortArrow(field)}</span>
			) : null}
		</button>
	);

	return (
		<ContentTableWrapper
			$isArabic={isArabicTable}
			$isReport={fromPage === "reports"}
		>
			<AdminReservationDetailsModalGlobalStyle />

			{/* ScoreCards */}
			<ScoreCards
				scorecardsObject={scorecardsObject}
				totalReservations={sortedData.length}
				fromPage={fromPage}
				activeFilter={filterType}
				onFilterSelect={onFilterClick}
			/>

			{/* Reserved By Filter Row */}
			{showReservedByFilter ? (
				<ReservedByFilterContainer>
					<ReservedByTitle>Reserved By:</ReservedByTitle>

					{allowAllReservedBy ? (
						<>
							<UserFilterButton
								onClick={() => onReservedByChange("")}
								isActive={reservedByActive("")}
							>
								All
							</UserFilterButton>
							{reservedByOptions.map((rb) => (
								<UserFilterButton
									key={rb}
									isActive={reservedByActive(rb)}
									onClick={() =>
										onReservedByChange(reservedByActive(rb) ? "" : rb)
									}
								>
									<span style={{ textTransform: "capitalize" }}>{rb}</span>
								</UserFilterButton>
							))}
						</>
					) : (
						<UserFilterButton isActive disabled>
							<span style={{ textTransform: "capitalize" }}>
								{selfReservedBy}
							</span>
						</UserFilterButton>
					)}
				</ReservedByFilterContainer>
			) : null}

			{/* NEW: Booking Source Filter Row */}
			{showBookingSourceFilter ? (
				<ReservedByFilterContainer>
					<ReservedByTitle>Booking Source:</ReservedByTitle>
					<UserFilterButton
						onClick={() => onBookingSourceChange("")}
						isActive={bookingSourceActive("")}
					>
						All
					</UserFilterButton>
					{bookingSourceOptions.map((bs) => (
						<UserFilterButton
							key={bs}
							isActive={bookingSourceActive(bs)}
							onClick={() =>
								onBookingSourceChange(bookingSourceActive(bs) ? "" : bs)
							}
						>
							<span style={{ textTransform: "capitalize" }}>{bs}</span>
						</UserFilterButton>
					))}
				</ReservedByFilterContainer>
			) : null}

			{fromPage === "reports" ? null : (
				<FilterButtonContainer>
					{/* Single Date Filter button + clear */}
					<FilterButton onClick={openDateModal} title='Filter by date range'>
						<CalendarOutlined style={{ marginRight: 6 }} />
						Filter by Date
					</FilterButton>
					{dateFilter?.type ? (
						<FilterButton onClick={clearDateFilter} isActive>
							Clear Date Filter
						</FilterButton>
					) : null}

					{/* Payment-related */}
					<FilterButton
						onClick={() => onFilterClick("notPaid")}
						isActive={filterType === "notPaid"}
					>
						Not Paid
					</FilterButton>
					<FilterButton
						onClick={() => onFilterClick("notCaptured")}
						isActive={filterType === "notCaptured"}
					>
						Not Captured
					</FilterButton>
					<FilterButton
						onClick={() => onFilterClick("captured")}
						isActive={filterType === "captured"}
					>
						Captured
					</FilterButton>
					<FilterButton
						style={{ fontWeight: "bold" }}
						onClick={() => onFilterClick("paidOffline")}
						isActive={filterType === "paidOffline"}
					>
						Paid Offline
					</FilterButton>

					{/* Reservation status */}
					<FilterButton
						onClick={() => onFilterClick("confirmed")}
						isActive={filterType === "confirmed"}
					>
						Confirmed
					</FilterButton>
					<FilterButton
						onClick={() => onFilterClick("inhouse")}
						isActive={filterType === "inhouse"}
					>
						Inhouse
					</FilterButton>
					<FilterButton
						onClick={() => onFilterClick("checked_out")}
						isActive={filterType === "checked_out"}
					>
						Checked Out
					</FilterButton>
					<FilterButton
						onClick={() => onFilterClick("early_checked_out")}
						isActive={filterType === "early_checked_out"}
					>
						Early Check Out
					</FilterButton>
					<FilterButton
						onClick={() => onFilterClick("no_show")}
						isActive={filterType === "no_show"}
					>
						No Show
					</FilterButton>
					<FilterButton
						onClick={() => onFilterClick("cancelled")}
						isActive={filterType === "cancelled"}
					>
						Cancelled
					</FilterButton>
					<FilterButton
						onClick={() => onFilterClick("notCancelled")}
						isActive={filterType === "notCancelled"}
					>
						Un-Cancelled
					</FilterButton>

					<FilterButton onClick={handleClearAllFilters}>Clear All</FilterButton>
				</FilterButtonContainer>
			)}

			<AdminActionsRow $isReport={fromPage === "reports"}>
				<ExportToExcelButton
					data={sortedData}
					allHotelDetailsAdmin={allHotelDetailsAdmin}
					exportCurrentData={fromPage === "reports"}
					chosenLanguage={chosenLanguage}
				/>
				{canPrepareOtaSync ? (
					<SyncReservationsButton
						type='primary'
						icon={<SyncOutlined />}
						loading={otaSyncPreparing}
						onClick={handlePrepareOtaSync}
					>
						Synchronize OTA Reservations
					</SyncReservationsButton>
				) : null}
			</AdminActionsRow>

			{/* Search Box */}
			{fromPage === "reports" ? null : (
				<div style={{ margin: "16px 0" }}>
					<Input
						placeholder='Search by confirmation, phone, name, or hotel name...'
						style={{ width: 500, marginRight: 8 }}
						value={searchBoxValue}
						onChange={(e) => setSearchBoxValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								setSearchTerm(searchBoxValue);
								handleSearch();
							}
						}}
					/>
					<Button
						type='primary'
						onClick={() => {
							setSearchTerm(searchBoxValue);
							handleSearch();
						}}
					>
						Search
					</Button>
				</div>
			)}

			{/* Table */}
			<TableWrapper>
				<StyledTable
					className='admin-reservation-list-table'
					$minWidth={ADMIN_RESERVATION_TABLE_MIN_WIDTH}
				>
					<colgroup>
						{ADMIN_RESERVATION_TABLE_COLUMN_WIDTHS.map((width, index) => (
							<col key={`${index}-${width}`} style={{ width }} />
						))}
					</colgroup>
					<thead>
						<tr>
							<th>#</th>
							<th>{sortableHeader(tableLabels.hotel, "hotel_name")}</th>
							<th>{sortableHeader(tableLabels.confirmation, "confirmation_number")}</th>
							<th>{sortableHeader(tableLabels.guest, "customer_name")}</th>
							<th>{sortableHeader(tableLabels.roomNumber, "room_number_display")}</th>
							<th>{sortableHeader(tableLabels.source, "booking_source")}</th>
							<th>{sortableHeader(tableLabels.status, "reservation_status")}</th>
							<th>{sortableHeader(tableLabels.payment, "payment_status")}</th>
							<th>{sortableHeader(tableLabels.booked, "createdAt")}</th>
							<th>{sortableHeader(tableLabels.checkIn, "checkin_date")}</th>
							<th>{sortableHeader(tableLabels.checkOut, "checkout_date")}</th>
							<th>{sortableHeader(tableLabels.nights, "reservation_nights")}</th>
							<th>{sortableHeader(tableLabels.pricePerDay, "price_per_day")}</th>
							<th>{sortableHeader(tableLabels.total, "display_total_amount")}</th>
							<th>{sortableHeader(tableLabels.paidAmount, "paid_amount_display")}</th>
							<th>{tableLabels.moreDetails}</th>
						</tr>
					</thead>
					<tbody>
						{sortedData.length ? (
							sortedData.map((reservation, i) => {
								const statusText = adminLocalizeStatus(
									reservation.reservation_status,
									chosenLanguage
								);
								const paymentText =
									reservation.payment_status || reservation.payment || "-";
								const mainBookingSource = reservation.booking_source || "-";
								const originalBookingSource =
									reservation.customer_booking_source ||
									reservation.customer_details?.booking_source ||
									"";
								const showOriginalBookingSource =
									originalBookingSource &&
									originalBookingSource.toLowerCase() !==
										String(mainBookingSource || "").toLowerCase();

								return (
									<tr
										key={
											reservation._id || `${reservation.confirmation_number}-${i}`
										}
									>
										<td>{baseIndex + i + 1}</td>
										<td className='hotel-cell'>
											<button
												type='button'
												className='link-btn'
												onClick={() => handleHotelClick(reservation)}
											>
												<AdminTableTooltipText
													value={reservation.hotel_name}
													className='table-truncate'
												/>
											</button>
										</td>
										<td>
											<button
												type='button'
												className='link-btn'
												onClick={() => showDetailsModal(reservation)}
											>
												<AdminTableTooltipText
													value={reservation.confirmation_number}
													max={16}
												/>
											</button>
										</td>
										<td className='guest-cell'>
											<AdminTableTooltipText
												value={reservation.customer_name}
												className='table-truncate'
											/>
										</td>
										<td>
											<AdminTableTooltipText
												value={reservation.room_number_display}
												max={16}
											/>
										</td>
										<td className='source-cell'>
											<div className='source-stack'>
												<AdminTableTooltipText
													value={mainBookingSource}
													className='table-truncate'
												/>
												{showOriginalBookingSource ? (
													<small>
														Original:{" "}
														<span>{originalBookingSource}</span>
													</small>
												) : null}
											</div>
										</td>
										<td>
											<AdminStatusPill
												$tone={adminStatusTone(reservation.reservation_status)}
											>
												<AdminTableTooltipText value={statusText} max={18} />
											</AdminStatusPill>
										</td>
										<td>
											{reservation.payment_status_hint ? (
												<Tooltip title={reservation.payment_status_hint}>
													<span>
														<AdminTableTooltipText value={paymentText} max={18} />
													</span>
												</Tooltip>
											) : (
												<AdminTableTooltipText value={paymentText} max={18} />
											)}
										</td>
										<td className='date-cell'>
											<AdminTableTooltipText
											value={formatAdminDate(
												reservation.booked_at || reservation.createdAt,
												chosenLanguage,
											)}
											max={22}
												className='date-truncate'
											/>
										</td>
										<td className='date-cell'>
											<AdminTableTooltipText
											value={formatAdminDate(
												reservation.checkin_date,
												chosenLanguage,
											)}
											max={22}
												className='date-truncate'
											/>
										</td>
										<td className='date-cell'>
											<AdminTableTooltipText
											value={formatAdminDate(
												reservation.checkout_date,
												chosenLanguage,
											)}
											max={22}
												className='date-truncate'
											/>
										</td>
										<td className='amount-cell'>{reservation.reservation_nights}</td>
										<td className='amount-cell'>
											<AdminTableTooltipText
												value={`${formatAdminMoney(reservation.price_per_day)} ${tableLabels.sar}`}
												max={18}
											/>
										</td>
										<td className='amount-cell'>
											<AdminTableTooltipText
												value={`${formatAdminMoney(reservation.display_total_amount)} ${tableLabels.sar}`}
												max={18}
											/>
										</td>
										<td className='amount-cell'>
											<AdminTableTooltipText
												value={`${formatAdminMoney(reservation.paid_amount_display)} ${tableLabels.sar}`}
												max={18}
											/>
										</td>
										<td>
											<button
												type='button'
												className='link-btn'
												onClick={() => showDetailsModal(reservation)}
											>
												{tableLabels.moreDetails}
											</button>
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td colSpan='16'>{tableLabels.noReservationsFound}</td>
							</tr>
						)}
					</tbody>
				</StyledTable>
			</TableWrapper>
			{/* Server Pagination Controls */}
			<PaginationWrapper>
				<Button
					onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
					disabled={currentPage <= 1}
				>
					Prev
				</Button>
				<span style={{ margin: "0 8px" }}>
					Page {currentPage} of {totalPages}
				</span>
				<Button
					onClick={() =>
						currentPage < totalPages && setCurrentPage(currentPage + 1)
					}
					disabled={currentPage >= totalPages}
				>
					Next
				</Button>
			</PaginationWrapper>

			{/* Details Modal */}
			<Modal
				open={isModalVisible}
				onCancel={handleModalClose}
				width='min(98vw, 1720px)'
				centered
				className='admin-reservation-details-modal reservation-details-modal'
				rootClassName='admin-reservation-details-layer'
				wrapClassName='admin-reservation-details-wrap'
				footer={null}
				destroyOnClose
				getContainer={() => document.body}
				zIndex={16000}
				styles={{
					mask: {
						zIndex: 15999,
					},
					header: {
						display: "none",
					},
					content: {
						padding: "6px 8px 8px",
					},
					body: {
						maxHeight: "92vh",
						overflowY: "auto",
						padding: "0",
					},
				}}
			>
				{selectedReservation ? (
					<MoreDetails
						key={getReservationKey(selectedReservation)}
						selectedReservation={selectedReservation}
						hotelDetails={selectedReservation.hotelId}
						reservation={selectedReservation}
						setReservation={updateSelectedReservation}
						onReservationUpdated={handleReservationUpdated}
					/>
				) : null}
			</Modal>

			{/* Date Filter Modal */}
			<DateFilterModal
				open={dateModalOpen}
				onClose={closeDateModal}
				onApply={applyDateFilter}
				onClear={clearDateFilter}
				initialType={dateFilter?.type || ""}
				initialFrom={dateFilter?.from || ""}
				initialTo={dateFilter?.to || ""}
			/>

			<Modal
				title='OTA Reservation Sync'
				open={!!otaSyncJob}
				onCancel={() => setOtaSyncJob(null)}
				rootClassName='ota-reservation-sync-modal-root'
				wrapClassName='ota-reservation-sync-modal-wrap'
				footer={[
					<Button
						key='apply'
						type='primary'
						loading={otaSyncApplying}
						disabled={!canApplyOtaSync}
						onClick={handleApplyOtaSync}
					>
						Save Safe Writes
					</Button>,
					<Button
						key='run'
						type='primary'
						icon={<SyncOutlined />}
						loading={otaSyncRunning || otaSyncCollectorActive}
						disabled={!canRunOtaCollector || otaSyncApplying}
						onClick={handleRunOtaCollector}
					>
						{otaSyncCollectorActive ? "Running Collector" : "Run Read-only Collector"}
					</Button>,
					<Button key='close' type='primary' onClick={() => setOtaSyncJob(null)}>
						Close
					</Button>,
				]}
				width='min(96vw, 1180px)'
				zIndex={30050}
				centered
				styles={{
					mask: { zIndex: 30049 },
					content: { maxHeight: "calc(100vh - 32px)" },
					body: { maxHeight: "calc(100vh - 150px)", overflowY: "auto" },
				}}
			>
				{otaSyncJob ? (
					<SyncJobPanel>
						<SyncJobGrid>
							<div>
								<span>Provider</span>
								<strong>{otaSyncJob.collectorPlan?.providerLabel || "Expedia"}</strong>
							</div>
							<div>
								<span>Job</span>
								<strong dir='ltr'>{otaSyncJob.jobNumber}</strong>
							</div>
							<div>
								<span>Status</span>
								<strong>{otaSyncJob.status}</strong>
							</div>
							<div>
								<span>Hotels</span>
								<strong dir='ltr'>
									{otaSyncSelectedCount} selected / {otaSyncJob.hotelCount} target
									{otaSyncJob.collectorPlan?.activeHotelCount
										? ` / ${otaSyncJob.collectorPlan.activeHotelCount} active PMS`
										: ""}
								</strong>
							</div>
							<div>
								<span>Expedia Properties</span>
								<strong dir='ltr'>
									{otaSyncExpediaPropertyCount === null
										? "after login"
										: otaSyncExpediaPropertyCount}
								</strong>
							</div>
							<div>
								<span>Range</span>
								<strong dir='ltr'>
									{otaSyncJob.dateFrom} to {otaSyncJob.dateTo}
								</strong>
							</div>
						</SyncJobGrid>
						<SyncNotice dir='ltr'>
							{otaSyncJob.collectorPlan?.nextStep ||
								"Run the supervised read-only collector, then review the preview buckets before applying anything."}
						</SyncNotice>
						{otaSyncCollectorState?.status ? (
							<SyncState dir='ltr'>
								<strong>{otaSyncCollectorState.status}</strong>
								{otaSyncCollectorState.currentHotelName ? (
									<span>
										Hotel {otaSyncCollectorState.currentHotelIndex || ""} of{" "}
										{otaSyncCollectorState.selectedHotelCount ||
											otaSyncSelectedCount ||
											otaSyncJob.hotelCount}
										: {otaSyncCollectorState.currentHotelName}
									</span>
								) : null}
								{otaSyncCollectorState.message ? (
									<span>{otaSyncCollectorState.message}</span>
								) : null}
								{otaSyncCollectorState.error ? (
									<span>{otaSyncCollectorState.error}</span>
								) : null}
							</SyncState>
						) : null}
						{otaSyncNeedsMfa ? (
							<SyncMfaBox dir='ltr'>
								<strong>Expedia verification code</strong>
								<div>
									<Input
										value={otaSyncMfaCode}
										onChange={(event) =>
											setOtaSyncMfaCode(event.target.value)
										}
										onPressEnter={handleSubmitOtaMfaCode}
										placeholder='Enter MFA code'
										autoComplete='one-time-code'
										inputMode='numeric'
										maxLength={16}
									/>
									<Button
										type='primary'
										loading={otaSyncMfaSubmitting}
										onClick={handleSubmitOtaMfaCode}
									>
										Submit Code
									</Button>
								</div>
							</SyncMfaBox>
						) : null}
						{Object.keys(otaSyncSummary || {}).length ? (
							<SyncSummaryGrid dir='ltr'>
								{OTA_SYNC_BUCKET_LABELS.map((bucket) => (
									<div key={bucket.key}>
										<span>{bucket.label}</span>
										<strong>{Number(otaSyncSummary[bucket.key] || 0)}</strong>
									</div>
								))}
							</SyncSummaryGrid>
						) : null}
						{otaSyncApplySummary ? (
							<SyncState dir='ltr'>
								<strong>apply summary</strong>
								<span>
									created {Number(otaSyncApplySummary.created || 0)} / status{" "}
									{Number(otaSyncApplySummary.statusUpdated || 0)} / needs review{" "}
									{Number(otaSyncApplySummary.needsReview || 0)} / failed{" "}
									{Number(otaSyncApplySummary.failed || 0)}
								</span>
							</SyncState>
						) : null}
						{otaSyncJob.credentialSummary?.missing?.length ? (
							<SyncWarning dir='ltr'>
								Missing server env:{" "}
								{otaSyncJob.credentialSummary.missing.join(", ")}
							</SyncWarning>
						) : null}
						{otaSyncJob.collectorPlan?.warnings?.length ? (
							<SyncWarningList dir='ltr'>
								{otaSyncJob.collectorPlan.warnings.map((warning, index) => (
									<li key={`${warning}-${index}`}>{warning}</li>
								))}
							</SyncWarningList>
						) : null}
						<SyncSelectionToolbar dir='ltr'>
							<strong>
								Select hotels to sync: {otaSyncSelectedCount} of{" "}
								{otaSyncTargetHotels.length}
							</strong>
							<div>
								<Button
									size='small'
									onClick={selectAllOtaSyncHotels}
									disabled={otaSyncCollectorActive || otaSyncApplying}
								>
									Select All
								</Button>
								<Button
									size='small'
									onClick={clearOtaSyncHotels}
									disabled={otaSyncCollectorActive || otaSyncApplying}
								>
									Clear
								</Button>
							</div>
						</SyncSelectionToolbar>
						<SyncHotelList>
							{otaSyncTargetHotels.map((hotel) => (
								<li key={hotel.hotelId}>
									<SyncHotelCheckbox
										checked={otaSyncSelectedSet.has(String(hotel.hotelId || ""))}
										disabled={otaSyncCollectorActive || otaSyncApplying}
										onChange={(event) =>
											toggleOtaSyncHotel(
												hotel.hotelId,
												event.target.checked,
											)
										}
									>
										<strong>{hotel.hotelName}</strong>
										<span>
											{(hotel.aliases || [])
												.map((alias) => alias.name)
												.filter(Boolean)
												.slice(0, 5)
												.join(" / ")}
										</span>
									</SyncHotelCheckbox>
								</li>
							))}
						</SyncHotelList>
					</SyncJobPanel>
				) : null}
			</Modal>
		</ContentTableWrapper>
	);
};

export default EnhancedContentTable;

/* ------------------ STYLES ------------------ */
const AdminReservationDetailsModalGlobalStyle = createGlobalStyle`
	.ota-reservation-sync-modal-root,
	.ota-reservation-sync-modal-root .ant-modal-mask,
	.ota-reservation-sync-modal-root .ant-modal-wrap {
		z-index: 30050 !important;
	}

	.ota-reservation-sync-modal-root .ant-modal-mask {
		z-index: 30049 !important;
	}

	.ota-reservation-sync-modal-wrap .ant-modal {
		max-width: calc(100vw - 24px);
	}

	.ota-reservation-sync-confirm-root,
	.ota-reservation-sync-confirm-root .ant-modal-mask,
	.ota-reservation-sync-confirm-root .ant-modal-wrap {
		z-index: 30180 !important;
	}

	.ota-reservation-sync-confirm-root .ant-modal-mask {
		z-index: 30179 !important;
	}

	.admin-reservation-details-layer .ant-modal-mask {
		background: rgba(15, 23, 42, 0.64) !important;
		backdrop-filter: blur(2px);
		z-index: 15999 !important;
	}

	.admin-reservation-details-layer .ant-modal-wrap,
	.admin-reservation-details-wrap,
	.admin-reservation-details-layer .ant-modal {
		z-index: 16000 !important;
	}

	.admin-reservation-details-layer .ant-modal-content {
		position: relative;
		z-index: 16001 !important;
	}

	.admin-reservation-details-modal {
		max-width: min(98vw, 1720px);
	}

	.admin-reservation-details-modal .ant-modal-close {
		align-items: center;
		background: #7f1d1d;
		border: 1px solid #991b1b;
		border-radius: 999px;
		color: #fff;
		display: inline-flex;
		height: 30px;
		justify-content: center;
		right: 8px;
		top: 6px;
		width: 30px;
		z-index: 6;
	}

	.admin-reservation-details-modal .ant-modal-close:hover {
		background: #991b1b;
		border-color: #b91c1c;
	}

	.admin-reservation-details-modal .ant-modal-close-x,
	.admin-reservation-details-modal .ant-modal-close-icon {
		color: #fff;
		font-size: 14px;
		line-height: 1;
	}

	.admin-reservation-details-modal .ant-modal-body {
		padding-top: 0 !important;
	}

	@media (max-width: 900px) {
		.admin-reservation-details-modal {
			max-width: calc(100vw - 12px);
			width: calc(100vw - 12px) !important;
		}

		.admin-reservation-details-modal .ant-modal-content {
			padding-left: 6px !important;
			padding-right: 6px !important;
		}

		.admin-reservation-details-modal .ant-modal-body {
			max-height: 90vh !important;
		}
	}
`;

const ContentTableWrapper = styled.div`
	width: 100%;
	min-width: 0;
	padding: ${(props) => (props.$isReport ? "12px 0 0" : "20px")};
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
`;

const AdminActionsRow = styled.div`
	margin: 10px 0 12px;
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	align-items: center;
	justify-content: ${(props) => (props.$isReport ? "center" : "space-between")};
`;

const SyncReservationsButton = styled(Button)`
	background: #0f766e;
	border-color: #0f766e;
	font-weight: 700;

	&:hover,
	&:focus {
		background: #115e59 !important;
		border-color: #115e59 !important;
	}
`;

const ReservedByFilterContainer = styled.div`
	margin: 10px 0 8px;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
`;

const ReservedByTitle = styled.span`
	font-weight: 600;
	margin-right: 6px;
`;

const FilterButtonContainer = styled.div`
	margin: 12px 0 16px 0;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
`;

const FilterButton = styled(Button)`
	font-size: 12px;
	background-color: ${(props) => (props.isActive ? "#d4edda" : "initial")};
	color: ${(props) => (props.isActive ? "#155724" : "initial")};
	border-color: ${(props) => (props.isActive ? "#c3e6cb" : "initial")};
`;

const UserFilterButton = styled(FilterButton)`
	text-transform: capitalize;
`;

const TableWrapper = styled.div`
	width: 100%;
	max-width: 100%;
	overflow-x: auto;
	overflow-y: hidden;
	-webkit-overflow-scrolling: touch;
	border: 1px solid #e6d3eb;
	border-radius: 8px;
	background: #fff;
	box-shadow: 0 8px 22px rgba(40, 16, 52, 0.06);
	margin-bottom: 16px;
`;

const StyledTable = styled.table`
	width: 100%;
	min-width: ${(props) => props.$minWidth || ADMIN_RESERVATION_TABLE_MIN_WIDTH}px;
	border-collapse: separate;
	border-spacing: 0;
	table-layout: fixed;

	th,
	td {
		padding: 8px 7px;
		border-right: 1px solid #edf2f7;
		border-bottom: 1px solid #edf2f7;
		color: #101828;
		font-size: 0.74rem;
		font-weight: 800;
		text-align: start;
		vertical-align: middle;
		white-space: nowrap;
		line-height: 1.32;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 2;
		overflow: visible;
		background: var(
			--pms-table-header-bg,
			linear-gradient(180deg, #244e7d 0%, #102033 100%)
		);
		border-bottom: 1px solid var(--pms-table-header-border, #2d5d91);
		color: var(--pms-table-header-color, #ffffff);
		font-size: 0.8rem;
		font-weight: 950;
		text-align: start;
		text-overflow: clip;
		text-transform: capitalize;
		white-space: nowrap;
	}

	td {
		overflow: hidden;
		text-overflow: ellipsis;
		text-transform: none;
	}

	tbody tr:nth-child(even) td {
		background: #fcfdff;
	}

	tbody tr:hover td {
		background: #fbf6ff;
	}

	th:first-child,
	td:first-child {
		text-align: center;
	}

	.hotel-cell,
	.guest-cell {
		color: #111827;
		font-weight: 950;
	}

	.source-cell {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.source-stack {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
		min-width: 0;
	}

	.source-stack small {
		color: #7c3aed;
		font-size: 0.68rem;
		font-weight: 850;
		line-height: 1.1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.table-truncate,
	button.link-btn,
	a.link-btn {
		display: inline-block;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: middle;
		white-space: nowrap;
	}

	.sortable-heading {
		display: inline-flex;
		align-items: center;
		justify-content: inherit;
		gap: 0.22rem;
		max-width: 100%;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font: inherit;
		font-weight: 950;
		padding: 0;
		white-space: nowrap;
	}

	.sortable-heading:hover {
		color: #f3dcff;
	}

	.sortable-heading > span:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sort-arrow {
		color: #f4c84f;
		font-size: 0.72rem;
		line-height: 1;
	}

	.status-pill {
		max-width: 100%;
		min-width: 0;
		padding-inline: 0.42rem;
	}

	.date-cell,
	.amount-cell {
		font-family: "Segoe UI", Tahoma, Arial, sans-serif;
		text-align: center;
	}

	.date-cell {
		direction: inherit;
		line-height: 1.45;
		unicode-bidi: plaintext;
	}

	.date-cell .date-truncate {
		display: inline-block;
		max-width: 22ch;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: middle;
		white-space: nowrap;
	}

	.amount-cell {
		direction: ltr;
		font-weight: 950;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
		white-space: nowrap;
	}

	button.link-btn,
	a.link-btn {
		border: 0;
		background: transparent;
		color: #0050b3;
		font-weight: 900;
		padding: 2px 0;
		text-align: start;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	button.link-btn:hover,
	a.link-btn:hover {
		color: var(--pms-metal-purple, #64166e);
	}

	@media (max-width: 720px) {
		th,
		td {
			padding: 8px 9px;
			font-size: 0.7rem;
		}

		th {
			font-size: 0.7rem;
		}
	}

`;

const AdminStatusPill = styled.span.attrs((props) => ({
	className: ["status-pill", props.className].filter(Boolean).join(" "),
}))`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.34rem;
	min-height: 26px;
	min-width: 78px;
	padding: 0.2rem 0.66rem;
	border: 1px solid
		${(props) =>
			props.$tone === "red"
				? "#d45b68"
				: props.$tone === "orange"
				  ? "#d89b2e"
				  : props.$tone === "green"
				    ? "#14a064"
				    : props.$tone === "softGreen"
				      ? "#87d6a0"
				      : props.$tone === "blue"
				        ? "#5b8bdc"
				        : props.$tone === "purple"
				          ? "#b47dc2"
				          : "#aab2c0"};
	border-radius: 999px;
	background: ${(props) =>
		props.$tone === "red"
			? "linear-gradient(135deg, #7f1d1d 0%, #c33546 100%)"
			: props.$tone === "orange"
			  ? "linear-gradient(135deg, #fff3d8 0%, #f7bf4b 100%)"
			  : props.$tone === "green"
			    ? "linear-gradient(135deg, #064e3b 0%, #0fa66b 100%)"
			    : props.$tone === "softGreen"
			      ? "linear-gradient(135deg, #eefbf3 0%, #d8f7e4 100%)"
			      : props.$tone === "blue"
			        ? "linear-gradient(135deg, #eef4ff 0%, #dfeaff 100%)"
			        : props.$tone === "purple"
			          ? "linear-gradient(135deg, #fffaff 0%, #ecd9f3 100%)"
			          : "linear-gradient(135deg, #f7f8fb 0%, #e9edf7 100%)"};
	color: ${(props) =>
		props.$tone === "red" || props.$tone === "green"
			? "#ffffff"
			: props.$tone === "orange"
			  ? "#4c3000"
			  : props.$tone === "softGreen"
			    ? "#08722c"
			    : props.$tone === "blue"
			      ? "#1d4f9d"
			      : props.$tone === "purple"
			        ? "#5d1d6e"
			        : "#263452"};
	font-size: 0.72rem;
	font-weight: 950;
	line-height: 1.25;
	box-shadow:
		inset 0 1px rgba(255, 255, 255, 0.28),
		0 4px 10px rgba(40, 16, 52, 0.08);

	&::before {
		content: "";
		width: 7px;
		height: 7px;
		flex: 0 0 7px;
		border-radius: 999px;
		background: ${(props) =>
			props.$tone === "red"
				? "#ffd1d6"
				: props.$tone === "orange"
				  ? "#7a4c00"
				  : props.$tone === "green"
				    ? "#c9ffe1"
				    : props.$tone === "softGreen"
				      ? "#14a064"
				      : props.$tone === "blue"
				        ? "#356ed1"
				        : props.$tone === "purple"
				          ? "#8d4c9d"
				          : "#6d7a99"};
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.28);
	}
`;

const PaginationWrapper = styled.div`
	display: flex;
	align-items: center;
	margin-top: 16px;
	button {
		margin-right: 8px;
	}
`;

const SyncJobPanel = styled.div`
	display: flex;
	flex-direction: column;
	gap: 14px;
`;

const SyncJobGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;

	div {
		border: 1px solid #d7e5e2;
		border-radius: 6px;
		padding: 10px 12px;
		background: #f8fbfa;
	}

	span {
		display: block;
		font-size: 12px;
		color: #64748b;
		margin-bottom: 3px;
	}

	strong {
		display: block;
		color: #123232;
		word-break: break-word;
	}

	@media (max-width: 780px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 560px) {
		grid-template-columns: 1fr;
	}
`;

const SyncNotice = styled.div`
	border: 1px solid #b7ddd5;
	background: #ecfdf8;
	color: #12564e;
	border-radius: 6px;
	padding: 10px 12px;
	font-weight: 600;
	text-align: left;
`;

const SyncState = styled.div`
	border: 1px solid #cbd5e1;
	background: #f8fafc;
	color: #123232;
	border-radius: 6px;
	padding: 9px 12px;
	text-align: left;

	strong,
	span {
		display: block;
	}

	span {
		color: #475569;
		font-size: 12px;
		margin-top: 2px;
	}
`;

const SyncMfaBox = styled.div`
	border: 1px solid #bfdbfe;
	background: #eff6ff;
	border-radius: 6px;
	padding: 10px 12px;

	strong {
		display: block;
		color: #123232;
		font-weight: 850;
		margin-bottom: 8px;
	}

	div {
		display: grid;
		grid-template-columns: minmax(160px, 1fr) auto;
		gap: 8px;
	}

	@media (max-width: 560px) {
		div {
			grid-template-columns: 1fr;
		}
	}
`;

const SyncSummaryGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 8px;

	div {
		border: 1px solid #dbeafe;
		border-radius: 6px;
		background: #eff6ff;
		padding: 8px 10px;
	}

	span {
		display: block;
		color: #475569;
		font-size: 12px;
	}

	strong {
		display: block;
		color: #0f172a;
		font-size: 16px;
		margin-top: 2px;
	}

	@media (max-width: 640px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
`;

const SyncWarning = styled.div`
	border: 1px solid #facc15;
	background: #fefce8;
	color: #854d0e;
	border-radius: 6px;
	padding: 10px 12px;
	font-weight: 600;
	text-align: left;
`;

const SyncWarningList = styled.ul`
	border: 1px solid #facc15;
	background: #fefce8;
	color: #854d0e;
	border-radius: 6px;
	padding: 10px 12px 10px 28px;
	margin: 0;
	font-weight: 600;
	text-align: left;

	li + li {
		margin-top: 6px;
	}
`;

const SyncSelectionToolbar = styled.div`
	align-items: center;
	display: flex;
	gap: 10px;
	justify-content: space-between;

	strong {
		color: #123232;
		font-weight: 800;
	}

	div {
		display: flex;
		gap: 8px;
	}

	@media (max-width: 560px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const SyncHotelList = styled.ul`
	list-style: none;
	padding: 0;
	margin: 0;
	max-height: min(38vh, 360px);
	overflow: auto;
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;

	li {
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 0;
		background: #ffffff;
	}

	strong,
	span {
		display: block;
	}

	span {
		color: #64748b;
		font-size: 12px;
		margin-top: 2px;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const SyncHotelCheckbox = styled(Checkbox)`
	align-items: flex-start;
	display: flex;
	gap: 9px;
	padding: 9px 11px;
	width: 100%;

	.ant-checkbox {
		margin-top: 2px;
	}

	.ant-checkbox + span {
		min-width: 0;
		width: 100%;
	}
`;
