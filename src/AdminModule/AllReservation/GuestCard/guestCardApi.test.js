import {
  emailAdminReservationGuestCard,
  getAdminReservationGuestCard,
} from "../../apiAdmin";

jest.mock("axios", () => ({}));

describe("admin Guest Card API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    process.env.REACT_APP_API_URL = "https://api.example.test/api";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true, card: {} }),
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("loads only the protected reservation card resource", async () => {
    await getAdminReservationGuestCard("reservation 1", "admin 1", "token-1");
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(
      "https://api.example.test/api/admin/reservations/reservation%201/guest-card/admin%201",
    );
    expect(options.method).toBe("GET");
    expect(options.headers.Authorization).toBe("Bearer token-1");
    expect(options.cache).toBe("no-store");
  });

  it("sends only the editable recipient email", async () => {
    await emailAdminReservationGuestCard(
      "reservation-1",
      "admin-1",
      "token-1",
      " guest@example.com ",
    );
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(
      "https://api.example.test/api/admin/reservations/reservation-1/guest-card/email/admin-1",
    );
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      recipientEmail: "guest@example.com",
    });
    expect(Object.keys(JSON.parse(options.body))).toEqual(["recipientEmail"]);
  });

  it("does not call the network without route identifiers", async () => {
    const response = await getAdminReservationGuestCard(
      "",
      "admin-1",
      "token-1",
    );
    expect(response.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("aborts a stalled response body instead of leaving the modal loading", async () => {
    jest.useFakeTimers();
    try {
      let signal;
      global.fetch.mockImplementationOnce((_url, options) => {
        signal = options.signal;
        return Promise.resolve({
          ok: true,
          json: jest.fn(() => new Promise(() => {})),
        });
      });
      const request = getAdminReservationGuestCard(
        "reservation-1",
        "admin-1",
        "token-1",
      );
      await Promise.resolve();
      expect(signal.aborted).toBe(false);
      jest.advanceTimersByTime(20_000);
      const response = await request;
      expect(signal.aborted).toBe(true);
      expect(response.success).toBe(false);
      expect(response.error).toMatch(/timed out|cancelled/i);
    } finally {
      jest.useRealTimers();
    }
  });
});
