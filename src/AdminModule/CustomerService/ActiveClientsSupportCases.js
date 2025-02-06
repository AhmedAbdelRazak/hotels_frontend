import React, { useState, useEffect, useCallback, useContext } from "react";
import styled from "styled-components";
import { useLocation, useHistory } from "react-router-dom";
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

// 1) Import NotificationContext
import { NotificationContext } from "./NotificationContext";

const ActiveClientsSupportCases = ({ getUser, isSuperAdmin }) => {
	const [supportCases, setSupportCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);
	const [unseenCount, setUnseenCount] = useState(0);
	const { user, token } = isAuthenticated();

	// For smaller-screen routing
	const location = useLocation();
	const history = useHistory();
	const queryParams = new URLSearchParams(location.search);
	const caseIdParam = queryParams.get("id");

	// Detect if user is on a mobile screen
	const isMobile = window.innerWidth <= 768;

	// 2) Destructure from context:
	//    - soundEnabled (if you want to conditionally do something)
	//    - playSound (to actually play the notification audio)
	const { soundEnabled, playSound } = useContext(NotificationContext);

	/* ------------------- FETCH UNSEEN COUNT ------------------- */
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
				fetchUnseenCount();
			}
		});

		return () => {
			socket.off("messageSeen");
		};
	}, [user._id]);

	/* ------------------- SORT SUPPORT CASES ------------------- */
	const sortSupportCases = useCallback(
		(cases) => {
			return [...cases].sort((a, b) => {
				const latestA =
					a.conversation
						.filter((msg) => msg.messageBy.userId !== user._id)
						.slice(-1)[0]?.date || a.createdAt;
				const latestB =
					b.conversation
						.filter((msg) => msg.messageBy.userId !== user._id)
						.slice(-1)[0]?.date || b.createdAt;
				return new Date(latestB) - new Date(latestA); // Descending
			});
		},
		[user._id]
	);

	/* ------------------- FETCH SUPPORT CASES ------------------- */
	const fetchSupportCases = useCallback(() => {
		getFilteredSupportCasesClients(token)
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
					const openCases = filteredCases.filter(
						(chat) => chat.caseStatus !== "closed"
					);

					setSupportCases(sortSupportCases(openCases));

					// Calculate total unseen messages
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
	}, [token, isSuperAdmin, getUser, sortSupportCases]);

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
				setSupportCases((prevCases) =>
					prevCases.map((c) =>
						c._id === message.caseId
							? { ...c, conversation: [...c.conversation, message] }
							: c
					)
				);
			}
		};

		// On new chat
		const handleNewChat = (newCase) => {
			// If you want a beep for brand new cases, do it here
			if (newCase.openedBy === "client") {
				if (soundEnabled) {
					playSound();
					// Optionally vibrate
					if ("vibrate" in navigator) {
						navigator.vibrate(200);
					}
				}
				setSupportCases((prevCases) => [...prevCases, newCase]);
			}
		};

		// On case closed
		const handleCaseClosed = (closedCase) => {
			setSupportCases((prevCases) =>
				prevCases.filter((c) => c._id !== closedCase.case._id)
			);
			if (selectedCase && selectedCase._id === closedCase.case._id) {
				setSelectedCase(null);
			}
		};

		socket.on("receiveMessage", handleReceiveMessage);
		socket.on("newChat", handleNewChat);
		socket.on("closeCase", handleCaseClosed);

		return () => {
			socket.off("receiveMessage", handleReceiveMessage);
			socket.off("newChat", handleNewChat);
			socket.off("closeCase", handleCaseClosed);
		};
	}, [fetchSupportCases, selectedCase, soundEnabled, playSound]);

	/* ------------------- MARK CASE AS SEEN ------------------- */
	const markCaseAsSeen = async (caseObj) => {
		if (!caseObj || !caseObj._id) return;

		// Join the socket room
		socket.emit("joinRoom", { caseId: caseObj._id });

		try {
			await markAllMessagesAsSeenByAdmin(caseObj._id, user._id);
			socket.emit("messageSeen", {
				caseId: caseObj._id,
				userId: user._id,
			});
			// Re-fetch unseen
			const result = await getUnseenMessagesCountByAdmin(user._id);
			if (result && result.count !== undefined) {
				setUnseenCount(result.count);
			}
		} catch (error) {
			console.error("Error marking messages as seen:", error);
		}
	};

	/* ------------------- HANDLE CASE SELECTION ------------------- */
	const handleCaseSelection = async (item) => {
		// On large screens => local selection, side by side
		if (!isMobile) {
			// Leave previous room if needed
			if (selectedCase && selectedCase._id) {
				socket.emit("leaveRoom", { caseId: selectedCase._id });
			}
			setSelectedCase(item);
			await markCaseAsSeen(item);
		} else {
			// On small screens => add ?id=someCaseId, show chat in full screen
			history.push(`?id=${item._id}`);
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

	/* ------------------- MOBILE LOGIC ------------------- */
	if (isMobile) {
		// If we have a caseId in the URL, show chat in full screen
		if (caseIdParam) {
			const foundCase = supportCases.find((c) => c._id === caseIdParam);
			if (!foundCase) {
				return <div>Loading case...</div>; // or fetch single case if needed
			}
			// Mark as seen
			markCaseAsSeen(foundCase);

			return (
				<ActiveClientsSupportCasesWrapperMobile>
					<ChatDetail
						chat={foundCase}
						fetchChats={fetchSupportCases}
						selectedCase={foundCase}
						setSelectedCase={setSelectedCase}
						setSupportCases={setSupportCases}
					/>
				</ActiveClientsSupportCasesWrapperMobile>
			);
		} else {
			// Show only the list, 100% width, 2px padding, no chat detail
			return (
				<ActiveClientsSupportCasesWrapperMobile>
					<List
						key={JSON.stringify(supportCases)}
						style={{ marginTop: "20px", padding: "2px" }}
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
							const hasUnseen = item.conversation.some(
								(msg) => !msg.seenByAdmin
							);
							return (
								<List.Item
									key={item._id}
									onClick={() => handleCaseSelection(item)}
									style={{
										cursor: "pointer",
										textTransform: "capitalize",
										backgroundColor: hasUnseen ? "#fff1f0" : "white",
										position: "relative",
										marginBottom: "4px", // optional spacing
									}}
								>
									{item.hotelId &&
									item.hotelId._id !== "674cf8997e3780f1f838d458"
										? item.hotelId.hotelName
										: "Jannat Booking"}{" "}
									- <strong>{item.displayName1}</strong>
									{hasUnseen && (
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
				</ActiveClientsSupportCasesWrapperMobile>
			);
		}
	}

	/* ------------------- DESKTOP / LARGE SCREEN LAYOUT ------------------- */
	return (
		<ActiveClientsSupportCasesWrapper>
			<MainContentWrapper>
				<SupportCasesList>
					<List
						key={JSON.stringify(supportCases)}
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
							fetchChats={fetchSupportCases}
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

/* ------------------------------------------------------- */
/*                     STYLED COMPONENTS                   */
/* ------------------------------------------------------- */

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
