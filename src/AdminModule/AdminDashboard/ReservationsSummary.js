import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import * as XLSX from "xlsx";
import CountUp from "react-countup";
import {
	CalendarOutlined,
	CheckCircleOutlined,
	DownloadOutlined,
	LoginOutlined,
	LogoutOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import { Alert, Button, Empty, Table, Tag, message } from "antd";
import { isAuthenticated } from "../../auth";
import { getAdminReservationExecutiveSummary } from "../apiAdmin";
import { ADMIN_DASHBOARD_DAYS } from "./adminDashboardQuery";
import {
	buildReservationSummaryExportRows,
	formatReservationSummaryDate,
} from "./reservationSummaryUtils";

const copy = {
	en: {
		eyebrow: "PLATFORM OPERATIONS",
		title: "Reservations Executive Summary",
		description:
			"A focused daily view of arrivals, departures, and reservations created across your permitted hotels.",
		today: "Today",
		yesterday: "Yesterday",
		tomorrow: "Tomorrow",
		checkins: "Check-ins",
		checkouts: "Check-outs",
		newReservations: "New reservations",
		checkinsMeta: "Expected arrivals",
		checkoutsMeta: "Expected departures",
		newReservationsMeta: "Created on this date",
		unique: "unique reservations",
		tableTitle: "Reservation activity",
		tableSubtitle: "Every reservation represented in the selected summary",
		exportExcel: "Export to Excel",
		exportSuccess: "Executive summary exported successfully.",
		nothingToExport: "There are no reservations to export for this date.",
		retry: "Retry",
		empty: "No reservation activity for this date.",
		activity: "Activity",
		confirmation: "Confirmation #",
		hotel: "Hotel",
		guest: "Guest",
		checkinDate: "Check-in",
		checkoutDate: "Check-out",
		createdAt: "Created",
		status: "Status",
		rooms: "Rooms",
		guests: "Guests",
		amount: "Amount",
		source: "Source",
		checkinActivity: "Check-in",
		checkoutActivity: "Check-out",
		newActivity: "New reservation",
		loadError: "The reservation summary could not be loaded.",
	},
	ar: {
		eyebrow: "\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629",
		title:
			"\u0627\u0644\u0645\u0644\u062e\u0635 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a \u0644\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		description:
			"\u0639\u0631\u0636 \u064a\u0648\u0645\u064a \u0645\u0631\u0643\u0632 \u0644\u0644\u0648\u0635\u0648\u0644 \u0648\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629 \u0648\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0639\u0628\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u0635\u0631\u062d \u0628\u0647\u0627.",
		today: "\u0627\u0644\u064a\u0648\u0645",
		yesterday: "\u0623\u0645\u0633",
		tomorrow: "\u063a\u062f\u0627\u064b",
		checkins: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0648\u0635\u0648\u0644",
		checkouts: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		newReservations:
			"\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629",
		checkinsMeta: "\u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0645\u062a\u0648\u0642\u0639",
		checkoutsMeta:
			"\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629 \u0627\u0644\u0645\u062a\u0648\u0642\u0639\u0629",
		newReservationsMeta:
			"\u062a\u0645 \u0625\u0646\u0634\u0627\u0624\u0647\u0627 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
		unique: "\u062d\u062c\u0648\u0632\u0627\u062a \u0641\u0631\u064a\u062f\u0629",
		tableTitle: "\u0646\u0634\u0627\u0637 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		tableSubtitle:
			"\u0643\u0644 \u062d\u062c\u0632 \u0645\u0645\u062b\u0644 \u0641\u064a \u0627\u0644\u0645\u0644\u062e\u0635 \u0627\u0644\u0645\u062d\u062f\u062f",
		exportExcel: "\u062a\u0635\u062f\u064a\u0631 Excel",
		exportSuccess:
			"\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0645\u0644\u062e\u0635 \u0628\u0646\u062c\u0627\u062d.",
		nothingToExport:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u062a\u0627\u0631\u064a\u062e.",
		retry: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",
		empty:
			"\u0644\u0627 \u064a\u0648\u062c\u062f \u0646\u0634\u0627\u0637 \u062d\u062c\u0648\u0632\u0627\u062a \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u062a\u0627\u0631\u064a\u062e.",
		activity: "\u0627\u0644\u0646\u0634\u0627\u0637",
		confirmation: "\u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
		hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
		guest: "\u0627\u0644\u0636\u064a\u0641",
		checkinDate: "\u0627\u0644\u0648\u0635\u0648\u0644",
		checkoutDate: "\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		createdAt: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
		status: "\u0627\u0644\u062d\u0627\u0644\u0629",
		rooms: "\u0627\u0644\u063a\u0631\u0641",
		guests: "\u0627\u0644\u0636\u064a\u0648\u0641",
		amount: "\u0627\u0644\u0645\u0628\u0644\u063a",
		source: "\u0627\u0644\u0645\u0635\u062f\u0631",
		checkinActivity: "\u0648\u0635\u0648\u0644",
		checkoutActivity: "\u0645\u063a\u0627\u062f\u0631\u0629",
		newActivity: "\u062d\u062c\u0632 \u062c\u062f\u064a\u062f",
		loadError:
			"\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0645\u0644\u062e\u0635 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a.",
	},
};

const activityTone = {
	checkin: "cyan",
	checkout: "purple",
	"new-reservation": "green",
};

const statusColor = (status = "") => {
	const normalized = String(status).toLowerCase();
	if (normalized.includes("confirm") || normalized === "inhouse") return "green";
	if (normalized.includes("pending")) return "gold";
	if (normalized.includes("cancel") || normalized.includes("reject")) return "red";
	if (normalized.includes("complete") || normalized.includes("checkout")) return "blue";
	return "default";
};

const ReservationsSummary = ({ day, onDayChange, chosenLanguage }) => {
	const isArabic = chosenLanguage === "Arabic";
	const L = isArabic ? copy.ar : copy.en;
	const locale = isArabic ? "ar-SA" : "en-US";
	const auth = isAuthenticated();
	const userId = auth?.user?._id || "";
	const token = auth?.token || "";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		const controller = new AbortController();
		let mounted = true;

		if (!userId || !token) {
			setLoading(false);
			setError(L.loadError);
			return () => controller.abort();
		}

		setLoading(true);
		setError("");
		getAdminReservationExecutiveSummary(userId, token, day, {
			signal: controller.signal,
		})
			.then((payload) => {
				if (mounted) setData(payload);
			})
			.catch((requestError) => {
				if (!mounted || requestError?.name === "AbortError") return;
				setError(requestError?.payload?.error || requestError?.message || L.loadError);
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
			controller.abort();
		};
	}, [L.loadError, day, reloadKey, token, userId]);

	const activityLabels = useMemo(
		() => ({
			checkin: L.checkinActivity,
			checkout: L.checkoutActivity,
			"new-reservation": L.newActivity,
		}),
		[L.checkinActivity, L.checkoutActivity, L.newActivity]
	);
	const reservations = Array.isArray(data?.reservations) ? data.reservations : [];
	const summary = data?.summary || {};
	const numberFormatter = useMemo(
		() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
		[locale]
	);
	const selectedDateLabel = data?.date
		? formatReservationSummaryDate(`${data.date}T12:00:00.000Z`, {
				locale,
				dateOnly: true,
		  })
		: day;

	const columns = useMemo(
		() => [
			{
				title: L.activity,
				dataIndex: "activityTypes",
				key: "activity",
				width: 180,
				fixed: "left",
				render: (types = []) => (
					<ActivityTags>
						{types.map((type) => (
							<Tag key={type} color={activityTone[type] || "blue"}>
								{activityLabels[type] || type}
							</Tag>
						))}
					</ActivityTags>
				),
			},
			{
				title: L.confirmation,
				dataIndex: "confirmationNumber",
				key: "confirmationNumber",
				width: 150,
				render: (value) => <Confirmation>{value || "N/A"}</Confirmation>,
			},
			{
				title: L.hotel,
				dataIndex: "hotel",
				key: "hotel",
				width: 190,
				render: (hotel = {}) => (
					<HotelName>{isArabic && hotel.nameArabic ? hotel.nameArabic : hotel.name}</HotelName>
				),
			},
			{
				title: L.guest,
				dataIndex: "guestName",
				key: "guestName",
				width: 190,
			},
			{
				title: L.checkinDate,
				dataIndex: "checkinDate",
				key: "checkinDate",
				width: 135,
				render: (value) => formatReservationSummaryDate(value, { locale, dateOnly: true }),
			},
			{
				title: L.checkoutDate,
				dataIndex: "checkoutDate",
				key: "checkoutDate",
				width: 135,
				render: (value) => formatReservationSummaryDate(value, { locale, dateOnly: true }),
			},
			{
				title: L.createdAt,
				dataIndex: "createdAt",
				key: "createdAt",
				width: 175,
				render: (value) => formatReservationSummaryDate(value, { locale }),
			},
			{
				title: L.status,
				dataIndex: "status",
				key: "status",
				width: 135,
				render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
			},
			{
				title: L.rooms,
				dataIndex: "rooms",
				key: "rooms",
				width: 85,
				align: "center",
			},
			{
				title: L.guests,
				dataIndex: "guests",
				key: "guests",
				width: 85,
				align: "center",
			},
			{
				title: L.amount,
				dataIndex: "totalAmount",
				key: "totalAmount",
				width: 145,
				align: "end",
				render: (value, row) => (
					<Amount>
						{numberFormatter.format(Number(value) || 0)} {row.currency || "SAR"}
					</Amount>
				),
			},
			{
				title: L.source,
				dataIndex: "bookingSource",
				key: "bookingSource",
				width: 160,
			},
		],
		[L, activityLabels, isArabic, locale, numberFormatter]
	);

	const exportToExcel = () => {
		if (!reservations.length) {
			message.info(L.nothingToExport);
			return;
		}
		const exportRows = buildReservationSummaryExportRows(reservations, {
			locale,
			activityLabels,
		});
		const worksheet = XLSX.utils.json_to_sheet(exportRows);
		worksheet["!cols"] = [
			{ wch: 28 },
			{ wch: 22 },
			{ wch: 28 },
			{ wch: 28 },
			{ wch: 16 },
			{ wch: 16 },
			{ wch: 22 },
			{ wch: 20 },
			{ wch: 10 },
			{ wch: 10 },
			{ wch: 16 },
			{ wch: 12 },
			{ wch: 24 },
		];
		if (worksheet["!ref"]) {
			worksheet["!autofilter"] = { ref: worksheet["!ref"] };
		}
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Reservations Summary");
		XLSX.writeFile(workbook, `reservation-executive-summary-${data?.date || day}.xlsx`);
		message.success(L.exportSuccess);
	};

	const scorecards = [
		{
			key: "checkins",
			title: L.checkins,
			meta: L.checkinsMeta,
			value: summary.checkins || 0,
			icon: LoginOutlined,
			tone: "cyan",
		},
		{
			key: "checkouts",
			title: L.checkouts,
			meta: L.checkoutsMeta,
			value: summary.checkouts || 0,
			icon: LogoutOutlined,
			tone: "purple",
		},
		{
			key: "new",
			title: L.newReservations,
			meta: L.newReservationsMeta,
			value: summary.newReservations || 0,
			icon: CheckCircleOutlined,
			tone: "green",
		},
	];

	return (
		<SummarySurface>
			<ExecutiveHeader>
				<HeaderCopy>
					<Eyebrow>{L.eyebrow}</Eyebrow>
					<h1>{L.title}</h1>
					<p>{L.description}</p>
				</HeaderCopy>
				<HeaderControls>
					<SelectedDate>
						<CalendarOutlined />
						<strong>{selectedDateLabel}</strong>
						<span>{data?.timezone || "Asia/Riyadh"}</span>
					</SelectedDate>
					<DayFilters aria-label='Reservation summary date filter'>
						{[
							[ADMIN_DASHBOARD_DAYS.YESTERDAY, L.yesterday],
							[ADMIN_DASHBOARD_DAYS.TODAY, L.today],
							[ADMIN_DASHBOARD_DAYS.TOMORROW, L.tomorrow],
						].map(([value, label]) => (
							<DayButton
								key={value}
								type='button'
								$active={day === value}
								aria-pressed={day === value}
								onClick={() => onDayChange(value)}
							>
								{label}
							</DayButton>
						))}
					</DayFilters>
				</HeaderControls>
			</ExecutiveHeader>

			<ScoreGrid aria-label='Executive reservation totals'>
				{scorecards.map((card) => {
					const Icon = card.icon;
					return (
						<ScoreCard key={card.key} $tone={card.tone}>
							<ScoreIcon $tone={card.tone}>
								<Icon />
							</ScoreIcon>
							<ScoreCopy>
								<span>{card.title}</span>
								<strong>
									<CountUp end={card.value} duration={0.75} separator=',' />
								</strong>
								<small>{card.meta}</small>
							</ScoreCopy>
						</ScoreCard>
					);
				})}
			</ScoreGrid>

			<TablePanel>
				<TableHeading>
					<div>
						<h2>{L.tableTitle}</h2>
						<p>{L.tableSubtitle}</p>
					</div>
					<TableActions>
						<UniqueCount>
							{summary.totalUniqueReservations || 0} {L.unique}
						</UniqueCount>
						<Button
							type='primary'
							icon={<DownloadOutlined />}
							onClick={exportToExcel}
							disabled={!reservations.length}
						>
							{L.exportExcel}
						</Button>
					</TableActions>
				</TableHeading>

				{error ? (
					<Alert
						type='error'
						showIcon
						message={error}
						action={
							<Button
								size='small'
								icon={<ReloadOutlined />}
								onClick={() => setReloadKey((value) => value + 1)}
							>
								{L.retry}
							</Button>
						}
					/>
				) : null}

				<Table
					rowKey={(row) => row.id}
					columns={columns}
					dataSource={reservations}
					loading={{ spinning: loading, tip: L.tableTitle }}
					scroll={{ x: 1765 }}
					sticky
					size='middle'
					pagination={{
						pageSize: 12,
						showSizeChanger: true,
						pageSizeOptions: [12, 24, 48],
						showTotal: (total) => `${total} ${L.unique}`,
					}}
					locale={{
						emptyText: <Empty description={L.empty} image={Empty.PRESENTED_IMAGE_SIMPLE} />,
					}}
				/>
			</TablePanel>
		</SummarySurface>
	);
};

export default ReservationsSummary;

const tones = {
	cyan: {
		accent: "#0787a6",
		background: "linear-gradient(135deg, #effcff 0%, #d9f5fb 100%)",
		shadow: "rgba(7, 135, 166, 0.2)",
	},
	purple: {
		accent: "#6d4bb0",
		background: "linear-gradient(135deg, #fbf8ff 0%, #ece4ff 100%)",
		shadow: "rgba(109, 75, 176, 0.2)",
	},
	green: {
		accent: "#16815c",
		background: "linear-gradient(135deg, #f1fff8 0%, #dcf7e9 100%)",
		shadow: "rgba(22, 129, 92, 0.2)",
	},
};

const SummarySurface = styled.section`
	min-width: 0;
	border: 1px solid #d8e7f5;
	border-radius: 16px;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.98)), #fff;
	box-shadow: 0 18px 44px rgba(8, 42, 75, 0.09);
	overflow: hidden;
`;

const ExecutiveHeader = styled.header`
	display: grid;
	grid-template-columns: minmax(0, 1.4fr) minmax(340px, 0.8fr);
	gap: 24px;
	align-items: center;
	padding: 26px 28px;
	background: radial-gradient(circle at 88% 0%, rgba(52, 181, 229, 0.27), transparent 36%),
		linear-gradient(135deg, #071827 0%, #0d335d 45%, #155d95 100%);
	color: #fff;

	@media (max-width: 1050px) {
		grid-template-columns: 1fr;
	}

	@media (max-width: 600px) {
		padding: 20px 16px;
		gap: 18px;
	}
`;

const HeaderCopy = styled.div`
	min-width: 0;

	h1 {
		margin: 5px 0 8px;
		color: #fff;
		font-size: clamp(1.45rem, 2.5vw, 2.25rem);
		font-weight: 950;
		line-height: 1.1;
		letter-spacing: -0.025em;
	}

	p {
		max-width: 780px;
		margin: 0;
		color: rgba(235, 247, 255, 0.82);
		font-size: 0.94rem;
		font-weight: 650;
		line-height: 1.55;
	}
`;

const Eyebrow = styled.span`
	color: #80daf7;
	font-size: 0.7rem;
	font-weight: 950;
	letter-spacing: 0.16em;
`;

const HeaderControls = styled.div`
	display: grid;
	gap: 12px;
	justify-items: stretch;
`;

const SelectedDate = styled.div`
	display: grid;
	grid-template-columns: auto 1fr;
	column-gap: 9px;
	row-gap: 2px;
	align-items: center;
	padding: 11px 14px;
	border: 1px solid rgba(201, 235, 255, 0.28);
	border-radius: 10px;
	background: rgba(5, 24, 43, 0.44);
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.08);

	svg {
		grid-row: 1 / 3;
		color: #80daf7;
		font-size: 1.2rem;
	}

	strong {
		font-size: 0.9rem;
		font-weight: 900;
	}

	span {
		color: rgba(224, 242, 254, 0.7);
		font-size: 0.7rem;
		font-weight: 700;
	}
`;

const DayFilters = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 7px;
	padding: 6px;
	border: 1px solid rgba(191, 219, 254, 0.28);
	border-radius: 11px;
	background: rgba(2, 18, 34, 0.48);
`;

const DayButton = styled.button`
	min-height: 38px;
	border: 1px solid ${(props) => (props.$active ? "#8ddcff" : "transparent")};
	border-radius: 8px;
	background: ${(props) =>
		props.$active ? "linear-gradient(135deg, #2490c8 0%, #0d4d79 100%)" : "transparent"};
	box-shadow: ${(props) => (props.$active ? "0 7px 18px rgba(0, 0, 0, 0.24)" : "none")};
	color: ${(props) => (props.$active ? "#fff" : "rgba(230, 245, 255, 0.76)")};
	cursor: pointer;
	font-size: 0.79rem;
	font-weight: 900;
	transition:
		background 0.2s ease,
		border-color 0.2s ease,
		color 0.2s ease,
		box-shadow 0.2s ease;

	&:hover {
		color: #fff;
		border-color: rgba(141, 220, 255, 0.72);
	}
`;

const ScoreGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 14px;
	padding: 18px;
	background: linear-gradient(180deg, #f7fbff 0%, #f2f7fc 100%);

	@media (max-width: 820px) {
		grid-template-columns: 1fr;
		padding: 14px;
	}
`;

const ScoreCard = styled.article`
	position: relative;
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 14px;
	align-items: center;
	min-height: 132px;
	padding: 18px;
	border: 1px solid ${(props) => tones[props.$tone].accent}35;
	border-radius: 13px;
	background: ${(props) => tones[props.$tone].background};
	box-shadow: 0 10px 24px ${(props) => tones[props.$tone].shadow};
	overflow: hidden;

	&::after {
		content: "";
		position: absolute;
		inset-inline-end: -32px;
		inset-block-start: -38px;
		width: 120px;
		height: 120px;
		border-radius: 999px;
		background: ${(props) => tones[props.$tone].accent}10;
	}
`;

const ScoreIcon = styled.span`
	position: relative;
	z-index: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 52px;
	border-radius: 14px;
	background: ${(props) => tones[props.$tone].accent};
	box-shadow:
		inset 0 1px rgba(255, 255, 255, 0.3),
		0 9px 20px ${(props) => tones[props.$tone].shadow};
	color: #fff;
	font-size: 1.4rem;
`;

const ScoreCopy = styled.div`
	position: relative;
	z-index: 1;
	display: grid;
	min-width: 0;

	span {
		color: #253b50;
		font-size: 0.82rem;
		font-weight: 950;
	}

	strong {
		margin: 5px 0;
		color: #102033;
		font-size: clamp(1.75rem, 3vw, 2.55rem);
		font-weight: 950;
		line-height: 1;
	}

	small {
		color: #5f7488;
		font-size: 0.72rem;
		font-weight: 750;
	}
`;

const TablePanel = styled.div`
	min-width: 0;
	padding: 0 18px 18px;
	background: #f7fbff;

	.ant-alert {
		margin-bottom: 12px;
	}

	.ant-table-wrapper {
		border: 1px solid #d6e4f0;
		border-radius: 11px;
		overflow: hidden;
		background: #fff;
	}

	.ant-table-thead > tr > th {
		border-bottom-color: #21567e !important;
		background: linear-gradient(180deg, #1b6fa5 0%, #09223a 100%) !important;
		color: #fff !important;
		font-size: 0.77rem;
		font-weight: 900;
	}

	.ant-table-tbody > tr:nth-child(even) > td {
		background: #f7fbff;
	}

	.ant-table-tbody > tr:hover > td {
		background: #eaf6ff !important;
	}

	@media (max-width: 600px) {
		padding: 0 10px 12px;
	}
`;

const TableHeading = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18px;
	padding: 18px 2px 12px;

	h2 {
		margin: 0;
		color: #102033;
		font-size: 1.15rem;
		font-weight: 950;
	}

	p {
		margin: 3px 0 0;
		color: #64778b;
		font-size: 0.77rem;
		font-weight: 650;
	}

	@media (max-width: 720px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const TableActions = styled.div`
	display: flex;
	align-items: center;
	gap: 10px;

	@media (max-width: 520px) {
		align-items: stretch;
		flex-direction: column;

		button {
			width: 100%;
		}
	}
`;

const UniqueCount = styled.span`
	padding: 7px 10px;
	border: 1px solid #c9dced;
	border-radius: 999px;
	background: #fff;
	color: #36536e;
	font-size: 0.72rem;
	font-weight: 850;
	white-space: nowrap;
`;

const ActivityTags = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 4px;

	.ant-tag {
		margin: 0;
		font-size: 0.68rem;
		font-weight: 850;
	}
`;

const Confirmation = styled.strong`
	color: #164f7a;
	font-weight: 950;
`;

const HotelName = styled.strong`
	color: #102033;
	font-weight: 900;
`;

const Amount = styled.strong`
	color: #0d684c;
	font-weight: 900;
	white-space: nowrap;
`;
