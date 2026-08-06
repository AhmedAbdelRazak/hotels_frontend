import {
  canActivateMapping,
  mappingHasUnsavedSelection,
  mergeMappingUpdate,
  roomOptionLabel,
  summarizeHotelRunnerStatus,
} from "./hotelRunnerViewModel";

describe("HotelRunner admin view model", () => {
  test("summarizes only known queue and projection states", () => {
    expect(
      summarizeHotelRunnerStatus({
        configuration: {
          tokenConfigured: true,
          hrIdConfigured: true,
          supportedPropertyCount: 1,
        },
        queue: {
          pending: 2,
          processing: 1,
          retry: 3,
          needs_mapping: 4,
          quarantined: 1,
          failed: 2,
          completed: 8,
          ignored: 5,
        },
        projections: { created: 5, updated: 2, cancelled: 1 },
      }),
    ).toEqual({
      configurationReady: true,
      waiting: 6,
      needsMapping: 4,
      attention: 3,
      processed: 13,
      projected: 8,
    });
  });

  test("keeps mapping identity and optimistic version from the server update", () => {
    expect(
      mergeMappingUpdate(
        { _id: "mapping-1", invCode: "DBL", version: 2 },
        { localRoomTypeId: "room-1", status: "active", version: 3 },
      ),
    ).toEqual({
      _id: "mapping-1",
      invCode: "DBL",
      localRoomTypeId: "room-1",
      status: "active",
      version: 3,
    });
  });

  test("detects changed selections and produces unambiguous room labels", () => {
    expect(
      mappingHasUnsavedSelection({ localRoomTypeId: "room-1" }, "room-2"),
    ).toBe(true);
    expect(
      roomOptionLabel({
        displayName: "Double Room",
        roomType: "doubleRooms",
        count: 4,
      }),
    ).toBe("Double Room — doubleRooms (4 rooms)");
  });

  test("never permits HotelRunner master fallback inventory to be activated", () => {
    expect(
      canActivateMapping({ isMaster: true, roomListVerified: true }, "room-1"),
    ).toBe(false);
    expect(
      canActivateMapping({ isMaster: false, roomListVerified: true }, "room-1"),
    ).toBe(true);
    expect(
      canActivateMapping({ isMaster: false, roomListVerified: true }, ""),
    ).toBe(false);
  });

  test("holds payload-discovered inventory until room-list verification", () => {
    expect(
      canActivateMapping(
        { isMaster: false, roomListVerified: false },
        "room-1",
      ),
    ).toBe(false);
    expect(canActivateMapping({ isMaster: false }, "room-1")).toBe(false);
  });
});
