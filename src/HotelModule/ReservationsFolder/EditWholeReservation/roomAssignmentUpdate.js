const roomAssignmentId = (room) => {
	if (!room) return "";
	if (typeof room !== "object") return String(room).trim();
	return String(room._id || room.id || room.value || "").trim();
};

export const normalizeRoomAssignmentIds = (rooms) =>
	(Array.isArray(rooms) ? rooms : []).map(roomAssignmentId).filter(Boolean);

export const roomAssignmentOptionMatchesSearch = (input, option = {}) => {
	const searchText = String(input || "").trim().toLowerCase();
	if (!searchText) return true;

	const visibleLabel = String(option?.label || "").toLowerCase();
	const optionValue = String(option?.value || "").toLowerCase();
	return visibleLabel.includes(searchText) || optionValue.includes(searchText);
};

const uniqueRoomAssignmentIds = (rooms) => [
	...new Set(normalizeRoomAssignmentIds(rooms)),
];

/**
 * Ant Design's multiple Select appends a clicked room to the current value.
 * For a one-room reservation that produces [oldRoom, newRoom], even though the
 * user's only sensible intent is a replacement. Resolve only that unambiguous
 * case automatically. For larger reservations, never guess which existing
 * room should be removed when the selection exceeds the booked room count.
 */
export const resolveRoomAssignmentSelection = ({
	currentRooms = [],
	nextRooms = [],
	requestedRoomCount = 0,
} = {}) => {
	const currentIds = uniqueRoomAssignmentIds(currentRooms);
	const nextIds = uniqueRoomAssignmentIds(nextRooms);
	const parsedLimit = Number(requestedRoomCount);
	const roomLimit =
		Number.isFinite(parsedLimit) && parsedLimit > 0
			? Math.trunc(parsedLimit)
			: 0;

	if (
		roomLimit === 0 ||
		nextIds.length <= roomLimit ||
		nextIds.length < currentIds.length
	) {
		return { roomIds: nextIds, blocked: false, replaced: false };
	}

	const currentIdSet = new Set(currentIds);
	const addedRoomIds = nextIds.filter((roomId) => !currentIdSet.has(roomId));
	if (
		roomLimit === 1 &&
		currentIds.length === 1 &&
		nextIds.length === 2 &&
		nextIds.includes(currentIds[0]) &&
		addedRoomIds.length === 1
	) {
		return {
			roomIds: [addedRoomIds[0]],
			blocked: false,
			replaced: true,
		};
	}

	return { roomIds: currentIds, blocked: true, replaced: false };
};

/**
 * A full multi-room assignment needs one local remove step before a replacement
 * can be selected. Stage exactly that one-room removal without writing it, so
 * the eventual old-set -> replacement-set update is atomic.
 */
export const shouldStageMultiRoomReplacement = ({
	persistedRooms = [],
	currentRooms = [],
	nextRooms = [],
	requestedRoomCount = 0,
} = {}) => {
	const parsedLimit = Number(requestedRoomCount);
	const roomLimit =
		Number.isFinite(parsedLimit) && parsedLimit > 1
			? Math.trunc(parsedLimit)
			: 0;
	if (!roomLimit) return false;

	const persistedIds = uniqueRoomAssignmentIds(persistedRooms);
	const currentIds = uniqueRoomAssignmentIds(currentRooms);
	const nextIds = uniqueRoomAssignmentIds(nextRooms);
	const currentIdSet = new Set(currentIds);

	return (
		persistedIds.length === roomLimit &&
		currentIds.length === roomLimit &&
		areSameRoomAssignments(persistedIds, currentIds) &&
		nextIds.length === roomLimit - 1 &&
		nextIds.length > 0 &&
		nextIds.every((roomId) => currentIdSet.has(roomId))
	);
};

export const mergeUpdatedReservationIntoList = (
	reservations,
	updatedReservation,
) => {
	if (!Array.isArray(reservations) || !updatedReservation?._id) {
		return reservations;
	}
	const updatedId = String(updatedReservation._id);
	return reservations.map((reservation) =>
		String(reservation?._id || "") === updatedId
			? { ...reservation, ...updatedReservation }
			: reservation,
	);
};

export const areSameRoomAssignments = (currentRooms, nextRooms) => {
	const currentIds = normalizeRoomAssignmentIds(currentRooms);
	const nextIds = normalizeRoomAssignmentIds(nextRooms);
	if (currentIds.length !== nextIds.length) return false;

	const sortedCurrentIds = [...currentIds].sort();
	const sortedNextIds = [...nextIds].sort();
	return sortedCurrentIds.every((id, index) => id === sortedNextIds[index]);
};

/**
 * The API intentionally rejects a physical-room replacement unless the client
 * identifies it as an explicit room-assignment action. Only add that intent
 * when the confirmed selector value differs from the persisted assignment, so
 * ordinary reservation edits can never unhouse or rehouse a guest implicitly.
 */
export const withExplicitRoomAssignmentIntent = (
	updateData,
	currentRooms,
	nextRooms,
) => {
	if (areSameRoomAssignments(currentRooms, nextRooms)) return updateData;

	return {
		...(updateData || {}),
		roomId: normalizeRoomAssignmentIds(nextRooms),
		__roomAssignmentUpdateIntent: true,
	};
};

/**
 * Build the smallest possible request for the dedicated room-assignment save.
 * Returning null for an unchanged assignment prevents duplicate/no-op writes.
 */
export const buildRoomAssignmentSavePayload = (currentRooms, nextRooms) => {
	if (areSameRoomAssignments(currentRooms, nextRooms)) return null;

	return {
		roomId: normalizeRoomAssignmentIds(nextRooms),
		__roomAssignmentUpdateIntent: true,
	};
};

/**
 * Apply only fields advanced by a successful room-assignment write. This lets
 * the editor keep unrelated unsaved form changes while moving its persisted
 * baseline (room assignment + optimistic-concurrency metadata) forward.
 */
export const mergePersistedRoomAssignment = (
	reservationDraft,
	persistedReservation,
) => {
	const draft = reservationDraft || {};
	if (!persistedReservation || typeof persistedReservation !== "object") {
		return draft;
	}

	const nextDraft = { ...draft };
	["roomId", "__v", "updatedAt"].forEach((field) => {
		if (Object.prototype.hasOwnProperty.call(persistedReservation, field)) {
			nextDraft[field] = persistedReservation[field];
		}
	});
	return nextDraft;
};

const isInHouseStatus = (status) =>
	/in[\s_-]*house/i.test(String(status || ""));

/**
 * A reservation that is already housed needs only a room-assignment patch.
 * Replaying the broader check-in form would rewrite its original check-in
 * timestamp/operator and can clear unrelated bed or pricing fields.
 */
export const buildSearchedReservationUpdate = ({
	reservation = {},
	nextRooms = [],
	checkInUpdate = {},
	requestingUserId = "",
	inhouseAt = new Date(),
} = {}) => {
	const alreadyInHouse = isInHouseStatus(reservation.reservation_status);
	if (alreadyInHouse && areSameRoomAssignments(reservation.roomId, nextRooms)) {
		return null;
	}

	const auditFields = requestingUserId ? { requestingUserId } : {};
	const baseUpdate = alreadyInHouse
		? auditFields
		: {
				...(checkInUpdate || {}),
				roomId: normalizeRoomAssignmentIds(nextRooms),
				inhouse_date: inhouseAt,
				...auditFields,
		  };

	return withExplicitRoomAssignmentIntent(
		baseUpdate,
		reservation.roomId,
		nextRooms,
	);
};
