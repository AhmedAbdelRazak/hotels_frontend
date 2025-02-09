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
	Radio,
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

const { Option } = Select;
/** --------------------- Safe Parse Float --------------------- */
const safeParseFloat = (val, fallback = 0) => {
	const parsed = parseFloat(val);
	return isNaN(parsed) ? fallback : parsed;
};

// Load the “manual paid amount” password from env (or set a fallback)
const PASSWORD_FOR_PAID_AMOUNT =
	process.env.REACT_APP_MANUAL_PAID_AMOUNT || "secret123";

const EditReservationMain = ({
	reservation,
	setReservation,
	chosenLanguage,
	hotelDetails,
}) => {
	// Existing states
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

	// Totals
	const [hotelCost, setHotelCost] = useState(0);
	const [totalAmount, setTotalAmount] = useState(0);
	const [totalCommission, setTotalCommission] = useState(0);
	const [numberOfNights, setNumberOfNights] = useState(0);
	const [oneNightCost, setOneNightCost] = useState(0);

	const [defaultDeposit, setDefaultDeposit] = useState(0);
	const [finalDeposit, setFinalDeposit] = useState(0);

	// Advance Payment states
	const [advancePaymentOption, setAdvancePaymentOption] = useState(
		"commission_plus_one_day"
	);
	const [advancePaymentPercentage, setAdvancePaymentPercentage] = useState("");
	const [advancePaymentSAR, setAdvancePaymentSAR] = useState("");

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

	// Keep track of previous values
	const prevValues = useRef({
		checkInDate: null,
		checkOutDate: null,
		selectedRooms: [],
	});

	// ----------------------
	// ADDED FOR paid_amount EDIT
	// ----------------------
	// 1) "Verify Password" modal
	const [verifyPasswordModalVisible, setVerifyPasswordModalVisible] =
		useState(false);
	const [verifyPasswordInput, setVerifyPasswordInput] = useState("");

	// 2) "Update Paid Amount" modal
	const [paidAmountModalVisible, setPaidAmountModalVisible] = useState(false);
	const [tempPaidAmount, setTempPaidAmount] = useState(
		reservation?.payment_details?.onsite_paid_amount || 0
	);

	// If `reservation` changes, reset the tempPaidAmount
	useEffect(() => {
		setTempPaidAmount(reservation?.payment_details?.onsite_paid_amount || 0);
	}, [reservation]);

	// Step to handle actual saving of onsite_paid_amount
	const handlePaidAmountUpdate = async () => {
		try {
			setIsLoading(true);

			// We'll update the existing reservation's payment_details with new paid_amount
			const updatePayload = {
				payment_details: {
					...(reservation.payment_details || {}),
					onsite_paid_amount: tempPaidAmount,
				},
			};

			const response = await updateSingleReservation(
				reservation._id,
				updatePayload
			);
			if (response?.message === "Reservation updated successfully") {
				message.success("Paid amount updated successfully!");

				// Update local state to reflect new paid_amount
				setReservation({
					...reservation,
					payment_details: {
						...(reservation.payment_details || {}),
						onsite_paid_amount: tempPaidAmount,
					},
				});
				setPaidAmountModalVisible(false);
			} else {
				message.error(response?.message || "Error updating paid amount.");
			}
		} catch (err) {
			console.error("Error updating paid amount:", err);
			message.error("An error occurred while updating the paid amount.");
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Called when user clicks the Edit icon next to Paid Amount.
	 * First, we show a "verify password" modal that doesn't allow close
	 * except success or user chooses to cancel. If success => open actual paid-amount modal.
	 */
	const handleOpenPaidAmountEdit = () => {
		setVerifyPasswordModalVisible(true);
		setVerifyPasswordInput("");
	};

	/**
	 * Check the password. If correct => close the verification modal, open the paidAmount modal.
	 * If incorrect => show error, keep the modal open.
	 */
	const handleVerifyPasswordSubmit = () => {
		if (verifyPasswordInput.trim() === PASSWORD_FOR_PAID_AMOUNT) {
			// success
			setVerifyPasswordModalVisible(false);
			setPaidAmountModalVisible(true);
		} else {
			// fail
			message.error("Incorrect password. Please try again.");
		}
	};
	// ----------------------

	// 1) Fetch all hotels
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

	// 2) Prepopulate fields from reservation
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

			// Pre-populate the advancePayment radio selection
			if (reservation.advancePayment) {
				const { paymentPercentage, finalAdvancePayment } =
					reservation.advancePayment;
				if (paymentPercentage && parseFloat(paymentPercentage) > 0) {
					setAdvancePaymentOption("percentage");
					setAdvancePaymentPercentage(paymentPercentage);
				} else if (finalAdvancePayment && parseFloat(finalAdvancePayment) > 0) {
					setAdvancePaymentOption("sar");
					setAdvancePaymentSAR(finalAdvancePayment.toString());
				} else {
					setAdvancePaymentOption("commission_plus_one_day");
				}
			}
		}
	}, [reservation]);

	// 3) Once hotels are fetched, set selectedHotel & Rooms
	useEffect(() => {
		if (reservation && allHotels.length > 0) {
			const hotel = allHotels.find((h) => h._id === reservation.hotelId._id);
			if (hotel) {
				setSelectedHotel(hotel);

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

	// =============== HELPER: calculatePricingByDay + Commission ================
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
				const matchedRate = pricingRate.find(
					(r) => r.calendarDate === formattedDate
				);

				const dailyPrice = matchedRate
					? safeParseFloat(matchedRate.price, basePrice)
					: basePrice;
				const dailyRoot = matchedRate
					? safeParseFloat(matchedRate.rootPrice, defaultCost)
					: defaultCost;
				const dailyComm = matchedRate
					? safeParseFloat(matchedRate.commissionRate, commissionRate)
					: commissionRate;

				dateArray.push({
					date: formattedDate,
					price: dailyPrice,
					rootPrice: dailyRoot,
					commissionRate: dailyComm,
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
			const noCommissionArray = calculatePricingByDay(
				pricingRate,
				startDate,
				endDate,
				basePrice,
				defaultCost,
				commissionRate
			);
			return noCommissionArray.map((day) => ({
				...day,
				totalPriceWithCommission:
					safeParseFloat(day.price) +
					safeParseFloat(day.rootPrice) *
						(safeParseFloat(day.commissionRate) / 100),
				totalPriceWithoutCommission: safeParseFloat(day.price),
			}));
		},
		[calculatePricingByDay]
	);
	// ===========================================================================

	/**
	 * 4) Recalculate all relevant totals (Hotel cost, Commission, etc.)
	 *    - Summation logic exactly like the updated OrderTaker
	 */
	const calculateTotals = useCallback(
		(rooms = selectedRooms) => {
			if (!selectedHotel || !checkInDate || !checkOutDate) return;
			if (!rooms || rooms.length === 0) return;

			const startDate = dayjs(checkInDate).startOf("day");
			const endDate = dayjs(checkOutDate).startOf("day");
			let nights = endDate.diff(startDate, "day");
			if (nights < 1) nights = 1; // min 1 night

			let sumHotelCost = 0;
			let sumGrandTotal = 0;
			let sumCommission = 0;
			let sumOneNightCost = 0;

			const updatedRooms = rooms.map((room) => {
				if (!room.roomType || !room.displayName) return room;

				if (room.pricingByDay && room.pricingByDay.length) {
					// Already have day-by-day; sum them directly
					const roomTotalRoot = room.pricingByDay.reduce(
						(acc, day) => acc + safeParseFloat(day.rootPrice),
						0
					);
					const roomTotalWithComm = room.pricingByDay.reduce(
						(acc, day) => acc + safeParseFloat(day.totalPriceWithCommission),
						0
					);
					// Commission for each day = totalPriceWithCommission - rootPrice
					const roomTotalCommission = room.pricingByDay.reduce((acc, day) => {
						return (
							acc +
							(safeParseFloat(day.totalPriceWithCommission) -
								safeParseFloat(day.rootPrice))
						);
					}, 0);

					sumHotelCost += roomTotalRoot * room.count;
					sumGrandTotal += roomTotalWithComm * room.count;
					sumCommission += roomTotalCommission * room.count;

					// For the first day’s root price only:
					if (room.pricingByDay[0]) {
						sumOneNightCost +=
							safeParseFloat(room.pricingByDay[0].rootPrice) * room.count;
					}
					return room;
				} else {
					// We need to recalc from the DB's base pricing
					const matchedRoom = selectedHotel.roomCountDetails?.find(
						(r) =>
							r.roomType.trim() === room.roomType.trim() &&
							r.displayName.trim() === room.displayName.trim()
					);
					if (!matchedRoom) {
						console.warn("No matching room found for", room);
						return room;
					}

					const recalculated = calculatePricingByDayWithCommission(
						matchedRoom.pricingRate || [],
						startDate,
						endDate,
						safeParseFloat(matchedRoom.price?.basePrice, 0),
						safeParseFloat(matchedRoom.defaultCost, 0),
						safeParseFloat(
							matchedRoom.roomCommission ?? selectedHotel.commission ?? 0.1
						)
					);

					const roomTotalRoot = recalculated.reduce(
						(acc, d) => acc + safeParseFloat(d.rootPrice),
						0
					);
					const roomTotalWithComm = recalculated.reduce(
						(acc, d) => acc + safeParseFloat(d.totalPriceWithCommission),
						0
					);
					const roomTotalCommission = recalculated.reduce(
						(acc, d) =>
							acc +
							(safeParseFloat(d.totalPriceWithCommission) -
								safeParseFloat(d.rootPrice)),
						0
					);

					sumHotelCost += roomTotalRoot * room.count;
					sumGrandTotal += roomTotalWithComm * room.count;
					sumCommission += roomTotalCommission * room.count;

					// For the first day’s root price:
					if (recalculated[0]) {
						sumOneNightCost +=
							safeParseFloat(recalculated[0].rootPrice) * room.count;
					}
					return { ...room, pricingByDay: recalculated };
				}
			});

			// Now set the final states
			setSelectedRooms(updatedRooms);
			setHotelCost(Number(sumHotelCost.toFixed(2)));
			setTotalAmount(Number(sumGrandTotal.toFixed(2)));
			setTotalCommission(Number(sumCommission.toFixed(2)));
			setOneNightCost(Number(sumOneNightCost.toFixed(2)));
			setNumberOfNights(nights);

			// Default deposit = Commission + OneNight
			const deposit = sumCommission + sumOneNightCost;
			setDefaultDeposit(Number(deposit.toFixed(2)));
		},
		[
			checkInDate,
			checkOutDate,
			selectedRooms,
			selectedHotel,
			calculatePricingByDayWithCommission,
		]
	);

	// 5) Re-run `calculateTotals` if checkInDate, checkOutDate, or selectedRooms change
	useEffect(() => {
		const prev = prevValues.current;
		const dateChanged =
			!dayjs(prev.checkInDate).isSame(checkInDate, "day") ||
			!dayjs(prev.checkOutDate).isSame(checkOutDate, "day");
		const roomsChanged =
			JSON.stringify(prev.selectedRooms) !== JSON.stringify(selectedRooms);

		if (dateChanged || roomsChanged) {
			calculateTotals(selectedRooms);
			prevValues.current = { checkInDate, checkOutDate, selectedRooms };
		}
	}, [checkInDate, checkOutDate, selectedRooms, calculateTotals]);

	// 6) Advance Payment Option changes => recalc finalDeposit
	useEffect(() => {
		if (advancePaymentOption === "commission_plus_one_day") {
			setFinalDeposit(defaultDeposit);
		} else if (advancePaymentOption === "percentage") {
			const p = safeParseFloat(advancePaymentPercentage, 0);
			let depositCalc = totalAmount * (p / 100);
			if (depositCalc < 0) depositCalc = 0;
			setFinalDeposit(depositCalc);
		} else if (advancePaymentOption === "sar") {
			const amt = safeParseFloat(advancePaymentSAR, 0);
			setFinalDeposit(amt < 0 ? 0 : amt);
		}
	}, [
		advancePaymentOption,
		advancePaymentPercentage,
		advancePaymentSAR,
		defaultDeposit,
		totalAmount,
	]);

	// ------------------ Separate DatePicker Handlers ------------------

	/**
	 * Preserve the # of nights if user changes "From date".
	 * If user had both from & to, we shift the "To date" so the nights remain the same.
	 */
	const handleCheckInDateChange = (value) => {
		if (!value) {
			setCheckInDate(null);
			return;
		}
		const newDate = dayjs(value);
		// If we already have an old from date & to date, preserve the difference in nights
		if (checkInDate && checkOutDate) {
			const oldNights = dayjs(checkOutDate).diff(dayjs(checkInDate), "day");
			if (oldNights > 0) {
				const newCheckOut = newDate.add(oldNights, "day");
				setCheckOutDate(newCheckOut);
			}
		} else if (checkOutDate && newDate.isSameOrAfter(checkOutDate, "day")) {
			// If no old from date but we had a checkOut, ensure checkOut is after
			setCheckOutDate(null);
		}
		setCheckInDate(newDate);
	};

	/**
	 * If user picks a new "To date," we just set it. If it's blank => null.
	 */
	const handleCheckOutDateChange = (value) => {
		if (!value) {
			setCheckOutDate(null);
			return;
		}
		const newDate = dayjs(value);
		setCheckOutDate(newDate);
	};

	// Optional: disable past dates for checkIn
	const disableCheckInDate = (current) => {
		// For example, disable all past:
		return current && current < dayjs().startOf("day");
	};
	// Grey out checkOut until user picks checkIn. Also disable any date <= checkIn.
	const disableCheckOutDate = (current) => {
		if (!checkInDate) return true;
		return current && current <= dayjs(checkInDate).startOf("day");
	};
	// ------------------------------------------------------------------

	// Room Selection & counts
	const handleRoomSelectionChange = (value, index) => {
		const [roomType, displayName] = value.split("|");
		const updated = [...selectedRooms];
		updated[index] = {
			...updated[index],
			roomType: roomType.trim(),
			displayName: displayName.trim(),
			pricingByDay: [],
		};
		setSelectedRooms(updated);
		setTimeout(() => calculateTotals(updated), 0);
	};

	const handleRoomCountChange = (cnt, index) => {
		const updated = [...selectedRooms];
		updated[index] = { ...updated[index], count: cnt };
		setSelectedRooms(updated);
		setTimeout(() => calculateTotals(updated), 0);
	};

	const addRoomSelection = () => {
		setSelectedRooms((prev) => [
			...prev,
			{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
		]);
	};

	const removeRoomSelection = (index) => {
		const updated = [...selectedRooms];
		updated.splice(index, 1);
		setSelectedRooms(updated);
		setTimeout(() => calculateTotals(updated), 0);
	};

	// Edit Pricing Modal
	const openModal = (roomIndex) => {
		setEditingRoomIndex(roomIndex);
		setIsModalVisible(true);
	};
	const closeModal = () => {
		setEditingRoomIndex(null);
		setIsModalVisible(false);
	};
	const handlePricingUpdate = (updatedPricingByDay) => {
		const updated = selectedRooms.map((room, i) =>
			i === editingRoomIndex
				? { ...room, pricingByDay: updatedPricingByDay }
				: room
		);
		setSelectedRooms(updated);
		setTimeout(() => calculateTotals(updated), 0);
	};

	// Clear All
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

		setHotelCost(0);
		setTotalAmount(0);
		setTotalCommission(0);
		setNumberOfNights(0);
		setOneNightCost(0);
		setDefaultDeposit(0);
		setFinalDeposit(0);

		setAdvancePaymentOption("commission_plus_one_day");
		setAdvancePaymentPercentage("");
		setAdvancePaymentSAR("");
	};

	// Hotel dropdown
	const handleHotelChange = (hotelId) => {
		const newHotel = allHotels.find((ht) => ht._id === hotelId);
		if (selectedHotel && selectedHotel._id !== hotelId) {
			message.warning(
				"Hotel changed! Room selection and pricing will be reset."
			);
			clearAll();
		}
		setSelectedHotel(newHotel);
		setTimeout(() => calculateTotals(selectedRooms), 0);
	};

	// Submit
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
		if (!selectedRooms.every((r) => r.pricingByDay.length > 0)) {
			message.error("Please ensure all selected rooms have valid pricing.");
			return;
		}

		if (advancePaymentOption === "percentage") {
			const p = parseFloat(advancePaymentPercentage);
			if (isNaN(p) || p < 1 || p > 100) {
				message.error("Please enter a valid percentage between 1 and 100.");
				return;
			}
		}
		if (advancePaymentOption === "sar") {
			const amt = parseFloat(advancePaymentSAR);
			if (isNaN(amt) || amt < 1 || amt > totalAmount) {
				message.error(
					"Please enter a valid SAR amount between 1 and the total amount."
				);
				return;
			}
		}

		const transformPickedRoomsToPickedRoomsType = (rooms) => {
			return rooms.flatMap((room) =>
				Array.from({ length: room.count }, () => {
					const pricingDetails = room.pricingByDay.map((day) => ({
						date: day.date,
						price: day.totalPriceWithCommission,
						rootPrice: safeParseFloat(day.rootPrice),
						commissionRate: safeParseFloat(day.commissionRate),
						totalPriceWithCommission: safeParseFloat(
							day.totalPriceWithCommission
						),
						totalPriceWithoutCommission: safeParseFloat(day.price),
					}));
					const averagePriceWithCommission =
						pricingDetails.reduce(
							(acc, d) => acc + d.totalPriceWithCommission,
							0
						) / pricingDetails.length;

					return {
						room_type: room.roomType.trim(),
						displayName: room.displayName.trim(),
						chosenPrice: averagePriceWithCommission.toFixed(2),
						count: 1,
						pricingByDay: pricingDetails,
						totalPriceWithCommission: pricingDetails.reduce(
							(acc, d) => acc + d.totalPriceWithCommission,
							0
						),
						hotelShouldGet: pricingDetails.reduce(
							(acc, d) => acc + d.rootPrice,
							0
						),
					};
				})
			);
		};

		const pickedRoomsType =
			transformPickedRoomsToPickedRoomsType(selectedRooms);

		// If hotel changed, append or increment "_relocate" suffix
		let updatedConfirmationNumber = reservation.confirmation_number;
		if (selectedHotel._id !== reservation.hotelId._id) {
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
			total_rooms: selectedRooms.reduce((total, r) => total + r.count, 0),
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
			total_amount: totalAmount,
			payment: reservation.payment || "not paid",
			paid_amount: reservation.paid_amount || 0,
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
			advancePayment: {
				paymentPercentage:
					advancePaymentOption === "percentage" ? advancePaymentPercentage : "",
				finalAdvancePayment: finalDeposit.toFixed(2),
			},
		};

		try {
			setIsLoading(true);
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
			} else {
				message.error(response.message || "Error updating reservation.");
			}
		} catch (error) {
			console.error("Error updating reservation:", error);
			message.error("An error occurred while updating the reservation.");
		} finally {
			setIsLoading(false);
		}
	};

	// Details Modal
	const showDetailsModal = () => setIsModalVisible2(true);
	const handleModalClose = () => setIsModalVisible2(false);

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
						<Spin tip='Loading...' />
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

					{/* Replace RangePicker with separate DatePickers */}
					<div className='col-md-6'>
						<Form.Item label='Check-in Date' required>
							<DatePicker
								className='w-100'
								format='YYYY-MM-DD'
								disabled={isLoading || !selectedHotel}
								disabledDate={disableCheckInDate}
								value={checkInDate}
								onChange={handleCheckInDateChange}
							/>
						</Form.Item>
					</div>
					<div className='col-md-6'>
						<Form.Item label='Check-out Date' required>
							<DatePicker
								className='w-100'
								format='YYYY-MM-DD'
								disabled={isLoading || !checkInDate || !selectedHotel}
								disabledDate={disableCheckOutDate}
								value={checkOutDate}
								onChange={handleCheckOutDateChange}
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
								onChange={(val) => handleRoomSelectionChange(val, index)}
								disabled={isLoading || !selectedHotel}
							>
								{selectedHotel &&
									selectedHotel.roomCountDetails?.map((roomDetail) => {
										const valueString = `${roomDetail.roomType}|${roomDetail.displayName}`;
										return (
											<Option key={valueString} value={valueString}>
												{roomDetail.displayName} ({roomDetail.roomType})
											</Option>
										);
									})}
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

				{/* ADVANCE PAYMENT OPTIONS */}
				<Form.Item label='Advance Payment Option' required>
					<Radio.Group
						onChange={(e) => setAdvancePaymentOption(e.target.value)}
						value={advancePaymentOption}
						disabled={isLoading}
					>
						<Radio value='commission_plus_one_day'>Commission + 1 Day</Radio>
						<Radio value='percentage'>Percentage (%)</Radio>
						<Radio value='sar'>SAR Amount</Radio>
					</Radio.Group>
				</Form.Item>

				{advancePaymentOption === "percentage" && (
					<Form.Item label='Advance Payment Percentage' required>
						<InputNumber
							min={1}
							max={100}
							value={advancePaymentPercentage}
							onChange={(val) => setAdvancePaymentPercentage(val)}
							style={{ width: "100%" }}
							disabled={isLoading}
						/>
					</Form.Item>
				)}

				{advancePaymentOption === "sar" && (
					<Form.Item label='Advance Payment in SAR' required>
						<InputNumber
							min={1}
							max={totalAmount}
							value={advancePaymentSAR}
							onChange={(val) => setAdvancePaymentSAR(val)}
							style={{ width: "100%" }}
							disabled={isLoading}
						/>
					</Form.Item>
				)}

				{/* Totals */}
				<Form.Item>
					<Descriptions bordered column={1} size='small'>
						<Descriptions.Item label='Total Amount (For the Hotel)'>
							{hotelCost.toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Total Commission'>
							{totalCommission.toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Cost of One Night (First Night)'>
							{oneNightCost.toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Total Deposit (Based on Option Above)'>
							{finalDeposit.toFixed(2)} SAR
						</Descriptions.Item>
						<Descriptions.Item label='Grand Total (Including Commission)'>
							{totalAmount.toFixed(2)} SAR
						</Descriptions.Item>

						<Descriptions.Item label='Paid Amount'>
							{reservation.payment_details?.onsite_paid_amount || 0} SAR{" "}
							<EditOutlined
								style={{ marginLeft: 8, cursor: "pointer" }}
								// Instead of opening "paidAmountModalVisible" directly, we open the verification modal:
								onClick={handleOpenPaidAmountEdit}
							/>
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

			{/* Possibly a "View Details" button */}
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

			{/* "MoreDetails" Modal */}
			<Modal
				open={isModalVisible2}
				onCancel={handleModalClose}
				className='float-right'
				width='84%'
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

			{/* Modal #1: VERIFY PASSWORD */}
			<Modal
				title='Password Verification'
				open={verifyPasswordModalVisible}
				closable={false} // remove "X" close button
				maskClosable={false} // clicking outside doesn't close
				keyboard={false} // pressing ESC doesn't close
				footer={[
					// Only an OK button that attempts to verify
					<Button key='ok' type='primary' onClick={handleVerifyPasswordSubmit}>
						OK
					</Button>,
				]}
			>
				<p>Please enter the admin password to proceed:</p>
				<Input.Password
					value={verifyPasswordInput}
					onChange={(e) => setVerifyPasswordInput(e.target.value)}
					placeholder='Enter password'
				/>
			</Modal>

			{/* Modal #2: Update Paid Amount */}
			<Modal
				title='Update Paid Amount'
				open={paidAmountModalVisible}
				onCancel={() => setPaidAmountModalVisible(false)}
				onOk={handlePaidAmountUpdate}
				confirmLoading={isLoading}
			>
				<p>Please enter the new paid amount below:</p>
				<InputNumber
					min={0}
					style={{ width: "100%" }}
					value={tempPaidAmount}
					onChange={(val) => setTempPaidAmount(val)}
				/>
			</Modal>
		</div>
	);
};

export default EditReservationMain;
