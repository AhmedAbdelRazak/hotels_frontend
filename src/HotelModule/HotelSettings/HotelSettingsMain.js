import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { Modal, Switch, Tooltip } from "antd";
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
import PaymentSettings from "./PaymentSettings";
import { getStoredMenuCollapsed } from "../utils/menuState";

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

const readSelectedHotel = () => {
	try {
		return JSON.parse(localStorage.getItem("selectedHotel") || "{}") || {};
	} catch (error) {
		return {};
	}
};

const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const getHotelOwnerId = (hotel = {}) =>
	normalizeId(
		hotel.belongsTo && typeof hotel.belongsTo === "object"
			? hotel.belongsTo._id
			: hotel.belongsTo
	);

const HotelSettingsMain = () => {
	const history = useHistory();
	const location = useLocation();
	const { userId: routeUserId, hotelId: routeHotelId } = useParams();
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
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
	const [activationSaving, setActivationSaving] = useState(false);

	const getSettingsOwnerId = () => {
		const selectedHotel = readSelectedHotel();
		return (
			normalizeId(routeUserId) ||
			getHotelOwnerId(selectedHotel) ||
			normalizeId(user?.belongsToId) ||
			normalizeId(user?._id)
		);
	};

	const getSettingsHotelId = () => {
		const selectedHotel = readSelectedHotel();
		return (
			normalizeId(hotelDetails?._id) ||
			normalizeId(routeHotelId) ||
			normalizeId(selectedHotel?._id) ||
			normalizeId(user?.hotelIdWork)
		);
	};

	const buildSettingsPath = (search = "") =>
		`/hotel-management/settings/${getSettingsOwnerId()}/${getSettingsHotelId()}${search}`;

	const updateSelectedHotelCache = (updatedHotel) => {
		if (!updatedHotel || !updatedHotel._id) return;
		try {
			const selectedHotel = readSelectedHotel();
			const selectedHotelId = normalizeId(selectedHotel?._id);
			const updatedHotelId = normalizeId(updatedHotel?._id);
			if (!selectedHotelId || selectedHotelId === updatedHotelId) {
				localStorage.setItem("selectedHotel", JSON.stringify(updatedHotel));
			}
		} catch (error) {
			console.log("Could not update selected hotel cache:", error);
		}
	};

	const clearUnsavedNewRoomDraft = () => {
		setHotelDetails((previousDetails) => {
			if (!previousDetails || !Array.isArray(previousDetails.roomCountDetails)) {
				return previousDetails;
			}

			const nextRoomCountDetails = previousDetails.roomCountDetails.filter(
				(room) => !(room?.myKey === "ThisIsNewKey" && !room?._id)
			);

			if (nextRoomCountDetails.length === previousDetails.roomCountDetails.length) {
				return previousDetails;
			}

			return {
				...previousDetails,
				roomCountDetails: nextRoomCountDetails,
			};
		});
		setSelectedRoomType("");
		setRoomTypeSelected(false);
	};

	const goToSettingsTab = (tabName, search, nextStep) => {
		if (activeTab === "HotelDetails" && tabName !== "HotelDetails") {
			clearUnsavedNewRoomDraft();
		}
		setActiveTab(tabName);
		if (typeof nextStep === "number") {
			setCurrentStep(nextStep);
		}
		history.push(buildSettingsPath(search));
	};

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
		display_name: "",
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

	const normalizeDisplayName = (value) =>
		String(value || "").trim().toLowerCase();
	const getRoomDisplayKey = (displayName, roomType) => {
		const displayKey = normalizeDisplayName(displayName);
		if (displayKey) return displayKey;
		return normalizeDisplayName(roomType);
	};
	const resolveRoomDetails = (displayName, roomType) => {
		const roomDetails = Array.isArray(hotelDetails?.roomCountDetails)
			? hotelDetails.roomCountDetails
			: [];
		const displayKey = getRoomDisplayKey(displayName, roomType);
		if (displayKey) {
			const matchByDisplay = roomDetails.find(
				(detail) =>
					getRoomDisplayKey(detail.displayName, detail.roomType) === displayKey
			);
			if (matchByDisplay) return matchByDisplay;
		}
		if (roomType) {
			return roomDetails.find((detail) => detail.roomType === roomType) || null;
		}
		return null;
	};

	useEffect(() => {
		const searchParams = new URLSearchParams(location.search);
		const step = searchParams.get("currentStep");
		const roomType = searchParams.get("selectedRoomType");

		// Set currentStep (default to 1 if not in params)
		setCurrentStep(step ? parseInt(step, 10) : 1);

		// Set selectedRoomType if it exists in the params
		if (roomType) {
			setSelectedRoomType(roomType);
		}
	}, [location.search]);

	useEffect(() => {
		const search = String(location.search || "").toLowerCase();
		const params = new URLSearchParams(location.search);
		const tabParam = String(params.get("activeTab") || "").toLowerCase();

		if (tabParam === "hoteldetails" || search.includes("hoteldetails")) {
			setActiveTab("HotelDetails");
		} else if (tabParam === "roomdetails" || search.includes("roomdetails")) {
			setActiveTab("RoomDetails");
		} else if (tabParam === "pricingcalendar" || search.includes("pricing")) {
			setActiveTab("PricingCalendar");
		} else if (tabParam === "roomcount" || search.includes("roomcount")) {
			setActiveTab("UpdateRoomCount");
		} else if (
			tabParam === "paymentsettings" ||
			search.includes("paymentsettings")
		) {
			setActiveTab("PaymentSettings");
		} else {
			setActiveTab("HotelDetails");
		}
	}, [location.search]);

	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [hasStoredCollapsed]);

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
		{
			value: "individualBed",
			label: "Rooms With Individual Beds (Shared Rooms)",
		},
		// { value: "other", label: "Other" },
	];

	const amenitiesList = [
		// Basic Amenities
		"WiFi",
		"TV",
		"Air Conditioning",
		"Mini Bar",
		"Smoking",
		"Non-Smoking",
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
		"Fitness Center",
		"Breakfast Included",
		"Accessible Rooms",
		"Bicycle Rental",
		"Sauna",
		"Hot Tub",
		"Golf Course",
		"Tennis Court",
		"Kids' Club",
		"Beachfront",
	];

	const viewsList = [
		// Views
		"Sea View",
		"Street View",
		"Garden View",
		"City View",
		"Mountain View",
		"Holy Haram View",
	];

	const extraAmenitiesList = [
		// Additional Amenities for Makkah, KSA
		"Prayer Mat",
		"Holy Quran",
		"Islamic Television Channels",
		"Shuttle Service to Haram",
		"Nearby Souks/Markets",
		"Arabic Coffee & Dates Service",
		"Cultural Tours/Guides",
		"Private Pilgrimage Services",
		"Complimentary Zamzam Water",
		"Halal-certified Restaurant",
		"Hajj & Umrah Booking Assistance",
		"Dedicated Prayer Room",
	];

	const gettingHotelData = () => {
		const selectedHotel = readSelectedHotel();
		const ownerId =
			(Number(user?.role) === 2000 && !user?.belongsToId
				? normalizeId(user?._id)
				: "") ||
			getHotelOwnerId(selectedHotel) ||
			getSettingsOwnerId();
		const selectedHotelId = normalizeId(selectedHotel?._id) || routeHotelId;

		// Fetching user account details
		hotelAccount(user._id, token, ownerId).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error rendering");
			} else {
				setValues(data);

				// Fetching hotel details by hotelId
				getHotelById(selectedHotelId).then((data2) => {
					if (data2 && data2.error) {
						console.log(data2.error, "Error rendering");
					} else {
						if (data && data.name && data._id && data2 && data2._id) {
							setHotelDetails(data2);

							// Other state updates...
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
							getHotelRooms(data2._id, ownerId).then((data4) => {
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
		const filteredRooms = rooms.filter((room) => room.floor === floor);
		return filteredRooms.reduce((acc, room) => {
			const key = getRoomDisplayKey(room.display_name, room.room_type);
			if (!key) return acc;
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		}, {});
	};

	const getActivationReadiness = () => {
		const roomsDone =
			Array.isArray(hotelDetails?.roomCountDetails) &&
			hotelDetails.roomCountDetails.length > 0;
		const photosDone =
			Array.isArray(hotelDetails?.hotelPhotos) &&
			hotelDetails.hotelPhotos.length > 0;
		const coords = hotelDetails?.location?.coordinates || [];
		const locationDone =
			Array.isArray(coords) &&
			coords.length >= 2 &&
			Number(coords[0]) !== 0 &&
			Number(coords[1]) !== 0;
		const dataDone = Boolean(
			String(hotelDetails?.aboutHotel || "").trim() ||
				String(hotelDetails?.aboutHotelArabic || "").trim() ||
				Number(hotelDetails?.overallRoomsCount || 0) > 0
		);

		return {
			roomsDone,
			photosDone,
			locationDone,
			dataDone,
			ready: roomsDone && photosDone && locationDone && dataDone,
		};
	};

	useEffect(() => {
		gettingHotelData();
		// eslint-disable-next-line
	}, [clickedFloor]);

	const hotelDetailsUpdate = (fromPage, updatedDetailsParam) => {
		// Get the currently selected hotel information
		const ownerId = getSettingsOwnerId();
		const hotelId = getSettingsHotelId(); // Make sure hotelDetails contains an _id

		// If fromPage is "paymentSettings", use the passed-in updatedDetails; otherwise, merge from the existing state
		const detailsToUpdate =
			fromPage === "paymentSettings"
				? { ...updatedDetailsParam, fromPage }
				: { ...hotelDetails, fromPage };

		console.log("Updating hotel details with:", detailsToUpdate);

		// Use your API function to update the hotel details
		updateHotelDetails(hotelId, user._id, token, detailsToUpdate)
			.then((response) => {
				window.scrollTo({ top: 0, behavior: "smooth" });
				if (response.error) {
					console.log("Error updating hotel details:", response.error);
				} else {
					// Clear selected room type if needed
					setSelectedRoomType("");
					toast.success("Hotel Was Successfully Updated");
					console.log("Hotel details updated successfully:", response);
					// If updating paymentSettings, update state with the passed-in updatedDetailsParam
					// otherwise, update with the merged details.
					if (fromPage === "paymentSettings") {
						setHotelDetails(updatedDetailsParam);
					} else {
						setHotelDetails(detailsToUpdate);
					}
					if (fromPage !== "Updating") {
						setFinalStepModal(true);
					} else {
						setTimeout(() => {
							window.location.href = `/hotel-management/settings/${ownerId}/${hotelId}?activeTab=roomcount`;
						}, 2000);
					}
				}
			})
			.catch((err) => console.log("Error:", err));
	};

	const handleActivationChange = (activateHotel) => {
		const readiness = getActivationReadiness();
		const hotelName = hotelDetails?.hotelName || "this hotel";

		if (activateHotel && !readiness.ready) {
			toast.error(
				"Please complete rooms, photos, location, and hotel data before activating this hotel."
			);
			return;
		}

		Modal.confirm({
			title: `${activateHotel ? "Activate" : "Deactivate"} ${hotelName}?`,
			content: activateHotel
				? "This hotel will become visible on Jannat Booking wherever active hotels are shown."
				: "This hotel will be hidden from Jannat Booking public hotel pages.",
			okText: activateHotel ? "Activate" : "Deactivate",
			cancelText: "Cancel",
			onOk: () => {
				setActivationSaving(true);
				return updateHotelDetails(getSettingsHotelId(), user._id, token, {
					activateHotel,
					fromPage: "HotelActivation",
				})
					.then((response) => {
						if (response?.error) {
							throw new Error(response.error);
						}
						setHotelDetails(response);
						updateSelectedHotelCache(response);
						toast.success(
							activateHotel
								? "Hotel activated successfully"
								: "Hotel deactivated successfully"
						);
					})
					.catch((error) => {
						toast.error(error.message || "Hotel activation update failed");
					})
					.finally(() => {
						setActivationSaving(false);
					});
			},
		});
	};

	const addRooms = () => {
		// eslint-disable-next-line
		const selectedHotel =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};

		if (!hotelRooms || hotelRooms.length === 0) {
			return toast.error("Please Add Rooms");
		}

		const uniqueRooms = Array.from(
			new Map(hotelRooms.map((room) => [room["room_number"], room])).values()
		);

		// Add roomColorCode based on display_name mapping from roomCountDetails
		const roomsWithColor = uniqueRooms.map((room) => {
			const roomDetails = resolveRoomDetails(
				room.display_name,
				room.room_type
			);
			const resolvedRoomType = roomDetails?.roomType || room.room_type;
			const resolvedDisplayName =
				roomDetails?.displayName || room.display_name || "";
			const roomColorCode = roomDetails
				? roomDetails.roomColor || room.roomColorCode || "#000"
				: room.roomColorCode || roomTypeColors[resolvedRoomType] || "#000";

			return {
				...room,
				room_type: resolvedRoomType,
				display_name: resolvedDisplayName,
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

	const activationReadiness = getActivationReadiness();
	const hotelIsActive = !!hotelDetails?.activateHotel;
	const activationToggleDisabled =
		activationSaving || (!hotelIsActive && !activationReadiness.ready);

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
				userId={getSettingsOwnerId()}
				hotelId={getSettingsHotelId()}
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

					{hotelDetails && hotelDetails.hotelName ? (
						<ActivationPanel $isActive={hotelIsActive}>
							<div className='activation-copy'>
								<span className='activation-kicker'>Hotel visibility</span>
								<h3>
									{hotelIsActive
										? "Active on Jannat Booking"
										: "Hidden from Jannat Booking"}
								</h3>
								<p>
									{activationReadiness.ready
										? "This hotel is ready to be shown to guests when active."
										: "Complete rooms, photos, location, and hotel data before activation."}
								</p>
								<div className='activation-checklist'>
									<span className={activationReadiness.roomsDone ? "done" : ""}>
										Rooms
									</span>
									<span
										className={activationReadiness.photosDone ? "done" : ""}
									>
										Photos
									</span>
									<span
										className={activationReadiness.locationDone ? "done" : ""}
									>
										Location
									</span>
									<span className={activationReadiness.dataDone ? "done" : ""}>
										Hotel Data
									</span>
								</div>
							</div>
							<Tooltip
								title={
									activationToggleDisabled && !activationSaving
										? "Finish the required setup steps first"
										: ""
								}
							>
								<div className='activation-switch'>
									<Switch
										checked={hotelIsActive}
										loading={activationSaving}
										disabled={activationToggleDisabled}
										onChange={handleActivationChange}
									/>
									<span>{hotelIsActive ? "Active" : "Inactive"}</span>
								</div>
							</Tooltip>
						</ActivationPanel>
					) : null}

					<TabsShell>
						<div className='tab-grid'>
							<Tab
								$isActive={activeTab === "HotelDetails"}
								onClick={() => {
									clearUnsavedNewRoomDraft();
									goToSettingsTab(
										"HotelDetails",
										"?activeTab=HotelDetails&currentStep=0",
										0
									);
								}}
							>
								{chosenLanguage === "Arabic"
									? "تفاصيل الفندق"
									: "Hotel Details"}
							</Tab>

							<Tab
								$isActive={activeTab === "UpdateRoomCount"}
								onClick={() => {
									goToSettingsTab(
										"UpdateRoomCount",
										"?activeTab=roomcount&currentStep=1",
										1
									);
								}}
							>
								{chosenLanguage === "Arabic"
									? "تحديث عدد الغرف"
									: "Update Room Count"}
							</Tab>

							<Tab
								$isActive={activeTab === "RoomDetails"}
								onClick={() => {
									goToSettingsTab("RoomDetails", "?roomdetails");
								}}
							>
								{chosenLanguage === "Arabic"
									? "توزيع الغرف على الطوابق"
									: "Room Details"}
							</Tab>

							<Tab
								$isActive={activeTab === "PaymentSettings"}
								onClick={() => {
									goToSettingsTab("PaymentSettings", "?paymentsettings");
								}}
							>
								{chosenLanguage === "Arabic"
									? "إعدادات الدفع"
									: "Payment Settings"}
							</Tab>
						</div>
					</TabsShell>

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
									viewsList={viewsList}
									extraAmenitiesList={extraAmenitiesList}
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
								chosenLanguage={chosenLanguage}
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
									viewsList={viewsList}
									extraAmenitiesList={extraAmenitiesList}
								/>
							</>
						) : null}

						{activeTab === "PaymentSettings" &&
						hotelDetails &&
						hotelDetails.hotelName ? (
							<>
								<PaymentSettings
									setHotelDetails={setHotelDetails}
									hotelDetails={hotelDetails}
									submittingHotelDetails={hotelDetailsUpdate}
									chosenLanguage={chosenLanguage}
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
		border: 1px solid #d7e7f8;
		padding: 18px;
		border-radius: 18px;
		background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
		margin: 0px 10px;
		box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
	}

	tr {
		text-align: ${(props) => (props.isArabic ? "right" : "")};
	}

	.tab-grid {
		display: flex;
		gap: 8px;
		min-width: 0;
		overflow-x: auto;
		overflow-y: hidden;
		padding: 2px 0 4px;
		scrollbar-width: thin;
	}

	@media (max-width: 1600px) {
		.grid-container-main {
			grid-template-columns: ${(props) =>
				props.show ? "5% 90%" : props.showList ? "13% 87%" : "19% 81%"};
		}
	}
`;

const ActivationPanel = styled.div`
	align-items: center;
	background: #ffffff;
	border: 1px solid
		${(props) => (props.$isActive ? "#8fd3a4" : "#d7e7f8")};
	border-left: 5px solid ${(props) => (props.$isActive ? "#229954" : "#7f8c8d")};
	border-radius: 8px;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
	display: flex;
	gap: 18px;
	justify-content: space-between;
	margin: 8px auto 10px;
	max-width: 1360px;
	padding: 16px 18px;
	width: calc(100% - clamp(16px, 2.8vw, 36px));

	.activation-copy {
		min-width: 0;
	}

	.activation-kicker {
		color: #566573;
		display: block;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0;
		margin-bottom: 4px;
		text-transform: uppercase;
	}

	h3 {
		color: #17202a;
		font-size: 1.05rem;
		font-weight: 800;
		line-height: 1.25;
		margin: 0;
	}

	p {
		color: #566573;
		font-size: 0.92rem;
		line-height: 1.45;
		margin: 6px 0 0;
	}

	.activation-checklist {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		margin-top: 10px;
	}

	.activation-checklist span {
		background: #f3f6f8;
		border: 1px solid #d9e2ec;
		border-radius: 6px;
		color: #596b7a;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1;
		padding: 6px 9px;
	}

	.activation-checklist span.done {
		background: #eaf8ee;
		border-color: #a9dfbf;
		color: #1e8449;
	}

	.activation-switch {
		align-items: center;
		display: flex;
		flex: 0 0 auto;
		gap: 9px;
		justify-content: flex-end;
		min-width: 116px;
	}

	.activation-switch span {
		color: #17202a;
		font-weight: 800;
		white-space: nowrap;
	}

	@media (max-width: 720px) {
		align-items: flex-start;
		flex-direction: column;
		margin: 8px 8px 10px;
		width: auto;

		.activation-switch {
			justify-content: flex-start;
		}
	}
`;

const TabsShell = styled.div`
	background: #e3f2fd;
	border: 1px solid #cfe5fb;
	border-radius: 8px;
	margin: 8px auto 0;
	max-width: 1360px;
	padding: 8px;
	min-width: 0;
	width: calc(100% - clamp(16px, 2.8vw, 36px));

	@media (max-width: 560px) {
		margin: 8px 8px 0;
		width: auto;
		padding: 7px;
	}
`;

const Tab = styled.div`
	display: flex;
	cursor: pointer;
	flex: 1 0 138px;
	margin: 0;
	padding: 11px 10px;
	font-weight: bold;
	background-color: ${(props) => (props.$isActive ? "#fff" : "#f3f7fb")};
	border: 1px solid
		${(props) => (props.$isActive ? "#9ecdf8" : "rgba(16, 24, 40, 0.08)")};
	border-radius: 8px;
	box-shadow: ${(props) =>
		props.$isActive ? "0 6px 16px rgba(30, 136, 229, 0.16)" : "none"};
	transition: all 0.3s ease;
	min-width: 0;
	text-align: center;
	z-index: 100;
	font-size: 0.95rem;
	color: #18212f;
	line-height: 1.25;
	align-items: center;
	justify-content: center;
	min-height: 52px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	@media (max-width: 1600px) {
		font-size: 0.88rem;
		padding: 10px 8px;
	}

	@media (max-width: 760px) {
		flex: 0 0 auto;
		font-size: 0.74rem;
		min-width: 92px;
		min-height: 48px;
		padding: 8px 10px;
	}
`;
