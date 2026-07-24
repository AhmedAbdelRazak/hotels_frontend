import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PaymentTrigger from "./PaymentTrigger";
import { BOFA_VCC_MODAL_Z_INDEX } from "./BofaVccModal";
import {
	abandonUnsubmittedBofaHostedCheckoutSession,
	createBofaHostedCheckoutSession,
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
	abandonUnsubmittedBofaHostedCheckoutSession: jest.fn(),
	createBofaHostedCheckoutSession: jest.fn(),
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
	jest.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
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
		screen.getByText(/billing details are selected securely by the backend/i),
	).toBeVisible();
	expect(
		screen.getByText(/entered only inside Bank of America.s secure embedded form/i),
	).toBeVisible();
	expect(screen.queryByLabelText(/cardholder name/i)).not.toBeInTheDocument();
	expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
	expect(screen.queryByLabelText(/security code|cvv/i)).not.toBeInTheDocument();
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

test("a complete saved USD amount loads the Bank of America fields without a review step", async () => {
	getBofaVccHealth.mockResolvedValue({ readyForCharge: true });
	getReservationBofaVccStatus.mockResolvedValue({
		alreadyCharged: false,
		processing: false,
		outcomeUnknown: false,
		attemptedBefore: false,
	});
	createBofaHostedCheckoutSession.mockResolvedValue({
		endpointUrl: "https://secureacceptance.merchant-services.bankofamerica.com/embedded/pay",
		fields: {
			access_key: "test-access-key",
			profile_id: "test-profile",
			transaction_uuid: "test-session-1",
			signature: "test-signature",
		},
		session: {
			transactionUuid: "test-session-1",
			amountUsd: 25,
			currency: "USD",
		},
	});

	render(
		<PaymentTrigger
			reservation={{
				_id: "reservation-saved-amount",
				confirmation_number: "TEST-SAVED-25",
				booking_source: "Agoda",
				checkin_date: "2020-01-01T00:00:00.000Z",
				vcc_payment: {
					metadata: { amount_to_charge_usd: 25 },
				},
				payment_details: {},
			}}
		/>,
	);

	fireEvent.click(screen.getByRole("button", { name: "Enter OTA Virtual Card" }));
	await screen.findByTitle("Secure Bank of America card form");
	expect(screen.queryByRole("button", { name: /review secure charge/i })).not.toBeInTheDocument();
	expect(screen.queryByText("Final review")).not.toBeInTheDocument();
	expect(createBofaHostedCheckoutSession).toHaveBeenCalledTimes(1);
	expect(createBofaHostedCheckoutSession).toHaveBeenCalledWith(
		expect.objectContaining({
			reservationId: "reservation-saved-amount",
			usdAmount: "25.00",
			currency: "USD",
			proceedWithoutRoom: true,
		}),
	);
});

test("a one-decimal amount is submitted as the exact two-decimal USD value", async () => {
	getBofaVccHealth.mockResolvedValue({ readyForCharge: true });
	getReservationBofaVccStatus.mockResolvedValue({
		alreadyCharged: false,
		processing: false,
		outcomeUnknown: false,
		attemptedBefore: false,
		retryAllowed: true,
		lastFailureCode: "203",
		lastFailureMessage: "Invalid merchant",
	});
	createBofaHostedCheckoutSession.mockResolvedValue({
		endpointUrl: "https://secureacceptance.merchant-services.bankofamerica.com/embedded/pay",
		fields: { transaction_uuid: "decimal-session", signature: "test-signature" },
		session: { transactionUuid: "decimal-session", amountUsd: 67.3, currency: "USD" },
	});

	render(
		<PaymentTrigger
			reservation={{
				_id: "reservation-decimal",
				confirmation_number: "PMS-DECIMAL",
				booking_source: "Agoda",
				checkin_date: "2020-01-01T00:00:00.000Z",
				payment_details: {},
			}}
		/>,
	);

	fireEvent.click(screen.getByRole("button", { name: "Enter OTA Virtual Card" }));
	await screen.findByText("Secure Bank of America embedded checkout is configured.");
	const amountInput = await screen.findByLabelText("Amount (USD)");
	fireEvent.change(amountInput, { target: { value: "67.3" } });
	fireEvent.blur(amountInput);

	await screen.findByTitle("Secure Bank of America card form");
	expect(amountInput.value).toBe("67.30");
	expect(createBofaHostedCheckoutSession).toHaveBeenCalledWith(
		expect.objectContaining({
			reservationId: "reservation-decimal",
			usdAmount: "67.30",
		}),
	);
});

test("other OTA cards request only a ZIP or postal code and no street address", async () => {
	getBofaVccHealth.mockResolvedValue({ readyForCharge: true });
	getReservationBofaVccStatus.mockResolvedValue({
		alreadyCharged: false,
		processing: false,
		outcomeUnknown: false,
		attemptedBefore: false,
	});
	createBofaHostedCheckoutSession.mockResolvedValue({
		endpointUrl: "https://secureacceptance.merchant-services.bankofamerica.com/embedded/pay",
		fields: { transaction_uuid: "test-session-2", signature: "test-signature" },
		session: { transactionUuid: "test-session-2", amountUsd: 20, currency: "USD" },
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
	await screen.findByText("Secure Bank of America embedded checkout is configured.");
	const postalCodeInput = await screen.findByLabelText("ZIP / postal code");
	await waitFor(() => expect(postalCodeInput).toBeVisible());
	expect(
		screen.queryByLabelText(/address line|street address|city|state/i),
	).not.toBeInTheDocument();
	expect(
		screen.getByText("No street address is requested for this card."),
	).toBeVisible();

	fireEvent.change(screen.getByLabelText("Amount (USD)"), {
		target: { value: "20" },
	});
	fireEvent.change(postalCodeInput, { target: { value: "92376" } });
	fireEvent.blur(postalCodeInput);
	await screen.findByTitle("Secure Bank of America card form");
	expect(screen.queryByRole("button", { name: /review secure charge/i })).not.toBeInTheDocument();
	expect(createBofaHostedCheckoutSession).toHaveBeenCalledWith(
		expect.objectContaining({
			reservationId: "reservation-2",
			usdAmount: "20.00",
			currency: "USD",
			billingPostalCode: "92376",
		}),
	);
});

test("an expired blank form can be archived and automatically restarted", async () => {
	getBofaVccHealth.mockResolvedValue({ readyForCharge: true });
	getReservationBofaVccStatus.mockResolvedValueOnce({
		alreadyCharged: false,
		processing: false,
		outcomeUnknown: true,
		attemptedBefore: true,
		canDiscardUnsubmittedSession: true,
		warningMessage: "The prior result is not conclusive.",
		secureAcceptance: {
			status: "expired_unconfirmed",
			referenceNumber: "JB-EXPIRED-1",
		},
	});
	getReservationBofaVccStatus.mockResolvedValue({
		alreadyCharged: false,
		processing: true,
		outcomeUnknown: false,
		attemptedBefore: false,
		canDiscardUnsubmittedSession: false,
		secureAcceptance: { status: "pending" },
	});
	abandonUnsubmittedBofaHostedCheckoutSession.mockResolvedValue({
		alreadyCharged: false,
		processing: false,
		outcomeUnknown: false,
		attemptedBefore: false,
		canDiscardUnsubmittedSession: false,
		secureAcceptance: { status: "abandoned_unsubmitted" },
	});
	createBofaHostedCheckoutSession.mockResolvedValue({
		endpointUrl: "https://secureacceptance.merchant-services.bankofamerica.com/embedded/pay",
		fields: { transaction_uuid: "fresh-session", signature: "test-signature" },
		session: { transactionUuid: "fresh-session", amountUsd: 20, currency: "USD" },
	});

	render(
		<PaymentTrigger
			reservation={{
				_id: "reservation-expired-form",
				confirmation_number: "TEST-EXPIRED",
				booking_source: "Agoda",
				checkin_date: "2020-01-01T00:00:00.000Z",
				vcc_payment: { metadata: { amount_to_charge_usd: 20 } },
				payment_details: {},
			}}
		/>,
	);

	fireEvent.click(screen.getByRole("button", { name: "Enter OTA Virtual Card" }));
	const restart = await screen.findByRole("button", {
		name: /I did not submit it/i,
	});
	fireEvent.click(restart);

	await screen.findByTitle("Secure Bank of America card form");
	expect(abandonUnsubmittedBofaHostedCheckoutSession).toHaveBeenCalledWith({
		token: "test-token",
		reservationId: "reservation-expired-form",
		referenceNumber: "JB-EXPIRED-1",
	});
	expect(createBofaHostedCheckoutSession).toHaveBeenCalledTimes(1);
	await waitFor(() =>
		expect(getReservationBofaVccStatus.mock.calls.length).toBeGreaterThanOrEqual(2),
	);
	fireEvent.click(screen.getByRole("button", { name: "Close window" }));
	await waitFor(() =>
		expect(screen.queryByText("Process OTA Virtual Card")).not.toBeInTheDocument(),
	);
});

test("an active checkout resumes the same bank amount instead of showing a block", async () => {
	getBofaVccHealth.mockResolvedValue({ readyForCharge: true });
	getReservationBofaVccStatus.mockResolvedValue({
		alreadyCharged: false,
		processing: true,
		outcomeUnknown: false,
		attemptedBefore: false,
		secureAcceptance: {
			status: "pending",
			amountUsd: 10,
			resumeAvailable: true,
		},
	});
	createBofaHostedCheckoutSession.mockResolvedValue({
		resumed: true,
		endpointUrl: "https://secureacceptance.merchant-services.bankofamerica.com/embedded/pay",
		fields: { transaction_uuid: "same-active-session", signature: "new-signature" },
		session: {
			transactionUuid: "same-active-session",
			amountUsd: 10,
			currency: "USD",
			resumed: true,
		},
	});

	render(
		<PaymentTrigger
			reservation={{
				_id: "reservation-active-session",
				reservation_id: "OTA-10",
				confirmation_number: "PMS-10",
				booking_source: "Agoda",
				checkin_date: "2020-01-01T00:00:00.000Z",
				vcc_payment: { metadata: { amount_to_charge_usd: 20 } },
				payment_details: {},
			}}
		/>,
	);

	fireEvent.click(screen.getByRole("button", { name: "Enter OTA Virtual Card" }));
	await screen.findByTitle("Secure Bank of America card form");
	await waitFor(() =>
		expect(screen.getByText("Bank of America will process $10.00 USD.")).toBeVisible(),
	);
	expect(
		screen.getByText(/existing secure checkout was resumed automatically/i),
	).toBeVisible();
	expect(screen.queryByText(/blocked from another virtual-card attempt/i)).not.toBeInTheDocument();
	expect(createBofaHostedCheckoutSession).toHaveBeenCalledWith(
		expect.objectContaining({
			reservationId: "reservation-active-session",
			usdAmount: "10.00",
		}),
	);
	fireEvent.click(screen.getByRole("button", { name: "Close window" }));
});
