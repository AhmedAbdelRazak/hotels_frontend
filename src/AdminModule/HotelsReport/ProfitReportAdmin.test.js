import React from "react";
import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, useLocation } from "react-router-dom";
import ProfitReportAdmin, {
  buildProfitExportRows,
  profitMoneyText,
} from "./ProfitReportAdmin";
import { getOverallProfitReport } from "../apiAdmin";
import { DEFAULT_PROFIT_HOTEL_ID } from "./profitReportQuery";

jest.mock("react-apexcharts", () => () => <div data-testid="profit-chart" />);
jest.mock("../../auth", () => ({
  isAuthenticated: () => ({
    user: { _id: "admin-1", role: 1000 },
    token: "token-1",
  }),
}));
jest.mock("../../cart_context", () => ({
  useCartContext: () => ({ chosenLanguage: "English" }),
}));
jest.mock("../apiAdmin", () => ({
  exportOverallProfitReport: jest.fn(),
  getOverallProfitReport: jest.fn(),
}));
jest.mock("../AllReservation/MoreDetails", () => () => null);
jest.mock("../../HotelModule/apiAdmin", () => ({
  getHotelById: jest.fn(),
  singlePreReservationById: jest.fn(),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
};

const settleReport = async () => {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
};

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  getOverallProfitReport.mockResolvedValue({
    reservations: [],
    scorecards: {},
    timeline: { day: [], week: [], month: [] },
    bookingSources: [],
    hotels: [],
    allHotels: [{ _id: DEFAULT_PROFIT_HOTEL_ID, hotelName: "zad ajyad" }],
    total: 0,
    pages: 1,
  });
});

it("includes room type and assigned room number in profit exports", () => {
  const [row] = buildProfitExportRows({
    labels: {
      fullName: "Full Name",
      reportDate: "Report Date",
      confirmation: "Confirmation",
      checkIn: "Check In",
      checkOut: "Check Out",
      hotel: "Hotel",
      roomType: "Room Type",
      roomNumber: "Room Number",
      source: "Source",
      clientPaid: "Client Paid",
      hotelTotal: "Hotel Total",
      commission: "Commission",
      otaExpense: "OTA Expense",
      totalProfit: "Total Profit",
      profitRate: "Profit Rate",
    },
    rows: [
      {
        checkin_date: "2026-07-24T12:00:00.000Z",
        checkout_date: "2026-07-25T12:00:00.000Z",
        pickedRoomsType: [
          { room_type: "familyRooms", displayName: "Family Quintuple" },
        ],
        roomDetails: [{ room_number: "424", room_type: "familyRooms" }],
      },
    ],
  });

  expect(row["Room Type"]).toBe("Family Quintuple");
  expect(row["Room Number"]).toBe("424");
  expect(row["Check In"]).toBe("July 24, 2026");
  expect(row["Check Out"]).toBe("July 25, 2026");
});

it("exports and formats unverified HotelRunner commercial values as unavailable", () => {
  const labels = {
    fullName: "Full Name",
    reportDate: "Report Date",
    confirmation: "Confirmation",
    checkIn: "Check In",
    checkOut: "Check Out",
    hotel: "Hotel",
    roomType: "Room Type",
    roomNumber: "Room Number",
    source: "Source",
    clientPaid: "Client Paid",
    hotelTotal: "Hotel Total",
    commission: "Commission",
    otaExpense: "OTA Expense",
    totalProfit: "Total Profit",
    profitRate: "Profit Rate",
    unavailable: "Unavailable",
    sar: "SAR",
  };
  const [row] = buildProfitExportRows({
    labels,
    rows: [
      {
        profitMetrics: {
          clientTotal: 1000,
          hotelTotal: 0,
          hotelTotalAvailable: false,
          commission: 0,
          commissionAvailable: false,
          otaExpense: 0,
          otaExpenseAvailable: false,
          profitMargin: 0,
          profitAvailable: false,
        },
      },
    ],
  });

  expect(row["Client Paid"]).toBe(1000);
  expect(row["Hotel Total"]).toBe("Unavailable");
  expect(row["Commission"]).toBe("Unavailable");
  expect(row["OTA Expense"]).toBe("Unavailable");
  expect(row["Total Profit"]).toBe("Unavailable");
  expect(profitMoneyText(0, false, labels)).toBe("Unavailable");
  expect(profitMoneyText(850, true, labels)).toBe("850.00 SAR");
});

it("shows a coverage notice and avoids presenting missing HotelRunner values as zero", async () => {
  getOverallProfitReport.mockResolvedValueOnce({
    reservations: [
      {
        _id: "reservation-1",
        confirmation_number: "HR-1",
        booking_source: "Trip.com",
        profitMetrics: {
          clientTotal: 1000,
          hotelTotal: 0,
          hotelTotalAvailable: false,
          commission: 0,
          commissionAvailable: false,
          otaExpense: 0,
          otaExpenseAvailable: false,
          profitMargin: 0,
          profitAvailable: false,
        },
      },
    ],
    scorecards: {
      reservationsCount: 1,
      clientTotal: 1000,
      hotelTotal: 0,
      commission: 0,
      otaExpense: 0,
      profitMargin: 0,
      hotelTotalUnavailableCount: 1,
      commissionUnavailableCount: 1,
      otaExpenseUnavailableCount: 1,
      profitUnavailableCount: 1,
      commercialUnavailableCount: 1,
    },
    timeline: { day: [], week: [], month: [] },
    bookingSources: [],
    hotels: [],
    allHotels: [{ _id: DEFAULT_PROFIT_HOTEL_ID, hotelName: "zad ajyad" }],
    total: 1,
    pages: 1,
  });

  render(
    <MemoryRouter initialEntries={["/admin/overall-hotel-reports?tab=Profit"]}>
      <Route path="/admin/overall-hotel-reports">
        <ProfitReportAdmin />
      </Route>
    </MemoryRouter>,
  );
  await settleReport();

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Verified HotelRunner commercial data is incomplete for 1 reservation",
  );
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  expect(
    screen.getByLabelText("Client paid / total: 1,000.00 SAR"),
  ).toBeInTheDocument();
});

it("loads Zad Ajyad once and applies a UI filter without a request loop", async () => {
  render(
    <MemoryRouter initialEntries={["/admin/overall-hotel-reports?tab=Profit"]}>
      <Route path="/admin/overall-hotel-reports">
        <ProfitReportAdmin />
        <LocationProbe />
      </Route>
    </MemoryRouter>,
  );

  await settleReport();

  await waitFor(() => expect(getOverallProfitReport).toHaveBeenCalledTimes(1));
  expect(getOverallProfitReport.mock.calls[0][2]).toEqual(
    expect.objectContaining({
      hotelId: DEFAULT_PROFIT_HOTEL_ID,
      dateBy: "createdAt",
      dateFrom: "2026-05-01",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
    }),
  );

  await waitFor(() => {
    const params = new URLSearchParams(
      screen.getByTestId("location-search").textContent,
    );
    expect(params.get("hotelId")).toBe(DEFAULT_PROFIT_HOTEL_ID);
    expect(params.get("dateBy")).toBe("createdAt");
    expect(params.get("dateFrom")).toBe("2026-05-01");
    expect(params.get("granularity")).toBe("week");
    expect(params.get("sortBy")).toBe("createdAt");
    expect(params.get("sortOrder")).toBe("desc");
    expect(params.get("page")).toBe("1");
  });

  expect(getOverallProfitReport).toHaveBeenCalledTimes(1);

  fireEvent.change(
    screen.getByPlaceholderText("Search guest, confirmation, hotel, or source"),
    { target: { value: "Agoda" } },
  );
  expect(getOverallProfitReport).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: /Search/ }));
  await settleReport();

  expect(getOverallProfitReport).toHaveBeenCalledTimes(2);
  expect(getOverallProfitReport.mock.calls[1][2]).toEqual(
    expect.objectContaining({
      hotelId: DEFAULT_PROFIT_HOTEL_ID,
      search: "Agoda",
      page: 1,
    }),
  );
  expect(
    new URLSearchParams(screen.getByTestId("location-search").textContent).get(
      "search",
    ),
  ).toBe("Agoda");
});

it("restores URL filters in one request without rewriting them", async () => {
  const entry =
    "/admin/overall-hotel-reports?tab=Profit&hotelId=hotel-2&dateBy=checkout_date&dateFrom=&dateTo=2026-07-20&granularity=month&search=Agoda&sortBy=checkout_date&sortOrder=asc&page=3";
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Route path="/admin/overall-hotel-reports">
        <ProfitReportAdmin />
        <LocationProbe />
      </Route>
    </MemoryRouter>,
  );

  await settleReport();

  await waitFor(() => expect(getOverallProfitReport).toHaveBeenCalledTimes(1));
  expect(getOverallProfitReport.mock.calls[0][2]).toEqual(
    expect.objectContaining({
      hotelId: "hotel-2",
      dateBy: "checkout_date",
      dateFrom: "",
      dateTo: "2026-07-20",
      search: "Agoda",
      sortBy: "checkout_date",
      sortOrder: "asc",
      page: 3,
    }),
  );
  expect(screen.getByTestId("location-search")).toHaveTextContent(
    "hotelId=hotel-2",
  );
  expect(getOverallProfitReport).toHaveBeenCalledTimes(1);
});
