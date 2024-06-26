import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Tooltip, Modal } from "antd";
import moment from "moment";

const HotelHeatMap = ({
	hotelRooms,
	hotelDetails,
	start_date,
	end_date,
	allReservations,
	chosenLanguage,
}) => {
	const [selectedRoomType, setSelectedRoomType] = useState(null);
	const [fixIt, setFixIt] = useState(false);
	const [isBedModalVisible, setIsBedModalVisible] = useState(false);
	const [selectedRoom, setSelectedRoom] = useState(null);
	const [bookedBeds, setBookedBeds] = useState([]);

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

	const { hotelFloors, parkingLot } = hotelDetails;
	const floors = Array.from(
		{ length: hotelFloors },
		(_, index) => hotelFloors - index
	);

	const filteredRooms = selectedRoomType
		? hotelRooms.filter((room) => room.room_type === selectedRoomType)
		: hotelRooms;

	const distinctRoomTypesWithColors =
		hotelRooms &&
		hotelRooms.reduce((accumulator, room) => {
			if (!accumulator.some((item) => item.room_type === room.room_type)) {
				accumulator.push({
					room_type: room.room_type,
					roomColorCode: room.roomColorCode,
				});
			}
			return accumulator;
		}, []);

	const isRoomBooked = (roomId, roomType, bedsNumber) => {
		if (!start_date || !end_date) return false;

		const startDate = moment(start_date);
		const endDate = moment(end_date);

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
			return { isBooked, bookedBedsTemp };
		} else {
			const isBooked = allReservations.some((reservation) => {
				const reservationStart = moment(reservation.checkin_date);
				const reservationEnd = moment(reservation.checkout_date);

				return (
					startDate.isBefore(reservationEnd) &&
					endDate.isAfter(reservationStart) &&
					reservation.roomId.some((room) => room._id === roomId)
				);
			});
			return { isBooked, bookedBedsTemp: [] };
		}
	};

	const handleSelectAllClick = () => {
		setSelectedRoomType(null); // Reset room type filter
	};

	const handleRoomClick = (room) => {
		const { isBooked, bookedBedsTemp } = isRoomBooked(
			room._id,
			room.room_type,
			room.bedsNumber
		);

		if (room.room_type === "individualBed" && !isBooked) {
			setBookedBeds(bookedBedsTemp);
			setSelectedRoom(room);
			setIsBedModalVisible(true);
		}
	};

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
												const { isBooked } = isRoomBooked(
													room._id,
													room.room_type,
													room.bedsNumber
												);
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
															color={room.roomColorCode}
															picked={""}
															reserved={isBooked}
															style={{
																cursor: isBooked
																	? "not-allowed"
																	: room.room_type === "individualBed"
																	  ? "pointer"
																	  : "default",
																opacity: isBooked ? 0.5 : 1,
																textDecoration: isBooked
																	? "line-through"
																	: "none",
															}}
															onClick={() => handleRoomClick(room)}
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
								onClick={() => setSelectedRoomType(room.room_type)}
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
					{selectedRoom?.bedsNumber.map((bed, index) => (
						<BedSquare key={index} booked={bookedBeds.includes(bed)}>
							{bed}
						</BedSquare>
					))}
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
	cursor: ${({ booked }) => (booked ? "not-allowed" : "pointer")};
	transition: all 0.3s;
	margin: auto;
	position: relative;

	&:hover {
		background-color: ${({ booked }) => (booked ? "#e7e7e7" : "#dcdcdc")};
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
