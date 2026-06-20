import React, { useEffect, useState } from "react";
import { useLocation, useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import styled from "styled-components";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import ReservationsOverview from "./ReservationsOverview";
import HotelInventory from "./HotelInventory";
import PaidReportHotel from "./PaidReportHotel";
import { useCartContext } from "../../cart_context";
import { getStoredMenuCollapsed } from "../utils/menuState";

const HotelReportsMain = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [activeTab, setActiveTab] = useState("reservations");
	const { chosenLanguage } = useCartContext();
	const location = useLocation();
	const history = useHistory();
	const isArabic = chosenLanguage === "Arabic";
	const labels = {
		reservations:
			chosenLanguage === "Arabic"
				? "\u0646\u0638\u0631\u0629\u0020\u0639\u0627\u0645\u0629\u0020\u0639\u0644\u0649\u0020\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a"
				: "Reservations Overview",
		inventory:
			chosenLanguage === "Arabic"
				? "\u0645\u062e\u0632\u0648\u0646\u0020\u0627\u0644\u0641\u0646\u062f\u0642"
				: "Hotels' Inventory",
		paidOverview:
			chosenLanguage === "Arabic"
				? "\u062a\u0642\u0631\u064a\u0631\u0020\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a\u0020\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629"
				: "Paid Reservations Overview",
	};

	/* -----------------------------------------------------------
     3) Initial setup: handle small-screen collapses
  ----------------------------------------------------------- */
	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [hasStoredCollapsed]);

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
			dir={isArabic ? "rtl" : "ltr"}
			$show={collapsed}
			$isArabic={isArabic}
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
								{labels.reservations}
							</button>
							<button
								className={activeTab === "inventory" ? "active" : ""}
								onClick={() => handleTabChange("inventory")}
							>
								{labels.inventory}
							</button>
							<button
								className={activeTab === "paid-overview" ? "active" : ""}
								onClick={() => handleTabChange("paid-overview")}
							>
								{labels.paidOverview}
							</button>
						</TabNavigation>

						{/* --------------- Tab Content --------------- */}
						{activeTab === "reservations" && (
							<div>
								<h3>{labels.reservations}</h3>
								<ReservationsOverview
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
								<h3>{labels.paidOverview}</h3>
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
	overflow-x: hidden;
	margin-top: 70px;
	min-height: calc(100vh - 70px);
	background: #f7f8fc;

	.grid-container-main {
		direction: ltr;
		display: grid;
		grid-template-columns: ${(props) =>
			props.$isArabic
				? props.$show
					? "minmax(0, 1fr) 80px"
					: "minmax(0, 1fr) 286px"
				: props.$show
				  ? "80px minmax(0, 1fr)"
				  : "286px minmax(0, 1fr)"};
		min-width: 0;
	}

	.navcontent {
		grid-column: ${(props) => (props.$isArabic ? "2" : "1")};
		grid-row: 1;
	}

	.otherContentWrapper {
		background: #f7f8fc;
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
		grid-column: ${(props) => (props.$isArabic ? "1" : "2")};
		grid-row: 1;
		min-width: 0;
		overflow: hidden;
		width: 100%;
	}

	.container-wrapper {
		border: 1px solid #cfe5fb;
		padding: clamp(10px, 1.4vw, 18px);
		border-radius: 10px;
		background: #ffffff;
		margin: clamp(8px, 1.4vw, 18px);
		box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
		min-width: 0;
	}

	h3 {
		margin: 4px 0 16px;
		color: #18212f;
		font-size: clamp(1.25rem, 2.2vw, 1.9rem);
		font-weight: 800;
		line-height: 1.2;
	}

	@media (max-width: 1200px) {
		.grid-container-main {
			display: block;
		}

		.otherContentWrapper {
			min-height: calc(100vh - 70px);
			padding-inline-start: ${(props) =>
				!props.$isArabic && props.$show ? "72px" : "0"};
			padding-inline-end: ${(props) =>
				props.$isArabic && props.$show ? "72px" : "0"};
		}
	}

	@media (max-width: 560px) {
		.container-wrapper {
			margin: 8px;
			padding: 8px;
		}

		.otherContentWrapper {
			padding-inline-start: 0;
			padding-inline-end: 0;
		}
	}
`;

const TabNavigation = styled.div`
	display: flex;
	gap: 8px;
	margin-bottom: 18px;
	padding: 8px;
	background: #e3f2fd;
	border: 1px solid #cfe5fb;
	border-radius: 8px;
	min-width: 0;
	overflow-x: auto;
	scrollbar-width: thin;

	button {
		flex: 1 0 148px;
		min-height: 52px;
		padding: 10px 12px;
		border: 1px solid rgba(16, 24, 40, 0.08);
		background-color: #f8fbff;
		cursor: pointer;
		font-weight: 800;
		border-radius: 8px;
		color: #18212f;
		line-height: 1.25;
		white-space: normal;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			box-shadow 0.18s ease,
			color 0.18s ease;

		&.active {
			background-color: #0d6efd;
			border-color: #0d6efd;
			color: white;
			box-shadow: 0 8px 18px rgba(13, 110, 253, 0.24);
		}

		&:hover {
			border-color: #80bdff;
			background-color: #ffffff;
		}

		&.active:hover {
			background-color: #0b5ed7;
			color: white;
		}
	}

	@media (max-width: 768px) {
		padding: 7px;

		button {
			flex: 0 0 118px;
			min-height: 48px;
			padding: 8px 9px;
			font-size: 0.78rem;
			white-space: normal;
		}
	}
`;
