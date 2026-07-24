import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EnhancedContentTable, {
  ADMIN_RESERVATION_TABLE_COLUMN_WIDTHS,
  ADMIN_RESERVATION_TABLE_MIN_WIDTH,
} from "./EnhancedContentTable";

jest.mock("@ant-design/icons", () => ({
  CalendarOutlined: () => <span aria-hidden="true" />,
  SyncOutlined: () => <span aria-hidden="true" />,
}));

jest.mock("antd", () => ({
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
  Input: ({ value, onChange, onKeyDown, placeholder, disabled }) => (
    <input
      value={value || ""}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
    />
  ),
  Modal: ({ children, open }) => (open ? <div>{children}</div> : null),
  Tooltip: ({ children }) => children,
  Checkbox: ({ children }) => <label>{children}</label>,
  message: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
}));

jest.mock("./ScoreCards", () => () => null);
jest.mock("./MoreDetails", () => () => null);
jest.mock("./ExportToExcelButton", () => () => null);
jest.mock("./DateFilterModal", () => () => null);
jest.mock("../apiAdmin", () => ({
  applyOtaReservationSyncJob: jest.fn(),
  prepareOtaReservationSyncJob: jest.fn(),
  readOtaReservationSyncJob: jest.fn(),
  runOtaReservationSyncCollector: jest.fn(),
  submitOtaReservationSyncMfaCode: jest.fn(),
}));

const reservation = ({
  id,
  guest,
  total,
  net,
  mode = "admin_three_price",
}) => ({
  _id: id,
  confirmation_number: id,
  customer_details: { name: guest },
  hotelId: { hotelName: "Test Hotel" },
  booking_source: "Direct",
  reservation_status: "confirmed",
  payment: "not paid",
  createdAt: "2026-07-15T00:00:00.000Z",
  checkin_date: "2026-07-15T00:00:00.000Z",
  checkout_date: "2026-07-16T00:00:00.000Z",
  days_of_residence: 1,
  total_amount: total,
  roomId: [
    {
      room_number: "101",
      room_type: "doubleRooms",
      display_name: "City View",
    },
  ],
  adminPricing: { mode, netAfterExpensesTotal: net },
});

const renderTable = ({ data, fromPage = "AllReservations" }) =>
  render(
    <MemoryRouter>
      <EnhancedContentTable
        data={data}
        totalDocuments={data.length}
        currentPage={1}
        pageSize={10}
        setCurrentPage={jest.fn()}
        setPageSize={jest.fn()}
        searchTerm=""
        setSearchTerm={jest.fn()}
        handleSearch={jest.fn()}
        fromPage={fromPage}
        scorecardsObject={{}}
        allHotelDetailsAdmin={[]}
      />
    </MemoryRouter>,
  );

const totalCellTextFor = (guest) => {
  const headers = screen
    .getAllByRole("columnheader")
    .map((header) => header.textContent.trim());
  const totalIndex = headers.indexOf("Total");
  const row = screen.getByRole("row", { name: new RegExp(guest) });
  return within(row)
    .getAllByRole("cell")[totalIndex]
    .textContent.replace(/\s+/g, " ")
    .trim();
};

describe("EnhancedContentTable total amount column", () => {
  it("shows net after expenses with a safe total_amount fallback on all reservations", () => {
    const netReservation = reservation({
      id: "NET",
      guest: "Net Guest",
      total: 1200,
      net: 950,
    });
    const fallbackReservation = reservation({
      id: "FALLBACK",
      guest: "Fallback Guest",
      total: 800,
      net: null,
      mode: "standard",
    });
    const zeroReservation = reservation({
      id: "ZERO",
      guest: "Zero Guest",
      total: 500,
      net: 0,
    });
    const { container } = renderTable({
      data: [netReservation, fallbackReservation, zeroReservation],
    });

    expect(totalCellTextFor("Net Guest")).toBe("950.00 SAR");
    expect(totalCellTextFor("Fallback Guest")).toBe("800.00 SAR");
    expect(totalCellTextFor("Zero Guest")).toBe("0.00 SAR");
    const headers = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent.trim());
    const roomNumberIndex = headers.indexOf("Room #");
    const priceIndex = headers.indexOf("Price/Day");
    const netGuestCells = within(screen.getByRole("row", { name: /Net Guest/ }))
      .getAllByRole("cell");
    expect(netGuestCells[roomNumberIndex].textContent).toBe("101");
	expect(headers).not.toContain("Room Type");
	expect(ADMIN_RESERVATION_TABLE_COLUMN_WIDTHS).toHaveLength(headers.length);
	expect(ADMIN_RESERVATION_TABLE_MIN_WIDTH).toBe(1462);
	expect(container.querySelectorAll("colgroup col")).toHaveLength(headers.length);
    expect(
      netGuestCells[priceIndex]
        .textContent.replace(/\s+/g, " ")
        .trim(),
    ).toBe("1200.00 SAR");
    expect(netReservation).not.toHaveProperty("display_total_amount");
  });

  it("keeps shared report tables on total_amount", () => {
    renderTable({
      fromPage: "reports",
      data: [
        reservation({
          id: "REPORT",
          guest: "Report Guest",
          total: 1200,
          net: 950,
        }),
      ],
    });

    expect(totalCellTextFor("Report Guest")).toBe("1200.00 SAR");
	expect(screen.queryByText("Reserved By:")).toBeNull();
	expect(screen.queryByText("Booking Source:")).toBeNull();
  });

  it("sorts the Total column by the value shown to the admin", () => {
    renderTable({
      data: [
        reservation({ id: "HIGH", guest: "High Net", total: 900, net: 800 }),
        reservation({ id: "LOW", guest: "Low Net", total: 1000, net: 100 }),
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Total" }));
    const rows = screen.getAllByRole("row").slice(1, 3);
    expect(rows[0].textContent).toContain("Low Net");
    expect(rows[1].textContent).toContain("High Net");
  });
});
