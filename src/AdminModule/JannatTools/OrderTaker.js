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
	Radio,
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

const { Option } = Select;

/** --------------------- Safe Parse Float --------------------- */
const safeParseFloat = (value, fallback = 0) => {
	const parsed = parseFloat(value);
	return isNaN(parsed) ? fallback : parsed;
};

const OrderTaker = ({ getUser, isSuperAdmin }) => {
	/** -------------- State Variables -------------- */
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

	// Grand Total (including commission):
	const [totalAmount, setTotalAmount] = useState(0);
	const [totalCommission, setTotalCommission] = useState(0);
	const [numberOfNights, setNumberOfNights] = useState(0);

	/** Advance Payment‐related state */
	const [hotelCost, setHotelCost] = useState(0); // Base total for the hotel
	const [oneNightCost, setOneNightCost] = useState(0); // Sum of first‐night “rootPrice” across all rooms
	const [defaultDeposit, setDefaultDeposit] = useState(0); // commission + oneNight
	const [finalDeposit, setFinalDeposit] = useState(0);

	// Radio options: "commission_plus_one_day", "percentage", or "sar"
	const [advancePaymentOption, setAdvancePaymentOption] = useState(
		"commission_plus_one_day"
	);
	const [advancePaymentPercentage, setAdvancePaymentPercentage] = useState("");
	const [advancePaymentSAR, setAdvancePaymentSAR] = useState("");

	const [allHotels, setAllHotels] = useState([]);
	const [selectedHotel, setSelectedHotel] = useState(null);

	// Edit Pricing Modal
	const [editingRoomIndex, setEditingRoomIndex] = useState(null);
	const [isModalVisible, setIsModalVisible] = useState(false);

	// Details Modal
	const [isModalVisible2, setIsModalVisible2] = useState(false);
	const [reservationCreated, setReservationCreated] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState("");

	const { user, token } = isAuthenticated();

	// Keep track of previous values to detect changes
	const prevValues = useRef({
		checkInDate: null,
		checkOutDate: null,
		selectedRooms: [],
		selectedHotel: null,
	});

	/** ------------------ Fetch All Hotels ------------------ */
	const getAllHotels = useCallback(async () => {
		try {
			const data = await gettingHotelDetailsForAdmin(user._id, token);
			if (data && !data.error) {
				// Only keep active hotels
				const activeHotels = data.filter((h) => h.activateHotel === true);
				// Sort by name
				const sortedHotels = activeHotels.sort((a, b) =>
					a.hotelName.localeCompare(b.hotelName)
				);

				// Super admin sees all
				if (isSuperAdmin) {
					setAllHotels(sortedHotels);
				} else {
					// For normal user, check userHotelsToSupport
					const userHotelsToSupport = getUser?.hotelsToSupport;
					if (
						!userHotelsToSupport ||
						userHotelsToSupport === "all" ||
						userHotelsToSupport.length === 0
					) {
						// Show all
						setAllHotels(sortedHotels);
					} else {
						// Filter
						const allowedIds = userHotelsToSupport.map((h) => h._id);
						const filtered = sortedHotels.filter((h) =>
							allowedIds.includes(h._id)
						);
						setAllHotels(filtered);
					}
				}
			} else {
				message.error("Failed to fetch hotels.");
			}
		} catch (error) {
			console.error("Error fetching hotels:", error);
			message.error("An error occurred while fetching hotels.");
		}
	}, [user._id, token, getUser, isSuperAdmin]);

	useEffect(() => {
		setAgentName(user?.name || "");
		getAllHotels();
		// eslint-disable-next-line
	}, [getAllHotels]);

	/**
	 * Return an array of day‐by‐day pricing from `startDate` to `endDate - 1`.
	 * Each day includes: { date, price, rootPrice, commissionRate }.
	 */
	const calculatePricingByDay = useCallback(
		(
			pricingRate = [], // from DB
			startDate,
			endDate,
			basePrice,
			defaultCost,
			commissionRate
		) => {
			const start = dayjs(startDate).startOf("day");
			// endDate is exclusive if we’re counting nights (subtract 1 day).
			const end = dayjs(endDate).subtract(1, "day").startOf("day");

			const dateArray = [];
			let currentDate = start;
			while (currentDate.isBefore(end) || currentDate.isSame(end, "day")) {
				const formattedDate = currentDate.format("YYYY-MM-DD");
				const rateForDate = pricingRate.find(
					(r) => r.calendarDate === formattedDate
				);

				// If that date has a special override:
				const price = rateForDate
					? safeParseFloat(rateForDate.price, basePrice)
					: basePrice;
				const rootPrice = rateForDate
					? safeParseFloat(rateForDate.rootPrice, defaultCost)
					: defaultCost;
				const dayCommission = rateForDate
					? safeParseFloat(rateForDate.commissionRate, commissionRate)
					: commissionRate;

				dateArray.push({
					date: formattedDate,
					price,
					rootPrice,
					// store numeric "10" => means 10%
					commissionRate: dayCommission,
				});
				currentDate = currentDate.add(1, "day");
			}
			return dateArray;
		},
		[]
	);

	/**
	 * For each day, compute:
	 *   totalPriceWithCommission = price + (rootPrice * (commissionRate/100))
	 *   totalPriceWithoutCommission = price
	 *
	 * We'll ensure `commissionRate` is at least 10 if DB or override is missing.
	 */
	const calculatePricingByDayWithCommission = useCallback(
		(
			pricingRate,
			startDate,
			endDate,
			basePrice,
			defaultCost,
			rawCommission
		) => {
			// Force fallback of 10 if rawCommission is 0 or not provided
			const baseCommission = rawCommission > 0 ? rawCommission : 10;

			const noCommissionArray = calculatePricingByDay(
				pricingRate,
				startDate,
				endDate,
				basePrice,
				defaultCost,
				baseCommission
			);

			return noCommissionArray.map((day) => {
				const totalPriceWithCommission =
					safeParseFloat(day.price) +
					safeParseFloat(day.rootPrice) * (day.commissionRate / 100);

				return {
					...day,
					totalPriceWithCommission,
					// This is key: store day.price in totalPriceWithoutCommission
					totalPriceWithoutCommission: safeParseFloat(day.price),
				};
			});
		},
		[calculatePricingByDay]
	);

	/**
	 * If a user manually set a total (room.manualTotal), we re-distribute that total
	 * across the new date range. We also use the old averageRootToTotalRatio to keep
	 * rootPrice and commission “proportional” to what the user had.
	 *
	 * We also preserve `room.commissionRate` if it exists, otherwise default to 10.
	 */
	const redistributeManualTotal = (room, newNights, newStart, newEnd) => {
		if (!room.manualTotal || !room.averageRootToTotalRatio) {
			// No manual override to preserve
			return null;
		}

		const newDailyFinalPrice = safeParseFloat(room.manualTotal, 0) / newNights;
		const ratio = safeParseFloat(room.averageRootToTotalRatio, 0);
		// If the user never set a commissionRate on the room object,
		// fallback to 10
		const fallbackRate = room.commissionRate || 10;

		const dayArray = [];
		let current = dayjs(newStart).startOf("day");
		let finalEnd = dayjs(newEnd).subtract(1, "day").startOf("day");

		while (current.isBefore(finalEnd) || current.isSame(finalEnd, "day")) {
			const dateStr = current.format("YYYY-MM-DD");
			const dailyRoot = newDailyFinalPrice * ratio;

			dayArray.push({
				date: dateStr,
				price: dailyRoot, // "price" = base no-comm portion
				rootPrice: dailyRoot,
				commissionRate: fallbackRate, // keep the stored rate or default 10
				totalPriceWithCommission: newDailyFinalPrice,
				totalPriceWithoutCommission: dailyRoot, // same as "price"
			});
			current = current.add(1, "day");
		}
		return dayArray;
	};

	/**
	 * Recalculate all relevant totals whenever called:
	 *  - If the user had a manual override, we re‐distribute it (if the date range changed).
	 *  - Otherwise, do normal DB or existing day‐by‐day logic.
	 */
	const calculateTotals = useCallback(
		(rooms = selectedRooms, forceRecalcFromDb = false) => {
			if (!selectedHotel || !checkInDate || !checkOutDate) {
				return;
			}
			if (!rooms || rooms.length === 0) return;

			const startDate = dayjs(checkInDate).startOf("day");
			const endDate = dayjs(checkOutDate).startOf("day");
			let nights = endDate.diff(startDate, "day");
			if (nights < 1) nights = 1; // at least 1 night

			let sumHotelCost = 0; // total rootPrice
			let sumGrandTotal = 0; // total with commission
			let sumCommission = 0; // total commission
			let sumOneNightCost = 0; // sum of rootPrice from first day for each room

			const updatedRooms = rooms.map((room) => {
				if (!room.roomType || !room.displayName) {
					return room;
				}

				// 1) If user has a "manualTotal" and the date changed, re-distribute
				const userWantsManualOverride =
					room.manualTotal && room.averageRootToTotalRatio;

				// 2) If no user override or if user never edited,
				//    do the old logic if forced or if length mismatch
				const oldLength = room.pricingByDay ? room.pricingByDay.length : 0;
				const lengthMismatch = oldLength !== nights;

				if (userWantsManualOverride && (lengthMismatch || forceRecalcFromDb)) {
					const reDistributed = redistributeManualTotal(
						room,
						nights,
						startDate,
						endDate
					);
					if (reDistributed && reDistributed.length) {
						room.pricingByDay = reDistributed;
					}
				} else if (!userWantsManualOverride) {
					if (forceRecalcFromDb || lengthMismatch) {
						// Find the DB record for this room
						const matched = selectedHotel?.roomCountDetails?.find(
							(r) =>
								r.roomType?.trim() === room.roomType.trim() &&
								r.displayName?.trim() === room.displayName.trim()
						);
						if (!matched) {
							console.warn("No matching room found for", room);
							return room;
						}

						const fallbackCommission = safeParseFloat(
							matched.roomCommission ?? selectedHotel.commission,
							10
						);
						const finalCommission =
							fallbackCommission > 0 ? fallbackCommission : 10;

						const recalculated = calculatePricingByDayWithCommission(
							matched.pricingRate || [],
							startDate,
							endDate,
							safeParseFloat(matched.price?.basePrice, 0),
							safeParseFloat(matched.defaultCost, 0),
							finalCommission
						);
						room.pricingByDay = recalculated;
					}
				}

				// Summation
				if (!room.pricingByDay || room.pricingByDay.length === 0) {
					return room; // skip if something's off
				}

				const roomTotalRoot = room.pricingByDay.reduce(
					(acc, day) => acc + safeParseFloat(day.rootPrice),
					0
				);
				const roomTotalWithComm = room.pricingByDay.reduce(
					(acc, day) => acc + safeParseFloat(day.totalPriceWithCommission),
					0
				);
				const roomTotalCommission = room.pricingByDay.reduce((acc, day) => {
					return (
						acc +
						(safeParseFloat(day.totalPriceWithCommission) -
							safeParseFloat(day.rootPrice))
					);
				}, 0);

				// multiply by the # of identical “count” rooms
				sumHotelCost += roomTotalRoot * room.count;
				sumGrandTotal += roomTotalWithComm * room.count;
				sumCommission += roomTotalCommission * room.count;

				// For the first day’s root price only:
				if (room.pricingByDay[0]) {
					sumOneNightCost +=
						safeParseFloat(room.pricingByDay[0].rootPrice) * room.count;
				}

				return room;
			});

			// Default deposit = sumCommission + sumOneNightCost
			const deposit = sumCommission + sumOneNightCost;

			setSelectedRooms(updatedRooms);
			setHotelCost(Number(sumHotelCost.toFixed(2)));
			setTotalAmount(Number(sumGrandTotal.toFixed(2)));
			setTotalCommission(Number(sumCommission.toFixed(2)));
			setOneNightCost(Number(sumOneNightCost.toFixed(2)));
			setNumberOfNights(nights);

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

	/**
	 * Whenever checkInDate, checkOutDate, selectedRooms, or selectedHotel changes,
	 * recalc totals if anything truly changed.
	 *
	 * If the date changed, we force a re-distribution of either DB pricing or
	 * user’s manual total.
	 */
	useEffect(() => {
		const prev = prevValues.current;
		const dateChanged =
			!dayjs(prev.checkInDate).isSame(checkInDate, "day") ||
			!dayjs(prev.checkOutDate).isSame(checkOutDate, "day");

		const roomsChanged =
			JSON.stringify(prev.selectedRooms) !== JSON.stringify(selectedRooms);
		const hotelChanged = prev.selectedHotel?._id !== selectedHotel?._id;

		if (dateChanged || roomsChanged || hotelChanged) {
			calculateTotals(selectedRooms, dateChanged);
			prevValues.current = {
				checkInDate,
				checkOutDate,
				selectedRooms,
				selectedHotel,
			};
		}
	}, [
		checkInDate,
		checkOutDate,
		selectedRooms,
		selectedHotel,
		calculateTotals,
	]);

	/**
	 * Update finalDeposit whenever user changes:
	 *   - advancePaymentOption,
	 *   - advancePaymentPercentage,
	 *   - advancePaymentSAR,
	 *   - defaultDeposit,
	 *   - totalAmount
	 */
	useEffect(() => {
		if (advancePaymentOption === "commission_plus_one_day") {
			setFinalDeposit(defaultDeposit);
		} else if (advancePaymentOption === "percentage") {
			const perc = safeParseFloat(advancePaymentPercentage, 0);
			let depositCalc = totalAmount * (perc / 100);
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

	/** ------------------------------ Handlers ------------------------------ */

	// Room Type selection
	const handleRoomSelectionChange = (value, index) => {
		const updated = [...selectedRooms];
		if (!value) {
			updated[index] = {
				roomType: "",
				displayName: "",
				count: 1,
				pricingByDay: [],
				manualTotal: null,
				averageRootToTotalRatio: null,
				commissionRate: 10,
			};
			setSelectedRooms(updated);
			return;
		}
		const [roomType, displayName] = value.split("|");
		updated[index] = {
			...updated[index],
			roomType: roomType.trim(),
			displayName: displayName.trim(),
			pricingByDay: [],
			// Reset manual overrides if user changes room type
			manualTotal: null,
			averageRootToTotalRatio: null,
			commissionRate: 10,
		};
		setSelectedRooms(updated);
	};

	// Room Count
	const handleRoomCountChange = (count, index) => {
		const updated = [...selectedRooms];
		updated[index].count = count;
		setSelectedRooms(updated);
	};

	// Add new room
	const addRoomSelection = () => {
		setSelectedRooms((prev) => [
			...prev,
			{
				roomType: "",
				displayName: "",
				count: 1,
				pricingByDay: [],
				commissionRate: 10, // default
			},
		]);
	};

	// Remove room
	const removeRoomSelection = (index) => {
		const updated = [...selectedRooms];
		updated.splice(index, 1);
		setSelectedRooms(updated);
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

	// After user edits day‐by‐day pricing, update the store
	const handlePricingUpdate = (updatedPricingByDay) => {
		// 1. Sum up daily final
		const sumWithComm = updatedPricingByDay.reduce(
			(acc, day) => acc + safeParseFloat(day.totalPriceWithCommission),
			0
		);
		// 2. averageRootToTotalRatio
		let ratio = 0;
		if (updatedPricingByDay.length > 0) {
			ratio =
				updatedPricingByDay.reduce((acc, day) => {
					const dayFinal = safeParseFloat(day.totalPriceWithCommission, 0);
					const dayRoot = safeParseFloat(day.rootPrice, 0);
					if (dayFinal <= 0) return acc;
					return acc + dayRoot / dayFinal;
				}, 0) / updatedPricingByDay.length;
		}

		// 3. Also derive a single "commissionRate" from the first day if needed:
		const firstDay = updatedPricingByDay[0];
		let newCommRate = 10; // default
		if (firstDay && safeParseFloat(firstDay.commissionRate) > 0) {
			newCommRate = safeParseFloat(firstDay.commissionRate, 10);
		}

		// 4. Update the correct room
		const updated = selectedRooms.map((room, i) =>
			i === editingRoomIndex
				? {
						...room,
						pricingByDay: updatedPricingByDay,
						manualTotal: sumWithComm > 0 ? sumWithComm : null,
						averageRootToTotalRatio: ratio > 0 ? ratio : 0,
						commissionRate: newCommRate,
				  }
				: room
		);
		setSelectedRooms(updated);
	};

	// Clear all fields
	const clearAll = () => {
		setSelectedRooms([
			{
				roomType: "",
				displayName: "",
				count: 1,
				pricingByDay: [],
				commissionRate: 10,
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

		setTotalAmount(0);
		setTotalCommission(0);
		setNumberOfNights(0);
		setHotelCost(0);
		setOneNightCost(0);
		setDefaultDeposit(0);
		setFinalDeposit(0);

		setAdvancePaymentOption("commission_plus_one_day");
		setAdvancePaymentPercentage("");
		setAdvancePaymentSAR("");
	};

	// Automatically preserve # of nights if user changes "From date"
	const handleCheckInDateChange = (value) => {
		if (!value) {
			setCheckInDate(null);
			return;
		}
		const newDate = dayjs(value);
		// If we already have from + to, preserve old difference
		if (checkInDate && checkOutDate) {
			const oldNights = dayjs(checkOutDate).diff(dayjs(checkInDate), "day");
			if (oldNights > 0) {
				const newCheckOut = newDate.add(oldNights, "day");
				setCheckOutDate(newCheckOut);
			}
		} else if (checkOutDate && newDate.isSameOrAfter(checkOutDate, "day")) {
			setCheckOutDate(null);
		}
		setCheckInDate(newDate);
	};

	const handleCheckOutDateChange = (value) => {
		if (!value) {
			setCheckOutDate(null);
			return;
		}
		const newDate = dayjs(value);
		setCheckOutDate(newDate);
	};

	// Disable past dates
	const disableCheckInDate = (current) => {
		return current && current < dayjs().startOf("day");
	};
	// Disable any check-out date on or before checkInDate
	const disableCheckOutDate = (current) => {
		if (!checkInDate) return true;
		return current && current <= dayjs(checkInDate).startOf("day");
	};

	// Hotel dropdown
	const handleHotelChange = (hotelId) => {
		if (!hotelId) {
			setSelectedHotel(null);
			clearAll();
			return;
		}
		const newHotel = allHotels.find((ht) => ht._id === hotelId);
		if (selectedHotel && selectedHotel._id !== hotelId) {
			message.warning(
				"Hotel changed! Room selection and pricing will be reset."
			);
			clearAll();
		}
		setSelectedHotel(newHotel);
	};

	// Submit form
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

		// Ensure each selected room has some pricing
		if (!selectedRooms.every((r) => r.pricingByDay.length > 0)) {
			message.error("Please ensure all selected rooms have valid pricing.");
			return;
		}

		// Validate deposit input
		if (advancePaymentOption === "percentage") {
			const p = safeParseFloat(advancePaymentPercentage, -1);
			if (p < 1 || p > 100) {
				message.error("Please enter a valid percentage between 1 and 100.");
				return;
			}
		}
		if (advancePaymentOption === "sar") {
			const amt = safeParseFloat(advancePaymentSAR, -1);
			if (amt < 1 || amt > totalAmount) {
				message.error(
					"Please enter a valid SAR amount between 1 and the total amount."
				);
				return;
			}
		}

		// Transform into the final format
		const transformPickedRooms = (rooms) => {
			return rooms.flatMap((room) =>
				Array.from({ length: room.count }, () => {
					// Summarize day‐by‐day:
					const pricingDetails = room.pricingByDay.map((day) => ({
						date: day.date,
						// The final nightly cost user sees
						price: day.totalPriceWithCommission,
						rootPrice: safeParseFloat(day.rootPrice),
						commissionRate: safeParseFloat(day.commissionRate),
						totalPriceWithCommission: safeParseFloat(
							day.totalPriceWithCommission
						),
						/**
						 * Key fix: capture the final "no‐commission" portion
						 * that your code truly wants:
						 */
						totalPriceWithoutCommission: safeParseFloat(
							day.totalPriceWithoutCommission
						),
					}));

					// Average out the day‐by‐day “price with comm”
					const avg =
						pricingDetails.reduce(
							(acc, d) => acc + d.totalPriceWithCommission,
							0
						) / pricingDetails.length;

					return {
						room_type: room.roomType.trim(),
						displayName: room.displayName.trim(),
						chosenPrice: avg.toFixed(2),
						count: 1, // because we flattened by “count”
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

		const pickedRoomsType = transformPickedRooms(selectedRooms);

		// The final reservation data
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
			total_rooms: selectedRooms.reduce((t, r) => t + r.count, 0),
			total_guests: adults + children,
			adults,
			children,
			checkin_date: checkInDate.format("YYYY-MM-DD"),
			checkout_date: checkOutDate.format("YYYY-MM-DD"),
			days_of_residence: numberOfNights,
			booking_source: "Jannat Employee",
			pickedRoomsType,
			total_amount: totalAmount, // Grand total
			payment: "Not Paid",
			paid_amount: 0,
			commission: totalCommission,
			commissionPaid: false,
			paymentDetails: {
				cardNumber: "",
				cardExpiryDate: "",
				cardCVV: "",
				cardHolderName: "",
			},
			sentFrom: "employee",
			/**
			 * The deposit object:
			 * By default => commission + first-night rootPrice,
			 * or if user picks percentage or SAR => we store that accordingly
			 */
			advancePayment: {
				paymentPercentage:
					advancePaymentOption === "percentage" ? advancePaymentPercentage : "",
				finalAdvancePayment: finalDeposit.toFixed(2),
			},
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

	// View Details modal
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

				<div className='row'>
					<div className='col-md-6'>
						<Form.Item label='Select Hotel' required>
							<Select
								placeholder='Select a hotel'
								value={selectedHotel?._id}
								onChange={handleHotelChange}
								allowClear
							>
								{allHotels.map((h) => (
									<Option key={h._id} value={h._id}>
										{h.hotelName}
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
				</div>

				{/* Check-in / Check-out DatePickers */}
				<div className='row'>
					<div className='col-md-6'>
						<Form.Item label='Check-in Date' required>
							<DatePicker
								className='w-100'
								format='YYYY-MM-DD'
								disabled={!selectedHotel}
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
								disabled={!selectedHotel || !checkInDate}
								disabledDate={disableCheckOutDate}
								value={checkOutDate}
								onChange={handleCheckOutDateChange}
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
								onChange={(v) => handleRoomSelectionChange(v, index)}
								disabled={!selectedHotel}
								allowClear
							>
								{selectedHotel?.roomCountDetails?.map((rd) => {
									const val = `${rd.roomType}|${rd.displayName}`;
									return (
										<Option key={val} value={val}>
											{rd.displayName} ({rd.roomType})
										</Option>
									);
								})}
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
								onChange={(val) => setNationality(val)}
								style={{ width: "100%" }}
								disabled={!selectedHotel}
							>
								{countryListWithAbbreviations.map((c) => (
									<Option key={c.code} value={c.code}>
										{c.name}
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
								onChange={(val) => setAdults(val)}
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
								onChange={(val) => setChildren(val)}
								disabled={!selectedHotel}
							/>
						</Form.Item>
					</div>
				</div>

				{/* Advance Payment Option */}
				<Form.Item label='Advance/ Deposit Payment Option' required>
					<Radio.Group
						onChange={(e) => setAdvancePaymentOption(e.target.value)}
						value={advancePaymentOption}
					>
						<Radio value='commission_plus_one_day'>Commission + 1 Day</Radio>
						<Radio value='percentage'>Percentage (%)</Radio>
						<Radio value='sar'>SAR Amount</Radio>
					</Radio.Group>
				</Form.Item>

				{advancePaymentOption === "percentage" && (
					<Form.Item label='Deposit Payment Percentage' required>
						<InputNumber
							min={1}
							max={100}
							value={advancePaymentPercentage}
							onChange={(val) => setAdvancePaymentPercentage(val)}
							style={{ width: "100%" }}
						/>
					</Form.Item>
				)}
				{advancePaymentOption === "sar" && (
					<Form.Item label='Deposit Payment in SAR' required>
						<InputNumber
							min={1}
							max={totalAmount}
							value={advancePaymentSAR}
							onChange={(val) => setAdvancePaymentSAR(val)}
							style={{ width: "100%" }}
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
							<span
								style={{
									fontSize: "1.3rem",
									fontWeight: "bold",
									color: "darkgreen",
								}}
							>
								{totalAmount.toFixed(2)} SAR
							</span>
						</Descriptions.Item>
						<Descriptions.Item label='Paid Amount'>
							{selectedReservation?.payment_details?.paid_amount || 0} SAR
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
				selectedReservation?._id && (
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
			/>

			{/* Reservation Details Modal */}
			<Modal
				open={isModalVisible2}
				onCancel={handleModalClose}
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
					selectedReservation?._id && (
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
