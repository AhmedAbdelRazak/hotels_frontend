import React, { useState } from "react";
import { Modal, Table } from "antd";
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
		bookingMix = { individuals: 0, online: 0, company: 0 },
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
	const previewRowsToShow = 3;
	const [showAllModalOpen, setShowAllModalOpen] = useState(false);
	const hasMoreRows = upcomingCheckins.length > previewRowsToShow;
	const isArabic = chosenLanguage === "Arabic";
	const modalTitle = isArabic
		? "جميع تسجيلات الوصول القادمة"
		: "All Upcoming Check-ins";

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
			width: 190,
			render: (text, record) => (
				<GuestCell>
					<GuestName>{text}</GuestName>
					<MutedText>{record.guestId}</MutedText>
				</GuestCell>
			),
		},
		{
			// Accommodation => e.g. "Double Room - 5 nights"
			title: chosenLanguage === "Arabic" ? "الإقامة" : "Accommodation",
			dataIndex: "accommodation",
			key: "accommodation",
			width: 310,
			render: (text) => <AccommodationCell>{text}</AccommodationCell>,
		},
		{
			// Stay => dateRange
			title: chosenLanguage === "Arabic" ? "الفترة" : "Stay",
			dataIndex: "stay",
			key: "stay",
			width: 230,
			render: (stay, record) => (
				<StayColumn>
					<StayRange>{stay}</StayRange>
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
			width: 160,
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
			width: 116,
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
	const buildTableData = (items) =>
		items.map((item) => ({
			key: item._id || item.confirmation_number || `${item.name}-${item.dateRange}`,
			guest: item.name || "N/A",
			guestId: item.confirmation_number || "",
			accommodation: `${getRoomTypeLabel(item.room_type)} - ${item.nights} ${
				isArabic ? "ليالي" : "nights"
			}`,
			stay: item.dateRange || "",
			status: item.reservation_status || "",
			number_of_guests: item.number_of_guests || 2,
			flag: item.flag || 1,
			amount: "",
		}));

	const previewTableData = buildTableData(
		upcomingCheckins.slice(0, previewRowsToShow)
	);
	const allTableData = buildTableData(upcomingCheckins);

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
						<SmallCardNumber>{bookingMix.individuals || 0}</SmallCardNumber>
					</SmallCardRow>
					<SmallCardRow>
						<SmallCardTitle>{t.online}</SmallCardTitle>
						<SmallCardNumber>{bookingMix.online || 0}</SmallCardNumber>
					</SmallCardRow>
					<SmallCardRow>
						<SmallCardTitle>{t.company}</SmallCardTitle>
						<SmallCardNumber>{bookingMix.company || 0}</SmallCardNumber>
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
					rowKey='key'
					dataSource={previewTableData}
					columns={columns}
					pagination={false}
					scroll={{ x: 1006 }}
					size='small'
				/>
				{hasMoreRows && (
					<LoadMoreContainer>
						<LoadMoreButton onClick={() => setShowAllModalOpen(true)}>
							{isArabic ? "عرض المزيد" : "Load More"}
						</LoadMoreButton>
					</LoadMoreContainer>
				)}
			</RightSection>
			<Modal
				open={showAllModalOpen}
				onCancel={() => setShowAllModalOpen(false)}
				footer={null}
				centered
				width='min(1100px, 96vw)'
				title={<ModalTitle dir={isArabic ? "rtl" : "ltr"}>{modalTitle}</ModalTitle>}
				styles={{ body: { padding: 0 } }}
			>
				<ModalTableShell dir={isArabic ? "rtl" : "ltr"}>
					<InfoTable
						rowKey='key'
						dataSource={allTableData}
						columns={columns}
						pagination={{
							pageSize: 8,
							showSizeChanger: false,
							size: "small",
							hideOnSinglePage: allTableData.length <= 8,
						}}
						scroll={{ x: 1006, y: "60vh" }}
						size='small'
					/>
				</ModalTableShell>
			</Modal>
		</SecondRowWrapper>
	);
};

export default SecondRow;

// -------------------- STYLED COMPONENTS --------------------
const ModalTitle = styled.span`
	display: block;
	font-weight: 800;
	line-height: 1.3;
`;

const ModalTableShell = styled.div`
	direction: ${(props) => props.dir || "ltr"};
	max-height: calc(82vh - 88px);
	overflow: hidden;

	.ant-table-wrapper {
		width: 100%;
	}

	.ant-table-pagination {
		margin: 12px 0 8px !important;
		padding: 0 12px;
		flex-wrap: wrap;
		row-gap: 8px;
	}

	@media (max-width: 600px) {
		max-height: calc(86vh - 84px);

		.ant-table-pagination {
			justify-content: center;
		}
	}
`;

const SecondRowWrapper = styled.div`
	display: grid;
	grid-template-columns: minmax(180px, 0.8fr) minmax(220px, 0.9fr) minmax(
			0,
			3fr
		);
	gap: 14px;
	min-width: 0;

	@media (max-width: 1180px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const LeftSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;

	@media (max-width: 760px) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}
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
	min-width: 0;
	overflow: hidden;

	@media (max-width: 1180px) {
		grid-column: 1 / -1;
	}
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

	@media (max-width: 760px) {
		grid-column: 1 / -1;
		padding: 10px;
	}
`;

const CardTitle2 = styled.div`
	font-size: clamp(14px, 1.1vw, 18px);
	font-weight: bold;
	color: black;
	text-align: inherit;
	overflow-wrap: anywhere;

	@media (max-width: 760px) {
		font-size: 11px;
		line-height: 1.25;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const CardNumber = styled.div`
	font-size: clamp(18px, 1.5vw, 25px);
	font-weight: bold;
	color: black;
	margin: auto 10px !important;

	@media (max-width: 760px) {
		font-size: 15px;
		margin: 0 !important;
	}
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
	min-width: 0;
	width: 100%;
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
	width: 100%;
	min-width: 0;

	.ant-table-container {
		max-width: 100%;
	}

	.ant-table {
		border-radius: 0;
	}

	.ant-table-thead > tr > th {
		background-color: #fafafa;
		white-space: nowrap;
		font-weight: 800;
		padding: 10px 12px !important;
	}

	.ant-table-tbody > tr > td {
		background-color: #fff;
		vertical-align: middle;
		white-space: normal;
		overflow-wrap: anywhere;
		padding: 12px !important;
		line-height: 1.45;
	}

	.ant-table-tbody > tr:hover > td {
		background-color: #f7fbff;
	}

	@media (max-width: 600px) {
		.ant-table {
			font-size: 12px;
		}

		.ant-table-thead > tr > th,
		.ant-table-tbody > tr > td {
			padding: 8px 6px !important;
		}
	}
`;

const GuestCell = styled.div`
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
`;

const GuestName = styled.div`
	font-weight: 800;
	color: #111827;
	overflow-wrap: anywhere;
`;

const MutedText = styled.div`
	color: #6b7280;
	font-size: 13px;
	overflow-wrap: anywhere;
`;

const AccommodationCell = styled.div`
	max-width: 100%;
	line-height: 1.45;
	overflow-wrap: anywhere;
`;

const StayColumn = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
`;

const StayRange = styled.div`
	white-space: nowrap;
`;

const StayIcons = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
`;

const IconWrapper = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	white-space: nowrap;
`;

const StatusButton = styled.div`
	background-color: #1e88e5;
	color: white;
	padding: 5px 14px;
	border-radius: 20px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-width: 120px;
	max-width: 100%;
	text-transform: capitalize;
	white-space: nowrap;
	font-size: 13px;
	font-weight: 700;
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
	gap: 6px;
	justify-content: center;
	align-items: center;
	min-width: max-content;
`;

const ActionButton = styled.button`
	background: none;
	border: none;
	cursor: pointer;
	color: #1e88e5;
	font-size: 18px;
	width: 30px;
	height: 30px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 8px;
	&:hover {
		color: #0056b3;
		background: #eef6ff;
	}
`;

const LoadMoreContainer = styled.div`
	display: flex;
	justify-content: center;
	padding: 12px;
	border-top: 1px solid #f0f0f0;
`;

const LoadMoreButton = styled.button`
	background-color: #1e88e5;
	color: #fff;
	padding: 9px 18px;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	font-weight: bold;
	min-width: 112px;
	&:hover {
		background-color: #0056b3;
	}

	@media (max-width: 520px) {
		width: 100%;
	}
`;
