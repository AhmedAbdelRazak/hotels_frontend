import React from "react";
import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, useLocation } from "react-router-dom";
import { message } from "antd";
import * as XLSXStyle from "xlsx-js-style";
import ReconciliationReportAdmin, {
  buildReconciliationMutationReservations,
  readReconciliationQuery,
  validateReconciliationReportPage,
} from "./ReconciliationReportAdmin";
import {
  gettingHotelDetailsForAdminAll,
  getReconciliationReportAdmin,
  updateReconciliationStatusAdmin,
} from "../apiAdmin";
import { PAYMENT_BREAKDOWN_KEYS } from "./paymentReconciliation";

let mockCanUpdateReconciliation = true;

jest.mock("../../auth", () => ({
  isAuthenticated: () => ({ user: { _id: "admin-1" }, token: "token-1" }),
}));

jest.mock("../../cart_context", () => ({
  useCartContext: () => ({ chosenLanguage: "English" }),
}));

jest.mock("../utils/superUsers", () => ({
  isSuperAdminUser: () => mockCanUpdateReconciliation,
}));

jest.mock("../apiAdmin", () => ({
  gettingHotelDetailsForAdminAll: jest.fn(),
  getReconciliationReportAdmin: jest.fn(),
  updateReconciliationStatusAdmin: jest.fn(),
}));

jest.mock("./PaidReportDateControls", () => ({ value, onApply, disabled }) => (
  <div data-testid="date-controls" data-value={JSON.stringify(value)}>
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        onApply({
          dateBy: "checkout_date",
          dateFrom: "2026-08-01",
          dateTo: "2026-08-31",
          dateRanges: [],
        })
      }
    >
      Apply date
    </button>
  </div>
));

jest.mock("xlsx-js-style", () => {
  const xlsx = {
    utils: {
      aoa_to_sheet: jest.fn(() => ({ A1: {} })),
      encode_range: jest.fn(() => "A6:L8"),
      encode_cell: jest.fn(({ r, c }) => `${r}:${c}`),
      book_new: jest.fn(() => ({})),
      book_append_sheet: jest.fn(),
    },
    writeFile: jest.fn(),
  };
  return { __esModule: true, default: xlsx, ...xlsx };
});

jest.mock("antd", () => {
  const Select = ({
    "aria-label": ariaLabel,
    mode,
    disabled,
    onChange,
    options = [],
    placeholder,
    value,
  }) => (
    <select
      aria-label={ariaLabel || placeholder}
      multiple={mode === "multiple"}
      disabled={disabled}
      value={value || (mode === "multiple" ? [] : "")}
      onChange={(event) =>
        onChange?.(
          mode === "multiple"
            ? Array.from(event.target.selectedOptions).map(
                (option) => option.value,
              )
            : event.target.value,
        )
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
  return {
    Button: ({ children, disabled, onClick, className }) => (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={className}
      >
        {children}
      </button>
    ),
    Checkbox: ({
      checked,
      disabled,
      indeterminate,
      onChange,
      "aria-label": ariaLabel,
    }) => (
      <input
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        data-indeterminate={indeterminate ? "true" : "false"}
        onChange={onChange}
      />
    ),
    Input: (props) => <input {...props} />,
    Select,
    Spin: () => <div aria-label="Loading reconciliation report" />,
    message: {
      error: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
    },
  };
});

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
};

const row = ({
  id,
  cash,
  card,
  reconciledCash = false,
  confirmation = id,
}) => ({
  _id: id,
  __v: 3,
  updatedAt: "2026-08-14T00:00:00.000Z",
  confirmation_number: confirmation,
  customer_details: { name: `Guest ${id}` },
  booking_source: "Agoda",
  checkin_date: "2026-08-10T00:00:00.000Z",
  checkout_date: "2026-08-12T00:00:00.000Z",
  roomDetails: [{ room_number: "424" }],
  paid_amount_breakdown: {
    paid_at_hotel_cash: cash,
    paid_at_hotel_card: card,
  },
  reconciliation_by_breakdown: {
    paid_at_hotel_cash: {
      status: reconciledCash ? "reconciled" : "waiting",
      amountCents: Math.round(cash * 100),
    },
    paid_at_hotel_card: {
      status: "waiting",
      amountCents: Math.round(card * 100),
    },
  },
  ota_total_amount: 500,
  ota_total_available: true,
  pricing_breakdown_client_total: 480,
  pricing_breakdown_client_total_available: true,
});

const payload = ({ data, totalDocuments, page, limit = 1, scorecards }) => ({
  data,
  totalDocuments,
  page,
  limit,
  selectedPaymentBreakdownKeys: ["paid_at_hotel_cash", "paid_at_hotel_card"],
  reconciliationStatus: "all",
  ...(scorecards ? { scorecards } : {}),
});

beforeEach(() => {
  jest.clearAllMocks();
  XLSXStyle.utils.aoa_to_sheet.mockImplementation(() => ({ A1: {} }));
  XLSXStyle.utils.encode_range.mockImplementation(() => "A6:L8");
  XLSXStyle.utils.encode_cell.mockImplementation(({ r, c }) => `${r}:${c}`);
  XLSXStyle.utils.book_new.mockImplementation(() => ({}));
  mockCanUpdateReconciliation = true;
  gettingHotelDetailsForAdminAll.mockResolvedValue([
    { _id: "hotel-1", hotelName: "Test Hotel" },
  ]);
  const first = row({ id: "reservation-1", cash: 10.1, card: 20.2 });
  const second = row({
    id: "reservation-2",
    cash: 5.05,
    card: 0,
    reconciledCash: true,
  });
  getReconciliationReportAdmin
    .mockResolvedValueOnce(
      payload({
        data: [first],
        totalDocuments: 2,
        page: 1,
        scorecards: {
          totalAmountCents: 3535,
          reconciledAmountCents: 505,
          waitingAmountCents: 3030,
          reservationsCount: 2,
          reconciledReservationsCount: 1,
          waitingReservationsCount: 1,
        },
      }),
    )
    .mockResolvedValueOnce(
      payload({ data: [second], totalDocuments: 2, page: 2 }),
    );
  updateReconciliationStatusAdmin.mockResolvedValue({ updatedCount: 1 });
});

const DEFAULT_ENTRY =
  "/admin/overall-hotel-reports?tab=Profit&hotelId=hotel-1&dateBy=createdAt&dateFrom=2026-05-01&dateTo=&search=Needle&reconciliationMethods=paid_at_hotel_cash,paid_at_hotel_card&reconciliationStatus=all&page=3";

const renderReport = (entry = DEFAULT_ENTRY) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Route path="/admin/overall-hotel-reports">
        <ReconciliationReportAdmin />
        <LocationProbe />
      </Route>
    </MemoryRouter>,
  );

describe("ReconciliationReportAdmin", () => {
  it("restores the old Profit URL, fetches every validated page, and renders dynamic columns", async () => {
    renderReport();

    expect(await screen.findByText("Guest reservation-2")).toBeInTheDocument();
    expect(getReconciliationReportAdmin).toHaveBeenCalledTimes(2);
    expect(getReconciliationReportAdmin.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        hotelId: "hotel-1",
        searchQuery: "Needle",
        dateBy: "createdAt",
        dateFrom: "2026-05-01",
        paymentBreakdownKeys: ["paid_at_hotel_cash", "paid_at_hotel_card"],
        reconciliationStatus: "all",
        page: 1,
        limit: 500,
      }),
    );
    expect(getReconciliationReportAdmin.mock.calls[1][2].page).toBe(2);
    expect(
      getReconciliationReportAdmin.mock.calls[1][2].includeScorecards,
    ).toBe(false);
    expect(screen.getByText("Paid at Hotel (Cash) (SAR)")).toBeInTheDocument();
    expect(screen.getByText("Paid at Hotel (Card) (SAR)")).toBeInTheDocument();
    expect(screen.getByText("Total OTA amount (SAR)")).toBeInTheDocument();
    expect(screen.getByText("Price breakdown total (SAR)")).toBeInTheDocument();

    const params = new URLSearchParams(
      screen.getByTestId("location-search").textContent,
    );
    expect(params.get("tab")).toBe("reconciliation");
    expect(params.get("hotelId")).toBe("hotel-1");
    expect(params.get("reconciliationMethods")).toBe(
      "paid_at_hotel_cash,paid_at_hotel_card",
    );
    expect(params.get("reconciliationStatus")).toBe("all");
    expect(params.get("page")).toBe("1");
  });

  it("selects rows in exact cents and sends optimistic snapshot assertions", async () => {
    renderReport();
    await screen.findByText("Guest reservation-2");

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select all displayed reservations",
      }),
    );
    const selectedCountCard = screen
      .getByText("Selected reservations")
      .closest("div");
    expect(within(selectedCountCard).getByText("2")).toBeInTheDocument();
    const selectedAmountCard = screen
      .getByText("Selected amount (SAR)")
      .closest("div");
    expect(within(selectedAmountCard).getByText("35.35")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select reservation reservation-2",
      }),
    );
    expect(within(selectedAmountCard).getByText("30.30")).toBeInTheDocument();

    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
    );
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Mark selected as reconciled/ }),
      );
    });

    await waitFor(() =>
      expect(updateReconciliationStatusAdmin).toHaveBeenCalledTimes(1),
    );
    expect(updateReconciliationStatusAdmin.mock.calls[0][2]).toEqual({
      hotelId: "hotel-1",
      status: "reconciled",
      paymentBreakdownKeys: ["paid_at_hotel_cash", "paid_at_hotel_card"],
      reservations: [
        {
          reservationId: "reservation-1",
          __v: 3,
          updatedAt: "2026-08-14T00:00:00.000Z",
          displayedAmountsCents: {
            paid_at_hotel_cash: 1010,
            paid_at_hotel_card: 2020,
          },
        },
      ],
    });
  });

  it("shows both languages in every payment-method dropdown option", async () => {
    renderReport();
    await screen.findByText("Guest reservation-2");
    const methodSelect = screen.getByRole("listbox", {
      name: "Payment methods",
    });
    expect(methodSelect.options).toHaveLength(8);
    expect(methodSelect.options[1].textContent).toContain(
      "Paid at Hotel (Cash) (SAR)",
    );
    expect(methodSelect.options[1].textContent).toContain(
      "\u0645\u062f\u0641\u0648\u0639 \u0641\u064a \u0627\u0644\u0641\u0646\u062f\u0642",
    );
  });

  it("exports the full filtered table through a styled Excel workbook", async () => {
    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(screen.getByRole("button", { name: "Export to Excel" }));
    await waitFor(() => expect(XLSXStyle.writeFile).toHaveBeenCalledTimes(1));
    expect(XLSXStyle.utils.aoa_to_sheet).toHaveBeenCalledTimes(1);
    const exportedRows = XLSXStyle.utils.aoa_to_sheet.mock.calls[0][0];
    expect(exportedRows[5]).toEqual(
      expect.arrayContaining([
        "Total OTA amount (SAR)",
        "Price breakdown total (SAR)",
        "Paid at Hotel (Cash) (SAR)",
        "Reconciliation status",
      ]),
    );
    const worksheet = XLSXStyle.utils.aoa_to_sheet.mock.results[0].value;
    expect(worksheet.A1.s.fill.fgColor.rgb).toBe("0B4F71");
  });

  it("falls back to the first accessible active hotel before loading the report", async () => {
    renderReport(
      DEFAULT_ENTRY.replace("hotelId=hotel-1", "hotelId=inaccessible-hotel"),
    );
    await screen.findByText("Guest reservation-2");
    expect(getReconciliationReportAdmin.mock.calls[0][2].hotelId).toBe(
      "hotel-1",
    );
    const params = new URLSearchParams(
      screen.getByTestId("location-search").textContent,
    );
    expect(params.get("hotelId")).toBe("hotel-1");
  });

  it("applies the status filter through the API and URL", async () => {
    renderReport();
    await screen.findByText("Guest reservation-2");
    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Awaiting reconciliation" }),
    );

    await waitFor(() =>
      expect(getReconciliationReportAdmin).toHaveBeenCalledTimes(3),
    );
    expect(getReconciliationReportAdmin.mock.calls[2][2]).toEqual(
      expect.objectContaining({ reconciliationStatus: "waiting", page: 1 }),
    );
    await waitFor(() => {
      const params = new URLSearchParams(
        screen.getByTestId("location-search").textContent,
      );
      expect(params.get("reconciliationStatus")).toBe("waiting");
    });
  });

  it("refreshes after a 409 without presenting a stale update as successful", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderReport();
    await screen.findByText("Guest reservation-2");
    updateReconciliationStatusAdmin.mockRejectedValueOnce({
      status: 409,
      payload: { conflicts: [{ reservationId: "reservation-1" }] },
    });
    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select reservation reservation-1",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Mark selected as reconciled/ }),
    );

    try {
      await waitFor(() => expect(message.warning).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(getReconciliationReportAdmin).toHaveBeenCalledTimes(3),
      );
      expect(message.success).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("splits select-all mutations into bounded optimistic batches", async () => {
    const bulkRows = Array.from({ length: 101 }, (_, index) =>
      row({
        id: `bulk-${index + 1}`,
        cash: 1,
        card: 0,
        confirmation: `BULK-${index + 1}`,
      }),
    );
    getReconciliationReportAdmin
      .mockReset()
      .mockResolvedValueOnce(
        payload({
          data: bulkRows,
          totalDocuments: 101,
          page: 1,
          limit: 500,
          scorecards: {
            totalAmountCents: 10100,
            reconciledAmountCents: 0,
            waitingAmountCents: 10100,
            reservationsCount: 101,
            reconciledReservationsCount: 0,
            waitingReservationsCount: 101,
          },
        }),
      )
      .mockResolvedValueOnce(
        payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
      );
    updateReconciliationStatusAdmin
      .mockReset()
      .mockResolvedValueOnce({ updatedCount: 100, conflictCount: 0 })
      .mockResolvedValueOnce({ updatedCount: 1, conflictCount: 0 });
    renderReport();
    await screen.findByText("Guest bulk-101");
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select all displayed reservations",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Mark selected as reconciled/ }),
    );

    await waitFor(() =>
      expect(updateReconciliationStatusAdmin).toHaveBeenCalledTimes(2),
    );
    expect(
      updateReconciliationStatusAdmin.mock.calls[0][2].reservations,
    ).toHaveLength(100);
    expect(
      updateReconciliationStatusAdmin.mock.calls[1][2].reservations,
    ).toHaveLength(1);
    expect(
      updateReconciliationStatusAdmin.mock.calls[1][2].reservations[0],
    ).toEqual(
      expect.objectContaining({
        __v: 3,
        updatedAt: "2026-08-14T00:00:00.000Z",
        displayedAmountsCents: {
          paid_at_hotel_cash: 100,
          paid_at_hotel_card: 0,
        },
      }),
    );
  });

  it("keeps report filters and export available but locks mutations for other admins", async () => {
    mockCanUpdateReconciliation = false;
    renderReport();
    await screen.findByText("Guest reservation-2");
    expect(
      screen.getByText(
        "Only the configured super admin can change reconciliation status.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Select all displayed reservations",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Mark selected as reconciled/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Export to Excel" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("listbox", { name: "Payment methods" }),
    ).toBeEnabled();
  });
});

describe("reconciliation report guards", () => {
  it("defaults query status and all eight methods", () => {
    const parsed = readReconciliationQuery(
      "?tab=reconciliation",
      new Date("2026-08-14T12:00:00Z"),
    );
    expect(parsed.methods).toEqual(PAYMENT_BREAKDOWN_KEYS);
    expect(parsed.status).toBe("all");
  });

  it("rejects inconsistent pagination and builds exact displayed assertions", () => {
    expect(() =>
      validateReconciliationReportPage(
        { data: [], totalDocuments: 1, page: 2, limit: 500 },
        1,
      ),
    ).toThrow("Invalid or excessive reconciliation pagination metadata");

    expect(
      buildReconciliationMutationReservations(
        [row({ id: "reservation-1", cash: 0.1, card: 0.2 })],
        ["paid_at_hotel_cash", "paid_at_hotel_card"],
      ),
    ).toEqual([
      {
        reservationId: "reservation-1",
        __v: 3,
        updatedAt: "2026-08-14T00:00:00.000Z",
        displayedAmountsCents: {
          paid_at_hotel_cash: 10,
          paid_at_hotel_card: 20,
        },
      },
    ]);
  });
});
