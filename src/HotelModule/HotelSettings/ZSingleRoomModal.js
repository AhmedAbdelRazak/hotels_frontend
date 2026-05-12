import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Button, Modal } from "antd";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import { deleteSingleRoom, updateSingleRoom } from "../apiAdmin";
import {
	roomTypeColors,
	BedSizes,
	Views,
} from "../../AdminModule/NewHotels/Assets";

const ZSingleRoomModal = ({
	modalVisible,
	setModalVisible,
	clickedRoom,
	setClickedRoom,
	clickedFloor,
	rooms,
	setRooms,
	hotelDetails,
	setHelperRender,
	helperRender,
	chosenLanguage,
}) => {
	const { user, token } = isAuthenticated();
	const [bedCount, setBedCount] = useState(clickedRoom?.bedsNumber?.length || 0);
	const [isRemoving, setIsRemoving] = useState(false);
	const isArabic = chosenLanguage === "Arabic";
	const labels = {
		editRoom: isArabic ? "تعديل الغرفة" : "Edit Room",
		floor: isArabic ? "الطابق" : "Floor",
		displayName: isArabic ? "اسم العرض" : "Display Name",
		roomType: isArabic ? "نوع الغرفة" : "Room Type",
		select: isArabic ? "الرجاء الاختيار" : "Please Select",
		bedsCount: isArabic ? "كم عدد الأسرة؟" : "How many beds?",
		bedSize: isArabic ? "حجم السرير" : "Bed Size",
		roomView: isArabic ? "إطلالة الغرفة" : "Room View",
		smoking: isArabic ? "التدخين" : "Smoking",
		smokingAllowed: isArabic ? "مسموح بالتدخين" : "For Smokers",
		noSmoking: isArabic ? "ممنوع التدخين" : "No Smoking",
		accessible: isArabic ? "غرفة لذوي الاحتياجات" : "Accessible Room",
		vip: isArabic ? "غرفة VIP" : "VIP Room",
		openHousing: isArabic ? "متاحة للتسكين" : "Open for Housing",
		remove: isArabic ? "حذف الغرفة" : "Remove Room",
		update: isArabic ? "تحديث الغرفة" : "Update Room",
		apply: isArabic ? "تطبيق التغييرات" : "Apply Changes",
		cannotRemove: (roomNumber) =>
			isArabic
				? `الغرفة رقم ${roomNumber} مستخدمة حاليا ولا يمكن حذفها.`
				: `Room #${roomNumber} is currently in use and cannot be removed.`,
		confirmRemove: (roomNumber) =>
			isArabic
				? `هل تريد حذف الغرفة رقم ${roomNumber} من خريطة هذا الطابق؟`
				: `Remove room #${roomNumber} from this floor map?`,
		removed: (roomNumber) =>
			isArabic
				? `تم حذف الغرفة رقم ${roomNumber}.`
				: `Room #${roomNumber} was removed.`,
		updated: (roomNumber) =>
			isArabic
				? `تم تحديث الغرفة رقم ${roomNumber} بنجاح.`
				: `Room #${roomNumber} Was Successfully Updated`,
		updateError: isArabic ? "تعذر تحديث الغرفة." : "Could not update the room.",
	};

	useEffect(() => {
		if (clickedRoom?.room_type === "individualBed" && clickedRoom?.bedsNumber) {
			setBedCount(clickedRoom.bedsNumber.length);
		}
	}, [clickedRoom]);

	const normalizeDisplayName = (value) =>
		String(value || "").trim().toLowerCase();
	const getDisplayKey = (displayName, roomType) => {
		const key = normalizeDisplayName(displayName);
		return key || normalizeDisplayName(roomType);
	};
	const roomDetails = Array.isArray(hotelDetails?.roomCountDetails)
		? hotelDetails.roomCountDetails.filter((detail) => detail.count > 0)
		: [];
	const roomDisplayOptions = roomDetails.map((detail) => ({
		key: getDisplayKey(detail.displayName, detail.roomType),
		displayName:
			detail.displayName || detail.roomType.replace(/([A-Z])/g, " $1").trim(),
		roomType: detail.roomType,
		roomColor: detail.roomColor || roomTypeColors[detail.roomType] || "#000",
	}));
	const selectedDisplayKey = getDisplayKey(
		clickedRoom?.display_name ||
			roomDetails.find((detail) => detail.roomType === clickedRoom?.room_type)
				?.displayName,
		clickedRoom?.room_type
	);

	const updatingSingleRoom = () => {
		if (!clickedRoom?._id) return;
		const roomToUpdate = { ...clickedRoom };
		// Update the bedsNumber array and individualBeds flag if the room type is individualBed
		if (roomToUpdate.room_type === "individualBed") {
			const bedsNumber = Array.from(
				{ length: bedCount },
				(_, i) => `${roomToUpdate.room_number}${String.fromCharCode(97 + i)}`
			);
			roomToUpdate.bedsNumber = bedsNumber;
			roomToUpdate.individualBeds = true;
		}

		updateSingleRoom(roomToUpdate._id, user._id, token, roomToUpdate)
			.then((data) => {
				if (data && data.error) {
					toast.error(data.error || labels.updateError);
				} else {
					const savedRoom = data && !data.error ? data : roomToUpdate;
					setRooms(
						(Array.isArray(rooms) ? rooms : []).map((room) =>
							String(room._id || `${room.floor}-${room.room_number}`) ===
							String(roomToUpdate._id)
								? { ...room, ...savedRoom }
								: room
						)
					);
					toast.success(labels.updated(roomToUpdate.room_number));
					setTimeout(() => {
						setModalVisible(false);
						setClickedRoom("");
					}, 1000);
				}
			})
			.catch((error) => {
				console.error("Error occurred:", error);
				toast.error(labels.updateError);
			});
	};

	const updateRoomState = () => {
		if (!clickedRoom) return;
		// Close the modal
		setModalVisible(false);

		// Check if clickedRoom has an _id, if not use the combination of room_number and floor
		const roomIdentifier = clickedRoom._id
			? clickedRoom._id
			: `${clickedRoom.floor}-${clickedRoom.room_number}`;

		// Map over the rooms and update the state for the matching room
		const updatedRooms = rooms.map((room) => {
			const currentRoomIdentifier = room._id
				? room._id
				: `${room.floor}-${room.room_number}`;
			if (currentRoomIdentifier === roomIdentifier) {
				return { ...room, ...clickedRoom }; // Spread the existing room and overwrite with clickedRoom
			}
			return room; // Return the room unchanged if it doesn't match
		});

		// Update the rooms state with the new array
		setRooms(updatedRooms);

		setClickedRoom("");

		// Optionally, if you need to trigger some re-render or additional effects
		// after updating the rooms, you can call setHelperRender or other state setters here.
	};

	const removeRoomFromState = () => {
		if (!clickedRoom) return;
		const roomIdentifier = clickedRoom._id
			? clickedRoom._id
			: `${clickedRoom.floor}-${clickedRoom.room_number}`;
		setRooms(
			rooms.filter((room) => {
				const currentRoomIdentifier = room._id
					? room._id
					: `${room.floor}-${room.room_number}`;
				return currentRoomIdentifier !== roomIdentifier;
			})
		);
		setClickedRoom("");
		setModalVisible(false);
	};

	const removeClickedRoom = () => {
		if (!clickedRoom) return;
		if (clickedRoom.isCurrentlyHoused || clickedRoom.isOccupied) {
			toast.error(labels.cannotRemove(clickedRoom.room_number));
			return;
		}
		const confirmed = window.confirm(labels.confirmRemove(clickedRoom.room_number));
		if (!confirmed) return;

		if (!clickedRoom._id) {
			removeRoomFromState();
			toast.success(labels.removed(clickedRoom.room_number));
			return;
		}

		setIsRemoving(true);
		deleteSingleRoom(clickedRoom._id, user._id, token)
			.then((data) => {
				if (data?.error) {
					toast.error(data.error);
					return;
				}
				removeRoomFromState();
				toast.success(labels.removed(clickedRoom.room_number));
			})
			.catch(() => toast.error(labels.updateError))
			.finally(() => setIsRemoving(false));
	};

	const handleBedCountChange = (e) => {
		if (!clickedRoom) return;
		const count = parseInt(e.target.value, 10);
		setBedCount(count);
		const bedsNumber = Array.from(
			{ length: count },
			(_, i) => `${clickedRoom.room_number}${String.fromCharCode(97 + i)}`
		);
		setClickedRoom({
			...clickedRoom,
			bedsNumber,
			individualBeds: true,
		});
	};

	const mainForm = () => {
		if (!clickedRoom) return null;
		return (
			<InputFieldStylingWrapper className='mx-auto text-center'>
				<h3
					style={{
						fontSize: "1.1rem",
						textDecoration: "underline",
						textAlign: "left",
						fontWeight: "bold",
					}}
				>
					{labels.editRoom} #{clickedRoom.room_number} {labels.floor} #
					{clickedFloor}
				</h3>

				<div className='row'>
					<div className='col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='name'
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
							}}
						>
							{labels.displayName}
						</label>
						<select
							style={{ textTransform: "capitalize" }}
							value={selectedDisplayKey}
							onChange={(e) => {
								const newKey = e.target.value;
								const matchedDetail = roomDetails.find(
									(detail) =>
										getDisplayKey(detail.displayName, detail.roomType) === newKey
								);
								const newRoomType =
									matchedDetail?.roomType || clickedRoom.room_type;
								const newColorCode =
									matchedDetail?.roomColor ||
									clickedRoom.roomColorCode ||
									(!matchedDetail && roomTypeColors[newRoomType]) ||
									"#000";
								setClickedRoom({
									...clickedRoom,
									display_name: matchedDetail?.displayName || clickedRoom.display_name,
									room_type: newRoomType,
									roomColorCode: newColorCode,
								});
							}}
						>
							<option value=''>{labels.select}</option>
							{roomDisplayOptions.map((option, i) => (
								<option key={i} value={option.key}>
									{option.displayName}
								</option>
							))}
						</select>
						<div style={{ fontSize: "11px", marginTop: "6px" }}>
							{labels.roomType}:{" "}
							<span style={{ textTransform: "capitalize" }}>
								{clickedRoom.room_type || "N/A"}
							</span>
						</div>
					</div>

					{clickedRoom && clickedRoom.room_type === "individualBed" && (
						<div className='col-md-2 form-group' style={{ marginTop: "10px" }}>
							<label
								htmlFor='bedsNumber'
								style={{
									fontWeight: "bold",
									fontSize: "11px",
									textAlign: "center",
								}}
							>
								{labels.bedsCount}
							</label>
							<input
								type='number'
								min='1'
								value={bedCount}
								onChange={handleBedCountChange}
							/>
						</div>
					)}

					<div className='col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='bedSize'
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
							}}
						>
							{labels.bedSize}
						</label>
						<select
							style={{ textTransform: "capitalize" }}
							value={clickedRoom.room_features?.bedSize || ""}
							onChange={(e) => {
								setClickedRoom({
									...clickedRoom,
									room_features: {
										...clickedRoom.room_features,
										bedSize: e.target.value,
									},
								});
							}}
						>
							<option value=''>{labels.select}</option>
							{BedSizes.map((b, i) => (
								<option key={i} value={b}>
									{b}
								</option>
							))}
						</select>
					</div>

					<div className='col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='view'
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
							}}
						>
							{labels.roomView}
						</label>
						<select
							style={{ textTransform: "capitalize" }}
							value={clickedRoom.room_features?.view || ""}
							onChange={(e) => {
								setClickedRoom({
									...clickedRoom,
									room_features: {
										...clickedRoom.room_features,
										view: e.target.value,
									},
								});
							}}
						>
							<option value=''>{labels.select}</option>
							{Views.map((b, i) => (
								<option key={i} value={b}>
									{b}
								</option>
							))}
						</select>
					</div>

					<div className='col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='smoking'
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
							}}
						>
							{labels.smoking}
						</label>
						<select
							style={{ textTransform: "capitalize" }}
							value={clickedRoom.room_features?.smoking}
							onChange={(e) => {
								const smokingValue = e.target.value === "true";
								setClickedRoom({
									...clickedRoom,
									room_features: {
										...clickedRoom.room_features,
										smoking: smokingValue,
									},
								});
							}}
						>
							<option value={true}>{labels.smokingAllowed}</option>
							<option value={false}>{labels.noSmoking}</option>
						</select>
					</div>
				</div>

				<div className='row'>
					<div className='col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='isHandicapped'
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
								display: "block",
							}}
						>
							{labels.accessible}
						</label>
						<input
							id='isHandicapped'
							type='checkbox'
							checked={!!clickedRoom.isHandicapped}
							onChange={(e) =>
								setClickedRoom({
									...clickedRoom,
									isHandicapped: e.target.checked,
								})
							}
							style={{ width: "auto", margin: "6px auto 0" }}
						/>
					</div>
					<div className='col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='isVip'
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
								display: "block",
							}}
						>
							{labels.vip}
						</label>
						<input
							id='isVip'
							type='checkbox'
							checked={!!clickedRoom.isVip}
							onChange={(e) =>
								setClickedRoom({
									...clickedRoom,
									isVip: e.target.checked,
								})
							}
							style={{ width: "auto", margin: "6px auto 0" }}
						/>
					</div>
					<div className='col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='active'
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
								display: "block",
							}}
						>
							{labels.openHousing}
						</label>
						<input
							id='active'
							type='checkbox'
							checked={clickedRoom.active !== false}
							onChange={(e) =>
								setClickedRoom({
									...clickedRoom,
									active: e.target.checked,
								})
							}
							style={{ width: "auto", margin: "6px auto 0" }}
						/>
					</div>
				</div>

				<ModalActions>
					<Button danger loading={isRemoving} onClick={removeClickedRoom}>
						{labels.remove} #{clickedRoom.room_number}
					</Button>
					{clickedRoom && clickedRoom._id ? (
						<Button type='primary' onClick={updatingSingleRoom}>
							{labels.update} #{clickedRoom.room_number}
						</Button>
					) : (
						<Button type='primary' onClick={updateRoomState}>
							{labels.apply}
						</Button>
					)}
				</ModalActions>
			</InputFieldStylingWrapper>
		);
	};

	return (
		<ZSingleRoomModalWrapper>
			<Modal
				width='70%'
				title={
					<div
						style={{
							textAlign: "center",
							fontWeight: "bold",
							fontSize: "1.3rem",
						}}
					>
						{labels.editRoom} #{clickedRoom?.room_number || ""}
					</div>
				}
				open={modalVisible}
				footer={null}
				onCancel={() => {
					setModalVisible(false);
				}}
			>
				{mainForm()}
			</Modal>
		</ZSingleRoomModalWrapper>
	);
};

export default ZSingleRoomModal;

const ZSingleRoomModalWrapper = styled.div`
	z-index: 18000 !important;
`;

const ModalActions = styled.div`
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 0.75rem;
	margin-top: 1rem;
`;

const InputFieldStylingWrapper = styled.div`
	input[type="text"],
	input[type="email"],
	input[type="password"],
	input[type="date"],
	input[type="number"],
	select,
	textarea {
		display: block;
		width: 100%;
		padding: 0.5rem;
		font-size: 1rem;
		border: 1px solid #ccc;
	}
	input[type="text"]:focus,
	input[type="email"]:focus,
	input[type="password"]:focus,
	input[type="number"]:focus,
	input[type="date"]:focus,
	select:focus,
	textarea:focus,
	label:focus {
		outline: none;
		border: 1px solid var(--primaryColor);

		box-shadow: 5px 8px 3px 0px rgba(0, 0, 0, 0.3);
		transition: var(--mainTransition);
		font-weight: bold;
	}
`;
