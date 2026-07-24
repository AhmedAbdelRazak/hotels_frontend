import React from "react";
import styled from "styled-components";
import {
	BankOutlined,
	CheckCircleFilled,
	SafetyCertificateFilled,
} from "@ant-design/icons";
import { formatSaudiDateTime } from "../../utils/saudiDates";

const clean = (value, maxLength = 160) =>
	String(value == null ? "" : value)
		.trim()
		.slice(0, maxLength);

const positiveMoney = (...values) => {
	for (const value of values) {
		const amount = Number(value);
		if (Number.isFinite(amount) && amount > 0) return amount;
	}
	return 0;
};

export const selectVerifiedBofaCapture = (reservation = {}) => {
	const paymentDetails = reservation?.payment_details || {};
	const bofa = reservation?.bofa_payment || {};
	const vcc = bofa.vcc || {};
	const secureAcceptance = bofa.secure_acceptance || {};
	const lastCapture = vcc.last_capture || {};
	const accepted =
		vcc.charged === true &&
		paymentDetails.bofaVccCharged === true &&
		paymentDetails.bofaSaAccepted === true &&
		clean(secureAcceptance.status, 30).toLowerCase() === "accepted" &&
		secureAcceptance.last_response_signature_valid === true &&
		clean(lastCapture.decision, 30).toUpperCase() === "ACCEPT" &&
		clean(lastCapture.reason_code, 20) === "100";
	if (!accepted) return null;

	const currency = clean(
		lastCapture.currency || secureAcceptance.currency || "USD",
		3,
	).toUpperCase();
	const amountUsd = positiveMoney(
		vcc.total_captured_usd,
		lastCapture.amount_usd,
		secureAcceptance.amount_usd,
	);
	if (currency !== "USD" || amountUsd <= 0) return null;

	return {
		evidence: "Verified",
		amountUsd,
		currency: "USD",
		gateway: "Bank of America",
		capturedAt:
			vcc.last_success_at || paymentDetails.bofaVccChargedAt || null,
		provider: clean(vcc.source || reservation?.booking_source, 60),
		referenceNumber: clean(
			lastCapture.reference_number || secureAcceptance.last_reference_number,
			50,
		),
		referenceLabel: "Merchant reference",
		transactionId: clean(
			lastCapture.transaction_id ||
				vcc.last_transaction_id ||
				paymentDetails.bofaVccTransactionId,
			100,
		),
	};
};

const sameMoney = (left, right) =>
	Math.round(Number(left) * 100) === Math.round(Number(right) * 100);

export const selectRecordedExternalVccCapture = (reservation = {}) => {
	const paymentDetails = reservation?.payment_details || {};
	const paypal = reservation?.paypal_details || {};
	const external = paypal.external_virtual_terminal || {};
	const initial = paypal.initial || {};
	const vcc = reservation?.vcc_payment || {};
	const transactionId = clean(external.transaction_id, 100);
	const amountUsd = positiveMoney(external.gross_amount_usd);
	const invoiceId = clean(external.invoice_id, 80);
	const reservationReference = clean(reservation?.reservation_id, 80);
	const status = clean(external.status, 30).toUpperCase();
	const currency = clean(external.currency, 3).toUpperCase();
	const lastChargeVia = clean(paymentDetails.lastChargeVia, 80).toUpperCase();
	const initialStatus = clean(
		initial.capture_status || initial.status,
		30,
	).toUpperCase();

	const recorded =
		paymentDetails.captured === true &&
		paymentDetails.vccCharged === true &&
		vcc.charged === true &&
		lastChargeVia === "VCC_PAYPAL_VIRTUAL_TERMINAL_EXTERNAL" &&
		status === "COMPLETED" &&
		currency === "USD" &&
		amountUsd > 0 &&
		transactionId &&
		clean(paymentDetails.vccCaptureId, 100) === transactionId &&
		clean(paymentDetails.finalCaptureTransactionId, 100) === transactionId &&
		clean(initial.capture_id, 100) === transactionId &&
		initialStatus === "COMPLETED" &&
		clean(initial.currency, 3).toUpperCase() === "USD" &&
		sameMoney(initial.amount, amountUsd) &&
		sameMoney(paypal.captured_total_usd, amountUsd) &&
		sameMoney(vcc.total_captured_usd, amountUsd) &&
		invoiceId &&
		invoiceId === reservationReference;
	if (!recorded) return null;

	return {
		evidence: "Reconciled",
		amountUsd,
		currency: "USD",
		gateway: "PayPal Virtual Terminal",
		capturedAt:
			external.transaction_at ||
			vcc.last_success_at ||
			paymentDetails.lastChargeAt ||
			null,
		provider: clean(vcc.source || reservation?.booking_source, 60),
		referenceNumber: invoiceId,
		referenceLabel: "OTA confirmation",
		transactionId,
	};
};

export const mergeVerifiedBofaCapture = (reservation = {}, capture = null) => {
	if (
		capture?.verified !== true ||
		clean(capture?.status, 30).toLowerCase() !== "captured" ||
		clean(capture?.currency, 3).toUpperCase() !== "USD" ||
		positiveMoney(capture?.amountUsd) <= 0
	) {
		return reservation;
	}

	const amountUsd = positiveMoney(capture.amountUsd);
	const capturedAt = capture.capturedAt || new Date().toISOString();
	return {
		...reservation,
		bofa_payment: {
			...(reservation?.bofa_payment || {}),
			secure_acceptance: {
				...(reservation?.bofa_payment?.secure_acceptance || {}),
				status: "accepted",
				currency: "USD",
				amount_usd: amountUsd,
				last_reference_number: capture.referenceNumber || "",
				last_transaction_id: capture.transactionId || "",
				last_response_signature_valid: true,
				last_decision: "ACCEPT",
				last_reason_code: "100",
			},
			vcc: {
				...(reservation?.bofa_payment?.vcc || {}),
				source: capture.provider || reservation?.booking_source || "",
				charged: true,
				processing: false,
				outcome_unknown: false,
				charge_count: Number(capture.chargeCount || 1),
				total_captured_usd: amountUsd,
				last_success_at: capturedAt,
				last_transaction_id: capture.transactionId || "",
				last_reconciliation_id: capture.reconciliationId || "",
				last_capture: {
					decision: "ACCEPT",
					reason_code: "100",
					currency: "USD",
					amount_usd: amountUsd,
					reference_number: capture.referenceNumber || "",
					transaction_id: capture.transactionId || "",
					reconciliation_id: capture.reconciliationId || "",
				},
			},
		},
		payment_details: {
			...(reservation?.payment_details || {}),
			bofaVccCharged: true,
			bofaVccChargedAt: capturedAt,
			bofaVccTransactionId: capture.transactionId || "",
			bofaSaAccepted: true,
			bofaSaAcceptedAt: capturedAt,
		},
	};
};

const providerName = (value) => {
	const normalized = clean(value, 60).toLowerCase();
	if (normalized === "agoda") return "Agoda";
	if (normalized === "expedia") return "Expedia";
	if (normalized === "booking" || normalized === "booking.com") {
		return "Booking.com";
	}
	return clean(value, 60) || "OTA";
};

const BofaCapturedPaymentSummary = ({ reservation }) => {
	const capture =
		selectVerifiedBofaCapture(reservation) ||
		selectRecordedExternalVccCapture(reservation);
	if (!capture) return null;

	return (
		<Card dir='ltr' lang='en' data-testid='bofa-captured-payment-summary'>
			<Header>
				<SuccessIcon aria-hidden='true'>
					<CheckCircleFilled />
				</SuccessIcon>
				<div>
					<Eyebrow>OTA virtual card</Eyebrow>
					<Title>Captured successfully</Title>
				</div>
				<VerifiedBadge>
					<SafetyCertificateFilled /> {capture.evidence}
				</VerifiedBadge>
			</Header>

			<Amount>
				<span>$</span>
				<strong>{capture.amountUsd.toFixed(2)}</strong>
				<em>USD</em>
			</Amount>

			<Details>
				<div>
					<span>Gateway</span>
					<strong>
						<BankOutlined /> {capture.gateway}
					</strong>
				</div>
				<div>
					<span>OTA</span>
					<strong>{providerName(capture.provider)}</strong>
				</div>
				<div>
					<span>Captured at</span>
					<strong>
						{formatSaudiDateTime(capture.capturedAt, {
							language: "English",
							fallback: "Recorded",
						})}
					</strong>
				</div>
				{capture.referenceNumber ? (
					<div>
						<span>{capture.referenceLabel}</span>
						<strong className='reference'>{capture.referenceNumber}</strong>
					</div>
				) : null}
				{capture.transactionId ? (
					<div>
						<span>Transaction ID</span>
						<strong className='reference'>{capture.transactionId}</strong>
					</div>
				) : null}
			</Details>

			<Footer>
				Reservation payment updated. Additional OTA virtual-card charges are
				blocked.
			</Footer>
		</Card>
	);
};

export default BofaCapturedPaymentSummary;

const Card = styled.section`
	background: linear-gradient(145deg, #ecfdf5 0%, #f0fdf4 50%, #ffffff 100%);
	border: 1px solid #4ade80;
	border-radius: 12px;
	box-shadow: 0 8px 18px rgba(5, 150, 105, 0.1);
	color: #0f172a;
	direction: ltr;
	display: grid;
	gap: 10px;
	padding: 12px;
	text-align: left;
`;

const Header = styled.div`
	align-items: center;
	display: grid;
	gap: 9px;
	grid-template-columns: auto minmax(0, 1fr) auto;
`;

const SuccessIcon = styled.span`
	align-items: center;
	background: #047857;
	border-radius: 999px;
	color: #ffffff;
	display: inline-flex;
	font-size: 1.1rem;
	height: 34px;
	justify-content: center;
	width: 34px;
`;

const Eyebrow = styled.span`
	color: #047857;
	display: block;
	font-size: 0.68rem;
	font-weight: 900;
	letter-spacing: 0.07em;
	text-transform: uppercase;
`;

const Title = styled.strong`
	display: block;
	font-size: 0.96rem;
	font-weight: 950;
`;

const VerifiedBadge = styled.span`
	align-items: center;
	background: #dcfce7;
	border: 1px solid #86efac;
	border-radius: 999px;
	color: #047857;
	display: inline-flex;
	font-size: 0.7rem;
	font-weight: 900;
	gap: 4px;
	padding: 4px 8px;
`;

const Amount = styled.div`
	align-items: baseline;
	background: #ffffff;
	border: 1px solid #bbf7d0;
	border-radius: 10px;
	display: flex;
	justify-content: center;
	padding: 9px;

	span { color: #047857; font-size: 1rem; font-weight: 900; }
	strong { color: #065f46; font-size: 1.7rem; font-weight: 950; line-height: 1; margin: 0 4px; }
	em { color: #047857; font-size: 0.78rem; font-style: normal; font-weight: 950; }
`;

const Details = styled.div`
	display: grid;
	gap: 6px;
	grid-template-columns: repeat(2, minmax(0, 1fr));

	div { background: rgba(255, 255, 255, 0.78); border: 1px solid #d1fae5; border-radius: 8px; min-width: 0; padding: 7px; }
	span { color: #64748b; display: block; font-size: 0.66rem; font-weight: 850; }
	strong { color: #0f172a; display: block; font-size: 0.75rem; font-weight: 900; overflow-wrap: anywhere; }
	.reference { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

	@media (max-width: 520px) { grid-template-columns: 1fr; }
`;

const Footer = styled.div`
	color: #166534;
	font-size: 0.7rem;
	font-weight: 850;
	line-height: 1.35;
`;
