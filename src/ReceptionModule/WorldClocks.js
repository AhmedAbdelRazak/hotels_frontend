import React, { useState, useEffect } from "react";
import Clock from "react-clock";
import "react-clock/dist/Clock.css";
import styled from "styled-components";
import {
	EGYPT_TIME_ZONE,
	SAUDI_TIME_ZONE,
	USA_PACIFIC_TIME_ZONE,
	formatZoneOffset,
	getTimeZoneWallDate,
} from "../utils/worldTimeZones";

const clockZones = [
	{
		label: "Mecca, Saudi Arabia",
		timeZone: SAUDI_TIME_ZONE,
		className: "clock-border-saudi",
	},
	{
		label: "California, USA",
		timeZone: USA_PACIFIC_TIME_ZONE,
		className: "clock-border-usa",
	},
	{
		label: "Egypt",
		timeZone: EGYPT_TIME_ZONE,
		className: "clock-border-egypt",
	},
];

const WorldClocks = () => {
	const [date, setDate] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => setDate(new Date()), 1000);

		return () => {
			clearInterval(interval);
		};
	}, []);

	return (
		<WorldClocksWrapper>
			<div style={{ display: "flex", justifyContent: "space-around" }}>
				{clockZones.map((zone) => (
					<div key={zone.timeZone}>
						<h5>
							{zone.label} ({formatZoneOffset(date, zone.timeZone)})
						</h5>
						<div className={zone.className}>
							<Clock
								value={getTimeZoneWallDate(date, zone.timeZone)}
								renderNumbers={true}
								size={100}
							/>
						</div>
					</div>
				))}
			</div>
		</WorldClocksWrapper>
	);
};

export default WorldClocks;

const WorldClocksWrapper = styled.div`
	text-align: center;

	h5 {
		text-align: center;
		font-weight: bold;
		font-size: 1rem;
	}

	.clock-border-egypt {
		text-align: center;
		margin: auto;
	}

	.react-clock__mark__number {
		font-size: 11px !important; /* Adjust the font size of the numbers */
	}
`;
