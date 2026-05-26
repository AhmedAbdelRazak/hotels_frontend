import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { readUserId } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import FinancialReport from "./FinancialReport";
import ExpensesManagement from "./ExpensesManagement";
import { isSuperAdminUser } from "../utils/superUsers";

const FINANCIAL_TEXT = {
	en: {
		passwordTitle: "Enter Password",
		passwordPlaceholder: "Enter password",
		verify: "Verify Password",
		passwordVerified: "Password verified successfully",
		incorrectPassword: "Incorrect password. Please try again.",
		expenses: "Expenses Management",
		report: "Financial Report",
	},
	ar: {
		passwordTitle: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		passwordPlaceholder: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		verify: "\u062a\u062d\u0642\u0642",
		passwordVerified:
			"\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.",
		incorrectPassword:
			"\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629.",
		expenses: "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a",
		report: "\u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0645\u0627\u0644\u064a",
	},
};

const FinancialMain = ({ chosenLanguage }) => {
	const isArabic = chosenLanguage === "Arabic";
	const L = FINANCIAL_TEXT[isArabic ? "ar" : "en"];
	const { user, token } = isAuthenticated() || {};
	const isConfiguredSuperAdmin = isSuperAdminUser(user);
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(
		isConfiguredSuperAdmin
	);
	const [activeTab, setActiveTab] = useState("expenses");
	const [getUser, setGetUser] = useState(null);
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
				setGetUser(data);
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

		const accessTo = getUser.accessTo || [];

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
			case "expenses":
				history.push("/admin/expenses-financials?tab=expenses");
				break;
			case "finances":
				history.push("/admin/expenses-financials?tab=finances");
				break;
			default:
				history.push("/");
				break;
		}
	}, [getUser, history, isConfiguredSuperAdmin, isSuperAdmin]);

	/* ------------------ 3) Init & localStorage ------------------ */
	useEffect(() => {
		gettingUserId();

		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [gettingUserId]);

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
		setActiveTab(tab);
		history.push(`?tab=${tab}`);
	};

	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const tab = queryParams.get("tab");

		if (tab) {
			setActiveTab(tab);
		} else {
			history.replace("?tab=expenses");
		}
	}, [location.search, history]);

	return (
		<HotelReportsMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
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
						{isArabic ? (
							<AdminNavbarArabic
								fromPage='Financials'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						) : (
							<AdminNavbar
								fromPage='Financials'
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
							<TabNavigation>
								<button
									className={activeTab === "expenses" ? "active" : ""}
									onClick={() => handleTabChange("expenses")}
								>
									{L.expenses}
								</button>
								<button
									className={activeTab === "finances" ? "active" : ""}
									onClick={() => handleTabChange("finances")}
								>
									{L.report}
								</button>
							</TabNavigation>

							{activeTab === "expenses" && (
								<div>
									<h3>{L.expenses}</h3>
									<ExpensesManagement />
								</div>
							)}

							{activeTab === "finances" && (
								<div>
									<h3>{L.report}</h3>
									<FinancialReport />
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</HotelReportsMainWrapper>
	);
};

export default FinancialMain;

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
	gap: 10px;
	margin-bottom: 20px;

	button {
		padding: 10px 20px;
		border: none;
		background-color: #ddd;
		cursor: pointer;
		font-weight: bold;
		border-radius: 5px;
		flex: 1;

		&.active {
			background-color: #006ad1;
			color: white;
		}

		&:hover {
			background-color: #bbb;
		}
	}

	@media (max-width: 768px) {
		flex-wrap: wrap;
		gap: 8px;

		button {
			width: 48%;
			padding: 8px;
			font-size: 0.9rem;
		}
	}
`;
