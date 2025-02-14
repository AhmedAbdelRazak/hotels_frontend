import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Menu, Dropdown, Modal, Form, Input, message } from "antd";
import {
	UserOutlined,
	LogoutOutlined,
	MailOutlined,
	BellOutlined,
	MessageOutlined,
	SettingOutlined,
	GlobalOutlined,
	CalendarOutlined,
	LockOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useCartContext } from "../../cart_context";
import DigitalClock from "./DigitalClock";
import { isAuthenticated, signout } from "../../auth";
import { useLocation, useHistory } from "react-router-dom";

const TopNavbar = ({ collapsed, roomCountDetails }) => {
	const [dropdownVisible, setDropdownVisible] = useState(false);
	const { languageToggle, chosenLanguage } = useCartContext();
	const [hotelName, setHotelName] = useState("");
	const [roomTypesDropdown, setRoomTypesDropdown] = useState(false);

	// Modal state
	const [updateModalVisible, setUpdateModalVisible] = useState(false);

	// Form instance from AntD
	const [form] = Form.useForm();

	const location = useLocation();
	const history = useHistory();

	// Extract user & token
	const { user, token } = isAuthenticated();

	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};
	const hotelId = selectedHotel._id;

	// If user.role === 2000 => user._id; otherwise => selectedHotel.belongsTo
	const userId =
		user.role === 2000
			? user._id
			: selectedHotel.belongsTo?._id || selectedHotel.belongsTo;

	// userDetails (name, email) from either user or selectedHotel.belongsTo
	const userDetails = user.role === 2000 ? user : selectedHotel.belongsTo;

	// Display the hotel name if path has userId & hotelId
	useEffect(() => {
		const pathContainsUserIdAndHotelId =
			location.pathname.includes(userId) && location.pathname.includes(hotelId);
		if (pathContainsUserIdAndHotelId) {
			setHotelName(selectedHotel.hotelName);
		} else {
			setHotelName("");
		}
	}, [location, selectedHotel.hotelName, hotelId, userId]);

	// -- Handle Signout
	const handleSignout = () => {
		signout(() => {
			history.push("/");
		});
	};

	// -- Profile Dropdown Menu Click
	const handleMenuClick = ({ key }) => {
		if (key === "profile" && user.role === 2000) {
			history.push("/hotel-management/main-dashboard");
		} else if (key === "profile" && user.role === 1000) {
			history.push("/admin/dashboard");
		} else if (key === "logout") {
			handleSignout();
		} else if (key === "update") {
			handleOpenUpdateAccountModal();
		}
		setDropdownVisible(false);
	};

	const menu = (
		<Menu onClick={handleMenuClick}>
			<Menu.Item key='profile' icon={<UserOutlined />}>
				Profile
			</Menu.Item>
			<Menu.Item key='inbox' icon={<MailOutlined />}>
				Inbox
			</Menu.Item>
			<Menu.Item key='update' icon={<UserOutlined />}>
				Update Account
			</Menu.Item>
			<Menu.Item key='logout' icon={<LogoutOutlined />}>
				Logout
			</Menu.Item>
		</Menu>
	);

	// -- Room Types Dropdown
	const handleRoomClick = ({ key }) => {
		setRoomTypesDropdown(false);
		window.location.href = `/hotel-management/settings/${userId}/${hotelId}?activeTab=roomcount&currentStep=3&selectedRoomType=${key}`;
	};

	const menuRoomTypes = (
		<Menu onClick={handleRoomClick}>
			{roomCountDetails && roomCountDetails.length > 0 ? (
				roomCountDetails.map((room) => (
					<Menu.Item key={room._id}>{room.displayName}</Menu.Item>
				))
			) : (
				<Menu.Item disabled>No rooms available</Menu.Item>
			)}
		</Menu>
	);

	// -- Settings Icon Click
	const handleSettingsClick = () => {
		const selectedHotelLocal =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userIdLocal = user._id;
		const hotelIdLocal = selectedHotelLocal._id;

		const pathContainsUserIdAndHotelId =
			location.pathname.includes(userIdLocal) &&
			location.pathname.includes(hotelIdLocal);

		if (pathContainsUserIdAndHotelId) {
			window.location.href = `/hotel-management/settings/${userIdLocal}/${hotelIdLocal}`;
		}
	};

	// -- Chat Icon Click
	const handleChatClick = () => {
		const selectedHotelLocal =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userIdLocal = user._id;
		const hotelIdLocal = selectedHotelLocal._id;

		const pathContainsUserIdAndHotelId =
			location.pathname.includes(userIdLocal) &&
			location.pathname.includes(hotelIdLocal);

		if (pathContainsUserIdAndHotelId) {
			window.location.href = `/hotel-management/customer-service/${userIdLocal}/${hotelIdLocal}`;
		}
	};

	// -- Open Modal & Prefill Data
	const handleOpenUpdateAccountModal = () => {
		// Determine name/email from userDetails or user
		const nameToUse =
			userDetails && typeof userDetails === "object"
				? userDetails.name || ""
				: user.name || "";

		const emailToUse =
			userDetails && typeof userDetails === "object"
				? userDetails.email || ""
				: user.email || "";

		// Set initial form values
		form.setFieldsValue({
			name: nameToUse,
			email: emailToUse,
			password: "",
			password2: "",
		});

		setUpdateModalVisible(true);
	};

	// -- Close Modal
	const handleCancelUpdateAccount = () => {
		setUpdateModalVisible(false);
	};

	// -- onFinish Handler for Form
	const handleUpdateAccount = async (values) => {
		try {
			const { name, email, password, password2 } = values;

			// Check password match
			if (password !== password2) {
				message.error("Passwords do not match!");
				return;
			}

			const payload = { name, email, password, userId };

			// Construct URL based on role
			let url = "";
			if (user.role === 2000) {
				// normal user => /user/:userId
				url = `${process.env.REACT_APP_API_URL}/user/${user._id}`;
			} else {
				// admin => /user/:updatedUserId/:userId
				const updatedUserId =
					userDetails && userDetails._id ? userDetails._id : userDetails;
				url = `${process.env.REACT_APP_API_URL}/user/${updatedUserId}/${user._id}`;
			}

			const config = {
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			};

			// Make the PUT request (no unused variable)
			await axios.put(url, payload, config);

			message.success("User updated successfully!");
			setUpdateModalVisible(false);
			// Optionally refresh or update localStorage if needed
		} catch (error) {
			console.error("Error updating user:", error);
			message.error(
				error?.response?.data?.error || "Something went wrong updating user"
			);
		}
	};

	return (
		<NavbarWrapper isArabic={chosenLanguage === "Arabic"}>
			<LeftSection>
				<Logo show={collapsed} isArabic2={chosenLanguage === "Arabic"}>
					<img
						src='https://res.cloudinary.com/infiniteapps/image/upload/v1732323307/janat/1732323307087.png'
						alt='jannatbooking'
						style={{ width: "200px" }}
					/>
				</Logo>
				<DigitalClockWrapper>
					<DigitalClock />
				</DigitalClockWrapper>
			</LeftSection>

			<MiddleSection>
				{hotelName && <HotelName>{hotelName}</HotelName>}
			</MiddleSection>

			<RightSection>
				<Icons>
					<IconWrapper
						style={{ width: "25%" }}
						onClick={() =>
							languageToggle(
								chosenLanguage === "English" ? "Arabic" : "English"
							)
						}
					>
						<GlobalOutlined className='mx-2' />
						<LanguageText>
							{chosenLanguage === "English" ? "عربي" : "En"}
						</LanguageText>
					</IconWrapper>

					<IconWrapper onClick={handleSettingsClick}>
						<SettingOutlined />
					</IconWrapper>

					<IconWrapper style={{ width: "25%" }}>
						<Dropdown
							overlay={menuRoomTypes}
							trigger={["click"]}
							open={roomTypesDropdown}
							onOpenChange={(flag) => setRoomTypesDropdown(flag)}
						>
							<div style={{ display: "flex", alignItems: "center" }}>
								<CalendarOutlined
									className='mx-2'
									style={{ color: "#eecccc" }}
								/>
								<LanguageText2>Calendar</LanguageText2>
							</div>
						</Dropdown>
					</IconWrapper>

					<IconWrapper
						className='w-25'
						style={{ color: "white", fontWeight: "bold" }}
					>
						شُموس
						<NotificationDot2 />
					</IconWrapper>

					<IconWrapper>
						<BellOutlined />
						<NotificationDot />
					</IconWrapper>

					<IconWrapper onClick={handleChatClick}>
						<MessageOutlined />
						<NotificationDot />
					</IconWrapper>
				</Icons>

				<ProfileMenu>
					<Dropdown
						overlay={menu}
						trigger={["click"]}
						visible={dropdownVisible}
						onVisibleChange={(flag) => setDropdownVisible(flag)}
					>
						<Profile>
							<UserOutlined
								style={{
									fontSize: "30px",
									color: "#fff",
									marginRight: "10px",
								}}
							/>
							<div>
								<span>Hi {user.name?.split(" ")[0]}</span>
								<small>Superadmin</small>
							</div>
						</Profile>
					</Dropdown>
				</ProfileMenu>
			</RightSection>

			{/* ===== MODAL FOR UPDATING ACCOUNT ===== */}
			<Modal
				title='Update Account'
				visible={updateModalVisible}
				// Instead of onOk={handleUpdateAccount}, we trigger form submit:
				onOk={() => form.submit()}
				onCancel={handleCancelUpdateAccount}
				okText='Update'
				cancelText='Cancel'
			>
				<Form
					layout='vertical'
					form={form}
					onFinish={handleUpdateAccount}
					// We'll explicitly set initialValues too, though we set them in handleOpenUpdateAccountModal
					initialValues={{
						name: "",
						email: "",
						password: "",
						password2: "",
					}}
				>
					<Form.Item
						name='name'
						label='User Name (Manager/ Owner/ Agent)'
						rules={[{ required: true, message: "Please enter your name" }]}
					>
						<Input prefix={<UserOutlined />} placeholder='Full Name' />
					</Form.Item>

					<Form.Item
						name='email'
						label='Email Address'
						rules={[{ required: true, message: "Please enter your email" }]}
					>
						<Input prefix={<MailOutlined />} placeholder='Email' />
					</Form.Item>

					<Form.Item
						name='password'
						label='Password'
						rules={[{ required: true, message: "Please enter a password" }]}
					>
						<Input.Password prefix={<LockOutlined />} placeholder='Password' />
					</Form.Item>

					<Form.Item
						name='password2'
						label='Confirm Password'
						dependencies={["password"]}
						rules={[
							{ required: true, message: "Please confirm your password" },
							// Or add direct field validation with antd:
							// ({ getFieldValue }) => ({
							//   validator(_, value) {
							//     if (!value || getFieldValue('password') === value) {
							//       return Promise.resolve();
							//     }
							//     return Promise.reject(new Error('Passwords do not match!'));
							//   },
							// }),
						]}
					>
						<Input.Password
							prefix={<LockOutlined />}
							placeholder='Confirm Password'
						/>
					</Form.Item>
				</Form>
			</Modal>
		</NavbarWrapper>
	);
};

export default TopNavbar;

// ======================== Styled Components ======================== //

const NavbarWrapper = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 70px;
	background-color: #1e1e2d;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 20px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	z-index: 1000;
	direction: ${(props) => (props.isArabic ? "rtl" : "")} !important;
`;

const LeftSection = styled.div`
	display: flex;
	align-items: center;
`;

const Logo = styled.div`
	display: flex;
	align-items: center;
	margin-right: ${(props) =>
		props.show && props.isArabic2 ? "50px" : ""} !important;

	img {
		width: 100% !important;
		margin: auto 20px;
	}
`;

const DigitalClockWrapper = styled.div`
	margin-left: 20px;
`;

const MiddleSection = styled.div`
	flex: 1;
	text-align: center;
	text-transform: capitalize;
`;

const HotelName = styled.span`
	font-weight: bold;
	color: white;
	font-size: 24px;
`;

const RightSection = styled.div`
	display: flex;
	align-items: center;
`;

const Icons = styled.div`
	display: flex;
	align-items: center;
	margin-left: ${(props) => (props.isArabic ? "40px" : "40px")} !important;
	margin-right: ${(props) => (props.isArabic ? "" : "40px")} !important;

	svg {
		font-size: 23px; /* Icon font size */
		color: #fff;
		cursor: pointer;
	}
`;

const IconWrapper = styled.div`
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	background-color: #161621;
	border-radius: 5px;
	margin-left: ${(props) => (props.isArabic ? "20px" : "")} !important;
	margin-right: ${(props) => (props.isArabic ? "" : "20px")} !important;
	cursor: pointer;
`;

const LanguageText = styled.span`
	color: #fff;
	margin-left: 5px;
	font-size: 15px;
	font-weight: bolder;
`;

const LanguageText2 = styled.span`
	color: #eecccc;
	margin-left: 5px;
	font-size: 15px;
	font-weight: bolder;
`;

const NotificationDot = styled.div`
	position: absolute;
	top: 5px;
	right: 5px;
	width: 8px;
	height: 8px;
	background-color: orange;
	border-radius: 50%;
`;

const NotificationDot2 = styled.div`
	position: absolute;
	top: 3px;
	right: 1px;
	width: 8px;
	height: 8px;
	background-color: lightgreen;
	border-radius: 50%;
	animation: blink 3.5s infinite;

	@keyframes blink {
		0%,
		50%,
		100% {
			opacity: 1;
		}
		25%,
		75% {
			opacity: 0;
		}
	}
`;

const ProfileMenu = styled.div`
	display: flex;
	align-items: center;
`;

const Profile = styled.div`
	display: flex;
	align-items: center;
	cursor: pointer;

	.anticon-user {
		margin-right: ${(props) => (props.isArabic ? "20px" : "10px")} !important;
	}

	span {
		font-weight: bold;
		color: #fff;
		margin-left: ${(props) => (props.isArabic ? "20px" : "10px")} !important;
	}
	small {
		display: block;
		color: #bbb;
		font-size: 12px;
	}
`;
