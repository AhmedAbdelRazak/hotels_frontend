import React from "react";
import { render, screen } from "@testing-library/react";
import BofaCapturedPaymentSummary, {
	mergeVerifiedBofaCapture,
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
