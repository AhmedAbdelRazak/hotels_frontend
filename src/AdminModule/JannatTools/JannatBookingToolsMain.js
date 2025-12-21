import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import styled from "styled-components";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { readUserId } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ReservationCalculator from "./ReservationCalculator";
import OrderTaker from "./OrderTaker";
import EmployeeRegister from "./EmployeeRegister";
import UncompletedReservations from "./UncompletedReservations";

const JannatBookingToolsMain = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	// Control the password modal:
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);

	const [activeTab, setActiveTab] = useState("calculator");
	const [getUser, setGetUser] = useState(null);
	const { user, token } = isAuthenticated() || {};
	const location = useLocation();
	const history = useHistory();

	// Fetch user details
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

	// 1) On mount, fetch user and set layout
	useEffect(() => {
		gettingUserId();
		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [gettingUserId]);

	// 2) Once we have `getUser`, decide whether we need the password modal
	useEffect(() => {
		if (!getUser) return; // wait until fetched

		// If the user is not active, redirect out
		if (getUser.activeUser === false) {
			history.push("/");
			return;
		}

		// If the user has both 'hotelsToSupport' and 'accessTo' (and they're non-empty),
		// we skip the password check entirely.
		const hasHotelsToSupport =
			(Array.isArray(getUser.hotelsToSupport) &&
				getUser.hotelsToSupport.length > 0) ||
			getUser.hotelsToSupport === "all";
		const hasAccessTo =
			Array.isArray(getUser.accessTo) && getUser.accessTo.length > 0;

		// Check if user is allowed "JannatTools" => skip password
		const includesJannatTools = Array.isArray(getUser.accessTo)
			? getUser.accessTo.includes("JannatTools")
			: false;

		if (hasHotelsToSupport && hasAccessTo && includesJannatTools) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			localStorage.setItem("ToolsVerified", "true");
			return;
		}

		// Otherwise, check localStorage
		const toolsPasswordVerified = localStorage.getItem("ToolsVerified");
		if (toolsPasswordVerified) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
		} else {
			setIsModalVisible(true);
		}
	}, [getUser, history]);

	// Access control: if user doesn't have "JannatTools", but does have something else
	// we redirect them to the relevant module
	useEffect(() => {
		if (!getUser) return;
		const accessTo = getUser.accessTo || [];

		// If user has "JannatTools", do nothing special here
		if (accessTo.includes("JannatTools")) {
			return;
		}

		// If user has no restrictions or 'all', do nothing
		if (accessTo.length === 0 || accessTo.includes("all")) {
			return;
		}

		// Otherwise, send them to the first available module
		switch (accessTo[0]) {
			case "CustomerService":
				history.push("/admin/customer-service?tab=active-client-cases");
				break;
			case "HotelsReservations":
				history.push("/admin/all-reservations");
				break;
			case "Integrator":
				history.push("/admin/el-integrator");
				break;
			case "JannatBookingWebsite":
				history.push("/admin/janat-website");
				break;
			case "AdminDashboard":
				history.push("/admin/dashboard");
				break;
			default:
				break;
		}
	}, [getUser, history]);

	// isSuperAdmin logic
	const isSuperAdmin =
		!getUser?.accessTo ||
		getUser?.accessTo.length === 0 ||
		getUser?.accessTo.includes("all");

	// Handle password verification
	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_TOOLS) {
			setIsPasswordVerified(true);
			message.success("Password verified successfully");
			localStorage.setItem("ToolsVerified", "true");
			setIsModalVisible(false);
		} else {
			message.error("Incorrect password. Please try again.");
		}
	};

	// Tabs
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
			history.replace("?tab=calculator");
		}
	}, [location.search, history]);

	return (
		<JannatBookingToolsMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			{/* Password Verification Modal */}
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

			{/* Render Content if Password is Verified */}
			{isPasswordVerified && (
				<div className='grid-container-main'>
					<div className='navcontent'>
						{chosenLanguage === "Arabic" ? (
							<AdminNavbarArabic
								fromPage='Tools'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						) : (
							<AdminNavbar
								fromPage='Tools'
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
							{/* Tab Navigation */}
							<TabNavigation>
								<button
									className={activeTab === "calculator" ? "active" : ""}
									onClick={() => handleTabChange("calculator")}
								>
									Reservation Calculator
								</button>
								<button
									className={activeTab === "reservations" ? "active" : ""}
									onClick={() => handleTabChange("reservations")}
								>
									Reservations Tools
								</button>

								{isSuperAdmin && (
									<>
										<button
											className={activeTab === "uncompleted" ? "active" : ""}
											onClick={() => handleTabChange("uncompleted")}
										>
											Uncompleted Reservations
										</button>
										<button
											className={activeTab === "addEmployee" ? "active" : ""}
											onClick={() => handleTabChange("addEmployee")}
										>
											Add Employee
										</button>
										<button
											className={activeTab === "updateEmployee" ? "active" : ""}
											onClick={() => handleTabChange("updateEmployee")}
										>
											Update Employee
										</button>
									</>
								)}
							</TabNavigation>

							{/* Tab Content */}
							{activeTab === "calculator" && (
								<div>
									<h3>Reservation Calculator</h3>
									<ReservationCalculator
										getUser={getUser}
										isSuperAdmin={isSuperAdmin}
									/>
								</div>
							)}
							{activeTab === "reservations" && (
								<div>
									<h3>Reservation Taker</h3>
									<OrderTaker getUser={getUser} isSuperAdmin={isSuperAdmin} />
								</div>
							)}
							{isSuperAdmin && activeTab === "addEmployee" && (
								<div>
									<h3>Register a New Employee</h3>
									<EmployeeRegister
										getUser={getUser}
										isSuperAdmin={isSuperAdmin}
									/>
								</div>
							)}
							{isSuperAdmin && activeTab === "updateEmployee" && (
								<div>
									<h3>Update an Employee</h3>
									<p>Create a new component for employee update</p>
								</div>
							)}
							{isSuperAdmin && activeTab === "uncompleted" && (
								<div>
									<UncompletedReservations />
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</JannatBookingToolsMainWrapper>
	);
};

export default JannatBookingToolsMain;

/* ---------------------------------- STYLES ---------------------------------- */

const JannatBookingToolsMainWrapper = styled.div`
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
		flex: 1; /* so the buttons share the row's space */

		&.active {
			background-color: #006ad1;
			color: white;
		}

		&:hover {
			background-color: #bbb;
		}
	}

	/* ------------- MOBILE TABS: 2 PER ROW ------------- */
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
