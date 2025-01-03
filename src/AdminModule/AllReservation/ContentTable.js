import React, { useState } from "react";
import styled from "styled-components";
import { Table, Input, Button, Space, Modal, Tooltip } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import MoreDetails from "./MoreDetails";
import ScoreCards from "./ScoreCards";
// eslint-disable-next-line
import ReservationDetail from "../../HotelModule/ReservationsFolder/ReservationDetail";

const ContentTable = ({
	allReservationsForAdmin,
	currentPage,
	setCurrentPage,
	pageSize,
	setPageSize,
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [filterType, setFilterType] = useState("");
	const capturedConfirmationNumbers = ["2944008828"];
	const reservations = allReservationsForAdmin?.data || [];
	const totalDocuments = allReservationsForAdmin?.totalDocuments || 0;

	// Preprocess data to ensure all fields are properly accessible
	const formattedReservations = reservations.map((reservation, index) => {
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
			customer_email: customer_details.email || "N/A",
			hotel_name: hotelId.hotelName || "Unknown Hotel",
			payment_status: isCaptured ? "Captured" : "Not Captured",
			isCheckinToday:
				new Date(reservation.checkin_date).toDateString() ===
				new Date().toDateString(),
			isCheckoutToday:
				new Date(reservation.checkout_date).toDateString() ===
				new Date().toDateString(),
			total_amount: reservation.total_amount || 0,
			isPaymentTriggered: !!payment_details.capturing || isCaptured,
		};
	});

	const filteredReservations = formattedReservations.filter((reservation) => {
		if (filterType === "checkinToday") return reservation.isCheckinToday;
		if (filterType === "checkoutToday") return reservation.isCheckoutToday;
		if (filterType === "paymentTriggered")
			return reservation.isPaymentTriggered;
		if (filterType === "paymentNotTriggered")
			return !reservation.isPaymentTriggered;
		return true;
	});

	const getColumnSearchProps = (dataIndex) => ({
		filterDropdown: ({
			setSelectedKeys,
			selectedKeys,
			confirm,
			clearFilters,
		}) => (
			<div style={{ padding: 8 }}>
				<Input
					placeholder={`Search ${dataIndex}`}
					value={selectedKeys[0]}
					onChange={(e) =>
						setSelectedKeys(e.target.value ? [e.target.value] : [])
					}
					onPressEnter={() => confirm()}
					style={{ marginBottom: 8, display: "block" }}
				/>
				<Space>
					<Button
						type='primary'
						onClick={() => confirm()}
						icon={<SearchOutlined />}
						size='small'
						style={{ width: 90 }}
					>
						Search
					</Button>
					<Button
						onClick={() => clearFilters()}
						size='small'
						style={{ width: 90 }}
					>
						Reset
					</Button>
				</Space>
			</div>
		),
		filterIcon: (filtered) => (
			<SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
		),
		onFilter: (value, record) =>
			record[dataIndex]
				? record[dataIndex]
						.toString()
						.toLowerCase()
						.includes(value.toLowerCase())
				: false,
	});

	const handleHotelClick = (hotel) => {
		const hotelDetailsFinal = {
			...hotel.hotelId,
			belongsTo: hotel.belongsTo,
		};
		localStorage.setItem("selectedHotel", JSON.stringify(hotelDetailsFinal));
		window.location.href = `/hotel-management/new-reservation/${hotel.belongsTo._id}/${hotel.hotelId._id}?list`;
	};

	const showDetailsModal = (record) => {
		setSelectedReservation(record);
		setIsModalVisible(true);
	};

	const handleModalClose = () => {
		setIsModalVisible(false);
		setSelectedReservation(null);
	};

	const handleFilterClick = (type) => {
		setFilterType((prevType) => (prevType === type ? "" : type));
	};

	const columns = [
		{
			title: <Tooltip title='Index'>Index</Tooltip>,
			dataIndex: "index",
			key: "index",
		},
		{
			title: <Tooltip title='Confirmation Number'>Confirmation Number</Tooltip>,
			dataIndex: "confirmation_number",
			key: "confirmation_number",
			sorter: (a, b) =>
				a.confirmation_number.localeCompare(b.confirmation_number),
			...getColumnSearchProps("confirmation_number"),
			render: (text) => (
				<Tooltip title={text} placement='top'>
					<span
						style={{
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							display: "block",
						}}
					>
						{text}
					</span>
				</Tooltip>
			),
		},
		{
			title: <Tooltip title='Customer Name'>Customer Name</Tooltip>,
			dataIndex: "customer_name",
			key: "customer_name",
			...getColumnSearchProps("customer_name"),
			render: (text) => (
				<Tooltip title={text} placement='top'>
					<span
						style={{
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							display: "block",
						}}
					>
						{text}
					</span>
				</Tooltip>
			),
		},
		{
			title: <Tooltip title='Phone'>Phone</Tooltip>,
			dataIndex: "customer_phone",
			key: "customer_phone",
			...getColumnSearchProps("customer_phone"),
			render: (text) => (
				<Tooltip title={text} placement='top'>
					<span
						style={{
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							display: "block",
						}}
					>
						{text}
					</span>
				</Tooltip>
			),
		},
		{
			title: <Tooltip title='Hotel Name'>Hotel Name</Tooltip>,
			dataIndex: "hotel_name",
			key: "hotel_name",
			...getColumnSearchProps("hotel_name"),
			render: (text, record) => (
				<Tooltip title={text} placement='top'>
					<span
						style={{
							textTransform: "capitalize",
							color: "blue",
							cursor: "pointer",
							textDecoration: "underline",
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							display: "block",
						}}
						onClick={() => handleHotelClick(record)}
					>
						{text}
					</span>
				</Tooltip>
			),
		},
		{
			title: <Tooltip title='Reservation Status'>Reservation Status</Tooltip>,
			dataIndex: "reservation_status",
			key: "reservation_status",
			render: (text) => (
				<span
					style={{
						backgroundColor:
							text === "cancelled"
								? "darkred"
								: text === "not paid"
								  ? "#222222"
								  : undefined,
						color:
							text === "cancelled" || text === "not paid" ? "white" : undefined,
						padding: "5px 10px",
						borderRadius: "5px",
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
						display: "block",
						textTransform: "capitalize",
					}}
				>
					{text}
				</span>
			),
		},
		{
			title: <Tooltip title='Check-in Date'>Check-in Date</Tooltip>,
			dataIndex: "checkin_date",
			key: "checkin_date",
			sorter: (a, b) => new Date(a.checkin_date) - new Date(b.checkin_date),
			render: (text) => new Date(text).toLocaleDateString(),
		},
		{
			title: <Tooltip title='Check-out Date'>Check-out Date</Tooltip>,
			dataIndex: "checkout_date",
			key: "checkout_date",
			sorter: (a, b) => new Date(a.checkout_date) - new Date(b.checkout_date),
			render: (text) => new Date(text).toLocaleDateString(),
		},
		{
			title: <Tooltip title='Payment'>Payment</Tooltip>,
			dataIndex: "payment_status",
			key: "payment_status",
			render: (text) => (
				<span
					style={{
						backgroundColor: text === "Captured" ? "#d4edda" : undefined,
						color: text === "Captured" ? "#155724" : undefined,
						padding: "5px 10px",
						borderRadius: "5px",
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
						display: "block",
					}}
				>
					{text}
				</span>
			),
		},
		{
			title: <Tooltip title='Total Amount'>Total Amount</Tooltip>,
			dataIndex: "total_amount",
			key: "total_amount",
			render: (text) => (
				<Tooltip title={text} placement='top'>
					<span
						style={{
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							display: "block",
						}}
					>
						{Number(text).toFixed(2)} SAR
					</span>
				</Tooltip>
			),
		},
		{
			title: <Tooltip title='Details'>Details</Tooltip>,
			key: "details",
			render: (_, record) => (
				<Button type='link' onClick={() => showDetailsModal(record)}>
					View Details
				</Button>
			),
		},
	];

	const handleTableChange = (pagination, filters, sorter) => {
		setCurrentPage(pagination.current);
		setPageSize(pagination.pageSize);
	};

	return (
		<ContentTableWrapper>
			{reservations && reservations.length > 0 ? (
				<div className='my-4'>
					<ScoreCards
						reservations={reservations}
						totalReservations={totalDocuments}
					/>
				</div>
			) : (
				<div>No Reservation</div>
			)}

			<div style={{ marginBottom: 16 }}>
				<Space>
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
						onClick={() => handleFilterClick("paymentTriggered")}
						isActive={filterType === "paymentTriggered"}
					>
						Payment Triggered
					</FilterButton>
					<FilterButton
						onClick={() => handleFilterClick("paymentNotTriggered")}
						isActive={filterType === "paymentNotTriggered"}
					>
						Payment Not Triggered
					</FilterButton>
				</Space>
			</div>

			<Table
				columns={columns}
				dataSource={filteredReservations.map((reservation) => ({
					...reservation,
					key: reservation._id,
				}))}
				pagination={{
					current: currentPage,
					total: totalDocuments,
					pageSize: pageSize,
					showSizeChanger: true,
					pageSizeOptions: ["5", "10", "20", "50"],
				}}
				onChange={handleTableChange}
				bordered
				rowClassName={() => "custom-row-height"}
			/>

			<Modal
				// title={<div style={{ fontSize: "1.5rem" }}>Reservation Details</div>}
				open={isModalVisible}
				onCancel={handleModalClose}
				className='float-right'
				width={"84%"}
				footer={[
					<Button key='close' onClick={handleModalClose}>
						Close
					</Button>,
				]}
			>
				<>
					{selectedReservation &&
					selectedReservation.hotelId &&
					selectedReservation.hotelId.hotelName ? (
						<MoreDetails
							selectedReservation={selectedReservation}
							hotelDetails={selectedReservation.hotelId}
							reservation={selectedReservation}
							setReservation={setSelectedReservation}
						/>
					) : null}
				</>

				{/* {selectedReservation &&
				selectedReservation.hotelId &&
				selectedReservation.hotelId.hotelName ? (
					<ReservationDetail
						reservation={selectedReservation}
						setReservation={setSelectedReservation}
						hotelDetails={selectedReservation.hotelId}
					/>
				) : null} */}
			</Modal>
		</ContentTableWrapper>
	);
};

export default ContentTable;

const ContentTableWrapper = styled.div`
	.ant-table {
		border-radius: 10px;
		overflow: hidden;
		font-size: 12px;
	}

	.th {
		font-size: 12px;
		font-weight: bold !important;
	}
	.ant-pagination {
		margin-top: 16px;
	}
	.custom-row-height .ant-table-cell {
		height: auto !important;
		line-height: 1.5 !important; /* Adjust line-height to align with the text */
		padding: 8px !important; /* Ensure consistent padding */
	}
`;

const FilterButton = styled(Button)`
	background-color: ${(props) => (props.isActive ? "#d4edda" : undefined)};
	color: ${(props) => (props.isActive ? "#155724" : undefined)};
	border-color: ${(props) => (props.isActive ? "#d4edda" : undefined)};
`;
