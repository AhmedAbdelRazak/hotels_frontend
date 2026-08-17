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
  CLOSEST_REQUEST_DEADLINE_MS,
  HOTEL_BOOTSTRAP_DEADLINE_MS,
  MUTATION_REQUEST_DEADLINE_MS,
  REPORT_REQUEST_DEADLINE_MS,
  buildReconciliationMutationReservations,
  parsePositiveSarCents,
  readReconciliationQuery,
  sortReconciliationRows,
  validateClosestMatchProposal,
  validateReconciliationReportPage,
  validateReconciliationMutationSuccess,
} from "./ReconciliationReportAdmin";
import {
  gettingHotelDetailsForAdminAll,
  getAdminReservationById,
  getReconciliationClosestMatchAdmin,
  getReconciliationReportAdmin,
  updateReconciliationStatusAdmin,
} from "../apiAdmin";
import { PAYMENT_BREAKDOWN_KEYS } from "./paymentReconciliation";

let mockCanUpdateReconciliation = true;
let mockLanguage = "English";

jest.mock("../../auth", () => ({
  isAuthenticated: () => ({ user: { _id: "admin-1" }, token: "token-1" }),
}));

jest.mock("../../cart_context", () => ({
  useCartContext: () => ({ chosenLanguage: mockLanguage }),
}));

jest.mock(
  "../AllReservation/MoreDetails",
  () =>
    ({ reservation, onReservationUpdated }) => (
      <div data-testid="more-details">
        Full details {reservation?.confirmation_number}
        <button
          type="button"
          onClick={() => onReservationUpdated?.({ ...reservation, __v: 99 })}
        >
          Simulate reservation update
        </button>
      </div>
    ),
);

jest.mock("../utils/superUsers", () => ({
  isSuperAdminUser: () => mockCanUpdateReconciliation,
}));

jest.mock("../apiAdmin", () => ({
  gettingHotelDetailsForAdminAll: jest.fn(),
  getAdminReservationById: jest.fn(),
  getReconciliationClosestMatchAdmin: jest.fn(),
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
    Button: ({
      children,
      disabled,
      onClick,
      className,
      "aria-pressed": pressed,
    }) => (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={className}
        aria-pressed={pressed}
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
    Modal: ({ children, open, title }) =>
      open ? (
        <div
          role="dialog"
          aria-label={typeof title === "string" ? title : undefined}
        >
          {title ? <h2>{title}</h2> : null}
          {children}
        </div>
      ) : null,
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
  reconciledCard = false,
  storedCash = reconciledCash,
  storedCard = reconciledCard,
  confirmation = id,
  checkin = "2026-08-10T00:00:00.000Z",
  checkout = "2026-08-12T00:00:00.000Z",
  reservationStatus = "confirmed",
}) => ({
  _id: id,
  __v: 3,
  updatedAt: "2026-08-14T00:00:00.000Z",
  confirmation_number: confirmation,
  customer_details: { name: `Guest ${id}` },
  booking_source: "Agoda",
  reservation_status: reservationStatus,
  checkin_date: checkin,
  checkout_date: checkout,
  roomDetails: [{ room_number: "424" }],
  paid_amount_breakdown: {
    paid_at_hotel_cash: cash,
    paid_at_hotel_card: card,
  },
  reconciliation_by_breakdown: {
    paid_at_hotel_cash: {
      status: reconciledCash ? "reconciled" : "waiting",
      amountCents: Math.round(cash * 100),
      hasStoredEntry: storedCash,
    },
    paid_at_hotel_card: {
      status: reconciledCard ? "reconciled" : "waiting",
      amountCents: Math.round(card * 100),
      hasStoredEntry: storedCard,
    },
  },
  ota_total_amount: 500,
  ota_total_available: true,
  pricing_breakdown_client_total: 480,
  pricing_breakdown_client_total_available: true,
});

const payload = ({
  data,
  totalDocuments,
  page,
  limit = 1,
  scorecards,
  selectedPaymentBreakdownKeys = ["paid_at_hotel_cash"],
  reconciliationStatus = "waiting",
}) => ({
  data,
  totalDocuments,
  page,
  limit,
  selectedPaymentBreakdownKeys,
  reconciliationStatus,
  ...(scorecards ? { scorecards } : {}),
});

beforeEach(() => {
  jest.clearAllMocks();
  XLSXStyle.utils.aoa_to_sheet.mockImplementation(() => ({ A1: {} }));
  XLSXStyle.utils.encode_range.mockImplementation(() => "A6:L8");
  XLSXStyle.utils.encode_cell.mockImplementation(({ r, c }) => `${r}:${c}`);
  XLSXStyle.utils.book_new.mockImplementation(() => ({}));
  mockCanUpdateReconciliation = true;
  mockLanguage = "English";
  gettingHotelDetailsForAdminAll.mockResolvedValue([
    { _id: "hotel-1", hotelName: "Test Hotel" },
  ]);
  const first = row({ id: "reservation-1", cash: 10.1, card: 20.2 });
  const second = row({
    id: "reservation-2",
    cash: 5.05,
    card: 0,
    reconciledCash: false,
  });
  getReconciliationReportAdmin
    .mockResolvedValueOnce(
      payload({
        data: [first],
        totalDocuments: 2,
        page: 1,
        scorecards: {
          totalAmountCents: 1515,
          reconciledAmountCents: 0,
          waitingAmountCents: 1515,
          reservationsCount: 2,
          reconciledReservationsCount: 0,
          waitingReservationsCount: 2,
        },
      }),
    )
    .mockResolvedValueOnce(
      payload({ data: [second], totalDocuments: 2, page: 2 }),
    );
  updateReconciliationStatusAdmin.mockImplementation(
    (_userId, _token, request) => ({
      success: true,
      code: "reconciliation_updated",
      action: request.action,
      paymentBreakdownKeys: request.paymentBreakdownKeys,
      plannedActionAmountCents: request.expectedActionAmountCents,
      appliedActionAmountCents: request.expectedActionAmountCents,
      updatedCount: request.reservations.length,
      updated: request.reservations.map((item) => item.reservationId),
      conflictCount: 0,
      conflicts: [],
    }),
  );
  getAdminReservationById.mockResolvedValue({
    ...first,
    hotelId: { _id: "hotel-1", hotelName: "Test Hotel" },
    fullReservation: true,
  });
  getReconciliationClosestMatchAdmin.mockResolvedValue({
    code: "reconciliation_closest_match",
    hotelId: "hotel-1",
    paymentBreakdownKey: "paid_at_hotel_cash",
    targetAmountCents: 1010,
    matchedAmountCents: 1010,
    differenceCents: 0,
    direction: "exact",
    exactMatch: true,
    optimalityGuaranteed: true,
    resolutionCents: 1,
    candidateCount: 2,
    selectedCount: 1,
    elapsedMs: 5,
    timedOut: false,
    selectionLimitExceeded: false,
    data: [first],
    reservations: buildReconciliationMutationReservations(
      [first],
      ["paid_at_hotel_cash"],
    ),
  });
});

const DEFAULT_ENTRY =
  "/admin/overall-hotel-reports?tab=Profit&hotelId=hotel-1&dateBy=createdAt&dateFrom=2026-05-01&dateTo=&search=Needle&reconciliationMethods=paid_at_hotel_cash,paid_at_hotel_card&reconciliationStatus=all&page=3&granularity=week&sortBy=createdAt&sortOrder=desc";

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
  it("replaces stale URL filters with fresh defaults, fetches every page, sorts ascending, and renders the cash column", async () => {
    renderReport();

    expect(await screen.findByText("Guest reservation-2")).toBeInTheDocument();
    expect(getReconciliationReportAdmin).toHaveBeenCalledTimes(2);
    expect(getReconciliationReportAdmin.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        hotelId: "hotel-1",
        searchQuery: "Needle",
        dateBy: "checkin_date",
        paymentBreakdownKeys: ["paid_at_hotel_cash"],
        reconciliationStatus: "waiting",
        page: 1,
        limit: 500,
      }),
    );
    expect(getReconciliationReportAdmin.mock.calls[1][2].page).toBe(2);
    expect(
      getReconciliationReportAdmin.mock.calls[1][2].includeScorecards,
    ).toBe(false);
    expect(screen.getByText("Paid at Hotel (Cash) (SAR)")).toBeInTheDocument();
    expect(
      screen.queryByText("Paid at Hotel (Card) (SAR)"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Total OTA amount (SAR)")).toBeInTheDocument();
    expect(screen.getByText("Price breakdown total (SAR)")).toBeInTheDocument();
    expect(screen.getByText("Check-in")).toBeInTheDocument();
    expect(screen.getByText("Check-out")).toBeInTheDocument();
    const guestRows = screen
      .getAllByText(/Guest reservation-/)
      .map((cell) => cell.closest("tr").textContent);
    expect(guestRows[0]).toContain("reservation-1");

    const params = new URLSearchParams(
      screen.getByTestId("location-search").textContent,
    );
    expect(params.get("tab")).toBe("reconciliation");
    expect(params.get("hotelId")).toBe("hotel-1");
    expect(params.get("reconciliationMethods")).toBe("paid_at_hotel_cash");
    expect(params.get("reconciliationStatus")).toBe("waiting");
    expect(params.get("dateBy")).toBe("checkin_date");
    expect(params.get("dateFrom")).not.toBe("2026-05-01");
    expect(params.get("page")).toBe("1");
    expect(params.has("granularity")).toBe(false);
    expect(params.has("sortBy")).toBe(false);
    expect(params.has("sortOrder")).toBe(false);
  });

  it("confirms an exact-category bulk reconciliation before sending one optimistic request", async () => {
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
    expect(within(selectedAmountCard).getByText("15.15")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select reservation reservation-2",
      }),
    );
    expect(within(selectedAmountCard).getByText("10.10")).toBeInTheDocument();

    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({
        data: [],
        totalDocuments: 0,
        page: 1,
        limit: 500,
      }),
    );
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Reconcile selected/ }),
      );
    });
    expect(
      screen.getByRole("dialog", { name: "Confirm reconciliation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("10.10 SAR")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Payout purpose"), {
      target: { value: "paid_out_to_zad" },
    });
    fireEvent.change(screen.getByLabelText("Comment"), {
      target: { value: "Zad payout for the selected period" },
    });
    const receipt = new File(["receipt"], "receipt.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText("Attachment (optional)"), {
      target: { files: [receipt] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(updateReconciliationStatusAdmin).toHaveBeenCalledTimes(1),
    );
    expect(updateReconciliationStatusAdmin.mock.calls[0][2]).toEqual({
      hotelId: "hotel-1",
      action: "reconcile",
      paymentBreakdownKeys: ["paid_at_hotel_cash"],
      expectedActionAmountCents: 1010,
      payoutPurpose: "paid_out_to_zad",
      comment: "Zad payout for the selected period",
      attachment: receipt,
      reservations: [
        {
          reservationId: "reservation-1",
          __v: 3,
          updatedAt: "2026-08-14T00:00:00.000Z",
          displayedAmountsCents: {
            paid_at_hotel_cash: 1010,
          },
        },
      ],
    });
  });

  it("uses a synchronous lock so rapid confirmation clicks issue only one PATCH", async () => {
    let resolveMutation;
    updateReconciliationStatusAdmin.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );
    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({
        data: [],
        totalDocuments: 0,
        page: 1,
        limit: 500,
      }),
    );
    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select reservation reservation-1",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Reconcile selected/ }));
    fireEvent.change(screen.getByLabelText("Payout purpose"), {
      target: { value: "paid_out_to_zad" },
    });
    const dialog = screen.getByRole("dialog", {
      name: "Confirm reconciliation",
    });
    const confirmButton = within(dialog).getByRole("button", {
      name: "Confirm",
    });

    act(() => {
      confirmButton.click();
      confirmButton.click();
    });

    expect(updateReconciliationStatusAdmin).toHaveBeenCalledTimes(1);
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled();

    await act(async () => {
      resolveMutation({
        success: true,
        code: "reconciliation_updated",
        action: "reconcile",
        paymentBreakdownKeys: ["paid_at_hotel_cash"],
        plannedActionAmountCents: 1010,
        appliedActionAmountCents: 1010,
        updatedCount: 1,
        updated: ["reservation-1"],
        conflictCount: 0,
        conflicts: [],
      });
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Confirm reconciliation" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("aborts an in-flight reconciliation request when the report unmounts", async () => {
    let mutationSignal;
    updateReconciliationStatusAdmin.mockImplementationOnce(
      (_userId, _token, _payload, options) =>
        new Promise((_resolve, reject) => {
          mutationSignal = options.signal;
          options.signal.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );
    const view = renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select reservation reservation-1",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Reconcile selected/ }));
    fireEvent.change(screen.getByLabelText("Payout purpose"), {
      target: { value: "paid_out_to_zad" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(updateReconciliationStatusAdmin).toHaveBeenCalledTimes(1);
    expect(mutationSignal.aborted).toBe(false);

    view.unmount();

    expect(mutationSignal.aborted).toBe(true);
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

  it("reports a workbook write failure without announcing a successful export", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    XLSXStyle.writeFile.mockImplementationOnce(() => {
      throw new Error("Browser write failed");
    });
    renderReport();
    await screen.findByText("Guest reservation-2");

    fireEvent.click(screen.getByRole("button", { name: "Export to Excel" }));

    try {
      await waitFor(() =>
        expect(message.error).toHaveBeenCalledWith(
          "Could not prepare the Excel report.",
        ),
      );
      expect(message.success).not.toHaveBeenCalledWith(
        "Excel report exported.",
      );
    } finally {
      consoleError.mockRestore();
    }
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

  it("times out a stalled hotel bootstrap, clears loading, and ignores its late response", async () => {
    let resolveHotels;
    let hotelSignal;
    gettingHotelDetailsForAdminAll.mockReset().mockImplementationOnce(
      (_userId, _token, _query, options) =>
        new Promise((resolve) => {
          resolveHotels = resolve;
          hotelSignal = options.signal;
        }),
    );

    jest.useFakeTimers();
    try {
      renderReport();
      expect(hotelSignal).toBeInstanceOf(AbortSignal);
      await act(async () => {
        jest.advanceTimersByTime(HOTEL_BOOTSTRAP_DEADLINE_MS);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(hotelSignal.aborted).toBe(true);
      expect(message.error).toHaveBeenCalledWith(
        "Loading the accessible hotels timed out after 30 seconds. Please try again.",
      );
      expect(getReconciliationReportAdmin).not.toHaveBeenCalled();
      expect(
        screen.getByText("Select a hotel to view its reconciliation report."),
      ).toBeInTheDocument();

      await act(async () => {
        resolveHotels([{ _id: "late-hotel", hotelName: "Late Hotel" }]);
        await Promise.resolve();
      });
      expect(getReconciliationReportAdmin).not.toHaveBeenCalled();
      expect(screen.queryByText("Late Hotel")).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("times out a stalled report load, clears loading, and ignores its late response", async () => {
    let resolveReport;
    let reportSignal;
    renderReport();
    await screen.findByText("Guest reservation-2");
    getReconciliationReportAdmin.mockImplementationOnce(
      (_userId, _token, _request, options) =>
        new Promise((resolve) => {
          resolveReport = resolve;
          reportSignal = options.signal;
        }),
    );

    jest.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Reconciled" }));
      expect(reportSignal).toBeInstanceOf(AbortSignal);
      await act(async () => {
        jest.advanceTimersByTime(REPORT_REQUEST_DEADLINE_MS);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(reportSignal.aborted).toBe(true);
      expect(message.error).toHaveBeenCalledWith(
        "The reconciliation report timed out after 60 seconds. Adjust the filters and try again.",
      );
      expect(
        screen.getByText("No reservations match these filters."),
      ).toBeInTheDocument();

      const lateRow = row({
        id: "late-report-row",
        cash: 10,
        card: 0,
        reconciledCash: true,
      });
      await act(async () => {
        resolveReport(
          payload({
            data: [lateRow],
            totalDocuments: 1,
            page: 1,
            limit: 500,
            reconciliationStatus: "reconciled",
          }),
        );
        await Promise.resolve();
      });
      expect(
        screen.queryByText("Guest late-report-row"),
      ).not.toBeInTheDocument();
      expect(getReconciliationReportAdmin).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it("applies the status filter through the API and URL", async () => {
    renderReport();
    await screen.findByText("Guest reservation-2");
    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({
        data: [],
        totalDocuments: 0,
        page: 1,
        limit: 500,
        reconciliationStatus: "reconciled",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Reconciled" }));

    await waitFor(() =>
      expect(getReconciliationReportAdmin).toHaveBeenCalledTimes(3),
    );
    expect(getReconciliationReportAdmin.mock.calls[2][2]).toEqual(
      expect.objectContaining({ reconciliationStatus: "reconciled", page: 1 }),
    );
    await waitFor(() => {
      const params = new URLSearchParams(
        screen.getByTestId("location-search").textContent,
      );
      expect(params.get("reconciliationStatus")).toBe("reconciled");
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
    fireEvent.click(screen.getByRole("button", { name: /Reconcile selected/ }));
    fireEvent.change(screen.getByLabelText("Payout purpose"), {
      target: { value: "paid_out_to_zad" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

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

  it("rejects a malformed HTTP-200 mutation acknowledgement and refreshes ambiguous state", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    updateReconciliationStatusAdmin.mockResolvedValueOnce({
      success: true,
      code: "reconciliation_updated",
      action: "reconcile",
      paymentBreakdownKeys: ["paid_at_hotel_cash"],
      plannedActionAmountCents: 1010,
      appliedActionAmountCents: 1010,
      updatedCount: 1,
      updated: ["wrong-reservation"],
      conflictCount: 0,
      conflicts: [],
    });
    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
    );
    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select reservation reservation-1",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Reconcile selected/ }));
    fireEvent.change(screen.getByLabelText("Payout purpose"), {
      target: { value: "paid_out_to_zad" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    try {
      await waitFor(() =>
        expect(message.error).toHaveBeenCalledWith(
          "The reconciliation response did not pass the safety checks. The report was refreshed; review it before trying again.",
        ),
      );
      expect(message.success).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(getReconciliationReportAdmin).toHaveBeenCalledTimes(3),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("sends one bounded optimistic request for a selection below 500 rows", async () => {
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
    updateReconciliationStatusAdmin.mockReset().mockResolvedValueOnce({
      success: true,
      code: "reconciliation_updated",
      action: "reconcile",
      paymentBreakdownKeys: ["paid_at_hotel_cash"],
      plannedActionAmountCents: 10100,
      appliedActionAmountCents: 10100,
      updatedCount: 101,
      updated: bulkRows.map((item) => item._id),
      conflictCount: 0,
      conflicts: [],
    });
    renderReport();
    await screen.findByText("Guest bulk-101");
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select all displayed reservations",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Reconcile selected/ }));
    fireEvent.change(screen.getByLabelText("Payout purpose"), {
      target: { value: "paid_out_to_zad" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(updateReconciliationStatusAdmin).toHaveBeenCalledTimes(1),
    );
    expect(
      updateReconciliationStatusAdmin.mock.calls[0][2].reservations,
    ).toHaveLength(101);
    expect(
      updateReconciliationStatusAdmin.mock.calls[0][2].reservations[100],
    ).toEqual(
      expect.objectContaining({
        __v: 3,
        updatedAt: "2026-08-14T00:00:00.000Z",
        displayedAmountsCents: {
          paid_at_hotel_cash: 100,
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
      screen.getByRole("button", { name: /Reconcile selected/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Export to Excel" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("listbox", { name: "Payment methods" }),
    ).toBeEnabled();
  });

  it("resets exactly one reconciled row category and leaves other categories out of the request", async () => {
    const mixed = row({
      id: "mixed-row",
      cash: 10,
      card: 20,
      reconciledCard: true,
      confirmation: "MIXED-1",
    });
    getReconciliationReportAdmin
      .mockReset()
      .mockResolvedValueOnce(
        payload({
          data: [mixed],
          totalDocuments: 1,
          page: 1,
          limit: 500,
          scorecards: {
            totalAmountCents: 1000,
            reconciledAmountCents: 0,
            waitingAmountCents: 1000,
            reservationsCount: 1,
            reconciledReservationsCount: 0,
            waitingReservationsCount: 1,
          },
        }),
      )
      .mockResolvedValueOnce(
        payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
      );
    renderReport();
    await screen.findByText("MIXED-1");
    fireEvent.click(screen.getByRole("button", { name: "Unreconcile" }));
    const dialog = screen.getByRole("dialog", {
      name: "Return this category to awaiting reconciliation?",
    });
    expect(within(dialog).getByLabelText("Payment category").value).toBe(
      "paid_at_hotel_card",
    );
    expect(within(dialog).getByText("20.00 SAR")).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Unreconcile" }),
    );
    await waitFor(() =>
      expect(updateReconciliationStatusAdmin).toHaveBeenCalledWith(
        "admin-1",
        "token-1",
        expect.objectContaining({
          action: "reset",
          paymentBreakdownKeys: ["paid_at_hotel_card"],
          expectedActionAmountCents: 2000,
          reservations: [
            expect.objectContaining({
              reservationId: "mixed-row",
              displayedAmountsCents: { paid_at_hotel_card: 2000 },
            }),
          ],
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
  });

  it("loads a complete reservation before rendering More Details and refreshes after an edit", async () => {
    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(screen.getAllByRole("button", { name: "More details" })[0]);
    expect(getAdminReservationById).toHaveBeenCalledWith(
      "reservation-1",
      "token-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(await screen.findByTestId("more-details")).toHaveTextContent(
      "Full details reservation-1",
    );
    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Simulate reservation update" }),
    );
    await waitFor(() =>
      expect(getReconciliationReportAdmin).toHaveBeenCalledTimes(3),
    );
  });

  it("previews Miscellaneous exactly once and does not mutate until explicit confirmation", async () => {
    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(screen.getByRole("button", { name: "Miscellaneous" }));
    const dialog = screen.getByRole("dialog", {
      name: "Miscellaneous reconciliation",
    });
    fireEvent.change(within(dialog).getByLabelText("Target amount (SAR)"), {
      target: { value: "10.10" },
    });
    fireEvent.change(within(dialog).getByLabelText("Payout purpose"), {
      target: { value: "paid_out_to_jannat" },
    });
    const findButton = within(dialog).getByRole("button", {
      name: "Find closest reservations",
    });
    fireEvent.click(findButton);
    fireEvent.click(findButton);
    await waitFor(() =>
      expect(getReconciliationClosestMatchAdmin).toHaveBeenCalledTimes(1),
    );
    expect(updateReconciliationStatusAdmin).not.toHaveBeenCalled();
    expect(await within(dialog).findByText("Exact match")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Preview only - no reservation has been changed.",
      ),
    ).toBeInTheDocument();
    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Confirm proposal" }),
    );
    await waitFor(() =>
      expect(updateReconciliationStatusAdmin).toHaveBeenCalledWith(
        "admin-1",
        "token-1",
        expect.objectContaining({
          action: "reconcile",
          paymentBreakdownKeys: ["paid_at_hotel_cash"],
          expectedActionAmountCents: 1010,
          payoutPurpose: "paid_out_to_jannat",
          reservations: expect.any(Array),
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
  });

  it("shows every proposal row in a selectable table, exports it, and reconciles only checked rows", async () => {
    const first = row({
      id: "proposal-1",
      confirmation: "P-1001",
      cash: 10.1,
      card: 0,
      reservationStatus: "checked_out",
    });
    const second = row({
      id: "proposal-2",
      confirmation: "P-1002",
      cash: 5.05,
      card: 0,
      reservationStatus: "inhouse",
    });
    getReconciliationClosestMatchAdmin.mockResolvedValueOnce({
      code: "reconciliation_closest_match",
      hotelId: "hotel-1",
      paymentBreakdownKey: "paid_at_hotel_cash",
      targetAmountCents: 1515,
      matchedAmountCents: 1515,
      differenceCents: 0,
      direction: "exact",
      exactMatch: true,
      optimalityGuaranteed: true,
      resolutionCents: 1,
      candidateCount: 2,
      selectedCount: 2,
      elapsedMs: 5,
      timedOut: false,
      selectionLimitExceeded: false,
      data: [first, second],
      reservations: buildReconciliationMutationReservations(
        [first, second],
        ["paid_at_hotel_cash"],
      ),
    });

    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(screen.getByRole("button", { name: "Miscellaneous" }));
    const dialog = screen.getByRole("dialog", {
      name: "Miscellaneous reconciliation",
    });
    fireEvent.change(within(dialog).getByLabelText("Target amount (SAR)"), {
      target: { value: "15.15" },
    });
    fireEvent.change(within(dialog).getByLabelText("Payout purpose"), {
      target: { value: "paid_out_to_jannat" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Find closest reservations",
      }),
    );

    const proposalTable = await within(dialog).findByRole("table");
    expect(within(proposalTable).getAllByRole("row")).toHaveLength(3);
    expect(within(proposalTable).getByText("Checked out")).toBeInTheDocument();
    fireEvent.click(
      within(proposalTable).getByRole("checkbox", {
        name: "Select reservation P-1002",
      }),
    );
    expect(within(dialog).getByText("Adjusted selection")).toBeInTheDocument();
    expect(within(dialog).getAllByText("10.10 SAR")).toHaveLength(2);

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Export proposal to Excel",
      }),
    );
    await waitFor(() =>
      expect(XLSXStyle.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/^reconciliation-proposal-test-hotel-/),
      ),
    );

    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Confirm proposal" }),
    );
    await waitFor(() =>
      expect(updateReconciliationStatusAdmin).toHaveBeenCalledWith(
        "admin-1",
        "token-1",
        expect.objectContaining({
          expectedActionAmountCents: 1010,
          reservations: [
            expect.objectContaining({ reservationId: "proposal-1" }),
          ],
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
  });

  it("rejects a malformed Miscellaneous response, refreshes, and never exposes confirmation", async () => {
    const malformedRow = row({ id: "unsafe-proposal", cash: 10.1, card: 0 });
    getReconciliationClosestMatchAdmin.mockResolvedValueOnce({
      code: "reconciliation_closest_match",
      hotelId: "hotel-1",
      paymentBreakdownKey: "paid_at_hotel_cash",
      targetAmountCents: 1010,
      matchedAmountCents: 1010,
      differenceCents: 0,
      direction: "exact",
      exactMatch: true,
      optimalityGuaranteed: true,
      resolutionCents: 1,
      candidateCount: 1,
      selectedCount: 1,
      elapsedMs: 3,
      timedOut: false,
      selectionLimitExceeded: false,
      data: [malformedRow],
      reservations: [
        {
          ...buildReconciliationMutationReservations(
            [malformedRow],
            ["paid_at_hotel_cash"],
          )[0],
          displayedAmountsCents: { paid_at_hotel_cash: 1009 },
        },
      ],
    });
    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
    );
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(screen.getByRole("button", { name: "Miscellaneous" }));
    const dialog = screen.getByRole("dialog", {
      name: "Miscellaneous reconciliation",
    });
    fireEvent.change(within(dialog).getByLabelText("Target amount (SAR)"), {
      target: { value: "10.10" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Find closest reservations",
      }),
    );
    try {
      await waitFor(() =>
        expect(message.error).toHaveBeenCalledWith(
          "The match response did not pass the safety checks. The report was refreshed; try again.",
        ),
      );
      expect(
        within(dialog).queryByRole("button", { name: "Confirm proposal" }),
      ).not.toBeInTheDocument();
      expect(updateReconciliationStatusAdmin).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(getReconciliationReportAdmin).toHaveBeenCalledTimes(3),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("times out one stalled closest request, ignores its late result, and permits a retry", async () => {
    let resolveClosest;
    let closestSignal;
    getReconciliationClosestMatchAdmin.mockImplementationOnce(
      (_userId, _token, _request, options) =>
        new Promise((resolve) => {
          resolveClosest = resolve;
          closestSignal = options.signal;
        }),
    );
    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(screen.getByRole("button", { name: "Miscellaneous" }));
    const dialog = screen.getByRole("dialog", {
      name: "Miscellaneous reconciliation",
    });
    fireEvent.change(within(dialog).getByLabelText("Target amount (SAR)"), {
      target: { value: "10.10" },
    });

    jest.useFakeTimers();
    try {
      fireEvent.click(
        within(dialog).getByRole("button", {
          name: "Find closest reservations",
        }),
      );
      expect(getReconciliationClosestMatchAdmin).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(CLOSEST_REQUEST_DEADLINE_MS);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(closestSignal.aborted).toBe(true);
      expect(message.error).toHaveBeenCalledWith(
        "The closest-match search timed out after 30 seconds. Narrow the date range or amount and try again.",
      );
      expect(
        within(dialog).getByRole("button", {
          name: "Find closest reservations",
        }),
      ).not.toBeDisabled();
      expect(getReconciliationClosestMatchAdmin).toHaveBeenCalledTimes(1);

      const lateRow = row({ id: "late-proposal", cash: 10.1, card: 0 });
      await act(async () => {
        resolveClosest({
          code: "reconciliation_closest_match",
          hotelId: "hotel-1",
          paymentBreakdownKey: "paid_at_hotel_cash",
          targetAmountCents: 1010,
          matchedAmountCents: 1010,
          differenceCents: 0,
          direction: "exact",
          exactMatch: true,
          optimalityGuaranteed: true,
          resolutionCents: 1,
          candidateCount: 1,
          selectedCount: 1,
          elapsedMs: 1,
          timedOut: false,
          selectionLimitExceeded: false,
          data: [lateRow],
          reservations: buildReconciliationMutationReservations(
            [lateRow],
            ["paid_at_hotel_cash"],
          ),
        });
        await Promise.resolve();
      });
      expect(within(dialog).queryByText("Exact match")).not.toBeInTheDocument();
      expect(getReconciliationClosestMatchAdmin).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("times out one stalled PATCH, refreshes ambiguous state, and ignores its late success", async () => {
    let resolveMutation;
    let mutationSignal;
    updateReconciliationStatusAdmin.mockImplementationOnce(
      (_userId, _token, _request, options) =>
        new Promise((resolve) => {
          resolveMutation = resolve;
          mutationSignal = options.signal;
        }),
    );
    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({ data: [], totalDocuments: 0, page: 1, limit: 500 }),
    );
    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select reservation reservation-1",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Reconcile selected/ }));
    fireEvent.change(screen.getByLabelText("Payout purpose"), {
      target: { value: "paid_out_to_zad" },
    });
    const dialog = screen.getByRole("dialog", {
      name: "Confirm reconciliation",
    });

    jest.useFakeTimers();
    try {
      fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
      fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
      expect(updateReconciliationStatusAdmin).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(MUTATION_REQUEST_DEADLINE_MS);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mutationSignal.aborted).toBe(true);
      expect(message.error).toHaveBeenCalledWith(
        "The reconciliation request timed out after 120 seconds. No confirmation was received; review the report before trying again.",
      );
      expect(message.success).not.toHaveBeenCalled();
      expect(updateReconciliationStatusAdmin).toHaveBeenCalledTimes(1);
      expect(
        within(dialog).getByRole("button", { name: "Cancel" }),
      ).not.toBeDisabled();
      await act(async () => {
        resolveMutation({
          success: true,
          code: "reconciliation_updated",
          action: "reconcile",
          paymentBreakdownKeys: ["paid_at_hotel_cash"],
          plannedActionAmountCents: 1010,
          appliedActionAmountCents: 1010,
          updatedCount: 1,
          updated: ["reservation-1"],
          conflictCount: 0,
          conflicts: [],
        });
        await Promise.resolve();
      });
      expect(message.success).not.toHaveBeenCalled();
      expect(updateReconciliationStatusAdmin).toHaveBeenCalledTimes(1);
      expect(getReconciliationReportAdmin).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it("uses the first three scorecards as accessible reconciliation filters", async () => {
    renderReport();
    await screen.findByText("Guest reservation-2");
    getReconciliationReportAdmin.mockResolvedValueOnce(
      payload({
        data: [],
        totalDocuments: 0,
        page: 1,
        limit: 500,
        reconciliationStatus: "all",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /^Total paid in selected methods \(SAR\)/,
      }),
    );
    await waitFor(() =>
      expect(getReconciliationReportAdmin).toHaveBeenLastCalledWith(
        "admin-1",
        "token-1",
        expect.objectContaining({ reconciliationStatus: "all" }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
  });

  it("renders the new modal controls and payout purposes in Arabic and English", async () => {
    mockLanguage = "Arabic";
    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(screen.getByRole("button", { name: "متفرقات" }));
    const dialog = screen.getByRole("dialog", { name: "تسوية متفرقة" });
    expect(within(dialog).getByLabelText("غرض الدفع")).toBeInTheDocument();
    const purposeSelect = within(dialog).getByLabelText("غرض الدفع");
    expect(purposeSelect.options[0].textContent).toContain("مدفوع إلى زاد");
    expect(purposeSelect.options[0].textContent).toContain("Paid out to Zad");
  });

  it("shows the localized Arabic message when closest-match search times out", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockLanguage = "Arabic";
    const timeoutError = new Error("backend English timeout");
    timeoutError.status = 503;
    timeoutError.payload = { code: "closest_match_timeout" };
    getReconciliationClosestMatchAdmin.mockRejectedValueOnce(timeoutError);
    renderReport();
    await screen.findByText("Guest reservation-2");
    fireEvent.click(
      screen.getByRole("button", {
        name: "\u0645\u062a\u0641\u0631\u0642\u0627\u062a",
      }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(
      within(dialog).getByLabelText(
        "\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0633\u062a\u0647\u062f\u0641 (\u0631.\u0633)",
      ),
      { target: { value: "100" } },
    );
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "\u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0623\u0642\u0631\u0628 \u062d\u062c\u0648\u0632\u0627\u062a",
      }),
    );

    try {
      await waitFor(() =>
        expect(message.error).toHaveBeenCalledWith(
          "\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0627\u0644\u0628\u062d\u062b \u0639\u0646 \u0623\u0642\u0631\u0628 \u0645\u0637\u0627\u0628\u0642\u0629 \u0628\u0639\u062f 30 \u062b\u0627\u0646\u064a\u0629. \u0636\u064a\u0651\u0642 \u0646\u0637\u0627\u0642 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0623\u0648 \u0627\u0644\u0645\u0628\u0644\u063a \u0648\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
        ),
      );
      expect(message.error).not.toHaveBeenCalledWith("backend English timeout");
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("reconciliation report guards", () => {
  it("defaults every fresh mount to Ajyad, cash, waiting, and current Hijri check-in month", () => {
    const parsed = readReconciliationQuery(
      "?tab=reconciliation&hotelId=stale&dateBy=createdAt&dateFrom=2026-01-01&reconciliationMethods=paid_at_hotel_card&reconciliationStatus=all",
      new Date("2026-08-14T12:00:00Z"),
    );
    expect(parsed.hotelId).toBe("6a40b6a1a6efe70450536038");
    expect(parsed.methods).toEqual(["paid_at_hotel_cash"]);
    expect(parsed.status).toBe("waiting");
    expect(parsed.dateFilter.dateBy).toBe("checkin_date");
    expect(parsed.dateFilter.dateFrom).not.toBe("2026-01-01");
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

    const echoedPage = payload({
      data: [],
      totalDocuments: 0,
      page: 1,
      limit: 500,
    });
    expect(() =>
      validateReconciliationReportPage(echoedPage, 1, null, {
        paymentBreakdownKeys: ["paid_at_hotel_cash"],
        reconciliationStatus: "waiting",
      }),
    ).not.toThrow();
    expect(() =>
      validateReconciliationReportPage(
        { ...echoedPage, selectedPaymentBreakdownKeys: ["paid_at_hotel_card"] },
        1,
        null,
        {
          paymentBreakdownKeys: ["paid_at_hotel_cash"],
          reconciliationStatus: "waiting",
        },
      ),
    ).toThrow("Invalid or excessive reconciliation pagination metadata");
    expect(() =>
      validateReconciliationReportPage(
        { ...echoedPage, reconciliationStatus: "reconciled" },
        1,
        null,
        {
          paymentBreakdownKeys: ["paid_at_hotel_cash"],
          reconciliationStatus: "waiting",
        },
      ),
    ).toThrow("Invalid or excessive reconciliation pagination metadata");
  });

  it("parses SAR in exact cents and sorts invalid dates last with stable tie breakers", () => {
    expect(parsePositiveSarCents("20,000")).toBe(2000000);
    expect(parsePositiveSarCents("20.05")).toBe(2005);
    expect(parsePositiveSarCents("20.005")).toBeNull();
    expect(parsePositiveSarCents("0")).toBeNull();
    expect(
      parsePositiveSarCents(
        "\u0662\u0660\u066c\u0660\u0660\u0660\u066b\u0660\u0665",
      ),
    ).toBe(2000005);
    expect(
      parsePositiveSarCents(
        "\u06f2\u06f0\u066c\u06f0\u06f0\u06f0\u066b\u06f0\u06f5",
      ),
    ).toBe(2000005);
    expect(
      sortReconciliationRows([
        row({
          id: "later",
          cash: 1,
          card: 0,
          checkin: "2026-08-20T00:00:00.000Z",
          checkout: "2026-08-22T00:00:00.000Z",
        }),
        row({
          id: "earlier",
          cash: 1,
          card: 0,
          checkin: "2026-08-01T00:00:00.000Z",
          checkout: "2026-08-02T00:00:00.000Z",
        }),
        row({
          id: "invalid",
          cash: 1,
          card: 0,
          checkin: "not-a-date",
          checkout: "not-a-date",
        }),
      ]).map((reservation) => reservation._id),
    ).toEqual(["earlier", "later", "invalid"]);
    expect(PAYMENT_BREAKDOWN_KEYS).toHaveLength(8);
  });

  it.each([
    [
      "swapped snapshots",
      (proposal) => {
        const [first, second] = proposal.reservations;
        proposal.reservations = [
          { ...first, reservationId: second.reservationId },
          { ...second, reservationId: first.reservationId },
        ];
      },
    ],
    [
      "duplicate row IDs",
      (proposal) => {
        proposal.data[1] = { ...proposal.data[1], _id: proposal.data[0]._id };
      },
    ],
    [
      "mismatched snapshot cents",
      (proposal) => {
        proposal.reservations[0] = {
          ...proposal.reservations[0],
          displayedAmountsCents: { paid_at_hotel_cash: 999 },
        };
      },
    ],
    [
      "an effectively reconciled row",
      (proposal) => {
        proposal.data[0] = row({
          id: "proposal-a",
          cash: 10,
          card: 0,
          reconciledCash: true,
        });
      },
    ],
    [
      "a cancelled reservation",
      (proposal) => {
        proposal.data[0] = {
          ...proposal.data[0],
          reservation_status: "cancelled",
        };
      },
    ],
  ])("rejects a closest proposal with %s", (_label, mutate) => {
    const rows = [
      row({ id: "proposal-a", cash: 10, card: 0 }),
      row({ id: "proposal-b", cash: 20, card: 0 }),
    ];
    const proposal = {
      code: "reconciliation_closest_match",
      hotelId: "hotel-1",
      paymentBreakdownKey: "paid_at_hotel_cash",
      targetAmountCents: 3000,
      matchedAmountCents: 3000,
      differenceCents: 0,
      direction: "exact",
      exactMatch: true,
      optimalityGuaranteed: true,
      resolutionCents: 1,
      candidateCount: 2,
      selectedCount: 2,
      elapsedMs: 4,
      timedOut: false,
      selectionLimitExceeded: false,
      data: rows,
      reservations: buildReconciliationMutationReservations(rows, [
        "paid_at_hotel_cash",
      ]),
    };
    mutate(proposal);
    expect(() =>
      validateClosestMatchProposal({
        proposal,
        hotelId: "hotel-1",
        category: "paid_at_hotel_cash",
        targetAmountCents: 3000,
      }),
    ).toThrow("Invalid closest-match proposal");
  });

  it("strictly validates a successful mutation acknowledgement", () => {
    const reservations = [
      {
        reservationId: "reservation-1",
        __v: 3,
        updatedAt: "2026-08-14T00:00:00.000Z",
        displayedAmountsCents: { paid_at_hotel_cash: 1010 },
      },
    ];
    const valid = {
      success: true,
      code: "reconciliation_updated",
      action: "reconcile",
      paymentBreakdownKeys: ["paid_at_hotel_cash"],
      plannedActionAmountCents: 1010,
      appliedActionAmountCents: 1010,
      updatedCount: 1,
      updated: ["reservation-1"],
      conflictCount: 0,
      conflicts: [],
    };
    expect(
      validateReconciliationMutationSuccess({
        payload: valid,
        action: "reconcile",
        category: "paid_at_hotel_cash",
        expectedActionAmountCents: 1010,
        reservations,
      }),
    ).toBe(valid);
    for (const malformed of [
      { ...valid, success: false },
      { ...valid, appliedActionAmountCents: 1009 },
      { ...valid, updated: ["another-reservation"] },
      { ...valid, conflicts: [{ reservationId: "reservation-1" }] },
    ]) {
      expect(() =>
        validateReconciliationMutationSuccess({
          payload: malformed,
          action: "reconcile",
          category: "paid_at_hotel_cash",
          expectedActionAmountCents: 1010,
          reservations,
        }),
      ).toThrow("Invalid reconciliation mutation response");
    }
  });
});
