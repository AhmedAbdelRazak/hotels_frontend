import React, { useState, useEffect, useCallback } from "react";
import {
	Drawer,
	Form,
	Input,
	Button,
	Select,
	DatePicker,
	message,
	InputNumber,
} from "antd";
import dayjs from "dayjs";
import { countryListWithAbbreviations } from "./utils";

const { RangePicker } = DatePicker;
const { Option } = Select;

const HelperSideDrawer = ({ chat, onClose, visible }) => {
	const [selectedRooms, setSelectedRooms] = useState([
		{ roomType: "", displayName: "", count: 1, commissionRate: 0 },
	]);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [checkInDate, setCheckInDate] = useState(null);
	const [checkOutDate, setCheckOutDate] = useState(null);
	const [adults, setAdults] = useState(1);
	const [children, setChildren] = useState(0);
	const [nationality, setNationality] = useState("");
	const [phone, setPhone] = useState("");
	const [generatedLink, setGeneratedLink] = useState("");
	const [totalAmount, setTotalAmount] = useState(0);
	const [totalCommission, setTotalCommission] = useState(0);
	const [numberOfNights, setNumberOfNights] = useState(0);

	useEffect(() => {
		if (chat && chat.conversation.length > 0) {
			const lastMessageByUser = chat.conversation.find(
				(msg) => msg.messageBy.userId === chat.conversation[0].messageBy.userId
			);
			if (lastMessageByUser) {
				setName(lastMessageByUser.messageBy.customerName);
				setEmail(lastMessageByUser.messageBy.customerEmail);
			}
		}
	}, [chat]);

	// Calculate pricing by day with commission
	const safeParseFloat = (value, fallback = 0) => {
		const parsed = parseFloat(value);
		return isNaN(parsed) ? fallback : parsed;
	};

	// Calculate pricing by day
	const calculatePricingByDay = useCallback(
		(
			pricingRate,
			startDate,
			endDate,
			basePrice,
			defaultCost,
			commissionRate
		) => {
			console.log("Calculating pricing by day...");
			console.log("Start date:", startDate);
			console.log("End date:", endDate);

			const start = dayjs(startDate).startOf("day");
			const end = dayjs(endDate).subtract(1, "day").startOf("day");

			const dateArray = [];
			let currentDate = start;

			while (currentDate.isBefore(end) || currentDate.isSame(end, "day")) {
				const formattedDate = currentDate.format("YYYY-MM-DD");

				// Find rate for the current date
				const rateForDate = pricingRate.find(
					(rate) => rate.calendarDate === formattedDate
				);

				// Fallback handling for price, rootPrice, and commissionRate
				const price = rateForDate
					? safeParseFloat(rateForDate.price, basePrice)
					: basePrice;

				const rootPrice = rateForDate
					? safeParseFloat(rateForDate.rootPrice, defaultCost)
					: defaultCost;

				// Ensure commissionRate has a fallback
				const rateCommission = rateForDate
					? safeParseFloat(rateForDate.commissionRate, commissionRate)
					: commissionRate;

				console.log(
					`Date: ${formattedDate}, Price: ${price}, RootPrice: ${rootPrice}, CommissionRate: ${rateCommission}`
				);

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

	// Calculate pricing by day with commission
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

			console.log("Pricing by day:", pricingByDay);

			return pricingByDay.map((day) => {
				const totalPriceWithCommission = Number(
					(
						Number(day.price) +
						Number(day.rootPrice) * (Number(day.commissionRate) / 100)
					).toFixed(2)
				);

				console.log(
					`Date: ${day.date}, TotalPriceWithCommission: ${totalPriceWithCommission}`
				);

				return {
					...day,
					totalPriceWithCommission,
					totalPriceWithoutCommission: Number(day.price),
				};
			});
		},
		[calculatePricingByDay]
	);

	// Calculate totals
	const calculateTotals = useCallback(() => {
		if (!checkInDate || !checkOutDate || selectedRooms.length === 0) return;

		const startDate = dayjs(checkInDate).startOf("day");
		const endDate = dayjs(checkOutDate).startOf("day");
		const nights = endDate.diff(startDate, "day");

		let totalAmount = 0;
		let totalCommission = 0;
		let totalPriceWithCommission = 0;

		selectedRooms.forEach((room) => {
			const matchedRoom = chat.hotelId.roomCountDetails.find(
				(r) =>
					r.roomType === room.roomType && r.displayName === room.displayName
			);

			if (matchedRoom) {
				const pricingByDay = calculatePricingByDayWithCommission(
					matchedRoom.pricingRate || [],
					startDate,
					endDate,
					parseFloat(matchedRoom.price?.basePrice),
					parseFloat(matchedRoom.defaultCost),
					parseFloat(
						matchedRoom.roomCommission || chat.hotelId.commission || 0.1
					)
				);

				const roomTotalAmount = pricingByDay.reduce(
					(acc, day) => acc + day.rootPrice * room.count,
					0
				);
				const roomTotalPriceWithCommission = pricingByDay.reduce(
					(acc, day) => acc + day.totalPriceWithCommission * room.count,
					0
				);

				totalAmount += roomTotalAmount;
				totalPriceWithCommission += roomTotalPriceWithCommission;
			}
		});

		totalCommission = totalPriceWithCommission - totalAmount;

		setTotalAmount(totalAmount.toFixed(2));
		setTotalCommission(totalCommission.toFixed(2));
		setNumberOfNights(nights);
	}, [
		checkInDate,
		checkOutDate,
		selectedRooms,
		calculatePricingByDayWithCommission,
		chat.hotelId.roomCountDetails,
		chat.hotelId.commission,
	]);

	useEffect(() => {
		calculateTotals();
	}, [calculateTotals]);

	// Handle room selection changes
	const handleRoomSelectionChange = (value, index) => {
		const [roomType, displayName] = value.split("|");
		const matchedRoom = chat.hotelId.roomCountDetails.find(
			(r) => r.roomType === roomType && r.displayName === displayName
		);

		const updatedRooms = [...selectedRooms];
		updatedRooms[index] = {
			...updatedRooms[index],
			roomType,
			displayName,
			commissionRate:
				matchedRoom?.roomCommission || chat.hotelId.commission || 0.1,
		};
		setSelectedRooms(updatedRooms);
	};

	const handleRoomCountChange = (count, index) => {
		const updatedRooms = [...selectedRooms];
		updatedRooms[index].count = count;
		setSelectedRooms(updatedRooms);
		calculateTotals();
	};

	const addRoomSelection = () => {
		setSelectedRooms([
			...selectedRooms,
			{ roomType: "", displayName: "", count: 1, commissionRate: 0 },
		]);
	};

	const removeRoomSelection = (index) => {
		const updatedRooms = [...selectedRooms];
		updatedRooms.splice(index, 1);
		setSelectedRooms(updatedRooms);
		calculateTotals();
	};

	const clearAll = () => {
		setSelectedRooms([
			{
				roomType: "",
				displayName: "",
				count: 1,
				commissionRate: 0,
			},
		]);
		setName("");
		setEmail("");
		setCheckInDate(null);
		setCheckOutDate(null);
		setAdults(1);
		setChildren(0);
		setNationality("");
		setPhone("");
		setGeneratedLink("");
		setTotalAmount(0);
		setTotalCommission(0);
		setNumberOfNights(0);
	};

	// Handle link generation
	const handleGenerateLink = () => {
		if (
			selectedRooms.some(
				(room) => !room.roomType || !room.displayName || room.count < 1
			) ||
			!checkInDate ||
			!checkOutDate ||
			!name ||
			!email ||
			!phone
		) {
			message.error("Please fill in all the required fields.");
			return;
		}

		const queryParams = new URLSearchParams({
			hotelId: chat.hotelId._id,
			name,
			email,
			checkInDate: checkInDate.format("YYYY-MM-DD"),
			checkOutDate: checkOutDate.format("YYYY-MM-DD"),
			numberOfNights,
			totalAmount,
			totalCommission,
			adults,
			children,
			nationality,
			phone,
		});

		selectedRooms.forEach((room, index) => {
			// Ensure matchedRoom is scoped properly within the loop
			const matchedRoom = chat.hotelId.roomCountDetails.find(
				(r) =>
					r.roomType === room.roomType && r.displayName === room.displayName
			);

			if (matchedRoom) {
				const pricingByDay = calculatePricingByDayWithCommission(
					matchedRoom.pricingRate || [],
					checkInDate,
					checkOutDate,
					parseFloat(matchedRoom.price?.basePrice),
					parseFloat(matchedRoom.defaultCost),
					parseFloat(
						matchedRoom.roomCommission || chat.hotelId.commission || 0.1
					)
				);

				// Adding structured breakdown data to the link
				const pricingBreakdown = pricingByDay.map(
					({
						date,
						price,
						rootPrice,
						commissionRate,
						totalPriceWithCommission,
					}) => ({
						date,
						price: Number(price).toFixed(2),
						rootPrice: Number(rootPrice).toFixed(2),
						commissionRate: Number(commissionRate).toFixed(2),
						totalPriceWithCommission: Number(totalPriceWithCommission).toFixed(
							2
						),
					})
				);

				queryParams.append(`roomType${index + 1}`, room.roomType);
				queryParams.append(`displayName${index + 1}`, room.displayName);
				queryParams.append(`roomCount${index + 1}`, room.count);
				queryParams.append(
					`pricingBreakdown${index + 1}`,
					encodeURIComponent(JSON.stringify(pricingBreakdown))
				);
			} else {
				console.warn(
					`Room type ${room.roomType} with display name ${room.displayName} not found in roomCountDetails.`
				);
			}
		});

		const bookingLink = `${
			process.env.REACT_APP_MAIN_URL_JANNAT
		}/generated-link?${queryParams.toString()}`;
		setGeneratedLink(bookingLink);
		message.success("Link generated successfully!");
	};

	const getAvailableRoomOptions = () => {
		const selectedKeys = selectedRooms.map(
			(room) => `${room.roomType}|${room.displayName}`
		);
		return chat.hotelId.roomCountDetails.filter(
			(room) => !selectedKeys.includes(`${room.roomType}|${room.displayName}`)
		);
	};

	return (
		<Drawer
			title='Generate Booking Link'
			placement='right'
			onClose={onClose}
			open={visible}
			width={500}
		>
			<Form layout='vertical'>
				<Button
					type='primary'
					danger
					onClick={clearAll}
					style={{ marginBottom: 20 }}
				>
					Clear All
				</Button>
				{selectedRooms.map((room, index) => (
					<div key={index} style={{ marginBottom: 20 }}>
						<Form.Item label={`Room Type ${index + 1}`}>
							<Select
								value={
									room.roomType
										? `${room.roomType}|${room.displayName}`
										: undefined
								}
								onChange={(value) => handleRoomSelectionChange(value, index)}
								placeholder='Select Room Type'
							>
								{getAvailableRoomOptions().map((roomDetail, idx) => (
									<Option
										key={idx}
										value={`${roomDetail.roomType}|${roomDetail.displayName}`}
									>
										{roomDetail.displayName} ({roomDetail.roomType}) -{" "}
										{roomDetail.price.basePrice} SAR/night
									</Option>
								))}
							</Select>
						</Form.Item>
						<Form.Item label='Count'>
							<InputNumber
								min={1}
								value={room.count}
								onChange={(count) => handleRoomCountChange(count, index)}
							/>
						</Form.Item>
						{/* Optional Pricing Breakdown */}
						{room.pricingByDay && (
							<Form.Item label='Pricing Breakdown'>
								<ul style={{ paddingLeft: "20px" }}>
									{room.pricingByDay.map((day, i) => (
										<li key={i}>
											{day.date}: {day.totalPriceWithCommission.toFixed(2)} SAR
										</li>
									))}
								</ul>
							</Form.Item>
						)}
						{index > 0 && (
							<Button
								type='link'
								danger
								onClick={() => removeRoomSelection(index)}
							>
								Remove
							</Button>
						)}
					</div>
				))}
				<Button
					type='dashed'
					onClick={addRoomSelection}
					disabled={
						selectedRooms[selectedRooms.length - 1]?.roomType === "" ||
						selectedRooms[selectedRooms.length - 1]?.displayName === ""
					}
					style={{ marginBottom: 20 }}
				>
					Add Another Room
				</Button>

				{/* Other Form Fields */}
				<Form.Item label='Name'>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder='Full Name'
					/>
				</Form.Item>
				<Form.Item label='Email'>
					<Input
						type='email'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder='Email'
					/>
				</Form.Item>
				<Form.Item label='Check-in and Check-out Dates'>
					<RangePicker
						format='YYYY-MM-DD'
						value={[checkInDate, checkOutDate]}
						onChange={(dates) => {
							setCheckInDate(dates ? dates[0] : null);
							setCheckOutDate(dates ? dates[1] : null);
						}}
						disabledDate={(current) =>
							current && current < dayjs().endOf("day")
						}
					/>
				</Form.Item>
				<Form.Item label='Number of Adults'>
					<Input
						type='number'
						min={1}
						value={adults}
						onChange={(e) => setAdults(Number(e.target.value))}
					/>
				</Form.Item>
				<Form.Item label='Number of Children'>
					<Input
						type='number'
						min={0}
						value={children}
						onChange={(e) => setChildren(Number(e.target.value))}
					/>
				</Form.Item>
				<Form.Item label='Nationality'>
					<Select
						showSearch
						placeholder='Select Nationality'
						optionFilterProp='children'
						filterOption={(input, option) =>
							option.children.toLowerCase().includes(input.toLowerCase())
						}
						value={nationality}
						onChange={(value) => setNationality(value)} // Set country code as nationality
						style={{ width: "100%" }}
					>
						{countryListWithAbbreviations.map((country) => (
							<Option key={country.code} value={country.code}>
								{country.name}
							</Option>
						))}
					</Select>
				</Form.Item>
				<Form.Item label='Phone Number'>
					<Input
						type='tel'
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						placeholder='Phone Number'
					/>
				</Form.Item>
				<Form.Item>
					<Button type='primary' onClick={handleGenerateLink}>
						Generate Link
					</Button>
				</Form.Item>

				{/* Generated Link and Totals */}
				{generatedLink && (
					<Form.Item>
						<p>
							<strong>Generated Link: </strong>
							<a href={generatedLink} target='_blank' rel='noopener noreferrer'>
								{generatedLink}
							</a>
						</p>
						<p>
							<strong>Total Amount (For the Hotel): </strong>
							{Number(totalAmount).toFixed(2)} SAR
						</p>
						<p>
							<strong>Total Commission: </strong>
							{Number(totalCommission).toFixed(2)} SAR
						</p>
						<p>
							<strong>Grand Total (Including Commission): </strong>
							{(Number(totalAmount) + Number(totalCommission)).toFixed(2)} SAR
						</p>
						<p>
							<strong>Average Price Per Night: </strong>
							{Number(
								(Number(totalAmount) + Number(totalCommission)).toFixed(2) /
									numberOfNights
							).toFixed(2)}{" "}
							SAR
						</p>
						<p>
							<strong>Number of Nights: </strong>
							{numberOfNights}
						</p>

						{/* Pricing Breakdown */}
						{selectedRooms.map((room, index) => (
							<div key={index} style={{ marginTop: "10px" }}>
								<h4>
									Room {index + 1}: {room.displayName}
								</h4>
								<ul style={{ paddingLeft: "20px" }}>
									{room.pricingByDay &&
										room.pricingByDay.map(
											({ date, totalPriceWithCommission, rootPrice }, idx) => (
												<li key={idx}>
													<strong>{date}: </strong>
													{Number(totalPriceWithCommission).toFixed(2)} SAR
													(Root Price: {rootPrice} SAR)
												</li>
											)
										)}
								</ul>
							</div>
						))}
					</Form.Item>
				)}
			</Form>
		</Drawer>
	);
};

export default HelperSideDrawer;
