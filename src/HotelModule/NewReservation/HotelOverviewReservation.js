import React, { useEffect, useState, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { InputNumber, Modal, Table, Tooltip } from "antd";
import moment from "moment";
import { toast } from "react-toastify";
import HotelMapFilters from "./HotelMapFilters"; // Ensure this path is correct

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

	const buildDayRow = (date, price, template = {}) => ({
		...template,
		date,
		price,
		totalPriceWithCommission: price,
		totalPriceWithoutCommission: price,
	});

	const buildPricingByNightly = (nightlyPrice, nightsCount, template = {}) => {
		if (!start_date || !nightsCount) return [];
		const start = moment(start_date).startOf("day");
		return Array.from({ length: nightsCount }, (_, idx) =>
			buildDayRow(
				start.clone().add(idx, "day").format("YYYY-MM-DD"),
				nightlyPrice,
				template
			)
		);
	};

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
			const bookedBedsTemp = [];

			allReservations.forEach((reservation) => {
				const startDate = moment(start_date_Map);
				const endDate = moment(end_date_Map);
				const reservationStart = moment(reservation.checkin_date);
				const reservationEnd = moment(reservation.checkout_date);

				const overlap =
					startDate.isBefore(reservationEnd) &&
					endDate.isAfter(reservationStart);

				if (overlap) {
					const bookedBeds = reservation.bedNumber || [];
					bookedBedsTemp.push(...bookedBeds);
				}
			});

			setBookedBeds(bookedBedsTemp);
		}
	}, [currentRoom, start_date_Map, end_date_Map, allReservations]);

	const { hotelFloors, parkingLot } = hotelDetails;
	const floors = Array.from({ length: hotelFloors }, (_, index) => index + 1);
	const floorsDesc = [...floors].reverse(); // Descending order for display on the canvas

	const handleRoomClick = (roomId, show, room) => {
		if (!roomId || !room) return;

		if (isRoomBooked(roomId, room.room_type, room.bedsNumber)) {
			toast.error("Room is booked. Cannot select.");
			return;
		}

		if (pickedHotelRooms.includes(roomId)) {
			handleRoomDeselection(roomId);
		} else {
			setPickedHotelRooms([...pickedHotelRooms, roomId]);
			setCurrentRoom(room);
			showModal(room);
		}
	};

	const handleRoomDeselection = (roomId) => {
		setPickedHotelRooms(pickedHotelRooms.filter((id) => id !== roomId));

		const priceToRemove = pickedRoomPricing.find(
			(pricing) => pricing.roomId === roomId
		)?.chosenPrice;

		if (priceToRemove) {
			setTotal_Amount((prevTotal) =>
				Math.max(prevTotal - Number(priceToRemove), 0)
			);
		}

		setPickedRoomPricing(
			pickedRoomPricing.filter((pricing) => pricing.roomId !== roomId)
		);
	};

	const isRoomBooked = (roomId, roomType, bedsNumber) => {
		if (!start_date_Map || !end_date_Map) return false;

		const startDate = moment(start_date_Map);
		const endDate = moment(end_date_Map);

		if (searchedReservation && searchedReservation.roomId.includes(roomId)) {
			// Allow clicking on the room if it matches the searched reservation
			return false;
		}

		if (roomType === "individualBed") {
			const bookedBedsTemp = [];

			const isBooked = allReservations.some((reservation) => {
				const reservationStart = moment(reservation.checkin_date);
				const reservationEnd = moment(reservation.checkout_date);

				const overlap =
					startDate.isBefore(reservationEnd) &&
					endDate.isAfter(reservationStart);

				if (overlap) {
					const bookedBeds = reservation.bedNumber || [];
					bookedBedsTemp.push(...bookedBeds);
					const allBedsBooked = bedsNumber.every((bed) =>
						bookedBeds.includes(bed)
					);

					return allBedsBooked;
				}

				return false;
			});

			return isBooked;
		} else {
			return allReservations.some((reservation) => {
				const reservationStart = moment(reservation.checkin_date);
				const reservationEnd = moment(reservation.checkout_date);

				return (
					startDate.isBefore(reservationEnd) &&
					endDate.isAfter(reservationStart) &&
					reservation.roomId.some((room) => room._id === roomId)
				);
			});
		}
	};

	const showModal = (room) => {
		if (!room) return;
		setCurrentRoom(room);

		const { room_type } = room;
		const displayName = room.display_name || room.displayName;
		const nightsCount = Math.max(getStayNights(), 1);

		// Check if the searched reservation has pricing information
		if (searchedReservation && searchedReservation.pickedRoomsType) {
			const roomTypeDetails = searchedReservation.pickedRoomsType.find(
				(r) => r.room_type === room_type && r.displayName === displayName
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
						const normalizedPrice = Number(rawPrice);
						return {
							...safeDay,
							price: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
						};
					})
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
					searchedReservation.pickedRoomsType
				)
					? searchedReservation.pickedRoomsType.reduce(
							(sum, r) => sum + (Number(r.count) || 1),
							0
					  )
					: 0;
				const totalRooms =
					Number(searchedReservation.total_rooms) ||
					roomCountFromTypes ||
					1;
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
					end_date
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
				end_date
			);
			if (!generated || generated.length === 0) {
				setPricingByDay(buildPricingByNightly(0, nightsCount));
			}
		}

		setIsModalVisible(true);
	};

	const generatePricingTable = useCallback(
		(roomType, displayName, startDate, endDate) => {
			// Find the corresponding room in hotelDetails
			const roomDetails = hotelDetails.roomCountDetails.find(
				(detail) =>
					detail.roomType === roomType && detail.displayName === displayName
			);

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
					(price) => price.calendarDate === dateString
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
		[hotelDetails.roomCountDetails, setPricingByDay]
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
					: "Please enter a valid price."
			);
			return;
		}
		if (!pricingByDay || pricingByDay.length === 0) {
			toast.error(
				chosenLanguage === "Arabic"
					? "لا توجد بيانات تسعير لتحديثها"
					: "No pricing data to update."
			);
			return;
		}
		setPricingByDay((prev) =>
			prev.map((day) => buildDayRow(day.date, nextPrice, day))
		);
	};

	const handleDistributeTotal = () => {
		if (totalToDistribute === null || totalToDistribute === "") {
			toast.error(
				chosenLanguage === "Arabic"
					? "يرجى إدخال إجمالي صالح"
					: "Please enter a valid total amount."
			);
			return;
		}
		const total = normalizeNumber(totalToDistribute, NaN);
		if (!Number.isFinite(total) || total < 0) {
			toast.error(
				chosenLanguage === "Arabic"
					? "يرجى إدخال إجمالي صالح"
					: "Please enter a valid total amount."
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
					: "Please confirm pricing before continuing."
			);
			return;
		}

		const nightlyTotal = pricingByDay.reduce(
			(acc, day) => acc + (Number(day.price) || 0),
			0
		);
		const chosenPrice = nightlyTotal / pricingByDay.length;

		const finalChosenPrice =
			currentRoom.room_type === "individualBed"
				? chosenPrice * selectedBeds.length
				: chosenPrice;

		const pricingSnapshot = pricingByDay.map((day) => ({ ...day }));

		if (setPickedRoomsType && Array.isArray(pickedRoomsType)) {
			const currentDisplayName =
				currentRoom.display_name || currentRoom.displayName;
			const totalWithComm = pricingSnapshot.reduce(
				(acc, day) =>
					acc +
					normalizeNumber(
						day.totalPriceWithCommission ?? day.price,
						0
					),
				0
			);
			const hotelShouldGet = pricingSnapshot.reduce(
				(acc, day) => acc + normalizeNumber(day.rootPrice, 0),
				0
			);
			const hasRootPrice = pricingSnapshot.some(
				(day) => day.rootPrice !== undefined
			);

			setPickedRoomsType((prev) => {
				if (!Array.isArray(prev)) return prev;
				const next = [...prev];
				const idx = next.findIndex(
					(line) =>
						line.room_type === currentRoom.room_type &&
						line.displayName === currentDisplayName
				);
				if (idx === -1) return prev;

				const updatedLine = {
					...next[idx],
					pricingByDay: pricingSnapshot,
					chosenPrice: Number(chosenPrice.toFixed(2)),
				};

				if (Number.isFinite(totalWithComm) && totalWithComm > 0) {
					updatedLine.totalPriceWithCommission = Number(
						totalWithComm.toFixed(2)
					);
				}
				if (hasRootPrice) {
					updatedLine.hotelShouldGet = Number(hotelShouldGet.toFixed(2));
				}

				next[idx] = updatedLine;
				return next;
			});

			if (setSearchedReservation && searchedReservation) {
				const updatedRooms = Array.isArray(pickedRoomsType)
					? pickedRoomsType.map((line) => {
							if (
								line.room_type === currentRoom.room_type &&
								line.displayName === currentDisplayName
							) {
								return {
									...line,
									pricingByDay: pricingSnapshot,
									chosenPrice: Number(chosenPrice.toFixed(2)),
									totalPriceWithCommission: Number(totalWithComm.toFixed(2)),
									hotelShouldGet: hasRootPrice
										? Number(hotelShouldGet.toFixed(2))
										: line.hotelShouldGet,
								};
							}
							return line;
					  })
					: [];

				const stayNights = Math.max(getStayNights(), 1);
				const updatedTotalAmount = updatedRooms.reduce((sum, room) => {
					const count = Number(room.count) || 1;
					if (Array.isArray(room.pricingByDay) && room.pricingByDay.length > 0) {
						const roomTotal = room.pricingByDay.reduce(
							(acc, day) =>
								acc +
								normalizeNumber(
									day.totalPriceWithCommission ?? day.price,
									0
								),
							0
						);
						return sum + roomTotal * count;
					}
					const nightly = normalizeNumber(room.chosenPrice, 0);
					return sum + nightly * stayNights * count;
				}, 0);

				setSearchedReservation({
					...searchedReservation,
					pickedRoomsType: updatedRooms,
					total_amount:
						updatedTotalAmount > 0
							? Number(updatedTotalAmount.toFixed(2))
							: searchedReservation.total_amount,
				});
			}
		}

		setPickedRoomPricing([
			...pickedRoomPricing,
			{
				roomId: currentRoom._id,
				chosenPrice: finalChosenPrice,
				pricingByDay: pricingSnapshot,
			},
		]);

		setTotal_Amount((prevTotal) => prevTotal + finalChosenPrice);
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
								idx === index ? buildDayRow(day.date, nextPrice, day) : day
							)
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
			0
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
		const isAvailabilityMatch =
			selectedAvailability === null ||
			(selectedAvailability === "occupied" &&
				isRoomBooked(room._id, room.room_type, room.bedsNumber)) ||
			(selectedAvailability === "vacant" &&
				!isRoomBooked(room._id, room.room_type, room.bedsNumber));
		const isRoomTypeMatch =
			selectedRoomType === null ||
			room.display_name === selectedRoomType ||
			room.displayName === selectedRoomType;
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

	const distinctRoomTypesWithColors =
		hotelRooms &&
		hotelRooms.reduce((accumulator, room) => {
			const displayName = room.display_name || room.displayName;
			if (!displayName) return accumulator;

			if (
				!accumulator.some((item) => item.displayName === displayName)
			) {
				accumulator.push({
					displayName,
					roomColorCode: room.roomColorCode,
				});
			}
			return accumulator;
		}, []);

	const getRoomDetails = (roomType, displayName) => {
		return hotelDetails.roomCountDetails.find(
			(detail) =>
				detail.roomType === roomType && detail.displayName === displayName
		);
	};

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
														const { isBooked } = isRoomBooked(
															room._id,
															room.room_type,
															room.bedsNumber
														);
														const roomImage = getRoomImage(
															room.room_type,
															room.display_name
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
																			Room Type: {room.room_type}
																		</div>
																		<div>Display Name: {room.display_name}</div>
																		<div>
																			Occupied: {isBooked ? "Yes" : "No"}
																		</div>
																		<div>
																			Clean: {room.cleanRoom ? "Yes" : "No"}
																		</div>
																	</div>
																}
																key={idx}
																overlayStyle={{ zIndex: 100000000 }}
																color='white'
															>
																<RoomSquare
																	key={idx}
																	color={room.roomColorCode}
																	picked={pickedHotelRooms.includes(room._id)}
																	reserved={isBooked}
																	style={{
																		cursor: isBooked
																			? "not-allowed"
																			: "pointer",
																		opacity: isBooked ? 0.5 : 1,
																		textDecoration: isBooked
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
															const { isBooked } = isRoomBooked(
																room._id,
																room.room_type,
																room.bedsNumber
															);
															const roomImage = getRoomImage(room.room_type);
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
																				Room Type: {room.room_type}
																			</div>
																			<div>
																				Occupied: {isBooked ? "Yes" : "No"}
																			</div>
																			<div>
																				Clean: {room.cleanRoom ? "Yes" : "No"}
																			</div>
																		</div>
																	}
																	key={idx}
																	overlayStyle={{ zIndex: 100000000 }}
																	color='white'
																>
																	<RoomSquare
																		key={idx}
																		color={room.roomColorCode}
																		picked={pickedHotelRooms.includes(room._id)}
																		reserved={isBooked}
																		style={{
																			cursor: isBooked
																				? "not-allowed"
																				: "pointer",
																			opacity: isBooked ? 0.5 : 1,
																			textDecoration: isBooked
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
								onChange={(value) =>
									setTotalToDistribute(value ?? "")
								}
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
								{chosenLanguage === "Arabic"
									? "سعر الليلة"
									: "Nightly Price"}
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
														0
													) / pricingByDay.length
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
