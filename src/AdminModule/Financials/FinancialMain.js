import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import styled from "styled-components";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { readUserId } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import FinancialReport from "./FinancialReport";
import ExpensesManagement from "./ExpensesManagement";
import { SUPER_USER_IDS } from "../utils/superUsers";

const FinancialMain = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [activeTab, setActiveTab] = useState("expenses");
	const [getUser, setGetUser] = useState(null);
	const isSuperAdmin =
		!!getUser &&
		(!getUser?.accessTo ||
			getUser?.accessTo.length === 0 ||
			getUser?.accessTo.includes("all"));

	const { user, token } = isAuthenticated() || {};
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

		const isSuperUser = SUPER_USER_IDS.includes(getUser?._id);

		// If user has HotelReports in access, or is super/admin, skip password
		if (accessTo.includes("HotelReports") || isSuperUser || isSuperAdmin) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			return;
		}

		// If unrestricted or includes "all", keep password flow
		if (accessTo.length === 0 || accessTo.includes("all") || isSuperUser) {
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
	}, [getUser, history, isSuperAdmin]);

	/* ------------------ 3) Init & localStorage ------------------ */
	useEffect(() => {
		gettingUserId();

		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		const adminReportsPasswordVerified =
			localStorage.getItem("ReportsVerified");
		if (adminReportsPasswordVerified || (getUser && isSuperAdmin)) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
		} else {
			setIsModalVisible(true);
		}
	}, [gettingUserId, getUser, getUser?._id, isSuperAdmin]);

	/* ------------------ 4) Password Verification ------------------ */
	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_REPORTS) {
			setIsPasswordVerified(true);
			message.success("Password verified successfully");
			localStorage.setItem("ReportsVerified", "true");
			setIsModalVisible(false);
		} else {
			message.error("Incorrect password. Please try again.");
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
			<Modal
				title='Enter Password'
				open={isModalVisible}
				footer={null}
				closable={false}
			>
				<Input.Password
					placeholder='Enter password'
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
					Verify Password
				</Button>
			</Modal>

			{/* Main Content */}
			{isPasswordVerified && (
				<div className='grid-container-main'>
					<div className='navcontent'>
						<AdminNavbar
							fromPage='Financials'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					</div>

					<div className='otherContentWrapper'>
						<div className='container-wrapper'>
							<TabNavigation>
								<button
									className={activeTab === "expenses" ? "active" : ""}
									onClick={() => handleTabChange("expenses")}
								>
									Expenses Management
								</button>
								<button
									className={activeTab === "finances" ? "active" : ""}
									onClick={() => handleTabChange("finances")}
								>
									Financial Report
								</button>
							</TabNavigation>

							{activeTab === "expenses" && (
								<div>
									<h3>Expenses Management</h3>
									<ExpensesManagement />
								</div>
							)}

							{activeTab === "finances" && (
								<div>
									<h3>Financial Report</h3>
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

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => {
			const nav = props.show ? "70px" : "285px";
			return props.dir === "rtl" ? `1fr ${nav}` : `${nav} 1fr`;
		}};
		grid-template-areas: ${(props) =>
			props.dir === "rtl" ? "'content nav'" : "'nav content'"};
	}

	.navcontent {
		grid-area: nav;
	}

	.otherContentWrapper {
		grid-area: content;
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 20px 10px;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "nav" "content";
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
