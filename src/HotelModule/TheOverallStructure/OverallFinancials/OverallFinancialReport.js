import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Empty, Select, Spin, Table, Tag, message } from "antd";
import {
	BankOutlined,
	CalendarOutlined,
	DownloadOutlined,
	ReloadOutlined,
	WalletOutlined,
} from "@ant-design/icons";
import moment from "moment";
import styled from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import {
	getAgentWalletSummary,
	getOverallSummary,
	trackOverallFinancialReportExport,
} from "../../apiAdmin";
import {
	buildOwnerParams,
	getOverallText,
	normalizeId,
	OverallCard,
	OverallCards,
	OverallPageShell,
	titleCase,
} from "../overallShared";

const TEXT = {
	en: {
		title: "General Financial Report",
		subtitle:
			"Agent wallets, reservation deductions, commissions, and confirmations across assigned hotels.",
		chooseHotel: "Choose hotel",
		allHotels: "All hotels",
		chooseAgent: "Choose agent",
		allAgents: "All agents",
		from: "From",
		to: "To",
		refresh: "Refresh",
		exportExcel: "Export Excel",
		exportingExcel: "Exporting...",
		exportNoData: "No financial rows are available to export.",
		exportError: "Unable to export financial report.",
		agent: "Agent",
		company: "Company",
		hotel: "Hotel",
		model: "Model",
		walletAdded: "Wallet added",
		walletUsed: "Reservation deductions",
		balance: "Current balance",
		reservations: "Reservations",
		reservationValue: "Reservation value",
		commissionPaid: "Commission paid",
		commissionDue: "Commission due",
		commissionUnpaid: "Unpaid commission",
		pending: "Pending confirmation",
		transactions: "Wallet movements",
		reservationDeductions: "Reservations / deductions",
		type: "Type",
		amount: "Amount",
		date: "Date",
		reference: "Reference",
		note: "Note",
		confirmation: "Confirmation",
		guest: "Guest",
		status: "Status",
		financialStatus: "Financial status",
		accepted: "Accepted",
		rejected: "Rejected",
		rejectionReason: "Rejection reason",
		pendingReview: "Pending review",
		voided: "Voided",
		notReconciled: "Not added to reconciliation",
		commissionOnly: "Commission only",
		walletInventory: "Inventory wallet",
		mixedModel: "Wallet + commission",
		noData: "No financial data found.",
		error: "Unable to load financials.",
	},
	ar: {
		title: "التقرير المالي العام",
		subtitle:
			"محافظ الوكلاء وخصومات الحجوزات والعمولات والتأكيدات عبر الفنادق المخصصة.",
		chooseHotel: "اختر الفندق",
		allHotels: "كل الفنادق",
		chooseAgent: "اختر الوكيل",
		allAgents: "كل الوكلاء",
		from: "من",
		to: "إلى",
		refresh: "تحديث",
		exportExcel: "تصدير إكسل",
		exportingExcel: "جاري التصدير...",
		exportNoData: "لا توجد بيانات مالية متاحة للتصدير.",
		exportError: "تعذر تصدير التقرير المالي.",
		agent: "الوكيل",
		company: "الشركة",
		hotel: "الفندق",
		model: "النموذج",
		walletAdded: "المضافة للمحفظة",
		walletUsed: "خصومات الحجوزات",
		balance: "الرصيد الحالي",
		reservations: "الحجوزات",
		reservationValue: "قيمة الحجوزات",
		commissionDue: "العمولة المستحقة",
		pending: "بانتظار التأكيد",
		transactions: "حركات المحفظة",
		reservationDeductions: "الحجوزات / الخصومات",
		type: "النوع",
		amount: "المبلغ",
		date: "التاريخ",
		reference: "مرجع",
		note: "ملاحظة",
		confirmation: "رقم التأكيد",
		guest: "الضيف",
		status: "الحالة",
		financialStatus: "\u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
		accepted: "\u0645\u0639\u062a\u0645\u062f",
		rejected: "\u0645\u0631\u0641\u0648\u0636",
		rejectionReason: "\u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636",
		pendingReview: "\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
		voided: "\u0645\u0644\u063a\u0649",
		notReconciled: "\u0644\u0627 \u064a\u062f\u062e\u0644 \u0641\u064a \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629",
		commissionOnly: "عمولة فقط",
		walletInventory: "محفظة مخزون",
		mixedModel: "محفظة وعمولة",
		noData: "لا توجد بيانات مالية.",
		error: "تعذر تحميل البيانات المالية.",
	},
};

Object.assign(TEXT.ar, {
	commissionPaid: "\u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629",
	commissionUnpaid: "\u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u063a\u064a\u0631 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629",
});

const money = (value) =>
	`${Number(value || 0).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})} SAR`;

const n2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const formatDate = (value) =>
	value ? moment(value).format("YYYY-MM-DD") : "-";

const safeFileSegment = (value = "financial-report") =>
	String(value || "financial-report")
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 80) || "financial-report";

const safeSheetName = (value = "Sheet") =>
	String(value || "Sheet")
		.replace(/[\\/?*[\]:]/g, " ")
		.slice(0, 31) || "Sheet";

const REPORT_COLUMN_WIDTHS = {
	"#": 8,
	Hotel: 18,
	Agent: 24,
	Company: 24,
	Email: 26,
	Model: 18,
	"Wallet Added": 14,
	"Reservation Deductions": 20,
	Balance: 14,
	Reservations: 13,
	"Reservation Value": 18,
	"Commission Paid": 16,
	"Commission Due": 16,
	"Pending Confirmation": 19,
	Type: 18,
	Amount: 14,
	Date: 13,
	Reference: 22,
	Note: 30,
	"Financial Status": 18,
	"Rejection Reason": 28,
	"Reconciliation Eligible": 22,
	Confirmation: 18,
	Guest: 24,
	Status: 18,
	Value: 18,
};

const getReportColumnWidth = (key, rows = []) => {
	const maxWidth = REPORT_COLUMN_WIDTHS[key] || 18;
	const minWidth = Math.min(
		maxWidth,
		Math.max(10, Math.ceil(String(key).length * 0.75))
	);
	const contentWidth = rows.reduce((max, row) => {
		const value = row?.[key];
		const length = value === null || value === undefined ? 0 : String(value).length;
		return Math.max(max, Math.ceil(length * 0.85) + 2);
	}, minWidth);
	return Math.min(maxWidth, Math.max(minWidth, contentWidth));
};

const loadStyledXlsx = async () => {
	const xlsxModule = await import("xlsx-js-style");
	return xlsxModule.default || xlsxModule["module.exports"] || xlsxModule;
};

const appendJsonSheet = (
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
		worksheet["!rows"] = Array.from({ length: range.e.r + 1 }, (_, index) => ({
			hpt: index === 0 ? 28 : 30,
		}));
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

const agentCommercialModel = (record = {}) =>
	record.commercialModel || record.agent?.agentCommercialModel || "wallet_inventory";

const commercialModelLabel = (record = {}, txt = TEXT.en) => {
	const model = agentCommercialModel(record);
	if (model === "commission_only") return txt.commissionOnly;
	if (model === "mixed") return txt.mixedModel;
	return txt.walletInventory;
};

const walletBalanceTone = (record = {}) => {
	if (agentCommercialModel(record) === "commission_only" || record.walletRequired === false) {
		return "purple";
	}
	return Number(record.balance || 0) < 0 ? "orange" : "green";
};

const transactionFinancialStatus = (transaction = {}) => {
	const status = String(transaction.financialStatus || transaction.status || "")
		.trim()
		.toLowerCase();
	const reviewStatus = String(transaction.reviewStatus || "")
		.trim()
		.toLowerCase();
	if (status === "rejected" || reviewStatus === "rejected") return "rejected";
	if (status === "pending" || reviewStatus === "pending") return "pending";
	if (status === "void") return "void";
	return "accepted";
};

const transactionStatusTone = (transaction = {}) => {
	const status = transactionFinancialStatus(transaction);
	if (status === "rejected") return "red";
	if (status === "pending") return "orange";
	if (status === "void") return "default";
	return "green";
};

const transactionStatusLabel = (transaction = {}, txt = TEXT.en) => {
	const status = transactionFinancialStatus(transaction);
	if (status === "rejected") return txt.rejected;
	if (status === "pending") return txt.pendingReview;
	if (status === "void") return txt.voided;
	return txt.accepted;
};

const transactionRejectionReason = (transaction = {}) =>
	String(
		transaction.rejectionReason ||
			transaction.reviewRejectionReason ||
			transaction.rejection_reason ||
			transaction.decisionReason ||
			transaction.reason ||
			""
	).trim();

const transactionReconciliationEligible = (transaction = {}) =>
	transaction.reconciliationEligible === true ||
	transactionFinancialStatus(transaction) === "accepted";

const buildAgentExportRows = (items = [], txt = TEXT.en) =>
	items.map((item, index) => ({
		"#": index + 1,
		Hotel: item.hotelName || "",
		Agent: item.agent?.name || item.agent?.email || "",
		Company: item.agent?.companyName || "",
		Email: item.agent?.email || "",
		Model: commercialModelLabel(item, txt),
		"Wallet Added": Number(item.walletAdded || 0),
		"Reservation Deductions": Number(item.walletUsed || 0),
		Balance: Number(item.balance || 0),
		Reservations: Number(item.totalReservations || 0),
		"Reservation Value": Number(item.totalReservationValue || 0),
		"Commission Paid": Number(item.commissionPaid || 0),
		"Commission Due": Number(item.commissionDue || 0),
		"Pending Confirmation": Number(item.pendingConfirmation || 0),
	}));

const buildAgentTrackingRows = (items = [], displayRows = []) =>
	displayRows.map((row, index) => ({
		...row,
		hotelId: items[index]?.hotelId || "",
		agentId: normalizeId(items[index]?.agent),
	}));

const buildTransactionExportRows = (items = []) =>
	items.map((tx, index) => ({
		"#": index + 1,
		Hotel: tx.hotelName || "",
		Agent: tx.agentName || "",
		Company: tx.companyName || "",
		Type: tx.transactionType || "",
		Amount: Number(tx.amount || 0),
		Date: formatDate(tx.transactionDate),
		"Financial Status": transactionStatusLabel(tx, TEXT.en),
		"Rejection Reason":
			transactionFinancialStatus(tx) === "rejected"
				? transactionRejectionReason(tx)
				: "",
		"Reconciliation Eligible": transactionReconciliationEligible(tx)
			? "Yes"
			: "No",
		Reference: tx.reference || "",
		Note: tx.note || "",
	}));

const buildTransactionTrackingRows = (items = [], displayRows = []) =>
	displayRows.map((row, index) => ({
		...row,
		hotelId: items[index]?.hotelId || "",
		agentId: normalizeId(items[index]?.agent || items[index]?.agentId),
		transactionId: normalizeId(items[index]?._id),
		financialStatus: items[index]?.financialStatus || "",
		reconciliationEligible: transactionReconciliationEligible(items[index]),
	}));

const buildReservationExportRows = (items = []) =>
	items.map((reservation, index) => ({
		"#": index + 1,
		Hotel: reservation.hotelName || "",
		Agent: reservation.agentName || "",
		Company: reservation.companyName || "",
		Confirmation: reservation.confirmation_number || "",
		Guest: reservation.customer_details?.name || "",
		Date: formatDate(reservation.booked_at || reservation.createdAt),
		Amount: Number(reservation.total_amount || 0),
		"Commission Due": Number(
			reservation.commission ||
				reservation.financial_cycle?.commissionAmount ||
				0
		),
		Status: reservation.reservation_status || reservation.state || "",
	}));

const buildReservationTrackingRows = (items = [], displayRows = []) =>
	displayRows.map((row, index) => ({
		...row,
		hotelId: items[index]?.hotelId || "",
		agentId: normalizeId(items[index]?.agent || items[index]?.agentId),
		reservationId: normalizeId(items[index]?._id),
		confirmation_number: items[index]?.confirmation_number || row.Confirmation || "",
	}));

const buildTotalsExportRows = (totals = {}, txt = TEXT.en) => [
	{ Metric: txt.walletAdded, Value: Number(totals.walletAdded || 0) },
	{ Metric: txt.walletUsed, Value: Number(totals.walletUsed || 0) },
	{ Metric: txt.balance, Value: Number(totals.balance || 0) },
	{ Metric: txt.reservations, Value: Number(totals.totalReservations || 0) },
	{
		Metric: txt.reservationValue,
		Value: Number(totals.totalReservationValue || 0),
	},
	{ Metric: txt.commissionPaid, Value: Number(totals.commissionPaid || 0) },
	{ Metric: txt.commissionDue, Value: Number(totals.commissionDue || 0) },
	{ Metric: txt.pending, Value: Number(totals.pendingConfirmation || 0) },
];

const decorateAgentRow = (item = {}, hotel = {}) => ({
	...item,
	hotelId: normalizeId(hotel._id || hotel.id),
	hotelName: titleCase(hotel.hotelName || hotel.name || "Hotel"),
	transactions: (Array.isArray(item.transactions) ? item.transactions : []).map((tx) => ({
		...tx,
		hotelId: normalizeId(hotel._id || hotel.id),
		hotelName: titleCase(hotel.hotelName || hotel.name || "Hotel"),
	})),
	reservations: (Array.isArray(item.reservations) ? item.reservations : []).map(
		(reservation) => ({
			...reservation,
			hotelId: normalizeId(hotel._id || hotel.id),
			hotelName: titleCase(hotel.hotelName || hotel.name || "Hotel"),
		})
	),
});

const buildTotals = (items = []) =>
	items.reduce(
		(acc, item) => ({
			walletAdded: n2(acc.walletAdded + Number(item.walletAdded || 0)),
			walletUsed: n2(acc.walletUsed + Number(item.walletUsed || 0)),
			balance: n2(acc.balance + Number(item.balance || 0)),
			totalReservations:
				acc.totalReservations + Number(item.totalReservations || 0),
			totalReservationValue: n2(
				acc.totalReservationValue + Number(item.totalReservationValue || 0)
			),
			commissionPaid: n2(acc.commissionPaid + Number(item.commissionPaid || 0)),
			commissionDue: n2(acc.commissionDue + Number(item.commissionDue || 0)),
			pendingConfirmation:
				acc.pendingConfirmation + Number(item.pendingConfirmation || 0),
		}),
		{
			walletAdded: 0,
			walletUsed: 0,
			balance: 0,
			totalReservations: 0,
			totalReservationValue: 0,
			commissionPaid: 0,
			commissionDue: 0,
			pendingConfirmation: 0,
		}
	);

const getQueryValue = (search = "", key = "") =>
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

const normalizeRoleKey = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/[\s_-]+/g, "");

const isOrderTakerOnly = (user = {}) => {
	const roles = roleNumbers(user);
	const descriptions = roleDescriptions(user).map(normalizeRoleKey);
	const accessTo = Array.isArray(user.accessTo) ? user.accessTo : [];
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

const OverallFinancialReport = ({ userId, user, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const txt = useMemo(
		() => ({ ...getOverallText(chosenLanguage), ...TEXT[isRTL ? "ar" : "en"] }),
		[chosenLanguage, isRTL]
	);
	const history = useHistory();
	const location = useLocation();
	const agentOnly = isOrderTakerOnly(user);
	const ownAgentId = normalizeId(user?._id);
	const [hotels, setHotels] = useState([]);
	const [allRows, setAllRows] = useState([]);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [filters, setFilters] = useState({
		hotelId: getQueryValue(location.search, "hotelId"),
		agentId: getQueryValue(location.search, "agentId"),
		startDate: getQueryValue(location.search, "startDate"),
		endDate: getQueryValue(location.search, "endDate"),
	});

	const syncQuery = useCallback(
		(nextFilters = filters) => {
			const params = new URLSearchParams(location.search || "");
			params.set("overall", "financial-report");
			["hotelId", "agentId", "startDate", "endDate"].forEach((key) => {
				if (nextFilters[key]) params.set(key, nextFilters[key]);
				else params.delete(key);
			});
			history.replace({ pathname: location.pathname, search: `?${params}` });
		},
		[filters, history, location.pathname, location.search]
	);

	useEffect(() => {
		if (!userId || !token) return;
		getOverallSummary(userId, token, {
			...buildOwnerParams(ownerId),
			range: "all",
		}).then((data) => {
			if (data?.error) {
				message.error(data.error || txt.error);
				setHotels([]);
				return;
			}
			setHotels(Array.isArray(data?.hotels) ? data.hotels : []);
		});
	}, [ownerId, token, txt.error, userId]);

	useEffect(() => {
		if (!agentOnly || !ownAgentId || filters.agentId === ownAgentId) return;
		const next = { ...filters, agentId: ownAgentId };
		setFilters(next);
		syncQuery(next);
	}, [agentOnly, filters, ownAgentId, syncQuery]);

	const loadFinancials = useCallback(async () => {
		if (!userId || !token || !hotels.length) return;
		const selectedHotels = filters.hotelId
			? hotels.filter((hotel) => normalizeId(hotel._id) === filters.hotelId)
			: hotels;
		setLoading(true);
		try {
			const results = await Promise.all(
				selectedHotels.map(async (hotel) => {
					const data = await getAgentWalletSummary(hotel._id, userId, token, {
						startDate: filters.startDate,
						endDate: filters.endDate,
					});
					return { data, hotel };
				})
			);
			const rows = results.flatMap(({ data, hotel }) =>
				data && !data.error && Array.isArray(data.agents)
					? data.agents.map((item) => decorateAgentRow(item, hotel))
					: []
			);
			setAllRows(rows);
		} catch (error) {
			console.error(error);
			message.error(txt.error);
			setAllRows([]);
		} finally {
			setLoading(false);
		}
	}, [
		filters.endDate,
		filters.hotelId,
		filters.startDate,
		hotels,
		token,
		txt.error,
		userId,
	]);

	useEffect(() => {
		loadFinancials();
	}, [loadFinancials]);

	const agentOptions = useMemo(() => {
		const map = new Map();
		allRows.forEach((item) => {
			const agentId = normalizeId(item.agent);
			if (!agentId || map.has(agentId)) return;
			const name = titleCase(item.agent?.name || item.agent?.email || "");
			const company = titleCase(item.agent?.companyName || "");
			map.set(agentId, {
				value: agentId,
				label: company && company !== name ? `${name} | ${company}` : name || company,
			});
		});
		return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
	}, [allRows]);

	const visibleAgentOptions = useMemo(() => {
		if (!agentOnly) return [{ value: "", label: txt.allAgents }, ...agentOptions];
		const ownOption =
			agentOptions.find((option) => option.value === ownAgentId) ||
			(ownAgentId
				? {
						value: ownAgentId,
						label: titleCase(
							user?.companyName || user?.name || user?.email || txt.agent
						),
				  }
				: null);
		return ownOption ? [ownOption] : [];
	}, [agentOnly, agentOptions, ownAgentId, txt.agent, txt.allAgents, user]);

	const rows = useMemo(
		() =>
			(agentOnly ? ownAgentId : filters.agentId)
				? allRows.filter(
						(item) =>
							normalizeId(item.agent) ===
							(agentOnly ? ownAgentId : filters.agentId)
				  )
				: allRows,
		[agentOnly, allRows, filters.agentId, ownAgentId]
	);
	const totals = useMemo(() => buildTotals(rows), [rows]);
	const transactions = useMemo(
		() =>
			rows.flatMap((item) =>
				(Array.isArray(item.transactions) ? item.transactions : []).map((tx) => ({
					...tx,
					agentName: item.agent?.name || item.agent?.email || "",
					companyName: item.agent?.companyName || "",
					agentId: normalizeId(item.agent),
				}))
			),
		[rows]
	);
	const reservations = useMemo(
		() =>
			rows.flatMap((item) =>
				(Array.isArray(item.reservations) ? item.reservations : []).map(
					(reservation) => ({
						...reservation,
						agentName: item.agent?.name || item.agent?.email || "",
						companyName: item.agent?.companyName || "",
						agentId: normalizeId(item.agent),
					})
				)
			),
		[rows]
	);

	const updateFilter = (key, value) => {
		const next = {
			...filters,
			[key]: agentOnly && key === "agentId" ? ownAgentId : value || "",
		};
		if (key === "hotelId" && !agentOnly) next.agentId = "";
		if (agentOnly && ownAgentId) next.agentId = ownAgentId;
		setFilters(next);
		syncQuery(next);
	};

	const handleExportExcel = useCallback(async () => {
		if (!rows.length && !transactions.length && !reservations.length) {
			message.info(txt.exportNoData);
			return;
		}
		setExporting(true);
		try {
			const agentRows = buildAgentExportRows(rows, txt);
			const transactionRows = buildTransactionExportRows(transactions);
			const reservationRows = buildReservationExportRows(reservations);
			const totalsRows = buildTotalsExportRows(totals, txt);
			const selectedHotelIds = filters.hotelId
				? [filters.hotelId]
				: hotels.map((hotel) => normalizeId(hotel._id)).filter(Boolean);
			const agentColumns = Object.keys(agentRows[0] || {});
			const transactionColumns = Object.keys(transactionRows[0] || {});
			const reservationColumns = Object.keys(reservationRows[0] || {});
			const workbookXlsx = await loadStyledXlsx();
			const workbook = workbookXlsx.utils.book_new();
			appendJsonSheet(workbookXlsx, workbook, totalsRows, "Totals", txt.noData);
			appendJsonSheet(workbookXlsx, workbook, agentRows, "Agents", txt.noData);
			appendJsonSheet(
				workbookXlsx,
				workbook,
				transactionRows,
				"Wallet Movements",
				txt.noData
			);
			appendJsonSheet(
				workbookXlsx,
				workbook,
				reservationRows,
				"Reservations",
				txt.noData
			);

			const tracking = await trackOverallFinancialReportExport(
				userId,
				token,
				{
					dataset: "overall_financial_report",
					format: "XLSX",
					totalRows:
						agentRows.length + transactionRows.length + reservationRows.length,
					filters: {
						...filters,
						ownerId: ownerId || "",
						hotelIds: selectedHotelIds,
						scope: "financial-report-component",
						reportType: "general-financial-report",
					},
					columns: [
						...new Set([
							...agentColumns,
							...transactionColumns,
							...reservationColumns,
						]),
					],
					agentColumns,
					transactionColumns,
					reservationColumns,
					totals,
					agents: buildAgentTrackingRows(rows, agentRows),
					transactions: buildTransactionTrackingRows(
						transactions,
						transactionRows
					),
					reservations: buildReservationTrackingRows(
						reservations,
						reservationRows
					),
				},
				buildOwnerParams(ownerId)
			);
			if (!tracking || tracking.error || !tracking.exportTracked) {
				message.error(tracking?.error || txt.exportError);
				return;
			}

			const activeHotel =
				filters.hotelId &&
				hotels.find((hotel) => normalizeId(hotel._id) === filters.hotelId);
			const activeAgent =
				filters.agentId &&
				agentOptions.find((option) => option.value === filters.agentId);
			const fileParts = [
				"overall-financial-report",
				activeHotel ? activeHotel.hotelName : "all-hotels",
				activeAgent ? activeAgent.label : "",
				moment().format("YYYY-MM-DD"),
			].filter(Boolean);
			workbookXlsx.writeFile(
				workbook,
				`${safeFileSegment(fileParts.join("-"))}.xlsx`,
				{ cellStyles: true }
			);
		} catch (error) {
			console.error(error);
			message.error(txt.exportError);
		} finally {
			setExporting(false);
		}
	}, [
		agentOptions,
		filters,
		hotels,
		ownerId,
		reservations,
		rows,
		token,
		totals,
		transactions,
		txt,
		userId,
	]);

	const agentColumns = [
		{ title: txt.hotel, dataIndex: "hotelName", render: (value) => titleCase(value || "-") },
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
		{ title: txt.walletAdded, dataIndex: "walletAdded", render: money },
		{ title: txt.walletUsed, dataIndex: "walletUsed", render: money },
		{
			title: txt.balance,
			dataIndex: "balance",
			render: (value, row) => <Tag color={walletBalanceTone(row)}>{money(value)}</Tag>,
		},
		{ title: txt.reservations, dataIndex: "totalReservations" },
		{ title: txt.reservationValue, dataIndex: "totalReservationValue", render: money },
		{ title: txt.commissionPaid, dataIndex: "commissionPaid", render: money },
		{ title: txt.commissionUnpaid, dataIndex: "commissionDue", render: money },
		{ title: txt.pending, dataIndex: "pendingConfirmation" },
	];

	const transactionColumns = [
		{ title: txt.hotel, dataIndex: "hotelName", render: (value) => titleCase(value || "-") },
		{ title: txt.agent, dataIndex: "agentName", render: (value) => titleCase(value || "-") },
		{ title: txt.type, dataIndex: "transactionType" },
		{ title: txt.amount, dataIndex: "amount", render: money },
		{ title: txt.date, dataIndex: "transactionDate", render: (value) => formatDate(value, chosenLanguage) },
		{
			title: txt.financialStatus,
			render: (_, row) => {
				const status = transactionFinancialStatus(row);
				const rejectionReason =
					status === "rejected" ? transactionRejectionReason(row) : "";
				return (
					<StatusStack>
						<Tag color={transactionStatusTone(row)}>
							{transactionStatusLabel(row, txt)}
						</Tag>
						{rejectionReason ? (
							<RejectionReasonText>
								<strong>{txt.rejectionReason}:</strong> {rejectionReason}
							</RejectionReasonText>
						) : null}
						{!transactionReconciliationEligible(row) ? (
							<span>{txt.notReconciled}</span>
						) : null}
					</StatusStack>
				);
			},
		},
		{ title: txt.reference, dataIndex: "reference", render: (value) => value || "-" },
		{ title: txt.note, dataIndex: "note", render: (value) => value || "-" },
	];

	const reservationColumns = [
		{ title: txt.hotel, dataIndex: "hotelName", render: (value) => titleCase(value || "-") },
		{ title: txt.agent, dataIndex: "agentName", render: (value) => titleCase(value || "-") },
		{ title: txt.confirmation, dataIndex: "confirmation_number" },
		{ title: txt.guest, dataIndex: ["customer_details", "name"], render: (value) => value || "-" },
		{ title: txt.date, render: (_, row) => formatDate(row.booked_at || row.createdAt, chosenLanguage) },
		{ title: txt.amount, dataIndex: "total_amount", render: money },
		{
			title: txt.commissionDue,
			render: (_, row) => money(row.commission || row.financial_cycle?.commissionAmount || 0),
		},
		{ title: txt.status, dataIndex: "reservation_status", render: (value, row) => <Tag>{value || row.state || "-"}</Tag> },
	];

	return (
		<OverallPageShell $isRTL={isRTL}>
			<FinancialShell $isRTL={isRTL}>
				<Hero>
					<div>
						<Pill>
							<WalletOutlined />
							{txt.title}
						</Pill>
						<p>{txt.subtitle}</p>
					</div>
					<HeroActions>
						<Button icon={<ReloadOutlined />} onClick={loadFinancials}>
							{txt.refresh}
						</Button>
						<Button
							type='primary'
							icon={<DownloadOutlined />}
							onClick={handleExportExcel}
							loading={exporting}
							disabled={
								exporting ||
								(!rows.length && !transactions.length && !reservations.length)
							}
						>
							{exporting ? txt.exportingExcel : txt.exportExcel}
						</Button>
					</HeroActions>
				</Hero>

				<FiltersGrid>
					<label>
						<span>{txt.chooseHotel}</span>
						<Select
							value={filters.hotelId}
							onChange={(value) => updateFilter("hotelId", value)}
						>
							<Select.Option value=''>{txt.allHotels}</Select.Option>
							{hotels.map((hotel) => (
								<Select.Option key={hotel._id} value={normalizeId(hotel._id)}>
									{titleCase(hotel.hotelName)}
								</Select.Option>
							))}
						</Select>
					</label>
					<label>
						<span>{txt.chooseAgent}</span>
						<Select
							value={filters.agentId}
							onChange={(value) => updateFilter("agentId", value)}
							disabled={agentOnly}
							showSearch
							optionFilterProp='label'
							options={visibleAgentOptions}
						/>
					</label>
					<label>
						<span>{txt.from}</span>
						<input
							type='date'
							value={filters.startDate}
							onChange={(event) => updateFilter("startDate", event.target.value)}
						/>
					</label>
					<label>
						<span>{txt.to}</span>
						<input
							type='date'
							value={filters.endDate}
							onChange={(event) => updateFilter("endDate", event.target.value)}
						/>
					</label>
				</FiltersGrid>

				<OverallCards>
					<OverallCard>
						<WalletOutlined />
						<strong>{money(totals.walletAdded)}</strong>
						<span>{txt.walletAdded}</span>
					</OverallCard>
					<OverallCard>
						<BankOutlined />
						<strong>{money(totals.walletUsed)}</strong>
						<span>{txt.walletUsed}</span>
					</OverallCard>
					<OverallCard>
						<WalletOutlined />
						<strong>{money(totals.balance)}</strong>
						<span>{txt.balance}</span>
					</OverallCard>
					<OverallCard>
						<BankOutlined />
						<strong>{money(totals.commissionPaid)}</strong>
						<span>{txt.commissionPaid}</span>
					</OverallCard>
					<OverallCard>
						<CalendarOutlined />
						<strong>{money(totals.commissionDue)}</strong>
						<span>{txt.commissionUnpaid}</span>
					</OverallCard>
				</OverallCards>

				<Spin spinning={loading}>
					{hotels.length ? (
						<>
							<Panel>
								<PanelTitle>{txt.agent}</PanelTitle>
								<Table
									dataSource={rows}
									columns={agentColumns}
									rowKey={(row) => `${row.hotelId}-${normalizeId(row.agent)}`}
									size='small'
									scroll={{ x: 1280 }}
									pagination={{ pageSize: 10 }}
									locale={{ emptyText: txt.noData }}
								/>
							</Panel>
							<DetailGrid>
								<Panel>
									<PanelTitle>{txt.transactions}</PanelTitle>
									<Table
										dataSource={transactions}
										columns={transactionColumns}
										rowKey={(row, index) =>
											`${row.hotelId}-${row._id || row.reference || index}`
										}
										rowClassName={(row) =>
											transactionFinancialStatus(row) === "rejected"
												? "finance-transaction-row-rejected"
												: transactionFinancialStatus(row) === "pending"
												? "finance-transaction-row-pending"
												: ""
										}
										size='small'
										scroll={{ x: 1120 }}
										pagination={{ pageSize: 8 }}
										locale={{ emptyText: txt.noData }}
									/>
								</Panel>
								<Panel>
									<PanelTitle>{txt.reservationDeductions}</PanelTitle>
									<Table
										dataSource={reservations}
										columns={reservationColumns}
										rowKey={(row, index) =>
											`${row.hotelId}-${row._id || row.confirmation_number || index}`
										}
										size='small'
										scroll={{ x: 980 }}
										pagination={{ pageSize: 8 }}
										locale={{ emptyText: txt.noData }}
									/>
								</Panel>
							</DetailGrid>
						</>
					) : (
						<Empty description={txt.noHotelsFound || txt.noData} />
					)}
				</Spin>
			</FinancialShell>
		</OverallPageShell>
	);
};

export default OverallFinancialReport;

const FinancialShell = styled.div`
	display: grid;
	gap: 12px;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	.ant-table {
		border: 1px solid #d7ebff;
		border-radius: 10px;
		overflow: hidden;
	}

	.ant-table-thead > tr > th {
		background: #eaf6ff;
		color: #0f2842;
		font-weight: 900;
		text-align: inherit;
	}

	.finance-transaction-row-rejected > td {
		background: #fff1f2 !important;
		border-bottom-color: #ffd6dc !important;
	}

	.finance-transaction-row-rejected td:first-child {
		box-shadow: inset 4px 0 0 #ff9aa8;
	}

	.finance-transaction-row-pending > td {
		background: #fff8e7 !important;
		border-bottom-color: #ffe5a3 !important;
	}
`;

const Hero = styled.section`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
	padding: 12px;
	border: 1px solid #cfe8ff;
	border-radius: 10px;
	background: #f7fbff;

	p {
		margin: 6px 0 0;
		color: #47627d;
		font-weight: 800;
	}
`;

const HeroActions = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
	flex-wrap: wrap;

	.ant-btn {
		min-height: 36px;
		font-weight: 900;
	}

	@media (max-width: 620px) {
		width: 100%;

		.ant-btn {
			flex: 1 1 150px;
		}
	}
`;

const Pill = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 8px;
	color: #0f4f86;
	font-weight: 950;
	font-size: 1rem;
`;

const FiltersGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(150px, 1fr));
	gap: 8px;
	padding: 12px;
	border: 1px solid #cfe5fb;
	border-radius: 10px;
	background: #e3f2fd;

	label {
		display: grid;
		gap: 4px;
		min-width: 0;
		color: #344054;
		font-size: 0.75rem;
		font-weight: 900;
	}

	input {
		min-height: 32px;
		border: 1px solid #d0d5dd;
		border-radius: 6px;
		padding: 0 8px;
	}

	@media (max-width: 900px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 520px) {
		grid-template-columns: 1fr;
	}
`;

const Panel = styled.section`
	min-width: 0;
	padding: 12px;
	border: 1px solid #d7ebff;
	border-radius: 10px;
	background: #fff;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
`;

const PanelTitle = styled.h3`
	margin: 0 0 10px;
	color: #0f4f86;
	font-size: 0.98rem;
	font-weight: 950;
`;

const DetailGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;

	@media (max-width: 1100px) {
		grid-template-columns: 1fr;
	}
`;

const AgentButton = styled.button`
	display: grid;
	gap: 2px;
	border: 0;
	background: transparent;
	color: #0f4f86;
	text-align: start;
	font-weight: 900;

	span {
		color: #667085;
		font-size: 11px;
	}
`;

const StatusStack = styled.span`
	display: inline-grid;
	gap: 3px;
	line-height: 1.2;

	> span:last-child:not(.ant-tag) {
		color: #9f1239;
		font-size: 11px;
		font-weight: 800;
		white-space: nowrap;
	}
`;

const RejectionReasonText = styled.span`
	color: #b42335 !important;
	font-size: 11px;
	font-weight: 900;
	max-width: 220px;
	overflow-wrap: anywhere;
	white-space: normal !important;

	strong {
		font-weight: 950;
	}
`;
