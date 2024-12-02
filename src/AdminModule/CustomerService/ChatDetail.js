import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { updateSupportCase } from "../apiAdmin";
import { Input, Select, Button as AntdButton, Upload, Form } from "antd";
import socket from "../../socket";
import EmojiPicker from "emoji-picker-react";
import { SmileOutlined, UploadOutlined } from "@ant-design/icons";
import HelperSideDrawer from "./HelperSideDrawer";

const { Option } = Select;

const ChatDetail = ({ chat, isHistory, fetchChats }) => {
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

	useEffect(() => {
		let foundDisplayName = user.name.split(" ")[0];

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

	return (
		<ChatDetailWrapper>
			<h3 style={{ textTransform: "capitalize" }}>
				{chat && chat.openedBy === "client" ? (
					<span style={{ fontSize: "20px" }}>
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
						</span>{" "}
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

			{chat &&
				chat.openedBy === "client" &&
				chat.conversation[0].inquiryAbout === "reserve_room" && (
					<>
						<div className='mx-auto text-center'>
							<AntdButton type='primary' onClick={showDrawer}>
								Reserve A Room
							</AntdButton>
						</div>
						<HelperSideDrawer
							chat={chat}
							onClose={closeDrawer}
							visible={drawerVisible}
						/>
					</>
				)}
			{caseStatus === "open" && (
				<>
					<Form layout='vertical'>
						<Form.Item label='Custom Display Name'>
							<Input
								value={displayName}
								onChange={handleDisplayNameChange}
								placeholder='Enter a custom display name'
							/>
						</Form.Item>
					</Form>
				</>
			)}
			<ChatMessages>
				{messages.map((msg, index) => (
					<Message key={index}>
						<strong>{msg.messageBy.customerName}:</strong> {msg.message}
						<div>
							<small>{new Date(msg.date).toLocaleString()}</small>
						</div>
					</Message>
				))}
				{typingStatus && <TypingStatus>{typingStatus}</TypingStatus>}
			</ChatMessages>
			{caseStatus === "open" && (
				<ChatInputContainer>
					<Input
						placeholder='Type your message...'
						value={newMessage}
						onChange={handleInputChange}
						onBlur={handleInputBlur}
						onPressEnter={handleSendMessage}
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

const ChatDetailWrapper = styled.div`
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

const StatusSelect = styled(Select)`
	width: 150px;
	margin-bottom: 20px;
`;

const ChatInputContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 5px;

	input {
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
