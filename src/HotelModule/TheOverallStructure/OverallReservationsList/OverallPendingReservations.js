import React, { useEffect, useMemo, useState } from "react";
import { message, Modal, Select } from "antd";
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
	formatDateByCalendar,
	formatMoney,
	getOverallText,
	getReservationNights,
	getReservationPricePerDay,
	localizeStatus,
	OVERALL_PAGE_SIZE,
	OverallHeader,
	OverallPageShell,
	OverallTableWrap,
	OverallToolbar,
	Pager,
	pageRowNumber,
	ReservationTableControls,
	StatusPill,
	statusTone,
	TableTooltipText,
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

const sortOptions = (labels) => [
	{ value: "createdAt", label: labels.createdAt },
	{ value: "booking_source", label: labels.source },
	{ value: "hotelName", label: labels.hotel },
	{ value: "checkin_date", label: labels.checkIn },
	{ value: "checkout_date", label: labels.checkOut },
];

const pageFromSearch = (search = "") =>
	Math.max(parseInt(new URLSearchParams(search || "").get("page"), 10) || 1, 1);

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
	const [filters, setFilters] = useState({
		hotelId: [],
		bookingSource: [],
		dateBy: "booked_at",
		dateFrom: "",
		dateTo: "",
		sortBy: "createdAt",
		sortOrder: "asc",
	});
	const [page, setPage] = useState(() => pageFromSearch(location.search));
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [result, setResult] = useState({ reservations: [], hotels: [], total: 0 });
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [confirmingReservationId, setConfirmingReservationId] = useState("");
	const [dateMode, setDateMode] = useState("gregorian");

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

	useEffect(() => {
		const nextPage = pageFromSearch(location.search);
		setPage((previous) => (previous === nextPage ? previous : nextPage));
	}, [location.search]);

	useEffect(() => {
		const safePage = Math.max(Number(page) || 1, 1);
		const query = new URLSearchParams(location.search || "");
		if (query.get("page") === String(safePage)) return;
		query.set("page", String(safePage));
		history.replace({
			pathname: location.pathname,
			search: `?${query.toString()}`,
		});
	}, [history, location.pathname, location.search, page]);

	const updateFilter = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value }));
		setPage(1);
	};

	const updateSort = (sortBy) => {
		setFilters((previous) => ({
			...previous,
			sortBy,
			sortOrder:
				previous.sortBy === sortBy && previous.sortOrder === "asc"
					? "desc"
					: "asc",
		}));
		setPage(1);
	};

	const goToPage = (nextPage) =>
		setPage(Math.min(Math.max(Number(nextPage) || 1, 1), pages));

	const sortArrow = (sortBy) =>
		filters.sortBy === sortBy ? (filters.sortOrder === "asc" ? "▲" : "▼") : "";

	const sortableHeader = (label, sortBy) => (
		<button
			type='button'
			className='sortable-heading'
			onClick={() => updateSort(sortBy)}
			aria-pressed={filters.sortBy === sortBy}
		>
			<span>{label}</span>
			{sortArrow(sortBy) ? (
				<span className='sort-arrow'>{sortArrow(sortBy)}</span>
			) : null}
		</button>
	);

	const tableDate = (value) =>
		formatDateByCalendar(value, chosenLanguage, dateMode);

	const openMoreDetails = (reservation = {}) => {
		setSelectedReservation(reservation);
		setReservationIdInQuery(history, location, reservation);
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
			sortBy: filters.sortBy || "createdAt",
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
				<Select
					mode='multiple'
					allowClear
					showSearch
					maxTagCount='responsive'
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.hotelId}
					onChange={(value) => updateFilter("hotelId", value)}
					placeholder={labels.allHotels}
					optionFilterProp='label'
					options={hotels.map((hotel) => ({
						value: hotel._id,
						label: titleCase(hotel.hotelName),
					}))}
				/>
				<Select
					mode='multiple'
					allowClear
					showSearch
					maxTagCount='responsive'
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.bookingSource}
					onChange={(value) => updateFilter("bookingSource", value)}
					placeholder={labels.allBookingSources}
					optionFilterProp='label'
					options={bookingSources.map((item) => ({
						value: item.source,
						label: `${titleCase(item.source)} (${item.count})`,
					}))}
				/>
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
							hotelId: [],
							bookingSource: [],
							dateBy: "booked_at",
							dateFrom: "",
							dateTo: "",
							sortBy: "createdAt",
							sortOrder: "asc",
						});
						setPage(1);
					}}
				>
					{labels.reset}
				</button>
			</OverallToolbar>

			<ReservationTableControls>
				<div className='control-group'>
					<button
						type='button'
						className={dateMode === "gregorian" ? "active" : ""}
						aria-pressed={dateMode === "gregorian"}
						onClick={() => setDateMode("gregorian")}
					>
						{labels.gregorianDates}
					</button>
					<button
						type='button'
						className={`calendar-hijri ${
							dateMode === "hijri" ? "active" : ""
						}`}
						aria-pressed={dateMode === "hijri"}
						onClick={() => setDateMode("hijri")}
					>
						{labels.hijriDates}
					</button>
				</div>
				<div className='control-group'>
					<span className='control-label'>{labels.sortBy}</span>
					{sortOptions(labels).map((option) => {
						const active = filters.sortBy === option.value;
						return (
							<button
								type='button'
								key={option.value}
								className={active ? "active" : ""}
								aria-pressed={active}
								onClick={() => updateSort(option.value)}
							>
								{option.label}
								{active ? (filters.sortOrder === "asc" ? " ^" : " v") : ""}
							</button>
						);
					})}
				</div>
			</ReservationTableControls>

			<OverallTableWrap>
				<table className='reservation-list-table reservation-pending-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>{sortableHeader(labels.hotel, "hotelName")}</th>
							<th>{labels.confirmation}</th>
							<th>{labels.guest}</th>
							<th>{sortableHeader(labels.source, "booking_source")}</th>
							<th>{labels.status}</th>
							<th>{labels.action}</th>
							<th>{sortableHeader(labels.booked, "createdAt")}</th>
							<th>{sortableHeader(labels.checkIn, "checkin_date")}</th>
							<th>{sortableHeader(labels.checkOut, "checkout_date")}</th>
							<th>{labels.nights}</th>
							<th>{labels.pricePerDay}</th>
							<th>{labels.total}</th>
							<th>{labels.moreDetails}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='14'>{labels.loading}</td>
							</tr>
						) : reservations.length ? (
							reservations.map((reservation, index) => (
								<tr key={reservation._id}>
									<td>{pageRowNumber(page, index, OVERALL_PAGE_SIZE)}</td>
									<td className='hotel-cell'>
										<TableTooltipText
											value={titleCase(reservation.hotelName || "-")}
											className='table-truncate'
										/>
									</td>
									<td>
										<button
											type='button'
											className='link-btn'
											onClick={() => openMoreDetails(reservation)}
										>
											{reservation.confirmation_number || "-"}
										</button>
									</td>
									<td className='guest-cell'>
										<TableTooltipText
											value={reservation.customer_details?.name || "-"}
											className='table-truncate'
										/>
									</td>
									<td className='source-cell'>
										<TableTooltipText
											value={reservation.booking_source || "-"}
											className='table-truncate'
										/>
									</td>
									<td>
										<StatusPill $tone={statusTone(reservation.reservation_status)}>
											<TableTooltipText
												value={localizeStatus(
													reservation.reservation_status,
													chosenLanguage
												)}
											/>
										</StatusPill>
									</td>
									<td>
										{isPendingConfirmationReservation(reservation) &&
										workflowPermissions.canReviewStatus ? (
											<ActionButton
												type='button'
												$success
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
									<td className='date-cell'>{tableDate(reservation.booked_at || reservation.createdAt)}</td>
									<td className='date-cell'>{tableDate(reservation.checkin_date)}</td>
									<td className='date-cell'>{tableDate(reservation.checkout_date)}</td>
									<td className='amount-cell'>{getReservationNights(reservation)}</td>
									<td className='amount-cell'>
										{formatMoney(getReservationPricePerDay(reservation))} {labels.sar}
									</td>
									<td className='amount-cell'>
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
								<td colSpan='14'>{labels.noPendingReservationsFound}</td>
							</tr>
						)}
					</tbody>
				</table>
			</OverallTableWrap>

			<Pager>
				<button type='button' disabled={page <= 1} onClick={() => goToPage(1)}>
					«
				</button>
				<button type='button' disabled={page <= 1} onClick={() => goToPage(page - 1)}>
					{labels.previous}
				</button>
				<span className='pager-summary'>
					<span>{labels.page}</span>
					<strong>{page}</strong>
					<span>{labels.of}</span>
					<strong>{pages}</strong>
					<small>({Number(result.total || 0)})</small>
				</span>
				<button
					type='button'
					disabled={page >= pages}
					onClick={() => goToPage(page + 1)}
				>
					{labels.next}
				</button>
				<button type='button' disabled={page >= pages} onClick={() => goToPage(pages)}>
					»
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
