import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import AllReservationMain from "./AllReservationMain";
import {
  distinctBookingSources,
  distinctReservedByList,
  getAllReservationForAdmin,
  gettingHotelDetailsForAdminAll,
  readUserId,
} from "../apiAdmin";

jest.mock("axios", () => ({ __esModule: true, default: {} }));
jest.mock("../../auth", () => ({
  isAuthenticated: () => ({ user: { _id: "admin-1" }, token: "token-1" }),
}));
jest.mock("../AdminNavbar/AdminNavbar", () => () => <nav>Admin nav</nav>);
jest.mock("../AdminNavbar/AdminNavbarArabic", () => () => <nav>Admin nav</nav>);
jest.mock("./EnhancedContentTable", () => () => (
  <div data-testid="all-reservations-panel">All reservations table</div>
));
jest.mock(
  "../../HotelModule/TheOverallStructure/OverallReservationsList/OverallPendingReservations",
  () => () => (
    <div data-testid="pending-confirmation-panel">
      Pending confirmation table
    </div>
  ),
);
jest.mock(
  "../../HotelModule/TheOverallStructure/OverallFinancials/OverallFinancialActions",
  () => () => (
    <div data-testid="pending-finance-panel">Pending finance table</div>
  ),
);
jest.mock("../apiAdmin", () => ({
  distinctBookingSources: jest.fn(),
  distinctReservedByList: jest.fn(),
  exportAdminPendingConfirmationReservations: jest.fn(),
  getAdminPendingConfirmationReservations: jest.fn(),
  getAdminPendingFinanceReservations: jest.fn(),
  getAllReservationForAdmin: jest.fn(),
  gettingHotelDetailsForAdminAll: jest.fn(),
  readUserId: jest.fn(),
}));

const renderRoute = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Route path="/admin/all-reservations">
        <AllReservationMain chosenLanguage="English" />
      </Route>
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  readUserId.mockResolvedValue({
    _id: "admin-1",
    name: "Reservation Admin",
    activeUser: true,
    accessTo: ["HotelsReservations"],
  });
  gettingHotelDetailsForAdminAll.mockResolvedValue({ hotels: [] });
  distinctReservedByList.mockResolvedValue([]);
  distinctBookingSources.mockResolvedValue([]);
  getAllReservationForAdmin.mockResolvedValue({
    success: true,
    data: [],
    totalDocuments: 0,
    scorecards: {},
  });
});

it("keeps All Reservations as the default tab and existing table", async () => {
  renderRoute("/admin/all-reservations?page=1");

  expect(
    await screen.findByTestId("all-reservations-panel"),
  ).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "All Reservations" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await waitFor(() =>
    expect(getAllReservationForAdmin).toHaveBeenCalledTimes(1),
  );
});

it("loads only the Pending Confirmation surface for its query tab", async () => {
  renderRoute("/admin/all-reservations?tab=pending-confirmation&page=2");

  expect(
    await screen.findByTestId("pending-confirmation-panel"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("tab", { name: "Pending Confirmation" }),
  ).toHaveAttribute("aria-selected", "true");
  await waitFor(() => expect(readUserId).toHaveBeenCalledTimes(1));
  expect(getAllReservationForAdmin).not.toHaveBeenCalled();
  expect(gettingHotelDetailsForAdminAll).not.toHaveBeenCalled();
});

it("loads only the Pending Finance surface for its query tab", async () => {
  renderRoute("/admin/all-reservations?tab=pending-finance&page=1");

  expect(
    await screen.findByTestId("pending-finance-panel"),
  ).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Pending Finance" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await waitFor(() => expect(readUserId).toHaveBeenCalledTimes(1));
  expect(getAllReservationForAdmin).not.toHaveBeenCalled();
  expect(distinctReservedByList).not.toHaveBeenCalled();
});
