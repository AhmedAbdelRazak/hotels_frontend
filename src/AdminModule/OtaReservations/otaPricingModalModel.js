/** @format */

import { allocateWeightedTotal } from "./otaPricingDistribution";
import {
	otaPricingRoomCount,
	recalculateOtaPricingDay,
	summarizeOtaPricingRooms,
} from "./otaPricingEditor";
import {
	getHotelRunnerPayoutDisplay,
	getReservationGuestGrossDisplay,
	isHotelRunnerReservation,
} from "../AllReservation/hotelRunnerPricingDisplay";

const LOCALIZED_MONEY_DIGITS = Object.freeze({
	"\u0660": "0",
	"\u0661": "1",
	"\u0662": "2",
	"\u0663": "3",
	"\u0664": "4",
	"\u0665": "5",
	"\u0666": "6",
	"\u0667": "7",
	"\u0668": "8",
	"\u0669": "9",
	"\u06f0": "0",
	"\u06f1": "1",
	"\u06f2": "2",
	"\u06f3": "3",
	"\u06f4": "4",
	"\u06f5": "5",
	"\u06f6": "6",
	"\u06f7": "7",
	"\u06f8": "8",
	"\u06f9": "9",
});
const BIDI_CONTROL_PATTERN = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
const GROUPED_SPACE_PATTERN = /[ \t\u00a0\u202f]/g;

const normalizeLocalizedMoneyDigits = (value = "") =>
	String(value || "").replace(
		/[\u0660-\u0669\u06f0-\u06f9]/g,
		(digit) => LOCALIZED_MONEY_DIGITS[digit] || digit,
	);

const validGroupedInteger = (value = "", separator = "") => {
	if (!separator) return /^\d+$/.test(value);
	const groups = String(value).split(separator);
	return (
		/^\d{1,3}$/.test(groups[0] || "") &&
		groups.slice(1).every((group) => /^\d{3}$/.test(group))
	);
};

// Keep this grammar synchronized with parseOtaCommissionAmount on the backend.
const normalizeLocalizedMoneyText = (value) => {
	if (typeof value !== "string" || value.length > 128) return "";

	let text = normalizeLocalizedMoneyDigits(value)
		.replace(BIDI_CONTROL_PATTERN, "")
		.trim();
	if (!text) return "";

	if (/[\u066b\u066c]/.test(text)) {
		// Arabic marks are explicit: U+066B is decimal and U+066C is grouping.
		// Mixing them with Western separators would make the server interpretation unsafe.
		if (/[.,]/.test(text)) return "";
		const sign = /^[+-]/.test(text) ? text[0] : "";
		const unsigned = sign ? text.slice(1) : text;
		if ((unsigned.match(/\u066b/g) || []).length > 1) return "";
		const [integerPart, fractionPart] = unsigned.split("\u066b");
		if (fractionPart !== undefined && !/^\d{1,2}$/.test(fractionPart)) {
			return "";
		}
		if (
			integerPart.includes("\u066c")
				? !validGroupedInteger(integerPart, "\u066c")
				: !/^\d+$/.test(integerPart)
		) {
			return "";
		}
		return `${sign}${integerPart.split("\u066c").join("")}${
			fractionPart === undefined ? "" : `.${fractionPart}`
		}`;
	}

	if (GROUPED_SPACE_PATTERN.test(text)) {
		GROUPED_SPACE_PATTERN.lastIndex = 0;
		const groupedSpaceMoney =
			/^[+-]?\d{1,3}(?:[ \t\u00a0\u202f]\d{3})+(?:[.,]\d{1,2})?$/;
		if (!groupedSpaceMoney.test(text)) return "";
		text = text.replace(GROUPED_SPACE_PATTERN, "");
	}
	if (!/^[+-]?[\d.,]+$/.test(text)) return "";

	const sign = /^[+-]/.test(text) ? text[0] : "";
	const unsigned = sign ? text.slice(1) : text;
	if (!unsigned || !/\d/.test(unsigned)) return "";

	const normalizeWithDecimal = (decimalSeparator, groupingSeparator) => {
		const decimalIndex = unsigned.lastIndexOf(decimalSeparator);
		if (
			decimalIndex < 0 ||
			unsigned.indexOf(decimalSeparator) !== decimalIndex
		) {
			return "";
		}
		const integerPart = unsigned.slice(0, decimalIndex);
		const fractionPart = unsigned.slice(decimalIndex + 1);
		if (!/^\d{1,2}$/.test(fractionPart)) return "";
		if (!validGroupedInteger(integerPart, groupingSeparator)) return "";
		return `${sign}${integerPart
			.split(groupingSeparator)
			.join("")}.${fractionPart}`;
	};

	const commaCount = (unsigned.match(/,/g) || []).length;
	const dotCount = (unsigned.match(/\./g) || []).length;
	if (commaCount && dotCount) {
		return unsigned.lastIndexOf(",") > unsigned.lastIndexOf(".")
			? normalizeWithDecimal(",", ".")
			: normalizeWithDecimal(".", ",");
	}

	const normalizeSingleSeparator = (separator, count) => {
		if (!count) return /^\d+$/.test(unsigned) ? `${sign}${unsigned}` : "";
		const groups = unsigned.split(separator);
		if (groups.some((group) => !/^\d+$/.test(group))) return "";
		if (count > 1) {
			if (validGroupedInteger(unsigned, separator)) {
				return `${sign}${groups.join("")}`;
			}
			const fractionPart = groups[groups.length - 1];
			const integerPart = groups.slice(0, -1).join(separator);
			if (
				/^\d{1,2}$/.test(fractionPart) &&
				validGroupedInteger(integerPart, separator)
			) {
				return `${sign}${groups.slice(0, -1).join("")}.${fractionPart}`;
			}
			return "";
		}

		const [integerPart, suffix] = groups;
		if (/^\d{1,2}$/.test(suffix)) {
			return `${sign}${integerPart}.${suffix}`;
		}
		// A single Western separator plus three digits is ambiguous: reject it.
		return "";
	};

	return commaCount
		? normalizeSingleSeparator(",", commaCount)
		: normalizeSingleSeparator(".", dotCount);
};

export const parseLocalizedMoney = (rawValue) => {
	if (rawValue === null || rawValue === undefined) {
		return { status: "missing", value: null, rawValue };
	}
	if (
		typeof rawValue === "string" &&
		!rawValue.replace(BIDI_CONTROL_PATTERN, "").trim()
	) {
		return { status: "missing", value: null, rawValue };
	}
	if (typeof rawValue === "number") {
		if (!Number.isFinite(rawValue)) {
			return { status: "invalid", value: null, rawValue };
		}
		const scaled = rawValue * 100;
		const roundedScaled = Math.round(scaled);
		if (
			!Number.isSafeInteger(roundedScaled) ||
			Math.abs(scaled - roundedScaled) > 1e-7
		) {
			return { status: "invalid", value: null, rawValue };
		}
		return {
			status: "valid",
			value: rawValue,
			rawValue,
			normalized: String(rawValue),
		};
	}

	const normalized = normalizeLocalizedMoneyText(rawValue);
	if (!normalized) {
		return { status: "invalid", value: null, rawValue, normalized };
	}
	const value = Number(normalized);
	const scaled = value * 100;
	const roundedScaled = Math.round(scaled);
	return Number.isFinite(value) &&
		Number.isSafeInteger(roundedScaled) &&
		Math.abs(scaled - roundedScaled) <= 1e-7
		? { status: "valid", value, rawValue, normalized }
		: { status: "invalid", value: null, rawValue, normalized };
};

export const otaPricingNumberValue = (value) => {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	const parsed = parseLocalizedMoney(value);
	return parsed.status === "valid" ? parsed.value : 0;
};

export const roundOtaMoney = (value) => Number(Number(value).toFixed(2));

export const resolveLocalizedMoneyCandidates = (candidates = []) => {
	let firstInvalid = null;
	for (const candidate of candidates) {
		const parsed = parseLocalizedMoney(candidate?.value);
		if (parsed.status === "valid") {
			return {
				...parsed,
				value: roundOtaMoney(parsed.value),
				source: candidate?.source || "",
			};
		}
		if (parsed.status === "invalid" && !firstInvalid) {
			firstInvalid = { ...parsed, source: candidate?.source || "" };
		}
	}
	return (
		firstInvalid || {
			status: "missing",
			value: null,
			rawValue: null,
			source: "",
		}
	);
};

export const resolveSavedOtaCommission = (reservation = {}) =>
	resolveLocalizedMoneyCandidates([
		{
			source: "adminPricing.commissionAmount",
			value: reservation?.adminPricing?.commissionAmount,
		},
		{
			source: "financial_cycle.commissionAmount",
			value: reservation?.financial_cycle?.commissionAmount,
		},
		{
			source: "financial_cycle.commissionValue",
			value: reservation?.financial_cycle?.commissionValue,
		},
		{
			source: "commissionData.commissionAmount",
			value: reservation?.commissionData?.commissionAmount,
		},
		{
			source: "commissionData.amount",
			value: reservation?.commissionData?.amount,
		},
		{ source: "commission", value: reservation?.commission },
	]);

export const resolveInitialOtaCommissionInput = (
	reservation = {},
	savedRootTotal = 0,
) => {
	const saved = resolveSavedOtaCommission(reservation);
	if (saved.status === "valid") {
		return { ...saved, inputValue: saved.value.toFixed(2) };
	}
	if (saved.status === "invalid") {
		return { ...saved, inputValue: String(saved.rawValue ?? "") };
	}
	const root = parseLocalizedMoney(savedRootTotal);
	const fallback =
		root.status === "valid" && root.value > 0
			? roundOtaMoney(root.value * 0.1)
			: 0;
	return {
		status: "default",
		value: fallback,
		rawValue: null,
		source: "default_root_commission",
		inputValue: fallback.toFixed(2),
	};
};

export const preferredOtaPricingRooms = (reservation = {}) => {
	const pricingRooms = Array.isArray(reservation?.pickedRoomsPricing)
		? reservation.pickedRoomsPricing
		: null;
	const typeRooms = Array.isArray(reservation?.pickedRoomsType)
		? reservation.pickedRoomsType
		: null;
	if (pricingRooms?.length) return pricingRooms;
	if (typeRooms?.length) return typeRooms;
	return pricingRooms || typeRooms || [];
};

const firstExplicitOtaMoney = (...values) => {
	for (const value of values) {
		const parsed = parseLocalizedMoney(value);
		if (parsed.status === "valid") return roundOtaMoney(parsed.value);
	}
	return null;
};

const otaPricingDateKey = (value) => {
	if (!value) return "";
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime())
		? ""
		: parsed.toISOString().slice(0, 10);
};

/**
 * HotelRunner modal totals are semantic financial roles. Unknown client/net
 * roles remain null. Legacy reservations retain the previous zero fallback.
 */
export const resolveOtaPricingModalSavedTotals = (reservation = {}) => {
	const isHotelRunner = isHotelRunnerReservation(reservation);
	const guestGross = getReservationGuestGrossDisplay(reservation);
	const payout = getHotelRunnerPayoutDisplay(reservation);
	const rootTotal = firstExplicitOtaMoney(
		reservation?.adminPricing?.rootTotal,
		reservation?.sub_total,
		reservation?.hotel_visible_amount,
	);

	if (isHotelRunner) {
		const guestGrossIsSar =
			guestGross.propertyAvailable === true &&
			String(guestGross.propertyCurrency || "").toUpperCase() === "SAR";
		const payoutIsSar =
			payout.netAvailable === true &&
			String(payout.propertyCurrency || "").toUpperCase() === "SAR";
		return {
			isHotelRunner: true,
			guestGrossAvailable: guestGrossIsSar,
			guestGrossAmount: guestGrossIsSar ? guestGross.propertyAmount : null,
			guestGrossCurrency: guestGrossIsSar ? "SAR" : "",
			guestGrossDisplayBasis: guestGrossIsSar ? "property" : "",
			clientAvailable: guestGrossIsSar,
			rootAvailable: rootTotal !== null,
			netAvailable: payoutIsSar,
			clientTotal: guestGrossIsSar
				? roundOtaMoney(guestGross.propertyAmount)
				: null,
			rootTotal,
			netAfterExpensesTotal: payoutIsSar
				? roundOtaMoney(payout.netAmount)
				: null,
			netCurrency: payoutIsSar ? "SAR" : "",
		};
	}

	return {
		isHotelRunner: false,
		guestGrossAvailable: true,
		guestGrossAmount:
			firstExplicitOtaMoney(
				reservation?.adminPricing?.clientTotal,
				reservation?.total_amount,
			) ?? 0,
		guestGrossCurrency: "",
		guestGrossDisplayBasis: "property",
		clientAvailable: true,
		rootAvailable: true,
		netAvailable: true,
		clientTotal:
			firstExplicitOtaMoney(
				reservation?.adminPricing?.clientTotal,
				reservation?.total_amount,
			) ?? 0,
		rootTotal: rootTotal ?? 0,
		netAfterExpensesTotal:
			firstExplicitOtaMoney(
				reservation?.adminPricing?.netAfterExpensesTotal,
			) ?? 0,
	};
};

export const formatOtaPricingModalGuestGross = (
	savedTotals = {},
	{ unavailableLabel = "\u2014" } = {},
) => {
	if (
		savedTotals.guestGrossAvailable !== true ||
		typeof savedTotals.guestGrossAmount !== "number" ||
		!Number.isFinite(savedTotals.guestGrossAmount) ||
		String(savedTotals.guestGrossCurrency || "").toUpperCase() !== "SAR" ||
		savedTotals.guestGrossDisplayBasis !== "property"
	) {
		return unavailableLabel;
	}
	return `${savedTotals.guestGrossAmount.toFixed(2)} SAR`;
};

export const formatOtaAdminListGuestGross = (
	reservation = {},
	{ unavailableLabel = "\u2014" } = {},
) => {
	const guestGross = getReservationGuestGrossDisplay(reservation);
	if (!guestGross.isHotelRunner) {
		const legacyAmount = firstExplicitOtaMoney(reservation?.total_amount);
		return legacyAmount === null
			? unavailableLabel
			: `${legacyAmount.toFixed(2)} SAR`;
	}
	if (
		guestGross.propertyAvailable !== true ||
		typeof guestGross.propertyAmount !== "number" ||
		!Number.isFinite(guestGross.propertyAmount) ||
		String(guestGross.propertyCurrency || "").toUpperCase() !== "SAR"
	) {
		return unavailableLabel;
	}
	return `${guestGross.propertyAmount.toFixed(2)} SAR`;
};

export const formatOtaPricingModalPayout = (
	savedTotals = {},
	{ unavailableLabel = "\u2014" } = {},
) => {
	if (
		savedTotals.netAvailable !== true ||
		typeof savedTotals.netAfterExpensesTotal !== "number" ||
		!Number.isFinite(savedTotals.netAfterExpensesTotal) ||
		String(savedTotals.netCurrency || "").toUpperCase() !== "SAR"
	) {
		return unavailableLabel;
	}
	return `${savedTotals.netAfterExpensesTotal.toFixed(2)} SAR`;
};

const normalizeLegacyOtaPricingDay = (day = {}) => {
	const clientPrice = roundOtaMoney(
		otaPricingNumberValue(
			day.clientPrice ??
				day.mainPrice ??
				day.totalPriceWithCommission ??
				day.price,
		),
	);
	const rootPrice =
		firstExplicitOtaMoney(
			day.rootPrice,
			day.totalPriceWithoutCommission,
			day.basePrice,
		) ?? 0;
	const explicitNet = firstExplicitOtaMoney(
		day.netAfterExpenses,
		day.netAfterOtaExpenses,
		day.netAfterOtherExpenses,
	);
	const explicitExpense = firstExplicitOtaMoney(
		day.otaExpenseAmount,
		day.otherExpenseAmount,
		day.expenseAmount,
	);
	const netAfterExpenses =
		explicitNet !== null
			? explicitNet
			: explicitExpense !== null
				? roundOtaMoney(clientPrice - explicitExpense)
				: clientPrice;
	const otaExpenseAmount = roundOtaMoney(clientPrice - netAfterExpenses);
	const platformMargin = roundOtaMoney(netAfterExpenses - rootPrice);
	const platformMarginRate =
		netAfterExpenses > 0
			? roundOtaMoney((platformMargin / netAfterExpenses) * 100)
			: 0;

	return {
		...day,
		date: otaPricingDateKey(day.date || day.day || day.pricingDate),
		price: clientPrice,
		clientPrice,
		mainPrice: clientPrice,
		rootPrice,
		totalPriceWithCommission: clientPrice,
		totalPriceWithoutCommission: rootPrice,
		netAfterExpenses,
		netAfterOtaExpenses: netAfterExpenses,
		otaExpenseAmount,
		platformMargin,
		platformMarginRate,
	};
};

const normalizeHotelRunnerOtaPricingDay = (day = {}, availability = {}) => {
	const clientPrice = availability.clientAvailable
		? firstExplicitOtaMoney(
				day.clientPrice,
				day.mainPrice,
				day.totalPriceWithCommission,
				day.price,
			)
		: null;
	const rootPrice = firstExplicitOtaMoney(
		day.rootPrice,
		day.totalPriceWithoutCommission,
		day.basePrice,
	);
	const netAfterExpenses = availability.netAvailable
		? firstExplicitOtaMoney(
				day.netAfterExpenses,
				day.netAfterOtaExpenses,
				day.netAfterOtherExpenses,
			)
		: null;

	return {
		...day,
		pricingRoleAvailability: {
			client: clientPrice !== null,
			root: rootPrice !== null,
			net: netAfterExpenses !== null,
		},
		date: otaPricingDateKey(day.date || day.day || day.pricingDate),
		price: clientPrice,
		clientPrice,
		mainPrice: clientPrice,
		rootPrice,
		totalPriceWithCommission: clientPrice,
		totalPriceWithoutCommission: rootPrice,
		netAfterExpenses,
		netAfterOtaExpenses: netAfterExpenses,
	};
};

const weightedOtaFieldTotal = (rooms = [], field) => {
	let amount = 0;
	let dayCount = 0;
	for (const room of rooms) {
		const count = otaPricingRoomCount(room);
		for (const day of room?.pricingByDay || []) {
			dayCount += 1;
			if (typeof day?.[field] !== "number" || !Number.isFinite(day[field])) {
				return null;
			}
			amount += day[field] * count;
		}
	}
	return dayCount ? roundOtaMoney(amount) : null;
};

const clearHotelRunnerRole = (rooms = [], role) => {
	const aliases =
		role === "clientPrice"
			? ["price", "clientPrice", "mainPrice", "totalPriceWithCommission"]
			: ["netAfterExpenses", "netAfterOtaExpenses"];
	return rooms.map((room) => ({
		...room,
		pricingByDay: (room?.pricingByDay || []).map((day) => ({
			...day,
			...Object.fromEntries(aliases.map((field) => [field, null])),
			pricingRoleAvailability: {
				...(day?.pricingRoleAvailability || {}),
				[role === "clientPrice" ? "client" : "net"]: false,
			},
		})),
	}));
};

const withNullableHotelRunnerDerivedValues = (rooms = []) =>
	rooms.map((room) => ({
		...room,
		pricingByDay: (room?.pricingByDay || []).map((day) => {
			const hasClient =
				typeof day.clientPrice === "number" && Number.isFinite(day.clientPrice);
			const hasRoot =
				typeof day.rootPrice === "number" && Number.isFinite(day.rootPrice);
			const hasNet =
				typeof day.netAfterExpenses === "number" &&
				Number.isFinite(day.netAfterExpenses);
			const otaExpenseAmount =
				hasClient && hasNet
					? roundOtaMoney(day.clientPrice - day.netAfterExpenses)
					: null;
			const platformMargin =
				hasNet && hasRoot
					? roundOtaMoney(day.netAfterExpenses - day.rootPrice)
					: null;
			const platformMarginRate =
				platformMargin !== null && day.netAfterExpenses > 0
					? roundOtaMoney((platformMargin / day.netAfterExpenses) * 100)
					: null;
			return {
				...day,
				otaExpenseAmount,
				platformMargin,
				platformMarginRate,
			};
		}),
	}));

/**
 * Builds a modal-only draft. It never writes the reservation. Verified
 * aggregate roles authorize existing nightly rows only when their weighted sum
 * reconciles exactly; stale or ambiguous rows are blanked instead of inferred.
 */
export const normalizeOtaPricingRoomsForModal = (reservation = {}) => {
	const source = JSON.parse(
		JSON.stringify(preferredOtaPricingRooms(reservation) || []),
	);
	const saved = resolveOtaPricingModalSavedTotals(reservation);
	let rooms = source.map((room) => ({
		...room,
		count: otaPricingRoomCount(room),
		pricingByDay: Array.isArray(room?.pricingByDay)
			? room.pricingByDay.map((day) =>
					saved.isHotelRunner
						? normalizeHotelRunnerOtaPricingDay(day, saved)
						: normalizeLegacyOtaPricingDay(day),
				)
			: [],
	}));

	if (!saved.isHotelRunner) return rooms;
	if (
		!saved.clientAvailable ||
		weightedOtaFieldTotal(rooms, "clientPrice") !== saved.clientTotal
	) {
		rooms = clearHotelRunnerRole(rooms, "clientPrice");
	}
	if (
		!saved.netAvailable ||
		weightedOtaFieldTotal(rooms, "netAfterExpenses") !==
			saved.netAfterExpensesTotal
	) {
		rooms = clearHotelRunnerRole(rooms, "netAfterExpenses");
	}
	return withNullableHotelRunnerDerivedValues(rooms);
};

export const summarizeOtaPricingRoomsForModal = (rooms = []) => {
	const fields = {
		clientTotal: "clientPrice",
		rootTotal: "rootPrice",
		netAfterExpensesTotal: "netAfterExpenses",
		otaExpenseTotal: "otaExpenseAmount",
		platformMarginTotal: "platformMargin",
	};
	const summary = Object.fromEntries(
		Object.entries(fields).map(([totalField, dayField]) => [
			totalField,
			weightedOtaFieldTotal(rooms, dayField),
		]),
	);
	return {
		...summary,
		totalRooms: (Array.isArray(rooms) ? rooms : []).reduce(
			(total, room) => total + otaPricingRoomCount(room),
			0,
		),
	};
};

export const otaPricingInitializationDecision = ({
	open = false,
	reservationKey = "",
	initializedKey = "",
} = {}) => {
	if (!open) return { initialize: false, nextInitializedKey: "" };
	const nextKey = String(reservationKey || "current");
	return {
		initialize: nextKey !== String(initializedKey || ""),
		nextInitializedKey: nextKey,
	};
};

const DISTRIBUTION_FIELDS = {
	client: "clientPrice",
	root: "rootPrice",
	net: "netAfterExpenses",
};

const distributionWeights = (rooms = []) => {
	const weights = [];
	rooms.forEach((room) => {
		(room?.pricingByDay || []).forEach(() => {
			weights.push(otaPricingRoomCount(room));
		});
	});
	return weights;
};

const applyOneDistribution = (rooms, field, total) => {
	const weights = distributionWeights(rooms);
	if (!weights.length) {
		return { ok: false, code: "no_daily_pricing", rooms };
	}
	const allocation =
		total === 0
			? { unitAmounts: weights.map(() => 0), actualTotal: 0, exact: true }
			: allocateWeightedTotal(total, weights);
	if (!allocation.exact || allocation.unitAmounts.length !== weights.length) {
		return {
			ok: false,
			code: "inexact_distribution",
			field,
			requestedTotal: total,
			actualTotal: allocation.actualTotal,
			rooms,
		};
	}

	let allocationIndex = 0;
	const nextRooms = rooms.map((room) => ({
		...room,
		pricingByDay: (room?.pricingByDay || []).map((day) =>
			recalculateOtaPricingDay(day, {
				[DISTRIBUTION_FIELDS[field]]: allocation.unitAmounts[allocationIndex++],
			}),
		),
	}));
	return { ok: true, rooms: nextRooms, allocation };
};

export const touchedOtaDistributionFields = (touched = {}) =>
	Object.keys(DISTRIBUTION_FIELDS).filter((field) => touched?.[field] === true);

export const applyTouchedOtaDistributions = ({
	rooms = [],
	distributionValues = {},
	distributionTouched = {},
} = {}) => {
	const fields = touchedOtaDistributionFields(distributionTouched);
	let nextRooms = rooms;
	for (const field of fields) {
		const parsed = parseLocalizedMoney(distributionValues[field]);
		if (parsed.status !== "valid" || parsed.value < 0) {
			return {
				ok: false,
				code: "invalid_distribution",
				field,
				status: parsed.status,
				rooms,
			};
		}
		const distributed = applyOneDistribution(
			nextRooms,
			field,
			roundOtaMoney(parsed.value),
		);
		if (!distributed.ok) return { ...distributed, rooms };
		nextRooms = distributed.rooms;
	}
	return { ok: true, rooms: nextRooms, appliedFields: fields };
};

export const validateOtaPricingRows = (rooms = []) => {
	const days = (Array.isArray(rooms) ? rooms : []).flatMap((room) =>
		Array.isArray(room?.pricingByDay) ? room.pricingByDay : [],
	);
	if (!days.length) return { ok: false, code: "no_daily_pricing" };
	for (const day of days) {
		// Modal initialization and every valid Input edit canonicalize these fields
		// to numbers. A remaining string is an incomplete or malformed cell draft.
		if (
			typeof day?.clientPrice !== "number" ||
			typeof day?.rootPrice !== "number" ||
			typeof day?.netAfterExpenses !== "number"
		) {
			return { ok: false, code: "invalid_daily_pricing", day };
		}
		const client = parseLocalizedMoney(day?.clientPrice);
		const root = parseLocalizedMoney(day?.rootPrice);
		const net = parseLocalizedMoney(day?.netAfterExpenses);
		if (
			client.status !== "valid" ||
			root.status !== "valid" ||
			net.status !== "valid" ||
			client.value <= 0 ||
			root.value < 0 ||
			net.value < 0 ||
			net.value - client.value > 0.009
		) {
			return { ok: false, code: "invalid_daily_pricing", day };
		}
	}
	return { ok: true };
};

const stripOtaPricingModalMetadata = (rooms = []) =>
	(Array.isArray(rooms) ? rooms : []).map((room) => ({
		...room,
		pricingByDay: (room?.pricingByDay || []).map((day) => {
			const { pricingRoleAvailability, ...persistedDay } = day || {};
			return persistedDay;
		}),
	}));

export const prepareOtaPricingSave = ({
	rooms = [],
	distributionValues = {},
	distributionTouched = {},
	commissionInput,
} = {}) => {
	const distributed = applyTouchedOtaDistributions({
		rooms,
		distributionValues,
		distributionTouched,
	});
	if (!distributed.ok) return distributed;
	const rowValidation = validateOtaPricingRows(distributed.rooms);
	if (!rowValidation.ok) return { ...rowValidation, rooms };

	const commission = parseLocalizedMoney(commissionInput);
	if (commission.status !== "valid") {
		return {
			ok: false,
			code: "invalid_commission",
			status: commission.status,
			rooms,
		};
	}
	if (commission.value < 0) {
		return { ok: false, code: "negative_commission", rooms };
	}
	if (commission.value > Number.MAX_SAFE_INTEGER / 100) {
		return { ok: false, code: "commission_out_of_range", rooms };
	}

	const commissionAmount = roundOtaMoney(commission.value);
	const summary = summarizeOtaPricingRooms(distributed.rooms);
	const persistedRooms = stripOtaPricingModalMetadata(distributed.rooms);
	const totals = {
		clientTotal: roundOtaMoney(summary.clientTotal),
		rootTotal: roundOtaMoney(summary.rootTotal),
		netAfterExpensesTotal: roundOtaMoney(summary.netAfterExpensesTotal),
		otaExpenseTotal: roundOtaMoney(summary.otaExpenseTotal),
		platformMarginTotal: roundOtaMoney(summary.platformMarginTotal),
		totalRooms: summary.totalRooms,
	};
	return {
		ok: true,
		rooms: distributed.rooms,
		appliedFields: distributed.appliedFields,
		payload: {
			allowOtaClientTotalOverride: true,
			pickedRoomsType: persistedRooms,
			pickedRoomsPricing: persistedRooms,
			total_rooms: totals.totalRooms,
			total_amount: totals.clientTotal,
			sub_total: totals.rootTotal,
			commission: commissionAmount,
			adminPricing: {
				mode: "ota_review",
				clientTotal: totals.clientTotal,
				rootTotal: totals.rootTotal,
				netAfterExpensesTotal: totals.netAfterExpensesTotal,
				otaExpenseTotal: totals.otaExpenseTotal,
				platformMarginTotal: totals.platformMarginTotal,
				commissionAmount,
			},
		},
	};
};
