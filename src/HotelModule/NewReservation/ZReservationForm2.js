// src/HotelModule/NewReservation/ZReservationForm2.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import styled from "styled-components";
import {
	DatePicker,
	Spin,
	Table,
	Modal,
	InputNumber,
	Button,
	Tooltip,
	Select,
} from "antd";
import {
	HomeOutlined,
	PlusOutlined,
	MinusOutlined,
	CalendarOutlined,
	EditOutlined,
	DeleteOutlined,
	CheckCircleTwoTone,
} from "@ant-design/icons";
import dayjs from "dayjs";
import moment from "moment";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import {
	agodaData,
	airbnbData,
	bookingData,
	expediaData,
	janatData,
} from "../apiAdmin";
import { countryListWithAbbreviations } from "../../AdminModule/CustomerService/utils";
import { paymentMethodOptionsWithCurrent } from "../utils/paymentMethods";
import ExcelReservationImportModal from "./ExcelReservationImportModal";

/* ───────── helpers ───────── */
const safeParseFloat = (v, fb = 0) => {
	const n = parseFloat(v);
	return Number.isNaN(n) ? fb : n;
};
const hasNumericInput = (value) =>
	value !== null && value !== undefined && value !== "";
const nullableNumber = (value) => {
	if (!hasNumericInput(value)) return null;
	const parsed = Number(String(value).replace(/,/g, "").trim());
	return Number.isFinite(parsed) ? parsed : null;
};
const positiveNumber = (v, fb = 0) => {
	const n = safeParseFloat(v, NaN);
	return Number.isFinite(n) && n > 0 ? n : fb;
};
const pct = (v) => (v > 1 ? v / 100 : v);
const buildRoomKey = (roomType, displayName) =>
	`${roomType || ""}|${displayName || ""}`;
const splitRoomKey = (key = "") => {
	const idx = key.indexOf("|");
	if (idx === -1) return { room_type: key, displayName: "" };
	return { room_type: key.slice(0, idx), displayName: key.slice(idx + 1) };
};
const normalizeId = (value) => String(value?._id || value?.id || value || "").trim();
const normalizeAgentCommercialModel = (value = "") => {
	const normalized = String(value || "").trim().toLowerCase();
	return ["wallet_inventory", "commission_only", "mixed"].includes(normalized)
		? normalized
		: "wallet_inventory";
};
const normalizeDateKey = (value) => {
	if (!value) return "";
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	const parsed = moment(value);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};
const pricingMetadataFields = [
	"sellingPrice",
	"commissionPercent",
	"priceVariantDataId",
	"priceVariantItemId",
	"priceVariantName",
	"priceVariantNameOtherLanguage",
	"source",
	"calendarType",
	"color",
];
const pickPricingMetadata = (source = {}) =>
	pricingMetadataFields.reduce((acc, field) => {
		if (
			source[field] !== undefined &&
			source[field] !== null &&
			source[field] !== ""
		) {
			acc[field] = source[field];
		}
		return acc;
	}, {});

/* Build pricing rows like OrderTaker (commission fallback=10%) */
const buildPricingByDay = ({
	pricingRate = [],
	startDate,
	endDate, // end is checkout; nights are start..end-1
	basePrice,
	defaultCost,
	commissionRate,
}) => {
	const start = moment(startDate).startOf("day");
	const endExclusive = moment(endDate).startOf("day");
	const end = endExclusive.clone().subtract(1, "day");
	const comm = commissionRate > 0 ? commissionRate : 10;

	const rows = [];
	for (let d = start.clone(); d.isSameOrBefore(end, "day"); d.add(1, "day")) {
		const ds = d.format("YYYY-MM-DD");
		const rate =
			(pricingRate || []).find(
				(r) => normalizeDateKey(r.calendarDate) === ds
			) || {};
		const blockedOnCalendar = calendarRateIsBlocked(rate);
		const effectiveRate = blockedOnCalendar ? {} : rate;
		const fallbackPrice = positiveNumber(basePrice, positiveNumber(defaultCost, 0));
		const fallbackRoot = positiveNumber(defaultCost, fallbackPrice);
		const price = positiveNumber(effectiveRate.price, fallbackPrice);
		const rootPrice = positiveNumber(
			effectiveRate.rootPrice ?? effectiveRate.defaultCost,
			fallbackRoot || price
		);
		const explicitCommission = nullableNumber(effectiveRate.commissionRate);
		const c =
			explicitCommission !== null && explicitCommission >= 0
				? explicitCommission
				: comm;
		const finalWithComm = price + rootPrice * pct(c);
		rows.push({
			date: ds,
			price, // "no commission" portion
			rootPrice,
			commissionRate: c,
			totalPriceWithCommission: finalWithComm,
			totalPriceWithoutCommission: price,
			calendarBlocked: blockedOnCalendar,
			...pickPricingMetadata(effectiveRate),
		});
	}
	return rows;
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

/* Back-solve price & rootPrice from final nightly using saved ratio & commission */
const fromFinalUsingRatio = (
	finalValue,
	avgRootToTotalRatio,
	commissionPct
) => {
	const final = safeParseFloat(finalValue, 0);
	const r = Math.max(0, Math.min(1, safeParseFloat(avgRootToTotalRatio, 0)));
	const c = pct(safeParseFloat(commissionPct, 10));
	const rootPrice = final * r;
	const price = final - rootPrice * c;
	return {
		rootPrice: Number(rootPrice.toFixed(2)),
		price: Number(price.toFixed(2)),
		totalPriceWithCommission: Number(final.toFixed(2)),
		totalPriceWithoutCommission: Number(price.toFixed(2)),
	};
};

const ZReservationForm2 = ({
	customer_details,
	setCustomer_details,
	start_date,
	setStart_date,
	end_date,
	setEnd_date,
	disabledDate,
	hotelDetails,
	chosenLanguage,
	clickSubmit2,
	days_of_residence,
	setDays_of_residence,
	setBookingComment,
	booking_comment,
	setBookingSource,
	setPaymentStatus,
	paymentStatus,
	confirmation_number,
	setConfirmationNumber,
	booking_source,
	pickedRoomsType,
	setPickedRoomsType,
	roomInventory,
	total_guests,
	setTotalGuests,
	setSendEmail,
	sendEmail,
	paidAmount,
	setPaidAmount,
	isBoss,
	limitedOrderTakerAccount = false,
	agentCommercialModel = "wallet_inventory",
	agentSettlementModel = "agent_wallet_commission",
	setAgentSettlementModel,
	setAgentCommissionPercent,
	agentCommissionAmount = 0,
	setAgentCommissionAmount,
	pickedRoomPricing, // kept for parity
	setPickedRoomPricing,
}) => {
	const { user } = isAuthenticated();

	const [loading, setLoading] = useState(false);
	const [isRoomCountModalOpen, setIsRoomCountModalOpen] = useState(false);
	const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
	const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);
	const [updatedRoomCount, setUpdatedRoomCount] = useState(1);
	const [totalDistribute, setTotalDistribute] = useState("");
	const roomSelectionRef = useRef(null);

	const selectedKeys = useMemo(
		() =>
			(pickedRoomsType || []).map((r) =>
				buildRoomKey(r.room_type, r.displayName || r.display_name)
			),
		[pickedRoomsType]
	);

	const Z_TOP = 5000;

	/* Boss bulk upload */
	const handleFileUpload = (uploadFn) => {
		const isFromUS = window.confirm(
			"Is this upload from the US? Click OK for Yes, Cancel for No."
		);
		const country = isFromUS ? "US" : "NotUS";
		const accountId = hotelDetails?._id;
		const belongsTo = user?._id;

		const input = document.createElement("input");
		input.type = "file";
		input.accept =
			".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";

		input.onchange = async (e) => {
			try {
				setLoading(true);
				const file = e.target.files[0];
				const res = await uploadFn(accountId, belongsTo, file, country);
				if (res?.error) {
					toast.error("Error uploading data");
				} else {
					toast.success("Data uploaded successfully!");
				}
			} finally {
				setLoading(false);
			}
		};
		input.click();
	};

	/* Utilities from hotel room details */
	const findRoomDetail = useCallback(
		(room_type, displayName) => {
			const details = Array.isArray(hotelDetails?.roomCountDetails)
				? hotelDetails.roomCountDetails
				: [];
			if (!room_type) return null;
			const byDisplay =
				displayName &&
				details.find(
					(r) => r.roomType === room_type && r.displayName === displayName
				);
			return byDisplay || details.find((r) => r.roomType === room_type) || null;
		},
		[hotelDetails?.roomCountDetails]
	);

	const getEffectivePricingRate = useCallback(
		(detail = {}) => {
			const hotelRows = Array.isArray(detail.pricingRate)
				? detail.pricingRate
				: [];
			if (!limitedOrderTakerAccount || !user?._id) return hotelRows;

			const agentRows = Array.isArray(detail.agentPricingRate)
				? detail.agentPricingRate.filter(
						(row) => normalizeId(row.agentId) === normalizeId(user._id)
				  )
				: [];
			return agentRows;
		},
		[limitedOrderTakerAccount, user?._id]
	);

	const getMissingAssignedPricingDates = useCallback(
		(room_type, displayName) => {
			if (!limitedOrderTakerAccount || !start_date || !end_date) return [];
			const detail = findRoomDetail(room_type, displayName);
			if (!detail) return [];
			const stayDates = buildStayDateKeysForCalendar(start_date, end_date);
			const rates = getEffectivePricingRate(detail);
			return stayDates.filter(
				(date) =>
					!rates.some(
						(item) =>
							normalizeDateKey(item?.calendarDate) === date &&
							!calendarRateIsBlocked(item)
					)
			);
		},
		[
			limitedOrderTakerAccount,
			start_date,
			end_date,
			findRoomDetail,
			getEffectivePricingRate,
		]
	);

	const getBlockedDatesForRoom = useCallback(
		(room_type, displayName) => {
			if (!start_date || !end_date) return [];
			const detail = findRoomDetail(room_type, displayName);
			if (!detail) return [];
			const stayDates = buildStayDateKeysForCalendar(start_date, end_date);
			const rates = getEffectivePricingRate(detail);
			return stayDates.filter((date) => {
				const rate = rates.find(
					(item) => normalizeDateKey(item?.calendarDate) === date
				);
				return calendarRateIsBlocked(rate);
			});
		},
		[start_date, end_date, findRoomDetail, getEffectivePricingRate]
	);

	const getInventoryForRoom = useCallback(
		(room_type, displayName) => {
			const targetType = String(room_type || "").toLowerCase();
			const targetDisplay = String(displayName || "").toLowerCase();
			return (Array.isArray(roomInventory) ? roomInventory : []).find((room) => {
				const roomType = String(room.room_type || room.roomType || "").toLowerCase();
				const roomDisplay = String(
					room.displayName || room.display_name || ""
				).toLowerCase();
				return (
					roomType === targetType &&
					(!targetDisplay || !roomDisplay || roomDisplay === targetDisplay)
				);
			});
		},
		[roomInventory]
	);

	const getAvailableCountForRoom = useCallback(
		(room_type, displayName) => {
			const inventory = getInventoryForRoom(room_type, displayName);
			if (!inventory) return Infinity;
			const available = Number(
				inventory.available ?? inventory.total_available ?? 0
			);
			return Number.isFinite(available) ? available : 0;
		},
		[getInventoryForRoom]
	);

	const commissionForRoom = useCallback(
		(room_type, displayName) => {
			const matched = findRoomDetail(room_type, displayName);
			const fb = safeParseFloat(
				matched?.roomCommission ?? hotelDetails?.commission,
				10
			);
			return fb > 0 ? fb : 10;
		},
		[findRoomDetail, hotelDetails?.commission]
	);

	/* Dates */
	const onStartDateChange = (value) => {
		const dateAtMidnight = value ? value.startOf("day") : null;
		setStart_date(dateAtMidnight ? dateAtMidnight.toISOString() : null);
		if (dateAtMidnight && end_date) {
			const adjustedEndDate = dayjs(end_date).startOf("day");
			const duration = adjustedEndDate.diff(dateAtMidnight, "day");
			setDays_of_residence(duration >= 0 ? duration + 1 : 0);
		} else {
			setDays_of_residence(0);
		}
	};
	const onEndDateChange = (value) => {
		const adjustedEndDate = value ? value.startOf("day") : null;
		setEnd_date(adjustedEndDate ? adjustedEndDate.toISOString() : null);
		if (adjustedEndDate && start_date) {
			const adjustedStartDate = dayjs(start_date).startOf("day");
			const duration = adjustedEndDate.diff(adjustedStartDate, "day");
			setDays_of_residence(duration >= 0 ? duration + 1 : 0);
		} else {
			setDays_of_residence(0);
		}
	};
	const disabledEndDate = (current) =>
		start_date
			? current && current.isBefore(dayjs(start_date).startOf("day"), "day")
			: false;

	/* Build one selected room line with day rows */
	const buildRoomLine = useCallback(
		(room_type, displayName) => {
			if (!start_date || !end_date) return null;
			const detail = findRoomDetail(room_type, displayName);
			if (!detail) return null;
			const resolvedDisplayName =
				displayName || detail?.displayName || room_type;
			if (
				limitedOrderTakerAccount &&
				getBlockedDatesForRoom(room_type, resolvedDisplayName).length > 0
			) {
				return null;
			}
			if (
				limitedOrderTakerAccount &&
				getMissingAssignedPricingDates(room_type, resolvedDisplayName).length > 0
			) {
				return null;
			}

			const rows = buildPricingByDay({
				pricingRate: getEffectivePricingRate(detail),
				startDate: start_date,
				endDate: end_date,
				basePrice: positiveNumber(detail?.price?.basePrice, 0),
				defaultCost: positiveNumber(
					detail?.defaultCost,
					positiveNumber(detail?.price?.basePrice, 0)
				),
				commissionRate: commissionForRoom(room_type, displayName),
			});

			const avgRootToTotal =
				rows.length > 0
					? rows.reduce(
							(acc, d) =>
								acc +
								(d.totalPriceWithCommission > 0
									? d.rootPrice / d.totalPriceWithCommission
									: 0),
							0
					  ) / rows.length
					: 0;

			const totalWithComm = rows.reduce(
				(a, d) => a + safeParseFloat(d.totalPriceWithCommission, 0),
				0
			);
			const avgNight = rows.length ? totalWithComm / rows.length : 0;

			return {
				room_type,
				displayName: resolvedDisplayName,
				pricingByDay: rows,
				chosenPrice: Number(avgNight.toFixed(2)),
				count: 1,
				averageRootToTotalRatio: avgRootToTotal,
				commissionRate: commissionForRoom(room_type, displayName),
			};
		},
		[
			start_date,
			end_date,
			findRoomDetail,
			commissionForRoom,
			getEffectivePricingRate,
			limitedOrderTakerAccount,
			getBlockedDatesForRoom,
			getMissingAssignedPricingDates,
		]
	);

	/* Toggle room chips */
	const toggleChip = (key) => {
		if (!start_date || !end_date) {
			toast.info(
				chosenLanguage === "Arabic"
					? "من فضلك اختر تاريخ الوصول والمغادرة أولاً"
					: "Please pick check‑in and check‑out first."
			);
			return;
		}
		const { room_type, displayName } = splitRoomKey(key);
		const exists = selectedKeys.includes(key);
		const blockedDates = getBlockedDatesForRoom(room_type, displayName);
		const missingAssignedPricingDates = getMissingAssignedPricingDates(
			room_type,
			displayName
		);
		const availableCount = getAvailableCountForRoom(room_type, displayName);
		if (exists) {
			setPickedRoomsType((prev) =>
				prev.filter(
					(r) =>
						buildRoomKey(r.room_type, r.displayName || r.display_name) !== key
				)
			);
		} else {
			if (limitedOrderTakerAccount && blockedDates.length > 0) {
				toast.error(
					chosenLanguage === "Arabic"
						? `هذه الغرفة محجوبة في تقويم الفندق خلال ${blockedDates.join(", ")} ولا يمكن للوكيل حجزها.`
						: `This room is blocked on the hotel calendar for ${blockedDates.join(", ")} and cannot be booked by an agent.`
				);
				return;
			}
			if (
				limitedOrderTakerAccount &&
				missingAssignedPricingDates.length > 0
			) {
				toast.error(
					chosenLanguage === "Arabic"
						? `لا يوجد سعر مخصص لك لهذه الغرفة خلال ${missingAssignedPricingDates.join(", ")}.`
						: `No assigned agent pricing for this room on ${missingAssignedPricingDates.join(", ")}.`
				);
				return;
			}
			if (limitedOrderTakerAccount && availableCount <= 0) {
				toast.error(
					"No available inventory for this room type on the selected dates."
				);
				return;
			}
			if (!limitedOrderTakerAccount && blockedDates.length > 0) {
				toast.warn(
					`Warning: this room is blocked on the calendar for ${blockedDates.join(", ")}.`
				);
			}
			if (!limitedOrderTakerAccount && availableCount <= 0) {
				toast.warn("Warning: this selection may overbook the room type.");
			}
			const built = buildRoomLine(room_type, displayName);
			if (built) setPickedRoomsType((prev) => [...prev, built]);
		}
	};

	/* Count modal */
	const openRoomCountModal = (idx) => {
		setSelectedRoomIndex(idx);
		setUpdatedRoomCount(pickedRoomsType[idx]?.count || 1);
		setIsRoomCountModalOpen(true);
	};
	const closeRoomCountModal = () => setIsRoomCountModalOpen(false);
	const saveRoomCount = () => {
		if (selectedRoomIndex == null) return;
		setPickedRoomsType((prev) => {
			const next = [...prev];
			const line = next[selectedRoomIndex] || {};
			const requestedCount = Math.max(1, Number(updatedRoomCount || 1));
			const availableCount = getAvailableCountForRoom(
				line.room_type,
				line.displayName || line.display_name
			);
			const nextCount =
				limitedOrderTakerAccount && Number.isFinite(availableCount)
					? Math.min(requestedCount, Math.max(availableCount, 1))
					: requestedCount;
			if (limitedOrderTakerAccount && requestedCount > availableCount) {
				toast.error(
					`Agents can reserve up to ${Math.max(availableCount, 0)} available room(s) for this type.`
				);
			} else if (!limitedOrderTakerAccount && requestedCount > availableCount) {
				toast.warn("Warning: this count may overbook the room type.");
			}
			next[selectedRoomIndex] = {
				...line,
				count: nextCount,
			};
			return next;
		});
		closeRoomCountModal();
	};
	const removeRoom = () => {
		if (selectedRoomIndex == null) return;
		setPickedRoomsType((prev) =>
			prev.filter((_, i) => i !== selectedRoomIndex)
		);
		closeRoomCountModal();
	};
	const removeRoomAtIndex = (idx) => {
		const confirmMessage =
			chosenLanguage === "Arabic"
				? "\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0633\u0637\u0631 \u0645\u0646 \u0627\u0644\u062d\u062c\u0632\u061f"
				: "Remove this room from the reservation?";
		if (!window.confirm(confirmMessage)) return;
		setPickedRoomsType((prev) => prev.filter((_, i) => i !== idx));
		if (selectedRoomIndex === idx) {
			setSelectedRoomIndex(null);
			closeRoomCountModal();
			closePricingModal();
		}
	};

	const incCount = (idx) =>
		setPickedRoomsType((prev) => {
			const next = [...prev];
			const line = next[idx] || {};
			const availableCount = getAvailableCountForRoom(
				line.room_type,
				line.displayName || line.display_name
			);
			const requestedCount = (line.count || 1) + 1;
			if (limitedOrderTakerAccount && requestedCount > availableCount) {
				toast.error(
					`Agents can reserve up to ${Math.max(availableCount, 0)} available room(s) for this type.`
				);
				return next;
			}
			if (!limitedOrderTakerAccount && requestedCount > availableCount) {
				toast.warn("Warning: this count may overbook the room type.");
			}
			next[idx] = { ...line, count: requestedCount };
			return next;
		});
	const decCount = (idx) =>
		setPickedRoomsType((prev) => {
			const next = [...prev];
			next[idx] = {
				...next[idx],
				count: Math.max(1, (next[idx].count || 1) - 1),
			};
			return next;
		});

	/* Pricing modal (final nightly only) */
	const openPricingModal = (idx) => {
		if (limitedOrderTakerAccount) {
			toast.info(
				chosenLanguage === "Arabic"
					? "أسعار الوكيل محددة من بيانات التسعير ولا يمكن تعديلها هنا."
					: "Agent prices are assigned from price variants and cannot be edited here."
			);
			return;
		}
		setSelectedRoomIndex(idx);
		setIsPricingModalOpen(true);
	};
	const closePricingModal = () => setIsPricingModalOpen(false);

	const updateNightFinalAt = (dayIndex, finalValue) => {
		if (limitedOrderTakerAccount) return;
		setPickedRoomsType((prev) => {
			const next = [...prev];
			const line = { ...next[selectedRoomIndex] };
			const ratio = line.averageRootToTotalRatio || 0;
			const c = line.commissionRate || 10;
			const baseDay = { ...line.pricingByDay[dayIndex] };

			next[selectedRoomIndex] = {
				...line,
				pricingByDay: [
					...line.pricingByDay.slice(0, dayIndex),
					{ ...baseDay, ...fromFinalUsingRatio(finalValue, ratio, c) },
					...line.pricingByDay.slice(dayIndex + 1),
				],
			};
			// refresh chosenPrice
			const totalWithComm = next[selectedRoomIndex].pricingByDay.reduce(
				(a, d) => a + safeParseFloat(d.totalPriceWithCommission, 0),
				0
			);
			const avg = next[selectedRoomIndex].pricingByDay.length
				? totalWithComm / next[selectedRoomIndex].pricingByDay.length
				: 0;
			next[selectedRoomIndex].chosenPrice = Number(avg.toFixed(2));
			return next;
		});
	};

	const inheritFirstNight = () => {
		if (limitedOrderTakerAccount) return;
		setPickedRoomsType((prev) => {
			const next = [...prev];
			const line = { ...next[selectedRoomIndex] };
			const ratio = line.averageRootToTotalRatio || 0;
			const c = line.commissionRate || 10;
			const firstFinal = line.pricingByDay[0]
				? safeParseFloat(line.pricingByDay[0].totalPriceWithCommission, 0)
				: 0;

			const updated = line.pricingByDay.map((d) => ({
				...d,
				...fromFinalUsingRatio(firstFinal, ratio, c),
			}));
			const avg =
				updated.reduce((a, d) => a + d.totalPriceWithCommission, 0) /
				(updated.length || 1);
			next[selectedRoomIndex] = {
				...line,
				pricingByDay: updated,
				chosenPrice: Number(avg.toFixed(2)),
			};
			return next;
		});
	};

	const distributeTotalEvenly = () => {
		if (limitedOrderTakerAccount) return;
		const total = safeParseFloat(totalDistribute, 0);
		if (!total || selectedRoomIndex == null) return;

		setPickedRoomsType((prev) => {
			const next = [...prev];
			const line = { ...next[selectedRoomIndex] };
			const ratio = line.averageRootToTotalRatio || 0;
			const c = line.commissionRate || 10;
			const n = line.pricingByDay.length || 1;
			const cents = Math.round(total * 100);
			let sumSoFar = 0;

			const updated = line.pricingByDay.map((d, i) => {
				const shareCents = i < n - 1 ? Math.round(cents / n) : cents - sumSoFar;
				sumSoFar += shareCents;
				const share = shareCents / 100;
				return { ...d, ...fromFinalUsingRatio(share, ratio, c) };
			});
			const avg =
				updated.reduce((a, d) => a + d.totalPriceWithCommission, 0) / n;

			next[selectedRoomIndex] = {
				...line,
				pricingByDay: updated,
				chosenPrice: Number(avg.toFixed(2)),
			};
			return next;
		});
	};

	/* Rebuild day rows when date range changes */
	useEffect(() => {
		if (!start_date || !end_date || !pickedRoomsType?.length) return;
		setPickedRoomsType((prev) =>
			prev
				.map((r) => buildRoomLine(r.room_type, r.displayName || r.display_name))
				.filter(Boolean)
				.map((built, idx) => ({ ...built, count: prev[idx]?.count || 1 }))
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [start_date, end_date]);

	/**
	 * Flatten to OrderTaker’s transformPickedRooms shape:
	 * - pricingDetails.price = totalPriceWithCommission (final nightly)
	 * - keep rootPrice, commissionRate, totalPriceWithCommission, totalPriceWithoutCommission
	 * - chosenPrice = avg nightly final
	 * - duplicate per count with count: 1
	 */
	useEffect(() => {
		if (!pickedRoomsType?.length) {
			setPickedRoomPricing?.([]);
			return;
		}
		const flattened = [];
		pickedRoomsType.forEach((line) => {
			const unit = {
				room_type: line.room_type,
				displayName: line.displayName,
				chosenPrice: Number(line.chosenPrice).toFixed(2), // avg nightly final
				count: 1,
				pricingByDay: line.pricingByDay.map((d) => ({
					date: d.date,
					// IMPORTANT: OrderTaker semantics — “price” is nightly final with commission
					price: safeParseFloat(d.totalPriceWithCommission),
					rootPrice: safeParseFloat(d.rootPrice),
					commissionRate: safeParseFloat(d.commissionRate),
					totalPriceWithCommission: safeParseFloat(d.totalPriceWithCommission),
					totalPriceWithoutCommission: safeParseFloat(
						d.totalPriceWithoutCommission
					),
					...pickPricingMetadata(d),
				})),
			};
			const totalWithComm = unit.pricingByDay.reduce(
				(a, d) => a + d.totalPriceWithCommission,
				0
			);
			const hotelPortion = unit.pricingByDay.reduce(
				(a, d) => a + d.rootPrice,
				0
			);

			for (let i = 0; i < (line.count || 1); i += 1) {
				flattened.push({
					...unit,
					totalPriceWithCommission: Number(totalWithComm.toFixed(2)),
					hotelShouldGet: Number(hotelPortion.toFixed(2)),
				});
			}
		});
		setPickedRoomPricing?.(flattened);
	}, [pickedRoomsType, setPickedRoomPricing]);

	/* Totals (do not reveal commission) */
	const totalPerDay = useMemo(() => {
		if (!pickedRoomsType?.length) return 0;
		return pickedRoomsType.reduce(
			(sum, r) => sum + (Number(r.chosenPrice) || 0) * (r.count || 1),
			0
		);
	}, [pickedRoomsType]);

	const grandTotal = useMemo(() => {
		const nights = Math.max(0, (Number(days_of_residence) || 0) - 1);
		return Number((totalPerDay * nights).toFixed(2));
	}, [totalPerDay, days_of_residence]);

	const assignedPricingTotals = useMemo(() => {
		return (pickedRoomsType || []).reduce(
			(acc, line) => {
				const count = Math.max(1, Number(line.count || 1));
				const rows = Array.isArray(line.pricingByDay)
					? line.pricingByDay
					: [];
				const roomTotal = rows.reduce(
					(sum, day) =>
						sum + safeParseFloat(day.totalPriceWithCommission ?? day.price, 0),
					0
				);
				const roomRoot = rows.reduce(
					(sum, day) => sum + safeParseFloat(day.rootPrice, 0),
					0
				);
				acc.total += roomTotal * count;
				acc.root += roomRoot * count;
				return acc;
			},
			{ total: 0, root: 0 }
		);
	}, [pickedRoomsType]);

	const normalizedAgentCommercialModel = normalizeAgentCommercialModel(
		agentCommercialModel,
	);
	const assignedAgentCommissionAmount = Number(
		Math.max(assignedPricingTotals.total - assignedPricingTotals.root, 0).toFixed(2)
	);
	const assignedAgentCommissionPercent =
		assignedPricingTotals.total > 0
			? Number(
					(
						(assignedAgentCommissionAmount / assignedPricingTotals.total) *
						100
					).toFixed(2)
			  )
			: 0;
	const agentCanChooseSettlement = false;
	const resolvedAgentSettlementModel =
		normalizedAgentCommercialModel === "commission_only"
			? "agent_commission_only"
			: normalizedAgentCommercialModel === "wallet_inventory"
			? "agent_wallet_commission"
			: agentSettlementModel === "agent_commission_only"
			? "agent_commission_only"
			: "agent_wallet_commission";
	const agentHasCommission = Boolean(limitedOrderTakerAccount);
	const agentUsesWalletTreatment =
		resolvedAgentSettlementModel === "agent_wallet_commission";
	const computedAgentCommissionAmount = Number(
		(agentHasCommission
			? assignedAgentCommissionAmount
			: 0).toFixed(2),
	);

	useEffect(() => {
		if (!limitedOrderTakerAccount) return;
		setAgentCommissionAmount?.(computedAgentCommissionAmount);
		setAgentCommissionPercent?.(assignedAgentCommissionPercent);
	}, [
		assignedAgentCommissionPercent,
		computedAgentCommissionAmount,
		limitedOrderTakerAccount,
		setAgentCommissionAmount,
		setAgentCommissionPercent,
	]);

	const pricingColumns = [
		{
			title: "Date",
			dataIndex: "date",
			key: "date",
			width: 140,
			render: (v) => (
				<span>
					<CalendarOutlined /> <b>{v}</b>
				</span>
			),
		},
		{
			title: "Nightly Rate (SAR)",
			dataIndex: "totalPriceWithCommission",
			key: "final",
			render: (val, record, index) =>
				limitedOrderTakerAccount ? (
					<strong>{safeParseFloat(val, 0).toFixed(2)}</strong>
				) : (
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

	return (
		<>
			{loading ? (
				<div className='text-center my-5'>
					<Spin size='large' />
					<p>Loading...</p>
				</div>
			) : (
				<Wrapper
					$arabic={chosenLanguage === "Arabic"}
					$agentMode={limitedOrderTakerAccount}
				>
					{/* Count modal */}
					<Modal
						title={
							pickedRoomsType[selectedRoomIndex]
								? `${
										chosenLanguage === "Arabic" ? "تحديث الغرف" : "Update Room"
								  }: ${pickedRoomsType[selectedRoomIndex].displayName}`
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
							{chosenLanguage === "Arabic"
								? "تعديل العدد:"
								: "Update the count:"}
						</p>
						<InputNumber
							min={1}
							value={updatedRoomCount}
							onChange={setUpdatedRoomCount}
						/>
						{!limitedOrderTakerAccount && (
						<div className='mt-3'>
							<Button
								type='dashed'
								onClick={() => {
									setIsRoomCountModalOpen(false);
									setIsPricingModalOpen(true);
								}}
							>
								{chosenLanguage === "Arabic"
									? "تعديل الأسعار"
									: "Adjust Pricing"}
							</Button>
						</div>
						)}
					</Modal>

					{/* Pricing modal */}
					<Modal
						title={
							pickedRoomsType[selectedRoomIndex]
								? `${chosenLanguage === "Arabic" ? "أسعار" : "Pricing"}: ${
										pickedRoomsType[selectedRoomIndex].displayName
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
							<Button
								key='distBtn'
								onClick={distributeTotalEvenly}
								type='dashed'
							>
								{chosenLanguage === "Arabic"
									? "وزِّع الإجمالي"
									: "Distribute Total"}
							</Button>,
							<Button key='done' type='primary' onClick={closePricingModal}>
								{chosenLanguage === "Arabic" ? "تم" : "Done"}
							</Button>,
						]}
					>
						<Table
							dataSource={
								pickedRoomsType[selectedRoomIndex]?.pricingByDay?.map((d) => ({
									...d,
									key: d.date,
								})) || []
							}
							columns={pricingColumns}
							pagination={false}
							size='small'
							scroll={{ y: 420 }}
						/>
						<div style={{ marginTop: 10, fontWeight: 700, textAlign: "right" }}>
							{chosenLanguage === "Arabic" ? "المجموع:" : "Grand Total:"}{" "}
							{pickedRoomsType[selectedRoomIndex]
								? pickedRoomsType[selectedRoomIndex].pricingByDay
										.reduce(
											(a, d) =>
												a + safeParseFloat(d.totalPriceWithCommission, 0),
											0
										)
										.toFixed(2)
								: "0.00"}{" "}
							SAR
						</div>
					</Modal>

					<div className='excel-import-tools mx-auto mb-3 mt-4 text-center'>
						<ExcelReservationImportModal
							hotelDetails={hotelDetails}
							chosenLanguage={chosenLanguage}
							onImported={() =>
								toast.success(
									chosenLanguage === "Arabic"
										? "تم استيراد الحجوزات بنجاح."
										: "Reservations were imported successfully."
								)
							}
						/>
					</div>

					{/* Boss tools */}
					{isBoss ? (
						<div className='mx-auto mb-5 mt-4 text-center'>
							<Button
								className='mx-2'
								type='primary'
								onClick={() => handleFileUpload(agodaData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات أجودا"
									: "Agoda Upload"}
							</Button>
							<Button
								className='mx-2'
								type='primary'
								onClick={() => handleFileUpload(expediaData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات إكسبيديا"
									: "Expedia Upload"}
							</Button>
							<Button
								className='mx-2'
								type='primary'
								onClick={() => handleFileUpload(bookingData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات بوكينج"
									: "Booking Upload"}
							</Button>
							<Button
								className='mx-2'
								type='primary'
								onClick={() => handleFileUpload(airbnbData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات Airbnb"
									: "Airbnb Upload"}
							</Button>
							<Button
								className='mx-2'
								type='primary'
								onClick={() => handleFileUpload(janatData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات Janat"
									: "Janat Upload"}
							</Button>
						</div>
					) : null}

					<h6 className='warn'>
						{chosenLanguage === "Arabic"
							? "تحذير... هذا حجز أولي"
							: "WARNING... THIS IS A preliminary RESERVATION"}
					</h6>

					{/* Main two-column layout */}
					<Grid>
						{/* Left column */}
						<Left>
							<div className='row'>
								<div className='col field-name'>
									<Label>
										{chosenLanguage === "Arabic" ? "الاسم" : "Guest Name"}
									</Label>
									<input
										type='text'
										value={customer_details.name}
										onChange={(e) =>
											setCustomer_details({
												...customer_details,
												name: e.target.value,
											})
										}
									/>
								</div>
								<div className='col field-phone'>
									<Label>
										{chosenLanguage === "Arabic" ? "الهاتف" : "Guest Phone"}
									</Label>
									<input
										type='text'
										value={customer_details.phone}
										onChange={(e) =>
											setCustomer_details({
												...customer_details,
												phone: e.target.value,
											})
										}
									/>
								</div>
								<div className='col field-email'>
									<Label>
										{chosenLanguage === "Arabic"
											? "البريد الإلكتروني"
											: "Guest Email"}
									</Label>
									<input
										type='text'
										value={customer_details.email}
										onChange={(e) =>
											setCustomer_details({
												...customer_details,
												email: e.target.value,
											})
										}
									/>
								</div>

								<div className='col field-passport'>
									<Label>
										{chosenLanguage === "Arabic"
											? "رقم جواز السفر"
											: "Guest Passport #"}
									</Label>
									<input
										type='text'
										value={customer_details.passport}
										onChange={(e) =>
											setCustomer_details({
												...customer_details,
												passport: e.target.value,
											})
										}
									/>
								</div>
								<div className='col field-copy'>
									<Label>
										{chosenLanguage === "Arabic"
											? "نسخة جواز السفر"
											: "Passport Copy #"}
									</Label>
									<input
										type='text'
										value={customer_details.copyNumber}
										onChange={(e) =>
											setCustomer_details({
												...customer_details,
												copyNumber: e.target.value,
											})
										}
									/>
								</div>
								<div className='col field-birthdate'>
									<Label>
										{chosenLanguage === "Arabic"
											? "تاريخ الميلاد"
											: "Date of Birth"}
									</Label>
									<DatePicker
										className='ant-field'
										format='YYYY-MM-DD'
										value={
											customer_details.passportExpiry
												? dayjs(customer_details.passportExpiry)
												: null
										}
										onChange={(v) =>
											setCustomer_details({
												...customer_details,
												passportExpiry: v ? v.startOf("day").toISOString() : "",
											})
										}
										getPopupContainer={() => document.body}
										popupStyle={{ zIndex: Z_TOP + 5 }}
										style={{ width: "100%" }}
										placeholder={
											chosenLanguage === "Arabic"
												? "اختر التاريخ"
												: "Pick a date"
										}
									/>
								</div>
								<div className='col field-nationality'>
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
										value={customer_details.nationality || undefined}
										onChange={(val) =>
											setCustomer_details({
												...customer_details,
												nationality: val,
											})
										}
										style={{ width: "100%", zIndex: 9999 }}
										className='ant-field'
									>
										{countryListWithAbbreviations.map((c) => (
											<Select.Option key={c.code} value={c.code}>
												{c.name}
											</Select.Option>
										))}
									</Select>
								</div>

								<div className='col field-checkin'>
									<Label>
										{chosenLanguage === "Arabic"
											? "تاريخ الوصول"
											: "Check‑in Date"}{" "}
										{start_date ? (
											<small className='pill-inline'>
												<CalendarOutlined />{" "}
												{dayjs(start_date).format("YYYY-MM-DD")}
											</small>
										) : null}
									</Label>
									<DatePicker
										className='ant-field'
										disabledDate={disabledDate}
										inputReadOnly
										size='middle'
										format='YYYY-MM-DD'
										value={start_date ? dayjs(start_date) : null}
										onChange={onStartDateChange}
										getPopupContainer={() => document.body}
										popupStyle={{ zIndex: Z_TOP + 5 }}
										style={{ width: "100%" }}
										placeholder={
											chosenLanguage === "Arabic"
												? "اختر التاريخ"
												: "Pick a date"
										}
									/>
								</div>
								<div className='col field-checkout'>
									<Label>
										{chosenLanguage === "Arabic"
											? "تاريخ المغادرة"
											: "Check‑out Date"}{" "}
										{end_date ? (
											<small className='pill-inline'>
												<CalendarOutlined />{" "}
												{dayjs(end_date).format("YYYY-MM-DD")}
											</small>
										) : null}
									</Label>
									<DatePicker
										className='ant-field'
										disabledDate={disabledEndDate}
										inputReadOnly
										size='middle'
										format='YYYY-MM-DD'
										value={end_date ? dayjs(end_date) : null}
										onChange={onEndDateChange}
										getPopupContainer={() => document.body}
										popupStyle={{ zIndex: Z_TOP + 5 }}
										style={{ width: "100%" }}
										placeholder={
											chosenLanguage === "Arabic"
												? "اختر التاريخ"
												: "Pick a date"
										}
									/>
								</div>
							</div>

							<Block>
								<div className='row'>
									{!limitedOrderTakerAccount && (
										<div className='col booking-source-field'>
											<Label>
												{chosenLanguage === "Arabic"
													? "مصدر الحجز"
													: "Booking Source"}
											</Label>
											<select
												onChange={(e) => setBookingSource(e.target.value)}
												className='selectlike'
												value={booking_source}
											>
												<option value=''>
													{chosenLanguage === "Arabic"
														? "الرجاء الاختيار"
														: "Please Select"}
												</option>
												{booking_source &&
												![
													"janat",
													"affiliate",
													"manual",
													"booking.com",
													"trivago",
													"expedia",
													"hotel.com",
													"airbnb",
												].includes(String(booking_source).toLowerCase()) ? (
													<option value={booking_source}>{booking_source}</option>
												) : null}
												<option value='janat'>Janat</option>
												<option value='affiliate'>Affiliate</option>
												<option value='manual'>Manual Reservation</option>
												<option value='booking.com'>Booking.com</option>
												<option value='trivago'>Trivago</option>
												<option value='expedia'>Expedia</option>
												<option value='hotel.com'>Hotel.com</option>
												<option value='airbnb'>Airbnb</option>
											</select>
										</div>
									)}

									{!limitedOrderTakerAccount &&
										booking_source &&
										booking_source !== "manual" && (
										<div className='col confirmation-field'>
											<Label>
												{chosenLanguage === "Arabic"
													? "رقم التأكيد"
													: "Confirmation #"}
											</Label>
											<input
												type='text'
												value={confirmation_number}
												onChange={(e) => setConfirmationNumber(e.target.value)}
											/>
										</div>
									)}

									<div className='col payment-field'>
										<Label>
											{chosenLanguage === "Arabic" ? "الدفع" : "Payment"}
										</Label>
										<select
											onChange={(e) => setPaymentStatus(e.target.value)}
											className='selectlike'
											value={paymentStatus}
										>
											<option value=''>
												{chosenLanguage === "Arabic"
													? "الرجاء الاختيار"
													: "Please Select"}
											</option>
											{paymentMethodOptionsWithCurrent(paymentStatus).map(
												(option) => (
													<option key={option.value} value={option.value}>
														{chosenLanguage === "Arabic"
															? option.arLabel
															: option.label}
													</option>
												),
											)}
										</select>
										{paymentStatus === "deposit" && (
											<div className='mt-2'>
												<input
													value={paidAmount}
													onChange={(e) => setPaidAmount(e.target.value)}
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

									<div className='col guests-field'>
										<Label>
											{chosenLanguage === "Arabic"
												? "عدد الضيوف"
												: "Total Guests"}
										</Label>
										<input
											type='number'
											min={1}
											value={total_guests}
											onChange={(e) => setTotalGuests(e.target.value)}
										/>
									</div>

									<div className='col email-toggle-field'>
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

									<div className='col col-span-2 comment-field'>
										<Label>
											{chosenLanguage === "Arabic" ? "تعليق الضيف" : "Comment"}
										</Label>
										<textarea
											rows={3}
											value={booking_comment}
											onChange={(e) => setBookingComment(e.target.value)}
										/>
									</div>
								</div>
								{limitedOrderTakerAccount ? (
									<AgentCommissionPanel>
										<div>
											<strong>
												{chosenLanguage === "Arabic"
													? "\u0637\u0631\u064a\u0642\u0629 \u0645\u0639\u0627\u0645\u0644\u0629 \u0627\u0644\u062d\u062c\u0632"
													: "Reservation Treatment"}
											</strong>
											<span>
												{agentUsesWalletTreatment
													? chosenLanguage === "Arabic"
														? "سيتم تمييز هذا الحجز كمحفظة + عمولة، وتبقى العمولة قيد مراجعة المالية."
														: "This reservation is wallet-backed and still carries commission pending finance approval."
													: chosenLanguage === "Arabic"
													? "هذا الحجز عمولة فقط، وتبقى العمولة قيد مراجعة المالية."
													: "This reservation is commission-only and stays pending finance approval."}
											</span>
										</div>
										<div className='commission-input'>
											{agentCanChooseSettlement ? (
												<>
													<Label>
														{chosenLanguage === "Arabic"
															? "\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629"
															: "Choose treatment"}
													</Label>
													<Select
														value={resolvedAgentSettlementModel}
														onChange={(value) =>
															setAgentSettlementModel?.(value)
														}
														options={[
															{
																value: "agent_wallet_commission",
																label:
																	chosenLanguage === "Arabic"
																		? "محفظة + عمولة"
																		: "Wallet + commission",
															},
															{
																value: "agent_commission_only",
																label:
																	chosenLanguage === "Arabic"
																		? "عمولة فقط"
																		: "Commission only",
															},
														]}
														style={{ width: "100%" }}
													/>
												</>
											) : (
												<FixedTreatmentBadge $commission={!agentUsesWalletTreatment}>
													{agentUsesWalletTreatment
														? chosenLanguage === "Arabic"
															? "محفظة + عمولة"
															: "Wallet + commission"
														: chosenLanguage === "Arabic"
														? "عمولة فقط"
														: "Commission only"}
												</FixedTreatmentBadge>
											)}
										</div>
										<div className='commission-preview'>
											<small>
												{chosenLanguage === "Arabic"
													? "\u0646\u0633\u0628\u0629 \u0627\u0644\u0639\u0645\u0648\u0644\u0629"
													: "Commission %"}
											</small>
											<FixedTreatmentBadge $commission>
												{assignedAgentCommissionPercent.toFixed(2)}%
											</FixedTreatmentBadge>
											<strong>
												{Number(
													agentCommissionAmount ||
														computedAgentCommissionAmount,
												).toLocaleString(undefined, {
													maximumFractionDigits: 2,
												})}{" "}
												SAR
											</strong>
											<em>
												{chosenLanguage === "Arabic"
													? "محسوبة من السعر المخصص"
													: "Calculated from assigned pricing"}{" "}
												/ {assignedPricingTotals.total.toLocaleString()} SAR
											</em>
											<em>
												{agentUsesWalletTreatment
													? chosenLanguage === "Arabic"
														? "محفظة + عمولة"
														: "Wallet-backed + commission"
													: chosenLanguage === "Arabic"
													? "عمولة فقط"
													: "Commission only"}
											</em>
										</div>
									</AgentCommissionPanel>
								) : null}
							</Block>
						</Left>

						{/* Right column */}
						<Right>
							<h4 className='headline'>
								{chosenLanguage === "Arabic"
									? "حجز غرفة للضيف"
									: "Reserve A Room For The Guest"}
							</h4>

							<div className='summary-list'>
								<div className='item'>
									<span>
										{chosenLanguage === "Arabic"
											? "رقم التأكيد"
											: "Confirmation #"}
									</span>
									<strong>{confirmation_number || "-"}</strong>
								</div>
								<div className='item'>
									<span>
										{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Arrival"}
									</span>
									<div className='pill'>
										{start_date ? moment(start_date).format("YYYY-MM-DD") : "-"}
									</div>
								</div>
								<div className='item'>
									<span>
										{chosenLanguage === "Arabic"
											? "تاريخ المغادرة"
											: "Departure"}
									</span>
									<div className='pill'>
										{end_date ? moment(end_date).format("YYYY-MM-DD") : "-"}
									</div>
								</div>
								<div className='item'>
									<span>
										{chosenLanguage === "Arabic" ? "الدفع" : "Payment"}
									</span>
									<strong>{paymentStatus || "Not Paid"}</strong>
								</div>
							</div>

							<h4 className='total'>
								{chosenLanguage === "Arabic"
									? "المبلغ الإجمالي"
									: "Total Amount"}
								: {grandTotal.toLocaleString()} SAR
							</h4>

							<div className='text-center'>
								<Button
									type='default'
									onClick={() =>
										roomSelectionRef.current?.scrollIntoView({
											behavior: "smooth",
											block: "start",
										})
									}
								>
									{chosenLanguage === "Arabic"
										? "تسجيل دخول الزائر..."
										: "Check The Guest In..."}
								</Button>
							</div>
						</Right>
					</Grid>

					{/* Room selection chips */}
					<div className='container room-selection-container' ref={roomSelectionRef}>
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
												room.displayName || room.display_name
											);
											const resolvedDisplayName =
												room.displayName ||
												room.display_name ||
												fallbackDetail?.displayName ||
												room.room_type;
											const key = buildRoomKey(
												room.room_type,
												resolvedDisplayName
											);
											const active = selectedKeys.includes(key);
											const availableCount =
												room.available ?? room.total_available ?? 0;
											const assignedStockApplies =
												limitedOrderTakerAccount && room.agentInventoryApplied;
											const blockedDates = getBlockedDatesForRoom(
												room.room_type,
												resolvedDisplayName
											);
											const missingAssignedPricingDates =
												getMissingAssignedPricingDates(
													room.room_type,
													resolvedDisplayName
												);
											const blockedForAgent =
												limitedOrderTakerAccount && blockedDates.length > 0;
											const missingPricingForAgent =
												limitedOrderTakerAccount &&
												missingAssignedPricingDates.length > 0;
											const unavailableForAgent =
												limitedOrderTakerAccount && availableCount <= 0;
											return (
												<RoomChip
													key={key}
													$active={active}
													$blocked={
														blockedForAgent ||
														unavailableForAgent ||
														missingPricingForAgent
													}
													disabled={
														blockedForAgent ||
														unavailableForAgent ||
														missingPricingForAgent
													}
													data-blocked-label={
														unavailableForAgent
															? chosenLanguage === "Arabic"
																? "\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u062e\u0632\u0648\u0646"
																: "No stock"
															: missingPricingForAgent
															? chosenLanguage === "Arabic"
																? "\u0644\u0627 \u0633\u0639\u0631 \u0645\u062e\u0635\u0635"
																: "No assigned price"
															: chosenLanguage === "Arabic"
															? "\u0645\u062d\u062c\u0648\u0628\u0629"
															: "Blocked"
													}
													onClick={() => toggleChip(key)}
													title={
														blockedForAgent
															? `${
																	chosenLanguage === "Arabic"
																		? "محجوبة في التقويم"
																	: "Blocked on calendar"
															  }: ${blockedDates.join(", ")}`
															: missingPricingForAgent
															? `No assigned agent pricing for ${missingAssignedPricingDates.join(", ")}`
															: unavailableForAgent
															? "No available inventory for agents"
															: `${resolvedDisplayName} (${room.room_type})`
													}
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
														{chosenLanguage === "Arabic"
															? "المتاح"
															: "Available"}
														: {availableCount}
													</span>
													{assignedStockApplies && (
														<span className='avail'>
															{chosenLanguage === "Arabic"
																? "\u0627\u0644\u0645\u062e\u0635\u0635"
																: "Assigned"}
															: {room.agentAssignedStock ?? 0}
														</span>
													)}
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

					{/* Selected rooms + totals */}
					<div className='container mt-3'>
						{customer_details.name &&
						start_date &&
						end_date &&
						pickedRoomsType.length > 0 ? (
							<>
								<div className='total-amount my-3'>
									<h5>
										{chosenLanguage === "Arabic"
											? "مدة الإقامة"
											: "Days Of Residence"}
										: {days_of_residence}{" "}
										{chosenLanguage === "Arabic" ? "أيام" : "Days"} /{" "}
										{days_of_residence <= 1 ? 1 : days_of_residence - 1}{" "}
										{chosenLanguage === "Arabic" ? "ليالٍ" : "Nights"}
									</h5>

									<h4>
										{chosenLanguage === "Arabic"
											? "المبلغ لكل يوم"
											: "Total Amount Per Day"}
										:{" "}
										{Number(
											pickedRoomsType.reduce(
												(sum, r) =>
													sum + (Number(r.chosenPrice) || 0) * (r.count || 1),
												0
											)
										).toFixed(2)}{" "}
										SAR / {chosenLanguage === "Arabic" ? "اليوم" : "Day"}
									</h4>

									<div className='room-list my-3'>
										{pickedRoomsType.map((room, index) => (
											<div
												key={`${room.room_type}_${room.displayName}_${index}`}
												className='room-item'
											>
												<div className='text'>
													<HomeOutlined />{" "}
													{`Room: ${room.displayName} (${room.room_type}) — `}
													<Tooltip
														title={`${
															chosenLanguage === "Arabic"
																? "معدل الليلة"
																: "Nightly"
														}: ${Number(room.chosenPrice).toFixed(2)} SAR`}
													>
														<span className='price'>
															{Number(room.chosenPrice).toFixed(2)} SAR
														</span>
													</Tooltip>
													{`  × ${room.count} ${
														chosenLanguage === "Arabic" ? "غرف" : "rooms"
													}`}
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
														onClick={() => openRoomCountModal(index)}
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
														hidden={limitedOrderTakerAccount}
														onClick={() => openPricingModal(index)}
													>
														{chosenLanguage === "Arabic" ? "السعر" : "Pricing"}
													</Button>
												</div>
											</div>
										))}
									</div>

									<h3>
										{chosenLanguage === "Arabic" ? "الإجمالي" : "Total Amount"}:{" "}
										{grandTotal.toLocaleString()} SAR
									</h3>
									{paidAmount && paymentStatus === "deposit" && (
										<h3>
											{chosenLanguage === "Arabic"
												? "المبلغ المدفوع"
												: "Paid Amount"}
											: {Number(paidAmount).toLocaleString()} SAR
										</h3>
									)}
								</div>

								<div className='reservation-submit-wrap mt-5 mx-auto text-center col-md-6'>
									<Button
										className='cta'
										type='primary'
										onClick={() => {
											clickSubmit2();
										}}
									>
										{chosenLanguage === "Arabic"
											? "تنفيذ الحجز..."
											: "Make A Reservation..."}
									</Button>
								</div>
							</>
						) : null}
					</div>
				</Wrapper>
			)}
		</>
	);
};

export default ZReservationForm2;

/* ───────── styles ───────── */

const Wrapper = styled.div.withConfig({
	shouldForwardProp: (prop) =>
		!["arabic", "$arabic", "$agentMode", "zIndex"].includes(prop),
})`
	position: relative;
	width: min(100%, 1320px);
	max-width: 1320px;
	margin: 0 auto;
	padding-bottom: 26px;
	text-align: ${(p) => (p.$arabic ? "right" : "left")};
	direction: ${(p) => (p.$arabic ? "rtl" : "ltr")};
	--pms-blue: #0d6efd;
	--pms-blue-soft: #e3f2fd;
	--pms-border: #cfe5fb;
	--pms-text: #18212f;
	--pms-muted: #64748b;
	--pms-green: #05a857;

	.warn {
		margin: 0 0 12px;
		padding: 10px 12px;
		border: 1px solid #99e6e6;
		border-inline-start: 4px solid #0e9f9f;
		border-radius: 8px;
		background: #e9fbfb;
		color: #067a7a;
		font-weight: 700;
		line-height: 1.35;
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
		min-width: 0;
		height: 42px;
		padding: 0.5rem 0.65rem;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--pms-text);
		border: 1px solid #d6e3f3;
		border-radius: 8px;
		background: #fff;
		text-align: inherit;
		outline: none;
		transition:
			border-color 0.16s ease,
			box-shadow 0.16s ease;
	}

	input:focus,
	select:focus,
	textarea:focus {
		border-color: #80bdff;
		box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.12);
	}

	textarea {
		height: auto;
		min-height: 86px;
		resize: vertical;
	}

	.ant-picker,
	.ant-field {
		width: 100% !important;
		min-width: 0;
		height: 42px;
		border-radius: 8px;
		border-color: #d6e3f3;
		box-shadow: none;
	}

	.ant-picker-input > input {
		height: 32px;
		font-size: 0.95rem;
		font-weight: 500;
		text-align: inherit;
	}

	.ant-select-selector {
		min-height: 42px !important;
		border-radius: 8px !important;
		border-color: #d6e3f3 !important;
		align-items: center;
	}

	.ant-select-selection-search-input,
	.ant-select-selection-item,
	.ant-select-selection-placeholder {
		line-height: 40px !important;
		font-size: 0.95rem;
	}

	.selectlike {
		width: 100%;
		height: 42px;
		padding: 0 10px;
		border-radius: 8px;
		border: 1px solid #d6e3f3;
		box-shadow: none;
	}

	${(p) =>
		p.$agentMode
			? `
	.field-passport,
	.field-copy,
	.field-birthdate {
		display: none;
	}
	`
			: ""}

	.pill-inline {
		background: #eef2ff;
		padding: 2px 6px;
		border-radius: 6px;
		margin-inline-start: 6px;
		white-space: nowrap;
	}

	h4.headline {
		font-size: 1.2rem;
		font-weight: 800;
		margin: 10px 0 16px;
		color: var(--pms-text);
	}

	h4.total {
		color: #006ad1;
		text-align: center;
		margin: 14px 0;
		font-weight: 800;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 40px;
		font-weight: 700;
		font-size: 1.05rem;
		line-height: 1.2;
		padding: 0 22px;
		min-width: 230px;
		border-radius: 8px;
		background: var(--pms-blue);
		border-color: var(--pms-blue);
		white-space: nowrap;
	}

	.container {
		max-width: 100%;
		padding-inline: 0;
	}

	.container > .row {
		margin-inline: 0;
	}

	.container > .row > [class*="col"] {
		padding-inline: 0;
	}

	.room-selection-container {
		scroll-margin-top: 92px;
		margin-top: 10px;
	}

	.total-amount {
		background: var(--pms-blue-soft);
		border: 1px solid var(--pms-border);
		border-radius: 10px;
		padding: 14px;
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
	}

	.total-amount h5,
	.total-amount h4,
	.total-amount h3 {
		margin-bottom: 8px;
		line-height: 1.35;
	}

	.total-amount h5,
	.total-amount h4 {
		text-align: ${(p) => (p.$arabic ? "right" : "left")};
	}

	.total-amount h3 {
		font-size: 1.65rem;
		text-align: center;
	}

	.room-list {
		display: grid;
		gap: 8px;
	}

	.room-item {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		background: #ffffff;
		border: 1px solid #cfe5fb;
		border-radius: 8px;
		padding: 8px 10px;
	}

	.room-item .text {
		min-width: 0;
		font-weight: 650;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.room-item .price {
		color: #006ad1;
		font-weight: 800;
	}

	.room-item .actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 5px;
	}

	.room-item .actions > * {
		margin: 0;
	}

	.room-item .actions .delete-room-btn {
		background: #fff5f5;
		border-color: #f3b4b4;
		color: #b42318;
		font-weight: 800;
	}

	.room-item .actions .delete-room-btn:hover {
		background: #dc3545;
		border-color: #dc3545;
		color: #ffffff;
	}

	@media (max-width: 768px) {
		width: 100%;
		max-width: 100%;
		padding-bottom: 12px;

		.warn {
			margin-bottom: 10px;
			padding: 8px 10px;
			font-size: 0.82rem;
		}

		input[type="text"],
		input[type="email"],
		input[type="password"],
		input[type="date"],
		input[type="number"],
		select,
		textarea,
		.selectlike,
		.ant-picker,
		.ant-field {
			height: 38px;
			font-size: 0.84rem;
			border-radius: 7px;
		}

		textarea {
			height: auto;
			min-height: 74px;
		}

		.ant-picker-input > input,
		.ant-select-selection-search-input,
		.ant-select-selection-item,
		.ant-select-selection-placeholder {
			font-size: 0.84rem;
			line-height: 36px !important;
		}

		.ant-select-selector {
			min-height: 38px !important;
		}

		.pill-inline {
			display: none;
		}

		h4.headline {
			font-size: 1rem;
			margin-bottom: 10px;
		}

		h4.total {
			font-size: 0.98rem;
		}

		.total-amount {
			padding: 10px;
		}

		.total-amount h5,
		.total-amount h4,
		.total-amount h3 {
			font-size: 0.98rem;
			text-align: ${(p) => (p.$arabic ? "right" : "left")};
		}

		.room-item {
			grid-template-columns: 1fr;
			padding: 9px;
		}

		.room-item .text {
			white-space: normal;
		}

		.room-item .actions {
			justify-content: stretch;
		}

		.room-item .actions .ant-btn {
			flex: 1 1 auto;
			min-width: 64px;
		}

		.reservation-submit-wrap {
			position: sticky;
			bottom: 8px;
			z-index: 40;
			width: 100%;
			max-width: 100%;
			margin-top: 16px !important;
			padding: 8px;
			background: rgba(227, 242, 253, 0.94);
			border: 1px solid var(--pms-border);
			border-radius: 10px;
			backdrop-filter: blur(8px);
		}

		.cta {
			height: 40px;
			width: 100%;
			min-width: 0;
			font-size: 0.94rem;
			line-height: 1.2;
			padding: 0 12px;
		}
	}
`;

const Label = styled.label`
	font-weight: 700;
	font-size: 0.95rem;
	color: #26364a;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 6px;
	max-width: 100%;
	line-height: 1.25;

	@media (max-width: 768px) {
		font-size: 0.76rem;
		gap: 4px;
		margin-bottom: 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;

const Grid = styled.div`
	display: grid;
	grid-template-columns: 2fr 1fr;
	gap: 16px;
	align-items: start;
	@media (max-width: 1200px) {
		grid-template-columns: 1fr;
	}

	@media (max-width: 768px) {
		gap: 10px;
	}
`;

const Left = styled.div`
	min-width: 0;
	background: #ffffff;
	border: 1px solid #d9e9fb;
	border-radius: 10px;
	padding: 16px;
	box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);

	.row {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 12px;
	}
	.col {
		grid-column: span 4;
		min-width: 0;
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

		.row {
			gap: 8px;
		}

		.col {
			grid-column: span 6;
		}

		.field-name,
		.field-email,
		.col-span-2 {
			grid-column: span 12;
		}
	}
`;

const Block = styled.div`
	margin-top: 18px;
	background: #f4f9ff;
	border: 1px solid #d9e9fb;
	border-radius: 10px;
	padding: 14px;

	.row {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 12px;
	}
	.col {
		grid-column: span 3;
		min-width: 0;
	}
	.col-span-2 {
		grid-column: span 6;
	}
	.booking-source-field,
	.confirmation-field,
	.payment-field {
		grid-column: span 4;
	}
	.guests-field,
	.email-toggle-field {
		grid-column: span 3;
	}
	.comment-field {
		grid-column: 4 / span 6;
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
		margin-top: 10px;
		padding: 10px;

		.row {
			gap: 8px;
		}

		.col,
		.booking-source-field,
		.confirmation-field,
		.payment-field,
		.guests-field,
		.email-toggle-field {
			grid-column: span 6;
		}

		.col-span-2 {
			grid-column: span 12;
		}
	}
`;

const AgentCommissionPanel = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1.45fr) minmax(160px, 0.55fr) minmax(180px, 0.7fr);
	align-items: center;
	gap: 12px;
	margin-top: 14px;
	padding: 12px 14px;
	border: 1px solid #b9e4cf;
	border-radius: 10px;
	background: linear-gradient(135deg, #f0fff8 0%, #ffffff 100%);
	box-shadow: 0 10px 24px rgba(16, 185, 129, 0.08);

	strong,
	span,
	small,
	em {
		display: block;
	}

	> div:first-child strong {
		color: #064e3b;
		font-size: 0.98rem;
		font-weight: 950;
	}

	> div:first-child span {
		margin-top: 4px;
		color: #276749;
		font-size: 0.78rem;
		font-weight: 800;
		line-height: 1.5;
	}

	.commission-preview {
		padding: 9px 11px;
		border: 1px solid #c5e7e1;
		border-radius: 8px;
		background: #fbfffd;
	}

	.commission-preview small {
		color: #47627d;
		font-size: 0.72rem;
		font-weight: 900;
	}

	.commission-preview strong {
		color: #065f46;
		font-size: 1rem;
		font-weight: 950;
	}

	.commission-preview em {
		color: #64748b;
		font-size: 0.72rem;
		font-style: normal;
		font-weight: 850;
		direction: ltr;
	}

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const FixedTreatmentBadge = styled.div`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 42px;
	padding: 8px 12px;
	border: 1px solid ${({ $commission }) =>
		$commission ? "#bae6fd" : "#bbf7d0"};
	border-radius: 8px;
	background: ${({ $commission }) =>
		$commission
			? "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)"
			: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)"};
	color: ${({ $commission }) => ($commission ? "#075985" : "#047857")};
	font-size: 0.9rem;
	font-weight: 950;
`;

const Right = styled.div`
	background: #e3f2fd;
	border-radius: 10px;
	padding: 14px;
	border: 1px solid #cfe5fb;
	min-height: 250px;
	box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);

	@media (min-width: 1201px) {
		position: sticky;
		top: 84px;
	}

	.summary-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-bottom: 8px;
	}
	.item {
		background: #ffffff;
		border: 1px solid #d9e9fb;
		border-radius: 8px;
		padding: 10px 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.item span {
		color: #53657c;
		font-weight: 700;
		font-size: 0.82rem;
	}
	.item strong,
	.item .pill {
		min-width: 0;
		font-size: 0.92rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		padding: 10px;

		.summary-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
		}

		.item {
			display: grid;
			gap: 4px;
			padding: 8px;
		}

		.item span {
			font-size: 0.72rem;
		}

		.item strong,
		.item .pill {
			font-size: 0.78rem;
		}
	}
`;

const RoomGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 285px), 1fr));
	gap: 10px;

	@media (max-width: 768px) {
		grid-template-columns: 1fr;
		gap: 8px;
	}
`;

const RoomChip = styled.button.withConfig({
	shouldForwardProp: (prop) =>
		!["active", "$active", "$blocked"].includes(prop),
})`
	appearance: none;
	border: 1px solid
		${(p) => (p.$blocked ? "#fda4af" : p.$active ? "#1a9f42" : "#d9e9fb")};
	background: ${(p) =>
		p.$blocked
			? "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 58%, #fff7f8 100%)"
			: p.$active
			? "#e7f7ed"
			: "#ffffff"};
	color: ${(p) => (p.$blocked ? "#9f1239" : "#111827")};
	min-height: 48px;
	padding: 8px 10px;
	border-radius: 10px;
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto auto auto;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	transition:
		box-shadow 0.2s ease,
		transform 0.05s ease;
	text-align: start;

	&:disabled {
		cursor: not-allowed;
		opacity: 0.78;
	}

	${(p) =>
		p.$blocked
			? `
		.avail {
			display: none;
		}
		&::after {
			content: attr(data-blocked-label);
			justify-self: end;
			padding: 4px 9px;
			border-radius: 999px;
			background: linear-gradient(135deg, #fecdd3, #ffe4e6);
			color: #9f1239;
			font-size: 0.72rem;
			font-weight: 900;
			white-space: nowrap;
		}
	`
			: ""}

	&:hover:not(:disabled) {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		transform: translateY(-1px);
	}

	.icon {
		font-size: 16px;
	}
	.text {
		font-size: 0.9rem;
		font-weight: 700;
		min-width: 0;
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
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		padding: 8px;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 6px;

		.icon {
			font-size: 16px;
		}

		.text {
			font-size: 0.78rem;
		}

		.badge {
			width: 10px;
			height: 10px;
		}

		.avail {
			grid-column: 2 / 4;
			font-size: 0.7rem;
			justify-self: start;
		}
	}
`;
