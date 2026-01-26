import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import styled from "styled-components";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import { readUserId } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ReservationsOverview from "./ReservationsOverview";
import HotelInventory from "./HotelInventory";
import PaidReportHotel from "./PaidReportHotel";
import { useCartContext } from "../../cart_context";

const HotelReportsMain = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [activeTab, setActiveTab] = useState("reservations");
	const [getUser, setGetUser] = useState("");
	const { chosenLanguage } = useCartContext();
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
     3) Initial setup: fetch user, handle small-screen collapses,
        check localStorage for "ReportsVerified"
  ----------------------------------------------------------- */
	useEffect(() => {
		gettingUserId();

		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [gettingUserId]);

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
			{/* --------------- Main Content --------------- */}
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='HotelReports'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='HotelReports'
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
							<button
								className={activeTab === "paid-overview" ? "active" : ""}
								onClick={() => handleTabChange("paid-overview")}
							>
								Paid Reservations Overview
							</button>
						</TabNavigation>

						{/* --------------- Tab Content --------------- */}
						{activeTab === "reservations" && (
							<div>
								<h3>Reservations Overview</h3>
								<ReservationsOverview
									getUser={getUser}
									chosenLanguage={chosenLanguage}
								/>
							</div>
						)}

						{activeTab === "inventory" && (
							<div>
								<HotelInventory
									chosenLanguage={chosenLanguage}
									collapsed={collapsed}
								/>
							</div>
						)}

						{activeTab === "paid-overview" && (
							<div>
								<h3>Paid Reservations Overview</h3>
								<PaidReportHotel collapsed={collapsed} />
							</div>
						)}
					</div>
				</div>
			</div>
		</HotelReportsMainWrapper>
	);
};

export default HotelReportsMain;

/* ---------------------------------- STYLES ---------------------------------- */

const HotelReportsMainWrapper = styled.div`
	margin-top: 80px;
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
