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

	const calculateTotalAmountAndCommission = useCallback(
		(roomSelections, startDate, endDate) => {
			const start = dayjs(startDate).startOf("day");
			const end = dayjs(endDate).subtract(1, "day").startOf("day");
			const nights = end.diff(start, "day") + 1;

			const totals = roomSelections.reduce(
				(acc, { roomType, displayName, count }) => {
					const selectedRoom = chat.hotelId.roomCountDetails.find(
						(room) =>
							room.roomType === roomType && room.displayName === displayName
					);

					if (selectedRoom) {
						const dailyRate = selectedRoom.price.basePrice || 0;
						const defaultCost = selectedRoom.defaultCost || dailyRate;

						const commissionRate =
							selectedRoom.roomCommission ||
							chat.hotelId.commission ||
							parseFloat(process.env.REACT_APP_COMMISSIONRATE) ||
							0.1;

						const normalizedRate =
							commissionRate > 1 ? commissionRate / 100 : commissionRate;

						acc.total += dailyRate * count * nights;
						acc.commissionTotal +=
							defaultCost * normalizedRate * count * nights;
					}

					return acc;
				},
				{ total: 0, commissionTotal: 0 }
			);

			setNumberOfNights(nights);
			setTotalAmount(totals.total.toFixed(2));
			setTotalCommission(totals.commissionTotal.toFixed(2));
		},
		[chat.hotelId.roomCountDetails, chat.hotelId.commission]
	);

	useEffect(() => {
		if (checkInDate && checkOutDate && selectedRooms.length > 0) {
			calculateTotalAmountAndCommission(
				selectedRooms,
				checkInDate,
				checkOutDate
			);
		}
	}, [
		checkInDate,
		checkOutDate,
		selectedRooms,
		calculateTotalAmountAndCommission,
	]);

	const handleRoomSelectionChange = (value, index) => {
		const [roomType, displayName, basePrice] = value.split("|");
		const selectedRoom = chat.hotelId.roomCountDetails.find(
			(room) => room.roomType === roomType && room.displayName === displayName
		);
		const commissionRate =
			selectedRoom?.roomCommission ||
			chat.hotelId.commission ||
			parseFloat(process.env.REACT_APP_COMMISSIONRATE) ||
			0.1;

		const newSelection = [...selectedRooms];
		newSelection[index] = {
			...newSelection[index],
			roomType,
			displayName,
			pricePerNight: parseFloat(basePrice),
			commissionRate,
		};
		setSelectedRooms(newSelection);
	};

	const handleRoomCountChange = (count, index) => {
		const newSelection = [...selectedRooms];
		newSelection[index].count = count;
		setSelectedRooms(newSelection);
		if (checkInDate && checkOutDate) {
			calculateTotalAmountAndCommission(
				newSelection,
				checkInDate,
				checkOutDate
			);
		}
	};

	const addRoomSelection = () => {
		setSelectedRooms([
			...selectedRooms,
			{
				roomType: "",
				displayName: "",
				count: 1,
				pricePerNight: 0,
				commissionRate: 0,
			},
		]);
	};

	const removeRoomSelection = (index) => {
		const newSelection = [...selectedRooms];
		newSelection.splice(index, 1);
		setSelectedRooms(newSelection);
	};

	const clearAll = () => {
		setSelectedRooms([
			{ roomType: "", displayName: "", count: 1, commissionRate: 0 },
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
			queryParams.append(`roomType${index + 1}`, room.roomType);
			queryParams.append(`displayName${index + 1}`, room.displayName);
			queryParams.append(`roomCount${index + 1}`, room.count);
			queryParams.append(`pricePerNight${index + 1}`, room.pricePerNight);
			queryParams.append(`commissionRate${index + 1}`, room.commissionRate);
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
										? `${room.roomType}|${room.displayName}|${room.pricePerNight}`
										: undefined
								}
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
							/>
						</Form.Item>
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

				{/* Other form fields */}
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
							<strong>Total Commission: </strong>
							{totalCommission} SAR
						</p>
						<p>
							<strong>Total Amount After Taxes & Commission: </strong>
							{(Number(totalAmount) + Number(totalCommission)).toFixed(2)} SAR
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
