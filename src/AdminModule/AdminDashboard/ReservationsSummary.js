import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import * as XLSX from "xlsx";
import CountUp from "react-countup";
import {
	AppstoreOutlined,
	ArrowDownOutlined,
	ArrowUpOutlined,
	CalendarOutlined,
	CheckCircleOutlined,
	DollarCircleOutlined,
	DownloadOutlined,
	EyeOutlined,
	InfoCircleOutlined,
	LoginOutlined,
	LogoutOutlined,
	MinusOutlined,
	NumberOutlined,
	ReloadOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import { Alert, Button, Empty, Modal, Spin, Table, Tag, Tooltip, message } from "antd";
import { isAuthenticated } from "../../auth";
import MoreDetails from "../AllReservation/MoreDetails";
import {
	getAdminReservationById,
	getAdminReservationExecutiveSummary,
} from "../apiAdmin";
import { ADMIN_DASHBOARD_DAYS } from "./adminDashboardQuery";
import {
	buildReservationSummaryExportRows,
	formatReservationSummaryDate,
	formatReservationSummaryNumber,
} from "./reservationSummaryUtils";
import { getRoomTypeDisplayLabel } from "../AllReservation/reservationRoomDetails";

const copy = {
	en: {
		eyebrow: "PLATFORM OPERATIONS",
		title: "Reservations Executive Summary",
		description:
			"A focused daily view of arrivals, departures, and reservations created across your permitted hotels.",
		today: "Today",
		yesterday: "Yesterday",
		tomorrow: "Tomorrow",
		checkins: "Check-ins",
		checkouts: "Check-outs",
		newReservations: "New reservations",
		checkinsMeta: "Expected arrivals",
		checkoutsMeta: "Expected departures",
		newReservationsMeta: "Created on this date",
		reservationCount: "Reservations",
		sarValue: "SAR value",
		variance: "Change",
		versusPrevious: "vs prior day",
		newSincePrevious: "NEW",
		totalAmount: "Total reservation amount",
		totalAmountMeta: "Sum of total_amount across unique rows",
		mixedCurrencies: "Multiple currencies are shown separately in the table",
		amountsVerified: "amounts reconciled",
		amountsNeedReview: "amounts need review",
		unique: "unique reservations",
		tableTitle: "Reservation activity",
		tableSubtitle: "Every reservation represented in the selected summary",
		activityFilters: "Filter reservation activity",
		allActivity: "All",
		arrivalActivity: "Arrival",
		departureActivity: "Departure",
		newlyCreatedActivity: "Newly Created",
		chooseActivityFilter: "Select one or more activity filters to show reservations.",
		exportExcel: "Export to Excel",
		exportSuccess: "Executive summary exported successfully.",
		nothingToExport: "There are no reservations to export for this date.",
		retry: "Retry",
		empty: "No reservation activity for this date.",
		activity: "Activity",
		confirmation: "Confirmation #",
		hotel: "Hotel",
		guest: "Guest",
		roomType: "Room Type",
		roomNumber: "Room #",
		checkinDate: "Check-in",
		checkoutDate: "Check-out",
		createdAt: "Created",
		status: "Status",
		rooms: "Rooms",
		guests: "Guests",
		amount: "Amount",
		index: "#",
		actions: "Actions",
		moreDetails: "More details",
		detailsLoading: "Loading the complete reservation details...",
		detailsError: "The reservation details could not be loaded.",
		nights: "Nights",
		nightsUnit: "nights",
		amountVerified: "Verified against the reservation's daily room pricing",
		amountUnverified: "Daily pricing was unavailable for automatic reconciliation",
		amountReview: "Stored total differs from the daily room pricing and needs review",
		miladi: "Miladi",
		hijri: "Hijri (Umm al-Qura)",
		makkahTime: "Makkah Time",
		source: "Source",
		checkinActivity: "Check-in",
		checkoutActivity: "Check-out",
		newActivity: "New reservation",
		loadError: "The reservation summary could not be loaded.",
	},
	ar: {
		eyebrow: "\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629",
		title:
			"\u0627\u0644\u0645\u0644\u062e\u0635 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a \u0644\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		description:
			"\u0639\u0631\u0636 \u064a\u0648\u0645\u064a \u0645\u0631\u0643\u0632 \u0644\u0644\u0648\u0635\u0648\u0644 \u0648\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629 \u0648\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0639\u0628\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u0635\u0631\u062d \u0628\u0647\u0627.",
		today: "\u0627\u0644\u064a\u0648\u0645",
		yesterday: "\u0623\u0645\u0633",
		tomorrow: "\u063a\u062f\u0627\u064b",
		checkins: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0648\u0635\u0648\u0644",
		checkouts: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		newReservations:
			"\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629",
		checkinsMeta: "\u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0645\u062a\u0648\u0642\u0639",
		checkoutsMeta:
			"\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629 \u0627\u0644\u0645\u062a\u0648\u0642\u0639\u0629",
		newReservationsMeta:
			"\u062a\u0645 \u0625\u0646\u0634\u0627\u0624\u0647\u0627 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
		reservationCount: "\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		sarValue: "\u0627\u0644\u0642\u064a\u0645\u0629 \u0628\u0627\u0644\u0631\u064a\u0627\u0644",
		variance: "\u0627\u0644\u062a\u063a\u064a\u0631",
		versusPrevious: "\u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u064a\u0648\u0645 \u0627\u0644\u0633\u0627\u0628\u0642",
		newSincePrevious: "\u062c\u062f\u064a\u062f",
		totalAmount: "\u0625\u062c\u0645\u0627\u0644\u064a \u0645\u0628\u0627\u0644\u063a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		totalAmountMeta: "\u0645\u062c\u0645\u0648\u0639 total_amount \u0644\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0641\u0631\u064a\u062f\u0629",
		mixedCurrencies: "\u062a\u0638\u0647\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u062a \u0627\u0644\u0645\u062e\u062a\u0644\u0641\u0629 \u0645\u0646\u0641\u0635\u0644\u0629 \u0641\u064a \u0627\u0644\u062c\u062f\u0648\u0644",
		amountsVerified: "\u0645\u0628\u0627\u0644\u063a \u0645\u062a\u0637\u0627\u0628\u0642\u0629",
		amountsNeedReview: "\u0645\u0628\u0627\u0644\u063a \u062a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629",
		unique: "\u062d\u062c\u0648\u0632\u0627\u062a \u0641\u0631\u064a\u062f\u0629",
		tableTitle: "\u0646\u0634\u0627\u0637 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		tableSubtitle:
			"\u0643\u0644 \u062d\u062c\u0632 \u0645\u0645\u062b\u0644 \u0641\u064a \u0627\u0644\u0645\u0644\u062e\u0635 \u0627\u0644\u0645\u062d\u062f\u062f",
		activityFilters:
			"\u062a\u0635\u0641\u064a\u0629 \u0646\u0634\u0627\u0637 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		allActivity: "\u0627\u0644\u0643\u0644",
		arrivalActivity: "\u0627\u0644\u0648\u0635\u0648\u0644",
		departureActivity: "\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		newlyCreatedActivity:
			"\u0627\u0644\u0645\u0646\u0634\u0623\u0629 \u062d\u062f\u064a\u062b\u0627\u064b",
		chooseActivityFilter:
			"\u062d\u062f\u062f \u0646\u0648\u0639\u0627\u064b \u0648\u0627\u062d\u062f\u0627\u064b \u0623\u0648 \u0623\u0643\u062b\u0631 \u0644\u0639\u0631\u0636 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a.",
		exportExcel: "\u062a\u0635\u062f\u064a\u0631 Excel",
		exportSuccess:
			"\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0645\u0644\u062e\u0635 \u0628\u0646\u062c\u0627\u062d.",
		nothingToExport:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u062a\u0627\u0631\u064a\u062e.",
		retry: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",
		empty:
			"\u0644\u0627 \u064a\u0648\u062c\u062f \u0646\u0634\u0627\u0637 \u062d\u062c\u0648\u0632\u0627\u062a \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u062a\u0627\u0631\u064a\u062e.",
		activity: "\u0627\u0644\u0646\u0634\u0627\u0637",
		confirmation: "\u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
		hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
		guest: "\u0627\u0644\u0636\u064a\u0641",
		roomType: "\u0646\u0648\u0639 \u0627\u0644\u063a\u0631\u0641\u0629",
		roomNumber: "\u0631\u0642\u0645 \u0627\u0644\u063a\u0631\u0641\u0629",
		checkinDate: "\u0627\u0644\u0648\u0635\u0648\u0644",
		checkoutDate: "\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		createdAt: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
		status: "\u0627\u0644\u062d\u0627\u0644\u0629",
		rooms: "\u0627\u0644\u063a\u0631\u0641",
		guests: "\u0627\u0644\u0636\u064a\u0648\u0641",
		amount: "\u0627\u0644\u0645\u0628\u0644\u063a",
		index: "#",
		actions: "\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
		moreDetails: "\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
		detailsLoading: "\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062d\u062c\u0632 \u0627\u0644\u0643\u0627\u0645\u0644\u0629...",
		detailsError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062d\u062c\u0632.",
		nights: "\u0644\u064a\u0627\u0644\u064d",
		nightsUnit: "\u0644\u064a\u0627\u0644\u064d",
		amountVerified: "\u0645\u062a\u0637\u0627\u0628\u0642 \u0645\u0639 \u0627\u0644\u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u064a\u0648\u0645\u064a \u0644\u063a\u0631\u0641 \u0627\u0644\u062d\u062c\u0632",
		amountUnverified: "\u0627\u0644\u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u064a\u0648\u0645\u064a \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u0644\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u062a\u0644\u0642\u0627\u0626\u064a\u0629",
		amountReview: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062d\u0641\u0648\u0638 \u064a\u062e\u062a\u0644\u0641 \u0639\u0646 \u0627\u0644\u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u064a\u0648\u0645\u064a \u0648\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629",
		miladi: "\u0627\u0644\u0645\u064a\u0644\u0627\u062f\u064a",
		hijri: "\u0627\u0644\u0647\u062c\u0631\u064a (\u0623\u0645 \u0627\u0644\u0642\u0631\u0649)",
		makkahTime: "\u062a\u0648\u0642\u064a\u062a \u0645\u0643\u0629 \u0627\u0644\u0645\u0643\u0631\u0645\u0629",
		source: "\u0627\u0644\u0645\u0635\u062f\u0631",
		checkinActivity: "\u0648\u0635\u0648\u0644",
		checkoutActivity: "\u0645\u063a\u0627\u062f\u0631\u0629",
		newActivity: "\u062d\u062c\u0632 \u062c\u062f\u064a\u062f",
		loadError:
			"\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0645\u0644\u062e\u0635 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a.",
	},
};

const activityTone = {
	checkin: "cyan",
	checkout: "purple",
	"new-reservation": "green",
};

const ALL_ACTIVITY_FILTER = "all";

const noop = () => {};

export const RESERVATION_SUMMARY_COLUMN_WIDTHS = Object.freeze({
	index: 44,
	activity: 102,
	confirmation: 116,
	hotel: 118,
	guest: 134,
	roomType: 138,
	roomNumber: 104,
	checkinDate: 136,
	checkoutDate: 136,
	createdAt: 136,
	status: 196,
	rooms: 56,
	guests: 58,
	nights: 56,
	amount: 180,
	source: 104,
	actions: 118,
});

export const RESERVATION_SUMMARY_TABLE_WIDTH = Object.values(
	RESERVATION_SUMMARY_COLUMN_WIDTHS
).reduce((total, width) => total + width, 0);

const statusTone = (status = "") => {
	const normalized = String(status || "")
		.toLowerCase()
		.replace(/[_-]+/g, " ");
	if (/cancel|reject|inactive|no\s?show/.test(normalized)) return "red";
	if (/early checked out|checked out|closed/.test(normalized)) return "green";
	if (/inhouse|in house|checked in/.test(normalized)) return "softGreen";
	if (/agent|commission/.test(normalized)) return "purple";
	if (/pending|review|unfinished|cleaning/.test(normalized)) return "orange";
	if (/confirm|approved/.test(normalized)) return "blue";
	if (/active|finish|done|clean/.test(normalized)) return "green";
	return "slate";
};

const localizedStatus = (status = "", isArabic = false) => {
	const raw = status || "-";
	if (!isArabic) return raw;
	const normalized = String(status || "")
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.trim();
	const statuses = {
		confirmed: "\u0645\u0624\u0643\u062f",
		"pending confirmation": "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
		"pending finance review": "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
		inhouse: "\u062f\u0627\u062e\u0644 \u0627\u0644\u0641\u0646\u062f\u0642",
		"in house": "\u062f\u0627\u062e\u0644 \u0627\u0644\u0641\u0646\u062f\u0642",
		"checked out": "\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		"early checked out": "\u0645\u063a\u0627\u062f\u0631\u0629 \u0645\u0628\u0643\u0631\u0629",
		cancelled: "\u0645\u0644\u063a\u064a",
		canceled: "\u0645\u0644\u063a\u064a",
		"no show": "\u0644\u0645 \u064a\u062d\u0636\u0631",
	};
	return statuses[normalized] || raw;
};

const ReservationsSummary = ({
	day,
	onDayChange,
	chosenLanguage,
	reservationId = "",
	onReservationIdChange = noop,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const L = isArabic ? copy.ar : copy.en;
	const locale = isArabic ? "ar-SA-u-nu-latn" : "en-US-u-nu-latn";
	const auth = isAuthenticated();
	const userId = auth?.user?._id || "";
	const token = auth?.token || "";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [reloadKey, setReloadKey] = useState(0);
	const [tablePage, setTablePage] = useState(1);
	const [tablePageSize, setTablePageSize] = useState(20);
	const [selectedActivityFilters, setSelectedActivityFilters] = useState([ALL_ACTIVITY_FILTER]);
	const [detailsReservation, setDetailsReservation] = useState(null);
	const [detailsLoading, setDetailsLoading] = useState(false);
	const [detailsError, setDetailsError] = useState("");
	const [detailsReloadKey, setDetailsReloadKey] = useState(0);
	const loadedDetailsKey = useRef("");

	useEffect(() => {
		const controller = new AbortController();
		let mounted = true;

		if (!userId || !token) {
			setLoading(false);
			setError(L.loadError);
			return () => controller.abort();
		}

		setLoading(true);
		setError("");
		getAdminReservationExecutiveSummary(userId, token, day, {
			signal: controller.signal,
		})
			.then((payload) => {
				if (mounted) setData(payload);
			})
			.catch((requestError) => {
				if (!mounted || requestError?.name === "AbortError") return;
				setError(requestError?.payload?.error || requestError?.message || L.loadError);
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
			controller.abort();
		};
	}, [L.loadError, day, reloadKey, token, userId]);

	const activityLabels = useMemo(
		() => ({
			checkin: L.checkinActivity,
			checkout: L.checkoutActivity,
			"new-reservation": L.newActivity,
		}),
		[L.checkinActivity, L.checkoutActivity, L.newActivity]
	);
	const reservations = useMemo(
		() => (Array.isArray(data?.reservations) ? data.reservations : []),
		[data?.reservations]
	);
	const filteredReservations = useMemo(() => {
		if (selectedActivityFilters.includes(ALL_ACTIVITY_FILTER)) {
			return reservations;
		}
		if (!selectedActivityFilters.length) return [];
		return reservations.filter((reservation) => {
			const types = Array.isArray(reservation?.activityTypes) ? reservation.activityTypes : [];
			return selectedActivityFilters.some((filter) => types.includes(filter));
		});
	}, [reservations, selectedActivityFilters]);
	const activityFilterOptions = useMemo(
		() => [
			{
				key: ALL_ACTIVITY_FILTER,
				label: L.allActivity,
				icon: AppstoreOutlined,
				tone: "all",
			},
			{
				key: "checkin",
				label: L.arrivalActivity,
				icon: LoginOutlined,
				tone: "cyan",
			},
			{
				key: "checkout",
				label: L.departureActivity,
				icon: LogoutOutlined,
				tone: "purple",
			},
			{
				key: "new-reservation",
				label: L.newlyCreatedActivity,
				icon: CheckCircleOutlined,
				tone: "green",
			},
		],
		[L.allActivity, L.arrivalActivity, L.departureActivity, L.newlyCreatedActivity]
	);
	const summary = data?.summary || {};
	const selectedDateValue = data?.date ? `${data.date}T12:00:00.000Z` : null;
	const selectedMiladiDate = selectedDateValue
		? formatReservationSummaryDate(`${data.date}T12:00:00.000Z`, {
				locale,
				calendar: "gregory",
				month: "long",
		  })
		: day;
	const selectedHijriDate = selectedDateValue
		? formatReservationSummaryDate(selectedDateValue, {
				locale,
				calendar: "islamic-umalqura",
				month: "long",
		  })
		: "\u2014";

	useEffect(() => {
		setTablePage(1);
	}, [day]);

	useEffect(() => {
		const lastPage = Math.max(1, Math.ceil(filteredReservations.length / tablePageSize));
		if (tablePage > lastPage) setTablePage(lastPage);
	}, [filteredReservations.length, tablePage, tablePageSize]);

	const toggleActivityFilter = (filter) => {
		setTablePage(1);
		setSelectedActivityFilters((current) => {
			if (filter === ALL_ACTIVITY_FILTER) {
				return current.includes(ALL_ACTIVITY_FILTER) ? [] : [ALL_ACTIVITY_FILTER];
			}

			const withoutAll = current.filter((selected) => selected !== ALL_ACTIVITY_FILTER);
			return withoutAll.includes(filter)
				? withoutAll.filter((selected) => selected !== filter)
				: [...withoutAll, filter];
		});
	};

	useEffect(() => {
		if (!reservationId) {
			loadedDetailsKey.current = "";
			setDetailsReservation(null);
			setDetailsError("");
			setDetailsLoading(false);
			return undefined;
		}
		if (loading || !data) return undefined;

		const summaryRow = reservations.find((row) => row.id === reservationId);
		if (!summaryRow) {
			onReservationIdChange("");
			return undefined;
		}

		const requestKey = `${reservationId}:${detailsReloadKey}`;
		if (loadedDetailsKey.current === requestKey) return undefined;
		loadedDetailsKey.current = requestKey;

		const controller = new AbortController();
		let mounted = true;
		setDetailsLoading(true);
		setDetailsError("");
		setDetailsReservation(null);

		getAdminReservationById(reservationId, token, { signal: controller.signal })
			.then((payload) => {
				if (!mounted) return;
				if (!payload?._id || payload?.error || payload?.message) {
					throw new Error(payload?.error || payload?.message || L.detailsError);
				}
				setDetailsReservation(payload);
			})
			.catch((requestError) => {
				if (!mounted || requestError?.name === "AbortError") return;
				setDetailsError(requestError?.message || L.detailsError);
			})
			.finally(() => {
				if (mounted) setDetailsLoading(false);
			});

		return () => {
			mounted = false;
			controller.abort();
		};
	}, [
		L.detailsError,
		data,
		detailsReloadKey,
		loading,
		onReservationIdChange,
		reservationId,
		reservations,
		token,
	]);

	const amountQualityLabels = useMemo(
		() => ({
			verified: L.amountVerified,
			unverified: L.amountUnverified,
			discrepancy: L.amountReview,
			invalid: L.amountReview,
		}),
		[L.amountReview, L.amountUnverified, L.amountVerified]
	);

	const columns = useMemo(
		() => [
			{
				title: L.index,
				key: "index",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.index,
				align: "center",
				render: (_value, row, index) => (
					<NumericText data-testid={`reservation-index-${row.id}`}>
						{(tablePage - 1) * tablePageSize + index + 1}
					</NumericText>
				),
			},
			{
				title: L.activity,
				dataIndex: "activityTypes",
				key: "activity",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.activity,
				align: "center",
				render: (types = []) => (
					<ActivityTags>
						{types.map((type) => (
							<Tag key={type} color={activityTone[type] || "blue"}>
								{activityLabels[type] || type}
							</Tag>
						))}
					</ActivityTags>
				),
			},
			{
				title: L.confirmation,
				dataIndex: "confirmationNumber",
				key: "confirmationNumber",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.confirmation,
				align: "center",
				render: (value) => <Confirmation dir='ltr'>{value || "N/A"}</Confirmation>,
			},
			{
				title: L.hotel,
				dataIndex: "hotel",
				key: "hotel",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.hotel,
				render: (hotel = {}) => (
					<Tooltip title={isArabic && hotel.nameArabic ? hotel.nameArabic : hotel.name}>
						<HotelName>{isArabic && hotel.nameArabic ? hotel.nameArabic : hotel.name}</HotelName>
					</Tooltip>
				),
			},
			{
				title: L.guest,
				dataIndex: "guestName",
				key: "guestName",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.guest,
				render: (value) => (
					<Tooltip title={value}>
						<CellText>{value}</CellText>
					</Tooltip>
				),
			},
			{
				title: L.roomType,
				dataIndex: "roomTypes",
				key: "roomTypes",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.roomType,
				render: (values = []) => {
					const text =
						Array.isArray(values) && values.length
							? values.map(getRoomTypeDisplayLabel).join(", ")
							: "N/A";
					return (
						<Tooltip title={text}>
							<CellText>{text}</CellText>
						</Tooltip>
					);
				},
			},
			{
				title: L.roomNumber,
				dataIndex: "roomNumbers",
				key: "roomNumbers",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.roomNumber,
				align: "center",
				render: (values = []) => (
					<Confirmation dir='ltr'>
						{Array.isArray(values) && values.length ? values.join(", ") : "N/A"}
					</Confirmation>
				),
			},
			{
				title: L.checkinDate,
				dataIndex: "checkinDate",
				key: "checkinDate",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.checkinDate,
				align: "center",
				render: (value) => <DateText dir='auto'>{formatReservationSummaryDate(value, { locale })}</DateText>,
			},
			{
				title: L.checkoutDate,
				dataIndex: "checkoutDate",
				key: "checkoutDate",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.checkoutDate,
				align: "center",
				render: (value) => <DateText dir='auto'>{formatReservationSummaryDate(value, { locale })}</DateText>,
			},
			{
				title: L.createdAt,
				dataIndex: "createdAt",
				key: "createdAt",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.createdAt,
				align: "center",
				render: (value) => <DateText dir='auto'>{formatReservationSummaryDate(value, { locale })}</DateText>,
			},
			{
				title: L.status,
				dataIndex: "status",
				key: "status",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.status,
				align: "center",
				render: (value) => (
					<StatusPill $tone={statusTone(value)}>
						{localizedStatus(value, isArabic)}
					</StatusPill>
				),
			},
			{
				title: L.rooms,
				dataIndex: "rooms",
				key: "rooms",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.rooms,
				align: "center",
				render: (value) => <NumericText>{formatReservationSummaryNumber(value)}</NumericText>,
			},
			{
				title: L.guests,
				dataIndex: "guests",
				key: "guests",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.guests,
				align: "center",
				render: (value) => <NumericText>{formatReservationSummaryNumber(value)}</NumericText>,
			},
			{
				title: L.nights,
				dataIndex: "nights",
				key: "nights",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.nights,
				align: "center",
				render: (value) => <NumericText>{formatReservationSummaryNumber(value)}</NumericText>,
			},
			{
				title: L.amount,
				dataIndex: "totalAmount",
				key: "totalAmount",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.amount,
				align: "end",
				render: (value, row) => {
					const quality = row.amountQuality?.status || "unverified";
					const QualityIcon = quality === "verified" ? CheckCircleOutlined : quality === "unverified" ? InfoCircleOutlined : WarningOutlined;
					return (
						<AmountCell>
							<Amount>
								{formatReservationSummaryNumber(value, {
									minimumFractionDigits: 2,
								})} {row.currency || "SAR"}
							</Amount>
							{row.nights > 0 && row.averageNightlyAmount !== null ? (
								<AmountBreakdown>
									{formatReservationSummaryNumber(row.averageNightlyAmount, {
										minimumFractionDigits: 2,
									})} {row.currency || "SAR"} {"\u00d7"} {formatReservationSummaryNumber(row.nights)} {L.nightsUnit}
								</AmountBreakdown>
							) : null}
							<Tooltip title={amountQualityLabels[quality]}>
								<AmountQuality $status={quality} aria-label={amountQualityLabels[quality]}>
									<QualityIcon />
								</AmountQuality>
							</Tooltip>
						</AmountCell>
					);
				},
			},
			{
				title: L.source,
				dataIndex: "bookingSource",
				key: "bookingSource",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.source,
				align: "center",
				render: (value) => (
					<Tooltip title={value}>
						<CellText>{value}</CellText>
					</Tooltip>
				),
			},
			{
				title: L.actions,
				key: "actions",
				width: RESERVATION_SUMMARY_COLUMN_WIDTHS.actions,
				align: "center",
				render: (_value, row) => (
					<DetailsButton
						type='button'
						onClick={() => onReservationIdChange(row.id)}
					>
						<EyeOutlined />
						<span>{L.moreDetails}</span>
					</DetailsButton>
				),
			},
		],
		[
			L,
			activityLabels,
			amountQualityLabels,
			isArabic,
			locale,
			onReservationIdChange,
			tablePage,
			tablePageSize,
		]
	);

	const exportToExcel = () => {
		if (!filteredReservations.length) {
			message.info(L.nothingToExport);
			return;
		}
		const exportRows = buildReservationSummaryExportRows(filteredReservations, {
			locale,
			activityLabels,
		});
		const worksheet = XLSX.utils.json_to_sheet(exportRows);
		worksheet["!cols"] = [
			{ wch: 28 },
			{ wch: 22 },
			{ wch: 28 },
			{ wch: 28 },
			{ wch: 28 },
			{ wch: 18 },
			{ wch: 16 },
			{ wch: 16 },
			{ wch: 22 },
			{ wch: 20 },
			{ wch: 10 },
			{ wch: 10 },
			{ wch: 10 },
			{ wch: 18 },
			{ wch: 16 },
			{ wch: 20 },
			{ wch: 12 },
			{ wch: 24 },
		];
		if (worksheet["!ref"]) {
			worksheet["!autofilter"] = { ref: worksheet["!ref"] };
		}
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Reservations Summary");
		XLSX.writeFile(workbook, `reservation-executive-summary-${data?.date || day}.xlsx`);
		message.success(L.exportSuccess);
	};

	const metricFor = (key, legacyValue) => {
		const metric = summary.metrics?.[key] || {};
		return {
			count: metric.count ?? legacyValue ?? 0,
			sarAmount: metric.sarAmount ?? 0,
			variancePercent: metric.variancePercent ?? null,
			varianceState: metric.varianceState || "unchanged",
		};
	};
	const scorecards = [
		{
			key: "checkins",
			title: L.checkins,
			metric: metricFor("checkins", summary.checkins),
			icon: LoginOutlined,
			tone: "cyan",
		},
		{
			key: "checkouts",
			title: L.checkouts,
			metric: metricFor("checkouts", summary.checkouts),
			icon: LogoutOutlined,
			tone: "purple",
		},
		{
			key: "new",
			title: L.newReservations,
			metric: metricFor("newReservations", summary.newReservations),
			icon: CheckCircleOutlined,
			tone: "green",
		},
	];

	return (
		<SummarySurface>
			<ExecutiveHeader>
				<HeaderCopy>
					<Eyebrow>{L.eyebrow}</Eyebrow>
					<h1>{L.title}</h1>
					<p>{L.description}</p>
				</HeaderCopy>
				<DateOverview>
					<ZoneLine>
						<CalendarOutlined />
						<strong>{L.makkahTime}</strong>
						<span dir='ltr'>{data?.timezoneOffset || "UTC+03:00"}</span>
					</ZoneLine>
					<DateLine>
						<span>{L.miladi}</span>
						<strong>{selectedMiladiDate}</strong>
					</DateLine>
					<DateLine>
						<span>{L.hijri}</span>
						<strong>{selectedHijriDate}</strong>
					</DateLine>
				</DateOverview>
				<DayFilters aria-label='Reservation summary date filter'>
					{[
						[ADMIN_DASHBOARD_DAYS.YESTERDAY, L.yesterday],
						[ADMIN_DASHBOARD_DAYS.TODAY, L.today],
						[ADMIN_DASHBOARD_DAYS.TOMORROW, L.tomorrow],
					].map(([value, label]) => (
						<DayButton
							key={value}
							type='button'
							$active={day === value}
							aria-pressed={day === value}
							onClick={() => onDayChange(value)}
						>
							{label}
						</DayButton>
					))}
				</DayFilters>
			</ExecutiveHeader>

			<ScoreGrid aria-label='Executive reservation totals'>
				{scorecards.map((card) => {
					const Icon = card.icon;
					const TrendIcon =
						card.metric.varianceState === "increase" ||
						card.metric.varianceState === "new"
							? ArrowUpOutlined
							: card.metric.varianceState === "decrease"
							  ? ArrowDownOutlined
							  : MinusOutlined;
					const varianceLabel =
						card.metric.varianceState === "new"
							? L.newSincePrevious
							: `${card.metric.variancePercent > 0 ? "+" : ""}${formatReservationSummaryNumber(
									card.metric.variancePercent || 0,
									{ maximumFractionDigits: 1 }
								)}%`;
					return (
						<ScoreCard key={card.key} $tone={card.tone}>
							<ScoreHeading>
								<ScoreIcon $tone={card.tone}>
									<Icon />
								</ScoreIcon>
								<h2>{card.title}</h2>
							</ScoreHeading>
							<ScoreMetrics>
								<Metric>
									<MetricLabel><NumberOutlined /> {L.reservationCount}</MetricLabel>
									<MetricValue dir='ltr' data-testid={`${card.key}-count`}>
										<CountUp end={Number(card.metric.count) || 0} duration={0.75} separator=',' />
									</MetricValue>
								</Metric>
								<Metric>
									<MetricLabel><DollarCircleOutlined /> {L.sarValue}</MetricLabel>
									<AmountMetricValue dir='ltr' data-testid={`${card.key}-amount`}>
										<Currency>SAR</Currency>{" "}
										<CountUp
											end={Number(card.metric.sarAmount) || 0}
											duration={0.75}
											separator=','
											decimals={2}
										/>
									</AmountMetricValue>
								</Metric>
								<Metric $trend={card.metric.varianceState}>
									<MetricLabel><TrendIcon /> {L.variance}</MetricLabel>
									<TrendValue
										dir='ltr'
										$trend={card.metric.varianceState}
										data-testid={`${card.key}-variance`}
									>
										{varianceLabel}
									</TrendValue>
									<VarianceCaption>{L.versusPrevious}</VarianceCaption>
								</Metric>
							</ScoreMetrics>
						</ScoreCard>
					);
				})}
			</ScoreGrid>

			<TablePanel>
				<TableHeading>
					<TableTitle>
						<h2>{L.tableTitle}</h2>
						<p>{L.tableSubtitle}</p>
					</TableTitle>
					<ActivityFilterBar role='group' aria-label={L.activityFilters}>
						{activityFilterOptions.map((filter) => {
							const Icon = filter.icon;
							const isActive = selectedActivityFilters.includes(filter.key);
							return (
								<ActivityFilterButton
									key={filter.key}
									type='button'
									$tone={filter.tone}
									$active={isActive}
									aria-label={filter.label}
									aria-pressed={isActive}
									onClick={() => toggleActivityFilter(filter.key)}
								>
									<FilterIcon $tone={filter.tone} $active={isActive}>
										<Icon />
									</FilterIcon>
									<FilterLabel>{filter.label}</FilterLabel>
								</ActivityFilterButton>
							);
						})}
					</ActivityFilterBar>
					<TableActions>
						<UniqueCount>
							{filteredReservations.length} {L.unique}
						</UniqueCount>
						<Button
							type='primary'
							icon={<DownloadOutlined />}
							aria-label={L.exportExcel}
							onClick={exportToExcel}
							disabled={!filteredReservations.length}
						>
							{L.exportExcel}
						</Button>
					</TableActions>
				</TableHeading>

				{error ? (
					<Alert
						type='error'
						showIcon
						message={error}
						action={
							<Button
								size='small'
								icon={<ReloadOutlined />}
								onClick={() => setReloadKey((value) => value + 1)}
							>
								{L.retry}
							</Button>
						}
					/>
				) : null}

				<Table
					rowKey={(row) => row.id}
					columns={columns}
					dataSource={filteredReservations}
					loading={{ spinning: loading, tip: L.tableTitle }}
					scroll={{ x: RESERVATION_SUMMARY_TABLE_WIDTH }}
					tableLayout='fixed'
					sticky
					size='middle'
					pagination={{
						current: tablePage,
						pageSize: tablePageSize,
						showSizeChanger: true,
						pageSizeOptions: [20, 40, 60],
						showTotal: (total) =>
							`${formatReservationSummaryNumber(total)} ${L.unique}`,
					}}
					onChange={(pagination) => {
						const nextSize = pagination.pageSize || 20;
						setTablePageSize(nextSize);
						setTablePage(nextSize === tablePageSize ? pagination.current || 1 : 1);
					}}
					locale={{
						emptyText: (
							<Empty
								description={selectedActivityFilters.length ? L.empty : L.chooseActivityFilter}
								image={Empty.PRESENTED_IMAGE_SIMPLE}
							/>
						),
					}}
				/>
			</TablePanel>

			<Modal
				open={Boolean(reservationId)}
				onCancel={() => onReservationIdChange("")}
				width='min(98vw, 1720px)'
				centered
				className='admin-reservation-details-modal reservation-details-modal'
				rootClassName='admin-reservation-details-layer'
				wrapClassName='admin-reservation-details-wrap'
				footer={null}
				destroyOnClose
				getContainer={() => document.body}
				zIndex={16000}
				styles={{
					mask: { zIndex: 15999 },
					header: { display: "none" },
					content: { padding: "6px 8px 8px" },
					body: { maxHeight: "92vh", overflowY: "auto", padding: "0" },
				}}
			>
				{detailsLoading ? (
					<DetailsState>
						<Spin size='large' />
						<strong>{L.detailsLoading}</strong>
					</DetailsState>
				) : detailsError ? (
					<DetailsState>
						<Alert
							type='error'
							showIcon
							message={detailsError}
							action={
								<Button
									size='small'
									icon={<ReloadOutlined />}
									onClick={() => setDetailsReloadKey((value) => value + 1)}
								>
									{L.retry}
								</Button>
							}
						/>
					</DetailsState>
				) : detailsReservation ? (
					<MoreDetails
						key={detailsReservation._id}
						selectedReservation={detailsReservation}
						hotelDetails={detailsReservation.hotelId}
						reservation={detailsReservation}
						setReservation={setDetailsReservation}
						onReservationUpdated={(updated) => {
							if (updated) setDetailsReservation(updated);
							setReloadKey((value) => value + 1);
						}}
					/>
				) : null}
			</Modal>
		</SummarySurface>
	);
};

export default ReservationsSummary;

const tones = {
	cyan: {
		accent: "#0787a6",
		background: "linear-gradient(135deg, #effcff 0%, #d9f5fb 100%)",
		shadow: "rgba(7, 135, 166, 0.2)",
	},
	purple: {
		accent: "#6d4bb0",
		background: "linear-gradient(135deg, #fbf8ff 0%, #ece4ff 100%)",
		shadow: "rgba(109, 75, 176, 0.2)",
	},
	green: {
		accent: "#16815c",
		background: "linear-gradient(135deg, #f1fff8 0%, #dcf7e9 100%)",
		shadow: "rgba(22, 129, 92, 0.2)",
	},
	amber: {
		accent: "#a76608",
		background: "linear-gradient(135deg, #fffaf0 0%, #ffedc7 100%)",
		shadow: "rgba(167, 102, 8, 0.18)",
	},
};

const SummarySurface = styled.section`
	min-width: 0;
	border: 1px solid #d8e7f5;
	border-radius: 16px;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.98)), #fff;
	box-shadow: 0 18px 44px rgba(8, 42, 75, 0.09);
	overflow: hidden;
`;

const ExecutiveHeader = styled.header`
	display: grid;
	grid-template-columns: minmax(340px, 1.18fr) minmax(440px, 1fr) minmax(260px, 0.68fr);
	gap: 11px;
	align-items: center;
	padding: 9px 14px;
	background: radial-gradient(circle at 88% 0%, rgba(52, 181, 229, 0.27), transparent 36%),
		linear-gradient(135deg, #071827 0%, #0d335d 45%, #155d95 100%);
	color: #fff;

	@media (max-width: 1050px) {
		grid-template-columns: minmax(0, 1fr) minmax(430px, 1.15fr);
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
		gap: 9px;
		padding: 11px;
	}
`;

const HeaderCopy = styled.div`
	display: grid;
	align-content: center;
	min-width: 0;
	text-align: start;

	h1 {
		margin: 1px 0 3px;
		color: #fff;
		font-size: clamp(1.22rem, 1.65vw, 1.52rem);
		font-weight: 950;
		line-height: 1.08;
		letter-spacing: -0.025em;
	}

	p {
		max-width: 700px;
		margin: 0;
		color: rgba(235, 247, 255, 0.82);
		font-size: 0.78rem;
		font-weight: 650;
		line-height: 1.3;
	}
`;

const Eyebrow = styled.span`
	color: #80daf7;
	font-size: 0.62rem;
	font-weight: 950;
	letter-spacing: 0.16em;
`;

const DateOverview = styled.div`
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
	gap: 8px;
	align-items: center;
	min-height: 48px;
	padding: 6px 8px;
	border: 1px solid rgba(201, 235, 255, 0.28);
	border-radius: 10px;
	background: rgba(5, 24, 43, 0.44);
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.08);

	@media (max-width: 560px) {
		grid-template-columns: 1fr 1fr;
		min-height: 0;
	}
`;

const ZoneLine = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-width: max-content;
	padding-inline-end: 9px;
	border-inline-end: 1px solid rgba(201, 235, 255, 0.18);

	svg {
		color: #80daf7;
		font-size: 1rem;
	}

	strong {
		font-size: 0.72rem;
		font-weight: 950;
	}

	span {
		color: rgba(224, 242, 254, 0.7);
		font-size: 0.64rem;
		font-weight: 700;
	}

	@media (max-width: 560px) {
		grid-column: 1 / -1;
		justify-content: center;
		padding: 0 0 6px;
		border-inline-end: 0;
		border-bottom: 1px solid rgba(201, 235, 255, 0.18);
	}
`;

const DateLine = styled.div`
	display: grid;
	gap: 1px;
	min-width: 0;

	span {
		color: #80daf7;
		font-size: 0.62rem;
		font-weight: 900;
	}

	strong {
		overflow: hidden;
		color: #fff;
		font-size: 0.74rem;
		font-weight: 850;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const DayFilters = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 5px;
	padding: 3px;
	border: 1px solid rgba(191, 219, 254, 0.28);
	border-radius: 11px;
	background: rgba(2, 18, 34, 0.48);

	@media (max-width: 1050px) {
		grid-column: 1 / -1;
	}

	@media (max-width: 760px) {
		grid-column: auto;
	}
`;

const DayButton = styled.button`
	min-height: 35px;
	border: 1px solid ${(props) => (props.$active ? "#8ddcff" : "transparent")};
	border-radius: 8px;
	background: ${(props) =>
		props.$active ? "linear-gradient(135deg, #2490c8 0%, #0d4d79 100%)" : "transparent"};
	box-shadow: ${(props) => (props.$active ? "0 7px 18px rgba(0, 0, 0, 0.24)" : "none")};
	color: ${(props) => (props.$active ? "#fff" : "rgba(230, 245, 255, 0.76)")};
	cursor: pointer;
	font-size: 0.79rem;
	font-weight: 900;
	transition:
		background 0.2s ease,
		border-color 0.2s ease,
		color 0.2s ease,
		box-shadow 0.2s ease;

	&:hover {
		color: #fff;
		border-color: rgba(141, 220, 255, 0.72);
	}
`;

const ScoreGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
	padding: 12px 14px;
	background: linear-gradient(180deg, #f7fbff 0%, #f2f7fc 100%);

	@media (max-width: 1050px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 620px) {
		grid-template-columns: 1fr;
		padding: 10px;
	}
`;

const ScoreCard = styled.article`
	position: relative;
	display: grid;
	grid-template-rows: auto 1fr;
	gap: 8px;
	min-height: 112px;
	padding: 10px 12px;
	border: 1px solid ${(props) => tones[props.$tone].accent}35;
	border-radius: 13px;
	background: ${(props) => tones[props.$tone].background};
	box-shadow: 0 10px 24px ${(props) => tones[props.$tone].shadow};
	overflow: hidden;

	&::after {
		content: "";
		position: absolute;
		inset-inline-end: -28px;
		inset-block-start: -44px;
		width: 104px;
		height: 104px;
		border-radius: 999px;
		background: ${(props) => tones[props.$tone].accent}10;
	}
`;

const ScoreHeading = styled.div`
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	gap: 9px;
	min-width: 0;

	h2 {
		margin: 0;
		color: #173047;
		font-size: 0.96rem;
		font-weight: 950;
		line-height: 1.2;
	}
`;

const ScoreIcon = styled.span`
	position: relative;
	z-index: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	flex: 0 0 34px;
	border-radius: 10px;
	background: ${(props) => tones[props.$tone].accent};
	box-shadow:
		inset 0 1px rgba(255, 255, 255, 0.3),
		0 9px 20px ${(props) => tones[props.$tone].shadow};
	color: #fff;
	font-size: 1rem;
`;

const ScoreMetrics = styled.div`
	position: relative;
	z-index: 1;
	display: grid;
	grid-template-columns: 0.72fr 1.25fr 0.9fr;
	align-items: stretch;
	min-width: 0;
	border: 1px solid rgba(65, 96, 123, 0.13);
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.66);
	overflow: hidden;

	@media (max-width: 430px) {
		grid-template-columns: 1fr;
	}
`;

const Metric = styled.div`
	display: grid;
	align-content: center;
	gap: 3px;
	min-width: 0;
	padding: 8px 10px;
	border-inline-end: 1px solid rgba(65, 96, 123, 0.13);
	background: ${(props) =>
		props.$trend === "increase" || props.$trend === "new"
			? "rgba(225, 249, 237, 0.54)"
			: props.$trend === "decrease"
			  ? "rgba(255, 235, 235, 0.58)"
			  : "transparent"};

	&:last-child {
		border-inline-end: 0;
	}

	@media (max-width: 430px) {
		border-inline-end: 0;
		border-bottom: 1px solid rgba(65, 96, 123, 0.13);

		&:last-child {
			border-bottom: 0;
		}
	}
`;

const MetricLabel = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 5px;
	color: #526a7f;
	font-size: 0.76rem;
	font-weight: 850;
	line-height: 1.1;
	white-space: nowrap;

	svg {
		color: #247ca8;
		font-size: 0.78rem;
	}
`;

const MetricValue = styled.strong`
	color: #102033;
	font-size: clamp(1.42rem, 1.8vw, 1.72rem);
	font-weight: 950;
	font-variant-numeric: tabular-nums;
	line-height: 1;
`;

const AmountMetricValue = styled(MetricValue)`
	font-size: clamp(1rem, 1.25vw, 1.2rem);
	white-space: nowrap;
`;

const TrendValue = styled(MetricValue)`
	color: ${(props) =>
		props.$trend === "increase" || props.$trend === "new"
			? "#0b7a4c"
			: props.$trend === "decrease"
			  ? "#b42332"
			  : "#4f6477"};
	font-size: clamp(1rem, 1.25vw, 1.2rem);
`;

const VarianceCaption = styled.small`
	color: #667b8d;
	font-size: 0.68rem;
	font-weight: 750;
	line-height: 1.05;
`;

const Currency = styled.span`
	font-size: 0.72em;
	font-weight: 900;
	white-space: nowrap;
`;

const TablePanel = styled.div`
	min-width: 0;
	padding: 0 12px 14px;
	background: #f7fbff;

	.ant-alert {
		margin-bottom: 12px;
	}

	.ant-table-wrapper {
		border: 1px solid #d6e4f0;
		border-radius: 11px;
		overflow: hidden;
		background: #fff;
	}

	.ant-table-thead > tr > th {
		padding: 9px 7px !important;
		border-bottom-color: #21567e !important;
		background: linear-gradient(180deg, #1b6fa5 0%, #09223a 100%) !important;
		color: #fff !important;
		font-size: 0.81rem;
		font-weight: 900;
		text-overflow: clip !important;
		white-space: nowrap !important;

		.ant-table-column-title {
			overflow: visible;
			text-overflow: clip;
			white-space: nowrap;
		}
	}

	.ant-table-tbody > tr > td {
		padding: 9px 7px;
		font-size: 0.8rem;
	}

	.ant-table-tbody > tr:nth-child(even) > td {
		background: #f7fbff;
	}

	.ant-table-tbody > tr:hover > td {
		background: #eaf6ff !important;
	}

	@media (max-width: 600px) {
		padding: 0 10px 12px;
	}
`;

const TableHeading = styled.div`
	display: grid;
	grid-template-columns: minmax(210px, 1fr) minmax(420px, auto) minmax(210px, 1fr);
	align-items: center;
	gap: 14px;
	padding: 18px 2px 12px;

	h2 {
		margin: 0;
		color: #102033;
		font-size: 1.15rem;
		font-weight: 950;
	}

	p {
		margin: 3px 0 0;
		color: #64778b;
		font-size: 0.77rem;
		font-weight: 650;
	}

	@media (max-width: 1050px) {
		grid-template-columns: minmax(0, 1fr) auto;

		> [role="group"] {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}

	@media (max-width: 720px) {
		grid-template-columns: 1fr;
		align-items: stretch;

		> [role="group"] {
			grid-column: auto;
			grid-row: auto;
		}
	}
`;

const TableTitle = styled.div`
	min-width: 0;
`;

const filterTones = {
	all: { accent: "#155d95", soft: "#e8f4fc", shadow: "rgba(21, 93, 149, 0.2)" },
	cyan: {
		accent: "#0787a6",
		soft: "#e5f9fd",
		shadow: "rgba(7, 135, 166, 0.2)",
	},
	purple: {
		accent: "#6d4bb0",
		soft: "#f1ebff",
		shadow: "rgba(109, 75, 176, 0.2)",
	},
	green: {
		accent: "#16815c",
		soft: "#e8f9f0",
		shadow: "rgba(22, 129, 92, 0.2)",
	},
};

const ActivityFilterBar = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 5px;
	min-width: 500px;
	padding: 5px;
	border: 1px solid #d2e2ef;
	border-radius: 14px;
	background: linear-gradient(180deg, #ffffff 0%, #f0f6fb 100%);
	box-shadow:
		0 9px 24px rgba(17, 61, 96, 0.09),
		inset 0 1px #fff;

	@media (max-width: 1050px) {
		min-width: 0;
	}

	@media (max-width: 560px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
`;

const ActivityFilterButton = styled.button`
	position: relative;
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-items: center;
	gap: 6px;
	min-width: 0;
	min-height: 44px;
	padding: 5px 7px;
	border: 1px solid ${(props) => (props.$active ? filterTones[props.$tone].accent : "transparent")};
	border-radius: 10px;
	background: ${(props) =>
		props.$active
			? `linear-gradient(145deg, #fff 0%, ${filterTones[props.$tone].soft} 100%)`
			: "rgba(255, 255, 255, 0.46)"};
	box-shadow: ${(props) =>
		props.$active ? `0 6px 15px ${filterTones[props.$tone].shadow}, inset 0 1px #fff` : "none"};
	color: ${(props) => (props.$active ? filterTones[props.$tone].accent : "#526b80")};
	cursor: pointer;
	transition:
		transform 0.18s ease,
		border-color 0.18s ease,
		background 0.18s ease,
		box-shadow 0.18s ease,
		color 0.18s ease;

	&::after {
		content: "";
		position: absolute;
		inset-block-start: 5px;
		inset-inline-end: 5px;
		width: 5px;
		height: 5px;
		border-radius: 999px;
		background: ${(props) => (props.$active ? filterTones[props.$tone].accent : "transparent")};
		box-shadow: ${(props) =>
			props.$active ? `0 0 0 3px ${filterTones[props.$tone].soft}` : "none"};
	}

	&:hover {
		transform: translateY(-1px);
		border-color: ${(props) => filterTones[props.$tone].accent}88;
		background: ${(props) =>
			`linear-gradient(145deg, #fff 0%, ${filterTones[props.$tone].soft} 100%)`};
		color: ${(props) => filterTones[props.$tone].accent};
	}

	&:focus-visible {
		outline: 3px solid ${(props) => filterTones[props.$tone].accent}3f;
		outline-offset: 2px;
	}
`;

const FilterIcon = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 27px;
	height: 27px;
	border-radius: 8px;
	background: ${(props) =>
		props.$active ? filterTones[props.$tone].accent : filterTones[props.$tone].soft};
	color: ${(props) => (props.$active ? "#fff" : filterTones[props.$tone].accent)};
	font-size: 0.82rem;
	transition:
		background 0.18s ease,
		color 0.18s ease;
`;

const FilterLabel = styled.span`
	overflow: hidden;
	font-size: 0.72rem;
	font-weight: 900;
	line-height: 1.15;
	text-align: start;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const TableActions = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 10px;
	min-width: 0;

	@media (max-width: 720px) {
		justify-content: flex-start;
	}

	@media (max-width: 520px) {
		align-items: stretch;
		flex-direction: column;

		button {
			width: 100%;
		}
	}
`;

const UniqueCount = styled.span`
	padding: 7px 10px;
	border: 1px solid #c9dced;
	border-radius: 999px;
	background: #fff;
	color: #36536e;
	font-size: 0.72rem;
	font-weight: 850;
	white-space: nowrap;
`;

const ActivityTags = styled.div`
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 4px;

	.ant-tag {
		margin: 0;
		max-width: 100%;
		font-size: 0.72rem;
		font-weight: 850;
		line-height: 1.35;
		white-space: normal;
	}
`;

const Confirmation = styled.strong`
	display: inline-block;
	color: #164f7a;
	font-weight: 950;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
`;

const HotelName = styled.strong`
	display: block;
	overflow: hidden;
	color: #102033;
	font-weight: 900;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const Amount = styled.strong`
	color: #0d684c;
	font-weight: 900;
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
	direction: ltr;
`;

const NumericText = styled.span`
	display: inline-block;
	font-variant-numeric: tabular-nums;
	direction: ltr;
`;

const DateText = styled(NumericText)`
	white-space: nowrap;
	direction: inherit;
	unicode-bidi: plaintext;
`;

const CellText = styled.span`
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const AmountCell = styled.div`
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 1px 7px;
	align-items: center;
	min-width: 0;
`;

const AmountBreakdown = styled.small`
	grid-column: 1;
	color: #587187;
	font-size: 0.7rem;
	font-weight: 750;
	font-variant-numeric: tabular-nums;
	direction: ltr;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const AmountQuality = styled.span`
	grid-column: 2;
	grid-row: 1 / 3;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	border-radius: 999px;
	background: ${(props) =>
		props.$status === "verified"
			? "#e4f8ed"
			: props.$status === "unverified"
			  ? "#edf3f8"
			  : "#fff0e3"};
	color: ${(props) =>
		props.$status === "verified"
			? "#118154"
			: props.$status === "unverified"
			  ? "#60788e"
			  : "#b04713"};
	cursor: help;
`;

const StatusPill = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.34rem;
	min-height: 27px;
	min-width: 82px;
	max-width: none;
	padding: 0.22rem 0.68rem;
	border: 1px solid
		${(props) =>
			props.$tone === "red"
				? "#d45b68"
				: props.$tone === "orange"
				  ? "#d89b2e"
				  : props.$tone === "green"
				    ? "#14a064"
				    : props.$tone === "softGreen"
				      ? "#87d6a0"
				      : props.$tone === "blue"
				        ? "#5b8bdc"
				        : props.$tone === "purple"
				          ? "#b47dc2"
				          : "#aab2c0"};
	border-radius: 999px;
	background: ${(props) =>
		props.$tone === "red"
			? "linear-gradient(135deg, #7f1d1d 0%, #c33546 100%)"
			: props.$tone === "orange"
			  ? "linear-gradient(135deg, #fff3d8 0%, #f7bf4b 100%)"
			  : props.$tone === "green"
			    ? "linear-gradient(135deg, #064e3b 0%, #0fa66b 100%)"
			    : props.$tone === "softGreen"
			      ? "linear-gradient(135deg, #eefbf3 0%, #d8f7e4 100%)"
			      : props.$tone === "blue"
			        ? "linear-gradient(135deg, #eef4ff 0%, #dfeaff 100%)"
			        : props.$tone === "purple"
			          ? "linear-gradient(135deg, #fffaff 0%, #ecd9f3 100%)"
			          : "linear-gradient(135deg, #f7f8fb 0%, #e9edf7 100%)"};
	color: ${(props) =>
		props.$tone === "red" || props.$tone === "green"
			? "#fff"
			: props.$tone === "orange"
			  ? "#4c3000"
			  : props.$tone === "softGreen"
			    ? "#08722c"
			    : props.$tone === "blue"
			      ? "#1d4f9d"
			      : props.$tone === "purple"
			        ? "#5d1d6e"
			        : "#263452"};
	font-size: 0.71rem;
	font-weight: 950;
	line-height: 1.25;
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.28), 0 4px 10px rgba(40, 16, 52, 0.08);
	white-space: nowrap;

	&::before {
		content: "";
		width: 7px;
		height: 7px;
		flex: 0 0 7px;
		border-radius: 999px;
		background: ${(props) =>
			props.$tone === "red"
				? "#ffd1d6"
				: props.$tone === "orange"
				  ? "#7a4c00"
				  : props.$tone === "green"
				    ? "#c9ffe1"
				    : props.$tone === "softGreen"
				      ? "#14a064"
				      : props.$tone === "blue"
				        ? "#356ed1"
				        : props.$tone === "purple"
				          ? "#8d4c9d"
				          : "#6d7a99"};
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.28);
	}
`;

const DetailsButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	min-height: 30px;
	padding: 5px 10px;
	border: 1px solid #2a75a7;
	border-radius: 8px;
	background: linear-gradient(135deg, #edf8ff 0%, #dcefff 100%);
	color: #124e78;
	cursor: pointer;
	font-size: 0.72rem;
	font-weight: 900;
	white-space: nowrap;
	transition: 0.18s ease;

	&:hover {
		border-color: #0d4d79;
		background: linear-gradient(135deg, #155d95 0%, #0b365c 100%);
		color: #fff;
	}

	&:focus-visible {
		outline: 3px solid rgba(37, 155, 213, 0.3);
		outline-offset: 2px;
	}
`;

const DetailsState = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 14px;
	min-height: 260px;
	padding: 24px;
	color: #264861;
	text-align: center;

	.ant-alert {
		width: min(680px, 100%);
	}
`;
