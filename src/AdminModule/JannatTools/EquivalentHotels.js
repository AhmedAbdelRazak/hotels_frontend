import React, { useState, useMemo, useCallback } from "react";
import styled from "styled-components";
import { Table, Input, Button, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const EquivalentHotels = ({
	checkInDate,
	checkOutDate,
	selectedRoomTypes,
	allHotels,
}) => {
	// eslint-disable-next-line
	const [searchedColumn, setSearchedColumn] = useState("");

	// Helper function for safe parsing of float values
	const safeParseFloat = (value, fallback = 0) => {
		const parsed = parseFloat(value);
		return isNaN(parsed) ? fallback : parsed;
	};

	// Function to calculate pricingByDay with no commission
	const calculatePricingByDay = useCallback(
		(
			pricingRate,
			startDate,
			endDate,
			basePrice,
			defaultCost,
			commissionRate
		) => {
			const start = dayjs(startDate).startOf("day");
			const end = dayjs(endDate).subtract(1, "day").startOf("day");

			const dateArray = [];
			let currentDate = start;

			while (currentDate.isBefore(end) || currentDate.isSame(end, "day")) {
				const formattedDate = currentDate.format("YYYY-MM-DD");

				const rateForDate = pricingRate.find(
					(rate) => rate.calendarDate === formattedDate
				);

				const price = rateForDate
					? safeParseFloat(rateForDate.price, basePrice)
					: basePrice;

				const rootPrice = rateForDate
					? safeParseFloat(rateForDate.rootPrice, defaultCost)
					: defaultCost
					  ? defaultCost
					  : basePrice;

				const rateCommission = rateForDate
					? safeParseFloat(rateForDate.commissionRate, commissionRate)
					: commissionRate;

				dateArray.push({
					date: formattedDate,
					price,
					rootPrice,
					commissionRate: rateCommission,
				});

				currentDate = currentDate.add(1, "day");
			}

			return dateArray;
		},
		[]
	);

	const calculatePricingByDayWithCommission = useCallback(
		(
			pricingRate,
			startDate,
			endDate,
			basePrice,
			defaultCost,
			commissionRate
		) => {
			const pricingByDay = calculatePricingByDay(
				pricingRate,
				startDate,
				endDate,
				basePrice,
				defaultCost,
				commissionRate
			);

			// Add total price with commission to each day
			return pricingByDay.map((day) => ({
				...day,
				totalPriceWithCommission:
					Number(day.price) +
					Number(day.rootPrice) * (Number(day.commissionRate) / 100),
			}));
		},
		[calculatePricingByDay]
	);

	// Calculate equivalent hotels
	const equivalentHotels = useMemo(() => {
		return allHotels
			.flatMap((hotel) =>
				hotel.roomCountDetails
					.filter((room) => selectedRoomTypes.includes(room.roomType))
					.map((room) => {
						const basePrice = safeParseFloat(room.price?.basePrice, 0);
						const defaultCost = safeParseFloat(room.defaultCost, 0);
						const commissionRate = safeParseFloat(
							room.roomCommission || hotel.commission || 10,
							10 // Default to 10%
						);

						const nights = dayjs(checkOutDate).diff(dayjs(checkInDate), "day");

						// Calculate pricingByDay
						const pricingByDay = calculatePricingByDayWithCommission(
							room.pricingRate || [],
							checkInDate,
							checkOutDate,
							basePrice,
							defaultCost,
							commissionRate
						);

						// Calculate metrics
						const averagePricePerNight =
							pricingByDay.reduce(
								(total, day) => total + day.totalPriceWithCommission,
								0
							) / nights;

						const totalAmount = pricingByDay.reduce(
							(total, day) => total + day.rootPrice,
							0
						);
						const totalPriceWithCommission = pricingByDay.reduce(
							(total, day) => total + day.totalPriceWithCommission,
							0
						);
						const totalCommission =
							Number(totalPriceWithCommission - totalAmount) || 0;

						// console.log(totalCommission, "totalCommission");
						// console.log(totalPriceWithCommission, "totalPriceWithCommission");
						// console.log(totalAmount, "totalAmount");
						// console.log(pricingByDay, "pricingByDaypricingByDay");

						return {
							hotelName: hotel.hotelName,
							roomType: room.roomType,
							displayName: room.displayName,
							totalPriceWithCommission,
							nights,
							totalAmount,
							totalCommission,
							averagePricePerNight,
							grandTotal: totalAmount + totalCommission,
						};
					})
			)
			.sort((a, b) => a.hotelName.localeCompare(b.hotelName));
	}, [
		allHotels,
		selectedRoomTypes,
		checkInDate,
		checkOutDate,
		calculatePricingByDayWithCommission,
	]);

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
			title: "Nights",
			dataIndex: "nights",
			key: "nights",
			render: (value) => <TruncatedText title={value}>{value}</TruncatedText>,
		},
		{
			title: "Price / Night",
			dataIndex: "averagePricePerNight",
			key: "averagePricePerNight",
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
