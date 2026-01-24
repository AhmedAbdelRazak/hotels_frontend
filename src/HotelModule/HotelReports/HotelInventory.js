import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Alert, Button, DatePicker, Modal, Select, Spin, Switch } from "antd";
import dayjs from "dayjs";
import { useParams } from "react-router-dom";
import moment from "moment-hijri";
import * as XLSX from "xlsx";
import {
	getHotelInventoryCalendar,
	getHotelInventoryDayReservations,
} from "../apiAdmin";

const { Option } = Select;

const heatColor = (rate = 0) => {
	const clamped = Math.min(Math.max(Number(rate) || 0, 0), 1);
	const start = [240, 246, 255];
	const end = [0, 106, 209];
	const mix = start.map((s, i) => Math.round(s + (end[i] - s) * clamped));
	return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
};

const getReadableText = (rate = 0) =>
	Number(rate) > 0.62 ? "#ffffff" : "#1f1f1f";

const getRateTone = (rate = 0) => {
	const r = Math.min(Math.max(Number(rate) || 0, 0), 1);
	if (r >= 0.85) return "#c53030";
	if (r >= 0.65) return "#d69e2e";
	return "#2f855a";
};

const formatInt = (value) => Number(value || 0).toLocaleString("en-US");

const PAYMENT_STATUS_OPTIONS = [
	"Not Paid",
	"Not Captured",
	"Captured",
	"Paid Offline",
];

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

const HotelInventory = ({ chosenLanguage }) => {
	const { hotelId } = useParams();
	const supportsHijri =
		typeof moment.fn?.iMonth === "function" &&
		typeof moment.fn?.iYear === "function";

	const nowHijri = supportsHijri ? moment() : null;
	const defaultHijriMonth = supportsHijri ? nowHijri.iMonth() : 0;
	const defaultHijriYear = supportsHijri ? nowHijri.iYear() : dayjs().year();
	const defaultHijriStart = supportsHijri
		? nowHijri.clone().startOf("iMonth")
		: null;
	const defaultHijriEnd = supportsHijri
		? nowHijri.clone().endOf("iMonth")
		: null;

	const [monthValue, setMonthValue] = useState(() =>
		defaultHijriStart
			? dayjs(defaultHijriStart.toDate())
			: dayjs().startOf("month"),
	);
	const [calendarType, setCalendarType] = useState(
		defaultHijriStart ? "hijri" : "gregorian",
	);
	const [hijriMonth, setHijriMonth] = useState(defaultHijriMonth);
	const [hijriYear, setHijriYear] = useState(defaultHijriYear);
	const [rangeOverride, setRangeOverride] = useState(() =>
		defaultHijriStart
			? {
					start: dayjs(defaultHijriStart.toDate()).format("YYYY-MM-DD"),
					end: dayjs(defaultHijriEnd?.toDate()).format("YYYY-MM-DD"),
			  }
			: null,
	);
	const [includeCancelled, setIncludeCancelled] = useState(false);
	const [paymentStatuses, setPaymentStatuses] = useState([]);
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [dayModalOpen, setDayModalOpen] = useState(false);
	const [daySelection, setDaySelection] = useState(null);
	const [dayDetails, setDayDetails] = useState(null);
	const [dayDetailsLoading, setDayDetailsLoading] = useState(false);
	const [dayDetailsError, setDayDetailsError] = useState("");

	const labels = useMemo(() => {
		if (chosenLanguage === "Arabic") {
			return {
				title:
					"\u062a\u0642\u0631\u064a\u0631\u0020\u0625\u0634\u063a\u0627\u0644\u0020\u0627\u0644\u0641\u0646\u062f\u0642",
				selectedHotel:
					"\u0627\u0644\u0641\u0646\u062f\u0642\u0020\u0627\u0644\u0645\u062d\u062f\u062f",
				calendar: "\u0627\u0644\u062a\u0642\u0648\u064a\u0645",
				gregorian: "\u0645\u064a\u0644\u0627\u062f\u064a",
				hijri: "\u0647\u062c\u0631\u064a",
				month: "\u0627\u0644\u0634\u0647\u0631",
				hijriMonth:
					"\u0627\u0644\u0634\u0647\u0631\u0020\u0627\u0644\u0647\u062c\u0631\u064a",
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
				exportBookingSource:
					"\u0645\u0635\u062f\u0631\u0020\u0627\u0644\u062d\u062c\u0632",
				exportPaymentStatus:
					"\u062d\u0627\u0644\u0629\u0020\u0627\u0644\u062f\u0641\u0639",
			};
		}
		return {
			title: "Hotel Inventory",
			selectedHotel: "Selected Hotel",
			calendar: "Calendar",
			gregorian: "Gregorian",
			hijri: "Hijri",
			month: "Month",
			hijriMonth: "Hijri Month",
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
			exportBookingSource: "Booking Source",
			exportPaymentStatus: "Payment Status",
		};
	}, [chosenLanguage]);

	const range = useMemo(() => {
		if (
			calendarType === "hijri" &&
			rangeOverride?.start &&
			rangeOverride?.end
		) {
			return { start: rangeOverride.start, end: rangeOverride.end };
		}
		const start = monthValue.startOf("month").format("YYYY-MM-DD");
		const end = monthValue.endOf("month").format("YYYY-MM-DD");
		return { start, end };
	}, [calendarType, monthValue, rangeOverride]);

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
			setRangeOverride({
				start: dayjs(hStart.toDate()).format("YYYY-MM-DD"),
				end: dayjs(hEnd.toDate()).format("YYYY-MM-DD"),
			});
		},
		[supportsHijri],
	);

	const onMonthChange = (value) => {
		if (!value) return;
		setMonthValue(value.startOf("month"));
	};

	const handleCalendarChange = (value) => {
		setCalendarType(value);
		if (value === "gregorian") {
			setRangeOverride(null);
			setMonthValue(dayjs().startOf("month"));
		} else {
			onHijriChange(hijriMonth, hijriYear);
		}
	};

	const fetchCalendar = useCallback(() => {
		if (!hotelId) return;
		setLoading(true);
		setError("");
		getHotelInventoryCalendar(hotelId, {
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
	}, [hotelId, range.start, range.end, includeCancelled, paymentStatuses]);

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
		getHotelInventoryDayReservations(hotelId, {
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

	const togglePaymentStatus = (status) => {
		setPaymentStatuses((prev) => {
			const set = new Set(prev || []);
			if (set.has(status)) set.delete(status);
			else set.add(status);
			return PAYMENT_STATUS_OPTIONS.filter((s) => set.has(s));
		});
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

	return (
		<InventoryWrapper dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
			<HeaderRow>
				<div>
					<h3>{labels.title}</h3>
					<div className='subtitle'>
						{data?.hotel?.hotelName || labels.selectedHotel}
					</div>
				</div>
				<Controls>
					<div className='control'>
						<span>{labels.calendar}</span>
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
					<div className='control'>
						<span>
							{calendarType === "hijri" ? labels.hijriMonth : labels.month}
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
								{rangeOverride?.start && (
									<div className='muted'>
										{rangeOverride.start} - {rangeOverride.end}
									</div>
								)}
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
									onClick={() =>
										setMonthValue((current) => current.subtract(1, "month"))
									}
								>
									{labels.prev}
								</Button>
								<Button
									size='small'
									onClick={() =>
										setMonthValue((current) => current.add(1, "month"))
									}
								>
									{labels.next}
								</Button>
							</div>
						)}
					</div>
					<div className='control'>
						<span>{labels.includeCancelled}</span>
						<Switch
							checked={includeCancelled}
							onChange={(checked) => setIncludeCancelled(checked)}
						/>
					</div>
				</Controls>
			</HeaderRow>

			<PaymentStatusBar $rtl={modalDir === "rtl"}>
				<div className='label'>{labels.paymentStatus}</div>
				<div className='buttons'>
					<StatusButton
						size='small'
						onClick={() => setPaymentStatuses([])}
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
							{status}
						</StatusButton>
					))}
					{!paymentAllActive && (
						<Button size='small' onClick={() => setPaymentStatuses([])}>
							{labels.paymentStatusClear}
						</Button>
					)}
				</div>
				<div className='hint'>{labels.paymentStatusTip}</div>
			</PaymentStatusBar>

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
															backgroundColor: heatColor(rate),
															color: getReadableText(rate),
															borderColor: cell.overbooked
																? "#d7191c"
																: "#d0d7e5",
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
													>
														<div className='total-cell'>
															<span className='total-main'>
																{formatInt(totalOccupied)}/
																{formatInt(totalCapacity)}
															</span>
															<span
																className='total-rate'
																style={{ color: getRateTone(totalRate) }}
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
				width={820}
				style={{ maxWidth: "92vw" }}
				styles={{ body: { padding: "18px 28px 22px" } }}
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
								<span>{dayDetails?.hotel?.hotelName || labels.na}</span>
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

	h3 {
		margin: 0;
		font-size: 1.4rem;
		font-weight: bold;
		color: #1f1f1f;
	}

	.subtitle {
		color: #5c5c5c;
		font-size: 0.9rem;
	}
`;

const HeaderRow = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 16px;
	flex-wrap: wrap;
`;

const Controls = styled.div`
	display: flex;
	gap: 12px;
	flex-wrap: wrap;

	.control {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.8rem;
		color: #5c5c5c;
	}
`;

const PaymentStatusBar = styled.div`
	border: 1px solid #e2e6ef;
	border-radius: 12px;
	padding: 10px 12px;
	background: #fcfcfc;
	display: flex;
	flex-direction: column;
	gap: 8px;
	text-align: ${(p) => (p.$rtl ? "right" : "left")};

	.label {
		font-weight: 600;
		color: #333;
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
`;

const StatusButton = styled(Button)`
	font-size: 12px;
	border-color: ${(p) => (p.isActive ? "#0f7e6b" : "initial")};
	background-color: ${(p) => (p.isActive ? "#dff3ef" : "initial")};
	color: ${(p) => (p.isActive ? "#0a5a4c" : "initial")};
`;

const SummaryRow = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 12px;
`;

const LegendRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	align-items: center;
	color: #5c5c5c;
	font-size: 0.8rem;

	.legend-title {
		font-weight: 600;
		color: #1f1f1f;
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
	}
`;

const SummaryCard = styled.div`
	background: #f6f8fb;
	border-radius: 10px;
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 6px;

	span {
		color: #5c5c5c;
		font-size: 0.85rem;
	}

	strong {
		font-size: 1.1rem;
		color: #0f1e3d;
	}
`;

const TableWrapper = styled.div`
	max-height: 80vh;
	overflow: auto;
	border: 1px solid #e2e6ef;
	border-radius: 12px;

	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 720px;
	}

	th,
	td {
		border-bottom: 1px solid #edf1f7;
		padding: 8px;
		text-align: center;
		vertical-align: middle;
	}

	th {
		background: #f7f9fc;
		font-size: 0.8rem;
		color: #2f3a4c;
		position: sticky;
		top: 0;
		z-index: 2;
	}

	th:first-child {
		left: 0;
		z-index: 3;
	}

	.date-cell {
		color: #1f1f1f;
		background: #ffffff;
		position: sticky;
		left: 0;
		z-index: 1;
	}

	.date-lines {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 0.72rem;
		line-height: 1.15;
	}

	.hijri-date {
		font-weight: 700;
		color: #2f3a4c;
	}

	.greg-date {
		color: #5c5c5c;
		font-size: 0.7rem;
		font-weight: 600;
	}

	.type-header {
		display: flex;
		gap: 6px;
		align-items: center;
		justify-content: center;
	}

	.type-label {
		font-size: 11px;
		line-height: 1.2;
		max-width: 140px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: break-word;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.total-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-weight: 700;
		color: #1f1f1f;
	}

	.total-main {
		font-weight: 700;
	}

	.total-rate {
		font-size: 0.75rem;
		font-weight: 600;
	}
`;

const CellButton = styled.button`
	width: 100%;
	border: 1px solid #d0d7e5;
	border-radius: 8px;
	padding: 6px;
	cursor: pointer;
	background: #ffffff;
	position: relative;
	overflow: hidden;
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease;

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
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
	}

	.cell-sub {
		font-size: 0.7rem;
		opacity: 0.8;
	}
`;

const TotalButton = styled.button`
	width: 100%;
	border: 1px solid #d0d7e5;
	border-radius: 8px;
	padding: 6px;
	cursor: pointer;
	background: #ffffff;
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease;

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
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

	.card {
		border: 1px solid #e2e6ef;
		border-radius: 10px;
		padding: 12px 18px;
		background: #fafbff;
	}

	.row {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		gap: 12px;
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
`;

const ModalTitle = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;

	.modal-main {
		font-weight: 600;
	}

	.modal-sub {
		font-size: 0.85rem;
		color: #5c5c5c;
	}
`;
