import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { updateSupportCase } from "../../AdminModule/apiAdmin";
import { Input, Select, Button as AntdButton, Upload, Form } from "antd";
import socket from "../../socket";
import EmojiPicker from "emoji-picker-react";
import { SmileOutlined, UploadOutlined } from "@ant-design/icons";

const { Option } = Select;
const isMobileKeyboardViewport = () =>
	typeof window !== "undefined" &&
	(window.innerWidth <= 768 ||
		window.matchMedia?.("(pointer: coarse)")?.matches);

const ChatDetailHotels = ({ chat, isHistory, fetchChats }) => {
	const { user, token } = isAuthenticated();
	const [messages, setMessages] = useState(chat.conversation);
	const [newMessage, setNewMessage] = useState("");
	const [caseStatus, setCaseStatus] = useState(chat.caseStatus);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [fileList, setFileList] = useState([]);
	const [typingStatus, setTypingStatus] = useState("");
	const [displayName, setDisplayName] = useState(
		chat.displayName1 || chat.supporterName || user.name
	);

	useEffect(() => {
		let foundDisplayName = user.name;

		// Iterate through the conversation array in reverse to find the last message sent by the current user
		for (let i = chat.conversation.length - 1; i >= 0; i--) {
			if (chat.conversation[i].messageBy.userId === user._id) {
				foundDisplayName = chat.conversation[i].messageBy.customerName;
				break;
			}
		}

		setDisplayName(foundDisplayName);
		setMessages(chat.conversation);
		setCaseStatus(chat.caseStatus);

		socket.on("receiveMessage", (message) => {
			if (message.caseId === chat._id) {
				setMessages((prevMessages) => [...prevMessages, message]);
			}
		});

		return () => {
			socket.off("receiveMessage");
		};
	}, [chat, user._id, user.name]);

	const handleInputChange = (e) => {
		setNewMessage(e.target.value);
		socket.emit("typing", { name: displayName, caseId: chat._id });
	};

	const handleInputBlur = () => {
		socket.emit("stopTyping", { name: displayName, caseId: chat._id });
	};

	const handleKeyPress = (e) => {
		if (
			e.key === "Enter" &&
			!e.shiftKey &&
			!e.nativeEvent?.isComposing &&
			!isMobileKeyboardViewport()
		) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const handleSendMessage = async () => {
		const messageData = {
			messageBy: {
				customerName: displayName,
				customerEmail: user.email,
				userId: user._id,
			},
			message: newMessage,
			date: new Date(),
			caseId: chat._id,
			seenByHotel: true,
		};

		try {
			await updateSupportCase(chat._id, { conversation: messageData });
			socket.emit("sendMessage", messageData);
			setNewMessage("");
			socket.emit("stopTyping", { name: displayName, caseId: chat._id });
			fetchChats(); // Update the parent component's chat list
		} catch (err) {
			console.error("Error sending message", err);
		}
	};

	const handleChangeStatus = async (value) => {
		try {
			await updateSupportCase(chat._id, { caseStatus: value }, token);
			setCaseStatus(value);
			if (value === "closed") {
				socket.emit("closeCase", chat._id); // Emit only the case ID
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

	const quickRepliesForMessage = (msg = {}) =>
		Array.isArray(msg.quickReplies)
			? msg.quickReplies
					.map((reply) => String(reply?.label || "").trim())
					.filter(Boolean)
					.slice(0, 4)
			: [];

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

	return (
		<ChatDetailHotelsWrapper dir='ltr'>
			<h3 style={{ textTransform: "capitalize" }}>
				Chat with{" "}
				<span style={{ fontWeight: "bold" }}>
					{" "}
					{chat &&
						(chat.hotelId.hotelName ||
							chat.conversation[0].messageBy.customerName)}
				</span>{" "}
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
			{!isHistory && caseStatus === "open" && (
				<>
					<Form layout='vertical'>
						<Form.Item label='Display Name'>
							<Input
								value={displayName}
								onChange={handleDisplayNameChange}
								placeholder='Enter a custom display name'
								disabled
							/>
						</Form.Item>
					</Form>
				</>
			)}
			<ChatMessages>
				{messages.map((msg, index) => {
					const quickReplies = quickRepliesForMessage(msg);
					return (
					<Message key={index}>
						<MessageSender>{msg.messageBy.customerName}:</MessageSender>
						<MessageBody>{msg.message}</MessageBody>
						{quickReplies.length > 0 && (
							<QuickReplyPreview>
								{quickReplies.map((label) => (
									<QuickReplyChip key={label} type='button' disabled>
										{label}
									</QuickReplyChip>
								))}
							</QuickReplyPreview>
						)}
						<div>
							<small>{new Date(msg.date).toLocaleString()}</small>
						</div>
					</Message>
					);
				})}
				{typingStatus && <TypingStatus>{typingStatus}</TypingStatus>}
			</ChatMessages>
			{!isHistory && caseStatus === "open" && (
				<ChatInputContainer>
					<Input.TextArea
						placeholder='Type your message...'
						value={newMessage}
						onChange={handleInputChange}
						onBlur={handleInputBlur}
						onKeyDown={handleKeyPress}
						autoSize={{ minRows: 1, maxRows: 5 }}
						enterKeyHint={isMobileKeyboardViewport() ? "enter" : "send"}
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
		</ChatDetailHotelsWrapper>
	);
};

export default ChatDetailHotels;

const ChatDetailHotelsWrapper = styled.div`
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	padding: 20px;
	background-color: var(--background-light);
	border-radius: 8px;
	box-shadow: var(--box-shadow-dark);
`;

const ChatMessages = styled.div`
	flex: 1;
	overflow-y: auto;
	margin-bottom: 20px;
`;

const Message = styled.div`
	padding: 10px;
	border: 1px solid var(--border-color-dark);
	border-radius: 8px;
	background-color: var(--background-light);
	margin-bottom: 10px;
`;

const MessageSender = styled.strong`
	display: block;
	margin-bottom: 4px;
	font-weight: 900;
	line-height: 1.35;
`;

const MessageBody = styled.div`
	display: block;
	line-height: 1.55;
	white-space: pre-wrap;
	word-break: break-word;
	overflow-wrap: anywhere;
`;

const QuickReplyPreview = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
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
	white-space: normal;
	overflow-wrap: anywhere;
	cursor: default;
	opacity: 1;
`;

const StatusSelect = styled(Select)`
	width: 150px;
	margin-bottom: 20px;
`;

const ChatInputContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 5px;

	input,
	textarea {
		flex-grow: 1;
	}

	button {
		width: auto;
	}
`;

const EmojiPickerWrapper = styled.div`
	position: absolute;
	bottom: 60px;
	right: 20px;
	z-index: 1002;
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
`;

const TypingStatus = styled.div`
	font-style: italic;
	color: gray;
	margin-top: 10px;
`;
