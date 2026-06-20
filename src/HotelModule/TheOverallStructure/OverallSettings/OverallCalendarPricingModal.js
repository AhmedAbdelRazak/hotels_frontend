import React, { useCallback, useEffect, useMemo, useState } from "react";
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
	EditOutlined,
	GlobalOutlined,
	LeftOutlined,
	PercentageOutlined,
	RightOutlined,
	SaveOutlined,
	StopOutlined,
	TagsOutlined,
	UnorderedListOutlined,
} from "@ant-design/icons";
import moment from "moment-hijri";
import styled, { createGlobalStyle } from "styled-components";
import {
	getOverallCalendarPricingOptions,
	saveOverallCalendarPricing,
} from "../../apiAdmin";
import {
	buildOwnerParams,
	OVERALL_DASHBOARD_MODAL_ROOT_CLASS,
	OVERALL_DASHBOARD_MODAL_WRAP_CLASS,
	OVERALL_DASHBOARD_MODAL_Z_INDEX,
	titleCase,
} from "../overallShared";

const MODAL_TAB_GENERAL = "general";
const MODAL_TAB_AGENTS = "agents";
const GENERAL_PRICING_TAB_ADD = "add";
const GENERAL_PRICING_TAB_UPDATE = "update";
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
		addPricingTab: "Add pricing",
		updatePricingTab: "Update pricing",
		addPricingHint:
			"Add only new main calendar pricing. Existing room/date pricing must be changed from the Update tab.",
		updatePricingHint:
			"Choose saved main pricing to prefill the form, then preview and save the updated rows.",
		agentPricingModeQuestion: "Use price variants for this agent pricing?",
		useVariants: "Yes, assign variants",
		customAgentCalendar: "No, customize calendar",
		assignVariantHint:
			"Assign saved price variants to agents. Hotels are limited to the selected variants.",
		assignedAgentHotels: "Agent hotels",
		derivedAgentHotelsHint:
			"Hotels are taken from the selected agents' assigned hotel accounts.",
		noDerivedAgentHotels:
			"Select agents with hotels matching the chosen price variants.",
		customAgentCalendarHint:
			"Create a custom agent calendar with manual price and commission values.",
		priceVariants: "Price variants",
		choosePriceVariants: "Choose price variants",
		noVariantHotels: "Select pricing variants first",
		assignmentSaved: "Agent price variants assigned successfully",
		existingPricing: "Saved main pricing",
		noExistingPricing: "No main calendar pricing has been saved yet.",
		editPricing: "Edit",
		selectedPricing: "Selected for update",
		openDays: "open",
		blockedDays: "closed",
		fromDate: "From",
		toDate: "To",
		hotels: "Hotels",
		rooms: "Rooms",
		agents: "Agents",
		chooseHotels: "Choose hotels",
		chooseRooms: "Choose rooms",
		chooseAgents: "Choose agents",
		priceVariant: "Price variant",
		choosePriceVariant: "Choose price variant",
		priceVariantHint: "Assigned from Price Variants",
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
		increase: "Increase",
		decrease: "Decrease",
		restrict: "Restrict",
		reopen: "Open",
		action: "Action",
		showing: "Showing",
		generate: "Generate preview",
		save: "Save pricing",
		close: "Close",
		required: "Required",
		validationRequired:
			"Please complete the required fields before generating the preview.",
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
		addPricingTab:
			"\u0625\u0636\u0627\u0641\u0629 \u062a\u0633\u0639\u064a\u0631",
		updatePricingTab:
			"\u062a\u062d\u062f\u064a\u062b \u062a\u0633\u0639\u064a\u0631",
		addPricingHint:
			"\u0623\u0636\u0641 \u062a\u0633\u0639\u064a\u0631\u0627\u064b \u062c\u062f\u064a\u062f\u0627\u064b \u0641\u0642\u0637. \u0625\u0630\u0627 \u0648\u062c\u062f \u062a\u0633\u0639\u064a\u0631 \u0644\u0646\u0641\u0633 \u0627\u0644\u063a\u0631\u0641\u0629 \u0648\u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0641\u0627\u0633\u062a\u062e\u062f\u0645 \u062a\u0628\u0648\u064a\u0628 \u0627\u0644\u062a\u062d\u062f\u064a\u062b.",
		updatePricingHint:
			"\u0627\u062e\u062a\u0631 \u062a\u0633\u0639\u064a\u0631\u0627\u064b \u0631\u0626\u064a\u0633\u064a\u0627\u064b \u0645\u062d\u0641\u0648\u0638\u0627\u064b \u0644\u062a\u0639\u0628\u0626\u0629 \u0627\u0644\u062d\u0642\u0648\u0644\u060c \u062b\u0645 \u0623\u0646\u0634\u0626 \u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629 \u0648\u0627\u062d\u0641\u0638 \u0627\u0644\u062a\u062d\u062f\u064a\u062b.",
		agentPricingModeQuestion:
			"\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0627\u0644\u0633\u0639\u0631 \u0644\u0644\u0648\u0643\u064a\u0644\u061f",
		useVariants:
			"\u0646\u0639\u0645\u060c \u062a\u0639\u064a\u064a\u0646 \u062a\u0646\u0648\u064a\u0639\u0627\u062a",
		customAgentCalendar:
			"\u0644\u0627\u060c \u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u062a\u0642\u0648\u064a\u0645",
		assignVariantHint:
			"\u0639\u064a\u0651\u0646 \u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629 \u0644\u0644\u0648\u0643\u0644\u0627\u0621. \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u062a\u0638\u0647\u0631 \u062d\u0633\u0628 \u0627\u0644\u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
		assignedAgentHotels:
			"\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0648\u0643\u064a\u0644",
		derivedAgentHotelsHint:
			"\u064a\u062a\u0645 \u0623\u062e\u0630 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0645\u0646 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u0639\u064a\u0646\u0629 \u0641\u064a \u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0645\u062d\u062f\u062f\u064a\u0646.",
		noDerivedAgentHotels:
			"\u0627\u062e\u062a\u0631 \u0648\u0643\u0644\u0627\u0621 \u0644\u062f\u064a\u0647\u0645 \u0641\u0646\u0627\u062f\u0642 \u062a\u0637\u0627\u0628\u0642 \u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0627\u0644\u0633\u0639\u0631.",
		customAgentCalendarHint:
			"\u0623\u0646\u0634\u0626 \u062a\u0642\u0648\u064a\u0645\u0627\u064b \u0645\u062e\u0635\u0635\u0627\u064b \u0644\u0644\u0648\u0643\u064a\u0644 \u0628\u0633\u0639\u0631 \u0648\u0639\u0645\u0648\u0644\u0629 \u064a\u062f\u0648\u064a\u0629.",
		priceVariants:
			"\u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0627\u0644\u0633\u0639\u0631",
		choosePriceVariants:
			"\u0627\u062e\u062a\u0631 \u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0627\u0644\u0633\u0639\u0631",
		noVariantHotels:
			"\u0627\u062e\u062a\u0631 \u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0623\u0648\u0644\u0627\u064b",
		assignmentSaved:
			"\u062a\u0645 \u062a\u0639\u064a\u064a\u0646 \u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0627\u0644\u0633\u0639\u0631 \u0644\u0644\u0648\u0643\u0644\u0627\u0621 \u0628\u0646\u062c\u0627\u062d",
		existingPricing:
			"\u062a\u0633\u0639\u064a\u0631 \u0631\u0626\u064a\u0633\u064a \u0645\u062d\u0641\u0648\u0638",
		noExistingPricing:
			"\u0644\u0627 \u064a\u0648\u062c\u062f \u062a\u0633\u0639\u064a\u0631 \u0631\u0626\u064a\u0633\u064a \u0645\u062d\u0641\u0648\u0638 \u0628\u0639\u062f.",
		editPricing: "\u062a\u0639\u062f\u064a\u0644",
		selectedPricing:
			"\u0645\u062d\u062f\u062f \u0644\u0644\u062a\u062d\u062f\u064a\u062b",
		openDays: "\u0645\u0641\u062a\u0648\u062d",
		blockedDays: "\u0645\u063a\u0644\u0642",
		fromDate: "\u0645\u0646",
		toDate: "\u0625\u0644\u0649",
		hotels: "\u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		rooms: "\u0627\u0644\u063a\u0631\u0641",
		agents: "\u0627\u0644\u0648\u0643\u0644\u0627\u0621",
		chooseHotels: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		chooseRooms: "\u0627\u062e\u062a\u0631 \u0627\u0644\u063a\u0631\u0641",
		chooseAgents: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0648\u0643\u0644\u0627\u0621",
		priceVariant:
			"\u062a\u0646\u0648\u064a\u0639 \u0627\u0644\u0633\u0639\u0631",
		choosePriceVariant:
			"\u0627\u062e\u062a\u0631 \u062a\u0646\u0648\u064a\u0639 \u0633\u0639\u0631",
		priceVariantHint:
			"\u0645\u0631\u062a\u0628\u0637 \u0628\u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0627\u0644\u0623\u0633\u0639\u0627\u0631",
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
		increase: "\u0632\u064a\u0627\u062f\u0629",
		decrease: "\u062e\u0635\u0645",
		restrict: "\u0645\u062d\u0638\u0648\u0631",
		reopen: "\u0641\u062a\u062d",
		action: "\u0625\u062c\u0631\u0627\u0621",
		showing: "\u0639\u0631\u0636",
		generate: "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629",
		save: "\u062d\u0641\u0638 \u0627\u0644\u062a\u0633\u0639\u064a\u0631",
		close: "\u0625\u063a\u0644\u0627\u0642",
		required: "\u0645\u0637\u0644\u0648\u0628",
		validationRequired:
			"\u064a\u0631\u062c\u0649 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0642\u0628\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629.",
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
		agentPricingMode: "variants",
		priceVariantItemKeys: [],
		priceVariantItemKey: "",
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

const calendarDateKey = (value) =>
	String(value?.calendarDate || value?.date || value?.pricingDate || value || "")
		.slice(0, 10)
		.trim();

const normalizeCalendarRows = (rows = []) =>
	(Array.isArray(rows) ? rows : [])
		.map((row) => ({
			...row,
			calendarDate: calendarDateKey(row),
		}))
		.filter((row) => row.calendarDate)
		.sort((left, right) =>
			left.calendarDate === right.calendarDate
				? String(left.agentId || "").localeCompare(String(right.agentId || ""))
				: left.calendarDate.localeCompare(right.calendarDate)
		);

const mergeCalendarPricingRows = (existingRows = [], update = {}) => {
	const replaceDates = new Set(
		(Array.isArray(update.replaceDates) ? update.replaceDates : [])
			.map(calendarDateKey)
			.filter(Boolean)
	);
	const incomingRows = normalizeCalendarRows(update.rows);
	if (!replaceDates.size && !incomingRows.length) {
		return normalizeCalendarRows(existingRows);
	}
	const incomingAgentIds = new Set(
		(Array.isArray(update.agentIds) ? update.agentIds : [])
			.map(normalizeId)
			.filter(Boolean)
	);
	const field =
		update.field ||
		(update.scope === "agents" ? "agentPricingRate" : "pricingRate");
	const keptRows = normalizeCalendarRows(existingRows).filter((row) => {
		const sameDate = replaceDates.has(calendarDateKey(row));
		if (!sameDate) return true;
		if (field !== "agentPricingRate" || !incomingAgentIds.size) return false;
		return !incomingAgentIds.has(normalizeId(row.agentId));
	});
	return normalizeCalendarRows([...keptRows, ...incomingRows]);
};

const applyCalendarPricingUpdates = (hotels = [], updates = []) => {
	if (!Array.isArray(updates) || !updates.length) return hotels;
	const updatesByRoomKey = updates.reduce((acc, update) => {
		const hotelId = normalizeId(update?.hotelId);
		const roomId = normalizeId(update?.roomId);
		if (!hotelId || !roomId) return acc;
		const key = makeRoomKey(hotelId, roomId);
		acc.set(key, [...(acc.get(key) || []), update]);
		return acc;
	}, new Map());
	return (Array.isArray(hotels) ? hotels : []).map((hotel) => {
		const hotelId = normalizeId(hotel._id);
		const rooms = Array.isArray(hotel.rooms) ? hotel.rooms : [];
		let hotelChanged = false;
		const nextRooms = rooms.map((room) => {
			const roomUpdates = updatesByRoomKey.get(
				makeRoomKey(hotelId, normalizeId(room._id))
			);
			if (!roomUpdates?.length) return room;
			hotelChanged = true;
			return roomUpdates.reduce((nextRoom, update) => {
				const field =
					update.field ||
					(update.scope === "agents" ? "agentPricingRate" : "pricingRate");
				return {
					...nextRoom,
					[field]: mergeCalendarPricingRows(nextRoom[field], update),
				};
			}, room);
		});
		return hotelChanged ? { ...hotel, rooms: nextRooms } : hotel;
	});
};

const parsePriceVariantKey = (key = "") => {
	const [priceVariantDataId, priceVariantItemId] = String(key || "").split("::");
	return {
		priceVariantDataId: priceVariantDataId || "",
		priceVariantItemId: priceVariantItemId || "",
	};
};

const priceVariantBasisLabel = (item = {}, labels = {}) => {
	const basis =
		item.pricingBasis && typeof item.pricingBasis === "object"
			? item.pricingBasis
			: {};
	if (basis.mode !== "calendar_base") {
		return `${Number(item.sellingPrice || 0)} SAR`;
	}
	const direction =
		basis.direction === "decrease" ? labels.decrease : labels.increase;
	const suffix = basis.adjustmentType === "money" ? " SAR" : "%";
	return `${direction} ${Number(basis.amount || 0).toFixed(2)}${suffix}`;
};

const applyPriceVariantAdjustment = (basePrice = 0, basis = {}) => {
	const amount = Number(basis.amount || 0);
	const sign = basis.direction === "decrease" ? -1 : 1;
	const next =
		basis.adjustmentType === "money"
			? Number(basePrice || 0) + sign * amount
			: Number(basePrice || 0) * (1 + sign * (amount / 100));
	return Number(Math.max(next, 0).toFixed(2));
};

const roomCalendarBaseValues = (room = {}, calendarDate = "") => {
	const calendarRow = (Array.isArray(room.pricingRate) ? room.pricingRate : []).find(
		(row) => String(row?.calendarDate || "").slice(0, 10) === calendarDate
	);
	if (calendarRow) {
		const blocked =
			calendarRow.blocked === true ||
			calendarRow.status === "blocked" ||
			String(calendarRow.color || "").toLowerCase() === "black";
		if (blocked) return { status: "blocked", sellingPrice: 0 };
		const rowPrice = Number(calendarRow.sellingPrice ?? calendarRow.price ?? 0);
		if (rowPrice > 0) return { status: "open", sellingPrice: rowPrice };
	}
	const basePrice = Number(room.basePrice ?? room.price?.basePrice ?? 0);
	return {
		status: basePrice > 0 ? "open" : "missing",
		sellingPrice: basePrice,
	};
};

const priceVariantValuesForRoom = (
	record = {},
	item = {},
	room = {},
	calendarDate = ""
) => {
	const basis =
		item.pricingBasis && typeof item.pricingBasis === "object"
			? item.pricingBasis
			: {};
	if (
		record.dataType === "price_variant" ||
		record.basePriceSource === "calendar_main_price" ||
		basis.mode === "calendar_base"
	) {
		const baseValues = roomCalendarBaseValues(room, calendarDate);
		if (item.status === "blocked" || baseValues.status === "blocked") {
			return { status: "blocked", sellingPrice: 0, commissionPercent: 0 };
		}
		if (baseValues.status !== "open" || !(baseValues.sellingPrice > 0)) {
			return {
				status: item.status || "open",
				sellingPrice: Number(item.sellingPrice || 0),
				commissionPercent: Number(item.commissionPercent || 0),
			};
		}
		return {
			status: "open",
			sellingPrice: applyPriceVariantAdjustment(baseValues.sellingPrice, basis),
			commissionPercent: Number(item.commissionPercent || 0),
		};
	}
	const roomPricing = (Array.isArray(record.roomPricing)
		? record.roomPricing
		: []
	).find(
		(row) =>
			normalizeId(row.hotelId) === normalizeId(room.hotelId) &&
			normalizeId(row.roomId) === normalizeId(room.roomId)
	);
	const roomItem = (Array.isArray(roomPricing?.pricingItems)
		? roomPricing.pricingItems
		: []
	).find(
		(price) =>
			normalizeId(price.priceVariantItemId) === normalizeId(item._id)
	);
	const periodPrice = (Array.isArray(roomItem?.periodPrices)
		? roomItem.periodPrices
		: []
	).find((period) => {
		const startDate = String(period?.startDate || "");
		const endDate = String(period?.endDate || "");
		return (
			calendarDate &&
			startDate &&
			endDate &&
			calendarDate >= startDate &&
			calendarDate <= endDate
		);
	});
	return {
		status: periodPrice?.status || roomItem?.status || item.status || "open",
		sellingPrice: Number(
			periodPrice?.sellingPrice ?? roomItem?.sellingPrice ?? item.sellingPrice ?? 0
		),
		commissionPercent: Number(
			periodPrice?.commissionPercent ??
				roomItem?.commissionPercent ??
				item.commissionPercent ??
				0
		),
	};
};

const OverallCalendarPricingModal = ({
	open,
	onClose,
	activeTab = MODAL_TAB_GENERAL,
	onTabChange,
	userId,
	token,
	ownerId,
	chosenLanguage,
	onSaved,
	embedded = false,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const labels = TEXT[isArabic ? "ar" : "en"];
	const normalizedActiveTab = embedded
		? normalizeCalendarTab(activeTab || MODAL_TAB_AGENTS)
		: MODAL_TAB_GENERAL;
	const [hotels, setHotels] = useState([]);
	const [agents, setAgents] = useState([]);
	const [priceVariantData, setPriceVariantData] = useState([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [preview, setPreview] = useState(null);
	const [previewIndex, setPreviewIndex] = useState(0);
	const [previewModalOpen, setPreviewModalOpen] = useState(false);
	const [editingCell, setEditingCell] = useState(null);
	const [generalPricingTab, setGeneralPricingTab] = useState(
		GENERAL_PRICING_TAB_ADD
	);
	const [editingGeneralPricingKey, setEditingGeneralPricingKey] = useState("");
	const [generalForm] = Form.useForm();
	const [agentsForm] = Form.useForm();
	const activeForm = normalizedActiveTab === MODAL_TAB_AGENTS ? agentsForm : generalForm;
	const selectPopupStyle = { zIndex: OVERALL_DASHBOARD_MODAL_Z_INDEX + 20 };
	const selectPopupClassName = `overall-dashboard-select-dropdown ${
		isArabic ? "overall-calendar-pricing-dropdown-rtl" : ""
	}`.trim();

	const hotelOptions = useMemo(
		() =>
			hotels.map((hotel) => ({
				value: normalizeId(hotel._id),
				label: titleCase(hotel.hotelName),
			})),
		[hotels]
	);

	const watchedHotelIds = Form.useWatch("hotelIds", activeForm);
	const selectedHotelIds = useMemo(
		() => (Array.isArray(watchedHotelIds) ? watchedHotelIds : []),
		[watchedHotelIds]
	);
	const selectedAgentPricingMode =
		Form.useWatch("agentPricingMode", agentsForm) || "variants";
	const watchedAgentPriceVariantKeys =
		Form.useWatch("priceVariantItemKeys", agentsForm);
	const selectedAgentPriceVariantKeys = useMemo(
		() =>
			Array.isArray(watchedAgentPriceVariantKeys)
				? watchedAgentPriceVariantKeys
				: [],
		[watchedAgentPriceVariantKeys]
	);
	const watchedAgentIds = Form.useWatch("agentIds", agentsForm);
	const selectedAgentIds = useMemo(
		() => (Array.isArray(watchedAgentIds) ? watchedAgentIds : []),
		[watchedAgentIds]
	);
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
					basePrice: Number(room.basePrice || 0),
					defaultCost: Number(room.defaultCost || 0),
					pricingRate: Array.isArray(room.pricingRate) ? room.pricingRate : [],
				};
			})
	);

	const priceVariantOptions = useMemo(() => {
		return (Array.isArray(priceVariantData) ? priceVariantData : [])
			.flatMap((record) =>
				(Array.isArray(record.pricingItems) ? record.pricingItems : []).map(
					(item) => {
						const itemName =
							isArabic && item.nameOtherLanguage
								? item.nameOtherLanguage
								: item.name;
						const hotelNames = (record.hotelNames || []).join(", ");
						const assignedCount = Array.isArray(item.assignedAgents)
							? item.assignedAgents.length
							: 0;
						return {
							value: `${normalizeId(record._id)}::${normalizeId(item._id)}`,
							label: `${itemName || labels.priceVariant} - ${priceVariantBasisLabel(
								item,
								labels
							)}${
								assignedCount
									? ` - ${assignedCount} ${
											isArabic ? "\u0648\u0643\u0644\u0627\u0621" : "agents"
									  }`
									: ""
							}${
								hotelNames ? ` - ${hotelNames}` : ""
							}`,
							record,
							item,
						};
					}
				)
			);
	}, [isArabic, labels, priceVariantData]);

	const selectedAgentPriceVariantOptions = useMemo(
		() =>
			priceVariantOptions.filter((option) =>
				selectedAgentPriceVariantKeys.includes(option.value)
			),
		[priceVariantOptions, selectedAgentPriceVariantKeys]
	);
	const agentVariantHotelOptions = useMemo(() => {
		const hotelSet = new Set(
			selectedAgentPriceVariantOptions.flatMap((option) =>
				(option.record?.hotelIds || []).map(normalizeId)
			)
		);
		return hotelOptions.filter((hotel) => hotelSet.has(normalizeId(hotel.value)));
	}, [hotelOptions, selectedAgentPriceVariantOptions]);
	const variantAgentFilterHotelIds = useMemo(
		() => agentVariantHotelOptions.map((option) => normalizeId(option.value)),
		[agentVariantHotelOptions]
	);
	const agentFilterHotelIds =
		selectedAgentPricingMode === "variants"
			? variantAgentFilterHotelIds
			: selectedHotelIds;
	const filteredAgentOptions = useMemo(
		() =>
			agents
				.filter((agent) => {
					if (!agentFilterHotelIds.length) return false;
					const scoped = new Set((agent.hotelIds || []).map(normalizeId));
					return agentFilterHotelIds.some((hotelId) =>
						scoped.has(normalizeId(hotelId))
					);
				})
				.map((agent) => ({
					value: normalizeId(agent._id),
					label: `${titleCase(agent.name)}${
						agent.companyName ? ` - ${titleCase(agent.companyName)}` : ""
					}`,
				})),
		[agentFilterHotelIds, agents]
	);
	const deriveAgentVariantHotelIds = useCallback((
		agentIds = selectedAgentIds,
		variantKeys = selectedAgentPriceVariantKeys
	) => {
		const selectedVariantOptions = priceVariantOptions.filter((option) =>
			(Array.isArray(variantKeys) ? variantKeys : []).includes(option.value)
		);
		const variantHotelIds = new Set(
			selectedVariantOptions.flatMap((option) =>
				(option.record?.hotelIds || []).map(normalizeId)
			)
		);
		const agentIdSet = new Set((Array.isArray(agentIds) ? agentIds : []).map(normalizeId));
		const agentHotelIds = new Set();
		agents.forEach((agent) => {
			if (!agentIdSet.has(normalizeId(agent._id))) return;
			(agent.hotelIds || []).forEach((hotelId) => {
				const normalizedHotelId = normalizeId(hotelId);
				if (variantHotelIds.has(normalizedHotelId)) {
					agentHotelIds.add(normalizedHotelId);
				}
			});
		});
		return hotelOptions
			.map((option) => normalizeId(option.value))
			.filter((hotelId) => agentHotelIds.has(hotelId));
	}, [
		agents,
		hotelOptions,
		priceVariantOptions,
		selectedAgentIds,
		selectedAgentPriceVariantKeys,
	]);
	const selectedAgentVariantHotelIds = useMemo(
		() => deriveAgentVariantHotelIds(),
		[deriveAgentVariantHotelIds]
	);
	const selectedAgentVariantHotelOptions = useMemo(
		() =>
			hotelOptions.filter((option) =>
				selectedAgentVariantHotelIds.includes(normalizeId(option.value))
			),
		[hotelOptions, selectedAgentVariantHotelIds]
	);

	const existingGeneralPricingGroups = useMemo(
		() =>
			(Array.isArray(hotels) ? hotels : []).flatMap((hotel) =>
				(Array.isArray(hotel.rooms) ? hotel.rooms : [])
					.filter((room) => room.activeRoom !== false)
					.map((room) => {
						const rows = (Array.isArray(room.pricingRate)
							? room.pricingRate
							: []
						)
							.map((row) => {
								const calendarDate = String(row?.calendarDate || "").slice(0, 10);
								const blocked =
									row?.blocked === true ||
									row?.status === "blocked" ||
									String(row?.color || "").toLowerCase() === "black";
								return {
									calendarDate,
									status: blocked ? "blocked" : "open",
									blocked,
									sellingPrice: blocked
										? 0
										: Number(row?.sellingPrice ?? row?.price ?? 0),
									commissionPercent: blocked
										? 0
										: Number(row?.commissionPercent || 0),
								};
							})
							.filter((row) => row.calendarDate)
							.sort((left, right) =>
								left.calendarDate.localeCompare(right.calendarDate)
							);
						if (!rows.length) return null;
						const hotelId = normalizeId(hotel._id);
						const roomId = normalizeId(room._id);
						const displayName = isArabic
							? room.displayName_OtherLanguage || room.displayName
							: room.displayName || room.displayName_OtherLanguage;
						const actualRoomTypeLabel = roomTypeLabel(room, isArabic);
						const openRows = rows.filter((row) => !row.blocked);
						const representativeRow = openRows[0] || rows[0] || {};
						return {
							key: makeRoomKey(hotelId, roomId),
							hotelId,
							roomId,
							roomKey: makeRoomKey(hotelId, roomId),
							hotelName: titleCase(hotel.hotelName),
							roomType: room.roomType || "",
							roomForGender: room.roomForGender || "",
							roomTypeLabel: actualRoomTypeLabel,
							roomDisplayName: displayName || room.displayName || room.roomType || "",
							basePrice: Number(room.basePrice || 0),
							defaultCost: Number(room.defaultCost || 0),
							label: `${titleCase(hotel.hotelName)} - ${actualRoomTypeLabel}${
								displayName ? ` - ${displayName}` : ""
							}`,
							rows,
							startDate: rows[0]?.calendarDate || "",
							endDate: rows[rows.length - 1]?.calendarDate || "",
							totalDays: rows.length,
							openCount: openRows.length,
							blockedCount: rows.length - openRows.length,
							firstPrice: Number(representativeRow.sellingPrice || 0),
							firstCommission: Number(representativeRow.commissionPercent || 0),
							firstStatus: representativeRow.blocked ? "blocked" : "open",
						};
					})
					.filter(Boolean)
			),
		[hotels, isArabic]
	);

	const selectedGeneralPricingGroup =
		existingGeneralPricingGroups.find(
			(group) => group.key === editingGeneralPricingKey
		) || null;

	useEffect(() => {
		if (!open || !userId || !token) return;
		setLoading(true);
		getOverallCalendarPricingOptions(userId, token, buildOwnerParams(ownerId))
			.then((data) => {
				if (data?.error) {
					message.error(data.error);
					return;
				}
				setHotels(Array.isArray(data?.hotels) ? data.hotels : []);
				setAgents(Array.isArray(data?.agents) ? data.agents : []);
				setPriceVariantData(
					Array.isArray(data?.priceVariantData) ? data.priceVariantData : []
				);
			})
			.finally(() => setLoading(false));
	}, [open, ownerId, token, userId]);

	useEffect(() => {
		if (!open) return;
		const values = defaultValues();
		generalForm.setFieldsValue(values);
		agentsForm.setFieldsValue(values);
		setPreview(null);
		setPreviewIndex(0);
		setPreviewModalOpen(false);
		setEditingCell(null);
		setEditingGeneralPricingKey("");
		setGeneralPricingTab(GENERAL_PRICING_TAB_ADD);
	}, [agentsForm, generalForm, open]);

	useEffect(() => {
		if (
			!open ||
			normalizedActiveTab !== MODAL_TAB_AGENTS ||
			selectedAgentPricingMode !== "variants"
		) {
			return;
		}
		const validHotelIds = new Set(
			agentVariantHotelOptions.map((option) => normalizeId(option.value))
		);
		const currentHotelIds = agentsForm.getFieldValue("hotelIds") || [];
		const currentAgentIds = agentsForm.getFieldValue("agentIds") || [];
		const nextAgentIds = currentAgentIds.filter((agentId) => {
			const agent = agents.find(
				(item) => normalizeId(item._id) === normalizeId(agentId)
			);
			const scoped = new Set((agent?.hotelIds || []).map(normalizeId));
			return [...validHotelIds].some((hotelId) => scoped.has(normalizeId(hotelId)));
		});
		const nextHotelIds = deriveAgentVariantHotelIds(
			nextAgentIds,
			selectedAgentPriceVariantKeys
		);
		const listsMatch = (left = [], right = []) =>
			left.length === right.length &&
			left.every((item, index) => normalizeId(item) === normalizeId(right[index]));
		if (
			!listsMatch(nextHotelIds, currentHotelIds) ||
			!listsMatch(nextAgentIds, currentAgentIds)
		) {
			agentsForm.setFieldsValue({
				hotelIds: nextHotelIds,
				agentIds: nextAgentIds,
				roomSelections: [],
			});
			setPreview(null);
			setPreviewIndex(0);
			setPreviewModalOpen(false);
		}
	}, [
		agentVariantHotelOptions,
		agents,
		agentsForm,
		deriveAgentVariantHotelIds,
		normalizedActiveTab,
		open,
		selectedAgentIds,
		selectedAgentPricingMode,
		selectedAgentPriceVariantKeys,
	]);

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
			...(mode === MODAL_TAB_AGENTS
				? { agentIds: nextAgentIds, priceVariantItemKey: "" }
				: {}),
		});
		setPreview(null);
		setPreviewIndex(0);
		setPreviewModalOpen(false);
		setEditingCell(null);
		if (mode === MODAL_TAB_GENERAL) setEditingGeneralPricingKey("");
	};

	const buildPreview = async (
		mode = normalizedActiveTab,
		{ openPreviewModal = true, operation } = {}
	) => {
		const form = mode === MODAL_TAB_AGENTS ? agentsForm : generalForm;
		let values;
		try {
			values = await form.validateFields();
		} catch (error) {
			const firstField = Array.isArray(error?.errorFields)
				? error.errorFields[0]
				: null;
			const firstMessage = Array.isArray(firstField?.errors)
				? firstField.errors.find(Boolean)
				: "";
			message.error(
				firstMessage && firstMessage !== labels.required
					? firstMessage
					: labels.validationRequired
			);
			if (firstField?.name && typeof form.scrollToField === "function") {
				form.scrollToField(firstField.name, { block: "center" });
			}
			return null;
		}
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
				basePrice: Number(option.basePrice || 0),
				defaultCost: Number(option.defaultCost || 0),
				pricingRate: Array.isArray(option.pricingRate) ? option.pricingRate : [],
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
		const masterOptionForPreview = null;
		const rows = dates.flatMap((date) =>
			rooms.map((room) => {
				const masterValues = masterOptionForPreview
						? priceVariantValuesForRoom(
								masterOptionForPreview.record,
								masterOptionForPreview.item,
								room,
								date
						  )
						: null;
				const rowBlocked = masterValues
					? masterValues.status === "blocked"
					: defaultBlocked;
				return {
					id: `${date}::${room.key}`,
					date,
					room: room.label,
					roomType: room.roomTypeLabel,
					roomTypeKey: room.roomType,
					roomForGender: room.roomForGender,
					roomDisplayName: room.roomDisplayName,
					hotelId: room.hotelId,
					roomId: room.roomId,
					sellingPrice: rowBlocked
						? 0
						: Number(masterValues?.sellingPrice ?? defaultSellingPrice),
					commissionPercent: rowBlocked
						? 0
						: Number(
								masterValues?.commissionPercent ?? defaultCommissionPercent
						  ),
					status: rowBlocked ? "blocked" : "open",
					blocked: rowBlocked,
				};
			})
		);
		const nextPreview = {
			mode,
			operation:
				mode === MODAL_TAB_GENERAL
					? operation || generalPricingTab || GENERAL_PRICING_TAB_ADD
					: "update",
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

	const previewFromGeneralPricingGroup = (group, values) => {
		if (!group) return null;
		const dates = [
			...new Set((group.rows || []).map((row) => row.calendarDate).filter(Boolean)),
		].sort();
		const room = {
			key: group.roomKey,
			label: group.label,
			roomType: group.roomType,
			roomForGender: group.roomForGender,
			roomTypeLabel: group.roomTypeLabel,
			roomDisplayName: group.roomDisplayName,
			basePrice: group.basePrice,
			defaultCost: group.defaultCost,
			hotelId: group.hotelId,
			roomId: group.roomId,
		};
		const rows = (group.rows || []).map((row) => ({
			id: `${row.calendarDate}::${group.roomKey}`,
			date: row.calendarDate,
			room: group.label,
			roomType: group.roomTypeLabel,
			roomTypeKey: group.roomType,
			roomForGender: group.roomForGender,
			roomDisplayName: group.roomDisplayName,
			hotelId: group.hotelId,
			roomId: group.roomId,
			sellingPrice: row.blocked ? 0 : Number(row.sellingPrice || 0),
			commissionPercent: row.blocked
				? 0
				: Number(row.commissionPercent || 0),
			status: row.blocked ? "blocked" : "open",
			blocked: row.blocked,
		}));
		const nextPreview = {
			mode: MODAL_TAB_GENERAL,
			operation: GENERAL_PRICING_TAB_UPDATE,
			values,
			dates,
			rooms: [room],
			rows,
			monthCards: buildMonthCardsFromRows(
				rows,
				values.calendarType || "hijri",
				isArabic
			),
		};
		setPreview(nextPreview);
		setPreviewIndex(0);
		setEditingCell(null);
		setPreviewModalOpen(false);
		return nextPreview;
	};

	const selectGeneralPricingForUpdate = (group) => {
		if (!group) return;
		const values = {
			...defaultValues(),
			hotelIds: [group.hotelId],
			roomSelections: [group.roomKey],
			calendarType: "hijri",
			periodMode: "custom",
			startDate: group.startDate,
			endDate: group.endDate,
			status: group.firstStatus || "open",
			sellingPrice:
				group.firstStatus === "blocked" ? null : Number(group.firstPrice || 0),
			commissionPercent:
				group.firstStatus === "blocked"
					? 0
					: Number(group.firstCommission || 0),
		};
		setGeneralPricingTab(GENERAL_PRICING_TAB_UPDATE);
		setEditingGeneralPricingKey(group.key);
		generalForm.setFieldsValue(values);
		previewFromGeneralPricingGroup(group, values);
	};

	const openPricingPreview = (mode, operation) => {
		const desiredOperation =
			mode === MODAL_TAB_GENERAL
				? operation || generalPricingTab || GENERAL_PRICING_TAB_ADD
				: "update";
		if (
			preview?.mode === mode &&
			(mode !== MODAL_TAB_GENERAL || preview.operation === desiredOperation)
		) {
			setPreviewModalOpen(true);
			return preview;
		}
		return buildPreview(mode, { operation: desiredOperation });
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

	const applySaveResponse = (data) => {
		const compactUpdates = Array.isArray(data?.calendarPricingUpdates)
			? data.calendarPricingUpdates
			: [];
		const fullHotelUpdates = Array.isArray(data?.updatedHotels)
			? data.updatedHotels
			: [];
		if (compactUpdates.length || fullHotelUpdates.length) {
			setHotels((current) => {
				let nextHotels = applyCalendarPricingUpdates(current, compactUpdates);
				if (fullHotelUpdates.length) {
					const updatedById = new Map(
						fullHotelUpdates.map((hotel) => [normalizeId(hotel._id), hotel])
					);
					nextHotels = nextHotels.map(
						(hotel) => updatedById.get(normalizeId(hotel._id)) || hotel
					);
				}
				return nextHotels;
			});
		}
		const savedVariantList = Array.isArray(data?.priceVariantDataList)
			? data.priceVariantDataList
			: data?.priceVariantData
			  ? [data.priceVariantData]
			  : [];
		if (savedVariantList.length) {
			setPriceVariantData((current) => {
				const savedIds = new Set(savedVariantList.map((item) => normalizeId(item._id)));
				return [
					...savedVariantList,
					...current.filter((item) => !savedIds.has(normalizeId(item._id))),
				];
			});
		}
	};

	const saveAgentVariantAssignments = async () => {
		let values;
		try {
			values = await agentsForm.validateFields([
				"agentPricingMode",
				"priceVariantItemKeys",
				"agentIds",
			]);
		} catch (error) {
			const firstField = Array.isArray(error?.errorFields)
				? error.errorFields[0]
				: null;
			const firstMessage = Array.isArray(firstField?.errors)
				? firstField.errors.find(Boolean)
				: "";
			message.error(
				firstMessage && firstMessage !== labels.required
					? firstMessage
					: labels.validationRequired
			);
			if (firstField?.name && typeof agentsForm.scrollToField === "function") {
				agentsForm.scrollToField(firstField.name, { block: "center" });
			}
			return;
		}
		const derivedHotelIds = deriveAgentVariantHotelIds(
			values.agentIds || [],
			values.priceVariantItemKeys || []
		);
		if (!derivedHotelIds.length) {
			message.error(labels.noDerivedAgentHotels);
			return;
		}
		setSaving(true);
		try {
			const data = await saveOverallCalendarPricing(
				userId,
				token,
				{
					scope: "agents",
					assignmentMode: "price_variants",
					priceVariantSelections: (values.priceVariantItemKeys || []).map(
						parsePriceVariantKey
					),
					hotelIds: derivedHotelIds,
					agentIds: values.agentIds || [],
				},
				buildOwnerParams(ownerId)
			);
			if (data?.error) {
				message.error(data.error);
				return;
			}
			message.success(labels.assignmentSaved || labels.saved);
			applySaveResponse(data);
			onSaved?.(data);
			setPreviewModalOpen(false);
		} finally {
			setSaving(false);
		}
	};

	const savePricing = async (mode = normalizedActiveTab, { operation } = {}) => {
		const desiredOperation =
			mode === MODAL_TAB_GENERAL
				? operation || preview?.operation || generalPricingTab || GENERAL_PRICING_TAB_ADD
				: "update";
		const nextPreview =
			preview?.mode === mode &&
			(mode !== MODAL_TAB_GENERAL || preview.operation === desiredOperation)
				? preview
				: await buildPreview(mode, {
						openPreviewModal: false,
						operation: desiredOperation,
				  });
		if (!nextPreview) return;
		const values = nextPreview.values;
		const priceVariantSelection =
			mode === MODAL_TAB_AGENTS
				? parsePriceVariantKey(values.priceVariantItemKey)
				: {};
		setSaving(true);
		try {
			const payload = {
				scope: mode === MODAL_TAB_AGENTS ? "agents" : "general",
				operation: mode === MODAL_TAB_GENERAL ? desiredOperation : "update",
				hotelIds: values.hotelIds || [],
				roomSelections: (values.roomSelections || []).map(parseRoomKey),
				agentIds: mode === MODAL_TAB_AGENTS ? values.agentIds || [] : [],
				...(mode === MODAL_TAB_AGENTS &&
				priceVariantSelection.priceVariantDataId &&
				priceVariantSelection.priceVariantItemId
					? priceVariantSelection
					: {}),
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
			const data = await saveOverallCalendarPricing(
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
			applySaveResponse(data);
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

	const renderPricingForm = (
		mode,
		{ operation = "update", hint = "" } = {}
	) => {
		const form = mode === MODAL_TAB_AGENTS ? agentsForm : generalForm;
		const agentUsesVariants =
			mode === MODAL_TAB_AGENTS && selectedAgentPricingMode !== "custom";
		const visibleHotelOptions = agentUsesVariants
			? agentVariantHotelOptions
			: hotelOptions;
		const masterPriceSelected = false;
		return (
			<Form form={form} layout='vertical' requiredMark={false} initialValues={defaultValues()}>
				{mode === MODAL_TAB_AGENTS ? (
					<AgentModeQuestion>
						<Form.Item
							name='agentPricingMode'
							label={labels.agentPricingModeQuestion}
							rules={[{ required: true, message: labels.required }]}
						>
							<Radio.Group
								optionType='button'
								buttonStyle='solid'
								onChange={(event) => {
									const nextMode = event.target.value;
									agentsForm.setFieldsValue({
										hotelIds: [],
										roomSelections: [],
										agentIds: [],
										priceVariantItemKey: "",
										priceVariantItemKeys: [],
										...(nextMode === "custom"
											? { sellingPrice: null, commissionPercent: 0, status: "open" }
											: {}),
									});
									setPreview(null);
									setPreviewIndex(0);
									setPreviewModalOpen(false);
									setEditingCell(null);
								}}
							>
								<Radio.Button value='variants'>{labels.useVariants}</Radio.Button>
								<Radio.Button value='custom'>
									{labels.customAgentCalendar}
								</Radio.Button>
							</Radio.Group>
						</Form.Item>
					</AgentModeQuestion>
				) : hint ? (
					<CalendarOperationNotice>
						<CalendarOutlined />
						<span>{hint}</span>
					</CalendarOperationNotice>
				) : null}
				{agentUsesVariants ? (
					<>
						<CalendarOperationNotice>
							<TagsOutlined />
							<span>{labels.assignVariantHint}</span>
						</CalendarOperationNotice>
						<FormGrid>
							<Form.Item
								name='priceVariantItemKeys'
								label={labels.priceVariants}
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
									showSearch
									mode='multiple'
									maxTagCount='responsive'
									allowClear
									loading={loading}
									placeholder={labels.choosePriceVariants}
									options={priceVariantOptions}
									optionFilterProp='label'
									popupStyle={selectPopupStyle}
									popupClassName={selectPopupClassName}
									onChange={() => {
										agentsForm.setFieldsValue({
											hotelIds: [],
											roomSelections: [],
											agentIds: [],
										});
										setPreview(null);
									}}
									suffixIcon={<TagsOutlined />}
								/>
							</Form.Item>
							<Form.Item
								name='agentIds'
								label={labels.agents}
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
									showSearch
									mode='multiple'
									maxTagCount='responsive'
									allowClear
									disabled={!selectedAgentPriceVariantKeys.length}
									placeholder={
										selectedAgentPriceVariantKeys.length
											? labels.chooseAgents
											: labels.noVariantHotels
									}
									options={filteredAgentOptions}
									optionFilterProp='label'
									popupStyle={selectPopupStyle}
									popupClassName={selectPopupClassName}
									onChange={(agentIds) => {
										agentsForm.setFieldsValue({
											hotelIds: deriveAgentVariantHotelIds(
												agentIds,
												selectedAgentPriceVariantKeys
											),
										});
										setPreview(null);
									}}
								/>
							</Form.Item>
							<DerivedAgentHotelsPanel>
								<strong>{labels.assignedAgentHotels}</strong>
								<span>{labels.derivedAgentHotelsHint}</span>
								<div>
									{selectedAgentVariantHotelOptions.length ? (
										selectedAgentVariantHotelOptions.map((option) => (
											<Tag key={option.value} color='blue'>
												{option.label}
											</Tag>
										))
									) : (
										<Tag>{labels.noDerivedAgentHotels}</Tag>
									)}
								</div>
							</DerivedAgentHotelsPanel>
						</FormGrid>
						<ActionRow>
							<Button
								type='primary'
								size='large'
								icon={<SaveOutlined />}
								loading={saving}
								onClick={saveAgentVariantAssignments}
							>
								{labels.save}
							</Button>
						</ActionRow>
					</>
				) : (
				<>
				{mode === MODAL_TAB_AGENTS ? (
					<CalendarOperationNotice>
						<CalendarOutlined />
						<span>{labels.customAgentCalendarHint}</span>
					</CalendarOperationNotice>
				) : null}
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
							options={visibleHotelOptions}
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
							onChange={() => {
								setPreview(null);
								if (mode === MODAL_TAB_GENERAL) setEditingGeneralPricingKey("");
							}}
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
							disabled={masterPriceSelected}
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
							disabled={selectedStatus === "blocked" || masterPriceSelected}
							prefix={<DollarOutlined />}
							onChange={() => setPreview(null)}
						/>
					</Form.Item>
					<Form.Item name='commissionPercent' label={labels.commission}>
						<InputNumber
							min={0}
							max={100}
							precision={2}
							disabled={selectedStatus === "blocked" || masterPriceSelected}
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
						onClick={() => openPricingPreview(mode, operation)}
					>
						{labels.generate}
					</Button>
					<Button
						type='primary'
						size='large'
						icon={<SaveOutlined />}
						loading={saving}
						onClick={() => savePricing(mode, { operation })}
					>
						{labels.save}
					</Button>
				</ActionRow>
				</>
				)}
			</Form>
		);
	};

	const handleGeneralPricingTabChange = (key) => {
		const nextTab =
			key === GENERAL_PRICING_TAB_UPDATE
				? GENERAL_PRICING_TAB_UPDATE
				: GENERAL_PRICING_TAB_ADD;
		setGeneralPricingTab(nextTab);
		setPreview(null);
		setPreviewIndex(0);
		setPreviewModalOpen(false);
		setEditingCell(null);
		if (nextTab === GENERAL_PRICING_TAB_ADD) {
			setEditingGeneralPricingKey("");
			generalForm.setFieldsValue(defaultValues());
		}
	};

	const renderGeneralUpdateTab = () => (
		<GeneralUpdateShell>
			<GeneralUpdateListPanel>
				<GeneralUpdateHeader>
					<strong>{labels.existingPricing}</strong>
					<Tag color='blue'>{existingGeneralPricingGroups.length}</Tag>
				</GeneralUpdateHeader>
				{existingGeneralPricingGroups.length ? (
					<GeneralPricingCards>
						{existingGeneralPricingGroups.map((group) => (
							<button
								key={group.key}
								type='button'
								className={
									group.key === editingGeneralPricingKey ? "selected" : ""
								}
								onClick={() => selectGeneralPricingForUpdate(group)}
							>
								<span className='card-top'>
									<strong>{group.hotelName}</strong>
									<Tag color={group.blockedCount ? "orange" : "green"}>
										{group.totalDays} {labels.day}
									</Tag>
								</span>
								<span className='room-name'>{group.roomTypeLabel}</span>
								<span className='room-display'>{group.roomDisplayName}</span>
								<span className='date-range'>
									{labels.fromDate} {group.startDate} {labels.toDate}{" "}
									{group.endDate}
								</span>
								<span className='card-metrics'>
									<span>
										{group.openCount} {labels.openDays}
									</span>
									<span>
										{group.blockedCount} {labels.blockedDays}
									</span>
									<span>{Number(group.firstPrice || 0).toFixed(2)}</span>
								</span>
								<span className='edit-chip'>
									<EditOutlined /> {labels.editPricing}
								</span>
							</button>
						))}
					</GeneralPricingCards>
				) : (
					<PreviewEmpty>{labels.noExistingPricing}</PreviewEmpty>
				)}
			</GeneralUpdateListPanel>
			<GeneralUpdateEditorPanel>
				<UpdateEditorIntro className={selectedGeneralPricingGroup ? "selected" : ""}>
					<UnorderedListOutlined />
					<span>
						{selectedGeneralPricingGroup
							? labels.selectedPricing
							: labels.updatePricingHint}
					</span>
					{selectedGeneralPricingGroup ? (
						<strong>{selectedGeneralPricingGroup.label}</strong>
					) : null}
				</UpdateEditorIntro>
				{renderPricingForm(MODAL_TAB_GENERAL, {
					operation: GENERAL_PRICING_TAB_UPDATE,
				})}
			</GeneralUpdateEditorPanel>
		</GeneralUpdateShell>
	);

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
			{embedded ? (
				<CalendarPricingBody
					dir={isArabic ? "rtl" : "ltr"}
					$isArabic={isArabic}
					$embedded
				>
					{renderPricingForm(normalizedActiveTab)}
				</CalendarPricingBody>
			) : (
				<Modal
					open={open}
					onCancel={onClose}
					footer={null}
					width='min(1440px, 98vw)'
					centered
					className='overall-calendar-pricing-modal'
					style={{ transform: "translateY(-10vh)" }}
					rootClassName={OVERALL_DASHBOARD_MODAL_ROOT_CLASS}
					wrapClassName={OVERALL_DASHBOARD_MODAL_WRAP_CLASS}
					zIndex={OVERALL_DASHBOARD_MODAL_Z_INDEX}
					destroyOnClose={false}
					styles={{
						mask: { zIndex: OVERALL_DASHBOARD_MODAL_Z_INDEX - 1 },
						body: {
							maxHeight: "calc(100vh - 34px)",
							overflowY: "auto",
							paddingTop: 0,
							paddingBottom: 8,
						},
					}}
				>
					<CalendarPricingBody
						dir={isArabic ? "rtl" : "ltr"}
						$isArabic={isArabic}
					>
						<Tabs
							activeKey={generalPricingTab}
							onChange={(key) => {
								handleGeneralPricingTabChange(key);
								onTabChange?.(MODAL_TAB_GENERAL);
							}}
							items={[
								{
									key: GENERAL_PRICING_TAB_ADD,
									label: (
										<span className='calendar-pricing-tab-label'>
											<CalendarOutlined /> {labels.addPricingTab}
										</span>
									),
									children: renderPricingForm(MODAL_TAB_GENERAL, {
										operation: GENERAL_PRICING_TAB_ADD,
										hint: labels.addPricingHint,
									}),
								},
								{
									key: GENERAL_PRICING_TAB_UPDATE,
									label: (
										<span className='calendar-pricing-tab-label'>
											<GlobalOutlined /> {labels.updatePricingTab}
										</span>
									),
									children: renderGeneralUpdateTab(),
								},
							]}
						/>
					</CalendarPricingBody>
				</Modal>
			)}
			<Modal
				open={previewModalOpen && hasPreview}
				onCancel={() => {
					setPreviewModalOpen(false);
					setEditingCell(null);
				}}
				footer={null}
				width='min(1180px, 96vw)'
				centered
				className='overall-calendar-preview-modal'
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
								{preview?.dates.length} {labels.day} | {preview?.rooms.length}{" "}
								{labels.rooms} | {safePreviewIndex + 1} / {monthCards.length}
							</span>
						</div>
						<PreviewActions>
							<Button
								type='primary'
								icon={<SaveOutlined />}
								loading={saving}
								onClick={() =>
									savePricing(preview?.mode || normalizedActiveTab, {
										operation: preview?.operation,
									})
								}
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

export default OverallCalendarPricingModal;

const CalendarPricingGlobalStyle = createGlobalStyle`
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

	.overall-calendar-pricing-modal .ant-modal-content {
		border-radius: 10px;
	}

	.overall-calendar-preview-modal .ant-modal-content {
		height: 95vh;
		border-radius: 12px;
		overflow: hidden;
	}

	.overall-calendar-pricing-modal .ant-modal-close {
		top: 8px;
	}

	.overall-calendar-pricing-modal .ant-tabs-nav {
		padding: 2px 54px 0;
	}

	.overall-calendar-pricing-dropdown-rtl {
		direction: rtl;
		text-align: right;
	}

	.overall-calendar-pricing-dropdown-rtl .ant-select-item-option-content {
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

const DerivedAgentHotelsPanel = styled.div`
	min-height: 72px;
	border: 1px solid rgba(20, 86, 140, 0.16);
	border-radius: 8px;
	padding: 10px 12px;
	background: #f8fbff;

	strong,
	span {
		display: block;
	}

	strong {
		color: #123b63;
		font-weight: 800;
		margin-bottom: 3px;
	}

	span {
		color: #5f7188;
		font-size: 0.82rem;
		margin-bottom: 8px;
		line-height: 1.4;
	}

	.ant-tag {
		margin-bottom: 4px;
		white-space: normal;
		line-height: 1.45;
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

const CalendarOperationNotice = styled.div`
	display: flex;
	align-items: center;
	justify-content: ${(props) => (props.dir === "rtl" ? "flex-end" : "flex-start")};
	gap: 8px;
	margin: 0 0 10px;
	padding: 10px 12px;
	border: 1px solid rgba(20, 184, 166, 0.18);
	border-radius: 8px;
	background: linear-gradient(135deg, #f0fdfa 0%, #f8fbff 100%);
	color: #1f3a59;
	font-size: 0.82rem;
	font-weight: 850;
	text-align: start;

	svg {
		color: #0f766e;
	}
`;

const AgentModeQuestion = styled.div`
	display: flex;
	justify-content: center;
	margin-bottom: 10px;
	padding: 12px;
	border: 1px solid #d6e4f3;
	border-radius: 8px;
	background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);

	.ant-form-item {
		margin-bottom: 0;
	}

	.ant-form-item-label {
		text-align: center;
	}

	.ant-radio-group {
		flex-wrap: wrap;
		justify-content: center;
	}

	@media (max-width: 620px) {
		align-items: stretch;
		flex-direction: column;

		.ant-radio-group {
			width: 100%;
		}

		.ant-radio-button-wrapper {
			flex: 1 1 100%;
		}
	}
`;

const GeneralUpdateShell = styled.div`
	display: grid;
	grid-template-columns: minmax(280px, 0.78fr) minmax(0, 1.55fr);
	gap: 14px;
	align-items: start;

	@media (max-width: 1100px) {
		grid-template-columns: 1fr;
	}
`;

const GeneralUpdateListPanel = styled.div`
	display: grid;
	gap: 10px;
	min-width: 0;
	padding: 12px;
	border: 1px solid #d6e4f3;
	border-radius: 8px;
	background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
`;

const GeneralUpdateHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;

	strong {
		color: #172033;
		font-size: 0.92rem;
		font-weight: 950;
	}
`;

const GeneralPricingCards = styled.div`
	display: grid;
	gap: 9px;
	max-height: min(56vh, 560px);
	overflow-y: auto;
	padding-inline-end: 2px;

	button {
		display: grid;
		gap: 7px;
		width: 100%;
		padding: 11px;
		border: 1px solid #d6e4f3;
		border-radius: 8px;
		background: #ffffff;
		color: #172033;
		text-align: start;
		cursor: pointer;
		box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
		transition:
			border-color 160ms ease,
			background 160ms ease,
			box-shadow 160ms ease,
			transform 160ms ease;
	}

	button:hover,
	button.selected {
		border-color: rgba(20, 184, 166, 0.58);
		background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%);
		box-shadow: 0 12px 24px rgba(15, 118, 110, 0.12);
		transform: translateY(-1px);
	}

	.card-top,
	.card-metrics {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-width: 0;
	}

	.card-top strong,
	.room-name {
		min-width: 0;
		overflow: hidden;
		color: #0f172a;
		font-weight: 950;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.room-display,
	.date-range,
	.card-metrics span {
		color: #475569;
		font-size: 0.76rem;
		font-weight: 820;
	}

	.card-metrics {
		flex-wrap: wrap;
		justify-content: flex-start;
	}

	.card-metrics span {
		display: inline-flex;
		align-items: center;
		min-height: 24px;
		padding: 2px 8px;
		border: 1px solid #dbeafe;
		border-radius: 999px;
		background: #f8fbff;
		color: #1f3a59;
	}

	.edit-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		justify-self: start;
		gap: 5px;
		min-height: 28px;
		padding: 0 10px;
		border: 1px solid #d6e4f3;
		border-radius: 7px;
		background: #ffffff;
		color: #0f766e;
		font-size: 0.76rem;
		font-weight: 950;
	}
`;

const GeneralUpdateEditorPanel = styled.div`
	min-width: 0;
	padding: 12px;
	border: 1px solid #d6e4f3;
	border-radius: 8px;
	background: #ffffff;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
`;

const UpdateEditorIntro = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 8px;
	margin-bottom: 10px;
	padding: 10px 12px;
	border: 1px solid rgba(96, 165, 250, 0.28);
	border-radius: 8px;
	background: #f8fbff;
	color: #1f3a59;
	font-size: 0.82rem;
	font-weight: 850;
	text-align: start;

	&.selected {
		border-color: rgba(20, 184, 166, 0.34);
		background: linear-gradient(135deg, #f0fdfa 0%, #f8fbff 100%);
	}

	strong {
		color: #0f766e;
		font-weight: 950;
	}

	@media (max-width: 640px) {
		align-items: flex-start;
		flex-direction: column;
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
