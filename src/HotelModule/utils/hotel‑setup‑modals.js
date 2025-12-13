/*  utils/hotelâ€‘setupâ€‘modals.js
 *  One file â€“ handles the six progressâ€‘step modals used by
 *  MainHotelDashboard.
 *  â€“ StepÂ #2 (room types & pricing) keeps the legacy ZCase1 / ZCase2
 *    components untouched but fixes all raceâ€‘conditions by using a
 *    mutable ref for the draft instead of React state.
 *  â€“ Photos, location and bankâ€‘details modals persist the same way.
 *  â€“ Everything is written back with updateHotelDetails().
 *  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

import React, { useRef, useState } from "react";
import { Modal, Form, message, Spin, Button } from "antd";
import ZCase1 from "../HotelSettings/ZCase1";
import ZCase2 from "../HotelSettings/ZCase2";
import ImageCardMain from "../HotelSettings/ImageCardMain";
import ZCase0 from "../HotelSettings/ZCase0";
import PaymentSettings from "../HotelSettings/PaymentSettings";
import { updateHotelDetails } from "../apiAdmin";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ static dictionaries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
	{ value: "individualBed", label: "Rooms With Individual Beds (Shared)" },
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
	"Islamic TV Channels",
	"Haram Shuttle",
	"Nearby Souks",
	"Arabic Coffee & Dates",
	"Cultural Tours",
	"Private Pilgrimage",
	"Complimentary Zamzam",
	"Halal Restaurant",
	"Hajj & Umrah Assistance",
	"Dedicated Prayer Room",
];

const roomColors = {
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
};
const getRoomColor = (rt) => roomColors[rt] || "#003366";

const stripMyKey = ({ myKey, ...rest }) => rest;

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•  STEPÂ #2Â â€“Â Roomâ€‘types modal  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const RoomTypesModal = ({
	open,
	onClose,
	hotelDoc,
	token,
	adminId,
	language, // "English" | "Arabic"
	refreshCard, // reload cards after save
}) => {
	const draftRef = useRef(structuredClone(hotelDoc)); // mutable draft
	const [photoTick, setPhotoTick] = useState(0); // forces photo reâ€‘render
	const [saving, setSaving] = useState(false);

	// controlled form inside the modal
	const [form] = Form.useForm();
	const [selectedRoomType, setSelectedRoomType] = useState("");
	const [roomTypeSelected, setRoomTypeSelected] = useState(false);
	const [customRoomType, setCustomRoomType] = useState("");

	/* helper â€“ patch draft without reâ€‘render */
	const patchDraft = (patcher) => {
		draftRef.current =
			typeof patcher === "function" ? patcher(draftRef.current) : patcher;
	};

	/* current WIP room ( by myKey === ThisIsNewKey ) */
	const currentRoomId =
		(form.getFieldValue("roomType") === "other"
			? customRoomType
			: form.getFieldValue("roomType")) || selectedRoomType;
	const currentRoom =
		draftRef.current.roomCountDetails?.find(
			(r) => r.roomType === currentRoomId && r.myKey === "ThisIsNewKey"
		) || {};

	/* directly supplied to ZCase2 */
	const setRoomPhotos = (newPhotos) => {
		patchDraft((prev) => {
			const list = Array.isArray(prev.roomCountDetails)
				? [...prev.roomCountDetails]
				: [];
			const idx = list.findIndex((r) => r.myKey === "ThisIsNewKey");
			if (idx > -1) list[idx] = { ...list[idx], photos: newPhotos };
			else
				list.push({
					roomType: currentRoomId,
					photos: newPhotos,
					myKey: "ThisIsNewKey",
				});
			return { ...prev, roomCountDetails: list };
		});
		// force only the photo area to refresh
		setPhotoTick((x) => x + 1);
	};

	/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ persist to backend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
	const handleSave = async () => {
		try {
			const vals = await form.validateFields();
			const roomType =
				vals.roomType === "other" ? customRoomType : vals.roomType;

			/* rebuild the current draft room exactly like ZCase1 does */
			const freshRoom = {
				roomType,
				displayName: vals.displayName,
				displayName_OtherLanguage: vals.displayName_OtherLanguage,
				description: vals.description,
				description_OtherLanguage: vals.description_OtherLanguage,
				count: vals.roomCount,
				price: { basePrice: vals.basePrice },
				amenities: vals.amenities,
				extraAmenities: vals.extraAmenities,
				views: vals.views,
				defaultCost: vals.defaultCost,
				activeRoom: vals.activeRoom ?? true,
				commisionIncluded: vals.commisionIncluded,
				roomCommission: vals.roomCommission,
				photos: currentRoom.photos || [],
				roomColor: getRoomColor(roomType),
				myKey: "ThisIsNewKey",
			};

			patchDraft((prev) => {
				const list = Array.isArray(prev.roomCountDetails)
					? [...prev.roomCountDetails]
					: [];
				const idx = list.findIndex((r) => r.myKey === "ThisIsNewKey");
				if (idx > -1) list[idx] = { ...list[idx], ...freshRoom };
				else list.push(freshRoom);
				return { ...prev, roomCountDetails: list };
			});

			const cleaned = draftRef.current.roomCountDetails.filter(
				(r) => r.roomType
			);
			if (!cleaned.length) {
				message.error(
					language === "Arabic"
						? "ÙŠØ¬Ø¨ Ø¥Ø¶Ø§ÙØ© ØºØ±ÙØ© ÙˆØ§Ø­Ø¯Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„"
						: "Add at least one room"
				);
				return;
			}

			const fromPage = cleaned.some((r) => !r._id) ? "AddNew" : "Updating";
			const payload = {
				...draftRef.current,
				roomCountDetails: cleaned.map(stripMyKey),
				fromPage,
			};

			setSaving(true);
			const resp = await updateHotelDetails(
				hotelDoc._id,
				adminId,
				token,
				payload
			);
			if (resp?.error) throw new Error(resp.error);

			message.success(language === "Arabic" ? "ØªÙ… Ø§Ù„Ø­ÙØ¸" : "Saved");
			refreshCard();
			onClose();
		} catch (err) {
			if (err) message.error(err.message || "Error");
		} finally {
			setSaving(false);
		}
	};

	/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={handleSave}
			confirmLoading={saving}
			width={1000}
			okText={language === "Arabic" ? "Ø­ÙØ¸" : "Save"}
			title={
				language === "Arabic" ? "Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„ØºØ±Ù ÙˆØ§Ù„Ø³Ø¹Ø±" : "Room types & pricing"
			}
			styles={{ body: { padding: 0, maxHeight: "80vh", overflowY: "auto" } }}
			destroyOnClose
		>
			{saving ? (
				<Spin style={{ width: "100%", margin: "3rem 0" }} />
			) : (
				<Form form={form} layout='vertical' style={{ padding: "1.5rem" }}>
					{/* ZCase1 â€“ room core data */}
					<ZCase1
						hotelDetails={draftRef.current}
						setHotelDetails={patchDraft}
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

					{/* ZCase2 â€“ room photos */}
					{roomTypeSelected && (
						<div style={{ marginTop: 32 }} key={photoTick /* force refresh */}>
							<ZCase2
								hotelDetails={draftRef.current}
								setHotelDetails={patchDraft}
								chosenLanguage={language}
								form={form}
								photos={currentRoom.photos || []}
								setPhotos={setRoomPhotos}
							/>
						</div>
					)}
				</Form>
			)}
		</Modal>
	);
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• Remaining stepâ€‘modals (unchanged logic) â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const InfoModal = ({ open, onClose, language }) => (
	<Modal
		open={open}
		onCancel={onClose}
		footer={null}
		title={language === "Arabic" ? "Ù…Ø¹Ù„ÙˆÙ…Ø§Øª" : "Info"}
	>
		{language === "Arabic"
			? "Ø·Ù„Ø¨ Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©."
			: "Your registration request is under review."}
	</Modal>
);

export const HotelPhotosModal = ({
	open,
	onClose,
	hotelDoc,
	token,
	adminId,
	language,
	refreshCard,
}) => {
	const [draft, setDraft] = useState(hotelDoc);
	const [saving, setSaving] = useState(false);

	const persist = () => {
		if (!draft.hotelPhotos?.length) {
			message.error(
				language === "Arabic"
					? "Ø£Ø¶Ù ØµÙˆØ±Ø© ÙˆØ§Ø­Ø¯Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„"
					: "Upload at least one photo"
			);
			return;
		}
		setSaving(true);
		updateHotelDetails(hotelDoc._id, adminId, token, {
			...draft,
			fromPage: "Updating",
		})
			.then((r) => {
				if (r.error) throw new Error(r.error);
				message.success(language === "Arabic" ? "ØªÙ… Ø§Ù„Ø­ÙØ¸" : "Saved");
				refreshCard();
				onClose();
			})
			.catch((e) => message.error(e.message || "Error"))
			.finally(() => setSaving(false));
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={persist}
			confirmLoading={saving}
			title={language === "Arabic" ? "ØµÙˆØ± Ø§Ù„ÙÙ†Ø¯Ù‚" : "Hotel photos"}
			okText={language === "Arabic" ? "Ø­ÙØ¸" : "Save"}
			width={900}
			destroyOnClose
		>
			<ImageCardMain
				hotelPhotos={draft.hotelPhotos || []}
				setHotelDetails={setDraft}
			/>
		</Modal>
	);
};

export const LocationModal = ({
	open,
	onClose,
	hotelDoc,
	token,
	adminId,
	language,
	refreshCard,
}) => {
	const [draft, setDraft] = useState(hotelDoc);
	const [saving, setSaving] = useState(false);
	const [modalVisible, setModalVisible] = useState(true);
	const [markerPosition, setMarkerPosition] = useState({
		lat: hotelDoc.location.coordinates[1] || 24.7136,
		lng: hotelDoc.location.coordinates[0] || 46.6753,
	});
	const [address, setAddress] = useState(hotelDoc.hotelAddress || "");
	const [geocoder, setGeocoder] = useState(null);

	const persist = () => {
		if (!draft.location?.coordinates || draft.location.coordinates[0] === 0) {
			message.error(
				language === "Arabic" ? "Ø­Ø¯Ø¯ Ù…ÙˆÙ‚Ø¹ Ø§Ù„ÙÙ†Ø¯Ù‚" : "Pick hotel location"
			);
			return;
		}
		setSaving(true);
		updateHotelDetails(hotelDoc._id, adminId, token, {
			...draft,
			fromPage: "Updating",
		})
			.then((r) => {
				if (r.error) throw new Error(r.error);
				message.success(language === "Arabic" ? "ØªÙ… Ø§Ù„Ø­ÙØ¸" : "Saved");
				refreshCard();
				onClose();
			})
			.catch((e) => message.error(e.message || "Error"))
			.finally(() => setSaving(false));
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={persist}
			confirmLoading={saving}
			title={language === "Arabic" ? "Ù…ÙˆÙ‚Ø¹ Ø§Ù„ÙÙ†Ø¯Ù‚" : "Hotel location"}
			okText={language === "Arabic" ? "Ø­ÙØ¸" : "Save"}
			width={1000}
			styles={{ body: { padding: 0, maxHeight: "80vh", overflowY: "auto" } }}
			destroyOnClose
		>
			<ZCase0
				hotelDetails={draft}
				setHotelDetails={setDraft}
				chosenLanguage={language}
				setLocationModalVisible={setModalVisible}
				locationModalVisible={modalVisible}
				setMarkerPosition={setMarkerPosition}
				markerPosition={markerPosition}
				setAddress={setAddress}
				address={address}
				setHotelPhotos={() => {}}
				hotelPhotos={[]}
				setGeocoder={setGeocoder}
				geocoder={geocoder}
			/>
		</Modal>
	);
};

export const CompleteDataModal = ({
	open,
	onClose,
	hotelDoc,
	token,
	adminId,
	language,
	refreshCard,
}) => {
	const [draft, setDraft] = useState(hotelDoc);
	const [saving, setSaving] = useState(false);

	const persist = () => {
		setSaving(true);
		updateHotelDetails(hotelDoc._id, adminId, token, {
			...draft,
			fromPage: "Updating",
		})
			.then((r) => {
				if (r.error) throw new Error(r.error);
				message.success(language === "Arabic" ? "ØªÙ… Ø§Ù„Ø­ÙØ¸" : "Saved");
				refreshCard();
				onClose();
			})
			.catch((e) => message.error(e.message || "Error"))
			.finally(() => setSaving(false));
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={persist}
			confirmLoading={saving}
			title={language === "Arabic" ? "Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙÙ†Ø¯Ù‚" : "Hotel data"}
			okText={language === "Arabic" ? "Ø­ÙØ¸" : "Save"}
			width={1000}
			destroyOnClose
		>
			<ZCase0
				hotelDetails={draft}
				setHotelDetails={setDraft}
				chosenLanguage={language}
				setLocationModalVisible={() => {}}
				locationModalVisible={false}
				setMarkerPosition={() => {}}
				markerPosition={{}}
				setAddress={() => {}}
				address=''
				setHotelPhotos={() => {}}
				hotelPhotos={draft.hotelPhotos || []}
				setGeocoder={() => {}}
				geocoder={null}
			/>
		</Modal>
	);
};

export const BankDetailsModal = ({
	open,
	onClose,
	hotelDoc,
	token,
	adminId,
	language,
	refreshCard,
}) => {
	const [draft, setDraft] = useState(hotelDoc);
	const [saving, setSaving] = useState(false);

	const persist = () => {
		setSaving(true);
		updateHotelDetails(hotelDoc._id, adminId, token, {
			...draft,
			fromPage: "paymentSettings",
		})
			.then((r) => {
				if (r.error) throw new Error(r.error);
				message.success(language === "Arabic" ? "ØªÙ… Ø§Ù„Ø­ÙØ¸" : "Saved");
				refreshCard();
				onClose();
			})
			.catch((e) => message.error(e.message || "Error"))
			.finally(() => setSaving(false));
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			width={800}
			destroyOnClose
			title={language === "Arabic" ? "Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¨Ù†ÙƒÙŠØ©" : "Bank details"}
		>
			<PaymentSettings
				hotelDetails={draft}
				setHotelDetails={setDraft}
				submittingHotelDetails={() => {}}
				chosenLanguage={language}
			/>
			<div style={{ textAlign: "center", marginTop: 24 }}>
				<Button type='primary' loading={saving} onClick={persist}>
					{language === "Arabic" ? "Ø­ÙØ¸" : "Save"}
				</Button>
			</div>
		</Modal>
	);
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•  export registry  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const STEP_MODAL_REGISTRY = {
	0: InfoModal, // Registration request
	1: RoomTypesModal, // Room types & pricing
	2: HotelPhotosModal, // Upload required photos
	3: LocationModal, // Pin hotel location
	4: CompleteDataModal, // Complete hotel data
	5: BankDetailsModal, // Bank details
};

