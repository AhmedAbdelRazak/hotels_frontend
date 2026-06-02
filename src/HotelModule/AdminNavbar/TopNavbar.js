/** @format */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { Badge, Dropdown, Empty, Spin } from "antd";
import {
	UserOutlined,
	LogoutOutlined,
	MailOutlined,
	BellOutlined,
	MessageOutlined,
	SettingOutlined,
	GlobalOutlined,
	CalendarOutlined,
	IdcardOutlined,
} from "@ant-design/icons";
import { useCartContext } from "../../cart_context";
import DigitalClock from "./DigitalClock";
import { isAuthenticated, signout, stopDashboardPreview } from "../../auth";
import { useLocation, useHistory } from "react-router-dom";
import UpdateAccountModal from "./UpdateAccountModal"; // <-- NEW
import { isSuperAdminUser } from "../../AdminModule/utils/superUsers";
import {
	getEmployeeWorkLoad,
	getHotelDetails,
	hotelAccount,
	acknowledgePendingNotification,
	getB2BChatUnreadSummary,
	pendingConfirmationNotificationFeed,
} from "../apiAdmin";
import socket from "../../socket";
import { formatSaudiDate } from "../../utils/saudiDates";

const normalizeTopNavId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const titleCaseHotelName = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

const getUserRoles = (user = {}) => [
	Number(user.role),
	...(Array.isArray(user.roles) ? user.roles.map(Number) : []),
];

const getUserRoleDescriptions = (user = {}) => [
	String(user.roleDescription || "").toLowerCase(),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const isSystemAdminTopNavUser = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	return (
		roles.includes(10000) ||
		descriptions.includes("systemadmin") ||
		descriptions.includes("system admin")
	);
};

const getRespectfulSelfRoleLabel = (user = {}, isArabic = false) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	const accessTo = Array.isArray(user.accessTo)
		? user.accessTo.map((item) => String(item || "").toLowerCase())
		: [];
	const hasRole = (...allowed) => allowed.some((role) => roles.includes(role));
	const hasDescription = (...allowed) =>
		allowed.some((description) => descriptions.includes(description));
	const hasAccess = (...allowed) =>
		allowed.some((key) => accessTo.includes(String(key || "").toLowerCase()));
	const isHotelOwner =
		hasRole(2000) && !normalizeTopNavId(user.belongsToId);

	if (
		isSuperAdminUser(user) ||
		hasRole(1000, 10000) ||
		isHotelOwner ||
		hasDescription("systemadmin", "system admin")
	) {
		return "";
	}

	if (hasRole(7000) || hasDescription("ordertaker")) {
		return isArabic
			? "\u0634\u0631\u064a\u0643 \u062d\u062c\u0648\u0632\u0627\u062a \u062e\u0627\u0631\u062c\u064a"
			: "External Booking Partner";
	}

	if (hasRole(8000) || hasDescription("reservationemployee")) {
		return isArabic
			? "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a"
			: "Responsible for Reservations";
	}

	if (hasRole(3000) || hasDescription("reception")) {
		return isArabic
			? "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0627\u0633\u062a\u0642\u0628\u0627\u0644 \u0648\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a"
			: "Responsible for Reception & Reservations";
	}

	if (hasRole(6000) || hasDescription("finance")) {
		return isArabic
			? "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u0645\u0627\u0644\u064a\u0629"
			: "Responsible for Finance";
	}

	if (hasRole(4000) || hasDescription("housekeepingmanager")) {
		return isArabic
			? "\u0645\u0633\u0624\u0648\u0644 \u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u063a\u0631\u0641"
			: "Responsible for Room Readiness";
	}

	if (hasRole(5000) || hasDescription("housekeeping")) {
		return isArabic
			? "\u0645\u0633\u0624\u0648\u0644 \u062a\u062c\u0647\u064a\u0632 \u0627\u0644\u063a\u0631\u0641"
			: "Responsible for Room Preparation";
	}

	if (hasRole(2000) || hasDescription("hotelmanager")) {
		return isArabic
			? "\u0645\u0633\u0624\u0648\u0644 \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0641\u0646\u062f\u0642"
			: "Responsible for Hotel Operations";
	}

	if (hasAccess("ownReservations", "reservations", "newReservation")) {
		return isArabic
			? "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a"
			: "Responsible for Reservations";
	}

	return isArabic
		? "\u0639\u0636\u0648 \u0641\u0631\u064a\u0642 \u0627\u0644\u0641\u0646\u062f\u0642"
		: "Hotel Team Member";
};

const canSeePendingConfirmationNotifications = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	const accessTo = Array.isArray(user.accessTo) ? user.accessTo : [];
	return (
		isSuperAdminUser(user) ||
		[1000, 2000, 6000, 8000, 10000].some((role) => roles.includes(role)) ||
		roles.includes(7000) ||
		descriptions.includes("hotelmanager") ||
		descriptions.includes("systemadmin") ||
		descriptions.includes("finance") ||
		descriptions.includes("reservationemployee") ||
		descriptions.includes("ordertaker") ||
		accessTo.includes("ownReservations")
	);
};

const isAgentNotificationUser = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	const accessTo = Array.isArray(user.accessTo) ? user.accessTo : [];
	const staffOrAdminRoles = [1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000];
	const staffOrAdminDescriptions = [
		"superadmin",
		"super admin",
		"systemadmin",
		"system admin",
		"hotelmanager",
		"reception",
		"housekeepingmanager",
		"housekeeping",
		"finance",
		"reservationemployee",
	];
	return (
		roles.includes(7000) ||
		descriptions.includes("ordertaker") ||
		(accessTo.includes("ownReservations") &&
			!roles.some((role) => staffOrAdminRoles.includes(role)) &&
			!descriptions.some((description) =>
				staffOrAdminDescriptions.includes(description)
			))
	);
};

const isManagerOrAdminNotificationUser = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	return (
		isSuperAdminUser(user) ||
		roles.includes(1000) ||
		roles.includes(2000) ||
		roles.includes(10000) ||
		descriptions.includes("systemadmin") ||
		descriptions.includes("hotelmanager")
	);
};

const scopedPlatformB2BHotelIds = (user = {}) =>
	[
		user.hotelIdWork,
		...(Array.isArray(user.hotelIdsWork) ? user.hotelIdsWork : []),
		...(Array.isArray(user.hotelsToSupport) ? user.hotelsToSupport : []),
		...(Array.isArray(user.hotelIdsOwner) ? user.hotelIdsOwner : []),
	]
		.map(normalizeTopNavId)
		.filter(Boolean);

const hasScopedPlatformB2BAccess = (user = {}) => {
	const accessTo = Array.isArray(user.accessTo) ? user.accessTo : [];
	return (
		getUserRoles(user).includes(1000) &&
		scopedPlatformB2BHotelIds(user).length > 0 &&
		["CustomerService", "HotelsReservations", "AllReservations"].some((key) =>
			accessTo.includes(key)
		)
	);
};

const isB2BPlatformMonitor = (user = {}) => isSuperAdminUser(user);

const canMonitorB2BHotelChats = (user = {}) => {
	const roles = getUserRoles(user);
	return (
		isB2BPlatformMonitor(user) ||
		hasScopedPlatformB2BAccess(user) ||
		isSystemAdminTopNavUser(user) ||
		roles.includes(10000) ||
		(roles.includes(2000) && !normalizeTopNavId(user.belongsToId))
	);
};

const isFinanceNotificationUser = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	return roles.includes(6000) || descriptions.includes("finance");
};

const isReservationEmployeeNotificationUser = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	return roles.includes(8000) || descriptions.includes("reservationemployee");
};

const isHousekeepingNotificationUser = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	return roles.includes(5000) || descriptions.includes("housekeeping");
};

const canOpenSettingsCalendar = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	const accessTo = Array.isArray(user.accessTo)
		? user.accessTo.map((item) => String(item || "").toLowerCase())
		: [];
	return (
		isSuperAdminUser(user) ||
		roles.includes(1000) ||
		roles.includes(2000) ||
		roles.includes(10000) ||
		descriptions.includes("systemadmin") ||
		descriptions.includes("hotelmanager") ||
		accessTo.includes("settings")
	);
};

const getAssignedHotelIds = (user = {}) => {
	const values = [
		user.hotelIdWork,
		...(Array.isArray(user.hotelIdsWork) ? user.hotelIdsWork : []),
		...(Array.isArray(user.hotelsToSupport) ? user.hotelsToSupport : []),
		...(Array.isArray(user.hotelIdsOwner) ? user.hotelIdsOwner : []),
	];
	return [...new Set(values.map(normalizeTopNavId).filter(Boolean))];
};

const assignedHotelScopeKey = (user = {}) => getAssignedHotelIds(user).join("|");

const mainDashboardPath = (ownerId = "", { summary = false } = {}) => {
	const params = new URLSearchParams();
	if (ownerId) params.set("ownerId", ownerId);
	if (summary) {
		params.set("overall", "summary");
		params.set("page", "1");
	}
	const search = params.toString();
	return `/hotel-management/main-dashboard${search ? `?${search}` : ""}`;
};

const readSelectedHotelFromStorage = () => {
	if (typeof window === "undefined") return {};
	try {
		return JSON.parse(localStorage.getItem("selectedHotel") || "{}") || {};
	} catch (error) {
		return {};
	}
};

const isBrowserTabHidden = () =>
	typeof document !== "undefined" && document.hidden;

const canSeeOwnerWideCalendarHotels = (user = {}) => {
	const roles = getUserRoles(user);
	return (
		isSuperAdminUser(user) ||
		roles.includes(1000) ||
		roles.includes(10000) ||
		isSystemAdminTopNavUser(user) ||
		(roles.includes(2000) && !normalizeTopNavId(user.belongsToId))
	);
};

const normalizeCalendarHotel = (hotel, fallback = {}, user = {}) => {
	const hotelId = normalizeTopNavId(hotel?._id || fallback?._id || fallback);
	if (!hotelId) return null;
	const fallbackObject = fallback && typeof fallback === "object" ? fallback : {};
	return {
		...fallbackObject,
		...(hotel && typeof hotel === "object" ? hotel : {}),
		_id: hotelId,
		hotelName:
			hotel?.hotelName ||
			fallbackObject?.hotelName ||
			fallbackObject?.name ||
			(hotelId ? `Hotel ${hotelId.slice(-4)}` : "Hotel"),
		belongsTo:
			hotel?.belongsTo ||
			fallbackObject?.belongsTo ||
			fallbackObject?.ownerId ||
			user.belongsToId,
	};
};

const getCalendarHotelOwnerId = (hotel = {}, user = {}, fallbackOwnerId = "") =>
	normalizeTopNavId(
		hotel.belongsTo?._id ||
			hotel.belongsTo ||
			hotel.ownerId ||
			fallbackOwnerId ||
			user.belongsToId ||
			user._id
	);

const getCalendarRoomLabel = (room = {}) =>
	room.displayName ||
	room.displayName_OtherLanguage ||
	room.roomType ||
	room.name ||
	"Room";

const getCalendarHotelRooms = (hotel = {}) =>
	(Array.isArray(hotel.roomCountDetails) ? hotel.roomCountDetails : [])
		.filter((room) => normalizeTopNavId(room?._id || room?.roomType))
		.filter((room) => room.activeRoom !== false);

const isFinanceOnlyNotificationUser = (user = {}) =>
	isFinanceNotificationUser(user) &&
	!isManagerOrAdminNotificationUser(user) &&
	!isReservationEmployeeNotificationUser(user);

const isAgentAccountNotification = (item = {}) =>
	String(item.notificationType || "").startsWith("agent_account");

const isAgentWalletClaimNotification = (item = {}) =>
	String(item.notificationType || "").startsWith("agent_wallet_claim");

const isStaffApplicationNotification = (item = {}) =>
	String(item.notificationType || "") === "staff_application_pending";

const buildActivationAccountsRoute = (ownerId = "") => {
	const params = new URLSearchParams();
	const targetOwnerId = normalizeTopNavId(ownerId);
	if (targetOwnerId) params.set("ownerId", targetOwnerId);
	params.set("overall", "activate-accounts");
	params.set("page", "1");
	params.set("range", "custom");
	return `/hotel-management/main-dashboard?${params.toString()}`;
};

const notificationReasonLabel = (reason, isArabic, isAgent = false) => {
	if (reason === "wallet_claim_pending") {
		return isArabic
			? "\u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u062d\u0641\u0638\u0629 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629"
			: "Wallet claim waiting for finance review";
	}
	if (reason === "wallet_claim_rejected") {
		return isArabic
			? "\u062a\u0645 \u0631\u0641\u0636 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629"
			: "Wallet claim rejected";
	}
	if (reason === "wallet_claim_approved") {
		return isArabic
			? "\u062a\u0645\u062a \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u0639\u0644\u0649 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629"
			: "Wallet claim approved by finance";
	}
	if (reason === "finance_accepted") {
		return isArabic
			? "\u062a\u0645\u062a \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629"
			: "Finance accepted";
	}
	if (reason === "finance_commission_rejected") {
		return isArabic
			? "\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u0639\u0645\u0648\u0644\u0629"
			: "Commission rejected";
	}
	if (reason === "finance_amount_and_commission_rejected") {
		return isArabic
			? "\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u0645\u0628\u0644\u063a \u0648\u0627\u0644\u0639\u0645\u0648\u0644\u0629"
			: "Total and commission rejected";
	}
	if (reason === "agent_account_pending_approval") {
		return isArabic
			? "\u062d\u0633\u0627\u0628 \u0648\u0643\u064a\u0644 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0645\u062f\u064a\u0631"
			: "Agent account waiting for director approval";
	}
	if (reason === "staff_application_pending_review") {
		return isArabic
			? "\u0637\u0644\u0628 \u0648\u0638\u064a\u0641\u0629 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629"
			: "Job application waiting for review";
	}
	if (reason === "agent_account_approved") {
		return isArabic ? "Agent account approved" : "Agent account approved";
	}
	if (reason === "agent_account_rejected") {
		return isArabic ? "Agent account rejected" : "Agent account rejected";
	}
	if (reason === "agent_pending_review") {
		return isArabic
			? "الحجز بانتظار مراجعة الفندق"
			: "Waiting for hotel review";
	}
	if (reason === "commission_missing") {
		return isArabic
			? isAgent
				? "مراجعة الفندق المالية قيد التنفيذ"
				: "العمولة تحتاج مراجعة"
			: isAgent
			? "Hotel financial review"
			: "Commission needs review";
	}
	const labels = {
		pending_confirmation: isArabic
			? "بانتظار تأكيد الحجز"
			: "Pending confirmation",
		commission_missing: isArabic ? "العمولة غير محددة" : "Commission missing",
		pending_rejected: isArabic ? "مرفوضة وتحتاج متابعة" : "Rejected follow-up",
		finance_review_pending: isArabic
			? "بانتظار مراجعة المالية"
			: "Pending finance review",
		finance_total_rejected: isArabic
			? "مرفوض من المالية"
			: "Finance rejected",
		finance_commission_rejected: isArabic
			? "\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u0639\u0645\u0648\u0644\u0629"
			: "Commission rejected",
		finance_amount_and_commission_rejected: isArabic
			? "\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u0645\u0628\u0644\u063a \u0648\u0627\u0644\u0639\u0645\u0648\u0644\u0629"
			: "Total and commission rejected",
		agent_commission_pending: isArabic
			? "بانتظار موافقة الوكيل"
			: "Agent commission approval",
		agent_commission_rejected: isArabic
			? "رفض الوكيل للعمولة"
			: "Agent commission rejected",
	};
	return labels[reason] || reason;
};

const cleanNotificationReasonLabel = (reason, isArabic, isAgent = false) => {
	if (!isArabic) return notificationReasonLabel(reason, false, isAgent);
	if (reason === "finance_commission_rejected") {
		return "\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u0639\u0645\u0648\u0644\u0629";
	}
	if (reason === "finance_amount_and_commission_rejected") {
		return "\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u0645\u0628\u0644\u063a \u0648\u0627\u0644\u0639\u0645\u0648\u0644\u0629";
	}
	const labels = {
		wallet_claim_pending: "مطالبة محفظة بانتظار مراجعة المالية",
		wallet_claim_rejected: "تم رفض مطالبة المحفظة",
		wallet_claim_approved: "تمت موافقة المالية على مطالبة المحفظة",
		finance_accepted: "تمت الموافقة المالية",
		agent_account_pending_approval: "حساب وكيل بانتظار موافقة المدير",
		staff_application_pending_review: "طلب وظيفة بانتظار المراجعة",
		agent_account_approved: "تمت الموافقة على حساب الوكيل",
		agent_account_rejected: "تم رفض حساب الوكيل",
		agent_pending_review: "الحجز بانتظار مراجعة الفندق",
		pending_confirmation: "بانتظار تأكيد الحجز",
		commission_missing: isAgent
			? "مراجعة الفندق المالية قيد التنفيذ"
			: "العمولة تحتاج مراجعة",
		pending_rejected: "مرفوض ويحتاج متابعة",
		finance_review_pending: "بانتظار مراجعة المالية",
		finance_total_rejected: "مرفوض من المالية",
		agent_commission_pending: "بانتظار موافقة الوكيل",
		agent_commission_rejected: "رفض الوكيل للعمولة",
	};
	return labels[reason] || reason;
};

const cleanAgentDecisionText = (item = {}, isArabic = false) => {
	const status = String(item.decisionStatus || "").toLowerCase();
	if (status === "cancelled" || status === "canceled") {
		return isArabic
			? "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062d\u062c\u0632"
			: "Reservation cancelled";
	}
	if (status === "rejected") {
		return isArabic ? "تم رفض الحجز" : "Reservation rejected";
	}
	if (status === "confirmed") {
		return isArabic ? "تم قبول الحجز" : "Reservation confirmed";
	}
	return "";
};

const notificationTone = (item = {}) => {
	const type = String(item.notificationType || "");
	const status = String(item.decisionStatus || "").toLowerCase();
	if (
		type === "agent_wallet_claim_approved" ||
		type === "agent_finance_accepted" ||
		(type === "agent_decision" && status === "confirmed") ||
		status === "accepted" ||
		status === "approved"
	) {
		return "success";
	}
	if (
		type.includes("rejected") ||
		status === "rejected" ||
		status === "cancelled" ||
		status === "canceled"
	)
		return "danger";
	if (type.includes("pending") || status === "pending") return "warning";
	return "default";
};

const notificationReasonList = (item = {}) =>
	Array.isArray(item.pendingReasons)
		? item.pendingReasons.map((reason) => String(reason || "").toLowerCase())
		: [];

const isPendingConfirmationNotificationItem = (item = {}) => {
	const type = String(item.notificationType || "").toLowerCase();
	const reasons = notificationReasonList(item);
	const status = String(
		item.reservation_status || item.status || item.state || ""
	).toLowerCase();
	return (
		type === "pending_confirmation" ||
		reasons.includes("pending_confirmation") ||
		reasons.includes("pending_rejected") ||
		/pending[\s_-]?confirmation/i.test(status)
	);
};

const isFinancialNotificationItem = (item = {}) => {
	const type = String(item.notificationType || "").toLowerCase();
	const reasons = notificationReasonList(item);
	return (
		type.includes("commission") ||
		type.includes("finance") ||
		reasons.some((reason) =>
			[
				"commission_missing",
				"finance_review_pending",
				"finance_total_rejected",
				"finance_commission_rejected",
				"finance_amount_and_commission_rejected",
				"agent_commission_pending",
				"agent_commission_rejected",
				"finance_accepted",
			].includes(reason)
		)
	);
};

const formatNotificationMoney = (value) =>
	Number(value || 0).toLocaleString("en-US", {
		maximumFractionDigits: 2,
	});

const formatNotificationDate = (value, isArabic = false) =>
	value
		? formatSaudiDate(value, {
				language: isArabic ? "Arabic" : "English",
				includeHijri: false,
				month: isArabic ? "short" : "short",
				fallback: "",
		  })
		: "";

const housekeepingTaskLabel = (task = {}) => {
	const rooms = Array.isArray(task.rooms) ? task.rooms : [];
	const roomText = rooms
		.map((room) => room.room_number || room.roomNumber || room.displayName)
		.filter(Boolean)
		.join(", ");
	if (roomText) return roomText;
	if (Array.isArray(task.generalAreas) && task.generalAreas.length) {
		return task.generalAreas.join(", ");
	}
	return task.customTask || task.task_comment || "Housekeeping task";
};

const TopNavbar = ({ collapsed, roomCountDetails }) => {
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const [roomTypesDropdown, setRoomTypesDropdown] = useState(false);
	const [accountModalOpen, setAccountModalOpen] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [notificationsLoading, setNotificationsLoading] = useState(false);
	const [notificationFeed, setNotificationFeed] = useState({
		total: 0,
		data: [],
	});
	const [notificationBellRinging, setNotificationBellRinging] = useState(false);
	const [chatUnreadSummary, setChatUnreadSummary] = useState({
		unreadChats: 0,
		unreadMessages: 0,
		activeChats: 0,
	});
	const [chatPingRinging, setChatPingRinging] = useState(false);
	const [isMobileNav, setIsMobileNav] = useState(false);
	const [calendarHotels, setCalendarHotels] = useState([]);
	const [calendarRooms, setCalendarRooms] = useState([]);
	const [calendarHotel, setCalendarHotel] = useState(null);
	const [calendarMode, setCalendarMode] = useState("hotels");
	const [calendarLoading, setCalendarLoading] = useState(false);
	const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);

	const { languageToggle, chosenLanguage } = useCartContext();
	const isArabic = chosenLanguage === "Arabic";

	const [hotelName, setHotelName] = useState("");
	const notificationAudioContextRef = useRef(null);
	const notificationAudioUnlockedRef = useRef(false);
	const notificationBellTimerRef = useRef(null);
	const notificationFeedTotalRef = useRef(0);
	const notificationFeedReadyRef = useRef(false);
	const lastNotificationBellAtRef = useRef(0);
	const chatUnreadMessagesRef = useRef(0);
	const chatUnreadReadyRef = useRef(false);
	const chatUnreadLoadingRef = useRef(false);
	const chatUnreadRetryTimerRef = useRef(null);
	const chatPingTimerRef = useRef(null);
	const lastChatPingAtRef = useRef(0);

	const location = useLocation();
	const history = useHistory();

	const auth = isAuthenticated() || {};
	const { user, token } = auth;
	const dashboardPreview = auth.dashboardPreview;

	// Selected hotel context
	const [selectedHotel, setSelectedHotel] = useState(() =>
		readSelectedHotelFromStorage()
	);
	const hotelId = selectedHotel._id;
	const routeHotelContext = useMemo(() => {
		const match = (location.pathname || "").match(
			/^\/hotel-management\/[^/]+\/([^/]+)\/([^/?#]+)/
		);
		return {
			routeOwnerId: match?.[1] || "",
			routeHotelId: match?.[2] || "",
		};
	}, [location.pathname]);
	const queryOwnerId = useMemo(() => {
		return new URLSearchParams(location.search || "").get("ownerId") || "";
	}, [location.search]);
	useEffect(() => {
		setSelectedHotel(readSelectedHotelFromStorage());
	}, [location.pathname, location.search]);

	const isOwnerManager =
		(user.role === 2000 || isSystemAdminTopNavUser(user)) &&
		!user.belongsToId;
	const userId = isOwnerManager
		? user._id
		: selectedHotel.belongsTo?._id || selectedHotel.belongsTo || user.belongsToId;
	const selectedHotelOwnerId = normalizeTopNavId(
		selectedHotel.belongsTo?._id || selectedHotel.belongsTo || user.belongsToId
	);
	const isMainHotelDashboard =
		location.pathname === "/hotel-management/main-dashboard";
	const isOverallNavbarContext =
		isMainHotelDashboard ||
		location.pathname === "/hotel-management/b2b-chat";
	const notificationHotelId = isOverallNavbarContext
		? ""
		: routeHotelContext.routeHotelId || hotelId || "";
	const notificationOwnerId =
		queryOwnerId ||
		routeHotelContext.routeOwnerId ||
		selectedHotelOwnerId ||
		(isOwnerManager ? user._id : user.belongsToId);
	const canUsePendingNotifications = canSeePendingConfirmationNotifications(user);
	const canUseHousekeepingNotifications = isHousekeepingNotificationUser(user);
	const canUseNotifications =
		canUsePendingNotifications || canUseHousekeepingNotifications;
	const isAgentNotificationAudience = isAgentNotificationUser(user);
	const isFinanceNotificationAudience = isFinanceOnlyNotificationUser(user);
	const assignedHotelKey = assignedHotelScopeKey(user);
	const assignedCalendarHotelIds = useMemo(
		() => (assignedHotelKey ? assignedHotelKey.split("|") : []),
		[assignedHotelKey]
	);
	const b2bHotelMonitorIds = useMemo(
		() =>
			canMonitorB2BHotelChats(user)
				? assignedCalendarHotelIds.filter(Boolean)
				: [],
		[assignedCalendarHotelIds, user]
	);
	const b2bHotelMonitorKey = b2bHotelMonitorIds.join("|");
	const shouldJoinB2BPlatform = isB2BPlatformMonitor(user);
	const canUseOwnerWideCalendarHotels = canSeeOwnerWideCalendarHotels(user);
	const canUseMainDashboardSettingsCalendar =
		isMainHotelDashboard && canOpenSettingsCalendar(user);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const mediaQuery = window.matchMedia("(max-width: 760px)");
		const syncViewport = () => {
			setIsMobileNav(mediaQuery.matches);
			setNotificationsOpen(false);
			setProfileMenuOpen(false);
			setSettingsDropdownOpen(false);
		};

		syncViewport();
		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener("change", syncViewport);
			return () => mediaQuery.removeEventListener("change", syncViewport);
		}

		mediaQuery.addListener(syncViewport);
		return () => mediaQuery.removeListener(syncViewport);
	}, []);

	// eslint-disable-next-line
	const userDetails = isOwnerManager ? user : selectedHotel.belongsTo;

	const ensureNotificationAudioReady = useCallback(async () => {
		if (typeof window === "undefined") return null;
		const AudioContextConstructor =
			window.AudioContext || window.webkitAudioContext;
		if (!AudioContextConstructor) return null;

		let audioContext = notificationAudioContextRef.current;
		if (!audioContext || audioContext.state === "closed") {
			audioContext = new AudioContextConstructor();
			notificationAudioContextRef.current = audioContext;
		}

		if (audioContext.state === "suspended") {
			try {
				await audioContext.resume();
			} catch (error) {
				return audioContext;
			}
		}

		notificationAudioUnlockedRef.current = audioContext.state === "running";
		return audioContext;
	}, []);

	const playNotificationBell = useCallback(async () => {
		if (typeof window === "undefined") return;
		const nowMs = Date.now();
		if (nowMs - lastNotificationBellAtRef.current < 2200) return;
		lastNotificationBellAtRef.current = nowMs;

		setNotificationBellRinging(true);
		if (notificationBellTimerRef.current) {
			clearTimeout(notificationBellTimerRef.current);
		}
		notificationBellTimerRef.current = setTimeout(() => {
			setNotificationBellRinging(false);
		}, 950);

		if (typeof navigator !== "undefined" && navigator.vibrate) {
			try {
				navigator.vibrate([85, 35, 95]);
			} catch (error) {
				// Vibration support varies by browser and device.
			}
		}

		const audioContext = await ensureNotificationAudioReady();
		if (!audioContext || audioContext.state !== "running") return;

		try {
			const startTime = audioContext.currentTime;
			const masterGain = audioContext.createGain();
			masterGain.gain.setValueAtTime(0.0001, startTime);
			masterGain.gain.exponentialRampToValueAtTime(0.14, startTime + 0.025);
			masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.05);
			masterGain.connect(audioContext.destination);

			const chimes = [
				{ frequency: 880, offset: 0, duration: 0.22, gain: 0.58 },
				{ frequency: 1174.66, offset: 0.12, duration: 0.28, gain: 0.45 },
				{ frequency: 1567.98, offset: 0.3, duration: 0.42, gain: 0.32 },
			];

			chimes.forEach(({ frequency, offset, duration, gain }) => {
				const oscillator = audioContext.createOscillator();
				const noteGain = audioContext.createGain();
				const noteStart = startTime + offset;
				const noteEnd = noteStart + duration;

				oscillator.type = "sine";
				oscillator.frequency.setValueAtTime(frequency, noteStart);
				oscillator.frequency.exponentialRampToValueAtTime(
					frequency * 0.992,
					noteEnd
				);
				noteGain.gain.setValueAtTime(0.0001, noteStart);
				noteGain.gain.exponentialRampToValueAtTime(gain, noteStart + 0.018);
				noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

				oscillator.connect(noteGain);
				noteGain.connect(masterGain);
				oscillator.start(noteStart);
				oscillator.stop(noteEnd + 0.04);
			});
		} catch (error) {
			// Audio is best-effort; the visual bell and vibration still run.
		}
	}, [ensureNotificationAudioReady]);

	const playChatPing = useCallback(async () => {
		if (typeof window === "undefined") return;
		const nowMs = Date.now();
		if (nowMs - lastChatPingAtRef.current < 1400) return;
		lastChatPingAtRef.current = nowMs;

		setChatPingRinging(true);
		if (chatPingTimerRef.current) {
			clearTimeout(chatPingTimerRef.current);
		}
		chatPingTimerRef.current = setTimeout(() => {
			setChatPingRinging(false);
		}, 680);

		if (typeof navigator !== "undefined" && navigator.vibrate) {
			try {
				navigator.vibrate([38, 25, 38]);
			} catch (error) {
				// Vibration support varies by browser and device.
			}
		}

		const audioContext = await ensureNotificationAudioReady();
		if (!audioContext || audioContext.state !== "running") return;

		try {
			const startTime = audioContext.currentTime;
			const masterGain = audioContext.createGain();
			masterGain.gain.setValueAtTime(0.0001, startTime);
			masterGain.gain.exponentialRampToValueAtTime(0.095, startTime + 0.014);
			masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.48);
			masterGain.connect(audioContext.destination);

			[
				{ frequency: 659.25, offset: 0, duration: 0.12 },
				{ frequency: 987.77, offset: 0.16, duration: 0.16 },
			].forEach(({ frequency, offset, duration }) => {
				const oscillator = audioContext.createOscillator();
				const noteGain = audioContext.createGain();
				const noteStart = startTime + offset;
				const noteEnd = noteStart + duration;
				oscillator.type = "triangle";
				oscillator.frequency.setValueAtTime(frequency, noteStart);
				noteGain.gain.setValueAtTime(0.0001, noteStart);
				noteGain.gain.exponentialRampToValueAtTime(0.5, noteStart + 0.012);
				noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
				oscillator.connect(noteGain);
				noteGain.connect(masterGain);
				oscillator.start(noteStart);
				oscillator.stop(noteEnd + 0.035);
			});
		} catch (error) {
			// Chat audio is best-effort; the badge animation still runs.
		}
	}, [ensureNotificationAudioReady]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const unlockAudio = () => {
			if (!notificationAudioUnlockedRef.current) {
				ensureNotificationAudioReady();
			}
		};
		window.addEventListener("pointerdown", unlockAudio, { passive: true });
		window.addEventListener("touchstart", unlockAudio, { passive: true });
		window.addEventListener("keydown", unlockAudio);
		return () => {
			window.removeEventListener("pointerdown", unlockAudio);
			window.removeEventListener("touchstart", unlockAudio);
			window.removeEventListener("keydown", unlockAudio);
		};
	}, [ensureNotificationAudioReady]);

	useEffect(() => {
		return () => {
			if (notificationBellTimerRef.current) {
				clearTimeout(notificationBellTimerRef.current);
			}
			if (chatPingTimerRef.current) {
				clearTimeout(chatPingTimerRef.current);
			}
			if (chatUnreadRetryTimerRef.current) {
				clearTimeout(chatUnreadRetryTimerRef.current);
			}
			const audioContext = notificationAudioContextRef.current;
			if (audioContext && audioContext.state !== "closed") {
				audioContext.close().catch(() => {});
			}
		};
	}, []);

	// Detect whether path contains both ids to show hotel name
	useEffect(() => {
		const show =
			userId &&
			hotelId &&
			location.pathname.includes(userId) &&
			location.pathname.includes(hotelId);
		setHotelName(show ? titleCaseHotelName(selectedHotel.hotelName) : "");
	}, [location, selectedHotel.hotelName, hotelId, userId]);

	useEffect(() => {
		notificationFeedReadyRef.current = false;
		notificationFeedTotalRef.current = 0;
	}, [canUseNotifications, notificationHotelId, notificationOwnerId, user?._id]);

	const refreshNotifications = useCallback(
		async ({ silent = false, force = false } = {}) => {
			if (!force && isBrowserTabHidden()) {
				return;
			}
			if (!canUseNotifications || !user?._id) {
				notificationFeedReadyRef.current = false;
				notificationFeedTotalRef.current = 0;
				setNotificationFeed({ total: 0, data: [] });
				return;
			}
			if (!silent) setNotificationsLoading(true);
			try {
				const [pendingData, housekeepingData] = await Promise.all([
					canUsePendingNotifications
						? pendingConfirmationNotificationFeed({
								userId: user._id,
								hotelId: notificationHotelId,
								ownerId: notificationOwnerId,
								limit: 8,
						  })
						: Promise.resolve({ total: 0, data: [] }),
					canUseHousekeepingNotifications
						? getEmployeeWorkLoad(user._id, {
								hotelId: notificationHotelId,
								includeFinished: "false",
								status: "active",
						  })
						: Promise.resolve([]),
				]);
				const reservationItems =
					pendingData && !pendingData.error && Array.isArray(pendingData.data)
						? pendingData.data
						: [];
				const housekeepingTasks = Array.isArray(housekeepingData)
					? housekeepingData
					: [];
				const housekeepingItems = housekeepingTasks.map((task) => {
					const taskHotel =
						task.hotelId && typeof task.hotelId === "object" ? task.hotelId : {};
					const taskHotelId = normalizeTopNavId(taskHotel._id || task.hotelId);
					const taskOwnerId = normalizeTopNavId(
						taskHotel.belongsTo || task.hotelOwnerId || notificationOwnerId
					);
					return {
						_id: `housekeeping-${normalizeTopNavId(task._id)}`,
						notificationType: "housekeeping_task",
						taskId: normalizeTopNavId(task._id),
						hotelId: taskHotelId || notificationHotelId,
						hotelOwnerId: taskOwnerId,
						hotelName: taskHotel.hotelName || task.hotelName || "",
						taskLabel: housekeepingTaskLabel(task),
						task_status: task.task_status || "",
						taskDate: task.taskDate || task.createdAt,
						confirmation_number: task.confirmation_number || "",
						pendingReasons: ["housekeeping_assigned"],
					};
				});
				const nextFeed = {
					total:
						Number(pendingData?.total || reservationItems.length || 0) +
						housekeepingTasks.length,
					data: [...housekeepingItems, ...reservationItems].slice(0, 8),
				};
				const nextTotal = Number(nextFeed.total || 0);
				const previousTotal = Number(notificationFeedTotalRef.current || 0);
				if (notificationFeedReadyRef.current && nextTotal > previousTotal) {
					playNotificationBell();
				}
				notificationFeedReadyRef.current = true;
				notificationFeedTotalRef.current = nextTotal;
				setNotificationFeed(nextFeed);
			} catch (error) {
				if (!silent) console.error("Failed to load notification feed", error);
				setNotificationFeed({ total: 0, data: [] });
			} finally {
				if (!silent) setNotificationsLoading(false);
			}
		},
		[
			canUseHousekeepingNotifications,
			canUseNotifications,
			canUsePendingNotifications,
			notificationHotelId,
			notificationOwnerId,
			playNotificationBell,
			user?._id,
		]
	);

	useEffect(() => {
		refreshNotifications({ force: true });
		const timer = setInterval(
			() => refreshNotifications({ silent: true }),
			60000
		);
		return () => clearInterval(timer);
	}, [refreshNotifications]);

	useEffect(() => {
		if (typeof document === "undefined") return undefined;
		const handleVisibilityChange = () => {
			if (!document.hidden) {
				refreshNotifications({ silent: true, force: true });
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [refreshNotifications]);

	const refreshChatUnread = useCallback(
		async ({ silent = false, force = false } = {}) => {
			if (!force && isBrowserTabHidden()) return;
			if (chatUnreadLoadingRef.current) {
				if (force && !chatUnreadRetryTimerRef.current) {
					chatUnreadRetryTimerRef.current = setTimeout(() => {
						chatUnreadRetryTimerRef.current = null;
						refreshChatUnread({ silent: true, force: true });
					}, 650);
				}
				return;
			}
			if (!user?._id || !token) {
				chatUnreadReadyRef.current = false;
				chatUnreadMessagesRef.current = 0;
				setChatUnreadSummary({
					unreadChats: 0,
					unreadMessages: 0,
					activeChats: 0,
				});
				return;
			}
			chatUnreadLoadingRef.current = true;
			try {
				const summary = await getB2BChatUnreadSummary(user._id, token);
				const nextUnreadMessages = Number(summary?.unreadMessages || 0);
				const previousUnreadMessages = Number(
					chatUnreadMessagesRef.current || 0
				);
				if (
					chatUnreadReadyRef.current &&
					nextUnreadMessages > previousUnreadMessages
				) {
					playChatPing();
				}
				chatUnreadReadyRef.current = true;
				chatUnreadMessagesRef.current = nextUnreadMessages;
				setChatUnreadSummary({
					unreadChats: Number(summary?.unreadChats || 0),
					unreadMessages: nextUnreadMessages,
					activeChats: Number(summary?.activeChats || 0),
				});
			} catch (error) {
				if (!silent) console.error("Failed to load chat notifications", error);
			} finally {
				chatUnreadLoadingRef.current = false;
			}
		},
		[playChatPing, token, user?._id]
	);

	useEffect(() => {
		refreshChatUnread({ force: true });
		const timer = setInterval(
			() => refreshChatUnread({ silent: true }),
			30000
		);
		return () => clearInterval(timer);
	}, [refreshChatUnread]);

	useEffect(() => {
		if (!user?._id) return undefined;
		const monitorHotelIds = b2bHotelMonitorKey
			? b2bHotelMonitorKey.split("|").filter(Boolean)
			: [];
		socket.emit("joinB2BUser", { userId: user._id });
		if (shouldJoinB2BPlatform) {
			socket.emit("joinB2BPlatform");
		}
		monitorHotelIds.forEach((hotelId) => {
			socket.emit("joinB2BHotel", { hotelId });
		});
		const handleChatUpdate = () => {
			refreshChatUnread({ silent: true, force: true });
		};
		socket.on("b2bChatUpdated", handleChatUpdate);
		return () => {
			socket.emit("leaveB2BUser", { userId: user._id });
			if (shouldJoinB2BPlatform) {
				socket.emit("leaveB2BPlatform");
			}
			monitorHotelIds.forEach((hotelId) => {
				socket.emit("leaveB2BHotel", { hotelId });
			});
			socket.off("b2bChatUpdated", handleChatUpdate);
		};
	}, [
		b2bHotelMonitorKey,
		refreshChatUnread,
		shouldJoinB2BPlatform,
		user?._id,
	]);

	useEffect(() => {
		if (typeof document === "undefined") return undefined;
		const handleVisibilityChange = () => {
			if (!document.hidden) {
				refreshChatUnread({ silent: true, force: true });
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [refreshChatUnread]);

	useEffect(() => {
		if (!canUseNotifications) return undefined;
		const housekeepingHotelIds = canUseHousekeepingNotifications
			? [notificationHotelId, ...assignedCalendarHotelIds].filter(Boolean)
			: [];
		const uniqueHousekeepingHotelIds = [...new Set(housekeepingHotelIds)];

		if (canUsePendingNotifications && notificationHotelId) {
			socket.emit("joinHotelNotifications", { hotelId: notificationHotelId });
		} else if (canUsePendingNotifications && notificationOwnerId) {
			socket.emit("joinOwnerNotifications", { ownerId: notificationOwnerId });
		}
		uniqueHousekeepingHotelIds.forEach((housekeepingHotelId) => {
			socket.emit("joinHousekeeping", { hotelId: housekeepingHotelId });
		});

		const handleRefresh = (payload = {}) => {
			const payloadHotelId = normalizeTopNavId(payload.hotelId);
			const payloadOwnerId = normalizeTopNavId(payload.ownerId);
			if (
				notificationHotelId &&
				payloadHotelId &&
				payloadHotelId !== notificationHotelId
			) {
				return;
			}
			if (
				!notificationHotelId &&
				notificationOwnerId &&
				payloadOwnerId &&
				payloadOwnerId !== notificationOwnerId
			) {
				return;
			}
			refreshNotifications({ silent: true });
		};
		const handleHousekeepingRefresh = (payload = {}) => {
			const payloadHotelId = normalizeTopNavId(payload.hotelId);
			if (
				payloadHotelId &&
				uniqueHousekeepingHotelIds.length &&
				!uniqueHousekeepingHotelIds.includes(payloadHotelId)
			) {
				return;
			}
			refreshNotifications({ silent: true });
		};

		socket.on("hotelNotificationsUpdated", handleRefresh);
		socket.on("housekeepingUpdated", handleHousekeepingRefresh);
		return () => {
			socket.off("hotelNotificationsUpdated", handleRefresh);
			socket.off("housekeepingUpdated", handleHousekeepingRefresh);
			if (canUsePendingNotifications && notificationHotelId) {
				socket.emit("leaveHotelNotifications", { hotelId: notificationHotelId });
			} else if (canUsePendingNotifications && notificationOwnerId) {
				socket.emit("leaveOwnerNotifications", { ownerId: notificationOwnerId });
			}
			uniqueHousekeepingHotelIds.forEach((housekeepingHotelId) => {
				socket.emit("leaveHousekeeping", { hotelId: housekeepingHotelId });
			});
		};
	}, [
		assignedCalendarHotelIds,
		canUseHousekeepingNotifications,
		canUseNotifications,
		canUsePendingNotifications,
		notificationHotelId,
		notificationOwnerId,
		refreshNotifications,
	]);

	const loadCalendarHotels = useCallback(async () => {
		if (!canUseMainDashboardSettingsCalendar || !user?._id) return;

		setCalendarLoading(true);
		try {
			let loadedHotels = [];
			const ownerIdForAccount =
				queryOwnerId ||
				selectedHotelOwnerId ||
				(isOwnerManager ? user._id : user.belongsToId || user._id);

			if (ownerIdForAccount && token) {
				const accountData = await hotelAccount(user._id, token, ownerIdForAccount);
				if (!accountData?.error && Array.isArray(accountData?.hotelIdsOwner)) {
					loadedHotels = accountData.hotelIdsOwner;
				}
			}

			if (!loadedHotels.length && assignedCalendarHotelIds.length) {
				const rawAssignedHotels = [
					user.hotelIdWork,
					...(Array.isArray(user.hotelIdsWork) ? user.hotelIdsWork : []),
					...(Array.isArray(user.hotelsToSupport) ? user.hotelsToSupport : []),
					...(Array.isArray(user.hotelIdsOwner) ? user.hotelIdsOwner : []),
				];
				loadedHotels = await Promise.all(
					assignedCalendarHotelIds.map((assignedHotelId) => {
						const fallback =
							rawAssignedHotels.find(
								(item) => normalizeTopNavId(item) === assignedHotelId
							) || { _id: assignedHotelId };
						return getHotelDetails(assignedHotelId)
							.then((hotel) => hotel || fallback)
							.catch(() => fallback);
					})
				);
			}

			const normalizedHotels = loadedHotels
				.map((hotel) => normalizeCalendarHotel(hotel, hotel, user))
				.filter((hotel) => {
					if (canUseOwnerWideCalendarHotels || !assignedCalendarHotelIds.length) {
						return true;
					}
					return assignedCalendarHotelIds.includes(hotel?._id);
				})
				.filter(Boolean);
			setCalendarHotels(normalizedHotels);
		} catch (error) {
			console.error("Failed to load calendar hotels", error);
			setCalendarHotels([]);
		} finally {
			setCalendarLoading(false);
		}
	}, [
		assignedCalendarHotelIds,
		canUseMainDashboardSettingsCalendar,
		canUseOwnerWideCalendarHotels,
		isOwnerManager,
		queryOwnerId,
		selectedHotelOwnerId,
		token,
		user,
	]);

	/* ===== actions ===== */

	const handleSignout = () => {
		signout(() => history.push("/"));
	};

	const stopPreview = () => {
		const preview = stopDashboardPreview();
		const returnTo =
			preview?.returnTo ||
			preview?.preview?.returnTo ||
			"/hotel-management/main-dashboard?overall=account-management";
		history.push(returnTo);
		window.location.reload();
	};

	const openSelfUpdateModal = () => {
		// For non-admin users only; admin keeps redirect behavior
		if (user.role === 1000) return;
		setAccountModalOpen(true);
	};

	const getProfileDestination = () => {
		const pathname = location?.pathname || "";
		const configuredSuperAdmin = isSuperAdminUser(user);
		const selectedHotelOwnerId = normalizeTopNavId(
			selectedHotel.belongsTo?._id || selectedHotel.belongsTo || user.belongsToId
		);

		if (pathname.startsWith("/hotel-management")) {
			return mainDashboardPath(selectedHotelOwnerId, { summary: true });
		}

		if (configuredSuperAdmin) {
			return "/admin/dashboard";
		}

		if (user.role === 1000) {
			return "/admin/dashboard";
		}

		return "/hotel-management/main-dashboard";
	};

	const handleMenuClick = ({ key }) => {
		switch (key) {
			case "profile":
				history.push(getProfileDestination());
				break;
			case "inbox":
				// keep as-is or route where you want
				break;
			case "update":
				if (user.role !== 1000) openSelfUpdateModal();
				break;
			case "stop-preview":
				stopPreview();
				break;
			case "logout":
				handleSignout();
				break;
			default:
				break;
		}
		setProfileMenuOpen(false);
		setSettingsDropdownOpen(false);
	};

	// Build profile dropdown menu (hide "Update Account" for admin)
	const profileMenuItems = [
		{
			key: "profile",
			icon: <UserOutlined />,
			label: "Profile",
		},
		{
			key: "inbox",
			icon: <MailOutlined />,
			label: "Inbox",
		},
		...(user.role !== 1000
			? [
					{
						key: "update",
						icon: <UserOutlined />,
						label: "Update Account / Password",
					},
			  ]
			: []),
		...(dashboardPreview
			? [
					{
						key: "stop-preview",
						icon: <LogoutOutlined />,
						label: isArabic ? "إنهاء المعاينة" : "Exit preview",
					},
			  ]
			: []),
		{
			key: "logout",
			icon: <LogoutOutlined />,
			label: "Logout",
		},
	];

	// Room types dropdown
	const handleRoomClick = ({ key }) => {
		if (!key || key === "no-rooms") return;
		const destinationOwnerId = routeHotelContext.routeOwnerId || userId;
		const destinationHotelId = routeHotelContext.routeHotelId || hotelId;
		if (!destinationOwnerId || !destinationHotelId) return;
		setRoomTypesDropdown(false);
		setSettingsDropdownOpen(false);
		history.push(
			`/hotel-management/settings/${destinationOwnerId}/${destinationHotelId}?activeTab=roomcount&currentStep=3&selectedRoomType=${key}`
		);
	};

	const roomTypeMenuItems =
		roomCountDetails && roomCountDetails.length > 0
			? roomCountDetails.map((room, index) => ({
					key: room?._id || room?.roomType || room?.displayName || String(index),
					label: getCalendarRoomLabel(room),
			  }))
			: [
					{
						key: "no-rooms",
						label: "No rooms available",
						disabled: true,
					},
			  ];

	const loadCalendarRoomsForHotel = async (hotel) => {
		if (!hotel?._id) return;
		setCalendarLoading(true);
		setRoomTypesDropdown(true);
		try {
			let fullHotel = hotel;
			if (!Array.isArray(fullHotel.roomCountDetails)) {
				const hotelDetails = await getHotelDetails(hotel._id);
				if (hotelDetails && !hotelDetails.error) {
					const normalizedHotel = normalizeCalendarHotel(
						hotelDetails,
						hotel,
						user
					);
					if (normalizedHotel) {
						fullHotel = normalizedHotel;
						setCalendarHotels((currentHotels) =>
							currentHotels.map((item) =>
								item._id === fullHotel._id ? { ...item, ...fullHotel } : item
							)
						);
					}
				}
			}
			setCalendarHotel(fullHotel);
			setCalendarRooms(getCalendarHotelRooms(fullHotel));
			setCalendarMode("rooms");
		} catch (error) {
			console.error("Failed to load calendar rooms", error);
			setCalendarHotel(hotel);
			setCalendarRooms([]);
			setCalendarMode("rooms");
		} finally {
			setCalendarLoading(false);
			window.setTimeout(() => setRoomTypesDropdown(true), 0);
		}
	};

	const handleCalendarMenuClick = ({ key }) => {
		if (!canUseMainDashboardSettingsCalendar) {
			handleRoomClick({ key });
			return;
		}

		if (key === "calendar-back-to-hotels") {
			setCalendarMode("hotels");
			setCalendarHotel(null);
			setCalendarRooms([]);
			window.setTimeout(() => setRoomTypesDropdown(true), 0);
			return;
		}

		if (String(key || "").startsWith("hotel:")) {
			const selectedHotelId = String(key).replace("hotel:", "");
			const hotel = calendarHotels.find((item) => item._id === selectedHotelId);
			if (hotel) {
				loadCalendarRoomsForHotel(hotel);
			}
			return;
		}

		if (String(key || "").startsWith("room:")) {
			const selectedRoomId = String(key).replace("room:", "");
			const selectedHotelForRoute = calendarHotel;
			const selectedOwnerId = getCalendarHotelOwnerId(
				selectedHotelForRoute,
				user,
				queryOwnerId || selectedHotelOwnerId
			);

			if (!selectedOwnerId || !selectedHotelForRoute?._id || !selectedRoomId) {
				return;
			}

			localStorage.setItem(
				"selectedHotel",
				JSON.stringify(selectedHotelForRoute)
			);
			setRoomTypesDropdown(false);
			setSettingsDropdownOpen(false);
			history.push(
				`/hotel-management/settings/${selectedOwnerId}/${selectedHotelForRoute._id}?activeTab=roomcount&currentStep=3&selectedRoomType=${selectedRoomId}`
			);
		}
	};

	const handleCalendarOpenChange = (flag) => {
		setRoomTypesDropdown(flag);
		if (!flag) return;
		setNotificationsOpen(false);
		setProfileMenuOpen(false);
		setSettingsDropdownOpen(false);
		if (canUseMainDashboardSettingsCalendar) {
			setCalendarMode("hotels");
			setCalendarHotel(null);
			setCalendarRooms([]);
			loadCalendarHotels();
		}
	};

	const calendarMenuItems = canUseMainDashboardSettingsCalendar
		? calendarMode === "rooms"
			? [
					{
						key: "calendar-back-to-hotels",
						label: isArabic ? "Back to hotels" : "Back to hotels",
					},
					...(calendarLoading
						? [
								{
									key: "calendar-loading-rooms",
									label: "Loading rooms...",
									disabled: true,
								},
						  ]
						: calendarRooms.length
						? calendarRooms.map((room, index) => {
								const roomId = normalizeTopNavId(
									room?._id || room?.roomType || room?.displayName || index
								);
								return {
									key: `room:${roomId}`,
									label: getCalendarRoomLabel(room),
								};
						  })
						: [
								{
									key: "calendar-no-rooms",
									label: "No rooms available",
									disabled: true,
								},
						  ]),
			  ]
			: calendarLoading
			? [
					{
						key: "calendar-loading-hotels",
						label: "Loading hotels...",
						disabled: true,
					},
			  ]
			: calendarHotels.length
			? calendarHotels.map((hotel) => ({
					key: `hotel:${hotel._id}`,
					label: titleCaseHotelName(hotel.hotelName || "Hotel"),
			  }))
			: [
					{
						key: "calendar-no-hotels",
						label: "No hotels available",
						disabled: true,
					},
			  ]
			: roomTypeMenuItems;

	// Settings & chat
	const goToHotelSettingsDetails = (hotel = {}) => {
		const selectedHotelId = normalizeTopNavId(hotel?._id);
		const selectedOwnerId = getCalendarHotelOwnerId(
			hotel,
			user,
			queryOwnerId || selectedHotelOwnerId || userId
		);

		if (!selectedOwnerId || !selectedHotelId) return;

		localStorage.setItem("selectedHotel", JSON.stringify(hotel));
		setSettingsDropdownOpen(false);
		setRoomTypesDropdown(false);
		history.push(
			`/hotel-management/settings/${selectedOwnerId}/${selectedHotelId}/?activeTab=HotelDetails&currentStep=0`
		);
	};

	const handleSettingsMenuClick = ({ key }) => {
		if (!String(key || "").startsWith("settings-hotel:")) return;
		const selectedHotelId = String(key).replace("settings-hotel:", "");
		const hotel = calendarHotels.find((item) => item._id === selectedHotelId);
		if (hotel) {
			goToHotelSettingsDetails(hotel);
		}
	};

	const handleSettingsOpenChange = (flag) => {
		if (!canUseMainDashboardSettingsCalendar) return;

		setSettingsDropdownOpen(flag);
		if (!flag) return;

		setRoomTypesDropdown(false);
		setNotificationsOpen(false);
		setProfileMenuOpen(false);
		setCalendarMode("hotels");
		setCalendarHotel(null);
		setCalendarRooms([]);
		loadCalendarHotels();
	};

	const settingsMenuItems = canUseMainDashboardSettingsCalendar
		? calendarLoading
			? [
					{
						key: "settings-loading-hotels",
						label: "Loading hotels...",
						disabled: true,
					},
			  ]
			: calendarHotels.length
			? calendarHotels.map((hotel) => ({
					key: `settings-hotel:${hotel._id}`,
					label: titleCaseHotelName(hotel.hotelName || "Hotel"),
			  }))
			: [
					{
						key: "settings-no-hotels",
						label: "No hotels available",
						disabled: true,
					},
			  ]
		: [];

	const handleSettingsClick = () => {
		const selectedHotelLocal =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userIdLocal =
			routeHotelContext.routeOwnerId ||
			selectedHotelLocal.belongsTo?._id ||
			selectedHotelLocal.belongsTo ||
			user.belongsToId ||
			user._id;
		const hotelIdLocal = routeHotelContext.routeHotelId || selectedHotelLocal._id;

		const ok =
			location.pathname.includes(userIdLocal) &&
			location.pathname.includes(hotelIdLocal);

		if (ok) {
			history.push(
				`/hotel-management/settings/${userIdLocal}/${hotelIdLocal}/?activeTab=HotelDetails&currentStep=0`
			);
		}
	};

	const handleChatClick = () => {
		history.push("/hotel-management/b2b-chat?tab=active");
	};

	const toggleLanguage = () => {
		languageToggle(chosenLanguage === "English" ? "Arabic" : "English");
	};

	const handleNotificationOpenChange = (flag) => {
		setNotificationsOpen(flag);
		if (flag) {
			setProfileMenuOpen(false);
			setRoomTypesDropdown(false);
			setSettingsDropdownOpen(false);
			refreshNotifications({ silent: true, force: true });
		}
	};

	const handleProfileOpenChange = (flag) => {
		setProfileMenuOpen(flag);
		if (flag) {
			setNotificationsOpen(false);
			setRoomTypesDropdown(false);
			setSettingsDropdownOpen(false);
		}
	};

	const acknowledgeNotificationClick = (item = {}) => {
		if (!item.ackable || !item.ackKey || !user?._id) return;
		setNotificationFeed((previous) => {
			const nextData = (previous.data || []).filter(
				(row) => row.ackKey !== item.ackKey
			);
			const nextTotal = Math.max(0, Number(previous.total || 0) - 1);
			notificationFeedTotalRef.current = nextTotal;
			return {
				...previous,
				total: nextTotal,
				data: nextData,
			};
		});
		acknowledgePendingNotification({
			userId: user._id,
			ackKey: item.ackKey,
			notificationType: item.notificationType,
			entityId:
				item.walletTransactionId || item.reservationId || normalizeTopNavId(item._id),
			reservationId: normalizeTopNavId(item._id),
			walletTransactionId: item.walletTransactionId || "",
		}).catch(() => refreshNotifications({ silent: true }));
	};

	const buildOverallNotificationRoute = (item = {}, targetOwnerId, targetHotelId) => {
		const params = new URLSearchParams();
		if (targetOwnerId) params.set("ownerId", targetOwnerId);
		if (targetHotelId) params.set("hotelId", targetHotelId);

		if (item.notificationType === "housekeeping_task") {
			params.set("overall", "housekeeping");
			params.set("tab", "reports");
			if (item.taskId) params.set("taskId", item.taskId);
			return `/hotel-management/main-dashboard?${params.toString()}`;
		}

		if (isAgentAccountNotification(item) || isStaffApplicationNotification(item)) {
			return buildActivationAccountsRoute(targetOwnerId);
		}

		if (isAgentWalletClaimNotification(item)) {
			params.set("overall", "wallet-management");
			params.set("walletTab", "update");
			if (item.agentId) params.set("agentId", item.agentId);
			if (item.walletTransactionId) {
				params.set("transactionId", item.walletTransactionId);
			}
			return `/hotel-management/main-dashboard?${params.toString()}`;
		}

		params.set(
			"overall",
			isPendingConfirmationNotificationItem(item)
				? "pending-reservations"
				: isFinancialNotificationItem(item)
					? "financial-actions"
					: "pending-reservations"
		);
		return `/hotel-management/main-dashboard?${params.toString()}`;
	};

	const buildSingleHotelPendingRoute = (item = {}, targetOwnerId, targetHotelId) => {
		const params = new URLSearchParams();
		params.set("pendingConfirmation", "");
		params.set("page", "1");
		const reservationId = normalizeTopNavId(item.reservationId || item._id);
		if (reservationId && !String(reservationId).startsWith("agent-wallet-")) {
			params.set("reservationId", reservationId);
		}
		return `/hotel-management/new-reservation/${targetOwnerId}/${targetHotelId}?${params.toString()}`;
	};

	const goToPendingNotification = (item = {}) => {
		acknowledgeNotificationClick(item);
		const targetHotelId = item.hotelId || notificationHotelId || hotelId;
		const targetOwnerId = item.hotelOwnerId || notificationOwnerId || userId;
		if (!targetHotelId || !targetOwnerId) return;
		if (isAgentNotificationAudience && isAgentAccountNotification(item)) {
			const params = new URLSearchParams();
			if (targetOwnerId) params.set("ownerId", targetOwnerId);
			if (targetHotelId) params.set("hotelId", targetHotelId);
			history.push(`/hotel-management/main-dashboard?${params.toString()}`);
			setNotificationsOpen(false);
			return;
		}
		if (isOverallNavbarContext) {
			history.push(
				buildOverallNotificationRoute(item, targetOwnerId, targetHotelId)
			);
			setNotificationsOpen(false);
			return;
		}
		if (item.notificationType === "housekeeping_task") {
			history.push(
				`/hotel-management/house-keeping/${targetOwnerId}/${targetHotelId}?overAllTasks`
			);
			setNotificationsOpen(false);
			return;
		}
		if (isAgentAccountNotification(item) || isStaffApplicationNotification(item)) {
			history.push(buildActivationAccountsRoute(targetOwnerId));
			setNotificationsOpen(false);
			return;
		}
		if (isAgentWalletClaimNotification(item)) {
			if (isAgentNotificationAudience) {
				const agentParams = new URLSearchParams();
				if (item.agentId) agentParams.set("agentId", item.agentId);
				if (item.walletTransactionId) {
					agentParams.set("walletTransactionId", item.walletTransactionId);
				}
				history.push(
					`/hotel-management/financials/${targetOwnerId}/${targetHotelId}?${agentParams.toString()}`
				);
			} else {
				const params = new URLSearchParams();
				if (targetOwnerId) params.set("ownerId", targetOwnerId);
				params.set("overall", "wallet-management");
				params.set("walletTab", "update");
				params.set("hotelId", targetHotelId);
				if (item.agentId) params.set("agentId", item.agentId);
				if (item.walletTransactionId) {
					params.set("transactionId", item.walletTransactionId);
				}
				history.push(`/hotel-management/main-dashboard?${params.toString()}`);
			}
			setNotificationsOpen(false);
			return;
		}
		if (
			isAgentNotificationAudience ||
			item.notificationType === "agent_decision" ||
			item.notificationType === "agent_review"
		) {
			history.push(buildSingleHotelPendingRoute(item, targetOwnerId, targetHotelId));
			setNotificationsOpen(false);
			return;
		}
		history.push(buildSingleHotelPendingRoute(item, targetOwnerId, targetHotelId));
		setNotificationsOpen(false);
	};

	// Target user for modal (self)
	const targetUser = useMemo(() => {
		// Non-admins: modal edits the logged-in user (self)
		return { _id: user._id, name: user.name, email: user.email };
	}, [user]);

	const roleLabel = isSystemAdminTopNavUser(user)
		? "Hotel System Admin"
		: user.role === 1000
		  ? "Super Admin"
		  : user.role === 2000
		    ? "Owner"
		    : "User";
	const selfRoleLabel = getRespectfulSelfRoleLabel(user, isArabic);
	const displayedRoleLabel = selfRoleLabel || roleLabel;
	const hasSelfPositionLabel = Boolean(selfRoleLabel);
	const previewWorkspaceLabel =
		dashboardPreview && (selfRoleLabel || roleLabel !== "User")
			? displayedRoleLabel
			: "";
	const previewLandingPath = useMemo(() => {
		if (!dashboardPreview) return "";
		const ownerContextId =
			normalizeTopNavId(dashboardPreview.ownerId) ||
			queryOwnerId ||
			selectedHotelOwnerId ||
			normalizeTopNavId(
				selectedHotel.belongsTo?._id ||
					selectedHotel.belongsTo ||
					selectedHotel.ownerId
			) ||
			normalizeTopNavId(user?._id);
		return mainDashboardPath(ownerContextId, { summary: true });
	}, [
		dashboardPreview,
		queryOwnerId,
		selectedHotel,
		selectedHotelOwnerId,
		user,
	]);
	const openPreviewLanding = useCallback(() => {
		if (!dashboardPreview || !previewLandingPath) return;
		setProfileMenuOpen(false);
		setSettingsDropdownOpen(false);
		history.push(previewLandingPath);
	}, [dashboardPreview, history, previewLandingPath]);
	const previewLandingTitle = isArabic
		? "\u0641\u062a\u062d \u0635\u0641\u062d\u0629 \u0627\u0644\u0628\u062f\u0621 \u0644\u0647\u0630\u0627 \u0627\u0644\u062d\u0633\u0627\u0628"
		: "Open this account's landing page";
	const notificationCount = Number(notificationFeed.total || 0);
	const chatNotificationCount = Number(
		chatUnreadSummary.unreadMessages || chatUnreadSummary.unreadChats || 0
	);
	const notificationPanel = (
		<NotificationPanel $isArabic={isArabic}>
			{false && (
			<NotificationHeader>
				<div>
					<NotificationTitle>
						{isAgentNotificationAudience
							? isArabic
								? "تحديثات الحجوزات"
								: "Reservation Updates"
							: isFinanceNotificationAudience
							? isArabic
								? "Commission Reviews"
								: "Commission Reviews"
							: isArabic
							? "تأكيد الحجوزات"
							: "Reservation Confirmations"}
					</NotificationTitle>
					<NotificationSubtitle>
						{isAgentNotificationAudience
							? isArabic
								? "تظهر لك فقط تحديثات حجوزاتك."
								: "Only updates for your own reservations."
							: isFinanceNotificationAudience
							? isArabic
								? "Reservations waiting for commission assignment."
								: "Reservations waiting for commission assignment."
							: notificationHotelId
							? isArabic
								? "تنبيهات الفندق المحدد فقط."
								: "Alerts for this hotel only."
							: isArabic
							? "تنبيهات كل الفنادق التي يمكنك إدارتها."
							: "Alerts across the hotels you can manage."}
					</NotificationSubtitle>
				</div>
				<NotificationPill>{notificationCount}</NotificationPill>
			</NotificationHeader>
			)}

			{notificationsLoading ? (
				<NotificationLoading>
					<Spin size='small' />
				</NotificationLoading>
			) : notificationFeed.data.length ? (
				<NotificationList>
					{notificationFeed.data.map((item) => {
						const agentAccountNotice = isAgentAccountNotification(item);
						const staffApplicationNotice = isStaffApplicationNotification(item);
						const agentWalletNotice = isAgentWalletClaimNotification(item);
						const housekeepingNotice =
							item.notificationType === "housekeeping_task";
						const tone = notificationTone(item);
						const reasons = Array.isArray(item.pendingReasons)
							? item.pendingReasons
							: [];
						const visibleReasons =
							item.notificationType === "agent_review" && !reasons.length
								? ["agent_pending_review"]
								: reasons.length
								? reasons
								: item.notificationType === "agent_review"
								? ["agent_pending_review"]
								: [];
						const agentDecisionText =
							item.decisionStatus === "rejected"
								? isArabic
									? "تم رفض الحجز"
									: "Reservation rejected"
								: item.decisionStatus === "confirmed"
								? isArabic
									? "تم قبول الحجز"
									: "Reservation confirmed"
								: "";
						const agentDecisionDisplayText =
							cleanAgentDecisionText(item, isArabic) || agentDecisionText;
						const financeAcceptedTitle = isArabic
							? "تمت الموافقة المالية"
							: "Finance accepted";
						const financeRejectedTitle = isArabic
							? "\u0631\u0641\u0636 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629"
							: "Finance correction required";
						const agentAccountTitle =
							item.notificationType === "agent_account_approved"
								? isArabic
									? "\u062a\u0645\u062a \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0648\u0643\u064a\u0644"
									: "Agent approved"
								: item.notificationType === "agent_account_rejected"
								? isArabic
									? "\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u0648\u0643\u064a\u0644"
									: "Agent rejected"
								: isArabic
								? "\u0645\u0648\u0627\u0641\u0642\u0629 \u0648\u0643\u064a\u0644"
								: "Agent approval";
						const staffApplicationTitle = isArabic
							? "\u0637\u0644\u0628 \u0648\u0638\u064a\u0641\u0629"
							: "Job application";
						const walletClaimTitle =
							item.notificationType === "agent_wallet_claim_rejected"
								? isArabic
									? "\u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u0631\u0641\u0648\u0636\u0629"
									: "Wallet claim rejected"
								: item.notificationType === "agent_wallet_claim_approved"
								? isArabic
									? "\u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u0642\u0628\u0648\u0644\u0629"
									: "Wallet claim approved"
								: isArabic
								? "\u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u062d\u0641\u0638\u0629"
								: "Wallet claim";
						return (
							<NotificationItem
								key={item._id}
								type='button'
								$tone={tone}
								onClick={() => goToPendingNotification(item)}
							>
								<NotificationItemTop>
									<strong>
										{housekeepingNotice
											? isArabic
												? "Ù…Ù‡Ù…Ø© Ù†Ø¸Ø§ÙØ©"
												: "Housekeeping task"
											: agentWalletNotice
											? walletClaimTitle
											: staffApplicationNotice
											? staffApplicationTitle
											: agentAccountNotice
											? agentAccountTitle
											: item.notificationType === "agent_finance_accepted"
											? isArabic ? "تمت الموافقة المالية" : financeAcceptedTitle
											: item.notificationType === "agent_finance_rejected"
											? financeRejectedTitle
											: item.confirmation_number || "N/A"}
									</strong>
									{!agentAccountNotice && !staffApplicationNotice && !housekeepingNotice && (
										<span>{formatNotificationMoney(item.total_amount)} SAR</span>
									)}
								</NotificationItemTop>
								<NotificationGuest>
									{housekeepingNotice
										? item.taskLabel || "Housekeeping task"
										: agentWalletNotice
										? item.agentName || item.guestName || "Agent"
										: item.guestName || (isArabic ? "ضيف بدون اسم" : "Unnamed guest")}
								</NotificationGuest>
								<NotificationMeta>
									<span>
										{item.hotelName
											? titleCaseHotelName(item.hotelName)
											: item.booking_source || "Hotel"}
									</span>
									<span>
										{housekeepingNotice
											? formatNotificationDate(item.taskDate, isArabic)
											: `${formatNotificationDate(item.checkin_date, isArabic)}${
													item.checkout_date ? " - " : ""
											  }${formatNotificationDate(item.checkout_date, isArabic)}`}
									</span>
								</NotificationMeta>
								<NotificationReasons $tone={tone}>
									{housekeepingNotice ? (
										<span>
											{isArabic
												? "Ù…ÙƒÙ„ÙØ© Ù„Ùƒ"
												: item.task_status || "Assigned to you"}
										</span>
									) : item.notificationType === "agent_decision" ? (
										<span>
											{isArabic
												? cleanAgentDecisionText(item, isArabic)
												: agentDecisionDisplayText}
										</span>
									) : (
										visibleReasons.slice(0, 2).map((reason) => (
											<span key={reason}>
												{cleanNotificationReasonLabel(
													reason,
													isArabic,
													isAgentNotificationAudience
												)}
											</span>
										))
									)}
								</NotificationReasons>
							</NotificationItem>
						);
					})}
				</NotificationList>
			) : (
				<NotificationEmpty>
					<Empty
						image={Empty.PRESENTED_IMAGE_SIMPLE}
						description={
							isArabic ? "لا توجد حجوزات تحتاج تأكيداً." : "No pending items."
						}
					/>
				</NotificationEmpty>
			)}
		</NotificationPanel>
	);

	const renderNotificationsDropdown = (trigger) => (
		<Dropdown
			trigger={["click"]}
			open={notificationsOpen}
			onOpenChange={handleNotificationOpenChange}
			dropdownRender={() => notificationPanel}
			placement={isArabic ? "bottomLeft" : "bottomRight"}
			getPopupContainer={() => document.body}
			autoAdjustOverflow
			destroyPopupOnHide={false}
			overlayClassName='top-navbar-notification-dropdown'
		>
			{trigger}
		</Dropdown>
	);

	return (
		<NavbarWrapper $isArabic={chosenLanguage === "Arabic"}>
			<TopNavbarGlobalStyles />
			<LeftSection>
				<Logo $show={collapsed} $isArabic={chosenLanguage === "Arabic"}>
					<img
						src='https://res.cloudinary.com/infiniteapps/image/upload/v1732323307/janat/1732323307087.png'
						alt='jannatbooking'
						style={{ width: "200px" }}
					/>
				</Logo>
				<DigitalClockWrapper>
					<DigitalClock isArabic={isArabic} />
				</DigitalClockWrapper>
			</LeftSection>

			<MiddleSection>
				{dashboardPreview ? (
					<PreviewWorkspaceBanner
						$isArabic={isArabic}
						title={[
							user?.name || "",
							previewWorkspaceLabel,
							hotelName,
						]
							.filter(Boolean)
							.join(" - ")}
					>
						<span>{isArabic ? "\u0645\u0639\u0627\u064a\u0646\u0629 \u0643\u0640" : "Previewing as"}</span>
						{previewWorkspaceLabel && <em>{previewWorkspaceLabel}</em>}
						<PreviewNameButton
							type='button'
							onClick={openPreviewLanding}
							title={previewLandingTitle}
						>
							{user?.name || ""}
						</PreviewNameButton>
						{hotelName && <small>{hotelName}</small>}
					</PreviewWorkspaceBanner>
				) : (
					hotelName && <HotelName>{hotelName}</HotelName>
				)}
			</MiddleSection>

			<RightSection>
				{dashboardPreview && (
					<PreviewChip>
						<span>
							{isArabic ? "معاينة:" : "Previewing:"} {user?.name || ""}
						</span>
						<button type='button' onClick={stopPreview}>
							{isArabic ? "إنهاء" : "Exit"}
						</button>
					</PreviewChip>
				)}
				<Icons $isArabic={isArabic}>
					<IconWrapper
						$isArabic={isArabic}
						className='topnav-language-action'
						onClick={toggleLanguage}
						role='button'
						aria-label='Toggle language'
					>
						<GlobalOutlined className='mx-2' />
						<LanguageText>
							{chosenLanguage === "English" ? "AR" : "En"}
						</LanguageText>
					</IconWrapper>

					{canUseMainDashboardSettingsCalendar ? (
						<Dropdown
							menu={{
								items: settingsMenuItems,
								onClick: handleSettingsMenuClick,
							}}
							trigger={["click"]}
							open={settingsDropdownOpen}
							onOpenChange={handleSettingsOpenChange}
							placement={isArabic ? "bottomLeft" : "bottomRight"}
							getPopupContainer={() => document.body}
							overlayClassName='top-navbar-settings-dropdown'
						>
							<IconWrapper
								$isArabic={isArabic}
								role='button'
								aria-label='Hotel settings'
							>
								<SettingOutlined />
							</IconWrapper>
						</Dropdown>
					) : (
						<IconWrapper
							$isArabic={isArabic}
							onClick={handleSettingsClick}
							role='button'
							aria-label='Hotel settings'
						>
							<SettingOutlined />
						</IconWrapper>
					)}

					<IconWrapper $isArabic={isArabic} className='topnav-calendar-action'>
						<Dropdown
							menu={{
								items: calendarMenuItems,
								onClick: handleCalendarMenuClick,
							}}
							trigger={["click"]}
							open={roomTypesDropdown}
							onOpenChange={handleCalendarOpenChange}
						>
							<div style={{ display: "flex", alignItems: "center" }}>
								<CalendarOutlined
									className='mx-2'
									style={{ color: "#eecccc" }}
								/>
								<LanguageText2>
									{isArabic ? "\u0627\u0644\u062a\u0642\u0648\u064a\u0645" : "Calendar"}
								</LanguageText2>
							</div>
						</Dropdown>
					</IconWrapper>

					<IconWrapper
						$isArabic={isArabic}
						className='topnav-shomoos-action'
					>
						شُموس
						<NotificationDot2 />
					</IconWrapper>

					{!isMobileNav &&
						renderNotificationsDropdown(
							<IconWrapper
								$isArabic={isArabic}
								className={
									notificationBellRinging
										? "topnav-labeled-action notification-bell-ringing"
										: "topnav-labeled-action"
								}
								role='button'
								aria-label={isArabic ? "الإشعارات" : "Notifications"}
							>
								<ActionLabel>{isArabic ? "إشعارات" : "Alerts"}</ActionLabel>
								<Badge
									count={canUseNotifications ? notificationCount : 0}
									size='small'
									overflowCount={99}
									offset={[1, -2]}
								>
									<BellOutlined
										className={
											notificationBellRinging
												? "notification-bell-ringing"
												: ""
										}
									/>
								</Badge>
							</IconWrapper>
						)}

					<IconWrapper
						$isArabic={isArabic}
						className={
							chatPingRinging
								? "topnav-labeled-action chat-ping-ringing"
								: "topnav-labeled-action"
						}
						onClick={handleChatClick}
					>
						<ActionLabel>{isArabic ? "رسائل" : "Messages"}</ActionLabel>
						<Badge
							count={chatNotificationCount}
							size='small'
							overflowCount={99}
							offset={[2, -2]}
						>
							<MessageOutlined />
						</Badge>
					</IconWrapper>
				</Icons>

				<ProfileMenu>
					<Dropdown
						menu={{
							items: profileMenuItems,
							onClick: handleMenuClick,
						}}
						trigger={["click"]}
						open={profileMenuOpen}
						onOpenChange={handleProfileOpenChange}
						placement={isArabic ? "bottomLeft" : "bottomRight"}
						getPopupContainer={() => document.body}
						overlayClassName='top-navbar-profile-dropdown'
					>
						<Profile>
							<UserOutlined
								style={{
									fontSize: "30px",
									color: "#fff",
									marginInlineEnd: "10px",
								}}
							/>
							<div>
								<span>Hi {user.name?.split(" ")[0]}</span>
								<ProfileRole
									$isArabic={isArabic}
									$isPosition={hasSelfPositionLabel}
									title={displayedRoleLabel}
								>
									{hasSelfPositionLabel && <IdcardOutlined />}
									{displayedRoleLabel}
								</ProfileRole>
							</div>
						</Profile>
					</Dropdown>
				</ProfileMenu>
			</RightSection>

			<MobileActions>
				<MobileTopButton
					type='button'
					onClick={toggleLanguage}
					aria-label='Toggle language'
				>
					<GlobalOutlined />
					<span>{chosenLanguage === "English" ? "AR" : "En"}</span>
				</MobileTopButton>
				{isMobileNav &&
					canUseNotifications &&
					renderNotificationsDropdown(
						<MobileTopButton
							type='button'
							aria-label={isArabic ? "الإشعارات" : "Notifications"}
						>
							<Badge
								count={canUseNotifications ? notificationCount : 0}
								size='small'
								overflowCount={99}
								offset={[4, -4]}
							>
								<BellOutlined
									className={
										notificationBellRinging ? "notification-bell-ringing" : ""
									}
								/>
							</Badge>
						</MobileTopButton>
					)}
				<MobileTopButton
					type='button'
					onClick={handleChatClick}
					aria-label={isArabic ? "\u0627\u0644\u0631\u0633\u0627\u0626\u0644" : "Messages"}
					className={chatPingRinging ? "chat-ping-ringing" : ""}
				>
					<Badge
						count={chatNotificationCount}
						size='small'
						overflowCount={99}
						offset={[4, -4]}
					>
						<MessageOutlined />
					</Badge>
				</MobileTopButton>
				<Dropdown
					menu={{
						items: profileMenuItems,
						onClick: handleMenuClick,
					}}
					trigger={["click"]}
					open={profileMenuOpen}
					onOpenChange={handleProfileOpenChange}
					placement={isArabic ? "bottomLeft" : "bottomRight"}
					getPopupContainer={() => document.body}
					overlayClassName='top-navbar-profile-dropdown'
				>
					<MobileTopButton
						type='button'
						data-variant='profile'
						aria-label={isArabic ? "Account" : "Account menu"}
					>
						<UserOutlined />
					</MobileTopButton>
				</Dropdown>
			</MobileActions>

			{/* ===== Account Update Modal (self) for non-admins ===== */}
			{user.role !== 1000 && (
				<UpdateAccountModal
					open={accountModalOpen}
					onClose={() => setAccountModalOpen(false)}
					token={token}
					targetUser={targetUser}
					actingUser={user}
					mode='self'
					onUpdated={() => {
						// No-op; UpdateAccountModal already patches localStorage user name/email.
						// If you keep user context elsewhere, refresh it here.
					}}
				/>
			)}
		</NavbarWrapper>
	);
};

export default TopNavbar;

/* ======================== Styled Components ======================== */

const TopNavbarGlobalStyles = createGlobalStyle`
	:root {
		--pms-metal-purple-dark: #24102d;
		--pms-metal-purple-deep: #3b1248;
		--pms-metal-purple: #64166e;
		--pms-metal-purple-lift: #8d4c9d;
		--pms-metal-purple-glint: #f3dcff;
		--pms-metal-blue-dark: #102033;
		--pms-metal-blue: #17395f;
		--pms-metal-blue-lift: #2d5d91;
		--pms-metal-blue-bg: linear-gradient(180deg, #244e7d 0%, #102033 100%);
		--pms-metal-purple-bg: linear-gradient(
			135deg,
			#24102d 0%,
			#3b1248 28%,
			#7a328b 52%,
			#4e175d 74%,
			#251127 100%
		);
		--pms-metal-purple-soft: linear-gradient(
			135deg,
			#fffaff 0%,
			#f2e5f7 48%,
			#ffffff 100%
		);
		--pms-gold: #d99225;
		--pms-table-header-bg: linear-gradient(180deg, #244e7d 0%, #102033 100%);
		--pms-table-header-color: #ffffff;
		--pms-table-header-border: #2d5d91;
	}

	body .ant-btn-primary:not(.ant-btn-dangerous) {
		border-color: rgba(141, 76, 157, 0.88) !important;
		background: var(--pms-metal-purple-bg) !important;
		color: #ffffff !important;
		font-weight: 900;
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.18),
			0 9px 20px rgba(80, 23, 96, 0.24) !important;
	}

	body .ant-btn-primary:not(.ant-btn-dangerous):hover,
	body .ant-btn-primary:not(.ant-btn-dangerous):focus {
		border-color: rgba(243, 220, 255, 0.9) !important;
		filter: brightness(1.06) saturate(1.05);
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.24),
			0 12px 24px rgba(80, 23, 96, 0.32) !important;
	}

	body .btn-primary,
	body .btn-info {
		border-color: rgba(141, 76, 157, 0.85) !important;
		background: var(--pms-metal-purple-bg) !important;
		color: #ffffff !important;
		box-shadow: 0 8px 18px rgba(80, 23, 96, 0.22);
	}

	body .ant-input:hover,
	body .ant-input-affix-wrapper:hover,
	body .ant-select:not(.ant-select-disabled):hover .ant-select-selector,
	body .ant-picker:hover {
		border-color: rgba(141, 76, 157, 0.72) !important;
	}

	body .ant-input:focus,
	body .ant-input-focused,
	body .ant-input-affix-wrapper-focused,
	body .ant-input-affix-wrapper:focus-within,
	body .ant-select-focused .ant-select-selector,
	body .ant-picker-focused {
		border-color: var(--pms-metal-purple-lift) !important;
		box-shadow: 0 0 0 3px rgba(100, 22, 110, 0.14) !important;
	}

	body .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
		color: var(--pms-metal-purple) !important;
		font-weight: 950;
	}

	body .ant-tabs-ink-bar,
	body .ant-switch-checked {
		background: var(--pms-metal-purple-bg) !important;
	}

	body .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled),
	body .ant-pagination-item-active {
		border-color: var(--pms-metal-purple-lift) !important;
		color: var(--pms-metal-purple) !important;
	}

	body .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)::before {
		background-color: var(--pms-metal-purple-lift) !important;
	}

	body .ant-tag-purple {
		border-color: #d9b8df;
		background: #fbf6ff;
		color: #5d1d6e;
		font-weight: 800;
	}

	@keyframes topNavbarBellRing {
		0% {
			transform: rotate(0deg) scale(1);
		}
		14% {
			transform: rotate(16deg) scale(1.08);
		}
		28% {
			transform: rotate(-14deg) scale(1.08);
		}
		42% {
			transform: rotate(12deg) scale(1.05);
		}
		56% {
			transform: rotate(-8deg) scale(1.04);
		}
		70% {
			transform: rotate(5deg) scale(1.02);
		}
		100% {
			transform: rotate(0deg) scale(1);
		}
	}

	@keyframes topNavbarChatPing {
		0% {
			transform: translateY(0) scale(1);
			filter: drop-shadow(0 0 0 rgba(45, 93, 145, 0));
		}
		34% {
			transform: translateY(-2px) scale(1.11);
			filter: drop-shadow(0 0 9px rgba(45, 93, 145, 0.62));
		}
		68% {
			transform: translateY(1px) scale(0.98);
			filter: drop-shadow(0 0 5px rgba(141, 76, 157, 0.45));
		}
		100% {
			transform: translateY(0) scale(1);
			filter: drop-shadow(0 0 0 rgba(45, 93, 145, 0));
		}
	}

	.notification-bell-ringing {
		animation: topNavbarBellRing 0.88s ease-in-out;
		color: #fde047 !important;
		filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.65));
		transform-origin: 50% 4px;
	}

	.notification-bell-ringing .anticon-bell,
	.notification-bell-ringing svg {
		animation: topNavbarBellRing 0.88s ease-in-out;
		color: #fde047 !important;
		filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.65));
		transform-origin: 50% 4px;
	}

	.chat-ping-ringing .anticon-message,
	.chat-ping-ringing svg {
		animation: topNavbarChatPing 0.62s ease-in-out;
		color: #9bd7ff !important;
		transform-origin: 50% 50%;
	}

	@media (max-width: 760px) {
		.top-navbar-notification-dropdown {
			position: fixed !important;
			top: 78px !important;
			left: 9px !important;
			right: 9px !important;
			width: auto !important;
			max-width: none !important;
			transform: none !important;
			z-index: 2100 !important;
		}

		.top-navbar-profile-dropdown {
			position: fixed !important;
			top: 78px !important;
			right: 10px !important;
			left: auto !important;
			min-width: 230px !important;
			transform: none !important;
			z-index: 2101 !important;
		}

		.top-navbar-settings-dropdown {
			position: fixed !important;
			top: 78px !important;
			right: 10px !important;
			left: auto !important;
			min-width: 230px !important;
			transform: none !important;
			z-index: 2101 !important;
		}

		.top-navbar-profile-dropdown .ant-dropdown-menu {
			padding: 8px;
			border: 1px solid #c7e5ff;
			border-radius: 14px;
			box-shadow: 0 16px 38px rgba(15, 23, 42, 0.22);
		}

		.top-navbar-profile-dropdown .ant-dropdown-menu-item {
			min-height: 40px;
			border-radius: 10px;
			font-weight: 800;
		}

		.top-navbar-settings-dropdown .ant-dropdown-menu {
			padding: 8px;
			border: 1px solid #c7e5ff;
			border-radius: 14px;
			box-shadow: 0 16px 38px rgba(15, 23, 42, 0.22);
		}

		.top-navbar-settings-dropdown .ant-dropdown-menu-item {
			min-height: 40px;
			border-radius: 10px;
			font-weight: 800;
			text-transform: capitalize;
		}
	}
`;

const NavbarWrapper = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 70px;
	background:
		linear-gradient(
			120deg,
			rgba(255, 255, 255, 0.04) 0%,
			rgba(255, 255, 255, 0) 36%
		),
		linear-gradient(180deg, #211b2d 0%, #171525 100%);
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 18px;
	box-shadow: 0 4px 18px rgba(26, 12, 38, 0.34);
	border-bottom: 1px solid rgba(141, 76, 157, 0.28);
	z-index: 1000;
	direction: ${(props) => (props.$isArabic ? "rtl" : "")} !important;
	min-width: 0;
	overflow: hidden;
	font-family: ${(props) =>
		props.$isArabic
			? `"Droid Arabic Kufi", "Tajawal", "Cairo", "Noto Kufi Arabic", "Segoe UI", Tahoma, Arial, sans-serif`
			: `"Inter", "Segoe UI", Arial, sans-serif`};
	letter-spacing: 0;

	@media (max-width: 760px) {
		direction: ltr !important;
		gap: 10px;
		justify-content: flex-start;
		padding: ${(props) =>
			props.$isArabic ? "0 62px 0 10px" : "0 10px 0 62px"};
	}
`;

const LeftSection = styled.div`
	display: flex;
	align-items: center;
	flex: 0 0 auto;
	min-width: 0;
	gap: 12px;
`;

const Logo = styled.div`
	display: flex;
	align-items: center;
	margin-right: ${(props) =>
		props.$show && props.$isArabic ? "50px" : ""} !important;

	img {
		width: 156px !important;
		margin: auto 10px;
		display: block;
	}

	@media (max-width: 980px) {
		img {
			width: 120px !important;
			margin: auto 8px;
		}
	}

	@media (max-width: 760px) {
		display: none;
	}
`;

const DigitalClockWrapper = styled.div`
	margin-inline: 10px 0;

	@media (max-width: 760px) {
		display: none;
	}
`;

const MiddleSection = styled.div`
	flex: 1;
	min-width: 0;
	text-align: center;
	text-transform: capitalize;

	@media (max-width: 760px) {
		order: -1;
		text-align: start;
	}
`;

const HotelName = styled.span`
	font-weight: bold;
	color: white;
	font-size: 22px;
	display: block;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);

	@media (max-width: 760px) {
		font-size: 16px;
		line-height: 1.2;
	}
`;

const PreviewWorkspaceBanner = styled.div`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	max-width: min(100%, 520px);
	padding: 5px 12px;
	border: 1px solid rgba(246, 211, 120, 0.28);
	border-radius: 999px;
	background:
		linear-gradient(135deg, rgba(246, 211, 120, 0.16), rgba(255, 255, 255, 0.04)),
		rgba(16, 16, 26, 0.52);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.08),
		0 8px 22px rgba(0, 0, 0, 0.18);
	color: #ffffff;
	font-weight: 900;
	line-height: 1.2;
	white-space: nowrap;
	overflow: hidden;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	letter-spacing: 0;

	span {
		flex: 0 0 auto;
		color: #f7d77a;
		font-size: 0.68rem;
		font-weight: 950;
		text-transform: uppercase;
	}

	strong,
	em,
	small {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		font-style: normal;
	}

	strong {
		max-width: 160px;
		color: #ffffff;
		font-size: 0.88rem;
	}

	em {
		max-width: 220px;
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(217, 146, 37, 0.16);
		color: #ffe7a3;
		font-size: ${(props) => (props.$isArabic ? "0.66rem" : "0.7rem")};
	}

	small {
		max-width: 170px;
		color: #c7c4d2;
		font-size: 0.68rem;
		font-weight: 800;
	}

	@media (max-width: 1120px) {
		max-width: 360px;

		small {
			display: none;
		}
	}

	@media (max-width: 760px) {
		max-width: 100%;
		padding: 4px 8px;

		strong {
			max-width: 120px;
		}

		em {
			max-width: 145px;
		}
	}
`;

const PreviewNameButton = styled.button`
	min-width: 0;
	max-width: 160px;
	border: 0;
	background: transparent;
	color: #ffffff;
	padding: 0;
	font: inherit;
	font-size: 0.88rem;
	font-weight: 950;
	line-height: 1.2;
	cursor: pointer;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	direction: inherit;
	letter-spacing: 0;

	&:hover {
		color: #f7d77a;
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
	}

	&:focus-visible {
		outline: 2px solid rgba(247, 215, 122, 0.82);
		outline-offset: 3px;
		border-radius: 999px;
	}

	@media (max-width: 760px) {
		max-width: 120px;
	}
`;

const RightSection = styled.div`
	display: flex;
	align-items: center;
	gap: 0.6rem;
	flex: 0 0 auto;
	min-width: 0;

	@media (max-width: 760px) {
		display: none;
	}
`;

const PreviewChip = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	max-width: 260px;
	padding: 0.34rem 0.48rem;
	border: 1px solid rgba(253, 230, 138, 0.8);
	border-radius: 8px;
	background: #fef3c7;
	color: #713f12;
	font-size: 0.78rem;
	font-weight: 900;

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	button {
		border: 0;
		border-radius: 6px;
		background: #92400e;
		color: #fff;
		font-size: 0.72rem;
		font-weight: 900;
		padding: 0.2rem 0.46rem;
		cursor: pointer;
	}

	@media (max-width: 920px) {
		display: none;
	}
`;

const MobileActions = styled.div`
	display: none;

	@media (max-width: 760px) {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 0 0 auto;
		margin-left: auto;
	}
`;

const MobileTopButton = styled.button`
	position: relative;
	min-width: 44px;
	height: 44px;
	padding: 0 12px;
	border: 1px solid rgba(255, 255, 255, 0.28);
	border-radius: 4px;
	background: var(--pms-metal-purple-bg);
	color: #fff;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	font-weight: 900;
	line-height: 1;
	cursor: pointer;
	box-shadow:
		inset 0 1px rgba(255, 255, 255, 0.18),
		0 8px 18px rgba(79, 19, 91, 0.34);
	transition: transform 0.15s ease, box-shadow 0.15s ease,
		border-color 0.15s ease;

	&:active {
		transform: translateY(1px);
		box-shadow: 0 5px 12px rgba(79, 19, 91, 0.26);
	}

	&:focus-visible {
		outline: 3px solid rgba(255, 255, 255, 0.85);
		outline-offset: 2px;
	}

	svg {
		font-size: 21px;
		color: #fff;
	}

	span {
		font-size: 0.86rem;
	}

	.ant-badge {
		display: inline-flex;
		align-items: center;
	}

	.ant-badge-count {
		font-weight: 900;
		box-shadow: 0 0 0 2px #1e1e2d;
	}

	@media (max-width: 420px) {
		min-width: 40px;
		height: 40px;
		padding: 0 10px;
		border-radius: 12px;

		svg {
			font-size: 19px;
		}
	}
`;

const NotificationPanel = styled.div`
	width: min(380px, calc(100vw - 24px));
	max-height: min(520px, calc(100vh - 90px));
	overflow: auto;
	padding: 12px;
	border: 1px solid #b9dcff;
	border-radius: 12px;
	background: #ffffff;
	box-shadow: 0 16px 38px rgba(15, 23, 42, 0.22);
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};

	@media (max-width: 760px) {
		width: calc(100vw - 18px);
		max-height: calc(100vh - 86px);
	}
`;

const NotificationHeader = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;
	padding: 10px;
	border-radius: 10px;
	background: #eaf6ff;
	border: 1px solid #c7e5ff;
`;

const NotificationTitle = styled.div`
	font-size: 1rem;
	font-weight: 900;
	color: #0f2a45;
`;

const NotificationSubtitle = styled.div`
	margin-top: 3px;
	font-size: 0.78rem;
	font-weight: 700;
	color: #52708c;
`;

const NotificationPill = styled.span`
	min-width: 34px;
	height: 28px;
	padding: 0 9px;
	border-radius: 999px;
	background: var(--pms-metal-purple-bg);
	color: #fff;
	font-weight: 900;
	display: inline-flex;
	align-items: center;
	justify-content: center;
`;

const NotificationLoading = styled.div`
	min-height: 120px;
	display: flex;
	align-items: center;
	justify-content: center;
`;

const NotificationList = styled.div`
	display: grid;
	gap: 8px;
	margin-top: 10px;
`;

const NotificationItem = styled.button`
	width: 100%;
	padding: 10px;
	border: 1px solid
		${(props) =>
			props.$tone === "success"
				? "#9ee5b3"
				: props.$tone === "danger"
				? "#ffc4cc"
				: props.$tone === "warning"
				? "#ffd8a8"
				: "#cfe4ff"};
	border-radius: 10px;
	background: ${(props) =>
		props.$tone === "success"
			? "#f0fff5"
			: props.$tone === "danger"
			? "#fff5f6"
			: props.$tone === "warning"
			? "#fffaf0"
			: "#fbfdff"};
	text-align: inherit;
	cursor: pointer;
	transition: border-color 0.15s ease, transform 0.15s ease,
		box-shadow 0.15s ease;

	&:hover {
		border-color: var(--pms-metal-purple-lift, #8d4c9d);
		box-shadow: 0 10px 22px rgba(80, 23, 96, 0.14);
		transform: translateY(-1px);
	}
`;

const NotificationItemTop = styled.div`
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 0.9rem;
	color: #0f172a;

	strong,
	span {
		direction: ltr;
		unicode-bidi: plaintext;
	}
`;

const NotificationGuest = styled.div`
	margin-top: 5px;
	font-size: 0.86rem;
	font-weight: 800;
	color: #1e3a5f;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
`;

const NotificationMeta = styled.div`
	margin-top: 5px;
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 0.74rem;
	font-weight: 700;
	color: #64748b;

	span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
`;

const NotificationReasons = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
	margin-top: 8px;

	span {
		border: 1px solid
			${(props) =>
				props.$tone === "success"
					? "#8bdca7"
					: props.$tone === "danger"
					? "#ffb3bd"
					: "#ffbf8a"};
		background: ${(props) =>
			props.$tone === "success"
				? "#e9fff0"
				: props.$tone === "danger"
				? "#fff0f2"
				: "#fff7ed"};
		color: ${(props) =>
			props.$tone === "success"
				? "#08763d"
				: props.$tone === "danger"
				? "#b42335"
				: "#c2410c"};
		border-radius: 999px;
		padding: 3px 8px;
		font-size: 0.7rem;
		font-weight: 900;
	}
`;

const NotificationEmpty = styled.div`
	padding: 12px 0 2px;
`;

const Icons = styled.div`
	display: flex;
	align-items: center;
	gap: 5px;
	margin-inline: 0 6px !important;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};

	svg {
		font-size: 21px;
		color: #fff;
		cursor: pointer;
	}
`;

const IconWrapper = styled.div`
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 46px;
	width: auto;
	height: 46px;
	padding: 0 10px;
	background: linear-gradient(180deg, #171525 0%, #10101a 100%);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 2px;
	margin: 0 !important;
	color: #ffffff;
	cursor: pointer;
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.04);
	transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;

	&:hover {
		background: linear-gradient(180deg, #2e243a 0%, #1c1728 100%);
		border-color: rgba(217, 146, 37, 0.42);
		transform: translateY(-1px);
	}

	&.topnav-labeled-action {
		width: 52px;
		min-width: 52px;
		height: 48px;
		padding: 4px 4px 5px;
		flex-direction: column;
		gap: 2px;
		background: var(--pms-metal-purple-bg);
		border-color: rgba(166, 98, 180, 0.72);
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.18),
			0 8px 18px rgba(80, 23, 96, 0.2);
	}

	&.topnav-labeled-action svg {
		color: #ffd24a;
		font-size: 21px;
	}

	&.topnav-language-action,
	&.topnav-calendar-action,
	&.topnav-shomoos-action {
		min-width: 62px;
		background: linear-gradient(180deg, #171525 0%, #10101a 100%);
		font-size: 0.82rem;
		font-weight: 950;
	}

	&.topnav-shomoos-action {
		color: #ffffff;
	}

	@media (max-width: 1180px) {
		&.topnav-calendar-action {
			min-width: 46px;
		}

		&.topnav-calendar-action span {
			display: none;
		}
	}
`;

const LanguageText = styled.span`
	color: #fff;
	margin-inline-start: 5px;
	font-size: 0.82rem;
	font-weight: 950;
`;

const LanguageText2 = styled.span`
	color: #f4e3ef;
	margin-inline-start: 5px;
	font-size: 0.82rem;
	font-weight: 950;
`;

const ActionLabel = styled.span`
	color: #ffffff;
	font-size: 0.66rem;
	font-weight: 950;
	line-height: 1;
	text-align: center;
`;

const NotificationDot2 = styled.div`
	position: absolute;
	top: 3px;
	right: 4px;
	width: 8px;
	height: 8px;
	background-color: lightgreen;
	border: 1px solid #1d1d2b;
	border-radius: 50%;
	animation: blink 3.5s infinite;

	@keyframes blink {
		0%,
		50%,
		100% {
			opacity: 1;
		}
		25%,
		75% {
			opacity: 0;
		}
	}
`;

const ProfileMenu = styled.div`
	display: flex;
	align-items: center;
`;

const Profile = styled.div`
	display: flex;
	align-items: center;
	cursor: pointer;
	min-height: 46px;
	padding: 0 10px;
	border-radius: 2px;
	background: linear-gradient(180deg, #171525 0%, #10101a 100%);
	border: 1px solid rgba(255, 255, 255, 0.08);
	transition: background 0.16s ease, border-color 0.16s ease;

	&:hover {
		background: linear-gradient(180deg, #2e243a 0%, #1c1728 100%);
		border-color: rgba(217, 146, 37, 0.42);
	}

	.anticon-user {
		margin-inline-end: 8px !important;
	}

	span {
		font-weight: bold;
		color: #fff;
		margin: 0 !important;
	}
	small {
		display: block;
		color: #b9b6c8;
		font-size: 12px;
	}
`;

const ProfileRole = styled.small`
	&& {
		display: ${(props) => (props.$isPosition ? "inline-flex" : "block")};
		align-items: center;
		gap: 5px;
		width: fit-content;
		max-width: 190px;
		margin-top: ${(props) => (props.$isPosition ? "2px" : "0")};
		padding: ${(props) => (props.$isPosition ? "2px 8px" : "0")};
		border: ${(props) =>
			props.$isPosition ? "1px solid rgba(246, 211, 120, 0.34)" : "0"};
		border-radius: 999px;
		background: ${(props) =>
			props.$isPosition ? "rgba(217, 146, 37, 0.13)" : "transparent"};
		color: ${(props) => (props.$isPosition ? "#f7d77a" : "#b9b6c8")};
		font-size: ${(props) => (props.$isArabic ? "11px" : "12px")};
		font-weight: ${(props) => (props.$isPosition ? 900 : 500)};
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
		letter-spacing: 0;
	}

	.anticon {
		flex: 0 0 auto;
		font-size: 0.72rem;
	}
`;
