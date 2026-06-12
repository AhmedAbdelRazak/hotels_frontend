import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import styled from "styled-components";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { readUserId } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ReservationsOverview from "./ReservationsOverview";
import HotelsInventoryMap from "./HotelsInventoryMap";
import PaidReportAdmin from "./PaidReportAdmin";
import ProfitReportAdmin from "./ProfitReportAdmin";
import { isSuperAdminUser } from "../utils/superUsers";

const VALID_REPORT_TABS = ["reservations", "inventory", "paid-overview", "Profit"];
const normalizeReportTab = (tab) => {
	const normalized = String(tab || "").trim();
	if (normalized.toLowerCase() === "profit") return "Profit";
	return VALID_REPORT_TABS.includes(normalized) ? normalized : "reservations";
};

const HOTEL_REPORTS_TEXT = {
	en: {
		passwordTitle: "Enter Password",
		passwordPlaceholder: "Enter password",
		verify: "Verify Password",
		passwordVerified: "Password verified successfully",
		incorrectPassword: "Incorrect password. Please try again.",
		reservations: "Reservations Overview",
		inventory: "Hotels Inventory",
		paidOverview: "Paid Reservations Overview",
		profit: "Profit",
	},
	ar: {
		passwordTitle: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		passwordPlaceholder: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		verify: "\u062a\u062d\u0642\u0642",
		passwordVerified:
			"\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.",
		incorrectPassword:
			"\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629.",
		reservations:
			"\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		inventory:
			"\u0645\u062e\u0632\u0648\u0646 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		paidOverview:
			"\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629",
		profit: "\u0627\u0644\u0631\u0628\u062d",
	},
};

const HotelReportsMainAdmin = ({ chosenLanguage }) => {
	const isArabic = chosenLanguage === "Arabic";
	const L = HOTEL_REPORTS_TEXT[isArabic ? "ar" : "en"];
	const { user, token } = isAuthenticated() || {};
	const isConfiguredSuperAdmin = isSuperAdminUser(user);
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(
		isConfiguredSuperAdmin
	);
	const [activeTab, setActiveTab] = useState("reservations");
	const [getUser, setGetUser] = useState(null);
	const accessList = useMemo(() => {
		return Array.isArray(getUser?.accessTo) ? getUser.accessTo : [];
	}, [getUser?.accessTo]);
	const isSuperAdmin =
		isConfiguredSuperAdmin ||
		isSuperAdminUser(getUser);
	const location = useLocation();
	const history = useHistory();

	/* ------------------ 1) Fetch User Details ------------------ */
	const gettingUserId = useCallback(() => {
		if (!user?._id || !token) return;
		readUserId(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error);
			} else {
				const normalizedUser =
					data && typeof data === "object"
						? {
								...data,
								accessTo: Array.isArray(data.accessTo) ? data.accessTo : [],
						  }
						: data;
				setGetUser(normalizedUser);
			}
		});
	}, [user?._id, token]);

	/* ------------------ 2) Access control ------------------ */
	useEffect(() => {
		if (!getUser) return;

		if (!getUser.activeUser) {
			history.push("/");
			return;
		}

		const accessTo = accessList;

		const isSuperUser = isConfiguredSuperAdmin || isSuperAdminUser(getUser);

		// If user has HotelReports in access, or is super/admin, skip password
		if (accessTo.includes("HotelReports") || isSuperUser || isSuperAdmin) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			return;
		}

		// Configured platform owners may keep the password flow.
		if (isSuperUser) {
			return;
		}

		// Otherwise, redirect based on first available module (adjust as needed)
		switch (accessTo[0]) {
			case "reservations":
				history.push("/admin/overall-hotel-reports?tab=reservations");
				break;
			case "inventory":
				history.push("/admin/overall-hotel-reports?tab=inventory");
				break;
			default:
				history.push("/");
				break;
		}
	}, [accessList, getUser, history, isConfiguredSuperAdmin, isSuperAdmin]);

	/* ------------------ 3) Init & localStorage ------------------ */
	useEffect(() => {
		gettingUserId();
	}, [gettingUserId]);

	useEffect(() => {
		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, []);

	useEffect(() => {
		if (isConfiguredSuperAdmin) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			return;
		}

		if (!getUser) return;

		const adminReportsPasswordVerified =
			localStorage.getItem("ReportsVerified");
		if (adminReportsPasswordVerified || (getUser && isSuperAdmin)) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
		} else {
			setIsModalVisible(true);
		}
	}, [getUser, isConfiguredSuperAdmin, isSuperAdmin]);

	/* ------------------ 4) Password Verification ------------------ */
	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_REPORTS) {
			setIsPasswordVerified(true);
			message.success(L.passwordVerified);
			localStorage.setItem("ReportsVerified", "true");
			setIsModalVisible(false);
		} else {
			message.error(L.incorrectPassword);
		}
	};

	/* ------------------ 5) Tabs in URL ------------------ */
	const handleTabChange = (tab) => {
		const nextTab = normalizeReportTab(tab);
		setActiveTab(nextTab);
		history.push({
			pathname: location.pathname,
			search: `?tab=${nextTab}`,
		});
	};

	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const tab = queryParams.get("tab");
		const nextTab = normalizeReportTab(tab);

		if (activeTab !== nextTab) {
			setActiveTab(nextTab);
		}

		if (tab !== nextTab) {
			history.replace({
				pathname: location.pathname,
				search: `?tab=${nextTab}`,
			});
		}
	}, [activeTab, history, location.pathname, location.search]);

	const reportTabs = [
		{ key: "reservations", label: L.reservations },
		{ key: "inventory", label: L.inventory },
		{ key: "paid-overview", label: L.paidOverview },
		{ key: "Profit", label: L.profit },
	];

	return (
		<HotelReportsMainWrapper
			dir={isArabic ? "rtl" : "ltr"}
			show={collapsed}
		>
			{/* Password Modal */}
			{!isConfiguredSuperAdmin && (
				<Modal
					title={L.passwordTitle}
					open={isModalVisible}
					footer={null}
					closable={false}
				>
					<Input.Password
						placeholder={L.passwordPlaceholder}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						iconRender={(visible) =>
							visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
						}
					/>
					<Button
						type='primary'
						style={{ marginTop: "10px", width: "100%" }}
						onClick={handlePasswordVerification}
					>
						{L.verify}
					</Button>
				</Modal>
			)}

			{/* Main Content */}
			{isPasswordVerified && (
				<div className='grid-container-main'>
					<div className='navcontent'>
						{chosenLanguage === "Arabic" ? (
							<AdminNavbarArabic
								fromPage='AdminReports'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						) : (
							<AdminNavbar
								fromPage='AdminReports'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						)}
					</div>

					<div className='otherContentWrapper'>
						<div className='container-wrapper'>
							<TabNavigation role='tablist'>
								{reportTabs.map((tab) => (
									<button
										key={tab.key}
										type='button'
										role='tab'
										aria-selected={activeTab === tab.key}
										className={activeTab === tab.key ? "active" : ""}
										onClick={() => handleTabChange(tab.key)}
									>
										{tab.label}
									</button>
								))}
							</TabNavigation>

							{activeTab === "reservations" && (
								<div className='report-section'>
									<h3 className='report-heading'>{L.reservations}</h3>
									<ReservationsOverview />
								</div>
							)}

							{activeTab === "inventory" && (
								<div className='report-section'>
									<h3 className='report-heading'>{L.inventory}</h3>
									<HotelsInventoryMap chosenLanguage={chosenLanguage} />
								</div>
							)}

							{activeTab === "paid-overview" && (
								<div className='report-section'>
									<h3 className='report-heading'>{L.paidOverview}</h3>
									<PaidReportAdmin />
								</div>
							)}

							{activeTab === "Profit" && (
								<div className='report-section'>
									<h3 className='report-heading'>{L.profit}</h3>
									<ProfitReportAdmin />
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</HotelReportsMainWrapper>
	);
};

export default HotelReportsMainAdmin;

/* ---------------------------------- STYLES ---------------------------------- */
const HotelReportsMainWrapper = styled.div`
	margin-top: 0;
	min-height: 715px;
	overflow-x: hidden;

	.grid-container-main {
		display: grid;
		min-width: 0;
		grid-template-columns: ${(props) => {
			const nav = props.show ? "70px" : "285px";
			return props.dir === "rtl" ? `1fr ${nav}` : `${nav} 1fr`;
		}};
		grid-template-areas: ${(props) =>
			props.dir === "rtl" ? "'content nav'" : "'nav content'"};
	}

	.navcontent {
		grid-area: nav;
		min-width: 0;
	}

	.otherContentWrapper {
		grid-area: content;
		min-width: 0;
		overflow: hidden;
	}

	.container-wrapper {
		width: auto;
		max-width: calc(100% - 20px);
		min-width: 0;
		border: 1px solid rgba(139, 190, 227, 0.42);
		padding: 16px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.97);
		margin: 14px 10px;
		box-shadow: 0 14px 34px rgba(13, 49, 88, 0.11);
		box-sizing: border-box;
		overflow: hidden;
	}

	.report-section {
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
	}

	.report-heading {
		margin: 0 0 12px;
		color: #0f2b46;
		font-size: 1.05rem;
		font-weight: 900;
	}

	.table-container,
	.table-responsive,
	.ant-table-wrapper {
		max-width: 100%;
		overflow: auto;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "content";
		}

		.navcontent {
			position: relative;
			z-index: 2;
		}

		.container-wrapper {
			max-width: calc(100% - 12px);
			margin: 10px 6px;
			padding: 12px;
		}
	}
`;

const TabNavigation = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 16px;
	padding: 6px;
	border: 1px solid rgba(139, 190, 227, 0.38);
	border-radius: 8px;
	background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);

	button {
		appearance: none;
		min-height: 44px;
		min-width: 190px;
		padding: 10px 14px;
		border: 1px solid rgba(118, 166, 208, 0.42);
		background: linear-gradient(180deg, #ffffff 0%, #f3f8fd 100%);
		cursor: pointer;
		font-weight: 800;
		border-radius: 8px;
		flex: 1 1 220px;
		color: #18334f;
		box-shadow: 0 6px 14px rgba(13, 49, 88, 0.08);
		transition: transform 0.18s ease, box-shadow 0.18s ease,
			border-color 0.18s ease;

		&.active {
			border-color: #62c6ef;
			background: linear-gradient(180deg, #1d6c9f 0%, #0b2c49 100%);
			color: white;
			box-shadow:
				0 10px 24px rgba(19, 104, 155, 0.24),
				inset 0 1px 0 rgba(255, 255, 255, 0.18);
		}

		&:hover {
			transform: translateY(-1px);
			box-shadow: 0 12px 24px rgba(13, 49, 88, 0.14);
		}

		&:focus-visible {
			outline: 3px solid rgba(76, 181, 230, 0.28);
			outline-offset: 2px;
		}
	}

	@media (max-width: 768px) {
		button {
			flex: 1 1 100%;
			min-width: 0;
			padding: 8px;
			font-size: 0.9rem;
		}
	}
`;
