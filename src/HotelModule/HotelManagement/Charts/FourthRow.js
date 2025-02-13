import React from "react";
import Chart from "react-apexcharts";
import styled from "styled-components";

const FourthRow = ({
	chosenLanguage = "English",
	adminDashboardReport = {},
}) => {
	// 1) Safely extract from the “fourthRow” data
	const {
		topChannels = [],
		roomNightsByType = [],
		roomRevenueByType = [],
	} = adminDashboardReport;

	// 2) Translate chart titles as needed
	const chartTitles =
		chosenLanguage === "Arabic"
			? {
					topChannels: "أفضل القنوات",
					roomNights: "ليالي الغرف حسب النوع",
					roomRevenue: "إيرادات الغرف حسب النوع",
			  }
			: {
					topChannels: "Top Channels",
					roomNights: "Room Nights by Room Types",
					roomRevenue: "Room Revenue by Room Types",
			  };

	// ---------- 3) Build chart data for “topChannels” ----------
	// e.g. topChannels = [ { name: "jannat employee", value: 86, fillColor: "#4285F4" }, ... ]
	const topChannelsCategories = topChannels.map((item) => item.name);
	const topChannelsSeriesData = topChannels.map((item) => ({
		x: item.name,
		y: item.value,
		fillColor: item.fillColor || "#4285F4",
	}));

	const topChannelsOptions = {
		chart: {
			type: "bar",
			toolbar: { show: false },
		},
		plotOptions: {
			bar: {
				horizontal: false,
				columnWidth: "55%",
				endingShape: "rounded",
			},
		},
		dataLabels: { enabled: false },
		xaxis: { categories: topChannelsCategories },
		yaxis: {
			title: { text: "" },
		},
		fill: { opacity: 1 },
		tooltip: {
			y: {
				formatter: (val) => `${val}`,
			},
		},
	};

	const topChannelsSeries = [
		{
			name: "Top Channels",
			data: topChannelsSeriesData, // [ {x, y, fillColor}, ...]
		},
	];

	// ---------- 4) Build chart data for “roomNightsByType” ----------
	// e.g. roomNightsByType = [ { type: "Quad Rooms", value: 713, fillColor: "#E74C3C" }, ... ]
	const roomNightsCategories = roomNightsByType.map((item) => item.type);
	const roomNightsSeriesData = roomNightsByType.map((item) => ({
		x: item.type,
		y: item.value,
		fillColor: item.fillColor || "#E74C3C",
	}));

	const roomNightsOptions = {
		chart: {
			type: "bar",
			toolbar: { show: false },
		},
		plotOptions: {
			bar: {
				horizontal: false,
				columnWidth: "55%",
				endingShape: "rounded",
			},
		},
		dataLabels: { enabled: false },
		xaxis: { categories: roomNightsCategories },
		yaxis: {
			title: { text: "" },
		},
		fill: { opacity: 1 },
		tooltip: {
			y: {
				formatter: (val) => `${val}`, // e.g. "713"
			},
		},
	};

	const roomNightsSeries = [
		{
			name: "Room Nights",
			data: roomNightsSeriesData,
		},
	];

	// ---------- 5) Build chart data for “roomRevenueByType” ----------
	// e.g. roomRevenueByType = [ { type: "Quad Rooms", value: 103806.1, fillColor: "#FF7373" }, ... ]
	const roomRevenueCategories = roomRevenueByType.map((item) => item.type);
	const roomRevenueSeriesData = roomRevenueByType.map((item) => ({
		x: item.type,
		y: item.value,
		fillColor: item.fillColor || "#FF7373",
	}));

	const roomRevenueOptions = {
		chart: {
			type: "bar",
			toolbar: { show: false },
		},
		plotOptions: {
			bar: {
				horizontal: false,
				columnWidth: "55%",
				endingShape: "rounded",
			},
		},
		dataLabels: { enabled: false },
		xaxis: { categories: roomRevenueCategories },
		yaxis: {
			title: { text: "" },
		},
		fill: { opacity: 1 },
		tooltip: {
			y: {
				formatter: (val) => `${val} SAR`,
			},
		},
	};

	const roomRevenueSeries = [
		{
			name: "Room Revenue",
			data: roomRevenueSeriesData,
		},
	];

	// ---------- 6) Render 3 charts side by side ----------
	return (
		<FourthRowWrapper>
			{/* Top Channels */}
			<ChartCard>
				<ChartTitle>{chartTitles.topChannels}</ChartTitle>
				<Chart
					options={topChannelsOptions}
					series={topChannelsSeries}
					type='bar'
					height={250}
				/>
			</ChartCard>

			{/* Room Nights */}
			<ChartCard>
				<ChartTitle>{chartTitles.roomNights}</ChartTitle>
				<Chart
					options={roomNightsOptions}
					series={roomNightsSeries}
					type='bar'
					height={250}
				/>
			</ChartCard>

			{/* Room Revenue */}
			<ChartCard>
				<ChartTitle>{chartTitles.roomRevenue}</ChartTitle>
				<Chart
					options={roomRevenueOptions}
					series={roomRevenueSeries}
					type='bar'
					height={250}
				/>
			</ChartCard>
		</FourthRowWrapper>
	);
};

export default FourthRow;

// ---------------- STYLED COMPONENTS ----------------

const FourthRowWrapper = styled.div`
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16px;
	background-color: #f7f8fc;
`;

const ChartCard = styled.div`
	background-color: white;
	border-radius: 8px;
	padding: 16px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	align-items: center;
`;

const ChartTitle = styled.h2`
	margin: 0 0 16px 0;
	font-size: 18px;
	font-weight: bold;
	align-self: flex-start;
`;
