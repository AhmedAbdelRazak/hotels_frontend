import {
  ADMIN_RESERVATION_CYCLE_TABS,
  buildAdminReservationCycleSearch,
  pendingConfirmationQueryAdapter,
  pendingFinanceQueryAdapter,
  readAdminReservationCycleTab,
} from "./adminReservationCycleQuery";

describe("admin reservation-cycle query", () => {
  it("defaults missing and invalid tabs to All Reservations", () => {
    expect(readAdminReservationCycleTab("?page=3")).toBe(
      ADMIN_RESERVATION_CYCLE_TABS.ALL,
    );
    expect(readAdminReservationCycleTab("?tab=unknown&page=3")).toBe(
      ADMIN_RESERVATION_CYCLE_TABS.ALL,
    );
  });

  it("reads both pending tabs from the URL", () => {
    expect(
      readAdminReservationCycleTab("?tab=pending-confirmation&page=2"),
    ).toBe(ADMIN_RESERVATION_CYCLE_TABS.PENDING_CONFIRMATION);
    expect(readAdminReservationCycleTab("?tab=pending-finance&page=2")).toBe(
      ADMIN_RESERVATION_CYCLE_TABS.PENDING_FINANCE,
    );
  });

  it("switches tabs once, resets pagination, and closes reservation details", () => {
    expect(
      buildAdminReservationCycleSearch(
        "?page=7&search=agoda&reservationId=abc",
        ADMIN_RESERVATION_CYCLE_TABS.PENDING_CONFIRMATION,
      ),
    ).toBe("?page=1&search=agoda&tab=pending-confirmation");
  });

  it("keeps the default route canonical without an unnecessary tab parameter", () => {
    expect(
      buildAdminReservationCycleSearch(
        "?tab=pending-finance&page=4",
        ADMIN_RESERVATION_CYCLE_TABS.ALL,
      ),
    ).toBe("?page=1");
  });
});

describe("admin reservation-cycle filter query state", () => {
  it("round-trips pending-confirmation hotel and table filters", () => {
    const search = pendingConfirmationQueryAdapter.write(
      "?tab=pending-confirmation&reservationId=reservation-1",
      {
        page: 2,
        filters: {
          search: "Agoda",
          hotelId: ["hotel-1", "hotel-2"],
          status: ["Pending Confirmation"],
          dateBy: "createdAt",
          dateFrom: "2026-07-01",
          dateTo: "2026-07-20",
          sortBy: "checkin_date",
          sortOrder: "desc",
        },
      },
    );

    expect(search).toContain("hotelId=hotel-1%2Chotel-2");
    expect(search).toContain("reservationId=reservation-1");
    expect(pendingConfirmationQueryAdapter.read(search, { filters: {} })).toEqual({
      page: 2,
      filters: {
        search: "Agoda",
        hotelId: ["hotel-1", "hotel-2"],
        status: ["Pending Confirmation"],
        dateBy: "createdAt",
        dateFrom: "2026-07-01",
        dateTo: "2026-07-20",
        sortBy: "checkin_date",
        sortOrder: "desc",
      },
    });
  });

  it("round-trips pending-finance hotel and internal tab without URL churn", () => {
    const state = {
      page: 3,
      activeFinanceTab: "wallets",
      filters: {
        hotelId: "hotel-9",
        bookingSource: "Agoda",
        agentId: "agent-4",
        actionType: "finance_review",
        dateBy: "booked_at",
        dateFrom: "",
        dateTo: "",
        commissionMonth: "2026-07",
      },
    };
    const first = pendingFinanceQueryAdapter.write("?tab=pending-finance", state);
    const restored = pendingFinanceQueryAdapter.read(first, { filters: {} });
    const second = pendingFinanceQueryAdapter.write(first, restored);

    expect(first).toContain("hotelId=hotel-9");
    expect(first).toContain("financeView=wallets");
    expect(restored).toEqual(state);
    expect(second).toBe(first);
  });
});
