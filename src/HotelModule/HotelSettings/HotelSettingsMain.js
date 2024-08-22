import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { useHistory } from "react-router-dom";
import { useCartContext } from "../../cart_context";
import {
	createRooms,
	getHotelById,
	getHotelRooms,
	hotelAccount,
	updateHotelDetails,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ZHotelDetails from "./ZHotelDetails";
import ZPricingCalendarForm from "./ZPricingCalendarForm";
import { toast } from "react-toastify";
import HotelOverview from "./HotelOverview";
import { defaultHotelDetails } from "../../AdminModule/NewHotels/Assets";
import ZUpdateRoomCount from "./ZUpdateRoomCount";
import ZSuccessfulUpdate from "./ZSuccessfulUpdate";

const roomTypeColors = {
	standardRooms: "#003366", // Dark Blue
	singleRooms: "#8B0000", // Dark Red
	doubleRooms: "#004d00", // Dark Green
	twinRooms: "#800080", // Dark Purple
	queenRooms: "#FF8C00", // Dark Orange
	kingRooms: "#2F4F4F", // Dark Slate Gray
	tripleRooms: "#8B4513", // Saddle Brown
	quadRooms: "#00008B", // Navy
	studioRooms: "#696969", // Dim Gray
	suite: "#483D8B", // Dark Slate Blue
	masterSuite: "#556B2F", // Dark Olive Green
	familyRooms: "#A52A2A", // Brown
};

const HotelSettingsMain = () => {
	const history = useHistory();
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [hotelDetails, setHotelDetails] = useState("");
	const [values, setValues] = useState("");
	const { languageToggle, chosenLanguage } = useCartContext();
	const { user, token } = isAuthenticated();
	const [activeTab, setActiveTab] = useState("HotelDetails");
	const [pricingData, setPricingData] = useState([]);
	const [hotelPhotos, setHotelPhotos] = useState([]);
	const [currentStep, setCurrentStep] = useState(0);
	const [selectedRoomType, setSelectedRoomType] = useState("");
	const [roomTypeSelected, setRoomTypeSelected] = useState(false);

	//For Rooms
	const [floorDetails, setFloorDetails] = useState({
		roomCountDetails: {}, // Initialize as an object to hold counts by _id
	});
	const [modalVisible, setModalVisible] = useState(false);
	const [modalVisible2, setModalVisible2] = useState(false);
	const [clickedFloor, setClickedFloor] = useState("");
	const [clickedRoom, setClickedRoom] = useState({
		_id: "",
		room_number: "",
		room_type: "",
		room_features: [
			{
				bedSize: "",
				view: "",
			},
		],
		bathroom: ["bathtub", "jacuzzi"],
		airConditioning: "",
		television: "",
		internet: ["WiFi", "Ethernet Connection"],
		Minibar: [""],
		smoking: false,
		room_pricing: {
			// Assuming there are pricing details here
		},
		floor: 15,
		roomColorCode: "",
		belongsTo: "",
		hotelId: "",
	});
	const [currentAddingRoom, setCurrentAddingRoom] = useState("");
	const [hotelRooms, setHotelRooms] = useState("");
	const [inheritModalVisible, setInheritModalVisible] = useState(false);
	const [baseFloor, setBaseFloor] = useState("");
	const [roomsAlreadyExists, setRoomsAlreadyExists] = useState(false);
	const [finalStepModal, setFinalStepModal] = useState(false);

	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const step = searchParams.get("currentStep");
		setCurrentStep(step ? parseInt(step, 10) : 0);
	}, []);

	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		if (window.location.search.includes("hoteldetails")) {
			setActiveTab("HotelDetails");
		} else if (window.location.search.includes("roomdetails")) {
			setActiveTab("RoomDetails");
		} else if (window.location.search.includes("pricing")) {
			setActiveTab("PricingCalendar");
		} else if (window.location.search.includes("roomcount")) {
			setActiveTab("UpdateRoomCount");
		} else {
			setActiveTab("HotelDetails");
		}
		// eslint-disable-next-line
	}, [activeTab]);

	const roomTypes = [
		{ value: "standardRooms", label: "Standard Rooms" },
		{ value: "singleRooms", label: "Single Rooms" },
		{ value: "doubleRooms", label: "Double Rooms" },
		{ value: "twinRooms", label: "Twin Rooms" },
		{ value: "queenRooms", label: "Queen Rooms" },
		{ value: "kingRooms", label: "King Rooms" },
		{ value: "tripleRooms", label: "Triple Rooms" },
		{ value: "quadRooms", label: "Quad Rooms" },
		{ value: "studioRooms", label: "Studio Rooms" },
		{ value: "suite", label: "Suite" },
		{ value: "masterSuite", label: "Master Suite" },
		{ value: "familyRooms", label: "Family Rooms" },
		{ value: "individualBed", label: "Rooms With Individual Beds" },
		// { value: "other", label: "Other" },
	];

	const amenitiesList = [
		// Basic Amenities
		"WiFi",
		"TV",
		"Air Conditioning",
		"Mini Bar",
		"Pool",
		"Gym",
		"Restaurant",
		"Bar",
		"Spa",
		"Room Service",
		"Laundry Service",
		"Free Parking",
		"Pet Friendly",
		"Business Center",
		"Airport Shuttle",
		"Conference Rooms",
		"Fitness Center",
		"Non-Smoking Rooms",
		"Breakfast Included",
		"Accessible Rooms",
		"Kitchenette",
		"Bicycle Rental",
		"Sauna",
		"Hot Tub",
		"Golf Course",
		"Tennis Court",
		"Kids' Club",
		"Beachfront",
		"Casino",

		// Views
		"Sea View",
		"Street View",
		"Garden View",
		"City View",
		"Mountain View",
		"Holy Haram View",

		// Smoking Preferences
		"Smoking",
		"Non-Smoking",

		// Additional Amenities for Makkah, KSA
		"Prayer Mat",
		"Qibla Direction Indicator",
		"Holy Quran",
		"Islamic Television Channels",
		"Dedicated Prayer Room",
		"Shuttle Service to Haram",
		"Nearby Souks/Markets",
		"Arabic Coffee & Dates Service",
		"Cultural Tours/Guides",
		"Private Pilgrimage Services",
		"Complimentary Zamzam Water",
		"Halal-certified Restaurant",
		"Hajj & Umrah Booking Assistance",
	];

	const gettingHotelData = () => {
		const selectedHotel =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const hotelId = selectedHotel._id;

		// Fetching user account details
		hotelAccount(user._id, token, user._id).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error rendering");
			} else {
				setValues(data);

				// Fetching hotel details by hotelId
				getHotelById(hotelId).then((data2) => {
					if (data2 && data2.error) {
						console.log(data2.error, "Error rendering");
					} else {
						if (data && data.name && data._id && data2 && data2._id) {
							setHotelDetails(data2);

							// other state updates...
							setHotelPhotos(
								data2.hotelPhotos && data2.hotelPhotos.length > 0
									? data2.hotelPhotos
									: []
							);

							setPricingData(
								data2.pricingCalendar && data2.pricingCalendar.length > 0
									? data2.pricingCalendar
									: []
							);

							// Fetching hotel rooms
							getHotelRooms(data2._id, user._id).then((data4) => {
								if (data4 && data4.error) {
									console.log(data4.error);
								} else {
									if (data4.length > 0) {
										setRoomsAlreadyExists(true);
									}
									if (hotelRooms.length === 0) {
										setHotelRooms(data4);
									}

									if (clickedFloor && modalVisible) {
										// Aggregate room types for the clicked floor
										const aggregatedRoomData = aggregateRoomDataForFloor(
											clickedFloor,
											data4
										);
										setFloorDetails({
											...defaultHotelDetails,
											roomCountDetails: aggregatedRoomData,
										});
									}
								}
							});
						}
					}
				});
			}
		});
	};

	const aggregateRoomDataForFloor = (floor, rooms) => {
		const roomTypes = Object.keys(defaultHotelDetails.roomCountDetails).filter(
			(rt) => !rt.includes("Price")
		);
		const filteredRooms = rooms.filter((room) => room.floor === floor);

		return roomTypes.reduce((acc, type) => {
			acc[type] = filteredRooms.filter(
				(room) => room.room_type === type
			).length;
			return acc;
		}, {});
	};

	useEffect(() => {
		gettingHotelData();
		// eslint-disable-next-line
	}, [clickedFloor]);

	const hotelDetailsUpdate = (fromPage) => {
		const updatedDetails = { ...hotelDetails, fromPage };

		// Call the API to update the hotel details
		const hotelId = hotelDetails._id; // Assuming your hotelDetails object has an _id field
		console.log(updatedDetails, "updatedDetails");
		// Using the API function from your API admin file
		updateHotelDetails(hotelId, user._id, token, updatedDetails)
			.then((response) => {
				window.scrollTo({ top: 0, behavior: "smooth" });
				if (response.error) {
					console.log("Error updating hotel details:", response.error);
				} else {
					setSelectedRoomType("");
					toast.success("Hotel Was Successfully Updated");
					console.log("Hotel details updated successfully.");
					setHotelDetails(updatedDetails); // Update the state with the new details
					if (fromPage !== "Updating") {
						setFinalStepModal(true);
					} else {
						setTimeout(() => {
							window.location.href = `/hotel-management/settings/${user._id}/${hotelDetails._id}?activeTab=roomcount`;
						}, 2000);
					}
				}
			})
			.catch((err) => console.log("Error:", err));
	};

	const addRooms = () => {
		if (!hotelRooms || hotelRooms.length === 0) {
			return toast.error("Please Add Rooms");
		}

		const uniqueRooms = Array.from(
			new Map(hotelRooms.map((room) => [room["room_number"], room])).values()
		);

		// Add roomColorCode based on room_type and displayName from roomCountDetails or roomTypeColors
		const roomsWithColor = uniqueRooms.map((room) => {
			// Find the corresponding room details in hotelDetails.roomCountDetails
			const roomDetails = hotelDetails.roomCountDetails.find(
				(detail) =>
					detail.roomType === room.room_type &&
					detail.displayName === room.display_name
			);

			// Set roomColorCode based on found room details or fallback to roomTypeColors or default to black
			const roomColorCode =
				roomDetails?.roomColor || roomTypeColors[room.room_type] || "#000";

			return {
				...room,
				roomColorCode,
			};
		});

		createRooms(user._id, token, roomsWithColor)
			.then((data) => {
				if (data && data.error) {
					console.error(data.error);
				} else {
					window.scrollTo({ top: 0, behavior: "smooth" });
					toast.success("Rooms created/updated successfully");
					setCurrentAddingRoom(null);
					setTimeout(() => {
						window.location.reload(false);
					}, 2000);
				}
			})
			.catch((err) => {
				console.error("Error adding rooms:", err);
			});
	};

	return (
		<HotelSettingsMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
			isArabic={chosenLanguage === "Arabic"}
		>
			<ZSuccessfulUpdate
				modalVisible={finalStepModal}
				setModalVisible={setFinalStepModal}
				setStep={setCurrentStep}
				setSelectedRoomType={setSelectedRoomType}
				setRoomTypeSelected={setRoomTypeSelected}
				userId={user._id}
				hotelId={hotelDetails._id}
			/>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='HotelSettings'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='HotelSettings'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					)}
				</div>

				<div className='otherContentWrapper'>
					<div
						style={{
							textAlign: chosenLanguage === "Arabic" ? "left" : "right",
							fontWeight: "bold",
							textDecoration: "underline",
							cursor: "pointer",
						}}
						onClick={() => {
							if (chosenLanguage === "English") {
								languageToggle("Arabic");
							} else {
								languageToggle("English");
							}
						}}
					>
						{chosenLanguage === "English" ? "ARABIC" : "English"}
					</div>

					<div style={{ background: "#ededed", padding: "1px" }}>
						<div className='my-2 tab-grid col-md-9  mr-3'>
							<Tab
								isActive={activeTab === "HotelDetails"}
								onClick={() => {
									setActiveTab("HotelDetails");
									setCurrentStep(0);
									history.push(
										`/hotel-management/settings/${user._id}/${hotelDetails._id}?activeTab=HotelDetails&currentStep=0`
									); // Programmatic navigation
								}}
							>
								{chosenLanguage === "Arabic"
									? "تفاصيل الفندق"
									: "Hotel Details"}
							</Tab>

							<Tab
								isActive={activeTab === "UpdateRoomCount"}
								onClick={() => {
									setActiveTab("UpdateRoomCount");
									setCurrentStep(1);
									history.push(
										`/hotel-management/settings/${user._id}/${hotelDetails._id}?activeTab=roomcount&currentStep=1`
									); // Programmatic navigation
								}}
							>
								{chosenLanguage === "Arabic"
									? "تحديث عدد الغرف"
									: "Update Room Count"}
							</Tab>

							<Tab
								isActive={activeTab === "RoomDetails"}
								onClick={() => {
									setActiveTab("RoomDetails");
									history.push(
										`/hotel-management/settings/${user._id}/${hotelDetails._id}?roomdetails`
									); // Programmatic navigation
								}}
							>
								{chosenLanguage === "Arabic"
									? "توزيع الغرف على الطوابق"
									: "Room Details"}
							</Tab>
						</div>
					</div>

					<div className='container-wrapper'>
						{activeTab === "HotelDetails" &&
						hotelDetails &&
						hotelDetails.hotelName ? (
							<div>
								<ZHotelDetails
									values={values}
									setHotelDetails={setHotelDetails}
									hotelDetails={hotelDetails}
									submittingHotelDetails={hotelDetailsUpdate}
									chosenLanguage={chosenLanguage}
									hotelPhotos={hotelPhotos}
									setHotelPhotos={setHotelPhotos}
									roomTypes={roomTypes}
									amenitiesList={amenitiesList}
									currentStep={currentStep}
									setCurrentStep={setCurrentStep}
									selectedRoomType={selectedRoomType}
									setSelectedRoomType={setSelectedRoomType}
									roomTypeSelected={roomTypeSelected}
									setRoomTypeSelected={setRoomTypeSelected}
									fromPage='AddNew'
								/>
							</div>
						) : activeTab === "RoomDetails" &&
						  hotelDetails.hotelName &&
						  hotelDetails.roomCountDetails ? (
							// && hotelRooms.length > 0
							<HotelOverview
								hotelRooms={hotelRooms}
								hotelDetails={hotelDetails}
								values={values}
								addRooms={addRooms}
								setHotelRooms={setHotelRooms}
								currentAddingRoom={currentAddingRoom}
								floorDetails={floorDetails}
								setFloorDetails={setFloorDetails}
								modalVisible={modalVisible}
								setModalVisible={setModalVisible}
								modalVisible2={modalVisible2}
								setModalVisible2={setModalVisible2}
								clickedFloor={clickedFloor}
								setClickedFloor={setClickedFloor}
								clickedRoom={clickedRoom}
								setClickedRoom={setClickedRoom}
								inheritModalVisible={inheritModalVisible}
								setInheritModalVisible={setInheritModalVisible}
								baseFloor={baseFloor}
								setBaseFloor={setBaseFloor}
								roomsAlreadyExists={roomsAlreadyExists}
								roomTypeColors={roomTypeColors}
								selectedRoomType={selectedRoomType}
								setSelectedRoomType={setSelectedRoomType}
								roomTypeSelected={roomTypeSelected}
								setRoomTypeSelected={setRoomTypeSelected}
							/>
						) : activeTab === "PricingCalendar" &&
						  hotelDetails &&
						  hotelDetails.hotelName ? (
							<div>
								<ZPricingCalendarForm
									hotelDetails={hotelDetails}
									chosenLanguage={chosenLanguage}
									pricingData={pricingData}
									setPricingData={setPricingData}
									submittingHotelDetails={hotelDetailsUpdate}
								/>{" "}
							</div>
						) : null}

						{activeTab === "UpdateRoomCount" &&
						hotelDetails &&
						hotelDetails.hotelName ? (
							<>
								<ZUpdateRoomCount
									values={values}
									setHotelDetails={setHotelDetails}
									hotelDetails={hotelDetails}
									submittingHotelDetails={hotelDetailsUpdate}
									chosenLanguage={chosenLanguage}
									hotelPhotos={hotelPhotos}
									setHotelPhotos={setHotelPhotos}
									roomTypes={roomTypes}
									amenitiesList={amenitiesList}
									currentStep={currentStep}
									setCurrentStep={setCurrentStep}
									selectedRoomType={selectedRoomType}
									setSelectedRoomType={setSelectedRoomType}
									roomTypeSelected={roomTypeSelected}
									setRoomTypeSelected={setRoomTypeSelected}
									fromPage={"Updating"}
								/>
							</>
						) : null}
					</div>
				</div>
			</div>
		</HotelSettingsMainWrapper>
	);
};

export default HotelSettingsMain;

const HotelSettingsMainWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */
	margin-top: 46px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 85%" : "15% 84%")};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}

	tr {
		text-align: ${(props) => (props.isArabic ? "right" : "")};
	}

	.tab-grid {
		display: flex;
		/* Additional styling for grid layout */
	}

	@media (max-width: 1600px) {
		.grid-container-main {
			grid-template-columns: ${(props) =>
				props.show ? "5% 90%" : props.showList ? "13% 87%" : "19% 81%"};
		}
	}
`;

const Tab = styled.div`
	cursor: pointer;
	margin: 0 3px; /* 3px margin between tabs */
	padding: 15px 5px; /* Adjust padding as needed */
	font-weight: ${(props) => (props.isActive ? "bold" : "bold")};
	background-color: ${(props) =>
		props.isActive
			? "transparent"
			: "#e0e0e0"}; /* Light grey for unselected tabs */
	box-shadow: ${(props) =>
		props.isActive ? "inset 5px 5px 5px rgba(0, 0, 0, 0.3)" : "none"};
	transition: all 0.3s ease; /* Smooth transition for changes */
	min-width: 25px; /* Minimum width of the tab */
	width: 100%; /* Full width within the container */
	text-align: center; /* Center the text inside the tab */
	/* Additional styling for tabs */
	z-index: 100;
	font-size: 1.2rem;
	color: ${(props) => (props.isActive ? "black" : "black")};

	@media (max-width: 1600px) {
		font-size: 1rem;
		padding: 10px 1px; /* Adjust padding as needed */
	}
`;
