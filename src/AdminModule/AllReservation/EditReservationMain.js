import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	Form,
	Input,
	Button,
	Select,
	DatePicker,
	message,
	InputNumber,
	Modal,
	Checkbox,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { countryListWithAbbreviations } from "../CustomerService/utils";
import { isAuthenticated } from "../../auth";
import {
	gettingHotelDetailsForAdmin,
	updateSingleReservation,
} from "../apiAdmin";
import EditPricingModal from "../JannatTools/EditPricingModal";
import MoreDetails from "../AllReservation/MoreDetails";

const { RangePicker } = DatePicker;
const { Option } = Select;

const EditReservationMain = ({
	reservation,
	setReservation,
	chosenLanguage,
	hotelDetails,
}) => {
	const [selectedRooms, setSelectedRooms] = useState([
		{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
	]);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [checkInDate, setCheckInDate] = useState(null);
	const [checkOutDate, setCheckOutDate] = useState(null);
	const [adults, setAdults] = useState(1);
	const [children, setChildren] = useState(0);
	const [nationality, setNationality] = useState("");
	const [agentName, setAgentName] = useState("");
	const [phone, setPhone] = useState("");
	const [comment, setComment] = useState("");
	const [totalAmount, setTotalAmount] = useState(0);
	const [totalCommission, setTotalCommission] = useState(0);
	const [numberOfNights, setNumberOfNights] = useState(0);
	const [allHotels, setAllHotels] = useState([]);
	const [selectedHotel, setSelectedHotel] = useState(null);
	const [editingRoomIndex, setEditingRoomIndex] = useState(null); // Track which room is being edited
	const [isModalVisible, setIsModalVisible] = useState(false); // Modal visibility
	const [isModalVisible2, setIsModalVisible2] = useState(false); // Modal visibility
	const [reservationCreated, setReservationCreated] = useState(false); // Modal visibility
	const [selectedReservation, setSelectedReservation] = useState(""); // Modal visibility
	const [sendEmail, setSendEmail] = useState(true);

	const { user, token } = isAuthenticated();

	// Prepopulate fields when reservation data is passed
	useEffect(() => {
		if (reservation) {
			setName(reservation.customer_details?.name || "");
			setEmail(reservation.customer_details?.email || "");
			setPhone(reservation.customer_details?.phone || "");
			setNationality(reservation.customer_details?.nationality || "");
			setAdults(reservation.adults || 1);
			setChildren(reservation.children || 0);
			setCheckInDate(dayjs(reservation.checkin_date));
			setCheckOutDate(dayjs(reservation.checkout_date));
			setSelectedRooms(
				reservation.pickedRoomsType || [
					{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
				]
			);
			setSelectedHotel(reservation.hotelId || null);
			setComment(reservation.comment || "");
		}
	}, [reservation]);

	// Reference to store previous state values
	const prevValues = useRef({
		checkInDate: null,
		checkOutDate: null,
		selectedRooms: [],
	});

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
		setAgentName(user.name || "");
		getAllHotels();
		// eslint-disable-next-line
	}, [getAllHotels]);

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
			if (!checkInDate || !checkOutDate || rooms.length === 0 || !selectedHotel)
				return;

			const startDate = dayjs(checkInDate).startOf("day");
			const endDate = dayjs(checkOutDate).startOf("day");
			const nights = endDate.diff(startDate, "day");

			let totalAmount = 0;
			let totalCommission = 0;

			// Map through each room and calculate totals
			const updatedRooms = rooms.map((room) => {
				// Respect existing pricingByDay if it exists
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
					totalCommission += roomTotalPriceWithCommission - roomTotalAmount;

					return room;
				}

				// Otherwise, recalculate pricingByDay
				const matchedRoom =
					selectedHotel.roomCountDetails &&
					selectedHotel.roomCountDetails.find(
						(r) =>
							r.roomType === room.roomType && r.displayName === room.displayName
					);

				if (matchedRoom) {
					const pricingByDay = calculatePricingByDayWithCommission(
						matchedRoom.pricingRate || [],
						startDate,
						endDate,
						parseFloat(matchedRoom.price?.basePrice) || 0,
						parseFloat(matchedRoom.defaultCost) || 0,
						parseFloat(
							matchedRoom.roomCommission || selectedHotel.commission || 0.1
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
					totalCommission += roomTotalPriceWithCommission - roomTotalAmount;

					return { ...room, pricingByDay };
				}

				return room;
			});

			// Update state
			setTotalAmount(Number(totalAmount.toFixed(2)));
			setTotalCommission(Number(totalCommission.toFixed(2)));
			setNumberOfNights(nights);
			setSelectedRooms(updatedRooms);
		},
		[
			checkInDate,
			checkOutDate,
			selectedRooms,
			calculatePricingByDayWithCommission,
			selectedHotel,
		]
	);

	useEffect(() => {
		if (
			!dayjs(prevValues.current.checkInDate).isSame(checkInDate) ||
			!dayjs(prevValues.current.checkOutDate).isSame(checkOutDate) ||
			JSON.stringify(prevValues.current.selectedRooms) !==
				JSON.stringify(selectedRooms)
		) {
			calculateTotals(selectedRooms);

			// Update the ref with the latest state
			prevValues.current = { checkInDate, checkOutDate, selectedRooms };
		}
	}, [checkInDate, checkOutDate, selectedRooms, calculateTotals]);

	// Handle room selection changes
	const handleRoomSelectionChange = (value, index) => {
		const [roomType, displayName] = value.split("|");
		const updatedRooms = [...selectedRooms];
		updatedRooms[index] = {
			...updatedRooms[index],
			roomType: roomType.trim(), // Ensure roomType is stored correctly
			displayName: displayName.trim(), // Ensure displayName is stored correctly
			pricingByDay: [], // Reset pricingByDay when a new room is selected
		};
		setSelectedRooms(updatedRooms);
	};

	// Handle room count changes
	const handleRoomCountChange = (count, index) => {
		// Ensure immutability by spreading the state
		const updatedRooms = [...selectedRooms];
		updatedRooms[index] = { ...updatedRooms[index], count };
		setSelectedRooms(updatedRooms);

		// Recalculate totals
		setTimeout(() => calculateTotals(updatedRooms), 0);
	};

	// Add a new room selection
	const addRoomSelection = () => {
		setSelectedRooms([
			...selectedRooms,
			{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
		]);
	};

	// Remove a room selection
	const removeRoomSelection = (index) => {
		const updatedRooms = [...selectedRooms];
		updatedRooms.splice(index, 1);
		setSelectedRooms(updatedRooms);
	};

	// Open and close modal
	const openModal = (roomIndex) => {
		setEditingRoomIndex(roomIndex);
		setIsModalVisible(true);
	};

	const closeModal = () => {
		setEditingRoomIndex(null);
		setIsModalVisible(false);
	};

	const handlePricingUpdate = (updatedPricingByDay) => {
		const updatedRooms = selectedRooms.map((room, index) =>
			index === editingRoomIndex
				? { ...room, pricingByDay: updatedPricingByDay }
				: room
		);

		// Update state with the modified rooms
		setSelectedRooms(updatedRooms);

		// Recalculate totals after updating selectedRooms
		setTimeout(() => calculateTotals(updatedRooms), 0);
	};

	// Clear all fields
	const clearAll = () => {
		setSelectedRooms([
			{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
		]);
		setName("");
		setEmail("");
		setCheckInDate(null);
		setCheckOutDate(null);
		setAdults(1);
		setChildren(0);
		setNationality("");
		setPhone("");
		setTotalAmount(0);
		setTotalCommission(0);
		setNumberOfNights(0);
	};

	const handleSubmit = async () => {
		// Enhanced Validation
		if (
			!name ||
			!email ||
			!phone ||
			!checkInDate ||
			!checkOutDate ||
			!selectedHotel ||
			!selectedRooms.every(
				(room) => room.roomType && room.displayName && room.count > 0
			)
		) {
			message.error("Please fill in all required fields.");
			return;
		}

		// Validate pricing for all rooms
		if (!selectedRooms.every((room) => room.pricingByDay.length > 0)) {
			message.error("Please ensure all selected rooms have valid pricing.");
			return;
		}

		// Transform picked rooms into the required format
		const transformPickedRoomsToPickedRoomsType = (rooms) => {
			return rooms.flatMap((room) =>
				Array.from({ length: room.count }, () => {
					const pricingDetails = room.pricingByDay.map((day) => ({
						date: day.date,
						price: day.totalPriceWithCommission,
						rootPrice: Number(day.rootPrice) || 0,
						commissionRate: Number(day.commissionRate) || 0,
						totalPriceWithCommission: day.totalPriceWithCommission,
						totalPriceWithoutCommission: Number(day.price) || 0,
					}));

					const averagePriceWithCommission =
						pricingDetails.reduce(
							(sum, day) => sum + day.totalPriceWithCommission,
							0
						) / pricingDetails.length;

					return {
						room_type: room.roomType.trim(),
						displayName: room.displayName.trim(),
						chosenPrice: Number(averagePriceWithCommission).toFixed(2),
						count: 1,
						pricingByDay: pricingDetails,
						totalPriceWithCommission: pricingDetails.reduce(
							(sum, day) => sum + day.totalPriceWithCommission,
							0
						),
						hotelShouldGet: pricingDetails.reduce(
							(sum, day) => sum + day.rootPrice,
							0
						),
					};
				})
			);
		};

		const pickedRoomsType =
			transformPickedRoomsToPickedRoomsType(selectedRooms);

		// ✅ Handle '_relocate' suffix increment ONLY if hotelId has changed
		let updatedConfirmationNumber = reservation.confirmation_number;

		if (selectedHotel._id !== reservation.hotelId) {
			const relocatePattern = /_relocate(\d*)$/;
			const match = updatedConfirmationNumber.match(relocatePattern);

			if (match) {
				// If '_relocate' exists, increment the number (e.g., '_relocate2', '_relocate3')
				const count = match[1] ? parseInt(match[1], 10) + 1 : 2;
				updatedConfirmationNumber = updatedConfirmationNumber.replace(
					relocatePattern,
					`_relocate${count}`
				);
			} else {
				// If '_relocate' doesn't exist, add it
				updatedConfirmationNumber += "_relocate";
			}
		}

		// Construct reservation data
		const reservationData = {
			userId: user ? user._id : null,
			hotelId: selectedHotel._id,
			belongsTo: selectedHotel.belongsTo?._id || "",
			hotel_name: selectedHotel.hotelName || "",
			customerDetails: {
				name,
				email,
				phone,
				passport: "Not Provided",
				passportExpiry: "1/1/2027",
				nationality,
				postalCode: "00000",
				reservedBy: agentName,
			},
			total_rooms: selectedRooms.reduce((total, room) => total + room.count, 0),
			total_guests: adults + children,
			adults,
			children,
			checkin_date: checkInDate.format("YYYY-MM-DD"),
			checkout_date: checkOutDate.format("YYYY-MM-DD"),
			days_of_residence: numberOfNights,
			booking_source: "Jannat Employee",
			pickedRoomsType,
			total_amount: totalAmount + totalCommission,
			payment: "Not Paid",
			paid_amount: reservation.paid_amount,
			commission: totalCommission,
			commissionPaid: false,
			paymentDetails: {
				cardNumber: "",
				cardExpiryDate: "",
				cardCVV: "",
				cardHolderName: "",
			},
			sentFrom: "employee",
			confirmation_number: updatedConfirmationNumber, // ✅ Correctly updated confirmation number
			sendEmail,
			comment,
		};

		try {
			const response = await updateSingleReservation(
				reservation._id,
				reservationData
			);

			if (response?.message === "Reservation updated successfully") {
				message.success("Reservation updated successfully!");
				setReservationCreated(true);
				setReservation(response.reservation);
				setTimeout(() => {
					window.location.reload(false);
				}, 1500);
			} else {
				message.error(response.message || "Error updating reservation.");
			}
		} catch (error) {
			console.error("Error updating reservation:", error);
			message.error("An error occurred while updating the reservation.");
		}
	};

	const showDetailsModal = () => {
		setIsModalVisible2(true);
	};

	const handleModalClose = () => {
		setIsModalVisible2(false);
	};

	console.log("Selected Rooms:", selectedRooms);

	const handleHotelChange = (hotelId) => {
		const newHotel = allHotels.find((hotel) => hotel._id === hotelId);
		if (selectedHotel && selectedHotel._id !== hotelId) {
			message.warning(
				"Hotel changed! Room selection and pricing will be reset."
			);
			setSelectedRooms([
				{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
			]);
			setTotalAmount(0);
			setTotalCommission(0);
			setNumberOfNights(0);
		}
		setSelectedHotel(newHotel);
	};

	return (
		<div style={{ padding: "20px", maxWidth: "700px", margin: "auto" }}>
			<Form layout='vertical'>
				<Button
					type='primary'
					danger
					onClick={clearAll}
					style={{ marginBottom: 20 }}
				>
					Clear All
				</Button>

				<div className='my-3'>
					<h3 style={{ fontSize: "1.3rem", fontWeight: "bold" }}>
						Confirmation Number: {reservation.confirmation_number}
					</h3>
				</div>
				<div>
					<Form.Item>
						<Checkbox
							checked={sendEmail}
							onChange={(e) => setSendEmail(e.target.checked)}
						>
							Send Email Notification
						</Checkbox>
					</Form.Item>
				</div>
				<div className='row'>
					<div className='col-md-6'>
						<Form.Item label='Select Hotel'>
							<Select
								placeholder='Select a hotel'
								value={selectedHotel?._id}
								onChange={handleHotelChange}
							>
								{allHotels.map((hotel) => (
									<Option key={hotel._id} value={hotel._id}>
										{hotel.hotelName}
									</Option>
								))}
							</Select>
						</Form.Item>
					</div>

					<div className='col-md-6'>
						<Form.Item label='Agent Name'>
							<Input
								value={agentName}
								onChange={(e) => setAgentName(e.target.value)}
							/>
						</Form.Item>
					</div>

					<div className='col-md-8'>
						<Form.Item label='Check-in and Check-out Dates'>
							<RangePicker
								className='w-100'
								format='YYYY-MM-DD'
								value={[checkInDate, checkOutDate]}
								onChange={(dates) => {
									setCheckInDate(dates ? dates[0] : null);
									setCheckOutDate(dates ? dates[1] : null);
								}}
							/>
						</Form.Item>
					</div>
				</div>

				{selectedRooms.map((room, index) => (
					<div key={index} style={{ marginBottom: 20 }}>
						<Form.Item label={`Room Type ${index + 1}`}>
							<Select
								placeholder='Select Room Type'
								value={
									room.roomType
										? `${room.roomType}|${room.displayName}`
										: undefined
								}
								onChange={(value) => handleRoomSelectionChange(value, index)}
							>
								{selectedHotel &&
									selectedHotel.roomCountDetails?.map((roomDetail) => (
										<Option
											key={`${roomDetail.roomType}|${roomDetail.displayName}`}
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

						{room.pricingByDay.length > 0 && (
							<Form.Item label='Pricing Breakdown'>
								<ul style={{ paddingLeft: "20px" }}>
									{room.pricingByDay.map((day, i) => (
										<li key={i}>
											{day.date}: {day.totalPriceWithCommission.toFixed(2)} SAR
										</li>
									))}
								</ul>
								<Button
									type='link'
									onClick={() => openModal(index)}
									style={{
										fontSize: "1rem",
										fontWeight: "bold",
										textDecoration: "underline",
									}}
								>
									<EditOutlined /> Edit Pricing
								</Button>
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

				<Button type='dashed' onClick={addRoomSelection}>
					Add Another Room
				</Button>

				{/* Other Fields */}

				<div className='row my-3'>
					<div className='col-md-4'>
						<Form.Item label='Guest Name'>
							<Input value={name} onChange={(e) => setName(e.target.value)} />
						</Form.Item>
					</div>
					<div className='col-md-4'>
						<Form.Item label='Email'>
							<Input value={email} onChange={(e) => setEmail(e.target.value)} />
						</Form.Item>
					</div>
					<div className='col-md-4'>
						<Form.Item label='Phone'>
							<Input value={phone} onChange={(e) => setPhone(e.target.value)} />
						</Form.Item>
					</div>

					<div className='col-md-6'>
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
					</div>
					<div className='col-md-3 w-100'>
						<Form.Item label='Adults'>
							<InputNumber
								className='w-100'
								min={1}
								value={adults}
								onChange={(value) => setAdults(value)}
							/>
						</Form.Item>
					</div>
					<div className='col-md-3 w-100'>
						<Form.Item label='Children'>
							<InputNumber
								className='w-100'
								min={0}
								value={children}
								onChange={(value) => setChildren(value)}
							/>
						</Form.Item>
					</div>
					<div className='col-md-8'>
						<Form.Item label='Comment'>
							<Input.TextArea
								rows={4}
								placeholder='Add any comments here...'
								value={comment}
								onChange={(e) => setComment(e.target.value)}
							/>
						</Form.Item>
					</div>
				</div>

				{/* Totals */}
				<Form.Item>
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
						<strong>Paid Amount: </strong>
						{reservation.paid_amount} SAR
					</p>
					<p>
						<strong>Number of Nights: </strong>
						{numberOfNights}
					</p>
				</Form.Item>

				<Button type='primary' onClick={handleSubmit}>
					Submit
				</Button>
			</Form>

			{selectedHotel &&
			selectedHotel._id &&
			reservationCreated &&
			selectedReservation &&
			selectedReservation._id ? (
				<Button
					type='link'
					className='my-4'
					onClick={() => showDetailsModal()}
					style={{
						fontWeight: "bold",
						fontSize: "1.5rem",
						textDecoration: "underline !important",
						color: "white",
						padding: "0px",
						background: "black",
						width: "50%",
						height: "10%",
					}}
				>
					View Details
				</Button>
			) : null}

			{/* Edit Pricing Modal */}
			<EditPricingModal
				visible={isModalVisible}
				onClose={closeModal}
				pricingByDay={selectedRooms[editingRoomIndex]?.pricingByDay || []}
				onUpdate={handlePricingUpdate}
				roomDetails={selectedRooms[editingRoomIndex]} // Optional
			/>

			<Modal
				// title={<div style={{ fontSize: "1.5rem" }}>Reservation Details</div>}
				open={isModalVisible2}
				onCancel={handleModalClose}
				className='float-right'
				width={"84%"}
				footer={[
					<Button key='close' onClick={handleModalClose}>
						Close
					</Button>,
				]}
			>
				{selectedHotel &&
				selectedHotel._id &&
				reservationCreated &&
				selectedReservation &&
				selectedReservation._id ? (
					<MoreDetails
						selectedReservation={selectedReservation}
						hotelDetails={selectedHotel}
						reservation={selectedReservation}
						setReservation={setSelectedReservation}
					/>
				) : null}
			</Modal>
		</div>
	);
};

export default EditReservationMain;
