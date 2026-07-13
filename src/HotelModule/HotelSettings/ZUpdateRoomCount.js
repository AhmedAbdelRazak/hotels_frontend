import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import ZUpdateHotelDetailsForm2 from "./ZUpdateHotelDetailsForm2";

const ZUpdateRoomCount = ({
	values,
	hotelDetails,
	setHotelDetails,
	chosenLanguage,
	roomTypes,
	amenitiesList,
	currentStep,
	setCurrentStep,
	setSelectedRoomType,
	selectedRoomType,
	submittingHotelDetails,
	roomTypeSelected,
	setRoomTypeSelected,
	fromPage,
	viewsList,
	extraAmenitiesList,
}) => {
	const [roomDetails, setRoomDetails] = useState(null);
	const [photos, setPhotos] = useState([]);
	const [saving, setSaving] = useState(false);
	const isArabic = chosenLanguage === "Arabic";
	const labels = {
		title: isArabic ? "أنواع الغرف" : "Room Types",
		choose: isArabic ? "الرجاء اختيار غرفة للتحديث" : "Choose a room to update",
		save: isArabic ? "حفظ كل تغييرات الغرف" : "Save All Room Changes",
		saving: isArabic ? "جاري الحفظ..." : "Saving...",
		countLabel: (count) =>
			isArabic ? `${count || 0} غرفة` : `${count || 0} rooms`,
	};

	const roomCountDetails = useMemo(
		() => hotelDetails.roomCountDetails || [],
		[hotelDetails.roomCountDetails]
	);

	const handleRoomClick = (roomId) => {
		setSelectedRoomType(roomId);
		setCurrentStep(1);
	};

	const handleSaveAll = () => {
		setSaving(true);
		const result = submittingHotelDetails(fromPage);
		if (result && typeof result.finally === "function") {
			result.finally(() => setSaving(false));
			return;
		}
		setTimeout(() => setSaving(false), 1200);
	};

	useEffect(() => {
		const selectedRoom = roomCountDetails.find(
			(room) => room._id === selectedRoomType
		);

		setRoomDetails(selectedRoom);
		setPhotos(selectedRoom ? selectedRoom.photos : []);
	}, [selectedRoomType, roomCountDetails]);

	return (
		<ZUpdateRoomCountWrapper dir={isArabic ? "rtl" : "ltr"}>
			<RoomsListWrapper isArabic={isArabic}>
				<SidebarTitle>{labels.title}</SidebarTitle>
				{roomCountDetails.map((room) => (
					<RoomItem
						key={room._id}
						onClick={() => handleRoomClick(room._id)}
						isActive={room._id === selectedRoomType}
					>
						<strong>
							{room.displayName
								? room.displayName
								: room.roomType
								  ? room.roomType.replace(/([A-Z])/g, " $1").trim()
								  : "Unknown Room Type"}
						</strong>
						<span>{labels.countLabel(room.count)}</span>
					</RoomItem>
				))}
			</RoomsListWrapper>
			<RoomDetailsWrapper isArabic={isArabic}>
				<StickySaveDock $isArabic={isArabic}>
					<button type='button' disabled={saving} onClick={handleSaveAll}>
						{saving ? labels.saving : labels.save}
					</button>
				</StickySaveDock>
				<div className='details-content'>
					{roomDetails ? (
						<ZUpdateHotelDetailsForm2
							key={roomDetails?._id || selectedRoomType}
							existingRoomDetails={roomDetails}
							hotelDetails={hotelDetails}
							setHotelDetails={setHotelDetails}
							chosenLanguage={chosenLanguage}
							roomTypes={roomTypes}
							amenitiesList={amenitiesList}
							currentStep={currentStep}
							setCurrentStep={setCurrentStep}
							selectedRoomType={selectedRoomType}
							setSelectedRoomType={setSelectedRoomType}
							roomTypeSelected={roomTypeSelected}
							setRoomTypeSelected={setRoomTypeSelected}
							submittingHotelDetails={submittingHotelDetails}
							fromPage={fromPage}
							photos={photos}
							setPhotos={setPhotos}
							viewsList={viewsList}
							extraAmenitiesList={extraAmenitiesList}
						/>
					) : (
						<EmptySelection>{labels.choose}</EmptySelection>
					)}
				</div>
			</RoomDetailsWrapper>
		</ZUpdateRoomCountWrapper>
	);
};

export default ZUpdateRoomCount;

const ZUpdateRoomCountWrapper = styled.div`
	display: flex;
	width: 100%;
	min-height: 640px;
	gap: 1rem;

	@media (max-width: 980px) {
		flex-direction: column;
	}
`;

const RoomsListWrapper = styled.div`
	width: 18%;
	min-width: 210px;
	border: 1px solid #d8e9fb;
	border-radius: 16px;
	padding: 12px;
	overflow-y: auto;
	font-size: 13.5px;
	text-transform: capitalize;
	background: #f8fbff;
	box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);

	@media (max-width: 980px) {
		width: 100%;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	}
`;

const SidebarTitle = styled.div`
	grid-column: 1 / -1;
	padding: 0.6rem 0.7rem;
	color: #0b5fa8;
	font-weight: 900;
	text-align: center;
`;

const RoomItem = styled.button`
	width: 100%;
	display: grid;
	gap: 0.35rem;
	padding: 0.85rem 0.75rem;
	margin: 0.4rem 0;
	background: ${({ isActive }) =>
		isActive ? "linear-gradient(135deg, #1677ff, #0b5fa8)" : "#ffffff"};
	color: ${({ isActive }) => (isActive ? "#fff" : "#172033")};
	border: 1px solid ${({ isActive }) => (isActive ? "#1677ff" : "#cfe1f5")};
	border-radius: 12px;
	cursor: pointer;
	text-align: center;
	font-weight: bold;
	transition: all 0.18s ease;

	strong {
		font-size: 0.86rem;
		line-height: 1.35;
		white-space: normal;
		overflow-wrap: anywhere;
	}

	span {
		font-size: 0.73rem;
		opacity: 0.82;
		line-height: 1.2;
	}

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 10px 22px rgba(22, 119, 255, 0.13);
	}
`;

const RoomDetailsWrapper = styled.div`
	width: 82%;
	min-width: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 1rem;

	.details-content {
		flex-grow: 1;
		min-width: 0;
	}

	@media (max-width: 980px) {
		width: 100%;
	}
`;

const StickySaveDock = styled.div`
	position: fixed;
	top: 86px;
	${({ $isArabic }) => ($isArabic ? "left: 24px;" : "right: 24px;")}
	z-index: 1200;
	display: flex;
	justify-content: center;
	direction: ltr;
	width: auto;
	max-width: calc(100vw - 48px);
	margin: 0;
	padding: 4px;
	border: 1px solid rgba(207, 225, 245, 0.86);
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.9);
	backdrop-filter: blur(8px);
	box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
	pointer-events: none;

	button {
		pointer-events: auto;
		min-width: 205px;
		min-height: 40px;
		border: 0;
		border-radius: 999px;
		background: #0b7a39;
		color: #fff;
		font-weight: 900;
		box-shadow: 0 12px 24px rgba(11, 122, 57, 0.22);
		cursor: pointer;
		transition:
			transform 0.18s ease,
			box-shadow 0.18s ease,
			opacity 0.18s ease;
	}

	button:hover {
		transform: translateY(-1px);
		box-shadow: 0 16px 30px rgba(11, 122, 57, 0.26);
	}

	button:focus-visible {
		outline: 3px solid rgba(22, 119, 255, 0.28);
		outline-offset: 3px;
	}

	button:disabled {
		opacity: 0.68;
		cursor: wait;
		transform: none;
	}

	@media (max-width: 760px) {
		top: auto;
		left: 12px;
		right: 12px;
		bottom: 16px;
		max-width: none;

		button {
			width: 100%;
			min-width: 0;
		}
	}
`;

const EmptySelection = styled.p`
	display: grid;
	place-items: center;
	min-height: 360px;
	margin: 0;
	border: 1px dashed #bdd7f4;
	border-radius: 16px;
	background: #f8fbff;
	color: #38506d;
	font-size: 1.05rem;
	font-weight: 900;
`;
