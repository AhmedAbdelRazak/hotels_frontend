// src/HotelModule/NewReservation/NewReservationMain.js
import React, { useEffect, useRef, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled, { createGlobalStyle } from "styled-components";
// eslint-disable-next-line
import { Link, useHistory, useLocation } from "react-router-dom";
import { useCartContext } from "../../cart_context";
import moment from "moment";
import ZReservationForm from "./ZReservationForm";
import {
	createNewReservation,
	getHotelRooms,
	hotelAccount,
	getHotelReservationsCurrent,
	getHotelReservationsRange,
	getListOfRoomSummary,
	getReservationSearch,
	updateSingleReservation,
	getHotelInventoryAvailability,
	getHotelById,
	getTodaysCheckins,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import { toast } from "react-toastify";
import ZReservationForm2 from "./ZReservationForm2";
import { Spin } from "antd";
import HotelRunnerReservationList from "./HotelRunnerReservationList";
import useBoss from "../useBoss";
import HotelHeatMap from "./HotelHeatMap";
import InHouseReport from "./InHouseReport";
import { getStoredMenuCollapsed } from "../utils/menuState";

const NewReservationMain = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [loading, setLoading] = useState(false);
	const [hotelRooms, setHotelRooms] = useState("");
	const [hotelDetails, setHotelDetails] = useState("");
	const [roomsSummary, setRoomsSummary] = useState("");
	const [payment_status, setPaymentStatus] = useState("Not Paid");
	const [booking_comment, setBookingComment] = useState("");
	const [confirmation_number, setConfirmationNumber] = useState("");
	const [booking_source, setBookingSource] = useState("");
	const [pickedHotelRooms, setPickedHotelRooms] = useState([]);
	const [pickedRoomPricing, setPickedRoomPricing] = useState([]); // flattened like OrderTaker
	const [allReservations, setAllReservations] = useState([]);
	const [todaysCheckins, setTodaysCheckins] = useState(null);
	const [values, setValues] = useState("");
	const [pickedRoomsType, setPickedRoomsType] = useState([]); // UI summary lines
	const [total_amount, setTotal_Amount] = useState(0);
	// eslint-disable-next-line
	const [clickedMenu, setClickedMenu] = useState("list");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchClicked, setSearchClicked] = useState(false);
	const [searchedReservation, setSearchedReservation] = useState("");
	const [roomInventory, setRoomInventory] = useState([]);
	const [activeTab, setActiveTab] = useState("list");
	const [sendEmail, setSendEmail] = useState(false);
	const [total_guests, setTotalGuests] = useState("");
	const [allReservationsHeatMap, setAllReservationsHeatMap] = useState([]);
	const [bedNumber, setBedNumber] = useState([]);
	const [start_date_Map, setStart_date_Map] = useState("");
	const [end_date_Map, setEnd_date_Map] = useState("");
	const [paidAmount, setPaidAmount] = useState("");
	const [currentRoom, setCurrentRoom] = useState(null);
	const [pricingByDay, setPricingByDay] = useState([]);
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
	const canShowReservationTab = (tab) =>
		!limitedOrderTakerAccount || ["newReservation", "list"].includes(tab);
	const orderTakerSnapshot = {
		_id: user?._id || "",
		name: user?.name || user?.email || "",
		email: user?.email || "",
		role: user?.role || "",
		roleDescription: user?.roleDescription || "",
	};
	const selectedHotelLocalStorage =
		JSON.parse(localStorage.getItem("selectedHotel")) || {};

	const { chosenLanguage } = useCartContext();

	const history = useHistory();
	const location = useLocation();
	const lastAutoSearchRef = useRef("");

	useEffect(() => {
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

		if (activeTab !== nextTab) {
			setActiveTab(nextTab);
		}
	}, [
		activeTab,
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

	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};

	const gettingHotelData = () => {
		hotelAccount(user._id, token, user._id).then((data) => {
			if (data && data.error) {
				console.log(data.error);
			} else {
				setValues(data);

				const userId =
					user.role === 2000
						? user._id
						: selectedHotelLocalStorage.belongsTo._id;

				const endDate = new Date();
				const startDate = new Date();
				startDate.setDate(endDate.getDate());
				const heatMapStartDate = formatDate(startDate);

				endDate.setDate(endDate.getDate() + 60);
				const heatMapEndDate = formatDate(endDate);

				setStart_date_Map(moment(heatMapStartDate));
				setEnd_date_Map(moment(heatMapEndDate));

				const selectedHotelLS =
					JSON.parse(localStorage.getItem("selectedHotel")) || {};
				if (!selectedHotelLS || !selectedHotelLS._id) {
					console.log("No hotel selected");
					return;
				}
				const hotelId = selectedHotelLS._id;

				getHotelById(hotelId).then((data2) => {
					if (data2 && data2.error) {
						console.log(data2.error);
					} else {
						if (data && data.name && data._id && data2) {
							const belongsToId =
								user.role === 2000 ? user._id : selectedHotelLS.belongsTo._id;

							if (heatMapStartDate && heatMapEndDate) {
								getHotelReservationsCurrent(hotelId, belongsToId).then(
									(data3) => {
										if (data3 && data3.error) {
											console.log(data3.error);
										} else {
											setAllReservationsHeatMap(
												Array.isArray(data3) ? data3 : [],
											);
										}
									},
								);

								getTodaysCheckins(hotelId, belongsToId).then((todayData) => {
									if (todayData && todayData.error) {
										console.log(todayData.error);
										setTodaysCheckins([]);
									} else {
										setTodaysCheckins(
											Array.isArray(todayData) ? todayData : [],
										);
									}
								});
							}

							const rangeStart = start_date ? formatDate(start_date) : "";
							const rangeEnd = end_date ? formatDate(end_date) : "";
							if (rangeStart && rangeEnd) {
								getHotelReservationsRange(
									hotelId,
									belongsToId,
									rangeStart,
									rangeEnd,
								).then((data4) => {
									if (data4 && data4.error) {
										console.log(data4.error);
									} else {
										setAllReservations(Array.isArray(data4) ? data4 : []);
									}
								});
							} else {
								setAllReservations([]);
							}

							if (!hotelDetails) setHotelDetails(data2);

							if (!hotelRooms || hotelRooms.length === 0) {
								getHotelRooms(hotelId, userId).then((data3) => {
									if (data3 && data3.error) {
										console.log(data3.error);
									} else {
										setHotelRooms(data3);
									}
								});
							}
						}
					}
				});
			}
		});
	};

	const gettingOverallRoomsSummary = () => {
		if (start_date && end_date) {
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
					setPaymentStatus(data.payment_status);
					setBookingComment(data.comment);
					setBookingSource(data.booking_source);
					setConfirmationNumber(data.confirmation_number);
					setPaymentStatus(data.payment_status);
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

	const clickSubmit = () => {
		if (!customer_details.name) return toast.error("Name is required");
		if (!customer_details.phone) return toast.error("Phone is required");
		if (!customer_details.passport) return toast.error("passport is required");
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
		if (!booking_source) return toast.error("Booking Source is required");

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

		const selectedHotelLS =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		if (!selectedHotelLS || !selectedHotelLS._id) {
			console.log("No hotel selected");
			return;
		}

		// eslint-disable-next-line
		const total_amount_calculated = calculateTotalAmountNoRooms();
		const total_amount_calculated_WithRooms = calculateTotalAmountWithRooms();

		// === OrderTaker parity (for New Reservation path) ===
		// Child ZReservationForm2 exports `pickedRoomPricing` already in transformPickedRooms shape.
		// As a fallback, we can transform from summary lines.
		const apiPickedRooms =
			pickedRoomPricing && pickedRoomPricing.length > 0
				? pickedRoomPricing
				: transformFromSummaryToApi(pickedRoomsType);

		const new_reservation = {
			customer_details,
			calculateTotalAmountWithRooms: calculateTotalAmountWithRooms(),
			checkin_date: start_date,
			checkout_date: end_date,
			days_of_residence,
			payment_status,
			total_amount:
				Number(total_amount) !== 0
					? Number(total_amount) * nights
					: total_amount_calculated,
			booking_source,
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
			reservation_status: pickedHotelRooms.length > 0 ? "InHouse" : "Confirmed",
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
				booking_source,
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
					console.log(data.error);
				} else {
					toast.success("Checkin Was Successfully Processed!");
					setTimeout(() => window.location.reload(false), 1500);
				}
			});
		} else {
			createNewReservation(
				user.role === 2000 ? user._id : selectedHotelLS.belongsTo._id,
				hotelDetails._id,
				token,
				new_reservation,
			).then((data) => {
				if (data && data.error) {
					console.log(data.error, "error create new reservation");
				} else {
					toast.success("Reservation Was Successfully Booked!");
					setTimeout(() => window.location.reload(false), 1500);
				}
			});
		}
	};

	useEffect(() => {
		gettingHotelData();
		// eslint-disable-next-line
	}, [start_date, end_date]);

	const getRoomInventory = () => {
		const formattedStartDate = formatDate(start_date);
		const formattedEndDate = formatDate(end_date);
		if (!formattedStartDate || !formattedEndDate || !hotelDetails?._id) return;
		getHotelInventoryAvailability(hotelDetails._id, {
			start: formattedStartDate,
			end: formattedEndDate,
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
	}, [start_date, end_date]);

	return (
		<NewReservationMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			$show={collapsed}
			$isArabic={chosenLanguage === "Arabic"}
		>
			<ReservationModalLayerStyles />
			<div className='grid-container-main'>
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

				<div className='otherContentWrapper'>
					<TabsShell $wide={activeTab === "list"}>
						<div className='tab-grid'>
							<Tab
								$isHidden={!canShowReservationTab("heatmap")}
								$isActive={activeTab === "heatmap"}
								onClick={() => {
									setActiveTab("heatmap");
									history.push(
										`/hotel-management/new-reservation/${
											user.role === 2000
												? user._id
												: selectedHotel.belongsTo._id
										}/${selectedHotelLocalStorage._id}?heatmap`,
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
										`/hotel-management/new-reservation/${
											user.role === 2000
												? user._id
												: selectedHotel.belongsTo._id
										}/${selectedHotelLocalStorage._id}?reserveARoom`,
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
										`/hotel-management/new-reservation/${
											user.role === 2000
												? user._id
												: selectedHotel.belongsTo._id
										}/${selectedHotelLocalStorage._id}?newReservation`,
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
										`/hotel-management/new-reservation/${
											user.role === 2000
												? user._id
												: selectedHotel.belongsTo._id
										}/${selectedHotelLocalStorage._id}?list=&page=1`,
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
										`/hotel-management/new-reservation/${
											user.role === 2000
												? user._id
												: selectedHotel.belongsTo._id
										}/${selectedHotelLocalStorage._id}?housingreport`,
									);
								}}
							>
								{chosenLanguage === "Arabic"
									? "تقرير التسكين"
									: "In House Report"}
							</Tab>
						</div>
					</TabsShell>

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
							<InHouseReport
								hotelDetails={hotelDetails}
								chosenLanguage={chosenLanguage}
								isBoss={isBoss}
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
		[1000, 2000, 3000].some((role) => roleNumbers.includes(role)) ||
		roleDescriptions.includes("hotelmanager") ||
		roleDescriptions.includes("reception");
	return hasOrderTakingScope && !hasFullReservationScope;
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
	margin-top: 70px;
	min-height: calc(100vh - 70px);
	background: #f7f8fc;

	.grid-container-main {
		direction: ltr;
		display: grid;
		grid-template-columns: ${(props) =>
			props.$isArabic
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
		grid-column: ${(props) => (props.$isArabic ? "1" : "2")};
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
				props.$isArabic
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
			min-height: calc(100vh - 70px);
			padding-inline-start: ${(props) =>
				!props.$isArabic && props.$show ? "72px" : "0"};
			padding-inline-end: ${(props) =>
				props.$isArabic && props.$show ? "72px" : "0"};
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
