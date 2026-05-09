import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Button, Modal, Form, Input, List, Badge } from "antd";
import {
	createSupportCase,
	updateSupportCase,
} from "../../AdminModule/apiAdmin";
import { isAuthenticated } from "../../auth";
import { toast } from "react-toastify";
import ChatDetailHotels from "./ChatDetailHotels";
import socket from "../../socket";
import {
	getFilteredSupportCases,
	getUnseenMessagesByHotelOwner,
	markAllMessagesAsSeenByHotel,
} from "../apiAdmin";
import StarRatings from "react-star-ratings";
import { SUPER_ADMIN_ID } from "../../AdminModule/utils/superUsers";

const { TextArea } = Input;

const ActiveHotelSupportCasesHotels = () => {
	const { user, token } = isAuthenticated();
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedHotel, setSelectedHotel] = useState(null);
	const [inquiryAbout, setInquiryAbout] = useState("");
	const [inquiryDetails, setInquiryDetails] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [supportCases, setSupportCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);
	const [isRatingVisible, setIsRatingVisible] = useState(false); // Modal visibility for rating
	const [rating, setRating] = useState(0); // Rating state
	// eslint-disable-next-line
	const [unseenCount, setUnseenCount] = useState(0); // Unseen messages count

	// Load selectedHotel from local storage on mount
	useEffect(() => {
		const storedHotel = localStorage.getItem("selectedHotel");
		if (storedHotel) {
			const parsedHotel = JSON.parse(storedHotel);
			setSelectedHotel(parsedHotel._id); // Set the hotel ID directly
		}
	}, []);

	// Fetch unseen messages count and support cases
	useEffect(() => {
		const fetchUnseenCount = async () => {
			if (selectedHotel) {
				try {
					const result = await getUnseenMessagesByHotelOwner(selectedHotel); // Use selectedHotel directly
					if (result && result.count !== undefined) {
						setUnseenCount(result.count);
					} else {
						setUnseenCount(0);
					}
				} catch (error) {
					console.error("Error fetching unseen messages count:", error);
				}
			}
		};

		const fetchSupportCases = () => {
			if (selectedHotel) {
				getFilteredSupportCases(token, selectedHotel)
					.then((data) => {
						if (data.error) {
							toast.error("Failed to fetch support cases");
						} else {
							setSupportCases(
								data.filter((chat) => chat.caseStatus !== "closed")
							);
						}
					})
					.catch(() => {
						toast.error("Failed to fetch support cases");
					});
			}
		};

		fetchUnseenCount();
		fetchSupportCases();

		// Socket listeners for real-time updates
		const handleCaseClosed = (closedCase) => {
			setSelectedCase(closedCase.case);
			setIsRatingVisible(true); // Show rating modal
		};

		const handleNewChat = (newCase) => {
			setSupportCases((prevCases) => [...prevCases, newCase]);
		};

		const handleReceiveMessage = (message) => {
			if (message && message.messageBy && message.messageBy.customerName) {
				fetchSupportCases(); // Refresh support cases list
			}
		};

		socket.on("closeCase", handleCaseClosed);
		socket.on("newChat", handleNewChat);
		socket.on("receiveMessage", handleReceiveMessage);

		// Cleanup socket listeners on component unmount
		return () => {
			socket.off("closeCase", handleCaseClosed);
			socket.off("newChat", handleNewChat);
			socket.off("receiveMessage", handleReceiveMessage);
		};
	}, [token, selectedCase, selectedHotel]);

	const handleOpenModal = () => {
		setIsModalVisible(true);
	};

	const handleCloseModal = () => {
		setIsModalVisible(false);
		setSelectedHotel(null); // Reset selections when the modal is closed
		setInquiryAbout("");
		setInquiryDetails("");
	};

	const handleSubmit = async () => {
		if (!selectedHotel || !inquiryAbout || !inquiryDetails || !user.name) {
			toast.error("All fields are required");
			return;
		}

		setIsLoading(true);

		try {
			const response = await createSupportCase(
				{
					supporterId: SUPER_ADMIN_ID,
					ownerId: user._id,
					hotelId: selectedHotel,
					inquiryAbout,
					inquiryDetails,
					supporterName: "XhotelPro Admin", // Hardcoded Super Admin name
					customerName: user.name, // Use the user's name for the customer
					role: user.role,
					customerEmail: user.email,
					displayName1: user.name,
					displayName2: "XhotelPro Admin",
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
		try {
			await markAllMessagesAsSeenByHotel(selectedCase._id, user._id); // Adjust this to mark messages as seen for hotel owner/admin
			const result = await getUnseenMessagesByHotelOwner(selectedHotel);
			if (result && result.count !== undefined) {
				setUnseenCount(result.count);
			} else {
				setUnseenCount(0);
			}
		} catch (error) {
			console.error("Error marking messages as seen:", error);
		}
	};

	const handleRateService = async () => {
		if (selectedCase) {
			try {
				await updateSupportCase(selectedCase._id, {
					rating: rating,
					caseStatus: "closed",
				});
				setIsRatingVisible(false); // Close the modal after rating
				setSupportCases((prevCases) =>
					prevCases.filter((c) => c._id !== selectedCase._id)
				); // Remove the rated case from the list
				setSelectedCase(null); // Reset the selected case
			} catch (err) {
				console.error("Error rating support case", err);
			}
		}
	};

	const handleSkipRating = async () => {
		if (selectedCase) {
			try {
				await updateSupportCase(selectedCase._id, {
					caseStatus: "closed",
				});
				setIsRatingVisible(false); // Close the modal without rating
				setSupportCases((prevCases) =>
					prevCases.filter((c) => c._id !== selectedCase._id)
				); // Remove the skipped case from the list
				setSelectedCase(null); // Reset the selected case
			} catch (err) {
				console.error("Error closing support case", err);
			}
		}
	};

	return (
		<ActiveHotelSupportCasesHotelsWrapper>
			<Button type='primary' onClick={handleOpenModal}>
				Open a New Case
			</Button>

			<Modal
				title='Create a New Support Case'
				open={isModalVisible}
				onCancel={handleCloseModal}
				footer={null}
			>
				<Form layout='vertical'>
					<Form.Item label='Display Name'>
						<Input placeholder='Enter your name' value={user.name} disabled />
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
							disabled={!selectedHotel || !inquiryAbout || !inquiryDetails}
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
								{/* <Badge
									count={unseenCount}
									style={{
										backgroundColor: "#f5222d",
										marginLeft: "10px",
									}}
								/> */}
							</div>
						}
						bordered
						dataSource={supportCases}
						renderItem={(item) => {
							const hasUnseenMessages = item.conversation.some(
								(msg) => !msg.seenByHotel
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
									{item.inquiryAbout} -{" "}
									{item.hotelId
										? item.hotelId.hotelName +
										  " | " +
										  item.conversation[0].inquiryAbout
										: ""}
									{hasUnseenMessages && (
										<Badge
											count={
												item.conversation.filter((msg) => !msg.seenByHotel)
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
						<ChatDetailHotels
							chat={selectedCase}
							fetchChats={() => getFilteredSupportCases(token)}
						/>
					</ChatDetailWrapper>
				)}

				{/* Rating Modal */}
				<Modal
					title='Rate Our Service'
					visible={isRatingVisible}
					onCancel={handleSkipRating}
					footer={null}
				>
					<RatingSection>
						<StarRatings
							rating={rating}
							starRatedColor='var(--secondary-color)'
							changeRating={setRating}
							numberOfStars={5}
							name='rating'
							starDimension='30px'
							starSpacing='5px'
						/>
						<RatingButtons>
							<Button type='primary' onClick={handleRateService}>
								Submit Rating
							</Button>
							<Button onClick={handleSkipRating}>Skip</Button>
						</RatingButtons>
					</RatingSection>
				</Modal>
			</MainContentWrapper>
		</ActiveHotelSupportCasesHotelsWrapper>
	);
};

export default ActiveHotelSupportCasesHotels;

const ActiveHotelSupportCasesHotelsWrapper = styled.div`
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

const RatingSection = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20px;
`;

const RatingButtons = styled.div`
	display: flex;
	gap: 10px;
	margin-top: 20px;
`;
