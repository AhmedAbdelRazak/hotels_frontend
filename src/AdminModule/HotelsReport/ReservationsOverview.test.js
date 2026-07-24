import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ReservationsOverview from "./ReservationsOverview";
import {
	getReservationsByDay,
	getCheckinsByDay,
	getCheckoutsByDay,
	getReservationsByBookingStatus,
	getReservationsByHotelNames,
	getTopHotelsByReservations,
	getBookingSourcePaymentSummary,
	getSpecificListOfReservations,
	gettingHotelDetailsForAdmin,
} from "../apiAdmin";

jest.mock("../../auth", () => ({
	isAuthenticated: () => ({ user: { _id: "admin-1" }, token: "token-1" }),
}));

jest.mock("../../cart_context", () => ({
	useCartContext: () => ({ chosenLanguage: "Arabic" }),
}));

jest.mock("../apiAdmin", () => ({
	getReservationsByDay: jest.fn(),
	getCheckinsByDay: jest.fn(),
	getCheckoutsByDay: jest.fn(),
	getReservationsByBookingStatus: jest.fn(),
	getReservationsByHotelNames: jest.fn(),
	getTopHotelsByReservations: jest.fn(),
	getBookingSourcePaymentSummary: jest.fn(),
	getSpecificListOfReservations: jest.fn(),
	gettingHotelDetailsForAdmin: jest.fn(),
}));

jest.mock("react-apexcharts", () => ({ options = {} }) => (
	<button
		type="button"
		aria-label={`chart-${options.chart?.id || "unknown"}`}
		onClick={() =>
			options.chart?.events?.dataPointSelection?.(null, null, {
				dataPointIndex: 0,
			})
		}
	/>
));

jest.mock("../AllReservation/EnhancedContentTable", () => ({
	data,
	chosenLanguage,
}) => (
	<div
		data-testid="filtered-reservations-table"
		data-language={chosenLanguage}
	>
		{data.map((row) => row.confirmation_number).join(",")}
	</div>
));

jest.mock("antd", () => {
	const Collapse = ({ children }) => <div>{children}</div>;
	Collapse.Panel = ({ children }) => <section>{children}</section>;
	const Radio = {
		Group: ({ children }) => <div>{children}</div>,
		Button: ({ children }) => <button type="button">{children}</button>,
	};
	const Select = ({ children }) => <div>{children}</div>;
	Select.Option = ({ children }) => <span>{children}</span>;
	return {
		message: { error: jest.fn(), info: jest.fn() },
		Spin: ({ tip }) => <div>{tip}</div>,
		Collapse,
		Card: ({ children }) => <div>{children}</div>,
		Modal: ({ children, open, title }) =>
			open ? (
				<div>
					<h2>{title}</h2>
					{children}
				</div>
			) : null,
		Radio,
		Select,
		Button: ({ children, onClick }) => (
			<button type="button" onClick={onClick}>
				{children}
			</button>
		),
	};
});

describe("admin reservations overview chart details", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		getReservationsByDay.mockResolvedValue([]);
		getCheckinsByDay.mockResolvedValue([]);
		getCheckoutsByDay.mockResolvedValue([]);
		getReservationsByBookingStatus.mockResolvedValue([
			{
				groupKey: "2026-07-22",
				reservation_status: "inhouse",
				reservationsCount: 1,
			},
		]);
		getReservationsByHotelNames.mockResolvedValue([]);
		getTopHotelsByReservations.mockResolvedValue([]);
		getBookingSourcePaymentSummary.mockResolvedValue(null);
		gettingHotelDetailsForAdmin.mockResolvedValue([]);
		getSpecificListOfReservations.mockResolvedValue({
			data: [{ confirmation_number: "BAR-FILTERED-AR" }],
			totalDocuments: 1,
			scorecards: {},
		});
	});

	it("keeps the clicked chart filter and Arabic language on the modal table", async () => {
		render(<ReservationsOverview />);

		fireEvent.click(
			await screen.findByRole("button", {
				name: "chart-booking-status-chart",
			}),
		);

		await waitFor(() => {
			expect(getSpecificListOfReservations).toHaveBeenCalledWith(
				"admin-1",
				"token-1",
				expect.objectContaining({
					reservationstatus_inhouse: 1,
					hotels: "all",
					excludeCancelled: true,
				}),
			);
		});

		const table = await screen.findByTestId("filtered-reservations-table");
		expect(table.textContent).toBe("BAR-FILTERED-AR");
		expect(table.getAttribute("data-language")).toBe("Arabic");
		expect(screen.getByText("قائمة الحجوزات التفصيلية")).not.toBeNull();
	});
});
