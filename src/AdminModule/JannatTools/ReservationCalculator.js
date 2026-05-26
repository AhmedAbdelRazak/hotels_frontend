import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { message, DatePicker, Select, Button, Collapse } from "antd";
import { isAuthenticated } from "../../auth";
import { gettingHotelDetailsForAdminAll } from "../apiAdmin";
import dayjs from "dayjs";
import EquivalentHotels from "./EquivalentHotels";

const { Option } = Select;
const { Panel } = Collapse;

const CALCULATOR_TEXT = {
	en: {
		title: "Reservation Calculator",
		checkDates: "Check-in and check-out dates:",
		checkIn: "Check-in date:",
		checkOut: "Check-out date:",
		roomTypes: "Select room types:",
		roomTypesPlaceholder: "Select room types",
		hotel: "Select hotel:",
		hotelPlaceholder: "Select a hotel",
		roomDisplayName: "Select room display name:",
		roomPlaceholder: "Select a room",
		showDetails: "Show Details",
		fillFields: "Please fill in all fields to calculate the summary.",
		invalidHotel: "Invalid hotel selected.",
		invalidRoom: "Invalid room selected.",
		summaryFor: "Summary for",
		roomType: "Room Type:",
		displayName: "Display Name:",
		nights: "Number of Nights:",
		averagePrice: "Average Price per Day:",
		totalAmount: "Total Amount:",
		totalCommission: "Total Commission:",
		grandTotal: "Grand Total:",
		pricingBreakdown: "Pricing Breakdown",
		rootPrice: "Root Price",
	},
	ar: {
		title: "حاسبة الحجوزات",
		checkDates: "تواريخ الوصول والمغادرة:",
		checkIn: "تاريخ الوصول:",
		checkOut: "تاريخ المغادرة:",
		roomTypes: "اختر أنواع الغرف:",
		roomTypesPlaceholder: "اختر أنواع الغرف",
		hotel: "اختر الفندق:",
		hotelPlaceholder: "اختر فندقًا",
		roomDisplayName: "اختر اسم الغرفة:",
		roomPlaceholder: "اختر غرفة",
		showDetails: "عرض التفاصيل",
		fillFields: "يرجى تعبئة كل الحقول لحساب الملخص.",
		invalidHotel: "الفندق المحدد غير صحيح.",
		invalidRoom: "الغرفة المحددة غير صحيحة.",
		summaryFor: "ملخص",
		roomType: "نوع الغرفة:",
		displayName: "اسم الغرفة:",
		nights: "عدد الليالي:",
		averagePrice: "متوسط السعر في الليلة:",
		totalAmount: "إجمالي التكلفة:",
		totalCommission: "إجمالي العمولة:",
		grandTotal: "الإجمالي:",
		pricingBreakdown: "تفاصيل التسعير",
		rootPrice: "التكلفة الأساسية",
	},
};

const ReservationCalculator = ({ chosenLanguage }) => {
	const isArabic = chosenLanguage === "Arabic";
	const TXT = CALCULATOR_TEXT[isArabic ? "ar" : "en"];
	const currency = isArabic ? "ر.س" : "SAR";
	// Detect if user is on mobile (<= 768px)
	const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

	const [allHotels, setAllHotels] = useState([]);
	const [checkInDate, setCheckInDate] = useState(null);
	const [checkOutDate, setCheckOutDate] = useState(null);
	const [selectedRoomTypes, setSelectedRoomTypes] = useState([]);
	const [filteredHotels, setFilteredHotels] = useState([]);
	const [selectedHotel, setSelectedHotel] = useState(null);
	const [displayNames, setDisplayNames] = useState([]);
	const [selectedDisplayName, setSelectedDisplayName] = useState(null);
	const [summary, setSummary] = useState(null);

	const { user, token } = isAuthenticated() || {};

	// Fetch all hotels
	const getAllHotels = useCallback(async () => {
		if (!user?._id || !token) return;
		try {
			const data = await gettingHotelDetailsForAdminAll(user._id, token);
			if (data && !data.error) {
				// Only keep hotels that are activateHotel === true
				const activeHotels =
					data.hotels &&
					data.hotels.filter((hotel) => hotel.activateHotel === true);
				// Sort them by hotelName
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
	}, [user?._id, token]);

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
			message.error(TXT.fillFields);
			return;
		}

		const hotel = allHotels.find((h) => h._id === selectedHotel);
		if (!hotel) {
			message.error(TXT.invalidHotel);
			return;
		}

		const room = hotel.roomCountDetails.find(
			(r) => `${r.displayName} | ${r.roomType}` === selectedDisplayName
		);
		if (!room) {
			message.error(TXT.invalidRoom);
			return;
		}

		const nights = dayjs(checkOutDate).diff(dayjs(checkInDate), "day");

		const pricingByDay = calculatePricingByDayWithCommission(
			room.pricingRate || [],
			checkInDate,
			checkOutDate,
			parseFloat(room.price.basePrice),
			parseFloat(room.defaultCost),
			parseFloat(room.roomCommission ?? hotel.commission ?? 10)
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
						{TXT.checkIn}
					</label>
					<DatePicker
						style={{ width: "100%", marginBottom: 12 }}
						format='YYYY-MM-DD'
						value={checkInDate}
						onChange={(val) => setCheckInDate(val)}
					/>
					<label style={{ display: "block", marginBottom: 4 }}>
						{TXT.checkOut}
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
				<h2>{TXT.title}</h2>
				<div style={{ marginBottom: "20px" }}>
					<label>{TXT.checkDates}</label>
					{renderDateControls()}
				</div>

				{checkInDate && checkOutDate && (
					<div style={{ marginBottom: "20px" }}>
						<label>{TXT.roomTypes}</label>
						<Select
							mode='multiple'
							placeholder={TXT.roomTypesPlaceholder}
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
						<label>{TXT.hotel}</label>
						<Select
							placeholder={TXT.hotelPlaceholder}
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
						<label>{TXT.roomDisplayName}</label>
						<Select
							placeholder={TXT.roomPlaceholder}
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
						{TXT.showDetails}
					</Button>
				)}

				{summary && (
					<SummaryWrapper>
						<h3>
							{TXT.summaryFor} {summary.hotelName}
						</h3>
						<p>
							<strong>{TXT.roomType}</strong> {summary.roomType}
						</p>
						<p>
							<strong>{TXT.displayName}</strong> {summary.displayName}
						</p>
						<p>
							<strong>{TXT.nights}</strong> {summary.nights}
						</p>
						<p>
							<strong>{TXT.averagePrice}</strong>{" "}
							{(summary.grandTotal / summary.nights).toFixed(2)} {currency}
						</p>
						<p>
							<strong>{TXT.totalAmount}</strong> {summary.totalAmount.toFixed(2)}{" "}
							{currency}
						</p>
						<p>
							<strong>{TXT.totalCommission}</strong>{" "}
							{summary.totalCommission.toFixed(2)} {currency}
						</p>
						<p>
							<strong>{TXT.grandTotal}</strong> {summary.grandTotal.toFixed(2)}{" "}
							{currency}
						</p>

						<Collapse>
							<Panel header={TXT.pricingBreakdown} key='1'>
								<ul>
									{summary.pricingBreakdown.map((day, idx) => (
										<li key={idx}>
											<strong>{day.date}:</strong>{" "}
											{day.totalPriceWithCommission.toFixed(2)} {currency} (
											{TXT.rootPrice}: {day.rootPrice.toFixed(2)} {currency})
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
						chosenLanguage={chosenLanguage}
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
	display: grid;
	grid-template-columns: minmax(285px, 380px) minmax(0, 1fr);
	gap: 16px;
	align-items: start;
	min-width: 0;

	h2 {
		margin: 0 0 14px;
		color: #0b3158;
		font-size: 1.18rem;
		font-weight: 950;
		line-height: 1.35;
		letter-spacing: 0;
	}

	h3 {
		font-size: 1.1rem;
		font-weight: 950;
		letter-spacing: 0;
	}

	p {
		font-size: 0.9rem;
		line-height: 1.7;
	}

	@media (max-width: 768px) {
		grid-template-columns: 1fr;
	}
`;

/* Left Container */
const FormWrapper = styled.div`
	min-width: 0;
	background: linear-gradient(180deg, #ffffff, #f6fbff);
	padding: 20px;
	border-radius: 8px;
	border: 1px solid rgba(139, 190, 227, 0.38);
	box-shadow: 0 10px 22px rgba(13, 49, 88, 0.08);

	label {
		display: block;
		margin-bottom: 7px;
		color: #173a5f;
		font-weight: 900;
	}

	@media (max-width: 768px) {
		width: 100%;
	}
`;

/* Right container */
const ChildWrapper = styled.div`
	min-width: 0;

	@media (max-width: 768px) {
		width: 100%;
	}
`;

const SummaryWrapper = styled.div`
	margin-top: 20px;
	padding: 13px;
	border: 1px solid rgba(139, 190, 227, 0.42);
	border-radius: 8px;
	background-color: #ffffff;
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.78);

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
