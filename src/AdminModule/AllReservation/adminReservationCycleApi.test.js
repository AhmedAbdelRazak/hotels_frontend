jest.mock("axios", () => ({
  __esModule: true,
  default: {},
}));

import {
  exportAdminPendingConfirmationReservations,
  getAdminPendingConfirmationReservations,
  getAdminPendingFinanceReservations,
} from "../apiAdmin";

describe("admin reservation-cycle API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ reservations: [], total: 0 }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it.each([
    [
      getAdminPendingConfirmationReservations,
      "/admin/reservation-cycle/pending-confirmations/admin-1",
    ],
    [
      exportAdminPendingConfirmationReservations,
      "/admin/reservation-cycle/pending-confirmations-export/admin-1",
    ],
    [
      getAdminPendingFinanceReservations,
      "/admin/reservation-cycle/pending-finance/admin-1",
    ],
  ])("uses the dedicated protected admin endpoint", async (request, path) => {
    await request("admin-1", "token-1", {
      page: 2,
      hotelId: ["hotel-a", "hotel-b"],
      empty: "",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain(path);
    expect(url).toContain("page=2");
    expect(url).toContain("hotelId=hotel-a%2Chotel-b");
    expect(url).not.toContain("empty=");
    expect(options.method).toBe("GET");
    expect(options.cache).toBe("no-store");
    expect(options.headers.Authorization).toBe("Bearer token-1");
  });

  it("returns a stable empty payload when the request cannot be made", async () => {
    global.fetch.mockRejectedValueOnce(new Error("network unavailable"));
    await expect(
      getAdminPendingFinanceReservations("admin-1", "token-1"),
    ).resolves.toMatchObject({
      error: "network unavailable",
      reservations: [],
      total: 0,
    });
  });
});
