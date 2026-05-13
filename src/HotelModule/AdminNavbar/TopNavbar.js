/** @format */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import styled, { createGlobalStyle } from "styled-components";
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
import { isAuthenticated, signout, stopDashboardPreview } from "../../auth";
import { useLocation, useHistory } from "react-router-dom";
import UpdateAccountModal from "./UpdateAccountModal"; // <-- NEW
import { isSuperAdminUser } from "../../AdminModule/utils/superUsers";
import {
	getHotelDetails,
	hotelAccount,
	pendingConfirmationNotificationFeed,
} from "../apiAdmin";
import socket from "../../socket";

const normalizeTopNavId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const titleCaseHotelName = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

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

const isManagerOrAdminNotificationUser = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	return (
		isSuperAdminUser(user) ||
		roles.includes(1000) ||
		roles.includes(2000) ||
		descriptions.includes("hotelmanager")
	);
};

const isFinanceNotificationUser = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	return roles.includes(6000) || descriptions.includes("finance");
};

const isReservationEmployeeNotificationUser = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	return roles.includes(8000) || descriptions.includes("reservationemployee");
};

const canOpenSettingsCalendar = (user = {}) => {
	const roles = getUserRoles(user);
	const descriptions = getUserRoleDescriptions(user);
	const accessTo = Array.isArray(user.accessTo)
		? user.accessTo.map((item) => String(item || "").toLowerCase())
		: [];
	return (
		isSuperAdminUser(user) ||
		roles.includes(1000) ||
		roles.includes(2000) ||
		descriptions.includes("hotelmanager") ||
		accessTo.includes("settings") ||
		accessTo.includes("all")
	);
};

const getAssignedHotelIds = (user = {}) => {
	const values = [
		user.hotelIdWork,
		...(Array.isArray(user.hotelIdsWork) ? user.hotelIdsWork : []),
		...(Array.isArray(user.hotelsToSupport) ? user.hotelsToSupport : []),
		...(Array.isArray(user.hotelIdsOwner) ? user.hotelIdsOwner : []),
	];
	return [...new Set(values.map(normalizeTopNavId).filter(Boolean))];
};

const canSeeOwnerWideCalendarHotels = (user = {}) => {
	const roles = getUserRoles(user);
	return (
		isSuperAdminUser(user) ||
		roles.includes(1000) ||
		(roles.includes(2000) && !normalizeTopNavId(user.belongsToId))
	);
};

const normalizeCalendarHotel = (hotel, fallback = {}, user = {}) => {
	const hotelId = normalizeTopNavId(hotel?._id || fallback?._id || fallback);
	if (!hotelId) return null;
	const fallbackObject = fallback && typeof fallback === "object" ? fallback : {};
	return {
		...fallbackObject,
		...(hotel && typeof hotel === "object" ? hotel : {}),
		_id: hotelId,
		hotelName:
			hotel?.hotelName ||
			fallbackObject?.hotelName ||
			fallbackObject?.name ||
			(hotelId ? `Hotel ${hotelId.slice(-4)}` : "Hotel"),
		belongsTo:
			hotel?.belongsTo ||
			fallbackObject?.belongsTo ||
			fallbackObject?.ownerId ||
			user.belongsToId,
	};
};

const getCalendarHotelOwnerId = (hotel = {}, user = {}, fallbackOwnerId = "") =>
	normalizeTopNavId(
		hotel.belongsTo?._id ||
			hotel.belongsTo ||
			hotel.ownerId ||
			fallbackOwnerId ||
			user.belongsToId ||
			user._id
	);

const getCalendarRoomLabel = (room = {}) =>
	room.displayName ||
	room.displayName_OtherLanguage ||
	room.roomType ||
	room.name ||
	"Room";

const getCalendarHotelRooms = (hotel = {}) =>
	(Array.isArray(hotel.roomCountDetails) ? hotel.roomCountDetails : [])
		.filter((room) => normalizeTopNavId(room?._id || room?.roomType))
		.filter((room) => room.activeRoom !== false);

const isFinanceOnlyNotificationUser = (user = {}) =>
	isFinanceNotificationUser(user) &&
	!isManagerOrAdminNotificationUser(user) &&
	!isReservationEmployeeNotificationUser(user);

const isAgentAccountNotification = (item = {}) =>
	String(item.notificationType || "").startsWith("agent_account");

const notificationReasonLabel = (reason, isArabic, isAgent = false) => {
	if (reason === "agent_account_pending_approval") {
		return isArabic
			? "Agent account waiting for director approval"
			: "Agent account waiting for director approval";
	}
	if (reason === "agent_account_approved") {
		return isArabic ? "Agent account approved" : "Agent account approved";
	}
	if (reason === "agent_account_rejected") {
		return isArabic ? "Agent account rejected" : "Agent account rejected";
	}
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
	const [isMobileNav, setIsMobileNav] = useState(false);
	const [calendarHotels, setCalendarHotels] = useState([]);
	const [calendarRooms, setCalendarRooms] = useState([]);
	const [calendarHotel, setCalendarHotel] = useState(null);
	const [calendarMode, setCalendarMode] = useState("hotels");
	const [calendarLoading, setCalendarLoading] = useState(false);
	const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);

	const { languageToggle, chosenLanguage } = useCartContext();
	const isArabic = chosenLanguage === "Arabic";

	const [hotelName, setHotelName] = useState("");

	const location = useLocation();
	const history = useHistory();

	const auth = isAuthenticated() || {};
	const { user, token } = auth;
	const dashboardPreview = auth.dashboardPreview;

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
	const canUsePendingNotifications = canSeePendingConfirmationNotifications(user);
	const isAgentNotificationAudience = isAgentNotificationUser(user);
	const isFinanceNotificationAudience = isFinanceOnlyNotificationUser(user);
	const assignedCalendarHotelIds = useMemo(
		() => getAssignedHotelIds(user),
		[user]
	);
	const canUseOwnerWideCalendarHotels = canSeeOwnerWideCalendarHotels(user);
	const canUseMainDashboardSettingsCalendar =
		isMainHotelDashboard && canOpenSettingsCalendar(user);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const mediaQuery = window.matchMedia("(max-width: 760px)");
		const syncViewport = () => {
			setIsMobileNav(mediaQuery.matches);
			setNotificationsOpen(false);
			setProfileMenuOpen(false);
			setSettingsDropdownOpen(false);
		};

		syncViewport();
		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener("change", syncViewport);
			return () => mediaQuery.removeEventListener("change", syncViewport);
		}

		mediaQuery.addListener(syncViewport);
		return () => mediaQuery.removeListener(syncViewport);
	}, []);

	// eslint-disable-next-line
	const userDetails = isOwnerManager ? user : selectedHotel.belongsTo;

	// Detect whether path contains both ids to show hotel name
	useEffect(() => {
		const show =
			userId &&
			hotelId &&
			location.pathname.includes(userId) &&
			location.pathname.includes(hotelId);
		setHotelName(show ? titleCaseHotelName(selectedHotel.hotelName) : "");
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

	const loadCalendarHotels = useCallback(async () => {
		if (!canUseMainDashboardSettingsCalendar || !user?._id) return;

		setCalendarLoading(true);
		try {
			let loadedHotels = [];
			const ownerIdForAccount =
				queryOwnerId ||
				selectedHotelOwnerId ||
				(isOwnerManager ? user._id : user.belongsToId || user._id);

			if (ownerIdForAccount && token) {
				const accountData = await hotelAccount(user._id, token, ownerIdForAccount);
				if (!accountData?.error && Array.isArray(accountData?.hotelIdsOwner)) {
					loadedHotels = accountData.hotelIdsOwner;
				}
			}

			if (!loadedHotels.length && assignedCalendarHotelIds.length) {
				const rawAssignedHotels = [
					user.hotelIdWork,
					...(Array.isArray(user.hotelIdsWork) ? user.hotelIdsWork : []),
					...(Array.isArray(user.hotelsToSupport) ? user.hotelsToSupport : []),
					...(Array.isArray(user.hotelIdsOwner) ? user.hotelIdsOwner : []),
				];
				loadedHotels = await Promise.all(
					assignedCalendarHotelIds.map((assignedHotelId) => {
						const fallback =
							rawAssignedHotels.find(
								(item) => normalizeTopNavId(item) === assignedHotelId
							) || { _id: assignedHotelId };
						return getHotelDetails(assignedHotelId)
							.then((hotel) => hotel || fallback)
							.catch(() => fallback);
					})
				);
			}

			const normalizedHotels = loadedHotels
				.map((hotel) => normalizeCalendarHotel(hotel, hotel, user))
				.filter((hotel) => {
					if (canUseOwnerWideCalendarHotels || !assignedCalendarHotelIds.length) {
						return true;
					}
					return assignedCalendarHotelIds.includes(hotel?._id);
				})
				.filter(Boolean);
			setCalendarHotels(normalizedHotels);
		} catch (error) {
			console.error("Failed to load calendar hotels", error);
			setCalendarHotels([]);
		} finally {
			setCalendarLoading(false);
		}
	}, [
		assignedCalendarHotelIds,
		canUseMainDashboardSettingsCalendar,
		canUseOwnerWideCalendarHotels,
		isOwnerManager,
		queryOwnerId,
		selectedHotelOwnerId,
		token,
		user,
	]);

	/* ===== actions ===== */

	const handleSignout = () => {
		signout(() => history.push("/"));
	};

	const stopPreview = () => {
		stopDashboardPreview();
		history.push("/hotel-management/main-dashboard");
		window.location.reload();
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
			case "stop-preview":
				stopPreview();
				break;
			case "logout":
				handleSignout();
				break;
			default:
				break;
		}
		setProfileMenuOpen(false);
		setSettingsDropdownOpen(false);
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
						label: "Update Account / Password",
					},
			  ]
			: []),
		...(dashboardPreview
			? [
					{
						key: "stop-preview",
						icon: <LogoutOutlined />,
						label: isArabic ? "إنهاء المعاينة" : "Exit preview",
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
		if (!key || key === "no-rooms") return;
		const destinationOwnerId = routeHotelContext.routeOwnerId || userId;
		const destinationHotelId = routeHotelContext.routeHotelId || hotelId;
		if (!destinationOwnerId || !destinationHotelId) return;
		setRoomTypesDropdown(false);
		setSettingsDropdownOpen(false);
		history.push(
			`/hotel-management/settings/${destinationOwnerId}/${destinationHotelId}?activeTab=roomcount&currentStep=3&selectedRoomType=${key}`
		);
	};

	const roomTypeMenuItems =
		roomCountDetails && roomCountDetails.length > 0
			? roomCountDetails.map((room, index) => ({
					key: room?._id || room?.roomType || room?.displayName || String(index),
					label: getCalendarRoomLabel(room),
			  }))
			: [
					{
						key: "no-rooms",
						label: "No rooms available",
						disabled: true,
					},
			  ];

	const loadCalendarRoomsForHotel = async (hotel) => {
		if (!hotel?._id) return;
		setCalendarLoading(true);
		setRoomTypesDropdown(true);
		try {
			let fullHotel = hotel;
			if (!Array.isArray(fullHotel.roomCountDetails)) {
				const hotelDetails = await getHotelDetails(hotel._id);
				if (hotelDetails && !hotelDetails.error) {
					const normalizedHotel = normalizeCalendarHotel(
						hotelDetails,
						hotel,
						user
					);
					if (normalizedHotel) {
						fullHotel = normalizedHotel;
						setCalendarHotels((currentHotels) =>
							currentHotels.map((item) =>
								item._id === fullHotel._id ? { ...item, ...fullHotel } : item
							)
						);
					}
				}
			}
			setCalendarHotel(fullHotel);
			setCalendarRooms(getCalendarHotelRooms(fullHotel));
			setCalendarMode("rooms");
		} catch (error) {
			console.error("Failed to load calendar rooms", error);
			setCalendarHotel(hotel);
			setCalendarRooms([]);
			setCalendarMode("rooms");
		} finally {
			setCalendarLoading(false);
			window.setTimeout(() => setRoomTypesDropdown(true), 0);
		}
	};

	const handleCalendarMenuClick = ({ key }) => {
		if (!canUseMainDashboardSettingsCalendar) {
			handleRoomClick({ key });
			return;
		}

		if (key === "calendar-back-to-hotels") {
			setCalendarMode("hotels");
			setCalendarHotel(null);
			setCalendarRooms([]);
			window.setTimeout(() => setRoomTypesDropdown(true), 0);
			return;
		}

		if (String(key || "").startsWith("hotel:")) {
			const selectedHotelId = String(key).replace("hotel:", "");
			const hotel = calendarHotels.find((item) => item._id === selectedHotelId);
			if (hotel) {
				loadCalendarRoomsForHotel(hotel);
			}
			return;
		}

		if (String(key || "").startsWith("room:")) {
			const selectedRoomId = String(key).replace("room:", "");
			const selectedHotelForRoute = calendarHotel;
			const selectedOwnerId = getCalendarHotelOwnerId(
				selectedHotelForRoute,
				user,
				queryOwnerId || selectedHotelOwnerId
			);

			if (!selectedOwnerId || !selectedHotelForRoute?._id || !selectedRoomId) {
				return;
			}

			localStorage.setItem(
				"selectedHotel",
				JSON.stringify(selectedHotelForRoute)
			);
			setRoomTypesDropdown(false);
			setSettingsDropdownOpen(false);
			history.push(
				`/hotel-management/settings/${selectedOwnerId}/${selectedHotelForRoute._id}?activeTab=roomcount&currentStep=3&selectedRoomType=${selectedRoomId}`
			);
		}
	};

	const handleCalendarOpenChange = (flag) => {
		setRoomTypesDropdown(flag);
		if (!flag) return;
		setNotificationsOpen(false);
		setProfileMenuOpen(false);
		setSettingsDropdownOpen(false);
		if (canUseMainDashboardSettingsCalendar) {
			setCalendarMode("hotels");
			setCalendarHotel(null);
			setCalendarRooms([]);
			loadCalendarHotels();
		}
	};

	const calendarMenuItems = canUseMainDashboardSettingsCalendar
		? calendarMode === "rooms"
			? [
					{
						key: "calendar-back-to-hotels",
						label: isArabic ? "Back to hotels" : "Back to hotels",
					},
					...(calendarLoading
						? [
								{
									key: "calendar-loading-rooms",
									label: "Loading rooms...",
									disabled: true,
								},
						  ]
						: calendarRooms.length
						? calendarRooms.map((room, index) => {
								const roomId = normalizeTopNavId(
									room?._id || room?.roomType || room?.displayName || index
								);
								return {
									key: `room:${roomId}`,
									label: getCalendarRoomLabel(room),
								};
						  })
						: [
								{
									key: "calendar-no-rooms",
									label: "No rooms available",
									disabled: true,
								},
						  ]),
			  ]
			: calendarLoading
			? [
					{
						key: "calendar-loading-hotels",
						label: "Loading hotels...",
						disabled: true,
					},
			  ]
			: calendarHotels.length
			? calendarHotels.map((hotel) => ({
					key: `hotel:${hotel._id}`,
					label: titleCaseHotelName(hotel.hotelName || "Hotel"),
			  }))
			: [
					{
						key: "calendar-no-hotels",
						label: "No hotels available",
						disabled: true,
					},
			  ]
			: roomTypeMenuItems;

	// Settings & chat
	const goToHotelSettingsDetails = (hotel = {}) => {
		const selectedHotelId = normalizeTopNavId(hotel?._id);
		const selectedOwnerId = getCalendarHotelOwnerId(
			hotel,
			user,
			queryOwnerId || selectedHotelOwnerId || userId
		);

		if (!selectedOwnerId || !selectedHotelId) return;

		localStorage.setItem("selectedHotel", JSON.stringify(hotel));
		setSettingsDropdownOpen(false);
		setRoomTypesDropdown(false);
		history.push(
			`/hotel-management/settings/${selectedOwnerId}/${selectedHotelId}/?activeTab=HotelDetails&currentStep=0`
		);
	};

	const handleSettingsMenuClick = ({ key }) => {
		if (!String(key || "").startsWith("settings-hotel:")) return;
		const selectedHotelId = String(key).replace("settings-hotel:", "");
		const hotel = calendarHotels.find((item) => item._id === selectedHotelId);
		if (hotel) {
			goToHotelSettingsDetails(hotel);
		}
	};

	const handleSettingsOpenChange = (flag) => {
		if (!canUseMainDashboardSettingsCalendar) return;

		setSettingsDropdownOpen(flag);
		if (!flag) return;

		setRoomTypesDropdown(false);
		setNotificationsOpen(false);
		setProfileMenuOpen(false);
		setCalendarMode("hotels");
		setCalendarHotel(null);
		setCalendarRooms([]);
		loadCalendarHotels();
	};

	const settingsMenuItems = canUseMainDashboardSettingsCalendar
		? calendarLoading
			? [
					{
						key: "settings-loading-hotels",
						label: "Loading hotels...",
						disabled: true,
					},
			  ]
			: calendarHotels.length
			? calendarHotels.map((hotel) => ({
					key: `settings-hotel:${hotel._id}`,
					label: titleCaseHotelName(hotel.hotelName || "Hotel"),
			  }))
			: [
					{
						key: "settings-no-hotels",
						label: "No hotels available",
						disabled: true,
					},
			  ]
		: [];

	const handleSettingsClick = () => {
		const selectedHotelLocal =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userIdLocal =
			routeHotelContext.routeOwnerId ||
			selectedHotelLocal.belongsTo?._id ||
			selectedHotelLocal.belongsTo ||
			user.belongsToId ||
			user._id;
		const hotelIdLocal = routeHotelContext.routeHotelId || selectedHotelLocal._id;

		const ok =
			location.pathname.includes(userIdLocal) &&
			location.pathname.includes(hotelIdLocal);

		if (ok) {
			history.push(
				`/hotel-management/settings/${userIdLocal}/${hotelIdLocal}/?activeTab=HotelDetails&currentStep=0`
			);
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
		if (flag) {
			setProfileMenuOpen(false);
			setRoomTypesDropdown(false);
			setSettingsDropdownOpen(false);
			refreshNotifications({ silent: true });
		}
	};

	const handleProfileOpenChange = (flag) => {
		setProfileMenuOpen(flag);
		if (flag) {
			setNotificationsOpen(false);
			setRoomTypesDropdown(false);
			setSettingsDropdownOpen(false);
		}
	};

	const goToPendingNotification = (item = {}) => {
		const targetHotelId = item.hotelId || notificationHotelId || hotelId;
		const targetOwnerId = item.hotelOwnerId || notificationOwnerId || userId;
		if (!targetHotelId || !targetOwnerId) return;
		if (isAgentAccountNotification(item)) {
			history.push(
				`/hotel-management/main-dashboard?modal=accounts&ownerId=${targetOwnerId}`
			);
			setNotificationsOpen(false);
			return;
		}
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
	const notificationCount = Number(notificationFeed.total || 0);
	const notificationPanel = (
		<NotificationPanel $isArabic={isArabic}>
			{false && (
			<NotificationHeader>
				<div>
					<NotificationTitle>
						{isAgentNotificationAudience
							? isArabic
								? "تحديثات الحجوزات"
								: "Reservation Updates"
							: isFinanceNotificationAudience
							? isArabic
								? "Commission Reviews"
								: "Commission Reviews"
							: isArabic
							? "تأكيد الحجوزات"
							: "Reservation Confirmations"}
					</NotificationTitle>
					<NotificationSubtitle>
						{isAgentNotificationAudience
							? isArabic
								? "تظهر لك فقط تحديثات حجوزاتك."
								: "Only updates for your own reservations."
							: isFinanceNotificationAudience
							? isArabic
								? "Reservations waiting for commission assignment."
								: "Reservations waiting for commission assignment."
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
			)}

			{notificationsLoading ? (
				<NotificationLoading>
					<Spin size='small' />
				</NotificationLoading>
			) : notificationFeed.data.length ? (
				<NotificationList>
					{notificationFeed.data.map((item) => {
						const agentAccountNotice = isAgentAccountNotification(item);
						const reasons = Array.isArray(item.pendingReasons)
							? item.pendingReasons
							: [];
						const visibleReasons =
							item.notificationType === "agent_review" && !reasons.length
								? ["agent_pending_review"]
								: reasons.length
								? reasons
								: item.notificationType === "agent_review"
								? ["agent_pending_review"]
								: [];
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
						const agentAccountTitle =
							item.notificationType === "agent_account_approved"
								? "Agent approved"
								: item.notificationType === "agent_account_rejected"
								? "Agent rejected"
								: "Agent approval";
						return (
							<NotificationItem
								key={item._id}
								type='button'
								onClick={() => goToPendingNotification(item)}
							>
								<NotificationItemTop>
									<strong>
										{agentAccountNotice
											? agentAccountTitle
											: item.confirmation_number || "N/A"}
									</strong>
									{!agentAccountNotice && (
										<span>{formatNotificationMoney(item.total_amount)} SAR</span>
									)}
								</NotificationItemTop>
								<NotificationGuest>
									{item.guestName || (isArabic ? "ضيف بدون اسم" : "Unnamed guest")}
								</NotificationGuest>
								<NotificationMeta>
									<span>
										{item.hotelName
											? titleCaseHotelName(item.hotelName)
											: item.booking_source || "Hotel"}
									</span>
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
			getPopupContainer={() => document.body}
			autoAdjustOverflow
			destroyPopupOnHide={false}
			overlayClassName='top-navbar-notification-dropdown'
		>
			{trigger}
		</Dropdown>
	);

	return (
		<NavbarWrapper $isArabic={chosenLanguage === "Arabic"}>
			<TopNavbarGlobalStyles />
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
				{dashboardPreview && (
					<PreviewChip>
						<span>
							{isArabic ? "معاينة:" : "Previewing:"} {user?.name || ""}
						</span>
						<button type='button' onClick={stopPreview}>
							{isArabic ? "إنهاء" : "Exit"}
						</button>
					</PreviewChip>
				)}
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

					{canUseMainDashboardSettingsCalendar ? (
						<Dropdown
							menu={{
								items: settingsMenuItems,
								onClick: handleSettingsMenuClick,
							}}
							trigger={["click"]}
							open={settingsDropdownOpen}
							onOpenChange={handleSettingsOpenChange}
							placement={isArabic ? "bottomLeft" : "bottomRight"}
							getPopupContainer={() => document.body}
							overlayClassName='top-navbar-settings-dropdown'
						>
							<IconWrapper role='button' aria-label='Hotel settings'>
								<SettingOutlined />
							</IconWrapper>
						</Dropdown>
					) : (
						<IconWrapper
							onClick={handleSettingsClick}
							role='button'
							aria-label='Hotel settings'
						>
							<SettingOutlined />
						</IconWrapper>
					)}

					<IconWrapper style={{ width: "25%" }}>
						<Dropdown
							menu={{
								items: calendarMenuItems,
								onClick: handleCalendarMenuClick,
							}}
							trigger={["click"]}
							open={roomTypesDropdown}
							onOpenChange={handleCalendarOpenChange}
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

					{!isMobileNav &&
						renderNotificationsDropdown(
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
						onOpenChange={handleProfileOpenChange}
						placement={isArabic ? "bottomLeft" : "bottomRight"}
						getPopupContainer={() => document.body}
						overlayClassName='top-navbar-profile-dropdown'
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
				{isMobileNav &&
					canUsePendingNotifications &&
					renderNotificationsDropdown(
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
				<Dropdown
					menu={{
						items: profileMenuItems,
						onClick: handleMenuClick,
					}}
					trigger={["click"]}
					open={profileMenuOpen}
					onOpenChange={handleProfileOpenChange}
					placement={isArabic ? "bottomLeft" : "bottomRight"}
					getPopupContainer={() => document.body}
					overlayClassName='top-navbar-profile-dropdown'
				>
					<MobileTopButton
						type='button'
						data-variant='profile'
						aria-label={isArabic ? "Account" : "Account menu"}
					>
						<UserOutlined />
					</MobileTopButton>
				</Dropdown>
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

const TopNavbarGlobalStyles = createGlobalStyle`
	@media (max-width: 760px) {
		.top-navbar-notification-dropdown {
			position: fixed !important;
			top: 78px !important;
			left: 9px !important;
			right: 9px !important;
			width: auto !important;
			max-width: none !important;
			transform: none !important;
			z-index: 2100 !important;
		}

		.top-navbar-profile-dropdown {
			position: fixed !important;
			top: 78px !important;
			right: 10px !important;
			left: auto !important;
			min-width: 230px !important;
			transform: none !important;
			z-index: 2101 !important;
		}

		.top-navbar-settings-dropdown {
			position: fixed !important;
			top: 78px !important;
			right: 10px !important;
			left: auto !important;
			min-width: 230px !important;
			transform: none !important;
			z-index: 2101 !important;
		}

		.top-navbar-profile-dropdown .ant-dropdown-menu {
			padding: 8px;
			border: 1px solid #c7e5ff;
			border-radius: 14px;
			box-shadow: 0 16px 38px rgba(15, 23, 42, 0.22);
		}

		.top-navbar-profile-dropdown .ant-dropdown-menu-item {
			min-height: 40px;
			border-radius: 10px;
			font-weight: 800;
		}

		.top-navbar-settings-dropdown .ant-dropdown-menu {
			padding: 8px;
			border: 1px solid #c7e5ff;
			border-radius: 14px;
			box-shadow: 0 16px 38px rgba(15, 23, 42, 0.22);
		}

		.top-navbar-settings-dropdown .ant-dropdown-menu-item {
			min-height: 40px;
			border-radius: 10px;
			font-weight: 800;
			text-transform: capitalize;
		}
	}
`;

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
		display: none;
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
	gap: 0.75rem;
	flex: 0 0 auto;
	min-width: 0;

	@media (max-width: 760px) {
		display: none;
	}
`;

const PreviewChip = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	max-width: 260px;
	padding: 0.34rem 0.48rem;
	border: 1px solid rgba(253, 230, 138, 0.8);
	border-radius: 8px;
	background: #fef3c7;
	color: #713f12;
	font-size: 0.78rem;
	font-weight: 900;

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	button {
		border: 0;
		border-radius: 6px;
		background: #92400e;
		color: #fff;
		font-size: 0.72rem;
		font-weight: 900;
		padding: 0.2rem 0.46rem;
		cursor: pointer;
	}

	@media (max-width: 920px) {
		display: none;
	}
`;

const MobileActions = styled.div`
	display: none;

	@media (max-width: 760px) {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 0 0 auto;
		margin-left: auto;
	}
`;

const MobileTopButton = styled.button`
	position: relative;
	min-width: 44px;
	height: 44px;
	padding: 0 12px;
	border: 1px solid rgba(255, 255, 255, 0.28);
	border-radius: 13px;
	background: linear-gradient(180deg, #1d8bff 0%, #0d6efd 100%);
	color: #fff;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	font-weight: 900;
	line-height: 1;
	cursor: pointer;
	box-shadow: 0 8px 18px rgba(13, 110, 253, 0.28);
	transition: transform 0.15s ease, box-shadow 0.15s ease,
		border-color 0.15s ease;

	&:active {
		transform: translateY(1px);
		box-shadow: 0 5px 12px rgba(13, 110, 253, 0.22);
	}

	&:focus-visible {
		outline: 3px solid rgba(255, 255, 255, 0.85);
		outline-offset: 2px;
	}

	svg {
		font-size: 21px;
		color: #fff;
	}

	span {
		font-size: 0.86rem;
	}

	.ant-badge {
		display: inline-flex;
		align-items: center;
	}

	.ant-badge-count {
		font-weight: 900;
		box-shadow: 0 0 0 2px #1e1e2d;
	}

	@media (max-width: 420px) {
		min-width: 40px;
		height: 40px;
		padding: 0 10px;
		border-radius: 12px;

		svg {
			font-size: 19px;
		}
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
