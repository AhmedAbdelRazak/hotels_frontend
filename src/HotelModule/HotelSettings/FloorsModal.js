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
const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
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
	chosenLanguage,
}) => {
	const { user } = isAuthenticated();
	const isArabic = chosenLanguage === "Arabic";
	const labels = {
		title: isArabic ? `بناء غرف الطابق ${clickedFloor}` : `Floor ${clickedFloor} Rooms Builder`,
		subtitle: isArabic
			? "حدد عدد الغرف لكل نوع، ثم أنشئ الخريطة لهذا الطابق."
			: "Set the number of rooms per type, then generate this floor map.",
		countTitle: isArabic
			? `أنواع وعدد الغرف في الطابق ${clickedFloor}`
			: `Room Types & Count In Floor #${clickedFloor}`,
		total: isArabic ? "الإجمالي" : "Total",
		roomsInFloor: isArabic ? `غرفة في الطابق ${clickedFloor}` : `Rooms In Floor #${clickedFloor}`,
		generate: isArabic
			? `إنشاء غرف الطابق ${clickedFloor}`
			: `Generate Floor #${clickedFloor} Rooms`,
		close: isArabic ? "إغلاق" : "Close",
		maxError: (count, name) =>
			isArabic
				? `لا يمكن إضافة أكثر من ${count} غرفة من ${name}.`
				: `Cannot add more than ${count} rooms for ${name}.`,
		generated: isArabic
			? "تم تحديث خريطة الطابق. راجع الغرف ثم احفظ إعدادات الفندق."
			: "Floor map updated. Review the rooms, then save hotel settings.",
	};

	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};

	const userId =
		(Number(user?.role) === 2000 && !user?.belongsToId
			? normalizeId(user?._id)
			: "") ||
		normalizeId(selectedHotel.belongsTo) ||
		normalizeId(user?.belongsToId) ||
		normalizeId(user?._id);
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

	const totalRooms = getRoomCountTotal(floorDetails?.roomCountDetails || {});
	const activeRoomDetails = Array.isArray(hotelDetails?.roomCountDetails)
		? hotelDetails.roomCountDetails.filter((details) => details.count > 0)
		: [];
	const existingRooms = Array.isArray(rooms) ? rooms : [];

	const handleRoomCountChange = (key, value) => {
		const newRoomCount = Number(value);

		const roomDetails = roomDetailsByKey.get(key);
		const maxRoomCount = roomDetails?.count || 0;

		if (newRoomCount > maxRoomCount) {
			toast.error(
				labels.maxError(maxRoomCount, roomDetails?.displayName || key)
			);
			return;
		}

		setFloorDetails((prevDetails) => ({
			...prevDetails,
			roomCountDetails: {
				...(prevDetails.roomCountDetails || {}),
				[key]: newRoomCount,
			},
		}));
	};

	const populateAllRooms = () => {
		const newRoomsForCurrentFloor = [];
		const roomTypes = Object.keys(floorDetails.roomCountDetails || {});

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

		const updatedRooms = existingRooms.filter(
			(room) => room.floor !== clickedFloor
		);
		setRooms([...updatedRooms, ...newRoomsForCurrentFloor]);
		toast.success(labels.generated);
	};

	const mainForm = () => {
		const roomTypesCount = activeRoomDetails.length;

		return (
			<BuilderContent>
				<div className='builder-copy'>
					<h3>{labels.countTitle}</h3>
					<p>{labels.subtitle}</p>
				</div>
				<div className={`rooms-grid ${roomTypesCount <= 6 ? "centered-grid" : ""}`}>
					{activeRoomDetails.map((details, i) => {
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
									value={(floorDetails.roomCountDetails || {})[key] || 0}
									handleFloorRoomsCount={handleRoomCountChange}
									keyValue={key}
									numRoomTypes={roomTypesCount}
									chosenLanguage={chosenLanguage}
								/>
							);
						})}
					<TotalRooms>
						<span>{labels.total}</span>
						<strong>{totalRooms ? totalRooms : 0}</strong>
						<small>{labels.roomsInFloor}</small>
					</TotalRooms>
				</div>
				<div className='generate-button'>
					<button type='button' onClick={populateAllRooms}>
						{labels.generate}
					</button>
				</div>
			</BuilderContent>
		);
	};

	return (
		<FloorsModalWrapper>
			<Modal
				width='70%'
				title={<div className='modal-title'>{labels.title}</div>}
				open={modalVisible}
				onOk={() => {
					setModalVisible(false);
				}}
				okText={labels.close}
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
`;

const BuilderContent = styled.div`
	display: grid;
	gap: 1rem;
	text-align: center;

	.builder-copy {
		display: grid;
		gap: 0.25rem;
	}

	h3 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 900;
		color: #102033;
	}

	p {
		margin: 0;
		color: #62748a;
		font-size: 0.84rem;
		font-weight: 700;
	}

	.rooms-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 0.75rem;
		align-items: stretch;
	}

	.centered-grid {
		justify-content: center;
	}

	.generate-button {
		display: flex;
		justify-content: center;
	}

	.generate-button button {
		min-width: 240px;
		min-height: 42px;
		border: 0;
		border-radius: 999px;
		background: #1677ff;
		color: #fff;
		font-weight: 900;
		box-shadow: 0 14px 28px rgba(22, 119, 255, 0.2);
		cursor: pointer;
		transition: all 0.18s ease;
	}

	.generate-button button:hover {
		transform: translateY(-1px);
		background: #0b5fa8;
	}
`;

const TotalRooms = styled.div`
	display: grid;
	align-content: center;
	gap: 0.15rem;
	min-height: 88px;
	padding: 0.8rem;
	border: 1px solid #cfe1f5;
	border-radius: 14px;
	background: #f8fbff;

	span,
	small {
		color: #62748a;
		font-size: 0.76rem;
		font-weight: 900;
	}

	strong {
		color: #0b5fa8;
		font-size: 1.45rem;
		font-weight: 900;
	}
`;
