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
	// Filter props from parent
	filterType,
	setFilterType,
	handleFilterClickFromParent,
	allHotelDetailsAdmin,
}) => {
	// ------------------ Search Box local state ------------------
	const [searchBoxValue, setSearchBoxValue] = useState(searchTerm || "");

	// ------------------ Payment isCaptured flags, for display only ------------------
	// (Keeps the same manual override you had)
	const capturedConfirmationNumbers = useMemo(() => ["2944008828"], []);

	/**
	 * PayPal-aware payment summary (keeps your existing labels)
	 * Returns { status, hint, isCaptured, paidOffline }
	 */
	const summarizePayment = (reservation) => {
		const pd = reservation?.paypal_details || {};
		const pmt = (reservation?.payment || "").toLowerCase();
		const legacyCaptured = !!reservation?.payment_details?.captured;
		const payOffline =
			Number(reservation?.payment_details?.onsite_paid_amount || 0) > 0 ||
			pmt === "paid offline";

		// PayPal ledger signals
		const capTotal = Number(pd?.captured_total_usd || 0);
		const limitUsd = Number(
			pd?.bounds && typeof pd.bounds.limit_usd === "number"
				? pd.bounds.limit_usd
				: 0
		);
		const pendingUsd = Number(pd?.pending_total_usd || 0);
		const initialCompleted =
			(pd?.initial?.capture_status || "").toUpperCase() === "COMPLETED";
		const anyMitCompleted =
			Array.isArray(pd?.mit) &&
			pd.mit.some(
				(c) => (c?.capture_status || "").toUpperCase() === "COMPLETED"
			);

		// Unify captured with PayPal + legacy
		const isCaptured =
			legacyCaptured ||
			capTotal > 0 ||
			initialCompleted ||
			anyMitCompleted ||
			pmt === "paid online";

		const isNotPaid = pmt === "not paid" && !isCaptured && !payOffline;

		let status = "Not Captured";
		if (isCaptured) status = "Captured";
		else if (payOffline) status = "Paid Offline";
		else if (isNotPaid) status = "Not Paid";

		// Build a helpful hint for tooltip (non-invasive)
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

			// Keep your manual override
			const manualOverrideCaptured = capturedConfirmationNumbers.includes(
				reservation.confirmation_number
			);

			const paypalAware = summarizePayment(reservation);

			// Final captured decision honors both your manual override + PayPal-aware logic
			const isCaptured =
				manualOverrideCaptured || paypalAware.isCaptured || false;

			// Payment status with your same verbiage
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
				hotel_name: hotelId.hotelName || "Unknown Hotel",
				createdAt: reservation.createdAt || null,
				payment_status: computedPaymentStatus,
				// For tooltip on the payment cell
				payment_status_hint: paypalAware.hint || "",
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

		const toKey = (v) => {
			if (v == null) return "";
			return v;
		};

		const sorted = [...formattedReservations].sort((a, b) => {
			let valA = toKey(a[sortField]);
			let valB = toKey(b[sortField]);

			// Dates
			if (
				sortField === "checkin_date" ||
				sortField === "checkout_date" ||
				sortField === "createdAt"
			) {
				valA = valA ? new Date(valA).getTime() : 0;
				valB = valB ? new Date(valB).getTime() : 0;
				return direction === "asc" ? valA - valB : valB - valA;
			}

			// Numbers
			if (sortField === "total_amount") {
				valA = Number(valA) || 0;
				valB = Number(valB) || 0;
				return direction === "asc" ? valA - valB : valB - valA;
			}

			// Strings (confirmation_number, names, statuses, etc.)
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

	const showDetailsModal = (reservation) => {
		setSelectedReservation(reservation);
		setIsModalVisible(true);
	};
	const handleModalClose = () => {
		setSelectedReservation(null);
		setIsModalVisible(false);
	};

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
		// Default: Not Paid or anything else
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
		return {};
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
					{/* "Paid Offline" filter button */}
					<FilterButton
						style={{ fontWeight: "bold" }}
						onClick={() => onFilterClick("paidOffline")}
						isActive={filterType === "paidOffline"}
					>
						Paid Offline
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

									{/* Payment Status with background and text color + PayPal tooltip */}
									<td style={payStatusStyles}>
										{reservation.payment_status_hint ? (
											<Tooltip title={reservation.payment_status_hint}>
												<span>{reservation.payment_status}</span>
											</Tooltip>
										) : (
											reservation.payment_status
										)}
									</td>

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
