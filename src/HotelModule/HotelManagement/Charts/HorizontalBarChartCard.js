import React from "react";
import styled from "styled-components";
import { Card } from "antd";
import Chart from "react-apexcharts";

const HorizontalBarChartCard = ({ chosenLanguage, DonutChartCard = {} }) => {
	const translations = {
		English: {
			title: "Check-ins Today",
			pending: "Pending",
			done: "Done",
			finish: "Finish",
		},
		Arabic: {
			title: "تسجيلات الوصول اليوم",
			pending: "معلق",
			done: "تم",
			finish: "مكتمل",
		},
	};

	const { title, pending, done, finish } =
		translations[chosenLanguage] || translations.English;

	const pendingCount = Number.isFinite(Number(DonutChartCard.pending))
		? Number(DonutChartCard.pending)
		: 0;
	const doneCount = Number.isFinite(Number(DonutChartCard.done))
		? Number(DonutChartCard.done)
		: 0;
	const finishCount = Number.isFinite(Number(DonutChartCard.finish))
		? Number(DonutChartCard.finish)
		: 0;

	const barChartOptions = {
		chart: {
			type: "bar",
			toolbar: {
				show: false,
			},
		},
		plotOptions: {
			bar: {
				horizontal: true,
				barHeight: "50%",
				distributed: true,
			},
		},
		xaxis: {
			categories: [pending, done, finish],
			labels: {
				style: {
					colors: ["#000", "#000", "#000"],
					fontSize: "14px",
				},
			},
		},
		yaxis: {
			labels: {
				style: {
					colors: ["#000", "#000", "#000"],
					fontSize: "14px",
				},
				formatter: function (value) {
					return ""; // Remove the y-axis labels
				},
			},
		},
		fill: {
			type: "gradient",
			gradient: {
				shade: "light",
				type: "horizontal",
				shadeIntensity: 0.5,
				gradientToColors: ["#FFD700", "#7CFC00", "#DA70D6"],
				opacityFrom: 0.7,
				opacityTo: 0.9,
			},
		},
		colors: ["#FFA500", "#32CD32", "#8A2BE2"],
		dataLabels: {
			enabled: false,
		},
		legend: {
			show: false,
		},
		grid: {
			show: false,
		},
	};

	const barChartSeries = [
		{
			data: [pendingCount, doneCount, finishCount],
		},
	];

	return (
		<CardContainer dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
			<StyledCard>
				<ChartTitle>{title}</ChartTitle>
				<ChartWrapper>
					<Chart
						options={barChartOptions}
						series={barChartSeries}
						type='bar'
						height={140}
					/>
				</ChartWrapper>
				<Legend>
					<LegendItem>
						<LegendLabel>
							<LegendColor
								style={{
									background: "linear-gradient(to right, #FFA500, #FFD700)",
								}}
							/>
							<LegendText>{pending}</LegendText>
						</LegendLabel>
						<LegendValue>{pendingCount}</LegendValue>
					</LegendItem>
					<LegendItem>
						<LegendLabel>
							<LegendColor
								style={{
									background: "linear-gradient(to right, #32CD32, #7CFC00)",
								}}
							/>
							<LegendText>{done}</LegendText>
						</LegendLabel>
						<LegendValue>{doneCount}</LegendValue>
					</LegendItem>
					<LegendItem>
						<LegendLabel>
							<LegendColor
								style={{
									background: "linear-gradient(to right, #8A2BE2, #DA70D6)",
								}}
							/>
							<LegendText>{finish}</LegendText>
						</LegendLabel>
						<LegendValue>{finishCount}</LegendValue>
					</LegendItem>
				</Legend>
			</StyledCard>
		</CardContainer>
	);
};

export default HorizontalBarChartCard;

const CardContainer = styled.div``;

const StyledCard = styled(Card)`
	border-radius: 12px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	padding: 20px;
	text-align: center;
`;

const ChartTitle = styled.div`
	font-size: 18px;
	font-weight: bold;
	margin-bottom: 10px;
`;

const ChartWrapper = styled.div`
	margin-bottom: 10px;
`;

const Legend = styled.div`
	display: flex;
	justify-content: space-around;
	margin-top: 10px;
`;

const LegendItem = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	font-size: 14px;
`;

const LegendLabel = styled.div`
	display: flex;
	align-items: center;
`;

const LegendColor = styled.div`
	width: 12px;
	height: 12px;
	border-radius: 50%;
	margin-right: 4px;
`;

const LegendText = styled.div`
	margin-right: 4px;
`;

const LegendValue = styled.span`
	font-size: 16px;
	font-weight: bold;
	margin-top: 2px;
	text-align: center;
`;


