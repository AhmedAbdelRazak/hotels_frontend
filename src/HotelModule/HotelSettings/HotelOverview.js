import React, { useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Tooltip, Spin } from "antd";
import FloorsModal from "./FloorsModal";
import ZSingleRoomModal from "./ZSingleRoomModal";
import ZInheritRoomsModal from "./ZInheritRoomsModal";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import { updateSingleRoom } from "../apiAdmin";

const normalizeDisplayName = (value) =>
	String(value || "")
		.trim()
		.toLowerCase();

const getRoomIdentity = (room = {}) =>
	room?._id || `${room?.floor || ""}-${room?.room_number || ""}`;

const cloneAssignmentForRoom = (source = {}, destination = {}) => {
	const assignment = {
		room_type: source.room_type,
		display_name: source.display_name,
		room_features: source.room_features,
		room_pricing: source.room_pricing,
		roomColorCode: source.roomColorCode,
		individualBeds: source.individualBeds,
		bedsNumber: source.bedsNumber,
		isHandicapped: source.isHandicapped,
		isVip: source.isVip,
		active: source.active,
	};

	if (assignment.individualBeds && Array.isArray(assignment.bedsNumber)) {
		assignment.bedsNumber = Array.from(
			{ length: assignment.bedsNumber.length },
			(_, index) =>
				`${destination.room_number}${String.fromCharCode(97 + index)}`,
		);
	}

	return {
		...destination,
		...assignment,
	};
};

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
	chosenLanguage,
}) => {
	const { user, token } = isAuthenticated();
	const { hotelFloors, parkingLot } = hotelDetails;
	const isArabic = chosenLanguage === "Arabic";
	const labels = {
		inherit: isArabic ? "نسخ توزيع طابق" : "Inherit Floor Layout",
		floor: isArabic ? "الطابق" : "Floor",
		updateRooms: isArabic ? "تعديل غرف هذا الطابق" : "Update This Floor",
		addRooms: isArabic ? "إضافة الغرف" : "Add Rooms",
		addingRoom: isArabic ? "جاري إضافة الغرفة" : "Adding room",
		parkingLot: isArabic ? "موقف السيارات" : "Parking Lot",
		roomNumber: isArabic ? "رقم الغرفة" : "Room #",
		displayName: isArabic ? "اسم العرض" : "Display Name",
		roomType: isArabic ? "نوع الغرفة" : "Room Type",
		occupied: isArabic ? "مشغولة" : "Occupied",
		clean: isArabic ? "نظيفة" : "Clean",
		openHousing: isArabic ? "متاحة للتسكين" : "Open for Housing",
		yes: isArabic ? "نعم" : "Yes",
		no: isArabic ? "لا" : "No",
		handicapped: isArabic ? "غرفة لذوي الاحتياجات" : "Accessible Room",
		vip: isArabic ? "غرفة VIP" : "VIP Room",
	};
	const floors = Array.from(
		{ length: hotelFloors },
		(_, index) => index + 1, // Ascending order
	);

	const [hideAddRooms, setHideAddRooms] = useState(false);
	const [draggedRoomKey, setDraggedRoomKey] = useState("");
	const [dropTargetKey, setDropTargetKey] = useState("");
	const [savingSwap, setSavingSwap] = useState(false);
	const openFloorBuilder = (floor) => {
		setClickedFloor(floor);
		setModalVisible(true);
	};

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

	const persistSwappedRooms = (roomsToSave = []) => {
		const persistedRooms = roomsToSave.filter((room) => room?._id);
		if (!persistedRooms.length) {
			toast.success(
				isArabic
					? "تم تبديل الغرف. احفظ الغرف لتثبيت الخريطة."
					: "Room positions were swapped. Save rooms to keep the map."
			);
			return;
		}
		setSavingSwap(true);
		Promise.all(
			persistedRooms.map((room) =>
				updateSingleRoom(room._id, user._id, token, room)
			)
		)
			.then((responses) => {
				const failed = responses.find((response) => response?.error);
				if (failed) {
					toast.error(
						failed.error ||
							(isArabic
								? "تعذر حفظ تبديل الغرف."
								: "Could not save the room swap.")
					);
					return;
				}
				toast.success(
					isArabic
						? "تم تبديل أنواع الغرف وحفظها."
						: "Room types were swapped and saved."
				);
			})
			.catch(() =>
				toast.error(
					isArabic ? "تعذر حفظ تبديل الغرف." : "Could not save the room swap."
				)
			)
			.finally(() => setSavingSwap(false));
	};

	const swapRoomAssignments = (sourceKey, targetKey) => {
		if (!sourceKey || !targetKey || sourceKey === targetKey) return;
		const roomsList = Array.isArray(hotelRooms) ? hotelRooms : [];
		const sourceRoom = roomsList.find(
			(room) => String(getRoomIdentity(room)) === String(sourceKey),
		);
		const targetRoom = roomsList.find(
			(room) => String(getRoomIdentity(room)) === String(targetKey),
		);
		if (!sourceRoom || !targetRoom) return;
		if (
			sourceRoom.isCurrentlyHoused ||
			sourceRoom.isOccupied ||
			targetRoom.isCurrentlyHoused ||
			targetRoom.isOccupied
		) {
			toast.error(
				isArabic
					? "لا يمكن تبديل الغرف المشغولة أو المسكنة حاليا."
					: "Occupied or currently housed rooms cannot be swapped."
			);
			return;
		}

		const updatedSource = cloneAssignmentForRoom(targetRoom, sourceRoom);
		const updatedTarget = cloneAssignmentForRoom(sourceRoom, targetRoom);
		setHotelRooms(
			roomsList.map((room) => {
				const key = String(getRoomIdentity(room));
				if (key === String(sourceKey)) return updatedSource;
				if (key === String(targetKey)) return updatedTarget;
				return room;
			}),
		);
		persistSwappedRooms([updatedSource, updatedTarget]);
	};

	// Get room types count where count > 0
	const roomTypesCount = roomCountDetails.filter(
		(details) => details.count > 0,
	).length;

	return (
		<HotelOverviewWrapper dir={isArabic ? "rtl" : "ltr"}>
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
				chosenLanguage={chosenLanguage}
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
				chosenLanguage={chosenLanguage}
			/>

			<ZInheritRoomsModal
				inheritModalVisible={inheritModalVisible}
				setInheritModalVisible={setInheritModalVisible}
				baseFloor={baseFloor}
				setBaseFloor={setBaseFloor}
				applyInheritance={applyInheritance}
			/>

			<MapActionBar>
				{hotelRooms && hotelRooms.length > 0 ? (
					<button
						type='button'
						disabled={savingSwap}
						onClick={() => setInheritModalVisible(true)}
					>
						{labels.inherit}
					</button>
				) : null}
			</MapActionBar>

			<Legend className={roomTypesCount <= 7 ? "expanded" : ""}>
				{roomCountDetails
					.filter((details) => details.count > 0)
					.map((details, i) => (
						<LegendItem key={i}>
							<i style={{ backgroundColor: details.roomColor || "#ddd" }} />
							<span>
								{details.displayName ||
									details.roomType.replace(/([A-Z])/g, " $1").trim()}{" "}
								({details.count})
							</span>
						</LegendItem>
					))}
			</Legend>

			<FloorsContainer>
				{[...floors].reverse().map((floor, index) => {
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
						<Floor
							key={index}
							delay={index * 0.3}
							onClick={() => openFloorBuilder(floor)}
						>
							<FloorHeader>
								<h2>
									{labels.floor} {floor}
								</h2>
								<button
									type='button'
									onClick={(event) => {
										event.stopPropagation();
										openFloorBuilder(floor);
									}}
								>
									{labels.updateRooms}
								</button>
							</FloorHeader>
							<RoomGrid>
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
															<div>
																{labels.roomNumber}: {room.room_number}
															</div>
															<div style={{ textTransform: "capitalize" }}>
																{labels.displayName}: {roomInfo.displayName}
															</div>
															<div style={{ textTransform: "capitalize" }}>
																{labels.roomType}: {roomInfo.roomType || "N/A"}
															</div>
															<div>
																{labels.occupied}:{" "}
																{room.isOccupied ? labels.yes : labels.no}
															</div>
															<div>
																{labels.clean}:{" "}
																{room.cleanRoom ? labels.yes : labels.no}
															</div>
															<div>
																{labels.openHousing}:{" "}
																{room.active === false ? labels.no : labels.yes}
															</div>
															{room.isHandicapped ? (
																<div>{labels.handicapped}</div>
															) : null}
															{room.isVip ? <div>{labels.vip}</div> : null}
														</div>
													}
													key={idx}
													overlayStyle={{ zIndex: 100000000 }}
													color='white'
												>
													<RoomSquare
														key={idx}
														$color={roomInfo.color}
														draggable
														$isDragging={
															String(draggedRoomKey) ===
															String(getRoomIdentity(room))
														}
														$isDropTarget={
															String(dropTargetKey) ===
															String(getRoomIdentity(room))
														}
														onDragStart={(event) => {
															const roomKey = getRoomIdentity(room);
															setDraggedRoomKey(roomKey);
															event.dataTransfer.effectAllowed = "move";
															event.dataTransfer.setData(
																"text/plain",
																String(roomKey),
															);
														}}
														onDragEnter={(event) => {
															event.preventDefault();
															setDropTargetKey(getRoomIdentity(room));
														}}
														onDragOver={(event) => {
															event.preventDefault();
															event.dataTransfer.dropEffect = "move";
														}}
														onDragLeave={() => setDropTargetKey("")}
														onDrop={(event) => {
															event.preventDefault();
															const sourceKey =
																event.dataTransfer.getData("text/plain") ||
																draggedRoomKey;
															const targetKey = getRoomIdentity(room);
															setDraggedRoomKey("");
															setDropTargetKey("");
															swapRoomAssignments(sourceKey, targetKey);
														}}
														onDragEnd={() => {
															setDraggedRoomKey("");
															setDropTargetKey("");
														}}
														onClick={(event) => {
															event.stopPropagation();
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
							</RoomGrid>
							{roomsOnFloor.length > 0 && (
								<>
									<FloorFooter>
										{hideAddRooms ? null : (
											<button
												type='button'
												onClick={(event) => {
													event.stopPropagation();
													addRooms();
													setHideAddRooms(true);
												}}
											>
												{labels.addRooms}
											</button>
										)}

										{Number(currentAddingFloor) === Number(floor) && (
											<LoadingInline>
												<Spin />
												<p>
													{labels.addingRoom} #{currentAddingRoom}...
												</p>
											</LoadingInline>
										)}
									</FloorFooter>
								</>
							)}
						</Floor>
					);
				})}
				{parkingLot && <ParkingLot>{labels.parkingLot}</ParkingLot>}
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
`;

const FloorsContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
`;

const Floor = styled.div`
	padding: 1.25rem;
	background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
	border: 1px solid #d7e7f8;
	border-top: 2px solid #9ecdf8;
	border-radius: 16px;
	width: 100%;
	text-align: start;
	font-weight: bold;
	cursor: pointer;
	animation: ${fadeIn} 0.5s ease forwards;
	animation-delay: ${({ delay }) => delay}s;
	opacity: 0;
	font-size: 1.1rem;
	box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
`;

const ParkingLot = styled.div`
	padding: 1rem;
	background: #effaf2;
	border: 1px solid #bce8c5;
	border-radius: 14px;
	width: 100%;
	text-align: center;
	font-weight: bold;
	color: #0b7a39;
`;

const MapActionBar = styled.div`
	display: flex;
	justify-content: center;
	margin: 1rem 0;

	button {
		min-width: 220px;
		min-height: 42px;
		border: 1px solid #0b5fa8;
		border-radius: 999px;
		background: #0b5fa8;
		color: #fff;
		font-weight: 900;
		box-shadow: 0 14px 26px rgba(11, 95, 168, 0.18);
		cursor: pointer;
		transition: all 0.18s ease;
	}

	button:hover {
		transform: translateY(-1px);
		background: #1677ff;
	}

	button:disabled {
		opacity: 0.65;
		cursor: wait;
		transform: none;
	}
`;

const Legend = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 0.65rem;
	margin: 1rem auto 1.25rem;
	padding: 0.75rem;
	border: 1px solid #d7e7f8;
	border-radius: 16px;
	background: #ffffff;

	&.expanded {
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}
`;

const LegendItem = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 0.45rem;
	min-height: 38px;
	padding: 0.35rem 0.55rem;
	border: 1px solid #edf4fc;
	border-radius: 12px;
	background: #f8fbff;
	text-align: start;

	i {
		flex: 0 0 16px;
		width: 16px;
		height: 16px;
		border-radius: 5px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14);
	}

	span {
		min-width: 0;
		font-size: 0.78rem;
		font-weight: 900;
		color: #24364d;
		text-transform: capitalize;
		line-height: 1.25;
		white-space: normal;
		overflow-wrap: anywhere;
	}
`;

const FloorHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 1rem;

	h2 {
		margin: 0;
		color: #1f2937;
		font-size: 1.65rem;
		font-weight: 900;
	}

	button {
		border: 1px solid #bdd7f4;
		border-radius: 999px;
		background: #eef6ff;
		color: #0b5fa8;
		padding: 0.45rem 0.8rem;
		font-size: 0.78rem;
		font-weight: 900;
		cursor: pointer;
		transition: all 0.18s ease;
	}

	button:hover {
		background: #1677ff;
		color: #fff;
		border-color: #1677ff;
	}

	@media (max-width: 680px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const RoomGrid = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.45rem;
	min-height: 58px;
	padding: 0.65rem;
	border: 1px dashed #cfe1f5;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.78);
`;

const FloorFooter = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 1rem;
	flex-wrap: wrap;
	margin-top: 1rem;

	button {
		min-width: 150px;
		min-height: 38px;
		border: 1px solid #0b7a39;
		border-radius: 999px;
		background: #0b7a39;
		color: #fff;
		font-weight: 900;
		cursor: pointer;
		transition: all 0.18s ease;
	}

	button:hover {
		transform: translateY(-1px);
		box-shadow: 0 10px 20px rgba(11, 122, 57, 0.16);
	}
`;

const LoadingInline = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	color: #38506d;

	p {
		margin: 0;
		font-size: 0.86rem;
		font-weight: 900;
	}
`;

const RoomSquare = styled.div`
	width: 40px;
	height: 40px;
	background-color: ${({ $color }) => $color || "#ddd"};
	border: 2px solid
		${({ $isDropTarget }) => ($isDropTarget ? "#1677ff" : "rgba(0,0,0,0.24)")};
	color: white;
	margin: 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.76rem;
	font-weight: 900;
	cursor: grab;
	border-radius: 10px;
	box-shadow: ${({ $isDropTarget }) =>
		$isDropTarget
			? "0 0 0 4px rgba(22, 119, 255, 0.18), 0 14px 28px rgba(15, 23, 42, 0.2)"
			: "0 8px 18px rgba(15, 23, 42, 0.16)"};
	opacity: ${({ $isDragging }) => ($isDragging ? 0.45 : 1)};
	transform: ${({ $isDropTarget }) =>
		$isDropTarget ? "translateY(-3px) scale(1.08)" : "translateY(0)"};
	transition:
		transform 0.18s ease,
		box-shadow 0.18s ease,
		opacity 0.18s ease,
		background-color 0.3s ease-in-out,
		color 0.3s ease-in-out;

	&:active {
		cursor: grabbing;
	}

	&:hover {
		transform: translateY(-2px) scale(1.05);
	}
`;
