import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Spin } from "antd";
import styled, { createGlobalStyle } from "styled-components";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import {
	chargeReservationViaBofaVcc,
	getBofaVccHealth,
	getReservationBofaVccStatus,
} from "../apiAdmin";
import { isSuperAdminUser } from "../utils/superUsers";
import {
	digitsOnly,
	formatCardNumber,
	formatExpiry,
	formatPostalCode,
	getCheckinEligibility,
	initialVccForm,
	providerLabel,
	requiresBillingPostalCode,
	resolveVccProvider,
	validateVccForm,
} from "./bofaVccUtils";

export const BOFA_VCC_MODAL_Z_INDEX = 110000;
const BOFA_VCC_MODAL_ROOT_CLASS = "bofa-vcc-modal-root";
const BOFA_VCC_MODAL_WRAP_CLASS = "bofa-vcc-modal-wrap";

const BofaVccModal = ({ open, reservation, onClose, onReservationUpdated }) => {
	const auth = isAuthenticated() || {};
	const token = auth?.token || "";
	const isSuperAdmin = isSuperAdminUser(auth?.user);
	const [form, setForm] = useState(() => initialVccForm(reservation));
	const [step, setStep] = useState("details");
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [loadingReadiness, setLoadingReadiness] = useState(false);
	const [health, setHealth] = useState(null);
	const [status, setStatus] = useState(null);
	const [proceedWithoutRoom, setProceedWithoutRoom] = useState(false);

	const provider = resolveVccProvider(reservation?.booking_source);
	const providerName =
		provider === "other"
			? String(reservation?.booking_source || "Other OTA").trim()
			: providerLabel(provider);
	const requirePostalCode = requiresBillingPostalCode(provider);
	const eligibility = useMemo(
		() => getCheckinEligibility(reservation?.checkin_date),
		[reservation?.checkin_date],
	);

	useEffect(() => {
		if (!open) return;
		setForm(initialVccForm(reservation));
		setStep("details");
		setError("");
		setHealth(null);
		setStatus(null);
		setProceedWithoutRoom(false);
		if (!isSuperAdmin || !reservation?._id) return;

		let active = true;
		setLoadingReadiness(true);
		Promise.allSettled([
			getBofaVccHealth({ token, probe: true }),
			getReservationBofaVccStatus(reservation._id, token),
		])
			.then(([healthResult, statusResult]) => {
				if (!active) return;
				if (healthResult.status === "fulfilled") {
					setHealth(healthResult.value || null);
				} else {
					setHealth({
						readyForCharge: false,
						message:
							healthResult.reason?.response?.message ||
							healthResult.reason?.message ||
							"The Bank of America readiness check failed.",
					});
				}
				if (statusResult.status === "fulfilled") {
					setStatus(statusResult.value || null);
				} else {
					setStatus({
						loadError:
							statusResult.reason?.response?.message ||
							statusResult.reason?.message ||
							"The reservation payment status could not be loaded.",
					});
				}
			})
			.finally(() => {
				if (active) setLoadingReadiness(false);
			});
		return () => {
			active = false;
		};
	}, [open, reservation, isSuperAdmin, token]);

	if (!isSuperAdmin) return null;

	const setField = (field, value) => {
		setError("");
		setForm((current) => ({ ...current, [field]: value }));
	};

	const clearSensitiveFields = () =>
		setForm((current) => ({ ...current, cardNumber: "", cvv: "" }));

	const handleReview = () => {
		if (!eligibility.ok) {
			setError(eligibility.message);
			return;
		}
		if (health?.readyForCharge !== true) {
			setError("Bank of America is not ready for a charge. Review the readiness message below.");
			return;
		}
		if (status?.loadError) {
			setError(
				"The reservation payment status could not be verified. Close this window and try again before entering card details.",
			);
			return;
		}
		if (status?.alreadyCharged) {
			setError("This reservation has already been charged via Bank of America.");
			return;
		}
		if (status?.processing || status?.outcomeUnknown || status?.attemptedBefore) {
			setError(
				status?.warningMessage ||
					"This reservation is blocked from another virtual-card attempt.",
			);
			return;
		}
		const validationError = validateVccForm(form, new Date(), {
			requirePostalCode,
		});
		if (validationError) {
			setError(validationError);
			return;
		}
		setError("");
		setStep("review");
	};

	const handleSubmit = async () => {
		if (submitting) return;
		const validationError = validateVccForm(form, new Date(), {
			requirePostalCode,
		});
		if (validationError) {
			setError(validationError);
			setStep("details");
			return;
		}

		setSubmitting(true);
		setError("");
		try {
			const response = await chargeReservationViaBofaVcc({
				token,
				reservationId: reservation._id,
				usdAmount: Number(form.amountUsd),
				currency: "USD",
				cardNumber: digitsOnly(form.cardNumber, 19),
				cardExpiry: form.expiry,
				cardCVV: digitsOnly(form.cvv, 4),
				billingPostalCode: requirePostalCode
					? form.billingPostalCode
					: "",
				proceedWithoutRoom,
			});

			clearSensitiveFields();
			if (response?.reservation && typeof onReservationUpdated === "function") {
				onReservationUpdated(response.reservation);
			}
			toast.success(response?.message || "The OTA virtual card was charged successfully.");
			onClose();
		} catch (submitError) {
			const payload = submitError?.response || {};
			if (payload?.issue === "BOFA_VCC_ROOM_CONFIRM_REQUIRED") {
				setProceedWithoutRoom(true);
				setError(
					"No room is assigned. Review again to confirm that you want to continue without a room assignment.",
				);
				setStep("details");
				return;
			}
			clearSensitiveFields();
			let refreshedStatus = payload?.bofaStatus || status;
			try {
				refreshedStatus =
					(await getReservationBofaVccStatus(reservation._id, token)) ||
					refreshedStatus;
			} catch {
				// Keep the last verified state. The backend remains authoritative and
				// will reject a retry if the attempt is blocked or still processing.
			}
			setStatus(refreshedStatus);
			setError(
				payload?.message ||
					submitError?.message ||
					"Bank of America could not process this virtual card.",
			);
			setStep("details");
		} finally {
			setSubmitting(false);
		}
	};

	const readinessMessage =
		health?.probe?.classification?.message ||
		health?.probe?.error?.message ||
		health?.checks?.errors?.[0] ||
		health?.message ||
		"";
	const blockedMessage = status?.alreadyCharged
		? "This reservation was already charged successfully. Another charge is blocked."
		: status?.warningMessage || status?.loadError || "";
	const cardLast4 = digitsOnly(form.cardNumber, 19).slice(-4);
	const readinessReference = health?.probe?.correlationId || "";

	return (
		<>
			<BofaVccModalGlobalStyle />
			<Modal
				title={<span dir='ltr' lang='en'>Process OTA Virtual Card</span>}
				open={open}
				onCancel={() => !submitting && onClose()}
				footer={null}
				width={760}
				centered
				zIndex={BOFA_VCC_MODAL_Z_INDEX}
				rootClassName={BOFA_VCC_MODAL_ROOT_CLASS}
				wrapClassName={BOFA_VCC_MODAL_WRAP_CLASS}
				className='bofa-vcc-modal'
				styles={{
					mask: { zIndex: BOFA_VCC_MODAL_Z_INDEX - 1 },
					wrapper: { zIndex: BOFA_VCC_MODAL_Z_INDEX },
					content: {
						position: "relative",
						zIndex: BOFA_VCC_MODAL_Z_INDEX + 1,
					},
					header: { direction: "ltr", textAlign: "left" },
					body: {
						direction: "ltr",
						textAlign: "left",
						maxHeight: "calc(100vh - 180px)",
						overflowY: "auto",
					},
				}}
				getContainer={() => document.body}
				destroyOnClose
				maskClosable={!submitting}
				keyboard={!submitting}
			>
				<ModalBody dir='ltr' lang='en'>
				<SummaryGrid>
					<div><span>OTA</span><strong>{providerName}</strong></div>
					<div><span>Reservation</span><strong>{reservation?.confirmation_number || "N/A"}</strong></div>
					<div><span>Check-in</span><strong>{eligibility.checkinDate || "Invalid"}</strong></div>
					<div><span>Currency</span><strong>USD only</strong></div>
				</SummaryGrid>

				{loadingReadiness ? (
					<StatusLine><Spin size='small' /> Checking Bank of America and reservation status...</StatusLine>
				) : null}
				{!eligibility.ok ? <Alert type='error' showIcon message={eligibility.message} /> : null}
				{health && health.readyForCharge !== true ? (
					<Alert
						type='error'
						showIcon
						message='Bank of America gateway activation is required'
						description={`${readinessMessage}${
							readinessReference
								? ` Support reference: ${readinessReference}.`
								: ""
						}`}
					/>
				) : null}
				{health?.readyForCharge === true ? (
					<Alert type='success' showIcon message='Bank of America connection and credentials are ready.' />
				) : null}
				{blockedMessage ? <Alert type={status?.alreadyCharged ? "success" : "warning"} showIcon message={blockedMessage} /> : null}
				{proceedWithoutRoom ? (
					<Alert type='warning' showIcon message='No assigned room was found. Your next confirmation will explicitly proceed without one.' />
				) : null}

				{step === "details" ? (
					<form autoComplete='off' onSubmit={(event) => { event.preventDefault(); handleReview(); }}>
						<SectionTitle>Charge details</SectionTitle>
						<FormGrid>
							<Field className='full'><label htmlFor='bofa-vcc-amount'>Amount (USD)</label><InputWrap><span>$</span><input id='bofa-vcc-amount' inputMode='decimal' value={form.amountUsd} onChange={(event) => setField("amountUsd", event.target.value.replace(/[^0-9.]/g, ""))} placeholder='0.00' /></InputWrap><small>The gateway request is always sent in USD.</small></Field>
							<Field className='full'><label htmlFor='bofa-vcc-number'>Virtual card number</label><input id='bofa-vcc-number' inputMode='numeric' value={form.cardNumber} onChange={(event) => setField("cardNumber", formatCardNumber(event.target.value))} placeholder='0000 0000 0000 0000' maxLength={23} autoComplete='new-password' /></Field>
							<Field><label htmlFor='bofa-vcc-expiry'>Expiration (MM/YY)</label><input id='bofa-vcc-expiry' inputMode='numeric' value={form.expiry} onChange={(event) => setField("expiry", formatExpiry(event.target.value))} placeholder='MM/YY' maxLength={5} autoComplete='new-password' /></Field>
							<Field><label htmlFor='bofa-vcc-cvv'>Security code</label><input id='bofa-vcc-cvv' type='password' inputMode='numeric' value={form.cvv} onChange={(event) => setField("cvv", digitsOnly(event.target.value, 4))} placeholder='CVV' maxLength={4} autoComplete='new-password' /></Field>
							{requirePostalCode ? (
								<Field className='full'>
									<label htmlFor='bofa-vcc-postal-code'>ZIP / postal code</label>
									<input id='bofa-vcc-postal-code' inputMode='text' value={form.billingPostalCode || ""} onChange={(event) => setField("billingPostalCode", formatPostalCode(event.target.value))} placeholder='Enter the code supplied with the virtual card' maxLength={14} autoComplete='postal-code' />
									<small>No street address is requested for this card.</small>
								</Field>
							) : null}
						</FormGrid>

						<ServerBillingNote>
							{requirePostalCode
								? "Only the ZIP / postal code is collected for this OTA card. Cardholder identity is server-managed, and no street address is requested."
								: `${providerName} cardholder and billing details are applied securely by the backend from the reservation source. They cannot be viewed or changed in the browser.`}
						</ServerBillingNote>
						<SecurityNote>Card number, expiration, CVV, and any entered postal code are held only while this modal is open. They are sent to the backend over HTTPS for the Bank of America request and are never saved in the reservation, logs, or browser storage.</SecurityNote>
						{error ? <InlineError role='alert'>{error}</InlineError> : null}
						<Actions><button type='button' className='secondary' onClick={onClose}>Cancel</button><button type='submit' disabled={loadingReadiness || health?.readyForCharge !== true || !eligibility.ok || !!status?.loadError || status?.alreadyCharged || status?.processing || status?.outcomeUnknown || status?.attemptedBefore}>Review charge</button></Actions>
					</form>
				) : (
					<ReviewPanel>
						<SectionTitle>Final review</SectionTitle>
						<dl><div><dt>Amount</dt><dd>${Number(form.amountUsd).toFixed(2)} USD</dd></div><div><dt>Card</dt><dd>Ending in {cardLast4}</dd></div>{requirePostalCode ? <div><dt>ZIP / postal code</dt><dd>{form.billingPostalCode}</dd></div> : <div><dt>Billing profile</dt><dd>{providerName} — securely managed by the backend</dd></div>}<div><dt>Check-in rule</dt><dd>Eligible: check-in is today or in the past</dd></div></dl>
						<Alert type='warning' showIcon message='Confirm once only' description='Do not refresh, close the page, or click twice while Bank of America is processing. If the outcome is uncertain, the backend will block another attempt until reconciliation.' />
						{error ? <InlineError role='alert'>{error}</InlineError> : null}
						<Actions><button type='button' className='secondary' disabled={submitting} onClick={() => setStep("details")}>Back</button><button type='button' className='danger' disabled={submitting} onClick={handleSubmit}>{submitting ? "Processing once..." : `Charge $${Number(form.amountUsd).toFixed(2)} USD`}</button></Actions>
					</ReviewPanel>
				)}
				</ModalBody>
			</Modal>
		</>
	);
};

export default BofaVccModal;

const BofaVccModalGlobalStyle = createGlobalStyle`
	.${BOFA_VCC_MODAL_ROOT_CLASS} {
		position: relative;
		z-index: ${BOFA_VCC_MODAL_Z_INDEX} !important;
	}

	.${BOFA_VCC_MODAL_ROOT_CLASS} .ant-modal-mask {
		background: rgba(15, 23, 42, 0.72) !important;
		backdrop-filter: blur(2px);
		z-index: ${BOFA_VCC_MODAL_Z_INDEX - 1} !important;
	}

	.${BOFA_VCC_MODAL_ROOT_CLASS} .ant-modal-wrap,
	.ant-modal-wrap.${BOFA_VCC_MODAL_WRAP_CLASS} {
		opacity: 1 !important;
		visibility: visible !important;
		z-index: ${BOFA_VCC_MODAL_Z_INDEX} !important;
	}

	.${BOFA_VCC_MODAL_ROOT_CLASS} .ant-modal,
	.ant-modal-wrap.${BOFA_VCC_MODAL_WRAP_CLASS} .ant-modal {
		max-width: calc(100vw - 24px);
		opacity: 1 !important;
		position: relative;
		transform: none !important;
		visibility: visible !important;
		z-index: ${BOFA_VCC_MODAL_Z_INDEX} !important;
	}

	.${BOFA_VCC_MODAL_ROOT_CLASS} .ant-modal-content,
	.ant-modal-wrap.${BOFA_VCC_MODAL_WRAP_CLASS} .ant-modal-content {
		opacity: 1 !important;
		position: relative;
		visibility: visible !important;
		z-index: ${BOFA_VCC_MODAL_Z_INDEX + 1} !important;
	}
`;

const ModalBody = styled.div`
	direction: ltr !important;
	text-align: left !important;
	color: #172033;
	.ant-alert { margin: 10px 0; text-align: left; direction: ltr; }
`;

const SummaryGrid = styled.div`
	display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px;
	div { padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8fafc; }
	span, strong { display: block; }
	span { color: #64748b; font-size: 12px; margin-bottom: 2px; }
	strong { overflow-wrap: anywhere; }
	@media (max-width: 640px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;

const StatusLine = styled.div`
	display: flex; align-items: center; gap: 8px; padding: 10px 0; color: #475569;
`;

const SectionTitle = styled.h4`
	margin: 18px 0 10px; font-size: 16px; color: #0f172a;
`;

const FormGrid = styled.div`
	display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
	.full { grid-column: 1 / -1; }
	@media (max-width: 600px) { grid-template-columns: 1fr; .full { grid-column: auto; } }
`;

const Field = styled.div`
	label { display: block; font-weight: 650; margin-bottom: 5px; }
	input { width: 100%; height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; direction: ltr; text-align: left; background: #fff; }
	input:focus { outline: 2px solid rgba(22, 119, 255, 0.2); border-color: #1677ff; }
	small { display: block; margin-top: 4px; color: #64748b; }
`;

const InputWrap = styled.div`
	display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;
	span { padding-left: 11px; font-weight: 700; }
	input { border: 0; }
`;

const ServerBillingNote = styled.p`
	margin: 14px 0 0; padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #14532d; font-size: 13px;
`;

const SecurityNote = styled.p`
	margin: 14px 0 0; padding: 10px 12px; background: #eef6ff; border: 1px solid #bfdbfe; border-radius: 8px; color: #1e3a5f; font-size: 13px;
`;

const InlineError = styled.p`
	margin: 12px 0 0; padding: 10px 12px; color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-weight: 600;
`;

const Actions = styled.div`
	display: flex; justify-content: flex-end; gap: 9px; margin-top: 18px;
	button { border: 0; border-radius: 8px; padding: 10px 16px; background: #1677ff; color: #fff; font-weight: 650; cursor: pointer; }
	button.secondary { background: #e2e8f0; color: #1e293b; }
	button.danger { background: #b42318; }
	button:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const ReviewPanel = styled.div`
	dl { margin: 0 0 14px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
	dl div { display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
	dl div:last-child { border-bottom: 0; }
	dt { color: #64748b; }
	dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
`;
