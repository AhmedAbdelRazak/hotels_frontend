/** @format */

import React, { useCallback, useEffect, useRef, useState } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { Link, useHistory, useLocation } from "react-router-dom";
import { Badge, Dropdown, Empty, Spin, Tag } from "antd";
import {
	AppstoreOutlined,
	BarChartOutlined,
	BellOutlined,
	CalendarOutlined,
	ClockCircleOutlined,
	GlobalOutlined,
	LogoutOutlined,
	MessageOutlined,
	SettingOutlined,
	ToolOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { isAuthenticated, signout } from "../../auth";
import { isConfiguredSuperAdminUser } from "../utils/superUsers";
import {
	acknowledgeAdminHotelNotification,
	getFilteredSupportCases,
	getFilteredSupportCasesClients,
	getAdminB2BChatUnreadSummary,
	getAdminHotelNotificationFeed,
	getAdminSupportNotificationSummary,
	listAdminB2BChats,
} from "../apiAdmin";
import {
	isActiveEscalatedSupportCase,
	supportCaseAdminUnreadMessages,
} from "../utils/supportCaseChat";
import socket from "../../socket";
import EgyptFlag from "../../GeneralImages/EG_FLAG.png";
import SaudiFlag from "../../GeneralImages/KSA_FLAG.png";
import UsaFlag from "../../GeneralImages/USA_FLAG.png";
import {
	EGYPT_TIME_ZONE,
	SAUDI_TIME_ZONE,
	USA_PACIFIC_TIME_ZONE,
	formatZoneDateTime,
	formatZoneHijriDate,
} from "../../utils/worldTimeZones";

const ADMIN_BRAND_LOGO =
	"https://xhotelpro.com/static/media/XHotelLogo.706e3ec89ab26bfecf21.png";

const labels = {
	en: {
		title: "Platform Control Center",
		subtitle: "JANNAT Booking administration",
		superAdmin: "Super Admin",
		adminStaff: "Admin Staff",
		dashboard: "Dashboard",
		hotels: "Hotels",
		reservations: "Reservations",
		otaReservations: "OTA reservations",
		reports: "Reports",
		globalSettings: "Hotel settings",
		financials: "Financials",
		tools: "Tools",
		service: "Service",
		notifications: "Hotel notifications",
		egypt: "Egypt",
		saudi: "Saudi",
		language: "Ar",
		signout: "Sign out",
		account: "Account",
		notificationTitle: "Pending Hotel Actions",
		notificationSubtitle: "All hotels across the platform",
		noNotifications: "No pending hotel notifications.",
		otaPending: "New OTA reservation",
		openAction: "Open action",
		chatTitle: "Active Chats",
		chatSubtitle: "Support and B2B conversations",
		noChats: "No active chats.",
		hotelSupport: "Hotel support",
		clientSupport: "Client support",
		escalatedClientSupport: "Escalated",
		escalatedChats: "Escalated chats",
		b2bChat: "B2B chat",
		openChat: "Open chat",
	},
	ar: {
		title: "\u0645\u0631\u0643\u0632 \u0627\u0644\u062a\u062d\u0643\u0645 \u0628\u0627\u0644\u0645\u0646\u0635\u0629",
		subtitle: "\u0625\u062f\u0627\u0631\u0629 \u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u062c",
		superAdmin: "\u0645\u062f\u064a\u0631 \u0639\u0627\u0645",
		adminStaff: "\u0641\u0631\u064a\u0642 \u0627\u0644\u0625\u062f\u0627\u0631\u0629",
		dashboard: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645",
		hotels: "\u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		reservations: "\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		otaReservations: "\u062d\u062c\u0648\u0632\u0627\u062a OTA",
		reports: "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631",
		globalSettings:
			"\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		financials: "\u0627\u0644\u0645\u0627\u0644\u064a\u0629",
		tools: "\u0627\u0644\u0623\u062f\u0648\u0627\u062a",
		service: "\u062e\u062f\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
		notifications: "\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		egypt: "\u0645\u0635\u0631",
		saudi: "\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629",
		language: "En",
		signout: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c",
		account: "\u0627\u0644\u062d\u0633\u0627\u0628",
		notificationTitle: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u0639\u0644\u0642\u0629",
		notificationSubtitle: "\u0643\u0644 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629",
		noNotifications: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0641\u0646\u0627\u062f\u0642 \u0645\u0639\u0644\u0642\u0629.",
		otaPending: "\u062d\u062c\u0632 OTA \u062c\u062f\u064a\u062f",
		openAction: "\u0641\u062a\u062d \u0627\u0644\u0625\u062c\u0631\u0627\u0621",
		chatTitle: "\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629",
		chatSubtitle: "\u062f\u0639\u0645 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0648\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0645\u062d\u0627\u062f\u062b\u0627\u062a B2B",
		noChats: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0646\u0634\u0637\u0629.",
		hotelSupport: "\u062f\u0639\u0645 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		clientSupport: "\u062f\u0639\u0645 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
		escalatedClientSupport: "\u0645\u0635\u0639\u062f\u0629",
		escalatedChats: "\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0645\u0635\u0639\u062f\u0629",
		b2bChat: "\u0645\u062d\u0627\u062f\u062b\u0629 B2B",
		openChat: "\u0641\u062a\u062d \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629",
	},
};

const adminLinks = [
	{
		to: "/admin/dashboard",
		key: "dashboard",
		icon: <AppstoreOutlined />,
		access: ["AdminDashboard"],
	},
	{
		to: "/admin/all-reservations",
		key: "reservations",
		icon: <BarChartOutlined />,
		access: ["HotelsReservations", "AllReservations"],
	},
	{
		to: "/admin/ota-reservations",
		key: "otaReservations",
		icon: <BellOutlined />,
		access: ["OTAReservations"],
	},
	{
		to: "/admin/jannatbooking-tools",
		key: "tools",
		icon: <ToolOutlined />,
		access: ["JannatTools"],
	},
	{
		to: "/admin/global-hotel-settings",
		key: "globalSettings",
		icon: <SettingOutlined />,
		access: ["AdminDashboard", "HotelReports"],
	},
	{
		key: "notifications",
		icon: <BellOutlined />,
		access: ["OTAReservations"],
		iconOnly: true,
		dropdown: true,
	},
	{
		to: "/admin/customer-service",
		key: "service",
		icon: <MessageOutlined />,
		access: ["CustomerService"],
		iconOnly: true,
	},
];

const normalizeAdminId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.$oid || "");
	return String(value);
};

const notificationReasonList = (item = {}) =>
	Array.isArray(item.pendingReasons)
		? item.pendingReasons.map((reason) => String(reason || "").toLowerCase())
		: [];

const isAdminAccountNotification = (item = {}) => {
	const type = String(item.notificationType || "");
	return type.startsWith("agent_account") || type === "staff_application_pending";
};

const isAdminWalletNotification = (item = {}) =>
	String(item.notificationType || "").startsWith("agent_wallet_claim");

const buildActivationAccountsRoute = (ownerId = "") => {
	const params = new URLSearchParams();
	const targetOwnerId = normalizeAdminId(ownerId);
	if (targetOwnerId) params.set("ownerId", targetOwnerId);
	params.set("overall", "activate-accounts");
	params.set("page", "1");
	params.set("range", "custom");
	return `/hotel-management/main-dashboard?${params.toString()}`;
};

const isAdminFinancialNotification = (item = {}) => {
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
				"agent_commission_pending",
				"agent_commission_rejected",
				"finance_accepted",
				"wallet_claim_pending",
			].includes(reason)
		)
	);
};

const formatNotificationMoney = (value) =>
	Number(value || 0).toLocaleString("en-US", {
		maximumFractionDigits: 2,
	});

const formatNotificationDate = (value, isArabic = false) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat(isArabic ? "ar-EG" : "en-US", {
		month: "short",
		day: "2-digit",
		year: "numeric",
	}).format(date);
};

const notificationTitle = (item = {}, isArabic = false) => {
	const type = String(item.notificationType || "").toLowerCase();
	if (type === "ota_platform_review" || type === "ota_reservation_pending") {
		return isArabic ? labels.ar.otaPending : labels.en.otaPending;
	}
	if (type === "staff_application_pending") {
		return isArabic ? "\u0637\u0644\u0628 \u0648\u0638\u064a\u0641\u0629" : "Job application";
	}
	if (type.startsWith("agent_account")) {
		return isArabic
			? "\u0645\u0631\u0627\u062c\u0639\u0629 \u062d\u0633\u0627\u0628 \u0648\u0643\u064a\u0644"
			: "Agent account review";
	}
	if (type.startsWith("agent_wallet_claim")) {
		return isArabic
			? "\u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u062d\u0641\u0638\u0629"
			: "Wallet claim";
	}
	if (type.includes("commission") || type.includes("finance")) {
		return isArabic
			? "\u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0627\u0644\u064a\u0629"
			: "Financial review";
	}
	return item.confirmation_number || (isArabic ? "\u062d\u062c\u0632 \u0645\u0639\u0644\u0642" : "Pending reservation");
};

const notificationReasonLabel = (reason, isArabic = false) => {
	const labels = {
		pending_confirmation: {
			en: "Pending confirmation",
			ar: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u062c\u0632",
		},
		ota_platform_review: {
			en: "Awaiting platform release",
			ar: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0625\u0637\u0644\u0627\u0642 \u0627\u0644\u0645\u0646\u0635\u0629",
		},
		commission_missing: {
			en: "Commission needs review",
			ar: "\u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u062a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629",
		},
		finance_review_pending: {
			en: "Pending finance review",
			ar: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
		},
		finance_total_rejected: {
			en: "Finance rejected",
			ar: "\u0645\u0631\u0641\u0648\u0636 \u0645\u0646 \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
		},
		agent_commission_pending: {
			en: "Agent commission approval",
			ar: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0648\u0643\u064a\u0644",
		},
		agent_commission_rejected: {
			en: "Agent commission rejected",
			ar: "\u0631\u0641\u0636 \u0627\u0644\u0648\u0643\u064a\u0644 \u0644\u0644\u0639\u0645\u0648\u0644\u0629",
		},
		wallet_claim_pending: {
			en: "Wallet claim review",
			ar: "\u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u062d\u0641\u0638\u0629 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
		},
		staff_application_pending_review: {
			en: "Job application review",
			ar: "\u0637\u0644\u0628 \u0648\u0638\u064a\u0641\u0629 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
		},
		agent_account_pending_approval: {
			en: "Agent approval",
			ar: "\u0645\u0648\u0627\u0641\u0642\u0629 \u0648\u0643\u064a\u0644",
		},
		pending_rejected: {
			en: "Rejected follow-up",
			ar: "\u0645\u0631\u0641\u0648\u0636 \u0648\u064a\u062d\u062a\u0627\u062c \u0645\u062a\u0627\u0628\u0639\u0629",
		},
	};
	const entry = labels[String(reason || "").toLowerCase()];
	return entry ? entry[isArabic ? "ar" : "en"] : String(reason || "");
};

const latestSupportCaseDate = (supportCase = {}) => {
	const conversation = Array.isArray(supportCase.conversation)
		? supportCase.conversation
		: [];
	const lastMessage = conversation[conversation.length - 1] || {};
	return (
		lastMessage.date ||
		supportCase.updatedAt ||
		supportCase.createdAt ||
		new Date(0).toISOString()
	);
};

const supportCaseUnseenCount = (supportCase = {}, actorId = "") => {
	return supportCaseAdminUnreadMessages(supportCase, actorId);
};

const supportCaseTitle = (supportCase = {}, fallback = "Support case") =>
	supportCase.inquiryAbout ||
	supportCase.subject ||
	supportCase.displayName1 ||
	supportCase.displayName2 ||
	fallback;

const supportCaseSubtitle = (supportCase = {}) => {
	const hotelName =
		supportCase.hotelId?.hotelName ||
		supportCase.hotelName ||
		supportCase.displayName2 ||
		"";
	const guestName =
		supportCase.displayName1 ||
		supportCase.customerName ||
		supportCase.targetUserName ||
		"";
	return [hotelName, guestName].filter(Boolean).join(" | ");
};

const b2bChatTitle = (chat = {}, fallback = "B2B chat") => {
	if (chat.subject) return chat.subject;
	const names = (Array.isArray(chat.participants) ? chat.participants : [])
		.map((participant) => participant.name || participant.email)
		.filter(Boolean)
		.slice(0, 3);
	return names.length ? names.join(", ") : fallback;
};

const b2bChatSubtitle = (chat = {}) => {
	const last = chat.lastMessage || {};
	if (last.body) return last.body;
	const attachmentCount = Array.isArray(last.attachments)
		? last.attachments.length
		: 0;
	return attachmentCount ? `${attachmentCount} attachment(s)` : "";
};

const AdminTopNavbar = ({ chosenLanguage, languageToggle }) => {
	const history = useHistory();
	const location = useLocation();
	const [clockNow, setClockNow] = useState(() => new Date());
	const [hotelNotificationsOpen, setHotelNotificationsOpen] = useState(false);
	const [hotelNotificationsLoading, setHotelNotificationsLoading] =
		useState(false);
	const [hotelNotificationFeed, setHotelNotificationFeed] = useState({
		total: 0,
		data: [],
	});
	const [chatDropdownOpen, setChatDropdownOpen] = useState(false);
	const [chatFeedLoading, setChatFeedLoading] = useState(false);
	const [chatFeed, setChatFeed] = useState([]);
	const [chatNotificationSummary, setChatNotificationSummary] = useState({
		supportOpenCases: 0,
		supportUnseenMessages: 0,
		supportEscalatedCases: 0,
		b2bActiveChats: 0,
		b2bUnreadMessages: 0,
	});
	const auth = isAuthenticated() || {};
	const user = auth.user || {};
	const token = auth.token || "";
	const isArabic = chosenLanguage === "Arabic";
	const L = labels[isArabic ? "ar" : "en"];
	const isConfiguredSuperAdmin = isConfiguredSuperAdminUser(user);
	const hasPlatformAdminRole = [
		Number(user?.role),
		...(Array.isArray(user?.roles) ? user.roles.map(Number) : []),
	].includes(1000);
	const accessTo = Array.isArray(user.accessTo)
		? user.accessTo.map((item) => String(item || "").trim()).filter(Boolean)
		: [];
	const canAccessAdminLink = (item = {}) => {
		const accessKeys = item.access || [];
		if (accessKeys.includes("OTAReservations")) {
			return hasPlatformAdminRole && accessTo.includes("OTAReservations");
		}
		return accessKeys.some((key) => accessTo.includes(key));
	};
	const visibleLinks = (
		isConfiguredSuperAdmin
			? adminLinks
			: adminLinks.filter(canAccessAdminLink)
	).filter((item) => !item.superOnly || isConfiguredSuperAdmin);
	const hasNotificationLink = visibleLinks.some(
		(item) => item.key === "notifications"
	);
	const hasServiceLink = visibleLinks.some((item) => item.key === "service");
	const canUsePlatformNotifications =
		hasNotificationLink &&
		(isConfiguredSuperAdmin ||
			(hasPlatformAdminRole && accessTo.includes("OTAReservations")));
	const hotelNotificationCount = Number(hotelNotificationFeed.total || 0);
	const chatNotificationCount =
		Number(chatNotificationSummary.supportOpenCases || 0) +
		Number(chatNotificationSummary.b2bActiveChats || 0);
	const supportEscalatedChatCount = Number(
		chatNotificationSummary.supportEscalatedCases || 0
	);
	const [notificationBellRinging, setNotificationBellRinging] = useState(false);
	const notificationAudioContextRef = useRef(null);
	const notificationAudioUnlockedRef = useRef(false);
	const notificationBellTimerRef = useRef(null);
	const notificationFeedTotalRef = useRef(0);
	const notificationFeedReadyRef = useRef(false);
	const lastNotificationBellAtRef = useRef(0);

	useEffect(() => {
		const timer = window.setInterval(() => setClockNow(new Date()), 1000 * 30);
		return () => window.clearInterval(timer);
	}, []);

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

		const audioContext = await ensureNotificationAudioReady();
		if (!audioContext || audioContext.state !== "running") return;

		try {
			const startTime = audioContext.currentTime;
			const masterGain = audioContext.createGain();
			masterGain.gain.setValueAtTime(0.0001, startTime);
			masterGain.gain.exponentialRampToValueAtTime(0.13, startTime + 0.025);
			masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.02);
			masterGain.connect(audioContext.destination);

			[
				{ frequency: 880, offset: 0, duration: 0.22, gain: 0.58 },
				{ frequency: 1174.66, offset: 0.12, duration: 0.28, gain: 0.45 },
				{ frequency: 1567.98, offset: 0.3, duration: 0.42, gain: 0.32 },
			].forEach(({ frequency, offset, duration, gain }) => {
				const oscillator = audioContext.createOscillator();
				const noteGain = audioContext.createGain();
				const noteStart = startTime + offset;
				const noteEnd = noteStart + duration;
				oscillator.type = "sine";
				oscillator.frequency.setValueAtTime(frequency, noteStart);
				noteGain.gain.setValueAtTime(0.0001, noteStart);
				noteGain.gain.exponentialRampToValueAtTime(gain, noteStart + 0.018);
				noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
				oscillator.connect(noteGain);
				noteGain.connect(masterGain);
				oscillator.start(noteStart);
				oscillator.stop(noteEnd + 0.04);
			});
		} catch (error) {
			// Audio is best-effort; the badge still updates immediately.
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
			const audioContext = notificationAudioContextRef.current;
			if (audioContext && audioContext.state !== "closed") {
				audioContext.close().catch(() => {});
			}
		};
	}, []);

	const loadAdminChatFeed = useCallback(
		async ({ silent = false } = {}) => {
			if (!hasServiceLink || !user?._id || !token) {
				setChatFeed([]);
				return;
			}
			if (!silent) setChatFeedLoading(true);
			try {
				const [hotelCases, clientCases, b2bData] = await Promise.all([
					getFilteredSupportCases(token),
					getFilteredSupportCasesClients(token),
					listAdminB2BChats(user._id, token, { status: "active" }),
				]);
				const hotelRows = (Array.isArray(hotelCases) ? hotelCases : [])
					.filter((supportCase) => supportCase.caseStatus !== "closed")
					.map((supportCase) => ({
						id: normalizeAdminId(supportCase._id),
						kind: "hotel-support",
						title: supportCaseTitle(supportCase, L.hotelSupport),
						subtitle: supportCaseSubtitle(supportCase),
						meta: L.hotelSupport,
						unread: supportCaseUnseenCount(supportCase, user._id),
						lastAt: latestSupportCaseDate(supportCase),
						route: `/admin/customer-service?tab=active-hotel-cases&caseId=${normalizeAdminId(
							supportCase._id
						)}`,
					}));
				const clientRows = (Array.isArray(clientCases) ? clientCases : [])
					.filter((supportCase) => supportCase.caseStatus !== "closed")
					.map((supportCase) => {
						const isEscalated = isActiveEscalatedSupportCase(supportCase);
						const tab = isEscalated
							? "escalated-client-cases"
							: "active-client-cases";
						return {
							id: normalizeAdminId(supportCase._id),
							kind: isEscalated ? "client-escalated" : "client-support",
							title: supportCaseTitle(supportCase, L.clientSupport),
							subtitle: supportCaseSubtitle(supportCase),
							meta: isEscalated ? L.escalatedClientSupport : L.clientSupport,
							escalated: isEscalated,
							unread: supportCaseUnseenCount(supportCase, user._id),
							lastAt: latestSupportCaseDate(supportCase),
							route: `/admin/customer-service?tab=${tab}&caseId=${normalizeAdminId(
								supportCase._id
							)}`,
						};
					});
				const b2bRows = (Array.isArray(b2bData?.chats) ? b2bData.chats : [])
					.filter((chat) => chat.status !== "closed")
					.map((chat) => ({
						id: normalizeAdminId(chat._id),
						kind: "b2b",
						title: b2bChatTitle(chat, L.b2bChat),
						subtitle: b2bChatSubtitle(chat),
						meta: L.b2bChat,
						unread: Number(chat.unreadCount || 0),
						lastAt: chat.lastActivityAt || chat.updatedAt || chat.createdAt,
						route: `/hotel-management/b2b-chat?tab=active&chatId=${normalizeAdminId(
							chat._id
						)}`,
					}));
				setChatFeed(
					[...hotelRows, ...clientRows, ...b2bRows]
						.filter((item) => item.id && item.route)
						.sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0))
						.slice(0, 14)
				);
			} catch (error) {
				if (!silent) console.error("Failed to load admin chat feed", error);
			} finally {
				if (!silent) setChatFeedLoading(false);
			}
		},
		[
			hasServiceLink,
			L.b2bChat,
			L.clientSupport,
			L.escalatedClientSupport,
			L.hotelSupport,
			token,
			user?._id,
		]
	);

	const refreshAdminNotifications = useCallback(
		async ({ silent = false } = {}) => {
			if (!user?._id || !token) {
				setHotelNotificationFeed({ total: 0, data: [] });
				setChatNotificationSummary({
					supportOpenCases: 0,
					supportUnseenMessages: 0,
					supportEscalatedCases: 0,
					b2bActiveChats: 0,
					b2bUnreadMessages: 0,
				});
				return;
			}

			try {
				if (canUsePlatformNotifications) {
					if (!silent) setHotelNotificationsLoading(true);
					const hotelFeed = await getAdminHotelNotificationFeed({
						userId: user._id,
						token,
						limit: 12,
					});
					const nextTotal = Number(hotelFeed?.total || 0);
					const previousTotal = Number(notificationFeedTotalRef.current || 0);
					if (
						notificationFeedReadyRef.current &&
						nextTotal > previousTotal
					) {
						playNotificationBell();
					}
					notificationFeedReadyRef.current = true;
					notificationFeedTotalRef.current = nextTotal;
					setHotelNotificationFeed({
						total: nextTotal,
						data: Array.isArray(hotelFeed?.data) ? hotelFeed.data : [],
					});
				} else {
					notificationFeedReadyRef.current = false;
					notificationFeedTotalRef.current = 0;
					setHotelNotificationFeed({ total: 0, data: [] });
				}

				if (hasServiceLink) {
					const [supportSummary, b2bSummary] = await Promise.all([
						getAdminSupportNotificationSummary(user._id, token),
						getAdminB2BChatUnreadSummary(user._id, token),
					]);
					setChatNotificationSummary({
						supportOpenCases: Number(supportSummary?.openCases || 0),
						supportUnseenMessages: Number(
							supportSummary?.unseenMessages || 0
						),
						supportEscalatedCases: Number(
							supportSummary?.activeEscalatedClientCases || 0
						),
						b2bActiveChats: Number(b2bSummary?.activeChats || 0),
						b2bUnreadMessages: Number(b2bSummary?.unreadMessages || 0),
					});
				} else {
					setChatNotificationSummary({
						supportOpenCases: 0,
						supportUnseenMessages: 0,
						supportEscalatedCases: 0,
						b2bActiveChats: 0,
						b2bUnreadMessages: 0,
					});
				}
			} catch (error) {
				if (!silent) {
					console.error("Failed to load admin topbar notifications", error);
				}
			} finally {
				if (!silent) setHotelNotificationsLoading(false);
			}
		},
		[
			canUsePlatformNotifications,
			hasServiceLink,
			playNotificationBell,
			token,
			user?._id,
		]
	);

	useEffect(() => {
		refreshAdminNotifications();
		const timer = window.setInterval(
			() => refreshAdminNotifications({ silent: true }),
			30000
		);
		return () => window.clearInterval(timer);
	}, [refreshAdminNotifications]);

	useEffect(() => {
		if (!user?._id) return undefined;
		if (hasServiceLink) {
			socket.emit("joinB2BUser", { userId: user._id });
			if (isConfiguredSuperAdmin) socket.emit("joinB2BPlatform");
		}
		if (canUsePlatformNotifications) {
			socket.emit("joinPlatformNotifications");
		}

		const refreshSilently = () => {
			refreshAdminNotifications({ silent: true });
			if (chatDropdownOpen) loadAdminChatFeed({ silent: true });
		};

		socket.on("b2bChatUpdated", refreshSilently);
		socket.on("newChat", refreshSilently);
		socket.on("receiveMessage", refreshSilently);
		socket.on("closeCase", refreshSilently);
		socket.on("supportCaseEscalated", refreshSilently);
		socket.on("supportCaseEscalationAddressed", refreshSilently);
		socket.on("supportCaseEscalationUpdated", refreshSilently);
		socket.on("hotelNotificationsUpdated", refreshSilently);

		return () => {
			socket.off("b2bChatUpdated", refreshSilently);
			socket.off("newChat", refreshSilently);
			socket.off("receiveMessage", refreshSilently);
			socket.off("closeCase", refreshSilently);
			socket.off("supportCaseEscalated", refreshSilently);
			socket.off("supportCaseEscalationAddressed", refreshSilently);
			socket.off("supportCaseEscalationUpdated", refreshSilently);
			socket.off("hotelNotificationsUpdated", refreshSilently);
			if (hasServiceLink) {
				socket.emit("leaveB2BUser", { userId: user._id });
				if (isConfiguredSuperAdmin) socket.emit("leaveB2BPlatform");
			}
			if (canUsePlatformNotifications) {
				socket.emit("leavePlatformNotifications");
			}
		};
	}, [
		canUsePlatformNotifications,
		chatDropdownOpen,
		hasServiceLink,
		isConfiguredSuperAdmin,
		loadAdminChatFeed,
		refreshAdminNotifications,
		user?._id,
	]);

	const profileItems = [
		{
			key: "signout",
			icon: <LogoutOutlined />,
			label: L.signout,
			danger: true,
		},
	];

	const toggleLanguage = () => {
		const next = chosenLanguage === "Arabic" ? "English" : "Arabic";
		localStorage.setItem("lang", JSON.stringify(next));
		languageToggle(next);
	};

	const handleProfileClick = ({ key }) => {
		if (key === "signout") {
			signout(() => history.push("/"));
		}
	};

	const buildHotelNotificationRoute = (item = {}) => {
		if (
			item.notificationType === "ota_platform_review" ||
			item.notificationType === "ota_reservation_pending"
		) {
			const reservationId = normalizeAdminId(item.reservationId || item._id);
			const params = new URLSearchParams({ page: "1" });
			if (reservationId) params.set("pricingReservationId", reservationId);
			return `/admin/ota-reservations?${params.toString()}`;
		}

		const targetOwnerId = normalizeAdminId(
			item.hotelOwnerId || item.ownerId || item.belongsTo
		);
		const targetHotelId = normalizeAdminId(item.hotelId || item.hotel?._id);
		if (!targetOwnerId) return "";

		const params = new URLSearchParams();
		params.set("ownerId", targetOwnerId);
		if (targetHotelId) params.set("hotelId", targetHotelId);

		if (item.notificationType === "housekeeping_task") {
			params.set("overall", "housekeeping");
			params.set("tab", "reports");
			if (item.taskId) params.set("taskId", item.taskId);
			return `/hotel-management/main-dashboard?${params.toString()}`;
		}

		if (isAdminAccountNotification(item)) {
			return buildActivationAccountsRoute(targetOwnerId);
		}

		if (isAdminWalletNotification(item)) {
			params.set("overall", "wallet-management");
			if (item.agentId) params.set("agentId", item.agentId);
			if (item.walletTransactionId) {
				params.set("transactionId", item.walletTransactionId);
			}
			return `/hotel-management/main-dashboard?${params.toString()}`;
		}

		params.set(
			"overall",
			isAdminFinancialNotification(item)
				? "financial-actions"
				: "pending-reservations"
		);
		const reservationId = normalizeAdminId(item.reservationId || item._id);
		if (reservationId && !String(reservationId).startsWith("agent-wallet-")) {
			params.set("reservationId", reservationId);
		}
		return `/hotel-management/main-dashboard?${params.toString()}`;
	};

	const openHotelNotification = (item = {}) => {
		const route = buildHotelNotificationRoute(item);
		if (!route) return;
		if (item.ackable && item.ackKey && user?._id) {
			setHotelNotificationFeed((previous) => {
				const nextData = (previous.data || []).filter(
					(row) => row.ackKey !== item.ackKey
				);
				return {
					...previous,
					total: Math.max(0, Number(previous.total || 0) - 1),
					data: nextData,
				};
			});
			acknowledgeAdminHotelNotification({
				userId: user._id,
				token,
				ackKey: item.ackKey,
				notificationType: item.notificationType,
				entityId:
					item.walletTransactionId ||
					item.reservationId ||
					normalizeAdminId(item._id),
				reservationId: normalizeAdminId(item.reservationId || item._id),
				walletTransactionId: item.walletTransactionId || "",
			}).catch(() => refreshAdminNotifications({ silent: true }));
		}
		setHotelNotificationsOpen(false);
		history.push(route);
	};

	const handleHotelNotificationOpenChange = (open) => {
		setHotelNotificationsOpen(open);
		if (open) refreshAdminNotifications();
	};

	const notificationPanel = (
		<AdminNotificationPanel $isArabic={isArabic}>
			<AdminNotificationHeader>
				<div>
					<strong>{L.notificationTitle}</strong>
					<span>{L.notificationSubtitle}</span>
				</div>
				<AdminNotificationCount>{hotelNotificationCount}</AdminNotificationCount>
			</AdminNotificationHeader>

			{hotelNotificationsLoading ? (
				<AdminNotificationLoading>
					<Spin size='small' />
				</AdminNotificationLoading>
			) : hotelNotificationFeed.data.length ? (
				<AdminNotificationList>
					{hotelNotificationFeed.data.map((item) => {
						const reasons = notificationReasonList(item).slice(0, 2);
						const range = [
							formatNotificationDate(item.checkin_date, isArabic),
							formatNotificationDate(item.checkout_date, isArabic),
						]
							.filter(Boolean)
							.join(" - ");
						return (
							<AdminNotificationItem
								key={`${item.notificationType || "notification"}-${
									item.ackKey || item._id || item.reservationId || item.walletTransactionId
								}`}
								type='button'
								onClick={() => openHotelNotification(item)}
							>
								<AdminNotificationItemTop>
									<strong>{notificationTitle(item, isArabic)}</strong>
									{item.hotel_visible_amount || item.total_amount ? (
										<span>
											{formatNotificationMoney(
												item.hotel_visible_amount || item.total_amount
											)}{" "}
											SAR
										</span>
									) : (
										<span>{L.openAction}</span>
									)}
								</AdminNotificationItemTop>
								<AdminNotificationGuest>
									{item.guestName ||
										item.agentName ||
										(isArabic
											? "\u0625\u062c\u0631\u0627\u0621 \u0645\u0639\u0644\u0642"
											: "Pending action")}
								</AdminNotificationGuest>
								<AdminNotificationMeta>
									<span>{item.hotelName || item.booking_source || "Hotel"}</span>
									{range && <span>{range}</span>}
								</AdminNotificationMeta>
								{!!reasons.length && (
									<AdminNotificationReasons>
										{reasons.map((reason) => (
											<span key={reason}>
												{notificationReasonLabel(reason, isArabic)}
											</span>
										))}
									</AdminNotificationReasons>
								)}
							</AdminNotificationItem>
						);
					})}
				</AdminNotificationList>
			) : (
				<AdminNotificationEmpty>
					<Empty
						image={Empty.PRESENTED_IMAGE_SIMPLE}
						description={L.noNotifications}
					/>
				</AdminNotificationEmpty>
			)}
		</AdminNotificationPanel>
	);

	const renderNotificationBell = (item) => (
		<Dropdown
			key={item.key}
			trigger={["click"]}
			open={hotelNotificationsOpen}
			onOpenChange={handleHotelNotificationOpenChange}
			dropdownRender={() => notificationPanel}
			placement={isArabic ? "bottomLeft" : "bottomRight"}
			getPopupContainer={() => document.body}
			autoAdjustOverflow
			destroyPopupOnHide={false}
			overlayClassName='admin-platform-notification-dropdown'
		>
			<NavIconButton
				type='button'
				$active={hotelNotificationsOpen}
				className={
					notificationBellRinging ? "admin-notification-bell-ringing" : ""
				}
				title={L.notifications}
				aria-label={L.notifications}
			>
				<Badge
					count={hotelNotificationCount}
					size='small'
					overflowCount={99}
					offset={[4, -4]}
				>
					<BellOutlined className='admin-bell-icon' />
				</Badge>
			</NavIconButton>
		</Dropdown>
	);

	const openChatFeedItem = (item = {}) => {
		if (!item.route) return;
		setChatDropdownOpen(false);
		history.push(item.route);
	};

	const handleChatDropdownOpenChange = (open) => {
		setChatDropdownOpen(open);
		if (open) loadAdminChatFeed();
	};

	const chatPanel = (
		<AdminNotificationPanel $isArabic={isArabic}>
			<AdminNotificationHeader>
				<div>
					<strong>{L.chatTitle}</strong>
					<span>{L.chatSubtitle}</span>
				</div>
				<AdminNotificationHeaderActions>
					{supportEscalatedChatCount > 0 && (
						<AdminEscalationCount>
							{supportEscalatedChatCount} {L.escalatedClientSupport}
						</AdminEscalationCount>
					)}
					<AdminNotificationCount>{chatNotificationCount}</AdminNotificationCount>
				</AdminNotificationHeaderActions>
			</AdminNotificationHeader>

			{chatFeedLoading ? (
				<AdminNotificationLoading>
					<Spin size='small' />
				</AdminNotificationLoading>
			) : chatFeed.length ? (
				<AdminNotificationList>
					{chatFeed.map((item) => (
						<AdminNotificationItem
							key={`${item.kind}-${item.id}`}
							type='button'
							onClick={() => openChatFeedItem(item)}
							$priority={item.escalated}
						>
							<AdminNotificationItemTop>
								<strong>{item.title}</strong>
								{item.escalated ? (
									<AdminInlineEscalation>
										{item.unread > 0
											? `${item.unread} | ${L.escalatedClientSupport}`
											: L.escalatedClientSupport}
									</AdminInlineEscalation>
								) : (
									<span>{item.unread > 0 ? item.unread : L.openChat}</span>
								)}
							</AdminNotificationItemTop>
							<AdminNotificationGuest>{item.subtitle || item.meta}</AdminNotificationGuest>
							<AdminNotificationMeta>
								<AdminChatKind $kind={item.kind}>{item.meta}</AdminChatKind>
								<span>{formatNotificationDate(item.lastAt, isArabic)}</span>
							</AdminNotificationMeta>
						</AdminNotificationItem>
					))}
				</AdminNotificationList>
			) : (
				<AdminNotificationEmpty>
					<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={L.noChats} />
				</AdminNotificationEmpty>
			)}
		</AdminNotificationPanel>
	);

	const renderChatDropdown = (item) => (
		<Dropdown
			key={item.key}
			trigger={["click"]}
			open={chatDropdownOpen}
			onOpenChange={handleChatDropdownOpenChange}
			dropdownRender={() => chatPanel}
			placement={isArabic ? "bottomLeft" : "bottomRight"}
			getPopupContainer={() => document.body}
			autoAdjustOverflow
			destroyPopupOnHide={false}
			overlayClassName='admin-platform-notification-dropdown'
		>
			<NavIconButton
				type='button'
				$active={chatDropdownOpen || location.pathname === item.to}
				$hasEscalated={supportEscalatedChatCount > 0}
				title={L[item.key]}
				aria-label={L[item.key]}
			>
				<Badge
					count={chatNotificationCount}
					size='small'
					overflowCount={99}
					offset={[4, -4]}
				>
					<MessageOutlined className='admin-chat-icon' />
				</Badge>
				{supportEscalatedChatCount > 0 && (
					<EscalationIndicator
						aria-label={`${supportEscalatedChatCount} ${L.escalatedChats}`}
						title={`${supportEscalatedChatCount} ${L.escalatedChats}`}
					>
						{supportEscalatedChatCount}
					</EscalationIndicator>
				)}
			</NavIconButton>
		</Dropdown>
	);

	return (
		<>
			<AdminTopNavbarGlobalStyles />
			<NavbarShell dir={isArabic ? "rtl" : "ltr"}>
				<BrandBlock>
					<BrandLogoFrame>
						<img src={ADMIN_BRAND_LOGO} alt='XHotel Logo' />
					</BrandLogoFrame>
					<BrandText>
						<strong>{L.title}</strong>
						<span>{L.subtitle}</span>
					</BrandText>
				</BrandBlock>

				<LinkRail aria-label='Admin navigation'>
					{visibleLinks.map((item) => {
						if (item.key === "notifications") {
							return renderNotificationBell(item);
						}
						if (item.key === "service") {
							return renderChatDropdown(item);
						}
						const active = location.pathname === item.to;
						const badgeCount =
							item.key === "service" ? chatNotificationCount : 0;
						return (
							<NavLinkButton
								key={item.to || item.key}
								to={item.to}
								$active={active}
								$iconOnly={item.iconOnly}
								title={L[item.key]}
								aria-label={L[item.key]}
							>
								{item.iconOnly ? (
									<Badge
										count={badgeCount}
										size='small'
										overflowCount={99}
										offset={[4, -4]}
									>
										{item.icon}
									</Badge>
								) : (
									item.icon
								)}
								{!item.iconOnly && <span>{L[item.key]}</span>}
							</NavLinkButton>
						);
					})}
				</LinkRail>

				<ActionCluster>
					<TimeZoneDock aria-label={isArabic ? "التوقيت المحلي" : "Local times"}>
						<TimeZoneItem>
							<FlagMark>
								<img
									src={EgyptFlag}
									alt={isArabic ? "\u0639\u0644\u0645 \u0645\u0635\u0631" : "Egypt flag"}
								/>
							</FlagMark>
							<span className='zone-copy'>
								<span className='date-line hijri-line'>
									<CalendarOutlined />
									<time>{formatZoneHijriDate(clockNow, EGYPT_TIME_ZONE, isArabic)}</time>
								</span>
								<span className='date-line'>
									<ClockCircleOutlined />
									<time>{formatZoneDateTime(clockNow, EGYPT_TIME_ZONE, isArabic)}</time>
								</span>
							</span>
						</TimeZoneItem>
						<TimeZoneItem>
							<FlagMark>
								<img
									src={SaudiFlag}
									alt={
										isArabic
											? "\u0639\u0644\u0645 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629"
											: "Saudi Arabia flag"
									}
								/>
							</FlagMark>
							<span className='zone-copy'>
								<span className='date-line hijri-line'>
									<CalendarOutlined />
									<time>{formatZoneHijriDate(clockNow, SAUDI_TIME_ZONE, isArabic)}</time>
								</span>
								<span className='date-line'>
									<ClockCircleOutlined />
									<time>{formatZoneDateTime(clockNow, SAUDI_TIME_ZONE, isArabic)}</time>
								</span>
							</span>
						</TimeZoneItem>
						<TimeZoneItem>
							<FlagMark>
								<img
									src={UsaFlag}
									alt={
										isArabic
											? "\u0639\u0644\u0645 \u0627\u0644\u0648\u0644\u0627\u064a\u0627\u062a \u0627\u0644\u0645\u062a\u062d\u062f\u0629"
											: "United States flag"
									}
								/>
							</FlagMark>
							<span className='zone-copy'>
								<span className='date-line hijri-line'>
									<CalendarOutlined />
									<time>
										{formatZoneHijriDate(clockNow, USA_PACIFIC_TIME_ZONE, isArabic)}
									</time>
								</span>
								<span className='date-line'>
									<ClockCircleOutlined />
									<time>
										{formatZoneDateTime(clockNow, USA_PACIFIC_TIME_ZONE, isArabic)}
									</time>
								</span>
							</span>
						</TimeZoneItem>
					</TimeZoneDock>
					<LanguageButton type='button' onClick={toggleLanguage}>
						<GlobalOutlined />
						<span>{L.language}</span>
					</LanguageButton>
					<Dropdown
						menu={{ items: profileItems, onClick: handleProfileClick }}
						trigger={["click"]}
						placement={isArabic ? "bottomLeft" : "bottomRight"}
						getPopupContainer={() => document.body}
					>
						<ProfileButton type='button'>
							<UserOutlined />
							<span>
								<strong>{user.name || L.account}</strong>
								<Tag color={isConfiguredSuperAdmin ? "blue" : "cyan"}>
									{isConfiguredSuperAdmin ? L.superAdmin : L.adminStaff}
								</Tag>
							</span>
						</ProfileButton>
					</Dropdown>
				</ActionCluster>
			</NavbarShell>
		</>
	);
};

export default AdminTopNavbar;

const AdminTopNavbarGlobalStyles = createGlobalStyle`
	:root {
		--admin-topbar-height: 84px;
		--admin-metal-blue-dark: #081a2d;
		--admin-metal-blue-deep: #0e3157;
		--admin-metal-blue: #155d95;
		--admin-metal-blue-lift: #2490c8;
		--admin-metal-blue-glint: #d7f3ff;
		--admin-sidebar-width: 285px;
		--admin-page-row-gap: 10px;
		--admin-metal-blue-bg: linear-gradient(
			135deg,
			#081a2d 0%,
			#0d335d 30%,
			#1a78ad 54%,
			#10446f 76%,
			#071827 100%
		);
		--admin-table-header-bg: linear-gradient(180deg, #1b6fa5 0%, #09223a 100%);
	}

	.admin-route-shell {
		background:
			linear-gradient(180deg, rgba(231, 245, 255, 0.72), rgba(246, 249, 252, 0.98)),
			#f5f8fb;
		min-height: 100vh;
		overflow-x: hidden;
		padding-top: var(--admin-topbar-height);
	}

	.admin-route-shell .grid-container-main,
	.admin-route-shell .otherContentWrapper,
	.admin-route-shell .container-wrapper {
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
	}

	.admin-route-shell .grid-container-main {
		display: block !important;
		width: 100%;
		padding-inline-start: 0;
		padding-inline-end: 0;
	}

	.admin-route-shell[dir="ltr"] .grid-container-main {
		padding-left: var(--admin-sidebar-width);
	}

	.admin-route-shell[dir="rtl"] .grid-container-main {
		padding-right: var(--admin-sidebar-width);
	}

	.admin-route-shell .grid-container-main > .navcontent {
		width: 0 !important;
		min-width: 0 !important;
		height: 0;
		overflow: visible;
	}

	.admin-route-shell .otherContentWrapper {
		overflow: hidden;
		width: 100%;
	}

	.admin-route-shell .container-wrapper {
		width: auto;
		max-width: calc(100% - 20px);
		margin-inline: 10px;
		overflow: hidden;
	}

	.admin-route-shell .container-wrapper > * {
		max-width: 100%;
		box-sizing: border-box;
	}

	.admin-route-shell .container-wrapper > * + * {
		margin-top: var(--admin-page-row-gap);
	}

	.admin-route-shell .container-wrapper > .ant-table-wrapper + .ant-pagination,
	.admin-route-shell .container-wrapper > .ant-pagination + .ant-table-wrapper,
	.admin-route-shell .container-wrapper > .ant-table-wrapper + .ant-table-wrapper {
		margin-top: var(--admin-page-row-gap);
	}

	.admin-route-shell .ant-table-wrapper {
		max-width: 100%;
		min-width: 0;
	}

	.admin-route-shell .ant-table-container,
	.admin-route-shell .ant-table-content,
	.admin-route-shell .ant-table-body {
		max-width: 100%;
	}

	.admin-route-shell .ant-table-content,
	.admin-route-shell .ant-table-body {
		overflow: auto !important;
	}

	.admin-route-shell .table-container,
	.admin-route-shell .table-responsive,
	.admin-route-shell .responsive-table,
	.admin-route-shell .admin-table-scroll {
		max-width: 100%;
		overflow: auto;
		-webkit-overflow-scrolling: touch;
	}

	.admin-route-shell table {
		max-width: 100%;
	}

	.admin-route-shell .ant-btn-primary:not(.ant-btn-dangerous) {
		border-color: rgba(36, 144, 200, 0.92) !important;
		background: var(--admin-metal-blue-bg) !important;
		color: #ffffff !important;
		font-weight: 900;
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.2),
			0 9px 20px rgba(8, 42, 75, 0.22) !important;
	}

	.admin-route-shell .ant-btn-primary:not(.ant-btn-dangerous):hover,
	.admin-route-shell .ant-btn-primary:not(.ant-btn-dangerous):focus {
		border-color: rgba(215, 243, 255, 0.96) !important;
		filter: brightness(1.06) saturate(1.05);
	}

	.admin-route-shell .ant-input:hover,
	.admin-route-shell .ant-input-affix-wrapper:hover,
	.admin-route-shell .ant-select:not(.ant-select-disabled):hover .ant-select-selector,
	.admin-route-shell .ant-picker:hover {
		border-color: rgba(36, 144, 200, 0.72) !important;
	}

	.admin-route-shell .ant-input:focus,
	.admin-route-shell .ant-input-focused,
	.admin-route-shell .ant-input-affix-wrapper-focused,
	.admin-route-shell .ant-input-affix-wrapper:focus-within,
	.admin-route-shell .ant-select-focused .ant-select-selector,
	.admin-route-shell .ant-picker-focused {
		border-color: var(--admin-metal-blue-lift) !important;
		box-shadow: 0 0 0 3px rgba(36, 144, 200, 0.15) !important;
	}

	.admin-route-shell .ant-table-thead > tr > th,
	.admin-route-shell table thead th {
		background: var(--admin-table-header-bg);
		color: #ffffff;
		border-color: rgba(167, 215, 244, 0.5);
	}

	.admin-platform-notification-dropdown {
		z-index: 2200;
	}

	.admin-platform-notification-dropdown .ant-dropdown-menu {
		padding: 0;
		background: transparent;
		box-shadow: none;
	}

	@media (max-width: 900px) {
		:root {
			--admin-topbar-height: 112px;
		}

		.admin-platform-notification-dropdown {
			position: fixed !important;
			top: calc(var(--admin-topbar-height) + 8px) !important;
			left: 10px !important;
			right: 10px !important;
			width: auto !important;
			max-width: none !important;
			transform: none !important;
		}
	}

	@media (max-width: 992px) {
		.admin-route-shell .grid-container-main {
			padding-left: 0 !important;
			padding-right: 0 !important;
		}

		.admin-route-shell .container-wrapper {
			max-width: calc(100% - 12px);
			margin-inline: 6px;
		}
	}
`;

const NavbarShell = styled.header`
	min-height: var(--admin-topbar-height);
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	width: 100%;
	z-index: 1200;
	display: grid;
	grid-template-columns: minmax(230px, auto) minmax(0, 1fr) auto;
	align-items: center;
	gap: 14px;
	padding: 10px 18px;
	background:
		linear-gradient(
			115deg,
			rgba(255, 255, 255, 0.14) 0%,
			rgba(255, 255, 255, 0.02) 30%,
			rgba(255, 255, 255, 0.1) 58%,
			rgba(255, 255, 255, 0.02) 100%
		),
		var(--admin-metal-blue-bg);
	border-bottom: 1px solid rgba(173, 226, 255, 0.38);
	box-shadow: 0 10px 28px rgba(8, 28, 48, 0.28);
	color: #ffffff;
	font-family: ${(props) =>
		props.dir === "rtl"
			? `"Droid Arabic Kufi", "Tajawal", "Cairo", "Noto Kufi Arabic", "Segoe UI", Tahoma, Arial, sans-serif`
			: `"Inter", "Segoe UI", Arial, sans-serif`};
	letter-spacing: 0;

	@media (max-width: 1180px) {
		grid-template-columns: minmax(220px, auto) minmax(0, 1fr);
	}

	@media (max-width: 900px) {
		position: sticky;
		grid-template-columns: 1fr;
		align-items: stretch;
		padding: 9px 10px;
		gap: 8px;
	}
`;

const BrandBlock = styled.div`
	display: flex;
	align-items: center;
	gap: 9px;
	min-width: 0;
`;

const BrandLogoFrame = styled.div`
	width: 64px;
	height: 48px;
	border: 1px solid rgba(215, 243, 255, 0.45);
	border-radius: 6px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(5, 21, 37, 0.2)),
		rgba(5, 21, 37, 0.24);
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.22);
	flex: 0 0 auto;
	overflow: hidden;

	img {
		max-width: 52px;
		max-height: 34px;
		object-fit: contain;
		display: block;
		filter:
			drop-shadow(0 0 7px rgba(115, 205, 244, 0.25))
			drop-shadow(0 1px 2px rgba(0, 0, 0, 0.22));
	}

	@media (max-width: 900px) {
		width: 58px;
		height: 42px;

		img {
			max-width: 48px;
			max-height: 30px;
		}
	}
`;

const BrandText = styled.div`
	display: grid;
	min-width: 0;

	strong {
		color: #ffffff;
		font-size: 1rem;
		font-weight: 950;
		line-height: 1.15;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	span {
		color: #bfe7ff;
		font-size: 0.74rem;
		font-weight: 800;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;

const LinkRail = styled.nav`
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	overflow-x: auto;
	padding: 3px;
	scrollbar-width: thin;

	@media (max-width: 1180px) {
		grid-column: 1 / -1;
		grid-row: 2;
		justify-content: flex-start;
	}
`;

const NavLinkButton = styled(Link)`
	min-height: 42px;
	min-width: ${(props) => (props.$iconOnly ? "46px" : "auto")};
	padding: ${(props) => (props.$iconOnly ? "0 11px" : "0 12px")};
	border: 1px solid
		${(props) =>
			props.$active ? "rgba(215, 243, 255, 0.82)" : "rgba(255, 255, 255, 0.16)"};
	border-radius: 5px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	flex: 0 0 auto;
	background: ${(props) =>
		props.$active
			? "linear-gradient(180deg, rgba(255,255,255,0.2), rgba(215,243,255,0.08))"
			: "rgba(5, 21, 37, 0.28)"};
	color: #ffffff !important;
	font-size: 0.83rem;
	font-weight: 900;
	text-decoration: none !important;
	box-shadow: ${(props) =>
		props.$active ? "inset 0 -3px #73cdf4, 0 8px 18px rgba(0,0,0,0.12)" : "none"};
	transition:
		transform 0.15s ease,
		border-color 0.15s ease,
		background 0.15s ease;

	&:hover,
	&:focus {
		transform: translateY(-1px);
		border-color: rgba(215, 243, 255, 0.82);
		background: linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05));
		color: #ffffff !important;
	}

	svg {
		font-size: 17px;
	}

	.ant-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.ant-badge-count {
		min-width: 17px;
		height: 17px;
		padding: 0 5px;
		font-size: 10px;
		font-weight: 950;
		line-height: 17px;
		box-shadow: 0 0 0 1px rgba(8, 26, 45, 0.8);
	}
`;

const NavIconButton = styled.button`
	position: relative;
	min-height: 42px;
	min-width: 46px;
	padding: 0 11px;
	border: 1px solid
		${(props) =>
			props.$hasEscalated
				? "rgba(251, 146, 60, 0.9)"
				: props.$active
				? "rgba(215, 243, 255, 0.82)"
				: "rgba(255, 255, 255, 0.16)"};
	border-radius: 5px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	background: ${(props) =>
		props.$active
			? "linear-gradient(180deg, rgba(255,255,255,0.2), rgba(215,243,255,0.08))"
			: "rgba(5, 21, 37, 0.28)"};
	color: #ffffff;
	box-shadow: ${(props) =>
		props.$active ? "inset 0 -3px #73cdf4, 0 8px 18px rgba(0,0,0,0.12)" : "none"};
	cursor: pointer;
	transition:
		transform 0.15s ease,
		border-color 0.15s ease,
		background 0.15s ease;

	&:hover,
	&:focus {
		transform: translateY(-1px);
		border-color: rgba(215, 243, 255, 0.82);
		background: linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05));
		color: #ffffff;
	}

	svg {
		font-size: 17px;
		color: #d7f3ff;
		filter: drop-shadow(0 0 7px rgba(215, 243, 255, 0.22));
	}

	.admin-bell-icon {
		color: #ffe8a3;
		filter: drop-shadow(0 0 7px rgba(255, 232, 163, 0.32));
	}

	&.admin-notification-bell-ringing .admin-bell-icon {
		animation: adminTopbarBellRing 0.8s ease-in-out both;
		transform-origin: 50% 0%;
	}

	@keyframes adminTopbarBellRing {
		0% {
			transform: rotate(0deg) scale(1);
		}
		18% {
			transform: rotate(-18deg) scale(1.08);
		}
		36% {
			transform: rotate(16deg) scale(1.08);
		}
		54% {
			transform: rotate(-10deg) scale(1.04);
		}
		72% {
			transform: rotate(7deg) scale(1.02);
		}
		100% {
			transform: rotate(0deg) scale(1);
		}
	}

	.admin-chat-icon {
		color: ${(props) => (props.$hasEscalated ? "#ffd08a" : "#d7f3ff")};
		filter: ${(props) =>
			props.$hasEscalated
				? "drop-shadow(0 0 8px rgba(251, 146, 60, 0.52))"
				: "drop-shadow(0 0 7px rgba(115, 205, 244, 0.36))"};
	}

	.ant-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.ant-badge-count {
		min-width: 17px;
		height: 17px;
		padding: 0 5px;
		font-size: 10px;
		font-weight: 950;
		line-height: 17px;
		box-shadow: 0 0 0 1px rgba(8, 26, 45, 0.8);
	}
`;

const EscalationIndicator = styled.span`
	position: absolute;
	top: -7px;
	right: -8px;
	min-width: 18px;
	height: 18px;
	padding: 0 5px;
	border: 1px solid rgba(255, 247, 237, 0.95);
	border-radius: 999px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: #f97316;
	color: #ffffff;
	font-size: 10px;
	font-weight: 950;
	line-height: 1;
	box-shadow: 0 5px 12px rgba(124, 45, 18, 0.36);
	pointer-events: none;
`;

const ActionCluster = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 6px;
	min-width: 0;

	@media (max-width: 1180px) {
		grid-column: 2;
		grid-row: 1;
	}

	@media (max-width: 900px) {
		grid-column: 1;
		grid-row: 3;
		justify-content: stretch;
		overflow-x: auto;
		padding-bottom: 2px;
	}
`;

const metalButtonBase = `
	min-height: 42px;
	border: 1px solid rgba(215, 243, 255, 0.36);
	border-radius: 5px;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(5, 21, 37, 0.24));
	color: #ffffff;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	font-weight: 900;
	line-height: 1;
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.16);
	white-space: nowrap;
	cursor: pointer;

	&:hover,
	&:focus {
		color: #ffffff;
		border-color: rgba(215, 243, 255, 0.82);
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(5, 21, 37, 0.18));
	}
`;

const TimeZoneDock = styled.div`
	min-height: 54px;
	max-width: 610px;
	display: grid;
	grid-template-columns: repeat(3, minmax(118px, 1fr));
	gap: 5px;
	padding: 4px;
	border: 1px solid rgba(215, 243, 255, 0.36);
	border-radius: 5px;
	background: linear-gradient(
		180deg,
		rgba(255, 255, 255, 0.14),
		rgba(5, 21, 37, 0.24)
	);
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.16);

	@media (max-width: 1380px) {
		max-width: 520px;
		grid-template-columns: repeat(3, minmax(104px, 1fr));
	}

	@media (max-width: 900px) {
		flex: 1 0 390px;
		max-width: none;
	}
`;

const TimeZoneItem = styled.div`
	display: flex;
	align-items: center;
	gap: 5px;
	min-width: 0;
	padding: 5px;
	border-radius: 4px;
	background: rgba(7, 24, 39, 0.24);

	.zone-copy {
		min-width: 0;
		display: grid;
		gap: 1px;
	}

	strong,
	time,
	.date-line {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	strong {
		color: #ffffff;
		font-size: 0.72rem;
		font-weight: 950;
		line-height: 1.05;
	}

	time {
		color: #c8eeff;
		font-size: 0.64rem;
		font-weight: 850;
		direction: ltr;
		unicode-bidi: plaintext;
	}

	.date-line {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		line-height: 1.05;
	}

	.date-line svg {
		flex: 0 0 auto;
		font-size: 0.64rem;
		color: #a7e0ff;
	}

	.hijri-line time,
	.hijri-line svg {
		color: #ffe8a3;
	}

	@media (max-width: 1380px) {
		time {
			max-width: 104px;
		}
	}
`;

const FlagMark = styled.span`
	width: 30px;
	height: 20px;
	border: 1px solid rgba(215, 243, 255, 0.28);
	border-radius: 4px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 255, 255, 0.12);
	line-height: 1;
	flex: 0 0 auto;
	overflow: hidden;
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.16);

	img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: contain;
	}

	@media (max-width: 1380px) {
		width: 27px;
		height: 18px;
	}
`;

const LanguageButton = styled.button`
	${metalButtonBase}
	min-width: 58px;
	padding: 0 9px;
`;

const ProfileButton = styled.button`
	${metalButtonBase}
	min-width: 138px;
	max-width: 178px;
	padding: 4px 8px;
	justify-content: flex-start;

	> span {
		min-width: 0;
		display: grid;
		gap: 3px;
		text-align: start;
	}

	strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.76rem;
		color: #ffffff;
	}

	.ant-tag {
		width: max-content;
		margin: 0;
		border-radius: 999px;
		font-size: 0.68rem;
		font-weight: 900;
		line-height: 1.45;
	}

	@media (max-width: 900px) {
		min-width: 138px;
	}
`;

const AdminNotificationPanel = styled.div`
	width: min(430px, calc(100vw - 22px));
	max-height: min(560px, calc(100vh - 120px));
	overflow: hidden;
	border: 1px solid rgba(139, 204, 239, 0.72);
	border-radius: 10px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 250, 255, 0.98)),
		#ffffff;
	box-shadow:
		0 22px 50px rgba(8, 28, 48, 0.26),
		inset 0 1px rgba(255, 255, 255, 0.9);
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	font-family: ${(props) =>
		props.$isArabic
			? `"Droid Arabic Kufi", "Tajawal", "Cairo", "Noto Kufi Arabic", "Segoe UI", Tahoma, Arial, sans-serif`
			: `"Inter", "Segoe UI", Arial, sans-serif`};
`;

const AdminNotificationHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 13px 14px;
	background: linear-gradient(135deg, #0b2743, #176899 58%, #0d335d);
	color: #ffffff;

	> div:first-child {
		min-width: 0;
		display: grid;
		gap: 3px;
	}

	strong {
		font-size: 0.95rem;
		font-weight: 950;
		line-height: 1.2;
	}

	span {
		color: #d7f3ff;
		font-size: 0.72rem;
		font-weight: 850;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const AdminNotificationHeaderActions = styled.div`
	flex: 0 0 auto;
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	gap: 7px;
`;

const AdminNotificationCount = styled.span`
	min-width: 34px;
	height: 30px;
	padding: 0 10px;
	border: 1px solid rgba(255, 232, 163, 0.78);
	border-radius: 999px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 232, 163, 0.16);
	color: #fff1b8 !important;
	font-size: 0.92rem !important;
	font-weight: 950 !important;
`;

const AdminEscalationCount = styled.span`
	min-height: 28px;
	padding: 0 9px;
	border: 1px solid rgba(253, 186, 116, 0.82);
	border-radius: 999px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: rgba(154, 52, 18, 0.36);
	color: #ffedd5 !important;
	font-size: 0.72rem !important;
	font-weight: 950 !important;
	white-space: nowrap;
`;

const AdminNotificationLoading = styled.div`
	min-height: 150px;
	display: flex;
	align-items: center;
	justify-content: center;
`;

const AdminNotificationList = styled.div`
	max-height: 460px;
	overflow-y: auto;
	padding: 8px;
	display: grid;
	gap: 7px;
	scrollbar-width: thin;
`;

const AdminNotificationItem = styled.button`
	width: 100%;
	border: 1px solid
		${(props) =>
			props.$priority ? "rgba(249, 115, 22, 0.58)" : "rgba(169, 205, 229, 0.82)"};
	border-radius: 8px;
	padding: 10px 11px;
	background: ${(props) =>
		props.$priority
			? "linear-gradient(180deg, #fff7ed, #fffaf4)"
			: "linear-gradient(180deg, #ffffff, #f6fbff)"};
	color: #10243a;
	text-align: start;
	display: grid;
	gap: 6px;
	cursor: pointer;
	box-shadow: 0 6px 14px rgba(19, 54, 86, 0.08);
	transition:
		transform 0.15s ease,
		border-color 0.15s ease,
		box-shadow 0.15s ease;

	&:hover,
	&:focus {
		transform: translateY(-1px);
		border-color: #2490c8;
		box-shadow: 0 12px 22px rgba(19, 54, 86, 0.14);
		outline: none;
	}
`;

const AdminInlineEscalation = styled.span`
	border: 1px solid rgba(249, 115, 22, 0.4);
	border-radius: 999px;
	padding: 3px 8px;
	background: rgba(255, 237, 213, 0.9);
	color: #9a3412 !important;
	font-size: 0.68rem !important;
	font-weight: 950 !important;
	line-height: 1.2;
	white-space: nowrap;
`;

const AdminNotificationItemTop = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;

	strong {
		min-width: 0;
		color: #07233d;
		font-size: 0.86rem;
		font-weight: 950;
		line-height: 1.25;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	span {
		flex: 0 0 auto;
		color: #155d95;
		font-size: 0.72rem;
		font-weight: 950;
	}
`;

const AdminNotificationGuest = styled.div`
	color: #1f2f43;
	font-size: 0.79rem;
	font-weight: 900;
	line-height: 1.3;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const AdminNotificationMeta = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	color: #56708d;
	font-size: 0.7rem;
	font-weight: 850;

	span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const AdminNotificationReasons = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 5px;

	span {
		border: 1px solid rgba(234, 179, 8, 0.42);
		border-radius: 999px;
		padding: 3px 8px;
		background: rgba(254, 243, 199, 0.74);
		color: #854d0e;
		font-size: 0.66rem;
		font-weight: 950;
		line-height: 1.25;
	}
`;

const AdminChatKind = styled.span`
	width: max-content;
	border: 1px solid
		${(props) =>
			props.$kind === "b2b"
				? "rgba(124, 58, 237, 0.34)"
				: props.$kind === "client-escalated"
				? "rgba(249, 115, 22, 0.38)"
				: props.$kind === "client-support"
				? "rgba(22, 163, 74, 0.34)"
				: "rgba(37, 99, 235, 0.34)"};
	border-radius: 999px;
	padding: 3px 8px;
	background: ${(props) =>
		props.$kind === "b2b"
			? "rgba(237, 233, 254, 0.78)"
			: props.$kind === "client-escalated"
			? "rgba(255, 237, 213, 0.86)"
			: props.$kind === "client-support"
			? "rgba(220, 252, 231, 0.78)"
			: "rgba(219, 234, 254, 0.78)"};
	color: ${(props) =>
		props.$kind === "b2b"
			? "#5b21b6"
			: props.$kind === "client-escalated"
			? "#9a3412"
			: props.$kind === "client-support"
			? "#166534"
			: "#1d4ed8"};
	font-size: 0.66rem;
	font-weight: 950;
	line-height: 1.25;
`;

const AdminNotificationEmpty = styled.div`
	padding: 26px 10px;

	.ant-empty-description {
		color: #53687f;
		font-weight: 850;
	}
`;
