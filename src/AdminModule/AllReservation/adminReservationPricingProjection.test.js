import {
  buildAdminPricingProjectionRooms,
  preserveOtaPricingForRoomType,
  projectSavedNightlyPricing,
} from "./adminReservationPricingProjection";

test("a SUPER admin HotelRunner price correction preserves complete room identity and provenance", () => {
  const sourceRoom = {
    room_type: "familyRooms",
    roomType: "familyRooms",
    displayName: "Spacious Six-Bed Room",
    hotelRoomConfigId: "6a4a84216022cd7f31729011",
    sourceRoomName: "Family - 6 Persons",
    otaRoomMatchType: "explicit_capacity",
    otaRoomMatchScore: 0.98,
    sourceRoomId: "hotelrunner-room-6",
    count: 1,
    pricingByDay: [
      {
        date: "2026-08-07",
        clientPrice: 91.14,
        rootPrice: 75,
        totalPriceWithCommission: 91.14,
      },
    ],
  };

  const [projected] = buildAdminPricingProjectionRooms([sourceRoom], {
    preserveRoomMetadata: true,
  });

  expect(projected).toMatchObject({
    room_type: "familyRooms",
    displayName: "Spacious Six-Bed Room",
    hotelRoomConfigId: "6a4a84216022cd7f31729011",
    sourceRoomName: "Family - 6 Persons",
    otaRoomMatchType: "explicit_capacity",
    otaRoomMatchScore: 0.98,
    sourceRoomId: "hotelrunner-room-6",
    count: 1,
    chosenPrice: "91.14",
    totalPriceWithCommission: 91.14,
    hotelShouldGet: 75,
  });
  expect(projected).not.toHaveProperty("roomType");
  expect(projected.pricingByDay).toEqual(sourceRoom.pricingByDay);
  expect(sourceRoom).toHaveProperty("roomType", "familyRooms");
});

test("extending an OTA stay repeats saved nightly pricing without consulting a calendar", () => {
  const room = {
    chosenPrice: 999,
    pricingByDay: [
      {
        date: "2026-08-07",
        clientPrice: 80,
        rootPrice: 60,
        netAfterExpenses: 70,
      },
      {
        date: "2026-08-08",
        clientPrice: 100,
        rootPrice: 75,
        netAfterExpenses: 85,
      },
    ],
  };

  const projected = projectSavedNightlyPricing(room, [
    "2026-08-07",
    "2026-08-08",
    "2026-08-09",
  ]);

  expect(projected.map((day) => day.clientPrice)).toEqual([80, 100, 100]);
  expect(projected.map((day) => day.rootPrice)).toEqual([60, 75, 75]);
  expect(projected.map((day) => day.netAfterExpenses)).toEqual([70, 85, 85]);
  expect(projected.reduce((total, day) => total + day.clientPrice, 0)).toBe(
    280
  );
});

test("changing an OTA room type preserves nightly prices and their total", () => {
  const sourceRoom = {
    roomType: "tripleRooms",
    displayName: "Triple Room",
    hotelRoomConfigId: "triple-config",
    sourceRoomName: "OTA source room",
    pricingByDay: [{ date: "2026-08-07", clientPrice: 91.14, rootPrice: 75 }],
  };
  const corrected = preserveOtaPricingForRoomType(sourceRoom, {
    roomType: "familyRooms",
    displayName: "Spacious Six-Bed Room",
    hotelRoomConfigId: "family-config",
  });

  expect(corrected).toMatchObject({
    roomType: "familyRooms",
    displayName: "Spacious Six-Bed Room",
    hotelRoomConfigId: "family-config",
    sourceRoomName: "OTA source room",
    otaRoomMatchType: "admin_override",
    otaRoomMatchScore: 1,
  });
  expect(corrected.pricingByDay).toEqual(sourceRoom.pricingByDay);
  expect(
    corrected.pricingByDay.reduce((total, day) => total + day.clientPrice, 0)
  ).toBe(91.14);
  expect(corrected.pricingByDay).not.toBe(sourceRoom.pricingByDay);
});
