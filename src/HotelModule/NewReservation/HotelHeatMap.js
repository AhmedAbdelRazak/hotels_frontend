import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { Tooltip, Modal } from "antd";
import moment from "moment";
import HotelMapCards from "./HotelMapCards";
import HotelMapFilters from "./HotelMapFilters";
import ReservationDetail from "../ReservationsFolder/ReservationDetail";
import { useHistory, useLocation } from "react-router-dom";

const getReservationKey = (reservation) => {
	if (!reservation) return "";
	if (reservation._id) return String(reservation._id);
	if (reservation.confirmation_number)
		return String(reservation.confirmation_number);
	return "";
};

const matchesReservationKey = (reservation, key) => {
	if (!reservation || !key) return false;
	const normalized = String(key);
	if (reservation._id && String(reservation._id) === normalized) return true;
	if (
		reservation.confirmation_number &&
		String(reservation.confirmation_number) === normalized
	) {
		return true;
	}
	return false;
};

const normalizeDisplayName = (value) =>
	String(value || "")
		.trim()
		.toLowerCase();

const normalizeDate = (value) => {
	if (!value) return null;
	const parsed = moment(value);
	return parsed.isValid() ? parsed.startOf("day") : null;
};

const CHECKED_OUT_STATUS_REGEX =
	/checked[_\s-]?out|checkedout|closed|early[_\s-]?checked[_\s-]?out/i;
const INHOUSE_STATUS_REGEX = /in[_\s-]?house/i;

const HotelHeatMap = ({
	hotelRooms,
	hotelDetails,
	start_date,
	end_date,
	start_date_Map,
	end_date_Map,
	allReservations,
	chosenLanguage,
	useCurrentOccupancy = false,
}) => {
	const history = useHistory();
	const location = useLocation();
	const [selectedRoomType, setSelectedRoomType] = useState(null);
	const [selectedAvailability, setSelectedAvailability] = useState(null);
	const [selectedFloor, setSelectedFloor] = useState(null);
	const [fixIt, setFixIt] = useState(false);
	const [isBedModalVisible, setIsBedModalVisible] = useState(false);
	const [selectedRoom, setSelectedRoom] = useState(null);
	const [bookedBeds, setBookedBeds] = useState([]);
	const [selectedRoomStatus, setSelectedRoomStatus] = useState(null);
	const [isReservationModalVisible, setIsReservationModalVisible] =
		useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [reservationModalKey, setReservationModalKey] = useState(0);

	useEffect(() => {
		const handleScroll = () => {
			const currentPosition = window.scrollY;
			setFixIt(currentPosition > 100);
		};

		// Add event listener
		window.addEventListener("scroll", handleScroll);

		// Clean up
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const reservationId = params.get("reservationId");
		if (!reservationId) return;
		const reservationsList = Array.isArray(allReservations)
			? allReservations
			: [];
		const match = reservationsList.find((reservation) =>
			matchesReservationKey(reservation, reservationId),
		);
		if (!match) return;
		setSelectedReservation(match);
		if (!isReservationModalVisible) {
			setIsReservationModalVisible(true);
		}
	}, [location.search, allReservations, isReservationModalVisible]);

	const safeHotelRooms = useMemo(
		() => (Array.isArray(hotelRooms) ? hotelRooms : []),
		[hotelRooms],
	);

	const roomCountDetails = useMemo(
		() =>
			Array.isArray(hotelDetails?.roomCountDetails)
				? hotelDetails.roomCountDetails
				: [],
		[hotelDetails?.roomCountDetails],
	);

	const roomDetailsByDisplayName = useMemo(() => {
		const map = new Map();
		roomCountDetails.forEach((detail) => {
			const key = normalizeDisplayName(detail.displayName || detail.roomType);
			if (!key || map.has(key)) return;
			map.set(key, detail);
		});
		return map;
	}, [roomCountDetails]);

	const roomDetailsByType = useMemo(() => {
		const map = new Map();
		roomCountDetails.forEach((detail) => {
			if (!detail.roomType || map.has(detail.roomType)) return;
			map.set(detail.roomType, detail);
		});
		return map;
	}, [roomCountDetails]);

	const getRoomDisplayInfo = useCallback(
		(room) => {
			const displayNameRaw = room?.display_name || room?.displayName || "";
			const detailByDisplay = displayNameRaw
				? roomDetailsByDisplayName.get(normalizeDisplayName(displayNameRaw))
				: null;
			const roomType = room?.room_type || "";
			const detailByType =
				!detailByDisplay && roomType ? roomDetailsByType.get(roomType) : null;
			const detail = detailByDisplay || detailByType;
			const resolvedRoomType = detail?.roomType || roomType;
			const fallbackLabel = resolvedRoomType
				? resolvedRoomType.replace(/([A-Z])/g, " $1").trim()
				: "Room";
			return {
				displayName: displayNameRaw || detail?.displayName || fallbackLabel,
				roomType: resolvedRoomType,
				color: detail?.roomColor || room?.roomColorCode || "#000",
				detail,
			};
		},
		[roomDetailsByDisplayName, roomDetailsByType],
	);

	const getAvailabilityRange = useCallback(() => {
		if (useCurrentOccupancy) {
			const today = moment().startOf("day");
			const tomorrow = moment().add(1, "day").startOf("day");
			return { rangeStart: today, rangeEnd: tomorrow };
		}
		const selectedStart = normalizeDate(start_date);
		const selectedEnd = normalizeDate(end_date);
		if (selectedStart && selectedEnd) {
			return { rangeStart: selectedStart, rangeEnd: selectedEnd };
		}
		const fallbackStart = normalizeDate(start_date_Map);
		const fallbackEnd = normalizeDate(end_date_Map);
		return { rangeStart: fallbackStart, rangeEnd: fallbackEnd };
	}, [useCurrentOccupancy, start_date, end_date, start_date_Map, end_date_Map]);

	const getReservationRoomIds = useCallback((reservation) => {
		if (!reservation || !reservation.roomId) return [];
		const rawIds = Array.isArray(reservation.roomId)
			? reservation.roomId
			: [reservation.roomId];
		return rawIds
			.map((room) => {
				if (!room) return null;
				if (typeof room === "string") return room;
				if (typeof room === "object" && room._id) return room._id;
				return room;
			})
			.filter(Boolean)
			.map((id) => String(id));
	}, []);

	const reservationHasRoom = useCallback(
		(reservation, roomId) => {
			if (!roomId) return false;
			const ids = getReservationRoomIds(reservation);
			return ids.includes(String(roomId));
		},
		[getReservationRoomIds],
	);

	const isReservationActive = useCallback((reservation) => {
		const status = String(reservation?.reservation_status || "").toLowerCase();
		if (!status) return true;
		return !CHECKED_OUT_STATUS_REGEX.test(status);
	}, []);

	const isReservationOverdueInhouse = useCallback((reservation) => {
		const status = String(reservation?.reservation_status || "");
		if (!INHOUSE_STATUS_REGEX.test(status)) return false;
		const checkinDate = normalizeDate(
			reservation?.checkin_date || reservation?.checkinDate,
		);
		const checkoutDate = normalizeDate(
			reservation?.checkout_date || reservation?.checkoutDate,
		);
		if (!checkinDate || !checkoutDate) return false;
		const today = moment().startOf("day");
		return (
			checkinDate.isSameOrBefore(today, "day") &&
			checkoutDate.isSameOrBefore(today, "day")
		);
	}, []);

	const isReservationCheckoutDue = useCallback((reservation, rangeStart) => {
		if (!reservation || !rangeStart) return false;
		const checkoutDate = normalizeDate(
			reservation?.checkout_date || reservation?.checkoutDate,
		);
		if (!checkoutDate) return false;
		return checkoutDate.isSame(rangeStart, "day");
	}, []);

	const hasOverlap = useCallback((reservation, rangeStart, rangeEnd) => {
		if (!rangeStart || !rangeEnd) return false;
		const reservationStart = normalizeDate(
			reservation?.checkin_date || reservation?.checkinDate,
		);
		const reservationEnd = normalizeDate(
			reservation?.checkout_date || reservation?.checkoutDate,
		);
		if (!reservationStart || !reservationEnd) return false;
		return (
			rangeStart.isBefore(reservationEnd) && rangeEnd.isAfter(reservationStart)
		);
	}, []);

	const getRoomReservations = useCallback(
		(roomId) => {
			if (!roomId) return [];
			const { rangeStart, rangeEnd } = getAvailabilityRange();
			const reservations = Array.isArray(allReservations)
				? allReservations
				: [];
			return reservations.filter((reservation) => {
				if (!isReservationActive(reservation)) return false;
				if (!reservationHasRoom(reservation, roomId)) return false;
				if (isReservationOverdueInhouse(reservation)) return true;
				if (!rangeStart || !rangeEnd) return false;
				return hasOverlap(reservation, rangeStart, rangeEnd);
			});
		},
		[
			allReservations,
			getAvailabilityRange,
			hasOverlap,
			isReservationActive,
			isReservationOverdueInhouse,
			reservationHasRoom,
		],
	);

	const isBedCheckoutDue = useCallback(
		(roomId, bedNumber) => {
			if (!roomId || !bedNumber) return false;
			const { rangeStart } = getAvailabilityRange();
			if (!rangeStart) return false;
			const reservations = Array.isArray(allReservations)
				? allReservations
				: [];
			return reservations.some((reservation) => {
				if (!isReservationActive(reservation)) return false;
				if (!reservationHasRoom(reservation, roomId)) return false;
				const bookedBeds = Array.isArray(reservation.bedNumber)
					? reservation.bedNumber
					: [];
				if (!bookedBeds.includes(bedNumber)) return false;
				return isReservationCheckoutDue(reservation, rangeStart);
			});
		},
		[
			allReservations,
			getAvailabilityRange,
			isReservationActive,
			isReservationCheckoutDue,
			reservationHasRoom,
		],
	);

	const isAnyBedCheckoutDue = useCallback(
		(roomId, bedsNumber) => {
			if (!roomId || !Array.isArray(bedsNumber) || bedsNumber.length === 0)
				return false;
			return bedsNumber.some((bed) => isBedCheckoutDue(roomId, bed));
		},
		[isBedCheckoutDue],
	);

	const getBookedBedsForRoom = useCallback(
		(roomId) => {
			if (!roomId) return [];
			const { rangeStart, rangeEnd } = getAvailabilityRange();
			if (!useCurrentOccupancy && (!rangeStart || !rangeEnd)) return [];
			const bookedBedsTemp = [];
			(allReservations || []).forEach((reservation) => {
				if (!isReservationActive(reservation)) return;
				const isOverdue = isReservationOverdueInhouse(reservation);
				if (
					!isOverdue &&
					!useCurrentOccupancy &&
					!hasOverlap(reservation, rangeStart, rangeEnd)
				) {
					return;
				}
				const reservationRoomIds = getReservationRoomIds(reservation);
				const matchesRoom = reservationRoomIds.includes(String(roomId));
				if (!matchesRoom && reservationRoomIds.length > 0) return;
				const bookedBeds = Array.isArray(reservation.bedNumber)
					? reservation.bedNumber
					: [];
				bookedBedsTemp.push(...bookedBeds);
			});
			return bookedBedsTemp;
		},
		[
			allReservations,
			getAvailabilityRange,
			getReservationRoomIds,
			hasOverlap,
			isReservationActive,
			isReservationOverdueInhouse,
			useCurrentOccupancy,
		],
	);

	const getBedReservationsForRoom = useCallback(
		(roomId, bedNumber) => {
			if (!roomId || !bedNumber) return [];
			const { rangeStart, rangeEnd } = getAvailabilityRange();
			if (!useCurrentOccupancy && (!rangeStart || !rangeEnd)) return [];
			const reservations = Array.isArray(allReservations)
				? allReservations
				: [];
			return reservations.filter((reservation) => {
				if (!isReservationActive(reservation)) return false;
				const isOverdue = isReservationOverdueInhouse(reservation);
				if (
					!isOverdue &&
					!useCurrentOccupancy &&
					!hasOverlap(reservation, rangeStart, rangeEnd)
				) {
					return false;
				}
				const reservationRoomIds = getReservationRoomIds(reservation);
				const matchesRoom = reservationRoomIds.includes(String(roomId));
				if (!matchesRoom && reservationRoomIds.length > 0) return false;
				const bookedBeds = Array.isArray(reservation.bedNumber)
					? reservation.bedNumber
					: [];
				return bookedBeds.includes(bedNumber);
			});
		},
		[
			allReservations,
			getAvailabilityRange,
			getReservationRoomIds,
			hasOverlap,
			isReservationActive,
			isReservationOverdueInhouse,
			useCurrentOccupancy,
		],
	);

	const isRoomBooked = useCallback(
		(roomId, roomType, bedsNumber) => {
			const { rangeStart, rangeEnd } = getAvailabilityRange();
			if (!useCurrentOccupancy && (!rangeStart || !rangeEnd)) return false;

			const hasOverdueInhouse = (allReservations || []).some(
				(reservation) =>
					isReservationOverdueInhouse(reservation) &&
					reservationHasRoom(reservation, roomId),
			);
			if (hasOverdueInhouse) return true;

			if (roomType === "individualBed") {
				const bookedBedsTemp = getBookedBedsForRoom(roomId);
				const allBedsBooked =
					Array.isArray(bedsNumber) &&
					bedsNumber.length > 0 &&
					bedsNumber.every((bed) => bookedBedsTemp.includes(bed));
				return allBedsBooked;
			}

			return (allReservations || []).some((reservation) => {
				if (!isReservationActive(reservation)) return false;
				if (
					!useCurrentOccupancy &&
					!hasOverlap(reservation, rangeStart, rangeEnd)
				)
					return false;
				return reservationHasRoom(reservation, roomId);
			});
		},
		[
			allReservations,
			getAvailabilityRange,
			getBookedBedsForRoom,
			hasOverlap,
			isReservationActive,
			isReservationOverdueInhouse,
			reservationHasRoom,
			useCurrentOccupancy,
		],
	);

	const getPrimaryReservationForBed = useCallback(
		(roomId, bedNumber) => {
			const matches = getBedReservationsForRoom(roomId, bedNumber);
			if (matches.length === 0) return null;
			if (matches.length === 1) return matches[0];
			const { rangeStart } = getAvailabilityRange();
			const rangeStartValue = rangeStart ? rangeStart.valueOf() : null;
			const sorted = [...matches].sort((first, second) => {
				const firstDate = normalizeDate(
					first?.checkin_date || first?.checkinDate,
				);
				const secondDate = normalizeDate(
					second?.checkin_date || second?.checkinDate,
				);
				const firstTime = firstDate
					? firstDate.valueOf()
					: Number.POSITIVE_INFINITY;
				const secondTime = secondDate
					? secondDate.valueOf()
					: Number.POSITIVE_INFINITY;
				if (rangeStartValue !== null) {
					const firstDiff = Math.abs(firstTime - rangeStartValue);
					const secondDiff = Math.abs(secondTime - rangeStartValue);
					if (firstDiff !== secondDiff) return firstDiff - secondDiff;
				}
				return firstTime - secondTime;
			});
			return sorted[0] || null;
		},
		[getAvailabilityRange, getBedReservationsForRoom],
	);

	const getRoomDueStatus = useCallback(
		(roomId) => {
			if (!roomId) return false;
			const matches = getRoomReservations(roomId);
			if (matches.length === 0) return false;
			const { rangeStart } = getAvailabilityRange();
			if (!rangeStart) return false;
			return matches.some((reservation) => {
				const checkinDate = normalizeDate(
					reservation?.checkin_date || reservation?.checkinDate,
				);
				return checkinDate ? checkinDate.isSame(rangeStart, "day") : false;
			});
		},
		[getAvailabilityRange, getRoomReservations],
	);

	const getRoomOverdueStatus = useCallback(
		(roomId) => {
			if (!roomId) return false;
			const reservations = Array.isArray(allReservations)
				? allReservations
				: [];
			return reservations.some(
				(reservation) =>
					isReservationOverdueInhouse(reservation) &&
					reservationHasRoom(reservation, roomId),
			);
		},
		[allReservations, isReservationOverdueInhouse, reservationHasRoom],
	);

	const getRoomBookingStatus = useCallback(
		(room) => {
			if (!room) {
				return {
					isBooked: false,
					bookedBeds: [],
					isDue: false,
					isOverdue: false,
				};
			}
			const isDue = getRoomDueStatus(room._id);
			const isOverdue = getRoomOverdueStatus(room._id);
			if (room.room_type === "individualBed") {
				const bookedBeds = getBookedBedsForRoom(room._id);
				const bedCheckoutDue = isAnyBedCheckoutDue(room._id, room.bedsNumber);
				return {
					isBooked: isRoomBooked(room._id, room.room_type, room.bedsNumber),
					bookedBeds,
					isDue: isDue || bedCheckoutDue,
					isOverdue,
				};
			}
			return {
				isBooked: isRoomBooked(room._id, room.room_type, room.bedsNumber),
				bookedBeds: [],
				isDue,
				isOverdue,
			};
		},
		[
			getBookedBedsForRoom,
			getRoomDueStatus,
			getRoomOverdueStatus,
			isAnyBedCheckoutDue,
			isRoomBooked,
		],
	);

	const getPrimaryReservationForRoom = useCallback(
		(roomId) => {
			const matches = getRoomReservations(roomId);
			if (matches.length === 0) return null;
			if (matches.length === 1) return matches[0];
			const { rangeStart } = getAvailabilityRange();
			const rangeStartValue = rangeStart ? rangeStart.valueOf() : null;
			const sorted = [...matches].sort((first, second) => {
				const firstDate = normalizeDate(
					first?.checkin_date || first?.checkinDate,
				);
				const secondDate = normalizeDate(
					second?.checkin_date || second?.checkinDate,
				);
				const firstTime = firstDate
					? firstDate.valueOf()
					: Number.POSITIVE_INFINITY;
				const secondTime = secondDate
					? secondDate.valueOf()
					: Number.POSITIVE_INFINITY;
				if (rangeStartValue !== null) {
					const firstDiff = Math.abs(firstTime - rangeStartValue);
					const secondDiff = Math.abs(secondTime - rangeStartValue);
					if (firstDiff !== secondDiff) return firstDiff - secondDiff;
				}
				return firstTime - secondTime;
			});
			return sorted[0] || null;
		},
		[getAvailabilityRange, getRoomReservations],
	);

	const { hotelFloors = 0, parkingLot } = hotelDetails || {};
	const floors = Array.from(
		{ length: Number(hotelFloors) || 0 },
		(_, index) => index + 1,
	);
	const floorsDesc = [...floors].reverse();

	const filteredRooms = safeHotelRooms.filter((room) => {
		const roomInfo = getRoomDisplayInfo(room);
		const bookingStatus = getRoomBookingStatus(room);
		const selectedKey = normalizeDisplayName(selectedRoomType);
		const roomDisplayKey = normalizeDisplayName(roomInfo.displayName);
		const roomTypeKey = normalizeDisplayName(roomInfo.roomType);
		const isAvailabilityMatch =
			selectedAvailability === null ||
			(selectedAvailability === "occupied" && bookingStatus.isBooked) ||
			(selectedAvailability === "vacant" && !bookingStatus.isBooked);
		const isRoomTypeMatch =
			selectedRoomType === null ||
			roomDisplayKey === selectedKey ||
			roomTypeKey === selectedKey;
		const isFloorMatch = selectedFloor === null || room.floor === selectedFloor;
		const isRoomStatusMatch =
			selectedRoomStatus === null ||
			(selectedRoomStatus === "clean" && room.cleanRoom) ||
			(selectedRoomStatus === "dirty" && !room.cleanRoom);
		return (
			isAvailabilityMatch &&
			isRoomTypeMatch &&
			isFloorMatch &&
			isRoomStatusMatch
		);
	});

	const distinctRoomTypesWithColors = useMemo(() => {
		const accumulator = [];
		const seen = new Set();
		safeHotelRooms.forEach((room) => {
			const roomInfo = getRoomDisplayInfo(room);
			const displayKey = normalizeDisplayName(roomInfo.displayName);
			if (!displayKey || seen.has(displayKey)) return;
			seen.add(displayKey);
			accumulator.push({
				displayName: roomInfo.displayName,
				room_type: roomInfo.roomType,
				roomColorCode: roomInfo.color,
			});
		});
		return accumulator;
	}, [getRoomDisplayInfo, safeHotelRooms]);

	const updateQueryParams = useCallback(
		(updates) => {
			const params = new URLSearchParams(location.search);
			Object.entries(updates).forEach(([key, value]) => {
				if (value === undefined || value === null || value === "") {
					params.delete(key);
				} else {
					params.set(key, String(value));
				}
			});
			const nextSearch = params.toString();
			history.replace({
				pathname: location.pathname,
				search: nextSearch ? `?${nextSearch}` : "",
			});
		},
		[history, location.pathname, location.search],
	);

	const handleRoomClick = useCallback(
		(room, roomInfo, bookingStatus) => {
			if (!room) return;
			if (bookingStatus?.isBooked) {
				const reservation = getPrimaryReservationForRoom(room._id);
				if (reservation) {
					setSelectedReservation(reservation);
					setIsBedModalVisible(false);
					setIsReservationModalVisible(true);
					updateQueryParams({ reservationId: getReservationKey(reservation) });
				}
				return;
			}

			if (roomInfo?.roomType !== "individualBed") return;
			setBookedBeds(bookingStatus?.bookedBeds || []);
			setSelectedRoom(room);
			setIsBedModalVisible(true);
		},
		[getPrimaryReservationForRoom, updateQueryParams],
	);

	const handleBedClick = useCallback((reservation) => {
		if (!reservation) return;
		setSelectedReservation(reservation);
		setIsBedModalVisible(false);
		setIsReservationModalVisible(true);
		updateQueryParams({ reservationId: getReservationKey(reservation) });
	}, [updateQueryParams]);

	const handleFilterChange = (filterType, value) => {
		if (filterType === "availability") {
			setSelectedAvailability(value);
		} else if (filterType === "roomType") {
			setSelectedRoomType(value);
		} else if (filterType === "floor") {
			setSelectedFloor(value);
		} else if (filterType === "roomStatus") {
			setSelectedRoomStatus(value);
		}
	};

	const handleResetFilters = () => {
		setSelectedAvailability(null);
		setSelectedRoomType(null);
		setSelectedFloor(null);
		setSelectedRoomStatus(null);
	};

	const handleReservationModalClose = useCallback(() => {
		setSelectedReservation(null);
		setIsReservationModalVisible(false);
		setReservationModalKey((prevKey) => prevKey + 1);
		updateQueryParams({ reservationId: "" });
	}, [updateQueryParams]);

	const bedStatuses = useMemo(() => {
		const bedMap = new Map();
		if (!selectedRoom || !Array.isArray(selectedRoom.bedsNumber)) {
			return bedMap;
		}
		selectedRoom.bedsNumber.forEach((bed) => {
			const reservation = getPrimaryReservationForBed(selectedRoom._id, bed);
			const isBooked =
				!!reservation ||
				(Array.isArray(bookedBeds) && bookedBeds.includes(bed));
			const isOverdue = reservation
				? isReservationOverdueInhouse(reservation)
				: false;
			bedMap.set(bed, { isBooked, isOverdue, reservation });
		});
		return bedMap;
	}, [
		bookedBeds,
		getPrimaryReservationForBed,
		isReservationOverdueInhouse,
		selectedRoom,
	]);

	const getRoomDetails = useCallback(
		(roomType, displayName) => {
			const displayKey = normalizeDisplayName(displayName);
			if (displayKey && roomDetailsByDisplayName.has(displayKey)) {
				return roomDetailsByDisplayName.get(displayKey);
			}
			if (roomType && roomDetailsByType.has(roomType)) {
				return roomDetailsByType.get(roomType);
			}
			return null;
		},
		[roomDetailsByDisplayName, roomDetailsByType],
	);

	const getRoomImage = (roomType, displayName) => {
		const roomDetails = getRoomDetails(roomType, displayName);
		if (roomDetails && roomDetails.photos && roomDetails.photos.length > 0) {
			return roomDetails.photos[0].url;
		}
		return null;
	};

	return (
		<HotelOverviewWrapper fixIt={fixIt}>
			<div dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
				<HotelMapCards chosenLanguage={chosenLanguage} />
			</div>
			<div dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
				<HotelMapFilters
					chosenLanguage={chosenLanguage}
					distinctRoomTypesWithColors={distinctRoomTypesWithColors}
					floors={floors}
					handleFilterChange={handleFilterChange}
					handleResetFilters={handleResetFilters}
					selectedAvailability={selectedAvailability}
					selectedRoomType={selectedRoomType}
					selectedFloor={selectedFloor}
					selectedRoomStatus={selectedRoomStatus}
				/>
			</div>
			<div className='canvas-grid'>
				<div>
					<FloorsContainer>
						{selectedFloor === null
							? floorsDesc.map((floor, index) => (
									<Floor key={index} delay={index * 0.3}>
										<h2
											className='mb-4'
											style={{
												fontWeight: "bold",
												fontSize: "1.5rem",
												color: "#4a4a4a",
											}}
										>
											{chosenLanguage === "Arabic" ? "الطابق" : "Floor"} {floor}
										</h2>
										<div style={{ display: "flex", flexWrap: "wrap" }}>
											{filteredRooms &&
												filteredRooms
													.filter((room) => room.floor === floor)
													.map((room, idx) => {
														const bookingStatus = getRoomBookingStatus(room);
														const roomInfo = getRoomDisplayInfo(room);
														const roomImage = getRoomImage(
															roomInfo.roomType,
															roomInfo.displayName,
														);
														const isBedRoom =
															roomInfo.roomType === "individualBed";
														const totalBeds = Array.isArray(room.bedsNumber)
															? room.bedsNumber.length
															: 0;
														const isInactive = room.active === false;
														const bookedBedsCount = Array.from(
															new Set(bookingStatus.bookedBeds),
														).length;
														const isPartialBedBooking =
															isBedRoom &&
															totalBeds > 0 &&
															bookedBedsCount > 0 &&
															bookedBedsCount < totalBeds;
														const partialBedRatio =
															totalBeds > 0 ? bookedBedsCount / totalBeds : 0;
														const showBedSummary = isBedRoom && totalBeds > 0;
														return (
															<Tooltip
																title={
																	<div
																		style={{
																			textAlign: "center",
																			color: "darkgrey",
																		}}
																	>
																		{roomImage && (
																			<img
																				src={roomImage}
																				alt={room.room_type}
																				style={{
																					width: "100%",
																					marginBottom: "5px",
																				}}
																			/>
																		)}
																		<div>Room #: {room.room_number}</div>
																		<div
																			style={{ textTransform: "capitalize" }}
																		>
																			Room Type: {roomInfo.roomType || "N/A"}
																		</div>
																		<div
																			style={{ textTransform: "capitalize" }}
																		>
																			Display Name: {roomInfo.displayName}
																		</div>
																		<div>
																			Occupied:{" "}
																			{bookingStatus.isBooked ? "Yes" : "No"}
																		</div>
																		{showBedSummary && (
																			<div>
																				Beds booked: {bookedBedsCount} /{" "}
																				{totalBeds}
																			</div>
																		)}
																		<div>
																			Clean: {room.cleanRoom ? "Yes" : "No"}
																		</div>
																		<div dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
																			{chosenLanguage === "Arabic"
																				? "مفتوحة للسكن: "
																				: "Open for Housing: "}{" "}
																			{room.active === false
																				? chosenLanguage === "Arabic"
																					? "لا"
																					: "No"
																				: chosenLanguage === "Arabic"
																					? "نعم"
																					: "Yes"}
																		</div>
																		{room.isHandicapped ? (
																			<div dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
																				{chosenLanguage === "Arabic"
																					? "غرفة لذوي الإعاقة"
																					: "Handicapped Room"}
																			</div>
																		) : null}
																		{room.isVip ? (
																			<div dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
																				{chosenLanguage === "Arabic"
																					? "غرفة VIP"
																					: "VIP Room"}
																			</div>
																		) : null}
																	</div>
																}
																key={idx}
																overlayStyle={{ zIndex: 100000000 }}
																color='white'
															>
																<RoomSquare
																	key={idx}
																	color={roomInfo.color}
																	picked={""}
																	reserved={
																		bookingStatus.isBooked && !isBedRoom
																	}
																	inactive={isInactive}
																	due={bookingStatus.isDue}
																	overdue={bookingStatus.isOverdue}
																	clickable={
																		bookingStatus.isBooked || isBedRoom
																	}
																	style={{
																		opacity:
																			bookingStatus.isBooked || isInactive
																				? 0.6
																				: 1,
																	}}
																	onClick={() =>
																		handleRoomClick(
																			room,
																			roomInfo,
																			bookingStatus,
																		)
																	}
																>
																	{bookingStatus.isOverdue && (
																		<CheckoutBadge>Checkout</CheckoutBadge>
																	)}
																	{isPartialBedBooking ? (
																		<HalfOccupiedOverlay
																			$rtl={chosenLanguage === "Arabic"}
																			$ratio={partialBedRatio}
																			$animate={
																				bookingStatus.isDue ||
																				bookingStatus.isOverdue
																			}
																			$overdue={bookingStatus.isOverdue}
																		/>
																	) : isBedRoom && bookedBedsCount > 0 ? (
																		<BedOccupancyLines
																			$animate={
																				bookingStatus.isDue ||
																				bookingStatus.isOverdue
																			}
																			$overdue={bookingStatus.isOverdue}
																		>
																			{Array.from(
																				{ length: bookedBedsCount },
																				(_, lineIndex) => {
																					const offset =
																						bookedBedsCount === 1
																							? 50
																							: 15 +
																							  (70 * lineIndex) /
																									(bookedBedsCount - 1);
																					return (
																						<BedOccupancyLine
																							key={lineIndex}
																							$offset={offset}
																							$animate={
																								bookingStatus.isDue ||
																								bookingStatus.isOverdue
																							}
																							$overdue={bookingStatus.isOverdue}
																						/>
																					);
																				},
																			)}
																		</BedOccupancyLines>
																	) : null}
																	{room.room_number}
																</RoomSquare>
															</Tooltip>
														);
													})}
										</div>
									</Floor>
							  ))
							: floorsDesc
									.filter((floor) => floor === selectedFloor)
									.map((floor, index) => (
										<Floor key={index} delay={index * 0.3}>
											<h2
												className='mb-4'
												style={{ fontWeight: "bolder", fontSize: "1.3rem" }}
											>
												{chosenLanguage === "Arabic" ? "الطابق" : "Floor"}{" "}
												{floor}
											</h2>
											<div style={{ display: "flex", flexWrap: "wrap" }}>
												{filteredRooms &&
													filteredRooms
														.filter((room) => room.floor === floor)
														.map((room, idx) => {
															const bookingStatus = getRoomBookingStatus(room);
															const roomInfo = getRoomDisplayInfo(room);
															const roomImage = getRoomImage(
																roomInfo.roomType,
																roomInfo.displayName,
															);
															const isBedRoom =
																roomInfo.roomType === "individualBed";
															const totalBeds = Array.isArray(room.bedsNumber)
																? room.bedsNumber.length
																: 0;
															const isInactive = room.active === false;
															const bookedBedsCount = Array.from(
																new Set(bookingStatus.bookedBeds),
															).length;
															const isPartialBedBooking =
																isBedRoom &&
																totalBeds > 0 &&
																bookedBedsCount > 0 &&
																bookedBedsCount < totalBeds;
															const partialBedRatio =
																totalBeds > 0 ? bookedBedsCount / totalBeds : 0;
															const showBedSummary = isBedRoom && totalBeds > 0;
															return (
																<Tooltip
																	title={
																		<div style={{ textAlign: "center" }}>
																			{roomImage && (
																				<img
																					src={roomImage}
																					alt={room.room_type}
																					style={{
																						width: "100px",
																						marginBottom: "5px",
																					}}
																				/>
																			)}
																			<div>Room #: {room.room_number}</div>
																			<div
																				style={{ textTransform: "capitalize" }}
																			>
																				Room Type: {roomInfo.roomType || "N/A"}
																			</div>
																			<div
																				style={{ textTransform: "capitalize" }}
																			>
																				Display Name: {roomInfo.displayName}
																			</div>
																			<div>
																				Occupied:{" "}
																				{bookingStatus.isBooked ? "Yes" : "No"}
																			</div>
																			{showBedSummary && (
																				<div>
																					Beds booked: {bookedBedsCount} /{" "}
																					{totalBeds}
																				</div>
																			)}
																			<div>
																				Clean: {room.cleanRoom ? "Yes" : "No"}
																			</div>
																			<div
																				dir={
																					chosenLanguage === "Arabic" ? "rtl" : "ltr"
																				}
																			>
																				{chosenLanguage === "Arabic"
																					? "مفتوحة للسكن: "
																					: "Open for Housing: "}{" "}
																				{room.active === false
																					? chosenLanguage === "Arabic"
																						? "لا"
																						: "No"
																					: chosenLanguage === "Arabic"
																						? "نعم"
																						: "Yes"}
																			</div>
																			{room.isHandicapped ? (
																				<div
																					dir={
																						chosenLanguage === "Arabic" ? "rtl" : "ltr"
																					}
																				>
																					{chosenLanguage === "Arabic"
																						? "غرفة لذوي الإعاقة"
																						: "Handicapped Room"}
																				</div>
																			) : null}
																			{room.isVip ? (
																				<div
																					dir={
																						chosenLanguage === "Arabic" ? "rtl" : "ltr"
																					}
																				>
																					{chosenLanguage === "Arabic"
																						? "غرفة VIP"
																						: "VIP Room"}
																				</div>
																			) : null}
																		</div>
																	}
																	key={idx}
																>
																	<RoomSquare
																		key={idx}
																		color={roomInfo.color}
																		picked={""}
																		reserved={
																			bookingStatus.isBooked && !isBedRoom
																		}
																		inactive={isInactive}
																		due={bookingStatus.isDue}
																		overdue={bookingStatus.isOverdue}
																		clickable={
																			bookingStatus.isBooked || isBedRoom
																		}
																		style={{
																			opacity:
																				bookingStatus.isBooked || isInactive
																					? 0.6
																					: 1,
																		}}
																		onClick={() =>
																			handleRoomClick(
																				room,
																				roomInfo,
																				bookingStatus,
																			)
																		}
																	>
																		{bookingStatus.isOverdue && (
																			<CheckoutBadge>Checkout</CheckoutBadge>
																		)}
																		{isPartialBedBooking ? (
																			<HalfOccupiedOverlay
																				$rtl={chosenLanguage === "Arabic"}
																				$ratio={partialBedRatio}
																				$animate={
																					bookingStatus.isDue ||
																					bookingStatus.isOverdue
																				}
																				$overdue={bookingStatus.isOverdue}
																			/>
																		) : isBedRoom && bookedBedsCount > 0 ? (
																			<BedOccupancyLines
																				$animate={
																					bookingStatus.isDue ||
																					bookingStatus.isOverdue
																				}
																				$overdue={bookingStatus.isOverdue}
																			>
																				{Array.from(
																					{ length: bookedBedsCount },
																					(_, lineIndex) => {
																						const offset =
																							bookedBedsCount === 1
																								? 50
																								: 15 +
																								  (70 * lineIndex) /
																										(bookedBedsCount - 1);
																						return (
																							<BedOccupancyLine
																								key={lineIndex}
																								$offset={offset}
																								$animate={
																									bookingStatus.isDue ||
																									bookingStatus.isOverdue
																								}
																								$overdue={
																									bookingStatus.isOverdue
																								}
																							/>
																						);
																					},
																				)}
																			</BedOccupancyLines>
																		) : null}
																		{room.room_number}
																	</RoomSquare>
																</Tooltip>
															);
														})}
											</div>
										</Floor>
									))}
						{parkingLot && <ParkingLot>Parking Lot</ParkingLot>}
					</FloorsContainer>
				</div>
			</div>

			<Modal
				key={reservationModalKey}
				title={
					chosenLanguage === "Arabic" ? "تفاصيل الحجز" : "Reservation Details"
				}
				open={isReservationModalVisible}
				onOk={handleReservationModalClose}
				onCancel={handleReservationModalClose}
				width='84.5%'
				style={{
					position: "absolute",
					left: chosenLanguage === "Arabic" ? "1%" : "auto",
					right: chosenLanguage === "Arabic" ? "auto" : "5%",
					top: "1%",
				}}
			>
				{selectedReservation && (
					<ReservationDetail
						reservation={selectedReservation}
						setReservation={setSelectedReservation}
						hotelDetails={hotelDetails}
					/>
				)}
			</Modal>

			<Modal
				title={
					<span>
						(
						<span
							style={{
								fontWeight: "bolder",
								textTransform: "capitalize",
								color: "#00003d",
							}}
						>
							{selectedRoom?.room_number}
						</span>
						)
					</span>
				}
				open={isBedModalVisible}
				onOk={() => setIsBedModalVisible(false)}
				onCancel={() => setIsBedModalVisible(false)}
			>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
					{(Array.isArray(selectedRoom?.bedsNumber)
						? selectedRoom.bedsNumber
						: []
					).map((bed, index) => {
						const bedStatus = bedStatuses.get(bed) || {};
						const isBooked = bedStatus.isBooked;
						const isOverdue = bedStatus.isOverdue;
						const reservation = bedStatus.reservation || null;
						return (
							<BedSquare
								key={index}
								booked={isBooked}
								overdue={isOverdue}
								clickable={!!reservation}
								onClick={() => handleBedClick(reservation)}
							>
								{isOverdue && <CheckoutBadge>Checkout</CheckoutBadge>}
								{bed}
							</BedSquare>
						);
					})}
				</div>
			</Modal>
		</HotelOverviewWrapper>
	);
};

export default HotelHeatMap;

// Styled components
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const duePulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 158, 0, 0.28);
  }
  50% {
    transform: scale(1.12);
    box-shadow: 0 0 14px rgba(255, 158, 0, 0.36);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 158, 0, 0.28);
  }
`;

const overduePulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.28);
  }
  50% {
    transform: scale(1.14);
    box-shadow: 0 0 16px rgba(220, 38, 38, 0.38);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.28);
  }
`;

const checkoutFade = keyframes`
  0% {
    opacity: 0;
    transform: translate(-50%, -2px);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -6px);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -2px);
  }
`;

const bedStripePulse = keyframes`
  0% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.95;
  }
  100% {
    opacity: 0.45;
  }
`;

const resolvePulseAnimation = ({ overdue, due }) => {
	if (overdue) {
		return css`
			animation: ${overduePulse} 1.6s ease-in-out infinite;
		`;
	}
	if (due) {
		return css`
			animation: ${duePulse} 1.7s ease-in-out infinite;
		`;
	}
	return css`
		animation: none;
	`;
};

const HotelOverviewWrapper = styled.div`
	margin-top: 30px;
	.ant-tooltip-content {
		z-index: 10000000 !important;
	}

	h3 {
		font-weight: bold;
		font-size: 2rem;
		text-align: center;
		color: #006ad1;
	}

	.canvas-grid {
		display: grid;
		grid-template-columns: 95% 5%;
	}

	.colors-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr); // Two columns layout
		gap: 10px;
		margin-left: 20px; // Adjust based on your layout
		position: sticky;
		top: 0;
		align-self: start;
		position: ${(props) => (props.fixIt ? "fixed" : "")};
		top: ${(props) => (props.fixIt ? "20%" : "")};
		left: ${(props) => (props.fixIt ? "2%" : "")};
	}
`;

const FloorsContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
`;

const Floor = styled.div`
	margin: 10px;
	padding: 30px;
	background-color: rgba(237, 237, 237, 0.3);
	border: 1px solid rgba(237, 237, 237, 1);
	width: 100%;
	text-align: center;
	font-weight: bold;
	cursor: pointer;
	animation: ${fadeIn} 0.5s ease forwards;
	animation-delay: ${({ delay }) => delay}s;
	opacity: 0;
	font-size: 1.1rem;
`;

const ParkingLot = styled.div`
	margin: 10px;
	padding: 40px;
	background-color: lightgreen;
	border: 1px solid #ccc;
	width: 75%;
	text-align: center;
	font-weight: bold;
`;

const RoomSquare = styled.div`
	position: relative;
	width: ${({ picked }) => (picked ? "40px" : "35px")};
	height: ${({ picked }) => (picked ? "40px" : "35px")};
	background-color: ${({ color, picked }) => (picked ? "#000" : color)};
	border: 1px solid #000;
	color: ${({ picked, reserved }) =>
		picked ? "lightgrey" : reserved ? "black" : "white"};
	margin: 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: ${({ picked }) => (picked ? "0.9rem" : "0.7rem")};
	cursor: ${({ clickable }) => (clickable ? "pointer" : "default")};
	transform-origin: center;
	will-change: transform;
	filter: ${({ inactive }) => (inactive ? "grayscale(1)" : "none")};
	box-shadow: ${({ reserved }) =>
		reserved ? "0 0 4px rgba(0, 0, 0, 0.2)" : "none"};
	transition:
		width 1s,
		height 1s,
		background-color 1s,
		color 1s,
		box-shadow 0.3s,
		transform 0.3s;
	${resolvePulseAnimation};

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}

	${({ reserved }) =>
		reserved &&
		`
    &:after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        rgba(173, 173, 173, 0.5) 10px,
        rgba(173, 173, 173, 0.5) 20px
      );
      pointer-events: none; // Disable interactions
    }
  `}
`;

const HalfOccupiedOverlay = styled.div`
	position: absolute;
	top: 0;
	bottom: 0;
	${({ $rtl }) => ($rtl ? "right: 0;" : "left: 0;")}
	width: ${({ $ratio }) => `${Math.min(Math.max($ratio || 0, 0), 1) * 100}%`};
	background: rgba(148, 163, 184, 0.6);
	box-shadow: inset 0 0 6px rgba(15, 23, 42, 0.25);
	pointer-events: none;
	z-index: 2;
	${({ $animate }) =>
		$animate &&
		css`
			animation: ${bedStripePulse} 1.4s ease-in-out infinite;
		`}

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
`;

const BedOccupancyLines = styled.div`
	position: absolute;
	inset: 4px;
	pointer-events: none;
	z-index: 2;
	overflow: hidden;
`;

const BedOccupancyLine = styled.span`
	position: absolute;
	left: -12%;
	right: -12%;
	height: 2px;
	background: rgba(255, 255, 255, 0.92);
	box-shadow: 0 0 2px rgba(0, 0, 0, 0.55);
	border-radius: 999px;
	top: ${({ $offset }) => `${$offset}%`};
	transform: rotate(-45deg);
	transform-origin: left center;

	${({ $animate }) =>
		$animate &&
		css`
			animation: ${bedStripePulse} 1.3s ease-in-out infinite;
		`}
	${({ $overdue }) =>
		$overdue &&
		css`
			animation-duration: 0.9s;
		`}

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
`;

const CheckoutBadge = styled.div`
	position: absolute;
	top: -10px;
	left: 50%;
	transform: translateX(-50%);
	padding: 2px 6px;
	border-radius: 10px;
	font-size: 0.55rem;
	font-weight: bold;
	letter-spacing: 0.3px;
	color: #7f1d1d;
	background: rgba(255, 255, 255, 0.92);
	border: 1px solid rgba(220, 38, 38, 0.45);
	text-transform: uppercase;
	pointer-events: none;
	z-index: 2;
	animation: ${checkoutFade} 1.6s ease-in-out infinite;
`;

const BedSquare = styled.div`
	width: 70px;
	height: 100px;
	background-color: ${({ booked }) => (booked ? "#e7e7e7" : "#f0f0f0")};
	border: 1px solid #000;
	color: ${({ booked }) => (booked ? "black" : "black")};
	margin: 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.9rem;
	cursor: ${({ clickable }) => (clickable ? "pointer" : "default")};
	transition: all 0.3s;
	margin: auto;
	position: relative;
	transform-origin: center;
	will-change: transform;
	${resolvePulseAnimation};

	&:hover {
		background-color: ${({ booked, clickable }) =>
			clickable ? (booked ? "#e1e1e1" : "#dcdcdc") : "#f0f0f0"};
	}

	${({ booked }) =>
		booked &&
		`
        &:after {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            border-top: 1px solid black;
            transform: translateY(-50%);
            width: 100%;
        }
    `}
`;
