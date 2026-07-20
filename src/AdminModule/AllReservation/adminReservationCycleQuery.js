export const ADMIN_RESERVATION_CYCLE_TABS = Object.freeze({
  ALL: "all-reservations",
  PENDING_CONFIRMATION: "pending-confirmation",
  PENDING_FINANCE: "pending-finance",
});

const VALID_TABS = new Set(Object.values(ADMIN_RESERVATION_CYCLE_TABS));

export const readAdminReservationCycleTab = (search = "") => {
  const requested = new URLSearchParams(search || "").get("tab") || "";
  return VALID_TABS.has(requested)
    ? requested
    : ADMIN_RESERVATION_CYCLE_TABS.ALL;
};

export const buildAdminReservationCycleSearch = (
  search = "",
  tab = ADMIN_RESERVATION_CYCLE_TABS.ALL,
) => {
  const params = new URLSearchParams(search || "");
  const safeTab = VALID_TABS.has(tab) ? tab : ADMIN_RESERVATION_CYCLE_TABS.ALL;

  if (safeTab === ADMIN_RESERVATION_CYCLE_TABS.ALL) {
    params.delete("tab");
  } else {
    params.set("tab", safeTab);
  }
  params.set("page", "1");
  params.delete("reservationId");

  const next = params.toString();
  return next ? `?${next}` : "";
};
