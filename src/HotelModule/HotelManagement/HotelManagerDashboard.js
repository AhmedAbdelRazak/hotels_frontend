import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { useHistory } from "react-router-dom";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import {
	getHotelDetails,
	gettingDateReport,
	gettingDayOverDayInventory,
	hotelAccount,
} from "../apiAdmin";
import PasscodeModal from "./PasscodeModal";
import AdminDashboard from "./AdminDashboard";
import { getStoredMenuCollapsed } from "../utils/menuState";

const HotelManagerDashboard = ({ match }) => {
	// eslint-disable-next-line
	const history = useHistory();
	const { userId: routeUserId, hotelId: routeHotelId } = match?.params || {};

	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [modalVisiblePasscode, setModalVisiblePasscode] = useState(false);
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	// eslint-disable-next-line
	const [hotelDetails, setHotelDetails] = useState("");
	// eslint-disable-next-line
	const [reservationsToday, setReservationsToday] = useState("");
	// eslint-disable-next-line
	const [reservationsYesterday, setReservationsYesterday] = useState("");
	const { chosenLanguage } = useCartContext();
	// eslint-disable-next-line
	const [dayOverDayInventory, setDayOverDayInventory] = useState([]);
	// eslint-disable-next-line
	const [selectedDates, setSelectedDates] = useState([]);

	// eslint-disable-next-line
	const { user, token } = isAuthenticated();

	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		// eslint-disable-next-line
	}, [hasStoredCollapsed]);

	// Helper function to format a date object into yyyy-mm-dd
	function formatDate(date) {
		const d = new Date(date),
			month = "" + (d.getMonth() + 1),
			day = "" + d.getDate(),
			year = d.getFullYear();

		return [year, month.padStart(2, "0"), day.padStart(2, "0")].join("-");
	}

	const loadHotelDashboardSupportData = (accountData, selectedHotel) => {
		if (!accountData?._id || !selectedHotel?._id) return;

		setHotelDetails(selectedHotel);

		const today = new Date();
		const formattedToday = formatDate(today);
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const formattedYesterday = formatDate(yesterday);

		gettingDateReport(formattedToday, selectedHotel._id, accountData._id).then(
			(data3) => {
				if (data3 && data3.error) {
					console.log(data3.error);
				} else {
					setReservationsToday(
						data3.filter((i) => !i.reservation_status.includes("cancelled"))
					);
				}
			}
		);

		gettingDateReport(formattedYesterday, selectedHotel._id, accountData._id).then(
			(data4) => {
				if (data4 && data4.error) {
					console.log(data4.error);
				} else {
					setReservationsYesterday(
						data4.filter((i) => !i.reservation_status.includes("cancelled"))
					);
				}
			}
		);

		gettingDayOverDayInventory(accountData._id, selectedHotel._id).then(
			(data5) => {
				if (data5 && data5.error) {
					console.log("Data not received");
				} else {
					setDayOverDayInventory(data5);
				}
			}
		);
	};

	const gettingHotelData = () => {
		if (routeHotelId) {
			getHotelDetails(routeHotelId).then((hotelData) => {
				if (hotelData && hotelData.error) {
					console.log(hotelData.error, "Error rendering");
					return;
				}

				loadHotelDashboardSupportData(
					{ _id: routeUserId || user?._id },
					hotelData
				);
			});
			return;
		}

		hotelAccount(user._id, token, user._id).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error rendering");
			} else {
				getHotelDetails(data._id).then((data2) => {
					if (data2 && data2.error) {
						console.log(data2.error, "Error rendering");
					} else {
						loadHotelDashboardSupportData(data, data2);
					}
				});
			}
		});
	};

	useEffect(() => {
		gettingHotelData();
		// eslint-disable-next-line
	}, [selectedDates]);

	return (
		<HotelManagerDashboardWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
			isArabic={chosenLanguage === "Arabic"}
		>
			<PasscodeModal
				setModalVisiblePasscode={setModalVisiblePasscode}
				modalVisiblePasscode={modalVisiblePasscode}
			/>
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
					<AdminDashboard chosenLanguage={chosenLanguage} />

					{/* <WorldClocks /> */}
				</div>
			</div>
		</HotelManagerDashboardWrapper>
	);
};

export default HotelManagerDashboard;

const HotelManagerDashboardWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 70px;
	min-height: calc(100vh - 70px);
	text-align: ${(props) => (props.isArabic ? "right" : "")};

	.grid-container-main {
		direction: ltr;
		display: grid;
		grid-template-columns: ${(props) =>
			props.isArabic
				? props.show
					? "minmax(0, 1fr) 80px"
					: "minmax(0, 1fr) 286px"
				: props.show
				  ? "80px minmax(0, 1fr)"
				  : "286px minmax(0, 1fr)"};
		min-width: 0;
	}

	.navcontent {
		grid-column: ${(props) => (props.isArabic ? "2" : "1")};
		grid-row: 1;
	}

	.otherContentWrapper {
		grid-column: ${(props) => (props.isArabic ? "1" : "2")};
		grid-row: 1;
	}

	.navcontent,
	.otherContentWrapper {
		min-width: 0;
	}

	.otherContentWrapper {
		background: #f7f8fc;
		direction: ${(props) => (props.isArabic ? "rtl" : "ltr")};
		overflow: hidden;
		width: 100%;
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

	@media (max-width: 1200px) {
		.grid-container-main {
			display: block;
		}

		.otherContentWrapper {
			min-height: calc(100vh - 70px);
			padding-inline-start: ${(props) =>
				!props.isArabic && props.show ? "72px" : "0"};
			padding-inline-end: ${(props) =>
				props.isArabic && props.show ? "72px" : "0"};
			transition: padding 0.22s ease;
		}
	}

	@media (max-width: 560px) {
		.otherContentWrapper {
			padding-inline-start: 0;
			padding-inline-end: 0;
		}
	}
`;
