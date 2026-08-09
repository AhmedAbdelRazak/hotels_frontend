import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EnhancedContentTable, {
  ADMIN_RESERVATION_TABLE_COLUMN_WIDTHS,
  ADMIN_RESERVATION_TABLE_MIN_WIDTH,
} from "./EnhancedContentTable";
import { getAdminReservationById } from "../apiAdmin";

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
  Spin: () => <div data-testid="details-spinner" />,
  Tooltip: ({ children }) => children,
  Checkbox: ({ children }) => <label>{children}</label>,
  message: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
}));

jest.mock("./ScoreCards", () => () => null);
jest.mock("./MoreDetails", () => ({ reservation }) => (
  <div data-testid="hydrated-reservation-details">
    {reservation?.pickedRoomsType?.[0]?.pricingByDay?.length || 0}:
    {reservation?.pickedRoomsType?.[0]?.pricingByDay?.[0]?.clientPrice ??
      "no-nightly-price"}
  </div>
));
jest.mock("./ExportToExcelButton", () => ({
  data,
  exportCurrentData,
  chosenLanguage,
}) => (
  <div
    data-testid="reservation-export"
    data-direct={String(exportCurrentData)}
    data-language={chosenLanguage}
  >
    {data.map((row) => row.confirmation_number).join(",")}
  </div>
));
jest.mock("./DateFilterModal", () => () => null);
jest.mock("../apiAdmin", () => ({
  applyOtaReservationSyncJob: jest.fn(),
  getAdminReservationById: jest.fn(),
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

const tableElement = ({
  data,
  fromPage = "AllReservations",
  chosenLanguage = "English",
  token = "",
  initialEntry = "/admin/all-reservations",
}) => (
  <MemoryRouter initialEntries={[initialEntry]}>
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
      token={token}
      chosenLanguage={chosenLanguage}
    />
  </MemoryRouter>
);

const renderTable = (options) => render(tableElement(options));

beforeEach(() => {
  jest.clearAllMocks();
});

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

const cellTextFor = (guest, headerLabel) => {
  const headers = screen
    .getAllByRole("columnheader")
    .map((header) => header.textContent.trim());
  const index = headers.indexOf(headerLabel);
  return within(screen.getByRole("row", { name: new RegExp(guest) }))
    .getAllByRole("cell")[index]
    .textContent.replace(/\s+/g, " ")
    .trim();
};

describe("EnhancedContentTable total amount column", () => {
  it("shows the saved guest total in the Total column on all reservations", () => {
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

    expect(totalCellTextFor("Net Guest")).toBe("1200.00 SAR");
    expect(totalCellTextFor("Fallback Guest")).toBe("800.00 SAR");
    expect(totalCellTextFor("Zero Guest")).toBe("500.00 SAR");
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
	expect(ADMIN_RESERVATION_TABLE_MIN_WIDTH).toBe(1588);
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
	expect(
	  screen.getByTestId("reservation-export").getAttribute("data-direct"),
	).toBe("true");
	expect(screen.getByTestId("reservation-export").textContent).toContain(
	  "REPORT",
	);
  });

  it("uses only a verified HotelRunner property gross and fails closed for unverified PMS totals", () => {
    const canonical = reservation({
      id: "HR-CANONICAL",
      guest: "Canonical Guest",
      total: 700,
      net: null,
      mode: "hotelrunner_api",
    });
    canonical.supplierData = {
      hotelRunner: {
        transport: "hotelrunner_api",
        reservationId: "hr-canonical",
        pricing: { grandTotal: 1000 },
      },
      hotelRunnerEmailCommercialEvidence: {
        version: 2,
        verified: true,
        source: "authenticated_ota_email",
        provider: "agoda",
        grossTotalSar: 700,
        currency: "SAR",
        evidenceHash: "a".repeat(64),
      },
    };
    canonical.days_of_residence = 2;

    const missing = reservation({
      id: "HR-MISSING",
      guest: "Missing Gross Guest",
      total: 700,
      net: null,
      mode: "hotelrunner_api",
    });
    missing.supplierData = {
      hotelRunner: {
        transport: "hotelrunner_api",
        reservationId: "hr-missing",
      },
    };

    renderTable({ data: [canonical, missing], fromPage: "reports" });

    expect(totalCellTextFor("Canonical Guest")).toBe("700.00 SAR");
    expect(cellTextFor("Canonical Guest", "Price/Day")).toBe("350.00 SAR");
    expect(totalCellTextFor("Missing Gross Guest")).toBe("—");
    expect(cellTextFor("Missing Gross Guest", "Price/Day")).toBe("—");
  });

  it("shows the verified Agoda guest total for HR-linked rows instead of the raw payout", () => {
    const emailReservation = reservation({
      id: "5285396222",
      guest: "Nawaz Shahid",
      total: 77.42,
      net: 47.9,
    });
    const hotelRunnerReservation = reservation({
      id: "1799546267",
      guest: "Mays Mohmadi",
      total: 91.14,
      net: 56.39,
      mode: "hotelrunner_api",
    });
    hotelRunnerReservation.adminPricing.commercialVerified = true;
    hotelRunnerReservation.adminPricing.clientTotal = 91.14;
    hotelRunnerReservation.supplierData = {
      hotelRunner: {
        transport: "hotelrunner_api",
        reservationId: "r071469597",
        pricing: { grandTotal: 56.39 },
      },
      hotelRunnerEmailCommercialEvidence: {
        version: 2,
        verified: true,
        source: "authenticated_ota_email",
        provider: "agoda",
        grossTotalSar: 91.14,
        currency: "SAR",
        evidenceHash: "b".repeat(64),
      },
    };

    renderTable({ data: [emailReservation, hotelRunnerReservation] });

    expect(cellTextFor("Nawaz Shahid", "Price/Day")).toBe("77.42 SAR");
    expect(totalCellTextFor("Nawaz Shahid")).toBe("77.42 SAR");
    expect(cellTextFor("Mays Mohmadi", "Price/Day")).toBe("91.14 SAR");
    expect(totalCellTextFor("Mays Mohmadi")).toBe("91.14 SAR");
  });

  it("uses Arabic table headers and passes Arabic to the direct report export", () => {
	renderTable({
	  fromPage: "reports",
	  chosenLanguage: "Arabic",
	  data: [
		reservation({
		  id: "ARABIC",
		  guest: "Arabic Guest",
		  total: 250,
		  net: 200,
		}),
	  ],
	});

	const headers = screen
	  .getAllByRole("columnheader")
	  .map((header) => header.textContent.trim());
	expect(headers).toContain("الفندق");
	expect(headers).toContain("رقم التأكيد");
	expect(headers).toContain("رقم الغرفة");
	expect(headers).toContain("التفاصيل");
	expect(headers).not.toContain("Hotel");
	expect(
	  screen.getByTestId("reservation-export").getAttribute("data-language"),
	).toBe("Arabic");
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
    expect(rows[0].textContent).toContain("High Net");
    expect(rows[1].textContent).toContain("Low Net");
	expect(screen.getByTestId("reservation-export").textContent).toBe("HIGH,LOW");
  });
});

describe("EnhancedContentTable reservation detail hydration", () => {
  const compactHotelRunnerReservation = () => {
    const row = reservation({
      id: "6a7739f18151a25e449582b0",
      guest: "Trip.com Guest",
      total: 65.03,
      net: 52.02,
      mode: "hotelrunner_api",
    });
    row.pickedRoomsType = [
      {
        roomType: "familyRooms",
        displayName: "Family Quintuple Room",
        count: 1,
      },
    ];
    row.pickedRoomsPricing = row.pickedRoomsType;
    return row;
  };

  const fullHotelRunnerReservation = () => {
    const row = compactHotelRunnerReservation();
    row.pickedRoomsType = [
      {
        ...row.pickedRoomsType[0],
        pricingByDay: [
          {
            date: "2026-08-11",
            clientPrice: 65.03,
            rootPrice: 75,
          },
        ],
      },
    ];
    row.pickedRoomsPricing = row.pickedRoomsType;
    return row;
  };

  it("hydrates a compact row before mounting reservation details", async () => {
    getAdminReservationById.mockResolvedValue(fullHotelRunnerReservation());
    renderTable({
      data: [compactHotelRunnerReservation()],
      token: "admin-token",
    });

    fireEvent.click(screen.getByRole("button", { name: "More Details" }));

    expect(
      (await screen.findByTestId("hydrated-reservation-details")).textContent,
    ).toContain("65.03");
    expect(getAdminReservationById).toHaveBeenCalledTimes(1);
    expect(getAdminReservationById).toHaveBeenCalledWith(
      "6a7739f18151a25e449582b0",
      "admin-token",
      expect.objectContaining({ signal: expect.any(Object) }),
    );
  });

  it("hydrates the reservationId deep link before mounting reservation details", async () => {
    getAdminReservationById.mockResolvedValue(fullHotelRunnerReservation());
    renderTable({
      data: [compactHotelRunnerReservation()],
      token: "admin-token",
      initialEntry:
        "/admin/all-reservations?reservationId=6a7739f18151a25e449582b0",
    });

    expect(
      (await screen.findByTestId("hydrated-reservation-details")).textContent,
    ).toContain("65.03");
    expect(getAdminReservationById).toHaveBeenCalledTimes(1);
  });

  it("hydrates a valid deep link even when the reservation is off the current page", async () => {
    getAdminReservationById.mockResolvedValue(fullHotelRunnerReservation());
    renderTable({
      data: [],
      token: "admin-token",
      initialEntry:
        "/admin/all-reservations?reservationId=6a7739f18151a25e449582b0",
    });

    expect(
      (await screen.findByTestId("hydrated-reservation-details")).textContent,
    ).toContain("1:65.03");
    expect(getAdminReservationById).toHaveBeenCalledTimes(1);
    expect(getAdminReservationById).toHaveBeenCalledWith(
      "6a7739f18151a25e449582b0",
      "admin-token",
      expect.objectContaining({ signal: expect.any(Object) }),
    );
  });

  it("keeps hydrated details visible when the compact list arrives afterward", async () => {
    const initialEntry =
      "/admin/all-reservations?reservationId=6a7739f18151a25e449582b0";
    getAdminReservationById.mockResolvedValue(fullHotelRunnerReservation());
    const view = renderTable({ data: [], token: "admin-token", initialEntry });

    expect(
      (await screen.findByTestId("hydrated-reservation-details")).textContent,
    ).toContain("1:65.03");

    view.rerender(
      tableElement({
        data: [compactHotelRunnerReservation()],
        token: "admin-token",
        initialEntry,
      }),
    );

    await waitFor(() => {
      expect(screen.queryByTestId("admin-reservation-details-loading")).toBeNull();
      expect(screen.getByTestId("hydrated-reservation-details").textContent).toContain(
        "1:65.03",
      );
    });
    expect(getAdminReservationById).toHaveBeenCalledTimes(1);
  });

  it("does not restart an in-flight deep-link request when the list row arrives", async () => {
    const initialEntry =
      "/admin/all-reservations?reservationId=6a7739f18151a25e449582b0";
    let resolveDetails;
    getAdminReservationById.mockReturnValue(
      new Promise((resolve) => {
        resolveDetails = resolve;
      }),
    );
    const view = renderTable({ data: [], token: "admin-token", initialEntry });

    await waitFor(() => {
      expect(getAdminReservationById).toHaveBeenCalledTimes(1);
    });
    view.rerender(
      tableElement({
        data: [compactHotelRunnerReservation()],
        token: "admin-token",
        initialEntry,
      }),
    );
    expect(getAdminReservationById).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDetails(fullHotelRunnerReservation());
    });

    expect(
      (await screen.findByTestId("hydrated-reservation-details")).textContent,
    ).toContain("1:65.03");
    expect(screen.queryByTestId("admin-reservation-details-loading")).toBeNull();
    expect(getAdminReservationById).toHaveBeenCalledTimes(1);
  });

  it("does not request an invalid off-page reservation key", () => {
    renderTable({
      data: [],
      token: "admin-token",
      initialEntry: "/admin/all-reservations?reservationId=not-a-reservation-id",
    });

    expect(getAdminReservationById).not.toHaveBeenCalled();
    expect(screen.queryByTestId("admin-reservation-details-loading")).toBeNull();
  });

  it("uses the employee reservation's saved nightly rows instead of rebuilding them", async () => {
    const compact = reservation({
      id: "6a7731368151a25e449571d1",
      guest: "Employee Guest",
      total: 150,
      net: 150,
      mode: "standard",
    });
    compact.pickedRoomsType = [
      { roomType: "quadRooms", displayName: "Quadruple Room", count: 1 },
    ];
    getAdminReservationById.mockResolvedValue({
      ...compact,
      pickedRoomsType: [
        {
          ...compact.pickedRoomsType[0],
          pricingByDay: [
            { date: "2026-08-10", clientPrice: 75, rootPrice: 75 },
            { date: "2026-08-11", clientPrice: 75, rootPrice: 75 },
          ],
        },
      ],
    });
    renderTable({ data: [compact], token: "admin-token" });

    fireEvent.click(screen.getByRole("button", { name: "More Details" }));

    expect(
      (await screen.findByTestId("hydrated-reservation-details")).textContent,
    ).toContain("2:75");
  });

  it("rejects a mismatched reservation response instead of opening stale details", async () => {
    getAdminReservationById.mockResolvedValue({
      ...fullHotelRunnerReservation(),
      _id: "6a7731368151a25e449571d1",
    });
    renderTable({
      data: [compactHotelRunnerReservation()],
      token: "admin-token",
    });

    fireEvent.click(screen.getByRole("button", { name: "More Details" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not load complete reservation details",
      );
    });
    expect(screen.queryByTestId("hydrated-reservation-details")).toBeNull();
  });
});
