import React from "react";
import styled from "styled-components";
import {
	ArrowUpOutlined,
	ArrowDownOutlined,
	MinusOutlined,
} from "@ant-design/icons";
import CountUp from "react-countup";

const ScoreCards = ({ fromPage, scorecardsObject = {} }) => {
	// Destructure the stats from the back-end object (with safe defaults).
	const {
		// Row 1
		todayReservations = 0,
		yesterdayReservations = 0,
		todayRatio = 0, // difference in reservations vs. yesterday in %
		weeklyReservations = 0,
		lastWeekReservations = 0,
		weeklyRatio = 0, // difference in reservations vs. last week in %
		topHotels = [], // top 3 hotels by reservations
		totalReservations = 0,

		// Row 2
		todayCommission = 0,
		yesterdayCommission = 0,
		todayCommissionRatio = 0, // difference in commission vs. yesterday in %
		weeklyCommission = 0,
		lastWeekCommission = 0,
		weeklyCommissionRatio = 0, // difference in commission vs. last week in %
		topHotelsByCommission = [], // top 3 hotels by commission
		overallCommission = 0,
	} = scorecardsObject;

	return (
		<>
			{/* ====== ROW 1: RESERVATION STATS ====== */}
			<ScoreCardsWrapper>
				{/* 1) Today's vs Yesterday's Reservations */}
				<Card>
					<CardTitle>Today's Reservations</CardTitle>
					<CardData>
						<span>
							<CountUp
								end={todayReservations}
								duration={2}
								separator=','
								delay={2}
							/>
						</span>
						<p>
							Yesterday:{" "}
							<CountUp
								end={yesterdayReservations}
								duration={2.1}
								separator=','
								delay={2}
							/>
						</p>
						<PercentageWrapper>
							{todayReservations > yesterdayReservations ? (
								<ArrowUpOutlined style={{ color: "green" }} />
							) : todayReservations < yesterdayReservations ? (
								<ArrowDownOutlined style={{ color: "red" }} />
							) : (
								<MinusOutlined style={{ color: "#b0b0b0" }} />
							)}
							<span
								style={{
									color:
										todayReservations > yesterdayReservations
											? "green"
											: todayReservations < yesterdayReservations
											  ? "red"
											  : "#b0b0b0",
								}}
							>
								{todayReservations === yesterdayReservations ? (
									"No Change"
								) : (
									<CountUp
										end={Math.abs(todayRatio)}
										decimals={2}
										duration={2.2}
										suffix='%'
										delay={2}
									/>
								)}
							</span>
						</PercentageWrapper>
					</CardData>
				</Card>

				{/* 2) Weekly vs Last Week Reservations */}
				<Card>
					<CardTitle>Weekly Reservations</CardTitle>
					<CardData>
						<span>
							<CountUp
								end={weeklyReservations}
								duration={1.2}
								separator=','
								delay={2}
							/>
						</span>
						<p>
							Last Week:{" "}
							<CountUp
								end={lastWeekReservations}
								duration={2.3}
								separator=','
								delay={2}
							/>
						</p>
						<PercentageWrapper>
							{weeklyReservations > lastWeekReservations ? (
								<ArrowUpOutlined style={{ color: "green" }} />
							) : weeklyReservations < lastWeekReservations ? (
								<ArrowDownOutlined style={{ color: "red" }} />
							) : (
								<MinusOutlined style={{ color: "#b0b0b0" }} />
							)}
							<span
								style={{
									color:
										weeklyReservations > lastWeekReservations
											? "green"
											: weeklyReservations < lastWeekReservations
											  ? "red"
											  : "#b0b0b0",
								}}
							>
								{weeklyReservations === lastWeekReservations ? (
									"No Change"
								) : (
									<CountUp
										end={Math.abs(weeklyRatio)}
										decimals={2}
										duration={2.4}
										delay={2}
										suffix='%'
									/>
								)}
							</span>
						</PercentageWrapper>
					</CardData>
				</Card>

				{/* 3) Top 3 Hotels by Reservation Count */}
				<Card>
					<CardTitle>Top 3 Hotels</CardTitle>
					<CardData>
						{topHotels.map((hotel, index) => (
							<p
								key={index}
								style={{
									textTransform: "capitalize",
									fontSize: "0.78rem",
									margin: "4px 0",
								}}
							>
								{index + 1}. {hotel.name} -{" "}
								<CountUp
									end={hotel.reservations}
									duration={2.5}
									separator=','
									delay={2}
								/>{" "}
								reservations
							</p>
						))}
					</CardData>
				</Card>

				{/* 4) Overall Reservations */}
				<Card>
					<CardTitle>Overall Reservations</CardTitle>
					<CardData>
						<span>
							<CountUp
								end={totalReservations}
								duration={2.6}
								separator=','
								delay={2}
							/>
						</span>
					</CardData>
				</Card>
			</ScoreCardsWrapper>

			{/* ====== ROW 2: COMMISSION STATS (Dark Cards, margin-top) ====== */}
			{/* Only show row 2 if fromPage === "reports" (same logic as your original) */}
			<CommissionCardsWrapper center={fromPage !== "reports"}>
				{fromPage === "reports" && (
					<>
						{/* 1) Commission Today vs Yesterday */}
						<CommissionCard>
							<CardTitle>Today's Commission (SAR)</CardTitle>
							<CardData>
								<span>
									<CountUp
										end={todayCommission}
										duration={2.3}
										decimals={2}
										separator=','
										delay={2}
									/>
								</span>
								<p>
									Yesterday:{" "}
									<CountUp
										end={yesterdayCommission}
										duration={2.4}
										decimals={2}
										separator=','
										delay={2}
									/>
								</p>
								<PercentageWrapper>
									{todayCommission > yesterdayCommission ? (
										<ArrowUpOutlined style={{ color: "green" }} />
									) : todayCommission < yesterdayCommission ? (
										<ArrowDownOutlined style={{ color: "red" }} />
									) : (
										<MinusOutlined style={{ color: "#b0b0b0" }} />
									)}
									<span
										style={{
											color:
												todayCommission > yesterdayCommission
													? "green"
													: todayCommission < yesterdayCommission
													  ? "red"
													  : "#b0b0b0",
										}}
									>
										{todayCommission === yesterdayCommission ? (
											"No Change"
										) : (
											<CountUp
												end={Math.abs(todayCommissionRatio)}
												decimals={2}
												duration={2.5}
												suffix='%'
												delay={2}
											/>
										)}
									</span>
								</PercentageWrapper>
							</CardData>
						</CommissionCard>

						{/* 2) Weekly Commission vs Last Week */}
						<CommissionCard>
							<CardTitle>Weekly Commission (SAR)</CardTitle>
							<CardData>
								<span>
									<CountUp
										end={weeklyCommission}
										duration={2.6}
										decimals={2}
										separator=','
										delay={2}
									/>
								</span>
								<p>
									Last Week:{" "}
									<CountUp
										end={lastWeekCommission}
										duration={2.7}
										decimals={2}
										separator=','
										delay={2}
									/>
								</p>
								<PercentageWrapper>
									{weeklyCommission > lastWeekCommission ? (
										<ArrowUpOutlined style={{ color: "green" }} />
									) : weeklyCommission < lastWeekCommission ? (
										<ArrowDownOutlined style={{ color: "red" }} />
									) : (
										<MinusOutlined style={{ color: "#b0b0b0" }} />
									)}
									<span
										style={{
											color:
												weeklyCommission > lastWeekCommission
													? "green"
													: weeklyCommission < lastWeekCommission
													  ? "red"
													  : "#b0b0b0",
										}}
									>
										{weeklyCommission === lastWeekCommission ? (
											"No Change"
										) : (
											<CountUp
												end={Math.abs(weeklyCommissionRatio)}
												decimals={2}
												duration={2.8}
												suffix='%'
												delay={2}
											/>
										)}
									</span>
								</PercentageWrapper>
							</CardData>
						</CommissionCard>

						{/* 3) Top 3 Hotels by Commission */}
						<CommissionCard className='mx-auto'>
							<CardTitle>Top 3 Hotels (Commission)</CardTitle>
							<CardData>
								{topHotelsByCommission.map((hotel, index) => (
									<p
										key={index}
										style={{
											textTransform: "capitalize",
											fontSize: "0.78rem",
											margin: "4px 0",
										}}
									>
										{index + 1}. {hotel.name} -{" "}
										<CountUp
											end={hotel.commission}
											duration={2.9}
											decimals={2}
											separator=','
											delay={2}
										/>{" "}
										SAR
									</p>
								))}
							</CardData>
						</CommissionCard>

						{/* 4) Overall Commission */}
						<CommissionCard className='mx-auto'>
							<CardTitle>Overall Commission (SAR)</CardTitle>
							<CardData>
								<span>
									<CountUp
										end={overallCommission}
										duration={3}
										decimals={2}
										separator=','
										delay={2.3}
									/>
								</span>
							</CardData>
						</CommissionCard>
					</>
				)}
			</CommissionCardsWrapper>
		</>
	);
};

export default ScoreCards;

/* -------------------- STYLES (unchanged) -------------------- */
const ScoreCardsWrapper = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 20px;
	justify-content: space-between;

	/* On mobile, stack them vertically */
	@media (max-width: 768px) {
		flex-direction: column;
		gap: 12px;
	}
`;

const CommissionCardsWrapper = styled(ScoreCardsWrapper)`
	margin-top: 30px; /* spacing for second row */
	justify-content: ${({ center }) => (center ? "center" : "space-between")};
`;

const Card = styled.div`
	background-color: #2b2b2b;
	color: white;
	padding: 20px;
	border-radius: 10px;
	flex: 1;
	min-width: 200px;
	max-width: 300px;
	text-align: center;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);

	@media (max-width: 768px) {
		max-width: 330px;
		padding: 14px;
	}
`;

const CommissionCard = styled(Card)`
	background-color: #1c1c1c; /* darker for commission row */
`;

const CardTitle = styled.h3`
	margin-bottom: 10px;
	font-size: 18px;
	color: #f0f0f0;

	@media (max-width: 768px) {
		font-size: 16px;
	}
`;

const CardData = styled.div`
	font-size: 24px;
	font-weight: bold;

	p {
		font-size: 14px;
		margin: 5px 0;
	}

	@media (max-width: 768px) {
		font-size: 20px;
		p {
			font-size: 13px;
		}
	}
`;

const PercentageWrapper = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 10px;

	span {
		margin-left: 5px;
		font-size: 14px;
		font-weight: bold;
	}

	@media (max-width: 768px) {
		margin-top: 6px;
		span {
			font-size: 12px;
		}
	}
`;
