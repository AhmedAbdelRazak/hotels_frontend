import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import CountUp from "react-countup";
import { Empty, Modal } from "antd";
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

const toSafeStats = (summary = {}) => ({
	occupied: Number(summary.occupied) || 0,
	vacant: Number(summary.vacant) || 0,
	clean: Number(summary.clean) || 0,
	dirty: Number(summary.dirty) || 0,
	cleaning: Number(summary.cleaning) || 0,
	outOfService: Number(summary.outOfService) || 0,
});

const normalizeRoomsByStatus = (roomsByStatus = {}) =>
	Object.keys(defaultStats).reduce((accumulator, key) => {
		accumulator[key] = Array.isArray(roomsByStatus?.[key])
			? roomsByStatus[key]
			: [];
		return accumulator;
	}, {});

const getRoomNumber = (room = {}) =>
	room.room_number || room.roomNumber || room.room || room.number || "-";

const getRoomType = (room = {}) =>
	room.display_name || room.displayName || room.room_type || room.roomType || "-";

const sortRoomsForDisplay = (rooms = []) =>
	[...rooms].sort((firstRoom, secondRoom) => {
		const firstFloor = Number(firstRoom?.floor) || 0;
		const secondFloor = Number(secondRoom?.floor) || 0;
		if (firstFloor !== secondFloor) return secondFloor - firstFloor;
		return String(getRoomNumber(firstRoom)).localeCompare(
			String(getRoomNumber(secondRoom)),
			undefined,
			{ numeric: true, sensitivity: "base" }
		);
	});

const HotelMapCards = ({ chosenLanguage, summary }) => {
	const [summaryPayload, setSummaryPayload] = useState({
		summary: defaultStats,
		roomsByStatus: {},
	});
	const [selectedCard, setSelectedCard] = useState(null);
	const hasLiveSummary = summary && typeof summary === "object";

	const { user } = isAuthenticated();
	const selectedHotel =
		JSON.parse(localStorage.getItem("selectedHotel")) || {};
	const hotelId = selectedHotel?._id;
	const belongsToId =
		user?.role === 2000
			? user?._id
			: selectedHotel?.belongsTo?._id || selectedHotel?.belongsTo;

	useEffect(() => {
		if (hasLiveSummary) return;
		if (!hotelId || !belongsToId) return;
		let isMounted = true;

		getHotelMapSummary(hotelId, belongsToId).then((data) => {
			if (!isMounted) return;
			if (data && data.error) {
				setSummaryPayload({ summary: defaultStats, roomsByStatus: {} });
				return;
			}
			setSummaryPayload({
				summary: toSafeStats(data?.summary),
				roomsByStatus: normalizeRoomsByStatus(data?.roomsByStatus),
			});
		});

		return () => {
			isMounted = false;
		};
	}, [hotelId, belongsToId, hasLiveSummary]);

	const displayStats = useMemo(
		() =>
			hasLiveSummary
				? toSafeStats(summary?.summary || summary)
				: summaryPayload.summary,
		[hasLiveSummary, summaryPayload.summary, summary]
	);

	const displayRoomsByStatus = useMemo(
		() =>
			normalizeRoomsByStatus(
				hasLiveSummary ? summary?.roomsByStatus : summaryPayload.roomsByStatus
			),
		[hasLiveSummary, summaryPayload.roomsByStatus, summary]
	);

	const isArabic = chosenLanguage === "Arabic";
	const cards = [
		{
			key: "occupied",
			label: isArabic ? "مشغولة" : "Occupied",
			value: displayStats.occupied,
			bg: "#e3f2fd",
			border: "#b8defb",
			accent: "#1e88e5",
		},
		{
			key: "vacant",
			label: isArabic ? "متاحة" : "Vacant",
			value: displayStats.vacant,
			bg: "#e8f5e9",
			border: "#bde7c4",
			accent: "#05a857",
		},
		{
			key: "clean",
			label: isArabic ? "نظيفة" : "Clean",
			value: displayStats.clean,
			bg: "#f5fbdc",
			border: "#e8f4a8",
			accent: "#22c55e",
		},
		{
			key: "dirty",
			label: isArabic ? "متسخة" : "Dirty",
			value: displayStats.dirty,
			bg: "#ffebee",
			border: "#ffcdd2",
			accent: "#f04438",
		},
		{
			key: "cleaning",
			label: isArabic ? "قيد التنظيف" : "Cleaning",
			value: displayStats.cleaning,
			bg: "#fff3e0",
			border: "#ffe0b2",
			accent: "#f59e0b",
		},
		{
			key: "outOfService",
			label: isArabic ? "خارج الخدمة" : "Out of Service",
			value: displayStats.outOfService,
			bg: "#f4f6f8",
			border: "#d7dde5",
			accent: "#64748b",
		},
	];

	const selectedRooms = selectedCard
		? sortRoomsForDisplay(displayRoomsByStatus[selectedCard.key] || [])
		: [];
	const selectedCount = selectedCard
		? selectedRooms.length || selectedCard.value || 0
		: 0;

	return (
		<Wrapper dir={isArabic ? "rtl" : "ltr"}>
			<StatsCards>
				{cards.map((card) => (
					<StatCard
						key={card.key}
						type='button'
						$bg={card.bg}
						$border={card.border}
						$accent={card.accent}
						onClick={() => setSelectedCard(card)}
						aria-label={
							isArabic
								? `عرض غرف ${card.label}`
								: `Show ${card.label} rooms`
						}
					>
						<CardLabel>{card.label}</CardLabel>
						<CardValue>
							<CountUp end={card.value} duration={1.1} separator=',' />
						</CardValue>
					</StatCard>
				))}
			</StatsCards>
			<Modal
				open={!!selectedCard}
				onCancel={() => setSelectedCard(null)}
				footer={null}
				width={760}
				destroyOnClose
				title={
					<ModalTitle dir={isArabic ? "rtl" : "ltr"}>
						<span>{selectedCard?.label}</span>
						<ModalCount>{selectedCount}</ModalCount>
					</ModalTitle>
				}
			>
				<RoomsModalBody dir={isArabic ? "rtl" : "ltr"}>
					{selectedRooms.length === 0 ? (
						<Empty
							description={
								isArabic
									? "لا توجد غرف لعرضها في هذا التصنيف"
									: "No rooms to show for this status"
							}
						/>
					) : (
						<RoomList>
							{selectedRooms.map((room) => (
								<RoomRow key={room._id || `${getRoomNumber(room)}-${room.floor}`}>
									<RoomNumber dir='ltr'>{getRoomNumber(room)}</RoomNumber>
									<RoomDetails>
										<RoomType>{getRoomType(room)}</RoomType>
										<RoomMeta>
											<span>
												{isArabic ? "الطابق" : "Floor"}: {room.floor || "-"}
											</span>
											<span>
												{isArabic ? "الحالة" : "Status"}:{" "}
												{selectedCard?.label}
											</span>
											{room.housekeepingDirtyReason ===
												"not_cleaned_48_hours" && (
												<span>
													{isArabic
														? "لم يتم تنظيفها خلال آخر 48 ساعة"
														: "Not cleaned in the last 48 hours"}
												</span>
											)}
										</RoomMeta>
									</RoomDetails>
								</RoomRow>
							))}
						</RoomList>
					)}
				</RoomsModalBody>
			</Modal>
		</Wrapper>
	);
};

export default HotelMapCards;

const Wrapper = styled.div`
	background: #eef8ff;
	border: 1px solid #c8e7ff;
	border-radius: 8px;
	padding: 10px;
	margin-bottom: 14px;
	box-shadow: 0 3px 10px rgba(15, 23, 42, 0.05);
`;

const StatsCards = styled.div`
	display: grid;
	grid-template-columns: repeat(6, minmax(0, 1fr));
	gap: 10px;

	@media (max-width: 1180px) {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	@media (max-width: 640px) {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
	}
`;

const StatCard = styled.button`
	position: relative;
	min-width: 0;
	min-height: 78px;
	background: ${({ $bg }) => $bg};
	border: 1px solid ${({ $border }) => $border};
	border-radius: 8px;
	padding: 10px 8px;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	overflow: hidden;
	cursor: pointer;
	appearance: none;
	font-family: inherit;
	transition: transform 0.18s ease, box-shadow 0.18s ease,
		border-color 0.18s ease;

	&::before {
		content: "";
		position: absolute;
		inset-inline-start: 0;
		top: 0;
		bottom: 0;
		width: 4px;
		background: ${({ $accent }) => $accent};
	}

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
		border-color: ${({ $accent }) => $accent};
	}

	&:focus-visible {
		outline: 3px solid rgba(24, 144, 255, 0.25);
		outline-offset: 2px;
	}

	@media (max-width: 640px) {
		min-height: 62px;
		padding: 7px 4px;
	}
`;

const CardLabel = styled.div`
	width: 100%;
	color: #334155;
	font-size: clamp(0.66rem, 2.3vw, 0.86rem);
	font-weight: 800;
	line-height: 1.1;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`;

const CardValue = styled.div`
	color: #020617;
	font-size: clamp(1rem, 3vw, 1.55rem);
	font-weight: 900;
	line-height: 1;
	font-variant-numeric: tabular-nums;
`;

const ModalTitle = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-weight: 900;
	color: #0f172a;
`;

const ModalCount = styled.span`
	min-width: 38px;
	height: 28px;
	padding: 0 10px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 999px;
	background: #e8f4ff;
	color: #0b72d9;
	font-weight: 900;
	font-variant-numeric: tabular-nums;
`;

const RoomsModalBody = styled.div`
	max-height: min(62vh, 540px);
	overflow: auto;
	padding-inline-end: 2px;
`;

const RoomList = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
	}
`;

const RoomRow = styled.div`
	display: grid;
	grid-template-columns: 78px minmax(0, 1fr);
	gap: 10px;
	align-items: center;
	padding: 10px;
	border: 1px solid #cfe6ff;
	border-radius: 8px;
	background: #f8fbff;

	[dir="rtl"] & {
		grid-template-columns: minmax(0, 1fr) 78px;
	}
`;

const RoomNumber = styled.div`
	min-height: 54px;
	border-radius: 8px;
	background: #0f172a;
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.1rem;
	font-weight: 900;
	font-variant-numeric: tabular-nums;
`;

const RoomDetails = styled.div`
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 5px;
`;

const RoomType = styled.div`
	color: #0f172a;
	font-weight: 900;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`;

const RoomMeta = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 5px 8px;
	color: #64748b;
	font-size: 0.78rem;
	font-weight: 700;

	span {
		background: #eef6ff;
		border: 1px solid #d8ecff;
		border-radius: 999px;
		padding: 2px 8px;
	}
`;
