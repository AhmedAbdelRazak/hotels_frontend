// PreReservationTable.js

import React, { useState, useMemo, useCallback, useEffect } from "react";
import styled, { createGlobalStyle } from "styled-components";
import moment from "moment";
import { Tooltip, Modal, Button, Pagination } from "antd"; // Ensure Pagination is correctly imported
import FilterComponent from "./FilterComponent";
import { getReservationSearchAllMatches } from "../apiAdmin";
import ReservationDetail from "./ReservationDetail";
import DownloadExcel from "./DownloadExcel";
import { useHistory, useLocation } from "react-router-dom";
import { formatSaudiHijriDate } from "../../utils/saudiDates";

const RESERVATION_DETAILS_MODAL_Z_INDEX = 12000;

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

const normalizeNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const hasPaidBreakdownCapture = (breakdown) => {
	if (!breakdown || typeof breakdown !== "object") return false;
	return Object.keys(breakdown).some((key) => {
		if (key === "payment_comments") return false;
		return normalizeNumber(breakdown[key], 0) > 0;
	});
};

const summarizePaymentStatus = (reservation = {}) => {
	const paymentModeRaw =
		(reservation?.payment ||
			reservation?.payment_status ||
			reservation?.financeStatus ||
			"") + "";
	const paymentMode = paymentModeRaw.toLowerCase().trim();
	const pd = reservation?.paypal_details || {};
	const legacyCaptured = !!reservation?.payment_details?.captured;
	const payOffline =
		normalizeNumber(reservation?.payment_details?.onsite_paid_amount, 0) > 0 ||
		paymentMode === "paid offline";
	const breakdownCaptured = hasPaidBreakdownCapture(
		reservation?.paid_amount_breakdown,
	);
	const capTotal = normalizeNumber(pd?.captured_total_usd, 0);
	const initialCompleted =
		(pd?.initial?.capture_status || "").toUpperCase() === "COMPLETED";
	const anyMitCompleted =
		Array.isArray(pd?.mit) &&
		pd.mit.some(
			(item) => (item?.capture_status || "").toUpperCase() === "COMPLETED",
		);

	const isCaptured =
		legacyCaptured ||
		capTotal > 0 ||
		initialCompleted ||
		anyMitCompleted ||
		paymentMode === "paid online" ||
		paymentMode === "captured" ||
		breakdownCaptured;

	const isNotPaid = paymentMode === "not paid" && !isCaptured && !payOffline;

	if (isCaptured) return "Captured";
	if (payOffline) return "Paid Offline";
	if (isNotPaid) return "Not Paid";
	return "Not Captured";
};

const getPendingRejectionReason = (reservation = {}) =>
	String(
		reservation?.pendingConfirmation?.rejectionReason ||
			reservation?.pending_confirmation_rejection_reason ||
			"",
	).trim();

const getReservationNights = (reservation = {}) => {
	const checkin = reservation.checkin_date
		? new Date(reservation.checkin_date)
		: null;
	const checkout = reservation.checkout_date
		? new Date(reservation.checkout_date)
		: null;
	const dateNights =
		checkin &&
		checkout &&
		!Number.isNaN(checkin.getTime()) &&
		!Number.isNaN(checkout.getTime())
			? Math.round((checkout.getTime() - checkin.getTime()) / 86400000)
			: null;
	if (Number.isFinite(dateNights) && dateNights >= 0) return dateNights;
	return Math.max(Number(reservation.days_of_residence || 0), 0);
};

const getReservationPricePerNight = (reservation = {}) => {
	const nights = Math.max(getReservationNights(reservation), 1);
	const total = Number(reservation.total_amount || 0);
	return Number.isFinite(total) ? total / nights : 0;
};

const cellText = (value, max = 20) => {
	const text =
		value === null || value === undefined || value === "" ? "-" : String(value);
	return text.length > max ? `${text.slice(0, max)}...` : text;
};

const CellTooltipText = ({ value, max = 20, dir = "auto" }) => {
	const text =
		value === null || value === undefined || value === "" ? "-" : String(value);
	const content = <span dir={dir}>{cellText(text, max)}</span>;
	if (text.length <= max) return content;
	return (
		<Tooltip title={<span dir={dir}>{text}</span>} placement='top'>
			{content}
		</Tooltip>
	);
};

const reservationTableLabels = (chosenLanguage) => {
	const isArabic = chosenLanguage === "Arabic";
	return {
		sortBy: isArabic ? "رتب حسب" : "Sort by",
		gregorianDates: isArabic ? "ميلادي" : "Gregorian",
		hijriDates: isArabic ? "هجري" : "Hijri",
		createdAt: isArabic ? "تاريخ الإنشاء" : "Creation Date",
		bookedAt: isArabic ? "تاريخ الحجز" : "Booking Date",
		source: isArabic ? "المصدر" : "Source",
		checkin: isArabic ? "الوصول" : "Check-in",
		checkout: isArabic ? "المغادرة" : "Checkout",
		nights: isArabic ? "الليالي" : "Nights",
		pricePerNight: isArabic ? "سعر الليلة" : "Price / Night",
		sar: isArabic ? "ر.س" : "SAR",
	};
};

const singleHotelSortOptions = (labels) => [
	{ value: "createdAt", label: labels.createdAt },
	{ value: "booking_source", label: labels.source },
	{ value: "checkin_date", label: labels.checkin },
	{ value: "checkout_date", label: labels.checkout },
];

const reservationStatusTone = (status = "") => {
	const normalized = String(status || "")
		.toLowerCase()
		.replace(/[_-]+/g, " ");
	if (/cancel|reject|no\s?show/.test(normalized)) return "red";
	if (/early checked out|checked out|closed/.test(normalized)) return "green";
	if (/inhouse|in house|checked in/.test(normalized)) return "softGreen";
	if (/pending|review/.test(normalized)) return "orange";
	if (/confirm|approved/.test(normalized)) return "blue";
	return "slate";
};

const reservationStatusStyle = (status = {}) => {
	const tone = reservationStatusTone(status);
	const palette = {
		red: { background: "#b00000", borderColor: "#b91c1c", color: "#ffffff" },
		green: { background: "#009b2b", borderColor: "#008a22", color: "#ffffff" },
		softGreen: { background: "#dff7e7", borderColor: "#56b870", color: "#08722c" },
		orange: { background: "#f2b500", borderColor: "#d89000", color: "#2a1d00" },
		blue: { background: "#e8f1ff", borderColor: "#1d5fd3", color: "#0b4abf" },
		slate: { background: "#e9edf7", borderColor: "#6d7a99", color: "#263452" },
	};
	return {
		...(palette[tone] || palette.slate),
		border: `1px solid ${(palette[tone] || palette.slate).borderColor}`,
		borderRadius: "2px",
		display: "inline-block",
		fontWeight: 950,
		minWidth: "78px",
		padding: "5px 10px",
		textAlign: "center",
	};
};

const PreReservationTable = ({
	allPreReservations,
	q,
	setQ,
	chosenLanguage,
	handlePageChange,
	handleFilterChange,
	currentPage,
	recordsPerPage,
	selectedFilter,
	setSelectedFilter,
	totalRecords,
	hotelDetails,
	setAllPreReservations,
	setSearchClicked,
	searchClicked,
	onSearch,
	selectedDates,
	setSelectedDates,
	reservationObject,
	sortBy = "createdAt",
	sortOrder = "desc",
	onSortChange,
}) => {
	const history = useHistory();
	const location = useLocation();
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [modalKey, setModalKey] = useState(0);
	const [dateMode, setDateMode] = useState("gregorian");
	const tableLabels = useMemo(
		() => reservationTableLabels(chosenLanguage),
		[chosenLanguage],
	);

	console.log(allPreReservations, "allPreReservations");

	const formatMoney = (value) => {
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) return "0";
		return parsed.toLocaleString();
	};

	const formatTableDate = useCallback(
		(value) => {
			if (!value) return "-";
			const parsed = moment(value);
			if (!parsed.isValid()) return "-";
			if (dateMode === "hijri") {
				return formatSaudiHijriDate(value, {
					language: chosenLanguage,
					month: chosenLanguage === "Arabic" ? "short" : "short",
				});
			}
			return parsed.format("YYYY-MM-DD");
		},
		[chosenLanguage, dateMode],
	);

	const sortArrow = (field) =>
		sortBy === field ? (sortOrder === "asc" ? "▲" : "▼") : "";

	const sortableHeader = (label, field) => (
		<button
			type='button'
			className='sortable-heading'
			onClick={() => onSortChange && onSortChange(field)}
			aria-pressed={sortBy === field}
		>
			<span>{label}</span>
			{sortArrow(field) ? (
				<span className='sort-arrow'>{sortArrow(field)}</span>
			) : null}
		</button>
	);

	// Define showDetailsModal before it's used and memoize it to prevent unnecessary re-renders
	const updateQueryParams = useCallback(
		(updates) => {
			const params = new URLSearchParams(location.search);
			Object.entries(updates).forEach(([key, value]) => {
				if (value === undefined || value === null || value === "") {
					params.delete(key);
				} else {
					params.set(key, String(value));
				}
			});
			const nextSearch = params.toString();
			const nextSearchString = nextSearch ? `?${nextSearch}` : "";
			if (nextSearchString === location.search) return;
			history.replace({
				pathname: location.pathname,
				search: nextSearchString,
			});
		},
		[history, location.pathname, location.search],
	);

	const showDetailsModal = useCallback(
		(reservation) => {
			setSelectedReservation(reservation);
			setIsModalVisible(true);
			updateQueryParams({ reservationId: getReservationKey(reservation) });
		},
		[updateQueryParams],
	);

	const handleOk = () => {
		setSelectedReservation(null);
		setIsModalVisible(false);
		setModalKey((prevKey) => prevKey + 1); // Increment the key
		updateQueryParams({ reservationId: "" });
	};

	const handleCancel = () => {
		setSelectedReservation(null);
		setIsModalVisible(false);
		setModalKey((prevKey) => prevKey + 1); // Increment the key
		updateQueryParams({ reservationId: "" });
	};

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const reservationId = params.get("reservationId");
		if (!reservationId) return;
		const match = allPreReservations.find((reservation) =>
			matchesReservationKey(reservation, reservationId),
		);
		if (!match) return;
		setSelectedReservation(match);
		setIsModalVisible(true);
	}, [location.search, allPreReservations]);

	const searchSubmit = (e) => {
		e.preventDefault();
		const trimmed = String(q || "").trim();
		if (typeof onSearch === "function") {
			onSearch(trimmed);
			return;
		}
		if (!trimmed) {
			if (typeof setSearchClicked === "function") {
				setSearchClicked(!searchClicked);
			}
			if (typeof setQ === "function") setQ("");
			return;
		}

		getReservationSearchAllMatches(trimmed, hotelDetails._id)
			.then((data) => {
				if (data && data.error) {
					console.log("Search error:", data.error);
				} else {
					setAllPreReservations(Array.isArray(data) ? data : [data]);
				}
			})
			.catch((error) => {
				console.error("Error in getReservationSearch:", error);
				// Handle additional error logic here
			});
	};

	// Remove eslint-disable-next-line by ensuring all dependencies are handled correctly
	// eslint-disable-next-line
	function getTotalAmount(reservation) {
		const dailyTotal =
			reservation.pickedRoomsType.reduce(
				(acc, room) => acc + Number(room.chosenPrice) * room.count,
				0,
			) + Number(0);
		return dailyTotal * reservation.days_of_residence;
	}

	// Define columns2 without the "details" column to avoid dependency on showDetailsModal
	const columns2 = useMemo(
		() => [
			{
				title: "#",
				dataIndex: "index",
				key: "index",
				render: (text, record, index) =>
					(currentPage - 1) * recordsPerPage + index + 1,
			},
			{
				title: chosenLanguage === "Arabic" ? "اسم الزائر" : "Client Name",
				dataIndex: "customer_details",
				key: "name",
				render: (customer_details) => customer_details.name,
			},

			{
				title: chosenLanguage === "Arabic" ? "رقم التأكيد" : "Confirmation",
				dataIndex: "confirmation_number",
				key: "confirmation_number",
			},
			{
				title: chosenLanguage === "Arabic" ? "مصدر الحجز" : "Source",
				dataIndex: "booking_source",
				key: "booking_source",
			},
			{
				title: chosenLanguage === "Arabic" ? "تاريخ الحجز" : "Booked On",
				dataIndex: "booked_at",
				key: "booked_at",
				render: (booked_at) => formatTableDate(booked_at),
			},
			{
				title: chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Check In",
				dataIndex: "checkin_date",
				key: "checkin_date",
				render: (checkin_date) => formatTableDate(checkin_date),
			},
			{
				title: chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Check Out",
				dataIndex: "checkout_date",
				key: "checkout_date",
				render: (checkout_date) => formatTableDate(checkout_date),
			},

			{
				title: chosenLanguage === "Arabic" ? "حالة الحجز" : "Status",
				dataIndex: "reservation_status",
				key: "reservation_status",
				render: (reservation_status, record) => {
					const style = reservationStatusStyle(reservation_status);
					const rejectionReason = getPendingRejectionReason(record);
					return (
						<div>
							<div style={style}>{reservation_status}</div>
							{rejectionReason ? (
								<RejectionReason title={rejectionReason}>
									{chosenLanguage === "Arabic" ? "سبب الرفض: " : "Rejection: "}
									{rejectionReason}
								</RejectionReason>
							) : null}
						</div>
					);
				},
			},
			{
				title: chosenLanguage === "Arabic" ? "أنواع الغرف" : "Room Types",
				dataIndex: "pickedRoomsType",
				key: "pickedRoomsType",
				render: (pickedRoomsType) =>
					pickedRoomsType.map((room, index) => (
						<div key={index}>{`${room.room_type}`}</div>
					)),
			},
			{
				title: chosenLanguage === "Arabic" ? "رقم الغرفة" : "Room Number",
				key: "roomDetails",
				render: (record) => {
					// ...roomDetails rendering logic (unchanged)
					if (record && record.roomDetails && record.roomDetails.length > 0) {
						if (record.roomDetails.length > 1) {
							return (
								<div>
									<div>
										{record.roomDetails[0] && record.roomDetails[0].room_number}
									</div>
									<button
										style={{
											background: "none",
											border: "none",
											color: "blue",
											cursor: "pointer",
											textDecoration: "underline",
											padding: "0",
											fontSize: "12px",
										}}
										onClick={() => {
											// Toggle visibility of remaining room numbers
											const roomDetailsElement = document.getElementById(
												`room-details-${record.confirmation_number}`,
											);
											if (roomDetailsElement.style.display === "none") {
												roomDetailsElement.style.display = "block";
											} else {
												roomDetailsElement.style.display = "none";
											}
										}}
									>
										+{record.roomDetails.length - 1} more
									</button>
									<div
										id={`room-details-${record.confirmation_number}`}
										style={{ display: "none" }}
									>
										{record.roomDetails.slice(1).map((room, index) => (
											<div key={index}>
												{room.room_number ? room.room_number : "No Room"}
											</div>
										))}
									</div>
								</div>
							);
						} else {
							return (
								<div>
									{record.roomDetails[0] && record.roomDetails[0].room_number
										? record.roomDetails[0] && record.roomDetails[0].room_number
										: "No Room"}
								</div>
							);
						}
					} else if (record && record.roomId && record.roomId.length > 0) {
						if (record.roomId.length > 1) {
							return (
								<div>
									<div>{record.roomId[0] && record.roomId[0].room_number}</div>
									<button
										style={{
											background: "none",
											border: "none",
											color: "blue",
											cursor: "pointer",
											textDecoration: "underline",
											padding: "0",
											fontSize: "12px",
										}}
										onClick={() => {
											// Toggle visibility of remaining room numbers
											const roomDetailsElement = document.getElementById(
												`room-details-${record.confirmation_number}`,
											);
											if (roomDetailsElement.style.display === "none") {
												roomDetailsElement.style.display = "block";
											} else {
												roomDetailsElement.style.display = "none";
											}
										}}
									>
										+{record.roomId.length - 1} more
									</button>
									<div
										id={`room-details-${record.confirmation_number}`}
										style={{ display: "none" }}
									>
										{record.roomId.slice(1).map((room, index) => (
											<div key={index}>
												{room.room_number ? room.room_number : "No Room"}
											</div>
										))}
									</div>
								</div>
							);
						} else {
							return (
								<div>
									{record.roomId[0] && record.roomId[0].room_number
										? record.roomId[0] && record.roomId[0].room_number
										: "No Room"}
								</div>
							);
						}
					}

					// If neither is available, return "No Room"
					return "No Room";
				},
			},

			{
				title: chosenLanguage === "Arabic" ? "المبلغ الإجمالي" : "Total Amount",
				dataIndex: "total_amount",
				width: 110,
				key: "total_amount",
				render: (total_amount) => `${formatMoney(total_amount)} SAR`,
			},
			// Removed the "details" column from columns2 to avoid dependency on showDetailsModal
		],
		[
			chosenLanguage,
			currentPage,
			formatTableDate,
			recordsPerPage,
			// Removed 'showDetailsModal' dependency by excluding "details" column
		],
	);

	// Prepare data for the standard table
	const tableData = useMemo(() => {
		return allPreReservations.map((reservation, index) => ({
			...reservation,
			key: reservation.confirmation_number, // Unique key for each row
			index: (currentPage - 1) * recordsPerPage + index + 1,
			payment_status_display: summarizePaymentStatus(reservation),
		}));
	}, [allPreReservations, currentPage, recordsPerPage]);

	return (
		<>
			<ReservationDetailsModalGlobalStyle />
			<PreReservationTableWrapper $isArabic={chosenLanguage === "Arabic"}>
				<ReservationToolbar>
					<SearchCard>
						<SearchTitle>
							{chosenLanguage === "Arabic" ? "البحث" : "Search"}
						</SearchTitle>
						<SearchForm onSubmit={searchSubmit}>
							<SearchInput
								type='text'
								value={q}
								onChange={(e) => setQ(e.target.value.toLowerCase())}
								placeholder={
									chosenLanguage === "Arabic"
										? "هاتف، اسم، بريد، رقم التأكيد، أو حالة الدفع"
										: "Phone, guest, email, confirmation, or payment status"
								}
								aria-label='Search'
							/>
							<SearchButton type='submit'>
								{chosenLanguage === "Arabic" ? "بحث" : "Search"}
							</SearchButton>
						</SearchForm>
					</SearchCard>

					<ToolbarSide>
						<DownloadExcel
							data={allPreReservations}
							columns={columns2}
							title={"Reservations Report"}
							currentPage={currentPage}
							recordsPerPage={recordsPerPage}
							chosenLanguage={chosenLanguage}
						/>
						<PaginationShell
							onClick={() => window.scrollTo({ top: 20, behavior: "smooth" })}
						>
							<Pagination
								current={currentPage}
								pageSize={recordsPerPage}
								total={totalRecords}
								onChange={handlePageChange}
								showLessItems
								showSizeChanger={false}
								responsive
								size='small'
							/>
						</PaginationShell>
					</ToolbarSide>
				</ReservationToolbar>

				{/* Filter Component */}
				<FilterComponent
					setSelectedFilter={setSelectedFilter}
					selectedFilter={selectedFilter}
					chosenLanguage={chosenLanguage}
					selectedDates={selectedDates}
					setSelectedDates={setSelectedDates}
					reservationObject={reservationObject}
				/>

				<TableControlBar $isArabic={chosenLanguage === "Arabic"}>
					<ControlGroup>
						<ControlButton
							type='button'
							$active={dateMode === "gregorian"}
							onClick={() => setDateMode("gregorian")}
						>
							{tableLabels.gregorianDates}
						</ControlButton>
						<ControlButton
							type='button'
							$active={dateMode === "hijri"}
							onClick={() => setDateMode("hijri")}
						>
							{tableLabels.hijriDates}
						</ControlButton>
					</ControlGroup>
					<ControlGroup>
						<ControlLabel>{tableLabels.sortBy}</ControlLabel>
						{singleHotelSortOptions(tableLabels).map((option) => {
							const active = sortBy === option.value;
							return (
								<ControlButton
									type='button'
									key={option.value}
									$active={active}
									onClick={() =>
										typeof onSortChange === "function"
											? onSortChange(option.value)
											: undefined
									}
								>
									{option.label}
									{active ? (sortOrder === "asc" ? " ^" : " v") : ""}
								</ControlButton>
							);
						})}
					</ControlGroup>
				</TableControlBar>

				{/* Custom HTML Table */}
				<TableWrapper>
					<StyledTable $isArabic={chosenLanguage === "Arabic"}>
						<thead>
							<tr>
								<th>#</th>
								<th>
									{chosenLanguage === "Arabic" ? "اسم الزائر" : "Client Name"}
								</th>
								<th>
									{chosenLanguage === "Arabic" ? "الهاتف" : "Client Phone"}
								</th>
								<th>
									{chosenLanguage === "Arabic" ? "رقم التأكيد" : "Confirmation"}
								</th>
								<th>{sortableHeader(chosenLanguage === "Arabic" ? "مصدر الحجز" : "Source", "booking_source")}</th>
								<th>
									{sortableHeader(chosenLanguage === "Arabic" ? "تاريخ الحجز" : "Booked On", "createdAt")}
								</th>
								<th>
									{sortableHeader(chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Check In", "checkin_date")}
								</th>
								<th>
									{sortableHeader(chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Check Out", "checkout_date")}
								</th>
								<th>{tableLabels.nights}</th>
								<th>{tableLabels.pricePerNight}</th>
								<th>
									{chosenLanguage === "Arabic"
										? "حالة السداد"
										: "Payment Status"}
								</th>
								<th>{chosenLanguage === "Arabic" ? "حالة الحجز" : "Status"}</th>
								<th>
									{chosenLanguage === "Arabic" ? "أنواع الغرف" : "Room Types"}
								</th>
								<th>
									{chosenLanguage === "Arabic" ? "رقم الغرفة" : "Room Number"}
								</th>
								<th>
									{chosenLanguage === "Arabic"
										? "المبلغ الإجمالي"
										: "Total Amount"}
								</th>
								<th>
									{chosenLanguage === "Arabic" ? "تفاصيل" : "Details"}
								</th>
							</tr>
						</thead>
						<tbody>
							{tableData.map((reservation) => (
								<tr key={reservation.key}>
									<td>{reservation.index}</td>
									<td>
										<CellTooltipText value={reservation.customer_details.name} />
									</td>
									<td>
										<CellTooltipText
											value={reservation.customer_details.phone}
											dir='ltr'
										/>
									</td>
									<td>
										<CellTooltipText
											value={reservation.confirmation_number}
											dir='ltr'
										/>
									</td>
									<td>
										<CellTooltipText value={reservation.booking_source} />
									</td>
									<td className='date-cell'>
										{formatTableDate(reservation.booked_at || reservation.createdAt)}
									</td>
									<td className='date-cell'>{formatTableDate(reservation.checkin_date)}</td>
									<td className='date-cell'>{formatTableDate(reservation.checkout_date)}</td>
									<td className='number-cell'>{getReservationNights(reservation)}</td>
									<td className='number-cell'>
										{formatMoney(getReservationPricePerNight(reservation))}{" "}
										{tableLabels.sar}
									</td>
									<td>
										{reservation.payment_status_display ||
											reservation.payment_status ||
											reservation.payment ||
											""}
									</td>
									<td>
										{/* Status with Conditional Styling */}
										<StatusSpan status={reservation.reservation_status}>
											{reservation.reservation_status}
										</StatusSpan>
										{getPendingRejectionReason(reservation) ? (
											<RejectionReason
												title={getPendingRejectionReason(reservation)}
											>
												{chosenLanguage === "Arabic"
													? "سبب الرفض: "
													: "Rejection: "}
												{getPendingRejectionReason(reservation)}
											</RejectionReason>
										) : null}
									</td>
									<td>
										{/* Room Types */}
										{reservation.pickedRoomsType.map((room, index) => (
											<div key={index}>
												<CellTooltipText value={room.room_type} />
											</div>
										))}
									</td>
									<td>
										{/* Room Number with Toggle */}
										{reservation.roomDetails &&
										reservation.roomDetails.length > 0 ? (
											reservation.roomDetails.length > 1 ? (
												<div>
													<div>
														{reservation.roomDetails[0] &&
															reservation.roomDetails[0].room_number}
													</div>
													<button
														style={{
															background: "none",
															border: "none",
															color: "blue",
															cursor: "pointer",
															textDecoration: "underline",
															padding: "0",
															fontSize: "12px",
														}}
														onClick={() => {
															// Toggle visibility of remaining room numbers
															const roomDetailsElement =
																document.getElementById(
																	`room-details-${reservation.confirmation_number}`,
																);
															if (roomDetailsElement.style.display === "none") {
																roomDetailsElement.style.display = "block";
															} else {
																roomDetailsElement.style.display = "none";
															}
														}}
													>
														+{reservation.roomDetails.length - 1} more
													</button>
													<div
														id={`room-details-${reservation.confirmation_number}`}
														style={{ display: "none" }}
													>
														{reservation.roomDetails
															.slice(1)
															.map((room, index) => (
																<div key={index}>
																	{room.room_number
																		? room.room_number
																		: "No Room"}
																</div>
															))}
													</div>
												</div>
											) : (
												<div>
													{reservation.roomDetails[0] &&
													reservation.roomDetails[0].room_number
														? reservation.roomDetails[0] &&
														  reservation.roomDetails[0].room_number
														: "No Room"}
												</div>
											)
										) : reservation.roomId && reservation.roomId.length > 0 ? (
											reservation.roomId.length > 1 ? (
												<div>
													<div>
														{reservation.roomId[0] &&
															reservation.roomId[0].room_number}
													</div>
													<button
														style={{
															background: "none",
															border: "none",
															color: "blue",
															cursor: "pointer",
															textDecoration: "underline",
															padding: "0",
															fontSize: "12px",
														}}
														onClick={() => {
															// Toggle visibility of remaining room numbers
															const roomDetailsElement =
																document.getElementById(
																	`room-details-${reservation.confirmation_number}`,
																);
															if (roomDetailsElement.style.display === "none") {
																roomDetailsElement.style.display = "block";
															} else {
																roomDetailsElement.style.display = "none";
															}
														}}
													>
														+{reservation.roomId.length - 1} more
													</button>
													<div
														id={`room-details-${reservation.confirmation_number}`}
														style={{ display: "none" }}
													>
														{reservation.roomId.slice(1).map((room, index) => (
															<div key={index}>
																{room.room_number
																	? room.room_number
																	: "No Room"}
															</div>
														))}
													</div>
												</div>
											) : (
												<div>
													{reservation.roomId[0] &&
													reservation.roomId[0].room_number
														? reservation.roomId[0] &&
														  reservation.roomId[0].room_number
														: "No Room"}
												</div>
											)
										) : (
											"No Room"
										)}
									</td>
									<td className='number-cell'>{`${formatMoney(
										reservation.total_amount
									)} ${tableLabels.sar}`}</td>
									<td>
										<Button onClick={() => showDetailsModal(reservation)}>
											{chosenLanguage === "Arabic" ? "تفاصيل" : "Details"}
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</StyledTable>
				</TableWrapper>

				{/* Pagination Controls */}
				<PaginationWrapper>
					<Button
						onClick={() => handlePageChange(currentPage - 1)}
						disabled={currentPage <= 1}
					>
						Prev
					</Button>
					<span style={{ margin: "0 8px" }}>
						Page {currentPage} of {Math.ceil(totalRecords / recordsPerPage)}
					</span>
					<Button
						onClick={() => handlePageChange(currentPage + 1)}
						disabled={currentPage >= Math.ceil(totalRecords / recordsPerPage)}
					>
						Next
					</Button>
				</PaginationWrapper>

				{/* Modal */}
				<Modal
					key={modalKey} // Add the key here
					title={null}
					open={isModalVisible}
					onOk={handleOk}
					onCancel={handleCancel}
					width='min(94vw, calc(100vw - 220px))'
					centered
					zIndex={RESERVATION_DETAILS_MODAL_Z_INDEX}
					rootClassName='reservation-details-modal-root'
					className='reservation-details-modal'
					styles={{
						header: {
							display: "none",
						},
						content: {
							padding: "6px 10px 8px",
						},
						body: {
							maxHeight: "86vh",
							overflowY: "auto",
							padding: "0",
						},
					}}
				>
					{selectedReservation && (
						<ReservationDetail
							reservation={selectedReservation}
							setReservation={setSelectedReservation}
							hotelDetails={hotelDetails}
						/>
					)}
				</Modal>
			</PreReservationTableWrapper>
		</>
	);
};

export default PreReservationTable;

/* ------------------ STYLES ------------------ */

const ReservationDetailsModalGlobalStyle = createGlobalStyle`
	.reservation-details-modal-root .ant-modal-mask {
		background: rgba(15, 23, 42, 0.62) !important;
		backdrop-filter: blur(2px);
		z-index: ${RESERVATION_DETAILS_MODAL_Z_INDEX - 1} !important;
	}

	.reservation-details-modal-root .ant-modal-wrap,
	.reservation-details-modal-root .ant-modal {
		z-index: ${RESERVATION_DETAILS_MODAL_Z_INDEX} !important;
	}

	.reservation-details-modal {
		max-width: min(94vw, calc(100vw - 220px));
	}

	.reservation-details-modal .ant-modal-close {
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
		z-index: 5;
	}

	.reservation-details-modal .ant-modal-close:hover {
		background: #991b1b;
		border-color: #b91c1c;
	}

	.reservation-details-modal .ant-modal-close-x,
	.reservation-details-modal .ant-modal-close-icon {
		color: #fff;
		font-size: 14px;
		line-height: 1;
	}

	.reservation-details-modal .ant-modal-body {
		padding-top: 0 !important;
	}

	@media (max-width: 900px) {
		.reservation-details-modal {
			max-width: calc(100vw - 12px);
			width: calc(100vw - 12px) !important;
		}
	}
`;

const ReservationToolbar = styled.div`
	align-items: stretch;
	display: grid;
	gap: 12px;
	grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
	margin-bottom: 12px;
	min-width: 0;

	@media (max-width: 920px) {
		grid-template-columns: 1fr;
	}
`;

const SearchCard = styled.div`
	background: #e3f2fd;
	border: 1px solid #cfe5fb;
	border-radius: 8px;
	min-width: 0;
	padding: 12px;
`;

const SearchTitle = styled.div`
	color: #18212f;
	font-size: 15px;
	font-weight: 800;
	margin-bottom: 8px;
	text-align: start;
`;

const SearchForm = styled.form`
	display: grid;
	gap: 8px;
	grid-template-columns: minmax(0, 1fr) auto;
	min-width: 0;

	@media (max-width: 520px) {
		grid-template-columns: 1fr;
	}
`;

const SearchInput = styled.input`
	background: #fff;
	border: 1px solid #d0d5dd;
	border-radius: 8px;
	color: #101828;
	font-size: 14px;
	height: 38px;
	min-width: 0;
	outline: none;
	padding: 0 12px;
	width: 100%;

	&:focus {
		border-color: #1e88e5;
		box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.12);
	}

	@media (max-width: 520px) {
		font-size: 12px;
		height: 36px;
	}
`;

const SearchButton = styled.button`
	background: #1e88e5;
	border: 0;
	border-radius: 8px;
	color: #fff;
	cursor: pointer;
	font-weight: 800;
	height: 38px;
	padding: 0 18px;
	white-space: nowrap;

	&:hover {
		background: #0f6fc3;
	}

	@media (max-width: 520px) {
		height: 36px;
		width: 100%;
	}
`;

const ToolbarSide = styled.div`
	align-content: start;
	display: grid;
	gap: 10px;
	min-width: 0;

	@media (max-width: 920px) {
		grid-template-columns: minmax(0, 1fr);
	}
`;

const PaginationShell = styled.div`
	align-items: center;
	background: #fff;
	border: 1px solid rgba(16, 24, 40, 0.08);
	border-radius: 8px;
	display: flex;
	justify-content: center;
	min-height: 40px;
	min-width: 0;
	overflow-x: auto;
	padding: 6px;

	.ant-pagination {
		white-space: nowrap;
	}
`;

const TableControlBar = styled.div`
	align-items: center;
	background: #fff;
	border: 1px solid rgba(16, 24, 40, 0.08);
	border-radius: 8px;
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	justify-content: space-between;
	margin-bottom: 12px;
	min-width: 0;
	padding: 10px 12px;
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};

	@media (max-width: 640px) {
		align-items: stretch;
	}
`;

const ControlGroup = styled.div`
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	min-width: 0;

	@media (max-width: 640px) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		width: 100%;
	}
`;

const ControlLabel = styled.span`
	color: #344054;
	font-size: 13px;
	font-weight: 950;

	@media (max-width: 640px) {
		grid-column: 1 / -1;
	}
`;

const ControlButton = styled.button`
	background: ${(props) => (props.$active ? "#1677ff" : "#f8fafc")};
	border: 1px solid ${(props) => (props.$active ? "#1677ff" : "#d0d5dd")};
	border-radius: 2px;
	color: ${(props) => (props.$active ? "#fff" : "#1f2937")};
	font-size: 12.5px;
	font-weight: 950;
	min-height: 34px;
	padding: 0.35rem 0.8rem;
	white-space: nowrap;

	&:hover {
		border-color: #1677ff;
		color: ${(props) => (props.$active ? "#fff" : "#0b5cad")};
	}

	@media (max-width: 640px) {
		width: 100%;
	}
`;

const PreReservationTableWrapper = styled.div`
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	min-width: 0;
	padding: 0;

	td,
	tr,
	tbody {
		text-transform: capitalize !important;
		font-size: 12.5px;
	}

	td .ant-btn {
		border-color: #9ecdf8;
		border-radius: 999px;
		color: #1e88e5;
		font-weight: 800;
		height: 30px;
		padding: 0 12px;
	}

	thead th {
		position: sticky;
		top: 0;
		z-index: 10; /* Ensure the header is above other content when scrolling */
		background-color: #f8fafc; /* Match the header background color */
	}

	table {
		border-collapse: collapse; /* Ensure borders are well aligned */
	}

	th,
	td {
		padding: 8px 10px;
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
		white-space: nowrap;
		border: 1px solid #edf2f7;
		font-size: 12px;
		text-transform: capitalize;
		line-height: 1.3;
	}

	th {
		background: linear-gradient(180deg, #eef6ff 0%, #deebff 100%);
		position: sticky;
		top: 0;
		z-index: 1;
		color: #102033;
		font-size: 13.5px;
		font-weight: 950;
		border-bottom-color: #b9d5f4;
	}

	@media (max-width: 768px) {
		th,
		td {
			padding: 6px 8px;
			font-size: 11px;
		}
	}

	tr:hover td {
		background: #f7fbff; /* Add a hover effect if needed */
	}
`;

// Custom Table Wrapper enables both vertical and horizontal scrolling
const TableWrapper = styled.div`
	background: #fff;
	border: 1px solid rgba(16, 24, 40, 0.08);
	border-radius: 8px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
	max-height: 700px;
	margin-bottom: 16px;
	min-width: 0;
	overflow-x: auto;
	overflow-y: auto;
	width: 100%;

	@media (max-width: 768px) {
		max-height: 62vh;
	}
`;

// StyledTable with media queries to adjust cell sizes on smaller screens
const StyledTable = styled.table`
	border-collapse: collapse;
	table-layout: fixed;
	min-width: 0;
	width: 100%;

	th,
	td {
		padding: 8px 8px;
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
		white-space: nowrap;
		border: 1px solid #edf2f7;
		font-size: 12.5px;
		text-transform: capitalize;
		line-height: 1.3;
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.date-cell {
		white-space: normal;
		text-transform: none !important;
		line-height: 1.35;
	}

	.number-cell {
		direction: ltr;
		font-weight: 900;
		min-width: 82px;
		overflow: visible !important;
		text-align: center;
		text-overflow: clip !important;
		text-transform: none !important;
		white-space: nowrap;
	}

	th:nth-child(1),
	td:nth-child(1) {
		width: 2.7%;
	}

	th:nth-child(2),
	td:nth-child(2) {
		width: 10.5%;
	}

	th:nth-child(3),
	td:nth-child(3) {
		width: 8.2%;
	}

	th:nth-child(4),
	td:nth-child(4) {
		width: 7%;
	}

	th:nth-child(5),
	td:nth-child(5) {
		width: 8.5%;
	}

	th:nth-child(6),
	td:nth-child(6) {
		width: 7%;
	}

	th:nth-child(7),
	td:nth-child(7),
	th:nth-child(8),
	td:nth-child(8) {
		width: 6.5%;
	}

	th:nth-child(9),
	td:nth-child(9) {
		width: 4%;
	}

	th:nth-child(10),
	td:nth-child(10) {
		width: 7.2%;
	}

	th:nth-child(11),
	td:nth-child(11) {
		width: 7.2%;
	}

	th:nth-child(12),
	td:nth-child(12) {
		width: 7.3%;
	}

	th:nth-child(13),
	td:nth-child(13) {
		width: 6.8%;
	}

	th:nth-child(14),
	td:nth-child(14) {
		width: 5.6%;
	}

	th:nth-child(15),
	td:nth-child(15) {
		width: 7.3%;
	}

	th:nth-child(16),
	td:nth-child(16) {
		width: 3.8%;
	}

	th {
		background: linear-gradient(180deg, #eef6ff 0%, #deebff 100%);
		color: #102033;
		font-size: 13.5px;
		font-weight: 950;
		overflow: visible;
		position: sticky;
		text-overflow: clip;
		top: 0;
		white-space: nowrap;
		z-index: 1;
		border-bottom-color: #b9d5f4;
	}

	.sortable-heading {
		display: inline-flex;
		align-items: center;
		justify-content: center;
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
		color: #0b5cad;
	}

	.sort-arrow {
		color: #1677ff;
		font-size: 0.72rem;
		line-height: 1;
	}

	@media (max-width: 768px) {
		min-width: 980px;
		table-layout: auto;

		th,
		td {
			padding: 6px 8px;
			font-size: 11px;
		}
	}
`;

// Pagination wrapper styling remains mostly unchanged
const PaginationWrapper = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
	justify-content: center;
	margin-top: 16px;
	button {
		margin: 0;
	}

	@media (max-width: 520px) {
		font-size: 12px;
	}
`;

// Conditional styling for reservation status
const StatusSpan = styled.span`
	display: inline-block;
	padding: 5px 10px;
	border: 1px solid ${(props) => reservationStatusStyle(props.status).borderColor};
	border-radius: 2px;
	background-color: ${(props) => reservationStatusStyle(props.status).background};
	color: ${(props) => reservationStatusStyle(props.status).color};
	font-weight: 950;
	min-width: 78px;
	text-align: center;
`;

const RejectionReason = styled.div`
	margin-top: 4px;
	max-width: 220px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: #b42318;
	font-size: 11px;
	font-weight: 900;
	text-transform: none;
`;
