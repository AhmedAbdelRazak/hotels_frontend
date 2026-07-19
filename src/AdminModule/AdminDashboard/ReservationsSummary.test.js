import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { isAuthenticated } from "../../auth";
import { getAdminReservationExecutiveSummary } from "../apiAdmin";
import ReservationsSummary from "./ReservationsSummary";

jest.mock("../../auth", () => ({
	isAuthenticated: jest.fn(),
}));

jest.mock("../apiAdmin", () => ({
	getAdminReservationExecutiveSummary: jest.fn(),
}));

jest.mock("xlsx", () => ({
	utils: {
		json_to_sheet: jest.fn(() => ({})),
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
			totalUniqueReservations: 1,
		},
		reservations: [
			{
				id: "reservation-1",
				confirmationNumber: "CONF-1",
				hotel: { name: "Zad Ajyad" },
				guestName: "Executive Guest",
				status: "confirmed",
				bookingSource: "Jannat Employee",
				checkinDate: "2026-07-19T00:00:00.000Z",
				checkoutDate: "2026-07-21T00:00:00.000Z",
				createdAt: "2026-07-19T02:00:00.000Z",
				rooms: 1,
				guests: 2,
				totalAmount: 560,
				currency: "SAR",
				activityTypes: ["checkin", "new-reservation"],
			},
		],
	});
});

afterEach(() => {
	jest.clearAllMocks();
});

test("loads one daily summary, keeps its table visible, and delegates URL filter changes", async () => {
	const onDayChange = jest.fn();
	render(<ReservationsSummary day='today' onDayChange={onDayChange} chosenLanguage='English' />);

	expect(await screen.findByText("CONF-1")).toBeTruthy();
	expect(screen.getByText("Executive Guest")).toBeTruthy();
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
