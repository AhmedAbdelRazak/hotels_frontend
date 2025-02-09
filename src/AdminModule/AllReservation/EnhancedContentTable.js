import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { Tooltip, Modal, Button, Input } from "antd";
import ScoreCards from "./ScoreCards";
import MoreDetails from "./MoreDetails";
import ReservationDetail from "../../HotelModule/ReservationsFolder/ReservationDetail";
import ExportToExcelButton from "./ExportToExcelButton";

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
	// NEW: We receive filterType + setFilterType from the parent
	filterType,
	setFilterType,
	// We can also pass a new parent's handleFilter if we prefer
	handleFilterClickFromParent,
	allHotelDetailsAdmin,
}) => {
	// ------------------ Search Box local state ------------------
	const [searchBoxValue, setSearchBoxValue] = useState(searchTerm || "");

	// ------------------ Payment isCaptured flags, for display only ------------------
	const capturedConfirmationNumbers = useMemo(() => ["2944008828"], []);
	const formattedReservations = useMemo(() => {
		return data.map((reservation) => {
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
			};
		});
	}, [data, capturedConfirmationNumbers]);

	// ------------------ Sorting logic (unchanged) ------------------
	const [sortConfig, setSortConfig] = useState({
		sortField: null,
		direction: null,
	});

	const sortedData = useMemo(() => {
		if (!sortConfig.sortField || !sortConfig.direction) {
			return formattedReservations;
		}
		const { sortField, direction } = sortConfig;
		const sorted = [...formattedReservations].sort((a, b) => {
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
	}, [formattedReservations, sortConfig]);

	// ------------------ Modal for "View Details" ------------------
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);

	const showDetailsModal = (reservation) => {
		setSelectedReservation(reservation);
		setIsModalVisible(true);
	};
	const handleModalClose = () => {
		setSelectedReservation(null);
		setIsModalVisible(false);
	};

	// ------------------ Filter Button Handlers (Now calls parent's function) ------------------
	const onFilterClick = (type) => {
		// If we click the same filter again, we might want to clear it:
		const newFilter = filterType === type ? "" : type;
		setFilterType(newFilter);

		// This calls the parent's function to fetch from backend with ?filterType=newFilter
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
	};

	const handleHotelClick = (record) => {
		const hotelDetailsFinal = {
			...record.hotelId,
			belongsTo: record.belongsTo,
		};
		localStorage.setItem("selectedHotel", JSON.stringify(hotelDetailsFinal));
		window.location.href = `/hotel-management/new-reservation/${record.belongsTo._id}/${record.hotelId._id}?list`;
	};

	// ------------------ Server Pagination Controls ------------------
	const totalPages = Math.ceil(totalDocuments / pageSize);

	const handlePrevPage = () => {
		if (currentPage > 1) {
			setCurrentPage(currentPage - 1);
		}
	};

	const handleNextPage = () => {
		if (currentPage < totalPages) {
			setCurrentPage(currentPage + 1);
		}
	};

	// ------------------ Search Box Submit ------------------
	const onSearchSubmit = () => {
		setSearchTerm(searchBoxValue);
		handleSearch();
	};
	const onSearchKeyPress = (e) => {
		if (e.key === "Enter") {
			onSearchSubmit();
		}
	};

	// ------------------ Render ------------------
	return (
		<ContentTableWrapper>
			{/* ScoreCards (from backend) */}
			<ScoreCards
				scorecardsObject={scorecardsObject}
				totalReservations={sortedData.length}
				fromPage={fromPage}
			/>

			{fromPage === "reports" ? null : (
				<FilterButtonContainer>
					<FilterButton
						onClick={() => onFilterClick("checkinToday")}
						isActive={filterType === "checkinToday"}
					>
						Check-in Today
					</FilterButton>
					<FilterButton
						onClick={() => onFilterClick("checkoutToday")}
						isActive={filterType === "checkoutToday"}
					>
						Check-out Today
					</FilterButton>
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
						onKeyDown={onSearchKeyPress} // Press Enter to trigger search
					/>
					<Button type='primary' onClick={onSearchSubmit}>
						Search
					</Button>
				</div>
			)}

			{/* Table */}
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
						{sortedData.map((reservation, i) => (
							<tr key={reservation._id}>
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
								<td>{reservation.reservation_status}</td>
								<td>
									{new Date(reservation.checkin_date).toLocaleDateString(
										"en-US"
									)}
								</td>
								<td>
									{new Date(reservation.checkout_date).toLocaleDateString(
										"en-US"
									)}
								</td>
								<td>{reservation.payment_status}</td>
								<td>{Number(reservation.total_amount || 0).toFixed(2)} SAR</td>
								<td>
									{reservation.createdAt
										? new Date(reservation.createdAt).toLocaleDateString(
												"en-US"
										  )
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

			{/* Server Pagination Controls */}
			<PaginationWrapper>
				<Button onClick={handlePrevPage} disabled={currentPage <= 1}>
					Prev
				</Button>
				<span style={{ margin: "0 8px" }}>
					Page {currentPage} of {totalPages}
				</span>
				<Button onClick={handleNextPage} disabled={currentPage >= totalPages}>
					Next
				</Button>
			</PaginationWrapper>

			{/* Details Modal */}
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

const FilterButtonContainer = styled.div`
	margin: 16px 0;
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

const TableWrapper = styled.div`
	max-height: 700px;
	overflow-y: auto;
	overflow-x: auto;
	margin-bottom: 16px;
`;

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

const PaginationWrapper = styled.div`
	display: flex;
	align-items: center;
	margin-top: 16px;
	button {
		margin-right: 8px;
	}
`;
