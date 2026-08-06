import {
  getHotelRunnerAdminStatus,
  getHotelRunnerRoomMappings,
  updateHotelRunnerRoomMapping,
} from "./hotelRunnerApi";

describe("HotelRunner local admin API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.REACT_APP_API_URL = "https://pms.example.test/api/";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test("reads status and mappings only through protected PMS endpoints", async () => {
    await getHotelRunnerAdminStatus("admin id", "jwt-1");
    await getHotelRunnerRoomMappings("admin id", "jwt-1");

    expect(global.fetch.mock.calls[0][0]).toBe(
      "https://pms.example.test/api/hotelrunner/admin/status/admin%20id",
    );
    expect(global.fetch.mock.calls[1][0]).toBe(
      "https://pms.example.test/api/hotelrunner/admin/room-mappings/admin%20id",
    );
    for (const [, options] of global.fetch.mock.calls) {
      expect(options.headers.Authorization).toBe("Bearer jwt-1");
      expect(options.cache).toBe("no-store");
    }
  });

  test("sends an explicit room id, enable state, and concurrency version", async () => {
    await updateHotelRunnerRoomMapping("map/1", "admin-1", "jwt-1", {
      localRoomTypeId: "room-1",
      enabled: true,
      expectedVersion: 7,
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(
      "https://pms.example.test/api/hotelrunner/admin/room-mappings/map%2F1/admin-1",
    );
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({
      localRoomTypeId: "room-1",
      enabled: true,
      expectedVersion: 7,
    });
  });

  test("throws non-2xx responses even if their body looks successful", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: jest.fn().mockResolvedValue({
        success: true,
        error: "This mapping changed. Refresh it before saving again.",
      }),
    });

    await expect(
      updateHotelRunnerRoomMapping("map-1", "admin-1", "jwt-1", {
        localRoomTypeId: "room-1",
        enabled: true,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
