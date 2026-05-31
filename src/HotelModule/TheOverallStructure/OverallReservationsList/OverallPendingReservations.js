import React, { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, message, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import {
	exportOverallPendingReservations,
	getHotelInventoryAvailability,
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
	OverallCenteredSearch,
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
import PendingReservationInventoryBrief, {
	extractPendingInventoryRows,
	getPendingReservationInventoryRequest,
	PENDING_REVIEW_MODAL_CLASS,
} from "../../NewReservation/PendingReservationInventoryBrief";

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

const PENDING_FILTER_TEXT = {
	en: {
		dateByLabel: "Date By",
		creationDate: "Creation Date",
		checkinDate: "Checkin Date",
		checkoutDate: "Checkout Date",
		fromDate: "From date",
		toDate: "To date",
	},
	ar: {
		dateByLabel: "حسب التاريخ",
		creationDate: "تاريخ الإنشاء",
		checkinDate: "تاريخ الوصول",
		checkoutDate: "تاريخ المغادرة",
		fromDate: "من تاريخ",
		toDate: "إلى تاريخ",
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

const dateByOptions = (labels) => [
	{ value: "createdAt", label: labels.creationDate },
	{ value: "checkin_date", label: labels.checkinDate },
	{ value: "checkout_date", label: labels.checkoutDate },
];

const pendingStatusOptions = (labels) => [
	{ value: "Pending Confirmation", label: labels.pendingConfirmation },
	{ value: "Pending Finance Review", label: labels.pendingFinanceReview },
	{
		value: "Pending Agent Commission Approval",
		label: labels.pendingAgentCommissionApproval,
	},
	{ value: "Finance Rejected", label: labels.financeRejected },
	{ value: "rejected", label: labels.rejected },
];

const pageFromSearch = (search = "") =>
	Math.max(parseInt(new URLSearchParams(search || "").get("page"), 10) || 1, 1);

const toDatePickerValue = (value = "") => {
	if (!value) return null;
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed : null;
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
		...PENDING_FILTER_TEXT[isRTL ? "ar" : "en"],
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
		search: "",
		hotelId: [],
		status: [],
		dateBy: "createdAt",
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
	const [confirmModal, setConfirmModal] = useState({
		open: false,
		reservation: null,
		inventoryLoading: false,
		currentInventory: [],
	});
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

	const updateDateFilter = (key, value) => {
		const nextDate = value || "";
		setFilters((previous) => {
			const next = { ...previous, [key]: nextDate };
			if (
				key === "dateFrom" &&
				nextDate &&
				previous.dateTo &&
				dayjs(previous.dateTo).isBefore(dayjs(nextDate), "day")
			) {
				next.dateTo = "";
			}
			if (
				key === "dateTo" &&
				nextDate &&
				previous.dateFrom &&
				dayjs(nextDate).isBefore(dayjs(previous.dateFrom), "day")
			) {
				next.dateFrom = "";
			}
			return next;
		});
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
	const dateCell = (value) => (
		<TableTooltipText
			value={tableDate(value)}
			max={16}
			className='date-truncate'
		/>
	);

	const disabledStartDate = (current) =>
		Boolean(
			current &&
				filters.dateTo &&
				current.isAfter(dayjs(filters.dateTo), "day")
		);

	const disabledEndDate = (current) =>
		Boolean(
			current &&
				filters.dateFrom &&
				current.isBefore(dayjs(filters.dateFrom), "day")
		);

	const openMoreDetails = (reservation = {}) => {
		setSelectedReservation(reservation);
		setReservationIdInQuery(history, location, reservation);
	};

	const loadConfirmInventory = (reservation = {}) => {
		const inventoryRequest = getPendingReservationInventoryRequest(reservation);
		if (
			!inventoryRequest.hotelId ||
			!inventoryRequest.start ||
			!inventoryRequest.end
		) {
			setConfirmModal((previous) => ({
				...previous,
				inventoryLoading: false,
				currentInventory: [],
			}));
			return;
		}
		setConfirmModal((previous) => ({
			...previous,
			inventoryLoading: true,
			currentInventory: [],
		}));
		getHotelInventoryAvailability(inventoryRequest.hotelId, {
			start: inventoryRequest.start,
			end: inventoryRequest.end,
			agentId: inventoryRequest.agentId,
			includePendingConfirmation: true,
		})
			.then((inventory) => {
				setConfirmModal((previous) => ({
					...previous,
					inventoryLoading:
						String(previous.reservation?._id || "") === String(reservation?._id || "")
							? false
							: previous.inventoryLoading,
					currentInventory:
						String(previous.reservation?._id || "") === String(reservation?._id || "")
							? extractPendingInventoryRows(inventory)
							: previous.currentInventory,
				}));
			})
			.catch(() => {
				setConfirmModal((previous) => ({
					...previous,
					inventoryLoading:
						String(previous.reservation?._id || "") === String(reservation?._id || "")
							? false
							: previous.inventoryLoading,
					currentInventory:
						String(previous.reservation?._id || "") === String(reservation?._id || "")
							? []
							: previous.currentInventory,
				}));
			});
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

		setConfirmModal({
			open: true,
			reservation,
			inventoryLoading: true,
			currentInventory: [],
		});
		loadConfirmInventory(reservation);
	};

	const closeConfirmModal = () => {
		if (confirmingReservationId) return;
		setConfirmModal({
			open: false,
			reservation: null,
			inventoryLoading: false,
			currentInventory: [],
		});
	};

	const submitConfirmPendingReservation = () => {
		const reservation = confirmModal.reservation;
		const actorId = currentUser?._id || userId;
		if (!reservation?._id || !actorId) {
			message.error(labels.updateError);
			return;
		}
		setConfirmingReservationId(String(reservation._id));
		updatePendingConfirmationReservation({
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
				setConfirmModal({
					open: false,
					reservation: null,
					inventoryLoading: false,
					currentInventory: [],
				});
			})
			.catch((error) => {
				message.error(error?.message || labels.updateError);
			})
			.finally(() => setConfirmingReservationId(""));
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

	const confirmModalReservation = confirmModal.reservation || {};
	const confirmModalStayLength = getStayLength(confirmModalReservation);

	return (
		<OverallPageShell $isRTL={isRTL}>
			<OverallCenteredSearch $isRTL={isRTL}>
				<Input
					allowClear
					size='large'
					className='overall-centered-search-input'
					value={filters.search}
					onChange={(event) => updateFilter("search", event.target.value)}
					placeholder={labels.searchReservationPlaceholder}
					aria-label={labels.searchReservationPlaceholder}
					dir={isRTL ? "rtl" : "ltr"}
				/>
			</OverallCenteredSearch>

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
					value={filters.status}
					onChange={(value) => updateFilter("status", value)}
					placeholder={labels.allStatuses}
					optionFilterProp='label'
					options={pendingStatusOptions(labels)}
				/>
				<Select
					showSearch
					className='overall-filter-select'
					popupClassName={`overall-filter-dropdown ${isRTL ? "rtl" : "ltr"}`}
					direction={isRTL ? "rtl" : "ltr"}
					value={filters.dateBy}
					onChange={(value) => updateFilter("dateBy", value || "createdAt")}
					placeholder={labels.dateByLabel}
					optionFilterProp='label'
					options={dateByOptions(labels)}
					aria-label={labels.dateByLabel}
				/>
				<DatePicker
					allowClear
					inputReadOnly
					size='middle'
					format='YYYY-MM-DD'
					className='overall-date-picker'
					value={toDatePickerValue(filters.dateFrom)}
					onChange={(_, dateString) => updateDateFilter("dateFrom", dateString)}
					disabledDate={disabledStartDate}
					placeholder={labels.fromDate}
					getPopupContainer={() => document.body}
					popupStyle={{ zIndex: 2100 }}
				/>
				<DatePicker
					allowClear
					inputReadOnly
					size='middle'
					format='YYYY-MM-DD'
					className='overall-date-picker'
					value={toDatePickerValue(filters.dateTo)}
					onChange={(_, dateString) => updateDateFilter("dateTo", dateString)}
					disabledDate={disabledEndDate}
					placeholder={labels.toDate}
					getPopupContainer={() => document.body}
					popupStyle={{ zIndex: 2100 }}
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
							search: "",
							hotelId: [],
							status: [],
							dateBy: "createdAt",
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
									<td className='date-cell'>{dateCell(reservation.booked_at || reservation.createdAt)}</td>
									<td className='date-cell'>{dateCell(reservation.checkin_date)}</td>
									<td className='date-cell'>{dateCell(reservation.checkout_date)}</td>
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

			<Modal
				open={confirmModal.open}
				onCancel={closeConfirmModal}
				title={labels.confirmTitle}
				footer={null}
				destroyOnClose
				width={680}
				className={PENDING_REVIEW_MODAL_CLASS}
			>
				<ConfirmModalBody dir={isRTL ? "rtl" : "ltr"} $isRTL={isRTL}>
					<ConfirmQuestion>
						{labels.confirmQuestion
							.replace(
								"{confirmation}",
								confirmModalReservation.confirmation_number ||
									confirmModalReservation._id ||
									"-"
							)
							.replace("{days}", confirmModalStayLength.days)
							.replace("{nights}", confirmModalStayLength.nights)
							.replace("{amount}", formatMoney(confirmModalReservation.total_amount))}
					</ConfirmQuestion>
					<PendingReservationInventoryBrief
						reservation={confirmModalReservation}
						currentInventory={confirmModal.currentInventory}
						loading={confirmModal.inventoryLoading}
						isArabic={isRTL}
					/>
					<ConfirmModalActions>
						<Button htmlType='button' onClick={closeConfirmModal}>
							{labels.cancel}
						</Button>
						<Button
							htmlType='button'
							className='primary-confirm'
							disabled={!confirmModalReservation?._id}
							loading={
								String(confirmingReservationId) ===
								String(confirmModalReservation?._id || "")
							}
							onClick={submitConfirmPendingReservation}
						>
							{String(confirmingReservationId) ===
							String(confirmModalReservation?._id || "")
								? labels.saving
								: labels.yesConfirm}
						</Button>
					</ConfirmModalActions>
				</ConfirmModalBody>
			</Modal>

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

const ConfirmModalBody = styled.div`
	display: grid;
	gap: 12px;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};
`;

const ConfirmQuestion = styled.div`
	padding: 11px 12px;
	border: 1px solid #d9e9fa;
	border-radius: 8px;
	background: #f6fbff;
	color: #172c43;
	font-size: 0.95rem;
	font-weight: 850;
	line-height: 1.6;
	text-align: center;
`;

const ConfirmModalActions = styled.div`
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	flex-wrap: wrap;

	.primary-confirm {
		border-color: #53115f;
		background: #53115f;
		color: #fff;
		font-weight: 850;
	}

	.primary-confirm:hover,
	.primary-confirm:focus {
		border-color: #6e1b7b !important;
		background: #6e1b7b !important;
		color: #fff !important;
	}
`;
