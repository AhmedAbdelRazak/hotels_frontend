// eslint-disable-next-line
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Redirect, Link } from "react-router-dom";
import {
	AreaChartOutlined,
	BankTwoTone,
	BarChartOutlined,
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
import { useCartContext } from "../../cart_context";
import { signout } from "../../auth";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";

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
		<Link to='/admin/dashboard'>لوحة التحكم الرئيسية</Link>,
		"sub1",
		<PieChartOutlined />
	),
	getItem(
		<Link to='/admin/reports'>تقرير المتجر</Link>,
		"sub2",
		<AreaChartOutlined />
	),
	getItem(
		<Link to='/admin/store-management'>إعدادات المتجر</Link>,
		"sub3",
		<SettingOutlined />
	),
	getItem(
		<Link to='/admin/create/category'>إضافة فئة</Link>,
		"sub4",
		<ShopOutlined />
	),

	getItem(
		<Link to='/admin/create/subcategory'>إضافة فئة فرعية</Link>,
		"sub6",
		<AreaChartOutlined />
	),

	getItem(
		<Link to='/admin/create/occasions'>إضافة مناسبة</Link>,
		"sub7",
		<TeamOutlined />
	),

	getItem(
		<Link to='/admin/create/product'>إضافة المنتجات</Link>,
		"sub8",
		<BankTwoTone />
	),

	getItem(
		<Link to='/admin/website-management'>إدارة الموقع</Link>,
		"sub10",
		<>
			<DollarCircleOutlined />
		</>
	),

	getItem(
		<Link to='/admin/manage-coupons'>إدارة الكوبونات</Link>,
		"sub12",
		<>
			<BarChartOutlined />
		</>
	),
	getItem(
		<div className='margin-divider'></div>,
		"divider1",
		null,
		null,
		"divider"
	),
	getItem(
		"إدارة الواردات",
		"sub13",
		<ImportOutlined />,
		null,
		null,
		"black-bg"
	),
	getItem(
		"إدارة علاقات العملاء",
		"sub14",
		<CustomerServiceOutlined />,
		null,
		null,
		"black-bg"
	),
	getItem("فروع المتجر", "sub15", <ShopOutlined />, null, null, "black-bg"),
	getItem("المالية", "sub16", <DollarCircleOutlined />, null, null, "black-bg"),
	getItem("حسابات الموظفين", "sub17", <TeamOutlined />, null, null, "black-bg"),
	getItem(
		<div className='margin-divider'></div>,
		"divider2",
		null,
		null,
		"divider2"
	),
	getItem("مدفوعاتي", "sub18", <CreditCardOutlined />, null, null, "red-bg"),
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

	return (
		<AdminNavbarWrapper
			show={collapsed}
			show2={clickedOn}
			style={{
				width: 285,
			}}
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
		>
			<Button
				type='primary'
				onClick={toggleCollapsed}
				style={{
					marginBottom: 8,
					textAlign: "center",
					marginLeft: chosenLanguage === "Arabic" ? 200 : 5,
					marginTop: chosenLanguage === "Arabic" ? 10 : 10,
				}}
			>
				{collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
			</Button>
			<Menu
				dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
				defaultSelectedKeys={
					fromPage === "AdminDasboard"
						? "sub1"
						: fromPage === "OverallReports"
						  ? "sub2"
						  : fromPage === "StoreSettings"
						    ? "sub3"
						    : fromPage === "AddCategories"
						      ? "sub4"
						      : fromPage === "StoreBilling"
						        ? "sub5"
						        : fromPage === "AddSubCategory"
						          ? "sub6"
						          : fromPage === "AddOccasions"
						            ? "sub7"
						            : fromPage === "AddProducts"
						              ? "sub8"
						              : fromPage === "WebsiteManagement"
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

export default AdminNavbarArabic;

const AdminNavbarWrapper = styled.div`
	width: ${(props) => (props.show ? "70px" : "285px")};
	margin-bottom: 0;
	background: ${(props) => (props.show ? "" : "#1e1e2d")};
	top: 0;
	left: auto;
	right: 0;
	z-index: 1500;
	overflow: hidden;
	position: fixed;
	height: 100vh;
	padding: 0 !important;
	display: flex;
	flex-direction: column;
	border-left: 1px solid #0d1220;

	ul {
		flex: 1 1 auto;
		height: auto !important;
		overflow-y: auto;
		scrollbar-width: thin;
	}

	.logoClass {
		display: ${(props) => (props.show ? "none " : "block")} !important;
	}

	img {
		margin-right: 50px;
	}

	li {
		/* margin: 20px auto; */
		font-size: 0.9rem;
		margin-bottom: ${(props) => (props.show ? "20px " : "15px")};
		text-align: right;
	}

	hr {
		color: white !important;
		background: white !important;
	}

	.ant-menu.ant-menu-inline-collapsed {
		min-height: 0;
	}

	.ant-menu.ant-menu-dark,
	.ant-menu.ant-menu-dark {
		color: rgba(255, 255, 255, 0.65);
		background: #1e1e2d;
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
