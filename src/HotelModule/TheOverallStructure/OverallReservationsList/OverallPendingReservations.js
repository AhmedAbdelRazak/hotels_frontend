import React, { useEffect, useMemo, useState } from "react";
import { message, Modal } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import {
	exportOverallPendingReservations,
	getOverallPendingReservations,
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
} from "./OverallReservationDetailsModal";
import { downloadReservationWorkbook } from "./reservationExcelExport";

const PENDING_RESERVATIONS_TEXT = {
	en: {
		title: "Overall Pending Reservations",
		subtitle: "Pending confirmation and finance-review reservations",
		confirmReservation: "Confirm",
		confirmTitle: "Confirm reservation",
		confirmQuestion:
			"Confirm reservation #{confirmation} with {days} days / {nights} nights for {amount} SAR?",
		yesConfirm: "Yes, confirm",
		cancel: "Cancel",
		updateSuccess: "Reservation updated.",
		updateError: "Could not update reservation.",
		notAllowedToConfirm: "This account cannot confirm pending reservations.",
		allBookingSources: "All booking sources",
	},
	ar: {
		title: "الحجوزات المعلقة العامة",
		subtitle: "حجوزات بانتظار التأكيد أو مراجعة المالية",
		confirmReservation: "تأكيد",
		confirmTitle: "تأكيد الحجز",
		confirmQuestion:
			"هل تريد تأكيد الحجز رقم {confirmation} لمدة {days} أيام / {nights} ليال بقيمة {amount} ر.س؟",
		yesConfirm: "نعم، تأكيد",
		cancel: "إلغاء",
		updateSuccess: "تم تحديث الحجز.",
		updateError: "تعذر تحديث الحجز.",
		notAllowedToConfirm: "هذا الحساب غير مصرح له بتأكيد الحجوزات المعلقة.",
		allBookingSources: "كل مصادر الحجز",
	},
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

const isOrderTakerOnlyAccount = (account = {}) => {
	const roles = getAccountRoleNumbers(account);
	const descriptions = getAccountRoleDescriptions(account).map(normalizeRoleKey);
	const accessTo = Array.isArray(account?.accessTo) ? account.accessTo : [];
	const hasOrderTaking =
		roles.includes(7000) ||
		descriptions.includes("ordertaker") ||
		accessTo.includes("ownReservations");
	const hasFullReservationAccess =
		roles.some((role) => [1000, 2000, 3000, 8000, 10000].includes(role)) ||
		descriptions.some((description) =>
			[
				"hotelmanager",
				"reception",
				"reservationemployee",
				"systemadmin",
				"superadmin",
			].includes(description)
		);

	return hasOrderTaking && !hasFullReservationAccess;
};

const getPendingWorkflowPermissions = (account = {}) => {
	const roles = getAccountRoleNumbers(account);
	const descriptions = getAccountRoleDescriptions(account).map(normalizeRoleKey);
	const isManagerOrAdmin =
		roles.includes(1000) ||
		roles.includes(2000) ||
		roles.includes(10000) ||
		descriptions.includes("systemadmin") ||
		descriptions.includes("system admin") ||
		descriptions.includes("hotelmanager");
	const isFinance =
		roles.includes(6000) || descriptions.includes("finance");
	const isReservationEmployee =
		roles.includes(8000) || descriptions.includes("reservationemployee");
	const canUsePendingWorkflow =
		isManagerOrAdmin || isFinance || isReservationEmployee;
	const financeOnly = isFinance && !isManagerOrAdmin && !isReservationEmployee;

	return {
		canReviewStatus: canUsePendingWorkflow && !financeOnly,
	};
};

const getStayLength = (reservation = {}) => {
	const checkin = reservation.checkin_date
		? new Date(reservation.checkin_date)
		: null;
	const checkout = reservation.checkout_date
		? new Date(reservation.checkout_date)
		: null;
	const nights =
		checkin &&
		checkout &&
		!Number.isNaN(checkin.getTime()) &&
		!Number.isNaN(checkout.getTime())
			? Math.max(
					Math.round(
						(checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24)
					),
					0
			  )
			: Math.max(Number(reservation.days_of_residence || 0), 0);
	return { nights, days: nights + 1 };
};

const isPendingConfirmationReservation = (reservation = {}) => {
	const statusText = String(
		reservation.reservation_status || reservation.state || ""
	).toLowerCase();
	const pendingStatus = String(reservation?.pendingConfirmation?.status || "")
		.trim()
		.toLowerCase();
	const reasons = Array.isArray(reservation.pendingReasons)
		? reservation.pendingReasons
		: [];
	return (
		statusText.includes("pending confirmation") ||
		pendingStatus === "pending" ||
		reasons.includes("pending_confirmation")
	);
};

const OverallPendingReservations = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = {
		...common,
		...PENDING_RESERVATIONS_TEXT[isRTL ? "ar" : "en"],
	};
	const history = useHistory();
	const location = useLocation();
	const auth = useMemo(() => isAuthenticated() || {}, []);
	const currentUser = useMemo(() => auth?.user || {}, [auth]);
	const workflowPermissions = useMemo(
		() => getPendingWorkflowPermissions(currentUser),
		[currentUser]
	);
	const agentReadOnlyPending = useMemo(
		() => isOrderTakerOnlyAccount(currentUser),
		[currentUser]
	);
	const [filters, setFilters] = useState({
		hotelId: "",
		bookingSource: "",
		dateBy: "booked_at",
		dateFrom: "",
		dateTo: "",
		sortBy: "booked_at",
		sortOrder: "asc",
	});
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [result, setResult] = useState({ reservations: [], hotels: [], total: 0 });
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [confirmingReservationId, setConfirmingReservationId] = useState("");

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			...filters,
			page,
			limit: OVERALL_PAGE_SIZE,
		}),
		[filters, ownerId, page]
	);

	useEffect(() => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallPendingReservations(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { reservations: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	}, [params, token, userId]);

	const loadPendingReservations = () => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallPendingReservations(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { reservations: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	};

	const hotels = Array.isArray(result.hotels) ? result.hotels : [];
	const bookingSources = Array.isArray(result.bookingSources)
		? result.bookingSources
		: [];
	const reservations = Array.isArray(result.reservations)
		? result.reservations
		: [];
	const pages = Math.max(Number(result.pages || 1), 1);

	const updateFilter = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value }));
		setPage(1);
	};

	const openMoreDetails = (reservation = {}) => {
		setSelectedReservation(reservation);
		setReservationIdInQuery(history, location, reservation);
	};

	const openReservation = (reservation = {}) => {
		if (agentReadOnlyPending) {
			openMoreDetails(reservation);
			return;
		}
		const route = reservationSingleHotelRoute(reservation, ownerId, "pending");
		if (route) history.push(route);
	};

	const refreshUpdatedReservation = (updatedReservation = {}) => {
		if (!updatedReservation || updatedReservation.error) {
			message.error(updatedReservation?.error || labels.updateError);
			return false;
		}
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
		loadPendingReservations();
		return true;
	};

	const confirmPendingReservation = (reservation = {}) => {
		if (!workflowPermissions.canReviewStatus) {
			message.error(labels.notAllowedToConfirm);
			return;
		}
		if (!isPendingConfirmationReservation(reservation)) return;

		const actorId = currentUser?._id || userId;
		if (!reservation?._id || !actorId) {
			message.error(labels.updateError);
			return;
		}

		const stayLength = getStayLength(reservation);
		Modal.confirm({
			title: labels.confirmTitle,
			content: (
				<div dir={isRTL ? "rtl" : "ltr"}>
					{labels.confirmQuestion
						.replace(
							"{confirmation}",
							reservation.confirmation_number || reservation._id || "-"
						)
						.replace("{days}", stayLength.days)
						.replace("{nights}", stayLength.nights)
						.replace("{amount}", formatMoney(reservation.total_amount))}
				</div>
			),
			okText: labels.yesConfirm,
			cancelText: labels.cancel,
			centered: true,
			onOk: () => {
				setConfirmingReservationId(String(reservation._id));
				return updatePendingConfirmationReservation({
					reservationId: reservation._id,
					userId: actorId,
					payload: { action: "confirm" },
				})
					.then((data) => {
						if (!data || data.error) {
							throw new Error(data?.error || labels.updateError);
						}
						refreshUpdatedReservation(data);
						message.success(labels.updateSuccess);
						return data;
					})
					.catch((error) => {
						message.error(error?.message || labels.updateError);
						return false;
					})
					.finally(() => setConfirmingReservationId(""));
			},
		});
	};

	const handleExportExcel = () => {
		if (!userId || !token || exporting) return;
		setExporting(true);
		exportOverallPendingReservations(userId, token, {
			...buildOwnerParams(ownerId),
			...filters,
			sortBy: filters.sortBy || "booked_at",
			sortOrder: filters.sortOrder || "asc",
		})
			.then((data) => {
				if (data?.error) {
					message.error(data.error || labels.exportFailed);
					return;
				}
				const rows = Array.isArray(data?.reservations)
					? data.reservations
					: [];
				if (!rows.length) {
					message.info(labels.noRowsToExport);
					return;
				}
				downloadReservationWorkbook({
					reservations: rows,
					labels,
					chosenLanguage,
					filePrefix: "overall-pending-reservations",
				});
			})
			.catch(() => message.error(labels.exportFailed))
			.finally(() => setExporting(false));
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
					disabled={exporting}
					onClick={handleExportExcel}
				>
					{exporting ? labels.exportingExcel : labels.exportExcel}
				</button>
				<button
					type='button'
					className='secondary'
					onClick={() => {
						setFilters({
							hotelId: "",
							bookingSource: "",
							dateBy: "booked_at",
							dateFrom: "",
							dateTo: "",
							sortBy: "booked_at",
							sortOrder: "asc",
						});
						setPage(1);
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
							<th>{labels.action}</th>
							<th>{labels.booked}</th>
							<th>{labels.checkIn}</th>
							<th>{labels.checkOut}</th>
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
										{isPendingConfirmationReservation(reservation) &&
										workflowPermissions.canReviewStatus ? (
											<ActionButton
												type='button'
												disabled={
													String(confirmingReservationId) ===
													String(reservation._id)
												}
												onClick={() => confirmPendingReservation(reservation)}
											>
												{String(confirmingReservationId) ===
												String(reservation._id)
													? labels.saving
													: labels.confirmReservation}
											</ActionButton>
										) : (
											"-"
										)}
									</td>
									<td>{formatDate(reservation.booked_at || reservation.createdAt)}</td>
									<td>{formatDate(reservation.checkin_date)}</td>
									<td>{formatDate(reservation.checkout_date)}</td>
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
								<td colSpan='12'>{labels.noPendingReservationsFound}</td>
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

			<OverallReservationDetailsModal
				reservations={reservations}
				selectedReservation={selectedReservation}
				setSelectedReservation={setSelectedReservation}
				ownerId={ownerId}
				onReservationUpdated={refreshUpdatedReservation}
				chosenLanguage={chosenLanguage}
			/>
		</OverallPageShell>
	);
};

export default OverallPendingReservations;
