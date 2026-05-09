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
	const numberFormatter = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 0,
	});
	const formatAxisDate = (value) => {
		const text = String(value || "");
		if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
		return (bookingLine.categories || []).length > 45 ? text.slice(5) : text;
	};

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
			tickAmount: (bookingLine.categories || []).length > 14 ? 8 : undefined,
			labels: {
				rotate: (bookingLine.categories || []).length > 10 ? -35 : 0,
				hideOverlappingLabels: true,
				trim: true,
				formatter: formatAxisDate,
				style: { fontSize: "11px" },
			},
		},
		yaxis: {
			title: {
				text: "",
			},
			forceNiceScale: true,
			labels: {
				formatter: (value) => numberFormatter.format(value || 0),
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
			labels: {
				style: { fontSize: "11px" },
			},
		},
		yaxis: {
			title: {
				text: "",
			},
			forceNiceScale: true,
			labels: {
				formatter: (value) => numberFormatter.format(value || 0),
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
						{chosenLanguage === "Arabic"
							? "الوصول مقابل المغادرة"
							: "Check-ins vs Check-outs"}
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
	grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
	gap: 14px;
	background-color: #f7f8fc;
	min-width: 0;

	@media (max-width: 1080px) {
		grid-template-columns: 1fr;
	}
`;

const ChartCardLarge = styled.div`
	background-color: white;
	border-radius: 8px;
	padding: 16px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
`;

const ChartCardSmall = styled.div`
	background-color: white;
	border-radius: 8px;
	padding: 16px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	align-items: center;
	min-width: 0;
	overflow: hidden;
`;

const ChartHeader = styled.div`
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;

	@media (max-width: 640px) {
		align-items: flex-start;
		flex-direction: column;
	}
`;

const ChartTitle = styled.h2`
	margin: 0;
	font-size: 18px;
	font-weight: bold;
	line-height: 1.25;
	overflow-wrap: anywhere;
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
