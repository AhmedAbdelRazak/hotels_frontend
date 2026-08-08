const normalizeRoomCount = (value) => Math.max(1, Number(value || 1) || 1);

const cleanText = (value) => String(value || "").trim();

const finiteMoney = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const amount = Number(String(value).replace(/,/g, "").trim());
    if (Number.isFinite(amount)) return amount;
  }
  return null;
};

const dateOnlyKey = (value) => {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

export const projectSavedNightlyPricing = (room = {}, expectedDates = []) => {
  const rows = Array.isArray(room.pricingByDay) ? room.pricingByDay : [];
  if (!rows.length || !expectedDates.length) return [];
  const rowsByDate = new Map(
    rows
      .map((day) => [dateOnlyKey(day?.date), day])
      .filter(([date]) => Boolean(date))
  );

  return expectedDates.map((date, index) => {
    const template =
      rowsByDate.get(date) || rows[Math.min(index, rows.length - 1)];
    const clientPrice =
      finiteMoney(
        template.clientPrice,
        template.mainPrice,
        template.totalPriceWithCommission,
        template.price,
        room.chosenPrice
      ) ?? 0;
    const rootPrice =
      finiteMoney(
        template.rootPrice,
        template.totalPriceWithoutCommission,
        template.price
      ) ?? clientPrice;

    return {
      ...template,
      date,
      price: clientPrice,
      clientPrice,
      mainPrice: clientPrice,
      rootPrice,
      commissionRate: finiteMoney(template.commissionRate) ?? 0,
      totalPriceWithCommission: clientPrice,
      totalPriceWithoutCommission: rootPrice,
    };
  });
};

export const preserveOtaPricingForRoomType = (
  room = {},
  { roomType = "", displayName = "", hotelRoomConfigId = "" } = {}
) => ({
  ...room,
  roomType: cleanText(roomType),
  displayName: cleanText(displayName),
  hotelRoomConfigId:
    cleanText(hotelRoomConfigId) || room.hotelRoomConfigId || "",
  otaRoomMatchType: "admin_override",
  otaRoomMatchScore: 1,
  pricingByDay: (Array.isArray(room.pricingByDay) ? room.pricingByDay : []).map(
    (day) => ({ ...day })
  ),
});

export const buildAdminPricingProjectionRooms = (
  rooms = [],
  {
    preserveRoomMetadata = false,
    resolvePricingDay = (day) => ({ ...day }),
  } = {}
) =>
  (Array.isArray(rooms) ? rooms : []).flatMap((room = {}) => {
    const pricingDetails = (
      Array.isArray(room.pricingByDay) ? room.pricingByDay : []
    ).map(resolvePricingDay);
    const totalWithCommission = pricingDetails.reduce(
      (total, day) => total + Number(day?.totalPriceWithCommission || 0),
      0
    );
    const hotelShouldGet = pricingDetails.reduce(
      (total, day) => total + Number(day?.rootPrice || 0),
      0
    );
    const chosenPrice =
      pricingDetails.length > 0
        ? totalWithCommission / pricingDetails.length
        : 0;
    const normalizedRoom = {
      room_type: cleanText(room.roomType || room.room_type),
      displayName: cleanText(
        room.displayName || room.display_name || room.roomType || room.room_type
      ),
      chosenPrice: chosenPrice.toFixed(2),
      pricingByDay: pricingDetails,
      totalPriceWithCommission: totalWithCommission,
      hotelShouldGet,
    };

    if (preserveRoomMetadata) {
      const { roomType, display_name, ...sourceRoom } = room;
      return [
        {
          ...sourceRoom,
          ...normalizedRoom,
          count: normalizeRoomCount(room.count),
        },
      ];
    }

    return Array.from({ length: normalizeRoomCount(room.count) }, () => ({
      ...normalizedRoom,
      count: 1,
    }));
  });
