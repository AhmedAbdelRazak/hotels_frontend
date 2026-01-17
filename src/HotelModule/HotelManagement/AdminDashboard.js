import React, { useEffect, useState } from "react";
import styled from "styled-components";
import DonutChartCard from "./Charts/DonutChartCard";
import LineChartCard from "./Charts/LineChartCard";
import HorizontalBarChartCard from "./Charts/HorizontalBarChartCard";
import Dashboard from "./Charts/Dashboard";
// eslint-disable-next-line
import InfoCard1 from "./Charts/InfoCard1";
import { gettingAdminDashboardFigures } from "../apiAdmin";

const AdminDashboard = ({ chosenLanguage }) => {
	const [adminDashboardReport, setAdminDashboardReport] = useState(null);

	const selectedHotel = JSON.parse(localStorage.getItem("selectedHotel")) || {};

	const emptyReport = {
		firstRow: {
			arrivals: 0,
			departures: 0,
			inHouse: 0,
			booking: 0,
			overAllBookings: 0,
			tomorrowArrivals: 0,
		},
		secondRow: {
			cancellations: 0,
			noShow: 0,
			occupancy: { booked: 0, available: 0, overallRoomsCount: 0 },
			latestCheckouts: [],
			upcomingCheckins: [],
		},
		thirdRow: {
			roomsTable: [],
			housekeeping: { clean: 0, cleaning: 0, dirty: 0 },
		},
		fourthRow: {
			topChannels: [],
			roomNightsByType: [],
			roomRevenueByType: [],
		},
		fifthRow: {
			bookingLine: { categories: [], checkIn: [], checkOut: [] },
			visitorsLine: { categories: [], yesterday: [], today: [] },
		},
		donutChartCard: { availableRooms: 0, totalRooms: 0 },
		horizontalBarChartCard: { pending: 0, done: 0, finish: 0 },
	};

	// eslint-disable-next-line
	const translations = {
		English: {
			newBookings: "New Bookings",
			scheduleRoom: "Schedule Room",
			checkIn: "Check In",
			checkOut: "Check Out",
		},
		Arabic: {
			newBookings: "حجوزات جديدة",
			scheduleRoom: "جدولة الغرفة",
			checkIn: "تسجيل دخول",
			checkOut: "تسجيل خروج",
		},
	};

	// Fetch the admin dashboard figures
	const adminDashboardFigures = () => {
		if (!selectedHotel?._id) {
			setAdminDashboardReport(emptyReport);
			return;
		}

		gettingAdminDashboardFigures(selectedHotel._id)
			.then((res) => {
				if (res?.data) {
					setAdminDashboardReport(res.data);
					return;
				}

				console.error("Error fetching admin dashboard report.");
				setAdminDashboardReport(emptyReport);
			})
			.catch((err) => {
				console.error(err);
				setAdminDashboardReport(emptyReport);
			});
	};

	useEffect(() => {
		adminDashboardFigures();
		// eslint-disable-next-line
	}, []);

	// If adminDashboardReport is still null, show a loading placeholder
	if (!adminDashboardReport) {
		return <div>Loading...</div>;
	}

	return (
		<DashboardWrapper dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
			{/* Pass the entire object to <Dashboard /> as you originally did */}
			<Dashboard
				chosenLanguage={chosenLanguage}
				adminDashboardReport={adminDashboardReport}
			/>

			{/* <InfoCard1 chosenLanguage={chosenLanguage} translations={translations} /> */}

			<ChartsGrid>
				<ChartsWrapper>
					{/* 
            Note the change: 
            We now pass adminDashboardReport.donutChartCard 
            instead of adminDashboardReport.DonutChartCard
          */}
					<DonutChartCard
						chosenLanguage={chosenLanguage}
						DonutChartCard={adminDashboardReport.donutChartCard}
					/>
					<HorizontalBarChartCard
						chosenLanguage={chosenLanguage}
						DonutChartCard={adminDashboardReport.horizontalBarChartCard}
					/>
				</ChartsWrapper>
				<LineChartWrapper>
					<LineChartCard chosenLanguage={chosenLanguage} />
				</LineChartWrapper>
			</ChartsGrid>
		</DashboardWrapper>
	);
};

export default AdminDashboard;

// ---------------- STYLES ----------------

const DashboardWrapper = styled.div`
	padding: 24px;
	background-color: #f7f8fc;
`;

const ChartsGrid = styled.div`
	display: grid;
	grid-template-columns: 2fr 5fr; // Two columns with a ratio of 2:5
	gap: 25px; // Even gap between the charts
	align-items: start; // Align items to the start of the grid
`;

const ChartsWrapper = styled.div`
	display: grid;
	grid-template-rows: 1fr 1fr; // Two equal rows
	gap: 25px; // Even gap between the charts
	height: 200px; // Combined height for both charts
`;

const LineChartWrapper = styled.div``;
