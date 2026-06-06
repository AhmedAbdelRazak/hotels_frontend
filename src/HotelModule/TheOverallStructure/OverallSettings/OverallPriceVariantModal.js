import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Button,
	Empty,
	Form,
	Input,
	InputNumber,
	message,
	Modal,
	Radio,
	Select,
	Tabs,
	Tag,
} from "antd";
import {
	DatabaseOutlined,
	DeleteOutlined,
	DollarOutlined,
	EditOutlined,
	EyeOutlined,
	LeftOutlined,
	PercentageOutlined,
	PlusOutlined,
	RightOutlined,
	SaveOutlined,
	StopOutlined,
	TagsOutlined,
	TeamOutlined,
	UnorderedListOutlined,
} from "@ant-design/icons";
import moment from "moment-hijri";
import styled, { createGlobalStyle } from "styled-components";
import {
	getOverallPriceVariantsOptions,
	saveOverallPriceVariants,
} from "../../apiAdmin";
import {
	buildOwnerParams,
	OVERALL_DASHBOARD_MODAL_ROOT_CLASS,
	OVERALL_DASHBOARD_MODAL_WRAP_CLASS,
	OVERALL_DASHBOARD_MODAL_Z_INDEX,
	titleCase,
} from "../overallShared";
import OverallCalendarPricingModal from "./OverallCalendarPricingModal";

const VARIANT_TAB_ADD = "add";
const VARIANT_TAB_UPDATE = "update";
const VARIANT_TAB_AGENTS = "agents";

const normalizeVariantTab = (value) =>
	[VARIANT_TAB_UPDATE, VARIANT_TAB_AGENTS].includes(value)
		? value
		: VARIANT_TAB_ADD;

const hijriMonthsEn = [
	"Muharram",
	"Safar",
	"Rabi al-Awwal",
	"Rabi al-Thani",
	"Jumada al-Awwal",
	"Jumada al-Thani",
	"Rajab",
	"Shaaban",
	"Ramadan",
	"Shawwal",
	"Dhul Qadah",
	"Dhul Hijjah",
];

const hijriMonthsAr = [
	"\u0645\u062d\u0631\u0645",
	"\u0635\u0641\u0631",
	"\u0631\u0628\u064a\u0639 \u0627\u0644\u0623\u0648\u0644",
	"\u0631\u0628\u064a\u0639 \u0627\u0644\u062b\u0627\u0646\u064a",
	"\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0623\u0648\u0644\u0649",
	"\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0622\u062e\u0631\u0629",
	"\u0631\u062c\u0628",
	"\u0634\u0639\u0628\u0627\u0646",
	"\u0631\u0645\u0636\u0627\u0646",
	"\u0634\u0648\u0627\u0644",
	"\u0630\u0648 \u0627\u0644\u0642\u0639\u062f\u0629",
	"\u0630\u0648 \u0627\u0644\u062d\u062c\u0629",
];

const gregorianMonthsEn = moment.months();
const gregorianMonthsAr = [
	"\u064a\u0646\u0627\u064a\u0631",
	"\u0641\u0628\u0631\u0627\u064a\u0631",
	"\u0645\u0627\u0631\u0633",
	"\u0623\u0628\u0631\u064a\u0644",
	"\u0645\u0627\u064a\u0648",
	"\u064a\u0648\u0646\u064a\u0648",
	"\u064a\u0648\u0644\u064a\u0648",
	"\u0623\u063a\u0633\u0637\u0633",
	"\u0633\u0628\u062a\u0645\u0628\u0631",
	"\u0623\u0643\u062a\u0648\u0628\u0631",
	"\u0646\u0648\u0641\u0645\u0628\u0631",
	"\u062f\u064a\u0633\u0645\u0628\u0631",
];

const TEXT = {
	en: {
		title: "Price Variants",
		addTab: "Add variant",
		updateTab: "Preview / update",
		agentsTab: "Add / Update Pricing Agents",
		hotels: "Hotels",
		rooms: "Rooms",
		chooseHotels: "Choose hotels",
		chooseRooms: "Choose rooms",
		allRoomsIncluded: "All active rooms in the selected hotels are included.",
		variant: "Price variant",
		variantFormula: "Variant adjustment from the main calendar price",
		mainCalendarSource:
			"Derived from the main calendar price. Missing dates fall back to the room base price.",
		roomPricing: "Room pricing",
		room: "Room",
		calendar: "Calendar",
		hijri: "Hijri",
		gregorian: "Gregorian",
		period: "Period",
		months: "Months",
		customRange: "Custom range",
		hijriYear: "Hijri year",
		gregorianYear: "Gregorian year",
		hijriMonths: "Hijri months",
		gregorianMonths: "Gregorian months",
		startDate: "Start date",
		endDate: "End date",
		pricingName: "Pricing name",
		sellingPrice: "Selling Price Per Night",
		commission: "Commission %",
		status: "Status",
		open: "Open",
		blocked: "Closed",
		addPrice: "Add another price",
		price: "Price",
		basePrice: "Room base price",
		derivedPricing: "Derived from Price 1",
		increase: "Increase",
		decrease: "Decrease",
		money: "Money",
		percentage: "Percentage",
		adjustmentValue: "Adjustment value",
		computedPrice: "Computed price",
		generatePreview: "Preview",
		preview: "Preview",
		close: "Close",
		day: "Day",
		date: "Date",
		pricing: "Pricing",
		mainCalendarPrice: "Main calendar price",
		variantPrice: "Variant price",
		priceSource: "Source",
		restrict: "Restrict",
		reopen: "Open",
		restrictMonth: "Block month",
		openMonth: "Open month",
		action: "Action",
		save: "Save price variant",
		required: "Required",
		completeRequiredFields:
			"Please choose hotels and complete the required variant fields.",
		saved: "Price variant saved successfully",
		tooManyDays: "Please select 370 days or fewer.",
		noRooms: "No rooms are available for the selected hotel.",
		existing: "Saved price variants",
		edit: "Edit",
		cancelEdit: "Cancel edit",
		noExisting: "No price variants saved yet.",
		dateCount: "dates",
		roomCount: "rooms",
		hotelCount: "hotels",
		hotelFilter: "Filter by hotel",
		choosePreviewHotel: "Choose hotel",
	},
	ar: {
		title: "\u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0627\u0644\u0623\u0633\u0639\u0627\u0631",
		addTab: "\u0625\u0636\u0627\u0641\u0629 \u062a\u0646\u0648\u064a\u0639",
		updateTab: "\u0645\u0639\u0627\u064a\u0646\u0629 / \u062a\u062d\u062f\u064a\u062b",
		agentsTab:
			"\u0625\u0636\u0627\u0641\u0629 / \u062a\u062d\u062f\u064a\u062b \u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u0648\u0643\u0644\u0627\u0621",
		hotels: "\u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		rooms: "\u0627\u0644\u063a\u0631\u0641",
		chooseHotels: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		chooseRooms: "\u0627\u062e\u062a\u0631 \u0627\u0644\u063a\u0631\u0641",
		allRoomsIncluded:
			"\u064a\u062a\u0645 \u0625\u062f\u0631\u0627\u062c \u0643\u0644 \u0627\u0644\u063a\u0631\u0641 \u0627\u0644\u0646\u0634\u0637\u0629 \u0641\u064a \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
		variant: "\u062a\u0646\u0648\u064a\u0639 \u0633\u0639\u0631\u064a",
		variantFormula:
			"\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062a\u0646\u0648\u064a\u0639 \u0645\u0646 \u0633\u0639\u0631 \u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
		mainCalendarSource:
			"\u064a\u062a\u0645 \u0627\u062d\u062a\u0633\u0627\u0628\u0647 \u0645\u0646 \u0633\u0639\u0631 \u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u060c \u0648\u0625\u0630\u0627 \u0644\u0645 \u064a\u0648\u062c\u062f \u0633\u0639\u0631 \u0644\u0644\u062a\u0627\u0631\u064a\u062e \u064a\u062a\u0645 \u0627\u0644\u0631\u062c\u0648\u0639 \u0644\u0633\u0639\u0631 \u0627\u0644\u063a\u0631\u0641\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064a.",
		roomPricing: "\u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u063a\u0631\u0641",
		room: "\u0627\u0644\u063a\u0631\u0641\u0629",
		calendar: "\u0627\u0644\u062a\u0642\u0648\u064a\u0645",
		hijri: "\u0647\u062c\u0631\u064a",
		gregorian: "\u0645\u064a\u0644\u0627\u062f\u064a",
		period: "\u0627\u0644\u0641\u062a\u0631\u0629",
		months: "\u0627\u0644\u0634\u0647\u0648\u0631",
		customRange: "\u0646\u0637\u0627\u0642 \u0645\u062e\u0635\u0635",
		hijriYear: "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0647\u062c\u0631\u064a\u0629",
		gregorianYear: "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u064a\u0644\u0627\u062f\u064a\u0629",
		hijriMonths: "\u0627\u0644\u0634\u0647\u0648\u0631 \u0627\u0644\u0647\u062c\u0631\u064a\u0629",
		gregorianMonths:
			"\u0627\u0644\u0634\u0647\u0648\u0631 \u0627\u0644\u0645\u064a\u0644\u0627\u062f\u064a\u0629",
		startDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629",
		endDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0646\u0647\u0627\u064a\u0629",
		pricingName: "\u0627\u0633\u0645 \u0627\u0644\u062a\u0633\u0639\u064a\u0631",
		sellingPrice: "\u0633\u0639\u0631 \u0627\u0644\u0628\u064a\u0639 \u0644\u0643\u0644 \u0644\u064a\u0644\u0629",
		commission: "\u0627\u0644\u0639\u0645\u0648\u0644\u0629 %",
		status: "\u0627\u0644\u062d\u0627\u0644\u0629",
		open: "\u0645\u0641\u062a\u0648\u062d",
		blocked: "\u0645\u063a\u0644\u0642",
		addPrice: "\u0625\u0636\u0627\u0641\u0629 \u0633\u0639\u0631 \u0622\u062e\u0631",
		price: "\u0633\u0639\u0631",
		basePrice: "\u0633\u0639\u0631 \u0627\u0644\u063a\u0631\u0641\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064a",
		derivedPricing:
			"\u0645\u062d\u0633\u0648\u0628 \u0645\u0646 \u0633\u0639\u0631 1",
		increase: "\u0632\u064a\u0627\u062f\u0629",
		decrease: "\u062e\u0635\u0645",
		money: "\u0645\u0628\u0644\u063a",
		percentage: "\u0646\u0633\u0628\u0629",
		adjustmentValue: "\u0642\u064a\u0645\u0629 \u0627\u0644\u062a\u0639\u062f\u064a\u0644",
		computedPrice: "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0645\u062d\u0633\u0648\u0628",
		generatePreview: "\u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629",
		preview: "\u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629",
		close: "\u0625\u063a\u0644\u0627\u0642",
		day: "\u064a\u0648\u0645",
		date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
		pricing: "\u0627\u0644\u062a\u0633\u0639\u064a\u0631",
		mainCalendarPrice:
			"\u0633\u0639\u0631 \u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
		variantPrice: "\u0633\u0639\u0631 \u0627\u0644\u062a\u0646\u0648\u064a\u0639",
		priceSource: "\u0627\u0644\u0645\u0635\u062f\u0631",
		restrict: "\u0645\u062d\u0638\u0648\u0631",
		reopen: "\u0641\u062a\u062d",
		restrictMonth: "\u062d\u0638\u0631 \u0627\u0644\u0634\u0647\u0631",
		openMonth: "\u0641\u062a\u062d \u0627\u0644\u0634\u0647\u0631",
		action: "\u0625\u062c\u0631\u0627\u0621",
		save: "\u062d\u0641\u0638 \u062a\u0646\u0648\u064a\u0639 \u0627\u0644\u0633\u0639\u0631",
		required: "\u0645\u0637\u0644\u0648\u0628",
		completeRequiredFields:
			"\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0648\u0627\u0633\u062a\u0643\u0645\u0627\u0644 \u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.",
		saved: "\u062a\u0645 \u062d\u0641\u0638 \u062a\u0646\u0648\u064a\u0639 \u0627\u0644\u0633\u0639\u0631 \u0628\u0646\u062c\u0627\u062d",
		tooManyDays:
			"\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 370 \u064a\u0648\u0645\u0627 \u0623\u0648 \u0623\u0642\u0644.",
		noRooms:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u063a\u0631\u0641 \u0645\u062a\u0627\u062d\u0629 \u0644\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
		existing: "\u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0623\u0633\u0639\u0627\u0631 \u0645\u062d\u0641\u0648\u0638\u0629",
		edit: "\u062a\u0639\u062f\u064a\u0644",
		cancelEdit: "\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u0639\u062f\u064a\u0644",
		noExisting:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0623\u0633\u0639\u0627\u0631 \u0645\u062d\u0641\u0648\u0638\u0629 \u0628\u0639\u062f.",
		dateCount: "\u062a\u0648\u0627\u0631\u064a\u062e",
		roomCount: "\u063a\u0631\u0641",
		hotelCount: "\u0641\u0646\u0627\u062f\u0642",
		hotelFilter: "\u062a\u0635\u0641\u064a\u0629 \u062d\u0633\u0628 \u0627\u0644\u0641\u0646\u062f\u0642",
		choosePreviewHotel: "\u0627\u062e\u062a\u0631 \u0641\u0646\u062f\u0642",
	},
};

const ROOM_TYPE_LABELS = {
	standardRooms: { en: "Standard Rooms", ar: "\u063a\u0631\u0641 \u0642\u064a\u0627\u0633\u064a\u0629" },
	singleRooms: { en: "Single Rooms", ar: "\u063a\u0631\u0641 \u0641\u0631\u062f\u064a\u0629" },
	doubleRooms: { en: "Double Rooms", ar: "\u063a\u0631\u0641 \u0645\u0632\u062f\u0648\u062c\u0629" },
	tripleRooms: { en: "Triple Rooms", ar: "\u063a\u0631\u0641 \u062b\u0644\u0627\u062b\u064a\u0629" },
	quadRooms: { en: "Quad Rooms", ar: "\u063a\u0631\u0641 \u0631\u0628\u0627\u0639\u064a\u0629" },
	familyRooms: { en: "Quintuple Rooms", ar: "\u063a\u0631\u0641 \u062e\u0645\u0627\u0633\u064a\u0629" },
	individualBed: {
		en: "Shared Room",
		ar: "\u063a\u0631\u0641\u0629 \u0645\u0634\u062a\u0631\u0643\u0629",
	},
	twinRooms: { en: "Twin Rooms", ar: "\u063a\u0631\u0641 \u062a\u0648\u0623\u0645" },
	queenRooms: { en: "Queen Rooms", ar: "\u063a\u0631\u0641 \u0643\u0648\u064a\u0646" },
	kingRooms: { en: "King Rooms", ar: "\u063a\u0631\u0641 \u0643\u064a\u0646\u062c" },
	studioRooms: { en: "Studio Rooms", ar: "\u063a\u0631\u0641 \u0627\u0633\u062a\u0648\u062f\u064a\u0648" },
	suite: { en: "Suite", ar: "\u062c\u0646\u0627\u062d" },
	masterSuite: { en: "Master Suite", ar: "\u062c\u0646\u0627\u062d \u0631\u0626\u064a\u0633\u064a" },
};

const ROOM_GENDER_LABELS = {
	"For Men": { en: "Men", ar: "\u0631\u062c\u0627\u0644" },
	"For Women": { en: "Women", ar: "\u0646\u0633\u0627\u0621" },
};

const normalizeId = (value) => String(value?._id || value || "").trim();

const uniqueIds = (values = []) =>
	[
		...new Set(
			(Array.isArray(values) ? values : [values])
				.map(normalizeId)
				.filter(Boolean)
		),
	];

const makeRoomKey = (hotelId, roomId) => `${hotelId}::${roomId}`;

const readableRoomTypeKey = (value = "") =>
	String(value || "")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/rooms?/gi, "Rooms")
		.trim();

const roomTypeLabel = (room = {}, isArabic = false) => {
	const language = isArabic ? "ar" : "en";
	const base =
		ROOM_TYPE_LABELS[room.roomType]?.[language] ||
		readableRoomTypeKey(room.roomType) ||
		(isArabic ? "\u063a\u0631\u0641\u0629" : "Room");
	const gender = ROOM_GENDER_LABELS[room.roomForGender]?.[language];
	return room.roomType === "individualBed" && gender
		? `${base} - ${gender}`
		: base;
};

const roomDisplayLabel = (room = {}, hotel = {}, isArabic = false) => {
	const displayName = isArabic
		? room.displayName_OtherLanguage || room.displayName
		: room.displayName || room.displayName_OtherLanguage;
	const typeLabel = roomTypeLabel(room, isArabic);
	const hotelName = titleCase(hotel.hotelName || "");
	return [hotelName, typeLabel, displayName].filter(Boolean).join(" - ");
};

const roomRowsForHotel = (hotel = {}, isArabic = false) =>
	(Array.isArray(hotel?.rooms) ? hotel.rooms : [])
		.filter((room) => room.activeRoom !== false)
		.map((room) => {
			const hotelId = normalizeId(hotel._id);
			const roomId = normalizeId(room._id);
			return {
				hotelId,
				roomId,
				roomKey: makeRoomKey(hotelId, roomId),
				roomType: room.roomType || "",
				displayName: room.displayName || "",
				displayNameOtherLanguage: room.displayName_OtherLanguage || "",
				roomForGender: room.roomForGender || "",
				basePrice: Number(room.basePrice ?? room.price?.basePrice ?? 0),
				defaultCost: Number(room.defaultCost ?? room.rootPrice ?? 0),
				pricingRate: Array.isArray(room.pricingRate) ? room.pricingRate : [],
				hotelName: titleCase(hotel.hotelName || ""),
				label: roomDisplayLabel(room, hotel, isArabic),
			};
		});

const roomRowsForHotels = (hotels = [], isArabic = false) =>
	(Array.isArray(hotels) ? hotels : []).flatMap((hotel) =>
		roomRowsForHotel(hotel, isArabic)
	);

const priceForRoom = (item = {}, room = {}) => {
	const prices = Array.isArray(item.roomPrices) ? item.roomPrices : [];
	return (
		prices.find((price) => normalizeId(price?.roomKey) === room.roomKey) ||
		prices.find((price) => normalizeId(price?.roomId) === room.roomId) ||
		{}
	);
};

const priceForPeriod = (roomPrice = {}, period = {}) => {
	const periodPrices = Array.isArray(roomPrice.periodPrices)
		? roomPrice.periodPrices
		: [];
	return (
		periodPrices.find(
			(price) => String(price?.periodKey || "") === String(period.periodKey)
		) || {}
	);
};

const priceForPeriodAtIndex = (roomPrice = {}, period = {}, index = 0) => {
	const byKey = priceForPeriod(roomPrice, period);
	if (Object.keys(byKey).length) return byKey;
	const periodPrices = Array.isArray(roomPrice.periodPrices)
		? roomPrice.periodPrices
		: [];
	return periodPrices[index] || {};
};

const enumerateDates = (startValue, endValue) => {
	const start = moment(startValue, "YYYY-MM-DD", true).startOf("day");
	const end = moment(endValue, "YYYY-MM-DD", true).startOf("day");
	if (!start.isValid() || !end.isValid() || end.isBefore(start)) return [];
	const dates = [];
	const cursor = start.clone();
	while (cursor.isSameOrBefore(end, "day")) {
		dates.push(cursor.format("YYYY-MM-DD"));
		cursor.add(1, "day");
	}
	return dates;
};

const normalizeDateKey = (value = "") => String(value || "").slice(0, 10);

const monthDateRange = ({ calendarType, month, year }) => {
	if (calendarType === "hijri") {
		const start = moment().iYear(Number(year)).iMonth(Number(month)).startOf("iMonth");
		const end = moment().iYear(Number(year)).iMonth(Number(month)).endOf("iMonth");
		return enumerateDates(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
	}
	const start = moment().year(Number(year)).month(Number(month)).startOf("month");
	const end = moment().year(Number(year)).month(Number(month)).endOf("month");
	return enumerateDates(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
};

const monthPeriod = ({ calendarType, month, year, isArabic = false }) => {
	const dates = monthDateRange({ calendarType, month, year });
	const monthLabels =
		calendarType === "hijri"
			? isArabic
				? hijriMonthsAr
				: hijriMonthsEn
			: isArabic
			  ? gregorianMonthsAr
			  : gregorianMonthsEn;
	return {
		periodKey: `${calendarType}:${year}:${month}`,
		label: `${monthLabels[Number(month)] || month} ${year}`,
		calendarType,
		periodMode: "months",
		year: Number(year),
		month: Number(month),
		startDate: dates[0] || "",
		endDate: dates[dates.length - 1] || "",
		dates,
	};
};

const periodDefinitionsFromValues = (values = {}, isArabic = false) => {
	if (values.periodMode === "custom") {
		const dates = enumerateDates(values.startDate, values.endDate);
		return dates.length
			? [
					{
						periodKey: `custom:${dates[0]}:${dates[dates.length - 1]}`,
						label: `${dates[0]} -> ${dates[dates.length - 1]}`,
						calendarType:
							values.calendarType === "gregorian" ? "gregorian" : "hijri",
						periodMode: "custom",
						year: null,
						month: null,
						startDate: dates[0],
						endDate: dates[dates.length - 1],
						dates,
					},
			  ]
			: [];
	}
	const calendarType = values.calendarType === "gregorian" ? "gregorian" : "hijri";
	const months =
		calendarType === "hijri" ? values.hijriMonths : values.gregorianMonths;
	const year = calendarType === "hijri" ? values.hijriYear : values.gregorianYear;
	return (Array.isArray(months) ? months : [])
		.map((month) => monthPeriod({ calendarType, month, year, isArabic }))
		.filter((period) => period.startDate && period.endDate)
		.sort((left, right) => left.startDate.localeCompare(right.startDate));
};

const formatPreviewDate = (date, isArabic = false) => {
	const m = moment(date, "YYYY-MM-DD", true);
	if (!m.isValid()) {
		return { hijri: date || "", gregorian: date || "" };
	}
	const hijriMonths = isArabic ? hijriMonthsAr : hijriMonthsEn;
	const gregorianMonths = isArabic ? gregorianMonthsAr : gregorianMonthsEn;
	return {
		hijri: `${m.iDate()} ${hijriMonths[m.iMonth()]} ${m.iYear()}`,
		gregorian: `${m.date()} ${gregorianMonths[m.month()]} ${m.year()}`,
	};
};

const monthTitle = (date, calendarType, isArabic) => {
	const m = moment(date, "YYYY-MM-DD", true);
	if (!m.isValid()) return "";
	if (calendarType === "hijri") {
		const months = isArabic ? hijriMonthsAr : hijriMonthsEn;
		return `${months[m.iMonth()]} ${m.iYear()}`;
	}
	const months = isArabic ? gregorianMonthsAr : gregorianMonthsEn;
	return `${months[m.month()]} ${m.year()}`;
};

const monthKey = (date, calendarType) => {
	const m = moment(date, "YYYY-MM-DD", true);
	if (!m.isValid()) return "";
	return calendarType === "hijri"
		? `${m.iYear()}-${String(m.iMonth()).padStart(2, "0")}`
		: m.format("YYYY-MM");
};

const buildMonthCardsFromRows = (
	rows = [],
	calendarType = "hijri",
	isArabic = false
) =>
	Object.values(
		(Array.isArray(rows) ? rows : []).reduce((acc, row) => {
			const key = monthKey(row.date, calendarType);
			if (!key) return acc;
			if (!acc[key]) {
				acc[key] = {
					key,
					firstDate: row.date,
					title: monthTitle(row.date, calendarType, isArabic),
					rows: [],
				};
			}
			acc[key].rows.push(row);
			return acc;
		}, {})
	)
		.sort((left, right) => left.firstDate.localeCompare(right.firstDate))
		.map((month) => ({
			...month,
			rows: month.rows.sort((left, right) =>
				left.date === right.date
					? `${left.pricingIndex}:${left.roomLabel || ""}`.localeCompare(
							`${right.pricingIndex}:${right.roomLabel || ""}`
					  )
					: left.date.localeCompare(right.date)
			),
		}));

const defaultPeriodPrice = (period = {}) => ({
	periodKey: period.periodKey || "",
	label: period.label || "",
	calendarType: period.calendarType || "hijri",
	periodMode: period.periodMode || "months",
	year: period.year ?? null,
	month: period.month ?? null,
	startDate: period.startDate || "",
	endDate: period.endDate || "",
	status: "open",
	sellingPrice: null,
	commissionPercent: 0,
});

const defaultRoomPrice = (room = {}, periods = []) => ({
	roomKey: room.roomKey || "",
	hotelId: room.hotelId || "",
	roomId: room.roomId || "",
	periodPrices: periods.map(defaultPeriodPrice),
});

const defaultPricingBasis = (index = 0) => ({
	mode: index === 0 ? "manual" : "derived",
	direction: "decrease",
	adjustmentType: "percentage",
	amount: 0,
});

const pricingBasisForItem = (item = {}, index = 0) => {
	const source =
		item.pricingBasis && typeof item.pricingBasis === "object"
			? item.pricingBasis
			: {};
	return {
		...defaultPricingBasis(index),
		...source,
		mode:
			source.mode === "calendar_base"
				? "calendar_base"
				: index === 0
				  ? "manual"
				  : source.mode === "manual"
				    ? "manual"
				    : "derived",
		direction: source.direction === "increase" ? "increase" : "decrease",
		adjustmentType:
			source.adjustmentType === "money" ? "money" : "percentage",
		amount: Number(source.amount || 0) || 0,
	};
};

const defaultPricingItem = (roomRows = [], periods = [], index = 0) => ({
	name: "",
	status: "open",
	pricingBasis: defaultPricingBasis(index),
	roomPrices: roomRows.map((room) => defaultRoomPrice(room, periods)),
});

const defaultVariantPricingBasis = () => ({
	mode: "calendar_base",
	direction: "decrease",
	adjustmentType: "percentage",
	amount: 0,
});

const defaultVariantItem = () => ({
	name: "",
	status: "open",
	commissionPercent: 0,
	pricingBasis: defaultVariantPricingBasis(),
});

const applyDerivedAdjustment = (basePrice = 0, basis = {}) => {
	const amount = Number(basis.amount || 0);
	const sign = basis.direction === "increase" ? 1 : -1;
	const next =
		basis.adjustmentType === "money"
			? Number(basePrice || 0) + sign * amount
			: Number(basePrice || 0) * (1 + sign * (amount / 100));
	return Number(Math.max(next, 0).toFixed(2));
};

const periodsFromRecord = (record = {}) => {
	const periodsByKey = new Map();
	(Array.isArray(record.roomPricing) ? record.roomPricing : []).forEach((room) => {
		(Array.isArray(room.pricingItems) ? room.pricingItems : []).forEach((item) => {
			(Array.isArray(item.periodPrices) ? item.periodPrices : []).forEach(
				(period) => {
					const periodKey = String(period?.periodKey || "").trim();
					if (!periodKey || periodsByKey.has(periodKey)) return;
					periodsByKey.set(periodKey, {
						periodKey,
						label: period.label || periodKey,
						calendarType: period.calendarType || record.calendarType || "hijri",
						periodMode: period.periodMode || record.periodMode || "months",
						year: period.year ?? null,
						month: period.month ?? null,
						startDate: period.startDate || "",
						endDate: period.endDate || "",
					});
				}
			);
		});
	});
	const savedPeriods = [...periodsByKey.values()].sort((left, right) =>
		String(left.startDate || "").localeCompare(String(right.startDate || ""))
	);
	if (savedPeriods.length) return savedPeriods;
	return periodDefinitionsFromValues(record, false).map(({ dates, ...period }) => period);
};

const defaultValues = () => {
	const now = moment();
	return {
		hotelIds: [],
		calendarType: "hijri",
		periodMode: "months",
		hijriYear: now.iYear(),
		hijriMonths: [now.iMonth()],
		gregorianYear: now.year(),
		gregorianMonths: [now.month()],
		startDate: now.format("YYYY-MM-DD"),
		endDate: now.clone().add(6, "days").format("YYYY-MM-DD"),
		pricingItems: [defaultVariantItem()],
	};
};

const variantRecordToFormValues = (record = {}, isArabic = false) => {
	const periods = periodsFromRecord(record);
	const recordRooms =
		Array.isArray(record.roomPricing) && record.roomPricing.length
			? record.roomPricing
			: record.roomSelections || [];
	const pricingItems =
		Array.isArray(record.pricingItems) && record.pricingItems.length
			? record.pricingItems
			: [defaultVariantItem()];
	return {
		hotelIds: uniqueIds(record.hotelIds || record.hotelId),
		calendarType: record.calendarType || "hijri",
		periodMode: record.periodMode || "months",
		hijriYear: record.hijriYear || moment().iYear(),
		hijriMonths: Array.isArray(record.hijriMonths) ? record.hijriMonths : [],
		gregorianYear: record.gregorianYear || moment().year(),
		gregorianMonths: Array.isArray(record.gregorianMonths)
			? record.gregorianMonths
			: [],
		startDate: record.startDate || moment().format("YYYY-MM-DD"),
		endDate:
			record.endDate || moment().clone().add(6, "days").format("YYYY-MM-DD"),
		pricingItems: pricingItems.map((item, index) => ({
			_id: normalizeId(item._id),
			name:
				(isArabic && item.nameOtherLanguage
					? item.nameOtherLanguage
					: item.name) ||
				item.nameOtherLanguage ||
				"",
			status: item.status === "blocked" ? "blocked" : "open",
			commissionPercent: Number(item.commissionPercent || 0),
			pricingBasis: pricingBasisForItem(item, index),
			roomPrices: recordRooms.map((room) => {
				const roomItem = (Array.isArray(room.pricingItems)
					? room.pricingItems
					: []
				).find(
					(price) =>
						normalizeId(price.priceVariantItemId) === normalizeId(item._id)
				);
				const hotelId = normalizeId(room.hotelId);
				const roomId = normalizeId(room.roomId);
				return {
					roomKey: makeRoomKey(hotelId, roomId),
					hotelId,
					roomId,
					periodPrices: periods.map((period, periodIndex) => {
						const existingPeriod = priceForPeriodAtIndex(
							roomItem || {},
							period,
							periodIndex
						);
						return {
							...defaultPeriodPrice(period),
							...existingPeriod,
							periodKey: period.periodKey,
							label: period.label,
							calendarType: period.calendarType,
							periodMode: period.periodMode,
							year: period.year ?? null,
							month: period.month ?? null,
							startDate: period.startDate,
							endDate: period.endDate,
							sellingPrice: Number(
								existingPeriod?.sellingPrice ??
									roomItem?.sellingPrice ??
									item.sellingPrice ??
									0
							),
							commissionPercent: Number(
								existingPeriod?.commissionPercent ??
									roomItem?.commissionPercent ??
									item.commissionPercent ??
									0
							),
						};
					}),
				};
			}),
		})),
	};
};

const monthOptionsFor = (calendarType, isArabic) =>
	(calendarType === "hijri"
		? isArabic
			? hijriMonthsAr
			: hijriMonthsEn
		: isArabic
		  ? gregorianMonthsAr
		  : gregorianMonthsEn
	).map((label, index) => ({ value: index, label }));

const formatDateRange = (record = {}) => {
	const dates = Array.isArray(record.dates) ? record.dates : [];
	if (record.periodMode === "custom") {
		return [record.startDate, record.endDate].filter(Boolean).join(" -> ");
	}
	if (dates.length) return `${dates[0]} -> ${dates[dates.length - 1]}`;
	return "";
};

const formatVariantBasis = (item = {}, labels = {}) => {
	const basis =
		item.pricingBasis && typeof item.pricingBasis === "object"
			? item.pricingBasis
			: {};
	const direction =
		basis.direction === "decrease" ? labels.decrease : labels.increase;
	const type =
		basis.adjustmentType === "money" ? labels.money : labels.percentage;
	const suffix = basis.adjustmentType === "money" ? "" : "%";
	return `${direction} | ${type} | ${Number(basis.amount || 0).toFixed(2)}${suffix}`;
};

const VARIANT_PREVIEW_MONTHS = 18;

const nextVariantDateKeys = (monthCount = VARIANT_PREVIEW_MONTHS) => {
	const start = moment().startOf("day");
	const end = start.clone().add(monthCount, "months").subtract(1, "day");
	return enumerateDates(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
};

const monthCardsFromDates = (dates = [], calendarType = "hijri", isArabic = false) =>
	Object.values(
		(Array.isArray(dates) ? dates : []).reduce((acc, date) => {
			const key = monthKey(date, calendarType);
			if (!key) return acc;
			if (!acc[key]) {
				acc[key] = {
					key,
					firstDate: date,
					title: monthTitle(date, calendarType, isArabic),
					dateKeys: [],
				};
			}
			acc[key].dateKeys.push(date);
			return acc;
		}, {})
	).sort((left, right) => left.firstDate.localeCompare(right.firstDate));

const calendarBaseForRoomDate = (room = {}, dateKey = "") => {
	const basePrice = Number(room.basePrice ?? room.price?.basePrice ?? 0);
	const calendarRow = (Array.isArray(room.pricingRate) ? room.pricingRate : []).find(
		(row) => String(row?.calendarDate || "").slice(0, 10) === dateKey
	);
	if (calendarRow) {
		const blocked =
			calendarRow.blocked === true ||
			String(calendarRow.status || "").toLowerCase() === "blocked" ||
			String(calendarRow.color || "").toLowerCase() === "black";
		if (blocked) {
			return {
				status: "blocked",
				sellingPrice: Number(Math.max(basePrice, 0).toFixed(2)),
				mainCalendarPrice: 0,
				commissionPercent: 0,
				source: "calendar",
				fallbackSource: "room-base",
			};
		}
		const rowPrice = Number(calendarRow.sellingPrice ?? calendarRow.price ?? 0);
		if (rowPrice > 0) {
			return {
				status: "open",
				sellingPrice: Number(rowPrice.toFixed(2)),
				mainCalendarPrice: Number(rowPrice.toFixed(2)),
				commissionPercent: Number(
					Number(calendarRow.commissionPercent || 0).toFixed(2)
				),
				source: "calendar",
			};
		}
	}
	return {
		status: basePrice > 0 ? "open" : "missing",
		sellingPrice: Number(Math.max(basePrice, 0).toFixed(2)),
		mainCalendarPrice: Number(Math.max(basePrice, 0).toFixed(2)),
		commissionPercent: 0,
		source: "room-base",
	};
};

const savedRoomPricingForRoom = (record = {}, room = {}) =>
	(Array.isArray(record.roomPricing) ? record.roomPricing : []).find(
		(savedRoom) =>
			normalizeId(savedRoom.hotelId) === normalizeId(room.hotelId) &&
			normalizeId(savedRoom.roomId) === normalizeId(room.roomId)
	);

const savedPricingItemForRoom = (record = {}, room = {}, item = {}) => {
	const roomPricing = savedRoomPricingForRoom(record, room);
	return (Array.isArray(roomPricing?.pricingItems)
		? roomPricing.pricingItems
		: []
	).find(
		(savedItem) =>
			normalizeId(savedItem.priceVariantItemId) === normalizeId(item._id)
	);
};

const savedPeriodForDate = (record = {}, room = {}, item = {}, dateKey = "") => {
	const savedItem = savedPricingItemForRoom(record, room, item);
	return (Array.isArray(savedItem?.periodPrices)
		? savedItem.periodPrices
		: []
	).find((period) => {
		const startDate = String(period?.startDate || "").slice(0, 10);
		const endDate = String(period?.endDate || "").slice(0, 10);
		return startDate && endDate && dateKey >= startDate && dateKey <= endDate;
	});
};

const manualOverrideRowsFromRecord = (record = {}) =>
	(Array.isArray(record.roomPricing) ? record.roomPricing : []).flatMap((room) =>
		(Array.isArray(room.pricingItems) ? room.pricingItems : []).flatMap((item) =>
			(Array.isArray(item.periodPrices) ? item.periodPrices : [])
				.filter((period) => period.manualOverride === true)
				.map((period) => ({
					priceVariantDataId: normalizeId(record._id),
					priceVariantItemId: normalizeId(item.priceVariantItemId),
					hotelId: normalizeId(room.hotelId),
					roomId: normalizeId(room.roomId),
					roomKey: makeRoomKey(room.hotelId, room.roomId),
					calendarDate: period.startDate || period.periodKey,
					status: period.status === "blocked" ? "blocked" : "open",
					sellingPrice: Number(period.sellingPrice || 0),
					commissionPercent: Number(period.commissionPercent || 0),
					mainCalendarPrice: Number(period.mainCalendarPrice || 0),
					baseSource: period.baseSource || "",
					manualOverride: true,
				}))
		)
	);

const buildVariantPreviewFromRecord = ({
	record = {},
	hotels = [],
	isArabic = false,
	labels = {},
	dateKeys = null,
}) => {
	const item = (Array.isArray(record.pricingItems) ? record.pricingItems : [])[0];
	const hotelIds = uniqueIds(record.hotelIds || record.hotelId);
	const hotelIdSet = new Set(hotelIds);
	const selectedHotels = hotels.filter((entry) =>
		hotelIdSet.has(normalizeId(entry._id))
	);
	const recordRooms = Array.isArray(record.roomPricing) && record.roomPricing.length
		? record.roomPricing
		: record.roomSelections || [];
	const selectedRoomKeys = new Set(
		recordRooms.map((room) => makeRoomKey(room.hotelId, room.roomId))
	);
	const hotelRooms = roomRowsForHotels(selectedHotels, isArabic);
	const rooms = selectedRoomKeys.size
		? hotelRooms.filter((room) => selectedRoomKeys.has(room.roomKey))
		: hotelRooms;
	const allDates = nextVariantDateKeys();
	const dates = Array.isArray(dateKeys) && dateKeys.length ? dateKeys : allDates;
	if (!item || !rooms.length || !dates.length) return null;

	const basis = pricingBasisForItem(item, 0);
	const itemStatus = item.status === "blocked" ? "blocked" : "open";
	const itemCommission = Number(item.commissionPercent || 0);
	const pricingName =
		(isArabic && item.nameOtherLanguage ? item.nameOtherLanguage : item.name) ||
		item.nameOtherLanguage ||
		labels.variant ||
		"Variant";

	const rows = dates.flatMap((dateKey) =>
		rooms.map((room) => {
			const base = calendarBaseForRoomDate(room, dateKey);
			const savedPeriod = savedPeriodForDate(record, room, item, dateKey);
			const manualOverride = savedPeriod?.manualOverride === true;
			const calendarBlocked = base.status === "blocked";
			const baseBlocked = itemStatus === "blocked" || base.status === "missing";
			const defaultBlocked = baseBlocked || calendarBlocked;
			const blocked = manualOverride
				? savedPeriod.status === "blocked" || baseBlocked
				: defaultBlocked;
			const derivedOpenPrice = baseBlocked
				? 0
				: applyDerivedAdjustment(base.sellingPrice, basis);
			const computedPrice = blocked ? 0 : derivedOpenPrice;
			const savedPrice = Number(savedPeriod?.sellingPrice ?? computedPrice);
			const savedCommission = Number(
				savedPeriod?.commissionPercent ?? itemCommission
			);
			const sellingPrice = blocked
				? 0
				: manualOverride
				  ? Number(Math.max(savedPrice, 0).toFixed(2))
				  : computedPrice;
			const commissionPercent = blocked
				? 0
				: Number(
						Math.min(
							100,
							Math.max(0, manualOverride ? savedCommission : itemCommission)
						).toFixed(2)
				  );
			return {
				id: `${normalizeId(record._id)}::${normalizeId(item._id)}::${
					room.roomKey
				}::${dateKey}`,
				priceVariantDataId: normalizeId(record._id),
				priceVariantItemId: normalizeId(item._id),
				pricingIndex: 0,
				pricingName,
				date: dateKey,
				hotelId: room.hotelId,
				hotelName: room.hotelName || "",
				roomId: room.roomId,
				roomKey: room.roomKey,
				roomType: room.roomType,
				roomForGender: room.roomForGender,
				roomDisplayName: room.displayName,
				roomLabel: room.label,
				mainCalendarPrice: Number(base.mainCalendarPrice ?? base.sellingPrice ?? 0),
				mainCalendarCommissionPercent: Number(base.commissionPercent || 0),
				baseSource: base.source,
				fallbackSource: base.fallbackSource || "",
				calendarBlocked,
				baseBlocked,
				blocked,
				status: blocked ? "blocked" : "open",
				sellingPrice,
				commissionPercent,
				manualOverride,
				variantOpenPrice: derivedOpenPrice,
				previousSellingPrice: sellingPrice || derivedOpenPrice,
				previousCommissionPercent: commissionPercent,
			};
		})
	);

	return {
		recordId: normalizeId(record._id),
		record,
		mode: "price_variant",
		values: { calendarType: record.calendarType || "hijri" },
		dates: allDates,
		loadedDateKeys: dates,
		rooms,
		pricingItems: [{ ...item, pricingBasis: basis }],
		rows,
		loadedMonthKeys: [
			...new Set(
				dates
					.map((date) => monthKey(date, record.calendarType || "hijri"))
					.filter(Boolean)
			),
		],
	};
};

const OverallPriceVariantModal = ({
	open,
	onClose,
	userId,
	token,
	ownerId,
	chosenLanguage,
	activeTab,
	onTabChange,
	onSaved,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const labels = TEXT[isArabic ? "ar" : "en"];
	const [form] = Form.useForm();
	const [hotels, setHotels] = useState([]);
	const [variantData, setVariantData] = useState([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [editingRecordId, setEditingRecordId] = useState("");
	const [internalActiveVariantTab, setInternalActiveVariantTab] = useState(
		normalizeVariantTab(activeTab)
	);
	const [preview, setPreview] = useState(null);
	const [previewIndex, setPreviewIndex] = useState(0);
	const [previewModalOpen, setPreviewModalOpen] = useState(false);
	const [selectedPreviewHotelId, setSelectedPreviewHotelId] = useState("");
	const [editingCell, setEditingCell] = useState(null);
	const selectPopupStyle = { zIndex: OVERALL_DASHBOARD_MODAL_Z_INDEX + 20 };
	const selectPopupClassName = `overall-dashboard-select-dropdown ${
		isArabic ? "overall-price-variant-dropdown-rtl" : ""
	}`.trim();
	const activeVariantTab = normalizeVariantTab(
		activeTab || internalActiveVariantTab
	);
	const setActiveVariantTab = useCallback(
		(nextTab) => {
			const normalized = normalizeVariantTab(nextTab);
			setInternalActiveVariantTab(normalized);
			onTabChange?.(normalized);
		},
		[onTabChange]
	);

	const watchedHotelIds = Form.useWatch("hotelIds", form);
	const watchedPricingItems = Form.useWatch("pricingItems", form);
	const selectedHotelIds = useMemo(
		() => uniqueIds(watchedHotelIds),
		[watchedHotelIds]
	);
	const selectedHotelIdsSignature = selectedHotelIds.join("|");
	const selectedCalendarType = Form.useWatch("calendarType", form) || "hijri";
	const selectedPeriodMode = Form.useWatch("periodMode", form) || "months";
	const selectedHijriYear = Form.useWatch("hijriYear", form);
	const selectedHijriMonths = Form.useWatch("hijriMonths", form);
	const selectedGregorianYear = Form.useWatch("gregorianYear", form);
	const selectedGregorianMonths = Form.useWatch("gregorianMonths", form);
	const selectedStartDate = Form.useWatch("startDate", form);
	const selectedEndDate = Form.useWatch("endDate", form);

	const hotelOptions = useMemo(
		() =>
			hotels.map((hotel) => ({
				value: normalizeId(hotel._id),
				label: titleCase(hotel.hotelName),
			})),
		[hotels]
	);

	const selectedHotelIdSet = useMemo(
		() => new Set(selectedHotelIds),
		[selectedHotelIds]
	);
	const selectedHotels = useMemo(
		() =>
			hotels.filter((hotel) =>
				selectedHotelIdSet.has(normalizeId(hotel._id))
			),
		[hotels, selectedHotelIdSet]
	);
	const selectedRoomRows = useMemo(
		() => roomRowsForHotels(selectedHotels, isArabic),
		[selectedHotels, isArabic]
	);
	const draftVariantItem = Array.isArray(watchedPricingItems)
		? watchedPricingItems[0] || {}
		: {};
	const draftVariantNameReady = String(draftVariantItem?.name || "").trim().length > 0;
	const canDraftPreview =
		selectedHotelIds.length > 0 &&
		selectedRoomRows.length > 0 &&
		draftVariantNameReady &&
		!loading;
	const selectedPeriods = useMemo(
		() =>
			periodDefinitionsFromValues(
				{
					calendarType: selectedCalendarType,
					periodMode: selectedPeriodMode,
					hijriYear: selectedHijriYear,
					hijriMonths: selectedHijriMonths,
					gregorianYear: selectedGregorianYear,
					gregorianMonths: selectedGregorianMonths,
					startDate: selectedStartDate,
					endDate: selectedEndDate,
				},
				isArabic
			),
		[
			isArabic,
			selectedCalendarType,
			selectedEndDate,
			selectedGregorianMonths,
			selectedGregorianYear,
			selectedHijriMonths,
			selectedHijriYear,
			selectedPeriodMode,
			selectedStartDate,
		]
	);
	const selectedPeriodsSignature = selectedPeriods
		.map((period) => period.periodKey)
		.join("|");

	const loadOptions = () => {
		if (!open || !userId || !token) return;
		setLoading(true);
		getOverallPriceVariantsOptions(userId, token, buildOwnerParams(ownerId))
			.then((data) => {
				if (data?.error) {
					message.error(data.error);
					return;
				}
				setHotels(Array.isArray(data?.hotels) ? data.hotels : []);
				setVariantData(
					Array.isArray(data?.priceVariantData) ? data.priceVariantData : []
				);
			})
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		loadOptions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, ownerId, token, userId]);

	useEffect(() => {
		if (!open) return;
		form.setFieldsValue(defaultValues());
		setEditingRecordId("");
		setInternalActiveVariantTab(VARIANT_TAB_ADD);
		setPreview(null);
		setPreviewIndex(0);
		setPreviewModalOpen(false);
		setSelectedPreviewHotelId("");
		setEditingCell(null);
	}, [form, open]);

	const syncHotelDependentFields = (
		hotelIds = selectedHotelIds,
		periods = selectedPeriods
	) => {
		const hotelIdSet = new Set(uniqueIds(hotelIds));
		const roomRows = roomRowsForHotels(
			hotels.filter((item) => hotelIdSet.has(normalizeId(item._id))),
			isArabic
		);
		const currentItems = form.getFieldValue("pricingItems") || [
			defaultPricingItem(roomRows, periods, 0),
		];
		const nextItems = currentItems.map((item, index) => ({
			...item,
			pricingBasis: pricingBasisForItem(item, index),
			roomPrices: roomRows.map((room) => ({
				...defaultRoomPrice(room, periods),
				...priceForRoom(item, room),
				roomKey: room.roomKey,
				hotelId: room.hotelId,
				roomId: room.roomId,
				periodPrices: periods.map((period, periodIndex) => ({
					...defaultPeriodPrice(period),
					...priceForPeriodAtIndex(priceForRoom(item, room), period, periodIndex),
					periodKey: period.periodKey,
					label: period.label,
					calendarType: period.calendarType,
					periodMode: period.periodMode,
					year: period.year ?? null,
					month: period.month ?? null,
					startDate: period.startDate,
					endDate: period.endDate,
				})),
			})),
		}));
		form.setFieldsValue({ pricingItems: nextItems });
		setPreview(null);
		setPreviewIndex(0);
	};

	useEffect(() => {
		if (!open || !selectedHotelIds.length || previewModalOpen) return;
		syncHotelDependentFields(selectedHotelIds, selectedPeriods);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		open,
		previewModalOpen,
		selectedHotelIdsSignature,
		hotels.length,
		isArabic,
		selectedPeriodsSignature,
	]);

	const rebuildDerivedPreviewRows = (rows = [], items = []) => {
		const baseByRoomDate = new Map(
			rows
				.filter((row) => row.pricingIndex === 0)
				.map((row) => [`${row.roomKey}::${row.date}`, row])
		);
		return rows.map((row) => {
			if (row.pricingIndex === 0) return row;
			const baseRow = baseByRoomDate.get(`${row.roomKey}::${row.date}`);
			if (!baseRow || baseRow.blocked) {
				return {
					...row,
					blocked: true,
					status: "blocked",
					sellingPrice: 0,
					commissionPercent: 0,
				};
			}
			if (row.blocked) return row;
			const basis = pricingBasisForItem(
				items[row.pricingIndex] || {},
				row.pricingIndex
			);
			return {
				...row,
				status: "open",
				sellingPrice: applyDerivedAdjustment(baseRow.sellingPrice, basis),
				commissionPercent: Number(baseRow.commissionPercent || 0),
			};
		});
	};

	const togglePreviewRowStatus = (rowId) => {
		setPreview((current) => {
			if (!current) return current;
			const target = (current.rows || []).find((row) => row.id === rowId);
			if (!target) return current;
			if (target.baseBlocked && target.blocked) {
				return current;
			}
			const nextBlocked = !target.blocked;
			const rows = (current.rows || []).map((row) => {
				const shouldToggle =
					row.id === rowId ||
					(target.pricingIndex === 0 &&
						row.roomKey === target.roomKey &&
						row.date === target.date);
				if (!shouldToggle) return row;
				return {
					...row,
					blocked: nextBlocked,
					status: nextBlocked ? "blocked" : "open",
					manualOverride: true,
					previousSellingPrice: nextBlocked
						? row.sellingPrice
						: row.previousSellingPrice,
					previousCommissionPercent: nextBlocked
						? row.commissionPercent
						: row.previousCommissionPercent,
					sellingPrice: nextBlocked
						? 0
						: Number(
								row.previousSellingPrice ||
									row.variantOpenPrice ||
									row.sellingPrice ||
									0
						  ),
					commissionPercent: nextBlocked
						? 0
						: Number(
								row.previousCommissionPercent ??
									row.commissionPercent ??
									row.mainCalendarCommissionPercent ??
									0
						  ),
				};
			});
			const rebuiltRows = rebuildDerivedPreviewRows(rows, current.pricingItems || []);
			return {
				...current,
				rows: rebuiltRows,
				monthCards: buildMonthCardsFromRows(
					rebuiltRows,
					current.values?.calendarType || "hijri",
					isArabic
				),
			};
		});
		setEditingCell(null);
	};

	const setPreviewMonthStatus = (monthRows = [], nextBlocked = false) => {
		const rowIds = new Set((Array.isArray(monthRows) ? monthRows : []).map((row) => row.id));
		if (!rowIds.size) return;
		setPreview((current) => {
			if (!current) return current;
			const rows = (current.rows || []).map((row) => {
				if (!rowIds.has(row.id)) return row;
				if (!nextBlocked && row.baseBlocked) return row;
				return {
					...row,
					blocked: nextBlocked,
					status: nextBlocked ? "blocked" : "open",
					manualOverride: true,
					previousSellingPrice: nextBlocked
						? row.sellingPrice
						: row.previousSellingPrice,
					previousCommissionPercent: nextBlocked
						? row.commissionPercent
						: row.previousCommissionPercent,
					sellingPrice: nextBlocked
						? 0
						: Number(
								row.previousSellingPrice ||
									row.variantOpenPrice ||
									row.sellingPrice ||
									0
						  ),
					commissionPercent: nextBlocked
						? 0
						: Number(
								row.previousCommissionPercent ??
									row.commissionPercent ??
									row.mainCalendarCommissionPercent ??
									0
						  ),
				};
			});
			const rebuiltRows = rebuildDerivedPreviewRows(rows, current.pricingItems || []);
			return {
				...current,
				rows: rebuiltRows,
				monthCards: buildMonthCardsFromRows(
					rebuiltRows,
					current.values?.calendarType || "hijri",
					isArabic
				),
			};
		});
		setEditingCell(null);
	};

	const updatePreviewRowValue = (rowId, field, value) => {
		setPreview((current) => {
			if (!current) return current;
			const rows = (current.rows || []).map((row) => {
				if (row.id !== rowId || row.blocked || row.pricingIndex !== 0) {
					return row;
				}
				const parsed = Number(value || 0);
				const normalized =
					field === "commissionPercent"
						? Math.min(Math.max(parsed, 0), 100)
						: Math.max(parsed, 0);
				return {
					...row,
					[field]: Number(normalized.toFixed(2)),
					manualOverride: true,
				};
			});
			const rebuiltRows = rebuildDerivedPreviewRows(rows, current.pricingItems || []);
			return {
				...current,
				rows: rebuiltRows,
				monthCards: buildMonthCardsFromRows(
					rebuiltRows,
					current.values?.calendarType || "hijri",
					isArabic
				),
			};
		});
	};

	const startEditingCell = (row, field) => {
		if (row.blocked || row.baseBlocked || row.pricingIndex !== 0) return;
		setEditingCell({ rowId: row.id, field });
	};

	const finishEditingCell = () => setEditingCell(null);

	const validateVariantForm = async () => {
		try {
			return await form.validateFields();
		} catch (error) {
			message.error(labels.completeRequiredFields);
			return null;
		}
	};

	const handleSave = async (sourcePreview = preview) => {
		const values = await validateVariantForm();
		if (!values) return;
		const hotelIds = uniqueIds(values.hotelIds);
		if (!selectedRoomRows.length) {
			message.error(labels.noRooms);
			return;
		}
		const variantItem = (values.pricingItems || [])[0] || {};
		const variantBasis =
			variantItem.pricingBasis && typeof variantItem.pricingBasis === "object"
				? variantItem.pricingBasis
				: {};
		const previewOverrideRows = (sourcePreview?.rows || [])
			.filter((row) => row.manualOverride)
			.map((row) => ({
				priceVariantDataId: row.priceVariantDataId,
				priceVariantItemId: row.priceVariantItemId,
				pricingIndex: Number.isInteger(Number(row.pricingIndex))
					? Number(row.pricingIndex)
					: 0,
				hotelId: row.hotelId,
				roomId: row.roomId,
				roomKey: row.roomKey,
				calendarDate: row.date,
				status: row.blocked ? "blocked" : "open",
				sellingPrice: Number(row.sellingPrice || 0),
				commissionPercent: Number(row.commissionPercent || 0),
				mainCalendarPrice: Number(row.mainCalendarPrice || 0),
				baseSource: row.baseSource || "",
				manualOverride: true,
			}));
		const existingOverrideRows = editingRecordId
			? manualOverrideRowsFromRecord(
					variantData.find(
						(record) => normalizeId(record._id) === normalizeId(editingRecordId)
					)
			  )
			: [];
		const overrideKey = (row = {}) =>
			[
				normalizeId(row.priceVariantItemId),
				normalizeId(row.hotelId),
				normalizeId(row.roomId),
				normalizeDateKey(row.calendarDate || row.date),
			].join("::");
		const mergedOverrideRowsByKey = new Map();
		existingOverrideRows.forEach((row) => {
			const key = overrideKey(row);
			if (key) mergedOverrideRowsByKey.set(key, row);
		});
		previewOverrideRows.forEach((row) => {
			const key = overrideKey(row);
			if (key) mergedOverrideRowsByKey.set(key, row);
		});
		const mergedOverrideRows = [...mergedOverrideRowsByKey.values()];
		const payload = {
			...(editingRecordId ? { priceVariantDataId: editingRecordId } : {}),
			dataType: "price_variant",
			mode: "price_variants",
			variantMode: true,
			basePriceSource: "calendar_main_price",
			hotelId: hotelIds[0] || "",
			hotelIds,
			pricingItems: [
				{
					_id: variantItem._id,
					name: variantItem.name,
					status: variantItem.status === "blocked" ? "blocked" : "open",
					commissionPercent: Number(variantItem.commissionPercent || 0),
					sortOrder: 0,
					pricingBasis: {
						mode: "calendar_base",
						direction:
							variantBasis.direction === "decrease" ? "decrease" : "increase",
						adjustmentType:
							variantBasis.adjustmentType === "money"
								? "money"
								: "percentage",
						amount: Number(variantBasis.amount || 0),
					},
				},
			],
			variantPreviewRows: mergedOverrideRows,
		};
		setSaving(true);
		try {
			const data = await saveOverallPriceVariants(
				userId,
				token,
				payload,
				buildOwnerParams(ownerId)
			);
			if (data?.error) {
				message.error(data.error);
				return;
			}
			message.success(labels.saved);
			if (data?.priceVariantData) {
				setVariantData((current) => {
					const withoutSaved = current.filter(
						(item) => normalizeId(item._id) !== normalizeId(data.priceVariantData._id)
					);
					return [data.priceVariantData, ...withoutSaved];
				});
			}
			form.setFieldsValue(defaultValues());
			setEditingRecordId("");
			setPreview(null);
			setPreviewIndex(0);
			setPreviewModalOpen(false);
			setSelectedPreviewHotelId("");
			setEditingCell(null);
			setActiveVariantTab(VARIANT_TAB_UPDATE);
			onSaved?.(data);
		} finally {
			setSaving(false);
		}
	};

	const handleDraftPreview = async () => {
		if (!canDraftPreview) {
			message.error(labels.completeRequiredFields);
			return;
		}
		const values = await validateVariantForm();
		if (!values) return;
		const hotelIds = uniqueIds(values.hotelIds);
		const hotelIdSet = new Set(hotelIds);
		const draftHotels = hotels.filter((hotel) =>
			hotelIdSet.has(normalizeId(hotel._id))
		);
		const rooms = roomRowsForHotels(draftHotels, isArabic);
		if (!rooms.length) {
			message.error(labels.noRooms);
			return;
		}
		const variantItem = (values.pricingItems || [])[0] || {};
		const draftRecord = {
			_id: "draft",
			hotelIds,
			calendarType: selectedCalendarType,
			pricingItems: [
				{
					_id: "draft-variant-item",
					name: variantItem.name,
					nameOtherLanguage: variantItem.nameOtherLanguage || "",
					status: variantItem.status === "blocked" ? "blocked" : "open",
					commissionPercent: Number(variantItem.commissionPercent || 0),
					pricingBasis: {
						...defaultVariantPricingBasis(),
						...(variantItem.pricingBasis &&
						typeof variantItem.pricingBasis === "object"
							? variantItem.pricingBasis
							: {}),
						mode: "calendar_base",
					},
				},
			],
			roomSelections: rooms.map((room) => ({
				hotelId: room.hotelId,
				roomId: room.roomId,
			})),
		};
		const firstMonthDates =
			monthCardsFromDates(nextVariantDateKeys(), selectedCalendarType, isArabic)[0]
				?.dateKeys || [];
		const nextPreview = buildVariantPreviewFromRecord({
			record: draftRecord,
			hotels,
			isArabic,
			labels,
			dateKeys: firstMonthDates,
		});
		if (!nextPreview?.rows?.length) {
			message.error(labels.noRooms);
			return;
		}
		setEditingRecordId("");
		setSelectedPreviewHotelId(normalizeId(nextPreview.rooms?.[0]?.hotelId));
		setPreview(nextPreview);
		setPreviewIndex(0);
		setPreviewModalOpen(true);
		setEditingCell(null);
	};

	const handleEdit = (record = {}) => {
		setEditingRecordId(normalizeId(record._id));
		form.setFieldsValue(variantRecordToFormValues(record, isArabic));
		setPreview(null);
		setPreviewIndex(0);
		setPreviewModalOpen(false);
		setSelectedPreviewHotelId("");
		setActiveVariantTab(VARIANT_TAB_UPDATE);
	};

	const handleVariantPreview = (record = {}) => {
		setEditingRecordId(normalizeId(record._id));
		form.setFieldsValue(variantRecordToFormValues(record, isArabic));
		setActiveVariantTab(VARIANT_TAB_UPDATE);
		const firstMonthDates =
			monthCardsFromDates(
				nextVariantDateKeys(),
				record.calendarType || "hijri",
				isArabic
			)[0]?.dateKeys || [];
		const nextPreview = buildVariantPreviewFromRecord({
			record,
			hotels,
			isArabic,
			labels,
			dateKeys: firstMonthDates,
		});
		if (!nextPreview?.rows?.length) {
			message.error(labels.noRooms);
			return;
		}
		setSelectedPreviewHotelId(normalizeId(nextPreview.rooms?.[0]?.hotelId));
		setPreview(nextPreview);
		setPreviewIndex(0);
		setPreviewModalOpen(true);
		setEditingCell(null);
	};

	const ensurePreviewMonthLoaded = useCallback(
		(month, index) => {
			if (!preview || !month?.dateKeys?.length) {
				setPreviewIndex(index);
				return;
			}
			const loadedMonthKeys = new Set(preview.loadedMonthKeys || []);
			if (loadedMonthKeys.has(month.key)) {
				setPreviewIndex(index);
				return;
			}
			const recordForBuild =
				preview.record ||
				variantData.find(
					(record) => normalizeId(record._id) === normalizeId(preview.recordId)
				);
			if (!recordForBuild) {
				setPreviewIndex(index);
				return;
			}
			const monthPreview = buildVariantPreviewFromRecord({
				record: recordForBuild,
				hotels,
				isArabic,
				labels,
				dateKeys: month.dateKeys,
			});
			if (!monthPreview?.rows?.length) {
				setPreviewIndex(index);
				return;
			}
			setPreview((current) => {
				if (!current) return current;
				const existingRows = Array.isArray(current.rows) ? current.rows : [];
				const monthRowIds = new Set(monthPreview.rows.map((row) => row.id));
				return {
					...current,
					rows: [
						...existingRows.filter((row) => !monthRowIds.has(row.id)),
						...monthPreview.rows,
					],
					loadedDateKeys: [
						...new Set([...(current.loadedDateKeys || []), ...month.dateKeys]),
					],
					loadedMonthKeys: [
						...new Set([...(current.loadedMonthKeys || []), month.key]),
					],
				};
			});
			setPreviewIndex(index);
		},
		[hotels, isArabic, labels, preview, variantData]
	);

	const cancelEdit = () => {
		setEditingRecordId("");
		form.setFieldsValue(defaultValues());
		setPreview(null);
		setPreviewIndex(0);
		setSelectedPreviewHotelId("");
	};

	const monthOptions = monthOptionsFor(selectedCalendarType, isArabic);
	const previewHotelOptions = useMemo(() => {
		const hotelsById = new Map();
		(preview?.rooms || []).forEach((room) => {
			const hotelId = normalizeId(room.hotelId);
			if (!hotelId || hotelsById.has(hotelId)) return;
			hotelsById.set(hotelId, {
				value: hotelId,
				label: room.hotelName || labels.hotels,
			});
		});
		return [...hotelsById.values()];
	}, [labels.hotels, preview]);
	useEffect(() => {
		if (!previewModalOpen || !previewHotelOptions.length) return;
		const hasSelectedHotel = previewHotelOptions.some(
			(option) => option.value === selectedPreviewHotelId
		);
		if (!hasSelectedHotel) {
			setSelectedPreviewHotelId(previewHotelOptions[0].value);
			setPreviewIndex(0);
		}
	}, [previewHotelOptions, previewModalOpen, selectedPreviewHotelId]);
	const filteredPreviewRows = useMemo(() => {
		const rows = Array.isArray(preview?.rows) ? preview.rows : [];
		if (!selectedPreviewHotelId) return rows;
		return rows.filter(
			(row) => normalizeId(row.hotelId) === selectedPreviewHotelId
		);
	}, [preview, selectedPreviewHotelId]);
	const filteredPreviewRooms = useMemo(() => {
		const roomsByKey = new Map();
		filteredPreviewRows.forEach((row) => {
			if (!row.roomKey || roomsByKey.has(row.roomKey)) return;
			roomsByKey.set(row.roomKey, row);
		});
		return [...roomsByKey.values()];
	}, [filteredPreviewRows]);
	const monthCards = useMemo(() => {
		if (!preview) return [];
		const calendarType = preview?.values?.calendarType || "hijri";
		const rowsByMonth = buildMonthCardsFromRows(
			filteredPreviewRows,
			calendarType,
			isArabic
		).reduce((acc, month) => {
			acc.set(month.key, month.rows);
			return acc;
		}, new Map());
		return monthCardsFromDates(preview.dates || [], calendarType, isArabic).map(
			(month) => ({
				...month,
				rows: rowsByMonth.get(month.key) || [],
			})
		);
	}, [filteredPreviewRows, isArabic, preview]);
	const hasPreview = Boolean(preview && monthCards.length);
	const maxPreviewStart = hasPreview ? Math.max(monthCards.length - 1, 0) : 0;
	const safePreviewIndex = hasPreview
		? Math.min(previewIndex, maxPreviewStart)
		: 0;
	const activeMonth = hasPreview ? monthCards[safePreviewIndex] : null;
	const useLegacyVariantEditor = false;
	const renderEditableNumber = (row, field, { suffix = "", max } = {}) => {
		const isEditing =
			editingCell?.rowId === row.id && editingCell?.field === field;
		const value = Number(row[field] || 0).toFixed(2);
		const editable = row.pricingIndex === 0 && !row.blocked && !row.baseBlocked;
		if (isEditing && editable) {
			return (
				<InputNumber
					autoFocus
					min={0}
					max={max}
					precision={2}
					value={row[field]}
					onChange={(nextValue) => updatePreviewRowValue(row.id, field, nextValue)}
					onBlur={finishEditingCell}
					onPressEnter={finishEditingCell}
				/>
			);
		}
		return (
			<button
				type='button'
				className='editable-cell'
				disabled={!editable}
				onClick={() => startEditingCell(row, field)}
			>
				{row.blocked ? "-" : `${value}${suffix}`}
			</button>
		);
	};

	return (
		<>
			<PriceVariantGlobalStyle />
			<Modal
				open={open}
				onCancel={onClose}
				footer={null}
				width={
					activeVariantTab === VARIANT_TAB_UPDATE
						? "min(1760px, 99vw)"
						: "min(1600px, 99vw)"
				}
				centered={false}
				className='overall-price-variant-modal'
				style={{ top: 12 }}
				rootClassName={OVERALL_DASHBOARD_MODAL_ROOT_CLASS}
				wrapClassName={OVERALL_DASHBOARD_MODAL_WRAP_CLASS}
				zIndex={OVERALL_DASHBOARD_MODAL_Z_INDEX}
				destroyOnClose={false}
				styles={{
					mask: { zIndex: OVERALL_DASHBOARD_MODAL_Z_INDEX - 1 },
					body: {
						maxHeight: "calc(100vh - 56px)",
						overflowY: "auto",
						paddingTop: 0,
						paddingBottom: 10,
					},
				}}
			>
				<PriceVariantBody dir={isArabic ? "rtl" : "ltr"} $isArabic={isArabic}>
					<ModalHeader>
						<span className='header-icon'>
							<DatabaseOutlined />
						</span>
						<strong>{labels.title}</strong>
					</ModalHeader>

					<Tabs
						activeKey={activeVariantTab}
						onChange={(key) => setActiveVariantTab(key)}
						items={[
							{
								key: VARIANT_TAB_ADD,
								label: (
									<span className='price-variant-tab-label'>
										<PlusOutlined /> {labels.addTab}
									</span>
								),
							},
							{
								key: VARIANT_TAB_UPDATE,
								label: (
									<span className='price-variant-tab-label'>
										<UnorderedListOutlined /> {labels.updateTab}
									</span>
								),
							},
							{
								key: VARIANT_TAB_AGENTS,
								label: (
									<span className='price-variant-tab-label'>
										<TeamOutlined /> {labels.agentsTab}
									</span>
								),
							},
						]}
					/>

					{activeVariantTab === VARIANT_TAB_ADD ? (
					<Form
						form={form}
						layout='vertical'
						requiredMark={false}
						initialValues={defaultValues()}
					>
						<FormGrid $isArabic={isArabic}>
							<Form.Item
								name='hotelIds'
								label={labels.hotels}
								rules={[
									{
										required: true,
										type: "array",
										min: 1,
										message: labels.required,
									},
								]}
							>
								<Select
									mode='multiple'
									showSearch
									allowClear
									maxTagCount='responsive'
									loading={loading}
									placeholder={labels.chooseHotels}
									options={hotelOptions}
									optionFilterProp='label'
									popupStyle={selectPopupStyle}
									popupClassName={selectPopupClassName}
									onChange={(value) =>
										syncHotelDependentFields(value, selectedPeriods)
									}
								/>
							</Form.Item>
							<RoomsIncludedPanel $isArabic={isArabic}>
								<strong>{labels.rooms}</strong>
								<span>{labels.allRoomsIncluded}</span>
								<Tag color={selectedRoomRows.length ? "geekblue" : "default"}>
									{selectedRoomRows.length} {labels.roomCount}
								</Tag>
							</RoomsIncludedPanel>
						</FormGrid>

						{useLegacyVariantEditor ? (
						<>
						<PeriodGrid>
							<Form.Item name='calendarType' label={labels.calendar}>
								<Radio.Group optionType='button' buttonStyle='solid'>
									<Radio.Button value='hijri'>{labels.hijri}</Radio.Button>
									<Radio.Button value='gregorian'>{labels.gregorian}</Radio.Button>
								</Radio.Group>
							</Form.Item>
							<Form.Item name='periodMode' label={labels.period}>
								<Radio.Group optionType='button' buttonStyle='solid'>
									<Radio.Button value='months'>{labels.months}</Radio.Button>
									<Radio.Button value='custom'>{labels.customRange}</Radio.Button>
								</Radio.Group>
							</Form.Item>
							{selectedPeriodMode === "months" ? (
								<>
									<Form.Item
										name={
											selectedCalendarType === "hijri"
												? "hijriYear"
												: "gregorianYear"
										}
										label={
											selectedCalendarType === "hijri"
												? labels.hijriYear
												: labels.gregorianYear
										}
										rules={[{ required: true, message: labels.required }]}
									>
										<InputNumber precision={0} min={1300} max={2200} />
									</Form.Item>
									<Form.Item
										name={
											selectedCalendarType === "hijri"
												? "hijriMonths"
												: "gregorianMonths"
										}
										label={
											selectedCalendarType === "hijri"
												? labels.hijriMonths
												: labels.gregorianMonths
										}
										rules={[
											{
												required: true,
												type: "array",
												min: 1,
												message: labels.required,
											},
										]}
									>
										<Select
											mode='multiple'
											maxTagCount='responsive'
											options={monthOptions}
											popupStyle={selectPopupStyle}
											popupClassName={selectPopupClassName}
										/>
									</Form.Item>
								</>
							) : (
								<>
									<Form.Item
										name='startDate'
										label={labels.startDate}
										rules={[{ required: true, message: labels.required }]}
									>
										<Input type='date' />
									</Form.Item>
									<Form.Item
										name='endDate'
										label={labels.endDate}
										rules={[{ required: true, message: labels.required }]}
									>
										<Input type='date' />
									</Form.Item>
								</>
							)}
						</PeriodGrid>

						<Form.List name='pricingItems'>
							{(fields, { add, remove }) => (
								<PricingItemsShell>
									{fields.map((field, index) => (
										<PricingItemCard key={field.key}>
											<Form.Item
												{...field}
												name={[field.name, "_id"]}
												hidden
											>
												<Input />
											</Form.Item>
											<Form.Item
												{...field}
												name={[field.name, "pricingBasis", "mode"]}
												hidden
												initialValue={index === 0 ? "manual" : "derived"}
											>
												<Input />
											</Form.Item>
											<PricingItemHeader $isArabic={isArabic}>
												<span>
													<TagsOutlined />
													{labels.price} {index + 1}
													<Tag color={index === 0 ? "blue" : "purple"}>
														{index === 0 ? labels.basePrice : labels.derivedPricing}
													</Tag>
												</span>
												{fields.length > 1 && index > 0 ? (
													<Button
														type='text'
														danger
														icon={<DeleteOutlined />}
														onClick={() => remove(field.name)}
													/>
												) : null}
											</PricingItemHeader>
											<PricingItemGrid>
												<Form.Item
													{...field}
													name={[field.name, "name"]}
													label={labels.pricingName}
													rules={[{ required: true, message: labels.required }]}
												>
													<Input />
												</Form.Item>
												<Form.Item
													{...field}
													name={[field.name, "status"]}
													label={labels.status}
												>
													<Radio.Group optionType='button' buttonStyle='solid'>
														<Radio.Button value='open'>{labels.open}</Radio.Button>
														<Radio.Button value='blocked'>
															{labels.blocked}
														</Radio.Button>
													</Radio.Group>
												</Form.Item>
											</PricingItemGrid>
											{index > 0 ? (
												<DerivationPanel>
													<Form.Item
														{...field}
														name={[field.name, "pricingBasis", "direction"]}
														label={labels.derivedPricing}
													>
														<Radio.Group optionType='button' buttonStyle='solid'>
															<Radio.Button value='increase'>
																{labels.increase}
															</Radio.Button>
															<Radio.Button value='decrease'>
																{labels.decrease}
															</Radio.Button>
														</Radio.Group>
													</Form.Item>
													<Form.Item
														{...field}
														name={[field.name, "pricingBasis", "adjustmentType"]}
														label={labels.adjustmentValue}
													>
														<Radio.Group optionType='button' buttonStyle='solid'>
															<Radio.Button value='money'>{labels.money}</Radio.Button>
															<Radio.Button value='percentage'>
																{labels.percentage}
															</Radio.Button>
														</Radio.Group>
													</Form.Item>
													<Form.Item
														{...field}
														name={[field.name, "pricingBasis", "amount"]}
														label={labels.adjustmentValue}
													>
														<InputNumber min={0} precision={2} />
													</Form.Item>
												</DerivationPanel>
											) : null}
											<RoomPricingPanel>
												<RoomPricingHeader>
													<span>{labels.roomPricing}</span>
													<Tag color={selectedRoomRows.length ? "cyan" : "default"}>
														{selectedRoomRows.length} {labels.roomCount}
													</Tag>
												</RoomPricingHeader>
												{selectedRoomRows.length ? (
													<RoomPricingRows>
														{selectedRoomRows.map((room, roomIndex) => (
															<RoomPricingRow key={room.roomKey}>
																<Form.Item
																	{...field}
																	name={[field.name, "roomPrices", roomIndex, "roomKey"]}
																	hidden
																	initialValue={room.roomKey}
																>
																	<Input />
																</Form.Item>
																<Form.Item
																	{...field}
																	name={[field.name, "roomPrices", roomIndex, "hotelId"]}
																	hidden
																	initialValue={room.hotelId}
																>
																	<Input />
																</Form.Item>
																<Form.Item
																	{...field}
																	name={[field.name, "roomPrices", roomIndex, "roomId"]}
																	hidden
																	initialValue={room.roomId}
																>
																	<Input />
																</Form.Item>
																<div className='room-name'>
																	<span>{labels.room}</span>
																	<strong>{room.label}</strong>
																</div>
																<PeriodPriceGrid>
																	{selectedPeriods.map((period, periodIndex) => (
																		<PeriodPriceCard key={period.periodKey}>
																			<strong>{period.label}</strong>
																			<Form.Item
																				{...field}
																				name={[
																					field.name,
																					"roomPrices",
																					roomIndex,
																					"periodPrices",
																					periodIndex,
																					"periodKey",
																				]}
																				hidden
																				initialValue={period.periodKey}
																			>
																				<Input />
																			</Form.Item>
																			{index === 0 ? (
																				<Form.Item noStyle shouldUpdate>
																					{() => {
																						const status =
																							form.getFieldValue([
																								"pricingItems",
																								field.name,
																								"status",
																							]) || "open";
																						const blocked = status === "blocked";
																						return (
																							<div className='period-inputs'>
																								<Form.Item
																									{...field}
																									name={[
																										field.name,
																										"roomPrices",
																										roomIndex,
																										"periodPrices",
																										periodIndex,
																										"sellingPrice",
																									]}
																									label={labels.sellingPrice}
																									rules={[
																										{
																											validator(_, value) {
																												if (blocked) {
																													return Promise.resolve();
																												}
																												return Number(value) > 0
																													? Promise.resolve()
																													: Promise.reject(
																															new Error(labels.required)
																													  );
																											},
																										},
																									]}
																								>
																									<InputNumber
																										min={0}
																										precision={2}
																										disabled={blocked}
																										prefix={<DollarOutlined />}
																									/>
																								</Form.Item>
																								<Form.Item
																									{...field}
																									name={[
																										field.name,
																										"roomPrices",
																										roomIndex,
																										"periodPrices",
																										periodIndex,
																										"commissionPercent",
																									]}
																									label={labels.commission}
																								>
																									<InputNumber
																										min={0}
																										max={100}
																										precision={2}
																										disabled={blocked}
																										prefix={<PercentageOutlined />}
																									/>
																								</Form.Item>
																							</div>
																						);
																					}}
																				</Form.Item>
																			) : (
																				<Form.Item noStyle shouldUpdate>
																					{() => {
																						const allItems =
																							form.getFieldValue("pricingItems") || [];
																						const baseRoom = priceForRoom(
																							allItems[0] || {},
																							room
																						);
																						const basePeriod = priceForPeriodAtIndex(
																							baseRoom,
																							period,
																							periodIndex
																						);
																						const basis = pricingBasisForItem(
																							allItems[field.name] || {},
																							index
																						);
																						const computedPrice = applyDerivedAdjustment(
																							Number(basePeriod.sellingPrice || 0),
																							basis
																						);
																						return (
																							<ComputedPriceGrid>
																								<span>{labels.computedPrice}</span>
																								<strong>{computedPrice.toFixed(2)}</strong>
																								<span>{labels.commission}</span>
																								<strong>
																									{Number(
																										basePeriod.commissionPercent || 0
																									).toFixed(2)}
																									%
																								</strong>
																							</ComputedPriceGrid>
																						);
																					}}
																				</Form.Item>
																			)}
																		</PeriodPriceCard>
																	))}
																</PeriodPriceGrid>
															</RoomPricingRow>
														))}
													</RoomPricingRows>
												) : (
													<Empty
														image={Empty.PRESENTED_IMAGE_SIMPLE}
														description={labels.noRooms}
													/>
												)}
											</RoomPricingPanel>
										</PricingItemCard>
									))}
									<Button
										type='dashed'
										icon={<PlusOutlined />}
										onClick={() =>
											add(
												defaultPricingItem(
													selectedRoomRows,
													selectedPeriods,
													fields.length
												)
											)
										}
									>
										{labels.addPrice}
									</Button>
								</PricingItemsShell>
							)}
						</Form.List>
						</>
						) : (
						<VariantFormulaPanel $isArabic={isArabic}>
							<Form.List name='pricingItems'>
								{(fields) => {
									const field = fields[0];
									if (!field) return null;
									return (
										<PricingItemCard $isArabic={isArabic}>
											<Form.Item {...field} name={[field.name, "_id"]} hidden>
												<Input />
											</Form.Item>
											<Form.Item
												{...field}
												name={[field.name, "pricingBasis", "mode"]}
												hidden
												initialValue='calendar_base'
											>
												<Input />
											</Form.Item>
											<PricingItemHeader $isArabic={isArabic}>
												<span>
													<TagsOutlined />
													{labels.variant}
												</span>
											</PricingItemHeader>
											<VariantSourceNote $isArabic={isArabic}>
												<strong>{labels.variantFormula}</strong>
												<span>{labels.mainCalendarSource}</span>
											</VariantSourceNote>
											<VariantFieldsGrid $isArabic={isArabic}>
												<Form.Item
													{...field}
													name={[field.name, "name"]}
													label={labels.pricingName}
													rules={[{ required: true, message: labels.required }]}
												>
													<Input />
												</Form.Item>
												<Form.Item
													{...field}
													name={[field.name, "commissionPercent"]}
													label={labels.commission}
													rules={[
														{
															validator(_, value) {
																const parsed = Number(value || 0);
																return parsed >= 0 && parsed <= 100
																	? Promise.resolve()
																	: Promise.reject(new Error(labels.required));
															},
														},
													]}
												>
													<InputNumber
														min={0}
														max={100}
														precision={2}
														prefix={<PercentageOutlined />}
													/>
												</Form.Item>
												<Form.Item
													{...field}
													name={[field.name, "status"]}
													label={labels.status}
												>
													<Radio.Group optionType='button' buttonStyle='solid'>
														<Radio.Button value='open'>{labels.open}</Radio.Button>
														<Radio.Button value='blocked'>
															{labels.blocked}
														</Radio.Button>
													</Radio.Group>
												</Form.Item>
											</VariantFieldsGrid>
											<DerivationPanel $isArabic={isArabic}>
												<Form.Item
													{...field}
													name={[field.name, "pricingBasis", "direction"]}
													label={labels.variantFormula}
												>
													<Radio.Group optionType='button' buttonStyle='solid'>
														<Radio.Button value='increase'>
															{labels.increase}
														</Radio.Button>
														<Radio.Button value='decrease'>
															{labels.decrease}
														</Radio.Button>
													</Radio.Group>
												</Form.Item>
												<Form.Item
													{...field}
													name={[field.name, "pricingBasis", "adjustmentType"]}
													label={labels.adjustmentValue}
												>
													<Radio.Group optionType='button' buttonStyle='solid'>
														<Radio.Button value='money'>{labels.money}</Radio.Button>
														<Radio.Button value='percentage'>
															{labels.percentage}
														</Radio.Button>
													</Radio.Group>
												</Form.Item>
												<Form.Item
													{...field}
													name={[field.name, "pricingBasis", "amount"]}
													label={labels.adjustmentValue}
													rules={[{ required: true, message: labels.required }]}
												>
													<InputNumber min={0} precision={2} />
												</Form.Item>
											</DerivationPanel>
										</PricingItemCard>
									);
								}}
							</Form.List>
						</VariantFormulaPanel>
						)}

						<ActionRow>
							{editingRecordId ? (
								<Button size='large' onClick={cancelEdit}>
									{labels.cancelEdit}
								</Button>
							) : null}
							<Button
								size='large'
								icon={<EyeOutlined />}
								disabled={!canDraftPreview || saving}
								onClick={handleDraftPreview}
							>
								{labels.generatePreview}
							</Button>
							<Button
								type='primary'
								size='large'
								icon={<SaveOutlined />}
								loading={saving}
								onClick={() => handleSave()}
							>
								{labels.save}
							</Button>
						</ActionRow>
					</Form>
					) : null}

					{activeVariantTab === VARIANT_TAB_UPDATE ? (
					<ExistingUpdateLayout $editing={Boolean(editingRecordId)}>
						<ExistingPanel>
							<ExistingHeader>
								<strong>{labels.existing}</strong>
								<Tag color='blue'>{variantData.length}</Tag>
							</ExistingHeader>
							{variantData.length ? (
								<ExistingGrid>
									{variantData.slice(0, 12).map((record) => {
										const recordName = (record.pricingItems || [])
											.map((item) =>
												isArabic && item.nameOtherLanguage
													? item.nameOtherLanguage
													: item.name
											)
											.filter(Boolean)
											.join(" / ");
										return (
											<ExistingCard
												key={record._id}
												className={
													normalizeId(record._id) === editingRecordId
														? "is-active"
														: ""
												}
											>
												<div className='existing-top'>
													<strong>{recordName}</strong>
													<span className='existing-actions'>
														<Tag color='green'>
															{(record.pricingItems || []).length} {labels.price}
														</Tag>
														<Button
															size='small'
															icon={<EditOutlined />}
															onClick={() => handleEdit(record)}
														>
															{labels.edit}
														</Button>
														<Button
															size='small'
															icon={<EyeOutlined />}
															onClick={() => handleVariantPreview(record)}
														>
															{labels.generatePreview}
														</Button>
													</span>
												</div>
												<div className='existing-meta'>
													<span>
														{(record.hotelIds || []).length} {labels.hotelCount}
													</span>
													<span>
														{(record.roomPricing || record.roomSelections || [])
															.length}{" "}
														{labels.roomCount}
													</span>
													<span>
														{Number(
															(record.pricingItems || [])[0]?.commissionPercent ||
																0
														).toFixed(2)}
														%
													</span>
												</div>
												<small>
													{formatVariantBasis(
														(record.pricingItems || [])[0],
														labels
													) || formatDateRange(record)}
												</small>
											</ExistingCard>
										);
									})}
								</ExistingGrid>
							) : (
								<Empty
									image={Empty.PRESENTED_IMAGE_SIMPLE}
									description={labels.noExisting}
								/>
							)}
						</ExistingPanel>
						<UpdateEditorPanel $isArabic={isArabic}>
							{editingRecordId ? (
								<Form
									form={form}
									layout='vertical'
									requiredMark={false}
									initialValues={defaultValues()}
								>
							<FormGrid $isArabic={isArabic}>
										<Form.Item
											name='hotelIds'
											label={labels.hotels}
											rules={[
												{
													required: true,
													type: "array",
													min: 1,
													message: labels.required,
												},
											]}
										>
											<Select
												mode='multiple'
												showSearch
												allowClear
												maxTagCount='responsive'
												loading={loading}
												placeholder={labels.chooseHotels}
												options={hotelOptions}
												optionFilterProp='label'
												popupStyle={selectPopupStyle}
												popupClassName={selectPopupClassName}
												onChange={(value) =>
													syncHotelDependentFields(value, selectedPeriods)
												}
											/>
										</Form.Item>
										<RoomsIncludedPanel $isArabic={isArabic}>
											<strong>{labels.rooms}</strong>
											<span>{labels.allRoomsIncluded}</span>
											<Tag
												color={selectedRoomRows.length ? "geekblue" : "default"}
											>
												{selectedRoomRows.length} {labels.roomCount}
											</Tag>
										</RoomsIncludedPanel>
									</FormGrid>
									<VariantFormulaPanel $isArabic={isArabic}>
										<Form.List name='pricingItems'>
											{(fields) => {
												const field = fields[0];
												if (!field) return null;
												return (
													<PricingItemCard $isArabic={isArabic}>
														<Form.Item
															{...field}
															name={[field.name, "_id"]}
															hidden
														>
															<Input />
														</Form.Item>
														<Form.Item
															{...field}
															name={[field.name, "pricingBasis", "mode"]}
															hidden
															initialValue='calendar_base'
														>
															<Input />
														</Form.Item>
														<PricingItemHeader $isArabic={isArabic}>
															<span>
																<TagsOutlined />
																{labels.variant}
															</span>
														</PricingItemHeader>
														<VariantSourceNote $isArabic={isArabic}>
															<strong>{labels.variantFormula}</strong>
															<span>{labels.mainCalendarSource}</span>
														</VariantSourceNote>
														<VariantFieldsGrid $isArabic={isArabic}>
															<Form.Item
																{...field}
																name={[field.name, "name"]}
																label={labels.pricingName}
																rules={[
																	{ required: true, message: labels.required },
																]}
															>
																<Input />
															</Form.Item>
															<Form.Item
																{...field}
																name={[field.name, "commissionPercent"]}
																label={labels.commission}
															>
																<InputNumber
																	min={0}
																	max={100}
																	precision={2}
																	prefix={<PercentageOutlined />}
																/>
															</Form.Item>
															<Form.Item
																{...field}
																name={[field.name, "status"]}
																label={labels.status}
															>
																<Radio.Group
																	optionType='button'
																	buttonStyle='solid'
																>
																	<Radio.Button value='open'>
																		{labels.open}
																	</Radio.Button>
																	<Radio.Button value='blocked'>
																		{labels.blocked}
																	</Radio.Button>
																</Radio.Group>
															</Form.Item>
														</VariantFieldsGrid>
														<DerivationPanel $isArabic={isArabic}>
															<Form.Item
																{...field}
																name={[
																	field.name,
																	"pricingBasis",
																	"direction",
																]}
																label={labels.variantFormula}
															>
																<Radio.Group
																	optionType='button'
																	buttonStyle='solid'
																>
																	<Radio.Button value='increase'>
																		{labels.increase}
																	</Radio.Button>
																	<Radio.Button value='decrease'>
																		{labels.decrease}
																	</Radio.Button>
																</Radio.Group>
															</Form.Item>
															<Form.Item
																{...field}
																name={[
																	field.name,
																	"pricingBasis",
																	"adjustmentType",
																]}
																label={labels.adjustmentValue}
															>
																<Radio.Group
																	optionType='button'
																	buttonStyle='solid'
																>
																	<Radio.Button value='money'>
																		{labels.money}
																	</Radio.Button>
																	<Radio.Button value='percentage'>
																		{labels.percentage}
																	</Radio.Button>
																</Radio.Group>
															</Form.Item>
															<Form.Item
																{...field}
																name={[
																	field.name,
																	"pricingBasis",
																	"amount",
																]}
																label={labels.adjustmentValue}
																rules={[
																	{ required: true, message: labels.required },
																]}
															>
																<InputNumber min={0} precision={2} />
															</Form.Item>
														</DerivationPanel>
													</PricingItemCard>
												);
											}}
										</Form.List>
									</VariantFormulaPanel>
									<ActionRow>
										<Button size='large' onClick={cancelEdit}>
											{labels.cancelEdit}
										</Button>
										<Button
											type='primary'
											size='large'
											icon={<SaveOutlined />}
											loading={saving}
											onClick={() => handleSave()}
										>
											{labels.save}
										</Button>
									</ActionRow>
								</Form>
							) : (
								<PreviewEmpty>{labels.edit}</PreviewEmpty>
							)}
						</UpdateEditorPanel>
					</ExistingUpdateLayout>
					) : null}

					{activeVariantTab === VARIANT_TAB_AGENTS ? (
						<AgentPricingPanel>
							<OverallCalendarPricingModal
								embedded
								open={open && activeVariantTab === VARIANT_TAB_AGENTS}
								activeTab='agents'
								userId={userId}
								token={token}
								ownerId={ownerId}
								chosenLanguage={chosenLanguage}
								onSaved={(data) => {
									loadOptions();
									onSaved?.(data);
								}}
							/>
						</AgentPricingPanel>
					) : null}
				</PriceVariantBody>
			</Modal>
			<Modal
				open={previewModalOpen && hasPreview}
				onCancel={() => {
					setPreviewModalOpen(false);
					setSelectedPreviewHotelId("");
					setEditingCell(null);
				}}
				footer={null}
				width='min(1220px, 96vw)'
				centered
				className='overall-price-variant-preview-modal'
				rootClassName={OVERALL_DASHBOARD_MODAL_ROOT_CLASS}
				wrapClassName={OVERALL_DASHBOARD_MODAL_WRAP_CLASS}
				zIndex={OVERALL_DASHBOARD_MODAL_Z_INDEX + 40}
				destroyOnClose={false}
				styles={{
					mask: { zIndex: OVERALL_DASHBOARD_MODAL_Z_INDEX + 39 },
					body: {
						height: "calc(95vh - 48px)",
						maxHeight: "calc(95vh - 48px)",
						overflowY: "hidden",
						paddingTop: 0,
						paddingBottom: 8,
					},
				}}
			>
				<PreviewPanel dir={isArabic ? "rtl" : "ltr"}>
					<PreviewHeader>
						<div>
							<strong>{labels.preview}</strong>
							<span>
								{preview?.dates.length} {labels.day} |{" "}
								{filteredPreviewRooms.length}{" "}
								{labels.roomCount} | {safePreviewIndex + 1} /{" "}
								{monthCards.length}
							</span>
						</div>
						<PreviewActions>
							<Button
								type='primary'
								className='price-variant-preview-save-btn'
								icon={<SaveOutlined />}
								loading={saving}
								onClick={() => handleSave(preview)}
							>
								{labels.save}
							</Button>
							<Button onClick={() => setPreviewModalOpen(false)}>
								{labels.close}
							</Button>
						</PreviewActions>
					</PreviewHeader>

					<PreviewFilterBar>
						<Form.Item label={labels.hotelFilter}>
							<Select
								showSearch
								value={
									selectedPreviewHotelId ||
									previewHotelOptions[0]?.value ||
									undefined
								}
								placeholder={labels.choosePreviewHotel}
								options={previewHotelOptions}
								optionFilterProp='label'
								popupStyle={{
									zIndex: OVERALL_DASHBOARD_MODAL_Z_INDEX + 70,
								}}
								popupClassName={selectPopupClassName}
								onChange={(value) => {
									setSelectedPreviewHotelId(
										value || previewHotelOptions[0]?.value || ""
									);
									setPreviewIndex(0);
								}}
							/>
						</Form.Item>
					</PreviewFilterBar>

					<MonthNavShell>
						<MonthNavArrow
							type='button'
							disabled={!hasPreview || safePreviewIndex <= 0}
							onClick={() => {
								const nextIndex = Math.max(0, safePreviewIndex - 1);
								ensurePreviewMonthLoaded(monthCards[nextIndex], nextIndex);
							}}
							aria-label='Previous month'
						>
							<LeftOutlined />
						</MonthNavArrow>
						<MonthQuickNav>
							{monthCards.map((month, index) => (
								<button
									key={month.key}
									type='button'
									className={index === safePreviewIndex ? "active" : ""}
									onClick={() => ensurePreviewMonthLoaded(month, index)}
								>
									{month.title}
								</button>
							))}
						</MonthQuickNav>
						<MonthNavArrow
							type='button'
							disabled={!hasPreview || safePreviewIndex >= maxPreviewStart}
							onClick={() => {
								const nextIndex = Math.min(
									maxPreviewStart,
									safePreviewIndex + 1
								);
								ensurePreviewMonthLoaded(monthCards[nextIndex], nextIndex);
							}}
							aria-label='Next month'
						>
							<RightOutlined />
						</MonthNavArrow>
					</MonthNavShell>

					<CarouselStage>
						<CarouselViewport>
							<MonthTrack>
								{activeMonth ? (
									<MonthCard key={activeMonth.key}>
										<MonthCardHeader>
											<strong>{activeMonth.title}</strong>
											<MonthCardActions>
												<Button
													size='small'
													onClick={() =>
														setPreviewMonthStatus(activeMonth.rows, false)
													}
													disabled={activeMonth.rows.every(
														(row) => !row.blocked || row.baseBlocked
													)}
												>
													{labels.openMonth}
												</Button>
												<Button
													size='small'
													danger
													icon={<StopOutlined />}
													onClick={() =>
														setPreviewMonthStatus(activeMonth.rows, true)
													}
													disabled={activeMonth.rows.every((row) => row.blocked)}
												>
													{labels.restrictMonth}
												</Button>
												<Tag
													color={
														activeMonth.rows.every((row) => row.blocked)
															? "red"
															: "green"
													}
												>
													{activeMonth.rows.every((row) => row.blocked)
														? labels.restrict
														: labels.open}
												</Tag>
											</MonthCardActions>
										</MonthCardHeader>
										<div className='month-table-scroll'>
											<table>
												<thead>
													<tr>
														<th>{labels.date}</th>
														<th>{labels.pricing}</th>
														<th>{labels.room}</th>
														<th>{labels.mainCalendarPrice}</th>
														<th>{labels.variantPrice}</th>
														<th>{labels.commission}</th>
														<th>{labels.priceSource}</th>
														<th>{labels.action}</th>
													</tr>
												</thead>
												<tbody>
													{activeMonth.rows.map((row) => {
														const previewDate = formatPreviewDate(
															row.date,
															isArabic
														);
														const displayRoomType = roomTypeLabel(
															{
																roomType: row.roomType,
																roomForGender: row.roomForGender,
															},
															isArabic
														);
														return (
															<tr
																key={row.id}
																className={
																	row.blocked ? "restricted-row" : ""
																}
															>
																<td>
																	<span className='date-stack'>
																		<strong>{previewDate.hijri}</strong>
																		<small>{previewDate.gregorian}</small>
																	</span>
																</td>
																<td>
																	<span className='pricing-pill'>
																		{row.pricingName}
																	</span>
																</td>
																<td>
																	<span
																		className='room-type-pill'
																		title={row.roomLabel}
																	>
																		{displayRoomType ||
																			row.roomDisplayName ||
																			row.roomLabel}
																	</span>
																</td>
																<td className='editable-number-cell'>
																	<span className='readonly-price'>
																		{Number(
																			row.mainCalendarPrice ?? row.sellingPrice ?? 0
																		).toFixed(2)}
																	</span>
																</td>
																<td className='editable-number-cell'>
																	{renderEditableNumber(row, "sellingPrice")}
																</td>
																<td className='editable-number-cell'>
																	{renderEditableNumber(
																		row,
																		"commissionPercent",
																		{
																			suffix: "%",
																			max: 100,
																		}
																	)}
																</td>
																<td>
																	<span className='source-pill'>
																		{row.baseSource === "calendar"
																			? labels.calendar
																			: labels.basePrice}
																	</span>
																</td>
																<td>
																	<button
																		type='button'
																		disabled={row.baseBlocked && row.blocked}
																		className={
																			row.blocked
																				? "row-action reopen"
																				: "row-action restrict"
																		}
																		onClick={() =>
																			togglePreviewRowStatus(row.id)
																		}
																	>
																		<StopOutlined />
																		{row.blocked
																			? labels.reopen
																			: labels.restrict}
																	</button>
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</MonthCard>
								) : (
									<PreviewEmpty>{labels.preview}</PreviewEmpty>
								)}
							</MonthTrack>
						</CarouselViewport>
					</CarouselStage>
				</PreviewPanel>
			</Modal>
		</>
	);
};

export default OverallPriceVariantModal;

const PriceVariantGlobalStyle = createGlobalStyle`
	.${OVERALL_DASHBOARD_MODAL_ROOT_CLASS} .ant-modal-mask {
		z-index: ${OVERALL_DASHBOARD_MODAL_Z_INDEX - 1} !important;
	}

	.${OVERALL_DASHBOARD_MODAL_ROOT_CLASS} .ant-modal-wrap,
	.ant-modal-wrap.${OVERALL_DASHBOARD_MODAL_WRAP_CLASS},
	.${OVERALL_DASHBOARD_MODAL_ROOT_CLASS} .ant-modal {
		z-index: ${OVERALL_DASHBOARD_MODAL_Z_INDEX} !important;
	}

	.ant-select-dropdown.overall-dashboard-select-dropdown {
		z-index: ${OVERALL_DASHBOARD_MODAL_Z_INDEX + 20} !important;
	}

	.overall-price-variant-modal .ant-modal-content {
		border-radius: 10px;
	}

	.overall-price-variant-preview-modal .ant-modal-content {
		border-radius: 12px;
		padding: 0;
		overflow: hidden;
	}

	.overall-price-variant-modal .ant-modal-close {
		top: 8px;
	}

	.overall-price-variant-dropdown-rtl {
		direction: rtl;
		text-align: right;
	}
`;

const PriceVariantBody = styled.div`
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: start;

	.ant-form-item {
		margin-bottom: 9px;
	}

	.ant-form-item-label {
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	}

	.ant-form-item-label > label {
		width: 100%;
		justify-content: flex-start;
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
		text-align: start;
	}

	.ant-input,
	.ant-select,
	.ant-input-number,
	.ant-input-number-affix-wrapper,
	.ant-radio-group {
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	}

	.ant-select-selector {
		text-align: start;
	}

	.ant-select-arrow,
	.ant-select-clear {
		${(props) =>
			props.$isArabic
				? `
					left: 11px;
					right: auto;
				`
				: ""}
	}

	.ant-select-single.ant-select-show-arrow .ant-select-selection-item,
	.ant-select-single.ant-select-show-arrow .ant-select-selection-placeholder {
		${(props) =>
			props.$isArabic
				? `
					padding-right: 0;
					padding-left: 18px;
				`
				: ""}
	}

	.ant-radio-button-wrapper {
		font-weight: 900;
		text-align: center;
	}

	.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
		border-color: rgba(20, 184, 166, 0.82) !important;
		background: linear-gradient(
			135deg,
			#0f172a 0%,
			#0f766e 48%,
			#14b8a6 100%
		) !important;
		color: #ffffff !important;
		box-shadow: 0 9px 18px rgba(15, 118, 110, 0.2);
	}

	.ant-tabs-nav {
		margin: 0 0 14px;
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
		min-width: 210px;
		min-height: 46px;
		padding: 0 16px !important;
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

	.price-variant-tab-label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		font-size: 0.9rem;
		font-weight: 950;
		line-height: 1.1;
		white-space: nowrap;
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

	.ant-tabs-tab-active .ant-tabs-tab-btn,
	.ant-tabs-tab-active .price-variant-tab-label,
	.ant-tabs-tab-active .price-variant-tab-label * {
		color: #ffffff !important;
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.18);
	}

	.ant-tabs-ink-bar {
		display: none;
	}

	@media (max-width: 860px) {
		.ant-tabs-nav-list {
			width: 100%;
		}

		.ant-tabs-tab {
			flex: 1 1 0;
			min-width: 0;
			padding-inline: 10px !important;
		}

		.price-variant-tab-label {
			font-size: 0.8rem;
			white-space: normal;
		}
	}
`;

const ModalHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	margin: 4px 44px 14px;
	padding: 12px;
	border-bottom: 1px solid #e2e8f0;
	color: #0f172a;

	.header-icon {
		display: inline-grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 8px;
		background: linear-gradient(135deg, #0f172a 0%, #0f766e 62%, #14b8a6 100%);
		color: #ffffff;
	}

	strong {
		font-size: 1.16rem;
		font-weight: 950;
	}
`;

const FormGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.1fr);
	gap: 10px;
	align-items: start;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: start;

	@media (max-width: 820px) {
		grid-template-columns: 1fr;
	}
`;

const RoomsIncludedPanel = styled.div`
	display: grid;
	gap: 4px;
	min-height: 56px;
	padding: 9px 11px;
	border: 1px solid #dbeafe;
	border-radius: 8px;
	background: #f8fbff;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: start;

	strong {
		color: #0f172a;
		font-size: 0.82rem;
		font-weight: 950;
	}

	span {
		color: #475569;
		font-size: 0.76rem;
		font-weight: 750;
	}

	.ant-tag {
		justify-self: start;
		margin-inline-end: 0;
		font-weight: 900;
	}
`;

const PeriodGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(130px, 0.7fr) minmax(160px, 0.8fr) minmax(130px, 0.7fr) minmax(260px, 1.4fr);
	gap: 10px;
	align-items: start;
	padding: 10px 12px;
	border: 1px solid #dce7ee;
	border-radius: 8px;
	background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);

	@media (max-width: 980px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 620px) {
		grid-template-columns: 1fr;
	}
`;

const VariantFormulaPanel = styled.div`
	display: grid;
	gap: 10px;
	margin-top: 12px;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: start;
`;

const VariantSourceNote = styled.div`
	display: grid;
	gap: 4px;
	margin-bottom: 10px;
	padding: 9px 11px;
	border: 1px solid #dbeafe;
	border-radius: 8px;
	background: linear-gradient(135deg, #f8fbff 0%, #ecfdf5 100%);
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: start;

	strong {
		color: #0f172a;
		font-size: 0.82rem;
		font-weight: 950;
	}

	span {
		color: #475569;
		font-size: 0.76rem;
		font-weight: 750;
		line-height: 1.45;
	}
`;

const VariantFieldsGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(240px, 1fr) minmax(150px, 0.42fr) minmax(160px, 0.46fr);
	gap: 10px;
	align-items: end;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: start;

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const PricingItemsShell = styled.div`
	display: grid;
	gap: 10px;
	margin-top: 12px;

	.ant-btn-dashed {
		min-height: 42px;
		border-radius: 8px;
		font-weight: 900;
	}
`;

const PricingItemCard = styled.div`
	padding: 12px;
	border: 1px solid #dbeafe;
	border-radius: 8px;
	background: #ffffff;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: start;
`;

const PricingItemHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 10px;
	margin-bottom: 8px;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: start;

	span {
		display: inline-flex;
		align-items: center;
		flex-direction: row;
		gap: 8px;
		color: #0f172a;
		font-weight: 950;
	}
`;

const PricingItemGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(240px, 1fr) minmax(160px, 0.45fr);
	gap: 10px;
	align-items: end;

	@media (max-width: 1100px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 620px) {
		grid-template-columns: 1fr;
	}
`;

const DerivationPanel = styled.div`
	display: grid;
	grid-template-columns: minmax(180px, 0.9fr) minmax(180px, 0.9fr) minmax(140px, 0.6fr);
	gap: 10px;
	align-items: end;
	margin-top: 8px;
	padding: 9px 10px;
	border: 1px solid #e9d5ff;
	border-radius: 8px;
	background: #fbf7ff;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: start;

	@media (max-width: 820px) {
		grid-template-columns: 1fr;
	}
`;

const RoomPricingPanel = styled.div`
	display: grid;
	gap: 8px;
	margin-top: 8px;
	padding-top: 10px;
	border-top: 1px solid #e2e8f0;
`;

const RoomPricingHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;

	span {
		color: #0f172a;
		font-size: 0.82rem;
		font-weight: 950;
	}

	.ant-tag {
		margin-inline-end: 0;
		font-weight: 900;
	}
`;

const RoomPricingRows = styled.div`
	display: grid;
	gap: 8px;
	max-height: 360px;
	overflow: auto;
	padding-inline-end: 2px;
`;

const RoomPricingRow = styled.div`
	display: grid;
	grid-template-columns: minmax(260px, 0.72fr) minmax(0, 1.28fr);
	gap: 10px;
	align-items: start;
	padding: 8px;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	background: #f8fafc;

	.room-name {
		display: grid;
		gap: 3px;
		min-width: 0;
		align-self: center;
	}

	.room-name span {
		color: #64748b;
		font-size: 0.68rem;
		font-weight: 850;
	}

	.room-name strong {
		min-width: 0;
		color: #0f172a;
		font-size: 0.78rem;
		font-weight: 950;
		line-height: 1.3;
		overflow-wrap: anywhere;
	}

	.ant-form-item {
		margin-bottom: 0;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const PeriodPriceGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
	gap: 8px;
	min-width: 0;
`;

const PeriodPriceCard = styled.div`
	display: grid;
	gap: 6px;
	min-width: 0;
	padding: 8px;
	border: 1px solid #dbeafe;
	border-radius: 8px;
	background: #ffffff;

	> strong {
		color: #0f172a;
		font-size: 0.78rem;
		font-weight: 950;
		overflow-wrap: anywhere;
	}

	.period-inputs {
		display: grid;
		grid-template-columns: minmax(100px, 1fr) minmax(86px, 0.72fr);
		gap: 7px;
		align-items: end;
	}

	.ant-form-item {
		margin-bottom: 0;
	}

	.ant-form-item-label > label {
		font-size: 0.7rem;
	}

	@media (max-width: 540px) {
		.period-inputs {
			grid-template-columns: 1fr;
		}
	}
`;

const ComputedPriceGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 5px 8px;
	align-items: center;
	min-height: 62px;

	span {
		color: #64748b;
		font-size: 0.7rem;
		font-weight: 850;
	}

	strong {
		color: #0f172a;
		font-size: 0.82rem;
		font-weight: 950;
		text-align: end;
	}
`;

const PreviewPanel = styled.div`
	display: grid;
	grid-template-rows: auto auto auto minmax(0, 1fr);
	box-sizing: border-box;
	height: 100%;
	min-height: 0;
	overflow: hidden;
	padding: 16px;
	background:
		radial-gradient(circle at top, rgba(45, 212, 191, 0.1) 0%, transparent 34%),
		linear-gradient(180deg, rgba(248, 251, 255, 0.98) 0%, #ffffff 42%),
		#ffffff;
	border-radius: 12px;
`;

const PreviewHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 14px;

	div {
		display: grid;
		gap: 2px;
		text-align: start;
	}

	strong {
		color: #0f172a;
		font-size: 1.14rem;
		font-weight: 950;
	}

	span {
		color: #475569;
		font-size: 0.84rem;
		font-weight: 800;
	}

	@media (max-width: 620px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const PreviewActions = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 10px;

	.ant-btn {
		min-height: 38px;
		border-radius: 8px;
		font-weight: 900;
	}

	.ant-btn-primary {
		border: 0;
		background: linear-gradient(135deg, #064e3b 0%, #0f766e 58%, #2dd4bf 100%);
		color: #ffffff !important;
		box-shadow: 0 10px 22px rgba(15, 118, 110, 0.2);
	}

	.price-variant-preview-save-btn,
	.price-variant-preview-save-btn span,
	.price-variant-preview-save-btn svg {
		color: #ffffff !important;
	}

	@media (max-width: 620px) {
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: 100%;
	}
`;

const PreviewFilterBar = styled.div`
	display: flex;
	justify-content: flex-end;
	margin: -4px 0 12px;

	.ant-form-item {
		min-width: min(360px, 100%);
		margin-bottom: 0;
	}

	.ant-form-item-label {
		padding-bottom: 4px;
		text-align: start;
	}

	.ant-form-item-label > label {
		color: #172033;
		font-size: 0.78rem;
		font-weight: 950;
	}

	.ant-select-selector {
		min-height: 38px;
		border-radius: 8px !important;
	}

	@media (max-width: 620px) {
		justify-content: stretch;

		.ant-form-item {
			width: 100%;
		}
	}
`;

const MonthNavShell = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	margin-bottom: 14px;
	min-width: 0;
`;

const MonthNavArrow = styled.button`
	display: inline-grid;
	place-items: center;
	flex: 0 0 auto;
	width: 36px;
	height: 36px;
	border: 1px solid rgba(15, 118, 110, 0.24);
	border-radius: 999px;
	background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%);
	color: #0f766e;
	cursor: pointer;
	box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);

	&:not(:disabled):hover {
		border-color: rgba(45, 212, 191, 0.8);
		background: linear-gradient(135deg, #064e3b 0%, #0f766e 58%, #2dd4bf 100%);
		color: #ffffff;
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.34;
		box-shadow: none;
	}
`;

const MonthQuickNav = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-width: 0;
	padding-bottom: 2px;

	button {
		min-height: 32px;
		padding: 0 12px;
		border: 1px solid #d6e4f3;
		border-radius: 999px;
		background: #ffffff;
		color: #1f3a59;
		font-size: 0.8rem;
		font-weight: 900;
		cursor: pointer;
	}

	button:hover {
		border-color: #93c5fd;
		background: #eff6ff;
		color: #1d4ed8;
	}

	button.active {
		border-color: rgba(15, 118, 110, 0.45);
		background: linear-gradient(135deg, #064e3b 0%, #0f766e 58%, #2dd4bf 100%);
		color: #ffffff;
		box-shadow: 0 8px 18px rgba(15, 118, 110, 0.18);
	}
`;

const CarouselStage = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-items: center;
	height: 100%;
	min-height: 0;
	overflow: hidden;
`;

const CarouselViewport = styled.div`
	display: grid;
	place-items: center;
	height: 100%;
	min-height: 0;
	min-width: 0;
	overflow: hidden;
`;

const MonthTrack = styled.div`
	display: grid;
	place-items: center;
	height: 100%;
	min-height: 0;
	width: 100%;
`;

const MonthCard = styled.div`
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	width: min(100%, 1040px);
	height: 100%;
	min-height: 0;
	border: 1px solid #cfe0f2;
	border-radius: 8px;
	background: #ffffff;
	box-shadow: 0 10px 22px rgba(15, 23, 42, 0.07);
	overflow: hidden;

	.month-table-scroll {
		min-height: 0;
		overflow-y: auto;
		overflow-x: auto;
		scrollbar-gutter: stable;
		overscroll-behavior: contain;
	}

	table {
		width: 100%;
		min-width: 980px;
		border-collapse: collapse;
		table-layout: fixed;
	}

	th,
	td {
		padding: 9px 7px;
		border-bottom: 1px solid #eef2f7;
		font-size: 0.8rem;
		text-align: start;
		vertical-align: middle;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 3;
		background: #f1f7ff;
		color: #24364e;
		font-weight: 950;
		box-shadow: 0 1px 0 #dfeaf6;
	}

	td {
		color: #172033;
		font-weight: 750;
	}

	th:nth-child(1),
	td:nth-child(1) {
		width: 16%;
	}

	th:nth-child(2),
	td:nth-child(2) {
		width: 14%;
	}

	th:nth-child(3),
	td:nth-child(3) {
		width: 14%;
	}

	th:nth-child(4),
	td:nth-child(4),
	th:nth-child(5),
	td:nth-child(5),
	th:nth-child(6),
	td:nth-child(6) {
		width: 12%;
		text-align: center;
	}

	th:nth-child(7),
	td:nth-child(7) {
		width: 10%;
		text-align: center;
	}

	th:nth-child(8),
	td:nth-child(8) {
		width: 10%;
		text-align: center;
	}

	tbody tr:hover {
		background: #f8fbff;
	}

	.date-stack {
		display: grid;
		gap: 2px;
		line-height: 1.25;
	}

	.date-stack strong {
		color: #0f172a;
		font-size: 0.78rem;
		font-weight: 950;
	}

	.date-stack small {
		color: #64748b;
		font-size: 0.7rem;
		font-weight: 850;
	}

	.pricing-pill,
	.room-type-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		max-width: 100%;
		min-height: 28px;
		padding: 3px 9px;
		border: 1px solid #d6e4f3;
		border-radius: 999px;
		background: #f8fbff;
		color: #0f172a;
		font-size: 0.76rem;
		font-weight: 950;
		line-height: 1.25;
		overflow-wrap: anywhere;
		text-align: center;
	}

	.pricing-pill {
		background: #fbf7ff;
		border-color: #e9d5ff;
	}

	.source-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		max-width: 100%;
		min-height: 26px;
		padding: 3px 8px;
		border: 1px solid #dbeafe;
		border-radius: 999px;
		background: #eff6ff;
		color: #1d4ed8;
		font-size: 0.7rem;
		font-weight: 950;
		text-align: center;
	}

	.readonly-price {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 70px;
		min-height: 30px;
		padding: 0 8px;
		border: 1px solid #e2e8f0;
		border-radius: 7px;
		background: #f8fafc;
		color: #475569;
		font-weight: 950;
	}

	.editable-number-cell .ant-input-number {
		width: min(100%, 94px);
	}

	.editable-cell {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 70px;
		min-height: 30px;
		padding: 0 8px;
		border: 1px solid #d6e4f3;
		border-radius: 7px;
		background: #ffffff;
		color: #172033;
		font-weight: 950;
		cursor: text;
	}

	.editable-cell:not(:disabled):hover {
		border-color: rgba(45, 212, 191, 0.78);
		background: #f0fdfa;
	}

	.editable-cell:disabled {
		cursor: not-allowed;
		opacity: 0.82;
	}

	.restricted-row {
		background: #fff7f7;
	}

	.restricted-row td {
		color: #7f1d1d;
	}

	.row-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		min-width: 82px;
		min-height: 30px;
		padding: 0 8px;
		border: 1px solid transparent;
		border-radius: 7px;
		background: #ffffff;
		font-size: 0.74rem;
		font-weight: 950;
		cursor: pointer;
	}

	.row-action.restrict {
		border-color: #fecaca;
		background: #fff5f5;
		color: #991b1b;
	}

	.row-action.reopen {
		border-color: #bbf7d0;
		background: #ecfdf5;
		color: #047857;
	}

	.row-action:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	@media (max-width: 720px) {
		table {
			min-width: 820px;
		}

		th,
		td {
			padding: 8px 5px;
			font-size: 0.7rem;
		}

		.pricing-pill,
		.room-type-pill,
		.source-pill,
		.row-action,
		.editable-cell,
		.readonly-price {
			min-width: 0;
			width: 100%;
			font-size: 0.68rem;
			padding-inline: 4px;
		}
	}
`;

const MonthCardHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 11px 12px;
	border-bottom: 1px solid #e2e8f0;
	background:
		linear-gradient(135deg, rgba(239, 246, 255, 0.98) 0%, rgba(236, 253, 245, 0.98) 100%),
		#f8fbff;

	strong {
		color: #0f172a;
		font-size: 0.96rem;
		font-weight: 950;
	}

	@media (max-width: 720px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const MonthCardActions = styled.div`
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	gap: 7px;
	flex-wrap: wrap;

	.ant-btn {
		min-height: 30px;
		border-radius: 7px;
		font-size: 0.72rem;
		font-weight: 900;
	}

	.ant-tag {
		margin-inline-end: 0;
		font-weight: 900;
	}

	@media (max-width: 720px) {
		justify-content: flex-start;
	}
`;

const PreviewEmpty = styled.div`
	display: grid;
	place-items: center;
	min-height: 112px;
	border: 1px dashed #cbd5e1;
	border-radius: 8px;
	background: #f8fafc;
	color: #64748b;
	font-weight: 900;
	text-align: center;
`;

const ActionRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin: 14px 0 12px;

	.ant-btn {
		min-width: 210px;
		min-height: 42px;
		border-radius: 8px;
		font-weight: 900;
	}

	.ant-btn-primary {
		border: 0;
		background: linear-gradient(135deg, #0f172a 0%, #0f766e 58%, #14b8a6 100%);
		color: #ffffff !important;
		box-shadow: 0 12px 24px rgba(15, 118, 110, 0.2);
	}
`;

const ExistingPanel = styled.div`
	margin-top: 10px;
	padding-top: 12px;
	border-top: 1px solid #e2e8f0;
`;

const AgentPricingPanel = styled.div`
	margin-top: 10px;
	padding: 12px;
	border: 1px solid #dce7ee;
	border-radius: 8px;
	background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
`;

const ExistingHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	margin-bottom: 10px;

	strong {
		color: #0f172a;
		font-size: 0.98rem;
		font-weight: 950;
	}
`;

const ExistingGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;

	@media (max-width: 980px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 620px) {
		grid-template-columns: 1fr;
	}
`;

const ExistingUpdateLayout = styled.div`
	display: grid;
	grid-template-columns: ${(props) =>
		props.$editing ? "minmax(280px, 0.78fr) minmax(520px, 1.22fr)" : "1fr"};
	gap: 14px;
	align-items: start;

	${ExistingPanel} {
		min-width: 0;
	}

	${ExistingGrid} {
		grid-template-columns: ${(props) =>
			props.$editing ? "1fr" : "repeat(3, minmax(0, 1fr))"};
		max-height: ${(props) => (props.$editing ? "calc(100vh - 245px)" : "none")};
		overflow: ${(props) => (props.$editing ? "auto" : "visible")};
		padding-inline-end: ${(props) => (props.$editing ? "3px" : "0")};
	}

	@media (max-width: 1120px) {
		grid-template-columns: 1fr;

		${ExistingGrid} {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			max-height: none;
			overflow: visible;
		}
	}

	@media (max-width: 620px) {
		${ExistingGrid} {
			grid-template-columns: 1fr;
		}
	}
`;

const UpdateEditorPanel = styled.div`
	min-width: 0;
	padding: 12px;
	border: 1px solid #dbeafe;
	border-radius: 8px;
	background:
		linear-gradient(135deg, rgba(248, 251, 255, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%),
		#ffffff;
	box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: start;
`;

const ExistingCard = styled.div`
	display: grid;
	gap: 8px;
	padding: 10px;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	background: #f8fafc;

	&.is-active {
		border-color: rgba(20, 184, 166, 0.72);
		background: linear-gradient(135deg, #f0fdfa 0%, #f8fbff 100%);
		box-shadow: 0 8px 18px rgba(15, 118, 110, 0.12);
	}

	.existing-top,
	.existing-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.existing-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 0 0 auto;
		justify-content: flex-end;
		flex-wrap: nowrap;
	}

	.existing-actions .ant-btn {
		min-height: 26px;
		border-radius: 6px;
		font-size: 0.72rem;
		font-weight: 900;
		white-space: nowrap;
	}

	.existing-actions .ant-tag {
		margin-inline-end: 0;
		text-align: center;
		white-space: nowrap;
	}

	.existing-top strong {
		min-width: 0;
		color: #0f172a;
		font-size: 0.84rem;
		font-weight: 950;
		overflow-wrap: anywhere;
	}

	@media (max-width: 760px) {
		.existing-top {
			align-items: flex-start;
			flex-direction: column;
		}

		.existing-actions {
			width: 100%;
			justify-content: flex-start;
			flex-wrap: wrap;
		}
	}

	.existing-meta {
		flex-wrap: wrap;
		justify-content: flex-start;
	}

	.existing-meta span,
	small {
		color: #475569;
		font-size: 0.76rem;
		font-weight: 850;
	}
`;
