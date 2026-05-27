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
		hotelMap: "Hotel Rooms Map",
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
		hotelMap: "\u062e\u0631\u064a\u0637\u0629 \u063a\u0631\u0641 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
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
	hotelMap: "\u062e\u0631\u064a\u0637\u0629 \u063a\u0631\u0641 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
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
			["hotelmanager", "finance"].some((role) => hasDescription(user, role)) ||
			isOrderTakingScope(user)
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
			if (overallValue === "summary") {
				const summaryParams = new URLSearchParams();
				const ownerId = params.get("ownerId") || user?._id || "";
				if (ownerId) summaryParams.set("ownerId", ownerId);
				summaryParams.set("overall", "summary");
				summaryParams.set("page", "1");
				return `/hotel-management/main-dashboard?${summaryParams.toString()}`;
			}
			[
				"modal",
				"hotelId",
				"mapHotelId",
				"mapOwnerId",
				"reservationId",
				"step",
				"summaryTab",
				"listPage",
				"listSearch",
				"dateFrom",
				"dateTo",
				"dateBy",
				"sortBy",
				"tab",
				"reservationTab",
				"agentId",
				"transactionId",
				"startDate",
				"endDate",
				"actionType",
				"invCal",
				"invHMonth",
				"invHYear",
				"invStart",
				"invEnd",
				"invHotel",
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
		[location.search, user?._id]
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
				menuLink("summary", text.overallSummary),
				"overall-summary",
				<BarChartOutlined />,
				null,
				null,
				"overall-menu-row"
			),
			getItem(
				menuLink("", text.mainDashboard),
				"overall-dashboard",
				<DashboardOutlined />,
				null,
				null,
				"overall-menu-row"
			),
			getItem(menuText(text.reservations), "overall-reservations", <CalendarOutlined />, [
				getItem(
					menuLink("new-reservation", text.newReservation),
					"overall-new-reservation",
					<PlusCircleOutlined />,
					null,
					null,
					"overall-menu-child"
				),
				getItem(
					menuLink("reservation-main", reservationsListLabel, { tab: "list" }),
					"overall-reservation-list",
					<UnorderedListOutlined />,
					null,
					null,
					"overall-menu-child"
				),
				getItem(
					menuLink("pending-reservations", text.pendingReservations),
					"overall-pending-reservations",
					<ClockCircleOutlined />,
					null,
					null,
					"overall-menu-child"
				),
			], null, "overall-menu-section"),
			getItem(
				menuLink("hotel-map", text.hotelMap),
				"overall-hotel-map",
				<EnvironmentOutlined />,
				null,
				null,
				"overall-menu-row"
			),
			getItem(
				menuLink("housekeeping", text.houseKeeping),
				"overall-housekeeping",
				<ClearOutlined />,
				null,
				null,
				"overall-menu-row"
			),
			getItem(
				menuText(text.financialAffairs),
				"overall-financials",
				<DollarCircleOutlined />,
				[
					getItem(
						menuLink("financial-report", text.generalFinancialReport),
						"overall-financial-report",
						<FileTextOutlined />,
						null,
						null,
						"overall-menu-child"
					),
					getItem(
						menuLink("financial-actions", text.pendingFinancialActions),
						"overall-financial-actions",
						<AuditOutlined />,
						null,
						null,
						"overall-menu-child"
					),
					getItem(
						menuLink("wallet-management", text.addingUpdatingWallets),
						"overall-wallet-management",
						<CreditCardOutlined />,
						null,
						null,
						"overall-menu-child"
					),
				],
				null,
				"overall-menu-section"
			),
			getItem(menuText(text.accountManagement), "overall-account-management", <TeamOutlined />, [
				getItem(
					menuLink("account-management", text.accountManagementMain),
					"overall-account-main",
					<IdcardOutlined />,
					null,
					null,
					"overall-menu-child"
				),
				getItem(
					menuLink("create-account", text.createNewAccount),
					"overall-create-account",
					<UserAddOutlined />,
					null,
					null,
					"overall-menu-child"
				),
				getItem(
					menuLink("activate-accounts", text.activateAccounts),
					"overall-activate-accounts",
					<SafetyCertificateOutlined />,
					null,
					null,
					"overall-menu-child"
				),
				getItem(
					menuLink("update-account", text.updateExistingAccount),
					"overall-update-account",
					<EditOutlined />,
					null,
					null,
					"overall-menu-child"
				),
			], null, "overall-menu-section"),
			getItem(
				menuLink("settings", text.overallSettings),
				"overall-settings",
				<SettingOutlined />,
				null,
				null,
				"overall-menu-row"
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
	background:
		linear-gradient(180deg, rgba(141, 76, 157, 0.08) 0%, rgba(0, 0, 0, 0) 34%),
		#1b1726;
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
	font-family: ${(props) =>
		props.$isArabic
			? `"Droid Arabic Kufi", "Tajawal", "Cairo", "Noto Kufi Arabic", "Segoe UI", Tahoma, Arial, sans-serif`
			: `"Inter", "Segoe UI", Arial, sans-serif`};
	letter-spacing: 0;

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
		padding: 6px 0 12px !important;
		margin: 0 !important;
		overflow-x: hidden !important;
		overflow-y: auto !important;
		scrollbar-width: thin;
	}

	li {
		font-size: ${(props) => (props.$show ? "0.86rem" : "0.9rem")};
		margin-bottom: 0 !important;
		color: white;
		font-weight: 900;
		letter-spacing: 0;

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
		font-size: 15px;
		color: #83cfff !important;
		transition: color 0.18s ease, transform 0.18s ease;
	}

	.ant-menu-item,
	.ant-menu-submenu-title {
		height: 42px !important;
		line-height: 42px !important;
		margin: 0 10px 2px !important;
		border-radius: 3px;
		overflow: hidden;
		display: flex !important;
		align-items: center !important;
		position: relative;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			color 0.18s ease,
			box-shadow 0.18s ease,
			transform 0.18s ease;
	}

	.ant-menu-item::after {
		display: none !important;
	}

	.ant-menu-inline .ant-menu-item,
	.ant-menu-inline .ant-menu-submenu-title {
		padding-inline: 16px 12px !important;
	}

	.overall-menu-row.ant-menu-item,
	.ant-menu-sub .overall-menu-child.ant-menu-item {
		background: linear-gradient(180deg, #29243a 0%, #242235 100%) !important;
		color: #f7f7fb !important;
		box-shadow: inset 0 -1px rgba(255, 255, 255, 0.035);
	}

	.overall-menu-row.ant-menu-item:nth-of-type(even),
	.ant-menu-sub .overall-menu-child.ant-menu-item:nth-of-type(even) {
		background: linear-gradient(180deg, #232031 0%, #1f1d2d 100%) !important;
	}

	.ant-menu-item:hover,
	.ant-menu-submenu-title:hover {
		background: linear-gradient(180deg, #342746 0%, #292238 100%) !important;
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
		height: 34px !important;
		line-height: 34px !important;
		margin: 10px 10px 2px !important;
		font-size: ${(props) => (props.$show ? "0.86rem" : "0.94rem")};
		font-weight: 950;
		color: #d99225 !important;
		background: transparent !important;
		border-radius: 0;
		letter-spacing: 0;
	}

	.ant-menu-submenu > .ant-menu-submenu-title .ant-menu-item-icon,
	.ant-menu-submenu > .ant-menu-submenu-title .anticon {
		font-size: 15px;
		color: #d99225 !important;
	}

	.ant-menu-submenu > .ant-menu-submenu-title .overall-menu-text {
		color: #d99225 !important;
		font-size: inherit;
	}

	.ant-menu-submenu-arrow {
		color: #d99225 !important;
		opacity: 0.95;
	}

	.ant-menu-submenu-selected > .ant-menu-submenu-title {
		color: #f7f7fb !important;
		background: linear-gradient(
			${(props) => (props.$isArabic ? "270deg" : "90deg")},
			rgba(217, 146, 37, 0.13),
			rgba(255, 255, 255, 0.035) 62%,
			transparent
		) !important;
		box-shadow: inset ${(props) => (props.$isArabic ? "-2px" : "2px")} 0 0
			rgba(217, 146, 37, 0.75);
	}

	.ant-menu-submenu-selected > .ant-menu-submenu-title .overall-menu-text,
	.ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-item-icon,
	.ant-menu-submenu-selected > .ant-menu-submenu-title .anticon {
		color: #ffd28a !important;
	}

	.ant-menu-sub .ant-menu-item {
		font-size: ${(props) => (props.$show ? "0.82rem" : "0.88rem")};
		font-weight: 900;
		margin-inline: 12px 10px !important;
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
		line-height: 1.55;
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

	.ant-menu-inline-collapsed .ant-menu-item-selected {
		margin-inline: 10px !important;
		padding-inline: 0 !important;
		justify-content: center !important;
		transform: none;
	}

	.ant-menu-inline-collapsed .ant-menu-item-selected::before {
		top: 7px;
		bottom: 7px;
		left: ${(props) => (props.$isArabic ? "auto" : "0")};
		right: ${(props) => (props.$isArabic ? "0" : "auto")};
		width: 2px;
		height: auto;
		transform: none;
	}

	.ant-menu-inline-collapsed .ant-menu-item-selected .ant-menu-item-icon {
		width: 28px;
		height: 28px;
		min-width: 28px;
		background: rgba(255, 255, 255, 0.08);
	}

	.ant-menu.ant-menu-dark,
	.ant-menu-dark .ant-menu-sub,
	.ant-menu.ant-menu-dark .ant-menu-sub {
		color: rgba(255, 255, 255, 0.65);
		background: #1b1726 !important;
		width: 100% !important;
		border-inline-end: 0 !important;
	}

	.ant-menu-item-selected,
	.ant-menu-dark .ant-menu-item-selected,
	.ant-menu-dark > .ant-menu .ant-menu-item-selected {
		background: ${(props) =>
			props.$show2
				? "transparent !important"
				: `linear-gradient(${
						props.$isArabic ? "270deg" : "90deg"
				  }, rgba(217, 146, 37, 0.15), rgba(99, 31, 115, 0.42) 48%, rgba(255, 255, 255, 0.05)) !important`};
		border: 1px solid rgba(217, 146, 37, 0.25) !important;
		border-radius: 5px !important;
		color: #ffffff !important;
		box-shadow:
			inset ${(props) => (props.$isArabic ? "-3px" : "3px")} 0 0 #d99225,
			0 5px 14px rgba(0, 0, 0, 0.22);
		transform: none;
	}

	.ant-menu-item-selected::before {
		content: "";
		position: absolute;
		inset-inline-start: ${(props) => (props.$isArabic ? "auto" : "0")};
		inset-inline-end: ${(props) => (props.$isArabic ? "0" : "auto")};
		top: 8px;
		bottom: 8px;
		width: 2px;
		border-radius: 999px;
		background: rgba(255, 210, 138, 0.88);
		box-shadow: 0 0 8px rgba(255, 210, 138, 0.34);
	}

	.ant-menu-item-selected .overall-menu-link,
	.ant-menu-item-selected .overall-menu-text {
		color: #fff8e8 !important;
		font-weight: 950;
	}

	.ant-menu-item-selected .ant-menu-item-icon,
	.ant-menu-item-selected .anticon {
		color: #ffd28a !important;
		filter: none;
		transform: none;
	}

	.ant-menu-item-selected .ant-menu-item-icon {
		width: 24px;
		height: 24px;
		min-width: 24px;
		border-radius: 999px;
		background: rgba(255, 210, 138, 0.1);
	}

	.reddish-bg {
		background-color: #4a0505 !important;
		border-radius: 4px !important;
		margin: 8px 10px 0 !important;
		box-shadow: inset ${(props) => (props.$isArabic ? "-4px" : "4px")} 0 0
			#b91c1c;
	}

	@media (max-width: 1650px) {
		ul > li {
			font-size: 0.84rem !important;
			margin-bottom: 0 !important;
		}

		.ant-menu-item,
		.ant-menu-submenu-title {
			height: 39px !important;
			line-height: 39px !important;
			margin-bottom: 2px !important;
		}

		.ant-menu-submenu > .ant-menu-submenu-title {
			height: 32px !important;
			line-height: 32px !important;
			font-size: 0.86rem !important;
		}

		.ant-menu-sub .ant-menu-item {
			font-size: 0.82rem !important;
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
		background: #1b1726;
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
		background: ${(props) => (props.$show ? "transparent" : "#1b1726")};
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
