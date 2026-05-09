import React, { useState, useEffect } from "react";
import styled from "styled-components";

const DigitalClock = () => {
	const [time, setTime] = useState(new window.Date());

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(new window.Date());
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const formatTime = (date) => {
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		const seconds = date.getSeconds().toString().padStart(2, "0");
		return { hours, minutes, seconds };
	};

	const formatDate = (date) => {
		const day = date.getDate();
		const month = date.toLocaleString("default", { month: "short" });
		return `${day} ${month}`;
	};

	const timeFormatted = formatTime(time);

	return (
		<ClockWrapper dir='ltr'>
			<TimeBox>{timeFormatted.hours}</TimeBox>
			<Separator>:</Separator>
			<TimeBox>{timeFormatted.minutes}</TimeBox>
			<Separator className='seconds-separator'>:</Separator>
			<TimeBox className='seconds-box'>{timeFormatted.seconds}</TimeBox>
			<DateBox className='date-box'>{formatDate(time)}</DateBox>
		</ClockWrapper>
	);
};

export default DigitalClock;

const ClockWrapper = styled.div`
	display: flex;
	align-items: center;
	color: #000;
	font-size: 16px;
	white-space: nowrap;

	@media (max-width: 560px) {
		font-size: 13px;
	}

	@media (max-width: 430px) {
		.seconds-box,
		.seconds-separator {
			display: none;
		}
	}

	@media (max-width: 360px) {
		.date-box {
			display: none;
		}
	}
`;

const TimeBox = styled.div`
	background-color: #f3f3f3;
	border-radius: 5px;
	padding: 4px 8px;
	margin: 0 2px;

	@media (max-width: 560px) {
		padding: 3px 6px;
		margin: 0 1px;
	}
`;

const Separator = styled.div`
	margin: 0 2px;
	color: white;

	@media (max-width: 560px) {
		margin: 0 1px;
	}
`;

const DateBox = styled.div`
	background-color: #f3f3f3;
	border-radius: 5px;
	padding: 4px 8px;
	margin-left: 8px;
	font-weight: bold;
	text-transform: capitalize;

	@media (max-width: 560px) {
		padding: 3px 6px;
		margin-left: 5px;
	}
`;
