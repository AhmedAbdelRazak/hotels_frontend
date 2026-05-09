import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Alert, Button, DatePicker, Segmented, Spin } from "antd";
import dayjs from "dayjs";
import DonutChartCard from "./Charts/DonutChartCard";
import LineChartCard from "./Charts/LineChartCard";
import HorizontalBarChartCard from "./Charts/HorizontalBarChartCard";
import Dashboard from "./Charts/Dashboard";
import { gettingAdminDashboardFigures } from "../apiAdmin";

const { RangePicker } = DatePicker;

const copy = {
	English: {
		title: "Hotel Dashboard",
		subtitle: "Operating report",
		today: "Today",
		yesterday: "Yesterday",
		tomorrow: "Tomorrow",
		last7Days: "Last 7 Days",
		last3Months: "3 Months",
		datePlaceholderStart: "Start date",
		datePlaceholderEnd: "End date",
		refresh: "Refresh",
		reset: "Reset",
		loading: "Loading dashboard...",
		error: "Unable to load dashboard figures right now.",
		revenue: "Revenue",
		collected: "Collected",
		outstanding: "Outstanding",
		reportWindow: "Report Window",
	},
	Arabic: {
		title: "لوحة إدارة الفندق",
		subtitle: "تقرير التشغيل",
		today: "اليوم",
		yesterday: "أمس",
		tomorrow: "الغد",
		last7Days: "آخر 7 أيام",
		last3Months: "3 أشهر",
		datePlaceholderStart: "تاريخ البداية",
		datePlaceholderEnd: "تاريخ النهاية",
		refresh: "تحديث",
		reset: "إعادة ضبط",
		loading: "جاري تحميل لوحة الإدارة...",
		error: "تعذر تحميل أرقام لوحة الإدارة الآن.",
		revenue: "الإيرادات",
		collected: "المحصل",
		outstanding: "المتبقي",
		reportWindow: "فترة التقرير",
	},
};

const DEFAULT_PRESET = "last3Months";

const buildPresetRange = (preset) => {
	const today = dayjs().startOf("day");

	switch (preset) {
		case "today":
			return [today, today.endOf("day")];
		case "yesterday": {
			const yesterday = today.subtract(1, "day");
			return [yesterday, yesterday.endOf("day")];
		}
		case "tomorrow": {
			const tomorrow = today.add(1, "day");
			return [tomorrow, tomorrow.endOf("day")];
		}
		case "last7Days":
			return [today.subtract(6, "day"), today.endOf("day")];
		case "last3Months":
		default:
			return [today.subtract(3, "month"), today.endOf("day")];
	}
};

const emptyReport = {
	meta: {},
	firstRow: {
		arrivals: 0,
		departures: 0,
		inHouse: 0,
		booking: 0,
		overAllBookings: 0,
		tomorrowArrivals: 0,
	},
	secondRow: {
		cancellations: 0,
		noShow: 0,
		occupancy: { booked: 0, available: 0, overallRoomsCount: 0 },
		latestCheckouts: [],
		upcomingCheckins: [],
		bookingMix: { individuals: 0, online: 0, company: 0 },
		financialSummary: { revenue: 0, collected: 0, outstanding: 0 },
	},
	thirdRow: {
		roomsTable: [],
		housekeeping: { clean: 0, cleaning: 0, dirty: 0 },
	},
	fourthRow: {
		topChannels: [],
		roomNightsByType: [],
		roomRevenueByType: [],
	},
	fifthRow: {
		bookingLine: { categories: [], checkIn: [], checkOut: [] },
		visitorsLine: { categories: [], yesterday: [], today: [] },
	},
	donutChartCard: { availableRooms: 0, totalRooms: 0 },
	horizontalBarChartCard: { pending: 0, done: 0, finish: 0 },
};

const readSelectedHotel = () => {
	try {
		return JSON.parse(localStorage.getItem("selectedHotel")) || {};
	} catch (err) {
		console.warn("Failed to parse selectedHotel from localStorage", err);
		return {};
	}
};

const toNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const AdminDashboard = ({ chosenLanguage }) => {
	const [adminDashboardReport, setAdminDashboardReport] = useState(null);
	const [activePreset, setActivePreset] = useState(DEFAULT_PRESET);
	const [dateRange, setDateRange] = useState(() =>
		buildPresetRange(DEFAULT_PRESET)
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const selectedHotel = useMemo(() => readSelectedHotel(), []);
	const isArabic = chosenLanguage === "Arabic";
	const t = copy[chosenLanguage] || copy.English;

	const presetOptions = useMemo(
		() => [
			{ label: t.today, value: "today" },
			{ label: t.yesterday, value: "yesterday" },
			{ label: t.tomorrow, value: "tomorrow" },
			{ label: t.last7Days, value: "last7Days" },
			{ label: t.last3Months, value: "last3Months" },
		],
		[t]
	);

	const dateParams = useMemo(() => {
		if (!dateRange?.[0] || !dateRange?.[1]) return {};

		const startDate = dateRange[0].format("YYYY-MM-DD");
		const endDate = dateRange[1].format("YYYY-MM-DD");
		const days = Math.max(dateRange[1].diff(dateRange[0], "day") + 1, 1);

		return {
			startDate,
			endDate,
			trendDays: Math.min(days, 31),
			forecastDays: Math.min(Math.max(days, 10), 31),
			inventoryDays: Math.min(Math.max(days, 7), 21),
		};
	}, [dateRange]);

	const adminDashboardFigures = useCallback(() => {
		if (!selectedHotel?._id) {
			setAdminDashboardReport(emptyReport);
			return;
		}

		setLoading(true);
		setError("");

		gettingAdminDashboardFigures(selectedHotel._id, dateParams)
			.then((res) => {
				if (res?.data) {
					setAdminDashboardReport({ ...emptyReport, ...res.data });
					return;
				}

				setError(t.error);
				setAdminDashboardReport(emptyReport);
			})
			.catch((err) => {
				console.error(err);
				setError(t.error);
				setAdminDashboardReport(emptyReport);
			})
			.finally(() => setLoading(false));
	}, [dateParams, selectedHotel?._id, t.error]);

	useEffect(() => {
		adminDashboardFigures();
	}, [adminDashboardFigures]);

	const report = adminDashboardReport || emptyReport;
	const reportMeta = report?.meta || {};
	const financialSummary = report?.secondRow?.financialSummary || {};
	const displayHotelName =
		isArabic && selectedHotel?.hotelName_OtherLanguage
			? selectedHotel.hotelName_OtherLanguage
			: selectedHotel?.hotelName || t.title;
	const displayWindow =
		reportMeta?.startDate && reportMeta?.endDate
			? reportMeta.startDate === reportMeta.endDate
				? reportMeta.startDate
				: `${reportMeta.startDate} - ${reportMeta.endDate}`
			: t.today;

	const formatNumber = (value) =>
		new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
			toNumber(value)
		);

	const formatCurrency = (value) => {
		const formatted = formatNumber(value);
		return isArabic ? `${formatted} ر.س.` : `SAR ${formatted}`;
	};

	const applyPreset = (preset) => {
		setActivePreset(preset);
		setDateRange(buildPresetRange(preset));
	};

	const metricCards = [
		{
			key: "revenue",
			label: t.revenue,
			value: formatCurrency(financialSummary.revenue),
			color: "#E3F2FD",
		},
		{
			key: "collected",
			label: t.collected,
			value: formatCurrency(financialSummary.collected),
			color: "#E8F5E9",
		},
		{
			key: "outstanding",
			label: t.outstanding,
			value: formatCurrency(financialSummary.outstanding),
			color: "#FFF3E0",
		},
		{
			key: "window",
			label: t.reportWindow,
			value: displayWindow,
			color: "#F3E5F5",
		},
	];

	return (
		<DashboardWrapper dir={isArabic ? "rtl" : "ltr"}>
			<TopPanel>
				<HeaderCard>
					<HeaderText>
						<Title>{displayHotelName}</Title>
						<Subtitle>{t.subtitle}</Subtitle>
					</HeaderText>

					<Controls>
						<QuickRanges
							value={activePreset}
							options={presetOptions}
							onChange={applyPreset}
							size='small'
						/>
						<RangePicker
							value={dateRange}
							onChange={(values) => {
								setActivePreset("");
								setDateRange(values?.[0] && values?.[1] ? values : null);
							}}
							format='YYYY-MM-DD'
							allowClear={false}
							disabledDate={(current) =>
								current && current.isAfter(dayjs().add(18, "month"), "day")
							}
							placeholder={[t.datePlaceholderStart, t.datePlaceholderEnd]}
						/>
						<Button onClick={adminDashboardFigures} loading={loading}>
							{t.refresh}
						</Button>
						<Button onClick={() => applyPreset(DEFAULT_PRESET)} disabled={loading}>
							{t.reset}
						</Button>
					</Controls>
				</HeaderCard>

				<SummaryStrip>
					{metricCards.map((card) => (
						<SummaryCard key={card.key} color={card.color}>
							<SummaryLabel>{card.label}</SummaryLabel>
							<SummaryValue
								$isWindow={card.key === "window"}
								dir={card.key === "window" ? "ltr" : "auto"}
								title={String(card.value)}
							>
								{card.value}
							</SummaryValue>
						</SummaryCard>
					))}
				</SummaryStrip>
			</TopPanel>

			{error && <Alert type='warning' message={error} showIcon />}

			<Spin spinning={loading && Boolean(adminDashboardReport)} tip={t.loading}>
				{!adminDashboardReport ? (
					<LoadingPanel>{t.loading}</LoadingPanel>
				) : (
					<>
						<Dashboard
							chosenLanguage={chosenLanguage}
							adminDashboardReport={report}
						/>

						<ChartsGrid>
							<ChartsWrapper>
								<DonutChartCard
									chosenLanguage={chosenLanguage}
									DonutChartCard={report.donutChartCard}
								/>
								<HorizontalBarChartCard
									chosenLanguage={chosenLanguage}
									DonutChartCard={report.horizontalBarChartCard}
								/>
							</ChartsWrapper>
							<LineChartWrapper>
								<LineChartCard
									chosenLanguage={chosenLanguage}
									bookingLine={report?.fifthRow?.bookingLine}
								/>
							</LineChartWrapper>
						</ChartsGrid>
					</>
				)}
			</Spin>
		</DashboardWrapper>
	);
};

export default AdminDashboard;

const DashboardWrapper = styled.div`
	box-sizing: border-box;
	background-color: #f7f8fc;
	min-width: 0;
	overflow: hidden;
	padding: clamp(12px, 2vw, 24px);
	width: 100%;

	* {
		box-sizing: border-box;
	}

	@media (max-width: 640px) {
		padding: 8px;
	}
`;

const TopPanel = styled.div`
	display: grid;
	gap: 10px;
	margin-bottom: 12px;
	min-width: 0;
`;

const HeaderCard = styled.div`
	align-items: center;
	background: #e3f2fd;
	border: 1px solid #cfe5fb;
	border-radius: 8px;
	display: flex;
	flex-wrap: wrap;
	gap: 14px;
	justify-content: space-between;
	min-width: 0;
	padding: 10px 12px;

	@media (max-width: 900px) {
		align-items: stretch;
		flex-direction: column;
	}

	@media (max-width: 640px) {
		gap: 8px;
		padding: 9px;
	}
`;

const HeaderText = styled.div`
	flex: 1 1 220px;
	min-width: 0;

	@media (max-width: 900px) {
		flex: 0 0 auto;
	}
`;

const Title = styled.h1`
	font-size: clamp(18px, 1.5vw, 24px);
	line-height: 1.25;
	margin: 0;
	color: #18212f;
	word-break: break-word;

	@media (max-width: 640px) {
		font-size: 17px;
	}
`;

const Subtitle = styled.p`
	color: #475467;
	font-size: 13px;
	font-weight: 700;
	margin: 4px 0 0;
`;

const Controls = styled.div`
	flex: 999 1 620px;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	justify-content: flex-end;
	min-width: 0;

	.ant-picker {
		flex: 1 1 250px;
		height: 34px;
		min-width: min(250px, 100%);
		max-width: 100%;
	}

	button {
		flex: 0 0 auto;
		height: 34px;
	}

	@media (max-width: 900px) {
		flex: 0 0 auto;
		justify-content: stretch;
		width: 100%;

		.ant-picker,
		button {
			width: 100%;
		}
	}

	@media (max-width: 640px) {
		display: grid;
		flex: none;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 7px;

		.ant-picker {
			flex: none;
			grid-column: 1 / -1;
			height: 32px;
			min-width: 0;
			width: 100%;
		}

		.ant-picker-input > input {
			font-size: 12px;
			text-align: center;
		}

		button {
			height: 32px;
			min-width: 0;
			width: 100%;
		}
	}
`;

const QuickRanges = styled(Segmented)`
	flex: 1 1 360px;
	max-width: 100%;
	min-width: min(360px, 100%);

	.ant-segmented-group {
		flex-wrap: wrap;
		row-gap: 4px;
	}

	.ant-segmented-item-label {
		min-height: 28px;
		padding: 0 9px;
		white-space: nowrap;
	}

	@media (max-width: 900px) {
		width: 100%;
		flex: none;
		min-width: 0;

		.ant-segmented-group {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.ant-segmented-item-label {
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	@media (max-width: 640px) {
		grid-column: 1 / -1;

		.ant-segmented-group {
			column-gap: 2px;
			display: grid;
			grid-template-columns: repeat(5, minmax(0, 1fr));
			row-gap: 0;
		}

		.ant-segmented-item {
			min-width: 0;
		}

		.ant-segmented-item-label {
			font-size: 11.5px;
			line-height: 32px;
			min-height: 32px;
			padding: 0 3px;
			text-align: center;
		}
	}

	@media (max-width: 390px) {
		.ant-segmented-item-label {
			font-size: 11px;
			padding: 0 2px;
		}
	}
`;

const SummaryStrip = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(170px, 1fr));
	gap: 10px;
	min-width: 0;

	@media (max-width: 980px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 560px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
		grid-auto-rows: 1fr;
	}
`;

const SummaryCard = styled.div`
	background: ${(props) => props.color || "#fff"};
	border: 1px solid rgba(16, 24, 40, 0.08);
	border-radius: 8px;
	min-width: 0;
	min-height: 78px;
	padding: 12px;

	@media (max-width: 560px) {
		min-height: 58px;
		padding: 8px;
	}
`;

const SummaryLabel = styled.div`
	color: #344054;
	font-size: 13px;
	font-weight: 800;
	margin-bottom: 6px;

	@media (max-width: 560px) {
		font-size: 11px;
		line-height: 1.25;
		margin-bottom: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const SummaryValue = styled.div`
	color: #000;
	font-size: ${(props) =>
		props.$isWindow ? "clamp(14px, 1.25vw, 18px)" : "clamp(18px, 1.6vw, 22px)"};
	font-weight: 800;
	line-height: 1.2;
	overflow: hidden;
	text-overflow: ellipsis;
	unicode-bidi: plaintext;
	white-space: nowrap;

	@media (max-width: 560px) {
		font-size: ${(props) =>
			props.$isWindow ? "clamp(11px, 3.2vw, 13px)" : "clamp(14px, 4vw, 17px)"};
	}
`;

const LoadingPanel = styled.div`
	align-items: center;
	background: #fff;
	border-radius: 8px;
	color: #667085;
	display: flex;
	justify-content: center;
	min-height: 220px;
`;

const ChartsGrid = styled.div`
	align-items: stretch;
	display: grid;
	gap: 18px;
	grid-template-columns: minmax(280px, 2fr) minmax(0, 5fr);
	margin-top: 18px;
	min-width: 0;

	@media (max-width: 1180px) {
		grid-template-columns: 1fr;
	}
`;

const ChartsWrapper = styled.div`
	display: grid;
	gap: 18px;
	grid-template-columns: 1fr;
	min-width: 0;

	@media (max-width: 1180px) and (min-width: 680px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
`;

const LineChartWrapper = styled.div`
	min-width: 0;
`;
