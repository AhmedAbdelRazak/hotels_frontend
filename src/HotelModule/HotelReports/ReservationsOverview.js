import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
	message,
	Spin,
	Collapse,
	Card,
	Modal,
	Radio,
	Select,
	Button,
} from "antd";
import Chart from "react-apexcharts";
import dayjs from "dayjs"; // for date filtering

// Import your components/api

import {
	getReservationsByDay,
	getCheckinsByDay,
	getCheckoutsByDay,
	getReservationsByBookingStatus,
	getTopHotelsByReservations,
	getSpecificListOfReservations,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import EnhancedContentTable from "./EnhancedContentTable";

const { Panel } = Collapse;
const { Option } = Select;

/** 1) Parse "YYYY-MM-DD" */
function parseGroupKeyDate(groupKey) {
	return dayjs(groupKey, "YYYY-MM-DD", true);
}

const normalizeArray = (value) => {
	if (Array.isArray(value)) return value;
	if (value && Array.isArray(value.data)) return value.data;
	return [];
};

/** 2) Build unique year-month & year-quarter sets from the data */
function buildMonthQuarterOptions(dataArray) {
	const src = normalizeArray(dataArray);
	const monthSet = new Set();
	const quarterSet = new Set();

	src.forEach((item) => {
		const d = parseGroupKeyDate(item.groupKey);
		if (d.isValid()) {
			const year = d.year();
			const month = d.month() + 1;
			monthSet.add(`${year}-${String(month).padStart(2, "0")}`);

			const q = Math.ceil(month / 3);
			quarterSet.add(`${year}-Q${q}`);
		}
	});

	return {
		monthArray: [...monthSet].sort(),
		quarterArray: [...quarterSet].sort(),
	};
}

/** 3) Return numeric value from an item, given measure */
function getMeasureValue(item, measure) {
	if (!item) return 0;
	switch (measure) {
		case "total":
			return item.total_amount ?? 0;
		case "commission":
			return item.commission ?? 0;
		default: // "count"
			return item.reservationsCount ?? 0;
	}
}

/** 4) Sum over an array */
function sumOfMeasure(dataArray, measure) {
	const src = normalizeArray(dataArray);
	return src.reduce(
		(acc, item) => acc + getMeasureValue(item, measure),
		0
	);
}

/** 5) Filter data by "all" | "month" | "quarter" */
function filterByRangeAndSelection(
	dataArray,
	range,
	monthSelected,
	quarterSelected
) {
	const src = normalizeArray(dataArray);
	if (range === "all") return src;

	if (range === "month" && monthSelected) {
		const [y, m] = monthSelected.split("-");
		const year = Number(y);
		const month = Number(m);
		return src.filter((item) => {
			const d = parseGroupKeyDate(item.groupKey);
			return d.isValid() && d.year() === year && d.month() + 1 === month;
		});
	}

	if (range === "quarter" && quarterSelected) {
		const [y, qStr] = quarterSelected.split("-Q");
		const year = Number(y);
		const qNum = Number(qStr);
		return src.filter((item) => {
			const d = parseGroupKeyDate(item.groupKey);
			if (!d.isValid() || d.year() !== year) return false;
			const mon = d.month() + 1;
			return Math.ceil(mon / 3) === qNum;
		});
	}

	return src;
}

/** 6) Format numeric values for display (table/cards) */
function formatForDisplay(value, measure) {
	// If measure = "count", show integer
	if (measure === "count") {
		const intVal = Math.round(value);
		return intVal.toLocaleString("en-US");
	}
	// Else show 2 decimals
	return value.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

/**
 * 7) Create a chart y-axis formatter.
 * If measure = count => round to int, else => 2 decimals.
 */
function createYAxisFormatter(measure) {
	return (val) => {
		if (measure === "count") {
			const intVal = Math.round(val);
			return intVal.toLocaleString("en-US");
		}
		return val.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	};
}

/**
 * 8) Convert day-based array (groupKey = YYYY-MM-DD) into month-based array (groupKey = YYYY-MM).
 *    Used if the user selects "Month Over Month" chart mode.
 */
function transformToMonthly(dataArray) {
	// We'll aggregate multiple days in the same YYYY-MM bucket
	const monthlyMap = {};
	const src = normalizeArray(dataArray);
	for (const item of src) {
		const d = parseGroupKeyDate(item.groupKey);
		if (!d.isValid()) continue;
		const monthKey = d.format("YYYY-MM");

		if (!monthlyMap[monthKey]) {
			monthlyMap[monthKey] = {
				groupKey: monthKey,
				reservationsCount: 0,
				total_amount: 0,
				commission: 0,
			};
		}
		monthlyMap[monthKey].reservationsCount += item.reservationsCount ?? 0;
		monthlyMap[monthKey].total_amount += item.total_amount ?? 0;
		monthlyMap[monthKey].commission += item.commission ?? 0;
	}
	// Convert to array, sort by groupKey (YYYY-MM ascending)
	return Object.values(monthlyMap).sort((a, b) =>
		a.groupKey.localeCompare(b.groupKey)
	);
}

// ===== Helper for coloring statuses =====
function randomColor() {
	return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

/**
 * Normalizes the status string so whether it's "Checked_out",
 * "checked_out", or "Checked Out", it will match the correct color.
 */
function getStatusColor(status = "") {
	// Normalize to lowercase and replace any spaces/hyphens with underscores
	const normalizedStatus = status
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, "_");

	const colorMapping = {
		checked_out: "#66bb6a",
		cancelled: "#f44336",
		confirmed: "#cfcfcf",
		inhouse: "#9c27b0",
		no_show: "#757575",
	};

	return colorMapping[normalizedStatus] || randomColor();
}

const ReservationsOverview = ({ chosenLanguage }) => {
	const { user, token } = isAuthenticated();
	const [loading, setLoading] = useState(false);
	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};
	const isArabic = chosenLanguage === "Arabic";
	const labels = isArabic
		? {
				loading: "\u062c\u0627\u0631\u064a\u0020\u062a\u062d\u0645\u064a\u0644\u0020\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631...",
				includeCancelled:
					"\u062a\u0636\u0645\u064a\u0646\u0020\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a\u0020\u0627\u0644\u0645\u0644\u063a\u0627\u0629",
				excludeCancelled:
					"\u0627\u0633\u062a\u0628\u0639\u0627\u062f\u0020\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a\u0020\u0627\u0644\u0645\u0644\u063a\u0627\u0629",
				reservationsByDay:
					"\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a\u0020\u062d\u0633\u0628\u0020\u0627\u0644\u064a\u0648\u0645",
				monthOverMonth:
					"\u0645\u0642\u0627\u0631\u0646\u0629\u0020\u0634\u0647\u0631\u064a\u0629",
				dailyView: "\u0639\u0631\u0636\u0020\u064a\u0648\u0645\u064a",
				count: "\u0627\u0644\u0639\u062f\u062f",
				totalAmount: "\u0625\u062c\u0645\u0627\u0644\u064a\u0020\u0627\u0644\u0645\u0628\u0644\u063a",
				total: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
				all: "\u0627\u0644\u0643\u0644",
				month: "\u0627\u0644\u0634\u0647\u0631",
				quarter: "\u0627\u0644\u0631\u0628\u0639",
				totalReservations:
					"\u0625\u062c\u0645\u0627\u0644\u064a\u0020\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
				commission: "\u0627\u0644\u0639\u0645\u0648\u0644\u0629",
				noData: "\u0644\u0627\u0020\u062a\u0648\u062c\u062f\u0020\u0628\u064a\u0627\u0646\u0627\u062a",
				checkinsCheckouts:
					"\u062a\u0633\u062c\u064a\u0644\u0020\u0627\u0644\u0648\u0635\u0648\u0644\u0020\u0648\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
				checkinsByDay:
					"\u062a\u0633\u062c\u064a\u0644\u0627\u062a\u0020\u0627\u0644\u0648\u0635\u0648\u0644\u0020\u062d\u0633\u0628\u0020\u0627\u0644\u064a\u0648\u0645",
				checkoutsByDay:
					"\u062a\u0633\u062c\u064a\u0644\u0627\u062a\u0020\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629\u0020\u062d\u0633\u0628\u0020\u0627\u0644\u064a\u0648\u0645",
				totalCheckins:
					"\u0625\u062c\u0645\u0627\u0644\u064a\u0020\u0627\u0644\u0648\u0635\u0648\u0644",
				totalCheckouts:
					"\u0625\u062c\u0645\u0627\u0644\u064a\u0020\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
				bookingStatusTopHotels:
					"\u062d\u0627\u0644\u0629\u0020\u0627\u0644\u062d\u062c\u0632\u0020\u0648\u0623\u0639\u0644\u0649\u0020\u0627\u0644\u0641\u0646\u0627\u062f\u0642",
				reservationsByStatus:
					"\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a\u0020\u062d\u0633\u0628\u0020\u0627\u0644\u062d\u0627\u0644\u0629",
				topHotelsByReservations:
					"\u0623\u0639\u0644\u0649\u0020\u0627\u0644\u0641\u0646\u0627\u062f\u0642\u0020\u062d\u0633\u0628\u0020\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
				reservationsCount:
					"\u0639\u062f\u062f\u0020\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
				checkinsCount:
					"\u0639\u062f\u062f\u0020\u062a\u0633\u062c\u064a\u0644\u0627\u062a\u0020\u0627\u0644\u0648\u0635\u0648\u0644",
				checkoutsCount:
					"\u0639\u062f\u062f\u0020\u062a\u0633\u062c\u064a\u0644\u0627\u062a\u0020\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
				detailedReservationsList:
					"\u0642\u0627\u0626\u0645\u0629\u0020\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a\u0020\u0627\u0644\u062a\u0641\u0635\u064a\u0644\u064a\u0629",
				loadingShort: "\u062c\u0627\u0631\u064a\u0020\u0627\u0644\u062a\u062d\u0645\u064a\u0644...",
				noReservationsFound:
					"\u0644\u0627\u0020\u062a\u0648\u062c\u062f\u0020\u062d\u062c\u0648\u0632\u0627\u062a",
				unknown: "\u063a\u064a\u0631\u0020\u0645\u0639\u0631\u0648\u0641",
				clickedHotel:
					"\u062a\u0645\u0020\u0627\u0644\u0636\u063a\u0637\u0020\u0639\u0644\u0649\u0020\u0627\u0644\u0641\u0646\u062f\u0642: ",
		  }
		: {
				loading: "Loading Reports...",
				includeCancelled: "Include Cancelled Reservations",
				excludeCancelled: "Exclude Cancelled Reservations",
				reservationsByDay: "Reservations By Day",
				monthOverMonth: "Month Over Month",
				dailyView: "Daily View",
				count: "Count",
				totalAmount: "Total Amount",
				total: "Total",
				all: "All",
				month: "Month",
				quarter: "Quarter",
				totalReservations: "Total Reservations",
				commission: "Commission",
				noData: "No data found",
				checkinsCheckouts: "Check-ins & Check-outs By Day",
				checkinsByDay: "Check-ins By Day",
				checkoutsByDay: "Check-outs By Day",
				totalCheckins: "Total Check-ins",
				totalCheckouts: "Total Check-outs",
				bookingStatusTopHotels: "Booking Status & Top 5 Hotels",
				reservationsByStatus: "Reservations By Status",
				topHotelsByReservations: "Top 5 Hotels By Reservations",
				reservationsCount: "Reservations Count",
				checkinsCount: "Check-ins Count",
				checkoutsCount: "Check-outs Count",
				detailedReservationsList: "Detailed Reservations List",
				loadingShort: "Loading...",
				noReservationsFound: "No reservations found",
				unknown: "Unknown",
				clickedHotel: "Clicked on hotel: ",
		  };

	// Raw data
	const [reservationsByDay, setReservationsByDay] = useState([]);
	const [checkinsByDay, setCheckinsByDay] = useState([]);
	const [checkoutsByDay, setCheckoutsByDay] = useState([]);
	const [reservationsByBookingStatus, setReservationsByBookingStatus] =
		useState([]);
	const [topHotels, setTopHotels] = useState([]);

	// Month/Quarter Options
	const [dayMonthOptions, setDayMonthOptions] = useState([]);
	const [dayQuarterOptions, setDayQuarterOptions] = useState([]);

	const [checkinMonthOptions, setCheckinMonthOptions] = useState([]);
	const [checkinQuarterOptions, setCheckinQuarterOptions] = useState([]);

	const [checkoutMonthOptions, setCheckoutMonthOptions] = useState([]);
	const [checkoutQuarterOptions, setCheckoutQuarterOptions] = useState([]);

	const [statusMonthOptions, setStatusMonthOptions] = useState([]);
	const [statusQuarterOptions, setStatusQuarterOptions] = useState([]);

	// "Top 5 Hotels" chart
	const [topMonthOptions, setTopMonthOptions] = useState([]);
	const [topQuarterOptions, setTopQuarterOptions] = useState([]);

	// Measures & Ranges
	const [measureDay, setMeasureDay] = useState("count");
	const [rangeDay, setRangeDay] = useState("month");
	const [dayMonthSelected, setDayMonthSelected] = useState("");
	const [dayQuarterSelected, setDayQuarterSelected] = useState("");

	const [measureCheckin, setMeasureCheckin] = useState("count");
	const [rangeCheckin, setRangeCheckin] = useState("month");
	const [checkinMonthSelected, setCheckinMonthSelected] = useState("");
	const [checkinQuarterSelected, setCheckinQuarterSelected] = useState("");

	const [measureCheckout, setMeasureCheckout] = useState("count");
	const [rangeCheckout, setRangeCheckout] = useState("month");
	const [checkoutMonthSelected, setCheckoutMonthSelected] = useState("");
	const [checkoutQuarterSelected, setCheckoutQuarterSelected] = useState("");

	const [measureBookingStatus, setMeasureBookingStatus] = useState("count");
	const [rangeBookingStatus, setRangeBookingStatus] = useState("all");
	const [statusMonthSelected, setStatusMonthSelected] = useState("");
	const [statusQuarterSelected, setStatusQuarterSelected] = useState("");

	// "Top 5 Hotels" chart
	const [rangeTop, setRangeTop] = useState("all");
	const [topMonthSelected, setTopMonthSelected] = useState("");
	const [topQuarterSelected, setTopQuarterSelected] = useState("");

	// Modal
	const [modalVisible, setModalVisible] = useState(false);
	const [modalLoading, setModalLoading] = useState(false);
	const [modalData, setModalData] = useState({
		data: [],
		totalDocuments: 0,
		scorecards: null,
	});

	// Additional state for EnhancedContentTable pagination
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(50);

	// Chart Mode toggles: "daily" vs "monthly" for each chart
	const [dayChartMode, setDayChartMode] = useState("daily"); // Reservations By Day
	const [checkinChartMode, setCheckinChartMode] = useState("daily"); // Check-ins
	const [checkoutChartMode, setCheckoutChartMode] = useState("daily"); // Check-outs

	// NEW STATE: Toggle exclude cancelled or not
	const [excludeCancelled, setExcludeCancelled] = useState(true);

	// Search
	const [searchTerm, setSearchTerm] = useState("");

	// Whenever selectedHotels *or excludeCancelled* changes, re‐fetch the main data
	useEffect(() => {
		loadAllReportData();
		// eslint-disable-next-line
	}, [selectedHotel.hotelName, excludeCancelled]);

	function loadAllReportData() {
		setLoading(true);

		// Pass the excludeCancelled toggle in as an extra param object
		const extraParams = { excludeCancelled };

		Promise.all([
			getReservationsByDay(
				user._id,
				token,
				[selectedHotel.hotelName],
				extraParams
			),
			getCheckinsByDay(user._id, token, [selectedHotel.hotelName], extraParams),
			getCheckoutsByDay(
				user._id,
				token,
				[selectedHotel.hotelName],
				extraParams
			),
			getReservationsByBookingStatus(
				user._id,
				token,
				[selectedHotel.hotelName],
				extraParams
			),

			getTopHotelsByReservations(
				user._id,
				token,
				100,
				[selectedHotel.hotelName],
				extraParams
			),
		])
			.then((results) => {
				const [rByDay, cByDay, coByDay, rByStatus, topHotelsData] = results;
				const safeReservationsByDay = normalizeArray(rByDay);
				const safeCheckinsByDay = normalizeArray(cByDay);
				const safeCheckoutsByDay = normalizeArray(coByDay);
				const safeByStatus = normalizeArray(rByStatus);
				const safeTopHotels = normalizeArray(topHotelsData);

				setReservationsByDay(safeReservationsByDay);
				setCheckinsByDay(safeCheckinsByDay);
				setCheckoutsByDay(safeCheckoutsByDay);
				setReservationsByBookingStatus(safeByStatus);
				setTopHotels(safeTopHotels);

				// Build unique month/quarter sets
				const { monthArray: dM, quarterArray: dQ } = buildMonthQuarterOptions(
					safeReservationsByDay
				);
				setDayMonthOptions(dM);
				setDayQuarterOptions(dQ);

				const { monthArray: cM, quarterArray: cQ } = buildMonthQuarterOptions(
					safeCheckinsByDay
				);
				setCheckinMonthOptions(cM);
				setCheckinQuarterOptions(cQ);

				const { monthArray: coM, quarterArray: coQ } = buildMonthQuarterOptions(
					safeCheckoutsByDay
				);
				setCheckoutMonthOptions(coM);
				setCheckoutQuarterOptions(coQ);

				const { monthArray: sM, quarterArray: sQ } = buildMonthQuarterOptions(
					safeByStatus
				);
				setStatusMonthOptions(sM);
				setStatusQuarterOptions(sQ);

				const { monthArray: tM, quarterArray: tQ } = buildMonthQuarterOptions(
					safeTopHotels
				);
				setTopMonthOptions(tM);
				setTopQuarterOptions(tQ);

				// Default to the current month if available
				const currentMonth = dayjs().format("YYYY-MM");

				// Reservations By Day
				if (dM.includes(currentMonth)) {
					setDayMonthSelected(currentMonth);
					setRangeDay("month");
				} else if (dM.length > 0 && !dayMonthSelected) {
					setDayMonthSelected(dM[dM.length - 1]);
					setRangeDay("month");
				}

				// Check-ins
				if (cM.includes(currentMonth)) {
					setCheckinMonthSelected(currentMonth);
					setRangeCheckin("month");
				} else if (cM.length > 0 && !checkinMonthSelected) {
					setCheckinMonthSelected(cM[cM.length - 1]);
					setRangeCheckin("month");
				}

				// Check-outs
				if (coM.includes(currentMonth)) {
					setCheckoutMonthSelected(currentMonth);
					setRangeCheckout("month");
				} else if (coM.length > 0 && !checkoutMonthSelected) {
					setCheckoutMonthSelected(coM[coM.length - 1]);
					setRangeCheckout("month");
				}
			})
			.catch((err) => {
				console.error("Error fetching admin report data", err);
				message.error("Failed to load admin report data");
			})
			.finally(() => setLoading(false));
	}

	/**
	 * Helper to fetch reservations from the backend with dynamic query params,
	 * then show them in the Modal.
	 */
	const fetchAndShowReservations = async (queryParamsObj) => {
		try {
			setModalLoading(true);
			setModalVisible(true); // open the modal

			const data = await getSpecificListOfReservations(user._id, token, {
				...queryParamsObj,
				// also pass selected hotels if needed for these specific lists
				hotels: [selectedHotel.hotelName],
				// also respect the excludeCancelled toggle globally
				excludeCancelled,
			});
			const list = Array.isArray(data)
				? data
				: Array.isArray(data?.data)
				  ? data.data
				  : [];
			setModalData({
				data: list,
				totalDocuments: Number(data?.totalDocuments || list.length || 0),
				scorecards: data?.scorecards || null,
			});
			setCurrentPage(1);
		} catch (err) {
			console.error("Failed to fetch specific reservations", err);
			message.error("Failed to fetch reservations list");
		} finally {
			setModalLoading(false);
		}
	};

	// A) Reservations By Day
	const filteredDay = filterByRangeAndSelection(
		reservationsByDay,
		rangeDay,
		dayMonthSelected,
		dayQuarterSelected
	).sort((a, b) => a.groupKey.localeCompare(b.groupKey));

	const dayDataForChart =
		dayChartMode === "monthly" ? transformToMonthly(filteredDay) : filteredDay;

	const dayCategories = dayDataForChart.map((item) => item.groupKey);
	const daySeriesData = dayDataForChart.map((item) =>
		getMeasureValue(item, measureDay)
	);

	const reservationsByDayChartConfig = {
		options: {
			colors: ["#0d6efd"],
			chart: {
				id: "reservations-by-day-chart",
				height: 300,
				toolbar: { show: true },
				foreColor: "#334155",
				events: {
					dataPointSelection: (event, chartContext, config) => {
						const idx = config.dataPointIndex;
						if (idx >= 0) {
							const clickedDate = dayCategories[idx]; // "YYYY-MM-DD" or "YYYY-MM"
							if (dayChartMode === "monthly") {
								const dateObj = dayjs(clickedDate + "-01", "YYYY-MM-DD");
								const monthName = dateObj.format("MMMM").toLowerCase(); // e.g. "december"
								const year = dateObj.format("YYYY"); // e.g. "2024"
								const monthString = `${monthName}-${year}`; // "december-2024"
								fetchAndShowReservations({
									[`createdAtMonth_${monthString}`]: 1,
								});
							} else {
								// daily mode => "YYYY-MM-DD"
								fetchAndShowReservations({
									[`createdAtDate_${clickedDate}`]: 1,
								});
							}
						}
					},
				},
			},
			dataLabels: {
				enabled: true,
				formatter: (val) => formatForDisplay(val, measureDay),
				style: { fontSize: "11px", fontWeight: 800, colors: ["#ffffff"] },
				background: { enabled: false },
			},
			xaxis: {
				categories: dayCategories,
				labels: {
					rotate: -45,
					rotateAlways: dayCategories.length > 8,
					hideOverlappingLabels: true,
					trim: false,
					style: { fontSize: "11px", fontWeight: 700, colors: ["#475569"] },
				},
				axisBorder: { color: "#cbd5e1" },
				axisTicks: { color: "#cbd5e1" },
			},
			yaxis: {
				labels: {
					formatter: createYAxisFormatter(measureDay),
					style: { fontSize: "11px", fontWeight: 700, colors: ["#475569"] },
				},
				min: 0,
			},
			grid: { borderColor: "#e5e7eb", strokeDashArray: 3 },
			plotOptions: {
				bar: { borderRadius: 5, columnWidth: "48%", dataLabels: { position: "center" } },
			},
			tooltip: {
				y: { formatter: (val) => formatForDisplay(val, measureDay) },
			},
			title: {
				text: labels.reservationsByDay,
				align: "center",
				style: { fontSize: "16px", fontWeight: 800, color: "#18212f" },
			},
			responsive: [
				{
					breakpoint: 768,
					options: {
						chart: { height: 320, toolbar: { show: false } },
						plotOptions: { bar: { columnWidth: "58%" } },
						xaxis: {
							labels: {
								rotate: -55,
								style: { fontSize: "10px", fontWeight: 700 },
							},
						},
						title: { style: { fontSize: "14px", fontWeight: 800 } },
					},
				},
			],
		},
		series: [
			{
				name:
					measureDay === "count"
						? labels.reservationsCount
						: measureDay === "total"
						  ? labels.totalAmount
						  : labels.commission,
				data: daySeriesData,
			},
		],
	};

	const handleDayMonthOverMonth = () => {
		if (dayChartMode === "daily") {
			setDayChartMode("monthly");
			setRangeDay("all");
			setDayMonthSelected("");
			setDayQuarterSelected("");
		} else {
			setDayChartMode("daily");
		}
	};

	// B) Check-ins & Check-outs
	// --- Check-ins ---
	const filteredCheckins = filterByRangeAndSelection(
		checkinsByDay,
		rangeCheckin,
		checkinMonthSelected,
		checkinQuarterSelected
	).sort((a, b) => a.groupKey.localeCompare(b.groupKey));

	const checkinDataForChart =
		checkinChartMode === "monthly"
			? transformToMonthly(filteredCheckins)
			: filteredCheckins;
	const checkinsCategories = checkinDataForChart.map((item) => item.groupKey);
	const checkinsSeriesData = checkinDataForChart.map((item) =>
		getMeasureValue(item, measureCheckin)
	);

	const checkinsByDayChartConfig = {
		options: {
			colors: ["#05a857"],
			chart: {
				id: "checkins-by-day-chart",
				height: 300,
				toolbar: { show: true },
				foreColor: "#334155",
				events: {
					dataPointSelection: (event, chartContext, config) => {
						const idx = config.dataPointIndex;
						if (idx >= 0) {
							const clickedDate = checkinsCategories[idx];
							if (checkinChartMode === "monthly") {
								const dateObj = dayjs(clickedDate + "-01", "YYYY-MM-DD");
								const monthName = dateObj.format("MMMM").toLowerCase();
								const year = dateObj.format("YYYY");
								const monthString = `${monthName}-${year}`;
								fetchAndShowReservations({
									[`checkinMonth_${monthString}`]: 1,
								});
							} else {
								fetchAndShowReservations({
									[`checkinDate_${clickedDate}`]: 1,
								});
							}
						}
					},
				},
			},
			dataLabels: {
				enabled: true,
				formatter: (val) => formatForDisplay(val, measureCheckin),
				style: { fontSize: "11px", fontWeight: 800, colors: ["#ffffff"] },
				background: { enabled: false },
			},
			xaxis: {
				categories: checkinsCategories,
				labels: {
					rotate: -45,
					rotateAlways: checkinsCategories.length > 8,
					hideOverlappingLabels: true,
					trim: false,
					style: { fontSize: "11px", fontWeight: 700, colors: ["#475569"] },
				},
				axisBorder: { color: "#cbd5e1" },
				axisTicks: { color: "#cbd5e1" },
			},
			yaxis: {
				labels: {
					formatter: createYAxisFormatter(measureCheckin),
					style: { fontSize: "11px", fontWeight: 700, colors: ["#475569"] },
				},
				min: 0,
			},
			grid: { borderColor: "#e5e7eb", strokeDashArray: 3 },
			plotOptions: {
				bar: { borderRadius: 5, columnWidth: "48%", dataLabels: { position: "center" } },
			},
			tooltip: {
				y: { formatter: (val) => formatForDisplay(val, measureCheckin) },
			},
			title: {
				text: labels.checkinsByDay,
				align: "center",
				style: { fontSize: "16px", fontWeight: 800, color: "#18212f" },
			},
			responsive: [
				{
					breakpoint: 768,
					options: {
						chart: { height: 320, toolbar: { show: false } },
						plotOptions: { bar: { columnWidth: "58%" } },
						xaxis: {
							labels: {
								rotate: -55,
								style: { fontSize: "10px", fontWeight: 700 },
							},
						},
						title: { style: { fontSize: "14px", fontWeight: 800 } },
					},
				},
			],
		},
		series: [
			{
				name:
					measureCheckin === "count"
						? labels.checkinsCount
						: measureCheckin === "total"
						  ? labels.totalAmount
						  : labels.commission,
				data: checkinsSeriesData,
			},
		],
	};

	const handleCheckinMonthOverMonth = () => {
		if (checkinChartMode === "daily") {
			setCheckinChartMode("monthly");
			setRangeCheckin("all");
			setCheckinMonthSelected("");
			setCheckinQuarterSelected("");
		} else {
			setCheckinChartMode("daily");
		}
	};

	// --- Check-outs ---
	const filteredCheckouts = filterByRangeAndSelection(
		checkoutsByDay,
		rangeCheckout,
		checkoutMonthSelected,
		checkoutQuarterSelected
	).sort((a, b) => a.groupKey.localeCompare(b.groupKey));

	const checkoutDataForChart =
		checkoutChartMode === "monthly"
			? transformToMonthly(filteredCheckouts)
			: filteredCheckouts;
	const checkoutCategories = checkoutDataForChart.map((item) => item.groupKey);
	const checkoutSeriesData = checkoutDataForChart.map((item) =>
		getMeasureValue(item, measureCheckout)
	);

	const checkoutsByDayChartConfig = {
		options: {
			colors: ["#7c3aed"],
			chart: {
				id: "checkouts-by-day-chart",
				height: 300,
				toolbar: { show: true },
				foreColor: "#334155",
				events: {
					dataPointSelection: (event, chartContext, config) => {
						const idx = config.dataPointIndex;
						if (idx >= 0) {
							const clickedDate = checkoutCategories[idx];
							if (checkoutChartMode === "monthly") {
								const dateObj = dayjs(clickedDate + "-01", "YYYY-MM-DD");
								const monthName = dateObj.format("MMMM").toLowerCase();
								const year = dateObj.format("YYYY");
								const monthString = `${monthName}-${year}`;
								fetchAndShowReservations({
									[`checkoutMonth_${monthString}`]: 1,
								});
							} else {
								fetchAndShowReservations({
									[`checkoutDate_${clickedDate}`]: 1,
								});
							}
						}
					},
				},
			},
			dataLabels: {
				enabled: true,
				formatter: (val) => formatForDisplay(val, measureCheckout),
				style: { fontSize: "11px", fontWeight: 800, colors: ["#ffffff"] },
				background: { enabled: false },
			},
			xaxis: {
				categories: checkoutCategories,
				labels: {
					rotate: -45,
					rotateAlways: checkoutCategories.length > 8,
					hideOverlappingLabels: true,
					trim: false,
					style: { fontSize: "11px", fontWeight: 700, colors: ["#475569"] },
				},
				axisBorder: { color: "#cbd5e1" },
				axisTicks: { color: "#cbd5e1" },
			},
			yaxis: {
				labels: {
					formatter: createYAxisFormatter(measureCheckout),
					style: { fontSize: "11px", fontWeight: 700, colors: ["#475569"] },
				},
				min: 0,
			},
			grid: { borderColor: "#e5e7eb", strokeDashArray: 3 },
			plotOptions: {
				bar: { borderRadius: 5, columnWidth: "48%", dataLabels: { position: "center" } },
			},
			tooltip: {
				y: { formatter: (val) => formatForDisplay(val, measureCheckout) },
			},
			title: {
				text: labels.checkoutsByDay,
				align: "center",
				style: { fontSize: "16px", fontWeight: 800, color: "#18212f" },
			},
			responsive: [
				{
					breakpoint: 768,
					options: {
						chart: { height: 320, toolbar: { show: false } },
						plotOptions: { bar: { columnWidth: "58%" } },
						xaxis: {
							labels: {
								rotate: -55,
								style: { fontSize: "10px", fontWeight: 700 },
							},
						},
						title: { style: { fontSize: "14px", fontWeight: 800 } },
					},
				},
			],
		},
		series: [
			{
				name:
					measureCheckout === "count"
						? labels.checkoutsCount
						: measureCheckout === "total"
						  ? labels.totalAmount
						  : labels.commission,
				data: checkoutSeriesData,
			},
		],
	};

	const handleCheckoutMonthOverMonth = () => {
		if (checkoutChartMode === "daily") {
			setCheckoutChartMode("monthly");
			setRangeCheckout("all");
			setCheckoutMonthSelected("");
			setCheckoutQuarterSelected("");
		} else {
			setCheckoutChartMode("daily");
		}
	};

	// C) Booking Status (Pie) + Top 5 Hotels (Bar)
	const filteredStatus = filterByRangeAndSelection(
		reservationsByBookingStatus,
		rangeBookingStatus,
		statusMonthSelected,
		statusQuarterSelected
	);
	const bookingStatusLabels = filteredStatus.map(
		(item) => item.reservation_status || labels.unknown
	);
	const bookingStatusValues = filteredStatus.map((item) =>
		getMeasureValue(item, measureBookingStatus)
	);

	const bookingStatusColors = bookingStatusLabels.map((label) =>
		getStatusColor(label)
	);

	const bookingStatusChartConfig = {
		options: {
			chart: {
				id: "booking-status-chart",
				height: 300,
				foreColor: "#334155",
				events: {
					dataPointSelection: (event, chartContext, config) => {
						const idx = config.dataPointIndex;
						if (idx >= 0) {
							const clickedStatus = bookingStatusLabels[idx]; // e.g. "confirmed"
							fetchAndShowReservations({
								[`reservationstatus_${clickedStatus}`]: 1,
							});
						}
					},
				},
			},
			labels: bookingStatusLabels,
			colors: bookingStatusColors,
			legend: {
				position: "bottom",
				fontSize: "12px",
				fontWeight: 700,
				labels: { colors: ["#334155"] },
			},
			dataLabels: {
				style: { fontSize: "12px", fontWeight: 800 },
				dropShadow: { enabled: false },
			},
			title: {
				text: labels.reservationsByStatus,
				align: "center",
				style: { fontSize: "16px", fontWeight: 800, color: "#18212f" },
			},
			responsive: [
				{
					breakpoint: 768,
					options: {
						chart: { height: 310 },
						legend: { position: "bottom", fontSize: "11px" },
						title: { style: { fontSize: "14px", fontWeight: 800 } },
					},
				},
			],
		},
		series: bookingStatusValues,
	};

	// Top 5 Hotels
	const filteredTopAll = filterByRangeAndSelection(
		topHotels,
		rangeTop,
		topMonthSelected,
		topQuarterSelected
	);
	const sortedTopAll = [...filteredTopAll].sort(
		(a, b) => (b.reservationsCount ?? 0) - (a.reservationsCount ?? 0)
	);
	const top5 = sortedTopAll.slice(0, 5);

	const top5HotelNames = top5.map((item) => item.hotelName || labels.unknown);
	const top5Data = top5.map((item) => item.reservationsCount ?? 0);

	const topHotelsChartOptions = {
		colors: ["#0d6efd"],
		chart: {
			id: "top-5-hotels-chart",
			height: 300,
			toolbar: { show: true },
			foreColor: "#334155",
			events: {
				dataPointSelection: (event, chartContext, config) => {
					const idx = config.dataPointIndex;
					if (idx >= 0) {
						message.info(
							labels.clickedHotel + (top5[idx].hotelName || labels.unknown)
						);
					}
				},
			},
		},
		xaxis: {
			categories: top5HotelNames,
			labels: {
				style: { fontSize: "11px", fontWeight: 700, colors: ["#475569"] },
				formatter: (val) => Number(val || 0).toLocaleString("en-US"),
			},
		},
		yaxis: {
			labels: {
				minWidth: 110,
				maxWidth: 190,
				style: { fontSize: "11px", fontWeight: 700, colors: ["#475569"] },
			},
		},
		dataLabels: {
			enabled: true,
			formatter: (val) => Number(val || 0).toLocaleString("en-US"),
			style: { fontSize: "11px", fontWeight: 800, colors: ["#ffffff"] },
		},
		grid: { borderColor: "#e5e7eb", strokeDashArray: 3 },
		plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "55%" } },
		title: {
			text: labels.topHotelsByReservations,
			align: "center",
			style: { fontSize: "16px", fontWeight: 800, color: "#18212f" },
		},
		responsive: [
			{
				breakpoint: 768,
				options: {
					chart: { height: 310, toolbar: { show: false } },
					yaxis: { labels: { minWidth: 90, maxWidth: 130 } },
					title: { style: { fontSize: "14px", fontWeight: 800 } },
				},
			},
		],
	};

	const handleSearch = () => {
		setCurrentPage(1);
		// The useEffect with fetchReservations() will run automatically on next render
	};

	const modalRows = Array.isArray(modalData?.data) ? modalData.data : [];
	return (
		<ReservationsOverviewWrapper
			dir={isArabic ? "rtl" : "ltr"}
			$isArabic={isArabic}
		>
			{loading ? (
				<Spin tip={labels.loading} size='large' />
			) : (
				<>
					<div className='report-actions'>
						{/* NEW BUTTON: Exclude/Include Cancelled */}
						<Button
							className='cancel-toggle'
							onClick={() => setExcludeCancelled(!excludeCancelled)}
						>
							{excludeCancelled
								? labels.includeCancelled
								: labels.excludeCancelled}
						</Button>
					</div>

					<Collapse defaultActiveKey={["1", "2", "3"]} expandIconPosition='end'>
						{/* ==================== PANEL 1 ==================== */}
						<Panel header={labels.reservationsByDay} key='1'>
							<div className='panel-controls'>
								<Button
									onClick={handleDayMonthOverMonth}
									style={{ marginRight: 8 }}
								>
									{dayChartMode === "daily"
										? labels.monthOverMonth
										: labels.dailyView}
								</Button>

								<Radio.Group
									value={measureDay}
									onChange={(e) => setMeasureDay(e.target.value)}
									style={{ marginRight: 8 }}
								>
									<Radio.Button value='count'>{labels.count}</Radio.Button>
									<Radio.Button value='total'>
										{labels.totalAmount}
									</Radio.Button>
									{/* <Radio.Button value='commission'>Commission</Radio.Button> */}
								</Radio.Group>

								<Select
									value={rangeDay}
									onChange={(val) => setRangeDay(val)}
									style={{ width: 120, marginRight: 8 }}
									disabled={dayChartMode === "monthly"}
								>
									<Option value='all'>{labels.all}</Option>
									<Option value='month'>{labels.month}</Option>
									<Option value='quarter'>{labels.quarter}</Option>
								</Select>

								{rangeDay === "month" && (
									<Select
										style={{ width: 120 }}
										value={dayMonthSelected}
										onChange={(val) => setDayMonthSelected(val)}
										disabled={dayChartMode === "monthly"}
									>
										{dayMonthOptions.map((mKey) => (
											<Option key={mKey} value={mKey}>
												{mKey}
											</Option>
										))}
									</Select>
								)}
								{rangeDay === "quarter" && (
									<Select
										style={{ width: 120 }}
										value={dayQuarterSelected}
										onChange={(val) => setDayQuarterSelected(val)}
										disabled={dayChartMode === "monthly"}
									>
										{dayQuarterOptions.map((qKey) => (
											<Option key={qKey} value={qKey}>
												{qKey}
											</Option>
										))}
									</Select>
								)}
							</div>

							<Card size='small' className='sum-card'>
								<b>
									{measureDay === "count" ? labels.totalReservations : labels.total}{" "}
									{measureDay === "count"
										? ""
										: measureDay === "total"
										  ? labels.totalAmount
										  : labels.commission}
									:
								</b>{" "}
								{formatForDisplay(
									sumOfMeasure(dayDataForChart, measureDay),
									measureDay
								)}
							</Card>

							<div className='chart-container chart-scroll container'>
								{dayDataForChart.length === 0 ? (
									<p>{labels.noData}</p>
								) : (
									<Chart
										options={reservationsByDayChartConfig.options}
										series={reservationsByDayChartConfig.series}
										type='bar'
										height={300}
									/>
								)}
							</div>
						</Panel>

						{/* ==================== PANEL 2 ==================== */}
						<Panel header={labels.checkinsCheckouts} key='2'>
							<div className='checkins-checkouts-wrapper'>
								{/* Check-ins */}
								<div className='subchart'>
									<div className='panel-controls'>
										<Button
											onClick={handleCheckinMonthOverMonth}
											style={{ marginRight: 8 }}
										>
											{checkinChartMode === "daily"
												? labels.monthOverMonth
												: labels.dailyView}
										</Button>

										<Radio.Group
											value={measureCheckin}
											onChange={(e) => setMeasureCheckin(e.target.value)}
											style={{ marginRight: 8 }}
										>
											<Radio.Button value='count'>{labels.count}</Radio.Button>
											<Radio.Button value='total'>
												{labels.totalAmount}
											</Radio.Button>
											{/* <Radio.Button value='commission'>Commission</Radio.Button> */}
										</Radio.Group>

										<Select
											value={rangeCheckin}
											onChange={(val) => setRangeCheckin(val)}
											style={{ width: 120, marginRight: 8 }}
											disabled={checkinChartMode === "monthly"}
										>
											<Option value='all'>{labels.all}</Option>
											<Option value='month'>{labels.month}</Option>
											<Option value='quarter'>{labels.quarter}</Option>
										</Select>

										{rangeCheckin === "month" && (
											<Select
												style={{ width: 120 }}
												value={checkinMonthSelected}
												onChange={(val) => setCheckinMonthSelected(val)}
												disabled={checkinChartMode === "monthly"}
											>
												{checkinMonthOptions.map((mKey) => (
													<Option key={mKey} value={mKey}>
														{mKey}
													</Option>
												))}
											</Select>
										)}
										{rangeCheckin === "quarter" && (
											<Select
												style={{ width: 120 }}
												value={checkinQuarterSelected}
												onChange={(val) => setCheckinQuarterSelected(val)}
												disabled={checkinChartMode === "monthly"}
											>
												{checkinQuarterOptions.map((qKey) => (
													<Option key={qKey} value={qKey}>
														{qKey}
													</Option>
												))}
											</Select>
										)}
									</div>

									<Card size='small' className='sum-card-green'>
										<b>{labels.totalCheckins}:</b>{" "}
										{formatForDisplay(
											sumOfMeasure(checkinDataForChart, measureCheckin),
											measureCheckin
										)}
									</Card>

									<div className='chart-container chart-scroll container'>
										{checkinDataForChart.length === 0 ? (
											<p>{labels.noData}</p>
										) : (
											<Chart
												options={checkinsByDayChartConfig.options}
												series={checkinsByDayChartConfig.series}
												type='bar'
												height={300}
											/>
										)}
									</div>
								</div>

								{/* Check-outs */}
								<div className='subchart'>
									<div className='panel-controls'>
										<Button
											onClick={handleCheckoutMonthOverMonth}
											style={{ marginRight: 8 }}
										>
											{checkoutChartMode === "daily"
												? labels.monthOverMonth
												: labels.dailyView}
										</Button>

										<Radio.Group
											value={measureCheckout}
											onChange={(e) => setMeasureCheckout(e.target.value)}
											style={{ marginRight: 8 }}
										>
											<Radio.Button value='count'>{labels.count}</Radio.Button>
											<Radio.Button value='total'>
												{labels.totalAmount}
											</Radio.Button>
											{/* <Radio.Button value='commission'>Commission</Radio.Button> */}
										</Radio.Group>

										<Select
											value={rangeCheckout}
											onChange={(val) => setRangeCheckout(val)}
											style={{ width: 120, marginRight: 8 }}
											disabled={checkoutChartMode === "monthly"}
										>
											<Option value='all'>{labels.all}</Option>
											<Option value='month'>{labels.month}</Option>
											<Option value='quarter'>{labels.quarter}</Option>
										</Select>

										{rangeCheckout === "month" && (
											<Select
												style={{ width: 120 }}
												value={checkoutMonthSelected}
												onChange={(val) => setCheckoutMonthSelected(val)}
												disabled={checkoutChartMode === "monthly"}
											>
												{checkoutMonthOptions.map((mKey) => (
													<Option key={mKey} value={mKey}>
														{mKey}
													</Option>
												))}
											</Select>
										)}
										{rangeCheckout === "quarter" && (
											<Select
												style={{ width: 120 }}
												value={checkoutQuarterSelected}
												onChange={(val) => setCheckoutQuarterSelected(val)}
												disabled={checkoutChartMode === "monthly"}
											>
												{checkoutQuarterOptions.map((qKey) => (
													<Option key={qKey} value={qKey}>
														{qKey}
													</Option>
												))}
											</Select>
										)}
									</div>

									<Card size='small' className='sum-card-purple'>
										<b>{labels.totalCheckouts}:</b>{" "}
										{formatForDisplay(
											sumOfMeasure(checkoutDataForChart, measureCheckout),
											measureCheckout
										)}
									</Card>

									<div className='chart-container chart-scroll container'>
										{checkoutDataForChart.length === 0 ? (
											<p>{labels.noData}</p>
										) : (
											<Chart
												options={checkoutsByDayChartConfig.options}
												series={checkoutsByDayChartConfig.series}
												type='bar'
												height={300}
											/>
										)}
									</div>
								</div>
							</div>
						</Panel>

						{/* ==================== PANEL 3 ==================== */}
						<Panel header={labels.bookingStatusTopHotels} key='3'>
							<div className='status-hotel-wrapper'>
								{/* Booking Status (Pie) */}
								<div className='subchart'>
									<div className='panel-controls'>
										<Radio.Group
											value={measureBookingStatus}
											onChange={(e) => setMeasureBookingStatus(e.target.value)}
											style={{ marginRight: 8 }}
										>
											<Radio.Button value='count'>{labels.count}</Radio.Button>
											<Radio.Button value='total'>{labels.total}</Radio.Button>
											{/* <Radio.Button value='commission'>Commission</Radio.Button> */}
										</Radio.Group>
										<Select
											value={rangeBookingStatus}
											onChange={(val) => setRangeBookingStatus(val)}
											style={{ width: 120, marginRight: 8 }}
										>
											<Option value='all'>{labels.all}</Option>
											<Option value='month'>{labels.month}</Option>
											<Option value='quarter'>{labels.quarter}</Option>
										</Select>

										{rangeBookingStatus === "month" && (
											<Select
												style={{ width: 120 }}
												value={statusMonthSelected}
												onChange={(val) => setStatusMonthSelected(val)}
											>
												{statusMonthOptions.map((mKey) => (
													<Option key={mKey} value={mKey}>
														{mKey}
													</Option>
												))}
											</Select>
										)}
										{rangeBookingStatus === "quarter" && (
											<Select
												style={{ width: 120 }}
												value={statusQuarterSelected}
												onChange={(val) => setStatusQuarterSelected(val)}
											>
												{statusQuarterOptions.map((qKey) => (
													<Option key={qKey} value={qKey}>
														{qKey}
													</Option>
												))}
											</Select>
										)}
									</div>

									<Card size='small' className='sum-card-red'>
										<b>{labels.total}:</b>{" "}
										{formatForDisplay(
											sumOfMeasure(filteredStatus, measureBookingStatus),
											measureBookingStatus
										)}
									</Card>

									<div className='chart-container chart-pie container'>
										{filteredStatus.length === 0 ? (
											<p>{labels.noData}</p>
										) : (
											<Chart
												options={bookingStatusChartConfig.options}
												series={bookingStatusChartConfig.series}
												type='pie'
												height={300}
											/>
										)}
									</div>
								</div>

								{/* Top 5 Hotels (Bar) */}
								<div className='subchart'>
									<div className='panel-controls'>
										<Select
											value={rangeTop}
											onChange={(val) => setRangeTop(val)}
											style={{ width: 120, marginRight: 8 }}
										>
											<Option value='all'>{labels.all}</Option>
											<Option value='month'>{labels.month}</Option>
											<Option value='quarter'>{labels.quarter}</Option>
										</Select>

										{rangeTop === "month" && (
											<Select
												style={{ width: 120 }}
												value={topMonthSelected}
												onChange={(val) => setTopMonthSelected(val)}
											>
												{topMonthOptions.map((mKey) => (
													<Option key={mKey} value={mKey}>
														{mKey}
													</Option>
												))}
											</Select>
										)}
										{rangeTop === "quarter" && (
											<Select
												style={{ width: 120 }}
												value={topQuarterSelected}
												onChange={(val) => setTopQuarterSelected(val)}
											>
												{topQuarterOptions.map((qKey) => (
													<Option key={qKey} value={qKey}>
														{qKey}
													</Option>
												))}
											</Select>
										)}
									</div>

									<div className='chart-container chart-horizontal container'>
										{top5.length === 0 ? (
											<p>{labels.noData}</p>
										) : (
											<Chart
												options={topHotelsChartOptions}
												series={[
													{
														name: labels.reservationsCount,
														data: top5Data,
													},
												]}
												type='bar'
												height={300}
											/>
										)}
									</div>
								</div>
							</div>
						</Panel>
					</Collapse>
				</>
			)}

			{/* ===================== MODAL to display reservations list ===================== */}
			<Modal
				className='custom-reservations-modal'
				title={labels.detailedReservationsList}
				open={modalVisible}
				onCancel={() => setModalVisible(false)}
				footer={null}
				width='85%'
				style={{
					top: "3%",
					right: chosenLanguage === "Arabic" ? "7%" : "",
					left: chosenLanguage === "Arabic" ? "" : "7%",
				}}
			>
				{modalLoading ? (
					<Spin tip={labels.loadingShort} />
				) : modalRows.length === 0 ? (
					<p>{labels.noReservationsFound}</p>
				) : (
					<EnhancedContentTable
						// We pass only the subset after user-based filtering
						// plus totalDocuments from the server for pagination
						data={modalRows}
						totalDocuments={modalData.totalDocuments}
						currentPage={currentPage}
						pageSize={pageSize}
						setCurrentPage={setCurrentPage}
						setPageSize={setPageSize}
						// For searching:
						searchTerm={searchTerm}
						setSearchTerm={setSearchTerm}
						handleSearch={handleSearch}
						scorecardsObject={modalData.scorecards}
						// We pass fromPage for ScoreCards usage
						fromPage='reports'
						chosenLanguage={chosenLanguage}
					/>
				)}
			</Modal>
		</ReservationsOverviewWrapper>
	);
};

export default ReservationsOverview;

/* ------------------ STYLES ------------------ */
const ReservationsOverviewWrapper = styled.div`
	width: 100%;
	margin-top: 10px;
	min-width: 0;
	--report-blue: #0d6efd;
	--report-blue-deep: #0b5ed7;
	--report-green: #05a857;
	--report-purple: #7c3aed;
	--report-red: #ef4444;
	--report-border: #cfe5fb;
	--report-text: #18212f;
	--report-muted: #64748b;

	.report-actions {
		display: flex;
		justify-content: flex-start;
		margin-bottom: 12px;
	}

	.cancel-toggle {
		min-height: 38px;
		border: 1px solid var(--report-border);
		border-radius: 8px;
		color: var(--report-blue-deep);
		font-weight: 800;
		box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);
	}

	.ant-collapse {
		border: 1px solid var(--report-border);
		border-radius: 10px;
		background: #f7fbff;
		overflow: hidden;
	}
	.ant-collapse-header {
		align-items: center !important;
		background: #ffffff;
		color: var(--report-text) !important;
		font-weight: 800;
		font-size: 16px;
		line-height: 1.3;
	}
	.ant-collapse-content {
		border-top-color: #d9e9fb;
	}
	.ant-collapse-content-box {
		padding: 14px !important;
		background: #f7fbff;
	}
	.chart-container,
	.table-container {
		width: 100%;
		min-width: 0;
		border: 1px solid var(--report-border);
		border-radius: 8px;
		padding: 0.75rem;
		margin-bottom: 1rem;
		background-color: #fff;
		box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
		direction: ltr;
		overflow: hidden;
	}
	.chart-container p {
		margin: 0;
		color: var(--report-muted);
		font-weight: 700;
		text-align: center;
	}
	.panel-controls {
		margin-bottom: 1rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.panel-controls > * {
		margin: 0 !important;
	}
	.panel-controls .ant-btn,
	.panel-controls .ant-radio-button-wrapper,
	.panel-controls .ant-select-selector {
		border-radius: 8px;
		font-weight: 700;
	}
	.panel-controls .ant-radio-group {
		display: inline-flex;
		flex-wrap: nowrap;
	}
	.panel-controls .ant-select {
		min-width: 128px;
	}
	.checkins-checkouts-wrapper,
	.status-hotel-wrapper {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.subchart {
		flex: 1;
		min-width: min(100%, 360px);
		display: flex;
		flex-direction: column;
	}
	.sum-card,
	.sum-card-green,
	.sum-card-purple,
	.sum-card-red,
	.sum-card-pink {
		margin-bottom: 1rem;
		border: 1px solid var(--report-border);
		border-radius: 8px;
		color: var(--report-text);
		font-size: 0.95rem;
		box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
	}
	.sum-card {
		background-color: #fffbea;
		border-color: #f6de86;
	}
	.sum-card-green {
		background-color: #e8f8ef;
		border-color: #9ee5bb;
	}
	.sum-card-purple {
		background-color: #f2eafe;
		border-color: #cbb6f6;
	}
	.sum-card-red {
		background-color: #fff0f0;
		border-color: #fecaca;
	}
	.sum-card-pink {
		background-color: #f3e5f5;
		border-color: #e9c7ef;
	}
	.apexcharts-title-text {
		font-weight: 800;
	}
	.apexcharts-menu-icon svg {
		fill: #64748b;
	}

	.custom-reservations-modal .ant-modal {
		z-index: 9999 !important;
	}

	@media (max-width: 768px) {
		.ant-collapse-header {
			font-size: 0.9rem;
			padding: 11px 12px !important;
		}
		.ant-collapse-content-box {
			padding: 10px !important;
		}
		.checkins-checkouts-wrapper,
		.status-hotel-wrapper {
			flex-direction: column;
			gap: 10px;
		}
		.panel-controls {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
		}
		.panel-controls .ant-btn,
		.panel-controls .ant-select,
		.panel-controls .ant-radio-group {
			width: 100% !important;
			min-width: 0;
		}
		.panel-controls .ant-radio-group {
			grid-column: 1 / -1;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.panel-controls .ant-radio-button-wrapper {
			text-align: center;
			padding-inline: 6px;
			font-size: 0.78rem;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.chart-container {
			padding: 0.55rem;
		}
		.chart-scroll,
		.chart-horizontal {
			overflow-x: auto;
			overflow-y: hidden;
		}
		.chart-scroll .apexcharts-canvas {
			min-width: 560px;
		}
		.chart-horizontal .apexcharts-canvas {
			min-width: 500px;
		}
		.chart-pie .apexcharts-canvas {
			max-width: 100%;
			margin-inline: auto;
		}
		.sum-card,
		.sum-card-green,
		.sum-card-purple,
		.sum-card-red,
		.sum-card-pink {
			font-size: 0.83rem;
			margin-bottom: 10px;
		}
		.report-actions {
			margin-bottom: 10px;
		}
		.cancel-toggle {
			width: 100%;
			font-size: 0.82rem;
			white-space: normal;
			height: auto;
			min-height: 38px;
		}
	}

	@media (max-width: 420px) {
		.panel-controls {
			grid-template-columns: 1fr 1fr;
		}
		.panel-controls .ant-radio-button-wrapper {
			font-size: 0.74rem;
		}
		.chart-scroll .apexcharts-canvas {
			min-width: 520px;
		}
	}
`;
