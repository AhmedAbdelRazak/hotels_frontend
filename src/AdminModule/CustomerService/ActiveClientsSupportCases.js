import React, { useState, useEffect, useCallback, useContext } from "react";
import styled from "styled-components";
import { useLocation, useHistory } from "react-router-dom";
import { List, Badge, Button, Modal, Tabs, Input, Tag, Empty, Spin } from "antd";
import {
	createAiTrainingChat,
	getEscalatedClientSupportCases,
	getAiTrainingChats,
	getFilteredSupportCasesClients,
	getSupportCaseById,
	markAllMessagesAsSeenByAdmin,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import { toast } from "react-toastify";
import ChatDetail from "./ChatDetail";
import socket from "../../socket";
import {
	isActiveEscalatedSupportCase,
	supportCaseAdminUnreadMessages,
} from "../utils/supportCaseChat";

// 1) Import NotificationContext
import { NotificationContext } from "./NotificationContext";

const { TextArea } = Input;

const caseHotelName = (item = {}) =>
	item.hotelId && item.hotelId._id !== "674cf8997e3780f1f838d458"
		? item.hotelId.hotelName
		: "Jannat Booking";

const caseSourceLabel = (item = {}, isArabic = false) => {
	const source = String(item.sourcePage || item.sourceWebsite || "").toLowerCase();
	if (!source) return "";
	if (source.includes("contact_page")) {
		return isArabic ? "نموذج التواصل" : "Contact page";
	}
	if (source.includes("support_widget")) {
		return isArabic ? "المحادثة" : "Chat widget";
	}
	if (source.includes("checkout")) {
		return isArabic ? "إتمام الحجز" : "Checkout";
	}
	return isArabic ? "موقع جنات" : "Jannat site";
};

const caseTopicText = (item = {}) =>
	item.caseTopic ||
	item.caseSubject ||
	item.conversationPreview?.inquiryAbout ||
	item.conversation?.[0]?.inquiryAbout ||
	"Support request";

const caseContactText = (item = {}) =>
	item.clientProfile?.contact ||
	item.clientContact ||
	item.conversationPreview?.messageBy?.customerEmail ||
	"";

const isMissingSupportCaseResponse = (data = {}) =>
	Number(data?.status) === 404 ||
	/support case not found/i.test(String(data?.error || ""));

const AI_LEARNING_TEXT = {
	en: {
		button: "Teach Your AI Chat",
		modalTitle: "Teach Your AI Chat",
		uploadTab: "Upload New Chat",
		historyTab: "Learning Chat History",
		pasteLabel: "Paste Chat Conversation",
		pastePlaceholder:
			"Paste the full guest/support conversation here.",
		submit: "Clean & Save Chat",
		saved: "Training chat saved.",
		loadError: "Could not load training chats.",
		saveError: "Could not save training chat.",
		emptyText: "No learning chats saved yet.",
		turns: "turns",
		keywords: "Keywords",
		noSummary: "No summary available.",
	},
	ar: {
		button: "\u062a\u0639\u0644\u064a\u0645 \u0645\u062d\u0627\u062f\u062b\u0629 \u0627\u0644\u0630\u0643\u0627\u0621",
		modalTitle:
			"\u062a\u0639\u0644\u064a\u0645 \u0645\u062d\u0627\u062f\u062b\u0629 \u0627\u0644\u0630\u0643\u0627\u0621",
		uploadTab:
			"\u0631\u0641\u0639 \u0645\u062d\u0627\u062f\u062b\u0629 \u062c\u062f\u064a\u062f\u0629",
		historyTab:
			"\u0633\u062c\u0644 \u062a\u0639\u0644\u064a\u0645 \u0627\u0644\u0630\u0643\u0627\u0621",
		pasteLabel:
			"\u0646\u0635 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629",
		pastePlaceholder:
			"\u0627\u0644\u0635\u0642 \u0645\u062d\u0627\u062f\u062b\u0629 \u0627\u0644\u0639\u0645\u064a\u0644 \u0648\u0627\u0644\u062f\u0639\u0645 \u0643\u0627\u0645\u0644\u0629 \u0647\u0646\u0627.",
		submit:
			"\u062a\u0646\u0638\u064a\u0641 \u0648\u062d\u0641\u0638",
		saved:
			"\u062a\u0645 \u062d\u0641\u0638 \u0645\u062d\u0627\u062f\u062b\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0645.",
		loadError:
			"\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u062a\u0639\u0644\u064a\u0645.",
		saveError:
			"\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0645\u062d\u0627\u062f\u062b\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0645.",
		emptyText:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u062d\u0627\u062f\u062b\u0627\u062a \u062a\u0639\u0644\u064a\u0645 \u0628\u0639\u062f.",
		turns: "\u0631\u0633\u0627\u0626\u0644",
		keywords: "\u0643\u0644\u0645\u0627\u062a",
		noSummary:
			"\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0644\u062e\u0635.",
	},
};

const ActiveClientsSupportCases = ({
	getUser,
	isSuperAdmin,
	mode = "active",
	chosenLanguage,
}) => {
	const [supportCases, setSupportCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);
	const [selectedCaseLoading, setSelectedCaseLoading] = useState(false);
	const [unseenCount, setUnseenCount] = useState(0);
	const [learningModalOpen, setLearningModalOpen] = useState(false);
	const [learningTab, setLearningTab] = useState("upload");
	const [trainingChatText, setTrainingChatText] = useState("");
	const [trainingChats, setTrainingChats] = useState([]);
	const [learningLoading, setLearningLoading] = useState(false);
	const [learningSubmitting, setLearningSubmitting] = useState(false);
	const { user, token } = isAuthenticated();
	const isEscalatedMode = mode === "escalated";
	const isArabic = chosenLanguage === "Arabic";
	const learningText = AI_LEARNING_TEXT[isArabic ? "ar" : "en"];
	const activeTabKey = isEscalatedMode
		? "escalated-client-cases"
		: "active-client-cases";
	const listTitle = isEscalatedMode
		? "Escalated Client Support Cases"
		: "Open Client Support Cases";
	const escalatedLabel = isArabic ? "\u062a\u0635\u0639\u064a\u062f" : "Escalated";

	// For smaller-screen routing
	const location = useLocation();
	const history = useHistory();
	const queryParams = new URLSearchParams(location.search);
	const caseIdParam = queryParams.get("caseId") || queryParams.get("id");

	// Detect if user is on a mobile screen
	const isMobile = window.innerWidth <= 768;

	// 2) Destructure from context:
	//    - soundEnabled (if you want to conditionally do something)
	//    - playSound (to actually play the notification audio)
	const { soundEnabled, playSound } = useContext(NotificationContext);

	const fetchTrainingChats = useCallback(async () => {
		setLearningLoading(true);
		try {
			const data = await getAiTrainingChats(token, { limit: 30 });
			if (data?.error) {
				toast.error(data.error || learningText.loadError);
				setTrainingChats([]);
			} else {
				setTrainingChats(Array.isArray(data?.chats) ? data.chats : []);
			}
		} catch (error) {
			toast.error(learningText.loadError);
			setTrainingChats([]);
		} finally {
			setLearningLoading(false);
		}
	}, [learningText.loadError, token]);

	const openLearningModal = () => {
		setLearningModalOpen(true);
		setLearningTab("upload");
		fetchTrainingChats();
	};

	const closeLearningModal = () => {
		setLearningModalOpen(false);
		setTrainingChatText("");
	};

	const handleSubmitTrainingChat = async () => {
		if (!trainingChatText.trim()) {
			toast.error(learningText.saveError);
			return;
		}
		setLearningSubmitting(true);
		try {
			const payload = {
				rawText: trainingChatText,
				source: "manual_paste",
				hotelId:
					selectedCase?.hotelId && typeof selectedCase.hotelId === "object"
						? selectedCase.hotelId._id
						: selectedCase?.hotelId || undefined,
				hotelName:
					selectedCase?.hotelId && typeof selectedCase.hotelId === "object"
						? selectedCase.hotelId.hotelName
						: "",
			};
			const data = await createAiTrainingChat(payload, token);
			if (data?.error) {
				toast.error(data.error || learningText.saveError);
				return;
			}
			toast.success(learningText.saved);
			setTrainingChatText("");
			setLearningTab("history");
			await fetchTrainingChats();
		} catch (error) {
			toast.error(learningText.saveError);
		} finally {
			setLearningSubmitting(false);
		}
	};

	const syncCaseIdToUrl = useCallback(
		(caseId, { replace = false } = {}) => {
			if (!caseId) return;
			const params = new URLSearchParams(location.search);
			params.set("tab", activeTabKey);
			params.set("caseId", caseId);
			params.delete("id");
			const nextSearch = `?${params.toString()}`;
			if (nextSearch === location.search) return;

			const nextLocation = {
				pathname: location.pathname,
				search: nextSearch,
			};
			if (replace) {
				history.replace(nextLocation);
			} else {
				history.push(nextLocation);
			}
		},
		[activeTabKey, history, location.pathname, location.search]
	);

	const clearCaseIdFromUrl = useCallback(
		({ replace = true } = {}) => {
			const params = new URLSearchParams(location.search);
			if (!params.has("caseId") && !params.has("id")) return;
			params.set("tab", activeTabKey);
			params.delete("caseId");
			params.delete("id");
			const nextLocation = {
				pathname: location.pathname,
				search: `?${params.toString()}`,
			};
			if (replace) {
				history.replace(nextLocation);
			} else {
				history.push(nextLocation);
			}
		},
		[activeTabKey, history, location.pathname, location.search]
	);

	/* ------------------- SORT SUPPORT CASES ------------------- */
	const sortSupportCases = useCallback(
		(cases) => {
			return [...cases].sort((a, b) => {
				const latestCaseDate = (supportCase) => {
					if (supportCase.latestConversationAt) {
						return supportCase.latestConversationAt;
					}
					const conversation = Array.isArray(supportCase.conversation)
						? supportCase.conversation
						: [];
					return (
						conversation
							.filter((msg) => msg.messageBy?.userId !== user._id)
							.slice(-1)[0]?.date ||
						supportCase.updatedAt ||
						supportCase.createdAt
					);
				};
				const latestA =
					latestCaseDate(a) || a.createdAt;
				const latestB =
					latestCaseDate(b) || b.createdAt;
				return new Date(latestB) - new Date(latestA); // Descending
			});
		},
		[user._id]
	);

	const caseBelongsToMode = useCallback(
		(supportCase = {}) =>
			supportCase.openedBy === "client" &&
			supportCase.caseStatus !== "closed" &&
			(isEscalatedMode
				? supportCase.escalationStatus === "active"
				: supportCase.escalationStatus !== "active"),
		[isEscalatedMode]
	);

	useEffect(() => {
		setUnseenCount(
			supportCases.reduce(
				(total, supportCase) =>
					total + supportCaseAdminUnreadMessages(supportCase, user._id),
				0
			)
		);
	}, [supportCases, user._id]);

	/* ------------------- FETCH SUPPORT CASES ------------------- */
	const fetchSupportCases = useCallback(() => {
		const loadCases = isEscalatedMode
			? getEscalatedClientSupportCases
			: getFilteredSupportCasesClients;
		loadCases(token)
			.then((data) => {
				if (data.error) {
					toast.error("Failed to fetch support cases");
				} else {
					let filteredCases = data;

					// ------------------ THIS IS THE KEY PART ------------------ //
					// Only filter if NOT super admin and user has hotelsToSupport
					if (!isSuperAdmin) {
						const userHotelsToSupport =
							(getUser && getUser.hotelsToSupport) || [];
						if (userHotelsToSupport.length > 0) {
							const allowedHotelIds = userHotelsToSupport.map(
								(hotel) => hotel._id
							);

							filteredCases = filteredCases.filter((chat) => {
								// Sometimes chat.hotelId can be an object with _id
								// or just a string with the hotel's ID
								const chatHotelId =
									typeof chat.hotelId === "object"
										? chat.hotelId._id
										: chat.hotelId;
								return allowedHotelIds.includes(chatHotelId);
							});
						}
					}
					// ---------------------------------------------------------- //

					// Filter out closed
					const openCases = filteredCases.filter(caseBelongsToMode);
					const openCaseIds = new Set(openCases.map((item) => item._id));

					setSupportCases(sortSupportCases(openCases));
					if (selectedCase?._id && !openCaseIds.has(selectedCase._id)) {
						socket.emit("leaveRoom", { caseId: selectedCase._id });
						setSelectedCase(null);
					}
					if (caseIdParam && !openCaseIds.has(caseIdParam)) {
						clearCaseIdFromUrl({ replace: true });
					}

					// Calculate guest/client messages the admin has not opened yet.
					const unseenMessages = openCases.reduce((acc, supportCase) => {
						return acc + supportCaseAdminUnreadMessages(supportCase, user._id);
					}, 0);
					setUnseenCount(unseenMessages);
				}
			})
			.catch(() => {
				toast.error("Failed to fetch support cases");
			});
	}, [
		token,
		isEscalatedMode,
		isSuperAdmin,
		getUser,
		user._id,
		sortSupportCases,
		caseBelongsToMode,
		selectedCase?._id,
		caseIdParam,
		clearCaseIdFromUrl,
	]);

	const loadSupportCaseDetails = useCallback(
		async (caseObj) => {
			if (!caseObj?._id) return null;
			setSelectedCaseLoading(true);
			try {
				const data = await getSupportCaseById(caseObj._id, token);
				if (isMissingSupportCaseResponse(data)) {
					socket.emit("leaveRoom", { caseId: caseObj._id });
					setSupportCases((prevCases) =>
						prevCases.filter((item) => item._id !== caseObj._id)
					);
					setSelectedCase((previous) =>
						previous?._id === caseObj._id ? null : previous
					);
					if (caseIdParam && String(caseIdParam) === String(caseObj._id)) {
						clearCaseIdFromUrl({ replace: true });
					}
					return null;
				}
				if (data?.error || !data?._id) {
					toast.error("Failed to load support case");
					return caseObj;
				}
				return data;
			} catch (error) {
				toast.error("Failed to load support case");
				return caseObj;
			} finally {
				setSelectedCaseLoading(false);
			}
		},
		[caseIdParam, clearCaseIdFromUrl, token]
	);

	/* ------------------- SETUP / SOCKET LISTENERS ------------------- */
	useEffect(() => {
		fetchSupportCases();

		// On receiving a new message
		const handleReceiveMessage = (message) => {
			if (message && message.caseId) {
				// 3) Play sound if user has enabled it
				if (soundEnabled) {
					playSound();
					// Optionally vibrate for mobile
					if ("vibrate" in navigator) {
						navigator.vibrate(200);
					}
				}
				setSupportCases((prevCases) => {
					const nextCases = prevCases.map((c) =>
						c._id === message.caseId
							? {
									...c,
									conversation: [
										...(Array.isArray(c.conversation) ? c.conversation : []),
										message,
									],
							  }
							: c
					);
					return nextCases;
				});
			}
		};

		// On new chat
		const handleNewChat = (newCase) => {
			// If you want a beep for brand new cases, do it here
			if (caseBelongsToMode(newCase)) {
				if (soundEnabled) {
					playSound();
					// Optionally vibrate
					if ("vibrate" in navigator) {
						navigator.vibrate(200);
					}
				}
				setSupportCases((prevCases) => {
					const nextCases = sortSupportCases([...prevCases, newCase]);
					return nextCases;
				});
			}
		};

		const handleSupportCaseUpdated = (updatedCase) => {
			if (!updatedCase?._id) return;
			const belongsHere = caseBelongsToMode(updatedCase);
			setSupportCases((prevCases) => {
				if (!belongsHere) {
					const nextCases = prevCases.filter((c) => c._id !== updatedCase._id);
					return nextCases;
				}
				const exists = prevCases.some((c) => c._id === updatedCase._id);
				const nextCases = exists
					? prevCases.map((c) => (c._id === updatedCase._id ? updatedCase : c))
					: [...prevCases, updatedCase];
				const sortedCases = sortSupportCases(nextCases);
				return sortedCases;
			});
			if (selectedCase?._id === updatedCase._id && belongsHere) {
				setSelectedCase(updatedCase);
			}
			if (selectedCase?._id === updatedCase._id && !belongsHere) {
				socket.emit("leaveRoom", { caseId: updatedCase._id });
				setSelectedCase(null);
				clearCaseIdFromUrl({ replace: true });
			}
		};

		// On case closed
		const handleCaseClosed = (closedCase) => {
			const closedCaseId =
				closedCase?.case?._id || closedCase?.caseId || closedCase?._id;
			if (!closedCaseId) return;
			setSupportCases((prevCases) =>
				prevCases.filter((c) => c._id !== closedCaseId)
			);
			if (selectedCase && String(selectedCase._id) === String(closedCaseId)) {
				socket.emit("leaveRoom", { caseId: closedCaseId });
				setSelectedCase(null);
			}
			if (caseIdParam && String(caseIdParam) === String(closedCaseId)) {
				clearCaseIdFromUrl({ replace: true });
			}
			fetchSupportCases();
		};

		socket.on("receiveMessage", handleReceiveMessage);
		socket.on("newChat", handleNewChat);
		socket.on("supportCaseUpdated", handleSupportCaseUpdated);
		socket.on("supportCaseEscalated", fetchSupportCases);
		socket.on("supportCaseEscalationAddressed", fetchSupportCases);
		socket.on("supportCaseEscalationUpdated", fetchSupportCases);
		socket.on("closeCase", handleCaseClosed);

		return () => {
			socket.off("receiveMessage", handleReceiveMessage);
			socket.off("newChat", handleNewChat);
			socket.off("supportCaseUpdated", handleSupportCaseUpdated);
			socket.off("supportCaseEscalated", fetchSupportCases);
			socket.off("supportCaseEscalationAddressed", fetchSupportCases);
			socket.off("supportCaseEscalationUpdated", fetchSupportCases);
			socket.off("closeCase", handleCaseClosed);
		};
	}, [
		caseBelongsToMode,
		fetchSupportCases,
		clearCaseIdFromUrl,
		caseIdParam,
		selectedCase,
		sortSupportCases,
		soundEnabled,
		playSound,
		user._id,
	]);

	/* ------------------- MARK CASE AS SEEN ------------------- */
	const markCaseAsSeen = useCallback(async (caseObj) => {
		if (!caseObj || !caseObj._id) return;

		// Join the socket room
		socket.emit("joinRoom", { caseId: caseObj._id });

		try {
			await markAllMessagesAsSeenByAdmin(caseObj._id, user._id);
			socket.emit("messageSeen", {
				caseId: caseObj._id,
				userId: user._id,
			});
			const markSeen = (supportCase) => ({
				...supportCase,
				adminUnreadCount: 0,
				conversation: Array.isArray(supportCase.conversation)
					? supportCase.conversation.map((message) => ({
							...message,
							seenByAdmin: true,
					  }))
					: [],
			});
			setSupportCases((prevCases) => {
				const nextCases = prevCases.map((supportCase) =>
					supportCase._id === caseObj._id ? markSeen(supportCase) : supportCase
				);
				return nextCases;
			});
			setSelectedCase((previous) =>
				previous?._id === caseObj._id ? markSeen(previous) : previous
			);
		} catch (error) {
			console.error("Error marking messages as seen:", error);
		}
	}, [user._id]);

	/* ------------------- HANDLE CASE SELECTION ------------------- */
	const handleCaseSelection = async (item) => {
		if (!item?._id) return;
		syncCaseIdToUrl(item._id);
		const fullCase = await loadSupportCaseDetails(item);
		if (fullCase === null) return;
		const caseForChat = fullCase || item;

		// On large screens => local selection, side by side
		if (!isMobile) {
			// Leave previous room if needed
			if (selectedCase && selectedCase._id) {
				socket.emit("leaveRoom", { caseId: selectedCase._id });
			}
			setSelectedCase(caseForChat);
			await markCaseAsSeen(caseForChat);
		} else {
			// On small screens the URL drives the full-screen chat view.
			setSelectedCase(caseForChat);
			await markCaseAsSeen(caseForChat);
		}
	};

	/* ------------------- HOTEL CHANGED SOCKET ------------------- */
	useEffect(() => {
		const handleHotelChanged = ({ caseId, newHotel }) => {
			setSupportCases((prevCases) =>
				prevCases.map((supportCase) =>
					supportCase._id === caseId
						? { ...supportCase, hotelId: { ...newHotel } }
						: supportCase
				)
			);
			if (selectedCase && selectedCase._id === caseId) {
				setSelectedCase((prev) => ({
					...prev,
					hotelId: { ...newHotel },
				}));
			}
		};

		socket.on("hotelChanged", handleHotelChanged);

		return () => {
			socket.off("hotelChanged", handleHotelChanged);
		};
	}, [selectedCase, setSupportCases]);

	useEffect(() => {
		if (isMobile || !caseIdParam || !supportCases.length) return;
		const foundCase = supportCases.find((item) => item._id === caseIdParam);
		if (!foundCase) {
			if (selectedCase?._id === caseIdParam) {
				socket.emit("leaveRoom", { caseId: selectedCase._id });
				setSelectedCase(null);
			}
			clearCaseIdFromUrl({ replace: true });
			return;
		}
		if (selectedCase?._id === foundCase._id) return;
		if (selectedCase?._id) {
			socket.emit("leaveRoom", { caseId: selectedCase._id });
		}
		setSelectedCase(foundCase);
		let cancelled = false;
		loadSupportCaseDetails(foundCase).then((fullCase) => {
			if (cancelled) return;
			if (fullCase === null) return;
			const caseForChat = fullCase || foundCase;
			setSelectedCase(caseForChat);
			markCaseAsSeen(caseForChat);
		});
		return () => {
			cancelled = true;
		};
	}, [
		caseIdParam,
		clearCaseIdFromUrl,
		isMobile,
		loadSupportCaseDetails,
		markCaseAsSeen,
		selectedCase?._id,
		supportCases,
	]);

	useEffect(() => {
		if (!isMobile || !caseIdParam || !supportCases.length) return;
		const foundCase = supportCases.find((item) => item._id === caseIdParam);
		if (!foundCase) {
			if (selectedCase?._id === caseIdParam) {
				setSelectedCase(null);
			}
			clearCaseIdFromUrl({ replace: true });
			return;
		}
		if (selectedCase?._id === foundCase._id) return;
		setSelectedCase(foundCase);
		let cancelled = false;
		loadSupportCaseDetails(foundCase).then((fullCase) => {
			if (cancelled) return;
			if (fullCase === null) return;
			const caseForChat = fullCase || foundCase;
			setSelectedCase(caseForChat);
			markCaseAsSeen(caseForChat);
		});
		return () => {
			cancelled = true;
		};
	}, [
		caseIdParam,
		clearCaseIdFromUrl,
		isMobile,
		loadSupportCaseDetails,
		markCaseAsSeen,
		selectedCase?._id,
		supportCases,
	]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const legacyId = params.get("id");
		const canonicalId = params.get("caseId");
		if (legacyId && !canonicalId) {
			syncCaseIdToUrl(legacyId, { replace: true });
		}
	}, [location.search, syncCaseIdToUrl]);

	const learningModal = (
		<Modal
			title={learningText.modalTitle}
			open={learningModalOpen}
			onCancel={closeLearningModal}
			footer={null}
			width={820}
			destroyOnClose
			dir={isArabic ? "rtl" : "ltr"}
		>
			<Tabs
				activeKey={learningTab}
				onChange={setLearningTab}
				items={[
					{
						key: "upload",
						label: learningText.uploadTab,
						children: (
							<LearningPane>
								<label>{learningText.pasteLabel}</label>
								<TextArea
									value={trainingChatText}
									onChange={(e) => setTrainingChatText(e.target.value)}
									placeholder={learningText.pastePlaceholder}
									autoSize={{ minRows: 10, maxRows: 18 }}
								/>
								<Button
									type='primary'
									onClick={handleSubmitTrainingChat}
									loading={learningSubmitting}
									disabled={!trainingChatText.trim()}
								>
									{learningText.submit}
								</Button>
							</LearningPane>
						),
					},
					{
						key: "history",
						label: learningText.historyTab,
						children: (
							<HistoryPane>
								{learningLoading ? (
									<Spin />
								) : trainingChats.length ? (
									<List
										dataSource={trainingChats}
										renderItem={(item) => (
											<List.Item key={item._id}>
												<TrainingChatItem>
													<div className='training-title'>{item.chatTitle}</div>
													<div className='training-summary'>
														{item.summary || learningText.noSummary}
													</div>
													<div className='training-meta'>
														<span>
															{item.conversation?.length || 0} {learningText.turns}
														</span>
														{Array.isArray(item.chatKeywords) &&
															item.chatKeywords.slice(0, 8).map((keyword) => (
																<Tag key={`${item._id}-${keyword}`} color='blue'>
																	{keyword}
																</Tag>
															))}
													</div>
												</TrainingChatItem>
											</List.Item>
										)}
									/>
								) : (
									<Empty description={learningText.emptyText} />
								)}
							</HistoryPane>
						),
					},
				]}
			/>
		</Modal>
	);

	/* ------------------- MOBILE LOGIC ------------------- */
	if (isMobile) {
		// If we have a caseId in the URL, show chat in full screen
		if (caseIdParam) {
			const foundCase = supportCases.find((c) => c._id === caseIdParam);
			const selectedCaseIsActive =
				selectedCase?._id === caseIdParam && caseBelongsToMode(selectedCase);
			const visibleCase =
				selectedCaseIsActive ? selectedCase : foundCase;
			if (!visibleCase) {
				return <div>Loading case...</div>; // or fetch single case if needed
			}

			return (
				<ActiveClientsSupportCasesWrapperMobile>
					<Spin spinning={selectedCaseLoading}>
						<ChatDetail
							chat={visibleCase}
							fetchChats={fetchSupportCases}
							selectedCase={visibleCase}
							setSelectedCase={setSelectedCase}
							setSupportCases={setSupportCases}
						/>
					</Spin>
				</ActiveClientsSupportCasesWrapperMobile>
			);
		} else {
			// Show only the list, 100% width, 2px padding, no chat detail
			return (
				<ActiveClientsSupportCasesWrapperMobile>
					{!isEscalatedMode && (
						<Button type='primary' onClick={openLearningModal}>
							{learningText.button}
						</Button>
					)}
					{learningModal}
					<List
						key={JSON.stringify(supportCases)}
						style={{ marginTop: "20px", padding: "2px" }}
						header={
							<div style={{ fontWeight: "bold", textDecoration: "underline" }}>
								{listTitle}
								<Badge
									count={unseenCount}
									style={{ backgroundColor: "#f5222d", marginLeft: "10px" }}
								/>
							</div>
						}
						bordered
						dataSource={supportCases}
						renderItem={(item) => {
							const unreadCount = supportCaseAdminUnreadMessages(item, user._id);
							const hasUnseen = unreadCount > 0;
							const isEscalatedItem = isActiveEscalatedSupportCase(item);
							return (
								<List.Item
									key={item._id}
									onClick={() => handleCaseSelection(item)}
									style={{
										cursor: "pointer",
										textTransform: "capitalize",
										backgroundColor: hasUnseen
											? "#fff1f0"
											: isEscalatedItem
											  ? "#fff7e6"
											  : "white",
										position: "relative",
										marginBottom: "4px",
										paddingRight: hasUnseen ? 48 : undefined,
									}}
								>
									<ClientCaseListItem>
										<div className='case-title-row'>
											<strong dir='auto'>{item.displayName1}</strong>
											{caseSourceLabel(item, isArabic) && (
												<Tag color='blue'>{caseSourceLabel(item, isArabic)}</Tag>
											)}
										</div>
										<div className='case-subtitle' dir='auto'>
											{caseHotelName(item)} • {caseTopicText(item)}
										</div>
										{caseContactText(item) && (
											<div className='case-contact' dir='auto'>
												{caseContactText(item)}
											</div>
										)}
									</ClientCaseListItem>
									{isEscalatedItem && (
										<EscalationPill>{escalatedLabel}</EscalationPill>
									)}
									{hasUnseen && (
										<Badge
											count={unreadCount}
											style={{
												backgroundColor: "#f5222d",
												position: "absolute",
												right: 10,
											}}
										/>
									)}
								</List.Item>
							);
						}}
					/>
				</ActiveClientsSupportCasesWrapperMobile>
			);
		}
	}

	/* ------------------- DESKTOP / LARGE SCREEN LAYOUT ------------------- */
	return (
		<ActiveClientsSupportCasesWrapper>
			{!isEscalatedMode && (
				<Button type='primary' onClick={openLearningModal}>
					{learningText.button}
				</Button>
			)}
			{learningModal}
			<MainContentWrapper>
				<SupportCasesList>
					<List
						key={JSON.stringify(supportCases)}
						style={{ marginTop: "20px" }}
						header={
							<div style={{ fontWeight: "bold", textDecoration: "underline" }}>
								{listTitle}
								<Badge
									count={unseenCount}
									style={{ backgroundColor: "#f5222d", marginLeft: "10px" }}
								/>
							</div>
						}
						bordered
						dataSource={supportCases}
						renderItem={(item) => {
							const unreadCount = supportCaseAdminUnreadMessages(item, user._id);
							const hasUnseenMessages = unreadCount > 0;
							const isEscalatedItem = isActiveEscalatedSupportCase(item);
							return (
								<List.Item
									key={item._id}
									onClick={() => handleCaseSelection(item)}
									style={{
										cursor: "pointer",
										textTransform: "capitalize",
										backgroundColor:
											selectedCase && selectedCase._id === item._id
												? "#e6f7ff"
												: hasUnseenMessages
												  ? "#fff1f0"
												  : isEscalatedItem
													? "#fff7e6"
													: "white",
										position: "relative",
										paddingRight: hasUnseenMessages ? 48 : undefined,
									}}
								>
									<ClientCaseListItem>
										<div className='case-title-row'>
											<strong dir='auto'>{item.displayName1}</strong>
											{caseSourceLabel(item, isArabic) && (
												<Tag color='blue'>{caseSourceLabel(item, isArabic)}</Tag>
											)}
										</div>
										<div className='case-subtitle' dir='auto'>
											{caseHotelName(item)} • {caseTopicText(item)}
										</div>
										{caseContactText(item) && (
											<div className='case-contact' dir='auto'>
												{caseContactText(item)}
											</div>
										)}
									</ClientCaseListItem>
									{isEscalatedItem && (
										<EscalationPill>{escalatedLabel}</EscalationPill>
									)}
									{hasUnseenMessages && (
										<Badge
											count={unreadCount}
											style={{
												backgroundColor: "#f5222d",
												position: "absolute",
												right: 10,
											}}
										/>
									)}
								</List.Item>
							);
						}}
					/>
				</SupportCasesList>

				{selectedCase && (
					<ChatDetailWrapper>
						<Spin spinning={selectedCaseLoading}>
							<ChatDetail
								chat={selectedCase}
								fetchChats={fetchSupportCases}
								selectedCase={selectedCase}
								setSelectedCase={setSelectedCase}
								setSupportCases={setSupportCases}
							/>
						</Spin>
					</ChatDetailWrapper>
				)}
			</MainContentWrapper>
		</ActiveClientsSupportCasesWrapper>
	);
};

export default ActiveClientsSupportCases;

/* ------------------------------------------------------- */
/*                     STYLED COMPONENTS                   */
/* ------------------------------------------------------- */

const LearningPane = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;

	label {
		font-weight: 700;
		color: #18334f;
	}
`;

const HistoryPane = styled.div`
	min-height: 220px;

	.ant-spin {
		display: block;
		margin: 45px auto;
	}
`;

const TrainingChatItem = styled.div`
	width: 100%;

	.training-title {
		font-weight: 800;
		color: #18334f;
		margin-bottom: 4px;
	}

	.training-summary {
		color: #4f6477;
		line-height: 1.45;
		margin-bottom: 8px;
	}

	.training-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		color: #6a7f91;
		font-size: 0.85rem;
	}
`;

const ClientCaseListItem = styled.div`
	min-width: 0;
	display: grid;
	gap: 4px;
	text-transform: none;

	.case-title-row {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.case-title-row strong {
		color: #102033;
		font-weight: 900;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.case-subtitle,
	.case-contact {
		color: #557086;
		font-size: 0.78rem;
		line-height: 1.35;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.case-contact {
		color: #0b6b55;
		font-weight: 800;
	}
`;

const EscalationPill = styled.span`
	display: inline-flex;
	align-items: center;
	margin-inline-start: 8px;
	padding: 2px 7px;
	border: 1px solid rgba(217, 119, 6, 0.42);
	border-radius: 999px;
	background: #fff7e6;
	color: #92400e;
	font-size: 0.68rem;
	font-weight: 900;
	line-height: 1.25;
	vertical-align: middle;
`;

const ActiveClientsSupportCasesWrapper = styled.div`
	padding: 20px;

	.ant-btn-primary {
		background-color: #1890ff;
		border-color: #1890ff;
		color: #fff;
		&:hover {
			background-color: #40a9ff;
			border-color: #40a9ff;
		}
	}
`;

// For the mobile full-width container
const ActiveClientsSupportCasesWrapperMobile = styled.div`
	padding: 2px; /* minimal padding as requested */
	@media (max-width: 1000px) {
		ul {
			font-size: 0.75rem !important;
		}
	}
`;

const MainContentWrapper = styled.div`
	display: flex;
	width: 100%;
	margin-top: 20px;
`;

const SupportCasesList = styled.div`
	width: 25%;
	padding-right: 10px;
`;

const ChatDetailWrapper = styled.div`
	width: 75%;
	padding-left: 10px;
	border: 1px solid #e8e8e8;
	background-color: #f9f9f9;
	border-radius: 4px;
`;
