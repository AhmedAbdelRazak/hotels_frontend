import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  gettingHotelDetailsForAdminAll,
  getPaidBreakdownReportAdmin,
} from "../apiAdmin";
import { message } from "antd";
import PaidReportAdmin from "./PaidReportAdmin";
import {
  getPaidReportCurrentMonth,
  getPaidReportCurrentYear,
  resolvePaidReportPeriods,
} from "./paidReportDateFilter";
import * as XLSX from "xlsx";

const AJYAD_HOTEL_ID = "6a40b6a1a6efe70450536038";
let mockChosenLanguage = "English";

jest.mock("axios", () => ({}));

jest.mock("../../auth", () => ({
  isAuthenticated: () => ({ user: { _id: "admin-1" }, token: "token-1" }),
}));

jest.mock("../../cart_context", () => ({
  useCartContext: () => ({ chosenLanguage: mockChosenLanguage }),
}));

jest.mock("../apiAdmin", () => ({
  gettingHotelDetailsForAdminAll: jest.fn(),
  getPaidBreakdownReportAdmin: jest.fn(),
}));

jest.mock(
  "../AllReservation/MoreDetails",
  () =>
    ({ onReservationUpdated, reservation }) => (
      <button
        type="button"
        onClick={() =>
          onReservationUpdated?.({
            _id: reservation?._id,
            paid_amount_breakdown: { paid_at_hotel_cash: 99 },
            paid_breakdown_total: 99,
          })
        }
      >
        Simulate paid edit
      </button>
    ),
);

jest.mock("./PaidReportDateControls", () => ({ disabled, onApply, value }) => (
  <div data-testid="paid-date-control" data-value={JSON.stringify(value)}>
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        onApply({
          dateBy: "checkout_date",
          dateFrom: "",
          dateTo: "",
          dateRanges: [
            { dateFrom: "2026-08-15", dateTo: "2026-09-12" },
            { dateFrom: "2026-06-16", dateTo: "2026-07-14" },
            { dateFrom: "2026-08-15", dateTo: "2026-09-12" },
          ],
        })
      }
    >
      Apply non-contiguous months
    </button>
  </div>
));

jest.mock(
  "./ReportTotalModeToggle",
  () =>
    ({ value, onChange, isArabic, disabled }) => (
      <div
        role="group"
        aria-label={isArabic ? "أساس قيمة الحجز" : "Reservation total basis"}
        data-testid="total-mode-control"
      >
        <button
          type="button"
          disabled={disabled}
          aria-pressed={value === "gross"}
          onClick={() => onChange("gross")}
        >
          {isArabic ? "الإجمالي" : "Gross Total"}
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={value === "net"}
          onClick={() => onChange("net")}
        >
          {isArabic ? "الصافي" : "Net Total"}
        </button>
      </div>
    ),
);

jest.mock("xlsx", () => ({
  utils: {
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
    encode_range: jest.fn(),
  },
  writeFile: jest.fn(),
}));

jest.mock("antd", () => {
  const Select = ({ children, onChange, placeholder, value }) => (
    <select
      aria-label={placeholder || "select"}
      value={value || ""}
      onChange={(event) => onChange?.(event.target.value)}
    >
      <option value="" disabled>
        {placeholder || "Select"}
      </option>
      <option value="explicit-hotel">Explicit Hotel</option>
      {children}
    </select>
  );
  Select.Option = ({ children, value }) => (
    <option value={value}>{children}</option>
  );

  return {
    Button: ({ children, onClick, disabled, className }) => (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={className}
      >
        {children}
      </button>
    ),
    Input: ({ onChange, onKeyDown, placeholder, value, disabled }) => (
      <input
        aria-label={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
    ),
    Modal: ({ children, open }) => (open ? <div>{children}</div> : null),
    Select,
    Spin: () => <div aria-label="Loading report" />,
    message: { error: jest.fn(), info: jest.fn() },
  };
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
};

const scorecardValue = (label) =>
  screen.getByText(label, { selector: "span" }).closest("button").querySelector(
    "strong",
  ).textContent;

const activeAjyadHotel = () => ({
  _id: AJYAD_HOTEL_ID,
  hotelName: "Ajyad Hotel",
  activateHotel: true,
  xHotelProActive: true,
});

const reportPayload = (
  confirmationNumber,
  {
    reportTotal = 100,
    paidTotal = 25,
    available = true,
    netFallback = false,
    currency = "SAR",
    reportMode = "net",
  } = {},
) => ({
  data: [
    {
      _id: confirmationNumber,
      confirmation_number: confirmationNumber,
      customer_details: { name: `Guest ${confirmationNumber}` },
      hotelId: { _id: AJYAD_HOTEL_ID, hotelName: "Ajyad Hotel" },
      booking_source: "agoda",
      checkin_date: "2026-07-14T00:00:00.000Z",
      checkout_date: "2026-07-15T00:00:00.000Z",
      paid_amount_breakdown: { paid_at_hotel_cash: paidTotal },
      paid_breakdown_total: paidTotal,
      total_amount: 999999,
      report_total_amount: available ? reportTotal : null,
      report_total_available: available,
      report_total_net_fallback: netFallback,
      financial_totals_currency: currency,
      report_total_mode: reportMode,
      pickedRoomsType: [
        { room_type: "familyRooms", displayName: "Family Quintuple" },
      ],
      roomDetails: [{ room_number: "424", room_type: "familyRooms" }],
    },
  ],
  totalDocuments: 1,
  page: 1,
  limit: 500,
  scorecards: {
    totalAmount: available ? reportTotal : 0,
    paidAmount: paidTotal,
    breakdownTotals: { paid_at_hotel_cash: paidTotal },
    financialMetadata: {
      netFallback: netFallback ? 1 : 0,
      unavailable: available ? 0 : 1,
      foreignCurrency: 0,
    },
    financialIncludedCount: available ? 1 : 0,
    totalMode: reportMode,
  },
  totalMode: reportMode,
});

const reservationRow = (
  confirmationNumber,
  {
    reportTotal = 10,
    paidTotal = 2,
    available = true,
    netFallback = false,
    currency = "SAR",
    reportMode = "net",
  } = {},
) =>
  reportPayload(confirmationNumber, {
    reportTotal,
    paidTotal,
    available,
    netFallback,
    currency,
    reportMode,
  }).data[0];

const pagedReportPayload = ({
  data,
  totalDocuments,
  page,
  limit = 500,
  scorecards,
  totalMode = "net",
}) => ({
  data,
  totalDocuments,
  page,
  limit,
  totalMode,
  ...(scorecards ? { scorecards } : {}),
});

const paidScorecards = ({
  count,
  reportTotal = 10,
  paidTotal = 2,
  totalMode = "net",
}) => ({
  totalAmount: count * reportTotal,
  paidAmount: count * paidTotal,
  breakdownTotals: { paid_at_hotel_cash: count * paidTotal },
  financialMetadata: { netFallback: 0, unavailable: 0, foreignCurrency: 0 },
  financialIncludedCount: count,
  totalMode,
});

const partialReportPayload = ({
  availableConfirmation = "AVAILABLE",
  excludedConfirmation = "EXCLUDED",
  reportTotal = 100.1,
  availablePaid = 20.05,
  excludedPaid = 12.02,
  unavailableCount = 1,
  foreignCurrencyCount = 0,
  financialIncludedCount = 1,
  netFallbackCount = 0,
  reportMode = "net",
} = {}) => ({
  data: [
    reservationRow(availableConfirmation, {
      reportTotal,
      paidTotal: availablePaid,
      netFallback: netFallbackCount > 0,
      reportMode,
    }),
    reservationRow(excludedConfirmation, {
      reportTotal: null,
      paidTotal: excludedPaid,
      available: false,
      currency: foreignCurrencyCount > 0 ? "USD" : "SAR",
      reportMode,
    }),
  ],
  totalDocuments: 2,
  page: 1,
  limit: 500,
  scorecards: {
    totalAmount: reportTotal,
    paidAmount: availablePaid + excludedPaid,
    breakdownTotals: {
      paid_at_hotel_cash: availablePaid + excludedPaid,
    },
    financialMetadata: {
      netFallback: netFallbackCount,
      unavailable: unavailableCount,
      foreignCurrency: foreignCurrencyCount,
    },
    financialIncludedCount,
    totalMode: reportMode,
  },
  totalMode: reportMode,
});

const cellsForConfirmation = (confirmationNumber) =>
  within(screen.getByText(confirmationNumber).closest("tr")).getAllByRole(
    "cell",
  );

describe("PaidReportAdmin paid overview integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChosenLanguage = "English";
    gettingHotelDetailsForAdminAll.mockResolvedValue({
      hotels: [
        activeAjyadHotel(),
        {
          _id: "hotel-1",
          hotelName: "Test Hotel",
          activateHotel: true,
          xHotelProActive: true,
        },
      ],
    });
    getPaidBreakdownReportAdmin.mockResolvedValue(reportPayload("DEFAULT"));
  });

  it("starts with the current Riyadh Hijri month, Net mode, and active Ajyad without a request loop", async () => {
    const referenceDate = new Date();
    const currentYear = getPaidReportCurrentYear("hijri", referenceDate);
    const currentMonth = getPaidReportCurrentMonth("hijri", referenceDate);
    const expectedPeriod = resolvePaidReportPeriods({
      calendarType: "hijri",
      year: String(currentYear),
      months: [String(currentMonth)],
      referenceDate,
    });

    render(<PaidReportAdmin />);

    expect(await screen.findByText("DEFAULT")).toBeTruthy();
    expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(1);
    expect(gettingHotelDetailsForAdminAll).toHaveBeenCalledWith(
      "admin-1",
      "token-1",
      "summary=true",
    );
    expect(getPaidBreakdownReportAdmin.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        hotelId: AJYAD_HOTEL_ID,
        dateBy: "checkin_date",
        dateFrom: expectedPeriod.dateFrom,
        dateTo: expectedPeriod.dateTo,
        dateRanges: [],
        totalMode: "net",
        limit: 500,
      }),
    );
    expect(screen.getByLabelText("Select hotel").value).toBe(AJYAD_HOTEL_ID);
    expect(
      screen
        .getByRole("button", { name: "Net Total" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    const filterRow = screen.getByTestId("paid-report-date-total-row");
    expect(filterRow.contains(screen.getByTestId("paid-date-control"))).toBe(
      true,
    );
    expect(filterRow.contains(screen.getByTestId("total-mode-control"))).toBe(
      true,
    );
    expect(filterRow.contains(screen.getByLabelText("Select hotel"))).toBe(
      false,
    );

    await act(async () => Promise.resolve());
    expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(1);
  });

  it.each([
    { activateHotel: false, xHotelProActive: true },
    { activateHotel: true, xHotelProActive: false },
  ])(
    "does not default to Ajyad when it is not active: %o",
    async (activation) => {
      gettingHotelDetailsForAdminAll.mockResolvedValueOnce({
        hotels: [{ ...activeAjyadHotel(), ...activation }],
      });

      render(<PaidReportAdmin />);
      expect(
        await screen.findByRole("option", { name: "Ajyad Hotel" }),
      ).toBeTruthy();
      expect(screen.getByLabelText("Select hotel").value).toBe("");
      expect(getPaidBreakdownReportAdmin).not.toHaveBeenCalled();
    },
  );

  it("never replaces an explicit hotel selection when the hotel list resolves", async () => {
    const hotelsRequest = deferred();
    gettingHotelDetailsForAdminAll.mockReturnValueOnce(hotelsRequest.promise);

    render(<PaidReportAdmin />);
    fireEvent.change(screen.getByLabelText("Select hotel"), {
      target: { value: "explicit-hotel" },
    });
    await waitFor(() =>
      expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(1),
    );
    expect(await screen.findByText("DEFAULT")).toBeTruthy();

    await act(async () => {
      hotelsRequest.resolve({ hotels: [activeAjyadHotel()] });
      await hotelsRequest.promise;
    });
    expect(screen.getByLabelText("Select hotel").value).toBe("explicit-hotel");
    expect(getPaidBreakdownReportAdmin.mock.calls[0][2].hotelId).toBe(
      "explicit-hotel",
    );
    expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(1);
  });

  it("keeps only the latest result across exact date ranges and total mode changes", async () => {
    const initialRequest = deferred();
    const dateRequest = deferred();
    const grossRequest = deferred();
    getPaidBreakdownReportAdmin
      .mockReturnValueOnce(initialRequest.promise)
      .mockReturnValueOnce(dateRequest.promise)
      .mockReturnValueOnce(grossRequest.promise);

    render(<PaidReportAdmin />);
    await waitFor(() =>
      expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(1),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Apply non-contiguous months" }),
    );
    await waitFor(() =>
      expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(2),
    );
    expect(getPaidBreakdownReportAdmin.mock.calls[1][2]).toEqual(
      expect.objectContaining({
        dateBy: "checkout_date",
        dateFrom: "",
        dateTo: "",
        dateRanges: [
          { dateFrom: "2026-06-16", dateTo: "2026-07-14" },
          { dateFrom: "2026-08-15", dateTo: "2026-09-12" },
        ],
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Apply non-contiguous months" }),
    );
    await act(async () => Promise.resolve());
    expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Gross Total" }));
    await waitFor(() =>
      expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(3),
    );
    expect(getPaidBreakdownReportAdmin.mock.calls[2][2]).toEqual(
      expect.objectContaining({ totalMode: "gross" }),
    );

    await act(async () => {
      grossRequest.resolve(
        reportPayload("LATEST-GROSS", {
          reportTotal: 120,
          reportMode: "gross",
        }),
      );
      await grossRequest.promise;
    });
    expect(await screen.findByText("LATEST-GROSS")).toBeTruthy();

    await act(async () => {
      dateRequest.resolve(reportPayload("STALE-DATE"));
      initialRequest.resolve(reportPayload("STALE-INITIAL"));
      await Promise.all([dateRequest.promise, initialRequest.promise]);
    });
    expect(screen.queryByText("STALE-DATE")).toBeNull();
    expect(screen.queryByText("STALE-INITIAL")).toBeNull();
    expect(screen.getByText("LATEST-GROSS")).toBeTruthy();
  });

  it("switches only canonical booking total and derived remaining while paid figures stay unchanged", async () => {
    getPaidBreakdownReportAdmin
      .mockResolvedValueOnce(
        reportPayload("MODE-RESULT", { reportTotal: 80, paidTotal: 23 }),
      )
      .mockResolvedValueOnce(
        reportPayload("MODE-RESULT", {
          reportTotal: 100,
          paidTotal: 23,
          reportMode: "gross",
        }),
      );

    render(<PaidReportAdmin />);
    expect(await screen.findByText("MODE-RESULT")).toBeTruthy();
    let cells = cellsForConfirmation("MODE-RESULT");
    expect(cells[5].textContent).toBe("23.00");
    expect(cells[13].textContent).toBe("23.00");
    expect(cells[14].textContent).toBe("80.00");
    expect(cells[15].textContent).toBe("57.00");

    fireEvent.click(screen.getByRole("button", { name: "Gross Total" }));
    await waitFor(() => {
      cells = cellsForConfirmation("MODE-RESULT");
      expect(cells[14].textContent).toBe("100.00");
    });
    expect(cells[5].textContent).toBe("23.00");
    expect(cells[13].textContent).toBe("23.00");
    expect(cells[15].textContent).toBe("77.00");
    expect(getPaidBreakdownReportAdmin.mock.calls[1][2].totalMode).toBe(
      "gross",
    );
  });

  it("refetches rows and scorecards after a payment edit from reservation details", async () => {
    getPaidBreakdownReportAdmin
      .mockResolvedValueOnce(
        reportPayload("EDITED-PAYMENT", { reportTotal: 100, paidTotal: 10 }),
      )
      .mockResolvedValueOnce(
        reportPayload("EDITED-PAYMENT", { reportTotal: 100, paidTotal: 30 }),
      );

    render(<PaidReportAdmin />);
    expect(await screen.findByText("EDITED-PAYMENT")).toBeTruthy();
    let paidCard = screen
      .getByText("Paid Amount (SAR)", { selector: "span" })
      .closest("div");
    expect(paidCard.querySelector("strong").textContent).toBe("10.00");

    fireEvent.click(screen.getByRole("button", { name: "View Details" }));
    fireEvent.click(screen.getByRole("button", { name: "Simulate paid edit" }));

    await waitFor(() =>
      expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(2),
    );
    expect(await screen.findByText("EDITED-PAYMENT")).toBeTruthy();
    paidCard = screen
      .getByText("Paid Amount (SAR)", { selector: "span" })
      .closest("div");
    expect(paidCard.querySelector("strong").textContent).toBe("30.00");
    expect(cellsForConfirmation("EDITED-PAYMENT")[13].textContent).toBe(
      "30.00",
    );
  });

  it("loads every page once, de-duplicates deterministically, and reports/exports all 501 matches", async () => {
    const firstPageRows = Array.from({ length: 500 }, (_, index) =>
      reservationRow(`CONF-${index + 1}`),
    );
    const secondPageRows = [
      reservationRow("CONF-500"),
      reservationRow("CONF-501"),
    ];
    getPaidBreakdownReportAdmin.mockImplementation(
      (_userId, _token, options) => {
        if (options.page === 1) {
          return Promise.resolve(
            pagedReportPayload({
              data: firstPageRows,
              totalDocuments: 501,
              page: 1,
              scorecards: paidScorecards({ count: 501 }),
            }),
          );
        }
        if (options.page === 2) {
          return Promise.resolve(
            pagedReportPayload({
              data: secondPageRows,
              totalDocuments: 501,
              page: 2,
            }),
          );
        }
        return Promise.reject(new Error(`Unexpected page ${options.page}`));
      },
    );
    XLSX.utils.json_to_sheet.mockReturnValue({});
    XLSX.utils.book_new.mockReturnValue({});
    XLSX.utils.encode_range.mockReturnValue("A1:Z503");

    render(<PaidReportAdmin />);
    expect(
      await screen.findByText("CONF-501", {}, { timeout: 15000 }),
    ).toBeTruthy();
    expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(2);

    const firstOptions = getPaidBreakdownReportAdmin.mock.calls[0][2];
    const secondOptions = getPaidBreakdownReportAdmin.mock.calls[1][2];
    expect(firstOptions.page).toBe(1);
    expect(firstOptions.limit).toBe(500);
    expect(firstOptions.includeScorecards).toBeUndefined();
    expect(secondOptions.page).toBe(2);
    expect(secondOptions.includeScorecards).toBe(false);
    const comparableFilters = (options) =>
      Object.fromEntries(
        Object.entries(options).filter(
          ([key]) => key !== "page" && key !== "includeScorecards",
        ),
      );
    const firstFilters = comparableFilters(firstOptions);
    const secondFilters = comparableFilters(secondOptions);
    expect(secondFilters).toEqual(firstFilters);

    const table = screen.getByRole("table");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(501);
    expect(screen.getAllByText("CONF-500")).toHaveLength(1);
    const footerCells = table.querySelector("tfoot tr").children;
    expect(footerCells[5].textContent).toBe("1,002.00");
    expect(footerCells[13].textContent).toBe("1,002.00");
    expect(footerCells[14].textContent).toBe("5,010.00");
    expect(footerCells[15].textContent).toBe("4,008.00");
    expect(screen.queryByText("Net Total (SAR)", { selector: "span" })).toBeNull();
    expect(scorecardValue("Paid Amount (SAR)")).toBe("1,002.00");
    expect(scorecardValue("Reconciled (SAR)")).toBe("0.00");
    expect(scorecardValue("Awaiting Reconciliation (SAR)")).toBe("1,002.00");
    expect(
      screen.getAllByText("Paid at Hotel (Cash) (SAR)").length,
    ).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    await waitFor(() => expect(XLSX.utils.json_to_sheet).toHaveBeenCalled());
    const [exportRows, options] = XLSX.utils.json_to_sheet.mock.calls[0];
    expect(exportRows).toHaveLength(502);
    expect(exportRows[500]["Confirmation #"]).toBe("CONF-501");
    expect(exportRows[501]["Total Paid (SAR)"]).toBe(1002);
    expect(exportRows[501]["Net Total (SAR)"]).toBe(5010);
    expect(exportRows[501]["Remaining (SAR)"]).toBe(4008);
    expect(options.header).toEqual(
      expect.arrayContaining([
        "Paid at Hotel (Cash) (SAR)",
        "Total Paid (SAR)",
        "Net Total (SAR)",
        "Remaining (SAR)",
      ]),
    );
  }, 20000);

  it("stops a stale paged batch before another page and never overwrites the latest mode", async () => {
    const staleSecondPage = deferred();
    getPaidBreakdownReportAdmin.mockImplementation(
      (_userId, _token, options) => {
        if (options.totalMode === "gross") {
          return Promise.resolve(
            reportPayload("LATEST-PAGED-GROSS", {
              reportTotal: 120,
              paidTotal: 20,
              reportMode: "gross",
            }),
          );
        }
        if (options.page === 1) {
          return Promise.resolve(
            pagedReportPayload({
              data: [reservationRow("STALE-PAGE-1")],
              totalDocuments: 3,
              page: 1,
              limit: 1,
              scorecards: paidScorecards({ count: 3 }),
            }),
          );
        }
        if (options.page === 2) return staleSecondPage.promise;
        return Promise.reject(new Error(`Unexpected stale page ${options.page}`));
      },
    );

    render(<PaidReportAdmin />);
    await waitFor(() =>
      expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(2),
    );
    expect(getPaidBreakdownReportAdmin.mock.calls[1][2]).toEqual(
      expect.objectContaining({ page: 2, includeScorecards: false }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Gross Total" }));
    expect(await screen.findByText("LATEST-PAGED-GROSS")).toBeTruthy();

    await act(async () => {
      staleSecondPage.resolve(
        pagedReportPayload({
          data: [reservationRow("STALE-PAGE-2")],
          totalDocuments: 3,
          page: 2,
          limit: 1,
        }),
      );
      await staleSecondPage.promise;
      await Promise.resolve();
    });

    expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(3);
    expect(
      getPaidBreakdownReportAdmin.mock.calls.some(
        (call) => call[2].totalMode === "net" && call[2].page === 3,
      ),
    ).toBe(false);
    expect(screen.queryByText("STALE-PAGE-1")).toBeNull();
    expect(screen.queryByText("STALE-PAGE-2")).toBeNull();
    expect(screen.getByText("LATEST-PAGED-GROSS")).toBeTruthy();
  });

  it.each([
    ["malformed", { totalDocuments: "1" }],
    ["excessive", { totalDocuments: 50001 }],
  ])("surfaces a load error for %s pagination metadata", async (_case, metadata) => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getPaidBreakdownReportAdmin.mockResolvedValueOnce({
      ...reportPayload("INVALID-PAGINATION"),
      ...metadata,
    });

    try {
      render(<PaidReportAdmin />);
      await waitFor(() => expect(message.error).toHaveBeenCalledTimes(1));
      expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("INVALID-PAGINATION")).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("rejects a Gross response that arrives for the active Net request", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getPaidBreakdownReportAdmin.mockResolvedValueOnce(
      reportPayload("MISMATCHED-MODE", { reportMode: "gross" }),
    );

    try {
      render(<PaidReportAdmin />);
      await waitFor(() => expect(message.error).toHaveBeenCalledTimes(1));
      expect(screen.queryByText("MISMATCHED-MODE")).toBeNull();
      expect(screen.queryByText("100.00")).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });

  it.each(["root", "scorecard", "row"])(
    "rejects a paid response with a missing %s total-mode echo",
    async (missingMode) => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const payload = reportPayload("MISSING-MODE");
      if (missingMode === "root") delete payload.totalMode;
      if (missingMode === "scorecard") delete payload.scorecards.totalMode;
      if (missingMode === "row") delete payload.data[0].report_total_mode;
      getPaidBreakdownReportAdmin.mockResolvedValueOnce(payload);

      try {
        render(<PaidReportAdmin />);
        await waitFor(() => expect(message.error).toHaveBeenCalledTimes(1));
        expect(screen.queryByText("MISSING-MODE")).toBeNull();
      } finally {
        consoleError.mockRestore();
      }
    },
  );

  it("localizes every paid money heading to SAR and pins the mobile RTL first column to the right", async () => {
    mockChosenLanguage = "Arabic";
    getPaidBreakdownReportAdmin.mockResolvedValueOnce(reportPayload("ARABIC-SAR"));
    XLSX.utils.json_to_sheet.mockReturnValue({});
    XLSX.utils.book_new.mockReturnValue({});
    XLSX.utils.encode_range.mockReturnValue("A1:Z3");

    render(<PaidReportAdmin />);
    expect(await screen.findByText("ARABIC-SAR")).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "الصافي (ر.س)" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", {
        name: "مدفوع في الفندق (نقداً) (ر.س)",
      }),
    ).toBeTruthy();
    expect(screen.getByText("إجمالي تفاصيل الدفع (ر.س)")).toBeTruthy();
    expect(document.querySelector('[dir="rtl"]')).toBeTruthy();

    const stylesheetText = Array.from(document.styleSheets)
      .flatMap((stylesheet) => Array.from(stylesheet.cssRules || []))
      .map((rule) => rule.cssText)
      .join(" ");
    expect(stylesheetText).toMatch(/left:\s*auto;?\s*right:\s*0(?:px)?/);

    fireEvent.click(screen.getByRole("button", { name: "تصدير إكسل" }));
    await waitFor(() => expect(XLSX.utils.json_to_sheet).toHaveBeenCalled());
    const [, options] = XLSX.utils.json_to_sheet.mock.calls[0];
    expect(options.header).toEqual(
      expect.arrayContaining([
        "مدفوع في الفندق (نقداً) (ر.س)",
        "إجمالي المدفوع (ر.س)",
        "الصافي (ر.س)",
        "المتبقي (ر.س)",
      ]),
    );
  });

  it("shows unavailable canonical totals as N/A and exports blank cells", async () => {
    getPaidBreakdownReportAdmin.mockResolvedValueOnce(
      reportPayload("UNAVAILABLE", {
        reportTotal: null,
        paidTotal: 12,
        available: false,
      }),
    );
    XLSX.utils.json_to_sheet.mockReturnValue({});
    XLSX.utils.book_new.mockReturnValue({});
    XLSX.utils.encode_range.mockReturnValue("A1:Z3");

    render(<PaidReportAdmin />);
    expect(await screen.findByText("UNAVAILABLE")).toBeTruthy();
    const cells = cellsForConfirmation("UNAVAILABLE");
    expect(cells[13].textContent).toBe("12.00");
    expect(cells[14].textContent).toBe("N/A");
    expect(cells[15].textContent).toBe("N/A");
    expect(screen.queryByText("Net Total (SAR)", { selector: "span" })).toBeNull();
    expect(scorecardValue("Paid Amount (SAR)")).toBe("12.00");
    expect(
      screen.getByTestId("paid-scorecard-coverage-notice").textContent,
    ).toContain("0/1 reservations");
    const footerCells = screen.getByRole("table").querySelector("tfoot tr").children;
    expect(footerCells[13].textContent).toBe("12.00");
    expect(footerCells[14].textContent).toBe("N/A");
    expect(footerCells[15].textContent).toBe("N/A");

    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    await waitFor(() => expect(XLSX.utils.json_to_sheet).toHaveBeenCalled());
    const [exportRows, options] = XLSX.utils.json_to_sheet.mock.calls[0];
    expect(options.header).toContain("Net Total (SAR)");
    expect(exportRows[0]["Net Total (SAR)"]).toBe("");
    expect(exportRows[0]["Remaining (SAR)"]).toBe("");
    expect(exportRows[0]["Total Paid (SAR)"]).toBe(12);
  });

  it("shows the verified available subtotal while excluded rows stay N/A and paid cash stays complete", async () => {
    getPaidBreakdownReportAdmin
      .mockResolvedValueOnce(partialReportPayload())
      .mockResolvedValueOnce(
        partialReportPayload({
          reportTotal: 120.2,
          availablePaid: 20.05,
          reportMode: "gross",
        }),
      );
    XLSX.utils.json_to_sheet.mockReturnValue({});
    XLSX.utils.book_new.mockReturnValue({});
    XLSX.utils.encode_range.mockReturnValue("A1:Z4");

    render(<PaidReportAdmin />);
    expect(await screen.findByText("EXCLUDED")).toBeTruthy();

    expect(
      screen.queryByText("Available Net Subtotal (SAR)", { selector: "span" }),
    ).toBeNull();
    expect(scorecardValue("Paid Amount (SAR)")).toBe("32.07");
    expect(
      screen.getByTestId("paid-scorecard-coverage-notice").textContent,
    ).toContain("1/2 reservations");
    expect(
      screen.getByTestId("paid-scorecard-coverage-notice").textContent,
    ).toContain("Paid amounts are unchanged");
    expect(
      screen.getByTestId("paid-table-coverage-notice").textContent,
    ).toContain("available SAR rows only (1/2)");

    const excludedCells = cellsForConfirmation("EXCLUDED");
    expect(excludedCells[13].textContent).toBe("12.02");
    expect(excludedCells[14].textContent).toBe("N/A");
    expect(excludedCells[15].textContent).toBe("N/A");

    const footerCells = screen.getByRole("table").querySelector("tfoot tr").children;
    expect(footerCells[13].textContent).toBe("32.07");
    expect(footerCells[14].textContent).toBe("100.10");
    expect(footerCells[15].textContent).toBe("80.05");

    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    await waitFor(() => expect(XLSX.utils.json_to_sheet).toHaveBeenCalled());
    const [exportRows] = XLSX.utils.json_to_sheet.mock.calls[0];
    expect(exportRows[1]["Net Total (SAR)"]).toBe("");
    expect(exportRows[1]["Remaining (SAR)"]).toBe("");
    expect(exportRows[2]["Name"]).toBe(
      "Totals — selected total/remaining available rows: 1/2",
    );
    expect(exportRows[2]["Total Paid (SAR)"]).toBeCloseTo(32.07, 8);
    expect(exportRows[2]["Net Total (SAR)"]).toBe(100.1);
    expect(exportRows[2]["Remaining (SAR)"]).toBe(80.05);

    fireEvent.click(screen.getByRole("button", { name: "Gross Total" }));
    await waitFor(() =>
      expect(getPaidBreakdownReportAdmin).toHaveBeenLastCalledWith(
        "admin-1",
        "token-1",
        expect.objectContaining({ totalMode: "gross" }),
      ),
    );
    expect(
      screen.queryByText("Available Gross Subtotal (SAR)", { selector: "span" }),
    ).toBeNull();
    expect(await screen.findByText("EXCLUDED")).toBeTruthy();
    expect(cellsForConfirmation("EXCLUDED")[13].textContent).toBe("12.02");
  });

  it("reports the current 388/389 verified coverage without hiding the SAR subtotal", async () => {
    const payload = partialReportPayload({
      reportTotal: 69305.35,
      financialIncludedCount: 388,
      netFallbackCount: 1,
    });
    payload.data = [
      payload.data[0],
      ...Array.from({ length: 387 }, (_value, index) =>
        reservationRow(`AVAILABLE-ZERO-${index + 2}`, {
          reportTotal: 0,
          paidTotal: 0,
        }),
      ),
      payload.data[1],
    ];
    payload.totalDocuments = 389;
    getPaidBreakdownReportAdmin.mockResolvedValueOnce(payload);

    render(<PaidReportAdmin />);
    expect(await screen.findByText("EXCLUDED")).toBeTruthy();
    expect(
      screen.queryByText("Available Net Subtotal (SAR)", { selector: "span" }),
    ).toBeNull();
    expect(
      screen.getByTestId("paid-scorecard-coverage-notice").textContent,
    ).toContain("388/389 reservations");
    expect(
      screen.getByTestId("paid-scorecard-coverage-notice").textContent,
    ).toContain("Gross was used when Net was unavailable for 1");
    const footerCells = screen.getByRole("table").querySelector("tfoot tr").children;
    expect(footerCells[0].textContent).toBe("Available subtotal");
    expect(footerCells[14].textContent).toBe("69,305.35");
  });

  it("preserves valid zero and negative canonical totals without changing raw paid aggregation", async () => {
    getPaidBreakdownReportAdmin.mockResolvedValueOnce({
      data: [
        reservationRow("ZERO-TOTAL", { reportTotal: 0, paidTotal: 0.005 }),
        reservationRow("ONE-TENTH", { reportTotal: 0.1, paidTotal: 0.005 }),
        reservationRow("TWO-TENTHS", { reportTotal: 0.2, paidTotal: 0.005 }),
        reservationRow("NEGATIVE-TOTAL", {
          reportTotal: -0.3,
          paidTotal: 0.005,
        }),
      ],
      totalDocuments: 4,
      page: 1,
      limit: 500,
      totalMode: "net",
      scorecards: {
        totalAmount: 0,
        paidAmount: 0.02,
        breakdownTotals: { paid_at_hotel_cash: 0.02 },
        financialMetadata: {
          netFallback: 0,
          unavailable: 0,
          foreignCurrency: 0,
        },
        financialIncludedCount: 4,
        totalMode: "net",
      },
    });

    render(<PaidReportAdmin />);
    expect(await screen.findByText("NEGATIVE-TOTAL")).toBeTruthy();
    expect(cellsForConfirmation("ZERO-TOTAL")[14].textContent).toBe("0.00");
    expect(cellsForConfirmation("NEGATIVE-TOTAL")[14].textContent).toBe("-0.30");
    const footerCells = screen.getByRole("table").querySelector("tfoot tr").children;
    expect(footerCells[13].textContent).toBe("0.02");
    expect(footerCells[14].textContent).toBe("0.00");
    expect(footerCells[15].textContent).toBe("0.28");
    expect(screen.queryByTestId("paid-scorecard-coverage-notice")).toBeNull();
  });

  it("explains partial SAR coverage in Arabic, including a foreign-currency exclusion", async () => {
    mockChosenLanguage = "Arabic";
    getPaidBreakdownReportAdmin.mockResolvedValueOnce(
      partialReportPayload({ unavailableCount: 0, foreignCurrencyCount: 1 }),
    );

    render(<PaidReportAdmin />);
    expect(await screen.findByText("EXCLUDED")).toBeTruthy();
    expect(
      screen.queryByText("المجموع الفرعي الصافي المتاح (ر.س)", {
        selector: "span",
      }),
    ).toBeNull();
    expect(scorecardValue("إجمالي المدفوع (ر.س)")).toBe("32.07");
    expect(
      screen.getByTestId("paid-scorecard-coverage-notice").textContent,
    ).toContain("1/2 حجزًا ضمن نطاق الفندق والتاريخ");
    expect(
      screen.getByTestId("paid-scorecard-coverage-notice").textContent,
    ).toContain("استُبعد 1 من هذا المجموع الفرعي");
    expect(cellsForConfirmation("EXCLUDED")[14].textContent).toBe("غير متاح");
  });

  it("discloses the verified Gross fallback when Net is unavailable", async () => {
    getPaidBreakdownReportAdmin.mockResolvedValueOnce(
      reportPayload("NET-FALLBACK", {
        reportTotal: 80,
        paidTotal: 20,
        netFallback: true,
      }),
    );

    render(<PaidReportAdmin />);
    expect(await screen.findByText("NET-FALLBACK")).toBeTruthy();
    expect(
      screen.getByTestId("paid-scorecard-coverage-notice").textContent,
    ).toContain("Verified Gross was used when Net was unavailable for 1");
    expect(
      screen.getByTestId("paid-table-coverage-notice").textContent,
    ).toContain("Verified Gross was used when Net was unavailable in 1 row");
    expect(cellsForConfirmation("NET-FALLBACK")[14].textContent).toBe("80.00");
  });

  it("fails the scorecard closed when financial coverage counts are malformed", async () => {
    const payload = reportPayload("MISSING-COVERAGE", {
      reportTotal: 125,
      paidTotal: 25,
    });
    payload.scorecards = {
      ...payload.scorecards,
      financialIncludedCount: "1",
    };
    getPaidBreakdownReportAdmin.mockResolvedValueOnce(payload);

    render(<PaidReportAdmin />);
    expect(await screen.findByText("MISSING-COVERAGE")).toBeTruthy();
    expect(screen.queryByText("Net Total (SAR)", { selector: "span" })).toBeNull();
    expect(scorecardValue("Paid Amount (SAR)")).toBe("25.00");
    expect(screen.queryByTestId("paid-scorecard-coverage-notice")).toBeNull();
    expect(cellsForConfirmation("MISSING-COVERAGE")[14].textContent).toBe(
      "125.00",
    );
  });

  it.each([
    ["missing", undefined],
    ["null", null],
  ])(
    "fails the scorecard closed when financial metadata is %s",
    async (_case, financialMetadata) => {
      const payload = reportPayload("ABSENT-COVERAGE", {
        reportTotal: 125,
        paidTotal: 25,
      });
      payload.scorecards = { ...payload.scorecards, financialMetadata };
      getPaidBreakdownReportAdmin.mockResolvedValueOnce(payload);

      render(<PaidReportAdmin />);
      expect(await screen.findByText("ABSENT-COVERAGE")).toBeTruthy();
      expect(
        screen.queryByText("Net Total (SAR)", { selector: "span" }),
      ).toBeNull();
      expect(scorecardValue("Paid Amount (SAR)")).toBe("25.00");
      expect(screen.queryByTestId("paid-scorecard-coverage-notice")).toBeNull();
    },
  );

  it.each([true, "125"])(
    "does not coerce malformed canonical money value %p into SAR",
    async (reportTotal) => {
      getPaidBreakdownReportAdmin.mockResolvedValueOnce(
        reportPayload("MALFORMED-MONEY", { reportTotal, paidTotal: 25 }),
      );

      render(<PaidReportAdmin />);
      expect(await screen.findByText("MALFORMED-MONEY")).toBeTruthy();
      expect(
        screen.queryByText("Net Total (SAR)", { selector: "span" }),
      ).toBeNull();
      expect(scorecardValue("Paid Amount (SAR)")).toBe("25.00");
      expect(cellsForConfirmation("MALFORMED-MONEY")[14].textContent).toBe(
        "N/A",
      );
    },
  );

  it("rejects a nonzero subtotal for an explicitly empty financial scope", async () => {
    const payload = reportPayload("EMPTY-SCOPE");
    payload.data = [];
    payload.totalDocuments = 0;
    payload.scorecards = {
      ...payload.scorecards,
      totalAmount: 99,
      paidAmount: 0,
      breakdownTotals: {},
      financialMetadata: {
        netFallback: 0,
        unavailable: 0,
        foreignCurrency: 0,
      },
      financialIncludedCount: 0,
    };
    getPaidBreakdownReportAdmin.mockResolvedValueOnce(payload);

    render(<PaidReportAdmin />);
    expect(await screen.findByText("No paid breakdown records found.")).toBeTruthy();
    expect(screen.queryByText("Net Total (SAR)", { selector: "span" })).toBeNull();
    expect(scorecardValue("Paid Amount (SAR)")).toBe("0.00");
  });

  it("filters the table from a clickable payment card and applies category-specific reconciliation status", async () => {
    const otherPlatforms = reservationRow("OTHER-PLATFORMS", {
      reportTotal: 100,
      paidTotal: 60,
    });
    otherPlatforms.paid_amount_breakdown = {
      paid_at_hotel_cash: 10,
      paid_online_other_platforms: 50,
    };
    otherPlatforms.paid_breakdown_total = 60;
    otherPlatforms.payment_reconciliation = {
      breakdown: {
        paid_online_other_platforms: {
          status: "reconciled",
          amountCents: 5000,
        },
      },
    };
    const cashOnly = reservationRow("CASH-ONLY", {
      reportTotal: 80,
      paidTotal: 20,
    });
    getPaidBreakdownReportAdmin.mockResolvedValueOnce({
      data: [otherPlatforms, cashOnly],
      totalDocuments: 2,
      page: 1,
      limit: 500,
      totalMode: "net",
      scorecards: {
        totalAmount: 180,
        paidAmount: 80,
        breakdownTotals: {
          paid_at_hotel_cash: 30,
          paid_online_other_platforms: 50,
        },
        financialMetadata: {
          netFallback: 0,
          unavailable: 0,
          foreignCurrency: 0,
        },
        financialIncludedCount: 2,
        totalMode: "net",
        reconciliationSummary: {
          totalPaidAmount: 80,
          reconciledAmount: 50,
          waitingAmount: 30,
        },
      },
    });

    render(<PaidReportAdmin />);
    expect(await screen.findByText("OTHER-PLATFORMS")).toBeTruthy();
    expect(screen.getByText("CASH-ONLY")).toBeTruthy();
    expect(scorecardValue("Reconciled (SAR)")).toBe("50.00");
    expect(scorecardValue("Awaiting Reconciliation (SAR)")).toBe("30.00");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Paid Online \(Other Platforms\) \(SAR\)/,
      }),
    );
    expect(screen.getByText("OTHER-PLATFORMS")).toBeTruthy();
    expect(screen.queryByText("CASH-ONLY")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: /^Reconciled \(SAR\)/ }),
    );
    expect(screen.getByText("OTHER-PLATFORMS")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /^Awaiting Reconciliation \(SAR\)/ }),
    );
    expect(screen.queryByText("OTHER-PLATFORMS")).toBeNull();
    expect(screen.getByText("No paid breakdown records found.")).toBeTruthy();
  });

  it("shows a mixed row in both reconciliation card filters and exports its honest status", async () => {
    const mixed = reservationRow("MIXED-PAYMENTS", {
      reportTotal: 100,
      paidTotal: 60,
    });
    mixed.paid_amount_breakdown = {
      paid_at_hotel_cash: 10,
      paid_online_other_platforms: 50,
    };
    mixed.payment_reconciliation = {
      breakdown: {
        paid_online_other_platforms: {
          status: "reconciled",
          amountCents: 5000,
        },
      },
    };
    getPaidBreakdownReportAdmin.mockResolvedValueOnce({
      data: [mixed],
      totalDocuments: 1,
      page: 1,
      limit: 500,
      totalMode: "net",
      scorecards: {
        totalAmount: 100,
        paidAmount: 60,
        breakdownTotals: {
          paid_at_hotel_cash: 10,
          paid_online_other_platforms: 50,
        },
        financialMetadata: {
          netFallback: 0,
          unavailable: 0,
          foreignCurrency: 0,
        },
        financialIncludedCount: 1,
        totalMode: "net",
        reconciliationSummary: {
          totalPaidAmount: 60,
          reconciledAmount: 50,
          waitingAmount: 10,
        },
      },
    });
    XLSX.utils.json_to_sheet.mockReturnValue({});
    XLSX.utils.book_new.mockReturnValue({});
    XLSX.utils.encode_range.mockReturnValue("A1:Z3");

    render(<PaidReportAdmin />);
    expect(await screen.findByText("MIXED-PAYMENTS")).toBeTruthy();
    expect(screen.getByText("Partially reconciled")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: /^Reconciled \(SAR\)/ }),
    );
    expect(screen.getByText("MIXED-PAYMENTS")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /^Awaiting Reconciliation \(SAR\)/ }),
    );
    expect(screen.getByText("MIXED-PAYMENTS")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    await waitFor(() => expect(XLSX.utils.json_to_sheet).toHaveBeenCalled());
    const [exportRows] = XLSX.utils.json_to_sheet.mock.calls[0];
    expect(exportRows[0]["Reconciliation Status"]).toBe(
      "Partially reconciled",
    );
  });

  it("includes room details and booking source in paid exports", async () => {
    getPaidBreakdownReportAdmin.mockResolvedValueOnce(
      reportPayload("EXPORT-ROOM"),
    );
    XLSX.utils.json_to_sheet.mockReturnValue({});
    XLSX.utils.book_new.mockReturnValue({});
    XLSX.utils.encode_range.mockReturnValue("A1:Z3");

    render(<PaidReportAdmin />);
    expect(await screen.findByText("EXPORT-ROOM")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));

    await waitFor(() => expect(XLSX.utils.json_to_sheet).toHaveBeenCalled());
    const [exportRows, options] = XLSX.utils.json_to_sheet.mock.calls[0];
    expect(options.header).toContain("Room Type");
    expect(options.header).toContain("Room Number");
    expect(options.header).toContain("Booking Source");
    expect(exportRows[0]["Room Type"]).toBe("Family Quintuple");
    expect(exportRows[0]["Room Number"]).toBe("424");
    expect(exportRows[0]["Booking Source"]).toBe("agoda");
  });

  it("serializes exact date ranges for the paid endpoint without scalar boundaries", async () => {
    const { getPaidBreakdownReportAdmin: callPaidReportApi } =
      jest.requireActual("../apiAdmin");
    const previousFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });

    try {
      await callPaidReportApi("admin-1", "token-1", {
        hotelId: AJYAD_HOTEL_ID,
        dateBy: "checkout_date",
        dateFrom: "2026-01-01",
        dateTo: "2026-12-31",
        dateRanges: [
          { dateFrom: "2026-08-15", dateTo: "2026-09-12" },
          { dateFrom: "2026-06-16", dateTo: "2026-07-14" },
          { dateFrom: "2026-08-15", dateTo: "2026-09-12" },
        ],
        totalMode: "net",
      });

      const requestUrl = new URL(
        global.fetch.mock.calls[0][0],
        "https://xhotelpro.test",
      );
      expect(requestUrl.searchParams.get("dateRanges")).toBe(
        "2026-06-16..2026-07-14,2026-08-15..2026-09-12",
      );
      expect(requestUrl.searchParams.has("dateFrom")).toBe(false);
      expect(requestUrl.searchParams.has("dateTo")).toBe(false);
      expect(requestUrl.searchParams.get("totalMode")).toBe("net");
    } finally {
      global.fetch = previousFetch;
    }
  });
});
