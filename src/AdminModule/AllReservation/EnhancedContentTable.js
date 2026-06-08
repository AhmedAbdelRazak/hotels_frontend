// client/src/AdminModule/AllReservation/EnhancedContentTable.jsx
import React, { useState, useMemo, useEffect } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { Tooltip, Modal, Button, Input } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import ScoreCards from "./ScoreCards";
import MoreDetails from "./MoreDetails";
import ExportToExcelButton from "./ExportToExcelButton";
import DateFilterModal from "./DateFilterModal";
import { useHistory, useLocation } from "react-router-dom";

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

const formatAdminDate = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleDateString("en-US");
};

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
			const nights = getAdminReservationNights(reservation);
			const totalAmount = Number(reservation.total_amount || 0);
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
				createdAt: reservation.createdAt || null,
				payment_status: computedPaymentStatus,
				payment_status_hint: paypalAware.hint || "",
				reservation_nights: nights,
				price_per_day: pricePerDay,
				paid_amount_display: paidAmount,
			};
		});
	}, [data, capturedConfirmationNumbers]);

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
			const merged = { ...prev, ...updated };
			if (
				prev?.hotelId &&
				(!merged.hotelId ||
					typeof merged.hotelId !== "object" ||
					!merged.hotelId.hotelName)
			) {
				merged.hotelId = prev.hotelId;
			}
			return merged;
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
				return prev;
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

	// ------------------ Render ------------------
	const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 1;
	const totalPages = Math.ceil(totalDocuments / safePageSize);
	const baseIndex =
		(Number(currentPage) > 1 ? Number(currentPage) - 1 : 0) * safePageSize;
	const reservedByActive = (val) => (activeReservedBy || "") === (val || "");
	const bookingSourceActive = (val) =>
		(activeBookingSource || "") === (val || "");
	const isArabicTable = chosenLanguage === "Arabic";
	const tableLabels = isArabicTable
		? {
				hotel: "الفندق",
				confirmation: "رقم التأكيد",
				guest: "الضيف",
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
		<ContentTableWrapper>
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
			<ReservedByFilterContainer>
				<ReservedByTitle>Reserved By:</ReservedByTitle>

				{allowAllReservedBy ? (
					<>
						<UserFilterButton
							onClick={() => onReservedByChange && onReservedByChange("")}
							isActive={reservedByActive("")}
						>
							All
						</UserFilterButton>
						{reservedByOptions.map((rb) => (
							<UserFilterButton
								key={rb}
								isActive={reservedByActive(rb)}
								onClick={() =>
									onReservedByChange &&
									onReservedByChange(reservedByActive(rb) ? "" : rb)
								}
							>
								<span style={{ textTransform: "capitalize" }}>{rb}</span>
							</UserFilterButton>
						))}
					</>
				) : (
					// Non-super: show only own name, fixed & active
					<UserFilterButton isActive disabled>
						<span style={{ textTransform: "capitalize" }}>
							{selfReservedBy}
						</span>
					</UserFilterButton>
				)}
			</ReservedByFilterContainer>

			{/* NEW: Booking Source Filter Row */}
			<ReservedByFilterContainer>
				<ReservedByTitle>Booking Source:</ReservedByTitle>
				<UserFilterButton
					onClick={() => onBookingSourceChange && onBookingSourceChange("")}
					isActive={bookingSourceActive("")}
				>
					All
				</UserFilterButton>
				{bookingSourceOptions.map((bs) => (
					<UserFilterButton
						key={bs}
						isActive={bookingSourceActive(bs)}
						onClick={() =>
							onBookingSourceChange &&
							onBookingSourceChange(bookingSourceActive(bs) ? "" : bs)
						}
					>
						<span style={{ textTransform: "capitalize" }}>{bs}</span>
					</UserFilterButton>
				))}
			</ReservedByFilterContainer>

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

			{/* Export Button */}
			<ExportToExcelButton
				data={sortedData}
				allHotelDetailsAdmin={allHotelDetailsAdmin}
			/>

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
				<StyledTable className='admin-reservation-list-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>{sortableHeader(tableLabels.hotel, "hotel_name")}</th>
							<th>{sortableHeader(tableLabels.confirmation, "confirmation_number")}</th>
							<th>{sortableHeader(tableLabels.guest, "customer_name")}</th>
							<th>{sortableHeader(tableLabels.source, "booking_source")}</th>
							<th>{sortableHeader(tableLabels.status, "reservation_status")}</th>
							<th>{sortableHeader(tableLabels.payment, "payment_status")}</th>
							<th>{sortableHeader(tableLabels.booked, "createdAt")}</th>
							<th>{sortableHeader(tableLabels.checkIn, "checkin_date")}</th>
							<th>{sortableHeader(tableLabels.checkOut, "checkout_date")}</th>
							<th>{sortableHeader(tableLabels.nights, "reservation_nights")}</th>
							<th>{sortableHeader(tableLabels.pricePerDay, "price_per_day")}</th>
							<th>{sortableHeader(tableLabels.total, "total_amount")}</th>
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
												value={formatAdminDate(reservation.booked_at || reservation.createdAt)}
												max={16}
												className='date-truncate'
											/>
										</td>
										<td className='date-cell'>
											<AdminTableTooltipText
												value={formatAdminDate(reservation.checkin_date)}
												max={16}
												className='date-truncate'
											/>
										</td>
										<td className='date-cell'>
											<AdminTableTooltipText
												value={formatAdminDate(reservation.checkout_date)}
												max={16}
												className='date-truncate'
											/>
										</td>
										<td className='amount-cell'>{reservation.reservation_nights}</td>
										<td className='amount-cell'>
											{formatAdminMoney(reservation.price_per_day)} {tableLabels.sar}
										</td>
										<td className='amount-cell'>
											{formatAdminMoney(reservation.total_amount)} {tableLabels.sar}
										</td>
										<td className='amount-cell'>
											{formatAdminMoney(reservation.paid_amount_display)} {tableLabels.sar}
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
								<td colSpan='15'>{tableLabels.noReservationsFound}</td>
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
				zIndex={12000}
				styles={{
					mask: {
						zIndex: 11999,
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
		</ContentTableWrapper>
	);
};

export default EnhancedContentTable;

/* ------------------ STYLES ------------------ */
const AdminReservationDetailsModalGlobalStyle = createGlobalStyle`
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
	padding: 20px;
`;

const ReservedByFilterContainer = styled.div`
	margin: 12px 0 8px 0;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
	margin-bottom: 30px;
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
	min-width: 1180px;
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
		width: 2.6%;
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
		max-width: 16ch;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: middle;
		white-space: nowrap;
	}

	.amount-cell {
		direction: ltr;
		font-weight: 950;
		min-width: 82px;
		overflow: visible !important;
		text-overflow: clip !important;
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

	@media (min-width: 992px) {
		min-width: 0;

		th:nth-child(1),
		td:nth-child(1) {
			width: 2.6%;
		}

		th:nth-child(2),
		td:nth-child(2) {
			width: 6.7%;
		}

		th:nth-child(3),
		td:nth-child(3) {
			width: 6.2%;
		}

		th:nth-child(4),
		td:nth-child(4) {
			width: 12%;
		}

		th:nth-child(5),
		td:nth-child(5) {
			width: 9.7%;
		}

		th:nth-child(6),
		td:nth-child(6) {
			width: 7.4%;
		}

		th:nth-child(7),
		td:nth-child(7) {
			width: 5.8%;
		}

		th:nth-child(8),
		td:nth-child(8),
		th:nth-child(9),
		td:nth-child(9),
		th:nth-child(10),
		td:nth-child(10) {
			width: 5.7%;
		}

		th:nth-child(11),
		td:nth-child(11) {
			width: 3.7%;
		}

		th:nth-child(12),
		td:nth-child(12),
		th:nth-child(13),
		td:nth-child(13) {
			width: 6.8%;
		}

		th:nth-child(14),
		td:nth-child(14) {
			width: 6.5%;
		}

		th:nth-child(15),
		td:nth-child(15) {
			width: 4.3%;
		}
	}

	@media (max-width: 720px) {
		min-width: 980px;

		th,
		td {
			padding: 8px 9px;
			font-size: 0.7rem;
		}

		th {
			font-size: 0.7rem;
		}
	}

	@media (max-width: 420px) {
		min-width: 920px;
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
