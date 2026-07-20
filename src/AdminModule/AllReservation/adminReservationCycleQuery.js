export const ADMIN_RESERVATION_CYCLE_TABS = Object.freeze({
  ALL: "all-reservations",
  PENDING_CONFIRMATION: "pending-confirmation",
  PENDING_FINANCE: "pending-finance",
});

const VALID_TABS = new Set(Object.values(ADMIN_RESERVATION_CYCLE_TABS));
const VALID_FINANCE_VIEWS = new Set(["reservations", "commissions", "wallets"]);

const readList = (params, key, fallback = []) => {
  if (!params.has(key)) return fallback;
  return (params.get(key) || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const readValue = (params, key, fallback = "") =>
  params.has(key) ? params.get(key) || "" : fallback;

const setValue = (params, key, value) => {
  const normalized = Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean).join(",")
    : String(value || "").trim();
  if (normalized) params.set(key, normalized);
  else params.delete(key);
};

const normalizedPage = (value) => Math.max(Number(value) || 1, 1);

const searchString = (params) => {
  const next = params.toString();
  return next ? `?${next}` : "";
};

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

export const pendingConfirmationQueryAdapter = Object.freeze({
  read(search = "", defaults = {}) {
    const params = new URLSearchParams(search || "");
    const fallback = defaults.filters || {};
    return {
      page: normalizedPage(params.get("page")),
      filters: {
        ...fallback,
        search: readValue(params, "search", fallback.search),
        hotelId: readList(params, "hotelId", fallback.hotelId),
        status: readList(params, "status", fallback.status),
        dateBy: readValue(params, "dateBy", fallback.dateBy),
        dateFrom: readValue(params, "dateFrom", fallback.dateFrom),
        dateTo: readValue(params, "dateTo", fallback.dateTo),
        sortBy: readValue(params, "sortBy", fallback.sortBy),
        sortOrder: readValue(params, "sortOrder", fallback.sortOrder),
      },
    };
  },
  write(search = "", state = {}) {
    const params = new URLSearchParams(search || "");
    const filters = state.filters || {};
    params.set("page", String(normalizedPage(state.page)));
    [
      "search",
      "hotelId",
      "status",
      "dateBy",
      "dateFrom",
      "dateTo",
      "sortBy",
      "sortOrder",
    ].forEach((key) => setValue(params, key, filters[key]));
    return searchString(params);
  },
});

export const pendingFinanceQueryAdapter = Object.freeze({
  read(search = "", defaults = {}) {
    const params = new URLSearchParams(search || "");
    const fallback = defaults.filters || {};
    const requestedView = readValue(
      params,
      "financeView",
      defaults.activeFinanceTab || "reservations",
    );
    return {
      page: normalizedPage(params.get("page")),
      activeFinanceTab: VALID_FINANCE_VIEWS.has(requestedView)
        ? requestedView
        : "reservations",
      filters: {
        ...fallback,
        hotelId: readValue(params, "hotelId", fallback.hotelId),
        bookingSource: readValue(
          params,
          "bookingSource",
          fallback.bookingSource,
        ),
        agentId: readValue(params, "agentId", fallback.agentId),
        actionType: readValue(params, "actionType", fallback.actionType),
        dateBy: readValue(params, "dateBy", fallback.dateBy),
        dateFrom: readValue(params, "dateFrom", fallback.dateFrom),
        dateTo: readValue(params, "dateTo", fallback.dateTo),
        commissionMonth: readValue(
          params,
          "commissionMonth",
          fallback.commissionMonth,
        ),
      },
    };
  },
  write(search = "", state = {}) {
    const params = new URLSearchParams(search || "");
    const filters = state.filters || {};
    params.set("page", String(normalizedPage(state.page)));
    [
      "hotelId",
      "bookingSource",
      "agentId",
      "actionType",
      "dateBy",
      "dateFrom",
      "dateTo",
      "commissionMonth",
    ].forEach((key) => setValue(params, key, filters[key]));
    setValue(
      params,
      "financeView",
      state.activeFinanceTab === "reservations" ? "" : state.activeFinanceTab,
    );
    return searchString(params);
  },
});
