// eslint-disable-next-line
import React, { useEffect, useState } from "react";
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

const AdminNavbarArabic = ({
	fromPage,
	setAdminMenuStatus,
	collapsed,
	setCollapsed,
}) => {
	const [clickedOn, setClickedOn] = useState(false);
	const { chosenLanguage } = useCartContext();
	const toggleCollapsed = () => {
		setCollapsed(!collapsed);
		setAdminMenuStatus(!collapsed);
	};
	const history = useHistory();

	// Retrieve user and selectedHotel details
	const { user } = isAuthenticated();
	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};

	const userId = selectedHotel.belongsTo._id
		? selectedHotel.belongsTo._id
		: user._id;
	const hotelId = selectedHotel._id;

	const roomCountDetails = selectedHotel.roomCountDetails || [];

	const items = [
		getItem(
			<Link to={`/hotel-management/dashboard/${userId}/${hotelId}`}>
				لوحة تحكم الإدارة
			</Link>,
			"sub1",
			<PieChartOutlined />,
		),
		getItem(
			<Link to={`/hotel-management/new-reservation/${userId}/${hotelId}`}>
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
			<AdminNavbarWrapper
				show={collapsed}
				show2={clickedOn}
				style={{
					width: collapsed ? 80 : 285,
				}}
				dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			>
				<Button
					type='primary'
					onClick={toggleCollapsed}
					style={{
						marginBottom: 8,
						textAlign: "center",
						marginLeft: chosenLanguage === "Arabic" ? (collapsed ? 5 : 200) : 5,
						marginTop: chosenLanguage === "Arabic" ? 10 : 10,
						top: collapsed ? "10px" : "",
						right: collapsed ? "10px" : "",
						zIndex: collapsed ? 1000 : "",
					}}
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
							                : fromPage === "CouponManagement"
							                  ? "sub12"
							                  : "sub1"
					}
					defaultOpenKeys={["sub1"]}
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
		</>
	);
};

export default AdminNavbarArabic;

const AdminNavbarWrapper = styled.div`
	margin-bottom: 15px;
	background: ${(props) => (props.show ? "" : "#262639")};
	top: ${(props) => (props.show ? "20px" : "69px")} !important;
	z-index: 20000;
	overflow: auto;
	position: absolute;
	padding: 0px !important;
	position: fixed; // Add this line
	top: 0; // Adjust as needed
	right: 0; // Since the menu is on the right-hand side
	height: 100vh; // Make it full height

	ul {
		height: 90vh !important;
	}

	li {
		/* margin: 20px auto; */
		font-size: 0.9rem;
		margin-bottom: ${(props) => (props.show ? "20px " : "15px")};
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
		min-height: 850px;
		/* position: fixed; */
	}

	.ant-menu.ant-menu-dark,
	.ant-menu.ant-menu-dark {
		color: rgba(255, 255, 255, 0.65);
		background: ${(props) => (props.show ? "" : "#262639")};
	}

	svg {
		margin-left: 10px;
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
		background: ${(props) => (props.show ? "" : "")};

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
		width: ${(props) => (props.show ? "80px" : "75%")} !important;

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
