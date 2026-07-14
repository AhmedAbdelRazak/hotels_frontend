import { getPaidBreakdownReportAdmin } from "../apiAdmin";

jest.mock("axios", () => ({}));

describe("admin paid breakdown report API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    process.env.REACT_APP_API_URL = "https://api.example.test/api";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [], scorecards: {} }),
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("sends the canonical date field and Gregorian range with the report request", async () => {
    await getPaidBreakdownReportAdmin("admin-1", "token-1", {
      hotelId: "hotel-1",
      searchQuery: "guest name",
      dateBy: "checkin_date",
      dateFrom: "2026-07-14",
      dateTo: "2026-07-15",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [requestUrl, options] = global.fetch.mock.calls[0];
    const url = new URL(requestUrl);
    expect(url.pathname).toBe("/api/adminreports/paid-breakdown/admin-1");
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      hotelId: "hotel-1",
      searchQuery: "guest name",
      dateBy: "checkin_date",
      dateFrom: "2026-07-14",
      dateTo: "2026-07-15",
      page: "1",
      limit: "200",
    });
    expect(options.headers.Authorization).toBe("Bearer token-1");
  });

  it("omits empty date boundaries so the existing unfiltered report is preserved", async () => {
    await getPaidBreakdownReportAdmin("admin-1", "token-1", {
      hotelId: "hotel-1",
    });

    const [requestUrl] = global.fetch.mock.calls[0];
    const url = new URL(requestUrl);
    expect(url.searchParams.has("dateBy")).toBe(false);
    expect(url.searchParams.has("dateFrom")).toBe(false);
    expect(url.searchParams.has("dateTo")).toBe(false);
  });

  it("rejects a server validation error instead of replacing the report with a false empty result", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: "dateFrom must use the YYYY-MM-DD format",
      }),
    });

    try {
      await expect(
        getPaidBreakdownReportAdmin("admin-1", "token-1", {
          hotelId: "hotel-1",
          dateFrom: "invalid",
        }),
      ).rejects.toThrow("dateFrom must use the YYYY-MM-DD format");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("rejects an unreadable response instead of showing a false empty report", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockRejectedValue(new SyntaxError("Invalid JSON")),
    });

    try {
      await expect(
        getPaidBreakdownReportAdmin("admin-1", "token-1", {
          hotelId: "hotel-1",
        }),
      ).rejects.toThrow("Could not read the paid breakdown report response");
    } finally {
      consoleError.mockRestore();
    }
  });
});
