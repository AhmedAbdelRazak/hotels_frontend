import React, {
	useEffect,
	useState,
	useContext,
	useCallback,
	useMemo,
} from "react";
import styled from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import { Badge } from "antd";
import {
	BankOutlined,
	CustomerServiceOutlined,
	ExclamationCircleOutlined,
	HistoryOutlined,
	SoundOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import ActiveHotelSupportCases from "./ActiveHotelSupportCases";
import ActiveClientsSupportCases from "./ActiveClientsSupportCases";
import HistoryHotelSupportCases from "./HistoryHotelSupportCases";
import HistoryClientsSupportCases from "./HistoryClientsSupportCases";
import {
	getEscalatedClientSupportCases,
	getFilteredSupportCases,
	getFilteredSupportCasesClients,
} from "../apiAdmin"; // Assume you have these API functions
import socket from "../../socket";

// 1) Import your NotificationContext here
import { NotificationContext } from "./NotificationContext";

const CUSTOMER_SERVICE_DETAILS_TEXT = {
	en: {
		enableSound: "Enable Notification Sound",
		unlockSound: "Unlock Notification Sound",
		activeHotelCases: "Active Hotel Cases",
		activeClientCases: "Active Client Cases",
		escalatedClientCases: "Escalated Client Cases",
		hotelHistory: "Hotel Case History",
		clientHistory: "Client Case History",
	},
	ar: {
		enableSound:
			"\u062a\u0641\u0639\u064a\u0644 \u0635\u0648\u062a \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
		unlockSound:
			"\u0625\u0639\u0627\u062f\u0629 \u0641\u062a\u062d \u0635\u0648\u062a \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
		activeHotelCases:
			"\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0646\u0634\u0637\u0629",
		activeClientCases:
			"\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0646\u0634\u0637\u0629",
		escalatedClientCases:
			"\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0645\u0635\u0639\u062f\u0629",
		hotelHistory:
			"\u0633\u062c\u0644 \u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		clientHistory:
			"\u0633\u062c\u0644 \u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
	},
};

const CustomerServiceDetails = ({ getUser, isSuperAdmin, chosenLanguage }) => {
	const history = useHistory();
	const location = useLocation();
	const isArabic = chosenLanguage === "Arabic";
	const L = CUSTOMER_SERVICE_DETAILS_TEXT[isArabic ? "ar" : "en"];
	const [activeTab, setActiveTab] = useState("active-hotel-cases");

	// State for case counts
	const [activeHotelCasesCount, setActiveHotelCasesCount] = useState(0);
	const [activeClientCasesCount, setActiveClientCasesCount] = useState(0);
	const [escalatedClientCasesCount, setEscalatedClientCasesCount] = useState(0);

	// 2) Destructure your notification context
	const { soundEnabled, soundNeedsUnlock, enableSound } =
		useContext(NotificationContext);

	const tabItems = useMemo(() => {
		const baseTabs = [
			{
				key: "active-hotel-cases",
				label: L.activeHotelCases,
				icon: <BankOutlined />,
				badge: activeHotelCasesCount,
				badgeColor: "#e5484d",
			},
			{
				key: "active-client-cases",
				label: L.activeClientCases,
				icon: <TeamOutlined />,
				badge: activeClientCasesCount,
				badgeColor: "#18a058",
			},
			{
				key: "escalated-client-cases",
				label: L.escalatedClientCases,
				icon: <ExclamationCircleOutlined />,
				badge: escalatedClientCasesCount,
				badgeColor: "#fa8c16",
			},
		];

		if (!isSuperAdmin) return baseTabs;

		return [
			...baseTabs,
			{
				key: "history-hotel-cases",
				label: L.hotelHistory,
				icon: <HistoryOutlined />,
			},
			{
				key: "history-client-cases",
				label: L.clientHistory,
				icon: <CustomerServiceOutlined />,
			},
		];
	}, [
		L.activeClientCases,
		L.activeHotelCases,
		L.clientHistory,
		L.escalatedClientCases,
		L.hotelHistory,
		activeClientCasesCount,
		activeHotelCasesCount,
		escalatedClientCasesCount,
		isSuperAdmin,
	]);

	const validTabKeys = useMemo(
		() => new Set(tabItems.map((tab) => tab.key)),
		[tabItems]
	);

	// Handle tab changes
	const handleTabChange = (tab) => {
		if (!validTabKeys.has(tab)) return;
		setActiveTab(tab);
		history.push({
			pathname: location.pathname,
			search: `?tab=${tab}`,
		});
	};

	// Fetch active case counts
	const fetchCaseCounts = useCallback(async () => {
		try {
			const hotelCount = await getFilteredSupportCases(); // Fetch active hotel cases
			const clientCount = await getFilteredSupportCasesClients(); // Fetch active client cases
			const escalatedClientCount = await getEscalatedClientSupportCases();
			const hotelCases = Array.isArray(hotelCount) ? hotelCount : [];
			const clientCases = Array.isArray(clientCount) ? clientCount : [];
			const escalatedClientCases = Array.isArray(escalatedClientCount)
				? escalatedClientCount
				: [];
			setActiveHotelCasesCount(hotelCases.length); // API presumably returns an array
			setActiveClientCasesCount(
				clientCases.filter((supportCase) => supportCase.escalationStatus !== "active")
					.length
			);
			setEscalatedClientCasesCount(escalatedClientCases.length);
		} catch (error) {
			console.error("Error fetching case counts", error);
		}
	}, []);

	// Initial fetch
	useEffect(() => {
		fetchCaseCounts();
	}, [fetchCaseCounts]);

	// Socket real-time updates
	useEffect(() => {
		const handleNewChat = () => {
			fetchCaseCounts();
		};
		const handleCloseCase = () => {
			fetchCaseCounts();
		};

		socket.on("newChat", handleNewChat);
		socket.on("closeCase", handleCloseCase);
		socket.on("supportCaseUpdated", handleNewChat);
		socket.on("supportCaseEscalated", handleNewChat);
		socket.on("supportCaseEscalationAddressed", handleNewChat);
		socket.on("supportCaseEscalationUpdated", handleNewChat);

		return () => {
			socket.off("newChat", handleNewChat);
			socket.off("closeCase", handleCloseCase);
			socket.off("supportCaseUpdated", handleNewChat);
			socket.off("supportCaseEscalated", handleNewChat);
			socket.off("supportCaseEscalationAddressed", handleNewChat);
			socket.off("supportCaseEscalationUpdated", handleNewChat);
		};
	}, [fetchCaseCounts]);

	// Sync active tab with URL query param
	useEffect(() => {
		const query = new URLSearchParams(location.search);
		const tab = query.get("tab");
		const nextTab = validTabKeys.has(tab) ? tab : "active-hotel-cases";

		if (activeTab !== nextTab) {
			setActiveTab(nextTab);
		}

		if (tab && tab !== nextTab) {
			history.replace({
				pathname: location.pathname,
				search: `?tab=${nextTab}`,
			});
		}
	}, [activeTab, history, location.pathname, location.search, validTabKeys]);

	return (
		<CustomerServiceDetailsWrapper dir={isArabic ? "rtl" : "ltr"}>
			{/* 3) Minimal button to enable sound (and optional vibration) */}
			{(!soundEnabled || soundNeedsUnlock) && (
				<EnableSoundButton
					onClick={() => {
						enableSound();
						// Optional: if you want a quick vibration on mobile
						if ("vibrate" in navigator) {
							navigator.vibrate(200);
						}
					}}
				>
					<SoundOutlined />
					{soundNeedsUnlock ? L.unlockSound : L.enableSound}
				</EnableSoundButton>
			)}

			<div className='tab-grid' role='tablist'>
				{tabItems.map((tab) => (
					<Tab
						key={tab.key}
						type='button'
						role='tab'
						aria-selected={activeTab === tab.key}
						$isActive={activeTab === tab.key}
						onClick={() => handleTabChange(tab.key)}
					>
						<span className='tab-icon'>{tab.icon}</span>
						<span className='tab-label'>{tab.label}</span>
						{typeof tab.badge === "number" && (
							<Badge
								count={tab.badge}
								style={{
									backgroundColor: tab.badgeColor,
									fontSize: "13px",
									fontWeight: "bold",
									boxShadow: "none",
								}}
							/>
						)}
					</Tab>
				))}
			</div>

			<div className='content-wrapper'>
				{activeTab === "active-hotel-cases" && (
					<div>
						<ActiveHotelSupportCases
							getUser={getUser}
							isSuperAdmin={isSuperAdmin}
						/>
					</div>
				)}
				{activeTab === "active-client-cases" && (
					<div>
						<ActiveClientsSupportCases
							getUser={getUser}
							isSuperAdmin={isSuperAdmin}
						/>
					</div>
				)}
				{activeTab === "escalated-client-cases" && (
					<div>
						<ActiveClientsSupportCases
							getUser={getUser}
							isSuperAdmin={isSuperAdmin}
							mode='escalated'
						/>
					</div>
				)}
				{activeTab === "history-hotel-cases" && (
					<div>
						<HistoryHotelSupportCases />
					</div>
				)}
				{activeTab === "history-client-cases" && (
					<div>
						<HistoryClientsSupportCases chosenLanguage={chosenLanguage} />
					</div>
				)}
			</div>
		</CustomerServiceDetailsWrapper>
	);
};

export default CustomerServiceDetails;

/* ---------------- Styled-components ---------------- */

const CustomerServiceDetailsWrapper = styled.div`
	padding: 0;
	background: transparent;
	min-width: 0;

	.tab-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 16px;
		padding: 6px;
		border: 1px solid rgba(139, 190, 227, 0.38);
		border-radius: 8px;
		background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
	}

	.content-wrapper {
		min-width: 0;
		border: 1px solid rgba(139, 190, 227, 0.42);
		padding: 14px;
		border-radius: 8px;
		background: white;
		overflow: hidden;
		box-shadow: 0 12px 28px rgba(13, 49, 88, 0.08);
	}

	.ant-table-wrapper,
	.ant-table,
	.ant-table-container {
		max-width: 100%;
	}

	.ant-table-content,
	.ant-table-body {
		overflow: auto !important;
	}

	@media (max-width: 768px) {
		.content-wrapper {
			padding: 10px;
		}
	}
`;

const Tab = styled.button`
	appearance: none;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	flex: 1 1 220px;
	min-height: 44px;
	min-width: 180px;
	padding: 10px 14px;
	border: 1px solid
		${(props) => (props.$isActive ? "#62c6ef" : "rgba(118, 166, 208, 0.42)")};
	border-radius: 8px;
	font-weight: ${(props) => (props.$isActive ? "800" : "700")};
	background: ${(props) =>
		props.$isActive
			? "linear-gradient(180deg, #1d6c9f 0%, #0b2c49 100%)"
			: "linear-gradient(180deg, #ffffff 0%, #f3f8fd 100%)"};
	box-shadow: ${(props) =>
		props.$isActive
			? "0 10px 24px rgba(19, 104, 155, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.18)"
			: "0 6px 14px rgba(13, 49, 88, 0.08)"};
	transition: transform 0.18s ease, box-shadow 0.18s ease,
		border-color 0.18s ease;
	text-align: center;
	font-size: 0.95rem;
	color: ${(props) => (props.$isActive ? "#fff" : "#18334f")};

	.tab-icon {
		display: inline-flex;
		font-size: 1rem;
	}

	.tab-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 12px 24px rgba(13, 49, 88, 0.14);
	}

	&:focus-visible {
		outline: 3px solid rgba(76, 181, 230, 0.28);
		outline-offset: 2px;
	}

	@media (max-width: 768px) {
		flex: 1 1 100%;
		min-width: 0;

		.tab-label {
			white-space: normal;
		}
	}
`;

const EnableSoundButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	margin-bottom: 12px;
	padding: 9px 15px;
	font-size: 0.95rem;
	font-weight: bold;
	background: linear-gradient(180deg, #1678b1 0%, #0c3b63 100%);
	color: #fff;
	border: 1px solid rgba(102, 198, 239, 0.5);
	border-radius: 8px;
	cursor: pointer;
	box-shadow: 0 10px 22px rgba(13, 49, 88, 0.16);

	&:hover {
		background: linear-gradient(180deg, #1f88c3 0%, #0d4774 100%);
	}

	@media (max-width: 768px) {
		font-size: 0.9rem;
		padding: 6px 12px;
	}
`;
