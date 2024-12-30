import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { List, Badge } from "antd";
import {
	getFilteredSupportCasesClients,
	markAllMessagesAsSeenByAdmin,
	getUnseenMessagesCountByAdmin,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import { toast } from "react-toastify";
import ChatDetail from "./ChatDetail";
import socket from "../../socket";
import notificationSound from "./Notification.wav"; // Ensure the path is correct

const ActiveClientsSupportCases = () => {
	const [supportCases, setSupportCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);
	const [unseenCount, setUnseenCount] = useState(0);
	const { user, token } = isAuthenticated();

	// Fetch unseen messages count for the admin
	useEffect(() => {
		const fetchUnseenCount = async () => {
			try {
				const result = await getUnseenMessagesCountByAdmin(user._id);
				if (result && result.count !== undefined) {
					setUnseenCount(result.count);
				} else {
					setUnseenCount(0);
				}
			} catch (error) {
				setUnseenCount(0);
				console.error("Error fetching unseen messages count:", error);
			}
		};

		fetchUnseenCount();

		// Listen for messageSeen to update unseen count
		socket.on("messageSeen", ({ caseId, userId }) => {
			if (userId === user._id) {
				fetchUnseenCount(); // Update unseen messages when seen
			}
		});

		// Cleanup socket listeners
		return () => {
			socket.off("messageSeen");
		};
	}, [user._id]);

	// Play notification sound when new messages arrive
	const playNotificationSound = () => {
		const audio = new Audio(notificationSound);
		audio.play().catch((error) => {
			console.error("Audio play error:", error);
		});
	};

	const sortSupportCases = useCallback(
		(cases) => {
			return [...cases].sort((a, b) => {
				const latestMessageA =
					a.conversation
						.filter((msg) => msg.messageBy.userId !== user._id)
						.slice(-1)[0]?.date || a.createdAt;
				const latestMessageB =
					b.conversation
						.filter((msg) => msg.messageBy.userId !== user._id)
						.slice(-1)[0]?.date || b.createdAt;

				return new Date(latestMessageB) - new Date(latestMessageA); // Descending order
			});
		},
		[user._id]
	);

	// Memoize fetchSupportCases to avoid re-creation
	const fetchSupportCases = useCallback(() => {
		getFilteredSupportCasesClients(token)
			.then((data) => {
				if (data.error) {
					toast.error("Failed to fetch support cases");
				} else {
					const openCases = data.filter((chat) => chat.caseStatus !== "closed");
					setSupportCases(sortSupportCases(openCases));

					const unseenMessages = openCases.reduce((acc, supportCase) => {
						return (
							acc +
							supportCase.conversation.filter((msg) => !msg.seenByAdmin).length
						);
					}, 0);
					setUnseenCount(unseenMessages);
				}
			})
			.catch(() => {
				toast.error("Failed to fetch support cases");
			});
	}, [token, sortSupportCases]);

	useEffect(() => {
		fetchSupportCases();

		// Handle new message received event
		const handleReceiveMessage = (message) => {
			if (message && message.caseId) {
				playNotificationSound();
				setSupportCases((prevCases) =>
					prevCases.map((c) =>
						c._id === message.caseId
							? { ...c, conversation: [...c.conversation, message] }
							: c
					)
				);
			}
		};

		// Handle real-time new case event for clients only
		const handleNewChat = (newCase) => {
			if (newCase.openedBy === "client") {
				setSupportCases((prevCases) => [...prevCases, newCase]);
			}
		};

		// Handle case closed event
		const handleCaseClosed = (closedCase) => {
			setSupportCases((prevCases) =>
				prevCases.filter((c) => c._id !== closedCase.case._id)
			);
			if (selectedCase && selectedCase._id === closedCase.case._id) {
				setSelectedCase(null);
			}
		};

		// Socket listeners
		socket.on("receiveMessage", handleReceiveMessage);
		socket.on("newChat", handleNewChat);
		socket.on("closeCase", handleCaseClosed); // Ensure closed cases are handled

		// Cleanup socket listeners
		return () => {
			socket.off("receiveMessage", handleReceiveMessage);
			socket.off("newChat", handleNewChat);
			socket.off("closeCase", handleCaseClosed);
		};
	}, [fetchSupportCases, selectedCase]); // fetchSupportCases is now a dependency

	// Mark messages as seen by admin
	const handleCaseSelection = async (selectedCase) => {
		// Leave the previous room if a case was already selected
		if (selectedCase && selectedCase._id) {
			socket.emit("leaveRoom", { caseId: selectedCase._id });
		}

		setSelectedCase(selectedCase);

		if (selectedCase) {
			// Join the new room for the selected case
			socket.emit("joinRoom", { caseId: selectedCase._id });

			try {
				await markAllMessagesAsSeenByAdmin(selectedCase._id, user._id);
				socket.emit("messageSeen", {
					caseId: selectedCase._id,
					userId: user._id,
				});

				// Re-fetch unseen count after marking messages as seen
				const result = await getUnseenMessagesCountByAdmin(user._id);
				if (result && result.count !== undefined) {
					setUnseenCount(result.count); // Update unseen count
				}
			} catch (error) {
				console.error("Error marking messages as seen: ", error);
			}
		}
	};

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
				setSelectedCase((prevCase) => ({
					...prevCase,
					hotelId: { ...newHotel },
				}));
			}
		};

		socket.on("hotelChanged", handleHotelChanged);

		return () => {
			socket.off("hotelChanged", handleHotelChanged);
		};
	}, [selectedCase, setSupportCases]);
	// fetchSupportCases is now a dependency

	return (
		<ActiveClientsSupportCasesWrapper>
			<MainContentWrapper>
				<SupportCasesList>
					<List
						key={JSON.stringify(supportCases)} // Forces re-render when supportCases changes
						style={{ marginTop: "20px" }}
						header={
							<div style={{ fontWeight: "bold", textDecoration: "underline" }}>
								Open Client Support Cases
								<Badge
									count={unseenCount}
									style={{ backgroundColor: "#f5222d", marginLeft: "10px" }}
								/>
							</div>
						}
						bordered
						dataSource={supportCases}
						renderItem={(item) => {
							const hasUnseenMessages = item.conversation.some(
								(msg) => !msg.seenByAdmin
							);
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
												  : "white",
										position: "relative",
									}}
								>
									{item.hotelId &&
									item.hotelId._id !== "674cf8997e3780f1f838d458"
										? item.hotelId.hotelName
										: "Jannat Booking"}{" "}
									- <strong>{item.displayName1}</strong>
									{hasUnseenMessages && (
										<Badge
											count={
												item.conversation.filter((msg) => !msg.seenByAdmin)
													.length
											}
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
						<ChatDetail
							chat={selectedCase}
							fetchChats={fetchSupportCases} // Pass the refactored function
							selectedCase={selectedCase}
							setSelectedCase={setSelectedCase}
							setSupportCases={setSupportCases}
						/>
					</ChatDetailWrapper>
				)}
			</MainContentWrapper>
		</ActiveClientsSupportCasesWrapper>
	);
};

export default ActiveClientsSupportCases;

// Styled-components

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
