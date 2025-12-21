// eslint-disable-next-line
import React from "react";
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
	const { chosenLanguage } = useCartContext();

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
			<MobileBackdrop onClick={toggleCollapsed} $visible={!collapsed} />
			<AdminNavbarWrapper
				show={collapsed}
				dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			>
				<NavHeader $rtl={chosenLanguage === "Arabic"}>
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
						closeMenuOnMobile();
						return <Redirect to={e.key} />;
					}}
				/>
			</AdminNavbarWrapper>
		</>
	);
};

export default AdminNavbarArabic;

const AdminNavbarWrapper = styled.div`
	width: ${(props) => (props.show ? "70px" : "285px")};
	margin-bottom: 0;
	background: #1e1e2d;
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
		text-align: right;
	}

	.ant-menu.ant-menu-inline-collapsed {
		min-height: 0;
	}

	.ant-menu.ant-menu-dark,
	.ant-menu.ant-menu-dark .ant-menu-sub,
	.ant-menu.ant-menu-dark .ant-menu-sub {
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
		transform: translateX(${(props) => (props.show ? "110%" : "0")});
		box-shadow: ${(props) =>
			props.show ? "none" : "-18px 0 40px rgba(0, 0, 0, 0.35)"};

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
	flex-direction: ${(props) => (props.$rtl ? "row-reverse" : "row")};

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
	right: 12px;
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
