import React from "react";
import { Table } from "antd";
import Chart from "react-apexcharts";
import styled from "styled-components";

const ThirdRow = ({
	chosenLanguage = "English",
	adminDashboardReport = {},
}) => {
	// 1) Destructure data from the thirdRow
	const {
		roomsTable = [],
		housekeeping = { clean: 0, cleaning: 0, dirty: 0 },
	} = adminDashboardReport;

	// 2) Prepare the chart data for housekeeping
	// e.g. housekeeping.clean = 25, housekeeping.cleaning = 0, housekeeping.dirty = 0
	const pieChartSeries = [
		housekeeping.clean || 0,
		housekeeping.cleaning || 0,
		housekeeping.dirty || 0,
	];

	// We'll show different labels in Arabic vs English
	const chartLabels =
		chosenLanguage === "Arabic"
			? ["نظيف", "جاري التنظيف", "متسخ"]
			: ["Clean", "Cleaning", "Dirty"];

	// We can also show the total rooms in housekeeping as “total: clean+cleaning+dirty”
	const totalHousekeeping = pieChartSeries.reduce((a, b) => a + b, 0);

	// 3) Chart Options
	const pieChartOptions = {
		chart: {
			type: "donut",
			toolbar: { show: false },
		},
		colors: ["#4CAF50", "#FFC107", "#F44336"], // Clean, Cleaning, Dirty
		dataLabels: { enabled: false },
		plotOptions: {
			pie: {
				donut: {
					size: "70%",
					labels: {
						show: true,
						name: {
							show: true,
							fontSize: "24px",
							fontWeight: "bold",
							color: "#333",
							offsetY: -10,
						},
						value: {
							show: false,
						},
						total: {
							show: true,
							// Shown in the center of donut
							label: String(totalHousekeeping),
							color: "#333",
							fontSize: "24px",
							fontWeight: "bold",
						},
					},
				},
			},
		},
		legend: { show: false },
		labels: chartLabels, // e.g. ["Clean", "Cleaning", "Dirty"] or Arabic
	};

	// 4) Build columns for the Rooms table
	const columns = [
		{
			title: chosenLanguage === "Arabic" ? "النوع" : "Type",
			dataIndex: "type",
			key: "type",
		},
		{
			title: chosenLanguage === "Arabic" ? "مباعة" : "Sold",
			dataIndex: "sold",
			key: "sold",
		},
		{
			title: chosenLanguage === "Arabic" ? "متاحة" : "Available",
			dataIndex: "available",
			key: "available",
		},
		{
			title:
				chosenLanguage === "Arabic" ? "الحجوزات في 7 أيام" : "Booking Next 7",
			dataIndex: "bookingNext7",
			key: "bookingNext7",
		},
		{
			title:
				chosenLanguage === "Arabic"
					? "التوفر في 7 أيام"
					: "Availability Next 7",
			dataIndex: "availabilityNext7",
			key: "availabilityNext7",
		},
		{
			title:
				chosenLanguage === "Arabic" ? "إجمالي الغرف في الفندق" : "Total Rooms",
			dataIndex: "total",
			key: "total",
		},
	];

	return (
		<ThirdRowWrapper>
			{/* Left => Rooms Table */}
			<TableWrapper>
				<TableTitle>
					{chosenLanguage === "Arabic" ? "الغرف" : "Rooms"}
				</TableTitle>
				<StyledTable
					dataSource={roomsTable}
					columns={columns}
					pagination={false}
				/>
			</TableWrapper>

			{/* Right => Housekeeping donut chart */}
			<ChartWrapper>
				<ChartHeader>
					<ChartTitle>
						{chosenLanguage === "Arabic" ? "التنظيف" : "Housekeeping"}
					</ChartTitle>
					<ShowAllLink>
						{chosenLanguage === "Arabic" ? "عرض الكل" : "Show all"}
					</ShowAllLink>
				</ChartHeader>

				<Chart
					options={pieChartOptions}
					series={pieChartSeries}
					type='donut'
					height={200}
				/>

				<LegendList>
					<LegendItem>
						<LegendDot color='#4CAF50' />
						{chartLabels[0]} {housekeeping.clean}
					</LegendItem>
					<LegendItem>
						<LegendDot color='#FFC107' />
						{chartLabels[1]} {housekeeping.cleaning}
					</LegendItem>
					<LegendItem>
						<LegendDot color='#F44336' />
						{chartLabels[2]} {housekeeping.dirty}
					</LegendItem>
				</LegendList>
			</ChartWrapper>
		</ThirdRowWrapper>
	);
};

export default ThirdRow;

// =================== STYLED COMPONENTS ===================

const ThirdRowWrapper = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;
`;

const TableWrapper = styled.div`
	padding: 16px;
	background-color: white;
	border-radius: 8px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const TableTitle = styled.h2`
	margin: 0 0 16px 0;
	font-size: 18px;
	font-weight: bold;
`;

const StyledTable = styled(Table)`
	.ant-table {
		background-color: transparent;
	}
	.ant-table-tbody > tr:nth-child(odd) {
		background-color: #f7f8fa; /* Light grey for odd rows */
	}
	.ant-table-tbody > tr:nth-child(even) {
		background-color: #fff; /* White for even rows */
	}
`;

const ChartWrapper = styled.div`
	padding: 16px;
	background-color: white;
	border-radius: 8px;
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

const ShowAllLink = styled.a`
	color: #1e88e5;
	cursor: pointer;
	font-size: 14px;
	text-decoration: underline;
`;

const LegendList = styled.div`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 100%;
	margin-top: 16px;
`;

const LegendItem = styled.div`
	display: flex;
	align-items: center;
	font-size: 14px;
	margin: 4px 0;
`;

const LegendDot = styled.div`
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background-color: ${(props) => props.color};
	margin-right: 8px;
`;
