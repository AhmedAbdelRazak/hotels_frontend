import React from "react";
import styled from "styled-components";

const MAX_VISIBLE_ITEMS = 7;

const FourthRow = ({
	chosenLanguage = "English",
	adminDashboardReport = {},
}) => {
	const isArabic = chosenLanguage === "Arabic";

	const toSafeLabel = (value, fallback) => {
		if (value === null || value === undefined) return fallback;
		const text = String(value).trim();
		return text ? text : fallback;
	};

	const toSafeNumber = (value) => {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	};

	const normalizeItems = (items, labelKey, fallbackPrefix) => {
		if (!Array.isArray(items)) return [];
		return items
			.map((item, index) => ({
				label: toSafeLabel(item?.[labelKey], `${fallbackPrefix} ${index + 1}`),
				value: toSafeNumber(item?.value),
				fillColor: item?.fillColor,
			}))
			.slice(0, MAX_VISIBLE_ITEMS);
	};

	const numberFormatter = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 0,
	});

	const formatValue = (value, { currency = false } = {}) => {
		const formatted = numberFormatter.format(toSafeNumber(value));
		if (!currency) return formatted;
		return isArabic ? `${formatted} ر.س.` : `SAR ${formatted}`;
	};

	const {
		topChannels = [],
		roomNightsByType = [],
		roomRevenueByType = [],
	} = adminDashboardReport;

	const normalizedTopChannels = normalizeItems(topChannels, "name", "Channel");
	const normalizedRoomNights = normalizeItems(
		roomNightsByType,
		"type",
		"Room Type"
	);
	const normalizedRoomRevenue = normalizeItems(
		roomRevenueByType,
		"type",
		"Room Type"
	);

	const chartTitles = isArabic
		? {
				topChannels: "أهم قنوات الحجز",
				roomNights: "ليالي الغرف حسب اسم الغرفة",
				roomRevenue: "إيراد الغرف حسب اسم الغرفة",
		  }
		: {
				topChannels: "Top Booking Channels",
				roomNights: "Room Nights by Room Name",
				roomRevenue: "Room Revenue by Room Name",
		  };

	const emptyLabel = isArabic ? "لا توجد بيانات لهذه الفترة" : "No data for this period";
	const chartConfigs = [
		{
			key: "topChannels",
			title: chartTitles.topChannels,
			items: normalizedTopChannels,
			color: "#4285F4",
		},
		{
			key: "roomNights",
			title: chartTitles.roomNights,
			items: normalizedRoomNights,
			color: "#E74C3C",
		},
		{
			key: "roomRevenue",
			title: chartTitles.roomRevenue,
			items: normalizedRoomRevenue,
			color: "#FF7373",
			currency: true,
		},
	];

	return (
		<FourthRowWrapper dir={isArabic ? "rtl" : "ltr"}>
			{chartConfigs.map((config) => (
				<ChartCard key={config.key}>
					<ChartTitle>{config.title}</ChartTitle>
					<ResponsiveBarList
						color={config.color}
						currency={config.currency}
						emptyLabel={emptyLabel}
						formatValue={formatValue}
						isArabic={isArabic}
						items={config.items}
					/>
				</ChartCard>
			))}
		</FourthRowWrapper>
	);
};

const ResponsiveBarList = ({
	items,
	color,
	currency = false,
	emptyLabel,
	formatValue,
	isArabic,
}) => {
	const maxValue = Math.max(...items.map((item) => item.value), 1);

	if (!items.length) {
		return <EmptyState>{emptyLabel}</EmptyState>;
	}

	return (
		<BarList>
			{items.map((item, index) => {
				const rawPercent = (item.value / maxValue) * 100;
				const percent = item.value > 0 ? Math.max(rawPercent, 4) : 0;
				const displayValue = formatValue(item.value, { currency });
				const fillColor = item.fillColor || color;

				return (
					<BarItem key={`${item.label}-${index}`} title={`${item.label}: ${displayValue}`}>
						<BarMeta>
							<BarLabel dir='auto'>{item.label}</BarLabel>
							<BarValue dir={isArabic ? "rtl" : "ltr"}>{displayValue}</BarValue>
						</BarMeta>
						<BarTrack>
							<BarFill
								$color={fillColor}
								$percent={percent}
								$isArabic={isArabic}
							/>
						</BarTrack>
					</BarItem>
				);
			})}
		</BarList>
	);
};

export default FourthRow;

// ---------------- STYLED COMPONENTS ----------------

const FourthRowWrapper = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
	gap: 14px;
	background-color: #f7f8fc;
	min-width: 0;
`;

const ChartCard = styled.div`
	background-color: white;
	border-radius: 8px;
	padding: 16px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	width: 100%;
`;

const ChartTitle = styled.h2`
	margin: 0 0 14px 0;
	font-size: clamp(16px, 1.1vw, 18px);
	font-weight: 800;
	line-height: 1.35;
	text-align: start;
	overflow-wrap: anywhere;
`;

const BarList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 13px;
	min-width: 0;
	width: 100%;
`;

const BarItem = styled.div`
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
`;

const BarMeta = styled.div`
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
	direction: inherit;
	min-width: 0;
`;

const BarLabel = styled.div`
	color: #111827;
	font-size: 13px;
	font-weight: 700;
	line-height: 1.35;
	min-width: 0;
	overflow: hidden;
	text-align: start;
	text-overflow: ellipsis;
	unicode-bidi: plaintext;
	white-space: nowrap;
`;

const BarValue = styled.div`
	color: #111827;
	flex: 0 0 auto;
	font-size: 12px;
	font-weight: 800;
	line-height: 1.2;
	max-width: 45%;
	overflow-wrap: anywhere;
	text-align: end;
	unicode-bidi: plaintext;
`;

const BarTrack = styled.div`
	background: #eef2f7;
	border-radius: 999px;
	height: 14px;
	overflow: hidden;
	position: relative;
	width: 100%;
`;

const BarFill = styled.div`
	background: ${(props) => props.$color};
	border-radius: inherit;
	bottom: 0;
	left: ${(props) => (props.$isArabic ? "auto" : 0)};
	position: absolute;
	right: ${(props) => (props.$isArabic ? 0 : "auto")};
	top: 0;
	width: ${(props) => props.$percent}%;
`;

const EmptyState = styled.div`
	align-items: center;
	background: #f8fafc;
	border: 1px dashed #d8dee9;
	border-radius: 8px;
	color: #6b7280;
	display: flex;
	font-size: 14px;
	justify-content: center;
	min-height: 168px;
	padding: 18px;
	text-align: center;
`;
