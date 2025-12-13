/** @format
 *  Platform‑admin versions of the 6 onboarding step‑modals
 *
 *  – They reuse the owner components where possible.
 *  – Whenever the admin saves we pass the *owner id* (`belongsTo._id`)
 *    to the same `updateHotelDetails` endpoint.
 *  – All forms are Ant‑design and fully validated.
 *
 *  Exported constant: STEP_MODAL_REGISTRY_ADMIN  (0‑based)
 *  ---------------------------------------------------------
 *  0 – Registration   ⟶ readonly (no modal)
 *  1 – Room types     ⟶ <RoomTypesModalAdmin>   (was already implemented)
 *  2 – Hotel photos   ⟶ <PhotosModalAdmin>
 *  3 – Location pin   ⟶ <LocationModalAdmin>
 *  4 – Hotel data     ⟶ <HotelDataModalAdmin>
 *  5 – Bank / payout  ⟶ <BankDetailsModalAdmin>
 */

import React, { useState } from "react";
import { Form, Input, Modal, Spin, message, Upload } from "antd";
import {
	EnvironmentOutlined,
	LoadingOutlined,
	PlusOutlined,
} from "@ant-design/icons";

import ZCase1 from "../../HotelModule/HotelSettings/ZCase1";
import { updateHotelDetails } from "../../HotelModule/apiAdmin";
import { cloudinaryUpload1 } from "../../HotelModule/apiAdmin"; // same util owner uses
import { isAuthenticated } from "../../auth";

/* ───────────────────────── helpers ───────────────────────── */

const useSaveWrapper = (hotelDoc, admin, token, refresh, close) => {
	/** Small hook returning a function that
	 *   (1) merges partialDraft into hotelDoc
	 *   (2) sends it with correct owner id
	 *   (3) refreshes dashboard & closes on success
	 */
	return (partialDraft, noValidationMsg = "Saved") => {
		const ownerId = hotelDoc.belongsTo?._id || admin._id;
		const payload = {
			...hotelDoc,
			...partialDraft,
			fromPage: "Updating",
		};

		return updateHotelDetails(hotelDoc._id, ownerId, token, payload)
			.then((r) => {
				if (r?.error) throw new Error(r.error);
				message.success(noValidationMsg);
				refresh();
				close();
			})
			.catch((e) => message.error(e.message || "Error"));
	};
};

/* ─────────── static dictionaries ─────────── */

export const roomTypes = [
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
	{ value: "individualBed", label: "Rooms With Individual Beds (Shared)" },
];

export const amenitiesList = [
	"WiFi",
	"TV",
	"Air Conditioning",
	"Mini Bar",
	"Smoking",
	"Non‑Smoking",
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

export const viewsList = [
	"Sea View",
	"Street View",
	"Garden View",
	"City View",
	"Mountain View",
	"Holy Haram View",
];

export const extraAmenitiesList = [
	"Prayer Mat",
	"Holy Quran",
	"Islamic TV Channels",
	"Haram Shuttle",
	"Nearby Souks",
	"Arabic Coffee & Dates",
	"Cultural Tours",
	"Private Pilgrimage",
	"Complimentary Zamzam",
	"Halal Restaurant",
	"Hajj & Umrah Assistance",
	"Dedicated Prayer Room",
];

// colours reused by owner dashboard
const ROOM_COLOR = {
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
const getRoomColor = (t) => ROOM_COLOR[t] || "#003366";

export const RoomTypesModalAdmin = ({
	open,
	onClose,
	hotelDoc,
	admin,
	token,
	language,
	refreshCard,
}) => {
	const [hotelDetails, setHotelDetails] = useState(hotelDoc);
	const [saving, setSaving] = useState(false);
	const [roomTypeSelected, setRoomTypeSelected] = useState(false);
	const [customRoomType, setCustomRoomType] = useState("");
	const [form] = Form.useForm();

	/* reuse hook */
	const doSave = useSaveWrapper(hotelDoc, admin, token, refreshCard, () =>
		onClose()
	);

	const handleSave = () => {
		form
			.validateFields()
			.then((vals) => {
				/* build single room row exactly like owner comp */
				const roomType =
					vals.roomType === "other" ? customRoomType : vals.roomType;

				const fresh = {
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

				const cur = hotelDetails.roomCountDetails || [];
				const pos = cur.findIndex((r) => r.myKey === "ThisIsNewKey");
				const merged =
					pos > -1
						? cur.map((r, i) => (i === pos ? { ...r, ...fresh } : r))
						: [...cur, fresh];

				if (!merged.find((r) => r.roomType))
					throw new Error(
						language === "Arabic"
							? "يجب إضافة غرفة واحدة على الأقل"
							: "Please add at least one room"
					);

				setSaving(true);
				return doSave({ roomCountDetails: merged });
			})
			.finally(() => setSaving(false));
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={handleSave}
			width={1000}
			destroyOnClose
			title={
				language === "Arabic" ? "أنواع الغرف والسعر" : "Room types & pricing"
			}
			okText={language === "Arabic" ? "حفظ" : "Save"}
			confirmLoading={saving}
			styles={{ body: { padding: 0, maxHeight: "80vh", overflowY: "auto" } }}
		>
			{saving ? (
				<Spin style={{ width: "100%", margin: "3rem 0" }} />
			) : (
				<Form form={form} layout='vertical' style={{ padding: "1.5rem" }}>
					<ZCase1
						hotelDetails={hotelDetails}
						setHotelDetails={setHotelDetails}
						chosenLanguage={language}
						roomTypes={roomTypes}
						setSelectedRoomType={() => {}}
						amenitiesList={amenitiesList} // keep minimal – ZCase1 handles empty gracefully
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

/* ───────────────────────── MODAL #2  – Hotel photos ───────────────────────── */

const PhotosModalAdmin = ({
	open,
	onClose,
	hotelDoc,
	admin,
	token,
	language,
	refreshCard,
}) => {
	const [fileList, setFileList] = useState(
		(hotelDoc.hotelPhotos || []).map((p) => ({
			uid: p.public_id,
			name: "photo",
			status: "done",
			url: p.url,
		}))
	);
	const [uploading, setUploading] = useState(false);

	const { user } = isAuthenticated();
	const save = useSaveWrapper(hotelDoc, admin, token, refreshCard, onClose);

	const onUpload = ({ file }) => {
		setUploading(true);
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			cloudinaryUpload1(user._id, token, { image: reader.result })
				.then((res) => {
					setFileList((prev) => [
						...prev,
						{
							uid: res.public_id,
							name: "photo",
							status: "done",
							url: res.url,
						},
					]);
				})
				.finally(() => setUploading(false));
		};
	};

	const handleSave = () =>
		save(
			{
				hotelPhotos: fileList.map((f) => ({
					public_id: f.uid,
					url: f.url,
				})),
			},
			language === "Arabic" ? "تم الحفظ" : "Saved"
		);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={handleSave}
			okText={language === "Arabic" ? "حفظ" : "Save"}
			title={language === "Arabic" ? "صور الفندق" : "Hotel photos"}
			destroyOnClose
		>
			<Upload
				listType='picture-card'
				fileList={fileList}
				onRemove={(f) =>
					setFileList((prev) => prev.filter((x) => x.uid !== f.uid))
				}
				customRequest={onUpload}
				disabled={uploading}
				accept='image/*'
			>
				<div>
					{uploading ? <LoadingOutlined /> : <PlusOutlined />}
					<div style={{ marginTop: 8 }}>
						{language === "Arabic" ? "تحميل" : "Upload"}
					</div>
				</div>
			</Upload>
		</Modal>
	);
};

/* ───────────────────────── MODAL #3  – Location pin ───────────────────────── */
/* Minimal: admin pastes lat/lng – uses antd InputNumber; on save we store in
   hotelDoc.location.coordinates = [lng, lat] (Mongo style) */

const LocationModalAdmin = ({
	open,
	onClose,
	hotelDoc,
	admin,
	token,
	language,
	refreshCard,
}) => {
	const [form] = Form.useForm();
	const save = useSaveWrapper(hotelDoc, admin, token, refreshCard, onClose);

	const handleSave = () =>
		form.validateFields().then(({ lat, lng }) =>
			save({
				location: { type: "Point", coordinates: [lng, lat] },
			})
		);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={handleSave}
			okText={language === "Arabic" ? "حفظ" : "Save"}
			title={language === "Arabic" ? "تحديد الموقع" : "Hotel location"}
			destroyOnClose
		>
			<Form
				form={form}
				layout='vertical'
				initialValues={{
					lat: hotelDoc.location?.coordinates?.[1],
					lng: hotelDoc.location?.coordinates?.[0],
				}}
			>
				<Form.Item
					name='lat'
					label={language === "Arabic" ? "دائرة العرض" : "Latitude"}
					rules={[{ required: true, message: "required" }]}
				>
					<Input
						type='number'
						prefix={<EnvironmentOutlined />}
						placeholder='24.7136'
					/>
				</Form.Item>
				<Form.Item
					name='lng'
					label={language === "Arabic" ? "خط الطول" : "Longitude"}
					rules={[{ required: true, message: "required" }]}
				>
					<Input
						type='number'
						prefix={<EnvironmentOutlined />}
						placeholder='46.6753'
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
};

/* ───────────────────────── MODAL #4  – Basic hotel data ───────────────────────── */

const HotelDataModalAdmin = ({
	open,
	onClose,
	hotelDoc,
	admin,
	token,
	language,
	refreshCard,
}) => {
	const [form] = Form.useForm();
	const save = useSaveWrapper(hotelDoc, admin, token, refreshCard, onClose);

	const handleSave = () => form.validateFields().then((vals) => save(vals));

	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={handleSave}
			okText={language === "Arabic" ? "حفظ" : "Save"}
			width={700}
			title={language === "Arabic" ? "بيانات الفندق" : "Hotel data"}
			destroyOnClose
		>
			<Form
				form={form}
				layout='vertical'
				initialValues={{
					hotelName: hotelDoc.hotelName,
					aboutHotel: hotelDoc.aboutHotel,
					aboutHotelArabic: hotelDoc.aboutHotelArabic,
					overallRoomsCount: hotelDoc.overallRoomsCount,
				}}
			>
				<Form.Item
					name='hotelName'
					label={language === "Arabic" ? "إسم الفندق" : "Hotel name"}
					rules={[{ required: true, message: "required" }]}
				>
					<Input />
				</Form.Item>
				<Form.Item
					name='aboutHotel'
					label={language === "Arabic" ? "الوصف إنجليزي" : "Description (EN)"}
				>
					<Input.TextArea rows={3} />
				</Form.Item>
				<Form.Item
					name='aboutHotelArabic'
					label={language === "Arabic" ? "الوصف عربي" : "Description (AR)"}
				>
					<Input.TextArea rows={3} />
				</Form.Item>
				<Form.Item
					name='overallRoomsCount'
					label={language === "Arabic" ? "إجمالي الغرف" : "Total rooms"}
				>
					<Input type='number' />
				</Form.Item>
			</Form>
		</Modal>
	);
};

/* ───────────────────────── MODAL #5  – Bank details / payout ───────────────────────── */

const BankDetailsModalAdmin = ({
	open,
	onClose,
	hotelDoc,
	admin,
	token,
	language,
	refreshCard,
}) => {
	const [form] = Form.useForm();
	const save = useSaveWrapper(hotelDoc, admin, token, refreshCard, onClose);

	const handleSave = () =>
		form.validateFields().then(({ bankName, iban }) =>
			save({
				paymentSettings: [{ bankName, iban }],
			})
		);

	const initial =
		hotelDoc.paymentSettings && hotelDoc.paymentSettings.length
			? hotelDoc.paymentSettings[0]
			: { bankName: "", iban: "" };

	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={handleSave}
			okText={language === "Arabic" ? "حفظ" : "Save"}
			title={language === "Arabic" ? "البيانات البنكية" : "Bank details"}
			destroyOnClose
		>
			<Form form={form} layout='vertical' initialValues={initial}>
				<Form.Item
					name='bankName'
					label={language === "Arabic" ? "إسم البنك" : "Bank name"}
					rules={[{ required: true, message: "required" }]}
				>
					<Input />
				</Form.Item>
				<Form.Item
					name='iban'
					label={language === "Arabic" ? "IBAN" : "IBAN"}
					rules={[{ required: true, message: "required" }]}
				>
					<Input />
				</Form.Item>
			</Form>
		</Modal>
	);
};

/* ───────────────────────── REGISTRY ───────────────────────── */

export const STEP_MODAL_REGISTRY_ADMIN = {
	1: RoomTypesModalAdmin, // Room types & pricing
	2: PhotosModalAdmin, // Hotel photos
	3: LocationModalAdmin, // Pin location
	4: HotelDataModalAdmin, // General hotel data
	5: BankDetailsModalAdmin, // Payment / payout
};
