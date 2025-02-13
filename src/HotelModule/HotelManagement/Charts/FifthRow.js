import React from "react";
import Chart from "react-apexcharts";
import styled from "styled-components";

const FifthRow = ({
	chosenLanguage = "English",
	adminDashboardReport = {},
}) => {
	// Safely extract from adminDashboardReport.fifthRow
	const {
		bookingLine = { categories: [], checkIn: [], checkOut: [] },
		visitorsLine = { categories: [], yesterday: [], today: [] },
	} = adminDashboardReport;

	// 1) Booking line chart (Check In / Check Out)
	const bookingOptions = {
		chart: {
			type: "line",
			toolbar: { show: false },
		},
		stroke: {
			curve: "smooth",
			width: 2,
		},
		xaxis: {
			categories: bookingLine.categories, // e.g. ["2025-02-02", "2025-02-03", ...]
		},
		yaxis: {
			title: {
				text: "",
			},
		},
		tooltip: {
			y: {
				formatter: (val) => `${val}`,
			},
		},
		legend: {
			position: "top",
		},
	};

	// We have two series: checkIn & checkOut
	const bookingSeries = [
		{
			name: chosenLanguage === "Arabic" ? "تسجيل دخول" : "Check-In",
			data: bookingLine.checkIn || [],
		},
		{
			name: chosenLanguage === "Arabic" ? "تسجيل خروج" : "Check-Out",
			data: bookingLine.checkOut || [],
		},
	];

	// 2) Visitors line chart (Yesterday / Today)
	const visitorsOptions = {
		chart: {
			type: "line",
			toolbar: { show: false },
		},
		stroke: {
			curve: "smooth",
			width: 3,
		},
		xaxis: {
			categories: visitorsLine.categories || [], // e.g. ["10am","2pm","6pm","11pm"]
		},
		yaxis: {
			title: {
				text: "",
			},
		},
		tooltip: {
			y: {
				formatter: (val) => `${val}`,
			},
		},
		legend: {
			position: "top",
		},
		// You can specify colors if you want: colors: ["#A5D6A7", "#66BB6A"],
	};

	const visitorsSeries = [
		{
			name: chosenLanguage === "Arabic" ? "أمس" : "Yesterday",
			data: visitorsLine.yesterday || [],
		},
		{
			name: chosenLanguage === "Arabic" ? "اليوم" : "Today",
			data: visitorsLine.today || [],
		},
	];

	return (
		<FifthRowWrapper>
			{/* Large Chart (Booking) */}
			<ChartCardLarge>
				<ChartHeader>
					<ChartTitle>
						{chosenLanguage === "Arabic" ? "الحجوزات" : "Booking"}
					</ChartTitle>
					<ChartSubtitle>
						{chosenLanguage === "Arabic"
							? "آخر تحديث منذ دقيقة واحدة"
							: "Last update 1m ago"}
					</ChartSubtitle>
					<ChartTimeframe>
						{chosenLanguage === "Arabic" ? "آخر 7 أيام" : "Last 7 days"}
					</ChartTimeframe>
				</ChartHeader>
				<Chart
					options={bookingOptions}
					series={bookingSeries}
					type='line'
					height={250}
				/>
			</ChartCardLarge>

			{/* Small Chart (Visitors Over Time) */}
			<ChartCardSmall>
				<ChartHeader>
					<ChartTitle>
						{chosenLanguage === "Arabic"
							? "الزوار على مدار الوقت"
							: "Visitors Over Time"}
					</ChartTitle>
				</ChartHeader>
				<Chart
					options={visitorsOptions}
					series={visitorsSeries}
					type='line'
					height={250}
				/>
				<Legend>
					<LegendItem color='#A5D6A7'>
						{chosenLanguage === "Arabic" ? "أمس" : "Yesterday"}
					</LegendItem>
					<LegendItem color='#66BB6A'>
						{chosenLanguage === "Arabic" ? "اليوم" : "Today"}
					</LegendItem>
				</Legend>
			</ChartCardSmall>
		</FifthRowWrapper>
	);
};

export default FifthRow;

// ====================== STYLED COMPONENTS ======================

const FifthRowWrapper = styled.div`
	display: grid;
	grid-template-columns: 65% 35%;
	gap: 16px;
	background-color: #f7f8fc;
`;

const ChartCardLarge = styled.div`
	background-color: white;
	border-radius: 8px;
	padding: 16px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
`;

const ChartCardSmall = styled.div`
	background-color: white;
	border-radius: 8px;
	padding: 16px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	align-items: center;
`;

const ChartHeader = styled.div`
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

const ChartTitle = styled.h2`
	margin: 0;
	font-size: 18px;
	font-weight: bold;
`;

const ChartSubtitle = styled.p`
	margin: 0;
	font-size: 12px;
	color: gray;
`;

const ChartTimeframe = styled.p`
	margin: 0;
	font-size: 14px;
	color: #66bb6a;
`;

const Legend = styled.div`
	display: flex;
	justify-content: center;
	margin-top: 16px;
`;

const LegendItem = styled.div`
	display: flex;
	align-items: center;
	color: ${(props) => props.color};
	font-size: 14px;
	margin: 0 8px;
`;
