import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import DropIn from "braintree-web-drop-in-react";
import {
	PayPalScriptProvider,
	PayPalCardFieldsProvider,
	PayPalCardFieldsForm,
	PayPalNameField,
	PayPalNumberField,
	PayPalExpiryField,
	PayPalCVVField,
	usePayPalCardFields,
} from "@paypal/react-paypal-js";
import {
	getReservationVccStatus,
	getReservationBraintreeVccStatus,
	getReservationBofaVccStatus,
	getBofaVccHealth,
	getPayPalClientTokenForVcc,
	getBraintreeClientTokenForVcc,
	createReservationVccOrder,
	captureReservationVccOrder,
	chargeReservationViaBraintreeVcc,
	chargeReservationViaBofaVcc,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import { isSuperAdminUser } from "../utils/superUsers";

const safeNumber = (val) => {
	const parsed = Number(val);
	return isNaN(parsed) ? 0 : parsed;
};
const formatMoneyInput = (value) => {
	const amount = safeNumber(value);
	return amount > 0 ? amount.toFixed(2) : "";
};
const resolveStoredVccAmounts = (reservation) => {
	const metadata =
		reservation?.vcc_payment?.metadata &&
		typeof reservation.vcc_payment.metadata === "object"
			? reservation.vcc_payment.metadata
			: {};
	const currency = String(metadata.amount_to_charge_currency || "").toUpperCase();
	const sourceAmount = safeNumber(metadata.amount_to_charge);
	const amountUsd =
		safeNumber(metadata.amount_to_charge_usd) ||
		(currency === "USD" ? sourceAmount : 0);
	const amountSar =
		safeNumber(metadata.amount_to_charge_sar) ||
		(currency === "SAR" ? sourceAmount : 0);
	return { amountUsd, amountSar };
};
const formatDisplayDate = (date, locale) => {
	if (!date) return "N/A";
	return moment(date).locale(locale).format("MMM DD, YYYY");
};

const formatVccCardNumber = (value) => {
	const digitsOnly = String(value || "")
		.replace(/\D/g, "")
		.slice(0, 19);
	return digitsOnly.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};
const normalizeVccCardNumber = (value) =>
	String(value || "")
		.replace(/\D/g, "")
		.slice(0, 19);
const formatVccExpiry = (value) => {
	const raw = String(value || "");
	const byParts = raw
		.trim()
		.split(/[/\-\s]+/)
		.filter(Boolean);
	if (byParts.length >= 2) {
		const monthDigits = byParts[0].replace(/\D/g, "").slice(0, 2);
		const yearDigits = byParts[1].replace(/\D/g, "").slice(0, 4);
		if (!monthDigits) return "";
		const month = monthDigits.padStart(2, "0");
		return yearDigits ? `${month}/${yearDigits}` : month;
	}

	const digitsOnly = raw.replace(/\D/g, "").slice(0, 4);
	if (!digitsOnly) return "";
	if (digitsOnly.length <= 2) return digitsOnly;

	let month = digitsOnly.slice(0, 2);
	let year = digitsOnly.slice(2);
	const monthNum = Number(month);
	if (monthNum < 1 || monthNum > 12) {
		month = `0${digitsOnly[0]}`.slice(-2);
		year = digitsOnly.slice(1);
	}
	return `${month}/${year}`;
};
const normalizeVccExpiryForSubmit = (value) => {
	const formatted = formatVccExpiry(value);
	const match = String(formatted || "").match(/^(\d{1,2})\/(\d{1,4})$/);
	if (!match) return String(formatted || "").trim();
	const month = String(match[1]).padStart(2, "0");
	const year = String(match[2]).slice(0, 4);
	return `${month}/${year}`;
};
const normalizeVccCvv = (value) =>
	String(value || "")
		.replace(/\D/g, "")
		.slice(0, 4);
const splitVccCardholderName = (value, fallbackName = "Virtual Card") => {
	const raw = String(value || fallbackName)
		.trim()
		.replace(/\s+/g, " ");
	if (!raw) {
		return { firstName: "Virtual", lastName: "Card", fullName: "Virtual Card" };
	}
	const parts = raw.split(" ");
	if (parts.length === 1) {
		return {
			firstName: parts[0],
			lastName: "Card",
			fullName: `${parts[0]} Card`.trim(),
		};
	}
	return {
		firstName: parts.slice(0, -1).join(" "),
		lastName: parts[parts.length - 1],
		fullName: raw,
	};
};

const VCC_PROMPT_WARNING_MESSAGE =
	"This reservation was prompted once before, please reach out to Ahmed Admin for more details";
const VCC_ROOM_UNASSIGNED_CONFIRM_MESSAGE =
	"Are you sure you want to proceed without assigning a room to the reservation?";
const DEFAULT_EXPEDIA_VCC_ZIP = "98119";
const VCC_MAX_ATTEMPTS = 2;
const VCC_GATEWAY_MODE = String(process.env.REACT_APP_VCC_GATEWAY || "paypal")
	.trim()
	.toLowerCase();
const VCC_RETRY_AVAILABLE_MESSAGE =
	"One VCC attempt failed before. One final retry is still allowed.";
const VCC_PROVIDER_UI_PRESETS = {
	expedia: {
		label: "Expedia",
		cardholderName: "Expedia Virtual Card",
		defaultZip: DEFAULT_EXPEDIA_VCC_ZIP,
		addressLine1: "1111 Expedia Group Way W",
		adminArea2: "Seattle",
		adminArea1: "WA",
		countryCode: "US",
		country: "USA",
		postalOverrides: {
			D02XF99: {
				addressLine1: "25 St Stephen's Green",
				adminArea2: "Dublin 2",
				adminArea1: "Dublin",
				countryCode: "IE",
				country: "Ireland",
				postalCode: "D02 XF99",
			},
		},
	},
	agoda: {
		label: "Agoda",
		cardholderName: "Agoda Virtual Card",
		defaultZip: DEFAULT_EXPEDIA_VCC_ZIP,
		addressLine1: "1111 Expedia Group Way W",
		adminArea2: "Seattle",
		adminArea1: "WA",
		countryCode: "US",
		country: "USA",
	},
	booking: {
		label: "Booking.com",
		cardholderName: "Booking.com VirtualCard",
		defaultZip: DEFAULT_EXPEDIA_VCC_ZIP,
		addressLine1: "1111 Expedia Group Way W",
		adminArea2: "Seattle",
		adminArea1: "WA",
		countryCode: "US",
		country: "USA",
	},
};

const resolveVccProviderKey = (bookingSource) => {
	const normalized = String(bookingSource || "").toLowerCase();
	if (normalized.includes("expedia")) return "expedia";
	if (normalized.includes("agoda")) return "agoda";
	if (normalized.includes("booking")) return "booking";
	return "";
};

const normalizeVccPostalKey = (value) =>
	String(value || "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "");

const resolveVccBillingProfile = (providerPreset, postalCodeInput) => {
	const preset = providerPreset || {};
	const base = {
		addressLine1: preset.addressLine1 || "1111 Expedia Group Way W",
		adminArea2: preset.adminArea2 || "Seattle",
		adminArea1: preset.adminArea1 || "WA",
		countryCode: String(preset.countryCode || "US").toUpperCase(),
		country: preset.country || "USA",
		postalCode: String(
			postalCodeInput || preset.defaultZip || DEFAULT_EXPEDIA_VCC_ZIP,
		)
			.toUpperCase()
			.trim(),
	};
	const postalKey = normalizeVccPostalKey(base.postalCode);
	const override =
		(preset.postalOverrides && preset.postalOverrides[postalKey]) || null;
	if (!override) return base;
	return {
		addressLine1: override.addressLine1 || base.addressLine1,
		adminArea2: override.adminArea2 || base.adminArea2,
		adminArea1: override.adminArea1 || base.adminArea1,
		countryCode: String(override.countryCode || base.countryCode).toUpperCase(),
		country: override.country || base.country,
		postalCode: String(override.postalCode || base.postalCode)
			.toUpperCase()
			.trim(),
	};
};

const normalizeReservationStatusForVcc = (status) =>
	String(status || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "_");

const isCancelledOrNoShowForVcc = (status) => {
	const normalized = normalizeReservationStatusForVcc(status);
	return normalized.includes("cancel") || /no[_-]?show/.test(normalized);
};

const extractRoomNumbersForVcc = (roomRows, reservation) => {
	const set = new Set();
	(Array.isArray(roomRows) ? roomRows : []).forEach((room) => {
		const roomNo = room?.room_number || room?.roomNumber || room?.number || "";
		if (String(roomNo).trim()) set.add(String(roomNo).trim());
	});
	(Array.isArray(reservation?.bedNumber) ? reservation.bedNumber : []).forEach(
		(bed) => {
			const value = String(bed || "").trim();
			if (value) set.add(value);
		},
	);
	return Array.from(set);
};


const VccCardFieldsSubmitButton = ({
	disabled,
	isSubmitting,
	onBeforeSubmit,
	onSubmitError,
	buildSubmitPayload,
}) => {
	const cardCtx = usePayPalCardFields();

	const handleSubmit = async () => {
		if (disabled || isSubmitting) return;
		const submitFn =
			(cardCtx?.cardFieldsForm && cardCtx.cardFieldsForm.submit) ||
			(cardCtx?.cardFields && cardCtx.cardFields.submit);
		if (typeof submitFn !== "function") {
			toast.error("PayPal card fields are not ready yet.");
			return;
		}

		try {
			const ok = (await onBeforeSubmit?.()) !== false;
			if (!ok) return;
			const submitPayload = buildSubmitPayload?.() || undefined;
			const getStateFn =
				(cardCtx?.cardFieldsForm && cardCtx.cardFieldsForm.getState) ||
				(cardCtx?.cardFields && cardCtx.cardFields.getState);
			if (typeof getStateFn === "function") {
				const state = await getStateFn();
				if (state && state.isFormValid === false) {
					toast.error("Please complete all card fields.");
					onSubmitError?.(new Error("PayPal card fields are incomplete."));
					return;
				}
			}
			await submitFn(submitPayload);
		} catch (err) {
			onSubmitError?.(err);
		}
	};

	return (
		<button
			type='button'
			className='btn btn-success'
			onClick={handleSubmit}
			disabled={disabled || isSubmitting}
		>
			{isSubmitting ? "Processing..." : "Submit VCC Charge"}
		</button>
	);
};

const VccHostedFieldsLayout = ({ cardholderName }) => {
	const fieldContainerStyle = {
		border: "1px solid #c9d5e3",
		borderRadius: "8px",
		padding: "8px 10px",
		background: "#fff",
	};

	return (
		<PayPalCardFieldsForm>
			<div className='mb-2'>
				<label
					style={{
						fontWeight: "bold",
						fontSize: "0.92rem",
						marginBottom: "6px",
						display: "block",
					}}
				>
					Cardholder Name
				</label>
				<div style={fieldContainerStyle}>
					<PayPalNameField placeholder={cardholderName} />
				</div>
			</div>

			<div className='row'>
				<div className='col-12 mb-3'>
					<label style={{ fontWeight: "bold" }}>Card Number</label>
					<div style={fieldContainerStyle}>
						<PayPalNumberField placeholder='Card number' />
					</div>
				</div>
			</div>

			<div className='row'>
				<div className='col-md-6 mb-3'>
					<label style={{ fontWeight: "bold" }}>Expiry</label>
					<div style={fieldContainerStyle}>
						<PayPalExpiryField placeholder='MM / YY' />
					</div>
				</div>
				<div className='col-md-6 mb-3'>
					<label style={{ fontWeight: "bold" }}>CVV</label>
					<div style={fieldContainerStyle}>
						<PayPalCVVField placeholder='CVV' />
					</div>
				</div>
			</div>
		</PayPalCardFieldsForm>
	);
};

const VCCPayment = ({
	reservation,
	hotelDetails,
	roomTableRows,
	isPaymentBreakdownVisible,
	token,
	setReservation,
	onReservationUpdated = () => {},
}) => {
	const vccProceedWithoutRoomRef = useRef(false);
	const [isVccPanelVisible, setIsVccPanelVisible] = useState(false);
	const [vccStep, setVccStep] = useState("amount");
	const [vccAmountUsd, setVccAmountUsd] = useState("");
	const [vccZipCode, setVccZipCode] = useState(DEFAULT_EXPEDIA_VCC_ZIP);
	const [isVccSubmitting, setIsVccSubmitting] = useState(false);
	const [isVccStatusLoading, setIsVccStatusLoading] = useState(false);
	const [vccStatusState, setVccStatusState] = useState(null);
	const [isVccPayPalLoading, setIsVccPayPalLoading] = useState(false);
	const [vccPayPalOptions, setVccPayPalOptions] = useState(null);
	const [vccPayPalInitError, setVccPayPalInitError] = useState("");
	const [isVccBraintreeLoading, setIsVccBraintreeLoading] = useState(false);
	const [vccBraintreeClientToken, setVccBraintreeClientToken] = useState("");
	const [vccBraintreeInitError, setVccBraintreeInitError] = useState("");
	const [vccBraintreeInstance, setVccBraintreeInstance] = useState(null);
	const [vccManualCardholderName, setVccManualCardholderName] = useState("");
	const [vccManualCardNumber, setVccManualCardNumber] = useState("");
	const [vccManualCardExpiry, setVccManualCardExpiry] = useState("");
	const [vccManualCardCvv, setVccManualCardCvv] = useState("");
	const [isBofaHealthLoading, setIsBofaHealthLoading] = useState(false);
	const [bofaHealthState, setBofaHealthState] = useState(null);

	// Payment-card controls stay English/LTR even when the surrounding dashboard is Arabic.
	const localeCode = "en";
	const formattedCheckin = formatDisplayDate(
		reservation?.checkin_date,
		localeCode,
	);
	const formattedCheckout = formatDisplayDate(
		reservation?.checkout_date,
		localeCode,
	);
	const customerFullName =
		reservation?.customer_details?.fullName ||
		reservation?.customer_details?.name ||
		"";
	const secondaryConfirmation =
		reservation?.customer_details?.confirmation_number2 || "";
	const bookingSourceNormalized = String(
		reservation?.booking_source || "",
	).toLowerCase();
	const vccProviderKey = resolveVccProviderKey(bookingSourceNormalized);
	const vccProviderUiPreset =
		VCC_PROVIDER_UI_PRESETS[vccProviderKey] || VCC_PROVIDER_UI_PRESETS.expedia;
	const vccProviderLabel = vccProviderUiPreset.label || "Provider";
	const defaultVccCardholderName =
		vccProviderUiPreset.cardholderName || `${vccProviderLabel} VirtualCard`;
	const isBraintreeVccMode = VCC_GATEWAY_MODE === "braintree";
	const isBofaVccMode = VCC_GATEWAY_MODE === "bofa";
	const isPayPalVccMode = !isBraintreeVccMode && !isBofaVccMode;
	const authState = isAuthenticated() || {};
	const canManageBofaVcc =
		!isBofaVccMode || isSuperAdminUser(authState?.user);
	const vccCardholderName = String(
		vccManualCardholderName || defaultVccCardholderName,
	)
		.trim()
		.replace(/\s+/g, " ");
	const bofaProbeState = bofaHealthState?.probe || null;
	const bofaHealthCode =
		bofaProbeState?.classification?.code || bofaProbeState?.error?.issue || "";
	const bofaHealthMessage =
		bofaProbeState?.classification?.message ||
		bofaProbeState?.error?.message ||
		"";
	const shouldBlockBofaSubmit =
		!!isBofaVccMode &&
		!!bofaHealthState &&
		bofaHealthState?.readyForCharge === false;
	const vccDefaultZipCode =
		vccProviderUiPreset.defaultZip || DEFAULT_EXPEDIA_VCC_ZIP;
	const vccBillingProfile = useMemo(
		() =>
			resolveVccBillingProfile(
				vccProviderUiPreset,
				String(vccZipCode || vccDefaultZipCode).trim(),
			),
		[vccProviderUiPreset, vccZipCode, vccDefaultZipCode],
	);
	const storedVccAmounts = useMemo(
		() => resolveStoredVccAmounts(reservation),
		[reservation],
	);
	const storedVccAmountUsdInput = formatMoneyInput(storedVccAmounts.amountUsd);
	const vccAddressLine1 =
		vccBillingProfile.addressLine1 || "1111 Expedia Group Way W";
	const vccAdminArea2 = vccBillingProfile.adminArea2 || "Seattle";
	const vccAdminArea1 = vccBillingProfile.adminArea1 || "WA";
	const vccEffectiveZipCode =
		vccBillingProfile.postalCode ||
		String(vccZipCode || vccDefaultZipCode).trim();
	const vccBillingAddressLine = `${vccAddressLine1}, ${vccAdminArea2}, ${vccAdminArea1}`;
	const vccBillingCountry = vccBillingProfile.country || "USA";
	const vccBillingCountryCode = String(
		vccBillingProfile.countryCode || "US",
	).toUpperCase();
	const isExpediaReservation = bookingSourceNormalized.includes("expedia");
	const reservationCancelledOrNoShow = isCancelledOrNoShowForVcc(
		reservation?.reservation_status,
	);

	const resetVccFlowState = useCallback(() => {
		setIsVccPanelVisible(false);
		setVccStep("amount");
		setVccAmountUsd("");
		setVccZipCode(vccDefaultZipCode);
		setVccManualCardholderName(defaultVccCardholderName);
		setVccManualCardNumber("");
		setVccManualCardExpiry("");
		setVccManualCardCvv("");
		setIsBofaHealthLoading(false);
		setBofaHealthState(null);
		vccProceedWithoutRoomRef.current = false;
		setVccPayPalOptions(null);
		setVccPayPalInitError("");
		setIsVccPayPalLoading(false);
		setVccBraintreeClientToken("");
		setVccBraintreeInitError("");
		setIsVccBraintreeLoading(false);
		setVccBraintreeInstance(null);
		setIsVccSubmitting(false);
	}, [vccDefaultZipCode, defaultVccCardholderName]);


	useEffect(() => {
		if (isVccPanelVisible) return;
		setVccZipCode(vccDefaultZipCode);
	}, [isVccPanelVisible, vccDefaultZipCode]);

	useEffect(() => {
		if (isVccPanelVisible) return;
		setVccManualCardholderName(defaultVccCardholderName);
	}, [isVccPanelVisible, defaultVccCardholderName]);

	useEffect(() => {
		if (isPaymentBreakdownVisible) return;
		resetVccFlowState();
		setVccStatusState(null);
	}, [isPaymentBreakdownVisible, resetVccFlowState]);

	useEffect(() => {
		if (
			!isPaymentBreakdownVisible ||
			!reservation?._id ||
			!isExpediaReservation ||
			!canManageBofaVcc
		) {
			return;
		}
		let active = true;
		setIsVccStatusLoading(true);
		const fetchStatus = isBraintreeVccMode
			? getReservationBraintreeVccStatus
			: isBofaVccMode
			  ? getReservationBofaVccStatus
			  : getReservationVccStatus;
		fetchStatus(reservation._id, token)
			.then((data) => {
				if (!active) return;
				setVccStatusState(data || null);
			})
			.catch((err) => {
				if (!active) return;
				console.error("Failed to fetch VCC status:", err);
				const fallbackState = isBraintreeVccMode
					? reservation?.braintree_payment
					: isBofaVccMode
					  ? reservation?.bofa_payment?.vcc
					  : reservation?.vcc_payment;
				setVccStatusState(
					fallbackState
						? {
								alreadyCharged: !!fallbackState?.charged,
								failedAttemptsCount: Number(
									fallbackState?.failed_attempts_count || 0,
								),
								attemptedBefore:
									Number(fallbackState?.failed_attempts_count || 0) >=
									VCC_MAX_ATTEMPTS,
								lastFailureMessage: fallbackState?.last_failure_message || "",
								warningMessage:
									fallbackState?.warning_message || VCC_PROMPT_WARNING_MESSAGE,
						  }
						: null,
				);
			})
			.finally(() => {
				if (!active) return;
				setIsVccStatusLoading(false);
			});
		return () => {
			active = false;
		};
	}, [
		isPaymentBreakdownVisible,
		isExpediaReservation,
		canManageBofaVcc,
		isBraintreeVccMode,
		isBofaVccMode,
		reservation?._id,
		reservation?.vcc_payment,
		reservation?.braintree_payment,
		reservation?.bofa_payment,
		token,
	]);

	useEffect(() => {
		if (
			!isPaymentBreakdownVisible ||
			!isVccPanelVisible ||
			vccStep !== "card" ||
			!isExpediaReservation ||
			!canManageBofaVcc
		) {
			return;
		}

		let active = true;
		if (isBofaVccMode) {
			setIsVccPayPalLoading(false);
			setVccPayPalInitError("");
			setIsVccBraintreeLoading(false);
			setVccBraintreeInitError("");
			return undefined;
		}

		if (isBraintreeVccMode) {
			if (vccBraintreeClientToken) return undefined;
			setIsVccBraintreeLoading(true);
			setVccBraintreeInitError("");
			getBraintreeClientTokenForVcc({ token })
				.then((data) => {
					if (!active) return;
					const authorization = String(
						data?.clientToken ||
							data?.tokenizationKey ||
							process.env.REACT_APP_BRAINTREE_TOKENIZATION_KEY ||
							"",
					).trim();
					if (!authorization) {
						throw new Error(
							"Braintree card fields are not configured. Missing authorization token.",
						);
					}
					setVccBraintreeClientToken(authorization);
				})
				.catch((err) => {
					if (!active) return;
					const msg =
						err?.response?.message ||
						err?.message ||
						"Failed to initialize Braintree card fields.";
					setVccBraintreeInitError(msg);
				})
				.finally(() => {
					if (!active) return;
					setIsVccBraintreeLoading(false);
				});
		} else if (isPayPalVccMode) {
			if (vccPayPalOptions) return undefined;
			setIsVccPayPalLoading(true);
			setVccPayPalInitError("");
			getPayPalClientTokenForVcc({ token, buyerCountry: "US" })
				.then((data) => {
					if (!active) return;
					const env = String(data?.env || "sandbox").toLowerCase();
					const clientToken = String(
						data?.clientToken || data?.client_token || "",
					).trim();
					const clientId =
						env === "live"
							? process.env.REACT_APP_PAYPAL_CLIENT_ID_LIVE
							: process.env.REACT_APP_PAYPAL_CLIENT_ID_SANDBOX;

					if (!clientToken || !clientId) {
						throw new Error(
							"PayPal card fields are not configured. Missing client token or client id.",
						);
					}

					setVccPayPalOptions({
						"client-id": clientId,
						"data-client-token": clientToken,
						components: "card-fields",
						intent: "capture",
						currency: "USD",
						commit: true,
						locale: "en_US",
					});
				})
				.catch((err) => {
					if (!active) return;
					const msg =
						err?.response?.message ||
						err?.message ||
						"Failed to initialize PayPal card fields.";
					setVccPayPalInitError(msg);
				})
				.finally(() => {
					if (!active) return;
					setIsVccPayPalLoading(false);
				});
		} else {
			setVccPayPalInitError(
				"Unsupported VCC gateway mode. Please set REACT_APP_VCC_GATEWAY to paypal, braintree, or bofa.",
			);
		}

		return () => {
			active = false;
		};
	}, [
		isPaymentBreakdownVisible,
		isVccPanelVisible,
		vccStep,
		isExpediaReservation,
		canManageBofaVcc,
		isBraintreeVccMode,
		isBofaVccMode,
		isPayPalVccMode,
		vccBraintreeClientToken,
		vccPayPalOptions,
		token,
	]);

	useEffect(() => {
		if (!isVccPayPalLoading) return;
		const timer = setTimeout(() => {
			setIsVccPayPalLoading(false);
			setVccPayPalInitError(
				(prev) =>
					prev || "PayPal card fields initialization timed out. Please retry.",
			);
		}, 15000);
		return () => clearTimeout(timer);
	}, [isVccPayPalLoading]);

	useEffect(() => {
		if (!isVccBraintreeLoading) return;
		const timer = setTimeout(() => {
			setIsVccBraintreeLoading(false);
			setVccBraintreeInitError(
				(prev) =>
					prev ||
					"Braintree card fields initialization timed out. Please retry.",
			);
		}, 15000);
		return () => clearTimeout(timer);
	}, [isVccBraintreeLoading]);


	const vccRoomNumbers = useMemo(
		() => extractRoomNumbersForVcc(roomTableRows, reservation),
		[roomTableRows, reservation],
	);
	const vccRoomSummary = vccRoomNumbers.join(", ");
	const reservationVccSnapshot = isBraintreeVccMode
		? reservation?.braintree_payment
		: isBofaVccMode
		  ? reservation?.bofa_payment?.vcc
		  : reservation?.vcc_payment;
	const hasVccStatusSnapshot = vccStatusState !== null;
	const vccAlreadyCharged = hasVccStatusSnapshot
		? !!vccStatusState?.alreadyCharged
		: !!reservationVccSnapshot?.charged;
	const vccFailedAttemptsCount = hasVccStatusSnapshot
		? Number(vccStatusState?.failedAttemptsCount || 0)
		: Number(reservationVccSnapshot?.failed_attempts_count || 0);
	const vccAttemptedBefore = hasVccStatusSnapshot
		? !!vccStatusState?.attemptedBefore
		: vccFailedAttemptsCount >= VCC_MAX_ATTEMPTS;
	const vccRetryAllowed =
		!vccAlreadyCharged &&
		!vccAttemptedBefore &&
		vccFailedAttemptsCount > 0 &&
		vccFailedAttemptsCount < VCC_MAX_ATTEMPTS;
	const vccWarningMessage =
		vccStatusState?.warningMessage ||
		(vccRetryAllowed ? VCC_RETRY_AVAILABLE_MESSAGE : "") ||
		reservationVccSnapshot?.warning_message ||
		VCC_PROMPT_WARNING_MESSAGE;
	const vccLastFailureMessage =
		vccStatusState?.lastFailureMessage ||
		reservationVccSnapshot?.last_failure_message ||
		"";

	const openVccPanel = () => {
		if (!canManageBofaVcc) {
			toast.error("Only the configured super admin can process BoA VCC cards.");
			return;
		}
		if (!isExpediaReservation) {
			toast.error("Pay Via VCC is currently available only for Expedia.");
			return;
		}
		if (vccAlreadyCharged) {
			toast.info("This reservation was already charged via VCC.");
			return;
		}
		if (vccAttemptedBefore) {
			toast.error(vccWarningMessage);
			return;
		}
		if (vccRetryAllowed) {
			toast.warn(vccWarningMessage || VCC_RETRY_AVAILABLE_MESSAGE);
		}
		vccProceedWithoutRoomRef.current = false;
		setVccAmountUsd(storedVccAmountUsdInput);
		setIsVccPanelVisible(true);
		setVccStep("amount");
	};

	const validateVccChargeContext = useCallback(
		(showToast = true, allowRoomBypassConfirm = false) => {
			const fail = (message) => {
				if (showToast) toast.error(message);
				return { ok: false, message };
			};

			if (!reservation?._id) {
				return fail("Missing reservation reference.");
			}
			if (!canManageBofaVcc) {
				return fail("Only the configured super admin can process BoA VCC cards.");
			}
			if (vccAlreadyCharged) {
				return fail("This reservation was already charged via VCC.");
			}
			if (vccAttemptedBefore) {
				return fail(vccWarningMessage || VCC_PROMPT_WARNING_MESSAGE);
			}

			const amountUsd = safeNumber(vccAmountUsd);
			if (!(amountUsd > 0)) {
				return fail("Please enter a valid VCC amount in USD.");
			}

			const normalizedZipCode = String(vccZipCode || "")
				.trim()
				.toUpperCase();
			if (!/^[A-Z0-9 -]{3,12}$/.test(normalizedZipCode)) {
				return fail("Please enter a valid billing ZIP/postal code.");
			}

			let proceedWithoutRoom = !!vccProceedWithoutRoomRef.current;
			if (!reservationCancelledOrNoShow && vccRoomNumbers.length === 0) {
				if (!proceedWithoutRoom && allowRoomBypassConfirm) {
					const userConfirmed = window.confirm(
						VCC_ROOM_UNASSIGNED_CONFIRM_MESSAGE,
					);
					if (userConfirmed) {
						proceedWithoutRoom = true;
						vccProceedWithoutRoomRef.current = true;
					}
				}
				if (!proceedWithoutRoom) {
					return fail(
						"Please assign a room or confirm proceeding without a room assignment.",
					);
				}
			}

			return {
				ok: true,
				amountUsd,
				postalCode: normalizedZipCode,
				proceedWithoutRoom,
			};
		},
		[
			reservation?._id,
			canManageBofaVcc,
			vccAlreadyCharged,
			vccAttemptedBefore,
			vccWarningMessage,
			vccAmountUsd,
			vccZipCode,
			reservationCancelledOrNoShow,
			vccRoomNumbers,
			vccProceedWithoutRoomRef,
		],
	);

	const applyVccApiError = useCallback((err, fallbackMessage) => {
		const apiResponse = err?.response || {};
		const statusPayload =
			apiResponse?.vccStatus ||
			apiResponse?.braintreeStatus ||
			apiResponse?.bofaStatus ||
			{};
		const correlationId =
			apiResponse?.transaction?.correlationId ||
			apiResponse?.reservation?.bofa_payment?.vcc?.last_capture
				?.correlationId ||
			"";
		const msg =
			apiResponse?.message ||
			err?.message ||
			fallbackMessage ||
			"VCC payment failed to process.";
		toast.error(msg);
		if (correlationId) {
			toast.info(`BoA Correlation ID: ${correlationId}`);
		}
		if (apiResponse?.warningMessage) {
			toast.error(apiResponse.warningMessage);
		}
		setVccStatusState((prev) => ({
			...(prev || {}),
			...statusPayload,
			alreadyCharged:
				typeof apiResponse?.alreadyCharged === "boolean"
					? apiResponse.alreadyCharged
					: !!prev?.alreadyCharged,
			attemptedBefore:
				typeof apiResponse?.attemptedBefore === "boolean"
					? apiResponse.attemptedBefore
					: !!prev?.attemptedBefore,
			failedAttemptsCount: Number(
				statusPayload?.failedAttemptsCount || prev?.failedAttemptsCount || 0,
			),
			lastFailureMessage: apiResponse?.message || prev?.lastFailureMessage,
			warningMessage:
				apiResponse?.warningMessage ||
				statusPayload?.warningMessage ||
				prev?.warningMessage,
		}));
	}, []);

	const handleRunBofaHealthCheck = useCallback(
		async ({ silent = false } = {}) => {
			if (!isBofaVccMode) return null;
			if (!canManageBofaVcc) {
				if (!silent) {
					toast.error(
						"Only the configured super admin can run BoA VCC checks.",
					);
				}
				return null;
			}
			setIsBofaHealthLoading(true);
			try {
				const data = await getBofaVccHealth({ token, probe: true });
				setBofaHealthState(data || null);
				if (!silent) {
					if (data?.readyForCharge) {
						toast.success(
							"BoA health check passed. Endpoint/auth looks ready for VCC charge.",
						);
					} else {
						toast.warn(
							data?.probe?.classification?.message ||
								data?.probe?.error?.message ||
								data?.checks?.errors?.[0] ||
								"BoA health check reported configuration issues.",
						);
					}
					if (data?.probe?.correlationId) {
						toast.info(`BoA Correlation ID: ${data.probe.correlationId}`);
					}
				}
				return data;
			} catch (healthErr) {
				if (!silent) {
					toast.error(
						healthErr?.response?.message ||
							healthErr?.message ||
							"Failed to run BoA health check.",
					);
				}
				return null;
			} finally {
				setIsBofaHealthLoading(false);
			}
		},
		[isBofaVccMode, canManageBofaVcc, token],
	);

	useEffect(() => {
		if (
			!isPaymentBreakdownVisible ||
			!isVccPanelVisible ||
			vccStep !== "card" ||
			!isBofaVccMode ||
			!canManageBofaVcc
		) {
			return;
		}
		if (isBofaHealthLoading || bofaHealthState) return;
		handleRunBofaHealthCheck({ silent: true });
	}, [
		isPaymentBreakdownVisible,
		isVccPanelVisible,
		vccStep,
		isBofaVccMode,
		canManageBofaVcc,
		isBofaHealthLoading,
		bofaHealthState,
		handleRunBofaHealthCheck,
	]);

	const handleVccAmountContinue = () => {
		const validation = validateVccChargeContext(true, true);
		if (!validation.ok) return;
		setVccStep("card");
	};

	const createHostedVccOrder = useCallback(async () => {
		const validation = validateVccChargeContext(false, true);
		if (!validation.ok) {
			throw new Error(validation.message || "Invalid VCC payment details.");
		}

		const response = await createReservationVccOrder({
			token,
			reservationId: reservation._id,
			usdAmount: validation.amountUsd,
			postalCode: validation.postalCode,
			proceedWithoutRoom: !!validation.proceedWithoutRoom,
		});

		const updated = response?.reservation;
		if (updated?._id) {
			setReservation(updated);
			onReservationUpdated(updated);
		}
		if (response?.vccStatus) {
			setVccStatusState(response.vccStatus);
		}

		const orderId = String(response?.orderId || response?.id || "").trim();
		if (!orderId) {
			throw new Error("PayPal did not return an order id for this VCC charge.");
		}
		return orderId;
	}, [
		validateVccChargeContext,
		token,
		reservation?._id,
		setReservation,
		onReservationUpdated,
	]);

	const handleHostedVccBeforeSubmit = useCallback(async () => {
		const validation = validateVccChargeContext(true, true);
		if (!validation.ok) return false;
		setIsVccSubmitting(true);
		return true;
	}, [validateVccChargeContext]);

	const handleHostedVccSubmitError = useCallback(() => {
		setIsVccSubmitting(false);
	}, []);

	const handleHostedVccApprove = useCallback(
		async (data) => {
			const orderId = String(
				data?.orderID || data?.orderId || data?.id || "",
			).trim();
			if (!orderId) {
				setIsVccSubmitting(false);
				toast.error("Missing PayPal order id for VCC capture.");
				return;
			}

			const validation = validateVccChargeContext(false, true);
			if (!validation.ok) {
				setIsVccSubmitting(false);
				toast.error(validation.message || "Invalid VCC payment details.");
				return;
			}

			try {
				const response = await captureReservationVccOrder({
					token,
					reservationId: reservation._id,
					orderId,
					usdAmount: validation.amountUsd,
					postalCode: validation.postalCode,
					proceedWithoutRoom: !!validation.proceedWithoutRoom,
				});
				const updated = response?.reservation;
				if (updated?._id) {
					setReservation(updated);
					onReservationUpdated(updated);
				}
				setVccStatusState(
					response?.vccStatus
						? { ...response.vccStatus, alreadyCharged: true }
						: {
								alreadyCharged: true,
								attemptedBefore: false,
						  },
				);
				toast.success(response?.message || "VCC payment completed.");
				resetVccFlowState();
			} catch (err) {
				applyVccApiError(err, "VCC payment failed to process.");
			} finally {
				setIsVccSubmitting(false);
			}
		},
		[
			validateVccChargeContext,
			token,
			reservation?._id,
			setReservation,
			onReservationUpdated,
			resetVccFlowState,
			applyVccApiError,
		],
	);

	const handleHostedVccProviderError = useCallback(
		(err) => {
			setIsVccSubmitting(false);
			applyVccApiError(err, "PayPal could not process this VCC payment.");
		},
		[applyVccApiError],
	);

	const handleHostedVccCancel = useCallback(() => {
		setIsVccSubmitting(false);
		toast.info("VCC payment flow was cancelled.");
	}, []);

	const handleBraintreeVccSubmit = useCallback(async () => {
		const validation = validateVccChargeContext(true, true);
		if (!validation.ok) return;
		if (
			!vccBraintreeInstance ||
			typeof vccBraintreeInstance.requestPaymentMethod !== "function"
		) {
			toast.error("Braintree card fields are not ready yet.");
			return;
		}

		setIsVccSubmitting(true);
		try {
			const payload = await vccBraintreeInstance.requestPaymentMethod();
			const nonce = String(payload?.nonce || "").trim();
			if (!nonce) {
				throw new Error("Braintree did not return a payment nonce.");
			}

			const response = await chargeReservationViaBraintreeVcc({
				token,
				reservationId: reservation._id,
				usdAmount: validation.amountUsd,
				postalCode: validation.postalCode,
				paymentMethodNonce: nonce,
				cardholderName: vccCardholderName,
				proceedWithoutRoom: !!validation.proceedWithoutRoom,
			});

			const updated = response?.reservation;
			if (updated?._id) {
				setReservation(updated);
				onReservationUpdated(updated);
			}
			setVccStatusState(
				response?.braintreeStatus
					? { ...response.braintreeStatus, alreadyCharged: true }
					: {
							alreadyCharged: true,
							attemptedBefore: false,
					  },
			);
			toast.success(response?.message || "VCC payment completed.");
			resetVccFlowState();
		} catch (err) {
			applyVccApiError(err, "Braintree could not process this VCC payment.");
		} finally {
			setIsVccSubmitting(false);
		}
	}, [
		validateVccChargeContext,
		vccBraintreeInstance,
		token,
		reservation?._id,
		vccCardholderName,
		setReservation,
		onReservationUpdated,
		resetVccFlowState,
		applyVccApiError,
	]);

	const handleBofaVccSubmit = useCallback(async () => {
		if (!canManageBofaVcc) {
			toast.error("Only the configured super admin can process BoA VCC cards.");
			return;
		}
		const healthSnapshot = bofaHealthState;
		if (!healthSnapshot || healthSnapshot?.readyForCharge !== true) {
			const refreshedHealth = await handleRunBofaHealthCheck({ silent: false });
			if (!refreshedHealth || refreshedHealth?.readyForCharge !== true) {
				return;
			}
		}

		const validation = validateVccChargeContext(true, true);
		if (!validation.ok) return;

		const cardNumber = normalizeVccCardNumber(vccManualCardNumber);
		const cardExpiry = normalizeVccExpiryForSubmit(vccManualCardExpiry);
		const cardCVV = normalizeVccCvv(vccManualCardCvv);

		if (cardNumber.length < 12 || cardNumber.length > 19) {
			toast.error("Please enter a valid card number.");
			return;
		}
		if (!/^(\d{2})\/(\d{2}|\d{4})$/.test(cardExpiry)) {
			toast.error("Please enter expiry in MM/YY format.");
			return;
		}
		const expiryMatch = cardExpiry.match(/^(\d{2})\/(\d{2}|\d{4})$/);
		const expiryMonth = Number(expiryMatch?.[1] || 0);
		if (expiryMonth < 1 || expiryMonth > 12) {
			toast.error("Please enter a valid expiry month.");
			return;
		}
		if (cardCVV.length < 3 || cardCVV.length > 4) {
			toast.error("Please enter a valid CVV.");
			return;
		}

		const cardholder = splitVccCardholderName(
			vccCardholderName,
			defaultVccCardholderName,
		);

		setIsVccSubmitting(true);
		try {
			const response = await chargeReservationViaBofaVcc({
				token,
				reservationId: reservation._id,
				usdAmount: validation.amountUsd,
				postalCode: validation.postalCode,
				cardNumber,
				cardExpiry,
				cardCVV,
				cardholderName: cardholder.fullName,
				proceedWithoutRoom: !!validation.proceedWithoutRoom,
				confirmationNumber2: secondaryConfirmation,
				billingAddress: {
					firstName: cardholder.firstName,
					lastName: cardholder.lastName,
					address1: vccAddressLine1,
					locality: vccAdminArea2,
					administrativeArea: vccAdminArea1,
					postalCode: String(vccEffectiveZipCode || validation.postalCode)
						.trim()
						.toUpperCase(),
					countryCode: vccBillingCountryCode,
				},
			});

			const updated = response?.reservation;
			if (updated?._id) {
				setReservation(updated);
				onReservationUpdated(updated);
			}
			setVccStatusState(
				response?.bofaStatus
					? { ...response.bofaStatus, alreadyCharged: true }
					: {
							alreadyCharged: true,
							attemptedBefore: false,
					  },
			);
			toast.success(
				response?.message || "VCC payment completed via Bank of America.",
			);
			resetVccFlowState();
		} catch (err) {
			applyVccApiError(
				err,
				"Bank of America could not process this VCC payment.",
			);
		} finally {
			setIsVccSubmitting(false);
		}
	}, [
		canManageBofaVcc,
		bofaHealthState,
		handleRunBofaHealthCheck,
		validateVccChargeContext,
		vccManualCardNumber,
		vccManualCardExpiry,
		vccManualCardCvv,
		vccCardholderName,
		defaultVccCardholderName,
		token,
		reservation?._id,
		secondaryConfirmation,
		vccAddressLine1,
		vccAdminArea2,
		vccAdminArea1,
		vccEffectiveZipCode,
		vccBillingCountryCode,
		setReservation,
		onReservationUpdated,
		resetVccFlowState,
		applyVccApiError,
	]);

	if (isBofaVccMode && !canManageBofaVcc) {
		return null;
	}

	return (
		<div
			className='mb-3'
			dir='ltr'
			lang='en'
			style={{
				direction: "ltr",
				textAlign: "left",
				border: "1px solid #e5e7eb",
				borderRadius: "10px",
				padding: "12px",
				background: "#f9fafb",
			}}
		>
								<div
									className='d-flex justify-content-between align-items-center flex-wrap'
									style={{ gap: "10px" }}
								>
									<strong>Virtual Card Payment (OTA)</strong>
									<button
										type='button'
										className='btn btn-success'
										onClick={openVccPanel}
										disabled={
											!isExpediaReservation ||
											vccAlreadyCharged ||
											vccAttemptedBefore ||
											isVccSubmitting
										}
									>
										Pay Via VCC
									</button>
								</div>
								<div style={{ fontSize: "0.85rem", marginTop: "8px" }}>
									{isExpediaReservation
										? `Booking source detected as ${vccProviderLabel}. ZIP defaults to ${vccDefaultZipCode}, but you can change it before submitting.`
										: `Booking source detected as ${
												vccProviderLabel || "Unknown source"
										  }. VCC processing is currently enabled only for Expedia reservations.`}
								</div>
								{isVccStatusLoading ? (
									<div style={{ marginTop: "8px", fontSize: "0.85rem" }}>
										Checking VCC status...
									</div>
								) : null}
								{vccAlreadyCharged ? (
									<div
										style={{
											marginTop: "8px",
											color: "#166534",
											fontWeight: "bold",
										}}
									>
										This reservation was already charged via VCC.
									</div>
								) : null}
								{vccAttemptedBefore ? (
									<div
										style={{
											marginTop: "8px",
											color: "#991b1b",
											fontWeight: "bold",
										}}
									>
										{vccWarningMessage}
										{vccLastFailureMessage ? ` (${vccLastFailureMessage})` : ""}
									</div>
								) : null}
								{vccRetryAllowed ? (
									<div
										style={{
											marginTop: "8px",
											color: "#92400e",
											fontWeight: "bold",
										}}
									>
										{vccWarningMessage}
										{vccLastFailureMessage ? ` (${vccLastFailureMessage})` : ""}
									</div>
								) : null}
								{isVccPanelVisible && isExpediaReservation ? (
									<div
										style={{
											marginTop: "12px",
											padding: "16px",
											border: "1px solid #d7dee7",
											borderRadius: "12px",
											background:
												"linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
											boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
										}}
									>
										{vccStep === "amount" ? (
											<div>
												<label style={{ fontWeight: "bold" }}>
													VCC Amount (USD)
												</label>
												<input
													type='number'
													min='0'
													step='0.01'
													className='form-control'
													value={vccAmountUsd}
													onChange={(e) => setVccAmountUsd(e.target.value)}
												/>
												{storedVccAmounts.amountUsd > 0 ||
												storedVccAmounts.amountSar > 0 ? (
													<div style={{ fontSize: "0.82rem", marginTop: "6px" }}>
														OTA VCC amount saved:{" "}
														{storedVccAmounts.amountUsd > 0
															? `$${storedVccAmounts.amountUsd.toFixed(2)} USD`
															: "USD not available"}
														{storedVccAmounts.amountSar > 0
															? ` / ${storedVccAmounts.amountSar.toFixed(2)} SAR`
															: ""}
													</div>
												) : null}
												<div className='mt-2'>
													<label style={{ fontWeight: "bold" }}>
														Billing ZIP / Postal Code
													</label>
													<input
														type='text'
														className='form-control'
														maxLength={12}
														placeholder={vccDefaultZipCode}
														value={vccZipCode}
														onChange={(e) =>
															setVccZipCode(
																e.target.value
																	.replace(/[^A-Za-z0-9 -]/g, "")
																	.toUpperCase(),
															)
														}
													/>
												</div>
												<div className='d-flex justify-content-end mt-3'>
													<button
														type='button'
														className='btn btn-primary'
														onClick={handleVccAmountContinue}
													>
														Continue
													</button>
												</div>
											</div>
										) : (
											<div>
												<div
													style={{
														fontSize: "0.9rem",
														background: "#f8fafc",
														padding: "12px 14px",
														border: "1px solid #dbe4ef",
														borderRadius: "10px",
														marginBottom: "14px",
													}}
												>
													<div>
														<strong>Billing Address:</strong>{" "}
														{vccBillingAddressLine}, {vccEffectiveZipCode},{" "}
														{vccBillingCountry}
													</div>
													<div>
														<strong>Cardholder:</strong> {vccCardholderName}
													</div>
													<div>
														<strong>Metadata:</strong> Guest{" "}
														{customerFullName || "N/A"}, Confirmation{" "}
														{reservation?.confirmation_number || "N/A"},
														Confirmation 2 {secondaryConfirmation || "N/A"},
														Check-in {formattedCheckin}, Check-out{" "}
														{formattedCheckout}, Hotel{" "}
														{hotelDetails?.hotelName ||
															reservation?.hotelName ||
															"N/A"}
													</div>
													<div>
														<strong>Guest Housed In Room #:</strong>{" "}
														{reservationCancelledOrNoShow
															? "Not required (cancelled/no-show)"
															: vccRoomSummary || "Missing room number"}
													</div>
													<div>
														<strong>Charge:</strong> $
														{Number(vccAmountUsd || 0).toFixed(2)} USD
													</div>
												</div>
												{isBraintreeVccMode ? (
													<>
														{isVccBraintreeLoading ? (
															<div
																style={{
																	fontSize: "0.9rem",
																	marginBottom: "10px",
																}}
															>
																Initializing secure Braintree card fields...
															</div>
														) : null}
														{vccBraintreeInitError ? (
															<div
																style={{
																	fontSize: "0.9rem",
																	marginBottom: "10px",
																	color: "#991b1b",
																	fontWeight: 600,
																}}
															>
																{vccBraintreeInitError}
															</div>
														) : null}
														{vccBraintreeClientToken &&
														!vccBraintreeInitError ? (
															<div style={{ marginBottom: "12px" }}>
																<DropIn
																	options={{
																		authorization: vccBraintreeClientToken,
																		card: {
																			cardholderName: {
																				required: false,
																			},
																		},
																	}}
																	onInstance={(instance) =>
																		setVccBraintreeInstance(instance || null)
																	}
																/>
															</div>
														) : null}
														<div className='d-flex justify-content-between mt-3'>
															<button
																type='button'
																className='btn btn-outline-secondary'
																onClick={() => setVccStep("amount")}
																disabled={isVccSubmitting}
															>
																Back
															</button>
															<button
																type='button'
																className='btn btn-success'
																onClick={handleBraintreeVccSubmit}
																disabled={
																	isVccSubmitting ||
																	!vccBraintreeClientToken ||
																	!vccBraintreeInstance
																}
															>
																{isVccSubmitting
																	? "Processing..."
																	: "Submit VCC Charge"}
															</button>
														</div>
													</>
												) : isBofaVccMode ? (
													<>
														<div
															style={{
																fontSize: "0.88rem",
																background: "#f8fafc",
																padding: "10px 12px",
																border: "1px solid #dbe4ef",
																borderRadius: "10px",
																marginBottom: "12px",
															}}
														>
															<div className='d-flex justify-content-between align-items-center mb-1'>
																<strong>BoA Health Check</strong>
																<button
																	type='button'
																	className='btn btn-sm btn-outline-primary'
																	onClick={() =>
																		handleRunBofaHealthCheck({ silent: false })
																	}
																	disabled={
																		isBofaHealthLoading || isVccSubmitting
																	}
																>
																	{isBofaHealthLoading
																		? "Checking..."
																		: "Run Check"}
																</button>
															</div>
															<div
																style={{
																	color:
																		bofaHealthState?.readyForCharge === true
																			? "#166534"
																			: bofaHealthState?.readyForCharge ===
																			    false
																			  ? "#991b1b"
																			  : "#334155",
																	fontWeight:
																		bofaHealthState?.readyForCharge === true ||
																		bofaHealthState?.readyForCharge === false
																			? 600
																			: 500,
																}}
															>
																{isBofaHealthLoading
																	? "Running BoA probe..."
																	: bofaHealthState
																	  ? bofaHealthState?.readyForCharge
																			? "Ready: endpoint/auth probe passed."
																			: "Not ready: configuration/provisioning issue detected."
																	  : "Run the BoA health check before submitting."}
															</div>
															{bofaHealthCode ? (
																<div style={{ marginTop: "4px" }}>
																	<strong>Code:</strong> {bofaHealthCode}
																</div>
															) : null}
															{bofaHealthMessage ? (
																<div style={{ marginTop: "4px" }}>
																	<strong>Details:</strong> {bofaHealthMessage}
																</div>
															) : null}
															{bofaProbeState?.correlationId ? (
																<div style={{ marginTop: "4px" }}>
																	<strong>Correlation ID:</strong>{" "}
																	{bofaProbeState.correlationId}
																</div>
															) : null}
														</div>
														<div className='mb-3'>
															<label style={{ fontWeight: "bold" }}>
																Cardholder Name
															</label>
															<input
																type='text'
																className='form-control'
																value={vccManualCardholderName}
																onChange={(e) =>
																	setVccManualCardholderName(
																		e.target.value.slice(0, 80),
																	)
																}
																placeholder={defaultVccCardholderName}
																autoComplete='off'
															/>
														</div>
														<div className='mb-3'>
															<label style={{ fontWeight: "bold" }}>
																Card Number
															</label>
															<input
																type='text'
																inputMode='numeric'
																className='form-control'
																value={vccManualCardNumber}
																onChange={(e) =>
																	setVccManualCardNumber(
																		formatVccCardNumber(e.target.value),
																	)
																}
																placeholder='4111 1111 1111 1111'
																autoComplete='off'
															/>
														</div>
														<div className='row'>
															<div className='col-md-6 mb-3'>
																<label style={{ fontWeight: "bold" }}>
																	Expiry
																</label>
																<input
																	type='text'
																	inputMode='numeric'
																	className='form-control'
																	value={vccManualCardExpiry}
																	onChange={(e) =>
																		setVccManualCardExpiry(
																			formatVccExpiry(e.target.value),
																		)
																	}
																	placeholder='MM/YY'
																	autoComplete='off'
																/>
															</div>
															<div className='col-md-6 mb-3'>
																<label style={{ fontWeight: "bold" }}>
																	CVV
																</label>
																<input
																	type='text'
																	inputMode='numeric'
																	className='form-control'
																	value={vccManualCardCvv}
																	onChange={(e) =>
																		setVccManualCardCvv(
																			normalizeVccCvv(e.target.value),
																		)
																	}
																	placeholder='CVV'
																	autoComplete='off'
																/>
															</div>
														</div>
														<div className='d-flex justify-content-between mt-3'>
															<button
																type='button'
																className='btn btn-outline-secondary'
																onClick={() => setVccStep("amount")}
																disabled={isVccSubmitting}
															>
																Back
															</button>
															<button
																type='button'
																className='btn btn-success'
																onClick={handleBofaVccSubmit}
																disabled={
																	isVccSubmitting ||
																	isBofaHealthLoading ||
																	shouldBlockBofaSubmit
																}
															>
																{isVccSubmitting
																	? "Processing..."
																	: "Submit VCC Charge"}
															</button>
														</div>
														{shouldBlockBofaSubmit ? (
															<div
																style={{
																	marginTop: "8px",
																	color: "#991b1b",
																	fontSize: "0.88rem",
																	fontWeight: 600,
																}}
															>
																BoA health check is not ready. Fix configuration
																and run check again before charging.
															</div>
														) : null}
													</>
												) : (
													<>
														{isVccPayPalLoading ? (
															<div
																style={{
																	fontSize: "0.9rem",
																	marginBottom: "10px",
																}}
															>
																Initializing secure PayPal card fields...
															</div>
														) : null}
														{vccPayPalInitError ? (
															<div
																style={{
																	fontSize: "0.9rem",
																	marginBottom: "10px",
																	color: "#991b1b",
																	fontWeight: 600,
																}}
															>
																{vccPayPalInitError}
															</div>
														) : null}
														{vccPayPalOptions && !vccPayPalInitError ? (
															<PayPalScriptProvider
																key={String(
																	vccPayPalOptions?.["data-client-token"] ||
																		"vcc-paypal",
																)}
																options={vccPayPalOptions}
															>
																<PayPalCardFieldsProvider
																	createOrder={createHostedVccOrder}
																	onApprove={handleHostedVccApprove}
																	onError={handleHostedVccProviderError}
																	onCancel={handleHostedVccCancel}
																>
																	<VccHostedFieldsLayout
																		cardholderName={vccCardholderName}
																	/>
																	<div className='d-flex justify-content-between mt-3'>
																		<button
																			type='button'
																			className='btn btn-outline-secondary'
																			onClick={() => setVccStep("amount")}
																			disabled={isVccSubmitting}
																		>
																			Back
																		</button>
																		<VccCardFieldsSubmitButton
																			disabled={isVccSubmitting}
																			isSubmitting={isVccSubmitting}
																			onBeforeSubmit={
																				handleHostedVccBeforeSubmit
																			}
																			onSubmitError={handleHostedVccSubmitError}
																			buildSubmitPayload={() => ({
																				cardholderName: vccCardholderName,
																				billingAddress: {
																					addressLine1: vccAddressLine1,
																					adminArea2: vccAdminArea2,
																					adminArea1: vccAdminArea1,
																					postalCode: String(
																						vccEffectiveZipCode,
																					)
																						.trim()
																						.toUpperCase(),
																					countryCode: vccBillingCountryCode,
																				},
																			})}
																		/>
																	</div>
																</PayPalCardFieldsProvider>
															</PayPalScriptProvider>
														) : null}
													</>
												)}
											</div>
										)}
									</div>
								) : null}
							</div>
	);
};

export default VCCPayment;
