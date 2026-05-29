import React from "react";
import styled from "styled-components";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CreditCardOutlined,
	FieldTimeOutlined,
	MinusOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import CountUp from "react-countup";

const Trend = ({ current = 0, previous = 0, ratio = 0, label = "Previous" }) => {
	const direction =
		current > previous ? "up" : current < previous ? "down" : "flat";
	const Icon =
		direction === "up"
			? ArrowUpOutlined
			: direction === "down"
			  ? ArrowDownOutlined
			  : MinusOutlined;

	return (
		<TrendLine $direction={direction}>
			<Icon />
			<span>
				{label}: <CountUp end={previous} duration={0.9} separator=',' />
			</span>
			<small>
				{current === previous ? (
					"No change"
				) : (
					<CountUp
						end={Math.abs(ratio)}
						decimals={1}
						duration={0.9}
						suffix='%'
					/>
				)}
			</small>
		</TrendLine>
	);
};

const ScoreCards = ({
	scorecardsObject = {},
	activeFilter = "",
	onFilterSelect = () => {},
}) => {
	const {
		todayReservations = 0,
		yesterdayReservations = 0,
		todayRatio = 0,
		weeklyReservations = 0,
		lastWeekReservations = 0,
		weeklyRatio = 0,
		totalReservations = 0,
		pendingConfirmationReservations = 0,
		notCapturedReservations = 0,
		capturedReservations = 0,
	} = scorecardsObject;

	const cards = [
		{
			key: "all",
			filter: "",
			title: "Overall Reservations",
			value: totalReservations,
			tone: "overall",
			icon: CheckCircleOutlined,
			meta: "All matching reservations",
		},
		{
			key: "createdToday",
			filter: "createdToday",
			title: "Today's Reservations",
			value: todayReservations,
			tone: "today",
			icon: FieldTimeOutlined,
			trend: (
				<Trend
					current={todayReservations}
					previous={yesterdayReservations}
					ratio={todayRatio}
					label='Yesterday'
				/>
			),
		},
		{
			key: "createdThisWeek",
			filter: "createdThisWeek",
			title: "Weekly Reservations",
			value: weeklyReservations,
			tone: "week",
			icon: ClockCircleOutlined,
			trend: (
				<Trend
					current={weeklyReservations}
					previous={lastWeekReservations}
					ratio={weeklyRatio}
					label='Last week'
				/>
			),
		},
		{
			key: "pendingConfirmation",
			filter: "pendingConfirmation",
			title: "Pending Confirmation",
			value: pendingConfirmationReservations,
			tone: "pending",
			icon: WarningOutlined,
			meta: "Needs confirmation review",
		},
		{
			key: "notCaptured",
			filter: "notCaptured",
			title: "Not Captured",
			value: notCapturedReservations,
			tone: "attention",
			icon: CreditCardOutlined,
			meta: "Payment capture pending",
		},
		{
			key: "captured",
			filter: "captured",
			title: "Captured",
			value: capturedReservations,
			tone: "success",
			icon: CheckCircleOutlined,
			meta: "Captured or paid online",
		},
	];

	const handleCardClick = (filter) => {
		onFilterSelect(filter);
	};

	return (
		<ScoreBand aria-label='Reservation scorecards'>
			{cards.map((card) => {
				const Icon = card.icon;
				const isActive = Boolean(card.filter) && activeFilter === card.filter;
				return (
					<ScoreCard
						key={card.key}
						type='button'
						$tone={card.tone}
						$isActive={isActive}
						onClick={() => handleCardClick(card.filter)}
						aria-pressed={isActive}
						title={
							isActive
								? "Click again to clear this filter"
								: "Click to filter the reservations table"
						}
					>
						<CardTop>
							<IconWrap $tone={card.tone}>
								<Icon />
							</IconWrap>
							<CardTitle>{card.title}</CardTitle>
						</CardTop>
						<CardValue>
							<CountUp end={card.value} duration={1} separator=',' />
						</CardValue>
						{card.trend || <CardMeta>{card.meta}</CardMeta>}
						{isActive ? <ActiveHint>Active filter</ActiveHint> : null}
					</ScoreCard>
				);
			})}
		</ScoreBand>
	);
};

export default ScoreCards;

const tone = {
	overall: {
		accent: "#2d5d91",
		bg: "linear-gradient(135deg, #f7fbff 0%, #e8f3ff 100%)",
		text: "#102033",
	},
	today: {
		accent: "#0891b2",
		bg: "linear-gradient(135deg, #ecfeff 0%, #dcf3ff 100%)",
		text: "#083344",
	},
	week: {
		accent: "#7c3aed",
		bg: "linear-gradient(135deg, #fffaff 0%, #efe3ff 100%)",
		text: "#3b1248",
	},
	pending: {
		accent: "#d97706",
		bg: "linear-gradient(135deg, #fff8e7 0%, #ffe7b5 100%)",
		text: "#4c3000",
	},
	attention: {
		accent: "#b91c1c",
		bg: "linear-gradient(135deg, #fff5f5 0%, #ffe1e6 100%)",
		text: "#5f1212",
	},
	success: {
		accent: "#0f8b5f",
		bg: "linear-gradient(135deg, #ecfdf5 0%, #d8f7e4 100%)",
		text: "#064e3b",
	},
};

const ScoreBand = styled.div`
	display: grid;
	grid-template-columns: repeat(6, minmax(0, 1fr));
	gap: 12px;
	margin: 8px 0 18px;
	padding: 12px;
	border: 1px solid #d7e9fb;
	border-radius: 10px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.96)),
		linear-gradient(135deg, rgba(45, 93, 145, 0.1), rgba(141, 76, 157, 0.09));
	box-shadow: 0 10px 28px rgba(16, 32, 51, 0.08);
	overflow-x: auto;
	-webkit-overflow-scrolling: touch;

	@media (max-width: 1180px) {
		grid-template-columns: repeat(6, minmax(168px, 1fr));
	}
`;

const ScoreCard = styled.button`
	position: relative;
	min-height: 124px;
	width: 100%;
	border: 1px solid
		${(props) =>
			props.$isActive ? tone[props.$tone].accent : "rgba(191, 219, 254, 0.95)"};
	border-radius: 8px;
	background: ${(props) =>
		props.$isActive
			? `linear-gradient(135deg, ${tone[props.$tone].accent} 0%, #102033 100%)`
			: tone[props.$tone].bg};
	box-shadow: ${(props) =>
		props.$isActive
			? `0 14px 32px ${tone[props.$tone].accent}44`
			: "0 8px 18px rgba(16, 32, 51, 0.08)"};
	color: ${(props) => (props.$isActive ? "#ffffff" : tone[props.$tone].text)};
	cursor: pointer;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	text-align: start;
	padding: 12px;
	overflow: hidden;
	transition:
		transform 0.18s ease,
		box-shadow 0.18s ease,
		border-color 0.18s ease;
	animation: ${(props) =>
		props.$isActive ? "scorecard-heartbeat 1.35s ease-in-out infinite" : "none"};

	&::after {
		content: "";
		position: absolute;
		inset-inline-end: -28px;
		inset-block-start: -28px;
		width: 82px;
		height: 82px;
		border-radius: 999px;
		background: ${(props) =>
			props.$isActive ? "rgba(255, 255, 255, 0.18)" : `${tone[props.$tone].accent}18`};
	}

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 14px 28px rgba(16, 32, 51, 0.14);
	}

	@keyframes scorecard-heartbeat {
		0%,
		100% {
			transform: scale(1);
		}
		45% {
			transform: scale(1.018);
		}
		60% {
			transform: scale(1.006);
		}
	}
`;

const CardTop = styled.div`
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
`;

const IconWrap = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	flex: 0 0 30px;
	border-radius: 8px;
	background: ${(props) => tone[props.$tone].accent};
	color: #fff;
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.24);
`;

const CardTitle = styled.span`
	min-width: 0;
	color: inherit;
	font-size: 0.82rem;
	font-weight: 950;
	line-height: 1.2;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const CardValue = styled.strong`
	position: relative;
	z-index: 1;
	margin-top: 12px;
	color: inherit;
	font-size: clamp(1.45rem, 2vw, 2rem);
	font-weight: 950;
	line-height: 1;
	letter-spacing: 0;
`;

const CardMeta = styled.span`
	position: relative;
	z-index: 1;
	margin-top: auto;
	color: inherit;
	font-size: 0.72rem;
	font-weight: 850;
	line-height: 1.25;
	opacity: 0.82;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const TrendLine = styled.div`
	position: relative;
	z-index: 1;
	display: grid;
	grid-template-columns: auto 1fr;
	column-gap: 6px;
	row-gap: 2px;
	align-items: center;
	margin-top: auto;
	color: inherit;
	font-size: 0.72rem;
	font-weight: 850;
	line-height: 1.2;
	opacity: 0.9;

	.anticon {
		color: ${(props) =>
			props.$direction === "up"
				? "#10b981"
				: props.$direction === "down"
				  ? "#ef4444"
				  : "#64748b"};
	}

	small {
		grid-column: 2;
		font-size: 0.68rem;
		font-weight: 900;
		opacity: 0.78;
	}
`;

const ActiveHint = styled.span`
	position: absolute;
	inset-inline-end: 8px;
	inset-block-end: 8px;
	z-index: 2;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.18);
	color: #ffffff;
	font-size: 0.64rem;
	font-weight: 950;
	line-height: 1;
	padding: 5px 7px;
`;
