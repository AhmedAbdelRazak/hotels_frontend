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
	InboxOutlined,
	ShopOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import { Button, Menu } from "antd";
import { useCartContext } from "../../cart_context";
import { isAuthenticated, signout } from "../../auth";
import { isConfiguredSuperAdminUser } from "../utils/superUsers";
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

const adminArabicItems = [
	getItem(<Link to='/admin/dashboard'>لوحة التحكم الرئيسية</Link>, "sub1", <PieChartOutlined />),
	getItem(
		<Link to='/admin/janat-website' style={{ fontWeight: "bold" }}>
			موقع جنات بوكينج
		</Link>,
		"sub10",
		<DollarCircleOutlined />
	),
	getItem(<Link to='/admin/customer-service'>خدمة العملاء</Link>, "sub2", <AreaChartOutlined />),
	getItem(<Link to='/admin/all-reservations'>حجوزات الفنادق</Link>, "sub4", <ShopOutlined />),
	getItem(<Link to='/admin/jannatbooking-tools'>أدوات جنات بوكينج</Link>, "sub6", <AreaChartOutlined />),
	getItem(<Link to='/admin/overall-hotel-reports'>تقارير الفنادق</Link>, "sub7", <TeamOutlined />),
	getItem(<div className='margin-divider'></div>, "divider1", null, null, "divider"),
	getItem(<Link to='/admin/add-owner-account'>إضافة حساب مالك</Link>, "sub13", <ImportOutlined />, null, null, "black-bg"),
	getItem("إدارة علاقات العملاء", "sub14", <CustomerServiceOutlined />, null, null, "black-bg"),
	getItem("نقاط البيع والمنتجات", "sub15", <ShopOutlined />, null, null, "black-bg"),
	getItem(<Link to='/admin/expenses-financials'>المالية</Link>, "sub16", <DollarCircleOutlined />, null, null, "black-bg"),
	getItem("حسابات الموظفين", "sub17", <TeamOutlined />, null, null, "black-bg"),
	getItem(<div className='margin-divider'></div>, "divider2", null, null, "divider2"),
	getItem(<Link to='/admin/payouts-report'>المدفوعات</Link>, "sub18", <CreditCardOutlined />, null, null, "red-bg"),
	getItem(
		<div style={{ fontWeight: "bold", textDecoration: "underline" }}>
			تسجيل الخروج
		</div>,
		"signout",
		<CreditCardOutlined />,
		null,
		null,
		"reddish-bg"
	),
];

void items;
void adminArabicItems;

const AR = {
	dashboard: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
	website: "\u0645\u0648\u0642\u0639 \u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u062c",
	customerService: "\u062e\u062f\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
	reservations: "\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
	otaReservations: "\u062d\u062c\u0648\u0632\u0627\u062a OTA",
	tools: "\u0623\u062f\u0648\u0627\u062a \u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u062c",
	reports: "\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
	globalSettings:
		"\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0643\u0644 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
	newHotel: "\u0625\u0636\u0627\u0641\u0629 \u0641\u0646\u062f\u0642 \u062c\u062f\u064a\u062f",
	ownerAccount:
		"\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0631\u0641\u0648\u0636\u0629",
	customerRelations: "\u0625\u062f\u0627\u0631\u0629 \u0639\u0644\u0627\u0642\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
	pos: "\u0646\u0642\u0627\u0637 \u0627\u0644\u0628\u064a\u0639 \u0648\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
	financials: "\u0627\u0644\u0645\u0627\u0644\u064a\u0629",
	employees: "\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646",
	payouts: "\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a",
	signout: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c",
};

const adminArabicItemsClean = [
	getItem(<Link to='/admin/dashboard'>{AR.dashboard}</Link>, "sub1", <PieChartOutlined />),
	getItem(
		<Link to='/admin/janat-website' style={{ fontWeight: "bold" }}>
			{AR.website}
		</Link>,
		"sub10",
		<DollarCircleOutlined />
	),
getItem(<Link to='/admin/customer-service'>{AR.customerService}</Link>, "sub2", <AreaChartOutlined />),
getItem(<Link to='/admin/all-reservations'>{AR.reservations}</Link>, "sub4", <ShopOutlined />),
getItem(<Link to='/admin/ota-reservations'>{AR.otaReservations}</Link>, "sub19", <InboxOutlined />),
getItem(<Link to='/admin/jannatbooking-tools'>{AR.tools}</Link>, "sub6", <AreaChartOutlined />),
	getItem(<Link to='/admin/overall-hotel-reports'>{AR.reports}</Link>, "sub7", <TeamOutlined />),
	getItem(
		<Link to='/admin/global-hotel-settings'>{AR.globalSettings}</Link>,
		"sub20",
		<SettingOutlined />
	),
	getItem(<div className='margin-divider'></div>, "divider1", null, null, "divider"),
	getItem(
		<Link to='/hotel-management/main-dashboard?overall=rejected-reservations&page=1'>
			{AR.ownerAccount}
		</Link>,
		"sub13",
		<ImportOutlined />,
		null,
		null,
		"black-bg"
	),
	getItem(<Link to='/admin/expenses-financials'>{AR.financials}</Link>, "sub16", <DollarCircleOutlined />, null, null, "black-bg"),
	getItem(<Link to='/admin/accounts-management'>{AR.employees}</Link>, "sub17", <TeamOutlined />, null, null, "black-bg"),
	getItem(<div className='margin-divider'></div>, "divider2", null, null, "divider2"),
	getItem(<Link to='/admin/payouts-report'>{AR.payouts}</Link>, "sub18", <CreditCardOutlined />, null, null, "red-bg"),
	getItem(
		<div style={{ fontWeight: "bold", textDecoration: "underline" }}>
			{AR.signout}
		</div>,
		"signout",
		<CreditCardOutlined />,
		null,
		null,
		"reddish-bg"
	),
];

const selectedKeyByPage = {
	AdminDasboard: "sub1",
	CustomerService: "sub2",
	ElIntegrator: "sub3",
	AllReservations: "sub4",
	OTAReservations: "sub19",
	Tools: "sub6",
	AdminReports: "sub7",
	GlobalHotelSettings: "sub20",
	AddedHotels: "sub8",
	WebsiteManagement: "sub10",
	JanatWebsite: "sub10",
	NewHotel: "sub12",
	OwnerAccount: "sub13",
	Financials: "sub16",
	AdminAccounts: "sub17",
	Payouts: "sub18",
};

const AdminNavbarArabic = ({
	fromPage,
	setAdminMenuStatus,
	collapsed,
	setCollapsed,
}) => {
	const { chosenLanguage } = useCartContext();

	React.useEffect(() => {
		if (typeof window === "undefined" || typeof document === "undefined") {
			return undefined;
		}

		const syncSidebarWidth = () => {
			const width = window.innerWidth <= 992 ? "0px" : collapsed ? "70px" : "285px";
			document.documentElement.style.setProperty(
				"--admin-sidebar-width",
				width
			);
		};

		syncSidebarWidth();
		window.addEventListener("resize", syncSidebarWidth);

		return () => window.removeEventListener("resize", syncSidebarWidth);
	}, [collapsed]);

	const toggleCollapsed = () => {
		setCollapsed(!collapsed);
		setAdminMenuStatus(!collapsed);
	};

	const history = useHistory();
	const authUser = (isAuthenticated() || {}).user || {};
	const canSeeOtaReservations = canAccessOtaReservations(authUser);
	const visibleItems = canSeeOtaReservations
		? adminArabicItemsClean
		: adminArabicItemsClean.filter((item) => item.key !== "sub19");
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
					defaultSelectedKeys={[selectedKeyByPage[fromPage] || "sub1"]}
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

export default AdminNavbarArabic;

const AdminNavbarWrapper = styled.div`
	width: ${(props) => (props.show ? "70px" : "285px")};
	margin-bottom: 0;
	background: #0c1d31;
	top: var(--admin-topbar-height, 0px);
	left: auto;
	right: 0;
	z-index: 900;
	overflow: hidden;
	position: fixed;
	height: calc(100vh - var(--admin-topbar-height, 0px));
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
		background: #0c1d31;
	}

	svg {
		margin-left: 10px;
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
		border-inline-start: 3px solid #73cdf4;
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
		right: 0;
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
	justify-content: ${(props) => (props.$rtl ? "flex-start" : "flex-end")};
	padding: 10px 12px;
	background: linear-gradient(180deg, #102d4f 0%, #071827 100%);
	position: sticky;
	top: 0;
	z-index: 2;
	border-bottom: 1px solid #1f2937;
	flex-direction: ${(props) => (props.$rtl ? "row-reverse" : "row")};

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
	top: calc(var(--admin-topbar-height, 0px) + 12px);
	right: 12px;
	z-index: 910;
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
	z-index: 890;
	opacity: ${(props) => (props.$visible ? 1 : 0)};
	pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
	transition: opacity 0.2s ease;

	@media (max-width: 992px) {
		display: block;
	}
`;
