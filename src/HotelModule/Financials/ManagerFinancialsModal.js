/** @format */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Button, Empty, Modal, Select, Table, Tag, message } from "antd";
import {
	BankOutlined,
	CalendarOutlined,
	DownloadOutlined,
	ReloadOutlined,
	WalletOutlined,
} from "@ant-design/icons";
import moment from "moment";

import {
	getAgentWalletSummary,
	trackOverallFinancialReportExport,
} from "../apiAdmin";

const labels = {
	en: {
		title: "Financials",
		subtitle:
			"Overall agent wallets, reservation deductions, commissions, and pending confirmations across assigned hotels.",
		overview: "Overall overview",
		chooseHotel: "Choose hotel",
		chooseAgent: "Choose agent",
		chooseAgentPlaceholder: "Choose agent name | company",
		required: "Required",
		chooseAgentFirst:
			"Choose an agent first to review wallet movements and reservation deductions.",
		refresh: "Refresh",
		exportExcel: "Export Excel",
		exportingExcel: "Exporting...",
		exportError: "Unable to export financials.",
		exportOverview: "Export overview",
		exportVisibleTables: "Export visible tables",
		openWorkspace: "Open full financials",
		hotelList: "Hotels",
		hotelName: "Hotel",
		agent: "Agent",
		company: "Company",
		walletAdded: "Wallet added",
		walletUsed: "Reservation deductions",
		balance: "Current balance",
		outstandingReservations: "Outstanding reservations",
		availableWallet: "Available wallet",
		commercialModel: "Model",
		commissionOnly: "Commission only",
		walletInventory: "Inventory wallet",
		mixedModel: "Wallet + commission",
		noWalletAgent:
			"This agent is commission-only. Reservations are visible for commission review and do not create wallet debt.",
		commissionPaid: "Commission paid",
		commissionUnpaid: "Unpaid commission",
		commissionDue: "Commission due",
		reservations: "Reservations",
		reservationValue: "Reservation value",
		pending: "Pending confirmation",
		transactions: "Wallet movements",
		reservationDeductions: "Reservations deducted from wallet",
		type: "Type",
		amount: "Amount",
		date: "Date",
		reference: "Reference",
		note: "Note",
		confirmation: "Confirmation",
		guest: "Guest",
		commission: "Commission",
		status: "Status",
		noHotels: "No hotels are assigned to this manager yet.",
		noData: "No financial data for this hotel yet.",
		error: "Unable to load financials.",
		filePrefix: "manager-financials",
	},
	ar: {
		title: "المالية",
		subtitle:
			"نظرة عامة على محافظ الوكلاء، خصومات الحجوزات، العمولات، والحجوزات بانتظار التأكيد لكل الفنادق المخصصة.",
		overview: "نظرة عامة",
		chooseHotel: "اختر الفندق",
		refresh: "تحديث",
		exportExcel: "تصدير إكسل",
		exportingExcel: "جاري التصدير...",
		exportError: "تعذر تصدير المالية.",
		openWorkspace: "فتح المالية بالكامل",
		hotelList: "الفنادق",
		hotelName: "الفندق",
		agent: "الوكيل",
		company: "الشركة",
		walletAdded: "المضافة للمحفظة",
		walletUsed: "خصومات الحجوزات",
		balance: "الرصيد الحالي",
		commissionDue: "العمولة المستحقة",
		reservations: "الحجوزات",
		pending: "بانتظار التأكيد",
		transactions: "حركات المحفظة",
		reservationDeductions: "الحجوزات المخصومة من المحفظة",
		type: "النوع",
		amount: "المبلغ",
		date: "التاريخ",
		reference: "مرجع",
		note: "ملاحظة",
		confirmation: "رقم التأكيد",
		guest: "الضيف",
		commission: "العمولة",
		status: "الحالة",
		noHotels: "لا توجد فنادق مخصصة لهذا المدير حتى الآن.",
		noData: "لا توجد بيانات مالية لهذا الفندق حتى الآن.",
		error: "تعذر تحميل البيانات المالية.",
		filePrefix: "financials",
	},
};

Object.assign(labels.ar, {
	chooseAgent: "اختر الوكيل",
	chooseAgentPlaceholder: "اختر اسم الوكيل | الشركة",
	required: "مطلوب",
	exportOverview: "تصدير الملخص",
	exportVisibleTables: "تصدير الجداول الظاهرة",
	chooseAgentFirst:
		"اختر الوكيل أولاً لعرض حركات المحفظة والحجوزات المخصومة.",
});

Object.assign(labels.ar, {
	outstandingReservations: "قيمة حجوزات معلقة",
	availableWallet: "رصيد متاح",
	commercialModel: "النموذج",
	commissionOnly: "عمولة فقط",
	walletInventory: "محفظة مخزون",
	mixedModel: "محفظة وعمولة",
	reservationValue: "قيمة الحجوزات",
	noWalletAgent:
		"هذا الوكيل يعمل بنظام العمولة فقط. الحجوزات تظهر لمراجعة العمولة ولا تنشئ مديونية محفظة.",
});

Object.assign(labels.ar, {
	commissionPaid: "\u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629",
	commissionUnpaid: "\u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u063a\u064a\u0631 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629",
});

const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const money = (value) =>
	Number(value || 0).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const n2 = (value) => Math.round(Number(value || 0) * 100) / 100;

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

const toTitleCase = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) =>
	value ? moment(value).format("YYYY-MM-DD") : "-";

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
	"Commission Paid": 16,
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

const buildAgentSummaryRows = (items = []) =>
	items.map((item) => ({
		Hotel: item.hotelName || "",
		Agent: item.agent?.name || "",
		Company: item.agent?.companyName || "",
		Email: item.agent?.email || "",
		Model: commercialModelLabel(item, labels.en),
		"Opening Credit": item.openingWalletCredit || 0,
		"Wallet Added": item.walletAdded || 0,
		"Reservation Deductions": item.walletUsed || 0,
		Balance: item.balance || 0,
		Reservations: item.totalReservations || 0,
		"Reservation Value": item.totalReservationValue || 0,
		"Commission Paid": item.commissionPaid || 0,
		"Commission Due": item.commissionDue || 0,
		"Pending Confirmation": item.pendingConfirmation || 0,
	}));

const buildTransactionRows = (items = []) =>
	items.flatMap((item) =>
		(Array.isArray(item.transactions) ? item.transactions : []).map((tx) => ({
			Hotel: tx.hotelName || item.hotelName || "",
			Agent: item.agent?.name || "",
			Company: item.agent?.companyName || "",
			Type: tx.transactionType || "",
			Amount: tx.amount || 0,
			Date: formatDate(tx.transactionDate),
			Reference: tx.reference || "",
			Note: tx.note || "",
		}))
	);

const buildReservationRows = (items = []) =>
	items.flatMap((item) =>
		(Array.isArray(item.reservations) ? item.reservations : []).map(
			(reservation) => ({
				Hotel: reservation.hotelName || item.hotelName || "",
				Agent: item.agent?.name || "",
				Company: item.agent?.companyName || "",
				Confirmation: reservation.confirmation_number || "",
				Guest: reservation.customer_details?.name || "",
				Date: formatDate(reservation.booked_at || reservation.createdAt),
				Amount: reservation.total_amount || 0,
				Commission:
					reservation.commission ||
					reservation.financial_cycle?.commissionAmount ||
					0,
				Status: reservation.reservation_status || reservation.state || "",
			})
		)
	);

const withAgentTrackingFields = (items = [], rows = []) =>
	rows.map((row, index) => ({
		...row,
		hotelId: items[index]?.hotelId || "",
		agentId: normalizeId(items[index]?.agent),
	}));

const buildTrackedTransactionRows = (items = [], rows = []) => {
	let index = 0;
	return items.flatMap((item) =>
		(Array.isArray(item.transactions) ? item.transactions : []).map((tx) => ({
			...(rows[index++] || {}),
			hotelId: tx.hotelId || item.hotelId || "",
			agentId: normalizeId(item.agent),
			transactionId: normalizeId(tx._id),
		}))
	);
};

const buildTrackedReservationRows = (items = [], rows = []) => {
	let index = 0;
	return items.flatMap((item) =>
		(Array.isArray(item.reservations) ? item.reservations : []).map(
			(reservation) => ({
				...(rows[index++] || {}),
				hotelId: reservation.hotelId || item.hotelId || "",
				agentId: normalizeId(item.agent),
				reservationId: normalizeId(reservation._id),
				confirmation_number:
					reservation.confirmation_number || rows[index - 1]?.Confirmation || "",
			})
		)
	);
};

const decorateAgentRow = (item = {}, hotel = {}, responseHotel = {}) => {
	const hotelId = hotel.id || normalizeId(responseHotel);
	const hotelName = toTitleCase(
		hotel.name || responseHotel?.hotelName || responseHotel?.name || "Hotel"
	);
	return {
		...item,
		hotelId,
		hotelName,
		transactions: (Array.isArray(item.transactions) ? item.transactions : []).map(
			(tx) => ({
				...tx,
				hotelId: normalizeId(tx.hotelId || tx.legacyHotelId || hotelId),
				hotelName: toTitleCase(tx.hotelName || hotelName),
			})
		),
		reservations: (Array.isArray(item.reservations)
			? item.reservations
			: []
		).map((reservation) => ({
			...reservation,
			hotelId: normalizeId(reservation.hotelId || hotelId),
			hotelName: toTitleCase(reservation.hotelName || hotelName),
		})),
	};
};

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
			totalCommission: n2(
				acc.totalCommission + Number(item.totalCommission || 0)
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
			totalCommission: 0,
			commissionPaid: 0,
			commissionDue: 0,
			pendingConfirmation: 0,
		}
	);

const aggregateAgentRows = (items = []) => {
	if (!items.length) return null;
	const first = items[0];
	const models = [...new Set(items.map(agentCommercialModel).filter(Boolean))];
	const walletRequired = items.some((item) => item.walletRequired !== false);
	return {
		...first,
		hotelName: [...new Set(items.map((item) => item.hotelName).filter(Boolean))].join(
			", "
		),
		commercialModel:
			models.length === 1 ? models[0] : models.length ? "mixed" : undefined,
		walletRequired,
		openingWalletCredit: n2(
			items.reduce((sum, item) => sum + Number(item.openingWalletCredit || 0), 0)
		),
		walletAdded: n2(
			items.reduce((sum, item) => sum + Number(item.walletAdded || 0), 0)
		),
		walletUsed: n2(
			items.reduce((sum, item) => sum + Number(item.walletUsed || 0), 0)
		),
		balance: n2(items.reduce((sum, item) => sum + Number(item.balance || 0), 0)),
		totalReservations: items.reduce(
			(sum, item) => sum + Number(item.totalReservations || 0),
			0
		),
		totalReservationValue: n2(
			items.reduce((sum, item) => sum + Number(item.totalReservationValue || 0), 0)
		),
		totalCommission: n2(
			items.reduce((sum, item) => sum + Number(item.totalCommission || 0), 0)
		),
		commissionPaid: n2(
			items.reduce((sum, item) => sum + Number(item.commissionPaid || 0), 0)
		),
		commissionDue: n2(
			items.reduce((sum, item) => sum + Number(item.commissionDue || 0), 0)
		),
		pendingConfirmation: items.reduce(
			(sum, item) => sum + Number(item.pendingConfirmation || 0),
			0
		),
		transactions: items.flatMap((item) =>
			Array.isArray(item.transactions) ? item.transactions : []
		),
		reservations: items.flatMap((item) =>
			Array.isArray(item.reservations) ? item.reservations : []
		),
	};
};

const ManagerFinancialsModal = ({
	open,
	onCancel,
	hotels = [],
	userId,
	token,
	ownerId = "",
	isArabic = false,
}) => {
	const txt = useMemo(() => labels[isArabic ? "ar" : "en"], [isArabic]);
	const normalizedHotels = useMemo(
		() =>
			(Array.isArray(hotels) ? hotels : [])
				.map((hotel) => ({
					id: normalizeId(hotel),
					name: toTitleCase(hotel?.hotelName || hotel?.name || ""),
				}))
				.filter((hotel) => hotel.id),
		[hotels]
	);

	const [summary, setSummary] = useState(null);
	const [selectedAgentId, setSelectedAgentId] = useState("");
	const [loading, setLoading] = useState(false);
	const [exportingScope, setExportingScope] = useState("");

	const loadFinancials = useCallback(async () => {
		if (!open || !normalizedHotels.length || !userId || !token) return;
		setLoading(true);
		try {
			const data = await getAgentWalletSummary("", userId, token, {});
			if (!data || data.error) {
				message.error(data?.error || txt.error);
				setSummary(null);
				return;
			}
			const nextAgents = (Array.isArray(data?.agents) ? data.agents : []).map((item) =>
				decorateAgentRow(item, { id: "global", name: txt.hotelList })
			);
			setSummary({
				agents: nextAgents,
				totals: buildTotals(nextAgents),
			});
			const nextAgentIds = [
				...new Set(nextAgents.map((item) => normalizeId(item.agent)).filter(Boolean)),
			];
			setSelectedAgentId((current) =>
				nextAgentIds.length === 1
					? nextAgentIds[0]
					: nextAgentIds.includes(current)
					? current
					: ""
			);
		} catch (error) {
			console.error(error);
			message.error(txt.error);
			setSummary(null);
		} finally {
			setLoading(false);
		}
	}, [normalizedHotels, open, token, txt.error, txt.hotelList, userId]);

	useEffect(() => {
		loadFinancials();
	}, [loadFinancials]);

	const agents = useMemo(
		() => (Array.isArray(summary?.agents) ? summary.agents : []),
		[summary]
	);

	const activeAgent = useMemo(
		() =>
			aggregateAgentRows(
				agents.filter((item) => normalizeId(item.agent) === selectedAgentId)
			),
		[agents, selectedAgentId]
	);

	const agentOptions = useMemo(
		() => {
			const uniqueAgents = new Map();
			agents.forEach((item) => {
				const agentId = normalizeId(item.agent);
				if (!agentId || uniqueAgents.has(agentId)) return;
				const name = toTitleCase(item.agent?.name || item.agent?.email || "");
				const company = item.agent?.companyName
					? toTitleCase(item.agent.companyName)
					: item.agent?.email || "";
				const label =
					company && company !== name ? `${name} | ${company}` : name || company;
				uniqueAgents.set(agentId, {
					value: normalizeId(item.agent),
					label,
				});
			});
			return [...uniqueAgents.values()].sort((a, b) =>
				String(a.label).localeCompare(String(b.label))
			);
		},
		[agents]
	);

	const activeTransactions = Array.isArray(activeAgent?.transactions)
		? activeAgent.transactions
		: [];
	const activeReservations = Array.isArray(activeAgent?.reservations)
		? activeAgent.reservations
		: [];
	const activeIsCommissionOnly =
		agentCommercialModel(activeAgent || {}) === "commission_only" ||
		activeAgent?.walletRequired === false;

	const trackFinancialExport = useCallback(
		async (items = [], scope = "modal_overview") => {
			const agentRows = buildAgentSummaryRows(items);
			const transactionRows = buildTransactionRows(items);
			const reservationRows = buildReservationRows(items);
			const agentColumns = Object.keys(agentRows[0] || {});
			const transactionColumns = Object.keys(transactionRows[0] || {});
			const reservationColumns = Object.keys(reservationRows[0] || {});
			const hotelIds = [
				...new Set(
					[
						...normalizedHotels.map((hotel) => hotel.id),
						...items.map((item) => item.hotelId),
					].filter(Boolean)
				),
			];
			const tracking = await trackOverallFinancialReportExport(
				userId,
				token,
				{
					dataset:
						scope === "modal_visible"
							? "manager_financials_visible_tables"
							: "manager_financials_overview",
					format: "XLSX",
					totalRows:
						agentRows.length + transactionRows.length + reservationRows.length,
					filters: {
						ownerId: ownerId || "",
						hotelIds,
						agentId:
							scope === "modal_visible" ? selectedAgentId || "" : "",
						scope,
						reportType: "manager-financials-modal",
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
					totals: buildTotals(items),
					agents: withAgentTrackingFields(items, agentRows),
					transactions: buildTrackedTransactionRows(items, transactionRows),
					reservations: buildTrackedReservationRows(items, reservationRows),
				},
				ownerId ? { ownerId } : {}
			);
			if (!tracking || tracking.error || !tracking.exportTracked) {
				throw new Error(tracking?.error || txt.exportError);
			}
			return { agentRows, transactionRows, reservationRows };
		},
		[
			normalizedHotels,
			ownerId,
			selectedAgentId,
			token,
			txt.exportError,
			userId,
		]
	);

	const exportExcel = useCallback(async () => {
		setExportingScope("overview");
		try {
			const { agentRows, transactionRows, reservationRows } =
				await trackFinancialExport(agents, "modal_overview");
			const XLSX = await loadStyledXlsx();
			const workbook = XLSX.utils.book_new();
			appendJsonSheet(XLSX, workbook, agentRows, "Agents", txt.noData);
			appendJsonSheet(
				XLSX,
				workbook,
				transactionRows,
				"Wallet Movements",
				txt.noData
			);
			appendJsonSheet(
				XLSX,
				workbook,
				reservationRows,
				"Reservations",
				txt.noData
			);
			XLSX.writeFile(
				workbook,
				`${safeFileSegment(txt.filePrefix)}-overview-${moment().format(
					"YYYY-MM-DD"
				)}.xlsx`,
				{ cellStyles: true }
			);
		} catch (error) {
			console.error(error);
			message.error(error.message || txt.exportError);
		} finally {
			setExportingScope("");
		}
	}, [agents, trackFinancialExport, txt.exportError, txt.filePrefix, txt.noData]);

	const exportVisibleTables = useCallback(async () => {
		if (!activeAgent) {
			message.info(txt.chooseAgentFirst);
			return;
		}
		const agentName =
			activeAgent.agent?.name ||
			activeAgent.agent?.companyName ||
			activeAgent.agent?.email ||
			"agent";
		setExportingScope("visible");
		try {
			const { agentRows, transactionRows, reservationRows } =
				await trackFinancialExport([activeAgent], "modal_visible");
			const XLSX = await loadStyledXlsx();
			const workbook = XLSX.utils.book_new();
			appendJsonSheet(XLSX, workbook, agentRows, "Selected Agent", txt.noData);
			appendJsonSheet(
				XLSX,
				workbook,
				transactionRows,
				"Wallet Movements",
				txt.noData
			);
			appendJsonSheet(
				XLSX,
				workbook,
				reservationRows,
				"Reservations",
				txt.noData
			);
			XLSX.writeFile(
				workbook,
				`${safeFileSegment(txt.filePrefix)}-${safeFileSegment(
					agentName
				)}-visible-${moment().format(
					"YYYY-MM-DD"
				)}.xlsx`,
				{ cellStyles: true }
			);
		} catch (error) {
			console.error(error);
			message.error(error.message || txt.exportError);
		} finally {
			setExportingScope("");
		}
	}, [
		activeAgent,
		trackFinancialExport,
		txt.chooseAgentFirst,
		txt.exportError,
		txt.filePrefix,
		txt.noData,
	]);

	const agentColumns = useMemo(
		() => [
			{
				title: txt.hotelName,
				dataIndex: "hotelName",
				render: (value) => toTitleCase(value || "-"),
			},
			{
				title: txt.agent,
				dataIndex: ["agent", "name"],
				render: (_, row) => (
					<AgentButton
						type='button'
						onClick={() => setSelectedAgentId(normalizeId(row.agent))}
					>
						<strong>
							{row.agent?.name
								? toTitleCase(row.agent.name)
								: row.agent?.email || "-"}
						</strong>
						<span>
							{row.agent?.companyName
								? toTitleCase(row.agent.companyName)
								: row.agent?.email || "-"}
						</span>
					</AgentButton>
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
			{
				title: txt.walletAdded,
				dataIndex: "walletAdded",
				render: (value) => `${money(value)} SAR`,
			},
			{
				title: txt.walletUsed,
				dataIndex: "walletUsed",
				render: (value) => `${money(value)} SAR`,
			},
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
			{
				title: txt.commissionPaid,
				dataIndex: "commissionPaid",
				render: (value) => `${money(value)} SAR`,
			},
			{
				title: txt.commissionUnpaid,
				dataIndex: "commissionDue",
				render: (value) => `${money(value)} SAR`,
			},
			{ title: txt.pending, dataIndex: "pendingConfirmation" },
		],
		[txt]
	);

	const transactionColumns = useMemo(
		() => [
			{
				title: txt.hotelName,
				dataIndex: "hotelName",
				render: (value) => toTitleCase(value || "-"),
			},
			{ title: txt.type, dataIndex: "transactionType" },
			{
				title: txt.amount,
				dataIndex: "amount",
				render: (value) => `${money(value)} SAR`,
			},
			{
				title: txt.date,
				dataIndex: "transactionDate",
				render: formatDate,
			},
			{ title: txt.reference, dataIndex: "reference" },
			{ title: txt.note, dataIndex: "note" },
		],
		[txt]
	);

	const reservationColumns = useMemo(
		() => [
			{
				title: txt.hotelName,
				dataIndex: "hotelName",
				render: (value) => toTitleCase(value || "-"),
			},
			{ title: txt.confirmation, dataIndex: "confirmation_number" },
			{
				title: txt.guest,
				dataIndex: ["customer_details", "name"],
				render: (value) => value || "-",
			},
			{
				title: txt.date,
				render: (_, row) => formatDate(row.booked_at || row.createdAt),
			},
			{
				title: txt.amount,
				dataIndex: "total_amount",
				render: (value) => `${money(value)} SAR`,
			},
			{
				title: txt.commission,
				render: (_, row) =>
					`${money(
						row.commission || row.financial_cycle?.commissionAmount || 0
					)} SAR`,
			},
			{
				title: txt.status,
				dataIndex: "reservation_status",
				render: (value, row) => <Tag>{value || row.state || "-"}</Tag>,
			},
		],
		[txt]
	);

	return (
		<Modal
			open={open}
			onCancel={onCancel}
			footer={null}
			width='min(1540px, 96vw)'
			centered
			destroyOnClose
			className='manager-financials-modal'
		>
			<ModalBody dir={isArabic ? "rtl" : "ltr"}>
				<Hero>
					<div>
						<Pill>
							<WalletOutlined />
							{txt.overview}
						</Pill>
					</div>
					<ActionRow>
						<Button icon={<ReloadOutlined />} onClick={loadFinancials}>
							{txt.refresh}
						</Button>
						<Button
							icon={<DownloadOutlined />}
							onClick={exportExcel}
							loading={exportingScope === "overview"}
							disabled={!agents.length || !!exportingScope}
						>
							{exportingScope === "overview"
								? txt.exportingExcel
								: txt.exportOverview || txt.exportExcel}
						</Button>
					</ActionRow>
				</Hero>

				{normalizedHotels.length ? (
					<>
						<SelectorGrid>
							<SelectorField>
								<LabelLine>
									<span>{txt.chooseAgent}</span>
									<Requirement>{txt.required}</Requirement>
								</LabelLine>
								<Select
									value={selectedAgentId || undefined}
									onChange={setSelectedAgentId}
									options={agentOptions}
									showSearch
									disabled={loading || !agents.length}
									optionFilterProp='label'
									placeholder={txt.chooseAgentPlaceholder}
								/>
							</SelectorField>
						</SelectorGrid>

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
								<span>{txt.balance}</span>
								<strong>{money(summary?.totals?.balance)} SAR</strong>
							</SummaryCard>
							<SummaryCard $tone='green'>
								<BankOutlined />
								<span>{txt.commissionPaid}</span>
								<strong>{money(summary?.totals?.commissionPaid)} SAR</strong>
							</SummaryCard>
							<SummaryCard $tone='purple'>
								<BankOutlined />
								<span>{txt.commissionUnpaid}</span>
								<strong>{money(summary?.totals?.commissionDue)} SAR</strong>
							</SummaryCard>
						</SummaryGrid>

						<Panel>
							<PanelTitle>{txt.agent}</PanelTitle>
							<Table
								loading={loading}
								dataSource={agents}
								columns={agentColumns}
								rowKey={(row) =>
									`${row.hotelId || "hotel"}-${normalizeId(row.agent)}`
								}
								size='small'
								pagination={{ pageSize: 6 }}
								scroll={{ x: 1280 }}
								onRow={(row) => ({
									onClick: () => setSelectedAgentId(normalizeId(row.agent)),
								})}
								rowClassName={(row) =>
									normalizeId(row.agent) === selectedAgentId ? "selected-row" : ""
								}
							/>
						</Panel>

						{!activeAgent ? (
							<RequiredNotice>
								{agents.length ? txt.chooseAgentFirst : txt.noData}
							</RequiredNotice>
						) : (
							<>
								{activeIsCommissionOnly && (
									<FinanceNotice>{txt.noWalletAgent}</FinanceNotice>
								)}
								<DetailToolbar>
									<strong>
										{txt.agent}:{" "}
										{activeAgent?.agent?.name ||
											activeAgent?.agent?.companyName ||
											activeAgent?.agent?.email ||
											"-"}
									</strong>
									<Button
										icon={<DownloadOutlined />}
										onClick={exportVisibleTables}
										loading={exportingScope === "visible"}
										disabled={!!exportingScope}
									>
										{exportingScope === "visible"
											? txt.exportingExcel
											: txt.exportVisibleTables || txt.exportExcel}
									</Button>
								</DetailToolbar>
								<DetailGrid>
									<Panel>
										<PanelTitle>
											<CalendarOutlined />
											{txt.transactions}
										</PanelTitle>
										<Table
											dataSource={activeTransactions}
											columns={transactionColumns}
											rowKey={(row) =>
												`${row.hotelId || "hotel"}-${
													row._id || row.reference || row.createdAt
												}`
											}
											size='small'
											pagination={{ pageSize: 5 }}
											scroll={{ x: 860 }}
											locale={{ emptyText: txt.noData }}
										/>
									</Panel>
									<Panel>
										<PanelTitle>
											<BankOutlined />
											{activeIsCommissionOnly
												? txt.reservations
												: txt.reservationDeductions}
										</PanelTitle>
										<Table
											dataSource={activeReservations}
											columns={reservationColumns}
											rowKey={(row) =>
												`${row.hotelId || "hotel"}-${
													row._id || row.confirmation_number
												}`
											}
											size='small'
											pagination={{ pageSize: 5 }}
											scroll={{ x: 920 }}
											locale={{ emptyText: txt.noData }}
										/>
									</Panel>
								</DetailGrid>
							</>
						)}
					</>
				) : (
					<Empty description={txt.noHotels} />
				)}
			</ModalBody>
		</Modal>
	);
};

export default ManagerFinancialsModal;

const ModalBody = styled.div`
	padding: 0.35rem;

	.ant-table-wrapper {
		direction: inherit;
	}

	.ant-table {
		border: 1px solid #d7ebff;
		border-radius: 12px;
		overflow: hidden;
	}

	.ant-table-thead > tr > th {
		background: #eaf6ff;
		color: #0f2842;
		font-weight: 900;
		text-align: inherit;
	}

	.selected-row td {
		background: #eef7ff !important;
	}
`;

const Hero = styled.section`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.65rem 0.85rem;
	border: 1px solid #cfe8ff;
	border-radius: 16px;
	background: linear-gradient(135deg, #eff8ff 0%, #ffffff 100%);
	margin-bottom: 0.8rem;

	@media (max-width: 760px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const Pill = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	width: fit-content;
	padding: 0.25rem 0.65rem;
	border: 1px solid #9fd0ff;
	border-radius: 999px;
	background: #f8fcff;
	color: #0068d6;
	font-weight: 950;
	text-transform: capitalize;
`;

const ActionRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 0.55rem;
	flex-wrap: wrap;

	.ant-btn {
		font-weight: 900;
		min-height: 38px;
	}

	@media (max-width: 760px) {
		justify-content: stretch;

		.ant-btn {
			flex: 1 1 150px;
		}
	}
`;

const SelectorGrid = styled.div`
	display: grid;
	grid-template-columns: 1fr;
	align-items: center;
	gap: 0.75rem;
	padding: 0.85rem 1rem;
	border: 1px solid #d7ebff;
	border-radius: 14px;
	background: #fff;

	.ant-select {
		width: 100%;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const SelectorField = styled.div`
	display: grid;
	gap: 0.4rem;
`;

const LabelLine = styled.label`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	font-weight: 950;
	color: #0f2842;
`;

const Requirement = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 22px;
	padding: 0 0.5rem;
	border-radius: 999px;
	border: 1px solid #ffb4a8;
	background: #fff4f2;
	color: #b42318;
	font-size: 0.72rem;
	font-weight: 900;
`;

const SummaryGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 0.75rem;
	margin-bottom: 0.85rem;

	@media (max-width: 980px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 520px) {
		grid-template-columns: 1fr;
	}
`;

const SummaryCard = styled.div`
	border-radius: 14px;
	border: 1px solid
		${(p) =>
			p.$tone === "orange"
				? "#ffb066"
				: p.$tone === "green"
				? "#60d394"
				: p.$tone === "purple"
				? "#b197fc"
				: "#8ecbff"};
	background: ${(p) =>
		p.$tone === "orange"
			? "#fff6eb"
			: p.$tone === "green"
			? "#edfff5"
			: p.$tone === "purple"
			? "#f4edff"
			: "#eef8ff"};
	padding: 0.85rem;
	display: grid;
	gap: 0.35rem;

	svg {
		color: ${(p) =>
			p.$tone === "orange"
				? "#e87500"
				: p.$tone === "green"
				? "#079455"
				: p.$tone === "purple"
				? "#7048e8"
				: "#0875d1"};
		font-size: 1.2rem;
	}

	span {
		color: #4b6380;
		font-weight: 850;
	}

	strong {
		color: #07182d;
		font-size: clamp(1.1rem, 1.5vw, 1.45rem);
		font-weight: 950;
	}
`;

const DetailGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.85rem;

	@media (max-width: 980px) {
		grid-template-columns: 1fr;
	}
`;

const DetailToolbar = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	flex-wrap: wrap;
	margin-bottom: 0.85rem;
	padding: 0.75rem 0.85rem;
	border: 1px solid #cfe8ff;
	border-radius: 14px;
	background: #f8fcff;

	strong {
		min-width: 0;
		color: #0f2842;
		font-weight: 950;
		overflow-wrap: anywhere;
	}

	.ant-btn {
		min-height: 38px;
		font-weight: 900;
	}

	@media (max-width: 620px) {
		align-items: stretch;
		flex-direction: column;

		.ant-btn {
			width: 100%;
		}
	}
`;

const Panel = styled.section`
	border: 1px solid #d7ebff;
	border-radius: 16px;
	background: #ffffff;
	padding: 0.8rem;
	margin-bottom: 0.85rem;
	overflow: hidden;
`;

const RequiredNotice = styled.div`
	margin-bottom: 0.85rem;
	padding: 0.9rem 1rem;
	border: 1px solid #ffd6a5;
	border-radius: 14px;
	background: linear-gradient(135deg, #fff8ed 0%, #ffffff 100%);
	color: #8a4b00;
	font-weight: 950;
	text-align: center;
`;

const FinanceNotice = styled.div`
	margin-bottom: 0.85rem;
	padding: 0.85rem 1rem;
	border: 1px solid #d8c7ff;
	border-radius: 14px;
	background: #f7f2ff;
	color: #5b21b6;
	font-weight: 900;
	line-height: 1.35;
`;

const PanelTitle = styled.h3`
	display: flex;
	align-items: center;
	gap: 0.45rem;
	margin: 0 0 0.65rem;
	color: #0f2842;
	font-size: 1rem;
	font-weight: 950;

	svg {
		color: #0d6efd;
	}
`;

const AgentButton = styled.button`
	display: grid;
	gap: 0.15rem;
	background: transparent;
	border: 0;
	padding: 0;
	cursor: pointer;
	text-align: inherit;
	color: #0d4b87;

	strong {
		font-weight: 950;
		text-decoration: underline;
		text-transform: capitalize;
	}

	span {
		color: #64748b;
		font-size: 0.82rem;
		text-transform: capitalize;
	}
`;
