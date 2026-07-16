import {
  mergeReservationPreservingRoomDetails,
  normalizeReservationReferenceId,
  selectActiveReservation,
} from "./reservationRoomDetails";

const ROOM_101 = "65a000000000000000000101";
const ROOM_305 = "65a000000000000000000305";
const ROOM_401 = "65a000000000000000000401";

const details = [
  { _id: ROOM_101, room_number: "101" },
  { _id: ROOM_305, room_number: "305" },
];

test("normalizes populated hotel references before room lookups", () => {
  expect(normalizeReservationReferenceId({ _id: "hotel-1" })).toBe("hotel-1");
  expect(normalizeReservationReferenceId({ id: "hotel-2" })).toBe("hotel-2");
  expect(normalizeReservationReferenceId("hotel-3")).toBe("hotel-3");
  expect(normalizeReservationReferenceId(null)).toBe("");
});

test("keeps room details when a same-reservation update omits assignments", () => {
  const previous = { _id: "reservation-1", roomDetails: details };
  const incoming = { _id: "reservation-1", payment: "paid offline" };

  const merged = mergeReservationPreservingRoomDetails(previous, incoming);

  expect(merged.roomDetails).toEqual(details);
  expect(merged.payment).toBe("paid offline");
  expect(previous).not.toHaveProperty("payment");
});

test("keeps and reorders details when raw room IDs describe the same rooms", () => {
  const merged = mergeReservationPreservingRoomDetails(
    { roomDetails: details },
    { roomId: [ROOM_305.toUpperCase(), ROOM_101] },
  );

  expect(merged.roomDetails.map((room) => room.room_number)).toEqual([
    "305",
    "101",
  ]);
});

test("respects an explicit authoritative roomDetails response", () => {
  const merged = mergeReservationPreservingRoomDetails(
    { roomDetails: details },
    { roomDetails: [] },
  );

  expect(merged.roomDetails).toEqual([]);
});

test("does not display stale rooms after an assignment changes or clears", () => {
  const changed = mergeReservationPreservingRoomDetails(
    { roomDetails: details },
    { roomId: [ROOM_401] },
  );
  const cleared = mergeReservationPreservingRoomDetails(
    { roomDetails: details },
    { roomId: [] },
  );

  expect(changed.roomDetails).toEqual([]);
  expect(cleared.roomDetails).toEqual([]);
});

test("ignores a late update for a different reservation", () => {
  const current = {
    _id: "reservation-2",
    confirmation_number: "CONF-2",
    guest_name: "Current guest",
    roomDetails: details,
  };
  const lateUpdate = {
    _id: "reservation-1",
    confirmation_number: "CONF-1",
    guest_name: "Previous guest",
  };

  expect(mergeReservationPreservingRoomDetails(current, lateUpdate)).toBe(
    current,
  );
});

test("an old callback reads the latest rendered identity before effects run", () => {
  const previous = {
    _id: "reservation-1",
    confirmation_number: "CONF-1",
    roomDetails: details,
  };
  const renderedProp = {
    _id: "reservation-2",
    confirmation_number: "CONF-2",
    roomDetails: [{ _id: ROOM_401, room_number: "401" }],
  };
  const lateUpdate = { _id: "reservation-1", payment: "paid" };

  const latestRenderedPropRef = { current: previous };
  let current = previous;
  const callbackCapturedWhilePreviousWasOpen = (incoming) => {
    const active = selectActiveReservation(
      current,
      latestRenderedPropRef.current,
    );
    current = mergeReservationPreservingRoomDetails(active, incoming);
    return current;
  };

  // Simulate rendering reservation 2 while the old reservation 1 request is
  // still pending. The old callback must read the shared ref, not captured props.
  latestRenderedPropRef.current = renderedProp;
  const afterLateUpdate = callbackCapturedWhilePreviousWasOpen(lateUpdate);

  expect(afterLateUpdate).toBe(renderedProp);
});

test("keeps a cleared assignment cleared when parent state is reopened", () => {
  const initial = {
    _id: "reservation-1",
    roomId: [ROOM_101, ROOM_305],
    roomDetails: details,
  };
  const parentAfterUpdate = mergeReservationPreservingRoomDetails(initial, {
    _id: "reservation-1",
    roomId: [ROOM_401],
  });
  const reopened = mergeReservationPreservingRoomDetails(
    undefined,
    parentAfterUpdate,
  );

  expect(parentAfterUpdate.roomDetails).toEqual([]);
  expect(reopened.roomDetails).toEqual([]);
});

test("does not create room details from unrelated reservation fields", () => {
  const merged = mergeReservationPreservingRoomDetails(
    { _id: "reservation-1" },
    {
      pickedRoomsType: [{ displayName: "303", count: 3 }],
      bedNumber: ["7"],
      total_rooms: 3,
    },
  );

  expect(merged).not.toHaveProperty("roomDetails");
});
