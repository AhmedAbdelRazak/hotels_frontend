import React, { useEffect, useMemo } from "react";
import styled from "styled-components";
import { Modal } from "antd";
import ZInputFieldRoomsPFloor from "./ZInputFieldRoomsPFloor";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";

const normalizeDisplayName = (value) =>
	String(value || "").trim().toLowerCase();
const getRoomDisplayKey = (displayName, roomType) => {
	const displayKey = normalizeDisplayName(displayName);
	if (displayKey) return displayKey;
	return normalizeDisplayName(roomType);
};

const FloorsModal = ({
	modalVisible,
	setModalVisible,
	clickedFloor,
	floorDetails,
	setFloorDetails,
	hotelDetails,
	rooms,
	setRooms,
	values,
}) => {
	const { user } = isAuthenticated();

	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};

	const userId = user.role === 2000 ? user._id : selectedHotel.belongsTo._id;
	const roomDetailsByKey = useMemo(() => {
		const map = new Map();
		const details = Array.isArray(hotelDetails?.roomCountDetails)
			? hotelDetails.roomCountDetails
			: [];
		details.forEach((detail) => {
			const key = getRoomDisplayKey(detail.displayName, detail.roomType);
			if (!key) return;
			map.set(key, detail);
		});
		return map;
	}, [hotelDetails?.roomCountDetails]);
	// Prepopulate the floorDetails based on existing rooms data
	useEffect(() => {
		if (rooms && rooms.length > 0) {
			const newFloorDetails = { ...floorDetails, roomCountDetails: {} };

			rooms.forEach((room) => {
				if (room.floor === clickedFloor) {
					const key = getRoomDisplayKey(room.display_name, room.room_type);
					if (newFloorDetails.roomCountDetails[key]) {
						newFloorDetails.roomCountDetails[key] += 1;
					} else {
						newFloorDetails.roomCountDetails[key] = 1;
					}
				}
			});

			setFloorDetails(newFloorDetails);
		}
		// eslint-disable-next-line
	}, [rooms, clickedFloor, setFloorDetails]);

	const getRoomCountTotal = (roomCountDetails) => {
		return Object.values(roomCountDetails).reduce((total, count) => {
			const numericCount = Number(count);
			if (isNaN(numericCount)) {
				console.warn(`Invalid count value: ${count}`);
				return total;
			}
			return total + numericCount;
		}, 0);
	};

	const totalRooms = getRoomCountTotal(floorDetails.roomCountDetails);

	const handleRoomCountChange = (key, value) => {
		const newRoomCount = Number(value);

		const roomDetails = roomDetailsByKey.get(key);
		const maxRoomCount = roomDetails?.count || 0;

		if (newRoomCount > maxRoomCount) {
			toast.error(
				`Cannot add more than ${maxRoomCount} rooms for ${
					roomDetails?.displayName || key
				}.`
			);
			return;
		}

		setFloorDetails((prevDetails) => ({
			...prevDetails,
			roomCountDetails: {
				...prevDetails.roomCountDetails,
				[key]: newRoomCount,
			},
		}));
	};

	const populateAllRooms = () => {
		const newRoomsForCurrentFloor = [];
		const roomTypes = Object.keys(floorDetails.roomCountDetails);

		let currentRoomNumber = 1;

		roomTypes.forEach((key) => {
			const count = floorDetails.roomCountDetails[key];
			const roomDetails = roomDetailsByKey.get(key);

			if (!roomDetails) return;

			const roomColor = roomDetails.roomColor || "#000";
			const amenities = roomDetails.amenities || [];

			for (let i = 0; i < count; i++) {
				const roomNumber = `${clickedFloor}${String(currentRoomNumber).padStart(
					2,
					"0"
				)}`;

				const newRoom = {
					room_number: roomNumber,
					room_type: roomDetails.roomType,
					display_name: roomDetails.displayName || roomNumber,
					room_features: amenities,
					roomColorCode: roomColor,
					floor: clickedFloor,
					hotelId: hotelDetails._id,
					belongsTo: userId,
					isHandicapped: !!roomDetails.isHandicapped,
					isVip: !!roomDetails.isVip,
					active: true,
				};

				if (roomDetails.roomType === "individualBed") {
					newRoom.individualBeds = true;
					newRoom.bedsNumber = Array.from(
						{ length: roomDetails.count },
						(_, i) => `${roomNumber}${String.fromCharCode(97 + i)}`
					);
				}

				newRoomsForCurrentFloor.push(newRoom);
				currentRoomNumber++;
			}
		});

		const updatedRooms = rooms.filter((room) => room.floor !== clickedFloor);
		setRooms([...updatedRooms, ...newRoomsForCurrentFloor]);
	};

	const mainForm = () => {
		const roomTypesCount = hotelDetails.roomCountDetails.filter(
			(details) => details.count > 0
		).length;

		return (
			<div className='mx-auto text-center'>
				<h3 className='form-title'>
					Room Types & Count In Floor #{clickedFloor}
				</h3>
				<div className={`row ${roomTypesCount <= 6 ? "centered-grid" : ""}`}>
					{hotelDetails.roomCountDetails
						.filter((details) => details.count > 0)
						.map((details, i) => {
							const key = getRoomDisplayKey(
								details.displayName,
								details.roomType
							);
							return (
								<ZInputFieldRoomsPFloor
									key={i}
									Title={
										details.displayName ||
										details.roomType.replace(/([A-Z])/g, " $1").trim()
									}
									value={floorDetails.roomCountDetails[key] || 0}
									handleFloorRoomsCount={handleRoomCountChange}
									keyValue={key}
									numRoomTypes={roomTypesCount}
								/>
							);
						})}
					<div className='col-md-2 my-auto total-rooms'>
						<h5>
							Total: {totalRooms ? totalRooms : 0} Rooms In Floor #
							{clickedFloor}
						</h5>
					</div>
				</div>
				<div className='generate-button'>
					<button className='btn btn-primary' onClick={populateAllRooms}>
						Generate Floor #{clickedFloor} Rooms
					</button>
				</div>
			</div>
		);
	};

	return (
		<FloorsModalWrapper>
			<Modal
				width='70%'
				title={
					<div className='modal-title'>{`Floor ${clickedFloor} Rooms Builder`}</div>
				}
				open={modalVisible}
				onOk={() => {
					setModalVisible(false);
				}}
				cancelButtonProps={{ style: { display: "none" } }}
				onCancel={() => {
					setModalVisible(false);
				}}
			>
				{mainForm()}
			</Modal>
		</FloorsModalWrapper>
	);
};

export default FloorsModal;

// Styled components for FloorsModal
const FloorsModalWrapper = styled.div`
	z-index: 18000 !important;
	.form-container {
		margin: 0 auto;
		text-align: center;
	}
	.form-title {
		font-size: 1.3rem;
		text-decoration: underline;
		font-weight: bold;
		margin-bottom: 20px;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 20px;
	}
	/* Center the input fields if there are fewer than or equal to 6 room types */
	.centered-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 20px;
	}
	.total-rooms {
		font-weight: bold;
		font-size: 1.2rem;
		margin-top: 10px;
	}
	.generate-button {
		margin-top: 20px;
	}
`;
