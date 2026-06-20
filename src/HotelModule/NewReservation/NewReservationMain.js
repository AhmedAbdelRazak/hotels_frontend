// src/HotelModule/NewReservation/NewReservationMain.js
import React, { useEffect, useRef, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled, { createGlobalStyle, keyframes } from "styled-components";
// eslint-disable-next-line
import { Link, useHistory, useLocation, useParams } from "react-router-dom";
import { useCartContext } from "../../cart_context";
import moment from "moment";
import ZReservationForm from "./ZReservationForm";
import {
	createNewReservation,
	getHotelRooms,
	getHotelReservationsCurrent,
	getHotelReservationsRange,
	getListOfRoomSummary,
	getReservationSearch,
	updateSingleReservation,
	getHotelInventoryAvailability,
	getHotelById,
	getTodaysCheckins,
	pendingConfirmationReservationList,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import { toast } from "react-toastify";
import ZReservationForm2 from "./ZReservationForm2";
import { Spin } from "antd";
import HotelRunnerReservationList from "./HotelRunnerReservationList";
import useBoss from "../useBoss";
import HotelHeatMap from "./HotelHeatMap";
import PendingConfirmationReport from "./PendingConfirmationReport";
import { getStoredMenuCollapsed } from "../utils/menuState";
import { normalizePaymentMethod } from "../utils/paymentMethods";

const defaultAgentBookingSource = (user) =>
	String(user?.companyName || user?.name || user?.email || "").trim();

const DEFAULT_AGENT_COMMISSION_PERCENT = 8;

const summarizeAssignedPricingCommission = (rooms = []) => {
	const totals = (Array.isArray(rooms) ? rooms : []).reduce(
		(acc, room) => {
			const count = Math.max(1, Number(room.count || 1));
			const rows = Array.isArray(room.pricingByDay) ? room.pricingByDay : [];
			const roomTotal = rows.reduce(
				(sum, day) =>
					sum +
					safeParseFloat(day.totalPriceWithCommission ?? day.price, 0),
				0,
			);
			const roomRoot = rows.reduce(
				(sum, day) => sum + safeParseFloat(day.rootPrice, 0),
				0,
			);
			acc.total += roomTotal * count;
			acc.root += roomRoot * count;
			return acc;
		},
		{ total: 0, root: 0 },
	);
	const amount = roundMoney(Math.max(totals.total - totals.root, 0));
	const percent =
		totals.total > 0 ? roundMoney((amount / totals.total) * 100) : 0;
	return { ...totals, amount, percent };
};

const pricingMetadataFields = [
	"sellingPrice",
	"commissionPercent",
	"priceVariantDataId",
	"priceVariantItemId",
	"priceVariantName",
	"priceVariantNameOtherLanguage",
	"source",
	"calendarType",
	"color",
];

const pickPricingMetadata = (source = {}) =>
	pricingMetadataFields.reduce((acc, field) => {
		if (
			source[field] !== undefined &&
			source[field] !== null &&
			source[field] !== ""
		) {
			acc[field] = source[field];
		}
		return acc;
	}, {});

const normalizeAgentCommercialModel = (value = "") => {
	const normalized = String(value || "").trim().toLowerCase();
	return ["wallet_inventory", "commission_only", "mixed"].includes(normalized)
		? normalized
		: "wallet_inventory";
};

const normalizeReservationId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const readSelectedHotelFromStorage = () => {
	try {
		return JSON.parse(localStorage.getItem("selectedHotel")) || {};
	} catch (error) {
		return {};
	}
};

const resolveReservationOwnerId = (hotel = {}, fallbackOwnerId = "") =>
	normalizeReservationId(
		hotel.ownerId ||
			hotel.belongsTo?._id ||
			hotel.belongsTo ||
			hotel.hotelOwnerId ||
			fallbackOwnerId,
	);

const normalizeReservationHotelSelection = (hotel = {}, fallbackOwnerId = "") => {
	const ownerId = resolveReservationOwnerId(hotel, fallbackOwnerId);
	return {
		...hotel,
		_id: normalizeReservationId(hotel._id),
		ownerId,
		belongsTo: ownerId
			? {
					...(hotel.belongsTo && typeof hotel.belongsTo === "object"
						? hotel.belongsTo
						: {}),
					_id: ownerId,
			  }
			: hotel.belongsTo,
	};
};

const NewReservationMain = ({
	embedded = false,
	forceNewReservation = false,
	selectedHotelOverride = null,
	hotelIdOverride = "",
	ownerIdOverride = "",
} = {}) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [loading, setLoading] = useState(false);
	const [hotelRooms, setHotelRooms] = useState("");
	const [hotelDetails, setHotelDetails] = useState("");
	const [roomsSummary, setRoomsSummary] = useState("");
	const [payment_status, setPaymentStatus] = useState("not paid");
	const [booking_comment, setBookingComment] = useState("");
	const [confirmation_number, setConfirmationNumber] = useState("");
	const [booking_source, setBookingSource] = useState("");
	const [pickedHotelRooms, setPickedHotelRooms] = useState([]);
	const [pickedRoomPricing, setPickedRoomPricing] = useState([]); // flattened like OrderTaker
	const [allReservations, setAllReservations] = useState([]);
	const [todaysCheckins, setTodaysCheckins] = useState(null);
	const [values] = useState("");
	const [pickedRoomsType, setPickedRoomsType] = useState([]); // UI summary lines
	const [total_amount, setTotal_Amount] = useState(0);
	// eslint-disable-next-line
	const [clickedMenu, setClickedMenu] = useState("list");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchClicked, setSearchClicked] = useState(false);
	const [searchedReservation, setSearchedReservation] = useState("");
	const [roomInventory, setRoomInventory] = useState([]);
	const [activeTab, setActiveTab] = useState(
		forceNewReservation ? "newReservation" : "list",
	);
	const [sendEmail, setSendEmail] = useState(false);
	const [total_guests, setTotalGuests] = useState("");
	const [allReservationsHeatMap, setAllReservationsHeatMap] = useState([]);
	const [bedNumber, setBedNumber] = useState([]);
	const [start_date_Map, setStart_date_Map] = useState("");
	const [end_date_Map, setEnd_date_Map] = useState("");
	const [paidAmount, setPaidAmount] = useState("");
	const [agentCommissionPercent, setAgentCommissionPercent] = useState(
		DEFAULT_AGENT_COMMISSION_PERCENT,
	);
	const [agentCommissionAmount, setAgentCommissionAmount] = useState(0);
	const [agentSettlementModel, setAgentSettlementModel] = useState(
		"agent_wallet_commission",
	);
	const [currentRoom, setCurrentRoom] = useState(null);
	const [pricingByDay, setPricingByDay] = useState([]);
	const [pendingConfirmationCount, setPendingConfirmationCount] = useState(0);
	const [isBoss] = useBoss();
	const lastReservationKeyRef = useRef(null);
	const lastInhouseAppliedRef = useRef(null);

	const [start_date, setStart_date] = useState("");
	const [end_date, setEnd_date] = useState("");
	const [days_of_residence, setDays_of_residence] = useState(0);

	// ✅ ensure defined (fixes ESLint errors you saw)
	const [customer_details, setCustomer_details] = useState({
		name: "",
		phone: "",
		email: "",
		passport: "",
		passportExpiry: "",
		nationality: "",
		copyNumber: "",
		hasCar: "no",
		carLicensePlate: "",
		carColor: "",
		carModel: "",
		carYear: "",
	});

	const { user, token } = isAuthenticated();
	const limitedOrderTakerAccount = isLimitedOrderTakerAccount(user);
	const agentCommercialModel = normalizeAgentCommercialModel(
		user?.agentCommercialModel,
	);
	const canConfirmReservations = canAccessPendingConfirmation(user);
	const roleNumbers = getAccountRoleNumbers(user);
	const roleDescriptions = getAccountRoleDescriptions(user);
	const financeOnlyReservationView =
		(roleNumbers.includes(6000) || roleDescriptions.includes("finance")) &&
		![1000, 2000, 3000, 7000, 8000, 10000].some((role) =>
			roleNumbers.includes(role),
		) &&
		!roleDescriptions.includes("hotelmanager") &&
		!roleDescriptions.includes("systemadmin") &&
		!roleDescriptions.includes("reception") &&
		!roleDescriptions.includes("ordertaker") &&
		!roleDescriptions.includes("reservationemployee");
	const agentDefaultBookingSource = defaultAgentBookingSource(user);
	const canShowReservationTab = (tab) => {
		if (limitedOrderTakerAccount) return ["newReservation", "list"].includes(tab);
		if (tab === "housingreport") return canConfirmReservations;
		return true;
	};
	const orderTakerSnapshot = {
		_id: user?._id || "",
		name: user?.name || user?.email || "",
		email: user?.email || "",
		role: user?.role || "",
		roleDescription: user?.roleDescription || "",
	};
	const { chosenLanguage } = useCartContext();

	const history = useHistory();
	const location = useLocation();
	const { userId: routeOwnerId = "", hotelId: routeHotelId = "" } = useParams();
	const lastAutoSearchRef = useRef("");
	const selectedHotelLocalStorage = normalizeReservationHotelSelection(
		selectedHotelOverride?._id
			? selectedHotelOverride
			: readSelectedHotelFromStorage(),
		ownerIdOverride || routeOwnerId,
	);
	const effectiveHotelId =
		normalizeReservationId(hotelIdOverride) ||
		normalizeReservationId(routeHotelId) ||
		normalizeReservationId(selectedHotelLocalStorage._id);
	const effectiveOwnerId = resolveReservationOwnerId(
		selectedHotelLocalStorage,
		ownerIdOverride || routeOwnerId || (user?.role === 2000 ? user?._id : ""),
	);
	const navigationOwnerId =
		effectiveOwnerId || normalizeReservationId(user?._id);
	const navigationHotelId =
		effectiveHotelId || normalizeReservationId(selectedHotelLocalStorage._id);

	useEffect(() => {
		if (!selectedHotelOverride?._id) return;
		localStorage.setItem(
			"selectedHotel",
			JSON.stringify(selectedHotelLocalStorage),
		);
	}, [
		effectiveOwnerId,
		selectedHotelLocalStorage,
		selectedHotelOverride?._id,
	]);

	useEffect(() => {
		if (!limitedOrderTakerAccount || !agentDefaultBookingSource) return;
		setBookingSource((previous) => previous || agentDefaultBookingSource);
	}, [agentDefaultBookingSource, limitedOrderTakerAccount]);

	useEffect(() => {
		if (!limitedOrderTakerAccount) return;
		if (agentCommercialModel === "commission_only") {
			setAgentSettlementModel("agent_commission_only");
			return;
		}
		if (agentCommercialModel === "wallet_inventory") {
			setAgentSettlementModel("agent_wallet_commission");
			return;
		}
		setAgentSettlementModel((previous) =>
			["agent_wallet_commission", "agent_commission_only"].includes(previous)
				? previous
				: "agent_wallet_commission",
		);
	}, [agentCommercialModel, limitedOrderTakerAccount]);

	useEffect(() => {
		if (forceNewReservation) {
			if (activeTab !== "newReservation") {
				setActiveTab("newReservation");
			}
			return;
		}

		if (
			limitedOrderTakerAccount &&
			!isOrderTakerReservationSearchAllowed(location.search)
		) {
			if (location.search !== "?newReservation") {
				history.replace({
					pathname: location.pathname,
					search: "?newReservation",
				});
			}
			if (activeTab !== "newReservation") {
				setActiveTab("newReservation");
			}
			return;
		}

		const nextTab = getReservationTabFromSearch(location.search);
		if (
			limitedOrderTakerAccount &&
			!["newReservation", "list"].includes(nextTab)
		) {
			if (location.search !== "?newReservation") {
				history.replace({
					pathname: location.pathname,
					search: "?newReservation",
				});
			}
			if (activeTab !== "newReservation") {
				setActiveTab("newReservation");
			}
			return;
		}
		if (nextTab === "housingreport" && !canConfirmReservations) {
			if (location.search !== "?list=&page=1") {
				history.replace({
					pathname: location.pathname,
					search: "?list=&page=1",
				});
			}
			if (activeTab !== "list") {
				setActiveTab("list");
			}
			return;
		}

		if (activeTab !== nextTab) {
			setActiveTab(nextTab);
		}
	}, [
		activeTab,
		canConfirmReservations,
		forceNewReservation,
		history,
		limitedOrderTakerAccount,
		location.pathname,
		location.search,
	]);

	useEffect(() => {
		const confirmationFromUrl = getConfirmationFromSearch(location.search);
		if (!confirmationFromUrl) return;
		if (!hotelDetails?._id) return;
		if (lastAutoSearchRef.current === confirmationFromUrl) return;
		lastAutoSearchRef.current = confirmationFromUrl;
		setSearchQuery(confirmationFromUrl);
		setSearchClicked(true);
	}, [location.search, hotelDetails?._id]);

	useEffect(() => {
		if (activeTab !== "reserveARoom") return;
		const currentConfirmation = String(
			searchedReservation?.confirmation_number || confirmation_number || "",
		).trim();
		const params = new URLSearchParams(
			location.search.startsWith("?")
				? location.search
				: `?${location.search}`,
		);
		const existing = params.get("confirmation_number") || "";

		if (!currentConfirmation) return;
		if (existing === currentConfirmation) return;
		params.set("confirmation_number", currentConfirmation);
		if (!params.has("reserveARoom")) {
			params.set("reserveARoom", "true");
		}
		const nextSearch = params.toString();
		history.replace({
			pathname: location.pathname,
			search: nextSearch ? `?${nextSearch}` : "",
		});
		lastAutoSearchRef.current = currentConfirmation;
	}, [
		activeTab,
		confirmation_number,
		history,
		location.pathname,
		location.search,
		searchedReservation?.confirmation_number,
	]);

	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [hasStoredCollapsed]);

	const disabledDate = (current) => current < moment();

	const formatDate = (date) => {
		if (!date) return "";
		const d = new Date(date);
		let month = "" + (d.getMonth() + 1);
		let day = "" + d.getDate();
		let year = d.getFullYear();
		if (month.length < 2) month = "0" + month;
		if (day.length < 2) day = "0" + day;
		return [year, month, day].join("-");
	};

	const gettingHotelData = () => {
		if (!user?._id || !token || !effectiveHotelId || !effectiveOwnerId) {
			return;
		}
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate());
		const heatMapStartDate = formatDate(startDate);

		endDate.setDate(endDate.getDate() + 60);
		const heatMapEndDate = formatDate(endDate);

		setStart_date_Map(moment(heatMapStartDate));
		setEnd_date_Map(moment(heatMapEndDate));

		const hotelId = effectiveHotelId;
		const belongsToId = effectiveOwnerId;
		const rangeStart = start_date ? formatDate(start_date) : "";
		const rangeEnd = end_date ? formatDate(end_date) : "";

		Promise.all([
			getHotelById(hotelId, { view: "reservation-workspace" }),
			getHotelRooms(hotelId, belongsToId),
			heatMapStartDate && heatMapEndDate
				? getHotelReservationsCurrent(hotelId, belongsToId)
				: Promise.resolve([]),
			heatMapStartDate && heatMapEndDate
				? getTodaysCheckins(hotelId, belongsToId)
				: Promise.resolve([]),
			rangeStart && rangeEnd
				? getHotelReservationsRange(hotelId, belongsToId, rangeStart, rangeEnd)
				: Promise.resolve([]),
		]).then(
			([
				hotelData,
				roomsData,
				heatMapReservations,
				todayData,
				rangeReservations,
			]) => {
				if (hotelData && hotelData.error) {
					console.log(hotelData.error);
				} else if (hotelData && hotelData._id) {
					if (!hotelDetails || hotelDetails._id !== hotelData._id) {
						setHotelDetails(hotelData);
					}
				}

				if (roomsData && roomsData.error) {
					console.log(roomsData.error);
				} else {
					const rooms = Array.isArray(roomsData) ? roomsData : [];
					setHotelRooms((previousRooms) =>
						Array.isArray(previousRooms) && previousRooms.length > 0
							? previousRooms
							: rooms
					);
				}

				if (heatMapReservations && heatMapReservations.error) {
					console.log(heatMapReservations.error);
				} else {
					setAllReservationsHeatMap(
						Array.isArray(heatMapReservations) ? heatMapReservations : [],
					);
				}

				if (todayData && todayData.error) {
					console.log(todayData.error);
					setTodaysCheckins([]);
				} else {
					setTodaysCheckins(Array.isArray(todayData) ? todayData : []);
				}

				if (rangeStart && rangeEnd) {
					if (rangeReservations && rangeReservations.error) {
						console.log(rangeReservations.error);
					} else {
						setAllReservations(
							Array.isArray(rangeReservations) ? rangeReservations : [],
						);
					}
				} else {
					setAllReservations([]);
				}
			},
		);
	};

	const gettingOverallRoomsSummary = () => {
		if (start_date && end_date && hotelDetails?._id) {
			const formattedStartDate = formatDate(start_date);
			const formattedEndDate = formatDate(end_date);
			getListOfRoomSummary(
				formattedStartDate,
				formattedEndDate,
				hotelDetails._id,
			).then((data) => {
				if (data && data.error) {
				} else {
					setRoomsSummary(data);
				}
			});
		} else {
			setRoomsSummary("");
		}
	};

	const gettingSearchQuery = () => {
		if (searchQuery && searchClicked) {
			setLoading(true);
			getReservationSearch(searchQuery, hotelDetails._id).then((data) => {
				if (data && data.error) {
					toast.error("No available value, please try again...");
					setLoading(false);
				} else if (data) {
					setCustomer_details(data.customer_details);
					setStart_date(data.checkin_date);
					setEnd_date(data.checkout_date);
					const checkin = moment(data.checkin_date, "YYYY-MM-DD");
					const checkout = moment(data.checkout_date, "YYYY-MM-DD");
					const duration = checkout.diff(checkin, "days") + 1;

					setDays_of_residence(duration);
					setPaymentStatus(
						normalizePaymentMethod(data.payment_status || data.payment)
					);
					setBookingComment(data.comment);
					setBookingSource(data.booking_source || agentDefaultBookingSource);
					setConfirmationNumber(data.confirmation_number);
					setPaymentStatus(
						normalizePaymentMethod(data.payment_status || data.payment)
					);
					setSearchedReservation(data);
					setLoading(false);
				} else {
					toast.error("Incorrect Confirmation #, Please try again...");
					setLoading(false);
				}
			});
		} else {
			setSearchQuery("");
			setSearchClicked(false);
		}
	};

	useEffect(() => {
		gettingSearchQuery();
		// eslint-disable-next-line
	}, [searchClicked]);

	const isReservationInHouse = (reservation) => {
		const status = String(reservation?.reservation_status || "").toLowerCase();
		return (
			status.includes("inhouse") ||
			status.includes("in_house") ||
			status.includes("in house")
		);
	};

	useEffect(() => {
		const reservationKey =
			searchedReservation?._id ||
			searchedReservation?.confirmation_number ||
			"";

		if (!reservationKey) {
			lastReservationKeyRef.current = null;
			lastInhouseAppliedRef.current = null;
			return;
		}

		if (lastReservationKeyRef.current !== reservationKey) {
			setPickedHotelRooms([]);
			setPickedRoomPricing([]);
			setPickedRoomsType([]);
			setCurrentRoom(null);
			setPricingByDay([]);
			setBedNumber([]);
			lastReservationKeyRef.current = reservationKey;
			lastInhouseAppliedRef.current = null;
		}

		if (!isReservationInHouse(searchedReservation)) return;
		if (lastInhouseAppliedRef.current === reservationKey) return;
		if (!Array.isArray(hotelRooms) || hotelRooms.length === 0) return;

		const rawRoomIds = Array.isArray(searchedReservation.roomId)
			? searchedReservation.roomId
			: [searchedReservation.roomId];
		const normalizedRoomIds = rawRoomIds
			.map((room) => {
				if (!room) return null;
				if (typeof room === "string" || typeof room === "number") {
					return String(room);
				}
				if (typeof room === "object") {
					return (
						room._id ||
						room.id ||
						room.roomId ||
						room.room_id ||
						room.room_number ||
						null
					);
				}
				return null;
			})
			.filter(Boolean)
			.map((id) => String(id));

		if (normalizedRoomIds.length === 0) return;

		const roomIdMap = new Map();
		hotelRooms.forEach((room) => {
			if (!room) return;
			const roomId = String(room._id);
			roomIdMap.set(roomId, roomId);
			if (room.room_number !== undefined && room.room_number !== null) {
				roomIdMap.set(String(room.room_number), roomId);
			}
		});

		const resolvedRoomIds = Array.from(
			new Set(
				normalizedRoomIds.map((id) => roomIdMap.get(id) || String(id)),
			),
		);
		const roomIdSet = new Set(resolvedRoomIds.map((id) => String(id)));

		const roomsById = new Map(
			hotelRooms.map((room) => [String(room._id), room]),
		);
		const resolvedRooms = resolvedRoomIds
			.map((id) => roomsById.get(String(id)))
			.filter(Boolean);

		const reservationPricing = Array.isArray(
			searchedReservation?.pickedRoomsPricing,
		)
			? searchedReservation.pickedRoomsPricing
			: Array.isArray(searchedReservation?.pickedRoomsType)
			  ? searchedReservation.pickedRoomsType
			  : [];

		const pricingWithIds = reservationPricing
			.map((pricing) => {
				if (!pricing) return null;
				const roomIdRaw =
					pricing.roomId || pricing.room_id || pricing._id || null;
				if (!roomIdRaw) return null;
				return { ...pricing, roomId: String(roomIdRaw) };
			})
			.filter(Boolean)
			.filter((pricing) => roomIdSet.has(String(pricing.roomId)));

		const pickedRoomsPricing =
			pricingWithIds.length > 0
				? pricingWithIds
				: (() => {
						const usedRoomIds = new Set();
						const normalizedRooms = resolvedRooms.map((room) => ({
							room,
							roomId: String(room._id),
							type: String(room.room_type || "")
								.trim()
								.toLowerCase(),
							display: String(
								room.display_name || room.displayName || "",
							)
								.trim()
								.toLowerCase(),
						}));

						return reservationPricing
							.map((pricing) => {
								if (!pricing) return null;
								const type = String(
									pricing.room_type || pricing.roomType || "",
								)
									.trim()
									.toLowerCase();
								const display = String(
									pricing.displayName || pricing.display_name || "",
								)
									.trim()
									.toLowerCase();
								let match = null;
								if (type) {
									match = normalizedRooms.find(
										(room) =>
											!usedRoomIds.has(room.roomId) &&
											room.type === type &&
											(!display || room.display === display),
									);
								}
								if (!match) return null;
								usedRoomIds.add(match.roomId);
								return { ...pricing, roomId: match.roomId };
							})
							.filter(Boolean);
				  })();

		setPickedHotelRooms(resolvedRoomIds);
		setPickedRoomPricing(pickedRoomsPricing);
		lastInhouseAppliedRef.current = reservationKey;
	}, [
		searchedReservation,
		hotelRooms,
		setBedNumber,
		setCurrentRoom,
		setPickedHotelRooms,
		setPickedRoomPricing,
		setPickedRoomsType,
		setPricingByDay,
	]);

	/* Grouped summary for reserveARoom path (unchanged) */

	const nights = Math.max((Number(days_of_residence) || 0) - 1, 0);

	const calculateTotalAmountNoRooms = () => {
		let total = 0;
		pickedRoomsType.forEach((room) => {
			const price = parseFloat(room.chosenPrice);
			const count = parseInt(room.count, 10) || 1;
			total += price * count;
		});
		return total * nights;
	};

	const calculateTotalAmountWithRooms = () => {
		let total = 0;
		pickedRoomPricing.forEach((room) => {
			const price = parseFloat(room.chosenPrice);
			total += price;
		});
		return total * nights;
	};

	/* Fallback transformer (if ever needed) from UI summary to API flattened (OrderTaker shape) */
	const transformFromSummaryToApi = (summaryLines = []) => {
		const out = [];
		summaryLines.forEach((line) => {
			if (!Array.isArray(line.pricingByDay) || line.pricingByDay.length === 0)
				return;
			const pricingDetails = line.pricingByDay.map((d) => {
				const finalWithComm = safeParseFloat(d.totalPriceWithCommission, 0);
				return {
					date: d.date,
					// IMPORTANT: align with OrderTaker — price = nightly final with commission
					price: finalWithComm,
					rootPrice: safeParseFloat(d.rootPrice, 0),
					commissionRate: safeParseFloat(d.commissionRate, 10),
					totalPriceWithCommission: finalWithComm,
					totalPriceWithoutCommission: safeParseFloat(
						d.totalPriceWithoutCommission,
						0,
					),
					...pickPricingMetadata(d),
				};
			});
			const totalWithComm = pricingDetails.reduce(
				(a, d) => a + d.totalPriceWithCommission,
				0,
			);
			const avgNight =
				pricingDetails.length > 0 ? totalWithComm / pricingDetails.length : 0;
			const hotelShouldGet = pricingDetails.reduce(
				(a, d) => a + d.rootPrice,
				0,
			);

			for (let i = 0; i < (line.count || 1); i += 1) {
				out.push({
					room_type: line.room_type,
					displayName: line.displayName,
					chosenPrice: Number(avgNight).toFixed(2),
					count: 1,
					pricingByDay: pricingDetails,
					totalPriceWithCommission: Number(totalWithComm.toFixed(2)),
					hotelShouldGet: Number(hotelShouldGet.toFixed(2)),
				});
			}
		});
		return out;
	};

	const getAvailableCountForRoom = (line = {}) => {
		const targetType = String(line.room_type || line.roomType || "").toLowerCase();
		const targetDisplay = String(
			line.displayName || line.display_name || ""
		).toLowerCase();
		const inventory = (Array.isArray(roomInventory) ? roomInventory : []).find(
			(room) => {
				const roomType = String(room.room_type || room.roomType || "").toLowerCase();
				const roomDisplay = String(
					room.displayName || room.display_name || ""
				).toLowerCase();
				return (
					roomType === targetType &&
					(!targetDisplay || !roomDisplay || roomDisplay === targetDisplay)
				);
			},
		);
		if (!inventory) return Infinity;
		const available = Number(inventory.available ?? inventory.total_available ?? 0);
		return Number.isFinite(available) ? available : 0;
	};

	const findInventoryIssue = () =>
		(pickedRoomsType || []).find((line) => {
			const requested = Number(line.count || 1);
			const available = getAvailableCountForRoom(line);
			return requested > available;
		});

	const showReservationWarnings = (warnings = []) => {
		const messages = (Array.isArray(warnings) ? warnings : [])
			.map((warning) =>
				typeof warning === "string" ? warning : warning?.message || ""
			)
			.map((message) => message.trim())
			.filter(Boolean);
		[...new Set(messages)].slice(0, 3).forEach((message) => {
			toast.warn(message, { autoClose: 7000 });
		});
		if (messages.length > 3) {
			toast.warn(`${messages.length - 3} more reservation warning(s) were logged.`);
		}
	};

	const clickSubmit = () => {
		if (!customer_details.name) return toast.error("Name is required");
		if (!customer_details.phone) return toast.error("Phone is required");
		if (!limitedOrderTakerAccount && !customer_details.passport)
			return toast.error("passport is required");
		if (!customer_details.nationality)
			return toast.error("nationality is required");
		if (!start_date) return toast.error("Check in Date is required");
		if (!end_date) return toast.error("Check out Date is required");
		if (
			pickedHotelRooms &&
			pickedHotelRooms.length <= 0 &&
			activeTab === "reserveARoom"
		) {
			return toast.error("Please Pick Up Rooms To Reserve");
		}
		const resolvedBookingSource =
			booking_source || (limitedOrderTakerAccount ? agentDefaultBookingSource : "");
		if (!resolvedBookingSource) return toast.error("Booking Source is required");

		if (
			total_amount === 0 &&
			calculateTotalAmountWithRooms() === 0 &&
			activeTab === "reserveARoom"
		) {
			return toast.error("Please pick up the correct price");
		}

		const invalidRoomCount = pickedRoomsType.some(
			(room) => Number(room.count) <= 0,
		);
		if (invalidRoomCount && activeTab === "newReservation") {
			return toast.error("Room count must be greater than 0");
		}
		const inventoryIssue = findInventoryIssue();
		if (inventoryIssue && limitedOrderTakerAccount) {
			return toast.error(
				`Not enough inventory for ${
					inventoryIssue.displayName || inventoryIssue.room_type || "selected room"
				}. Agents cannot overbook.`
			);
		}
		if (inventoryIssue && activeTab === "newReservation") {
			toast.warn(
				`Warning: ${
					inventoryIssue.displayName || inventoryIssue.room_type || "selected room"
				} may be overbooked.`
			);
		}

		if (!effectiveHotelId || !effectiveOwnerId) {
			console.log("No hotel selected");
			return;
		}

		// eslint-disable-next-line
		const total_amount_calculated = calculateTotalAmountNoRooms();
		const total_amount_calculated_WithRooms = calculateTotalAmountWithRooms();
		const reservationTotalAmount =
			Number(total_amount) !== 0
				? Number(total_amount) * nights
				: total_amount_calculated || total_amount_calculated_WithRooms;
		const resolvedAgentSettlementModel =
			agentCommercialModel === "commission_only"
				? "agent_commission_only"
				: agentCommercialModel === "wallet_inventory"
				? "agent_wallet_commission"
				: agentSettlementModel === "agent_commission_only"
				? "agent_commission_only"
				: "agent_wallet_commission";
		const resolvedAgentUsesCommission = Boolean(limitedOrderTakerAccount);

		// === OrderTaker parity (for New Reservation path) ===
		// Child ZReservationForm2 exports `pickedRoomPricing` already in transformPickedRooms shape.
		// As a fallback, we can transform from summary lines.
		const apiPickedRooms =
			pickedRoomPricing && pickedRoomPricing.length > 0
				? pickedRoomPricing
				: transformFromSummaryToApi(pickedRoomsType);
		const agentAssignedPricingCommission =
			summarizeAssignedPricingCommission(apiPickedRooms);
		const resolvedAgentCommissionPercent = resolvedAgentUsesCommission
			? agentAssignedPricingCommission.percent
			: Number.isFinite(Number(agentCommissionPercent))
			  ? Number(agentCommissionPercent)
			  : DEFAULT_AGENT_COMMISSION_PERCENT;
		const resolvedAgentCommissionAmount = resolvedAgentUsesCommission
			? agentAssignedPricingCommission.amount
			: 0;

		const new_reservation = {
			customer_details,
			calculateTotalAmountWithRooms: calculateTotalAmountWithRooms(),
			checkin_date: start_date,
			checkout_date: end_date,
			days_of_residence,
			payment_status,
			total_amount: reservationTotalAmount,
			booking_source: resolvedBookingSource,
			belongsTo: hotelDetails.belongsTo._id || hotelDetails.belongsTo,
			hotelId: hotelDetails._id,
			requestingUserId: user?._id,
			createdByUserId: user?._id,
			orderTakeId: user?._id,
			orderTaker: orderTakerSnapshot,
			orderTakenAt: new Date(),
			roomId: pickedHotelRooms,
			sendEmail,
			booked_at:
				searchedReservation && searchedReservation.booked_at
					? searchedReservation.booked_at
					: new Date(),
			sub_total:
				searchClicked && searchedReservation && searchedReservation.sub_total
					? searchedReservation.sub_total
					: total_amount !== 0
					  ? total_amount * nights
					  : total_amount_calculated
					    ? total_amount_calculated
					    : total_amount_calculated_WithRooms,

			// === IMPORTANT: send flattened array in BOTH fields to avoid breaking older consumers ===
			pickedRoomsPricing: apiPickedRooms, // identical to OrderTaker transform
			pickedRoomsType: apiPickedRooms, // also identical

			payment: payment_status,
			reservation_status: limitedOrderTakerAccount
				? "Pending Confirmation"
				: pickedHotelRooms.length > 0
				  ? "InHouse"
				  : "Confirmed",
			total_rooms: pickedHotelRooms.length,
			total_guests: total_guests ? total_guests : pickedHotelRooms.length,
			booking_comment,
			comment: booking_comment,
			hotelName: hotelDetails.hotelName,
			bedNumber,
			paid_amount: paidAmount
				? Number(paidAmount)
				: searchedReservation.paid_amount
				  ? searchedReservation.paid_amount
				  : 0,
			housedBy:
				searchQuery &&
				searchedReservation &&
				searchedReservation.confirmation_number
					? user
					: "",

			confirmation_number: confirmation_number,
		};

		if (limitedOrderTakerAccount) {
			const collectionModel =
				resolvedAgentSettlementModel === "agent_commission_only"
					? "agent_commission_only"
					: "agent_wallet";
			new_reservation.commission = resolvedAgentCommissionAmount;
			new_reservation.commissionPaid = false;
			new_reservation.commissionStatus = "";
			new_reservation.agentSettlementModel = resolvedAgentSettlementModel;
			new_reservation.commissionData = {
				assigned: false,
				amount: resolvedAgentCommissionAmount,
				rate: resolvedAgentCommissionPercent,
				status: "pending hotel review",
				source: "agent_reservation",
				proposedByAgent: resolvedAgentUsesCommission,
			};
			new_reservation.financial_cycle = {
				settlementModel: resolvedAgentSettlementModel,
				agentSettlementModel: resolvedAgentSettlementModel,
				collectionModel,
				walletRequired:
					resolvedAgentSettlementModel === "agent_wallet_commission",
				commissionType: "percentage",
				commissionValue: resolvedAgentCommissionPercent,
				commissionAmount: resolvedAgentCommissionAmount,
				commissionAssigned: false,
				commissionReviewStatus: "pending",
				status: "open",
				proposedByAgent: resolvedAgentUsesCommission,
			};
		}

		if (searchedReservation && searchedReservation._id) {
			const mergedCustomerDetails = {
				...(searchedReservation.customer_details || {}),
				...customer_details,
			};

			const existingPickedRoomsType =
				Array.isArray(searchedReservation.pickedRoomsType) &&
				searchedReservation.pickedRoomsType.length > 0
					? searchedReservation.pickedRoomsType
					: apiPickedRooms;

			const existingPickedRoomsPricing =
				Array.isArray(searchedReservation.pickedRoomsPricing) &&
				searchedReservation.pickedRoomsPricing.length > 0
					? searchedReservation.pickedRoomsPricing
					: existingPickedRoomsType;

			const updatePayload = {
				customer_details: mergedCustomerDetails,
				checkin_date: start_date,
				checkout_date: end_date,
				days_of_residence,
				payment_status,
				payment: payment_status,
				booking_source: resolvedBookingSource,
				belongsTo: hotelDetails.belongsTo._id || hotelDetails.belongsTo,
				hotelId: hotelDetails._id,
				roomId: pickedHotelRooms,
				sendEmail,
				booked_at: searchedReservation.booked_at || new Date(),
				reservation_status:
					pickedHotelRooms.length > 0
						? "InHouse"
						: searchedReservation.reservation_status || "Confirmed",
				total_rooms:
					pickedHotelRooms.length || searchedReservation.total_rooms || 0,
				total_guests: total_guests
					? total_guests
					: searchedReservation.total_guests || pickedHotelRooms.length,
				booking_comment,
				comment: booking_comment,
				hotelName: hotelDetails.hotelName,
				bedNumber,
				paid_amount: paidAmount
					? Number(paidAmount)
					: searchedReservation.paid_amount || 0,
				confirmation_number: searchedReservation.confirmation_number,
				pickedRoomsType: existingPickedRoomsType,
				pickedRoomsPricing: existingPickedRoomsPricing,
				total_amount:
					typeof searchedReservation.total_amount === "number"
						? searchedReservation.total_amount
						: new_reservation.total_amount,
				sub_total:
					typeof searchedReservation.sub_total === "number"
						? searchedReservation.sub_total
						: new_reservation.sub_total,
				housedBy: user,
			};

			updateSingleReservation(searchedReservation._id, {
				...updatePayload,
				inhouse_date: new Date(),
				requestingUserId: user?._id,
			}).then((data) => {
				if (data && data.error) {
					toast.error(
						chosenLanguage === "Arabic" && data.errorArabic
							? data.errorArabic
							: data.error
					);
					console.log(data.error);
				} else {
					showReservationWarnings(data?.warnings);
					toast.success("Checkin Was Successfully Processed!");
					setTimeout(() => window.location.reload(false), 1500);
				}
			});
		} else {
			createNewReservation(
				effectiveOwnerId || user._id,
				hotelDetails._id,
				token,
				new_reservation,
			).then((data) => {
				if (data && data.error) {
					toast.error(
						chosenLanguage === "Arabic" && data.errorArabic
							? data.errorArabic
							: data.error
					);
					console.log(data.error, "error create new reservation");
				} else {
					showReservationWarnings(data?.warnings);
					toast.success("Reservation Was Successfully Booked!");
					setTimeout(() => window.location.reload(false), 1500);
				}
			});
		}
	};

	useEffect(() => {
		gettingHotelData();
		// eslint-disable-next-line
	}, [start_date, end_date, effectiveHotelId, effectiveOwnerId]);

	const getRoomInventory = () => {
		const formattedStartDate = formatDate(start_date);
		const formattedEndDate = formatDate(end_date);
		if (!formattedStartDate || !formattedEndDate || !hotelDetails?._id) return;
		getHotelInventoryAvailability(hotelDetails._id, {
			start: formattedStartDate,
			end: formattedEndDate,
			agentId: limitedOrderTakerAccount ? user?._id : "",
		}).then((data) => {
			if (data && data.error) {
				console.log(data.error);
			} else {
				setRoomInventory(Array.isArray(data) ? data : []);
			}
		});
	};

	useEffect(() => {
		gettingOverallRoomsSummary();
		if (start_date && end_date) getRoomInventory();
		// eslint-disable-next-line
	}, [start_date, end_date, hotelDetails?._id]);

	useEffect(() => {
		if (!canConfirmReservations || !hotelDetails?._id || !user?._id) {
			setPendingConfirmationCount(0);
			return undefined;
		}
		let isMounted = true;
		const loadPendingConfirmationCount = () => {
			pendingConfirmationReservationList({
				page: 1,
				records: 1,
				hotelId: hotelDetails._id,
				userId: user._id,
			}).then((data) => {
				if (!isMounted) return;
				setPendingConfirmationCount(Number(data?.total || 0));
			});
		};
		loadPendingConfirmationCount();
		const timer = setInterval(loadPendingConfirmationCount, 45000);
		return () => {
			isMounted = false;
			clearInterval(timer);
		};
	}, [canConfirmReservations, hotelDetails?._id, user?._id]);

	return (
		<NewReservationMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			$show={collapsed}
			$isArabic={chosenLanguage === "Arabic"}
			$embedded={embedded}
		>
			<ReservationModalLayerStyles />
			<div className='grid-container-main'>
				{!embedded && (
					<div className='navcontent'>
						{chosenLanguage === "Arabic" ? (
							<AdminNavbarArabic
								fromPage='NewReservation'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						) : (
							<AdminNavbar
								fromPage='NewReservation'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						)}
					</div>
				)}

				<div className='otherContentWrapper'>
					{!embedded && (
						<TabsShell $wide={activeTab === "list"}>
						<div className='tab-grid'>
							<Tab
								$isHidden={!canShowReservationTab("heatmap")}
								$isActive={activeTab === "heatmap"}
								onClick={() => {
									setActiveTab("heatmap");
									history.push(
										`/hotel-management/new-reservation/${navigationOwnerId}/${navigationHotelId}?heatmap`,
									);
								}}
							>
								{chosenLanguage === "Arabic"
									? "خريطة الفندق"
									: "Hotel Heat Map"}
							</Tab>
							<Tab
								$isHidden={!canShowReservationTab("reserveARoom")}
								$isActive={activeTab === "reserveARoom"}
								onClick={() => {
									setActiveTab("reserveARoom");
									history.push(
										`/hotel-management/new-reservation/${navigationOwnerId}/${navigationHotelId}?reserveARoom`,
									);
								}}
							>
								{chosenLanguage === "Arabic" ? "تسكين الغرف" : "Reserve A Room"}
							</Tab>

							<Tab
								$isActive={activeTab === "newReservation"}
								onClick={() => {
									setActiveTab("newReservation");
									history.push(
										`/hotel-management/new-reservation/${navigationOwnerId}/${navigationHotelId}?newReservation`,
									);
								}}
							>
								{chosenLanguage === "Arabic"
									? "حجز جديد"
									: "New Reservation"}
							</Tab>

							<Tab
								$isActive={activeTab === "list"}
								onClick={() => {
									setActiveTab("list");
									history.push(
										`/hotel-management/new-reservation/${navigationOwnerId}/${navigationHotelId}?list=&page=1`,
									);
								}}
							>
								{chosenLanguage === "Arabic"
									? "قائمة الحجوزات"
									: "Reservation List"}
							</Tab>

							<Tab
								$isHidden={!canShowReservationTab("housingreport")}
								$isActive={activeTab === "housingreport"}
								onClick={() => {
									setActiveTab("housingreport");
									history.push(
										`/hotel-management/new-reservation/${navigationOwnerId}/${navigationHotelId}?pendingConfirmation`,
									);
								}}
							>
								{chosenLanguage === "Arabic"
									? "تأكيد الحجوزات"
									: financeOnlyReservationView
									? "Commission Review"
									: "Pending Confirmation"}
								{pendingConfirmationCount > 0 ? (
									<TabBadge>{pendingConfirmationCount}</TabBadge>
								) : null}
							</Tab>
						</div>
						</TabsShell>
					)}

					<div
						className={`container-wrapper ${
							activeTab === "list" ? "is-reservation-list" : ""
						}`}
					>
						{activeTab === "reserveARoom" ? (
							<>
								{loading ? (
									<div className='text-center my-5'>
										<Spin size='large' />
										<p>Loading Reservations...</p>
									</div>
								) : (
									<>
										{start_date_Map && end_date_Map ? (
											<ZReservationForm
												customer_details={customer_details}
												setCustomer_details={setCustomer_details}
												start_date={start_date}
												setStart_date={setStart_date}
												end_date={end_date}
												setEnd_date={setEnd_date}
												disabledDate={disabledDate}
												days_of_residence={days_of_residence}
												setDays_of_residence={setDays_of_residence}
												chosenLanguage={chosenLanguage}
												hotelDetails={hotelDetails}
												hotelRooms={hotelRooms}
												values={values}
												clickSubmit={clickSubmit}
												pickedHotelRooms={pickedHotelRooms}
												setPickedHotelRooms={setPickedHotelRooms}
												payment_status={payment_status}
												setPaymentStatus={setPaymentStatus}
												total_amount={total_amount}
												setTotal_Amount={setTotal_Amount}
												setPickedRoomPricing={setPickedRoomPricing}
												pickedRoomPricing={pickedRoomPricing}
												allReservations={allReservations}
												setBookingComment={setBookingComment}
												booking_comment={booking_comment}
												setBookingSource={setBookingSource}
												booking_source={booking_source}
												setConfirmationNumber={setConfirmationNumber}
												confirmation_number={confirmation_number}
												searchQuery={searchQuery}
												setSearchQuery={setSearchQuery}
												searchClicked={searchClicked}
												setSearchClicked={setSearchClicked}
												searchedReservation={searchedReservation}
												setSearchedReservation={setSearchedReservation}
												pickedRoomsType={pickedRoomsType}
												setPickedRoomsType={setPickedRoomsType}
												finalTotalByRoom={calculateTotalAmountWithRooms}
												isBoss={isBoss}
												todaysCheckins={todaysCheckins}
												start_date_Map={start_date_Map}
												end_date_Map={end_date_Map}
												bedNumber={bedNumber}
												setBedNumber={setBedNumber}
												currentRoom={currentRoom}
												setCurrentRoom={setCurrentRoom}
												pricingByDay={pricingByDay}
												setPricingByDay={setPricingByDay}
												sidebarCollapsed={collapsed}
											/>
										) : null}
									</>
								)}
							</>
						) : activeTab === "housingreport" ? (
							<PendingConfirmationReport
								hotelDetails={hotelDetails}
								chosenLanguage={chosenLanguage}
								onTotalChange={setPendingConfirmationCount}
							/>
						) : activeTab === "list" ? (
							hotelDetails && hotelDetails._id ? (
								<HotelRunnerReservationList
									hotelDetails={hotelDetails}
									chosenLanguage={chosenLanguage}
									isBoss={isBoss}
								/>
							) : null
						) : activeTab === "heatmap" ? (
							allReservationsHeatMap ? (
								<HotelHeatMap
									hotelRooms={hotelRooms}
									hotelDetails={hotelDetails}
									start_date={start_date}
									end_date={end_date}
									start_date_Map={start_date_Map}
									end_date_Map={end_date_Map}
									allReservations={allReservationsHeatMap}
									chosenLanguage={chosenLanguage}
									useCurrentOccupancy
								/>
							) : null
						) : (
							<ZReservationForm2
								customer_details={customer_details}
								setCustomer_details={setCustomer_details}
								start_date={start_date}
								setStart_date={setStart_date}
								end_date={end_date}
								setEnd_date={setEnd_date}
								disabledDate={disabledDate}
								days_of_residence={days_of_residence}
								setDays_of_residence={setDays_of_residence}
								chosenLanguage={chosenLanguage}
								clickSubmit2={clickSubmit}
								paymentStatus={payment_status}
								setPaymentStatus={setPaymentStatus}
								total_amount={total_amount}
								setTotal_Amount={setTotal_Amount}
								setPickedRoomPricing={setPickedRoomPricing}
								pickedRoomPricing={pickedRoomPricing}
								allReservations={allReservations}
								setBookingComment={setBookingComment}
								booking_comment={booking_comment}
								setBookingSource={setBookingSource}
								booking_source={booking_source}
								setConfirmationNumber={setConfirmationNumber}
								confirmation_number={confirmation_number}
								clickedMenu={clickedMenu}
								roomsSummary={roomsSummary}
								roomInventory={roomInventory}
								pickedRoomsType={pickedRoomsType}
								setPickedRoomsType={setPickedRoomsType}
								hotelDetails={hotelDetails}
								total_guests={total_guests}
								setTotalGuests={setTotalGuests}
								setSendEmail={setSendEmail}
								sendEmail={sendEmail}
								isBoss={isBoss}
								limitedOrderTakerAccount={limitedOrderTakerAccount}
								agentCommercialModel={agentCommercialModel}
								agentSettlementModel={agentSettlementModel}
								setAgentSettlementModel={setAgentSettlementModel}
								agentCommissionPercent={agentCommissionPercent}
								setAgentCommissionPercent={setAgentCommissionPercent}
								agentCommissionAmount={agentCommissionAmount}
								setAgentCommissionAmount={setAgentCommissionAmount}
								paidAmount={paidAmount}
								setPaidAmount={setPaidAmount}
								setCurrentRoom={setCurrentRoom}
							/>
						)}
					</div>
				</div>
			</div>
		</NewReservationMainWrapper>
	);
};

export default NewReservationMain;

/* Utilities for this file */
function safeParseFloat(value, fallback = 0) {
	const parsed = parseFloat(value);
	return isNaN(parsed) ? fallback : parsed;
}

function roundMoney(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function getConfirmationFromSearch(search = "") {
	if (!search) return "";
	const normalized = search.startsWith("?") ? search : `?${search}`;
	const params = new URLSearchParams(normalized);
	return (
		params.get("confirmation_number") ||
		params.get("confirmation") ||
		params.get("confirmationNumber") ||
		""
	);
}

function getReservationTabFromSearch(search = "") {
	const params = new URLSearchParams(search || "");
	if (params.has("reserveARoom")) return "reserveARoom";
	if (params.has("newReservation")) return "newReservation";
	if (params.has("list")) return "list";
	if (params.has("inventory")) return "inventory";
	if (params.has("heatmap")) return "heatmap";
	if (params.has("pendingConfirmation")) return "housingreport";
	if (params.has("housingreport")) return "housingreport";
	return "list";
}

function isOrderTakerReservationSearchAllowed(search = "") {
	const params = new URLSearchParams(search || "");
	return params.has("newReservation") || params.has("list");
}

function getAccountRoleNumbers(account = {}) {
	return [
		Number(account?.role),
		...(Array.isArray(account?.roles) ? account.roles.map(Number) : []),
	].filter(Boolean);
}

function getAccountRoleDescriptions(account = {}) {
	return [
		String(account?.roleDescription || "").toLowerCase(),
		...(Array.isArray(account?.roleDescriptions)
			? account.roleDescriptions.map((item) => String(item || "").toLowerCase())
			: []),
	];
}

function isLimitedOrderTakerAccount(account = {}) {
	const roleNumbers = getAccountRoleNumbers(account);
	const roleDescriptions = getAccountRoleDescriptions(account);
	const hasOrderTakingScope =
		roleNumbers.includes(7000) ||
		roleDescriptions.includes("ordertaker") ||
		(Array.isArray(account?.accessTo) &&
			account.accessTo.includes("ownReservations"));
	const hasFullReservationScope =
		[1000, 2000, 3000, 8000, 10000].some((role) => roleNumbers.includes(role)) ||
		roleDescriptions.includes("hotelmanager") ||
		roleDescriptions.includes("systemadmin") ||
		roleDescriptions.includes("reception") ||
		roleDescriptions.includes("reservationemployee");
	return hasOrderTakingScope && !hasFullReservationScope;
}

function canAccessPendingConfirmation(account = {}) {
	const roleNumbers = getAccountRoleNumbers(account);
	const roleDescriptions = getAccountRoleDescriptions(account);
	return (
		[1000, 2000, 6000, 8000, 10000].some((role) => roleNumbers.includes(role)) ||
		roleDescriptions.includes("hotelmanager") ||
		roleDescriptions.includes("systemadmin") ||
		roleDescriptions.includes("finance") ||
		roleDescriptions.includes("reservationemployee")
	);
}

const ReservationModalLayerStyles = createGlobalStyle`
	body .ant-modal-root .ant-modal-mask {
		z-index: 30049 !important;
	}

	body .ant-modal-root .ant-modal-wrap {
		z-index: 30050 !important;
	}

	body .ant-select-dropdown,
	body .ant-picker-dropdown,
	body .ant-dropdown {
		z-index: 30060 !important;
	}
`;

const NewReservationMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: ${(props) => (props.$embedded ? "0" : "70px")};
	min-height: ${(props) =>
		props.$embedded ? "auto" : "calc(100vh - 70px)"};
	background: #f7f8fc;

	.grid-container-main {
		direction: ltr;
		display: grid;
		grid-template-columns: ${(props) =>
			props.$embedded
				? "minmax(0, 1fr)"
				: props.$isArabic
				? props.$show
					? "minmax(0, 1fr) 80px"
					: "minmax(0, 1fr) 286px"
				: props.$show
				  ? "80px minmax(0, 1fr)"
				  : "286px minmax(0, 1fr)"};
		min-width: 0;
	}

	.navcontent {
		grid-column: ${(props) => (props.$isArabic ? "2" : "1")};
		grid-row: 1;
	}

	.otherContentWrapper {
		background: #f7f8fc;
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
		grid-column: ${(props) =>
			props.$embedded ? "1" : props.$isArabic ? "1" : "2"};
		grid-row: 1;
		min-width: 0;
		overflow: hidden;
		width: 100%;
	}

	.container-wrapper {
		max-width: 1360px;
		margin: 0 auto;
		min-width: 0;
		padding: clamp(10px, 1.4vw, 18px);
	}

	.container-wrapper.is-reservation-list {
		max-width: none;
		width: 100%;
		padding-inline: clamp(8px, 1vw, 14px);
	}

	.tab-grid {
		display: flex;
		gap: 8px;
		min-width: 0;
		overflow-x: auto;
		overflow-y: hidden;
		padding: 2px 0 4px;
		scrollbar-width: thin;
	}

	h3 {
		font-weight: bold;
		font-size: 2rem;
		text-align: center;
		color: #006ad1;
	}

	@media (max-width: 1600px) {
		.grid-container-main {
			grid-template-columns: ${(props) =>
				props.$embedded
					? "minmax(0, 1fr)"
					: props.$isArabic
					? props.$show
						? "minmax(0, 1fr) 80px"
						: "minmax(0, 1fr) 286px"
					: props.$show
					  ? "80px minmax(0, 1fr)"
					  : "286px minmax(0, 1fr)"};
		}
	}

	@media (max-width: 1200px) {
		.grid-container-main {
			display: block;
		}

		.otherContentWrapper {
			min-height: ${(props) =>
				props.$embedded ? "auto" : "calc(100vh - 70px)"};
			padding-inline-start: ${(props) =>
				!props.$embedded && !props.$isArabic && props.$show ? "72px" : "0"};
			padding-inline-end: ${(props) =>
				!props.$embedded && props.$isArabic && props.$show ? "72px" : "0"};
		}
	}

	@media (max-width: 560px) {
		.container-wrapper {
			padding: 8px;
		}

		.otherContentWrapper {
			padding-inline-start: 0;
			padding-inline-end: 0;
		}
	}
`;

const TabsShell = styled.div`
	background: #e3f2fd;
	border: 1px solid #cfe5fb;
	border-radius: 8px;
	margin: 8px auto 0;
	max-width: ${(props) => (props.$wide ? "none" : "1360px")};
	padding: 8px;
	min-width: 0;
	width: calc(100% - clamp(16px, 2.8vw, 36px));

	@media (max-width: 560px) {
		margin: 8px 8px 0;
		width: auto;
		padding: 7px;
	}
`;

const Tab = styled.div`
	display: ${(props) => (props.$isHidden ? "none" : "flex")};
	cursor: pointer;
	flex: 1 0 138px;
	margin: 0;
	padding: 11px 10px;
	font-weight: bold;
	background-color: ${(props) => (props.$isActive ? "#fff" : "#f3f7fb")};
	border: 1px solid
		${(props) => (props.$isActive ? "#9ecdf8" : "rgba(16, 24, 40, 0.08)")};
	border-radius: 8px;
	box-shadow: ${(props) =>
		props.$isActive ? "0 6px 16px rgba(30, 136, 229, 0.16)" : "none"};
	transition: all 0.3s ease;
	min-width: 0;
	text-align: center;
	z-index: 100;
	font-size: 0.95rem;
	color: #18212f;
	line-height: 1.25;
	align-items: center;
	justify-content: center;
	min-height: 52px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	@media (max-width: 1600px) {
		font-size: 0.88rem;
		padding: 10px 8px;
	}

	@media (max-width: 760px) {
		flex: 0 0 auto;
		font-size: 0.74rem;
		min-width: 92px;
		min-height: 48px;
		padding: 8px 10px;
	}
`;

const tabBadgeBeat = keyframes`
	0%,
	100% {
		transform: scale(1);
		box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35);
	}
	18% {
		transform: scale(1.08);
	}
	38% {
		transform: scale(1);
	}
	70% {
		box-shadow: 0 0 0 9px rgba(239, 68, 68, 0);
	}
`;

const TabBadge = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 22px;
	height: 22px;
	margin-inline-start: 8px;
	padding: 0 6px;
	border-radius: 999px;
	background: #ef4444;
	color: #fff;
	font-size: 0.72rem;
	font-weight: 900;
	line-height: 1;
	animation: ${tabBadgeBeat} 1.8s ease-in-out infinite;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
`;
