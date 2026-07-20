import {
  ADMIN_RESERVATION_CYCLE_TABS,
  buildAdminReservationCycleSearch,
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
