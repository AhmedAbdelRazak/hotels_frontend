import React, {
	useState,
	useEffect,
	useCallback,
	useRef,
	useMemo,
} from "react";
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
	Alert,
} from "antd";
import { EditOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { countryListWithAbbreviations } from "../CustomerService/utils";
import { isAuthenticated } from "../../auth";
import {
	gettingHotelDetailsForAdminAll,
	updateSingleReservation,
} from "../apiAdmin";
import EditPricingModal from "../JannatTools/EditPricingModal";
import MoreDetails from "../AllReservation/MoreDetails";

const { Option } = Select;

/** --------------------- Utils --------------------- */
const safeParseFloat = (val, fallback = 0) => {
	const n = parseFloat(val);
	return Number.isFinite(n) ? n : fallback;
};

/** Commission to percent:
 * - If <= 0 → fallback 10
 * - If 0 < value <= 1 → treat as fraction (0.1 => 10%)
 * - Else treat as percent (10 => 10%)
 */
const normalizeCommissionPercent = (raw) => {
	let r = safeParseFloat(raw, 10);
	if (r <= 0) r = 10;
	if (r <= 1) r = r * 100;
	return r;
};

/** Resolve daily "price" with your requested fallback chain */
const resolveDailyPrice = (matchedRate, basePrice, defaultCost) => {
	const cp = safeParseFloat(matchedRate?.price, NaN);
	const bp = safeParseFloat(basePrice, 0);
	const dc = safeParseFloat(defaultCost, 0);
	if (Number.isFinite(cp) && cp > 0) return cp;
	if (bp > 0) return bp;
	if (dc > 0) return dc;
	return 0;
};

/** Resolve daily "rootPrice" with similar fallback chain */
const resolveDailyRootPrice = (matchedRate, defaultCost) => {
	const mr = safeParseFloat(matchedRate?.rootPrice, NaN);
	const dc = safeParseFloat(defaultCost, 0);
	if (Number.isFinite(mr) && mr > 0) return mr;
	if (dc > 0) return dc;
	return 0;
};

const isExternalSource = (src) => {
	const s = String(src || "")
		.trim()
		.toLowerCase();
	return !!s && s !== "manual" && s !== "jannat employee";
};

// Client-side password (note: visible in bundle; server-side check is safer)
const PASSWORD_FOR_PAID_AMOUNT =
	process.env.REACT_APP_MANUAL_PAID_AMOUNT || "secret123";
const bookingSourceOptions = [
	"Jannat Employee",
	"affiliate",
	"manual",
	"booking.com",
	"trivago",
	"expedia",
	"agoda",
	"hotel.com",
	"airbnb",
];

const EditReservationMain = ({
	reservation,
	setReservation,
	chosenLanguage,
	hotelDetails,
	onReservationUpdated = () => {},
}) => {
	// ---------------- State ----------------
	const [selectedRooms, setSelectedRooms] = useState([
		{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
	]);
	const [name, setName] = useState("");
	const [nickName, setNickName] = useState("");
	const [email, setEmail] = useState("");
	const [checkInDate, setCheckInDate] = useState(null);
	const [checkOutDate, setCheckOutDate] = useState(null);
	const [adults, setAdults] = useState(1);
	const [children, setChildren] = useState(0);
	const [nationality, setNationality] = useState("");
	const [agentName, setAgentName] = useState("");
	const [phone, setPhone] = useState("");
	const [comment, setComment] = useState("");
	const [bookingSource, setBookingSource] = useState("Jannat Employee");
	const [confirmationNumber2, setConfirmationNumber2] = useState("");

	// Totals
	const [hotelCost, setHotelCost] = useState(0);
	const [totalAmount, setTotalAmount] = useState(0);
	const [totalCommission, setTotalCommission] = useState(0);
	const [numberOfNights, setNumberOfNights] = useState(0);
	const [oneNightCost, setOneNightCost] = useState(0);

	const [defaultDeposit, setDefaultDeposit] = useState(0);
	const [finalDeposit, setFinalDeposit] = useState(0);

	// Advance Payment
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

	// Paid-amount gating
	const [verifyPasswordModalVisible, setVerifyPasswordModalVisible] =
		useState(false);
	const [verifyPasswordInput, setVerifyPasswordInput] = useState("");
	const [paidAmountModalVisible, setPaidAmountModalVisible] = useState(false);
	const [tempPaidAmount, setTempPaidAmount] = useState(
		reservation?.payment_details?.onsite_paid_amount || 0
	);
	const pickerPopupStyle = { zIndex: 20010 };
	const pickerContainerGetter = (trigger) =>
		(trigger && trigger.parentNode) || document.body;

	useEffect(() => {
		setTempPaidAmount(reservation?.payment_details?.onsite_paid_amount || 0);
	}, [reservation]);

	const handleOpenPaidAmountEdit = () => {
		setVerifyPasswordModalVisible(true);
		setVerifyPasswordInput("");
	};

	const handleVerifyPasswordSubmit = () => {
		if (verifyPasswordInput.trim() === PASSWORD_FOR_PAID_AMOUNT) {
			setVerifyPasswordModalVisible(false);
			setPaidAmountModalVisible(true);
		} else {
			message.error("Incorrect password. Please try again.");
		}
	};

	const handlePaidAmountUpdate = async () => {
		try {
			setIsLoading(true);
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

	// Keep previous values to avoid unnecessary recalcs
	const prevValues = useRef({
		checkInDate: null,
		checkOutDate: null,
		selectedRooms: [],
	});

	// 1) Fetch hotels
	const getAllHotels = useCallback(async () => {
		setIsLoading(true);
		try {
			const data = await gettingHotelDetailsForAdminAll(user._id, token);
			if (data && !data.error) {
				const activeHotels = data.hotels.filter(
					(h) => h.activateHotel === true
				);
				const sorted = activeHotels.sort((a, b) =>
					a.hotelName.localeCompare(b.hotelName)
				);
				setAllHotels(sorted);
			} else {
				message.error("Failed to fetch hotels.");
			}
		} catch (e) {
			console.error(e);
			message.error("An error occurred while fetching hotels.");
		} finally {
			setIsLoading(false);
		}
	}, [user._id, token]);

	useEffect(() => {
		setAgentName(reservation.customer_details?.reservedBy || user.name || "");
		getAllHotels();
	}, [getAllHotels, user.name, reservation.customer_details?.reservedBy]);

	// 2) Prepopulate details & dates
	useEffect(() => {
		if (!reservation) return;
		setName(reservation.customer_details?.name || "");
		setNickName(reservation.customer_details?.nickName || "");
		setEmail(reservation.customer_details?.email || "");
		setPhone(reservation.customer_details?.phone || "");
		setNationality(reservation.customer_details?.nationality || "");
		setAdults(reservation.adults || 1);
		setChildren(reservation.children || 0);
		setBookingSource(reservation.booking_source || "Jannat Employee");
		setConfirmationNumber2(
			reservation.customer_details?.confirmation_number2 || ""
		);
		setCheckInDate(
			reservation.checkin_date ? dayjs(reservation.checkin_date) : null
		);
		setCheckOutDate(
			reservation.checkout_date ? dayjs(reservation.checkout_date) : null
		);
		setComment(reservation.comment || "");

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
	}, [reservation]);

	// 3) Pick current hotel + map existing rooms
	useEffect(() => {
		if (!reservation || allHotels.length === 0) return;
		const hotel = allHotels.find((h) => h._id === reservation.hotelId?._id);
		if (hotel) {
			setSelectedHotel(hotel);
			const mappedRooms = (reservation.pickedRoomsType || []).map((room) => ({
				roomType: room.room_type || "",
				displayName: room.displayName || "",
				count: room.count || 1,
				pricingByDay: room.pricingByDay || [],
			}));
			setSelectedRooms(
				mappedRooms.length
					? mappedRooms
					: [{ roomType: "", displayName: "", count: 1, pricingByDay: [] }]
			);
		} else {
			setSelectedHotel(null);
		}
	}, [reservation, allHotels]);

	// ---------- Pricing builders with new fallback ----------
	const getMatchedRoom = useCallback(
		(roomType, displayName) =>
			selectedHotel?.roomCountDetails?.find(
				(r) =>
					(r.roomType || "").trim() === (roomType || "").trim() &&
					(r.displayName || "").trim() === (displayName || "").trim()
			),
		[selectedHotel]
	);

	/**
	 * Build date-by-date rows with the requested fallbacks:
	 * price: calendarPrice>0 ? calendarPrice : basePrice>0 ? basePrice : defaultCost>0 ? defaultCost : 0
	 * rootPrice: calendarRoot>0 ? calendarRoot : defaultCost>0 ? defaultCost : 0
	 * commissionRate: daily override if >0, else room/hotel commission (normalized to percent)
	 */
	const calculatePricingByDay = useCallback(
		(
			pricingRate = [],
			startDate,
			endDate,
			basePrice,
			defaultCost,
			commissionPercent
		) => {
			const start = dayjs(startDate).startOf("day");
			const end = dayjs(endDate).subtract(1, "day").startOf("day");
			const rows = [];

			const globalCommission = normalizeCommissionPercent(commissionPercent);

			let cur = start;
			while (cur.isBefore(end) || cur.isSame(end, "day")) {
				const d = cur.format("YYYY-MM-DD");
				const mr = pricingRate.find((r) => r.calendarDate === d);

				const price = resolveDailyPrice(mr, basePrice, defaultCost);
				const rootPrice = resolveDailyRootPrice(mr, defaultCost);

				// Commission: prefer daily if >0, else fallback to provided/global
				let dailyComm = mr?.commissionRate;
				dailyComm = Number.isFinite(parseFloat(dailyComm))
					? normalizeCommissionPercent(dailyComm)
					: globalCommission;
				if (!(dailyComm > 0)) dailyComm = globalCommission;

				rows.push({
					date: d,
					price,
					rootPrice,
					commissionRate: dailyComm,
				});

				cur = cur.add(1, "day");
			}

			return rows;
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
			commissionPercent
		) => {
			const raw = calculatePricingByDay(
				pricingRate,
				startDate,
				endDate,
				basePrice,
				defaultCost,
				commissionPercent
			);
			return raw.map((day) => ({
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

	const buildPricingForRoom = useCallback(
		(matchedRoom, start, end) => {
			if (!matchedRoom) return [];
			const basePrice = safeParseFloat(matchedRoom?.price?.basePrice, 0);
			const defaultCost = safeParseFloat(matchedRoom?.defaultCost, 0);
			let commission =
				matchedRoom?.roomCommission ?? selectedHotel?.commission ?? 10;
			commission = normalizeCommissionPercent(commission);

			return calculatePricingByDayWithCommission(
				matchedRoom?.pricingRate || [],
				start,
				end,
				basePrice,
				defaultCost,
				commission
			);
		},
		[calculatePricingByDayWithCommission, selectedHotel?.commission]
	);
	// ---------------------------------------------------------

	/** Totals recompute */
	const calculateTotals = useCallback(
		(rooms = selectedRooms) => {
			if (!selectedHotel || !checkInDate || !checkOutDate) return;
			if (!rooms || rooms.length === 0) return;

			const startDate = dayjs(checkInDate).startOf("day");
			const endDate = dayjs(checkOutDate).startOf("day");
			let nights = endDate.diff(startDate, "day");
			if (nights < 1) nights = 1;

			let sumHotelCost = 0;
			let sumGrandTotal = 0;
			let sumCommission = 0;
			let sumOneNightCost = 0;

			const updated = rooms.map((room) => {
				if (!room.roomType || !room.displayName) return room;

				const lengthMismatch =
					!room.pricingByDay || room.pricingByDay.length !== nights;
				if (lengthMismatch) {
					const matchedRoom = getMatchedRoom(room.roomType, room.displayName);
					if (matchedRoom) {
						room = {
							...room,
							pricingByDay: buildPricingForRoom(
								matchedRoom,
								startDate,
								endDate
							),
						};
					}
				}

				if (!room.pricingByDay || room.pricingByDay.length === 0) return room;

				const roomTotalRoot = room.pricingByDay.reduce(
					(acc, day) => acc + safeParseFloat(day.rootPrice, 0),
					0
				);
				const roomTotalWithComm = room.pricingByDay.reduce(
					(acc, day) => acc + safeParseFloat(day.totalPriceWithCommission, 0),
					0
				);
				const roomTotalCommission = room.pricingByDay.reduce(
					(acc, day) =>
						acc +
						(safeParseFloat(day.totalPriceWithCommission, 0) -
							safeParseFloat(day.rootPrice, 0)),
					0
				);

				sumHotelCost += roomTotalRoot * room.count;
				sumGrandTotal += roomTotalWithComm * room.count;
				sumCommission += roomTotalCommission * room.count;

				if (room.pricingByDay[0]) {
					sumOneNightCost +=
						safeParseFloat(room.pricingByDay[0].rootPrice, 0) * room.count;
				}

				return room;
			});

			setSelectedRooms(updated);
			setHotelCost(Number(sumHotelCost.toFixed(2)));
			setTotalAmount(Number(sumGrandTotal.toFixed(2)));
			setTotalCommission(Number(sumCommission.toFixed(2)));
			setOneNightCost(Number(sumOneNightCost.toFixed(2)));
			setNumberOfNights(nights);

			const deposit = sumCommission + sumOneNightCost;
			setDefaultDeposit(Number(deposit.toFixed(2)));
		},
		[
			checkInDate,
			checkOutDate,
			selectedRooms,
			selectedHotel,
			getMatchedRoom,
			buildPricingForRoom,
		]
	);

	// Trigger totals when dates/rooms change
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

	// Advance payment compute
	useEffect(() => {
		if (advancePaymentOption === "commission_plus_one_day") {
			setFinalDeposit(defaultDeposit);
		} else if (advancePaymentOption === "percentage") {
			const p = safeParseFloat(advancePaymentPercentage, 0);
			let calc = totalAmount * (p / 100);
			if (calc < 0) calc = 0;
			setFinalDeposit(calc);
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

	// ---------------- Date handlers ----------------
	const handleCheckInDateChange = (value) => {
		if (!value) {
			setCheckInDate(null);
			return;
		}
		const newDate = dayjs(value);
		if (checkInDate && checkOutDate) {
			const oldNights = dayjs(checkOutDate).diff(dayjs(checkInDate), "day");
			if (oldNights > 0) {
				setCheckOutDate(newDate.add(oldNights, "day"));
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
		setCheckOutDate(dayjs(value));
	};

	const disableCheckInDate = (current) =>
		current && current < dayjs().startOf("day");
	const disableCheckOutDate = (current) => {
		if (!checkInDate) return true;
		return current && current <= dayjs(checkInDate).startOf("day");
	};

	// ---------------- Room selection ----------------
	const handleRoomSelectionChange = (value, index) => {
		const updated = [...selectedRooms];

		if (!value) {
			updated[index] = {
				roomType: "",
				displayName: "",
				count: 1,
				pricingByDay: [],
			};
			setSelectedRooms(updated);
			return;
		}

		const [roomType, displayName] = value.split("|");
		let nextRoom = {
			...updated[index],
			roomType: (roomType || "").trim(),
			displayName: (displayName || "").trim(),
			pricingByDay: [],
		};

		// Pre-populate nightly pricing if dates exist
		if (selectedHotel && checkInDate && checkOutDate) {
			const matched = getMatchedRoom(nextRoom.roomType, nextRoom.displayName);
			if (matched) {
				nextRoom.pricingByDay = buildPricingForRoom(
					matched,
					dayjs(checkInDate).startOf("day"),
					dayjs(checkOutDate).startOf("day")
				);
			}
		}

		updated[index] = nextRoom;
		setSelectedRooms(updated);
	};

	const handleRoomCountChange = (cnt, index) => {
		const updated = [...selectedRooms];
		updated[index] = { ...updated[index], count: cnt };
		setSelectedRooms(updated);
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
		setSelectedRooms(
			updated.length
				? updated
				: [{ roomType: "", displayName: "", count: 1, pricingByDay: [] }]
		);
	};

	// Edit pricing modal
	const openModal = (i) => {
		setEditingRoomIndex(i);
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
	};

	// ------------- Hotel change (Relocation) -------------
	const resetRoomsForNewHotel = useCallback(() => {
		// Only reset room-related state & totals — KEEP guest details & dates
		setSelectedRooms([
			{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
		]);
		setHotelCost(0);
		setTotalAmount(0);
		setTotalCommission(0);
		setOneNightCost(0);
		setDefaultDeposit(0);
		setFinalDeposit(0);
	}, []);

	const handleHotelChange = (hotelId) => {
		const newHotel = allHotels.find((ht) => ht._id === hotelId);
		if (!newHotel) return;

		const hotelChanged = !selectedHotel || selectedHotel._id !== hotelId;
		setSelectedHotel(newHotel);

		if (hotelChanged) {
			message.info(
				"Relocation: hotel changed — rooms & pricing reset. Please reselect and confirm."
			);
			resetRoomsForNewHotel();
		}
	};

	// Optional full clear
	const clearAll = () => {
		setSelectedRooms([
			{ roomType: "", displayName: "", count: 1, pricingByDay: [] },
		]);
		setName("");
		setNickName("");
		setEmail("");
		setCheckInDate(null);
		setCheckOutDate(null);
		setAdults(1);
		setChildren(0);
		setNationality("");
		setPhone("");
		setComment("");
		setBookingSource("Jannat Employee");
		setConfirmationNumber2("");

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

	// ---------------- Submit ----------------
	const handleSubmit = async () => {
		if (
			!name ||
			!email ||
			!phone ||
			!checkInDate ||
			!checkOutDate ||
			!selectedHotel ||
			!selectedRooms.every((r) => r.roomType && r.displayName && r.count > 0)
		) {
			message.error("Please fill in all required fields.");
			return;
		}
		if (
			!selectedRooms.every(
				(r) => Array.isArray(r.pricingByDay) && r.pricingByDay.length > 0
			)
		) {
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

		// Flatten to pickedRoomsType
		const pickedRoomsType = selectedRooms.flatMap((room) =>
			Array.from({ length: room.count }, () => {
				const pricingDetails = room.pricingByDay.map((day) => ({
					date: day.date,
					price: safeParseFloat(day.totalPriceWithCommission, 0),
					rootPrice: safeParseFloat(day.rootPrice, 0),
					commissionRate: safeParseFloat(day.commissionRate, 0),
					totalPriceWithCommission: safeParseFloat(
						day.totalPriceWithCommission,
						0
					),
					totalPriceWithoutCommission: safeParseFloat(day.price, 0),
				}));
				const totalWithComm = pricingDetails.reduce(
					(acc, d) => acc + d.totalPriceWithCommission,
					0
				);
				const avgNight =
					pricingDetails.length > 0 ? totalWithComm / pricingDetails.length : 0;

				return {
					room_type: room.roomType.trim(),
					displayName: room.displayName.trim(),
					chosenPrice: avgNight.toFixed(2),
					count: 1,
					pricingByDay: pricingDetails,
					totalPriceWithCommission: totalWithComm,
					hotelShouldGet: pricingDetails.reduce(
						(acc, d) => acc + d.rootPrice,
						0
					),
				};
			})
		);

		// Client-side relocate suffix (server also handles/overrides)
		let updatedConfirmationNumber = reservation.confirmation_number;
		if (selectedHotel._id !== reservation.hotelId._id) {
			const relocatePattern = /_relocate(\d*)$/;
			const m = updatedConfirmationNumber.match(relocatePattern);
			if (m) {
				const c = m[1] ? parseInt(m[1], 10) + 1 : 2;
				updatedConfirmationNumber = updatedConfirmationNumber.replace(
					relocatePattern,
					`_relocate${c}`
				);
			} else {
				updatedConfirmationNumber += "_relocate";
			}
		}

		const belongsToId =
			(selectedHotel.belongsTo && selectedHotel.belongsTo._id) ||
			selectedHotel.belongsTo ||
			"";

		const reservationData = {
			userId: user ? user._id : null,
			hotelId: selectedHotel._id,
			belongsTo: belongsToId,
			hotel_name: selectedHotel.hotelName || "",
			customerDetails: {
				name,
				nickName,
				email,
				phone,
				passport: reservation.customer_details?.passport || "Not Provided",
				passportExpiry:
					reservation.customer_details?.passportExpiry || "2027-01-01",
				nationality,
				postalCode: reservation.customer_details?.postalCode || "00000",
				reservedBy: agentName,
				confirmation_number2: String(confirmationNumber2 || "").trim(),
			},
			total_rooms: selectedRooms.reduce((t, r) => t + r.count, 0),
			total_guests: adults + children,
			adults,
			children,
			checkin_date: dayjs(checkInDate).format("YYYY-MM-DD"),
			checkout_date: dayjs(checkOutDate).format("YYYY-MM-DD"),
			days_of_residence: numberOfNights,
			booking_source: bookingSource || "Jannat Employee",
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
				const incoming = response?.reservation || response || {};
				const mergedReservation = {
					...reservation,
					...incoming,
					hotelId: incoming.hotelId || reservation.hotelId,
					belongsTo: incoming.belongsTo || reservation.belongsTo,
				};
				setReservation(mergedReservation);
				onReservationUpdated(mergedReservation);
				window.scrollTo({ top: 0, behavior: "smooth" });
			} else {
				message.error(response?.message || "Error updating reservation.");
			}
		} catch (error) {
			console.error("Error updating reservation:", error);
			message.error("An error occurred while updating the reservation.");
		} finally {
			setIsLoading(false);
		}
	};

	// Is this a relocation?
	const isRelocation = useMemo(
		() =>
			selectedHotel &&
			reservation?.hotelId?._id &&
			selectedHotel._id !== reservation.hotelId._id,
		[selectedHotel, reservation?.hotelId?._id]
	);

	return (
		<div
			style={{
				padding: "24px",
				maxWidth: "1200px",
				width: "100%",
				margin: "0 auto",
			}}
		>
			<Form layout='vertical' onFinish={handleSubmit}>
				<Button
					type='primary'
					danger
					onClick={clearAll}
					style={{ marginBottom: 20 }}
				>
					Clear All
				</Button>

				<div
					style={{
						position: "sticky",
						top: 0,
						zIndex: 5,
						background: "#fff",
						padding: "8px 0",
						display: "flex",
						justifyContent: "flex-end",
						gap: 8,
						borderBottom: "1px solid #f0f0f0",
					}}
				>
					<Button
						type='primary'
						onClick={handleSubmit}
						htmlType='submit'
						disabled={isLoading}
						loading={isLoading}
					>
						Save Changes
					</Button>
				</div>

				{isLoading && (
					<div style={{ textAlign: "center", marginBottom: 20 }}>
						<Spin tip='Loading...' />
					</div>
				)}

				{/* Concise relocation notice */}
				{isRelocation && (
					<Alert
						type='info'
						showIcon
						icon={<ExclamationCircleOutlined />}
						message='Relocation notice: changing the hotel will relocate this reservation. Rooms & pricing have been reset; please reselect and confirm.'
						style={{ marginBottom: 12, padding: 8 }}
					/>
				)}

				<div className='my-3'>
					<h3 style={{ fontSize: "1.3rem", fontWeight: "bold" }}>
						Confirmation Number: {reservation.confirmation_number}
					</h3>
				</div>

				<Form.Item>
					<Checkbox
						checked={sendEmail}
						onChange={(e) => setSendEmail(e.target.checked)}
					>
						Send Email Notification
					</Checkbox>
				</Form.Item>

				<div className='row'>
					<div className='col-md-6'>
						<Form.Item label='Select Hotel'>
							<Select
								placeholder='Select a hotel'
								value={selectedHotel?._id}
								onChange={handleHotelChange}
								disabled={isLoading}
								getPopupContainer={(trigger) => trigger.parentNode}
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

					<div className='col-md-6'>
						<Form.Item label='Booking Source'>
							<Select
								placeholder='Select booking source'
								value={bookingSource}
								onChange={(val) => setBookingSource(val)}
								disabled={isLoading}
								getPopupContainer={(trigger) => trigger.parentNode}
							>
								{bookingSourceOptions.map((opt) => (
									<Option key={opt} value={opt}>
										{opt}
									</Option>
								))}
							</Select>
						</Form.Item>
					</div>
					{isExternalSource(bookingSource) && (
						<div className='col-md-6'>
							<Form.Item label='External Confirmation # (optional)'>
								<Input
									value={confirmationNumber2}
									onChange={(e) => setConfirmationNumber2(e.target.value)}
									disabled={isLoading}
									placeholder='Enter platform confirmation #'
								/>
							</Form.Item>
						</div>
					)}

					<div className='col-md-6'>
						<Form.Item label='Check-in Date' required>
							<DatePicker
								className='w-100'
								format='YYYY-MM-DD'
								disabled={isLoading || !selectedHotel}
								disabledDate={disableCheckInDate}
								value={checkInDate}
								onChange={handleCheckInDateChange}
								getPopupContainer={pickerContainerGetter}
								popupStyle={pickerPopupStyle}
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
								getPopupContainer={pickerContainerGetter}
								popupStyle={pickerPopupStyle}
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
								getPopupContainer={(trigger) => trigger.parentNode}
							>
								{selectedHotel &&
									selectedHotel.roomCountDetails?.map((d) => {
										const val = `${d.roomType}|${d.displayName}`;
										return (
											<Option key={val} value={val}>
												{d.displayName} ({d.roomType})
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
								<ul style={{ paddingLeft: 20 }}>
									{room.pricingByDay.map((day, i) => (
										<li key={i}>
											{day.date}:{" "}
											{Number(day.totalPriceWithCommission).toFixed(2)} SAR
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

				{/* Guest / reservation fields */}
				<div className='row my-3'>
					<div className='col-md-3'>
						<Form.Item label='Guest Name'>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={isLoading}
							/>
						</Form.Item>
					</div>
					<div className='col-md-3'>
						<Form.Item label='Nickname (optional)'>
							<Input
								value={nickName}
								onChange={(e) => setNickName(e.target.value)}
								disabled={isLoading}
							/>
						</Form.Item>
					</div>
					<div className='col-md-3'>
						<Form.Item label='Email'>
							<Input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={isLoading}
							/>
						</Form.Item>
					</div>
					<div className='col-md-3'>
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
									(option?.children ?? "")
										.toString()
										.toLowerCase()
										.includes(input.toLowerCase())
								}
								value={nationality}
								onChange={(val) => setNationality(val)}
								style={{ width: "100%" }}
								disabled={isLoading}
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
						<Form.Item label='Adults'>
							<InputNumber
								className='w-100'
								min={1}
								value={adults}
								onChange={(v) => setAdults(v)}
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
								onChange={(v) => setChildren(v)}
								disabled={isLoading}
							/>
						</Form.Item>
					</div>
					<div className='col-md-8'>
						<Form.Item label='Comment'>
							<Input.TextArea
								rows={4}
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								disabled={isLoading}
							/>
						</Form.Item>
					</div>
				</div>

				{/* Advance Payment */}
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
							onChange={(v) => setAdvancePaymentPercentage(v)}
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
							onChange={(v) => setAdvancePaymentSAR(v)}
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
					htmlType='submit'
					disabled={isLoading}
					loading={isLoading}
				>
					Submit
				</Button>
			</Form>

			{/* Optional "View Details" */}
			{selectedHotel &&
				selectedHotel._id &&
				reservationCreated &&
				selectedReservation &&
				selectedReservation._id && (
					<Button
						type='link'
						className='my-4'
						onClick={() => setIsModalVisible2(true)}
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

			{/* Details Modal */}
			<Modal
				open={isModalVisible2}
				onCancel={() => setIsModalVisible2(false)}
				className='float-right'
				width='84%'
				footer={[
					<Button key='close' onClick={() => setIsModalVisible2(false)}>
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
							onReservationUpdated={onReservationUpdated}
						/>
					)}
			</Modal>

			{/* Modal #1: VERIFY PASSWORD */}
			<Modal
				title='Password Verification'
				open={verifyPasswordModalVisible}
				closable={true}
				// maskClosable={false}
				keyboard={false}
				footer={[
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
