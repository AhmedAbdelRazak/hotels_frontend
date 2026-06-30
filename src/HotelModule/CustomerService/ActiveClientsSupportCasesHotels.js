import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Badge, Empty, List, Spin, Tag } from "antd";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import socket from "../../socket";
import {
	getFilteredSupportCasesClients,
	getHotelSupportCaseById,
	markAllMessagesAsSeenByHotel,
} from "../apiAdmin";
import ChatDetailHotels from "./ChatDetailHotels";

const normalizeId = (value) =>
	String(value?._id || value?.id || value || "").trim();

const caseHotelName = (item = {}) =>
	item.hotelId && typeof item.hotelId === "object"
		? item.hotelId.hotelName || item.hotelId.hotelName_OtherLanguage || "Hotel"
		: "Hotel";

const caseTopicText = (item = {}) =>
	item.caseTopic ||
	item.caseSubject ||
	item.conversationPreview?.inquiryAbout ||
	item.conversation?.[0]?.inquiryAbout ||
	"Client support";

const caseClientName = (item = {}) =>
	item.clientProfile?.name || item.displayName1 || item.clientName || "Guest";

const caseClientContact = (item = {}) =>
	item.clientProfile?.contact ||
	item.clientContact ||
	item.conversationPreview?.messageBy?.customerEmail ||
	"";

const caseLatestAt = (item = {}) =>
	item.latestConversationAt || item.updatedAt || item.createdAt || "";

const isHotelUnreadClientMessage = (message = {}, userId = "") => {
	if (!message || message.seenByHotel || message.isAi || message.isSystem) {
		return false;
	}
	const senderId = normalizeId(message.messageBy?.userId);
	return !senderId || senderId !== normalizeId(userId);
};

const hotelUnreadCount = (item = {}, userId = "") =>
	(Array.isArray(item.conversation) ? item.conversation : []).filter((message) =>
		isHotelUnreadClientMessage(message, userId)
	).length;

const ActiveClientsSupportCasesHotels = () => {
	const { user, token } = isAuthenticated();
	const { hotelId: routeHotelId } = useParams();
	const [selectedHotel, setSelectedHotel] = useState("");
	const [supportCases, setSupportCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);
	const [loading, setLoading] = useState(true);
	const [selectedCaseLoading, setSelectedCaseLoading] = useState(false);

	useEffect(() => {
		try {
			const storedHotel = localStorage.getItem("selectedHotel");
			const parsedHotel = storedHotel ? JSON.parse(storedHotel) : null;
			setSelectedHotel(normalizeId(parsedHotel?._id) || normalizeId(routeHotelId));
		} catch (error) {
			setSelectedHotel(normalizeId(routeHotelId));
		}
	}, [routeHotelId]);

	const activeHotelId = selectedHotel || normalizeId(routeHotelId);

	const caseBelongsHere = useCallback(
		(item = {}) =>
			item.openedBy === "client" &&
			item.caseStatus !== "closed" &&
			normalizeId(item.hotelId) === activeHotelId,
		[activeHotelId]
	);

	const sortCases = useCallback(
		(cases = []) =>
			[...cases].sort(
				(a, b) => new Date(caseLatestAt(b)) - new Date(caseLatestAt(a))
			),
		[]
	);

	const fetchSupportCases = useCallback(() => {
		if (!activeHotelId) {
			setLoading(false);
			setSupportCases([]);
			return Promise.resolve([]);
		}
		setLoading(true);
		return getFilteredSupportCasesClients(token, activeHotelId)
			.then((data) => {
				if (data?.error || !Array.isArray(data)) {
					toast.error(data?.error || "Failed to fetch client support cases");
					setSupportCases([]);
					return [];
				}
				const openCases = sortCases(data.filter(caseBelongsHere));
				setSupportCases(openCases);
				if (
					selectedCase?._id &&
					!openCases.some((item) => item._id === selectedCase._id)
				) {
					socket.emit("leaveRoom", { caseId: selectedCase._id });
					setSelectedCase(null);
				}
				return openCases;
			})
			.catch(() => {
				toast.error("Failed to fetch client support cases");
				setSupportCases([]);
				return [];
			})
			.finally(() => setLoading(false));
	}, [activeHotelId, caseBelongsHere, selectedCase?._id, sortCases, token]);

	useEffect(() => {
		fetchSupportCases();

		const handleNewOrUpdatedCase = (updatedCase) => {
			if (!updatedCase?._id) return;
			if (!caseBelongsHere(updatedCase)) {
				setSupportCases((prevCases) =>
					prevCases.filter((item) => item._id !== updatedCase._id)
				);
				if (selectedCase?._id === updatedCase._id) setSelectedCase(null);
				return;
			}
			setSupportCases((prevCases) => {
				const exists = prevCases.some((item) => item._id === updatedCase._id);
				const nextCases = exists
					? prevCases.map((item) =>
							item._id === updatedCase._id ? updatedCase : item
					  )
					: [...prevCases, updatedCase];
				return sortCases(nextCases);
			});
			if (selectedCase?._id === updatedCase._id) {
				setSelectedCase(updatedCase);
			}
		};

		const handleMessage = (message) => {
			if (!message?.caseId) return;
			setSupportCases((prevCases) =>
				sortCases(
					prevCases.map((item) =>
						item._id === message.caseId
							? {
									...item,
									updatedAt: message.date || new Date().toISOString(),
									conversation: [
										...(Array.isArray(item.conversation)
											? item.conversation
											: []),
										message,
									],
							  }
							: item
					)
				)
			);
		};

		const handleClosed = (closedCase) => {
			const closedCaseId =
				closedCase?.case?._id || closedCase?.caseId || closedCase?._id;
			if (!closedCaseId) return;
			setSupportCases((prevCases) =>
				prevCases.filter((item) => item._id !== closedCaseId)
			);
			if (selectedCase?._id === closedCaseId) {
				socket.emit("leaveRoom", { caseId: closedCaseId });
				setSelectedCase(null);
			}
		};

		socket.on("newChat", handleNewOrUpdatedCase);
		socket.on("supportCaseUpdated", handleNewOrUpdatedCase);
		socket.on("receiveMessage", handleMessage);
		socket.on("closeCase", handleClosed);

		return () => {
			socket.off("newChat", handleNewOrUpdatedCase);
			socket.off("supportCaseUpdated", handleNewOrUpdatedCase);
			socket.off("receiveMessage", handleMessage);
			socket.off("closeCase", handleClosed);
		};
	}, [
		caseBelongsHere,
		fetchSupportCases,
		selectedCase?._id,
		sortCases,
	]);

	const totalUnread = useMemo(
		() =>
			supportCases.reduce(
				(total, item) => total + hotelUnreadCount(item, user?._id),
				0
			),
		[supportCases, user?._id]
	);

	const handleCaseSelection = async (item) => {
		if (!item?._id || !activeHotelId) return;
		if (selectedCase?._id) {
			socket.emit("leaveRoom", { caseId: selectedCase._id });
		}
		socket.emit("joinRoom", { caseId: item._id });
		setSelectedCaseLoading(true);
		try {
			const fullCase = await getHotelSupportCaseById(
				item._id,
				token,
				activeHotelId
			);
			const caseForChat = fullCase?._id ? fullCase : item;
			setSelectedCase(caseForChat);
			await markAllMessagesAsSeenByHotel(item._id, user._id);
			setSupportCases((prevCases) =>
				prevCases.map((supportCase) =>
					supportCase._id === item._id
						? {
								...supportCase,
								conversation: (supportCase.conversation || []).map(
									(message) => ({
										...message,
										seenByHotel: true,
									})
								),
						  }
						: supportCase
				)
			);
		} catch (error) {
			toast.error("Failed to open client support case");
		} finally {
			setSelectedCaseLoading(false);
		}
	};

	return (
		<ActiveClientsSupportCasesHotelsWrapper>
			{!activeHotelId ? (
				<Empty description='No hotel selected' />
			) : (
				<MainContentWrapper>
					<SupportCasesList>
						<Spin spinning={loading}>
							<List
								style={{ marginTop: "20px" }}
								header={
									<ListHeader>
										<span>Active Client Support Cases</span>
										<Badge count={totalUnread} />
									</ListHeader>
								}
								bordered
								dataSource={supportCases}
								locale={{ emptyText: "No active client cases" }}
								renderItem={(item) => {
									const unreadCount = hotelUnreadCount(item, user?._id);
									return (
										<List.Item
											key={item._id}
											onClick={() => handleCaseSelection(item)}
											style={{
												cursor: "pointer",
												backgroundColor:
													selectedCase && selectedCase._id === item._id
														? "#e6f7ff"
														: unreadCount
														  ? "#fff1f0"
														  : "white",
												position: "relative",
												paddingRight: unreadCount ? 48 : undefined,
											}}
										>
											<ClientCaseListItem>
												<div className='case-title-row'>
													<strong dir='auto'>{caseClientName(item)}</strong>
													<Tag color='blue'>{caseHotelName(item)}</Tag>
												</div>
												<div className='case-subtitle' dir='auto'>
													{caseTopicText(item)}
												</div>
												{caseClientContact(item) && (
													<div className='case-contact' dir='auto'>
														{caseClientContact(item)}
													</div>
												)}
											</ClientCaseListItem>
											{unreadCount > 0 && (
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
						</Spin>
					</SupportCasesList>

					{selectedCase && (
						<ChatDetailWrapper>
							<Spin spinning={selectedCaseLoading}>
								<ChatDetailHotels
									chat={selectedCase}
									fetchChats={fetchSupportCases}
								/>
							</Spin>
						</ChatDetailWrapper>
					)}
				</MainContentWrapper>
			)}
		</ActiveClientsSupportCasesHotelsWrapper>
	);
};

export default ActiveClientsSupportCasesHotels;

const ActiveClientsSupportCasesHotelsWrapper = styled.div`
	padding: 20px;
`;

const MainContentWrapper = styled.div`
	display: flex;
	width: 100%;
	margin-top: 20px;
`;

const SupportCasesList = styled.div`
	width: 30%;
	padding-right: 10px;
`;

const ChatDetailWrapper = styled.div`
	width: 70%;
	padding-left: 10px;
	border: 1px solid #e8e8e8;
	background-color: #f9f9f9;
	border-radius: 4px;
`;

const ListHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	font-weight: 800;
	text-decoration: underline;
`;

const ClientCaseListItem = styled.div`
	min-width: 0;
	width: 100%;

	.case-title-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.case-subtitle,
	.case-contact {
		margin-top: 4px;
		color: #4b5563;
		font-size: 0.86rem;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
`;
