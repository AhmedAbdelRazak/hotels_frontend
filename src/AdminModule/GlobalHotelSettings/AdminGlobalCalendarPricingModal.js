import React, { useEffect, useMemo, useState } from "react";
import {
	Button,
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
	CalendarOutlined,
	DollarOutlined,
	GlobalOutlined,
	LeftOutlined,
	PercentageOutlined,
	RightOutlined,
	SaveOutlined,
	StopOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import moment from "moment-hijri";
import styled, { createGlobalStyle } from "styled-components";
import {
	getAdminGlobalCalendarPricingOptions,
	saveAdminGlobalCalendarPricing,
} from "../apiAdmin";
import {
	titleCase,
} from "../../HotelModule/TheOverallStructure/overallShared";

const ADMIN_GLOBAL_SETTINGS_MODAL_Z_INDEX = 65000;
const ADMIN_GLOBAL_SETTINGS_MODAL_ROOT_CLASS =
	"admin-global-settings-modal-root";
const ADMIN_GLOBAL_SETTINGS_MODAL_WRAP_CLASS =
	"admin-global-settings-modal-wrap";

const MODAL_TAB_GENERAL = "general";
const MODAL_TAB_AGENTS = "agents";
const MAX_PREVIEW_DAYS = 370;

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
		generalTab: "Add / Update Pricing General",
		agentsTab: "Add / Update Pricing Agents",
		hotels: "Hotels",
		rooms: "Rooms",
		agents: "Agents",
		chooseHotels: "Choose hotels",
		chooseRooms: "Choose rooms",
		chooseAgents: "Choose agents",
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
		sellingPrice: "Selling Price Per Night",
		commission: "Commission %",
		status: "Status",
		open: "Open",
		blocked: "Closed",
		restrict: "Restrict",
		reopen: "Open",
		action: "Action",
		showing: "Showing",
		generate: "Generate preview",
		save: "Save pricing",
		close: "Close",
		required: "Required",
		preview: "Preview",
		noPreview: "Generate a preview before saving.",
		day: "Day",
		date: "Date",
		room: "Room",
		selling: "Price / Night",
		saved: "Calendar pricing saved successfully",
		tooManyDays: "Please select 370 days or fewer.",
		noRooms: "No rooms are available for the selected hotels.",
		noAgents: "No approved agents are available for the selected hotels.",
		scopeGeneral: "Website / general calendar",
		scopeAgents: "Agent-specific calendar",
	},
	ar: {
		generalTab:
			"\u0625\u0636\u0627\u0641\u0629 / \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u0639\u0627\u0645",
		agentsTab:
			"\u0625\u0636\u0627\u0641\u0629 / \u062a\u062d\u062f\u064a\u062b \u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u0648\u0643\u0644\u0627\u0621",
		hotels: "\u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		rooms: "\u0627\u0644\u063a\u0631\u0641",
		agents: "\u0627\u0644\u0648\u0643\u0644\u0627\u0621",
		chooseHotels: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		chooseRooms: "\u0627\u062e\u062a\u0631 \u0627\u0644\u063a\u0631\u0641",
		chooseAgents: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0648\u0643\u0644\u0627\u0621",
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
		sellingPrice: "\u0633\u0639\u0631 \u0627\u0644\u0628\u064a\u0639 \u0644\u0643\u0644 \u0644\u064a\u0644\u0629",
		commission: "\u0627\u0644\u0639\u0645\u0648\u0644\u0629 %",
		status: "\u0627\u0644\u062d\u0627\u0644\u0629",
		open: "\u0645\u0641\u062a\u0648\u062d",
		blocked: "\u0645\u063a\u0644\u0642",
		restrict: "\u0645\u062d\u0638\u0648\u0631",
		reopen: "\u0641\u062a\u062d",
		action: "\u0625\u062c\u0631\u0627\u0621",
		showing: "\u0639\u0631\u0636",
		generate: "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629",
		save: "\u062d\u0641\u0638 \u0627\u0644\u062a\u0633\u0639\u064a\u0631",
		close: "\u0625\u063a\u0644\u0627\u0642",
		required: "\u0645\u0637\u0644\u0648\u0628",
		preview: "\u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629",
		noPreview: "\u0623\u0646\u0634\u0626 \u0645\u0639\u0627\u064a\u0646\u0629 \u0642\u0628\u0644 \u0627\u0644\u062d\u0641\u0638.",
		day: "\u0627\u0644\u064a\u0648\u0645",
		date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
		room: "\u0627\u0644\u063a\u0631\u0641\u0629",
		selling: "\u0627\u0644\u0633\u0639\u0631 / \u0644\u064a\u0644\u0629",
		saved: "\u062a\u0645 \u062d\u0641\u0638 \u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0628\u0646\u062c\u0627\u062d",
		tooManyDays:
			"\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 370 \u064a\u0648\u0645\u0627 \u0623\u0648 \u0623\u0642\u0644.",
		noRooms:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u063a\u0631\u0641 \u0645\u062a\u0627\u062d\u0629 \u0644\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
		noAgents:
			"\u0644\u0627 \u064a\u0648\u062c\u062f \u0648\u0643\u0644\u0627\u0621 \u0645\u0639\u062a\u0645\u062f\u0648\u0646 \u0644\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
		scopeGeneral: "\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0645\u0648\u0642\u0639 / \u0627\u0644\u0639\u0627\u0645",
		scopeAgents:
			"\u062a\u0642\u0648\u064a\u0645 \u0645\u062e\u0635\u0635 \u0644\u0644\u0648\u0643\u0644\u0627\u0621",
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
const normalizeCalendarTab = (value) =>
	value === MODAL_TAB_AGENTS ? MODAL_TAB_AGENTS : MODAL_TAB_GENERAL;

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

const defaultValues = () => {
	const now = moment();
	return {
		hotelIds: [],
		roomSelections: [],
		agentIds: [],
		calendarType: "hijri",
		periodMode: "months",
		hijriYear: now.iYear(),
		hijriMonths: [now.iMonth()],
		gregorianYear: now.year(),
		gregorianMonths: [now.month()],
		status: "open",
		sellingPrice: null,
		commissionPercent: 0,
		startDate: now.format("YYYY-MM-DD"),
		endDate: now.clone().add(6, "days").format("YYYY-MM-DD"),
	};
};

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

const datesFromValues = (values = {}) => {
	if (values.periodMode === "custom") {
		return enumerateDates(values.startDate, values.endDate);
	}
	const calendarType = values.calendarType === "gregorian" ? "gregorian" : "hijri";
	const months =
		calendarType === "hijri" ? values.hijriMonths : values.gregorianMonths;
	const year = calendarType === "hijri" ? values.hijriYear : values.gregorianYear;
	return [
		...new Set(
			(Array.isArray(months) ? months : [])
				.flatMap((month) => monthDateRange({ calendarType, month, year }))
				.filter(Boolean)
		),
	].sort();
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

const buildMonthCardsFromRows = (rows = [], calendarType = "hijri", isArabic = false) =>
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
					? `${left.roomTypeKey || left.roomType}:${left.roomDisplayName || ""}`.localeCompare(
							`${right.roomTypeKey || right.roomType}:${right.roomDisplayName || ""}`
					  )
					: left.date.localeCompare(right.date)
			),
		}));

const makeRoomKey = (hotelId, roomId) => `${hotelId}::${roomId}`;
const parseRoomKey = (key = "") => {
	const [hotelId, roomId] = String(key || "").split("::");
	return { hotelId, roomId };
};

const AdminGlobalCalendarPricingModal = ({
	open,
	onClose,
	activeTab = MODAL_TAB_GENERAL,
	onTabChange,
	userId,
	token,
	chosenLanguage,
	onSaved,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const labels = TEXT[isArabic ? "ar" : "en"];
	const normalizedActiveTab = normalizeCalendarTab(activeTab);
	const [hotels, setHotels] = useState([]);
	const [agents, setAgents] = useState([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [preview, setPreview] = useState(null);
	const [previewIndex, setPreviewIndex] = useState(0);
	const [previewModalOpen, setPreviewModalOpen] = useState(false);
	const [editingCell, setEditingCell] = useState(null);
	const [generalForm] = Form.useForm();
	const [agentsForm] = Form.useForm();
	const activeForm = normalizedActiveTab === MODAL_TAB_AGENTS ? agentsForm : generalForm;
	const selectPopupStyle = { zIndex: ADMIN_GLOBAL_SETTINGS_MODAL_Z_INDEX + 20 };
	const selectPopupClassName = `admin-global-settings-select-dropdown ${
		isArabic ? "admin-global-calendar-pricing-dropdown-rtl" : ""
	}`.trim();

	const hotelOptions = useMemo(
		() =>
			hotels.map((hotel) => ({
				value: normalizeId(hotel._id),
				label: titleCase(hotel.hotelName),
			})),
		[hotels]
	);

	const selectedHotelIds = Form.useWatch("hotelIds", activeForm) || [];
	const selectedStatus = Form.useWatch("status", activeForm) || "open";
	const selectedCalendarType = Form.useWatch("calendarType", activeForm) || "hijri";
	const selectedPeriodMode = Form.useWatch("periodMode", activeForm) || "months";

	const selectedHotels = selectedHotelIds
		.map((hotelId) =>
			hotels.find((hotel) => normalizeId(hotel._id) === normalizeId(hotelId))
		)
		.filter(Boolean);

	const roomOptions = selectedHotels.flatMap((hotel) =>
		(Array.isArray(hotel.rooms) ? hotel.rooms : [])
			.filter((room) => room.activeRoom !== false)
			.map((room) => {
				const displayName = isArabic
					? room.displayName_OtherLanguage || room.displayName
					: room.displayName || room.displayName_OtherLanguage;
				const actualRoomTypeLabel = roomTypeLabel(room, isArabic);
				return {
					value: makeRoomKey(normalizeId(hotel._id), normalizeId(room._id)),
					label: `${titleCase(hotel.hotelName)} - ${actualRoomTypeLabel}${
						displayName ? ` - ${displayName}` : ""
					}`,
					hotelName: titleCase(hotel.hotelName),
					roomType: room.roomType || "",
					roomForGender: room.roomForGender || "",
					roomTypeLabel: actualRoomTypeLabel,
					roomDisplayName: displayName || room.displayName || room.roomType || "",
				};
			})
	);

	const filteredAgentOptions = agents
		.filter((agent) => {
			if (!selectedHotelIds.length) return false;
			const scoped = new Set((agent.hotelIds || []).map(normalizeId));
			return selectedHotelIds.some((hotelId) => scoped.has(normalizeId(hotelId)));
		})
		.map((agent) => ({
			value: normalizeId(agent._id),
			label: `${titleCase(agent.name)}${
				agent.companyName ? ` - ${titleCase(agent.companyName)}` : ""
			}`,
		}));

	useEffect(() => {
		if (!open || !userId || !token) return;
		setLoading(true);
		getAdminGlobalCalendarPricingOptions(userId, token)
			.then((data) => {
				if (data?.error) {
					message.error(data.error);
					return;
				}
				setHotels(Array.isArray(data?.hotels) ? data.hotels : []);
				setAgents(Array.isArray(data?.agents) ? data.agents : []);
			})
			.finally(() => setLoading(false));
	}, [open, token, userId]);

	useEffect(() => {
		if (!open) return;
		const values = defaultValues();
		generalForm.setFieldsValue(values);
		agentsForm.setFieldsValue(values);
		setPreview(null);
		setPreviewIndex(0);
		setPreviewModalOpen(false);
		setEditingCell(null);
	}, [agentsForm, generalForm, open]);

	const syncHotelDependentFields = (form, hotelIds = [], mode = MODAL_TAB_GENERAL) => {
		const selected = hotels.filter((hotel) =>
			hotelIds.map(normalizeId).includes(normalizeId(hotel._id))
		);
		const validRoomKeys = new Set(
			selected.flatMap((hotel) =>
			(Array.isArray(hotel.rooms) ? hotel.rooms : [])
				.filter((room) => room.activeRoom !== false)
				.map((room) => makeRoomKey(normalizeId(hotel._id), normalizeId(room._id)))
			)
		);
		const nextRooms = (form.getFieldValue("roomSelections") || []).filter(
			(roomKey) => validRoomKeys.has(roomKey)
		);
		const currentAgents = form.getFieldValue("agentIds") || [];
		const nextAgentIds =
			mode === MODAL_TAB_AGENTS
				? currentAgents.filter((agentId) => {
						const agent = agents.find(
							(item) => normalizeId(item._id) === normalizeId(agentId)
						);
						const scoped = new Set((agent?.hotelIds || []).map(normalizeId));
						return hotelIds.some((hotelId) => scoped.has(normalizeId(hotelId)));
				  })
				: currentAgents;
		form.setFieldsValue({
			roomSelections: nextRooms,
			...(mode === MODAL_TAB_AGENTS ? { agentIds: nextAgentIds } : {}),
		});
		setPreview(null);
		setPreviewIndex(0);
		setPreviewModalOpen(false);
		setEditingCell(null);
	};

	const buildPreview = async (
		mode = normalizedActiveTab,
		{ openPreviewModal = true } = {}
	) => {
		const form = mode === MODAL_TAB_AGENTS ? agentsForm : generalForm;
		const values = await form.validateFields();
		const dates = datesFromValues(values);
		if (!dates.length) {
			message.error(labels.required);
			return null;
		}
		if (dates.length > MAX_PREVIEW_DAYS) {
			message.error(labels.tooManyDays);
			return null;
		}
		const roomsByKey = new Map(roomOptions.map((option) => [option.value, option]));
		const rooms = (values.roomSelections || []).map((roomKey) => {
			const option = roomsByKey.get(roomKey) || {};
			return {
				key: roomKey,
				label: option.label || roomKey,
				roomType: option.roomType || "",
				roomForGender: option.roomForGender || "",
				roomTypeLabel: option.roomTypeLabel || option.label || roomKey,
				roomDisplayName: option.roomDisplayName || option.label || roomKey,
				...parseRoomKey(roomKey),
			};
		});
		if (!rooms.length) {
			message.error(labels.noRooms);
			return null;
		}
		if (mode === MODAL_TAB_AGENTS && !(values.agentIds || []).length) {
			message.error(labels.noAgents);
			return null;
		}
		const defaultBlocked = values.status === "blocked";
		const defaultSellingPrice = defaultBlocked ? 0 : Number(values.sellingPrice || 0);
		const defaultCommissionPercent = defaultBlocked
			? 0
			: Number(values.commissionPercent || 0);
		const rows = dates.flatMap((date) =>
			rooms.map((room) => ({
				id: `${date}::${room.key}`,
				date,
				room: room.label,
				roomType: room.roomTypeLabel,
				roomTypeKey: room.roomType,
				roomForGender: room.roomForGender,
				roomDisplayName: room.roomDisplayName,
				hotelId: room.hotelId,
				roomId: room.roomId,
				sellingPrice: defaultSellingPrice,
				commissionPercent: defaultCommissionPercent,
				status: defaultBlocked ? "blocked" : "open",
				blocked: defaultBlocked,
			}))
		);
		const nextPreview = {
			mode,
			values,
			dates,
			rooms,
			rows,
			monthCards: buildMonthCardsFromRows(rows, values.calendarType, isArabic),
		};
		setPreview(nextPreview);
		setPreviewIndex(0);
		setEditingCell(null);
		if (openPreviewModal) setPreviewModalOpen(true);
		return nextPreview;
	};

	const togglePreviewRowStatus = (rowId) => {
		setPreview((current) => {
			if (!current) return current;
			const baseSellingPrice = Number(current.values?.sellingPrice || 0);
			const baseCommissionPercent = Number(current.values?.commissionPercent || 0);
			const rows = (current.rows || []).map((row) => {
				if (row.id !== rowId) return row;
				const nextBlocked = !row.blocked;
				return {
					...row,
					blocked: nextBlocked,
					status: nextBlocked ? "blocked" : "open",
					previousSellingPrice: nextBlocked
						? row.sellingPrice
						: row.previousSellingPrice,
					previousCommissionPercent: nextBlocked
						? row.commissionPercent
						: row.previousCommissionPercent,
					sellingPrice: nextBlocked
						? 0
						: Number(row.previousSellingPrice || baseSellingPrice || 0),
					commissionPercent: nextBlocked
						? 0
						: Number(row.previousCommissionPercent ?? baseCommissionPercent ?? 0),
				};
			});
			return {
				...current,
				rows,
				monthCards: buildMonthCardsFromRows(
					rows,
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
			const nextValue = Number(value || 0);
			const rows = (current.rows || []).map((row) => {
				if (row.id !== rowId || row.blocked) return row;
				const normalized =
					field === "commissionPercent"
						? Math.min(Math.max(nextValue, 0), 100)
						: Math.max(nextValue, 0);
				return {
					...row,
					[field]: Number(normalized.toFixed(2)),
				};
			});
			return {
				...current,
				rows,
				monthCards: buildMonthCardsFromRows(
					rows,
					current.values?.calendarType || "hijri",
					isArabic
				),
			};
		});
	};

	const startEditingCell = (row, field) => {
		if (row.blocked) return;
		setEditingCell({ rowId: row.id, field });
	};

	const finishEditingCell = () => setEditingCell(null);

	const savePricing = async (mode = normalizedActiveTab) => {
		const nextPreview =
			preview?.mode === mode
				? preview
				: await buildPreview(mode, { openPreviewModal: false });
		if (!nextPreview) return;
		const values = nextPreview.values;
		setSaving(true);
		try {
			const payload = {
				scope: mode === MODAL_TAB_AGENTS ? "agents" : "general",
				hotelIds: values.hotelIds || [],
				roomSelections: (values.roomSelections || []).map(parseRoomKey),
				agentIds: mode === MODAL_TAB_AGENTS ? values.agentIds || [] : [],
				dates: nextPreview.dates,
				calendarType: values.calendarType,
				status: values.status,
				sellingPrice: values.sellingPrice,
				commissionPercent: values.commissionPercent || 0,
				rows: (nextPreview.rows || []).map((row) => ({
					hotelId: row.hotelId,
					roomId: row.roomId,
					calendarDate: row.date,
					status: row.blocked ? "blocked" : "open",
					sellingPrice: row.blocked ? 0 : row.sellingPrice,
					commissionPercent: row.blocked ? 0 : row.commissionPercent,
				})),
			};
			const data = await saveAdminGlobalCalendarPricing(userId, token, payload);
			if (data?.error) {
				message.error(data.error);
				return;
			}
			message.success(labels.saved);
			if (Array.isArray(data?.updatedHotels)) {
				const updatedById = new Map(
					data.updatedHotels.map((hotel) => [normalizeId(hotel._id), hotel])
				);
				setHotels((current) =>
					current.map((hotel) => updatedById.get(normalizeId(hotel._id)) || hotel)
				);
			}
			onSaved?.(data);
			setPreviewModalOpen(false);
		} finally {
			setSaving(false);
		}
	};

	const monthOptions = (selectedCalendarType === "hijri"
		? isArabic
			? hijriMonthsAr
			: hijriMonthsEn
		: isArabic
		  ? gregorianMonthsAr
		  : gregorianMonthsEn
	).map((label, index) => ({ value: index, label }));

	const renderPricingForm = (mode) => {
		const form = mode === MODAL_TAB_AGENTS ? agentsForm : generalForm;
		return (
			<Form form={form} layout='vertical' requiredMark={false} initialValues={defaultValues()}>
				<FormGrid>
					<Form.Item
						name='hotelIds'
						label={labels.hotels}
						rules={[{ required: true, type: "array", min: 1, message: labels.required }]}
					>
						<Select
							showSearch
							mode='multiple'
							maxTagCount='responsive'
							allowClear
							loading={loading}
							placeholder={labels.chooseHotels}
							options={hotelOptions}
							optionFilterProp='label'
							popupStyle={selectPopupStyle}
							popupClassName={selectPopupClassName}
							onChange={(hotelIds) => syncHotelDependentFields(form, hotelIds, mode)}
						/>
					</Form.Item>
					<Form.Item
						name='roomSelections'
						label={labels.rooms}
						rules={[{ required: true, type: "array", min: 1, message: labels.required }]}
					>
						<Select
							showSearch
							mode='multiple'
							maxTagCount='responsive'
							allowClear
							disabled={!selectedHotelIds.length}
							placeholder={labels.chooseRooms}
							options={roomOptions}
							optionFilterProp='label'
							popupStyle={selectPopupStyle}
							popupClassName={selectPopupClassName}
							onChange={() => setPreview(null)}
						/>
					</Form.Item>
					{mode === MODAL_TAB_AGENTS ? (
						<Form.Item
							name='agentIds'
							label={labels.agents}
							rules={[
								{ required: true, type: "array", min: 1, message: labels.required },
							]}
						>
							<Select
								showSearch
								mode='multiple'
								maxTagCount='responsive'
								allowClear
								disabled={!selectedHotelIds.length}
								placeholder={labels.chooseAgents}
								options={filteredAgentOptions}
								optionFilterProp='label'
								popupStyle={selectPopupStyle}
								popupClassName={selectPopupClassName}
								onChange={() => setPreview(null)}
							/>
						</Form.Item>
					) : null}
				</FormGrid>

				<PeriodGrid>
					<Form.Item name='calendarType' label={labels.calendar}>
						<Radio.Group
							optionType='button'
							buttonStyle='solid'
							onChange={() => setPreview(null)}
						>
							<Radio.Button value='hijri'>{labels.hijri}</Radio.Button>
							<Radio.Button value='gregorian'>{labels.gregorian}</Radio.Button>
						</Radio.Group>
					</Form.Item>
					<Form.Item name='periodMode' label={labels.period}>
						<Radio.Group
							optionType='button'
							buttonStyle='solid'
							onChange={() => setPreview(null)}
						>
							<Radio.Button value='months'>{labels.months}</Radio.Button>
							<Radio.Button value='custom'>{labels.customRange}</Radio.Button>
						</Radio.Group>
					</Form.Item>
					{selectedPeriodMode === "months" ? (
						<>
							<Form.Item
								name={selectedCalendarType === "hijri" ? "hijriYear" : "gregorianYear"}
								label={
									selectedCalendarType === "hijri"
										? labels.hijriYear
										: labels.gregorianYear
								}
								rules={[{ required: true, message: labels.required }]}
							>
								<InputNumber precision={0} min={1300} max={2200} onChange={() => setPreview(null)} />
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
									{ required: true, type: "array", min: 1, message: labels.required },
								]}
							>
								<Select
									mode='multiple'
									maxTagCount='responsive'
									options={monthOptions}
									popupStyle={selectPopupStyle}
									popupClassName={selectPopupClassName}
									onChange={() => setPreview(null)}
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
								<Input type='date' onChange={() => setPreview(null)} />
							</Form.Item>
							<Form.Item
								name='endDate'
								label={labels.endDate}
								rules={[{ required: true, message: labels.required }]}
							>
								<Input type='date' onChange={() => setPreview(null)} />
							</Form.Item>
						</>
					)}
				</PeriodGrid>

				<PricingGrid>
					<Form.Item name='status' label={labels.status}>
						<Radio.Group
							optionType='button'
							buttonStyle='solid'
							onChange={() => setPreview(null)}
						>
							<Radio.Button value='open'>{labels.open}</Radio.Button>
							<Radio.Button value='blocked'>{labels.blocked}</Radio.Button>
						</Radio.Group>
					</Form.Item>
					<Form.Item
						name='sellingPrice'
						label={labels.sellingPrice}
						rules={[
							({ getFieldValue }) => ({
								validator(_, value) {
									if (getFieldValue("status") === "blocked") return Promise.resolve();
									return Number(value) > 0
										? Promise.resolve()
										: Promise.reject(new Error(labels.required));
								},
							}),
						]}
					>
						<InputNumber
							min={0}
							precision={2}
							disabled={selectedStatus === "blocked"}
							prefix={<DollarOutlined />}
							onChange={() => setPreview(null)}
						/>
					</Form.Item>
					<Form.Item name='commissionPercent' label={labels.commission}>
						<InputNumber
							min={0}
							max={100}
							precision={2}
							disabled={selectedStatus === "blocked"}
							prefix={<PercentageOutlined />}
							onChange={() => setPreview(null)}
						/>
					</Form.Item>
				</PricingGrid>

				<ActionRow>
					<Button
						type='default'
						size='large'
						icon={<CalendarOutlined />}
						onClick={() => buildPreview(mode)}
					>
						{labels.generate}
					</Button>
					<Button
						type='primary'
						size='large'
						icon={<SaveOutlined />}
						loading={saving}
						onClick={() => savePricing(mode)}
					>
						{labels.save}
					</Button>
				</ActionRow>
			</Form>
		);
	};

	const monthCards = preview?.monthCards || [];
	const hasPreview = Boolean(preview && monthCards.length);
	const maxPreviewStart = hasPreview ? Math.max(monthCards.length - 1, 0) : 0;
	const safePreviewIndex = hasPreview
		? Math.min(previewIndex, maxPreviewStart)
		: 0;
	const activeMonth = hasPreview ? monthCards[safePreviewIndex] : null;
	const renderEditableNumber = (row, field, { suffix = "", max } = {}) => {
		const isEditing =
			editingCell?.rowId === row.id && editingCell?.field === field;
		const value = Number(row[field] || 0);
		if (isEditing) {
			return (
				<InputNumber
					autoFocus
					size='small'
					min={field === "sellingPrice" ? 0.01 : 0}
					max={max}
					precision={2}
					value={value}
					onChange={(nextValue) => updatePreviewRowValue(row.id, field, nextValue)}
					onBlur={finishEditingCell}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === "Escape") {
							finishEditingCell();
						}
					}}
				/>
			);
		}
		return (
			<button
				type='button'
				className='editable-cell'
				disabled={row.blocked}
				onDoubleClick={() => startEditingCell(row, field)}
			>
				{row.blocked ? "-" : `${value}${suffix}`}
			</button>
		);
	};

	return (
		<>
			<CalendarPricingGlobalStyle />
			<Modal
				open={open}
				onCancel={onClose}
				footer={null}
				width='min(1440px, 98vw)'
				centered
				className='admin-global-calendar-pricing-modal'
				style={{ transform: "translateY(-10vh)" }}
				rootClassName={ADMIN_GLOBAL_SETTINGS_MODAL_ROOT_CLASS}
				wrapClassName={ADMIN_GLOBAL_SETTINGS_MODAL_WRAP_CLASS}
				zIndex={ADMIN_GLOBAL_SETTINGS_MODAL_Z_INDEX}
				destroyOnClose={false}
				styles={{
					mask: { zIndex: ADMIN_GLOBAL_SETTINGS_MODAL_Z_INDEX - 1 },
					body: {
						maxHeight: "calc(100vh - 34px)",
						overflowY: "auto",
						paddingTop: 0,
						paddingBottom: 8,
					},
				}}
			>
				<CalendarPricingBody dir={isArabic ? "rtl" : "ltr"} $isArabic={isArabic}>
					<Tabs
						activeKey={normalizedActiveTab}
						onChange={(key) => {
							setPreview(null);
							setPreviewIndex(0);
							onTabChange?.(normalizeCalendarTab(key));
						}}
						items={[
							{
								key: MODAL_TAB_GENERAL,
								label: (
									<span className='calendar-pricing-tab-label'>
										<GlobalOutlined /> {labels.generalTab}
									</span>
								),
								children: renderPricingForm(MODAL_TAB_GENERAL),
							},
							{
								key: MODAL_TAB_AGENTS,
								label: (
									<span className='calendar-pricing-tab-label'>
										<TeamOutlined /> {labels.agentsTab}
									</span>
								),
								children: renderPricingForm(MODAL_TAB_AGENTS),
							},
						]}
					/>
				</CalendarPricingBody>
			</Modal>
			<Modal
				open={previewModalOpen && hasPreview}
				onCancel={() => {
					setPreviewModalOpen(false);
					setEditingCell(null);
				}}
				footer={null}
				width='min(1180px, 96vw)'
				centered
				className='admin-global-calendar-preview-modal'
				rootClassName={ADMIN_GLOBAL_SETTINGS_MODAL_ROOT_CLASS}
				wrapClassName={ADMIN_GLOBAL_SETTINGS_MODAL_WRAP_CLASS}
				zIndex={ADMIN_GLOBAL_SETTINGS_MODAL_Z_INDEX + 40}
				destroyOnClose={false}
				styles={{
					mask: { zIndex: ADMIN_GLOBAL_SETTINGS_MODAL_Z_INDEX + 39 },
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
								{preview?.dates.length} {labels.day} | {preview?.rooms.length}{" "}
								{labels.rooms} | {safePreviewIndex + 1} / {monthCards.length}
							</span>
						</div>
						<PreviewActions>
							<Button
								type='primary'
								icon={<SaveOutlined />}
								loading={saving}
								onClick={() => savePricing(preview?.mode || normalizedActiveTab)}
							>
								{labels.save}
							</Button>
							<Button onClick={() => setPreviewModalOpen(false)}>
								{labels.close}
							</Button>
						</PreviewActions>
					</PreviewHeader>

					<MonthNavShell>
						<MonthNavArrow
							type='button'
							disabled={!hasPreview || safePreviewIndex <= 0}
							onClick={() =>
								setPreviewIndex((value) => Math.max(0, value - 1))
							}
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
									onClick={() => setPreviewIndex(index)}
								>
									{month.title}
								</button>
							))}
						</MonthQuickNav>
						<MonthNavArrow
							type='button'
							disabled={!hasPreview || safePreviewIndex >= maxPreviewStart}
							onClick={() =>
								setPreviewIndex((value) =>
									Math.min(maxPreviewStart, value + 1)
								)
							}
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
										</MonthCardHeader>
										<div className='month-table-scroll'>
											<table>
												<thead>
													<tr>
														<th>{labels.date}</th>
														<th>{labels.room}</th>
														<th>{labels.selling}</th>
														<th>{labels.commission}</th>
														<th>{labels.action}</th>
													</tr>
												</thead>
												<tbody>
													{activeMonth.rows.map((row) => (
														(() => {
															const previewDate = formatPreviewDate(row.date, isArabic);
															const displayRoomType = roomTypeLabel(
																{
																	roomType: row.roomTypeKey,
																	roomForGender: row.roomForGender,
																},
																isArabic
															);
															return (
														<tr
															key={row.id}
															className={row.blocked ? "restricted-row" : ""}
														>
															<td>
																<span className='date-stack'>
																	<strong>{previewDate.hijri}</strong>
																	<small>{previewDate.gregorian}</small>
																</span>
															</td>
															<td>
																<span
																	className='room-type-pill'
																	title={row.roomDisplayName || row.room}
																>
																	{displayRoomType || row.roomType || row.room}
																</span>
															</td>
															<td className='editable-number-cell'>
																{renderEditableNumber(row, "sellingPrice")}
															</td>
															<td className='editable-number-cell'>
																{renderEditableNumber(row, "commissionPercent", {
																	suffix: "%",
																	max: 100,
																})}
															</td>
															<td>
																<button
																	type='button'
																	className={
																		row.blocked
																			? "row-action reopen"
																			: "row-action restrict"
																	}
																	onClick={() => togglePreviewRowStatus(row.id)}
																>
																	<StopOutlined />
																	{row.blocked ? labels.reopen : labels.restrict}
																</button>
															</td>
														</tr>
															);
														})()
													))}
												</tbody>
											</table>
										</div>
									</MonthCard>
								) : (
									<PreviewEmpty>{labels.noPreview}</PreviewEmpty>
								)}
							</MonthTrack>
						</CarouselViewport>
					</CarouselStage>
				</PreviewPanel>
			</Modal>
		</>
	);
};

export default AdminGlobalCalendarPricingModal;

const CalendarPricingGlobalStyle = createGlobalStyle`
	.${ADMIN_GLOBAL_SETTINGS_MODAL_ROOT_CLASS} .ant-modal-mask {
		z-index: ${ADMIN_GLOBAL_SETTINGS_MODAL_Z_INDEX - 1} !important;
	}

	.${ADMIN_GLOBAL_SETTINGS_MODAL_ROOT_CLASS} .ant-modal-wrap,
	.ant-modal-wrap.${ADMIN_GLOBAL_SETTINGS_MODAL_WRAP_CLASS},
	.${ADMIN_GLOBAL_SETTINGS_MODAL_ROOT_CLASS} .ant-modal {
		z-index: ${ADMIN_GLOBAL_SETTINGS_MODAL_Z_INDEX} !important;
	}

	.${ADMIN_GLOBAL_SETTINGS_MODAL_ROOT_CLASS} .ant-modal-content,
	.ant-modal-wrap.${ADMIN_GLOBAL_SETTINGS_MODAL_WRAP_CLASS} .ant-modal-content {
		position: relative;
		z-index: ${ADMIN_GLOBAL_SETTINGS_MODAL_Z_INDEX + 1} !important;
	}

	.ant-select-dropdown.admin-global-settings-select-dropdown {
		z-index: ${ADMIN_GLOBAL_SETTINGS_MODAL_Z_INDEX + 20} !important;
	}

	.admin-global-calendar-pricing-modal .ant-modal-content {
		border-radius: 10px;
	}

	.admin-global-calendar-preview-modal .ant-modal-content {
		height: 95vh;
		border-radius: 12px;
		overflow: hidden;
	}

	.admin-global-calendar-pricing-modal .ant-modal-close {
		top: 8px;
	}

	.admin-global-calendar-pricing-modal .ant-tabs-nav {
		padding: 2px 54px 0;
	}

	.admin-global-calendar-pricing-dropdown-rtl {
		direction: rtl;
		text-align: right;
	}

	.admin-global-calendar-pricing-dropdown-rtl .ant-select-item-option-content {
		text-align: right;
	}
`;

const CalendarPricingBody = styled.div`
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
		margin: 0 !important;
		min-width: 245px;
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

	.calendar-pricing-tab-label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		font-size: 0.92rem;
		font-weight: 950;
		line-height: 1.1;
		white-space: nowrap;
	}

	.ant-tabs-tab:hover {
		border-color: #bfdbfe;
		background: #eff6ff;
		color: #1d4ed8 !important;
		box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
	}

	.ant-tabs-tab-active {
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
		transform: translateY(-1px);
	}

	.ant-tabs-tab:nth-child(2).ant-tabs-tab-active {
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
	}

	.ant-tabs-tab-active .ant-tabs-tab-btn,
	.ant-tabs-tab-active .calendar-pricing-tab-label,
	.ant-tabs-tab-active .calendar-pricing-tab-label * {
		color: #ffffff !important;
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.18);
	}

	.ant-tabs-ink-bar {
		display: none;
	}

	.ant-form-item {
		margin-bottom: 9px;
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

	.ant-radio-group {
		display: inline-flex;
		border-radius: 7px;
		box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
	}

	.ant-radio-button-wrapper {
		min-width: 82px;
		border-color: #d6e4f3 !important;
		background: #ffffff;
		color: #172033;
		font-weight: 900;
		text-align: center;
		transition:
			background 160ms ease,
			border-color 160ms ease,
			color 160ms ease,
			box-shadow 160ms ease;
	}

	.ant-radio-button-wrapper::before {
		background-color: #d6e4f3 !important;
	}

	.ant-radio-button-wrapper:hover {
		color: #0f766e;
		background: #f0fdfa;
	}

	.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
		border-color: rgba(45, 212, 191, 0.82) !important;
		background: linear-gradient(
			135deg,
			#064e3b 0%,
			#0f766e 44%,
			#2dd4bf 68%,
			#07564f 100%
		) !important;
		color: #ffffff !important;
		box-shadow:
			0 9px 18px rgba(15, 118, 110, 0.2),
			inset 0 1px 0 rgba(255, 255, 255, 0.26);
	}

	.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)::before {
		background-color: transparent !important;
	}

	.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):hover,
	.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) span {
		color: #ffffff !important;
	}

	@media (max-width: 680px) {
		.ant-tabs-nav-list {
			width: 100%;
		}

		.ant-tabs-tab {
			flex: 1 1 0;
			min-width: 0;
			padding-inline: 10px !important;
		}

		.calendar-pricing-tab-label {
			font-size: 0.8rem;
			white-space: normal;
		}
	}
`;

const FormGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;

	@media (max-width: 980px) {
		grid-template-columns: 1fr;
	}
`;

const PeriodGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(130px, 0.75fr) minmax(160px, 0.85fr) minmax(130px, 0.7fr) minmax(260px, 1.4fr);
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

const PricingGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(150px, 0.8fr) minmax(170px, 0.9fr) minmax(170px, 0.9fr);
	gap: 10px;
	align-items: end;
	margin-top: 10px;

	@media (max-width: 780px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 540px) {
		grid-template-columns: 1fr;
	}
`;

const ActionRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin-top: 12px;

	.ant-btn {
		min-width: 178px;
		min-height: 42px;
		border-radius: 8px;
		font-weight: 900;
	}

	.ant-btn-primary {
		border: 0;
		background: linear-gradient(
			135deg,
			#064e3b 0%,
			#0f766e 42%,
			#2dd4bf 62%,
			#07564f 100%
		);
		box-shadow: 0 12px 24px rgba(15, 118, 110, 0.22);
	}

	@media (max-width: 560px) {
		align-items: stretch;
		flex-direction: column;

		.ant-btn {
			width: 100%;
		}
	}
`;

const PreviewPanel = styled.div`
	display: grid;
	grid-template-rows: auto auto minmax(0, 1fr);
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
		font-size: 1.14rem;
		color: #0f172a;
	}

	span {
		font-size: 0.84rem;
		font-weight: 800;
		color: #475569;
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
		background: linear-gradient(
			135deg,
			#064e3b 0%,
			#0f766e 42%,
			#2dd4bf 64%,
			#07564f 100%
		);
		color: #ffffff !important;
		box-shadow: 0 10px 22px rgba(15, 118, 110, 0.2);
	}

	.ant-btn-primary span,
	.ant-btn-primary svg {
		color: #ffffff !important;
	}

	@media (max-width: 620px) {
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: 100%;
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
	transition:
		background 160ms ease,
		border-color 160ms ease,
		color 160ms ease,
		transform 160ms ease,
		box-shadow 160ms ease;

	&:not(:disabled):hover {
		border-color: rgba(45, 212, 191, 0.8);
		background: linear-gradient(135deg, #064e3b 0%, #0f766e 58%, #2dd4bf 100%);
		color: #ffffff;
		transform: translateY(-1px);
		box-shadow: 0 14px 26px rgba(15, 118, 110, 0.2);
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
	padding-bottom: 2px;
	min-width: 0;

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
		transition:
			background 160ms ease,
			border-color 160ms ease,
			color 160ms ease,
			box-shadow 160ms ease;
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
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-items: center;
	height: 100%;
	min-height: 0;
	overflow: hidden;

	@media (max-width: 680px) {
		min-height: 0;
	}
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
	transition: opacity 180ms ease;
`;

const MonthCard = styled.div`
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	width: min(100%, 940px);
	height: 100%;
	max-height: 100%;
	min-width: 0;
	min-height: 0;
	border: 1px solid #cfe0f2;
	border-radius: 8px;
	background: #ffffff;
	box-shadow: 0 10px 22px rgba(15, 23, 42, 0.07);
	overflow: hidden;

	.month-table-scroll {
		min-height: 0;
		max-height: none;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-gutter: stable;
		overscroll-behavior: contain;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	th,
	td {
		padding: 10px 8px;
		border-bottom: 1px solid #eef2f7;
		font-size: 0.82rem;
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

	td:nth-child(2) {
		width: 22%;
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
		font-size: 0.8rem;
		font-weight: 950;
	}

	.date-stack small {
		color: #64748b;
		font-size: 0.72rem;
		font-weight: 850;
	}

	th:nth-child(1),
	td:nth-child(1) {
		width: 18%;
	}

	th:nth-child(2),
	td:nth-child(2) {
		width: 24%;
	}

	th:nth-child(3),
	td:nth-child(3),
	th:nth-child(4),
	td:nth-child(4) {
		width: 16%;
		text-align: center;
	}

	th:nth-child(5),
	td:nth-child(5) {
		width: 26%;
		text-align: center;
	}

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
		font-size: 0.78rem;
		font-weight: 950;
		line-height: 1.25;
		overflow-wrap: anywhere;
		text-align: center;
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
		transition:
			background 160ms ease,
			border-color 160ms ease,
			box-shadow 160ms ease;
	}

	.editable-cell:not(:disabled):hover {
		border-color: rgba(45, 212, 191, 0.78);
		background: #f0fdfa;
		box-shadow: 0 6px 14px rgba(15, 118, 110, 0.1);
	}

	.editable-cell:disabled {
		cursor: not-allowed;
		opacity: 0.8;
	}

	.restricted-row {
		background: #fff7f7;
	}

	.restricted-row td {
		color: #7f1d1d;
	}

	.restricted-row td:nth-child(2) {
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
		font-size: 0.76rem;
		font-weight: 950;
		cursor: pointer;
		transition:
			background 160ms ease,
			border-color 160ms ease,
			transform 160ms ease;
	}

	.row-action:hover {
		transform: translateY(-1px);
	}

	.row-action.restrict {
		border-color: #fecaca;
		background: #fff5f5;
		color: #991b1b;
	}

	.row-action.restrict:hover {
		background: #fee2e2;
	}

	.row-action.reopen {
		border-color: #bbf7d0;
		background: #ecfdf5;
		color: #047857;
	}

	.row-action.reopen:hover {
		background: #dcfce7;
	}
	@media (max-width: 680px) {
		th,
		td {
			padding: 8px 5px;
			font-size: 0.72rem;
		}

		.room-type-pill {
			font-size: 0.7rem;
			padding-inline: 6px;
		}

		.row-action {
			min-width: 0;
			width: 100%;
			padding-inline: 4px;
			font-size: 0.68rem;
		}

		.editable-cell {
			min-width: 0;
			width: 100%;
			font-size: 0.72rem;
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
		font-size: 0.96rem;
		color: #0f172a;
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
