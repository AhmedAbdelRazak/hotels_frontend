import React, { useState } from "react";
import { Table } from "antd";
import {
	FaExclamationCircle,
	FaCheckCircle,
	FaTimesCircle,
	FaBed,
	FaUser,
	FaCalendarAlt,
	FaClipboardCheck,
	FaRegClipboard,
	FaEllipsisV,
} from "react-icons/fa";
import Chart from "react-apexcharts";
import styled from "styled-components";

// Room type mapping, supporting both English & Arabic labels
const ROOM_TYPES_MAPPING = [
	{
		value: "standardRooms",
		labelEn: "Standard Rooms",
		labelAr: "غرف ستاندرد",
	},
	{
		value: "singleRooms",
		labelEn: "Single Rooms",
		labelAr: "غرف فردية",
	},
	{
		value: "doubleRooms",
		labelEn: "Double Room",
		labelAr: "غرفة مزدوجة",
	},
	{
		value: "twinRooms",
		labelEn: "Twin Rooms",
		labelAr: "غرف بسريرين منفصلين",
	},
	{
		value: "queenRooms",
		labelEn: "Queen Rooms",
		labelAr: "غرف كوين",
	},
	{
		value: "kingRooms",
		labelEn: "King Rooms",
		labelAr: "غرف كينج",
	},
	{
		value: "tripleRooms",
		labelEn: "Triple Room",
		labelAr: "غرفة ثلاثية",
	},
	{
		value: "quadRooms",
		labelEn: "Quad Rooms",
		labelAr: "غرف رباعية",
	},
	{
		value: "studioRooms",
		labelEn: "Studio Rooms",
		labelAr: "غرف ستوديو",
	},
	{
		value: "suite",
		labelEn: "Suite",
		labelAr: "جناح",
	},
	{
		value: "masterSuite",
		labelEn: "Master Suite",
		labelAr: "جناح رئيسي",
	},
	{
		value: "familyRooms",
		labelEn: "Family Rooms",
		labelAr: "غرف عائلية",
	},
	{
		value: "individualBed",
		labelEn: "Rooms With Individual Beds (Shared Rooms)",
		labelAr: "غرف بأسرة فردية (مشتركة)",
	},
];

const SecondRow = ({
	chosenLanguage,
	translations,
	adminDashboardReport = {},
}) => {
	const t = translations[chosenLanguage] || translations.English;

	// 1) Destructure from the "secondRow" data
	const {
		cancellations = 0,
		noShow = 0,
		occupancy = {},
		upcomingCheckins = [],
	} = adminDashboardReport;

	// 2) Occupancy chart data
	const { booked = 0, available = 0, overallRoomsCount = 0 } = occupancy;
	const totalRooms = overallRoomsCount || 0;
	const blocked = totalRooms - booked - available;

	// Convert to percentages for the chart
	const bookedPct = totalRooms ? Math.round((booked / totalRooms) * 100) : 0;
	const availablePct = totalRooms
		? Math.round((available / totalRooms) * 100)
		: 0;
	const blockedPct = totalRooms ? Math.round((blocked / totalRooms) * 100) : 0;

	// 3) Donut Chart config
	const pieChartOptions = {
		chart: {
			type: "donut",
			toolbar: { show: false },
		},
		colors: ["#0069cf", "#00a753", "#636363"],
		dataLabels: { enabled: false },
		plotOptions: {
			pie: {
				donut: { size: "75%" },
			},
		},
		legend: { show: false },
	};
	const pieChartSeries = [bookedPct, availablePct, blockedPct];

	// 4) "Load More" setup
	const [rowsToShow, setRowsToShow] = useState(3);
	const hasMoreRows = rowsToShow < upcomingCheckins.length;

	// Helper to get the right label based on chosenLanguage
	const getRoomTypeLabel = (typeValue) => {
		const found = ROOM_TYPES_MAPPING.find((r) => r.value === typeValue);
		if (!found) return typeValue; // fallback if not matched
		return chosenLanguage === "Arabic" ? found.labelAr : found.labelEn;
	};

	// 5) Table columns
	const columns = [
		{
			// Guest name
			title: chosenLanguage === "Arabic" ? "اسم الضيف" : "Guest",
			dataIndex: "guest",
			key: "guest",
			render: (text, record) => (
				<>
					<div style={{ fontWeight: "bold" }}>{text}</div>
					{/* Subtext in grey => confirmation_number */}
					<div style={{ color: "grey" }}>{record.guestId}</div>
				</>
			),
		},
		{
			// Accommodation => e.g. "Double Room - 5 nights"
			title: chosenLanguage === "Arabic" ? "الإقامة" : "Accommodation",
			dataIndex: "accommodation",
			key: "accommodation",
		},
		{
			// Stay => dateRange
			title: chosenLanguage === "Arabic" ? "الفترة" : "Stay",
			dataIndex: "stay",
			key: "stay",
			render: (stay, record) => (
				<StayColumn>
					<div>{stay}</div>
					<StayIcons>
						<IconWrapper>
							<FaBed /> {record.flag}
						</IconWrapper>
						<IconWrapper>
							<FaUser /> {record.number_of_guests}
						</IconWrapper>
						<IconWrapper>
							<FaCalendarAlt /> 0
						</IconWrapper>
					</StayIcons>
				</StayColumn>
			),
		},
		{
			// Status => e.g. "confirmed"
			title: chosenLanguage === "Arabic" ? "الحالة" : "Status",
			dataIndex: "status",
			key: "status",
			render: (status, record) => (
				<StatusButton>
					{status}
					{record.amount && <Amount>{record.amount}</Amount>}
				</StatusButton>
			),
		},
		{
			// Action icons
			title: "",
			dataIndex: "actions",
			key: "actions",
			render: () => (
				<Actions>
					<ActionButton>
						<FaClipboardCheck />
					</ActionButton>
					<ActionButton>
						<FaRegClipboard />
					</ActionButton>
					<ActionButton>
						<FaEllipsisV />
					</ActionButton>
				</Actions>
			),
		},
	];

	// 6) Build the table data from upcomingCheckins
	const tableData = upcomingCheckins.slice(0, rowsToShow).map((item) => ({
		key: item._id,
		guest: item.name || "N/A",
		guestId: item.confirmation_number || "",
		accommodation: `${getRoomTypeLabel(item.room_type)} - ${item.nights} ${
			chosenLanguage === "Arabic" ? "ليالي" : "nights"
		}`,
		stay: item.dateRange || "",
		status: item.reservation_status || "",
		number_of_guests: item.number_of_guests || 2,
		flag: item.flag || 1,
		amount: "",
	}));

	return (
		<SecondRowWrapper>
			{/* LEFT SECTION => Cancellations / NoShow / Individuals block */}
			<LeftSection>
				<SmallInfoCard backgroundColor='#E1F5FE'>
					<CardTitle2>{t.cancellations}</CardTitle2>
					<CardNumber
						style={{
							color: "white",
							background: "#c48989",
							borderRadius: "25%",
							padding: "5px",
							fontSize: "16px",
						}}
					>
						{cancellations}
					</CardNumber>
				</SmallInfoCard>

				<SmallInfoCard backgroundColor='#EDE7F6'>
					<CardTitle2>{t.noShow}</CardTitle2>
					<CardNumber
						style={{
							color: "white",
							background: "#89a6c4",
							borderRadius: "25%",
							padding: "5px",
							fontSize: "16px",
						}}
					>
						{noShow}
					</CardNumber>
				</SmallInfoCard>

				{/* Hard-coded "Individuals / Online / Company" block */}
				<InfoCard backgroundColor='#E1F5FE'>
					<CardTitle2>{t.individuals}</CardTitle2>
					<SmallCardRow>
						<SmallCardTitle>{t.individuals}</SmallCardTitle>
						<SmallCardNumber>5</SmallCardNumber>
					</SmallCardRow>
					<SmallCardRow>
						<SmallCardTitle>{t.online}</SmallCardTitle>
						<SmallCardNumber>49</SmallCardNumber>
					</SmallCardRow>
					<SmallCardRow>
						<SmallCardTitle>{t.company}</SmallCardTitle>
						<SmallCardNumber>13</SmallCardNumber>
					</SmallCardRow>
				</InfoCard>
			</LeftSection>

			{/* MIDDLE SECTION => Occupancy donut chart */}
			<MiddleSection>
				<ChartCard>
					<Chart
						options={pieChartOptions}
						series={pieChartSeries}
						type='donut'
						height={230}
					/>
					<CardTitle3>{t.occupancy}</CardTitle3>
					<LegendVertical>
						<LegendItem color='#0069cf'>
							<FaCheckCircle /> {t.booked} {bookedPct}%
						</LegendItem>
						<LegendItem color='#00a753'>
							<FaTimesCircle /> {t.available} {availablePct}%
						</LegendItem>
						<LegendItem color='#636363'>
							<FaExclamationCircle /> {t.blocked} {blockedPct}%
						</LegendItem>
					</LegendVertical>
				</ChartCard>
			</MiddleSection>

			{/* RIGHT SECTION => Table + "Load More" for upcomingCheckins */}
			<RightSection style={{ background: "#fff" }}>
				<InfoTable
					dataSource={tableData}
					columns={columns}
					pagination={false}
				/>
				{hasMoreRows && (
					<LoadMoreContainer>
						<LoadMoreButton
							onClick={() => setRowsToShow(upcomingCheckins.length)}
						>
							{chosenLanguage === "Arabic" ? "عرض المزيد" : "Load More"}
						</LoadMoreButton>
					</LoadMoreContainer>
				)}
			</RightSection>
		</SecondRowWrapper>
	);
};

export default SecondRow;

// -------------------- STYLED COMPONENTS --------------------
const SecondRowWrapper = styled.div`
	display: grid;
	grid-template-columns: 15% 15% 70%;
	gap: 16px;
`;

const LeftSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
`;

const MiddleSection = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
`;

const RightSection = styled.div`
	display: flex;
	flex-direction: column;
	background: #fff;
`;

const SmallInfoCard = styled.div`
	background-color: ${(props) => props.backgroundColor};
	border-radius: 8px;
	padding: 8px;
	text-align: center;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	font-size: 20px;
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

const InfoCard = styled.div`
	background-color: ${(props) => props.backgroundColor};
	border-radius: 8px;
	padding: 16px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	height: 100%;
`;

const CardTitle2 = styled.div`
	font-size: 18px;
	font-weight: bold;
	color: black;
	text-align: left;
`;

const CardNumber = styled.div`
	font-size: 25px;
	font-weight: bold;
	color: black;
	margin: auto 10px !important;
`;

const SmallCardRow = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

const SmallCardTitle = styled.div`
	font-size: 16px;
`;

const SmallCardNumber = styled.div`
	font-size: 16px;
	font-weight: bold;
	color: #1e88e5;
`;

const ChartCard = styled.div`
	background-color: ${(props) => props.backgroundColor};
	border-radius: 8px;
	padding: 16px;
	text-align: center;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	align-items: center;
`;

const CardTitle3 = styled.div`
	font-size: 18px;
	font-weight: bold;
	color: black;
	text-align: left;
	margin-top: 8px;
`;

const LegendVertical = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
	margin-top: 16px;
`;

const LegendItem = styled.div`
	display: flex;
	align-items: center;
	color: ${(props) => props.color};
	font-size: 14px;
	font-weight: bold;
	margin: 4px 0;
	gap: 6px;
`;

const InfoTable = styled(Table)`
	.ant-table-thead > tr > th {
		background-color: #fafafa;
	}
	.ant-table-tbody > tr > td {
		background-color: #fff;
	}
`;

const StayColumn = styled.div`
	display: flex;
	flex-direction: column;
`;

const StayIcons = styled.div`
	display: flex;
	gap: 8px;
`;

const IconWrapper = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
`;

const StatusButton = styled.div`
	background-color: #1e88e5;
	color: white;
	padding: 4px 16px;
	border-radius: 20px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	width: 200px; /* adjust as needed */
	text-transform: capitalize;
`;

const Amount = styled.span`
	background-color: white;
	color: #1e88e5;
	padding: 4px 8px;
	border-radius: 10px;
	font-weight: bold;
`;

const Actions = styled.div`
	display: flex;
	gap: 8px;
	justify-content: center;
`;

const ActionButton = styled.button`
	background: none;
	border: none;
	cursor: pointer;
	color: #1e88e5;
	font-size: 18px;
	&:hover {
		color: #0056b3;
	}
`;

const LoadMoreContainer = styled.div`
	display: flex;
	justify-content: center;
	margin-top: 12px;
`;

const LoadMoreButton = styled.button`
	background-color: #1e88e5;
	color: #fff;
	padding: 8px 16px;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	font-weight: bold;
	&:hover {
		background-color: #0056b3;
	}
`;
