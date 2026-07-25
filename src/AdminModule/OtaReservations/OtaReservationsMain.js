/** @format */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Button, Input, Modal, Select, Spin, Tooltip, message } from "antd";
import {
	CheckCircleOutlined,
	EditOutlined,
	ExclamationCircleOutlined,
	EyeOutlined,
	ReloadOutlined,
	SearchOutlined,
} from "@ant-design/icons";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import MoreDetails from "../AllReservation/MoreDetails";
import { isAuthenticated } from "../../auth";
import {
	formatSaudiGregorianDate,
	formatSaudiHijriDate,
} from "../../utils/saudiDates";
import {
	assignOtaReservationHotel,
	getAdminReservationById,
	getOtaAssignableHotels,
	getOtaReservationRoomOptions,
	getOtaReservationsForAdmin,
	readUserId,
	releaseOtaReservationToHotel,
	updateOtaReservationPricing,
} from "../apiAdmin";
import { allocateWeightedTotal } from "./otaPricingDistribution";
import {
	assignedHotelIdForReservation,
	hasAssignedHotel,
	isReleaseReady,
	isZeroHotelBasePriceRelease,
} from "./otaReleaseEligibility";
import { SUPER_USER_IDS } from "../utils/superUsers";
import {
	applyOtaRoomConfig,
	autoMapOtaPricingRooms,
	copyFirstOtaPricingRowValues,
	hasCurrentOtaRoomMapping,
	otaPricingRoomCount as roomCount,
	otaRoomConfigId,
	recalculateOtaPricingDay as recalcDay,
	summarizeOtaPricingRooms as summarizeRooms,
} from "./otaPricingEditor";

const numberValue = (value) => {
	if (value === null || value === undefined || value === "") return 0;
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	const parsed = Number(String(value).replace(/,/g, "").trim());
	return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) => numberValue(value).toFixed(2);

const round2 = (value) => Number(numberValue(value).toFixed(2));

const titleCaseText = (value = "") =>
	String(value || "")
		.trim()
		.split(/\s+/)
		.map((word) =>
			word
				.split(/([-'])/)
				.map((part) =>
					/^[-']$/.test(part) || !part
						? part
						: `${part.charAt(0).toLocaleUpperCase()}${part
								.slice(1)
								.toLocaleLowerCase()}`
				)
				.join("")
		)
		.join(" ");

const OTA_PRICING_TEXT = {
	English: {
		title: "Edit pricing details",
		cancel: "Cancel",
		save: "Save",
		distribute: "Distribute",
		distributeAll: "Distribute totals",
		savedTotalPlaceholder: "Saved total to distribute",
		enterTotalPlaceholder: "Enter total to distribute",
		generalCommissionPlaceholder: "Enter general commission",
		noDailyPricing: "No daily pricing rows were found.",
		noDistributionValues: "Enter at least one total to distribute.",
		copyFirstRow: "Copy first row",
		firstRowCopied: "First-row pricing was copied to every room-night.",
		mappingTitle: "PMS room mapping",
		mappingHelp:
			"Each OTA room unit must point to an active room configuration in the assigned hotel before pricing can be saved.",
		roomLine: "OTA room",
		roomUnits: (count) => `${count} ${count === 1 ? "room" : "rooms"}`,
		selectPmsRoom: "Select the current PMS room",
		roomMappingRequired: (index) =>
			`Select an active PMS room for OTA room ${index + 1}.`,
		roomOptionsLoading: "Loading active PMS rooms...",
		roomOptionsFailed: "Active PMS rooms could not be loaded.",
		retry: "Retry",
		invalidDailyPricing:
			"Every row needs a positive client price, non-negative hotel/net prices, and net after expenses cannot exceed the client price.",
		context: {
			confirmationNumber: "Confirmation Number",
			otaConfirmationNumber: "OTA confirmation number",
			hotelName: "Hotel Name",
			checkIn: "Check in",
			checkOut: "Check out",
			nights: "Nights",
		},
		labels: {
			totalClientPrice: "Total client price",
			totalBaseHotelPrice: "Total base hotel price",
			netAfterOtaExpenses: "Net after OTA expenses",
			generalCommission: "General commission",
			date: "Date",
			mainClientPrice: "Main client price",
			baseHotelPrice: "Base hotel price",
			netAfterExpenses: "Net after expenses",
			otaOtherExpenses: "OTA/other expenses",
			platformMargin: "Platform margin",
			marginRate: "Margin %",
			total: "Total",
		},
		help: {
			totalClientPrice:
				"The full OTA/client-facing reservation total. Use Distribute to spread this total across all nights.",
			totalBaseHotelPrice:
				"The total amount the hotel should see and confirm. This is the hotel-visible root/base total.",
			netAfterOtaExpenses:
				"The remaining total after OTA or other platform expenses are deducted from the client total.",
			generalCommission:
				"Separate PMS commission saved on the reservation. This does not distribute into nightly room prices.",
			mainClientPrice:
				"The nightly OTA/client-facing amount for this date.",
			baseHotelPrice:
				"The nightly hotel-visible amount for this date.",
			netAfterExpenses:
				"The nightly amount after OTA or other platform expenses.",
			otaOtherExpenses:
				"Calculated automatically as client price minus net after expenses.",
			platformMargin:
				"Calculated automatically as net after expenses minus base hotel price. Visible only to SUPER ADMINS.",
			marginRate:
				"Platform margin percentage from the net after expenses. Visible only to SUPER ADMINS.",
		},
	},
	Arabic: {
		title: "تعديل تفاصيل الأسعار",
		cancel: "إلغاء",
		save: "حفظ",
		distribute: "توزيع",
		savedTotalPlaceholder: "الإجمالي المحفوظ للتوزيع",
		enterTotalPlaceholder: "أدخل الإجمالي للتوزيع",
		noDailyPricing: "لا توجد صفوف أسعار يومية لهذا الحجز.",
		generalCommissionPlaceholder:
			"\u0623\u062f\u062e\u0644 \u0645\u0628\u0644\u063a \u0627\u0644\u0639\u0645\u0648\u0644\u0629",
		copyFirstRow: "\u0646\u0633\u062e \u0642\u064a\u0645 \u0623\u0648\u0644 \u0635\u0641",
		firstRowCopied:
			"\u062a\u0645 \u0646\u0633\u062e \u0623\u0633\u0639\u0627\u0631 \u0623\u0648\u0644 \u0635\u0641 \u0625\u0644\u0649 \u0643\u0644 \u0644\u064a\u0644\u0629 \u0648\u063a\u0631\u0641\u0629.",
		mappingTitle: "\u0631\u0628\u0637 \u0646\u0648\u0639 \u0627\u0644\u063a\u0631\u0641\u0629 \u0645\u0639 \u0646\u0638\u0627\u0645 PMS",
		mappingHelp:
			"\u064a\u062c\u0628 \u0631\u0628\u0637 \u0643\u0644 \u063a\u0631\u0641\u0629 OTA \u0628\u0646\u0648\u0639 \u063a\u0631\u0641\u0629 \u0646\u0634\u0637 \u0641\u064a \u0627\u0644\u0641\u0646\u062f\u0642 \u0642\u0628\u0644 \u062d\u0641\u0638 \u0627\u0644\u0623\u0633\u0639\u0627\u0631.",
		roomLine: "\u063a\u0631\u0641\u0629 OTA",
		roomUnits: (count) =>
			`${count} ${count === 1 ? "\u063a\u0631\u0641\u0629" : "\u063a\u0631\u0641"}`,
		selectPmsRoom: "\u0627\u062e\u062a\u0631 \u0646\u0648\u0639 \u0627\u0644\u063a\u0631\u0641\u0629 \u0627\u0644\u062d\u0627\u0644\u064a \u0641\u064a PMS",
		roomMappingRequired: (index) =>
			`\u0627\u062e\u062a\u0631 \u0646\u0648\u0639 \u063a\u0631\u0641\u0629 PMS \u0646\u0634\u0637 \u0644\u063a\u0631\u0641\u0629 OTA ${index + 1}.`,
		roomOptionsLoading: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u063a\u0631\u0641 PMS \u0627\u0644\u0646\u0634\u0637\u0629...",
		roomOptionsFailed: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u063a\u0631\u0641 PMS \u0627\u0644\u0646\u0634\u0637\u0629.",
		retry: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",
		invalidDailyPricing:
			"\u064a\u062c\u0628 \u0623\u0646 \u064a\u062d\u062a\u0648\u064a \u0643\u0644 \u0635\u0641 \u0639\u0644\u0649 \u0633\u0639\u0631 \u0639\u0645\u064a\u0644 \u0645\u0648\u062c\u0628\u060c \u0648\u0623\u0633\u0639\u0627\u0631 \u0641\u0646\u062f\u0642/\u0635\u0627\u0641\u064a \u063a\u064a\u0631 \u0633\u0627\u0644\u0628\u0629\u060c \u0648\u0623\u0644\u0627 \u064a\u062a\u062c\u0627\u0648\u0632 \u0627\u0644\u0635\u0627\u0641\u064a \u0633\u0639\u0631 \u0627\u0644\u0639\u0645\u064a\u0644.",
		context: {
			confirmationNumber: "رقم التأكيد",
			otaConfirmationNumber: "رقم تأكيد OTA",
			hotelName: "اسم الفندق",
			checkIn: "تاريخ الوصول",
			checkOut: "تاريخ المغادرة",
			nights: "\u0627\u0644\u0644\u064a\u0627\u0644\u064a",
		},
		labels: {
			totalClientPrice: "إجمالي سعر العميل",
			totalBaseHotelPrice: "إجمالي السعر الأساسي للفندق",
			netAfterOtaExpenses: "الصافي بعد مصاريف OTA",
			generalCommission:
				"\u0645\u0628\u0644\u063a \u0627\u0644\u0639\u0645\u0648\u0644\u0629",
			date: "التاريخ",
			mainClientPrice: "سعر العميل الرئيسي",
			baseHotelPrice: "السعر الأساسي للفندق",
			netAfterExpenses: "الصافي بعد المصاريف",
			otaOtherExpenses: "مصاريف OTA/أخرى",
			platformMargin: "هامش المنصة",
			marginRate: "نسبة الهامش %",
			total: "الإجمالي",
		},
		help: {
			totalClientPrice:
				"إجمالي السعر الظاهر للعميل أو منصة OTA. استخدم توزيع لتقسيم الإجمالي على كل الليالي.",
			totalBaseHotelPrice:
				"إجمالي المبلغ الذي يجب أن يراه الفندق ويؤكده. هذا هو السعر الأساسي الظاهر للفندق.",
			netAfterOtaExpenses:
				"الإجمالي المتبقي بعد خصم مصاريف OTA أو أي مصاريف منصات أخرى من إجمالي العميل.",
			generalCommission:
				"\u0639\u0645\u0648\u0644\u0629 \u0639\u0627\u0645\u0629 \u0645\u0646\u0641\u0635\u0644\u0629 \u062a\u064f\u062d\u0641\u0638 \u0639\u0644\u0649 \u0627\u0644\u062d\u062c\u0632 \u0648\u0644\u0627 \u062a\u064f\u0648\u0632\u0639 \u0639\u0644\u0649 \u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0644\u064a\u0627\u0644\u064a.",
			mainClientPrice:
				"السعر الليلي الظاهر للعميل أو منصة OTA لهذا التاريخ.",
			baseHotelPrice:
				"السعر الليلي الظاهر للفندق لهذا التاريخ.",
			netAfterExpenses:
				"المبلغ الليلي بعد خصم مصاريف OTA أو المصاريف الأخرى.",
			otaOtherExpenses:
				"يتم حسابه تلقائيا: سعر العميل ناقص الصافي بعد المصاريف.",
			platformMargin:
				"يتم حسابه تلقائيا: الصافي بعد المصاريف ناقص السعر الأساسي للفندق. يظهر فقط للـ SUPER ADMINS.",
			marginRate:
				"نسبة هامش المنصة من الصافي بعد المصاريف. تظهر فقط للـ SUPER ADMINS.",
		},
	},
};

const hasExplicitNumberInput = (value) =>
	value !== null &&
	value !== undefined &&
	value !== "" &&
	Number.isFinite(Number(String(value).replace(/,/g, "").trim()));

const firstExplicitNumber = (...values) => {
	for (const value of values) {
		if (hasExplicitNumberInput(value)) {
			return Number(String(value).replace(/,/g, "").trim());
		}
	}
	return null;
};

const savedClientTotalForReservation = (reservation = {}) => {
	const value = firstExplicitNumber(
		reservation?.adminPricing?.clientTotal,
		reservation?.total_amount
	);
	return value !== null ? round2(value) : 0;
};

const savedRootTotalForReservation = (reservation = {}) => {
	const value = firstExplicitNumber(
		reservation?.adminPricing?.rootTotal,
		reservation?.sub_total,
		reservation?.hotel_visible_amount
	);
	return value !== null ? round2(value) : 0;
};

const savedNetTotalForReservation = (reservation = {}) => {
	const value = firstExplicitNumber(
		reservation?.adminPricing?.netAfterExpensesTotal
	);
	return value !== null ? round2(value) : 0;
};

const savedCommissionForReservation = (reservation = {}) => {
	const value = firstExplicitNumber(
		reservation?.adminPricing?.commissionAmount,
		reservation?.financial_cycle?.commissionAmount,
		reservation?.commissionData?.commissionAmount,
		reservation?.commissionData?.amount,
		reservation?.commission
	);
	return value !== null ? round2(value) : 0;
};

const formatDate = (value, chosenLanguage = "English") =>
	formatSaudiGregorianDate(value, {
		language: chosenLanguage,
		month: "long",
		fallback: "-",
	});

const dateKey = (value) => {
	if (!value) return "";
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const stayNightsForReservation = (reservation = {}) => {
	const explicit = Number(reservation.days_of_residence || 0);
	if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
	const roomLists = [reservation.pickedRoomsType, reservation.pickedRoomsPricing].filter(
		Array.isArray
	);
	const pricingDays = Math.max(
		0,
		...roomLists.flatMap((rooms) =>
			rooms.map((room) =>
				Array.isArray(room?.pricingByDay) ? room.pricingByDay.length : 0
			)
		)
	);
	if (pricingDays > 0) return pricingDays;
	const checkin = dateKey(reservation.checkin_date);
	const checkout = dateKey(reservation.checkout_date);
	if (!checkin || !checkout) return 0;
	const [inYear, inMonth, inDay] = checkin.split("-").map(Number);
	const [outYear, outMonth, outDay] = checkout.split("-").map(Number);
	const diff =
		(Date.UTC(outYear, outMonth - 1, outDay) -
			Date.UTC(inYear, inMonth - 1, inDay)) /
		86400000;
	return Number.isFinite(diff) && diff > 0 ? Math.round(diff) : 0;
};

const normalizeDay = (day = {}) => {
	const clientPrice = round2(
		day.clientPrice ??
			day.mainPrice ??
			day.totalPriceWithCommission ??
			day.price
	);
	const explicitRootPrice = firstExplicitNumber(
		day.rootPrice,
		day.totalPriceWithoutCommission,
		day.basePrice
	);
	const rootPrice = explicitRootPrice !== null ? round2(explicitRootPrice) : 0;
	const explicitNet =
		day.netAfterExpenses ??
		day.netAfterOtaExpenses ??
		day.netAfterOtherExpenses ??
		null;
	const explicitExpense =
		day.otaExpenseAmount ?? day.otherExpenseAmount ?? day.expenseAmount ?? null;
	const netAfterExpenses =
		explicitNet !== null && explicitNet !== undefined && explicitNet !== ""
			? round2(explicitNet)
			: explicitExpense !== null &&
			  explicitExpense !== undefined &&
			  explicitExpense !== ""
			? round2(clientPrice - numberValue(explicitExpense))
			: clientPrice;
	const otaExpenseAmount = round2(clientPrice - netAfterExpenses);
	const platformMargin = round2(netAfterExpenses - rootPrice);
	const platformMarginRate =
		netAfterExpenses > 0 ? round2((platformMargin / netAfterExpenses) * 100) : 0;

	return {
		...day,
		date: dateKey(day.date || day.day || day.pricingDate),
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

const normalizeRoomsForEdit = (reservation = {}) => {
	const source = Array.isArray(reservation.pickedRoomsType)
		? reservation.pickedRoomsType
		: Array.isArray(reservation.pickedRoomsPricing)
		? reservation.pickedRoomsPricing
		: [];
	return JSON.parse(JSON.stringify(source || [])).map((room) => ({
		...room,
		count: roomCount(room),
		pricingByDay: Array.isArray(room.pricingByDay)
			? room.pricingByDay.map(normalizeDay)
			: [],
	}));
};

const distributeRoomsTotal = (rooms = [], field, totalValue) => {
	const total = numberValue(totalValue);
	const weights = [];
	rooms.forEach((room) => {
		(room.pricingByDay || []).forEach(() => {
			weights.push(roomCount(room));
		});
	});
	if (!total || !weights.length) return rooms;
	const allocation = allocateWeightedTotal(total, weights);
	let allocationIndex = 0;
	return rooms.map((room) => ({
		...room,
		pricingByDay: (room.pricingByDay || []).map((day) => {
			const perRoomNight = allocation.unitAmounts[allocationIndex++] || 0;
			if (field === "client") return recalcDay(day, { clientPrice: perRoomNight });
			if (field === "root") return recalcDay(day, { rootPrice: perRoomNight });
			return recalcDay(day, { netAfterExpenses: perRoomNight });
		}),
	}));
};

const getReservationKey = (reservation = {}) =>
	String(reservation._id || reservation.confirmation_number || "");

const otaConfirmationNumberForReservation = (reservation = {}) =>
	reservation?.supplierData?.otaConfirmationNumber ||
	reservation?.supplierData?.suppliedBookingNo ||
	reservation?.otaPlatformReview?.confirmationNumber ||
	reservation?.confirmation_number2 ||
	"-";

const formatModalDatePair = (value, language = "English") => ({
	gregorian: formatSaudiGregorianDate(value, {
		language,
		month: "short",
		fallback: "-",
	}),
	hijri: formatSaudiHijriDate(value, {
		language,
		month: "long",
		fallback: "-",
	}),
});

const mergeReservationDetailsForModal = (details = {}, listRow = {}) => {
	const customerDetails = details?.customer_details || {};
	const hotelDetails = details?.hotelId || listRow?.hotelId || {};
	return {
		...listRow,
		...details,
		hotelId: hotelDetails,
		belongsTo: details?.belongsTo || listRow?.belongsTo,
		hotel_name:
			listRow?.hotel_name || hotelDetails?.hotelName || details?.hotel_name || "",
		customer_name:
			customerDetails.name || listRow?.customer_name || details?.customer_name || "",
		customer_phone:
			customerDetails.phone ||
			listRow?.customer_phone ||
			details?.customer_phone ||
			"",
		customer_nick:
			customerDetails.nickName ||
			listRow?.customer_nick ||
			details?.customer_nick ||
			"",
		confirmation_number2:
			customerDetails.confirmation_number2 ||
			listRow?.confirmation_number2 ||
			details?.confirmation_number2 ||
			"",
	};
};

const releaseBlockedMessage = (reservation = {}) =>
	!hasAssignedHotel(reservation)
		? "Assign a hotel before releasing this OTA reservation to the hotel."
		: reservation?.hotel_base_price_issue ||
		  "Save Total base hotel price in Change pricing before releasing this reservation.";

const hasPlatformAdminRole = (user = {}) =>
	[
		Number(user?.role),
		...(Array.isArray(user?.roles) ? user.roles.map(Number) : []),
	].includes(1000);

const hasOtaReservationAdminAccess = (user = {}) =>
	SUPER_USER_IDS.includes(user?._id) ||
	(hasPlatformAdminRole(user) &&
		Array.isArray(user?.accessTo) &&
		user.accessTo.includes("OTAReservations"));

const PricingHelpLabel = ({ label, help }) => (
	<span className='pricing-help-label'>
		<span>{label}</span>
		<Tooltip
			title={help}
			trigger={["hover", "focus", "click"]}
			overlayStyle={{ maxWidth: 320 }}
		>
			<ExclamationCircleOutlined
				className='pricing-help-icon'
				tabIndex={0}
				aria-label={label}
			/>
		</Tooltip>
	</span>
);

const OtaPricingModal = ({
	open,
	reservation,
	onCancel,
	onSave,
	saving,
	roomOptionsState,
	onReloadRoomOptions,
	chosenLanguage = "English",
	canViewPlatformProfit = false,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const t = OTA_PRICING_TEXT[isArabic ? "Arabic" : "English"];
	const [rooms, setRooms] = useState([]);
	const [distributeValues, setDistributeValues] = useState({
		client: "",
		root: "",
		net: "",
	});
	const [commissionValue, setCommissionValue] = useState("");
	const initializedReservationIdRef = useRef("");
	const roomOptions = useMemo(
		() =>
			Array.isArray(roomOptionsState?.rooms) ? roomOptionsState.rooms : [],
		[roomOptionsState?.rooms],
	);
	const roomOptionsStatus = roomOptionsState?.status || "idle";

	useEffect(() => {
		if (!open) {
			initializedReservationIdRef.current = "";
			return;
		}
		if (!reservation) return;
		if (roomOptionsStatus !== "loaded") return;
		const reservationKey =
			reservation?._id || reservation?.confirmation_number || "current";
		if (initializedReservationIdRef.current === reservationKey) return;
		initializedReservationIdRef.current = reservationKey;

		const savedClientTotal = savedClientTotalForReservation(reservation);
		const savedRootTotal = savedRootTotalForReservation(reservation);
		const savedNetTotal = savedNetTotalForReservation(reservation);
		const savedCommission =
			savedCommissionForReservation(reservation) ||
			(savedRootTotal > 0 ? round2(savedRootTotal * 0.1) : 0);
		let nextRooms = autoMapOtaPricingRooms(
			normalizeRoomsForEdit(reservation),
			roomOptions,
		);
		const currentClientTotal = round2(summarizeRooms(nextRooms).clientTotal);
		if (
			savedClientTotal > 0 &&
			Math.abs(currentClientTotal - savedClientTotal) > 0.01
		) {
			nextRooms = distributeRoomsTotal(nextRooms, "client", savedClientTotal);
		}
		setRooms(nextRooms);
		setDistributeValues({
			client: savedClientTotal > 0 ? money(savedClientTotal) : "",
			root: savedRootTotal > 0 ? money(savedRootTotal) : "",
			net: savedNetTotal > 0 ? money(savedNetTotal) : "",
		});
		setCommissionValue(savedCommission > 0 ? money(savedCommission) : "");
	}, [open, reservation, roomOptions, roomOptionsStatus]);

	const totals = useMemo(() => {
		const summary = summarizeRooms(rooms);
		return {
			clientTotal: round2(summary.clientTotal),
			rootTotal: round2(summary.rootTotal),
			netAfterExpensesTotal: round2(summary.netAfterExpensesTotal),
			otaExpenseTotal: round2(summary.otaExpenseTotal),
			platformMarginTotal: round2(summary.platformMarginTotal),
			totalRooms: summary.totalRooms,
		};
	}, [rooms]);

	const flatDays = useMemo(() => {
		const days = [];
		rooms.forEach((room, roomIndex) => {
			(room.pricingByDay || []).forEach((day, dayIndex) => {
				days.push({ room, day, roomIndex, dayIndex });
			});
		});
		return days;
	}, [rooms]);

	const updateDay = (roomIndex, dayIndex, patch) => {
		setRooms((previous) =>
			previous.map((room, currentRoomIndex) => {
				if (currentRoomIndex !== roomIndex) return room;
				return {
					...room,
					pricingByDay: (room.pricingByDay || []).map((day, currentDayIndex) =>
						currentDayIndex === dayIndex ? recalcDay(day, patch) : day
					),
				};
			})
		);
	};

	const updateRoomMapping = (roomIndex, optionId) => {
		const option = roomOptions.find(
			(item) => String(item.hotelRoomConfigId || item._id || "") === optionId,
		);
		if (!option) return;
		setRooms((previous) =>
			previous.map((room, currentRoomIndex) =>
				currentRoomIndex === roomIndex
					? applyOtaRoomConfig(room, option)
					: room,
			),
		);
	};

	const copyFirstRow = () => {
		if (!flatDays.length) {
			message.warning(t.noDailyPricing);
			return;
		}
		setRooms((previous) => copyFirstOtaPricingRowValues(previous));
		message.success(t.firstRowCopied);
	};

	const distributeAllTotals = () => {
		const activeTotals = ["client", "root", "net"]
			.map((field) => ({ field, total: numberValue(distributeValues[field]) }))
			.filter((item) => item.total > 0);
		if (!activeTotals.length) {
			message.warning(t.noDistributionValues || "Enter at least one total to distribute.");
			return;
		}
		if (!flatDays.length) return;
		setRooms((previous) =>
			activeTotals.reduce(
				(nextRooms, item) =>
					distributeRoomsTotal(nextRooms, item.field, item.total),
				previous,
			),
		);
		message.success(t.distributeAll || t.distribute);
	};

	const handleSave = () => {
		if (saving) return;
		if (roomOptionsStatus !== "loaded") {
			message.error(
				roomOptionsState?.error || t.roomOptionsFailed,
			);
			return;
		}
		const unmappedRoomIndex = rooms.findIndex(
			(room) => !hasCurrentOtaRoomMapping(room, roomOptions),
		);
		if (unmappedRoomIndex >= 0) {
			message.error(t.roomMappingRequired(unmappedRoomIndex));
			return;
		}
		const invalidDailyPricing = flatDays.some(({ day }) => {
			const client = numberValue(day.clientPrice);
			const root = numberValue(day.rootPrice);
			const net = numberValue(day.netAfterExpenses);
			return client <= 0 || root < 0 || net < 0 || net - client > 0.009;
		});
		if (!flatDays.length || invalidDailyPricing) {
			message.error(t.invalidDailyPricing || t.noDailyPricing);
			return;
		}
		const payload = {
			allowOtaClientTotalOverride: true,
			pickedRoomsType: rooms,
			pickedRoomsPricing: rooms,
			total_rooms: totals.totalRooms,
			total_amount: totals.clientTotal,
			sub_total: totals.rootTotal,
			commission: round2(commissionValue),
			adminPricing: {
				mode: "ota_review",
				clientTotal: totals.clientTotal,
				rootTotal: totals.rootTotal,
				netAfterExpensesTotal: totals.netAfterExpensesTotal,
				otaExpenseTotal: totals.otaExpenseTotal,
				platformMarginTotal: totals.platformMarginTotal,
				commissionAmount: round2(commissionValue),
			},
		};
		onSave(payload);
	};

	const checkinDate = formatModalDatePair(
		reservation?.checkin_date,
		chosenLanguage
	);
	const checkoutDate = formatModalDatePair(
		reservation?.checkout_date,
		chosenLanguage
	);
	const stayNights = stayNightsForReservation(reservation);

	return (
		<Modal
			open={open}
			onCancel={onCancel}
			width='min(96vw, 1480px)'
			centered={false}
			zIndex={26000}
			wrapClassName='ota-pricing-modal-wrap'
			rootClassName='ota-pricing-modal-root'
			style={{ top: 94, paddingBottom: 24 }}
			destroyOnClose
			title={<span dir={isArabic ? "rtl" : "ltr"}>{t.title}</span>}
			styles={{
				mask: { zIndex: 25990 },
				body: {
					maxHeight: "calc(100vh - 190px)",
					overflowY: "auto",
					paddingInlineEnd: 4,
				},
			}}
			footer={[
				<Button key='cancel' onClick={onCancel}>
					{t.cancel}
				</Button>,
				<Button
					key='copy-first-row'
					type='dashed'
					disabled={saving || flatDays.length < 2}
					onClick={copyFirstRow}
				>
					{t.copyFirstRow}
				</Button>,
				<Button key='save' type='primary' loading={saving} onClick={handleSave}>
					{t.save}
				</Button>,
			]}
		>
			<PricingModalContent
				dir={isArabic ? "rtl" : "ltr"}
				className={isArabic ? "is-arabic" : ""}
			>
				<PricingContextGrid>
					<PricingContextItem>
						<span>{t.context.confirmationNumber}</span>
						<strong>{reservation?.confirmation_number || "-"}</strong>
					</PricingContextItem>
					<PricingContextItem>
						<span>{t.context.otaConfirmationNumber}</span>
						<strong>{otaConfirmationNumberForReservation(reservation)}</strong>
					</PricingContextItem>
					<PricingContextItem>
						<span>{t.context.hotelName}</span>
						<strong>{reservation?.hotel_name || reservation?.hotelId?.hotelName || "-"}</strong>
					</PricingContextItem>
					<PricingContextItem>
						<span>{t.context.checkIn}</span>
						<strong>{checkinDate.gregorian}</strong>
						<small>{checkinDate.hijri}</small>
					</PricingContextItem>
					<PricingContextItem>
						<span>{t.context.checkOut}</span>
						<strong>{checkoutDate.gregorian}</strong>
						<small>{checkoutDate.hijri}</small>
					</PricingContextItem>
					<PricingContextItem>
						<span>{t.context.nights}</span>
						<strong>{stayNights || "-"}</strong>
					</PricingContextItem>
				</PricingContextGrid>
				<RoomMappingPanel>
					<div className='room-mapping-heading'>
						<div>
							<strong>{t.mappingTitle}</strong>
							<span>{t.mappingHelp}</span>
						</div>
						{roomOptionsStatus === "loading" || roomOptionsStatus === "idle" ? (
							<Spin size='small' />
						) : null}
					</div>
					{roomOptionsStatus === "loading" || roomOptionsStatus === "idle" ? (
						<div className='room-mapping-status'>{t.roomOptionsLoading}</div>
					) : roomOptionsStatus === "error" ? (
						<div className='room-mapping-status is-error'>
							<span>{roomOptionsState?.error || t.roomOptionsFailed}</span>
							<Button size='small' onClick={onReloadRoomOptions}>
								{t.retry}
							</Button>
						</div>
					) : rooms.length ? (
						<div className='room-mapping-list'>
							{rooms.map((room, roomIndex) => (
								<div
									className='room-mapping-row'
									key={`room-mapping-${roomIndex}`}
								>
									<div className='room-mapping-label'>
										<strong>
											{t.roomLine} {roomIndex + 1}
										</strong>
										<span>{t.roomUnits(roomCount(room))}</span>
										<small>
											{room.sourceRoomName ||
												reservation?.otaPlatformReview?.otaRoomName ||
												reservation?.supplierData?.otaRoomName ||
												room.displayName ||
												room.room_type ||
												"-"}
										</small>
									</div>
									<Select
										showSearch
										optionFilterProp='label'
										getPopupContainer={() => document.body}
										dropdownStyle={{ zIndex: 26020 }}
										placeholder={t.selectPmsRoom}
										value={otaRoomConfigId(room) || undefined}
										onChange={(value) =>
											updateRoomMapping(roomIndex, value)
										}
										options={roomOptions.map((option) => ({
											value: String(option.hotelRoomConfigId || option._id || ""),
											label: `${option.displayName || option.room_type || "Room"} (${option.room_type || "-"})`,
										}))}
									/>
								</div>
							))}
						</div>
					) : (
						<div className='room-mapping-status is-error'>
							{t.roomOptionsFailed}
						</div>
					)}
				</RoomMappingPanel>
				<PricingSummaryRows $isArabic={isArabic}>
					<div className='pricing-summary-fields'>
						<PricingSummaryRow>
							<strong>
								<PricingHelpLabel
									label={t.labels.totalClientPrice}
									help={t.help.totalClientPrice}
								/>
							</strong>
							<Input value={money(totals.clientTotal)} readOnly />
							<Input
								placeholder={t.savedTotalPlaceholder}
								value={distributeValues.client}
								onChange={(event) =>
									setDistributeValues((prev) => ({
										...prev,
										client: event.target.value,
									}))
								}
							/>
						</PricingSummaryRow>
						<PricingSummaryRow>
							<strong>
								<PricingHelpLabel
									label={t.labels.totalBaseHotelPrice}
									help={t.help.totalBaseHotelPrice}
								/>
							</strong>
							<Input value={money(totals.rootTotal)} readOnly />
							<Input
								placeholder={t.enterTotalPlaceholder}
								value={distributeValues.root}
								onChange={(event) =>
									setDistributeValues((prev) => ({
										...prev,
										root: event.target.value,
									}))
								}
							/>
						</PricingSummaryRow>
						<PricingSummaryRow>
							<strong>
								<PricingHelpLabel
									label={t.labels.netAfterOtaExpenses}
									help={t.help.netAfterOtaExpenses}
								/>
							</strong>
							<Input value={money(totals.netAfterExpensesTotal)} readOnly />
							<Input
								placeholder={t.enterTotalPlaceholder}
								value={distributeValues.net}
								onChange={(event) =>
									setDistributeValues((prev) => ({
										...prev,
										net: event.target.value,
									}))
								}
							/>
						</PricingSummaryRow>
						<PricingSummaryRow>
							<strong>
								<PricingHelpLabel
									label={t.labels.generalCommission || "General commission"}
									help={
										t.help.generalCommission ||
										"Separate PMS commission saved on the reservation."
									}
								/>
							</strong>
							<Input value={money(commissionValue)} readOnly />
							<Input
								placeholder={
									t.generalCommissionPlaceholder || "Enter general commission"
								}
								value={commissionValue}
								onChange={(event) => setCommissionValue(event.target.value)}
							/>
						</PricingSummaryRow>
					</div>
					<Button
						type='primary'
						className='pricing-distribute-all'
						onClick={distributeAllTotals}
					>
						{t.distributeAll || t.distribute}
					</Button>
				</PricingSummaryRows>

				<PricingTableWrap>
					<table>
						<thead>
							<tr>
								<th>{t.labels.date}</th>
								<th>
									<PricingHelpLabel
										label={t.labels.mainClientPrice}
										help={t.help.mainClientPrice}
									/>
								</th>
								<th>
									<PricingHelpLabel
										label={t.labels.baseHotelPrice}
										help={t.help.baseHotelPrice}
									/>
								</th>
								<th>
									<PricingHelpLabel
										label={t.labels.netAfterExpenses}
										help={t.help.netAfterExpenses}
									/>
								</th>
								<th>
									<PricingHelpLabel
										label={t.labels.otaOtherExpenses}
										help={t.help.otaOtherExpenses}
									/>
								</th>
								{canViewPlatformProfit ? (
									<>
										<th>
											<PricingHelpLabel
												label={t.labels.platformMargin}
												help={t.help.platformMargin}
											/>
										</th>
										<th>
											<PricingHelpLabel
												label={t.labels.marginRate}
												help={t.help.marginRate}
											/>
										</th>
									</>
								) : null}
							</tr>
						</thead>
						<tbody>
							{flatDays.length ? (
								flatDays.map(({ room, day, roomIndex, dayIndex }) => (
									<tr
										key={`${roomIndex}-${dayIndex}-${day.date || "day"}`}
									>
										<td>
											<strong>{day.date || "-"}</strong>
											<span>{room.displayName || room.room_type || "Room"}</span>
										</td>
										<td>
											<Input
												type='number'
												value={day.clientPrice}
												onChange={(event) =>
													updateDay(roomIndex, dayIndex, {
														clientPrice: event.target.value,
													})
												}
											/>
										</td>
										<td>
											<Input
												type='number'
												value={day.rootPrice}
												onChange={(event) =>
													updateDay(roomIndex, dayIndex, {
														rootPrice: event.target.value,
													})
												}
											/>
										</td>
										<td>
											<Input
												type='number'
												value={day.netAfterExpenses}
												onChange={(event) =>
													updateDay(roomIndex, dayIndex, {
														netAfterExpenses: event.target.value,
													})
												}
											/>
										</td>
										<td>{money(day.otaExpenseAmount)}</td>
										{canViewPlatformProfit ? (
											<>
												<td>{money(day.platformMargin)}</td>
												<td>{money(day.platformMarginRate)}%</td>
											</>
										) : null}
									</tr>
								))
							) : (
								<tr>
									<td colSpan={canViewPlatformProfit ? 7 : 5}>
										{t.noDailyPricing}
									</td>
								</tr>
							)}
						</tbody>
						<tfoot>
							<tr>
								<th>{t.labels.total}</th>
								<th>{money(totals.clientTotal)}</th>
								<th>{money(totals.rootTotal)}</th>
								<th>{money(totals.netAfterExpensesTotal)}</th>
								<th>{money(totals.otaExpenseTotal)}</th>
								{canViewPlatformProfit ? (
									<>
										<th>{money(totals.platformMarginTotal)}</th>
										<th />
									</>
								) : null}
							</tr>
						</tfoot>
					</table>
				</PricingTableWrap>
			</PricingModalContent>
		</Modal>
	);
};

const OtaReservationsMain = ({ chosenLanguage }) => {
	const history = useHistory();
	const location = useLocation();
	const [adminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [getUser, setGetUser] = useState(null);
	const [loading, setLoading] = useState(false);
	const [detailsLoading, setDetailsLoading] = useState(false);
	const [detailsReservation, setDetailsReservation] = useState(null);
	const [savingPricing, setSavingPricing] = useState(false);
	const [pricingRoomOptionsState, setPricingRoomOptionsState] = useState({
		status: "idle",
		rooms: [],
		error: "",
	});
	const [pricingRoomOptionsRetry, setPricingRoomOptionsRetry] = useState(0);
	const [releasing, setReleasing] = useState(false);
	const [assigningHotel, setAssigningHotel] = useState(false);
	const [hotelsLoading, setHotelsLoading] = useState(false);
	const [assignableHotels, setAssignableHotels] = useState([]);
	const [hotelAssignReservation, setHotelAssignReservation] = useState(null);
	const [selectedAssignHotelId, setSelectedAssignHotelId] = useState("");
	const [dataState, setDataState] = useState({
		data: [],
		totalDocuments: 0,
		scorecards: {},
	});
	const auth = isAuthenticated() || {};
	const { user: authUser, token } = auth;

	const params = useMemo(
		() => new URLSearchParams(location.search || ""),
		[location.search]
	);
	const currentPage = Math.max(parseInt(params.get("page"), 10) || 1, 1);
	const searchTerm = params.get("search") || "";
	const detailsReservationId = params.get("reservationId") || "";
	const pricingReservationId = params.get("pricingReservationId") || "";
	const releaseReservationId = params.get("releaseReservationId") || "";
	const pageSize = 20;

	const hasOtaAccess = hasOtaReservationAdminAccess(getUser);
	const canViewPlatformProfit = SUPER_USER_IDS.includes(
		String(getUser?._id || authUser?._id || "")
	);

	const replaceQuery = useCallback(
		(updates = {}) => {
			const next = new URLSearchParams(location.search || "");
			Object.entries(updates).forEach(([key, value]) => {
				if (value === undefined || value === null || value === "") {
					next.delete(key);
				} else {
					next.set(key, String(value));
				}
			});
			const search = next.toString();
			history.replace({
				pathname: location.pathname,
				search: search ? `?${search}` : "",
			});
		},
		[history, location.pathname, location.search]
	);

	useEffect(() => {
		if (!authUser?._id || !token) return;
		readUserId(authUser._id, token).then((userData) => {
			if (userData && !userData.error) setGetUser(userData);
		});
		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [authUser?._id, token]);

	useEffect(() => {
		if (!getUser) return;
		if (!getUser.activeUser || !hasOtaAccess) {
			history.push("/");
		}
	}, [getUser, hasOtaAccess, history]);

	const loadReservations = useCallback(
		async ({ silent = false } = {}) => {
			if (!getUser?._id || !token || !hasOtaAccess) return;
			if (!silent) setLoading(true);
			const response = await getOtaReservationsForAdmin(getUser._id, token, {
				page: currentPage,
				limit: pageSize,
				searchQuery: searchTerm,
			});
			if (response?.success) {
				setDataState({
					data: Array.isArray(response.data) ? response.data : [],
					totalDocuments: Number(response.totalDocuments || 0),
					scorecards: response.scorecards || {},
				});
			} else {
				message.error(response?.message || response?.error || "Could not load OTA reservations");
				setDataState({ data: [], totalDocuments: 0, scorecards: {} });
			}
			if (!silent) setLoading(false);
		},
		[getUser?._id, hasOtaAccess, token, currentPage, searchTerm]
	);

	useEffect(() => {
		loadReservations();
	}, [loadReservations]);

	const reservations = dataState.data || [];
	const selectedPricingReservation = reservations.find(
		(reservation) => getReservationKey(reservation) === pricingReservationId
	);
	const selectedPricingReservationKey = selectedPricingReservation
		? getReservationKey(selectedPricingReservation)
		: "";
	const selectedReleaseReservation = reservations.find(
		(reservation) => getReservationKey(reservation) === releaseReservationId
	);
	const selectedDetailsListRow = reservations.find(
		(reservation) => getReservationKey(reservation) === detailsReservationId
	);
	const selectedDetailsReservation = detailsReservation
		? mergeReservationDetailsForModal(detailsReservation, selectedDetailsListRow)
		: null;
	const hotelOptions = useMemo(
		() =>
			(assignableHotels || []).map((hotel) => {
				const otherName = hotel.hotelNameOtherLanguage
					? ` - ${titleCaseText(hotel.hotelNameOtherLanguage)}`
					: "";
				return {
					value: hotel._id,
					label: `${titleCaseText(hotel.hotelName) || "Unnamed hotel"}${otherName}`,
				};
			}),
		[assignableHotels]
	);
	const totalPages = Math.max(
		Math.ceil(Number(dataState.totalDocuments || 0) / pageSize),
		1
	);

	useEffect(() => {
		let cancelled = false;
		if (
			!pricingReservationId ||
			!selectedPricingReservationKey ||
			!getUser?._id ||
			!token
		) {
			setPricingRoomOptionsState({ status: "idle", rooms: [], error: "" });
			return () => {
				cancelled = true;
			};
		}

		setPricingRoomOptionsState({ status: "loading", rooms: [], error: "" });
		getOtaReservationRoomOptions(
			selectedPricingReservationKey,
			getUser._id,
			token,
		).then((response) => {
			if (cancelled) return;
			if (response?.success) {
				setPricingRoomOptionsState({
					status: "loaded",
					rooms: Array.isArray(response.rooms) ? response.rooms : [],
					error: "",
				});
				return;
			}
			setPricingRoomOptionsState({
				status: "error",
				rooms: [],
				error:
					response?.message ||
					response?.error ||
					"Could not load active PMS rooms for this reservation.",
			});
		});
		return () => {
			cancelled = true;
		};
	}, [
		pricingReservationId,
		selectedPricingReservationKey,
		getUser?._id,
		token,
		pricingRoomOptionsRetry,
	]);

	const openPricing = (reservation) =>
		replaceQuery({ pricingReservationId: getReservationKey(reservation) });
	const closePricing = () => replaceQuery({ pricingReservationId: "" });
	const openRelease = (reservation) => {
		if (!isReleaseReady(reservation)) {
			message.warning(releaseBlockedMessage(reservation));
			return;
		}
		replaceQuery({ releaseReservationId: getReservationKey(reservation) });
	};
	const closeRelease = () => replaceQuery({ releaseReservationId: "" });
	const openDetails = (reservation) =>
		replaceQuery({ reservationId: getReservationKey(reservation) });
	const closeDetails = () => {
		setDetailsReservation(null);
		replaceQuery({ reservationId: "" });
	};

	const loadAssignableHotels = useCallback(async () => {
		if (!getUser?._id || !token || !hasOtaAccess) return;
		setHotelsLoading(true);
		const response = await getOtaAssignableHotels(getUser._id, token);
		setHotelsLoading(false);
		if (response?.success) {
			setAssignableHotels(Array.isArray(response.hotels) ? response.hotels : []);
			return;
		}
		message.error(response?.message || response?.error || "Could not load hotels");
	}, [getUser?._id, hasOtaAccess, token]);

	const openHotelAssignment = (reservation) => {
		setHotelAssignReservation(reservation);
		setSelectedAssignHotelId(assignedHotelIdForReservation(reservation));
		if (!assignableHotels.length) loadAssignableHotels();
	};
	const closeHotelAssignment = () => {
		setHotelAssignReservation(null);
		setSelectedAssignHotelId("");
	};

	useEffect(() => {
		let cancelled = false;
		if (!detailsReservationId) {
			setDetailsReservation(null);
			setDetailsLoading(false);
			return () => {
				cancelled = true;
			};
		}
		if (!token) return () => {
			cancelled = true;
		};
		setDetailsLoading(true);
		setDetailsReservation(null);
		getAdminReservationById(detailsReservationId, token).then((response) => {
			if (cancelled) return;
			setDetailsLoading(false);
			if (response?._id) {
				setDetailsReservation(response);
				return;
			}
			message.error(
				response?.message || response?.error || "Could not load reservation details"
			);
		});
		return () => {
			cancelled = true;
		};
	}, [detailsReservationId, token]);

	const handleReservationUpdated = (updated) => {
		if (!updated) return;
		const updatedKey = getReservationKey(updated);
		setDetailsReservation((previous) =>
			previous && getReservationKey(previous) === updatedKey
				? { ...previous, ...updated }
				: previous
		);
		setDataState((previous) => ({
			...previous,
			data: (previous.data || []).map((reservation) =>
				getReservationKey(reservation) === updatedKey
					? {
							...reservation,
							...updated,
							hotelId: updated.hotelId || reservation.hotelId,
							belongsTo: updated.belongsTo || reservation.belongsTo,
					  }
					: reservation
			),
		}));
	};

	const handlePricingSave = async (payload) => {
		if (!selectedPricingReservation || !getUser?._id) return;
		setSavingPricing(true);
		let response;
		try {
			response = await updateOtaReservationPricing(
				getReservationKey(selectedPricingReservation),
				getUser._id,
				token,
				payload
			);
		} catch (error) {
			response = {
				success: false,
				error: error?.message || "Pricing update failed",
			};
		} finally {
			setSavingPricing(false);
		}
		if (!response?.success) {
			message.error(response?.message || response?.error || "Pricing update failed");
			return;
		}
		handleReservationUpdated(response.data);
		message.success("OTA reservation pricing was updated.");
		closePricing();
		loadReservations({ silent: true });
	};

	const handleRelease = async () => {
		if (!selectedReleaseReservation || !getUser?._id) return;
		if (!isReleaseReady(selectedReleaseReservation)) {
			message.error(releaseBlockedMessage(selectedReleaseReservation));
			return;
		}
		setReleasing(true);
		const response = await releaseOtaReservationToHotel(
			getReservationKey(selectedReleaseReservation),
			getUser._id,
			token,
			isZeroHotelBasePriceRelease(selectedReleaseReservation)
				? {
						allowZeroHotelBasePrice: true,
						zeroHotelBasePriceReason:
							"Authorized platform confirmation to release the reservation to the hotel at SAR 0.00.",
				  }
				: {},
		);
		setReleasing(false);
		if (!response?.success) {
			message.error(response?.message || response?.error || "Release failed");
			return;
		}
		message.success("OTA reservation was released to the hotel.");
		closeRelease();
		loadReservations({ silent: true });
	};

	const handleAssignHotel = async () => {
		if (!hotelAssignReservation || !getUser?._id) return;
		if (!selectedAssignHotelId) {
			message.warning("Choose a hotel before saving.");
			return;
		}
		setAssigningHotel(true);
		const response = await assignOtaReservationHotel(
			getReservationKey(hotelAssignReservation),
			getUser._id,
			token,
			{ hotelId: selectedAssignHotelId }
		);
		setAssigningHotel(false);
		if (!response?.success) {
			message.error(response?.message || response?.error || "Hotel assignment failed");
			return;
		}
		handleReservationUpdated(response.data);
		message.success("Hotel was assigned to the OTA reservation.");
		closeHotelAssignment();
		loadReservations({ silent: true });
	};

	const handleSearch = (value) => {
		replaceQuery({ search: value.trim(), page: 1 });
	};

	return (
		<OtaPageWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='OTAReservations'
							AdminMenuStatus={adminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
						/>
					) : (
						<AdminNavbar
							fromPage='OTAReservations'
							AdminMenuStatus={adminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
						/>
					)}
				</div>
				<main className='otherContentWrapper'>
					<QueueSurface>
						<QueueHeader>
							<div>
								<h1>OTA Reservations</h1>
								<p>Pending platform review before release to hotels.</p>
							</div>
							<Button
								icon={<ReloadOutlined />}
								onClick={() => loadReservations()}
								loading={loading}
							>
								Refresh
							</Button>
						</QueueHeader>

						<StatsGrid>
							<StatTile>
								<span>Pending OTA</span>
								<strong>{dataState.scorecards.pendingOta || dataState.totalDocuments}</strong>
							</StatTile>
							<StatTile>
								<span>Client total</span>
								<strong>{money(dataState.scorecards.totalClientAmount)} SAR</strong>
							</StatTile>
							<StatTile>
								<span>Hotel total</span>
								<strong>{money(dataState.scorecards.totalHotelAmount)} SAR</strong>
							</StatTile>
							<StatTile>
								<span>Virtual cards</span>
								<strong>{dataState.scorecards.virtualCards || 0}</strong>
							</StatTile>
						</StatsGrid>

						<SearchRow>
							<Input.Search
								allowClear
								defaultValue={searchTerm}
								enterButton={<SearchOutlined />}
								placeholder='Search confirmation, guest, phone, hotel, or source'
								onSearch={handleSearch}
							/>
						</SearchRow>

						{loading ? (
							<LoadingBlock>
								<Spin />
							</LoadingBlock>
						) : (
							<TableWrap>
								<table>
									<thead>
										<tr>
											<th>#</th>
											<th>Hotel</th>
											<th>Confirmation</th>
											<th>Guest</th>
											<th>Source</th>
											<th>Status</th>
											<th>Booked</th>
											<th>Check In</th>
											<th>Check Out</th>
											<th>Nights</th>
											<th>Client Total</th>
											<th>Hotel Amount</th>
											<th>Change Pricing</th>
											<th>Show Details</th>
											<th>Release To Hotel</th>
										</tr>
									</thead>
									<tbody>
										{reservations.length ? (
											reservations.map((reservation, index) => {
												const rawAssignedHotelName =
													reservation.hotel_name ||
													reservation.hotelId?.hotelName ||
													"";
												const assignedHotelName =
													titleCaseText(rawAssignedHotelName);
												const otaHotelHint =
													reservation.ota_hotel_name ||
													reservation.supplierData?.otaHotelName ||
													"";
												const displayOtaHotelHint = titleCaseText(otaHotelHint);
												const hotelTooltip = assignedHotelName
													? displayOtaHotelHint
														? `${assignedHotelName} | OTA: ${displayOtaHotelHint}`
														: assignedHotelName
													: displayOtaHotelHint
													? `OTA hint: ${displayOtaHotelHint}`
													: "Assign hotel";
												return (
													<tr key={getReservationKey(reservation)}>
													<td>{(currentPage - 1) * pageSize + index + 1}</td>
													<td>
														<Tooltip title={hotelTooltip}>
															<HotelAssignButton
																type='button'
																className={assignedHotelName ? "" : "missing"}
																onClick={() => openHotelAssignment(reservation)}
															>
																<span className='truncate'>
																	{assignedHotelName || "Assign hotel"}
																</span>
																{!assignedHotelName && otaHotelHint ? (
																	<small className='truncate'>OTA: {displayOtaHotelHint}</small>
																) : null}
															</HotelAssignButton>
														</Tooltip>
													</td>
													<td>
														<Tooltip
															title={
																reservation.confirmation_number
																	? `PMS: ${reservation.confirmation_number}`
																	: ""
															}
														>
															<span>{otaConfirmationNumberForReservation(reservation)}</span>
														</Tooltip>
													</td>
													<td>
														<Tooltip title={reservation.customer_name}>
															<span className='truncate'>{reservation.customer_name || "-"}</span>
														</Tooltip>
													</td>
													<td>{reservation.booking_source || "-"}</td>
													<td>
														<StatusPill>{reservation.reservation_status || "ota review"}</StatusPill>
													</td>
											<td>
												{formatDate(
													reservation.booked_at || reservation.createdAt,
													chosenLanguage,
												)}
											</td>
											<td>{formatDate(reservation.checkin_date, chosenLanguage)}</td>
											<td>{formatDate(reservation.checkout_date, chosenLanguage)}</td>
													<td>{reservation.days_of_residence || "-"}</td>
													<td>{money(reservation.total_amount)} SAR</td>
													<td>
														<strong>{money(reservation.hotel_visible_amount)} SAR</strong>
													</td>
													<td>
														<ActionButton type='button' onClick={() => openPricing(reservation)}>
															<EditOutlined /> Change pricing
														</ActionButton>
													</td>
													<td>
														<ActionButton type='button' onClick={() => openDetails(reservation)}>
															<EyeOutlined /> Show Details
														</ActionButton>
													</td>
													<td>
														<Tooltip
															title={
																isReleaseReady(reservation)
																	? "Release to hotel"
																	: releaseBlockedMessage(reservation)
															}
														>
															<ReleaseButton
																type='button'
																disabled={!isReleaseReady(reservation)}
																onClick={() => openRelease(reservation)}
															>
																<CheckCircleOutlined /> Release To Hotel
															</ReleaseButton>
														</Tooltip>
													</td>
													</tr>
												);
											})
										) : (
											<tr>
												<td colSpan='15'>No pending OTA reservations.</td>
											</tr>
										)}
									</tbody>
								</table>
							</TableWrap>
						)}

						<PaginationRow>
							<Button
								disabled={currentPage <= 1}
								onClick={() => replaceQuery({ page: currentPage - 1 })}
							>
								Prev
							</Button>
							<span>
								Page {currentPage} of {totalPages}
							</span>
							<Button
								disabled={currentPage >= totalPages}
								onClick={() => replaceQuery({ page: currentPage + 1 })}
							>
								Next
							</Button>
						</PaginationRow>
					</QueueSurface>
				</main>
			</div>

			<OtaPricingModal
				open={!!pricingReservationId && !!selectedPricingReservation}
				reservation={selectedPricingReservation}
				onCancel={closePricing}
				onSave={handlePricingSave}
				saving={savingPricing}
				roomOptionsState={pricingRoomOptionsState}
				onReloadRoomOptions={() =>
					setPricingRoomOptionsRetry((current) => current + 1)
				}
				chosenLanguage={chosenLanguage}
				canViewPlatformProfit={canViewPlatformProfit}
			/>

			<Modal
				open={!!detailsReservationId}
				onCancel={closeDetails}
				width='min(98vw, 1720px)'
				centered
				className='admin-reservation-details-modal reservation-details-modal'
				rootClassName='admin-reservation-details-layer'
				wrapClassName='admin-reservation-details-wrap'
				footer={null}
				destroyOnClose
				zIndex={12000}
				styles={{
					mask: { zIndex: 11999 },
					header: { display: "none" },
					content: { padding: "6px 8px 8px" },
					body: {
						maxHeight: "92vh",
						overflowY: "auto",
						padding: "0",
					},
				}}
			>
				{detailsLoading ? (
					<LoadingBlock>
						<Spin />
					</LoadingBlock>
				) : selectedDetailsReservation ? (
					<MoreDetails
						key={getReservationKey(selectedDetailsReservation)}
						selectedReservation={selectedDetailsReservation}
						hotelDetails={selectedDetailsReservation.hotelId}
						reservation={selectedDetailsReservation}
						setReservation={handleReservationUpdated}
						onReservationUpdated={handleReservationUpdated}
					/>
				) : (
					<BasePriceWarning>
						<strong>Reservation details could not be loaded.</strong>
						<span>Please close this modal and try again.</span>
					</BasePriceWarning>
				)}
			</Modal>

			<Modal
				open={!!hotelAssignReservation}
				onCancel={closeHotelAssignment}
				title='Assign hotel'
				okText='Save hotel'
				cancelText='Cancel'
				confirmLoading={assigningHotel}
				okButtonProps={{
					disabled: !selectedAssignHotelId,
				}}
				onOk={handleAssignHotel}
				centered
				destroyOnClose
			>
				<HotelAssignmentModalBody>
					<label htmlFor='ota-hotel-assignment-select'>Hotel</label>
					<Select
						id='ota-hotel-assignment-select'
						showSearch
						allowClear
						value={selectedAssignHotelId || undefined}
						placeholder='Search and choose a hotel'
						loading={hotelsLoading}
						options={hotelOptions}
						optionFilterProp='label'
						filterOption={(input, option) =>
							String(option?.label || "")
								.toLowerCase()
								.includes(String(input || "").toLowerCase())
						}
						onDropdownVisibleChange={(open) => {
							if (open && !assignableHotels.length && !hotelsLoading) {
								loadAssignableHotels();
							}
						}}
						onChange={(value) => setSelectedAssignHotelId(value || "")}
						notFoundContent={hotelsLoading ? <Spin size='small' /> : "No hotels found"}
					/>
					{hotelAssignReservation?.ota_hotel_name ||
					hotelAssignReservation?.supplierData?.otaHotelName ? (
						<p>
							OTA hotel hint:{" "}
							<strong>
								{hotelAssignReservation?.ota_hotel_name ||
									hotelAssignReservation?.supplierData?.otaHotelName}
							</strong>
						</p>
					) : null}
				</HotelAssignmentModalBody>
			</Modal>

			<Modal
				open={!!releaseReservationId && !!selectedReleaseReservation}
				onCancel={closeRelease}
				title='Release OTA reservation to hotel'
				okText='Yes, release'
				cancelText='No'
				confirmLoading={releasing}
				okButtonProps={{
					disabled: !isReleaseReady(selectedReleaseReservation),
				}}
				onOk={handleRelease}
				centered
			>
				{isZeroHotelBasePriceRelease(selectedReleaseReservation) ? (
					<BasePriceWarning>
						<strong>Confirm zero-price release.</strong>
						<span>
							This reservation will be released to the hotel at <b>SAR 0.00</b>.
							 The authorization and zero amount will be recorded in the reservation
							 audit history.
						</span>
					</BasePriceWarning>
				) : isReleaseReady(selectedReleaseReservation) ? (
					<>
						<p>
							Are you sure you want to release this reservation to the hotel for{" "}
							<strong>
								{money(selectedReleaseReservation?.hotel_visible_amount)} SAR
							</strong>
							?
						</p>
						<p>The hotel will then see it as Pending Confirmation.</p>
					</>
				) : (
					<BasePriceWarning>
						<strong>Release is locked.</strong>
						<span>{releaseBlockedMessage(selectedReleaseReservation)}</span>
					</BasePriceWarning>
				)}
			</Modal>
		</OtaPageWrapper>
	);
};

export default OtaReservationsMain;

const OtaPageWrapper = styled.div`
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => {
			const nav = props.show ? "70px" : "285px";
			return props.dir === "rtl" ? `1fr ${nav}` : `${nav} 1fr`;
		}};
		grid-template-areas: ${(props) =>
			props.dir === "rtl" ? "'content nav'" : "'nav content'"};
	}

	.navcontent {
		grid-area: nav;
	}

	.otherContentWrapper {
		grid-area: content;
		min-width: 0;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "nav" "content";
		}
	}
`;

const QueueSurface = styled.section`
	margin: 20px 10px;
	padding: 18px;
	background: #ffffff;
	border: 1px solid #d9e2ec;
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
`;

const QueueHeader = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 16px;

	h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 800;
		color: #102033;
	}

	p {
		margin: 4px 0 0;
		color: #64748b;
	}
`;

const StatsGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(160px, 1fr));
	gap: 10px;
	margin-bottom: 14px;

	@media (max-width: 900px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
`;

const StatTile = styled.div`
	border: 1px solid #dbeafe;
	border-radius: 8px;
	padding: 12px;
	background: #f8fafc;

	span {
		display: block;
		font-size: 12px;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
	}

	strong {
		display: block;
		margin-top: 4px;
		font-size: 18px;
		color: #0f172a;
	}
`;

const SearchRow = styled.div`
	max-width: 560px;
	margin-bottom: 14px;
`;

const LoadingBlock = styled.div`
	min-height: 240px;
	display: flex;
	align-items: center;
	justify-content: center;
`;

const TableWrap = styled.div`
	overflow-x: auto;
	border: 1px solid #e2e8f0;
	border-radius: 8px;

	table {
		width: 100%;
		min-width: 1280px;
		border-collapse: collapse;
	}

	th {
		background: #102033;
		color: #ffffff;
		font-size: 12px;
		font-weight: 800;
		padding: 11px 10px;
		white-space: nowrap;
	}

	td {
		border-top: 1px solid #e2e8f0;
		padding: 10px;
		font-size: 12px;
		color: #1f2937;
		vertical-align: middle;
		white-space: nowrap;
	}

	.truncate {
		display: inline-block;
		max-width: 170px;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: bottom;
	}
`;

const StatusPill = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 94px;
	height: 26px;
	padding: 0 10px;
	border-radius: 999px;
	background: #fff7ed;
	color: #9a3412;
	font-weight: 800;
`;

const ActionButton = styled.button`
	border: 0;
	background: transparent;
	color: #1d4ed8;
	font-weight: 800;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: 5px;
`;

const HotelAssignButton = styled.button`
	border: 0;
	background: transparent;
	color: #0f172a;
	font-weight: 800;
	cursor: pointer;
	display: inline-grid;
	gap: 2px;
	max-width: 190px;
	padding: 0;
	text-align: start;

	&.missing {
		color: #b45309;
	}

	small {
		color: #64748b;
		font-size: 11px;
		font-weight: 700;
	}
`;

const ReleaseButton = styled(ActionButton)`
	color: #047857;

	&:disabled {
		color: #94a3b8;
		cursor: not-allowed;
	}
`;

const PaginationRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin-top: 16px;
`;

const HotelAssignmentModalBody = styled.div`
	display: grid;
	gap: 10px;

	label {
		font-size: 13px;
		font-weight: 800;
		color: #102033;
	}

	.ant-select {
		width: 100%;
	}

	p {
		margin: 4px 0 0;
		color: #475569;
		font-size: 13px;
	}
`;

const PricingModalContent = styled.div`
	display: grid;
	gap: 14px;

	&.is-arabic {
		font-family: "Droid Arabic Kufi", "Tajawal", "Cairo", "Noto Kufi Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
		text-align: right;
	}

	.pricing-help-label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-width: 0;
	}

	.pricing-help-icon {
		color: #38bdf8;
		cursor: help;
		font-size: 13px;
		flex: 0 0 auto;
	}
`;

const PricingContextGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(6, minmax(0, 1fr));
	gap: 8px;
	padding: 10px;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	background: #ffffff;

	@media (max-width: 1100px) {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	@media (max-width: 720px) {
		grid-template-columns: 1fr;
	}
`;

const PricingContextItem = styled.div`
	min-width: 0;
	padding: 8px 10px;
	border-inline-start: 3px solid #0f766e;
	background: #f8fafc;

	span,
	small {
		display: block;
		color: #64748b;
		font-size: 11px;
		font-weight: 700;
	}

	strong {
		display: block;
		margin-top: 3px;
		color: #0f172a;
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	small {
		margin-top: 2px;
		font-weight: 600;
		text-transform: none;
	}
`;

const RoomMappingPanel = styled.section`
	margin-bottom: 14px;
	padding: 12px;
	border: 1px solid #cfe2ff;
	border-radius: 10px;
	background: #f8fbff;

	.room-mapping-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 10px;
	}

	.room-mapping-heading > div,
	.room-mapping-label {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.room-mapping-heading span,
	.room-mapping-label span,
	.room-mapping-label small {
		color: #60738a;
		font-size: 12px;
	}

	.room-mapping-list {
		display: grid;
		gap: 9px;
	}

	.room-mapping-row {
		display: grid;
		grid-template-columns: minmax(220px, 0.75fr) minmax(280px, 1.25fr);
		align-items: center;
		gap: 12px;
		padding: 9px;
		border: 1px solid #e0ebf7;
		border-radius: 8px;
		background: #fff;
	}

	.room-mapping-row .ant-select {
		width: 100%;
	}

	.room-mapping-status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px;
		border-radius: 7px;
		background: #eef5ff;
	}

	.room-mapping-status.is-error {
		color: #a61d24;
		background: #fff1f0;
	}

	@media (max-width: 760px) {
		.room-mapping-row {
			grid-template-columns: 1fr;
		}
	}
`;

const PricingSummaryRows = styled.div`
	display: grid;
	grid-template-columns: ${(props) =>
		props.$isArabic ? "132px minmax(0, 1fr)" : "minmax(0, 1fr) 132px"};
	grid-template-areas: ${(props) =>
		props.$isArabic ? "'action fields'" : "'fields action'"};
	gap: 10px;

	.pricing-summary-fields {
		grid-area: fields;
		display: grid;
		gap: 10px;
		min-width: 0;
	}

	.pricing-distribute-all {
		grid-area: action;
		align-self: stretch;
		min-height: 48px;
		white-space: normal;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
		grid-template-areas: "fields" "action";
	}
`;

const PricingSummaryRow = styled.div`
	display: grid;
	grid-template-columns: minmax(190px, 240px) minmax(140px, 1fr) minmax(220px, 1.4fr);
	gap: 10px;
	align-items: center;
	padding: 10px;
	border: 1px solid #dbeafe;
	border-radius: 8px;
	background: #f8fafc;

	strong {
		color: #0f172a;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const PricingTableWrap = styled.div`
	overflow: auto;
	max-height: 55vh;
	border: 1px solid #e2e8f0;
	border-radius: 8px;

	table {
		width: 100%;
		min-width: 980px;
		border-collapse: collapse;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: #102033;
		color: #ffffff;
		padding: 10px;
		font-size: 12px;
	}

	td,
	tfoot th {
		border-top: 1px solid #e2e8f0;
		padding: 9px 10px;
		text-align: center;
	}

	td:first-child {
		text-align: start;
	}

	td:first-child span {
		display: block;
		color: #64748b;
		font-size: 11px;
	}

	input {
		text-align: end;
	}

	tfoot th {
		background: #f8fafc;
		color: #0f172a;
	}
`;

const BasePriceWarning = styled.div`
	display: grid;
	gap: 6px;
	padding: 12px;
	border: 1px solid #fecaca;
	border-radius: 8px;
	background: #fff1f2;
	color: #991b1b;

	strong {
		font-size: 14px;
	}

	span {
		font-size: 13px;
	}
`;
