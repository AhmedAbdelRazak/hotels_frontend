import React from "react";
import CountUp from "react-countup";
import styled from "styled-components";

const ScoreCards = ({ scoreCardObject }) => {
	const { total, total_amount, commission } = scoreCardObject || {};
	const commissionUnavailableCount = Number(
		scoreCardObject?.commissionUnavailableCount || 0
	);

	return (
		<ScoreCardsWrapper>
			<Card bgColor='#2f556b'>
				<Title>Reservations</Title>
				<Count>
					<CountUp
						start={0}
						end={total}
						duration={1.5}
						separator=','
						decimals={0}
					/>
				</Count>
			</Card>
			<Card bgColor='#6b452f'>
				<Title>Total Amount</Title>
				<Count>
					<CountUp
						start={0}
						end={total_amount}
						duration={2}
						separator=','
						decimals={2}
						suffix=' SAR'
					/>
				</Count>
			</Card>
			<Card bgColor='#376b2f'>
				<Title>Commission / Verified OTA Expense</Title>
				<Count>
					<CountUp
						start={0}
						end={commission}
						duration={2.5}
						separator=','
						decimals={2}
						suffix=' SAR'
					/>
				</Count>
				{commissionUnavailableCount > 0 ? (
					<AvailabilityNote>
						Excluded for {commissionUnavailableCount} HotelRunner reservation
						{commissionUnavailableCount === 1 ? "" : "s"} pending verified OTA
						expense evidence
					</AvailabilityNote>
				) : null}
			</Card>
		</ScoreCardsWrapper>
	);
};

export default ScoreCards;

const ScoreCardsWrapper = styled.div`
	display: flex;
	justify-content: space-around;
	margin: 20px 0;
`;

const Card = styled.div`
	background-color: ${(props) => props.bgColor};
	color: white;
	padding: 20px;
	border-radius: 10px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	text-align: center;
	width: 30%;
	transition: transform 0.3s ease;

	&:hover {
		transform: scale(1.05);
	}
`;

const Title = styled.div`
	font-size: 1.2em;
	font-weight: bold;
	margin-bottom: 10px;
`;

const Count = styled.div`
	font-size: 1.7rem;
	font-weight: bold;
`;

const AvailabilityNote = styled.div`
	font-size: 0.72rem;
	line-height: 1.25;
	margin-top: 6px;
	opacity: 0.92;
`;
