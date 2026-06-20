import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { Modal } from "antd";
import { useCartContext } from "../../cart_context";
import {
	createRooms,
	getHotelById,
	getHotelRooms,
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
	const [values] = useState("");
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

		Promise.all([
			getHotelById(selectedHotelId, { view: "management" }),
			getHotelRooms(selectedHotelId, ownerId),
		]).then(([hotelData, roomsData]) => {
			if (hotelData && hotelData.error) {
				console.log(hotelData.error, "Error rendering");
			} else if (hotelData && hotelData._id) {
				setHotelDetails(hotelData);
				setHotelPhotos(
					hotelData.hotelPhotos && hotelData.hotelPhotos.length > 0
						? hotelData.hotelPhotos
						: []
				);
				setPricingData(
					hotelData.pricingCalendar && hotelData.pricingCalendar.length > 0
						? hotelData.pricingCalendar
						: []
				);
			}

			if (roomsData && roomsData.error) {
				console.log(roomsData.error);
				return;
			}

			const rooms = Array.isArray(roomsData) ? roomsData : [];
			if (rooms.length > 0) {
				setRoomsAlreadyExists(true);
			}
			setHotelRooms((previousRooms) =>
				Array.isArray(previousRooms) && previousRooms.length > 0
					? previousRooms
					: rooms
			);

			if (clickedFloor && modalVisible) {
				const aggregatedRoomData = aggregateRoomDataForFloor(
					clickedFloor,
					rooms
				);
				setFloorDetails({
					...defaultHotelDetails,
					roomCountDetails: aggregatedRoomData,
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
		const isArabic = chosenLanguage === "Arabic";
		const activationText = {
			incomplete: isArabic
				? "\u064a\u0631\u062c\u0649 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u063a\u0631\u0641 \u0648\u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0641\u0646\u062f\u0642 \u0642\u0628\u0644 \u062a\u0641\u0639\u064a\u0644\u0647."
				: "Please complete rooms, photos, location, and hotel data before activating this hotel.",
			title: activateHotel
				? isArabic
					? `\u062a\u0641\u0639\u064a\u0644 ${hotelName}\u061f`
					: `Activate ${hotelName}?`
				: isArabic
				? `\u062a\u0639\u0637\u064a\u0644 ${hotelName}\u061f`
				: `Deactivate ${hotelName}?`,
			content: activateHotel
				? isArabic
					? "\u0633\u064a\u0638\u0647\u0631 \u0647\u0630\u0627 \u0627\u0644\u0641\u0646\u062f\u0642 \u0644\u0644\u0636\u064a\u0648\u0641 \u0641\u064a \u062c\u0646\u0629 \u0628\u0648\u0643\u064a\u0646\u062c \u0639\u0646\u062f\u0645\u0627 \u064a\u0643\u0648\u0646 \u0646\u0634\u0637\u0627."
					: "This hotel will become visible on Jannat Booking wherever active hotels are shown."
				: isArabic
				? "\u0633\u064a\u062a\u0645 \u0625\u062e\u0641\u0627\u0621 \u0647\u0630\u0627 \u0627\u0644\u0641\u0646\u062f\u0642 \u0645\u0646 \u0635\u0641\u062d\u0627\u062a \u062c\u0646\u0629 \u0628\u0648\u0643\u064a\u0646\u062c \u0627\u0644\u0639\u0627\u0645\u0629."
				: "This hotel will be hidden from Jannat Booking public hotel pages.",
			okText: activateHotel
				? isArabic
					? "\u062a\u0641\u0639\u064a\u0644"
					: "Activate"
				: isArabic
				? "\u062a\u0639\u0637\u064a\u0644"
				: "Deactivate",
			cancelText: isArabic ? "\u0625\u0644\u063a\u0627\u0621" : "Cancel",
			success: activateHotel
				? isArabic
					? "\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0641\u0646\u062f\u0642 \u0628\u0646\u062c\u0627\u062d"
					: "Hotel activated successfully"
				: isArabic
				? "\u062a\u0645 \u062a\u0639\u0637\u064a\u0644 \u0627\u0644\u0641\u0646\u062f\u0642 \u0628\u0646\u062c\u0627\u062d"
				: "Hotel deactivated successfully",
			failed: isArabic
				? "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0627\u0644\u0641\u0646\u062f\u0642"
				: "Hotel activation update failed",
		};

		if (activateHotel && !readiness.ready) {
			toast.error(activationText.incomplete);
			return;
		}

		Modal.confirm({
			title: activationText.title,
			content: activationText.content,
			okText: activationText.okText,
			cancelText: activationText.cancelText,
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
						toast.success(activationText.success);
					})
					.catch((error) => {
						toast.error(error.message || activationText.failed);
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
									hotelIsActive={hotelIsActive}
									activationSaving={activationSaving}
									activationToggleDisabled={activationToggleDisabled}
									handleActivationChange={handleActivationChange}
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
