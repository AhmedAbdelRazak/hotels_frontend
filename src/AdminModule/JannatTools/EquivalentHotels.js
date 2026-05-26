import React, { useState, useMemo, useCallback } from "react";
import styled from "styled-components";
import { Table, Input, Button, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const EQUIVALENT_TEXT = {
	en: {
		title: "Equivalent Hotels",
		search: "Search",
		reset: "Reset",
		searchPlaceholder: "Search",
		hotelName: "Hotel Name",
		roomType: "Room Type",
		displayName: "Display Name",
		nights: "Nights",
		pricePerNight: "Price / Night",
		totalAmount: "Total Amount",
		totalCommission: "Total Commission",
		grandTotal: "Grand Total",
	},
	ar: {
		title: "الفنادق المكافئة",
		search: "بحث",
		reset: "إعادة ضبط",
		searchPlaceholder: "بحث",
		hotelName: "اسم الفندق",
		roomType: "نوع الغرفة",
		displayName: "اسم الغرفة",
		nights: "الليالي",
		pricePerNight: "السعر / ليلة",
		totalAmount: "إجمالي التكلفة",
		totalCommission: "إجمالي العمولة",
		grandTotal: "الإجمالي",
	},
};

const EquivalentHotels = ({
	checkInDate,
	checkOutDate,
	selectedRoomTypes,
	allHotels,
	chosenLanguage,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const TXT = EQUIVALENT_TEXT[isArabic ? "ar" : "en"];
	const currency = isArabic ? "ر.س" : "SAR";
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
							room.roomCommission ?? hotel.commission ?? 10,
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
					placeholder={`${TXT.searchPlaceholder} ${
						{
							hotelName: TXT.hotelName,
							roomType: TXT.roomType,
							displayName: TXT.displayName,
						}[dataIndex] || dataIndex
					}`}
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
						{TXT.search}
					</Button>
					<Button
						onClick={() => {
							clearFilters(); // Clear the filter keys
							confirm({ closeDropdown: true }); // Trigger table re-render
						}}
						size='small'
						style={{ width: 90 }}
					>
						{TXT.reset}
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
			title: TXT.hotelName,
			dataIndex: "hotelName",
			key: "hotelName",
			...getColumnSearchProps("hotelName"),
			sorter: (a, b) => a.hotelName.localeCompare(b.hotelName),
		},
		{
			title: TXT.roomType,
			dataIndex: "roomType",
			key: "roomType",
			render: (value) => <TruncatedText title={value}>{value}</TruncatedText>,
		},
		{
			title: TXT.displayName,
			dataIndex: "displayName",
			key: "displayName",
			render: (value) => <TruncatedText title={value}>{value}</TruncatedText>,
		},
		{
			title: TXT.nights,
			dataIndex: "nights",
			key: "nights",
			render: (value) => <TruncatedText title={value}>{value}</TruncatedText>,
		},
		{
			title: TXT.pricePerNight,
			dataIndex: "averagePricePerNight",
			key: "averagePricePerNight",
			render: (value) => `${value.toFixed(2)} ${currency}`,
		},
		{
			title: TXT.totalAmount,
			dataIndex: "totalAmount",
			key: "totalAmount",
			render: (value) => `${value.toFixed(2)} ${currency}`,
		},
		{
			title: TXT.totalCommission,
			dataIndex: "totalCommission",
			key: "totalCommission",
			render: (value) => `${value.toFixed(2)} ${currency}`,
		},
		{
			title: TXT.grandTotal,
			dataIndex: "grandTotal",
			key: "grandTotal",
			sorter: (a, b) => a.grandTotal - b.grandTotal,
			render: (value) => `${value.toFixed(2)} ${currency}`,
		},
	];

	return (
		<EquivalentHotelsWrapper>
			<h2>{TXT.title}</h2>
			<Table
				columns={columns}
				dataSource={equivalentHotels.map((hotel, index) => ({
					...hotel,
					key: index,
				}))}
				pagination={{ pageSize: 100 }}
				scroll={{ x: "max-content" }}
			/>
		</EquivalentHotelsWrapper>
	);
};

export default EquivalentHotels;

const EquivalentHotelsWrapper = styled.div`
	padding: 20px;
	background: #fff;
	border-radius: 8px;
	border: 1px solid rgba(139, 190, 227, 0.36);
	box-shadow: 0 10px 24px rgba(13, 49, 88, 0.08);
	min-width: 0;
	overflow: hidden;

	h2 {
		margin: 0 0 12px;
		color: #0b3158;
		font-size: 1.12rem;
		font-weight: 950;
		letter-spacing: 0;
	}

	.ant-table-wrapper {
		max-height: 700px;
		overflow: auto;
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
