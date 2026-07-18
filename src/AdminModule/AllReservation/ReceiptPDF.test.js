import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReceiptPDF from "./ReceiptPDF";
import { updateSingleReservation } from "../apiAdmin";

jest.mock("../apiAdmin", () => ({
	updateSingleReservation: jest.fn(),
}));

const reservation = {
	_id: "reservation-1",
	confirmation_number: "6116125761",
	createdAt: "2026-07-14T12:00:00.000Z",
	checkin_date: "2026-07-14T12:00:00.000Z",
	checkout_date: "2026-07-16T12:00:00.000Z",
	reservation_status: "Confirmed",
	total_guests: 1,
	total_amount: 155,
	paid_amount: 0,
	payment: "not paid",
	booking_source: "Jannat Employee",
	supplierData: {
		supplierName: "Airbnb",
		suppliedBookingNo: "HMREF3NWRJ",
	},
	customer_details: {
		name: "Ahmed Receipt Test",
		email: "receipt@example.com",
		phone: "0500000000",
		nationality: "EG",
		passport: "A1234567",
		reservedBy: "Test Agent",
	},
	pickedRoomsType: [
		{
			room_type: "quadrupleRooms",
			displayName: "Quadruple Room",
			count: 1,
			pricingByDay: [{ price: 75 }, { price: 80 }],
		},
	],
};

const hotelDetails = {
	hotelName: "Zad Ajyad Hotel",
	hotelName_OtherLanguage: "فندق زاد أجياد",
	belongsTo: { name: "Zad Hotels" },
};

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

afterEach(() => {
	jest.clearAllMocks();
	document.querySelector("[data-test-hostile-receipt-style]")?.remove();
});

test("the redesigned receipt keeps the unified edit modal and saves passport and supplier fields", async () => {
	const hostileStyles = document.createElement("style");
	hostileStyles.dataset.testHostileReceiptStyle = "true";
	hostileStyles.textContent = `
		.stay-table th { color: white !important; background: white !important; }
		.rooms-table th { color: white !important; background: #082e55 !important; }
	`;
	document.head.appendChild(hostileStyles);

	updateSingleReservation.mockResolvedValue({
		reservation: {
			...reservation,
			supplierData: { ...reservation.supplierData, supplierName: "Updated Supplier" },
			customer_details: { ...reservation.customer_details, passport: "P998877" },
		},
	});

	render(<ReceiptPDF reservation={reservation} hotelDetails={hotelDetails} />);

	const checkinHeader = screen.getByText("Check-in Date").closest("th");
	const roomTypeHeader = screen
		.getAllByText("Room Type")
		.find((node) => node.closest(".rooms-table"))
		.closest("th");
	expect(window.getComputedStyle(checkinHeader).color).toBe("rgb(16, 16, 16)");
	expect(window.getComputedStyle(checkinHeader).backgroundColor).toBe(
		"rgb(255, 255, 255)",
	);
	expect(window.getComputedStyle(roomTypeHeader).color).toBe("rgb(16, 16, 16)");
	expect(window.getComputedStyle(roomTypeHeader).backgroundColor).not.toBe(
		"rgb(8, 46, 85)",
	);

	fireEvent.click(screen.getByRole("button", { name: "Ahmed Receipt Test" }));
	expect(await screen.findByText("Update Reservation (Receipt Fields)")).toBeTruthy();

	const supplierInput = screen.getByLabelText("Supplied By (Supplier)");
	const passportInput = screen.getByLabelText("Passport #");
	expect(supplierInput.value).toBe("Airbnb");
	expect(passportInput.value).toBe("A1234567");

	fireEvent.change(supplierInput, { target: { value: "Updated Supplier" } });
	fireEvent.change(passportInput, { target: { value: "P998877" } });
	fireEvent.click(screen.getByRole("button", { name: "Save" }));

	await waitFor(() => {
		expect(updateSingleReservation).toHaveBeenCalledWith(
			"reservation-1",
			expect.objectContaining({
				supplierData: expect.objectContaining({ supplierName: "Updated Supplier" }),
				customerDetails: expect.objectContaining({ passport: "P998877" }),
				sendEmail: false,
			}),
		);
	});
});
