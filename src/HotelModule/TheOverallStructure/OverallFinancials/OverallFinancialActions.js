import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, InputNumber, message, Modal, Select, Tag } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import {
	getOverallFinancialActions,
	reviewAgentWalletClaim,
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
	OverallHeader,
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

	return (
		<OverallPageShell $isRTL={isRTL}>
			<OverallHeader>
				<div>
					<h2>{labels.title}</h2>
					<p>{labels.subtitle}</p>
				</div>
			</OverallHeader>

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
			</OverallToolbar>

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

			<OverallHeader>
				<div>
					<h2>{labels.walletClaimsTitle}</h2>
					<p>{labels.walletClaimsSubtitle}</p>
				</div>
			</OverallHeader>

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

export default OverallFinancialActions;
