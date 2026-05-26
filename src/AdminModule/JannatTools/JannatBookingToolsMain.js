import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import styled from "styled-components";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import { Modal, Input, Button, message } from "antd";
import {
	CalculatorOutlined,
	EyeInvisibleOutlined,
	EyeTwoTone,
	ToolOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import { readUserId } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ReservationCalculator from "./ReservationCalculator";
import OrderTaker from "./OrderTaker";
import UncompletedReservations from "./UncompletedReservations";
import { SUPER_USER_IDS } from "../utils/superUsers";

const TOOL_TEXT = {
	en: {
		passwordTitle: "Enter Password",
		passwordPlaceholder: "Enter password",
		verify: "Verify Password",
		pageTitle: "Jannat Booking Tools",
		pageSubtitle: "Reservation pricing, reservation tools, and follow-up workspace.",
		calculator: "Reservation Calculator",
		reservations: "Reservation Tools",
		uncompleted: "Uncompleted Reservations",
	},
	ar: {
		passwordTitle: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		passwordPlaceholder: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		verify: "\u062a\u062d\u0642\u0642",
		pageTitle: "\u0623\u062f\u0648\u0627\u062a \u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u062c",
		pageSubtitle:
			"\u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u062a\u0633\u0639\u064a\u0631 \u0648\u0623\u062f\u0648\u0627\u062a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0648\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629.",
		calculator: "\u062d\u0627\u0633\u0628\u0629 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		reservations: "\u0623\u062f\u0648\u0627\u062a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		uncompleted:
			"\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u063a\u064a\u0631 \u0627\u0644\u0645\u0643\u062a\u0645\u0644\u0629",
	},
};

const JannatBookingToolsMain = ({ chosenLanguage }) => {
	const isArabic = chosenLanguage === "Arabic";
	const TXT = TOOL_TEXT[isArabic ? "ar" : "en"];
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

		const accessTo = getUser.accessTo || [];
		const includesJannatTools = accessTo.includes("JannatTools");

		if (SUPER_USER_IDS.includes(getUser?._id)) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			localStorage.setItem("ToolsVerified", "true");
			return;
		}

		if (includesJannatTools) {
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
		if (accessTo.includes("JannatTools") || SUPER_USER_IDS.includes(getUser?._id)) {
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
	const isSuperAdmin = SUPER_USER_IDS.includes(getUser?._id);

	const availableTabs = useMemo(
		() => [
			{
				key: "calculator",
				label: TXT.calculator,
				icon: <CalculatorOutlined />,
			},
			{
				key: "reservations",
				label: TXT.reservations,
				icon: <ToolOutlined />,
			},
			...(isSuperAdmin
				? [
						{
							key: "uncompleted",
							label: TXT.uncompleted,
							icon: <WarningOutlined />,
						},
				  ]
				: []),
		],
		[TXT, isSuperAdmin]
	);

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
		history.push({
			pathname: location.pathname,
			search: `?tab=${tab}`,
		});
	};

	useEffect(() => {
		if (!isPasswordVerified) return;
		const queryParams = new URLSearchParams(location.search);
		const tab = queryParams.get("tab");
		const allowedTabKeys = availableTabs.map((item) => item.key);

		if (tab && allowedTabKeys.includes(tab)) {
			setActiveTab(tab);
		} else {
			history.replace("?tab=calculator");
		}
	}, [availableTabs, history, isPasswordVerified, location.search]);

	return (
		<JannatBookingToolsMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			{/* Password Verification Modal */}
			<Modal
				title={TXT.passwordTitle}
				open={isModalVisible}
				footer={null}
				closable={false}
			>
				<Input.Password
					placeholder={TXT.passwordPlaceholder}
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
					{TXT.verify}
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
								{availableTabs.map((tab) => (
									<button
										type='button'
										key={tab.key}
										className={activeTab === tab.key ? "active" : ""}
										onClick={() => handleTabChange(tab.key)}
									>
										{tab.icon}
										<span>{tab.label}</span>
									</button>
								))}
							</TabNavigation>

							{/* Tab Content */}
							{activeTab === "calculator" && (
								<TabPanel>
									<h2>{TXT.calculator}</h2>
									<ReservationCalculator
										getUser={getUser}
										isSuperAdmin={isSuperAdmin}
										chosenLanguage={chosenLanguage}
									/>
								</TabPanel>
							)}
							{activeTab === "reservations" && (
								<TabPanel>
									<h2>{TXT.reservations}</h2>
									<OrderTaker getUser={getUser} isSuperAdmin={isSuperAdmin} />
								</TabPanel>
							)}
							{isSuperAdmin && activeTab === "uncompleted" && (
								<TabPanel>
									<UncompletedReservations />
								</TabPanel>
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
	overflow-x: hidden;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => {
			const nav = props.show ? "70px" : "285px";
			return props.dir === "rtl" ? `1fr ${nav}` : `${nav} 1fr`;
		}};
		grid-template-areas: ${(props) =>
			props.dir === "rtl" ? "'content nav'" : "'nav content'"};
		min-width: 0;
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
		width: auto;
		max-width: calc(100% - 20px);
		min-width: 0;
		border: 1px solid rgba(139, 190, 227, 0.42);
		padding: 16px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.96);
		margin: 14px 10px;
		box-shadow: 0 14px 34px rgba(13, 49, 88, 0.11);
		overflow: hidden;
		box-sizing: border-box;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "nav" "content";
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
	border: 1px solid rgba(139, 190, 227, 0.36);
	border-radius: 8px;
	background: #f8fbff;

	button {
		min-height: 44px;
		padding: 9px 14px;
		border: 1px solid rgba(139, 190, 227, 0.46);
		background: #ffffff;
		color: #173a5f;
		cursor: pointer;
		font-weight: 950;
		border-radius: 6px;
		flex: 1 1 220px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		line-height: 1.2;
		box-shadow: 0 8px 18px rgba(13, 49, 88, 0.06);
		transition:
			background 160ms ease,
			border-color 160ms ease,
			color 160ms ease,
			box-shadow 160ms ease,
			transform 160ms ease;

		&.active {
			border-color: rgba(122, 209, 245, 0.95);
			background: var(
				--admin-metal-blue-bg,
				linear-gradient(135deg, #081a2d 0%, #155d95 52%, #071827 100%)
			);
			color: #ffffff;
			box-shadow:
				inset 0 1px rgba(255, 255, 255, 0.22),
				0 10px 22px rgba(8, 42, 75, 0.18);
		}

		&:hover {
			border-color: rgba(36, 144, 200, 0.7);
			transform: translateY(-1px);
		}

		span {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	@media (max-width: 768px) {
		button {
			flex-basis: 100%;
			font-size: 0.9rem;
		}
	}
`;

const TabPanel = styled.section`
	min-width: 0;
	overflow: hidden;

	h2 {
		margin: 0 0 12px;
		color: #0b3158;
		font-size: 1.06rem;
		font-weight: 950;
		line-height: 1.35;
		letter-spacing: 0;
	}

	.ant-table-wrapper,
	.ant-table-container,
	.ant-table-content,
	.ant-table-body {
		max-width: 100%;
	}

	.ant-table-content,
	.ant-table-body {
		overflow: auto !important;
	}
`;
