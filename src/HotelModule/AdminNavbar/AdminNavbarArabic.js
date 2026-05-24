// eslint-disable-next-line
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { Redirect, Link } from "react-router-dom";
import {
	AreaChartOutlined,
	BankTwoTone,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	PieChartOutlined,
	SettingOutlined,
	ImportOutlined,
	CustomerServiceOutlined,
	CreditCardOutlined,
	DollarCircleOutlined,
	ShopOutlined,
	TeamOutlined,
} from "@ant-design/icons";
// eslint-disable-next-line
import { Button, Menu, message } from "antd";
import { useCartContext } from "../../cart_context";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { signout, isAuthenticated } from "../../auth";
import TopNavbar from "./TopNavbar";

function getItem(label, key, icon, children, type, className) {
	return {
		key,
		icon,
		children,
		label,
		type,
		className,
	};
}

const handleSignout = (history) => {
	signout(() => {
		history.push("/");
	});
};

const MENU_COLLAPSE_KEY = "hotelAdminMenuCollapsed";
const MOBILE_MENU_BREAKPOINT = 1200;

const isMobileMenuViewport = () => {
	if (typeof window === "undefined") return false;
	return window.innerWidth <= MOBILE_MENU_BREAKPOINT;
};

const AdminNavbarArabic = ({
	fromPage,
	setAdminMenuStatus,
	collapsed,
	setCollapsed,
}) => {
	const [clickedOn, setClickedOn] = useState(false);
	const [isMobileMenu, setIsMobileMenu] = useState(() =>
		isMobileMenuViewport(),
	);
	const { chosenLanguage } = useCartContext();
	const history = useHistory();

	const applyMenuCollapsedState = useCallback(
		(nextCollapsed) => {
			setCollapsed(nextCollapsed);
			setAdminMenuStatus(nextCollapsed);
			if (typeof window !== "undefined") {
				localStorage.setItem(MENU_COLLAPSE_KEY, String(nextCollapsed));
			}
		},
		[setAdminMenuStatus, setCollapsed],
	);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const stored = localStorage.getItem(MENU_COLLAPSE_KEY);
		if (stored === null) {
			if (isMobileMenuViewport()) {
				applyMenuCollapsedState(true);
			}
			return;
		}
		const nextCollapsed = stored === "true";
		if (isMobileMenuViewport() && !nextCollapsed) {
			applyMenuCollapsedState(true);
			return;
		}
		setCollapsed(nextCollapsed);
		setAdminMenuStatus(nextCollapsed);
	}, [applyMenuCollapsedState, setAdminMenuStatus, setCollapsed]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const handleResize = () => {
			setIsMobileMenu(isMobileMenuViewport());
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		if (!isMobileMenu) return;
		applyMenuCollapsedState(true);
	}, [isMobileMenu, applyMenuCollapsedState]);

	const collapseMenuOnMobile = useCallback(() => {
		if (isMobileMenu && !collapsed) {
			applyMenuCollapsedState(true);
		}
	}, [applyMenuCollapsedState, collapsed, isMobileMenu]);

	useEffect(() => {
		const unlisten = history.listen(() => {
			collapseMenuOnMobile();
		});
		return () => {
			if (typeof unlisten === "function") {
				unlisten();
			}
		};
	}, [collapseMenuOnMobile, history]);

	const toggleCollapsed = () => {
		applyMenuCollapsedState(!collapsed);
	};

	// Retrieve user and selectedHotel details
	const { user } = isAuthenticated();
	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};

	const ownerIdFromHotel =
		selectedHotel?.belongsTo && typeof selectedHotel.belongsTo === "object"
			? selectedHotel.belongsTo._id
			: selectedHotel?.belongsTo;
	const userId = ownerIdFromHotel || user?.belongsToId || user?._id;
	const hotelId =
		selectedHotel?._id ||
		user?.hotelIdWork ||
		(Array.isArray(user?.hotelsToSupport)
			? user.hotelsToSupport[0]?._id || user.hotelsToSupport[0]
			: "");

	const roomCountDetails = selectedHotel.roomCountDetails || [];
	const roleNumbers = [
		Number(user?.role),
		...(Array.isArray(user?.roles) ? user.roles.map(Number) : []),
	].filter(Boolean);
	const roleDescriptions = [
		String(user?.roleDescription || "").toLowerCase(),
		...(Array.isArray(user?.roleDescriptions)
			? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
			: []),
	];
	const hasRole = (role) => roleNumbers.includes(Number(role));
	const hasRoleDescription = (description) =>
		roleDescriptions.includes(String(description || "").toLowerCase());
	const isSystemAdmin =
		hasRole(10000) ||
		hasRoleDescription("systemadmin") ||
		hasRoleDescription("system admin");
	const isManagerOrAdmin =
		hasRole(1000) ||
		hasRole(2000) ||
		isSystemAdmin ||
		hasRoleDescription("hotelmanager");
	const hasReception = hasRole(3000) || hasRoleDescription("reception");
	const hasOrderTaker = hasRole(7000) || hasRoleDescription("ordertaker");
	const hasFinance = hasRole(6000) || hasRoleDescription("finance");
	const hasReservationEmployee =
		hasRole(8000) || hasRoleDescription("reservationemployee");
	const hasHousekeeping =
		hasRole(4000) ||
		hasRole(5000) ||
		hasRoleDescription("housekeepingmanager") ||
		hasRoleDescription("housekeeping");
	const isLimitedOrderTaker = hasOrderTaker && !hasReception && !isManagerOrAdmin;
	const isFinanceOnly =
		hasFinance &&
		!isManagerOrAdmin &&
		!hasReception &&
		!hasOrderTaker &&
		!hasReservationEmployee;
	const isReservationEmployeeOnly =
		hasReservationEmployee &&
		!isManagerOrAdmin &&
		!hasReception &&
		!hasOrderTaker &&
		!hasFinance;
	const reservationPath = `/hotel-management/new-reservation/${userId}/${hotelId}${
		isLimitedOrderTaker
			? "?newReservation"
			: isReservationEmployeeOnly
			  ? "?pendingConfirmation"
			  : isFinanceOnly
			    ? "?pendingConfirmation"
			    : ""
	}`;
	const canShowNavItem = (key) => {
		if (["signout"].includes(key)) return true;
		if (["divider1", "divider2"].includes(key)) {
			return isManagerOrAdmin || hasFinance || hasOrderTaker;
		}
		if (key === "sub1") return isManagerOrAdmin || hasFinance || hasRole(4000);
		if (key === "sub3") {
			return (
				isManagerOrAdmin ||
				hasReception ||
				hasOrderTaker ||
				hasFinance ||
				hasReservationEmployee
			);
		}
		if (key === "sub4" || key === "sub18") return isManagerOrAdmin || hasFinance;
		if (key === "sub6") return isManagerOrAdmin || hasReservationEmployee;
		if (key === "sub8") return isManagerOrAdmin;
		if (key === "sub7") return isManagerOrAdmin || hasHousekeeping;
		if (key === "sub16") return isManagerOrAdmin || hasFinance || hasOrderTaker;
		if (["sub13", "sub14", "sub15", "sub16", "sub17"].includes(key)) {
			return isManagerOrAdmin;
		}
		return true;
	};

	const items = [
		getItem(
			<Link to={`/hotel-management/dashboard/${userId}/${hotelId}`}>
				لوحة تحكم الإدارة
			</Link>,
			"sub1",
			<PieChartOutlined />,
		),
		getItem(
			<Link to={reservationPath}>
				الحجوزات
			</Link>,
			"sub3",
			<ShopOutlined />,
		),
		getItem(
			<Link to={`/hotel-management/hotel-reports/${userId}/${hotelId}`}>
				تقارير الفندق
			</Link>,
			"sub4",
			<AreaChartOutlined />,
		),
		getItem(
			<Link
				to={`/hotel-management/settings/${userId}/${hotelId}/?activeTab=HotelDetails&currentStep=0`}
			>
				إعدادات الفندق
			</Link>,
			"sub6",
			<SettingOutlined />,
		),
		getItem(
			<Link to={`/hotel-management/house-keeping/${userId}/${hotelId}`}>
				هاوس كيبينج
			</Link>,
			"sub7",
			<BankTwoTone />,
		),
		getItem(
			<Link to={`/hotel-management/staff/${userId}/${hotelId}`}>
				طاقم الفندق
			</Link>,
			"sub8",
			<TeamOutlined />,
		),
		getItem(
			<div className='margin-divider'></div>,
			"divider1",
			null,
			null,
			"divider",
		),
		getItem(
			"إدارة الواردات",
			"sub13",
			<ImportOutlined />,
			null,
			null,
			"black-bg",
		),
		getItem(
			<Link to={`/hotel-management/customer-service/${userId}/${hotelId}`}>
				CRM
			</Link>,
			"sub14",
			<CustomerServiceOutlined />,
			null,
			null,
			"black-bg",
		),
		getItem(
			"نقاط البيع والمنتجات",
			"sub15",
			<ShopOutlined />,
			null,
			null,
			"black-bg",
		),
		getItem(
			"المالية",
			"sub16",
			<DollarCircleOutlined />,
			null,
			null,
			"black-bg",
		),
		getItem(
			"حسابات الموظفين",
			"sub17",
			<TeamOutlined />,
			null,
			null,
			"black-bg",
		),
		getItem(
			<div className='margin-divider'></div>,
			"divider2",
			null,
			null,
			"divider2",
		),
		getItem(
			<Link to={`/hotel-management-payment/${userId}/${hotelId}`}>
				المدفوعات
			</Link>,
			"sub18",
			<CreditCardOutlined />,
			null,
			null,
			"red-bg",
		),
		getItem(
			<div style={{ fontWeight: "bold", textDecoration: "underline" }}>
				Signout
			</div>,
			"signout",
			<CreditCardOutlined />,
			null,
			null,
			"reddish-bg",
		),
	];

	return (
		<>
			<TopNavbar
				chosenLanguage={chosenLanguage}
				collapsed={collapsed}
				roomCountDetails={roomCountDetails}
			/>
			{isMobileMenu && !collapsed && (
				<MobileMenuBackdrop
					type='button'
					aria-label='Close mobile side menu'
					onClick={collapseMenuOnMobile}
				/>
			)}
			<AdminNavbarWrapper
				$show={collapsed}
				$show2={clickedOn}
				style={{
					width: collapsed ? 80 : isMobileMenu ? "min(90vw, 340px)" : 285,
				}}
				dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			>
				<Button
					className='menu-toggle-button'
					type='primary'
					onClick={toggleCollapsed}
				>
					{collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
				</Button>
				<Menu
					dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
					defaultSelectedKeys={
						fromPage === "AdminDasboard"
							? "sub1"
							: fromPage === "Reservations"
							  ? "sub2"
							  : fromPage === "NewReservation"
							    ? "sub3"
							    : fromPage === "HotelReports"
							      ? "sub4"
							      : fromPage === "StoreBilling"
							        ? "sub5"
							        : fromPage === "HotelSettings"
							          ? "sub6"
							          : fromPage === "HouseKeeping"
							            ? "sub7"
							            : fromPage === "HotelStaff"
							              ? "sub8"
							              : fromPage === "Payment"
							                ? "sub18"
							                : fromPage === "Financials"
							                  ? "sub16"
							                : fromPage === "CouponManagement"
							                  ? "sub12"
							                  : "sub1"
					}
					defaultOpenKeys={["sub1"]}
					mode='inline'
					theme='dark'
					inlineCollapsed={collapsed}
					items={items.filter((item) => canShowNavItem(item?.key))}
					onClick={(e) => {
						if (e.key === "signout") {
							handleSignout(history);
						}
						if (e.key === "sub16") {
							history.push(`/hotel-management/financials/${userId}/${hotelId}`);
						}

						if (e.key === "StoreLogo") {
							setClickedOn(true);
						} else {
							setClickedOn(false);
						}
						collapseMenuOnMobile();
						return <Redirect to={e.key} />;
					}}
				/>
			</AdminNavbarWrapper>
		</>
	);
};

export default AdminNavbarArabic;

const MobileMenuBackdrop = styled.button`
	display: none;
	border: 0;
	margin: 0;
	padding: 0;

	@media (max-width: 1200px) {
		display: block;
		position: fixed;
		top: 70px;
		left: 0;
		width: 100vw;
		height: calc(100vh - 70px);
		background: rgba(7, 10, 20, 0.45);
		z-index: 890;
		cursor: pointer;
	}
`;

const AdminNavbarWrapper = styled.div`
	margin-bottom: 15px;
	background: #1e1e2d;
	top: 70px !important;
	z-index: 1100;
	overflow: hidden;
	position: absolute;
	padding: 0px !important;
	position: fixed; // Add this line
	right: 0; // Since the menu is on the right-hand side
	height: calc(100vh - 70px); // Make it full height below the top navbar
	width: ${(props) => (props.$show ? "80px" : "286px")};

	.menu-toggle-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 34px;
		margin: ${(props) =>
			props.$show ? "8px auto 8px" : "8px 12px 8px auto"};
		position: sticky;
		top: 8px;
		border-radius: 8px;
		box-shadow: 0 6px 14px rgba(13, 110, 253, 0.22);
		z-index: 1200;
	}

	ul {
		height: calc(100% - 50px) !important;
		min-height: 0 !important;
		width: 100% !important;
		padding: 0 6px 8px !important;
		margin: 0 !important;
		overflow: hidden !important;
	}

	li {
		/* margin: 20px auto; */
		font-size: ${(props) => (props.$show ? "0.86rem" : "0.88rem")};
		margin-bottom: 3px !important;
		text-align: right;
		color: white;
		font-weight: bolder;
		svg {
			color: #69c0ff;
		}
	}

	hr {
		color: white !important;
		background: white !important;
	}

	.ant-menu.ant-menu-inline-collapsed {
		min-height: 0 !important;
		/* position: fixed; */
	}

	.ant-menu-item,
	.ant-menu-submenu-title {
		height: clamp(29px, 4.05vh, 38px) !important;
		line-height: clamp(29px, 4.05vh, 38px) !important;
		margin: 0 4px 3px !important;
		border-radius: 8px;
		overflow: hidden;
	}

	.ant-menu-item-divider {
		height: 1px !important;
		line-height: 1px !important;
		min-height: 1px !important;
		margin: 2px 10px 4px !important;
		background: rgba(255, 255, 255, 0.12) !important;
	}

	.margin-divider {
		height: 1px;
		margin: 0;
	}

	.ant-menu-inline-collapsed > .ant-menu-item,
	.ant-menu-inline-collapsed > .ant-menu-submenu > .ant-menu-submenu-title {
		padding-inline: 0 !important;
		text-align: center;
	}

	.ant-menu-inline-collapsed .ant-menu-item-icon,
	.ant-menu-inline-collapsed .anticon {
		margin-inline: auto !important;
		font-size: 17px !important;
	}

	.ant-menu-inline-collapsed svg {
		margin-left: 0 !important;
	}

	.ant-menu.ant-menu-dark,
	.ant-menu.ant-menu-dark {
		color: rgba(255, 255, 255, 0.65);
		background: #1e1e2d !important;
		width: 100% !important;
		border-inline-end: 0 !important;
	}

	svg {
		margin-left: 8px;
	}

	.black-bg {
		background-color: #0e0e15 !important;

		&:hover {
			background-color: #001427 !important; // Or any other color for hover state
		}
	}

	.red-bg {
		background-color: #270000 !important;

		&:hover {
			background-color: #270000 !important; // Or any other color for hover state
		}
	}

	.ant-menu-item-selected {
		background: black !important;
	}

	@media (max-width: 1650px) {
		background: #1e1e2d;

		ul {
			width: 100% !important;
			padding: 0 6px 8px !important;
			margin: 0px !important;
		}

		ul > li {
			font-size: 0.78rem !important;
			margin-bottom: 2px !important;
		}

		.ant-menu-item,
		.ant-menu-submenu-title {
			height: clamp(28px, 3.95vh, 36px) !important;
			line-height: clamp(28px, 3.95vh, 36px) !important;
			margin-bottom: 2px !important;
		}
	}

	@media (max-width: 1200px) {
		top: 70px !important;
		right: 0;
		height: calc(100vh - 70px);
		width: ${(props) =>
			props.$show ? "80px" : "min(90vw, 340px)"} !important;
		background: #1e1e2d;
		border-left: ${(props) =>
			props.$show ? "none" : "1px solid rgba(255, 255, 255, 0.08)"};
		box-shadow: ${(props) =>
			props.$show ? "none" : "-8px 0 22px rgba(0, 0, 0, 0.35)"};
		transition: width 0.22s ease, box-shadow 0.22s ease;
		overflow: hidden;

		ul {
			display: ${(props) => (props.$show ? "none" : "block")};
			width: 100%;
			height: calc(100% - 50px) !important;
			min-height: 0 !important;
			margin-top: 4px !important;
			top: 0 !important;
			padding: 0 6px 8px !important;
			overflow: hidden !important;
		}

		li {
			margin-bottom: 2px !important;
			font-size: 0.8rem !important;
		}

		.ant-menu-item,
		.ant-menu-submenu-title {
			height: clamp(27px, 3.85vh, 35px) !important;
			line-height: clamp(27px, 3.85vh, 35px) !important;
			margin-bottom: 2px !important;
		}

		.ant-menu.ant-menu-dark,
		.ant-menu-dark .ant-menu-sub,
		.ant-menu.ant-menu-dark .ant-menu-sub {
			background: ${(props) => (props.$show ? "transparent" : "#1e1e2d")}
				!important;
		}

		.menu-toggle-button {
			margin: 8px !important;
			top: 8px !important;
			right: 8px !important;
			position: sticky;
			border-radius: 10px;
			box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
			z-index: 1200;
		}
	}

	@media (max-width: 560px) {
		width: ${(props) => (props.$show ? "56px" : "min(92vw, 340px)")}
			!important;
		background: ${(props) => (props.$show ? "transparent" : "#1e1e2d")};
		box-shadow: ${(props) =>
			props.$show ? "none" : "-8px 0 22px rgba(0, 0, 0, 0.35)"};
		pointer-events: ${(props) => (props.$show ? "none" : "auto")};

		.menu-toggle-button {
			position: fixed !important;
			right: 8px !important;
			top: 13px !important;
			min-width: 44px;
			width: 44px;
			z-index: 1205;
			pointer-events: auto;
		}
	}
`;
