import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { DatePicker, Input, Select, Switch } from "antd";
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
	ExecutiveInventoryReport,
	ExecutivePaidReport,
	ExecutiveReservationsReport,
} from "./ExecutiveReports";
import {
	buildOwnerParams,
	formatMoney,
	getOverallText,
	localizeStatus,
	OverallCard,
	OverallCards,
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
		overviewTab: "Hotel Summary",
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
	},
	ar: {
		title: "الملخص العام",
		subtitle: "كل الفنادق المخصصة في واجهة تشغيلية واحدة",
		today: "اليوم",
		yesterday: "أمس",
		last7: "آخر 7 أيام",
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

const summaryReportFilterFromQuery = (query, tab) => {
	const defaultHijri = currentHijriSelection();
	const calendarType =
		["gregorian", "hijri"].includes(String(query.get("invCal") || "").toLowerCase())
			? String(query.get("invCal")).toLowerCase()
			: "hijri";
	const year =
		Number(query.get("invHYear")) ||
		(calendarType === "hijri" ? defaultHijri.year : dayjs().year());
	const monthValues = parseSummaryList(
		query.get("invMonths") || query.get("reportMonths") || query.get("invHMonth")
	);
	const reservationDefaults = shouldApplyReservationDateDefaults(tab, query)
		? defaultReservationDateRange()
		: {};
	const queryDateFrom =
		query.get("dateFrom") || query.get("invStart") || reservationDefaults.dateFrom || "";
	const queryDateTo =
		query.get("dateTo") || query.get("invEnd") || reservationDefaults.dateTo || "";
	return {
		hotelId: parseSummaryList(query.get("hotelId") || query.get("invHotel")),
		status: parseSummaryList(query.get("status")),
		search: query.get("search") || "",
		dateFrom: queryDateFrom,
		dateTo: queryDateTo,
		includeCancelled: normalizeSummaryBool(query.get("includeCancelled")),
		calendarType,
		reportMonths: normalizeMonthIndexes(monthValues),
		reportYear: year,
	};
};

const defaultReservationDateRange = () => ({
	dateFrom: dayjs().subtract(60, "day").format("YYYY-MM-DD"),
	dateTo: dayjs().format("YYYY-MM-DD"),
});

const shouldApplyReservationDateDefaults = (tab, query) =>
	tab === "reservations" && !query.has("dateFrom") && !query.has("dateTo");

const OverallSummaryMain = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = { ...common, ...SUMMARY_TEXT[isRTL ? "ar" : "en"] };
	const filterLabels = SUMMARY_FILTER_TEXT[isRTL ? "ar" : "en"];
	const history = useHistory();
	const location = useLocation();
	const initialQuery = new URLSearchParams(location.search || "");
	const initialTab = normalizeSummaryTab(
		initialQuery.get("summaryTab") || "overview"
	);
	const initialReportFilters = summaryReportFilterFromQuery(
		initialQuery,
		initialTab
	);
	const [activeTab, setActiveTab] = useState(() =>
		initialTab
	);
	const [range, setRange] = useState("all");
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

	const urlParams = useMemo(
		() => queryParamsObject(location.search),
		[location.search]
	);

	const params = useMemo(
		() => ({
			...urlParams,
			...buildOwnerParams(ownerId),
			range,
			dateBy,
			...filters,
		}),
		[dateBy, filters, ownerId, range, urlParams]
	);

	useEffect(() => {
		const query = new URLSearchParams(location.search || "");
		const nextTab = normalizeSummaryTab(query.get("summaryTab") || "overview");
		const nextReportFilters = summaryReportFilterFromQuery(query, nextTab);
		setActiveTab(nextTab);
		if (query.has("range")) {
			setRange(normalizeSummaryRange(query.get("range")));
		} else {
			setRange(nextReportFilters.dateFrom || nextReportFilters.dateTo ? "custom" : "all");
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
	}, [location.search]);

	useEffect(() => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallSummary(userId, token, params)
			.then((data) => {
				setSummary(data && !data.error ? data : null);
			})
			.finally(() => setLoading(false));
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
		{ value: "overview", label: tabLabels.overviewTab },
		{ value: "reservations", label: tabLabels.reservationsTab },
		{ value: "inventory", label: tabLabels.inventoryTab },
		{ value: "paid-overview", label: tabLabels.paidTab },
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
	const openHotel = (hotel = {}, section = "dashboard") => {
		const route = singleHotelRoute(hotel.ownerId || ownerId, hotel._id, section);
		if (route) history.push(route);
	};
	const syncReportQuery = (nextFilters = filters, nextDateBy = dateBy, nextTab = activeTab) => {
		const query = new URLSearchParams(location.search || "");
		const tab = normalizeSummaryTab(nextTab);
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
		if (hasMonthSelection && nextFilters.calendarType) {
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
		if (nextFilters.search) query.set("search", nextFilters.search);
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
		const defaults = currentHijriSelection();
		const nextFilters = {
			hotelId: [],
			status: [],
			search: "",
			dateFrom: "",
			dateTo: "",
			includeCancelled: false,
			calendarType: "hijri",
			reportMonths: [],
			reportYear: defaults.year,
		};
		setRange("all");
		setDateBy("createdAt");
		setFilters(nextFilters);
		syncReportQuery(nextFilters, "createdAt");
	};
	const handleTabChange = (tab) => {
		const nextTab = normalizeSummaryTab(tab);
		setActiveTab(nextTab);
		syncReportQuery(filters, dateBy, nextTab);
	};

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
				<ExecutiveFilterPanel $isRTL={isRTL}>
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
								value={filters.calendarType}
								onChange={updateCalendarType}
								options={[
									{ value: "hijri", label: filterLabels.hijri },
									{ value: "gregorian", label: filterLabels.gregorian },
								]}
							/>
						</label>
						<label className='filter-control months-control'>
							<span>
								<FilterOutlined /> {filterLabels.months}
							</span>
							<Select
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
								value={dateBy}
								onChange={updateDateBy}
								options={dateByOptions}
							/>
						</label>
						<label className='filter-control status-control'>
							<span>{filterLabels.status}</span>
							<Select
								mode='multiple'
								allowClear
								maxTagCount='responsive'
								value={filters.status}
								onChange={(value) => updateFilter("status", value)}
								options={statusOptions.filter((option) => option.value)}
								placeholder={filterLabels.operationalReservations}
							/>
						</label>
						<label className='filter-control search-control'>
							<span>{labels.search}</span>
							<Input
								allowClear
								value={filters.search}
								onChange={(event) => updateFilter("search", event.target.value)}
								placeholder={filterLabels.searchPlaceholder}
							/>
						</label>
						<div className='filter-control switch-control'>
							<span>{filterLabels.includeCancelled}</span>
							<Switch
								checked={filters.includeCancelled}
								onChange={(checked) => updateFilter("includeCancelled", checked)}
							/>
						</div>
					</div>
					<div className='filter-actions'>
						<button
							type='button'
							onClick={() =>
								getOverallSummary(userId, token, params).then((data) =>
									setSummary(data && !data.error ? data : null)
								)
							}
						>
							{labels.refresh}
						</button>
						<button type='button' className='secondary' onClick={resetFilters}>
							{labels.reset}
						</button>
					</div>
				</ExecutiveFilterPanel>
			)}

			{activeTab === "overview" && (
				<>
					<OverallCards>
				<OverallCard>
					<strong>{loading ? "..." : Number(stats.totalHotels || 0)}</strong>
					<span>{labels.hotels}</span>
				</OverallCard>
				<OverallCard>
					<strong>{loading ? "..." : Number(stats.totalRooms || 0)}</strong>
					<span>{labels.totalRooms}</span>
				</OverallCard>
				<OverallCard>
					<strong>{loading ? "..." : Number(stats.availableRooms || 0)}</strong>
					<span>{labels.availableRooms}</span>
				</OverallCard>
				<OverallCard>
					<strong>{loading ? "..." : Number(stats.totalReservations || 0)}</strong>
					<span>{labels.reservations}</span>
				</OverallCard>
				<OverallCard>
					<strong>{loading ? "..." : formatMoney(stats.totalAmount)}</strong>
					<span>{labels.totalAmount}</span>
				</OverallCard>
				<OverallCard>
					<strong>{loading ? "..." : Number(stats.pendingReservations || 0)}</strong>
					<span>{labels.pending}</span>
				</OverallCard>
			</OverallCards>

			<OverallTableWrap>
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>{labels.hotel}</th>
							<th>{labels.rooms}</th>
							<th>{labels.available}</th>
							<th>{labels.occupied}</th>
							<th>{labels.reservations}</th>
							<th>{labels.total}</th>
							<th>{labels.pending}</th>
							<th>{labels.housekeeping}</th>
							<th>{labels.settings}</th>
							<th>{labels.singleHotel}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='11'>{labels.loading}</td>
							</tr>
						) : hotels.length ? (
							hotels.map((hotel, index) => (
								<tr key={hotel._id}>
									<td>{index + 1}</td>
									<td>
										<button
											type='button'
											className='link-btn'
											onClick={() => openHotel(hotel)}
										>
											{titleCase(hotel.hotelName)}
										</button>
									</td>
									<td>{hotel.totalRooms}</td>
									<td>{hotel.availableRooms}</td>
									<td>{hotel.occupiedRooms}</td>
									<td>{hotel.totalReservations}</td>
									<td>
										{formatMoney(hotel.totalAmount)} {labels.sar}
									</td>
									<td>{hotel.pendingReservations}</td>
									<td>{hotel.openHousekeepingTasks}</td>
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
									<td>
										<button
											type='button'
											className='link-btn'
											onClick={() => openHotel(hotel, "dashboard")}
										>
											{labels.openDashboard}
										</button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan='11'>{labels.noHotelsFound}</td>
							</tr>
						)}
					</tbody>
				</table>
			</OverallTableWrap>
				</>
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

const ExecutiveFilterPanel = styled.section`
	display: grid;
	gap: 12px;
	padding: 14px;
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
		gap: 12px;
		color: #102033;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.filter-title strong {
		font-size: 0.98rem;
		font-weight: 950;
	}

	.filter-title span {
		color: #53627a;
		font-size: 0.8rem;
		font-weight: 850;
	}

	.filter-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(170px, 1fr));
		gap: 10px;
		align-items: end;
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
		min-height: 38px;
	}

	.wide-control,
	.hotel-control,
	.search-control {
		grid-column: span 2;
	}

	.switch-control {
		align-self: stretch;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-height: 64px;
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

	@media (max-width: 1180px) {
		.filter-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		padding: 10px;

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

		.filter-actions button {
			flex: 1 1 130px;
			min-width: 0;
		}
	}
`;
