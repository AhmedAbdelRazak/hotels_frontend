import React from "react";
import styled from "styled-components";
import {
	ArrowUpOutlined,
	ArrowDownOutlined,
	MinusOutlined,
} from "@ant-design/icons";
import CountUp from "react-countup";

/* ------------------ DATE HELPERS ------------------ */
function isToday(date) {
	const today = new Date();
	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
}

function isYesterday(date) {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	return (
		date.getDate() === yesterday.getDate() &&
		date.getMonth() === yesterday.getMonth() &&
		date.getFullYear() === yesterday.getFullYear()
	);
}

function isThisWeek(date) {
	const now = new Date();
	// Start of current week (Sunday)
	const startOfWeek = new Date(now);
	startOfWeek.setDate(now.getDate() - now.getDay());
	startOfWeek.setHours(0, 0, 0, 0);

	const endOfWeek = new Date(startOfWeek);
	endOfWeek.setDate(startOfWeek.getDate() + 6);
	endOfWeek.setHours(23, 59, 59, 999);

	return date >= startOfWeek && date <= endOfWeek;
}

function isLastWeek(date) {
	const now = new Date();
	// Start of this week (Sunday)
	const startOfThisWeek = new Date(now);
	startOfThisWeek.setDate(now.getDate() - now.getDay());
	startOfThisWeek.setHours(0, 0, 0, 0);

	// End of last week is 1 ms before startOfThisWeek
	const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1);

	// Start of last week is 7 days prior
	const startOfLastWeek = new Date(startOfThisWeek);
	startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
	startOfLastWeek.setHours(0, 0, 0, 0);

	return date >= startOfLastWeek && date <= endOfLastWeek;
}

/* ------------------ SAFE NUMBER ------------------ */
function safeNumber(val) {
	const parsed = Number(val);
	return isNaN(parsed) ? 0 : parsed;
}

/* -------------------------------------------------------------------
   COMMISSION CALC: EXACTLY LIKE IN ReceiptPDF + override for "sahet al hegaz"
   1) If reservation.hotelId.hotelName == 'sahet al hegaz' (case-insensitive),
      AND payment == 'not paid',
      AND total_amount > 1000,
      => Commission = 200 SAR (flat).
   2) Else => normal logic:
      For each room in pickedRoomsType => for each day in pricingByDay:
        - finalRate = day.commissionRate < 1 ? day.commissionRate : day.commissionRate / 100
        - dayCommission = (rootPrice * finalRate) + (totalPriceWithoutCommission - rootPrice)
        - multiply by room.count
-------------------------------------------------------------------- */
function computeReservationCommission(reservation) {
	if (!reservation || !reservation.pickedRoomsType) return 0;

	// Check for "sahet al hegaz" override:
	const hotelName = reservation.hotelId?.hotelName?.toLowerCase() || "";
	const payment = reservation.payment || "";
	const totalAmount = safeNumber(reservation.total_amount);

	if (
		hotelName === "sahet al hegaz" &&
		payment === "not paid" &&
		totalAmount > 1000
	) {
		// If all conditions match => Return flat 200 SAR
		return 200;
	}

	// Otherwise, do the normal logic
	let totalCommission = 0;
	reservation.pickedRoomsType.forEach((room) => {
		if (!room.pricingByDay || room.pricingByDay.length === 0) {
			return;
		}

		room.pricingByDay.forEach((day) => {
			const rootPrice = safeNumber(day.rootPrice);

			// handle 10 vs 0.1 for 10%
			let rawRate = safeNumber(day.commissionRate);
			const finalRate = rawRate < 1 ? rawRate : rawRate / 100;

			const totalPriceWithoutComm = safeNumber(day.totalPriceWithoutCommission);

			// dayCommission formula from your snippet:
			const dayCommission =
				rootPrice * finalRate + (totalPriceWithoutComm - rootPrice);

			totalCommission += dayCommission * safeNumber(room.count);
		});
	});

	return totalCommission;
}

const ScoreCards = ({ reservations, totalReservations }) => {
	// For convenience, let's ensure we have an array
	const allReservations = Array.isArray(reservations) ? reservations : [];

	// For row 1, we do NOT exclude cancelled (unless you want to).
	// For row 2 (commission), exclude cancelled
	const nonCancelled = allReservations.filter(
		(r) => r.reservation_status !== "cancelled"
	);

	/* ==================== RESERVATION STATS (Row 1) ==================== */
	const todayReservations = allReservations.filter((r) =>
		isToday(new Date(r.createdAt))
	).length;

	const yesterdayReservations = allReservations.filter((r) =>
		isYesterday(new Date(r.createdAt))
	).length;

	const todayRatio =
		yesterdayReservations > 0
			? ((todayReservations - yesterdayReservations) / yesterdayReservations) *
			  100
			: todayReservations * 100;

	const weeklyReservations = allReservations.filter((r) =>
		isThisWeek(new Date(r.createdAt))
	).length;

	const lastWeekReservations = allReservations.filter((r) =>
		isLastWeek(new Date(r.createdAt))
	).length;

	const weeklyRatio =
		lastWeekReservations > 0
			? ((weeklyReservations - lastWeekReservations) / lastWeekReservations) *
			  100
			: weeklyReservations * 100;

	// Top 3 Hotels by Reservation Count
	const hotelCounts = allReservations.reduce((acc, reservation) => {
		const name = reservation.hotelId?.hotelName || "Unknown Hotel";
		acc[name] = (acc[name] || 0) + 1;
		return acc;
	}, {});
	const topHotels = Object.entries(hotelCounts)
		.map(([name, count]) => ({ name, reservations: count }))
		.sort((a, b) => b.reservations - a.reservations)
		.slice(0, 3);

	/* ====================== COMMISSION STATS (Row 2) ====================== */
	// Today Commission
	const todayCommission = nonCancelled
		.filter((r) => isToday(new Date(r.createdAt)))
		.reduce((sum, r) => sum + computeReservationCommission(r), 0);

	// Yesterday Commission
	const yesterdayCommission = nonCancelled
		.filter((r) => isYesterday(new Date(r.createdAt)))
		.reduce((sum, r) => sum + computeReservationCommission(r), 0);

	const todayCommissionRatio =
		yesterdayCommission > 0
			? ((todayCommission - yesterdayCommission) / yesterdayCommission) * 100
			: todayCommission * 100;

	// Weekly Commission
	const weeklyCommission = nonCancelled
		.filter((r) => isThisWeek(new Date(r.createdAt)))
		.reduce((sum, r) => sum + computeReservationCommission(r), 0);

	const lastWeekCommission = nonCancelled
		.filter((r) => isLastWeek(new Date(r.createdAt)))
		.reduce((sum, r) => sum + computeReservationCommission(r), 0);

	const weeklyCommissionRatio =
		lastWeekCommission > 0
			? ((weeklyCommission - lastWeekCommission) / lastWeekCommission) * 100
			: weeklyCommission * 100;

	// Top 3 Hotels by Commission
	const hotelCommissions = nonCancelled.reduce((acc, reservation) => {
		const name = reservation.hotelId?.hotelName || "Unknown Hotel";
		const comm = computeReservationCommission(reservation);
		acc[name] = (acc[name] || 0) + comm;
		return acc;
	}, {});
	const topHotelsByCommission = Object.entries(hotelCommissions)
		.map(([name, commission]) => ({ name, commission }))
		.sort((a, b) => b.commission - a.commission)
		.slice(0, 3);

	// Overall Commission
	const overallCommission = nonCancelled.reduce(
		(acc, r) => acc + computeReservationCommission(r),
		0
	);

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
			<CommissionCardsWrapper>
				{/* 1) Commission Today vs. Yesterday (nonCancelled) */}
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

				{/* 2) Weekly Commission (nonCancelled) */}
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

				{/* 3) Top 3 Hotels by Commission (nonCancelled) */}
				<CommissionCard>
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

				{/* 4) Overall Commission (nonCancelled) */}
				<CommissionCard>
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
			</CommissionCardsWrapper>
		</>
	);
};

export default ScoreCards;

/* ------------------ STYLES ------------------ */
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
