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

const { RangePicker } = DatePicker;
const { Option } = Select;

const HelperSideDrawer = ({ chat, onClose, visible }) => {
	const [selectedRooms, setSelectedRooms] = useState([]);
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

	const calculateTotalAmount = useCallback(
		(roomSelections, startDate, endDate) => {
			const start = dayjs(startDate).startOf("day");
			const end = dayjs(endDate).subtract(1, "day").startOf("day");
			let currentDate = start;
			let total = 0;
			let nights = 0;

			while (currentDate.isBefore(end) || currentDate.isSame(end, "day")) {
				const formattedDate = currentDate.format("YYYY-MM-DD");
				// eslint-disable-next-line
				roomSelections.forEach(({ roomType, displayName, count }) => {
					const selectedRoom = chat.hotelId.roomCountDetails.find(
						(room) =>
							room.roomType === roomType && room.displayName === displayName
					);
					if (selectedRoom) {
						const rateForDate = selectedRoom.pricingRate.find(
							(rate) =>
								dayjs(rate.calendarDate).format("YYYY-MM-DD") === formattedDate
						);
						const dailyRate = rateForDate
							? parseFloat(rateForDate.price)
							: selectedRoom.price.basePrice;
						total += dailyRate * count;
					}
				});
				nights++;
				currentDate = currentDate.add(1, "day");
			}

			setNumberOfNights(nights);
			setTotalAmount(total);
		},
		[chat.hotelId.roomCountDetails]
	);

	useEffect(() => {
		if (checkInDate && checkOutDate && selectedRooms.length > 0) {
			calculateTotalAmount(selectedRooms, checkInDate, checkOutDate);
		}
	}, [checkInDate, checkOutDate, selectedRooms, calculateTotalAmount]);

	const handleRoomSelectionChange = (value, index) => {
		const [roomType, displayName, basePrice] = value.split("|");
		const newSelection = [...selectedRooms];
		newSelection[index] = {
			...newSelection[index],
			roomType,
			displayName,
			pricePerNight: parseFloat(basePrice),
		};
		setSelectedRooms(newSelection);
	};

	const handleRoomCountChange = (count, index) => {
		const newSelection = [...selectedRooms];
		newSelection[index].count = count;
		setSelectedRooms(newSelection);
		if (checkInDate && checkOutDate) {
			calculateTotalAmount(newSelection, checkInDate, checkOutDate);
		}
	};

	const addRoomSelection = () => {
		setSelectedRooms([
			...selectedRooms,
			{ roomType: "", displayName: "", count: 1, pricePerNight: 0 },
		]);
	};

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
			adults,
			children,
			nationality,
			phone,
		});

		selectedRooms.forEach((room, index) => {
			queryParams.append(`roomType${index + 1}`, room.roomType);
			queryParams.append(`displayName${index + 1}`, room.displayName);
			queryParams.append(`roomCount${index + 1}`, room.count);
			queryParams.append(`pricePerNight${index + 1}`, room.pricePerNight);
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
				{selectedRooms.map((room, index) => (
					<div key={index} style={{ marginBottom: 20 }}>
						<Form.Item label={`Room Type ${index + 1}`}>
							<Select
								value={`${room.roomType}|${room.displayName}|${room.pricePerNight}`}
								onChange={(value) => handleRoomSelectionChange(value, index)}
								placeholder='Select Room Type'
							>
								{getAvailableRoomOptions().map((roomDetail, idx) => (
									<Option
										key={idx}
										value={`${roomDetail.roomType}|${roomDetail.displayName}|${roomDetail.price.basePrice}`}
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
								placeholder='Enter count'
							/>
						</Form.Item>
					</div>
				))}

				<Button
					type='dashed'
					onClick={addRoomSelection}
					style={{ marginBottom: 20 }}
				>
					Add Another Room
				</Button>

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
							<strong>Total Amount: </strong>
							{totalAmount} SAR
						</p>
						<p>
							<strong>Number of Nights: </strong>
							{numberOfNights}
						</p>
					</Form.Item>
				)}
			</Form>
		</Drawer>
	);
};

export default HelperSideDrawer;
