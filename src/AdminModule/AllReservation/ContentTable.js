import React, { useState } from "react";
import styled from "styled-components";
import { Table, Input, Button, Space, Modal } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import MoreDetails from "./MoreDetails";
import ScoreCards from "./ScoreCards";

const ContentTable = ({
	allReservationsForAdmin,
	currentPage,
	setCurrentPage,
	pageSize,
	setPageSize,
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [filterType, setFilterType] = useState(""); // New state for filter type
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
			index: index + 1 + (currentPage - 1) * pageSize, // Calculate the index
			customer_name: customer_details.name || "N/A",
			customer_phone: customer_details.phone || "N/A",
			customer_email: customer_details.email || "N/A",
			hotel_name: hotelId.hotelName || "Unknown Hotel",
			payment_status: isCaptured ? "Captured" : "Not Captured", // Add Payment Status
			isCheckinToday:
				new Date(reservation.checkin_date).toDateString() ===
				new Date().toDateString(),
			isCheckoutToday:
				new Date(reservation.checkout_date).toDateString() ===
				new Date().toDateString(),
			isPaymentTriggered: !!payment_details.capturing || isCaptured, // Check if payment is triggered
		};
	});

	// Filter data based on filterType
	const filteredReservations = formattedReservations.filter((reservation) => {
		if (filterType === "checkinToday") return reservation.isCheckinToday;
		if (filterType === "checkoutToday") return reservation.isCheckoutToday;
		if (filterType === "paymentTriggered")
			return reservation.isPaymentTriggered;
		if (filterType === "paymentNotTriggered")
			return !reservation.isPaymentTriggered;
		return true; // Show all if no filter is applied
	});

	// Generic search filter with case-insensitive matching
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

	// Show Modal with selected reservation details
	const showDetailsModal = (record) => {
		setSelectedReservation(record);
		setIsModalVisible(true);
	};

	const handleModalClose = () => {
		setIsModalVisible(false);
		setSelectedReservation(null);
	};

	// Handle button click to toggle filters
	const handleFilterClick = (type) => {
		setFilterType((prevType) => (prevType === type ? "" : type));
	};

	// Define columns for the table
	const columns = [
		{
			title: "Index",
			dataIndex: "index",
			key: "index",
		},
		{
			title: "Confirmation Number",
			dataIndex: "confirmation_number",
			key: "confirmation_number",
			sorter: (a, b) =>
				a.confirmation_number.localeCompare(b.confirmation_number),
			...getColumnSearchProps("confirmation_number"),
		},
		{
			title: "Customer Name",
			dataIndex: "customer_name",
			key: "customer_name",
			...getColumnSearchProps("customer_name"),
		},
		{
			title: "Phone",
			dataIndex: "customer_phone",
			key: "customer_phone",
			...getColumnSearchProps("customer_phone"),
		},
		{
			title: "Hotel Name",
			dataIndex: "hotel_name",
			key: "hotel_name",
			...getColumnSearchProps("hotel_name"),
		},
		{
			title: "Check-in Date",
			dataIndex: "checkin_date",
			key: "checkin_date",
			sorter: (a, b) => new Date(a.checkin_date) - new Date(b.checkin_date),
			render: (text) => new Date(text).toLocaleDateString(),
		},
		{
			title: "Check-out Date",
			dataIndex: "checkout_date",
			key: "checkout_date",
			sorter: (a, b) => new Date(a.checkout_date) - new Date(b.checkout_date),
			render: (text) => new Date(text).toLocaleDateString(),
		},
		{
			title: "Payment",
			dataIndex: "payment_status",
			key: "payment_status",
			render: (text) => (
				<span
					style={{
						backgroundColor: text === "Captured" ? "#d4edda" : undefined, // Light green for captured payments
						color: text === "Captured" ? "#155724" : undefined,
						padding: "5px 10px",
						borderRadius: "5px",
					}}
				>
					{text}
				</span>
			),
		},
		{
			title: "Details",
			key: "details",
			render: (_, record) => (
				<Button type='link' onClick={() => showDetailsModal(record)}>
					View Details
				</Button>
			),
		},
	];

	// Handle table pagination and sorting
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

			{/* Filter Bar */}
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
			/>

			<Modal
				title='Reservation Details'
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
				<MoreDetails selectedReservation={selectedReservation} />
			</Modal>
		</ContentTableWrapper>
	);
};

export default ContentTable;

const ContentTableWrapper = styled.div`
	.ant-table {
		border-radius: 10px;
		overflow: hidden;
	}
	.ant-pagination {
		margin-top: 16px;
	}
`;

const FilterButton = styled(Button)`
	background-color: ${(props) => (props.isActive ? "#d4edda" : undefined)};
	color: ${(props) => (props.isActive ? "#155724" : undefined)};
	border-color: ${(props) => (props.isActive ? "#d4edda" : undefined)};
`;
