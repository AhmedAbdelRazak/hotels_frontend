import { isTerminalPendingQueueReservation } from "./overallShared";

describe("pending queue lifecycle guard", () => {
  it.each([
    "Cancelled",
    "canceled",
    "In House",
    "checked_in",
    "Checked Out",
    "early-checked-out",
    "closed",
  ])("hides %s even when stale workflow metadata exists", (status) => {
    expect(
      isTerminalPendingQueueReservation({
        reservation_status: status,
        pendingConfirmation: { status: "pending" },
      }),
    ).toBe(true);
  });

  it("keeps an active pending lifecycle row", () => {
    expect(
      isTerminalPendingQueueReservation({
        reservation_status: "Pending Finance Review",
      }),
    ).toBe(false);
  });
});
