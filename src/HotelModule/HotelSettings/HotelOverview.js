import React, { useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Tooltip, Spin } from "antd";
import FloorsModal from "./FloorsModal";
import ZSingleRoomModal from "./ZSingleRoomModal";
import ZInheritRoomsModal from "./ZInheritRoomsModal";
import { toast } from "react-toastify";

const normalizeDisplayName = (value) =>
	String(value || "")
		.trim()
		.toLowerCase();

const HotelOverview = ({
	hotelRooms,
	hotelDetails,
	values,
	addRooms,
	setHotelRooms,
	currentAddingRoom,
	alreadyAddedRooms,
	floorDetails,
	setFloorDetails,
	modalVisible,
	setModalVisible,
	modalVisible2,
	setModalVisible2,
	clickedFloor,
	setClickedFloor,
	clickedRoom,
	setClickedRoom,
	inheritModalVisible,
	setInheritModalVisible,
	baseFloor,
	setBaseFloor,
	roomTypeColors,
	roomsAlreadyExists,
}) => {
	const { hotelFloors, parkingLot, hotelName } = hotelDetails;
	const floors = Array.from(
		{ length: hotelFloors },
		(_, index) => index + 1, // Ascending order
	);

	const [hideAddRooms, setHideAddRooms] = useState(false);

	const applyInheritance = (baseFloorNumber) => {
		const baseFloorRooms = hotelRooms.filter(
			(room) => Number(room.floor) === Number(baseFloorNumber),
		);

		if (baseFloorRooms.length === 0) {
			toast.error(
				`No rooms found on floor ${baseFloorNumber} to inherit from.`,
			);
			return;
		}

		const newHotelRooms = floors.flatMap((floorNumber) => {
			if (Number(floorNumber) === Number(baseFloorNumber)) {
				return baseFloorRooms;
			}

			return baseFloorRooms.map((room) => {
				const newRoomNumber = `${floorNumber}${room.room_number.substring(
					room.room_number.length - 2,
				)}`;

				const newRoom = {
					...room,
					floor: floorNumber,
					room_number: newRoomNumber,
					_id: undefined, // Reset room id to avoid duplicates
				};

				if (room.room_type === "individualBed") {
					newRoom.bedsNumber = Array.from(
						{ length: room.bedsNumber.length },
						(_, i) => `${newRoomNumber}${String.fromCharCode(97 + i)}`,
					);
					newRoom.individualBeds = true;
				}

				return newRoom;
			});
		});

		setHotelRooms(newHotelRooms);
		toast.success(
			`All floors updated based on floor ${baseFloorNumber} structure.`,
		);
	};

	// Ensure roomCountDetails is treated as an array
	const roomCountDetails = useMemo(
		() =>
			Array.isArray(hotelDetails.roomCountDetails)
				? hotelDetails.roomCountDetails
				: [],
		[hotelDetails.roomCountDetails],
	);

	const roomDetailsByDisplayName = useMemo(() => {
		const map = new Map();
		roomCountDetails.forEach((detail) => {
			const key = normalizeDisplayName(detail.displayName || detail.roomType);
			if (!key) return;
			if (!map.has(key)) {
				map.set(key, detail);
			}
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

	const getRoomDisplayInfo = (room) => {
		const displayName = room?.display_name || room?.displayName || "";
		const detailByDisplay = displayName
			? roomDetailsByDisplayName.get(normalizeDisplayName(displayName))
			: null;
		const roomType = room?.room_type || "";
		const detailByType =
			!detailByDisplay && roomType ? roomDetailsByType.get(roomType) : null;
		const detail = detailByDisplay || detailByType;
		const resolvedRoomType = detail?.roomType || roomType;
		const typeLabel = resolvedRoomType
			? resolvedRoomType.replace(/([A-Z])/g, " $1").trim()
			: "Room";
		const resolvedColor = detail?.roomColor || room?.roomColorCode;
		return {
			displayName: displayName || detail?.displayName || typeLabel,
			roomType: resolvedRoomType,
			color: resolvedColor || (!detail && roomTypeColors[roomType]) || "#000",
		};
	};

	// Get room types count where count > 0
	const roomTypesCount = roomCountDetails.filter(
		(details) => details.count > 0,
	).length;

	console.log(hotelRooms, "hotelRooms");
	return (
		<HotelOverviewWrapper>
			<h3 style={{ textTransform: "capitalize" }}>
				Hotel Layout ({hotelName})
			</h3>
			<FloorsModal
				modalVisible={modalVisible}
				setModalVisible={setModalVisible}
				clickedFloor={clickedFloor}
				rooms={hotelRooms}
				setRooms={setHotelRooms}
				floorDetails={floorDetails}
				setFloorDetails={setFloorDetails}
				hotelDetails={hotelDetails}
				values={values}
				alreadyAddedRooms={alreadyAddedRooms}
			/>

			<ZSingleRoomModal
				modalVisible={modalVisible2}
				setModalVisible={setModalVisible2}
				clickedFloor={clickedFloor}
				clickedRoom={clickedRoom}
				setClickedRoom={setClickedRoom}
				rooms={hotelRooms}
				setRooms={setHotelRooms}
				setHelperRender={undefined}
				helperRender={undefined}
				hotelDetails={hotelDetails}
			/>

			<ZInheritRoomsModal
				inheritModalVisible={inheritModalVisible}
				setInheritModalVisible={setInheritModalVisible}
				baseFloor={baseFloor}
				setBaseFloor={setBaseFloor}
				applyInheritance={applyInheritance}
			/>

			<div className='mx-auto text-center my-4'>
				{hotelRooms && hotelRooms.length > 0 ? (
					<button
						className='btn btn-secondary w-25'
						onClick={() => setInheritModalVisible(true)}
						style={{
							fontWeight: "bold",
							letterSpacing: "2px",
							fontSize: "1.1rem",
						}}
					>
						Inherit
					</button>
				) : null}
			</div>

			<div
				className={`colors-grid mt-3 mx-auto text-center ${
					roomTypesCount <= 7 ? "expanded" : ""
				}`}
			>
				{roomCountDetails
					.filter((details) => details.count > 0)
					.map((details, i) => (
						<div className='' key={i} style={{ textAlign: "center" }}>
							<div
								style={{
									width: "20px",
									height: "20px",
									backgroundColor: details.roomColor || "#ddd",
									margin: "0 auto",
									marginBottom: "5px",
								}}
							></div>
							<span style={{ textTransform: "capitalize", fontSize: "13px" }}>
								{details.displayName ||
									details.roomType.replace(/([A-Z])/g, " $1").trim()}{" "}
								({details.count})
							</span>
						</div>
					))}
			</div>

			<FloorsContainer>
				{floors.reverse().map((floor, index) => {
					const roomsOnFloor =
						hotelRooms &&
						hotelRooms.filter((room) => room.floor === floor && !room._id);

					let currentAddingFloor = null;
					if (currentAddingRoom) {
						currentAddingFloor =
							currentAddingRoom.length === 4
								? parseInt(currentAddingRoom.substring(0, 2))
								: parseInt(currentAddingRoom.charAt(0));
					}

					return (
						<Floor key={index} delay={index * 0.3}>
							<h2
								className='mb-4'
								style={{
									fontWeight: "bold",
									fontSize: "1.5rem",
									color: "#4a4a4a",
								}}
							>
								Floor {floor}
							</h2>
							<div style={{ display: "flex", flexWrap: "wrap" }}>
								{hotelRooms &&
									hotelRooms
										.filter((room) => room.floor === floor)
										.map((room, idx) => {
											const roomInfo = getRoomDisplayInfo(room);
											return (
												<Tooltip
													title={
														<div
															style={{ textAlign: "center", color: "darkgrey" }}
														>
															<div>Room #: {room.room_number}</div>
															<div style={{ textTransform: "capitalize" }}>
																Display Name: {roomInfo.displayName}
															</div>
															<div style={{ textTransform: "capitalize" }}>
																Room Type: {roomInfo.roomType || "N/A"}
															</div>
															<div>
																Occupied: {room.isOccupied ? "Yes" : "No"}
															</div>
															<div>Clean: {room.cleanRoom ? "Yes" : "No"}</div>
															<div>
																Open for Housing:{" "}
																{room.active === false ? "No" : "Yes"}
															</div>
															{room.isHandicapped ? (
																<div>Handicapped Room</div>
															) : null}
															{room.isVip ? <div>VIP Room</div> : null}
														</div>
													}
													key={idx}
													overlayStyle={{ zIndex: 100000000 }}
													color='white'
												>
													<RoomSquare
														key={idx}
														color={roomInfo.color}
														onClick={() => {
															setClickedRoom(room);
															setClickedFloor(floor);
															setModalVisible2(true);
														}}
													>
														{room.room_number}
													</RoomSquare>
												</Tooltip>
											);
										})}
							</div>
							<span
								className='mx-2'
								style={{ fontSize: "13px", textDecoration: "underline" }}
								onClick={() => {
									setClickedFloor(floor);
									setModalVisible(true);
								}}
							>
								(Please Click Here To Update The Rooms)
							</span>
							{roomsOnFloor.length > 0 && (
								<>
									<div className='mt-3'>
										{hideAddRooms ? null : (
											<button
												className='btn btn-success'
												onClick={() => {
													addRooms();
													setHideAddRooms(true);
												}}
											>
												Add Rooms...
											</button>
										)}

										{Number(currentAddingFloor) === Number(floor) && (
											<div style={{ textAlign: "center", margin: "20px" }}>
												<Spin />
												<p>Adding room #{currentAddingRoom}...</p>
											</div>
										)}
									</div>
								</>
							)}
						</Floor>
					);
				})}
				{parkingLot && <ParkingLot>Parking Lot</ParkingLot>}
			</FloorsContainer>
		</HotelOverviewWrapper>
	);
};

export default HotelOverview;

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

	.colors-grid {
		display: grid;
		justify-content: center;
		align-items: center;
		align-content: center;
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: 2px;
		justify-items: center;
	}
	.colors-grid.expanded {
		gap: 10px;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
	width: 35px;
	height: 35px;
	background-color: ${({ color }) =>
		color || "#ddd"}; // Default to a light grey if no color is provided
	border: 1px solid #000;
	color: white;
	margin: 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.7rem;
	cursor: pointer;
	transition:
		width 0.3s ease-in-out,
		height 0.3s ease-in-out,
		background-color 0.3s ease-in-out,
		color 0.3s ease-in-out;
`;
