import React, { useEffect, useMemo, useState } from "react";
import { DatePicker, Input, message, Select } from "antd";
import {
	BarChartOutlined,
	FileExcelOutlined,
	ReloadOutlined,
	SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useHistory, useLocation } from "react-router-dom";
import {
	exportOverallReservations,
	getOverallReservations,
	trackOverallReservationSummaryExport,
} from "../../apiAdmin";
import {
	buildOwnerParams,
	formatDateByCalendar,
	formatMoney,
	getReservationNights,
	getReservationPricePerDay,
	getOverallText,
	localizeStatus,
	normalizeId,
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
import ReservationSummaryModal, {
	buildReservationSummary,
	exportReservationSummaryWorkbook,
	summaryText,
} from "./ReservationSummaryModal";
import { downloadReservationWorkbook } from "./reservationExcelExport";

const RESERVATION_LIST_TEXT = {
	en: {
		reservationsList: "Reservations List",
	},
	ar: {
		reservationsList: "قائمة الحجوزات",
	},
};

const RESERVATION_FILTER_TEXT = {
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

const dateByOptions = (labels) => [
	{ value: "createdAt", label: labels.creationDate },
	{ value: "checkin_date", label: labels.checkinDate },
	{ value: "checkout_date", label: labels.checkoutDate },
];

const pageFromSearch = (search = "") =>
	Math.max(parseInt(new URLSearchParams(search || "").get("page"), 10) || 1, 1);

const toDatePickerValue = (value = "") => {
	if (!value) return null;
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed : null;
};

const summaryAuditRows = (reservations = []) =>
	(Array.isArray(reservations) ? reservations : []).slice(0, 1000).map((reservation) => ({
		_id: normalizeId(reservation._id),
		hotelId: normalizeId(reservation.hotelId),
		hotelName: reservation.hotelName || reservation.hotel?.hotelName || "",
		confirmation_number: reservation.confirmation_number || "",
		booking_source: reservation.booking_source || "",
		reservation_status: reservation.reservation_status || reservation.state || "",
		total_amount: reservation.total_amount,
		paid_amount: reservation.paid_amount,
		commission: reservation.commission,
		checkin_date: reservation.checkin_date,
		checkout_date: reservation.checkout_date,
		createdAt: reservation.createdAt,
	}));

const OverallReservationMain = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = {
		...common,
		...RESERVATION_LIST_TEXT[isRTL ? "ar" : "en"],
		...RESERVATION_FILTER_TEXT[isRTL ? "ar" : "en"],
	};
	const summaryLabels = summaryText(chosenLanguage);
	const history = useHistory();
	const location = useLocation();
	const [filters, setFilters] = useState({
		search: "",
		hotelId: [],
		status: [],
		dateBy: "createdAt",
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
	const [summaryOpen, setSummaryOpen] = useState(false);
	const [summaryRows, setSummaryRows] = useState([]);
	const [summaryLoading, setSummaryLoading] = useState(false);
	const [summaryExporting, setSummaryExporting] = useState(false);
	const [summaryDateBy, setSummaryDateBy] = useState("createdAt");

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			...filters,
			page,
			limit: OVERALL_PAGE_SIZE,
		}),
		[filters, ownerId, page]
	);

	const summaryParams = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			...filters,
			page: 1,
			exportAll: "true",
			sortBy: filters.sortBy || "createdAt",
			sortOrder: filters.sortOrder || "desc",
		}),
		[filters, ownerId]
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

	useEffect(() => {
		if (!summaryOpen || !userId || !token) return;
		setSummaryLoading(true);
		getOverallReservations(userId, token, summaryParams)
			.then((data) => {
				setSummaryRows(Array.isArray(data?.reservations) ? data.reservations : []);
			})
			.finally(() => setSummaryLoading(false));
	}, [summaryOpen, summaryParams, token, userId]);

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

	const openSummary = () => {
		setSummaryDateBy("createdAt");
		setSummaryOpen(true);
	};

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

	const handleExportSummary = async (summaryPayload = {}) => {
		const exportRows = Array.isArray(summaryPayload.reservations)
			? summaryPayload.reservations
			: summaryRows;
		const exportDateBy = summaryPayload.dateBy || summaryDateBy;
		const exportFilters = summaryPayload.filters || filters;
		if (!exportRows.length) {
			message.info(labels.noRowsToExport);
			return;
		}
		setSummaryExporting(true);
		try {
			const summary = buildReservationSummary({
				reservations: exportRows,
				dateBy: exportDateBy,
				chosenLanguage,
			});
			const hotelIds = [
				...new Set(
					exportRows
						.map((reservation) => normalizeId(reservation.hotelId))
						.filter(Boolean)
				),
			];
			const tracking = await trackOverallReservationSummaryExport(
				userId,
				token,
				{
					dataset: "overall_reservation_summary",
					format: "XLSX",
					dateBy: exportDateBy,
					hotelIds,
					totalRows: exportRows.length,
					filters: {
						...buildOwnerParams(ownerId),
						...exportFilters,
						summaryDateBy: exportDateBy,
					},
					summary: {
						totals: summary.totals,
						byDateRows: summary.dateRows.length,
						byBookingSourceRows: summary.sourceRows.length,
						byStatusRows: summary.statusRows.length,
						byRoomTypeRows: summary.roomTypeRows.length,
					},
					reservations: summaryAuditRows(exportRows),
				},
				buildOwnerParams(ownerId)
			);
			if (!tracking || tracking.error || !tracking.exportTracked) {
				throw new Error(tracking?.error || "Could not track export");
			}
			await exportReservationSummaryWorkbook({
				reservations: exportRows,
				dateBy: exportDateBy,
				filters: exportFilters,
				hotels,
				labels,
				chosenLanguage,
				filePrefix: "overall-reservation-summary",
			});
		} catch (error) {
			console.error(error);
			message.error(labels.exportFailed);
		} finally {
			setSummaryExporting(false);
		}
	};

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
					options={statusOptions(labels)
						.filter((option) => option.value)
						.map((option) => ({
							value: option.value,
							label: option.label,
						}))}
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
				<button type='submit'>
					<SearchOutlined />
					<span>{labels.search}</span>
				</button>
				<button
					type='button'
					className='secondary'
					disabled={exporting}
					onClick={handleExportExcel}
				>
					<FileExcelOutlined />
					<span>{exporting ? labels.exportingExcel : labels.exportExcel}</span>
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
							sortOrder: "desc",
						});
						setPage(1);
					}}
				>
					<ReloadOutlined />
					<span>{labels.reset}</span>
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
				<div className='summary-control'>
					<button
						type='button'
						className='summary-trigger'
						onClick={openSummary}
					>
						<BarChartOutlined />
						<span>{summaryLabels.showSummary}</span>
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

			<ReservationSummaryModal
				open={summaryOpen}
				onClose={() => setSummaryOpen(false)}
				reservations={summaryRows}
				loading={summaryLoading}
				exporting={summaryExporting}
				filters={filters}
				hotels={hotels}
				labels={labels}
				chosenLanguage={chosenLanguage}
				summaryDateBy={summaryDateBy}
				onSummaryDateByChange={setSummaryDateBy}
				onExport={handleExportSummary}
			/>

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
