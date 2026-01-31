// src/HotelModule/NewReservation/NewReservationMain.js
import React, { useEffect, useRef, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
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
	const selectedHotelLocalStorage =
		JSON.parse(localStorage.getItem("selectedHotel")) || {};

	const { languageToggle, chosenLanguage } = useCartContext();

	const history = useHistory();
	const location = useLocation();
	const lastAutoSearchRef = useRef("");

	useEffect(() => {
		if (window.location.search.includes("reserveARoom")) {
			setActiveTab("reserveARoom");
		} else if (window.location.search.includes("newReservation")) {
			setActiveTab("newReservation");
		} else if (window.location.search.includes("list")) {
			setActiveTab("list");
		} else if (window.location.search.includes("inventory")) {
			setActiveTab("inventory");
		} else if (window.location.search.includes("heatmap")) {
			setActiveTab("heatmap");
		} else if (window.location.search.includes("housingreport")) {
			setActiveTab("housingreport");
		} else {
			setActiveTab("list");
		}
		// eslint-disable-next-line
	}, [activeTab]);

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
			show={collapsed}
			showList={
				window.location.search.includes("list") ||
				window.location.search.includes("housingreport")
			}
		>
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
					<div
						style={{
							textAlign: chosenLanguage === "Arabic" ? "left" : "right",
							fontWeight: "bold",
							textDecoration: "underline",
							cursor: "pointer",
						}}
						onClick={() => {
							if (chosenLanguage === "English") languageToggle("Arabic");
							else languageToggle("English");
						}}
					>
						{chosenLanguage === "English" ? "ARABIC" : "English"}
					</div>

					<div style={{ background: "#ededed", padding: "1px" }}>
						<div className='my-2 tab-grid col-md-9  mr-3'>
							<Tab
								isActive={activeTab === "heatmap"}
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
								isActive={activeTab === "reserveARoom"}
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
								isActive={activeTab === "newReservation"}
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
									? "حجز جديد (بدون غرف)"
									: "New Reservation"}
							</Tab>

							<Tab
								isActive={activeTab === "list"}
								onClick={() => {
									setActiveTab("list");
									history.push(
										`/hotel-management/new-reservation/${
											user.role === 2000
												? user._id
												: selectedHotel.belongsTo._id
										}/${selectedHotelLocalStorage._id}?list`,
									);
								}}
							>
								{chosenLanguage === "Arabic"
									? "قائمة الحجوزات"
									: "Reservation List"}
							</Tab>

							<Tab
								isActive={activeTab === "housingreport"}
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
					</div>

					<div className='container-wrapper'>
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

const NewReservationMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 46px;
	min-height: 750px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) =>
			props.show ? "5% 90%" : props.showList ? "13% 87%" : "15% 80%"};
	}

	.container-wrapper {
		padding: 20px;
		border-radius: 20px;
		margin: 0px 10px;
	}

	.tab-grid {
		display: flex;
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
				props.show ? "5% 90%" : props.showList ? "13% 87%" : "19% 81%"};
		}
	}
`;

const Tab = styled.div`
	cursor: pointer;
	margin: 0 3px;
	padding: 15px 5px;
	font-weight: bold;
	background-color: ${(props) => (props.isActive ? "transparent" : "#e0e0e0")};
	box-shadow: ${(props) =>
		props.isActive ? "inset 5px 5px 5px rgba(0, 0, 0, 0.3)" : "none"};
	transition: all 0.3s ease;
	min-width: 25px;
	width: 100%;
	text-align: center;
	z-index: 100;
	font-size: 1.2rem;
	color: black;

	@media (max-width: 1600px) {
		font-size: 1rem;
		padding: 10px 1px;
	}
`;
