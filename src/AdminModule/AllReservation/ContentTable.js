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

	// Modal
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);

	/* ------------------ Format & Preprocess ------------------ */
	const formattedReservations = useMemo(() => {
		return reservations.map((reservation, index) => {
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
				index: index + 1 + (currentPage - 1) * pageSize,
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
	}, [reservations, capturedConfirmationNumbers, currentPage, pageSize]);

	/* ------------------ Filtering Logic ------------------ */
	const filteredByType = useMemo(() => {
		return formattedReservations.filter((r) => {
			switch (filterType) {
				// Existing filters
				case "checkinToday":
					return r.isCheckinToday;
				case "checkoutToday":
					return r.isCheckoutToday;
				case "paymentTriggered":
					return r.isPaymentTriggered;
				case "paymentNotTriggered":
					return !r.isPaymentTriggered;
				// New filters
				case "notPaid":
					return r.payment_status.toLowerCase() === "not paid";
				case "notCaptured":
					return r.payment_status.toLowerCase() === "not captured";
				case "captured":
					return r.payment_status.toLowerCase() === "captured";
				default:
					return true; // no filter
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

			const passesConfirmation =
				!searchTexts.confirmation_number || matchConfirmation;
			const passesName = !searchTexts.customer_name || matchName;
			const passesPhone = !searchTexts.customer_phone || matchPhone;
			const passesHotel = !searchTexts.hotel_name || matchHotel;

			return passesConfirmation && passesName && passesPhone && passesHotel;
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
			} else if (sortField === "index" || sortField === "total_amount") {
				valA = Number(valA) || 0;
				valB = Number(valB) || 0;
			} else if (sortField === "confirmation_number") {
				// Compare strings
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
		const endIndex = startIndex + pageSize;
		return sortedData.slice(startIndex, endIndex);
	}, [sortedData, currentPage, pageSize]);

	/* ------------------ Handlers ------------------ */
	const handleFilterClick = (type) => {
		setFilterType((prevType) => (prevType === type ? "" : type));
	};

	const handleSearchChange = (colKey, value) => {
		setSearchTexts((prev) => ({ ...prev, [colKey]: value }));
	};

	// Sorting only on label click
	const handleSortLabelClick = (colKey) => {
		setSortConfig((prev) => {
			if (prev.sortField === colKey) {
				// Cycle asc -> desc -> none
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

	// Hotel click (exact logic from Component B)
	const handleHotelClick = (record) => {
		// Exactly as in B
		const hotelDetailsFinal = {
			...record.hotelId,
			belongsTo: record.belongsTo,
		};
		localStorage.setItem("selectedHotel", JSON.stringify(hotelDetailsFinal));
		window.location.href = `/hotel-management/new-reservation/${record.belongsTo._id}/${record.hotelId._id}?list`;
	};

	// Modal
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
			{/* Score Cards */}
			<ScoreCards
				reservations={reservations}
				totalReservations={totalDocuments}
			/>

			{/* Filter Buttons (Including new ones and "Clear All") */}
			<div
				style={{ margin: "16px 0", display: "flex", flexWrap: "wrap", gap: 8 }}
			>
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

				{/* New Payment Filters */}
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

				{/* Clear All */}
				<FilterButton onClick={handleClearAllFilters}>Clear All</FilterButton>
			</div>

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

			{/* Manual Table */}
			<TableWrapper>
				<StyledTable>
					<thead>
						<tr>
							{/* Index */}
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

							{/* Confirmation Number */}
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

							{/* Customer Name */}
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

							{/* Phone */}
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

							{/* Hotel Name */}
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

							{/* Reservation Status */}
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

							{/* Check-in Date */}
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

							{/* Check-out Date */}
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

							{/* Payment Status */}
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

							{/* Total Amount */}
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

							{/* createdAt */}
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

							{/* Details */}
							<th>Details</th>
						</tr>
					</thead>

					<tbody>
						{paginatedData.map((reservation) => (
							<tr key={reservation._id}>
								{/* Index */}
								<td>{reservation.index}</td>

								{/* Confirmation Number */}
								<td>
									<Tooltip title={reservation.confirmation_number}>
										<span>{reservation.confirmation_number}</span>
									</Tooltip>
								</td>

								{/* Customer Name */}
								<td>
									<Tooltip title={reservation.customer_name}>
										<span>{reservation.customer_name}</span>
									</Tooltip>
								</td>

								{/* Phone */}
								<td>
									<Tooltip title={reservation.customer_phone}>
										<span>{reservation.customer_phone}</span>
									</Tooltip>
								</td>

								{/* Hotel Name with onClick from B */}
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

								{/* Reservation Status (conditional background) */}
								<td>
									<StatusSpan status={reservation.reservation_status}>
										{reservation.reservation_status}
									</StatusSpan>
								</td>

								{/* Check-in Date */}
								<td>
									{new Date(reservation.checkin_date).toLocaleDateString()}
								</td>

								{/* Check-out Date */}
								<td>
									{new Date(reservation.checkout_date).toLocaleDateString()}
								</td>

								{/* Payment Status (conditional background) */}
								<td>
									<PaymentSpan payment={reservation.payment_status}>
										{reservation.payment_status}
									</PaymentSpan>
								</td>

								{/* Total Amount */}
								<td>{Number(reservation.total_amount || 0).toFixed(2)} SAR</td>

								{/* createdAt */}
								<td>
									{reservation.createdAt
										? new Date(reservation.createdAt).toLocaleDateString()
										: "N/A"}
								</td>

								{/* Details Button */}
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

const TableWrapper = styled.div`
	max-height: 700px;
	overflow-y: auto;
	margin-bottom: 16px;
`;

const StyledTable = styled.table`
	width: 100%;
	border-collapse: collapse;
	th,
	td {
		padding: 4px 8px; /* narrower row height */
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
`;

const HeaderLabel = styled.div`
	cursor: pointer;
	font-weight: 600;
	user-select: none;
	display: inline-block;
	margin-bottom: 4px;
`;

const PaginationWrapper = styled.div`
	display: flex;
	align-items: center;
	margin-top: 16px;
	button {
		margin-right: 8px;
	}
`;

/* Conditional styling for reservation status (like in B) */
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

/* Conditional styling for payment status (like in B) */
const PaymentSpan = styled.span`
	display: inline-block;
	padding: 5px 10px;
	border-radius: 5px;
	background-color: ${(props) =>
		props.payment === "Captured" ? "#d4edda" : "transparent"};
	color: ${(props) => (props.payment === "Captured" ? "#155724" : "inherit")};
`;
