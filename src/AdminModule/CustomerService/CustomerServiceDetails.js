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

	// Function to handle tab change
	const handleTabChange = (tab) => {
		setActiveTab(tab);
		history.push(`?tab=${tab}`);
	};

	// Function to fetch the active case counts
	const fetchCaseCounts = async () => {
		try {
			const hotelCount = await getFilteredSupportCases(); // Fetch active hotel cases count
			const clientCount = await getFilteredSupportCasesClients(); // Fetch active client cases count
			setActiveHotelCasesCount(hotelCount.length); // Assuming the API returns an array
			setActiveClientCasesCount(clientCount.length);
		} catch (error) {
			console.error("Error fetching case counts", error);
		}
	};

	// Fetch the case counts initially when component mounts
	useEffect(() => {
		fetchCaseCounts();
	}, []);

	// Listen for socket events to update the case counts in real-time
	useEffect(() => {
		// Handle new case or closed case events
		const handleNewChat = () => {
			fetchCaseCounts(); // Re-fetch the case counts when a new chat is added
		};

		const handleCloseCase = () => {
			fetchCaseCounts(); // Re-fetch the case counts when a case is closed
		};

		// Listen for these events on the socket
		socket.on("newChat", handleNewChat);
		socket.on("closeCase", handleCloseCase);

		// Cleanup on unmount
		return () => {
			socket.off("newChat", handleNewChat);
			socket.off("closeCase", handleCloseCase);
		};
	}, []);

	// Set active tab based on URL query parameter
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
				{/* Render history tabs only if the user is a super admin */}
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
	width: 100%;
	text-align: center;
	z-index: 100;
	font-size: 1.2rem;
	color: ${(props) => (props.isActive ? "black" : "black")};

	@media (max-width: 1600px) {
		font-size: 1rem;
		padding: 10px 1px;
	}
`;
