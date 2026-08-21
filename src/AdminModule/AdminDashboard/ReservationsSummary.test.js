import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as XLSX from "xlsx";
import { isAuthenticated } from "../../auth";
import {
	getAdminReservationById,
	getAdminReservationExecutiveSummary,
} from "../apiAdmin";
import ReservationsSummary, {
	RESERVATION_SUMMARY_COLUMN_WIDTHS,
	RESERVATION_SUMMARY_TABLE_WIDTH,
} from "./ReservationsSummary";

jest.mock("../../auth", () => ({
	isAuthenticated: jest.fn(),
}));

jest.mock("../apiAdmin", () => ({
	getAdminReservationById: jest.fn(),
	getAdminReservationExecutiveSummary: jest.fn(),
}));

jest.mock("antd", () => {
	const actual = jest.requireActual("antd");
	return {
		...actual,
		message: {
			info: jest.fn(),
			success: jest.fn(),
			error: jest.fn(),
		},
	};
});

jest.mock("rc-table/lib/stickyScrollBar", () => {
	const ReactForMock = require("react");
	return {
		__esModule: true,
		default: ReactForMock.forwardRef(() => null),
	};
});

jest.mock("../AllReservation/MoreDetails", () => () => (
	<div>Complete reservation details</div>
));

jest.mock("xlsx", () => ({
	utils: {
		json_to_sheet: jest.fn(() => ({})),
		sheet_add_aoa: jest.fn(),
		book_new: jest.fn(() => ({})),
		book_append_sheet: jest.fn(),
	},
	writeFile: jest.fn(),
}));

beforeAll(() => {
	window.matchMedia =
		window.matchMedia ||
		(() => ({
			matches: false,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}));
	global.ResizeObserver =
		global.ResizeObserver ||
		class ResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
});

beforeEach(() => {
	XLSX.utils.json_to_sheet.mockReturnValue({});
	XLSX.utils.book_new.mockReturnValue({});
	isAuthenticated.mockReturnValue({
		user: { _id: "admin-1" },
		token: "safe-test-token",
	});
	getAdminReservationExecutiveSummary.mockResolvedValue({
		date: "2026-07-19",
		timezone: "Asia/Riyadh",
		summary: {
			checkins: 1,
			checkouts: 0,
			newReservations: 1,
			metrics: {
				checkins: {
					count: 1,
					nights: 2,
					sarAmount: 560,
					variancePercent: 100,
					varianceState: "increase",
				},
				checkouts: {
					count: 0,
					nights: 0,
					sarAmount: 0,
					variancePercent: 0,
					varianceState: "unchanged",
				},
				newReservations: {
					count: 1,
					nights: 2,
					sarAmount: 560,
					variancePercent: null,
					varianceState: "new",
				},
			},
			totalUniqueReservations: 1,
			totalAmount: 560,
			currency: "SAR",
			verifiedAmounts: 1,
			amountsNeedingReview: 0,
		},
		reservations: [
			{
				id: "507f1f77bcf86cd799439011",
				confirmationNumber: "CONF-1",
				hotel: { name: "Zad Ajyad" },
				guestName: "Executive Guest",
				roomTypes: ["doubleRooms - City View"],
				roomNumbers: ["101", "305"],
				status: "confirmed",
				bookingSource: "Jannat Employee",
				checkinDate: "2026-07-19T00:00:00.000Z",
				checkoutDate: "2026-07-21T00:00:00.000Z",
				createdAt: "2026-07-19T02:00:00.000Z",
				rooms: 1,
				guests: 2,
				totalAmount: 560,
				grossTotalAmount: 560,
				netTotalAmount: 510,
				grossTotalAvailable: true,
				netTotalAvailable: true,
				financialTotalsCurrency: "SAR",
				nights: 2,
				averageNightlyAmount: 280,
				amountQuality: { status: "verified" },
				currency: "SAR",
				activityTypes: ["checkin", "new-reservation"],
			},
		],
	});
});

afterEach(() => {
	jest.clearAllMocks();
});

test("uses a compact table width budget without fixed overlay columns", () => {
	expect(RESERVATION_SUMMARY_TABLE_WIDTH).toBe(1932);
	expect(RESERVATION_SUMMARY_COLUMN_WIDTHS.status).toBeGreaterThanOrEqual(196);
	expect(RESERVATION_SUMMARY_COLUMN_WIDTHS.confirmation).toBeGreaterThanOrEqual(116);
	expect(RESERVATION_SUMMARY_COLUMN_WIDTHS.hotel).toBeLessThan(120);
});

test("loads one daily summary, keeps its table visible, and delegates URL filter changes", async () => {
	const onDayChange = jest.fn();
	const { container } = render(
		<ReservationsSummary day='today' onDayChange={onDayChange} chosenLanguage='English' />
	);

	expect(await screen.findByText("CONF-1")).toBeTruthy();
	expect(screen.getByText("Executive Guest")).toBeTruthy();
	expect(screen.getByText("City View")).toBeTruthy();
	expect(screen.getByText("101, 305")).toBeTruthy();
	expect(screen.getByText("Nights")).toBeTruthy();
	expect(screen.getByText("280.00 SAR \u00d7 2 nights")).toBeTruthy();
	expect(screen.getByTestId("reservation-index-507f1f77bcf86cd799439011").textContent).toBe("1");
	expect(screen.getByRole("button", { name: /More details/i })).toBeTruthy();
	expect(screen.getByText("confirmed")).toBeTruthy();
	expect(
		screen.queryByRole("columnheader", { name: /Gross Total|Net Total/i }),
	).toBeNull();
	expect(container.querySelector(".ant-table-cell-fix-left, .ant-table-cell-fix-right")).toBeNull();
	expect(container.querySelector(".ant-table-cell-ellipsis")).toBeNull();
	await waitFor(() => {
		expect(screen.getByTestId("checkins-count").textContent).toBe("1");
		expect(screen.getByTestId("checkins-nights").textContent).toBe("2 nights");
		expect(screen.getByTestId("checkins-amount").textContent).toBe("SAR 560.00");
	});
	expect(screen.getByTestId("checkouts-nights").textContent).toBe("0 nights");
	expect(screen.getByTestId("new-nights").textContent).toBe("2 nights");
	expect(screen.getByTestId("checkins-variance").textContent).toBe("+100%");
	expect(screen.getByTestId("new-variance").textContent).toBe("NEW");
	expect(screen.getAllByRole("table").length).toBeGreaterThan(0);

	await waitFor(() => {
		expect(getAdminReservationExecutiveSummary).toHaveBeenCalledTimes(1);
	});
	expect(getAdminReservationExecutiveSummary).toHaveBeenCalledWith(
		"admin-1",
		"safe-test-token",
		"today",
		expect.objectContaining({ signal: expect.any(AbortSignal) })
	);

	fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }));
	expect(onDayChange).toHaveBeenCalledWith("tomorrow");
});

test("toggles and combines activity filters, then exports only the visible reservations", async () => {
	const baseReservation = {
		hotel: { name: "Zad Ajyad" },
		guestName: "Filter Guest",
		roomTypes: ["doubleRooms"],
		roomNumbers: ["101"],
		status: "confirmed",
		bookingSource: "Jannat Employee",
		checkinDate: "2026-07-19T00:00:00.000Z",
		checkoutDate: "2026-07-21T00:00:00.000Z",
		createdAt: "2026-07-19T02:00:00.000Z",
		rooms: 1,
		guests: 2,
		totalAmount: 560,
		grossTotalAmount: 560,
		netTotalAmount: 510,
		grossTotalAvailable: true,
		netTotalAvailable: true,
		financialTotalsCurrency: "SAR",
		nights: 2,
		averageNightlyAmount: 280,
		amountQuality: { status: "verified" },
		currency: "SAR",
	};
	const reservations = [
		{
			...baseReservation,
			id: "507f1f77bcf86cd799439101",
			confirmationNumber: "ARRIVAL-ONLY",
			activityTypes: ["checkin"],
		},
		{
			...baseReservation,
			id: "507f1f77bcf86cd799439102",
			confirmationNumber: "DEPARTURE-ONLY",
			activityTypes: ["checkout"],
		},
		{
			...baseReservation,
			id: "507f1f77bcf86cd799439103",
			confirmationNumber: "NEW-ONLY",
			activityTypes: ["new-reservation"],
		},
	];
	getAdminReservationExecutiveSummary.mockResolvedValueOnce({
		date: "2026-07-19",
		timezoneOffset: "UTC+03:00",
		summary: {
			checkins: 1,
			checkouts: 1,
			newReservations: 1,
			totalUniqueReservations: 3,
		},
		reservations,
	});

	render(<ReservationsSummary day='today' onDayChange={() => {}} chosenLanguage='English' />);

	expect(await screen.findByText("ARRIVAL-ONLY")).toBeTruthy();
	expect(screen.getByText("DEPARTURE-ONLY")).toBeTruthy();
	expect(screen.getByText("NEW-ONLY")).toBeTruthy();

	const allFilter = screen.getByRole("button", { name: "All" });
	const arrivalFilter = screen.getByRole("button", { name: "Arrival" });
	const departureFilter = screen.getByRole("button", { name: "Departure" });
	const newlyCreatedFilter = screen.getByRole("button", { name: "Newly Created" });
	expect(allFilter.getAttribute("aria-pressed")).toBe("true");

	fireEvent.click(allFilter);
	expect(allFilter.getAttribute("aria-pressed")).toBe("true");
	expect(screen.getByText("ARRIVAL-ONLY")).toBeTruthy();
	expect(screen.getByText("DEPARTURE-ONLY")).toBeTruthy();
	expect(screen.getByText("NEW-ONLY")).toBeTruthy();

	fireEvent.click(newlyCreatedFilter);
	expect(allFilter.getAttribute("aria-pressed")).toBe("false");
	expect(newlyCreatedFilter.getAttribute("aria-pressed")).toBe("true");
	expect(screen.getByText("NEW-ONLY")).toBeTruthy();
	expect(screen.queryByText("ARRIVAL-ONLY")).toBeNull();
	fireEvent.click(newlyCreatedFilter);
	expect(newlyCreatedFilter.getAttribute("aria-pressed")).toBe("false");
	expect(allFilter.getAttribute("aria-pressed")).toBe("true");
	expect(screen.getByText("ARRIVAL-ONLY")).toBeTruthy();
	expect(screen.getByText("DEPARTURE-ONLY")).toBeTruthy();
	expect(screen.getByText("NEW-ONLY")).toBeTruthy();

	fireEvent.click(arrivalFilter);
	expect(arrivalFilter.getAttribute("aria-pressed")).toBe("true");
	expect(screen.getByText("ARRIVAL-ONLY")).toBeTruthy();
	expect(screen.queryByText("DEPARTURE-ONLY")).toBeNull();
	expect(screen.queryByText("NEW-ONLY")).toBeNull();

	fireEvent.click(departureFilter);
	expect(arrivalFilter.getAttribute("aria-pressed")).toBe("true");
	expect(departureFilter.getAttribute("aria-pressed")).toBe("true");
	expect(screen.getByText("ARRIVAL-ONLY")).toBeTruthy();
	expect(screen.getByText("DEPARTURE-ONLY")).toBeTruthy();
	expect(screen.queryByText("NEW-ONLY")).toBeNull();

	fireEvent.click(arrivalFilter);
	expect(arrivalFilter.getAttribute("aria-pressed")).toBe("false");
	expect(screen.queryByText("ARRIVAL-ONLY")).toBeNull();
	expect(screen.getByText("DEPARTURE-ONLY")).toBeTruthy();

	fireEvent.click(screen.getByRole("button", { name: "Export to Excel" }));
	const sheetCalls = XLSX.utils.json_to_sheet.mock.calls;
	const exportedRows = sheetCalls[sheetCalls.length - 1][0];
	expect(exportedRows).toHaveLength(1);
	expect(exportedRows[0]["Confirmation Number"]).toBe("DEPARTURE-ONLY");
	expect(exportedRows[0]["Total Amount"]).toBe(560);
	expect(exportedRows[0]["Gross Total (Before OTA Deductions)"]).toBe(560);
	expect(exportedRows[0]["Net Total (After OTA Deductions)"]).toBe(510);
	expect(exportedRows[0].Currency).toBe("SAR");
	expect(sheetCalls[sheetCalls.length - 1][1].header).toHaveLength(20);
	expect(XLSX.utils.sheet_add_aoa).toHaveBeenLastCalledWith(
		expect.any(Object),
		[
			expect.arrayContaining([
				"Total Amount",
				"Gross Total (Before OTA Deductions)",
				"Net Total (After OTA Deductions)",
				"Currency",
			]),
		],
		{ origin: "A1" },
	);
	expect(XLSX.utils.sheet_add_aoa.mock.calls.at(-1)[0]["!cols"]).toHaveLength(20);
	expect(getAdminReservationExecutiveSummary).toHaveBeenCalledTimes(1);

	fireEvent.click(departureFilter);
	expect(departureFilter.getAttribute("aria-pressed")).toBe("false");
	expect(allFilter.getAttribute("aria-pressed")).toBe("true");
	expect(screen.getByText("ARRIVAL-ONLY")).toBeTruthy();
	expect(screen.getByText("DEPARTURE-ONLY")).toBeTruthy();
	expect(screen.getByText("NEW-ONLY")).toBeTruthy();
});

test("renders Arabic Gregorian table dates with the localized month first", async () => {
	render(
		<ReservationsSummary
			day='today'
			onDayChange={jest.fn()}
			chosenLanguage='Arabic'
		/>
	);

	expect(await screen.findByText("CONF-1")).toBeTruthy();
	expect(screen.getAllByText("يوليو 19، 2026").length).toBeGreaterThanOrEqual(2);
	expect(screen.getByText("يوليو 21، 2026")).toBeTruthy();
	expect(screen.queryByText(/19[/-]07[/-]2026/)).toBeNull();

	fireEvent.click(screen.getByRole("button", { name: "تصدير Excel" }));
	expect(XLSX.utils.sheet_add_aoa).toHaveBeenLastCalledWith(
		expect.any(Object),
		[
			expect.arrayContaining([
				"إجمالي المبلغ",
				"إجمالي الحجز قبل خصم مصاريف منصات الحجز (OTA)",
				"صافي الحجز بعد خصم مصاريف منصات الحجز (OTA)",
				"العملة",
			]),
		],
		{ origin: "A1" },
	);
});

test("opens the permission-checked complete details modal from a shareable reservation id", async () => {
	getAdminReservationById.mockResolvedValue({
		_id: "507f1f77bcf86cd799439011",
		hotelId: { _id: "hotel-1" },
	});
	const onReservationIdChange = jest.fn();
	render(
		<ReservationsSummary
			day='today'
			onDayChange={() => {}}
			chosenLanguage='English'
			reservationId='507f1f77bcf86cd799439011'
			onReservationIdChange={onReservationIdChange}
		/>
	);

	expect(await screen.findByText("Complete reservation details")).toBeTruthy();
	expect(getAdminReservationById).toHaveBeenCalledWith(
		"507f1f77bcf86cd799439011",
		"safe-test-token",
		expect.objectContaining({ signal: expect.any(AbortSignal) })
	);
});

test("keeps critical Arabic table headers and status text complete", async () => {
	const { container } = render(
		<ReservationsSummary day='today' onDayChange={() => {}} chosenLanguage='Arabic' />
	);

	expect(await screen.findByText("CONF-1")).toBeTruthy();
	const headerTexts = Array.from(
		container.querySelectorAll(".ant-table-thead th")
	).map((header) => header.textContent.trim());
	[
		"\u0627\u0644\u0646\u0634\u0627\u0637",
		"\u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
		"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
		"\u0627\u0644\u062d\u0627\u0644\u0629",
		"\u0627\u0644\u0645\u0628\u0644\u063a",
		"\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
	].forEach((header) => {
		expect(headerTexts).toContain(header);
	});
	expect(screen.getByText("\u0645\u0624\u0643\u062f")).toBeTruthy();
	await waitFor(() => {
		expect(screen.getByTestId("checkins-nights").textContent).toBe(
			"2 \u0644\u064a\u0627\u0644\u064d"
		);
	});
});

test("shows 20 rows per page and continues the index at 21 on page two", async () => {
	const reservations = Array.from({ length: 21 }, (_value, index) => ({
		id: (index + 1).toString(16).padStart(24, "0"),
		confirmationNumber: `CONF-${index + 1}`,
		hotel: { name: "Zad Ajyad" },
		guestName: `Guest ${index + 1}`,
		status: "Pending Confirmation",
		bookingSource: "Jannat Employee",
		checkinDate: "2026-07-19T00:00:00.000Z",
		checkoutDate: "2026-07-21T00:00:00.000Z",
		createdAt: "2026-07-19T02:00:00.000Z",
		rooms: 1,
		guests: 2,
		nights: 2,
		totalAmount: 560,
		averageNightlyAmount: 280,
		amountQuality: { status: "verified" },
		currency: "SAR",
		activityTypes: ["new-reservation"],
	}));
	getAdminReservationExecutiveSummary.mockResolvedValueOnce({
		date: "2026-07-19",
		timezoneLabel: "Makkah Time",
		timezoneOffset: "UTC+03:00",
		summary: {
			checkins: 0,
			checkouts: 0,
			newReservations: 21,
			totalUniqueReservations: 21,
			totalAmount: 11760,
			currency: "SAR",
			verifiedAmounts: 21,
			amountsNeedingReview: 0,
		},
		reservations,
	});

	const { container } = render(
		<ReservationsSummary day='today' onDayChange={() => {}} chosenLanguage='English' />
	);
	expect(await screen.findByText("CONF-20")).toBeTruthy();
	await waitFor(() => {
		expect(screen.getByTestId("new-nights").textContent).toBe("42 nights");
	});
	expect(screen.queryByText("CONF-21")).toBeNull();

	const pageTwo = container.querySelector(".ant-pagination-item-2 a");
	expect(pageTwo).toBeTruthy();
	fireEvent.click(pageTwo);

	expect(await screen.findByText("CONF-21")).toBeTruthy();
	expect(screen.getByTestId("reservation-index-000000000000000000000015").textContent).toBe(
		"21"
	);
});
