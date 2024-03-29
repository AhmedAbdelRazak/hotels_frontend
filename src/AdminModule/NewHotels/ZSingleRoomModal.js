/** @format */

import React from "react";
import styled from "styled-components";
import { Modal } from "antd";
import { BedSizes, Views, roomTypeColors, roomTypes } from "./Assets";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import { updateSingleRoom } from "../apiAdmin";

const ZSingleRoomModal = ({
	modalVisible,
	setModalVisible,
	clickedRoom,
	setClickedRoom,
	clickedFloor,
	rooms,
	setRooms,
	setHelperRender,
	helperRender,
}) => {
	const { user, token } = isAuthenticated();

	const updatingSingleRoom = () => {
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
						setHelperRender(!helperRender);
					}, 1500);
				}
			})
			.catch((error) => {
				console.error("Error occurred:", error);
			});
	};

	// console.log(clickedRoom, "clickedRoom");

	const mainForm = () => {
		// Find the current floor data

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
					<div className=' col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='name'
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
							}}
						>
							Room Type
						</label>
						<select
							style={{ textTransform: "capitalize" }}
							onChange={(e) => {
								const newRoomType = e.target.value;
								const newColorCode = roomTypeColors[newRoomType];
								setClickedRoom({
									...clickedRoom,
									room_type: newRoomType,
									roomColorCode: newColorCode,
								});
							}}
						>
							{clickedRoom && clickedRoom.room_type ? (
								<option value={clickedRoom.room_type}>
									{clickedRoom.room_type}
								</option>
							) : (
								<option value=''>Please Select</option>
							)}
							{roomTypes.map((t, i) => (
								<option key={i} value={t}>
									{t}
								</option>
							))}
						</select>
					</div>

					<div className=' col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='name'
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
							onChange={(e) => {
								setClickedRoom({
									...clickedRoom,
									room_features: clickedRoom.room_features.map(
										(feature, index) =>
											index === 0
												? { ...feature, bedSize: e.target.value }
												: feature
									),
								});
							}}
						>
							{clickedRoom &&
							clickedRoom.room_features &&
							clickedRoom.room_features[0] &&
							clickedRoom.room_features[0].bedSize ? (
								<option value=''>{clickedRoom.room_features[0].bedSize}</option>
							) : (
								<option value=''>Please Select</option>
							)}
							{BedSizes &&
								BedSizes.map((b, i) => {
									return (
										<option key={i} value={b}>
											{b}
										</option>
									);
								})}
						</select>
					</div>
					<div className=' col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='name'
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
							}}
						>
							Bed View
						</label>
						<select
							style={{ textTransform: "capitalize" }}
							onChange={(e) => {
								setClickedRoom({
									...clickedRoom,
									room_features: clickedRoom.room_features.map(
										(feature, index) =>
											index === 0
												? { ...feature, view: e.target.value }
												: feature
									),
								});
							}}
						>
							{clickedRoom &&
							clickedRoom.room_features &&
							clickedRoom.room_features[0] &&
							clickedRoom.room_features[0].view ? (
								<option value=''>{clickedRoom.room_features[0].view}</option>
							) : (
								<option value=''>Please Select</option>
							)}
							{Views &&
								Views.map((b, i) => {
									return (
										<option key={i} value={b}>
											{b}
										</option>
									);
								})}
						</select>
					</div>
					<div className=' col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							htmlFor='name'
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
							onChange={(e) => {
								setClickedRoom({
									...clickedRoom,
									room_features: clickedRoom.room_features.map(
										(feature, index) =>
											index === 0
												? { ...feature, smoking: e.target.value }
												: feature
									),
								});
							}}
						>
							{clickedRoom &&
							clickedRoom.room_features &&
							clickedRoom.room_features[0] &&
							clickedRoom.room_features[0].smoking === false ? (
								<option value=''>No Smoking</option>
							) : (
								<option value=''>Please Select</option>
							)}
							<option value={false}>No Smoking</option>
							<option value={true}>For Smokers</option>
						</select>
					</div>
				</div>
				<h3
					style={{
						fontSize: "1rem",
						textDecoration: "underline",
						textAlign: "left",
						fontWeight: "bold",
						marginTop: "25px",
					}}
				>
					Price Rates Room #{clickedRoom.room_number} Floor #{clickedFloor}
				</h3>

				<div className='row'>
					<div className=' col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
							}}
						>
							Base Price
						</label>
						<input
							type='number'
							value={
								clickedRoom.room_pricing && clickedRoom.room_pricing.basePrice
							}
							onChange={(e) =>
								setClickedRoom({
									...clickedRoom,
									room_pricing: {
										...clickedRoom.room_pricing,
										basePrice: e.target.value,
									},
								})
							}
							required
						/>
					</div>
					<div className=' col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
							}}
						>
							Seasonal Price
						</label>
						<input
							type='number'
							value={
								clickedRoom.room_pricing && clickedRoom.room_pricing.seasonPrice
							}
							onChange={(e) =>
								setClickedRoom({
									...clickedRoom,
									room_pricing: {
										...clickedRoom.room_pricing,
										seasonPrice: e.target.value,
									},
								})
							}
							required
						/>
					</div>

					<div className=' col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
							}}
						>
							Weekend Price
						</label>
						<input
							type='number'
							value={
								clickedRoom.room_pricing &&
								clickedRoom.room_pricing.weekendPrice
							}
							onChange={(e) =>
								setClickedRoom({
									...clickedRoom,
									room_pricing: {
										...clickedRoom.room_pricing,
										weekendPrice: e.target.value,
									},
								})
							}
							required
						/>
					</div>

					<div className=' col-md-2 form-group' style={{ marginTop: "10px" }}>
						<label
							style={{
								fontWeight: "bold",
								fontSize: "11px",
								textAlign: "center",
							}}
						>
							Last Minute Book Price
						</label>
						<input
							type='number'
							value={
								clickedRoom.room_pricing &&
								clickedRoom.room_pricing.lastMinuteDealPrice
							}
							onChange={(e) =>
								setClickedRoom({
									...clickedRoom,
									room_pricing: {
										...clickedRoom.room_pricing,
										lastMinuteDealPrice: e.target.value,
									},
								})
							}
							required
						/>
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
				onOk={() => {
					setModalVisible(false);
				}}
				// okButtonProps={{ style: { display: "none" } }}
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
