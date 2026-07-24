const asArray = (value) => (Array.isArray(value) ? value : []);

export const normalizeReservationReferenceId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return value._id || value.id || "";
  return "";
};

const normalizeRoomId = (value) => {
  const candidate =
    value && typeof value === "object"
      ? value._id || value.id || value.roomId || value.room_id
      : value;
  const normalized = String(candidate || "")
    .trim()
    .toLowerCase();
  return /^[a-f\d]{24}$/i.test(normalized) ? normalized : "";
};

const cleanRoomText = (value) =>
  String(value === null || value === undefined ? "" : value).trim();

const uniqueRoomText = (values = []) => {
  const seen = new Set();
  return values.reduce((result, value) => {
    const text = cleanRoomText(value);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return result;
    seen.add(key);
    result.push(text);
    return result;
  }, []);
};

export const getRoomTypeDisplayLabel = (value) => {
	const text = cleanRoomText(value);
	const combinedInternalLabel = text.match(
		/^[a-z][A-Za-z0-9_]*(?:[A-Z][A-Za-z0-9_]*)+\s*-\s*(.+)$/,
	);
	return combinedInternalLabel?.[1]?.trim() || text;
};

const roomTypeLabel = (room = {}) => {
  if (!room || typeof room !== "object") return "";
  const type = cleanRoomText(room.room_type || room.roomType);
  const displayName = cleanRoomText(room.display_name || room.displayName);
  if (displayName && displayName.toLowerCase() !== type.toLowerCase()) {
	return getRoomTypeDisplayLabel(displayName);
  }
  return getRoomTypeDisplayLabel(type || displayName);
};

const roomNumbersFromRecord = (room = {}) => {
  if (!room || typeof room !== "object") return [];
  return [
    room.room_number,
    room.roomNumber,
    ...asArray(room.room_numbers),
    ...asArray(room.roomNumbers),
  ];
};

/**
 * Normalize reserved room types and assigned room numbers across legacy and
 * populated API response shapes. Raw ObjectIds are deliberately never shown as
 * room numbers.
 */
export const getReservationRoomSummary = (
  reservation = {},
  extraRoomDetails = [],
) => {
  const assignedRooms = [
    ...asArray(reservation?.roomDetails),
    ...asArray(reservation?.roomId).filter(
      (room) => room && typeof room === "object",
    ),
    ...asArray(extraRoomDetails),
  ].filter(Boolean);
  const pickedRooms = asArray(reservation?.pickedRoomsType).flatMap((room) => [
    room,
    ...asArray(room?.roomDetails),
    ...asArray(room?.roomId).filter(
      (assignedRoom) => assignedRoom && typeof assignedRoom === "object",
    ),
  ]);

  const reservedRoomTypes = uniqueRoomText(pickedRooms.map(roomTypeLabel));
  const roomTypes = reservedRoomTypes.length
    ? reservedRoomTypes
    : uniqueRoomText(assignedRooms.map(roomTypeLabel));
  const roomNumbers = uniqueRoomText([
    ...asArray(reservation?.room_numbers),
    ...asArray(reservation?.roomNumbers),
    reservation?.room_number,
    reservation?.roomNumber,
    ...assignedRooms.flatMap(roomNumbersFromRecord),
    ...pickedRooms.flatMap(roomNumbersFromRecord),
  ]);

  return {
    roomTypes,
    roomNumbers,
    roomTypeText: roomTypes.join(", "),
    roomNumberText: roomNumbers.join(", "),
  };
};

const uniqueRoomIds = (value) => {
  const seen = new Set();
  return asArray(value).reduce((ids, roomRef) => {
    const roomId = normalizeRoomId(roomRef);
    if (!roomId || seen.has(roomId)) return ids;
    seen.add(roomId);
    ids.push(roomId);
    return ids;
  }, []);
};

const normalizeReservationIdentity = (value) =>
  String(value === null || value === undefined ? "" : value).trim();

const hasDifferentReservationIdentity = (previous, incoming) => {
  const previousId = normalizeReservationIdentity(
    previous?._id || previous?.id,
  );
  const incomingId = normalizeReservationIdentity(
    incoming?._id || incoming?.id,
  );
  if (previousId && incomingId) return previousId !== incomingId;

  const previousConfirmation = normalizeReservationIdentity(
    previous?.confirmation_number || previous?.confirmationNumber,
  );
  const incomingConfirmation = normalizeReservationIdentity(
    incoming?.confirmation_number || incoming?.confirmationNumber,
  );
  if (previousConfirmation && incomingConfirmation) {
    return previousConfirmation !== incomingConfirmation;
  }

  // If both objects identify a reservation but use non-comparable identifier
  // fields, do not risk combining data from two records.
  return Boolean(
    (previousId || previousConfirmation) &&
      (incomingId || incomingConfirmation),
  );
};

/**
 * Prefer a newly rendered reservation prop only when it identifies a different
 * record. For the same record, keep the locally committed (usually newer) copy.
 */
export const selectActiveReservation = (current, reservationProp) => {
  if (!reservationProp || typeof reservationProp !== "object") {
    return current || reservationProp;
  }
  if (!current || typeof current !== "object") return reservationProp;
  return hasDifferentReservationIdentity(current, reservationProp)
    ? reservationProp
    : current;
};

/**
 * Keep authorized room details when a mutation returns the same reservation but
 * omits populated room data. Explicit roomDetails always wins, and a changed
 * roomId assignment never reuses stale room numbers.
 */
export const mergeReservationPreservingRoomDetails = (previous, incoming) => {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return incoming || previous;
  }
  if (!previous || typeof previous !== "object" || Array.isArray(previous)) {
    return incoming;
  }
  // Ignore a late mutation response for a reservation that is no longer open.
  // Prop-driven reservation changes are handled explicitly by MoreDetails.
  if (hasDifferentReservationIdentity(previous, incoming)) return previous;

  const merged = { ...previous, ...incoming };
  const hasIncomingRoomDetails = Object.prototype.hasOwnProperty.call(
    incoming,
    "roomDetails",
  );
  if (hasIncomingRoomDetails && incoming.roomDetails !== undefined) {
    return merged;
  }

  const previousRoomDetails = asArray(previous.roomDetails);
  if (previousRoomDetails.length === 0) return merged;

  const hasIncomingRoomId = Object.prototype.hasOwnProperty.call(
    incoming,
    "roomId",
  );
  if (!hasIncomingRoomId || incoming.roomId === undefined) {
    merged.roomDetails = previousRoomDetails;
    return merged;
  }

  const incomingRoomIds = uniqueRoomIds(incoming.roomId);
  const previousDetailsById = new Map();
  previousRoomDetails.forEach((room) => {
    const roomId = normalizeRoomId(room);
    if (roomId && !previousDetailsById.has(roomId)) {
      previousDetailsById.set(roomId, room);
    }
  });

  if (
    incomingRoomIds.length > 0 &&
    incomingRoomIds.length === previousDetailsById.size &&
    incomingRoomIds.every((roomId) => previousDetailsById.has(roomId))
  ) {
    merged.roomDetails = incomingRoomIds.map((roomId) =>
      previousDetailsById.get(roomId),
    );
    return merged;
  }

  // An explicit empty value prevents parent state merges and modal remounts
  // from restoring the previous assignment while fresh details are unavailable.
  merged.roomDetails = [];
  return merged;
};
