import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { InputNumber, Modal, Select, Tooltip, Checkbox } from "antd";
import moment from "moment";
import { toast } from "react-toastify";
import { isPendingConfirmationReservation } from "../utils/reservationStatus";
// eslint-disable-next-line
const { Option } = Select;

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
	start_date_Map,
	end_date_Map,
}) => {
	const [selectedRoomType, setSelectedRoomType] = useState(null);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [currentRoom, setCurrentRoom] = useState(null);
	const [customPrice, setCustomPrice] = useState(null);
	const [selectedPrice, setSelectedPrice] = useState("");
	const [fixIt, setFixIt] = useState(false);
	const [useReservationPrice, setUseReservationPrice] = useState(false);
	const [addCustomPrice, setAddCustomPrice] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			const currentPosition = window.scrollY;
			setFixIt(currentPosition > 900);
		};

		// Add event listener
		window.addEventListener("scroll", handleScroll);

		// Clean up
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	const { hotelFloors, parkingLot } = hotelDetails;
	const floors = Array.from(
		{ length: hotelFloors },
		(_, index) => hotelFloors - index
	);

	const handleRoomClick = (roomId, show, room) => {
		// eslint-disable-next-line
		let priceToAdd;

		if (isRoomBooked(roomId)) {
			// If the room is booked, do not proceed further
			console.log("Room is booked. Cannot select.");
			return;
		}

		if (pickedHotelRooms.includes(roomId)) {
			setPickedHotelRooms(pickedHotelRooms.filter((id) => id !== roomId));
			// eslint-disable-next-line
			priceToAdd = currentRoom?.room_pricing[selectedPrice];

			var newAmount =
				pickedRoomPricing.filter((room) => room.roomId !== roomId) &&
				pickedRoomPricing
					.filter((room) => room.roomId !== roomId)
					.map((ii) => ii.chosenPrice);

			setTotal_Amount(
				newAmount.reduce(
					(accumulator, currentValue) => accumulator + Number(currentValue),
					0
				)
			);

			setPickedRoomPricing(
				pickedRoomPricing.filter((room) => room.roomId !== roomId)
			);
		} else {
			setPickedHotelRooms([...pickedHotelRooms, roomId]);
			setCurrentRoom(room);
			showModal(room); // Open the modal for room pricing
		}
	};

	const handleRoomTypeClick = (roomType) => {
		setSelectedRoomType(roomType);
	};

	const handleSelectAllClick = () => {
		setSelectedRoomType(null); // Reset room type filter
	};

	// console.log(pickedRoomPricing, "pickedRoomPricing");

	const filteredRooms = selectedRoomType
		? hotelRooms.filter((room) => room.room_type === selectedRoomType)
		: hotelRooms;

	const showModal = (room) => {
		setCurrentRoom(room);
		setIsModalVisible(true);
	};

	const handleOk = () => {
		// Initialize priceToAdd as null
		let priceToAdd = null;

		if (addCustomPrice && customPrice) {
			// If the custom price checkbox is checked and there's a custom price
			priceToAdd = customPrice;
		} else if (
			useReservationPrice &&
			searchedReservation &&
			searchedReservation.pickedRoomsType &&
			searchedReservation.pickedRoomsType.length === 1
		) {
			// If the reservation price checkbox is checked and there's a valid reservation price
			priceToAdd = Number(searchedReservation.pickedRoomsType[0].chosenPrice);
		}

		if (priceToAdd !== null) {
			// Add room pricing information if a valid price is added
			setPickedRoomPricing([
				...pickedRoomPricing,
				{ roomId: currentRoom._id, chosenPrice: priceToAdd },
			]);
			// Update total amount
			setTotal_Amount((prevTotal) => prevTotal + Number(priceToAdd));
		} else {
			// If no valid option is selected, possibly show a message or handle accordingly
			// For example, using a toast to notify the user to select or enter a price
			toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء اختيار أو إدخال سعر"
					: "Please select or enter a price"
			);
			// Optionally, you might want to prevent the modal from closing if no valid price is selected
			// If you decide to keep the modal open, remove or comment out the line below
		}

		// Close the modal
		setIsModalVisible(false);
	};

	// eslint-disable-next-line
	const handlePriceChange = (value) => {
		setSelectedPrice(value);
		if (value !== "custom") {
			setCustomPrice(null); // Reset custom price if a preset price is selected
		}
	};

	const handleCancel = () => {
		handleRoomDeselection();
		setIsModalVisible(false);
		setCustomPrice(null); // Reset custom price
	};

	const handleRoomDeselection = () => {
		if (currentRoom) {
			// Deselect the room by removing it from pickedHotelRooms
			setPickedHotelRooms(
				pickedHotelRooms.filter((id) => id !== currentRoom._id)
			);

			// Update total amount by subtracting the price of the deselected room
			const priceToRemove = pickedRoomPricing.find(
				(pricing) => pricing.roomId === currentRoom._id
			)?.chosenPrice;
			if (priceToRemove) {
				setTotal_Amount((prevTotal) => prevTotal - Number(priceToRemove));
			}

			// Remove the room's pricing information from pickedRoomPricing
			setPickedRoomPricing(
				pickedRoomPricing.filter(
					(pricing) => pricing.roomId !== currentRoom._id
				)
			);
		}
	};

	const isRoomBooked = (roomId) => {
		if (!start_date_Map || !end_date_Map) return false;

		const startDate = moment(start_date_Map);
		const endDate = moment(end_date_Map);

		return allReservations.some((reservation) => {
			if (isPendingConfirmationReservation(reservation)) return false;
			const reservationStart = moment(reservation.checkin_date);
			const reservationEnd = moment(reservation.checkout_date);

			// Check if the date range overlaps and the room ID is in the reservation's roomId array
			return (
				startDate.isBefore(reservationEnd) &&
				endDate.isAfter(reservationStart) &&
				reservation.roomId.some((room) => room._id === roomId)
			);
		});
	};

	const distinctRoomTypesWithColors =
		hotelRooms &&
		hotelRooms.reduce((accumulator, room) => {
			// Check if this room_type is already processed
			if (!accumulator.some((item) => item.room_type === room.room_type)) {
				accumulator.push({
					room_type: room.room_type,
					roomColorCode: room.roomColorCode,
				});
			}
			return accumulator;
		}, []);

	return (
		<HotelOverviewWrapper fixIt={fixIt}>
			<div className='canvas-grid'>
				<div>
					<FloorsContainer>
						{floors.map((floor, index) => (
							<Floor key={index} delay={index * 0.3}>
								<h2 className='mb-4'>
									{chosenLanguage === "Arabic" ? "الطابق" : "Floor"} {floor}
								</h2>
								<div style={{ display: "flex", flexWrap: "wrap" }}>
									{filteredRooms &&
										filteredRooms
											.filter((room) => room.floor === floor)
											.map((room, idx) => {
												const roomIsBooked = isRoomBooked(room._id);
												return (
													<Tooltip
														title={
															<span style={{ textTransform: "capitalize" }}>
																{room.room_type}
															</span>
														}
														key={idx}
													>
														<RoomSquare
															key={idx}
															color={
																roomIsBooked
																	? "#e7e7e7" // Grey color for booked rooms
																	: pickedHotelRooms.includes(room._id)
																	  ? "darkgreen" // Dark green for selected rooms
																	  : room.roomColorCode // Default room color
															}
															onClick={() => {
																if (!roomIsBooked) {
																	handleRoomClick(room._id, true, room);
																}
															}}
															picked={pickedHotelRooms.includes(room._id)}
															reserved={roomIsBooked}
															style={{
																cursor: roomIsBooked
																	? "not-allowed"
																	: "pointer",
																opacity: roomIsBooked ? 0.5 : 1, // Reduce opacity for booked rooms
																textDecoration: roomIsBooked
																	? "line-through"
																	: "none", // Line-through for booked rooms
															}}
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
						{searchedReservation &&
						searchedReservation.pickedRoomsType &&
						searchedReservation.pickedRoomsType.length === 1 &&
						Number(searchedReservation.pickedRoomsType[0].count) === 1 ? (
							<Checkbox
								checked={useReservationPrice}
								onChange={(e) => {
									// Deselect the addCustomPrice checkbox when this is checked
									if (e.target.checked) {
										setAddCustomPrice(false);
										if (
											searchedReservation &&
											searchedReservation.pickedRoomsType &&
											searchedReservation.pickedRoomsType.length === 1
										) {
											setUseReservationPrice(
												Number(
													searchedReservation.pickedRoomsType[0].chosenPrice
												)
											);
										} else {
											toast.error(
												chosenLanguage === "Arabic"
													? "الرجاء اختيار سعر مخصص لهذا الحجز"
													: "It is recommended to make it a custom price"
											);
										}
									}
								}}
							>
								{chosenLanguage === "Arabic"
									? "هل تريد أن تأخذ سعر الحجز الأصلي؟"
									: "Do you want to take the reservation original price?"}
							</Checkbox>
						) : null}

						<br />
						<Checkbox
							checked={addCustomPrice}
							onChange={(e) => {
								setAddCustomPrice(e.target.checked);
								// Deselect the useReservationPrice checkbox when this is checked
								if (e.target.checked) {
									setUseReservationPrice(false);
								}
							}}
						>
							{chosenLanguage === "Arabic"
								? "هل ترغب في إضافة سعر مخصص؟"
								: "Do you want to add a custom price?"}
						</Checkbox>
						{addCustomPrice && (
							<InputNumber
								value={customPrice}
								onChange={(value) => {
									setCustomPrice(value);
									setSelectedPrice("custom"); // Assuming you're managing the selected price to handle logic in `handleOk`
								}}
								style={{ width: "100%", marginTop: "10px" }}
								min={0}
							/>
						)}
					</Modal>
				</div>

				<div className='colors-grid mt-3'>
					<div
						style={{ textAlign: "center", cursor: "pointer" }}
						onClick={handleSelectAllClick}
					>
						<div
							style={{
								width: "20px",
								height: "20px",
								backgroundColor: "grey",
								margin: "0 auto",
								marginBottom: "5px",
							}}
						></div>
						<span style={{ textTransform: "capitalize", fontSize: "13px" }}>
							{chosenLanguage === "Arabic" ? "اختر الكل" : "Select All"}
						</span>
					</div>
					{distinctRoomTypesWithColors &&
						distinctRoomTypesWithColors.map((room, i) => (
							<div
								key={i}
								style={{
									textAlign: "center",
									cursor: "pointer",
								}}
								onClick={() => handleRoomTypeClick(room.room_type)}
							>
								<div
									style={{
										width: "20px",
										height: "20px",
										backgroundColor: room.roomColorCode,
										margin: "0 auto",
										marginBottom: "5px",
									}}
								></div>
								<span style={{ textTransform: "capitalize", fontSize: "13px" }}>
									{room.room_type.replace(/([A-Z])/g, " $1").trim()}
								</span>
							</div>
						))}
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
	padding: 50px;
	background-color: lightblue;
	border: 1px solid #ccc;
	width: 90%;
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
