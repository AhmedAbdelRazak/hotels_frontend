import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { Tooltip, Modal, Button, Input } from "antd";
import MoreDetails from "./MoreDetails";
// import ExportToExcelButton from "./ExportToExcelButton";

const hasPaidBreakdownCapture = (breakdown) => {
	if (!breakdown || typeof breakdown !== "object") return false;
	return Object.keys(breakdown).some((key) => {
		if (key === "payment_comments") return false;
		const value = Number(breakdown[key]);
		return Number.isFinite(value) && value > 0;
	});
};

const EnhancedContentTable = ({
	data,
	totalDocuments,
	currentPage,
	pageSize,
	setCurrentPage,
	searchTerm,
	setSearchTerm,
	handleSearch,
	fromPage,
	chosenLanguage,
}) => {
	// ------------------ Search Box local state ------------------
	const [searchBoxValue, setSearchBoxValue] = useState(searchTerm || "");
	const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
	const parsedTotalDocuments = Number(totalDocuments);
	const safeTotalDocuments = Number.isFinite(parsedTotalDocuments)
		? parsedTotalDocuments
		: safeData.length;

	// ------------------ Payment isCaptured flags, for display only ------------------
	// (Currently we artificially label #2944008828 as captured as well)
	const capturedConfirmationNumbers = useMemo(() => ["2944008828"], []);

	const formattedReservations = useMemo(() => {
		return safeData.map((reservation) => {
			const {
				customer_details = {},
				hotelId = {},
				payment_details = {},
			} = reservation;

			const breakdownCaptured = hasPaidBreakdownCapture(
				reservation.paid_amount_breakdown,
			);
			const isCaptured =
				payment_details.captured ||
				breakdownCaptured ||
				capturedConfirmationNumbers.includes(reservation.confirmation_number);

			// Payment status logic with "Paid Offline" as last sanity check before "Not Paid"
			let computedPaymentStatus;
			if (isCaptured) {
				computedPaymentStatus = "Captured";
			} else if (payment_details?.onsite_paid_amount > 0) {
				computedPaymentStatus = "Paid Offline";
			} else if (reservation.payment === "not paid") {
				computedPaymentStatus = "Not Paid";
			} else {
				computedPaymentStatus = "Not Captured";
			}

			return {
				...reservation,
				customer_name: customer_details.name || "N/A",
				customer_phone: customer_details.phone || "N/A",
				hotel_name: hotelId.hotelName || "Unknown Hotel",
				createdAt: reservation.createdAt || null,
				payment_status: computedPaymentStatus,
			};
		});
	}, [safeData, capturedConfirmationNumbers]);

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

	const handleHotelClick = (record) => {
		const hotelDetailsFinal = {
			...record.hotelId,
			belongsTo: record.belongsTo,
		};
		localStorage.setItem("selectedHotel", JSON.stringify(hotelDetailsFinal));
		window.location.href = `/hotel-management/new-reservation/${record.belongsTo._id}/${record.hotelId._id}?list`;
	};

	// ------------------ Server Pagination Controls ------------------
	const totalPages = Math.max(Math.ceil(safeTotalDocuments / pageSize), 1);

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

	// ------------------ Helpers for dynamic background color ------------------
	// Payment Status with background + text color
	const getPaymentStatusStyles = (status = "") => {
		const s = status.toLowerCase();
		if (s === "captured") {
			return { backgroundColor: "var(--badge-bg-green)" };
		}
		if (s === "paid offline") {
			return {
				backgroundColor: "var(--accent-color-dark-green)",
				color: "#fff",
			};
		}
		if (s === "not captured") {
			return { backgroundColor: "var(--background-accent-yellow)" };
		}
		// Default: Not Paid or anything else => background-light
		return { backgroundColor: "var(--background-light)" };
	};

	// Reservation Status with background + text color
	const getReservationStatusStyles = (status = "") => {
		const s = status.toLowerCase();
		if (s === "confirmed") {
			return { backgroundColor: "var(--background-light)", color: "inherit" };
		}
		if (s === "inhouse") {
			return {
				backgroundColor: "var(--background-accent-yellow)",
				color: "inherit",
			};
		}
		if (s === "checked_out") {
			return { backgroundColor: "var(--badge-bg-green)", color: "inherit" };
		}
		if (s === "no_show") {
			return {
				backgroundColor: "var(--accent-color-orange)",
				color: "inherit",
			};
		}
		if (s === "cancelled") {
			return {
				backgroundColor: "var(--badge-bg-red)",
				color: "var(--button-font-color)",
			};
		}
		// Otherwise, no override
		return {};
	};

	// ------------------ Render ------------------
	return (
		<ContentTableWrapper>
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
						{sortedData.map((reservation, i) => {
							const resStatusStyles = getReservationStatusStyles(
								reservation.reservation_status
							);
							const payStatusStyles = getPaymentStatusStyles(
								reservation.payment_status
							);

							return (
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

									{/* Reservation Status with background and text color */}
									<td style={resStatusStyles}>
										{reservation.reservation_status}
									</td>

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

									{/* Payment Status with background and text color */}
									<td style={payStatusStyles}>{reservation.payment_status}</td>

									<td>
										{Number(reservation.total_amount || 0).toFixed(2)} SAR
									</td>
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
							);
						})}
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
				width='84%'
				style={{
					top: "3%",
					right: chosenLanguage === "Arabic" ? "7%" : "",
					left: chosenLanguage === "Arabic" ? "" : "7%",
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
					) : null
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
