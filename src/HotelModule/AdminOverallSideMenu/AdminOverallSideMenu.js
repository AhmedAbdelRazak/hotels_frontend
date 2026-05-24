import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link, useHistory, useLocation } from "react-router-dom";
import {
	AuditOutlined,
	BarChartOutlined,
	CalendarOutlined,
	ClearOutlined,
	CreditCardOutlined,
	DashboardOutlined,
	DollarCircleOutlined,
	EditOutlined,
	EnvironmentOutlined,
	FileTextOutlined,
	IdcardOutlined,
	LogoutOutlined,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	PlusCircleOutlined,
	SafetyCertificateOutlined,
	SettingOutlined,
	TeamOutlined,
	UnorderedListOutlined,
	UserAddOutlined,
	ClockCircleOutlined,
} from "@ant-design/icons";
import { Button, Menu } from "antd";
import { isAuthenticated, signout } from "../../auth";
import { MENU_COLLAPSE_KEY } from "../utils/menuState";
import { isSuperAdminUser } from "../../AdminModule/utils/superUsers";

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

const SIDE_MENU_TEXT = {
	en: {
		mainDashboard: "Main Dashboard",
		overallSummary: "Overall Summary",
		reservations: "Reservations",
		newReservation: "New Reservation",
		reservationsList: "Reservations List",
		pendingReservations: "Pending Reservations",
		hotelMap: "Hotel Map",
		houseKeeping: "House Keeping",
		financialAffairs: "Financial Affairs",
		generalFinancialReport: "General Financial Report",
		pendingFinancialActions: "Pending Financial Actions",
		addingUpdatingWallets: "Adding / Updating Wallets",
		accountManagement: "Account Management",
		accountManagementMain: "Account Management Main",
		createNewAccount: "Create New Account",
		activateAccounts: "Activate Accounts",
		updateExistingAccount: "Update Existing Account",
		overallSettings: "Overall Settings",
		signout: "Signout",
		closeMenu: "Close mobile side menu",
	},
	ar: {
		mainDashboard: "لوحة التحكم الرئيسية",
		overallSummary: "الملخص العام",
		reservations: "الحجوزات",
		newReservation: "حجز جديد",
		pendingReservations: "الحجوزات المعلقة",
		hotelMap: "خريطة الفندق",
		houseKeeping: "النظافة",
		financialAffairs: "الشؤون المالية",
		generalFinancialReport: "التقرير المالي العام",
		pendingFinancialActions: "الإجراءات المالية المعلقة",
		accountManagement: "حسابات إدارة الفنادق",
		accountManagementMain: "لوحة إدارة الحسابات",
		createNewAccount: "إنشاء حساب جديد",
		activateAccounts: "تفعيل الحسابات",
		updateExistingAccount: "تحديث حساب موجود",
		overallSettings: "الإعدادات العامة",
		signout: "تسجيل الخروج",
		closeMenu: "إغلاق القائمة الجانبية",
	},
};

const SIDE_MENU_AR_TEXT = {
	mainDashboard: "لوحة التحكم الرئيسية",
	overallSummary: "الملخص العام",
	reservations: "الحجوزات",
	newReservation: "حجز جديد",
	pendingReservations: "الحجوزات المعلقة",
	hotelMap: "خريطة الفندق",
	houseKeeping: "النظافة",
	financialAffairs: "الشؤون المالية",
	generalFinancialReport: "التقرير المالي العام",
	pendingFinancialActions: "الإجراءات المالية المعلقة",
	addingUpdatingWallets: "\u0625\u0636\u0627\u0641\u0629 / \u062a\u062d\u062f\u064a\u062b \u0645\u062d\u0627\u0641\u0638 \u0627\u0644\u0648\u0643\u0644\u0627\u0621",
	accountManagement: "حسابات إدارة الفنادق",
	accountManagementMain: "لوحة إدارة الحسابات",
	createNewAccount: "إنشاء حساب جديد",
	activateAccounts: "تفعيل الحسابات",
	updateExistingAccount: "تحديث حساب موجود",
	overallSettings: "الإعدادات العامة",
	signout: "تسجيل الخروج",
	closeMenu: "إغلاق القائمة الجانبية",
};

const MOBILE_MENU_BREAKPOINT = 1200;

const isMobileMenuViewport = () => {
	if (typeof window === "undefined") return false;
	return window.innerWidth <= MOBILE_MENU_BREAKPOINT;
};

const roleNumbers = (user = {}) => [
	Number(user.role),
	...(Array.isArray(user.roles) ? user.roles.map(Number) : []),
];

const roleDescriptions = (user = {}) => [
	String(user.roleDescription || "").toLowerCase(),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const hasRole = (user, role) => roleNumbers(user).includes(Number(role));
const hasDescription = (user, description) =>
	roleDescriptions(user).includes(String(description || "").toLowerCase());

const normalizeRoleKey = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/[\s_-]+/g, "");

const isOrderTakingScope = (user = {}) => {
	const descriptions = roleDescriptions(user).map(normalizeRoleKey);
	const accessTo = Array.isArray(user.accessTo) ? user.accessTo : [];
	return (
		hasRole(user, 7000) ||
		descriptions.includes("ordertaker") ||
		accessTo.includes("ownReservations")
	);
};

const isSystemAdmin = (user = {}) =>
	hasRole(user, 10000) ||
	hasDescription(user, "systemadmin") ||
	hasDescription(user, "system admin");

const isOwnerLike = (user = {}) =>
	isSuperAdminUser(user) ||
	hasRole(user, 1000) ||
	(hasRole(user, 2000) && !user.belongsToId) ||
	isSystemAdmin(user);

const canViewOverallKey = (user = {}, key = "") => {
	if (["overall-dashboard", "signout"].includes(key)) return true;
	if (isOwnerLike(user)) return true;

	if (["overall-summary"].includes(key)) {
		return [
			"hotelmanager",
			"finance",
			"reservationemployee",
			"housekeepingmanager",
		].some((role) => hasDescription(user, role));
	}

	if (["overall-new-reservation"].includes(key)) {
		return (
			[3000, 7000, 8000].some((role) => hasRole(user, role)) ||
			["hotelmanager", "reception", "ordertaker", "reservationemployee"].some(
				(role) => hasDescription(user, role)
			) ||
			(Array.isArray(user.accessTo) && user.accessTo.includes("newReservation"))
		);
	}

	if (["overall-reservation-list"].includes(key)) {
		return (
			[3000, 6000, 7000, 8000].some((role) => hasRole(user, role)) ||
			[
				"hotelmanager",
				"reception",
				"finance",
				"ordertaker",
				"reservationemployee",
			].some((role) => hasDescription(user, role))
		);
	}

	if (
		[
			"overall-pending-reservations",
		].includes(key)
	) {
		return (
			[6000, 8000].some((role) => hasRole(user, role)) ||
			["hotelmanager", "finance", "reservationemployee"].some(
				(role) => hasDescription(user, role)
			) ||
			isOrderTakingScope(user)
		);
	}

	if (key === "overall-housekeeping") {
		return (
			[4000, 5000].some((role) => hasRole(user, role)) ||
			["hotelmanager", "housekeepingmanager", "housekeeping"].some((role) =>
				hasDescription(user, role)
			)
		);
	}

	if (
		[
			"overall-financial-report",
			"overall-financial-actions",
			"overall-wallet-management",
		].includes(key)
	) {
		return (
			hasRole(user, 6000) ||
			["hotelmanager", "finance"].some((role) => hasDescription(user, role))
		);
	}

	if (key === "overall-hotel-map") {
		return (
			[3000, 6000, 8000].some((role) =>
				hasRole(user, role)
			) ||
			[
				"hotelmanager",
				"reception",
				"finance",
				"reservationemployee",
			].some((role) => hasDescription(user, role))
		);
	}

	if (key === "overall-settings") {
		return hasRole(user, 8000) || ["hotelmanager", "reservationemployee"].some((role) =>
			hasDescription(user, role)
		);
	}

	if (
		[
			"overall-account-main",
			"overall-create-account",
			"overall-activate-accounts",
			"overall-update-account",
		].includes(key)
	) {
		return false;
	}

	return false;
};

const AdminOverallSideMenu = ({
	collapsed,
	setCollapsed,
	setAdminMenuStatus,
	chosenLanguage,
}) => {
	const [isMobileMenu, setIsMobileMenu] = useState(() =>
		isMobileMenuViewport()
	);
	const [clickedOn, setClickedOn] = useState(false);
	const history = useHistory();
	const location = useLocation();
	const auth = isAuthenticated() || {};
	const user = auth.user || {};
	const isArabic = chosenLanguage === "Arabic";
	const text = isArabic ? SIDE_MENU_AR_TEXT : SIDE_MENU_TEXT.en;
	const reservationsListLabel = isArabic
		? "قائمة الحجوزات"
		: text.reservationsList;

	const applyMenuCollapsedState = useCallback(
		(nextCollapsed) => {
			if (typeof setCollapsed === "function") setCollapsed(nextCollapsed);
			if (typeof setAdminMenuStatus === "function") {
				setAdminMenuStatus(nextCollapsed);
			}
			if (typeof window !== "undefined") {
				localStorage.setItem(MENU_COLLAPSE_KEY, String(nextCollapsed));
			}
		},
		[setAdminMenuStatus, setCollapsed]
	);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const stored = localStorage.getItem(MENU_COLLAPSE_KEY);
		if (stored !== null) {
			applyMenuCollapsedState(stored === "true");
		}
		const handleResize = () => {
			setIsMobileMenu(isMobileMenuViewport());
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [applyMenuCollapsedState]);

	useEffect(() => {
		if (!isMobileMenu) return;
		applyMenuCollapsedState(true);
	}, [applyMenuCollapsedState, isMobileMenu]);

	const collapseMenuOnMobile = useCallback(() => {
		if (isMobileMenu && !collapsed) {
			applyMenuCollapsedState(true);
		}
	}, [applyMenuCollapsedState, collapsed, isMobileMenu]);

	const buildOverallLink = useCallback(
		(overallValue = "", extraParams = {}) => {
			const params = new URLSearchParams(location.search || "");
			[
				"modal",
				"hotelId",
				"mapHotelId",
				"mapOwnerId",
				"reservationId",
				"step",
				"listPage",
				"listSearch",
				"dateFrom",
				"dateTo",
				"sortBy",
				"tab",
				"reservationTab",
				"agentId",
				"transactionId",
				"startDate",
				"endDate",
				"actionType",
			].forEach((key) => params.delete(key));
			if (overallValue) {
				params.set("overall", overallValue);
			} else {
				params.delete("overall");
			}
			Object.entries(extraParams || {}).forEach(([key, value]) => {
				if (value === undefined || value === null || value === "") {
					params.delete(key);
				} else {
					params.set(key, String(value));
				}
			});
			const search = params.toString();
			return `/hotel-management/main-dashboard${search ? `?${search}` : ""}`;
		},
		[location.search]
	);

	const menuLink = useCallback((overallValue, label, extraParams) => (
		<Link className='overall-menu-link' to={buildOverallLink(overallValue, extraParams)}>
			{label}
		</Link>
	), [buildOverallLink]);
	const menuText = useCallback(
		(label) => <span className='overall-menu-text'>{label}</span>,
		[]
	);

	const items = useMemo(
		() => [
			getItem(
				menuLink("", text.mainDashboard),
				"overall-dashboard",
				<DashboardOutlined />
			),
			getItem(
				menuLink("summary", text.overallSummary),
				"overall-summary",
				<BarChartOutlined />
			),
			getItem(menuText(text.reservations), "overall-reservations", <CalendarOutlined />, [
				getItem(
					menuLink("new-reservation", text.newReservation),
					"overall-new-reservation",
					<PlusCircleOutlined />
				),
				getItem(
					menuLink("reservation-main", reservationsListLabel, { tab: "list" }),
					"overall-reservation-list",
					<UnorderedListOutlined />
				),
				getItem(
					menuLink("pending-reservations", text.pendingReservations),
					"overall-pending-reservations",
					<ClockCircleOutlined />
				),
			]),
			getItem(
				menuLink("hotel-map", text.hotelMap),
				"overall-hotel-map",
				<EnvironmentOutlined />
			),
			getItem(
				menuLink("housekeeping", text.houseKeeping),
				"overall-housekeeping",
				<ClearOutlined />
			),
			getItem(
				menuText(text.financialAffairs),
				"overall-financials",
				<DollarCircleOutlined />,
				[
					getItem(
						menuLink("financial-report", text.generalFinancialReport),
						"overall-financial-report",
						<FileTextOutlined />
					),
					getItem(
						menuLink("financial-actions", text.pendingFinancialActions),
						"overall-financial-actions",
						<AuditOutlined />
					),
					getItem(
						menuLink("wallet-management", text.addingUpdatingWallets),
						"overall-wallet-management",
						<CreditCardOutlined />
					),
				]
			),
			getItem(menuText(text.accountManagement), "overall-account-management", <TeamOutlined />, [
				getItem(
					menuLink("account-management", text.accountManagementMain),
					"overall-account-main",
					<IdcardOutlined />
				),
				getItem(
					menuLink("create-account", text.createNewAccount),
					"overall-create-account",
					<UserAddOutlined />
				),
				getItem(
					menuLink("activate-accounts", text.activateAccounts),
					"overall-activate-accounts",
					<SafetyCertificateOutlined />
				),
				getItem(
					menuLink("update-account", text.updateExistingAccount),
					"overall-update-account",
					<EditOutlined />
				),
			]),
			getItem(
				menuLink("settings", text.overallSettings),
				"overall-settings",
				<SettingOutlined />
			),
			getItem(
				<div className='margin-divider'></div>,
				"divider1",
				null,
				null,
				"divider"
			),
			getItem(
				<div className='overall-menu-text signout-label'>
					{text.signout}
				</div>,
				"signout",
				<LogoutOutlined />,
				null,
				null,
				"reddish-bg"
			),
		],
		[menuLink, menuText, reservationsListLabel, text]
	);

	const filterItemsByRole = (list = []) =>
		list
			.map((item) => {
				if (item?.children) {
					const children = filterItemsByRole(item.children);
					if (!children.length) return null;
					return { ...item, children };
				}
				return canViewOverallKey(user, item?.key) ? item : null;
			})
			.filter(Boolean);
	const visibleItems = filterItemsByRole(items);

	const selectedKey = useMemo(() => {
		const params = new URLSearchParams(location.search || "");
		const overall = params.get("overall") || "";
		const map = {
			page: "overall-summary",
			summary: "overall-summary",
			"new-reservation": "overall-new-reservation",
			"reservation-main": "overall-reservation-list",
			"reservations-list": "overall-reservation-list",
			reservations: "overall-reservation-list",
			"pending-reservations": "overall-pending-reservations",
			housekeeping: "overall-housekeeping",
			"hotel-map": "overall-hotel-map",
			"account-management": "overall-account-main",
			"create-account": "overall-create-account",
			"activate-accounts": "overall-activate-accounts",
			"update-account": "overall-update-account",
			"financial-report": "overall-financial-report",
			"financial-actions": "overall-financial-actions",
			"wallet-management": "overall-wallet-management",
			settings: "overall-settings",
		};
		return map[overall] || "overall-dashboard";
	}, [location.search]);

	const toggleCollapsed = () => {
		applyMenuCollapsedState(!collapsed);
	};

	return (
		<>
			{isMobileMenu && !collapsed && (
				<MobileMenuBackdrop
					type='button'
					aria-label={text.closeMenu}
					onClick={collapseMenuOnMobile}
				/>
			)}
			<AdminOverallSideMenuWrapper
				$show={collapsed}
				$show2={clickedOn}
				$isArabic={isArabic}
				style={{
					width: collapsed ? 80 : isMobileMenu ? "min(90vw, 340px)" : 285,
				}}
				dir={isArabic ? "rtl" : "ltr"}
			>
				<Button
					className='menu-toggle-button'
					type='primary'
					onClick={toggleCollapsed}
					aria-label={collapsed ? "Open overall side menu" : text.closeMenu}
					aria-expanded={!collapsed}
				>
					{collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
				</Button>
				<Menu
					dir={isArabic ? "rtl" : "ltr"}
					selectedKeys={[selectedKey]}
					defaultOpenKeys={[
						"overall-reservations",
						"overall-financials",
					]}
					mode='inline'
					theme='dark'
					inlineCollapsed={collapsed}
					items={visibleItems}
					onClick={(event) => {
						if (event.key === "signout") {
							signout(() => {
								history.push("/");
							});
						}
						if (event.key) setClickedOn(false);
						collapseMenuOnMobile();
					}}
				/>
			</AdminOverallSideMenuWrapper>
		</>
	);
};

export default AdminOverallSideMenu;

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
		height: calc(100dvh - 70px);
		background: rgba(7, 10, 20, 0.45);
		z-index: 890;
		cursor: pointer;
	}
`;

const AdminOverallSideMenuWrapper = styled.div`
	margin-bottom: 15px;
	background: #1e1e2d;
	top: 70px !important;
	z-index: 1100;
	overflow: hidden;
	position: fixed;
	left: ${(props) => (props.$isArabic ? "auto" : "0")};
	right: ${(props) => (props.$isArabic ? "0" : "auto")};
	height: calc(100vh - 70px);
	height: calc(100dvh - 70px);
	width: ${(props) => (props.$show ? "80px" : "286px")};
	padding: 0 !important;

	.menu-toggle-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 34px;
		margin: ${(props) =>
			props.$show
				? "8px auto 8px"
				: props.$isArabic
				  ? "8px 12px 8px auto"
				  : "8px auto 8px 12px"};
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
		overflow-x: hidden !important;
		overflow-y: auto !important;
		scrollbar-width: thin;
	}

	li {
		font-size: ${(props) => (props.$show ? "0.86rem" : "0.88rem")};
		margin-bottom: 3px !important;
		color: white;
		font-weight: bolder;

		svg {
			color: currentColor;
		}
	}

	.ant-menu .ant-menu-item-icon,
	.ant-menu .anticon {
		display: inline-flex !important;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		font-size: 15.5px;
		color: #72c7ff !important;
		transition: color 0.18s ease, transform 0.18s ease;
	}

	.ant-menu-item,
	.ant-menu-submenu-title {
		height: clamp(29px, 4.05vh, 38px) !important;
		line-height: clamp(29px, 4.05vh, 38px) !important;
		margin: 0 4px 3px !important;
		border-radius: 8px;
		overflow: hidden;
		display: flex !important;
		align-items: center !important;
	}

	.ant-menu-item:hover,
	.ant-menu-submenu-title:hover {
		background: rgba(24, 144, 255, 0.14) !important;
		color: #ffffff !important;
	}

	.ant-menu-item:hover .ant-menu-item-icon,
	.ant-menu-submenu-title:hover .ant-menu-item-icon,
	.ant-menu-item:hover .anticon,
	.ant-menu-submenu-title:hover .anticon {
		color: #9ddcff !important;
		transform: translateY(-1px);
	}

	.ant-menu-submenu > .ant-menu-submenu-title {
		height: clamp(32px, 4.25vh, 40px) !important;
		line-height: clamp(32px, 4.25vh, 40px) !important;
		font-size: ${(props) => (props.$show ? "0.9rem" : "0.94rem")};
		font-weight: 900;
		color: #ffffff !important;
		background: rgba(255, 255, 255, 0.025);
	}

	.ant-menu-submenu > .ant-menu-submenu-title .ant-menu-item-icon,
	.ant-menu-submenu > .ant-menu-submenu-title .anticon {
		font-size: 16.5px;
		color: #8ed4ff !important;
	}

	.ant-menu-sub .ant-menu-item {
		font-size: ${(props) => (props.$show ? "0.82rem" : "0.84rem")};
		font-weight: 800;
	}

	.ant-menu-title-content {
		min-width: 0 !important;
		overflow: hidden !important;
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	}

	.overall-menu-link,
	.overall-menu-text {
		display: block;
		width: 100%;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: inherit;
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	}

	.overall-menu-link:hover {
		color: inherit;
	}

	.signout-label {
		font-weight: 900;
		text-decoration: underline;
		text-underline-offset: 2px;
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

	.ant-menu.ant-menu-dark,
	.ant-menu-dark .ant-menu-sub,
	.ant-menu.ant-menu-dark .ant-menu-sub {
		color: rgba(255, 255, 255, 0.65);
		background: #1e1e2d !important;
		width: 100% !important;
		border-inline-end: 0 !important;
	}

	.ant-menu-item-selected {
		background: ${(props) => (props.$show2 ? "none !important" : "black !important")};
	}

	.ant-menu-item-selected .ant-menu-item-icon,
	.ant-menu-item-selected .anticon {
		color: #9ddcff !important;
	}

	.reddish-bg {
		background-color: #270000 !important;
	}

	@media (max-width: 1650px) {
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

		.ant-menu-submenu > .ant-menu-submenu-title {
			height: clamp(31px, 4.15vh, 38px) !important;
			line-height: clamp(31px, 4.15vh, 38px) !important;
			font-size: 0.84rem !important;
		}

		.ant-menu-sub .ant-menu-item {
			font-size: 0.76rem !important;
		}
	}

	@media (max-width: 1200px) {
		top: 70px !important;
		left: ${(props) => (props.$isArabic ? "auto" : "0")};
		right: ${(props) => (props.$isArabic ? "0" : "auto")};
		height: calc(100vh - 70px);
		height: calc(100dvh - 70px);
		width: ${(props) =>
			props.$show ? "80px" : "min(92vw, 340px)"} !important;
		background: #1e1e2d;
		box-shadow: ${(props) =>
			props.$show ? "none" : "8px 0 22px rgba(0, 0, 0, 0.35)"};
		transition: width 0.22s ease, box-shadow 0.22s ease;

		ul {
			display: ${(props) => (props.$show ? "none" : "block")};
			width: 100%;
			height: calc(100% - 50px) !important;
			min-height: 0 !important;
			margin-top: 4px !important;
			padding: 0 6px 8px !important;
			overflow-x: hidden !important;
			overflow-y: auto !important;
		}

		li {
			font-size: 0.86rem !important;
			margin-bottom: 4px !important;
		}

		.ant-menu-item,
		.ant-menu-submenu-title {
			height: 42px !important;
			line-height: 42px !important;
			margin-bottom: 4px !important;
		}

		.ant-menu-submenu > .ant-menu-submenu-title {
			height: 44px !important;
			line-height: 44px !important;
			font-size: 0.92rem !important;
		}

		.ant-menu-sub .ant-menu-item {
			font-size: 0.84rem !important;
		}

		.menu-toggle-button {
			margin: ${(props) =>
				props.$isArabic ? "8px 8px 8px auto" : "8px auto 8px 8px"}
			!important;
			top: 8px !important;
			left: ${(props) => (props.$isArabic ? "auto" : "8px")} !important;
			right: ${(props) => (props.$isArabic ? "8px" : "auto")} !important;
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
			props.$show ? "none" : "8px 0 22px rgba(0, 0, 0, 0.35)"};
		pointer-events: ${(props) => (props.$show ? "none" : "auto")};

		.menu-toggle-button {
			position: fixed !important;
			left: ${(props) => (props.$isArabic ? "auto" : "8px")} !important;
			right: ${(props) => (props.$isArabic ? "8px" : "auto")} !important;
			top: 13px !important;
			min-width: 44px;
			width: 44px;
			z-index: 1205;
			pointer-events: auto;
		}
	}

	@media (max-width: 380px) {
		width: ${(props) => (props.$show ? "52px" : "96vw")} !important;

		.ant-menu-item,
		.ant-menu-submenu-title {
			height: 40px !important;
			line-height: 40px !important;
		}

		.ant-menu-submenu > .ant-menu-submenu-title {
			height: 42px !important;
			line-height: 42px !important;
			font-size: 0.88rem !important;
		}

		li {
			font-size: 0.8rem !important;
		}
	}
`;
