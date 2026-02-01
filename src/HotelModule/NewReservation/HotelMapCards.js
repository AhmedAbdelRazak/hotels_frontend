import React, { useEffect, useState } from "react";
import styled from "styled-components";
import CountUp from "react-countup";
import { getHotelMapSummary } from "../apiAdmin";
import { isAuthenticated } from "../../auth";

const defaultStats = {
	occupied: 0,
	vacant: 0,
	clean: 0,
	dirty: 0,
	cleaning: 0,
	outOfService: 0,
};

const HotelMapCards = () => {
	const [stats, setStats] = useState(defaultStats);

	const { user } = isAuthenticated();
	const selectedHotel =
		JSON.parse(localStorage.getItem("selectedHotel")) || {};
	const hotelId = selectedHotel?._id;
	const belongsToId =
		user?.role === 2000
			? user?._id
			: selectedHotel?.belongsTo?._id || selectedHotel?.belongsTo;

	useEffect(() => {
		if (!hotelId || !belongsToId) return;
		let isMounted = true;

		getHotelMapSummary(hotelId, belongsToId).then((data) => {
			if (!isMounted) return;
			if (data && data.error) {
				setStats(defaultStats);
				return;
			}
			const summary = data?.summary || {};
			setStats({
				occupied: Number(summary.occupied) || 0,
				vacant: Number(summary.vacant) || 0,
				clean: Number(summary.clean) || 0,
				dirty: Number(summary.dirty) || 0,
				cleaning: Number(summary.cleaning) || 0,
				outOfService: Number(summary.outOfService) || 0,
			});
		});

		return () => {
			isMounted = false;
		};
	}, [hotelId, belongsToId]);

	return (
		<Wrapper>
			<StatsCards>
				<StatCard color='rgba(0, 0, 255, 0.1)' textColor='rgba(0, 0, 255, 0.2)'>
					<h2>
						Occupied{" "}
						<span>
							<CountUp end={stats.occupied} duration={1.5} />
						</span>
					</h2>
				</StatCard>
				<StatCard
					color='rgba(128, 0, 128, 0.1)'
					textColor='rgba(128, 0, 128, 0.2)'
				>
					<h2>
						Vacant{" "}
						<span>
							<CountUp end={stats.vacant} duration={1.5} />
						</span>
					</h2>
				</StatCard>
				<StatCard color='rgba(0, 255, 0, 0.1)' textColor='rgba(0, 255, 0, 0.5)'>
					<h2>
						Clean{" "}
						<span>
							<CountUp end={stats.clean} duration={1.5} />
						</span>
					</h2>
				</StatCard>
				<StatCard color='rgba(255, 0, 0, 0.1)' textColor='rgba(255, 0, 0, 0.2)'>
					<h2>
						Dirty{" "}
						<span>
							<CountUp end={stats.dirty} duration={1.5} />
						</span>
					</h2>
				</StatCard>
				<StatCard
					color='rgba(255, 255, 0, 0.1)'
					textColor='rgba(255, 255, 0, 1)'
				>
					<h2>
						Cleaning{" "}
						<span>
							<CountUp end={stats.cleaning} duration={1.5} />
						</span>
					</h2>
				</StatCard>
				<StatCard color='rgba(255, 0, 0, 0.1)' textColor='rgba(255, 0, 0, 0.2)'>
					<h2>
						Out Of Service{" "}
						<span>
							<CountUp end={stats.outOfService} duration={1.5} />
						</span>
					</h2>
				</StatCard>
			</StatsCards>
		</Wrapper>
	);
};

export default HotelMapCards;

// Styled components
const Wrapper = styled.div`
	background-color: #ededed;
	border-radius: 5px;
`;

const StatsCards = styled.div`
	display: flex;
	justify-content: center; /* Center the cards */
	align-items: center;
	vertical-align: center;
	margin-bottom: 20px;
	gap: 5px; /* Set the gap between the cards */
	padding-top: 10px;
	padding-bottom: 10px;
`;

const StatCard = styled.div`
	background-color: white;
	border: 1px solid #ccc;
	border-radius: 8px;
	padding: 10px;
	width: 200px; /* Set a fixed width for the cards */
	text-align: center;

	h2 {
		font-size: 1.1rem;
		margin: 0;
		color: ${(props) => props.textColor};
		font-weight: bold;

		span {
			font-size: 1rem;
			color: black;
		}
	}
`;
