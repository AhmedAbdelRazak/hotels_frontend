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
	DeleteOutlined,
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
import {
	getPaymentMethodLabel,
	normalizePaymentMethod,
	paymentMethodOptionsWithCurrent,
} from "../../utils/paymentMethods";

const buildRoomKey = (roomType, displayName) =>
	`${roomType || ""}|${displayName || ""}`;

const splitRoomKey = (key = "") => {
	const idx = key.indexOf("|");
	if (idx === -1) return { room_type: key, displayName: "" };
	return { room_type: key.slice(0, idx), displayName: key.slice(idx + 1) };
};

const dateOnlyKey = (value) => {
	if (!value) return "";
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	const parsed = moment(value);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

const buildStayDateKeysForCalendar = (startDate, endDate) => {
	const start = moment(startDate).startOf("day");
	const endExclusive = moment(endDate).startOf("day");
	if (!start.isValid() || !endExclusive.isValid() || !endExclusive.isAfter(start)) {
		return [];
	}
	const dates = [];
	for (
		const day = start.clone();
		day.isBefore(endExclusive, "day");
		day.add(1, "day")
	) {
		dates.push(day.format("YYYY-MM-DD"));
	}
	return dates;
};

const calendarRateIsBlocked = (rate = {}) => {
	if (!rate || typeof rate !== "object") return false;
	const price = Number(rate.price);
	const rootPrice = Number(rate.rootPrice);
	const color = String(rate.color || "").toLowerCase();
	return (
		(Number.isFinite(price) && price <= 0) ||
		(Number.isFinite(rootPrice) && rootPrice <= 0 && color === "black") ||
		color === "black"
	);
};

const formatCalendarDateForDisplay = (date) => {
	const parsed = moment(date, "YYYY-MM-DD", true);
	return parsed.isValid() ? parsed.format("DD-MM-YYYY") : String(date || "");
};

const summarizeDateList = (dates = [], maxVisible = 4) => {
	const uniqueDates = Array.from(new Set(dates.filter(Boolean)));
	const visible = uniqueDates
		.slice(0, maxVisible)
		.map(formatCalendarDateForDisplay)
		.join(", ");
	const remaining = uniqueDates.length - maxVisible;
	return remaining > 0 ? `${visible} +${remaining}` : visible;
};

export const EditReservationMain = ({
	chosenLanguage,
	reservation,
	setReservation,
	hotelDetails,
	onReservationSaved,
	basicEditOnly = false,
}) => {
	const [isRoomCountModalOpen, setIsRoomCountModalOpen] = useState(false);
	const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
	const [sendEmail, setSendEmail] = useState(false);
	const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);
	const [updatedRoomCount, setUpdatedRoomCount] = useState(0);
	const [updatedRoomKey, setUpdatedRoomKey] = useState("");
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
	const isArabic = chosenLanguage === "Arabic";
	const blockedCalendarMessageFromResponse = (response) => {
		const blockedRooms =
			response?.blockedCalendar?.blockedRooms ||
			response?.details?.blockedRooms ||
			[];
		if (Array.isArray(blockedRooms) && blockedRooms.length > 0) {
			return blockedRooms
				.map((item) => {
					const roomLabel =
						item.displayName || item.room_type || item.roomType || "Room";
					const datesText = summarizeDateList(item.blockedDates || [], 6);
					return isArabic
						? `\u0627\u0644\u063a\u0631\u0641\u0629 ${roomLabel} \u0645\u062d\u062c\u0648\u0628\u0629 \u062e\u0644\u0627\u0644 ${datesText}.`
						: `${roomLabel} is blocked on ${datesText}.`;
				})
				.join(" ");
		}
		if (response?.code === "calendar_date_blocked" && response?.details?.date) {
			const roomLabel =
				response?.details?.displayName ||
				response?.details?.room_type ||
				"Room";
			const dateText = summarizeDateList([response.details.date], 1);
			return isArabic
				? `\u0627\u0644\u063a\u0631\u0641\u0629 ${roomLabel} \u0645\u062d\u062c\u0648\u0628\u0629 \u0628\u062a\u0627\u0631\u064a\u062e ${dateText}.`
				: `${roomLabel} is blocked on ${dateText}.`;
		}
		return "";
	};
	const apiErrorMessage = (
		response,
		englishFallback = "An error occurred while updating the reservation",
		arabicFallback = "حدث خطأ أثناء تحديث الحجز"
	) => {
		const blockedCalendarMessage = blockedCalendarMessageFromResponse(response);
		if (blockedCalendarMessage) return blockedCalendarMessage;
		return isArabic
			? response?.errorArabic ||
			  response?.messageArabic ||
			  response?.error ||
			  response?.message ||
			  arabicFallback
			: response?.error ||
			  response?.message ||
			  response?.errorArabic ||
			  response?.messageArabic ||
			  englishFallback;
	};
	const successMessage = (english, arabic) => (isArabic ? arabic : english);

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

	const getBlockedDatesForRoom = useCallback(
		(roomType, displayName) => {
			if (!reservation?.checkin_date || !reservation?.checkout_date) return [];
			const detail = findRoomDetail(roomType, displayName);
			if (!detail) return [];
			const stayDates = buildStayDateKeysForCalendar(
				reservation.checkin_date,
				reservation.checkout_date,
			);
			const rates = Array.isArray(detail.pricingRate) ? detail.pricingRate : [];
			return stayDates.filter((date) => {
				const rate = rates.find(
					(item) => dateOnlyKey(item?.calendarDate) === date,
				);
				return calendarRateIsBlocked(rate);
			});
		},
		[
			findRoomDetail,
			reservation?.checkin_date,
			reservation?.checkout_date,
		],
	);

	const formatBlockedRoomMessage = useCallback(
		(roomLabel, blockedDates, forAgent = basicEditOnly) => {
			const datesText = summarizeDateList(blockedDates, 6);
			if (chosenLanguage === "Arabic") {
				return forAgent
					? `\u0627\u0644\u063a\u0631\u0641\u0629 ${roomLabel} \u0645\u062d\u062c\u0648\u0628\u0629 \u0641\u064a \u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0641\u0646\u062f\u0642 \u062e\u0644\u0627\u0644 ${datesText}. \u0644\u0627 \u064a\u0645\u0643\u0646 \u0644\u0644\u0648\u0643\u064a\u0644 \u062d\u062c\u0632\u0647\u0627 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e.`
					: `\u062a\u0646\u0628\u064a\u0647: \u0627\u0644\u063a\u0631\u0641\u0629 ${roomLabel} \u0645\u062d\u062c\u0648\u0628\u0629 \u0641\u064a \u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0641\u0646\u062f\u0642 \u062e\u0644\u0627\u0644 ${datesText}.`;
			}
			return forAgent
				? `${roomLabel} is blocked on the hotel calendar for ${datesText}. Agents cannot book this room on those dates.`
				: `Warning: ${roomLabel} is blocked on the hotel calendar for ${datesText}.`;
		},
		[basicEditOnly, chosenLanguage],
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
				d.isBefore(end, "day") || d.isSame(end, "day");
				d.add(1, "day")
			) {
				const dateString = d.format("YYYY-MM-DD");
				const rate =
					Array.isArray(detail.pricingRate) &&
					detail.pricingRate.find(
						(r) => dateOnlyKey(r?.calendarDate) === dateString,
					);
				const calendarBlocked = calendarRateIsBlocked(rate);
				const basePrice = safeParseFloat(
					calendarBlocked ? undefined : rate?.price,
					safeParseFloat(detail?.price?.basePrice, 0),
				);
				const rootPrice = safeParseFloat(
					calendarBlocked ? undefined : rate?.rootPrice ?? rate?.defaultCost,
					safeParseFloat(detail?.defaultCost, 0),
				);
				const commissionRate = safeParseFloat(
					calendarBlocked ? undefined : rate?.commissionRate,
					fallbackCommission,
				);
				const totalPriceWithCommission =
					basePrice + rootPrice * pct(commissionRate);
				rows.push({
					date: dateString,
					price: basePrice,
					rootPrice,
					commissionRate,
					calendarBlocked,
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
				const expectedDates = Array.from({ length: nightsCount }, (_, idx) =>
					start.clone().add(idx, "day").format("YYYY-MM-DD")
				);
				const pricingDatesMatch =
					existingPricingByDay.length === nightsCount &&
					existingPricingByDay.every(
						(day, idx) =>
							(day?.date ? dayjs(day.date).format("YYYY-MM-DD") : "") ===
							expectedDates[idx]
					);
				if (pricingDatesMatch) {
					return existingPricingByDay.map((day) => ({
						...buildDayRow(day.date, nightlyPrice, day),
					}));
				}
			}
			const template = Array.isArray(existingPricingByDay)
				? existingPricingByDay[0]
				: null;
			if (nightlyPrice > 0 && template) {
				return buildPricingByNightly(nightlyPrice, nightsCount, start, template);
			}
			if (nightlyPrice > 0) {
				return buildPricingByNightly(nightlyPrice, nightsCount, start);
			}
			const templateRows = buildPricingByDayFromDetail(roomType, displayName);
			if (templateRows.length > 0) {
				return templateRows;
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
		const displayName = resolveDisplayNameForType(
			room?.room_type,
			room?.displayName || room?.display_name,
		);
		setSelectedRoomIndex(index);
		setUpdatedRoomCount(Number(room?.count) || 1);
		setUpdatedRoomKey(buildRoomKey(room?.room_type, displayName));
		setIsRoomCountModalOpen(true);
	};

	const closeRoomCountModal = () => {
		setIsRoomCountModalOpen(false);
		setUpdatedRoomKey("");
	};

	const saveRoomCount = () => {
		if (selectedRoomIndex == null) return;
		const selectedKey = updatedRoomKey || "";
		const { room_type: nextRoomType, displayName: nextDisplayNameRaw } =
			splitRoomKey(selectedKey);
		if (!nextRoomType) {
			toast.error(
				chosenLanguage === "Arabic"
					? "\u0627\u062e\u062a\u0631 \u0646\u0648\u0639 \u0627\u0644\u063a\u0631\u0641\u0629 \u0623\u0648\u0644\u0627."
					: "Please choose a room type first.",
			);
			return;
		}

		const currentLine =
			Array.isArray(reservation.pickedRoomsType) &&
			reservation.pickedRoomsType[selectedRoomIndex]
				? reservation.pickedRoomsType[selectedRoomIndex]
				: {};
		const currentDisplayName = resolveDisplayNameForType(
			currentLine.room_type,
			currentLine.displayName || currentLine.display_name,
		);
		const currentKey = buildRoomKey(currentLine.room_type, currentDisplayName);
		const nextDisplayName = resolveDisplayNameForType(
			nextRoomType,
			nextDisplayNameRaw,
		);
		const roomTypeChanged = selectedKey !== currentKey;
		const rebuiltLine = roomTypeChanged
			? buildRoomLine(nextRoomType, nextDisplayName)
			: null;
		if (roomTypeChanged && !rebuiltLine) {
			toast.error(
				chosenLanguage === "Arabic"
					? "\u0644\u0645 \u0646\u062a\u0645\u0643\u0646 \u0645\u0646 \u062a\u062d\u0636\u064a\u0631 \u062a\u0633\u0639\u064a\u0631 \u0647\u0630\u0627 \u0627\u0644\u0646\u0648\u0639. \u0631\u0627\u062c\u0639 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0648\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u063a\u0631\u0641\u0629."
					: "Could not prepare pricing for this room type. Please check the dates and room setup.",
			);
			return;
		}

		setReservation((currentReservation) => {
			const updatedRooms = [...(currentReservation.pickedRoomsType || [])];
			const latestLine = updatedRooms[selectedRoomIndex] || {};
			const nextLine = roomTypeChanged
				? {
						...rebuiltLine,
						count: Math.max(1, Number(updatedRoomCount || 1)),
				  }
				: {
						...latestLine,
						room_type: nextRoomType,
						displayName: nextDisplayName,
						display_name: nextDisplayName,
						count: Math.max(1, Number(updatedRoomCount || 1)),
				  };
			const pricingByDay = roomTypeChanged
				? nextLine.pricingByDay || []
				: ensurePricingByDay(nextLine);
			updatedRooms[selectedRoomIndex] = {
				...nextLine,
				pricingByDay,
				chosenPrice: recalcChosenPrice(pricingByDay),
			};
			return {
				...currentReservation,
				pickedRoomsType: updatedRooms,
			};
		});
		setHasRoomLineEdits(true);
		setIsRoomCountModalOpen(false);
		setUpdatedRoomKey("");
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
			const currentStart = currentReservation.checkin_date
				? dayjs(currentReservation.checkin_date).startOf("day")
				: null;
			const currentEnd = currentReservation.checkout_date
				? dayjs(currentReservation.checkout_date).startOf("day")
				: null;
			let nightsCount = 0;
			if (currentStart && currentEnd) {
				nightsCount = Math.max(currentEnd.diff(currentStart, "day"), 0);
			} else if (Number(currentReservation.days_of_residence) > 0) {
				nightsCount = Math.max(
					Number(currentReservation.days_of_residence) - 1,
					0,
				);
			}

			const nextCheckout =
				dateAtMidnight && nightsCount > 0
					? dateAtMidnight.clone().add(nightsCount, "day")
					: currentEnd;

			return {
				...currentReservation,
				checkin_date: dateAtMidnight ? dateAtMidnight.toISOString() : null,
				checkout_date: nextCheckout
					? nextCheckout.toISOString()
					: currentReservation.checkout_date,
				days_of_residence:
					dateAtMidnight && nextCheckout
						? Math.max(nextCheckout.diff(dateAtMidnight, "day"), 0)
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
				days_of_residence: duration >= 0 ? duration : 0,
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
			const displayName = resolveDisplayNameForType(
				room.room_type,
				room.displayName || room.display_name,
			);
			keys.add(
				buildRoomKey(
					room.room_type,
					displayName,
				),
			);
		});
		return Array.from(keys);
	}, [reservation?.pickedRoomsType, resolveDisplayNameForType]);

	const roomEditorOptions = useMemo(() => {
		const options = new Map();
		const addRoomOption = (room = {}) => {
			const roomType = room.room_type || room.roomType || room.type || "";
			if (!roomType) return;
			const suppliedDisplayName = room.displayName || room.display_name || "";
			const fallbackDetail = findRoomDetail(roomType, suppliedDisplayName);
			const displayName =
				suppliedDisplayName || fallbackDetail?.displayName || roomType;
			const key = buildRoomKey(roomType, displayName);
			const label =
				resolveDisplayLabelForType(roomType, displayName) ||
				displayName ||
				roomType;
			const availableCount = room.available ?? room.total_available ?? null;
			const blockedDates = getBlockedDatesForRoom(roomType, displayName);
			const existing = options.get(key) || {};
			options.set(key, {
				...existing,
				key,
				roomType: existing.roomType || roomType,
				displayName: existing.displayName || displayName,
				label: existing.label || label,
				availableCount:
					availableCount !== null && availableCount !== undefined
						? availableCount
						: existing.availableCount ?? null,
				blockedDates:
					blockedDates.length > 0 ? blockedDates : existing.blockedDates || [],
			});
		};

		(Array.isArray(roomInventory) ? roomInventory : []).forEach(addRoomOption);
		(Array.isArray(roomDetails) ? roomDetails : []).forEach(addRoomOption);
		(Array.isArray(reservation?.pickedRoomsType)
			? reservation.pickedRoomsType
			: []
		).forEach(addRoomOption);

		return Array.from(options.values()).sort((a, b) =>
			String(a.label || "").localeCompare(String(b.label || ""), undefined, {
				numeric: true,
			}),
		);
	}, [
		findRoomDetail,
		getBlockedDatesForRoom,
		reservation?.pickedRoomsType,
		resolveDisplayLabelForType,
		roomDetails,
		roomInventory,
	]);
	const roomEditorOptionMap = useMemo(
		() => new Map(roomEditorOptions.map((option) => [option.key, option])),
		[roomEditorOptions],
	);

	const Z_TOP = 19000;
	const childModalProps = (layer) => ({
		zIndex: Z_TOP + layer,
		getContainer: () => document.body,
		rootClassName: "hotel-edit-reservation-child-modal",
		styles: { mask: { zIndex: Z_TOP + layer - 1 } },
	});

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
				display_name: resolvedDisplayName,
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

	const normalizeRoomTypeSelection = useCallback((values) => {
		if (!Array.isArray(values)) return [];
		return values
			.map((value) =>
				value && typeof value === "object" ? value.value : value,
			)
			.filter(Boolean)
			.map((value) => String(value));
	}, []);

	const handleRoomTypeSelectionChange = (values) => {
		const nextKeys = normalizeRoomTypeSelection(values);
		const currentKeySet = new Set(selectedKeys);
		const nextKeySet = new Set(nextKeys);
		const removedKeys = selectedKeys.filter((key) => !nextKeySet.has(key));
		const addedKeys = nextKeys.filter((key) => !currentKeySet.has(key));

		if (removedKeys.length === 0 && addedKeys.length === 0) return;
		if (
			addedKeys.length > 0 &&
			(!reservation?.checkin_date || !reservation?.checkout_date)
		) {
			toast.info(
				chosenLanguage === "Arabic"
					? "\u0645\u0646 \u0641\u0636\u0644\u0643 \u0627\u062e\u062a\u0631 \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0648\u0635\u0648\u0644 \u0648\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629 \u0623\u0648\u0644\u0627"
					: "Please pick check-in and check-out first.",
			);
			return;
		}

		const additions = [];
		addedKeys.forEach((key) => {
			const option = roomEditorOptionMap.get(key);
			const split = splitRoomKey(key);
			const roomType = option?.roomType || split.room_type;
			const displayName = option?.displayName || split.displayName;
			const roomLabel =
				option?.label || resolveDisplayLabelForType(roomType, displayName);
			const blockedDates = Array.isArray(option?.blockedDates)
				? option.blockedDates
				: [];
			const availableCount =
				option?.availableCount === null || option?.availableCount === undefined
					? null
					: Number(option.availableCount);
			const inventoryBlocked =
				availableCount !== null && Number.isFinite(availableCount) && availableCount <= 0;

			if (blockedDates.length > 0) {
				if (basicEditOnly) {
					toast.error(formatBlockedRoomMessage(roomLabel, blockedDates, true));
					return;
				}
				toast.warn(formatBlockedRoomMessage(roomLabel, blockedDates, false));
			}

			if (inventoryBlocked && basicEditOnly) {
				toast.error(
					chosenLanguage === "Arabic"
						? "\u0644\u0627 \u062a\u0648\u062c\u062f \u063a\u0631\u0641 \u0645\u062a\u0627\u062d\u0629 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0646\u0648\u0639 \u0641\u064a \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u062d\u062f\u062f\u0629."
						: "No inventory is available for this room type on the selected dates.",
				);
				return;
			}

			const built = buildRoomLine(roomType, displayName);
			if (!built) {
				toast.error(
					chosenLanguage === "Arabic"
						? "\u0644\u0645 \u0646\u062a\u0645\u0643\u0646 \u0645\u0646 \u062a\u062d\u0636\u064a\u0631 \u062a\u0633\u0639\u064a\u0631 \u0647\u0630\u0627 \u0627\u0644\u0646\u0648\u0639. \u0631\u0627\u062c\u0639 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0648\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u063a\u0631\u0641\u0629."
						: "Could not prepare pricing for this room type. Please check the dates and room setup.",
				);
				return;
			}
			additions.push(built);
		});

		if (removedKeys.length === 0 && additions.length === 0) return;

		const removedKeySet = new Set(removedKeys);
		setReservation((currentReservation) => {
			const remainingRooms = (currentReservation.pickedRoomsType || []).filter(
				(room) => {
					const displayName = resolveDisplayNameForType(
						room.room_type,
						room.displayName || room.display_name,
					);
					return !removedKeySet.has(buildRoomKey(room.room_type, displayName));
				},
			);
			return {
				...currentReservation,
				pickedRoomsType: [...remainingRooms, ...additions],
			};
		});
		setHasRoomLineEdits(true);
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
	const removeRoomAtIndex = (indexToRemove) => {
		const confirmMessage =
			chosenLanguage === "Arabic"
				? "\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0633\u0637\u0631 \u0645\u0646 \u0627\u0644\u062d\u062c\u0632\u061f"
				: "Remove this room from the reservation?";
		if (!window.confirm(confirmMessage)) return;

		setReservation((currentReservation) => ({
			...currentReservation,
			pickedRoomsType: (currentReservation.pickedRoomsType || []).filter(
				(_, index) => index !== indexToRemove,
			),
		}));
		setHasRoomLineEdits(true);
		if (selectedRoomIndex === indexToRemove) {
			setSelectedRoomIndex(null);
			setIsRoomCountModalOpen(false);
			setIsPricingModalOpen(false);
		}
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

	const buildRoomPricingUpdatePayload = () => {
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
			? Math.max(nightsCount, 0)
			: Number(reservation.days_of_residence) || 0;
		const flattenedRooms = flattenRoomsForSave(normalizedPickedRoomsType);

		return {
			pickedRoomsType: flattenedRooms,
			pickedRoomsPricing: flattenedRooms,
			total_rooms: totalRoomsFromTypes,
			days_of_residence: daysOfResidence,
			total_amount: totalAmount,
			sub_total: totalAmount,
		};
	};

	const getSelectedCalendarBlockedIssues = useCallback(() => {
		const rooms = Array.isArray(reservation.pickedRoomsType)
			? reservation.pickedRoomsType
			: [];
		return rooms
			.map((room) => {
				const displayName = resolveDisplayNameForType(
					room.room_type,
					room.displayName || room.display_name,
				);
				const blockedDates = getBlockedDatesForRoom(
					room.room_type,
					displayName,
				);
				if (!blockedDates.length) return null;
				return {
					room_type: room.room_type,
					displayName,
					blockedDates,
					count: Number(room.count) || 1,
				};
			})
			.filter(Boolean);
	}, [
		getBlockedDatesForRoom,
		reservation.pickedRoomsType,
		resolveDisplayNameForType,
	]);

	const UpdateReservation = () => {
		const calendarBlockedIssues = getSelectedCalendarBlockedIssues();
		if (calendarBlockedIssues.length > 0) {
			const issue = calendarBlockedIssues[0];
			const roomLabel = resolveDisplayLabelForType(
				issue.room_type,
				issue.displayName,
			);
			const message = formatBlockedRoomMessage(
				roomLabel,
				issue.blockedDates,
				basicEditOnly,
			);
			if (basicEditOnly) {
				toast.error(message);
				return;
			}
			toast.warn(message);
		}
		const confirmationMessage = successMessage(
			"Are you sure you want to update this reservation?",
			"هل أنت متأكد أنك تريد تحديث هذا الحجز؟"
		);
		if (window.confirm(confirmationMessage)) {
			if (basicEditOnly) {
				const updateData = {
					customer_details: reservation.customer_details || {},
					checkin_date: reservation.checkin_date,
					checkout_date: reservation.checkout_date,
					days_of_residence: reservation.days_of_residence,
					total_guests: reservation.total_guests,
					adults: reservation.adults,
					children: reservation.children,
					comment: reservation.comment,
					booking_comment: reservation.booking_comment || reservation.comment,
					requestingUserId: user?._id,
				};
				if (hasRoomLineEdits || hasDateEdits) {
					Object.assign(updateData, buildRoomPricingUpdatePayload());
				}

				updateSingleReservation(reservation._id, updateData).then((response) => {
					if (!response || response.error) {
						console.error(response?.error || response);
						toast.error(apiErrorMessage(response));
						return;
					}
					const updatedReservation = response?.reservation || response;
					toast.success(
						successMessage(
							"Reservation was successfully updated",
							"تم تحديث الحجز بنجاح"
						)
					);
					if (updatedReservation) {
						setReservation(updatedReservation);
						if (typeof onReservationSaved === "function") {
							onReservationSaved(updatedReservation);
						}
					}
				});
				return;
			}

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
				requestingUserId: user?._id,
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
				Object.assign(updateData, buildRoomPricingUpdatePayload());
			} else {
				delete updateData.pickedRoomsType;
				delete updateData.pickedRoomsPricing;
				delete updateData.total_rooms;
				delete updateData.days_of_residence;
				delete updateData.total_amount;
				delete updateData.sub_total;
				delete updateData.commission;
			}

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (!response || response.error) {
					console.error(response?.error || response);
					toast.error(
						apiErrorMessage(
							response,
							"An error occurred while updating the status",
							"حدث خطأ أثناء تحديث حالة الحجز"
						)
					);
				} else {
					toast.success(
						sendEmail
							? successMessage(
									"Reservation updated successfully and email was sent.",
									"تم تحديث الحجز بنجاح وتم إرسال البريد الإلكتروني."
							  )
							: successMessage(
									"Reservation updated successfully.",
									"تم تحديث الحجز بنجاح."
							  )
					);
					setIsRoomCountModalOpen(false);
					setIsPricingModalOpen(false);

					// Update local state or re-fetch reservation data if necessary
					const updatedReservation = response?.reservation || response;
					if (updatedReservation) {
						setReservation(updatedReservation);
						if (typeof onReservationSaved === "function") {
							onReservationSaved(updatedReservation);
						}
						initialRoomIdsRef.current = getReservationRoomIds(
							updatedReservation?.roomId,
						);
					}
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
		const getRoomNumberRaw = (room) =>
			room?.room_number || room?.roomNumber || room?.room_no || "";
		const getRoomNumberDigits = (value) => {
			const match = String(value || "").match(/\d+/);
			return match ? parseInt(match[0], 10) : null;
		};
		merged.sort((a, b) => {
			const aRaw = getRoomNumberRaw(a);
			const bRaw = getRoomNumberRaw(b);
			const aNum = getRoomNumberDigits(aRaw);
			const bNum = getRoomNumberDigits(bRaw);

			if (aNum != null && bNum != null && aNum !== bNum) {
				return aNum - bNum;
			}
			if (aNum != null && bNum == null) return -1;
			if (aNum == null && bNum != null) return 1;

			const aStr = String(aRaw || "").toLowerCase();
			const bStr = String(bRaw || "").toLowerCase();
			if (aStr !== bStr)
				return aStr.localeCompare(bStr, undefined, { numeric: true });

			const aId = String(resolveRoomId(a) || "");
			const bId = String(resolveRoomId(b) || "");
			return aId.localeCompare(bId);
		});
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
	const selectedCalendarBlockedIssues = useMemo(
		() => getSelectedCalendarBlockedIssues(),
		[getSelectedCalendarBlockedIssues],
	);
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
	const paymentOptions = paymentMethodOptionsWithCurrent(reservation.payment);
	return (
		<div>
			<Wrapper $arabic={chosenLanguage === "Arabic"}>
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
					{...childModalProps(10)}
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
					<p style={{ display: "none" }}>
						{chosenLanguage === "Arabic" ? "تعديل العدد:" : "Update the count:"}
					</p>
					<div className='room-edit-field'>
						<p>
							{chosenLanguage === "Arabic"
								? "\u0646\u0648\u0639 \u0627\u0644\u063a\u0631\u0641\u0629 / \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0645\u0639\u0631\u0648\u0636"
								: "Room type / display name"}
						</p>
						<Select
							showSearch
							value={updatedRoomKey || undefined}
							onChange={setUpdatedRoomKey}
							optionFilterProp='label'
							getPopupContainer={() => document.body}
							dropdownStyle={{ zIndex: Z_TOP + 80 }}
							style={{ width: "100%" }}
							placeholder={
								chosenLanguage === "Arabic"
									? "\u0627\u062e\u062a\u0631 \u0627\u0644\u063a\u0631\u0641\u0629"
									: "Choose room type"
							}
						>
							{roomEditorOptions.map((option) => (
								<Select.Option
									key={option.key}
									value={option.key}
									label={`${option.label} ${option.roomType}`}
								>
									<div className='room-edit-option'>
										<strong>{option.label}</strong>
										<span>{option.roomType}</span>
										{option.availableCount !== null && (
											<em>
												{chosenLanguage === "Arabic"
													? "\u0627\u0644\u0645\u062a\u0627\u062d"
													: "Available"}
												: {option.availableCount}
											</em>
										)}
										{option.blockedDates.length > 0 && (
											<em className='blocked'>
												{chosenLanguage === "Arabic"
													? "\u0645\u062d\u062c\u0648\u0628"
													: "Blocked"}
												: {summarizeDateList(option.blockedDates, 2)}
											</em>
										)}
									</div>
								</Select.Option>
							))}
						</Select>
					</div>
					<div className='room-edit-field compact'>
						<p>
							{chosenLanguage === "Arabic"
								? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0639\u062f\u062f"
								: "Update count"}
						</p>
					</div>
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
					{...childModalProps(20)}
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
					{...childModalProps(30)}
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
										disabled={basicEditOnly}
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

								{!basicEditOnly &&
								reservation.booking_source &&
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
										disabled={basicEditOnly}
										onChange={(e) =>
											setReservation({
												...reservation,
												payment: e.target.value,
											})
										}
										className='selectlike'
										value={normalizePaymentMethod(reservation.payment, "")}
									>
										<option value=''>
											{chosenLanguage === "Arabic"
												? "الرجاء الاختيار"
												: "Please Select"}
										</option>
										{reservation.payment &&
										!paymentOptions.some(
											(option) =>
												option.value ===
												normalizePaymentMethod(reservation.payment, ""),
										) ? (
											<option value={reservation.payment}>
												{reservation.payment}
											</option>
										) : null}
										{paymentOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{getPaymentMethodLabel(
													option.value,
													chosenLanguage === "Arabic",
												)}
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

								{!basicEditOnly ? (
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
								) : null}

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
							<RoomManagementRow $single={basicEditOnly}>
								<div>
									<Label>
										{chosenLanguage === "Arabic"
											? "\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u063a\u0631\u0641"
											: "Room Types"}
									</Label>
									<Select
										mode='multiple'
										className='ant-field'
										style={{ width: "100%" }}
										showSearch
										placeholder={
											chosenLanguage === "Arabic"
												? "\u0627\u062e\u062a\u0631 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u063a\u0631\u0641"
												: "Select room types"
										}
										value={selectedKeys}
										onChange={handleRoomTypeSelectionChange}
										optionLabelProp='label'
										optionFilterProp='label'
										getPopupContainer={() => document.body}
										dropdownStyle={{ zIndex: Z_TOP + 80 }}
									>
										{roomEditorOptions.map((option) => {
											const active = selectedKeys.includes(option.key);
											const availableCount =
												option.availableCount === null ||
												option.availableCount === undefined
													? null
													: Number(option.availableCount);
											const inventoryBlocked =
												availableCount !== null &&
												Number.isFinite(availableCount) &&
												availableCount <= 0;
											const calendarBlocked =
												Array.isArray(option.blockedDates) &&
												option.blockedDates.length > 0;
											const disabledForAgent =
												basicEditOnly &&
												!active &&
												(inventoryBlocked || calendarBlocked);
											const label = `${option.label} (${option.roomType})`;
											return (
												<Select.Option
													key={option.key}
													value={option.key}
													label={label}
													disabled={disabledForAgent}
												>
													<RoomTypeOption $disabled={disabledForAgent}>
														<strong>{option.label}</strong>
														<span>{option.roomType}</span>
														{availableCount !== null ? (
															<em>
																{chosenLanguage === "Arabic"
																	? "\u0627\u0644\u0645\u062a\u0627\u062d"
																	: "Available"}
																: {availableCount}
															</em>
														) : null}
														{calendarBlocked ? (
															<em className='blocked'>
																{chosenLanguage === "Arabic"
																	? "\u0645\u062d\u062c\u0648\u0628"
																	: "Blocked"}
																: {summarizeDateList(option.blockedDates, 2)}
															</em>
														) : null}
														{active ? (
															<CheckCircleTwoTone
																twoToneColor='#52c41a'
																style={{ fontSize: 15 }}
															/>
														) : null}
													</RoomTypeOption>
												</Select.Option>
											);
										})}
									</Select>
									<RoomManagementHint>
										{chosenLanguage === "Arabic"
											? `${selectedKeys.length} \u0646\u0648\u0639 \u063a\u0631\u0641\u0629 \u0645\u062d\u062f\u062f`
											: `${selectedKeys.length} room type${
													selectedKeys.length === 1 ? "" : "s"
											  } selected`}
									</RoomManagementHint>
								</div>
								{!basicEditOnly ? (
									<div>
										<Label>
											{chosenLanguage === "Arabic"
												? "\u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u063a\u0631\u0641"
												: "Room Assignment"}
										</Label>
										<Select
											mode='multiple'
											labelInValue
											className='ant-field'
											style={{ width: "100%" }}
											placeholder={
												chosenLanguage === "Arabic"
													? "\u0627\u062e\u062a\u0631 \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u063a\u0631\u0641"
													: "Select room numbers"
											}
											value={selectedRoomValues}
											onChange={handleRoomSelectionChange}
											optionLabelProp='label'
											getPopupContainer={() => document.body}
											dropdownStyle={{ zIndex: Z_TOP + 80 }}
										>
											{roomsForSelect.map((room) => {
												const roomId = String(resolveRoomId(room));
												const isBooked = bookedRoomIdSet.has(roomId);
												const isSelected = selectedRoomIds.includes(roomId);
												const isInactive = room?.active === false;
												const baseLabel = getRoomLabel(room);
												const floorLabel = room.floor
													? ` | ${
															chosenLanguage === "Arabic"
																? "\u0627\u0644\u062f\u0648\u0631"
																: "Floor"
													  } ${room.floor}`
													: "";
												const occupiedLabel =
													isBooked && !isSelected
														? ` (${
																chosenLanguage === "Arabic"
																	? "\u0645\u062d\u062c\u0648\u0632\u0629"
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
											<RoomManagementHint
												style={{
													color:
														selectedRoomIds.length === requestedRoomsCount
															? "#1f7a1f"
															: "#b45f06",
												}}
											>
												{chosenLanguage === "Arabic"
													? "\u0627\u0644\u063a\u0631\u0641 \u0627\u0644\u0645\u062e\u062a\u0627\u0631\u0629"
													: "Selected Rooms"}{" "}
												{selectedRoomIds.length} / {requestedRoomsCount}
											</RoomManagementHint>
										) : null}
									</div>
								) : null}
							</RoomManagementRow>
						</Block>

					</Left>

					{!basicEditOnly ? (
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
					) : null}
				</Grid>

				<div className='container mt-3'>
					{customerDetails.name &&
					reservation.checkin_date &&
					reservation.checkout_date &&
					Array.isArray(reservation.pickedRoomsType) &&
					reservation.pickedRoomsType.length > 0 ? (
						<>
							{selectedCalendarBlockedIssues.length > 0 && (
								<CalendarBlockNotice>
									<strong>
										{chosenLanguage === "Arabic"
											? "\u062a\u0646\u0628\u064a\u0647 \u062a\u0642\u0648\u064a\u0645"
											: "Calendar warning"}
									</strong>
									{selectedCalendarBlockedIssues.map((issue) => {
										const roomLabel = resolveDisplayLabelForType(
											issue.room_type,
											issue.displayName,
										);
										return (
											<div
												key={`${issue.room_type}-${issue.displayName}`}
											>
												{formatBlockedRoomMessage(
													roomLabel,
													issue.blockedDates,
													basicEditOnly,
												)}
											</div>
										);
									})}
								</CalendarBlockNotice>
							)}
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
														danger
														className='delete-room-btn'
														icon={<DeleteOutlined />}
														onClick={() => removeRoomAtIndex(index)}
													>
														{chosenLanguage === "Arabic"
															? "\u062d\u0630\u0641"
															: "Delete"}
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
								<div className='cta-panel'>
									<div className='cta-title'>
										{chosenLanguage === "Arabic"
											? "اضغط لحفظ التعديلات"
											: "Click to Save Changes"}
									</div>
									<Button
										className='cta'
										type='primary'
										block
										size='large'
										onClick={() => {
											UpdateReservation();
										}}
									>
										{chosenLanguage === "Arabic"
											? "تحديث الحجز"
											: "Update Reservation"}
									</Button>
									<div className='cta-subtitle'>
										{chosenLanguage === "Arabic"
											? "لن يتم تطبيق أي تغيير إلا بعد الضغط على زر التحديث"
											: "Changes wonâ€™t apply until you press Update"}
									</div>
								</div>
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
	--update-blue: #1476ef;
	--update-blue-soft: #e4f3ff;
	--update-blue-border: #b8dcff;
	--update-green: #08a85a;
	--update-green-soft: #ecfff4;
	--update-amber: #df7a00;
	--update-amber-soft: #fff7ec;
	--update-border: #d7e6f5;
	--update-text: #111827;
	--update-muted: #64748b;
	background: #f6f8fc;
	color: var(--update-text);
	padding: 12px;
	text-align: ${(p) => (p.$arabic ? "right" : "left")};
	direction: ${(p) => (p.$arabic ? "rtl" : "ltr")};

	.warn {
		background: linear-gradient(90deg, #e4f3ff, #f7fcff);
		border: 1px solid var(--update-blue-border);
		border-inline-start: 4px solid var(--update-blue);
		border-radius: 10px;
		color: #05707b;
		font-size: 0.92rem;
		font-weight: 700;
		margin: 0 0 12px;
		padding: 9px 12px;
		text-transform: none;
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
		min-height: 40px;
		padding: 0.45rem 0.6rem;
		font-size: 0.92rem;
		border: 1px solid var(--update-border);
		border-radius: 8px;
		background: #fff;
		color: var(--update-text);
		box-shadow: none;
		outline: none;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	input:focus,
	select:focus,
	textarea:focus,
	.ant-picker-focused,
	.ant-select-focused .ant-select-selector {
		border-color: var(--update-blue) !important;
		box-shadow: 0 0 0 3px rgba(20, 118, 239, 0.12) !important;
	}

	textarea {
		min-height: 78px;
		resize: vertical;
	}

	.ant-picker,
	.ant-field {
		width: 100% !important;
		min-width: 0 !important;
		border-radius: 10px;
		box-shadow: none;
	}

	.ant-picker {
		border-color: var(--update-border);
		min-height: 40px;
	}

	.ant-select-selector {
		align-items: center;
		border-color: var(--update-border) !important;
		min-height: 40px !important;
	}

	.room-edit-field {
		display: grid;
		gap: 6px;
		margin-bottom: 12px;
	}

	.room-edit-field p {
		color: var(--update-muted);
		font-size: 0.85rem;
		font-weight: 800;
		margin: 0;
	}

	.selectlike {
		width: 100%;
		padding: 10px;
		border-radius: 10px;
		box-shadow: none;
	}

	.pill-inline {
		background: #eef2ff;
		padding: 2px 6px;
		border-radius: 6px;
		margin-inline-start: 6px;
	}

	h4.headline {
		font-size: 1.1rem;
		font-weight: 800;
		margin: 0 0 12px;
	}

	h4.total {
		color: var(--update-blue);
		text-align: center;
		margin: 12px 0 8px;
		font-weight: 800;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		font-weight: 700;
		font-size: 1.1rem;
		line-height: 1.2;
		letter-spacing: 0.2px;
		padding: 0 18px;
		border-radius: 12px;
		box-shadow: 0 10px 20px rgba(0, 106, 209, 0.25);
		white-space: nowrap;
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}

	.cta:hover {
		transform: translateY(-1px);
		box-shadow: 0 14px 24px rgba(0, 106, 209, 0.3);
	}

	.cta-panel {
		background: #ffffff;
		border: 1px solid var(--update-blue-border);
		border-top: 4px solid var(--update-blue);
		border-radius: 14px;
		padding: 14px;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
	}

	.cta-title {
		font-weight: 800;
		margin-bottom: 10px;
	}

	.cta-subtitle {
		margin-top: 10px;
		font-size: 0.9rem;
		color: #555;
	}

	.total-amount {
		background: #ffffff;
		border: 1px solid var(--update-blue-border);
		border-top: 4px solid var(--update-green);
		border-radius: 14px;
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
		padding: 14px;
	}

	.total-amount h5,
	.total-amount h4,
	.total-amount h3 {
		font-weight: 900;
		margin-bottom: 8px;
		text-align: center;
	}

	.total-amount h5 {
		color: var(--update-blue);
		font-size: 1rem;
	}

	.total-amount h4 {
		color: var(--update-text);
		font-size: 0.96rem;
	}

	.total-amount h3 {
		color: var(--update-green);
		font-size: 1.15rem;
	}

	.total-amount .room-list {
		display: grid;
		gap: 8px;
	}

	.total-amount .room-item {
		background: #f8fbff;
		border: 1px solid var(--update-blue-border);
		border-radius: 12px;
		padding: 10px;
	}

	.total-amount .room-item .text {
		font-weight: 800;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.total-amount .room-item .actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		justify-content: flex-end;
	}

	.total-amount .room-item .actions .delete-room-btn {
		background: #fff5f5;
		border-color: #f3b4b4;
		color: #b42318;
		font-weight: 800;
	}

	.total-amount .room-item .actions .delete-room-btn:hover {
		background: #dc3545;
		border-color: #dc3545;
		color: #ffffff;
	}

	.container {
		max-width: 100%;
		padding-left: 0;
		padding-right: 0;
	}

	@media (max-width: 768px) {
		padding: 8px;

		.warn {
			font-size: 0.84rem;
			padding: 8px 10px;
		}

		.total-amount .room-item {
			padding: 8px;
		}
	}
`;

const Label = styled.label`
	font-weight: 700;
	font-size: 0.86rem;
	color: #263445;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 5px;
`;

const Grid = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1.9fr) minmax(300px, 0.72fr);
	gap: 14px;
	align-items: start;
	@media (max-width: 1200px) {
		grid-template-columns: 1fr;
	}
`;

const Left = styled.div`
	background: #ffffff;
	border: 1px solid var(--update-blue-border);
	border-top: 4px solid var(--update-blue);
	border-radius: 14px;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
	padding: 14px;

	.row {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 11px;
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
		padding: 10px;

		.col {
			grid-column: span 6;
		}
		.col-span-2 {
			grid-column: span 12;
		}
	}

	@media (max-width: 430px) {
		.col,
		.col-span-2 {
			grid-column: span 12;
		}
	}
`;

const Block = styled.div`
	margin-top: 12px;
	background: #f8fbff;
	border: 1px solid var(--update-blue-border);
	border-radius: 12px;
	padding: 12px;

	.row {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 11px;
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
		padding: 10px;

		.col {
			grid-column: span 6;
		}
		.col-span-2 {
			grid-column: span 12;
		}
	}

	@media (max-width: 430px) {
		.col,
		.col-span-2 {
			grid-column: span 12;
		}
	}
`;

const Right = styled.div`
	background: linear-gradient(180deg, var(--update-green-soft), #ffffff 68%);
	border: 1px solid #a7efc7;
	border-top: 4px solid var(--update-green);
	border-radius: 14px;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
	min-height: 250px;
	padding: 14px;

	.summary-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 9px;
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
		background: rgba(255, 255, 255, 0.88);
		border: 1px solid #cdeedf;
		border-radius: 10px;
		padding: 8px 10px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}
	.item span {
		color: var(--update-muted);
		font-size: 0.78rem;
		font-weight: 800;
	}
	.item strong,
	.item .pill {
		direction: ltr;
		font-weight: 900;
		text-align: end;
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
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 430px) {
		.summary-list {
			grid-template-columns: 1fr;
		}
	}
`;

const RoomManagementRow = styled.div`
	display: grid;
	grid-template-columns: ${(p) =>
		p.$single ? "1fr" : "minmax(0, 1.1fr) minmax(0, 0.9fr)"};
	gap: 14px;
	align-items: start;

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const RoomManagementHint = styled.div`
	color: #53657d;
	font-size: 0.82rem;
	font-weight: 700;
	margin-top: 7px;
`;

const RoomTypeOption = styled.div`
	align-items: center;
	color: ${(p) => (p.$disabled ? "#8b8b8b" : "#111827")};
	display: grid;
	gap: 6px;
	grid-template-columns: minmax(0, 1fr) auto auto auto;

	strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	span,
	em {
		font-size: 0.78rem;
		font-style: normal;
		opacity: 0.82;
		white-space: nowrap;
	}

	.blocked {
		background: #ffedd5;
		border: 1px solid #fdba74;
		border-radius: 999px;
		color: #9a3412;
		font-weight: 800;
		padding: 1px 7px;
	}

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
		align-items: start;
	}
`;

const CalendarBlockNotice = styled.div`
	background: #fff7ed;
	border: 1px solid #fdba74;
	border-inline-start: 4px solid #ea580c;
	border-radius: 10px;
	color: #7c2d12;
	display: grid;
	gap: 5px;
	font-size: 0.9rem;
	font-weight: 700;
	margin: 10px 0;
	padding: 10px 12px;

	strong {
		color: #9a3412;
		font-size: 0.95rem;
	}
`;
