import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PaymentTrigger from "./PaymentTrigger";
import { BOFA_VCC_MODAL_Z_INDEX } from "./BofaVccModal";
import {
	getBofaVccHealth,
	getReservationBofaVccStatus,
} from "../apiAdmin";

jest.mock("../../auth", () => ({
	isAuthenticated: () => ({
		token: "test-token",
		user: { _id: "configured-super-admin" },
	}),
}));

jest.mock("../utils/superUsers", () => ({
	isSuperAdminUser: () => true,
}));

jest.mock("../apiAdmin", () => ({
	chargeReservationViaBofaVcc: jest.fn(),
	getBofaVccHealth: jest.fn(),
	getReservationBofaVccStatus: jest.fn(),
	triggerPayment: jest.fn(),
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

afterEach(() => {
	cleanup();
	jest.clearAllMocks();
});

test("the OTA virtual-card action opens a dialog above its own mask", async () => {
	getBofaVccHealth.mockResolvedValue({
		readyForCharge: false,
		message: "Test readiness response",
	});
	getReservationBofaVccStatus.mockResolvedValue({
		alreadyCharged: false,
		processing: false,
		outcomeUnknown: false,
		attemptedBefore: false,
	});

	render(
		<PaymentTrigger
			reservation={{
				_id: "reservation-1",
				confirmation_number: "TEST-1",
				booking_source: "Agoda",
				checkin_date: "2020-01-01T00:00:00.000Z",
				total_amount: 100,
				paid_amount: 0,
				paypal_details: {},
				payment_details: {},
			}}
		/>,
	);

	const action = screen.getByRole("button", { name: "Enter OTA Virtual Card" });
	expect(action).toBeEnabled();
	fireEvent.click(action);

	const title = await screen.findByText("Process OTA Virtual Card");
	await screen.findByText("Test readiness response");
	await waitFor(() =>
		expect(
			screen.queryByText(
				"Checking Bank of America and reservation status...",
			),
		).not.toBeInTheDocument(),
	);
	await waitFor(() => expect(title).toBeVisible());
	expect(
		screen.getByText(/billing details are applied securely by the backend/i),
	).toBeVisible();
	expect(screen.queryByLabelText(/cardholder name/i)).not.toBeInTheDocument();
	expect(screen.queryByLabelText(/address line 1/i)).not.toBeInTheDocument();
	expect(screen.queryByLabelText(/zip|postal code/i)).not.toBeInTheDocument();

	const root = document.querySelector(".bofa-vcc-modal-root");
	const mask = root?.querySelector(".ant-modal-mask");
	const wrap = root?.querySelector(".ant-modal-wrap");
	const dialog = root?.querySelector(".ant-modal");
	const panel = root?.querySelector(".ant-modal-content");

	expect(root).toBeInTheDocument();
	expect(wrap).toHaveClass("bofa-vcc-modal-wrap");
	expect(dialog).toBeVisible();
	expect(BOFA_VCC_MODAL_Z_INDEX).toBeGreaterThan(100000);
	expect(Number(mask?.style.zIndex)).toBe(BOFA_VCC_MODAL_Z_INDEX - 1);
	expect(Number(wrap?.style.zIndex)).toBe(BOFA_VCC_MODAL_Z_INDEX);
	expect(Number(panel?.style.zIndex)).toBe(BOFA_VCC_MODAL_Z_INDEX + 1);
	expect(Number(wrap?.style.zIndex)).toBeGreaterThan(Number(mask?.style.zIndex));
});

test("other OTA cards request only a ZIP or postal code and no street address", async () => {
	getBofaVccHealth.mockResolvedValue({ readyForCharge: true });
	getReservationBofaVccStatus.mockResolvedValue({
		alreadyCharged: false,
		processing: false,
		outcomeUnknown: false,
		attemptedBefore: false,
	});

	render(
		<PaymentTrigger
			reservation={{
				_id: "reservation-2",
				confirmation_number: "TEST-2",
				booking_source: "Booking.com",
				checkin_date: "2020-01-01T00:00:00.000Z",
				total_amount: 100,
				paid_amount: 0,
				paypal_details: {},
				payment_details: {},
			}}
		/>,
	);

	fireEvent.click(screen.getByRole("button", { name: "Enter OTA Virtual Card" }));
	await screen.findByText("Bank of America connection and credentials are ready.");
	const postalCodeInput = await screen.findByLabelText("ZIP / postal code");
	await waitFor(() => expect(postalCodeInput).toBeVisible());
	expect(
		screen.queryByLabelText(/address line|street address|city|state/i),
	).not.toBeInTheDocument();
	expect(
		screen.getByText("No street address is requested for this card."),
	).toBeVisible();
});
