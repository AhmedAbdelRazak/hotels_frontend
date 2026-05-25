import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, InputNumber, message, Modal, Select, Tag } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import {
	exportOverallFinancialActions,
	getOverallFinancialActions,
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

const TEXT = {
	en: {
		title: "Pending Financial Actions",
		subtitle:
			"Reservations waiting for finance review, commission assignment, or agent commission approval.",
		actionType: "Action type",
		allActions: "Finance pending queue",
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
		totalReview: "Total amount review",
		totalApproved: "Approved",
		totalRejected: "Rejected",
		totalRejectionReason: "Rejection reason",
		totalRejectionPlaceholder: "Write why the total amount is rejected.",
		saveFinance: "Save finance action",
		cancel: "Cancel",
		allBookingSources: "All booking sources",
		updateSuccess: "Reservation updated.",
		updateError: "Could not update the reservation.",
		totalRejectionRequired: "Rejection reason is required.",
		noRows: "No pending financial actions found.",
		walletClaimsTitle: "Pending wallet approvals",
		walletClaimsSubtitle:
			"Agent wallet credit claims waiting for finance approval.",
		walletClaimNoRows: "No pending wallet approvals found.",
		walletStatus: "Finance status",
		walletSource: "Source",
		walletReference: "Reference",
		walletNote: "Note",
		walletAmount: "Amount",
		walletDate: "Date",
		walletApprove: "Approve",
		walletReject: "Reject",
		walletPending: "Pending approval",
		walletApproved: "Wallet claim approved.",
		walletRejected: "Wallet claim rejected.",
		walletRejectTitle: "Reject wallet claim?",
		walletRejectReasonRequired: "Rejection reason is required.",
		reservationActionsTitle: "Reservation finance queue",
		reservationActionsSubtitle:
			"Reservations that need finance review, commission setup, or agent commission approval.",
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
		actionType: "نوع الإجراء",
		allActions: "إجراءات المالية المطلوبة",
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
		walletClaimsTitle: "موافقات المحفظة المعلقة",
		walletClaimsSubtitle:
			"مطالبات رصيد محفظة الوكلاء التي تنتظر موافقة المالية.",
		walletClaimNoRows: "لا توجد مطالبات محفظة معلقة.",
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
});

const reasonTone = (reason = "") => {
	if (/rejected/.test(reason)) return "red";
	if (/agent/.test(reason)) return "purple";
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

const getCommissionValue = (reservation = {}) =>
	Number(
		reservation.commission ||
			reservation?.financial_cycle?.commissionAmount ||
			0
	);

const hasCommissionAssignment = (reservation = {}) =>
	getCommissionValue(reservation) > 0 ||
	reservation?.commissionData?.assigned === true ||
	reservation?.financial_cycle?.commissionAssigned === true ||
	["commission due", "commission paid", "no commission due"].includes(
		String(reservation?.commissionStatus || "").trim().toLowerCase()
	);

const n2 = (value) => Math.round(Number(value || 0) * 100) / 100;

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

const OverallFinancialActions = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = { ...common, ...TEXT[isRTL ? "ar" : "en"] };
	const history = useHistory();
	const location = useLocation();
	const auth = useMemo(() => isAuthenticated() || {}, []);
	const currentUser = useMemo(() => auth?.user || {}, [auth]);
	const canUpdateFinance = useMemo(
		() => canManageFinancialActions(currentUser),
		[currentUser]
	);
	const [filters, setFilters] = useState({
		hotelId: "",
		bookingSource: "",
		actionType: "",
		dateBy: "booked_at",
		dateFrom: "",
		dateTo: "",
	});
	const [page, setPage] = useState(1);
	const [walletPage, setWalletPage] = useState(1);
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
		totalReviewStatus: "approved",
		totalRejectionReason: "",
	});

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			...filters,
			page,
			limit: OVERALL_PAGE_SIZE,
			walletPage,
			walletLimit: 8,
		}),
		[filters, ownerId, page, walletPage]
	);

	const loadActions = () => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallFinancialActions(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { reservations: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		loadActions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params, token, userId]);

	const hotels = Array.isArray(result.hotels) ? result.hotels : [];
	const bookingSources = Array.isArray(result.bookingSources)
		? result.bookingSources
		: [];
	const reservations = Array.isArray(result.reservations) ? result.reservations : [];
	const pages = Math.max(Number(result.pages || 1), 1);
	const walletClaims = result.walletClaims || {};
	const walletClaimRows = Array.isArray(walletClaims.transactions)
		? walletClaims.transactions
		: [];
	const walletClaimPages = Math.max(Number(walletClaims.pages || 1), 1);
	const walletClaimTotal = Number(walletClaims.total || 0);
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

	const updateFilter = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value }));
		setPage(1);
		setWalletPage(1);
	};

	const openReservation = (reservation = {}) => {
		const route = reservationSingleHotelRoute(reservation, ownerId, "pending");
		if (route) history.push(route);
	};

	const openMoreDetails = (reservation = {}) => {
		setSelectedReservation(reservation);
		setReservationIdInQuery(history, location, reservation);
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
	};

	const closeFinanceModal = () => {
		setFinanceModal({
			open: false,
			reservation: null,
			commission: 0,
			commissionPaid: false,
			commissionStatus: "commission due",
			totalReviewStatus: "approved",
			totalRejectionReason: "",
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

	const submitFinanceUpdate = () => {
		const reservation = financeModal.reservation;
		const actorId = currentUser?._id || userId;
		if (!reservation?._id || !actorId) return;
		if (
			financeModal.totalReviewStatus === "rejected" &&
			!String(financeModal.totalRejectionReason || "").trim()
		) {
			message.error(labels.totalRejectionRequired);
			return;
		}
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
				totalReviewStatus: financeModal.totalReviewStatus,
				totalRejectionReason: financeModal.totalRejectionReason,
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

	const reviewWalletClaim = (transaction = {}, action = "approve", reason = "") => {
		const hotelId = normalizeId(transaction.hotelId);
		const transactionId = normalizeId(transaction._id);
		const actorId = currentUser?._id || userId;
		if (!hotelId || !transactionId || !actorId) return;
		setActionLoading(true);
		reviewAgentWalletClaim(hotelId, actorId, token, transactionId, {
			action,
			rejectionReason: reason,
		})
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
		reviewWalletClaim(transaction, "approve");
	};

	const rejectWalletClaim = (transaction = {}) => {
		let reason = "";
		Modal.confirm({
			title: labels.walletRejectTitle,
			content: (
				<Input.TextArea
					rows={3}
					placeholder={labels.totalRejectionPlaceholder}
					onChange={(event) => {
						reason = event.target.value;
					}}
				/>
			),
			okText: labels.walletReject,
			cancelText: labels.cancel,
			okButtonProps: { danger: true },
			onOk: () => {
				const trimmed = String(reason || "").trim();
				if (!trimmed) {
					message.error(labels.walletRejectReasonRequired);
					return Promise.reject(new Error("rejection reason required"));
				}
				reviewWalletClaim(transaction, "reject", trimmed);
				return Promise.resolve();
			},
		});
	};

	const handleExportExcel = async () => {
		if (!userId || !token || exporting) return;
		setExporting(true);
		try {
			const exportData = await exportOverallFinancialActions(userId, token, {
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
					Metric: labels.actionType,
					Value: selectedAction?.label || labels.allActions,
				},
				{ Metric: labels.dateFrom, Value: filters.dateFrom || labels.all },
				{ Metric: labels.dateTo, Value: filters.dateTo || labels.all },
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
		<OverallPageShell $isRTL={isRTL}>
			<OverallToolbar
				onSubmit={(event) => {
					event.preventDefault();
					setPage(1);
					loadActions();
				}}
			>
				<select
					value={filters.hotelId}
					onChange={(event) => updateFilter("hotelId", event.target.value)}
				>
					<option value=''>{labels.allHotels}</option>
					{hotels.map((hotel) => (
						<option key={hotel._id} value={hotel._id}>
							{titleCase(hotel.hotelName)}
						</option>
					))}
				</select>
				<select
					value={filters.bookingSource}
					onChange={(event) =>
						updateFilter("bookingSource", event.target.value)
					}
				>
					<option value=''>{labels.allBookingSources}</option>
					{bookingSources.map((item) => (
						<option key={item.source} value={item.source}>
							{titleCase(item.source)} ({item.count})
						</option>
					))}
				</select>
				<select
					value={filters.actionType}
					onChange={(event) => updateFilter("actionType", event.target.value)}
				>
					{actionOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				<input
					type='date'
					value={filters.dateFrom}
					onChange={(event) => updateFilter("dateFrom", event.target.value)}
				/>
				<input
					type='date'
					value={filters.dateTo}
					onChange={(event) => updateFilter("dateTo", event.target.value)}
				/>
				<button type='submit'>{labels.search}</button>
				<button
					type='button'
					className='secondary'
					onClick={() => {
						setFilters({
							hotelId: "",
							bookingSource: "",
							actionType: "",
							dateBy: "booked_at",
							dateFrom: "",
							dateTo: "",
						});
						setPage(1);
						setWalletPage(1);
					}}
				>
					{labels.reset}
				</button>
				<button
					type='button'
					className='export-button'
					disabled={exporting || loading}
					onClick={handleExportExcel}
				>
					<DownloadOutlined />
					{exporting ? labels.exportingExcel : labels.exportExcel}
				</button>
			</OverallToolbar>

			<FinancialSectionHeader>
				<div>
					<strong>{labels.reservationActionsTitle}</strong>
					<span>{labels.reservationActionsSubtitle}</span>
				</div>
				<Tag color='blue'>
					{labels.rowsCount}: {Number(result.total || 0)}
				</Tag>
			</FinancialSectionHeader>

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
											<Tag key={reason} color={reasonTone(reason)}>
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

			<FinancialSectionHeader>
				<div>
					<strong>{labels.walletClaimsTitle}</strong>
					<span>{labels.walletClaimsSubtitle}</span>
				</div>
				<Tag color='orange'>
					{labels.rowsCount}: {walletClaimTotal}
				</Tag>
			</FinancialSectionHeader>

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
													loading={actionLoading}
													onClick={() => approveWalletClaim(transaction)}
												>
													{labels.walletApprove}
												</Button>
												<Button
													size='small'
													danger
													loading={actionLoading}
													onClick={() => rejectWalletClaim(transaction)}
												>
													{labels.walletReject}
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

			<OverallReservationDetailsModal
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
				centered
				destroyOnClose
				width={620}
			>
				<div dir={isRTL ? "rtl" : "ltr"}>
					<div style={{ display: "grid", gap: "14px" }}>
						<label>
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
								style={{ width: "100%", marginTop: 6 }}
								addonAfter={labels.sar}
							/>
						</label>
						<label>
							<strong>
								{labels.totalReview} ({formatMoney(financeModalTotalAmount)}{" "}
								{labels.sar})
							</strong>
							<Select
								value={financeModal.totalReviewStatus}
								onChange={(value) =>
									setFinanceModal((previous) => ({
										...previous,
										totalReviewStatus: value,
										totalRejectionReason:
											value === "rejected"
												? previous.totalRejectionReason
												: "",
									}))
								}
								style={{ width: "100%", marginTop: 6 }}
								options={[
									{ value: "approved", label: labels.totalApproved },
									{ value: "rejected", label: labels.totalRejected },
								]}
							/>
						</label>
						{financeModal.totalReviewStatus === "rejected" ? (
							<label>
								<strong>{labels.totalRejectionReason}</strong>
								<Input.TextArea
									rows={3}
									value={financeModal.totalRejectionReason}
									placeholder={labels.totalRejectionPlaceholder}
									onChange={(event) =>
										setFinanceModal((previous) => ({
											...previous,
											totalRejectionReason: event.target.value,
										}))
									}
									style={{ marginTop: 6 }}
								/>
							</label>
						) : null}
						<label>
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
								style={{ width: "100%", marginTop: 6 }}
								options={[
									{ value: "commission due", label: labels.commissionDue },
									{ value: "commission paid", label: labels.commissionPaid },
									{ value: "no commission due", label: labels.commissionNone },
								]}
							/>
						</label>
						<div
							style={{
								display: "flex",
								justifyContent: "flex-end",
								gap: 8,
								flexWrap: "wrap",
							}}
						>
							<Button onClick={closeFinanceModal}>{labels.cancel}</Button>
							<Button
								type='primary'
								loading={actionLoading}
								onClick={submitFinanceUpdate}
							>
								{labels.saveFinance}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
		</OverallPageShell>
	);
};

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
		linear-gradient(135deg, rgba(36, 84, 125, 0.08), rgba(100, 22, 110, 0.05));
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

export default OverallFinancialActions;
