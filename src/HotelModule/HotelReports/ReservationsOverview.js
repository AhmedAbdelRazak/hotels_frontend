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

/** 2) Build unique year-month & year-quarter sets from the data */
function buildMonthQuarterOptions(dataArray) {
	const monthSet = new Set();
	const quarterSet = new Set();

	dataArray.forEach((item) => {
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
	return dataArray.reduce(
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
	if (range === "all") return dataArray;

	if (range === "month" && monthSelected) {
		const [y, m] = monthSelected.split("-");
		const year = Number(y);
		const month = Number(m);
		return dataArray.filter((item) => {
			const d = parseGroupKeyDate(item.groupKey);
			return d.isValid() && d.year() === year && d.month() + 1 === month;
		});
	}

	if (range === "quarter" && quarterSelected) {
		const [y, qStr] = quarterSelected.split("-Q");
		const year = Number(y);
		const qNum = Number(qStr);
		return dataArray.filter((item) => {
			const d = parseGroupKeyDate(item.groupKey);
			if (!d.isValid() || d.year() !== year) return false;
			const mon = d.month() + 1;
			return Math.ceil(mon / 3) === qNum;
		});
	}

	return dataArray;
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
	for (const item of dataArray) {
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
	const [modalData, setModalData] = useState([]); // array of reservations

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

				setReservationsByDay(rByDay || []);
				setCheckinsByDay(cByDay || []);
				setCheckoutsByDay(coByDay || []);
				setReservationsByBookingStatus(rByStatus || []);
				setTopHotels(topHotelsData || []);

				// Build unique month/quarter sets
				const { monthArray: dM, quarterArray: dQ } = buildMonthQuarterOptions(
					rByDay || []
				);
				setDayMonthOptions(dM);
				setDayQuarterOptions(dQ);

				const { monthArray: cM, quarterArray: cQ } = buildMonthQuarterOptions(
					cByDay || []
				);
				setCheckinMonthOptions(cM);
				setCheckinQuarterOptions(cQ);

				const { monthArray: coM, quarterArray: coQ } = buildMonthQuarterOptions(
					coByDay || []
				);
				setCheckoutMonthOptions(coM);
				setCheckoutQuarterOptions(coQ);

				const { monthArray: sM, quarterArray: sQ } = buildMonthQuarterOptions(
					rByStatus || []
				);
				setStatusMonthOptions(sM);
				setStatusQuarterOptions(sQ);

				const { monthArray: tM, quarterArray: tQ } = buildMonthQuarterOptions(
					topHotelsData || []
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
			setModalData(data || []);
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
			chart: {
				id: "reservations-by-day-chart",
				height: 300,
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
								fetchAndShowReservations({
									[`checkinDate_${clickedDate}`]: 1,
								});
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

	// C) Booking Status (Pie) + Top 5 Hotels (Bar)
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
			title: {
				text: "Reservations By Status",
				align: "center",
				style: { fontSize: "16px" },
			},
			responsive: [
				{
					breakpoint: 768,
					options: {
						legend: { position: "bottom" },
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

	const handleSearch = () => {
		setCurrentPage(1);
		// The useEffect with fetchReservations() will run automatically on next render
	};

	console.log(modalData, "modalDataaaaaaaaa");
	return (
		<ReservationsOverviewWrapper
			dir={chosenLanguage === "Arabic" ? "ltr" : "ltr"}
		>
			{loading ? (
				<Spin tip='Loading Reports...' size='large' />
			) : (
				<>
					<div style={{ marginBottom: "20px" }}>
						{/* NEW BUTTON: Exclude/Include Cancelled */}
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
									{/* <Radio.Button value='commission'>Commission</Radio.Button> */}
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
											{/* <Radio.Button value='commission'>Commission</Radio.Button> */}
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
											{/* <Radio.Button value='commission'>Commission</Radio.Button> */}
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
											{/* <Radio.Button value='commission'>Commission</Radio.Button> */}
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
											series={[
												{
													name: "Reservations Count",
													data: top5Data,
												},
											]}
											type='bar'
											height={300}
										/>
									)}
								</div>
							</div>
						</Panel>
					</Collapse>
				</>
			)}

			{/* ===================== MODAL to display reservations list ===================== */}
			<Modal
				className='custom-reservations-modal'
				title='Detailed Reservations List'
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
					<Spin tip='Loading...' />
				) : modalData.length === 0 ? (
					<p>No reservations found</p>
				) : (
					<EnhancedContentTable
						// We pass only the subset after user-based filtering
						// plus totalDocuments from the server for pagination
						data={modalData.data}
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
