/** @format */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
	Button,
	Input,
	InputNumber,
	Modal,
	Popconfirm,
	Select,
	Table,
	Tag,
	message,
} from "antd";
import {
	BankOutlined,
	CalendarOutlined,
	DeleteOutlined,
	DownloadOutlined,
	EditOutlined,
	PaperClipOutlined,
	PlusOutlined,
	ReloadOutlined,
	WalletOutlined,
} from "@ant-design/icons";
import moment from "moment";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import {
	createAgentWalletTransaction,
	deleteAgentWalletTransaction,
	getAgentWalletSummary,
	getHotelById,
	updateAgentWalletTransaction,
} from "../apiAdmin";
import { getStoredMenuCollapsed } from "../utils/menuState";

const money = (value) =>
	Number(value || 0).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const toTitleCase = (value = "") =>
	String(value || "")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b([A-Za-z])([A-Za-z']*)/g, (_, first, rest) =>
			`${first.toUpperCase()}${rest.toLowerCase()}`
		);

const getAgentLabel = (agent = {}) =>
	[
		agent.companyName ? toTitleCase(agent.companyName) : "",
		agent.name ? toTitleCase(agent.name) : agent.email,
	]
		.filter(Boolean)
		.join(" - ") ||
	"Agent";

const toDatePickerValue = (value) => {
	if (!value) return new Date();
	if (moment.isMoment(value)) return value.toDate();
	const parsed = moment(value);
	return parsed.isValid() ? parsed.toDate() : new Date();
};

const safeFileSegment = (value = "financials") =>
	String(value || "financials")
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 80) || "financials";

const safeSheetName = (value = "Sheet") =>
	String(value || "Sheet")
		.replace(/[\\/?*[\]:]/g, " ")
		.slice(0, 31) || "Sheet";

const REPORT_COLUMN_WIDTHS = {
	Hotel: 14,
	Agent: 24,
	Company: 24,
	Email: 24,
	Model: 18,
	"Opening Credit": 14,
	"Wallet Added": 14,
	"Wallet Used": 15,
	"Reservation Deductions": 18,
	Balance: 14,
	Reservations: 13,
	"Reservation Value": 17,
	Commission: 14,
	"Commission Due": 16,
	"Pending Confirmation": 18,
	Type: 16,
	Amount: 14,
	Date: 13,
	Reference: 18,
	Note: 28,
	Confirmation: 18,
	Guest: 22,
	Status: 16,
	Attachments: 30,
};

const getReportColumnWidth = (key, rows = []) => {
	const maxWidth = REPORT_COLUMN_WIDTHS[key] || 18;
	const minWidth = Math.min(maxWidth, Math.max(10, Math.ceil(String(key).length * 0.75)));
	const contentWidth = rows.reduce((max, row) => {
		const value = row?.[key];
		const length =
			value === null || value === undefined ? 0 : String(value).length;
		return Math.max(max, Math.ceil(length * 0.85) + 2);
	}, minWidth);
	return Math.min(maxWidth, Math.max(minWidth, contentWidth));
};

const loadStyledXlsx = async () => {
	const xlsxModule = await import("xlsx-js-style");
	return xlsxModule.default || xlsxModule["module.exports"] || xlsxModule;
};

const appendReportSheet = (
	XLSX,
	workbook,
	rows,
	sheetName,
	emptyText = "No data"
) => {
	const safeRows =
		Array.isArray(rows) && rows.length ? rows : [{ Message: emptyText }];
	const worksheet = XLSX.utils.json_to_sheet(safeRows);
	const headers = Object.keys(safeRows[0] || {});
	worksheet["!cols"] = headers.map((key) => ({
		wch: getReportColumnWidth(key, safeRows),
	}));
	if (worksheet["!ref"]) {
		const range = XLSX.utils.decode_range(worksheet["!ref"]);
		worksheet["!autofilter"] = { ref: worksheet["!ref"] };
		worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
		worksheet["!rows"] = Array.from(
			{ length: range.e.r + 1 },
			(_, index) => ({ hpt: index === 0 ? 28 : 30 })
		);
		for (let column = range.s.c; column <= range.e.c; column += 1) {
			const headerAddress = XLSX.utils.encode_cell({ r: 0, c: column });
			if (!worksheet[headerAddress]) continue;
			worksheet[headerAddress].s = {
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
					border: {
						bottom: { style: "thin", color: { rgb: "E5E7EB" } },
					},
				};
				if (worksheet[address].t === "n") {
					worksheet[address].z = "#,##0.00";
				}
			}
		}
	}
	XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(sheetName));
};

const walletAttachmentLimit = 8;
const walletAttachmentMaxBytes = 10 * 1024 * 1024;
const walletAttachmentTotalMaxBytes = 32 * 1024 * 1024;

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
		roles.some((role) => [1000, 2000, 3000, 6000].includes(role)) ||
		descriptions.some((description) =>
			["hotelmanager", "reception", "finance"].includes(description)
		);
	return isAgent && !hasFullAccess;
};

const labels = {
	en: {
		title: "Financials",
		subtitle:
			"Agent wallets, reservation deductions, commissions, and reconciliation in one place.",
		refresh: "Refresh",
		exportExcel: "Export Excel",
		addFunds: "Add wallet entry",
		from: "From",
		to: "To",
		agent: "Agent",
		allAgents: "All agents",
		walletAdded: "Wallet added",
		walletUsed: "Reservation deductions",
		balance: "Current balance",
		outstandingReservations: "Outstanding reservations",
		availableWallet: "Available wallet",
		commercialModel: "Model",
		commissionOnly: "Commission only",
		walletInventory: "Inventory wallet",
		mixedModel: "Wallet + commission",
		openingCredit: "Opening credit",
		noWalletAgent:
			"This agent is commission-only. Reservations are visible for commission review and do not create wallet debt.",
		reservations: "Reservations",
		reservationValue: "Reservation value",
		commission: "Commission",
		commissionDue: "Commission due",
		pending: "Pending confirmation",
		company: "Company",
		email: "Email",
		phone: "Phone",
		transactions: "Wallet ledger",
		reservationDeductions: "Reservations deducted from wallet",
		transactionType: "Type",
		amount: "Amount",
		date: "Date",
		note: "Note",
		reference: "Reference",
		save: "Save entry",
		cancel: "Cancel",
		edit: "Edit",
		delete: "Delete",
		actions: "Actions",
		updateEntry: "Update wallet entry",
		deleteConfirm: "Delete this wallet movement?",
		deposit: "Deposit / agent paid hotel",
		debit: "Manual deduction",
		adjustment: "Adjustment",
		refund: "Refund",
		confirmation: "Confirmation #",
		guest: "Guest",
		status: "Status",
		noRows: "No records yet.",
		saved: "Wallet entry saved.",
		updated: "Wallet entry updated.",
		deleted: "Wallet entry deleted.",
		required: "Please select an agent and enter an amount.",
		error: "Unable to load financial data.",
		ownHint: "This is your financial wallet for the selected hotel.",
	},
	ar: {
		title: "المالية",
		subtitle:
			"محافظ الوكلاء، خصومات الحجوزات، العمولات، والتسويات في مكان واحد.",
		refresh: "تحديث",
		exportExcel: "تصدير إكسل",
		addFunds: "إضافة حركة للمحفظة",
		from: "من",
		to: "إلى",
		agent: "الوكيل",
		allAgents: "كل الوكلاء",
		walletAdded: "المضاف للمحفظة",
		walletUsed: "خصومات الحجوزات",
		balance: "الرصيد الحالي",
		reservations: "الحجوزات",
		reservationValue: "قيمة الحجوزات",
		commission: "العمولة",
		commissionDue: "العمولة المستحقة",
		pending: "بانتظار التأكيد",
		company: "الشركة",
		email: "البريد",
		phone: "الهاتف",
		transactions: "حركات المحفظة",
		reservationDeductions: "الحجوزات المخصومة من المحفظة",
		transactionType: "النوع",
		amount: "المبلغ",
		date: "التاريخ",
		note: "ملاحظة",
		reference: "مرجع",
		save: "حفظ الحركة",
		cancel: "إلغاء",
		deposit: "إيداع / الوكيل دفع للفندق",
		debit: "خصم يدوي",
		adjustment: "تسوية",
		refund: "استرداد",
		confirmation: "رقم التأكيد",
		guest: "الضيف",
		status: "الحالة",
		noRows: "لا توجد بيانات حتى الآن.",
		saved: "تم حفظ حركة المحفظة.",
		required: "يرجى اختيار الوكيل وإدخال المبلغ.",
		error: "تعذر تحميل البيانات المالية.",
		ownHint: "هذه محفظتك المالية للفندق المحدد.",
	},
};

labels.ar = {
	title: "المالية",
	subtitle:
		"محافظ الوكلاء، خصومات الحجوزات، العمولات، والتسويات في مكان واحد.",
	refresh: "تحديث",
	exportExcel: "تصدير إكسل",
	addFunds: "إضافة حركة للمحفظة",
	from: "من",
	to: "إلى",
	agent: "الوكيل",
	allAgents: "كل الوكلاء",
	walletAdded: "المضاف للمحفظة",
	walletUsed: "خصومات الحجوزات",
	balance: "الرصيد الحالي",
	reservations: "الحجوزات",
	reservationValue: "قيمة الحجوزات",
	commission: "العمولة",
	commissionDue: "العمولة المستحقة",
	pending: "بانتظار التأكيد",
	company: "الشركة",
	email: "البريد",
	phone: "الهاتف",
	transactions: "حركات المحفظة",
	reservationDeductions: "الحجوزات المخصومة من المحفظة",
	transactionType: "النوع",
	amount: "المبلغ",
	date: "التاريخ",
	note: "ملاحظة",
	reference: "مرجع",
	save: "حفظ الحركة",
	cancel: "إلغاء",
	deposit: "إيداع / الوكيل دفع للفندق",
	debit: "خصم يدوي",
	adjustment: "تسوية",
	refund: "استرداد",
	confirmation: "رقم التأكيد",
	guest: "الضيف",
	status: "الحالة",
	noRows: "لا توجد بيانات حتى الآن.",
	saved: "تم حفظ حركة المحفظة.",
	required: "يرجى اختيار الوكيل وإدخال المبلغ.",
	error: "تعذر تحميل البيانات المالية.",
	ownHint: "هذه محفظتك المالية للفندق المحدد.",
};

Object.assign(labels.ar, {
	edit: "تعديل",
	delete: "حذف",
	actions: "الإجراءات",
	updateEntry: "تعديل حركة المحفظة",
	deleteConfirm: "هل تريد حذف حركة المحفظة؟",
	updated: "تم تعديل حركة المحفظة.",
	deleted: "تم حذف حركة المحفظة.",
});

Object.assign(labels.ar, {
	outstandingReservations: "قيمة حجوزات معلقة",
	availableWallet: "رصيد متاح",
	commercialModel: "النموذج",
	commissionOnly: "عمولة فقط",
	walletInventory: "محفظة مخزون",
	mixedModel: "محفظة وعمولة",
	openingCredit: "رصيد افتتاحي",
	noWalletAgent:
		"هذا الوكيل يعمل بنظام العمولة فقط. الحجوزات تظهر لمراجعة العمولة ولا تنشئ مديونية محفظة.",
});

Object.assign(labels.en, {
	attachments: "Attachments",
	uploadAttachments: "Attach receipts",
	attachmentHint: "PDF or image receipts, up to 8 files, 10MB each, 32MB total.",
	viewAttachment: "View",
	removeAttachment: "Remove",
	pendingUpload: "Ready to upload",
	attachmentTooLarge: "Each attachment must be 10MB or smaller.",
	attachmentInvalid: "Only PDF and image attachments are allowed.",
	attachmentLimit: "You can attach up to 8 files.",
	attachmentTotalTooLarge: "Attachments must be 32MB total or smaller.",
});

Object.assign(labels.ar, {
	attachments: "المرفقات",
	uploadAttachments: "إرفاق إيصالات",
	attachmentHint: "PDF أو صور، بحد أقصى 8 ملفات، 10MB لكل ملف، و32MB إجمالي.",
	viewAttachment: "عرض",
	removeAttachment: "حذف",
	pendingUpload: "جاهز للرفع",
	attachmentTooLarge: "حجم كل مرفق يجب أن يكون 10MB أو أقل.",
	attachmentInvalid: "المسموح فقط PDF أو صور.",
	attachmentLimit: "يمكن إرفاق 8 ملفات كحد أقصى.",
	attachmentTotalTooLarge: "إجمالي المرفقات يجب أن يكون 32MB أو أقل.",
});

const transactionOptions = (txt) => [
	{ value: "deposit", label: txt.deposit },
	{ value: "debit", label: txt.debit },
	{ value: "adjustment", label: txt.adjustment },
	{ value: "refund", label: txt.refund },
];

const agentCommercialModel = (record = {}) =>
	record.commercialModel || record.agent?.agentCommercialModel || "wallet_inventory";

const commercialModelLabel = (record = {}, txt = labels.en) => {
	const model = agentCommercialModel(record);
	if (model === "commission_only") return txt.commissionOnly || "Commission only";
	if (model === "mixed") return txt.mixedModel || "Wallet + commission";
	return txt.walletInventory || "Inventory wallet";
};

const walletBalancePresentation = (record = {}, txt = labels.en) => {
	const balance = Number(record.balance || 0);
	if (agentCommercialModel(record) === "commission_only" || record.walletRequired === false) {
		return {
			label: txt.commissionOnly || "Commission only",
			value: txt.commissionOnly || "Commission only",
			tone: "purple",
		};
	}
	return {
		label:
			balance < 0
				? txt.outstandingReservations || "Outstanding reservations"
				: txt.availableWallet || txt.balance || "Current balance",
		value: `${money(Math.abs(balance))} SAR`,
		tone: balance < 0 ? "orange" : "green",
	};
};

const FinancialMain = ({ match }) => {
	const { userId, hotelId } = match.params;
	const { user, token } = isAuthenticated();
	const { chosenLanguage } = useCartContext();
	const isArabic = chosenLanguage === "Arabic";
	const txt = labels[isArabic ? "ar" : "en"];
	const [adminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed } = getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [hotel, setHotel] = useState(
		JSON.parse(localStorage.getItem("selectedHotel") || "{}")
	);
	const [loading, setLoading] = useState(false);
	const [summary, setSummary] = useState(null);
	const [selectedAgentId, setSelectedAgentId] = useState("");
	const [dateRange, setDateRange] = useState([]);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingTransactionId, setEditingTransactionId] = useState("");
	const [entrySaving, setEntrySaving] = useState(false);
	const [entry, setEntry] = useState({
		agentId: "",
		transactionType: "deposit",
		amount: 0,
		note: "",
		reference: "",
		transactionDate: moment(),
		attachments: [],
	});

	const agentOnly = isOrderTakerOnly(user);
	const agents = Array.isArray(summary?.agents) ? summary.agents : [];
	const activeAgent =
		agents.find((item) => item.agent?._id === selectedAgentId) || agents[0] || {};
	const activeAgentId = activeAgent?.agent?._id || selectedAgentId || "";
	const activeTransactions = Array.isArray(activeAgent?.transactions)
		? activeAgent.transactions
		: [];
	const activeReservations = Array.isArray(activeAgent?.reservations)
		? activeAgent.reservations
		: [];
	const activeBalancePresentation = walletBalancePresentation(activeAgent, txt);
	const activeIsCommissionOnly =
		agentCommercialModel(activeAgent) === "commission_only" ||
		activeAgent?.walletRequired === false;
	const totalsBalancePresentation = agentOnly
		? walletBalancePresentation(
				{
					...(summary?.totals || {}),
					commercialModel: activeAgent?.commercialModel,
					walletRequired: activeAgent?.walletRequired,
				},
				txt
		  )
		: null;

	const filters = useMemo(
		() => ({
			startDate: dateRange?.[0]?.format("YYYY-MM-DD"),
			endDate: dateRange?.[1]?.format("YYYY-MM-DD"),
			agentId: agentOnly ? user?._id : selectedAgentId,
		}),
		[agentOnly, dateRange, selectedAgentId, user?._id]
	);

	const loadFinancials = useCallback(async () => {
		if (!hotelId || !userId || !token) return;
		setLoading(true);
		try {
			const data = await getAgentWalletSummary(hotelId, userId, token, filters);
			if (data?.error) {
				message.error(data.error || txt.error);
				setSummary(null);
			} else {
				setSummary(data);
				const nextAgents = Array.isArray(data?.agents) ? data.agents : [];
				setSelectedAgentId((current) =>
					nextAgents.some((item) => item.agent?._id === current)
						? current
						: nextAgents[0]?.agent?._id || ""
				);
			}
		} finally {
			setLoading(false);
		}
	}, [filters, hotelId, token, txt.error, userId]);

	useEffect(() => {
		getHotelById(hotelId).then((data) => {
			if (data && !data.error) {
				setHotel(data);
				localStorage.setItem("selectedHotel", JSON.stringify(data));
			}
		});
	}, [hotelId]);

	useEffect(() => {
		loadFinancials();
	}, [loadFinancials]);

	const openEntryModal = (agentId = activeAgentId) => {
		setEditingTransactionId("");
		setEntry({
			agentId,
			transactionType: "deposit",
			amount: 0,
			note: "",
			reference: "",
			transactionDate: moment(),
			attachments: [],
		});
		setModalOpen(true);
	};

	const openEditTransactionModal = (transaction = {}) => {
		setEditingTransactionId(transaction._id || "");
		setEntry({
			agentId: activeAgentId,
			transactionType: transaction.transactionType || "deposit",
			amount: Number(transaction.amount || 0),
			note: transaction.note || "",
			reference: transaction.reference || "",
			transactionDate: transaction.transactionDate
				? moment(transaction.transactionDate)
				: moment(),
			attachments: Array.isArray(transaction.attachments)
				? transaction.attachments
				: [],
		});
		setModalOpen(true);
	};

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
			existing.reduce(
				(sum, attachment) => sum + Number(attachment.fileSize || 0),
				0
			) + files.reduce((sum, file) => sum + Number(file.size || 0), 0);
		if (totalSize > walletAttachmentTotalMaxBytes) {
			message.error(txt.attachmentTotalTooLarge);
			return;
		}

		try {
			const nextAttachments = await Promise.all(
				files.map(async (file) => ({
					data: await fileToBase64(file),
					fileName: file.name,
					fileType:
						file.type || (/\.pdf$/i.test(file.name || "") ? "application/pdf" : ""),
					fileSize: file.size,
				}))
			);
			setEntry((current) => ({
				...current,
				attachments: [
					...(Array.isArray(current.attachments) ? current.attachments : []),
					...nextAttachments,
				],
			}));
		} catch {
			message.error(txt.attachmentInvalid);
		}
	};

	const removeEntryAttachment = (index) => {
		setEntry((current) => ({
			...current,
			attachments: (Array.isArray(current.attachments)
				? current.attachments
				: []
			).filter((_, attachmentIndex) => attachmentIndex !== index),
		}));
	};

	const saveEntry = async () => {
		if (!entry.agentId || !Number(entry.amount)) {
			message.error(txt.required);
			return;
		}
		setEntrySaving(true);
		const payload = {
			...entry,
			transactionDate: entry.transactionDate?.format("YYYY-MM-DD"),
			startDate: filters.startDate,
			endDate: filters.endDate,
		};
		try {
			const response = editingTransactionId
				? await updateAgentWalletTransaction(
						hotelId,
						userId,
						token,
						editingTransactionId,
						payload
				  )
				: await createAgentWalletTransaction(hotelId, userId, token, payload);
			if (response?.error) {
				message.error(response.error);
				return;
			}
			message.success(editingTransactionId ? txt.updated : txt.saved);
			setEditingTransactionId("");
			setModalOpen(false);
			loadFinancials();
		} finally {
			setEntrySaving(false);
		}
	};

	const deleteWalletTransaction = async (transactionId) => {
		if (!transactionId) return;
		const response = await deleteAgentWalletTransaction(
			hotelId,
			userId,
			token,
			transactionId
		);
		if (response?.error) {
			message.error(response.error);
			return;
		}
		message.success(txt.deleted);
		loadFinancials();
	};

	const exportExcel = async () => {
		const rows = [];
		agents.forEach((item) => {
			rows.push({
				Agent: item.agent?.name || "",
				Company: item.agent?.companyName || "",
				Email: item.agent?.email || "",
				Model: commercialModelLabel(item, labels.en),
				"Opening Credit": item.openingWalletCredit,
				"Wallet Added": item.walletAdded,
				"Wallet Used": item.walletUsed,
				Balance: item.balance,
				Reservations: item.totalReservations,
				"Reservation Value": item.totalReservationValue,
				Commission: item.totalCommission,
				"Commission Due": item.commissionDue,
				"Pending Confirmation": item.pendingConfirmation,
			});
		});
		const txRows = agents.flatMap((item) =>
			(Array.isArray(item.transactions) ? item.transactions : []).map((tx) => ({
				Agent: item.agent?.name || "",
				Company: item.agent?.companyName || "",
				Type: tx.transactionType,
				Amount: tx.amount,
				Date: tx.transactionDate
					? moment(tx.transactionDate).format("YYYY-MM-DD")
					: "",
				Reference: tx.reference || "",
				Note: tx.note || "",
				Attachments: (Array.isArray(tx.attachments) ? tx.attachments : [])
					.map((attachment) => attachment.url || attachment.fileName || "")
					.filter(Boolean)
					.join(", "),
			}))
		);
		const XLSX = await loadStyledXlsx();
		const workbook = XLSX.utils.book_new();
		appendReportSheet(XLSX, workbook, rows, "Wallet Summary", txt.noRows);
		appendReportSheet(XLSX, workbook, txRows, "Wallet Ledger", txt.noRows);
		XLSX.writeFile(
			workbook,
			`agent-wallet-${safeFileSegment(
				hotel?.hotelName || hotelId
			)}-${moment().format("YYYY-MM-DD")}.xlsx`,
			{ cellStyles: true }
		);
	};

	const updateDateRange = (index, value) => {
		const next = [dateRange?.[0] || null, dateRange?.[1] || null];
		next[index] = value ? moment(value) : null;
		if (next[0] && next[1] && next[0].isAfter(next[1])) {
			if (index === 0) {
				next[1] = next[0].clone();
			} else {
				next[0] = next[1].clone();
			}
		}
		setDateRange(next);
	};

	const renderAttachments = (attachments = []) => {
		const list = (Array.isArray(attachments) ? attachments : []).filter(
			(attachment) => attachment?.url
		);
		if (!list.length) return "-";
		return (
			<AttachmentLinks>
				{list.map((attachment, index) => (
					<a
						key={`${attachment.public_id || attachment.url || index}`}
						href={attachment.url}
						target='_blank'
						rel='noreferrer'
						title={attachmentLabel(attachment, index)}
					>
						<PaperClipOutlined />
						<span>{attachmentLabel(attachment, index)}</span>
					</a>
				))}
			</AttachmentLinks>
		);
	};

	const agentColumns = [
		{
			title: txt.agent,
			dataIndex: ["agent", "name"],
			render: (_, row) => (
				<AgentNameButton
					type='button'
					onClick={() => setSelectedAgentId(row.agent?._id)}
				>
					<strong>
						{row.agent?.name ? toTitleCase(row.agent.name) : row.agent?.email}
					</strong>
					<span>
						{row.agent?.companyName
							? toTitleCase(row.agent.companyName)
							: row.agent?.email}
					</span>
				</AgentNameButton>
			),
		},
		{
			title: txt.commercialModel,
			render: (_, row) => (
				<Tag color={agentCommercialModel(row) === "commission_only" ? "purple" : "blue"}>
					{commercialModelLabel(row, txt)}
				</Tag>
			),
		},
		{ title: txt.walletAdded, dataIndex: "walletAdded", render: money },
		{ title: txt.walletUsed, dataIndex: "walletUsed", render: money },
		{
			title: txt.balance,
			dataIndex: "balance",
			render: (_, row) => {
				const presentation = walletBalancePresentation(row, txt);
				return <Tag color={presentation.tone}>{presentation.value}</Tag>;
			},
		},
		{ title: txt.reservations, dataIndex: "totalReservations" },
		{
			title: txt.reservationValue,
			dataIndex: "totalReservationValue",
			render: (value) => `${money(value)} SAR`,
		},
		{ title: txt.commissionDue, dataIndex: "commissionDue", render: money },
		{ title: txt.pending, dataIndex: "pendingConfirmation" },
		...(summary?.canManage
			? [
					{
						title: "",
						render: (_, row) => (
							<Button
								type='primary'
								size='small'
								onClick={() => openEntryModal(row.agent?._id)}
							>
								{txt.addFunds}
							</Button>
						),
					},
			  ]
			: []),
	];

	const txColumns = [
		{ title: txt.transactionType, dataIndex: "transactionType" },
		{ title: txt.amount, dataIndex: "amount", render: money },
		{
			title: txt.date,
			dataIndex: "transactionDate",
			render: (value) => (value ? moment(value).format("YYYY-MM-DD") : "-"),
		},
		{ title: txt.reference, dataIndex: "reference" },
		{ title: txt.note, dataIndex: "note" },
		{
			title: txt.attachments,
			dataIndex: "attachments",
			render: renderAttachments,
		},
		...(summary?.canManage
			? [
					{
						title: txt.actions,
						fixed: isArabic ? "left" : "right",
						render: (_, row) => (
							<WalletActionButtons>
								<Button
									size='small'
									icon={<EditOutlined />}
									disabled={Boolean(row.reservationId)}
									onClick={() => openEditTransactionModal(row)}
								>
									{txt.edit}
								</Button>
								<Popconfirm
									title={txt.deleteConfirm}
									okText={txt.delete}
									cancelText={txt.cancel}
									onConfirm={() => deleteWalletTransaction(row._id)}
								>
									<Button
										size='small'
										danger
										icon={<DeleteOutlined />}
										disabled={Boolean(row.reservationId)}
									>
										{txt.delete}
									</Button>
								</Popconfirm>
							</WalletActionButtons>
						),
					},
			  ]
			: []),
	];

	const reservationColumns = [
		{ title: txt.confirmation, dataIndex: "confirmation_number" },
		{
			title: txt.guest,
			dataIndex: ["customer_details", "name"],
			render: (value) => value || "-",
		},
		{
			title: txt.date,
			dataIndex: "booked_at",
			render: (_, row) =>
				moment(row.booked_at || row.createdAt).format("YYYY-MM-DD"),
		},
		{
			title: txt.amount,
			dataIndex: "total_amount",
			render: (value) => `${money(value)} SAR`,
		},
		{
			title: txt.commission,
			render: (_, row) =>
				`${money(row.commission || row.financial_cycle?.commissionAmount)} SAR`,
		},
		{
			title: txt.status,
			dataIndex: "reservation_status",
			render: (value) => <Tag>{value || "-"}</Tag>,
		},
	];

	return (
		<FinancialWrapper $show={adminMenuStatus} $isArabic={isArabic}>
			{isArabic ? (
				<AdminNavbarArabic
					fromPage='Financials'
					setAdminMenuStatus={setAdminMenuStatus}
					collapsed={collapsed}
					setCollapsed={setCollapsed}
				/>
			) : (
				<AdminNavbar
					fromPage='Financials'
					setAdminMenuStatus={setAdminMenuStatus}
					collapsed={collapsed}
					setCollapsed={setCollapsed}
				/>
			)}
			<div className='grid-container-main'>
				<div />
				<main className='finance-page' dir={isArabic ? "rtl" : "ltr"}>
					<HeaderCard $isArabic={isArabic}>
						<div className='finance-title-block'>
							<span>
								{toTitleCase(
									hotel?.hotelName || summary?.hotel?.hotelName || ""
								)}
							</span>
							<h1>{txt.title}</h1>
							<p>{agentOnly ? txt.ownHint : txt.subtitle}</p>
						</div>
						<HeaderActions $isArabic={isArabic}>
							<Button icon={<ReloadOutlined />} onClick={loadFinancials}>
								{txt.refresh}
							</Button>
							<Button icon={<DownloadOutlined />} onClick={exportExcel}>
								{txt.exportExcel}
							</Button>
							{summary?.canManage && (
								<Button
									type='primary'
									icon={<PlusOutlined />}
									disabled={!agents.length}
									onClick={() => openEntryModal()}
								>
									{txt.addFunds}
								</Button>
							)}
						</HeaderActions>
					</HeaderCard>

					<FilterBar>
						<DateRangeControls $isArabic={isArabic}>
							<DateRangeField>
								<span className='date-label'>{txt.from}</span>
								<ReactDatePicker
									selected={dateRange?.[0] ? dateRange[0].toDate() : null}
									onChange={(value) => updateDateRange(0, value)}
									selectsStart
									startDate={dateRange?.[0] ? dateRange[0].toDate() : null}
									endDate={dateRange?.[1] ? dateRange[1].toDate() : null}
									dateFormat='yyyy-MM-dd'
									showPopperArrow={false}
									isClearable
									placeholderText='YYYY-MM-DD'
									className='finance-filter-date-input'
								/>
								<CalendarOutlined className='calendar-mark' />
							</DateRangeField>
							<DateRangeField>
								<span className='date-label'>{txt.to}</span>
								<ReactDatePicker
									selected={dateRange?.[1] ? dateRange[1].toDate() : null}
									onChange={(value) => updateDateRange(1, value)}
									selectsEnd
									startDate={dateRange?.[0] ? dateRange[0].toDate() : null}
									endDate={dateRange?.[1] ? dateRange[1].toDate() : null}
									minDate={dateRange?.[0] ? dateRange[0].toDate() : null}
									dateFormat='yyyy-MM-dd'
									showPopperArrow={false}
									isClearable
									placeholderText='YYYY-MM-DD'
									className='finance-filter-date-input'
								/>
								<CalendarOutlined className='calendar-mark' />
							</DateRangeField>
						</DateRangeControls>
						{!agentOnly && (
							<Select
								value={selectedAgentId || undefined}
								placeholder={txt.allAgents}
								onChange={setSelectedAgentId}
								allowClear
								options={agents.map((item) => ({
									value: item.agent?._id,
									label: getAgentLabel(item.agent),
								}))}
							/>
						)}
					</FilterBar>

					{activeAgent?.agent?._id && (
						<ActiveAgentBar>
							<div>
								<span>{txt.agent}</span>
								<strong>{getAgentLabel(activeAgent.agent)}</strong>
							</div>
							<div>
								<span>{activeBalancePresentation.label}</span>
								<strong>{activeBalancePresentation.value}</strong>
							</div>
							<div>
								<span>{txt.reservationValue}</span>
								<strong>{money(activeAgent.totalReservationValue)} SAR</strong>
							</div>
							<div>
								<span>{txt.commissionDue}</span>
								<strong>{money(activeAgent.commissionDue)} SAR</strong>
							</div>
						</ActiveAgentBar>
					)}

					{activeIsCommissionOnly && (
						<FinanceNotice>{txt.noWalletAgent}</FinanceNotice>
					)}

					<SummaryGrid>
						<SummaryCard $tone='blue'>
							<WalletOutlined />
							<span>{txt.walletAdded}</span>
							<strong>{money(summary?.totals?.walletAdded)} SAR</strong>
						</SummaryCard>
						<SummaryCard $tone='orange'>
							<BankOutlined />
							<span>{txt.walletUsed}</span>
							<strong>{money(summary?.totals?.walletUsed)} SAR</strong>
						</SummaryCard>
						<SummaryCard $tone='green'>
							<WalletOutlined />
							<span>{totalsBalancePresentation?.label || txt.balance}</span>
							<strong>
								{totalsBalancePresentation?.value ||
									`${money(summary?.totals?.balance)} SAR`}
							</strong>
						</SummaryCard>
						<SummaryCard $tone='purple'>
							<BankOutlined />
							<span>{txt.commissionDue}</span>
							<strong>{money(summary?.totals?.commissionDue)} SAR</strong>
						</SummaryCard>
					</SummaryGrid>

					<Panel>
						<PanelTitle>{txt.agent}</PanelTitle>
						<Table
							rowKey={(row) => row.agent?._id}
							dataSource={agents}
							columns={agentColumns}
							loading={loading}
							size='small'
							scroll={{ x: 1180 }}
							pagination={{ pageSize: 8 }}
							locale={{ emptyText: txt.noRows }}
							rowClassName={(row) =>
								row.agent?._id === activeAgentId
									? "finance-agent-row finance-agent-row-selected"
									: "finance-agent-row"
							}
							onRow={(row) => ({
								onClick: () => setSelectedAgentId(row.agent?._id),
							})}
						/>
					</Panel>

					<DetailsGrid>
						<Panel>
							<PanelTitle>{txt.transactions}</PanelTitle>
							<Table
								rowKey={(row) => row._id || row.reference || row.transactionDate}
								dataSource={activeTransactions}
								columns={txColumns}
								size='small'
								scroll={{ x: summary?.canManage ? 1120 : 940 }}
								pagination={{ pageSize: 6 }}
								locale={{ emptyText: txt.noRows }}
							/>
						</Panel>
						<Panel>
							<PanelTitle>
								{activeIsCommissionOnly
									? txt.reservations
									: txt.reservationDeductions}
							</PanelTitle>
							<Table
								rowKey={(row) => row._id}
								dataSource={activeReservations}
								columns={reservationColumns}
								size='small'
								scroll={{ x: 880 }}
								pagination={{ pageSize: 6 }}
								locale={{ emptyText: txt.noRows }}
							/>
						</Panel>
					</DetailsGrid>

						<Modal
							open={modalOpen}
							onCancel={() => {
								setEditingTransactionId("");
								setModalOpen(false);
							}}
							onOk={saveEntry}
							confirmLoading={entrySaving}
							okText={editingTransactionId ? txt.updateEntry : txt.save}
							cancelText={txt.cancel}
							title={editingTransactionId ? txt.updateEntry : txt.addFunds}
							width={760}
						>
						<EntryGrid>
							<label>
								<span>{txt.agent}</span>
									<Select
										value={entry.agentId || undefined}
										disabled={Boolean(editingTransactionId)}
										onChange={(value) =>
										setEntry((current) => ({ ...current, agentId: value }))
									}
									options={agents.map((item) => ({
										value: item.agent?._id,
										label: getAgentLabel(item.agent),
									}))}
								/>
							</label>
							<label>
								<span>{txt.transactionType}</span>
								<Select
									value={entry.transactionType}
									onChange={(value) =>
										setEntry((current) => ({
											...current,
											transactionType: value,
										}))
									}
									options={transactionOptions(txt)}
								/>
							</label>
							<label>
								<span>{txt.amount}</span>
								<InputNumber
									value={entry.amount}
									min={0}
									precision={2}
									addonAfter='SAR'
									onChange={(value) =>
										setEntry((current) => ({ ...current, amount: value || 0 }))
									}
								/>
							</label>
							<label>
								<span>{txt.date}</span>
								<DatePickerField>
									<ReactDatePicker
										selected={toDatePickerValue(entry.transactionDate)}
										onChange={(value) =>
											setEntry((current) => ({
												...current,
												transactionDate: value ? moment(value) : moment(),
											}))
										}
										dateFormat='yyyy-MM-dd'
										maxDate={new Date()}
										showPopperArrow={false}
										className='finance-datepicker-input'
									/>
									<CalendarOutlined className='calendar-mark' />
								</DatePickerField>
							</label>
							<label>
								<span>{txt.reference}</span>
								<Input
									value={entry.reference}
									onChange={(event) =>
										setEntry((current) => ({
											...current,
											reference: event.target.value,
										}))
									}
								/>
							</label>
							<label className='wide'>
								<span>{txt.note}</span>
								<Input.TextArea
									value={entry.note}
									rows={3}
									onChange={(event) =>
										setEntry((current) => ({
											...current,
											note: event.target.value,
										}))
									}
								/>
							</label>
							<AttachmentPicker className='wide'>
								<div className='attachment-picker-head'>
									<strong>
										<PaperClipOutlined /> {txt.attachments}
									</strong>
									<span>{txt.attachmentHint}</span>
								</div>
								<label className='attachment-upload-button'>
									<PaperClipOutlined />
									{txt.uploadAttachments}
									<input
										type='file'
										multiple
										accept='image/*,application/pdf,.pdf'
										disabled={entrySaving}
										onChange={handleAttachmentFiles}
									/>
								</label>
								<AttachmentList>
									{(Array.isArray(entry.attachments)
										? entry.attachments
										: []
									).map((attachment, index) => (
										<li key={`${attachment.public_id || attachment.fileName || index}`}>
											<div>
												<PaperClipOutlined />
												<span>{attachmentLabel(attachment, index)}</span>
												<small>{formatFileSize(attachment.fileSize)}</small>
											</div>
											<div className='attachment-actions'>
												{attachment.url ? (
													<a
														href={attachment.url}
														target='_blank'
														rel='noreferrer'
													>
														{txt.viewAttachment}
													</a>
												) : (
													<span>{txt.pendingUpload}</span>
												)}
												<button
													type='button'
													disabled={entrySaving}
													onClick={() => removeEntryAttachment(index)}
												>
													{txt.removeAttachment}
												</button>
											</div>
										</li>
									))}
								</AttachmentList>
							</AttachmentPicker>
						</EntryGrid>
					</Modal>
				</main>
			</div>
		</FinancialWrapper>
	);
};

export default FinancialMain;

const FinancialWrapper = styled.div`
	--hotel-side-width: ${(props) => (props.$show ? "80px" : "285px")};
	box-sizing: border-box;
	overflow-x: hidden;
	margin-top: 70px;
	min-height: calc(100vh - 70px);
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	background: #f5f7fb;

	*,
	*::before,
	*::after {
		box-sizing: border-box;
	}

	.grid-container-main {
		display: block;
		min-width: 0;
	}

	.grid-container-main > div:first-child {
		display: none;
	}

	.finance-page {
		width: auto;
		margin-left: ${(props) =>
			props.$isArabic ? "0" : "var(--hotel-side-width)"};
		margin-right: ${(props) =>
			props.$isArabic ? "var(--hotel-side-width)" : "0"};
		padding: 14px clamp(10px, 1.2vw, 20px) 28px;
		background: linear-gradient(180deg, #f6f9fc 0%, #eef4fb 100%);
		min-height: calc(100vh - 70px);
		transition: margin 0.22s ease;
		overflow-x: hidden;
	}

	.finance-page > * {
		max-width: 100%;
	}

	.ant-table-wrapper,
	.ant-table-container {
		max-width: 100%;
	}

	.finance-page[dir="rtl"] .ant-select-selector,
	.finance-page[dir="rtl"] .ant-input,
	.finance-page[dir="rtl"] .ant-input-number-input,
	.finance-page[dir="rtl"] textarea {
		text-align: right;
	}

	.finance-page[dir="rtl"] .ant-select-selection-item,
	.finance-page[dir="rtl"] .ant-select-selection-placeholder {
		text-align: right;
		padding-inline-end: 0;
	}

	@media (max-width: 1200px) {
		.finance-page {
			margin: 0;
			padding: 10px;
		}
	}
`;

const HeaderCard = styled.section`
	background: linear-gradient(135deg, #eaf6ff 0%, #f8fcff 100%);
	border: 1px solid #b9ddff;
	border-radius: 12px;
	padding: 10px 14px;
	display: grid;
	grid-template-columns: minmax(230px, 1fr) minmax(280px, auto) minmax(230px, 1fr);
	align-items: center;
	gap: 10px;
	margin-bottom: 12px;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
	direction: ltr;

	.finance-title-block {
		min-width: 0;
		grid-column: 2;
		justify-self: center;
		text-align: center;
		direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	}

	.finance-title-block > span {
		display: inline-flex;
		align-items: center;
		width: fit-content;
		max-width: 100%;
		padding: 3px 10px;
		border-radius: 999px;
		background: #ffffff;
		border: 1px solid #b9ddff;
		color: #0d6efd;
		font-weight: 800;
		letter-spacing: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	h1 {
		margin: 4px 0 2px;
		font-weight: 900;
		color: #0f172a;
		font-size: clamp(1.25rem, 1.65vw, 1.75rem);
		line-height: 1.15;
	}
	p {
		margin: 0;
		color: #475569;
		font-weight: 700;
		max-width: 720px;
		line-height: 1.35;
		font-size: 0.9rem;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
		padding: 12px;

		.finance-title-block {
			grid-column: 1;
			text-align: ${(props) => (props.$isArabic ? "right" : "left")};
			justify-self: stretch;
		}
	}
`;

const HeaderActions = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	grid-column: ${(props) => (props.$isArabic ? "1" : "3")};
	grid-row: 1;
	justify-content: ${(props) => (props.$isArabic ? "flex-start" : "flex-end")};
	align-items: center;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};

	.ant-btn {
		min-height: 32px;
		border-radius: 8px;
		font-weight: 800;
		padding-inline: 13px;
	}

	.ant-btn-primary {
		color: #fff !important;
		background: linear-gradient(135deg, #1677ff 0%, #0b63ce 100%);
		border: 0;
		box-shadow: 0 8px 16px rgba(13, 110, 253, 0.18);
	}

	@media (max-width: 760px) {
		grid-column: 1;
		grid-row: auto;
		justify-content: stretch;
		button {
			flex: 1 1 120px;
		}
	}
`;

const FilterBar = styled.div`
	background: white;
	border: 1px solid #d8e8f7;
	border-radius: 10px;
	padding: 8px;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
	gap: 8px;
	margin-bottom: 12px;
	box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);

	.ant-select {
		width: 100%;
		min-width: 0;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const DateRangeControls = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};

	@media (max-width: 520px) {
		grid-template-columns: 1fr 1fr;
	}
`;

const DateRangeField = styled.label`
	position: relative;
	display: block;
	min-width: 0;

	.date-label {
		position: absolute;
		top: -7px;
		inset-inline-start: 11px;
		z-index: 1;
		background: #fff;
		padding: 0 5px;
		color: #64748b;
		font-size: 0.68rem;
		font-weight: 900;
		line-height: 1;
	}

	.react-datepicker-wrapper,
	.react-datepicker__input-container {
		width: 100%;
	}

	.finance-filter-date-input {
		width: 100%;
		min-height: 34px;
		border: 1px solid #d9e6f2;
		border-radius: 7px;
		padding: 5px 38px 5px 38px;
		background: #fff;
		color: #0f172a;
		direction: ltr;
		text-align: center;
		font-size: 13px;
		font-weight: 800;
		outline: 0;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.finance-filter-date-input:focus {
		border-color: #1677ff;
		box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.11);
	}

	.calendar-mark {
		position: absolute;
		top: 50%;
		inset-inline-end: 11px;
		transform: translateY(-50%);
		color: #94a3b8;
		pointer-events: none;
	}

	.react-datepicker__close-icon {
		right: 28px;
		height: 100%;
		padding: 0;
	}

	.react-datepicker__close-icon::after {
		background: #94a3b8;
		font-size: 12px;
	}

	.react-datepicker-popper {
		z-index: 2100;
	}
`;

const ActiveAgentBar = styled.section`
	display: grid;
	grid-template-columns: minmax(220px, 1.4fr) repeat(3, minmax(150px, 1fr));
	gap: 8px;
	margin-bottom: 12px;

	> div {
		min-width: 0;
		display: grid;
		gap: 2px;
		padding: 9px 11px;
		border: 1px solid #cfe5ff;
		border-radius: 10px;
		background: #ffffff;
		box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
	}

	span {
		color: #64748b;
		font-size: 0.76rem;
		font-weight: 800;
	}

	strong {
		color: #0f172a;
		font-size: 0.96rem;
		font-weight: 950;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		direction: ltr;
		unicode-bidi: plaintext;
	}

	@media (max-width: 980px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 520px) {
		grid-template-columns: 1fr 1fr;
		gap: 7px;

		> div {
			padding: 9px;
		}

		strong {
			font-size: 0.86rem;
		}
	}
`;

const FinanceNotice = styled.div`
	margin: -2px 0 12px;
	padding: 9px 12px;
	border: 1px solid #d8c7ff;
	border-radius: 10px;
	background: #f7f2ff;
	color: #5b21b6;
	font-weight: 850;
	line-height: 1.35;
`;

const SummaryGrid = styled.section`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	gap: 9px;
	margin-bottom: 12px;

	@media (max-width: 980px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 520px) {
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
`;

const cardTones = {
	blue: ["#e0f2fe", "#0284c7"],
	orange: ["#fff7ed", "#ea580c"],
	green: ["#ecfdf5", "#059669"],
	purple: ["#f5f3ff", "#7c3aed"],
};

const SummaryCard = styled.article`
	background: ${(props) => cardTones[props.$tone]?.[0] || "#fff"};
	border: 1px solid ${(props) => cardTones[props.$tone]?.[1] || "#dbeafe"};
	border-radius: 10px;
	padding: 10px 12px;
	min-height: 76px;
	display: grid;
	align-content: center;
	gap: 3px;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);

	svg {
		color: ${(props) => cardTones[props.$tone]?.[1] || "#0d6efd"};
		font-size: 18px;
	}
	span {
		color: #475569;
		font-weight: 800;
		font-size: 0.82rem;
	}
	strong {
		color: #020617;
		font-size: clamp(1rem, 1.6vw, 1.45rem);
		line-height: 1.1;
		word-break: keep-all;
		direction: ltr;
		unicode-bidi: plaintext;
	}

	@media (max-width: 520px) {
		min-height: 84px;
		padding: 10px;

		span {
			font-size: 0.74rem;
		}

		strong {
			font-size: 0.9rem;
		}
	}
`;

const Panel = styled.section`
	background: white;
	border: 1px solid #d8e8f7;
	border-radius: 12px;
	padding: 10px;
	margin-bottom: 12px;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
	overflow: hidden;

	.ant-table {
		font-size: 0.82rem;
	}

	.ant-table-container {
		border-radius: 8px;
	}

	.ant-table-content {
		scrollbar-width: thin;
	}

	.ant-table-thead > tr > th {
		background: #edf7ff;
		color: #0f172a;
		font-weight: 900;
		white-space: nowrap;
		text-align: inherit;
		padding: 9px 10px;
	}

	.ant-table-tbody > tr > td {
		white-space: nowrap;
		vertical-align: middle;
		text-align: inherit;
		padding: 8px 10px;
	}

	.finance-agent-row {
		cursor: pointer;
	}

	.finance-agent-row-selected > td {
		background: #f0f8ff !important;
	}

	.finance-agent-row-selected td:first-child {
		box-shadow: inset 4px 0 #1677ff;
	}

	.ant-pagination {
		margin: 10px 0 0 !important;
	}

	@media (max-width: 520px) {
		padding: 9px;
		border-radius: 10px;

		.ant-table {
			font-size: 0.74rem;
		}
	}
`;

const PanelTitle = styled.h2`
	margin: 0 0 8px;
	font-size: 1.05rem;
	font-weight: 900;
	color: #0f172a;
`;

const AgentNameButton = styled.button`
	background: transparent;
	border: 0;
	padding: 0;
	display: grid;
	text-align: inherit;
	cursor: pointer;

	strong {
		color: #075985;
		text-decoration: underline;
	}
	span {
		color: #64748b;
		font-size: 0.82rem;
	}
`;

const WalletActionButtons = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	white-space: nowrap;

	.ant-btn {
		border-radius: 8px;
		font-weight: 800;
	}

	.ant-btn:not(.ant-btn-dangerous) {
		color: #075985;
		border-color: #bfdbfe;
		background: #eff6ff;
	}
`;

const AttachmentLinks = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	max-width: 260px;

	a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		max-width: 140px;
		padding: 3px 8px;
		border: 1px solid #bfdbfe;
		border-radius: 999px;
		background: #eff6ff;
		color: #075985;
		font-weight: 800;
		text-decoration: none;
	}

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const DetailsGrid = styled.section`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;

	@media (max-width: 1120px) {
		grid-template-columns: 1fr;
	}
`;

const EntryGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;

	label {
		display: grid;
		gap: 6px;
		font-weight: 800;
		color: #0f172a;
	}

	.ant-select,
	.ant-input-number,
	.ant-picker {
		width: 100%;
	}

	.wide {
		grid-column: 1 / -1;
	}

	@media (max-width: 620px) {
		grid-template-columns: 1fr;
	}
`;

const AttachmentPicker = styled.div`
	display: grid;
	gap: 9px;
	padding: 10px;
	border: 1px solid #d8e8f7;
	border-radius: 10px;
	background: linear-gradient(135deg, #f8fbff 0%, #eef7ff 100%);

	.attachment-picker-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.attachment-picker-head strong {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #0f172a;
		font-weight: 900;
	}

	.attachment-picker-head span {
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 800;
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
		background: #ffffff;
	}

	li > div:first-child {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 7px;
	}

	li > div:first-child span {
		font-weight: 900;
		color: #0f172a;
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

	.attachment-actions a,
	.attachment-actions span {
		color: #075985;
		font-weight: 900;
	}

	button {
		border: 0;
		background: transparent;
		color: #b91c1c;
		font-weight: 900;
		cursor: pointer;
		padding: 0;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 520px) {
		li {
			align-items: stretch;
			flex-direction: column;
		}

		.attachment-actions {
			justify-content: space-between;
		}
	}
`;

const DatePickerField = styled.div`
	position: relative;
	width: 100%;

	.react-datepicker-wrapper,
	.react-datepicker__input-container {
		width: 100%;
	}

	.finance-datepicker-input {
		width: 100%;
		min-height: 32px;
		border: 1px solid #d9d9d9;
		border-radius: 6px;
		padding: 4px 36px 4px 12px;
		background: #fff;
		color: #0f172a;
		direction: ltr;
		font-size: 14px;
		outline: 0;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.finance-datepicker-input:focus {
		border-color: #1677ff;
		box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.12);
	}

	.calendar-mark {
		position: absolute;
		top: 50%;
		right: 11px;
		transform: translateY(-50%);
		color: #94a3b8;
		pointer-events: none;
	}

	.react-datepicker-popper {
		z-index: 2100;
	}
`;
