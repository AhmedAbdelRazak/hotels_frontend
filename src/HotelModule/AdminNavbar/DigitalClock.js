import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
	formatSaudiGregorianDate,
	formatSaudiHijriDate,
	formatSaudiTime,
	parseDateValue,
	SAUDI_TIME_ZONE,
} from "../../utils/saudiDates";
import { formatZoneOffset } from "../../utils/worldTimeZones";

const DigitalClock = ({ isArabic = false }) => {
	const [time, setTime] = useState(new window.Date());

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(new window.Date());
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const language = isArabic ? "Arabic" : "English";
	const weekday = new Intl.DateTimeFormat(
		isArabic ? "ar-SA-u-ca-gregory-nu-latn" : "en-US",
		{
			timeZone: SAUDI_TIME_ZONE,
			weekday: "long",
		},
	).format(parseDateValue(time) || time);
	const gregorianDate = formatSaudiGregorianDate(time, {
		language,
		month: "short",
	});
	const hijriDate = formatSaudiHijriDate(time, {
		language,
		month: "long",
	});
	const clockTime = formatSaudiTime(time, { language, fallback: "00:00" });
	const zoneOffset = formatZoneOffset(time, SAUDI_TIME_ZONE, isArabic, "");

	return (
		<ClockWrapper dir={isArabic ? "rtl" : "ltr"} $isArabic={isArabic}>
			<ClockDay>{weekday}</ClockDay>
			<ClockBody>
				<ClockZone>
					{isArabic
						? "\u062a\u0648\u0642\u064a\u062a \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629"
						: "Saudi Time"}
					{zoneOffset ? <small dir='ltr'>{zoneOffset}</small> : null}
				</ClockZone>
				<ClockTime dir='ltr'>
					<strong>{clockTime}</strong>
				</ClockTime>
			</ClockBody>
			<ClockDate>
				<span>{gregorianDate}</span>
				<small>{hijriDate}</small>
			</ClockDate>
		</ClockWrapper>
	);
};

export default DigitalClock;

const ClockWrapper = styled.div`
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) minmax(130px, auto);
	align-items: center;
	gap: 10px;
	min-width: 364px;
	min-height: 52px;
	padding: 7px 12px;
	border: 1px solid rgba(166, 98, 180, 0.78);
	background:
		linear-gradient(
			115deg,
			rgba(255, 255, 255, 0.18) 0%,
			rgba(255, 255, 255, 0) 27%,
			rgba(255, 255, 255, 0.12) 48%,
			rgba(255, 255, 255, 0) 68%
		),
		var(--pms-metal-purple-bg, linear-gradient(180deg, #64166e 0%, #4f135b 100%));
	box-shadow:
		inset 0 1px rgba(255, 255, 255, 0.16),
		inset 0 -1px rgba(0, 0, 0, 0.24),
		0 10px 24px rgba(80, 23, 96, 0.28);
	color: #ffffff;
	font-family: ${(props) =>
		props.$isArabic
			? `"Droid Arabic Kufi", "Tajawal", "Cairo", "Noto Kufi Arabic", "Segoe UI", Tahoma, Arial, sans-serif`
			: `"Inter", "Segoe UI", Arial, sans-serif`};
	font-size: 14px;
	font-weight: 900;
	letter-spacing: 0;
	white-space: nowrap;

	@media (max-width: 1120px) {
		min-width: 292px;
		gap: 8px;
		padding: 7px 10px;
	}

	@media (max-width: 980px) {
		min-width: 190px;
		grid-template-columns: minmax(0, 1fr) auto;
	}

	@media (max-width: 560px) {
		min-width: 164px;
		min-height: 42px;
		padding: 6px 9px;
		font-size: 12px;
	}

	@media (max-width: 760px) {
		display: none;
	}
`;

const ClockDay = styled.div`
	color: #23d354;
	font-size: 1.08rem;
	font-weight: 950;
	line-height: 1;

	@media (max-width: 980px) {
		display: none;
	}
`;

const ClockBody = styled.div`
	display: grid;
	gap: 1px;
	min-width: 0;
	text-align: inherit;
`;

const ClockZone = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 5px;
	color: #23d354;
	font-size: 0.68rem;
	font-weight: 950;
	line-height: 1.1;

	small {
		color: #f4c84f;
		font-size: 0.64rem;
		font-weight: 950;
	}
`;

const ClockTime = styled.div`
	display: inline-flex;
	align-items: baseline;
	gap: 5px;
	font-family: "Segoe UI", Tahoma, Arial, sans-serif;
	line-height: 1;

	strong {
		font-size: 1.24rem;
		font-weight: 950;
	}

	@media (max-width: 560px) {
		strong {
			font-size: 1.08rem;
		}
	}
`;

const ClockDate = styled.div`
	color: #f6f1fb;
	font-size: 0.74rem;
	font-weight: 900;
	line-height: 1.15;
	text-align: center;

	span,
	small {
		display: block;
	}

	small {
		color: #f4c84f;
		font-size: 0.68rem;
		margin-top: 2px;
	}

	@media (max-width: 1120px) {
		display: none;
	}
`;
