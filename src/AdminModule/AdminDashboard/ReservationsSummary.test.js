import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { isAuthenticated } from "../../auth";
import {
	getAdminReservationById,
	getAdminReservationExecutiveSummary,
} from "../apiAdmin";
import ReservationsSummary from "./ReservationsSummary";

jest.mock("../../auth", () => ({
	isAuthenticated: jest.fn(),
}));

jest.mock("../apiAdmin", () => ({
	getAdminReservationById: jest.fn(),
	getAdminReservationExecutiveSummary: jest.fn(),
}));

jest.mock("../AllReservation/MoreDetails", () => () => (
	<div>Complete reservation details</div>
));

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
			metrics: {
				checkins: {
					count: 1,
					sarAmount: 560,
					variancePercent: 100,
					varianceState: "increase",
				},
				checkouts: {
					count: 0,
					sarAmount: 0,
					variancePercent: 0,
					varianceState: "unchanged",
				},
				newReservations: {
					count: 1,
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
				status: "confirmed",
				bookingSource: "Jannat Employee",
				checkinDate: "2026-07-19T00:00:00.000Z",
				checkoutDate: "2026-07-21T00:00:00.000Z",
				createdAt: "2026-07-19T02:00:00.000Z",
				rooms: 1,
				guests: 2,
				totalAmount: 560,
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

test("loads one daily summary, keeps its table visible, and delegates URL filter changes", async () => {
	const onDayChange = jest.fn();
	render(<ReservationsSummary day='today' onDayChange={onDayChange} chosenLanguage='English' />);

	expect(await screen.findByText("CONF-1")).toBeTruthy();
	expect(screen.getByText("Executive Guest")).toBeTruthy();
	expect(screen.getByText("Nights")).toBeTruthy();
	expect(screen.getByText("280.00 SAR \u00d7 2 nights")).toBeTruthy();
	expect(screen.getByTestId("reservation-index-507f1f77bcf86cd799439011").textContent).toBe("1");
	expect(screen.getByRole("button", { name: /More details/i })).toBeTruthy();
	await waitFor(() => {
		expect(screen.getByTestId("checkins-count").textContent).toBe("1");
		expect(screen.getByTestId("checkins-amount").textContent).toBe("SAR 560.00");
	});
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
	expect(screen.queryByText("CONF-21")).toBeNull();

	const pageTwo = container.querySelector(".ant-pagination-item-2 a");
	expect(pageTwo).toBeTruthy();
	fireEvent.click(pageTwo);

	expect(await screen.findByText("CONF-21")).toBeTruthy();
	expect(screen.getByTestId("reservation-index-000000000000000000000015").textContent).toBe(
		"21"
	);
});
