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
	Spin,
	Descriptions,
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
	/** --------------
	 * Existing States
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
	const [comment, setComment] = useState("");

	/**
	 * Adjusted States for Totals:
	 * - hotelCost: sum of all rootPrice (daily) => "Total Amount (For the Hotel)"
	 * - totalAmount: sum of all totalPriceWithCommission (daily) => "Grand Total"
	 * - totalCommission: difference => totalAmount - hotelCost
	 * - oneNightCost: sum of first-day rootPrice for each room => "Cost of One Night"
	 * - finalDeposit: totalCommission + oneNightCost
	 * - numberOfNights: checkIn->checkOut difference (min 1)
	 */
	const [hotelCost, setHotelCost] = useState(0); // NEW for "For the Hotel"
	const [totalAmount, setTotalAmount] = useState(0); // "Grand Total"
	const [totalCommission, setTotalCommission] = useState(0);
	const [numberOfNights, setNumberOfNights] = useState(0);
	const [oneNightCost, setOneNightCost] = useState(0);
	const [finalDeposit, setFinalDeposit] = useState(0);

	const [allHotels, setAllHotels] = useState([]);
	const [selectedHotel, setSelectedHotel] = useState(null);
	const [editingRoomIndex, setEditingRoomIndex] = useState(null);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isModalVisible2, setIsModalVisible2] = useState(false);
	const [reservationCreated, setReservationCreated] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState("");
	const [sendEmail, setSendEmail] = useState(true);
	const [isLoading, setIsLoading] = useState(false);

	const { user, token } = isAuthenticated();

	// Keep track of old values (no changes here)
	const prevValues = useRef({
		checkInDate: null,
		checkOutDate: null,
		selectedRooms: [],
	});

	/** ------------------
	 *  Fetch all hotels
	 * ------------------ */
	const getAllHotels = useCallback(async () => {
		setIsLoading(true);
		try {
			const data = await gettingHotelDetailsForAdmin(user._id, token);
			if (data && !data.error) {
				const activeHotels = data.filter((h) => h.activateHotel === true);
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
		} finally {
			setIsLoading(false);
		}
	}, [user._id, token]);

	useEffect(() => {
		setAgentName(user.name || "");
		getAllHotels();
	}, [getAllHotels, user.name]);

	/** ---------------------
	 *  Prepopulate fields
	 * --------------------- */
	useEffect(() => {
		if (reservation) {
			setName(reservation.customer_details?.name || "");
			setEmail(reservation.customer_details?.email || "");
			setPhone(reservation.customer_details?.phone || "");
			setNationality(reservation.customer_details?.nationality || "");
			setAdults(reservation.adults || 1);
			setChildren(reservation.children || 0);
			setCheckInDate(
				reservation.checkin_date ? dayjs(reservation.checkin_date) : null
			);
			setCheckOutDate(
				reservation.checkout_date ? dayjs(reservation.checkout_date) : null
			);
			setComment(reservation.comment || "");
			// Do not set selectedHotel or selectedRooms here, intentionally.
		}
	}, [reservation]);

	/** ------------------------
	 *  After hotels are fetched,
	 *  set selectedHotel & Rooms
	 * ------------------------ */
	useEffect(() => {
		if (reservation && allHotels.length > 0) {
			const hotel = allHotels.find((h) => h._id === reservation.hotelId._id);
			if (hotel) {
				setSelectedHotel(hotel);
				// Map pickedRoomsType => selectedRooms with calculated pricingByDay
				const mappedRooms = reservation.pickedRoomsType.map((room) => ({
					roomType: room.room_type || "",
					displayName: room.displayName || "",
					count: room.count || 1,
					pricingByDay: room.pricingByDay || [],
				}));
				setSelectedRooms(mappedRooms);
			} else {
				setSelectedHotel(null);
				message.error("Selected hotel not found.");
			}
		}
	}, [reservation, allHotels]);

	/** ------------------------------
	 *  Helpers: safe parse float
	 * ------------------------------ */
	const safeParseFloat = (value, fallback = 0) => {
		const parsed = parseFloat(value);
		return isNaN(parsed) ? fallback : parsed;
	};

	/** ------------------------------
	 *  Calculate Pricing by Day (Aligned with OrderTaker)
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
	 *  Calculate Pricing by Day with Commission (Aligned with OrderTaker)
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
					safeParseFloat(day.price) +
					safeParseFloat(day.rootPrice) *
						(safeParseFloat(day.commissionRate) / 100),
			}));
		},
		[calculatePricingByDay]
	);

	/** ------------------------------
	 *  Calculate Totals (Aligned with OrderTaker)
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

			// Updated Rooms array to include recalculated pricingByDay
			const updatedRooms = rooms.map((room) => {
				if (room.pricingByDay && room.pricingByDay.length > 0) {
					// Pricing already exists, no need to recalculate
					const roomTotalAmount = room.pricingByDay.reduce(
						(acc, day) => acc + day.rootPrice * room.count,
						0
					);
					const roomTotalPriceWithCommission = room.pricingByDay.reduce(
						(acc, day) => acc + day.totalPriceWithCommission * room.count,
						0
					);

					sumHotelCost += roomTotalAmount;
					sumGrandTotal += roomTotalPriceWithCommission;

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

						sumHotelCost += roomTotalAmount;
						sumGrandTotal += roomTotalPriceWithCommission;

						return { ...room, pricingByDay: recalculatedPricingByDay };
					} else {
						console.warn("No matching room found for", room);
						return room;
					}
				}
			});

			// Compute oneNightCost: sum of firstDay's rootPrice for each room * count
			let sumOneNight = 0;
			updatedRooms.forEach((room) => {
				if (room.pricingByDay.length > 0) {
					const firstDayRoot = safeParseFloat(
						room.pricingByDay[0].rootPrice,
						0
					);
					sumOneNight += firstDayRoot * room.count;
				}
			});

			const sumCommission = sumGrandTotal - sumHotelCost;
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
	 *  Handle Room Selection & Counts (Aligned with OrderTaker)
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

	const handleRoomCountChange = (count, index) => {
		const updatedRooms = [...selectedRooms];
		updatedRooms[index] = { ...updatedRooms[index], count };
		setSelectedRooms(updatedRooms);
		// Recalculate totals after count change
		setTimeout(() => calculateTotals(updatedRooms), 0);
	};

	const addRoomSelection = () => {
		setSelectedRooms([
			...selectedRooms,
			{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
		]);
	};

	const removeRoomSelection = (index) => {
		const updatedRooms = [...selectedRooms];
		updatedRooms.splice(index, 1);
		setSelectedRooms(updatedRooms);
		// Recalculate totals after removing a room
		setTimeout(() => calculateTotals(updatedRooms), 0);
	};

	/** ------------------------------
	 *  Edit Pricing Modal logic (Aligned with OrderTaker)
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
		const updatedRooms = selectedRooms.map((room, idx) =>
			idx === editingRoomIndex
				? { ...room, pricingByDay: updatedPricingByDay }
				: room
		);
		setSelectedRooms(updatedRooms);
		// Recalculate totals after pricing update
		setTimeout(() => calculateTotals(updatedRooms), 0);
	};

	/** ------------------------------
	 *  Clear All Fields (Aligned with OrderTaker)
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
		setComment("");

		// Reset totals to 0 as well
		setHotelCost(0);
		setTotalAmount(0);
		setTotalCommission(0);
		setNumberOfNights(0);
		setOneNightCost(0);
		setFinalDeposit(0);
	};

	/** ------------------------------
	 *  Hotel Change (Aligned with OrderTaker)
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
		// Optionally, you might want to recalculate pricing for existing rooms here
		setTimeout(() => calculateTotals(selectedRooms), 0);
	};

	/** ------------------------------
	 *  Handle Submission (Aligned with OrderTaker)
	 * ------------------------------ */
	const handleSubmit = async () => {
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
							(acc, day) => acc + day.totalPriceWithCommission,
							0
						) / pricingDetails.length;

					return {
						room_type: room.roomType.trim(),
						displayName: room.displayName.trim(),
						chosenPrice: Number(averagePriceWithCommission).toFixed(2),
						count: 1,
						pricingByDay: pricingDetails,
						totalPriceWithCommission: pricingDetails.reduce(
							(acc, day) => acc + day.totalPriceWithCommission,
							0
						),
						hotelShouldGet: pricingDetails.reduce(
							(acc, day) => acc + day.rootPrice,
							0
						),
					};
				})
			);
		};

		const pickedRoomsType =
			transformPickedRoomsToPickedRoomsType(selectedRooms);

		// _relocate suffix if hotel changed
		let updatedConfirmationNumber = reservation.confirmation_number;
		if (selectedHotel._id !== reservation.hotelId._id) {
			// Corrected comparison
			const relocatePattern = /_relocate(\d*)$/;
			const match = updatedConfirmationNumber.match(relocatePattern);
			if (match) {
				const c = match[1] ? parseInt(match[1], 10) + 1 : 2;
				updatedConfirmationNumber = updatedConfirmationNumber.replace(
					relocatePattern,
					`_relocate${c}`
				);
			} else {
				updatedConfirmationNumber += "_relocate";
			}
		}

		const reservationData = {
			userId: user ? user._id : null,
			hotelId: selectedHotel._id,
			belongsTo: selectedHotel.belongsTo?._id || "",
			hotel_name: selectedHotel.hotelName || "",
			customerDetails: {
				name,
				email,
				phone,
				passport: reservation.customer_details?.passport || "Not Provided",
				passportExpiry:
					reservation.customer_details?.passportExpiry || "2027-01-01",
				nationality,
				postalCode: reservation.customer_details?.postalCode || "00000",
				reservedBy: agentName,
			},
			total_rooms: selectedRooms.reduce((total, room) => total + room.count, 0),
			total_guests: adults + children,
			adults,
			children,
			checkin_date: checkInDate.format("YYYY-MM-DD"),
			checkout_date: checkOutDate.format("YYYY-MM-DD"),
			days_of_residence: numberOfNights,
			booking_source: reservation.booking_source
				? reservation.booking_source
				: "Jannat Employee",
			pickedRoomsType,
			// totalAmount now truly = sum of all priceAfterCommission for each day => "Grand Total"
			total_amount: totalAmount,
			payment: selectedHotel.payment || "not paid",
			paid_amount: reservation.payment_details?.paid_amount || 0,
			commission: totalCommission,
			commissionPaid: reservation.payment_details?.commissionPaid || false,
			paymentDetails: {
				cardNumber: reservation.payment_details?.cardNumber || "",
				cardExpiryDate: reservation.payment_details?.cardExpiryDate || "",
				cardCVV: reservation.payment_details?.cardCVV || "",
				cardHolderName: reservation.payment_details?.cardHolderName || "",
			},
			sentFrom: "employee",
			confirmation_number: updatedConfirmationNumber,
			sendEmail,
			comment,
		};

		try {
			setIsLoading(true); // Start loading
			const response = await updateSingleReservation(
				reservation._id,
				reservationData
			);
			if (response?.message === "Reservation updated successfully") {
				message.success("Reservation updated successfully!");
				setReservationCreated(true);
				setReservation(response.reservation);
				window.scrollTo({ top: 0, behavior: "smooth" });
				setTimeout(() => {
					window.location.reload(false);
				}, 1500);
				// Everything else remains as-is
			} else {
				message.error(response.message || "Error updating reservation.");
			}
		} catch (error) {
			console.error("Error updating reservation:", error);
			message.error("An error occurred while updating the reservation.");
		} finally {
			setIsLoading(false); // Stop loading
		}
	};

	/** ------------------------------
	 * Show / hide details modal
	 * ------------------------------ */
	const showDetailsModal = () => {
		setIsModalVisible2(true);
	};

	const handleModalClose = () => {
		setIsModalVisible2(false);
	};

	console.log("Selected Rooms:", selectedRooms);

	/** ------------------------------
	 * Render - intact except <Descriptions>
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

				{isLoading && (
					<div style={{ textAlign: "center", marginBottom: "20px" }}>
						<Spin tip='Loading hotels...' />
					</div>
				)}

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
								disabled={isLoading}
							>
								{allHotels.map((ht) => (
									<Option key={ht._id} value={ht._id}>
										{ht.hotelName}
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
								disabled={isLoading}
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
								disabled={isLoading}
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
								disabled={isLoading || !selectedHotel}
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
								onChange={(cnt) => handleRoomCountChange(cnt, index)}
								disabled={isLoading}
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
									disabled={isLoading}
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
								disabled={isLoading}
							>
								Remove
							</Button>
						)}
					</div>
				))}

				<Button
					type='dashed'
					onClick={addRoomSelection}
					disabled={isLoading || !selectedHotel}
				>
					Add Another Room
				</Button>

				{/* Other Fields */}
				<div className='row my-3'>
					<div className='col-md-4'>
						<Form.Item label='Guest Name'>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={isLoading}
							/>
						</Form.Item>
					</div>
					<div className='col-md-4'>
						<Form.Item label='Email'>
							<Input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={isLoading}
							/>
						</Form.Item>
					</div>
					<div className='col-md-4'>
						<Form.Item label='Phone'>
							<Input
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								disabled={isLoading}
							/>
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
								onChange={(val) => setNationality(val)}
								style={{ width: "100%" }}
								disabled={isLoading}
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
								onChange={(val) => setAdults(val)}
								disabled={isLoading}
							/>
						</Form.Item>
					</div>
					<div className='col-md-3 w-100'>
						<Form.Item label='Children'>
							<InputNumber
								className='w-100'
								min={0}
								value={children}
								onChange={(val) => setChildren(val)}
								disabled={isLoading}
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
								disabled={isLoading}
							/>
						</Form.Item>
					</div>
				</div>

				{/* Totals: updated lines only */}
				<Form.Item>
					<Descriptions bordered column={1} size='small'>
						<Descriptions.Item label='Total Amount (For the Hotel)'>
							{Number(hotelCost).toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Total Commission'>
							{Number(totalCommission).toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Cost of One Night'>
							{Number(oneNightCost).toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Total Deposit'>
							{Number(finalDeposit).toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Grand Total (Including Commission)'>
							{Number(totalAmount).toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Paid Amount'>
							{reservation.payment_details?.paid_amount || 0} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Number of Nights'>
							{numberOfNights}
						</Descriptions.Item>
					</Descriptions>
				</Form.Item>

				<Button
					type='primary'
					onClick={handleSubmit}
					disabled={isLoading}
					loading={isLoading}
				>
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
				roomDetails={selectedRooms[editingRoomIndex]} // Optional
			/>

			{/* "MoreDetails" Modal */}
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

export default EditReservationMain;
