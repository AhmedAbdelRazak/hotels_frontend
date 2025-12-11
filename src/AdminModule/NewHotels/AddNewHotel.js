import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
// eslint-disable-next-line
import { Link, Redirect } from "react-router-dom";
import ZSignupForm from "./ZSignupForm";
import { isAuthenticated, signup } from "../../auth";
import { toast } from "react-toastify";
import ZAddHotelSettings from "./ZAddHotelSettings";
import {
	createHotelDetails,
	createRooms,
	getHotelDetails,
	getHotelRooms,
	hotelAccount,
} from "../apiAdmin";
import { defaultHotelDetails, defaultUserValues } from "./Assets";
import ZHotelCanvas from "./ZHotelCanvas";

const AddNewHotel = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [firstStep, setFirstStep] = useState(false);
	const [secondStep, setSecondStep] = useState(false);
	const [thirdStep, setThirdStep] = useState(false);
	const [userId, setUserId] = useState("");
	const [values, setValues] = useState(defaultUserValues);
	const [currentAddingRoom, setCurrentAddingRoom] = useState(null);
	const [modalVisible2, setModalVisible2] = useState(false);
	const [helperRender, setHelperRender] = useState(false);

	const [hotelDetails, setHotelDetails] = useState({
		...defaultHotelDetails,
		hotelName: "",
		belongsTo: "",
	});

	const [floorDetails, setFloorDetails] = useState(defaultHotelDetails);
	const [rooms, setRooms] = useState([]);

	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, []);

	const { user, token } = isAuthenticated();

	const queryStringExists = window.location.search.length > 1;

	useEffect(() => {
		// Check if there is a query string in the URL
		const queryStringExists = window.location.search.length > 1;

		if (queryStringExists) {
			// Implement your logic here when there is a query string
			setFirstStep(true);
			setSecondStep(false);
			gettingUserData();
		} else {
			// Implement your logic here when there is no query string
			setFirstStep(false);
			setSecondStep(false);
			setThirdStep(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [firstStep, helperRender]);

	const gettingUserData = () => {
		hotelAccount(user._id, token, window.location.search.substring(1)).then(
			(data) => {
				if (data && data.error) {
					console.log(data.error, "Error rendering");
				} else {
					setValues(data);

					getHotelDetails(data._id).then((data2) => {
						if (data2 && data2.error) {
							console.log(data2.error, "Error rendering");
						} else {
							if (data && data.name && data._id && data2 && data2.length > 0) {
								setHotelDetails(data2[0]);
								setFirstStep(true);
								setSecondStep(true);

								getHotelRooms(
									window.location.search.substring(1),
									data2[0]._id
								).then((data3) => {
									if (data3 && data3.error) {
										console.log(data3.error);
									} else {
										setRooms(data3);
									}
								});
							}
						}
					});
				}
			}
		);
	};

	const handleChange = (name) => (event) => {
		setValues({
			...values,
			error: false,
			misMatch: false,
			[name]: event.target.value,
		});
	};

	const clickSubmit = (event) => {
		event.preventDefault();
		if (values.password !== values.password2) {
			setValues({
				...values,
				success: false,
				misMatch: true,
			});
			return <>{toast.error("Error! Passwords are not matching")}</>;
		} else {
			setValues({ ...values, error: false, misMatch: false });
			signup({
				name: values.name,
				email: values.email,
				password: values.password,
				password2: values.password2,
				misMatch: values.misMatch,
				role: 2000,
				phone: values.phone,
				hotelName: values.hotelName,
				hotelAddress: values.hotelAddress,
				hotelCountry: values.hotelCountry,
				hotelState: values.hotelState,
				hotelCity: values.hotelCity,
			}).then((data) => {
				if (data.error || data.misMatch) {
					setValues({ ...values, error: data.error, success: false });
					toast.error(data.error);
				} else {
					setFirstStep(true);
					setUserId(data.user._id);
				}
			});
		}
	};

	const submittingHotelDetails = () => {
		const getRoomCountTotal = (roomCountDetails) => {
			return Object.values(roomCountDetails).reduce((total, count) => {
				// Convert count to a number and validate it
				const numericCount = Number(count);
				if (isNaN(numericCount)) {
					console.warn(`Invalid count value: ${count}`);
					return total;
				}
				return total + numericCount;
			}, 0);
		};

		// Usage
		const totalRooms = getRoomCountTotal(hotelDetails.roomCountDetails);

		const hotelDetailsModified = {
			...hotelDetails,
			belongsTo: values._id,
			hotelName: values.hotelName ? values.hotelName : "No Name",
			overallRoomsCount: Number(totalRooms),
		};

		createHotelDetails(user._id, token, hotelDetailsModified).then((data) => {
			if (data && data.error) {
				console.log(data.error);
			} else {
				toast.success("General Hotel Details Were Saved");
				setSecondStep(true);
			}
		});
	};

	const addRooms = () => {
		if (!rooms || rooms.length === 0) {
			return toast.error("Please Add Rooms");
		}

		// Remove duplicate rooms based on room_number
		const uniqueRooms = Array.from(
			new Map(rooms.map((room) => [room["room_number"], room])).values()
		);

		getHotelRooms(window.location.search.substring(1)).then(
			(existingRoomsData) => {
				if (existingRoomsData && existingRoomsData.error) {
					console.error(existingRoomsData.error, "Error rendering");
				} else {
					// Filter out rooms that have already been added
					const roomsToAdd = uniqueRooms.filter(
						(newRoom) =>
							!existingRoomsData.some(
								(existingRoom) =>
									existingRoom.room_number === newRoom.room_number
							)
					);

					roomsToAdd.forEach((room, index) => {
						setTimeout(() => {
							setCurrentAddingRoom(room.room_number);
							createRooms(user._id, token, room).then((data) => {
								if (data && data.error) {
									console.error(data.error);
								} else {
									setSecondStep(true);
									if (index === roomsToAdd.length - 1) {
										// Reset after the last room addition
										setCurrentAddingRoom(null);
										window.location.reload(false);
									}
								}
							});
						}, 2500 * index); // Delay each creation by 2.5 seconds
					});
				}
			}
		);
	};

	return (
		<AddNewHotelWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='NewHotel'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='NewHotel'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					)}
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper mt-4'>
						{!firstStep ? (
							<div>
								<ZSignupForm
									handleChange={handleChange}
									clickSubmit={clickSubmit}
									values={values}
									firstStep={firstStep}
									setFirstStep={setFirstStep}
								/>
							</div>
						) : null}

						{!secondStep && !thirdStep && firstStep ? (
							<div>
								{queryStringExists ? null : (
									<Redirect to={`/admin/new-hotel?${userId}`} />
								)}

								<ZAddHotelSettings
									handleChange={handleChange}
									clickSubmit={clickSubmit}
									values={values}
									setSecondStep={setSecondStep}
									firstStep={firstStep}
									setHotelDetails={setHotelDetails}
									hotelDetails={hotelDetails}
									submittingHotelDetails={submittingHotelDetails}
								/>
							</div>
						) : null}

						{secondStep && firstStep && !thirdStep ? (
							<div>
								{queryStringExists ? null : (
									<Redirect to={`/admin/new-hotel?${userId}`} />
								)}

								<ZHotelCanvas
									values={values}
									floorDetails={floorDetails}
									setFloorDetails={setFloorDetails}
									hotelDetails={hotelDetails}
									rooms={rooms}
									setRooms={setRooms}
									addRooms={addRooms}
									currentAddingRoom={currentAddingRoom}
									modalVisible2={modalVisible2}
									setModalVisible2={setModalVisible2}
									helperRender={helperRender}
									setHelperRender={setHelperRender}
								/>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</AddNewHotelWrapper>
	);
};

export default AddNewHotel;

const AddNewHotelWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */
	margin-top: 0;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) =>
			props.show ? "70px 1fr" : "285px 1fr"};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 20px 10px;
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;
