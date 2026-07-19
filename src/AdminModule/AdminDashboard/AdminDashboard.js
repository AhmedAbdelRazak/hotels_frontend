import React, { useEffect, useState, useCallback, useMemo } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import MainHotelDashboard from "../AddedHotels/MainHotelDashboard";
import { Modal, Input, Button, message } from "antd";
import {
	BankOutlined,
	CalendarOutlined,
	EyeInvisibleOutlined,
	EyeTwoTone,
} from "@ant-design/icons";
import { readUserId } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import { useHistory, useLocation } from "react-router-dom";
import { isConfiguredSuperAdminUser } from "../utils/superUsers";
import ReservationsSummary from "./ReservationsSummary";
import {
	ADMIN_DASHBOARD_TABS,
	buildAdminDashboardSearch,
	readAdminDashboardQuery,
} from "./adminDashboardQuery";

const AdminDashboard = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [getUser, setGetUser] = useState("");
	const { user, token } = isAuthenticated();
	const authUserId = user?._id || "";
	const authIsConfiguredSuperAdmin = isConfiguredSuperAdminUser(authUserId);
	const history = useHistory();
	const location = useLocation();
	const dashboardQuery = useMemo(
		() => readAdminDashboardQuery(location.search),
		[location.search]
	);
	const isArabic = chosenLanguage === "Arabic";
	const tabLabels = isArabic
		? {
				reservations: "\u0645\u0644\u062e\u0635 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
				hotels:
					"\u0627\u0644\u0645\u0644\u062e\u0635 \u0627\u0644\u0639\u0627\u0645 \u0644\u0644\u0641\u0646\u0627\u062f\u0642",
		  }
		: {
				reservations: "Reservations Summary",
				hotels: "Overall Hotels Summary",
		  };
	const activeTabId =
		dashboardQuery.tab === ADMIN_DASHBOARD_TABS.RESERVATIONS
			? "admin-reservations-summary-tab"
			: "admin-hotels-summary-tab";

	// Fetch user details
	const gettingUserId = useCallback(() => {
		if (!authUserId || !token) return;
		readUserId(authUserId, token).then((data) => {
			if (data && data.error) {
				console.error(data.error);
			} else {
				setGetUser(data);
			}
		});
	}, [authUserId, token]);

	// Determine if the user is a configured platform Super Admin.
	const accessTo = useMemo(
		() => (Array.isArray(getUser?.accessTo) ? getUser.accessTo : []),
		[getUser]
	);
	const isSuperAdmin =
		isConfiguredSuperAdminUser(getUser?._id || authUserId);

	// Validate user and handle access control
	useEffect(() => {
		if (getUser) {
			// If the user is not active, redirect to home
			if (!getUser.activeUser) {
				history.push("/");
				return;
			}

			// Check if the user has access to AdminDashboard
			if (accessTo.includes("AdminDashboard") || isSuperAdmin) {
				setIsPasswordVerified(true);
				setIsModalVisible(false); // Ensure modal does not show
				return;
			}

			// Redirect based on the first valid access in accessTo
			if (accessTo.includes("JannatTools")) {
				history.push("/admin/jannatbooking-tools?tab=calculator");
			} else if (accessTo.includes("CustomerService")) {
				history.push("/admin/customer-service?tab=active-client-cases");
			} else if (accessTo.includes("Integrator")) {
				history.push("/admin/el-integrator");
			} else if (accessTo.includes("JannatBookingWebsite")) {
				history.push("/admin/janat-website");
			} else {
				history.push("/"); // Redirect to home if no valid access
			}
		}
	}, [accessTo, getUser, history, isSuperAdmin]);

	// Initial setup
	useEffect(() => {
		gettingUserId();

		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		// If user is a configured Super Admin, skip modal
		if (authIsConfiguredSuperAdmin) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
		} else {
			// Check if password is already verified
			const dashboardPasswordVerified = localStorage.getItem(
				"AdminDashboardVerified"
			);
			if (dashboardPasswordVerified) {
				setIsPasswordVerified(true);
			} else {
				setIsModalVisible(true);
			}
		}
	}, [gettingUserId, authIsConfiguredSuperAdmin]);

	useEffect(() => {
		if (location.search === dashboardQuery.canonicalSearch) return;
		history.replace({
			pathname: location.pathname,
			search: dashboardQuery.canonicalSearch,
		});
	}, [
		dashboardQuery.canonicalSearch,
		history,
		location.pathname,
		location.search,
	]);

	const updateDashboardQuery = useCallback(
		(updates) => {
			history.push({
				pathname: location.pathname,
				search: buildAdminDashboardSearch(location.search, updates),
			});
		},
		[history, location.pathname, location.search]
	);

	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_ADMIN_DASHBOARD) {
			setIsPasswordVerified(true);
			message.success("Password verified successfully");
			localStorage.setItem("AdminDashboardVerified", "true");
			setIsModalVisible(false);
		} else {
			message.error("Incorrect password. Please try again.");
		}
	};

	return (
		<AdminDashboardWrapper
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

			{/* Content Rendering */}
			{isPasswordVerified && (
				<div className='grid-container-main'>
					<div className='navcontent'>
						{chosenLanguage === "Arabic" ? (
							<AdminNavbarArabic
								fromPage='AdminDasboard'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						) : (
							<AdminNavbar
								fromPage='AdminDasboard'
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
							<DashboardTabs role='tablist' aria-label='Admin dashboard summaries'>
								<DashboardTab
									id='admin-reservations-summary-tab'
									type='button'
									role='tab'
									aria-controls='admin-dashboard-summary-panel'
									$active={dashboardQuery.tab === ADMIN_DASHBOARD_TABS.RESERVATIONS}
									aria-selected={dashboardQuery.tab === ADMIN_DASHBOARD_TABS.RESERVATIONS}
									onClick={() =>
										updateDashboardQuery({
											tab: ADMIN_DASHBOARD_TABS.RESERVATIONS,
										})
									}
								>
									<CalendarOutlined />
									<span>{tabLabels.reservations}</span>
								</DashboardTab>
								<DashboardTab
									id='admin-hotels-summary-tab'
									type='button'
									role='tab'
									aria-controls='admin-dashboard-summary-panel'
									$active={dashboardQuery.tab === ADMIN_DASHBOARD_TABS.HOTELS}
									aria-selected={dashboardQuery.tab === ADMIN_DASHBOARD_TABS.HOTELS}
									onClick={() =>
										updateDashboardQuery({
											tab: ADMIN_DASHBOARD_TABS.HOTELS,
										})
									}
								>
									<BankOutlined />
									<span>{tabLabels.hotels}</span>
								</DashboardTab>
							</DashboardTabs>

							<DashboardPanel
								id='admin-dashboard-summary-panel'
								role='tabpanel'
								aria-labelledby={activeTabId}
							>
								{dashboardQuery.tab === ADMIN_DASHBOARD_TABS.RESERVATIONS ? (
									<ReservationsSummary
										day={dashboardQuery.day}
										onDayChange={(day) => updateDashboardQuery({ day })}
										chosenLanguage={chosenLanguage}
									/>
								) : (
									<MainHotelDashboard viewportFit />
								)}
							</DashboardPanel>
						</div>
					</div>
				</div>
			)}
		</AdminDashboardWrapper>
	);
};

export default AdminDashboard;

const AdminDashboardWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 6px;
	min-height: 715px;

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
	}

	.otherContentWrapper {
		grid-area: content;
		min-width: 0;
		overflow: hidden;
	}

	.container-wrapper {
		border: 1px solid lightgrey;
		padding: 8px 10px;
		border-radius: 12px;
		background: white;
		margin: 0 6px;
		max-width: 100%;
		overflow: hidden;
	}

	@media (max-width: 1400px) {
		background: white;
	}

	@media (max-width: 992px) {
		margin-top: 0;

		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "nav" "content";
		}

		.container-wrapper {
			margin: 0;
			border-radius: 12px;
			padding: 10px;
		}
	}
`;

const DashboardTabs = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
	padding: 7px;
	border: 1px solid #c9dff2;
	border-radius: 12px;
	background: linear-gradient(180deg, #f8fcff 0%, #edf6fd 100%);
	box-shadow:
		inset 0 1px #fff,
		0 8px 22px rgba(8, 42, 75, 0.08);
`;

const DashboardTab = styled.button`
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 9px;
	min-width: 0;
	min-height: 52px;
	padding: 10px 14px;
	border: 1px solid ${(props) => (props.$active ? "#2e8fc5" : "#c5dced")};
	border-radius: 9px;
	background: ${(props) =>
		props.$active
			? "linear-gradient(135deg, #071827 0%, #0d3f6a 52%, #155d95 100%)"
			: "rgba(255, 255, 255, 0.94)"};
	box-shadow: ${(props) =>
		props.$active
			? "0 10px 24px rgba(8, 50, 87, 0.26), inset 0 1px rgba(255, 255, 255, 0.14)"
			: "inset 0 1px #fff"};
	color: ${(props) => (props.$active ? "#fff" : "#183b5b")};
	cursor: pointer;
	font-size: 0.9rem;
	font-weight: 950;
	line-height: 1.25;
	text-align: center;
	transition:
		background 0.24s ease,
		border-color 0.24s ease,
		box-shadow 0.24s ease,
		color 0.24s ease;

	&::after {
		content: "";
		position: absolute;
		inset: -1px;
		border: 1px solid transparent;
		border-radius: inherit;
		pointer-events: none;
		animation: ${(props) =>
			props.$active ? "dashboard-tab-heartbeat 1.65s ease-in-out infinite" : "none"};
	}

	&:hover {
		border-color: #4da9d5;
		box-shadow: 0 10px 22px rgba(8, 50, 87, 0.16);
	}

	&:focus-visible {
		outline: 3px solid rgba(37, 155, 213, 0.34);
		outline-offset: 2px;
	}

	@keyframes dashboard-tab-heartbeat {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(54, 181, 232, 0);
		}
		38% {
			box-shadow: 0 0 0 4px rgba(54, 181, 232, 0.18);
		}
		55% {
			box-shadow: 0 0 0 1px rgba(54, 181, 232, 0.08);
		}
		72% {
			box-shadow: 0 0 0 6px rgba(54, 181, 232, 0.12);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;

		&::after {
			animation: none;
		}
	}

	@media (max-width: 560px) {
		min-height: 58px;
		padding: 8px 7px;
		font-size: 0.74rem;

		svg {
			flex: 0 0 auto;
		}
	}
`;

const DashboardPanel = styled.div`
	min-width: 0;
	margin-top: 10px;
`;
