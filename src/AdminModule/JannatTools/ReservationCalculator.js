import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { message, DatePicker, Select, Button, Collapse } from "antd";
import { isAuthenticated } from "../../auth";
import { gettingHotelDetailsForAdmin } from "../apiAdmin";
import dayjs from "dayjs";
import EquivalentHotels from "./EquivalentHotels";

const { Option } = Select;
const { Panel } = Collapse;

const ReservationCalculator = () => {
	// Detect if user is on mobile (<= 768px)
	const isMobile = window.innerWidth <= 768;

	const [allHotels, setAllHotels] = useState([]);
	const [checkInDate, setCheckInDate] = useState(null);
	const [checkOutDate, setCheckOutDate] = useState(null);
	const [selectedRoomTypes, setSelectedRoomTypes] = useState([]);
	const [filteredHotels, setFilteredHotels] = useState([]);
	const [selectedHotel, setSelectedHotel] = useState(null);
	const [displayNames, setDisplayNames] = useState([]);
	const [selectedDisplayName, setSelectedDisplayName] = useState(null);
	const [summary, setSummary] = useState(null);

	const { user, token } = isAuthenticated();

	// Fetch all hotels
	const getAllHotels = useCallback(async () => {
		try {
			const data = await gettingHotelDetailsForAdmin(user._id, token);
			if (data && !data.error) {
				const activeHotels = data.filter(
					(hotel) => hotel.activateHotel === true
				);
				const sortedHotels = activeHotels.sort((a, b) =>
					a.hotelName.localeCompare(b.hotelName)
				);
				setAllHotels(sortedHotels);
			} else {
				message.error("Failed to fetch hotels.");
			}
		} catch (error) {
			console.error("Error fetching hotels:", error);
		}
	}, [user._id, token]);

	useEffect(() => {
		getAllHotels();
	}, [getAllHotels]);

	// Filter hotels by selected room types
	useEffect(() => {
		if (selectedRoomTypes.length > 0) {
			const filtered = allHotels.filter((hotel) =>
				hotel.roomCountDetails.some((room) =>
					selectedRoomTypes.includes(room.roomType)
				)
			);
			setFilteredHotels(filtered);
		} else {
			setFilteredHotels([]);
		}
	}, [selectedRoomTypes, allHotels]);

	// Populate display names when a hotel is selected
	useEffect(() => {
		if (selectedHotel) {
			const hotel = allHotels.find((h) => h._id === selectedHotel);
			if (hotel) {
				const roomOptions = hotel.roomCountDetails
					.filter((room) => selectedRoomTypes.includes(room.roomType))
					.map((room) => `${room.displayName} | ${room.roomType}`);
				setDisplayNames(roomOptions);
			}
		} else {
			setDisplayNames([]);
		}
	}, [selectedHotel, selectedRoomTypes, allHotels]);

	// Utility functions for price calculations
	const safeParseFloat = (value, fallback = 0) => {
		const parsed = parseFloat(value);
		return isNaN(parsed) ? fallback : parsed;
	};

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
					: defaultCost || basePrice;

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

			return pricingByDay.map((day) => ({
				...day,
				totalPriceWithCommission:
					Number(day.price) +
					Number(day.rootPrice) * (Number(day.commissionRate) / 100),
			}));
		},
		[calculatePricingByDay]
	);

	// If user clicks "Show Details"
	const handleShowDetails = () => {
		if (!checkInDate || !checkOutDate || !selectedDisplayName) {
			message.error("Please fill in all fields to calculate the summary.");
			return;
		}

		const hotel = allHotels.find((h) => h._id === selectedHotel);
		if (!hotel) {
			message.error("Invalid hotel selected.");
			return;
		}

		const room = hotel.roomCountDetails.find(
			(r) => `${r.displayName} | ${r.roomType}` === selectedDisplayName
		);
		if (!room) {
			message.error("Invalid room selected.");
			return;
		}

		const nights = dayjs(checkOutDate).diff(dayjs(checkInDate), "day");

		const pricingByDay = calculatePricingByDayWithCommission(
			room.pricingRate || [],
			checkInDate,
			checkOutDate,
			parseFloat(room.price.basePrice),
			parseFloat(room.defaultCost),
			parseFloat(room.roomCommission || hotel.commission || 10)
		);

		const totalAmount = pricingByDay.reduce(
			(sum, day) => sum + day.rootPrice,
			0
		);
		const totalPriceWithCommission = pricingByDay.reduce(
			(sum, day) => sum + day.totalPriceWithCommission,
			0
		);
		const totalCommission = totalPriceWithCommission - totalAmount;

		setSummary({
			hotelName: hotel.hotelName,
			roomType: room.roomType,
			displayName: room.displayName,
			nights,
			totalAmount,
			totalCommission,
			grandTotal: totalAmount + totalCommission,
			pricingBreakdown: pricingByDay,
		});
	};

	// RENDER: DatePickers vs. RangePicker
	//   On desktop: show RangePicker
	//   On mobile: show two separate DatePickers
	const renderDateControls = () => {
		if (isMobile) {
			// Two separate DatePickers for FROM and TO
			return (
				<MobileDateFields>
					<label style={{ display: "block", marginBottom: 4 }}>
						Check-in Date:
					</label>
					<DatePicker
						style={{ width: "100%", marginBottom: 12 }}
						format='YYYY-MM-DD'
						value={checkInDate}
						onChange={(val) => setCheckInDate(val)}
					/>
					<label style={{ display: "block", marginBottom: 4 }}>
						Check-out Date:
					</label>
					<DatePicker
						style={{ width: "100%" }}
						format='YYYY-MM-DD'
						value={checkOutDate}
						onChange={(val) => setCheckOutDate(val)}
					/>
				</MobileDateFields>
			);
		}

		// Desktop => one RangePicker
		return (
			<StyledRangePicker
				format='YYYY-MM-DD'
				onChange={(dates) => {
					setCheckInDate(dates ? dates[0] : null);
					setCheckOutDate(dates ? dates[1] : null);
				}}
			/>
		);
	};

	return (
		<ReservationCalculatorWrapper>
			{/* Left Form */}
			<FormWrapper>
				<h2>Reservation Calculator</h2>
				<div style={{ marginBottom: "20px" }}>
					<label>Check-in and Check-out Dates:</label>
					{renderDateControls()}
				</div>

				{checkInDate && checkOutDate && (
					<div style={{ marginBottom: "20px" }}>
						<label>Select Room Types:</label>
						<Select
							mode='multiple'
							placeholder='Select room types'
							style={{ width: "100%" }}
							onChange={(value) => setSelectedRoomTypes(value)}
						>
							{[
								...new Set(
									allHotels.flatMap((hotel) =>
										hotel.roomCountDetails.map((room) => room.roomType)
									)
								),
							].map((roomType) => (
								<Option key={roomType} value={roomType}>
									{roomType}
								</Option>
							))}
						</Select>
					</div>
				)}

				{selectedRoomTypes.length > 0 && (
					<div style={{ marginBottom: "20px" }}>
						<label>Select Hotel:</label>
						<Select
							placeholder='Select a hotel'
							style={{ width: "100%" }}
							onChange={(value) => setSelectedHotel(value)}
						>
							{filteredHotels.map((hotel) => (
								<Option key={hotel._id} value={hotel._id}>
									{hotel.hotelName}
								</Option>
							))}
						</Select>
					</div>
				)}

				{selectedHotel && displayNames.length > 0 && (
					<div style={{ marginBottom: "20px" }}>
						<label>Select Room Display Name:</label>
						<Select
							placeholder='Select a room'
							style={{ width: "100%" }}
							onChange={(value) => setSelectedDisplayName(value)}
						>
							{displayNames.map((displayName, index) => (
								<Option key={index} value={displayName}>
									{displayName}
								</Option>
							))}
						</Select>
					</div>
				)}
				{selectedDisplayName && (
					<Button type='primary' onClick={handleShowDetails}>
						Show Details
					</Button>
				)}

				{summary && (
					<SummaryWrapper>
						<h3>Summary for {summary.hotelName}</h3>
						<p>
							<strong>Room Type:</strong> {summary.roomType}
						</p>
						<p>
							<strong>Display Name:</strong> {summary.displayName}
						</p>
						<p>
							<strong>Number of Nights:</strong> {summary.nights}
						</p>
						<p>
							<strong>Average Price per Day:</strong>{" "}
							{(summary.grandTotal / summary.nights).toFixed(2)} SAR
						</p>
						<p>
							<strong>Total Amount:</strong> {summary.totalAmount.toFixed(2)}{" "}
							SAR
						</p>
						<p>
							<strong>Total Commission:</strong>{" "}
							{summary.totalCommission.toFixed(2)} SAR
						</p>
						<p>
							<strong>Grand Total:</strong> {summary.grandTotal.toFixed(2)} SAR
						</p>

						<Collapse>
							<Panel header='Pricing Breakdown' key='1'>
								<ul>
									{summary.pricingBreakdown.map((day, idx) => (
										<li key={idx}>
											<strong>{day.date}:</strong>{" "}
											{day.totalPriceWithCommission.toFixed(2)} SAR (Root Price:{" "}
											{day.rootPrice.toFixed(2)} SAR)
										</li>
									))}
								</ul>
							</Panel>
						</Collapse>
					</SummaryWrapper>
				)}
			</FormWrapper>

			{/* Right Child Component */}
			<ChildWrapper>
				{summary && (
					<EquivalentHotels
						checkInDate={checkInDate}
						checkOutDate={checkOutDate}
						selectedRoomTypes={selectedRoomTypes}
						selectedHotel={selectedHotel}
						allHotels={allHotels.filter((hotel) => hotel._id !== selectedHotel)}
					/>
				)}
			</ChildWrapper>
		</ReservationCalculatorWrapper>
	);
};

export default ReservationCalculator;

/* ----------------------------------------------------- */
/* ---------------------- STYLES ----------------------- */
/* ----------------------------------------------------- */

const ReservationCalculatorWrapper = styled.div`
	display: flex;

	h2 {
		font-size: 1.4rem;
		font-weight: bolder;
		text-transform: capitalize;
	}

	h3 {
		font-size: 1.1rem;
		font-weight: bolder;
		text-transform: capitalize;
	}

	p {
		font-size: 0.9rem;
		text-transform: capitalize;
	}

	@media (max-width: 768px) {
		/* On mobile, stack the form & child components vertically */
		flex-direction: column;
	}
`;

/* Left Container */
const FormWrapper = styled.div`
	flex: 0 0 31%;
	background: #f9f9f9;
	padding: 20px;
	border-radius: 8px;

	@media (max-width: 768px) {
		width: 100%;
		margin-bottom: 20px;
	}
`;

/* Right container */
const ChildWrapper = styled.div`
	flex: 0 0 69%;

	@media (max-width: 768px) {
		width: 100%;
	}
`;

const SummaryWrapper = styled.div`
	margin-top: 20px;
	padding: 10px;
	border: 1px solid #ddd;
	border-radius: 8px;
	background-color: #f9f9f9;

	h3 {
		margin-bottom: 10px;
	}
`;

/* This is the RangePicker for desktop usage only */
export const StyledRangePicker = styled(DatePicker.RangePicker)`
	width: 100%;
`;

/* 
  Two separate fields for mobile 
*/
const MobileDateFields = styled.div`
	margin-top: 8px;
`;
