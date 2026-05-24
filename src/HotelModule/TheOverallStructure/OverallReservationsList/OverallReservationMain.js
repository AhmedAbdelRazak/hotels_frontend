import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import {
	exportOverallReservations,
	getOverallReservations,
} from "../../apiAdmin";
import {
	buildOwnerParams,
	formatDate,
	formatMoney,
	getOverallText,
	localizeStatus,
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
		hotelId: "",
		status: "",
		dateBy: "booked_at",
		dateFrom: "",
		dateTo: "",
		sortBy: "booked_at",
		sortOrder: "desc",
	});
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [result, setResult] = useState({ reservations: [], hotels: [], total: 0 });
	const [selectedReservation, setSelectedReservation] = useState(null);

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

	const updateFilter = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value }));
		setPage(1);
	};

	const openReservation = (reservation = {}) => {
		const route = reservationSingleHotelRoute(reservation, ownerId, "reservations");
		if (route) history.push(route);
	};

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
			sortBy: filters.sortBy || "booked_at",
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
					value={filters.status}
					onChange={(event) => updateFilter("status", event.target.value)}
				>
					{statusOptions(labels).map((option) => (
						<option key={option.value || "all"} value={option.value}>
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
							hotelId: "",
							status: "",
							dateBy: "booked_at",
							dateFrom: "",
							dateTo: "",
							sortBy: "booked_at",
							sortOrder: "desc",
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
							<th>{labels.payment}</th>
							<th>{labels.booked}</th>
							<th>{labels.checkIn}</th>
							<th>{labels.checkOut}</th>
							<th>{labels.total}</th>
							<th>{labels.paidAmount}</th>
							<th>{labels.moreDetails}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='13'>{labels.loading}</td>
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
									<td>{reservation.payment || "-"}</td>
									<td>{formatDate(reservation.booked_at || reservation.createdAt)}</td>
									<td>{formatDate(reservation.checkin_date)}</td>
									<td>{formatDate(reservation.checkout_date)}</td>
									<td>
										{formatMoney(reservation.total_amount)} {labels.sar}
									</td>
									<td>
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
								<td colSpan='13'>{labels.noReservationsFound}</td>
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

export default OverallReservationMain;
