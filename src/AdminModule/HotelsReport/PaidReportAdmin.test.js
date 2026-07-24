import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  gettingHotelDetailsForAdmin,
  getPaidBreakdownReportAdmin,
} from "../apiAdmin";
import PaidReportAdmin from "./PaidReportAdmin";
import * as XLSX from "xlsx";

jest.mock("../../auth", () => ({
  isAuthenticated: () => ({ user: { _id: "admin-1" }, token: "token-1" }),
}));

jest.mock("../../cart_context", () => ({
  useCartContext: () => ({ chosenLanguage: "English" }),
}));

jest.mock("../apiAdmin", () => ({
  gettingHotelDetailsForAdmin: jest.fn(),
  getPaidBreakdownReportAdmin: jest.fn(),
}));

jest.mock("../AllReservation/MoreDetails", () => () => null);

jest.mock("./PaidReportDateControls", () => ({ disabled, onApply }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() =>
      onApply({
        dateBy: "checkout_date",
        dateFrom: "2026-07-14",
        dateTo: "2026-07-15",
      })
    }
  >
    Apply test dates
  </button>
));

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

const reportPayload = (confirmationNumber) => ({
  data: [
    {
      _id: confirmationNumber,
      confirmation_number: confirmationNumber,
      customer_details: { name: `Guest ${confirmationNumber}` },
      hotelId: { _id: "hotel-1", hotelName: "Test Hotel" },
      checkin_date: "2026-07-14T00:00:00.000Z",
      checkout_date: "2026-07-15T00:00:00.000Z",
      paid_amount_breakdown: { paid_at_hotel_cash: 100 },
      total_amount: 100,
      pickedRoomsType: [
        { room_type: "familyRooms", displayName: "Family Quintuple" },
      ],
      roomDetails: [
        { room_number: "424", room_type: "familyRooms" },
      ],
    },
  ],
  scorecards: {
    totalAmount: 100,
    paidAmount: 100,
    breakdownTotals: { paid_at_hotel_cash: 100 },
  },
});

describe("PaidReportAdmin request sequencing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gettingHotelDetailsForAdmin.mockResolvedValue([
      { _id: "hotel-1", hotelName: "Test Hotel" },
    ]);
  });

  it("does not let an older report response overwrite a newer date-filter result", async () => {
    const olderRequest = deferred();
    const newerRequest = deferred();
    getPaidBreakdownReportAdmin
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise);

    render(<PaidReportAdmin />);
    expect(
      await screen.findByRole("option", { name: "Test Hotel" }),
    ).toBeTruthy();

    const hotelControl = screen.getByLabelText("Select hotel");
    const dateControl = screen.getByRole("button", {
      name: "Apply test dates",
    });
    const searchControl = screen.getByLabelText(
      "Search by confirmation, phone, name, or hotel name...",
    );
    expect(
      hotelControl.compareDocumentPosition(dateControl) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      dateControl.compareDocumentPosition(searchControl) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.change(hotelControl, {
      target: { value: "hotel-1" },
    });
    await waitFor(() =>
      expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(1),
    );

    fireEvent.click(screen.getByRole("button", { name: "Apply test dates" }));
    await waitFor(() =>
      expect(getPaidBreakdownReportAdmin).toHaveBeenCalledTimes(2),
    );
    expect(getPaidBreakdownReportAdmin.mock.calls[1][2]).toMatchObject({
      dateBy: "checkout_date",
      dateFrom: "2026-07-14",
      dateTo: "2026-07-15",
    });

    await act(async () => {
      newerRequest.resolve(reportPayload("NEW-RESULT"));
      await newerRequest.promise;
    });
    expect(await screen.findByText("NEW-RESULT")).toBeTruthy();

    await act(async () => {
      olderRequest.resolve(reportPayload("OLD-RESULT"));
      await olderRequest.promise;
    });
    expect(screen.queryByText("OLD-RESULT")).toBeNull();
    expect(screen.getByText("NEW-RESULT")).toBeTruthy();
  });

  it("includes room type and assigned room number in paid exports", async () => {
    getPaidBreakdownReportAdmin.mockResolvedValue(reportPayload("EXPORT-ROOM"));
    XLSX.utils.json_to_sheet.mockReturnValue({});
    XLSX.utils.book_new.mockReturnValue({});
    XLSX.utils.encode_range.mockReturnValue("A1:Z3");

    render(<PaidReportAdmin />);
    expect(
      await screen.findByRole("option", { name: "Test Hotel" }),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Select hotel"), {
      target: { value: "hotel-1" },
    });
    expect(await screen.findByText("EXPORT-ROOM")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));

    await waitFor(() => expect(XLSX.utils.json_to_sheet).toHaveBeenCalled());
    const [exportRows, options] = XLSX.utils.json_to_sheet.mock.calls[0];
    expect(options.header).toContain("Room Type");
    expect(options.header).toContain("Room Number");
    expect(exportRows[0]["Room Type"]).toBe(
      "familyRooms - Family Quintuple",
    );
    expect(exportRows[0]["Room Number"]).toBe("424");
  });
});
