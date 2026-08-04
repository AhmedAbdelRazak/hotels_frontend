import { getReservationOverview } from "../apiAdmin";

jest.mock("axios", () => ({}));

describe("admin reservation overview API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.REACT_APP_API_URL = "https://api.example.test/api";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        reservationsByDay: [],
        checkinsByDay: [],
        checkoutsByDay: [],
        reservationsByBookingStatus: [],
        reservationsByHotelNames: [],
        topHotels: [],
      }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("sends the same hotel, limit, cancellation, and bearer-auth inputs", async () => {
    await getReservationOverview(
      "admin-1",
      "token-1",
      100,
      ["Hotel A", "Second Hotel"],
      { excludeCancelled: true },
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [requestUrl, options] = global.fetch.mock.calls[0];
    const url = new URL(requestUrl);
    expect(url.pathname).toBe(
      "/api/adminreports/reservations-overview/admin-1",
    );
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      hotels: "Hotel A,Second Hotel",
      limit: "100",
      excludeCancelled: "true",
    });
    expect(options.method).toBe("GET");
    expect(options.headers.Authorization).toBe("Bearer token-1");
  });

  it("returns null once on an unavailable endpoint so the caller controls fallback", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });

    try {
      await expect(
        getReservationOverview("admin-1", "token-1"),
      ).resolves.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
    }
  });
});
