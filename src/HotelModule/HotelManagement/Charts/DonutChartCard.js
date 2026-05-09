import React from "react";
import styled from "styled-components";
import { Card } from "antd";
import Chart from "react-apexcharts";

const DonutChartCard = ({ chosenLanguage, DonutChartCard = {} }) => {
	const isArabic = chosenLanguage === "Arabic";
	// 1) Extract data
	const { availableRooms = 0, totalRooms = 0 } = DonutChartCard;
	const availableRoomsSafe = Number.isFinite(Number(availableRooms))
		? Number(availableRooms)
		: 0;
	const totalRoomsSafe = Number.isFinite(Number(totalRooms))
		? Number(totalRooms)
		: 0;

	// 2) Decide which translations to use
		const translations = {
		English: {
			title: "Available Units Today",
			subLabelAvailable: "Available",
			subLabelUsed: "Occupied",
		},
		Arabic: {
			title: "الوحدات المتاحة اليوم",
			subLabelAvailable: "متاح",
			subLabelUsed: "مشغول",
		},
	};
	const { title, subLabelAvailable, subLabelUsed } =
		translations[chosenLanguage] || translations.English;

	// 3) Donut chart setup
	const usedRooms = Math.max(totalRoomsSafe - availableRoomsSafe, 0);
	const formatNumber = (value) =>
		new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

	const pieChartOptions = {
		chart: {
			type: "donut",
			toolbar: { show: false },
		},
		labels: [subLabelAvailable, subLabelUsed],
		colors: ["#1E90FF", "#E0E0E0"], // Blue for available, gray for used
		dataLabels: {
			enabled: false,
		},
		plotOptions: {
			pie: {
				donut: {
					size: "75%",
				},
			},
		},
		legend: {
			show: false,
		},
	};

	const pieChartSeries = [availableRoomsSafe, usedRooms];

	return (
		<CardContainer dir={isArabic ? "rtl" : "ltr"}>
			<StyledCard>
				<ChartWrapper dir='ltr'>
					<Chart
						options={pieChartOptions}
						series={pieChartSeries}
						type='donut'
						height={140}
					/>
				</ChartWrapper>
				<CardContent>
					<CountText>{formatNumber(availableRoomsSafe)}</CountText>
					<CardTitle>
						{title} ({formatNumber(availableRoomsSafe)} /{" "}
						{formatNumber(totalRoomsSafe)})
					</CardTitle>
				</CardContent>
			</StyledCard>
		</CardContainer>
	);
};

export default DonutChartCard;

// ---------------- Styled ----------------

const CardContainer = styled.div``;

const StyledCard = styled(Card)`
	border-radius: 8px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	min-width: 0;
	text-align: center;

	.ant-card-body {
		padding: 16px;
	}
`;

const ChartWrapper = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
`;

const CardContent = styled.div`
	text-align: center;
`;

const CountText = styled.div`
	font-size: 32px;
	font-weight: bold;
	margin-top: -10px; /* Adjust margin to align with the chart if needed */
`;

const CardTitle = styled.div`
	font-size: 16px;
	color: #888;
	overflow-wrap: anywhere;
`;

