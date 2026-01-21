import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Modal } from "antd";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import { updateSingleRoom } from "../apiAdmin";
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
}) => {
	const { user, token } = isAuthenticated();
	const [bedCount, setBedCount] = useState(clickedRoom.bedsNumber?.length || 0);

	useEffect(() => {
		if (clickedRoom.room_type === "individualBed" && clickedRoom.bedsNumber) {
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
		clickedRoom.display_name ||
			roomDetails.find((detail) => detail.roomType === clickedRoom.room_type)
				?.displayName,
		clickedRoom.room_type
	);

	const updatingSingleRoom = () => {
		// Update the bedsNumber array and individualBeds flag if the room type is individualBed
		if (clickedRoom.room_type === "individualBed") {
			const bedsNumber = Array.from(
				{ length: bedCount },
				(_, i) => `${clickedRoom.room_number}${String.fromCharCode(97 + i)}`
			);
			clickedRoom.bedsNumber = bedsNumber;
			clickedRoom.individualBeds = true;
		}

		console.log("Updating Room:", clickedRoom);

		updateSingleRoom(clickedRoom._id, user._id, token, clickedRoom)
			.then((data) => {
				if (data && data.error) {
					console.error(data.error, "Error Updating A Room");
				} else {
					toast.success(
						`Room #${clickedRoom.room_number} Was Successfully Updated`
					);
					setTimeout(() => {
						setModalVisible(false);
					}, 1000);
					setTimeout(() => {
						window.location.reload(false);
					}, 1500);
				}
			})
			.catch((error) => {
				console.error("Error occurred:", error);
			});
	};

	const updateRoomState = () => {
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

	const handleBedCountChange = (e) => {
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
		console.log("Updated Room for Bed Count Change:", {
			...clickedRoom,
			bedsNumber,
			individualBeds: true,
		});
	};

	const mainForm = () => {
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
					Edit Room #{clickedRoom.room_number} Floor #{clickedFloor}
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
							Display Name
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
							<option value=''>Please Select</option>
							{roomDisplayOptions.map((option, i) => (
								<option key={i} value={option.key}>
									{option.displayName}
								</option>
							))}
						</select>
						<div style={{ fontSize: "11px", marginTop: "6px" }}>
							Room Type:{" "}
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
								How many beds?
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
							Bed Size
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
							<option value=''>Please Select</option>
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
							Room View
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
							<option value=''>Please Select</option>
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
							Smoking
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
							<option value={true}>For Smokers</option>
							<option value={false}>No Smoking</option>
						</select>
					</div>
				</div>

				{clickedRoom && clickedRoom._id && (
					<div>
						<button
							className='btn btn-outline-success'
							onClick={updatingSingleRoom}
						>
							Update Room #{clickedRoom.room_number}
						</button>
					</div>
				)}
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
					>{`Edit Room #${clickedRoom.room_number}`}</div>
				}
				open={modalVisible}
				onOk={updateRoomState}
				cancelButtonProps={{ style: { display: "none" } }}
				onCancel={() => {
					setModalVisible(false);
				}}
			>
				{!clickedRoom && !clickedRoom._id ? setModalVisible(false) : mainForm()}
			</Modal>
		</ZSingleRoomModalWrapper>
	);
};

export default ZSingleRoomModal;

const ZSingleRoomModalWrapper = styled.div`
	z-index: 18000 !important;
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
