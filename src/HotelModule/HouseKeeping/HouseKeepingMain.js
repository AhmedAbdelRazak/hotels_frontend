import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { useHistory } from "react-router-dom";
import { useCartContext } from "../../cart_context";
import {
	getAllHouseKeepingTasks,
	getAllHouseKeepingTotalRecords,
	getHotelDetails,
	getHotelRooms,
	getHouseKeepingStaff,
	hotelAccount,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import HouseKeepingTable from "./HouseKeepingTable";
import CreateNewTask from "./CreateNewTask";
import { getStoredMenuCollapsed } from "../utils/menuState";

const HouseKeepingMain = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [houseKeepingTasks, setHouseKeepingTasks] = useState([]);
	const [totalTasksCount, setTotalTasksCount] = useState([]);
	const [hotelDetails, setHotelDetails] = useState([]);
	const [hotelRooms, setHotelRooms] = useState([]);
	const [houseKeepingStaff, setHouseKeepingStaff] = useState([]);
	const [currentPage, setCurrentPage] = useState(1); // New state for current page
	const [recordsPerPage] = useState(50); // You can adjust this as needed
	const [activeTab, setActiveTab] = useState("overAllTasks");
	const history = useHistory(); // Initialize the history object

	const { languageToggle, chosenLanguage } = useCartContext();
	const { user, token } = isAuthenticated();

	useEffect(() => {
		if (window.location.search.includes("overAllTasks")) {
			setActiveTab("overAllTasks");
		} else if (window.location.search.includes("createNewTask")) {
			setActiveTab("createNewTask");
		} else if (window.location.search.includes("reports")) {
			setActiveTab("reports");
		} else {
			setActiveTab("overAllTasks");
		}
		// eslint-disable-next-line
	}, [activeTab]);

	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [hasStoredCollapsed]);

	const gettingOverallHouseKeepingTasks = () => {
		hotelAccount(user._id, token, user._id).then((data) => {
			if (data && data.error) {
				console.log("This is erroring");
				console.log(data.error, "Error rendering");
			} else {
				getHotelDetails(data._id).then((data2) => {
					if (data2 && data2.error) {
						console.log(data2.error, "Error rendering");
					} else {
						if (data && data.name && data._id && data2 && data2.length > 0) {
							setHotelDetails(data2[0]);

							getAllHouseKeepingTasks(
								currentPage,
								recordsPerPage,
								data2[0]._id
							).then((data4) => {
								if (data4 && data4.error) {
									console.log(data4.error);
								} else {
									setHouseKeepingTasks(data4.data);
								}
							});

							// Fetch total records
							getAllHouseKeepingTotalRecords(data2[0]._id).then((data5) => {
								if (data5 && data5.error) {
									console.log(data5.error);
								} else {
									setTotalTasksCount(data5.totalDocuments); // Set total records
								}
							});

							if (!hotelRooms || hotelRooms.length === 0) {
								getHotelRooms(data2[0]._id, user._id).then((data3) => {
									if (data3 && data3.error) {
										console.log(data3.error);
									} else {
										setHotelRooms(data3);
									}
								});
							}

							getHouseKeepingStaff(data2[0]._id).then((data6) => {
								if (data6 && data6.error) {
									console.log(data6.error);
								} else {
									setHouseKeepingStaff(data6); // Set total records
								}
							});
						}
					}
				});
			}
		});
	};

	useEffect(() => {
		gettingOverallHouseKeepingTasks();
		// eslint-disable-next-line
	}, [currentPage]);

	const handlePageChange = (newPage) => {
		setCurrentPage(newPage);
	};

	console.log(houseKeepingStaff, "houseKeepingStaff");

	return (
		<HouseKeepingMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='HouseKeeping'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='HouseKeeping'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					)}
				</div>

				<div className='otherContentWrapper'>
					<div
						style={{
							textAlign: chosenLanguage === "Arabic" ? "left" : "right",
							fontWeight: "bold",
							textDecoration: "underline",
							cursor: "pointer",
						}}
						onClick={() => {
							if (chosenLanguage === "English") {
								languageToggle("Arabic");
							} else {
								languageToggle("English");
							}
						}}
					>
						{chosenLanguage === "English" ? "ARABIC" : "English"}
					</div>

					<div style={{ background: "#8a8a8a", padding: "1px" }}>
						<div className='my-2 tab-grid col-md-8'>
							<Tab
								isActive={activeTab === "overAllTasks"}
								onClick={() => {
									setActiveTab("overAllTasks");
									history.push("/hotel-management/house-keeping?overAllTasks"); // Programmatically navigate
								}}
							>
								{chosenLanguage === "Arabic" ? "نظرة عامة" : "Overall Tasks"}
							</Tab>

							<Tab
								isActive={activeTab === "createNewTask"}
								onClick={() => {
									setActiveTab("createNewTask");
									history.push("/hotel-management/house-keeping?createNewTask"); // Programmatically navigate
								}}
							>
								{chosenLanguage === "Arabic"
									? "إنشاء مهمة جديدة لموظف"
									: "Create New Task"}
							</Tab>

							<Tab
								isActive={activeTab === "reports"}
								onClick={() => {
									setActiveTab("reports");
									history.push("/hotel-management/house-keeping?reports"); // Programmatically navigate
								}}
							>
								{chosenLanguage === "Arabic"
									? "التقارير"
									: "House Keeping Reports"}
							</Tab>
						</div>
					</div>

					<div className='container-wrapper'>
						{activeTab === "overAllTasks" &&
						hotelRooms &&
						hotelRooms.length > 0 ? (
							<>
								<HouseKeepingTable
									houseKeepingTasks={houseKeepingTasks}
									totalTasksCount={totalTasksCount}
									handlePageChange={handlePageChange}
									chosenLanguage={chosenLanguage}
									currentPage={currentPage}
									recordsPerPage={recordsPerPage}
									houseKeepingStaff={houseKeepingStaff}
									hotelRooms={hotelRooms}
								/>
							</>
						) : null}

						{activeTab === "createNewTask" &&
						hotelRooms &&
						hotelRooms.length > 0 &&
						hotelDetails &&
						hotelDetails._id ? (
							<>
								<CreateNewTask
									hotelRooms={hotelRooms}
									hotelDetails={hotelDetails}
									chosenLanguage={chosenLanguage}
									houseKeepingStaff={houseKeepingStaff}
								/>
							</>
						) : null}
					</div>
				</div>
			</div>
		</HouseKeepingMainWrapper>
	);
};

export default HouseKeepingMain;

const HouseKeepingMainWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */
	margin-top: 46px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 80%" : "17% 80%")};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}

	.tab-grid {
		display: flex;
		/* Additional styling for grid layout */
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;

const Tab = styled.div`
	cursor: pointer;
	margin: 0 3px; /* 3px margin between tabs */
	padding: 15px 5px; /* Adjust padding as needed */
	font-weight: ${(props) => (props.isActive ? "bold" : "bold")};
	background-color: ${(props) =>
		props.isActive
			? "transparent"
			: "#bbbbbb"}; /* Light grey for unselected tabs */
	box-shadow: ${(props) =>
		props.isActive ? "inset 5px 5px 5px rgba(0, 0, 0, 0.3)" : "none"};
	transition: all 0.3s ease; /* Smooth transition for changes */
	min-width: 25px; /* Minimum width of the tab */
	width: 100%; /* Full width within the container */
	text-align: center; /* Center the text inside the tab */
	/* Additional styling for tabs */
	z-index: 100;
	font-size: 1.2rem;
	color: ${(props) => (props.isActive ? "white" : "black")};
`;
