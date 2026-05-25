import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Alert, Button, DatePicker, Modal, Select, Spin, Switch } from "antd";
import {
	CalendarOutlined,
	FilterOutlined,
	HomeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useParams } from "react-router-dom";
import moment from "moment-hijri";
import * as XLSX from "xlsx";
import {
	getHotelInventoryCalendar,
	getHotelInventoryDayReservations,
} from "../apiAdmin";
import { titleCase } from "../TheOverallStructure/overallShared";

const { Option } = Select;
const { RangePicker } = DatePicker;

const heatColor = (rate = 0) => {
	const clamped = Math.min(Math.max(Number(rate) || 0, 0), 1);
	const start = [229, 243, 255];
	const end = clamped >= 0.78 ? [185, 28, 28] : [16, 91, 150];
	const mix = start.map((s, i) => Math.round(s + (end[i] - s) * clamped));
	return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
};

const getReadableText = (rate = 0) =>
	Number(rate) > 0.58 ? "#ffffff" : "#102033";

const heatBackground = (rate = 0, overbooked = false) => {
	const r = Math.min(Math.max(Number(rate) || 0, 0), 1);
	if (overbooked) {
		return "linear-gradient(135deg, #fff1f2 0%, #fb7185 46%, #991b1b 100%)";
	}
	if (r >= 0.86) {
		return "linear-gradient(135deg, #fee2e2 0%, #ef4444 48%, #7f1d1d 100%)";
	}
	if (r >= 0.64) {
		return "linear-gradient(135deg, #dbeafe 0%, #2563eb 54%, #102033 100%)";
	}
	if (r >= 0.32) {
		return "linear-gradient(135deg, #eef7ff 0%, #7db7ec 58%, #24547d 100%)";
	}
	return "linear-gradient(135deg, #ffffff 0%, #edf7ff 58%, #cde7ff 100%)";
};

const heatBorder = (rate = 0, overbooked = false) => {
	if (overbooked) return "#991b1b";
	const r = Math.min(Math.max(Number(rate) || 0, 0), 1);
	if (r >= 0.86) return "#b91c1c";
	if (r >= 0.64) return "#1d4ed8";
	if (r >= 0.32) return "#2f74b5";
	return "#b8d8f3";
};

const heatShadow = (rate = 0, overbooked = false) => {
	if (overbooked) return "0 8px 20px rgba(153, 27, 27, 0.2)";
	const r = Math.min(Math.max(Number(rate) || 0, 0), 1);
	if (r >= 0.86) return "0 8px 20px rgba(185, 28, 28, 0.16)";
	if (r >= 0.64) return "0 8px 20px rgba(29, 78, 216, 0.14)";
	return "0 6px 16px rgba(36, 84, 125, 0.1)";
};

const formatInt = (value) => Number(value || 0).toLocaleString("en-US");

const PAYMENT_STATUS_OPTIONS = [
	"Not Paid",
	"Not Captured",
	"Captured",
	"Paid Offline",
];

const normalizePaymentStatuses = (statuses = []) => {
	const allowed = new Set(PAYMENT_STATUS_OPTIONS);
	return (Array.isArray(statuses) ? statuses : String(statuses || "").split(","))
		.map((status) => String(status || "").trim())
		.filter((status) => allowed.has(status));
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
	"\u0645\u062d\u0631\u0645",
	"\u0635\u0641\u0631",
	"\u0631\u0628\u064a\u0639\u0020\u0627\u0644\u0623\u0648\u0644",
	"\u0631\u0628\u064a\u0639\u0020\u0627\u0644\u0622\u062e\u0631",
	"\u062c\u0645\u0627\u062f\u0649\u0020\u0627\u0644\u0623\u0648\u0644\u0649",
	"\u062c\u0645\u0627\u062f\u0649\u0020\u0627\u0644\u0622\u062e\u0631\u0629",
	"\u0631\u062c\u0628",
	"\u0634\u0639\u0628\u0627\u0646",
	"\u0631\u0645\u0636\u0627\u0646",
	"\u0634\u0648\u0627\u0644",
	"\u0630\u0648\u0020\u0627\u0644\u0642\u0639\u062f\u0629",
	"\u0630\u0648\u0020\u0627\u0644\u062d\u062c\u0629",
];

const normalizeInitialRange = (range = {}) => {
	if (!range?.start || !range?.end) return null;
	const start = dayjs(range.start);
	const end = dayjs(range.end);
	if (!start.isValid() || !end.isValid() || end.isBefore(start, "day")) {
		return null;
	}
	return {
		start: start.format("YYYY-MM-DD"),
		end: end.format("YYYY-MM-DD"),
	};
};

const normalizeInitialCalendarType = (value = "") =>
	["gregorian", "hijri"].includes(String(value || "").toLowerCase())
		? String(value || "").toLowerCase()
		: "";

const normalizeHijriMonthValue = (value, fallback) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) return fallback;
	if (parsed < 0 || parsed > 11) return fallback;
	return parsed;
};

const normalizeHijriYearValue = (value, fallback) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) return fallback;
	if (parsed < 1300 || parsed > 1600) return fallback;
	return parsed;
};

const HotelInventory = ({
	chosenLanguage,
	hotelId: controlledHotelId = "",
	hotelOptions = [],
	onHotelChange,
	fetchCalendarApi = getHotelInventoryCalendar,
	fetchDayReservationsApi = getHotelInventoryDayReservations,
	initialCalendarType = "",
	initialHijriMonth,
	initialHijriYear,
	initialRange,
	initialIncludeCancelled = false,
	initialPaymentStatuses = [],
	onFilterChange,
	showControls = true,
}) => {
	const routeParams = useParams();
	const hotelId = controlledHotelId || routeParams.hotelId;
	const supportsHijri =
		typeof moment?.fn?.iMonth === "function" &&
		typeof moment?.fn?.iYear === "function";

	const nowHijri = supportsHijri ? moment() : null;
	const defaultHijriMonth = supportsHijri ? nowHijri.iMonth() : 0;
	const defaultHijriYear = supportsHijri ? nowHijri.iYear() : dayjs().year();
	const parsedInitialRange = normalizeInitialRange(initialRange);
	const parsedInitialCalendarType = normalizeInitialCalendarType(
		initialCalendarType,
	);
	const parsedInitialHijriMonth = normalizeHijriMonthValue(
		initialHijriMonth,
		defaultHijriMonth,
	);
	const parsedInitialHijriYear = normalizeHijriYearValue(
		initialHijriYear,
		defaultHijriYear,
	);
	const defaultHijriStart = supportsHijri
		? moment()
				.iYear(parsedInitialHijriYear)
				.iMonth(parsedInitialHijriMonth)
				.startOf("iMonth")
		: null;
	const defaultHijriEnd = supportsHijri
		? moment()
				.iYear(parsedInitialHijriYear)
				.iMonth(parsedInitialHijriMonth)
				.endOf("iMonth")
		: null;

	const [monthValue, setMonthValue] = useState(() =>
		parsedInitialRange?.start
			? dayjs(parsedInitialRange.start).startOf("month")
			: defaultHijriStart
			? dayjs(defaultHijriStart.toDate())
			: dayjs().startOf("month"),
	);
	const [calendarType, setCalendarType] = useState(
		parsedInitialCalendarType || (defaultHijriStart ? "hijri" : "gregorian"),
	);
	const [hijriMonth, setHijriMonth] = useState(parsedInitialHijriMonth);
	const [hijriYear, setHijriYear] = useState(parsedInitialHijriYear);
	const [rangeOverride, setRangeOverride] = useState(() =>
		parsedInitialRange
			? parsedInitialRange
			: defaultHijriStart
			? {
					start: dayjs(defaultHijriStart.toDate()).format("YYYY-MM-DD"),
					end: dayjs(defaultHijriEnd?.toDate()).format("YYYY-MM-DD"),
			  }
			: null,
	);
	const [includeCancelled, setIncludeCancelled] = useState(
		Boolean(initialIncludeCancelled),
	);
	const [paymentStatuses, setPaymentStatuses] = useState(() =>
		normalizePaymentStatuses(initialPaymentStatuses),
	);
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [dayModalOpen, setDayModalOpen] = useState(false);
	const [daySelection, setDaySelection] = useState(null);
	const [dayDetails, setDayDetails] = useState(null);
	const [dayDetailsLoading, setDayDetailsLoading] = useState(false);
	const [dayDetailsError, setDayDetailsError] = useState("");

	useEffect(() => {
		const nextType = normalizeInitialCalendarType(initialCalendarType);
		if (nextType && nextType !== calendarType) {
			setCalendarType(nextType);
		}
	}, [calendarType, initialCalendarType]);

	useEffect(() => {
		const nextRange = normalizeInitialRange(initialRange);
		if (!nextRange) return;
		if (
			nextRange.start !== rangeOverride?.start ||
			nextRange.end !== rangeOverride?.end
		) {
			setRangeOverride(nextRange);
			setMonthValue(dayjs(nextRange.start).startOf("month"));
		}
	}, [initialRange, rangeOverride?.end, rangeOverride?.start]);

	useEffect(() => {
		const nextMonth = normalizeHijriMonthValue(
			initialHijriMonth,
			hijriMonth,
		);
		const nextYear = normalizeHijriYearValue(initialHijriYear, hijriYear);
		if (nextMonth !== hijriMonth) setHijriMonth(nextMonth);
		if (nextYear !== hijriYear) setHijriYear(nextYear);
	}, [hijriMonth, hijriYear, initialHijriMonth, initialHijriYear]);

	useEffect(() => {
		setIncludeCancelled(Boolean(initialIncludeCancelled));
	}, [initialIncludeCancelled]);

	useEffect(() => {
		const nextStatuses = normalizePaymentStatuses(initialPaymentStatuses);
		setPaymentStatuses((previous) =>
			JSON.stringify(previous) === JSON.stringify(nextStatuses)
				? previous
				: nextStatuses,
		);
	}, [initialPaymentStatuses]);

	const labels = useMemo(() => {
		if (chosenLanguage === "Arabic") {
			return {
				title:
					"\u062a\u0642\u0631\u064a\u0631\u0020\u0625\u0634\u063a\u0627\u0644\u0020\u0627\u0644\u0641\u0646\u062f\u0642",
				selectedHotel:
					"\u0627\u0644\u0641\u0646\u062f\u0642\u0020\u0627\u0644\u0645\u062d\u062f\u062f",
				chooseHotel:
					"\u0627\u062e\u062a\u0631\u0020\u0641\u0646\u062f\u0642\u0627\u064b",
				calendar: "\u0627\u0644\u062a\u0642\u0648\u064a\u0645",
				dateRange:
					"\u0646\u0637\u0627\u0642\u0020\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
				gregorian: "\u0645\u064a\u0644\u0627\u062f\u064a",
				hijri: "\u0647\u062c\u0631\u064a",
				month: "\u0627\u0644\u0634\u0647\u0631",
				hijriMonth:
					"\u0627\u0644\u0634\u0647\u0631\u0020\u0627\u0644\u0647\u062c\u0631\u064a",
				hijriYear:
					"\u0627\u0644\u0633\u0646\u0629\u0020\u0627\u0644\u0647\u062c\u0631\u064a\u0629",
				period:
					"\u0627\u0644\u0641\u062a\u0631\u0629",
				computedRange:
					"\u0627\u0644\u0645\u062f\u0649\u0020\u0627\u0644\u0645\u062d\u062a\u0633\u0628",
				includeCancelled:
					"\u062a\u0636\u0645\u064a\u0646\u0020\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a\u0020\u0627\u0644\u0645\u0644\u063a\u0627\u0629",
				totalUnits:
					"\u0625\u062c\u0645\u0627\u0644\u064a\u0020\u0627\u0644\u0648\u062d\u062f\u0627\u062a",
				totalRooms:
					"\u0625\u062c\u0645\u0627\u0644\u064a\u0020\u0627\u0644\u063a\u0631\u0641",
				occupiedRoomNights:
					"\u0644\u064a\u0627\u0644\u064a\u0020\u0627\u0644\u063a\u0631\u0641\u0020\u0627\u0644\u0645\u0634\u063a\u0648\u0644\u0629",
				occupancyRate:
					"\u0646\u0633\u0628\u0629\u0020\u0627\u0644\u0625\u0634\u063a\u0627\u0644",
				date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
				total: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
				reservationsOn:
					"\u062d\u062c\u0648\u0632\u0627\u062a\u0020\u0628\u062a\u0627\u0631\u064a\u062e",
				dayDetails:
					"\u062a\u0641\u0627\u0635\u064a\u0644\u0020\u0627\u0644\u064a\u0648\u0645",
				hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
				capacity: "\u0627\u0644\u0633\u0639\u0629",
				occupied: "\u0645\u0634\u063a\u0648\u0644",
				noReservations:
					"\u0644\u0627\u0020\u062a\u0648\u062c\u062f\u0020\u062d\u062c\u0648\u0632\u0627\u062a\u002e",
				prev: "\u0627\u0644\u0633\u0627\u0628\u0642",
				next: "\u0627\u0644\u062a\u0627\u0644\u064a",
				notAvailable: "\u063a\u064a\u0631\u0020\u0645\u062a\u0627\u062d",
				na: "\u063a\u064a\u0631\u0020\u0645\u062a\u0627\u062d",
				legend:
					"\u0645\u0641\u062a\u0627\u062d\u0020\u0627\u0644\u0623\u0644\u0648\u0627\u0646",
				legendLow: "0-30% \u0645\u0646\u062e\u0641\u0636",
				legendMid: "30-70% \u0645\u062a\u0648\u0633\u0637",
				legendHigh: "70-100% \u0645\u0631\u062a\u0641\u0639",
				derived: "Derived",
				to: "\u0625\u0644\u0649",
				exportExcel:
					"\u062a\u0635\u062f\u064a\u0631\u0020\u0625\u0643\u0633\u0644",
				exportDate:
					"\u062a\u0627\u0631\u064a\u062e\u0020\u0627\u0644\u064a\u0648\u0645\u0020(\u0645\u064a\u0644\u0627\u062f\u064a)",
				exportHijriDate:
					"\u062a\u0627\u0631\u064a\u062e\u0020\u0627\u0644\u064a\u0648\u0645\u0020(\u0647\u062c\u0631\u064a)",
				exportGuestName:
					"\u0627\u0633\u0645\u0020\u0627\u0644\u0636\u064a\u0641",
				exportConfirmation:
					"\u0631\u0642\u0645\u0020\u0627\u0644\u062a\u0623\u0643\u064a\u062f",
				exportCheckin:
					"\u062a\u0627\u0631\u064a\u062e\u0020\u0627\u0644\u0648\u0635\u0648\u0644\u0020(\u0645\u064a\u0644\u0627\u062f\u064a)",
				exportCheckinHijri:
					"\u062a\u0627\u0631\u064a\u062e\u0020\u0627\u0644\u0648\u0635\u0648\u0644\u0020(\u0647\u062c\u0631\u064a)",
				exportCheckout:
					"\u062a\u0627\u0631\u064a\u062e\u0020\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629\u0020(\u0645\u064a\u0644\u0627\u062f\u064a)",
				exportCheckoutHijri:
					"\u062a\u0627\u0631\u064a\u062e\u0020\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629\u0020(\u0647\u062c\u0631\u064a)",
				exportStatus: "\u0627\u0644\u062d\u0627\u0644\u0629",
				exportRooms: "\u0627\u0644\u063a\u0631\u0641",
				bookingSource:
					"\u0645\u0635\u062f\u0631\u0020\u0627\u0644\u062d\u062c\u0632",
				paymentStatus:
					"\u062d\u0627\u0644\u0629\u0020\u0627\u0644\u062f\u0641\u0639",
				paymentStatusAll: "\u0627\u0644\u0643\u0644",
				paymentStatusClear: "\u0645\u0633\u062d",
				paymentStatusTip:
					"\u0645\u0644\u0627\u062d\u0638\u0629\u003a\u0020\u064a\u0645\u0643\u0646\u0643\u0020\u0627\u062e\u062a\u064a\u0627\u0631\u0020\u0623\u0643\u062b\u0631\u0020\u0645\u0646\u0020\u062d\u0627\u0644\u0629\u002e",
				paymentStatusLabels: {
					"Not Paid": "\u063a\u064a\u0631\u0020\u0645\u062f\u0641\u0648\u0639",
					"Not Captured":
						"\u063a\u064a\u0631\u0020\u0645\u062d\u0635\u0644",
					Captured: "\u0645\u062d\u0635\u0644",
					"Paid Offline":
						"\u0645\u062f\u0641\u0648\u0639\u0020\u062e\u0627\u0631\u062c\u064a\u0627\u064b",
				},
				exportBookingSource:
					"\u0645\u0635\u062f\u0631\u0020\u0627\u0644\u062d\u062c\u0632",
				exportPaymentStatus:
					"\u062d\u0627\u0644\u0629\u0020\u0627\u0644\u062f\u0641\u0639",
			};
		}
		return {
			title: "Hotel Inventory",
			selectedHotel: "Selected Hotel",
			chooseHotel: "Choose hotel",
			calendar: "Calendar",
			dateRange: "Date range",
			gregorian: "Gregorian",
			hijri: "Hijri",
			month: "Month",
			hijriMonth: "Hijri Month",
			hijriYear: "Hijri Year",
			period: "Period",
			computedRange: "Computed range",
			includeCancelled: "Include Cancelled",
			totalUnits: "Total Units",
			totalRooms: "Total Rooms",
			occupiedRoomNights: "Occupied Room Nights",
			occupancyRate: "Occupancy Rate",
			date: "Date",
			total: "Total",
			reservationsOn: "Reservations on",
			dayDetails: "Day Details",
			hotel: "Hotel",
			capacity: "Capacity",
			occupied: "Occupied",
			noReservations: "No reservations found.",
			prev: "Prev",
			next: "Next",
			notAvailable: "N/A",
			na: "n/a",
			legend: "Legend",
			legendLow: "0-30% Low",
			legendMid: "30-70% Medium",
			legendHigh: "70-100% High",
			derived: "Derived",
			to: "to",
			exportExcel: "Export Excel",
			exportDate: "Selected Date (Gregorian)",
			exportHijriDate: "Selected Date (Hijri)",
			exportGuestName: "Guest Name",
			exportConfirmation: "Confirmation #",
			exportCheckin: "Check-in (Gregorian)",
			exportCheckinHijri: "Check-in (Hijri)",
			exportCheckout: "Check-out (Gregorian)",
			exportCheckoutHijri: "Check-out (Hijri)",
			exportStatus: "Status",
			exportRooms: "Rooms",
			bookingSource: "Booking Source",
			paymentStatus: "Payment Status",
			paymentStatusAll: "All",
			paymentStatusClear: "Clear",
			paymentStatusTip: "Tip: you can select multiple statuses.",
			paymentStatusLabels: {},
			exportBookingSource: "Booking Source",
			exportPaymentStatus: "Payment Status",
		};
	}, [chosenLanguage]);

	const range = useMemo(() => {
		if (rangeOverride?.start && rangeOverride?.end) {
			return { start: rangeOverride.start, end: rangeOverride.end };
		}
		const start = monthValue.startOf("month").format("YYYY-MM-DD");
		const end = monthValue.endOf("month").format("YYYY-MM-DD");
		return { start, end };
	}, [monthValue, rangeOverride]);

	const roomTypes = useMemo(
		() => (Array.isArray(data?.roomTypes) ? data.roomTypes : []),
		[data?.roomTypes],
	);

	const days = useMemo(
		() => (Array.isArray(data?.days) ? data.days : []),
		[data?.days],
	);

	const summary = data?.summary || {};
	const totalUnits = Number(summary.totalUnits ?? summary.totalRoomsAll ?? 0);
	const totalRooms = Number(
		summary.totalRooms ?? summary.totalPhysicalRooms ?? 0,
	);

	const notifyFilterChange = useCallback(
		(overrides = {}) => {
			if (typeof onFilterChange !== "function") return;
			const nextCalendarType = overrides.calendarType || calendarType;
			onFilterChange({
				hotelId: overrides.hotelId ?? hotelId,
				calendarType: nextCalendarType,
				hijriMonth:
					nextCalendarType === "hijri"
						? overrides.hijriMonth ?? hijriMonth
						: undefined,
				hijriYear:
					nextCalendarType === "hijri"
						? overrides.hijriYear ?? hijriYear
						: undefined,
				start: overrides.start ?? range.start,
				end: overrides.end ?? range.end,
				includeCancelled: overrides.includeCancelled ?? includeCancelled,
				paymentStatuses: overrides.paymentStatuses ?? paymentStatuses,
			});
		},
		[
			calendarType,
			hijriMonth,
			hijriYear,
			hotelId,
			includeCancelled,
			onFilterChange,
			paymentStatuses,
			range.end,
			range.start,
		],
	);

	const onHijriChange = useCallback(
		(nextMonth, nextYear) => {
			if (!supportsHijri) return;
			const hStart = moment()
				.iYear(nextYear)
				.iMonth(nextMonth)
				.startOf("iMonth");
			const hEnd = moment().iYear(nextYear).iMonth(nextMonth).endOf("iMonth");

			setHijriMonth(nextMonth);
			setHijriYear(nextYear);
			const nextRange = {
				start: dayjs(hStart.toDate()).format("YYYY-MM-DD"),
				end: dayjs(hEnd.toDate()).format("YYYY-MM-DD"),
			};
			setRangeOverride(nextRange);
			notifyFilterChange({
				calendarType: "hijri",
				hijriMonth: nextMonth,
				hijriYear: nextYear,
				...nextRange,
			});
		},
		[notifyFilterChange, supportsHijri],
	);

	const onMonthChange = (value) => {
		if (!value) return;
		setRangeOverride(null);
		const nextMonth = value.startOf("month");
		setMonthValue(nextMonth);
		notifyFilterChange({
			calendarType: "gregorian",
			start: nextMonth.startOf("month").format("YYYY-MM-DD"),
			end: nextMonth.endOf("month").format("YYYY-MM-DD"),
		});
	};

	const shiftGregorianMonth = (amount) => {
		setRangeOverride(null);
		const nextMonth = monthValue.add(amount, "month").startOf("month");
		setMonthValue(nextMonth);
		notifyFilterChange({
			calendarType: "gregorian",
			start: nextMonth.startOf("month").format("YYYY-MM-DD"),
			end: nextMonth.endOf("month").format("YYYY-MM-DD"),
		});
	};

	const onRangeChange = (values) => {
		if (!Array.isArray(values) || !values[0] || !values[1]) {
			if (calendarType === "hijri") onHijriChange(hijriMonth, hijriYear);
			else setRangeOverride(null);
			return;
		}
		const start = values[0].format("YYYY-MM-DD");
		const end = values[1].format("YYYY-MM-DD");
		setRangeOverride({ start, end });
		setMonthValue(values[0].startOf("month"));
		notifyFilterChange({ start, end });
	};

	const handleCalendarChange = (value) => {
		setCalendarType(value);
		if (value === "gregorian") {
			setRangeOverride(null);
			const nextMonth = dayjs().startOf("month");
			setMonthValue(nextMonth);
			notifyFilterChange({
				calendarType: "gregorian",
				start: nextMonth.startOf("month").format("YYYY-MM-DD"),
				end: nextMonth.endOf("month").format("YYYY-MM-DD"),
			});
		} else {
			onHijriChange(hijriMonth, hijriYear);
		}
	};

	const fetchCalendar = useCallback(() => {
		if (!hotelId) return;
		setLoading(true);
		setError("");
		fetchCalendarApi(hotelId, {
			start: range.start,
			end: range.end,
			includeCancelled,
			paymentStatuses,
		})
			.then((result) => {
				if (result?.error) {
					setError(result.error);
					setData(null);
				} else {
					setData(result || null);
				}
			})
			.catch((err) => {
				setError(err?.message || "Failed to load inventory");
				setData(null);
			})
			.finally(() => setLoading(false));
	}, [
		fetchCalendarApi,
		hotelId,
		range.start,
		range.end,
		includeCancelled,
		paymentStatuses,
	]);

	useEffect(() => {
		fetchCalendar();
	}, [fetchCalendar]);

	const openDayDetails = (date, roomType) => {
		setDaySelection({
			date,
			roomKey: roomType?.key || null,
			roomLabel: roomType?.label || null,
		});
		setDayModalOpen(true);
	};

	const openTotalDetails = (date) => {
		setDaySelection({
			date,
			roomKey: null,
			roomLabel: labels.total,
		});
		setDayModalOpen(true);
	};

	const fetchDayDetails = useCallback(() => {
		if (!hotelId || !daySelection?.date) return;
		setDayDetailsLoading(true);
		setDayDetailsError("");
		fetchDayReservationsApi(hotelId, {
			date: daySelection.date,
			roomKey: daySelection.roomKey || undefined,
			includeCancelled,
			paymentStatuses,
		})
			.then((result) => {
				if (result?.error) {
					setDayDetailsError(result.error);
					setDayDetails(null);
				} else {
					setDayDetails(result || null);
				}
			})
			.catch((err) => {
				setDayDetailsError(err?.message || "Failed to load day details");
				setDayDetails(null);
			})
			.finally(() => setDayDetailsLoading(false));
	}, [
		hotelId,
		daySelection?.date,
		daySelection?.roomKey,
		fetchDayReservationsApi,
		includeCancelled,
		paymentStatuses,
	]);

	const formatHijriDate = useCallback(
		(dateStr) => {
			if (!supportsHijri || !dateStr) return "";
			const m = moment(dateStr);
			if (!m.isValid()) return "";
			const monthIndex = m.iMonth();
			const monthLabel =
				(chosenLanguage === "Arabic" ? hijriMonthsAr : hijriMonthsEn)[
					monthIndex
				] || "";
			return `${m.iDate()} ${monthLabel} ${m.iYear()}`;
		},
		[chosenLanguage, supportsHijri],
	);

	const modalDir = chosenLanguage === "Arabic" ? "rtl" : "ltr";
	const modalOffsets = useMemo(() => {
		return {
			width: "min(1100px, calc(100vw - 24px))",
			style: {
				top: "clamp(10px, 3vh, 28px)",
				left: "50%",
				position: "absolute",
				transform: "translateX(-50%)",
				maxWidth: "calc(100vw - 24px)",
			},
		};
	}, []);

	const togglePaymentStatus = (status) => {
		const set = new Set(paymentStatuses || []);
		if (set.has(status)) set.delete(status);
		else set.add(status);
		const nextStatuses = PAYMENT_STATUS_OPTIONS.filter((s) => set.has(s));
		setPaymentStatuses(nextStatuses);
		notifyFilterChange({ paymentStatuses: nextStatuses });
	};

	const clearPaymentStatuses = () => {
		setPaymentStatuses([]);
		notifyFilterChange({ paymentStatuses: [] });
	};

	const handleIncludeCancelledChange = (checked) => {
		setIncludeCancelled(checked);
		notifyFilterChange({ includeCancelled: checked });
	};

	const paymentAllActive = paymentStatuses.length === 0;

	const handleExport = () => {
		if (!dayDetails || !Array.isArray(dayDetails.reservations)) return;
		if (!dayDetails.reservations.length) return;

		const rows = dayDetails.reservations.map((reservation) => {
			const guestName = reservation.customer_details?.name || "";
			const confirmation = reservation.confirmation_number || "";
			const checkinDate = reservation.checkin_date
				? dayjs(reservation.checkin_date).format("YYYY-MM-DD")
				: "";
			const checkoutDate = reservation.checkout_date
				? dayjs(reservation.checkout_date).format("YYYY-MM-DD")
				: "";
			const checkinHijri = formatHijriDate(reservation.checkin_date);
			const checkoutHijri = formatHijriDate(reservation.checkout_date);
			const status = reservation.reservation_status || "";
			const bookingSource = reservation.booking_source || "";
			const paymentStatus =
				reservation.payment_status || reservation.payment || "";
			const roomIds = Array.isArray(reservation.roomId)
				? reservation.roomId
				: [];
			const roomLabels = roomIds
				.map((room) => room?.display_name || room?.room_type || "")
				.filter(Boolean);
			const pickedRooms = Array.isArray(reservation.pickedRoomsType)
				? reservation.pickedRoomsType
						.map(
							(item) =>
								item?.displayName ||
								item?.display_name ||
								item?.room_type ||
								item?.roomType ||
								"",
						)
						.filter(Boolean)
				: [];
			const rooms = Array.from(new Set([...roomLabels, ...pickedRooms])).join(
				", ",
			);
			return {
				[labels.exportGuestName]: guestName,
				[labels.exportConfirmation]: confirmation,
				[labels.exportCheckinHijri]: checkinHijri,
				[labels.exportCheckoutHijri]: checkoutHijri,
				[labels.exportCheckin]: checkinDate,
				[labels.exportCheckout]: checkoutDate,
				[labels.exportStatus]: status,
				[labels.exportBookingSource]: bookingSource,
				[labels.exportPaymentStatus]: paymentStatus,
				[labels.exportRooms]: rooms,
			};
		});

		const headers = [
			labels.exportGuestName,
			labels.exportConfirmation,
			labels.exportCheckinHijri,
			labels.exportCheckoutHijri,
			labels.exportCheckin,
			labels.exportCheckout,
			labels.exportStatus,
			labels.exportBookingSource,
			labels.exportPaymentStatus,
			labels.exportRooms,
		];

		const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
		worksheet["!cols"] = headers.map((header) => ({
			wch: Math.max(14, header.length + 2),
		}));
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Reservations");

		const fileDate =
			daySelection?.date || dayDetails?.date || dayjs().format("YYYY-MM-DD");
		XLSX.writeFile(workbook, `hotel-inventory-${fileDate}.xlsx`);
	};

	const modalTitle = useMemo(() => {
		if (!daySelection) return labels.dayDetails;
		const hijriTitle = formatHijriDate(daySelection.date);
		return (
			<ModalTitle dir={modalDir}>
				<div className='modal-main'>
					{labels.reservationsOn} {daySelection.date}
					{daySelection.roomLabel ? ` | ${daySelection.roomLabel}` : ""}
				</div>
				{supportsHijri && hijriTitle && (
					<div className='modal-sub'>
						{labels.hijri}: {hijriTitle}
					</div>
				)}
			</ModalTitle>
		);
	}, [daySelection, formatHijriDate, labels, modalDir, supportsHijri]);

	useEffect(() => {
		if (!dayModalOpen) return;
		fetchDayDetails();
	}, [dayModalOpen, fetchDayDetails]);

	const selectedHotelName =
		titleCase(
			data?.hotel?.hotelName ||
				hotelOptions.find((hotel) => hotel._id === hotelId)?.hotelName ||
				labels.selectedHotel,
		);
	const paymentStatusLabel = (status) =>
		labels.paymentStatusLabels?.[status] || status;

	return (
		<InventoryWrapper dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
			{showControls && (
				<HeaderRow>
					<div className='inventory-title'>
						<span className='title-icon'>
							<HomeOutlined />
						</span>
						<div>
							<h3>{labels.title}</h3>
							<div className='subtitle'>{selectedHotelName}</div>
						</div>
					</div>
					<Controls>
						{(hotelOptions.length > 0 || onHotelChange) && (
							<div className='control hotel-control'>
								<span>
									<HomeOutlined /> {labels.selectedHotel}
								</span>
								<Select
									value={hotelId || undefined}
									onChange={(value) => onHotelChange?.(value)}
									showSearch
									optionFilterProp='label'
									placeholder={labels.chooseHotel}
									style={{ minWidth: 210 }}
									options={hotelOptions.map((hotel) => ({
										value: hotel._id,
										label: titleCase(hotel.hotelName),
									}))}
								/>
							</div>
						)}
						<div className='control calendar-control'>
							<span>
								<CalendarOutlined /> {labels.calendar}
							</span>
							<Select
								value={calendarType}
								onChange={handleCalendarChange}
								style={{ minWidth: 140 }}
							>
								<Option value='gregorian'>{labels.gregorian}</Option>
								<Option value='hijri' disabled={!supportsHijri}>
									{labels.hijri}
								</Option>
							</Select>
						</div>
						<div className='control period-control'>
							<span>
								<FilterOutlined />{" "}
								{calendarType === "hijri" ? labels.period : labels.month}
							</span>
							{calendarType === "hijri" && supportsHijri ? (
								<div className='hijri-controls'>
									<Select
										value={hijriMonth}
										onChange={(value) => onHijriChange(Number(value), hijriYear)}
										style={{ minWidth: 160 }}
									>
										{(chosenLanguage === "Arabic"
											? hijriMonthsAr
											: hijriMonthsEn
										).map((monthName, index) => (
											<Option key={monthName} value={index}>
												{monthName}
											</Option>
										))}
									</Select>
									<Select
										value={hijriYear}
										onChange={(value) => onHijriChange(hijriMonth, Number(value))}
										style={{ width: 110 }}
										aria-label={labels.hijriYear}
									>
										{Array.from({ length: 6 }).map((_, idx) => {
											const base = moment().iYear();
											const year = base - 1 + idx;
											return (
												<Option key={year} value={year}>
													{year}
												</Option>
											);
										})}
									</Select>
								</div>
							) : (
								<div className='month-actions'>
									<DatePicker
										picker='month'
										value={monthValue}
										onChange={onMonthChange}
										allowClear={false}
									/>
									<Button
										size='small'
										onClick={() => shiftGregorianMonth(-1)}
									>
										{labels.prev}
									</Button>
									<Button
										size='small'
										onClick={() => shiftGregorianMonth(1)}
									>
										{labels.next}
									</Button>
								</div>
							)}
						</div>
						<div className='control wide range-control'>
							<span>
								<CalendarOutlined /> {labels.dateRange}
							</span>
							<RangePicker
								value={[
									range.start ? dayjs(range.start) : null,
									range.end ? dayjs(range.end) : null,
								]}
								format='YYYY-MM-DD'
								onChange={onRangeChange}
								allowClear={false}
								disabled
							/>
							{calendarType === "hijri" && rangeOverride?.start && (
								<div className='muted'>
									{labels.computedRange}: {rangeOverride.start} - {rangeOverride.end}
								</div>
							)}
						</div>
						<div className='control switch-control'>
							<span>{labels.includeCancelled}</span>
							<Switch
								checked={includeCancelled}
								onChange={handleIncludeCancelledChange}
							/>
						</div>
					</Controls>
				</HeaderRow>
			)}

			{showControls && (
				<PaymentStatusBar $rtl={modalDir === "rtl"}>
					<div className='label'>{labels.paymentStatus}</div>
					<div className='buttons'>
						<StatusButton
							size='small'
							onClick={clearPaymentStatuses}
							isActive={paymentAllActive}
						>
							{labels.paymentStatusAll}
						</StatusButton>
						{PAYMENT_STATUS_OPTIONS.map((status) => (
							<StatusButton
								key={status}
								size='small'
								onClick={() => togglePaymentStatus(status)}
								isActive={paymentStatuses.includes(status)}
							>
								{paymentStatusLabel(status)}
							</StatusButton>
						))}
						{!paymentAllActive && (
							<Button size='small' onClick={clearPaymentStatuses}>
								{labels.paymentStatusClear}
							</Button>
						)}
					</div>
					<div className='hint'>{labels.paymentStatusTip}</div>
				</PaymentStatusBar>
			)}

			{loading && (
				<LoadingRow>
					<Spin />
				</LoadingRow>
			)}

			{error && <Alert type='error' message={error} />}

			{!loading && !error && (
				<>
					<SummaryRow>
						<SummaryCard>
							<span>{labels.totalUnits}</span>
							<strong>{formatInt(totalUnits)}</strong>
						</SummaryCard>
						<SummaryCard>
							<span>{labels.totalRooms}</span>
							<strong>{formatInt(totalRooms)}</strong>
						</SummaryCard>
						<SummaryCard>
							<span>{labels.occupiedRoomNights}</span>
							<strong>{formatInt(summary.occupiedRoomNights)}</strong>
						</SummaryCard>
						<SummaryCard>
							<span>{labels.occupancyRate}</span>
							<strong>
								{(Number(summary.averageOccupancyRate || 0) * 100).toFixed(2)}%
							</strong>
						</SummaryCard>
					</SummaryRow>

					<LegendRow>
						<span className='legend-title'>{labels.legend}</span>
						<div className='legend-item'>
							<span
								className='swatch'
								style={{ backgroundColor: heatColor(0.15) }}
							/>
							<span>{labels.legendLow}</span>
						</div>
						<div className='legend-item'>
							<span
								className='swatch'
								style={{ backgroundColor: heatColor(0.5) }}
							/>
							<span>{labels.legendMid}</span>
						</div>
						<div className='legend-item'>
							<span
								className='swatch'
								style={{ backgroundColor: heatColor(0.85) }}
							/>
							<span>{labels.legendHigh}</span>
						</div>
					</LegendRow>

					<TableWrapper>
						<table>
							<thead>
								<tr>
									<th>{labels.date}</th>
									{roomTypes.map((rt) => (
										<th key={rt.key}>
											<div className='type-header'>
												<span
													className='dot'
													style={{ backgroundColor: rt.color }}
												/>
												<span className='type-label' title={rt.label}>
													{rt.label}
												</span>
											</div>
										</th>
									))}
									<th>{labels.total}</th>
								</tr>
							</thead>
							<tbody>
								{days.map((day) => (
									<tr key={day.date}>
										<td className='date-cell'>
											<div className='date-lines'>
												{supportsHijri && (
													<span className='hijri-date'>
														{formatHijriDate(day.date)}
													</span>
												)}
												<span className='greg-date'>{day.date}</span>
											</div>
										</td>
										{roomTypes.map((rt) => {
											const cell = day.rooms?.[rt.key] || {};
											const capacity = Number(cell.capacity) || 0;
											const occupied = Number(cell.occupied) || 0;
											const rate = Number(cell.occupancyRate) || 0;
											return (
												<td key={rt.key}>
													<CellButton
														onClick={() => openDayDetails(day.date, rt)}
														style={{
															background: heatBackground(
																rate,
																cell.overbooked,
															),
															color: getReadableText(rate),
															borderColor: heatBorder(
																rate,
																cell.overbooked,
															),
															boxShadow: heatShadow(
																rate,
																cell.overbooked,
															),
														}}
													>
														{rt.derived && (
															<span className='derived-badge'>
																{labels.derived}
															</span>
														)}
														<div className='cell-main'>
															{formatInt(occupied)}/{formatInt(capacity)}
														</div>
														<div className='cell-sub'>
															{capacity > 0
																? `${(rate * 100).toFixed(0)}%`
																: labels.notAvailable}
														</div>
													</CellButton>
												</td>
											);
										})}
										{(() => {
											const totalOccupied = Number(day.totals?.occupied || 0);
											const totalCapacity = Number(day.totals?.capacity || 0);
											const totalRate =
												totalCapacity > 0 ? totalOccupied / totalCapacity : 0;
											return (
												<td>
													<TotalButton
														type='button'
														onClick={() => openTotalDetails(day.date)}
														style={{
															background: heatBackground(totalRate),
															borderColor: heatBorder(totalRate),
															boxShadow: heatShadow(totalRate),
															color: getReadableText(totalRate),
														}}
													>
														<div className='total-cell'>
															<span className='total-main'>
																{formatInt(totalOccupied)}/
																{formatInt(totalCapacity)}
															</span>
															<span
																className='total-rate'
																style={{ color: getReadableText(totalRate) }}
															>
																{totalCapacity > 0
																	? `${(totalRate * 100).toFixed(0)}%`
																	: labels.notAvailable}
															</span>
														</div>
													</TotalButton>
												</td>
											);
										})()}
									</tr>
								))}
							</tbody>
						</table>
					</TableWrapper>
				</>
			)}

			<Modal
				open={dayModalOpen}
				onCancel={() => setDayModalOpen(false)}
				onOk={() => setDayModalOpen(false)}
				title={modalTitle}
				width={modalOffsets.width}
				style={modalOffsets.style}
				styles={{
					body: {
						padding:
							"clamp(12px, 3vw, 18px) clamp(12px, 4vw, 28px) clamp(16px, 4vw, 22px)",
					},
				}}
			>
				{dayDetailsLoading && (
					<LoadingRow>
						<Spin />
					</LoadingRow>
				)}
				{dayDetailsError && <Alert type='error' message={dayDetailsError} />}
				{!dayDetailsLoading && dayDetails && (
					<ModalBody dir={modalDir}>
						<DetailHeader>
							<div>
								<strong>{labels.hotel}</strong>
								<span>{titleCase(dayDetails?.hotel?.hotelName || labels.na)}</span>
							</div>
							<div>
								<strong>{labels.capacity}</strong>
								<span>{formatInt(dayDetails.capacity || 0)}</span>
							</div>
							<div>
								<strong>{labels.occupied}</strong>
								<span>{formatInt(dayDetails.occupied || 0)}</span>
							</div>
						</DetailHeader>
						<ExportRow $rtl={modalDir === "rtl"}>
							<Button
								size='small'
								onClick={handleExport}
								disabled={!dayDetails?.reservations?.length}
							>
								{labels.exportExcel}
							</Button>
						</ExportRow>
						<ReservationList>
							{Array.isArray(dayDetails.reservations) &&
							dayDetails.reservations.length > 0 ? (
								dayDetails.reservations.map((reservation) => {
									const checkinDate = reservation.checkin_date
										? dayjs(reservation.checkin_date).format("YYYY-MM-DD")
										: labels.na;
									const checkoutDate = reservation.checkout_date
										? dayjs(reservation.checkout_date).format("YYYY-MM-DD")
										: labels.na;
									const hijriCheckin = formatHijriDate(
										reservation.checkin_date,
									);
									const hijriCheckout = formatHijriDate(
										reservation.checkout_date,
									);
									const hijriRangeSeparator = ` ${labels.to} `;
									const hijriRange =
										supportsHijri && (hijriCheckin || hijriCheckout)
											? `${labels.hijri}: ${
													hijriCheckin || labels.na
											  }${hijriRangeSeparator}${hijriCheckout || labels.na}`
											: "";
									const paymentStatus =
										reservation.payment_status ||
										reservation.payment ||
										labels.na;
									return (
										<div key={reservation._id} className='card'>
											<div className='row'>
												<strong>
													{reservation.customer_details?.name || "Guest"}
												</strong>
												<span>{reservation.confirmation_number}</span>
											</div>
											<div className='row'>
												<span>
													{checkinDate} {" -> "} {checkoutDate}
												</span>
												<span>
													{reservation.reservation_status || "status"}
												</span>
											</div>
											<div className='row row-sub'>
												<span>
													{labels.bookingSource}:{" "}
													{reservation.booking_source || labels.na}
												</span>
												<span>
													{labels.paymentStatus}: {paymentStatus}
												</span>
											</div>
											{hijriRange && (
												<div className='row row-sub'>
													<span className='hijri-range'>{hijriRange}</span>
												</div>
											)}
										</div>
									);
								})
							) : (
								<div className='empty'>{labels.noReservations}</div>
							)}
						</ReservationList>
					</ModalBody>
				)}
			</Modal>
		</InventoryWrapper>
	);
};

export default HotelInventory;

const InventoryWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-width: 0;
	max-width: 100%;

	h3 {
		margin: 0;
		font-size: 1.4rem;
		font-weight: bold;
		color: #1f1f1f;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}

	.subtitle {
		color: #5c5c5c;
		font-size: 0.9rem;
		font-weight: 700;
		overflow-wrap: anywhere;
	}

	@media (max-width: 520px) {
		gap: 12px;

		h3 {
			font-size: 1.08rem;
		}

		.subtitle {
			font-size: 0.78rem;
		}
	}
`;

const HeaderRow = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 18px;
	flex-wrap: wrap;
	min-width: 0;
	padding: 18px;
	border: 1px solid rgba(45, 93, 145, 0.18);
	border-radius: 12px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.97) 0%, rgba(247, 251, 255, 0.98) 100%),
		linear-gradient(135deg, rgba(16, 32, 51, 0.06), rgba(111, 31, 120, 0.08));
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.86),
		0 12px 28px rgba(16, 32, 51, 0.07);

	> div {
		min-width: 0;
	}

	.inventory-title {
		flex: 0 1 280px;
		display: flex;
		align-items: center;
		align-self: stretch;
		gap: 12px;
		padding: 12px 14px;
		border: 1px solid rgba(45, 93, 145, 0.16);
		border-radius: 10px;
		background:
			linear-gradient(135deg, rgba(16, 32, 51, 0.04), rgba(47, 102, 159, 0.08)),
			#ffffff;
	}

	.title-icon {
		flex: 0 0 42px;
		width: 42px;
		height: 42px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		background: linear-gradient(135deg, #102033 0%, #24547d 58%, #6f1f78 100%);
		color: #ffffff;
		box-shadow: 0 10px 22px rgba(16, 32, 51, 0.18);
	}

	@media (max-width: 720px) {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
		padding: 12px;
	}

	@media (max-width: 520px) {
		border-radius: 10px;

		.inventory-title {
			padding: 10px;
		}

		.title-icon {
			width: 36px;
			height: 36px;
			flex-basis: 36px;
		}
	}
`;

const Controls = styled.div`
	flex: 1 1 720px;
	display: grid;
	grid-template-columns:
		minmax(190px, 1.15fr)
		minmax(130px, 0.7fr)
		minmax(230px, 1.2fr)
		minmax(240px, 1.2fr)
		minmax(150px, 0.72fr);
	gap: 12px;
	align-items: stretch;
	min-width: 0;

	.control {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 6px;
		font-size: 0.8rem;
		color: #4b5870;
		min-width: 0;
		padding: 10px;
		border: 1px solid rgba(45, 93, 145, 0.16);
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.78);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
	}

	.control > span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		color: #102033;
		font-weight: 800;
		line-height: 1.25;
		text-align: center;
	}

	.control.wide {
		min-width: 0;
	}

	.hijri-controls,
	.month-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		min-width: 0;
	}

	.hijri-controls .muted {
		flex-basis: 100%;
		color: #4b5870;
		font-size: 0.72rem;
		font-weight: 800;
	}

	.range-control .muted {
		margin-top: 2px;
		padding: 5px 8px;
		border-radius: 999px;
		background: linear-gradient(135deg, rgba(16, 32, 51, 0.06), rgba(47, 102, 159, 0.1));
		color: #244e7d;
		font-size: 0.72rem;
		font-weight: 900;
		text-align: center;
	}

	.switch-control {
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.control .ant-select,
	.control .ant-picker {
		width: 100% !important;
		min-width: 0 !important;
	}

	.ant-select-selector,
	.ant-picker {
		min-height: 34px;
		display: flex !important;
		align-items: center !important;
	}

	.ant-select-selection-item,
	.ant-select-selection-placeholder,
	.ant-picker-input > input {
		text-align: center !important;
		font-weight: 700;
	}

	.ant-select-selector,
	.ant-picker {
		border-color: rgba(45, 93, 145, 0.24) !important;
		border-radius: 8px !important;
		box-shadow: none !important;
	}

	.ant-select-focused .ant-select-selector,
	.ant-picker-focused {
		border-color: #6f1f78 !important;
		box-shadow: 0 0 0 3px rgba(111, 31, 120, 0.12) !important;
	}

	.ant-picker-range {
		width: 100%;
		min-width: 0;
	}

	.ant-picker-disabled {
		background: linear-gradient(135deg, #f5f7fb 0%, #edf3fb 100%) !important;
		color: #5f6f88;
	}

	.ant-switch {
		background: linear-gradient(135deg, #9aa9bb 0%, #6d7d91 100%);
	}

	.ant-switch.ant-switch-checked {
		background: linear-gradient(135deg, #6f1f78 0%, #102033 100%);
	}

	@media (max-width: 1280px) {
		grid-template-columns: repeat(3, minmax(0, 1fr));

		.range-control {
			grid-column: span 2;
		}
	}

	@media (max-width: 920px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));

		.range-control {
			grid-column: span 1;
		}
	}

	@media (max-width: 720px) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		width: 100%;
	}

	@media (max-width: 520px) {
		grid-template-columns: 1fr;
		gap: 10px;

		.control {
			min-width: 0;
			width: 100%;
			padding: 9px;
		}

		.hijri-controls,
		.month-actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			width: 100%;
		}

		.hijri-controls .ant-select:first-child,
		.month-actions .ant-picker {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 360px) {
		.hijri-controls,
		.month-actions {
			grid-template-columns: 1fr;
		}
	}
`;

const PaymentStatusBar = styled.div`
	border: 1px solid rgba(45, 93, 145, 0.18);
	border-radius: 12px;
	padding: 12px 14px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 251, 255, 0.96)),
		linear-gradient(135deg, rgba(47, 102, 159, 0.1), rgba(111, 31, 120, 0.08));
	display: flex;
	flex-direction: column;
	gap: 8px;
	text-align: ${(p) => (p.$rtl ? "right" : "left")};
	box-shadow: 0 10px 24px rgba(16, 32, 51, 0.05);

	.label {
		font-weight: 900;
		color: #102033;
		text-align: ${(p) => (p.$rtl ? "right" : "left")};
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		width: 100%;
		justify-content: flex-start;
		direction: ${(p) => (p.$rtl ? "rtl" : "ltr")};
	}

	.hint {
		font-size: 0.75rem;
		color: #6b7280;
		text-align: ${(p) => (p.$rtl ? "right" : "left")};
	}

	@media (max-width: 520px) {
		padding: 9px;

		.buttons {
			gap: 6px;
		}
	}
`;

const StatusButton = styled(Button)`
	font-size: 12px;
	border-color: ${(p) =>
		p.isActive ? "rgba(111, 31, 120, 0.62)" : "rgba(45, 93, 145, 0.24)"};
	background: ${(p) =>
		p.isActive
			? "linear-gradient(135deg, #102033 0%, #24547d 54%, #6f1f78 100%)"
			: "linear-gradient(135deg, #ffffff 0%, #f4f8fe 100%)"};
	color: ${(p) => (p.isActive ? "#ffffff" : "#102033")};
	box-shadow: ${(p) =>
		p.isActive ? "0 8px 18px rgba(16, 32, 51, 0.16)" : "none"};
	font-weight: 800;

	&:hover,
	&:focus {
		border-color: rgba(111, 31, 120, 0.72) !important;
		color: ${(p) => (p.isActive ? "#ffffff" : "#6f1f78")} !important;
	}
`;

const SummaryRow = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 12px;

	@media (max-width: 520px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	@media (max-width: 360px) {
		grid-template-columns: 1fr;
	}
`;

const LegendRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	align-items: center;
	color: #4b5870;
	font-size: 0.8rem;
	padding: 8px 10px;
	border: 1px solid rgba(45, 93, 145, 0.14);
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.74);

	.legend-title {
		font-weight: 900;
		color: #102033;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.swatch {
		width: 18px;
		height: 10px;
		border-radius: 6px;
		display: inline-block;
		box-shadow: inset 0 0 0 1px rgba(16, 32, 51, 0.12);
	}

	@media (max-width: 520px) {
		gap: 8px;
		font-size: 0.72rem;
	}
`;

const SummaryCard = styled.div`
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 249, 255, 0.98)),
		linear-gradient(135deg, rgba(45, 93, 145, 0.08), rgba(111, 31, 120, 0.06));
	border: 1px solid rgba(45, 93, 145, 0.14);
	border-radius: 10px;
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 6px;
	box-shadow: 0 10px 22px rgba(16, 32, 51, 0.05);

	span {
		color: #4b5870;
		font-size: 0.85rem;
		font-weight: 700;
	}

	strong {
		font-size: 1.1rem;
		color: #0f1e3d;
	}

	@media (max-width: 520px) {
		padding: 10px;

		span {
			font-size: 0.72rem;
			line-height: 1.3;
		}

		strong {
			font-size: 0.98rem;
			overflow-wrap: anywhere;
		}
	}
`;

const TableWrapper = styled.div`
	max-height: 80vh;
	overflow: auto;
	-webkit-overflow-scrolling: touch;
	border: 1px solid rgba(45, 93, 145, 0.22);
	border-radius: 12px;
	max-width: 100%;
	background: #ffffff;
	box-shadow: 0 12px 28px rgba(16, 32, 51, 0.07);

	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 720px;
	}

	th,
	td {
		border-bottom: 1px solid rgba(45, 93, 145, 0.1);
		padding: 8px;
		text-align: center;
		vertical-align: middle;
	}

	th {
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
			linear-gradient(180deg, #244e7d 0%, #102033 100%);
		font-size: 0.8rem;
		color: #ffffff;
		position: sticky;
		top: 0;
		z-index: 2;
		height: 52px;
		min-width: 98px;
		line-height: 1.25;
		white-space: normal;
		word-break: break-word;
		overflow-wrap: anywhere;
		border-bottom-color: rgba(103, 167, 223, 0.5);
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.22);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
	}

	th:first-child {
		left: 0;
		z-index: 3;
		min-width: 120px;
	}

	.date-cell {
		color: #102033;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 249, 255, 0.96));
		position: sticky;
		left: 0;
		z-index: 1;
		box-shadow: 2px 0 12px rgba(16, 32, 51, 0.05);
	}

	.date-lines {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 0.72rem;
		line-height: 1.15;
	}

	.hijri-date {
		font-weight: 900;
		color: #102033;
	}

	.greg-date {
		color: #47637f;
		font-size: 0.7rem;
		font-weight: 800;
	}

	.type-header {
		display: flex;
		gap: 6px;
		align-items: center;
		justify-content: center;
		min-height: 38px;
		width: 100%;
		text-align: center;
	}

	.type-label {
		font-size: 11px;
		line-height: 1.2;
		max-width: 140px;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: break-word;
		overflow-wrap: anywhere;
		white-space: normal;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.65),
			0 0 10px rgba(103, 167, 223, 0.45);
	}

	.total-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-weight: 900;
		color: inherit;
	}

	.total-main {
		font-weight: 900;
	}

	.total-rate {
		font-size: 0.75rem;
		font-weight: 900;
		opacity: 0.9;
	}

	@media (max-width: 520px) {
		border-radius: 8px;
		max-height: 70vh;

		table {
			min-width: 620px;
		}

		th,
		td {
			padding: 6px;
		}

		th {
			font-size: 0.7rem;
			height: 48px;
			min-width: 86px;
		}

		.type-label {
			max-width: 100px;
			font-size: 10px;
		}
	}
`;

const CellButton = styled.button`
	width: 100%;
	border: 1px solid #d0d7e5;
	border-radius: 8px;
	padding: 7px 6px;
	cursor: pointer;
	background: #ffffff;
	position: relative;
	overflow: hidden;
	min-height: 52px;
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease,
		filter 0.15s ease;

	&:hover {
		transform: translateY(-1px);
		filter: saturate(1.08) contrast(1.02);
	}

	&::after {
		content: "";
		position: absolute;
		inset: 0;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 42%),
			linear-gradient(0deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0));
		pointer-events: none;
	}

	.derived-badge {
		position: absolute;
		top: 6px;
		left: -28px;
		background: #b45309;
		color: #ffffff;
		padding: 2px 32px;
		font-size: 0.55rem;
		font-weight: 700;
		transform: rotate(-45deg);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
		pointer-events: none;
	}

	.cell-main {
		font-weight: bold;
		font-size: 0.85rem;
		position: relative;
		z-index: 1;
	}

	.cell-sub {
		font-size: 0.7rem;
		opacity: 0.8;
		position: relative;
		z-index: 1;
		font-weight: 800;
	}
`;

const TotalButton = styled.button`
	width: 100%;
	border: 1px solid #d0d7e5;
	border-radius: 8px;
	padding: 7px 6px;
	cursor: pointer;
	background: #ffffff;
	min-height: 52px;
	position: relative;
	overflow: hidden;
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease,
		filter 0.15s ease;

	&:hover {
		transform: translateY(-1px);
		filter: saturate(1.08) contrast(1.02);
	}

	&::after {
		content: "";
		position: absolute;
		inset: 0;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0) 42%),
			linear-gradient(0deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0));
		pointer-events: none;
	}

	.total-cell {
		position: relative;
		z-index: 1;
	}
`;

const LoadingRow = styled.div`
	display: flex;
	justify-content: center;
	padding: 20px;
`;

const DetailHeader = styled.div`
	background: #f6f8fb;
	border: 1px solid #e2e6ef;
	border-radius: 12px;
	padding: 10px 12px;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: 10px;
	margin-bottom: 12px;

	div {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	strong {
		color: #0f1e3d;
		font-size: 0.85rem;
	}

	span {
		color: #4a4a4a;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	@media (max-width: 520px) {
		grid-template-columns: 1fr;
		padding: 9px;
		gap: 8px;
	}
`;

const ModalBody = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
`;

const ExportRow = styled.div`
	display: flex;
	justify-content: ${(props) => (props.$rtl ? "flex-start" : "flex-end")};
`;

const ReservationList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0;

	.card {
		border: 1px solid #e2e6ef;
		border-radius: 10px;
		padding: 12px 18px;
		background: #fafbff;
		min-width: 0;
	}

	.row {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		gap: 12px;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.row-sub {
		font-size: 0.78rem;
		color: #6b7280;
	}

	.hijri-range {
		font-weight: 600;
	}

	.empty {
		color: #5c5c5c;
		font-size: 0.9rem;
	}

	@media (max-width: 520px) {
		.card {
			padding: 10px 12px;
		}

		.row {
			display: grid;
			grid-template-columns: 1fr;
			gap: 4px;
			font-size: 0.78rem;
		}

		.row-sub {
			font-size: 0.72rem;
		}
	}
`;

const ModalTitle = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;

	.modal-main {
		font-weight: 600;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}

	.modal-sub {
		font-size: 0.85rem;
		color: #5c5c5c;
		overflow-wrap: anywhere;
	}

	@media (max-width: 520px) {
		.modal-main {
			font-size: 0.9rem;
		}

		.modal-sub {
			font-size: 0.75rem;
		}
	}
`;
