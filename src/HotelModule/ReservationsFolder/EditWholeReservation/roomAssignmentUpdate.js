const roomAssignmentId = (room) => {
	if (!room) return "";
	if (typeof room !== "object") return String(room).trim();
	return String(room._id || room.id || room.value || "").trim();
};

export const normalizeRoomAssignmentIds = (rooms) =>
	(Array.isArray(rooms) ? rooms : []).map(roomAssignmentId).filter(Boolean);

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
