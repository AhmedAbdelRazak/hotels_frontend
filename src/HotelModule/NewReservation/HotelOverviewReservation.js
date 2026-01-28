import React, { useEffect, useMemo, useState, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { InputNumber, Modal, Table, Tooltip } from "antd";
import moment from "moment";
import { toast } from "react-toastify";
import HotelMapFilters from "./HotelMapFilters"; // Ensure this path is correct

const CHECKED_OUT_STATUS_REGEX =
	/checked[_\s-]?out|checkedout|closed|early[_\s-]?checked[_\s-]?out/i;
const INHOUSE_STATUS_REGEX = /in[_\s-]?house/i;

const HotelOverviewReservation = ({
	hotelRooms,
	hotelDetails,
	pickedHotelRooms,
	setPickedHotelRooms,
	total_amount,
	setTotal_Amount,
	setPickedRoomPricing,
	pickedRoomPricing,
	start_date,
	end_date,
	allReservations,
	chosenLanguage,
	searchedReservation,
	pickedRoomsType,
	setPickedRoomsType,
	setSearchedReservation,
	start_date_Map,
	end_date_Map,
	bedNumber,
	setBedNumber,
	currentRoom,
	setCurrentRoom,
	pricingByDay,
	setPricingByDay,
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isBedModalVisible, setIsBedModalVisible] = useState(false);
	const [fixIt, setFixIt] = useState(false);
	const [inheritedPrice, setInheritedPrice] = useState("");
	const [selectedBeds, setSelectedBeds] = useState([]);
	const [bookedBeds, setBookedBeds] = useState([]);
	const [totalAmountPerBed, setTotalAmountPerBed] = useState(0);
	const [overallTotal, setOverallTotal] = useState(0);
	const [selectedRoomType, setSelectedRoomType] = useState(null);
	const [selectedAvailability, setSelectedAvailability] = useState(null);
	const [selectedFloor, setSelectedFloor] = useState(null);
	const [selectedRoomStatus, setSelectedRoomStatus] = useState(null);
	const [totalToDistribute, setTotalToDistribute] = useState("");

	const normalizeDisplayName = useCallback(
		(value) =>
			String(value || "")
				.trim()
				.toLowerCase(),
		[],
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
	}, [normalizeDisplayName, roomCountDetails]);

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
		[normalizeDisplayName, roomDetailsByDisplayName, roomDetailsByType],
	);

	const normalizeNumber = (value, fallback = 0) => {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	};

	const getStayNights = () => {
		if (!start_date || !end_date) return 0;
		const start = moment(start_date).startOf("day");
		const end = moment(end_date).startOf("day");
		const diff = end.diff(start, "days");
		return diff > 0 ? diff : 0;
	};

	const buildDayRow = (date, price, template = {}) => {
		const normalizedPrice = normalizeNumber(price, 0);
		const safeTemplate = template || {};

		const next = {
			...safeTemplate,
			date,
			price: normalizedPrice,
			// Guest-facing price should always reflect edits.
			totalPriceWithCommission: normalizedPrice,
		};

		// Preserve existing non-commission price when available.
		if (safeTemplate.totalPriceWithoutCommission !== undefined) {
			next.totalPriceWithoutCommission =
				safeTemplate.totalPriceWithoutCommission;
		} else {
			next.totalPriceWithoutCommission = normalizedPrice;
		}

		return next;
	};

	const buildPricingByNightly = (nightlyPrice, nightsCount, template = {}) => {
		if (!start_date || !nightsCount) return [];
		const start = moment(start_date).startOf("day");
		return Array.from({ length: nightsCount }, (_, idx) =>
			buildDayRow(
				start.clone().add(idx, "day").format("YYYY-MM-DD"),
				nightlyPrice,
				template,
			),
		);
	};

	const getLineDisplayName = (line) =>
		normalizeDisplayName(line?.displayName || line?.display_name);

	const isRoomLineMatch = (line, roomType, displayName) => {
		if (!line) return false;
		const lineType = String(line.room_type || "")
			.trim()
			.toLowerCase();
		const targetType = String(roomType || "")
			.trim()
			.toLowerCase();
		if (!lineType || !targetType || lineType !== targetType) return false;

		const lineDisplay = getLineDisplayName(line);
		const targetDisplay = normalizeDisplayName(displayName);
		if (!lineDisplay || !targetDisplay) return true;
		return lineDisplay === targetDisplay;
	};

	const updateRoomsList = (rooms, roomType, displayName, updater) => {
		if (!Array.isArray(rooms)) {
			return { next: rooms, didUpdate: false };
		}
		let didUpdate = false;
		const next = rooms.map((line) => {
			if (didUpdate) return line;
			if (!isRoomLineMatch(line, roomType, displayName)) return line;
			didUpdate = true;
			return updater(line);
		});
		return { next, didUpdate };
	};

	const normalizeDate = useCallback((value) => {
		if (!value) return null;
		const parsed = moment(value);
		return parsed.isValid() ? parsed.startOf("day") : null;
	}, []);

	const getAvailabilityRange = useCallback(() => {
		const selectedStart = normalizeDate(start_date);
		const selectedEnd = normalizeDate(end_date);
		if (selectedStart && selectedEnd) {
			return { rangeStart: selectedStart, rangeEnd: selectedEnd };
		}
		return {
			rangeStart: normalizeDate(start_date_Map),
			rangeEnd: normalizeDate(end_date_Map),
		};
	}, [start_date, end_date, start_date_Map, end_date_Map, normalizeDate]);

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

	const reservationHasRoom = (reservation, roomId) => {
		if (!roomId) return false;
		const ids = getReservationRoomIds(reservation);
		return ids.includes(String(roomId));
	};

	const isReservationActive = useCallback((reservation) => {
		const status = String(reservation?.reservation_status || "").toLowerCase();
		if (!status) return true;
		return !CHECKED_OUT_STATUS_REGEX.test(status);
	}, []);

	const isReservationOverdueInhouse = useCallback(
		(reservation) => {
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
		},
		[normalizeDate],
	);

	const hasOverlap = useCallback(
		(reservation, rangeStart, rangeEnd) => {
			if (!rangeStart || !rangeEnd) return false;
			const reservationStart = normalizeDate(
				reservation?.checkin_date || reservation?.checkinDate,
			);
			const reservationEnd = normalizeDate(
				reservation?.checkout_date || reservation?.checkoutDate,
			);
			if (!reservationStart || !reservationEnd) return false;
			return (
				rangeStart.isBefore(reservationEnd) &&
				rangeEnd.isAfter(reservationStart)
			);
		},
		[normalizeDate],
	);

	const getBookedBedsForRoom = useCallback(
		(roomId) => {
			if (!roomId) return [];
			const { rangeStart, rangeEnd } = getAvailabilityRange();
			if (!rangeStart || !rangeEnd) return [];
			const bookedBedsTemp = [];
			(allReservations || []).forEach((reservation) => {
				if (!isReservationActive(reservation)) return;
				if (!hasOverlap(reservation, rangeStart, rangeEnd)) return;
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
		],
	);

	useEffect(() => {
		const handleScroll = () => {
			const currentPosition = window.scrollY;
			setFixIt(currentPosition > 900);
		};

		window.addEventListener("scroll", handleScroll);
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	useEffect(() => {
		if (currentRoom && currentRoom.room_type === "individualBed") {
			setBookedBeds(getBookedBedsForRoom(currentRoom._id));
		}
	}, [
		currentRoom,
		start_date,
		end_date,
		start_date_Map,
		end_date_Map,
		allReservations,
		getBookedBedsForRoom,
	]);

	const { hotelFloors, parkingLot } = hotelDetails;
	const floors = Array.from({ length: hotelFloors }, (_, index) => index + 1);
	const floorsDesc = [...floors].reverse(); // Descending order for display on the canvas

	const getRoomWarningFlags = (room) => ({
		isHandicapped: !!room?.isHandicapped,
		isVip: !!room?.isVip,
	});

	const confirmRoomSelection = (room) =>
		new Promise((resolve) => {
			const flags = getRoomWarningFlags(room);
			if (!flags.isHandicapped && !flags.isVip) {
				resolve(true);
				return;
			}
			Modal.confirm({
				title: "تنبيه / Notice",
				centered: true,
				okText: "متابعة / Continue",
				cancelText: "إلغاء / Cancel",
				content: (
					<div>
						{flags.isHandicapped ? (
							<div style={{ marginBottom: flags.isVip ? "12px" : 0 }}>
								<div
									dir='rtl'
									style={{ textAlign: "right", fontWeight: 600 }}
								>
									تنبيه: هذه غرفة مخصصة لذوي الإعاقة. هل تريد المتابعة؟
								</div>
								<div style={{ textAlign: "left", fontWeight: 600 }}>
									Notice: This is a handicapped room. Do you want to continue?
								</div>
							</div>
						) : null}
						{flags.isVip ? (
							<div>
								<div
									dir='rtl'
									style={{ textAlign: "right", fontWeight: 600 }}
								>
									تنبيه: هذه غرفة VIP. هل تريد المتابعة؟
								</div>
								<div style={{ textAlign: "left", fontWeight: 600 }}>
									Notice: This is a VIP room. Do you want to continue?
								</div>
							</div>
						) : null}
					</div>
				),
				onOk: () => resolve(true),
				onCancel: () => resolve(false),
			});
		});

	const handleRoomClick = async (roomId, show, room) => {
		if (!roomId || !room) return;

		const isSelected = pickedHotelRooms.includes(roomId);
		const isSearchRoom =
			searchedReservation && reservationHasRoom(searchedReservation, roomId);
		if (room.active === false && !isSelected && !isSearchRoom) {
			toast.error(
				chosenLanguage === "Arabic"
					? "هذه الغرفة مغلقة وغير متاحة للسكن."
					: "This room is closed and not available for housing.",
			);
			return;
		}

		if (isRoomBooked(roomId, room.room_type, room.bedsNumber)) {
			toast.error("Room is booked. Cannot select.");
			return;
		}

		if (isSelected) {
			handleRoomDeselection(roomId);
		} else {
			const shouldContinue = await confirmRoomSelection(room);
			if (!shouldContinue) return;
			setPickedHotelRooms([...pickedHotelRooms, roomId]);
			setCurrentRoom(room);
			showModal(room);
		}
	};

	const handleRoomDeselection = (roomId) => {
		setPickedHotelRooms(pickedHotelRooms.filter((id) => id !== roomId));

		const priceToRemove = pickedRoomPricing.find(
			(pricing) => pricing.roomId === roomId,
		)?.chosenPrice;

		if (priceToRemove) {
			setTotal_Amount((prevTotal) =>
				Math.max(prevTotal - Number(priceToRemove), 0),
			);
		}

		setPickedRoomPricing(
			pickedRoomPricing.filter((pricing) => pricing.roomId !== roomId),
		);
	};

	const isRoomBooked = (roomId, roomType, bedsNumber) => {
		const { rangeStart, rangeEnd } = getAvailabilityRange();
		if (!rangeStart || !rangeEnd) return false;

		if (
			searchedReservation &&
			reservationHasRoom(searchedReservation, roomId)
		) {
			// Allow clicking on the room if it matches the searched reservation
			return false;
		}

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
			return (
				hasOverlap(reservation, rangeStart, rangeEnd) &&
				reservationHasRoom(reservation, roomId)
			);
		});
	};

	const showModal = (room) => {
		if (!room) return;
		setCurrentRoom(room);

		const roomInfo = getRoomDisplayInfo(room);
		const room_type = roomInfo.roomType || room.room_type;
		const displayName = roomInfo.displayName;
		const nightsCount = Math.max(getStayNights(), 1);

		// Check if the searched reservation has pricing information
		if (searchedReservation && searchedReservation.pickedRoomsType) {
			const roomTypeDetails =
				searchedReservation.pickedRoomsType.find(
					(r) => r.displayName === displayName,
				) ||
				searchedReservation.pickedRoomsType.find(
					(r) => r.room_type === room_type,
				);

			if (
				roomTypeDetails &&
				Array.isArray(roomTypeDetails.pricingByDay) &&
				roomTypeDetails.pricingByDay.length > 0
			) {
				setPricingByDay(
					roomTypeDetails.pricingByDay.map((day) => {
						const safeDay = day || {};
						const rawPrice =
							safeDay.price ??
							safeDay.totalPriceWithCommission ??
							safeDay.totalPriceWithoutCommission ??
							0;
						const normalizedPrice = normalizeNumber(rawPrice, 0);
						return {
							...safeDay,
							price: normalizedPrice,
							totalPriceWithCommission:
								safeDay.totalPriceWithCommission !== undefined
									? safeDay.totalPriceWithCommission
									: normalizedPrice,
							totalPriceWithoutCommission:
								safeDay.totalPriceWithoutCommission !== undefined
									? safeDay.totalPriceWithoutCommission
									: normalizedPrice,
						};
					}),
				);
			} else if (
				roomTypeDetails &&
				Number(roomTypeDetails.chosenPrice) > 0 &&
				nightsCount > 0
			) {
				const nightlyPrice = normalizeNumber(roomTypeDetails.chosenPrice, 0);
				setPricingByDay(buildPricingByNightly(nightlyPrice, nightsCount));
			} else if (
				searchedReservation &&
				Number(searchedReservation.total_amount) > 0 &&
				nightsCount > 0
			) {
				const roomCountFromTypes = Array.isArray(
					searchedReservation.pickedRoomsType,
				)
					? searchedReservation.pickedRoomsType.reduce(
							(sum, r) => sum + (Number(r.count) || 1),
							0,
					  )
					: 0;
				const totalRooms =
					Number(searchedReservation.total_rooms) || roomCountFromTypes || 1;
				const perNight =
					normalizeNumber(searchedReservation.total_amount, 0) /
					nightsCount /
					totalRooms;
				setPricingByDay(buildPricingByNightly(perNight, nightsCount));
			} else {
				const generated = generatePricingTable(
					room_type,
					displayName,
					start_date,
					end_date,
				);
				if (!generated || generated.length === 0) {
					setPricingByDay(buildPricingByNightly(0, nightsCount));
				}
			}
		} else {
			const generated = generatePricingTable(
				room_type,
				displayName,
				start_date,
				end_date,
			);
			if (!generated || generated.length === 0) {
				setPricingByDay(buildPricingByNightly(0, nightsCount));
			}
		}

		setIsModalVisible(true);
	};

	const generatePricingTable = useCallback(
		(roomType, displayName, startDate, endDate) => {
			const displayKey = normalizeDisplayName(displayName);
			const roomDetails =
				(displayKey && roomDetailsByDisplayName.get(displayKey)) ||
				(roomType ? roomDetailsByType.get(roomType) : null);

			if (!roomDetails) {
				console.warn("No matching room details found");
				return [];
			}

			const pricingRate = roomDetails.pricingRate || [];
			const basePrice = roomDetails.price?.basePrice || 0;

			const daysArray = [];
			const currentDate = moment(startDate);

			while (currentDate.isBefore(endDate)) {
				const dateString = currentDate.format("YYYY-MM-DD");
				const pricing = pricingRate.find(
					(price) => price.calendarDate === dateString,
				);
				const price = pricing
					? parseFloat(pricing.price)
					: parseFloat(basePrice);
				daysArray.push({
					date: dateString,
					price,
					totalPriceWithCommission: price,
					totalPriceWithoutCommission: price,
				});
				currentDate.add(1, "day");
			}

			setPricingByDay(daysArray);
			return daysArray;
		},
		[
			normalizeDisplayName,
			roomDetailsByDisplayName,
			roomDetailsByType,
			setPricingByDay,
		],
	);

	const handleInheritPrices = () => {
		const nextPrice = Number(inheritedPrice);
		if (
			inheritedPrice === null ||
			inheritedPrice === "" ||
			!Number.isFinite(nextPrice) ||
			nextPrice < 0
		) {
			toast.error(
				chosenLanguage === "Arabic"
					? "يرجى إدخال سعر صالح"
					: "Please enter a valid price.",
			);
			return;
		}
		if (!pricingByDay || pricingByDay.length === 0) {
			toast.error(
				chosenLanguage === "Arabic"
					? "لا توجد بيانات تسعير لتحديثها"
					: "No pricing data to update.",
			);
			return;
		}
		setPricingByDay((prev) =>
			prev.map((day) => buildDayRow(day.date, nextPrice, day)),
		);
	};

	const handleDistributeTotal = () => {
		if (totalToDistribute === null || totalToDistribute === "") {
			toast.error(
				chosenLanguage === "Arabic"
					? "يرجى إدخال إجمالي صالح"
					: "Please enter a valid total amount.",
			);
			return;
		}
		const total = normalizeNumber(totalToDistribute, NaN);
		if (!Number.isFinite(total) || total < 0) {
			toast.error(
				chosenLanguage === "Arabic"
					? "يرجى إدخال إجمالي صالح"
					: "Please enter a valid total amount.",
			);
			return;
		}
		const nightsCount = pricingByDay.length || Math.max(getStayNights(), 1);
		const perNight = nightsCount > 0 ? total / nightsCount : total;

		setPricingByDay((prev) => {
			if (prev.length > 0) {
				return prev.map((day) => buildDayRow(day.date, perNight, day));
			}
			return buildPricingByNightly(perNight, nightsCount);
		});
	};

	const handleOk = () => {
		if (
			currentRoom.room_type === "individualBed" &&
			selectedBeds.length === 0
		) {
			toast.error("Please select at least one bed.");
			return;
		}

		if (!pricingByDay || pricingByDay.length === 0) {
			toast.error(
				chosenLanguage === "Arabic"
					? "يرجى التأكد من التسعير قبل المتابعة"
					: "Please confirm pricing before continuing.",
			);
			return;
		}

		const nightlyTotal = pricingByDay.reduce(
			(acc, day) => acc + (Number(day.price) || 0),
			0,
		);
		const chosenPrice = nightlyTotal / pricingByDay.length;

		const finalChosenPrice =
			currentRoom.room_type === "individualBed"
				? chosenPrice * selectedBeds.length
				: chosenPrice;

		const pricingSnapshot = pricingByDay.map((day) => ({ ...day }));

		const roomInfo = getRoomDisplayInfo(currentRoom);
		const resolvedRoomType = roomInfo.roomType || currentRoom.room_type;
		const resolvedDisplayName =
			roomInfo.displayName ||
			currentRoom.display_name ||
			currentRoom.displayName ||
			"";

		const totalWithComm = pricingSnapshot.reduce(
			(acc, day) =>
				acc + normalizeNumber(day.totalPriceWithCommission ?? day.price, 0),
			0,
		);
		const hotelShouldGet = pricingSnapshot.reduce(
			(acc, day) => acc + normalizeNumber(day.rootPrice, 0),
			0,
		);
		const hasRootPrice = pricingSnapshot.some(
			(day) => day.rootPrice !== undefined,
		);

		const updateRoomLine = (line) => {
			const updatedLine = {
				...line,
				pricingByDay: pricingSnapshot,
				chosenPrice: Number(chosenPrice.toFixed(2)),
			};

			if (Number.isFinite(totalWithComm) && totalWithComm > 0) {
				updatedLine.totalPriceWithCommission = Number(totalWithComm.toFixed(2));
			}
			if (hasRootPrice) {
				updatedLine.hotelShouldGet = Number(hotelShouldGet.toFixed(2));
			}

			return updatedLine;
		};

		const basePickedRoomsType =
			Array.isArray(pickedRoomsType) && pickedRoomsType.length > 0
				? pickedRoomsType
				: Array.isArray(searchedReservation?.pickedRoomsType)
				  ? searchedReservation.pickedRoomsType
				  : [];

		const { next: nextPickedRoomsType, didUpdate } = updateRoomsList(
			basePickedRoomsType,
			resolvedRoomType,
			resolvedDisplayName,
			updateRoomLine,
		);

		if (setPickedRoomsType && didUpdate) {
			setPickedRoomsType(nextPickedRoomsType);
		}

		if (setSearchedReservation && searchedReservation && didUpdate) {
			const basePickedRoomsPricing =
				Array.isArray(searchedReservation.pickedRoomsPricing) &&
				searchedReservation.pickedRoomsPricing.length > 0
					? searchedReservation.pickedRoomsPricing
					: nextPickedRoomsType;

			const { next: nextPickedRoomsPricing } = updateRoomsList(
				basePickedRoomsPricing,
				resolvedRoomType,
				resolvedDisplayName,
				updateRoomLine,
			);

			const stayNights = Math.max(getStayNights(), 1);
			const updatedTotalAmount = nextPickedRoomsType.reduce((sum, room) => {
				const count = Number(room.count) || 1;
				if (Array.isArray(room.pricingByDay) && room.pricingByDay.length > 0) {
					const roomTotal = room.pricingByDay.reduce(
						(acc, day) =>
							acc +
							normalizeNumber(day.totalPriceWithCommission ?? day.price, 0),
						0,
					);
					return sum + roomTotal * count;
				}
				const nightly = normalizeNumber(room.chosenPrice, 0);
				return sum + nightly * stayNights * count;
			}, 0);

			setSearchedReservation({
				...searchedReservation,
				pickedRoomsType: nextPickedRoomsType,
				pickedRoomsPricing:
					Array.isArray(nextPickedRoomsPricing) &&
					nextPickedRoomsPricing.length > 0
						? nextPickedRoomsPricing
						: searchedReservation.pickedRoomsPricing,
				total_amount:
					updatedTotalAmount > 0
						? Number(updatedTotalAmount.toFixed(2))
						: searchedReservation.total_amount,
			});
		}

		const existingPricingEntry = Array.isArray(pickedRoomPricing)
			? pickedRoomPricing.find(
					(pricing) => String(pricing.roomId) === String(currentRoom._id),
			  )
			: null;
		const previousChosenPrice = existingPricingEntry
			? normalizeNumber(existingPricingEntry.chosenPrice, 0)
			: 0;

		const roomPricingEntry = {
			...(existingPricingEntry || {}),
			roomId: currentRoom._id,
			room_type:
				existingPricingEntry?.room_type ||
				resolvedRoomType ||
				currentRoom.room_type,
			displayName: existingPricingEntry?.displayName || resolvedDisplayName,
			count: existingPricingEntry?.count || 1,
			chosenPrice: finalChosenPrice,
			pricingByDay: pricingSnapshot,
		};

		if (Number.isFinite(totalWithComm) && totalWithComm > 0) {
			roomPricingEntry.totalPriceWithCommission = Number(
				totalWithComm.toFixed(2),
			);
		}
		if (hasRootPrice) {
			roomPricingEntry.hotelShouldGet = Number(hotelShouldGet.toFixed(2));
		}

		setPickedRoomPricing((prev) => {
			const next = Array.isArray(prev) ? [...prev] : [];
			const idx = next.findIndex(
				(pricing) => String(pricing.roomId) === String(currentRoom._id),
			);
			if (idx >= 0) {
				next[idx] = roomPricingEntry;
			} else {
				next.push(roomPricingEntry);
			}
			return next;
		});

		setTotal_Amount((prevTotal) =>
			Math.max(prevTotal - previousChosenPrice + finalChosenPrice, 0),
		);
		resetState();
		setIsModalVisible(false);
	};

	const handleCancel = () => {
		if (currentRoom && pickedHotelRooms.includes(currentRoom._id)) {
			handleRoomDeselection(currentRoom._id);
		}
		resetState();
		setIsModalVisible(false);
	};

	const handleOkBeds = () => {
		setBedNumber(selectedBeds);
		setOverallTotal(totalAmountPerBed * selectedBeds.length);
		setIsBedModalVisible(false);
	};

	const resetState = () => {
		setCurrentRoom(null);
		setPricingByDay([]);
		setInheritedPrice("");
		setTotalToDistribute("");
		setSelectedBeds([]);
		setBookedBeds([]);
		setTotalAmountPerBed(0);
		setOverallTotal(0);
	};

	const handleBedSelection = (bed) => {
		if (bookedBeds.includes(bed)) {
			toast.error("Bed is already booked. Cannot select.");
			return;
		}
		if (selectedBeds.includes(bed)) {
			setSelectedBeds(selectedBeds.filter((b) => b !== bed));
		} else {
			setSelectedBeds([...selectedBeds, bed]);
		}
	};

	useEffect(() => {
		const totalAmount = pricingByDay.reduce((acc, day) => acc + day.price, 0);
		setTotalAmountPerBed(totalAmount);
		setOverallTotal(totalAmount * selectedBeds.length);
	}, [pricingByDay, selectedBeds]);

	const columns = [
		{
			title: "Date",
			dataIndex: "date",
			key: "date",
		},
		{
			title: "Price",
			dataIndex: "price",
			key: "price",
			render: (text, record, index) => (
				<InputNumber
					min={0}
					value={record.price}
					onChange={(value) => {
						const nextPrice = normalizeNumber(value, 0);
						setPricingByDay((prev) =>
							prev.map((day, idx) =>
								idx === index ? buildDayRow(day.date, nextPrice, day) : day,
							),
						);
					}}
				/>
			),
		},
	];

	useEffect(() => {
		if (!isModalVisible) return;
		const total = pricingByDay.reduce(
			(acc, day) => acc + normalizeNumber(day.price, 0),
			0,
		);
		setTotalToDistribute(Number(total.toFixed(2)));
	}, [pricingByDay, isModalVisible]);

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

	const filteredRooms = hotelRooms.filter((room) => {
		const roomInfo = getRoomDisplayInfo(room);
		const isAvailabilityMatch =
			selectedAvailability === null ||
			(selectedAvailability === "occupied" &&
				isRoomBooked(room._id, room.room_type, room.bedsNumber)) ||
			(selectedAvailability === "vacant" &&
				!isRoomBooked(room._id, room.room_type, room.bedsNumber));
		const isRoomTypeMatch =
			selectedRoomType === null ||
			normalizeDisplayName(roomInfo.displayName) ===
				normalizeDisplayName(selectedRoomType);
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
		(hotelRooms || []).forEach((room) => {
			const roomInfo = getRoomDisplayInfo(room);
			const displayKey = normalizeDisplayName(roomInfo.displayName);
			if (!displayKey || seen.has(displayKey)) return;
			seen.add(displayKey);
			accumulator.push({
				displayName: roomInfo.displayName,
				roomColorCode: roomInfo.color,
			});
		});
		return accumulator;
	}, [getRoomDisplayInfo, hotelRooms, normalizeDisplayName]);

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
		[normalizeDisplayName, roomDetailsByDisplayName, roomDetailsByType],
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
				fromComponent='Taskeen'
			/>
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
														const isBooked = isRoomBooked(
															room._id,
															room.room_type,
															room.bedsNumber,
														);
														const isClosed = room.active === false;
														const roomInfo = getRoomDisplayInfo(room);
														const roomImage = getRoomImage(
															roomInfo.roomType,
															roomInfo.displayName,
														);
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
																			Display Name: {roomInfo.displayName}
																		</div>
																		<div
																			style={{ textTransform: "capitalize" }}
																		>
																			Room Type: {roomInfo.roomType || "N/A"}
																		</div>
																		<div>
																			Occupied: {isBooked ? "Yes" : "No"}
																		</div>
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
																	picked={pickedHotelRooms.includes(room._id)}
																	reserved={isBooked}
																	style={{
																		cursor: isBooked
																			? "not-allowed"
																			: isClosed
																				? "not-allowed"
																				: "pointer",
																		opacity: isBooked || isClosed ? 0.5 : 1,
																		textDecoration: isBooked || isClosed
																			? "line-through"
																			: "none",
																	}}
																	onClick={() =>
																		handleRoomClick(room._id, true, room)
																	}
																>
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
												style={{
													fontWeight: "bold",
													fontSize: "1.5rem",
													color: "#4a4a4a",
												}}
											>
												{chosenLanguage === "Arabic" ? "الطابق" : "Floor"}{" "}
												{floor}
											</h2>
											<div style={{ display: "flex", flexWrap: "wrap" }}>
												{filteredRooms &&
													filteredRooms
														.filter((room) => room.floor === floor)
														.map((room, idx) => {
															const isBooked = isRoomBooked(
																room._id,
																room.room_type,
																room.bedsNumber,
															);
															const isClosed = room.active === false;
															const roomInfo = getRoomDisplayInfo(room);
															const roomImage = getRoomImage(
																roomInfo.roomType,
																roomInfo.displayName,
															);
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
																				Display Name: {roomInfo.displayName}
																			</div>
																			<div
																				style={{ textTransform: "capitalize" }}
																			>
																				Room Type: {roomInfo.roomType || "N/A"}
																			</div>
																			<div>
																				Occupied: {isBooked ? "Yes" : "No"}
																			</div>
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
																	overlayStyle={{ zIndex: 100000000 }}
																	color='white'
																>
																	<RoomSquare
																		key={idx}
																		color={roomInfo.color}
																		picked={pickedHotelRooms.includes(room._id)}
																		reserved={isBooked}
																		style={{
																			cursor: isBooked
																				? "not-allowed"
																				: isClosed
																					? "not-allowed"
																					: "pointer",
																			opacity: isBooked || isClosed ? 0.5 : 1,
																			textDecoration: isBooked || isClosed
																				? "line-through"
																				: "none",
																		}}
																		onClick={() =>
																			handleRoomClick(room._id, true, room)
																		}
																	>
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

					<Modal
						title={
							<span>
								{chosenLanguage === "Arabic"
									? "اختر تسعير الغرفة"
									: "Select Room Pricing"}{" "}
								(
								<span
									style={{
										fontWeight: "bolder",
										textTransform: "capitalize",
										color: "#00003d",
									}}
								>
									{currentRoom?.room_type}
								</span>
								)
							</span>
						}
						open={isModalVisible}
						onOk={handleOk}
						onCancel={handleCancel}
					>
						<div
							style={{ marginBottom: "10px" }}
							dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
						>
							<label style={{ fontWeight: "bold", display: "block" }}>
								{chosenLanguage === "Arabic"
									? "المبلغ الإجمالي"
									: "Total Amount"}
							</label>
							<InputNumber
								value={totalToDistribute}
								onChange={(value) => setTotalToDistribute(value ?? "")}
								min={0}
								style={{ width: "100%", marginBottom: "8px" }}
							/>
							<button
								onClick={handleDistributeTotal}
								className='btn btn-primary my-1 p-1 w-50'
							>
								{chosenLanguage === "Arabic"
									? "توزيع الإجمالي"
									: "Distribute Total"}
							</button>
						</div>

						<div
							style={{ marginBottom: "10px" }}
							dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
						>
							<label style={{ fontWeight: "bold", display: "block" }}>
								{chosenLanguage === "Arabic" ? "سعر الليلة" : "Nightly Price"}
							</label>
							<InputNumber
								value={inheritedPrice}
								onChange={(value) => setInheritedPrice(value)}
								placeholder={
									chosenLanguage === "Arabic"
										? "أدخل سعر الليلة"
										: "Enter nightly price"
								}
								style={{ width: "100%", marginBottom: "10px" }}
							/>
							<div>
								<button
									onClick={handleInheritPrices}
									className='btn btn-success my-2 p-1 w-50'
								>
									{chosenLanguage === "Arabic"
										? "تطبيق سعر الليلة"
										: "Apply Nightly Price"}
								</button>
							</div>
						</div>

						{currentRoom?.room_type === "individualBed" && (
							<button
								onClick={() => setIsBedModalVisible(true)}
								className='btn btn-secondary my-2 p-1 w-50'
							>
								{chosenLanguage === "Arabic" ? "اختر السرير" : "Select Bed"}
							</button>
						)}

						{selectedBeds && selectedBeds.length > 0 && (
							<div
								style={{ marginBottom: "10px", fontWeight: "bold" }}
								dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
							>
								{chosenLanguage === "Arabic"
									? "الأسرة المختارة"
									: "Selected Beds"}
								: {selectedBeds.join(", ")}
							</div>
						)}

						<Table
							dataSource={pricingByDay}
							columns={columns}
							rowKey='date'
							pagination={false}
						/>

						{currentRoom?.room_type === "individualBed" ? (
							<>
								<div
									style={{ marginTop: "20px" }}
									dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
								>
									<strong>
										{chosenLanguage === "Arabic"
											? "المجموع الكلي لكل سرير"
											: "Total Amount Per Bed"}
										: {totalAmountPerBed} SAR
									</strong>
								</div>
								<div
									style={{ marginTop: "10px", fontWeight: "bold" }}
									dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
								>
									<strong>
										{chosenLanguage === "Arabic"
											? "المجموع الكلي"
											: "Overall Total"}
										: {overallTotal} SAR
									</strong>
								</div>
							</>
						) : (
							<>
								<div
									style={{ marginTop: "20px" }}
									dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
								>
									<strong>
										{chosenLanguage === "Arabic"
											? "المبلغ الإجمالي لكل ليلة"
											: "Total Amount Per Night"}
										:{" "}
										{pricingByDay.length > 0
											? pricingByDay.reduce((acc, day) => acc + day.price, 0) /
													pricingByDay.length &&
											  Number(
													pricingByDay.reduce(
														(acc, day) => acc + day.price,
														0,
													) / pricingByDay.length,
											  ).toFixed(2)
											: 0}{" "}
										SAR
									</strong>
								</div>
								<div
									style={{ marginTop: "10px", fontWeight: "bold" }}
									dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
								>
									<strong>
										{chosenLanguage === "Arabic"
											? "المبلغ الإجمالي"
											: "Overall Total"}
										:{" "}
										{pricingByDay.length > 0
											? pricingByDay.reduce((acc, day) => acc + day.price, 0) &&
											  pricingByDay
													.reduce((acc, day) => acc + day.price, 0)
													.toFixed(2)
											: 0}{" "}
										SAR
									</strong>
								</div>
							</>
						)}
					</Modal>
					<Modal
						title={
							<span>
								{chosenLanguage === "Arabic" ? "اختر السرير" : "Select Bed"} (
								<span
									style={{
										fontWeight: "bolder",
										textTransform: "capitalize",
										color: "#00003d",
									}}
								>
									{currentRoom?.room_number}
								</span>
								)
							</span>
						}
						open={isBedModalVisible}
						onOk={handleOkBeds}
						onCancel={() => setIsBedModalVisible(false)}
					>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
							{currentRoom?.bedsNumber.map((bed, index) => (
								<BedSquare
									key={index}
									onClick={() => handleBedSelection(bed)}
									selected={selectedBeds.includes(bed)}
									booked={bookedBeds.includes(bed)}
								>
									{bed}
								</BedSquare>
							))}
						</div>
					</Modal>
				</div>
			</div>
		</HotelOverviewWrapper>
	);
};

export default HotelOverviewReservation;

// Styled components
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const HotelOverviewWrapper = styled.div`
	margin-top: 30px;

	h3 {
		font-weight: bold;
		font-size: 2rem;
		text-align: center;
		color: #006ad1;
	}

	.canvas-grid {
		display: grid;
		grid-template-columns: 1fr;
	}

	.colors-grid {
		display: none;
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
	cursor: ${({ reserved }) => (reserved ? "not-allowed" : "pointer")};
	transition:
		width 1s,
		height 1s,
		background-color 1s,
		color 1s;

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

const BedSquare = styled.div`
	width: 70px;
	height: 100px;
	background-color: ${({ selected, booked }) =>
		selected ? "darkgreen" : booked ? "#e7e7e7" : "#f0f0f0"};
	border: 1px solid #000;
	color: ${({ selected, booked }) =>
		selected ? "white" : booked ? "black" : "black"};
	margin: 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.9rem;
	cursor: ${({ booked }) => (booked ? "not-allowed" : "pointer")};
	transition: all 0.3s;
	margin: auto;
	position: relative;

	&:hover {
		background-color: ${({ selected, booked }) =>
			selected ? "darkgreen" : booked ? "#e7e7e7" : "#dcdcdc"};
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
