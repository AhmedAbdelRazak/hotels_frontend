import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import styled from "styled-components";
import { DatePicker, Spin } from "antd";
import HotelOverviewReservation from "./HotelOverviewReservation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { toast } from "react-toastify";
import {
	agodaData,
	airbnbData,
	bookingData,
	expediaData,
	janatData,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";

dayjs.extend(utc);

const normalizeNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) =>
	normalizeNumber(value, 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});

const summarizePayment = (reservation, paymentOverride = "") => {
	const paymentModeRaw =
		(paymentOverride ||
			reservation?.payment ||
			reservation?.payment_status ||
			reservation?.financeStatus ||
			"") + "";
	const paymentMode = paymentModeRaw.toLowerCase().trim();
	const pd = reservation?.paypal_details || {};
	const legacyCaptured = !!reservation?.payment_details?.captured;
	const payOffline =
		normalizeNumber(reservation?.payment_details?.onsite_paid_amount, 0) > 0 ||
		paymentMode === "paid offline";
	const breakdown = reservation?.paid_amount_breakdown || {};
	const breakdownCaptured = Object.keys(breakdown).some((key) => {
		if (key === "payment_comments") return false;
		return normalizeNumber(breakdown[key], 0) > 0;
	});
	const capTotal = normalizeNumber(pd?.captured_total_usd, 0);
	const initialCompleted =
		(pd?.initial?.capture_status || "").toUpperCase() === "COMPLETED";
	const anyMitCompleted =
		Array.isArray(pd?.mit) &&
		pd.mit.some((c) => (c?.capture_status || "").toUpperCase() === "COMPLETED");

	const isCaptured =
		legacyCaptured ||
		capTotal > 0 ||
		initialCompleted ||
		anyMitCompleted ||
		paymentMode === "paid online" ||
		paymentMode === "captured" ||
		paymentMode === "credit/ debit" ||
		paymentMode === "credit/debit" ||
		breakdownCaptured;

	const isNotPaid = paymentMode === "not paid" && !isCaptured && !payOffline;

	let status = "Not Captured";
	if (isCaptured) status = "Captured";
	else if (payOffline) status = "Paid Offline";
	else if (isNotPaid) status = "Not Paid";

	return { status, isCaptured, paidOffline: payOffline, paymentMode };
};

const ZReservationForm = ({
	customer_details,
	setCustomer_details,
	start_date,
	setStart_date,
	end_date,
	setEnd_date,
	disabledDate,
	chosenLanguage,
	hotelDetails,
	hotelRooms,
	values,
	setPickedHotelRooms,
	pickedHotelRooms,
	clickSubmit,
	total_amount,
	setTotal_Amount,
	days_of_residence,
	setDays_of_residence,
	setPickedRoomPricing,
	pickedRoomPricing,
	allReservations,
	setBookingComment,
	booking_comment,
	setBookingSource,
	booking_source,
	todaysCheckins,
	payment_status,
	setConfirmationNumber,
	confirmation_number,
	setPaymentStatus,
	searchQuery,
	setSearchQuery,
	searchClicked,
	setSearchClicked,
	searchedReservation,
	setSearchedReservation,
	pickedRoomsType,
	setPickedRoomsType,
	finalTotalByRoom,
	isBoss,
	start_date_Map,
	end_date_Map,
	bedNumber,
	setBedNumber, // Added to accept the bedNumber state from the parent component
	currentRoom,
	setCurrentRoom,
	pricingByDay,
	setPricingByDay,
	sidebarCollapsed = false,
}) => {
	// eslint-disable-next-line
	const [loading, setLoading] = useState(false);
	const [taskeenClicked, setTaskeenClicked] = useState(false);
	const [selectedTodayReservationId, setSelectedTodayReservationId] =
		useState("");
	const taskeenSummaryRef = useRef(null);
	const reviewPanelRef = useRef(null);
	const hotelMapRef = useRef(null);
	const [mobileMapActionVisible, setMobileMapActionVisible] = useState(false);

	const [isFixed, setIsFixed] = useState(false);

	const { user } = isAuthenticated();

	useEffect(() => {
		if (!Array.isArray(pickedHotelRooms)) return;
		const normalized = pickedHotelRooms
			.map((entry) => {
				if (!entry) return null;
				if (typeof entry === "string" || typeof entry === "number") {
					return String(entry);
				}
				if (typeof entry === "object") {
					return entry._id || entry.roomId || entry.id || entry.room_id || null;
				}
				return null;
			})
			.filter(Boolean)
			.map((id) => String(id));
		const unique = Array.from(new Set(normalized));
		const current = pickedHotelRooms
			.map((entry) => {
				if (!entry) return null;
				if (typeof entry === "string" || typeof entry === "number") {
					return String(entry);
				}
				if (typeof entry === "object") {
					return entry._id || entry.roomId || entry.id || entry.room_id || null;
				}
				return null;
			})
			.filter(Boolean)
			.map((id) => String(id));
		if (unique.join("|") !== current.join("|")) {
			setPickedHotelRooms(unique);
		}
	}, [pickedHotelRooms, setPickedHotelRooms]);

	const pickedRoomsDetailed = useMemo(() => {
		const roomMap = new Map(
			(Array.isArray(hotelRooms) ? hotelRooms : []).map((room) => [
				String(room?._id),
				room,
			]),
		);
		return (Array.isArray(pickedHotelRooms) ? pickedHotelRooms : [])
			.map((roomId) => roomMap.get(String(roomId)))
			.filter(Boolean);
	}, [hotelRooms, pickedHotelRooms]);

	const pricingByRoomId = useMemo(() => {
		const map = new Map();
		(Array.isArray(pickedRoomPricing) ? pickedRoomPricing : []).forEach(
			(pricing) => {
				if (!pricing?.roomId) return;
				map.set(String(pricing.roomId), pricing);
			},
		);
		return map;
	}, [pickedRoomPricing]);

	const handleRemoveAssignedRoom = useCallback(
		(roomId) => {
			if (!roomId) return;
			const roomIdStr = String(roomId);
			const pricingEntry = Array.isArray(pickedRoomPricing)
				? pickedRoomPricing.find(
						(pricing) => String(pricing.roomId) === roomIdStr,
				  )
				: null;
			const priceToRemove = pricingEntry
				? normalizeNumber(pricingEntry.chosenPrice, 0)
				: 0;

			setPickedHotelRooms((prev) =>
				Array.isArray(prev)
					? prev.filter((id) => String(id) !== roomIdStr)
					: prev,
			);
			setPickedRoomPricing((prev) =>
				Array.isArray(prev)
					? prev.filter((pricing) => String(pricing.roomId) !== roomIdStr)
					: prev,
			);
			if (priceToRemove) {
				setTotal_Amount((prevTotal) =>
					Math.max(prevTotal - Number(priceToRemove), 0),
				);
			}
			if (currentRoom && String(currentRoom._id) === roomIdStr) {
				setCurrentRoom(null);
			}
		},
		[
			currentRoom,
			pickedRoomPricing,
			setCurrentRoom,
			setPickedHotelRooms,
			setPickedRoomPricing,
			setTotal_Amount,
		],
	);

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollPos = window.pageYOffset;
			if (currentScrollPos > 750) {
				setIsFixed(true);
			} else if (currentScrollPos < 750) {
				setIsFixed(false);
			}
		};

		window.addEventListener("scroll", handleScroll);

		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	useEffect(() => {
		if (
			!taskeenClicked ||
			typeof window === "undefined" ||
			window.innerWidth > 760
		) {
			setMobileMapActionVisible(false);
			return undefined;
		}

		const mapNode = hotelMapRef.current;
		if (!mapNode || typeof IntersectionObserver === "undefined") {
			setMobileMapActionVisible(false);
			return undefined;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				setMobileMapActionVisible(entry.isIntersecting);
			},
			{
				threshold: 0.08,
				rootMargin: "-72px 0px -32% 0px",
			},
		);

		observer.observe(mapNode);
		return () => observer.disconnect();
	}, [taskeenClicked]);

	const toDayjs = (value) => {
		if (!value) return null;
		if (dayjs.isDayjs(value)) return value;
		const parsed = dayjs(value);
		return parsed.isValid() ? parsed : null;
	};

	const todaysReservations = useMemo(() => {
		if (Array.isArray(todaysCheckins)) return todaysCheckins;
		if (!Array.isArray(allReservations)) return [];

		const todayLocal = dayjs().format("YYYY-MM-DD");
		const todayUtc = dayjs().utc().format("YYYY-MM-DD");

		return allReservations.filter((reservation) => {
			const rawCheckin =
				reservation.checkin_date || reservation.checkinDate || "";
			const checkin = dayjs(rawCheckin);
			if (!checkin.isValid()) return false;

			const status = (reservation.reservation_status || "").toLowerCase();
			if (
				status.includes("checked_out") ||
				status.includes("cancelled") ||
				status.includes("canceled") ||
				status.includes("no_show")
			) {
				return false;
			}

			const checkinLocal = checkin.format("YYYY-MM-DD");
			const checkinUtc = checkin.utc().format("YYYY-MM-DD");
			return checkinLocal === todayLocal || checkinUtc === todayUtc;
		});
	}, [allReservations, todaysCheckins]);

	const populateFromReservation = (reservation) => {
		if (!reservation) return;

		setCustomer_details((prev) => ({
			...prev,
			...(reservation.customer_details || {}),
		}));

		const checkinDate = reservation.checkin_date
			? dayjs(reservation.checkin_date)
			: null;
		const checkoutDate = reservation.checkout_date
			? dayjs(reservation.checkout_date)
			: null;

		setStart_date(
			checkinDate && checkinDate.isValid()
				? checkinDate.startOf("day").toISOString()
				: null,
		);
		setEnd_date(
			checkoutDate && checkoutDate.isValid()
				? checkoutDate.startOf("day").toISOString()
				: null,
		);

		if (checkinDate && checkoutDate) {
			const duration = checkoutDate.diff(checkinDate, "day");
			setDays_of_residence(duration >= 0 ? duration + 1 : 0);
		} else {
			setDays_of_residence(0);
		}

		setBookingSource(reservation.booking_source || "");
		setBookingComment(reservation.comment || "");
		setConfirmationNumber(reservation.confirmation_number || "");
		setPaymentStatus(
			reservation.payment ||
				reservation.payment_status ||
				reservation.financeStatus ||
				"",
		);
		const roomsFromType = Array.isArray(reservation.pickedRoomsType)
			? reservation.pickedRoomsType
			: [];
		const roomsFromPricing = Array.isArray(reservation.pickedRoomsPricing)
			? reservation.pickedRoomsPricing.filter((room) => room && room.room_type)
			: [];
		setPickedRoomsType(
			roomsFromType.length > 0 ? roomsFromType : roomsFromPricing,
		);

		setSearchClicked(false);
		setSearchedReservation(reservation);
	};

	const handleTodayReservationChange = (event) => {
		const reservationId = event.target.value;
		setSelectedTodayReservationId(reservationId);

		if (!reservationId) return;

		const selectedReservation = todaysReservations.find(
			(reservation) => reservation._id === reservationId,
		);
		populateFromReservation(selectedReservation);
	};

	const onStartDateChange = (value) => {
		const dateAtMidnight = value ? value.startOf("day") : null;

		setStart_date(dateAtMidnight ? dateAtMidnight.toISOString() : null);

		if (dateAtMidnight && end_date) {
			const adjustedEndDate = dayjs(end_date).startOf("day");
			const duration = adjustedEndDate.diff(dateAtMidnight, "day");
			setDays_of_residence(duration >= 0 ? duration + 1 : 0);
		} else {
			setDays_of_residence(0);
		}
	};

	const onEndDateChange = (date) => {
		const adjustedEndDate = date ? date.startOf("day") : null;

		setEnd_date(adjustedEndDate ? adjustedEndDate.toISOString() : null);

		if (adjustedEndDate && start_date) {
			const adjustedStartDate = dayjs(start_date).startOf("day");
			const duration = adjustedEndDate.diff(adjustedStartDate, "day");
			setDays_of_residence(duration >= 0 ? duration + 1 : 0);
		} else {
			setDays_of_residence(0);
		}
	};

	const disabledEndDate = (current) => {
		if (!start_date) return false;
		return current && current.isBefore(dayjs(start_date).startOf("day"), "day");
	};

	const displayPickedRoomsType =
		Array.isArray(pickedRoomsType) && pickedRoomsType.length > 0
			? pickedRoomsType
			: searchedReservation &&
			    Array.isArray(searchedReservation.pickedRoomsType)
			  ? searchedReservation.pickedRoomsType
			  : [];

	const paymentSummary = useMemo(
		() => summarizePayment(searchedReservation, payment_status),
		[searchedReservation, payment_status],
	);

	const totalAmountValue = useMemo(() => {
		if (searchedReservation && searchedReservation.confirmation_number) {
			return normalizeNumber(searchedReservation.total_amount, 0);
		}
		if (typeof finalTotalByRoom === "function") {
			return normalizeNumber(finalTotalByRoom(), 0);
		}
		return normalizeNumber(finalTotalByRoom, 0);
	}, [searchedReservation, finalTotalByRoom]);

	const paidOnline = normalizeNumber(searchedReservation?.paid_amount, 0);
	const paidOffline = normalizeNumber(
		searchedReservation?.payment_details?.onsite_paid_amount,
		0,
	);
	const totalPaid = paidOnline + paidOffline;
	const isCreditDebit =
		paymentSummary.paymentMode === "credit/ debit" ||
		paymentSummary.paymentMode === "credit/debit";
	const assumePaidInFull =
		isCreditDebit || (paymentSummary.isCaptured && totalPaid === 0);
	const amountDue = assumePaidInFull
		? 0
		: Math.max(totalAmountValue - totalPaid, 0);

	const displayPaymentLabel = searchedReservation
		? searchedReservation.payment === payment_status
			? payment_status
			: searchedReservation.payment || payment_status
		: payment_status;

	const handleTaskeenClicked = () => {
		if (!customer_details.name) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال اسم الزائر"
					: "Name is required",
			);
		}
		if (!customer_details.phone) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال رقم هاتف الزائر"
					: "Phone is required",
			);
		}
		if (!customer_details.passport) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال رقم جواز الزائر"
					: "passport is required",
			);
		}
		if (!customer_details.nationality) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال جنسية الزائر"
					: "nationality is required",
			);
		}
		if (!start_date) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال تاريخ وصول الزائر"
					: "Check in Date is required",
			);
		}

		if (!end_date) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال تاريخ مغادرة الزائر"
					: "Check out Date is required",
			);
		}
		setTaskeenClicked(true);
		const isCompactScreen = window.innerWidth <= 760;
		setTimeout(() => {
			if (isCompactScreen) {
				const target =
					hotelMapRef.current || reviewPanelRef.current || taskeenSummaryRef.current;
				if (!target) return;
				target.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
				return;
			}
			window.scrollTo({ top: 760, behavior: "smooth" });
		}, isCompactScreen ? 180 : 1000);
	};

	const handleFileUpload = (uploadFunction) => {
		const isFromUS = window.confirm(
			"Is this upload from the US? Click OK for Yes, Cancel for No.",
		);
		const country = isFromUS ? "US" : "NotUS";

		const accountId = hotelDetails._id;
		const belongsTo = user._id;
		const fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.accept =
			".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";
		fileInput.onchange = (e) => {
			setLoading(true);
			const file = e.target.files[0];
			uploadFunction(accountId, belongsTo, file, country).then((data) => {
				setLoading(false);
				if (data.error) {
					console.log(data.error);
					toast.error("Error uploading data");
				} else {
					toast.success("Data uploaded successfully!");
				}
			});
		};
		fileInput.click();
	};

	return (
		<ZReservationFormWrapper
			$arabic={chosenLanguage === "Arabic"}
			$sidebarCollapsed={sidebarCollapsed}
		>
			{loading ? (
				<>
					<div className='text-center my-5'>
						<Spin size='large' />
						<p>
							{" "}
							{chosenLanguage === "Arabic" ? "" : ""} Loading Reservations...
						</p>
					</div>
				</>
			) : (
				<>
					{isBoss ? (
						<div className='mx-auto mb-5 mt-4 text-center'>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(agodaData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات أجودا"
									: "Agoda Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(expediaData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات إكسبيديا"
									: "Expedia Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(bookingData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات بوكينج"
									: "Booking Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(airbnbData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات Airbnb"
									: "Airbnb Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(janatData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات Janat"
									: "Janat Upload"}
							</button>
						</div>
					) : null}

					<div className='row'>
						<div className='col-md-8 mx-auto'>
							<div className='today-checkins-field my-1'>
								<label style={{ fontWeight: "bold" }}>
									{chosenLanguage === "Arabic"
										? "حجوزات الوصول اليوم (حسب اسم الضيف)"
										: "Today's Check-ins"}
								</label>
								<select
									className='form-control'
									value={selectedTodayReservationId}
									onChange={handleTodayReservationChange}
								>
									<option value=''>
										{chosenLanguage === "Arabic"
											? "اختر الحجز"
											: "Select a reservation"}
									</option>
									{todaysReservations.map((reservation) => {
										const name = reservation.customer_details?.name || "Guest";
										const nickName = reservation.customer_details?.nickName;
										const label =
											nickName && nickName !== name
												? `${name} | ${nickName}`
												: name;
										return (
											<option key={reservation._id} value={reservation._id}>
												{label}
											</option>
										);
									})}
								</select>
							</div>
							<div className='reservation-search-field my-4'>
								<div className='row reservation-search-grid'>
									<div className='col-md-9 my-auto'>
										<input
											type='text'
											className='form-control'
											placeholder={
												chosenLanguage === "Arabic"
													? "البحث بالاسم، رقم جواز السفر، رقم التأكيد"
													: "search by name, passport #, confirmation #"
											}
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											onKeyPress={(e) => {
												if (e.key === "Enter") {
													setSearchClicked(!searchClicked);
												}
											}}
										/>
									</div>
									<div
										className='col-md-3 my-auto'
										onClick={() => {
											setSearchClicked(!searchClicked);
										}}
									>
										<button className='btn btn-success'>
											{" "}
											{chosenLanguage === "Arabic" ? "البحث..." : "Search..."}
										</button>
									</div>
								</div>
							</div>

							<div className='row guest-details-grid'>
								<div className='col-md-4 guest-name-field'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{" "}
											{chosenLanguage === "Arabic" ? "الاسم" : "Guest Name"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.name}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													name: e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className='col-md-4 guest-phone-field'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{" "}
											{chosenLanguage === "Arabic" ? "الهاتف" : "Guest Phone"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.phone}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													phone: e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className='col-md-4 guest-email-field'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "البريد الإلكتروني"
												: "Guest Email"}{" "}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.email}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													email: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div className='col-md-3 guest-passport-field'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{" "}
											{chosenLanguage === "Arabic"
												? "رقم جواز السفر"
												: "Guest Passport #"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.passport}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													passport: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div className='col-md-3 guest-passport-copy-field'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{" "}
											{chosenLanguage === "Arabic"
												? "نسخة جواز السفر   "
												: "Passport Copy #"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.copyNumber}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													copyNumber: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div className='col-md-3 guest-birth-field'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "تاريخ الميلاد"
												: "Date Of Birth"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.passportExpiry}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													passportExpiry: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div className='col-md-3 guest-nationality-field'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic" ? "الجنسية" : "Nationality"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.nationality}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													nationality: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div
									className={
										customer_details.hasCar === "yes"
											? "col-md-4 guest-car-question-field"
											: "col-md-8 mx-auto guest-car-question-field"
									}
								>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "هل لدى الضيف سيارة؟"
												: "Does The Guest Have A Car?"}
										</label>
										<div>
											<div
												className='mx-3'
												style={{ display: "inline-block", marginRight: "10px" }}
											>
												<input
													type='radio'
													name='hasCar'
													value='yes'
													checked={customer_details.hasCar === "yes"}
													onChange={(e) =>
														setCustomer_details({
															...customer_details,
															hasCar: e.target.value,
														})
													}
												/>
												{chosenLanguage === "Arabic" ? "نعم" : "Yes"}
											</div>
											<div style={{ display: "inline-block" }}>
												<input
													type='radio'
													name='hasCar'
													value='no'
													checked={customer_details.hasCar === "no"}
													onChange={(e) =>
														setCustomer_details({
															...customer_details,
															hasCar: e.target.value,
														})
													}
												/>
												{chosenLanguage === "Arabic" ? "لا" : "No"}
											</div>
										</div>
									</div>
								</div>
								{customer_details.hasCar === "yes" && (
									<>
										<div className='col-md-2'>
											<div
												className='form-group'
												style={{ marginTop: "10px", marginBottom: "10px" }}
											>
												<label style={{ fontWeight: "bold" }}>
													{chosenLanguage === "Arabic"
														? "رقم لوحة السيارة"
														: "License Plate"}
												</label>
												<input
													type='text'
													value={customer_details.carLicensePlate}
													onChange={(e) =>
														setCustomer_details({
															...customer_details,
															carLicensePlate: e.target.value,
														})
													}
												/>
											</div>
										</div>
										<div className='col-md-2'>
											<div
												className='form-group'
												style={{ marginTop: "10px", marginBottom: "10px" }}
											>
												<label style={{ fontWeight: "bold" }}>
													{chosenLanguage === "Arabic"
														? "لون السيارة"
														: "Car Color"}
												</label>
												<input
													type='text'
													value={customer_details.carColor}
													onChange={(e) =>
														setCustomer_details({
															...customer_details,
															carColor: e.target.value,
														})
													}
												/>
											</div>
										</div>
										<div className='col-md-2'>
											<div
												className='form-group'
												style={{ marginTop: "10px", marginBottom: "10px" }}
											>
												<label style={{ fontWeight: "bold" }}>
													{chosenLanguage === "Arabic"
														? "موديل/نوع السيارة"
														: "Car Model"}
												</label>
												<input
													type='text'
													value={customer_details.carModel}
													onChange={(e) =>
														setCustomer_details({
															...customer_details,
															carModel: e.target.value,
														})
													}
												/>
											</div>
										</div>
									</>
								)}

								<div className='col-md-6 stay-date-field checkin-date-field'>
									<label
										className='dataPointsReview mt-3'
										style={{
											fontWeight: "bold",
											fontSize: "1.05rem",
											color: "#32322b",
										}}
									>
										{chosenLanguage === "Arabic"
											? "تاريخ الوصول"
											: "Checkin Date"}{" "}
										{start_date
											? `(${new Date(start_date).toDateString()})`
											: ""}
									</label>
									<br />
									<DatePicker
										className='inputFields'
										disabledDate={disabledDate}
										inputReadOnly
										size='small'
										showToday={true}
										format='YYYY-MM-DD'
										value={toDayjs(start_date)}
										placeholder='Please pick the desired schedule checkin date'
										style={{
											height: "auto",
											width: "100%",
											padding: "10px",
											boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
											borderRadius: "10px",
										}}
										onChange={onStartDateChange}
									/>
								</div>

								<div className='col-md-6 stay-date-field checkout-date-field'>
									<label
										className='dataPointsReview mt-3'
										style={{
											fontWeight: "bold",
											fontSize: "1.05rem",
											color: "#32322b",
										}}
									>
										{chosenLanguage === "Arabic"
											? "موعد انتهاء الأقامة"
											: "Checkout Date"}{" "}
										{end_date ? `(${new Date(end_date).toDateString()})` : ""}
									</label>
									<br />
									<DatePicker
										className='inputFields'
										disabledDate={disabledEndDate}
										inputReadOnly
										size='small'
										showToday={true}
										format='YYYY-MM-DD'
										value={toDayjs(end_date)}
										placeholder='Please pick the desired schedule checkout date'
										style={{
											height: "auto",
											width: "100%",
											padding: "10px",
											boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
											borderRadius: "10px",
										}}
										onChange={onEndDateChange}
									/>
								</div>
							</div>

							<div
								className={`row my-4 mx-auto payment-details-grid ${
									booking_source !== "manual" && booking_source
										? "has-confirmation"
										: "no-confirmation"
								}`}
								style={{
									background: "#ededed",
									width: "99%",
									minHeight: "250px",
								}}
							>
								<div className='col-md-6 mx-auto my-2 booking-source-field'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "مصدر الحجز"
												: "Booking Source"}
										</label>
										<select
											onChange={(e) => setBookingSource(e.target.value)}
											style={{
												height: "auto",
												width: "100%",
												padding: "10px",
												boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
												borderRadius: "10px",
											}}
										>
											<option value=''>
												{booking_source ? booking_source : "Please Select"}
											</option>
											<option value='janat'>Janat</option>
											<option value='affiliate'>Affiliate</option>
											<option value='manual'>Manual Reservation</option>
											<option value='booking.com'>Booking.com</option>
											<option value='trivago'>Trivago</option>
											<option value='expedia'>Expedia</option>
											<option value='hotel.com'>Hotel.com</option>
											<option value='airbnb'>Airbnb</option>
										</select>
									</div>
								</div>

								{booking_source !== "manual" && booking_source && (
									<div className='col-md-6 mx-auto my-2 confirmation-number-field'>
										<div
											className='form-group'
											style={{
												marginTop: "10px",
												marginBottom: "10px",
												fontWeight: "bold",
											}}
										>
											<label style={{ fontWeight: "bold" }}>
												{chosenLanguage === "Arabic"
													? "رقم التأكيد"
													: "Confirmation #"}
											</label>
											<input
												background='red'
												type='text'
												value={confirmation_number}
												onChange={(e) => setConfirmationNumber(e.target.value)}
											/>
										</div>
									</div>
								)}

								<div className='col-md-6 mx-auto my-auto payment-method-field'>
									<div className='form-group'>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "طريقة الدفع او السداد"
												: "Payment"}
										</label>
										<select
											onChange={(e) => setPaymentStatus(e.target.value)}
											style={{
												height: "auto",
												width: "100%",
												padding: "10px",
												boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
												borderRadius: "10px",
											}}
										>
											<option value=''>
												{searchedReservation && searchedReservation.payment
													? searchedReservation.payment
													: "Please Select"}
											</option>
											<option value='not paid'>Not Paid</option>
											<option value='credit/ debit'>Credit/ Debit</option>
											<option value='cash'>Cash</option>
										</select>
									</div>
								</div>

								<div className='col-md-6 mx-auto my-2 booking-comment-field'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic" ? "تعليق الضيف" : "Comment"}
										</label>
										<textarea
											background='red'
											cols={6}
											type='text'
											value={booking_comment}
											onChange={(e) => setBookingComment(e.target.value)}
										/>
									</div>
								</div>
							</div>
						</div>

						<div className='col-md-4 taskeen'>
							<h4 className='my-2'>
								{chosenLanguage === "Arabic"
									? "حجز غرفة للضيف"
									: "Reserve A Room For The Guest"}
							</h4>
							<div
								className='row'
								style={{
									textTransform: "capitalize",
									fontWeight: "bold",
									padding: "10px",
								}}
							>
								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic"
										? "رقم التأكيد"
										: "Confirmation #"}
								</div>

								<div className='col-md-6 my-2'>{confirmation_number}</div>

								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Arrival"}
									<div style={{ background: "#bfbfbf", padding: "2px" }}>
										{start_date ? `${new Date(start_date).toDateString()}` : ""}
									</div>
								</div>

								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Departure"}
									<div style={{ background: "#bfbfbf", padding: "2px" }}>
										{end_date ? `${new Date(end_date).toDateString()}` : ""}
									</div>
								</div>
								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic" ? "طريقة الدفع" : "Payment"}
								</div>
								<div
									className='col-md-4 mx-auto my-2 '
									style={{
										background: "darkred",
										color: "white",
										textTransform: "uppercase",
									}}
								>
									{displayPaymentLabel || ""}
								</div>
								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic" ? "حالة الحجز" : "Status"}
								</div>
								<div
									className='col-md-3 mx-auto my-2 '
									style={{ background: "darkgreen", color: "white" }}
								>
									{searchedReservation &&
										searchedReservation.reservation_status}
								</div>
							</div>
							<h4 className='my-4 text-center' style={{ color: "#006ad1" }}>
								{chosenLanguage === "Arabic"
									? "المبلغ الإجمالي"
									: "Total Amount:"}{" "}
								{formatMoney(totalAmountValue)}{" "}
								{chosenLanguage === "Arabic" ? "ريال سعودي" : "SAR"}
							</h4>
							{totalPaid > 0 ? (
								<h4 className='my-4 text-center' style={{ color: "#006ad1" }}>
									{chosenLanguage === "Arabic"
										? "المبلغ المودع"
										: "Deposited Amount:"}{" "}
									{formatMoney(totalPaid)}{" "}
									{chosenLanguage === "Arabic" ? "ريال سعودي" : "SAR"}
								</h4>
							) : null}
							{totalAmountValue > 0 ? (
								<h4 className='my-4 text-center' style={{ color: "darkgreen" }}>
									{chosenLanguage === "Arabic"
										? "المبلغ المستحق"
										: "Amount Due:"}{" "}
									{formatMoney(amountDue)}{" "}
									{chosenLanguage === "Arabic" ? "ريال سعودي" : "SAR"}
								</h4>
							) : null}
							<div className='text-center mx-auto'>
								<button
									className='btn btn-info'
									style={{ fontWeight: "bold", fontSize: "1.2rem" }}
									onClick={() => {
										handleTaskeenClicked();
									}}
								>
									{chosenLanguage === "Arabic"
										? "تسكين الان..."
										: "Check The Guest In..."}
								</button>
							</div>
							<>
								{customer_details.name &&
								start_date &&
								end_date &&
								displayPickedRoomsType.length > 0 ? (
									<>
										<div className='total-amount my-3' ref={taskeenSummaryRef}>
											{chosenLanguage === "Arabic" ? (
												<h5 style={{ fontWeight: "bold" }}>
													أيام الإقامة: {days_of_residence} يوم /
													{days_of_residence <= 1 ? 1 : days_of_residence - 1}{" "}
													ليالي
												</h5>
											) : (
												<h5 style={{ fontWeight: "bold" }}>
													Days Of Residence: {days_of_residence} Days /{" "}
													{days_of_residence <= 1 ? 1 : days_of_residence - 1}{" "}
													Nights
												</h5>
											)}

											<h5>
												{chosenLanguage === "Arabic"
													? "المبلغ الإجمالي ليوم واحد:"
													: "Total Amount Per Day:"}{" "}
												{searchedReservation &&
												searchedReservation.confirmation_number &&
												days_of_residence
													? formatMoney(
															normalizeNumber(
																searchedReservation.total_amount,
																0,
															) / Math.max(days_of_residence - 1, 1),
													  )
													: finalTotalByRoom()
													  ? formatMoney(
																normalizeNumber(finalTotalByRoom(), 0) /
																	Math.max(days_of_residence - 1, 1),
													    )
													  : formatMoney(0)}{" "}
												{chosenLanguage === "Arabic"
													? "ريال سعودي/ يوم"
													: "SAR/ Day"}
											</h5>

											{chosenLanguage === "Arabic" ? (
												<div className='room-list my-3'>
													{displayPickedRoomsType.map((room, index) => (
														<div
															key={index}
															className='room-item my-2'
															style={{
																fontWeight: "bold",
																textTransform: "capitalize",
															}}
														>
															{`نوع الغرفة: ${
																room.room_type
															}، السعر: ${formatMoney(
																room.chosenPrice,
															)} ريال سعودي، العدد: ${room.count} غرف`}
														</div>
													))}
												</div>
											) : (
												<div className='room-list my-3'>
													{displayPickedRoomsType.map((room, index) => (
														<div
															key={index}
															className='room-item my-2'
															style={{
																fontWeight: "bold",
																textTransform: "capitalize",
															}}
														>
															{`Room Type: ${
																room.room_type
															}, Price: ${formatMoney(
																room.chosenPrice,
															)} SAR, Count: ${room.count} Rooms`}
														</div>
													))}
												</div>
											)}
										</div>
									</>
								) : null}
							</>
						</div>
					</div>

					{customer_details.name && start_date && end_date && taskeenClicked ? (
						<>
							<div
								ref={reviewPanelRef}
								className={isFixed ? "fixed-section visible" : "fixed-section"}
							>
								<div className='review-grid'>
									{customer_details.name &&
									start_date &&
									end_date &&
									displayPickedRoomsType.length > 0 ? (
										<div
											style={{
												borderLeft: "1px white solid",
												paddingRight: "10px",
												maxHeight: "100px",
												overflow: "auto",
											}}
										>
											{displayPickedRoomsType.map((room, index) => (
												<div key={index} className='inner-grid'>
													{index === 0 ? (
														<div>
															<div style={{ fontSize: "14px" }}>
																{customer_details && customer_details.name}
															</div>
															<div
																className='mx-auto mt-2'
																style={{ fontSize: "14px" }}
															>
																{chosenLanguage === "Arabic"
																	? "رقم التأكيد"
																	: "Confirmation #"}
																: {confirmation_number}
															</div>
														</div>
													) : (
														<div></div>
													)}

													<div>
														{index === 0 ? (
															<div style={{ fontSize: "14px" }}>
																{chosenLanguage === "Arabic"
																	? "أنواع الغرف:"
																	: "Room Types:"}{" "}
															</div>
														) : null}

														<div
															className='mx-auto mt-1'
															style={{
																background: "white",
																width: "85%",
																padding: "5px",
																textTransform: "capitalize",
																fontSize: "12px",
															}}
														>
															{room.room_type + " | " + room.displayName}
														</div>
													</div>

													<div>
														{index === 0 ? (
															<div style={{ fontSize: "14px" }}>
																{chosenLanguage === "Arabic"
																	? "	عدد الغرف:"
																	: "Room Count:"}{" "}
															</div>
														) : null}

														<div
															className='mx-auto mt-1'
															style={{
																background: "white",
																width: "85%",
																padding: "5px",
																fontSize: "12px",
															}}
														>
															{room.count}
														</div>
													</div>
													<div>
														{index === 0 ? (
															<div style={{ fontSize: "14px" }}>
																{chosenLanguage === "Arabic"
																	? "السعر في اليوم الواحد:"
																	: "Price/ Day:"}{" "}
															</div>
														) : null}

														<div
															className='mx-auto mt-1'
															style={{
																background: "white",
																width: "85%",
																padding: "5px",
																fontSize: "12px",
															}}
														>
															{room &&
																Number(room.chosenPrice) &&
																Number(room.chosenPrice).toFixed(2)}
														</div>
													</div>
												</div>
											))}
										</div>
									) : null}

									<div
										style={{
											borderRight: "1px white solid",
											paddingRight: "10px",
											maxHeight: "100px",
											overflow: "auto",
										}}
									>
										<div
											style={{
												borderLeft: "1px white solid",
												paddingRight: "10px",
											}}
										>
											{pickedRoomsDetailed.length > 0 &&
												pickedRoomsDetailed.map((room, index) => {
													const pricing = pricingByRoomId.get(String(room._id));
													return (
														<div key={String(room._id)} className='inner-grid2'>
															<div></div>

															<div style={{ fontSize: "14px" }}>
																{index === 0 ? (
																	<div>
																		{chosenLanguage === "Arabic"
																			? "أنواع الغرف:"
																			: "Room Types:"}{" "}
																	</div>
																) : null}

																<div
																	className='mx-auto mt-1'
																	style={{
																		background: "white",
																		width: "85%",
																		padding: "5px",
																		textTransform: "capitalize",
																		fontSize: "12px",
																	}}
																>
																	{room.room_type + " | " + room.display_name}
																	<div
																		style={{
																			color: "red",
																			fontWeight: "bold",
																			float: "right",
																			cursor: "pointer",
																		}}
																		onClick={() =>
																			handleRemoveAssignedRoom(room._id)
																		}
																	>
																		X
																	</div>{" "}
																</div>
															</div>

															<div>
																{index === 0 ? (
																	<div style={{ fontSize: "14px" }}>
																		{chosenLanguage === "Arabic"
																			? "	عدد الغرف:"
																			: "Room Count:"}{" "}
																	</div>
																) : null}

																<div
																	className='mx-auto mt-1'
																	style={{
																		background: "white",
																		width: "85%",
																		padding: "5px",
																		fontSize: "12px",
																	}}
																>
																	1
																</div>
															</div>
															<div>
																{index === 0 ? (
																	<div style={{ fontSize: "14px" }}>
																		{chosenLanguage === "Arabic"
																			? "السعر في اليوم الواحد:"
																			: "Price/ Day:"}{" "}
																	</div>
																) : null}

																<div
																	className='mx-auto mt-1'
																	style={{
																		background: "white",
																		width: "85%",
																		padding: "5px",
																		fontSize: "12px",
																	}}
																>
																	{pricing?.chosenPrice !== undefined
																		? Number(pricing.chosenPrice).toFixed(2)
																		: "N/A"}
																</div>
															</div>
															<div>
																{index === 0 ? (
																	<div style={{ fontSize: "14px" }}>
																		{chosenLanguage === "Arabic"
																			? "رقم الغرفة"
																			: "Room Number"}{" "}
																	</div>
																) : null}

																<div
																	className='mx-auto mt-1'
																	style={{
																		background: "white",
																		width: "85%",
																		padding: "5px",
																		fontSize: "12px",
																	}}
																>
																	{room.room_number ? room.room_number : "N/A"}
																</div>
															</div>
														</div>
													);
												})}
										</div>
									</div>
								</div>
								<div className='px-5 py-1' style={{ marginRight: "25%" }}>
									<button
										className='btn btn-success px-5 py-0'
										onClick={() => {
											clickSubmit();
										}}
										style={{ fontWeight: "bold", fontSize: "1.2rem" }}
									>
										{chosenLanguage === "Arabic"
											? "احجز الان..."
											: "Reserve Now..."}
									</button>
									{total_amount && days_of_residence && searchedReservation ? (
										<h4
											className='mt-3'
											style={{
												fontWeight: "bold",
												color:
													(
														searchedReservation &&
														total_amount * (days_of_residence - 1)
													).toFixed(2) !==
													searchedReservation.total_amount.toFixed(2)
														? "red"
														: "#3d7bb8",
											}}
										>
											{chosenLanguage === "Arabic"
												? "المبلغ الإجمالي"
												: "Total Amount:"}{" "}
											{formatMoney(
												normalizeNumber(
													total_amount * (days_of_residence - 1),
													0,
												),
											)}{" "}
											{chosenLanguage === "Arabic" ? "ريال سعودي" : "SAR"}
										</h4>
									) : null}

									{!searchedReservation && finalTotalByRoom() ? (
										<h4
											className='mt-3'
											style={{
												fontWeight: "bold",
												color: "#3d7bb8",
											}}
										>
											{chosenLanguage === "Arabic"
												? "المبلغ الإجمالي"
												: "Total Amount:"}{" "}
											{searchedReservation &&
											searchedReservation.confirmation_number
												? formatMoney(searchedReservation.total_amount)
												: finalTotalByRoom()
												  ? formatMoney(finalTotalByRoom())
												  : formatMoney(0)}
											{chosenLanguage === "Arabic" ? "ريال سعودي" : "SAR"}
										</h4>
									) : null}
								</div>
							</div>

							<div className='hotel-map-section' ref={hotelMapRef}>
							<div className='col-md-8 mx-auto mt-5'>
								<hr />
							</div>

							<h4>
								{chosenLanguage === "Arabic"
									? "يرجى اختيار الغرف"
									: "Pick Up A Room"}
							</h4>
							<h5>
								{chosenLanguage === "Arabic"
									? "الرجاء الضغط أدناه في الفندق لاختيار غرفة:"
									: "Please Click Here To Pick A Room:"}
							</h5>

							<HotelOverviewReservation
								hotelDetails={hotelDetails}
								hotelRooms={hotelRooms}
								values={values}
								setPickedHotelRooms={setPickedHotelRooms}
								pickedHotelRooms={pickedHotelRooms}
								total_amount={total_amount}
								setTotal_Amount={setTotal_Amount}
								clickSubmit={clickSubmit}
								pickedRoomPricing={pickedRoomPricing}
								setPickedRoomPricing={setPickedRoomPricing}
								allReservations={allReservations}
								start_date={start_date}
								end_date={end_date}
								chosenLanguage={chosenLanguage}
								pickedRoomsType={pickedRoomsType}
								setPickedRoomsType={setPickedRoomsType}
								searchedReservation={searchedReservation}
								setSearchedReservation={setSearchedReservation}
								start_date_Map={start_date_Map}
								end_date_Map={end_date_Map}
								bedNumber={bedNumber}
								setBedNumber={setBedNumber}
								currentRoom={currentRoom}
								setCurrentRoom={setCurrentRoom}
								pricingByDay={pricingByDay}
								setPricingByDay={setPricingByDay}
							/>
							</div>

							<div
								className={`mobile-map-booking-action ${
									mobileMapActionVisible ? "is-visible" : ""
								}`}
							>
								<button
									className='btn btn-success'
									onClick={() => {
										clickSubmit();
									}}
									style={{ fontWeight: "bold" }}
								>
									{chosenLanguage === "Arabic"
										? "احجز الآن..."
										: "Reserve Now..."}
								</button>
							</div>
						</>
					) : null}
				</>
			)}
		</ZReservationFormWrapper>
	);
};

export default ZReservationForm;
//Ensure that review
const ZReservationFormWrapper = styled.div`
	margin-top: 18px;
	margin-inline: 0;
	color: #172033;

	> .row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
		gap: 14px;
		align-items: start;
		margin: 0;
	}

	> .row > .col-md-8.mx-auto,
	> .row > .taskeen {
		width: 100%;
		max-width: none;
		margin: 0 !important;
	}

	> .row > .col-md-8.mx-auto {
		background: #ffffff;
		border: 1px solid #e4edf7;
		border-radius: 8px;
		padding: 14px;
		box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
	}

	h4 {
		font-size: clamp(1.05rem, 2vw, 1.35rem);
		font-weight: 900;
		color: #0f172a;
		line-height: 1.25;
	}

	h5 {
		font-size: clamp(0.95rem, 1.7vw, 1.12rem);
		font-weight: 800;
		text-decoration: none;
		cursor: default;
		margin-top: 14px;
		color: #334155;
	}

	input[type="text"],
	input[type="email"],
	input[type="password"],
	input[type="date"],
	select,
	textarea {
		display: block;
		width: 100%;
		min-height: 42px;
		padding: 0.55rem 0.7rem;
		font-size: 0.94rem;
		border: 1px solid #d7e0ea;
		border-radius: 8px;
		background: #ffffff;
		color: #0f172a;
		box-shadow: none !important;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	textarea {
		min-height: 88px;
		resize: vertical;
	}

	input[type="text"]:focus,
	input[type="email"]:focus,
	input[type="password"]:focus,
	input[type="date"]:focus,
	select:focus,
	textarea:focus,
	label:focus {
		outline: none;
		border-color: #0d6efd;
		box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.13) !important;
		transition: var(--mainTransition);
	}

	input[type="radio"] {
		width: 16px;
		height: 16px;
		min-height: 0;
		margin-inline: 6px;
		vertical-align: middle;
	}

	label {
		display: block;
		margin-bottom: 6px;
		font-size: 0.9rem;
		font-weight: 800 !important;
		color: #1e293b;
	}

	.form-group {
		margin-top: 8px !important;
		margin-bottom: 8px !important;
	}

	.form-control {
		min-height: 42px;
		border-radius: 8px;
		border-color: #d7e0ea;
		box-shadow: none;
	}

	.ant-picker.inputFields {
		min-height: 44px;
		padding: 9px 12px !important;
		border-radius: 8px !important;
		border-color: #d7e0ea !important;
		box-shadow: none !important;
	}

	.ant-picker.inputFields:hover,
	.ant-picker.inputFields.ant-picker-focused {
		border-color: #0d6efd !important;
		box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.13) !important;
	}

	.btn {
		border-radius: 8px;
		font-weight: 800;
		min-height: 40px;
		padding-inline: 16px;
		box-shadow: none !important;
	}

	.btn-success {
		background: #05a857;
		border-color: #05a857;
	}

	.btn-info {
		background: #0d6efd;
		border-color: #0d6efd;
		color: #ffffff;
	}

	.taskeen {
		position: sticky;
		top: 84px;
		background: #ffffff;
		min-height: 250px;
		border: 1px solid #dbeafe;
		border-radius: 8px;
		padding: 16px;
		box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
		overflow: hidden;
	}

	.taskeen h4 {
		text-align: center;
		margin-bottom: 12px;
	}

	.taskeen > .row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
		margin: 0;
		padding: 0 !important;
	}

	.taskeen > .row > [class*="col-"] {
		width: 100%;
		max-width: 100%;
		margin: 0 !important;
		padding: 8px 10px;
		border-radius: 8px;
		background: #f8fafc;
		min-height: 38px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center !important;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.taskeen > .row > [style*="darkred"],
	.taskeen > .row > [style*="darkgreen"] {
		color: #ffffff !important;
		font-weight: 900;
	}

	.taskeen > .row > [style*="darkred"] {
		background: #b42318 !important;
	}

	.taskeen > .row > [style*="darkgreen"] {
		background: #067647 !important;
	}

	.taskeen h4[style] {
		color: #0d6efd !important;
		margin: 14px 0 !important;
		font-size: clamp(1rem, 2vw, 1.2rem);
	}

	.taskeen .btn-info {
		width: 100%;
		min-height: 44px;
		font-size: 1rem !important;
	}

	.taskeen .total-amount {
		background: #eef8ff;
		border: 1px solid #c8e7ff;
		border-radius: 8px;
		padding: 12px;
		margin-top: 14px !important;
	}

	.room-list .room-item {
		background: #ffffff;
		border: 1px solid #e4edf7;
		border-radius: 8px;
		padding: 8px 10px;
		font-size: 0.88rem;
		line-height: 1.35;
	}

	.hotel-map-section {
		scroll-margin-top: 86px;
	}

	.mobile-map-booking-action {
		display: none;
	}

	text-align: ${(props) => (props.$arabic ? "right" : "")};

	label,
	div {
		text-align: ${(props) => (props.$arabic ? "right" : "")};
	}

	.review-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 12px;
		padding: 12px;
	}

	.fixed-section {
		position: fixed;
		top: 70px;
		left: ${(props) =>
			props.$arabic ? "0" : props.$sidebarCollapsed ? "80px" : "286px"};
		right: ${(props) =>
			props.$arabic ? (props.$sidebarCollapsed ? "80px" : "286px") : "0"};
		width: auto;
		background: #eef8ff;
		border-bottom: 1px solid #c8e7ff;
		z-index: 850;
		opacity: 0;
		transition: opacity 0.5s ease-in-out;
		box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
	}

	.visible {
		opacity: 1;
	}

	.inner-grid {
		display: grid;
		grid-template-columns: minmax(130px, 170px) minmax(180px, 300px) 80px minmax(120px, 150px) 100px;
		gap: 6px;
		min-width: 780px;
	}

	.inner-grid2 {
		display: grid;
		grid-template-columns: 0 minmax(180px, 300px) 80px minmax(120px, 150px) 80px;
		gap: 6px;
		min-width: 640px;
	}

	.inner-grid > div > div {
		text-align: center;
		font-weight: bold;
	}

	.inner-grid2 > div > div {
		text-align: center;
		font-weight: bold;
	}

	> .row > .col-md-8.mx-auto > .row.my-4.mx-auto {
		background: #f8fafc !important;
		border: 1px solid #e4edf7;
		border-radius: 8px;
		padding: 10px;
		width: 100% !important;
		min-height: 0 !important;
	}

	> .row > .col-md-8.mx-auto > .row.my-4.mx-auto > [class*="col-"] {
		padding-inline: 8px;
	}

	.guest-details-grid,
	.payment-details-grid {
		display: grid !important;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px 12px;
		align-items: start;
		margin-inline: 0 !important;
	}

	.guest-details-grid > [class*="col-"],
	.payment-details-grid > [class*="col-"] {
		width: 100% !important;
		max-width: 100% !important;
		flex: none !important;
		margin: 0 !important;
		padding-inline: 0 !important;
		min-width: 0;
	}

	.today-checkins-field {
		margin-bottom: 12px !important;
	}

	.confirmation-number-field {
		grid-column: 1 / -1;
	}

	.stay-date-field .dataPointsReview {
		font-size: 0.9rem !important;
		line-height: 1.25;
		min-height: 34px;
		display: flex;
		align-items: flex-end;
	}

	.stay-date-field br {
		display: none;
	}

	@media (min-width: 561px) {
		.booking-source-field {
			grid-column: 1;
			grid-row: 1;
		}

		.confirmation-number-field {
			grid-column: 2;
			grid-row: 1;
		}

		.payment-details-grid.has-confirmation .payment-method-field {
			grid-column: 3;
			grid-row: 1;
		}

		.payment-details-grid.no-confirmation .payment-method-field {
			grid-column: 2;
			grid-row: 1;
		}

		.booking-comment-field {
			grid-column: 1 / -1;
			grid-row: 2;
			width: min(100%, 560px) !important;
			justify-self: center;
		}

		.guest-name-field {
			grid-column: 1;
			grid-row: 1;
		}

		.guest-phone-field {
			grid-column: 2;
			grid-row: 1;
		}

		.guest-email-field {
			grid-column: 3;
			grid-row: 1;
		}

		.guest-passport-field {
			grid-column: 1;
			grid-row: 2;
		}

		.guest-passport-copy-field {
			grid-column: 2;
			grid-row: 2;
		}

		.guest-nationality-field {
			grid-column: 3;
			grid-row: 2;
		}

		.checkin-date-field {
			grid-column: 1;
			grid-row: 3;
		}

		.checkout-date-field {
			grid-column: 2;
			grid-row: 3;
		}

		.guest-car-question-field {
			grid-column: 3;
			grid-row: 3;
			align-self: end;
		}

		.guest-birth-field {
			grid-column: 1;
			grid-row: 4;
		}
	}

	@media (max-width: 1180px) {
		> .row {
			grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
		}
	}

	@media (max-width: 991px) {
		> .row {
			grid-template-columns: 1fr;
		}

		.taskeen {
			position: static;
		}
	}

	@media (max-width: 760px) {
		margin-top: 12px;

		> .row {
			gap: 10px;
		}

		> .row > .col-md-8.mx-auto,
		> .row > .taskeen {
			padding: 12px;
		}

		> .row > .col-md-8.mx-auto > .my-4 .row {
			display: grid;
			grid-template-columns: 1fr;
			gap: 8px;
			margin: 0;
		}

		> .row > .col-md-8.mx-auto > .my-4 .row > [class*="col-"] {
			width: 100%;
			max-width: 100%;
			padding: 0;
		}

		.btn {
			width: 100%;
		}

		.fixed-section {
			display: block;
			position: static;
			top: auto;
			left: auto;
			right: auto;
			width: 100%;
			opacity: 1 !important;
			margin: 12px 0;
			padding: 10px;
			border: 1px solid #c8e7ff;
			border-radius: 8px;
			background: #eef8ff;
			box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
			scroll-margin-top: 82px;
			z-index: auto;
		}

		.hotel-map-section {
			scroll-margin-top: 78px;
			padding-bottom: 78px;
		}

		.hotel-map-section > h4,
		.hotel-map-section > h5 {
			text-align: center;
			margin-inline: auto;
			max-width: 320px;
		}

		.fixed-section .review-grid {
			grid-template-columns: 1fr;
			gap: 8px;
			padding: 0;
		}

		.fixed-section .review-grid > div {
			max-height: none !important;
			overflow: visible !important;
			border: 0 !important;
			padding: 0 !important;
		}

		.fixed-section .inner-grid,
		.fixed-section .inner-grid2 {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			min-width: 0;
			gap: 6px;
			margin-bottom: 8px;
			padding: 8px;
			background: #ffffff;
			border: 1px solid #dbeafe;
			border-radius: 8px;
		}

		.fixed-section .inner-grid > div:first-child,
		.fixed-section .inner-grid2 > div:first-child {
			grid-column: 1 / -1;
		}

		.fixed-section .inner-grid > div:empty,
		.fixed-section .inner-grid2 > div:empty {
			display: none;
		}

		.fixed-section .inner-grid > div > div,
		.fixed-section .inner-grid2 > div > div {
			text-align: center !important;
			font-size: 0.78rem !important;
			line-height: 1.3;
			overflow-wrap: anywhere;
		}

		.fixed-section .inner-grid .mx-auto,
		.fixed-section .inner-grid2 .mx-auto {
			width: 100% !important;
			margin-top: 4px !important;
			border: 1px solid #e4edf7;
			border-radius: 6px;
			min-height: 32px;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.fixed-section > .px-5 {
			display: none !important;
		}

		.fixed-section h4 {
			font-size: 0.98rem;
			line-height: 1.35;
			text-align: center;
		}

		.mobile-map-booking-action {
			display: block;
			position: fixed;
			left: 10px;
			right: 10px;
			bottom: 10px;
			z-index: 880;
			padding: 8px;
			border-radius: 12px;
			background: rgba(238, 248, 255, 0.96);
			border: 1px solid #b9ddff;
			box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
			opacity: 0;
			pointer-events: none;
			transform: translateY(14px);
			transition:
				opacity 0.2s ease,
				transform 0.2s ease;
		}

		.mobile-map-booking-action.is-visible {
			opacity: 1;
			pointer-events: auto;
			transform: translateY(0);
		}

		.mobile-map-booking-action .btn-success {
			width: 100%;
			min-height: 46px;
			font-size: 0.98rem !important;
			border-radius: 10px;
			background: #05a857;
			border-color: #05a857;
		}
	}

	@media (max-width: 560px) {
		input[type="text"],
		input[type="email"],
		input[type="password"],
		input[type="date"],
		select,
		textarea,
		.form-control,
		.ant-picker.inputFields {
			font-size: 0.88rem;
			min-height: 40px;
		}

		label {
			font-size: 0.82rem;
			margin-bottom: 4px;
		}

		.guest-details-grid,
		.payment-details-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
		}

		.guest-name-field,
		.guest-phone-field,
		.guest-email-field,
		.guest-passport-field,
		.guest-passport-copy-field,
		.guest-nationality-field,
		.checkin-date-field,
		.checkout-date-field,
		.guest-car-question-field,
		.guest-birth-field,
		.booking-source-field,
		.confirmation-number-field,
		.payment-method-field,
		.booking-comment-field {
			grid-column: auto;
			grid-row: auto;
			width: 100% !important;
			justify-self: stretch;
		}

		.stay-date-field .dataPointsReview {
			font-size: 0.76rem !important;
			min-height: 30px;
		}

		.taskeen > .row {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 6px;
		}

		.taskeen > .row > [class*="col-"] {
			min-height: 34px;
			padding: 6px 8px;
			font-size: 0.78rem;
		}

		.taskeen h4[style] {
			font-size: 0.98rem;
			line-height: 1.35;
		}

		.room-list .room-item {
			font-size: 0.78rem;
		}
	}
`;
