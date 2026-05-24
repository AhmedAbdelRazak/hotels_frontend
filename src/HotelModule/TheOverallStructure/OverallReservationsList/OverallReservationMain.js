import React, { useEffect, useMemo, useState } from "react";
import { message, Select } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import {
	exportOverallReservations,
	getOverallReservations,
} from "../../apiAdmin";
import {
	buildOwnerParams,
	formatDateByCalendar,
	formatMoney,
	getReservationNights,
	getReservationPricePerDay,
	getOverallText,
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

const RESERVATION_LIST_TEXT = {
	en: {
		reservationsList: "Reservations List",
	},
	ar: {
		reservationsList: "قائمة الحجوزات",
	},
};

const statusOptions = (labels) => [
	{ value: "", label: labels.allStatuses },
	{ value: "active", label: labels.active },
	{ value: "confirmed", label: labels.confirmed },
	{ value: "pending", label: labels.pending },
	{ value: "Pending Finance Review", label: labels.pendingFinanceReview },
	{ value: "InHouse", label: labels.inHouse },
	{ value: "Checked Out", label: labels.checkedOut },
	{ value: "cancelled", label: labels.cancelled },
	{ value: "no_show", label: labels.noShow },
];

const sortOptions = (labels) => [
	{ value: "createdAt", label: labels.createdAt },
	{ value: "booking_source", label: labels.source },
	{ value: "hotelName", label: labels.hotel },
	{ value: "checkin_date", label: labels.checkIn },
	{ value: "checkout_date", label: labels.checkOut },
];

const pageFromSearch = (search = "") =>
	Math.max(parseInt(new URLSearchParams(search || "").get("page"), 10) || 1, 1);

const OverallReservationMain = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = {
		...common,
		...RESERVATION_LIST_TEXT[isRTL ? "ar" : "en"],
	};
	const history = useHistory();
	const location = useLocation();
	const [filters, setFilters] = useState({
		search: "",
		hotelId: [],
		status: [],
		dateBy: "booked_at",
		dateFrom: "",
		dateTo: "",
		sortBy: "createdAt",
		sortOrder: "desc",
	});
	const [page, setPage] = useState(() => pageFromSearch(location.search));
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [result, setResult] = useState({ reservations: [], hotels: [], total: 0 });
	const [selectedReservation, setSelectedReservation] = useState(null);
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
		getOverallReservations(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { reservations: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	}, [params, token, userId]);

	const loadReservations = () => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallReservations(userId, token, params)
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
		loadReservations();
	};

	const handleExportExcel = () => {
		if (!userId || !token || exporting) return;
		setExporting(true);
		exportOverallReservations(userId, token, {
			...buildOwnerParams(ownerId),
			...filters,
			sortBy: filters.sortBy || "createdAt",
			sortOrder: filters.sortOrder || "desc",
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
					filePrefix: "overall-reservations",
				});
			})
			.catch(() => message.error(labels.exportFailed))
			.finally(() => setExporting(false));
	};

	return (
		<OverallPageShell $isRTL={isRTL}>
			<OverallHeader>
				<div>
					<h2>{labels.reservationsList}</h2>
				</div>
			</OverallHeader>

			<OverallToolbar
				onSubmit={(event) => {
					event.preventDefault();
					setPage(1);
				}}
			>
				<input
					value={filters.search}
					onChange={(event) => updateFilter("search", event.target.value)}
					placeholder={labels.searchReservationPlaceholder}
				/>
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
					options={statusOptions(labels)
						.filter((option) => option.value)
						.map((option) => ({
							value: option.value,
							label: option.label,
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
							search: "",
							hotelId: [],
							status: [],
							dateBy: "booked_at",
							dateFrom: "",
							dateTo: "",
							sortBy: "createdAt",
							sortOrder: "desc",
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
				<table className='reservation-list-table reservation-main-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>{sortableHeader(labels.hotel, "hotelName")}</th>
							<th>{labels.confirmation}</th>
							<th>{labels.guest}</th>
							<th>{sortableHeader(labels.source, "booking_source")}</th>
							<th>{labels.status}</th>
							<th>{labels.payment}</th>
							<th>{sortableHeader(labels.booked, "createdAt")}</th>
							<th>{sortableHeader(labels.checkIn, "checkin_date")}</th>
							<th>{sortableHeader(labels.checkOut, "checkout_date")}</th>
							<th>{labels.nights}</th>
							<th>{labels.pricePerDay}</th>
							<th>{labels.total}</th>
							<th>{labels.paidAmount}</th>
							<th>{labels.moreDetails}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='15'>{labels.loading}</td>
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
										<TableTooltipText value={reservation.payment || "-"} />
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
									<td className='amount-cell'>
										{formatMoney(reservation.paid_amount)} {labels.sar}
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
								<td colSpan='15'>{labels.noReservationsFound}</td>
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

export default OverallReservationMain;
