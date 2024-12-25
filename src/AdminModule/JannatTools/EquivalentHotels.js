import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { Table, Input, Button, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const EquivalentHotels = ({
	checkInDate,
	checkOutDate,
	selectedRoomTypes,
	allHotels,
}) => {
	// eslint-disable-next-line
	const [searchedColumn, setSearchedColumn] = useState("");

	// Calculate the number of nights
	const nights = checkOutDate.diff(checkInDate, "day");

	// Helper function for safe parsing of float values
	const safeParseFloat = (value, fallback = 0) => {
		const parsed = parseFloat(value);
		return isNaN(parsed) ? fallback : parsed;
	};

	// Calculate equivalent hotels
	const equivalentHotels = useMemo(() => {
		return allHotels
			.flatMap((hotel) =>
				hotel.roomCountDetails
					.filter((room) => selectedRoomTypes.includes(room.roomType))
					.map((room) => {
						const basePrice = safeParseFloat(room.price?.basePrice, 0);
						const commissionRate = safeParseFloat(
							room.roomCommission || hotel.commission || 10,
							10 // Default to 10%
						);

						const totalAmount = nights * basePrice;
						const totalCommission = (totalAmount * commissionRate) / 100;
						const grandTotal = totalAmount + totalCommission;

						return {
							hotelName: hotel.hotelName,
							roomType: room.roomType,
							displayName: room.displayName,
							basePrice,
							totalAmount,
							totalCommission,
							grandTotal,
						};
					})
			)
			.sort((a, b) => a.hotelName.localeCompare(b.hotelName));
	}, [allHotels, selectedRoomTypes, nights]);

	// Ant Design's search filter
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
					onPressEnter={() => confirm()} // Confirm the filter on Enter
					style={{ marginBottom: 8, display: "block" }}
				/>
				<Space>
					<Button
						type='primary'
						onClick={() => confirm()} // Confirm the filter on Search
						icon={<SearchOutlined />}
						size='small'
						style={{ width: 90 }}
					>
						Search
					</Button>
					<Button
						onClick={() => {
							clearFilters(); // Clear the filter keys
							confirm({ closeDropdown: true }); // Trigger table re-render
						}}
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
		render: (text) =>
			searchedColumn === dataIndex ? (
				<span style={{ fontWeight: "bold", color: "#1890ff" }}>{text}</span>
			) : (
				<TruncatedText title={text}>{text}</TruncatedText>
			),
	});

	// Define table columns
	const columns = [
		{
			title: "Hotel Name",
			dataIndex: "hotelName",
			key: "hotelName",
			...getColumnSearchProps("hotelName"),
			sorter: (a, b) => a.hotelName.localeCompare(b.hotelName),
		},
		{
			title: "Room Type",
			dataIndex: "roomType",
			key: "roomType",
			render: (value) => <TruncatedText title={value}>{value}</TruncatedText>,
		},
		{
			title: "Display Name",
			dataIndex: "displayName",
			key: "displayName",
			render: (value) => <TruncatedText title={value}>{value}</TruncatedText>,
		},
		{
			title: "Base Price",
			dataIndex: "basePrice",
			key: "basePrice",
			render: (value) => `${value.toFixed(2)} SAR`,
		},
		{
			title: "Total Amount",
			dataIndex: "totalAmount",
			key: "totalAmount",
			render: (value) => `${value.toFixed(2)} SAR`,
		},
		{
			title: "Total Commission",
			dataIndex: "totalCommission",
			key: "totalCommission",
			render: (value) => `${value.toFixed(2)} SAR`,
		},
		{
			title: "Grand Total",
			dataIndex: "grandTotal",
			key: "grandTotal",
			sorter: (a, b) => a.grandTotal - b.grandTotal,
			render: (value) => `${value.toFixed(2)} SAR`,
		},
	];

	return (
		<EquivalentHotelsWrapper>
			<h2>Equivalent Hotels</h2>
			<Table
				columns={columns}
				dataSource={equivalentHotels.map((hotel, index) => ({
					...hotel,
					key: index,
				}))}
				pagination={{ pageSize: 100 }}
			/>
		</EquivalentHotelsWrapper>
	);
};

export default EquivalentHotels;

const EquivalentHotelsWrapper = styled.div`
	padding: 20px;
	background: #fff;
	border-radius: 8px;
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);

	.ant-table-wrapper {
		max-height: 700px;
		overflow-y: auto;
	}

	.ant-table {
		font-size: 0.75rem !important;
		text-transform: capitalize;
	}
`;

const TruncatedText = styled.div`
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 150px; /* Adjust the max width as needed */
	cursor: pointer;
`;
