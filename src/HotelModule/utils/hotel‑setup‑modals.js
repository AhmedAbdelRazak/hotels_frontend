/*  utils/hotel‑setup‑modals.js  ──────────────────────────────────────────
 *  Step‑specific modal code for MainHotelDashboard
 *  – Implements “Room types & pricing” (progress step #2)
 *  – Filters out incomplete rows before sending to the API
 *  – Works with existing ZCase1 without changing any other file
 *  --------------------------------------------------------------------- */

import React, { useState } from "react";
import { Modal, Form, message, Spin } from "antd";
import ZCase1 from "../HotelSettings/ZCase1";
import { updateHotelDetails } from "../apiAdmin";

/* ───────── reference data ───────── */

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
];

const amenitiesList = [
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
	"Sea View",
	"Street View",
	"Garden View",
	"City View",
	"Mountain View",
	"Holy Haram View",
];

const extraAmenitiesList = [
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

/* simple colour helper */
const getRoomColor = (rt) =>
	({
		standardRooms: "#003366",
		singleRooms: "#8B0000",
		doubleRooms: "#004d00",
		twinRooms: "#800080",
		queenRooms: "#FF8C00",
		kingRooms: "#2F4F4F",
		tripleRooms: "#8B4513",
		quadRooms: "#00008B",
		studioRooms: "#696969",
		suite: "#483D8B",
		masterSuite: "#556B2F",
		familyRooms: "#A52A2A",
	})[rt] || "#003366";

/* ═════════════════════  STEP 2  MODAL  ═════════════════════ */

export const RoomTypesModal = ({
	open,
	onClose,
	hotelDoc, // whole hotel object as received from server
	token,
	adminId,
	language, // "English" | "Arabic"
	refreshCard, // callback to reload list in MainHotelDashboard
}) => {
	const [hotelDetails, setHotelDetails] = useState(hotelDoc); // local draft
	const [saving, setSaving] = useState(false);
	// eslint-disable-next-line
	const [selectedRoomType, setSelectedRoomType] = useState("");
	const [roomTypeSelected, setRoomTypeSelected] = useState(false);
	const [customRoomType, setCustomRoomType] = useState("");
	const [form] = Form.useForm();

	/* ─────── persist to API ─────── */
	const handleSave = () => {
		form
			.validateFields() // ensure required inputs
			.then((vals) => {
				/* Build the current room object exactly like ZCase1 does */
				const roomType =
					vals.roomType === "other" ? customRoomType : vals.roomType;

				const freshRoom = {
					roomType,
					displayName: vals.displayName || "",
					displayName_OtherLanguage: vals.displayName_OtherLanguage || "",
					description: vals.description || "",
					description_OtherLanguage: vals.description_OtherLanguage || "",
					count: vals.roomCount || 0,
					price: { basePrice: vals.basePrice || 0 },
					amenities: vals.amenities || [],
					extraAmenities: vals.extraAmenities || [],
					views: vals.views || [],
					defaultCost: vals.defaultCost || 0,
					activeRoom: vals.activeRoom ?? true,
					commisionIncluded: vals.commisionIncluded || false,
					roomCommission: vals.roomCommission || 0,
					roomColor: getRoomColor(roomType),
					myKey: "ThisIsNewKey",
				};

				/* merge/replace by myKey */
				const current = hotelDetails.roomCountDetails || [];
				const pos = current.findIndex((r) => r.myKey === "ThisIsNewKey");
				const merged =
					pos > -1
						? current.map((r, i) => (i === pos ? { ...r, ...freshRoom } : r))
						: [...current, freshRoom];

				/* —— 1 ️⃣  CLEAN: keep only rows that really have a roomType —— */
				const cleaned = merged.filter((r) => r.roomType && r.roomType !== "");

				if (cleaned.length === 0) {
					message.error(
						language === "Arabic"
							? "يجب إضافة غرفة واحدة على الأقل"
							: "Please add at least one room"
					);
					return Promise.reject(); // abort save chain
				}

				/* decide which backend branch to hit */
				const pageMode = cleaned.some((r) => !r._id) ? "AddNew" : "Updating";

				const payload = {
					...hotelDetails,
					roomCountDetails: cleaned,
					fromPage: pageMode,
				};

				setSaving(true);
				return updateHotelDetails(hotelDetails._id, adminId, token, payload);
			})
			.then((resp) => {
				if (!resp) return; // validation aborted
				if (resp.error) throw new Error(resp.error);
				message.success(language === "Arabic" ? "تم الحفظ" : "Saved");
				refreshCard(); // refresh grid in parent
				onClose();
			})
			.catch((err) => {
				if (err) message.error(err.message || "Error");
			})
			.finally(() => setSaving(false));
	};

	/* ─────── render ─────── */
	return (
		<Modal
			title={
				language === "Arabic" ? "أنواع الغرف والسعر" : "Room types & pricing"
			}
			open={open}
			onOk={handleSave}
			onCancel={onClose}
			width={1000}
			okText={language === "Arabic" ? "حفظ" : "Save"}
			destroyOnClose
			bodyStyle={{ padding: 0, maxHeight: "80vh", overflowY: "auto" }}
			confirmLoading={saving}
		>
			{saving ? (
				<Spin style={{ width: "100%", margin: "3rem 0" }} />
			) : (
				/* 👇 PROVIDE FORM CONTEXT FOR ALL <Form.Item> INSIDE ZCase1 */
				<Form form={form} layout='vertical' style={{ padding: "1.5rem" }}>
					<ZCase1
						hotelDetails={hotelDetails}
						setHotelDetails={setHotelDetails}
						chosenLanguage={language}
						roomTypes={roomTypes}
						setSelectedRoomType={setSelectedRoomType}
						amenitiesList={amenitiesList}
						roomTypeSelected={roomTypeSelected}
						setRoomTypeSelected={setRoomTypeSelected}
						fromPage='Updating'
						setCustomRoomType={setCustomRoomType}
						customRoomType={customRoomType}
						form={form}
						viewsList={viewsList}
						extraAmenitiesList={extraAmenitiesList}
						getRoomColor={getRoomColor}
					/>
				</Form>
			)}
		</Modal>
	);
};

/* registry used by MainHotelDashboard */
export const STEP_MODAL_REGISTRY = {
	1: RoomTypesModal, // 0‑based index 1  →  progress step #2
};
