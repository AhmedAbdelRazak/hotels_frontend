import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useLocation, useHistory } from "react-router-dom"; // For going back
import { isAuthenticated } from "../../auth";
import { updateSupportCase, deleteSpecificMessage } from "../apiAdmin";
import { Input, Select, Button as AntdButton, Upload, Form } from "antd";
import socket from "../../socket";
import EmojiPicker from "emoji-picker-react";
import {
	SmileOutlined,
	UploadOutlined,
	DeleteOutlined,
} from "@ant-design/icons";
import HelperSideDrawer from "./HelperSideDrawer";

const { Option } = Select;

const ChatDetail = ({
	chat,
	isHistory,
	fetchChats,
	selectedCase,
	setSelectedCase,
	setSupportCases,
}) => {
	const { user, token } = isAuthenticated();
	const [messages, setMessages] = useState(chat.conversation);
	const [newMessage, setNewMessage] = useState("");
	const [caseStatus, setCaseStatus] = useState(chat.caseStatus);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [typingStatus, setTypingStatus] = useState("");
	const [fileList, setFileList] = useState([]);
	const [displayName, setDisplayName] = useState(
		chat.displayName1 || chat.supporterName || user.name.split(" ")[0]
	);
	const [drawerVisible, setDrawerVisible] = useState(false);
	const messagesEndRef = useRef(null);

	// For mobile "back" arrow logic
	const history = useHistory();
	const location = useLocation();
	const isMobile = window.innerWidth <= 768;
	const queryParams = new URLSearchParams(location.search);
	const caseIdParam = queryParams.get("id"); // e.g., ?id=someCase

	// Scroll to the bottom function
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		let foundDisplayName = user.name.split(" ")[0];

		// Find the most recent name used by the admin in the chat
		for (let i = chat.conversation.length - 1; i >= 0; i--) {
			if (chat.conversation[i].messageBy.userId === user._id) {
				foundDisplayName = chat.conversation[i].messageBy.customerName;
				break;
			}
		}

		setDisplayName(foundDisplayName);
		setMessages(chat.conversation);
		setCaseStatus(chat.caseStatus);

		// Join the socket room for this chat
		socket.emit("joinRoom", { caseId: chat._id });

		const handleReceiveMessage = (message) => {
			if (message.caseId === chat._id) {
				setMessages((prevMessages) => [...prevMessages, message]);
			}
		};

		const handleMessageDeleted = ({ caseId, messageId }) => {
			if (caseId === chat._id) {
				setMessages((prevMessages) =>
					prevMessages.filter((msg) => msg._id !== messageId)
				);
			}
		};

		socket.on("receiveMessage", handleReceiveMessage);
		socket.on("messageDeleted", handleMessageDeleted);

		// Cleanup listeners and leave room on unmount
		return () => {
			socket.off("receiveMessage", handleReceiveMessage);
			socket.off("messageDeleted", handleMessageDeleted);
			socket.emit("leaveRoom", { caseId: chat._id });
		};
	}, [chat, chat._id, user._id, user.name]);

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
		socket.emit("typing", { name: displayName, caseId: chat._id });
	};

	const handleKeyPress = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const handleInputBlur = () => {
		socket.emit("stopTyping", { name: displayName, caseId: chat._id });
	};

	const handleSendMessage = async () => {
		if (
			["management", "Management"].includes(displayName.toLowerCase()) ||
			!displayName
		) {
			alert("Please change your name before sending a message.");
			return;
		}

		const messageData = {
			messageBy: {
				customerName: displayName,
				customerEmail: user.email,
				userId: user._id,
			},
			message: newMessage,
			date: new Date(),
			caseId: chat._id,
			seenByAdmin: true,
		};

		try {
			await updateSupportCase(chat._id, { conversation: messageData });
			socket.emit("sendMessage", messageData);
			setNewMessage("");
			socket.emit("stopTyping", { name: displayName, caseId: chat._id });
			fetchChats();
		} catch (err) {
			console.error("Error sending message", err);
		}
	};

	const handleChangeStatus = async (value) => {
		try {
			await updateSupportCase(chat._id, { caseStatus: value }, token);
			setCaseStatus(value);
			if (value === "closed") {
				socket.emit("closeCase", { caseId: chat._id });
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

	useEffect(() => {
		const handleTyping = (data) => {
			if (data.caseId === chat._id && data.name !== displayName) {
				setTypingStatus(`${data.name} is typing...`);
			}
		};

		const handleStopTyping = (data) => {
			if (data.caseId === chat._id && data.name !== displayName) {
				setTypingStatus("");
			}
		};

		socket.on("typing", handleTyping);
		socket.on("stopTyping", handleStopTyping);

		return () => {
			socket.off("typing", handleTyping);
			socket.off("stopTyping", handleStopTyping);
		};
	}, [chat._id, displayName]);

	// On mobile + we have a case param => show back arrow
	const handleBackArrow = () => {
		// Remove the `?id=someCaseId` from URL
		const params = new URLSearchParams(location.search);
		params.delete("id");
		history.replace({
			search: params.toString(),
		});
	};

	return (
		<ChatDetailWrapper>
			{/* Mobile back arrow if needed */}
			{isMobile && caseIdParam && (
				<MobileBackArrow onClick={handleBackArrow}>← Back</MobileBackArrow>
			)}

			<h3 className='chat-title'>
				{chat && chat.openedBy === "client" ? (
					<span className='chat-client-title'>
						{chat.hotelId && chat.hotelId._id === "674cf8997e3780f1f838d458" ? (
							<>
								Client ({chat.conversation[0].messageBy.customerName}) Needs
								Support From Jannat Booking
							</>
						) : (
							<>
								Client ({chat.conversation[0].messageBy.customerName}) Needs
								Support Regarding {chat.conversation[0].inquiryAbout} In Hotel{" "}
								<span style={{ fontWeight: "bold" }}>
									{chat &&
										(chat.hotelId.hotelName ||
											chat.conversation[0].messageBy.customerName)}
								</span>{" "}
							</>
						)}
					</span>
				) : (
					<>
						Chat with{" "}
						<span style={{ fontWeight: "bold" }}>
							{chat &&
								(chat.hotelId.hotelName ||
									chat.conversation[0].messageBy.customerName)}
						</span>
					</>
				)}
			</h3>

			<p>
				<strong>Inquiry About:</strong> {chat.conversation[0].inquiryAbout}
			</p>
			<p>
				<strong>Details:</strong> {chat.conversation[0].inquiryDetails}
			</p>

			{!isHistory && (
				<StatusSelect value={caseStatus} onChange={handleChangeStatus}>
					<Option value='open'>Open</Option>
					<Option value='closed'>Closed</Option>
				</StatusSelect>
			)}

			<div className='mx-auto text-center my-3'>
				<AntdButton type='primary' onClick={showDrawer}>
					Reserve A Room
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

			{caseStatus === "open" && (
				<Form layout='vertical'>
					<Form.Item label='Custom Display Name'>
						<Input
							value={displayName}
							onChange={handleDisplayNameChange}
							placeholder='Enter a custom display name'
						/>
					</Form.Item>
				</Form>
			)}

			<ChatMessages>
				{messages.map((msg, index) => (
					<Message
						key={index}
						isAdminMessage={msg.messageBy.userId === user._id}
					>
						<strong>{msg.messageBy.customerName}:</strong> {msg.message}
						<div>
							<small>{new Date(msg.date).toLocaleString()}</small>
							{msg.messageBy.userId === user._id && (
								<DeleteOutlined
									style={{
										color: "red",
										cursor: "pointer",
										marginLeft: "10px",
									}}
									onClick={() => handleDeleteMessage(msg._id)}
								/>
							)}
						</div>
					</Message>
				))}
				{typingStatus && <TypingStatus>{typingStatus}</TypingStatus>}
				<div ref={messagesEndRef} />
			</ChatMessages>

			{caseStatus === "open" && (
				<ChatInputContainer>
					<Input.TextArea
						placeholder='Type your message...'
						value={newMessage}
						onChange={handleInputChange}
						onKeyDown={handleKeyPress}
						onBlur={handleInputBlur}
						autoSize={{ minRows: 1, maxRows: 6 }}
					/>
					<SmileOutlined onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
					{showEmojiPicker && (
						<EmojiPickerWrapper>
							<EmojiPicker onEmojiClick={onEmojiClick} />
						</EmojiPickerWrapper>
					)}
					<Upload
						fileList={fileList}
						onChange={handleFileChange}
						beforeUpload={() => false}
					>
						<AntdButton icon={<UploadOutlined />} />
					</Upload>
					<SendButton type='primary' onClick={handleSendMessage}>
						Send
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

	.chat-title {
		text-transform: capitalize;
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

	@media (max-width: 768px) {
		padding: 8px;
		margin-bottom: 6px;
		font-size: 0.9rem;
	}
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

	@media (max-width: 768px) {
		font-size: 0.85rem;
		margin-top: 6px;
	}
`;
