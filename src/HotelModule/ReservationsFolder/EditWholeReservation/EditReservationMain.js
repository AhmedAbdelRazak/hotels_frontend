import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import styled from "styled-components";
import {
	DatePicker,
	Modal,
	InputNumber,
	Select,
	Table,
	Button,
	Tooltip,
} from "antd";
import {
	CalendarOutlined,
	HomeOutlined,
	PlusOutlined,
	MinusOutlined,
	EditOutlined,
	CheckCircleTwoTone,
} from "@ant-design/icons";
import dayjs from "dayjs";
import moment from "moment";
import {
	getHotelReservations,
	getHotelRooms,
	getHotelInventoryAvailability,
	updateSingleReservation,
} from "../../apiAdmin";
import { isAuthenticated } from "../../../auth";
import { toast } from "react-toastify";
import { countryListWithAbbreviations } from "../../../AdminModule/CustomerService/utils";

const buildRoomKey = (roomType, displayName) =>
	`${roomType || ""}|${displayName || ""}`;

const splitRoomKey = (key = "") => {
	const idx = key.indexOf("|");
	if (idx === -1) return { room_type: key, displayName: "" };
	return { room_type: key.slice(0, idx), displayName: key.slice(idx + 1) };
};

export const EditReservationMain = ({
	chosenLanguage,
	reservation,
	setReservation,
	hotelDetails,
}) => {
	const [isRoomCountModalOpen, setIsRoomCountModalOpen] = useState(false);
	const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
	const [sendEmail, setSendEmail] = useState(false);
	const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);
	const [updatedRoomCount, setUpdatedRoomCount] = useState(0);
	const [totalDistribute, setTotalDistribute] = useState("");
	const [roomInventory, setRoomInventory] = useState([]);
	const [hotelRooms, setHotelRooms] = useState([]);
	const [selectedRoomIds, setSelectedRoomIds] = useState([]);
	const [bookedRoomIds, setBookedRoomIds] = useState([]);
	const [isRoomChangeConfirmVisible, setIsRoomChangeConfirmVisible] =
		useState(false);
	const [pendingRoomIds, setPendingRoomIds] = useState([]);
	const [hasRoomLineEdits, setHasRoomLineEdits] = useState(false);
	const [hasDateEdits, setHasDateEdits] = useState(false);

	const { user } = isAuthenticated();
	const hotelIdValue =
		reservation?.hotelId?._id ||
		reservation?.hotelId ||
		hotelDetails?._id ||
		hotelDetails?.id ||
		"";
	const belongsToId =
		reservation?.belongsTo?._id || reservation?.belongsTo || user?._id || "";

	const roomDetails = useMemo(
		() =>
			Array.isArray(hotelDetails?.roomCountDetails)
				? hotelDetails.roomCountDetails
				: [],
		[hotelDetails?.roomCountDetails],
	);
	const lastDateKeyRef = useRef("");
	const initialRoomIdsRef = useRef(null);
	const lastReservationIdRef = useRef(null);

	const safeParseFloat = useCallback((value, fallback = 0) => {
		const parsed = parseFloat(value);
		return Number.isNaN(parsed) ? fallback : parsed;
	}, []);

	const pct = useCallback((value) => (value > 1 ? value / 100 : value), []);

	const findRoomDetail = useCallback(
		(roomType, displayName) => {
			if (!roomType) return null;
			const byDisplay =
				displayName &&
				roomDetails.find(
					(room) =>
						room.roomType === roomType && room.displayName === displayName,
				);
			return (
				byDisplay ||
				roomDetails.find((room) => room.roomType === roomType) ||
				null
			);
		},
		[roomDetails],
	);

	const resolveDisplayNameForType = useCallback(
		(roomType, displayName) => {
			if (displayName) return displayName;
			const detail = findRoomDetail(roomType, displayName);
			return detail?.displayName || roomType || "";
		},
		[findRoomDetail],
	);

	const resolveDisplayLabelForType = useCallback(
		(roomType, displayName) => {
			if (displayName) return displayName;
			const detail = findRoomDetail(roomType, displayName);
			if (!detail) return roomType || "";
			if (chosenLanguage === "Arabic") {
				return (
					detail.displayName_OtherLanguage ||
					detail.displayName ||
					roomType ||
					""
				);
			}
			return detail.displayName || roomType || "";
		},
		[chosenLanguage, findRoomDetail],
	);

	const commissionForRoom = useCallback(
		(roomType, displayName) => {
			const detail = findRoomDetail(roomType, displayName);
			const fallback = safeParseFloat(
				detail?.roomCommission ?? hotelDetails?.commission,
				10,
			);
			return fallback > 0 ? fallback : 10;
		},
		[findRoomDetail, hotelDetails?.commission, safeParseFloat],
	);

	const formatDate = useCallback((date) => {
		if (!date) return "";

		const d = new Date(date);
		let month = "" + (d.getMonth() + 1);
		let day = "" + d.getDate();
		let year = d.getFullYear();

		if (month.length < 2) month = "0" + month;
		if (day.length < 2) day = "0" + day;

		return [year, month, day].join("-");
	}, []);

	const normalizeDate = useCallback((value) => {
		if (!value) return null;
		const parsed = moment(value);
		return parsed.isValid() ? parsed.startOf("day") : null;
	}, []);

	const getReservationRoomIds = useCallback((roomIdValue) => {
		if (!Array.isArray(roomIdValue)) return [];
		return roomIdValue
			.map((room) => {
				if (!room) return null;
				if (typeof room === "string") return room;
				if (typeof room === "object" && room._id) return room._id;
				return room;
			})
			.filter(Boolean)
			.map((id) => String(id));
	}, []);
	if (initialRoomIdsRef.current === null) {
		initialRoomIdsRef.current = getReservationRoomIds(reservation?.roomId);
	}

	const getNightsCount = useCallback(() => {
		const start = normalizeDate(reservation.checkin_date);
		const end = normalizeDate(reservation.checkout_date);
		if (!start || !end) return 0;
		const diff = end.diff(start, "days");
		return diff > 0 ? diff : 0;
	}, [normalizeDate, reservation.checkin_date, reservation.checkout_date]);

	const buildDayRow = useCallback(
		(date, price, template = {}) => {
			const normalizedPrice = safeParseFloat(price, 0);
			const safeTemplate = template || {};
			const next = {
				...safeTemplate,
				date,
				price: normalizedPrice,
				totalPriceWithCommission: normalizedPrice,
			};
			if (safeTemplate.totalPriceWithoutCommission !== undefined) {
				next.totalPriceWithoutCommission =
					safeTemplate.totalPriceWithoutCommission;
			} else {
				next.totalPriceWithoutCommission = normalizedPrice;
			}
			return next;
		},
		[safeParseFloat],
	);

	const buildPricingByNightly = useCallback(
		(nightlyPrice, nightsCount, startDate, template = {}) => {
			if (!startDate || !nightsCount) return [];
			return Array.from({ length: nightsCount }, (_, idx) => {
				const date = startDate.clone().add(idx, "day").format("YYYY-MM-DD");
				return buildDayRow(date, nightlyPrice, template);
			});
		},
		[buildDayRow],
	);

	const buildPricingByDayFromDetail = useCallback(
		(roomType, displayName) => {
			const start = normalizeDate(reservation.checkin_date);
			const endExclusive = normalizeDate(reservation.checkout_date);
			if (!start || !endExclusive) return [];
			const detail = findRoomDetail(roomType, displayName);
			if (!detail) return [];
			const end = endExclusive.clone().subtract(1, "day");
			const fallbackCommission = commissionForRoom(roomType, displayName);
			const rows = [];
			for (
				let d = start.clone();
				d.isSameOrBefore(end, "day");
				d.add(1, "day")
			) {
				const dateString = d.format("YYYY-MM-DD");
				const rate =
					Array.isArray(detail.pricingRate) &&
					detail.pricingRate.find((r) => r.calendarDate === dateString);
				const basePrice = safeParseFloat(
					rate?.price,
					safeParseFloat(detail?.price?.basePrice, 0),
				);
				const rootPrice = safeParseFloat(
					rate?.rootPrice ?? rate?.defaultCost,
					safeParseFloat(detail?.defaultCost, 0),
				);
				const commissionRate = safeParseFloat(
					rate?.commissionRate,
					fallbackCommission,
				);
				const totalPriceWithCommission =
					basePrice + rootPrice * pct(commissionRate);
				rows.push({
					date: dateString,
					price: basePrice,
					rootPrice,
					commissionRate,
					totalPriceWithCommission,
					totalPriceWithoutCommission: basePrice,
				});
			}
			return rows;
		},
		[
			commissionForRoom,
			findRoomDetail,
			normalizeDate,
			pct,
			reservation.checkin_date,
			reservation.checkout_date,
			safeParseFloat,
		],
	);

	const getPricingByDayForRoom = useCallback(
		(nightlyPrice, existingPricingByDay, roomType, displayName) => {
			const nightsCount = Math.max(getNightsCount(), 1);
			const start = normalizeDate(reservation.checkin_date);
			if (!start) return [];
			if (
				Array.isArray(existingPricingByDay) &&
				existingPricingByDay.length > 0
			) {
				if (existingPricingByDay.length === nightsCount) {
					return existingPricingByDay.map((day) => ({
						...buildDayRow(day.date, nightlyPrice, day),
					}));
				}
				const template = existingPricingByDay[0];
				return buildPricingByNightly(
					nightlyPrice,
					nightsCount,
					start,
					template,
				);
			}
			const templateRows = buildPricingByDayFromDetail(roomType, displayName);
			if (templateRows.length > 0) {
				return templateRows.map((day) =>
					buildDayRow(day.date, nightlyPrice, day),
				);
			}
			return buildPricingByNightly(nightlyPrice, nightsCount, start);
		},
		[
			buildDayRow,
			buildPricingByDayFromDetail,
			buildPricingByNightly,
			getNightsCount,
			normalizeDate,
			reservation.checkin_date,
		],
	);

	const getDayFinal = useCallback(
		(day) => safeParseFloat(day?.totalPriceWithCommission ?? day?.price, 0),
		[safeParseFloat],
	);

	const applyFinalToDay = (day, finalValue) => {
		const normalized = safeParseFloat(finalValue, 0);
		const next = {
			...day,
			price: normalized,
			totalPriceWithCommission: normalized,
		};
		if (day?.totalPriceWithoutCommission === undefined) {
			next.totalPriceWithoutCommission = normalized;
		}
		return next;
	};

	const recalcChosenPrice = useCallback(
		(pricingByDay) => {
			const total = pricingByDay.reduce(
				(sum, day) => sum + getDayFinal(day),
				0,
			);
			const avg = pricingByDay.length ? total / pricingByDay.length : 0;
			return Number(avg.toFixed(2));
		},
		[getDayFinal],
	);

	const ensurePricingByDay = (line) => {
		const existing = Array.isArray(line?.pricingByDay) ? line.pricingByDay : [];
		if (existing.length > 0) return existing;
		const nightly = Number(line?.chosenPrice) || 0;
		const resolvedDisplayName = resolveDisplayNameForType(
			line?.room_type,
			line?.displayName || line?.display_name,
		);
		return getPricingByDayForRoom(
			nightly,
			null,
			line?.room_type,
			resolvedDisplayName,
		);
	};

	const isReservationActive = useCallback((reservationData) => {
		const status = String(
			reservationData?.reservation_status || "",
		).toLowerCase();
		if (!status) return true;
		if (status.includes("cancel")) return false;
		if (status.includes("no_show") || status.includes("no show")) return false;
		if (
			status.includes("checked_out") ||
			status.includes("checkedout") ||
			status.includes("early_checked_out") ||
			status.includes("closed")
		)
			return false;
		return true;
	}, []);

	const hasOverlap = useCallback(
		(reservationData, rangeStart, rangeEnd) => {
			if (!rangeStart || !rangeEnd) return false;
			const reservationStart = normalizeDate(reservationData?.checkin_date);
			const reservationEnd = normalizeDate(reservationData?.checkout_date);
			if (!reservationStart || !reservationEnd) return false;
			return (
				rangeStart.isBefore(reservationEnd) &&
				rangeEnd.isAfter(reservationStart)
			);
		},
		[normalizeDate],
	);

	// eslint-disable-next-line
	const disabledDate = (current) => {
		// Allow edits up to 14 days in the past
		if (!current) return false;
		const earliestAllowed = dayjs().startOf("day").subtract(14, "day");
		return current.isBefore(earliestAllowed, "day");
	};

	const getRoomInventory = () => {
		const formattedStartDate = formatDate(reservation.checkin_date);
		const formattedEndDate = formatDate(reservation.checkout_date);
		if (!hotelIdValue || !formattedStartDate || !formattedEndDate) return;
		getHotelInventoryAvailability(hotelIdValue, {
			start: formattedStartDate,
			end: formattedEndDate,
		}).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error rendering");
			} else {
				setRoomInventory(Array.isArray(data) ? data : []);
			}
		});
	};

	useEffect(() => {
		if (!hotelIdValue || !belongsToId) return;
		getHotelRooms(hotelIdValue, belongsToId).then((data) => {
			if (data && data.error) {
				console.log(data.error);
			} else {
				setHotelRooms(Array.isArray(data) ? data : []);
			}
		});
	}, [hotelIdValue, belongsToId]);

	useEffect(() => {
		setSelectedRoomIds(getReservationRoomIds(reservation?.roomId));
	}, [reservation?.roomId, getReservationRoomIds]);

	useEffect(() => {
		if (!reservation?._id) return;
		if (lastReservationIdRef.current === reservation._id) return;
		lastReservationIdRef.current = reservation._id;
		initialRoomIdsRef.current = getReservationRoomIds(reservation?.roomId);
	}, [reservation?._id, reservation?.roomId, getReservationRoomIds]);

	useEffect(() => {
		if (!reservation?.checkin_date || !reservation?.checkout_date) return;
		if (!hotelIdValue || !belongsToId) return;

		const formattedStartDate = formatDate(reservation.checkin_date);
		const formattedEndDate = formatDate(reservation.checkout_date);
		const rangeStart = normalizeDate(reservation.checkin_date);
		const rangeEnd = normalizeDate(reservation.checkout_date);

		getHotelReservations(
			hotelIdValue,
			belongsToId,
			formattedStartDate,
			formattedEndDate,
		).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error loading reservations");
				return;
			}
			const reservationsList = Array.isArray(data) ? data : [];
			const bookedIds = new Set();
			reservationsList.forEach((reservationItem) => {
				if (reservation?._id && reservationItem?._id === reservation._id)
					return;
				if (!isReservationActive(reservationItem)) return;
				if (!hasOverlap(reservationItem, rangeStart, rangeEnd)) return;
				getReservationRoomIds(reservationItem.roomId).forEach((id) =>
					bookedIds.add(id),
				);
			});
			setBookedRoomIds(Array.from(bookedIds));
		});
	}, [
		reservation?.checkin_date,
		reservation?.checkout_date,
		hotelIdValue,
		belongsToId,
		reservation?._id,
		formatDate,
		normalizeDate,
		getReservationRoomIds,
		isReservationActive,
		hasOverlap,
	]);

	useEffect(() => {
		if (reservation.checkin_date && reservation.checkout_date) {
			getRoomInventory();
		}
		// eslint-disable-next-line
	}, [
		reservation.checkin_date,
		reservation.checkout_date,
		belongsToId,
		hotelIdValue,
	]);

	useEffect(() => {
		if (!hasDateEdits) return;
		if (!reservation?.checkin_date || !reservation?.checkout_date) return;
		const dateKey = `${reservation.checkin_date}|${reservation.checkout_date}`;
		if (lastDateKeyRef.current === dateKey) return;
		lastDateKeyRef.current = dateKey;

		setReservation((currentReservation) => {
			const updatedRooms = (currentReservation.pickedRoomsType || []).map(
				(room) => {
					const displayName = resolveDisplayNameForType(
						room.room_type,
						room.displayName || room.display_name,
					);
					const nightlyPrice = Number(room.chosenPrice) || 0;
					const pricingByDay = getPricingByDayForRoom(
						nightlyPrice,
						room.pricingByDay,
						room.room_type,
						displayName,
					);
					return {
						...room,
						displayName,
						pricingByDay,
						chosenPrice: recalcChosenPrice(pricingByDay),
					};
				},
			);
			return {
				...currentReservation,
				pickedRoomsType: updatedRooms,
			};
		});
	}, [
		reservation?.checkin_date,
		reservation?.checkout_date,
		hasDateEdits,
		getPricingByDayForRoom,
		recalcChosenPrice,
		resolveDisplayNameForType,
		setReservation,
	]);

	const openModal = (room, index) => {
		setSelectedRoomIndex(index);
		setUpdatedRoomCount(Number(room?.count) || 1);
		setIsRoomCountModalOpen(true);
	};

	const closeRoomCountModal = () => {
		setIsRoomCountModalOpen(false);
	};

	const saveRoomCount = () => {
		if (selectedRoomIndex == null) return;
		setReservation((currentReservation) => {
			const updatedRooms = [...(currentReservation.pickedRoomsType || [])];
			const currentLine = updatedRooms[selectedRoomIndex] || {};
			const resolvedDisplayName = resolveDisplayNameForType(
				currentLine.room_type,
				currentLine.displayName || currentLine.display_name,
			);
			updatedRooms[selectedRoomIndex] = {
				...currentLine,
				count: Math.max(1, Number(updatedRoomCount || 1)),
				displayName: resolvedDisplayName,
				pricingByDay: ensurePricingByDay(currentLine),
			};
			return {
				...currentReservation,
				pickedRoomsType: updatedRooms,
			};
		});
		setHasRoomLineEdits(true);
		setIsRoomCountModalOpen(false);
	};

	const incCount = (index) => {
		setReservation((currentReservation) => {
			const updatedRooms = [...(currentReservation.pickedRoomsType || [])];
			const currentLine = updatedRooms[index];
			if (!currentLine) return currentReservation;
			updatedRooms[index] = {
				...currentLine,
				count: (Number(currentLine.count) || 1) + 1,
			};
			return { ...currentReservation, pickedRoomsType: updatedRooms };
		});
		setHasRoomLineEdits(true);
	};

	const decCount = (index) => {
		setReservation((currentReservation) => {
			const updatedRooms = [...(currentReservation.pickedRoomsType || [])];
			const currentLine = updatedRooms[index];
			if (!currentLine) return currentReservation;
			updatedRooms[index] = {
				...currentLine,
				count: Math.max(1, (Number(currentLine.count) || 1) - 1),
			};
			return { ...currentReservation, pickedRoomsType: updatedRooms };
		});
		setHasRoomLineEdits(true);
	};

	const openPricingModal = (index) => {
		setSelectedRoomIndex(index);
		setIsPricingModalOpen(true);
	};

	const closePricingModal = () => {
		setIsPricingModalOpen(false);
	};

	const updateNightFinalAt = (dayIndex, finalValue) => {
		if (selectedRoomIndex == null) return;
		setReservation((currentReservation) => {
			const updatedRooms = [...(currentReservation.pickedRoomsType || [])];
			const currentLine = updatedRooms[selectedRoomIndex] || {};
			const pricingByDay = ensurePricingByDay(currentLine);
			const updatedPricing = pricingByDay.map((day, idx) =>
				idx === dayIndex ? applyFinalToDay(day, finalValue) : day,
			);
			updatedRooms[selectedRoomIndex] = {
				...currentLine,
				pricingByDay: updatedPricing,
				chosenPrice: recalcChosenPrice(updatedPricing),
			};
			return {
				...currentReservation,
				pickedRoomsType: updatedRooms,
			};
		});
		setHasRoomLineEdits(true);
	};

	const inheritFirstNight = () => {
		if (selectedRoomIndex == null) return;
		setReservation((currentReservation) => {
			const updatedRooms = [...(currentReservation.pickedRoomsType || [])];
			const currentLine = updatedRooms[selectedRoomIndex] || {};
			const pricingByDay = ensurePricingByDay(currentLine);
			const firstFinal = pricingByDay.length ? getDayFinal(pricingByDay[0]) : 0;
			const updatedPricing = pricingByDay.map((day) =>
				applyFinalToDay(day, firstFinal),
			);
			updatedRooms[selectedRoomIndex] = {
				...currentLine,
				pricingByDay: updatedPricing,
				chosenPrice: recalcChosenPrice(updatedPricing),
			};
			return {
				...currentReservation,
				pickedRoomsType: updatedRooms,
			};
		});
		setHasRoomLineEdits(true);
	};

	const distributeTotalEvenly = () => {
		if (selectedRoomIndex == null) return;
		const total = safeParseFloat(totalDistribute, 0);
		if (!total) return;
		setReservation((currentReservation) => {
			const updatedRooms = [...(currentReservation.pickedRoomsType || [])];
			const currentLine = updatedRooms[selectedRoomIndex] || {};
			const pricingByDay = ensurePricingByDay(currentLine);
			const nights = pricingByDay.length || 1;
			const cents = Math.round(total * 100);
			let sumSoFar = 0;
			const updatedPricing = pricingByDay.map((day, idx) => {
				const shareCents =
					idx < nights - 1 ? Math.round(cents / nights) : cents - sumSoFar;
				sumSoFar += shareCents;
				return applyFinalToDay(day, shareCents / 100);
			});
			updatedRooms[selectedRoomIndex] = {
				...currentLine,
				pricingByDay: updatedPricing,
				chosenPrice: recalcChosenPrice(updatedPricing),
			};
			return {
				...currentReservation,
				pickedRoomsType: updatedRooms,
			};
		});
		setHasRoomLineEdits(true);
	};

	const pricingColumns = [
		{
			title: "Date",
			dataIndex: "date",
			key: "date",
			width: 140,
			render: (value) => (
				<span>
					<CalendarOutlined /> <b>{value}</b>
				</span>
			),
		},
		{
			title: "Nightly Rate (SAR)",
			dataIndex: "totalPriceWithCommission",
			key: "final",
			render: (val, _record, index) => (
				<InputNumber
					min={0}
					value={safeParseFloat(val, 0)}
					step={0.01}
					onChange={(v) => updateNightFinalAt(index, v)}
					style={{ width: "100%" }}
				/>
			),
		},
	];

	const onStartDateChange = (value) => {
		const dateAtMidnight = value ? value.startOf("day") : null;
		setHasDateEdits(true);

		setReservation((currentReservation) => {
			const end = currentReservation.checkout_date
				? dayjs(currentReservation.checkout_date).startOf("day")
				: null;

			// Calculate the difference in days only if there's both checkin and checkout dates
			const duration =
				dateAtMidnight && end ? end.diff(dateAtMidnight, "day") : 0;

			return {
				...currentReservation,
				checkin_date: dateAtMidnight ? dateAtMidnight.toISOString() : null,
				// Update days_of_residence only if both dates are present and the duration is non-negative
				days_of_residence:
					end && dateAtMidnight && duration >= 0
						? duration + 1
						: currentReservation.days_of_residence,
			};
		});
	};

	const onEndDateChange = (date) => {
		const adjustedDate = date ? date.startOf("day") : null;
		setHasDateEdits(true);

		setReservation((currentReservation) => {
			const start = currentReservation.checkin_date
				? dayjs(currentReservation.checkin_date).startOf("day")
				: null;

			// Calculate the difference in days
			const duration =
				start && adjustedDate ? adjustedDate.diff(start, "day") : 0;

			return {
				...currentReservation,
				checkout_date: adjustedDate ? adjustedDate.toISOString() : null, // Store as ISO string or null if no date
				days_of_residence: duration >= 0 ? duration + 1 : 0,
			};
		});
	};

	const disabledEndDate = (current) => {
		if (!reservation.checkin_date) return false;
		if (!current) return false;
		return current.isBefore(
			dayjs(reservation.checkin_date).startOf("day"),
			"day",
		);
	};
	const selectedKeys = useMemo(() => {
		const keys = new Set();
		(Array.isArray(reservation?.pickedRoomsType)
			? reservation.pickedRoomsType
			: []
		).forEach((room) => {
			keys.add(
				buildRoomKey(
					room.room_type,
					room.displayName || room.display_name || "",
				),
			);
		});
		return Array.from(keys);
	}, [reservation?.pickedRoomsType]);

	const Z_TOP = 5000;

	const buildRoomLine = useCallback(
		(roomType, displayName) => {
			if (!reservation?.checkin_date || !reservation?.checkout_date)
				return null;
			const detail = findRoomDetail(roomType, displayName);
			if (!detail) return null;
			const resolvedDisplayName =
				displayName || detail.displayName || roomType || "";
			const nightly = safeParseFloat(detail?.price?.basePrice, 0);
			const pricingByDay = getPricingByDayForRoom(
				nightly,
				null,
				roomType,
				resolvedDisplayName,
			);
			const total = pricingByDay.reduce(
				(sum, day) => sum + getDayFinal(day),
				0,
			);
			const avgNight = pricingByDay.length
				? total / pricingByDay.length
				: nightly;
			return {
				room_type: roomType,
				displayName: resolvedDisplayName,
				pricingByDay,
				chosenPrice: Number(avgNight.toFixed(2)),
				count: 1,
			};
		},
		[
			reservation?.checkin_date,
			reservation?.checkout_date,
			findRoomDetail,
			getPricingByDayForRoom,
			getDayFinal,
			safeParseFloat,
		],
	);

	const toggleChip = (key) => {
		if (!reservation?.checkin_date || !reservation?.checkout_date) {
			toast.info(
				chosenLanguage === "Arabic"
					? "من فضلك اختر تاريخ الوصول والمغادرة أولا"
					: "Please pick check-in and check-out first.",
			);
			return;
		}
		const { room_type, displayName } = splitRoomKey(key);
		const exists = selectedKeys.includes(key);
		setHasRoomLineEdits(true);
		if (exists) {
			setReservation((prev) => ({
				...prev,
				pickedRoomsType: (prev.pickedRoomsType || []).filter(
					(r) =>
						buildRoomKey(r.room_type, r.displayName || r.display_name || "") !==
						key,
				),
			}));
		} else {
			const built = buildRoomLine(room_type, displayName);
			if (built) {
				setReservation((prev) => ({
					...prev,
					pickedRoomsType: [...(prev.pickedRoomsType || []), built],
				}));
			}
		}
	};

	const normalizeRoomSelection = useCallback((values) => {
		if (!Array.isArray(values)) return [];
		return values
			.map((value) =>
				value && typeof value === "object" ? value.value : value,
			)
			.filter(Boolean)
			.map((id) => String(id));
	}, []);

	const areSameRoomSelection = useCallback((left, right) => {
		if (!Array.isArray(left) || !Array.isArray(right)) return false;
		if (left.length !== right.length) return false;
		const leftSorted = [...left].map(String).sort();
		const rightSorted = [...right].map(String).sort();
		return leftSorted.every((id, index) => id === rightSorted[index]);
	}, []);

	const applyRoomSelection = useCallback(
		(roomIds) => {
			setSelectedRoomIds(roomIds);
			setReservation((currentReservation) => ({
				...currentReservation,
				roomId: roomIds,
			}));
		},
		[setReservation],
	);

	const handleRoomSelectionChange = (values) => {
		const nextValues = normalizeRoomSelection(values);
		if (
			selectedRoomIds.length > 0 &&
			!areSameRoomSelection(selectedRoomIds, nextValues)
		) {
			setPendingRoomIds(nextValues);
			setIsRoomChangeConfirmVisible(true);
			return;
		}
		applyRoomSelection(nextValues);
	};
	const handleConfirmRoomChange = () => {
		applyRoomSelection(pendingRoomIds);
		setPendingRoomIds([]);
		setIsRoomChangeConfirmVisible(false);
	};
	const handleCancelRoomChange = () => {
		setPendingRoomIds([]);
		setIsRoomChangeConfirmVisible(false);
	};

	const calculateTotalAmountPerDay = () => {
		const rooms = Array.isArray(reservation.pickedRoomsType)
			? reservation.pickedRoomsType
			: [];
		return rooms.reduce(
			(total, room) =>
				total + (Number(room.count) || 1) * (Number(room.chosenPrice) || 0),
			0,
		);
	};

	const removeRoom = () => {
		if (selectedRoomIndex !== null) {
			setReservation((currentReservation) => ({
				...currentReservation,
				pickedRoomsType: (currentReservation.pickedRoomsType || []).filter(
					(_, index) => index !== selectedRoomIndex,
				),
			}));
		}
		setHasRoomLineEdits(true);
		setIsRoomCountModalOpen(false);
		setIsPricingModalOpen(false);
	};

	const flattenRoomsForSave = (rooms = []) => {
		const flattened = [];
		rooms.forEach((room) => {
			const displayName = resolveDisplayNameForType(
				room.room_type,
				room.displayName || room.display_name,
			);
			const pricingByDay = Array.isArray(room.pricingByDay)
				? room.pricingByDay
				: [];
			const normalizedPricing = pricingByDay.map((day) => {
				const finalPrice = safeParseFloat(
					day.totalPriceWithCommission ?? day.price,
					0,
				);
				const totalPriceWithCommission = safeParseFloat(
					day.totalPriceWithCommission ?? finalPrice,
					finalPrice,
				);
				const totalPriceWithoutCommission =
					day.totalPriceWithoutCommission !== undefined
						? safeParseFloat(day.totalPriceWithoutCommission, 0)
						: finalPrice;
				const rootPrice =
					day.rootPrice !== undefined
						? safeParseFloat(day.rootPrice, 0)
						: day.rootPrice;
				const commissionRate =
					day.commissionRate !== undefined
						? safeParseFloat(day.commissionRate, 0)
						: day.commissionRate;
				return {
					...day,
					price: finalPrice,
					rootPrice,
					commissionRate,
					totalPriceWithCommission,
					totalPriceWithoutCommission,
				};
			});
			const totalWithComm = normalizedPricing.reduce(
				(acc, day) => acc + safeParseFloat(day.totalPriceWithCommission, 0),
				0,
			);
			const hotelShouldGet = normalizedPricing.reduce(
				(acc, day) => acc + safeParseFloat(day.rootPrice, 0),
				0,
			);
			const avgNight =
				normalizedPricing.length > 0
					? totalWithComm / normalizedPricing.length
					: safeParseFloat(room.chosenPrice, 0);
			const count = Number(room.count) || 1;

			const baseRoom = {
				...room,
				displayName,
				chosenPrice: Number(avgNight.toFixed(2)),
				count: 1,
				pricingByDay: normalizedPricing,
			};

			for (let i = 0; i < count; i += 1) {
				flattened.push({
					...baseRoom,
					totalPriceWithCommission: Number(totalWithComm.toFixed(2)),
					hotelShouldGet: Number(hotelShouldGet.toFixed(2)),
				});
			}
		});
		return flattened;
	};

	const UpdateReservation = () => {
		const confirmationMessage = `Are you sure you want to update this reservation?`;
		if (window.confirm(confirmationMessage)) {
			const normalizedRoomIds = Array.isArray(selectedRoomIds)
				? selectedRoomIds
				: [];
			const existingRoomIds = Array.isArray(initialRoomIdsRef.current)
				? initialRoomIdsRef.current
				: [];
			const statusRaw = String(reservation?.reservation_status || "");
			const statusLower = statusRaw.toLowerCase();
			const isCheckedOut =
				statusLower.includes("checked_out") ||
				statusLower.includes("checkedout") ||
				statusLower.includes("checked out");
			const shouldSetInhouse =
				!isCheckedOut &&
				existingRoomIds.length === 0 &&
				normalizedRoomIds.length > 0;
			const updateData = {
				...reservation,
				roomId: normalizedRoomIds,
				hotelName: hotelDetails.hotelName,
				sendEmail: sendEmail,
			};
			if (shouldSetInhouse) {
				updateData.reservation_status = "inhouse";
			}
			if (
				reservation.paid_amount !== "" &&
				reservation.paid_amount !== null &&
				reservation.paid_amount !== undefined
			) {
				updateData.paid_amount = safeParseFloat(reservation.paid_amount, 0);
			}

			if (hasRoomLineEdits || hasDateEdits) {
				const dateStart = normalizeDate(reservation.checkin_date);
				const dateEnd = normalizeDate(reservation.checkout_date);
				const hasValidDates = !!dateStart && !!dateEnd;
				const nightsCount = hasValidDates
					? Math.max(dateEnd.diff(dateStart, "days"), 0)
					: 0;
				const totalPerDay = calculateTotalAmountPerDay();
				const totalAmount = Number(
					(totalPerDay * Number(nightsCount)).toFixed(2),
				);
				const normalizedPickedRoomsType = Array.isArray(
					reservation.pickedRoomsType,
				)
					? reservation.pickedRoomsType.map((room) => {
							const displayName = resolveDisplayNameForType(
								room.room_type,
								room.displayName || room.display_name,
							);
							const nightlyPrice = Number(room.chosenPrice) || 0;
							return {
								...room,
								displayName,
								chosenPrice: nightlyPrice,
								pricingByDay: getPricingByDayForRoom(
									nightlyPrice,
									room.pricingByDay,
									room.room_type,
									displayName,
								),
							};
					  })
					: [];

				const totalRoomsFromTypes = normalizedPickedRoomsType.reduce(
					(sum, room) => sum + (Number(room.count) || 1),
					0,
				);
				const daysOfResidence = hasValidDates
					? Math.max(nightsCount + 1, 1)
					: Number(reservation.days_of_residence) || 0;
				const flattenedRooms = flattenRoomsForSave(normalizedPickedRoomsType);

				updateData.pickedRoomsType = flattenedRooms;
				updateData.pickedRoomsPricing = flattenedRooms;
				updateData.total_rooms = totalRoomsFromTypes;
				updateData.days_of_residence = daysOfResidence;
				updateData.total_amount = totalAmount;
				updateData.sub_total = totalAmount;
			}

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					toast.success(
						"Reservation was successfully updated & Email was sent to the guest",
					);
					setIsRoomCountModalOpen(false);
					setIsPricingModalOpen(false);

					// Update local state or re-fetch reservation data if necessary
					setReservation(response.reservation);
					initialRoomIdsRef.current = getReservationRoomIds(
						response.reservation?.roomId,
					);
					setHasRoomLineEdits(false);
					setHasDateEdits(false);
				}
			});
		}
	};

	const bookedRoomIdSet = useMemo(
		() => new Set(bookedRoomIds),
		[bookedRoomIds],
	);
	const roomTypeDisplayNameLookup = useMemo(() => {
		const map = new Map();
		const roomTypes = Array.isArray(hotelDetails?.roomCountDetails)
			? hotelDetails.roomCountDetails
			: [];
		roomTypes.forEach((roomType) => {
			const key = roomType?.roomType;
			if (!key) return;
			map.set(String(key), {
				name: roomType.displayName || roomType.roomType || String(key),
				nameAr:
					roomType.displayName_OtherLanguage ||
					roomType.displayName ||
					roomType.roomType ||
					String(key),
			});
		});
		return map;
	}, [hotelDetails?.roomCountDetails]);
	const resolveRoomId = useCallback((room) => {
		if (!room) return "";
		if (typeof room === "string") return room;
		if (typeof room === "object") {
			return room._id || room.id || room.roomId || "";
		}
		return "";
	}, []);
	const getRoomLabel = useCallback(
		(room) => {
			const roomNumber =
				room?.room_number || room?.roomNumber || room?.room_no || "";
			const roomTypeKey = room?.room_type || room?.roomType || "";
			const displayNameFromRoom = room?.display_name || room?.displayName || "";
			const displayNameInfo = roomTypeKey
				? roomTypeDisplayNameLookup.get(String(roomTypeKey))
				: null;
			const mappedDisplayName =
				chosenLanguage === "Arabic"
					? displayNameInfo?.nameAr
					: displayNameInfo?.name;
			const roomType =
				displayNameFromRoom || mappedDisplayName || roomTypeKey || "";
			const numberLabel = roomNumber
				? roomNumber
				: chosenLanguage === "Arabic"
				  ? "بدون رقم"
				  : "No #";
			const typeLabel = roomType
				? roomType
				: chosenLanguage === "Arabic"
				  ? "غرفة"
				  : "room";
			const flags = [];
			if (room?.isVip) flags.push("VIP");
			if (room?.isHandicapped) {
				flags.push(chosenLanguage === "Arabic" ? "ذوي الإعاقة" : "Handicapped");
			}
			if (room?.active === false) {
				flags.push(chosenLanguage === "Arabic" ? "مغلقة" : "Closed");
			}
			const flagsLabel = flags.length > 0 ? ` (${flags.join(" • ")})` : "";
			return `${numberLabel} | ${typeLabel}${flagsLabel}`;
		},
		[chosenLanguage, roomTypeDisplayNameLookup],
	);
	const roomsForSelect = useMemo(() => {
		const merged = [];
		const seen = new Set();
		const addRoom = (room) => {
			const id = resolveRoomId(room);
			if (!id || seen.has(id)) return;
			seen.add(id);
			merged.push(room);
		};
		(Array.isArray(hotelRooms) ? hotelRooms : []).forEach(addRoom);
		(Array.isArray(reservation?.roomDetails)
			? reservation.roomDetails
			: []
		).forEach(addRoom);
		(Array.isArray(reservation?.roomId) ? reservation.roomId : [])
			.filter((room) => room && typeof room === "object")
			.forEach(addRoom);
		return merged;
	}, [
		hotelRooms,
		reservation?.roomDetails,
		reservation?.roomId,
		resolveRoomId,
	]);
	const roomLookup = useMemo(() => {
		const map = new Map();
		roomsForSelect.forEach((room) => {
			const id = resolveRoomId(room);
			if (!id) return;
			map.set(String(id), room);
		});
		return map;
	}, [roomsForSelect, resolveRoomId]);
	const selectedRoomValues = useMemo(() => {
		if (!Array.isArray(selectedRoomIds)) return [];
		return selectedRoomIds.map((id) => {
			const room = roomLookup.get(String(id));
			const label = room ? getRoomLabel(room) : String(id);
			return { value: String(id), label };
		});
	}, [selectedRoomIds, roomLookup, getRoomLabel]);
	const requestedRoomsCount = Array.isArray(reservation.pickedRoomsType)
		? reservation.pickedRoomsType.reduce(
				(sum, room) => sum + (Number(room.count) || 1),
				0,
		  )
		: 0;
	const selectedRoomLine =
		Array.isArray(reservation.pickedRoomsType) && selectedRoomIndex != null
			? reservation.pickedRoomsType[selectedRoomIndex]
			: null;
	const selectedRoomLabel = selectedRoomLine
		? resolveDisplayNameForType(
				selectedRoomLine.room_type,
				selectedRoomLine.displayName || selectedRoomLine.display_name,
		  )
		: "";
	const hasValidDateRange = useMemo(() => {
		const start = normalizeDate(reservation.checkin_date);
		const end = normalizeDate(reservation.checkout_date);
		return !!start && !!end;
	}, [normalizeDate, reservation.checkin_date, reservation.checkout_date]);
	const nightsCountDisplay = hasValidDateRange ? getNightsCount() : 0;
	const daysCountDisplay = hasValidDateRange
		? Math.max(nightsCountDisplay + 1, 1)
		: Number(reservation.days_of_residence) || 0;
	const nightsDisplay = hasValidDateRange
		? nightsCountDisplay
		: Math.max(daysCountDisplay - 1, 0);
	const selectedRoomPricing = selectedRoomLine
		? ensurePricingByDay(selectedRoomLine)
		: [];
	const totalPerDay = useMemo(() => {
		if (!Array.isArray(reservation.pickedRoomsType)) return 0;
		return reservation.pickedRoomsType.reduce(
			(sum, room) =>
				sum + (Number(room.chosenPrice) || 0) * (Number(room.count) || 1),
			0,
		);
	}, [reservation.pickedRoomsType]);
	const grandTotal = useMemo(() => {
		const nights = Math.max(0, nightsCountDisplay);
		return Number((totalPerDay * nights).toFixed(2));
	}, [totalPerDay, nightsCountDisplay]);
	const paidAmountValue = useMemo(() => {
		if (
			reservation.paid_amount === "" ||
			reservation.paid_amount === null ||
			reservation.paid_amount === undefined
		) {
			return 0;
		}
		return safeParseFloat(reservation.paid_amount, 0);
	}, [reservation.paid_amount, safeParseFloat]);
	const remainingAmount = useMemo(
		() => Math.max(grandTotal - paidAmountValue, 0),
		[grandTotal, paidAmountValue],
	);
	const commentValue = reservation.comment ?? reservation.booking_comment ?? "";
	const customerDetails = reservation.customer_details || {};
	const bookingSourceOptions = [
		"janat",
		"affiliate",
		"manual",
		"booking.com",
		"trivago",
		"expedia",
		"hotel.com",
		"airbnb",
	];
	const bookingSourceLabels = {
		janat: "Janat",
		affiliate: "Affiliate",
		manual: "Manual Reservation",
		"booking.com": "Booking.com",
		trivago: "Trivago",
		expedia: "Expedia",
		"hotel.com": "Hotel.com",
		airbnb: "Airbnb",
	};
	const paymentOptions = [
		"not paid",
		"credit/ debit",
		"cash",
		"deposit",
		"paid online",
		"paid offline",
	];
	const paymentLabels = {
		"not paid": "Not Paid",
		"credit/ debit": "Credit/ Debit",
		cash: "Cash",
		deposit: "Deposit",
		"paid online": "Paid Online",
		"paid offline": "Paid Offline",
	};
	return (
		<div>
			<Wrapper arabic={chosenLanguage === "Arabic"} zIndex={Z_TOP}>
				<Modal
					title={
						selectedRoomLine
							? `${
									chosenLanguage === "Arabic" ? "تحديث الغرف" : "Update Room"
							  }: ${selectedRoomLabel || selectedRoomLine.room_type}`
							: ""
					}
					open={isRoomCountModalOpen}
					onCancel={closeRoomCountModal}
					zIndex={Z_TOP + 10}
					footer={[
						<Button key='remove' danger onClick={removeRoom}>
							{chosenLanguage === "Arabic" ? "حذف" : "Remove Room"}
						</Button>,
						<Button key='cancel' onClick={closeRoomCountModal}>
							{chosenLanguage === "Arabic" ? "إلغاء" : "Cancel"}
						</Button>,
						<Button key='ok' type='primary' onClick={saveRoomCount}>
							{chosenLanguage === "Arabic" ? "حفظ" : "Save"}
						</Button>,
					]}
				>
					<p style={{ marginBottom: 8 }}>
						{chosenLanguage === "Arabic" ? "تعديل العدد:" : "Update the count:"}
					</p>
					<InputNumber
						min={1}
						value={updatedRoomCount}
						onChange={setUpdatedRoomCount}
					/>
					<div className='mt-3'>
						<Button
							type='dashed'
							onClick={() => {
								setIsRoomCountModalOpen(false);
								if (selectedRoomIndex != null) {
									openPricingModal(selectedRoomIndex);
								}
							}}
						>
							{chosenLanguage === "Arabic" ? "تعديل الأسعار" : "Adjust Pricing"}
						</Button>
					</div>
				</Modal>

				<Modal
					title={
						selectedRoomLine
							? `${chosenLanguage === "Arabic" ? "الأسعار" : "Pricing"}: ${
									selectedRoomLabel || selectedRoomLine.room_type
							  }`
							: ""
					}
					open={isPricingModalOpen}
					onCancel={closePricingModal}
					zIndex={Z_TOP + 20}
					footer={[
						<Button key='inherit' onClick={inheritFirstNight}>
							{chosenLanguage === "Arabic"
								? "توريث أول ليلة"
								: "Inherit First Night"}
						</Button>,
						<InputNumber
							key='distAmt'
							placeholder={
								chosenLanguage === "Arabic"
									? "إجمالي للتوزيع"
									: "Total to distribute"
							}
							value={totalDistribute}
							onChange={setTotalDistribute}
							min={0}
							style={{ width: 180 }}
						/>,
						<Button key='distBtn' onClick={distributeTotalEvenly} type='dashed'>
							{chosenLanguage === "Arabic"
								? "وزّع الإجمالي"
								: "Distribute Total"}
						</Button>,
						<Button key='done' type='primary' onClick={closePricingModal}>
							{chosenLanguage === "Arabic" ? "تم" : "Done"}
						</Button>,
					]}
				>
					<Table
						dataSource={selectedRoomPricing.map((day) => ({
							...day,
							key: day.date,
						}))}
						columns={pricingColumns}
						pagination={false}
						size='small'
						scroll={{ y: 420 }}
					/>
					<div style={{ marginTop: 10, fontWeight: 700, textAlign: "right" }}>
						{chosenLanguage === "Arabic" ? "المجموع:" : "Grand Total:"}{" "}
						{selectedRoomPricing
							.reduce(
								(sum, day) =>
									sum + safeParseFloat(day.totalPriceWithCommission, 0),
								0,
							)
							.toFixed(2)}{" "}
						SAR
					</div>
				</Modal>

				<Modal
					title={
						chosenLanguage === "Arabic"
							? "تأكيد تغيير الغرفة"
							: "Confirm Room Change"
					}
					open={isRoomChangeConfirmVisible}
					onOk={handleConfirmRoomChange}
					onCancel={handleCancelRoomChange}
					okText={chosenLanguage === "Arabic" ? "نعم" : "Yes"}
					cancelText={chosenLanguage === "Arabic" ? "إلغاء" : "Cancel"}
					zIndex={Z_TOP + 30}
				>
					<p>
						{chosenLanguage === "Arabic"
							? "هل تريد تغيير الغرفة لهذا الضيف؟"
							: "Do you want to change the room for this guest?"}
					</p>
				</Modal>

				<h6 className='warn'>
					{chosenLanguage === "Arabic"
						? "تحذير... هذا حجز أولي"
						: "WARNING... THIS IS A preliminary RESERVATION"}
				</h6>

				<Grid>
					<Left>
						<div className='row'>
							<div className='col'>
								<Label>
									{chosenLanguage === "Arabic" ? "الاسم" : "Guest Name"}
								</Label>
								<input
									type='text'
									value={customerDetails.name || ""}
									onChange={(e) =>
										setReservation({
											...reservation,
											customer_details: {
												...customerDetails,
												name: e.target.value,
											},
										})
									}
								/>
							</div>
							<div className='col'>
								<Label>
									{chosenLanguage === "Arabic" ? "الهاتف" : "Guest Phone"}
								</Label>
								<input
									type='text'
									value={customerDetails.phone || ""}
									onChange={(e) =>
										setReservation({
											...reservation,
											customer_details: {
												...customerDetails,
												phone: e.target.value,
											},
										})
									}
								/>
							</div>
							<div className='col'>
								<Label>
									{chosenLanguage === "Arabic"
										? "البريد الإلكتروني"
										: "Guest Email"}
								</Label>
								<input
									type='text'
									value={customerDetails.email || ""}
									onChange={(e) =>
										setReservation({
											...reservation,
											customer_details: {
												...customerDetails,
												email: e.target.value,
											},
										})
									}
								/>
							</div>

							<div className='col'>
								<Label>
									{chosenLanguage === "Arabic"
										? "رقم جواز السفر"
										: "Guest Passport #"}
								</Label>
								<input
									type='text'
									value={customerDetails.passport || ""}
									onChange={(e) =>
										setReservation({
											...reservation,
											customer_details: {
												...customerDetails,
												passport: e.target.value,
											},
										})
									}
								/>
							</div>
							<div className='col'>
								<Label>
									{chosenLanguage === "Arabic"
										? "نسخة جواز السفر"
										: "Passport Copy #"}
								</Label>
								<input
									type='text'
									value={customerDetails.copyNumber || ""}
									onChange={(e) =>
										setReservation({
											...reservation,
											customer_details: {
												...customerDetails,
												copyNumber: e.target.value,
											},
										})
									}
								/>
							</div>
							<div className='col'>
								<Label>
									{chosenLanguage === "Arabic"
										? "تاريخ الميلاد"
										: "Date of Birth"}
								</Label>
								<DatePicker
									className='ant-field'
									format='YYYY-MM-DD'
									value={
										customerDetails.passportExpiry
											? dayjs(customerDetails.passportExpiry)
											: null
									}
									onChange={(v) =>
										setReservation({
											...reservation,
											customer_details: {
												...customerDetails,
												passportExpiry: v ? v.startOf("day").toISOString() : "",
											},
										})
									}
									getPopupContainer={() => document.body}
									popupStyle={{ zIndex: Z_TOP + 5 }}
									style={{ width: "100%", minWidth: 240 }}
									placeholder={
										chosenLanguage === "Arabic" ? "اختر التاريخ" : "Pick a date"
									}
								/>
							</div>
							<div className='col'>
								<Label>
									{chosenLanguage === "Arabic" ? "الجنسية" : "Nationality"}
								</Label>
								<Select
									showSearch
									placeholder={
										chosenLanguage === "Arabic"
											? "اختر الجنسية"
											: "Select Nationality"
									}
									optionFilterProp='children'
									filterOption={(input, option) =>
										(option?.children ?? "")
											.toString()
											.toLowerCase()
											.includes(input.toLowerCase())
									}
									value={customerDetails.nationality || undefined}
									onChange={(val) =>
										setReservation({
											...reservation,
											customer_details: {
												...customerDetails,
												nationality: val,
											},
										})
									}
									style={{ width: "100%", zIndex: 9999 }}
									className='ant-field'
								>
									{customerDetails.nationality &&
									!countryListWithAbbreviations.some(
										(c) => c.code === customerDetails.nationality,
									) ? (
										<Select.Option
											key={customerDetails.nationality}
											value={customerDetails.nationality}
										>
											{customerDetails.nationality}
										</Select.Option>
									) : null}
									{countryListWithAbbreviations.map((c) => (
										<Select.Option key={c.code} value={c.code}>
											{c.name}
										</Select.Option>
									))}
								</Select>
							</div>

							<div className='col'>
								<Label>
									{chosenLanguage === "Arabic"
										? "تاريخ الوصول"
										: "Check-in Date"}{" "}
									{reservation.checkin_date ? (
										<small className='pill-inline'>
											<CalendarOutlined />{" "}
											{dayjs(reservation.checkin_date).format("YYYY-MM-DD")}
										</small>
									) : null}
								</Label>
								<DatePicker
									className='ant-field'
									disabledDate={disabledDate}
									inputReadOnly
									size='middle'
									format='YYYY-MM-DD'
									value={
										reservation.checkin_date
											? dayjs(reservation.checkin_date)
											: null
									}
									onChange={onStartDateChange}
									getPopupContainer={() => document.body}
									popupStyle={{ zIndex: Z_TOP + 5 }}
									style={{ width: "100%", minWidth: 240 }}
									placeholder={
										chosenLanguage === "Arabic" ? "اختر التاريخ" : "Pick a date"
									}
								/>
							</div>
							<div className='col'>
								<Label>
									{chosenLanguage === "Arabic"
										? "تاريخ المغادرة"
										: "Check-out Date"}{" "}
									{reservation.checkout_date ? (
										<small className='pill-inline'>
											<CalendarOutlined />{" "}
											{dayjs(reservation.checkout_date).format("YYYY-MM-DD")}
										</small>
									) : null}
								</Label>
								<DatePicker
									className='ant-field'
									disabledDate={disabledEndDate}
									inputReadOnly
									size='middle'
									format='YYYY-MM-DD'
									value={
										reservation.checkout_date
											? dayjs(reservation.checkout_date)
											: null
									}
									onChange={onEndDateChange}
									getPopupContainer={() => document.body}
									popupStyle={{ zIndex: Z_TOP + 5 }}
									style={{ width: "100%", minWidth: 240 }}
									placeholder={
										chosenLanguage === "Arabic" ? "اختر التاريخ" : "Pick a date"
									}
								/>
							</div>
						</div>

						<Block>
							<div className='row'>
								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic"
											? "مصدر الحجز"
											: "Booking Source"}
									</Label>
									<select
										onChange={(e) =>
											setReservation({
												...reservation,
												booking_source: e.target.value,
											})
										}
										className='selectlike'
										value={reservation.booking_source || ""}
									>
										<option value=''>
											{chosenLanguage === "Arabic"
												? "الرجاء الاختيار"
												: "Please Select"}
										</option>
										{reservation.booking_source &&
										!bookingSourceOptions.includes(
											reservation.booking_source,
										) ? (
											<option value={reservation.booking_source}>
												{reservation.booking_source}
											</option>
										) : null}
										{bookingSourceOptions.map((source) => (
											<option key={source} value={source}>
												{bookingSourceLabels[source] || source}
											</option>
										))}
									</select>
								</div>

								{reservation.booking_source &&
								reservation.booking_source !== "manual" ? (
									<div className='col'>
										<Label>
											{chosenLanguage === "Arabic"
												? "رقم التأكيد"
												: "Confirmation #"}
										</Label>
										<input
											type='text'
											value={reservation.confirmation_number || ""}
											onChange={(e) =>
												setReservation({
													...reservation,
													confirmation_number: e.target.value,
												})
											}
										/>
									</div>
								) : null}

								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic" ? "الدفع" : "Payment"}
									</Label>
									<select
										onChange={(e) =>
											setReservation({
												...reservation,
												payment: e.target.value,
											})
										}
										className='selectlike'
										value={reservation.payment || ""}
									>
										<option value=''>
											{chosenLanguage === "Arabic"
												? "الرجاء الاختيار"
												: "Please Select"}
										</option>
										{reservation.payment &&
										!paymentOptions.includes(reservation.payment) ? (
											<option value={reservation.payment}>
												{reservation.payment}
											</option>
										) : null}
										{paymentOptions.map((option) => (
											<option key={option} value={option}>
												{paymentLabels[option] || option}
											</option>
										))}
									</select>
									{reservation.payment === "deposit" && (
										<div className='mt-2'>
											<input
												value={reservation.paid_amount || ""}
												onChange={(e) =>
													setReservation({
														...reservation,
														paid_amount: e.target.value,
													})
												}
												type='text'
												placeholder={
													chosenLanguage === "Arabic"
														? "المبلغ المودع"
														: "Deposited amount"
												}
											/>
										</div>
									)}
								</div>

								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic"
											? "عدد الضيوف"
											: "Total Guests"}
									</Label>
									<input
										type='number'
										min={1}
										value={reservation.total_guests || ""}
										onChange={(e) =>
											setReservation({
												...reservation,
												total_guests: e.target.value,
											})
										}
									/>
								</div>

								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic"
											? "إرسال بريد إلكتروني"
											: "Send Email"}
									</Label>
									<div style={{ paddingTop: 6 }}>
										<input
											type='checkbox'
											checked={sendEmail}
											onChange={(e) => setSendEmail(e.target.checked)}
											style={{ width: 20, height: 20 }}
										/>
									</div>
								</div>

								<div className='col col-span-2'>
									<Label>
										{chosenLanguage === "Arabic" ? "تعليق الضيف" : "Comment"}
									</Label>
									<textarea
										rows={3}
										value={commentValue}
										onChange={(e) =>
											setReservation({
												...reservation,
												comment: e.target.value,
												booking_comment: e.target.value,
											})
										}
									/>
								</div>
							</div>
						</Block>

						<Block>
							<div className='row'>
								<div className='col col-span-2'>
									<Label>
										{chosenLanguage === "Arabic"
											? "تخصيص الغرف"
											: "Room Assignment"}
									</Label>
									<Select
										mode='multiple'
										labelInValue
										className='ant-field'
										style={{ width: "100%" }}
										placeholder={
											chosenLanguage === "Arabic"
												? "اختر أرقام الغرف"
												: "Select room numbers"
										}
										value={selectedRoomValues}
										onChange={handleRoomSelectionChange}
										optionLabelProp='label'
									>
										{roomsForSelect.map((room) => {
											const roomId = String(resolveRoomId(room));
											const isBooked = bookedRoomIdSet.has(roomId);
											const isSelected = selectedRoomIds.includes(roomId);
											const isInactive = room?.active === false;
											const baseLabel = getRoomLabel(room);
											const floorLabel = room.floor
												? ` | ${
														chosenLanguage === "Arabic" ? "الدور" : "Floor"
												  } ${room.floor}`
												: "";
											const occupiedLabel =
												isBooked && !isSelected
													? ` (${
															chosenLanguage === "Arabic"
																? "محجوزة"
																: "Occupied"
													  })`
													: "";
											const displayLabel = `${baseLabel}${floorLabel}${occupiedLabel}`;
											const isDisabled =
												(isBooked && !isSelected) ||
												(isInactive && !isSelected);
											return (
												<Select.Option
													key={roomId}
													value={roomId}
													label={baseLabel}
													disabled={isDisabled}
												>
													<span
														style={{
															textTransform: "capitalize",
															color: isDisabled ? "#8b8b8b" : "inherit",
														}}
													>
														{displayLabel}
													</span>
												</Select.Option>
											);
										})}
									</Select>
									{requestedRoomsCount > 0 ? (
										<div
											style={{
												marginTop: "8px",
												fontWeight: "bold",
												color:
													selectedRoomIds.length === requestedRoomsCount
														? "#1f7a1f"
														: "#b45f06",
											}}
										>
											{chosenLanguage === "Arabic"
												? "الغرف المختارة"
												: "Selected Rooms"}{" "}
											{selectedRoomIds.length} / {requestedRoomsCount}
										</div>
									) : null}
								</div>
							</div>
						</Block>
					</Left>

					<Right>
						<h4 className='headline'>
							{chosenLanguage === "Arabic"
								? "حجز غرفة للضيف"
								: "Reserve A Room For The Guest"}
						</h4>

						<div className='summary-list'>
							<div className='item'>
								<span>
									{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Arrival"}
								</span>
								<div className='pill'>
									{reservation.checkin_date
										? moment(reservation.checkin_date).format("YYYY-MM-DD")
										: "-"}
								</div>
							</div>
							<div className='item'>
								<span>
									{chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Departure"}
								</span>
								<div className='pill'>
									{reservation.checkout_date
										? moment(reservation.checkout_date).format("YYYY-MM-DD")
										: "-"}
								</div>
							</div>
							<div className='item'>
								<span>
									{chosenLanguage === "Arabic"
										? "رقم التأكيد"
										: "Confirmation #"}
								</span>
								<strong>{reservation.confirmation_number || "-"}</strong>
							</div>
							<div className='item'>
								<span>{chosenLanguage === "Arabic" ? "الدفع" : "Payment"}</span>
								<strong>{reservation.payment || "Not Paid"}</strong>
							</div>
						</div>

						<h4 className='total'>
							{chosenLanguage === "Arabic" ? "المبلغ الإجمالي" : "Total Amount"}
							: {grandTotal.toLocaleString()} SAR
						</h4>
						{paidAmountValue > 0 && (
							<div className='total-meta'>
								<span>
									{chosenLanguage === "Arabic"
										? "المبلغ المدفوع"
										: "Paid Amount"}
									: {paidAmountValue.toLocaleString()} SAR
								</span>
								{remainingAmount > 0 && (
									<span>
										{chosenLanguage === "Arabic" ? "المتبقي" : "Remaining"}:{" "}
										{remainingAmount.toLocaleString()} SAR
									</span>
								)}
							</div>
						)}

						<div className='text-center'>
							<Button
								type='default'
								onClick={() =>
									window.scrollTo({ top: 1000, behavior: "smooth" })
								}
							>
								{chosenLanguage === "Arabic"
									? "تسجيل دخول الزائر..."
									: "Check The Guest In..."}
							</Button>
						</div>
					</Right>
				</Grid>

				<div className='container'>
					<div className='row'>
						{Array.isArray(roomInventory) && roomInventory.length > 0 && (
							<div className='col-12' style={{ margin: "20px 0" }}>
								<Label>
									{chosenLanguage === "Arabic" ? "نوع الغرفة" : "Room Type"}
								</Label>
								<RoomGrid>
									{roomInventory.map((room) => {
										const fallbackDetail = findRoomDetail(
											room.room_type,
											room.displayName || room.display_name,
										);
										const resolvedDisplayName =
											room.displayName ||
											room.display_name ||
											fallbackDetail?.displayName ||
											room.room_type;
										const key = buildRoomKey(
											room.room_type,
											resolvedDisplayName,
										);
										const active = selectedKeys.includes(key);
										const availableCount =
											room.available ?? room.total_available ?? 0;
										return (
											<RoomChip
												key={key}
												active={active}
												onClick={() => toggleChip(key)}
												title={`${resolvedDisplayName} (${room.room_type})`}
											>
												<span className='icon'>
													<HomeOutlined />
												</span>
												<span className='text'>
													{resolvedDisplayName} <em>({room.room_type})</em>
												</span>
												<span
													className='badge'
													style={{ background: room.roomColor || "#ddd" }}
												/>
												<span className='avail'>
													{chosenLanguage === "Arabic" ? "المتاح" : "Available"}
													: {availableCount}
												</span>
												{active && (
													<CheckCircleTwoTone
														twoToneColor='#52c41a'
														style={{ fontSize: 16, marginInlineStart: 6 }}
													/>
												)}
											</RoomChip>
										);
									})}
								</RoomGrid>
							</div>
						)}
					</div>
				</div>

				<div className='container mt-3'>
					{customerDetails.name &&
					reservation.checkin_date &&
					reservation.checkout_date &&
					Array.isArray(reservation.pickedRoomsType) &&
					reservation.pickedRoomsType.length > 0 ? (
						<>
							<div className='total-amount my-3'>
								<h5>
									{chosenLanguage === "Arabic"
										? "مدة الإقامة"
										: "Days Of Residence"}
									: {daysCountDisplay}{" "}
									{chosenLanguage === "Arabic" ? "أيام" : "Days"} /{" "}
									{nightsDisplay}{" "}
									{chosenLanguage === "Arabic" ? "ليالٍ" : "Nights"}
								</h5>

								<h4>
									{chosenLanguage === "Arabic"
										? "المبلغ لكل يوم"
										: "Total Amount Per Day"}
									: {Number(totalPerDay).toFixed(2)} SAR /{" "}
									{chosenLanguage === "Arabic" ? "اليوم" : "Day"}
								</h4>

								<div className='room-list my-3'>
									{reservation.pickedRoomsType.map((room, index) => {
										const displayLabel = resolveDisplayLabelForType(
											room.room_type,
											room.displayName || room.display_name,
										);
										return (
											<div
												key={`${room.room_type}_${
													room.displayName || room.display_name || ""
												}_${index}`}
												className='room-item'
											>
												<div className='text'>
													<HomeOutlined />{" "}
													{`Room: ${displayLabel} (${room.room_type}) - `}
													<Tooltip
														title={`${
															chosenLanguage === "Arabic"
																? "معدل الليلة"
																: "Nightly"
														}: ${Number(room.chosenPrice || 0).toFixed(2)} SAR`}
													>
														<span className='price'>
															{Number(room.chosenPrice || 0).toFixed(2)} SAR
														</span>
													</Tooltip>{" "}
													x {Number(room.count) || 1}{" "}
													{chosenLanguage === "Arabic" ? "غرف" : "rooms"}
												</div>
												<div className='actions'>
													<Button
														size='small'
														icon={<MinusOutlined />}
														onClick={() => decCount(index)}
													/>
													<Button
														size='small'
														icon={<PlusOutlined />}
														onClick={() => incCount(index)}
													/>
													<Button
														size='small'
														icon={<EditOutlined />}
														onClick={() => openModal(room, index)}
													>
														{chosenLanguage === "Arabic" ? "العدد" : "Count"}
													</Button>
													<Button
														size='small'
														onClick={() => openPricingModal(index)}
													>
														{chosenLanguage === "Arabic" ? "السعر" : "Pricing"}
													</Button>
												</div>
											</div>
										);
									})}
								</div>

								<h3>
									{chosenLanguage === "Arabic" ? "الإجمالي" : "Total Amount"}:{" "}
									{grandTotal.toLocaleString()} SAR
								</h3>
								{paidAmountValue > 0 ? (
									<h3>
										{chosenLanguage === "Arabic"
											? "المبلغ المدفوع"
											: "Paid Amount"}
										: {paidAmountValue.toLocaleString()} SAR
									</h3>
								) : null}
								{paidAmountValue > 0 && remainingAmount > 0 ? (
									<h3>
										{chosenLanguage === "Arabic" ? "المتبقي" : "Remaining"}:{" "}
										{remainingAmount.toLocaleString()} SAR
									</h3>
								) : null}
							</div>

							<div className='mt-5 mx-auto text-center col-md-6'>
								<Button
									className='cta'
									type='primary'
									onClick={() => {
										UpdateReservation();
									}}
								>
									{chosenLanguage === "Arabic"
										? "تحديث الحجز..."
										: "Update Reservation"}
								</Button>
							</div>
						</>
					) : null}
				</div>
			</Wrapper>
		</div>
	);
};

const Wrapper = styled.div`
	position: relative;
	text-align: ${(p) => (p.arabic ? "right" : "left")};
	direction: ${(p) => (p.arabic ? "rtl" : "ltr")};

	.warn {
		text-transform: uppercase;
		color: darkcyan;
		font-weight: 700;
	}

	input[type="text"],
	input[type="email"],
	input[type="password"],
	input[type="date"],
	input[type="number"],
	select,
	textarea {
		display: block;
		width: 100%;
		padding: 0.55rem 0.6rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		background: #fff;
	}

	.ant-picker,
	.ant-field {
		width: 100% !important;
		min-width: 240px;
		border-radius: 10px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
	}

	.selectlike {
		width: 100%;
		padding: 10px;
		border-radius: 10px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
	}

	.pill-inline {
		background: #eef2ff;
		padding: 2px 6px;
		border-radius: 6px;
		margin-inline-start: 6px;
	}

	h4.headline {
		font-size: 1.35rem;
		font-weight: 800;
		margin: 10px 0 16px;
	}

	h4.total {
		color: #006ad1;
		text-align: center;
		margin: 14px 0;
		font-weight: 800;
	}

	.cta {
		font-weight: 700;
		font-size: 1.05rem;
		padding: 10px 18px;
	}
`;

const Label = styled.label`
	font-weight: 700;
	font-size: 0.95rem;
	color: #32322b;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 6px;
`;

const Grid = styled.div`
	display: grid;
	grid-template-columns: 2fr 1fr;
	gap: 16px;
	@media (max-width: 1200px) {
		grid-template-columns: 1fr;
	}
`;

const Left = styled.div`
	.row {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 12px;
	}
	.col {
		grid-column: span 4;
	}
	.col-span-2 {
		grid-column: span 12;
	}
	@media (max-width: 1200px) {
		.col {
			grid-column: span 6;
		}
	}
	@media (max-width: 768px) {
		.col,
		.col-span-2 {
			grid-column: span 12;
		}
	}
`;

const Block = styled.div`
	margin-top: 18px;
	background: #f6f7f9;
	border: 1px solid #e9edf4;
	border-radius: 10px;
	padding: 14px;

	.row {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 12px;
	}
	.col {
		grid-column: span 3;
	}
	.col-span-2 {
		grid-column: span 6;
	}
	@media (max-width: 1200px) {
		.col {
			grid-column: span 6;
		}
		.col-span-2 {
			grid-column: span 12;
		}
	}
	@media (max-width: 768px) {
		.col,
		.col-span-2 {
			grid-column: span 12;
		}
	}
`;

const Right = styled.div`
	background: #fff;
	border-radius: 8px;
	padding: 14px;
	border: 1px solid #eee;
	min-height: 250px;

	.summary-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-bottom: 8px;
	}
	.total-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 10px;
		font-weight: 700;
		color: #1f2937;
		text-align: center;
	}
	.item {
		background: #fafafa;
		border: 1px solid #f0f0f0;
		border-radius: 8px;
		padding: 10px 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.price {
		color: darkgoldenrod;
		font-weight: 700;
	}
	.room-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #fffdf5;
		border: 1px dashed #eadca6;
		padding: 10px 12px;
		border-radius: 8px;
		margin-bottom: 8px;
	}
	.actions > * {
		margin-inline-start: 8px;
	}

	@media (max-width: 768px) {
		.summary-list {
			grid-template-columns: 1fr;
		}
	}
`;

const RoomGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(410px, 1fr));
	gap: 10px;
`;

const RoomChip = styled.button`
	appearance: none;
	border: 1px solid ${(p) => (p.active ? "#1a9f42" : "#e5e7eb")};
	background: ${(p) => (p.active ? "#e7f7ed" : "#ffffff")};
	color: #111827;
	padding: 10px 12px;
	border-radius: 10px;
	display: grid;
	grid-template-columns: auto 1fr auto auto auto;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	transition:
		box-shadow 0.2s ease,
		transform 0.05s ease;
	text-align: start;

	&:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		transform: translateY(-1px);
	}

	.icon {
		font-size: 18px;
	}
	.text {
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.text em {
		font-style: normal;
		opacity: 0.7;
		font-weight: 600;
	}
	.badge {
		width: 12px;
		height: 12px;
		border-radius: 3px;
	}
	.avail {
		font-size: 12px;
		opacity: 0.8;
	}
`;
