import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import styled from "styled-components";
import {
	Alert,
	Badge,
	Button,
	Empty,
	Input,
	Modal,
	Popover,
	Select,
	Spin,
	Tag,
	Tooltip,
	message as antdMessage,
} from "antd";
import {
	CloseCircleOutlined,
	FileImageOutlined,
	HistoryOutlined,
	InboxOutlined,
	MessageOutlined,
	PaperClipOutlined,
	SendOutlined,
	SmileOutlined,
	TeamOutlined,
	UserAddOutlined,
} from "@ant-design/icons";
import EmojiPicker from "emoji-picker-react";
import { useHistory, useLocation } from "react-router-dom";
import TopNavbar from "../AdminNavbar/TopNavbar";
import AdminOverallSideMenu from "../AdminOverallSideMenu/AdminOverallSideMenu";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import { getStoredMenuCollapsed } from "../utils/menuState";
import socket from "../../socket";
import {
	closeB2BChat,
	getB2BChatRecipients,
	listB2BChats,
	markB2BChatSeen,
	readB2BChat,
	sendB2BChatMessage,
	startB2BChat,
} from "../apiAdmin";
import { titleCase } from "../TheOverallStructure/overallShared";

const TABS = ["active", "history", "start"];
const MAX_CLIENT_ATTACHMENT_SIZE = 6 * 1024 * 1024;
const POLL_MS = 25000;
const CHAT_EMOJI = {
	header: "\u{1F4AC}",
	active: "\u{1F7E2}",
	history: "\u{1F553}",
	start: "\u2728",
	recipients: "\u{1F465}",
	subject: "\u270D\uFE0F",
	launch: "\u{1F680}",
	attach: "\u{1F4CE}",
	send: "\u{1F4E8}",
	back: "\u21A9\uFE0F",
};

const TEXT = {
	en: {
		title: "B2B Chat",
		subtitle: "Staff and approved agent conversations scoped to assigned hotels.",
		active: "Active Chats",
		history: "Historical Chats",
		start: "Start New Chat",
		recipient: "Recipient",
		recipients: "People you can chat with",
		subject: "Subject",
		startChat: "Start chat",
		messagePlaceholder: "Write a message or paste a screenshot...",
		send: "Send",
		emoji: "Emoji",
		attach: "Attach",
		close: "Close chat",
		closed: "Closed",
		activeStatus: "Active",
		internal: "Internal",
		agent: "Agent",
		noChats: "No chats here yet.",
		noRecipients: "No available recipients for your current hotel scope.",
		selectChat: "Select a chat to read the conversation.",
		loading: "Loading...",
		attachments: "Attachments",
		removed: "Remove",
		closedNotice: "This chat is closed. Historical chats are read-only.",
		requiredRecipient: "Please choose at least one recipient.",
		started: "Chat started.",
		sent: "Message sent.",
		chooseFiles: "Choose files",
		tooLarge: "Some files are larger than 6MB and were skipped.",
		backToChats: "Chats",
		typing: "{name} is typing...",
		typingMany: "{name} are typing...",
	},
	ar: {
		title: "\u0645\u062d\u0627\u062f\u062b\u0627\u062a\u0020\u0627\u0644\u0623\u0639\u0645\u0627\u0644",
		subtitle:
			"\u0645\u062d\u0627\u062f\u062b\u0627\u062a\u0020\u0627\u0644\u0641\u0631\u064a\u0642\u0020\u0648\u0627\u0644\u0648\u0643\u0644\u0627\u0621\u0020\u062d\u0633\u0628\u0020\u0627\u0644\u0641\u0646\u0627\u062f\u0642\u0020\u0627\u0644\u0645\u062e\u0635\u0635\u0629.",
		active: "\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a\u0020\u0627\u0644\u0646\u0634\u0637\u0629",
		history: "\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a\u0020\u0627\u0644\u0633\u0627\u0628\u0642\u0629",
		start: "\u0628\u062f\u0621\u0020\u0645\u062d\u0627\u062f\u062b\u0629\u0020\u062c\u062f\u064a\u062f\u0629",
		recipient: "\u0627\u0644\u0645\u0633\u062a\u0644\u0645",
		recipients: "\u0627\u0644\u0623\u0634\u062e\u0627\u0635\u0020\u0627\u0644\u0645\u062a\u0627\u062d\u0648\u0646\u0020\u0644\u0644\u0645\u062d\u0627\u062f\u062b\u0629",
		subject: "\u0639\u0646\u0648\u0627\u0646\u0020\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629",
		startChat: "\u0628\u062f\u0621\u0020\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629",
		messagePlaceholder:
			"\u0627\u0643\u062a\u0628\u0020\u0631\u0633\u0627\u0644\u0629\u0020\u0623\u0648\u0020\u0627\u0644\u0635\u0642\u0020\u0644\u0642\u0637\u0629\u0020\u0634\u0627\u0634\u0629...",
		send: "\u0625\u0631\u0633\u0627\u0644",
		emoji: "\u0631\u0645\u0648\u0632",
		attach: "\u0625\u0631\u0641\u0627\u0642",
		close: "\u0625\u063a\u0644\u0627\u0642\u0020\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629",
		closed: "\u0645\u063a\u0644\u0642\u0629",
		activeStatus: "\u0646\u0634\u0637\u0629",
		internal: "\u062f\u0627\u062e\u0644\u064a\u0629",
		agent: "\u0648\u0643\u064a\u0644",
		noChats: "\u0644\u0627\u0020\u062a\u0648\u062c\u062f\u0020\u0645\u062d\u0627\u062f\u062b\u0627\u062a\u0020\u0628\u0639\u062f.",
		noRecipients:
			"\u0644\u0627\u0020\u064a\u0648\u062c\u062f\u0020\u0645\u0633\u062a\u0644\u0645\u0648\u0646\u0020\u0645\u062a\u0627\u062d\u0648\u0646\u0020\u0644\u0646\u0637\u0627\u0642\u0020\u0641\u0646\u0627\u062f\u0642\u0643.",
		selectChat:
			"\u0627\u062e\u062a\u0631\u0020\u0645\u062d\u0627\u062f\u062b\u0629\u0020\u0644\u0642\u0631\u0627\u0621\u0629\u0020\u0627\u0644\u0631\u0633\u0627\u0626\u0644.",
		loading: "\u062c\u0627\u0631\u064a\u0020\u0627\u0644\u062a\u062d\u0645\u064a\u0644...",
		attachments: "\u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a",
		removed: "\u062d\u0630\u0641",
		closedNotice:
			"\u0647\u0630\u0647\u0020\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629\u0020\u0645\u063a\u0644\u0642\u0629\u0020\u0648\u0642\u0631\u0627\u0621\u062a\u0647\u0627\u0020\u0641\u0642\u0637.",
		requiredRecipient:
			"\u064a\u0631\u062c\u0649\u0020\u0627\u062e\u062a\u064a\u0627\u0631\u0020\u0645\u0633\u062a\u0644\u0645\u0020\u0648\u0627\u062d\u062f\u0020\u0639\u0644\u0649\u0020\u0627\u0644\u0623\u0642\u0644.",
		started: "\u062a\u0645\u0020\u0628\u062f\u0621\u0020\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629.",
		sent: "\u062a\u0645\u0020\u0625\u0631\u0633\u0627\u0644\u0020\u0627\u0644\u0631\u0633\u0627\u0644\u0629.",
		chooseFiles: "\u0627\u062e\u062a\u064a\u0627\u0631\u0020\u0645\u0644\u0641\u0627\u062a",
		tooLarge:
			"\u062a\u0645\u0020\u062a\u062c\u0627\u0647\u0644\u0020\u0628\u0639\u0636\u0020\u0627\u0644\u0645\u0644\u0641\u0627\u062a\u0020\u0644\u0623\u0646\u0647\u0627\u0020\u0623\u0643\u0628\u0631\u0020\u0645\u0646\u00206MB.",
		backToChats: "\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a",
		typing: "{name} \u064a\u0643\u062a\u0628 \u0627\u0644\u0622\u0646...",
		typingMany: "{name} \u064a\u0643\u062a\u0628\u0648\u0646 \u0627\u0644\u0622\u0646...",
	},
};

const normalizeTab = (value = "") => (TABS.includes(value) ? value : "active");

const normalizeUserId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const roleNumbersForUser = (user = {}) => [
	Number(user.role),
	...(Array.isArray(user.roles) ? user.roles.map(Number) : []),
];

const roleKeysForUser = (user = {}) => [
	String(user.roleDescription || "").toLowerCase().replace(/[\s_-]+/g, ""),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((item) =>
				String(item || "").toLowerCase().replace(/[\s_-]+/g, ""),
		  )
		: []),
];

const isChatPlatformMonitor = (user = {}) =>
	roleNumbersForUser(user).includes(1000) ||
	roleKeysForUser(user).includes("superadmin");

const isChatHotelMonitor = (user = {}) => {
	const roles = roleNumbersForUser(user);
	const roleKeys = roleKeysForUser(user);
	return (
		isChatPlatformMonitor(user) ||
		roles.includes(10000) ||
		roleKeys.includes("systemadmin") ||
		(roles.includes(2000) && !normalizeUserId(user.belongsToId))
	);
};

const assignedChatHotelIds = (user = {}) =>
	[
		user.hotelIdWork,
		...(Array.isArray(user.hotelIdsWork) ? user.hotelIdsWork : []),
		...(Array.isArray(user.hotelsToSupport) ? user.hotelsToSupport : []),
		...(Array.isArray(user.hotelIdsOwner) ? user.hotelIdsOwner : []),
	]
		.map(normalizeUserId)
		.filter(Boolean)
		.filter((item, index, list) => list.indexOf(item) === index);

const ROLE_LABELS = {
	en: {
		owner: "Owner",
		superadmin: "Super Admin",
		systemadmin: "Hotel System Admin",
		hotelmanager: "Hotel Manager",
		reception: "Front Desk Reception",
		housekeepingmanager: "Housekeeping Manager",
		housekeeping: "Housekeeping",
		finance: "Finance",
		ordertaker: "Agent",
		reservationemployee: "Reservations Officer",
		staff: "Staff",
	},
	ar: {
		owner: "مالك",
		superadmin: "مشرف عام",
		systemadmin: "مسؤول نظام الفندق",
		hotelmanager: "مدير الفندق",
		reception: "موظف استقبال",
		housekeepingmanager: "مدير النظافة",
		housekeeping: "النظافة",
		finance: "المالية",
		ordertaker: "وكيل",
		reservationemployee: "مسؤول الحجوزات",
		staff: "موظف",
	},
};

const ROLE_KEY_BY_NUMBER = {
	1000: "superadmin",
	10000: "systemadmin",
	2000: "hotelmanager",
	3000: "reception",
	4000: "housekeepingmanager",
	5000: "housekeeping",
	6000: "finance",
	7000: "ordertaker",
	8000: "reservationemployee",
};

const normalizeRoleLabelKey = (value = "") =>
	String(value || "").toLowerCase().replace(/[\s_-]+/g, "");

const roleLabelForRecipient = (recipient = {}, isArabic = false) => {
	const labels = ROLE_LABELS[isArabic ? "ar" : "en"];
	const roleDescriptionKey = normalizeRoleLabelKey(recipient.roleDescription);
	if (labels[roleDescriptionKey]) return labels[roleDescriptionKey];
	const backendRoleKey = normalizeRoleLabelKey(recipient.roleLabel);
	if (labels[backendRoleKey]) return labels[backendRoleKey];
	const numericRole = Number(recipient.role || 0);
	const numericKey = ROLE_KEY_BY_NUMBER[numericRole];
	if (numericKey && labels[numericKey]) return labels[numericKey];
	const backendRoleLabel = String(recipient.roleLabel || "").trim();
	if (backendRoleLabel && !/^\d+$/.test(backendRoleLabel)) return backendRoleLabel;
	return labels.staff;
};

const formatDateTime = (value, isArabic) => {
	if (!value) return "";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	return new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(parsed);
};

const readFileAsAttachment = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			resolve({
				name: file.name || "attachment",
				type: file.type || "",
				kind: file.type?.startsWith("image/")
					? "image"
					: file.type === "application/pdf"
					  ? "pdf"
					  : "file",
				size: file.size || 0,
				dataUrl: String(reader.result || ""),
			});
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});

const otherParticipants = (chat = {}, userId = "") =>
	(chat.participants || []).filter((participant) => participant.userId !== userId);

const normalizeAttachment = (attachment) =>
	attachment && typeof attachment === "object" ? attachment : {};

const attachmentSource = (attachment) => {
	const safeAttachment = normalizeAttachment(attachment);
	return (
		safeAttachment.dataUrl ||
		safeAttachment.url ||
		safeAttachment.secureUrl ||
		safeAttachment.path ||
		""
	);
};

const attachmentName = (attachment, fallback = "attachment") => {
	const safeAttachment = normalizeAttachment(attachment);
	return safeAttachment.name || safeAttachment.fileName || safeAttachment.originalName || fallback;
};

const validAttachments = (attachments = []) =>
	(Array.isArray(attachments) ? attachments : []).filter(
		(attachment) => attachment && typeof attachment === "object"
	);

const isImageAttachment = (attachment) => {
	const safeAttachment = normalizeAttachment(attachment);
	return (
		safeAttachment.kind === "image" ||
		String(safeAttachment.type || "").startsWith("image/") ||
		String(attachmentSource(safeAttachment)).startsWith("data:image/")
	);
};

const isPdfAttachment = (attachment) => {
	const safeAttachment = normalizeAttachment(attachment);
	return (
		safeAttachment.kind === "pdf" ||
		String(safeAttachment.type || "").includes("pdf") ||
		String(attachmentSource(safeAttachment)).startsWith("data:application/pdf")
	);
};

const canPreviewAttachment = (attachment) =>
	isImageAttachment(attachment) || isPdfAttachment(attachment);

const chatTitle = (chat = {}, userId = "") => {
	if (chat.subject) return chat.subject;
	const names = otherParticipants(chat, userId)
		.map((participant) => participant.name)
		.filter(Boolean);
	return names.length ? names.join(", ") : "Chat";
};

const chatUserDisplayName = (user = {}) =>
	titleCase(user.name || user.companyName || user.email || "Someone");

const typingStatusText = (typingUsers = {}, labels) => {
	const names = Object.values(typingUsers || {}).filter(Boolean);
	if (!names.length) return "";
	const joined = names.slice(0, 2).join(", ");
	const nameText =
		names.length > 2 ? `${joined} +${names.length - 2}` : joined;
	return (names.length > 1 ? labels.typingMany : labels.typing).replace(
		"{name}",
		nameText
	);
};

const lastMessageText = (chat = {}, labels) => {
	const last = chat.lastMessage;
	if (!last) return labels.noChats;
	if (last.body) return last.body;
	const count = Array.isArray(last.attachments) ? last.attachments.length : 0;
	return count ? `${labels.attachments}: ${count}` : "";
};

const B2BChatMain = () => {
	const { chosenLanguage } = useCartContext();
	const isArabic = chosenLanguage === "Arabic";
	const labels = TEXT[isArabic ? "ar" : "en"];
	const history = useHistory();
	const location = useLocation();
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const auth = useMemo(() => isAuthenticated() || {}, []);
	const user = useMemo(() => auth?.user || {}, [auth]);
	const token = auth?.token || "";
	const userId = user?._id || "";
	const chatHotelMonitorKey = useMemo(
		() => (isChatHotelMonitor(user) ? assignedChatHotelIds(user).join("|") : ""),
		[user],
	);
	const shouldJoinChatPlatform = isChatPlatformMonitor(user);

	const [activeTab, setActiveTab] = useState(() =>
		normalizeTab(new URLSearchParams(location.search || "").get("tab"))
	);
	const [chats, setChats] = useState([]);
	const [selectedChatId, setSelectedChatId] = useState("");
	const [selectedChat, setSelectedChat] = useState(null);
	const [chatsLoading, setChatsLoading] = useState(false);
	const [threadLoading, setThreadLoading] = useState(false);
	const [error, setError] = useState("");
	const [recipients, setRecipients] = useState([]);
	const [recipientsLoading, setRecipientsLoading] = useState(false);
	const [recipientIds, setRecipientIds] = useState([]);
	const [subject, setSubject] = useState("");
	const [body, setBody] = useState("");
	const [attachments, setAttachments] = useState([]);
	const [previewAttachment, setPreviewAttachment] = useState(null);
	const [emojiOpen, setEmojiOpen] = useState(false);
	const [typingUsers, setTypingUsers] = useState({});
	const [sending, setSending] = useState(false);
	const fileInputRef = useRef(null);
	const seenInFlightRef = useRef(new Set());
	const typingStopTimerRef = useRef(null);
	const typingUsersTimerRef = useRef(new Map());

	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [hasStoredCollapsed]);

	useEffect(() => {
		const nextTab = normalizeTab(
			new URLSearchParams(location.search || "").get("tab")
		);
		setActiveTab(nextTab);
	}, [location.search]);

	const updateTab = (tab) => {
		const nextTab = normalizeTab(tab);
		const query = new URLSearchParams(location.search || "");
		query.set("tab", nextTab);
		history.push({
			pathname: location.pathname,
			search: `?${query.toString()}`,
		});
		setActiveTab(nextTab);
	};

	const loadChats = useCallback(
		async (silent = false) => {
			if (!userId || !token || activeTab === "start") return;
			const status = activeTab === "history" ? "closed" : "active";
			if (!silent) setChatsLoading(true);
			setError("");
			try {
				const data = await listB2BChats(userId, token, { status });
				const rows = Array.isArray(data?.chats) ? data.chats : [];
				setChats(rows);
				setSelectedChatId((previous) => {
					if (previous && rows.some((chat) => chat._id === previous)) {
						return previous;
					}
					return "";
				});
			} catch (err) {
				setError(err?.message || "Could not load chats");
			} finally {
				if (!silent) setChatsLoading(false);
			}
		},
		[activeTab, token, userId]
	);

	const loadSelectedChat = useCallback(
		async (chatId, silent = false) => {
			if (!chatId || !userId || !token) {
				setSelectedChat(null);
				return;
			}
			if (!silent) setThreadLoading(true);
			try {
				const data = await readB2BChat(chatId, userId, token);
				const nextChat = data?.chat || null;
				setSelectedChat(nextChat);
				if (
					Number(nextChat?.unreadCount || 0) > 0 &&
					!seenInFlightRef.current.has(chatId)
				) {
					seenInFlightRef.current.add(chatId);
					markB2BChatSeen(chatId, userId, token)
						.catch(() => {})
						.finally(() => {
							seenInFlightRef.current.delete(chatId);
						});
				}
			} catch (err) {
				setError(err?.message || "Could not load chat");
				setSelectedChat(null);
			} finally {
				if (!silent) setThreadLoading(false);
			}
		},
		[token, userId]
	);

	const loadRecipients = useCallback(async () => {
		if (!userId || !token) return;
		setRecipientsLoading(true);
		setError("");
		try {
			const data = await getB2BChatRecipients(userId, token);
			setRecipients(Array.isArray(data?.recipients) ? data.recipients : []);
		} catch (err) {
			setError(err?.message || "Could not load recipients");
		} finally {
			setRecipientsLoading(false);
		}
	}, [token, userId]);

	useEffect(() => {
		if (activeTab === "start") {
			setSelectedChatId("");
			setSelectedChat(null);
			loadRecipients();
			return undefined;
		}
		loadChats();
		const timer = window.setInterval(() => loadChats(true), POLL_MS);
		return () => window.clearInterval(timer);
	}, [activeTab, loadChats, loadRecipients]);

	useEffect(() => {
		loadSelectedChat(selectedChatId);
	}, [loadSelectedChat, selectedChatId]);

	useEffect(() => {
		if (!userId) return undefined;
		const monitorHotelIds = chatHotelMonitorKey
			? chatHotelMonitorKey.split("|").filter(Boolean)
			: [];
		socket.emit("joinB2BUser", { userId });
		if (shouldJoinChatPlatform) {
			socket.emit("joinB2BPlatform");
		}
		monitorHotelIds.forEach((hotelId) => {
			socket.emit("joinB2BHotel", { hotelId });
		});
		const handleUpdate = (payload = {}) => {
			if (payload.event === "seen" && payload.actorId === userId) return;
			if (payload.chatId === selectedChatId) {
				loadSelectedChat(payload.chatId, true);
			}
			loadChats(true);
		};
		socket.on("b2bChatUpdated", handleUpdate);
		return () => {
			socket.emit("leaveB2BUser", { userId });
			if (shouldJoinChatPlatform) {
				socket.emit("leaveB2BPlatform");
			}
			monitorHotelIds.forEach((hotelId) => {
				socket.emit("leaveB2BHotel", { hotelId });
			});
			socket.off("b2bChatUpdated", handleUpdate);
		};
	}, [
		chatHotelMonitorKey,
		loadChats,
		loadSelectedChat,
		selectedChatId,
		shouldJoinChatPlatform,
		userId,
	]);

	useEffect(() => {
		if (!selectedChatId) return undefined;
		socket.emit("joinB2BChat", { chatId: selectedChatId });
		return () => socket.emit("leaveB2BChat", { chatId: selectedChatId });
	}, [selectedChatId]);

	const clearTypingUser = useCallback((typingUserId) => {
		if (!typingUserId) return;
		const existingTimer = typingUsersTimerRef.current.get(typingUserId);
		if (existingTimer) {
			window.clearTimeout(existingTimer);
			typingUsersTimerRef.current.delete(typingUserId);
		}
		setTypingUsers((previous) => {
			if (!previous[typingUserId]) return previous;
			const next = { ...previous };
			delete next[typingUserId];
			return next;
		});
	}, []);

	const emitStopTyping = useCallback(() => {
		if (typingStopTimerRef.current) {
			window.clearTimeout(typingStopTimerRef.current);
			typingStopTimerRef.current = null;
		}
		if (!selectedChatId || !userId) return;
		socket.emit("b2bStopTyping", {
			chatId: selectedChatId,
			userId,
			name: chatUserDisplayName(user),
		});
	}, [selectedChatId, user, userId]);

	const emitTyping = useCallback(() => {
		if (!selectedChatId || !userId || selectedChat?.status === "closed") return;
		socket.emit("b2bTyping", {
			chatId: selectedChatId,
			userId,
			name: chatUserDisplayName(user),
		});
		if (typingStopTimerRef.current) {
			window.clearTimeout(typingStopTimerRef.current);
		}
		typingStopTimerRef.current = window.setTimeout(emitStopTyping, 1800);
	}, [emitStopTyping, selectedChat?.status, selectedChatId, user, userId]);

	useEffect(() => {
		setTypingUsers({});
		typingUsersTimerRef.current.forEach((timer) => window.clearTimeout(timer));
		typingUsersTimerRef.current.clear();
		return () => {
			emitStopTyping();
		};
	}, [emitStopTyping, selectedChatId]);

	useEffect(() => {
		const handleTyping = (payload = {}) => {
			if (
				!payload.chatId ||
				payload.chatId !== selectedChatId ||
				payload.userId === userId
			) {
				return;
			}
			const typingUserId = String(payload.userId || "");
			if (!typingUserId) return;
			setTypingUsers((previous) => ({
				...previous,
				[typingUserId]: titleCase(payload.name || "Someone"),
			}));
			const existingTimer = typingUsersTimerRef.current.get(typingUserId);
			if (existingTimer) window.clearTimeout(existingTimer);
			typingUsersTimerRef.current.set(
				typingUserId,
				window.setTimeout(() => clearTypingUser(typingUserId), 3200)
			);
		};
		const handleStopTyping = (payload = {}) => {
			if (payload.chatId !== selectedChatId || payload.userId === userId) return;
			clearTypingUser(String(payload.userId || ""));
		};
		socket.on("b2bTyping", handleTyping);
		socket.on("b2bStopTyping", handleStopTyping);
		return () => {
			socket.off("b2bTyping", handleTyping);
			socket.off("b2bStopTyping", handleStopTyping);
		};
	}, [clearTypingUser, selectedChatId, userId]);

	useEffect(
		() => () => {
			if (typingStopTimerRef.current) {
				window.clearTimeout(typingStopTimerRef.current);
			}
			typingUsersTimerRef.current.forEach((timer) => window.clearTimeout(timer));
			typingUsersTimerRef.current.clear();
		},
		[]
	);

	const addFiles = useCallback(
		async (files = []) => {
			const fileList = Array.from(files || []);
			if (!fileList.length) return;
			const validFiles = fileList.filter(
				(file) => file.size <= MAX_CLIENT_ATTACHMENT_SIZE
			);
			if (validFiles.length !== fileList.length) {
				antdMessage.warning(labels.tooLarge);
			}
			const availableSlots = Math.max(0, 6 - attachments.length);
			const selected = validFiles.slice(0, availableSlots);
			const nextAttachments = await Promise.all(
				selected.map(readFileAsAttachment)
			);
			setAttachments((previous) => [...previous, ...nextAttachments].slice(0, 6));
		},
		[attachments.length, labels.tooLarge]
	);

	const handlePaste = (event) => {
		const files = Array.from(event.clipboardData?.items || [])
			.map((item) => (item.kind === "file" ? item.getAsFile() : null))
			.filter(Boolean);
		if (!files.length) return;
		event.preventDefault();
		addFiles(files);
	};

	const handleBodyChange = (event) => {
		const value = event.target.value;
		setBody(value);
		if (value.trim()) {
			emitTyping();
		} else {
			emitStopTyping();
		}
	};

	const handleEmojiSelect = (emojiData = {}) => {
		const emoji = emojiData.emoji || "";
		if (!emoji) return;
		setBody((previous) => `${previous}${emoji}`);
		emitTyping();
	};

	const removeAttachment = (index) => {
		setAttachments((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
	};

	const openAttachment = (attachment) => {
		const safeAttachment = normalizeAttachment(attachment);
		const source = attachmentSource(safeAttachment);
		if (!source) return;
		if (canPreviewAttachment(safeAttachment)) {
			setPreviewAttachment(safeAttachment);
			return;
		}
		window.open(source, "_blank", "noopener,noreferrer");
	};

	const handleStartChat = async () => {
		if (!recipientIds.length) {
			antdMessage.warning(labels.requiredRecipient);
			return;
		}
		setSending(true);
		try {
			const data = await startB2BChat(userId, token, {
				participantIds: recipientIds,
				subject,
			});
			antdMessage.success(labels.started);
			setRecipientIds([]);
			setSubject("");
			updateTab("active");
			setSelectedChatId(data?.chat?._id || "");
		} catch (err) {
			antdMessage.error(err?.message || "Could not start chat");
		} finally {
			setSending(false);
		}
	};

	const handleSend = async () => {
		if (!selectedChatId || sending) return;
		if (!body.trim() && !attachments.length) return;
		setSending(true);
		try {
			const data = await sendB2BChatMessage(selectedChatId, userId, token, {
				body,
				attachments,
			});
			setSelectedChat(data?.chat || null);
			setBody("");
			setAttachments([]);
			setEmojiOpen(false);
			emitStopTyping();
			antdMessage.success(labels.sent);
			loadChats(true);
		} catch (err) {
			antdMessage.error(err?.message || "Could not send message");
		} finally {
			setSending(false);
		}
	};

	const handleComposerKeyDown = (event) => {
		if (event.key !== "Enter" || event.nativeEvent?.isComposing) return;
		if (event.ctrlKey || event.metaKey) return;
		event.preventDefault();
		handleSend();
	};

	const handleClose = async () => {
		if (!selectedChatId) return;
		setSending(true);
		try {
			const data = await closeB2BChat(selectedChatId, userId, token);
			setSelectedChat(data?.chat || null);
			loadChats(true);
		} catch (err) {
			antdMessage.error(err?.message || "Could not close chat");
		} finally {
			setSending(false);
		}
	};

	const recipientOptions = useMemo(
		() =>
			recipients.map((recipient) => {
				const roleLabel = roleLabelForRecipient(recipient, isArabic);
				return {
					value: recipient._id,
					label: `${titleCase(recipient.name || recipient.email || "Account")} - ${roleLabel}`,
				};
			}),
		[isArabic, recipients]
	);

	const tabMeta = [
		{ key: "active", label: labels.active, emoji: CHAT_EMOJI.active, icon: <MessageOutlined /> },
		{ key: "history", label: labels.history, emoji: CHAT_EMOJI.history, icon: <HistoryOutlined /> },
		{ key: "start", label: labels.start, emoji: CHAT_EMOJI.start, icon: <UserAddOutlined /> },
	];

	const selectedClosed = selectedChat?.status === "closed";
	const typingStatus = typingStatusText(typingUsers, labels);

	return (
		<ChatShell $show={collapsed} $isArabic={isArabic} dir={isArabic ? "rtl" : "ltr"}>
			<TopNavbar
				fromPage='B2BChat'
				AdminMenuStatus={AdminMenuStatus}
				setAdminMenuStatus={setAdminMenuStatus}
				collapsed={collapsed}
				setCollapsed={setCollapsed}
				chosenLanguage={chosenLanguage}
			/>
			<AdminOverallSideMenu
				collapsed={collapsed}
				setCollapsed={setCollapsed}
				setAdminMenuStatus={setAdminMenuStatus}
				chosenLanguage={chosenLanguage}
			/>
			<main className='otherContentWrapper'>
				<ChatHeader>
					<div>
						<h1>
							<span className='chat-emoji' aria-hidden='true'>
								{CHAT_EMOJI.header}
							</span>
							{labels.title}
						</h1>
						<p>{labels.subtitle}</p>
					</div>
					<TeamOutlined />
				</ChatHeader>

					<ChatTabs $isArabic={isArabic}>
						{tabMeta.map((tab) => (
							<button
								key={tab.key}
								type='button'
								className={activeTab === tab.key ? "active" : ""}
								onClick={() => updateTab(tab.key)}
							>
								{tab.icon}
								<span className='tab-emoji' aria-hidden='true'>
									{tab.emoji}
								</span>
								<span>{tab.label}</span>
							</button>
						))}
					</ChatTabs>

					{error && <Alert type='error' showIcon message={error} />}

					{activeTab === "start" ? (
						<StartPanel>
							<label>
								<span>
									<span aria-hidden='true'>{CHAT_EMOJI.recipients}</span>
									{labels.recipients}
								</span>
								<Select
									mode='multiple'
									value={recipientIds}
									onChange={setRecipientIds}
									options={recipientOptions}
									loading={recipientsLoading}
									showSearch
									optionFilterProp='label'
									placeholder={labels.recipient}
									notFoundContent={
										recipientsLoading ? <Spin size='small' /> : labels.noRecipients
									}
								/>
							</label>
							<label>
								<span>
									<span aria-hidden='true'>{CHAT_EMOJI.subject}</span>
									{labels.subject}
								</span>
								<Input
									value={subject}
									onChange={(event) => setSubject(event.target.value)}
									maxLength={140}
									placeholder={labels.subject}
								/>
							</label>
							<Button
								type='primary'
								icon={<UserAddOutlined />}
								onClick={handleStartChat}
								loading={sending}
							>
								<span aria-hidden='true'>{CHAT_EMOJI.launch}</span>
								{labels.startChat}
							</Button>
							{!recipientsLoading && !recipients.length && (
								<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={labels.noRecipients} />
							)}
						</StartPanel>
					) : (
						<ChatWorkspace $hasSelected={Boolean(selectedChatId)}>
							<ChatListPanel>
								<div className='panel-title'>
									{activeTab === "history" ? labels.history : labels.active}
								</div>
								{chatsLoading ? (
									<CenteredSpin>
										<Spin />
									</CenteredSpin>
								) : chats.length ? (
									chats.map((chat) => (
										<ChatListItem
											key={chat._id}
											type='button'
											className={selectedChatId === chat._id ? "active" : ""}
											onClick={() => setSelectedChatId(chat._id)}
										>
											<div className='chat-row-top'>
												<strong>{chatTitle(chat, userId)}</strong>
												<Badge count={chat.unreadCount || 0} size='small' />
											</div>
											<p>{lastMessageText(chat, labels)}</p>
											<div className='chat-row-meta'>
												<span>{formatDateTime(chat.lastActivityAt, isArabic)}</span>
												<Tag color={chat.scope === "agent" ? "purple" : "blue"}>
													{chat.scope === "agent" ? labels.agent : labels.internal}
												</Tag>
											</div>
										</ChatListItem>
									))
								) : (
									<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={labels.noChats} />
								)}
							</ChatListPanel>

							<ThreadPanel>
								{threadLoading ? (
									<CenteredSpin>
										<Spin />
									</CenteredSpin>
								) : selectedChat ? (
									<>
										<ThreadHeader>
											<Button
												className='mobile-back'
												type='text'
												onClick={() => setSelectedChatId("")}
											>
												<span aria-hidden='true'>{CHAT_EMOJI.back}</span>
												{labels.backToChats}
											</Button>
											<div>
												<h2>{chatTitle(selectedChat, userId)}</h2>
												<div className='thread-tags'>
													<Tag color={selectedClosed ? "default" : "green"}>
														{selectedClosed ? labels.closed : labels.activeStatus}
													</Tag>
													<Tag color={selectedChat.scope === "agent" ? "purple" : "blue"}>
														{selectedChat.scope === "agent" ? labels.agent : labels.internal}
													</Tag>
													<span>
														{otherParticipants(selectedChat, userId)
															.map((participant) => participant.name)
															.join(", ")}
													</span>
												</div>
											</div>
											{!selectedClosed && (
												<Tooltip title={labels.close}>
													<Button
														danger
														icon={<CloseCircleOutlined />}
														onClick={handleClose}
														loading={sending}
													/>
												</Tooltip>
											)}
										</ThreadHeader>

										<MessageList>
											{(selectedChat.messages || []).filter(Boolean).map((item) => {
												const mine = item.senderId === userId;
												const messageAttachments = validAttachments(item.attachments);
												return (
													<MessageBubble key={item._id} $mine={mine}>
														<div className='bubble-meta'>
															<strong>{item.senderName}</strong>
															<span>{formatDateTime(item.createdAt, isArabic)}</span>
														</div>
														{item.body && <p>{item.body}</p>}
														{!!messageAttachments.length && (
															<AttachmentGrid>
																{messageAttachments.map((attachment, index) => {
																	const source = attachmentSource(attachment);
																	const name = attachmentName(attachment);
																	return (
																		<AttachmentButton
																			key={`${name}-${index}`}
																			type='button'
																			onClick={() => openAttachment(attachment)}
																		>
																			{isImageAttachment(attachment) ? (
																				<img src={source} alt={name} />
																			) : (
																				<FileImageOutlined />
																			)}
																			<span>{name}</span>
																		</AttachmentButton>
																	);
																})}
															</AttachmentGrid>
														)}
													</MessageBubble>
												);
											})}
										</MessageList>

										{typingStatus && (
											<TypingIndicator>
												<span>{typingStatus}</span>
												<i />
												<i />
												<i />
											</TypingIndicator>
										)}

										{selectedClosed ? (
											<ClosedNotice>{labels.closedNotice}</ClosedNotice>
										) : (
											<Composer>
												<Input.TextArea
													value={body}
													onChange={handleBodyChange}
													onKeyDown={handleComposerKeyDown}
													onPaste={handlePaste}
													autoSize={{ minRows: 2, maxRows: 5 }}
													placeholder={labels.messagePlaceholder}
												/>
												{!!attachments.length && (
													<PendingAttachments>
														{validAttachments(attachments).map((attachment, index) => (
															<button
																key={`${attachmentName(attachment)}-${index}`}
																type='button'
																onClick={() => removeAttachment(index)}
															>
																<PaperClipOutlined />
																<span>{attachmentName(attachment)}</span>
																<small>{labels.removed}</small>
															</button>
														))}
													</PendingAttachments>
												)}
												<div className='composer-actions'>
													<input
														ref={fileInputRef}
														type='file'
														multiple
														style={{ display: "none" }}
														onChange={(event) => {
															addFiles(event.target.files);
															event.target.value = "";
														}}
													/>
													<Popover
														open={emojiOpen}
														onOpenChange={setEmojiOpen}
														trigger='click'
														placement='top'
														content={
															<EmojiPanel>
																<EmojiPicker
																	onEmojiClick={handleEmojiSelect}
																	lazyLoadEmojis
																	searchDisabled={false}
																	skinTonesDisabled
																	width='100%'
																	height={360}
																/>
															</EmojiPanel>
														}
													>
														<Button icon={<SmileOutlined />}>
															<span aria-hidden='true'>🙂</span>
															{labels.emoji}
														</Button>
													</Popover>
													<Button
														icon={<PaperClipOutlined />}
														onClick={() => fileInputRef.current?.click()}
													>
														<span aria-hidden='true'>{CHAT_EMOJI.attach}</span>
														{labels.attach}
													</Button>
													<Button
														type='primary'
														icon={<SendOutlined />}
														onClick={handleSend}
														loading={sending}
														disabled={!body.trim() && !attachments.length}
													>
														<span aria-hidden='true'>{CHAT_EMOJI.send}</span>
														{labels.send}
													</Button>
												</div>
											</Composer>
										)}
									</>
								) : (
									<Empty
										image={<InboxOutlined style={{ fontSize: 42, color: "#8aa4c1" }} />}
										description={labels.selectChat}
									/>
								)}
							</ThreadPanel>
						</ChatWorkspace>
					)}
				</main>
			<AttachmentPreviewModal
				open={Boolean(previewAttachment)}
				onCancel={() => setPreviewAttachment(null)}
				footer={null}
				centered
				width='min(980px, calc(100vw - 24px))'
				title={attachmentName(previewAttachment, labels.attachments)}
				destroyOnClose
			>
				<PreviewBody>
					{isImageAttachment(previewAttachment) ? (
						<img
							src={attachmentSource(previewAttachment)}
							alt={attachmentName(previewAttachment, labels.attachments)}
						/>
					) : isPdfAttachment(previewAttachment) ? (
						<iframe
							title={attachmentName(previewAttachment, labels.attachments)}
							src={attachmentSource(previewAttachment)}
						/>
					) : null}
				</PreviewBody>
			</AttachmentPreviewModal>
		</ChatShell>
	);
};

export default B2BChatMain;

const ChatShell = styled.div`
	overflow-x: hidden;
	margin-top: 70px;
	min-height: calc(100vh - 70px);
	background: #f5f8fc;
	padding: ${(props) =>
		props.$isArabic
			? `10px ${props.$show ? "90px" : "295px"} 10px 10px`
			: `10px 10px 10px ${props.$show ? "90px" : "295px"}`};
	transition: padding 0.22s ease;

	.otherContentWrapper {
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
		min-width: 0;
		width: 100%;
	}

	@media (max-width: 1200px) {
		padding: ${(props) =>
			props.$show
				? props.$isArabic
					? "10px 90px 10px 10px"
					: "10px 10px 10px 90px"
				: "10px"};
	}

	@media (max-width: 640px) {
		margin-top: 62px;
		min-height: calc(100vh - 62px);
		padding: 8px;
	}
`;

const ChatHeader = styled.header`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 12px;
	padding: 18px 20px;
	border: 1px solid rgba(45, 93, 145, 0.2);
	border-radius: 10px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.98)),
		linear-gradient(180deg, rgba(141, 76, 157, 0.12), rgba(16, 32, 51, 0.08));
	box-shadow: 0 12px 28px rgba(16, 32, 51, 0.08);

	h1 {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		color: #102033;
		font-size: clamp(1.35rem, 2vw, 2rem);
		font-weight: 950;
	}

	.chat-emoji {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: linear-gradient(135deg, #102033 0%, #24547d 58%, #6f1f78 100%);
		box-shadow: 0 8px 18px rgba(16, 32, 51, 0.18);
		font-size: 1.15rem;
	}

	p {
		margin: 4px 0 0;
		color: #5d6b82;
		font-weight: 800;
	}

	.anticon {
		font-size: 28px;
		color: #64166e;
	}

	@media (max-width: 760px) {
		margin-bottom: 8px;
		padding: 12px 14px;
		border-radius: 8px;

		h1 {
			font-size: 1.25rem;
		}

		p {
			font-size: 0.78rem;
			line-height: 1.55;
		}

		> .anticon {
			display: none;
		}
	}
`;

const ChatTabs = styled.div`
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
	padding: 8px;
	border: 1px solid rgba(141, 76, 157, 0.2);
	border-radius: 10px;
	background: #ffffff;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
	overflow-x: auto;

	button {
		flex: 1 0 180px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 46px;
		border: 1px solid rgba(45, 93, 145, 0.18);
		border-radius: 8px;
		background: #f8fbff;
		color: #102033;
		font-weight: 900;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			box-shadow 0.18s ease,
			background 0.18s ease,
			color 0.18s ease;
	}

	button:hover {
		transform: translateY(-1px);
		border-color: rgba(141, 76, 157, 0.42);
		box-shadow: 0 8px 18px rgba(16, 32, 51, 0.08);
	}

	button.active {
		background: linear-gradient(180deg, #244e7d 0%, #102033 100%);
		color: #ffffff;
		box-shadow: 0 10px 20px rgba(16, 32, 51, 0.22);
	}

	.tab-emoji {
		font-size: 0.98rem;
		line-height: 1;
		filter: drop-shadow(0 1px 1px rgba(16, 32, 51, 0.16));
	}

	@media (max-width: 640px) {
		gap: 6px;
		padding: 6px;

		button {
			flex: 1 0 0;
			min-width: 0;
			min-height: 42px;
			padding-inline: 6px;
			font-size: 0.76rem;
			white-space: normal;
		}
	}
`;

const ChatWorkspace = styled.section`
	display: grid;
	grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
	gap: 12px;
	min-height: calc(100vh - 250px);

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}

	@media (max-width: 760px) {
		min-height: calc(100dvh - 210px);

		> aside {
			display: ${(props) => (props.$hasSelected ? "none" : "block")};
		}

		> section {
			display: ${(props) => (props.$hasSelected ? "flex" : "none")};
		}
	}
`;

const ChatListPanel = styled.aside`
	border: 1px solid #d9e6f5;
	border-radius: 10px;
	background: #ffffff;
	padding: 10px;
	min-width: 0;
	overflow: hidden;

	.panel-title {
		margin-bottom: 8px;
		color: #102033;
		font-weight: 950;
	}

	@media (max-width: 760px) {
		min-height: calc(100dvh - 230px);
		padding: 8px;
		border-radius: 8px;
		overflow-y: auto;
	}
`;

const ChatListItem = styled.button`
	width: 100%;
	margin-bottom: 8px;
	padding: 11px;
	border: 1px solid #dbe7f4;
	border-radius: 8px;
	background: #f8fbff;
	text-align: start;
	cursor: pointer;
	transition:
		border-color 0.18s ease,
		box-shadow 0.18s ease,
		background 0.18s ease;

	&.active,
	&:hover {
		border-color: rgba(141, 76, 157, 0.5);
		background: #ffffff;
		box-shadow: 0 8px 18px rgba(16, 32, 51, 0.08);
	}

	.chat-row-top,
	.chat-row-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	strong {
		min-width: 0;
		color: #102033;
		font-weight: 950;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	p {
		margin: 6px 0;
		color: #5d6b82;
		font-weight: 800;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chat-row-meta span {
		color: #667085;
		font-size: 0.78rem;
		font-weight: 800;
	}

	@media (max-width: 760px) {
		min-height: 74px;
		margin-bottom: 7px;
		padding: 10px;

		strong,
		p {
			font-size: 0.86rem;
		}

		.chat-row-meta {
			align-items: flex-start;
		}
	}
`;

const ThreadPanel = styled.section`
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 560px;
	border: 1px solid #d9e6f5;
	border-radius: 10px;
	background: #ffffff;
	overflow: hidden;

	@media (max-width: 760px) {
		min-height: calc(100dvh - 210px);
		height: calc(100dvh - 210px);
		border-radius: 8px;
	}
`;

const ThreadHeader = styled.header`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	padding: 14px 16px;
	border-bottom: 1px solid #d9e6f5;
	background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);

	h2 {
		margin: 0 0 7px;
		color: #102033;
		font-size: 1.1rem;
		font-weight: 950;
	}

	.thread-tags {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		color: #667085;
		font-weight: 800;
	}

	.mobile-back {
		display: none;
	}

	@media (max-width: 760px) {
		align-items: center;
		gap: 8px;
		padding: 10px;

		.mobile-back {
			display: inline-flex;
			flex: 0 0 auto;
			min-width: 54px;
			height: 36px;
			padding-inline: 8px;
			border: 1px solid #d9e6f5;
			border-radius: 999px;
			background: #ffffff;
			color: #102033;
			font-weight: 950;
		}

		h2 {
			font-size: 0.98rem;
			line-height: 1.35;
		}

		.thread-tags {
			gap: 4px;
			font-size: 0.76rem;
		}
	}
`;

const MessageList = styled.div`
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 14px;
	background: #f5f8fc;
	overflow-y: auto;

	@media (max-width: 760px) {
		padding: 10px 8px;
		gap: 8px;
	}
`;

const TypingIndicator = styled.div`
	display: inline-flex;
	align-items: center;
	align-self: flex-start;
	gap: 6px;
	margin: 0 14px 10px;
	padding: 8px 12px;
	border: 1px solid rgba(45, 93, 145, 0.16);
	border-radius: 999px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.98)),
		linear-gradient(135deg, rgba(141, 76, 157, 0.1), rgba(36, 84, 125, 0.08));
	box-shadow: 0 8px 18px rgba(16, 32, 51, 0.06);
	color: #40536f;
	font-size: 0.82rem;
	font-weight: 900;

	span {
		margin-inline-end: 2px;
	}

	i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #6f1f78;
		animation: b2bTypingPulse 1s infinite ease-in-out;
	}

	i:nth-of-type(2) {
		animation-delay: 0.16s;
	}

	i:nth-of-type(3) {
		animation-delay: 0.32s;
	}

	@keyframes b2bTypingPulse {
		0%,
		80%,
		100% {
			opacity: 0.35;
			transform: translateY(0);
		}
		40% {
			opacity: 1;
			transform: translateY(-3px);
		}
	}

	@media (max-width: 760px) {
		margin: 0 8px 8px;
		font-size: 0.76rem;
	}
`;

const MessageBubble = styled.article`
	align-self: ${(props) => (props.$mine ? "flex-end" : "flex-start")};
	width: min(680px, 88%);
	padding: 11px 12px;
	border: 1px solid ${(props) => (props.$mine ? "#c8d9f0" : "#ead7ef")};
	border-radius: 10px;
	background: ${(props) =>
		props.$mine
			? "linear-gradient(180deg, #ffffff 0%, #eef5ff 100%)"
			: "linear-gradient(180deg, #ffffff 0%, #fbf6ff 100%)"};
	box-shadow: 0 8px 18px rgba(16, 32, 51, 0.06);

	.bubble-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 6px;
		color: #667085;
		font-size: 0.78rem;
		font-weight: 800;
	}

	.bubble-meta strong {
		color: #102033;
	}

	p {
		margin: 0;
		color: #101828;
		font-weight: 800;
		line-height: 1.65;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	@media (max-width: 640px) {
		width: 94%;
		padding: 10px;

		.bubble-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: 2px;
		}
	}
`;

const AttachmentGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
	gap: 8px;
	margin-top: 10px;

	img {
		width: 42px;
		height: 42px;
		object-fit: cover;
		border-radius: 6px;
	}

	span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const AttachmentButton = styled.button`
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	padding: 8px;
	border: 1px solid #d9e6f5;
	border-radius: 8px;
	background: #ffffff;
	color: #102033;
	font-weight: 800;
	text-align: start;
	cursor: pointer;
	transition:
		border-color 0.18s ease,
		box-shadow 0.18s ease,
		transform 0.18s ease;

	&:hover,
	&:focus-visible {
		border-color: rgba(111, 31, 120, 0.48);
		box-shadow: 0 8px 18px rgba(16, 32, 51, 0.1);
		transform: translateY(-1px);
		outline: none;
	}

	.anticon {
		flex: 0 0 auto;
		font-size: 22px;
		color: #24547d;
	}
`;

const AttachmentPreviewModal = styled(Modal)`
	.ant-modal-content {
		border-radius: 10px;
		overflow: hidden;
	}

	.ant-modal-header {
		margin: 0;
		padding: 14px 18px;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.98)),
			linear-gradient(180deg, rgba(141, 76, 157, 0.12), rgba(16, 32, 51, 0.08));
		border-bottom: 1px solid rgba(45, 93, 145, 0.16);
	}

	.ant-modal-title {
		color: #102033;
		font-weight: 950;
		overflow-wrap: anywhere;
	}

	.ant-modal-body {
		padding: 0;
		background: #0f172a;
	}
`;

const PreviewBody = styled.div`
	display: grid;
	place-items: center;
	min-height: min(72vh, 720px);
	background:
		radial-gradient(circle at 20% 20%, rgba(103, 167, 223, 0.16), transparent 26%),
		linear-gradient(135deg, #0f172a 0%, #102033 100%);

	img {
		display: block;
		max-width: 100%;
		max-height: 72vh;
		object-fit: contain;
	}

	iframe {
		width: 100%;
		height: 72vh;
		border: 0;
		background: #ffffff;
	}

	@media (max-width: 640px) {
		min-height: 62vh;

		img,
		iframe {
			max-height: 62vh;
			height: 62vh;
		}
	}
`;

const Composer = styled.div`
	padding: 12px;
	border-top: 1px solid #d9e6f5;
	background: #ffffff;

	.composer-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 10px;
	}

	@media (max-width: 760px) {
		padding: 8px;

		.ant-input {
			font-size: 16px;
		}

		.composer-actions {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 8px;
		}

		.composer-actions .ant-btn {
			min-width: 0;
			height: 40px;
			padding-inline: 8px;
		}
	}
`;

const EmojiPanel = styled.div`
	width: min(352px, calc(100vw - 28px));

	.epr-main {
		border: 0;
		box-shadow: none;
		font-family: inherit;
	}

	@media (max-width: 420px) {
		width: calc(100vw - 28px);
	}
`;

const PendingAttachments = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 8px;

	button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 220px;
		border: 1px solid #d9e6f5;
		border-radius: 999px;
		background: #f8fbff;
		color: #102033;
		padding: 6px 10px;
		font-weight: 800;
		cursor: pointer;
	}

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	small {
		color: #b42318;
		font-weight: 900;
	}

	@media (max-width: 760px) {
		flex-wrap: nowrap;
		overflow-x: auto;

		button {
			flex: 0 0 auto;
			max-width: 180px;
		}
	}
`;

const ClosedNotice = styled.div`
	margin: 12px;
	padding: 12px;
	border: 1px solid #d9e6f5;
	border-radius: 8px;
	background: #f8fbff;
	color: #5d6b82;
	font-weight: 900;
`;

const StartPanel = styled.section`
	display: grid;
	gap: 14px;
	max-width: 860px;
	padding: 18px;
	border: 1px solid #d9e6f5;
	border-radius: 10px;
	background: #ffffff;
	box-shadow: 0 12px 28px rgba(16, 32, 51, 0.07);

	label {
		display: grid;
		gap: 6px;
		color: #102033;
		font-weight: 950;
	}

	label > span,
	.ant-btn > span[aria-hidden="true"] {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	@media (max-width: 760px) {
		max-width: none;
		padding: 12px;
		border-radius: 8px;

		.ant-select,
		.ant-input {
			width: 100%;
		}
	}
`;

const CenteredSpin = styled.div`
	display: grid;
	place-items: center;
	min-height: 180px;
`;
