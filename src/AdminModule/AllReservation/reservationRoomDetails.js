const asArray = (value) => (Array.isArray(value) ? value : []);

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
