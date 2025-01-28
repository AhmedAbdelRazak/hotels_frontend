// src/components/admin/OrderTaker.js

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
	Descriptions,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { countryListWithAbbreviations } from "../CustomerService/utils";
import { isAuthenticated } from "../../auth";
import {
	createNewReservationClient,
	gettingHotelDetailsForAdmin,
} from "../apiAdmin";
import EditPricingModal from "./EditPricingModal";
import MoreDetails from "../AllReservation/MoreDetails";

const { RangePicker } = DatePicker;
const { Option } = Select;

const OrderTaker = () => {
	/** --------------
	 * State Variables
	 * -------------- */
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
	const [totalAmount, setTotalAmount] = useState(0); // Grand Total (Including Commission)
	const [totalCommission, setTotalCommission] = useState(0);
	const [numberOfNights, setNumberOfNights] = useState(0);

	/** --------------
	 * New State Variables
	 * -------------- */
	const [hotelCost, setHotelCost] = useState(0); // Total Amount (For the Hotel)
	const [oneNightCost, setOneNightCost] = useState(0); // Cost of One Night
	const [finalDeposit, setFinalDeposit] = useState(0); // Total Deposit

	const [allHotels, setAllHotels] = useState([]);
	const [selectedHotel, setSelectedHotel] = useState(null);
	const [editingRoomIndex, setEditingRoomIndex] = useState(null);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isModalVisible2, setIsModalVisible2] = useState(false);
	const [reservationCreated, setReservationCreated] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState("");

	const { user, token } = isAuthenticated();

	// Ref to store previous state values (for optimization)
	const prevValues = useRef({
		checkInDate: null,
		checkOutDate: null,
		selectedRooms: [],
	});

	/** ------------------
	 * Fetch All Hotels
	 * ------------------ */
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
			message.error("An error occurred while fetching hotels.");
		}
	}, [user._id, token]);

	useEffect(() => {
		setAgentName(user.name || "");
		getAllHotels();
		// eslint-disable-next-line
	}, [getAllHotels]);

	/** ---------------------
	 * Helper: Safe Parse Float
	 * --------------------- */
	const safeParseFloat = (value, fallback = 0) => {
		const parsed = parseFloat(value);
		return isNaN(parsed) ? fallback : parsed;
	};

	/** ------------------------------
	 * Calculate Pricing by Day
	 * ------------------------------ */
	const calculatePricingByDay = useCallback(
		(
			pricingRate = [],
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

	/** ------------------------------
	 * Calculate Pricing by Day with Commission (Aligned with ReceiptPDF)
	 * ------------------------------ */
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
				totalPriceWithoutCommission: Number(day.price),
			}));
		},
		[calculatePricingByDay]
	);

	/** ------------------------------
	 * Calculate Totals (Aligned with ReceiptPDF)
	 * ------------------------------ */
	const calculateTotals = useCallback(
		(rooms = selectedRooms) => {
			if (!checkInDate || !checkOutDate || rooms.length === 0 || !selectedHotel)
				return;

			const startDate = dayjs(checkInDate).startOf("day");
			const endDate = dayjs(checkOutDate).startOf("day");
			let nightsDiff = endDate.diff(startDate, "day");
			if (nightsDiff < 1) nightsDiff = 1; // minimum 1 night

			// Summations
			let sumHotelCost = 0; // sum of rootPrice * count
			let sumGrandTotal = 0; // sum of totalPriceWithCommission * count
			let sumCommission = 0; // sum of commission * count
			let sumOneNight = 0; // Cost of One Night

			// Updated Rooms array to include recalculated pricingByDay
			const updatedRooms = rooms.map((room) => {
				if (room.pricingByDay && room.pricingByDay.length > 0) {
					// Pricing already exists, calculate sums based on ReceiptPDF's formula
					const roomTotalAmount = room.pricingByDay.reduce(
						(acc, day) => acc + day.rootPrice * room.count,
						0
					);
					const roomTotalPriceWithCommission = room.pricingByDay.reduce(
						(acc, day) => acc + day.totalPriceWithCommission * room.count,
						0
					);
					const roomTotalCommission = room.pricingByDay.reduce(
						(acc, day) =>
							acc +
							(day.rootPrice * (day.commissionRate / 100) +
								(day.totalPriceWithoutCommission - day.rootPrice) *
									nightsDiff) *
								room.count,
						0
					);

					sumHotelCost += roomTotalAmount;
					sumGrandTotal += roomTotalPriceWithCommission;
					sumCommission += roomTotalCommission;

					return room;
				} else {
					// Recalculate pricingByDay based on selectedHotel's roomCountDetails
					const matchedRoom =
						selectedHotel.roomCountDetails &&
						selectedHotel.roomCountDetails.find(
							(r) =>
								r.roomType.trim() === room.roomType.trim() &&
								r.displayName.trim() === room.displayName.trim()
						);

					if (matchedRoom) {
						const recalculatedPricingByDay =
							calculatePricingByDayWithCommission(
								matchedRoom.pricingRate || [],
								startDate,
								endDate,
								parseFloat(matchedRoom.price?.basePrice) || 0,
								parseFloat(matchedRoom.defaultCost) || 0,
								parseFloat(
									matchedRoom.roomCommission || selectedHotel.commission || 0.1
								)
							);

						const roomTotalAmount = recalculatedPricingByDay.reduce(
							(acc, day) => acc + day.rootPrice * room.count,
							0
						);
						const roomTotalPriceWithCommission =
							recalculatedPricingByDay.reduce(
								(acc, day) => acc + day.totalPriceWithCommission * room.count,
								0
							);
						const roomTotalCommission = recalculatedPricingByDay.reduce(
							(acc, day) =>
								acc +
								(day.rootPrice * (day.commissionRate / 100) +
									(day.totalPriceWithoutCommission - day.rootPrice)) *
									room.count,
							0
						);

						console.log(
							roomTotalCommission,
							"roomTotalCommissionroomTotalCommission"
						);

						sumHotelCost += roomTotalAmount;
						sumGrandTotal += roomTotalPriceWithCommission;
						sumCommission += roomTotalCommission;

						return { ...room, pricingByDay: recalculatedPricingByDay };
					} else {
						console.warn("No matching room found for", room);
						return room;
					}
				}
			});

			// Compute oneNightCost: sum of firstDay's rootPrice for each room * count
			updatedRooms.forEach((room) => {
				if (room.pricingByDay.length > 0) {
					const firstDayRoot = safeParseFloat(
						room.pricingByDay[0].rootPrice,
						0
					);
					sumOneNight += firstDayRoot * room.count;
				}
			});

			// Final Deposit is sum of commissions and one-night cost
			const deposit = sumCommission + sumOneNight;

			// Update states
			setHotelCost(Number(sumHotelCost.toFixed(2)));
			setTotalAmount(Number(sumGrandTotal.toFixed(2))); // "Grand total"
			setTotalCommission(Number(sumCommission.toFixed(2)));
			setOneNightCost(Number(sumOneNight.toFixed(2)));
			setFinalDeposit(Number(deposit.toFixed(2)));
			setNumberOfNights(nightsDiff);

			// Update selectedRooms with recalculated pricingByDay
			setSelectedRooms(updatedRooms);
		},
		[
			checkInDate,
			checkOutDate,
			selectedRooms,
			selectedHotel,
			calculatePricingByDayWithCommission,
		]
	);

	/** ------------------------------
	 *  useEffect to Recalculate Totals
	 * ------------------------------ */
	useEffect(() => {
		const prev = prevValues.current;
		if (
			!dayjs(prev.checkInDate).isSame(checkInDate) ||
			!dayjs(prev.checkOutDate).isSame(checkOutDate) ||
			JSON.stringify(prev.selectedRooms) !== JSON.stringify(selectedRooms)
		) {
			calculateTotals(selectedRooms);
			prevValues.current = { checkInDate, checkOutDate, selectedRooms };
		}
	}, [checkInDate, checkOutDate, selectedRooms, calculateTotals]);

	/** ------------------------------
	 * Handle Room Type Selection Change
	 * ------------------------------ */
	const handleRoomSelectionChange = (value, index) => {
		const [roomType, displayName] = value.split("|");
		const updatedRooms = [...selectedRooms];
		updatedRooms[index] = {
			...updatedRooms[index],
			roomType: roomType.trim(),
			displayName: displayName.trim(),
			pricingByDay: [], // Reset pricing when room selection changes
		};
		setSelectedRooms(updatedRooms);
		// Recalculate totals after room selection change
		setTimeout(() => calculateTotals(updatedRooms), 0);
	};

	/** ------------------------------
	 * Handle Room Count Change
	 * ------------------------------ */
	const handleRoomCountChange = (count, index) => {
		const updatedRooms = [...selectedRooms];
		updatedRooms[index] = { ...updatedRooms[index], count };
		setSelectedRooms(updatedRooms);
		// Recalculate totals after count change
		setTimeout(() => calculateTotals(updatedRooms), 0);
	};

	/** ------------------------------
	 * Add a New Room Selection
	 * ------------------------------ */
	const addRoomSelection = () => {
		setSelectedRooms([
			...selectedRooms,
			{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
		]);
	};

	/** ------------------------------
	 * Remove a Room Selection
	 * ------------------------------ */
	const removeRoomSelection = (index) => {
		const updatedRooms = [...selectedRooms];
		updatedRooms.splice(index, 1);
		setSelectedRooms(updatedRooms);
		// Recalculate totals after removing a room
		setTimeout(() => calculateTotals(updatedRooms), 0);
	};

	/** ------------------------------
	 * Edit Pricing Modal Logic
	 * ------------------------------ */
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
		setSelectedRooms(updatedRooms);
		setTimeout(() => calculateTotals(updatedRooms), 0);
	};

	/** ------------------------------
	 * Clear All Form Fields
	 * ------------------------------ */
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
		setHotelCost(0);
		setOneNightCost(0);
		setFinalDeposit(0);
	};

	/** ------------------------------
	 * Handle Hotel Change
	 * ------------------------------ */
	const handleHotelChange = (hotelId) => {
		const newHotel = allHotels.find((ht) => ht._id === hotelId);
		if (selectedHotel && selectedHotel._id !== hotelId) {
			message.warning(
				"Hotel changed! Room selection and pricing will be reset."
			);
			setSelectedRooms([
				{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
			]);
			setHotelCost(0);
			setTotalAmount(0);
			setTotalCommission(0);
			setNumberOfNights(0);
			setOneNightCost(0);
			setFinalDeposit(0);
		}
		setSelectedHotel(newHotel);
		// Recalculate totals after hotel change
		setTimeout(() => calculateTotals(selectedRooms), 0);
	};

	/** ------------------------------
	 * Handle Form Submission
	 * ------------------------------ */
	const handleSubmit = async () => {
		// Validation
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

		if (!selectedRooms.every((room) => room.pricingByDay.length > 0)) {
			message.error("Please ensure all selected rooms have valid pricing.");
			return;
		}

		// Transform picked rooms into the expected format (aligned with ReceiptPDF's logic)
		const transformPickedRoomsToPickedRoomsType = (rooms) => {
			return rooms.flatMap((room) =>
				Array.from({ length: room.count }, () => {
					const pricingDetails = room.pricingByDay.map((day) => ({
						date: day.date,
						price: day.totalPriceWithCommission, // Price with commission
						rootPrice: Number(day.rootPrice) || 0, // Base price
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

		const reservationData = {
			userId: user ? user._id : null,
			hotelId: selectedHotel._id,
			belongsTo: selectedHotel.belongsTo._id || "",
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
			total_amount: totalAmount, // Grand Total (Including Commission)
			payment: "Not Paid",
			paid_amount: 0,
			commission: totalCommission, // Aligned with ReceiptPDF
			commissionPaid: false,
			paymentDetails: {
				cardNumber: "",
				cardExpiryDate: "",
				cardCVV: "",
				cardHolderName: "",
			},
			sentFrom: "employee",
		};

		try {
			message.loading({ content: "Submitting...", key: "submit" });
			const response = await createNewReservationClient(reservationData);
			if (response?.message === "Reservation created successfully") {
				message.success({
					content: "Reservation created successfully!",
					key: "submit",
					duration: 2,
				});
				setReservationCreated(true);
				setSelectedReservation(response.data);
				window.scrollTo({ top: 0, behavior: "smooth" });
				setTimeout(() => {
					window.location.reload(false);
				}, 1500);
			} else {
				message.error({
					content: response.message || "Error creating reservation",
					key: "submit",
					duration: 2,
				});
			}
		} catch (error) {
			console.error("Error creating reservation", error);
			message.error({
				content: "An error occurred while creating the reservation.",
				key: "submit",
				duration: 2,
			});
		}
	};

	/** ------------------------------
	 * Show / Hide Details Modal
	 * ------------------------------ */
	const showDetailsModal = () => {
		setIsModalVisible2(true);
	};

	const handleModalClose = () => {
		setIsModalVisible2(false);
	};

	console.log("Selected Rooms:", selectedRooms);

	/** ------------------------------
	 * Render Component
	 * ------------------------------ */
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

				<div className='row'>
					<div className='col-md-6'>
						<Form.Item label='Select Hotel' required>
							<Select
								placeholder='Select a hotel'
								value={selectedHotel?._id}
								onChange={handleHotelChange}
								allowClear
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
						<Form.Item label='Agent Name' required>
							<Input
								value={agentName}
								onChange={(e) => setAgentName(e.target.value)}
								placeholder='Enter agent name'
							/>
						</Form.Item>
					</div>

					<div className='col-md-8'>
						<Form.Item label='Check-in and Check-out Dates' required>
							<RangePicker
								className='w-100'
								format='YYYY-MM-DD'
								value={[checkInDate, checkOutDate]}
								onChange={(dates) => {
									setCheckInDate(dates ? dates[0] : null);
									setCheckOutDate(dates ? dates[1] : null);
								}}
								disabled={!selectedHotel}
							/>
						</Form.Item>
					</div>
				</div>

				{selectedRooms.map((room, index) => (
					<div key={index} style={{ marginBottom: 20 }}>
						<Form.Item label={`Room Type ${index + 1}`} required>
							<Select
								placeholder='Select Room Type'
								value={
									room.roomType
										? `${room.roomType}|${room.displayName}`
										: undefined
								}
								onChange={(value) => handleRoomSelectionChange(value, index)}
								disabled={!selectedHotel}
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
						<Form.Item label='Count' required>
							<InputNumber
								min={1}
								value={room.count}
								onChange={(count) => handleRoomCountChange(count, index)}
								style={{ width: "100%" }}
								disabled={!selectedHotel}
							/>
						</Form.Item>

						{room.pricingByDay.length > 0 && (
							<Form.Item label='Pricing Breakdown'>
								<Descriptions bordered column={1} size='small'>
									{room.pricingByDay.map((day, i) => (
										<Descriptions.Item key={i} label={day.date}>
											{Number(day.totalPriceWithCommission).toFixed(2)} SAR
										</Descriptions.Item>
									))}
								</Descriptions>
								<Button
									type='link'
									onClick={() => openModal(index)}
									style={{
										fontSize: "1rem",
										fontWeight: "bold",
										textDecoration: "underline",
									}}
									icon={<EditOutlined />}
									disabled={!selectedHotel}
								>
									Edit Pricing
								</Button>
							</Form.Item>
						)}
						{index > 0 && (
							<Button
								type='link'
								danger
								onClick={() => removeRoomSelection(index)}
								disabled={!selectedHotel}
							>
								Remove
							</Button>
						)}
					</div>
				))}

				<Button
					type='dashed'
					onClick={addRoomSelection}
					disabled={!selectedHotel}
				>
					Add Another Room
				</Button>

				{/* Customer Details */}
				<div className='row my-3'>
					<div className='col-md-4'>
						<Form.Item label='Guest Name' required>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder='Enter guest name'
							/>
						</Form.Item>
					</div>
					<div className='col-md-4'>
						<Form.Item label='Email' required>
							<Input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder='Enter email'
							/>
						</Form.Item>
					</div>
					<div className='col-md-4'>
						<Form.Item label='Phone' required>
							<Input
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								placeholder='Enter phone number'
							/>
						</Form.Item>
					</div>

					<div className='col-md-6'>
						<Form.Item label='Nationality' required>
							<Select
								showSearch
								placeholder='Select Nationality'
								optionFilterProp='children'
								filterOption={(input, option) =>
									option.children.toLowerCase().includes(input.toLowerCase())
								}
								value={nationality}
								onChange={(value) => setNationality(value)}
								style={{ width: "100%" }}
								disabled={!selectedHotel}
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
						<Form.Item label='Adults' required>
							<InputNumber
								className='w-100'
								min={1}
								value={adults}
								onChange={(value) => setAdults(value)}
								disabled={!selectedHotel}
							/>
						</Form.Item>
					</div>
					<div className='col-md-3 w-100'>
						<Form.Item label='Children' required>
							<InputNumber
								className='w-100'
								min={0}
								value={children}
								onChange={(value) => setChildren(value)}
								disabled={!selectedHotel}
							/>
						</Form.Item>
					</div>
				</div>

				{/* Totals: Replaced with Descriptions */}
				<Form.Item>
					<Descriptions bordered column={1} size='small'>
						<Descriptions.Item label='Total Amount (For the Hotel)'>
							{Number(hotelCost).toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Total Commission'>
							{Number(totalCommission).toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Cost of One Night (First Night)'>
							{Number(oneNightCost).toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Total Deposit'>
							{Number(finalDeposit).toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Grand Total (Including Commission)'>
							<span
								style={{
									fontSize: "1.3rem",
									fontWeight: "bold",
									color: "darkgreen",
								}}
							>
								{Number(totalAmount).toFixed(2)} SAR
							</span>
						</Descriptions.Item>

						<Descriptions.Item label='Paid Amount'>
							{selectedReservation.payment_details?.paid_amount || 0} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Number of Nights'>
							{numberOfNights}
						</Descriptions.Item>
					</Descriptions>
				</Form.Item>

				<Button type='primary' onClick={handleSubmit}>
					Submit
				</Button>
			</Form>

			{selectedHotel &&
				selectedHotel._id &&
				reservationCreated &&
				selectedReservation &&
				selectedReservation._id && (
					<Button
						type='link'
						className='my-4'
						onClick={showDetailsModal}
						style={{
							fontWeight: "bold",
							fontSize: "1.5rem",
							textDecoration: "underline",
							color: "white",
							padding: "0px",
							background: "black",
							width: "50%",
							height: "10%",
						}}
					>
						View Details
					</Button>
				)}

			{/* Edit Pricing Modal */}
			<EditPricingModal
				visible={isModalVisible}
				onClose={closeModal}
				pricingByDay={selectedRooms[editingRoomIndex]?.pricingByDay || []}
				onUpdate={handlePricingUpdate}
				roomDetails={selectedRooms[editingRoomIndex]}
			/>

			<Modal
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
					selectedReservation._id && (
						<MoreDetails
							selectedReservation={selectedReservation}
							hotelDetails={selectedHotel}
							reservation={selectedReservation}
							setReservation={setSelectedReservation}
						/>
					)}
			</Modal>
		</div>
	);
};

export default OrderTaker;
