import React from "react";
import styled from "styled-components";
import { Card } from "antd";
import Chart from "react-apexcharts";

const DonutChartCard = ({ chosenLanguage, DonutChartCard = {} }) => {
	// 1) Extract data
	const { availableRooms = 0, totalRooms = 0 } = DonutChartCard;

	// 2) Decide which translations to use
	const translations = {
		English: {
			title: "Available Room Today",
			subLabelAvailable: "Available",
			subLabelUsed: "Used",
		},
		Arabic: {
			title: "الغرف المتاحة اليوم",
			subLabelAvailable: "متاحة",
			subLabelUsed: "مشغولة",
		},
	};
	const { title, subLabelAvailable, subLabelUsed } =
		translations[chosenLanguage] || translations.English;

	// 3) Donut chart setup
	const usedRooms = Math.max(totalRooms - availableRooms, 0);

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

	const pieChartSeries = [availableRooms, usedRooms];

	return (
		<CardContainer>
			<StyledCard>
				<ChartWrapper>
					<Chart
						options={pieChartOptions}
						series={pieChartSeries}
						type='donut'
						height={140}
					/>
				</ChartWrapper>
				<CardContent>
					<CountText>{availableRooms}</CountText>
					<CardTitle>
						{title} ({availableRooms} / {totalRooms})
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
	border-radius: 12px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	text-align: center;
	padding: 20px;
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
`;
