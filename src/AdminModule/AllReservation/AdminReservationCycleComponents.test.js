import React from "react";
import { render } from "@testing-library/react";
import OverallPendingReservations from "../../HotelModule/TheOverallStructure/OverallReservationsList/OverallPendingReservations";
import OverallFinancialActions from "../../HotelModule/TheOverallStructure/OverallFinancials/OverallFinancialActions";
import {
  exportAdminPendingConfirmationReservations,
  getAdminPendingConfirmationReservations,
  getAdminPendingFinanceReservations,
} from "../apiAdmin";
import AdminPendingConfirmationReservations from "./AdminPendingConfirmationReservations";
import AdminPendingFinancialActions from "./AdminPendingFinancialActions";
import AdminReservationDetailsModal from "./AdminReservationDetailsModal";
import {
  pendingConfirmationQueryAdapter,
  pendingFinanceQueryAdapter,
} from "./adminReservationCycleQuery";

jest.mock(
  "../../HotelModule/TheOverallStructure/OverallReservationsList/OverallPendingReservations",
  () => jest.fn(() => null),
);
jest.mock(
  "../../HotelModule/TheOverallStructure/OverallFinancials/OverallFinancialActions",
  () => jest.fn(() => null),
);
jest.mock("../apiAdmin", () => ({
  exportAdminPendingConfirmationReservations: jest.fn(),
  getAdminPendingConfirmationReservations: jest.fn(),
  getAdminPendingFinanceReservations: jest.fn(),
}));
jest.mock("./AdminReservationDetailsModal", () => jest.fn(() => null));

beforeEach(() => {
  jest.clearAllMocks();
});

it("binds Pending Confirmation to the dedicated admin API, query state, theme, and MoreDetails modal", () => {
  render(
    <AdminPendingConfirmationReservations
      userId="admin-1"
      token="token-1"
      chosenLanguage="English"
    />,
  );

  expect(OverallPendingReservations).toHaveBeenCalledTimes(1);
  expect(OverallPendingReservations.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      confirmationOnly: true,
      adminTheme: true,
      reservationsLoader: getAdminPendingConfirmationReservations,
      reservationsExporter: exportAdminPendingConfirmationReservations,
      DetailsModalComponent: AdminReservationDetailsModal,
      queryStateAdapter: pendingConfirmationQueryAdapter,
    }),
  );
});

it("binds Pending Finance to the dedicated admin API, query state, theme, and MoreDetails modal", () => {
  render(
    <AdminPendingFinancialActions
      userId="admin-1"
      token="token-1"
      chosenLanguage="English"
    />,
  );

  expect(OverallFinancialActions).toHaveBeenCalledTimes(1);
  expect(OverallFinancialActions.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      adminTheme: true,
      actionsLoader: getAdminPendingFinanceReservations,
      actionsExporter: getAdminPendingFinanceReservations,
      DetailsModalComponent: AdminReservationDetailsModal,
      queryStateAdapter: pendingFinanceQueryAdapter,
    }),
  );
});
