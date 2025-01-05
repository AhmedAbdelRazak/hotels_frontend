import React, { useState, useEffect } from "react";
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

const TopNavbar = ({ collapsed, roomCountDetails }) => {
	const [dropdownVisible, setDropdownVisible] = useState(false);
	const { languageToggle, chosenLanguage } = useCartContext();
	const [hotelName, setHotelName] = useState("");
	const [roomTypesDropdown, setRoomTypesDropdown] = useState(false);

	const location = useLocation();
	const history = useHistory();
	const { user } = isAuthenticated();

	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};
	const userId = user.role === 2000 ? user._id : selectedHotel.belongsTo._id;
	const hotelId = selectedHotel._id;

	useEffect(() => {
		const pathContainsUserIdAndHotelId =
			location.pathname.includes(userId) && location.pathname.includes(hotelId);
		if (pathContainsUserIdAndHotelId) {
			setHotelName(selectedHotel.hotelName);
		} else {
			setHotelName("");
		}
	}, [location, selectedHotel.hotelName, hotelId, userId]);

	const handleMenuClick = ({ key }) => {
		if (key === "profile" && user.role === 2000) {
			history.push("/hotel-management/main-dashboard");
		} else if (key === "profile" && user.role === 1000) {
			history.push("/admin/dashboard");
		} else if (key === "logout") {
			handleSignout();
		}
		setDropdownVisible(false);
	};

	const handleSignout = () => {
		signout(() => {
			history.push("/");
		});
	};

	const menu = (
		<Menu onClick={handleMenuClick}>
			<Menu.Item key='profile' icon={<UserOutlined />}>
				Profile
			</Menu.Item>
			<Menu.Item key='inbox' icon={<MailOutlined />}>
				Inbox
			</Menu.Item>
			<Menu.Item key='logout' icon={<LogoutOutlined />}>
				Logout
			</Menu.Item>
		</Menu>
	);

	const handleRoomClick = ({ key }) => {
		setRoomTypesDropdown(false);

		window.location.href = `
/hotel-management/settings/${userId}/${hotelId}?activeTab=roomcount&currentStep=3&selectedRoomType=${key}`;
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

	const handleSettingsClick = () => {
		const selectedHotel =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userId = user._id;
		const hotelId = selectedHotel._id;

		// Check if both userId and hotelId are in the current path
		const pathContainsUserIdAndHotelId =
			location.pathname.includes(userId) && location.pathname.includes(hotelId);

		if (pathContainsUserIdAndHotelId) {
			window.location.href = `/hotel-management/settings/${userId}/${hotelId}`;
		}
		// If not, do nothing
	};

	const handleChatClick = () => {
		const selectedHotel =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userId = user._id;
		const hotelId = selectedHotel._id;

		// Check if both userId and hotelId are in the current path
		const pathContainsUserIdAndHotelId =
			location.pathname.includes(userId) && location.pathname.includes(hotelId);

		if (pathContainsUserIdAndHotelId) {
			window.location.href = `/hotel-management/customer-service/${userId}/${hotelId}`;
		}
		// If not, do nothing
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
							<img src='https://via.placeholder.com/40' alt='Profile' />
							<div>
								<span>Hi {user.name.split(" ")[0]}</span>
								<small>Superadmin</small>
							</div>
						</Profile>
					</Dropdown>
				</ProfileMenu>
			</RightSection>
		</NavbarWrapper>
	);
};

export default TopNavbar;

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
	img {
		border-radius: 50%;
	}
	span {
		font-weight: bold;
		color: #fff;
		margin-left: ${(props) => (props.isArabic ? "20px" : "30px")} !important;
		margin-right: ${(props) => (props.isArabic ? "" : "10px")} !important;
	}
	small {
		display: block;
		color: #bbb;
		font-size: 12px;
	}
`;
