import React from "react";
import styled from "styled-components";

import ThirdRow from "./ThirdRow";
import FourthRow from "./FourthRow";
import FifthRow from "./FifthRow";
import SecondRow from "./SecondRow";

// Use the existing translations object
const translations = {
	English: {
		arrivals: "Arrivals Today",
		departures: "Departures Today",
		inHouse: "In-house Now",
		arrivingTomorrow: "Arrivals Tomorrow", // We'll use this label for tomorrowArrivals
		todaysReservations: "Bookings Today",
		allReservations: "Active Reservations",
		cancellations: "Cancellations Today",
		noShow: "No-shows Today",
		occupancy: "Occupancy Today",
		individuals: "Individuals",
		online: "Online",
		company: "Company",
		availableRoomToday: "Available Units Today",
		booked: "Booked",
		available: "Available",
		blocked: "Blocked",
		type: "Room Name",
		availableRooms: "Available Units",
		sold: "Booked",
		outOfOrder: "Out Of Order/Service",
		total: "Total",
		housekeeping: "Housekeeping",
		clean: "Clean",
		cleaning: "Cleaning",
		dirty: "Dirty",
	},
	Arabic: {
		arrivals: "وصول اليوم",
		departures: "مغادرة اليوم",
		inHouse: "نزلاء مقيمون الآن",
		arrivingTomorrow: "وصول الغد", // We'll use this label for tomorrowArrivals
		todaysReservations: "حجوزات اليوم",
		allReservations: "الحجوزات النشطة",
		cancellations: "إلغاءات اليوم",
		noShow: "عدم الحضور اليوم",
		occupancy: "إشغال اليوم",
		individuals: "الأفراد",
		online: "أونلاين",
		company: "شركات",
		availableRoomToday: "الوحدات المتاحة اليوم",
		booked: "محجوز",
		available: "متاح",
		blocked: "محجوب",
		type: "اسم الغرفة",
		availableRooms: "وحدات متاحة",
		sold: "محجوز",
		outOfOrder: "خارج الخدمة",
		total: "الإجمالي",
		housekeeping: "التدبير المنزلي",
		clean: "نظيف",
		cleaning: "قيد التنظيف",
		dirty: "متسخ",
	},
};

const Dashboard = ({ chosenLanguage = "English", adminDashboardReport }) => {
	const t = translations[chosenLanguage] || translations.English;

	// Safely extract the firstRow data
	const {
		arrivals = 0,
		departures = 0,
		inHouse = 0,
		booking = 0,
		overAllBookings = 0,
		tomorrowArrivals = 0,
	} = adminDashboardReport?.firstRow || {};

	return (
		<DashboardWrapper dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
			{/* FIRST ROW of 6 InfoCards */}
			<FirstRow>
				{/* Arrivals */}
				<InfoCard backgroundColor='#E3F2FD'>
					<CardNumber>{arrivals}</CardNumber>
					<CardTitle>{t.arrivals}</CardTitle>
				</InfoCard>

				{/* Departures */}
				<InfoCard backgroundColor='#F3E5F5'>
					<CardNumber>{departures}</CardNumber>
					<CardTitle>{t.departures}</CardTitle>
				</InfoCard>

				{/* In-House */}
				<InfoCard backgroundColor='#E8F5E9'>
					<CardNumber>{inHouse}</CardNumber>
					<CardTitle>{t.inHouse}</CardTitle>
				</InfoCard>

				{/* Tomorrow Arrivals (used as "Stayovers" label) */}
				<InfoCard backgroundColor='#FFF3E0' border>
					<CardNumber>{tomorrowArrivals}</CardNumber>
					<CardTitle>{t.arrivingTomorrow}</CardTitle>
				</InfoCard>

				{/* Today's Bookings */}
				<InfoCard backgroundColor='#FFFDE7'>
					<CardNumber>{booking}</CardNumber>
					<CardTitle>{t.todaysReservations}</CardTitle>
				</InfoCard>

				{/* Overall Bookings (used as "OverBookings" label) */}
				<InfoCard backgroundColor='#FFEBEE'>
					<CardNumber>{overAllBookings}</CardNumber>
					<CardTitle>{t.allReservations}</CardTitle>
				</InfoCard>
			</FirstRow>

			{/* SECOND ROW */}
			<SecondRow
				chosenLanguage={chosenLanguage}
				translations={translations}
				adminDashboardReport={adminDashboardReport.secondRow}
			/>

			{/* THIRD ROW */}
			<ThirdRow
				chosenLanguage={chosenLanguage}
				translations={translations}
				adminDashboardReport={adminDashboardReport.thirdRow}
			/>

			{/* FOURTH ROW */}
			<FourthRow
				chosenLanguage={chosenLanguage}
				translations={translations}
				adminDashboardReport={adminDashboardReport.fourthRow}
			/>

			{/* FIFTH ROW */}
			<FifthRow
				chosenLanguage={chosenLanguage}
				translations={translations}
				adminDashboardReport={adminDashboardReport.fifthRow}
			/>
		</DashboardWrapper>
	);
};

export default Dashboard;

// ---------------- STYLES ----------------

const DashboardWrapper = styled.div`
	padding: 24px;
	background-color: #f7f8fc;
	display: grid;
	grid-template-rows: auto auto auto;
	gap: 24px;
`;

const FirstRow = styled.div`
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	gap: 16px;
`;

const InfoCard = styled.div`
	background-color: ${(props) => props.backgroundColor};
	border-radius: 8px;
	padding: 16px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	height: 100%;
	position: relative; // allows you to position Badge absolutely if you bring it back
`;

const CardTitle = styled.div`
	font-size: 18px;
	font-weight: bold;
	color: black;
	margin: auto 10px !important;
`;

const CardNumber = styled.div`
	font-size: 25px;
	font-weight: bold;
	color: black;
	margin: auto 10px !important;
`;

/** Uncomment if you want a Badge somewhere
const Badge = styled.div`
  background-color: #1e88e5;
  color: white;
  border-radius: 50%;
  padding: 4px 8px;
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 14px;
  font-weight: bold;
`;
**/
