import React, { useMemo } from "react";
import styled, { createGlobalStyle } from "styled-components";

const TEXT = {
	en: {
		title: "Room inventory check",
		hotel: "Hotel",
		stay: "Stay",
		requested: "Requested",
		whenBooked: "When booked",
		availableNow: "Available now",
		beforeAfter: "before -> after",
		capacity: "capacity",
		agentStock: "agent stock",
		noSnapshot: "Booking-time inventory snapshot is not available for this reservation.",
		noCurrent: "Current inventory is not available for this stay range.",
		noRooms: "No room lines found for this reservation.",
		checking: "Checking current inventory...",
		moreRooms: "more room lines",
	},
	ar: {
		title: "\u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u062e\u0632\u0648\u0646 \u0627\u0644\u063a\u0631\u0641",
		hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
		stay: "\u0627\u0644\u0625\u0642\u0627\u0645\u0629",
		requested: "\u0627\u0644\u0645\u0637\u0644\u0648\u0628",
		whenBooked: "\u0648\u0642\u062a \u0627\u0644\u062d\u062c\u0632",
		availableNow: "\u0627\u0644\u0645\u062a\u0627\u062d \u0627\u0644\u0622\u0646",
		beforeAfter: "\u0642\u0628\u0644 -> \u0628\u0639\u062f",
		capacity: "\u0627\u0644\u0633\u0639\u0629",
		agentStock: "\u0645\u062e\u0632\u0648\u0646 \u0627\u0644\u0648\u0643\u064a\u0644",
		noSnapshot:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u0644\u0642\u0637\u0629 \u0645\u062e\u0632\u0648\u0646 \u0648\u0642\u062a \u0625\u0646\u0634\u0627\u0621 \u0647\u0630\u0627 \u0627\u0644\u062d\u062c\u0632.",
		noCurrent:
			"\u0644\u0627 \u062a\u062a\u0648\u0641\u0631 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u0641\u062a\u0631\u0629.",
		noRooms:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u063a\u0631\u0641 \u0645\u062d\u062f\u062f\u0629 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u062d\u062c\u0632.",
		checking:
			"\u062c\u0627\u0631\u064a \u0641\u062d\u0635 \u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0627\u0644\u062d\u0627\u0644\u064a...",
		moreRooms: "\u063a\u0631\u0641 \u0623\u062e\u0631\u0649",
	},
};

export const PENDING_REVIEW_MODAL_CLASS = "pending-review-modal-position";

const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") {
		return String(value._id || value.id || value.$oid || "").trim();
	}
	return String(value || "").trim();
};

const dateOnly = (value) => {
	if (!value) return "";
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	return parsed.toISOString().slice(0, 10);
};

const normalizeKey = (value) =>
	String(value || "")
		.replace(/[\u2013\u2014\u2212]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();

const toTitleCase = (value = "") =>
	String(value || "")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/[A-Za-z][A-Za-z'’-]*/g, (word) =>
			`${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
		);

const getReservationHotelName = (reservation = {}, snapshot = {}) =>
	String(
		reservation.hotelName ||
			reservation.hotel_name ||
			reservation.hotel?.hotelName ||
			reservation.hotelDetails?.hotelName ||
			reservation.hotelId?.hotelName ||
			snapshot.hotelName ||
			""
	)
		.replace(/\s+/g, " ")
		.trim();

const roomKey = (room = {}) => {
	const display = normalizeKey(
		room.displayName || room.display_name || room.roomDisplayName || room.name
	);
	const type = normalizeKey(room.room_type || room.roomType || room.type);
	return display || type ? `${display}|${type}` : "";
};

const asNumber = (value, fallback = null) => {
	if (value === null || value === undefined || value === "") return fallback;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCount = (value) => {
	const parsed = asNumber(value, null);
	if (parsed === null) return "N/A";
	return parsed.toLocaleString("en-US");
};

const countLabel = (available, capacity) => {
	if (available === null && capacity === null) return "N/A";
	if (capacity !== null) return `${formatCount(available)} / ${formatCount(capacity)}`;
	return formatCount(available);
};

const extractRows = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.rooms)) return payload.rooms;
	if (Array.isArray(payload?.availableRooms)) return payload.availableRooms;
	return [];
};

export const extractPendingInventoryRows = extractRows;

export const getPendingReservationInventoryRequest = (
	reservation = {},
	fallbackHotelId = ""
) => {
	const hotelId = normalizeId(reservation.hotelId) || normalizeId(fallbackHotelId);
	const start = dateOnly(reservation.checkin_date);
	const end = dateOnly(reservation.checkout_date);
	const agentId = normalizeId(
		reservation.orderTakeId ||
			reservation.orderTaker ||
			reservation.createdByUserId ||
			reservation.requestingUserId ||
			reservation.createdBy
	);
	return { hotelId, start, end, agentId };
};

const addRoomLine = (map, candidate = {}, source = "reservation") => {
	if (!candidate || typeof candidate !== "object") return;
	const displayName =
		candidate.displayName ||
		candidate.display_name ||
		candidate.roomDisplayName ||
		candidate.name ||
		"";
	const roomType =
		candidate.room_type || candidate.roomType || candidate.type || "";
	const key = roomKey({ displayName, room_type: roomType });
	if (!key) return;
	const existing = map.get(key) || {
		key,
		displayName: displayName || roomType || "Room",
		roomType,
		requested: null,
		snapshot: null,
		sources: new Set(),
	};
	const requested = asNumber(
		candidate.requested ??
			candidate.count ??
			candidate.quantity ??
			candidate.rooms ??
			candidate.roomCount,
		null
	);
	existing.displayName = existing.displayName || displayName || roomType || "Room";
	existing.roomType = existing.roomType || roomType;
	if (requested !== null) existing.requested = Math.max(1, requested);
	if (source === "snapshot") existing.snapshot = candidate;
	existing.sources.add(source);
	map.set(key, existing);
};

const buildRoomLines = (reservation = {}) => {
	const map = new Map();
	const snapshotRooms = Array.isArray(reservation?.availabilitySnapshot?.rooms)
		? reservation.availabilitySnapshot.rooms
		: [];
	snapshotRooms.forEach((room) => addRoomLine(map, room, "snapshot"));

	const pickedRooms = Array.isArray(reservation.pickedRoomsType)
		? reservation.pickedRoomsType
		: [];
	pickedRooms.forEach((room) => addRoomLine(map, room, "picked"));

	const pickedPricing = Array.isArray(reservation.pickedRoomsPricing)
		? reservation.pickedRoomsPricing
		: [];
	pickedPricing.forEach((room) => addRoomLine(map, room, "pricing"));

	const roomDetails = Array.isArray(reservation.roomDetails)
		? reservation.roomDetails
		: Array.isArray(reservation.roomId)
		? reservation.roomId
		: [];
	roomDetails.forEach((room) =>
		addRoomLine(
			map,
			{
				displayName: room.displayName || room.display_name || room.room_number,
				room_type: room.room_type || room.roomType,
			},
			"assigned"
		)
	);

	if (!map.size) {
		addRoomLine(
			map,
			{
				displayName: reservation.displayName || reservation.roomDisplayName,
				room_type: reservation.room_type || reservation.roomType,
				count: reservation.total_rooms,
			},
			"reservation"
		);
	}

	return Array.from(map.values()).map((room) => ({
		...room,
		requested: room.requested || 1,
	}));
};

const findCurrentInventory = (room = {}, inventoryRows = []) => {
	const keys = [
		room.key,
		roomKey({
			displayName: room.displayName,
			room_type: room.roomType,
		}),
		normalizeKey(room.displayName),
		normalizeKey(room.roomType),
	].filter(Boolean);

	return inventoryRows.find((item) => {
		const itemKeys = [
			roomKey(item),
			normalizeKey(item.displayName || item.display_name || item.roomDisplayName),
			normalizeKey(item.room_type || item.roomType),
		].filter(Boolean);
		return itemKeys.some((itemKey) => keys.includes(itemKey));
	});
};

const snapshotMetric = (room = {}, keyCandidates = []) => {
	const snapshot = room.snapshot || {};
	for (const key of keyCandidates) {
		const value = asNumber(snapshot[key], null);
		if (value !== null) return value;
	}
	return null;
};

const aggregateSnapshotMetric = (snapshot = {}, keyCandidates = []) => {
	for (const key of keyCandidates) {
		const value = asNumber(snapshot[key], null);
		if (value !== null) return value;
	}
	return null;
};

const PendingReservationInventoryBrief = ({
	reservation = {},
	currentInventory = [],
	loading = false,
	isArabic = false,
	limit = 4,
}) => {
	const labels = TEXT[isArabic ? "ar" : "en"];
	const rooms = useMemo(() => buildRoomLines(reservation), [reservation]);
	const inventoryRows = useMemo(
		() => extractRows(currentInventory),
		[currentInventory]
	);
	const snapshot = reservation?.availabilitySnapshot || {};
	const hasSnapshot =
		Boolean(snapshot?.captured) ||
		rooms.some((room) => room.snapshot) ||
		aggregateSnapshotMetric(snapshot, [
			"availableRoomsAtCreation",
			"minAvailableBefore",
			"totalAvailableBefore",
		]) !== null;
	const hasCurrent = inventoryRows.length > 0;
	const stayStart = dateOnly(reservation?.checkin_date || snapshot?.checkin_date);
	const stayEnd = dateOnly(reservation?.checkout_date || snapshot?.checkout_date);
	const hotelName = getReservationHotelName(reservation, snapshot);
	const displayHotelName = toTitleCase(hotelName);

	const visibleRooms = rooms.slice(0, limit);

	return (
		<>
			<PendingReviewModalGlobalStyle />
			<InventoryBriefShell dir={isArabic ? "rtl" : "ltr"} $isRTL={isArabic}>
			<InventoryBriefHeader>
				<div>
					<strong>{labels.title}</strong>
					<small>
						{labels.stay}: {stayStart || "-"} - {stayEnd || "-"}
					</small>
				</div>
				{loading ? <LoadingPill>{labels.checking}</LoadingPill> : null}
			</InventoryBriefHeader>

			{displayHotelName ? (
				<HotelIdentityBar>
					<span>{labels.hotel}</span>
					<strong>{displayHotelName}</strong>
				</HotelIdentityBar>
			) : null}

			{visibleRooms.length ? (
				<RoomLineList>
					{visibleRooms.map((room) => {
						const current = findCurrentInventory(room, inventoryRows);
						const before =
							snapshotMetric(room, [
								"minAvailableBefore",
								"availableBefore",
								"availableBeforeRaw",
								"capacity",
							]) ??
							aggregateSnapshotMetric(snapshot, [
								"availableRoomsAtCreation",
								"minAvailableBefore",
								"totalAvailableBefore",
							]);
						const after =
							snapshotMetric(room, [
								"minAvailableAfter",
								"availableAfter",
								"availableAfterRaw",
							]) ??
							aggregateSnapshotMetric(snapshot, [
								"availableRoomsAfterReservation",
								"minAvailableAfter",
								"totalAvailableAfter",
							]);
						const availableNow = current
							? asNumber(
									current.available ??
										current.availableRooms ??
										current.remaining ??
										current.globalAvailable,
									null
							  )
							: null;
						const capacityNow = current
							? asNumber(
									current.agentInventoryApplied
										? current.agentAssignedStock
										: current.total_available ?? current.capacity,
									null
							  )
							: null;

						return (
							<RoomLine key={room.key}>
								<RoomIdentity>
									<strong>{room.displayName || room.roomType || "Room"}</strong>
									{room.roomType ? <small>{room.roomType}</small> : null}
									{room.snapshot?.agentScoped || current?.agentInventoryApplied ? (
										<AgentStockBadge>{labels.agentStock}</AgentStockBadge>
									) : null}
								</RoomIdentity>
								<MetricGrid>
									<MetricBox>
										<span>{labels.requested}</span>
										<strong>{formatCount(room.requested)}</strong>
									</MetricBox>
									<MetricBox>
										<span>{labels.whenBooked}</span>
										<strong>
											{before === null && after === null
												? "N/A"
												: `${formatCount(before)} -> ${formatCount(after)}`}
										</strong>
										<small>{labels.beforeAfter}</small>
									</MetricBox>
									<MetricBox>
										<span>{labels.availableNow}</span>
										<strong>{countLabel(availableNow, capacityNow)}</strong>
										{capacityNow !== null ? <small>{labels.capacity}</small> : null}
									</MetricBox>
								</MetricGrid>
							</RoomLine>
						);
					})}
				</RoomLineList>
			) : (
				<InventoryNotice>{labels.noRooms}</InventoryNotice>
			)}

			{rooms.length > visibleRooms.length ? (
				<InventoryNotice>
					+{rooms.length - visibleRooms.length} {labels.moreRooms}
				</InventoryNotice>
			) : null}
			{!hasSnapshot ? <InventoryNotice>{labels.noSnapshot}</InventoryNotice> : null}
			{!loading && !hasCurrent ? (
				<InventoryNotice>{labels.noCurrent}</InventoryNotice>
			) : null}
			</InventoryBriefShell>
		</>
	);
};

export default PendingReservationInventoryBrief;

const PendingReviewModalGlobalStyle = createGlobalStyle`
	.${PENDING_REVIEW_MODAL_CLASS} {
		top: 20vh !important;
		max-width: calc(100vw - 32px);
		padding-bottom: 24px;
	}

	.${PENDING_REVIEW_MODAL_CLASS} .ant-modal-content {
		max-height: calc(100vh - 22vh);
		display: flex;
		flex-direction: column;
	}

	.${PENDING_REVIEW_MODAL_CLASS} .ant-modal-body {
		overflow-y: auto;
		max-height: calc(100vh - 32vh);
	}

	@media (max-width: 640px) {
		.${PENDING_REVIEW_MODAL_CLASS} {
			top: 8vh !important;
			max-width: calc(100vw - 18px);
			padding-bottom: 14px;
		}

		.${PENDING_REVIEW_MODAL_CLASS} .ant-modal-content {
			max-height: calc(100vh - 10vh);
		}

		.${PENDING_REVIEW_MODAL_CLASS} .ant-modal-body {
			max-height: calc(100vh - 20vh);
			padding: 16px;
		}
	}

	@media (max-height: 700px) and (min-width: 641px) {
		.${PENDING_REVIEW_MODAL_CLASS} {
			top: 12vh !important;
		}

		.${PENDING_REVIEW_MODAL_CLASS} .ant-modal-content {
			max-height: calc(100vh - 14vh);
		}

		.${PENDING_REVIEW_MODAL_CLASS} .ant-modal-body {
			max-height: calc(100vh - 24vh);
		}
	}
`;

const InventoryBriefShell = styled.section`
	display: grid;
	gap: 9px;
	padding: 10px;
	border: 1px solid #c8dcf2;
	border-radius: 8px;
	background: linear-gradient(135deg, #f8fbff, #eef7ff);
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};
`;

const InventoryBriefHeader = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;

	div {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	strong {
		color: #102a43;
		font-size: 0.95rem;
		font-weight: 950;
	}

	small {
		color: #526b84;
		font-size: 0.76rem;
		font-weight: 800;
	}
`;

const HotelIdentityBar = styled.div`
	display: grid;
	justify-items: center;
	gap: 3px;
	padding: 8px 10px;
	border-radius: 7px;
	background: #102a43;
	color: #fff;
	box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
	text-align: center;

	span {
		color: #cce2f5;
		font-size: 0.7rem;
		font-weight: 900;
		text-transform: uppercase;
		white-space: nowrap;
	}

	strong {
		min-width: 0;
		color: #fff;
		font-size: 0.9rem;
		font-weight: 950;
		line-height: 1.3;
		text-align: center;
		text-transform: capitalize;
		overflow-wrap: anywhere;
	}

	@media (max-width: 460px) {
		gap: 3px;
	}
`;

const LoadingPill = styled.span`
	flex: 0 0 auto;
	padding: 4px 8px;
	border-radius: 999px;
	background: #fff7e6;
	color: #ad6800;
	font-size: 0.72rem;
	font-weight: 900;
	white-space: nowrap;
`;

const RoomLineList = styled.div`
	display: grid;
	gap: 8px;
`;

const RoomLine = styled.div`
	display: grid;
	grid-template-columns: minmax(120px, 0.8fr) minmax(0, 1.7fr);
	gap: 9px;
	align-items: stretch;
	padding: 8px;
	border: 1px solid rgba(77, 132, 184, 0.22);
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.82);

	@media (max-width: 560px) {
		grid-template-columns: 1fr;
	}
`;

const RoomIdentity = styled.div`
	display: grid;
	align-content: center;
	gap: 3px;
	min-width: 0;

	strong {
		color: #0f2742;
		font-size: 0.88rem;
		font-weight: 950;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	small {
		color: #64748b;
		font-size: 0.72rem;
		font-weight: 800;
		overflow-wrap: anywhere;
	}
`;

const AgentStockBadge = styled.span`
	width: fit-content;
	padding: 2px 7px;
	border-radius: 999px;
	background: #eef2ff;
	color: #3730a3;
	font-size: 0.68rem;
	font-weight: 900;
`;

const MetricGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 6px;

	@media (max-width: 460px) {
		grid-template-columns: 1fr;
	}
`;

const MetricBox = styled.div`
	display: grid;
	align-content: center;
	gap: 2px;
	min-height: 58px;
	padding: 7px 8px;
	border-radius: 7px;
	background: #f8fbff;
	border: 1px solid #d8e8f7;

	span {
		color: #5b7087;
		font-size: 0.68rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	strong {
		color: #102033;
		font-size: 0.9rem;
		font-weight: 950;
		line-height: 1.25;
	}

	small {
		color: #6b7f95;
		font-size: 0.66rem;
		font-weight: 800;
	}
`;

const InventoryNotice = styled.div`
	padding: 6px 8px;
	border-radius: 7px;
	background: rgba(255, 255, 255, 0.72);
	color: #5f6f82;
	font-size: 0.75rem;
	font-weight: 800;
	line-height: 1.45;
`;
