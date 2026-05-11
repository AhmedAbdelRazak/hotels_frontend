/** @format */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import styled from "styled-components";
import { Badge, Dropdown, Empty, Spin } from "antd";
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
import { isSuperAdminUser } from "../../AdminModule/utils/superUsers";
import { pendingConfirmationNotificationFeed } from "../apiAdmin";
import socket from "../../socket";

const normalizeTopNavId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const getUserRoles = (user = {}) => [
	Number(user.role),
	...(Array.isArray(user.roles) ? user.roles.map(Number) : []),
];

const getUserRoleDescriptions = (user = {}) => [
	String(user.roleDescription || "").toLowerCase(),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const canSeePendingConfirmationNotifications = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	const accessTo = Array.isArray(user.accessTo) ? user.accessTo : [];
	return (
		isSuperAdminUser(user) ||
		[1000, 2000, 6000, 8000].some((role) => roles.includes(role)) ||
		roles.includes(7000) ||
		descriptions.includes("hotelmanager") ||
		descriptions.includes("finance") ||
		descriptions.includes("reservationemployee") ||
		descriptions.includes("ordertaker") ||
		accessTo.includes("ownReservations")
	);
};

const isAgentNotificationUser = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	const accessTo = Array.isArray(user.accessTo) ? user.accessTo : [];
	return (
		roles.includes(7000) ||
		descriptions.includes("ordertaker") ||
		accessTo.includes("ownReservations")
	);
};

const notificationReasonLabel = (reason, isArabic, isAgent = false) => {
	if (reason === "agent_pending_review") {
		return isArabic
			? "الحجز بانتظار مراجعة الفندق"
			: "Waiting for hotel review";
	}
	if (reason === "commission_missing") {
		return isArabic
			? isAgent
				? "مراجعة الفندق المالية قيد التنفيذ"
				: "العمولة تحتاج مراجعة"
			: isAgent
			? "Hotel financial review"
			: "Commission needs review";
	}
	const labels = {
		pending_confirmation: isArabic
			? "بانتظار تأكيد الحجز"
			: "Pending confirmation",
		commission_missing: isArabic ? "العمولة غير محددة" : "Commission missing",
		pending_rejected: isArabic ? "مرفوضة وتحتاج متابعة" : "Rejected follow-up",
	};
	return labels[reason] || reason;
};

const formatNotificationMoney = (value) =>
	Number(value || 0).toLocaleString("en-US", {
		maximumFractionDigits: 2,
	});

const formatNotificationDate = (value) => {
	if (!value) return "";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	return parsed.toISOString().slice(0, 10);
};

const TopNavbar = ({ collapsed, roomCountDetails }) => {
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const [roomTypesDropdown, setRoomTypesDropdown] = useState(false);
	const [accountModalOpen, setAccountModalOpen] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [notificationsLoading, setNotificationsLoading] = useState(false);
	const [notificationFeed, setNotificationFeed] = useState({
		total: 0,
		data: [],
	});

	const { languageToggle, chosenLanguage } = useCartContext();

	const [hotelName, setHotelName] = useState("");

	const location = useLocation();
	const history = useHistory();

	const { user, token } = isAuthenticated();

	// Selected hotel context
	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};
	const hotelId = selectedHotel._id;
	const routeHotelContext = useMemo(() => {
		const match = (location.pathname || "").match(
			/^\/hotel-management\/[^/]+\/([^/]+)\/([^/?#]+)/
		);
		return {
			routeOwnerId: match?.[1] || "",
			routeHotelId: match?.[2] || "",
		};
	}, [location.pathname]);
	const queryOwnerId = useMemo(() => {
		return new URLSearchParams(location.search || "").get("ownerId") || "";
	}, [location.search]);

	const isOwnerManager = user.role === 2000 && !user.belongsToId;
	const userId = isOwnerManager
		? user._id
		: selectedHotel.belongsTo?._id || selectedHotel.belongsTo || user.belongsToId;
	const selectedHotelOwnerId = normalizeTopNavId(
		selectedHotel.belongsTo?._id || selectedHotel.belongsTo || user.belongsToId
	);
	const isMainHotelDashboard =
		location.pathname === "/hotel-management/main-dashboard";
	const notificationHotelId = isMainHotelDashboard
		? ""
		: routeHotelContext.routeHotelId || hotelId || "";
	const notificationOwnerId =
		queryOwnerId ||
		routeHotelContext.routeOwnerId ||
		selectedHotelOwnerId ||
		(isOwnerManager ? user._id : user.belongsToId);
	const canUsePendingNotifications =
		canSeePendingConfirmationNotifications(user);
	const isAgentNotificationAudience = isAgentNotificationUser(user);

	// eslint-disable-next-line
	const userDetails = isOwnerManager ? user : selectedHotel.belongsTo;

	// Detect whether path contains both ids to show hotel name
	useEffect(() => {
		const show =
			userId &&
			hotelId &&
			location.pathname.includes(userId) &&
			location.pathname.includes(hotelId);
		setHotelName(show ? selectedHotel.hotelName : "");
	}, [location, selectedHotel.hotelName, hotelId, userId]);

	const refreshNotifications = useCallback(
		async ({ silent = false } = {}) => {
			if (!canUsePendingNotifications || !user?._id) {
				setNotificationFeed({ total: 0, data: [] });
				return;
			}
			if (!silent) setNotificationsLoading(true);
			try {
				const data = await pendingConfirmationNotificationFeed({
					userId: user._id,
					hotelId: notificationHotelId,
					ownerId: notificationOwnerId,
					limit: 8,
				});
				if (data?.error) {
					setNotificationFeed({ total: 0, data: [] });
				} else {
					setNotificationFeed({
						total: Number(data?.total || 0),
						data: Array.isArray(data?.data) ? data.data : [],
					});
				}
			} catch (error) {
				console.error("Failed to load notification feed", error);
				setNotificationFeed({ total: 0, data: [] });
			} finally {
				if (!silent) setNotificationsLoading(false);
			}
		},
		[
			canUsePendingNotifications,
			notificationHotelId,
			notificationOwnerId,
			user?._id,
		]
	);

	useEffect(() => {
		refreshNotifications();
		const timer = setInterval(
			() => refreshNotifications({ silent: true }),
			60000
		);
		return () => clearInterval(timer);
	}, [refreshNotifications]);

	useEffect(() => {
		if (!canUsePendingNotifications) return undefined;
		if (notificationHotelId) {
			socket.emit("joinHotelNotifications", { hotelId: notificationHotelId });
		} else if (notificationOwnerId) {
			socket.emit("joinOwnerNotifications", { ownerId: notificationOwnerId });
		}

		const handleRefresh = (payload = {}) => {
			const payloadHotelId = normalizeTopNavId(payload.hotelId);
			const payloadOwnerId = normalizeTopNavId(payload.ownerId);
			if (
				notificationHotelId &&
				payloadHotelId &&
				payloadHotelId !== notificationHotelId
			) {
				return;
			}
			if (
				!notificationHotelId &&
				notificationOwnerId &&
				payloadOwnerId &&
				payloadOwnerId !== notificationOwnerId
			) {
				return;
			}
			refreshNotifications({ silent: true });
		};

		socket.on("hotelNotificationsUpdated", handleRefresh);
		return () => {
			socket.off("hotelNotificationsUpdated", handleRefresh);
			if (notificationHotelId) {
				socket.emit("leaveHotelNotifications", { hotelId: notificationHotelId });
			} else if (notificationOwnerId) {
				socket.emit("leaveOwnerNotifications", { ownerId: notificationOwnerId });
			}
		};
	}, [
		canUsePendingNotifications,
		notificationHotelId,
		notificationOwnerId,
		refreshNotifications,
	]);

	/* ===== actions ===== */

	const handleSignout = () => {
		signout(() => history.push("/"));
	};

	const openSelfUpdateModal = () => {
		// For non-admin users only; admin keeps redirect behavior
		if (user.role === 1000) return;
		setAccountModalOpen(true);
	};

	const getProfileDestination = () => {
		const pathname = location?.pathname || "";
		const configuredSuperAdmin = isSuperAdminUser(user);
		const selectedHotelOwnerId = normalizeTopNavId(
			selectedHotel.belongsTo?._id || selectedHotel.belongsTo || user.belongsToId
		);

		if (configuredSuperAdmin) {
			if (pathname === "/hotel-management/main-dashboard") {
				return "/admin/dashboard";
			}
			if (pathname.startsWith("/hotel-management")) {
				return `/hotel-management/main-dashboard${
					selectedHotelOwnerId ? `?ownerId=${selectedHotelOwnerId}` : ""
				}`;
			}
			return "/admin/dashboard";
		}

		if (user.role === 1000) {
			return "/admin/dashboard";
		}

		return "/hotel-management/main-dashboard";
	};

	const handleMenuClick = ({ key }) => {
		switch (key) {
			case "profile":
				history.push(getProfileDestination());
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
	const profileMenuItems = [
		{
			key: "profile",
			icon: <UserOutlined />,
			label: "Profile",
		},
		{
			key: "inbox",
			icon: <MailOutlined />,
			label: "Inbox",
		},
		...(user.role !== 1000
			? [
					{
						key: "update",
						icon: <UserOutlined />,
						label: "Update Account",
					},
			  ]
			: []),
		{
			key: "logout",
			icon: <LogoutOutlined />,
			label: "Logout",
		},
	];

	// Room types dropdown
	const handleRoomClick = ({ key }) => {
		setRoomTypesDropdown(false);
		window.location.href = `/hotel-management/settings/${userId}/${hotelId}?activeTab=roomcount&currentStep=3&selectedRoomType=${key}`;
	};

	const roomTypeMenuItems =
		roomCountDetails && roomCountDetails.length > 0
			? roomCountDetails.map((room, index) => ({
					key: room?._id || room?.roomType || room?.displayName || String(index),
					label: room.displayName,
			  }))
			: [
					{
						key: "no-rooms",
						label: "No rooms available",
						disabled: true,
					},
			  ];

	// Settings & chat
	const handleSettingsClick = () => {
		const selectedHotelLocal =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userIdLocal =
			selectedHotelLocal.belongsTo?._id ||
			selectedHotelLocal.belongsTo ||
			user.belongsToId ||
			user._id;
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
		const userIdLocal =
			selectedHotelLocal.belongsTo?._id ||
			selectedHotelLocal.belongsTo ||
			user.belongsToId ||
			user._id;
		const hotelIdLocal = selectedHotelLocal._id;

		const ok =
			location.pathname.includes(userIdLocal) &&
			location.pathname.includes(hotelIdLocal);

		if (ok) {
			window.location.href = `/hotel-management/customer-service/${userIdLocal}/${hotelIdLocal}`;
		}
	};

	const toggleLanguage = () => {
		languageToggle(chosenLanguage === "English" ? "Arabic" : "English");
	};

	const handleNotificationOpenChange = (flag) => {
		setNotificationsOpen(flag);
		if (flag) refreshNotifications({ silent: true });
	};

	const goToPendingNotification = (item = {}) => {
		const targetHotelId = item.hotelId || notificationHotelId || hotelId;
		const targetOwnerId = item.hotelOwnerId || notificationOwnerId || userId;
		if (!targetHotelId || !targetOwnerId) return;
		if (
			isAgentNotificationAudience ||
			item.notificationType === "agent_decision" ||
			item.notificationType === "agent_review"
		) {
			history.push(
				`/hotel-management/new-reservation/${targetOwnerId}/${targetHotelId}?list=&page=1&reservationId=${item._id}`
			);
			setNotificationsOpen(false);
			return;
		}
		history.push(
			`/hotel-management/new-reservation/${targetOwnerId}/${targetHotelId}?pendingConfirmation`
		);
		setNotificationsOpen(false);
	};

	// Target user for modal (self)
	const targetUser = useMemo(() => {
		// Non-admins: modal edits the logged-in user (self)
		return { _id: user._id, name: user.name, email: user.email };
	}, [user]);

	const roleLabel =
		user.role === 1000 ? "Superadmin" : user.role === 2000 ? "Owner" : "User";
	const isArabic = chosenLanguage === "Arabic";
	const notificationCount = Number(notificationFeed.total || 0);
	const notificationPanel = (
		<NotificationPanel $isArabic={isArabic}>
			<NotificationHeader>
				<div>
					<NotificationTitle>
						{isAgentNotificationAudience
							? isArabic
								? "تحديثات الحجوزات"
								: "Reservation Updates"
							: isArabic
							? "تأكيد الحجوزات"
							: "Reservation Confirmations"}
					</NotificationTitle>
					<NotificationSubtitle>
						{isAgentNotificationAudience
							? isArabic
								? "تظهر لك فقط تحديثات حجوزاتك."
								: "Only updates for your own reservations."
							: notificationHotelId
							? isArabic
								? "تنبيهات الفندق المحدد فقط."
								: "Alerts for this hotel only."
							: isArabic
							? "تنبيهات كل الفنادق التي يمكنك إدارتها."
							: "Alerts across the hotels you can manage."}
					</NotificationSubtitle>
				</div>
				<NotificationPill>{notificationCount}</NotificationPill>
			</NotificationHeader>

			{notificationsLoading ? (
				<NotificationLoading>
					<Spin size='small' />
				</NotificationLoading>
			) : notificationFeed.data.length ? (
				<NotificationList>
					{notificationFeed.data.map((item) => {
						const reasons = Array.isArray(item.pendingReasons)
							? item.pendingReasons
							: [];
						const visibleReasons =
							item.notificationType === "agent_review"
								? ["agent_pending_review"]
								: reasons;
						const agentDecisionText =
							item.decisionStatus === "rejected"
								? isArabic
									? "تم رفض الحجز"
									: "Reservation rejected"
								: item.decisionStatus === "confirmed"
								? isArabic
									? "تم قبول الحجز"
									: "Reservation confirmed"
								: "";
						return (
							<NotificationItem
								key={item._id}
								type='button'
								onClick={() => goToPendingNotification(item)}
							>
								<NotificationItemTop>
									<strong>{item.confirmation_number || "N/A"}</strong>
									<span>{formatNotificationMoney(item.total_amount)} SAR</span>
								</NotificationItemTop>
								<NotificationGuest>
									{item.guestName || (isArabic ? "ضيف بدون اسم" : "Unnamed guest")}
								</NotificationGuest>
								<NotificationMeta>
									<span>{item.hotelName || item.booking_source || "Hotel"}</span>
									<span>
										{formatNotificationDate(item.checkin_date)}
										{item.checkout_date ? " - " : ""}
										{formatNotificationDate(item.checkout_date)}
									</span>
								</NotificationMeta>
								<NotificationReasons>
									{item.notificationType === "agent_decision" ? (
										<span>{agentDecisionText}</span>
									) : (
										visibleReasons.slice(0, 2).map((reason) => (
											<span key={reason}>
												{notificationReasonLabel(
													reason,
													isArabic,
													isAgentNotificationAudience
												)}
											</span>
										))
									)}
								</NotificationReasons>
							</NotificationItem>
						);
					})}
				</NotificationList>
			) : (
				<NotificationEmpty>
					<Empty
						image={Empty.PRESENTED_IMAGE_SIMPLE}
						description={
							isArabic ? "لا توجد حجوزات تحتاج تأكيداً." : "No pending items."
						}
					/>
				</NotificationEmpty>
			)}
		</NotificationPanel>
	);

	const renderNotificationsDropdown = (trigger) => (
		<Dropdown
			trigger={["click"]}
			open={notificationsOpen}
			onOpenChange={handleNotificationOpenChange}
			dropdownRender={() => notificationPanel}
			placement={isArabic ? "bottomLeft" : "bottomRight"}
		>
			{trigger}
		</Dropdown>
	);

	return (
		<NavbarWrapper $isArabic={chosenLanguage === "Arabic"}>
			<LeftSection>
				<Logo $show={collapsed} $isArabic={chosenLanguage === "Arabic"}>
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
						onClick={toggleLanguage}
						role='button'
						aria-label='Toggle language'
					>
						<GlobalOutlined className='mx-2' />
						<LanguageText>
							{chosenLanguage === "English" ? "AR" : "En"}
						</LanguageText>
					</IconWrapper>

					<IconWrapper onClick={handleSettingsClick}>
						<SettingOutlined />
					</IconWrapper>

					<IconWrapper style={{ width: "25%" }}>
						<Dropdown
							menu={{
								items: roomTypeMenuItems,
								onClick: handleRoomClick,
							}}
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

					{renderNotificationsDropdown(
						<IconWrapper
							role='button'
							aria-label={isArabic ? "الإشعارات" : "Notifications"}
						>
							<Badge
								count={canUsePendingNotifications ? notificationCount : 0}
								size='small'
								overflowCount={99}
								offset={[1, -2]}
							>
								<BellOutlined />
							</Badge>
						</IconWrapper>
					)}

					<IconWrapper onClick={handleChatClick}>
						<MessageOutlined />
						<NotificationDot />
					</IconWrapper>
				</Icons>

				<ProfileMenu>
					<Dropdown
						menu={{
							items: profileMenuItems,
							onClick: handleMenuClick,
						}}
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

			<MobileActions>
				<MobileTopButton
					type='button'
					onClick={toggleLanguage}
					aria-label='Toggle language'
				>
					<GlobalOutlined />
					<span>{chosenLanguage === "English" ? "AR" : "En"}</span>
				</MobileTopButton>
				{renderNotificationsDropdown(
					<MobileTopButton
						type='button'
						aria-label={isArabic ? "الإشعارات" : "Notifications"}
					>
						<Badge
							count={canUsePendingNotifications ? notificationCount : 0}
							size='small'
							overflowCount={99}
							offset={[4, -4]}
						>
							<BellOutlined />
						</Badge>
					</MobileTopButton>
				)}
			</MobileActions>

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
	direction: ${(props) => (props.$isArabic ? "rtl" : "")} !important;
	min-width: 0;
	overflow: hidden;

	@media (max-width: 760px) {
		direction: ltr !important;
		gap: 10px;
		justify-content: flex-start;
		padding: ${(props) =>
			props.$isArabic ? "0 62px 0 10px" : "0 10px 0 62px"};
	}
`;

const LeftSection = styled.div`
	display: flex;
	align-items: center;
	flex: 0 0 auto;
	min-width: 0;
`;

const Logo = styled.div`
	display: flex;
	align-items: center;
	margin-right: ${(props) =>
		props.$show && props.$isArabic ? "50px" : ""} !important;

	img {
		width: 100% !important;
		margin: auto 20px;
	}

	@media (max-width: 980px) {
		img {
			width: 120px !important;
			margin: auto 8px;
		}
	}

	@media (max-width: 760px) {
		display: none;
	}
`;

const DigitalClockWrapper = styled.div`
	margin-left: 20px;

	@media (max-width: 760px) {
		margin-left: 0;
	}
`;

const MiddleSection = styled.div`
	flex: 1;
	min-width: 0;
	text-align: center;
	text-transform: capitalize;

	@media (max-width: 760px) {
		order: -1;
		text-align: start;
	}
`;

const HotelName = styled.span`
	font-weight: bold;
	color: white;
	font-size: 24px;
	display: block;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	@media (max-width: 760px) {
		font-size: 16px;
		line-height: 1.2;
	}
`;

const RightSection = styled.div`
	display: flex;
	align-items: center;
	flex: 0 0 auto;
	min-width: 0;

	@media (max-width: 760px) {
		display: none;
	}
`;

const MobileActions = styled.div`
	display: none;

	@media (max-width: 760px) {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 0 0 auto;
	}
`;

const MobileTopButton = styled.button`
	position: relative;
	min-width: 36px;
	height: 34px;
	padding: 0 9px;
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 8px;
	background: #0d6efd;
	color: #fff;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 5px;
	font-weight: 800;
	line-height: 1;

	svg {
		font-size: 16px;
		color: #fff;
	}

	span {
		font-size: 0.76rem;
	}
`;

const NotificationPanel = styled.div`
	width: min(380px, calc(100vw - 24px));
	max-height: min(520px, calc(100vh - 90px));
	overflow: auto;
	padding: 12px;
	border: 1px solid #b9dcff;
	border-radius: 12px;
	background: #ffffff;
	box-shadow: 0 16px 38px rgba(15, 23, 42, 0.22);
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};

	@media (max-width: 760px) {
		width: calc(100vw - 18px);
		max-height: calc(100vh - 86px);
	}
`;

const NotificationHeader = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;
	padding: 10px;
	border-radius: 10px;
	background: #eaf6ff;
	border: 1px solid #c7e5ff;
`;

const NotificationTitle = styled.div`
	font-size: 1rem;
	font-weight: 900;
	color: #0f2a45;
`;

const NotificationSubtitle = styled.div`
	margin-top: 3px;
	font-size: 0.78rem;
	font-weight: 700;
	color: #52708c;
`;

const NotificationPill = styled.span`
	min-width: 34px;
	height: 28px;
	padding: 0 9px;
	border-radius: 999px;
	background: #1677ff;
	color: #fff;
	font-weight: 900;
	display: inline-flex;
	align-items: center;
	justify-content: center;
`;

const NotificationLoading = styled.div`
	min-height: 120px;
	display: flex;
	align-items: center;
	justify-content: center;
`;

const NotificationList = styled.div`
	display: grid;
	gap: 8px;
	margin-top: 10px;
`;

const NotificationItem = styled.button`
	width: 100%;
	padding: 10px;
	border: 1px solid #cfe4ff;
	border-radius: 10px;
	background: #fbfdff;
	text-align: inherit;
	cursor: pointer;
	transition: border-color 0.15s ease, transform 0.15s ease,
		box-shadow 0.15s ease;

	&:hover {
		border-color: #1677ff;
		box-shadow: 0 10px 22px rgba(22, 119, 255, 0.12);
		transform: translateY(-1px);
	}
`;

const NotificationItemTop = styled.div`
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 0.9rem;
	color: #0f172a;

	strong,
	span {
		direction: ltr;
		unicode-bidi: plaintext;
	}
`;

const NotificationGuest = styled.div`
	margin-top: 5px;
	font-size: 0.86rem;
	font-weight: 800;
	color: #1e3a5f;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
`;

const NotificationMeta = styled.div`
	margin-top: 5px;
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 0.74rem;
	font-weight: 700;
	color: #64748b;

	span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
`;

const NotificationReasons = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
	margin-top: 8px;

	span {
		border: 1px solid #ffbf8a;
		background: #fff7ed;
		color: #c2410c;
		border-radius: 999px;
		padding: 3px 8px;
		font-size: 0.7rem;
		font-weight: 900;
	}
`;

const NotificationEmpty = styled.div`
	padding: 12px 0 2px;
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
