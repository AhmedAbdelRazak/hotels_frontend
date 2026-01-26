// PreReservationTable.js

import React, { useState, useMemo, useCallback } from "react";
import styled from "styled-components";
import moment from "moment";
import { Tooltip, Modal, Button, Pagination } from "antd"; // Ensure Pagination is correctly imported
import FilterComponent from "./FilterComponent";
import { getReservationSearchAllMatches } from "../apiAdmin";
import ReservationDetail from "./ReservationDetail";
import DownloadExcel from "./DownloadExcel";

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
		paymentMode === "credit/ debit" ||
		paymentMode === "credit/debit" ||
		breakdownCaptured;

	const isNotPaid = paymentMode === "not paid" && !isCaptured && !payOffline;

	if (isCaptured) return "Captured";
	if (payOffline) return "Paid Offline";
	if (isNotPaid) return "Not Paid";
	return "Not Captured";
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
	selectedDates,
	setSelectedDates,
	reservationObject,
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [modalKey, setModalKey] = useState(0);

	console.log(allPreReservations, "allPreReservations");

	const formatMoney = (value) => {
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) return "0";
		return parsed.toLocaleString();
	};

	// Define showDetailsModal before it's used and memoize it to prevent unnecessary re-renders
	const showDetailsModal = useCallback((reservation) => {
		setSelectedReservation(reservation);
		setIsModalVisible(true);
	}, []);

	const handleOk = () => {
		setSelectedReservation(null);
		setIsModalVisible(false);
		setModalKey((prevKey) => prevKey + 1); // Increment the key
	};

	const handleCancel = () => {
		setSelectedReservation(null);
		setIsModalVisible(false);
		setModalKey((prevKey) => prevKey + 1); // Increment the key
	};

	const searchSubmit = (e) => {
		e.preventDefault();
		if (!q) {
			setSearchClicked(!searchClicked);
			setQ("");
			return;
		}

		getReservationSearchAllMatches(q, hotelDetails._id)
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
				render: (booked_at) => new Date(booked_at).toDateString(),
			},
			{
				title: chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Check In",
				dataIndex: "checkin_date",
				key: "checkin_date",
				render: (checkin_date) => moment(checkin_date).format("YYYY-MM-DD"),
			},
			{
				title: chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Check Out",
				dataIndex: "checkout_date",
				key: "checkout_date",
				render: (checkout_date) => moment(checkout_date).format("YYYY-MM-DD"),
			},

			{
				title: chosenLanguage === "Arabic" ? "حالة الحجز" : "Status",
				dataIndex: "reservation_status",
				key: "reservation_status",
				render: (reservation_status) => {
					let style = {};
					switch (reservation_status.toLowerCase()) {
						case "cancelled_by_guest":
						case "cancelled by guest":
						case "canceled":
						case "cancelled":
							style = {
								background: "red",
								color: "white",
								padding: "4px",
								textAlign: "center",
							};
							break;
						case "inhouse":
							style = {
								background: "#FFFACD",
								color: "black",
								padding: "4px",
								textAlign: "center",
							}; // Light yellow background
							break;
						case "closed":
						case "checked_out":
						case "early_checked_out":
							style = {
								background: "#90EE90",
								color: "green",
								padding: "4px",
								textAlign: "center",
							}; // Light green background
							break;
						case "confirmed":
							style = {
								background: "",
								color: "black",
								padding: "4px",
								textAlign: "center",
							};
							break;
						default:
							style = { padding: "4px", textAlign: "center" };
					}
					return <div style={style}>{reservation_status}</div>;
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
			<PreReservationTableWrapper isArabic={chosenLanguage === "Arabic"}>
				{/* Search Form */}
				<div className='form-group mx-3 text-center'>
					<form className='form' onSubmit={searchSubmit}>
						<label
							className='mt-2 mx-3'
							style={{
								fontWeight: "bold",
								fontSize: "1.05rem",
								color: "black",
							}}
						>
							Search
						</label>
						<input
							className='p-2 my-2 search-input w-50 form-control mx-auto'
							type='text'
							value={q}
							onChange={(e) => setQ(e.target.value.toLowerCase())}
							placeholder={
								chosenLanguage === "Arabic"
									? "البحث حسب هاتف العميل، اسم العميل، البريد الإلكتروني، رقم التأكيد، حالة الدفع"
									: "Search By Client Phone, Client Name, Email, Confirmation #, Payment Status"
							}
							aria-label='Search'
						/>
						<button className='btn btn-success mx-2' type='submit'>
							Search
						</button>
					</form>
				</div>

				{/* Download Excel */}
				<DownloadExcel
					data={allPreReservations}
					columns={columns2}
					title={"Reservations Report"}
					currentPage={currentPage}
					recordsPerPage={recordsPerPage}
				/>

				{/* Pagination */}
				<div
					className='my-4'
					onClick={() => window.scrollTo({ top: 20, behavior: "smooth" })}
				>
					<Pagination
						current={currentPage}
						pageSize={recordsPerPage}
						total={totalRecords}
						onChange={handlePageChange}
					/>
				</div>

				{/* Filter Component */}
				<FilterComponent
					setSelectedFilter={setSelectedFilter}
					selectedFilter={selectedFilter}
					chosenLanguage={chosenLanguage}
					selectedDates={selectedDates}
					setSelectedDates={setSelectedDates}
					reservationObject={reservationObject}
				/>

				{/* Custom HTML Table */}
				<TableWrapper>
					<StyledTable isArabic={chosenLanguage === "Arabic"}>
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
								<th>{chosenLanguage === "Arabic" ? "مصدر الحجز" : "Source"}</th>
								<th>
									{chosenLanguage === "Arabic" ? "تاريخ الحجز" : "Booked On"}
								</th>
								<th>
									{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Check In"}
								</th>
								<th>
									{chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Check Out"}
								</th>
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
								<th>{chosenLanguage === "Arabic" ? "تفاصيل" : "DETAILS..."}</th>
							</tr>
						</thead>
						<tbody>
							{tableData.map((reservation) => (
								<tr key={reservation.key}>
									<td>{reservation.index}</td>
									<td>
										<Tooltip title={reservation.customer_details.name}>
											<span>{reservation.customer_details.name}</span>
										</Tooltip>
									</td>
									<td>
										<Tooltip title={reservation.customer_details.phone}>
											<span>{reservation.customer_details.phone}</span>
										</Tooltip>
									</td>
									<td>
										<Tooltip title={reservation.confirmation_number}>
											<span>{reservation.confirmation_number}</span>
										</Tooltip>
									</td>
									<td>
										<Tooltip title={reservation.booking_source}>
											<span>{reservation.booking_source}</span>
										</Tooltip>
									</td>
									<td>{new Date(reservation.booked_at).toDateString()}</td>
									<td>
										{moment(reservation.checkin_date).format("YYYY-MM-DD")}
									</td>
									<td>
										{moment(reservation.checkout_date).format("YYYY-MM-DD")}
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
									</td>
									<td>
										{/* Room Types */}
										{reservation.pickedRoomsType.map((room, index) => (
											<div key={index}>{room.room_type}</div>
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
									<td>{`${formatMoney(reservation.total_amount)} SAR`}</td>
									<td>
										<Button onClick={() => showDetailsModal(reservation)}>
											{chosenLanguage === "Arabic"
												? "التفاصيل..."
												: "Details..."}
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
					title={
						chosenLanguage === "Arabic" ? "تفاصيل الحجز" : "Reservation Details"
					}
					open={isModalVisible}
					onOk={handleOk}
					onCancel={handleCancel}
					width='84.5%' // Set the width to 84.5%
					style={{
						// If Arabic, align to the left, else align to the right
						position: "absolute",
						left: chosenLanguage === "Arabic" ? "1%" : "auto",
						right: chosenLanguage === "Arabic" ? "auto" : "5%",
						top: "1%",
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

const PreReservationTableWrapper = styled.div`
	text-align: ${(props) => (props.isArabic ? "right" : "left")};
	padding: 20px;

	td,
	tr,
	tbody {
		text-transform: capitalize !important;
		font-size: 12px;
	}

	thead th {
		position: sticky;
		top: 0;
		z-index: 10; /* Ensure the header is above other content when scrolling */
		background-color: white; /* Match the header background color */
	}

	table {
		border-collapse: collapse; /* Ensure borders are well aligned */
	}

	th,
	td {
		padding: 4px 8px;
		text-align: ${(props) => (props.isArabic ? "right" : "left")};
		white-space: nowrap;
		border: 1px solid #f0f0f0;
		font-size: 12px;
		text-transform: capitalize;
		line-height: 1.2;
	}

	th {
		background-color: #fafafa;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	@media (max-width: 768px) {
		th,
		td {
			padding: 2px 4px;
			font-size: 10px;
		}
	}

	tr:hover td {
		background: #f5f5f5; /* Add a hover effect if needed */
	}
`;

// Custom Table Wrapper enables both vertical and horizontal scrolling
const TableWrapper = styled.div`
	max-height: 700px;
	overflow-y: auto;
	overflow-x: auto;
	margin-bottom: 16px;
`;

// StyledTable with media queries to adjust cell sizes on smaller screens
const StyledTable = styled.table`
	width: 100%;
	border-collapse: collapse;

	th,
	td {
		padding: 4px 8px;
		text-align: ${(props) => (props.isArabic ? "right" : "left")};
		white-space: nowrap;
		border: 1px solid #f0f0f0;
		font-size: 12px;
		text-transform: capitalize;
		line-height: 1.2;
	}

	th {
		background-color: #fafafa;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	@media (max-width: 768px) {
		th,
		td {
			padding: 2px 4px;
			font-size: 10px;
		}
	}
`;

// Pagination wrapper styling remains mostly unchanged
const PaginationWrapper = styled.div`
	display: flex;
	align-items: center;
	margin-top: 16px;
	button {
		margin-right: 8px;
	}
`;

// Conditional styling for reservation status
const StatusSpan = styled.span`
	display: inline-block;
	padding: 5px 10px;
	border-radius: 5px;
	background-color: ${(props) =>
		props.status?.toLowerCase() === "cancelled"
			? "darkred"
			: props.status?.toLowerCase() === "not paid"
			  ? "#222"
			  : "transparent"};
	color: ${(props) =>
		props.status?.toLowerCase() === "cancelled" ||
		props.status?.toLowerCase() === "not paid"
			? "#fff"
			: "inherit"};
`;
