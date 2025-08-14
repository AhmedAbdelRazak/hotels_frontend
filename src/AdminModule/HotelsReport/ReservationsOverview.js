import React, { useEffect, useState, useCallback } from "react";
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
import dayjs from "dayjs";

import EnhancedContentTable from "../AllReservation/EnhancedContentTable";
import {
	getReservationsByDay,
	getCheckinsByDay,
	getCheckoutsByDay,
	getReservationsByBookingStatus,
	getReservationsByHotelNames,
	getTopHotelsByReservations,
	getSpecificListOfReservations,
	gettingHotelDetailsForAdmin,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";

const { Panel } = Collapse;
const { Option } = Select;

/** 1) Parse "YYYY-MM-DD" */
function parseGroupKeyDate(groupKey) {
	return dayjs(groupKey, "YYYY-MM-DD", true);
}

/** 2) Build unique year-month & year-quarter sets from the data */
function buildMonthQuarterOptions(dataArray) {
	const src = Array.isArray(dataArray) ? dataArray : [];
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
		default:
			return item.reservationsCount ?? 0;
	}
}

/** 4) Sum over an array */
function sumOfMeasure(dataArray, measure) {
	const src = Array.isArray(dataArray) ? dataArray : [];
	return src.reduce((acc, item) => acc + getMeasureValue(item, measure), 0);
}

/** 5) Filter data by "all" | "month" | "quarter" */
function filterByRangeAndSelection(
	dataArray,
	range,
	monthSelected,
	quarterSelected
) {
	const src = Array.isArray(dataArray) ? dataArray : [];

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
	if (measure === "count") {
		const intVal = Math.round(value);
		return intVal.toLocaleString("en-US");
	}
	return value.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

/** 7) y-axis formatter */
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

/** 8) Convert daily array -> monthly buckets */
function transformToMonthly(dataArray) {
	const src = Array.isArray(dataArray) ? dataArray : [];
	const monthlyMap = {};
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
	return Object.values(monthlyMap).sort((a, b) =>
		a.groupKey.localeCompare(b.groupKey)
	);
}

function randomColor() {
	return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

function getStatusColor(status = "") {
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

/** Normalize possible API shapes to an array of hotels */
function extractHotels(payload) {
	if (Array.isArray(payload)) return payload;
	const candidateKeys = ["hotels", "data", "results", "items", "docs", "list"];
	if (payload && typeof payload === "object") {
		for (const k of candidateKeys) {
			if (Array.isArray(payload[k])) return payload[k];
		}
		const firstArray = Object.values(payload).find(Array.isArray);
		if (Array.isArray(firstArray)) return firstArray;
	}
	return [];
}

const ReservationsOverview = () => {
	const { user, token } = isAuthenticated() || {};
	const [loading, setLoading] = useState(false);

	// Raw data
	const [reservationsByDay, setReservationsByDay] = useState([]);
	const [checkinsByDay, setCheckinsByDay] = useState([]);
	const [checkoutsByDay, setCheckoutsByDay] = useState([]);
	const [reservationsByBookingStatus, setReservationsByBookingStatus] =
		useState([]);
	const [reservationsByHotelNames, setReservationsByHotelNames] = useState([]);
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

	const [hotelMonthOptions, setHotelMonthOptions] = useState([]);
	const [hotelQuarterOptions, setHotelQuarterOptions] = useState([]);

	const [topMonthOptions, setTopMonthOptions] = useState([]);
	const [topQuarterOptions, setTopQuarterOptions] = useState([]);

	// Measures & ranges
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

	const [measureByHotel, setMeasureByHotel] = useState("count");
	const [rangeByHotel, setRangeByHotel] = useState("all");
	const [hotelMonthSelected, setHotelMonthSelected] = useState("");
	const [hotelQuarterSelected, setHotelQuarterSelected] = useState("");

	const [rangeTop, setRangeTop] = useState("all");
	const [topMonthSelected, setTopMonthSelected] = useState("");
	const [topQuarterSelected, setTopQuarterSelected] = useState("");

	// Modal
	const [modalVisible, setModalVisible] = useState(false);
	const [modalLoading, setModalLoading] = useState(false);
	const [modalData, setModalData] = useState({
		data: [],
		totalDocuments: 0,
		scorecards: {},
	});

	// Pagination for modal table
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(50);

	// Chart modes
	const [dayChartMode, setDayChartMode] = useState("daily");
	const [checkinChartMode, setCheckinChartMode] = useState("daily");
	const [checkoutChartMode, setCheckoutChartMode] = useState("daily");

	// Hotels list (IMPORTANT: array)
	const [allHotelDetailsAdmin, setAllHotelDetailsAdmin] = useState([]);

	// Selection
	const [selectedHotels, setSelectedHotels] = useState(["all"]);

	// Global toggle to exclude cancelled
	const [excludeCancelled, setExcludeCancelled] = useState(true);

	// Search for modal table
	const [searchTerm, setSearchTerm] = useState("");

	// ---- Fetch hotels list (normalized) ----
	const adminAllHotelDetails = useCallback(() => {
		if (!user?._id || !token) return;
		gettingHotelDetailsForAdmin(user._id, token)
			.then((data) => {
				const hotels = extractHotels(data);
				const sorted = [...hotels].filter(Boolean).sort((a, b) =>
					(a?.hotelName || "").localeCompare(b?.hotelName || "", undefined, {
						sensitivity: "base",
					})
				);
				setAllHotelDetailsAdmin(sorted);
			})
			.catch((err) => {
				console.error("Error getting all hotel details", err);
				setAllHotelDetailsAdmin([]);
			});
	}, [user?._id, token]);

	useEffect(() => {
		adminAllHotelDetails();
	}, [adminAllHotelDetails]);

	// ---- Main reports fetch (re-run on selectedHotels/excludeCancelled) ----
	useEffect(() => {
		loadAllReportData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedHotels, excludeCancelled]);

	function loadAllReportData() {
		if (!user?._id || !token) return;

		setLoading(true);
		const extraParams = { excludeCancelled };

		Promise.all([
			getReservationsByDay(user._id, token, selectedHotels, extraParams),
			getCheckinsByDay(user._id, token, selectedHotels, extraParams),
			getCheckoutsByDay(user._id, token, selectedHotels, extraParams),
			getReservationsByBookingStatus(
				user._id,
				token,
				selectedHotels,
				extraParams
			),
			getReservationsByHotelNames(user._id, token, selectedHotels, extraParams),
			getTopHotelsByReservations(
				user._id,
				token,
				100,
				selectedHotels,
				extraParams
			),
		])
			.then((results) => {
				const [
					rByDay,
					cByDay,
					coByDay,
					rByStatus,
					rByHotelNames,
					topHotelsData,
				] = results;

				setReservationsByDay(Array.isArray(rByDay) ? rByDay : []);
				setCheckinsByDay(Array.isArray(cByDay) ? cByDay : []);
				setCheckoutsByDay(Array.isArray(coByDay) ? coByDay : []);
				setReservationsByBookingStatus(
					Array.isArray(rByStatus) ? rByStatus : []
				);
				setReservationsByHotelNames(
					Array.isArray(rByHotelNames) ? rByHotelNames : []
				);
				setTopHotels(Array.isArray(topHotelsData) ? topHotelsData : []);

				const { monthArray: dM, quarterArray: dQ } = buildMonthQuarterOptions(
					Array.isArray(rByDay) ? rByDay : []
				);
				setDayMonthOptions(dM);
				setDayQuarterOptions(dQ);

				const { monthArray: cM, quarterArray: cQ } = buildMonthQuarterOptions(
					Array.isArray(cByDay) ? cByDay : []
				);
				setCheckinMonthOptions(cM);
				setCheckinQuarterOptions(cQ);

				const { monthArray: coM, quarterArray: coQ } = buildMonthQuarterOptions(
					Array.isArray(coByDay) ? coByDay : []
				);
				setCheckoutMonthOptions(coM);
				setCheckoutQuarterOptions(coQ);

				const { monthArray: sM, quarterArray: sQ } = buildMonthQuarterOptions(
					Array.isArray(rByStatus) ? rByStatus : []
				);
				setStatusMonthOptions(sM);
				setStatusQuarterOptions(sQ);

				const { monthArray: hM, quarterArray: hQ } = buildMonthQuarterOptions(
					Array.isArray(rByHotelNames) ? rByHotelNames : []
				);
				setHotelMonthOptions(hM);
				setHotelQuarterOptions(hQ);

				const { monthArray: tM, quarterArray: tQ } = buildMonthQuarterOptions(
					Array.isArray(topHotelsData) ? topHotelsData : []
				);
				setTopMonthOptions(tM);
				setTopQuarterOptions(tQ);

				const currentMonth = dayjs().format("YYYY-MM");

				// Default selections
				if (dM.includes(currentMonth)) {
					setDayMonthSelected(currentMonth);
					setRangeDay("month");
				} else if (dM.length > 0 && !dayMonthSelected) {
					setDayMonthSelected(dM[dM.length - 1]);
					setRangeDay("month");
				}

				if (cM.includes(currentMonth)) {
					setCheckinMonthSelected(currentMonth);
					setRangeCheckin("month");
				} else if (cM.length > 0 && !checkinMonthSelected) {
					setCheckinMonthSelected(cM[cM.length - 1]);
					setRangeCheckin("month");
				}

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

	/** Fetch and show reservations in modal */
	const fetchAndShowReservations = async (queryParamsObj) => {
		try {
			if (!user?._id || !token) return;
			setModalLoading(true);
			setModalVisible(true);

			const data = await getSpecificListOfReservations(user._id, token, {
				...queryParamsObj,
				hotels: selectedHotels.includes("all")
					? "all"
					: selectedHotels.join(","),
				excludeCancelled,
			});

			const normalized = {
				data: Array.isArray(data?.data)
					? data.data
					: Array.isArray(data)
					  ? data
					  : [],
				totalDocuments:
					data?.totalDocuments || (Array.isArray(data) ? data.length : 0),
				scorecards: data?.scorecards || {},
			};

			setModalData(normalized);
			setCurrentPage(1);
		} catch (err) {
			console.error("Failed to fetch specific reservations", err);
			message.error("Failed to fetch reservations list");
		} finally {
			setModalLoading(false);
		}
	};

	// --- Reservations By Day ---
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
			chart: {
				id: "reservations-by-day-chart",
				height: 300,
				events: {
					dataPointSelection: (event, chartContext, config) => {
						const idx = config.dataPointIndex;
						if (idx >= 0) {
							const clickedDate = dayCategories[idx];
							if (dayChartMode === "monthly") {
								const dateObj = dayjs(clickedDate + "-01", "YYYY-MM-DD");
								const monthName = dateObj.format("MMMM").toLowerCase();
								const year = dateObj.format("YYYY");
								const monthString = `${monthName}-${year}`;
								fetchAndShowReservations({
									[`createdAtMonth_${monthString}`]: 1,
								});
							} else {
								fetchAndShowReservations({
									[`createdAtDate_${clickedDate}`]: 1,
								});
							}
						}
					},
				},
			},
			xaxis: { categories: dayCategories },
			yaxis: {
				labels: { formatter: createYAxisFormatter(measureDay) },
				min: 0,
			},
			plotOptions: { bar: { borderRadius: 4 } },
			title: {
				text: "Reservations By Day",
				align: "center",
				style: { fontSize: "16px" },
			},
		},
		series: [
			{
				name:
					measureDay === "count"
						? "Reservations Count"
						: measureDay === "total"
						  ? "Total Amount"
						  : "Commission",
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
			chart: {
				id: "checkins-by-day-chart",
				height: 300,
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
								fetchAndShowReservations({ [`checkinDate_${clickedDate}`]: 1 });
							}
						}
					},
				},
			},
			xaxis: { categories: checkinsCategories },
			yaxis: {
				labels: { formatter: createYAxisFormatter(measureCheckin) },
				min: 0,
			},
			plotOptions: { bar: { borderRadius: 4 } },
			title: {
				text: "Check-ins By Day",
				align: "center",
				style: { fontSize: "16px" },
			},
		},
		series: [
			{
				name:
					measureCheckin === "count"
						? "Check-ins Count"
						: measureCheckin === "total"
						  ? "Total Amount"
						  : "Commission",
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
			chart: {
				id: "checkouts-by-day-chart",
				height: 300,
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
			xaxis: { categories: checkoutCategories },
			yaxis: {
				labels: { formatter: createYAxisFormatter(measureCheckout) },
				min: 0,
			},
			plotOptions: { bar: { borderRadius: 4 } },
			title: {
				text: "Check-outs By Day",
				align: "center",
				style: { fontSize: "16px" },
			},
		},
		series: [
			{
				name:
					measureCheckout === "count"
						? "Check-outs Count"
						: measureCheckout === "total"
						  ? "Total Amount"
						  : "Commission",
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

	// --- Booking Status (Pie) ---
	const filteredStatus = filterByRangeAndSelection(
		reservationsByBookingStatus,
		rangeBookingStatus,
		statusMonthSelected,
		statusQuarterSelected
	);
	const bookingStatusLabels = filteredStatus.map(
		(item) => item.reservation_status || "Unknown"
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
				events: {
					dataPointSelection: (event, chartContext, config) => {
						const idx = config.dataPointIndex;
						if (idx >= 0) {
							const clickedStatus = bookingStatusLabels[idx];
							fetchAndShowReservations({
								[`reservationstatus_${clickedStatus}`]: 1,
							});
						}
					},
				},
			},
			labels: bookingStatusLabels,
			colors: bookingStatusColors,
			title: {
				text: "Reservations By Status",
				align: "center",
				style: { fontSize: "16px" },
			},
			responsive: [
				{ breakpoint: 768, options: { legend: { position: "bottom" } } },
			],
		},
		series: bookingStatusValues,
	};

	// --- Top 5 Hotels ---
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
	const top5HotelNames = top5.map((item) => item.hotelName || "Unknown");
	const top5Data = top5.map((item) => item.reservationsCount ?? 0);

	const topHotelsChartOptions = {
		chart: {
			id: "top-5-hotels-chart",
			height: 300,
			events: {
				dataPointSelection: (event, chartContext, config) => {
					const idx = config.dataPointIndex;
					if (idx >= 0) {
						message.info(
							"Clicked on hotel: " + (top5[idx].hotelName || "Unknown")
						);
					}
				},
			},
		},
		xaxis: { categories: top5HotelNames },
		plotOptions: { bar: { horizontal: true, borderRadius: 3 } },
		title: {
			text: "Top 5 Hotels By Reservations",
			align: "center",
			style: { fontSize: "16px" },
		},
	};

	// --- Reservations By Hotel (Table) ---
	const filteredByHotel = filterByRangeAndSelection(
		reservationsByHotelNames,
		rangeByHotel,
		hotelMonthSelected,
		hotelQuarterSelected
	);
	const sortedByHotel = [...filteredByHotel].sort(
		(a, b) => (b.reservationsCount ?? 0) - (a.reservationsCount ?? 0)
	);

	const handleHotelSelectChange = (value) => {
		if (value.length === 0) {
			setSelectedHotels(["all"]);
			return;
		}
		if (value.includes("all") && !selectedHotels.includes("all")) {
			setSelectedHotels(["all"]);
			return;
		}
		if (
			value.includes("all") &&
			selectedHotels.includes("all") &&
			value.length > 1
		) {
			const withoutAll = value.filter((v) => v !== "all");
			setSelectedHotels(withoutAll);
			return;
		}
		setSelectedHotels(value);
	};

	const handleSearch = () => setCurrentPage(1);

	return (
		<ReservationsOverviewWrapper>
			{loading ? (
				<Spin tip='Loading Reports...' size='large' />
			) : (
				<>
					<div style={{ marginBottom: "20px" }}>
						<label>Select Hotels:</label>
						<Select
							mode='multiple'
							style={{ width: "100%" }}
							placeholder='Please select hotels'
							value={selectedHotels}
							onChange={handleHotelSelectChange}
						>
							<Option value='all'>All Hotels</Option>
							{Array.isArray(allHotelDetailsAdmin) &&
								allHotelDetailsAdmin.map((h, i) => (
									<Option key={i} value={h?.hotelName}>
										{h?.hotelName}
									</Option>
								))}
						</Select>

						<Button
							style={{ marginTop: 10 }}
							onClick={() => setExcludeCancelled(!excludeCancelled)}
						>
							{excludeCancelled
								? "Include Cancelled Reservations"
								: "Exclude Cancelled Reservations"}
						</Button>
					</div>

					<Collapse defaultActiveKey={["1", "2", "3"]} expandIconPosition='end'>
						{/* ==================== PANEL 1 ==================== */}
						<Panel header='Reservations By Day' key='1'>
							<div className='panel-controls'>
								<Button
									onClick={handleDayMonthOverMonth}
									style={{ marginRight: 8 }}
								>
									{dayChartMode === "daily" ? "Month Over Month" : "Daily View"}
								</Button>

								<Radio.Group
									value={measureDay}
									onChange={(e) => setMeasureDay(e.target.value)}
									style={{ marginRight: 8 }}
								>
									<Radio.Button value='count'>Count</Radio.Button>
									<Radio.Button value='total'>Total Amount</Radio.Button>
									<Radio.Button value='commission'>Commission</Radio.Button>
								</Radio.Group>

								<Select
									value={rangeDay}
									onChange={(val) => setRangeDay(val)}
									style={{ width: 120, marginRight: 8 }}
									disabled={dayChartMode === "monthly"}
								>
									<Option value='all'>All</Option>
									<Option value='month'>Month</Option>
									<Option value='quarter'>Quarter</Option>
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
									Total{" "}
									{measureDay === "count"
										? "Reservations"
										: measureDay === "total"
										  ? "Amount"
										  : "Commission"}
									:
								</b>{" "}
								{formatForDisplay(
									sumOfMeasure(dayDataForChart, measureDay),
									measureDay
								)}
							</Card>

							<div className='chart-container container'>
								{dayDataForChart.length === 0 ? (
									<p>No data found</p>
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
						<Panel header='Check-ins & Check-outs By Day' key='2'>
							<div className='checkins-checkouts-wrapper'>
								{/* Check-ins */}
								<div className='subchart'>
									<div className='panel-controls'>
										<Button
											onClick={handleCheckinMonthOverMonth}
											style={{ marginRight: 8 }}
										>
											{checkinChartMode === "daily"
												? "Month Over Month"
												: "Daily View"}
										</Button>

										<Radio.Group
											value={measureCheckin}
											onChange={(e) => setMeasureCheckin(e.target.value)}
											style={{ marginRight: 8 }}
										>
											<Radio.Button value='count'>Count</Radio.Button>
											<Radio.Button value='total'>Total Amount</Radio.Button>
											<Radio.Button value='commission'>Commission</Radio.Button>
										</Radio.Group>

										<Select
											value={rangeCheckin}
											onChange={(val) => setRangeCheckin(val)}
											style={{ width: 120, marginRight: 8 }}
											disabled={checkinChartMode === "monthly"}
										>
											<Option value='all'>All</Option>
											<Option value='month'>Month</Option>
											<Option value='quarter'>Quarter</Option>
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
										<b>Total Check-ins:</b>{" "}
										{formatForDisplay(
											sumOfMeasure(checkinDataForChart, measureCheckin),
											measureCheckin
										)}
									</Card>

									<div className='chart-container container'>
										{checkinDataForChart.length === 0 ? (
											<p>No data found</p>
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
												? "Month Over Month"
												: "Daily View"}
										</Button>

										<Radio.Group
											value={measureCheckout}
											onChange={(e) => setMeasureCheckout(e.target.value)}
											style={{ marginRight: 8 }}
										>
											<Radio.Button value='count'>Count</Radio.Button>
											<Radio.Button value='total'>Total Amount</Radio.Button>
											<Radio.Button value='commission'>Commission</Radio.Button>
										</Radio.Group>

										<Select
											value={rangeCheckout}
											onChange={(val) => setRangeCheckout(val)}
											style={{ width: 120, marginRight: 8 }}
											disabled={checkoutChartMode === "monthly"}
										>
											<Option value='all'>All</Option>
											<Option value='month'>Month</Option>
											<Option value='quarter'>Quarter</Option>
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
										<b>Total Check-outs:</b>{" "}
										{formatForDisplay(
											sumOfMeasure(checkoutDataForChart, measureCheckout),
											measureCheckout
										)}
									</Card>

									<div className='chart-container container'>
										{checkoutDataForChart.length === 0 ? (
											<p>No data found</p>
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
						<Panel header='Booking Status & Top 5 Hotels' key='3'>
							<div className='status-hotel-wrapper'>
								{/* Booking Status (Pie) */}
								<div className='subchart'>
									<div className='panel-controls'>
										<Radio.Group
											value={measureBookingStatus}
											onChange={(e) => setMeasureBookingStatus(e.target.value)}
											style={{ marginRight: 8 }}
										>
											<Radio.Button value='count'>Count</Radio.Button>
											<Radio.Button value='total'>Total</Radio.Button>
											<Radio.Button value='commission'>Commission</Radio.Button>
										</Radio.Group>
										<Select
											value={rangeBookingStatus}
											onChange={(val) => setRangeBookingStatus(val)}
											style={{ width: 120, marginRight: 8 }}
										>
											<Option value='all'>All</Option>
											<Option value='month'>Month</Option>
											<Option value='quarter'>Quarter</Option>
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
										<b>Total:</b>{" "}
										{formatForDisplay(
											sumOfMeasure(filteredStatus, measureBookingStatus),
											measureBookingStatus
										)}
									</Card>

									<div className='chart-container container'>
										{filteredStatus.length === 0 ? (
											<p>No data found</p>
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
											<Option value='all'>All</Option>
											<Option value='month'>Month</Option>
											<Option value='quarter'>Quarter</Option>
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

									{top5.length === 0 ? (
										<p>No data found</p>
									) : (
										<Chart
											options={topHotelsChartOptions}
											series={[{ name: "Reservations Count", data: top5Data }]}
											type='bar'
											height={300}
										/>
									)}
								</div>
							</div>
						</Panel>

						{/* ==================== PANEL 4 ==================== */}
						<Panel header='Reservations By Hotel' key='4'>
							<div className='panel-controls'>
								<Radio.Group
									value={measureByHotel}
									onChange={(e) => setMeasureByHotel(e.target.value)}
									style={{ marginRight: 8 }}
								>
									<Radio.Button value='count'>Count</Radio.Button>
									<Radio.Button value='total'>Total</Radio.Button>
									<Radio.Button value='commission'>Commission</Radio.Button>
								</Radio.Group>

								<Select
									value={rangeByHotel}
									onChange={(val) => setRangeByHotel(val)}
									style={{ width: 120, marginRight: 8 }}
								>
									<Option value='all'>All</Option>
									<Option value='month'>Month</Option>
									<Option value='quarter'>Quarter</Option>
								</Select>

								{rangeByHotel === "month" && (
									<Select
										style={{ width: 120 }}
										value={hotelMonthSelected}
										onChange={(val) => setHotelMonthSelected(val)}
									>
										{hotelMonthOptions.map((mKey) => (
											<Option key={mKey} value={mKey}>
												{mKey}
											</Option>
										))}
									</Select>
								)}
								{rangeByHotel === "quarter" && (
									<Select
										style={{ width: 120 }}
										value={hotelQuarterSelected}
										onChange={(val) => setHotelQuarterSelected(val)}
									>
										{hotelQuarterOptions.map((qKey) => (
											<Option key={qKey} value={qKey}>
												{qKey}
											</Option>
										))}
									</Select>
								)}
							</div>

							<Card size='small' className='sum-card-pink'>
								<b>
									Total{" "}
									{measureByHotel === "count"
										? "Reservations"
										: measureByHotel === "total"
										  ? "Amount"
										  : "Commission"}
									:
								</b>{" "}
								{formatForDisplay(
									sumOfMeasure(sortedByHotel, measureByHotel),
									measureByHotel
								)}
							</Card>

							<div className='table-container container'>
								{sortedByHotel.length === 0 ? (
									<p>No data found</p>
								) : (
									<table
										style={{ width: "100%", borderCollapse: "collapse" }}
										border='1'
									>
										<thead>
											<tr>
												<th>Hotel Name</th>
												<th>Reservations</th>
												<th>Total Amount (SAR)</th>
												<th>Commission (SAR)</th>
											</tr>
										</thead>
										<tbody>
											{sortedByHotel.map((item, idx) => (
												<tr key={idx}>
													<td>{item.hotelName || "Unknown"}</td>
													<td>
														{formatForDisplay(
															item.reservationsCount ?? 0,
															"count"
														)}
													</td>
													<td>
														{formatForDisplay(item.total_amount ?? 0, "total")}
													</td>
													<td>
														{formatForDisplay(
															item.commission ?? 0,
															"commission"
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
							</div>
						</Panel>
					</Collapse>
				</>
			)}

			{/* ===================== MODAL ===================== */}
			<Modal
				className='custom-reservations-modal'
				title='Detailed Reservations List'
				open={modalVisible}
				onCancel={() => setModalVisible(false)}
				footer={null}
				width='85%'
				style={{ top: "3%", left: "7%" }}
			>
				{modalLoading ? (
					<Spin tip='Loading...' />
				) : modalData.data.length === 0 ? (
					<p>No reservations found</p>
				) : (
					<EnhancedContentTable
						data={modalData.data}
						totalDocuments={modalData.totalDocuments}
						currentPage={currentPage}
						pageSize={pageSize}
						setCurrentPage={setCurrentPage}
						setPageSize={setPageSize}
						searchTerm={searchTerm}
						setSearchTerm={setSearchTerm}
						handleSearch={handleSearch}
						scorecardsObject={modalData.scorecards}
						fromPage='reports'
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

	.ant-collapse {
		border-radius: 6px;
	}
	.ant-collapse-header {
		font-weight: bold;
		font-size: 16px;
	}
	.chart-container,
	.table-container {
		width: 100%;
		border: 1px solid #e0e0e0;
		padding: 0.5rem;
		margin-bottom: 1rem;
		background-color: #fff;
	}
	.panel-controls {
		margin-bottom: 1rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.checkins-checkouts-wrapper,
	.status-hotel-wrapper {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.subchart {
		flex: 1;
		min-width: 300px;
		display: flex;
		flex-direction: column;
	}
	.sum-card {
		margin-bottom: 1rem;
		background-color: #fffde7;
		border: 1px solid #e0e0e0;
	}
	.sum-card-green {
		margin-bottom: 1rem;
		background-color: #66bb6a;
		border: 1px solid #e0e0e0;
		color: #fff;
	}
	.sum-card-purple {
		margin-bottom: 1rem;
		background-color: #b39ddb;
		border: 1px solid #e0e0e0;
		color: #fff;
	}
	.sum-card-red {
		margin-bottom: 1rem;
		background-color: #ff8a80;
		border: 1px solid #e0e0e0;
	}
	.sum-card-pink {
		margin-bottom: 1rem;
		background-color: #f3e5f5;
		border: 1px solid #e0e0e0;
	}
	@media (max-width: 768px) {
		.ant-collapse-header {
			font-size: 14px;
		}
		.checkins-checkouts-wrapper,
		.status-hotel-wrapper {
			flex-direction: column;
		}
	}
	.custom-reservations-modal .ant-modal {
		z-index: 9999 !important;
	}
`;
