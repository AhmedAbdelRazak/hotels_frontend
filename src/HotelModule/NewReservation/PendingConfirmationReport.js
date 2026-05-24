import React, { useEffect, useMemo, useState } from "react";
import {
	Button,
	Input,
	InputNumber,
	Modal,
	Pagination,
	Select,
	Table,
	Tag,
	Tooltip,
	message,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";
import moment from "moment";
import { useHistory, useLocation } from "react-router-dom";
import { isAuthenticated } from "../../auth";
import {
	getAgentWalletSummary,
	getHotelInventoryAvailability,
	pendingConfirmationReservationList,
	updatePendingConfirmationReservation,
} from "../apiAdmin";
import ReservationDetail from "../ReservationsFolder/ReservationDetail";

const labels = {
	en: {
		title: "Pending Confirmation",
		subtitle:
			"Reservations awaiting hotel confirmation or missing commission setup.",
		searchPlaceholder: "Search confirmation number, guest name, phone, or source",
		search: "Search",
		refresh: "Refresh",
		confirmation: "Confirmation",
		guest: "Guest",
		phone: "Phone",
		source: "Source",
		bookedAt: "Booked At",
		checkin: "Check-in",
		checkout: "Check-out",
		status: "Status",
	total: "Total",
	commission: "Commission",
	reasons: "Needs Attention",
	moreDetails: "More Details",
	pending: "Pending Confirmation",
		commissionMissing: "Commission missing",
		noData: "No pending confirmation reservations found.",
	},
	ar: {
		title: "تأكيد الحجوزات",
		subtitle: "حجوزات تحتاج تأكيد الفندق أو استكمال إعداد العمولة.",
		searchPlaceholder: "ابحث برقم التأكيد أو اسم الضيف أو الهاتف أو المصدر",
		search: "بحث",
		refresh: "تحديث",
		confirmation: "رقم التأكيد",
		guest: "الضيف",
		phone: "الهاتف",
		source: "المصدر",
		bookedAt: "تاريخ الحجز",
		checkin: "الوصول",
		checkout: "المغادرة",
		status: "الحالة",
		total: "الإجمالي",
		commission: "العمولة",
		reasons: "سبب المتابعة",
		pending: "بانتظار التأكيد",
		commissionMissing: "العمولة غير محددة",
		noData: "لا توجد حجوزات بانتظار التأكيد.",
	},
};

labels.ar = {
	title: "تأكيد الحجوزات",
	subtitle: "حجوزات تحتاج تأكيد الفندق أو استكمال إعداد العمولة.",
	searchPlaceholder: "ابحث برقم التأكيد أو اسم الضيف أو الهاتف أو المصدر",
	search: "بحث",
	refresh: "تحديث",
	confirmation: "رقم التأكيد",
	guest: "الضيف",
	phone: "الهاتف",
	source: "المصدر",
	bookedAt: "تاريخ الحجز",
	checkin: "الوصول",
	checkout: "المغادرة",
	status: "الحالة",
	total: "الإجمالي",
	commission: "العمولة",
	reasons: "سبب المتابعة",
	moreDetails: "تفاصيل أكثر",
	pending: "بانتظار التأكيد",
	commissionMissing: "العمولة غير محددة",
	noData: "لا توجد حجوزات بانتظار التأكيد.",
};

Object.assign(labels.en, {
	commissionStatus: "Commission status",
	rejected: "Rejected",
	commissionDue: "Commission due",
	commissionPaid: "Commission paid",
	commissionNone: "No commission due",
	adjustCommission: "Adjust commission",
	saveCommission: "Save commission",
	confirmTitle: "Confirm reservation",
	confirmQuestion:
		"Would you like to confirm this reservation with {days} days / {nights} nights for {amount} SAR?",
	revertTitle: "Return reservation to pending",
	revertQuestion:
		"Move confirmation #{confirmation} back to Pending Confirmation?",
	yesRevert: "Yes, return to pending",
	yesConfirm: "Yes, confirm",
	noReject: "Reject",
	rejectionReason: "Rejection reason",
	rejectionPlaceholder: "Write why this reservation cannot be confirmed.",
	cancel: "Cancel",
	updateSuccess: "Reservation updated.",
	updateError: "Could not update the reservation.",
	agentWallet: "Agent wallet",
	walletBalance: "Wallet balance",
	availableInventory: "Available inventory",
	noWallet: "No wallet found for this source.",
	noInventory: "No inventory data for this stay date range.",
	commissionAssigned: "Commission assigned",
});

Object.assign(labels.ar, {
	commissionStatus: "حالة العمولة",
	rejected: "مرفوض",
	commissionDue: "العمولة مستحقة",
	commissionPaid: "تم دفع العمولة",
	commissionNone: "لا توجد عمولة مستحقة",
	adjustCommission: "تعديل العمولة",
	saveCommission: "حفظ العمولة",
	confirmTitle: "تأكيد الحجز",
	confirmQuestion:
		"هل تريد تأكيد هذا الحجز لمدة {days} يوم / {nights} ليلة بمبلغ {amount} ريال؟",
	yesConfirm: "نعم، تأكيد",
	noReject: "رفض",
	rejectionReason: "سبب الرفض",
	rejectionPlaceholder: "اكتب سبب عدم إمكانية تأكيد هذا الحجز.",
	cancel: "إلغاء",
	updateSuccess: "تم تحديث الحجز.",
	updateError: "تعذر تحديث الحجز.",
});

Object.assign(labels.ar, {
	revertTitle: "إرجاع الحجز لانتظار التأكيد",
	revertQuestion: "هل تريد إرجاع الحجز رقم {confirmation} إلى انتظار التأكيد؟",
	yesRevert: "نعم، إرجاع لانتظار التأكيد",
});

Object.assign(labels.ar, {
	agentWallet: "محفظة الوكيل",
	walletBalance: "رصيد المحفظة",
	availableInventory: "المخزون المتاح",
	noWallet: "لا توجد محفظة لهذا المصدر.",
	noInventory: "لا توجد بيانات مخزون لهذه الفترة.",
	commissionAssigned: "تم تحديد العمولة",
});

Object.assign(labels.en, {
	financeReviewPending: "Finance review",
	agentCommissionPending: "Agent approval",
	financeRejected: "Finance rejected",
	totalReview: "Reservation total amount review",
	totalApproved: "Total approved",
	totalRejected: "Total rejected",
	totalRejectionReason: "Total rejection reason",
	totalRejectionPlaceholder: "Write what the agent must correct in the amount.",
	cancelReservation: "Cancel reservation",
});

Object.assign(labels.ar, {
	financeReviewPending: "مراجعة المالية",
	agentCommissionPending: "موافقة الوكيل",
	financeRejected: "رفض المالية",
	totalReview: "مراجعة المبلغ الإجمالي للحجز",
	totalApproved: "المبلغ موافق عليه",
	totalRejected: "المبلغ مرفوض",
	totalRejectionReason: "سبب رفض المبلغ",
	totalRejectionPlaceholder: "اكتب ما يجب على الوكيل تصحيحه في المبلغ.",
	cancelReservation: "إلغاء الحجز",
});

const choiceDefinitions = {
	en: {
		commissionAmount:
			"Enter the commission amount that applies to this reservation before the finance step is saved.",
		totalReview:
			"Review the exact reservation total shown in parentheses. Approve only if that amount is correct.",
		totalApproved:
			"The shown reservation total is accepted and finance can continue the confirmation cycle.",
		totalRejected:
			"The shown reservation total is not accepted. The agent must correct it and resubmit.",
		commissionStatus:
			"Defines what should happen with the commission for this reservation.",
		commissionDue:
			"Commission is still owed and remains open until it is paid or reconciled.",
		commissionPaid:
			"Commission is marked paid/reconciled by finance. The agent may still need to approve it before the case closes.",
		commissionNone:
			"No commission is required for this reservation once the total amount is approved.",
		rejectionReason:
			"Use this only when a reservation or total amount is rejected, so the agent knows exactly what to fix.",
	},
	ar: {
		commissionAmount:
			"اكتب مبلغ العمولة الذي يخص هذا الحجز قبل حفظ خطوة المالية.",
		totalReview:
			"راجع إجمالي مبلغ الحجز الظاهر بين القوسين. وافق فقط إذا كان هذا المبلغ صحيحا.",
		totalApproved:
			"إجمالي الحجز الظاهر مقبول ويمكن للمالية متابعة دورة التأكيد.",
		totalRejected:
			"إجمالي الحجز الظاهر غير مقبول، ويجب على الوكيل تصحيحه وإرساله مرة أخرى.",
		commissionStatus:
			"تحدد ما الذي يجب عمله بخصوص عمولة هذا الحجز.",
		commissionDue:
			"العمولة ما زالت مستحقة وتبقى مفتوحة حتى يتم دفعها أو تسويتها.",
		commissionPaid:
			"تم تعليم العمولة كمدفوعة أو تمت تسويتها من المالية، وقد يحتاج الوكيل لاعتمادها قبل إغلاق الحالة.",
		commissionNone:
			"لا توجد عمولة مطلوبة لهذا الحجز بعد اعتماد إجمالي المبلغ.",
		rejectionReason:
			"استخدمه عند رفض الحجز أو المبلغ حتى يعرف الوكيل ما الذي يجب تصحيحه بوضوح.",
	},
};

const DefinitionHint = ({ text, isArabic }) => (
	<Tooltip
		title={<TooltipContent $isRTL={isArabic}>{text}</TooltipContent>}
		trigger={["hover", "focus", "click"]}
		placement={isArabic ? "left" : "right"}
		getPopupContainer={(triggerNode) =>
			triggerNode?.closest?.(".ant-modal-content") || document.body
		}
		overlayClassName='pending-choice-tooltip'
		zIndex={100000}
	>
		<InfoHint
			tabIndex={0}
			role='button'
			aria-label={isArabic ? "تعريف" : "Definition"}
			onClick={(event) => event.stopPropagation()}
		>
			<InfoCircleOutlined />
		</InfoHint>
	</Tooltip>
);

const FieldLabelText = ({ children, help, isArabic }) => (
	<LabelText $isRTL={isArabic}>
		<span>{children}</span>
		<DefinitionHint text={help} isArabic={isArabic} />
	</LabelText>
);

const ChoiceOptionLabel = ({ label, help, isArabic }) => (
	<ChoiceLabel $isRTL={isArabic}>
		<span>{label}</span>
		<DefinitionHint text={help} isArabic={isArabic} />
	</ChoiceLabel>
);

const formatDate = (value) => {
	if (!value) return "-";
	const parsed = moment(value);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "-";
};

const formatMoney = (value) =>
	Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});

const getCommissionValue = (reservation = {}) =>
	Number(
		reservation.commission ||
			reservation?.financial_cycle?.commissionAmount ||
			0,
	);

const hasCommissionAssignment = (reservation = {}) =>
	getCommissionValue(reservation) > 0 ||
	reservation?.commissionData?.assigned === true ||
	reservation?.financial_cycle?.commissionAssigned === true ||
	["commission due", "commission paid", "no commission due"].includes(
		String(reservation?.commissionStatus || "").trim().toLowerCase(),
	);

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

const getPendingWorkflowPermissions = (account = {}) => {
	const roles = getAccountRoleNumbers(account);
	const descriptions = getAccountRoleDescriptions(account);
	const isManagerOrAdmin =
		roles.includes(1000) ||
		roles.includes(2000) ||
		roles.includes(10000) ||
		descriptions.includes("systemadmin") ||
		descriptions.includes("hotelmanager");
	const isFinance =
		roles.includes(6000) || descriptions.includes("finance");
	const isReservationEmployee =
		roles.includes(8000) || descriptions.includes("reservationemployee");
	const financeOnly = isFinance && !isManagerOrAdmin && !isReservationEmployee;
	const reservationEmployeeOnly =
		isReservationEmployee && !isManagerOrAdmin && !isFinance;
	return {
		canReviewStatus: !financeOnly,
		canReviewCommission: !reservationEmployeeOnly,
		financeOnly,
		reservationEmployeeOnly,
	};
};

const getAgentIdFromReservation = (reservation = {}) =>
	String(
		reservation?.orderTakeId ||
			reservation?.orderTaker?._id ||
			reservation?.createdByUserId ||
			"",
	);

const getStayLength = (reservation = {}) => {
	const checkin = moment(reservation.checkin_date);
	const checkout = moment(reservation.checkout_date);
	const nights =
		checkin.isValid() && checkout.isValid()
			? Math.max(checkout.diff(checkin, "days"), 0)
			: Math.max(Number(reservation.days_of_residence || 0), 0);
	return { nights, days: nights + 1 };
};

const normalizeStatus = (status = "") =>
	String(status || "")
		.replace(/[_-]+/g, " ")
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());

const PendingConfirmationReport = ({
	hotelDetails,
	chosenLanguage,
	onTotalChange,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const txt = labels[isArabic ? "ar" : "en"];
	const definitions = choiceDefinitions[isArabic ? "ar" : "en"];
	const { user, token } = isAuthenticated();
	const workflowPermissions = useMemo(
		() => getPendingWorkflowPermissions(user),
		[user],
	);
	const history = useHistory();
	const location = useLocation();
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [records] = useState(30);
	const [total, setTotal] = useState(0);
	const [searchDraft, setSearchDraft] = useState("");
	const [search, setSearch] = useState("");
	const [selectedReservation, setSelectedReservation] = useState(null);
	const tableRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
	const [statusModal, setStatusModal] = useState({
		open: false,
		reservation: null,
		rejectionReason: "",
	});
	const [financeModal, setFinanceModal] = useState({
		open: false,
		reservation: null,
		commission: 0,
		commissionPaid: false,
		commissionStatus: "commission due",
		totalReviewStatus: "approved",
		totalRejectionReason: "",
	});
	const [actionLoading, setActionLoading] = useState(false);
	const [decisionSupport, setDecisionSupport] = useState({
		loading: false,
		wallet: null,
		inventory: [],
	});
	const financeReservationTotal = financeModal.reservation
		? formatMoney(financeModal.reservation.total_amount)
		: "";
	const totalReviewLabel = financeReservationTotal
		? `${txt.totalReview} (${financeReservationTotal} SAR)`
		: txt.totalReview;

	const loadData = () => {
		if (!hotelDetails?._id || !user?._id) return;
		setLoading(true);
		pendingConfirmationReservationList({
			page,
			records,
			hotelId: hotelDetails._id,
			userId: user._id,
			search,
		})
			.then((data) => {
				if (data?.error) {
					setRows([]);
					setTotal(0);
					if (typeof onTotalChange === "function") onTotalChange(0);
					return;
				}
				const nextRows = Array.isArray(data?.data)
					? data.data
					: Array.isArray(data)
					? data
					: [];
				setRows(nextRows);
				const nextTotal = Number(data?.total || 0);
				setTotal(nextTotal);
				if (typeof onTotalChange === "function") onTotalChange(nextTotal);
			})
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		loadData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hotelDetails?._id, user?._id, page, records, search]);

	useEffect(() => {
		const params = new URLSearchParams(location.search || "");
		const reservationId = params.get("reservationId");
		if (!reservationId || selectedReservation) return;
		const matched = tableRows.find(
			(row) => String(row._id) === reservationId || String(row.confirmation_number) === reservationId,
		);
		if (matched) setSelectedReservation(matched);
	}, [location.search, selectedReservation, tableRows]);

	const openReservation = (reservation) => {
		setSelectedReservation(reservation);
		const params = new URLSearchParams(location.search || "");
		params.set("reservationId", reservation._id || reservation.confirmation_number);
		history.replace({
			pathname: location.pathname,
			search: `?${params.toString()}`,
		});
	};

	const closeReservation = () => {
		setSelectedReservation(null);
		const params = new URLSearchParams(location.search || "");
		params.delete("reservationId");
		history.replace({
			pathname: location.pathname,
			search: `?${params.toString()}`,
		});
	};

	const refreshAfterUpdate = (updatedReservation) => {
		if (!updatedReservation || updatedReservation.error) {
			message.error(updatedReservation?.error || txt.updateError);
			return false;
		}
		message.success(txt.updateSuccess);
		loadData();
		return true;
	};

	const openStatusModal = (reservation) => {
		if (!workflowPermissions.canReviewStatus) {
			message.info("Finance users can review commission only.");
			openReservation(reservation);
			return;
		}
		setStatusModal({
			open: true,
			reservation,
			rejectionReason: "",
		});
		setDecisionSupport({ loading: true, wallet: null, inventory: [] });
		const agentId = getAgentIdFromReservation(reservation);
		const checkin = formatDate(reservation?.checkin_date);
		const checkout = formatDate(reservation?.checkout_date);
		Promise.all([
			agentId && hotelDetails?._id
				? getAgentWalletSummary(hotelDetails._id, user._id, token, {
						agentId,
				  }).catch(() => null)
				: Promise.resolve(null),
			hotelDetails?._id && checkin !== "-" && checkout !== "-"
				? getHotelInventoryAvailability(hotelDetails._id, {
						start: checkin,
						end: checkout,
				  }).catch(() => [])
				: Promise.resolve([]),
		]).then(([wallet, inventory]) => {
			const inventoryRows = Array.isArray(inventory)
				? inventory
				: Array.isArray(inventory?.data)
				? inventory.data
				: Array.isArray(inventory?.rooms)
				? inventory.rooms
				: Array.isArray(inventory?.availableRooms)
				? inventory.availableRooms
				: [];
			setDecisionSupport({
				loading: false,
				wallet: wallet && !wallet.error ? wallet : null,
				inventory: inventoryRows,
			});
		});
	};

	const closeStatusModal = () => {
		setStatusModal({ open: false, reservation: null, rejectionReason: "" });
		setDecisionSupport({ loading: false, wallet: null, inventory: [] });
	};

	const submitPendingDecision = (action) => {
		const reservation = statusModal.reservation;
		if (!reservation?._id || !user?._id) return;
		const payload = { action };
		if (action === "reject") {
			const reason = String(statusModal.rejectionReason || "").trim();
			if (!reason) {
				message.error(txt.rejectionReason);
				return;
			}
			payload.rejectionReason = reason;
		}
		if (action === "cancel") {
			payload.cancelReason =
				String(statusModal.rejectionReason || "").trim() ||
				"Reservation cancelled.";
		}
		setActionLoading(true);
		updatePendingConfirmationReservation({
			reservationId: reservation._id,
			userId: user._id,
			payload,
		})
			.then((data) => {
				if (refreshAfterUpdate(data)) closeStatusModal();
			})
			.finally(() => setActionLoading(false));
	};

	const submitRevertToPending = (reservation) => {
		if (!reservation?._id || !user?._id) return;
		if (!workflowPermissions.canReviewStatus) {
			message.error(txt.updateError);
			return;
		}
		Modal.confirm({
			title: txt.revertTitle,
			content: txt.revertQuestion.replace(
				"{confirmation}",
				reservation.confirmation_number || reservation._id || "-",
			),
			okText: txt.yesRevert,
			cancelText: txt.cancel,
			okButtonProps: { danger: true },
			onOk: () =>
				updatePendingConfirmationReservation({
					reservationId: reservation._id,
					userId: user._id,
					payload: { action: "pending" },
				}).then((data) => {
					const updated = refreshAfterUpdate(data);
					if (!updated) {
						return Promise.reject(new Error(data?.error || txt.updateError));
					}
					return data;
				}),
		});
	};

	const openFinanceModal = (reservation) => {
		if (!workflowPermissions.canReviewCommission) {
			message.info("Commission review is handled by finance or management.");
			return;
		}
		const commission = getCommissionValue(reservation);
		const commissionPaid = !!reservation.commissionPaid;
		const commissionAssigned = hasCommissionAssignment(reservation);
		setFinanceModal({
			open: true,
			reservation,
			commission,
			commissionPaid,
			totalReviewStatus:
				reservation?.financial_cycle?.totalReviewStatus === "rejected"
					? "rejected"
					: "approved",
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

	const submitFinanceUpdate = () => {
		const reservation = financeModal.reservation;
		if (!reservation?._id || !user?._id) return;
		const nextCommission = Number(financeModal.commission || 0);
		const nextCommissionStatus =
			nextCommission <= 0
				? financeModal.commissionStatus === "commission paid"
					? "commission paid"
					: "no commission due"
				: financeModal.commissionStatus === "no commission due"
				? "commission due"
				: financeModal.commissionStatus;
		if (
			financeModal.totalReviewStatus === "rejected" &&
			!String(financeModal.totalRejectionReason || "").trim()
		) {
			message.error(txt.totalRejectionReason);
			return;
		}
		setActionLoading(true);
		updatePendingConfirmationReservation({
			reservationId: reservation._id,
			userId: user._id,
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
				if (refreshAfterUpdate(data)) closeFinanceModal();
			})
			.finally(() => setActionLoading(false));
	};

	const columns = useMemo(
		() => [
			{
				title: "#",
				width: 42,
				render: (_, __, index) => (page - 1) * records + index + 1,
			},
			{
				title: txt.confirmation,
				dataIndex: "confirmation_number",
				width: 118,
				render: (value, record) => (
					<ClickText onClick={() => openReservation(record)}>
						{value || "-"}
					</ClickText>
				),
			},
			{
				title: txt.guest,
				dataIndex: ["customer_details", "name"],
				width: 118,
				render: (value) => value || "-",
			},
			{
				title: txt.phone,
				dataIndex: ["customer_details", "phone"],
				width: 112,
				render: (value) => <span dir='ltr'>{value || "-"}</span>,
			},
			{
				title: txt.source,
				dataIndex: "booking_source",
				width: 105,
				render: (value) => (
					<span style={{ textTransform: "capitalize" }}>{value || "-"}</span>
				),
			},
			{
				title: txt.bookedAt,
				dataIndex: "booked_at",
				width: 95,
				render: formatDate,
			},
			{
				title: txt.checkin,
				dataIndex: "checkin_date",
				width: 88,
				render: formatDate,
			},
			{
				title: txt.checkout,
				dataIndex: "checkout_date",
				width: 88,
				render: formatDate,
			},
			{
				title: txt.status,
				dataIndex: "reservation_status",
				width: 110,
				render: (value, record) => {
					const statusText = String(value || "").toLowerCase();
					const isPendingConfirmation =
						statusText.includes("pending confirmation") ||
						String(record?.pendingConfirmation?.status || "").toLowerCase() ===
							"pending";
					const isPending =
						isPendingConfirmation ||
						statusText.includes("pending finance review") ||
						statusText.includes("pending agent commission approval");
					const isFinanceReview = statusText.includes("pending finance review");
					const isAgentCommission = statusText.includes(
						"pending agent commission approval",
					);
					const isFinanceRejected = statusText.includes("finance rejected");
					const isRejected =
						isFinanceRejected ||
						statusText.includes("reject") ||
						String(record?.pendingConfirmation?.status || "").toLowerCase() ===
							"rejected";
					const isConfirmed = statusText === "confirmed";
					return (
						<StatusAction
							type='button'
							$isPending={isPending}
							$isRejected={isRejected}
							$isConfirmed={isConfirmed}
							onClick={() =>
								!workflowPermissions.canReviewStatus
									? openReservation(record)
									: isPendingConfirmation
									? openStatusModal(record)
									: isConfirmed
									? submitRevertToPending(record)
									: openReservation(record)
							}
							title={
								isPendingConfirmation
									? txt.confirmTitle
									: isConfirmed
									? txt.revertTitle
									: ""
							}
						>
							{isFinanceRejected
								? txt.financeRejected
								: isAgentCommission
								? txt.agentCommissionPending
								: isFinanceReview
								? txt.financeReviewPending
								: isPending
								? txt.pending
								: isRejected
								? txt.rejected
								: normalizeStatus(value)}
						</StatusAction>
					);
				},
			},
			{
				title: txt.total,
				dataIndex: "total_amount",
				width: 98,
				render: (value) => <strong>{formatMoney(value)} SAR</strong>,
			},
			{
				title: txt.commission,
				width: 108,
				render: (_, record) => {
					const commission = getCommissionValue(record);
					const assigned = hasCommissionAssignment(record);
					return (
						<CommissionButton
							type='button'
							$needsAttention={!assigned}
							disabled={!workflowPermissions.canReviewCommission}
							onClick={() =>
								workflowPermissions.canReviewCommission
									? openFinanceModal(record)
									: undefined
							}
							title={
								workflowPermissions.canReviewCommission
									? txt.adjustCommission
									: txt.confirmTitle
							}
						>
							{assigned ? (
								<strong>{formatMoney(commission)} SAR</strong>
							) : (
								<Tag color='red'>{txt.commissionMissing}</Tag>
							)}
							<small>
								{assigned ? txt.commissionAssigned : txt.adjustCommission}
							</small>
						</CommissionButton>
					);
				},
			},
			{
				title: txt.reasons,
				width: 116,
				render: (_, record) => {
					const reasons = Array.isArray(record.pendingReasons)
						? record.pendingReasons
						: [];
					return (
						<ReasonStack>
							{reasons.includes("pending_confirmation") ? (
								<Tag color='gold'>{txt.pending}</Tag>
							) : null}
							{reasons.includes("pending_rejected") ? (
								<Tag color='red'>{txt.rejected}</Tag>
							) : null}
							{reasons.includes("commission_missing") ? (
								<Tag color='volcano'>{txt.commissionMissing}</Tag>
							) : null}
							{reasons.includes("finance_review_pending") ? (
								<Tag color='blue'>{txt.financeReviewPending}</Tag>
							) : null}
							{reasons.includes("agent_commission_pending") ? (
								<Tag color='purple'>{txt.agentCommissionPending}</Tag>
							) : null}
							{reasons.includes("finance_total_rejected") ? (
								<Tag color='red'>{txt.financeRejected}</Tag>
							) : null}
							{reasons.includes("agent_commission_rejected") ? (
								<Tag color='red'>{txt.rejected}</Tag>
							) : null}
						</ReasonStack>
					);
				},
			},
			{
				title: txt.moreDetails,
				width: 112,
				render: (_, record) => (
					<ClickText type='button' onClick={() => openReservation(record)}>
						{txt.moreDetails}
					</ClickText>
				),
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			isArabic,
			page,
			records,
			txt,
			workflowPermissions.canReviewCommission,
			workflowPermissions.canReviewStatus,
		],
	);

	return (
		<Wrapper dir={isArabic ? "rtl" : "ltr"} $isArabic={isArabic}>
			<PendingChoiceGlobalStyles />
			<HeaderPanel>
				<div>
					<h2>{txt.title}</h2>
					<p>{txt.subtitle}</p>
				</div>
				<Button onClick={loadData}>{txt.refresh}</Button>
			</HeaderPanel>

			<FilterBar>
				<Input
					value={searchDraft}
					onChange={(event) => setSearchDraft(event.target.value)}
					onPressEnter={() => {
						setPage(1);
						setSearch(searchDraft.trim());
					}}
					placeholder={txt.searchPlaceholder}
				/>
				<Button
					type='primary'
					onClick={() => {
						setPage(1);
						setSearch(searchDraft.trim());
					}}
				>
					{txt.search}
				</Button>
			</FilterBar>

			<TableShell>
				<Table
					rowKey={(record) => record._id || record.confirmation_number}
					columns={columns}
					dataSource={tableRows}
					childrenColumnName='__pendingConfirmationChildren'
					loading={loading}
					pagination={false}
					size='middle'
					scroll={{ x: 1210 }}
					locale={{ emptyText: txt.noData }}
				/>
			</TableShell>

			<Modal
				open={statusModal.open}
				onCancel={closeStatusModal}
				title={<ModalTitleText $isRTL={isArabic}>{txt.confirmTitle}</ModalTitleText>}
				footer={null}
				destroyOnClose
			>
				{statusModal.reservation ? (
					<DecisionModalBody $isRTL={isArabic}>
						<p>
							{txt.confirmQuestion
								.replace(
									"{days}",
									getStayLength(statusModal.reservation).days,
								)
								.replace(
									"{nights}",
									getStayLength(statusModal.reservation).nights,
								)
								.replace(
									"{amount}",
									formatMoney(statusModal.reservation.total_amount),
								)}
						</p>
						<DecisionSupportGrid>
							<DecisionSupportCard>
								<span>{txt.agentWallet}</span>
								<strong>
									{decisionSupport.loading
										? "..."
										: decisionSupport.wallet
										? `${formatMoney(
												decisionSupport.wallet?.agents?.[0]?.balance ||
													decisionSupport.wallet?.totals?.balance ||
													decisionSupport.wallet?.totals?.currentBalance ||
													0,
										  )} SAR`
										: txt.noWallet}
								</strong>
							</DecisionSupportCard>
							<DecisionSupportCard>
								<span>{txt.availableInventory}</span>
								<strong>
									{decisionSupport.loading
										? "..."
										: decisionSupport.inventory.length
										? decisionSupport.inventory
												.slice(0, 3)
												.map((item) => {
													const name =
														item.displayName ||
														item.roomDisplayName ||
														item.room_type ||
														item.roomType ||
														item.name ||
														"Room";
													const available =
														item.available ??
														item.availableRooms ??
														item.remaining ??
														item.count ??
														0;
													return `${name}: ${available}`;
												})
												.join(" | ")
										: txt.noInventory}
								</strong>
							</DecisionSupportCard>
						</DecisionSupportGrid>
						<label>
							<FieldLabelText
								help={definitions.rejectionReason}
								isArabic={isArabic}
							>
								{txt.rejectionReason}
							</FieldLabelText>
							<Input.TextArea
								value={statusModal.rejectionReason}
								onChange={(event) =>
									setStatusModal((prev) => ({
										...prev,
										rejectionReason: event.target.value,
									}))
								}
								rows={3}
								placeholder={txt.rejectionPlaceholder}
							/>
						</label>
						<ModalActions>
							<Button onClick={closeStatusModal}>{txt.cancel}</Button>
							<Button
								danger
								loading={actionLoading}
								onClick={() => submitPendingDecision("reject")}
							>
								{txt.noReject}
							</Button>
							<Button
								danger
								loading={actionLoading}
								onClick={() => submitPendingDecision("cancel")}
							>
								{txt.cancelReservation}
							</Button>
							<Button
								type='primary'
								loading={actionLoading}
								onClick={() => submitPendingDecision("confirm")}
							>
								{txt.yesConfirm}
							</Button>
						</ModalActions>
					</DecisionModalBody>
				) : null}
			</Modal>

			<Modal
				open={financeModal.open}
				onCancel={closeFinanceModal}
				title={<ModalTitleText $isRTL={isArabic}>{txt.adjustCommission}</ModalTitleText>}
				footer={null}
				destroyOnClose
				className={isArabic ? "pending-choice-modal rtl" : "pending-choice-modal"}
			>
				<DecisionModalBody $isRTL={isArabic}>
					<label>
						<FieldLabelText
							help={definitions.commissionAmount}
							isArabic={isArabic}
						>
							{txt.commission}
						</FieldLabelText>
						<InputNumber
							min={0}
							value={financeModal.commission}
							onChange={(value) =>
								setFinanceModal((prev) => ({
									...prev,
									commission: Number(value || 0),
								}))
							}
							style={{ width: "100%" }}
							addonAfter='SAR'
						/>
					</label>
					<label>
						<FieldLabelText help={definitions.totalReview} isArabic={isArabic}>
							{totalReviewLabel}
						</FieldLabelText>
						<Select
							popupClassName={
								isArabic
									? "pending-choice-select-dropdown rtl"
									: "pending-choice-select-dropdown"
							}
							value={financeModal.totalReviewStatus}
							onChange={(value) =>
								setFinanceModal((prev) => ({
									...prev,
									totalReviewStatus: value,
									totalRejectionReason:
										value === "rejected" ? prev.totalRejectionReason : "",
								}))
							}
							options={[
								{
									value: "approved",
									label: (
										<ChoiceOptionLabel
											label={txt.totalApproved}
											help={definitions.totalApproved}
											isArabic={isArabic}
										/>
									),
								},
								{
									value: "rejected",
									label: (
										<ChoiceOptionLabel
											label={txt.totalRejected}
											help={definitions.totalRejected}
											isArabic={isArabic}
										/>
									),
								},
							]}
						/>
					</label>
					{financeModal.totalReviewStatus === "rejected" ? (
						<label>
							<FieldLabelText
								help={definitions.rejectionReason}
								isArabic={isArabic}
							>
								{txt.totalRejectionReason}
							</FieldLabelText>
							<Input.TextArea
								rows={3}
								value={financeModal.totalRejectionReason}
								placeholder={txt.totalRejectionPlaceholder}
								onChange={(event) =>
									setFinanceModal((prev) => ({
										...prev,
										totalRejectionReason: event.target.value,
									}))
								}
							/>
						</label>
					) : null}
					<label>
						<FieldLabelText
							help={definitions.commissionStatus}
							isArabic={isArabic}
						>
							{txt.commissionStatus}
						</FieldLabelText>
						<Select
							popupClassName={
								isArabic
									? "pending-choice-select-dropdown rtl"
									: "pending-choice-select-dropdown"
							}
							value={financeModal.commissionStatus}
							onChange={(value) =>
								setFinanceModal((prev) => ({
									...prev,
									commissionStatus: value,
									commissionPaid: value === "commission paid",
								}))
							}
							options={[
								{
									value: "commission due",
									label: (
										<ChoiceOptionLabel
											label={txt.commissionDue}
											help={definitions.commissionDue}
											isArabic={isArabic}
										/>
									),
								},
								{
									value: "commission paid",
									label: (
										<ChoiceOptionLabel
											label={txt.commissionPaid}
											help={definitions.commissionPaid}
											isArabic={isArabic}
										/>
									),
								},
								{
									value: "no commission due",
									label: (
										<ChoiceOptionLabel
											label={txt.commissionNone}
											help={definitions.commissionNone}
											isArabic={isArabic}
										/>
									),
								},
							]}
						/>
					</label>
					<ModalActions>
						<Button onClick={closeFinanceModal}>{txt.cancel}</Button>
						<Button
							type='primary'
							loading={actionLoading}
							onClick={submitFinanceUpdate}
						>
							{txt.saveCommission}
						</Button>
					</ModalActions>
				</DecisionModalBody>
			</Modal>

			<PaginationRow>
				<Pagination
					current={page}
					pageSize={records}
					total={total}
					onChange={setPage}
					showSizeChanger={false}
				/>
			</PaginationRow>

			<Modal
				open={!!selectedReservation}
				onCancel={closeReservation}
				footer={null}
				width='min(94vw, 1580px)'
				style={{ top: 10, paddingBottom: 0 }}
				className='reservation-details-modal'
				destroyOnClose
			>
				{selectedReservation ? (
					<ReservationDetail
						reservation={selectedReservation}
						setReservation={setSelectedReservation}
						hotelDetails={hotelDetails}
					/>
				) : null}
			</Modal>
		</Wrapper>
	);
};

export default PendingConfirmationReport;

const PendingChoiceGlobalStyles = createGlobalStyle`
	.pending-choice-select-dropdown.rtl {
		direction: rtl;
		text-align: right;
	}

	.pending-choice-select-dropdown.rtl .ant-select-item-option-content {
		text-align: right;
	}

	.pending-choice-tooltip,
	.pending-choice-tooltip.ant-tooltip,
	.ant-tooltip.pending-choice-tooltip,
	.pending-choice-tooltip .ant-tooltip-content,
	.pending-choice-tooltip .ant-tooltip-inner {
		z-index: 100000 !important;
	}
`;

const Wrapper = styled.div`
	max-width: 1480px;
	margin: 0 auto;
	padding: clamp(10px, 1.4vw, 18px);
	color: #111827;
`;

const HeaderPanel = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 14px 16px;
	border: 1px solid #b8dcff;
	border-radius: 10px;
	background: linear-gradient(135deg, #e9f6ff 0%, #f7fbff 100%);

	h2 {
		margin: 0;
		font-size: clamp(1.15rem, 2vw, 1.65rem);
		font-weight: 900;
		color: #0f4f86;
	}

	p {
		margin: 4px 0 0;
		color: #47627d;
		font-weight: 700;
	}

	@media (max-width: 620px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const FilterBar = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 10px;
	margin: 12px 0;
	padding: 12px;
	border: 1px solid #d7e8fb;
	border-radius: 10px;
	background: #ffffff;

	@media (max-width: 560px) {
		grid-template-columns: 1fr;
	}
`;

const TableShell = styled.div`
	border: 1px solid #d7e8fb;
	border-radius: 10px;
	overflow: hidden;
	background: #fff;

	.ant-table-thead > tr > th {
		background: #e7f4ff;
		color: #0f2742;
		font-weight: 900;
		text-align: center;
		white-space: nowrap;
	}

	.ant-table-tbody > tr > td {
		text-align: center;
		vertical-align: middle;
	}
`;

const PaginationRow = styled.div`
	display: flex;
	justify-content: center;
	margin-top: 12px;
`;

const ClickText = styled.button`
	border: 0;
	background: transparent;
	color: #0b6fdc;
	font-weight: 900;
	text-decoration: underline;
	cursor: pointer;
`;

const attentionBeat = keyframes`
	0%,
	100% {
		transform: scale(1);
	}
	14% {
		transform: scale(1.035);
	}
	28% {
		transform: scale(1);
	}
	42% {
		transform: scale(1.025);
	}
	70% {
		transform: scale(1);
	}
`;

const pendingHalo = keyframes`
	0% {
		box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.35);
	}
	70% {
		box-shadow: 0 0 0 12px rgba(245, 158, 11, 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
	}
`;

const commissionHalo = keyframes`
	0% {
		box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.32);
	}
	70% {
		box-shadow: 0 0 0 12px rgba(248, 113, 113, 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(248, 113, 113, 0);
	}
`;

const needsAttentionStyle = (haloAnimation) => css`
	animation: ${attentionBeat} 1.75s ease-in-out infinite,
		${haloAnimation} 1.75s ease-out infinite;
	will-change: transform, box-shadow;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
`;

const StatusAction = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 120px;
	padding: 6px 12px;
	border: 1px solid
		${(props) =>
			props.$isRejected
				? "#ff7875"
				: props.$isPending
				? "#ffd666"
				: props.$isConfirmed
				? "#8ce99a"
				: "#b8dcff"};
	border-radius: 999px;
	background: ${(props) =>
		props.$isRejected
			? "#fff1f0"
			: props.$isPending
			? "#fff7df"
			: props.$isConfirmed
			? "#ecfdf3"
			: "#eef7ff"};
	color: ${(props) =>
		props.$isRejected
			? "#a8071a"
			: props.$isPending
			? "#8a5600"
			: props.$isConfirmed
			? "#087f2e"
			: "#0b5cad"};
	font-weight: 900;
	cursor: pointer;
	box-shadow: ${(props) =>
		props.$isPending || props.$isConfirmed
			? "0 8px 18px rgba(16, 185, 129, 0.12)"
			: "none"};
	${(props) => (props.$isPending ? needsAttentionStyle(pendingHalo) : "")}

	&:hover {
		filter: brightness(0.98);
		transform: translateY(-1px);
	}
`;

const CommissionButton = styled.button`
	border: 1px solid #ffd8bf;
	border-radius: 10px;
	background: #fff7f0;
	color: #b43800;
	min-width: 120px;
	padding: 5px 8px;
	display: grid;
	gap: 2px;
	justify-items: center;
	font-weight: 900;
	cursor: pointer;
	${(props) =>
		props.$needsAttention ? needsAttentionStyle(commissionHalo) : ""}

	strong {
		color: #102033;
	}

	small {
		color: #0b6fdc;
		font-size: 0.68rem;
	}

	&:hover {
		border-color: #ff9c6e;
		background: #fff2e8;
	}
`;

const ReasonStack = styled.div`
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 4px;
`;

const DecisionModalBody = styled.div`
	display: grid;
	gap: 14px;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};

	p {
		margin: 0;
		padding: 12px;
		border: 1px solid #cfe8ff;
		border-radius: 10px;
		background: #f4fbff;
		color: #12324d;
		font-weight: 900;
		line-height: 1.6;
		text-align: center;
	}

	label {
		display: grid;
		gap: 6px;
		color: #203044;
		font-weight: 900;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	}

	.ant-select,
	.ant-input,
	.ant-input-number,
	.ant-input-number-group-wrapper {
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.ant-select-selection-item,
	.ant-select-selection-placeholder,
	.ant-input,
	.ant-input-number-input,
	textarea.ant-input {
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.ant-select-selector {
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")} !important;
	}

	.ant-select-arrow {
		inset-inline-start: ${(props) => (props.$isRTL ? "11px" : "auto")};
		inset-inline-end: ${(props) => (props.$isRTL ? "auto" : "11px")};
	}

	.ant-input-number-group-addon {
		direction: ltr;
	}
`;

const ModalTitleText = styled.span`
	display: block;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};
`;

const LabelText = styled.span`
	display: inline-flex;
	align-items: center;
	flex-direction: row;
	justify-content: flex-start;
	gap: 6px;
	width: fit-content;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	justify-self: ${(props) => (props.$isRTL ? "right" : "left")};
	margin-left: ${(props) => (props.$isRTL ? "auto" : "0")};
	margin-right: ${(props) => (props.$isRTL ? "0" : "auto")};

`;

const ChoiceLabel = styled.span`
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-direction: row;
	gap: 8px;
	width: 100%;
	min-width: 0;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};

	> span:first-child {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;

const InfoHint = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	border: 1px solid #93c5fd;
	border-radius: 999px;
	background: #eff6ff;
	color: #0b6fdc;
	font-size: 0.72rem;
	line-height: 1;
	cursor: help;
	flex: 0 0 auto;

	svg {
		font-size: 12px;
	}
`;

const TooltipContent = styled.div`
	max-width: 280px;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	line-height: 1.55;
	font-weight: 700;
`;

const DecisionSupportGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;

	@media (max-width: 560px) {
		grid-template-columns: 1fr;
	}
`;

const DecisionSupportCard = styled.div`
	padding: 10px 12px;
	border: 1px solid #cfe5fb;
	border-radius: 8px;
	background: #f4faff;

	span {
		display: block;
		color: #47627d;
		font-size: 0.8rem;
		font-weight: 800;
	}

	strong {
		display: block;
		margin-top: 4px;
		color: #0f2742;
		font-size: 0.92rem;
		line-height: 1.45;
	}
`;

const ModalActions = styled.div`
	display: flex;
	justify-content: flex-end;
	flex-wrap: wrap;
	gap: 8px;
`;
