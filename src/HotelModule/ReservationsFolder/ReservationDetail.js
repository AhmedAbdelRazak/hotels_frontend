import React, {
	useEffect,
	useState,
	useRef,
	useMemo,
	useCallback,
} from "react";
import styled, { createGlobalStyle } from "styled-components";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import { isSuperAdminUser } from "../../AdminModule/utils/superUsers";
import { Spin, Modal, Select, Checkbox, Input } from "antd";
import moment from "moment";
import {
	BankOutlined,
	CalendarOutlined,
	CarOutlined,
	CheckCircleOutlined,
	CreditCardOutlined,
	DollarCircleOutlined,
	EditOutlined,
	FileTextOutlined,
	HomeOutlined,
	IdcardOutlined,
	MailOutlined,
	PhoneOutlined,
	TeamOutlined,
	UserOutlined,
} from "@ant-design/icons";
import {
	getReservationAgentWalletSnapshot,
	getHotelRooms,
	sendPaymnetLinkToTheClient,
	sendReservationConfirmationEmail,
	sendReservationConfirmationSMSManualHotel,
	sendReservationPaymentLinkSMSManualHotel,
	updatePendingConfirmationReservation,
	updateSingleReservation,
} from "../apiAdmin";
import { toast } from "react-toastify";
import { EditReservationMain } from "./EditWholeReservation/EditReservationMain";
import ReceiptPDF from "../NewReservation/ReceiptPDF";
import ReceiptPDFB2B from "../NewReservation/ReceiptPDFB2B";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";
import { relocationArray1 } from "./ReservationAssets";

const getAccountRoleNumbers = (account = {}) =>
	[
		Number(account?.role),
		...(Array.isArray(account?.roles) ? account.roles.map(Number) : []),
	].filter(Boolean);

const getAccountRoleDescriptions = (account = {}) =>
	[
		String(account?.roleDescription || "").toLowerCase(),
		...(Array.isArray(account?.roleDescriptions)
			? account.roleDescriptions.map((item) => String(item || "").toLowerCase())
			: []),
	];

const isLimitedOrderTakerAccount = (account = {}) => {
	const roleNumbers = getAccountRoleNumbers(account);
	const roleDescriptions = getAccountRoleDescriptions(account);
	const hasOrderTakingScope =
		roleNumbers.includes(7000) ||
		roleDescriptions.some((description) =>
			/(ordertaker|order taker|external agent|agent)/i.test(description),
		);
	const hasFullReservationScope =
		roleNumbers.some((role) =>
			[1000, 2000, 3000, 4000, 5000, 6000, 8000].includes(role)
		) ||
		roleDescriptions.some((description) =>
			/(manager|reception|front desk|finance|reservationemployee|reservation employee|housekeeping|house keeping)/i.test(
				description,
			),
		);
	return hasOrderTakingScope && !hasFullReservationScope;
};

const AR_LABELS = {
	guestName: "\u0627\u0633\u0645 \u0627\u0644\u0636\u064a\u0641",
	email: "\u0627\u0644\u0628\u0631\u064a\u062f",
	phone: "\u0627\u0644\u0647\u0627\u062a\u0641",
	passportNumber:
		"\u0631\u0642\u0645 \u062c\u0648\u0627\u0632 \u0627\u0644\u0633\u0641\u0631",
	emailAction: "\u0625\u064a\u0645\u064a\u0644",
	sms: "\u0631\u0633\u0627\u0644\u0629",
	editReservation:
		"\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062d\u062c\u0632",
	invoice:
		"\u0641\u0627\u062a\u0648\u0631\u0629 \u0631\u0633\u0645\u064a\u0629",
	operationOrder:
		"\u0623\u0645\u0631 \u062a\u0634\u063a\u064a\u0644",
	sendPaymentLink:
		"\u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u062f\u0641\u0639",
	showLink:
		"\u0639\u0631\u0636 \u0627\u0644\u0631\u0627\u0628\u0637",
	generatePaymentLink:
		"\u0625\u0646\u0634\u0627\u0621 \u0631\u0627\u0628\u0637 \u0627\u0644\u062f\u0641\u0639",
	relocate:
		"\u0646\u0642\u0644 \u0627\u0644\u062d\u062c\u0632",
	roomNumber:
		"\u0631\u0642\u0645 \u0627\u0644\u063a\u0631\u0641\u0629",
	roomDetails:
		"\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u063a\u0631\u0641",
	confirmationNo:
		"\u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
	currency: "\u0631\u064a\u0627\u0644",
	reservationStatus:
		"\u062d\u0627\u0644\u0629 \u0627\u0644\u062d\u062c\u0632",
	bookingSource:
		"\u0645\u0635\u062f\u0631 \u0627\u0644\u062d\u062c\u0632",
	bookingDate:
		"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062d\u062c\u0632",
	arrival:
		"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0648\u0635\u0648\u0644",
	departure:
		"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
	stayPeriod:
		"\u0641\u062a\u0631\u0629 \u0627\u0644\u062d\u062c\u0632",
	generalDetails:
		"\u062a\u0641\u0627\u0635\u064a\u0644 \u0639\u0627\u0645\u0629",
	platformConfirmation:
		"\u0631\u0642\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0645\u0646\u0635\u0629",
	roomType:
		"\u0646\u0648\u0639 \u0627\u0644\u063a\u0631\u0641\u0629",
	displayName:
		"\u0627\u0633\u0645 \u0627\u0644\u063a\u0631\u0641\u0629",
	guestCount:
		"\u0639\u062f\u062f \u0627\u0644\u0632\u0648\u0627\u0631",
	nationality:
		"\u0627\u0644\u062c\u0646\u0633\u064a\u0629",
	passportCopy:
		"\u0646\u0633\u062e\u0629 \u062c\u0648\u0627\u0632 \u0627\u0644\u0633\u0641\u0631",
	comment: "\u0645\u0644\u0627\u062d\u0638\u0629",
	rooms: "\u0627\u0644\u063a\u0631\u0641",
	housing: "\u0627\u0644\u062a\u0633\u0643\u064a\u0646",
	openHousing:
		"\u0641\u062a\u062d \u0634\u0627\u0634\u0629 \u0627\u0644\u062a\u0633\u0643\u064a\u0646",
	paymentBreakdown:
		"\u062a\u0633\u062c\u064a\u0644 \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0645\u0628\u0644\u063a",
	clickToUpdate: "\u062a\u062d\u062f\u064a\u062b",
	guestHasCar:
		"\u0644\u062f\u0649 \u0627\u0644\u0636\u064a\u0641 \u0633\u064a\u0627\u0631\u0629",
	guestNoCar:
		"\u0627\u0644\u0636\u064a\u0641 \u0644\u0627 \u064a\u0645\u0644\u0643 \u0633\u064a\u0627\u0631\u0629",
	licensePlate:
		"\u0631\u0642\u0645 \u0627\u0644\u0644\u0648\u062d\u0629",
	carColor:
		"\u0644\u0648\u0646 \u0627\u0644\u0633\u064a\u0627\u0631\u0629",
	carModel:
		"\u0646\u0648\u0639 \u0627\u0644\u0633\u064a\u0627\u0631\u0629",
	paymentSummary:
		"\u0645\u0644\u062e\u0635 \u0627\u0644\u062f\u0641\u0639",
	chargeBreakdown:
		"\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0631\u0633\u0648\u0645",
	roomCharges:
		"\u0631\u0633\u0648\u0645 \u0627\u0644\u063a\u0631\u0641",
	totalAmount:
		"\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0628\u0644\u063a",
	reservationValue:
		"\u0642\u064a\u0645\u0629 \u0627\u0644\u062d\u062c\u0632",
	taxesAndFees:
		"\u0627\u0644\u0636\u0631\u0627\u0626\u0628 \u0648\u0627\u0644\u0631\u0633\u0648\u0645",
	commission:
		"\u0639\u0645\u0648\u0644\u0629",
	paymentMethod:
		"\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639",
	companyAccount:
		"\u062d\u0633\u0627\u0628 \u0634\u0631\u0643\u0627\u062a",
	jannatBookingCompany:
		"\u0634\u0631\u0643\u0629 \u062c\u0646\u0627\u062a \u0644\u0644\u062d\u062c\u0632 \u0627\u0644\u0641\u0646\u062f\u0642\u064a",
	balanceAfterApproval:
		"\u0631\u0635\u064a\u062f \u0628\u0639\u062f \u0627\u0644\u0642\u0628\u0648\u0644",
	accept: "\u0642\u0628\u0648\u0644",
	reject: "\u0631\u0641\u0636",
	walletSnapshot:
		"\u0644\u0642\u0637\u0629 \u0645\u062d\u0641\u0638\u0629 \u0627\u0644\u0648\u0643\u064a\u0644",
	agentAccount:
		"\u062d\u0633\u0627\u0628 \u0627\u0644\u0648\u0643\u064a\u0644",
	walletBefore:
		"\u0627\u0644\u0631\u0635\u064a\u062f \u0642\u0628\u0644 \u0627\u0644\u062d\u062c\u0632",
	walletAfter:
		"\u0627\u0644\u0631\u0635\u064a\u062f \u0628\u0639\u062f \u0627\u0644\u062d\u062c\u0632",
	hotelBookingSummary:
		"\u0645\u0644\u062e\u0635 \u062a\u0634\u063a\u064a\u0644\u064a \u0644\u0644\u062d\u062c\u0632",
	capturedSnapshotAt:
		"\u0648\u0642\u062a \u062a\u062b\u0628\u064a\u062a \u0627\u0644\u0644\u0642\u0637\u0629",
	acceptedStatus:
		"\u062a\u0645 \u0627\u0644\u0642\u0628\u0648\u0644",
	rejectedStatus:
		"\u062a\u0645 \u0627\u0644\u0631\u0641\u0636",
	pendingStatus:
		"\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
	revertToPending:
		"\u0625\u0631\u062c\u0627\u0639 \u0644\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
	confirmationReason:
		"\u0633\u0628\u0628 \u0627\u0644\u0642\u0628\u0648\u0644",
	rejectionReason:
		"\u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636",
	optionalReason:
		"\u0633\u0628\u0628 \u0627\u062e\u062a\u064a\u0627\u0631\u064a",
	paidAmount:
		"\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u062f\u0641\u0648\u0639",
	totalPaid:
		"\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0641\u0648\u0639",
	paidOnline:
		"\u0645\u062f\u0641\u0648\u0639 \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u0627\u064b",
	paidOffline:
		"\u0645\u062f\u0641\u0648\u0639 \u0641\u064a \u0627\u0644\u0641\u0646\u062f\u0642",
	amountDue:
		"\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0633\u062a\u062d\u0642",
	paymentStatus:
		"\u062d\u0627\u0644\u0629 \u0627\u0644\u062f\u0641\u0639",
	financeCycle:
		"\u062f\u0648\u0631\u0629 \u0627\u0644\u062a\u0633\u0648\u064a\u0629",
	cycleClosed:
		"\u0645\u063a\u0644\u0642\u0629",
	cycleOpen:
		"\u0645\u0641\u062a\u0648\u062d\u0629",
	adjustCommission:
		"\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0639\u0645\u0648\u0644\u0629",
	commissionAmount:
		"\u0645\u0628\u0644\u063a \u0627\u0644\u0639\u0645\u0648\u0644\u0629",
	hotelCollected:
		"\u0627\u0644\u0641\u0646\u062f\u0642 \u062d\u0635\u0644 \u0627\u0644\u0645\u0628\u0644\u063a",
	pmsCollected:
		"\u0627\u0644\u0645\u0646\u0635\u0629 \u062d\u0635\u0644\u062a \u0627\u0644\u0645\u0628\u0644\u063a",
	hotelOwesPms:
		"\u0627\u0644\u0641\u0646\u062f\u0642 \u0645\u0637\u0644\u0648\u0628 \u0645\u0646\u0647 \u0639\u0645\u0648\u0644\u0629",
	pmsOwesHotel:
		"\u0627\u0644\u0645\u0646\u0635\u0629 \u0645\u0637\u0644\u0648\u0628 \u0645\u0646\u0647\u0627 \u062a\u062d\u0648\u064a\u0644 \u0644\u0644\u0641\u0646\u062f\u0642",
	commissionReceived:
		"\u062a\u0645 \u062f\u0641\u0639 \u0627\u0644\u0639\u0645\u0648\u0644\u0629",
	hotelPayoutDone:
		"\u062a\u0645 \u062a\u062d\u0648\u064a\u0644 \u062d\u0642 \u0627\u0644\u0641\u0646\u062f\u0642",
	reconciliationNotes:
		"\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0627\u0644\u062a\u0633\u0648\u064a\u0629",
	saveFinanceCycle:
		"\u062d\u0641\u0638 \u062f\u0648\u0631\u0629 \u0627\u0644\u062a\u0633\u0648\u064a\u0629",
	captured:
		"\u062a\u0645 \u0627\u0644\u062a\u062d\u0635\u064a\u0644",
	notCaptured:
		"\u063a\u064a\u0631 \u0645\u062d\u0635\u0644",
	notPaid:
		"\u063a\u064a\u0631 \u0645\u062f\u0641\u0648\u0639",
	paidOfflineStatus:
		"\u0645\u062f\u0641\u0648\u0639 \u0641\u064a \u0627\u0644\u0641\u0646\u062f\u0642",
	fullyPaid:
		"\u0645\u062f\u0641\u0648\u0639 \u0628\u0627\u0644\u0643\u0627\u0645\u0644",
	balanceDue:
		"\u0645\u062a\u0628\u0642\u064a",
	dailyRate:
		"\u0645\u0639\u062f\u0644 \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u064a\u0648\u0645\u064a",
	pricingBreakdownByDay:
		"\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u062d\u0633\u0628 \u0627\u0644\u064a\u0648\u0645",
	viewDailyPrices:
		"\u0639\u0631\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u064a\u0648\u0645\u064a\u0629",
	viewDetails:
		"\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
	dailyPrices:
		"\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u064a\u0648\u0645\u064a\u0629",
	date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
	basePrice:
		"\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0623\u0633\u0627\u0633\u064a",
	finalPrice:
		"\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064a",
	quantity: "\u0627\u0644\u0639\u062f\u062f",
	dayTotal:
		"\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u064a\u0648\u0645",
	roomTotal:
		"\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u063a\u0631\u0641\u0629",
	nights: "\u0627\u0644\u0644\u064a\u0627\u0644\u064a",
	totalAccommodationPrice:
		"\u0625\u062c\u0645\u0627\u0644\u064a \u0633\u0639\u0631 \u0627\u0644\u0625\u0642\u0627\u0645\u0629",
	grandTotal:
		"\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0643\u0644\u064a",
	clickForPricing:
		"\u0627\u0636\u063a\u0637 \u0644\u0639\u0631\u0636 \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u0642\u0627\u0645\u0629",
	noDailyPricing:
		"\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0633\u0639\u0627\u0631 \u064a\u0648\u0645\u064a\u0629 \u0645\u062d\u0641\u0648\u0638\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u062d\u062c\u0632",
	averageNight:
		"\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0644\u064a\u0644\u0629",
};

const ReservationDetailGlobalStyles = createGlobalStyle`
	.reservation-update-modal-wrap {
		overflow: hidden auto;
	}

	.reservation-update-modal-wrap .ant-modal {
		max-width: calc(100vw - 18px);
	}

	.reservation-update-modal .ant-modal-content {
		border-radius: 14px;
		overflow: hidden;
		box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
	}

	.reservation-update-modal .ant-modal-header {
		background: #f8fbff;
		border-bottom: 1px solid #d7e9fb;
		margin-bottom: 0;
		padding: 10px 18px;
	}

	.reservation-update-modal .ant-modal-title {
		color: #111827;
		font-size: 1rem;
		font-weight: 900;
		line-height: 1.2;
	}

	.reservation-update-modal .ant-modal-close {
		color: #8b1f1f;
		inset-inline-end: 12px;
		top: 8px;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.reservation-update-modal .ant-modal-close:hover {
		background: #fee2e2;
		color: #5f1212;
	}

	.reservation-update-modal .ant-modal-body {
		background: #f6f8fc;
		max-height: calc(100vh - 72px);
		overflow: auto;
		padding: 0;
	}

	.reservation-update-modal .ant-modal-footer {
		border-top: 1px solid #e2e8f0;
		padding: 10px 16px;
	}

	@media (max-width: 768px) {
		.reservation-update-modal-wrap .ant-modal {
			max-width: 100vw;
			margin: 0;
			top: 0 !important;
		}

		.reservation-update-modal .ant-modal-content {
			border-radius: 0;
			min-height: 100vh;
		}

		.reservation-update-modal .ant-modal-body {
			max-height: calc(100vh - 52px);
		}
	}
`;

const Wrapper = styled.div`
	--pms-blue: #0d6efd;
	--pms-blue-deep: #0b5ed7;
	--pms-blue-soft: #e3f2fd;
	--pms-green: #05a857;
	--pms-red: #dc3545;
	--pms-amber: #d97706;
	--pms-purple: #7c3aed;
	--pms-cyan: #0891b2;
	--pms-border: #cfe5fb;
	--pms-text: #18212f;
	--pms-muted: #64748b;
	background: #f7f8fc;
	color: var(--pms-text);
	min-height: 100%;
	margin-top: 0;
	padding: 8px;
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};

	@keyframes pms-attention-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 rgba(245, 158, 11, 0);
			transform: scale(1);
		}
		50% {
			box-shadow: 0 8px 22px rgba(245, 158, 11, 0.2);
			transform: scale(1.01);
		}
	}

	.otherContentWrapper {
		min-width: 0;
	}

	.container-wrapper > h5.text-center.mx-auto {
		display: none;
	}

	.row {
		margin-left: 0;
		margin-right: 0;
	}

	[class*="col-"] {
		min-width: 0;
	}

	h3,
	h4,
	h5,
	h6 {
		color: var(--pms-text);
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	button,
	.btn {
		border: 1px solid var(--pms-blue) !important;
		border-radius: 8px !important;
		background: var(--pms-blue) !important;
		color: #fff !important;
		font-weight: 800 !important;
		min-height: 38px;
		padding: 7px 12px !important;
		transition:
			background 0.16s ease,
			border-color 0.16s ease,
			box-shadow 0.16s ease,
			transform 0.16s ease;
	}

	button[style*="darkgreen"] {
		background: var(--pms-green) !important;
		border-color: var(--pms-green) !important;
	}

	button[style*="darkred"] {
		background: var(--pms-amber) !important;
		border-color: var(--pms-amber) !important;
	}

	button:hover,
	.btn:hover {
		background: var(--pms-blue-deep) !important;
		border-color: var(--pms-blue-deep) !important;
		box-shadow: 0 8px 18px rgba(13, 110, 253, 0.18);
		transform: translateY(-1px);
	}

	input,
	select,
	textarea,
	.form-control,
	.ant-select-selector {
		border-color: #d6e3f3 !important;
		border-radius: 8px !important;
	}

	@media (max-width: 768px) {
		padding: 0;

		button,
		.btn {
			font-size: 0.82rem !important;
			min-height: 36px;
			padding: 6px 9px !important;
		}

		h3 {
			font-size: 1.15rem !important;
		}

		h4 {
			font-size: 1rem !important;
		}
	}
`;

const Header = styled.div`
	display: grid;
	grid-template-columns: minmax(250px, 0.95fr) minmax(260px, 0.86fr) minmax(
			260px,
			0.82fr
		);
	gap: 8px;
	align-items: stretch;
	min-height: 0;
	direction: ltr;
	background: linear-gradient(135deg, #e3f2fd 0%, #f7fbff 100%);
	border: 1px solid var(--pms-border);
	border-radius: 10px;
	padding: 8px;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);

	h4,
	h3 {
		font-weight: bold;
	}

	button {
		width: auto;
		margin: 4px;
		white-space: normal;
	}

	.reservation-command-panel,
	.guest-command-panel {
		display: none;
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	}

	.reservation-command-panel {
		grid-column: 1;
		background: linear-gradient(135deg, #fff7ed 0%, #ffffff 56%);
		border-color: #fed7aa;
	}

	.guest-command-panel {
		grid-column: 2;
		background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 58%);
		border-color: #bbf7d0;
		text-align: center;
	}

	.reservation-command-panel button {
		background: var(--pms-amber) !important;
		border-color: var(--pms-amber) !important;
	}

	.reservation-command-panel button[style*="darkgreen"] {
		background: var(--pms-green) !important;
		border-color: var(--pms-green) !important;
	}

	.reservation-command-panel button[style*="darkred"] {
		background: #b91c1c !important;
		border-color: #b91c1c !important;
	}

	.guest-command-panel button:first-child {
		background: var(--pms-purple) !important;
		border-color: var(--pms-purple) !important;
	}

	.guest-command-panel button:last-child {
		background: var(--pms-cyan) !important;
		border-color: var(--pms-cyan) !important;
	}

	.reservation-command-panel > .row {
		display: grid;
		grid-template-columns: minmax(180px, 0.65fr) minmax(0, 1.35fr);
		grid-template-rows: auto auto;
		align-items: center;
		height: 100%;
		row-gap: 8px;
	}

	.reservation-command-panel > .row > div {
		width: 100%;
		max-width: 100%;
		flex: none;
	}

	.reservation-command-panel > .row > div:nth-child(1) {
		grid-column: 2;
		grid-row: 1 / 3;
		text-align: center;
	}

	.reservation-command-panel > .row > div:nth-child(2) {
		grid-column: 1;
		grid-row: 1;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-content: center;
		gap: 8px;
	}

	.reservation-command-panel > .row > div:nth-child(2) button {
		margin: 0;
		min-width: 112px;
	}

	.reservation-command-panel > .row > div:nth-child(2) button:nth-of-type(2) {
		order: -1;
	}

	.reservation-command-panel
		> .row
		> div:nth-child(2)
		button:nth-of-type(n + 3) {
		flex-basis: 100%;
		max-width: 230px;
	}

	.reservation-command-panel > .row > div:nth-child(3) {
		display: none;
	}

	.reservation-command-panel > .row > div:nth-child(4) {
		grid-column: 1;
		grid-row: 2;
	}

	.reservation-command-panel > .row > div:nth-child(4) > div {
		border-radius: 0;
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: 0.02em;
		padding: 4px 8px;
	}

	.guest-command-panel > .row {
		display: flex;
		align-items: center;
		height: 100%;
	}

	.guest-command-panel h3 {
		font-size: clamp(1.8rem, 3vw, 2.75rem) !important;
		line-height: 1.18;
		margin-bottom: 14px;
	}

	.guest-command-panel .row .row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.guest-command-panel .row .row button {
		width: 100%;
		margin: 0;
	}

	.top-guest-card,
	.top-request-card,
	.top-confirm-card {
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
		min-height: 112px;
		padding: 10px;
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	}

	.top-guest-card {
		grid-column: 1;
		background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 58%);
		border-color: #bbf7d0;
	}

	.top-request-card {
		grid-column: 2;
		background: linear-gradient(135deg, #fff7ed 0%, #ffffff 58%);
		border-color: #fed7aa;
		text-align: center;
		justify-content: center;
	}

	.top-request-card > .top-document-actions,
	.top-request-card > .top-payment-actions,
	.top-request-card > .top-status-block,
	.top-request-card > .top-relocate-button {
		display: none;
	}

	.top-confirm-card {
		grid-column: 3;
		background: linear-gradient(135deg, #f8fbff 0%, #ffffff 60%);
		border-color: #bfdbfe;
		text-align: center;
		justify-content: center;
	}

	.top-relocate-button {
		background: #475569 !important;
		border-color: #475569 !important;
		margin-top: 10px !important;
	}

	.top-card-title {
		color: var(--pms-green);
		font-size: 0.82rem;
		font-weight: 900;
		margin-bottom: 2px;
	}

	.top-guest-card .guest-name {
		font-size: clamp(1.22rem, 2vw, 1.86rem);
		line-height: 1.1;
		margin: 0 0 6px;
		text-wrap: balance;
	}

	.top-contact-stack {
		display: grid;
		gap: 3px;
		margin-top: auto;
	}

	.top-contact-row {
		display: grid;
		grid-template-columns: minmax(72px, auto) minmax(0, 1fr);
		gap: 8px;
		align-items: center;
		color: var(--pms-text);
		font-size: 0.84rem;
		font-weight: 800;
	}

	.top-contact-row span:first-child {
		color: var(--pms-muted);
		font-size: 0.8rem;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.top-ltr-value {
		direction: ltr;
		display: inline-block;
		text-align: left;
		unicode-bidi: isolate;
	}

	.top-guest-actions,
	.top-document-actions,
	.top-payment-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
	}

	.top-guest-actions {
		margin-top: 8px;
	}

	.top-guest-actions button {
		flex: 1 1 112px;
		margin: 0;
		min-height: 32px;
		padding-block: 4px !important;
	}

	.top-guest-actions button:first-child {
		background: var(--pms-purple) !important;
		border-color: var(--pms-purple) !important;
	}

	.top-guest-actions button:last-child {
		background: var(--pms-cyan) !important;
		border-color: var(--pms-cyan) !important;
	}

	.top-request-button {
		min-width: min(190px, 100%);
		background: var(--pms-amber) !important;
		border-color: var(--pms-amber) !important;
		font-size: 1rem !important;
		margin: 0 auto !important;
	}

	.top-secondary-actions {
		grid-column: 1 / -1;
		align-items: center;
		background: rgba(255, 255, 255, 0.72);
		border-color: #d9e9fb;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(230px, max-content);
		gap: 10px;
		min-height: 0;
		padding: 6px 10px;
	}

	.top-secondary-actions .top-document-actions {
		justify-content: flex-start;
	}

	.top-secondary-actions .top-payment-actions {
		justify-content: center;
		margin-top: 0;
	}

	.top-secondary-actions .top-status-block {
		align-items: center;
		background: #f8fbff;
		border: 1px solid #cfe5fb;
		border-radius: 8px;
		display: flex;
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
		gap: 10px;
		justify-content: flex-end;
		justify-self: end;
		margin-top: 0;
		min-height: 34px;
		min-width: 0;
		padding: 3px 6px;
	}

	.top-document-actions button {
		background: var(--pms-amber) !important;
		border-color: var(--pms-amber) !important;
		margin: 0;
		min-width: 118px;
		min-height: 32px;
		padding-block: 4px !important;
	}

	.top-payment-actions {
		margin-top: 10px;
	}

	.top-payment-actions button {
		background: #b91c1c !important;
		border-color: #b91c1c !important;
		margin: 0;
		min-width: 180px;
		min-height: 32px;
		padding-block: 4px !important;
	}

	.top-payment-actions button[style*="darkgreen"] {
		background: var(--pms-green) !important;
		border-color: var(--pms-green) !important;
	}

	.top-link-preview {
		align-self: center;
		color: var(--pms-blue);
		cursor: pointer;
		font-weight: 900;
		text-decoration: underline;
	}

	.top-status-block {
		margin-top: 14px;
	}

	.top-status-label {
		align-items: center;
		display: inline-flex;
		gap: 6px;
		font-weight: 900;
		font-size: 0.84rem;
		line-height: 1;
		white-space: nowrap;
	}

	.top-status-label .anticon {
		color: var(--pms-blue);
		font-size: 0.92rem;
	}

	.top-status-pill {
		align-items: center;
		border-radius: 4px;
		display: inline-flex;
		font-size: 0.78rem;
		font-weight: 900;
		justify-content: center;
		margin: 0;
		max-width: 230px;
		min-height: 26px;
		min-width: 118px;
		padding: 3px 10px;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.top-room-box {
		background: rgba(255, 255, 255, 0.72);
		border: 1px solid #d6e3f3;
		border-radius: 8px;
		cursor: pointer;
		display: grid;
		grid-template-columns: minmax(74px, 0.34fr) minmax(0, 1fr);
		gap: 10px;
		align-items: center;
		margin-bottom: 8px;
		padding: 5px;
		transition:
			border-color 0.16s ease,
			box-shadow 0.16s ease,
			transform 0.16s ease;
	}

	.top-room-box:hover,
	.top-room-box:focus-visible {
		border-color: var(--pms-blue);
		box-shadow: 0 8px 18px rgba(13, 110, 253, 0.14);
		outline: none;
		transform: translateY(-1px);
	}

	.top-room-box span {
		color: var(--pms-muted);
		font-size: 0.82rem;
		font-weight: 900;
	}

	.top-room-box strong {
		background: #ffffff;
		border: 1px solid #d6e3f3;
		border-radius: 4px;
		color: var(--pms-blue);
		min-height: 34px;
		padding: 6px 8px;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.top-confirm-label {
		color: var(--pms-muted);
		font-size: 0.88rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	.top-confirm-line {
		align-items: baseline;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
	}

	.top-confirm-number {
		font-size: clamp(1.12rem, 1.75vw, 1.56rem);
		font-weight: 950;
		line-height: 1.12;
		margin: 0;
		overflow-wrap: anywhere;
	}

	.top-amount {
		color: var(--pms-green);
		font-size: clamp(1.22rem, 2.05vw, 1.75rem);
		font-weight: 950;
	}

	.col-md-4,
	.col-md-5,
	.col-md-6,
	.col-md-8,
	.col-md-12,
	.col-md-3 {
		padding-left: 6px;
		padding-right: 6px;
	}

	@media (max-width: 992px) {
		grid-template-columns: 1fr;

		.reservation-command-panel,
		.guest-command-panel {
			grid-column: 1;
			grid-row: auto;
		}

		.top-guest-card,
		.top-request-card,
		.top-confirm-card {
			grid-column: 1;
			grid-row: auto;
			min-height: auto;
		}

		.top-secondary-actions {
			grid-column: 1;
			grid-template-columns: 1fr;
		}

		.top-secondary-actions .top-document-actions,
		.top-secondary-actions .top-payment-actions {
			justify-content: stretch;
		}

		.top-secondary-actions .top-status-block {
			justify-self: stretch;
		}
	}

	@media (max-width: 768px) {
		padding: 10px;
		gap: 10px;

		.reservation-command-panel > .row {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
		}

		.reservation-command-panel > .row > div:nth-child(1),
		.reservation-command-panel > .row > div:nth-child(2),
		.reservation-command-panel > .row > div:nth-child(4) {
			grid-column: 1 / -1;
			grid-row: auto;
		}

		.col-md-3,
		.col-md-4,
		.col-md-5,
		.col-md-6,
		.col-md-8,
		.col-md-12 {
			width: 100%;
			max-width: 100%;
			flex: none;
			padding: 0;
		}

		.col-md-8,
		.col-md-12 {
			grid-column: 1 / -1;
		}

		button {
			width: 100%;
			margin: 0;
		}

		.top-guest-actions,
		.top-document-actions,
		.top-payment-actions {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.top-payment-actions button,
		.top-link-preview {
			grid-column: 1 / -1;
			min-width: 0;
		}

		.top-room-box {
			grid-template-columns: 1fr;
		}
	}
`;

const Section = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-width: 0;
	background: rgba(255, 255, 255, 0.74);
	border: 1px solid rgba(207, 229, 251, 0.82);
	border-radius: 8px;
	padding: 12px;

	h3[style],
	h4[style] {
		color: var(--pms-text) !important;
	}
`;

const HorizontalLine = styled.hr`
	border: none;
	border-bottom: 1px solid #d9e9fb;
	margin: 12px 0;
`;

const Content = styled.div`
	display: grid;
	align-items: stretch;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr) minmax(0, 1fr);
	grid-template-areas: "payment booking guest";
	gap: 10px;
	padding: 0;
	direction: ltr;

	.content-panel {
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
		height: 100%;
		text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	}

	.payment-summary-panel {
		grid-area: payment;
	}

	.reservation-details-panel {
		grid-area: booking;
	}

	.guest-details-panel {
		grid-area: guest;
	}

	@media (max-width: 1180px) {
		grid-template-columns: 1fr 1fr;
		grid-template-areas:
			"guest booking"
			"payment payment";
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
		grid-template-areas:
			"guest"
			"booking"
			"payment";
		gap: 10px;
	}
`;

const ContentSection = styled.div`
	background: #ffffff;
	border: 1px solid var(--pms-border);
	border-radius: 10px;
	box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
	min-width: 0;
	padding: 10px;
	position: relative;
	overflow: hidden;

	&.content-panel {
		flex: initial;
		border-left: 1px solid var(--pms-border);
		border-right: 1px solid var(--pms-border);
	}

	&::before {
		content: "";
		display: block;
		height: 5px;
		inset-inline: 0;
		position: absolute;
		top: 0;
	}

	&.payment-summary-panel {
		background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 36%);
		border-color: #bbf7d0;
	}

	&.payment-summary-panel::before {
		background: var(--pms-green);
	}

	&.reservation-details-panel {
		background: linear-gradient(180deg, #fff7ed 0%, #ffffff 36%);
		border-color: #fed7aa;
	}

	&.reservation-details-panel::before {
		background: var(--pms-amber);
	}

	&.guest-details-panel {
		background: linear-gradient(180deg, #eff6ff 0%, #ffffff 34%);
		border-color: #bfdbfe;
	}

	&.guest-details-panel::before {
		background: var(--pms-blue);
	}

	.row {
		row-gap: 6px;
	}

	.col-md-4,
	.col-md-5,
	.col-md-8,
	.col-md-12 {
		padding-left: 6px;
		padding-right: 6px;
		overflow-wrap: anywhere;
	}

	div[style*="border: 1px solid black"] {
		border: 1px solid #d6e3f3 !important;
		border-radius: 8px;
		background: #f8fbff;
		color: var(--pms-text);
		font-weight: 800;
		padding: 8px !important;
	}

	.table {
		width: 100% !important;
		margin-top: 10px !important;
		border-color: #d9e9fb;
	}

	.table th {
		background: #e3f2fd;
		border-color: #d9e9fb;
		color: var(--pms-text);
	}

	.table td {
		border-color: #e6eef8;
		line-height: 1.2;
		padding: 6px 8px !important;
		vertical-align: middle;
	}

	.table th {
		line-height: 1.2;
		padding: 7px 8px !important;
	}

	&.guest-details-panel > .row,
	&.reservation-details-panel > .row,
	&.payment-summary-panel > .row,
	&.payment-summary-panel > .mt-5,
	&.payment-summary-panel > .my-5 {
		display: none;
	}

	.detail-panel-heading {
		align-items: center;
		display: flex;
		gap: 8px;
		justify-content: center;
		margin: 2px 0 8px;
		text-align: center;
	}

	.detail-panel-heading .anticon {
		color: var(--panel-accent, var(--pms-blue));
		font-size: 1.05rem;
	}

	.detail-panel-heading span:last-child {
		font-size: 1.02rem;
		font-weight: 900;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}

	.detail-grid.single {
		grid-template-columns: 1fr;
	}

	.detail-item {
		align-items: center;
		background: rgba(255, 255, 255, 0.78);
		border: 1px solid #d6e3f3;
		border-radius: 8px;
		display: grid;
		gap: 3px;
		min-width: 0;
		padding: 6px;
		text-align: center;
	}

	.detail-item.wide {
		grid-column: 1 / -1;
	}

	.detail-icon {
		align-items: center;
		background: #e3f2fd;
		border-radius: 999px;
		color: var(--pms-blue);
		display: inline-flex;
		height: 24px;
		justify-content: center;
		margin: 0 auto 1px;
		width: 24px;
	}

	.detail-label {
		color: var(--pms-muted);
		font-size: 0.74rem;
		font-weight: 900;
		line-height: 1.2;
	}

	.detail-value {
		color: var(--pms-text);
		font-size: 0.88rem;
		font-weight: 900;
		line-height: 1.28;
		overflow-wrap: anywhere;
	}

	.detail-value-ltr {
		direction: ltr;
		display: inline-block;
		text-align: center;
		unicode-bidi: isolate;
	}

	.stay-dates {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
		margin-bottom: 6px;
	}

	.stay-overview-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 6px;
		margin-bottom: 6px;
	}

	.stay-overview-row .detail-item {
		min-height: 74px;
	}

	.stay-overview-row .stay-period-card {
		margin-bottom: 0;
	}

	.stay-period-card {
		background: linear-gradient(135deg, #f8fbff, #ffffff);
		border-color: #bfdbfe;
		margin-bottom: 6px;
	}

	.guest-info-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
		margin-top: 6px;
	}

	.guest-info-grid .detail-item {
		min-height: 82px;
	}

	.guest-info-grid .detail-value {
		font-size: 0.84rem;
	}

	.guest-comment-card {
		background: linear-gradient(135deg, #eff6ff, #ffffff);
		border-color: #bfdbfe;
		margin-top: 6px;
	}

	.guest-action-comment-row {
		align-items: stretch;
		display: grid;
		gap: 6px;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		margin-top: 5px;
	}

	.guest-action-comment-row > button {
		margin: 0 !important;
		min-height: 100%;
	}

	.guest-action-comment-row .guest-comment-card {
		grid-column: auto;
		margin-top: 0;
		min-height: 58px;
	}

	.guest-room-actions-block {
		display: grid;
		gap: 5px;
		grid-column: 1 / -1;
		margin-top: 6px;
	}

	.guest-room-actions-block .middle-room-stack {
		margin: 0 auto;
		max-width: 452px;
	}

	.guest-room-actions-block .detail-item {
		gap: 2px;
		padding: 5px 7px;
	}

	.guest-room-actions-block .detail-icon {
		font-size: 0.8rem;
		height: 21px;
		margin-bottom: 0;
		width: 21px;
	}

	.guest-room-actions-block .room-type-list {
		gap: 3px;
	}

	.guest-room-actions-block .room-type-chip {
		font-size: 0.79rem;
		gap: 6px;
		padding: 4px 6px;
	}

	.guest-room-actions-block .room-type-name {
		line-height: 1.2;
	}

	.guest-room-actions-block .room-type-label {
		font-size: 0.76rem;
	}

	.guest-room-actions-block .room-quantity-pill {
		font-size: 0.72rem;
		min-width: 36px;
		padding: 1px 7px;
	}

	.booking-source-pill {
		background: #111827;
		border-radius: 4px;
		color: #fff;
		display: inline-flex;
		font-size: 0.8rem;
		font-weight: 900;
		justify-content: center;
		min-width: 86px;
		padding: 3px 8px;
		text-transform: capitalize;
	}

	.room-type-list {
		display: grid;
		gap: 5px;
		width: 100%;
	}

	.room-type-chip {
		align-items: center;
		background: #ffffff;
		border: 1px solid #d6e3f3;
		border-radius: 8px;
		color: var(--pms-text);
		display: grid;
		font-family: inherit;
		font-size: 0.84rem;
		font-weight: 900;
		gap: 8px;
		grid-template-columns: minmax(0, 1fr) auto;
		margin: 0;
		padding: 6px;
		text-align: start;
		width: 100%;
	}

	.room-type-chip.clickable {
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease,
			box-shadow 0.15s ease, transform 0.15s ease;
	}

	.room-type-chip.clickable:hover,
	.room-type-chip.clickable:focus-visible {
		background: #f8fbff;
		border-color: #93c5fd;
		box-shadow: 0 8px 18px rgba(29, 78, 216, 0.12);
		outline: none;
		transform: translateY(-1px);
	}

	.room-type-chip.single-line {
		grid-template-columns: auto minmax(0, 1fr);
		text-align: center;
	}

	.room-type-name {
		line-height: 1.28;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.room-type-chip.single-line .room-type-name {
		text-align: center;
	}

	.room-type-label {
		color: var(--pms-muted);
		font-weight: 950;
	}

	.room-quantity-pill {
		align-items: center;
		background: #fff7ed;
		border: 1px solid #fed7aa;
		border-radius: 999px;
		color: var(--pms-amber);
		display: inline-flex;
		font-size: 0.78rem;
		font-weight: 950;
		justify-content: center;
		min-width: 42px;
		padding: 2px 8px;
	}

	.middle-operation-shell {
		display: grid;
		gap: 8px;
		min-height: 0;
	}

	.middle-operation-top,
	.middle-operation-bottom {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}

	.middle-operation-bottom {
		grid-template-columns: 1fr;
	}

	.middle-operation-main {
		align-items: center;
		display: grid;
		gap: 8px;
		justify-items: center;
		min-height: 0;
		text-align: center;
	}

	.middle-room-stack {
		max-width: 380px;
		width: 100%;
	}

	.middle-comment {
		background: rgba(255, 255, 255, 0.72);
		border: 1px dashed #fdba74;
		border-radius: 8px;
		padding: 6px 8px;
	}

	.middle-actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
		margin-top: 0;
	}

	.middle-actions > button {
		margin: 0 !important;
		min-height: 42px;
	}

	.middle-actions .table-responsive {
		grid-column: 1 / -1;
	}

	.payment-summary-actions {
		display: grid;
		gap: 6px;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.payment-summary-actions > button {
		background: linear-gradient(135deg, #e0f2fe, #dbeafe) !important;
		border: 1px solid #93c5fd !important;
		box-shadow: 0 6px 14px rgba(37, 99, 235, 0.1);
		color: #1e40af !important;
		margin: 0 !important;
		min-height: 42px;
	}

	.payment-summary-actions > button:hover,
	.payment-summary-actions > button:focus-visible {
		background: linear-gradient(135deg, #dbeafe, #bfdbfe) !important;
		border-color: #60a5fa !important;
		box-shadow: 0 8px 18px rgba(37, 99, 235, 0.14);
		color: #1e3a8a !important;
		outline: none;
	}

	.payment-summary-actions > button > span:first-child {
		font-size: 0.84rem;
		font-weight: 950;
	}

	.payment-summary-actions > button > span:last-child {
		background: #ffffff;
		border: 1px solid #bfdbfe;
		color: #1d4ed8;
		font-size: 0.78rem;
		font-weight: 900;
	}

	.middle-inline-line {
		align-items: center;
		display: inline-flex;
		flex-wrap: wrap;
		gap: 4px;
		justify-content: center;
		line-height: 1.25;
		text-align: center;
	}

	.middle-inline-line .inline-label {
		color: var(--pms-muted);
		font-weight: 950;
	}

	.middle-inline-line strong {
		color: var(--pms-text);
		font-size: 0.9rem;
		font-weight: 950;
	}

	.payment-method-preview {
		background:
			linear-gradient(135deg, rgba(255, 247, 237, 0.94), rgba(255, 255, 255, 0.96)),
			repeating-linear-gradient(
				90deg,
				rgba(217, 119, 6, 0.04) 0,
				rgba(217, 119, 6, 0.04) 1px,
				transparent 1px,
				transparent 18px
			);
		border: 1px solid #fed7aa;
		border-radius: 10px;
		display: grid;
		gap: 8px;
		padding: 10px;
	}

	.payment-preview-heading {
		align-items: center;
		color: var(--pms-text);
		display: inline-flex;
		gap: 6px;
		justify-content: center;
		font-size: 0.92rem;
		font-weight: 950;
	}

	.payment-preview-heading .anticon {
		color: var(--pms-amber);
	}

	.payment-preview-body {
		align-items: center;
		display: grid;
		gap: 10px;
		grid-template-columns: minmax(0, 1fr) minmax(150px, 0.72fr);
	}

	.payment-preview-ledger {
		display: grid;
		gap: 6px;
	}

	.payment-preview-row {
		align-items: center;
		display: grid;
		gap: 8px;
		grid-template-columns: minmax(82px, 0.5fr) minmax(0, 1fr);
	}

	.payment-preview-amount {
		background: #ffffff;
		border: 1px solid #d6e3f3;
		border-radius: 5px;
		font-weight: 950;
		padding: 5px 8px;
		text-align: center;
	}

	.payment-preview-amount.negative {
		background: #fef2f2;
		border-color: #fecaca;
		color: #dc2626;
	}

	.payment-preview-amount.neutral {
		color: var(--pms-text);
	}

	.payment-preview-amount.positive {
		background: #ecfdf5;
		border-color: #bbf7d0;
		color: var(--pms-green);
	}

	.payment-preview-label {
		color: var(--pms-text);
		font-size: 0.86rem;
		font-weight: 900;
		line-height: 1.25;
	}

	.payment-preview-loading {
		align-items: center;
		display: flex;
		justify-content: center;
		min-height: 90px;
	}

	.payment-preview-account {
		background: #ffffff;
		border: 1px solid #fed7aa;
		border-radius: 8px;
		display: grid;
		gap: 5px;
		padding: 10px;
		text-align: center;
	}

	.payment-preview-account span {
		color: var(--pms-muted);
		font-size: 0.76rem;
		font-weight: 900;
	}

	.payment-preview-account strong {
		color: var(--pms-text);
		font-size: 0.9rem;
		font-weight: 950;
		line-height: 1.25;
	}

	.payment-preview-stamp {
		color: #64748b !important;
		font-size: 0.7rem !important;
	}

	.payment-preview-bottom {
		align-items: center;
		display: grid;
		gap: 8px;
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.payment-preview-decision-stack {
		display: grid;
		gap: 6px;
		min-width: 0;
	}

	.payment-preview-decision {
		align-items: center;
		background: #f8fafc;
		border: 1px solid #d6e3f3;
		border-radius: 8px;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		justify-content: center;
		min-height: 34px;
		padding: 5px 8px;
		text-align: center;
	}

	.payment-preview-decision span {
		color: var(--pms-text);
		font-size: 0.84rem;
		font-weight: 950;
	}

	.payment-preview-decision small {
		color: #475569;
		font-size: 0.72rem;
		font-weight: 850;
		line-height: 1.25;
	}

	.payment-preview-decision.accepted {
		background: #ecfdf5;
		border-color: #86efac;
	}

	.payment-preview-decision.accepted span {
		color: var(--pms-green);
	}

	.payment-preview-decision.rejected {
		background: #fef2f2;
		border-color: #fecaca;
	}

	.payment-preview-decision.rejected span {
		color: #dc2626;
	}

	.payment-preview-decision.pending {
		animation: pms-attention-pulse 1.7s ease-in-out infinite;
		background: #fff7ed;
		border-color: #fed7aa;
	}

	.payment-preview-decision.pending span {
		color: #b45309;
	}

	.payment-preview-actions {
		display: inline-grid;
		gap: 5px;
		grid-template-columns: repeat(2, minmax(54px, auto));
	}

	.payment-preview-action {
		border: 0;
		border-radius: 5px;
		color: #fff;
		cursor: pointer;
		display: inline-flex;
		font-size: 0.8rem;
		font-weight: 950;
		justify-content: center;
		padding: 5px 9px;
	}

	.payment-preview-action:disabled {
		cursor: not-allowed;
		opacity: 0.68;
	}

	.payment-preview-action.reject {
		background: #dc2626;
	}

	.payment-preview-action.accept {
		background: var(--pms-green);
	}

	.payment-preview-action.pending {
		background: #f59e0b;
		grid-column: 1 / -1;
	}

	.payment-preview-ref {
		color: var(--pms-text);
		font-size: 0.86rem;
		font-weight: 950;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.room-name-cell {
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&.payment-summary-panel {
		--panel-accent: var(--pms-green);
	}

	&.reservation-details-panel {
		--panel-accent: var(--pms-amber);
	}

	&.guest-details-panel {
		--panel-accent: #1d4ed8;
	}

	&.payment-summary-panel .detail-icon {
		background: #dcfce7;
		color: var(--pms-green);
	}

	&.reservation-details-panel .detail-icon {
		background: #ffedd5;
		color: var(--pms-amber);
	}

	&.guest-details-panel .detail-icon {
		background: linear-gradient(135deg, #dbeafe, #e0f2fe);
		border: 1px solid #93c5fd;
		color: #1e40af;
	}

	.payment-compact-shell {
		display: grid;
		gap: 7px;
	}

	.payment-status-card {
		align-items: center;
		border: 1px solid #bbf7d0;
		border-radius: 9px;
		display: grid;
		gap: 5px;
		grid-template-columns: auto minmax(0, 1fr);
		padding: 8px;
	}

	.payment-status-card .anticon {
		align-items: center;
		border-radius: 999px;
		display: inline-flex;
		font-size: 1rem;
		height: 30px;
		justify-content: center;
		width: 30px;
	}

	.payment-status-card span,
	.payment-section-label {
		color: var(--pms-muted);
		font-size: 0.72rem;
		font-weight: 950;
	}

	.payment-status-card strong {
		color: var(--pms-text);
		display: block;
		font-size: 0.98rem;
		font-weight: 950;
		line-height: 1.2;
	}

	.payment-status-card small {
		color: #475569;
		display: block;
		font-size: 0.72rem;
		font-weight: 800;
		line-height: 1.25;
	}

	.payment-status-card.success {
		background: #ecfdf5;
		border-color: #86efac;
	}

	.payment-status-card.success .anticon {
		background: #dcfce7;
		color: #047857;
	}

	.payment-status-card.warning {
		background: #fffbeb;
		border-color: #fde68a;
	}

	.payment-status-card.warning .anticon {
		background: #fef3c7;
		color: #b45309;
	}

	.payment-status-card.danger {
		background: #fff1f2;
		border-color: #fecdd3;
	}

	.payment-status-card.danger .anticon {
		background: #ffe4e6;
		color: #be123c;
	}

	.payment-room-lines {
		display: grid;
		gap: 5px;
	}

	.payment-room-line,
	.payment-total-row {
		align-items: center;
		background: rgba(255, 255, 255, 0.76);
		border: 1px solid #bbf7d0;
		border-radius: 8px;
		display: grid;
		gap: 6px;
		grid-template-columns: minmax(0, 1fr) auto;
		min-width: 0;
		padding: 7px 8px;
	}

	.payment-room-line.grouped {
		background: #ffffff;
	}

	.payment-room-line small,
	.payment-total-row small {
		color: var(--pms-muted);
		display: block;
		font-size: 0.72rem;
		font-weight: 900;
	}

	.payment-room-line strong,
	.payment-total-row strong {
		color: var(--pms-text);
		font-size: 0.9rem;
		font-weight: 950;
		overflow-wrap: anywhere;
	}

	.payment-room-line .room-charge-title {
		display: -webkit-box;
		line-height: 1.25;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}

	.payment-total-row.primary {
		background: #f0fdf4;
		border-color: #86efac;
	}

	.payment-total-row.due strong {
		color: var(--pms-green);
	}

	.payment-total-grid {
		display: grid;
		gap: 6px;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.payment-total-card {
		background: #ffffff;
		border: 1px solid #bbf7d0;
		border-radius: 8px;
		display: grid;
		gap: 3px;
		padding: 7px;
		text-align: center;
	}

	.payment-total-card span {
		color: var(--pms-muted);
		font-size: 0.72rem;
		font-weight: 950;
	}

	.payment-total-card strong {
		color: var(--pms-text);
		font-size: 0.95rem;
		font-weight: 950;
	}

	.payment-total-card.primary {
		background: #f0fdf4;
		border-color: #86efac;
	}

	.payment-total-card.paid {
		background: #eff6ff;
		border-color: #bfdbfe;
	}

	.payment-total-card.due {
		background: #f8fafc;
		border-color: #cbd5e1;
	}

	.payment-total-card.due.is-due {
		background: #fff1f2;
		border-color: #fecdd3;
	}

	.payment-total-card.due strong {
		color: var(--pms-green);
	}

	.payment-total-card.due.is-due strong {
		color: #be123c;
	}

	.finance-cycle-card {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr) auto;
		gap: 8px;
		align-items: center;
		border: 1px solid #bfdbfe;
		border-radius: 8px;
		background: #eff6ff;
		padding: 8px;
	}

	.finance-cycle-card.open {
		background: #fff7ed;
		border-color: #fed7aa;
	}

	.finance-cycle-card.closed {
		background: #ecfdf5;
		border-color: #bbf7d0;
	}

	.finance-cycle-card span,
	.finance-cycle-card small {
		display: block;
		color: var(--pms-muted);
		font-size: 0.72rem;
		font-weight: 800;
	}

	.finance-cycle-card strong {
		color: var(--pms-text);
		font-size: 0.95rem;
		font-weight: 950;
	}

	.finance-cycle-meta {
		text-align: center;
	}

	.finance-cycle-card button {
		border: 1px solid #93c5fd;
		background: #dbeafe;
		color: #1d4ed8;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 900;
		padding: 5px 10px;
		white-space: nowrap;
	}

	.payment-metrics-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}

	.payment-metric {
		align-items: center;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid #d6e3f3;
		border-radius: 8px;
		display: grid;
		gap: 3px;
		padding: 6px;
		text-align: center;
	}

	.payment-metric .anticon {
		color: var(--pms-green);
		font-size: 1rem;
	}

	.payment-metric span {
		color: var(--pms-muted);
		font-size: 0.72rem;
		font-weight: 900;
	}

	.payment-metric strong {
		color: var(--pms-text);
		font-size: 0.86rem;
		font-weight: 950;
		overflow-wrap: anywhere;
	}

	@media (max-width: 1180px) {
		&.payment-summary-panel {
			grid-column: 1 / -1;
		}

		.stay-overview-row,
		.guest-info-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 760px) {
		padding: 10px;

		&.payment-summary-panel {
			grid-column: auto;
		}

		.row {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
			font-size: 0.86rem !important;
		}

		.col-md-4,
		.col-md-5,
		.col-md-8,
		.col-md-12 {
			width: 100%;
			max-width: 100%;
			flex: none;
			padding: 0;
			margin: 0 !important;
			text-align: center;
		}

		.col-md-8,
		.col-md-12 {
			grid-column: 1 / -1;
		}

		.table-responsive {
			overflow-x: auto;
		}

		.detail-grid,
		.stay-dates,
		.stay-overview-row,
		.guest-info-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.payment-total-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.payment-total-card.primary {
			grid-column: 1 / -1;
		}

		.middle-operation-top,
		.middle-operation-bottom {
			grid-template-columns: 1fr;
		}

		.middle-actions {
			grid-template-columns: 1fr;
		}

		.guest-action-comment-row,
		.payment-summary-actions {
			grid-template-columns: 1fr;
		}

		.finance-cycle-card {
			grid-template-columns: 1fr;
			text-align: center;
		}

		.payment-preview-body,
		.payment-preview-row,
		.payment-preview-bottom {
			grid-template-columns: 1fr;
		}

		.detail-item.wide {
			grid-column: 1 / -1;
		}
	}
`;

const PaymentBreakdownToggle = styled.button`
	display: grid !important;
	align-items: center;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 8px;
	width: 100%;
	margin: 4px auto 0;
	padding: 8px 10px;
	border-radius: 8px;
	border: 1px solid #fdba74 !important;
	background: linear-gradient(135deg, #fff7ed, #ffedd5) !important;
	color: #9a3412 !important;
	font-weight: 800;
	cursor: pointer;
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};

	> span:first-child {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&:hover {
		background: linear-gradient(135deg, #ffedd5, #fed7aa) !important;
		color: #7c2d12 !important;
	}
`;

const PaymentBreakdownHint = styled.span`
	font-size: 0.85rem;
	font-weight: 600;
	color: #075985;
	background: #e0f2fe;
	padding: 2px 10px;
	border-radius: 999px;
	white-space: nowrap;
`;

const FinanceCycleEditor = styled.div`
	display: grid;
	gap: 14px;

	.cycle-pill-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px;
		border-radius: 8px;
		background: #f8fafc;
		border: 1px solid #dbeafe;
	}

	.cycle-status-pill {
		border-radius: 999px;
		padding: 4px 12px;
		font-weight: 900;
		color: #fff;
	}

	.cycle-status-pill.open {
		background: #d97706;
	}

	.cycle-status-pill.closed {
		background: #059669;
	}

	.cycle-editor-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		align-items: stretch;
	}

	label {
		display: grid;
		gap: 6px;
		font-weight: 800;
	}

	.cycle-mini-card {
		display: grid;
		align-content: center;
		gap: 4px;
		border: 1px solid #bfdbfe;
		border-radius: 8px;
		background: #eff6ff;
		padding: 10px;
		text-align: center;
	}

	.cycle-mini-card span,
	.cycle-notes span {
		color: #475569;
		font-size: 0.8rem;
		font-weight: 800;
	}

	.cycle-mini-card strong {
		font-size: 1rem;
		font-weight: 950;
	}

	.cycle-check-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.cycle-check-row .ant-checkbox-wrapper {
		margin: 0;
		border: 1px solid #cfe5fb;
		border-radius: 8px;
		padding: 10px;
		font-weight: 800;
	}

	.cycle-notes {
		margin: 0;
	}

	@media (max-width: 680px) {
		.cycle-pill-row,
		.cycle-editor-grid,
		.cycle-check-row {
			grid-template-columns: 1fr;
		}

		.cycle-pill-row {
			display: grid;
		}
	}
`;

const CycleTrackerList = styled.div`
	display: grid;
	gap: 10px;
	max-height: min(62vh, 560px);
	overflow: auto;

	.cycle-tracker-row {
		position: relative;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 10px;
		padding: 10px 12px;
		border: 1px solid #d7e8fb;
		border-radius: 8px;
		background: #f8fbff;
	}

	.cycle-tracker-dot {
		width: 12px;
		height: 12px;
		margin-top: 5px;
		border-radius: 999px;
		background: #1677ff;
		box-shadow: 0 0 0 4px #dbeafe;
	}

	strong,
	span,
	small {
		display: block;
	}

	strong {
		color: #0f2742;
		font-weight: 950;
	}

	span {
		margin-top: 2px;
		color: #475569;
		font-size: 0.88rem;
		font-weight: 700;
	}

	small {
		margin-top: 4px;
		color: #64748b;
		font-weight: 700;
	}
`;

const PricingBreakdownToggle = styled(PaymentBreakdownToggle)`
	border-color: #93c5fd !important;
	background: linear-gradient(135deg, #eff6ff, #dbeafe) !important;
	color: #1d4ed8 !important;

	&:hover {
		background: linear-gradient(135deg, #dbeafe, #bfdbfe) !important;
		color: #1e40af !important;
	}
`;

const PricingBreakdownModalContent = styled.div`
	--pms-text: #18212f;
	--pms-muted: #64748b;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	display: grid;
	gap: 10px;
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};

	.detail-value-ltr {
		direction: ltr;
		display: inline-block;
		text-align: center;
		unicode-bidi: isolate;
	}

	.pricing-summary-row {
		display: grid;
		gap: 8px;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.pricing-summary-card,
	.pricing-section-card {
		background: #f8fbff;
		border: 1px solid #bfdbfe;
		border-radius: 10px;
	}

	.pricing-summary-card {
		padding: 8px 10px;
		text-align: center;
	}

	.pricing-summary-card span,
	.pricing-section-title small,
	.pricing-day-table th,
	.pricing-empty {
		color: var(--pms-muted);
		font-size: 0.75rem;
		font-weight: 900;
	}

	.pricing-summary-card strong {
		color: var(--pms-text);
		display: block;
		font-size: 1rem;
		font-weight: 950;
		line-height: 1.2;
		margin-top: 2px;
	}

	.pricing-section-card {
		overflow: hidden;
	}

	.pricing-section-title {
		align-items: center;
		background: linear-gradient(135deg, #eff6ff, #f8fbff);
		display: grid;
		gap: 6px;
		grid-template-columns: minmax(0, 1fr) auto;
		padding: 8px 10px;
	}

	.pricing-section-title strong {
		color: var(--pms-text);
		font-size: 0.9rem;
		font-weight: 950;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pricing-count-pill {
		background: #dbeafe;
		border: 1px solid #93c5fd;
		border-radius: 999px;
		color: #1d4ed8;
		font-size: 0.78rem;
		font-weight: 950;
		padding: 3px 9px;
		white-space: nowrap;
	}

	.pricing-day-table-wrap {
		overflow-x: auto;
	}

	.pricing-day-table {
		border-collapse: collapse;
		margin: 0;
		min-width: 620px;
		width: 100%;
	}

	.pricing-day-table th,
	.pricing-day-table td {
		border-top: 1px solid #e0ecfa;
		padding: 6px 8px;
		text-align: center;
		vertical-align: middle;
		white-space: nowrap;
	}

	.pricing-day-table td {
		color: var(--pms-text);
		font-size: 0.84rem;
		font-weight: 800;
	}

	.pricing-day-table tfoot td {
		background: #ecfdf5;
		border-top-color: #86efac;
		font-weight: 950;
	}

	.pricing-empty {
		background: #fff7ed;
		border: 1px solid #fed7aa;
		border-radius: 10px;
		padding: 12px;
		text-align: center;
	}

	@media (max-width: 640px) {
		.pricing-summary-row {
			grid-template-columns: 1fr;
		}

		.pricing-section-title {
			grid-template-columns: 1fr;
			text-align: center;
		}
	}
`;

const AssignRoomCallout = styled.button`
	display: grid !important;
	align-items: center;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 8px;
	width: 100%;
	margin: 0 auto 6px;
	padding: 8px 10px;
	border-radius: 10px;
	border: 1px solid #bae6fd !important;
	background: linear-gradient(135deg, #f0f9ff, #e0f2fe) !important;
	color: #075985 !important;
	font-weight: 700;
	cursor: pointer;
	box-shadow: 0 6px 14px rgba(31, 111, 67, 0.12);
	transition: transform 0.15s ease, box-shadow 0.15s ease,
		background 0.15s ease;
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};

	> span:first-child {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 10px 18px rgba(7, 89, 133, 0.16);
		background: linear-gradient(135deg, #e0f2fe, #bae6fd) !important;
		color: #075985 !important;
	}

	@media (max-width: 540px) {
		display: grid;
		gap: 8px;
		text-align: center;
	}
`;

const AssignRoomHint = styled.span`
	font-size: 0.85rem;
	font-weight: 600;
	color: #075985;
	background: #e0f2fe;
	padding: 2px 10px;
	border-radius: 999px;
	white-space: nowrap;
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

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");
const formatPhoneForDisplay = (raw) => {
	const value = String(raw || "").trim();
	if (!value) return "N/A";
	if (value.includes("+") && !value.startsWith("+")) {
		return `+${value.replace(/\+/g, "").trim()}`;
	}
	if (value.endsWith("+")) return `+${value.slice(0, -1)}`;
	return value;
};
const formatLeadingCapital = (value) => {
	const text = String(value || "").trim();
	if (!text) return "N/A";
	return text.charAt(0).toUpperCase() + text.slice(1);
};
const normalizeRoomKey = (value) =>
	String(value || "")
		.trim()
		.toLowerCase();
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

const resolveId = (value) => {
	if (!value) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (typeof value === "object") return value._id || value.id || "";
	return "";
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
		key: "paid_to_hotel",
		label: "Paid To Hotel",
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

const resolveBreakdownNumber = (value, normalizer) => {
	if (typeof normalizer === "function") {
		return normalizer(value, 0);
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeNumericInput = (value) => {
	const raw = String(value ?? "");
	if (!raw) return "";
	const arabicDigits = {
		"٠": "0",
		"١": "1",
		"٢": "2",
		"٣": "3",
		"٤": "4",
		"٥": "5",
		"٦": "6",
		"٧": "7",
		"٨": "8",
		"٩": "9",
		"۰": "0",
		"۱": "1",
		"۲": "2",
		"۳": "3",
		"۴": "4",
		"۵": "5",
		"۶": "6",
		"۷": "7",
		"۸": "8",
		"۹": "9",
	};
	const normalizedDigits = raw.replace(
		/[٠-٩۰-۹]/g,
		(d) => arabicDigits[d] || d,
	);
	return normalizedDigits.replace(/[^\d.,-]/g, "");
};

const buildPaymentBreakdown = (breakdown, normalizer) => ({
	paid_online_via_link: resolveBreakdownNumber(
		breakdown?.paid_online_via_link,
		normalizer,
	),
	paid_online_via_instapay: resolveBreakdownNumber(
		breakdown?.paid_online_via_instapay,
		normalizer,
	),
	paid_no_show: resolveBreakdownNumber(breakdown?.paid_no_show, normalizer),
	paid_at_hotel_cash: resolveBreakdownNumber(
		breakdown?.paid_at_hotel_cash,
		normalizer,
	),
	paid_at_hotel_card: resolveBreakdownNumber(
		breakdown?.paid_at_hotel_card,
		normalizer,
	),
	paid_to_hotel: resolveBreakdownNumber(
		breakdown?.paid_to_hotel ?? breakdown?.paid_to_zad,
		normalizer,
	),
	paid_online_jannatbooking: resolveBreakdownNumber(
		breakdown?.paid_online_jannatbooking,
		normalizer,
	),
	paid_online_other_platforms: resolveBreakdownNumber(
		breakdown?.paid_online_other_platforms,
		normalizer,
	),
	payment_comments:
		typeof breakdown?.payment_comments === "string"
			? breakdown.payment_comments
			: "",
});

const getPaymentBreakdownTotals = (breakdown, normalizer) =>
	paymentBreakdownFields.reduce(
		(acc, field) => {
			const value = resolveBreakdownNumber(breakdown?.[field.key], normalizer);
			acc.total += value;
			if (field.group === "offline") acc.offline += value;
			else acc.online += value;
			return acc;
		},
		{ total: 0, online: 0, offline: 0 },
	);

const ReservationDetail = ({ reservation, setReservation, hotelDetails }) => {
	const pdfRef = useRef(null);
	// eslint-disable-next-line
	const [loading, setLoading] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isModalVisible2, setIsModalVisible2] = useState(false);
	const [isModalVisible3, setIsModalVisible3] = useState(false); // Receipt (ReceiptPDF)
	const [isModalVisible5, setIsModalVisible5] = useState(false); // Ops Receipt (ReceiptPDFB2B)
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
	const [roomListModalOpen, setRoomListModalOpen] = useState(false);
	const [roomTypePricingModalOpen, setRoomTypePricingModalOpen] =
		useState(false);
	const [pricingBreakdownModalOpen, setPricingBreakdownModalOpen] =
		useState(false);
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
	const [financeCycleModalOpen, setFinanceCycleModalOpen] = useState(false);
	const [cycleTrackerModalOpen, setCycleTrackerModalOpen] = useState(false);
	const [financeCycleDraft, setFinanceCycleDraft] = useState({
		commission: reservation?.commission || 0,
		commissionPaid: !!reservation?.commissionPaid,
		moneyTransferredToHotel: !!reservation?.moneyTransferredToHotel,
		notes: reservation?.financial_cycle?.notes || "",
	});
	const [isSavingPaymentBreakdown, setIsSavingPaymentBreakdown] =
		useState(false);
	const [isSavingFinanceCycle, setIsSavingFinanceCycle] = useState(false);
	const [editModalDirty, setEditModalDirty] = useState(false);
	const editModalSnapshotRef = useRef("");
	const paymentBreakdownRef = useRef(reservation?.paid_amount_breakdown);
	const reservationRef = useRef(reservation);
	const [agentSnapshotState, setAgentSnapshotState] = useState({
		loading: false,
		isAgentReservation: false,
		snapshot: null,
	});
	const [pendingDecisionLoading, setPendingDecisionLoading] = useState(false);
	const statusModalSnapshotRef = useRef({
		selectedStatus: "",
		sendEmail: false,
	});

	// eslint-disable-next-line
	const [selectedStatus, setSelectedStatus] = useState("");
	const [linkGenerate, setLinkGenerated] = useState("");

	const { chosenLanguage } = useCartContext();

	// eslint-disable-next-line
	const { user, token } = isAuthenticated();
	const limitedOrderTakerAccount = isLimitedOrderTakerAccount(user);
	const canFullManageReservation =
		isSuperAdminUser(user) || !limitedOrderTakerAccount;
	const activeRoleNumbers = getAccountRoleNumbers(user);
	const activeRoleDescriptions = getAccountRoleDescriptions(user);
	const canSeeReservationTracker =
		user?.activeUser !== false &&
		(isSuperAdminUser(user) ||
			activeRoleNumbers.some((role) => [1000, 2000, 6000, 8000].includes(role)) ||
			activeRoleDescriptions.some((role) =>
				["hotelmanager", "finance", "reservationemployee"].includes(role),
			));

	const normalizeNumber = useCallback((value, fallback = 0) => {
		if (value === null || value === undefined) return fallback;
		if (typeof value === "number") {
			return Number.isFinite(value) ? value : fallback;
		}
		const cleaned = normalizeNumericInput(value);
		if (!cleaned) return fallback;
		const normalized =
			cleaned.includes(",") && !cleaned.includes(".")
				? cleaned.replace(/,/g, ".")
				: cleaned.replace(/,/g, "");
		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : fallback;
	}, []);

	const formatMoney = useCallback(
		(value) => normalizeNumber(value, 0).toLocaleString(),
		[normalizeNumber],
	);

	const confirmDiscardChanges = useCallback(
		(onDiscard) => {
			Modal.confirm({
				title:
					chosenLanguage === "Arabic"
						? "تغييرات غير محفوظة"
						: "Unsaved changes",
				content:
					chosenLanguage === "Arabic"
						? "لديك تغييرات غير محفوظة. يرجى الضغط على زر التحديث داخل النافذة لحفظ التغييرات."
						: "You have unsaved changes. Please click the update button inside the modal to save them.",
				okText: chosenLanguage === "Arabic" ? "إغلاق بدون حفظ" : "Discard",
				cancelText:
					chosenLanguage === "Arabic" ? "متابعة التعديل" : "Keep Editing",
				centered: true,
				zIndex: 2000,
				maskClosable: false,
				onOk: () => {
					if (typeof onDiscard === "function") onDiscard();
				},
			});
		},
		[chosenLanguage],
	);

	const restrictedCashUserId = "6969d80da28c78c6280171df";
	const isRestrictedCashUser = user?._id === restrictedCashUserId;
	const existingCashValue = normalizeNumber(
		reservation?.paid_amount_breakdown?.paid_at_hotel_cash,
		0,
	);

	useEffect(() => {
		paymentBreakdownRef.current = reservation?.paid_amount_breakdown;
	}, [reservation?.paid_amount_breakdown]);

	useEffect(() => {
		if (!isPaymentBreakdownVisible) return;
		setPaymentBreakdownDraft(
			buildPaymentBreakdown(
				paymentBreakdownRef.current,
				normalizeNumber,
			),
		);
	}, [
		isPaymentBreakdownVisible,
		reservation?._id,
		reservation?.confirmation_number,
		normalizeNumber,
	]);

	useEffect(() => {
		if (!financeCycleModalOpen) return;
		setFinanceCycleDraft({
			commission: reservation?.commission || 0,
			commissionPaid: !!reservation?.commissionPaid,
			moneyTransferredToHotel: !!reservation?.moneyTransferredToHotel,
			notes: reservation?.financial_cycle?.notes || "",
		});
	}, [
		financeCycleModalOpen,
		reservation?.commission,
		reservation?.commissionPaid,
		reservation?.moneyTransferredToHotel,
		reservation?.financial_cycle?.notes,
	]);

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

	useEffect(() => {
		reservationRef.current = reservation;
	}, [reservation]);

	useEffect(() => {
		if (!reservation?._id || !user?._id || !canSeeReservationTracker) {
			setAgentSnapshotState({
				loading: false,
				isAgentReservation: false,
				snapshot: null,
			});
			return;
		}

		if (reservation?.agentWalletSnapshot?.captured) {
			setAgentSnapshotState({
				loading: false,
				isAgentReservation: true,
				snapshot: reservation.agentWalletSnapshot,
			});
			return;
		}

		let mounted = true;
		setAgentSnapshotState((prev) => ({ ...prev, loading: true }));
		getReservationAgentWalletSnapshot({
			reservationId: reservation._id,
			userId: user._id,
		}).then((response) => {
			if (!mounted) return;
			if (!response || response.error) {
				setAgentSnapshotState({
					loading: false,
					isAgentReservation: false,
					snapshot: null,
				});
				return;
			}
			setAgentSnapshotState({
				loading: false,
				isAgentReservation: !!response.isAgentReservation,
				snapshot: response.snapshot || null,
			});
		});

		return () => {
			mounted = false;
		};
	}, [
		canSeeReservationTracker,
		reservation?._id,
		reservation?.agentWalletSnapshot,
		user?._id,
	]);

	useEffect(() => {
		if (!isModalVisible2) return;
		editModalSnapshotRef.current = JSON.stringify(reservationRef.current || {});
		setEditModalDirty(false);
	}, [isModalVisible2]);

	useEffect(() => {
		if (!isModalVisible2) return;
		const snapshot = JSON.stringify(reservation || {});
		if (snapshot !== editModalSnapshotRef.current) {
			setEditModalDirty(true);
		}
	}, [reservation, isModalVisible2]);

	const summarizePayment = useCallback(
		(reservationData, paymentOverride = "") => {
			const paymentModeRaw =
				(paymentOverride ||
					reservationData?.payment ||
					reservationData?.payment_status ||
					reservationData?.financeStatus ||
					"") + "";
			const paymentMode = paymentModeRaw.toLowerCase().trim();
			const pd = reservationData?.paypal_details || {};
			const legacyCaptured = !!reservationData?.payment_details?.captured;
			const payOffline =
				normalizeNumber(
					reservationData?.payment_details?.onsite_paid_amount,
					0,
				) > 0 || paymentMode === "paid offline";
			const breakdown = reservationData?.paid_amount_breakdown || {};
			const breakdownCaptured = Object.keys(breakdown).some((key) => {
				if (key === "payment_comments") return false;
				return normalizeNumber(breakdown[key], 0) > 0;
			});
			const capturedTotals = [
				pd?.captured_total_sar,
				pd?.captured_total_usd,
				pd?.captured_total,
			]
				.map((value) => normalizeNumber(value, 0))
				.filter((value) => value > 0);
			const initialCompleted =
				(pd?.initial?.capture_status || pd?.initial?.status || "")
					.toUpperCase()
					.trim() === "COMPLETED";
			const anyMitCompleted =
				Array.isArray(pd?.mit) &&
				pd.mit.some(
					(c) =>
						(c?.capture_status || c?.status || "")
							.toUpperCase()
							.trim() === "COMPLETED",
				);
			const anyCapturesCompleted =
				Array.isArray(pd?.captures) &&
				pd.captures.some(
					(c) =>
						(c?.capture_status || c?.status || "")
							.toUpperCase()
							.trim() === "COMPLETED",
				);

			const isCaptured =
				legacyCaptured ||
				capturedTotals.length > 0 ||
				initialCompleted ||
				anyMitCompleted ||
				anyCapturesCompleted ||
				paymentMode === "paid online" ||
				paymentMode === "captured" ||
				paymentMode === "credit/ debit" ||
				paymentMode === "credit/debit" ||
				breakdownCaptured;

			const isNotPaid =
				paymentMode === "not paid" && !isCaptured && !payOffline;

			let status = "Not Captured";
			if (isCaptured) status = "Captured";
			else if (payOffline) status = "Paid Offline";
			else if (isNotPaid) status = "Not Paid";

			return {
				status,
				isCaptured,
				paidOffline: payOffline,
				isNotPaid,
				paymentMode,
			};
		},
		[normalizeNumber],
	);

	const getReservationRoomIds = useCallback((roomIdValue) => {
		if (!Array.isArray(roomIdValue)) return [];
		return roomIdValue
			.map((room) => {
				if (!room) return null;
				if (typeof room === "string") return room;
				if (typeof room === "object" && room._id) return room._id;
				return room;
			})
			.filter(Boolean)
			.map((id) => String(id));
	}, []);

	const getTotalAmountPerDay = (pickedRoomsType) => {
		return pickedRoomsType.reduce((total, room) => {
			return total + room.chosenPrice * room.count;
		}, 0);
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

	// eslint-disable-next-line
	const daysOfResidence = calculateDaysBetweenDates(
		reservation.checkin_date,
		reservation.checkout_date,
	);

	const paymentSummary = useMemo(
		() => summarizePayment(reservation),
		[reservation, summarizePayment],
	);
	const totalAmountValue = normalizeNumber(reservation?.total_amount, 0);
	const breakdownTotalsFromReservation = useMemo(
		() =>
			getPaymentBreakdownTotals(
				reservation?.paid_amount_breakdown,
				normalizeNumber,
			),
		[reservation?.paid_amount_breakdown, normalizeNumber],
	);
	const hasBreakdownValues = breakdownTotalsFromReservation.total > 0;
	const paidOnline = hasBreakdownValues
		? breakdownTotalsFromReservation.online
		: normalizeNumber(reservation?.paid_amount, 0);
	const paidOffline = hasBreakdownValues
		? breakdownTotalsFromReservation.offline
		: normalizeNumber(reservation?.payment_details?.onsite_paid_amount, 0);
	const totalPaid = hasBreakdownValues
		? breakdownTotalsFromReservation.total
		: paidOnline + paidOffline;
	const assumePaidInFull = paymentSummary.isCaptured && totalPaid === 0;
	const amountDue = assumePaidInFull
		? 0
		: Math.max(totalAmountValue - totalPaid, 0);
	const displayedTotalPaid = assumePaidInFull ? totalAmountValue : totalPaid;
	const breakdownRemainingAmount = Math.max(
		totalAmountValue - breakdownTotalsFromReservation.total,
		0,
	);
	const isCashLocked =
		isRestrictedCashUser &&
		existingCashValue > 0 &&
		breakdownRemainingAmount <= 0;
	const displayPaymentLabel =
		reservation?.payment ||
		reservation?.payment_status ||
		reservation?.financeStatus ||
		"";
	const paymentStatusLabel = useMemo(() => {
		if (chosenLanguage !== "Arabic") return paymentSummary.status;
		switch (paymentSummary.status) {
			case "Captured":
				return AR_LABELS.captured;
			case "Paid Offline":
				return AR_LABELS.paidOfflineStatus;
			case "Not Paid":
				return AR_LABELS.notPaid;
			default:
				return AR_LABELS.notCaptured;
		}
	}, [chosenLanguage, paymentSummary.status]);
	const paymentStatusTone = useMemo(() => {
		if (
			paymentSummary.status === "Captured" ||
			paymentSummary.status === "Paid Offline"
		) {
			return "success";
		}
		if (paymentSummary.status === "Not Paid") return "danger";
		return "warning";
	}, [paymentSummary.status]);
	const paymentStatusHint = useMemo(() => {
		if (chosenLanguage === "Arabic") {
			switch (paymentSummary.status) {
				case "Captured":
					return "\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u062f\u0641\u0639 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062d\u062c\u0632";
				case "Paid Offline":
					return "\u0627\u0644\u062f\u0641\u0639 \u0645\u0633\u062c\u0644 \u0641\u064a \u0627\u0644\u0641\u0646\u062f\u0642";
				case "Not Paid":
					return "\u0644\u0627 \u064a\u0648\u062c\u062f \u062f\u0641\u0639 \u0645\u0633\u062c\u0644";
				default:
					return "\u0627\u0644\u062f\u0641\u0639 \u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u0635\u064a\u0644\u0647 \u0628\u0639\u062f";
			}
		}
		switch (paymentSummary.status) {
			case "Captured":
				return "A payment was recorded against this reservation";
			case "Paid Offline":
				return "The hotel recorded an onsite payment";
			case "Not Paid":
				return "No payment is recorded yet";
			default:
				return "Payment exists but has not been captured";
		}
	}, [chosenLanguage, paymentSummary.status]);
	const breakdownDraftTotals = useMemo(
		() => getPaymentBreakdownTotals(paymentBreakdownDraft, normalizeNumber),
		[paymentBreakdownDraft, normalizeNumber],
	);
	const remainingPaymentAmount = Math.max(
		totalAmountValue - breakdownDraftTotals.total,
		0,
	);
	const roomCommissionEstimate = useMemo(() => {
		return (reservation?.pickedRoomsType || []).reduce((total, room) => {
			const count = normalizeNumber(room?.count, 1);
			const pricingRows = Array.isArray(room?.pricingByDay)
				? room.pricingByDay
				: [];
			const dayCommission = pricingRows.reduce((sum, day) => {
				const finalPrice = normalizeNumber(
					day?.totalPriceWithCommission ??
						day?.price ??
						day?.chosenPrice ??
						room?.chosenPrice,
					0,
				);
				const rootPrice = normalizeNumber(
					day?.rootPrice ?? day?.totalPriceWithoutCommission ?? finalPrice,
					finalPrice,
				);
				return sum + Math.max(finalPrice - rootPrice, 0);
			}, 0);
			return total + dayCommission * count;
		}, 0);
	}, [reservation?.pickedRoomsType, normalizeNumber]);
	const commissionAmount = normalizeNumber(
		reservation?.commission ||
			reservation?.financial_cycle?.commissionAmount ||
			roomCommissionEstimate,
		0,
	);
	const pmsCollectedAmount = useMemo(() => {
		const breakdown = reservation?.paid_amount_breakdown || {};
		return [
			"paid_online_via_link",
			"paid_online_via_instapay",
			"paid_no_show",
			"paid_online_jannatbooking",
			"paid_online_other_platforms",
		].reduce((sum, key) => sum + normalizeNumber(breakdown?.[key], 0), 0);
	}, [reservation?.paid_amount_breakdown, normalizeNumber]);
	const hotelCollectedAmount = useMemo(() => {
		const breakdown = reservation?.paid_amount_breakdown || {};
		return ["paid_at_hotel_cash", "paid_at_hotel_card"].reduce(
			(sum, key) => sum + normalizeNumber(breakdown?.[key], 0),
			0,
		);
	}, [reservation?.paid_amount_breakdown, normalizeNumber]);
	const financeCycleSummary = useMemo(() => {
		let collectionModel =
			reservation?.financial_cycle?.collectionModel || "pending";
		if (pmsCollectedAmount > 0 && hotelCollectedAmount > 0) {
			collectionModel = "mixed";
		} else if (pmsCollectedAmount > 0) {
			collectionModel = "pms_collected";
		} else if (hotelCollectedAmount > 0 || paymentSummary.paidOffline) {
			collectionModel = "hotel_collected";
		}
		const hotelPayoutDue =
			collectionModel === "pms_collected" || collectionModel === "mixed"
				? Math.max(totalAmountValue - commissionAmount, 0)
				: 0;
		const commissionDueToPms =
			collectionModel === "hotel_collected" || collectionModel === "mixed"
				? commissionAmount
				: 0;
		const commissionReviewed =
			reservation?.financial_cycle?.commissionAssigned === true ||
			reservation?.commissionData?.assigned === true ||
			Boolean(String(reservation?.commissionStatus || "").trim()) ||
			commissionAmount > 0;
		const commissionSideClosed =
			!!reservation?.commissionPaid || (commissionReviewed && commissionAmount <= 0);
		const isClosed =
			collectionModel === "pms_collected"
				? !!reservation?.moneyTransferredToHotel
				: collectionModel === "hotel_collected"
				  ? commissionSideClosed
				  : collectionModel === "mixed"
				    ? !!reservation?.moneyTransferredToHotel &&
				      commissionSideClosed
				    : reservation?.financial_cycle?.status === "closed";
		return {
			collectionModel,
			isClosed,
			statusLabel:
				chosenLanguage === "Arabic"
					? isClosed
						? AR_LABELS.cycleClosed
						: AR_LABELS.cycleOpen
					: isClosed
					  ? "Closed"
					  : "Open",
			collectionLabel:
				chosenLanguage === "Arabic"
					? collectionModel === "pms_collected"
						? AR_LABELS.pmsCollected
						: collectionModel === "hotel_collected"
						  ? AR_LABELS.hotelCollected
						  : collectionModel === "mixed"
						    ? "\u062a\u062d\u0635\u064a\u0644 \u0645\u0634\u062a\u0631\u0643"
						    : "\u0642\u064a\u062f \u0627\u0644\u062a\u062d\u062f\u064a\u062f"
					: collectionModel === "pms_collected"
					  ? "PMS collected"
					  : collectionModel === "hotel_collected"
					    ? "Hotel collected"
					    : collectionModel === "mixed"
					      ? "Mixed collection"
					      : "Pending",
			actionLabel:
				chosenLanguage === "Arabic"
					? collectionModel === "pms_collected"
						? AR_LABELS.pmsOwesHotel
						: collectionModel === "hotel_collected"
						  ? AR_LABELS.hotelOwesPms
						  : collectionModel === "mixed"
						    ? "\u064a\u062a\u0637\u0644\u0628 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0637\u0631\u0641\u064a\u0646"
						    : "\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0633\u0648\u064a\u0629 \u0628\u0639\u062f"
					: collectionModel === "pms_collected"
					  ? "PMS owes hotel"
					  : collectionModel === "hotel_collected"
					    ? "Hotel owes PMS"
					    : collectionModel === "mixed"
					      ? "Both sides need review"
					      : "No cycle yet",
			hotelPayoutDue,
			commissionDueToPms,
		};
	}, [
		reservation?.financial_cycle?.collectionModel,
		reservation?.financial_cycle?.commissionAssigned,
		reservation?.financial_cycle?.status,
		reservation?.commissionData?.assigned,
		reservation?.commissionStatus,
		reservation?.moneyTransferredToHotel,
		reservation?.commissionPaid,
		pmsCollectedAmount,
		hotelCollectedAmount,
		paymentSummary.paidOffline,
		totalAmountValue,
		commissionAmount,
		chosenLanguage,
	]);
	const canManageFinanceCycle =
		canFullManageReservation &&
		user?.activeUser !== false &&
		canSeeReservationTracker;
	const agentWalletSnapshot = useMemo(() => {
		if (reservation?.agentWalletSnapshot?.captured) {
			return reservation.agentWalletSnapshot;
		}
		return agentSnapshotState.snapshot;
	}, [agentSnapshotState.snapshot, reservation?.agentWalletSnapshot]);
	const hasAgentWalletSnapshot = !!agentWalletSnapshot?.captured;
	const isAgentReservationPreview =
		hasAgentWalletSnapshot || !!agentSnapshotState.isAgentReservation;
	const pendingWorkflowStatus = String(
		reservation?.pendingConfirmation?.status ||
			reservation?.reservation_status ||
			reservation?.state ||
			"",
	).toLowerCase();
	const newProcessReservation = useMemo(() => {
		const processDate = reservation?.booked_at || reservation?.createdAt;
		if (!processDate) return false;
		const parsed = new Date(processDate);
		return (
			!Number.isNaN(parsed.getTime()) &&
			parsed >= new Date("2026-05-08T00:00:00.000Z")
		);
	}, [reservation?.booked_at, reservation?.createdAt]);
	const pendingDecisionTone = /reject/.test(pendingWorkflowStatus)
		? "rejected"
		: /confirm/.test(pendingWorkflowStatus)
		? "accepted"
		: /pending/.test(pendingWorkflowStatus)
		? "pending"
		: "neutral";
	const pendingDecisionReason =
		reservation?.pendingConfirmation?.rejectionReason ||
		reservation?.pendingConfirmation?.confirmationReason ||
		reservation?.agentDecisionSnapshot?.reason ||
		"";
	const pendingDecisionLabel =
		chosenLanguage === "Arabic"
			? pendingDecisionTone === "accepted"
				? AR_LABELS.acceptedStatus
				: pendingDecisionTone === "rejected"
				? AR_LABELS.rejectedStatus
				: pendingDecisionTone === "pending"
				? AR_LABELS.pendingStatus
				: reservation?.reservation_status || "N/A"
			: pendingDecisionTone === "accepted"
			? "Accepted"
			: pendingDecisionTone === "rejected"
			? "Rejected"
			: pendingDecisionTone === "pending"
			? "Pending confirmation"
			: reservation?.reservation_status || "N/A";
	const agentWalletRows = useMemo(() => {
		if (isAgentReservationPreview) {
			const before = normalizeNumber(
				agentWalletSnapshot?.balanceBeforeReservation,
				0,
			);
			const reservationAmount = normalizeNumber(
				agentWalletSnapshot?.reservationAmount ?? totalAmountValue,
				totalAmountValue,
			);
			const after = normalizeNumber(
				agentWalletSnapshot?.balanceAfterReservation,
				before - reservationAmount,
			);
			return [
				{
					label:
						chosenLanguage === "Arabic"
							? AR_LABELS.walletBefore
							: "Wallet before reservation",
					value: before,
					tone: before < 0 ? "negative" : "neutral",
				},
				{
					label:
						chosenLanguage === "Arabic"
							? AR_LABELS.reservationValue
							: "This reservation",
					value: reservationAmount,
					tone: "neutral",
				},
				{
					label:
						chosenLanguage === "Arabic"
							? AR_LABELS.walletAfter
							: "Wallet after reservation",
					value: after,
					tone: after < 0 ? "negative" : "positive",
				},
			];
		}
		return [
			{
				label:
					chosenLanguage === "Arabic"
						? AR_LABELS.totalPaid
						: "Recorded paid amount",
				value: displayedTotalPaid,
				tone: displayedTotalPaid > 0 ? "positive" : "neutral",
			},
			{
				label:
					chosenLanguage === "Arabic" ? AR_LABELS.amountDue : "Amount due",
				value: amountDue,
				tone: amountDue > 0 ? "negative" : "positive",
			},
			{
				label:
					chosenLanguage === "Arabic" ? AR_LABELS.commission : "Commission",
				value: commissionAmount,
				tone: commissionAmount > 0 ? "neutral" : "positive",
			},
		];
	}, [
		agentWalletSnapshot,
		amountDue,
		chosenLanguage,
		commissionAmount,
		displayedTotalPaid,
		isAgentReservationPreview,
		normalizeNumber,
		totalAmountValue,
	]);
	const updatePendingDecision = useCallback(
		async (payload = {}) => {
			if (!reservation?._id || !user?._id) return false;
			setPendingDecisionLoading(true);
			try {
				const response = await updatePendingConfirmationReservation({
					reservationId: reservation._id,
					userId: user._id,
					payload,
				});
				if (!response || response.error) {
					toast.error(response?.error || "Could not update reservation status.");
					return false;
				}
				const updated = response?.reservation || response;
				if (updated?._id) {
					setReservation(updated);
					if (updated?.agentWalletSnapshot?.captured) {
						setAgentSnapshotState({
							loading: false,
							isAgentReservation: true,
							snapshot: updated.agentWalletSnapshot,
						});
					}
				}
				toast.success("Reservation status was updated.");
				return true;
			} finally {
				setPendingDecisionLoading(false);
			}
		},
		[reservation?._id, setReservation, user?._id],
	);
	const openConfirmDecisionModal = useCallback(() => {
		let confirmationReason = "";
		Modal.confirm({
			title:
				chosenLanguage === "Arabic"
					? "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u062c\u0632"
					: "Confirm reservation",
			content: (
				<div className='pending-decision-modal'>
					<p>
						{chosenLanguage === "Arabic"
							? `\u0647\u0644 \u062a\u0631\u064a\u062f \u062a\u0623\u0643\u064a\u062f \u0647\u0630\u0627 \u0627\u0644\u062d\u062c\u0632 \u0644\u0645\u062f\u0629 ${daysOfResidence} \u0644\u064a\u0644\u0629 / \u0644\u064a\u0627\u0644\u064a \u0628\u0625\u062c\u0645\u0627\u0644\u064a ${formatMoney(totalAmountValue)} SAR\u061f`
							: `Would you like to confirm this reservation for ${daysOfResidence} night(s) at ${formatMoney(totalAmountValue)} SAR?`}
					</p>
					<Input.TextArea
						rows={3}
						placeholder={
							chosenLanguage === "Arabic"
								? AR_LABELS.optionalReason
								: "Optional reason"
						}
						onChange={(event) => {
							confirmationReason = event.target.value;
						}}
					/>
				</div>
			),
			okText: chosenLanguage === "Arabic" ? AR_LABELS.accept : "Confirm",
			cancelText: chosenLanguage === "Arabic" ? "\u0625\u0644\u063a\u0627\u0621" : "Cancel",
			centered: true,
			zIndex: 3000,
			onOk: () =>
				updatePendingDecision({
					action: "confirm",
					confirmationReason,
				}),
		});
	}, [
		chosenLanguage,
		daysOfResidence,
		formatMoney,
		totalAmountValue,
		updatePendingDecision,
	]);
	const openRejectDecisionModal = useCallback(() => {
		let rejectionReason = "";
		Modal.confirm({
			title:
				chosenLanguage === "Arabic"
					? "\u0631\u0641\u0636 \u0627\u0644\u062d\u062c\u0632"
					: "Reject reservation",
			content: (
				<div className='pending-decision-modal'>
					<p>
						{chosenLanguage === "Arabic"
							? "\u0627\u0643\u062a\u0628 \u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636 \u0628\u0648\u0636\u0648\u062d \u0644\u064a\u0638\u0647\u0631 \u0644\u0644\u0648\u0643\u064a\u0644."
							: "Write a clear rejection reason so the agent can see it."}
					</p>
					<Input.TextArea
						rows={3}
						placeholder={
							chosenLanguage === "Arabic"
								? AR_LABELS.rejectionReason
								: "Rejection reason"
						}
						onChange={(event) => {
							rejectionReason = event.target.value;
						}}
					/>
				</div>
			),
			okText: chosenLanguage === "Arabic" ? AR_LABELS.reject : "Reject",
			cancelText: chosenLanguage === "Arabic" ? "\u0625\u0644\u063a\u0627\u0621" : "Cancel",
			centered: true,
			zIndex: 3000,
			onOk: () => {
				if (!String(rejectionReason || "").trim()) {
					toast.error(
						chosenLanguage === "Arabic"
							? "\u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636 \u0645\u0637\u0644\u0648\u0628."
							: "Rejection reason is required.",
					);
					return Promise.reject(new Error("rejection reason required"));
				}
				return updatePendingDecision({
					action: "reject",
					rejectionReason,
				});
			},
		});
	}, [chosenLanguage, updatePendingDecision]);
	const openRevertDecisionModal = useCallback(() => {
		let revertReason = "";
		Modal.confirm({
			title:
				chosenLanguage === "Arabic"
					? AR_LABELS.revertToPending
					: "Revert to pending confirmation",
			content: (
				<Input.TextArea
					rows={3}
					placeholder={
						chosenLanguage === "Arabic"
							? AR_LABELS.optionalReason
							: "Optional reason"
					}
					onChange={(event) => {
						revertReason = event.target.value;
					}}
				/>
			),
			okText:
				chosenLanguage === "Arabic"
					? AR_LABELS.revertToPending
					: "Revert",
			cancelText: chosenLanguage === "Arabic" ? "\u0625\u0644\u063a\u0627\u0621" : "Cancel",
			centered: true,
			zIndex: 3000,
			onOk: () =>
				updatePendingDecision({
					action: "revert_to_pending",
					confirmationReason: revertReason,
				}),
		});
	}, [chosenLanguage, updatePendingDecision]);
	const reservationCycleRows = useMemo(() => {
		const rows = [];
		const pushRow = ({ at, title, by, detail }) => {
			if (!at && !title && !detail) return;
			rows.push({
				at: at ? new Date(at) : null,
				title: title || "Reservation update",
				by: by?.name || by?.email || by || "-",
				detail: detail || "",
			});
		};

		(reservation?.reservationAuditLog || reservation?.adminChangeLog || []).forEach(
			(entry) => {
				pushRow({
					at: entry.at || entry.createdAt || entry.updatedAt,
					title: entry.action || entry.field || "Reservation update",
					by: entry.by,
					detail: entry.field
						? `${entry.field}: ${entry.from ?? "-"} -> ${entry.to ?? "-"}`
						: entry.note || "",
				});
			},
		);

		const pending = reservation?.pendingConfirmation || {};
		if (pending.confirmedAt) {
			pushRow({
				at: pending.confirmedAt,
				title:
					chosenLanguage === "Arabic"
						? "تم تأكيد الحجز"
						: "Reservation confirmed",
				by: pending.lastUpdatedBy,
			});
		}
		if (pending.rejectedAt) {
			pushRow({
				at: pending.rejectedAt,
				title:
					chosenLanguage === "Arabic"
						? "تم رفض الحجز"
						: "Reservation rejected",
				by: pending.lastUpdatedBy,
				detail: pending.rejectionReason || "",
			});
		}
		if (reservation?.housedBy?.name || reservation?.inhouse_date) {
			pushRow({
				at: reservation?.inhouse_date,
				title: chosenLanguage === "Arabic" ? "تم التسكين" : "Guest housed",
				by: reservation?.housedBy,
			});
		}
		if (reservation?.financial_cycle?.commissionAssigned) {
			pushRow({
				at: reservation?.financial_cycle?.commissionAssignedAt,
				title:
					chosenLanguage === "Arabic"
						? "تم تحديد العمولة"
						: "Commission assigned",
				by: reservation?.financial_cycle?.commissionAssignedBy,
				detail: `${formatMoney(
					reservation?.financial_cycle?.commissionAmount || reservation?.commission || 0,
				)} SAR`,
			});
		}
		if (reservation?.commissionPaid) {
			pushRow({
				at: reservation?.commissionPaidAt,
				title:
					chosenLanguage === "Arabic"
						? "تم دفع العمولة"
						: "Commission paid",
				by: reservation?.adminLastUpdatedBy,
			});
		}
		if (reservation?.moneyTransferredToHotel) {
			pushRow({
				at: reservation?.moneyTransferredAt || reservation?.adminLastUpdatedAt,
				title:
					chosenLanguage === "Arabic"
						? "تم تسليم مبلغ الحجز للفندق"
						: "Hotel payout completed",
				by: reservation?.adminLastUpdatedBy,
			});
		}

		return rows.sort((a, b) => {
			const aTime =
				a.at instanceof Date && !Number.isNaN(a.at.getTime())
					? a.at.getTime()
					: 0;
			const bTime =
				b.at instanceof Date && !Number.isNaN(b.at.getTime())
					? b.at.getTime()
					: 0;
			return bTime - aTime;
		});
	}, [chosenLanguage, formatMoney, reservation]);

	const handlePaymentBreakdownValueChange = (key, rawValue) => {
		if (key === "paid_at_hotel_cash" && isCashLocked) {
			return;
		}
		setPaymentBreakdownDraft((prev) => {
			const cleaned = normalizeNumericInput(rawValue);
			const nextValue = cleaned === "" ? "" : cleaned;
			return { ...prev, [key]: nextValue };
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
		const sanitizedBreakdown = buildPaymentBreakdown(
			paymentBreakdownDraft,
			normalizeNumber,
		);
		if (
			isCashLocked &&
			sanitizedBreakdown.paid_at_hotel_cash !== existingCashValue
		) {
			sanitizedBreakdown.paid_at_hotel_cash = existingCashValue;
			toast.warn(
				"Paid at Hotel (Cash) is locked for your account and cannot be changed.",
			);
		}
		const nextTotals = getPaymentBreakdownTotals(
			sanitizedBreakdown,
			normalizeNumber,
		);
		const nextPaidAmount = Number(nextTotals.total.toFixed(2));
		if (nextPaidAmount > totalAmountValue) {
			return toast.error("Paid total cannot exceed the total amount.");
		}
		setIsSavingPaymentBreakdown(true);
		const updateData = {
			paid_amount_breakdown: sanitizedBreakdown,
			paid_amount: nextPaidAmount,
			requestingUserId: user?._id,
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
			setTimeout(() => window.location.reload(false), 1500);
		});
	};

	const handleSaveFinanceCycle = () => {
		if (!reservation?._id) return;
		const nextCommission = normalizeNumber(financeCycleDraft.commission, 0);
		const nextMoneyTransferred = !!financeCycleDraft.moneyTransferredToHotel;
		const nextCommissionPaid = !!financeCycleDraft.commissionPaid;
		const nextCommissionStatus = nextCommissionPaid
			? "commission paid"
			: nextCommission <= 0
			? "no commission due"
			: "commission due";
		const nextCommissionSideClosed = nextCommissionPaid || nextCommission <= 0;
		const nextClosed =
			financeCycleSummary.collectionModel === "pms_collected"
				? nextMoneyTransferred
				: financeCycleSummary.collectionModel === "hotel_collected"
				  ? nextCommissionSideClosed
				  : financeCycleSummary.collectionModel === "mixed"
				    ? nextMoneyTransferred && nextCommissionSideClosed
				    : false;
		const updateData = {
			commission: nextCommission,
			commissionPaid: nextCommissionPaid,
			commissionStatus: nextCommissionStatus,
			commissionData: {
				...(reservation?.commissionData || {}),
				assigned: true,
				amount: nextCommission,
				status: nextCommissionStatus,
			},
			moneyTransferredToHotel: nextMoneyTransferred,
			financial_cycle: {
				...(reservation?.financial_cycle || {}),
				collectionModel: financeCycleSummary.collectionModel,
				status: nextClosed ? "closed" : "open",
				commissionType: "amount",
				commissionValue: nextCommission,
				commissionAmount: nextCommission,
				commissionAssigned: true,
				pmsCollectedAmount,
				hotelCollectedAmount,
				hotelPayoutDue: Math.max(totalAmountValue - nextCommission, 0),
				commissionDueToPms: nextCommission,
				notes: financeCycleDraft.notes || "",
			},
			requestingUserId: user?._id,
		};

		setIsSavingFinanceCycle(true);
		updateSingleReservation(reservation._id, updateData).then((response) => {
			setIsSavingFinanceCycle(false);
			if (!response || response.error) {
				console.error(response?.error || response);
				return toast.error("Could not update the finance cycle.");
			}
			const updated = response?.reservation || response;
			setReservation(updated?._id ? updated : { ...reservation, ...updateData });
			setFinanceCycleModalOpen(false);
			toast.success("Finance cycle was updated successfully.");
		});
	};

	const handleAssignRoomClick = useCallback(() => {
		const hotelId = resolveId(hotelDetails?._id || reservation?.hotelId);
		const belongsToId = resolveId(
			hotelDetails?.belongsTo || reservation?.belongsTo,
		);

		if (!hotelId || !belongsToId) {
			toast.error(
				"Missing hotel reference. Please reload and try again.",
			);
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
		guestName: reservation?.customer_details?.name || "",
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
				resp = await sendReservationPaymentLinkSMSManualHotel(
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
				resp = await sendReservationConfirmationSMSManualHotel(
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

	const handleEditModalClose = () => {
		if (editModalDirty) {
			confirmDiscardChanges(() => {
				setIsModalVisible2(false);
				setEditModalDirty(false);
			});
			return;
		}
		setIsModalVisible2(false);
	};

	const handleEditReservationSaved = (updatedReservation) => {
		editModalSnapshotRef.current = JSON.stringify(
			updatedReservation || reservation || {},
		);
		setEditModalDirty(false);
	};

	const handleStatusModalOpen = () => {
		if (!canFullManageReservation) {
			toast.info(
				chosenLanguage === "Arabic"
					? "هذا الحساب يمكنه تعديل بيانات الضيف والتواريخ فقط."
					: "This account can only update guest details and stay dates.",
			);
			return;
		}
		setSelectedStatus("");
		setSendEmail(false);
		statusModalSnapshotRef.current = { selectedStatus: "", sendEmail: false };
		setIsModalVisible(true);
	};

	const handleStatusModalClose = () => {
		const statusDirty =
			!!selectedStatus ||
			sendEmail !== statusModalSnapshotRef.current.sendEmail;
		if (statusDirty) {
			confirmDiscardChanges(() => {
				setIsModalVisible(false);
				setSelectedStatus("");
				setSendEmail(statusModalSnapshotRef.current.sendEmail);
			});
			return;
		}
		setIsModalVisible(false);
		setSelectedStatus("");
	};

	const handleRelocateModalOpen = () => {
		setSelectedHotelDetails("");
		setIsModalVisible4(true);
	};

	const handleRelocateModalClose = () => {
		if (selectedHotelDetails) {
			confirmDiscardChanges(() => {
				setIsModalVisible4(false);
				setSelectedHotelDetails("");
			});
			return;
		}
		setIsModalVisible4(false);
	};

	const hasPaymentBreakdownChanges = useCallback(() => {
		const base = buildPaymentBreakdown(
			reservation?.paid_amount_breakdown,
			normalizeNumber,
		);
		const draft = buildPaymentBreakdown(paymentBreakdownDraft, normalizeNumber);
		const numericChanged = paymentBreakdownNumericKeys.some(
			(key) => normalizeNumber(base[key], 0) !== normalizeNumber(draft[key], 0),
		);
		const commentChanged =
			String(base.payment_comments || "") !==
			String(draft.payment_comments || "");
		return numericChanged || commentChanged;
	}, [
		paymentBreakdownDraft,
		reservation?.paid_amount_breakdown,
		normalizeNumber,
	]);

	const handlePaymentBreakdownClose = () => {
		if (hasPaymentBreakdownChanges()) {
			confirmDiscardChanges(() => {
				setIsPaymentBreakdownVisible(false);
			});
			return;
		}
		setIsPaymentBreakdownVisible(false);
	};

	// Same as in MoreDetails
	function calculateReservationPeriod(checkin, checkout, language) {
		const checkinDate = moment(checkin).startOf("day");
		const checkoutDate = moment(checkout).startOf("day");
		const days = checkoutDate.diff(checkinDate, "days") + 1;
		const nights = days - 1;

		const daysText = language === "Arabic" ? "أيام" : "days";
		const nightsText = language === "Arabic" ? "ليال" : "nights";

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
				sendEmail, // ✅ mirror MoreDetails
			};

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

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					toast.success("Status was successfully updated");
					setIsModalVisible(false);
					setReservation(response.reservation);
					setTimeout(() => window.location.reload(false), 1500);
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

			if (selectedStatus === "early_checked_out") {
				const newCheckoutDate = new Date();
				const startDate = new Date(reservation.checkin_date);
				const diffTime = Math.abs(newCheckoutDate - startDate);
				const daysOfResidence = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

				updateData.checkout_date = newCheckoutDate.toISOString();
				updateData.days_of_residence = daysOfResidence;

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
					toast.success("Status was successfully updated");
					setIsModalVisible(false);
					setReservation(response);
					setTimeout(() => window.location.reload(false), 1500);
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
					setTimeout(() => {
						window.location.reload(false);
					}, 1500);
				}
			});
		}
	};

	const roomIdValue = reservation?.roomId;
	const hotelIdValue = reservation?.hotelId;

	const getHotelRoomsDetails = useCallback(() => {
		if (!hotelIdValue || !user?._id) return;
		getHotelRooms(hotelIdValue, user._id).then((data3) => {
			if (data3 && data3.error) {
				return;
			} else {
				const roomIds = getReservationRoomIds(roomIdValue);
				const filteredRooms = Array.isArray(data3)
					? data3.filter((room) => roomIds.includes(String(room._id)))
					: [];
				setChosenRooms(filteredRooms);
			}
		});
	}, [getReservationRoomIds, hotelIdValue, roomIdValue, user?._id]);

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

	const assignedRoomsDisplay = useMemo(() => {
		const roomNumbers = Array.isArray(roomTableRows)
			? roomTableRows
					.map((room) => room?.room_number || room?.roomNumber)
					.filter(Boolean)
			: [];
		return roomNumbers.length > 0 ? roomNumbers.join(", ") : "N/A";
	}, [roomTableRows]);

	const groupedPickedRoomsType = useMemo(() => {
		const grouped = new Map();
		(reservation?.pickedRoomsType || []).forEach((room) => {
			const roomType = formatLeadingCapital(
				room?.room_type || room?.roomType || "N/A",
			);
			const displayName = room?.displayName || "";
			const count = normalizeNumber(room?.count, 1);
			const unitRate = normalizeNumber(room?.chosenPrice, 0);
			const key = `${roomType}__${displayName}`;
			const existing = grouped.get(key) || {
				roomType,
				displayName,
				count: 0,
				unitRate,
				lineTotal: 0,
			};
			existing.count += count;
			existing.lineTotal += unitRate * count;
			if (!existing.unitRate && unitRate) {
				existing.unitRate = unitRate;
			}
			grouped.set(key, existing);
		});
		return Array.from(grouped.values());
	}, [reservation?.pickedRoomsType, normalizeNumber]);

	const pricingBreakdownByDay = useMemo(() => {
		const grouped = new Map();
		(reservation?.pickedRoomsType || []).forEach((room, roomIndex) => {
			const roomType = formatLeadingCapital(
				room?.room_type || room?.roomType || "N/A",
			);
			const displayName = room?.displayName || "";
			const title = displayName ? `${roomType} - ${displayName}` : roomType;
			const count = normalizeNumber(room?.count, 1);
			const pricingRows = Array.isArray(room?.pricingByDay)
				? room.pricingByDay
				: [];
			const hasDailyPricing = pricingRows.length > 0;
			const dayRows = hasDailyPricing
				? pricingRows.map((day, dayIndex) => {
						const finalPrice = normalizeNumber(
							day?.totalPriceWithCommission ??
								day?.price ??
								day?.chosenPrice ??
								room?.chosenPrice,
							0,
						);
						const rootPrice = normalizeNumber(
							day?.rootPrice ?? day?.totalPriceWithoutCommission ?? finalPrice,
							finalPrice,
						);
						return {
							date: day?.date || day?.day || `#${dayIndex + 1}`,
							rootPrice,
							finalPrice,
							commission: Math.max(finalPrice - rootPrice, 0),
						};
				  })
				: [
						{
							date:
								chosenLanguage === "Arabic"
									? AR_LABELS.averageNight
									: "Average Night",
							rootPrice: normalizeNumber(room?.chosenPrice, 0),
							finalPrice: normalizeNumber(room?.chosenPrice, 0),
							commission: 0,
							isFallback: true,
						},
				  ];
			const signature = JSON.stringify(
				dayRows.map((day) => [
					day.date,
					day.rootPrice,
					day.finalPrice,
					day.commission,
				]),
			);
			const key = `${roomType}__${displayName}__${signature}`;
			const existing = grouped.get(key) || {
				key: `${key}__${roomIndex}`,
				title,
				roomType,
				displayName,
				count: 0,
				dayRows,
				hasDailyPricing,
			};
			existing.count += count;
			existing.hasDailyPricing = existing.hasDailyPricing || hasDailyPricing;
			grouped.set(key, existing);
		});

		const sections = Array.from(grouped.values()).map((section) => {
			const dayRows = section.dayRows.map((day) => ({
				...day,
				rootTotal: day.rootPrice * section.count,
				finalTotal: day.finalPrice * section.count,
				commissionTotal: day.commission * section.count,
			}));
			const total = dayRows.reduce((sum, day) => sum + day.finalTotal, 0);
			const rootTotal = dayRows.reduce((sum, day) => sum + day.rootTotal, 0);
			const commissionTotal = dayRows.reduce(
				(sum, day) => sum + day.commissionTotal,
				0,
			);
			return { ...section, dayRows, total, rootTotal, commissionTotal };
		});

		return {
			sections,
			total: sections.reduce((sum, section) => sum + section.total, 0),
			rootTotal: sections.reduce((sum, section) => sum + section.rootTotal, 0),
			commissionTotal: sections.reduce(
				(sum, section) => sum + section.commissionTotal,
				0,
			),
			roomUnits: sections.reduce((sum, section) => sum + section.count, 0),
			nights: Math.max(
				daysOfResidence || 0,
				sections.reduce(
					(max, section) => Math.max(max, section.dayRows.length),
					0,
				),
			),
			hasDailyPricing: sections.some((section) => section.hasDailyPricing),
		};
	}, [
		chosenLanguage,
		daysOfResidence,
		normalizeNumber,
		reservation?.pickedRoomsType,
	]);

	const roomTypeAccommodationPricing = useMemo(() => {
		const grouped = new Map();
		(reservation?.pickedRoomsType || []).forEach((room) => {
			const roomType = formatLeadingCapital(
				room?.room_type || room?.roomType || "N/A",
			);
			const displayName = room?.displayName || "";
			const count = normalizeNumber(room?.count, 1);
			const dailyRows = Array.isArray(room?.pricingByDay)
				? room.pricingByDay
				: [];
			const unitTotal = dailyRows.length
				? dailyRows.reduce(
						(sum, day) =>
							sum +
							normalizeNumber(
								day?.totalPriceWithCommission ??
									day?.price ??
									day?.chosenPrice ??
									room?.chosenPrice,
								0,
							),
						0,
				  )
				: normalizeNumber(room?.chosenPrice, 0) *
				  Math.max(daysOfResidence || 1, 1);
			const key = `${roomType}__${displayName}`;
			const existing = grouped.get(key) || {
				roomType,
				displayName,
				count: 0,
				total: 0,
			};
			existing.count += count;
			existing.total += unitTotal * count;
			grouped.set(key, existing);
		});

		const rows = Array.from(grouped.values());
		return {
			rows,
			grandTotal: rows.reduce((sum, row) => sum + row.total, 0),
		};
	}, [daysOfResidence, normalizeNumber, reservation?.pickedRoomsType]);

	const roomDisplayNameByType = useMemo(() => {
		const byType = new Map();
		const addRoomDisplay = (room) => {
			const roomType = room?.roomType || room?.room_type;
			const displayName =
				room?.displayName ||
				room?.display_name ||
				room?.room_display_name ||
				room?.label ||
				"";
			const key = normalizeRoomKey(roomType);
			if (key && displayName && !byType.has(key)) {
				byType.set(key, displayName);
			}
		};

		(reservation?.pickedRoomsType || []).forEach(addRoomDisplay);
		(hotelDetails?.roomCountDetails || []).forEach(addRoomDisplay);

		return byType;
	}, [hotelDetails?.roomCountDetails, reservation?.pickedRoomsType]);

	const getRoomDisplayNameForTable = useCallback(
		(room) => {
			const direct =
				room?.displayName ||
				room?.display_name ||
				room?.room_display_name ||
				room?.roomName ||
				room?.room_name ||
				room?.label ||
				"";
			if (direct) return direct;

			const roomType = room?.room_type || room?.roomType || "";
			const mapped = roomDisplayNameByType.get(normalizeRoomKey(roomType));
			if (mapped) return mapped;

			return formatLeadingCapital(roomType || "N/A");
		},
		[roomDisplayNameByType],
	);

	const downloadPDF = () => {
		html2canvas(pdfRef.current, { scale: 1 }).then((canvas) => {
			const imgData = canvas.toDataURL("image/png");

			const pdf = new jsPDF({
				orientation: "p",
				unit: "pt",
				format: "a4",
			});

			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();

			const imgHeight = (canvas.height * pdfWidth) / canvas.width;
			let heightLeft = imgHeight;

			let position = 0;

			pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
			heightLeft -= pdfHeight;

			while (heightLeft >= 0) {
				position = heightLeft - imgHeight;
				pdf.addPage();
				pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
				heightLeft -= pdfHeight;
			}

			pdf.save("receipt.pdf");
		});
	};

	// eslint-disable-next-line
	const getAverageRootPrice = (pickedRoomsType) => {
		if (!pickedRoomsType || pickedRoomsType.length === 0) return 0;

		let totalRootPrice = 0;
		let totalDays = 0;

		pickedRoomsType.forEach((room) => {
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				room.pricingByDay.forEach((day) => {
					totalRootPrice += parseFloat(day.rootPrice);
				});
				totalDays += room.pricingByDay.length;
			}
		});

		return totalDays > 0 ? totalRootPrice / totalDays : 0;
	};

	// eslint-disable-next-line
	const calculateOverallTotalRootPrice = (pickedRoomsType) => {
		if (!pickedRoomsType || pickedRoomsType.length === 0) return 0;

		return pickedRoomsType.reduce((total, room) => {
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				const roomTotal = room.pricingByDay.reduce((dayTotal, day) => {
					return dayTotal + parseFloat(day.rootPrice);
				}, 0);
				return total + roomTotal * room.count;
			}
			return total;
		}, 0);
	};

	return (
		<Wrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			$isArabic={chosenLanguage === "Arabic"}
		>
			<ReservationDetailGlobalStyles />
			{loading ? (
				<div className='text-center my-5'>
					<Spin size='large' />
					<p>Loading...</p>
				</div>
			) : (
				<div className='otherContentWrapper'>
					{/* EDIT RESERVATION MODAL */}
					<Modal
						title={
							chosenLanguage === "Arabic" ? AR_LABELS.editReservation : "Edit Reservation"
						}
						open={isModalVisible2}
						onCancel={handleEditModalClose}
						onOk={handleUpdateReservationStatus2}
						footer={null}
						className='reservation-update-modal'
						wrapClassName={`reservation-update-modal-wrap ${
							chosenLanguage === "Arabic" ? "rtl" : "ltr"
						}`}
						rootClassName='reservation-update-modal-root'
						width='min(94vw, 1580px)'
						bodyStyle={{ padding: 0 }}
						style={{
							top: 10,
							paddingBottom: 0,
						}}
					>
						{reservation && (
							<EditReservationMain
								reservation={reservation}
								setReservation={setReservation}
								chosenLanguage={chosenLanguage}
								hotelDetails={hotelDetails}
								onReservationSaved={handleEditReservationSaved}
								basicEditOnly={limitedOrderTakerAccount}
							/>
						)}
					</Modal>

					{/* UPDATE STATUS MODAL (matches MoreDetails incl. checkbox) */}
					<Modal
						title={
							chosenLanguage === "Arabic"
								? "تعديل الحجز"
								: "Update Reservation Status"
						}
						open={isModalVisible}
						onCancel={handleStatusModalClose}
						onOk={handleUpdateReservationStatus}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
					>
						<Select
							defaultValue={reservation && reservation.reservation_status}
							style={{ width: "100%" }}
							onChange={(value) => setSelectedStatus(value)}
						>
							<Select.Option value=''>Please Select</Select.Option>
							<Select.Option value='cancelled'>Cancelled</Select.Option>
							<Select.Option value='no_show'>No Show</Select.Option>
							<Select.Option value='confirmed'>Confirmed</Select.Option>
							{/* <Select.Option value='inhouse'>InHouse</Select.Option> */}
							{reservation &&
							reservation.roomId &&
							reservation.roomId.length > 0 ? (
								<Select.Option value='checked_out'>Checked Out</Select.Option>
							) : null}
							{reservation &&
							reservation.roomId &&
							reservation.roomId.length > 0 ? (
								<Select.Option value='early_checked_out'>
									Early Check Out
								</Select.Option>
							) : null}
						</Select>

						{/* Send email checkbox (new, mirrors MoreDetails) */}
						<Checkbox
							checked={sendEmail}
							onChange={(e) => setSendEmail(e.target.checked)}
							style={{ marginTop: "16px" }}
						>
							Send Email Notification to the Customer
						</Checkbox>
					</Modal>

					{/* RELOCATE MODAL */}
					<Modal
						title={
							chosenLanguage === "Arabic"
								? "نقل الحجز؟"
								: "Relocate Reservation?"
						}
						open={isModalVisible4}
						onCancel={handleRelocateModalClose}
						onOk={handleUpdateReservationStatus3}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
					>
						<Select
							defaultValue={
								reservation && hotelDetails && hotelDetails.hotelName
							}
							style={{ width: "100%", textTransform: "capitalize" }}
							onChange={(value) => setSelectedHotelDetails(JSON.parse(value))}
						>
							<Select.Option value=''>Please Select</Select.Option>
							{relocationArray1.map((hotel) => (
								<Select.Option
									style={{ textTransform: "capitalize" }}
									key={hotel._id}
									value={JSON.stringify(hotel)}
								>
									{hotel.hotelName}
								</Select.Option>
							))}
						</Select>
					</Modal>

					{/* PAYMENT LINK MODAL */}
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
								cursor: "pointer",
								textAlign: "center",
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
						onCancel={handlePaymentBreakdownClose}
						footer={null}
						width={720}
						centered
						destroyOnClose
					>
						<div className='container-fluid'>
							<PaymentBreakdownNote>
								{chosenLanguage === "Arabic"
									? "جميع المبالغ بالريال السعودي (SAR)"
									: "All amounts are in SAR."}
							</PaymentBreakdownNote>
							<div className='row'>
								{paymentBreakdownFields.map((field) => (
									<div className='col-md-6 mb-3' key={field.key}>
										<label style={{ fontWeight: "bold" }}>{field.label}</label>
										<input
											type='text'
											inputMode='decimal'
											className='form-control'
											value={paymentBreakdownDraft[field.key] ?? ""}
											disabled={
												field.key === "paid_at_hotel_cash" && isCashLocked
											}
											style={
												field.key === "paid_at_hotel_cash" && isCashLocked
													? {
															backgroundColor: "#f0f0f0",
															color: "#999",
															cursor: "not-allowed",
													  }
													: undefined
											}
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
											{formatMoney(totalAmountValue)} SAR
										</div>
									</div>
									<div className='col-md-4'>
										<div style={{ fontSize: "0.85rem", color: "#666" }}>
											Total Paid
										</div>
										<div style={{ fontWeight: "bold" }}>
											{formatMoney(breakdownDraftTotals.total)} SAR
										</div>
									</div>
									<div className='col-md-4'>
										<div style={{ fontSize: "0.85rem", color: "#666" }}>
											Remaining
										</div>
										<div style={{ fontWeight: "bold", color: "#1b6b34" }}>
											{formatMoney(remainingPaymentAmount)} SAR
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
										breakdownDraftTotals.total > totalAmountValue
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

					<Modal
						title={
							chosenLanguage === "Arabic"
								? "تتبع دورة الحجز"
								: "Reservation Cycle Tracker"
						}
						open={cycleTrackerModalOpen}
						onCancel={() => setCycleTrackerModalOpen(false)}
						footer={null}
						width={720}
						centered
					>
						<CycleTrackerList dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
							{reservationCycleRows.length ? (
								reservationCycleRows.map((item, index) => (
									<div className='cycle-tracker-row' key={`${item.title}-${index}`}>
										<div className='cycle-tracker-dot' />
										<div>
											<strong>{item.title}</strong>
											<span>
												{item.at && !Number.isNaN(item.at.getTime())
													? moment(item.at).format("YYYY-MM-DD HH:mm")
													: "-"}
												{" • "}
												{item.by}
											</span>
											{item.detail ? <small>{item.detail}</small> : null}
										</div>
									</div>
								))
							) : (
								<p>
									{chosenLanguage === "Arabic"
										? "لا توجد حركات مسجلة لهذا الحجز حتى الآن."
										: "No tracker entries have been recorded for this reservation yet."}
								</p>
							)}
						</CycleTrackerList>
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? AR_LABELS.financeCycle
								: "Finance Cycle"
						}
						open={financeCycleModalOpen}
						onCancel={() => setFinanceCycleModalOpen(false)}
						onOk={handleSaveFinanceCycle}
						okText={
							chosenLanguage === "Arabic"
								? AR_LABELS.saveFinanceCycle
								: "Save Finance Cycle"
						}
						confirmLoading={isSavingFinanceCycle}
						width={620}
						centered
					>
						<FinanceCycleEditor dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
							<div className='cycle-pill-row'>
								<span
									className={`cycle-status-pill ${
										financeCycleSummary.isClosed ? "closed" : "open"
									}`}
								>
									{financeCycleSummary.statusLabel}
								</span>
								<strong>{financeCycleSummary.collectionLabel}</strong>
							</div>
							<div className='cycle-editor-grid'>
								<label>
									<span>
										{chosenLanguage === "Arabic"
											? AR_LABELS.commissionAmount
											: "Commission Amount"}
									</span>
									<Input
										inputMode='decimal'
										value={financeCycleDraft.commission}
										onChange={(e) =>
											setFinanceCycleDraft((prev) => ({
												...prev,
												commission: normalizeNumericInput(e.target.value),
											}))
										}
										suffix={chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
									/>
								</label>
								<div className='cycle-mini-card'>
									<span>
										{chosenLanguage === "Arabic"
											? AR_LABELS.pmsOwesHotel
											: "PMS owes hotel"}
									</span>
									<strong className='detail-value-ltr'>
										{formatMoney(financeCycleSummary.hotelPayoutDue)} SAR
									</strong>
								</div>
								<div className='cycle-mini-card'>
									<span>
										{chosenLanguage === "Arabic"
											? AR_LABELS.hotelOwesPms
											: "Hotel owes PMS"}
									</span>
									<strong className='detail-value-ltr'>
										{formatMoney(financeCycleSummary.commissionDueToPms)} SAR
									</strong>
								</div>
							</div>
							<div className='cycle-check-row'>
								<Checkbox
									checked={financeCycleDraft.commissionPaid}
									onChange={(e) =>
										setFinanceCycleDraft((prev) => ({
											...prev,
											commissionPaid: e.target.checked,
										}))
									}
								>
									{chosenLanguage === "Arabic"
										? AR_LABELS.commissionReceived
										: "Commission paid"}
								</Checkbox>
								<Checkbox
									checked={financeCycleDraft.moneyTransferredToHotel}
									onChange={(e) =>
										setFinanceCycleDraft((prev) => ({
											...prev,
											moneyTransferredToHotel: e.target.checked,
										}))
									}
								>
									{chosenLanguage === "Arabic"
										? AR_LABELS.hotelPayoutDone
										: "Hotel payout completed"}
								</Checkbox>
							</div>
							<label className='cycle-notes'>
								<span>
									{chosenLanguage === "Arabic"
										? AR_LABELS.reconciliationNotes
										: "Reconciliation Notes"}
								</span>
								<Input.TextArea
									rows={3}
									value={financeCycleDraft.notes}
									onChange={(e) =>
										setFinanceCycleDraft((prev) => ({
											...prev,
											notes: e.target.value,
										}))
									}
								/>
							</label>
						</FinanceCycleEditor>
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? AR_LABELS.pricingBreakdownByDay
								: "Pricing Breakdown By Day"
						}
						open={pricingBreakdownModalOpen}
						onCancel={() => setPricingBreakdownModalOpen(false)}
						footer={null}
						width={920}
						centered
						destroyOnClose
					>
						<PricingBreakdownModalContent
							$isArabic={chosenLanguage === "Arabic"}
						>
							<div className='pricing-summary-row'>
								<div className='pricing-summary-card'>
									<span>
										{chosenLanguage === "Arabic"
											? AR_LABELS.rooms
											: "Room Units"}
									</span>
									<strong>{pricingBreakdownByDay.roomUnits || 0}</strong>
								</div>
								<div className='pricing-summary-card'>
									<span>
										{chosenLanguage === "Arabic" ? AR_LABELS.nights : "Nights"}
									</span>
									<strong>{pricingBreakdownByDay.nights || 0}</strong>
								</div>
								<div className='pricing-summary-card'>
									<span>
										{chosenLanguage === "Arabic"
											? AR_LABELS.totalAmount
											: "Total Amount"}
									</span>
									<strong className='detail-value-ltr'>
										{formatMoney(pricingBreakdownByDay.total || totalAmountValue)}{" "}
										{chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
									</strong>
								</div>
							</div>

							{pricingBreakdownByDay.sections.length &&
							!pricingBreakdownByDay.hasDailyPricing ? (
								<div className='pricing-empty'>
									{chosenLanguage === "Arabic"
										? AR_LABELS.noDailyPricing
										: "No saved day-by-day pricing was found for this reservation, so the average nightly price is shown."}
								</div>
							) : null}

							{pricingBreakdownByDay.sections.length ? (
								pricingBreakdownByDay.sections.map((section) => (
									<div className='pricing-section-card' key={section.key}>
										<div className='pricing-section-title'>
											<div>
												<small>
													{chosenLanguage === "Arabic"
														? AR_LABELS.roomType
														: "Room Type"}
												</small>
												<strong>{section.title}</strong>
											</div>
											<span className='pricing-count-pill'>
												x {section.count} | {formatMoney(section.total)}{" "}
												{chosenLanguage === "Arabic"
													? AR_LABELS.currency
													: "SAR"}
											</span>
										</div>
										<div className='pricing-day-table-wrap'>
											<table className='pricing-day-table'>
												<thead>
													<tr>
														<th>
															{chosenLanguage === "Arabic"
																? AR_LABELS.date
																: "Date"}
														</th>
														<th>
															{chosenLanguage === "Arabic"
																? AR_LABELS.basePrice
																: "Base Price"}
														</th>
														<th>
															{chosenLanguage === "Arabic"
																? AR_LABELS.finalPrice
																: "Final Price"}
														</th>
														<th>
															{chosenLanguage === "Arabic"
																? AR_LABELS.quantity
																: "Qty"}
														</th>
														<th>
															{chosenLanguage === "Arabic"
																? AR_LABELS.dayTotal
																: "Day Total"}
														</th>
													</tr>
												</thead>
												<tbody>
													{section.dayRows.map((day, dayIndex) => {
														const dateLabel =
															day.isFallback || !moment(day.date).isValid()
																? day.date
																: moment(day.date).format("YYYY-MM-DD");
														return (
															<tr key={`${section.key}-${dayIndex}`}>
																<td>{dateLabel}</td>
																<td className='detail-value-ltr'>
																	{formatMoney(day.rootPrice)}{" "}
																	{chosenLanguage === "Arabic"
																		? AR_LABELS.currency
																		: "SAR"}
																</td>
																<td className='detail-value-ltr'>
																	{formatMoney(day.finalPrice)}{" "}
																	{chosenLanguage === "Arabic"
																		? AR_LABELS.currency
																		: "SAR"}
																</td>
																<td>{section.count}</td>
																<td className='detail-value-ltr'>
																	{formatMoney(day.finalTotal)}{" "}
																	{chosenLanguage === "Arabic"
																		? AR_LABELS.currency
																		: "SAR"}
																</td>
															</tr>
														);
													})}
												</tbody>
												<tfoot>
													<tr>
														<td colSpan='4'>
															{chosenLanguage === "Arabic"
																? AR_LABELS.roomTotal
																: "Room Total"}
														</td>
														<td className='detail-value-ltr'>
															{formatMoney(section.total)}{" "}
															{chosenLanguage === "Arabic"
																? AR_LABELS.currency
																: "SAR"}
														</td>
													</tr>
												</tfoot>
											</table>
										</div>
									</div>
								))
							) : (
								<div className='pricing-empty'>
									{chosenLanguage === "Arabic"
										? AR_LABELS.noDailyPricing
										: "No pricing breakdown is available for this reservation."}
								</div>
							)}
						</PricingBreakdownModalContent>
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? AR_LABELS.totalAccommodationPrice
								: "Accommodation Pricing"
						}
						open={roomTypePricingModalOpen}
						onCancel={() => setRoomTypePricingModalOpen(false)}
						onOk={() => setRoomTypePricingModalOpen(false)}
						centered
						width='min(92vw, 720px)'
						zIndex={2200}
						bodyStyle={{ paddingTop: 8 }}
					>
						<PricingBreakdownModalContent
							$isArabic={chosenLanguage === "Arabic"}
						>
							{roomTypeAccommodationPricing.rows.length ? (
								<div className='pricing-section-card'>
									<div className='pricing-day-table-wrap'>
										<table className='pricing-day-table'>
											<thead>
												<tr>
													<th>
														{chosenLanguage === "Arabic"
															? AR_LABELS.roomType
															: "Room Type"}
													</th>
													<th>
														{chosenLanguage === "Arabic"
															? AR_LABELS.displayName
															: "Display Name"}
													</th>
													<th>
														{chosenLanguage === "Arabic"
															? AR_LABELS.quantity
															: "Qty"}
													</th>
													<th>
														{chosenLanguage === "Arabic"
															? AR_LABELS.totalAccommodationPrice
															: "Total Accommodation Price"}
													</th>
												</tr>
											</thead>
											<tbody>
												{roomTypeAccommodationPricing.rows.map((row, index) => (
													<tr key={`${row.roomType}-${row.displayName}-${index}`}>
														<td>{row.roomType}</td>
														<td>{row.displayName || "N/A"}</td>
														<td>{row.count}</td>
														<td className='detail-value-ltr'>
															{formatMoney(row.total)}{" "}
															{chosenLanguage === "Arabic"
																? AR_LABELS.currency
																: "SAR"}
														</td>
													</tr>
												))}
											</tbody>
											<tfoot>
												<tr>
													<td colSpan='3'>
														{chosenLanguage === "Arabic"
															? AR_LABELS.grandTotal
															: "Grand Total"}
													</td>
													<td className='detail-value-ltr'>
														{formatMoney(roomTypeAccommodationPricing.grandTotal)}{" "}
														{chosenLanguage === "Arabic"
															? AR_LABELS.currency
															: "SAR"}
													</td>
												</tr>
											</tfoot>
										</table>
									</div>
								</div>
							) : (
								<div className='pricing-empty'>
									{chosenLanguage === "Arabic"
										? AR_LABELS.noDailyPricing
										: "No room type pricing is available for this reservation."}
								</div>
							)}
						</PricingBreakdownModalContent>
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? AR_LABELS.roomDetails
								: "Room Details"
						}
						open={roomListModalOpen}
						onCancel={() => setRoomListModalOpen(false)}
						onOk={() => setRoomListModalOpen(false)}
						centered
						width='min(92vw, 620px)'
						zIndex={2200}
						bodyStyle={{ paddingTop: 8 }}
					>
						{roomTableRows && roomTableRows.length > 0 ? (
							<div style={{ overflowX: "auto" }}>
								<table
									style={{
										borderCollapse: "collapse",
										textAlign: "center",
										width: "100%",
									}}
								>
									<thead>
										<tr>
											<th
												style={{
													background: "#e3f2fd",
													border: "1px solid #d9e9fb",
													color: "#18212f",
													fontWeight: 900,
													padding: "8px",
													whiteSpace: "nowrap",
												}}
											>
												{chosenLanguage === "Arabic"
													? AR_LABELS.displayName
													: "Display Name"}
											</th>
											<th
												style={{
													background: "#e3f2fd",
													border: "1px solid #d9e9fb",
													color: "#18212f",
													fontWeight: 900,
													padding: "8px",
													whiteSpace: "nowrap",
												}}
											>
												{chosenLanguage === "Arabic"
													? AR_LABELS.roomNumber
													: "Room Number"}
											</th>
										</tr>
									</thead>
									<tbody>
										{roomTableRows.map((room, index) => {
											const displayName = getRoomDisplayNameForTable(room);
											return (
												<tr key={index}>
													<td
														title={displayName}
														style={{
															border: "1px solid #e6eef8",
															maxWidth: 320,
															overflow: "hidden",
															padding: "6px 8px",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
														}}
													>
														{displayName}
													</td>
													<td
														style={{
															border: "1px solid #e6eef8",
															padding: "6px 8px",
															whiteSpace: "nowrap",
														}}
													>
														{room.room_number || room.roomNumber || "N/A"}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							<div style={{ fontWeight: 900, textAlign: "center" }}>
								{chosenLanguage === "Arabic" ? "لا توجد غرف" : "No rooms"}
							</div>
						)}
					</Modal>

					<div className='container-wrapper'>
						{/* EDIT ACTION ENTRY */}
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
							{chosenLanguage === "Arabic" ? AR_LABELS.editReservation : "Edit Reservation"}
						</h5>

						{/* RELOCATE ENTRY (same condition you already had) */}
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
									onClick={handleRelocateModalOpen}
								>
									<EditOutlined />
									{chosenLanguage === "Arabic"
										? "نقل الحجز؟"
										: "Relocate Reservation?"}
								</h5>
							)}

						{/* RECEIPT (ReceiptPDF) */}
						<Modal
							title='Receipt Download'
							open={isModalVisible3}
							onCancel={() => setIsModalVisible3(false)}
							onOk={() => setIsModalVisible3(false)}
							footer={null}
							width='84.5%'
							style={{
								position: "absolute",
								left: chosenLanguage === "Arabic" ? "15%" : "auto", // match MoreDetails
								right: chosenLanguage === "Arabic" ? "auto" : "5%",
								top: "1%",
							}}
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

						{/* OPS RECEIPT (ReceiptPDFB2B) — NEW to match MoreDetails */}
						<Modal
							title='Ops Receipt'
							open={isModalVisible5}
							onCancel={() => setIsModalVisible5(false)}
							onOk={() => setIsModalVisible5(false)}
							footer={null}
							width='84.5%'
							style={{
								position: "absolute",
								left: chosenLanguage === "Arabic" ? "15%" : "auto", // match MoreDetails
								right: chosenLanguage === "Arabic" ? "auto" : "5%",
								top: "1%",
							}}
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

						{/* HEADER */}
						<Header $isArabic={chosenLanguage === "Arabic"}>
							<Section className='top-guest-card'>
								<div className='top-card-title'>
									<UserOutlined />{" "}
									{chosenLanguage === "Arabic" ? AR_LABELS.guestName : "Guest Name"}
								</div>
								<h2 className='guest-name'>
									{reservation?.customer_details?.name || "N/A"}
								</h2>
								<div className='top-contact-stack'>
									<div className='top-contact-row'>
										<span>
											<MailOutlined />{" "}
											{chosenLanguage === "Arabic" ? AR_LABELS.email : "Email"}
										</span>
										<strong className='top-ltr-value'>
											{reservation?.customer_details?.email || "N/A"}
										</strong>
									</div>
									<div className='top-contact-row'>
										<span>
											<PhoneOutlined />{" "}
											{chosenLanguage === "Arabic" ? AR_LABELS.phone : "Phone"}
										</span>
										<strong className='top-ltr-value'>
											{formatPhoneForDisplay(reservation?.customer_details?.phone)}
										</strong>
									</div>
									<div className='top-contact-row'>
										<span>
											<IdcardOutlined />{" "}
											{chosenLanguage === "Arabic"
												? AR_LABELS.passportNumber
												: "Passport #"}
										</span>
										<strong className='top-ltr-value'>
											{reservation?.customer_details?.passport || "N/A"}
										</strong>
									</div>
								</div>
								<div className='top-guest-actions'>
									<button onClick={() => setConfirmationEmailModalOpen(true)}>
										{chosenLanguage === "Arabic" ? AR_LABELS.emailAction : "Email"}
									</button>
									<button onClick={() => setWhatsAppModalOpen(true)}>
										{chosenLanguage === "Arabic" ? AR_LABELS.sms : "SMS"}
									</button>
								</div>
							</Section>

							<Section className='top-request-card'>
								<button
									className='top-request-button'
									onClick={() => setIsModalVisible2(true)}
								>
									{chosenLanguage === "Arabic" ? AR_LABELS.editReservation : "Edit Reservation"}
								</button>
								{canFullManageReservation ? (
									<div className='top-document-actions'>
										<button onClick={() => setIsModalVisible3(true)}>
											{chosenLanguage === "Arabic" ? AR_LABELS.invoice : "Invoice"}
										</button>
										<button onClick={() => setIsModalVisible5(true)}>
											{chosenLanguage === "Arabic" ? AR_LABELS.operationOrder : "Operation Order"}
										</button>
									</div>
								) : null}
								{canFullManageReservation ? (
									<div className='top-payment-actions'>
									{linkGenerate ? (
										<>
											<button
												onClick={() => setPaymentLinkEmailModalOpen(true)}
												style={{
													background: "darkgreen",
													border: "1px darkred solid",
												}}
											>
												{chosenLanguage === "Arabic" ? AR_LABELS.sendPaymentLink : "Email Payment Link"}
											</button>
											<div
												className='top-link-preview'
												onClick={() => setLinkModalVisible(true)}
											>
												{chosenLanguage === "Arabic" ? AR_LABELS.showLink : "Show Link"}{" "}
												<i className='fa-solid fa-eye'></i>
											</div>
										</>
									) : (
										<button
											style={{
												background: "darkred",
												border: "1px darkred solid",
											}}
											onClick={() => {
												if (chosenLanguage === "Arabic") {
													setLinkGenerated(
														`${process.env.REACT_APP_MAIN_URL_JANNAT}/client-payment/${reservation._id}/${reservation.confirmation_number}`,
													);
													return;
												}
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
											{chosenLanguage === "Arabic" ? AR_LABELS.generatePaymentLink : "Generate Payment Link"}
										</button>
									)}
									</div>
								) : null}
								<div className='top-status-block'>
									<span className='top-status-label'>
										{chosenLanguage === "Arabic" ? AR_LABELS.reservationStatus : "Reservation Status"}
										{canFullManageReservation ? (
											<EditOutlined
												onClick={handleStatusModalOpen}
												style={{ cursor: "pointer" }}
											/>
										) : null}
									</span>
									<span
										className='top-status-pill'
										style={{
											background:
												reservation &&
												reservation.reservation_status.includes("cancelled")
													? "red"
													: reservation.reservation_status.includes("checked_out")
													  ? "darkgreen"
													  : reservation.reservation_status === "inhouse"
													    ? "#c4d3e2"
													    : "yellow",
											color:
												reservation &&
												reservation.reservation_status.includes("cancelled")
													? "white"
													: reservation.reservation_status.includes("checked_out")
													  ? "white"
													  : "black",
										}}
									>
										{reservation?.reservation_status || "N/A"}
									</span>
								</div>
								{canFullManageReservation &&
									relocationArray1 &&
									relocationArray1.some(
										(hotel) =>
											hotel._id === hotelDetails._id &&
											hotel.belongsTo === hotelDetails.belongsTo._id,
									) && (
										<button
											className='top-relocate-button'
											onClick={handleRelocateModalOpen}
										>
											{chosenLanguage === "Arabic" ? AR_LABELS.relocate : "Relocate Reservation"}
										</button>
									)}
							</Section>

							<Section className='top-confirm-card'>
								<div
									className='top-room-box'
									role='button'
									tabIndex={0}
									onClick={() => setRoomListModalOpen(true)}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											setRoomListModalOpen(true);
										}
									}}
									aria-label={
										chosenLanguage === "Arabic"
											? AR_LABELS.roomDetails
											: "Open room details"
									}
								>
									<span>
										<HomeOutlined />{" "}
										{chosenLanguage === "Arabic" ? AR_LABELS.roomNumber : "Room #"}
									</span>
									<strong>{assignedRoomsDisplay}</strong>
								</div>
								<div className='top-confirm-line'>
									<span className='top-confirm-label'>
										<FileTextOutlined />{" "}
										{chosenLanguage === "Arabic"
											? AR_LABELS.confirmationNo
											: "Confirmation No"}
										:
									</span>
									<strong className='top-confirm-number top-ltr-value'>
										{reservation?.confirmation_number || "N/A"}
									</strong>
								</div>
								<div className='top-amount'>
									{formatMoney(totalAmountValue)}{" "}
									{chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
								</div>
							</Section>
							{canFullManageReservation ? (
							<Section className='top-secondary-actions'>
								<div className='top-document-actions'>
									<button onClick={() => setIsModalVisible3(true)}>
										{chosenLanguage === "Arabic" ? AR_LABELS.invoice : "Invoice"}
									</button>
									<button onClick={() => setIsModalVisible5(true)}>
										{chosenLanguage === "Arabic" ? AR_LABELS.operationOrder : "Operation Order"}
									</button>
									{relocationArray1 &&
										relocationArray1.some(
											(hotel) =>
												hotel._id === hotelDetails._id &&
												hotel.belongsTo === hotelDetails.belongsTo._id,
										) && (
											<button
												className='top-relocate-button'
												onClick={handleRelocateModalOpen}
											>
												{chosenLanguage === "Arabic" ? AR_LABELS.relocate : "Relocate"}
											</button>
										)}
								</div>
								<div className='top-payment-actions'>
									{linkGenerate ? (
										<>
											<button
												onClick={() => setPaymentLinkEmailModalOpen(true)}
												style={{
													background: "darkgreen",
													border: "1px darkred solid",
												}}
											>
												{chosenLanguage === "Arabic" ? AR_LABELS.sendPaymentLink : "Email Payment Link"}
											</button>
											<div
												className='top-link-preview'
												onClick={() => setLinkModalVisible(true)}
											>
												{chosenLanguage === "Arabic" ? AR_LABELS.showLink : "Show Link"}{" "}
												<i className='fa-solid fa-eye'></i>
											</div>
										</>
									) : (
										<button
											style={{
												background: "darkred",
												border: "1px darkred solid",
											}}
											onClick={() => {
												if (chosenLanguage === "Arabic") {
													setLinkGenerated(
														`${process.env.REACT_APP_MAIN_URL_JANNAT}/client-payment/${reservation._id}/${reservation.confirmation_number}`,
													);
													return;
												}
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
											{chosenLanguage === "Arabic" ? AR_LABELS.generatePaymentLink : "Generate Payment Link"}
										</button>
									)}
								</div>
								<div className='top-status-block'>
									<span className='top-status-label'>
										{chosenLanguage === "Arabic" ? AR_LABELS.reservationStatus : "Reservation Status"}
										{canFullManageReservation ? (
											<EditOutlined
												onClick={handleStatusModalOpen}
												style={{ cursor: "pointer" }}
											/>
										) : null}
									</span>
									<span
										className='top-status-pill'
										style={{
											background:
												reservation &&
												reservation.reservation_status.includes("cancelled")
													? "red"
													: reservation.reservation_status.includes("checked_out")
													  ? "darkgreen"
													  : reservation.reservation_status === "inhouse"
													    ? "#c4d3e2"
													    : "yellow",
											color:
												reservation &&
												reservation.reservation_status.includes("cancelled")
													? "white"
													: reservation.reservation_status.includes("checked_out")
													  ? "white"
													  : "black",
										}}
									>
										{reservation?.reservation_status || "N/A"}
									</span>
								</div>
							</Section>
							) : null}
							{canFullManageReservation ? (
							<Section className='reservation-command-panel'>
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
													? reservation.total_amount.toLocaleString()
													: 0}{" "}
												{chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
											</h4>
										</div>
										<div className='col-md-12'>
											<h3 style={{ fontSize: "1.5rem", color: "black" }}>
												Confirmation #:{" "}
												{reservation &&
													reservation.customer_details &&
													reservation.confirmation_number}
											</h3>
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
										</div>
									)}

									<div className='col-md-8'></div>
									<div
										className='col-md-3 mx-auto text-center'
										style={{
											textAlign: chosenLanguage === "Arabic" ? "center" : "",
											fontSize: "1.1rem",
											fontWeight: "bold",
										}}
									>
										{chosenLanguage === "Arabic" ? AR_LABELS.reservationStatus : "Reservation Status"}
										{canFullManageReservation ? (
											<EditOutlined
												onClick={handleStatusModalOpen}
												style={{
													marginLeft: "5px",
													marginRight: "5px",
													cursor: "pointer",
												}}
											/>
										) : null}
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
							) : null}

							<Section className='guest-command-panel'>
								{/* Right side of the header */}
								<div className='row'>
									<div className='col-md-12'>
										<h3 style={{ fontSize: "2.5rem" }}>
											{reservation &&
												reservation.customer_details &&
												reservation.customer_details.name}
										</h3>
										<div className='row  my-2'>
											<button
												className='col-md-5'
												onClick={() => setConfirmationEmailModalOpen(true)}
											>
												Email
											</button>
											<button
												className='col-md-5'
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

						<Content $isArabic={chosenLanguage === "Arabic"}>
							{/* LEFT COLUMN */}
							<ContentSection className='content-panel guest-details-panel'>
								<div className='detail-panel-heading'>
									<HomeOutlined />
									<span>
										{chosenLanguage === "Arabic"
											? AR_LABELS.generalDetails
											: "General Details"}
									</span>
								</div>
								<div className='stay-overview-row'>
									<div className='detail-item'>
										<span className='detail-icon'>
											<CalendarOutlined />
										</span>
										<span className='detail-label'>
											{chosenLanguage === "Arabic" ? AR_LABELS.arrival : "Arrival"}
										</span>
										<strong className='detail-value detail-value-ltr'>
											{moment(reservation?.checkin_date).format("DD/MM/YYYY")}
										</strong>
									</div>
									<div className='detail-item'>
										<span className='detail-icon'>
											<CalendarOutlined />
										</span>
										<span className='detail-label'>
											{chosenLanguage === "Arabic"
												? AR_LABELS.departure
												: "Departure"}
										</span>
										<strong className='detail-value detail-value-ltr'>
											{moment(reservation?.checkout_date).format("DD/MM/YYYY")}
										</strong>
									</div>
									<div className='detail-item stay-period-card'>
										<span className='detail-icon'>
											<CheckCircleOutlined />
										</span>
										<span className='detail-label'>
											{chosenLanguage === "Arabic"
												? AR_LABELS.stayPeriod
												: "Reservation Period"}
										</span>
										<strong className='detail-value'>
											{reservation
												? calculateReservationPeriod(
														reservation.checkin_date,
														reservation.checkout_date,
														chosenLanguage,
												  )
												: "N/A"}
										</strong>
									</div>
									<div className='detail-item'>
										<span className='detail-icon'>
											<TeamOutlined />
										</span>
										<span className='detail-label'>
											{chosenLanguage === "Arabic"
												? AR_LABELS.guestCount
												: "Visitors"}
										</span>
										<strong className='detail-value detail-value-ltr'>
											{reservation?.total_guests || 0}
										</strong>
									</div>
								</div>
								<div className='detail-grid guest-info-grid'>
									<div className='detail-item'>
										<span className='detail-icon'>
											<FileTextOutlined />
										</span>
										<span className='detail-label'>
											{chosenLanguage === "Arabic"
												? AR_LABELS.platformConfirmation
												: "Platform Confirmation #"}
										</span>
										<strong className='detail-value detail-value-ltr'>
											{reservation?.customer_details?.confirmationNumber ||
												"N/A"}
										</strong>
									</div>
									<div className='detail-item'>
										<span className='detail-icon'>
											<UserOutlined />
										</span>
										<span className='detail-label'>
											{chosenLanguage === "Arabic"
												? AR_LABELS.nationality
												: "Nationality"}
										</span>
										<strong className='detail-value detail-value-ltr'>
											{reservation?.customer_details?.nationality || "N/A"}
										</strong>
									</div>
									<div className='detail-item'>
										<span className='detail-icon'>
											<IdcardOutlined />
										</span>
										<span className='detail-label'>
											{chosenLanguage === "Arabic"
												? AR_LABELS.passportCopy
												: "Passport Copy #"}
										</span>
										<strong className='detail-value detail-value-ltr'>
											{reservation?.customer_details?.copyNumber || "N/A"}
										</strong>
									</div>
									{reservation?.customer_details?.carLicensePlate ? (
										<>
											<div className='detail-item'>
												<span className='detail-icon'>
													<CarOutlined />
												</span>
												<span className='detail-label'>
													{chosenLanguage === "Arabic"
														? AR_LABELS.guestHasCar
														: "Guest Has A Car"}
												</span>
												<strong className='detail-value detail-value-ltr'>
													{[
														reservation?.customer_details?.carLicensePlate,
														reservation?.customer_details?.carColor,
														reservation?.customer_details?.carModel,
													]
														.filter(Boolean)
														.join(" | ")}
												</strong>
											</div>
										</>
									) : (
										<div className='detail-item'>
											<span className='detail-icon'>
												<CarOutlined />
											</span>
											<span className='detail-label'>
												{chosenLanguage === "Arabic"
													? AR_LABELS.guestNoCar
												: "Guest Doesn't Have A Car"}
											</span>
										</div>
									)}
									<div className='guest-room-actions-block'>
										<div className='middle-room-stack'>
											<div className='detail-item wide'>
												<span className='detail-icon'>
													<HomeOutlined />
												</span>
												<div className='room-type-list'>
													{groupedPickedRoomsType.length ? (
														groupedPickedRoomsType.map((room, index) => (
															<button
																type='button'
																className='room-type-chip single-line clickable'
																key={index}
																onClick={() => setRoomTypePricingModalOpen(true)}
																title={
																	chosenLanguage === "Arabic"
																		? AR_LABELS.clickForPricing
																		: "Click to view accommodation pricing"
																}
															>
																<span className='room-quantity-pill'>
																	x {room.count}
																</span>
																<div className='room-type-name'>
																	<span className='room-type-label'>
																		{chosenLanguage === "Arabic"
																			? AR_LABELS.roomType
																			: "Room Type"}
																		:
																	</span>{" "}
																	{room.roomType}
																	{room.displayName
																		? ` - ${room.displayName}`
																		: ""}
																</div>
															</button>
														))
													) : (
														<strong className='detail-value'>N/A</strong>
													)}
												</div>
											</div>
									</div>
									<div className='guest-action-comment-row'>
										{canFullManageReservation ? (
											<AssignRoomCallout
												type='button'
												onClick={handleAssignRoomClick}
												$isArabic={chosenLanguage === "Arabic"}
											>
												<span>
													{chosenLanguage === "Arabic"
														? AR_LABELS.housing
														: "Assign a room to the guest"}
												</span>
												<AssignRoomHint>
													{chosenLanguage === "Arabic"
														? AR_LABELS.openHousing
													: "Open housing screen"}
												</AssignRoomHint>
											</AssignRoomCallout>
										) : null}
											<div className='detail-item guest-comment-card'>
												<span className='detail-icon'>
													<FileTextOutlined />
												</span>
												<span className='detail-label'>
													{chosenLanguage === "Arabic"
														? AR_LABELS.comment
														: "Comment"}
												</span>
												<strong className='detail-value'>
													{reservation?.comment || "N/A"}
												</strong>
											</div>
										</div>
									</div>
								</div>
								<div
									className='row'
									style={{ fontSize: "17px", fontWeight: "bold" }}
								>
									<div className='col-md-5'>
										{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Arrival"}
										<div style={{ border: "1px solid black", padding: "3px" }}>
											{moment(reservation && reservation.checkin_date)
												.locale(chosenLanguage === "Arabic" ? "ar" : "en")
												.format("DD/MM/YYYY")}
										</div>
									</div>
									<div className='col-md-5'>
										{chosenLanguage === "Arabic"
											? "تاريخ المغادرة"
											: "Check-out"}
										<div style={{ border: "1px solid black", padding: "3px" }}>
											{moment(reservation && reservation.checkout_date)
												.locale(chosenLanguage === "Arabic" ? "ar" : "en")
												.format("DD/MM/YYYY")}
										</div>
									</div>
									<div className='col-md-5 mx-auto mt-3'>
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
										{chosenLanguage === "Arabic" ? AR_LABELS.phone : "Phone"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.phone) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? AR_LABELS.emailAction : "Email"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.email) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-12 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "تاريخ الميلاد"
											: "Date Of Birth"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details &&
												reservation.customer_details.passportExpiry) ||
												"N/A"}
										</div>
									</div>
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

							{/* MIDDLE COLUMN */}
							<ContentSection className='content-panel reservation-details-panel'>
								<div className='middle-operation-shell'>
									<div className='detail-panel-heading'>
										<BankOutlined />
										<span>
											{chosenLanguage === "Arabic" ? AR_LABELS.bookingSource : "Reservation"}
										</span>
									</div>
									<div className='middle-operation-top'>
										<div className='detail-item'>
											<span className='detail-icon'>
												<BankOutlined />
											</span>
											<span className='middle-inline-line'>
												<span className='inline-label'>
													{chosenLanguage === "Arabic"
														? AR_LABELS.bookingSource
														: "Booking Source"}
													:
												</span>
												<strong>
													{formatLeadingCapital(
														reservation?.booking_source || "N/A",
													)}
												</strong>
											</span>
										</div>
										<div className='detail-item'>
											<span className='detail-icon'>
												<CalendarOutlined />
											</span>
											<span className='middle-inline-line'>
												<span className='inline-label'>
													{chosenLanguage === "Arabic"
														? AR_LABELS.bookingDate
														: "Booking Date"}
													:
												</span>
												<strong className='detail-value-ltr'>
													{reservation?.booked_at
														? moment(reservation.booked_at).format("DD/MM/YYYY")
														: "N/A"}
												</strong>
											</span>
										</div>
									</div>
									<div className='payment-method-preview'>
										<div className='payment-preview-heading'>
											{isAgentReservationPreview ? (
												<DollarCircleOutlined />
											) : (
												<CreditCardOutlined />
											)}
											<span>
												{isAgentReservationPreview
													? chosenLanguage === "Arabic"
														? AR_LABELS.walletSnapshot
														: "Agent wallet snapshot"
													: chosenLanguage === "Arabic"
														? AR_LABELS.hotelBookingSummary
														: "Hotel booking summary"}
											</span>
										</div>
										<div className='payment-preview-body'>
											<div className='payment-preview-ledger'>
												{agentSnapshotState.loading ? (
													<div className='payment-preview-loading'>
														<Spin size='small' />
													</div>
												) : (
													agentWalletRows.map((row) => (
														<div className='payment-preview-row' key={row.label}>
															<div
																className={`payment-preview-amount ${row.tone} detail-value-ltr`}
															>
																{formatMoney(row.value)} SAR
															</div>
															<div className='payment-preview-label'>
																{row.label}
															</div>
														</div>
													))
												)}
											</div>
											<div className='payment-preview-account'>
												<span>
													{isAgentReservationPreview
														? chosenLanguage === "Arabic"
															? AR_LABELS.agentAccount
															: "Agent account"
														: chosenLanguage === "Arabic"
															? AR_LABELS.paymentStatus
															: "Payment status"}
												</span>
												<strong>
													{isAgentReservationPreview
														? formatLeadingCapital(
																agentWalletSnapshot?.agent?.companyName ||
																	agentWalletSnapshot?.agent?.name ||
																	reservation?.orderTaker?.companyName ||
																	reservation?.orderTaker?.name ||
																	reservation?.booking_source ||
																	"N/A",
														  )
														: paymentStatusLabel}
												</strong>
												{hasAgentWalletSnapshot && (
													<span className='payment-preview-stamp detail-value-ltr'>
														{chosenLanguage === "Arabic"
															? AR_LABELS.capturedSnapshotAt
															: "Snapshot"}
														:{" "}
														{agentWalletSnapshot?.snapshotAt
															? moment(agentWalletSnapshot.snapshotAt).format(
																	"DD/MM/YYYY HH:mm",
															  )
															: "N/A"}
													</span>
												)}
											</div>
										</div>
										<div className='payment-preview-bottom'>
											<div className='payment-preview-decision-stack'>
												<div
													className={`payment-preview-decision ${pendingDecisionTone}`}
												>
													<span>{pendingDecisionLabel}</span>
													{pendingDecisionReason ? (
														<small>
															{pendingDecisionTone === "rejected"
																? chosenLanguage === "Arabic"
																	? AR_LABELS.rejectionReason
																	: "Reason"
																: chosenLanguage === "Arabic"
																	? AR_LABELS.confirmationReason
																	: "Reason"}
															: {pendingDecisionReason}
														</small>
													) : null}
												</div>
												{canManageFinanceCycle && newProcessReservation ? (
													<div className='payment-preview-actions'>
														{pendingDecisionTone === "pending" ? (
															<>
																<button
																	className='payment-preview-action reject'
																	type='button'
																	disabled={pendingDecisionLoading}
																	onClick={openRejectDecisionModal}
																>
																	{chosenLanguage === "Arabic"
																		? AR_LABELS.reject
																		: "Reject"}
																</button>
																<button
																	className='payment-preview-action accept'
																	type='button'
																	disabled={pendingDecisionLoading}
																	onClick={openConfirmDecisionModal}
																>
																	{chosenLanguage === "Arabic"
																		? AR_LABELS.accept
																		: "Accept"}
																</button>
															</>
														) : (
															<button
																className='payment-preview-action pending'
																type='button'
																disabled={pendingDecisionLoading}
																onClick={openRevertDecisionModal}
															>
																{chosenLanguage === "Arabic"
																	? AR_LABELS.revertToPending
																	: "Revert to pending"}
															</button>
														)}
													</div>
												) : null}
											</div>
											<div className='payment-preview-ref top-ltr-value'>
												BR{reservation?.confirmation_number || "N/A"}
											</div>
										</div>
									</div>

								</div>
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

									{canFullManageReservation ? (
										<>
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
											$isArabic={chosenLanguage === "Arabic"}
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
										</>
									) : null}

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
															<td>{room.room_number || "N/A"}</td>
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
									{reservation?.bedNumber &&
									Array.isArray(reservation.bedNumber) &&
									reservation.bedNumber.length > 0 ? (
										<div
											className='mx-auto mt-2'
											style={{ fontWeight: "bold", textAlign: "center" }}
										>
											{chosenLanguage === "Arabic" ? "الأسرّة" : "Beds"} :{" "}
											{reservation.bedNumber.join(", ")}
										</div>
									) : null}
								</div>
							</ContentSection>

							{/* RIGHT COLUMN */}
							<ContentSection className='content-panel payment-summary-panel'>
								<div className='payment-compact-shell'>
									<div className='detail-panel-heading'>
										<DollarCircleOutlined />
										<span>
											{chosenLanguage === "Arabic"
												? AR_LABELS.paymentSummary
												: "Payment Summary"}
										</span>
									</div>

									<div className={`payment-status-card ${paymentStatusTone}`}>
										{paymentSummary.status === "Not Paid" ? (
											<CreditCardOutlined />
										) : (
											<CheckCircleOutlined />
										)}
										<div>
											<span>
												{chosenLanguage === "Arabic"
													? AR_LABELS.paymentStatus
													: "Payment Status"}
											</span>
											<strong>{paymentStatusLabel}</strong>
											<small>{paymentStatusHint}</small>
										</div>
									</div>

									<div
										className={`finance-cycle-card ${
											financeCycleSummary.isClosed ? "closed" : "open"
										}`}
									>
										<div>
											<span>
												{chosenLanguage === "Arabic"
													? AR_LABELS.financeCycle
													: "Finance Cycle"}
											</span>
											<strong>{financeCycleSummary.statusLabel}</strong>
											<small>{financeCycleSummary.actionLabel}</small>
										</div>
										<div className='finance-cycle-meta'>
											<span>{financeCycleSummary.collectionLabel}</span>
											<strong className='detail-value-ltr'>
												{formatMoney(commissionAmount)} SAR
											</strong>
										</div>
										{canManageFinanceCycle ? (
											<button
												type='button'
												onClick={() => setFinanceCycleModalOpen(true)}
											>
												{chosenLanguage === "Arabic"
													? AR_LABELS.adjustCommission
													: "Adjust Commission"}
											</button>
										) : null}
										{canSeeReservationTracker ? (
											<button
												type='button'
												onClick={() => setCycleTrackerModalOpen(true)}
											>
												{chosenLanguage === "Arabic"
													? "تتبع الدورة"
													: "Cycle Tracker"}
											</button>
										) : null}
									</div>

									<div className='payment-summary-actions'>
										{canFullManageReservation ? (
											<>
												<PaymentBreakdownToggle
													type='button'
													onClick={() => setIsPaymentBreakdownVisible(true)}
													$isArabic={chosenLanguage === "Arabic"}
												>
													<span>
														{chosenLanguage === "Arabic"
															? AR_LABELS.paymentBreakdown
															: "Payment Breakdown"}
													</span>
													<PaymentBreakdownHint>
														{chosenLanguage === "Arabic"
															? AR_LABELS.clickToUpdate
															: "Click to update"}
													</PaymentBreakdownHint>
												</PaymentBreakdownToggle>
												<PricingBreakdownToggle
													type='button'
													onClick={() => setPricingBreakdownModalOpen(true)}
													$isArabic={chosenLanguage === "Arabic"}
												>
													<span>
														{chosenLanguage === "Arabic"
															? AR_LABELS.dailyPrices
															: "Daily Prices"}
													</span>
													<PaymentBreakdownHint>
														{chosenLanguage === "Arabic"
															? AR_LABELS.viewDetails
															: "View details"}
													</PaymentBreakdownHint>
												</PricingBreakdownToggle>
											</>
										) : null}
									</div>

									<div className='payment-total-grid'>
										<div className='payment-total-card primary'>
											<span>
												{chosenLanguage === "Arabic"
													? AR_LABELS.reservationValue
													: "Reservation Value"}
											</span>
											<strong className='detail-value-ltr'>
												{formatMoney(totalAmountValue)}{" "}
												{chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
											</strong>
										</div>
										<div className='payment-total-card paid'>
											<span>
												{chosenLanguage === "Arabic"
													? AR_LABELS.totalPaid
													: "Total Paid"}
											</span>
											<strong className='detail-value-ltr'>
												{formatMoney(displayedTotalPaid)}{" "}
												{chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
											</strong>
										</div>
										<div
											className={`payment-total-card due ${
												amountDue > 0 ? "is-due" : ""
											}`}
										>
											<span>
												{chosenLanguage === "Arabic"
													? AR_LABELS.amountDue
													: "Amount Due"}
											</span>
											<strong className='detail-value-ltr'>
												{formatMoney(amountDue)}{" "}
												{chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
											</strong>
										</div>
									</div>
								</div>
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
												<div className='col-md-4 mt-2'>{/* Date */}</div>
												<div className='col-md-4 mt-2'>{room.room_type}</div>
												<div className='col-md-4 mt-2'>
													{room.chosenPrice.toLocaleString() * room.count}{" "}
													{chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
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
											{reservation && reservation.total_amount.toLocaleString()}{" "}
											{chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
										</div>
									</div>
								</div>

								<div className='mt-5'>
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic"
												? "الضرائب والرسوم "
												: "Taxes & Extra Fees"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{0} {chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
										</div>

										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic" ? "عمولة" : "Commision"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{reservation &&
												reservation.commission &&
												reservation.commission.toLocaleString()}{" "}
											{chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
										</div>
									</div>
								</div>

								<div className='my-5'>
									<div className='row my-auto'>
										<div className='col-md-5 mx-auto'>
											<h4>
												{chosenLanguage === "Arabic"
													? "إجمالي المبلغ"
													: "Total Amount"}
											</h4>
										</div>
										<div className='col-md-5 mx-auto'>
											<h3>{formatMoney(totalAmountValue)} SAR</h3>
										</div>

										{displayPaymentLabel ? (
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "طريقة الدفع"
														: "Payment"}
												</h6>
											</div>
										) : null}
										{displayPaymentLabel ? (
											<div className='col-md-5 mx-auto'>
												<h5 style={{ textTransform: "uppercase" }}>
													{displayPaymentLabel}
												</h5>
											</div>
										) : null}

										{totalPaid > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h4>
													{chosenLanguage === "Arabic"
														? "المبلغ المدفوع"
														: "Deposited Amount"}
												</h4>
											</div>
										) : null}
										{totalPaid > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h3>{formatMoney(totalPaid)} SAR</h3>
											</div>
										) : null}

										{paidOnline > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "مدفوع إلكترونياً"
														: "Paid Online"}
												</h6>
											</div>
										) : null}
										{paidOnline > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h5>{formatMoney(paidOnline)} SAR</h5>
											</div>
										) : null}

										{paidOffline > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "مدفوع نقداً"
														: "Paid Offline"}
												</h6>
											</div>
										) : null}
										{paidOffline > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h5>{formatMoney(paidOffline)} SAR</h5>
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
													{formatMoney(amountDue)} SAR
												</h3>
											</div>
										) : null}

										<div className='col-md-5 mx-auto'>
											<h6>
												{chosenLanguage === "Arabic"
													? "حالة الدفع"
													: "Payment Status"}
											</h6>
										</div>
										<div className='col-md-5 mx-auto'>
											<h5>{paymentSummary.status}</h5>
										</div>
									</div>

									<div className='my-3'>
										<div className='row'>
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
													{chosenLanguage === "Arabic" ? AR_LABELS.currency : "SAR"}
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
		</Wrapper>
	);
};

export default ReservationDetail;
