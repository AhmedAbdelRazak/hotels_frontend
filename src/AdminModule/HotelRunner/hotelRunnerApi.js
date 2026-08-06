/** @format */

const apiRoot = () =>
  String(process.env.REACT_APP_API_URL || "")
    .trim()
    .replace(/\/$/, "");

const pathSegment = (value) => encodeURIComponent(String(value || "").trim());

const readJson = async (response, fallbackMessage) => {
  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const requestError = new Error(
      payload?.error || payload?.message || fallbackMessage,
    );
    requestError.status = response.status;
    requestError.payload = payload;
    throw requestError;
  }

  return payload || {};
};

const authHeaders = (token) => ({
  Accept: "application/json",
  Authorization: `Bearer ${String(token || "")}`,
});

export const getHotelRunnerAdminStatus = async (
  userId,
  token,
  { signal } = {},
) => {
  const response = await fetch(
    `${apiRoot()}/hotelrunner/admin/status/${pathSegment(userId)}`,
    {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
      signal,
    },
  );
  return readJson(response, "Could not load HotelRunner status.");
};

export const getHotelRunnerRoomMappings = async (
  userId,
  token,
  { signal } = {},
) => {
  const response = await fetch(
    `${apiRoot()}/hotelrunner/admin/room-mappings/${pathSegment(userId)}`,
    {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
      signal,
    },
  );
  return readJson(response, "Could not load HotelRunner room mappings.");
};

export const updateHotelRunnerRoomMapping = async (
  mappingId,
  userId,
  token,
  { localRoomTypeId = "", enabled = false, expectedVersion },
  { signal } = {},
) => {
  const response = await fetch(
    `${apiRoot()}/hotelrunner/admin/room-mappings/${pathSegment(
      mappingId,
    )}/${pathSegment(userId)}`,
    {
      method: "PUT",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        localRoomTypeId: String(localRoomTypeId || "").trim(),
        enabled: enabled === true,
        expectedVersion: Number(expectedVersion),
      }),
      signal,
    },
  );
  return readJson(response, "Could not update HotelRunner room mapping.");
};
