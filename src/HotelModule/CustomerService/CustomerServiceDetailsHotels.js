import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import ActiveHotelSupportCasesHotels from "./ActiveHotelSupportCasesHotels";
import ActiveClientsSupportCasesHotels from "./ActiveClientsSupportCasesHotels";
import HistoryHotelSupportCasesHotels from "./HistoryHotelSupportCasesHotels";
import HistoryClientsSupportCasesHotels from "./HistoryClientsSupportCasesHotels";

const CustomerServiceDetailsHotels = () => {
	const history = useHistory();
	const location = useLocation();
	const [activeTab, setActiveTab] = useState("active-client-cases");

	// Function to handle tab change
	const handleTabChange = (tab) => {
		setActiveTab(tab);
		history.push(`?tab=${tab}`);
	};

	// Set active tab based on URL query parameter
	useEffect(() => {
		const query = new URLSearchParams(location.search);
		const tab = query.get("tab");
		const validTabs = new Set([
			"active-client-cases",
			"active-hotel-cases",
			"history-hotel-cases",
			"history-client-cases",
		]);
		setActiveTab(validTabs.has(tab) ? tab : "active-client-cases");
	}, [location.search]);

	return (
		<CustomerServiceDetailsHotelsWrapper>
			<div className='tab-grid'>
				<Tab
					isActive={activeTab === "active-client-cases"}
					onClick={() => handleTabChange("active-client-cases")}
				>
					Active Client Support Cases
				</Tab>

				<Tab
					isActive={activeTab === "active-hotel-cases"}
					onClick={() => handleTabChange("active-hotel-cases")}
				>
					Active Hotel Support Cases
				</Tab>

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
			</div>

			<div className='content-wrapper'>
				{/* Content will be displayed here based on the active tab */}
				{activeTab === "active-hotel-cases" && (
					<div>
						<ActiveHotelSupportCasesHotels />
					</div>
				)}
				{activeTab === "active-client-cases" && (
					<div>
						<ActiveClientsSupportCasesHotels />
					</div>
				)}
				{activeTab === "history-hotel-cases" && (
					<div>
						<HistoryHotelSupportCasesHotels />
					</div>
				)}
				{activeTab === "history-client-cases" && (
					<div>
						<HistoryClientsSupportCasesHotels />
					</div>
				)}
			</div>
		</CustomerServiceDetailsHotelsWrapper>
	);
};

export default CustomerServiceDetailsHotels;

// Styled-components
const CustomerServiceDetailsHotelsWrapper = styled.div`
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
