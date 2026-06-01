import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, DatePicker, Input, InputNumber, Modal, Select, Spin, Table, Tag, message } from "antd";
import {
	CalendarOutlined,
	CheckCircleOutlined,
	CloseCircleOutlined,
	EditOutlined,
	ExclamationCircleOutlined,
	PaperClipOutlined,
	PlusOutlined,
	ReloadOutlined,
	StopOutlined,
	WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import {
	createAgentWalletClaim,
	createAgentWalletTransaction,
	getAgentWalletSummary,
	reviewAgentWalletClaim,
	updateAgentWalletTransaction,
} from "../../apiAdmin";
import {
	buildOwnerParams,
	formatDate,
	getOverallText,
	normalizeId,
	OverallPageShell,
	titleCase,
} from "../overallShared";

const TEXT = {
	en: {
		title: "Agent Wallet Management",
		subtitle:
			"Add or update each agent's general wallet across your assigned overall reservation scope.",
		addTab: "Add new",
		updateTab: "Update",
		entryTitle: "Wallet movement details",
		updatePromptTitle: "Choose a wallet movement to update",
		updatePrompt:
			"Use the wallet movements table below, then click Update on the movement you want to edit.",
		hotel: "Hotel",
		chooseHotel: "Choose hotel",
		chooseHotelFirst: "Choose a hotel first to load agents and wallet movements.",
		agent: "Agent",
		chooseAgent: "Choose agent",
		allAgents: "All agents",
		type: "Movement type",
		amount: "Amount",
		date: "Date",
		reference: "Reference",
		note: "Note",
		attachments: "Attachments",
		attachmentHint: "PDF or image receipts, up to 8 files, 10MB each, 32MB total.",
		attachmentCount: "Attached",
		noAttachments: "No receipts attached yet.",
		uploadAttachments: "Attach receipts",
		attachmentTooLarge: "Each attachment must be 10MB or smaller.",
		attachmentInvalid: "Only PDF and image attachments are allowed.",
		attachmentLimit: "You can attach up to 8 files.",
		attachmentTotalTooLarge: "Attachments must be 32MB total or smaller.",
		viewAttachment: "View",
		removeAttachment: "Remove",
		pendingUpload: "Ready to upload",
		status: "Status",
		source: "Source",
		manual: "Manual",
		agentClaim: "Agent claim",
		reservation: "Reservation",
		posted: "Posted",
		pendingReview: "Pending finance approval",
		rejectedStatus: "Rejected",
		approve: "Approve",
		reject: "Reject",
		rejectForCorrection: "Reject for correction",
		rejectFinal: "Final reject",
		claimApproved: "Wallet claim approved.",
		claimRejected: "Wallet claim rejected.",
		rejectionReason: "Write the rejection reason",
		rejectClaimTitle: "Reject wallet claim?",
		correctionRejectTitle: "Reject wallet claim for correction?",
		finalRejectTitle: "Final rejection for wallet claim?",
		correctionRejectHint:
			"The agent can submit a corrected claim after reviewing this reason.",
		finalRejectHint:
			"This closes the claim as finally rejected, with no correction follow-up.",
		correctionRequiredStatus: "Needs correction",
		finalRejectedStatus: "Final rejection",
		allWalletData: "All agent wallet data",
		formAgentHint:
			"Choose an agent to add a new movement. Existing movements are managed from the Update tab.",
		pendingClaimAmount: "Pending claims",
		from: "From",
		to: "To",
		refresh: "Refresh",
		newEntry: "Clear form",
		save: "Save wallet movement",
		update: "Update wallet movement",
		claimWalletCredit: "Submit wallet claim",
		claimSubmitted: "Wallet claim submitted for finance approval.",
		attachmentRequired: "Please attach a receipt before submitting a wallet claim.",
		selfAgent: "Your agent account",
		selfAgentHint: "Wallet claims are submitted under your signed-in agent account.",
		cancelEdit: "Cancel edit",
		edit: "Update",
		actions: "Actions",
		walletAdded: "Wallet added",
		walletUsed: "Reservation deductions",
		balance: "Current balance",
		transactions: "Wallet movements",
		agents: "Agents",
		deposit: "Deposit / agent paid hotel",
		debit: "Manual deduction",
		adjustment: "Adjustment",
		refund: "Refund",
		model: "Model",
		commissionOnly: "Commission only",
		walletInventory: "Inventory wallet",
		mixedModel: "Wallet + commission",
		required: "Please choose an agent and enter an amount.",
		agentClaimRequired: "Please enter an amount for your wallet claim.",
		saved: "Wallet movement saved.",
		updated: "Wallet movement updated.",
		error: "Unable to load wallet data.",
		saveError: "Unable to save wallet movement.",
		noHotels: "No hotels are available for your financial scope.",
		noData: "No wallet data found.",
		optional: "Optional",
		requiredMark: "Required",
	},
	ar: {
		title: "\u0625\u062f\u0627\u0631\u0629 \u0645\u062d\u0627\u0641\u0638 \u0627\u0644\u0648\u0643\u0644\u0627\u0621",
		subtitle:
			"\u0623\u0636\u0641 \u0623\u0648 \u0639\u062f\u0644 \u062d\u0631\u0643\u0627\u062a \u0645\u062d\u0641\u0638\u0629 \u0643\u0644 \u0648\u0643\u064a\u0644 \u0628\u0634\u0643\u0644 \u0639\u0627\u0645 \u0636\u0645\u0646 \u0646\u0637\u0627\u0642 \u062d\u062c\u0648\u0632\u0627\u062a\u0643 \u0627\u0644\u0645\u0635\u0631\u062d.",
		addTab: "\u0625\u0636\u0627\u0641\u0629 \u062c\u062f\u064a\u062f\u0629",
		updateTab: "\u062a\u062d\u062f\u064a\u062b",
		entryTitle: "\u062a\u0641\u0627\u0635\u064a\u0644 \u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
		updatePromptTitle:
			"\u0627\u062e\u062a\u0631 \u062d\u0631\u0643\u0629 \u0645\u062d\u0641\u0638\u0629 \u0644\u062a\u062d\u062f\u064a\u062b\u0647\u0627",
		updatePrompt:
			"\u0627\u0633\u062a\u062e\u062f\u0645 \u062c\u062f\u0648\u0644 \u062d\u0631\u0643\u0627\u062a \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u0623\u062f\u0646\u0627\u0647\u060c \u062b\u0645 \u0627\u0636\u063a\u0637 \u062a\u062d\u062f\u064a\u062b \u0639\u0644\u0649 \u0627\u0644\u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.",
		hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
		chooseHotel: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0646\u062f\u0642",
		chooseHotelFirst:
			"\u0627\u062e\u062a\u0631 \u0641\u0646\u062f\u0642\u0627 \u0623\u0648\u0644\u0627 \u0644\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0648\u062d\u0631\u0643\u0627\u062a \u0627\u0644\u0645\u062d\u0641\u0638\u0629.",
		agent: "\u0627\u0644\u0648\u0643\u064a\u0644",
		chooseAgent: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0648\u0643\u064a\u0644",
		allAgents: "\u0643\u0644 \u0627\u0644\u0648\u0643\u0644\u0627\u0621",
		type: "\u0646\u0648\u0639 \u0627\u0644\u062d\u0631\u0643\u0629",
		amount: "\u0627\u0644\u0645\u0628\u0644\u063a",
		date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
		reference: "\u0645\u0631\u062c\u0639",
		note: "\u0645\u0644\u0627\u062d\u0638\u0629",
		attachments: "\u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a",
		attachmentHint:
			"PDF \u0623\u0648 \u0635\u0648\u0631\u060c \u0628\u062d\u062f \u0623\u0642\u0635\u0649 8 \u0645\u0644\u0641\u0627\u062a\u060c 10MB \u0644\u0643\u0644 \u0645\u0644\u0641\u060c \u064832MB \u0625\u062c\u0645\u0627\u0644\u064a.",
		attachmentCount: "\u0627\u0644\u0645\u0631\u0641\u0642",
		noAttachments:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u064a\u0635\u0627\u0644\u0627\u062a \u0645\u0631\u0641\u0642\u0629 \u062d\u062a\u0649 \u0627\u0644\u0622\u0646.",
		uploadAttachments: "\u0625\u0631\u0641\u0627\u0642 \u0625\u064a\u0635\u0627\u0644\u0627\u062a",
		attachmentTooLarge:
			"\u062d\u062c\u0645 \u0643\u0644 \u0645\u0631\u0641\u0642 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 10MB \u0623\u0648 \u0623\u0642\u0644.",
		attachmentInvalid:
			"\u0627\u0644\u0645\u0633\u0645\u0648\u062d \u0641\u0642\u0637 PDF \u0623\u0648 \u0635\u0648\u0631.",
		attachmentLimit:
			"\u064a\u0645\u0643\u0646 \u0625\u0631\u0641\u0627\u0642 8 \u0645\u0644\u0641\u0627\u062a \u0643\u062d\u062f \u0623\u0642\u0635\u0649.",
		attachmentTotalTooLarge:
			"\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 32MB \u0623\u0648 \u0623\u0642\u0644.",
		viewAttachment: "\u0639\u0631\u0636",
		removeAttachment: "\u062d\u0630\u0641",
		pendingUpload: "\u062c\u0627\u0647\u0632 \u0644\u0644\u0631\u0641\u0639",
		status: "\u0627\u0644\u062d\u0627\u0644\u0629",
		source: "\u0627\u0644\u0645\u0635\u062f\u0631",
		manual: "\u064a\u062f\u0648\u064a",
		agentClaim: "\u0645\u0637\u0627\u0644\u0628\u0629 \u0648\u0643\u064a\u0644",
		reservation: "\u062d\u062c\u0632",
		posted: "\u0645\u0639\u062a\u0645\u062f",
		pendingReview: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
		rejectedStatus: "\u0645\u0631\u0641\u0648\u0636",
		approve: "\u0645\u0648\u0627\u0641\u0642\u0629",
		reject: "\u0631\u0641\u0636",
		rejectForCorrection: "\u0631\u0641\u0636 \u0644\u0644\u062a\u0635\u062d\u064a\u062d",
		rejectFinal: "\u0631\u0641\u0636 \u0646\u0647\u0627\u0626\u064a",
		claimApproved: "\u062a\u0645\u062a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629.",
		claimRejected: "\u062a\u0645 \u0631\u0641\u0636 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629.",
		rejectionReason: "\u0627\u0643\u062a\u0628 \u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636",
		rejectClaimTitle: "\u0631\u0641\u0636 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629\u061f",
		correctionRejectTitle:
			"\u0631\u0641\u0636 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u0644\u0644\u062a\u0635\u062d\u064a\u062d\u061f",
		finalRejectTitle:
			"\u0631\u0641\u0636 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u0646\u0647\u0627\u0626\u064a\u0627\u061f",
		correctionRejectHint:
			"\u0627\u0644\u0648\u0643\u064a\u0644 \u064a\u0633\u062a\u0637\u064a\u0639 \u0625\u0631\u0633\u0627\u0644 \u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u0635\u062d\u062d\u0629 \u0628\u0639\u062f \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0633\u0628\u0628.",
		finalRejectHint:
			"\u0647\u0630\u0627 \u0631\u0641\u0636 \u0646\u0647\u0627\u0626\u064a \u0648\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u062a\u0627\u0628\u0639\u0629 \u062a\u0635\u062d\u064a\u062d \u0644\u0647\u0630\u0647 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629.",
		correctionRequiredStatus:
			"\u064a\u062d\u062a\u0627\u062c \u062a\u0635\u062d\u064a\u062d",
		finalRejectedStatus:
			"\u0645\u0631\u0641\u0648\u0636 \u0646\u0647\u0627\u0626\u064a\u0627",
		allWalletData:
			"\u0643\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062d\u0627\u0641\u0638 \u0627\u0644\u0648\u0643\u0644\u0627\u0621",
		formAgentHint:
			"\u0627\u062e\u062a\u0631 \u0627\u0644\u0648\u0643\u064a\u0644 \u0644\u0625\u0636\u0627\u0641\u0629 \u062d\u0631\u0643\u0629 \u062c\u062f\u064a\u062f\u0629. \u0627\u0644\u062d\u0631\u0643\u0627\u062a \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u062a\u062a\u0645 \u0625\u062f\u0627\u0631\u062a\u0647\u0627 \u0645\u0646 \u062a\u0628\u0648\u064a\u0628 \u0627\u0644\u062a\u062d\u062f\u064a\u062b.",
		pendingClaimAmount: "\u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
		from: "\u0645\u0646",
		to: "\u0625\u0644\u0649",
		refresh: "\u062a\u062d\u062f\u064a\u062b",
		newEntry: "\u0645\u0633\u062d \u0627\u0644\u0646\u0645\u0648\u0630\u062c",
		save: "\u062d\u0641\u0638 \u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
		update: "\u062a\u062d\u062f\u064a\u062b \u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
		claimWalletCredit:
			"\u0625\u0631\u0633\u0627\u0644 \u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u062d\u0641\u0638\u0629",
		claimSubmitted:
			"\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629.",
		attachmentRequired:
			"\u064a\u0631\u062c\u0649 \u0625\u0631\u0641\u0627\u0642 \u0625\u064a\u0635\u0627\u0644 \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629.",
		selfAgent: "\u062d\u0633\u0627\u0628\u0643 \u0643\u0648\u0643\u064a\u0644",
		selfAgentHint:
			"\u064a\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u0628\u0627\u0633\u0645 \u062d\u0633\u0627\u0628\u0643 \u0627\u0644\u0645\u0633\u062c\u0644.",
		cancelEdit: "\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u0639\u062f\u064a\u0644",
		edit: "\u062a\u0639\u062f\u064a\u0644",
		actions: "\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
		walletAdded: "\u0627\u0644\u0645\u0636\u0627\u0641 \u0644\u0644\u0645\u062d\u0641\u0638\u0629",
		walletUsed: "\u062e\u0635\u0648\u0645\u0627\u062a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		balance: "\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062d\u0627\u0644\u064a",
		transactions: "\u062d\u0631\u0643\u0627\u062a \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
		agents: "\u0627\u0644\u0648\u0643\u0644\u0627\u0621",
		deposit: "\u0625\u064a\u062f\u0627\u0639 / \u0627\u0644\u0648\u0643\u064a\u0644 \u062f\u0641\u0639 \u0644\u0644\u0641\u0646\u062f\u0642",
		debit: "\u062e\u0635\u0645 \u064a\u062f\u0648\u064a",
		adjustment: "\u062a\u0633\u0648\u064a\u0629",
		refund: "\u0627\u0633\u062a\u0631\u062f\u0627\u062f",
		model: "\u0627\u0644\u0646\u0645\u0648\u0630\u062c",
		commissionOnly: "\u0639\u0645\u0648\u0644\u0629 \u0641\u0642\u0637",
		walletInventory: "\u0645\u062d\u0641\u0638\u0629 \u0645\u062e\u0632\u0648\u0646",
		mixedModel: "\u0645\u062d\u0641\u0638\u0629 \u0648\u0639\u0645\u0648\u0644\u0629",
		required:
			"\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0648\u0643\u064a\u0644 \u0648\u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0645\u0628\u0644\u063a.",
		agentClaimRequired:
			"\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0645\u0628\u0644\u063a \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629.",
		saved: "\u062a\u0645 \u062d\u0641\u0638 \u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629.",
		updated: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629.",
		error: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062d\u0641\u0638\u0629.",
		saveError: "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u062d\u0641\u0638\u0629.",
		noHotels: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0641\u0646\u0627\u062f\u0642 \u0645\u062a\u0627\u062d\u0629 \u0644\u0646\u0637\u0627\u0642\u0643 \u0627\u0644\u0645\u0627\u0644\u064a.",
		noData: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062d\u0641\u0638\u0629.",
		optional: "\u0627\u062e\u062a\u064a\u0627\u0631\u064a",
		requiredMark: "\u0645\u0637\u0644\u0648\u0628",
	},
};

const transactionOptions = (txt) => [
	{ value: "deposit", label: txt.deposit },
	{ value: "debit", label: txt.debit },
	{ value: "adjustment", label: txt.adjustment },
	{ value: "refund", label: txt.refund },
];

const walletAttachmentLimit = 8;
const walletAttachmentMaxBytes = 10 * 1024 * 1024;
const walletAttachmentTotalMaxBytes = 32 * 1024 * 1024;
const today = () => new Date().toISOString().slice(0, 10);

const datePickerValue = (value = "") => {
	if (!value) return null;
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed : null;
};

const datePickerString = (value) => {
	if (!value) return today();
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD") : today();
};

const money = (value) =>
	Number(value || 0).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const fileToBase64 = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});

const isWalletAttachmentAllowed = (file = {}) =>
	String(file.type || "").startsWith("image/") ||
	file.type === "application/pdf" ||
	/\.pdf$/i.test(file.name || "");

const formatFileSize = (size = 0) => {
	const bytes = Number(size || 0);
	if (!bytes) return "";
	if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const attachmentLabel = (attachment = {}, index = 0) =>
	attachment.fileName || `Attachment ${index + 1}`;

const agentLabel = (agent = {}) =>
	[
		agent.companyName ? titleCase(agent.companyName) : "",
		agent.name ? titleCase(agent.name) : agent.email,
	]
		.filter(Boolean)
		.join(" - ") || "Agent";

const agentCommercialModel = (record = {}) =>
	record.commercialModel || record.agent?.agentCommercialModel || "wallet_inventory";

const commercialModelLabel = (record = {}, txt = TEXT.en) => {
	const model = agentCommercialModel(record);
	if (model === "commission_only") return txt.commissionOnly;
	if (model === "mixed") return txt.mixedModel;
	return txt.walletInventory;
};

const transactionSourceLabel = (value = "", txt = TEXT.en) => {
	const source = String(value || "manual").toLowerCase();
	if (source === "agent_claim") return txt.agentClaim;
	if (source === "reservation") return txt.reservation;
	return txt.manual;
};

const transactionStatusLabel = (row = {}, txt = TEXT.en) => {
	const status = String(row.status || "posted").toLowerCase();
	const reviewStatus = String(row.reviewStatus || "").toLowerCase();
	const rejectionType = String(row.rejectionType || "").toLowerCase();
	if (status === "pending" || reviewStatus === "pending") return txt.pendingReview;
	if (status === "rejected" || reviewStatus === "rejected") {
		return rejectionType === "final"
			? txt.finalRejectedStatus
			: txt.correctionRequiredStatus || txt.rejectedStatus;
	}
	return txt.posted;
};

const transactionStatusColor = (row = {}) => {
	const status = String(row.status || "").toLowerCase();
	const reviewStatus = String(row.reviewStatus || "").toLowerCase();
	if (status === "pending" || reviewStatus === "pending") return "orange";
	if (status === "rejected" || reviewStatus === "rejected") return "red";
	return "green";
};

const buildEmptyEntry = (agentId = "") => ({
	agentId,
	transactionType: "deposit",
	amount: 0,
	transactionDate: today(),
	reference: "",
	note: "",
	attachments: [],
});

const queryValue = (search = "", key = "") =>
	new URLSearchParams(search || "").get(key) || "";

const roleNumbers = (user = {}) => [
	...new Set([user.role, ...(Array.isArray(user.roles) ? user.roles : [])]
		.map(Number)
		.filter(Boolean)),
];

const roleDescriptions = (user = {}) => [
	String(user.roleDescription || "").toLowerCase(),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const isOrderTakerOnly = (user = {}) => {
	const roles = roleNumbers(user);
	const descriptions = roleDescriptions(user);
	const isAgent =
		roles.includes(7000) ||
		descriptions.includes("ordertaker") ||
		(Array.isArray(user.accessTo) && user.accessTo.includes("ownReservations"));
	const hasFullAccess =
		roles.some((role) => [1000, 2000, 3000, 6000, 10000].includes(role)) ||
		descriptions.some((description) =>
			["hotelmanager", "systemadmin", "system admin", "reception", "finance"].includes(
				description
			)
		);
	return isAgent && !hasFullAccess;
};

const OverallWalletManagement = ({
	userId,
	user,
	token,
	ownerId = "",
	chosenLanguage,
}) => {
	const isRTL = chosenLanguage === "Arabic";
	const txt = { ...getOverallText(chosenLanguage), ...TEXT[isRTL ? "ar" : "en"] };
	const history = useHistory();
	const location = useLocation();
	const dismissedTransactionIdRef = useRef("");
	const agentOnly = isOrderTakerOnly(user);
	const ownAgentId = normalizeId(user?._id);
	const queryTransactionId = normalizeId(queryValue(location.search, "transactionId"));
	const queryWalletTab =
		queryValue(location.search, "walletTab") === "update" || queryTransactionId
			? "update"
			: "add";
	const ownerParams = useMemo(() => buildOwnerParams(ownerId), [ownerId]);
	const [summary, setSummary] = useState(null);
	const [loadingWallets, setLoadingWallets] = useState(false);
	const [saving, setSaving] = useState(false);
	const [activeWalletTab, setActiveWalletTab] = useState(queryWalletTab);
	const [editingTransactionId, setEditingTransactionId] =
		useState(queryTransactionId);
	const [editModalOpen, setEditModalOpen] = useState(Boolean(queryTransactionId));
	const [entryTransactionId, setEntryTransactionId] = useState("");
	const [agentPage, setAgentPage] = useState(1);
	const [txPage, setTxPage] = useState(1);
	const [filters, setFilters] = useState({
		agentId: agentOnly ? ownAgentId : queryValue(location.search, "agentId"),
	});
	const [entry, setEntry] = useState(() =>
		buildEmptyEntry(agentOnly ? ownAgentId : queryValue(location.search, "agentId"))
	);

	const agentRows = useMemo(
		() => (Array.isArray(summary?.agents) ? summary.agents : []),
		[summary?.agents]
	);
	const visibleAgentRows = useMemo(
		() => agentRows,
		[agentRows]
	);
	const agentOptions = useMemo(
		() =>
			agentRows.map((item) => ({
				value: normalizeId(item.agent),
				label: agentLabel(item.agent),
			})),
		[agentRows]
	);
	const transactionRows = useMemo(
		() =>
			visibleAgentRows.flatMap((item) =>
				(Array.isArray(item.transactions) ? item.transactions : []).map((tx) => ({
					...tx,
					hotelId: normalizeId(tx.hotelId || tx.legacyHotelId),
					hotelName: tx.hotelName || "",
					agentId: normalizeId(item.agent),
					agentName: item.agent?.name || item.agent?.email || "",
					companyName: item.agent?.companyName || "",
				}))
			),
		[visibleAgentRows]
	);
	const entryAttachments = Array.isArray(entry.attachments) ? entry.attachments : [];
	const canManage = Boolean(summary?.canManage);
	const entryAgentRow = agentRows.find(
		(item) => normalizeId(item.agent) === normalizeId(entry.agentId)
	);
	const entryAgentIsCommissionOnly =
		agentCommercialModel(entryAgentRow) === "commission_only" ||
		entryAgentRow?.walletRequired === false;
	const canSubmitEntry =
		canManage || (agentOnly && !editingTransactionId && !entryAgentIsCommissionOnly);

	const syncQuery = useCallback(
		(
			nextFilters = filters,
			transactionId = editingTransactionId,
			walletTab = activeWalletTab
		) => {
			const params = new URLSearchParams(location.search || "");
			params.set("overall", "wallet-management");
			params.delete("hotelId");
			if (walletTab === "update") params.set("walletTab", "update");
			else params.delete("walletTab");
			["agentId"].forEach((key) => {
				if (nextFilters[key]) params.set(key, nextFilters[key]);
				else params.delete(key);
			});
			params.delete("startDate");
			params.delete("endDate");
			if (transactionId) params.set("transactionId", transactionId);
			else params.delete("transactionId");
			const nextSearch = `?${params.toString()}`;
			if (nextSearch !== location.search) {
				history.replace({ pathname: location.pathname, search: nextSearch });
			}
		},
		[
			activeWalletTab,
			editingTransactionId,
			filters,
			history,
			location.pathname,
			location.search,
		]
	);

	const loadWallets = useCallback(async () => {
		if (!userId || !token) {
			setSummary(null);
			return;
		}
		setLoadingWallets(true);
		try {
			const data = await getAgentWalletSummary("", userId, token, ownerParams);
			if (data?.error) {
				message.error(data.error || txt.error);
				setSummary(null);
				return;
			}
			setSummary(data);
		} catch (error) {
			message.error(txt.error);
			setSummary(null);
		} finally {
			setLoadingWallets(false);
		}
	}, [
		token,
		txt.error,
		ownerParams,
		userId,
	]);

	useEffect(() => {
		loadWallets();
	}, [loadWallets]);

	useEffect(() => {
		syncQuery(filters, editingTransactionId, activeWalletTab);
	}, [activeWalletTab, filters, editingTransactionId, syncQuery]);

	useEffect(() => {
		const nextTab =
			queryValue(location.search, "walletTab") === "update" ||
			normalizeId(queryValue(location.search, "transactionId"))
				? "update"
				: "add";
		setActiveWalletTab((current) => (current === nextTab ? current : nextTab));
		const nextTransactionId = normalizeId(queryValue(location.search, "transactionId"));
		if (nextTransactionId) {
			setEditingTransactionId(nextTransactionId);
			setEditModalOpen(true);
		} else {
			setEditingTransactionId("");
			setEntryTransactionId("");
			setEditModalOpen(false);
		}
	}, [location.search]);

	const updateFilter = (key, value) => {
		setAgentPage(1);
		setTxPage(1);
		setFilters((current) => {
			const next = { ...current, [key]: value || "" };
			if (key === "agentId") {
				setEntry((previous) => ({ ...previous, agentId: value || "" }));
			}
			return next;
		});
	};

	useEffect(() => {
		if (!agentOnly || !ownAgentId || filters.agentId === ownAgentId) return;
		setFilters((current) => ({ ...current, agentId: ownAgentId }));
		setEntry((current) => ({
			...current,
			agentId: ownAgentId,
			transactionType: editingTransactionId
				? current.transactionType || "deposit"
				: "deposit",
		}));
	}, [agentOnly, editingTransactionId, filters.agentId, ownAgentId]);

	const resetEntry = useCallback(() => {
		dismissedTransactionIdRef.current =
			editingTransactionId ||
			normalizeId(queryValue(location.search, "transactionId"));
		setEditingTransactionId("");
		setEntryTransactionId("");
		setEditModalOpen(false);
		setEntry(buildEmptyEntry(agentOnly ? ownAgentId : filters.agentId));
	}, [
		agentOnly,
		editingTransactionId,
		filters.agentId,
		location.search,
		ownAgentId,
	]);

	const closeEditModal = useCallback(() => {
		const currentTransactionId =
			editingTransactionId ||
			normalizeId(queryValue(location.search, "transactionId"));
		dismissedTransactionIdRef.current = currentTransactionId;
		setEditingTransactionId("");
		setEntryTransactionId("");
		setEditModalOpen(false);
		setEntry(buildEmptyEntry(agentOnly ? ownAgentId : filters.agentId));

		const params = new URLSearchParams(location.search || "");
		params.set("overall", "wallet-management");
		params.set("walletTab", "update");
		params.delete("transactionId");
		params.delete("hotelId");
		const nextSearch = `?${params.toString()}`;
		if (nextSearch !== location.search) {
			history.replace({ pathname: location.pathname, search: nextSearch });
		}
	}, [
		agentOnly,
		editingTransactionId,
		filters.agentId,
		history,
		location.pathname,
		location.search,
		ownAgentId,
	]);

	const switchWalletTab = (tab) => {
		setActiveWalletTab(tab);
		if (tab === "add") {
			resetEntry();
			return;
		}
		setEditingTransactionId("");
		setEntryTransactionId("");
		setEditModalOpen(false);
	};

	const editTransaction = useCallback((transaction = {}) => {
		const transactionId = normalizeId(transaction._id);
		if (!transactionId) return;
		dismissedTransactionIdRef.current = "";
		setActiveWalletTab("update");
		setEditingTransactionId(transactionId);
		setEntryTransactionId(transactionId);
		setEditModalOpen(true);
		setFilters((current) => ({
			...current,
			agentId: transaction.agentId || current.agentId,
		}));
		setEntry({
			agentId: transaction.agentId || "",
			transactionType: transaction.transactionType || "deposit",
			amount: Number(transaction.amount || 0),
			transactionDate: transaction.transactionDate
				? formatDate(transaction.transactionDate)
				: today(),
			reference: transaction.reference || "",
			note: transaction.note || "",
			attachments: Array.isArray(transaction.attachments)
				? transaction.attachments
				: [],
		});
	}, []);

	useEffect(() => {
		if (!queryTransactionId || !transactionRows.length) return;
		if (dismissedTransactionIdRef.current === queryTransactionId) return;
		const transaction = transactionRows.find(
			(row) => normalizeId(row._id) === queryTransactionId
		);
		if (!transaction || entryTransactionId === queryTransactionId) return;
		editTransaction(transaction);
	}, [editTransaction, entryTransactionId, queryTransactionId, transactionRows]);

	const handleAttachmentFiles = async (event) => {
		const files = Array.from(event.target.files || []);
		event.target.value = "";
		if (!files.length) return;
		const existing = Array.isArray(entry.attachments) ? entry.attachments : [];
		if (existing.length + files.length > walletAttachmentLimit) {
			message.error(txt.attachmentLimit);
			return;
		}
		const invalid = files.find((file) => !isWalletAttachmentAllowed(file));
		if (invalid) {
			message.error(txt.attachmentInvalid);
			return;
		}
		const oversized = files.find((file) => file.size > walletAttachmentMaxBytes);
		if (oversized) {
			message.error(txt.attachmentTooLarge);
			return;
		}
		const totalSize =
			existing.reduce((sum, attachment) => sum + Number(attachment.fileSize || 0), 0) +
			files.reduce((sum, file) => sum + Number(file.size || 0), 0);
		if (totalSize > walletAttachmentTotalMaxBytes) {
			message.error(txt.attachmentTotalTooLarge);
			return;
		}
		const nextAttachments = await Promise.all(
			files.map(async (file) => ({
				fileName: file.name,
				fileType: file.type || "application/octet-stream",
				fileSize: file.size,
				data: await fileToBase64(file),
			}))
		);
		setEntry((current) => ({
			...current,
			attachments: [...(Array.isArray(current.attachments) ? current.attachments : []), ...nextAttachments],
		}));
	};

	const removeEntryAttachment = (index) => {
		setEntry((current) => ({
			...current,
			attachments: (Array.isArray(current.attachments) ? current.attachments : []).filter(
				(_, itemIndex) => itemIndex !== index
			),
		}));
	};

	const saveEntry = async () => {
		const effectiveAgentId = agentOnly ? ownAgentId : entry.agentId;
		if (!effectiveAgentId || Number(entry.amount || 0) <= 0) {
			message.error(agentOnly ? txt.agentClaimRequired : txt.required);
			return;
		}
		if (agentOnly && !editingTransactionId && !entryAttachments.length) {
			message.error(txt.attachmentRequired);
			return;
		}
		setSaving(true);
		const payload = {
			agentId: effectiveAgentId,
			transactionType:
				agentOnly && !editingTransactionId ? "deposit" : entry.transactionType,
			amount: Number(entry.amount || 0),
			transactionDate: entry.transactionDate,
			reference: entry.reference,
			note: entry.note,
			attachments: entryAttachments,
		};
		try {
			const response = agentOnly && !editingTransactionId
				? await createAgentWalletClaim("", userId, token, payload, ownerParams)
				: editingTransactionId
				? await updateAgentWalletTransaction(
						"",
						userId,
						token,
						editingTransactionId,
						payload,
						ownerParams
				  )
				: await createAgentWalletTransaction(
						"",
						userId,
						token,
						payload,
						ownerParams
				  );
			if (response?.error) {
				message.error(isRTL && response.errorArabic ? response.errorArabic : response.error || txt.saveError);
				return;
			}
			message.success(
				agentOnly && !editingTransactionId
					? txt.claimSubmitted
					: editingTransactionId
					? txt.updated
					: txt.saved
			);
			resetEntry();
			loadWallets();
		} catch (error) {
			message.error(txt.saveError);
		} finally {
			setSaving(false);
		}
	};

	const reviewWalletClaim = async (
		transaction = {},
		action,
		reason = "",
		rejectionType = ""
	) => {
		const transactionId = normalizeId(transaction._id);
		if (!transactionId) return;
		setSaving(true);
		try {
			const response = await reviewAgentWalletClaim(
				"",
				userId,
				token,
				transactionId,
				{ action, rejectionReason: reason, rejectionType },
				ownerParams
			);
			if (response?.error) {
				message.error(response.error);
				return;
			}
			message.success(action === "approve" ? txt.claimApproved : txt.claimRejected);
			loadWallets();
		} catch (error) {
			message.error(txt.saveError);
		} finally {
			setSaving(false);
		}
	};

	const rejectWalletClaim = (transaction = {}, rejectionType = "correction_required") => {
		let reason = "";
		Modal.confirm({
			title:
				rejectionType === "final"
					? txt.finalRejectTitle
					: txt.correctionRejectTitle || txt.rejectClaimTitle,
			content: (
				<RejectDialogContent>
					<p>
						{rejectionType === "final"
							? txt.finalRejectHint
							: txt.correctionRejectHint}
					</p>
					<Input.TextArea
						rows={3}
						placeholder={txt.rejectionReason}
						onChange={(event) => {
							reason = event.target.value;
						}}
					/>
				</RejectDialogContent>
			),
			okText:
				rejectionType === "final"
					? txt.rejectFinal
					: txt.rejectForCorrection || txt.reject,
			cancelText: txt.cancel || "Cancel",
			okButtonProps: { danger: true },
			onOk: () => {
				const trimmed = String(reason || "").trim();
				if (!trimmed) {
					message.error(txt.rejectionReason);
					return Promise.reject(new Error("rejection reason required"));
				}
				return reviewWalletClaim(transaction, "reject", trimmed, rejectionType);
			},
		});
	};

	const renderAttachments = (attachments = []) => {
		const list = Array.isArray(attachments) ? attachments : [];
		if (!list.length) return "-";
		return (
			<AttachmentLinks>
				{list.map((attachment, index) =>
					attachment.url ? (
						<a
							key={attachment.public_id || attachment.url || index}
							href={attachment.url}
							target='_blank'
							rel='noreferrer'
						>
							<PaperClipOutlined />
							{attachmentLabel(attachment, index)}
						</a>
					) : (
						<span key={attachment.fileName || index}>
							<PaperClipOutlined />
							{attachmentLabel(attachment, index)}
						</span>
					)
				)}
			</AttachmentLinks>
		);
	};

	const renderEntryForm = (mode = "add") => {
		const isEditing = mode === "edit" && Boolean(editingTransactionId);
		return (
			<EntryGrid>
				{agentOnly ? (
					<SelfAgentField>
						<span>
							{txt.selfAgent}
							<em>{txt.requiredMark}</em>
						</span>
						<strong>
							{agentLabel(entryAgentRow?.agent || user || {})}
						</strong>
						<small>{txt.selfAgentHint}</small>
					</SelfAgentField>
				) : (
					<label>
						<span>{txt.agent}<em>{txt.requiredMark}</em></span>
						<Select
							value={entry.agentId || undefined}
							placeholder={txt.chooseAgent}
							showSearch
							optionFilterProp='label'
							options={agentOptions}
							onChange={(value) => {
								setEntry((current) => ({ ...current, agentId: value || "" }));
								updateFilter("agentId", value || "");
							}}
						/>
					</label>
				)}
				{!agentOnly && mode === "add" ? (
					<FormHint className='wide'>
						<ExclamationCircleOutlined />
						<span>{txt.formAgentHint}</span>
					</FormHint>
				) : null}
				<label>
					<span>{txt.type}<em>{txt.requiredMark}</em></span>
					<Select
						value={entry.transactionType}
						options={transactionOptions(txt)}
						disabled={agentOnly && !isEditing}
						onChange={(value) =>
							setEntry((current) => ({ ...current, transactionType: value }))
						}
					/>
				</label>
				<label>
					<span>{txt.amount}<em>{txt.requiredMark}</em></span>
					<InputNumber
						value={entry.amount}
						min={0}
						precision={2}
						controls={false}
						addonAfter='SAR'
						onChange={(value) =>
							setEntry((current) => ({ ...current, amount: value || 0 }))
						}
					/>
				</label>
				<label>
					<span>{txt.date}<em>{txt.requiredMark}</em></span>
					<DatePicker
						className='wallet-date-picker'
						format='YYYY-MM-DD'
						suffixIcon={<CalendarOutlined />}
						value={datePickerValue(entry.transactionDate)}
						disabledDate={(current) =>
							current && current > dayjs().endOf("day")
						}
						onChange={(value) =>
							setEntry((current) => ({
								...current,
								transactionDate: datePickerString(value),
							}))
						}
					/>
				</label>
				<label className='wide'>
					<span>{txt.reference}<small>{txt.optional}</small></span>
					<Input
						value={entry.reference}
						onChange={(event) =>
							setEntry((current) => ({ ...current, reference: event.target.value }))
						}
					/>
				</label>
				<label className='wide'>
					<span>{txt.note}<small>{txt.optional}</small></span>
					<Input.TextArea
						value={entry.note}
						rows={2}
						onChange={(event) =>
							setEntry((current) => ({ ...current, note: event.target.value }))
						}
					/>
				</label>
				<AttachmentPicker className='wide'>
					<div className='attachment-picker-head'>
						<div>
							<strong><PaperClipOutlined /> {txt.attachments}</strong>
							<span>{txt.attachmentHint}</span>
						</div>
						<span className='attachment-count'>
							{txt.attachmentCount}: {entryAttachments.length}/{walletAttachmentLimit}
						</span>
					</div>
					<label className='attachment-upload-button'>
						<PaperClipOutlined />
						{txt.uploadAttachments}
						<input
							type='file'
							multiple
							accept='image/*,application/pdf,.pdf'
							disabled={saving}
							onChange={handleAttachmentFiles}
						/>
					</label>
					{entryAttachments.length ? (
						<AttachmentList>
							{entryAttachments.map((attachment, index) => (
								<li key={`${attachment.public_id || attachment.fileName || index}`}>
									<div>
										<PaperClipOutlined />
										<span>{attachmentLabel(attachment, index)}</span>
										<small>{formatFileSize(attachment.fileSize)}</small>
									</div>
									<div className='attachment-actions'>
										{attachment.url ? (
											<a href={attachment.url} target='_blank' rel='noreferrer'>
												{txt.viewAttachment}
											</a>
										) : (
											<span>{txt.pendingUpload}</span>
										)}
										<button
											type='button'
											disabled={saving}
											onClick={() => removeEntryAttachment(index)}
										>
											{txt.removeAttachment}
										</button>
									</div>
								</li>
							))}
						</AttachmentList>
					) : (
						<EmptyAttachments>
							<PaperClipOutlined />
							<span>{txt.noAttachments}</span>
						</EmptyAttachments>
					)}
				</AttachmentPicker>
				<FormActions className='wide'>
					<Button onClick={() => (isEditing ? closeEditModal() : resetEntry())}>
						{isEditing ? txt.cancelEdit : txt.newEntry}
					</Button>
					<Button
						type='primary'
						className='wallet-save-action'
						icon={isEditing ? <EditOutlined /> : <PlusOutlined />}
						loading={saving}
						onClick={saveEntry}
						disabled={!canSubmitEntry}
					>
						{isEditing
							? txt.update
							: agentOnly
							? txt.claimWalletCredit
							: txt.save}
					</Button>
				</FormActions>
			</EntryGrid>
		);
	};

	const agentColumns = [
		{
			title: "#",
			width: 58,
			render: (_, __, index) => (agentPage - 1) * 10 + index + 1,
		},
		{
			title: txt.agent,
			render: (_, row) => (
				<AgentButton type='button' onClick={() => updateFilter("agentId", normalizeId(row.agent))}>
					<strong>{titleCase(row.agent?.name || row.agent?.email || "-")}</strong>
					<span>{titleCase(row.agent?.companyName || row.agent?.email || "-")}</span>
				</AgentButton>
			),
		},
		{
			title: txt.model,
			render: (_, row) => (
				<Tag color={agentCommercialModel(row) === "commission_only" ? "purple" : "blue"}>
					{commercialModelLabel(row, txt)}
				</Tag>
			),
		},
		{ title: txt.walletAdded, dataIndex: "walletAdded", render: (value) => `${money(value)} SAR` },
		{ title: txt.walletUsed, dataIndex: "walletUsed", render: (value) => `${money(value)} SAR` },
		{
			title: txt.balance,
			dataIndex: "balance",
			render: (value) => <Tag color={Number(value || 0) < 0 ? "orange" : "green"}>{money(value)} SAR</Tag>,
		},
	];

	const renderTransactionActions = (row) => {
		const isPendingClaim =
			row.source === "agent_claim" &&
			String(row.status || "").toLowerCase() === "pending";
		if (!canManage || row.reservationId) return "-";
		if (isPendingClaim) {
			return (
				<WalletActionButtons>
					<Button
						size='small'
						icon={<EditOutlined />}
						onClick={() => editTransaction(row)}
					>
						{txt.edit}
					</Button>
					<Button
						size='small'
						type='primary'
						icon={<CheckCircleOutlined />}
						loading={saving}
						onClick={() => reviewWalletClaim(row, "approve")}
					>
						{txt.approve}
					</Button>
					<Button
						size='small'
						danger
						icon={<CloseCircleOutlined />}
						loading={saving}
						onClick={() => rejectWalletClaim(row, "correction_required")}
					>
						{txt.rejectForCorrection || txt.reject}
					</Button>
					<Button
						size='small'
						danger
						icon={<StopOutlined />}
						loading={saving}
						onClick={() => rejectWalletClaim(row, "final")}
					>
						{txt.rejectFinal}
					</Button>
				</WalletActionButtons>
			);
		}
		return (
			<Button
				size='small'
				icon={<EditOutlined />}
				onClick={() => editTransaction(row)}
			>
				{txt.edit}
			</Button>
		);
	};

	const transactionColumns = [
		{
			title: "#",
			width: 58,
			render: (_, __, index) => (txPage - 1) * 8 + index + 1,
		},
		{
			title: txt.actions,
			width: 170,
			render: (_, row) => renderTransactionActions(row),
		},
		{ title: txt.agent, dataIndex: "agentName", render: (value) => titleCase(value || "-") },
		{
			title: txt.type,
			dataIndex: "transactionType",
			render: (value) =>
				transactionOptions(txt).find((option) => option.value === value)?.label || value || "-",
		},
		{ title: txt.amount, dataIndex: "amount", render: (value) => `${money(value)} SAR` },
		{ title: txt.date, dataIndex: "transactionDate", render: formatDate },
		{
			title: txt.source,
			dataIndex: "source",
			render: (value) => <Tag color={value === "agent_claim" ? "purple" : "blue"}>{transactionSourceLabel(value, txt)}</Tag>,
		},
		{
			title: txt.status,
			render: (_, row) => (
				<Tag color={transactionStatusColor(row)}>
					{transactionStatusLabel(row, txt)}
				</Tag>
			),
		},
		{ title: txt.reference, dataIndex: "reference", render: (value) => value || "-" },
		{ title: txt.note, dataIndex: "note", render: (value) => value || "-" },
		{
			title: txt.attachments,
			dataIndex: "attachments",
			render: renderAttachments,
		},
	];

	return (
		<OverallPageShell $isRTL={isRTL}>
			<WalletShell $isRTL={isRTL}>
				<>
						<WalletPageHeader>
							<span className='wallet-title-icon'>
								<WalletOutlined />
							</span>
							<div>
								<h1>{txt.title}</h1>
								<p>{txt.subtitle}</p>
							</div>
						</WalletPageHeader>
						<WalletTabs role='tablist' aria-label={txt.title}>
							<button
								type='button'
								role='tab'
								aria-selected={activeWalletTab === "add"}
								data-active={activeWalletTab === "add" ? "true" : "false"}
								onClick={() => switchWalletTab("add")}
							>
								<PlusOutlined />
								<span>{agentOnly ? txt.claimWalletCredit : txt.addTab}</span>
							</button>
							<button
								type='button'
								role='tab'
								aria-selected={activeWalletTab === "update"}
								data-active={activeWalletTab === "update" ? "true" : "false"}
								onClick={() => switchWalletTab("update")}
							>
								<EditOutlined />
								<span>{txt.updateTab}</span>
							</button>
						</WalletTabs>

						{activeWalletTab === "add" ? (
							<EntryPanel>
								<PanelTitle>
									<span>{agentOnly ? txt.claimWalletCredit : txt.entryTitle}</span>
									<Button icon={<ReloadOutlined />} onClick={loadWallets}>
										{txt.refresh}
									</Button>
								</PanelTitle>
								{renderEntryForm("add")}
							</EntryPanel>
						) : (
							<Spin spinning={loadingWallets}>
								<UpdateWorkspace>
									<Panel>
										<PanelTitle>
											<span>{txt.agents}</span>
											<small>{txt.allWalletData}</small>
										</PanelTitle>
										<Table
											rowKey={(row) => normalizeId(row.agent)}
											dataSource={visibleAgentRows}
											columns={agentColumns}
											size='small'
											scroll={{ x: 920 }}
											pagination={{
												pageSize: 10,
												current: agentPage,
												onChange: setAgentPage,
											}}
											locale={{ emptyText: txt.noData }}
										/>
									</Panel>
									<Panel>
										<PanelTitle>
											<span>{txt.transactions}</span>
											<Button size='small' icon={<ReloadOutlined />} onClick={loadWallets}>
												{txt.refresh}
											</Button>
										</PanelTitle>
										<Table
											rowKey={(row) =>
												[
													row._id,
													row.reference,
													row.transactionDate,
													row.agentId,
													row.hotelId,
												]
													.map((item) => normalizeId(item) || String(item || ""))
													.filter(Boolean)
													.join("-")
											}
											dataSource={transactionRows}
											columns={transactionColumns}
											size='small'
											scroll={{ x: 1380 }}
											rowClassName={(row) =>
												normalizeId(row._id) === editingTransactionId
													? "overall-wallet-row-selected"
													: ""
											}
											pagination={{
												pageSize: 8,
												current: txPage,
												onChange: setTxPage,
											}}
											locale={{ emptyText: txt.noData }}
										/>
									</Panel>
								</UpdateWorkspace>
							</Spin>
						)}

						<Modal
							open={activeWalletTab === "update" && editModalOpen}
							title={txt.update}
							footer={null}
							width={920}
							zIndex={2600}
							centered
							destroyOnClose
							maskClosable={!saving}
							keyboard={!saving}
							onCancel={closeEditModal}
							className='wallet-edit-modal'
						>
							<ModalFormPanel>{renderEntryForm("edit")}</ModalFormPanel>
						</Modal>
				</>
			</WalletShell>
		</OverallPageShell>
	);
};

export default OverallWalletManagement;

const WalletShell = styled.div`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	display: grid;
	gap: 9px;
`;

const WalletPageHeader = styled.header`
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
	padding: 9px 12px;
	border: 1px solid rgba(216, 232, 247, 0.95);
	border-radius: 10px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.98)),
		linear-gradient(135deg, rgba(100, 22, 110, 0.08), rgba(14, 116, 144, 0.06));
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045);

	.wallet-title-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 34px;
		width: 34px;
		height: 34px;
		border-radius: 9px;
		background: linear-gradient(135deg, #24102d, #64166e);
		color: #ffffff;
		font-size: 1.1rem;
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.2),
			0 8px 16px rgba(80, 23, 96, 0.2);
	}

	div {
		display: grid;
		gap: 3px;
		min-width: 0;
	}

	h1 {
		margin: 0;
		color: #111827;
		font-size: clamp(0.96rem, 1.1vw, 1.08rem);
		font-weight: 950;
		line-height: 1.2;
		letter-spacing: 0;
	}

	p {
		margin: 0;
		color: #5d6678;
		font-size: 0.73rem;
		font-weight: 800;
		line-height: 1.45;
	}

	@media (max-width: 560px) {
		align-items: flex-start;
		padding: 9px 10px;

		.wallet-title-icon {
			flex-basis: 34px;
			width: 34px;
			height: 34px;
		}
	}
`;

const WalletTabs = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
	padding: 7px;
	border: 1px solid #d8e8f7;
	border-radius: 10px;
	background: #f8fbff;

	button {
		min-height: 36px;
		border: 1px solid #cfe0ef;
		border-radius: 8px;
		background: #ffffff;
		color: #102033;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		font-size: 0.82rem;
		font-weight: 950;
		cursor: pointer;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			box-shadow 0.18s ease,
			color 0.18s ease;
	}

	button[data-active="true"] {
		border-color: #64166e;
		background: linear-gradient(135deg, #24102d, #64166e);
		color: #ffffff;
		box-shadow: 0 10px 18px rgba(80, 23, 96, 0.18);
	}

	@media (max-width: 560px) {
		grid-template-columns: 1fr;
	}
`;

const EntryPanel = styled.section`
	border: 1px solid #d8e8f7;
	border-radius: 10px;
	background: #ffffff;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
	padding: 10px;
`;

const ModalFormPanel = styled.div`
	padding-top: 2px;
`;

const UpdateWorkspace = styled.div`
	display: grid;
	gap: 9px;
`;

const Panel = styled.section`
	border: 1px solid #d8e8f7;
	border-radius: 10px;
	background: #ffffff;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
	padding: 8px;
	overflow: hidden;

	.ant-table-thead > tr > th {
		background: #edf7ff;
		color: #0f172a;
		font-weight: 900;
		text-align: inherit;
		white-space: nowrap;
		padding: 8px 9px;
	}

	.ant-table-tbody > tr > td {
		text-align: inherit;
		vertical-align: middle;
		padding: 7px 9px;
		font-size: 0.78rem;
	}

	.overall-wallet-row-selected > td {
		background: #fff7e6 !important;
	}

	.overall-wallet-row-selected td:first-child {
		box-shadow: inset 4px 0 #fa8c16;
	}
`;

const PanelTitle = styled.h2`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	margin: 0 0 8px;
	color: #0f172a;
	font-size: 0.92rem;
	font-weight: 950;

	.panel-title-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		flex-wrap: wrap;
	}

	> small {
		color: #64748b;
		font-size: 0.74rem;
		font-weight: 850;
		line-height: 1.35;
	}

	@media (max-width: 560px) {
		align-items: stretch;
		flex-direction: column;

		.panel-title-actions {
			justify-content: stretch;

			.ant-btn {
				flex: 1;
			}
		}
	}
`;

const FormHint = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	min-height: 34px;
	padding: 7px 9px;
	border: 1px solid #d8e8f7;
	border-radius: 9px;
	background: #f8fbff;
	color: #52677a;
	font-size: 0.74rem;
	font-weight: 850;
	line-height: 1.45;

	svg {
		flex: 0 0 auto;
		color: #64166e;
	}
`;

const EntryGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1.15fr) minmax(220px, 0.85fr);
	gap: 9px;

	label {
		display: grid;
		gap: 5px;
		min-width: 0;
		color: #0f172a;
		font-weight: 900;
	}

	label > span {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 0.78rem;
	}

	em,
	small {
		display: inline-flex;
		min-height: 18px;
		align-items: center;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.64rem;
		font-style: normal;
		font-weight: 900;
		white-space: nowrap;
	}

	em {
		border: 1px solid #fecaca;
		background: #fff7f7;
		color: #dc2626;
	}

	small {
		border: 1px solid #bfdbfe;
		background: #eff6ff;
		color: #0b6fdc;
	}

	.ant-select,
	.ant-picker,
	.ant-input-number,
	.ant-input {
		width: 100%;
	}

	input,
	.ant-picker,
	.ant-select-selector,
	.ant-input-number,
	.ant-input {
		min-height: 36px !important;
		border-radius: 8px !important;
	}

	.ant-picker-input > input {
		min-height: 24px !important;
		padding: 0;
		border: 0;
	}

	input {
		border: 1px solid #d9d9d9;
		padding: 7px 10px;
	}

	.wide {
		grid-column: 1 / -1;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const SelfAgentField = styled.div`
	display: grid;
	gap: 5px;
	min-width: 0;
	color: #0f172a;
	font-weight: 900;

	> span {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 0.78rem;
	}

	strong {
		min-height: 36px;
		display: flex;
		align-items: center;
		padding: 8px 10px;
		border: 1px solid #d8e8f7;
		border-radius: 8px;
		background: #f8fbff;
		color: #102033;
		font-size: 0.86rem;
		overflow-wrap: anywhere;
	}

	small {
		display: block;
		padding: 0;
		border: 0;
		background: transparent;
		color: #667085;
		font-size: 0.72rem;
		line-height: 1.45;
		white-space: normal;
	}
`;

const FormActions = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	flex-wrap: wrap;
	padding-top: 2px;

	.ant-btn {
		min-height: 34px;
		border-radius: 8px;
		font-weight: 900;
	}

	.wallet-save-action {
		min-width: min(250px, 100%);
		min-height: 40px;
		padding-inline: 22px;
		border: 0;
		border-radius: 9px;
		background: linear-gradient(135deg, #102033 0%, #352044 48%, #6f1f78 100%);
		color: #ffffff;
		font-size: 0.84rem;
		font-weight: 950;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.2),
			0 12px 22px rgba(80, 23, 96, 0.24);
	}

	.wallet-save-action:hover,
	.wallet-save-action:focus-visible {
		background: linear-gradient(135deg, #17324d 0%, #4a245c 48%, #7d2788 100%) !important;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.22),
			0 14px 26px rgba(80, 23, 96, 0.3);
	}

	.wallet-save-action:disabled {
		opacity: 0.58;
		box-shadow: none;
	}

	@media (max-width: 520px) {
		.ant-btn,
		.wallet-save-action {
			width: 100%;
		}
	}
`;

const WalletActionButtons = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	flex-wrap: wrap;

	.ant-btn {
		font-weight: 900;
		border-radius: 7px;
	}
`;

const RejectDialogContent = styled.div`
	display: grid;
	gap: 10px;

	p {
		margin: 0;
		color: #52677a;
		font-size: 0.82rem;
		font-weight: 850;
		line-height: 1.5;
	}
`;

const AttachmentPicker = styled.div`
	display: grid;
	gap: 9px;
	padding: 10px;
	border: 1px solid #d8e8f7;
	border-radius: 10px;
	background: linear-gradient(135deg, #f8fbff 0%, #edf7ff 100%);

	.attachment-picker-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.attachment-picker-head > div {
		display: grid;
		gap: 3px;
		min-width: 0;
	}

	.attachment-picker-head strong {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #0f172a;
		font-weight: 950;
	}

	.attachment-picker-head span {
		color: #64748b;
		font-size: 0.72rem;
		font-weight: 800;
	}

	.attachment-count {
		display: inline-flex;
		align-items: center;
		min-height: 24px;
		padding: 3px 10px;
		border: 1px solid #bfdbfe;
		border-radius: 999px;
		background: #fff;
		color: #0b5fa8 !important;
		font-size: 0.72rem !important;
		font-weight: 950 !important;
	}

	.attachment-upload-button {
		position: relative;
		width: fit-content;
		min-height: 34px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		padding: 7px 14px;
		border-radius: 9px;
		background: #1677ff;
		color: #fff;
		font-weight: 900;
		cursor: pointer;
		box-shadow: 0 8px 16px rgba(22, 119, 255, 0.18);
	}

	.attachment-upload-button input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	@media (max-width: 520px) {
		.attachment-upload-button {
			width: 100%;
		}
	}
`;

const EmptyAttachments = styled.div`
	min-height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border: 1px dashed #b9d7f5;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.7);
	color: #64748b;
	font-size: 0.72rem;
	font-weight: 850;
	text-align: center;

	svg {
		color: #0b6fdc;
	}
`;

const AttachmentList = styled.ul`
	list-style: none;
	display: grid;
	gap: 7px;
	padding: 0;
	margin: 0;

	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px 10px;
		border: 1px solid #dbeafe;
		border-radius: 9px;
		background: #fff;
	}

	li > div:first-child {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 7px;
	}

	li > div:first-child span {
		font-weight: 900;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	small {
		color: #64748b;
		font-weight: 800;
		white-space: nowrap;
	}

	.attachment-actions {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
	}

	button {
		border: 0;
		background: transparent;
		color: #b91c1c;
		font-weight: 900;
		cursor: pointer;
		padding: 0;
	}

	@media (max-width: 520px) {
		li {
			align-items: stretch;
			flex-direction: column;
		}
	}
`;

const AttachmentLinks = styled.div`
	display: grid;
	gap: 4px;
	max-width: 220px;

	a,
	span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		min-width: 0;
		color: #0b6fdc;
		font-weight: 900;
		text-decoration: underline;
		text-underline-offset: 3px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	span {
		color: #64748b;
		text-decoration: none;
	}
`;

const AgentButton = styled.button`
	display: grid;
	gap: 2px;
	border: 0;
	background: transparent;
	text-align: inherit;
	cursor: pointer;
	padding: 0;

	strong {
		color: #075985;
		text-decoration: underline;
	}

	span {
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 800;
	}
`;
