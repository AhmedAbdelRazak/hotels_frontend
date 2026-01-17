import React from "react";
import styled from "styled-components";
import { Card } from "antd";
import Chart from "react-apexcharts";

const LineChartCard = ({ chosenLanguage, bookingLine = {} }) => {
	const translations = {
		English: {
			title: "Check-in/Check-out Trend",
			subtitle: "Last 7 days",
			checkIn: "Check In",
			checkOut: "Check Out",
		},
		Arabic: {
			title: "اتجاه الوصول والمغادرة",
			subtitle: "آخر 7 أيام",
			checkIn: "تسجيل الوصول",
			checkOut: "تسجيل المغادرة",
		},
	};

	const { title, subtitle, checkIn, checkOut } =
		translations[chosenLanguage] || translations.English;

	const toNumber = (value) => {
		const num = Number(value);
		return Number.isFinite(num) ? num : 0;
	};

	const buildFallbackCategories = () => {
		const days = [];
		const today = new Date();
		for (let i = 6; i >= 0; i -= 1) {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			days.push(d.toISOString().slice(0, 10));
		}
		return days;
	};

	const rawCategories = Array.isArray(bookingLine?.categories)
		? bookingLine.categories
		: [];
	const categories =
		rawCategories.length > 0 ? rawCategories : buildFallbackCategories();

	const normalizeSeries = (data, length) => {
		const arr = Array.isArray(data) ? data.map(toNumber) : [];
		if (length <= 0) return arr;
		if (arr.length >= length) return arr.slice(0, length);
		return arr.concat(new Array(length - arr.length).fill(0));
	};

	const checkInData = normalizeSeries(bookingLine?.checkIn, categories.length);
	const checkOutData = normalizeSeries(
		bookingLine?.checkOut,
		categories.length
	);

	const totalCheckIn = checkInData.reduce((sum, value) => sum + value, 0);
	const totalCheckOut = checkOutData.reduce((sum, value) => sum + value, 0);

	const chartOptions = {
		chart: {
			id: "reservation-statistic",
			toolbar: {
				show: false,
			},
		},
		xaxis: {
			categories,
		},
		stroke: {
			curve: "smooth",
		},
		fill: {
			type: "gradient",
			gradient: {
				shade: "light",
				type: "vertical",
				shadeIntensity: 0.5,
				gradientToColors: ["#87CEEB", "#FFA07A"],
				opacityFrom: 0.7,
				opacityTo: 0.9,
			},
		},
		colors: ["#aac7fe", "#f68d8d"],
		dataLabels: {
			enabled: false,
		},
		grid: {
			borderColor: "#f1f1f1",
		},
	};

	const chartSeries = [
		{
			name: checkIn,
			data: checkInData,
		},
		{
			name: checkOut,
			data: checkOutData,
		},
	];

	return (
		<StyledCard>
			<CardHeader>
				<HeaderContent>
					<div>
						<ChartTitle>{title}</ChartTitle>
						<Subtitle>{subtitle}</Subtitle>
					</div>
					<Stats>
						<StatItem>
							<StatNumber className='mx-2'>
								{totalCheckIn.toLocaleString()}
							</StatNumber>{" "}
							{checkIn}
						</StatItem>
						<StatItem>
							<StatNumber className='mx-2'>
								{totalCheckOut.toLocaleString()}
							</StatNumber>{" "}
							{checkOut}
						</StatItem>
					</Stats>
				</HeaderContent>
			</CardHeader>

			<ChartWrapper>
				<Chart
					options={chartOptions}
					series={chartSeries}
					type='area'
					height={480} // Adjust height to match combined height of the charts on the right
				/>
			</ChartWrapper>
		</StyledCard>
	);
};

export default LineChartCard;

const StyledCard = styled(Card)`
	border-radius: 12px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	padding: 0; // Remove extra padding
	text-align: center;
`;

const CardHeader = styled.div`
	padding: 20px; // Add padding for header
`;

const HeaderContent = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

const ChartTitle = styled.div`
	font-size: 18px;
	font-weight: bold;
`;

const Subtitle = styled.div`
	font-size: 14px;
	text-align: center;
	color: #888;
	margin-bottom: 8px;
`;

const Stats = styled.div`
	display: flex;
	flex-direction: column;
	align-items: flex-end;
`;

const StatItem = styled.div`
	display: flex;
	align-items: center;
	color: #888;
`;

const StatNumber = styled.span`
	font-size: 18px;
	color: #000;
	font-weight: bold;
	margin-right: 4px;
`;

const ChartWrapper = styled.div`
	width: 100%; // Ensure chart takes full width
`;
