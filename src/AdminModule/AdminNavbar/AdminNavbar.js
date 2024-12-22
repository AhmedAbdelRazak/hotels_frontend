// eslint-disable-next-line
import React, { useState } from "react";
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
import LastAddedLogoImage from "./LastAddedLogoImage";
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
		<div className='logoClass'></div>,
		"StoreLogo",
		<LastAddedLogoImage />
	),
	getItem(
		<div className='logoClass '></div>,
		"StoreLogo",
		<div
			className='logoClass no-background'
			style={{
				width: "100%",
			}}
		>
			<hr />
		</div>
	),
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

	getItem(<Link to='#'>Hotel Settings</Link>, "sub6", <AreaChartOutlined />),

	getItem(<Link to='#'>Hotel Branches</Link>, "sub7", <TeamOutlined />),

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
	getItem("Payments", "sub18", <CreditCardOutlined />, null, null, "red-bg"),
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
	const [clickedOn, setClickedOn] = useState(false);

	const toggleCollapsed = () => {
		setCollapsed(!collapsed);
		setAdminMenuStatus(!collapsed);
	};

	const history = useHistory();

	return (
		<AdminNavbarWrapper
			show={collapsed}
			show2={clickedOn}
			style={{
				width: 285,
			}}
		>
			<Button
				type='primary'
				onClick={toggleCollapsed}
				style={{
					marginBottom: 8,
					textAlign: "center",
				}}
			>
				{collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
			</Button>
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
						        : fromPage === "AddSubCategory"
						          ? "sub6"
						          : fromPage === "AddOccasions"
						            ? "sub7"
						            : fromPage === "AddProducts"
						              ? "sub8"
						              : fromPage === "JanatWebsite"
						                ? "sub10"
						                : fromPage === "CouponManagement"
						                  ? "sub12"
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

					if (e.key === "StoreLogo") {
						setClickedOn(true);
					} else {
						setClickedOn(false);
					}
					return <Redirect to={e.key} />;
				}}
			/>
		</AdminNavbarWrapper>
	);
};

export default AdminNavbar;

const AdminNavbarWrapper = styled.div`
	margin-bottom: 15px;
	background: ${(props) => (props.show ? "" : "#1e1e2d")};
	top: 0px !important;
	z-index: 20000;
	overflow: auto;
	position: absolute;
	padding: 0px !important;

	ul {
		height: 90vh !important;
	}

	.logoClass {
		display: ${(props) => (props.show ? "none " : "block")} !important;
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
		min-height: 850px;
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

	.ant-menu-item-selected {
		background: ${(props) => (props.show2 ? "none !important" : "")};
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
		background: ${(props) => (props.show ? "" : "transparent")};

		ul {
			width: 250px;
			padding: 0px !important;
			margin: 0px !important;
		}

		ul > li {
			font-size: 0.8rem !important;
		}
	}

	@media (max-width: 1200px) {
		width: ${(props) => (props.show ? "20%" : "60%")} !important;

		ul {
			display: ${(props) => (props.show ? "none" : "")};
			margin-top: 0px !important;
			top: 0px !important;
		}

		.ant-menu.ant-menu-dark {
			/* position: fixed; */
		}

		button {
			margin-top: 5px !important;
		}
	}
`;
