import React from "react";
import styled from "styled-components";
import {
	ArrowUpOutlined,
	ArrowDownOutlined,
	MinusOutlined,
} from "@ant-design/icons";

const ScoreCards = ({ reservations, totalReservations }) => {
	// Calculate Reservations Stats
	const todayReservations = reservations.filter((r) =>
		isToday(new Date(r.createdAt))
	).length;
	const yesterdayReservations = reservations.filter((r) =>
		isYesterday(new Date(r.createdAt))
	).length;
	const weeklyReservations = reservations.filter((r) =>
		isThisWeek(new Date(r.createdAt))
	).length;
	const lastWeekReservations = reservations.filter((r) =>
		isLastWeek(new Date(r.createdAt))
	).length;

	const todayRatio =
		yesterdayReservations > 0
			? ((todayReservations - yesterdayReservations) / yesterdayReservations) *
			  100
			: todayReservations * 100;

	const weeklyRatio =
		lastWeekReservations > 0
			? ((weeklyReservations - lastWeekReservations) / lastWeekReservations) *
			  100
			: weeklyReservations * 100;

	// Calculate Top 3 Hotels
	const hotelCounts = reservations.reduce((acc, curr) => {
		const hotelName = curr.hotelId?.hotelName || "Unknown Hotel";
		acc[hotelName] = (acc[hotelName] || 0) + 1;
		return acc;
	}, {});

	const topHotels = Object.entries(hotelCounts)
		.map(([name, reservations]) => ({ name, reservations }))
		.sort((a, b) => b.reservations - a.reservations)
		.slice(0, 3); // Get top 3 hotels

	return (
		<ScoreCardsWrapper>
			{/* Reservations Today and Yesterday */}
			<Card>
				<CardTitle>Today's Reservations</CardTitle>
				<CardData>
					<span>{todayReservations}</span>
					<p>Yesterday: {yesterdayReservations}</p>
					<PercentageWrapper>
						{todayReservations > yesterdayReservations ? (
							<ArrowUpOutlined style={{ color: "green" }} />
						) : todayReservations < yesterdayReservations ? (
							<ArrowDownOutlined style={{ color: "red" }} />
						) : (
							<MinusOutlined style={{ color: "#b0b0b0" }} /> // Greish neutral icon
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
							{todayReservations === yesterdayReservations
								? "No Change"
								: `${Math.abs(todayRatio).toFixed(2)}%`}
						</span>
					</PercentageWrapper>
				</CardData>
			</Card>

			{/* Weekly Reservations */}
			<Card>
				<CardTitle>Weekly Reservations</CardTitle>
				<CardData>
					<span>{weeklyReservations}</span>
					<p>Last Week: {lastWeekReservations}</p>
					<PercentageWrapper>
						{weeklyReservations > lastWeekReservations ? (
							<ArrowUpOutlined style={{ color: "green" }} />
						) : weeklyReservations < lastWeekReservations ? (
							<ArrowDownOutlined style={{ color: "red" }} />
						) : (
							<MinusOutlined style={{ color: "#b0b0b0" }} /> // Greish neutral icon
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
							{weeklyReservations === lastWeekReservations
								? "No Change"
								: `${Math.abs(weeklyRatio).toFixed(2)}%`}
						</span>
					</PercentageWrapper>
				</CardData>
			</Card>

			{/* Top 3 Hotels */}
			<Card>
				<CardTitle>Top 3 Hotels</CardTitle>
				<CardData>
					{topHotels.map((hotel, index) => (
						<p
							key={index}
							style={{ textTransform: "capitalize", fontSize: "0.78rem" }}
						>
							{index + 1}. {hotel.name} - {hotel.reservations} reservations
						</p>
					))}
				</CardData>
			</Card>

			{/* Overall Reservations */}
			<Card>
				<CardTitle>Overall Reservations</CardTitle>
				<CardData>
					<span>{totalReservations}</span>
				</CardData>
			</Card>
		</ScoreCardsWrapper>
	);
};

// Utility functions for date calculations
const isToday = (date) => {
	const today = new Date();
	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
};

const isYesterday = (date) => {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	return (
		date.getDate() === yesterday.getDate() &&
		date.getMonth() === yesterday.getMonth() &&
		date.getFullYear() === yesterday.getFullYear()
	);
};

const isThisWeek = (date) => {
	const today = new Date();
	const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
	const endOfWeek = new Date(startOfWeek);
	endOfWeek.setDate(startOfWeek.getDate() + 6);
	return date >= startOfWeek && date <= endOfWeek;
};

const isLastWeek = (date) => {
	const today = new Date();
	const startOfThisWeek = new Date(
		today.setDate(today.getDate() - today.getDay())
	);
	const endOfLastWeek = new Date(startOfThisWeek);
	const startOfLastWeek = new Date(startOfThisWeek);
	startOfLastWeek.setDate(endOfLastWeek.getDate() - 7);
	return date >= startOfLastWeek && date < endOfLastWeek;
};

export default ScoreCards;

// Styled Components
const ScoreCardsWrapper = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 20px;
	justify-content: space-between;

	@media (max-width: 768px) {
		flex-direction: column;
	}
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
		max-width: 100%;
	}
`;

const CardTitle = styled.h3`
	margin-bottom: 10px;
	font-size: 18px;
	color: #f0f0f0;
`;

const CardData = styled.div`
	font-size: 24px;
	font-weight: bold;

	p {
		font-size: 14px;
		margin: 5px 0;
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
`;
