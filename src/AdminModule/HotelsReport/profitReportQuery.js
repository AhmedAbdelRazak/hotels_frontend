export const DEFAULT_PROFIT_HOTEL_ID = "6a40b6a1a6efe70450536038";
export const DEFAULT_PROFIT_FROM = "2026-05-01";

export const DEFAULT_PROFIT_FILTERS = Object.freeze({
  hotelId: DEFAULT_PROFIT_HOTEL_ID,
  dateBy: "createdAt",
  dateFrom: DEFAULT_PROFIT_FROM,
  dateTo: "",
  granularity: "week",
  search: "",
  sortBy: "createdAt",
  sortOrder: "desc",
});

const DATE_BY_VALUES = new Set(["createdAt", "checkin_date", "checkout_date"]);
const GRANULARITY_VALUES = new Set(["day", "week", "month"]);
const SORT_ORDER_VALUES = new Set(["asc", "desc"]);

const clean = (value) => String(value || "").trim();
const pageNumber = (value) => Math.max(parseInt(value, 10) || 1, 1);
const enumValue = (value, allowed, fallback) => {
  const normalized = clean(value);
  return allowed.has(normalized) ? normalized : fallback;
};
const queryValue = (params, key, fallback) =>
  params.has(key) ? clean(params.get(key)) : fallback;

export const readProfitReportQuery = (search = "") => {
  const params = new URLSearchParams(search || "");
  const requestedHotel = queryValue(
    params,
    "hotelId",
    DEFAULT_PROFIT_FILTERS.hotelId,
  );

  return {
    page: pageNumber(params.get("page")),
    filters: {
      hotelId:
        requestedHotel.toLowerCase() === "all"
          ? ""
          : requestedHotel || DEFAULT_PROFIT_FILTERS.hotelId,
      dateBy: enumValue(
        params.get("dateBy"),
        DATE_BY_VALUES,
        DEFAULT_PROFIT_FILTERS.dateBy,
      ),
      dateFrom: queryValue(
        params,
        "dateFrom",
        DEFAULT_PROFIT_FILTERS.dateFrom,
      ),
      dateTo: queryValue(params, "dateTo", DEFAULT_PROFIT_FILTERS.dateTo),
      granularity: enumValue(
        params.get("granularity"),
        GRANULARITY_VALUES,
        DEFAULT_PROFIT_FILTERS.granularity,
      ),
      search: queryValue(params, "search", DEFAULT_PROFIT_FILTERS.search),
      sortBy: queryValue(params, "sortBy", DEFAULT_PROFIT_FILTERS.sortBy),
      sortOrder: enumValue(
        params.get("sortOrder"),
        SORT_ORDER_VALUES,
        DEFAULT_PROFIT_FILTERS.sortOrder,
      ),
    },
  };
};

export const writeProfitReportQuery = (search = "", state = {}) => {
  const params = new URLSearchParams(search || "");
  const filters = { ...DEFAULT_PROFIT_FILTERS, ...(state.filters || {}) };

  params.set("hotelId", clean(filters.hotelId) || "all");
  params.set("dateBy", filters.dateBy);
  params.set("dateFrom", clean(filters.dateFrom));
  params.set("dateTo", clean(filters.dateTo));
  params.set("granularity", filters.granularity);
  params.set("search", clean(filters.search));
  params.set("sortBy", filters.sortBy);
  params.set("sortOrder", filters.sortOrder);
  params.set("page", String(pageNumber(state.page)));

  return `?${params.toString()}`;
};
