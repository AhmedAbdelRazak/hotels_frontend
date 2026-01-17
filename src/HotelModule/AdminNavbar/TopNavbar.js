/** @format */

import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { Menu, Dropdown } from "antd";
import {
	UserOutlined,
	LogoutOutlined,
	MailOutlined,
	BellOutlined,
	MessageOutlined,
	SettingOutlined,
	GlobalOutlined,
	CalendarOutlined,
} from "@ant-design/icons";
import { useCartContext } from "../../cart_context";
import DigitalClock from "./DigitalClock";
import { isAuthenticated, signout } from "../../auth";
import { useLocation, useHistory } from "react-router-dom";
import UpdateAccountModal from "./UpdateAccountModal"; // <-- NEW

const TopNavbar = ({ collapsed, roomCountDetails }) => {
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const [roomTypesDropdown, setRoomTypesDropdown] = useState(false);
	const [accountModalOpen, setAccountModalOpen] = useState(false);

	const { languageToggle, chosenLanguage } = useCartContext();

	const [hotelName, setHotelName] = useState("");

	const location = useLocation();
	const history = useHistory();

	const { user, token } = isAuthenticated();

	// Selected hotel context
	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};
	const hotelId = selectedHotel._id;

	const userId =
		user.role === 2000
			? user._id
			: selectedHotel.belongsTo?._id || selectedHotel.belongsTo;

	// eslint-disable-next-line
	const userDetails = user.role === 2000 ? user : selectedHotel.belongsTo;

	// Detect whether path contains both ids to show hotel name
	useEffect(() => {
		const show =
			userId &&
			hotelId &&
			location.pathname.includes(userId) &&
			location.pathname.includes(hotelId);
		setHotelName(show ? selectedHotel.hotelName : "");
	}, [location, selectedHotel.hotelName, hotelId, userId]);

	/* ===== actions ===== */

	const handleSignout = () => {
		signout(() => history.push("/"));
	};

	const openSelfUpdateModal = () => {
		// For non-admin users only; admin keeps redirect behavior
		if (user.role === 1000) return;
		setAccountModalOpen(true);
	};

	const handleMenuClick = ({ key }) => {
		switch (key) {
			case "profile":
				if (user.role === 1000) {
					history.push("/admin/dashboard"); // admin redirect (as-is)
				} else {
					openSelfUpdateModal(); // non-admin modal
				}
				break;
			case "inbox":
				// keep as-is or route where you want
				break;
			case "update":
				if (user.role !== 1000) openSelfUpdateModal();
				break;
			case "logout":
				handleSignout();
				break;
			default:
				break;
		}
		setProfileMenuOpen(false);
	};

	// Build profile dropdown menu (hide "Update Account" for admin)
	const profileMenu = (
		<Menu onClick={handleMenuClick}>
			<Menu.Item key='profile' icon={<UserOutlined />}>
				Profile
			</Menu.Item>
			<Menu.Item key='inbox' icon={<MailOutlined />}>
				Inbox
			</Menu.Item>
			{user.role !== 1000 && (
				<Menu.Item key='update' icon={<UserOutlined />}>
					Update Account
				</Menu.Item>
			)}
			<Menu.Item key='logout' icon={<LogoutOutlined />}>
				Logout
			</Menu.Item>
		</Menu>
	);

	// Room types dropdown
	const handleRoomClick = ({ key }) => {
		setRoomTypesDropdown(false);
		window.location.href = `/hotel-management/settings/${userId}/${hotelId}?activeTab=roomcount&currentStep=3&selectedRoomType=${key}`;
	};

	const menuRoomTypes = (
		<Menu onClick={handleRoomClick}>
			{roomCountDetails && roomCountDetails.length > 0 ? (
				roomCountDetails.map((room, index) => {
					const key =
						room?._id ||
						room?.roomType ||
						room?.displayName ||
						String(index);
					return <Menu.Item key={key}>{room.displayName}</Menu.Item>;
				})
			) : (
				<Menu.Item disabled>No rooms available</Menu.Item>
			)}
		</Menu>
	);

	// Settings & chat
	const handleSettingsClick = () => {
		const selectedHotelLocal =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userIdLocal = user._id;
		const hotelIdLocal = selectedHotelLocal._id;

		const ok =
			location.pathname.includes(userIdLocal) &&
			location.pathname.includes(hotelIdLocal);

		if (ok) {
			window.location.href = `/hotel-management/settings/${userIdLocal}/${hotelIdLocal}`;
		}
	};

	const handleChatClick = () => {
		const selectedHotelLocal =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userIdLocal = user._id;
		const hotelIdLocal = selectedHotelLocal._id;

		const ok =
			location.pathname.includes(userIdLocal) &&
			location.pathname.includes(hotelIdLocal);

		if (ok) {
			window.location.href = `/hotel-management/customer-service/${userIdLocal}/${hotelIdLocal}`;
		}
	};

	// Target user for modal (self)
	const targetUser = useMemo(() => {
		// Non-admins: modal edits the logged-in user (self)
		return { _id: user._id, name: user.name, email: user.email };
	}, [user]);

	const roleLabel =
		user.role === 1000 ? "Superadmin" : user.role === 2000 ? "Owner" : "User";

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
						overlay={profileMenu}
						trigger={["click"]}
						open={profileMenuOpen}
						onOpenChange={(flag) => setProfileMenuOpen(flag)}
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
								<small>{roleLabel}</small>
							</div>
						</Profile>
					</Dropdown>
				</ProfileMenu>
			</RightSection>

			{/* ===== Account Update Modal (self) for non-admins ===== */}
			{user.role !== 1000 && (
				<UpdateAccountModal
					open={accountModalOpen}
					onClose={() => setAccountModalOpen(false)}
					token={token}
					targetUser={targetUser}
					actingUser={user}
					mode='self'
					onUpdated={() => {
						// No-op; UpdateAccountModal already patches localStorage user name/email.
						// If you keep user context elsewhere, refresh it here.
					}}
				/>
			)}
		</NavbarWrapper>
	);
};

export default TopNavbar;

/* ======================== Styled Components ======================== */

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
		font-size: 23px;
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
