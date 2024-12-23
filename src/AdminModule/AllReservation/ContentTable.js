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

	const reservations = allReservationsForAdmin?.data || [];
	const totalDocuments = allReservationsForAdmin?.totalDocuments || 0;

	// Preprocess data to ensure all fields are properly accessible
	const formattedReservations = reservations.map((reservation, index) => {
		const { customer_details = {}, hotelId = {} } = reservation; // Default to empty objects if missing
		return {
			...reservation,
			index: index + 1 + (currentPage - 1) * pageSize, // Calculate the index
			customer_name: customer_details.name || "N/A", // Fallback to "N/A" if missing
			customer_phone: customer_details.phone || "N/A",
			customer_email: customer_details.email || "N/A",
			hotel_name: hotelId.hotelName || "Unknown Hotel", // Extract hotelName from hotelId
			hotel_belongs_to: hotelId.belongsTo || {}, // Add belongsTo for redirection
		};
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

	// Function to handle clicking on a hotel name
	const handleHotelClick = (hotel) => {
		// console.log(hotel, "hotel");

		const hotelDetailsFinal = {
			...hotel.hotelId,
			belongsTo: hotel.belongsTo,
		};
		localStorage.setItem("selectedHotel", JSON.stringify(hotelDetailsFinal));

		// Redirect to the dashboard
		window.location.href = `/hotel-management/new-reservation/${hotel.belongsTo._id}/${hotel.hotelId._id}?list`;
	};

	// Show Modal with selected reservation details
	const showDetailsModal = (record) => {
		setSelectedReservation(record);
		setIsModalVisible(true);
	};

	const handleModalClose = () => {
		setIsModalVisible(false);
		setSelectedReservation(null);
	};

	// Define columns for the table
	const columns = [
		{
			title: "Index",
			dataIndex: "index",
			key: "index",
			render: (_, __, index) => index + 1 + (currentPage - 1) * pageSize, // Dynamic index based on current page
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
			dataIndex: "customer_name", // Preprocessed field
			key: "customer_name",
			...getColumnSearchProps("customer_name"),
		},
		{
			title: "Phone",
			dataIndex: "customer_phone", // Preprocessed field
			key: "customer_phone",
			...getColumnSearchProps("customer_phone"),
		},
		{
			title: "Hotel Name",
			dataIndex: "hotel_name", // Preprocessed field
			key: "hotel_name",
			...getColumnSearchProps("hotel_name"),
			render: (text, record) => (
				<span
					style={{
						textTransform: "capitalize",
						color: "blue",
						cursor: "pointer",
						textDecoration: "underline",
					}}
					onClick={() => handleHotelClick(record)}
				>
					{text}
				</span>
			), // Make the hotel name clickable
		},
		{
			title: "Check-in Date",
			dataIndex: "checkin_date",
			key: "checkin_date",
			sorter: (a, b) => new Date(a.checkin_date) - new Date(b.checkin_date),
			render: (text) => new Date(text).toLocaleDateString(), // Format date
		},
		{
			title: "Check-out Date",
			dataIndex: "checkout_date",
			key: "checkout_date",
			sorter: (a, b) => new Date(a.checkout_date) - new Date(b.checkout_date),
			render: (text) => new Date(text).toLocaleDateString(), // Format date
		},
		{
			title: "Created At",
			dataIndex: "createdAt",
			key: "createdAt",
			sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
			render: (text) => new Date(text).toLocaleDateString(), // Format date
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
		console.log("Sorter:", sorter); // Optional: Use this for backend sorting if needed
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

			<Table
				columns={columns}
				dataSource={formattedReservations.map((reservation) => ({
					...reservation,
					key: reservation._id, // Use _id as unique key for each row
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
