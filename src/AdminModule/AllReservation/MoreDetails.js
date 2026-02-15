import React, {
	useEffect,
	useState,
	useRef,
	useCallback,
	useMemo,
} from "react";
import styled, { createGlobalStyle } from "styled-components";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import { Spin, Modal, Select, Checkbox } from "antd";
import moment from "moment";
import { EditOutlined } from "@ant-design/icons";
import {
	getHotelRooms,
	sendPaymnetLinkToTheClient,
	sendReservationConfirmationEmail,
	updateSingleReservation,
} from "../../HotelModule/apiAdmin";
import { toast } from "react-toastify";
import EditReservationMain from "./EditReservationMain";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";
import { relocationArray1 } from "../../HotelModule/ReservationsFolder/ReservationAssets";
import PaymentTrigger from "./PaymentTrigger";
import ReceiptPDF from "./ReceiptPDF";
import ReceiptPDFB2B from "./ReceiptPDFB2B";
import AlDawleya from "./AlDawleya";
import {
	sendReservationConfirmationSMSManualAdmin,
	sendReservationPaymentLinkSMSManualAdmin,
	getReservationVccStatus,
	getPayPalClientTokenForVcc,
	createReservationVccOrder,
	captureReservationVccOrder,
} from "../apiAdmin";
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

const ModalZFix = createGlobalStyle`
	.edit-reservation-modal .ant-modal,
	.status-update-modal .ant-modal,
	.relocate-reservation-modal .ant-modal,
	.receipt-modal .ant-modal,
	.edit-reservation-modal .ant-modal-wrap,
	.status-update-modal .ant-modal-wrap,
	.relocate-reservation-modal .ant-modal-wrap,
	.receipt-modal .ant-modal-wrap {
		z-index: 12050 !important;
	}
	.edit-reservation-modal .ant-modal-mask,
	.status-update-modal .ant-modal-mask,
	.relocate-reservation-modal .ant-modal-mask,
	.receipt-modal .ant-modal-mask {
		z-index: 12049 !important;
	}

	.update-pdf-modal .ant-modal,
	.update-pdf-modal .ant-modal-wrap {
		z-index: 13020 !important;
	}
	.update-pdf-modal .ant-modal-mask {
		z-index: 13019 !important;
	}

	/* Ensure selects inside status/Update modals render above everything */
	.status-update-modal .ant-select-dropdown {
		z-index: 13060 !important;
	}
	.update-pdf-modal .ant-select-dropdown {
		z-index: 13030 !important;
	}
`;

const resolvePopupContainer = (triggerNode) => {
	if (typeof document === "undefined") {
		return triggerNode || null;
	}
	if (!triggerNode) {
		return document.body;
	}
	return (
		triggerNode.closest(".ant-modal-content, .ant-drawer-content") ||
		triggerNode.parentNode ||
		document.body
	);
};

const Wrapper = styled.div`
	min-height: 750px;
	margin-top: 30px;
	text-align: ${(props) => (props.isArabic ? "right" : "")};
`;

const Header = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 170px;
	background-color: #f2f2f2;
	padding: 0 16px;

	h4,
	h3 {
		font-weight: bold;
	}

	button {
		background-color: black;
		color: white;
		padding: 1px;
		font-size: 13px;
		border-radius: 5px;
		text-align: center;
		margin: auto;
	}
`;

const Section = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
`;

const HorizontalLine = styled.hr`
	border: none;
	border-bottom: 2px solid black;
	margin: 0;
`;

const Content = styled.div`
	display: flex;
	padding: 16px;
`;

const ContentSection = styled.div`
	padding: 0 16px;

	&:first-child,
	&:last-child {
		flex: 0 0 33%;
	}

	&:nth-child(2) {
		flex: 0 0 37%;
		border-right: 1px solid #ddd;
		border-left: 1px solid #ddd;
	}

	h4,
	h3 {
		font-size: 1.4rem;
	}
`;

const PaymentBreakdownToggle = styled.button`
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 90%;
	margin: 14px auto 6px;
	padding: 10px 12px;
	border-radius: 8px;
	border: 1px solid #d9d9d9;
	background: #fafafa;
	color: #222;
	font-weight: 600;
	cursor: pointer;

	&:hover {
		background: #f1f1f1;
	}
`;

const PaymentBreakdownHint = styled.span`
	font-size: 0.85rem;
	font-weight: 500;
	color: #666;
`;

const AssignRoomCallout = styled.button`
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-direction: ${(props) => (props.isArabic ? "row-reverse" : "row")};
	width: 90%;
	margin: 6px auto 14px;
	padding: 12px 14px;
	border-radius: 10px;
	border: 1px solid #2f7a45;
	background: linear-gradient(135deg, #e9f7ef, #f7fffb);
	color: #1d4f2b;
	font-weight: 700;
	cursor: pointer;
	box-shadow: 0 6px 14px rgba(31, 111, 67, 0.12);
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease,
		background 0.15s ease;

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 10px 18px rgba(31, 111, 67, 0.18);
		background: linear-gradient(135deg, #e2f4ea, #f1fff7);
	}
`;

const AssignRoomHint = styled.span`
	font-size: 0.85rem;
	font-weight: 600;
	color: #2f7a45;
	background: #e2f0e7;
	padding: 2px 10px;
	border-radius: 999px;
`;

const PaymentBreakdownTotals = styled.div`
	border: 1px solid #e5e5e5;
	background: #f7f7f7;
	border-radius: 8px;
	padding: 12px 14px;
`;

const PaymentBreakdownNote = styled.div`
	color: #c0392b;
	font-size: 0.85rem;
	margin-bottom: 10px;
	font-weight: 600;
`;

const safeNumber = (val) => {
	const parsed = Number(val);
	return isNaN(parsed) ? 0 : parsed;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");
const splitPhoneForModal = (raw) => {
	const cleaned = normalizeDigits(raw);
	if (!cleaned) return { code: "", phone: "" };
	const hasPlus = String(raw || "")
		.trim()
		.startsWith("+");
	if (hasPlus && cleaned.length > 3) {
		return { code: cleaned.slice(0, 3), phone: cleaned.slice(3) };
	}
	return { code: "", phone: cleaned };
};

const VCC_PROMPT_WARNING_MESSAGE =
	"This reservation was prompted once before, please reach out to Ahmed Admin for more details";
const VCC_ROOM_UNASSIGNED_CONFIRM_MESSAGE =
	"Are you sure you want to proceed without assigning a room to the reservation?";
const DEFAULT_EXPEDIA_VCC_ZIP = "98119";
const VCC_MAX_ATTEMPTS = 2;
const VCC_RETRY_AVAILABLE_MESSAGE =
	"One VCC attempt failed before. One final retry is still allowed.";
const VCC_PROVIDER_UI_PRESETS = {
	expedia: {
		label: "Expedia",
		cardholderName: "Expedia VirtualCard",
		defaultZip: DEFAULT_EXPEDIA_VCC_ZIP,
		addressLine1: "1111 Expedia Group Way W",
		adminArea2: "Seattle",
		adminArea1: "WA",
		country: "USA",
	},
	agoda: {
		label: "Agoda",
		cardholderName: "Agoda VirtualCard",
		defaultZip: DEFAULT_EXPEDIA_VCC_ZIP,
		addressLine1: "1111 Expedia Group Way W",
		adminArea2: "Seattle",
		adminArea1: "WA",
		country: "USA",
	},
	booking: {
		label: "Booking.com",
		cardholderName: "Booking.com VirtualCard",
		defaultZip: DEFAULT_EXPEDIA_VCC_ZIP,
		addressLine1: "1111 Expedia Group Way W",
		adminArea2: "Seattle",
		adminArea1: "WA",
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

const normalizeIdValue = (value) => {
	if (!value) return "";
	if (typeof value === "string") return value;
	if (typeof value === "object") return value._id || value.id || "";
	return "";
};

const resolveId = (value) => {
	if (!value) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (typeof value === "object") return value._id || value.id || "";
	return "";
};

const formatNumber = (val) => Number(val || 0).toLocaleString();
const formatDisplayDate = (date, locale) => {
	if (!date) return "N/A";
	return moment(date).locale(locale).format("MMM DD, YYYY");
};

const paymentBreakdownFields = [
	{
		key: "paid_online_via_link",
		label: "Paid Online (Payment Link)",
		group: "online",
	},
	{
		key: "paid_online_via_instapay",
		label: "Paid Online (InstaPay)",
		group: "online",
	},
	{
		key: "paid_no_show",
		label: "Paid No Show",
		group: "online",
	},
	{
		key: "paid_at_hotel_cash",
		label: "Paid at Hotel (Cash)",
		group: "offline",
	},
	{
		key: "paid_at_hotel_card",
		label: "Paid at Hotel (Card)",
		group: "offline",
	},
	{
		key: "paid_to_zad",
		label: "Paid to ZAD",
		group: "online",
	},
	{
		key: "paid_online_jannatbooking",
		label: "Paid Online (Jannat Booking)",
		group: "online",
	},
	{
		key: "paid_online_other_platforms",
		label: "Paid Online (Other Platforms)",
		group: "online",
	},
];

const paymentBreakdownNumericKeys = paymentBreakdownFields.map(
	(field) => field.key,
);

const buildPaymentBreakdown = (breakdown) => ({
	paid_online_via_link: safeNumber(breakdown?.paid_online_via_link),
	paid_online_via_instapay: safeNumber(breakdown?.paid_online_via_instapay),
	paid_no_show: safeNumber(breakdown?.paid_no_show),
	paid_at_hotel_cash: safeNumber(breakdown?.paid_at_hotel_cash),
	paid_at_hotel_card: safeNumber(breakdown?.paid_at_hotel_card),
	paid_to_zad: safeNumber(breakdown?.paid_to_zad),
	paid_online_jannatbooking: safeNumber(breakdown?.paid_online_jannatbooking),
	paid_online_other_platforms: safeNumber(
		breakdown?.paid_online_other_platforms,
	),
	payment_comments:
		typeof breakdown?.payment_comments === "string"
			? breakdown.payment_comments
			: "",
});

const getPaymentBreakdownTotals = (breakdown) =>
	paymentBreakdownFields.reduce(
		(acc, field) => {
			const value = safeNumber(breakdown?.[field.key]);
			acc.total += value;
			if (field.group === "offline") acc.offline += value;
			else acc.online += value;
			return acc;
		},
		{ total: 0, online: 0, offline: 0 },
	);

const hasPaidBreakdownCapture = (breakdown = {}) =>
	paymentBreakdownNumericKeys.some((key) => safeNumber(breakdown?.[key]) > 0);

const summarizeReservationPaymentStatus = (reservation = {}) => {
	const paymentStr = (reservation?.payment || "").toLowerCase();
	const paymentDetails = reservation?.payment_details || {};
	const paypalDetails = reservation?.paypal_details || {};

	const legacyCaptured = !!paymentDetails.captured;
	const paidOffline =
		safeNumber(paymentDetails.onsite_paid_amount) > 0 ||
		paymentStr === "paid offline";

	const breakdownCaptured = hasPaidBreakdownCapture(
		reservation?.paid_amount_breakdown,
	);

	const capturedTotals = [
		paypalDetails.captured_total_sar,
		paypalDetails.captured_total_usd,
		paypalDetails.captured_total,
	]
		.map(safeNumber)
		.filter((n) => n > 0);

	const initialCompleted =
		(
			paypalDetails?.initial?.capture_status ||
			paypalDetails?.initial?.status ||
			""
		).toUpperCase() === "COMPLETED";

	const anyMitCompleted =
		Array.isArray(paypalDetails?.mit) &&
		paypalDetails.mit.some(
			(m) =>
				(m?.capture_status || m?.status || "").toUpperCase() === "COMPLETED",
		);

	const anyCapturesCompleted =
		Array.isArray(paypalDetails?.captures) &&
		paypalDetails.captures.some(
			(c) =>
				(c?.capture_status || c?.status || "").toUpperCase() === "COMPLETED",
		);

	const isCaptured =
		legacyCaptured ||
		capturedTotals.length > 0 ||
		initialCompleted ||
		anyMitCompleted ||
		anyCapturesCompleted ||
		paymentStr === "paid online" ||
		paymentStr === "captured" ||
		paymentStr === "credit/ debit" ||
		paymentStr === "credit/debit" ||
		breakdownCaptured;

	const isNotPaid = paymentStr === "not paid" && !isCaptured && !paidOffline;

	let status = "Not Captured";
	if (isCaptured) status = "Captured";
	else if (paidOffline) status = "Paid Offline";
	else if (isNotPaid) status = "Not Paid";

	return { status, isCaptured, paidOffline, isNotPaid };
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

const MoreDetails = ({
	reservation,
	setReservation,
	hotelDetails,
	onReservationUpdated = () => {},
}) => {
	const pdfRef = useRef(null);
	const alDawleyaPdfRef = useRef(null);
	const vccProceedWithoutRoomRef = useRef(false);
	// eslint-disable-next-line
	const [loading, setLoading] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isModalVisible2, setIsModalVisible2] = useState(false);
	const [isModalVisible3, setIsModalVisible3] = useState(false);
	const [isModalVisible5, setIsModalVisible5] = useState(false);
	const [isModalVisible6, setIsModalVisible6] = useState(false);
	const [isModalVisible4, setIsModalVisible4] = useState(false);
	const [linkModalVisible, setLinkModalVisible] = useState(false);
	const [paymentLinkEmailModalOpen, setPaymentLinkEmailModalOpen] =
		useState(false);
	const [paymentLinkEmailValue, setPaymentLinkEmailValue] = useState("");
	const [isSendingPaymentLinkEmail, setIsSendingPaymentLinkEmail] =
		useState(false);
	const [confirmationEmailModalOpen, setConfirmationEmailModalOpen] =
		useState(false);
	const [confirmationEmailValue, setConfirmationEmailValue] = useState("");
	const [isSendingConfirmationEmail, setIsSendingConfirmationEmail] =
		useState(false);
	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [whatsAppMessageType, setWhatsAppMessageType] =
		useState("confirmation");
	const [whatsAppCountryCode, setWhatsAppCountryCode] = useState("");
	const [whatsAppPhone, setWhatsAppPhone] = useState("");
	const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
	const [isPaymentBreakdownVisible, setIsPaymentBreakdownVisible] =
		useState(false);
	const [chosenRooms, setChosenRooms] = useState([]);
	const [selectedHotelDetails, setSelectedHotelDetails] = useState("");
	const [sendEmail, setSendEmail] = useState(false);
	const [paymentBreakdownDraft, setPaymentBreakdownDraft] = useState(
		buildPaymentBreakdown(reservation?.paid_amount_breakdown),
	);
	const [isSavingPaymentBreakdown, setIsSavingPaymentBreakdown] =
		useState(false);
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

	// eslint-disable-next-line
	const [selectedStatus, setSelectedStatus] = useState("");
	const [linkGenerate, setLinkGenerated] = useState("");

	const { languageToggle, chosenLanguage } = useCartContext();

	// eslint-disable-next-line
	const { user, token } = isAuthenticated();
	const localeCode = chosenLanguage === "Arabic" ? "ar" : "en";
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
	const customerNickName = reservation?.customer_details?.nickName || "";
	const secondaryConfirmation =
		reservation?.customer_details?.confirmation_number2 || "";
	const bookingSourceNormalized = String(
		reservation?.booking_source || "",
	).toLowerCase();
	const vccProviderKey = resolveVccProviderKey(bookingSourceNormalized);
	const vccProviderUiPreset =
		VCC_PROVIDER_UI_PRESETS[vccProviderKey] || VCC_PROVIDER_UI_PRESETS.expedia;
	const vccProviderLabel = vccProviderUiPreset.label || "Provider";
	const vccCardholderName =
		vccProviderUiPreset.cardholderName || `${vccProviderLabel} VirtualCard`;
	const vccDefaultZipCode =
		vccProviderUiPreset.defaultZip || DEFAULT_EXPEDIA_VCC_ZIP;
	const vccAddressLine1 =
		vccProviderUiPreset.addressLine1 || "1111 Expedia Group Way W";
	const vccAdminArea2 = vccProviderUiPreset.adminArea2 || "Seattle";
	const vccAdminArea1 = vccProviderUiPreset.adminArea1 || "WA";
	const vccBillingAddressLine = `${vccAddressLine1}, ${vccAdminArea2}, ${vccAdminArea1}`;
	const vccBillingCountry = vccProviderUiPreset.country || "USA";
	const isExpediaReservation = bookingSourceNormalized.includes("expedia");
	const reservationCancelledOrNoShow = isCancelledOrNoShowForVcc(
		reservation?.reservation_status,
	);

	const resetVccFlowState = useCallback(() => {
		setIsVccPanelVisible(false);
		setVccStep("amount");
		setVccAmountUsd("");
		setVccZipCode(vccDefaultZipCode);
		vccProceedWithoutRoomRef.current = false;
		setVccPayPalOptions(null);
		setVccPayPalInitError("");
		setIsVccPayPalLoading(false);
		setIsVccSubmitting(false);
	}, [vccDefaultZipCode]);

	useEffect(() => {
		if (isModalVisible) {
			setSendEmail(false);
		}
	}, [isModalVisible]);

	useEffect(() => {
		if (!isPaymentBreakdownVisible) return;
		setPaymentBreakdownDraft(
			buildPaymentBreakdown(reservation?.paid_amount_breakdown),
		);
	}, [isPaymentBreakdownVisible, reservation?.paid_amount_breakdown]);

	useEffect(() => {
		if (isVccPanelVisible) return;
		setVccZipCode(vccDefaultZipCode);
	}, [isVccPanelVisible, vccDefaultZipCode]);

	useEffect(() => {
		if (isPaymentBreakdownVisible) return;
		resetVccFlowState();
		setVccStatusState(null);
	}, [isPaymentBreakdownVisible, resetVccFlowState]);

	useEffect(() => {
		if (
			!isPaymentBreakdownVisible ||
			!reservation?._id ||
			!isExpediaReservation
		) {
			return;
		}
		let active = true;
		setIsVccStatusLoading(true);
		getReservationVccStatus(reservation._id, token)
			.then((data) => {
				if (!active) return;
				setVccStatusState(data || null);
			})
			.catch((err) => {
				if (!active) return;
				console.error("Failed to fetch VCC status:", err);
				setVccStatusState(
					reservation?.vcc_payment
						? {
								alreadyCharged: !!reservation.vcc_payment?.charged,
								failedAttemptsCount: Number(
									reservation.vcc_payment?.failed_attempts_count || 0,
								),
								attemptedBefore:
									Number(reservation.vcc_payment?.failed_attempts_count || 0) >=
									VCC_MAX_ATTEMPTS,
								lastFailureMessage:
									reservation.vcc_payment?.last_failure_message || "",
								warningMessage:
									reservation.vcc_payment?.warning_message ||
									VCC_PROMPT_WARNING_MESSAGE,
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
		reservation?._id,
		reservation?.vcc_payment,
		token,
	]);

	useEffect(() => {
		if (
			!isPaymentBreakdownVisible ||
			!isVccPanelVisible ||
			vccStep !== "card" ||
			!isExpediaReservation
		) {
			return;
		}
		if (vccPayPalOptions) return;

		let active = true;
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

		return () => {
			active = false;
		};
	}, [
		isPaymentBreakdownVisible,
		isVccPanelVisible,
		vccStep,
		isExpediaReservation,
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
		if (!paymentLinkEmailModalOpen) return;
		setPaymentLinkEmailValue(reservation?.customer_details?.email || "");
	}, [paymentLinkEmailModalOpen, reservation?.customer_details?.email]);

	useEffect(() => {
		if (!confirmationEmailModalOpen) return;
		setConfirmationEmailValue(reservation?.customer_details?.email || "");
	}, [confirmationEmailModalOpen, reservation?.customer_details?.email]);

	useEffect(() => {
		if (!whatsAppModalOpen) return;
		setWhatsAppMessageType("confirmation");
	}, [whatsAppModalOpen]);

	useEffect(() => {
		if (!whatsAppModalOpen) return;
		const preset = splitPhoneForModal(
			reservation?.customer_details?.phone || "",
		);
		setWhatsAppCountryCode(preset.code);
		setWhatsAppPhone(preset.phone);
	}, [whatsAppModalOpen, reservation?.customer_details?.phone]);

	const totalAmountValue = safeNumber(reservation?.total_amount);
	const breakdownTotalsFromReservation = useMemo(
		() => getPaymentBreakdownTotals(reservation?.paid_amount_breakdown),
		[reservation?.paid_amount_breakdown],
	);
	const hasBreakdownValues = breakdownTotalsFromReservation.total > 0;
	const paidOnline = hasBreakdownValues
		? breakdownTotalsFromReservation.online
		: safeNumber(reservation?.paid_amount);
	const paidOffline = hasBreakdownValues
		? breakdownTotalsFromReservation.offline
		: safeNumber(reservation?.payment_details?.onsite_paid_amount);
	const totalPaid = hasBreakdownValues
		? breakdownTotalsFromReservation.total
		: paidOnline + paidOffline;
	const paymentBreakdownTotals = getPaymentBreakdownTotals(
		paymentBreakdownDraft,
	);
	const remainingPaymentAmount = Math.max(
		totalAmountValue - paymentBreakdownTotals.total,
		0,
	);
	const paymentStatusSummary = useMemo(
		() => summarizeReservationPaymentStatus(reservation),
		[reservation],
	);
	const paymentStatusLabel = useMemo(() => {
		const status = paymentStatusSummary?.status || "Not Captured";
		if (chosenLanguage !== "Arabic") return status;
		switch (status) {
			case "Captured":
				return "تم التحصيل";
			case "Paid Offline":
				return "مدفوع نقداً";
			case "Not Paid":
				return "غير مدفوع";
			default:
				return "غير محصل";
		}
	}, [paymentStatusSummary, chosenLanguage]);
	const paymentStatusColor = useMemo(() => {
		const status = paymentStatusSummary?.status || "Not Captured";
		if (status === "Captured" || status === "Paid Offline") return "darkgreen";
		if (status === "Not Paid") return "darkred";
		return "#a16207";
	}, [paymentStatusSummary]);
	const assumePaidInFull = paymentStatusSummary?.isCaptured && totalPaid === 0;
	const amountDue = assumePaidInFull
		? 0
		: Math.max(totalAmountValue - totalPaid, 0);

	const handlePaymentBreakdownValueChange = (key, rawValue) => {
		setPaymentBreakdownDraft((prev) => {
			const parsedValue = Math.max(safeNumber(rawValue), 0);
			const totalOther = paymentBreakdownNumericKeys.reduce((sum, fieldKey) => {
				if (fieldKey === key) return sum;
				return sum + safeNumber(prev[fieldKey]);
			}, 0);
			const maxForField = Math.max(totalAmountValue - totalOther, 0);
			const clampedValue = Math.min(parsedValue, maxForField);
			return { ...prev, [key]: clampedValue };
		});
	};

	const handlePaymentBreakdownCommentChange = (value) => {
		setPaymentBreakdownDraft((prev) => ({
			...prev,
			payment_comments: value,
		}));
	};

	const handleSavePaymentBreakdown = () => {
		if (!reservation?._id) return;
		const nextTotals = getPaymentBreakdownTotals(paymentBreakdownDraft);
		if (nextTotals.total > totalAmountValue) {
			return toast.error("Paid total cannot exceed the total amount.");
		}
		setIsSavingPaymentBreakdown(true);
		const updateData = {
			paid_amount_breakdown: buildPaymentBreakdown(paymentBreakdownDraft),
			paid_amount: nextTotals.total,
		};

		updateSingleReservation(reservation._id, updateData).then((response) => {
			setIsSavingPaymentBreakdown(false);
			if (!response || response.error) {
				console.error(response?.error || response);
				return toast.error(
					"An error occurred while updating the payment breakdown",
				);
			}
			const updated = response?.reservation || response;
			const merged = updated?._id ? updated : { ...reservation, ...updateData };
			toast.success("Payment breakdown was successfully updated");
			setIsPaymentBreakdownVisible(false);
			setReservation(merged);
			onReservationUpdated(merged);
		});
	};

	const handleAssignRoomClick = useCallback(() => {
		const hotelId = resolveId(hotelDetails?._id || reservation?.hotelId);
		const belongsToId = resolveId(
			hotelDetails?.belongsTo || reservation?.belongsTo,
		);

		if (!hotelId || !belongsToId) {
			Modal.warning({
				title: "Missing hotel reference",
				content:
					"This reservation has no linked hotel or owner reference. Please reload and try again.",
			});
			return;
		}

		const selectedHotel = {
			_id: hotelId,
			hotelName:
				hotelDetails?.hotelName ||
				reservation?.hotelName ||
				reservation?.hotelId?.hotelName ||
				"",
			belongsTo: belongsToId,
		};

		try {
			localStorage.setItem("selectedHotel", JSON.stringify(selectedHotel));
		} catch (_) {}

		const confirmationValue =
			reservation?.confirmation_number ||
			reservation?.customer_details?.confirmation_number ||
			"";
		const params = new URLSearchParams();
		params.set("reserveARoom", "true");
		if (confirmationValue) {
			params.set("confirmation_number", String(confirmationValue));
		}

		window.location.href = `/hotel-management/new-reservation/${belongsToId}/${hotelId}?${params.toString()}`;
	}, [hotelDetails, reservation]);

	const buildPaymentLinkPayload = () => ({
		guestName: customerFullName || reservation?.customer_details?.name || "",
		hotelName: hotelDetails?.hotelName || "",
		confirmationNumber: reservation?.confirmation_number || "",
		totalAmount: reservation?.total_amount,
		paidAmount: reservation?.paid_amount,
		currency: reservation?.currency || "SAR",
		checkinDate: reservation?.checkin_date,
		checkoutDate: reservation?.checkout_date,
	});

	const handleSendPaymentLinkEmail = async () => {
		const email = String(paymentLinkEmailValue || "").trim();
		if (!emailPattern.test(email)) {
			return toast.error("Please provide a valid email address.");
		}
		if (!linkGenerate) {
			return toast.error("Please generate the payment link first.");
		}
		setIsSendingPaymentLinkEmail(true);
		try {
			const resp = await sendPaymnetLinkToTheClient(
				linkGenerate,
				email,
				buildPaymentLinkPayload(),
			);
			if (resp && resp.error) {
				toast.error("Failed Sending Email");
			} else {
				toast.success(`Payment link sent to ${email}`);
				setPaymentLinkEmailModalOpen(false);
			}
		} catch (e) {
			toast.error("Failed Sending Email");
		} finally {
			setIsSendingPaymentLinkEmail(false);
		}
	};

	const handleSendConfirmationEmail = async () => {
		const email = String(confirmationEmailValue || "").trim();
		if (!emailPattern.test(email)) {
			return toast.error("Please provide a valid email address.");
		}
		setIsSendingConfirmationEmail(true);
		try {
			const resp = await sendReservationConfirmationEmail({
				...reservation,
				hotelName: hotelDetails?.hotelName,
				overrideEmail: email,
			});
			if (resp && resp.error) {
				toast.error("Failed Sending Email");
			} else {
				toast.success(`Confirmation email sent to ${email}`);
				setConfirmationEmailModalOpen(false);
			}
		} catch (e) {
			toast.error("Failed Sending Email");
		} finally {
			setIsSendingConfirmationEmail(false);
		}
	};

	const handleSendWhatsApp = async () => {
		const code = normalizeDigits(whatsAppCountryCode);
		const phone = normalizeDigits(whatsAppPhone);
		if (!code || !phone) {
			return toast.error(
				"Please provide country code and phone number (digits only).",
			);
		}
		setIsSendingWhatsApp(true);
		try {
			let resp;
			if (whatsAppMessageType === "payment_link") {
				const paymentUrl = String(linkGenerate || "").trim();
				if (!paymentUrl) {
					return toast.error("Please generate the payment link first.");
				}
				resp = await sendReservationPaymentLinkSMSManualAdmin(
					reservation?._id || reservation?.confirmation_number,
					{ countryCode: code, phone, paymentUrl },
				);
				if (resp?.ok) {
					toast.success("WhatsApp payment link queued successfully.");
					setWhatsAppModalOpen(false);
				} else {
					toast.error(resp?.message || "Failed to queue WhatsApp message.");
				}
			} else {
				resp = await sendReservationConfirmationSMSManualAdmin(
					reservation?._id || reservation?.confirmation_number,
					{ countryCode: code, phone },
				);
				if (resp?.ok) {
					toast.success("WhatsApp confirmation queued successfully.");
					setWhatsAppModalOpen(false);
				} else {
					toast.error(resp?.message || "Failed to queue WhatsApp message.");
				}
			}
		} catch (e) {
			toast.error("Failed to queue WhatsApp message.");
		} finally {
			setIsSendingWhatsApp(false);
		}
	};

	const getTotalAmountPerDay = (pickedRoomsType) => {
		return pickedRoomsType.reduce((total, room) => {
			return total + room.chosenPrice * room.count;
		}, 0); // Start with 0 for the total
	};

	const calculateDaysBetweenDates = (startDate, endDate) => {
		const start = new Date(startDate);
		const end = new Date(endDate);
		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			console.error("Invalid start or end date");
			return 0;
		}
		const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
		return days > 0 ? days : 1; // Ensures a minimum of 1 day
	};

	// Calculate the number of days of residency
	// eslint-disable-next-line
	const daysOfResidence = calculateDaysBetweenDates(
		reservation.checkin_date,
		reservation.checkout_date,
	);

	// Revised calculateReservationPeriod function
	function calculateReservationPeriod(checkin, checkout, language) {
		// Parse the checkin and checkout dates to ignore the time component
		const checkinDate = moment(checkin).startOf("day");
		const checkoutDate = moment(checkout).startOf("day");

		// Calculate the duration in days
		const days = checkoutDate.diff(checkinDate, "days") + 1;
		// Calculate the nights as one less than the total days
		const nights = days - 1;

		// Define the text for "days" and "nights" based on the selected language
		const daysText = language === "Arabic" ? "أيام" : "days";
		const nightsText = language === "Arabic" ? "ليال" : "nights";

		// Return the formatted string showing both days and nights
		return `${days} ${daysText} / ${nights} ${nightsText}`;
	}

	const handleUpdateReservationStatus = () => {
		if (!selectedStatus) {
			return toast.error("Please Select A Status...");
		}

		const confirmationMessage = `Are you sure you want to change the status of the reservation to ${selectedStatus}?`;
		if (window.confirm(confirmationMessage)) {
			const updateData = {
				reservation_status: selectedStatus,
				hotelName: hotelDetails.hotelName,
				sendEmail, // ✅ Include sendEmail in the update
			};

			// ✅ Handle early check-out logic
			if (selectedStatus === "early_checked_out") {
				const newCheckoutDate = new Date();
				const startDate = new Date(reservation.checkin_date);
				const diffTime = Math.abs(newCheckoutDate - startDate);
				const daysOfResidence = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

				updateData.checkout_date = newCheckoutDate.toISOString();
				updateData.days_of_residence = daysOfResidence;

				const totalAmountPerDay = reservation.pickedRoomsType.reduce(
					(total, room) => total + room.count * parseFloat(room.chosenPrice),
					0,
				);

				updateData.total_amount = totalAmountPerDay * daysOfResidence;
			}

			// ✅ Call API with sendEmail flag
			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					const updated = response?.reservation || response;
					const merged = { ...reservation, ...updated };
					toast.success("Status was successfully updated");
					setIsModalVisible(false);
					setReservation(merged);
					onReservationUpdated(merged);
				}
			});
		}
	};

	const handleUpdateReservationStatus2 = () => {
		if (!selectedStatus) {
			return toast.error("Please Select A Status...");
		}

		const confirmationMessage = `Are you sure you want to change the status of the reservation to ${selectedStatus}?`;
		if (window.confirm(confirmationMessage)) {
			const updateData = { reservation_status: selectedStatus };

			// If the selected status is 'early_checked_out', also update the checkout_date and related fields
			if (selectedStatus === "early_checked_out") {
				const newCheckoutDate = new Date();
				const startDate = new Date(reservation.checkin_date);
				const diffTime = Math.abs(newCheckoutDate - startDate);
				const daysOfResidence = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

				updateData.checkout_date = newCheckoutDate.toISOString();
				updateData.days_of_residence = daysOfResidence;

				// Calculate the new total amount
				const totalAmountPerDay = reservation.pickedRoomsType.reduce(
					(total, room) => {
						return total + room.count * parseFloat(room.chosenPrice);
					},
					0,
				);

				updateData.total_amount = totalAmountPerDay * daysOfResidence;
			}

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					const updated = response?.reservation || response;
					const merged = { ...reservation, ...updated };
					toast.success("Status was successfully updated");
					setIsModalVisible(false);

					// Update local state or re-fetch reservation data if necessary
					setReservation(merged);
					onReservationUpdated(merged);
				}
			});
		}
	};

	const handleUpdateReservationStatus3 = () => {
		if (
			!selectedHotelDetails ||
			!selectedHotelDetails.belongsTo ||
			!selectedHotelDetails._id
		) {
			return toast.error("Please Select Your Desired Hotel For Relocation");
		}

		const confirmationMessage = `Are You Sure You want to re-locate this reservation? Once relocated, it will disappear from your reservation list`;
		if (window.confirm(confirmationMessage)) {
			const updateData = {
				belongsTo: selectedHotelDetails.belongsTo,
				hotelId: selectedHotelDetails._id,
				state: "relocated",
			};

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					toast.success("Reservation was successfully relocated");
					setIsModalVisible4(false);
					onReservationUpdated(response?.reservation || response);
					setTimeout(() => {
						window.location.reload(false);
					}, 1500);
				}
			});
		}
	};

	const roomIdValue = reservation?.roomId;
	const rawHotelIdValue = reservation?.hotelId;
	const hotelIdValue = useMemo(() => {
		return normalizeIdValue(rawHotelIdValue);
	}, [rawHotelIdValue]);
	const roomOwnerId = useMemo(() => {
		return normalizeIdValue(reservation?.belongsTo || user?._id);
	}, [reservation?.belongsTo, user?._id]);

	const getReservationRoomIds = useCallback((roomIdList) => {
		if (!Array.isArray(roomIdList)) return [];
		return roomIdList
			.map((room) => {
				if (!room) return null;
				if (typeof room === "string") return room;
				if (typeof room === "object" && room._id) return room._id;
				return room;
			})
			.filter(Boolean)
			.map((id) => String(id));
	}, []);

	const getHotelRoomsDetails = useCallback(() => {
		if (!hotelIdValue || !roomOwnerId) {
			setChosenRooms([]);
			return;
		}
		const roomIds = getReservationRoomIds(roomIdValue);
		if (roomIds.length === 0) {
			setChosenRooms([]);
			return;
		}
		getHotelRooms(hotelIdValue, roomOwnerId).then((data3) => {
			if (data3 && data3.error) {
				console.log(data3.error);
				setChosenRooms([]);
			} else {
				const filteredRooms = Array.isArray(data3)
					? data3.filter((room) => roomIds.includes(String(room?._id)))
					: [];
				setChosenRooms(filteredRooms);
			}
		});
	}, [getReservationRoomIds, hotelIdValue, roomIdValue, roomOwnerId]);

	useEffect(() => {
		if (Array.isArray(roomIdValue) && roomIdValue.length > 0) {
			getHotelRoomsDetails();
		} else {
			setChosenRooms([]);
		}
	}, [roomIdValue, getHotelRoomsDetails]);

	const roomTableRows = useMemo(() => {
		const fromDetails = Array.isArray(reservation?.roomDetails)
			? reservation.roomDetails.filter(Boolean)
			: [];
		if (fromDetails.length > 0) return fromDetails;

		const fromChosen = Array.isArray(chosenRooms)
			? chosenRooms.filter(Boolean)
			: [];
		if (fromChosen.length > 0) return fromChosen;

		const fromRoomId = Array.isArray(reservation?.roomId)
			? reservation.roomId.filter(
					(room) => room && typeof room === "object" && room.room_number,
			  )
			: [];
		return fromRoomId;
	}, [reservation, chosenRooms]);

	const vccRoomNumbers = useMemo(
		() => extractRoomNumbersForVcc(roomTableRows, reservation),
		[roomTableRows, reservation],
	);
	const vccRoomSummary = vccRoomNumbers.join(", ");
	const hasVccStatusSnapshot = vccStatusState !== null;
	const vccAlreadyCharged = hasVccStatusSnapshot
		? !!vccStatusState?.alreadyCharged
		: !!reservation?.vcc_payment?.charged;
	const vccFailedAttemptsCount = hasVccStatusSnapshot
		? Number(vccStatusState?.failedAttemptsCount || 0)
		: Number(reservation?.vcc_payment?.failed_attempts_count || 0);
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
		reservation?.vcc_payment?.warning_message ||
		VCC_PROMPT_WARNING_MESSAGE;
	const vccLastFailureMessage =
		vccStatusState?.lastFailureMessage ||
		reservation?.vcc_payment?.last_failure_message ||
		"";

	const openVccPanel = () => {
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
		const msg =
			apiResponse?.message ||
			err?.message ||
			fallbackMessage ||
			"VCC payment failed to process.";
		toast.error(msg);
		if (apiResponse?.warningMessage) {
			toast.error(apiResponse.warningMessage);
		}
		setVccStatusState((prev) => ({
			...(prev || {}),
			...(apiResponse?.vccStatus || {}),
			alreadyCharged:
				typeof apiResponse?.alreadyCharged === "boolean"
					? apiResponse.alreadyCharged
					: !!prev?.alreadyCharged,
			attemptedBefore:
				typeof apiResponse?.attemptedBefore === "boolean"
					? apiResponse.attemptedBefore
					: !!prev?.attemptedBefore,
			failedAttemptsCount: Number(
				apiResponse?.vccStatus?.failedAttemptsCount ||
					prev?.failedAttemptsCount ||
					0,
			),
			lastFailureMessage: apiResponse?.message || prev?.lastFailureMessage,
			warningMessage: apiResponse?.warningMessage || prev?.warningMessage,
		}));
	}, []);

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

	const downloadPDFFromRef = (targetRef, fileName = "receipt.pdf") => {
		if (!targetRef?.current) return;
		html2canvas(targetRef.current, {
			scale: 1,
			useCORS: true,
			backgroundColor: "#ffffff",
		}).then((canvas) => {
			const imgData = canvas.toDataURL("image/png");

			// Let's create a PDF and add our image into it
			const pdf = new jsPDF({
				orientation: "p",
				unit: "pt",
				format: "a4",
			});

			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();

			// Calculate the number of pages.
			const imgHeight = (canvas.height * pdfWidth) / canvas.width;
			let heightLeft = imgHeight;

			let position = 0;

			// Add image to the first page
			pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
			heightLeft -= pdfHeight;

			// Add new pages if the content overflows
			while (heightLeft >= 0) {
				position = heightLeft - imgHeight;
				pdf.addPage();
				pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
				heightLeft -= pdfHeight;
			}

			pdf.save(fileName);
		});
	};

	const downloadPDF = () => {
		downloadPDFFromRef(pdfRef, "receipt.pdf");
	};

	const downloadAlDawleyaPDF = () => {
		downloadPDFFromRef(alDawleyaPdfRef, "al-dawleya.pdf");
	};

	const getAverageRootPrice = (pickedRoomsType) => {
		if (!pickedRoomsType || pickedRoomsType.length === 0) return 0;

		let totalRootPrice = 0;
		let totalDays = 0;

		pickedRoomsType.forEach((room) => {
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				room.pricingByDay.forEach((day) => {
					totalRootPrice += parseFloat(day.rootPrice) * room.count; // Multiply by room count
				});
				totalDays += room.pricingByDay.length * room.count; // Multiply days by room count
			}
		});

		// Avoid division by zero
		return totalDays > 0 ? totalRootPrice / totalDays : 0;
	};

	const calculateOverallTotalRootPrice = (pickedRoomsType) => {
		if (!pickedRoomsType || pickedRoomsType.length === 0) return 0;

		return pickedRoomsType.reduce((total, room) => {
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				const roomTotal = room.pricingByDay.reduce((dayTotal, day) => {
					return dayTotal + parseFloat(day.rootPrice); // Sum rootPrice for all days
				}, 0);
				return total + roomTotal * room.count; // Multiply by room count
			}
			return total; // If no pricingByDay, just return total
		}, 0);
	};

	const calculateNights = (checkin, checkout) => {
		const start = new Date(checkin);
		const end = new Date(checkout);
		let nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
		return nights < 1 ? 1 : nights;
	};

	// Calculate nights once (assuming all room bookings have same checkin/checkout)
	// eslint-disable-next-line
	const nights = calculateNights(
		reservation?.checkin_date,
		reservation?.checkout_date,
	);

	// Compute the commission for one night from each room's pricingByDay data.
	// Same names, minimal changes
	const computedCommissionPerNight = reservation.pickedRoomsType
		? reservation.pickedRoomsType.reduce((total, room) => {
				let roomCommission = 0;
				if (room.pricingByDay && room.pricingByDay.length > 0) {
					// Use the difference: (price - rootPrice) for each day
					// then multiply by room.count
					roomCommission =
						room.pricingByDay.reduce((acc, day) => {
							// daily commission
							return acc + (Number(day.price) - Number(day.rootPrice));
						}, 0) * Number(room.count);
				}
				return total + roomCommission;
		  }, 0)
		: 0;

	// We've already accounted for all nights in pricingByDay,
	// so we do NOT multiply by 'nights' again.
	const computedCommission = computedCommissionPerNight;

	const computeOneNightCost = () => {
		if (
			!reservation.pickedRoomsType ||
			reservation.pickedRoomsType.length === 0
		)
			return 0;

		return reservation.pickedRoomsType.reduce((total, room) => {
			let firstDayRootPrice = 0;

			if (room.pricingByDay && room.pricingByDay.length > 0) {
				const firstDay = room.pricingByDay[0];
				firstDayRootPrice = safeNumber(firstDay.rootPrice);
			} else {
				// Fallback to chosenPrice if pricingByDay is missing or invalid
				firstDayRootPrice = safeNumber(room.chosenPrice);
			}

			// Multiply by the number of rooms (count)
			return total + firstDayRootPrice * safeNumber(room.count);
		}, 0);
	};

	// Compute the one night cost using the room's totalPriceWithoutCommission if available.
	const oneNightCost = computeOneNightCost() ? computeOneNightCost() : 0;

	// The final deposit is the sum of the computed commission and one night cost.
	const finalDeposit = computedCommission + oneNightCost;

	return (
		<Wrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			isArabic={chosenLanguage === "Arabic"}
		>
			<ModalZFix />
			{loading ? (
				<div className='text-center my-5'>
					<Spin size='large' />
					<p>Loading...</p>
				</div>
			) : (
				<div className='otherContentWrapper'>
					<Modal
						title={
							chosenLanguage === "Arabic"
								? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062d\u062c\u0632"
								: "Edit Reservation"
						}
						open={isModalVisible2}
						onCancel={() => setIsModalVisible2(false)}
						onOk={handleUpdateReservationStatus2}
						footer={null}
						width='95%'
						centered
						destroyOnClose
						forceRender
						zIndex={12000}
						maskClosable={false}
						style={{ top: 20 }}
						styles={{
							mask: { zIndex: 11999 },
							body: { maxHeight: "86vh", overflowY: "auto" },
						}}
						wrapClassName='edit-reservation-modal'
						rootClassName='edit-reservation-modal'
						getContainer={() => document.body}
					>
						{reservation && (
							<EditReservationMain
								reservation={reservation}
								setReservation={setReservation}
								chosenLanguage={chosenLanguage}
								hotelDetails={hotelDetails}
								onReservationUpdated={onReservationUpdated}
							/>
						)}
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? "تعديل الحجز"
								: "Update Reservation Status"
						}
						open={isModalVisible}
						onCancel={() => setIsModalVisible(false)}
						onOk={handleUpdateReservationStatus}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
						zIndex={12020}
						styles={{ mask: { zIndex: 12019 } }}
						getContainer={() => document.body}
						wrapClassName='status-update-modal'
						rootClassName='status-update-modal'
					>
						<Select
							defaultValue={reservation && reservation.reservation_status}
							style={{
								width: "100%",
							}}
							onChange={(value) => setSelectedStatus(value)}
							dropdownStyle={{ zIndex: 13050 }}
							getPopupContainer={resolvePopupContainer}
							dropdownMatchSelectWidth={false}
						>
							<Select.Option value=''>Please Select</Select.Option>
							<Select.Option value='cancelled'>Cancelled</Select.Option>
							<Select.Option value='no_show'>No Show</Select.Option>
							<Select.Option value='confirmed'>Confirmed</Select.Option>
							<Select.Option value='inhouse'>InHouse</Select.Option>
							<Select.Option value='checked_out'>Checked Out</Select.Option>
							<Select.Option value='early_checked_out'>
								Early Check Out
							</Select.Option>
						</Select>
						<Checkbox
							checked={sendEmail}
							onChange={(e) => setSendEmail(e.target.checked)}
							style={{ marginTop: "16px" }}
						>
							Send Email Notification to the Customer
						</Checkbox>
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? "نقل الحجز؟"
								: "Relocate Reservation?"
						}
						open={isModalVisible4}
						onCancel={() => setIsModalVisible4(false)}
						onOk={handleUpdateReservationStatus3}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
						zIndex={12018}
						styles={{ mask: { zIndex: 12017 } }}
						getContainer={() => document.body}
						wrapClassName='relocate-reservation-modal'
						rootClassName='relocate-reservation-modal'
					>
						<Select
							defaultValue={
								reservation && hotelDetails && hotelDetails.hotelName
							}
							style={{
								width: "100%",
								textTransform: "capitalize",
							}}
							onChange={(value) => setSelectedHotelDetails(JSON.parse(value))}
							getPopupContainer={resolvePopupContainer}
						>
							<Select.Option value=''>Please Select</Select.Option>
							{relocationArray1.map((hotel) => (
								<Select.Option
									style={{
										textTransform: "capitalize",
									}}
									key={hotel._id}
									value={JSON.stringify(hotel)}
								>
									{hotel.hotelName}
								</Select.Option>
							))}
						</Select>
					</Modal>

					<Modal
						open={linkModalVisible}
						onCancel={() => setLinkModalVisible(false)}
						onOk={() => setLinkModalVisible(false)}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
						width={"70%"}
					>
						<h3>Payment Link:</h3>
						<div
							style={{
								marginTop: "50px",
								marginBottom: "50px",
								fontSize: "1rem",
								cursor: "pointer", // Change the cursor to indicate clickable area
								textAlign: "center", // Center align if desired
								fontWeight: "bold",
								textDecoration: "underline",
								color: "darkblue",
							}}
							onClick={() =>
								window.open(linkGenerate, "_blank", "noopener,noreferrer")
							}
						>
							{linkGenerate}
						</div>
					</Modal>

					<Modal
						title='Payment Breakdown'
						open={isPaymentBreakdownVisible}
						onCancel={() => setIsPaymentBreakdownVisible(false)}
						footer={null}
						width={720}
						centered
						zIndex={12022}
						destroyOnClose
					>
						<div className='container-fluid'>
							<PaymentBreakdownNote>
								{chosenLanguage === "Arabic"
									? "جميع المبالغ بالريال السعودي (SAR)"
									: "All amounts are in SAR."}
							</PaymentBreakdownNote>
							<div
								className='mb-3'
								style={{
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
														{vccBillingAddressLine},{" "}
														{vccZipCode || vccDefaultZipCode},{" "}
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
												{isVccPayPalLoading ? (
													<div
														style={{ fontSize: "0.9rem", marginBottom: "10px" }}
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
																	onBeforeSubmit={handleHostedVccBeforeSubmit}
																	onSubmitError={handleHostedVccSubmitError}
																	buildSubmitPayload={() => ({
																		cardholderName: vccCardholderName,
																		billingAddress: {
																			addressLine1: vccAddressLine1,
																			adminArea2: vccAdminArea2,
																			adminArea1: vccAdminArea1,
																			postalCode: String(
																				vccZipCode || vccDefaultZipCode,
																			)
																				.trim()
																				.toUpperCase(),
																			countryCode: "US",
																		},
																	})}
																/>
															</div>
														</PayPalCardFieldsProvider>
													</PayPalScriptProvider>
												) : null}
											</div>
										)}
									</div>
								) : null}
							</div>
							<div className='row'>
								{paymentBreakdownFields.map((field) => (
									<div className='col-md-6 mb-3' key={field.key}>
										<label style={{ fontWeight: "bold" }}>{field.label}</label>
										<input
											type='number'
											min='0'
											step='0.01'
											className='form-control'
											value={paymentBreakdownDraft[field.key]}
											onChange={(e) =>
												handlePaymentBreakdownValueChange(
													field.key,
													e.target.value,
												)
											}
										/>
									</div>
								))}
							</div>
							<div className='row'>
								<div className='col-md-12 mb-3'>
									<label style={{ fontWeight: "bold" }}>Payment Comments</label>
									<textarea
										className='form-control'
										rows='3'
										value={paymentBreakdownDraft.payment_comments}
										onChange={(e) =>
											handlePaymentBreakdownCommentChange(e.target.value)
										}
									/>
								</div>
							</div>
							<PaymentBreakdownTotals>
								<div className='row'>
									<div className='col-md-4'>
										<div style={{ fontSize: "0.85rem", color: "#666" }}>
											Total Amount
										</div>
										<div style={{ fontWeight: "bold" }}>
											{formatNumber(totalAmountValue)} SAR
										</div>
									</div>
									<div className='col-md-4'>
										<div style={{ fontSize: "0.85rem", color: "#666" }}>
											Total Paid
										</div>
										<div style={{ fontWeight: "bold" }}>
											{formatNumber(paymentBreakdownTotals.total)} SAR
										</div>
									</div>
									<div className='col-md-4'>
										<div style={{ fontSize: "0.85rem", color: "#666" }}>
											Remaining
										</div>
										<div style={{ fontWeight: "bold", color: "#1b6b34" }}>
											{formatNumber(remainingPaymentAmount)} SAR
										</div>
									</div>
								</div>
							</PaymentBreakdownTotals>
							<div className='text-center mt-4'>
								<button
									type='button'
									className='btn btn-primary'
									disabled={
										isSavingPaymentBreakdown ||
										paymentBreakdownTotals.total > totalAmountValue
									}
									onClick={handleSavePaymentBreakdown}
								>
									{isSavingPaymentBreakdown ? "Updating..." : "Update"}
								</button>
							</div>
						</div>
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? "إرسال رابط الدفع"
								: "Send Payment Link"
						}
						open={paymentLinkEmailModalOpen}
						onCancel={() => setPaymentLinkEmailModalOpen(false)}
						onOk={handleSendPaymentLinkEmail}
						okText={chosenLanguage === "Arabic" ? "إرسال" : "Send"}
						confirmLoading={isSendingPaymentLinkEmail}
						centered
					>
						<div className='mb-3'>
							<label style={{ fontWeight: "bold" }}>
								{chosenLanguage === "Arabic"
									? "البريد الإلكتروني"
									: "Recipient Email"}
							</label>
							<input
								type='email'
								className='form-control'
								value={paymentLinkEmailValue}
								onChange={(e) => setPaymentLinkEmailValue(e.target.value)}
							/>
						</div>
						<div className='mb-2' style={{ fontWeight: "bold" }}>
							{chosenLanguage === "Arabic" ? "رابط الدفع" : "Payment Link"}
						</div>
						<div
							style={{
								fontSize: "0.9rem",
								wordBreak: "break-all",
								color: "#2563eb",
							}}
						>
							{linkGenerate || "N/A"}
						</div>
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? "إرسال تأكيد الحجز"
								: "Send Confirmation Email"
						}
						open={confirmationEmailModalOpen}
						onCancel={() => setConfirmationEmailModalOpen(false)}
						onOk={handleSendConfirmationEmail}
						okText={chosenLanguage === "Arabic" ? "إرسال" : "Send"}
						confirmLoading={isSendingConfirmationEmail}
						centered
					>
						<div className='mb-3'>
							<label style={{ fontWeight: "bold" }}>
								{chosenLanguage === "Arabic"
									? "البريد الإلكتروني"
									: "Recipient Email"}
							</label>
							<input
								type='email'
								className='form-control'
								value={confirmationEmailValue}
								onChange={(e) => setConfirmationEmailValue(e.target.value)}
							/>
						</div>
						<div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
							{chosenLanguage === "Arabic"
								? "سيتم إرسال تأكيد الحجز مع تفاصيل الحجز وملف PDF."
								: "A confirmation email with reservation details and PDF will be sent."}
						</div>
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? "إرسال رسالة واتساب"
								: "Send WhatsApp Message"
						}
						open={whatsAppModalOpen}
						onCancel={() => setWhatsAppModalOpen(false)}
						onOk={handleSendWhatsApp}
						okText={chosenLanguage === "Arabic" ? "إرسال" : "Send"}
						confirmLoading={isSendingWhatsApp}
						centered
					>
						<div className='mb-3'>
							<label style={{ fontWeight: "bold" }}>
								{chosenLanguage === "Arabic" ? "نوع الرسالة" : "Message Type"}
							</label>
							<div className='d-flex flex-column' style={{ gap: "6px" }}>
								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
									}}
								>
									<input
										type='radio'
										name='waMessageType'
										value='confirmation'
										checked={whatsAppMessageType === "confirmation"}
										onChange={() => setWhatsAppMessageType("confirmation")}
									/>
									{chosenLanguage === "Arabic"
										? "تأكيد الحجز (مع رابط PDF)"
										: "Reservation confirmation (with PDF link)"}
								</label>
								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
									}}
								>
									<input
										type='radio'
										name='waMessageType'
										value='payment_link'
										checked={whatsAppMessageType === "payment_link"}
										onChange={() => setWhatsAppMessageType("payment_link")}
									/>
									{chosenLanguage === "Arabic" ? "رابط الدفع" : "Payment link"}
								</label>
							</div>
							{whatsAppMessageType === "payment_link" && (
								<div
									style={{
										marginTop: "6px",
										fontSize: "0.85rem",
										color: linkGenerate ? "#2563eb" : "#b45309",
										wordBreak: "break-all",
									}}
								>
									{linkGenerate
										? linkGenerate
										: chosenLanguage === "Arabic"
										  ? "يرجى إنشاء رابط الدفع أولاً."
										  : "Please generate the payment link first."}
								</div>
							)}
						</div>
						<div className='row'>
							<div className='col-md-4 mb-3'>
								<label style={{ fontWeight: "bold" }}>
									{chosenLanguage === "Arabic" ? "رمز الدولة" : "Country Code"}
								</label>
								<input
									type='text'
									className='form-control'
									placeholder='966'
									value={whatsAppCountryCode}
									onChange={(e) =>
										setWhatsAppCountryCode(normalizeDigits(e.target.value))
									}
								/>
							</div>
							<div className='col-md-8 mb-3'>
								<label style={{ fontWeight: "bold" }}>
									{chosenLanguage === "Arabic" ? "رقم الهاتف" : "Phone Number"}
								</label>
								<input
									type='text'
									className='form-control'
									placeholder={
										chosenLanguage === "Arabic" ? "بدون مسافات" : "Digits only"
									}
									value={whatsAppPhone}
									onChange={(e) =>
										setWhatsAppPhone(normalizeDigits(e.target.value))
									}
								/>
							</div>
						</div>
						<div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
							{chosenLanguage === "Arabic"
								? "يرجى إدخال الأرقام فقط بدون مسافات أو رموز."
								: "Please enter digits only (no spaces or special characters)."}
						</div>
					</Modal>

					<div
						style={{
							textAlign: chosenLanguage === "Arabic" ? "left" : "right",
							fontWeight: "bold",
							textDecoration: "underline",
							cursor: "pointer",
						}}
						onClick={() => {
							if (chosenLanguage === "English") {
								languageToggle("Arabic");
							} else {
								languageToggle("English");
							}
						}}
					>
						{chosenLanguage === "English" ? "ARABIC" : "English"}
					</div>

					<div className='container-wrapper'>
						<h5
							className='text-center mx-auto'
							style={{
								fontWeight: "bold",
								textDecoration: "underline",
								cursor: "pointer",
								color: "darkgoldenrod",
							}}
							onClick={() => {
								setIsModalVisible2(true);
							}}
						>
							<EditOutlined />
							{chosenLanguage === "Arabic"
								? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062d\u062c\u0632"
								: "Edit Reservation"}
						</h5>

						{relocationArray1 &&
							relocationArray1.some(
								(hotel) =>
									hotel._id === hotelDetails._id &&
									hotel.belongsTo === hotelDetails.belongsTo._id,
							) && (
								<h5
									className='text-center mx-auto mt-3'
									style={{
										fontWeight: "bold",
										textDecoration: "underline",
										cursor: "pointer",
										color: "#67634c",
									}}
									onClick={() => {
										setIsModalVisible4(true);
									}}
								>
									<EditOutlined />
									{chosenLanguage === "Arabic"
										? "نقل الحجز؟"
										: "Relocate Reservation?"}
								</h5>
							)}

						<Modal
							title='Receipt Download'
							open={isModalVisible3}
							onCancel={() => setIsModalVisible3(false)}
							onOk={() => setIsModalVisible3(false)}
							footer={null}
							width='84.5%' // Set the width to 80%
							style={{
								// If Arabic, align to the left, else align to the right
								position: "absolute",
								left: chosenLanguage === "Arabic" ? "15%" : "auto",
								right: chosenLanguage === "Arabic" ? "auto" : "5%",
								top: "1%",
							}}
							zIndex={12012}
							styles={{ mask: { zIndex: 12011 } }}
							getContainer={() => document.body}
							wrapClassName='receipt-modal'
							rootClassName='receipt-modal'
						>
							<div className='text-center my-3 '>
								<button
									className='btn btn-info w-50'
									style={{ fontWeight: "bold", fontSize: "1.1rem" }}
									onClick={downloadPDF}
								>
									Print To PDF
								</button>
							</div>

							{reservation && (
								<div dir='ltr'>
									<ReceiptPDF
										ref={pdfRef}
										reservation={reservation}
										hotelDetails={hotelDetails}
										calculateReservationPeriod={calculateReservationPeriod}
										getTotalAmountPerDay={getTotalAmountPerDay}
									/>
								</div>
							)}
						</Modal>

						<Modal
							title='Ops Receipt'
							open={isModalVisible5}
							onCancel={() => setIsModalVisible5(false)}
							onOk={() => setIsModalVisible5(false)}
							footer={null}
							width='84.5%' // Set the width to 80%
							style={{
								// If Arabic, align to the left, else align to the right
								position: "absolute",
								left: chosenLanguage === "Arabic" ? "15%" : "auto",
								right: chosenLanguage === "Arabic" ? "auto" : "5%",
								top: "1%",
							}}
							zIndex={12012}
							styles={{ mask: { zIndex: 12011 } }}
							getContainer={() => document.body}
							wrapClassName='receipt-modal'
							rootClassName='receipt-modal'
						>
							<div className='text-center my-3 '>
								<button
									className='btn btn-info w-50'
									style={{ fontWeight: "bold", fontSize: "1.1rem" }}
									onClick={downloadPDF}
								>
									Print To PDF
								</button>
							</div>

							{reservation && (
								<div dir='ltr'>
									<ReceiptPDFB2B
										ref={pdfRef}
										reservation={reservation}
										hotelDetails={hotelDetails}
										calculateReservationPeriod={calculateReservationPeriod}
										getTotalAmountPerDay={getTotalAmountPerDay}
									/>
								</div>
							)}
						</Modal>
						<Modal
							title='Al Dawleya'
							open={isModalVisible6}
							onCancel={() => setIsModalVisible6(false)}
							onOk={() => setIsModalVisible6(false)}
							footer={null}
							width='84.5%'
							style={{
								position: "absolute",
								left: chosenLanguage === "Arabic" ? "15%" : "auto",
								right: chosenLanguage === "Arabic" ? "auto" : "5%",
								top: "1%",
							}}
							zIndex={12012}
							styles={{ mask: { zIndex: 12011 } }}
							getContainer={() => document.body}
							wrapClassName='receipt-modal'
							rootClassName='receipt-modal'
						>
							<div className='text-center my-3 '>
								<button
									className='btn btn-info w-50'
									style={{ fontWeight: "bold", fontSize: "1.1rem" }}
									onClick={downloadAlDawleyaPDF}
								>
									Print To PDF
								</button>
							</div>
							{reservation && (
								<div
									dir='ltr'
									style={{
										display: "flex",
										justifyContent: "center",
										width: "100%",
									}}
								>
									<AlDawleya
										ref={alDawleyaPdfRef}
										reservation={reservation}
										hotelDetails={hotelDetails}
									/>
								</div>
							)}
						</Modal>

						<Header>
							<Section>
								{/* Left side of the header */}
								<div className='row'>
									<div className='col-md-6 my-auto'>
										<div className='col-md-6 my-auto'>
											<div>
												{chosenLanguage === "Arabic"
													? "المبلغ الإجمالي"
													: "Total Amount"}
											</div>
											<h4 className='mx-2'>
												{reservation
													? formatNumber(reservation.total_amount)
													: 0}{" "}
												{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
											</h4>
										</div>
										<div className='col-md-12'>
											<h3 style={{ fontSize: "1.5rem", color: "black" }}>
												Confirmation #:{" "}
												{reservation &&
													reservation.customer_details &&
													reservation.confirmation_number}
											</h3>
											{secondaryConfirmation ? (
												<div
													style={{
														fontSize: "1.1rem",
														color: "black",
														marginTop: "4px",
													}}
												>
													Confirmation #2: {secondaryConfirmation}
												</div>
											) : null}
										</div>
									</div>

									{chosenLanguage === "Arabic" ? (
										<div className='col-md-5 text-center my-auto'>
											<button
												className='my-2'
												onClick={() => setIsModalVisible3(true)}
											>
												فاتورة رسمية
											</button>
											<button
												className='mx-2 my-2'
												onClick={() => setIsModalVisible5(true)}
											>
												Operation Order
											</button>
											{linkGenerate ? (
												<>
													<button
														onClick={() => setPaymentLinkEmailModalOpen(true)}
														style={{
															background: "darkgreen",
															border: "1px darkred solid",
														}}
													>
														Email Payment Link To The Client
													</button>
													<br />
													<div
														className='mx-2 mt-2'
														style={{ cursor: "pointer" }}
														onClick={() => {
															setLinkModalVisible(true);
														}}
													>
														Show Link <i className='fa-solid fa-eye'></i>
													</div>
												</>
											) : (
												<button
													style={{
														background: "darkred",
														border: "1px darkred solid",
													}}
													onClick={() => {
														setLinkGenerated(
															`${process.env.REACT_APP_MAIN_URL_JANNAT}/client-payment/${reservation._id}/${reservation.confirmation_number}`,
														);
													}}
												>
													Generate Payment Link
												</button>
											)}
											<button
												className='my-2'
												style={{
													background: "#0a2f63",
													border: "1px solid #0a2f63",
													color: "#ffffff",
													display: "block",
													width: "100%",
													marginTop: "10px",
												}}
												onClick={() => setIsModalVisible6(true)}
											>
												Al Dawleya
											</button>
										</div>
									) : (
										<div className='col-md-4 mx-auto text-center'>
											<button
												className='my-2'
												onClick={() => setIsModalVisible3(true)}
											>
												Invoice
											</button>
											<button
												className='mx-2'
												onClick={() => setIsModalVisible5(true)}
											>
												Operation Order
											</button>
											{linkGenerate ? (
												<>
													<button
														onClick={() => setPaymentLinkEmailModalOpen(true)}
														style={{
															background: "darkgreen",
															border: "1px darkred solid",
														}}
													>
														Email Payment Link To The Client
													</button>
													<br />
													<div
														className='mx-2 mt-2'
														style={{ cursor: "pointer" }}
														onClick={() => {
															setLinkModalVisible(true);
														}}
													>
														Show Link <i className='fa-solid fa-eye'></i>
													</div>
												</>
											) : (
												<button
													style={{
														background: "darkred",
														border: "1px darkred solid",
													}}
													onClick={() => {
														setLinkGenerated(
															`${
																process.env.REACT_APP_MAIN_URL_JANNAT
															}/client-payment/${reservation._id}/${
																reservation._id
															}/${reservation._id}/${
																hotelDetails.hotelName
															}/roomTypes/${reservation._id}/${
																reservation._id
															}/${reservation.days_of_residence}/${Number(
																reservation.total_amount,
															).toFixed(2)}`,
														);
													}}
												>
													Generate Payment Link
												</button>
											)}
											<button
												className='my-2'
												style={{
													background: "#0a2f63",
													border: "1px solid #0a2f63",
													color: "#ffffff",
													display: "block",
													width: "100%",
													marginTop: "10px",
												}}
												onClick={() => setIsModalVisible6(true)}
											>
												Al Dawleya
											</button>
										</div>
									)}

									<div className='col-md-8'></div>
									<div
										className='col-md-3 mx-auto text-center'
										style={{
											// border: "1px solid black",
											textAlign: chosenLanguage === "Arabic" ? "center" : "",
											fontSize: "1.1rem",
											fontWeight: "bold",
										}}
									>
										{chosenLanguage === "Arabic"
											? "حالة الحجز"
											: "Reservation Status"}
										<EditOutlined
											onClick={() => setIsModalVisible(true)}
											style={{
												marginLeft: "5px",
												marginRight: "5px",
												cursor: "pointer",
											}}
										/>
										<div
											className=''
											style={{
												background:
													reservation &&
													reservation.reservation_status.includes("cancelled")
														? "red"
														: reservation.reservation_status.includes(
																	"checked_out",
														    )
														  ? "darkgreen"
														  : reservation.reservation_status === "inhouse"
														    ? "#c4d3e2"
														    : "yellow",
												color:
													reservation &&
													reservation.reservation_status.includes("cancelled")
														? "white"
														: reservation.reservation_status.includes(
																	"checked_out",
														    )
														  ? "white"
														  : "black",
												textAlign: "center",
												textTransform: "uppercase",
											}}
										>
											{reservation && reservation.reservation_status}
										</div>
									</div>
								</div>
							</Section>

							<Section>
								{/* Right side of the header */}
								<div className='row'>
									<div className='col-md-12'>
										<h3 style={{ fontSize: "2.5rem" }}>
											{customerFullName || "N/A"}
										</h3>
										{customerNickName && (
											<div style={{ fontSize: "1.3rem", marginTop: "4px" }}>
												{customerNickName}
											</div>
										)}
										<div className='row  my-2'>
											<button
												className='col-md-5'
												onClick={() => setConfirmationEmailModalOpen(true)}
											>
												Email
											</button>
											<button
												className='col-md-5'
												disabled={isSendingWhatsApp}
												onClick={() => setWhatsAppModalOpen(true)}
											>
												SMS
											</button>
										</div>
									</div>
								</div>
							</Section>
						</Header>
						<HorizontalLine />
						<Content>
							<ContentSection>
								<div
									className='row'
									style={{ fontSize: "17px", fontWeight: "bold" }}
								>
									<div className='col-md-4'>
										{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Arrival"}
										<div style={{ border: "1px solid black", padding: "3px" }}>
											{formattedCheckin}
										</div>
									</div>
									<div className='col-md-4'>
										{chosenLanguage === "Arabic"
											? "تاريخ المغادرة"
											: "Check-out"}
										<div style={{ border: "1px solid black", padding: "3px" }}>
											{formattedCheckout}
										</div>
									</div>
									<div className='col-md-4 mx-auto'>
										{chosenLanguage === "Arabic"
											? "فترة الحجز"
											: "Reservation Period"}
										<div>
											{reservation
												? calculateReservationPeriod(
														reservation.checkin_date,
														reservation.checkout_date,
														chosenLanguage,
												  )
												: ""}
										</div>
									</div>
								</div>

								<div
									className='row mt-5'
									style={{ fontSize: "15px", fontWeight: "bold" }}
								>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "الجنسية" : "Nationality"}
										<div className='mx-2'>
											{reservation &&
											reservation.customer_details &&
											reservation.customer_details.nationality
												? reservation.customer_details.nationality
												: "N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "رقم جواز السفر"
											: "Passport #"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.passport) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "نسخة جواز السفر"
											: "Passport Copy #"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details.copyNumber) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "العنوان" : "Address"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details &&
												reservation.customer_details.nationality) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "الهاتف" : "Phone"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.phone) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "البريد" : "Email"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.email) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-12 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "Passport Expiry"
											: "Passport Expiry"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details &&
												reservation.customer_details.passportExpiry) ||
												"N/A"}
										</div>
									</div>
									{/* <div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "العنوان" : "Address"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details &&
												reservation.customer_details.nationality) ||
												"N/A"}
										</div>
									</div> */}
								</div>
								{reservation &&
								reservation.customer_details &&
								reservation.customer_details.carLicensePlate ? (
									<div
										className='row mt-2'
										style={{ fontSize: "15px", fontWeight: "bold" }}
									>
										<div className='col-md-4 mx-auto text-center mx-auto my-2'>
											{chosenLanguage === "Arabic"
												? "رقم لوحة السيارة"
												: "License Plate"}
											<div className='mx-2'>
												{(reservation &&
													reservation.customer_details.carLicensePlate) ||
													"N/A"}
											</div>
										</div>
										<div className='col-md-4 mx-auto text-center mx-auto my-2'>
											{chosenLanguage === "Arabic"
												? "رقم لوحة السيارة"
												: "License Plate"}
											<div className='mx-2'>
												{(reservation &&
													reservation.customer_details.carColor) ||
													"N/A"}
											</div>
										</div>
										<div className='col-md-4 mx-auto text-center mx-auto my-2'>
											{chosenLanguage === "Arabic"
												? "رقم لوحة السيارة"
												: "License Plate"}
											<div className='mx-2'>
												{(reservation &&
													reservation.customer_details.carModel) ||
													"N/A"}
											</div>
										</div>
									</div>
								) : (
									<div
										className='mt-3'
										style={{
											fontSize: "15px",
											fontWeight: "bold",
											textAlign: "center",
										}}
									>
										Guest Doesn't Have A Car!
									</div>
								)}
							</ContentSection>
							<ContentSection>
								<div
									className='row mt-5'
									style={{ fontWeight: "bold", fontSize: "16px" }}
								>
									<div className='col-md-4'>
										{chosenLanguage === "Arabic"
											? "مصدر الحجز"
											: "Booking Source"}
										<div
											className='mx-1'
											style={{ textTransform: "capitalize" }}
										>
											{reservation && reservation.booking_source}
										</div>
										<div
											className='mx-1'
											style={{ textTransform: "capitalize" }}
										>
											{reservation &&
												reservation.customer_details &&
												reservation.customer_details.reservedBy}
										</div>
									</div>

									<div className='col-md-4'>
										{chosenLanguage === "Arabic"
											? "تاريخ الحجز"
											: "Booking Date"}
										<div className='mx-1'>
											{reservation && reservation.booked_at
												? new Intl.DateTimeFormat(
														chosenLanguage === "Arabic" ? "ar-EG" : "en-GB",
														{
															year: "numeric",
															month: "2-digit",
															day: "2-digit",
														},
												  ).format(new Date(reservation.booked_at))
												: "N/A"}
										</div>
									</div>

									<div className='col-md-4 my-5 mx-auto'>
										{chosenLanguage === "Arabic"
											? "نوع الغرفة"
											: "Reserved Room Types"}
										<div className='mx-1'>
											{reservation.pickedRoomsType.map((room, index) => (
												<div key={index}>
													<div>{room.room_type}</div>
													{room.displayName}
												</div>
											))}
										</div>
									</div>

									<div className='col-md-4 my-5 mx-auto'>
										{chosenLanguage === "Arabic"
											? "عدد الزوار"
											: "Count Of Visitors"}
										<div className='mx-1'>
											{reservation && reservation.total_guests}
										</div>
									</div>

									<div className='col-md-8 my-4 mx-auto'>
										{chosenLanguage === "Arabic" ? "ملحوظة" : "Comment"}
										<div>{reservation && reservation.comment}</div>
									</div>

									<div className='col-md-12'>
										<PaymentBreakdownToggle
											type='button'
											onClick={() => setIsPaymentBreakdownVisible(true)}
										>
											<span>Payment Breakdown</span>
											<PaymentBreakdownHint>
												Click to update
											</PaymentBreakdownHint>
										</PaymentBreakdownToggle>
									</div>
									<div className='col-md-12'>
										<AssignRoomCallout
											type='button'
											onClick={handleAssignRoomClick}
											isArabic={chosenLanguage === "Arabic"}
										>
											<span>
												{chosenLanguage === "Arabic"
													? "تخصيص غرفة للضيف"
													: "Assign a room to the guest"}
											</span>
											<AssignRoomHint>
												{chosenLanguage === "Arabic"
													? "فتح شاشة التسكين"
													: "Open housing screen"}
											</AssignRoomHint>
										</AssignRoomCallout>
									</div>

									{roomTableRows && roomTableRows.length > 0 ? (
										<div className='table-responsive'>
											<table
												className='table table-bordered table-hover mx-auto'
												style={{
													textAlign: "center",
													marginTop: "10px",
													width: "90%",
												}}
											>
												<thead className='thead-light'>
													<tr>
														<th
															scope='col'
															style={{ width: "50%", fontWeight: "bold" }}
														>
															Room Type
														</th>
														<th
															scope='col'
															style={{ width: "50%", fontWeight: "bold" }}
														>
															Room Number
														</th>
													</tr>
												</thead>
												<tbody>
													{roomTableRows.map((room, index) => (
														<tr key={index}>
															<td style={{ textTransform: "capitalize" }}>
																{room.room_type || room.roomType || "N/A"}
															</td>
															<td>
																{room.room_number || room.roomNumber || "N/A"}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									) : (
										<div
											className='mx-auto'
											style={{ marginTop: "10px", fontWeight: "bold" }}
										>
											{chosenLanguage === "Arabic" ? "No Room" : "No Room"}
										</div>
									)}
								</div>
							</ContentSection>
							<ContentSection>
								<div
									className='row'
									style={{
										maxHeight: "350px",
										overflow: "auto",
										fontSize: "16px",
									}}
								>
									{reservation &&
										reservation.pickedRoomsType.map((room, index) => (
											<React.Fragment key={index}>
												{/* You can add a date here if available */}
												<div className='col-md-4 mt-2'>{/* Date */}</div>
												<div className='col-md-4 mt-2'>{room.room_type}</div>
												<div className='col-md-4 mt-2'>
													{formatNumber(room.chosenPrice * room.count)}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</div>
											</React.Fragment>
										))}
									<div className='col-md-4 mt-2'></div>
									<div className='col-md-4 mt-2'></div>
									<div className='col-md-4 mt-2 text-center pb-3'>
										<div style={{ fontWeight: "bold", fontSize: "13px" }}>
											{chosenLanguage === "Arabic"
												? "المبلغ الإجمالي"
												: "Total Amount"}
										</div>
										<div style={{ fontWeight: "bold" }}>
											{/* Calculation of total amount */}
											{reservation &&
												reservation.total_amount.toLocaleString()}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>
								</div>
								<div className='mt-5'>
									{/* Taxes & Extra Fees Row */}
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic"
												? "الضرائب والرسوم"
												: "Taxes & Extra Fees"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{0} {chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>

									{/* Commission Row */}
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic" ? "عمولة" : "Commission"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{formatNumber(computedCommission)}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>

									{/* One Night Cost Row */}
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic"
												? "سعر الليلة الواحدة"
												: "One Night Cost"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{formatNumber(oneNightCost)}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>

									{/* Final Deposit Row */}
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic"
												? "المبلغ المستحق"
												: "Final Deposit"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{formatNumber(finalDeposit)}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>
								</div>

								<div className='my-5'>
									<div className='row my-auto'>
										<div className='col-md-5 mx-auto'>
											<h4>
												{chosenLanguage === "Arabic"
													? "الإجمالى"
													: "Total Amount"}
											</h4>
										</div>
										<div className='col-md-5 mx-auto'>
											<h3>
												{formatNumber(reservation.total_amount)}{" "}
												{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
											</h3>
										</div>

										{totalPaid > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h4>
													{chosenLanguage === "Arabic"
														? "المبلغ المودع"
														: "Deposited Amount"}
												</h4>
											</div>
										) : null}

										{totalPaid > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h3>
													{formatNumber(totalPaid)}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h3>
											</div>
										) : null}

										{totalAmountValue > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h4>
													{chosenLanguage === "Arabic"
														? "المبلغ المستحق"
														: "Amount Due"}
												</h4>
											</div>
										) : null}

										{totalAmountValue > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h3 style={{ color: "darkgreen" }}>
													{formatNumber(amountDue)}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h3>
											</div>
										) : null}
									</div>
									<div className='my-3'>
										<div className='row'>
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "حالة الدفع"
														: "Payment Status"}
												</h6>
											</div>
											<div className='col-md-5 mx-auto'>
												<h5
													style={{
														color: paymentStatusColor,
														fontWeight: "bold",
													}}
												>
													{paymentStatusLabel}
												</h5>
											</div>
											{paidOffline > 0 ? (
												<div className='col-md-5 mx-auto'>
													<h5
														style={{ color: "darkgreen", fontWeight: "bold" }}
													>
														{chosenLanguage === "Arabic"
															? "Paid Offline"
															: "Paid Offline"}
													</h5>
												</div>
											) : null}
											{paidOffline > 0 ? (
												<div
													className='col-md-5 mx-auto'
													style={{ color: "darkgreen", fontWeight: "bold" }}
												>
													<h5>
														{formatNumber(paidOffline)}{" "}
														{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
													</h5>
												</div>
											) : null}

											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "معدل السعر اليومي"
														: "Daily Rate"}
												</h6>
											</div>

											<div className='col-md-5 mx-auto'>
												<h5>
													{getTotalAmountPerDay(reservation.pickedRoomsType) &&
														getTotalAmountPerDay(
															reservation.pickedRoomsType,
														).toLocaleString()}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h5>
											</div>
										</div>
									</div>

									<div className='my-3'>
										<div className='row'>
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "معدل السعر الجزري"
														: "Average Daily Root Price"}
												</h6>
											</div>
											<div className='col-md-5 mx-auto'>
												<h5>
													{getAverageRootPrice(
														reservation.pickedRoomsType,
													).toFixed(2)}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h5>
											</div>
										</div>
									</div>
									<div className='my-3'>
										<div className='row my-3'>
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "إجمالي السعر الجزري"
														: "Overall Total with Root Price"}
												</h6>
											</div>
											<div className='col-md-5 mx-auto'>
												<h5>
													{calculateOverallTotalRootPrice(
														reservation.pickedRoomsType,
													).toFixed(2)}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h5>
											</div>
										</div>
									</div>
								</div>
							</ContentSection>
						</Content>
					</div>
				</div>
			)}

			<PaymentTrigger reservation={reservation} />
		</Wrapper>
	);
};

export default MoreDetails;
