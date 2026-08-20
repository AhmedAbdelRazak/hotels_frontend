import {
  gettingHotelDetailsForAdminAll,
  getReconciliationClosestMatchAdmin,
  getReconciliationReportAdmin,
  updateReconciliationStatusAdmin,
} from "../apiAdmin";

jest.mock("axios", () => ({}));

describe("admin reconciliation API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.REACT_APP_API_URL = "https://api.example.test/api";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("serializes all reconciliation report filters without losing date ranges", async () => {
    const controller = new AbortController();
    await getReconciliationReportAdmin(
      "admin-1",
      "token-1",
      {
        hotelId: "hotel-1",
        searchQuery: "CONF-20",
        dateBy: "checkout_date",
        dateRanges: [
          { dateFrom: "2026-08-01", dateTo: "2026-08-07" },
          { dateFrom: "2026-07-01", dateTo: "2026-07-31" },
        ],
        paymentBreakdownKeys: ["paid_at_hotel_cash", "paid_at_hotel_card"],
        reconciliationStatus: "waiting",
        breakdownUpdated: "last_7_days",
        includeScorecards: false,
        page: 2,
        limit: 500,
      },
      { signal: controller.signal },
    );

    const [requestUrl, options] = global.fetch.mock.calls[0];
    const url = new URL(requestUrl);
    expect(url.pathname).toBe("/api/reconciliation/report/admin-1");
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      hotelId: "hotel-1",
      searchQuery: "CONF-20",
      dateBy: "checkout_date",
      dateRanges: "2026-07-01..2026-07-31,2026-08-01..2026-08-07",
      paymentBreakdownKeys: "paid_at_hotel_cash,paid_at_hotel_card",
      reconciliationStatus: "waiting",
      breakdownUpdated: "last_7_days",
      includeScorecards: "false",
      page: "2",
      limit: "500",
    });
    expect(options).toEqual(
      expect.objectContaining({
        method: "GET",
        signal: controller.signal,
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
        }),
      }),
    );
  });

  it("passes an optional abort signal through accessible-hotel bootstrap", async () => {
    const controller = new AbortController();
    await gettingHotelDetailsForAdminAll("admin-1", "token-1", "summary=true", {
      signal: controller.signal,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/all/hotel-details/admin/admin-1?summary=true",
      expect.objectContaining({
        signal: controller.signal,
        headers: { Authorization: "Bearer token-1" },
      }),
    );
  });

  it("sends exact assertions in multipart payload JSON and an optional attachment", async () => {
    const attachment = new File(["receipt"], "receipt.pdf", {
      type: "application/pdf",
    });
    const payload = {
      hotelId: "hotel-1",
      action: "reconcile",
      paymentBreakdownKeys: ["paid_at_hotel_cash"],
      expectedActionAmountCents: 728500,
      payoutPurpose: "paid_out_to_zad",
      reservations: [
        {
          reservationId: "reservation-1",
          __v: 7,
          updatedAt: "2026-08-14T00:00:00.000Z",
          displayedAmountsCents: { paid_at_hotel_cash: 728500 },
        },
      ],
      attachment,
    };

    await updateReconciliationStatusAdmin("admin-1", "token-1", payload);

    const [requestUrl, options] = global.fetch.mock.calls[0];
    expect(new URL(requestUrl).pathname).toBe(
      "/api/reconciliation/status/admin-1",
    );
    expect(options.method).toBe("PATCH");
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.body).toBeInstanceOf(FormData);
    expect(JSON.parse(options.body.get("payload"))).toEqual({
      ...payload,
      attachment: undefined,
    });
    expect(options.body.get("attachment")).toBe(attachment);
  });

  it("posts the exact closest-match scope without mutating reservations", async () => {
    const controller = new AbortController();
    const payload = {
      hotelId: "hotel-1",
      paymentBreakdownKey: "paid_at_hotel_cash",
      targetAmountCents: 2000000,
      dateBy: "checkin_date",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      dateRanges: [],
      searchQuery: "",
    };
    await getReconciliationClosestMatchAdmin("admin-1", "token-1", payload, {
      signal: controller.signal,
    });
    const [requestUrl, options] = global.fetch.mock.calls[0];
    expect(new URL(requestUrl).pathname).toBe(
      "/api/reconciliation/closest-match/admin-1",
    );
    expect(options).toEqual(
      expect.objectContaining({
        method: "POST",
        signal: controller.signal,
      }),
    );
    expect(JSON.parse(options.body)).toEqual({ ...payload, dateRanges: "" });
  });

  it("surfaces conflict payloads for a safe refresh", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: jest.fn().mockResolvedValue({
        error: "Reservation changed",
        conflicts: [{ reservationId: "reservation-1" }],
      }),
    });

    await expect(
      updateReconciliationStatusAdmin("admin-1", "token-1", {}),
    ).rejects.toMatchObject({
      message: "Reservation changed",
      status: 409,
      payload: expect.objectContaining({ conflicts: expect.any(Array) }),
    });
  });
});
