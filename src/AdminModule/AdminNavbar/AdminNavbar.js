// eslint-disable-next-line
import React from "react";
import styled from "styled-components";
import { Redirect, Link } from "react-router-dom";
import {
	AreaChartOutlined,
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
import { Button, Menu } from "antd";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { signout } from "../../auth";

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
		<Link to='/admin/customer-service'>Customer Service</Link>,
		"sub2",
		<AreaChartOutlined />
	),
	getItem(
		<Link to='/admin/el-integrator'>El Integrator</Link>,
		"sub3",
		<SettingOutlined />
	),
	getItem(
		<Link to='/admin/all-reservations'>Hotels' Reservations</Link>,
		"sub4",
		<ShopOutlined />
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
		<div className='margin-divider'></div>,
		"divider1",
		null,
		null,
		"divider"
	),
	getItem(
		"Create Hotel Subscription",
		"sub13",
		<ImportOutlined />,
		null,
		null,
		"black-bg"
	),
	getItem("CRM", "sub14", <CustomerServiceOutlined />, null, null, "black-bg"),
	getItem("POS & Products", "sub15", <ShopOutlined />, null, null, "black-bg"),
	getItem(
		"Financials",
		"sub16",
		<DollarCircleOutlined />,
		null,
		null,
		"black-bg"
	),
	getItem(
		"Employee Accounts",
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
	const toggleCollapsed = () => {
		setCollapsed(!collapsed);
		setAdminMenuStatus(!collapsed);
	};

	const history = useHistory();
	const isMobile = () =>
		typeof window !== "undefined" && window.innerWidth <= 992;

	const closeMenuOnMobile = () => {
		if (!isMobile()) return;
		setCollapsed(true);
		setAdminMenuStatus(false);
	};

	return (
		<>
			<MobileToggleButton
				type='primary'
				shape='circle'
				aria-label={collapsed ? "Open menu" : "Close menu"}
				onClick={toggleCollapsed}
				$visible={collapsed}
			>
				{collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
			</MobileToggleButton>
			<MobileBackdrop
				onClick={toggleCollapsed}
				$visible={!collapsed}
			/>
			<AdminNavbarWrapper show={collapsed}>
				<NavHeader>
					<div className='logo'>
						<img
							src='https://xhotelpro.com/static/media/XHotelLogo.706e3ec89ab26bfecf21.png'
							alt='XHotel Logo'
						/>
					</div>
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
						      : fromPage === "StoreBilling"
						        ? "sub5"
						        : fromPage === "Tools"
						          ? "sub6"
						          : fromPage === "AdminReports"
						            ? "sub7"
						            : fromPage === "AddProducts"
						              ? "sub8"
						              : fromPage === "JanatWebsite"
						                ? "sub10"
						                : fromPage === "CouponManagement"
						                  ? "sub12"
						                  : fromPage === "Payouts"
						                    ? "sub18"
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
				items={items}
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
	background: #1e1e2d;
	top: 0;
	left: 0;
	z-index: 1500; /* stays behind app modals */
	overflow: hidden;
	position: fixed;
	height: 100vh;
	padding: 0 !important;
	display: flex;
	flex-direction: column;
	border-right: 1px solid #0d1220;
	transition: width 0.2s ease, transform 0.25s ease;
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
		background: #1e1e2d !important;
	}

	.ant-menu.ant-menu-dark,
	.ant-menu-dark {
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
	justify-content: space-between;
	padding: 10px 12px;
	background: #0f1726;
	position: sticky;
	top: 0;
	z-index: 2;
	border-bottom: 1px solid #1f2937;

	.logo img {
		height: 40px;
		object-fit: contain;
		display: block;
	}

	button {
		color: #fff;
	}

	@media (max-width: 1200px) {
		padding: 8px 10px;
		.logo img {
			height: 34px;
		}
	}
`;

const MobileToggleButton = styled(Button)`
	display: none;
	position: fixed;
	top: 12px;
	left: 12px;
	z-index: 1601;
	box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
	opacity: ${(props) => (props.$visible ? 1 : 0)};
	pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
	transition: opacity 0.2s ease;

	@media (max-width: 992px) {
		display: inline-flex;
	}
`;

const MobileBackdrop = styled.div`
	display: none;
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 38, 0.45);
	z-index: 1490;
	opacity: ${(props) => (props.$visible ? 1 : 0)};
	pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
	transition: opacity 0.2s ease;

	@media (max-width: 992px) {
		display: block;
	}
`;
