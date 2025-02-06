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

const HotelReportsMainAdmin = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [activeTab, setActiveTab] = useState("reservations");
	const [getUser, setGetUser] = useState("");
	const { user, token } = isAuthenticated();
	const location = useLocation();
	const history = useHistory();

	/* ------------------ 1) Fetch User Details ------------------ */
	const gettingUserId = useCallback(() => {
		readUserId(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error);
			} else {
				setGetUser(data);
			}
		});
	}, [user._id, token]);

	/* -----------------------------------------------------------
     2) Validate user & handle access control upon user fetch
        - If user is inactive => push to "/"
        - If user has "HotelReports" => skip password
        - If user has no or "all" => do nothing special (still require password)
        - Otherwise, redirect to a fallback page
  ----------------------------------------------------------- */
	useEffect(() => {
		if (getUser) {
			// 2a) If user is not active => redirect to homepage
			if (!getUser.activeUser) {
				history.push("/");
				return;
			}

			const accessTo = getUser.accessTo || [];

			// 2b) If user has "HotelReports" in their access => skip password
			if (accessTo.includes("HotelReports")) {
				setIsPasswordVerified(true);
				setIsModalVisible(false);
				return;
			}

			// 2c) If user has no restrictions or includes("all"), we do NOT skip password by default
			//     (You can decide here if you want to skip or still require password.)
			if (accessTo.length === 0 || accessTo.includes("all")) {
				// do nothing special => continue with password flow
				return;
			}

			// 2d) If user does NOT have "HotelReports", check for other access modules
			//     and potentially redirect them. (Adjust as needed for your app.)
			switch (accessTo[0]) {
				case "reservations":
					history.push("/super-admin/hotel-reports?tab=reservations");
					break;
				case "inventory":
					history.push("/super-admin/hotel-reports?tab=inventory");
					break;
				default:
					// Fallback (if no recognized modules)
					history.push("/");
					break;
			}
		}
	}, [getUser, history]);

	/* -----------------------------------------------------------
     3) Initial setup: fetch user, handle small-screen collapses,
        check localStorage for "ReportsVerified"
  ----------------------------------------------------------- */
	useEffect(() => {
		gettingUserId();

		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		// Check if password was previously verified
		const adminReportsPasswordVerified =
			localStorage.getItem("ReportsVerified");
		if (adminReportsPasswordVerified) {
			setIsPasswordVerified(true);
		} else {
			setIsModalVisible(true);
		}
	}, [gettingUserId]);

	/* -----------------------------------------------------------
     4) Handle Password Verification
  ----------------------------------------------------------- */
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

	/* -----------------------------------------------------------
     5) Handle Tab Changes (push query param to URL)
  ----------------------------------------------------------- */
	const handleTabChange = (tab) => {
		setActiveTab(tab);
		history.push(`?tab=${tab}`);
	};

	// On mount or location change, parse "tab" from URL
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
			{/* --------------- Modal for Password --------------- */}
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

			{/* --------------- Main Content --------------- */}
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
							{/* --------------- Tab Navigation --------------- */}
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
							</TabNavigation>

							{/* --------------- Tab Content --------------- */}
							{activeTab === "reservations" && (
								<div>
									<h3>Reservations Overview</h3>
									<ReservationsOverview />
								</div>
							)}

							{activeTab === "inventory" && (
								<div>
									<h3>Hotels Inventory</h3>
									<p>
										{/* You could create a new component here for a specific hotel's reports */}
										Work in progress...
									</p>
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
	margin-top: 20px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 75%" : "17% 83%")};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}

	@media (max-width: 768px) {
		.grid-container-main {
			grid-template-columns: 1fr;
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
