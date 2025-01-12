import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import { Badge } from "antd";
import ActiveHotelSupportCases from "./ActiveHotelSupportCases";
import ActiveClientsSupportCases from "./ActiveClientsSupportCases";
import HistoryHotelSupportCases from "./HistoryHotelSupportCases";
import HistoryClientsSupportCases from "./HistoryClientsSupportCases";
import {
	getFilteredSupportCases,
	getFilteredSupportCasesClients,
} from "../apiAdmin"; // Assume you have these API functions
import socket from "../../socket";

const CustomerServiceDetails = ({ getUser, isSuperAdmin }) => {
	const history = useHistory();
	const location = useLocation();
	const [activeTab, setActiveTab] = useState("active-hotel-cases");

	// State for case counts
	const [activeHotelCasesCount, setActiveHotelCasesCount] = useState(0);
	const [activeClientCasesCount, setActiveClientCasesCount] = useState(0);

	// Handle tab changes
	const handleTabChange = (tab) => {
		setActiveTab(tab);
		history.push(`?tab=${tab}`);
	};

	// Fetch active case counts
	const fetchCaseCounts = async () => {
		try {
			const hotelCount = await getFilteredSupportCases(); // Fetch active hotel cases
			const clientCount = await getFilteredSupportCasesClients(); // Fetch active client cases
			setActiveHotelCasesCount(hotelCount.length); // API presumably returns an array
			setActiveClientCasesCount(clientCount.length);
		} catch (error) {
			console.error("Error fetching case counts", error);
		}
	};

	// Initial fetch
	useEffect(() => {
		fetchCaseCounts();
	}, []);

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

		return () => {
			socket.off("newChat", handleNewChat);
			socket.off("closeCase", handleCloseCase);
		};
	}, []);

	// Sync active tab with URL query param
	useEffect(() => {
		const query = new URLSearchParams(location.search);
		const tab = query.get("tab");
		if (tab) {
			setActiveTab(tab);
		}
	}, [location.search]);

	return (
		<CustomerServiceDetailsWrapper>
			<div className='tab-grid'>
				<Tab
					isActive={activeTab === "active-hotel-cases"}
					onClick={() => handleTabChange("active-hotel-cases")}
				>
					Active Hotel Support Cases{" "}
					<Badge
						count={activeHotelCasesCount}
						style={{
							backgroundColor: "#f5222d",
							fontSize: "16px",
							fontWeight: "bold",
						}}
					/>
				</Tab>

				<Tab
					isActive={activeTab === "active-client-cases"}
					onClick={() => handleTabChange("active-client-cases")}
				>
					Active Clients Support Cases{" "}
					<Badge
						count={activeClientCasesCount}
						style={{
							backgroundColor: "#52c41a",
							fontSize: "16px",
							fontWeight: "bold",
						}}
					/>
				</Tab>

				{/* History tabs only if super admin */}
				{isSuperAdmin && (
					<>
						<Tab
							isActive={activeTab === "history-hotel-cases"}
							onClick={() => handleTabChange("history-hotel-cases")}
						>
							History Of Hotel Support Cases
						</Tab>

						<Tab
							isActive={activeTab === "history-client-cases"}
							onClick={() => handleTabChange("history-client-cases")}
						>
							History Of Client Support Cases
						</Tab>
					</>
				)}
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
				{activeTab === "history-hotel-cases" && (
					<div>
						<HistoryHotelSupportCases />
					</div>
				)}
				{activeTab === "history-client-cases" && (
					<div>
						<HistoryClientsSupportCases />
					</div>
				)}
			</div>
		</CustomerServiceDetailsWrapper>
	);
};

export default CustomerServiceDetails;

// Styled-components
const CustomerServiceDetailsWrapper = styled.div`
	padding: 20px;
	background-color: #f5f5f5;

	.tab-grid {
		display: flex;
		margin-bottom: 20px;
		/* On mobile, allow wrapping so we can have 2 tabs per row */
		@media (max-width: 768px) {
			flex-wrap: wrap;
			gap: 8px; /* small gap between wrapped tabs */
		}
	}

	.content-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
	}
`;

const Tab = styled.div`
	cursor: pointer;
	margin: 0 3px;
	padding: 15px 5px;
	font-weight: ${(props) => (props.isActive ? "bold" : "normal")};
	background-color: ${(props) => (props.isActive ? "transparent" : "#e0e0e0")};
	box-shadow: ${(props) =>
		props.isActive ? "inset 5px 5px 5px rgba(0, 0, 0, 0.3)" : "none"};
	transition: all 0.3s ease;
	min-width: 25px;
	width: 100%; /* Each tab expands equally in the row */
	text-align: center;
	z-index: 100;
	font-size: 1.2rem;
	color: black; /* same color whether active or not */

	/* Adjust slightly for medium-ish screens */
	@media (max-width: 1600px) {
		font-size: 1rem;
		padding: 10px 1px;
	}

	/* On mobile, 2 tabs per row */
	@media (max-width: 768px) {
		flex: 1 0 48%; /* each tab ~48% so two fit in one row */
		box-sizing: border-box;
		font-size: 0.95rem; /* slightly smaller font on mobile */
		margin: 0; /* override the 0 3px for consistent spacing within .tab-grid gap */
		padding: 10px 0;
	}
`;
