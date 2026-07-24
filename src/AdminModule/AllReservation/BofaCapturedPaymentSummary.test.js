import React from "react";
import { render, screen } from "@testing-library/react";
import BofaCapturedPaymentSummary, {
	mergeVerifiedBofaCapture,
	selectRecordedExternalVccCapture,
	selectReservationVccCapture,
	selectSanitizedVccCaptureSummary,
	selectVerifiedBofaCapture,
} from "./BofaCapturedPaymentSummary";

const capture = {
	verified: true,
	status: "captured",
	amountUsd: 67.3,
	currency: "USD",
	capturedAt: "2026-07-24T01:00:00.000Z",
	provider: "agoda",
	referenceNumber: "JB-8613390780-TEST",
	transactionId: "txn-123",
	reconciliationId: "recon-123",
	chargeCount: 1,
};

test("renders a verified Bank of America USD capture in English LTR", () => {
	const reservation = mergeVerifiedBofaCapture({ booking_source: "agoda" }, capture);
	render(<BofaCapturedPaymentSummary reservation={reservation} />);

	const card = screen.getByTestId("bofa-captured-payment-summary");
	expect(card.getAttribute("dir")).toBe("ltr");
	expect(screen.getByText("Captured successfully")).toBeTruthy();
	expect(screen.getByText("67.30")).toBeTruthy();
	expect(screen.getByText("USD")).toBeTruthy();
	expect(screen.getByText("Bank of America")).toBeTruthy();
	expect(screen.getByText("Agoda")).toBeTruthy();
	expect(screen.getByText("JB-8613390780-TEST")).toBeTruthy();
	expect(selectVerifiedBofaCapture(reservation)?.amountUsd).toBe(67.3);
});

test("renders nothing for a declined or unverified attempt", () => {
	const declined = mergeVerifiedBofaCapture({ booking_source: "agoda" }, capture);
	declined.bofa_payment.secure_acceptance.status = "declined";
	const { container } = render(
		<BofaCapturedPaymentSummary reservation={declined} />,
	);
	expect(container.innerHTML).toBe("");
	expect(
		mergeVerifiedBofaCapture({}, { ...capture, verified: false }),
	).toEqual({});
});

const externalVirtualTerminalReservation = {
	reservation_id: "675894003",
	booking_source: "agoda",
	payment_details: {
		captured: true,
		vccCharged: true,
		vccCaptureId: "3KS57024FW675651X",
		finalCaptureTransactionId: "3KS57024FW675651X",
		lastChargeVia: "VCC_PAYPAL_VIRTUAL_TERMINAL_EXTERNAL",
		lastChargeAt: "2026-07-24T17:11:28.000Z",
	},
	paypal_details: {
		captured_total_usd: 67,
		initial: {
			capture_id: "3KS57024FW675651X",
			capture_status: "COMPLETED",
			amount: "67.00",
			currency: "USD",
		},
		external_virtual_terminal: {
			transaction_id: "3KS57024FW675651X",
			status: "COMPLETED",
			invoice_id: "675894003",
			gross_amount_usd: 67,
			currency: "USD",
			transaction_at: "2026-07-24T17:11:28.000Z",
		},
	},
	vcc_payment: {
		source: "agoda",
		charged: true,
		total_captured_usd: 67,
		last_success_at: "2026-07-24T17:11:28.000Z",
	},
};

test("renders a reconciled PayPal Virtual Terminal OTA capture", () => {
	render(
		<BofaCapturedPaymentSummary
			reservation={externalVirtualTerminalReservation}
		/>,
	);

	expect(screen.getByText("Captured successfully")).toBeTruthy();
	expect(screen.getByText("67.00")).toBeTruthy();
	expect(screen.getByText("PayPal Virtual Terminal")).toBeTruthy();
	expect(screen.getByText("Reconciled")).toBeTruthy();
	expect(screen.getByText("675894003")).toBeTruthy();
	expect(screen.getByText("3KS57024FW675651X")).toBeTruthy();
	expect(
		selectRecordedExternalVccCapture(externalVirtualTerminalReservation)
			?.amountUsd,
	).toBe(67);
});

test("does not render an external capture when its evidence disagrees", () => {
	const mismatched = {
		...externalVirtualTerminalReservation,
		paypal_details: {
			...externalVirtualTerminalReservation.paypal_details,
			external_virtual_terminal: {
				...externalVirtualTerminalReservation.paypal_details
					.external_virtual_terminal,
				invoice_id: "different-reservation",
			},
		},
	};
	const { container } = render(
		<BofaCapturedPaymentSummary reservation={mismatched} />,
	);
	expect(container.innerHTML).toBe("");
});

test("renders the sanitized capture summary returned by the admin API", () => {
	const reservation = {
		vcc_capture_summary: {
			verified: true,
			status: "captured",
			amountUsd: 67,
			currency: "USD",
			capturedAt: "2026-07-24T17:11:28.000Z",
			provider: "agoda",
			referenceNumber: "675894003",
			referenceLabel: "OTA confirmation",
			transactionId: "3KS57024FW675651X",
			evidence: "Reconciled",
			gateway: "PayPal Virtual Terminal",
		},
	};
	render(<BofaCapturedPaymentSummary reservation={reservation} />);

	expect(screen.getByText("Captured successfully")).toBeTruthy();
	expect(screen.getByText("67.00")).toBeTruthy();
	expect(selectSanitizedVccCaptureSummary(reservation)?.currency).toBe("USD");
	expect(selectReservationVccCapture(reservation)?.amountUsd).toBe(67);
});

test("rejects an unverified sanitized capture summary", () => {
	const reservation = {
		vcc_capture_summary: {
			verified: false,
			status: "captured",
			amountUsd: 67,
			currency: "USD",
			evidence: "Reconciled",
			gateway: "PayPal Virtual Terminal",
		},
	};
	expect(selectSanitizedVccCaptureSummary(reservation)).toBeNull();
});
