import React, { useEffect, useState, useCallback } from "react";
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

const HotelReportsMainAdmin = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [activeTab, setActiveTab] = useState("reservations");
	const [getUser, setGetUser] = useState(null);

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

		// If user has HotelReports in access, skip password
		if (accessTo.includes("HotelReports")) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			return;
		}

		// If unrestricted or includes "all", keep password flow
		if (accessTo.length === 0 || accessTo.includes("all")) {
			return;
		}

		// Otherwise, redirect based on first available module (adjust as needed)
		switch (accessTo[0]) {
			case "reservations":
				history.push("/super-admin/hotel-reports?tab=reservations");
				break;
			case "inventory":
				history.push("/super-admin/hotel-reports?tab=inventory");
				break;
			default:
				history.push("/");
				break;
		}
	}, [getUser, history]);

	/* ------------------ 3) Init & localStorage ------------------ */
	useEffect(() => {
		gettingUserId();

		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		const adminReportsPasswordVerified =
			localStorage.getItem("ReportsVerified");
		if (adminReportsPasswordVerified) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
		} else {
			setIsModalVisible(true);
		}
	}, [gettingUserId]);

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
			history.replace("?tab=reservations");
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
							<TabNavigation>
								<button
									className={activeTab === "reservations" ? "active" : ""}
									onClick={() => handleTabChange("reservations")}
								>
									Reservations Overview
								</button>
								<button
									className={activeTab === "inventory" ? "active" : ""}
									onClick={() => handleTabChange("inventory")}
								>
									Hotels' Inventory
								</button>

								<button
									className={activeTab === "paid-overview" ? "active" : ""}
									onClick={() => handleTabChange("paid-overview")}
								>
									Paid Reservations Overview
								</button>
							</TabNavigation>

							{activeTab === "reservations" && (
								<div>
									<h3>Reservations Overview</h3>
									<ReservationsOverview />
								</div>
							)}

							{activeTab === "inventory" && (
								<div>
									<h3>Hotels Inventory</h3>
									<HotelsInventoryMap />
								</div>
							)}

							{activeTab === "paid-overview" && (
								<div>
									<h3>Paid Reservations Overview</h3>
									<PaidReportAdmin />
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
