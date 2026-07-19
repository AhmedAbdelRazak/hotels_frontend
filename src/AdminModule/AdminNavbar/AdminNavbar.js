// eslint-disable-next-line
import React from "react";
import styled from "styled-components";
import { Redirect, Link } from "react-router-dom";
import {
	AreaChartOutlined,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	PieChartOutlined,
	ImportOutlined,
	CreditCardOutlined,
	DollarCircleOutlined,
	InboxOutlined,
	SettingOutlined,
	ShopOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import { Button, Menu } from "antd";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { isAuthenticated, signout } from "../../auth";
import { isConfiguredSuperAdminUser } from "../utils/superUsers";
import {
	adminSidebarRootWidth,
	isAdminMobileViewport,
	shouldCloseAdminSidebarForViewport,
} from "./adminSidebarViewport";

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

const hasPlatformAdminRole = (user = {}) =>
	[
		Number(user?.role),
		...(Array.isArray(user?.roles) ? user.roles.map(Number) : []),
	].includes(1000);

const canAccessOtaReservations = (user = {}) =>
	isConfiguredSuperAdminUser(user) ||
	(hasPlatformAdminRole(user) &&
		Array.isArray(user?.accessTo) &&
		user.accessTo.includes("OTAReservations"));

const items = [
	getItem(
		<Link to='/admin/dashboard'>Admin Dashboard</Link>,
		"sub1",
		<PieChartOutlined />
	),
	getItem(
		<Link to='/admin/janat-website' style={{ fontWeight: "bold" }}>
			JANNAT BOOKING WEBSITE
		</Link>,
		"sub10",
		<>
			<DollarCircleOutlined />
		</>
	),
getItem(
	<Link to='/admin/customer-service?tab=active-client-cases'>Customer Service</Link>,
	"sub2",
	<AreaChartOutlined />
),
getItem(
	<Link to='/admin/all-reservations'>Hotels' Reservations</Link>,
	"sub4",
		<ShopOutlined />
	),
getItem(
	<Link to='/admin/ota-reservations'>OTA Reservations</Link>,
	"sub19",
	<InboxOutlined />
),

	getItem(
		<Link to='/admin/jannatbooking-tools'>Jannat Booking Tools</Link>,
		"sub6",
		<AreaChartOutlined />
	),

getItem(
	<Link to='/admin/overall-hotel-reports'>Hotel Reports</Link>,
	"sub7",
	<TeamOutlined />
),
getItem(
	<Link to='/admin/global-hotel-settings'>Global Hotel Settings</Link>,
	"sub20",
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
	<Link to='/admin/rejected-reservations'>
		Rejected Reservations
	</Link>,
	"sub13",
	<ImportOutlined />,
	null,
	null,
	"black-bg"
),
getItem(
	<Link to='/admin/expenses-financials'>Financials</Link>,
	"sub16",
	<DollarCircleOutlined />,
		null,
		null,
		"black-bg"
),
getItem(
	<Link to='/admin/accounts-management'>Employee Accounts</Link>,
	"sub17",
	<TeamOutlined />,
	null,
	null,
		"black-bg"
	),
	getItem(
		<div className='margin-divider'></div>,
		"divider2",
		null,
		null,
		"divider2"
	),
	getItem(
		<Link to='/admin/payouts-report'>Payouts/ Payments</Link>,
		"sub18",
		<CreditCardOutlined />,
		null,
		null,
		"red-bg"
	),
	getItem(
		<div style={{ fontWeight: "bold", textDecoration: "underline" }}>
			Signout
		</div>,
		"signout", // The key used in the Menu's onClick handler
		<CreditCardOutlined />,
		null,
		null,
		"reddish-bg"
	),

	// getItem("Option 3", "4", <ContainerOutlined />),
];

const AdminNavbar = ({
	fromPage,
	setAdminMenuStatus,
	collapsed,
	setCollapsed,
}) => {
	const mobileModeRef = React.useRef(null);

	React.useEffect(() => {
		if (typeof window === "undefined" || typeof document === "undefined") {
			return undefined;
		}

		const syncSidebarWidth = () => {
			const mobile = isAdminMobileViewport(window.innerWidth);
			const width = adminSidebarRootWidth(window.innerWidth, collapsed);
			document.documentElement.style.setProperty(
				"--admin-sidebar-width",
				width
			);
			if (shouldCloseAdminSidebarForViewport(mobileModeRef.current, mobile)) {
				setCollapsed(true);
				setAdminMenuStatus(false);
			}
			mobileModeRef.current = mobile;
		};

		syncSidebarWidth();
		window.addEventListener("resize", syncSidebarWidth);

		return () => window.removeEventListener("resize", syncSidebarWidth);
	}, [collapsed, setAdminMenuStatus, setCollapsed]);

	React.useEffect(() => {
		if (
			typeof window === "undefined" ||
			typeof document === "undefined" ||
		!isAdminMobileViewport(window.innerWidth) ||
			collapsed
		) {
			return undefined;
		}
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [collapsed]);

	const toggleCollapsed = () => {
		setCollapsed(!collapsed);
		setAdminMenuStatus(!collapsed);
	};

	const history = useHistory();
	const authUser = (isAuthenticated() || {}).user || {};
	const canSeeOtaReservations = canAccessOtaReservations(authUser);
	const visibleItems = canSeeOtaReservations
		? items
		: items.filter((item) => item.key !== "sub19");
	const isMobile = () =>
		typeof window !== "undefined" &&
		isAdminMobileViewport(window.innerWidth);

	const closeMenuOnMobile = () => {
		if (!isMobile()) return;
		setCollapsed(true);
		setAdminMenuStatus(false);
	};

	return (
		<>
			<MobileToggleButton
				type='primary'
				aria-label={collapsed ? "Open menu" : "Close menu"}
				aria-controls='admin-mobile-sidebar'
				aria-expanded={!collapsed}
				onClick={toggleCollapsed}
				$visible={collapsed}
			>
				{collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
				<span>Menu</span>
			</MobileToggleButton>
			<MobileBackdrop onClick={toggleCollapsed} $visible={!collapsed} />
			<AdminNavbarWrapper id='admin-mobile-sidebar' show={collapsed}>
				<NavHeader>
					<Button
						type='text'
						shape='circle'
						aria-label={collapsed ? "Open menu" : "Close menu"}
						onClick={toggleCollapsed}
						icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
					/>
				</NavHeader>
				<Menu
					defaultSelectedKeys={
						fromPage === "AdminDasboard"
							? "sub1"
							: fromPage === "CustomerService"
							  ? "sub2"
							  : fromPage === "ElIntegrator"
							    ? "sub3"
							    : fromPage === "AllReservations"
							      ? "sub4"
							      : fromPage === "OTAReservations"
							        ? "sub19"
							        : fromPage === "StoreBilling"
							          ? "sub5"
							          : fromPage === "Tools"
							            ? "sub6"
							            : fromPage === "AdminReports"
							              ? "sub7"
							              : fromPage === "GlobalHotelSettings"
							                ? "sub20"
							                : fromPage === "AddProducts"
							                  ? "sub8"
							                  : fromPage === "JanatWebsite"
							                    ? "sub10"
							                    : fromPage === "NewHotel"
							                      ? "sub12"
							                      : fromPage === "OwnerAccount" ||
							                        fromPage === "RejectedReservations"
							                        ? "sub13"
							                        : fromPage === "Payouts"
							                          ? "sub18"
							                          : fromPage === "Financials"
							                            ? "sub16"
							                            : fromPage === "AdminAccounts"
							                              ? "sub17"
							                              : "sub1"
					}
					defaultOpenKeys={[
						"sub1",

						// fromPage === "AddGender" ||
						// fromPage === "UpdateGender" ||
						// fromPage === "DeleteGender"
						// 	? "sub2"
						// 	: null,

						// "sub4",

						// "sub6",
					]}
					mode='inline'
					theme='dark'
					inlineCollapsed={collapsed}
					items={visibleItems}
					onClick={(e) => {
						if (e.key === "signout") {
							handleSignout(history);
						}
						closeMenuOnMobile();
						return <Redirect to={e.key} />;
					}}
				/>
			</AdminNavbarWrapper>
		</>
	);
};

export default AdminNavbar;

const AdminNavbarWrapper = styled.div`
	width: ${(props) => (props.show ? "70px" : "285px")};
	margin-bottom: 0;
	background: #0c1d31;
	top: var(--admin-topbar-height, 0px);
	left: 0;
	z-index: 900; /* stays behind app modals */
	overflow: hidden;
	position: fixed;
	height: calc(100vh - var(--admin-topbar-height, 0px));
	padding: 0 !important;
	display: flex;
	flex-direction: column;
	border-right: 1px solid #0d1220;
	transition:
		width 0.2s ease,
		transform 0.25s ease;
	will-change: transform;

	ul {
		flex: 1 1 auto;
		height: auto !important;
		overflow-y: auto;
		scrollbar-width: thin;
	}

	li {
		/* margin: 20px auto; */
		font-size: 0.9rem;
		margin-bottom: ${(props) => (props.show ? "20px " : "15px")};
	}

	hr {
		color: white !important;
		background: white !important;
	}

	.ant-menu.ant-menu-inline-collapsed {
		min-height: 0;
		/* position: fixed; */
	}

	.ant-menu.ant-menu-dark,
	.ant-menu-dark .ant-menu-sub,
	.ant-menu.ant-menu-dark .ant-menu-sub {
		color: rgba(255, 255, 255, 0.65);
		background: #0c1d31 !important;
	}

	.ant-menu.ant-menu-dark,
	.ant-menu-dark {
	}

	.black-bg {
		background-color: #071626 !important;

		&:hover {
			background-color: #0e3157 !important; // Or any other color for hover state
		}
	}

	.red-bg {
		background-color: #102033 !important;

		&:hover {
			background-color: #0e3157 !important; // Or any other color for hover state
		}
	}

	.ant-menu-item-selected {
		background: linear-gradient(180deg, #1b6fa5 0%, #09223a 100%) !important;
		border-inline-end: 3px solid #73cdf4;
	}

	@media (max-width: 1650px) {
		ul {
			width: 250px;
			padding: 0px !important;
			margin: 0px !important;
		}

		ul > li {
			font-size: 0.8rem !important;
		}
	}

	@media (max-width: 992px) {
		left: 0;
		width: min(86vw, 320px);
		transform: translateX(${(props) => (props.show ? "-110%" : "0")});
		box-shadow: ${(props) =>
			props.show ? "none" : "0 18px 40px rgba(0, 0, 0, 0.35)"};

		ul {
			margin-top: 0px !important;
			top: 0px !important;
		}

		li {
			margin-bottom: 8px;
		}
	}
`;

const NavHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: 10px 12px;
	background: linear-gradient(180deg, #102d4f 0%, #071827 100%);
	position: sticky;
	top: 0;
	z-index: 2;
	border-bottom: 1px solid #1f2937;

	button {
		color: #fff;
	}

	@media (max-width: 1200px) {
		padding: 8px 10px;
	}
`;

const MobileToggleButton = styled(Button)`
	display: none;
	position: fixed;
	top: calc(var(--admin-topbar-height, 0px) + 10px);
	left: max(12px, env(safe-area-inset-left));
	z-index: 920;
	min-height: 42px;
	padding-inline: 14px;
	border: 1px solid rgba(151, 220, 251, 0.74) !important;
	border-radius: 999px !important;
	background: linear-gradient(135deg, #0b2947 0%, #155d95 65%, #2490c8 100%) !important;
	box-shadow: 0 9px 24px rgba(8, 42, 75, 0.3) !important;
	font-weight: 900;
	opacity: ${(props) => (props.$visible ? 1 : 0)};
	pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
	transition: opacity 0.2s ease;

	@media (max-width: 992px) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
	}
`;

const MobileBackdrop = styled.div`
	display: none;
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 38, 0.45);
	z-index: 890;
	opacity: ${(props) => (props.$visible ? 1 : 0)};
	pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
	transition: opacity 0.2s ease;

	@media (max-width: 992px) {
		display: block;
	}
`;
