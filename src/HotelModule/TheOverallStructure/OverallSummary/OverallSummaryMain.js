import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { DatePicker, Drawer, Input, Select, Switch } from "antd";
import {
	CalendarOutlined,
	FilterOutlined,
	HomeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import moment from "moment-hijri";
import styled from "styled-components";
import { getOverallSummary } from "../../apiAdmin";
import {
	ExecutiveMySummaryReport,
	ExecutiveInventoryReport,
	ExecutivePaidReport,
	ExecutiveReservationsReport,
} from "./ExecutiveReports";
import {
	buildOwnerParams,
	formatMoney,
	getOverallText,
	localizeStatus,
	OverallPageShell,
	OverallTableWrap,
	singleHotelRoute,
	StatusPill,
	statusTone,
	titleCase,
} from "../overallShared";

const { RangePicker } = DatePicker;

const SUMMARY_TEXT = {
	en: {
		title: "Overall Summary",
		subtitle: "All assigned properties in one operational view",
		today: "Today",
		yesterday: "Yesterday",
		last7: "Last 7 Days",
		overviewTab: "Hotels Summary",
		agentOverviewTab: "My Agent Summary",
		agentFilterHint: "These numbers show only reservations tied to your agent account.",
		reservationsTab: "Reservations Overview",
		inventoryTab: "Hotels' Inventory",
		paidTab: "Paid Reservations Overview",
		operationalReservations: "Operational reservations",
		filterByHotel: "Filter by hotel",
		dateFrom: "Date from",
		dateTo: "Date to",
		range: "Range",
		searchPlaceholder: "Search hotel, owner, booking source, or status",
		reportFilters: "Report filters",
		selectedHotels: "Selected hotels",
		allHistorical: "All historical data",
		calendar: "Calendar",
		gregorian: "Gregorian",
		hijri: "Hijri",
		months: "Months",
		year: "Year",
		computedRange: "Computed range",
		includeCancelled: "Include cancelled/no show",
		status: "Status",
		dateBy: "Date by",
		grandTotal: "Grand Total",
		minAvailableRooms: "Min Available Rooms",
		minAvailable: "Min Available",
		peakOccupied: "Peak Occupied",
		cleanDirty: "Clean / Dirty",
		totalRoomsHint:
			"Sellable active rooms. Blocked/out-of-service rooms are excluded.",
		availableHint:
			"Lowest available sellable rooms after each hotel's peak occupied day in the selected range.",
		occupiedHint:
			"Highest occupied sellable rooms on any day in the selected date range. The Hotel Rooms Map shows the live current state.",
		cleanDirtyHint:
			"Clean/dirty active rooms from room-map and housekeeping state. Occupied rooms are not counted as dirty here.",
	},
	ar: {
		title: "الملخص العام",
		subtitle: "كل الفنادق المخصصة في واجهة تشغيلية واحدة",
		today: "اليوم",
		yesterday: "أمس",
		last7: "آخر 7 أيام",
		grandTotal: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0639\u0627\u0645",
		agentOverviewTab: "\u0645\u0644\u062e\u0635 \u062d\u062c\u0648\u0632\u0627\u062a\u064a",
		agentFilterHint:
			"\u0647\u0630\u0647 \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u062a\u0639\u0631\u0636 \u0641\u0642\u0637 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u062d\u0633\u0627\u0628\u0643 \u0643\u0648\u0643\u064a\u0644.",
		minAvailableRooms: "\u0623\u0642\u0644 \u063a\u0631\u0641 \u0645\u062a\u0627\u062d\u0629",
		minAvailable: "\u0623\u0642\u0644 \u0645\u062a\u0627\u062d",
		peakOccupied: "\u0623\u0639\u0644\u0649 \u0625\u0634\u063a\u0627\u0644",
		cleanDirty: "\u0646\u0638\u064a\u0641 / \u0645\u062a\u0633\u062e",
		totalRoomsHint:
			"\u0627\u0644\u063a\u0631\u0641 \u0627\u0644\u0646\u0634\u0637\u0629 \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0628\u064a\u0639. \u0627\u0644\u063a\u0631\u0641 \u0627\u0644\u0645\u0639\u0637\u0644\u0629 \u0623\u0648 \u062e\u0627\u0631\u062c \u0627\u0644\u062e\u062f\u0645\u0629 \u0645\u0633\u062a\u0628\u0639\u062f\u0629.",
		availableHint:
			"\u0623\u0642\u0644 \u0639\u062f\u062f \u0645\u062a\u0627\u062d \u0645\u0646 \u0627\u0644\u063a\u0631\u0641 \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0628\u064a\u0639 \u0628\u0639\u062f \u064a\u0648\u0645 \u0623\u0639\u0644\u0649 \u0625\u0634\u063a\u0627\u0644 \u0644\u0643\u0644 \u0641\u0646\u062f\u0642 \u0641\u064a \u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0645\u062d\u062f\u062f.",
		occupiedHint:
			"\u0623\u0639\u0644\u0649 \u0639\u062f\u062f \u063a\u0631\u0641 \u0645\u0634\u063a\u0648\u0644\u0629 \u0641\u064a \u0623\u064a \u064a\u0648\u0645 \u062f\u0627\u062e\u0644 \u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0645\u062d\u062f\u062f. \u062e\u0631\u064a\u0637\u0629 \u063a\u0631\u0641 \u0627\u0644\u0641\u0646\u062f\u0642 \u062a\u0639\u0631\u0636 \u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.",
		cleanDirtyHint:
			"\u063a\u0631\u0641 \u0646\u0638\u064a\u0641\u0629/\u0645\u062a\u0633\u062e\u0629 \u0645\u0646 \u062d\u0627\u0644\u0629 \u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0648\u0627\u0644\u0646\u0638\u0627\u0641\u0629. \u0627\u0644\u063a\u0631\u0641 \u0627\u0644\u0645\u0634\u063a\u0648\u0644\u0629 \u0644\u0627 \u062a\u062d\u0633\u0628 \u0645\u062a\u0633\u062e\u0629 \u0647\u0646\u0627.",
	},
};

const SUMMARY_TABS = ["overview", "reservations", "inventory", "paid-overview"];

const normalizeSummaryTab = (value = "") =>
	SUMMARY_TABS.includes(value) ? value : "overview";

const ARABIC_TAB_LABELS = {
	overviewTab: "ملخص الفنادق",
	reservationsTab: "نظرة عامة على الحجوزات",
	inventoryTab: "مخزون الفنادق",
	paidTab: "تقرير الحجوزات المدفوعة",
};

const SUMMARY_FILTER_TEXT = {
	en: {
		operationalReservations: "Operational reservations",
		filterByHotel: "Filter by hotel",
		dateFrom: "Date from",
		dateTo: "Date to",
		range: "Range",
		searchPlaceholder: "Search hotel, owner, booking source, or status",
	},
	ar: {
		operationalReservations: "الحجوزات التشغيلية",
		filterByHotel: "تصفية حسب الفندق",
		dateFrom: "من تاريخ",
		dateTo: "إلى تاريخ",
		range: "الفترة",
		searchPlaceholder: "ابحث بالفندق أو المالك أو مصدر الحجز أو الحالة",
		reportFilters: "فلاتر التقرير",
		selectedHotels: "الفنادق المحددة",
		allHistorical: "كل البيانات التاريخية",
		calendar: "التقويم",
		gregorian: "ميلادي",
		hijri: "هجري",
		months: "الأشهر",
		year: "السنة",
		computedRange: "المدى المحتسب",
		includeCancelled: "تضمين الملغى وعدم الحضور",
		status: "الحالة",
		dateBy: "التاريخ حسب",
	},
};

const queryParamsObject = (search = "") => {
	const params = {};
	const query = new URLSearchParams(search || "");
	query.forEach((value, key) => {
		if (params[key]) {
			params[key] = Array.isArray(params[key])
				? [...params[key], value]
				: [params[key], value];
			return;
		}
		params[key] = value;
	});
	return params;
};

const normalizeSummaryRange = (value = "") => {
	const normalized = String(value || "").toLowerCase();
	return ["today", "yesterday", "last7", "all"].includes(normalized)
		? normalized
		: "all";
};

const normalizeSummaryDateBy = (value = "") => {
	if (["createdAt", "created_at", "created"].includes(value)) return "createdAt";
	if (["checkin", "checkinDate", "check_in", "checkin_date"].includes(value))
		return "checkin_date";
	if (["checkout", "checkoutDate", "check_out", "checkout_date"].includes(value))
		return "checkout_date";
	return "createdAt";
};

const parseSummaryList = (value = "") =>
	(Array.isArray(value) ? value : [value])
		.flatMap((item) => String(item || "").split(","))
		.map((item) => item.trim())
		.filter(Boolean);

const normalizeSummaryBool = (value) =>
	["1", "true", "yes"].includes(String(value || "").toLowerCase());

const supportsHijriCalendar = () =>
	typeof moment?.fn?.iMonth === "function" &&
	typeof moment?.fn?.iYear === "function";

const currentHijriSelection = () => {
	if (!supportsHijriCalendar()) return { month: dayjs().month(), year: dayjs().year() };
	const now = moment();
	return { month: now.iMonth(), year: now.iYear() };
};

const hijriMonthsEn = [
	"Muharram",
	"Safar",
	"Rabi Al-Awwal",
	"Rabi Al-Thani",
	"Jumada Al-Awwal",
	"Jumada Al-Thani",
	"Rajab",
	"Sha'ban",
	"Ramadan",
	"Shawwal",
	"Dhul-Qadah",
	"Dhul-Hijjah",
];

const hijriMonthsAr = [
	"محرم",
	"صفر",
	"ربيع الأول",
	"ربيع الآخر",
	"جمادى الأولى",
	"جمادى الآخرة",
	"رجب",
	"شعبان",
	"رمضان",
	"شوال",
	"ذو القعدة",
	"ذو الحجة",
];

const gregorianMonths = Array.from({ length: 12 }).map((_, index) => ({
	value: index,
	label: dayjs().month(index).format("MMMM"),
}));

const normalizeMonthIndexes = (values = []) => [
	...new Set(
		(Array.isArray(values) ? values : [values])
			.map((value) => Number(value))
			.filter((value) => Number.isInteger(value) && value >= 0 && value <= 11)
	),
].sort((a, b) => a - b);

const monthRange = (calendarType = "hijri", month, year) => {
	if (!Number.isInteger(Number(month)) || !Number.isInteger(Number(year))) {
		return { start: "", end: "" };
	}
	if (calendarType === "hijri" && supportsHijriCalendar()) {
		const start = moment().iYear(Number(year)).iMonth(Number(month)).startOf("iMonth");
		const end = moment().iYear(Number(year)).iMonth(Number(month)).endOf("iMonth");
		return {
			start: dayjs(start.toDate()).format("YYYY-MM-DD"),
			end: dayjs(end.toDate()).format("YYYY-MM-DD"),
		};
	}
	const start = dayjs().year(Number(year)).month(Number(month)).startOf("month");
	return {
		start: start.format("YYYY-MM-DD"),
		end: start.endOf("month").format("YYYY-MM-DD"),
	};
};

const monthRangeFromSelection = (calendarType, months = [], year) => {
	const selectedMonths = normalizeMonthIndexes(months);
	if (!selectedMonths.length) return { dateFrom: "", dateTo: "" };
	const ranges = selectedMonths
		.map((month) => monthRange(calendarType, month, year))
		.filter((range) => range.start && range.end);
	if (!ranges.length) return { dateFrom: "", dateTo: "" };
	return {
		dateFrom: ranges[0].start,
		dateTo: ranges[ranges.length - 1].end,
	};
};

const defaultSummaryCalendarType = () => "hijri";

const defaultOverviewReportPeriod = () => {
	const end = dayjs();
	if (supportsHijriCalendar()) {
		const currentHijri = moment();
		const startHijri = currentHijri.clone().subtract(3, "iMonth").startOf("iMonth");
		const months = [];
		for (let index = 3; index >= 0; index -= 1) {
			const month = currentHijri.clone().subtract(index, "iMonth");
			if (month.iYear() === currentHijri.iYear()) months.push(month.iMonth());
		}
		return {
			calendarType: "hijri",
			reportYear: currentHijri.iYear(),
			reportMonths: normalizeMonthIndexes(months),
			dateFrom: dayjs(startHijri.toDate()).format("YYYY-MM-DD"),
			dateTo: end.format("YYYY-MM-DD"),
		};
	}
	const start = end.subtract(3, "month").startOf("month");
	const months = [];
	for (let index = 0; index < 4; index += 1) {
		const month = start.add(index, "month");
		if (month.year() === end.year()) months.push(month.month());
	}
	return {
		calendarType: "gregorian",
		reportYear: end.year(),
		reportMonths: normalizeMonthIndexes(months),
		dateFrom: start.format("YYYY-MM-DD"),
		dateTo: end.format("YYYY-MM-DD"),
	};
};

const hasExplicitSummaryPeriod = (query) =>
	[
		"dateFrom",
		"dateTo",
		"invStart",
		"invEnd",
		"invMonths",
		"reportMonths",
		"invHMonth",
		"range",
	].some((key) => query.has(key));

const summaryReportFilterFromQuery = (query, tab) => {
	const defaultHijri = currentHijriSelection();
	const overviewDefaults =
		tab === "overview" && !hasExplicitSummaryPeriod(query)
			? defaultOverviewReportPeriod()
			: {};
	const calendarType =
		["gregorian", "hijri"].includes(String(query.get("invCal") || "").toLowerCase())
			? String(query.get("invCal")).toLowerCase()
			: overviewDefaults.calendarType || defaultSummaryCalendarType(tab);
	const year =
		Number(query.get("invHYear")) ||
		overviewDefaults.reportYear ||
		(calendarType === "hijri" ? defaultHijri.year : dayjs().year());
	const monthValues = parseSummaryList(
		query.get("invMonths") || query.get("reportMonths") || query.get("invHMonth")
	);
	const reservationDefaults = shouldApplyReservationDateDefaults(tab, query)
		? defaultReservationDateRange()
		: {};
	const queryDateFrom =
		query.get("dateFrom") ||
		query.get("invStart") ||
		reservationDefaults.dateFrom ||
		overviewDefaults.dateFrom ||
		"";
	const queryDateTo =
		query.get("dateTo") ||
		query.get("invEnd") ||
		reservationDefaults.dateTo ||
		overviewDefaults.dateTo ||
		"";
	return {
		hotelId: parseSummaryList(query.get("hotelId") || query.get("invHotel")),
		status: parseSummaryList(query.get("status")),
		search: query.get("search") || "",
		dateFrom: queryDateFrom,
		dateTo: queryDateTo,
		includeCancelled: normalizeSummaryBool(query.get("includeCancelled")),
		calendarType,
		reportMonths: monthValues.length
			? normalizeMonthIndexes(monthValues)
			: overviewDefaults.reportMonths || [],
		reportYear: year,
	};
};

const defaultReservationDateRange = () => ({
	dateFrom: dayjs().subtract(60, "day").format("YYYY-MM-DD"),
	dateTo: dayjs().format("YYYY-MM-DD"),
});

const shouldApplyReservationDateDefaults = (tab, query) =>
	tab === "reservations" &&
	!query.has("dateFrom") &&
	!query.has("dateTo");

const initialSummaryRange = (query, filters) => {
	if (filters.dateFrom || filters.dateTo) return "custom";
	if (query.has("range")) return normalizeSummaryRange(query.get("range"));
	return "all";
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-US");

const formatRoomsFraction = (numerator, denominator) =>
	`${formatCount(numerator)}/${formatCount(denominator)}`;

const formatCleanlinessFraction = (row = {}) =>
	row.cleanlinessAvailable
		? formatRoomsFraction(row.cleanRooms, row.dirtyRooms)
		: "-";

const summaryRoleNumbers = (user = {}) =>
	[
		user.role,
		...(Array.isArray(user.roles) ? user.roles : []),
	]
		.map((role) => Number(role))
		.filter((role) => Number.isFinite(role));

const normalizeSummaryRoleKey = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/[\s_-]+/g, "");

const summaryRoleKeys = (user = {}) =>
	[
		user.roleDescription,
		...(Array.isArray(user.roleDescriptions) ? user.roleDescriptions : []),
	]
		.map(normalizeSummaryRoleKey)
		.filter(Boolean);

const summaryAccessKeys = (user = {}) =>
	(Array.isArray(user.accessTo) ? user.accessTo : [])
		.map(normalizeSummaryRoleKey)
		.filter(Boolean);

const hasAnySummaryRoleKey = (keys = [], allowed = []) =>
	allowed.some((role) => keys.includes(role));

const isPureOrderTakingSummaryUser = (user = {}) => {
	const roles = summaryRoleNumbers(user);
	const roleKeys = summaryRoleKeys(user);
	const accessKeys = summaryAccessKeys(user);
	const orderTaking =
		roles.includes(7000) ||
		roleKeys.includes("ordertaker") ||
		accessKeys.includes("ownreservations");
	const broaderSummaryRole =
		[1000, 2000, 6000, 8000, 10000].some((role) => roles.includes(role)) ||
		hasAnySummaryRoleKey(roleKeys, [
			"finance",
			"hotelmanager",
			"owner",
			"reservationemployee",
			"superadmin",
			"systemadmin",
		]);
	return orderTaking && !broaderSummaryRole;
};

const getSummaryDrawerContainer = () =>
	typeof document !== "undefined" ? document.body : false;

const OverallSummaryMain = ({ userId, user, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = { ...common, ...SUMMARY_TEXT[isRTL ? "ar" : "en"] };
	const filterLabels = SUMMARY_FILTER_TEXT[isRTL ? "ar" : "en"];
	const agentSummaryOnly = isPureOrderTakingSummaryUser(user);
	const resolveAllowedTab = useCallback((tab) => {
		const normalized = normalizeSummaryTab(tab);
		if (agentSummaryOnly) return "overview";
		return normalized;
	}, [agentSummaryOnly]);
	const history = useHistory();
	const location = useLocation();
	const initialQuery = new URLSearchParams(location.search || "");
	const normalizedInitialTab = normalizeSummaryTab(
		initialQuery.get("summaryTab") || "overview"
	);
	const initialTab = resolveAllowedTab(normalizedInitialTab);
	const initialReportFilters = summaryReportFilterFromQuery(
		initialQuery,
		initialTab
	);
	const [activeTab, setActiveTab] = useState(() =>
		initialTab
	);
	const [range, setRange] = useState(() =>
		initialSummaryRange(initialQuery, initialReportFilters)
	);
	const [dateBy, setDateBy] = useState(() =>
		initialQuery.has("dateBy") || initialQuery.has("sortBy")
			? normalizeSummaryDateBy(
					initialQuery.get("dateBy") || initialQuery.get("sortBy")
			  )
			: "createdAt"
	);
	const [filters, setFilters] = useState(initialReportFilters);
	const [loading, setLoading] = useState(false);
	const [summary, setSummary] = useState(null);
	const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
	const summaryRequestRef = useRef(0);

	const urlParams = useMemo(
		() => queryParamsObject(location.search),
		[location.search]
	);
	const compactFilterRow = activeTab === "overview" || activeTab === "reservations";
	const showFilterSearch = activeTab !== "overview" && !compactFilterRow;

	const params = useMemo(
		() => ({
			...urlParams,
			...buildOwnerParams(ownerId),
			range,
			dateBy,
			...filters,
			search: showFilterSearch ? filters.search : "",
		}),
		[dateBy, filters, ownerId, range, showFilterSearch, urlParams]
	);

	useEffect(() => {
		const query = new URLSearchParams(location.search || "");
		const rawSummaryTab = query.get("summaryTab") || "";
		const normalizedNextTab = normalizeSummaryTab(query.get("summaryTab") || "overview");
		const nextTab = resolveAllowedTab(normalizedNextTab);
		const nextReportFilters = summaryReportFilterFromQuery(query, nextTab);
		setActiveTab(nextTab);
		if (nextReportFilters.dateFrom || nextReportFilters.dateTo) {
			setRange("custom");
		} else if (query.has("range")) {
			setRange(normalizeSummaryRange(query.get("range")));
		} else {
			setRange("all");
		}
		if (query.has("dateBy") || query.has("sortBy")) {
			setDateBy(normalizeSummaryDateBy(query.get("dateBy") || query.get("sortBy")));
		} else if (nextTab === "reservations") {
			setDateBy("createdAt");
		}
		setFilters((previous) =>
			JSON.stringify(previous) === JSON.stringify(nextReportFilters)
				? previous
				: nextReportFilters
		);
		if (rawSummaryTab && nextTab === "overview") {
			query.delete("summaryTab");
			const cleanedSearch = query.toString();
			const currentSearch = new URLSearchParams(location.search || "").toString();
			if (cleanedSearch !== currentSearch) {
				history.replace({
					pathname: location.pathname,
					search: cleanedSearch ? `?${cleanedSearch}` : "",
				});
			}
		}
	}, [history, location.pathname, location.search, resolveAllowedTab]);

	useEffect(() => {
		if (activeTab === "inventory") setFilterDrawerOpen(false);
	}, [activeTab]);

	useEffect(() => {
		if (!userId || !token) return;
		const requestId = summaryRequestRef.current + 1;
		summaryRequestRef.current = requestId;
		setLoading(true);
		getOverallSummary(userId, token, params)
			.then((data) => {
				if (summaryRequestRef.current !== requestId) return;
				setSummary(data && !data.error ? data : null);
			})
			.catch(() => {
				if (summaryRequestRef.current === requestId) setSummary(null);
			})
			.finally(() => {
				if (summaryRequestRef.current === requestId) setLoading(false);
			});
	}, [params, token, userId]);

	const stats = summary?.stats || {};
	const hotels = Array.isArray(summary?.hotels) ? summary.hotels : [];
	const hotelOptions = Array.isArray(summary?.allHotels)
		? summary.allHotels
		: hotels;
	const dateByOptions = [
		{ value: "createdAt", label: labels.createdAt },
		{ value: "checkin_date", label: labels.checkIn },
		{ value: "checkout_date", label: labels.checkOut },
	];
	const statusOptions = [
		{ value: "", label: filterLabels.operationalReservations },
		{ value: "confirmed", label: labels.confirmed },
		{ value: "inhouse", label: labels.inHouse },
		{ value: "checked out", label: labels.checkedOut },
		{ value: "pending", label: labels.pending },
		{ value: "cancelled", label: labels.cancelled },
		{ value: "no show", label: labels.noShow },
	];
	const tabLabels = isRTL ? ARABIC_TAB_LABELS : labels;
	const tabOptions = [
		{
			value: "overview",
			label: agentSummaryOnly
				? labels.agentOverviewTab
				: tabLabels.overviewTab,
		},
		...(agentSummaryOnly
			? []
			: [
					{ value: "reservations", label: tabLabels.reservationsTab },
					{ value: "inventory", label: tabLabels.inventoryTab },
					{ value: "paid-overview", label: tabLabels.paidTab },
			  ]),
	];
	const monthOptions =
		filters.calendarType === "hijri"
			? (isRTL ? hijriMonthsAr : hijriMonthsEn).map((label, index) => ({
					value: index,
					label,
			  }))
			: gregorianMonths;
	const currentYear =
		filters.calendarType === "hijri"
			? currentHijriSelection().year
			: dayjs().year();
	const yearOptions = Array.from({ length: 8 }).map((_, index) => {
		const value = currentYear - 2 + index;
		return { value, label: String(value) };
	});
	if (
		filters.reportYear &&
		!yearOptions.some((option) => Number(option.value) === Number(filters.reportYear))
	) {
		yearOptions.push({
			value: Number(filters.reportYear),
			label: String(filters.reportYear),
		});
		yearOptions.sort((a, b) => Number(a.value) - Number(b.value));
	}
	const selectedRangeValues =
		filters.dateFrom && filters.dateTo
			? [dayjs(filters.dateFrom), dayjs(filters.dateTo)]
			: null;
	const summarySelectPopupClassName = `overall-summary-filter-dropdown overall-filter-dropdown ${
		isRTL ? "rtl" : "ltr"
	}`;
	const summarySelectPopupProps = (width = 220) => ({
		popupClassName: summarySelectPopupClassName,
		popupMatchSelectWidth: width,
		placement: isRTL ? "bottomRight" : "bottomLeft",
		getPopupContainer: () =>
			typeof document !== "undefined" ? document.body : undefined,
		listHeight: 280,
	});
	const activeFilterCount = useMemo(() => {
		let count = 0;
		if (parseSummaryList(filters.hotelId).length) count += 1;
		if (filters.reportMonths?.length) count += 1;
		else if (filters.dateFrom || filters.dateTo) count += 1;
		if (parseSummaryList(filters.status).length) count += 1;
		if (showFilterSearch && filters.search) count += 1;
		if (filters.includeCancelled) count += 1;
		if (dateBy !== "createdAt") count += 1;
		return count;
	}, [dateBy, filters, showFilterSearch]);
	const filterButtonText = activeFilterCount
		? `${filterLabels.reportFilters} (${activeFilterCount})`
		: filterLabels.reportFilters;
	const openHotel = (hotel = {}, section = "dashboard") => {
		const route = singleHotelRoute(hotel.ownerId || ownerId, hotel._id, section);
		if (route) history.push(route);
	};
	const syncReportQuery = (nextFilters = filters, nextDateBy = dateBy, nextTab = activeTab) => {
		const query = new URLSearchParams(location.search || "");
		const tab = resolveAllowedTab(nextTab);
		if (tab === "overview") query.delete("summaryTab");
		else query.set("summaryTab", tab);

		[
			"hotelId",
			"invHotel",
			"dateFrom",
			"dateTo",
			"invStart",
			"invEnd",
			"invCal",
			"invHMonth",
			"invHYear",
			"invMonths",
			"reportMonths",
			"status",
			"search",
			"dateBy",
			"range",
			"includeCancelled",
			"excludeCancelled",
		].forEach((key) => query.delete(key));

		const hotelIds = parseSummaryList(nextFilters.hotelId);
		if (hotelIds.length) {
			query.set("hotelId", hotelIds.join(","));
			query.set("invHotel", hotelIds.join(","));
		}
		if (nextFilters.dateFrom) {
			query.set("dateFrom", nextFilters.dateFrom);
			query.set("invStart", nextFilters.dateFrom);
		}
		if (nextFilters.dateTo) {
			query.set("dateTo", nextFilters.dateTo);
			query.set("invEnd", nextFilters.dateTo);
		}
		const hasMonthSelection = Boolean(nextFilters.reportMonths?.length);
		const defaultCalendar = defaultSummaryCalendarType(tab);
		if (
			nextFilters.calendarType &&
			(hasMonthSelection || nextFilters.calendarType !== defaultCalendar)
		) {
			query.set("invCal", nextFilters.calendarType);
		}
		if (hasMonthSelection && nextFilters.reportYear) {
			query.set("invHYear", nextFilters.reportYear);
		}
		if (hasMonthSelection) {
			query.set("invMonths", nextFilters.reportMonths.join(","));
			query.set("invHMonth", nextFilters.reportMonths[0]);
		}
		if (nextFilters.status?.length) query.set("status", nextFilters.status.join(","));
		if (tab !== "overview" && tab !== "reservations" && nextFilters.search) {
			query.set("search", nextFilters.search);
		}
		if (nextDateBy) query.set("dateBy", nextDateBy);
		if (nextFilters.includeCancelled) {
			query.set("includeCancelled", "true");
			query.set("excludeCancelled", "false");
		}
		query.set(
			"range",
			nextFilters.dateFrom || nextFilters.dateTo ? "custom" : "all"
		);

		const search = query.toString();
		const current = new URLSearchParams(location.search || "").toString();
		if (search !== current) {
			history.replace({
				pathname: location.pathname,
				search: search ? `?${search}` : "",
			});
		}
	};
	const updateFilter = (key, value) => {
		const nextFilters = {
			...filters,
			[key]: Array.isArray(value) ? value : value || "",
		};
		setFilters(nextFilters);
		syncReportQuery(nextFilters);
	};
	const updateDateBy = (value) => {
		const nextDateBy = normalizeSummaryDateBy(value);
		setDateBy(nextDateBy);
		syncReportQuery(filters, nextDateBy);
	};
	const updateCalendarType = (value) => {
		const calendarType = value === "gregorian" ? "gregorian" : "hijri";
		const defaults = calendarType === "hijri"
			? currentHijriSelection()
			: { month: dayjs().month(), year: dayjs().year() };
		const nextRange = monthRangeFromSelection(
			calendarType,
			filters.reportMonths,
			defaults.year
		);
		const nextFilters = {
			...filters,
			calendarType,
			reportYear: defaults.year,
			...nextRange,
		};
		setRange(nextRange.dateFrom || nextRange.dateTo ? "custom" : "all");
		setFilters(nextFilters);
		syncReportQuery(nextFilters);
	};
	const updateReportYear = (value) => {
		const reportYear = Number(value) || filters.reportYear;
		const nextRange = monthRangeFromSelection(
			filters.calendarType,
			filters.reportMonths,
			reportYear
		);
		const nextFilters = {
			...filters,
			reportYear,
			...nextRange,
		};
		setRange(nextRange.dateFrom || nextRange.dateTo ? "custom" : "all");
		setFilters(nextFilters);
		syncReportQuery(nextFilters);
	};
	const updateReportMonths = (values = []) => {
		const reportMonths = normalizeMonthIndexes(values);
		const nextRange = monthRangeFromSelection(
			filters.calendarType,
			reportMonths,
			filters.reportYear
		);
		const nextFilters = {
			...filters,
			reportMonths,
			...nextRange,
		};
		setRange(nextRange.dateFrom || nextRange.dateTo ? "custom" : "all");
		setFilters(nextFilters);
		syncReportQuery(nextFilters);
	};
	const resetFilters = () => {
		const overviewDefaults =
			activeTab === "overview" ? defaultOverviewReportPeriod() : {};
		const defaultCalendar = defaultSummaryCalendarType(activeTab);
		const defaults =
			(overviewDefaults.calendarType || defaultCalendar) === "hijri"
				? currentHijriSelection()
				: { month: dayjs().month(), year: dayjs().year() };
		const nextFilters = {
			hotelId: [],
			status: [],
			search: "",
			dateFrom: overviewDefaults.dateFrom || "",
			dateTo: overviewDefaults.dateTo || "",
			includeCancelled: false,
			calendarType: overviewDefaults.calendarType || defaultCalendar,
			reportMonths: overviewDefaults.reportMonths || [],
			reportYear: overviewDefaults.reportYear || defaults.year,
		};
		setRange(nextFilters.dateFrom || nextFilters.dateTo ? "custom" : "all");
		setDateBy("createdAt");
		setFilters(nextFilters);
		syncReportQuery(nextFilters, "createdAt");
	};
	const handleTabChange = (tab) => {
		const nextTab = normalizeSummaryTab(tab);
		setActiveTab(nextTab);
		syncReportQuery(filters, dateBy, nextTab);
	};
	const refreshSummary = () => {
		const requestId = summaryRequestRef.current + 1;
		summaryRequestRef.current = requestId;
		setLoading(true);
		getOverallSummary(userId, token, params)
			.then((data) => {
				if (summaryRequestRef.current !== requestId) return;
				setSummary(data && !data.error ? data : null);
			})
			.catch(() => {
				if (summaryRequestRef.current === requestId) setSummary(null);
			})
			.finally(() => {
				if (summaryRequestRef.current === requestId) {
					setLoading(false);
				}
			});
	};
	const renderFilterActions = (className = "filter-actions") => (
		<div className={className}>
			<button type='button' onClick={refreshSummary}>
				{labels.refresh}
			</button>
			<button type='button' className='secondary' onClick={resetFilters}>
				{labels.reset}
			</button>
		</div>
	);
	const renderFilterPanelContent = () => (
		<>
			<div className='filter-title'>
				<strong>{filterLabels.reportFilters}</strong>
				<span>
					{filters.dateFrom && filters.dateTo
						? `${filterLabels.computedRange}: ${filters.dateFrom} - ${filters.dateTo}`
						: filterLabels.allHistorical}
				</span>
			</div>
			<div className='filter-grid'>
				<label className='filter-control hotel-control'>
					<span>
						<HomeOutlined /> {filterLabels.selectedHotels}
					</span>
					<Select
						{...summarySelectPopupProps(320)}
						mode='multiple'
						allowClear
						maxTagCount='responsive'
						value={filters.hotelId}
						onChange={(value) => updateFilter("hotelId", value)}
						options={hotelOptions.map((hotel) => ({
							value: hotel._id,
							label: titleCase(hotel.hotelName),
						}))}
						showSearch
						optionFilterProp='label'
						placeholder={labels.allHotels}
					/>
				</label>
				<label className='filter-control'>
					<span>
						<CalendarOutlined /> {filterLabels.calendar}
					</span>
					<Select
						{...summarySelectPopupProps(180)}
						value={filters.calendarType}
						onChange={updateCalendarType}
						options={[
							{ value: "gregorian", label: filterLabels.gregorian },
							{ value: "hijri", label: filterLabels.hijri },
						]}
					/>
				</label>
				<label className='filter-control months-control'>
					<span>
						<FilterOutlined /> {filterLabels.months}
					</span>
					<Select
						{...summarySelectPopupProps(240)}
						mode='multiple'
						allowClear
						maxTagCount='responsive'
						value={filters.reportMonths}
						onChange={updateReportMonths}
						options={monthOptions}
						placeholder={filterLabels.allHistorical}
					/>
				</label>
				<label className='filter-control'>
					<span>{filterLabels.year}</span>
					<Select
						{...summarySelectPopupProps(180)}
						value={filters.reportYear}
						onChange={updateReportYear}
						options={yearOptions}
					/>
				</label>
				<label className='filter-control wide-control'>
					<span>
						<CalendarOutlined /> {filterLabels.computedRange}
					</span>
					<RangePicker
						value={selectedRangeValues}
						format='YYYY-MM-DD'
						allowClear={false}
						disabled
						placeholder={[filterLabels.dateFrom, filterLabels.dateTo]}
					/>
				</label>
				<label className='filter-control'>
					<span>{filterLabels.dateBy}</span>
					<Select
						{...summarySelectPopupProps(210)}
						value={dateBy}
						onChange={updateDateBy}
						options={dateByOptions}
					/>
				</label>
				<label className='filter-control status-control'>
					<span>{filterLabels.status}</span>
					<Select
						{...summarySelectPopupProps(260)}
						mode='multiple'
						allowClear
						maxTagCount='responsive'
						value={filters.status}
						onChange={(value) => updateFilter("status", value)}
						options={statusOptions.filter((option) => option.value)}
						placeholder={filterLabels.operationalReservations}
					/>
				</label>
				{showFilterSearch && (
					<label className='filter-control search-control'>
						<span>{labels.search}</span>
						<Input
							allowClear
							value={filters.search}
							onChange={(event) => updateFilter("search", event.target.value)}
							placeholder={filterLabels.searchPlaceholder}
						/>
					</label>
				)}
				<div className='filter-control switch-control'>
					<span>{filterLabels.includeCancelled}</span>
					<Switch
						checked={filters.includeCancelled}
						onChange={(checked) => updateFilter("includeCancelled", checked)}
					/>
				</div>
				{activeTab !== "overview" &&
					compactFilterRow &&
					renderFilterActions("filter-actions compact-filter-actions")}
			</div>
			{activeTab !== "overview" &&
				!compactFilterRow &&
				renderFilterActions()}
		</>
	);

	return (
		<OverallPageShell $isRTL={isRTL}>
			<ExecutiveTabs>
				{tabOptions.map((tab) => (
					<button
						key={tab.value}
						type='button'
						className={activeTab === tab.value ? "active" : ""}
						onClick={() => handleTabChange(tab.value)}
					>
						{tab.label}
					</button>
				))}
			</ExecutiveTabs>

			{activeTab !== "inventory" && (
				<>
					<MobileFilterBar
						$active={activeFilterCount > 0}
					>
						<button
							type='button'
							aria-pressed={activeFilterCount > 0}
							onClick={() => setFilterDrawerOpen(true)}
						>
							<FilterOutlined />
							<span>{filterButtonText}</span>
						</button>
					</MobileFilterBar>
					<ExecutiveFilterPanel
						$isRTL={isRTL}
						$compactRow={compactFilterRow}
						className='desktop-filter-panel'
					>
						{renderFilterPanelContent()}
					</ExecutiveFilterPanel>
					<Drawer
						title={filterLabels.reportFilters}
						placement={isRTL ? "right" : "left"}
						width='min(92vw, 390px)'
						open={filterDrawerOpen}
						onClose={() => setFilterDrawerOpen(false)}
						getContainer={getSummaryDrawerContainer}
						destroyOnClose={false}
						className='summary-filter-drawer'
					>
						<DrawerFilterPanel $isRTL={isRTL}>
							{renderFilterPanelContent()}
						</DrawerFilterPanel>
					</Drawer>
				</>
			)}

			{activeTab === "overview" && agentSummaryOnly && (
				<AgentSummaryScopeNote>
					{labels.agentFilterHint}
				</AgentSummaryScopeNote>
			)}

			{activeTab === "overview" && (
				<ExecutiveMySummaryReport
					active
					userId={userId}
					token={token}
					params={params}
					chosenLanguage={chosenLanguage}
					agentOnly={agentSummaryOnly}
				/>
			)}

			{activeTab === "overview" && !agentSummaryOnly && (
				<SummaryTableWrap>
				<table className='summary-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>{labels.hotel}</th>
							<th title={labels.totalRoomsHint}>{labels.rooms}</th>
							<th title={labels.availableHint}>
								{labels.minAvailable || labels.available}
							</th>
							<th title={labels.occupiedHint}>
								{labels.peakOccupied || labels.occupied}
							</th>
							<th>{labels.reservations}</th>
							<th>{labels.total}</th>
							<th>{labels.pending}</th>
							<th title={labels.cleanDirtyHint}>
								{labels.cleanDirty || labels.housekeeping}
							</th>
							<th>{labels.settings}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='10'>{labels.loading}</td>
							</tr>
						) : hotels.length ? (
							hotels.map((hotel, index) => (
								<tr key={hotel._id}>
									<td>{index + 1}</td>
									<td>
										<button
											type='button'
											className='link-btn summary-hotel-link'
											onClick={() => openHotel(hotel)}
										>
											{titleCase(hotel.hotelName)}
										</button>
									</td>
									<td title={labels.totalRoomsHint}>{formatCount(hotel.totalRooms)}</td>
									<td title={labels.availableHint}>
										{formatCount(hotel.availableRooms)}
									</td>
									<td className='fraction-cell' title={labels.occupiedHint}>
										{formatRoomsFraction(hotel.occupiedRooms, hotel.totalRooms)}
									</td>
									<td>{formatCount(hotel.totalReservations)}</td>
									<td>
										{formatMoney(hotel.totalAmount)} {labels.sar}
									</td>
									<td>{formatCount(hotel.pendingReservations)}</td>
									<td className='fraction-cell' title={labels.cleanDirtyHint}>
										{formatCleanlinessFraction(hotel)}
									</td>
									<td>
										<StatusPill
											$tone={statusTone(
												hotel.setup?.settingsDone ? "ready" : "pending"
											)}
										>
											{localizeStatus(
												hotel.setup?.settingsDone ? "ready" : "pending",
												chosenLanguage
											)}
										</StatusPill>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan='10'>{labels.noHotelsFound}</td>
							</tr>
						)}
					</tbody>
					{!loading && hotels.length ? (
						<tfoot>
							<tr className='summary-total-row'>
								<td>-</td>
								<td>{labels.grandTotal}</td>
								<td title={labels.totalRoomsHint}>{formatCount(stats.totalRooms)}</td>
								<td title={labels.availableHint}>
									{formatCount(stats.availableRooms)}
								</td>
								<td className='fraction-cell' title={labels.occupiedHint}>
									{formatRoomsFraction(stats.occupiedRooms, stats.totalRooms)}
								</td>
								<td>{formatCount(stats.totalReservations)}</td>
								<td>
									{formatMoney(stats.totalAmount)} {labels.sar}
								</td>
								<td>{formatCount(stats.pendingReservations)}</td>
								<td className='fraction-cell' title={labels.cleanDirtyHint}>
									{formatCleanlinessFraction(stats)}
								</td>
								<td>-</td>
							</tr>
						</tfoot>
					) : null}
				</table>
			</SummaryTableWrap>
			)}
			{activeTab === "reservations" && (
				<ExecutiveReservationsReport
					active
					userId={userId}
					token={token}
					params={params}
					chosenLanguage={chosenLanguage}
				/>
			)}
			{activeTab === "inventory" && (
				<ExecutiveInventoryReport
					active
					userId={userId}
					token={token}
					params={params}
					chosenLanguage={chosenLanguage}
					availableHotels={hotelOptions}
				/>
			)}
			{activeTab === "paid-overview" && (
				<ExecutivePaidReport
					active
					userId={userId}
					token={token}
					params={params}
					chosenLanguage={chosenLanguage}
				/>
			)}
		</OverallPageShell>
	);
};

export default OverallSummaryMain;

const ExecutiveTabs = styled.div`
	display: flex;
	gap: 8px;
	min-width: 0;
	max-width: 100%;
	overflow-x: auto;
	padding: 9px;
	border: 1px solid rgba(45, 93, 145, 0.22);
	border-radius: 8px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 251, 255, 0.98) 100%),
		linear-gradient(180deg, rgba(141, 76, 157, 0.12), rgba(16, 32, 51, 0.08));
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.9),
		0 8px 22px rgba(16, 32, 51, 0.06);
	scrollbar-width: thin;

	button {
		position: relative;
		overflow: hidden;
		flex: 1 0 160px;
		min-width: 0;
		min-height: 52px;
		padding: 10px 12px;
		border: 1px solid rgba(45, 93, 145, 0.18);
		border-radius: 8px;
		background: linear-gradient(180deg, #ffffff 0%, #f4f8fe 100%);
		color: #102033;
		cursor: pointer;
		font-size: 0.86rem;
		font-weight: 900;
		line-height: 1.25;
		white-space: normal;
		overflow-wrap: anywhere;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			box-shadow 0.18s ease,
			color 0.18s ease,
			transform 0.18s ease;
	}

	button.active {
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 36%),
			linear-gradient(135deg, #102033 0%, #352044 48%, #6f1f78 100%);
		border-color: rgba(183, 123, 198, 0.72);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.2),
			inset 0 -1px 0 rgba(0, 0, 0, 0.22),
			0 12px 26px rgba(80, 23, 96, 0.28);
		color: #ffffff;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.24);
		transform: translateY(-1px);
	}

	button.active::after {
		content: "";
		position: absolute;
		inset-inline: 18px;
		bottom: 7px;
		height: 3px;
		border-radius: 999px;
		background: linear-gradient(90deg, #d7b5df, #ffffff, #67a7df);
		box-shadow: 0 0 12px rgba(215, 181, 223, 0.72);
	}

	button:hover:not(.active) {
		background: var(--pms-metal-blue-bg, linear-gradient(180deg, #244e7d 0%, #102033 100%));
		border-color: #3f6f9e;
		box-shadow: 0 10px 22px rgba(16, 32, 51, 0.2);
		color: #ffffff;
		transform: translateY(-1px);
	}

	button.active:hover {
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.24),
			inset 0 -1px 0 rgba(0, 0, 0, 0.2),
			0 14px 28px rgba(80, 23, 96, 0.34);
		color: #ffffff;
		filter: brightness(1.06);
		transform: translateY(-2px);
	}

	button:focus-visible {
		outline: 3px solid rgba(141, 76, 157, 0.32);
		outline-offset: 2px;
	}

	@media (max-width: 768px) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		overflow-x: visible;
		padding: 7px;

		button {
			flex: initial;
			width: 100%;
			min-height: 48px;
			padding: 8px 9px;
			font-size: 0.78rem;
		}
	}

	@media (max-width: 380px) {
		gap: 6px;
		padding: 6px;

		button {
			min-height: 46px;
			padding: 7px 6px;
			font-size: 0.72rem;
			line-height: 1.22;
		}

		button.active::after {
			inset-inline: 12px;
			bottom: 5px;
		}
	}
`;

const AgentSummaryScopeNote = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 38px;
	padding: 8px 12px;
	border: 1px solid rgba(45, 93, 145, 0.18);
	border-radius: 8px;
	background: #f8fbff;
	color: #24547d;
	font-size: 0.84rem;
	font-weight: 850;
	text-align: center;
`;

const SummaryTableWrap = styled(OverallTableWrap)`
	width: max-content;
	max-width: 100%;
	margin-inline: auto;

	table.summary-table {
		width: max-content;
		min-width: 0;
		margin-inline: auto;
		table-layout: auto;
	}

	table.summary-table th,
	table.summary-table td {
		padding: 8px 12px;
		text-align: center;
	}

	table.summary-table th:nth-child(2),
	table.summary-table td:nth-child(2) {
		min-width: 172px;
		max-width: 210px;
		text-align: start;
	}

	.summary-hotel-link {
		display: inline-block;
		max-width: 190px;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: middle;
		white-space: nowrap;
	}

	.fraction-cell {
		color: #173d64;
		font-variant-numeric: tabular-nums;
		font-weight: 950;
	}

	tfoot td {
		border-top: 2px solid rgba(45, 93, 145, 0.28);
		background:
			linear-gradient(180deg, rgba(236, 244, 255, 0.96), rgba(247, 250, 255, 0.98)) !important;
		color: #102033;
		font-weight: 950;
	}

	.summary-total-row td:nth-child(2) {
		color: #5d1d6e;
	}

	@media (max-width: 900px) {
		width: 100%;

		table.summary-table {
			min-width: 840px;
			margin-inline: 0;
		}
	}
`;

const MobileFilterBar = styled.div`
	display: ${(props) => (props.$alwaysVisible ? "flex" : "none")};

	button {
		width: 100%;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border: 1px solid
			${(props) => (props.$active ? "#6f1f78" : "rgba(45, 93, 145, 0.28)")};
		border-radius: 8px;
		background: ${(props) =>
			props.$active
				? "linear-gradient(135deg, #2a1236 0%, #64166e 58%, #8d4c9d 100%)"
				: "linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%)"};
		color: ${(props) => (props.$active ? "#ffffff" : "#102033")};
		font-weight: 950;
		box-shadow: ${(props) =>
			props.$active
				? "0 10px 22px rgba(80, 23, 96, 0.22)"
				: "0 8px 18px rgba(16, 32, 51, 0.08)"};
	}

	@media (max-width: 980px) {
		display: flex;
	}
`;

const ExecutiveFilterPanel = styled.section`
	display: grid;
	gap: 10px;
	padding: 12px;
	border: 1px solid rgba(45, 93, 145, 0.22);
	border-radius: 8px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.98)),
		linear-gradient(135deg, rgba(16, 32, 51, 0.08), rgba(111, 31, 120, 0.06));
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.85),
		0 8px 22px rgba(16, 32, 51, 0.06);
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	.filter-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
		min-width: 0;
		color: #102033;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.filter-title strong {
		min-width: 0;
		font-size: 0.98rem;
		font-weight: 950;
		overflow-wrap: anywhere;
	}

	.filter-title span {
		min-width: 0;
		color: #53627a;
		font-size: 0.8rem;
		font-weight: 850;
		overflow-wrap: anywhere;
	}

	.filter-grid {
		display: grid;
		grid-template-columns:
			minmax(190px, 1fr)
			minmax(190px, 1fr)
			minmax(150px, 0.7fr)
			minmax(230px, 1.05fr)
			minmax(190px, 0.85fr);
		gap: 10px;
		align-items: end;
	}

	.hotel-control,
	.wide-control {
		grid-column: span 2;
	}

	.filter-control {
		display: grid;
		gap: 6px;
		min-width: 0;
		margin: 0;
	}

	.filter-control > span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: #25364d;
		font-size: 0.76rem;
		font-weight: 900;
		line-height: 1.35;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.filter-control .ant-select,
	.filter-control .ant-picker,
	.filter-control .ant-input-affix-wrapper,
	.filter-control .ant-input {
		width: 100%;
		min-width: 0;
		min-height: 38px;
	}

	.search-control {
		grid-column: span 2;
	}

	.wide-control .ant-picker {
		max-width: 100%;
		min-width: 330px;
	}

	.switch-control {
		align-self: stretch;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-height: 60px;
		padding: 9px 12px;
		border: 1px solid #d8e6f7;
		border-radius: 8px;
		background: linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%);
	}

	.switch-control .ant-switch-checked {
		background: linear-gradient(135deg, #24102d 0%, #64166e 58%, #8d4c9d 100%) !important;
	}

	.filter-actions {
		display: flex;
		justify-content: ${(props) => (props.$isRTL ? "flex-start" : "flex-end")};
		gap: 10px;
		flex-wrap: wrap;
	}

	.filter-actions button {
		min-width: 150px;
		min-height: 40px;
		border: 1px solid #64166e;
		border-radius: 6px;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
			linear-gradient(135deg, #2a1236 0%, #64166e 58%, #8d4c9d 100%);
		color: #ffffff;
		font-weight: 950;
		cursor: pointer;
		box-shadow: 0 10px 20px rgba(80, 23, 96, 0.2);
	}

	.filter-actions button.secondary {
		background: #ffffff;
		color: #102033;
		border-color: #c9d8e8;
		box-shadow: none;
	}

	${(props) =>
		props.$compactRow
			? `
		gap: 0;
		padding: 9px 10px;
		overflow: hidden;

		.filter-title {
			display: none;
		}

		.filter-grid {
			display: flex;
			align-items: end;
			gap: 8px;
			min-width: 0;
			overflow-x: auto;
			padding-bottom: 2px;
			scrollbar-width: thin;
		}

		.filter-control {
			flex: 0 0 auto;
			gap: 4px;
		}

		.hotel-control,
		.wide-control,
		.search-control {
			grid-column: auto;
		}

		.hotel-control {
			width: 198px;
		}

		.months-control {
			width: 204px;
		}

		.wide-control {
			width: 276px;
		}

		.status-control {
			width: 152px;
		}

		.filter-control:not(.hotel-control):not(.months-control):not(.wide-control):not(.status-control):not(.switch-control) {
			width: 112px;
		}

		.filter-control > span {
			font-size: 0.68rem;
			white-space: nowrap;
		}

		.filter-control .ant-select,
		.filter-control .ant-picker,
		.filter-control .ant-input-affix-wrapper,
		.filter-control .ant-input {
			min-height: 32px;
		}

		.filter-control .ant-select-selector,
		.filter-control .ant-picker {
			min-height: 32px !important;
			border-radius: 7px !important;
		}

		.wide-control .ant-picker {
			min-width: 0;
		}

		.switch-control {
			width: 154px;
			min-height: 32px;
			padding: 4px 8px;
			border-radius: 7px;
		}

		.compact-filter-actions {
			flex: 0 0 auto;
			display: flex;
			align-items: end;
			justify-content: flex-start;
			gap: 6px;
			align-self: end;
		}

		.compact-filter-actions button {
			min-width: 72px;
			min-height: 32px;
			padding: 0 10px;
			border-radius: 7px;
			font-size: 0.75rem;
			box-shadow: 0 7px 14px rgba(80, 23, 96, 0.16);
		}
	`
			: ""}

	@media (max-width: 1180px) {
		.filter-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.hotel-control,
		.wide-control {
			grid-column: span 2;
		}
	}

	@media (max-width: 980px) {
		padding: 10px;

		&.desktop-filter-panel {
			display: none;
		}

		.filter-title {
			display: grid;
			align-items: start;
		}

		.filter-grid {
			grid-template-columns: 1fr;
		}

		.wide-control,
		.hotel-control,
		.search-control {
			grid-column: auto;
		}

		.wide-control .ant-picker {
			max-width: 100%;
			min-width: 0;
		}

		.filter-actions button {
			flex: 1 1 130px;
			min-width: 0;
		}
	}

	@media (max-width: 480px) {
		gap: 10px;
		padding: 9px;

		.filter-title strong {
			font-size: 0.9rem;
		}

		.filter-title span,
		.filter-control > span {
			font-size: 0.72rem;
		}

		.switch-control {
			min-height: auto;
			align-items: center;
			flex-wrap: wrap;
			padding: 9px;
		}

		.filter-actions {
			display: grid;
			grid-template-columns: 1fr;
		}

		.filter-actions button {
			width: 100%;
			min-height: 42px;
		}
	}
`;

const DrawerFilterPanel = styled(ExecutiveFilterPanel)`
	padding: 0;
	border: 0;
	background: transparent;
	box-shadow: none;

	.filter-title {
		display: none;
	}

	.filter-grid {
		grid-template-columns: 1fr;
	}

	.hotel-control,
	.wide-control,
	.search-control {
		grid-column: auto;
	}

	.wide-control .ant-picker {
		max-width: 100%;
		min-width: 0;
	}

	.filter-actions {
		display: grid;
		grid-template-columns: 1fr;
	}

	.filter-actions button {
		width: 100%;
		min-width: 0;
	}
`;
