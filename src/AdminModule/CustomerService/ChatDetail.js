import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useLocation, useHistory } from "react-router-dom"; // For going back
import { isAuthenticated } from "../../auth";
import { updateSupportCase, deleteSpecificMessage } from "../apiAdmin";
import {
	Input,
	Select,
	Button as AntdButton,
	Upload,
	Form,
	Switch,
	message as antMessage,
} from "antd";
import socket from "../../socket";
import EmojiPicker from "emoji-picker-react";
import {
	SmileOutlined,
	UploadOutlined,
	DeleteOutlined,
} from "@ant-design/icons";
import HelperSideDrawer from "./HelperSideDrawer";
import { isConfiguredSuperAdminUser } from "../utils/superUsers";

const { Option } = Select;

const RTL_LANGUAGE_PATTERN = /(arabic|urdu|\bar\b|\bur\b|العربية|اردو)/i;
const RTL_SCRIPT_PATTERN = /[\u0590-\u08FF]/;
const isMobileKeyboardViewport = () =>
	typeof window !== "undefined" &&
	(window.innerWidth <= 768 ||
		window.matchMedia?.("(pointer: coarse)")?.matches);

const CHAT_DETAIL_LABELS = {
	ltr: {
		back: "Back",
		inquiryAbout: "Inquiry About",
		details: "Details",
		open: "Open",
		closed: "Closed",
		reserveRoom: "Reserve A Room",
		customDisplayName: "Custom Display Name",
		displayNamePlaceholder: "Enter a custom display name",
		typeMessage: "Type your message...",
		send: "Send",
		aiReplies: "AI Replies",
		aiActiveHint: "AI can respond to this client chat.",
		aiOffHint: "AI is stopped. You can respond manually now.",
		stopAi: "Stop AI",
		startAi: "Start AI",
		aiStopped: "AI replies are off. You can respond manually now.",
		aiStarted: "AI replies are active for this chat.",
		aiUpdateError: "Unable to update AI reply status.",
		manualLockNotice:
			"AI replies are on for this chat. Stop AI before taking over manually.",
		escalationActive: "Escalation Active",
		escalationHint:
			"A Jannat Booking employee needs to review this case personally.",
		markEscalationAddressed: "Mark Escalation Addressed",
		escalationAddressed: "Escalation marked as addressed.",
		escalationUpdateError: "Unable to update escalation status.",
		typing: "is typing...",
		clientName: "Client Name",
		clientContact: "Email / Phone",
		sameClientChats: "Chats With Same Contact",
		currentHotel: "Hotel",
		source: "Source",
		noClientContact: "Not saved yet",
		aiMonitor: "AI Monitor",
		aiHealthy: "Healthy",
		aiWatch: "Watch",
		aiSlow: "Slow",
		aiPaused: "AI paused",
		aiResponder: "Responder",
		avgReply: "Avg reply",
		maxReply: "Max reply",
		lastReply: "Last reply",
		waiting: "Waiting",
		guestTurns: "Guest turns",
		unanswered: "Unanswered",
		duplicateAi: "Duplicate AI",
		noAiRepliesYet: "No AI replies yet",
	},
	rtl: {
		back: "رجوع",
		inquiryAbout: "موضوع الطلب",
		details: "التفاصيل",
		open: "مفتوح",
		closed: "مغلق",
		reserveRoom: "حجز غرفة",
		customDisplayName: "اسم الموظف الظاهر للعميل",
		displayNamePlaceholder: "اكتب اسم الموظف الظاهر للعميل",
		typeMessage: "اكتب رسالتك...",
		send: "إرسال",
		aiReplies: "\u0631\u062f\u0648\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a",
		aiActiveHint: "\u064a\u0645\u0643\u0646 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0627\u0644\u0631\u062f \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629.",
		aiOffHint: "\u062a\u0645 \u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a. \u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u0631\u062f \u064a\u062f\u0648\u064a\u0627\u064b \u0627\u0644\u0622\u0646.",
		stopAi: "\u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u0630\u0643\u0627\u0621",
		startAi: "\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0630\u0643\u0627\u0621",
		aiStopped: "\u062a\u0645 \u0625\u064a\u0642\u0627\u0641 \u0631\u062f\u0648\u062f \u0627\u0644\u0630\u0643\u0627\u0621. \u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u0631\u062f \u064a\u062f\u0648\u064a\u0627\u064b \u0627\u0644\u0622\u0646.",
		aiStarted: "\u062a\u0645 \u062a\u0634\u063a\u064a\u0644 \u0631\u062f\u0648\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0644\u0647\u0630\u0647 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629.",
		aiUpdateError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0631\u062f\u0648\u062f \u0627\u0644\u0630\u0643\u0627\u0621.",
		manualLockNotice: "\u0631\u062f\u0648\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0645\u0641\u0639\u0644\u0629. \u0623\u0648\u0642\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0642\u0628\u0644 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0648\u0627\u0644\u0631\u062f \u064a\u062f\u0648\u064a\u0627\u064b.",
		escalationActive: "\u062a\u0635\u0639\u064a\u062f \u0646\u0634\u0637",
		escalationHint: "\u0647\u0630\u0647 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629 \u062a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0646 \u0645\u0648\u0638\u0641 Jannat Booking.",
		markEscalationAddressed: "\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062a\u0635\u0639\u064a\u062f",
		escalationAddressed: "\u062a\u0645 \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062a\u0635\u0639\u064a\u062f.",
		escalationUpdateError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0635\u0639\u064a\u062f.",
		typing: "\u064a\u0643\u062a\u0628 \u0627\u0644\u0622\u0646...",
		clientName: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064a\u0644",
		clientContact: "\u0627\u0644\u0628\u0631\u064a\u062f / \u0627\u0644\u0647\u0627\u062a\u0641",
		sameClientChats:
			"\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0628\u0646\u0641\u0633 \u0627\u0644\u062a\u0648\u0627\u0635\u0644",
		currentHotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
		source: "\u0627\u0644\u0645\u0635\u062f\u0631",
		noClientContact:
			"\u0644\u0645 \u064a\u062a\u0645 \u062d\u0641\u0638\u0647 \u0628\u0639\u062f",
		aiMonitor: "\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0630\u0643\u0627\u0621",
		aiHealthy: "\u0633\u0644\u064a\u0645",
		aiWatch: "\u062a\u062d\u062a \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629",
		aiSlow: "\u0628\u0637\u064a\u0621",
		aiPaused: "\u0645\u062a\u0648\u0642\u0641",
		aiResponder: "\u0627\u0644\u0645\u0648\u0638\u0641\u0629",
		avgReply: "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0631\u062f",
		maxReply: "\u0623\u0637\u0648\u0644 \u0631\u062f",
		lastReply: "\u0622\u062e\u0631 \u0631\u062f",
		waiting: "\u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631",
		guestTurns: "\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0636\u064a\u0641",
		unanswered: "\u0628\u0644\u0627 \u0631\u062f",
		duplicateAi: "\u062a\u0643\u0631\u0627\u0631 \u0627\u0644\u0630\u0643\u0627\u0621",
		noAiRepliesYet:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u0631\u062f\u0648\u062f \u062d\u062a\u0649 \u0627\u0644\u0622\u0646",
	},
};

const getFirstConversation = (chat = {}) =>
	Array.isArray(chat.conversation) ? chat.conversation[0] || {} : {};

const getLanguageText = (chat = {}) => {
	const firstConversation = getFirstConversation(chat);
	return [
		chat.preferredLanguage,
		chat.preferredLanguageCode,
		firstConversation.preferredLanguage,
		firstConversation.preferredLanguageCode,
	]
		.filter(Boolean)
		.join(" ");
};

const isRtlSupportCase = (chat = {}) =>
	RTL_LANGUAGE_PATTERN.test(getLanguageText(chat));

const isRtlMessage = (message = {}, fallbackRtl = false) => {
	const languageText = [
		message.preferredLanguage,
		message.preferredLanguageCode,
	]
		.filter(Boolean)
		.join(" ");
	if (RTL_LANGUAGE_PATTERN.test(languageText)) return true;
	const text = String(message.message || "");
	return fallbackRtl && RTL_SCRIPT_PATTERN.test(text);
};

const hasCorruptedEncoding = (value = "") =>
	/\uFFFD|\?{3,}/.test(String(value || ""));

const cleanDisplayText = (value = "", fallback = "") => {
	const text = String(value || "").trim();
	if (!text || hasCorruptedEncoding(text)) return fallback;
	return text;
};

const messageIdentity = (message = {}) => {
	if (message.clientTag) return `client:${message.clientTag}`;
	if (message._id) return `id:${message._id}`;
	return [
		message.messageBy?.customerEmail || "",
		message.messageBy?.userId || "",
		message.messageBy?.customerName || "",
		message.message || "",
		message.date ? new Date(message.date).getTime() : "",
	].join("|");
};

const sameConversationMessage = (a = {}, b = {}) => {
	const aIdentity = messageIdentity(a);
	const bIdentity = messageIdentity(b);
	if (aIdentity && bIdentity && aIdentity === bIdentity) return true;
	return (
		String(a.message || "") === String(b.message || "") &&
		String(a.messageBy?.customerEmail || "") ===
			String(b.messageBy?.customerEmail || "") &&
		String(a.messageBy?.customerName || "") ===
			String(b.messageBy?.customerName || "") &&
		String(a.date ? new Date(a.date).getTime() : "") ===
			String(b.date ? new Date(b.date).getTime() : "")
	);
};

const getHotelName = (chat = {}) => {
	const firstConversation = getFirstConversation(chat);
	return (
		chat?.hotelId?.hotelName ||
		firstConversation?.messageBy?.customerName ||
		"Jannat Booking"
	);
};

const supportContacts = new Set([
	"support@jannatbooking.com",
	"management@xhotelpro.com",
	"noreply@jannatbooking.com",
	"guest@jannatbooking.com",
]);

const aiReplyContacts = new Set([
	"support@jannatbooking.com",
	"management@xhotelpro.com",
	"noreply@jannatbooking.com",
]);

const messageTimestamp = (message = {}) => {
	const time = message?.date ? new Date(message.date).getTime() : 0;
	return Number.isFinite(time) ? time : 0;
};

const isAiSupportMessage = (message = {}) => {
	const contact = cleanDisplayText(
		message?.messageBy?.customerEmail,
		""
	).toLowerCase();
	return (
		message?.isAi === true ||
		message?.isSystem === true ||
		aiReplyContacts.has(contact) ||
		String(message?.messageBy?.userId || "") === "jannat-ai-support"
	);
};

const isGuestSupportMessage = (message = {}) =>
	Boolean(message?.message) && !isAiSupportMessage(message);

const formatMonitorDuration = (ms) => {
	const value = Number(ms || 0);
	if (!Number.isFinite(value) || value <= 0) return "-";
	const seconds = Math.round(value / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds % 60;
	return `${minutes}m ${remainder}s`;
};

const aiReplyDelayForIndex = (conversation = [], index = -1) => {
	const message = conversation[index];
	if (!isAiSupportMessage(message)) return null;
	const aiTime = messageTimestamp(message);
	if (!aiTime) return null;
	let guestTime = 0;
	for (let i = index - 1; i >= 0; i -= 1) {
		const previous = conversation[i];
		if (isAiSupportMessage(previous)) break;
		if (isGuestSupportMessage(previous)) {
			const time = messageTimestamp(previous);
			if (time) guestTime = time;
		}
	}
	return guestTime && aiTime >= guestTime ? aiTime - guestTime : null;
};

const buildAiMonitor = (conversation = [], chat = {}, nowMs = Date.now()) => {
	const delays = [];
	let guestTurns = 0;
	let answeredTurns = 0;
	let duplicateAiTurns = 0;
	let pendingGuestAt = 0;
	let previousKind = "";

	(conversation || []).forEach((entry) => {
		if (!entry?.message) return;
		if (isGuestSupportMessage(entry)) {
			if (previousKind !== "guest") {
				guestTurns += 1;
				pendingGuestAt = messageTimestamp(entry);
			}
			previousKind = "guest";
			return;
		}
		if (isAiSupportMessage(entry)) {
			if (previousKind === "ai") duplicateAiTurns += 1;
			const aiTime = messageTimestamp(entry);
			if (pendingGuestAt && aiTime >= pendingGuestAt) {
				delays.push(aiTime - pendingGuestAt);
				answeredTurns += 1;
				pendingGuestAt = 0;
			}
			previousKind = "ai";
		}
	});

	const currentWaitMs = pendingGuestAt ? Math.max(0, nowMs - pendingGuestAt) : 0;
	const avgMs = delays.length
		? delays.reduce((sum, value) => sum + value, 0) / delays.length
		: 0;
	const maxMs = delays.length ? Math.max(...delays) : 0;
	const lastMs = delays.length ? delays[delays.length - 1] : 0;
	let status = "healthy";
	if (currentWaitMs > 20000 || maxMs > 45000 || duplicateAiTurns > 0) {
		status = "slow";
	} else if (currentWaitMs > 12000 || avgMs > 12000 || maxMs > 25000) {
		status = "watch";
	}

	return {
		status,
		responder: chat.aiResponderName || chat.supporterName || "AI",
		guestTurns,
		answeredTurns,
		unansweredTurns: pendingGuestAt ? 1 : 0,
		duplicateAiTurns,
		currentWaitMs,
		avgMs,
		maxMs,
		lastMs,
		hasReplies: delays.length > 0,
	};
};

const firstGuestMessage = (chat = {}) =>
	Array.isArray(chat.conversation)
		? chat.conversation.find((entry) => {
				const contact = cleanDisplayText(
					entry?.messageBy?.customerEmail,
					""
				).toLowerCase();
				return (
					entry &&
					!entry.isSystem &&
					!entry.isAi &&
					contact &&
					!supportContacts.has(contact) &&
					entry.seenByCustomer === true &&
					entry.seenByAdmin !== true
				);
		  })
		: null;

const isJannatBookingCase = (chat = {}) =>
	String(chat?.hotelId?._id || chat?.hotelId || "") === "674cf8997e3780f1f838d458";

const supportSourceLabel = (chat = {}, isRtl = false) => {
	const source = String(chat.sourcePage || chat.sourceWebsite || "").toLowerCase();
	if (!source) return "";
	if (source.includes("contact_page")) {
		return isRtl ? "\u0646\u0645\u0648\u0630\u062c \u0627\u0644\u062a\u0648\u0627\u0635\u0644" : "Contact page";
	}
	if (source.includes("support_widget")) {
		return isRtl ? "\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629" : "Chat widget";
	}
	if (source.includes("checkout")) {
		return isRtl ? "\u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u062d\u062c\u0632" : "Checkout";
	}
	return isRtl ? "\u0645\u0648\u0642\u0639 \u062c\u0646\u0627\u062a" : "Jannat site";
};

const ChatDetail = ({
	chat,
	isHistory,
	fetchChats,
	selectedCase,
	setSelectedCase,
	setSupportCases,
}) => {
	const { user, token } = isAuthenticated();
	const canEditChatDisplayName = isConfiguredSuperAdminUser(user);
	const [messages, setMessages] = useState(chat.conversation);
	const [newMessage, setNewMessage] = useState("");
	const [caseStatus, setCaseStatus] = useState(chat.caseStatus);
	const [aiEnabled, setAiEnabled] = useState(Boolean(chat.aiToRespond));
	const [aiUpdating, setAiUpdating] = useState(false);
	const [escalationStatus, setEscalationStatus] = useState(
		chat.escalationStatus || "none"
	);
	const [escalationUpdating, setEscalationUpdating] = useState(false);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [typingStatus, setTypingStatus] = useState("");
	const [fileList, setFileList] = useState([]);
	const [displayName, setDisplayName] = useState(
		chat.displayName1 || chat.supporterName || user.name || user.email || "Account"
	);
	const [drawerVisible, setDrawerVisible] = useState(false);
	const messagesEndRef = useRef(null);
	const [monitorNow, setMonitorNow] = useState(Date.now());

	// For mobile "back" arrow logic
	const history = useHistory();
	const location = useLocation();
	const isMobile = isMobileKeyboardViewport();
	const queryParams = new URLSearchParams(location.search);
	const caseIdParam = queryParams.get("caseId") || queryParams.get("id");
	const firstConversation = getFirstConversation(chat);
	const chatIsRtl = isRtlSupportCase(chat);
	const chatLabels = chatIsRtl ? CHAT_DETAIL_LABELS.rtl : CHAT_DETAIL_LABELS.ltr;
	const customerName = cleanDisplayText(
		chat.displayName1 || firstConversation?.messageBy?.customerName,
		"Client"
	);
	const hotelName = getHotelName(chat);
	const guestMessage = firstGuestMessage(chat);
	const clientProfile = chat.clientProfile || {};
	const clientDisplayName = cleanDisplayText(
		clientProfile.name ||
			chat.clientName ||
			guestMessage?.messageBy?.customerName ||
			customerName,
		customerName
	);
	const clientContact = cleanDisplayText(
		clientProfile.contact ||
			chat.clientContact ||
			guestMessage?.messageBy?.customerEmail,
		chatLabels.noClientContact
	);
	const sameClientChats = Number(
		clientProfile.totalChatsWithSameContact || 1
	);
	const supportSource = supportSourceLabel(chat, chatIsRtl);
	const inquiryAbout = cleanDisplayText(
		chat.caseTopic ||
			chat.caseSubject ||
			firstConversation.inquiryAbout ||
			chat.inquiryAbout,
		chatLabels.inquiryAbout
	);
	const inquiryDetails = cleanDisplayText(
		firstConversation.inquiryDetails || chat.inquiryDetails,
		""
	);
	const isClientCase = chat.openedBy === "client";
	const showAiControls = !isHistory && isClientCase && caseStatus === "open";
	const showEscalationControls =
		showAiControls && escalationStatus === "active";
	const manualReplyLocked = showAiControls && aiEnabled;
	const aiMonitor = buildAiMonitor(messages, chat, monitorNow);

	useEffect(() => {
		if (!isClientCase) return undefined;
		const timer = setInterval(() => setMonitorNow(Date.now()), 2000);
		return () => clearInterval(timer);
	}, [isClientCase, chat._id]);

	// Scroll to the bottom function
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		let foundDisplayName =
			user.name || user.email || chat.supporterName || chat.displayName1 || "Account";

		// Find the most recent name used by the admin in the chat
		if (canEditChatDisplayName) {
			for (let i = chat.conversation.length - 1; i >= 0; i--) {
				if (chat.conversation[i].messageBy.userId === user._id) {
					foundDisplayName = chat.conversation[i].messageBy.customerName;
					break;
				}
			}
		}

		setDisplayName(foundDisplayName);
		setMessages(chat.conversation);
		setCaseStatus(chat.caseStatus);
		setAiEnabled(Boolean(chat.aiToRespond));
		setEscalationStatus(chat.escalationStatus || "none");

		// Join the socket room for this chat
		socket.emit("joinRoom", { caseId: chat._id });

		const handleReceiveMessage = (message) => {
			if (message.caseId === chat._id) {
				setMessages((prevMessages) => {
					if (
						prevMessages.some((existing) =>
							sameConversationMessage(existing, message)
						)
					) {
						return prevMessages;
					}
					return [...prevMessages, message];
				});
			}
		};

		const handleMessageDeleted = ({ caseId, messageId }) => {
			if (caseId === chat._id) {
				setMessages((prevMessages) =>
					prevMessages.filter((msg) => msg._id !== messageId)
				);
			}
		};

		const handleSupportCaseUpdated = (updatedCase) => {
			if (updatedCase?._id === chat._id) {
				setMessages(updatedCase.conversation || []);
				setCaseStatus(updatedCase.caseStatus);
				setAiEnabled(Boolean(updatedCase.aiToRespond));
				setEscalationStatus(updatedCase.escalationStatus || "none");
			}
		};

		const handleAiPaused = ({ caseId }) => {
			if (caseId === chat._id) {
				setAiEnabled(false);
			}
		};

		socket.on("receiveMessage", handleReceiveMessage);
		socket.on("messageDeleted", handleMessageDeleted);
		socket.on("supportCaseUpdated", handleSupportCaseUpdated);
		socket.on("aiPaused", handleAiPaused);

		// Cleanup listeners and leave room on unmount
		return () => {
			socket.off("receiveMessage", handleReceiveMessage);
			socket.off("messageDeleted", handleMessageDeleted);
			socket.off("supportCaseUpdated", handleSupportCaseUpdated);
			socket.off("aiPaused", handleAiPaused);
			socket.emit("leaveRoom", { caseId: chat._id });
		};
	}, [canEditChatDisplayName, chat, chat._id, user._id, user.email, user.name]);

	// Automatically scroll when messages change
	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const handleDeleteMessage = async (messageId) => {
		try {
			const userConfirmed = window.confirm(
				"Are you sure you want to delete this message?"
			);
			if (!userConfirmed) return;

			const response = await deleteSpecificMessage(chat._id, messageId);
			if (response && response.message === "Message deleted successfully") {
				setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
				socket.emit("deleteMessage", { caseId: chat._id, messageId });
			} else {
				console.error(
					"Error deleting message:",
					response.error || "Unknown error"
				);
			}
		} catch (err) {
			console.error("Error deleting message:", err);
		}
	};

	const handleInputChange = (e) => {
		const inputValue = e.target.value;
		setNewMessage(inputValue);
		socket.emit("typing", {
			name: canEditChatDisplayName ? displayName : user.name || user.email,
			caseId: chat._id,
		});
	};

	const handleKeyPress = (e) => {
		if (
			e.key === "Enter" &&
			!e.shiftKey &&
			!e.nativeEvent?.isComposing &&
			!isMobile
		) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const handleInputBlur = () => {
		socket.emit("stopTyping", {
			name: canEditChatDisplayName ? displayName : user.name || user.email,
			caseId: chat._id,
		});
	};

	const syncUpdatedCase = (updatedCase) => {
		if (!updatedCase || updatedCase.error) return;
		setCaseStatus(updatedCase.caseStatus || caseStatus);
		setAiEnabled(Boolean(updatedCase.aiToRespond));
		setEscalationStatus(updatedCase.escalationStatus || "none");
		if (Array.isArray(updatedCase.conversation)) {
			setMessages(updatedCase.conversation);
		}
		if (typeof setSelectedCase === "function") {
			setSelectedCase(updatedCase);
		}
		if (typeof setSupportCases === "function") {
			setSupportCases((prev) =>
				Array.isArray(prev)
					? prev.map((item) =>
							item._id === updatedCase._id ? updatedCase : item
					  )
					: prev
			);
		}
	};

	const handleAiToggle = async (nextEnabled) => {
		if (!isClientCase || aiUpdating) return;
		setAiUpdating(true);
		try {
			const updatedCase = await updateSupportCase(
				chat._id,
				{ aiToRespond: nextEnabled },
				token
			);
			if (updatedCase?.error) {
				throw new Error(updatedCase.error);
			}
			syncUpdatedCase(updatedCase);
			antMessage.success(
				nextEnabled ? chatLabels.aiStarted : chatLabels.aiStopped
			);
			if (typeof fetchChats === "function") {
				fetchChats();
			}
		} catch (err) {
			console.error("Error toggling AI replies:", err);
			antMessage.error(err?.message || chatLabels.aiUpdateError);
		} finally {
			setAiUpdating(false);
		}
	};

	const handleEscalationAddressed = async () => {
		if (!isClientCase || escalationUpdating) return;
		setEscalationUpdating(true);
		try {
			const updatedCase = await updateSupportCase(
				chat._id,
				{ escalationStatus: "addressed" },
				token
			);
			if (updatedCase?.error) {
				throw new Error(updatedCase.error);
			}
			syncUpdatedCase(updatedCase);
			antMessage.success(chatLabels.escalationAddressed);
			if (typeof fetchChats === "function") {
				fetchChats();
			}
			const params = new URLSearchParams(location.search);
			if (params.get("tab") === "escalated-client-cases") {
				params.set("tab", "active-client-cases");
				params.set("caseId", updatedCase?._id || chat._id);
				params.delete("id");
				const nextSearch = params.toString();
				history.replace({
					pathname: location.pathname,
					search: nextSearch ? `?${nextSearch}` : "",
				});
			}
		} catch (err) {
			console.error("Error updating escalation status:", err);
			antMessage.error(err?.message || chatLabels.escalationUpdateError);
		} finally {
			setEscalationUpdating(false);
		}
	};

	const handleSendMessage = async () => {
		const finalDisplayName = canEditChatDisplayName
			? displayName.trim()
			: user.name || user.email || "Account";
		if (manualReplyLocked) {
			antMessage.warning(chatLabels.manualLockNotice);
			return;
		}
		if (!finalDisplayName) {
			alert("Please enter a display name before sending a message.");
			return;
		}
		if (!newMessage.trim()) {
			return;
		}

		const messageData = {
			messageBy: {
				customerName: finalDisplayName,
				customerEmail: user.email,
				userId: user._id,
			},
			message: newMessage,
			date: new Date(),
			caseId: chat._id,
			seenByAdmin: true,
			preferredLanguage:
				chat.preferredLanguage || firstConversation.preferredLanguage || "",
			preferredLanguageCode:
				chat.preferredLanguageCode ||
				firstConversation.preferredLanguageCode ||
				"",
		};

		try {
			await updateSupportCase(chat._id, { conversation: messageData });
			socket.emit("sendMessage", messageData);
			setNewMessage("");
			socket.emit("stopTyping", { name: finalDisplayName, caseId: chat._id });
			fetchChats();
		} catch (err) {
			console.error("Error sending message", err);
		}
	};

	const handleChangeStatus = async (value) => {
		try {
			const updatedCase = await updateSupportCase(
				chat._id,
				{ caseStatus: value },
				token
			);
			if (updatedCase?.error) {
				throw new Error(updatedCase.error);
			}
			syncUpdatedCase(updatedCase);
			if (typeof fetchChats === "function") {
				fetchChats();
			}
		} catch (err) {
			console.error("Error updating case status", err);
		}
	};

	const onEmojiClick = (emojiObject) => {
		setNewMessage((prevMessage) => prevMessage + emojiObject.emoji);
		setShowEmojiPicker(false);
	};

	const handleFileChange = ({ fileList }) => {
		setFileList(fileList);
	};

	const handleDisplayNameChange = (e) => {
		setDisplayName(e.target.value);
	};

	const showDrawer = () => {
		setDrawerVisible(true);
	};

	const closeDrawer = () => {
		setDrawerVisible(false);
	};

	const renderMessageWithLinks = (text) => {
		const safeText = typeof text === "string" ? text : "";
		if (!safeText) return null;
		const linkRegex = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+)/g;
		return safeText.split(linkRegex).map((part, index) => {
			const markdown = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
			if (markdown) {
				return (
					<a
						key={index}
						href={markdown[2]}
						target='_blank'
						rel='noopener noreferrer'
					>
						{markdown[1]}
					</a>
				);
			}
			return /^https?:\/\//.test(part) ? (
				<a key={index} href={part} target='_blank' rel='noopener noreferrer'>
					{part}
				</a>
			) : (
				part
			);
		});
	};

	const quickRepliesForMessage = (msg = {}) =>
		Array.isArray(msg.quickReplies)
			? msg.quickReplies
					.map((reply) => String(reply?.label || "").trim())
					.filter(Boolean)
					.slice(0, 4)
			: [];

	useEffect(() => {
		const handleTyping = (data) => {
			if (
				data.caseId === chat._id &&
				data.name !== (canEditChatDisplayName ? displayName : user.name || user.email)
			) {
				setTypingStatus(`${data.name || "Jannat Booking"} ${chatLabels.typing}`);
			}
		};

		const handleStopTyping = (data) => {
			if (
				data.caseId === chat._id &&
				data.name !== (canEditChatDisplayName ? displayName : user.name || user.email)
			) {
				setTypingStatus("");
			}
		};

		socket.on("typing", handleTyping);
		socket.on("stopTyping", handleStopTyping);

		return () => {
			socket.off("typing", handleTyping);
			socket.off("stopTyping", handleStopTyping);
		};
	}, [
		canEditChatDisplayName,
		chat._id,
		chatLabels.typing,
		displayName,
		user.email,
		user.name,
	]);

	// On mobile + we have a case param => show back arrow
	const handleBackArrow = () => {
		const params = new URLSearchParams(location.search);
		params.delete("id");
		params.delete("caseId");
		const nextSearch = params.toString();
		history.replace({
			pathname: location.pathname,
			search: nextSearch ? `?${nextSearch}` : "",
		});
	};

	return (
		<ChatDetailWrapper $isRtl={chatIsRtl} dir={chatIsRtl ? "rtl" : "ltr"}>
			{/* Mobile back arrow if needed */}
			{isMobile && caseIdParam && (
				<MobileBackArrow onClick={handleBackArrow}>
					{chatIsRtl ? `${chatLabels.back} ->` : `<- ${chatLabels.back}`}
				</MobileBackArrow>
			)}

			<h3 className='chat-title'>
				{chat && chat.openedBy === "client" ? (
					<span className='chat-client-title' dir={chatIsRtl ? "rtl" : "ltr"}>
						{isJannatBookingCase(chat) ? (
							<>
								{chatIsRtl
									? `العميل (${clientDisplayName}) يحتاج إلى دعم من Jannat Booking`
									: `Client (${clientDisplayName}) Needs Support From Jannat Booking`}
							</>
						) : (
							<>
								{chatIsRtl
									? `العميل (${clientDisplayName}) يحتاج إلى دعم بخصوص ${inquiryAbout} في فندق `
									: `Client (${clientDisplayName}) Needs Support Regarding ${inquiryAbout} In Hotel `}
								<span style={{ fontWeight: "bold" }}>
									{hotelName}
								</span>
							</>
						)}
					</span>
				) : (
					<>
						{chatIsRtl ? "محادثة مع " : "Chat with "}
						<span style={{ fontWeight: "bold" }}>{hotelName}</span>
					</>
				)}
			</h3>

			{isClientCase && (
				<ClientDetailsCard $isRtl={chatIsRtl}>
					<DetailItem>
						<span>{chatLabels.clientName}</span>
						<strong dir='auto'>{clientDisplayName}</strong>
					</DetailItem>
					<DetailItem>
						<span>{chatLabels.clientContact}</span>
						<strong dir='auto'>{clientContact}</strong>
					</DetailItem>
					<DetailItem>
						<span>{chatLabels.sameClientChats}</span>
						<strong>{sameClientChats}</strong>
					</DetailItem>
					<DetailItem>
						<span>{chatLabels.currentHotel}</span>
						<strong dir='auto'>{hotelName}</strong>
					</DetailItem>
					{supportSource && (
						<DetailItem>
							<span>{chatLabels.source}</span>
							<strong dir='auto'>{supportSource}</strong>
						</DetailItem>
					)}
				</ClientDetailsCard>
			)}

			<CaseMeta $isRtl={chatIsRtl}>
				<strong>{chatLabels.inquiryAbout}:</strong>
				<span dir='auto'>{inquiryAbout}</span>
			</CaseMeta>
			<CaseMeta $isRtl={chatIsRtl}>
				<strong>{chatLabels.details}:</strong>
				<span dir='auto'>{inquiryDetails}</span>
			</CaseMeta>

			{!isHistory && (
				<StatusSelect value={caseStatus} onChange={handleChangeStatus}>
					<Option value='open'>{chatLabels.open}</Option>
					<Option value='closed'>{chatLabels.closed}</Option>
				</StatusSelect>
			)}

			{showAiControls && (
				<AiControlRow $isRtl={chatIsRtl}>
					<div>
						<strong>{chatLabels.aiReplies}</strong>
						<AiHint>
							{aiEnabled ? chatLabels.aiActiveHint : chatLabels.aiOffHint}
						</AiHint>
					</div>
					<AiActions $isRtl={chatIsRtl}>
						<Switch
							checked={aiEnabled}
							onChange={handleAiToggle}
							loading={aiUpdating}
						/>
						<AntdButton
							type={aiEnabled ? "primary" : "default"}
							danger={aiEnabled}
							loading={aiUpdating}
							onClick={() => handleAiToggle(!aiEnabled)}
						>
							{aiEnabled ? chatLabels.stopAi : chatLabels.startAi}
						</AntdButton>
					</AiActions>
				</AiControlRow>
			)}

			{isClientCase && (
				<AiMonitorPanel $isRtl={chatIsRtl} $status={aiMonitor.status}>
					<AiMonitorHeader $isRtl={chatIsRtl}>
						<strong>{chatLabels.aiMonitor}</strong>
						<MonitorStatus $status={aiEnabled ? aiMonitor.status : "paused"}>
							{!aiEnabled
								? chatLabels.aiPaused
								: aiMonitor.status === "slow"
								? chatLabels.aiSlow
								: aiMonitor.status === "watch"
								? chatLabels.aiWatch
								: chatLabels.aiHealthy}
						</MonitorStatus>
					</AiMonitorHeader>
					<MonitorGrid>
						<MonitorMetric>
							<span>{chatLabels.aiResponder}</span>
							<strong dir='auto'>{aiMonitor.responder}</strong>
						</MonitorMetric>
						<MonitorMetric>
							<span>{chatLabels.avgReply}</span>
							<strong>
								{aiMonitor.hasReplies
									? formatMonitorDuration(aiMonitor.avgMs)
									: chatLabels.noAiRepliesYet}
							</strong>
						</MonitorMetric>
						<MonitorMetric>
							<span>{chatLabels.maxReply}</span>
							<strong>{formatMonitorDuration(aiMonitor.maxMs)}</strong>
						</MonitorMetric>
						<MonitorMetric>
							<span>{chatLabels.lastReply}</span>
							<strong>{formatMonitorDuration(aiMonitor.lastMs)}</strong>
						</MonitorMetric>
						<MonitorMetric>
							<span>{chatLabels.waiting}</span>
							<strong>{formatMonitorDuration(aiMonitor.currentWaitMs)}</strong>
						</MonitorMetric>
						<MonitorMetric>
							<span>{chatLabels.guestTurns}</span>
							<strong>
								{aiMonitor.answeredTurns}/{aiMonitor.guestTurns}
							</strong>
						</MonitorMetric>
						<MonitorMetric>
							<span>{chatLabels.unanswered}</span>
							<strong>{aiMonitor.unansweredTurns}</strong>
						</MonitorMetric>
						<MonitorMetric>
							<span>{chatLabels.duplicateAi}</span>
							<strong>{aiMonitor.duplicateAiTurns}</strong>
						</MonitorMetric>
					</MonitorGrid>
				</AiMonitorPanel>
			)}

			{showEscalationControls && (
				<EscalationRow $isRtl={chatIsRtl}>
					<div>
						<strong>{chatLabels.escalationActive}</strong>
						<AiHint>{chatLabels.escalationHint}</AiHint>
					</div>
					<AntdButton
						type='primary'
						loading={escalationUpdating}
						onClick={handleEscalationAddressed}
					>
						{chatLabels.markEscalationAddressed}
					</AntdButton>
				</EscalationRow>
			)}

			<div className='mx-auto text-center my-3'>
				<AntdButton type='primary' onClick={showDrawer}>
					{chatLabels.reserveRoom}
				</AntdButton>
			</div>
			<HelperSideDrawer
				chat={chat}
				onClose={closeDrawer}
				visible={drawerVisible}
				selectedCase={selectedCase}
				setSelectedCase={setSelectedCase}
				setSupportCases={setSupportCases}
				agentName={displayName}
			/>

			{caseStatus === "open" && canEditChatDisplayName && (
				<Form layout='vertical'>
					<Form.Item label={chatLabels.customDisplayName}>
						<Input
							value={displayName}
							onChange={handleDisplayNameChange}
							placeholder={chatLabels.displayNamePlaceholder}
							dir={chatIsRtl ? "rtl" : "ltr"}
						/>
					</Form.Item>
				</Form>
			)}

			<ChatMessages>
				{messages.map((msg, index) => {
					const messageRtl = isRtlMessage(msg, chatIsRtl);
					const isAdminMessage = msg.messageBy.userId === user._id;
					const senderName = cleanDisplayText(
						msg.messageBy.customerName,
						isAdminMessage ? user.name || "Management" : "Client"
					);
					const quickReplies = quickRepliesForMessage(msg);
					const messageText = cleanDisplayText(
						msg.message,
						chatIsRtl
							? "تعذر عرض هذا النص بسبب مشكلة في الترميز."
							: "This text could not be displayed because of an encoding issue."
					);
					const aiReplyDelay = aiReplyDelayForIndex(messages, index);
					const aiReplyDelayTone =
						aiReplyDelay > 20000
							? "slow"
							: aiReplyDelay > 12000
							? "watch"
							: "healthy";
					return (
						<Message
							key={index}
							isAdminMessage={isAdminMessage}
							$isRtl={messageRtl}
							dir={messageRtl ? "rtl" : "ltr"}
						>
							<MessageText $isRtl={messageRtl}>
								<MessageSender dir='auto'>
									{senderName}
								</MessageSender>
								<MessageBody dir={messageRtl ? "rtl" : "auto"}>
									{renderMessageWithLinks(messageText)}
								</MessageBody>
								{quickReplies.length > 0 && (
									<QuickReplyPreview $isRtl={messageRtl}>
										{quickReplies.map((label) => (
											<QuickReplyChip key={label} type='button' disabled>
												{label}
											</QuickReplyChip>
										))}
									</QuickReplyPreview>
								)}
							</MessageText>
							<MessageMeta $isRtl={messageRtl}>
								<small>{new Date(msg.date).toLocaleString()}</small>
								{aiReplyDelay !== null && (
									<ReplyDelayBadge $tone={aiReplyDelayTone}>
										{formatMonitorDuration(aiReplyDelay)}
									</ReplyDelayBadge>
								)}
								{isAdminMessage && (
									<DeleteOutlined
										style={{
											color: "red",
											cursor: "pointer",
										}}
										onClick={() => handleDeleteMessage(msg._id)}
									/>
								)}
							</MessageMeta>
						</Message>
					);
				})}
				{typingStatus && (
					<TypingStatus $isRtl={chatIsRtl} dir={chatIsRtl ? "rtl" : "ltr"}>
						{typingStatus}
					</TypingStatus>
				)}
				<div ref={messagesEndRef} />
			</ChatMessages>

			{caseStatus === "open" && (
				<ChatInputContainer>
					{manualReplyLocked && (
						<LockNotice $isRtl={chatIsRtl}>
							{chatLabels.manualLockNotice}
						</LockNotice>
					)}
					<Input.TextArea
						placeholder={chatLabels.typeMessage}
						value={newMessage}
						onChange={handleInputChange}
						onKeyDown={handleKeyPress}
						onBlur={handleInputBlur}
						autoSize={{ minRows: 1, maxRows: 6 }}
						enterKeyHint={isMobile ? "enter" : "send"}
						disabled={manualReplyLocked}
						style={{
							textAlign: chatIsRtl ? "right" : "left",
							direction: chatIsRtl ? "rtl" : "ltr",
						}}
					/>
					<SmileOutlined
						style={{
							opacity: manualReplyLocked ? 0.45 : 1,
							pointerEvents: manualReplyLocked ? "none" : "auto",
						}}
						onClick={() => setShowEmojiPicker(!showEmojiPicker)}
					/>
					{showEmojiPicker && !manualReplyLocked && (
						<EmojiPickerWrapper>
							<EmojiPicker onEmojiClick={onEmojiClick} />
						</EmojiPickerWrapper>
					)}
					<Upload
						fileList={fileList}
						onChange={handleFileChange}
						beforeUpload={() => false}
						disabled={manualReplyLocked}
					>
						<AntdButton icon={<UploadOutlined />} disabled={manualReplyLocked} />
					</Upload>
					<SendButton
						type='primary'
						onClick={handleSendMessage}
						disabled={manualReplyLocked}
					>
						{chatLabels.send}
					</SendButton>
				</ChatInputContainer>
			)}
		</ChatDetailWrapper>
	);
};

export default ChatDetail;

/* ------------------ STYLES ------------------ */

const ChatDetailWrapper = styled.div`
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	padding: 20px;
	background-color: var(--background-light);
	border-radius: 8px;
	box-shadow: var(--box-shadow-dark);
	text-align: ${(props) => (props.$isRtl ? "right" : "left")};

	.chat-title {
		text-transform: ${(props) => (props.$isRtl ? "none" : "capitalize")};
	}
	.chat-client-title {
		font-size: 20px;
	}

	/* --- MOBILE ADJUSTMENTS --- */
	@media (max-width: 768px) {
		padding: 10px; /* reduce padding on mobile */

		.chat-title {
			font-size: 1rem; /* smaller title font */
		}
		.chat-client-title {
			font-size: 0.95rem;
		}
		p {
			font-size: 0.9rem;
			margin-bottom: 6px;
		}
	}
`;

const CaseMeta = styled.p`
	display: flex;
	align-items: baseline;
	gap: 4px;
	margin-bottom: 8px;
	text-align: ${(props) => (props.$isRtl ? "right" : "left")};

	strong {
		flex: 0 0 auto;
	}

	span {
		min-width: 0;
		overflow-wrap: anywhere;
	}
`;

const ClientDetailsCard = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 8px;
	margin: 4px 0 12px;
	padding: 10px;
	border: 1px solid #cfe1ef;
	border-radius: 8px;
	background: #f7fbff;
	text-align: ${(props) => (props.$isRtl ? "right" : "left")};

	@media (max-width: 1100px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
		padding: 8px;
	}
`;

const DetailItem = styled.div`
	min-width: 0;
	padding: 7px 8px;
	border: 1px solid #e4eef7;
	border-radius: 6px;
	background: #ffffff;

	span {
		display: block;
		color: #627487;
		font-size: 0.72rem;
		font-weight: 800;
		line-height: 1.2;
		margin-bottom: 3px;
	}

	strong {
		display: block;
		color: #123b5d;
		font-size: 0.88rem;
		line-height: 1.3;
		overflow-wrap: anywhere;
	}
`;

const AiControlRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	padding: 12px 14px;
	margin: 8px 0 14px;
	border: 1px solid #b9d7ef;
	border-radius: 8px;
	background: #f5fbff;
	text-align: ${(props) => (props.$isRtl ? "right" : "left")};

	@media (max-width: 768px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const AiHint = styled.div`
	color: #46657c;
	font-size: 0.88rem;
	margin-top: 3px;
`;

const AiActions = styled.div`
	display: flex;
	align-items: center;
	flex-direction: ${(props) => (props.$isRtl ? "row-reverse" : "row")};
	gap: 10px;
	flex: 0 0 auto;

	@media (max-width: 768px) {
		justify-content: flex-start;
	}
`;

const AiMonitorPanel = styled.div`
	padding: 10px 12px;
	margin: -6px 0 14px;
	border: 1px solid
		${(props) =>
			props.$status === "slow"
				? "#f2a6a6"
				: props.$status === "watch"
				? "#e8cb75"
				: "#b9d7ef"};
	border-radius: 8px;
	background: ${(props) =>
		props.$status === "slow"
			? "#fff6f6"
			: props.$status === "watch"
			? "#fffbea"
			: "#f7fbff"};
	text-align: ${(props) => (props.$isRtl ? "right" : "left")};
`;

const AiMonitorHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-direction: ${(props) => (props.$isRtl ? "row-reverse" : "row")};
	gap: 8px;
	margin-bottom: 8px;
`;

const MonitorStatus = styled.span`
	display: inline-flex;
	align-items: center;
	min-height: 24px;
	padding: 3px 9px;
	border-radius: 999px;
	background: ${(props) =>
		props.$status === "paused"
			? "#eef1f4"
			: props.$status === "slow"
			? "#fbe1e1"
			: props.$status === "watch"
			? "#fff0bd"
			: "#dff5e8"};
	color: ${(props) =>
		props.$status === "paused"
			? "#53606b"
			: props.$status === "slow"
			? "#9b1c1c"
			: props.$status === "watch"
			? "#765100"
			: "#11613b"};
	font-size: 0.78rem;
	font-weight: 900;
	line-height: 1.2;
`;

const MonitorGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 7px;

	@media (max-width: 1000px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 560px) {
		grid-template-columns: 1fr;
	}
`;

const MonitorMetric = styled.div`
	min-width: 0;
	padding: 7px 8px;
	border: 1px solid #e3edf6;
	border-radius: 6px;
	background: #ffffff;

	span {
		display: block;
		color: #607284;
		font-size: 0.7rem;
		font-weight: 850;
		line-height: 1.2;
		margin-bottom: 2px;
	}

	strong {
		display: block;
		color: #153d5d;
		font-size: 0.84rem;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}
`;

const EscalationRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	padding: 12px 14px;
	margin: 0 0 14px;
	border: 1px solid #f0b35a;
	border-radius: 8px;
	background: #fff8e8;
	color: #5f3b00;
	text-align: ${(props) => (props.$isRtl ? "right" : "left")};

	@media (max-width: 768px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const MobileBackArrow = styled.div`
	color: blue;
	cursor: pointer;
	margin-bottom: 8px;
	font-size: 1.1rem;
	font-weight: bold;
	width: fit-content;

	&:hover {
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		font-size: 1rem;
		margin-bottom: 12px;
	}
`;

const ChatMessages = styled.div`
	flex: 1;
	max-height: 700px;
	overflow-y: auto;
	margin-bottom: 20px;
	padding-right: 10px;

	@media (max-width: 768px) {
		max-height: 60vh; /* or something smaller for mobile */
		margin-bottom: 12px;
		padding-right: 5px;
	}
`;

const Message = styled.div`
	padding: 10px;
	border: 1px solid var(--border-color-dark);
	border-radius: 8px;
	margin-bottom: 10px;
	background-color: ${(props) =>
		props.isAdminMessage
			? "var(--admin-message-bg)"
			: "var(--user-message-bg)"};
	color: ${(props) =>
		props.isAdminMessage
			? "var(--admin-message-color)"
			: "var(--user-message-color)"};
	white-space: pre-wrap;
	word-wrap: break-word;
	text-align: ${(props) => (props.$isRtl ? "right" : "left")};
	direction: ${(props) => (props.$isRtl ? "rtl" : "ltr")};

	@media (max-width: 768px) {
		padding: 8px;
		margin-bottom: 6px;
		font-size: 0.9rem;
	}
`;

const MessageText = styled.div`
	overflow-wrap: anywhere;
	unicode-bidi: plaintext;
	text-align: ${(props) => (props.$isRtl ? "right" : "left")};
`;

const MessageSender = styled.strong`
	display: block;
	margin-bottom: 4px;
	font-weight: 950;
	line-height: 1.35;
`;

const MessageBody = styled.div`
	display: block;
	line-height: 1.55;
	overflow-wrap: anywhere;
`;

const QuickReplyPreview = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	justify-content: ${(props) => (props.$isRtl ? "flex-end" : "flex-start")};
	margin-top: 8px;
`;

const QuickReplyChip = styled.button`
	max-width: 100%;
	padding: 4px 9px;
	border: 1px solid #b9d7ef;
	border-radius: 8px;
	background: #f5fbff;
	color: #123b5d;
	font-size: 0.8rem;
	font-weight: 800;
	line-height: 1.25;
	cursor: default;
	opacity: 1;
`;

const MessageMeta = styled.div`
	display: flex;
	align-items: center;
	flex-direction: row;
	justify-content: flex-start;
	gap: 10px;
	margin-top: 4px;
	direction: ${(props) => (props.$isRtl ? "rtl" : "ltr")};
`;

const ReplyDelayBadge = styled.span`
	display: inline-flex;
	align-items: center;
	min-height: 20px;
	padding: 2px 7px;
	border-radius: 999px;
	background: ${(props) =>
		props.$tone === "slow"
			? "#fbe1e1"
			: props.$tone === "watch"
			? "#fff0bd"
			: "#dff5e8"};
	color: ${(props) =>
		props.$tone === "slow"
			? "#9b1c1c"
			: props.$tone === "watch"
			? "#765100"
			: "#11613b"};
	font-size: 0.72rem;
	font-weight: 900;
	line-height: 1.2;
`;

const StatusSelect = styled(Select)`
	width: 150px;
	margin-bottom: 20px;

	@media (max-width: 768px) {
		width: 120px;
		margin-bottom: 12px;
		font-size: 0.9rem;
	}
`;

const ChatInputContainer = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 5px;

	@media (max-width: 768px) {
		gap: 3px;
	}

	.ant-input-textarea {
		flex-grow: 1;
	}

	textarea {
		font-size: 0.95rem; /* smaller text for mobile */
	}
`;

const LockNotice = styled.div`
	width: 100%;
	padding: 9px 12px;
	border: 1px solid #f3c36b;
	border-radius: 8px;
	background: #fff8e6;
	color: #7a4b00;
	font-weight: 600;
	text-align: ${(props) => (props.$isRtl ? "right" : "left")};
`;

const EmojiPickerWrapper = styled.div`
	position: absolute;
	bottom: 60px;
	right: 20px;
	z-index: 1002;

	@media (max-width: 768px) {
		bottom: 80px;
		right: 10px;
		transform: scale(0.95); /* slightly smaller emoji picker on mobile */
	}
`;

const SendButton = styled(AntdButton)`
	background-color: var(--button-bg-primary);
	color: var(--button-font-color);
	border: none;
	transition: var(--main-transition);

	&:hover {
		background-color: var(--button-bg-primary-light);
		color: var(--button-font-color);
	}

	@media (max-width: 768px) {
		font-size: 0.9rem;
		padding: 0 8px;
	}
`;

const TypingStatus = styled.div`
	font-style: italic;
	color: gray;
	margin-top: 10px;
	text-align: ${(props) => (props.$isRtl ? "right" : "left")};
	direction: ${(props) => (props.$isRtl ? "rtl" : "ltr")};

	@media (max-width: 768px) {
		font-size: 0.85rem;
		margin-top: 6px;
	}
`;
