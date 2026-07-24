import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Spin } from "antd";
import styled, { createGlobalStyle } from "styled-components";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import {
	abandonUnsubmittedBofaHostedCheckoutSession,
	createBofaHostedCheckoutSession,
	getBofaVccHealth,
	getReservationBofaVccStatus,
} from "../apiAdmin";
import { isSuperAdminUser } from "../utils/superUsers";
import {
	formatPostalCode,
	getCheckinEligibility,
	initialVccForm,
	providerLabel,
	requiresBillingPostalCode,
	resolveVccProvider,
	validateVccForm,
} from "./bofaVccUtils";
import BofaHostedCheckoutFrame from "./BofaHostedCheckoutFrame";

export const BOFA_VCC_MODAL_Z_INDEX = 110000;
const ROOT_CLASS = "bofa-vcc-modal-root";
const WRAP_CLASS = "bofa-vcc-modal-wrap";

const BofaVccModal = ({
	open,
	reservation,
	onClose,
	onReservationUpdated,
	initialAmountUsd = "",
}) => {
	const auth = isAuthenticated() || {};
	const token = auth?.token || "";
	const isSuperAdmin = isSuperAdminUser(auth?.user);
	const initialForm = useCallback(() => {
		const value = initialVccForm(reservation);
		return initialAmountUsd ? { ...value, amountUsd: String(initialAmountUsd) } : value;
	}, [initialAmountUsd, reservation]);
	const [form, setForm] = useState(initialForm);
	const [step, setStep] = useState("details");
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [loadingReadiness, setLoadingReadiness] = useState(false);
	const [health, setHealth] = useState(null);
	const [status, setStatus] = useState(null);
	const [hostedSession, setHostedSession] = useState(null);
	const [recoveringSession, setRecoveringSession] = useState(false);
	const successShown = useRef(false);
	const autoLoadInitialAmount = useRef(false);
	const sessionRequestInFlight = useRef(false);

	const provider = resolveVccProvider(reservation?.booking_source);
	const providerName =
		provider === "other"
			? String(reservation?.booking_source || "Other OTA").trim()
			: providerLabel(provider);
	const otaBookingNumber = String(
		reservation?.customer_details?.confirmation_number2 ||
			reservation?.reservation_id ||
			reservation?.supplierData?.otaConfirmationNumber ||
			reservation?.supplierData?.suppliedBookingNo ||
			"N/A",
	).trim();
	const requirePostalCode = requiresBillingPostalCode(provider);
	const eligibility = useMemo(
		() => getCheckinEligibility(reservation?.checkin_date),
		[reservation?.checkin_date],
	);

	const launchHostedForm = useCallback(async () => {
		if (submitting || sessionRequestInFlight.current) return;
		if (!eligibility.ok) return setError(eligibility.message);
		if (health?.readyForCharge !== true) {
			return setError("Bank of America Hosted Checkout is not ready on the server.");
		}
		if (status?.loadError) return setError(status.loadError);
		if (status?.alreadyCharged) return setError("This reservation was already charged.");
		const resumableActiveSession =
			status?.processing && status?.secureAcceptance?.resumeAvailable;
		if (
			(status?.processing && !resumableActiveSession) ||
			status?.outcomeUnknown ||
			status?.attemptedBefore
		) {
			return setError(
				status?.warningMessage ||
					"This reservation is blocked from another virtual-card attempt.",
			);
		}
		const requestAmountUsd = resumableActiveSession
			? Number(status?.secureAcceptance?.amountUsd || 0)
			: Number(form.amountUsd);
		const requestForm = {
			...form,
			amountUsd: requestAmountUsd > 0 ? String(requestAmountUsd) : form.amountUsd,
		};
		const validationError = validateVccForm(requestForm, new Date(), { requirePostalCode });
		if (validationError) {
			setError(validationError);
			return;
		}
		sessionRequestInFlight.current = true;
		setSubmitting(true);
		setError("");
		try {
			const response = await createBofaHostedCheckoutSession({
				token,
				reservationId: reservation._id,
				usdAmount: requestAmountUsd,
				currency: "USD",
				billingPostalCode: requirePostalCode ? form.billingPostalCode : "",
				proceedWithoutRoom: true,
			});
			if (Number(response?.session?.amountUsd) > 0) {
				setForm((current) => ({
					...current,
					amountUsd: Number(response.session.amountUsd).toFixed(2),
				}));
			}
			setHostedSession(response);
			setStep("hosted");
		} catch (requestError) {
			const payload = requestError?.response || {};
			setStatus(payload?.bofaStatus || status);
			setError(
				payload?.message ||
					requestError?.message ||
					"The secure Bank of America form could not be loaded.",
			);
		} finally {
			sessionRequestInFlight.current = false;
			setSubmitting(false);
		}
	}, [
		eligibility,
		form,
		health?.readyForCharge,
		requirePostalCode,
		reservation?._id,
		status,
		submitting,
		token,
	]);

	const refreshStatus = useCallback(async () => {
		if (!reservation?._id || !token) return null;
		const result = await getReservationBofaVccStatus(reservation._id, token);
		setStatus(result || null);
		return result;
	}, [reservation?._id, token]);

	const restartUnsubmittedForm = async () => {
		const referenceNumber = status?.secureAcceptance?.referenceNumber;
		if (!referenceNumber || recoveringSession) return;
		setRecoveringSession(true);
		setError("");
		try {
			const next = await abandonUnsubmittedBofaHostedCheckoutSession({
				token,
				reservationId: reservation._id,
				referenceNumber,
			});
			setStatus(next);
			autoLoadInitialAmount.current = true;
		} catch (requestError) {
			const payload = requestError?.response || {};
			setStatus(payload?.bofaStatus || status);
			setError(
				payload?.message ||
					requestError?.message ||
					"The previous secure form could not be restarted safely.",
			);
		} finally {
			setRecoveringSession(false);
		}
	};

	useEffect(() => {
		if (!open) return undefined;
		const nextForm = initialForm();
		setForm(nextForm);
		setStep("details");
		setError("");
		setHealth(null);
		setStatus(null);
		setHostedSession(null);
		setRecoveringSession(false);
		successShown.current = false;
		sessionRequestInFlight.current = false;
		autoLoadInitialAmount.current = !validateVccForm(nextForm, new Date(), {
			requirePostalCode,
		});
		if (!isSuperAdmin || !reservation?._id) return undefined;

		let active = true;
		setLoadingReadiness(true);
		Promise.allSettled([
			getBofaVccHealth({ token, probe: false }),
			getReservationBofaVccStatus(reservation._id, token),
		])
			.then(([healthResult, statusResult]) => {
				if (!active) return;
				setHealth(
					healthResult.status === "fulfilled"
						? healthResult.value
						: {
								readyForCharge: false,
								message:
									healthResult.reason?.response?.message ||
									healthResult.reason?.message ||
									"The Bank of America configuration check failed.",
							},
				);
				setStatus(
					statusResult.status === "fulfilled"
						? statusResult.value
						: {
								loadError:
									statusResult.reason?.response?.message ||
									statusResult.reason?.message ||
									"The reservation payment status could not be loaded.",
							},
				);
			})
			.finally(() => active && setLoadingReadiness(false));
		return () => {
			active = false;
		};
	}, [initialForm, isSuperAdmin, open, requirePostalCode, reservation?._id, token]);

	useEffect(() => {
		if (
			!open ||
			step !== "details" ||
			!autoLoadInitialAmount.current ||
			loadingReadiness ||
			health?.readyForCharge !== true ||
			status?.loadError ||
			status?.alreadyCharged ||
			(status?.processing && !status?.secureAcceptance?.resumeAvailable) ||
			status?.outcomeUnknown ||
			status?.attemptedBefore
		) {
			return;
		}
		autoLoadInitialAmount.current = false;
		launchHostedForm();
	}, [
		health?.readyForCharge,
		launchHostedForm,
		loadingReadiness,
		open,
		status,
		step,
	]);

	useEffect(() => {
		if (!open || step !== "hosted") return undefined;
		let active = true;
		const poll = async () => {
			try {
				const next = await refreshStatus();
				if (!active || !next) return;
				if (next.alreadyCharged) {
					setStep("success");
					if (!successShown.current) {
						successShown.current = true;
						toast.success("The OTA virtual card was charged successfully.");
						onReservationUpdated?.({
							...reservation,
							bofa_payment: {
								...(reservation?.bofa_payment || {}),
								vcc: { ...(reservation?.bofa_payment?.vcc || {}), charged: true },
							},
							payment_details: {
								...(reservation?.payment_details || {}),
								bofaVccCharged: true,
							},
						});
					}
				} else if (["declined", "canceled"].includes(next?.secureAcceptance?.status)) {
					setError(
						next.secureAcceptance.status === "declined"
							? next.lastFailureMessage || "Bank of America declined this card."
							: "The Bank of America checkout was canceled.",
					);
					setStep("result");
				} else if (next.outcomeUnknown) {
					setError(next.warningMessage || "The payment result requires reconciliation.");
					setStep("result");
				}
			} catch (_error) {
				// Keep polling. The authenticated backend remains authoritative.
			}
		};
		poll();
		const timer = window.setInterval(poll, 2500);
		return () => {
			active = false;
			window.clearInterval(timer);
		};
	}, [onReservationUpdated, open, refreshStatus, reservation, step]);

	useEffect(() => {
		if (!open || step !== "hosted") return undefined;
		const listener = (event) => {
			if (event.origin !== window.location.origin) return;
			if (event.data?.type === "BOFA_HOSTED_CHECKOUT_RESULT") refreshStatus();
		};
		window.addEventListener("message", listener);
		return () => window.removeEventListener("message", listener);
	}, [open, refreshStatus, step]);

	if (!isSuperAdmin) return null;

	const loadWhenComplete = (event) => {
		if (step !== "details" || submitting || loadingReadiness) return;
		const nextTarget = event?.relatedTarget;
		if (
			nextTarget?.dataset?.skipBofaAutoLoad === "true" ||
			nextTarget?.closest?.(".ant-modal-close")
		) {
			return;
		}
		const validationError = validateVccForm(form, new Date(), { requirePostalCode });
		if (!validationError) launchHostedForm();
	};

	const readinessMessage =
		health?.checks?.errors?.[0] || health?.message || "Hosted Checkout configuration is incomplete.";
	const blockedMessage = status?.alreadyCharged
		? "This reservation was already charged successfully. Another charge is blocked."
		: status?.warningMessage || status?.loadError || "";

	return (
		<>
			<ModalLayer />
			<Modal
				title={<span dir='ltr' lang='en'>Process OTA Virtual Card</span>}
				open={open}
				onCancel={onClose}
				footer={null}
				width={800}
				centered
				zIndex={BOFA_VCC_MODAL_Z_INDEX}
				rootClassName={ROOT_CLASS}
				wrapClassName={WRAP_CLASS}
				styles={{
					mask: { zIndex: BOFA_VCC_MODAL_Z_INDEX - 1 },
					wrapper: { zIndex: BOFA_VCC_MODAL_Z_INDEX },
					content: { position: "relative", zIndex: BOFA_VCC_MODAL_Z_INDEX + 1 },
					header: { direction: "ltr", textAlign: "left" },
					body: {
						direction: "ltr",
						textAlign: "left",
						maxHeight: "calc(100vh - 160px)",
						overflowY: "auto",
					},
				}}
				getContainer={() => document.body}
				destroyOnClose
				maskClosable={false}
			>
				<Body dir='ltr' lang='en'>
					<Summary>
						<div><span>OTA</span><strong>{providerName}</strong></div>
						<div><span>OTA booking</span><strong>{otaBookingNumber}</strong></div>
						<div><span>PMS confirmation</span><strong>{reservation?.confirmation_number || "N/A"}</strong></div>
						<div><span>Check-in</span><strong>{eligibility.checkinDate || "Invalid"}</strong></div>
						<div><span>Currency</span><strong>USD only</strong></div>
					</Summary>

					{loadingReadiness ? <StatusLine><Spin size='small' /> Checking secure checkout and reservation status...</StatusLine> : null}
					{!eligibility.ok ? <Alert type='error' showIcon message={eligibility.message} /> : null}
					{health && health.readyForCharge !== true ? <Alert type='error' showIcon message='Bank of America Hosted Checkout is not ready' description={readinessMessage} /> : null}
					{health?.readyForCharge === true ? <Alert type='success' showIcon message='Secure Bank of America embedded checkout is configured.' /> : null}
					{blockedMessage ? <Alert type={status?.alreadyCharged ? "success" : "warning"} showIcon message={blockedMessage} /> : null}
					{status?.canDiscardUnsubmittedSession ? (
						<RecoveryBox>
							<strong>No card result was received for the expired form.</strong>
							<span>If you did not press Pay in that form, archive it and load a fresh Bank of America form. A form with any bank callback or transaction ID cannot be cleared here.</span>
							<button type='button' onClick={restartUnsubmittedForm} disabled={recoveringSession}>
								{recoveringSession ? <><Spin size='small' /> Restarting...</> : "I did not submit it — load a fresh form"}
							</button>
						</RecoveryBox>
					) : null}

					{step === "details" ? (
						<form onSubmit={(event) => { event.preventDefault(); launchHostedForm(); }}>
							<Heading>Charge details</Heading>
							<Field>
								<label htmlFor='bofa-vcc-amount'>Amount (USD)</label>
								<InputWrap><span>$</span><input id='bofa-vcc-amount' inputMode='decimal' value={form.amountUsd} onChange={(event) => { autoLoadInitialAmount.current = false; setError(""); setForm((current) => ({ ...current, amountUsd: event.target.value.replace(/[^0-9.]/g, "") })); }} onBlur={loadWhenComplete} placeholder='0.00' autoFocus /></InputWrap>
								<small>The charge is always signed and processed in USD.</small>
							</Field>
							{requirePostalCode ? (
								<Field>
									<label htmlFor='bofa-vcc-postal-code'>ZIP / postal code</label>
									<input id='bofa-vcc-postal-code' value={form.billingPostalCode || ""} onChange={(event) => { autoLoadInitialAmount.current = false; setError(""); setForm((current) => ({ ...current, billingPostalCode: formatPostalCode(event.target.value) })); }} onBlur={loadWhenComplete} placeholder='Enter the code supplied with the virtual card' maxLength={14} autoComplete='postal-code' />
									<small>No street address is requested for this card.</small>
								</Field>
							) : null}
							<ProviderNote>{requirePostalCode ? "Only the ZIP / postal code is collected for this OTA. Cardholder identity remains server-managed." : `${providerName} cardholder and billing details are selected securely by the backend from the reservation source.`}</ProviderNote>
							<SecurityNote>Card number, expiration date, and security code are entered only inside Bank of America’s secure embedded form. They are sent directly from your browser to Bank of America and never pass through or get stored by Jannat Booking.</SecurityNote>
							<SecureEntryPlaceholder aria-live='polite'>
								{submitting ? <><Spin size='small' /> Loading secure card fields...</> : "The secure card fields load automatically when the required amount and ZIP, when applicable, are complete."}
							</SecureEntryPlaceholder>
							{error ? <InlineError role='alert'>{error}</InlineError> : null}
							<Actions><button type='button' className='secondary' data-skip-bofa-auto-load='true' onClick={onClose}>Cancel</button></Actions>
						</form>
					) : null}

					{step === "hosted" && hostedSession ? (
						<section>
							<Heading>Secure card entry</Heading>
							<Alert type='info' showIcon message={`Bank of America will process $${Number(hostedSession?.session?.amountUsd || form.amountUsd).toFixed(2)} USD.`} description={hostedSession?.resumed ? "Your existing secure checkout was resumed automatically. Complete this same card form once; no second payment session was created." : "Complete the card form below once. This page will update automatically after Bank of America returns a verified result."} />
							{error ? <InlineError role='alert'>{error}</InlineError> : null}
							<BofaHostedCheckoutFrame session={hostedSession} onSecurityError={setError} />
							<Actions><button type='button' className='secondary' onClick={onClose}>Close window</button></Actions>
						</section>
					) : null}

					{step === "success" ? <section><Alert type='success' showIcon message='Payment approved and recorded' description='The signed Bank of America result was verified. This reservation is blocked from another successful charge.' /><Actions><button type='button' onClick={onClose}>Done</button></Actions></section> : null}
					{step === "result" ? <section><Alert type='warning' showIcon message='Payment was not recorded as successful' description={error} /><Actions><button type='button' className='secondary' onClick={onClose}>Close</button></Actions></section> : null}
				</Body>
			</Modal>
		</>
	);
};

export default BofaVccModal;

const ModalLayer = createGlobalStyle`
	.${ROOT_CLASS} { position: relative; z-index: ${BOFA_VCC_MODAL_Z_INDEX} !important; }
	.${ROOT_CLASS} .ant-modal-mask { background: rgba(15,23,42,.72) !important; backdrop-filter: blur(2px); z-index: ${BOFA_VCC_MODAL_Z_INDEX - 1} !important; }
	.${ROOT_CLASS} .ant-modal-wrap, .ant-modal-wrap.${WRAP_CLASS} { opacity: 1 !important; visibility: visible !important; z-index: ${BOFA_VCC_MODAL_Z_INDEX} !important; }
	.${ROOT_CLASS} .ant-modal, .ant-modal-wrap.${WRAP_CLASS} .ant-modal { max-width: calc(100vw - 24px); opacity: 1 !important; position: relative; transform: none !important; visibility: visible !important; z-index: ${BOFA_VCC_MODAL_Z_INDEX} !important; }
	.${ROOT_CLASS} .ant-modal-content, .ant-modal-wrap.${WRAP_CLASS} .ant-modal-content { opacity: 1 !important; position: relative; visibility: visible !important; z-index: ${BOFA_VCC_MODAL_Z_INDEX + 1} !important; }
`;
const Body = styled.div`direction:ltr!important;text-align:left!important;color:#172033;.ant-alert{margin:10px 0;text-align:left;direction:ltr}`;
const Summary = styled.div`display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:12px;div{padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc}span,strong{display:block}span{color:#64748b;font-size:12px;margin-bottom:2px}strong{overflow-wrap:anywhere}@media(max-width:760px){grid-template-columns:repeat(2,minmax(0,1fr))}`;
const StatusLine = styled.div`display:flex;align-items:center;gap:8px;padding:10px 0;color:#475569`;
const Heading = styled.h4`margin:18px 0 10px;font-size:16px;color:#0f172a`;
const Field = styled.div`margin-bottom:12px;label{display:block;font-weight:650;margin-bottom:5px}input{width:100%;height:42px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;direction:ltr;text-align:left;background:#fff}input:focus{outline:2px solid rgba(22,119,255,.2);border-color:#1677ff}small{display:block;margin-top:4px;color:#64748b}`;
const InputWrap = styled.div`display:flex;align-items:center;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;span{padding-left:11px;font-weight:700}input{border:0}`;
const ProviderNote = styled.p`margin:14px 0 0;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#14532d;font-size:13px`;
const SecurityNote = styled.p`margin:14px 0 0;padding:10px 12px;background:#eef6ff;border:1px solid #bfdbfe;border-radius:8px;color:#1e3a5f;font-size:13px`;
const SecureEntryPlaceholder = styled.div`display:flex;align-items:center;gap:8px;min-height:54px;margin:14px 0 0;padding:10px 12px;background:#f8fafc;border:1px dashed #94a3b8;border-radius:8px;color:#475569;font-size:13px`;
const InlineError = styled.p`margin:12px 0 0;padding:10px 12px;color:#991b1b;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-weight:600`;
const RecoveryBox = styled.div`display:grid;gap:7px;margin:12px 0;padding:12px;background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;color:#78350f;font-size:13px;button{justify-self:start;display:flex;align-items:center;gap:7px;border:0;border-radius:7px;padding:9px 12px;background:#b45309;color:#fff;font-weight:650;cursor:pointer}button:disabled{opacity:.6;cursor:not-allowed}`;
const Actions = styled.div`display:flex;justify-content:flex-end;gap:9px;margin-top:18px;button{border:0;border-radius:8px;padding:10px 16px;background:#1677ff;color:#fff;font-weight:650;cursor:pointer}button.secondary{background:#e2e8f0;color:#1e293b}button:disabled{opacity:.55;cursor:not-allowed}`;
