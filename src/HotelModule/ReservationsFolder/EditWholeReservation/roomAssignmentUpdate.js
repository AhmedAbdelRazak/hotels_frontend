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
