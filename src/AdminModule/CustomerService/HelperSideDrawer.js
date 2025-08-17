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
	Modal,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { countryListWithAbbreviations } from "./utils";
import { isAuthenticated } from "../../auth";
import { gettingHotelDetailsForAdminAll, updateSupportCase } from "../apiAdmin";
import socket from "../../socket";
import EditPricingModal from "./EditPricingModal";

const { RangePicker } = DatePicker;
const { Option } = Select;

const HelperSideDrawer = ({
	chat,
	onClose,
	visible,
	selectedCase,
	setSelectedCase,
	setSupportCases,
	agentName,
}) => {
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
	const [allHotels, setAllHotels] = useState([]);
	const [selectedHotel, setSelectedHotel] = useState(null);
	const [editingRoomIndex, setEditingRoomIndex] = useState(null); // Track which room is being edited
	const [isModalVisible, setIsModalVisible] = useState(false); // Modal visibility

	const { user, token } = isAuthenticated();

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

	const openModal = (roomIndex) => {
		setEditingRoomIndex(roomIndex);
		setIsModalVisible(true);
	};

	const closeModal = () => {
		setEditingRoomIndex(null);
		setIsModalVisible(false);
	};

	const handlePricingUpdate = (updatedPricingByDay) => {
		// Update the specific room's pricingByDay
		const updatedRooms = selectedRooms.map((room, index) =>
			index === editingRoomIndex
				? { ...room, pricingByDay: updatedPricingByDay }
				: room
		);

		// Update state with the modified rooms
		setSelectedRooms(updatedRooms);

		// Recalculate totals after the state is updated
		calculateTotals(updatedRooms);

		// Close the modal
		closeModal();
	};

	const getAllHotels = useCallback(async () => {
		try {
			const data = await gettingHotelDetailsForAdminAll(user._id, token);
			if (data && !data.error) {
				const sortedHotels = data.hotels.sort((a, b) =>
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

	// Handle fetching room details and initializing states
	const initializeDrawer = useCallback(() => {
		if (!chat || !chat.hotelId) return;

		const lastMessageByUser = chat.conversation?.find(
			(msg) => msg.messageBy?.userId === chat.conversation[0]?.messageBy?.userId
		);

		setName(lastMessageByUser?.messageBy?.customerName || "");
		setEmail(lastMessageByUser?.messageBy?.customerEmail || "");
		setSelectedRooms([{ roomType: "", displayName: "", count: 1 }]);
		setSelectedHotel(chat.hotelId);
	}, [chat]);

	// Sync drawer state with `chat` and fetch hotels
	useEffect(() => {
		if (visible) {
			getAllHotels();
			initializeDrawer();
		}
	}, [visible, getAllHotels, initializeDrawer]);

	const capitalize = (str) => {
		return str
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");
	};

	// Handle hotel change
	const handleHotelChange = useCallback(
		async (hotelId) => {
			const hotel = allHotels.find((h) => h._id === hotelId);

			Modal.confirm({
				title: "Are you sure?",
				content: `Are you sure you want to transfer the guest to ${hotel.hotelName}?`,
				okText: "Yes",
				cancelText: "No",
				onOk: async () => {
					setSelectedHotel(hotel);

					if (hotel) {
						try {
							// Update the support case with the new hotel
							await updateSupportCase(chat._id, { hotelId: hotel._id });
							message.success(`Guest transferred to ${hotel.hotelName}.`);

							// Emit socket event for hotel change
							socket.emit("hotelChanged", {
								caseId: chat._id,
								newHotel: hotel,
							});

							// Update the support cases in the parent state
							setSupportCases((prevCases) =>
								prevCases.map((supportCase) =>
									supportCase._id === chat._id
										? { ...supportCase, hotelId: hotel }
										: supportCase
								)
							);

							// Update the selected case in the parent state
							setSelectedCase((prevCase) => ({
								...prevCase,
								hotelId: hotel,
							}));

							// Send a system message to the guest
							const guestMessage = {
								messageBy: { customerName: "System" },
								message: `You've been transferred to ${capitalize(
									hotel.hotelName
								)} Hotel. Please wait 3 to 5 minutes for the reception to assist you.`,
								date: new Date(),
								caseId: chat._id,
								targetRole: "guest", // Message for guest
							};

							// Update the support case conversation with the new message
							await updateSupportCase(chat._id, { conversation: guestMessage });

							// Emit the system message via socket
							socket.emit("sendMessage", guestMessage);

							// Reset all inputs, including room selection
							const newRoomOptions = hotel.roomCountDetails || [];
							const newSelectedRooms = newRoomOptions.length
								? [{ roomType: "", displayName: "", count: 1 }]
								: [];
							setSelectedRooms(newSelectedRooms);

							// Reset other inputs
							setCheckInDate(null);
							setCheckOutDate(null);
							setTotalAmount(0);
							setTotalCommission(0);
						} catch (error) {
							console.error("Error transferring guest:", error);
							message.error("Failed to transfer guest.");
						}
					}
				},
			});
		},
		[allHotels, chat._id, setSupportCases, setSelectedCase]
	);

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
					: defaultCost;

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

			// Add total price with commission to each day
			return pricingByDay.map((day) => ({
				...day,
				totalPriceWithCommission:
					Number(day.price) +
					Number(day.rootPrice) * (Number(day.commissionRate) / 100), // Keep it as a number
			}));
		},
		[calculatePricingByDay]
	);

	// Calculate totals
	const calculateTotals = useCallback(
		(rooms = selectedRooms) => {
			if (!checkInDate || !checkOutDate || rooms.length === 0) return;

			const startDate = dayjs(checkInDate).startOf("day");
			const endDate = dayjs(checkOutDate).startOf("day");
			const nights = endDate.diff(startDate, "day");

			let totalAmount = 0;
			let totalCommission = 0;
			let totalPriceWithCommission = 0;

			// Flag to track whether `pricingByDay` has changed
			let hasChanges = false;

			// Map through each room and calculate totals
			const updatedRooms = rooms.map((room) => {
				// Only recalculate `pricingByDay` if it's not already present
				if (room.pricingByDay && room.pricingByDay.length > 0) {
					const roomTotalAmount = room.pricingByDay.reduce(
						(acc, day) => acc + day.rootPrice * room.count,
						0
					);
					const roomTotalPriceWithCommission = room.pricingByDay.reduce(
						(acc, day) => acc + day.totalPriceWithCommission * room.count,
						0
					);

					totalAmount += roomTotalAmount;
					totalPriceWithCommission += roomTotalPriceWithCommission;

					return room;
				}

				// Find the corresponding room details in the hotel data
				const matchedRoom = chat.hotelId.roomCountDetails.find(
					(r) =>
						r.roomType === room.roomType && r.displayName === room.displayName
				);

				if (matchedRoom) {
					// Calculate pricing breakdown for the selected date range
					const pricingByDay = calculatePricingByDayWithCommission(
						matchedRoom.pricingRate || [],
						startDate,
						endDate,
						parseFloat(matchedRoom.price?.basePrice) || 0,
						parseFloat(matchedRoom.defaultCost) || 0,
						parseFloat(
							matchedRoom.roomCommission || chat.hotelId.commission || 0.1
						)
					);

					// Check if `pricingByDay` has changed
					if (
						JSON.stringify(pricingByDay) !== JSON.stringify(room.pricingByDay)
					) {
						hasChanges = true;
					}

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

					return { ...room, pricingByDay };
				}

				return room;
			});

			totalCommission = totalPriceWithCommission - totalAmount;

			// Update state if there are changes
			if (hasChanges) {
				setSelectedRooms(updatedRooms);
			}
			setTotalAmount(Number(totalAmount.toFixed(2)));
			setTotalCommission(Number(totalCommission.toFixed(2)));
			setNumberOfNights(nights);
		},
		[
			checkInDate,
			checkOutDate,
			selectedRooms,
			calculatePricingByDayWithCommission,
			chat.hotelId.roomCountDetails,
			chat.hotelId.commission,
		]
	);

	useEffect(() => {
		calculateTotals();
		// Only trigger when the relevant state changes
	}, [checkInDate, checkOutDate, selectedRooms, calculateTotals]);

	// Handle room selection changes
	const handleRoomSelectionChange = (value, index) => {
		const [roomType, displayName] = value.split("|");
		const matchedRoom = chat.hotelId.roomCountDetails.find(
			(r) => r.roomType === roomType && r.displayName === displayName
		);

		if (!matchedRoom) {
			message.error(`No details found for room: ${displayName}`);
			return;
		}

		const pricingByDay = calculatePricingByDayWithCommission(
			matchedRoom.pricingRate || [],
			checkInDate,
			checkOutDate,
			parseFloat(matchedRoom.price?.basePrice),
			parseFloat(matchedRoom.defaultCost),
			parseFloat(matchedRoom.roomCommission || chat.hotelId.commission || 0.1)
		);

		console.log("Pricing by Day for Selected Room:", pricingByDay); // Debugging line

		const updatedRooms = [...selectedRooms];
		updatedRooms[index] = {
			...updatedRooms[index],
			roomType,
			displayName,
			pricingByDay,
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

		// Initialize query parameters with basic details
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

		// Iterate through selected rooms to add room-specific details
		selectedRooms.forEach((room, index) => {
			// Use the `pricingByDay` directly from the room if it exists and is up-to-date
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				const pricingBreakdown = room.pricingByDay.map(
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

				// Add room details to the query parameters
				queryParams.append(`roomType${index + 1}`, room.roomType);
				queryParams.append(`displayName${index + 1}`, room.displayName);
				queryParams.append(`roomCount${index + 1}`, room.count);
				queryParams.append(
					`pricingBreakdown${index + 1}`,
					encodeURIComponent(JSON.stringify(pricingBreakdown))
				);
			} else {
				console.warn(
					`Pricing breakdown for room "${room.displayName}" is missing or incomplete.`
				);
			}
		});

		// Generate the booking link
		const bookingLink = `${
			process.env.REACT_APP_MAIN_URL_JANNAT
		}/generated-link?${queryParams.toString()}`;

		// Set the generated link and notify the user
		setGeneratedLink(bookingLink);
		message.success("Link generated successfully!");

		// Optional: Log the link for debugging
		console.log("Generated Link:", bookingLink);
	};

	const getAvailableRoomOptions = () => {
		const selectedKeys = selectedRooms.map(
			(room) => `${room.roomType}|${room.displayName}`
		);
		return chat.hotelId.roomCountDetails.filter(
			(room) => !selectedKeys.includes(`${room.roomType}|${room.displayName}`)
		);
	};

	// Function to transfer guest to a selected hotel (new addition)

	// eslint-disable-next-line
	const transferGuestToHotel = async () => {
		if (!selectedHotel) {
			message.error("Please select a hotel to transfer the guest.");
			return;
		}

		try {
			// Update the support case with the new hotelId
			await updateSupportCase(chat._id, { hotelId: selectedHotel._id });
			message.success(
				`Support case successfully transferred to ${selectedHotel.hotelName}`
			);
			onClose(); // Close the drawer after successful transfer
		} catch (err) {
			console.error("Error transferring guest to hotel:", err);
			message.error("Failed to transfer the support case.");
		}
	};

	const handleSendEmail = async () => {
		if (!name || !email || !generatedLink) {
			message.error(
				"Please fill in all required fields before sending the email."
			);
			return;
		}

		try {
			if (!selectedRooms || selectedRooms.length === 0) {
				throw new Error("No rooms have been selected.");
			}

			selectedRooms.forEach((room, index) => {
				if (!room.pricingByDay || room.pricingByDay.length === 0) {
					console.error(
						`Room at index ${index} has missing pricingByDay:`,
						room
					); // Debugging line
					throw new Error(
						`Pricing details are missing for room: ${room.displayName}`
					);
				}
			});

			// Calculate totals
			const totalAmountWithCommission = selectedRooms.reduce((total, room) => {
				return (
					total +
					room.pricingByDay.reduce(
						(subTotal, day) => subTotal + day.totalPriceWithCommission,
						0
					) *
						room.count
				);
			}, 0);

			const totalRootPrice = selectedRooms.reduce((total, room) => {
				return (
					total +
					room.pricingByDay.reduce(
						(subTotal, day) => subTotal + day.rootPrice,
						0
					) *
						room.count
				);
			}, 0);

			const totalCommission = totalAmountWithCommission - totalRootPrice;
			const depositPercentage = Number(
				(totalCommission / totalAmountWithCommission) * 100
			).toFixed(0);
			const depositAmount = totalCommission;

			// Email payload
			const emailPayload = {
				hotelName: selectedHotel.hotelName,
				name,
				email,
				phone,
				nationality,
				checkInDate: checkInDate.format("YYYY-MM-DD"),
				checkOutDate: checkOutDate.format("YYYY-MM-DD"),
				numberOfNights,
				adults,
				children,
				totalAmount: Number(totalAmountWithCommission.toFixed(2)),
				totalCommission: Number(totalCommission.toFixed(2)),
				depositPercentage: depositPercentage,
				depositAmount: Number(depositAmount.toFixed(2)),
				generatedLink,
				selectedRooms: selectedRooms.map((room) => ({
					roomType: room.roomType,
					displayName: room.displayName,
					count: room.count,
					pricingByDay: room.pricingByDay.map((day) => ({
						date: day.date,
						price: Number(day.price).toFixed(2),
						rootPrice: Number(day.rootPrice).toFixed(2),
						commissionRate: Number(day.commissionRate).toFixed(2),
						totalPriceWithCommission: Number(
							day.totalPriceWithCommission
						).toFixed(2),
					})),
				})),
				agentName,
			};

			console.log("Email Payload:", emailPayload); // Debugging line

			// Send email
			const response = await fetch(
				`${process.env.REACT_APP_API_URL}/send-payment-link-email/${user._id}`,
				{
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(emailPayload),
				}
			);

			const result = await response.json();
			if (response.ok) {
				message.success("Email sent successfully!");
			} else {
				message.error(result.error || "Failed to send email.");
			}
		} catch (error) {
			console.error(
				"Error during email preparation or sending:",
				error.message
			);
			message.error(
				error.message || "An error occurred while sending the email."
			);
		}
	};

	return (
		<Drawer
			title='Generate Booking Link'
			placement='right'
			onClose={onClose}
			open={visible}
			width={700}
		>
			<Form layout='vertical'>
				<EditPricingModal
					visible={isModalVisible}
					onClose={closeModal}
					pricingByDay={selectedRooms[editingRoomIndex]?.pricingByDay || []}
					onUpdate={handlePricingUpdate}
					roomDetails={selectedRooms[editingRoomIndex]} // Optional, if you want to show room details
				/>
				<Button
					type='primary'
					danger
					onClick={clearAll}
					style={{ marginBottom: 20 }}
				>
					Clear All
				</Button>
				<>
					<Form.Item label='Select Hotel'>
						<Select
							placeholder='Select a hotel'
							value={selectedHotel?._id}
							onChange={handleHotelChange}
							style={{ textTransform: "capitalize" }}
						>
							{allHotels.map((hotel) => (
								<Option
									key={hotel._id}
									value={hotel._id}
									style={{ textTransform: "capitalize" }}
								>
									{hotel.hotelName}
								</Option>
							))}
						</Select>
					</Form.Item>
				</>
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
				{checkInDate && checkOutDate && (
					<>
						{selectedRooms.map((room, index) => (
							<div key={index} style={{ marginBottom: 20 }}>
								<Form.Item label={`Room Type ${index + 1}`}>
									<Select
										value={
											room.roomType
												? `${room.roomType}|${room.displayName}`
												: undefined
										}
										onChange={(value) =>
											handleRoomSelectionChange(value, index)
										}
										placeholder='Select Room Type'
									>
										{getAvailableRoomOptions().map((roomDetail, idx) => (
											<Option
												key={idx}
												value={`${roomDetail.roomType}|${roomDetail.displayName}`}
											>
												{roomDetail.displayName} ({roomDetail.roomType})
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
													{day.date}: {day.totalPriceWithCommission.toFixed(2)}{" "}
													SAR
												</li>
											))}
											<Button
												type='link'
												onClick={() => openModal(index)} // Open modal for editing
												style={{
													fontSize: "1rem",
													fontWeight: "bold",
													textDecoration: "underline",
												}}
											>
												<EditOutlined /> Edit Pricing
											</Button>
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
					</>
				)}

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

				<Form.Item>
					<Button
						type='primary'
						onClick={handleSendEmail}
						disabled={
							!generatedLink ||
							!name ||
							!email ||
							selectedRooms.some(
								(room) => !room.pricingByDay || room.pricingByDay.length === 0
							)
						}
						style={{ marginTop: 20 }}
					>
						Send Email
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
