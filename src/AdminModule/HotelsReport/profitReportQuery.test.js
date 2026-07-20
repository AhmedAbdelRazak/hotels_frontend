import {
  DEFAULT_PROFIT_FILTERS,
  DEFAULT_PROFIT_HOTEL_ID,
  readProfitReportQuery,
  writeProfitReportQuery,
} from "./profitReportQuery";

describe("Profit report query state", () => {
  it("defaults directly to Zad Ajyad when no hotel query exists", () => {
    expect(readProfitReportQuery("?tab=Profit")).toEqual({
      page: 1,
      filters: DEFAULT_PROFIT_FILTERS,
    });
    expect(DEFAULT_PROFIT_HOTEL_ID).toBe("6a40b6a1a6efe70450536038");
  });

  it("round-trips every applied Profit filter without changing the report tab", () => {
    const state = {
      page: 4,
      filters: {
        hotelId: "hotel-2",
        dateBy: "checkin_date",
        dateFrom: "2026-06-01",
        dateTo: "2026-07-20",
        granularity: "day",
        search: "Agoda 123",
        sortBy: "checkin_date",
        sortOrder: "asc",
      },
    };
    const first = writeProfitReportQuery("?tab=Profit", state);
    const restored = readProfitReportQuery(first);
    const second = writeProfitReportQuery(first, restored);

    expect(new URLSearchParams(first).get("tab")).toBe("Profit");
    expect(restored).toEqual(state);
    expect(second).toBe(first);
  });

  it("keeps All hotels as an explicit choice instead of resetting it to Zad Ajyad", () => {
    const search = writeProfitReportQuery("?tab=Profit", {
      page: 1,
      filters: { ...DEFAULT_PROFIT_FILTERS, hotelId: "" },
    });

    expect(new URLSearchParams(search).get("hotelId")).toBe("all");
    expect(readProfitReportQuery(search).filters.hotelId).toBe("");
  });

  it("falls back safely for malformed page and enum values", () => {
    const state = readProfitReportQuery(
      "?tab=Profit&page=-9&dateBy=bad&granularity=year&sortOrder=sideways",
    );

    expect(state.page).toBe(1);
    expect(state.filters.dateBy).toBe(DEFAULT_PROFIT_FILTERS.dateBy);
    expect(state.filters.granularity).toBe(DEFAULT_PROFIT_FILTERS.granularity);
    expect(state.filters.sortOrder).toBe(DEFAULT_PROFIT_FILTERS.sortOrder);
  });
});
