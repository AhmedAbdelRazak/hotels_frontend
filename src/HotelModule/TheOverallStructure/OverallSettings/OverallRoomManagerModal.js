import React, { useEffect, useMemo, useState } from "react";
import {
	Button,
	Checkbox,
	Form,
	Input,
	InputNumber,
	message,
	Modal,
	Select,
	Tabs,
} from "antd";
import {
	EditOutlined,
	PlusCircleOutlined,
	SaveOutlined,
} from "@ant-design/icons";
import styled, { createGlobalStyle } from "styled-components";
import {
	getOverallRoomManagerOptions,
	saveOverallRoomManagerRoom,
} from "../../apiAdmin";
import {
	buildOwnerParams,
	OVERALL_DASHBOARD_MODAL_ROOT_CLASS,
	OVERALL_DASHBOARD_MODAL_WRAP_CLASS,
	OVERALL_DASHBOARD_MODAL_Z_INDEX,
	titleCase,
} from "../overallShared";

const ROOM_TYPES = [
	{ value: "singleRooms", en: "Single Rooms", ar: "\u063a\u0631\u0641 \u0641\u0631\u062f\u064a\u0629" },
	{ value: "doubleRooms", en: "Double Rooms", ar: "\u063a\u0631\u0641 \u0645\u0632\u062f\u0648\u062c\u0629" },
	{ value: "tripleRooms", en: "Triple Rooms", ar: "\u063a\u0631\u0641 \u062b\u0644\u0627\u062b\u064a\u0629" },
	{ value: "quadRooms", en: "Quad Rooms", ar: "\u063a\u0631\u0641 \u0631\u0628\u0627\u0639\u064a\u0629" },
	{ value: "familyRooms", en: "Quintuple Rooms", ar: "\u063a\u0631\u0641 \u062e\u0645\u0627\u0633\u064a\u0629" },
	{
		value: "individualBed",
		en: "Rooms With Individual Beds",
		ar: "\u063a\u0631\u0641 \u0628\u0623\u0633\u0631\u0629 \u0645\u0646\u0641\u0631\u062f\u0629 \u0645\u0634\u062a\u0631\u0643\u0629",
	},
	{ value: "standardRooms", en: "Standard Rooms", ar: "\u063a\u0631\u0641 \u0642\u064a\u0627\u0633\u064a\u0629" },
	{ value: "twinRooms", en: "Twin Rooms", ar: "\u063a\u0631\u0641 \u062a\u0648\u0623\u0645" },
	{ value: "queenRooms", en: "Queen Rooms", ar: "\u063a\u0631\u0641 \u0643\u0648\u064a\u0646" },
	{ value: "kingRooms", en: "King Rooms", ar: "\u063a\u0631\u0641 \u0643\u064a\u0646\u062c" },
	{ value: "studioRooms", en: "Studio Rooms", ar: "\u063a\u0631\u0641 \u0627\u0633\u062a\u0648\u062f\u064a\u0648" },
	{ value: "suite", en: "Suite", ar: "\u062c\u0646\u0627\u062d" },
	{ value: "masterSuite", en: "Master Suite", ar: "\u062c\u0646\u0627\u062d \u0631\u0626\u064a\u0633\u064a" },
];
const ROOM_TYPE_CHOICES = ROOM_TYPES.flatMap((room) =>
	room.value === "individualBed"
		? [
				{
					value: "individualBed|For Men",
					roomType: "individualBed",
					roomForGender: "For Men",
					en: "Shared Room for Men",
					ar: "\u063a\u0631\u0641\u0629 \u0645\u0634\u062a\u0631\u0643\u0629 \u0644\u0644\u0631\u062c\u0627\u0644",
				},
				{
					value: "individualBed|For Women",
					roomType: "individualBed",
					roomForGender: "For Women",
					en: "Shared Room for Women",
					ar: "\u063a\u0631\u0641\u0629 \u0645\u0634\u062a\u0631\u0643\u0629 \u0644\u0644\u0646\u0633\u0627\u0621",
				},
			]
		: [room]
);

const AMENITIES = [
	["WiFi", "\u0648\u0627\u064a \u0641\u0627\u064a"],
	["TV", "\u062a\u0644\u0641\u0627\u0632"],
	["Air Conditioning", "\u062a\u0643\u064a\u064a\u0641"],
	["Mini Bar", "\u0645\u064a\u0646\u064a \u0628\u0627\u0631"],
	["Smoking", "ÙŠØ³Ù…Ø­ Ø¨Ø§Ù„ØªØ¯Ø®ÙŠÙ†"],
	["Non-Smoking", "ØºÙŠØ± Ù…Ø³Ù…ÙˆØ­ Ø¨Ø§Ù„ØªØ¯Ø®ÙŠÙ†"],
	["Pool", "\u0645\u0633\u0628\u062d"],
	["Gym", "\u0646\u0627\u062f\u064a \u0631\u064a\u0627\u0636\u064a"],
	["Restaurant", "\u0645\u0637\u0639\u0645"],
	["Bar", "Ø¨Ø§Ø±"],
	["Spa", "Ø³Ø¨Ø§"],
	["Room Service", "\u062e\u062f\u0645\u0629 \u0627\u0644\u063a\u0631\u0641"],
	["Laundry Service", "\u062e\u062f\u0645\u0629 \u063a\u0633\u064a\u0644"],
	["Housekeeping", "\u062e\u062f\u0645\u0629 \u062a\u0646\u0638\u064a\u0641 \u0627\u0644\u063a\u0631\u0641"],
	["Free Parking", "\u0645\u0648\u0642\u0641 \u0645\u062c\u0627\u0646\u064a"],
	["Pet Friendly", "ÙŠØ³Ù…Ø­ Ø¨Ø§Ù„Ø­ÙŠÙˆØ§Ù†Ø§Øª Ø§Ù„Ø£Ù„ÙŠÙØ©"],
	["Business Center", "Ù…Ø±ÙƒØ² Ø£Ø¹Ù…Ø§Ù„"],
	["Airport Shuttle", "Ù†Ù‚Ù„ Ù…Ù† ÙˆØ¥Ù„Ù‰ Ø§Ù„Ù…Ø·Ø§Ø±"],
	["Fitness Center", "Ù…Ø±ÙƒØ² Ù„ÙŠØ§Ù‚Ø©"],
	["Breakfast Included", "\u0627\u0644\u0625\u0641\u0637\u0627\u0631 \u0645\u0634\u0645\u0648\u0644"],
	["Accessible Rooms", "\u063a\u0631\u0641 \u0644\u0630\u0648\u064a \u0627\u0644\u0627\u062d\u062a\u064a\u0627\u062c\u0627\u062a"],
	["Bicycle Rental", "ØªØ£Ø¬ÙŠØ± Ø¯Ø±Ø§Ø¬Ø§Øª"],
	["Sauna", "Ø³Ø§ÙˆÙ†Ø§"],
	["Hot Tub", "Ø­ÙˆØ¶ Ø§Ø³ØªØ­Ù…Ø§Ù… Ø³Ø§Ø®Ù†"],
	["Golf Course", "Ù…Ù„Ø¹Ø¨ Ø¬ÙˆÙ„Ù"],
	["Tennis Court", "Ù…Ù„Ø¹Ø¨ ØªÙ†Ø³"],
	["Kids' Club", "Ù†Ø§Ø¯ÙŠ Ø£Ø·ÙØ§Ù„"],
	["Beachfront", "Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø§Ø·Ø¦"],
];

const VIEWS = [
	["Sea View", "\u0625\u0637\u0644\u0627\u0644\u0629 \u0628\u062d\u0631"],
	["Street View", "\u0625\u0637\u0644\u0627\u0644\u0629 \u0634\u0627\u0631\u0639"],
	["Garden View", "\u0625\u0637\u0644\u0627\u0644\u0629 \u062d\u062f\u064a\u0642\u0629"],
	["City View", "\u0625\u0637\u0644\u0627\u0644\u0629 \u0645\u062f\u064a\u0646\u0629"],
	["Mountain View", "\u0625\u0637\u0644\u0627\u0644\u0629 \u062c\u0628\u0644"],
	["Holy Haram View", "\u0625\u0637\u0644\u0627\u0644\u0629 \u0627\u0644\u062d\u0631\u0645"],
];

const EXTRA_AMENITIES = [
	["Prayer Mat", "\u0633\u062c\u0627\u062f\u0629 \u0635\u0644\u0627\u0629"],
	["Holy Quran", "\u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u0643\u0631\u064a\u0645"],
	["Islamic Television Channels", "\u0642\u0646\u0648\u0627\u062a \u0625\u0633\u0644\u0627\u0645\u064a\u0629"],
	["Shuttle Service to Haram", "\u062e\u062f\u0645\u0629 \u0646\u0642\u0644 \u0644\u0644\u062d\u0631\u0645"],
	["Nearby Souks/Markets", "Ø£Ø³ÙˆØ§Ù‚ Ù‚Ø±ÙŠØ¨Ø©"],
	["Arabic Coffee & Dates Service", "Ø®Ø¯Ù…Ø© Ø§Ù„Ù‚Ù‡ÙˆØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© ÙˆØ§Ù„ØªÙ…Ø±"],
	["Cultural Tours/Guides", "Ø¬ÙˆÙ„Ø§Øª ÙˆÙ…Ø±Ø´Ø¯ÙˆÙ† Ø«Ù‚Ø§ÙÙŠÙˆÙ†"],
	["Private Pilgrimage Services", "Ø®Ø¯Ù…Ø§Øª Ø­Ø¬ ÙˆØ¹Ù…Ø±Ø© Ø®Ø§ØµØ©"],
	["Complimentary Zamzam Water", "\u0645\u0627\u0621 \u0632\u0645\u0632\u0645 \u0645\u062c\u0627\u0646\u064a"],
	["Halal-certified Restaurant", "\u0645\u0637\u0639\u0645 \u062d\u0644\u0627\u0644"],
	["Hajj & Umrah Booking Assistance", "Ù…Ø³Ø§Ø¹Ø¯Ø© ÙÙŠ Ø­Ø¬Ø² Ø§Ù„Ø­Ø¬ ÙˆØ§Ù„Ø¹Ù…Ø±Ø©"],
	["Dedicated Prayer Room", "ØºØ±ÙØ© ØµÙ„Ø§Ø© Ù…Ø®ØµØµØ©"],
];

const ARABIC_OPTION_LABELS = {
	Smoking: "\u064a\u0633\u0645\u062d \u0628\u0627\u0644\u062a\u062f\u062e\u064a\u0646",
	"Non-Smoking": "\u063a\u064a\u0631 \u0645\u0633\u0645\u0648\u062d \u0628\u0627\u0644\u062a\u062f\u062e\u064a\u0646",
	Bar: "\u0628\u0627\u0631",
	Spa: "\u0633\u0628\u0627",
	Housekeeping: "\u062e\u062f\u0645\u0629 \u062a\u0646\u0638\u064a\u0641 \u0627\u0644\u063a\u0631\u0641",
	"Pet Friendly": "\u064a\u0633\u0645\u062d \u0628\u0627\u0644\u062d\u064a\u0648\u0627\u0646\u0627\u062a \u0627\u0644\u0623\u0644\u064a\u0641\u0629",
	"Business Center": "\u0645\u0631\u0643\u0632 \u0623\u0639\u0645\u0627\u0644",
	"Airport Shuttle": "\u0646\u0642\u0644 \u0645\u0646 \u0648\u0625\u0644\u0649 \u0627\u0644\u0645\u0637\u0627\u0631",
	"Fitness Center": "\u0645\u0631\u0643\u0632 \u0644\u064a\u0627\u0642\u0629",
	"Bicycle Rental": "\u062a\u0623\u062c\u064a\u0631 \u062f\u0631\u0627\u062c\u0627\u062a",
	Sauna: "\u0633\u0627\u0648\u0646\u0627",
	"Hot Tub": "\u062d\u0648\u0636 \u0627\u0633\u062a\u062d\u0645\u0627\u0645 \u0633\u0627\u062e\u0646",
	"Golf Course": "\u0645\u0644\u0639\u0628 \u062c\u0648\u0644\u0641",
	"Tennis Court": "\u0645\u0644\u0639\u0628 \u062a\u0646\u0633",
	"Kids' Club": "\u0646\u0627\u062f\u064a \u0623\u0637\u0641\u0627\u0644",
	Beachfront: "\u0639\u0644\u0649 \u0627\u0644\u0634\u0627\u0637\u0626",
	"Nearby Souks/Markets": "\u0623\u0633\u0648\u0627\u0642 \u0642\u0631\u064a\u0628\u0629",
	"Arabic Coffee & Dates Service": "\u062e\u062f\u0645\u0629 \u0627\u0644\u0642\u0647\u0648\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0648\u0627\u0644\u062a\u0645\u0631",
	"Cultural Tours/Guides": "\u062c\u0648\u0644\u0627\u062a \u0648\u0645\u0631\u0634\u062f\u0648\u0646 \u062b\u0642\u0627\u0641\u064a\u0648\u0646",
	"Private Pilgrimage Services": "\u062e\u062f\u0645\u0627\u062a \u062d\u062c \u0648\u0639\u0645\u0631\u0629 \u062e\u0627\u0635\u0629",
	"Hajj & Umrah Booking Assistance": "\u0645\u0633\u0627\u0639\u062f\u0629 \u0641\u064a \u062d\u062c\u0632 \u0627\u0644\u062d\u062c \u0648\u0627\u0644\u0639\u0645\u0631\u0629",
	"Dedicated Prayer Room": "\u063a\u0631\u0641\u0629 \u0635\u0644\u0627\u0629 \u0645\u062e\u0635\u0635\u0629",
};

const DEFAULT_AMENITIES = [
	"WiFi",
	"Laundry Service",
	"Non-Smoking",
	"Housekeeping",
	"Air Conditioning",
	"TV",
];
const DEFAULT_VIEWS = ["Street View"];
const DEFAULT_EXTRA_AMENITIES = [
	"Prayer Mat",
	"Islamic Television Channels",
	"Nearby Souks/Markets",
];

const TEXT = {
	en: {
		title: "Room Add / Update",
		hotel: "Hotel",
		hotels: "Hotels",
		room: "Room",
		roomType: "Room type",
		name: "Room name",
		description: "Description",
		roomCount: "Room count",
		roomCountFor: "Room count for",
		basePrice: "Base price",
		basePriceFor: "Base price for",
		basePriceRequired: "Base price is required",
		amenities: "Amenities",
		views: "Views",
		extraAmenities: "Extra amenities",
		addTab: "Add a new room",
		updateTab: "Update rooms",
		saveAdd: "Add room",
		saveUpdate: "Update room",
		chooseHotel: "Choose hotel",
		chooseHotels: "Choose hotels",
		chooseRoom: "Choose room",
		required: "Required",
		saved: "Room saved successfully",
		loading: "Loading rooms",
	},
	ar: {
		title: "\u0625\u0636\u0627\u0641\u0629 / \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u063a\u0631\u0641",
		hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
		hotels: "\u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		room: "\u0627\u0644\u063a\u0631\u0641\u0629",
		roomType: "\u0646\u0648\u0639 \u0627\u0644\u063a\u0631\u0641\u0629",
		name: "\u0627\u0633\u0645 \u0627\u0644\u063a\u0631\u0641\u0629",
		description: "\u0627\u0644\u0648\u0635\u0641",
		roomCount: "\u0639\u062f\u062f \u0627\u0644\u063a\u0631\u0641",
		roomCountFor: "\u0639\u062f\u062f \u0627\u0644\u063a\u0631\u0641 \u0644\u0640",
		basePrice: "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0623\u0633\u0627\u0633\u064a",
		basePriceFor: "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0623\u0633\u0627\u0633\u064a \u0644\u0640",
		basePriceRequired: "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0623\u0633\u0627\u0633\u064a \u0645\u0637\u0644\u0648\u0628",
		amenities: "\u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u0631\u0627\u062d\u0629",
		views: "\u0627\u0644\u0625\u0637\u0644\u0627\u0644\u0627\u062a",
		extraAmenities: "\u0645\u0645\u064a\u0632\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629",
		addTab: "\u0625\u0636\u0627\u0641\u0629 \u063a\u0631\u0641\u0629 \u062c\u062f\u064a\u062f\u0629",
		updateTab: "\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u063a\u0631\u0641",
		saveAdd: "\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u063a\u0631\u0641\u0629",
		saveUpdate: "\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u063a\u0631\u0641\u0629",
		chooseHotel: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0646\u062f\u0642",
		chooseHotels: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		chooseRoom: "\u0627\u062e\u062a\u0631 \u0627\u0644\u063a\u0631\u0641\u0629",
		required: "\u0645\u0637\u0644\u0648\u0628",
		saved: "\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u063a\u0631\u0641\u0629 \u0628\u0646\u062c\u0627\u062d",
		loading: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u063a\u0631\u0641",
	},
};

const optionLabel = (pair, isArabic) =>
	isArabic ? ARABIC_OPTION_LABELS[pair[0]] || pair[1] : pair[0];
const normalizeId = (value) => String(value?._id || value || "").trim();

const normalizeBasePriceEntry = (entry) => {
	if (entry && typeof entry === "object" && !Array.isArray(entry)) {
		return {
			price: entry.price ?? entry.basePrice,
		};
	}
	return { price: entry };
};

const parseRoomTypeChoice = (value = "") => {
	const [roomType, roomForGender] = String(value || "").split("|");
	return {
		roomType,
		roomForGender: roomForGender || "Unisex",
	};
};

const roomTypeChoiceValue = (roomType = "", roomForGender = "") => {
	if (roomType !== "individualBed") return roomType;
	return roomForGender === "For Women"
		? "individualBed|For Women"
		: "individualBed|For Men";
};

const roomOptionLabel = (room = {}, isArabic = false) => {
	const localName = isArabic
		? room.displayName_OtherLanguage || room.displayName
		: room.displayName || room.displayName_OtherLanguage;
	return localName || room.roomType || "Room";
};

const normalizeRoomManagerTab = (value) =>
	value === "update" ? "update" : "add";

const initialRoomValues = {
	hotelIds: [],
	count: 1,
	basePrice: undefined,
	countsByHotelId: {},
	basePricesByHotelId: {},
	amenities: DEFAULT_AMENITIES,
	views: DEFAULT_VIEWS,
	extraAmenities: DEFAULT_EXTRA_AMENITIES,
	activeRoom: true,
};

const OverallRoomManagerModal = ({
	open,
	onClose,
	userId,
	token,
	ownerId,
	chosenLanguage,
	onSaved,
	activeTab = "add",
	onTabChange,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const labels = TEXT[isArabic ? "ar" : "en"];
	const normalizedActiveTab = normalizeRoomManagerTab(activeTab);
	const [hotels, setHotels] = useState([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [addForm] = Form.useForm();
	const [updateForm] = Form.useForm();
	const selectPopupStyle = { zIndex: OVERALL_DASHBOARD_MODAL_Z_INDEX + 20 };
	const selectPopupClassName = `overall-dashboard-select-dropdown ${
		isArabic ? "overall-room-manager-dropdown-rtl" : ""
	}`.trim();
	const handleTabChange = (nextTab) => {
		onTabChange?.(normalizeRoomManagerTab(nextTab));
	};

	const hotelOptions = useMemo(
		() =>
			hotels.map((hotel) => ({
				value: normalizeId(hotel._id),
				label: titleCase(hotel.hotelName),
			})),
		[hotels]
	);

	const selectedAddHotelIds = Form.useWatch("hotelIds", addForm) || [];
	const selectedUpdateHotelId = Form.useWatch("hotelId", updateForm);
	const selectedUpdateRoomId = Form.useWatch("roomId", updateForm);

	const selectedAddHotels = selectedAddHotelIds
		.map((hotelId) =>
			hotels.find((hotel) => normalizeId(hotel._id) === normalizeId(hotelId))
		)
		.filter(Boolean);
	const selectedUpdateHotel = hotels.find(
		(hotel) => normalizeId(hotel._id) === normalizeId(selectedUpdateHotelId)
	);
	const updateRoomOptions = (selectedUpdateHotel?.rooms || []).map((room) => ({
		value: normalizeId(room._id),
		label: roomOptionLabel(room, isArabic),
	}));

	useEffect(() => {
		if (!open || !userId || !token) return;
		setLoading(true);
		getOverallRoomManagerOptions(userId, token, buildOwnerParams(ownerId))
			.then((data) => {
				if (data?.error) {
					message.error(data.error);
					return;
				}
				setHotels(Array.isArray(data?.hotels) ? data.hotels : []);
			})
			.finally(() => setLoading(false));
	}, [open, ownerId, token, userId]);

	useEffect(() => {
		if (!open) return;
		addForm.setFieldsValue(initialRoomValues);
		updateForm.setFieldsValue(initialRoomValues);
	}, [addForm, open, updateForm]);

	useEffect(() => {
		if (!selectedUpdateRoomId || !selectedUpdateHotel) return;
		const room = (selectedUpdateHotel.rooms || []).find(
			(item) => normalizeId(item._id) === normalizeId(selectedUpdateRoomId)
		);
		if (!room) return;
		updateForm.setFieldsValue({
			roomType: roomTypeChoiceValue(room.roomType, room.roomForGender),
			name: isArabic
				? room.displayName_OtherLanguage || room.displayName
				: room.displayName || room.displayName_OtherLanguage,
			count: Number(room.count || 0),
			basePrice: Number(room?.price?.basePrice ?? room.basePrice ?? 0),
			amenities: Array.isArray(room.amenities) ? room.amenities : [],
			views: Array.isArray(room.views) ? room.views : [],
			extraAmenities: Array.isArray(room.extraAmenities)
				? room.extraAmenities
				: [],
			activeRoom: room.activeRoom !== false,
		});
	}, [isArabic, selectedUpdateHotel, selectedUpdateRoomId, updateForm]);

	const replaceHotels = (nextHotels = []) => {
		const cleanHotels = (Array.isArray(nextHotels) ? nextHotels : [nextHotels]).filter(
			(hotel) => hotel?._id
		);
		if (!cleanHotels.length) return;
		const hotelsById = new Map(
			cleanHotels.map((hotel) => [normalizeId(hotel._id), hotel])
		);
		setHotels((current) =>
			current.map((hotel) => {
				const replacement = hotelsById.get(normalizeId(hotel._id));
				return replacement ? { ...hotel, ...replacement } : hotel;
			})
		);
		onSaved?.(cleanHotels);
	};

	const submitForm = async (mode) => {
		const form = mode === "add" ? addForm : updateForm;
		const values = await form.validateFields();
		const roomTypeChoice = parseRoomTypeChoice(values.roomType);
		setSaving(true);
		try {
			const payload = {
				action: mode,
				hotelId: mode === "update" ? values.hotelId : undefined,
				hotelIds: mode === "add" ? values.hotelIds : undefined,
				countsByHotelId: mode === "add" ? values.countsByHotelId : undefined,
				basePricesByHotelId:
					mode === "add" ? values.basePricesByHotelId : undefined,
				roomId: mode === "update" ? values.roomId : undefined,
				language: chosenLanguage,
				room: {
					roomType: roomTypeChoice.roomType,
					name: values.name,
					count: mode === "update" ? values.count : undefined,
					basePrice: mode === "update" ? values.basePrice : undefined,
					defaultCost: mode === "update" ? values.basePrice : undefined,
					amenities: values.amenities || [],
					views: values.views || [],
					extraAmenities: values.extraAmenities || [],
					activeRoom: mode === "add" ? true : undefined,
					regenerateDescription: true,
					roomForGender: roomTypeChoice.roomForGender,
				},
			};
			const data = await saveOverallRoomManagerRoom(
				userId,
				token,
				payload,
				buildOwnerParams(ownerId)
			);
			if (data?.error) {
				message.error(data.error);
				return;
			}
			replaceHotels(data.hotels || data.hotel);
			message.success(labels.saved);
			if (mode === "add") {
				form.setFieldsValue({
					...initialRoomValues,
					hotelIds: values.hotelIds,
					countsByHotelId: values.countsByHotelId,
					basePricesByHotelId: values.basePricesByHotelId,
					roomType: undefined,
					name: "",
				});
			}
		} finally {
			setSaving(false);
		}
	};

	const renderRoomForm = (mode) => {
		const form = mode === "add" ? addForm : updateForm;
		const selectedHotelId =
			mode === "add" ? selectedAddHotelIds[0] : selectedUpdateHotelId;
		return (
			<Form
				form={form}
				layout='vertical'
				initialValues={initialRoomValues}
				requiredMark={false}
			>
				<FirstRow $hasRoomSelect={mode === "update"}>
					<Form.Item
						name={mode === "add" ? "hotelIds" : "hotelId"}
						label={mode === "add" ? labels.hotels : labels.hotel}
						rules={[
							mode === "add"
								? {
										required: true,
										type: "array",
										min: 1,
										message: labels.required,
								  }
								: { required: true, message: labels.required },
						]}
					>
						<Select
							showSearch
							mode={mode === "add" ? "multiple" : undefined}
							maxTagCount='responsive'
							allowClear={mode === "add"}
							loading={loading}
							placeholder={
								mode === "add" ? labels.chooseHotels : labels.chooseHotel
							}
							options={hotelOptions}
							optionFilterProp='label'
							popupStyle={selectPopupStyle}
							popupClassName={selectPopupClassName}
							onChange={(value) => {
								if (mode === "add") {
									const ids = Array.isArray(value) ? value : [];
									const currentCounts = form.getFieldValue("countsByHotelId") || {};
									const currentBasePrices =
										form.getFieldValue("basePricesByHotelId") || {};
									const nextCounts = {};
									const nextBasePrices = {};
									ids.forEach((hotelId) => {
										nextCounts[hotelId] = currentCounts[hotelId] ?? 1;
										nextBasePrices[hotelId] = normalizeBasePriceEntry(
											currentBasePrices[hotelId]
										);
									});
									form.setFieldsValue({
										countsByHotelId: nextCounts,
										basePricesByHotelId: nextBasePrices,
									});
									return;
								}
								form.setFieldsValue({
									roomId: undefined,
									roomType: undefined,
									name: "",
									count: undefined,
									basePrice: undefined,
									amenities: DEFAULT_AMENITIES,
									views: DEFAULT_VIEWS,
									extraAmenities: DEFAULT_EXTRA_AMENITIES,
								});
							}}
						/>
					</Form.Item>
					{mode === "update" ? (
						<Form.Item
							name='roomId'
							label={labels.room}
							rules={[{ required: true, message: labels.required }]}
						>
							<Select
								showSearch
								disabled={!selectedHotelId}
								placeholder={labels.chooseRoom}
								options={updateRoomOptions}
								optionFilterProp='label'
								popupStyle={selectPopupStyle}
								popupClassName={selectPopupClassName}
							/>
						</Form.Item>
					) : null}
					<Form.Item
						name='roomType'
						label={labels.roomType}
						rules={[{ required: true, message: labels.required }]}
					>
						<Select
							showSearch
							placeholder={labels.roomType}
							optionFilterProp='label'
							popupStyle={selectPopupStyle}
							popupClassName={selectPopupClassName}
							options={ROOM_TYPE_CHOICES.map((room) => ({
								value: room.value,
								label: isArabic ? room.ar : room.en,
							}))}
						/>
					</Form.Item>
					<Form.Item
						name='name'
						label={labels.name}
						rules={[{ required: true, message: labels.required }]}
					>
						<Input dir='auto' />
					</Form.Item>
				</FirstRow>

				{mode === "add" && selectedAddHotels.length ? (
					<HotelRoomSetupGrid>
						{selectedAddHotels.map((hotel) => {
							const hotelId = normalizeId(hotel._id);
							const hotelName = titleCase(hotel.hotelName);
							return (
								<HotelRoomSetupCard key={hotelId}>
									<Form.Item
										name={["countsByHotelId", hotelId]}
										label={`${labels.roomCountFor} ${hotelName}`}
										rules={[{ required: true, message: labels.required }]}
									>
										<InputNumber min={0} precision={0} />
									</Form.Item>
									<Form.Item
										name={["basePricesByHotelId", hotelId, "price"]}
										label={`${labels.basePriceFor} ${hotelName}`}
										rules={[
											{ required: true, message: labels.basePriceRequired },
											{
												validator: (_, value) =>
													Number(value) > 0
														? Promise.resolve()
														: Promise.reject(new Error(labels.basePriceRequired)),
											},
										]}
									>
										<InputNumber min={0.01} precision={2} />
									</Form.Item>
								</HotelRoomSetupCard>
							);
						})}
					</HotelRoomSetupGrid>
				) : null}

				{mode === "update" && selectedUpdateRoomId ? (
					<HotelRoomSetupGrid $single>
						<HotelRoomSetupCard>
							<Form.Item
								name='count'
								label={`${labels.roomCountFor} ${
									selectedUpdateHotel
										? titleCase(selectedUpdateHotel.hotelName)
										: ""
								}`}
								rules={[{ required: true, message: labels.required }]}
							>
								<InputNumber min={0} precision={0} />
							</Form.Item>
							<Form.Item
								name='basePrice'
								label={`${labels.basePriceFor} ${
									selectedUpdateHotel
										? titleCase(selectedUpdateHotel.hotelName)
										: ""
								}`}
								rules={[
									{ required: true, message: labels.basePriceRequired },
									{
										validator: (_, value) =>
											Number(value) > 0
												? Promise.resolve()
												: Promise.reject(new Error(labels.basePriceRequired)),
									},
								]}
							>
								<InputNumber min={0.01} precision={2} />
							</Form.Item>
						</HotelRoomSetupCard>
					</HotelRoomSetupGrid>
				) : null}

				<OptionsRow>
					<Form.Item
						name='amenities'
						label={labels.amenities}
						className='option-panel option-panel-amenities'
					>
						<Checkbox.Group
							options={AMENITIES.map((item) => ({
								value: item[0],
								label: optionLabel(item, isArabic),
							}))}
						/>
					</Form.Item>
					<Form.Item
						name='views'
						label={labels.views}
						className='option-panel option-panel-views'
					>
						<Checkbox.Group
							options={VIEWS.map((item) => ({
								value: item[0],
								label: optionLabel(item, isArabic),
							}))}
						/>
					</Form.Item>
					<Form.Item
						name='extraAmenities'
						label={labels.extraAmenities}
						className='option-panel option-panel-extra'
					>
						<Checkbox.Group
							options={EXTRA_AMENITIES.map((item) => ({
								value: item[0],
								label: optionLabel(item, isArabic),
							}))}
						/>
					</Form.Item>
				</OptionsRow>

				<FooterBar>
					<Button
						type='primary'
						size='large'
						icon={<SaveOutlined />}
						loading={saving}
						onClick={() => submitForm(mode)}
					>
						{mode === "add" ? labels.saveAdd : labels.saveUpdate}
					</Button>
				</FooterBar>
			</Form>
		);
	};

	return (
		<>
			<RoomManagerGlobalStyle />
			<Modal
				open={open}
				onCancel={onClose}
				footer={null}
				width='min(1380px, 98vw)'
				centered
				className='overall-room-manager-modal'
				rootClassName={OVERALL_DASHBOARD_MODAL_ROOT_CLASS}
				wrapClassName={OVERALL_DASHBOARD_MODAL_WRAP_CLASS}
				zIndex={OVERALL_DASHBOARD_MODAL_Z_INDEX}
				destroyOnClose={false}
				styles={{
					mask: {
						zIndex: OVERALL_DASHBOARD_MODAL_Z_INDEX - 1,
					},
					body: {
						maxHeight: "calc(100vh - 38px)",
						overflowY: "auto",
						paddingTop: 0,
						paddingBottom: 6,
					},
				}}
			>
				<RoomManagerBody dir={isArabic ? "rtl" : "ltr"} $isArabic={isArabic}>
					<Tabs
						activeKey={normalizedActiveTab}
						onChange={handleTabChange}
						items={[
							{
								key: "add",
								label: (
									<span className='room-manager-tab-label'>
										<PlusCircleOutlined /> {labels.addTab}
									</span>
								),
								children: renderRoomForm("add"),
							},
							{
								key: "update",
								label: (
									<span className='room-manager-tab-label'>
										<EditOutlined /> {labels.updateTab}
									</span>
								),
								children: renderRoomForm("update"),
							},
						]}
					/>
				</RoomManagerBody>
			</Modal>
		</>
	);
};

export default OverallRoomManagerModal;

const RoomManagerGlobalStyle = createGlobalStyle`
	.${OVERALL_DASHBOARD_MODAL_ROOT_CLASS} .ant-modal-mask {
		z-index: ${OVERALL_DASHBOARD_MODAL_Z_INDEX - 1} !important;
	}

	.${OVERALL_DASHBOARD_MODAL_ROOT_CLASS} .ant-modal-wrap,
	.ant-modal-wrap.${OVERALL_DASHBOARD_MODAL_WRAP_CLASS},
	.${OVERALL_DASHBOARD_MODAL_ROOT_CLASS} .ant-modal {
		z-index: ${OVERALL_DASHBOARD_MODAL_Z_INDEX} !important;
	}

	.${OVERALL_DASHBOARD_MODAL_ROOT_CLASS} .ant-modal-content,
	.ant-modal-wrap.${OVERALL_DASHBOARD_MODAL_WRAP_CLASS} .ant-modal-content {
		position: relative;
		z-index: ${OVERALL_DASHBOARD_MODAL_Z_INDEX + 1} !important;
	}

	.ant-select-dropdown.overall-dashboard-select-dropdown {
		z-index: ${OVERALL_DASHBOARD_MODAL_Z_INDEX + 20} !important;
	}

	.overall-room-manager-modal .ant-modal-content {
		border-radius: 10px;
	}

	.overall-room-manager-modal .ant-modal-close {
		top: 8px;
	}

	.overall-room-manager-modal .ant-tabs-nav {
		padding: 2px 54px 0;
	}

	.overall-room-manager-dropdown-rtl {
		direction: rtl;
		text-align: right;
	}

	.overall-room-manager-dropdown-rtl .ant-select-item-option-content {
		text-align: right;
	}
`;

const RoomManagerBody = styled.div`
	.ant-tabs-nav {
		margin-bottom: 14px;
	}

	.ant-tabs-nav-wrap {
		justify-content: center;
	}

	.ant-tabs-nav::before {
		display: none;
	}

	.ant-tabs-nav-list {
		gap: 10px;
		padding: 7px;
		border: 1px solid #cfe0f2;
		border-radius: 8px;
		background: linear-gradient(135deg, #f8fbff 0%, #eef7ff 100%);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.92),
			0 8px 18px rgba(15, 23, 42, 0.05);
	}

	.ant-tabs-tab {
		position: relative;
		margin: 0 !important;
		min-width: 172px;
		min-height: 46px;
		padding: 0 18px !important;
		border: 1px solid #d6e4f3;
		border-radius: 7px;
		background: #ffffff;
		color: #1f3a59 !important;
		font-weight: 900;
		box-shadow: 0 5px 12px rgba(15, 23, 42, 0.04);
		transition:
			background 160ms ease,
			border-color 160ms ease,
			color 160ms ease,
			box-shadow 160ms ease,
			transform 160ms ease;
	}

	.ant-tabs-tab .ant-tabs-tab-btn {
		width: 100%;
		color: #1f3a59 !important;
	}

	.room-manager-tab-label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		font-size: 0.93rem;
		font-weight: 950;
		line-height: 1.1;
		white-space: nowrap;
	}

	.room-manager-tab-label svg {
		font-size: 1.05rem;
	}

	.ant-tabs-tab:hover {
		border-color: #99f6e4;
		background: #ecfdf5;
		color: #0f766e !important;
		box-shadow: 0 8px 18px rgba(15, 118, 110, 0.12);
	}

	.ant-tabs-tab-active {
		border-color: rgba(45, 212, 191, 0.82) !important;
		background: linear-gradient(
			135deg,
			#064e3b 0%,
			#0f766e 44%,
			#2dd4bf 66%,
			#07564f 100%
		) !important;
		box-shadow:
			0 12px 24px rgba(15, 118, 110, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.22);
		transform: translateY(-1px);
	}

	.ant-tabs-tab:nth-child(2).ant-tabs-tab-active {
		border-color: rgba(96, 165, 250, 0.82) !important;
		background: linear-gradient(
			135deg,
			#1e3a8a 0%,
			#2563eb 45%,
			#60a5fa 68%,
			#1d4ed8 100%
		) !important;
		box-shadow:
			0 12px 24px rgba(37, 99, 235, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.22);
	}

	.ant-tabs-tab-active .ant-tabs-tab-btn,
	.ant-tabs-tab-active .room-manager-tab-label,
	.ant-tabs-tab-active .room-manager-tab-label * {
		color: #ffffff !important;
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.18);
	}

	@media (max-width: 620px) {
		.ant-tabs-nav-list {
			width: 100%;
		}

		.ant-tabs-tab {
			flex: 1 1 0;
			min-width: 0;
			padding-inline: 10px !important;
		}

		.room-manager-tab-label {
			font-size: 0.82rem;
			white-space: normal;
		}
	}

	.ant-tabs-ink-bar {
		display: none;
	}

	.ant-form-item {
		margin-bottom: 8px;
	}

	.ant-form-item-label {
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	}

	.ant-form-item-label > label {
		color: #172033;
		font-size: 0.82rem;
		font-weight: 900;
	}

	.ant-input,
	.ant-input-number,
	.ant-select-selector {
		border-radius: 6px !important;
	}

	.ant-input-number {
		width: 100%;
	}

	.ant-input,
	.ant-select-selection-item,
	.ant-select-selection-placeholder,
	.ant-input-number-input {
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	}

	.ant-checkbox-group {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(172px, 1fr));
		gap: 4px 8px;
		width: 100%;
	}

	.ant-checkbox-wrapper {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		width: 100%;
		margin-inline-start: 0;
		padding: 4px 6px;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 850;
		line-height: 1.35;
		white-space: normal;
	}

	.ant-checkbox-wrapper:hover {
		background: #f0fdfa;
	}

	.ant-checkbox + span {
		flex: 1;
		padding-inline: 0;
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	}

	.option-panel {
		margin-bottom: 0;
	}

	.option-panel .ant-form-item-label {
		padding-bottom: 6px;
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	}

	.option-panel-extra .ant-checkbox-group {
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
	}

	.option-panel-amenities .ant-checkbox-group {
		grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
	}
`;

const FirstRow = styled.div`
	display: grid;
	grid-template-columns: ${(props) =>
		props.$hasRoomSelect
			? "minmax(170px, 1fr) minmax(170px, 1fr) minmax(170px, 0.9fr) minmax(220px, 1.05fr)"
			: "minmax(240px, 1.2fr) minmax(180px, 0.82fr) minmax(220px, 1fr)"};
	gap: 10px;
	align-items: start;

	@media (max-width: 980px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 620px) {
		grid-template-columns: 1fr;
		gap: 6px;
	}
`;

const HotelRoomSetupGrid = styled.div`
	display: grid;
	grid-auto-flow: row;
	grid-template-columns: ${(props) =>
		props.$single ? "minmax(0, 1fr) 2fr" : "repeat(3, minmax(0, 1fr))"};
	gap: 10px;
	width: 100%;
	margin: 2px 0 4px;
	padding: 10px;
	border: 1px solid #cfe1f5;
	border-radius: 8px;
	background: linear-gradient(135deg, #f8fbff 0%, #ecfdf5 100%);

	> * {
		min-width: 0;
	}

	@media (max-width: 900px) {
		grid-template-columns: ${(props) =>
			props.$single ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))"};
	}

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
	}
`;

const HotelRoomSetupCard = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
	min-width: 0;
	padding: 8px 10px;
	border: 1px solid rgba(14, 116, 144, 0.16);
	border-radius: 7px;
	background: rgba(255, 255, 255, 0.86);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);

	.ant-form-item {
		min-width: 0;
		margin-bottom: 0;
	}

	.ant-form-item-label {
		max-width: 100%;
		overflow: hidden;
		padding-bottom: 5px;
	}

	.ant-form-item-label > label {
		display: block;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ant-input-number {
		width: 100%;
	}

	@media (max-width: 620px) {
		grid-template-columns: 1fr;
		gap: 6px;
	}
`;

const OptionsRow = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1.16fr) minmax(0, 0.76fr) minmax(0, 1.34fr);
	gap: 10px;
	margin-top: 8px;

	> .ant-form-item {
		min-width: 0;
		min-height: 310px;
		padding: 12px 14px;
		border: 1px solid #dce7ee;
		border-radius: 8px;
		background: #ffffff;
	}

	@media (max-width: 980px) {
		grid-template-columns: 1fr;
	}
`;

const FooterBar = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin-top: 2px;
	padding-top: 8px;

	.ant-btn {
		min-width: 190px;
		min-height: 44px;
		border: 0;
		border-radius: 8px;
		font-weight: 900;
		background: linear-gradient(
			135deg,
			#064e3b 0%,
			#0f766e 42%,
			#2dd4bf 62%,
			#07564f 100%
		);
		box-shadow: 0 12px 24px rgba(15, 118, 110, 0.24);
	}

	@media (max-width: 620px) {
		align-items: stretch;
		flex-direction: column;

		.ant-btn {
			width: 100%;
		}
	}
`;
