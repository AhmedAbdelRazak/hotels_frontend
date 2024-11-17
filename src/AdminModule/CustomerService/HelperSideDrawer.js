import React, { useState, useEffect } from "react";
import { Drawer, Form, Input, Button, Select, DatePicker, message } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;

const HelperSideDrawer = ({ chat, onClose, visible }) => {
	const [roomType, setRoomType] = useState("");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [checkInDate, setCheckInDate] = useState(null);
	const [checkOutDate, setCheckOutDate] = useState(null);
	const [adults, setAdults] = useState(1);
	const [children, setChildren] = useState(0);
	const [nationality, setNationality] = useState("");
	const [phone, setPhone] = useState("");
	const [generatedLink, setGeneratedLink] = useState("");
	const [pricePerNight, setPricePerNight] = useState(0);
	const [numberOfNights, setNumberOfNights] = useState(0);
	const [totalAmount, setTotalAmount] = useState(0);

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

	const calculateTotalAmount = (pricingRate, startDate, endDate, basePrice) => {
		const start = dayjs(startDate).startOf("day");
		const end = dayjs(endDate).subtract(1, "day").startOf("day");
		let currentDate = start;
		let total = 0;
		let nights = 0;

		while (currentDate.isBefore(end) || currentDate.isSame(end, "day")) {
			const formattedDate = currentDate.format("YYYY-MM-DD");
			const rateForDate = pricingRate.find(
				(rate) =>
					dayjs(rate.calendarDate).format("YYYY-MM-DD") === formattedDate
			);

			total += rateForDate ? parseFloat(rateForDate.price) : basePrice;
			nights++;
			currentDate = currentDate.add(1, "day");
		}

		setNumberOfNights(nights);
		setTotalAmount(total);
	};

	useEffect(() => {
		if (checkInDate && checkOutDate && roomType) {
			const selectedRoom = chat.hotelId.roomCountDetails.find(
				(room) => room.roomType === roomType
			);
			if (selectedRoom) {
				const basePrice = selectedRoom.price.basePrice;
				calculateTotalAmount(
					selectedRoom.pricingRate,
					checkInDate,
					checkOutDate,
					basePrice
				);
			}
		}
	}, [checkInDate, checkOutDate, roomType, chat.hotelId.roomCountDetails]);

	const handleRoomTypeChange = (value) => {
		setRoomType(value);
		const selectedRoom = chat.hotelId.roomCountDetails.find(
			(room) => room.roomType === value
		);
		if (selectedRoom) {
			setPricePerNight(selectedRoom.price.basePrice);
		}
	};

	const handleGenerateLink = () => {
		if (
			!roomType ||
			!checkInDate ||
			!checkOutDate ||
			!name ||
			!email ||
			!phone
		) {
			message.error("Please fill in all the required fields.");
			return;
		}

		const selectedRoom = chat.hotelId.roomCountDetails.find(
			(room) => room.roomType === roomType
		);
		const displayName = selectedRoom ? selectedRoom.displayName : "N/A";
		const hotelId = chat.hotelId._id;

		const queryParams = new URLSearchParams({
			roomType,
			displayName,
			hotelId,
			name,
			email,
			checkInDate: checkInDate.format("YYYY-MM-DD"),
			checkOutDate: checkOutDate.format("YYYY-MM-DD"),
			pricePerNight,
			numberOfNights,
			totalAmount,
			adults,
			children,
			nationality,
			phone,
		});

		const bookingLink = `${
			process.env.REACT_APP_MAIN_URL_JANNAT
		}/generated-link?${queryParams.toString()}`;

		setGeneratedLink(bookingLink);
		message.success("Link generated successfully!");
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
				<Form.Item label='Room Type'>
					<Select
						value={roomType}
						onChange={handleRoomTypeChange}
						placeholder='Select Room Type'
					>
						{chat.hotelId &&
						chat.hotelId.roomCountDetails &&
						chat.hotelId.roomCountDetails.length > 0 ? (
							chat.hotelId.roomCountDetails.map((room, index) => (
								<Option key={index} value={room.roomType}>
									{room.displayName}
								</Option>
							))
						) : (
							<Option disabled>No room details available</Option>
						)}
					</Select>
				</Form.Item>

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
					<Input
						value={nationality}
						onChange={(e) => setNationality(e.target.value)}
						placeholder='Nationality'
					/>
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

				{generatedLink && (
					<Form.Item>
						<p>
							<strong>Generated Link: </strong>
							<a href={generatedLink} target='_blank' rel='noopener noreferrer'>
								{generatedLink}
							</a>
						</p>
						<p>
							<strong>Price per Night: </strong>
							{pricePerNight} SAR
						</p>
						<p>
							<strong>Number of Nights: </strong>
							{numberOfNights}
						</p>
						<p>
							<strong>Total Amount: </strong>
							{totalAmount} SAR
						</p>
					</Form.Item>
				)}
			</Form>
		</Drawer>
	);
};

export default HelperSideDrawer;
