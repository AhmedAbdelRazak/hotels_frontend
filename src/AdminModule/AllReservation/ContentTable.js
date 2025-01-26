import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { Tooltip, Modal, Button } from "antd";
import ScoreCards from "./ScoreCards";
import MoreDetails from "./MoreDetails";
import ReservationDetail from "../../HotelModule/ReservationsFolder/ReservationDetail";

const EnhancedContentTable = ({
	allReservationsForAdmin,
	currentPage,
	setCurrentPage,
	pageSize,
	setPageSize,
}) => {
	/* ------------------ Data & Memoization ------------------ */
	const reservations = useMemo(
		() => allReservationsForAdmin?.data || [],
		[allReservationsForAdmin]
	);

	// If capturedConfirmationNumbers is truly constant, memoize it
	const capturedConfirmationNumbers = useMemo(() => ["2944008828"], []);

	// totalDocuments from API (not used in filtered view, but you may use it as needed)
	// eslint-disable-next-line
	const totalDocuments = allReservationsForAdmin?.totalDocuments || 0;

	/* ------------------ State ------------------ */
	const [filterType, setFilterType] = useState("");
	const [searchTexts, setSearchTexts] = useState({
		confirmation_number: "",
		customer_name: "",
		customer_phone: "",
		hotel_name: "",
	});
	const [sortConfig, setSortConfig] = useState({
		sortField: null,
		direction: null,
	});

	// Modal state
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);

	/* ------------------ Format & Preprocess ------------------ */
	const formattedReservations = useMemo(() => {
		return reservations.map((reservation) => {
			const {
				customer_details = {},
				hotelId = {},
				payment_details = {},
			} = reservation;
			const isCaptured =
				payment_details.captured ||
				capturedConfirmationNumbers.includes(reservation.confirmation_number);

			return {
				...reservation,
				customer_name: customer_details.name || "N/A",
				customer_phone: customer_details.phone || "N/A",
				hotel_name: hotelId.hotelName || "Unknown Hotel",
				createdAt: reservation.createdAt || null,
				payment_status:
					reservation.payment === "not paid"
						? "Not Paid"
						: isCaptured
						  ? "Captured"
						  : "Not Captured",
				isCheckinToday:
					new Date(reservation.checkin_date).toDateString() ===
					new Date().toDateString(),
				isCheckoutToday:
					new Date(reservation.checkout_date).toDateString() ===
					new Date().toDateString(),
				isPaymentTriggered: !!payment_details.capturing || isCaptured,
			};
		});
	}, [reservations, capturedConfirmationNumbers]);

	/* ------------------ Filtering Logic ------------------ */
	const filteredByType = useMemo(() => {
		return formattedReservations.filter((r) => {
			// If the filter type is one of these three, exclude cancelled rows.
			if (["checkinToday", "checkoutToday", "notPaid"].includes(filterType)) {
				if (r.reservation_status?.toLowerCase() === "cancelled") {
					return false;
				}
			}

			// Then apply the filter based on filterType.
			switch (filterType) {
				case "checkinToday":
					return r.isCheckinToday;
				case "checkoutToday":
					return r.isCheckoutToday;
				case "paymentTriggered":
					return r.isPaymentTriggered;
				case "paymentNotTriggered":
					return !r.isPaymentTriggered;
				case "notPaid":
					return r.payment_status.toLowerCase() === "not paid";
				case "notCaptured":
					return r.payment_status.toLowerCase() === "not captured";
				case "captured":
					return r.payment_status.toLowerCase() === "captured";
				case "cancelled":
					return (
						r.reservation_status &&
						r.reservation_status.toLowerCase() === "cancelled"
					);
				case "notCancelled":
					return (
						r.reservation_status &&
						r.reservation_status.toLowerCase() !== "cancelled"
					);
				default:
					return true;
			}
		});
	}, [formattedReservations, filterType]);

	/* ------------------ Column-based Searching ------------------ */
	const filteredBySearch = useMemo(() => {
		return filteredByType.filter((r) => {
			const matchConfirmation = r.confirmation_number
				?.toLowerCase()
				.includes(searchTexts.confirmation_number.toLowerCase());
			const matchName = r.customer_name
				?.toLowerCase()
				.includes(searchTexts.customer_name.toLowerCase());
			const matchPhone = r.customer_phone
				?.toLowerCase()
				.includes(searchTexts.customer_phone.toLowerCase());
			const matchHotel = r.hotel_name
				?.toLowerCase()
				.includes(searchTexts.hotel_name.toLowerCase());

			return (
				(!searchTexts.confirmation_number || matchConfirmation) &&
				(!searchTexts.customer_name || matchName) &&
				(!searchTexts.customer_phone || matchPhone) &&
				(!searchTexts.hotel_name || matchHotel)
			);
		});
	}, [filteredByType, searchTexts]);

	/* ------------------ Sorting ------------------ */
	const sortedData = useMemo(() => {
		if (!sortConfig.sortField || !sortConfig.direction) {
			return filteredBySearch;
		}
		const { sortField, direction } = sortConfig;
		const sorted = [...filteredBySearch].sort((a, b) => {
			let valA = a[sortField];
			let valB = b[sortField];

			// Handle date or numeric fields
			if (sortField === "checkin_date" || sortField === "checkout_date") {
				valA = new Date(valA).getTime();
				valB = new Date(valB).getTime();
			} else if (sortField === "total_amount") {
				valA = Number(valA) || 0;
				valB = Number(valB) || 0;
			} else if (sortField === "confirmation_number") {
				return direction === "asc"
					? valA.localeCompare(valB)
					: valB.localeCompare(valA);
			} else if (sortField === "createdAt") {
				valA = new Date(valA).getTime();
				valB = new Date(valB).getTime();
			}
			return direction === "asc" ? valA - valB : valB - valA;
		});
		return sorted;
	}, [filteredBySearch, sortConfig]);

	/* ------------------ Pagination ------------------ */
	const paginatedData = useMemo(() => {
		const startIndex = (currentPage - 1) * pageSize;
		return sortedData.slice(startIndex, startIndex + pageSize);
	}, [sortedData, currentPage, pageSize]);

	/* ------------------ Handlers ------------------ */
	const handleFilterClick = (type) => {
		setFilterType((prevType) => (prevType === type ? "" : type));
	};

	const handleSearchChange = (colKey, value) => {
		setSearchTexts((prev) => ({ ...prev, [colKey]: value }));
	};

	// Sorting on header click
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

	// Pagination
	const totalFiltered = sortedData.length;
	const totalPages = Math.ceil(totalFiltered / pageSize);
	const handlePageChange = (newPage) => {
		if (newPage < 1 || newPage > totalPages) return;
		setCurrentPage(newPage);
	};
	const handlePageSizeChange = (e) => {
		setPageSize(Number(e.target.value));
		setCurrentPage(1);
	};

	// Hotel click handler (exact logic from Component B)
	const handleHotelClick = (record) => {
		const hotelDetailsFinal = {
			...record.hotelId,
			belongsTo: record.belongsTo,
		};
		localStorage.setItem("selectedHotel", JSON.stringify(hotelDetailsFinal));
		window.location.href = `/hotel-management/new-reservation/${record.belongsTo._id}/${record.hotelId._id}?list`;
	};

	// Modal handlers
	const showDetailsModal = (reservation) => {
		setSelectedReservation(reservation);
		setIsModalVisible(true);
	};
	const handleModalClose = () => {
		setSelectedReservation(null);
		setIsModalVisible(false);
	};

	// Clear All filters & search
	const handleClearAllFilters = () => {
		setFilterType("");
		setSearchTexts({
			confirmation_number: "",
			customer_name: "",
			customer_phone: "",
			hotel_name: "",
		});
		setSortConfig({ sortField: null, direction: null });
	};

	return (
		<ContentTableWrapper>
			{/* ScoreCards receives filtered data */}
			<ScoreCards
				reservations={filteredBySearch}
				totalReservations={filteredBySearch.length}
			/>

			{/* Filter Buttons */}
			<FilterButtonContainer>
				<FilterButton
					onClick={() => handleFilterClick("checkinToday")}
					isActive={filterType === "checkinToday"}
				>
					Check-in Today
				</FilterButton>
				<FilterButton
					onClick={() => handleFilterClick("checkoutToday")}
					isActive={filterType === "checkoutToday"}
				>
					Check-out Today
				</FilterButton>
				<FilterButton
					onClick={() => handleFilterClick("notPaid")}
					isActive={filterType === "notPaid"}
				>
					Not Paid
				</FilterButton>
				<FilterButton
					onClick={() => handleFilterClick("notCaptured")}
					isActive={filterType === "notCaptured"}
				>
					Not Captured
				</FilterButton>
				<FilterButton
					onClick={() => handleFilterClick("captured")}
					isActive={filterType === "captured"}
				>
					Captured
				</FilterButton>
				<FilterButton
					onClick={() => handleFilterClick("cancelled")}
					isActive={filterType === "cancelled"}
				>
					Cancelled
				</FilterButton>
				<FilterButton
					onClick={() => handleFilterClick("notCancelled")}
					isActive={filterType === "notCancelled"}
				>
					Un-Cancelled
				</FilterButton>
				<FilterButton onClick={handleClearAllFilters}>Clear All</FilterButton>
			</FilterButtonContainer>

			{/* Page Size Select */}
			<div style={{ marginBottom: 8 }}>
				<label htmlFor='pageSizeSelect'>Page Size: </label>
				<select
					id='pageSizeSelect'
					value={pageSize}
					onChange={handlePageSizeChange}
				>
					<option value={5}>5</option>
					<option value={10}>10</option>
					<option value={20}>20</option>
					<option value={50}>50</option>
				</select>
			</div>

			{/* Table with responsive wrapper */}
			<TableWrapper>
				<StyledTable>
					<thead>
						<tr>
							<th>
								<HeaderLabel onClick={() => handleSortLabelClick("index")}>
									#
									{sortConfig.sortField === "index"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
							</th>
							<th>
								<HeaderLabel
									onClick={() => handleSortLabelClick("confirmation_number")}
								>
									Confirmation Number
									{sortConfig.sortField === "confirmation_number"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
								<div>
									<input
										type='text'
										placeholder='Search...'
										value={searchTexts.confirmation_number}
										onChange={(e) =>
											handleSearchChange("confirmation_number", e.target.value)
										}
										style={{ width: "100%" }}
									/>
								</div>
							</th>
							<th>
								<HeaderLabel
									onClick={() => handleSortLabelClick("customer_name")}
								>
									Customer Name
									{sortConfig.sortField === "customer_name"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
								<div>
									<input
										type='text'
										placeholder='Search...'
										value={searchTexts.customer_name}
										onChange={(e) =>
											handleSearchChange("customer_name", e.target.value)
										}
										style={{ width: "100%" }}
									/>
								</div>
							</th>
							<th>
								<HeaderLabel
									onClick={() => handleSortLabelClick("customer_phone")}
								>
									Phone
									{sortConfig.sortField === "customer_phone"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
								<div>
									<input
										type='text'
										placeholder='Search...'
										value={searchTexts.customer_phone}
										onChange={(e) =>
											handleSearchChange("customer_phone", e.target.value)
										}
										style={{ width: "100%" }}
									/>
								</div>
							</th>
							<th>
								<HeaderLabel onClick={() => handleSortLabelClick("hotel_name")}>
									Hotel Name
									{sortConfig.sortField === "hotel_name"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
								<div>
									<input
										type='text'
										placeholder='Search...'
										value={searchTexts.hotel_name}
										onChange={(e) =>
											handleSearchChange("hotel_name", e.target.value)
										}
										style={{ width: "100%" }}
									/>
								</div>
							</th>
							<th>
								<HeaderLabel
									onClick={() => handleSortLabelClick("reservation_status")}
								>
									Reservation Status
									{sortConfig.sortField === "reservation_status"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
							</th>
							<th>
								<HeaderLabel
									onClick={() => handleSortLabelClick("checkin_date")}
								>
									Check-in Date
									{sortConfig.sortField === "checkin_date"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
							</th>
							<th>
								<HeaderLabel
									onClick={() => handleSortLabelClick("checkout_date")}
								>
									Check-out Date
									{sortConfig.sortField === "checkout_date"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
							</th>
							<th>
								<HeaderLabel
									onClick={() => handleSortLabelClick("payment_status")}
								>
									Payment Status
									{sortConfig.sortField === "payment_status"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
							</th>
							<th>
								<HeaderLabel
									onClick={() => handleSortLabelClick("total_amount")}
								>
									Total Amount
									{sortConfig.sortField === "total_amount"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
							</th>
							<th>
								<HeaderLabel onClick={() => handleSortLabelClick("createdAt")}>
									Created At
									{sortConfig.sortField === "createdAt"
										? sortConfig.direction === "asc"
											? " ▲"
											: " ▼"
										: ""}
								</HeaderLabel>
							</th>
							<th>Details</th>
						</tr>
					</thead>
					<tbody>
						{paginatedData.map((reservation, i) => (
							<tr key={reservation._id}>
								{/* Use map index (i) so that the first row of the current view is always "1" */}
								<td>{i + 1}</td>
								<td>
									<Tooltip title={reservation.confirmation_number}>
										<span>{reservation.confirmation_number}</span>
									</Tooltip>
								</td>
								<td>
									<Tooltip title={reservation.customer_name}>
										<span>{reservation.customer_name}</span>
									</Tooltip>
								</td>
								<td>
									<Tooltip title={reservation.customer_phone}>
										<span>{reservation.customer_phone}</span>
									</Tooltip>
								</td>
								<td>
									<Tooltip title={reservation.hotel_name}>
										<span
											style={{
												color: "blue",
												textDecoration: "underline",
												cursor: "pointer",
											}}
											onClick={() => handleHotelClick(reservation)}
										>
											{reservation.hotel_name}
										</span>
									</Tooltip>
								</td>
								<td>
									<StatusSpan status={reservation.reservation_status}>
										{reservation.reservation_status}
									</StatusSpan>
								</td>
								<td>
									{new Date(reservation.checkin_date).toLocaleDateString()}
								</td>
								<td>
									{new Date(reservation.checkout_date).toLocaleDateString()}
								</td>
								<td>
									<PaymentSpan payment={reservation.payment_status}>
										{reservation.payment_status}
									</PaymentSpan>
								</td>
								<td>
									{Number(reservation.total_amount || 0).toFixed(2)}{" "}
									{reservation.state === "expedia" ? "USD" : "SAR"}
								</td>
								<td>
									{reservation.createdAt
										? new Date(reservation.createdAt).toLocaleDateString()
										: "N/A"}
								</td>
								<td>
									<Button onClick={() => showDetailsModal(reservation)}>
										View Details
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
					Page {currentPage} of {totalPages}
				</span>
				<Button
					onClick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage >= totalPages}
				>
					Next
				</Button>
			</PaginationWrapper>

			{/* Modal */}
			<Modal
				open={isModalVisible}
				onCancel={handleModalClose}
				className='float-right'
				width='84%'
				style={{
					position: "absolute",
					left: "15.4%",
					top: "1%",
				}}
				footer={[
					<Button key='close' onClick={handleModalClose}>
						Close
					</Button>,
				]}
			>
				{selectedReservation && selectedReservation.hotelId ? (
					selectedReservation.hotelId.hotelName ? (
						<MoreDetails
							selectedReservation={selectedReservation}
							hotelDetails={selectedReservation.hotelId}
							reservation={selectedReservation}
							setReservation={setSelectedReservation}
						/>
					) : (
						<ReservationDetail
							reservation={selectedReservation}
							hotelDetails={selectedReservation.hotelId}
						/>
					)
				) : null}
			</Modal>
		</ContentTableWrapper>
	);
};

export default EnhancedContentTable;

/* ------------------ STYLES ------------------ */

const ContentTableWrapper = styled.div`
	padding: 20px;
`;

// Filter Button with active styling
const FilterButton = styled(Button)`
	font-size: 12px;
	background-color: ${(props) => (props.isActive ? "#d4edda" : "initial")};
	color: ${(props) => (props.isActive ? "#155724" : "initial")};
	border-color: ${(props) => (props.isActive ? "#c3e6cb" : "initial")};
`;

// Container for filter buttons, using flex-wrap
const FilterButtonContainer = styled.div`
	margin: 16px 0;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
`;

// Table wrapper enables both vertical and horizontal scrolling
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
		text-align: left;
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

// HeaderLabel adjusted for responsiveness
const HeaderLabel = styled.div`
	cursor: pointer;
	font-weight: 600;
	user-select: none;
	display: inline-block;
	margin-bottom: 4px;

	@media (max-width: 768px) {
		font-size: 11px;
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

// Conditional styling for payment status
const PaymentSpan = styled.span`
	display: inline-block;
	padding: 5px 10px;
	border-radius: 5px;
	background-color: ${(props) =>
		props.payment === "Captured" ? "#d4edda" : "transparent"};
	color: ${(props) => (props.payment === "Captured" ? "#155724" : "inherit")};
`;
