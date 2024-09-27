import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
	Button,
	Modal,
	Select,
	Form,
	Typography,
	Input,
	List,
	Badge,
} from "antd";
import {
	gettingAllHotelAccounts,
	createSupportCase,
	getFilteredSupportCases,
	markAllMessagesAsSeenByAdmin,
	getUnseenMessagesCountByAdmin,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import { toast } from "react-toastify";
import { hotelsForAccount } from "../../HotelModule/apiAdmin";
import ChatDetail from "./ChatDetail";
import socket from "../../socket";
import notificationSound from "./Notification.wav"; // Make sure the path is correct

const { Option } = Select;
const { Title } = Typography;
const { TextArea } = Input;

const ActiveHotelSupportCases = () => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [hotelOwners, setHotelOwners] = useState([]);
	const [hotels, setHotels] = useState([]);
	const [selectedOwner, setSelectedOwner] = useState(null);
	const [selectedHotel, setSelectedHotel] = useState(null);
	const [inquiryAbout, setInquiryAbout] = useState("");
	const [inquiryDetails, setInquiryDetails] = useState("");
	const [adminName, setAdminName] = useState("Xhotelpro Management");
	const { user, token } = isAuthenticated();
	const [isLoading, setIsLoading] = useState(false);
	const [supportCases, setSupportCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);
	const [unseenCount, setUnseenCount] = useState(0);
	const [hasUserInteracted, setHasUserInteracted] = useState(false);

	useEffect(() => {
		const fetchUnseenCount = async () => {
			try {
				const result = await getUnseenMessagesCountByAdmin(user._id);
				console.log("Fetched unseen count: ", result);
				if (result && result.count !== undefined) {
					setUnseenCount(result.count === 0 ? 0 : result.count); // Ensure the count is accurate
					console.log("Updated unseen count to: ", result.count);
				} else {
					setUnseenCount(0); // Ensure the count is reset if the result is not as expected
					console.error("Failed to fetch unseen message count");
				}
			} catch (error) {
				setUnseenCount(0); // Reset to 0 on error
				console.error("Error fetching unseen messages count:", error);
			}
		};

		fetchUnseenCount();
	}, [user._id, unseenCount]);

	// Play notification sound

	const playNotificationSound = () => {
		if (!hasUserInteracted) return;

		const audio = new Audio(notificationSound);
		audio.play().catch((error) => {
			console.error("Audio play error:", error);
		});
	};

	useEffect(() => {
		const handleUserInteraction = () => {
			setHasUserInteracted(true);
		};

		// Add an event listener for user interaction (click)
		window.addEventListener("click", handleUserInteraction);

		return () => {
			window.removeEventListener("click", handleUserInteraction);
		};
	}, []);

	// Fetch hotel owners when the modal is opened
	useEffect(() => {
		if (isModalVisible) {
			gettingAllHotelAccounts(user._id, token)
				.then((data) => {
					if (data.error) {
						toast.error("Failed to fetch hotel accounts");
					} else {
						setHotelOwners(data);
					}
				})
				.catch(() => {
					toast.error("Failed to fetch hotel accounts");
				});
		}
	}, [isModalVisible, user._id, token]);

	// Fetch hotels when a hotel owner is selected
	useEffect(() => {
		if (selectedOwner) {
			hotelsForAccount(selectedOwner)
				.then((data) => {
					if (data.error) {
						toast.error("Failed to fetch hotels for the selected owner");
					} else {
						setHotels(data);
					}
				})
				.catch(() => {
					toast.error("Failed to fetch hotels for the selected owner");
				});
		}
	}, [selectedOwner]);

	// Fetch open support cases and setup socket listeners
	useEffect(() => {
		const fetchSupportCases = () => {
			getFilteredSupportCases(token)
				.then((data) => {
					if (data.error) {
						toast.error("Failed to fetch support cases");
					} else {
						const openCases = data.filter(
							(chat) => chat.caseStatus !== "closed"
						);
						setSupportCases(openCases);

						// Calculate unseen messages by admin
						const unseenMessages = openCases.reduce((acc, supportCase) => {
							return (
								acc +
								supportCase.conversation.filter((msg) => !msg.seenByAdmin)
									.length
							);
						}, 0);
						setUnseenCount(unseenMessages);
					}
				})
				.catch(() => {
					toast.error("Failed to fetch support cases");
				});
		};

		fetchSupportCases();

		// Handle case closed event
		const handleCaseClosed = (closedCase) => {
			setSupportCases((prevCases) =>
				prevCases.filter((c) => c._id !== closedCase.case._id)
			);
			if (selectedCase && selectedCase._id === closedCase.case._id) {
				setSelectedCase(null);
			}
		};

		// Handle new case event
		const handleNewChat = (newCase) => {
			// Only add cases where the openedBy field is 'hotel owner' or 'super admin'
			if (
				newCase.openedBy === "hotel owner" ||
				newCase.openedBy === "super admin"
			) {
				setSupportCases((prevCases) => [...prevCases, newCase]);
			}
		};

		// Handle new message received
		const handleReceiveMessage = (message) => {
			if (message && message.messageBy && message.messageBy.customerName) {
				playNotificationSound(); // Play the notification sound
				fetchSupportCases(); // Refresh support cases list
			}
		};

		// Register socket event listeners
		socket.on("closeCase", handleCaseClosed);
		socket.on("newChat", handleNewChat);
		socket.on("receiveMessage", handleReceiveMessage);

		// Cleanup socket listeners on component unmount
		return () => {
			socket.off("closeCase", handleCaseClosed);
			socket.off("newChat", handleNewChat);
			socket.off("receiveMessage", handleReceiveMessage);
		};
		// eslint-disable-next-line
	}, [token, selectedCase]);

	const handleOwnerSelection = (value) => {
		setSelectedOwner(value);
		setSelectedHotel(null); // Reset hotel selection when a new owner is selected
		setHotels([]); // Clear the hotel list
	};

	const handleHotelSelection = (value) => {
		setSelectedHotel(value);
	};

	const handleOpenModal = () => {
		setIsModalVisible(true);
	};

	const handleCloseModal = () => {
		setIsModalVisible(false);
		setSelectedOwner(null); // Reset selections when the modal is closed
		setSelectedHotel(null);
		setInquiryAbout("");
		setInquiryDetails("");
		setAdminName("Xhotelpro Management");
	};

	const handleSubmit = async () => {
		if (
			!selectedOwner ||
			!selectedHotel ||
			!inquiryAbout ||
			!inquiryDetails ||
			!adminName
		) {
			toast.error("All fields are required");
			return;
		}

		const selectedOwnerData = hotelOwners.find(
			(owner) => owner._id === selectedOwner
		);
		const displayName2 = selectedOwnerData ? selectedOwnerData.name : "";

		setIsLoading(true);

		try {
			const response = await createSupportCase(
				{
					supporterId: user._id,
					ownerId: selectedOwner,
					hotelId: selectedHotel,
					inquiryAbout,
					inquiryDetails,
					supporterName: user.name,
					customerName: adminName,
					role: user.role,
					customerEmail: user.email,
					displayName1: adminName,
					displayName2: displayName2,
				},
				token
			);

			if (response.error) {
				toast.error("Failed to create support case");
			} else {
				toast.success("Support case created successfully");
				handleCloseModal();
				setTimeout(() => {
					window.location.reload(); // Refresh the page after case creation
				}, 1500);
			}
		} catch (error) {
			toast.error("Error creating support case");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCaseSelection = async (selectedCase) => {
		setSelectedCase(selectedCase);

		if (selectedCase) {
			try {
				await markAllMessagesAsSeenByAdmin(selectedCase._id, user._id);
				console.log("Messages marked as seen for case:", selectedCase._id);

				// Re-fetch unseen count
				const result = await getUnseenMessagesCountByAdmin(user._id);
				console.log("Re-fetched unseen count after marking as seen: ", result);
				if (result && result.count !== undefined) {
					setUnseenCount(result.count);
					console.log("Updated unseen count to: ", result.count);
				} else {
					console.error("Failed to re-fetch unseen message count");
				}
			} catch (error) {
				console.error("Error marking messages as seen: ", error);
			}
		}
	};

	return (
		<ActiveHotelSupportCasesWrapper>
			<Button type='primary' onClick={handleOpenModal}>
				Open a New Case
			</Button>

			<Modal
				title='Choose a Hotel Owner'
				visible={isModalVisible}
				onCancel={handleCloseModal}
				footer={null}
			>
				<Form layout='vertical'>
					<Title level={5}>Select Hotel Owner</Title>
					<Form.Item>
						<Select
							placeholder='Select a hotel owner'
							onChange={handleOwnerSelection}
							value={selectedOwner}
						>
							{hotelOwners.map((owner) => (
								<Option key={owner._id} value={owner._id}>
									{owner.name} | {owner.email}
								</Option>
							))}
						</Select>
					</Form.Item>

					{selectedOwner && (
						<Form.Item label='Select Hotel'>
							<Select
								placeholder='Select a hotel'
								onChange={handleHotelSelection}
								value={selectedHotel}
								disabled={!selectedOwner || hotels.length === 0}
							>
								{hotels.map((hotel) => (
									<Option key={hotel._id} value={hotel._id}>
										{hotel.hotelName}
									</Option>
								))}
							</Select>
						</Form.Item>
					)}

					<Form.Item label='Display Name'>
						<Input
							placeholder='Enter your name'
							value={adminName}
							onChange={(e) => setAdminName(e.target.value)}
						/>
					</Form.Item>

					<Form.Item label='Inquiry About'>
						<Input
							placeholder='Enter the subject of the inquiry'
							value={inquiryAbout}
							onChange={(e) => setInquiryAbout(e.target.value)}
						/>
					</Form.Item>

					<Form.Item label='Inquiry Details'>
						<TextArea
							placeholder='Enter the details of the inquiry'
							value={inquiryDetails}
							onChange={(e) => setInquiryDetails(e.target.value)}
							rows={4}
						/>
					</Form.Item>

					<Form.Item>
						<Button
							type='primary'
							onClick={handleSubmit}
							loading={isLoading}
							disabled={
								!selectedOwner ||
								!selectedHotel ||
								!inquiryAbout ||
								!inquiryDetails ||
								!adminName
							}
						>
							Submit
						</Button>
					</Form.Item>
				</Form>
			</Modal>

			<MainContentWrapper>
				<SupportCasesList>
					<List
						style={{ marginTop: "20px" }}
						header={
							<div style={{ fontWeight: "bold", textDecoration: "underline" }}>
								Open Support Cases
								<Badge
									count={unseenCount}
									style={{
										backgroundColor: "#f5222d",
										marginLeft: "10px",
									}}
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
												  ? "#fff1f0" // Light reddish color for unseen messages
												  : "white",
										position: "relative",
									}}
								>
									{item.inquiryAbout} -{" "}
									{item.hotelId
										? item.hotelId.hotelName +
										  " | " +
										  item.conversation[0].inquiryAbout
										: ""}
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
							fetchChats={() => getFilteredSupportCases(token)}
						/>
					</ChatDetailWrapper>
				)}
			</MainContentWrapper>
		</ActiveHotelSupportCasesWrapper>
	);
};

export default ActiveHotelSupportCases;

const ActiveHotelSupportCasesWrapper = styled.div`
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

	.ant-modal {
		.ant-modal-title {
			font-size: 1.5rem;
		}
		.ant-form-item-label > label {
			font-weight: bold;
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
