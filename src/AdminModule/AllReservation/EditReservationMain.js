import React, {
	useState,
	useEffect,
	useCallback,
	useRef,
	useMemo,
} from "react";
import { createGlobalStyle } from "styled-components";
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
	getAdminHotelInventoryAvailability,
	gettingHotelDetailsForAdminAll,
	updateSingleReservation,
} from "../apiAdmin";
import EditPricingModal from "../JannatTools/EditPricingModal";
import MoreDetails from "../AllReservation/MoreDetails";
import { SUPER_USER_IDS } from "../utils/superUsers";

const { Option } = Select;

const resolvePopupContainer = (triggerNode) => {
	if (typeof document === "undefined") {
		return triggerNode || null;
	}
	if (!triggerNode) {
		return document.body;
	}
	return (
		triggerNode.closest(".ant-modal-content, .ant-drawer-content") ||
		triggerNode.parentNode ||
		document.body
	);
};

/** --------------------- Utils --------------------- */
const safeParseFloat = (val, fallback = 0) => {
	const n = parseFloat(String(val ?? "").replace(/,/g, "").trim());
	return Number.isFinite(n) ? n : fallback;
};

const roundMoney = (value) => Number(safeParseFloat(value, 0).toFixed(2));

const normalizeRoomCount = (count) => Math.max(1, Number(count || 1) || 1);

const hasExplicitMoneyInput = (value) =>
	value !== null &&
	value !== undefined &&
	value !== "" &&
	Number.isFinite(Number(String(value).replace(/,/g, "").trim()));

const firstExplicitMoney = (...values) => {
	for (const value of values) {
		if (hasExplicitMoneyInput(value)) return roundMoney(value);
	}
	return null;
};

const dateOnlyKey = (value) => {
	if (!value) return "";
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

const datePickerValue = (value) => {
	const key = dateOnlyKey(value);
	return key ? dayjs(key) : null;
};

const resolveAdminPricingDay = (day = {}) => {
	const clientPrice = roundMoney(
		firstExplicitMoney(
			day.clientPrice,
			day.mainPrice,
			day.totalPriceWithCommission,
			day.price,
		) ?? 0,
	);
	const rootPrice = firstExplicitMoney(
		day.rootPrice,
		day.totalPriceWithoutCommission,
	) ?? 0;
	const explicitNet = firstExplicitMoney(
		day.netAfterExpenses,
		day.netAfterOtaExpenses,
		day.netAfterOtherExpenses,
	);
	const explicitExpense = firstExplicitMoney(
		day.otaExpenseAmount,
		day.otherExpenseAmount,
		day.expenseAmount,
	);
	const netAfterExpenses = roundMoney(
		explicitNet !== null
			? explicitNet
			: explicitExpense !== null
			? clientPrice - explicitExpense
			: clientPrice - safeParseFloat(day.otaExpenseAmount, 0),
	);
	const otaExpenseAmount =
		explicitExpense !== null
			? explicitExpense
			: roundMoney(clientPrice - netAfterExpenses);
	const platformMargin =
		firstExplicitMoney(day.platformMargin, day.platformMarginAmount) ??
		roundMoney(netAfterExpenses - rootPrice);

	return {
		date: day.date,
		price: clientPrice,
		clientPrice,
		mainPrice: clientPrice,
		rootPrice,
		commissionRate: safeParseFloat(day.commissionRate, 0),
		totalPriceWithCommission: clientPrice,
		totalPriceWithoutCommission: rootPrice,
		netAfterExpenses,
		netAfterOtaExpenses: netAfterExpenses,
		otaExpenseAmount,
		platformMargin,
	};
};

const summarizeAdminPricingRooms = (rooms = []) =>
	(Array.isArray(rooms) ? rooms : []).reduce(
		(totals, room) => {
			const count = Math.max(1, Number(room?.count || 1) || 1);
			(Array.isArray(room?.pricingByDay) ? room.pricingByDay : []).forEach(
				(day) => {
					const clientPrice = roundMoney(
						firstExplicitMoney(
							day.clientPrice,
							day.mainPrice,
							day.totalPriceWithCommission,
							day.price
						) ?? 0
					);
					const rootPrice = roundMoney(
						firstExplicitMoney(day.rootPrice, day.totalPriceWithoutCommission) ??
							0
					);
					const explicitNet = firstExplicitMoney(
						day.netAfterExpenses,
						day.netAfterOtaExpenses,
						day.netAfterOtherExpenses
					);
					const explicitExpense = firstExplicitMoney(
						day.otaExpenseAmount,
						day.otherExpenseAmount,
						day.expenseAmount
					);
					const netAfterExpenses = roundMoney(
						explicitNet !== null
							? explicitNet
							: explicitExpense !== null
							? clientPrice - explicitExpense
							: clientPrice - safeParseFloat(day.otaExpenseAmount, 0)
					);
					totals.clientTotal = roundMoney(
						totals.clientTotal + clientPrice * count,
					);
					totals.rootTotal = roundMoney(totals.rootTotal + rootPrice * count);
					totals.netAfterExpensesTotal = roundMoney(
						totals.netAfterExpensesTotal + netAfterExpenses * count,
					);
					totals.otaExpenseTotal = roundMoney(
						totals.otaExpenseTotal + (clientPrice - netAfterExpenses) * count,
					);
					totals.platformMarginTotal = roundMoney(
						totals.platformMarginTotal +
							(netAfterExpenses - rootPrice) * count,
					);
				},
			);
			return totals;
		},
		{
			clientTotal: 0,
			rootTotal: 0,
			netAfterExpensesTotal: 0,
			otaExpenseTotal: 0,
			platformMarginTotal: 0,
		},
	);

const normalizeRoomLabel = (value) => String(value || "").trim().toLowerCase();
const availabilityKey = (roomType, displayName) =>
	`${normalizeRoomLabel(displayName)}|${normalizeRoomLabel(roomType)}`;
const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
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

const isAdminManagedPricingReservation = (reservation = {}) => {
	const pricingMode = String(reservation?.adminPricing?.mode || "").toLowerCase();
	return (
		reservation?.adminPricingVisibility?.rootOnlyForHotelManagement === true ||
		/(ota|admin_three_price|platform)/i.test(pricingMode)
	);
};

const savedCommissionForReservation = (reservation = {}) =>
	firstExplicitMoney(
		reservation?.commission,
		reservation?.adminPricing?.commissionAmount,
		reservation?.financial_cycle?.commissionAmount,
		reservation?.financial_cycle?.commissionValue
	);

const createCentAllocator = (
	total,
	unitCount,
	{ forceOverride = false } = {}
) => {
	const units = Math.max(0, Number(unitCount || 0));
	if (!units) return null;
	const totalCents = Math.round(safeParseFloat(total, 0) * 100);
	const baseCents = Math.trunc(totalCents / units);
	let remainder = totalCents - baseCents * units;

	const allocator = (count = 1) => {
		const rowUnits = normalizeRoomCount(count);
		let rowCents = 0;
		for (let i = 0; i < rowUnits; i += 1) {
			let cents = baseCents;
			if (remainder > 0) {
				cents += 1;
				remainder -= 1;
			} else if (remainder < 0) {
				cents -= 1;
				remainder += 1;
			}
			rowCents += cents;
		}
		return roundMoney(rowCents / rowUnits / 100);
	};
	allocator.forceOverride = forceOverride;
	return allocator;
};

const buildMissingMoneyAllocator = (
	rooms,
	total,
	pickExplicitValue,
	{ overrideWhenMismatch = false } = {}
) => {
	const totalValue = firstExplicitMoney(total);
	if (totalValue === null) return null;

	let explicitTotal = 0;
	let missingUnits = 0;
	let totalUnits = 0;
	rooms.forEach((room) => {
		const count = normalizeRoomCount(room?.count);
		(Array.isArray(room?.pricingByDay) ? room.pricingByDay : []).forEach(
			(day) => {
				totalUnits += count;
				const value = pickExplicitValue(day);
				if (value === null) {
					missingUnits += count;
				} else {
					explicitTotal += value * count;
				}
			}
		);
	});

	const hasMismatch = Math.abs(roundMoney(explicitTotal) - totalValue) > 0.01;
	if (!missingUnits) {
		return overrideWhenMismatch && totalUnits && hasMismatch
			? createCentAllocator(totalValue, totalUnits, { forceOverride: true })
			: null;
	}

	const remaining = roundMoney(totalValue - explicitTotal);
	if (remaining < 0 && Math.abs(remaining) > 0.01) {
		return overrideWhenMismatch && totalUnits
			? createCentAllocator(totalValue, totalUnits, { forceOverride: true })
			: null;
	}
	return createCentAllocator(Math.max(0, remaining), missingUnits);
};

const normalizeSavedAdminPricingRooms = (sourceRows = [], reservation = {}) => {
	const rawRooms = (Array.isArray(sourceRows) ? sourceRows : []).map((room) => ({
		...room,
		count: normalizeRoomCount(room?.count),
		pricingByDay: Array.isArray(room?.pricingByDay) ? room.pricingByDay : [],
	}));

	const adminPricing = reservation?.adminPricing || {};
	const pickClient = (day = {}) =>
		firstExplicitMoney(
			day.clientPrice,
			day.mainPrice,
			day.totalPriceWithCommission,
			day.price
		);
	const pickRoot = (day = {}) =>
		firstExplicitMoney(day.rootPrice, day.totalPriceWithoutCommission);
	const pickNet = (day = {}) =>
		firstExplicitMoney(
			day.netAfterExpenses,
			day.netAfterOtaExpenses,
			day.netAfterOtherExpenses
		);
	const pickExpense = (day = {}) =>
		firstExplicitMoney(
			day.otaExpenseAmount,
			day.otherExpenseAmount,
			day.expenseAmount
		);

	const clientAllocator = buildMissingMoneyAllocator(
		rawRooms,
		firstExplicitMoney(adminPricing.clientTotal, reservation?.total_amount),
		pickClient,
		{ overrideWhenMismatch: true }
	);
	const rootAllocator = buildMissingMoneyAllocator(
		rawRooms,
		firstExplicitMoney(adminPricing.rootTotal, reservation?.sub_total),
		pickRoot,
		{ overrideWhenMismatch: true }
	);
	const netAllocator = buildMissingMoneyAllocator(
		rawRooms,
		adminPricing.netAfterExpensesTotal,
		pickNet,
		{ overrideWhenMismatch: true }
	);
	const expenseAllocator = buildMissingMoneyAllocator(
		rawRooms,
		adminPricing.otaExpenseTotal,
		pickExpense
	);

	return rawRooms.map((room) => {
		const count = normalizeRoomCount(room?.count);
		const pricingByDay = room.pricingByDay.map((day = {}) => {
			const explicitClient = pickClient(day);
			const explicitRoot = pickRoot(day);
			const explicitNet = pickNet(day);
			const explicitExpense = pickExpense(day);
			const allocatedClient =
				clientAllocator?.forceOverride || explicitClient === null
					? clientAllocator?.(count)
					: undefined;
			const clientPrice = clientAllocator?.forceOverride
				? allocatedClient ?? 0
				: explicitClient ??
				  allocatedClient ??
				  firstExplicitMoney(room?.chosenPrice) ??
				  0;
			const allocatedRoot =
				rootAllocator?.forceOverride || explicitRoot === null
					? rootAllocator?.(count)
					: undefined;
			const rootPrice = rootAllocator?.forceOverride
				? allocatedRoot ?? 0
				: explicitRoot ?? allocatedRoot ?? 0;
			const allocatedNet =
				netAllocator?.forceOverride || explicitNet === null
					? netAllocator?.(count)
					: undefined;
			const allocatedExpense =
				explicitExpense === null &&
				explicitNet === null &&
				allocatedNet === undefined
					? expenseAllocator?.(count)
					: undefined;
			const netAfterExpenses = roundMoney(
				netAllocator?.forceOverride
					? allocatedNet ?? rootPrice
					: explicitNet ??
							allocatedNet ??
							(explicitExpense !== null
								? clientPrice - explicitExpense
								: allocatedExpense !== undefined && allocatedExpense !== null
								? clientPrice - allocatedExpense
								: rootPrice)
			);
			const otaExpenseAmount =
				explicitExpense !== null
					? explicitExpense
					: roundMoney(clientPrice - netAfterExpenses);
			const platformMargin =
				firstExplicitMoney(day.platformMargin, day.platformMarginAmount) ??
				roundMoney(netAfterExpenses - rootPrice);

			return {
				...day,
				date: dateOnlyKey(day.date) || day.date,
				price: clientPrice,
				clientPrice,
				mainPrice: clientPrice,
				rootPrice,
				commissionRate: safeParseFloat(day.commissionRate, 0),
				totalPriceWithCommission: clientPrice,
				totalPriceWithoutCommission: rootPrice,
				netAfterExpenses,
				netAfterOtaExpenses: netAfterExpenses,
				otaExpenseAmount,
				platformMargin,
			};
		});
		const averageClient =
			pricingByDay.length > 0
				? roundMoney(
						pricingByDay.reduce(
							(total, day) => total + safeParseFloat(day.clientPrice, 0),
							0
						) / pricingByDay.length
				  )
				: firstExplicitMoney(room?.chosenPrice) ?? 0;

		return {
			roomType: room.roomType || room.room_type || "",
			displayName: room.displayName || room.display_name || "",
			count,
			chosenPrice: firstExplicitMoney(room.chosenPrice, averageClient) ?? 0,
			pricingByDay,
		};
	});
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

const NESTED_MODAL_Z = 19050;
const NestedModalZFix = createGlobalStyle`
	.edit-reservation-nested-modal .ant-modal,
	.edit-reservation-nested-modal .ant-modal-wrap {
		z-index: ${NESTED_MODAL_Z} !important;
	}
	.edit-reservation-nested-modal .ant-modal-mask {
		z-index: ${NESTED_MODAL_Z - 1} !important;
	}
`;

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
	const [commissionOverride, setCommissionOverride] = useState(null);
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
	const [roomAvailability, setRoomAvailability] = useState([]);
	const [editingRoomIndex, setEditingRoomIndex] = useState(null);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isModalVisible2, setIsModalVisible2] = useState(false);
	const [hasExplicitPricingEdits, setHasExplicitPricingEdits] = useState(false);
	const [hasExplicitDateEdits, setHasExplicitDateEdits] = useState(false);
	const [reservationCreated, setReservationCreated] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState("");
	const [sendEmail, setSendEmail] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const { user, token } = isAuthenticated();
	const isSuperUser = SUPER_USER_IDS.includes(user?._id);
	const isArabic = chosenLanguage === "Arabic";
	const hasCommissionOverride =
		commissionOverride !== null &&
		commissionOverride !== undefined &&
		commissionOverride !== "";
	const adminManagedPricing = useMemo(
		() => isAdminManagedPricingReservation(reservation),
		[reservation]
	);
	const savedReservationCommission = useMemo(
		() => savedCommissionForReservation(reservation),
		[reservation]
	);
	const apiErrorMessage = (
		response,
		englishFallback = "Error updating reservation.",
		arabicFallback = "حدث خطأ أثناء تحديث الحجز."
	) =>
		isArabic
			? response?.errorArabic ||
			  response?.messageArabic ||
			  response?.error ||
			  response?.message ||
			  arabicFallback
			: response?.error ||
			  response?.message ||
			  response?.errorArabic ||
			  response?.messageArabic ||
			  englishFallback;
	const successMessage = (english, arabic) => (isArabic ? arabic : english);

	// Paid-amount gating
	const [verifyPasswordModalVisible, setVerifyPasswordModalVisible] =
		useState(false);
	const [verifyPasswordInput, setVerifyPasswordInput] = useState("");
	const [paidAmountModalVisible, setPaidAmountModalVisible] = useState(false);
	const [tempPaidAmount, setTempPaidAmount] = useState(
		reservation?.payment_details?.onsite_paid_amount || 0
	);
	const pickerPopupStyle = { zIndex: 20010 };
	const pickerContainerGetter = (trigger) => resolvePopupContainer(trigger);

	useEffect(() => {
		setTempPaidAmount(reservation?.payment_details?.onsite_paid_amount || 0);
	}, [reservation]);

	useEffect(() => {
		setSendEmail(false);
	}, [reservation]);

	const handleOpenPaidAmountEdit = () => {
		if (isSuperUser) {
			setVerifyPasswordModalVisible(false);
			setVerifyPasswordInput("");
			setPaidAmountModalVisible(true);
			return;
		}
		setVerifyPasswordModalVisible(true);
		setVerifyPasswordInput("");
	};

	const handleVerifyPasswordCancel = () => {
		setVerifyPasswordModalVisible(false);
		setVerifyPasswordInput("");
	};

	const handlePaidAmountCancel = () => {
		setPaidAmountModalVisible(false);
		setTempPaidAmount(reservation?.payment_details?.onsite_paid_amount || 0);
	};

	const handleVerifyPasswordSubmit = () => {
		if (isSuperUser) {
			setVerifyPasswordModalVisible(false);
			setVerifyPasswordInput("");
			setPaidAmountModalVisible(true);
			return;
		}
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
				const hotels = Array.isArray(data.hotels) ? data.hotels : [];
				const sorted = hotels.sort((a, b) =>
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
		setHasExplicitPricingEdits(false);
		setHasExplicitDateEdits(false);
		setCommissionOverride(
			reservation.commission !== null &&
				reservation.commission !== undefined &&
				reservation.commission !== ""
				? safeParseFloat(reservation.commission, 0)
				: null
		);
		setConfirmationNumber2(
			reservation.customer_details?.confirmation_number2 || ""
		);
		setCheckInDate(datePickerValue(reservation.checkin_date));
		setCheckOutDate(datePickerValue(reservation.checkout_date));
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
		const reservationHotelId = normalizeId(reservation.hotelId);
		const hotel = allHotels.find((h) => normalizeId(h) === reservationHotelId);
		if (hotel) {
			setSelectedHotel(hotel);
			const pricingRows = Array.isArray(reservation.pickedRoomsPricing)
				? reservation.pickedRoomsPricing
				: [];
			const regularRows = Array.isArray(reservation.pickedRoomsType)
				? reservation.pickedRoomsType
				: [];
			const sourceRows =
				adminManagedPricing && pricingRows.length
					? pricingRows
					: regularRows.length
					? regularRows
					: pricingRows;
			const mappedRooms = adminManagedPricing
				? normalizeSavedAdminPricingRooms(sourceRows, reservation)
				: sourceRows.map((room) => ({
						roomType: room.room_type || "",
						displayName: room.displayName || room.display_name || "",
						count: normalizeRoomCount(room.count),
						chosenPrice: safeParseFloat(room.chosenPrice, 0),
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
	}, [reservation, allHotels, adminManagedPricing]);

	const availabilityByRoomKey = useMemo(() => {
		const map = new Map();
		(roomAvailability || []).forEach((room) => {
			const key = availabilityKey(
				room?.room_type || room?.roomType,
				room?.displayName || room?.display_name || room?.room_type
			);
			if (!map.has(key)) map.set(key, room);
		});
		return map;
	}, [roomAvailability]);

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
				totalPriceWithoutCommission: safeParseFloat(day.rootPrice),
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

	const buildPricingFromCurrentNightly = useCallback(
		(room, expectedDates = []) => {
			const rows = Array.isArray(room?.pricingByDay) ? room.pricingByDay : [];
			const averageNight =
				rows.length > 0
					? rows.reduce(
							(sum, day) =>
								sum +
								safeParseFloat(
									day.totalPriceWithCommission ?? day.price,
									0
								),
							0
					  ) / rows.length
					: 0;
			const chosenNightly = safeParseFloat(room?.chosenPrice, 0);
			const nightly = chosenNightly > 0 ? chosenNightly : averageNight;
			if (!(nightly > 0) || expectedDates.length === 0) return [];
			const firstTemplate = rows[0] || {};
			return expectedDates.map((date, index) => {
				const template =
					rows.find(
						(day) =>
							(day?.date ? dayjs(day.date).format("YYYY-MM-DD") : "") ===
							date
					) ||
					rows[index] ||
					firstTemplate;
				const totalPriceWithoutCommission = safeParseFloat(
					template.rootPrice ?? template.totalPriceWithoutCommission ?? template.price,
					nightly
				);
				const rootPrice = safeParseFloat(
					template.rootPrice,
					totalPriceWithoutCommission || nightly
				);
				return {
					...template,
					date,
					price: nightly,
					rootPrice,
					commissionRate: safeParseFloat(template.commissionRate, 0),
					totalPriceWithCommission: nightly,
					totalPriceWithoutCommission: rootPrice,
				};
			});
		},
		[]
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
			const expectedDates = Array.from({ length: nights }, (_, index) =>
				startDate.add(index, "day").format("YYYY-MM-DD")
			);

			const hasSavedAdminPricingRows =
				adminManagedPricing &&
				!hasExplicitDateEdits &&
				rooms.some(
					(room) =>
						Array.isArray(room?.pricingByDay) && room.pricingByDay.length > 0
				);
			if (hasSavedAdminPricingRows) {
				const updated = normalizeSavedAdminPricingRooms(rooms, reservation);
				const adminPricingTotals = summarizeAdminPricingRooms(updated);
				const oneNightRootCost = updated.reduce((sum, room) => {
					const firstDay = Array.isArray(room?.pricingByDay)
						? room.pricingByDay[0]
						: null;
					return (
						sum +
						safeParseFloat(firstDay?.rootPrice, 0) *
							normalizeRoomCount(room?.count)
					);
				}, 0);
				const rowNightCount = updated.reduce(
					(max, room) =>
						Math.max(
							max,
							Array.isArray(room?.pricingByDay)
								? room.pricingByDay.length
								: 0
						),
					0
				);
				const resolvedNights =
					Number(reservation?.days_of_residence || 0) || rowNightCount || nights;
				const effectiveCommission =
					savedReservationCommission !== null ? savedReservationCommission : 0;

				if (JSON.stringify(updated) !== JSON.stringify(rooms)) {
					setSelectedRooms(updated);
				}
				setHotelCost(adminPricingTotals.rootTotal);
				setTotalAmount(adminPricingTotals.clientTotal);
				setTotalCommission(effectiveCommission);
				setOneNightCost(Number(oneNightRootCost.toFixed(2)));
				setNumberOfNights(resolvedNights);
				setDefaultDeposit(
					Number((effectiveCommission + oneNightRootCost).toFixed(2))
				);
				return;
			}

			let sumHotelCost = 0;
			let sumGrandTotal = 0;
			let sumCommission = 0;
			let sumOneNightCost = 0;

			const updated = rooms.map((room) => {
				if (!room.roomType || !room.displayName) return room;

				const lengthMismatch =
					!room.pricingByDay || room.pricingByDay.length !== nights;
				const dateMismatch =
					Array.isArray(room.pricingByDay) &&
					room.pricingByDay.some(
						(day, index) =>
							(day?.date ? dayjs(day.date).format("YYYY-MM-DD") : "") !==
							expectedDates[index]
				);
				if (lengthMismatch || dateMismatch) {
					const projectedPricing = buildPricingFromCurrentNightly(
						room,
						expectedDates
					);
					if (projectedPricing.length > 0) {
						room = {
							...room,
							pricingByDay: projectedPricing,
						};
					} else {
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

			const effectiveCommission =
				adminManagedPricing && savedReservationCommission !== null
					? savedReservationCommission
					: Number(sumCommission.toFixed(2));

			setSelectedRooms(updated);
			setHotelCost(Number(sumHotelCost.toFixed(2)));
			setTotalAmount(Number(sumGrandTotal.toFixed(2)));
			setTotalCommission(effectiveCommission);
			setOneNightCost(Number(sumOneNightCost.toFixed(2)));
			setNumberOfNights(nights);

			const deposit = effectiveCommission + sumOneNightCost;
			setDefaultDeposit(Number(deposit.toFixed(2)));
		},
		[
			checkInDate,
			checkOutDate,
			selectedRooms,
			selectedHotel,
			adminManagedPricing,
			hasExplicitDateEdits,
			reservation,
			savedReservationCommission,
			getMatchedRoom,
			buildPricingForRoom,
			buildPricingFromCurrentNightly,
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
		setHasExplicitDateEdits(true);
		if (!value) {
			setCheckInDate(null);
			return;
		}
		const newDate = datePickerValue(value);
		if (checkInDate && checkOutDate) {
			const oldNights = dayjs(checkOutDate).diff(dayjs(checkInDate), "day");
			if (oldNights > 0) {
				setCheckOutDate(newDate.add(oldNights, "day"));
			}
		} else if (checkOutDate && !newDate.isBefore(checkOutDate, "day")) {
			setCheckOutDate(null);
		}
		setCheckInDate(newDate);
	};

	const handleCheckOutDateChange = (value) => {
		setHasExplicitDateEdits(true);
		if (!value) {
			setCheckOutDate(null);
			return;
		}
		setCheckOutDate(datePickerValue(value));
	};

	// Allow selecting any past or future date when editing
	const disableCheckInDate = () => false;
	const disableCheckOutDate = (current) => {
		if (!checkInDate) return true;
		return current && current <= dayjs(checkInDate).startOf("day");
	};

	// Availability fetch (admin/PMS endpoint)
	useEffect(() => {
		if (
			!selectedHotel?._id ||
			!checkInDate ||
			!checkOutDate ||
			!user?._id ||
			!token ||
			!dayjs(checkOutDate).isAfter(dayjs(checkInDate), "day")
		) {
			setRoomAvailability([]);
			return;
		}

		const start = dayjs(checkInDate).format("YYYY-MM-DD");
		const end = dayjs(checkOutDate).format("YYYY-MM-DD");

		getAdminHotelInventoryAvailability(user._id, token, selectedHotel._id, {
			start,
			end,
		}).then((data) => {
			if (data && data.error) {
				setRoomAvailability([]);
			} else {
				setRoomAvailability(Array.isArray(data) ? data : []);
			}
		});
	}, [selectedHotel?._id, checkInDate, checkOutDate, user?._id, token]);

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
		if (editingRoomIndex === null || editingRoomIndex === undefined) return;
		setHasExplicitPricingEdits(true);
		setSelectedRooms((currentRooms) =>
			currentRooms.map((room, i) =>
				i === editingRoomIndex
					? { ...room, pricingByDay: updatedPricingByDay }
					: room
			)
		);
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
		setCommissionOverride(null);
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
		if (isLoading) return;
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
				const pricingDetails = room.pricingByDay.map(resolveAdminPricingDay);
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
		const adminPricingTotals = summarizeAdminPricingRooms(pickedRoomsType);

		// Client-side relocate suffix (server also handles/overrides)
		let updatedConfirmationNumber = reservation.confirmation_number;
		if (normalizeId(selectedHotel) !== normalizeId(reservation.hotelId)) {
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
		const commissionToSave =
			isSuperUser && hasCommissionOverride
				? Number(safeParseFloat(commissionOverride, 0).toFixed(2))
				: adminManagedPricing && savedReservationCommission !== null
				? savedReservationCommission
				: totalCommission;

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
			__reservationDateUpdateIntent: hasExplicitDateEdits,
			days_of_residence: numberOfNights,
			booking_source: bookingSource || "Jannat Employee",
			pickedRoomsType,
			pickedRoomsPricing: pickedRoomsType,
			total_amount: totalAmount,
			sub_total: adminPricingTotals.rootTotal,
			adminPricing: {
				...(reservation?.adminPricing || {}),
				mode: reservation?.adminPricing?.mode || "admin_three_price",
				...adminPricingTotals,
				commissionAmount: commissionToSave,
			},
			__adminPricingUpdateIntent: hasExplicitPricingEdits,
			payment: reservation.payment || "not paid",
			paid_amount: reservation.paid_amount || 0,
			commission: commissionToSave,
			commissionPaid:
				reservation.commissionPaid ??
				reservation.payment_details?.commissionPaid ??
				false,
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
				message.success(
					successMessage(
						"Reservation updated successfully!",
						"تم تحديث الحجز بنجاح!"
					)
				);
				setReservationCreated(true);
				const incoming = response?.reservation || response || {};
				const mergedReservation = {
					...reservation,
					...incoming,
					hotelId: incoming.hotelId || reservation.hotelId,
					belongsTo: incoming.belongsTo || reservation.belongsTo,
				};
				const correctionResubmitted =
					response?.adminCorrectionResubmitted === true;
				const savedTitle = successMessage(
					correctionResubmitted
						? "Reservation corrected and resubmitted"
						: "Reservation updated and saved",
					correctionResubmitted
						? "\u062a\u0645 \u062a\u0635\u062d\u064a\u062d \u0627\u0644\u062d\u062c\u0632 \u0648\u0625\u0639\u0627\u062f\u062a\u0647 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629"
						: "\u062a\u0645 \u062d\u0641\u0638 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u062c\u0632"
				);
				setReservation(mergedReservation);
				setHasExplicitPricingEdits(false);
				setHasExplicitDateEdits(false);
				onReservationUpdated(mergedReservation);
				message.success({ content: savedTitle, duration: 6 });
				window.scrollTo({ top: 0, behavior: "smooth" });
			} else {
				message.error(apiErrorMessage(response));
			}
		} catch (error) {
			console.error("Error updating reservation:", error);
			message.error(
				successMessage(
					"An error occurred while updating the reservation.",
					"حدث خطأ أثناء تحديث الحجز."
				)
			);
		} finally {
			setIsLoading(false);
		}
	};

	// Is this a relocation?
	const isRelocation = useMemo(
		() =>
			selectedHotel &&
			normalizeId(reservation?.hotelId) &&
			normalizeId(selectedHotel) !== normalizeId(reservation.hotelId),
		[selectedHotel, reservation?.hotelId]
	);

	const paidAmountDisplay = useMemo(() => {
		const onsite = Number(reservation?.payment_details?.onsite_paid_amount || 0);
		const paid = Number(reservation?.paid_amount || 0);
		const status = String(
			reservation?.payment || reservation?.payment_status || ""
		)
			.toLowerCase()
			.trim();

		if (status === "paid offline") return onsite;
		if (status === "paid online") return paid;
		if (
			status === "credit/ debit" ||
			status === "credit/debit" ||
			status === "credit / debit" ||
			status === "not captured"
		)
			return onsite;
		return onsite || paid || 0;
	}, [reservation]);

	return (
		<div
			style={{
				padding: "24px",
				maxWidth: "1200px",
				width: "100%",
				margin: "0 auto",
			}}
		>
			<NestedModalZFix />
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
								getPopupContainer={resolvePopupContainer}
							>
								{allHotels.map((ht) => (
									<Option key={ht._id} value={ht._id}>
										{ht.hotelName}
										{ht.activateHotel === false ? " (Inactive)" : ""}
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
								getPopupContainer={resolvePopupContainer}
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
								getPopupContainer={resolvePopupContainer}
								optionLabelProp='label'
							>
								{selectedHotel &&
									selectedHotel.roomCountDetails?.map((d) => {
										const val = `${d.roomType}|${d.displayName}`;
										const roomKey = availabilityKey(d.roomType, d.displayName);
										const availability = availabilityByRoomKey.get(roomKey);
										const availableCount =
											availability?.available ?? availability?.total_available ?? null;
										const labelText = `${d.displayName || d.roomType}${
											d.roomType ? ` (${d.roomType})` : ""
										}`;
										return (
											<Option key={val} value={val} label={labelText}>
												<span
													style={{
														display: "flex",
														justifyContent: "space-between",
														gap: 8,
													}}
												>
													<span>{labelText}</span>
													{availableCount !== null && (
														<span style={{ opacity: 0.7, fontSize: 12 }}>
															Available: {availableCount}
														</span>
													)}
												</span>
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
								getPopupContainer={resolvePopupContainer}
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
						{isSuperUser && (
							<Descriptions.Item label='General Commission (SUPER Admin)'>
								<InputNumber
									min={0}
									step={0.01}
									precision={2}
									value={commissionOverride}
									placeholder={`Calculated: ${totalCommission.toFixed(2)} SAR`}
									onChange={(value) => {
										setHasExplicitPricingEdits(true);
										setCommissionOverride(value);
									}}
									disabled={isLoading}
									style={{ width: "100%" }}
								/>
								<div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
									Leave blank to save the calculated commission.
								</div>
							</Descriptions.Item>
						)}
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
							{paidAmountDisplay.toFixed(2)} SAR{" "}
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
				nightCount={
					numberOfNights ||
					selectedRooms[editingRoomIndex]?.pricingByDay?.length ||
					reservation?.days_of_residence ||
					0
				}
				showCommissionAmount={isSuperUser}
				commissionAmount={
					hasCommissionOverride ? commissionOverride : totalCommission
				}
				onCommissionChange={(value) => {
					setHasExplicitPricingEdits(true);
					setCommissionOverride(
						value === null || value === undefined || value === ""
							? null
							: Number(safeParseFloat(value, 0).toFixed(2)),
					);
				}}
			/>

			{/* Details Modal */}
			<Modal
				open={isModalVisible2}
				onCancel={() => setIsModalVisible2(false)}
				className='float-right'
				width='84%'
				zIndex={NESTED_MODAL_Z}
				styles={{ mask: { zIndex: NESTED_MODAL_Z - 1 } }}
				getContainer={() => document.body}
				rootClassName='edit-reservation-nested-modal'
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
				maskClosable={true}
				keyboard={true}
				onCancel={handleVerifyPasswordCancel}
				zIndex={NESTED_MODAL_Z}
				styles={{ mask: { zIndex: NESTED_MODAL_Z - 1 } }}
				getContainer={() => document.body}
				rootClassName='edit-reservation-nested-modal'
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
				onCancel={handlePaidAmountCancel}
				onOk={handlePaidAmountUpdate}
				confirmLoading={isLoading}
				zIndex={NESTED_MODAL_Z}
				styles={{ mask: { zIndex: NESTED_MODAL_Z - 1 } }}
				getContainer={() => document.body}
				rootClassName='edit-reservation-nested-modal'
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
