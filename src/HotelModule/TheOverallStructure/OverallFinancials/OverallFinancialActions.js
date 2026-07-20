import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, DatePicker, Input, InputNumber, message, Modal, Select, Tag } from "antd";
import {
	CheckCircleOutlined,
	CloseCircleOutlined,
	DownloadOutlined,
	ReloadOutlined,
	SearchOutlined,
	StopOutlined,
} from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import styled, { createGlobalStyle, css } from "styled-components";
import dayjs from "dayjs";
import {
	exportOverallFinancialActions,
	getHotelInventoryAvailability,
	getOverallFinancialActions,
	markReservationCommissionPaid,
	reviewAgentWalletClaim,
	trackOverallFinancialReportExport,
	updatePendingConfirmationReservation,
} from "../../apiAdmin";
import { isAuthenticated } from "../../../auth";
import {
	ActionButton,
	buildOwnerParams,
	formatDate,
	formatMoney,
	getOverallText,
	isTerminalPendingQueueReservation,
	localizeStatus,
	normalizeId,
	OVERALL_PAGE_SIZE,
	OverallPageShell,
	OverallTableWrap,
	OverallToolbar,
	Pager,
	pageRowNumber,
	reservationSingleHotelRoute,
	StatusPill,
	statusTone,
	titleCase,
} from "../overallShared";
import OverallReservationDetailsModal, {
	setReservationIdInQuery,
} from "../OverallReservationsList/OverallReservationDetailsModal";
import PendingReservationInventoryBrief, {
	extractPendingInventoryRows,
	getPendingReservationInventoryRequest,
	PENDING_REVIEW_MODAL_CLASS,
} from "../../NewReservation/PendingReservationInventoryBrief";

const TEXT = {
	en: {
		title: "Pending Financial Actions",
		subtitle:
			"Reservations waiting for finance review, commission assignment, or agent commission approval.",
		agentTitle: "My Pending Financial Actions",
		agentSubtitle:
			"Reservations and wallet claims tied to my agent account that are still waiting on financial review.",
		actionType: "Action type",
		allActions: "Finance pending queue",
		agentAllActions: "My pending queue",
		commissionMissing: "Commission missing",
		financeReview: "Total amount review",
		agentCommission: "Agent commission approval",
		financeRejected: "Finance rejected",
		agentCommissionRejected: "Agent commission rejected",
		reasons: "Needs action",
		review: "Review",
		adjustFinance: "Review finance action",
		commission: "Commission",
		commissionStatus: "Commission status",
		commissionDue: "Commission due",
		commissionPaid: "Commission paid",
		commissionNone: "No commission due",
		commissionPercentOfTotal: "Commission % of total",
		commissionPercentRatio: "Commission / total",
		totalReview: "Total amount review",
		totalApproved: "Approved",
		totalRejected: "Rejected",
		totalRejectionReason: "Rejection reason",
		totalRejectionPlaceholder: "Write why the total amount is rejected.",
		saveFinance: "Accept",
		acceptFinance: "Accept",
		rejectFinance: "Reject",
		financeRejectTitle: "Reject finance review",
		financeRejectType: "What needs correction?",
		financeRejectTotal: "Total Amount Rejected",
		financeRejectCommission: "Commission Rejected",
		financeRejectBoth: "Total Amount & Commission Rejected",
		financeRejectComment: "Comments for the agent",
		financeRejectPlaceholder:
			"Write exactly what must be corrected so the agent can adjust the reservation.",
		financeRejectTypeRequired: "Choose what was rejected.",
		financeRejectCommentRequired: "Rejection comments are required.",
		financeRejectSubmit: "Send rejection",
		cancel: "Cancel",
		allBookingSources: "All booking sources",
		allAgents: "All agents / companies",
		sourceDetails: "Source details",
		agentDetails: "Agent details",
		agentCompany: "Company",
		agentModel: "Agent model",
		agentWalletOnly: "Wallet + commission",
		agentWalletSettlement: "Wallet + commission",
		financeSettlementModel: "Finance handling",
		walletAndCommission: "Wallet + commission",
		agentCommissionOnly: "Agent commission only",
		sourceCommissionOnly: "Source commission only",
		walletBalanceBefore: "Wallet before",
		walletBalanceAfter: "Wallet after",
		reservationWalletAmount: "Wallet deduction",
		noAgentForSource:
			"No agent is linked to this reservation, so finance handles it as source commission only.",
		updateSuccess: "Reservation updated.",
		updateError: "Could not update the reservation.",
		totalRejectionRequired: "Rejection reason is required.",
		noRows: "No pending financial actions found.",
		agentNoRows: "No pending financial actions are waiting on your account.",
		walletClaimsTitle: "Pending wallet approvals",
		walletClaimsSubtitle:
			"Agent wallet credit claims waiting for finance approval.",
		agentWalletClaimsTitle: "My pending wallet claims",
		agentWalletClaimsSubtitle:
			"Wallet credit claims I submitted that are waiting for finance review.",
		walletClaimNoRows: "No pending wallet approvals found.",
		agentWalletClaimNoRows: "No pending wallet claims found for your account.",
		walletStatus: "Finance status",
		walletSource: "Source",
		walletReference: "Reference",
		walletNote: "Note",
		walletAmount: "Amount",
		walletDate: "Date",
		walletApprove: "Approve",
		walletReject: "Reject",
		walletRejectForCorrection: "Reject for correction",
		walletRejectFinal: "Final reject",
		walletPending: "Pending approval",
		walletApproved: "Wallet claim approved.",
		walletRejected: "Wallet claim rejected.",
		walletApproveTitle: "Approve wallet claim?",
		walletApproveHint:
			"Review the claim details before adding this amount to the agent wallet.",
		walletApproveOk: "Yes, approve",
		walletRejectTitle: "Reject wallet claim?",
		walletCorrectionRejectTitle: "Reject wallet claim for correction?",
		walletFinalRejectTitle: "Final rejection for wallet claim?",
		walletCorrectionRejectHint:
			"The agent can submit a corrected claim after reviewing this reason.",
		walletFinalRejectHint:
			"This closes the claim as finally rejected, with no correction follow-up.",
		walletRejectCommentLabel: "Rejection reason",
		walletRejectPlaceholder:
			"Write a clear reason so the agent can correct and resubmit if allowed.",
		walletRejectReasonRequired: "Rejection reason is required.",
		commissionReconciliationTitle: "Commission reconciliation",
		commissionReconciliationSubtitle:
			"Checked-out agent reservations with commission still waiting to be reconciled.",
		commissionMonth: "Commission month",
		commissionMarkSelectedPaid: "Mark selected as reconciled",
		commissionSelected: "Selected",
		commissionAgent: "Agent",
		commissionDueDate: "Checkout",
		commissionNoRows: "No commission reconciliation rows found.",
		commissionMarkSuccess: "Selected commissions were sent to agents for approval.",
		commissionMarkError: "Could not mark selected commissions as reconciled.",
		commissionApproveTitle: "Mark commission as reconciled?",
		commissionApproveHint:
			"This will send the selected commission reconciliation to the agent for approval.",
		commissionApproveOk: "Yes, mark reconciled",
		financeApproveTitle: "Confirm financial action?",
		financeApproveHint:
			"Please review the action before saving this approval on the reservation.",
		financeApproveOk: "Yes, save action",
		reservationActionsTitle: "Reservation finance queue",
		reservationActionsSubtitle:
			"Reservations that need finance review, commission setup, or agent commission approval.",
		agentReservationActionsTitle: "My reservation finance queue",
		agentReservationActionsSubtitle:
			"Reservations tied to my agent account that still need a financial action.",
		exportExcel: "Export Excel",
		exportingExcel: "Exporting...",
		exportNoData: "No financial action rows are available to export.",
		exportError: "Could not export financial actions.",
		exportSuccess: "Financial actions exported and tracked.",
		rowsCount: "Rows",
		filterSummary: "Applied filters",
		generatedAt: "Generated at",
		dateFrom: "Date from",
		dateTo: "Date to",
		all: "All",
	},
	ar: {
		title: "الإجراءات المالية المعلقة",
		subtitle:
			"حجوزات بانتظار مراجعة المالية أو تحديد العمولة أو موافقة الوكيل على العمولة.",
		agentTitle:
			"\u0625\u062c\u0631\u0627\u0621\u0627\u062a\u064a \u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u0627\u0644\u0645\u0639\u0644\u0642\u0629",
		agentSubtitle:
			"\u062d\u062c\u0648\u0632\u0627\u062a \u0648\u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0645\u062d\u0641\u0638\u0629 \u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u062d\u0633\u0627\u0628\u064a \u0643\u0648\u0643\u064a\u0644 \u0648\u062a\u0646\u062a\u0638\u0631 \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0627\u0644\u064a\u0629.",
		actionType: "نوع الإجراء",
		allActions: "إجراءات المالية المطلوبة",
		agentAllActions:
			"\u0625\u062c\u0631\u0627\u0621\u0627\u062a\u064a \u0627\u0644\u0645\u0639\u0644\u0642\u0629",
		commissionMissing: "العمولة غير محددة",
		financeReview: "مراجعة المبلغ الإجمالي",
		agentCommission: "موافقة الوكيل على العمولة",
		financeRejected: "رفض المالية",
		agentCommissionRejected: "رفض الوكيل للعمولة",
		reasons: "يحتاج إجراء",
		review: "مراجعة",
		adjustFinance: "مراجعة الإجراء المالي",
		commission: "العمولة",
		commissionStatus: "حالة العمولة",
		commissionDue: "العمولة مستحقة",
		commissionPaid: "تم دفع العمولة",
		commissionNone: "لا توجد عمولة مستحقة",
		totalReview: "مراجعة المبلغ الإجمالي",
		totalApproved: "معتمد",
		totalRejected: "مرفوض",
		totalRejectionReason: "سبب الرفض",
		totalRejectionPlaceholder: "اكتب سبب رفض إجمالي المبلغ.",
		saveFinance: "حفظ الإجراء المالي",
		cancel: "إلغاء",
		allBookingSources: "كل مصادر الحجز",
		updateSuccess: "تم تحديث الحجز.",
		updateError: "تعذر تحديث الحجز.",
		totalRejectionRequired: "سبب الرفض مطلوب.",
		noRows: "لا توجد إجراءات مالية معلقة.",
		agentNoRows:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0645\u0627\u0644\u064a\u0629 \u0645\u0639\u0644\u0642\u0629 \u0639\u0644\u0649 \u062d\u0633\u0627\u0628\u0643.",
		walletClaimsTitle: "موافقات المحفظة المعلقة",
		walletClaimsSubtitle:
			"مطالبات رصيد محفظة الوكلاء التي تنتظر موافقة المالية.",
		agentWalletClaimsTitle:
			"\u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0645\u062d\u0641\u0638\u062a\u064a \u0627\u0644\u0645\u0639\u0644\u0642\u0629",
		agentWalletClaimsSubtitle:
			"\u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0631\u0635\u064a\u062f \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u0627\u0644\u062a\u064a \u0623\u0631\u0633\u0644\u062a\u0647\u0627 \u0648\u062a\u0646\u062a\u0638\u0631 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629.",
		walletClaimNoRows: "لا توجد مطالبات محفظة معلقة.",
		agentWalletClaimNoRows:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0645\u062d\u0641\u0638\u0629 \u0645\u0639\u0644\u0642\u0629 \u0644\u062d\u0633\u0627\u0628\u0643.",
		walletStatus: "حالة المالية",
		walletSource: "المصدر",
		walletReference: "مرجع",
		walletNote: "ملاحظة",
		walletAmount: "المبلغ",
		walletDate: "التاريخ",
		walletApprove: "موافقة",
		walletReject: "رفض",
		walletPending: "قيد موافقة المالية",
		walletApproved: "تمت الموافقة على مطالبة المحفظة.",
		walletRejected: "تم رفض مطالبة المحفظة.",
		walletRejectTitle: "رفض مطالبة المحفظة؟",
		walletRejectReasonRequired: "سبب الرفض مطلوب.",
	},
};

Object.assign(TEXT.ar, {
	reservationActionsTitle:
		"\u0637\u0627\u0628\u0648\u0631 \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0627\u0644\u064a\u0629 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
	reservationActionsSubtitle:
		"\u062d\u062c\u0648\u0632\u0627\u062a \u062a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0627\u0644\u064a\u0629 \u0623\u0648 \u062a\u062d\u062f\u064a\u062f \u0639\u0645\u0648\u0644\u0629 \u0623\u0648 \u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0648\u0643\u064a\u0644.",
	agentReservationActionsTitle:
		"\u0642\u0627\u0626\u0645\u0629 \u0625\u062c\u0631\u0627\u0621\u0627\u062a \u062d\u062c\u0648\u0632\u0627\u062a\u064a \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
	agentReservationActionsSubtitle:
		"\u062d\u062c\u0648\u0632\u0627\u062a \u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u062d\u0633\u0627\u0628\u064a \u0643\u0648\u0643\u064a\u0644 \u0648\u062a\u062d\u062a\u0627\u062c \u0625\u062c\u0631\u0627\u0621\u0627 \u0645\u0627\u0644\u064a\u0627.",
	exportExcel: "\u062a\u0635\u062f\u064a\u0631 Excel",
	exportingExcel: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631...",
	exportNoData:
		"\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u0648\u0641 \u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0645\u0627\u0644\u064a\u0629 \u0644\u0644\u062a\u0635\u062f\u064a\u0631.",
	exportError:
		"\u062a\u0639\u0630\u0631 \u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629.",
	exportSuccess:
		"\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0648\u062a\u0633\u062c\u064a\u0644\u0647\u0627.",
	rowsCount: "\u0627\u0644\u0635\u0641\u0648\u0641",
	filterSummary: "\u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u0645\u0637\u0628\u0642\u0629",
	generatedAt: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
	dateFrom: "\u0645\u0646 \u062a\u0627\u0631\u064a\u062e",
	dateTo: "\u0625\u0644\u0649 \u062a\u0627\u0631\u064a\u062e",
	all: "\u0627\u0644\u0643\u0644",
	walletRejectForCorrection:
		"\u0631\u0641\u0636 \u0644\u0644\u062a\u0635\u062d\u064a\u062d",
	walletRejectFinal: "\u0631\u0641\u0636 \u0646\u0647\u0627\u0626\u064a",
	walletCorrectionRejectTitle:
		"\u0631\u0641\u0636 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u0644\u0644\u062a\u0635\u062d\u064a\u062d\u061f",
	walletFinalRejectTitle:
		"\u0631\u0641\u0636 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u0646\u0647\u0627\u0626\u064a\u0627\u061f",
	walletCorrectionRejectHint:
		"\u0627\u0644\u0648\u0643\u064a\u0644 \u064a\u0633\u062a\u0637\u064a\u0639 \u0625\u0631\u0633\u0627\u0644 \u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u0635\u062d\u062d\u0629 \u0628\u0639\u062f \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0633\u0628\u0628.",
	walletFinalRejectHint:
		"\u0647\u0630\u0627 \u0631\u0641\u0636 \u0646\u0647\u0627\u0626\u064a \u0648\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u062a\u0627\u0628\u0639\u0629 \u062a\u0635\u062d\u064a\u062d \u0644\u0647\u0630\u0647 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629.",
	walletApproveTitle:
		"\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629\u061f",
	walletApproveHint:
		"\u0631\u0627\u062c\u0639 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629 \u0642\u0628\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0628\u0644\u063a \u0625\u0644\u0649 \u0645\u062d\u0641\u0638\u0629 \u0627\u0644\u0648\u0643\u064a\u0644.",
	walletApproveOk:
		"\u0646\u0639\u0645\u060c \u0645\u0648\u0627\u0641\u0642\u0629",
	walletRejectCommentLabel:
		"\u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636",
	walletRejectPlaceholder:
		"\u0627\u0643\u062a\u0628 \u0633\u0628\u0628\u0627 \u0648\u0627\u0636\u062d\u0627 \u0644\u064a\u062a\u0645\u0643\u0646 \u0627\u0644\u0648\u0643\u064a\u0644 \u0645\u0646 \u0627\u0644\u062a\u0635\u062d\u064a\u062d \u0648\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0625\u0631\u0633\u0627\u0644.",
	commissionReconciliationTitle:
		"\u0645\u0637\u0627\u0628\u0642\u0629 \u0639\u0645\u0648\u0644\u0627\u062a \u0627\u0644\u0648\u0643\u0644\u0627\u0621",
	commissionReconciliationSubtitle:
		"\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0628\u0639\u062f \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629 \u0648\u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0644\u0645 \u062a\u062a\u0645 \u0645\u0637\u0627\u0628\u0642\u062a\u0647\u0627 \u0628\u0639\u062f.",
	commissionMonth: "\u0634\u0647\u0631 \u0627\u0644\u0639\u0645\u0648\u0644\u0629",
	commissionMarkSelectedPaid:
		"\u062a\u0639\u0644\u064a\u0645 \u0627\u0644\u0645\u062d\u062f\u062f \u0643\u0645\u0637\u0627\u0628\u0642",
	commissionSelected: "\u0627\u0644\u0645\u062d\u062f\u062f",
	commissionAgent: "\u0627\u0644\u0648\u0643\u064a\u0644",
	commissionDueDate: "\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
	commissionNoRows:
		"\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0645\u0648\u0644\u0627\u062a \u062a\u062d\u062a\u0627\u062c \u0645\u0637\u0627\u0628\u0642\u0629.",
	commissionMarkSuccess:
		"\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062a \u0627\u0644\u0645\u062d\u062f\u062f\u0629 \u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0648\u0643\u0644\u0627\u0621.",
	commissionMarkError:
		"\u062a\u0639\u0630\u0631 \u062a\u0639\u0644\u064a\u0645 \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062a \u0643\u0645\u0637\u0627\u0628\u0642\u0629.",
	commissionApproveTitle:
		"\u062a\u0623\u0643\u064a\u062f \u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0639\u0645\u0648\u0644\u0629\u061f",
	commissionApproveHint:
		"\u0633\u064a\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629 \u0644\u0644\u0648\u0643\u064a\u0644 \u0644\u0644\u0645\u0648\u0627\u0641\u0642\u0629.",
	commissionApproveOk:
		"\u0646\u0639\u0645\u060c \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629",
	financeApproveTitle:
		"\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0645\u0627\u0644\u064a\u061f",
	financeApproveHint:
		"\u0631\u0627\u062c\u0639 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0642\u0628\u0644 \u062d\u0641\u0638 \u0647\u0630\u0627 \u0627\u0644\u0627\u0639\u062a\u0645\u0627\u062f \u0639\u0644\u0649 \u0627\u0644\u062d\u062c\u0632.",
	financeApproveOk:
		"\u0646\u0639\u0645\u060c \u062d\u0641\u0638 \u0627\u0644\u0625\u062c\u0631\u0627\u0621",
	acceptFinance:
		"\u0642\u0628\u0648\u0644",
	rejectFinance:
		"\u0631\u0641\u0636",
	financeRejectTitle:
		"\u0631\u0641\u0636 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
	financeRejectType:
		"\u0645\u0627 \u0627\u0644\u0630\u064a \u064a\u062d\u062a\u0627\u062c \u062a\u0635\u062d\u064a\u062d\u0627\u061f",
	financeRejectTotal:
		"\u0631\u0641\u0636 \u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
	financeRejectCommission:
		"\u0631\u0641\u0636 \u0627\u0644\u0639\u0645\u0648\u0644\u0629",
	financeRejectBoth:
		"\u0631\u0641\u0636 \u0627\u0644\u0645\u0628\u0644\u063a \u0648\u0627\u0644\u0639\u0645\u0648\u0644\u0629",
	financeRejectComment:
		"\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0644\u0644\u0648\u0643\u064a\u0644",
	financeRejectPlaceholder:
		"\u0627\u0643\u062a\u0628 \u0628\u0648\u0636\u0648\u062d \u0645\u0627 \u0627\u0644\u0630\u064a \u064a\u062c\u0628 \u062a\u0635\u062d\u064a\u062d\u0647 \u0644\u064a\u0642\u0648\u0645 \u0627\u0644\u0648\u0643\u064a\u0644 \u0628\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062d\u062c\u0632.",
	financeRejectTypeRequired:
		"\u0627\u062e\u062a\u0631 \u0645\u0627 \u0627\u0644\u0630\u064a \u062a\u0645 \u0631\u0641\u0636\u0647.",
	financeRejectCommentRequired:
		"\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0627\u0644\u0631\u0641\u0636 \u0645\u0637\u0644\u0648\u0628\u0629.",
	financeRejectSubmit:
		"\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0641\u0636",
	commissionPercentOfTotal:
		"\u0646\u0633\u0628\u0629 \u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0645\u0646 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
	commissionPercentRatio:
		"\u0627\u0644\u0639\u0645\u0648\u0644\u0629 / \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
	allAgents:
		"\u0643\u0644 \u0627\u0644\u0648\u0643\u0644\u0627\u0621 / \u0627\u0644\u0634\u0631\u0643\u0627\u062a",
	sourceDetails:
		"\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0635\u062f\u0631",
	agentDetails:
		"\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0648\u0643\u064a\u0644",
	agentCompany:
		"\u0627\u0644\u0634\u0631\u0643\u0629",
	agentModel:
		"\u0646\u0645\u0648\u0630\u062c \u0627\u0644\u0648\u0643\u064a\u0644",
	agentWalletOnly:
		"\u0645\u062d\u0641\u0638\u0629 + \u0639\u0645\u0648\u0644\u0629",
	agentWalletSettlement:
		"\u0645\u062d\u0641\u0638\u0629 + \u0639\u0645\u0648\u0644\u0629",
	financeSettlementModel:
		"\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
	walletAndCommission:
		"\u0645\u062d\u0641\u0638\u0629 + \u0639\u0645\u0648\u0644\u0629",
	agentCommissionOnly:
		"\u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0648\u0643\u064a\u0644 \u0641\u0642\u0637",
	sourceCommissionOnly:
		"\u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u0635\u062f\u0631 \u0641\u0642\u0637",
	walletBalanceBefore:
		"\u0631\u0635\u064a\u062f \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u0642\u0628\u0644",
	walletBalanceAfter:
		"\u0631\u0635\u064a\u062f \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u0628\u0639\u062f",
	reservationWalletAmount:
		"\u062e\u0635\u0645 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
	noAgentForSource:
		"\u0644\u0627 \u064a\u0648\u062c\u062f \u0648\u0643\u064a\u0644 \u0645\u0631\u062a\u0628\u0637 \u0628\u0647\u0630\u0627 \u0627\u0644\u062d\u062c\u0632\u060c \u0644\u0630\u0644\u0643 \u062a\u062a\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u0645\u0639\u0647 \u0643\u0639\u0645\u0648\u0644\u0629 \u0645\u0635\u062f\u0631 \u0641\u0642\u0637.",
});

const reasonTone = (reason = "", adminTheme = false) => {
	if (/rejected/.test(reason)) return "red";
	if (/agent/.test(reason)) return adminTheme ? "blue" : "purple";
	if (/review/.test(reason)) return "blue";
	return "orange";
};

const reasonLabel = (reason = "", labels = TEXT.en) => {
	const map = {
		commission_missing: labels.commissionMissing,
		finance_review: labels.financeReview,
		agent_commission: labels.agentCommission,
		finance_rejected: labels.financeRejected,
		agent_commission_rejected: labels.agentCommissionRejected,
	};
	return map[reason] || reason || "-";
};

const getAccountRoleNumbers = (account = {}) =>
	[
		Number(account?.role),
		...(Array.isArray(account?.roles) ? account.roles.map(Number) : []),
	].filter(Boolean);

const getAccountRoleDescriptions = (account = {}) => [
	String(account?.roleDescription || "").toLowerCase(),
	...(Array.isArray(account?.roleDescriptions)
		? account.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const normalizeRoleKey = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/[\s_-]+/g, "");

const canManageFinancialActions = (account = {}) => {
	const roles = getAccountRoleNumbers(account);
	const descriptions = getAccountRoleDescriptions(account);
	return (
		roles.some((role) => [1000, 2000, 6000, 10000].includes(role)) ||
		descriptions.some((role) =>
			["hotelmanager", "systemadmin", "system admin", "finance"].includes(role)
		)
	);
};

const isOrderTakerOnly = (account = {}) => {
	const roles = getAccountRoleNumbers(account);
	const descriptions = getAccountRoleDescriptions(account).map(normalizeRoleKey);
	const accessTo = Array.isArray(account?.accessTo) ? account.accessTo : [];
	const isAgent =
		roles.includes(7000) ||
		descriptions.includes("ordertaker") ||
		accessTo.includes("ownReservations");
	const hasFullAccess =
		roles.some((role) => [1000, 2000, 3000, 6000, 8000, 10000].includes(role)) ||
		descriptions.some((description) =>
			[
				"hotelmanager",
				"systemadmin",
				"superadmin",
				"reception",
				"finance",
				"reservationemployee",
			].includes(description)
		);
	return isAgent && !hasFullAccess;
};

const moneyNumber = (value) => {
	if (value === null || value === undefined || value === "") return 0;
	const parsed = Number(String(value).replace(/,/g, "").trim());
	return Number.isFinite(parsed) ? parsed : 0;
};

const firstPositiveMoney = (...values) => {
	for (const value of values) {
		const amount = moneyNumber(value);
		if (amount > 0) return amount;
	}
	return 0;
};

const getCommissionValue = (reservation = {}) =>
	firstPositiveMoney(
		reservation.commissionAmount,
		reservation.commission,
		reservation?.commissionData?.amount,
		reservation?.commissionData?.commissionAmount,
		reservation?.financial_cycle?.commissionAmount,
		reservation?.financial_cycle?.commissionValue
	);

const hasCommissionAssignment = (reservation = {}) =>
	getCommissionValue(reservation) > 0 ||
	reservation?.commissionData?.assigned === true ||
	reservation?.financial_cycle?.commissionAssigned === true ||
	["commission due", "commission paid", "no commission due"].includes(
		String(reservation?.commissionStatus || "").trim().toLowerCase()
	);

const accountLooksLikeAgent = (account = {}) => {
	const roles = getAccountRoleNumbers(account);
	const descriptions = getAccountRoleDescriptions(account).map(normalizeRoleKey);
	const accessTo = Array.isArray(account?.accessTo) ? account.accessTo : [];
	return (
		roles.includes(7000) ||
		descriptions.includes("ordertaker") ||
		accessTo.includes("ownReservations") ||
		!!account?.agentCommercialModel
	);
};

const getReservationAgentInfo = (reservation = {}) => {
	const candidates = [
		reservation.agent,
		reservation?.agentWalletSnapshot?.agent,
		reservation.orderTaker,
		reservation.createdBy,
	].filter(Boolean);
	const agent =
		candidates.find(
			(candidate) =>
				normalizeId(candidate?._id) &&
				(accountLooksLikeAgent(candidate) ||
					normalizeId(candidate?._id) === normalizeId(reservation.agentId))
		) || null;
	if (!agent && normalizeId(reservation.agentId)) {
		return {
			_id: normalizeId(reservation.agentId),
			name: "",
			email: "",
			phone: "",
			companyName: "",
			agentCommercialModel:
				reservation?.agentWalletSnapshot?.commercialModel || "",
		};
	}
	if (!agent) return null;
	return {
		_id: normalizeId(agent._id),
		name: agent.name || agent.email || "",
		email: agent.email || "",
		phone: agent.phone || "",
		companyName: agent.companyName || "",
		agentCommercialModel:
			agent.agentCommercialModel ||
			reservation?.agentWalletSnapshot?.commercialModel ||
			"",
	};
};

const normalizeCommercialModel = (value = "") => {
	const normalized = String(value || "").trim().toLowerCase();
	return ["wallet_inventory", "commission_only", "mixed"].includes(normalized)
		? normalized
		: "";
};

const getSettlementModelFromReservation = (reservation = {}) => {
	const agent = getReservationAgentInfo(reservation);
	const existing = String(
		reservation?.financial_cycle?.settlementModel ||
			reservation?.financial_cycle?.agentSettlementModel ||
			reservation?.financial_cycle?.sourceSettlementModel ||
			""
	)
		.trim()
		.toLowerCase();
	if (
		[
			"source_commission_only",
			"agent_commission_only",
			"agent_wallet_commission",
		].includes(existing)
	) {
		const supportedAgentModels = agent
			? settlementModelOptions(agent, TEXT.en).map((option) => option.value)
			: [];
		const validForSource =
			!agent && existing === "source_commission_only";
		const validForAgent =
			!!agent &&
			supportedAgentModels.includes(existing);
		if (validForSource || validForAgent) return existing;
	}
	if (!agent) return "source_commission_only";
	const commercialModel = normalizeCommercialModel(
		agent.agentCommercialModel ||
			reservation?.agentWalletSnapshot?.commercialModel ||
			reservation?.financial_cycle?.agent?.agentCommercialModel
	);
	if (
		reservation?.agentWalletSnapshot?.walletRequired === false ||
		commercialModel === "commission_only"
	) {
		return "agent_commission_only";
	}
	return "agent_wallet_commission";
};

const commercialModelLabel = (model = "", labels = TEXT.en) => {
	const normalized = normalizeCommercialModel(model);
	if (normalized === "commission_only") return labels.agentCommissionOnly;
	if (normalized === "mixed") return labels.walletAndCommission;
	if (normalized === "wallet_inventory")
		return labels.agentWalletSettlement || labels.walletAndCommission;
	return "-";
};

const settlementModelOptions = (agentOrHasAgent, labels = TEXT.en) => {
	const hasAgent =
		typeof agentOrHasAgent === "object" ? !!agentOrHasAgent : !!agentOrHasAgent;
	const commercialModel =
		typeof agentOrHasAgent === "object"
			? normalizeCommercialModel(agentOrHasAgent?.agentCommercialModel)
			: "";
	const walletOption = {
		value: "agent_wallet_commission",
		label: labels.agentWalletSettlement || labels.agentWalletOnly,
	};
	const commissionOption = {
		value: "agent_commission_only",
		label: labels.agentCommissionOnly,
	};
	return (
	hasAgent
		? commercialModel === "commission_only"
			? [commissionOption]
			: commercialModel === "wallet_inventory"
			? [walletOption]
			: [walletOption, commissionOption]
		: [
				{
					value: "source_commission_only",
					label: labels.sourceCommissionOnly,
				},
		  ]
	);
};

const settlementModelLabel = (value = "", labels = TEXT.en) =>
	(settlementModelOptions(true, labels).find((option) => option.value === value) ||
		settlementModelOptions(false, labels).find(
			(option) => option.value === value
		))?.label ||
	value ||
	"-";

const n2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const formatPercent = (value) => {
	const number = Number(value);
	if (!Number.isFinite(number)) return "-";
	return number.toLocaleString("en-US", {
		minimumFractionDigits: number % 1 === 0 ? 0 : 2,
		maximumFractionDigits: 2,
	});
};

const payoutSummary = (details = {}) => {
	const items = [
		details.iban,
		details.instapayAddress,
		details.instapayPhone,
		details.mobileWalletNumber,
		details.stcPayNumber,
		details.paypalEmail,
	]
		.map((item) => String(item || "").trim())
		.filter(Boolean);
	return items.length ? items.slice(0, 2).join(" / ") : "-";
};

const safeFileSegment = (value = "financial-actions") =>
	String(value || "financial-actions")
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 90) || "financial-actions";

const safeSheetName = (value = "Sheet") =>
	String(value || "Sheet")
		.replace(/[\\/?*[\]:]/g, " ")
		.slice(0, 31) || "Sheet";

const loadStyledXlsx = async () => {
	const xlsxModule = await import("xlsx-js-style");
	return xlsxModule.default || xlsxModule["module.exports"] || xlsxModule;
};

const getColumnWidth = (key, rows = []) => {
	const minWidth = Math.max(10, Math.ceil(String(key).length * 0.8));
	const contentWidth = rows.reduce((max, row) => {
		const value = row?.[key];
		const length = value === null || value === undefined ? 0 : String(value).length;
		return Math.max(max, Math.ceil(length * 0.9) + 2);
	}, minWidth);
	return Math.min(32, Math.max(minWidth, contentWidth));
};

const appendJsonSheet = (XLSX, workbook, rows, sheetName, emptyText = "No data") => {
	const safeRows = Array.isArray(rows) && rows.length ? rows : [{ Message: emptyText }];
	const worksheet = XLSX.utils.json_to_sheet(safeRows);
	const headers = Object.keys(safeRows[0] || {});
	worksheet["!cols"] = headers.map((key) => ({ wch: getColumnWidth(key, safeRows) }));
	if (worksheet["!ref"]) {
		const range = XLSX.utils.decode_range(worksheet["!ref"]);
		worksheet["!autofilter"] = { ref: worksheet["!ref"] };
		worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
		for (let column = range.s.c; column <= range.e.c; column += 1) {
			const address = XLSX.utils.encode_cell({ r: 0, c: column });
			if (!worksheet[address]) continue;
			worksheet[address].s = {
				fill: { patternType: "solid", fgColor: { rgb: "D9EAF7" } },
				font: { bold: true, color: { rgb: "0F2842" } },
				alignment: { horizontal: "center", vertical: "center", wrapText: true },
				border: {
					top: { style: "thin", color: { rgb: "B7D7F0" } },
					bottom: { style: "thin", color: { rgb: "B7D7F0" } },
					left: { style: "thin", color: { rgb: "B7D7F0" } },
					right: { style: "thin", color: { rgb: "B7D7F0" } },
				},
			};
		}
		for (let row = 1; row <= range.e.r; row += 1) {
			for (let column = range.s.c; column <= range.e.c; column += 1) {
				const address = XLSX.utils.encode_cell({ r: row, c: column });
				if (!worksheet[address]) continue;
				worksheet[address].s = {
					alignment: { vertical: "top", wrapText: true },
					border: { bottom: { style: "thin", color: { rgb: "E5E7EB" } } },
				};
				if (worksheet[address].t === "n") worksheet[address].z = "#,##0.00";
			}
		}
	}
	XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(sheetName));
};

const reservationActionExportRows = (rows = [], labels = TEXT.en, chosenLanguage) =>
	rows.map((reservation, index) => ({
		"#": index + 1,
		Hotel: titleCase(reservation.hotelName || ""),
		Confirmation: reservation.confirmation_number || "",
		Guest: reservation.customer_details?.name || "",
		"Booking Source": reservation.booking_source || "",
		Status: localizeStatus(reservation.reservation_status, chosenLanguage),
		"Needs Action": (reservation.financialActionReasons || [])
			.map((reason) => reasonLabel(reason, labels))
			.join(", "),
		"Booked At": formatDate(reservation.booked_at || reservation.createdAt, chosenLanguage),
		Arrival: formatDate(reservation.checkin_date, chosenLanguage),
		"Total Amount": n2(reservation.total_amount),
		Commission: n2(getCommissionValue(reservation)),
		"Commission Status": reservation.commissionStatus || "",
		"Total Review Status": reservation?.financial_cycle?.totalReviewStatus || "",
	}));

const walletActionExportRows = (rows = [], labels = TEXT.en, chosenLanguage) =>
	rows.map((transaction, index) => ({
		"#": index + 1,
		Hotel: titleCase(transaction.hotelName || ""),
		Agent: titleCase(transaction.agent?.name || transaction.agent?.email || ""),
		Company: titleCase(transaction.agent?.companyName || ""),
		Amount: n2(transaction.amount),
		Date: formatDate(transaction.transactionDate, chosenLanguage),
		"Finance Status": labels.walletPending,
		Reference: transaction.reference || "",
		Note: transaction.note || "",
		Attachments: (transaction.attachments || []).length,
	}));

const financialActionTrackingRows = (sourceRows = [], exportRows = []) =>
	exportRows.map((row, index) => ({
		...row,
		hotelId: normalizeId(sourceRows[index]?.hotelId),
		_reservationId: normalizeId(sourceRows[index]?._id),
		confirmationNumber: sourceRows[index]?.confirmation_number || "",
	}));

const walletActionTrackingRows = (sourceRows = [], exportRows = []) =>
	exportRows.map((row, index) => ({
		...row,
		hotelId: normalizeId(sourceRows[index]?.hotelId),
		agentId: normalizeId(sourceRows[index]?.agentId || sourceRows[index]?.agent),
		transactionId: normalizeId(sourceRows[index]?._id),
		reference: sourceRows[index]?.reference || "",
	}));

const filterLabel = (value, fallback) => value || fallback;

const toDatePickerValue = (value = "") => {
	if (!value) return null;
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed : null;
};

const pageFromSearch = (search = "") =>
	Math.max(parseInt(new URLSearchParams(search || "").get("page"), 10) || 1, 1);

const OverallFinancialActions = ({
	userId,
	token,
	ownerId,
	chosenLanguage,
	actionsLoader = getOverallFinancialActions,
	actionsExporter = exportOverallFinancialActions,
	adminTheme = false,
	DetailsModalComponent = OverallReservationDetailsModal,
	queryStateAdapter,
}) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const baseLabels = { ...common, ...TEXT[isRTL ? "ar" : "en"] };
	const history = useHistory();
	const location = useLocation();
	const auth = useMemo(() => isAuthenticated() || {}, []);
	const currentUser = useMemo(() => auth?.user || {}, [auth]);
	const agentOnly = useMemo(() => isOrderTakerOnly(currentUser), [currentUser]);
	const canUpdateFinance = useMemo(
		() => canManageFinancialActions(currentUser),
		[currentUser]
	);
	const labels = agentOnly
		? {
				...baseLabels,
				title: baseLabels.agentTitle || baseLabels.title,
				subtitle: baseLabels.agentSubtitle || baseLabels.subtitle,
				allActions: baseLabels.agentAllActions || baseLabels.allActions,
				noRows: baseLabels.agentNoRows || baseLabels.noRows,
				walletClaimsTitle:
					baseLabels.agentWalletClaimsTitle || baseLabels.walletClaimsTitle,
				walletClaimsSubtitle:
					baseLabels.agentWalletClaimsSubtitle ||
					baseLabels.walletClaimsSubtitle,
				walletClaimNoRows:
					baseLabels.agentWalletClaimNoRows || baseLabels.walletClaimNoRows,
				reservationActionsTitle:
					baseLabels.agentReservationActionsTitle ||
					baseLabels.reservationActionsTitle,
				reservationActionsSubtitle:
					baseLabels.agentReservationActionsSubtitle ||
					baseLabels.reservationActionsSubtitle,
		  }
		: baseLabels;
	const defaultFilters = useMemo(
		() => ({
			hotelId: "",
			bookingSource: "",
			agentId: "",
			actionType: "",
			dateBy: "booked_at",
			dateFrom: "",
			dateTo: "",
			commissionMonth: dayjs().format("YYYY-MM"),
		}),
		[]
	);
	const initialQueryState = useMemo(
		() =>
			queryStateAdapter
				? queryStateAdapter.read(location.search, { filters: defaultFilters })
				: { filters: defaultFilters, page: pageFromSearch(location.search) },
		// The URL-to-state effect owns subsequent navigation changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);
	const [filters, setFilters] = useState(initialQueryState.filters);
	const [page, setPage] = useState(initialQueryState.page);
	const syncingQueryFromSearchRef = useRef(false);
	const lastReadSearchRef = useRef(location.search || "");
	const [walletPage, setWalletPage] = useState(1);
	const [commissionPage, setCommissionPage] = useState(1);
	const [selectedCommissionIds, setSelectedCommissionIds] = useState([]);
	const [activeFinanceTab, setActiveFinanceTab] = useState(
		initialQueryState.activeFinanceTab || "reservations"
	);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [result, setResult] = useState({ reservations: [], hotels: [], total: 0 });
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [actionLoading, setActionLoading] = useState(false);
	const [financeModal, setFinanceModal] = useState({
		open: false,
		reservation: null,
		commission: 0,
		commissionPaid: false,
		commissionStatus: "commission due",
		settlementModel: "source_commission_only",
		totalReviewStatus: "approved",
		totalRejectionReason: "",
	});
	const [financeInventory, setFinanceInventory] = useState({
		loading: false,
		rows: [],
	});
	const [financeRejectionModal, setFinanceRejectionModal] = useState({
		open: false,
		rejectionType: "total_amount",
		comment: "",
	});

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			...filters,
			page,
			limit: OVERALL_PAGE_SIZE,
			walletPage,
			walletLimit: 8,
			commissionPage,
			commissionLimit: 8,
		}),
		[commissionPage, filters, ownerId, page, walletPage]
	);

	const loadActions = () => {
		if (!userId || !token) return;
		setLoading(true);
		actionsLoader(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { reservations: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		loadActions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params, token, userId]);

	useEffect(() => {
		if (lastReadSearchRef.current === (location.search || "")) return;
		lastReadSearchRef.current = location.search || "";
		const nextState = queryStateAdapter
			? queryStateAdapter.read(location.search, {
					filters: defaultFilters,
					activeFinanceTab: "reservations",
			  })
			: { filters, page: pageFromSearch(location.search), activeFinanceTab };
		const filtersChanged =
			queryStateAdapter &&
			JSON.stringify(nextState.filters) !== JSON.stringify(filters);
		const pageChanged = nextState.page !== page;
		const financeTabChanged =
			queryStateAdapter && nextState.activeFinanceTab !== activeFinanceTab;
		if (!filtersChanged && !pageChanged && !financeTabChanged) return;
		syncingQueryFromSearchRef.current = true;
		if (filtersChanged) setFilters(nextState.filters);
		if (pageChanged) setPage(nextState.page);
		if (financeTabChanged) setActiveFinanceTab(nextState.activeFinanceTab);
	}, [
		activeFinanceTab,
		defaultFilters,
		filters,
		location.search,
		page,
		queryStateAdapter,
	]);

	useEffect(() => {
		if (syncingQueryFromSearchRef.current) {
			syncingQueryFromSearchRef.current = false;
			return;
		}
		const nextSearch = queryStateAdapter
			? queryStateAdapter.write(location.search, {
					filters,
					page,
					activeFinanceTab,
			  })
			: (() => {
					const query = new URLSearchParams(location.search || "");
					query.set("page", String(Math.max(Number(page) || 1, 1)));
					return `?${query.toString()}`;
			  })();
		if (nextSearch === (location.search || "")) return;
		history.replace({
			pathname: location.pathname,
			search: nextSearch,
		});
	}, [
		activeFinanceTab,
		filters,
		history,
		location.pathname,
		location.search,
		page,
		queryStateAdapter,
	]);

	const hotels = Array.isArray(result.hotels) ? result.hotels : [];
	const bookingSources = Array.isArray(result.bookingSources)
		? result.bookingSources
		: [];
	const agentOptions = Array.isArray(result.agentOptions)
		? result.agentOptions
		: [];
	const reservations = Array.isArray(result.reservations)
		? result.reservations.filter(
				(reservation) => !isTerminalPendingQueueReservation(reservation)
		  )
		: [];
	const pages = Math.max(Number(result.pages || 1), 1);
	const walletClaims = result.walletClaims || {};
	const walletClaimRows = Array.isArray(walletClaims.transactions)
		? walletClaims.transactions
		: [];
	const walletClaimPages = Math.max(Number(walletClaims.pages || 1), 1);
	const walletClaimTotal = Number(walletClaims.total || 0);
	const commissionReconciliation = result.commissionReconciliation || {};
	const commissionRows = Array.isArray(commissionReconciliation.rows)
		? commissionReconciliation.rows
		: [];
	const commissionPages = Math.max(Number(commissionReconciliation.pages || 1), 1);
	const commissionTotal = Number(commissionReconciliation.total || 0);
	const selectedCommissionRows = commissionRows.filter((row) =>
		selectedCommissionIds.includes(normalizeId(row._id))
	);
	const financeTabs = [
		{
			key: "reservations",
			label: labels.reservationActionsTitle,
			count: Number(result.total || 0),
		},
		{
			key: "commissions",
			label: labels.commissionReconciliationTitle,
			count: commissionTotal,
		},
		{
			key: "wallets",
			label: labels.walletClaimsTitle,
			count: walletClaimTotal,
		},
	];
	const actionOptions = [
		{ value: "", label: labels.allActions },
		{ value: "commission_missing", label: labels.commissionMissing },
		{ value: "finance_review", label: labels.financeReview },
		{ value: "agent_commission", label: labels.agentCommission },
		{ value: "finance_rejected", label: labels.financeRejected },
		{ value: "agent_commission_rejected", label: labels.agentCommissionRejected },
	];
	const financeModalTotalAmount = Number(
		financeModal.reservation?.total_amount || 0
	);
	const financeCommissionAmount = n2(financeModal.commission);
	const financeCommissionPercent =
		financeModalTotalAmount > 0
			? n2((financeCommissionAmount / financeModalTotalAmount) * 100)
			: null;
	const financeAgentInfo = getReservationAgentInfo(financeModal.reservation || {});
	const financeSettlementOptions = settlementModelOptions(financeAgentInfo, labels);
	const financeWalletSnapshot =
		financeModal.reservation?.agentWalletSnapshot || {};
	const financeWalletBalanceBefore = n2(
		financeWalletSnapshot.balanceBeforeReservation ??
			financeWalletSnapshot.currentBalance ??
			financeWalletSnapshot.balance ??
			0
	);
	const financeWalletDeduction =
		financeModal.settlementModel === "agent_wallet_commission"
			? n2(financeModalTotalAmount)
			: 0;
	const financeWalletBalanceAfter = n2(
		financeWalletBalanceBefore - financeWalletDeduction
	);
	const financeRejectionOptions = [
		{ value: "total_amount", label: labels.financeRejectTotal },
		{ value: "commission", label: labels.financeRejectCommission },
		{ value: "total_and_commission", label: labels.financeRejectBoth },
	];

	const confirmAcceptanceAction = ({ title, content, okText, onConfirm }) => {
		Modal.confirm({
			title,
			icon: <CheckCircleOutlined style={{ color: "#11865d" }} />,
			content,
			okText,
			cancelText: labels.cancel,
			centered: true,
			maskClosable: true,
			onOk: onConfirm,
		});
	};

	const walletClaimReviewContent = (transaction = {}) => (
		<ActionReviewDetails $isRTL={isRTL}>
			<p>{labels.walletApproveHint}</p>
			<dl>
				<div>
					<dt>{labels.agent}</dt>
					<dd>
						{titleCase(
							transaction.agent?.name || transaction.agent?.email || "-"
						)}
					</dd>
				</div>
				<div>
					<dt>{labels.walletAmount}</dt>
					<dd>
						{formatMoney(transaction.amount)} {labels.sar}
					</dd>
				</div>
				<div>
					<dt>{labels.walletDate}</dt>
					<dd>{formatDate(transaction.transactionDate, chosenLanguage)}</dd>
				</div>
				<div>
					<dt>{labels.walletReference}</dt>
					<dd>{transaction.reference || "-"}</dd>
				</div>
			</dl>
		</ActionReviewDetails>
	);

	const commissionReviewContent = (rows = []) => {
		const commissionTotalAmount = n2(
			rows.reduce(
				(total, reservation) =>
					total +
					Number(
						reservation.commissionAmount ||
							getCommissionValue(reservation) ||
							0
					),
				0
			)
		);

		return (
			<ActionReviewDetails $isRTL={isRTL}>
				<p>{labels.commissionApproveHint}</p>
				<dl>
					<div>
						<dt>{labels.rowsCount}</dt>
						<dd>{rows.length}</dd>
					</div>
					<div>
						<dt>{labels.commission}</dt>
						<dd>
							{formatMoney(commissionTotalAmount)} {labels.sar}
						</dd>
					</div>
					<div>
						<dt>{labels.commissionMonth}</dt>
						<dd>{filters.commissionMonth || "-"}</dd>
					</div>
				</dl>
			</ActionReviewDetails>
		);
	};

	const financeReviewContent = () => (
		<ActionReviewDetails $isRTL={isRTL}>
			<p>{labels.financeApproveHint}</p>
			<dl>
				<div>
					<dt>{labels.confirmation}</dt>
					<dd>{financeModal.reservation?.confirmation_number || "-"}</dd>
				</div>
				<div>
					<dt>{labels.source}</dt>
					<dd>{financeModal.reservation?.booking_source || "-"}</dd>
				</div>
				<div>
					<dt>{labels.financeSettlementModel}</dt>
					<dd>{settlementModelLabel(financeModal.settlementModel, labels)}</dd>
				</div>
				<div>
					<dt>{labels.total}</dt>
					<dd>
						{formatMoney(financeModalTotalAmount)} {labels.sar}
					</dd>
				</div>
				<div>
					<dt>{labels.commission}</dt>
					<dd>
						{formatMoney(financeCommissionAmount)} {labels.sar}
					</dd>
				</div>
				<div>
					<dt>{labels.commissionPercentOfTotal}</dt>
					<dd dir='ltr'>
						{financeCommissionPercent === null
							? "-"
							: `${formatPercent(financeCommissionPercent)}%`}
					</dd>
				</div>
			</dl>
		</ActionReviewDetails>
	);

	const updateFilter = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value }));
		setPage(1);
		setWalletPage(1);
		setCommissionPage(1);
		setSelectedCommissionIds([]);
	};

	const openReservation = (reservation = {}) => {
		const route = reservationSingleHotelRoute(reservation, ownerId, "pending");
		if (route) history.push(route);
	};

	const openMoreDetails = (reservation = {}) => {
		setSelectedReservation(reservation);
		setReservationIdInQuery(history, location, reservation);
	};

	const loadFinanceInventory = (reservation = {}) => {
		const inventoryRequest = getPendingReservationInventoryRequest(reservation);
		if (
			!inventoryRequest.hotelId ||
			!inventoryRequest.start ||
			!inventoryRequest.end
		) {
			setFinanceInventory({ loading: false, rows: [] });
			return;
		}
		setFinanceInventory({ loading: true, rows: [] });
		getHotelInventoryAvailability(inventoryRequest.hotelId, {
			start: inventoryRequest.start,
			end: inventoryRequest.end,
			agentId: inventoryRequest.agentId,
			includePendingConfirmation: true,
		})
			.then((inventory) => {
				setFinanceInventory({
					loading: false,
					rows: extractPendingInventoryRows(inventory),
				});
			})
			.catch(() => setFinanceInventory({ loading: false, rows: [] }));
	};

	const openFinanceModal = (reservation = {}) => {
		const commission = getCommissionValue(reservation);
		const commissionPaid = !!reservation.commissionPaid;
		const commissionAssigned = hasCommissionAssignment(reservation);
		const totalReviewStatus = String(
			reservation?.financial_cycle?.totalReviewStatus || ""
		)
			.trim()
			.toLowerCase();

		setFinanceModal({
			open: true,
			reservation,
			commission,
			commissionPaid,
			settlementModel: getSettlementModelFromReservation(reservation),
			totalReviewStatus: totalReviewStatus === "rejected" ? "rejected" : "approved",
			totalRejectionReason:
				reservation?.financial_cycle?.totalRejectionReason || "",
			commissionStatus:
				reservation.commissionStatus ||
				(commissionPaid
					? "commission paid"
					: commissionAssigned && commission <= 0
					? "no commission due"
					: "commission due"),
		});
		loadFinanceInventory(reservation);
	};

	const closeFinanceModal = () => {
		setFinanceModal({
			open: false,
			reservation: null,
			commission: 0,
			commissionPaid: false,
			commissionStatus: "commission due",
			settlementModel: "source_commission_only",
			totalReviewStatus: "approved",
			totalRejectionReason: "",
		});
		setFinanceInventory({ loading: false, rows: [] });
		setFinanceRejectionModal({
			open: false,
			rejectionType: "total_amount",
			comment: "",
		});
	};

	const refreshUpdatedReservation = (updatedReservation = {}) => {
		setResult((previous) => ({
			...previous,
			reservations: (previous.reservations || []).map((reservation) =>
				reservation._id === updatedReservation._id
					? {
							...reservation,
							...updatedReservation,
							roomDetails: reservation.roomDetails || updatedReservation.roomDetails,
					  }
					: reservation
			),
		}));
		loadActions();
	};

	const performFinanceUpdate = (overrides = {}) => {
		const reservation = financeModal.reservation;
		const actorId = currentUser?._id || userId;
		if (!reservation?._id || !actorId) return;
		const nextCommission = Number(financeModal.commission || 0);
		const nextCommissionStatus =
			nextCommission <= 0
				? financeModal.commissionStatus === "commission paid"
					? "commission paid"
					: "no commission due"
				: financeModal.commissionStatus === "no commission due"
				? "commission due"
				: financeModal.commissionStatus;
		setActionLoading(true);
		updatePendingConfirmationReservation({
			reservationId: reservation._id,
			userId: actorId,
			payload: {
				action: "finance",
				commission: nextCommission,
				commissionPaid: nextCommissionStatus === "commission paid",
				commissionStatus: nextCommissionStatus,
				financeSettlementModel: financeModal.settlementModel,
				totalReviewStatus: overrides.totalReviewStatus || "approved",
				totalRejectionReason: overrides.totalRejectionReason || "",
				financeRejectionType: overrides.financeRejectionType || "",
			},
		})
			.then((data) => {
				if (!data || data.error) {
					message.error(data?.error || labels.updateError);
					return;
				}
				message.success(labels.updateSuccess);
				refreshUpdatedReservation(data);
				closeFinanceModal();
			})
			.catch(() => message.error(labels.updateError))
			.finally(() => setActionLoading(false));
	};

	const submitFinanceUpdate = () => {
		confirmAcceptanceAction({
			title: labels.financeApproveTitle,
			content: financeReviewContent(),
			okText: labels.financeApproveOk,
			onConfirm: () =>
				performFinanceUpdate({
					totalReviewStatus: "approved",
					totalRejectionReason: "",
					financeRejectionType: "",
				}),
		});
	};

	const openFinanceRejectionModal = () => {
		setFinanceRejectionModal({
			open: true,
			rejectionType: "total_amount",
			comment: "",
		});
	};

	const closeFinanceRejectionModal = () => {
		setFinanceRejectionModal({
			open: false,
			rejectionType: "total_amount",
			comment: "",
		});
	};

	const submitFinanceRejection = () => {
		const rejectionType = String(
			financeRejectionModal.rejectionType || ""
		).trim();
		const comment = String(financeRejectionModal.comment || "").trim();
		if (!rejectionType) {
			message.error(labels.financeRejectTypeRequired);
			return;
		}
		if (!comment) {
			message.error(labels.financeRejectCommentRequired);
			return;
		}
		performFinanceUpdate({
			totalReviewStatus: "rejected",
			totalRejectionReason: comment,
			financeRejectionType: rejectionType,
		});
	};

	const reviewWalletClaim = (
		transaction = {},
		action = "approve",
		reason = "",
		rejectionType = ""
	) => {
		const transactionId = normalizeId(transaction._id);
		const actorId = currentUser?._id || userId;
		if (!transactionId || !actorId) return;
		setActionLoading(true);
		return reviewAgentWalletClaim(
			"",
			actorId,
			token,
			transactionId,
			{
				action,
				rejectionReason: reason,
				rejectionType,
			},
			buildOwnerParams(ownerId)
		)
			.then((data) => {
				if (!data || data.error) {
					message.error(data?.error || labels.updateError);
					return;
				}
				message.success(
					action === "approve" ? labels.walletApproved : labels.walletRejected
				);
				loadActions();
			})
			.catch(() => message.error(labels.updateError))
			.finally(() => setActionLoading(false));
	};

	const approveWalletClaim = (transaction = {}) => {
		confirmAcceptanceAction({
			title: labels.walletApproveTitle,
			content: walletClaimReviewContent(transaction),
			okText: labels.walletApproveOk,
			onConfirm: () => reviewWalletClaim(transaction, "approve"),
		});
	};

	const rejectWalletClaim = (
		transaction = {},
		rejectionType = "correction_required"
	) => {
		let reason = "";
		Modal.confirm({
			title:
				rejectionType === "final"
					? labels.walletFinalRejectTitle
					: labels.walletCorrectionRejectTitle || labels.walletRejectTitle,
			content: (
				<RejectDialogContent>
					<p>
						{rejectionType === "final"
							? labels.walletFinalRejectHint
							: labels.walletCorrectionRejectHint}
					</p>
					<strong>{labels.walletRejectCommentLabel}</strong>
					<Input.TextArea
						rows={3}
						aria-label={labels.walletRejectCommentLabel}
						placeholder={
							labels.walletRejectPlaceholder ||
							labels.totalRejectionPlaceholder
						}
						onChange={(event) => {
							reason = event.target.value;
						}}
					/>
				</RejectDialogContent>
			),
			okText:
				rejectionType === "final"
					? labels.walletRejectFinal
					: labels.walletRejectForCorrection || labels.walletReject,
			cancelText: labels.cancel,
			centered: true,
			maskClosable: true,
			okButtonProps: { danger: true },
			onOk: () => {
				const trimmed = String(reason || "").trim();
				if (!trimmed) {
					message.error(labels.walletRejectReasonRequired);
					return Promise.reject(new Error("rejection reason required"));
				}
				return (
					reviewWalletClaim(transaction, "reject", trimmed, rejectionType) ||
					Promise.resolve()
				);
			},
		});
	};

	const toggleCommissionSelection = (reservationId = "") => {
		const id = normalizeId(reservationId);
		if (!id) return;
		setSelectedCommissionIds((previous) =>
			previous.includes(id)
				? previous.filter((item) => item !== id)
				: [...previous, id]
		);
	};

	const toggleAllCommissionRows = () => {
		const currentIds = commissionRows.map((row) => normalizeId(row._id)).filter(Boolean);
		const allSelected =
			currentIds.length &&
			currentIds.every((id) => selectedCommissionIds.includes(id));
		setSelectedCommissionIds((previous) =>
			allSelected
				? previous.filter((id) => !currentIds.includes(id))
				: [...new Set([...previous, ...currentIds])]
		);
	};

	const markCommissionRowsPaid = async (rows = []) => {
		const actorId = currentUser?._id || userId;
		const targets = (Array.isArray(rows) ? rows : []).filter((row) =>
			normalizeId(row?._id)
		);
		if (!actorId || !targets.length) return;
		setActionLoading(true);
		try {
			const results = await Promise.all(
				targets.map((reservation) =>
					markReservationCommissionPaid({
						reservationId: reservation._id,
						userId: actorId,
						payload: {
							commission:
								reservation.commissionAmount ||
								getCommissionValue(reservation) ||
								0,
						},
					})
				)
			);
			const failed = results.find((item) => !item || item.error);
			if (failed) {
				message.error(failed?.error || labels.commissionMarkError);
				return;
			}
			message.success(labels.commissionMarkSuccess);
			setSelectedCommissionIds([]);
			loadActions();
		} catch (error) {
			message.error(labels.commissionMarkError);
		} finally {
			setActionLoading(false);
		}
	};

	const confirmCommissionRowsPaid = (rows = []) => {
		const targets = (Array.isArray(rows) ? rows : []).filter((row) =>
			normalizeId(row?._id)
		);
		if (!targets.length) return;
		confirmAcceptanceAction({
			title: labels.commissionApproveTitle,
			content: commissionReviewContent(targets),
			okText: labels.commissionApproveOk,
			onConfirm: () => markCommissionRowsPaid(targets),
		});
	};

	const handleExportExcel = async () => {
		if (!userId || !token || exporting) return;
		setExporting(true);
		try {
			const exportData = await actionsExporter(userId, token, {
				...params,
				page: 1,
				limit: 5000,
				walletPage: 1,
				walletLimit: 5000,
			});
			if (!exportData || exportData.error) {
				message.error(exportData?.error || labels.exportError);
				return;
			}
			const exportReservations = Array.isArray(exportData.reservations)
				? exportData.reservations
				: [];
			const exportWalletClaims = exportData.walletClaims || {};
			const exportWalletRows = Array.isArray(exportWalletClaims.transactions)
				? exportWalletClaims.transactions
				: [];
			if (!exportReservations.length && !exportWalletRows.length) {
				message.info(labels.exportNoData);
				return;
			}

			const reservationRows = reservationActionExportRows(
				exportReservations,
				labels,
				chosenLanguage
			);
			const walletRows = walletActionExportRows(
				exportWalletRows,
				labels,
				chosenLanguage
			);
			const selectedHotelIds = filters.hotelId
				? [filters.hotelId]
				: (exportData.hotels || []).map((hotel) => normalizeId(hotel._id)).filter(Boolean);
			const selectedHotelName =
				filters.hotelId &&
				(hotels.find((hotel) => normalizeId(hotel._id) === filters.hotelId)
					?.hotelName ||
					"");
			const selectedAction = actionOptions.find(
				(option) => option.value === filters.actionType
			);
			const selectedAgent = agentOptions.find(
				(agent) => normalizeId(agent._id) === normalizeId(filters.agentId)
			);
			const summaryRows = [
				{ Metric: labels.generatedAt, Value: new Date().toLocaleString() },
				{
					Metric: labels.hotel,
					Value: filterLabel(titleCase(selectedHotelName), labels.allHotels),
				},
				{
					Metric: labels.source,
					Value: filterLabel(titleCase(filters.bookingSource), labels.allBookingSources),
				},
				{
					Metric: labels.commissionAgent,
					Value: filterLabel(
						titleCase(
							selectedAgent?.companyName ||
								selectedAgent?.name ||
								selectedAgent?.email ||
								""
						),
						labels.allAgents
					),
				},
				{
					Metric: labels.actionType,
					Value: selectedAction?.label || labels.allActions,
				},
				{
					Metric: labels.commissionMonth,
					Value: filters.commissionMonth || labels.all,
				},
				{
					Metric: labels.reservationActionsTitle,
					Value: reservationRows.length,
				},
				{ Metric: labels.walletClaimsTitle, Value: walletRows.length },
			];
			const reservationColumns = Object.keys(reservationRows[0] || {});
			const transactionColumns = Object.keys(walletRows[0] || {});
			const tracking = await trackOverallFinancialReportExport(
				userId,
				token,
				{
					dataset: "overall_financial_actions",
					format: "XLSX",
					totalRows: reservationRows.length + walletRows.length,
					filters: {
						...filters,
						ownerId: ownerId || "",
						hotelIds: selectedHotelIds,
						scope: "financial-actions",
						reportType: "pending-financial-actions",
					},
					columns: [...new Set([...reservationColumns, ...transactionColumns])],
					reservationColumns,
					transactionColumns,
					totals: {
						reservationActions: reservationRows.length,
						walletClaims: walletRows.length,
						reservationAmount: n2(
							exportReservations.reduce(
								(total, reservation) => total + Number(reservation.total_amount || 0),
								0
							)
						),
						walletAmount: n2(
							exportWalletRows.reduce(
								(total, transaction) => total + Number(transaction.amount || 0),
								0
							)
						),
					},
					reservations: financialActionTrackingRows(
						exportReservations,
						reservationRows
					),
					transactions: walletActionTrackingRows(exportWalletRows, walletRows),
				},
				buildOwnerParams(ownerId)
			);
			if (!tracking || tracking.error || !tracking.exportTracked) {
				message.error(tracking?.error || labels.exportError);
				return;
			}

			const XLSX = await loadStyledXlsx();
			const workbook = XLSX.utils.book_new();
			appendJsonSheet(XLSX, workbook, summaryRows, "Summary", labels.noRows);
			appendJsonSheet(
				XLSX,
				workbook,
				reservationRows,
				"Reservation Actions",
				labels.noRows
			);
			appendJsonSheet(
				XLSX,
				workbook,
				walletRows,
				"Wallet Approvals",
				labels.walletClaimNoRows
			);
			const fileParts = [
				"overall-financial-actions",
				selectedHotelName ? titleCase(selectedHotelName) : "all-hotels",
				new Date().toISOString().slice(0, 10),
			];
			XLSX.writeFile(workbook, `${safeFileSegment(fileParts.join("-"))}.xlsx`, {
				cellStyles: true,
			});
			message.success(labels.exportSuccess);
		} catch (error) {
			console.error(error);
			message.error(labels.exportError);
		} finally {
			setExporting(false);
		}
	};

	return (
		<FinancialPageShell $isRTL={isRTL} $adminTheme={adminTheme}>
			{adminTheme ? <AdminFinanceModalGlobalStyle /> : null}
			<FinancialSectionHeader>
				<div>
					<strong>{labels.title}</strong>
					<span>{labels.subtitle}</span>
				</div>
			</FinancialSectionHeader>

			<OverallToolbar
				onSubmit={(event) => {
					event.preventDefault();
					setPage(1);
					loadActions();
				}}
			>
				<Select
					allowClear
					showSearch
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.hotelId}
					onChange={(value) => updateFilter("hotelId", value || "")}
					placeholder={labels.allHotels}
					optionFilterProp='label'
					options={hotels.map((hotel) => ({
						value: hotel._id,
						label: titleCase(hotel.hotelName),
					}))}
				/>
				<Select
					allowClear
					showSearch
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.bookingSource}
					onChange={(value) => updateFilter("bookingSource", value || "")}
					placeholder={labels.allBookingSources}
					optionFilterProp='label'
					options={bookingSources.map((item) => ({
						value: item.source,
						label: `${titleCase(item.source)} (${item.count})`,
					}))}
				/>
				<Select
					allowClear
					showSearch
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.agentId}
					onChange={(value) => updateFilter("agentId", value || "")}
					placeholder={labels.allAgents}
					optionFilterProp='label'
					options={agentOptions.map((agent) => ({
						value: normalizeId(agent._id),
						label: `${titleCase(
							agent.companyName || agent.name || agent.email || ""
						)}${agent.email ? ` - ${agent.email}` : ""}`,
					}))}
				/>
				<Select
					allowClear
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.actionType}
					onChange={(value) => updateFilter("actionType", value || "")}
					placeholder={labels.allActions}
					optionFilterProp='label'
					options={actionOptions}
				/>
				<DatePicker
					allowClear={false}
					inputReadOnly
					picker='month'
					format='MM/YYYY'
					className='overall-date-picker'
					value={toDatePickerValue(`${filters.commissionMonth || dayjs().format("YYYY-MM")}-01`)}
					onChange={(value) =>
						updateFilter(
							"commissionMonth",
							value ? value.format("YYYY-MM") : dayjs().format("YYYY-MM")
						)
					}
					placeholder={labels.commissionMonth}
					getPopupContainer={() => document.body}
					popupStyle={{ zIndex: 2100 }}
				/>
				<button type='submit'>
					<SearchOutlined />
					<span>{labels.search}</span>
				</button>
				<button
					type='button'
					className='secondary'
					onClick={() => {
						setFilters({
							hotelId: "",
							bookingSource: "",
							agentId: "",
							actionType: "",
							dateBy: "booked_at",
							dateFrom: "",
							dateTo: "",
							commissionMonth: dayjs().format("YYYY-MM"),
						});
						setPage(1);
						setWalletPage(1);
						setCommissionPage(1);
						setSelectedCommissionIds([]);
					}}
				>
					<ReloadOutlined />
					<span>{labels.reset}</span>
				</button>
				<button
					type='button'
					className='export-button'
					disabled={exporting || loading}
					onClick={handleExportExcel}
				>
					<DownloadOutlined />
					<span>{exporting ? labels.exportingExcel : labels.exportExcel}</span>
				</button>
			</OverallToolbar>

			<FinancialTabs $isRTL={isRTL}>
				{financeTabs.map((tab) => (
					<button
						key={tab.key}
						type='button'
						data-active={activeFinanceTab === tab.key}
						onClick={() => setActiveFinanceTab(tab.key)}
					>
						<span>{tab.label}</span>
						<strong>{tab.count}</strong>
					</button>
				))}
			</FinancialTabs>

			<FinancialTabPanel>
				{activeFinanceTab === "reservations" ? (
					<>

			<OverallTableWrap>
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>{labels.hotel}</th>
							<th>{labels.confirmation}</th>
							<th>{labels.guest}</th>
							<th>{labels.source}</th>
							<th>{labels.status}</th>
							<th>{labels.reasons}</th>
							<th>{labels.action}</th>
							<th>{labels.booked}</th>
							<th>{labels.checkIn}</th>
							<th>{labels.total}</th>
							<th>{labels.moreDetails}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='12'>{labels.loading}</td>
							</tr>
						) : reservations.length ? (
							reservations.map((reservation, index) => (
								<tr key={reservation._id}>
									<td>{pageRowNumber(page, index, OVERALL_PAGE_SIZE)}</td>
									<td>{titleCase(reservation.hotelName || "-")}</td>
									<td>
										<button
											type='button'
											className='link-btn'
											onClick={() => openReservation(reservation)}
										>
											{reservation.confirmation_number || "-"}
										</button>
									</td>
									<td>{reservation.customer_details?.name || "-"}</td>
									<td>{reservation.booking_source || "-"}</td>
									<td>
										<StatusPill $tone={statusTone(reservation.reservation_status)}>
											{localizeStatus(
												reservation.reservation_status,
												chosenLanguage
											)}
										</StatusPill>
									</td>
									<td>
										{(reservation.financialActionReasons || []).map((reason) => (
											<Tag key={reason} color={reasonTone(reason, adminTheme)}>
												{reasonLabel(reason, labels)}
											</Tag>
										))}
									</td>
									<td>
										{canUpdateFinance ? (
											<ActionButton
												type='button'
												onClick={() => openFinanceModal(reservation)}
											>
												{labels.review}
											</ActionButton>
										) : (
											"-"
										)}
									</td>
									<td>{formatDate(reservation.booked_at || reservation.createdAt, chosenLanguage)}</td>
									<td>{formatDate(reservation.checkin_date, chosenLanguage)}</td>
									<td>
										{formatMoney(reservation.total_amount)} {labels.sar}
									</td>
									<td>
										<button
											type='button'
											className='link-btn'
											onClick={() => openMoreDetails(reservation)}
										>
											{labels.moreDetails}
										</button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan='12'>{labels.noRows}</td>
							</tr>
						)}
					</tbody>
				</table>
			</OverallTableWrap>

			<Pager>
				<button type='button' disabled={page <= 1} onClick={() => setPage(page - 1)}>
					{labels.previous}
				</button>
				<span>
					{labels.page} {page} {labels.of} {pages} ({Number(result.total || 0)})
				</span>
				<button
					type='button'
					disabled={page >= pages}
					onClick={() => setPage(page + 1)}
				>
					{labels.next}
				</button>
			</Pager>
					</>
				) : null}

				{activeFinanceTab === "commissions" ? (
					<>
						<TabActionBar $isRTL={isRTL}>
							<Tag color='blue'>
								{labels.commissionSelected}: {selectedCommissionIds.length}
							</Tag>
							{canUpdateFinance ? (
								<Button
									size='small'
									type='primary'
									loading={actionLoading}
									disabled={!selectedCommissionRows.length}
									onClick={() => confirmCommissionRowsPaid(selectedCommissionRows)}
								>
									{labels.commissionMarkSelectedPaid}
								</Button>
							) : null}
						</TabActionBar>

			<OverallTableWrap>
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>
								<input
									type='checkbox'
									checked={
										commissionRows.length > 0 &&
										commissionRows.every((row) =>
											selectedCommissionIds.includes(normalizeId(row._id))
										)
									}
									onChange={toggleAllCommissionRows}
								/>
							</th>
							<th>{labels.hotel}</th>
							<th>{labels.confirmation}</th>
							<th>{labels.commissionAgent}</th>
							<th>{labels.guest}</th>
							<th>{labels.source}</th>
							<th>{labels.commissionDueDate}</th>
							<th>{labels.total}</th>
							<th>{labels.commission}</th>
							<th>{labels.payoutDetails || "Payout details"}</th>
							<th>{labels.action}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='12'>{labels.loading}</td>
							</tr>
						) : commissionRows.length ? (
							commissionRows.map((reservation, index) => {
								const reservationId = normalizeId(reservation._id);
								return (
									<tr key={reservationId}>
										<td>
											{pageRowNumber(
												commissionPage,
												index,
												Number(commissionReconciliation.limit || 8)
											)}
										</td>
										<td>
											<input
												type='checkbox'
												checked={selectedCommissionIds.includes(reservationId)}
												onChange={() => toggleCommissionSelection(reservationId)}
											/>
										</td>
										<td>{titleCase(reservation.hotelName || "-")}</td>
										<td>
											<button
												type='button'
												className='link-btn'
												onClick={() => openMoreDetails(reservation)}
											>
												{reservation.confirmation_number || "-"}
											</button>
										</td>
										<td>
											<strong>
												{titleCase(
													reservation.agent?.name ||
														reservation.agent?.email ||
														"-"
												)}
											</strong>
											<br />
											<small>
												{titleCase(reservation.agent?.companyName || "")}
											</small>
										</td>
										<td>{reservation.customer_details?.name || "-"}</td>
										<td>{reservation.booking_source || "-"}</td>
										<td>{formatDate(reservation.checkout_date, chosenLanguage)}</td>
										<td>
											{formatMoney(reservation.total_amount)} {labels.sar}
										</td>
										<td>
											{formatMoney(
												reservation.commissionAmount ||
													getCommissionValue(reservation)
											)}{" "}
											{labels.sar}
										</td>
										<td>
											<small>
												{payoutSummary(
													reservation.agent?.agentPayoutDetails || {}
												)}
											</small>
										</td>
										<td>
											{canUpdateFinance ? (
												<Button
													size='small'
													type='primary'
													loading={actionLoading}
													onClick={() => confirmCommissionRowsPaid([reservation])}
												>
													{labels.commissionMarkSelectedPaid}
												</Button>
											) : (
												"-"
											)}
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td colSpan='12'>{labels.commissionNoRows}</td>
							</tr>
						)}
					</tbody>
				</table>
			</OverallTableWrap>

			<Pager>
				<button
					type='button'
					disabled={commissionPage <= 1}
					onClick={() => setCommissionPage(commissionPage - 1)}
				>
					{labels.previous}
				</button>
				<span>
					{labels.page} {commissionPage} {labels.of} {commissionPages} (
					{commissionTotal})
				</span>
				<button
					type='button'
					disabled={commissionPage >= commissionPages}
					onClick={() => setCommissionPage(commissionPage + 1)}
				>
					{labels.next}
				</button>
			</Pager>
					</>
				) : null}

				{activeFinanceTab === "wallets" ? (
					<>

			<OverallTableWrap>
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>{labels.hotel}</th>
							<th>{labels.agent}</th>
							<th>{labels.walletAmount}</th>
							<th>{labels.walletDate}</th>
							<th>{labels.walletStatus}</th>
							<th>{labels.walletReference}</th>
							<th>{labels.walletNote}</th>
							<th>{labels.attachments || labels.moreDetails}</th>
							<th>{labels.action}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='10'>{labels.loading}</td>
							</tr>
						) : walletClaimRows.length ? (
							walletClaimRows.map((transaction, index) => (
								<tr key={transaction._id}>
									<td>
										{pageRowNumber(
											walletPage,
											index,
											Number(walletClaims.limit || 8)
										)}
									</td>
									<td>{titleCase(transaction.hotelName || "-")}</td>
									<td>
										<strong>
											{titleCase(
												transaction.agent?.name ||
													transaction.agent?.email ||
													"-"
											)}
										</strong>
										<br />
										<small>
											{titleCase(transaction.agent?.companyName || "")}
										</small>
									</td>
									<td>
										{formatMoney(transaction.amount)} {labels.sar}
									</td>
									<td>{formatDate(transaction.transactionDate, chosenLanguage)}</td>
									<td>
										<Tag color='orange'>{labels.walletPending}</Tag>
									</td>
									<td>{transaction.reference || "-"}</td>
									<td>{transaction.note || "-"}</td>
									<td>{(transaction.attachments || []).length}</td>
									<td>
										{canUpdateFinance ? (
											<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
												<Button
													size='small'
													type='primary'
													icon={<CheckCircleOutlined />}
													loading={actionLoading}
													onClick={() => approveWalletClaim(transaction)}
												>
													{labels.walletApprove}
												</Button>
												<Button
													size='small'
													danger
													icon={<CloseCircleOutlined />}
													loading={actionLoading}
													onClick={() =>
														rejectWalletClaim(transaction, "correction_required")
													}
												>
													{labels.walletRejectForCorrection || labels.walletReject}
												</Button>
												<Button
													size='small'
													danger
													icon={<StopOutlined />}
													loading={actionLoading}
													onClick={() =>
														rejectWalletClaim(transaction, "final")
													}
												>
													{labels.walletRejectFinal}
												</Button>
											</div>
										) : (
											"-"
										)}
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan='10'>{labels.walletClaimNoRows}</td>
							</tr>
						)}
					</tbody>
				</table>
			</OverallTableWrap>

			<Pager>
				<button
					type='button'
					disabled={walletPage <= 1}
					onClick={() => setWalletPage(walletPage - 1)}
				>
					{labels.previous}
				</button>
				<span>
					{labels.page} {walletPage} {labels.of} {walletClaimPages} (
					{walletClaimTotal})
				</span>
				<button
					type='button'
					disabled={walletPage >= walletClaimPages}
					onClick={() => setWalletPage(walletPage + 1)}
				>
					{labels.next}
				</button>
			</Pager>
					</>
				) : null}
			</FinancialTabPanel>

			<DetailsModalComponent
				reservations={reservations}
				selectedReservation={selectedReservation}
				setSelectedReservation={setSelectedReservation}
				ownerId={ownerId}
				onReservationUpdated={refreshUpdatedReservation}
				chosenLanguage={chosenLanguage}
			/>

			<Modal
				open={financeModal.open}
				onCancel={closeFinanceModal}
				title={labels.adjustFinance}
				footer={null}
				destroyOnClose
				width='min(96vw, 1120px)'
				className={`${PENDING_REVIEW_MODAL_CLASS} overall-finance-review-modal${
					adminTheme ? " admin-finance-review-modal" : ""
				}`}
				zIndex={adminTheme ? 2000 : undefined}
			>
				<div dir={isRTL ? "rtl" : "ltr"}>
					<FinanceModalFrame $isRTL={isRTL} $hasAgent={!!financeAgentInfo}>
						<FinanceContextPanel>
							<FinancePanelTitle>
								{financeAgentInfo ? labels.agentDetails : labels.sourceDetails}
							</FinancePanelTitle>
							<FinanceDetailGrid>
								<FinanceDetailTile>
									<span>{labels.source}</span>
									<strong>{financeModal.reservation?.booking_source || "-"}</strong>
								</FinanceDetailTile>
								<FinanceDetailTile>
									<span>{labels.confirmation}</span>
									<strong>
										{financeModal.reservation?.confirmation_number || "-"}
									</strong>
								</FinanceDetailTile>
								<FinanceDetailTile>
									<span>{labels.hotel}</span>
									<strong>{titleCase(financeModal.reservation?.hotelName || "-")}</strong>
								</FinanceDetailTile>
								<FinanceDetailTile>
									<span>{labels.total}</span>
									<strong>
										{formatMoney(financeModalTotalAmount)} {labels.sar}
									</strong>
								</FinanceDetailTile>
							</FinanceDetailGrid>
							{financeAgentInfo ? (
								<FinanceAgentCard>
									<FinancePanelTitle>
										{labels.agent || labels.commissionAgent}
									</FinancePanelTitle>
									<FinanceDetailGrid>
										<FinanceDetailTile>
											<span>{labels.name || "Name"}</span>
											<strong>{titleCase(financeAgentInfo.name || "-")}</strong>
										</FinanceDetailTile>
										<FinanceDetailTile>
											<span>{labels.agentCompany}</span>
											<strong>
												{titleCase(financeAgentInfo.companyName || "-")}
											</strong>
										</FinanceDetailTile>
										<FinanceDetailTile>
											<span>{labels.email || "Email"}</span>
											<strong>{financeAgentInfo.email || "-"}</strong>
										</FinanceDetailTile>
										<FinanceDetailTile $tone='agentModel'>
											<span>{labels.agentModel}</span>
											<strong>
												{commercialModelLabel(
													financeAgentInfo.agentCommercialModel ||
														financeModal.reservation?.agentWalletSnapshot
															?.commercialModel,
													labels
												)}
											</strong>
										</FinanceDetailTile>
									</FinanceDetailGrid>
								</FinanceAgentCard>
							) : (
								<FinanceInfoStrip>{labels.noAgentForSource}</FinanceInfoStrip>
							)}
							{financeModal.reservation ? (
								<PendingReservationInventoryBrief
									reservation={financeModal.reservation}
									currentInventory={financeInventory.rows}
									loading={financeInventory.loading}
									isArabic={isRTL}
								/>
							) : null}
						</FinanceContextPanel>
						<FinanceControlsPanel>
							<FinancePanelTitle>{labels.financeReview}</FinancePanelTitle>
							<FinanceField>
								<strong>{labels.financeSettlementModel}</strong>
								<Select
									value={financeModal.settlementModel}
									onChange={(value) =>
										setFinanceModal((previous) => ({
											...previous,
											settlementModel: value,
										}))
									}
									options={financeSettlementOptions}
								/>
							</FinanceField>
							{financeModal.settlementModel === "agent_wallet_commission" ? (
								<FinanceDetailGrid>
									<FinanceDetailTile>
										<span>{labels.walletBalanceBefore}</span>
										<strong>
											{formatMoney(financeWalletBalanceBefore)}{" "}
											{labels.sar}
										</strong>
									</FinanceDetailTile>
									<FinanceDetailTile>
										<span>{labels.reservationWalletAmount}</span>
										<strong>
											{formatMoney(financeWalletDeduction)}{" "}
											{labels.sar}
										</strong>
									</FinanceDetailTile>
									<FinanceDetailTile>
										<span>{labels.walletBalanceAfter}</span>
										<strong dir='ltr'>
											{formatMoney(financeWalletBalanceAfter)}{" "}
											{labels.sar}
										</strong>
									</FinanceDetailTile>
								</FinanceDetailGrid>
							) : null}
							<FinanceField>
								<strong>{labels.commission}</strong>
								<InputNumber
									min={0}
									value={financeModal.commission}
									onChange={(value) =>
										setFinanceModal((previous) => ({
											...previous,
											commission: Number(value || 0),
										}))
									}
									addonAfter={labels.sar}
								/>
							</FinanceField>
							<CommissionPercentCard $isRTL={isRTL}>
								<span>{labels.commissionPercentOfTotal}</span>
								<strong dir='ltr'>
									{financeCommissionPercent === null
										? "-"
										: `${formatPercent(financeCommissionPercent)}%`}
								</strong>
								<small dir='ltr'>
									{formatMoney(financeCommissionAmount)} /{" "}
									{formatMoney(financeModalTotalAmount)} {labels.sar}
								</small>
							</CommissionPercentCard>
							<FinanceReviewSummary>
								<span>{labels.totalReview}</span>
								<strong>
									{formatMoney(financeModalTotalAmount)} {labels.sar}
								</strong>
							</FinanceReviewSummary>
							<FinanceField>
								<strong>{labels.commissionStatus}</strong>
								<Select
									value={financeModal.commissionStatus}
									onChange={(value) =>
										setFinanceModal((previous) => ({
											...previous,
											commissionStatus: value,
											commissionPaid: value === "commission paid",
										}))
									}
									options={[
										{ value: "commission due", label: labels.commissionDue },
										{ value: "commission paid", label: labels.commissionPaid },
										{ value: "no commission due", label: labels.commissionNone },
									]}
								/>
							</FinanceField>
							<FinanceModalActions $isRTL={isRTL}>
								<Button onClick={closeFinanceModal}>{labels.cancel}</Button>
								<Button
									danger
									icon={<CloseCircleOutlined />}
									loading={actionLoading}
									onClick={openFinanceRejectionModal}
								>
									{labels.rejectFinance}
								</Button>
								<Button
									type='primary'
									icon={<CheckCircleOutlined />}
									loading={actionLoading}
									onClick={submitFinanceUpdate}
								>
									{labels.acceptFinance || labels.saveFinance}
								</Button>
							</FinanceModalActions>
						</FinanceControlsPanel>
					</FinanceModalFrame>
				</div>
			</Modal>

			<Modal
				open={financeRejectionModal.open}
				onCancel={closeFinanceRejectionModal}
				title={labels.financeRejectTitle}
				footer={null}
				destroyOnClose
				centered
				width='min(94vw, 520px)'
			>
				<FinanceRejectModalBody $isRTL={isRTL}>
					<FinanceRejectIntro>
						<strong>{financeModal.reservation?.confirmation_number || "-"}</strong>
						<span>
							{formatMoney(financeModalTotalAmount)} {labels.sar}
						</span>
					</FinanceRejectIntro>
					<FinanceField>
						<strong>{labels.financeRejectType}</strong>
						<Select
							value={financeRejectionModal.rejectionType}
							onChange={(value) =>
								setFinanceRejectionModal((previous) => ({
									...previous,
									rejectionType: value,
								}))
							}
							options={financeRejectionOptions}
						/>
					</FinanceField>
					<FinanceField>
						<strong>{labels.financeRejectComment}</strong>
						<Input.TextArea
							rows={4}
							value={financeRejectionModal.comment}
							placeholder={labels.financeRejectPlaceholder}
							onChange={(event) =>
								setFinanceRejectionModal((previous) => ({
									...previous,
									comment: event.target.value,
								}))
							}
						/>
					</FinanceField>
					<FinanceModalActions $isRTL={isRTL}>
						<Button onClick={closeFinanceRejectionModal}>
							{labels.cancel}
						</Button>
						<Button
							danger
							type='primary'
							icon={<CloseCircleOutlined />}
							loading={actionLoading}
							onClick={submitFinanceRejection}
						>
							{labels.financeRejectSubmit}
						</Button>
					</FinanceModalActions>
				</FinanceRejectModalBody>
			</Modal>
		</FinancialPageShell>
	);
};

const FinancialPageShell = styled(OverallPageShell)`
	${({ $adminTheme }) =>
		$adminTheme &&
		css`
			--pms-metal-purple: var(--admin-metal-blue, #155d95);
			--pms-metal-purple-lift: var(--admin-metal-blue-lift, #2490c8);
			--pms-metal-purple-bg: var(
				--admin-metal-blue-bg,
				linear-gradient(135deg, #071827 0%, #0d3f6a 52%, #155d95 100%)
			);
			--finance-header-glow: rgba(21, 93, 149, 0.08);
			--finance-tab-accent: var(--admin-metal-blue-lift, #2490c8);
			--finance-tab-active-bg: linear-gradient(
				135deg,
				#071827 0%,
				#0d3f6a 52%,
				#155d95 100%
			);
			--finance-tab-active-shadow: 0 10px 24px rgba(8, 50, 87, 0.26),
				inset 0 1px rgba(255, 255, 255, 0.14);
			--finance-tab-count-ink: #0d3f6a;

			${OverallToolbar} {
				border-color: #c9dff2;
				background: linear-gradient(180deg, #f8fcff 0%, #edf6fd 100%);
				box-shadow:
					inset 0 1px #ffffff,
					0 8px 22px rgba(8, 42, 75, 0.08);
			}

			${OverallToolbar} > input:focus,
			${OverallToolbar} > select:focus,
			${OverallToolbar} .overall-filter-select.ant-select-focused .ant-select-selector,
			${OverallToolbar} .overall-date-picker.ant-picker-focused {
				box-shadow: 0 0 0 3px rgba(36, 144, 200, 0.15) !important;
			}

			${OverallToolbar} button {
				border-color: rgba(36, 144, 200, 0.92);
				box-shadow:
					inset 0 1px rgba(255, 255, 255, 0.2),
					0 9px 20px rgba(8, 42, 75, 0.22);
			}

			${OverallToolbar} button:hover {
				box-shadow:
					inset 0 1px rgba(255, 255, 255, 0.24),
					0 12px 24px rgba(8, 50, 87, 0.28);
			}

			${OverallToolbar} button.secondary {
				border-color: #b9d7ec;
				background: linear-gradient(180deg, #ffffff 0%, #eef7fd 100%);
				color: #183b5b;
				box-shadow: 0 5px 14px rgba(8, 50, 87, 0.1);
			}

			${OverallToolbar} button.secondary:hover {
				background: #eaf5fc;
			}

			${ActionButton} {
				border-color: rgba(36, 144, 200, 0.92);
				box-shadow:
					inset 0 1px rgba(255, 255, 255, 0.2),
					0 7px 16px rgba(8, 50, 87, 0.2);
			}

			${ActionButton}:not(:disabled):hover {
				border-color: #d7f3ff;
			}
		`}
`;

const AdminFinanceModalGlobalStyle = createGlobalStyle`
	.${PENDING_REVIEW_MODAL_CLASS}.overall-finance-review-modal.admin-finance-review-modal {
		top: calc(var(--admin-topbar-height, 84px) + 12px) !important;
		padding-bottom: 12px;
	}

	.${PENDING_REVIEW_MODAL_CLASS}.overall-finance-review-modal.admin-finance-review-modal
		.ant-modal-content {
		display: flex;
		max-height: calc(100vh - var(--admin-topbar-height, 84px) - 24px);
		overflow: hidden;
		border: 1px solid rgba(36, 144, 200, 0.42);
		box-shadow:
			0 24px 64px rgba(7, 24, 39, 0.34),
			inset 0 1px rgba(255, 255, 255, 0.9);
	}

	.${PENDING_REVIEW_MODAL_CLASS}.overall-finance-review-modal.admin-finance-review-modal
		.ant-modal-header {
		flex: 0 0 auto;
		padding-bottom: 12px;
		border-bottom: 1px solid #d7e7f8;
	}

	.${PENDING_REVIEW_MODAL_CLASS}.overall-finance-review-modal.admin-finance-review-modal
		.ant-modal-title {
		color: var(--admin-metal-blue-deep, #0e3157);
		font-weight: 950;
	}

	.${PENDING_REVIEW_MODAL_CLASS}.overall-finance-review-modal.admin-finance-review-modal
		.ant-modal-body {
		max-height: calc(100vh - var(--admin-topbar-height, 84px) - 92px);
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-gutter: stable;
	}

	.${PENDING_REVIEW_MODAL_CLASS}.overall-finance-review-modal.admin-finance-review-modal
		.ant-btn-primary:not(.ant-btn-dangerous) {
		border-color: rgba(36, 144, 200, 0.92);
		background: var(
			--admin-metal-blue-bg,
			linear-gradient(135deg, #071827 0%, #0d3f6a 52%, #155d95 100%)
		);
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.2),
			0 9px 20px rgba(8, 42, 75, 0.22);
	}

	@media (max-width: 640px) {
		.${PENDING_REVIEW_MODAL_CLASS}.overall-finance-review-modal.admin-finance-review-modal {
			top: calc(var(--admin-topbar-height, 112px) + 8px) !important;
			padding-bottom: 8px;
		}

		.${PENDING_REVIEW_MODAL_CLASS}.overall-finance-review-modal.admin-finance-review-modal
			.ant-modal-content {
			max-height: calc(100vh - var(--admin-topbar-height, 112px) - 16px);
		}

		.${PENDING_REVIEW_MODAL_CLASS}.overall-finance-review-modal.admin-finance-review-modal
			.ant-modal-body {
			max-height: calc(100vh - var(--admin-topbar-height, 112px) - 84px);
		}
	}
`;

const FinancialSectionHeader = styled.header`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 14px;
	border: 1px solid #d7e7f8;
	border-radius: 8px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.98)),
		linear-gradient(
			135deg,
			rgba(36, 84, 125, 0.08),
			var(--finance-header-glow, rgba(100, 22, 110, 0.05))
		);
	box-shadow:
		inset 0 1px rgba(255, 255, 255, 0.75),
		0 8px 22px rgba(15, 40, 66, 0.06);

	div {
		display: grid;
		gap: 3px;
		min-width: 0;
	}

	strong {
		color: #102033;
		font-size: 1rem;
		font-weight: 950;
		line-height: 1.35;
	}

	span {
		color: #53627a;
		font-size: 0.78rem;
		font-weight: 850;
		line-height: 1.45;
	}

	.ant-tag {
		flex: 0 0 auto;
		margin: 0;
		border-radius: 999px;
		font-weight: 900;
	}

	@media (max-width: 640px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const FinancialTabs = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 8px;
	padding: 8px;
	border: 1px solid #d7e7f8;
	border-radius: 8px;
	background: linear-gradient(135deg, #ffffff 0%, #f7fbff 100%);
	box-shadow: 0 8px 22px rgba(15, 40, 66, 0.05);

	button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-width: 0;
		min-height: 42px;
		padding: 8px 12px;
		border: 1px solid #cfdced;
		border-radius: 6px;
		background: #fbfdff;
		color: #102033;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 950;
		text-align: ${({ $isRTL }) => ($isRTL ? "right" : "left")};
		transition:
			background 0.2s ease,
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			color 0.2s ease;
	}

	button:hover,
	button[data-active="true"] {
		border-color: var(--finance-tab-accent, #64166e);
		background: var(
			--finance-tab-active-bg,
			linear-gradient(135deg, #3d0b48 0%, #792286 100%)
		);
		color: #ffffff;
		box-shadow: var(--finance-tab-active-shadow, 0 10px 22px rgba(82, 20, 93, 0.18));
	}

	span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	strong {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 30px;
		height: 24px;
		padding: 0 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.86);
		color: var(--finance-tab-count-ink, #2c1634);
		font-size: 0.8rem;
		font-weight: 950;
	}

	button:not([data-active="true"]) strong {
		background: #eef6ff;
		color: #24547d;
	}

	@media (max-width: 780px) {
		grid-template-columns: 1fr;
	}
`;

const FinancialTabPanel = styled.section`
	display: grid;
	gap: 10px;
	min-width: 0;
`;

const TabActionBar = styled.div`
	display: flex;
	align-items: center;
	justify-content: ${({ $isRTL }) => ($isRTL ? "flex-start" : "flex-end")};
	gap: 8px;
	flex-wrap: wrap;
	padding: 8px 10px;
	border: 1px solid #d7e7f8;
	border-radius: 7px;
	background: #fbfdff;

	.ant-tag {
		margin: 0;
		border-radius: 999px;
		font-weight: 900;
	}

	.ant-btn {
		border-radius: 7px;
		font-weight: 900;
	}

	@media (max-width: 640px) {
		align-items: stretch;
		flex-direction: column;

		.ant-btn {
			width: 100%;
		}
	}
`;

const FinanceModalFrame = styled.div`
	display: grid;
	grid-template-columns: ${({ $hasAgent }) =>
		$hasAgent ? "minmax(0, 1.08fr) minmax(340px, 0.92fr)" : "minmax(0, 1fr) minmax(340px, 0.82fr)"};
	gap: 14px;
	align-items: start;
	direction: ${({ $isRTL }) => ($isRTL ? "rtl" : "ltr")};
	text-align: ${({ $isRTL }) => ($isRTL ? "right" : "left")};

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const FinanceContextPanel = styled.section`
	display: grid;
	gap: 10px;
	min-width: 0;
`;

const FinanceControlsPanel = styled.section`
	display: grid;
	gap: 10px;
	min-width: 0;
	padding: 12px;
	border: 1px solid #d7e7f8;
	border-radius: 8px;
	background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
	box-shadow: 0 10px 26px rgba(15, 40, 66, 0.06);
`;

const FinancePanelTitle = styled.strong`
	display: block;
	color: #102033;
	font-size: 0.9rem;
	font-weight: 950;
	line-height: 1.35;
`;

const FinanceDetailGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;

	@media (max-width: 520px) {
		grid-template-columns: 1fr;
	}
`;

const FinanceDetailTile = styled.div`
	display: grid;
	gap: 4px;
	min-width: 0;
	padding: 8px 10px;
	border: 1px solid ${({ $tone }) =>
		$tone === "agentModel" ? "#b7eadf" : "#d7e7f8"};
	border-radius: 7px;
	background: ${({ $tone }) =>
		$tone === "agentModel"
			? "linear-gradient(135deg, #ebfff8 0%, #f7fffc 100%)"
			: "#fbfdff"};
	border-inline-start: ${({ $tone }) =>
		$tone === "agentModel" ? "4px solid #22c55e" : "1px solid #d7e7f8"};

	span {
		color: ${({ $tone }) => ($tone === "agentModel" ? "#047857" : "#53627a")};
		font-size: 0.72rem;
		font-weight: 900;
	}

	strong {
		color: ${({ $tone }) => ($tone === "agentModel" ? "#064e3b" : "#102033")};
		font-size: 0.84rem;
		font-weight: 950;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
`;

const FinanceAgentCard = styled.section`
	display: grid;
	gap: 8px;
	padding: 12px;
	border: 1px solid #a7e3d4;
	border-radius: 8px;
	background: linear-gradient(135deg, #ecfdf7 0%, #f8fffc 50%, #ffffff 100%);
	box-shadow: 0 10px 24px rgba(16, 185, 129, 0.08);
`;

const FinanceInfoStrip = styled.div`
	padding: 10px 12px;
	border: 1px solid #d7e7f8;
	border-radius: 8px;
	background: #f6fbff;
	color: #37516b;
	font-size: 0.8rem;
	font-weight: 850;
	line-height: 1.55;
`;

const FinanceField = styled.label`
	display: grid;
	gap: 6px;
	min-width: 0;

	> strong {
		color: #203044;
		font-size: 0.78rem;
		font-weight: 950;
		line-height: 1.35;
	}

	.ant-select,
	.ant-input-number,
	.ant-input-number-group-wrapper,
	.ant-input {
		width: 100%;
	}
`;

const FinanceReviewSummary = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 10px 12px;
	border: 1px solid #d7e7f8;
	border-radius: 7px;
	background: #fbfdff;

	span {
		color: #53627a;
		font-size: 0.78rem;
		font-weight: 900;
	}

	strong {
		color: #102033;
		font-size: 0.9rem;
		font-weight: 950;
	}
`;

const CommissionPercentCard = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: 4px 10px;
	padding: 10px 12px;
	border: 1px solid #c9e7ff;
	border-radius: 8px;
	background: linear-gradient(135deg, #f2f9ff 0%, #ffffff 100%);
	direction: ${({ $isRTL }) => ($isRTL ? "rtl" : "ltr")};
	text-align: ${({ $isRTL }) => ($isRTL ? "right" : "left")};

	span {
		color: #245172;
		font-size: 0.78rem;
		font-weight: 950;
	}

	strong {
		color: #0b4a6f;
		font-size: 1rem;
		font-weight: 950;
		white-space: nowrap;
	}

	small {
		grid-column: 1 / -1;
		color: #5f6f82;
		font-size: 0.72rem;
		font-weight: 850;
		text-align: ${({ $isRTL }) => ($isRTL ? "right" : "left")};
	}

	@media (max-width: 520px) {
		grid-template-columns: 1fr;

		strong {
			justify-self: start;
		}
	}
`;

const FinanceModalActions = styled.div`
	display: flex;
	justify-content: ${({ $isRTL }) => ($isRTL ? "flex-start" : "flex-end")};
	gap: 8px;
	flex-wrap: wrap;
	padding-top: 2px;

	@media (max-width: 520px) {
		.ant-btn {
			flex: 1 1 100%;
		}
	}
`;

const FinanceRejectModalBody = styled.div`
	display: grid;
	gap: 12px;
	direction: ${({ $isRTL }) => ($isRTL ? "rtl" : "ltr")};
	text-align: ${({ $isRTL }) => ($isRTL ? "right" : "left")};
`;

const FinanceRejectIntro = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 10px 12px;
	border: 1px solid #ffd6d6;
	border-radius: 8px;
	background: linear-gradient(135deg, #fff7f7 0%, #ffffff 100%);

	strong {
		color: #7f1d1d;
		font-size: 0.9rem;
		font-weight: 950;
	}

	span {
		color: #102033;
		font-size: 0.84rem;
		font-weight: 900;
	}

	@media (max-width: 520px) {
		align-items: flex-start;
		flex-direction: column;
	}
`;

const ActionReviewDetails = styled.div`
	display: grid;
	gap: 10px;
	text-align: ${({ $isRTL }) => ($isRTL ? "right" : "left")};

	p {
		margin: 0;
		color: #53627a;
		font-size: 0.84rem;
		font-weight: 850;
		line-height: 1.5;
	}

	dl {
		display: grid;
		gap: 7px;
		margin: 0;
	}

	dl > div {
		display: grid;
		grid-template-columns: minmax(90px, 0.4fr) minmax(0, 1fr);
		gap: 10px;
		align-items: center;
		padding: 7px 8px;
		border: 1px solid #e2e8f3;
		border-radius: 6px;
		background: #fbfdff;
	}

	dt,
	dd {
		margin: 0;
		min-width: 0;
	}

	dt {
		color: #53627a;
		font-size: 0.76rem;
		font-weight: 900;
	}

	dd {
		color: #102033;
		font-size: 0.84rem;
		font-weight: 950;
		word-break: break-word;
	}

	@media (max-width: 520px) {
		dl > div {
			grid-template-columns: 1fr;
			gap: 3px;
		}
	}
`;

const RejectDialogContent = styled.div`
	display: grid;
	gap: 10px;

	p {
		margin: 0;
		color: #53627a;
		font-size: 0.82rem;
		font-weight: 850;
		line-height: 1.5;
	}

	strong {
		color: #102033;
		font-size: 0.8rem;
		font-weight: 950;
	}
`;

export default OverallFinancialActions;
