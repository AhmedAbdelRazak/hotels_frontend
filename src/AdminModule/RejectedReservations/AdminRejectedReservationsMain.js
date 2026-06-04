/** @format */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Button, Input, Modal, Select, Spin, Tooltip, message } from "antd";
import {
	DownloadOutlined,
	EyeOutlined,
	ReloadOutlined,
	SearchOutlined,
	ShopOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import MoreDetails from "../AllReservation/MoreDetails";
import { isAuthenticated } from "../../auth";
import {
	exportAdminRejectedReservations,
	getAdminRejectedReservations,
	readUserId,
} from "../apiAdmin";
import { SUPER_USER_IDS } from "../utils/superUsers";

const PAGE_SIZE = 20;
const DATE_TYPES = new Set(["created", "checkin", "checkout"]);

const text = {
	English: {
		title: "Rejected Reservations",
		subtitle:
			"Platform admin queue for rejected reservations across all hotels.",
		refresh: "Refresh",
		export: "Export",
		searchPlaceholder:
			"Search confirmation, guest, phone, hotel, source, or rejection reason",
		allHotels: "All hotels",
		allSources: "All sources",
		dateBy: "Date by",
		noDate: "No date filter",
		created: "Created",
		checkin: "Check-in",
		checkout: "Check-out",
		from: "From",
		to: "To",
		clear: "Clear",
		totalRejected: "Rejected",
		rejectedToday: "Rejected today",
		hotelsWithRejections: "Hotels with rejections",
		rejectedValue: "Rejected value",
		hotelValue: "Hotel-visible value",
		hotel: "Hotel",
		confirmation: "Confirmation",
		guest: "Guest",
		source: "Source",
		type: "Type",
		reason: "Reason",
		rejectedAt: "Rejected at",
		checkIn: "Check in",
		checkOut: "Check out",
		nights: "Nights",
		total: "Total",
		details: "Open / fix",
		noRows: "No rejected reservations found.",
		page: "Page",
		of: "of",
		prev: "Prev",
		next: "Next",
	},
	Arabic: {
		title:
			"\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0631\u0641\u0648\u0636\u0629",
		subtitle:
			"\u0635\u0641\u062d\u0629 \u0625\u062f\u0627\u0631\u064a\u0629 \u0645\u0646\u0641\u0635\u0644\u0629 \u062a\u0639\u0631\u0636 \u0643\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0645\u0631\u0641\u0648\u0636\u0629 \u0644\u062c\u0645\u064a\u0639 \u0627\u0644\u0641\u0646\u0627\u062f\u0642.",
		refresh: "\u062a\u062d\u062f\u064a\u062b",
		export: "\u062a\u0635\u062f\u064a\u0631",
		searchPlaceholder:
			"\u0627\u0628\u062d\u062b \u0628\u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f \u0623\u0648 \u0627\u0644\u0636\u064a\u0641 \u0623\u0648 \u0627\u0644\u0641\u0646\u062f\u0642 \u0623\u0648 \u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636",
		allHotels: "\u0643\u0644 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		allSources: "\u0643\u0644 \u0627\u0644\u0645\u0635\u0627\u062f\u0631",
		dateBy: "\u062d\u0633\u0628 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
		noDate: "\u0628\u062f\u0648\u0646 \u0641\u0644\u062a\u0631 \u062a\u0627\u0631\u064a\u062e",
		created: "\u0627\u0644\u0625\u0646\u0634\u0627\u0621",
		checkin: "\u0627\u0644\u0648\u0635\u0648\u0644",
		checkout: "\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		from: "\u0645\u0646",
		to: "\u0625\u0644\u0649",
		clear: "\u0645\u0633\u062d",
		totalRejected:
			"\u0627\u0644\u0645\u0631\u0641\u0648\u0636\u0629",
		rejectedToday:
			"\u0645\u0631\u0641\u0648\u0636 \u0627\u0644\u064a\u0648\u0645",
		hotelsWithRejections:
			"\u0641\u0646\u0627\u062f\u0642 \u0628\u0647\u0627 \u0631\u0641\u0636",
		rejectedValue:
			"\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0631\u0641\u0648\u0636",
		hotelValue:
			"\u0642\u064a\u0645\u0629 \u064a\u0631\u0627\u0647\u0627 \u0627\u0644\u0641\u0646\u062f\u0642",
		hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
		confirmation: "\u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
		guest: "\u0627\u0644\u0636\u064a\u0641",
		source: "\u0627\u0644\u0645\u0635\u062f\u0631",
		type: "\u0627\u0644\u0646\u0648\u0639",
		reason: "\u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636",
		rejectedAt: "\u0648\u0642\u062a \u0627\u0644\u0631\u0641\u0636",
		checkIn: "\u0627\u0644\u0648\u0635\u0648\u0644",
		checkOut: "\u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
		nights: "\u0644\u064a\u0627\u0644\u064a",
		total: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
		details: "\u0641\u062a\u062d / \u062a\u0635\u062d\u064a\u062d",
		noRows:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u062c\u0648\u0632\u0627\u062a \u0645\u0631\u0641\u0648\u0636\u0629.",
		page: "\u0635\u0641\u062d\u0629",
		of: "\u0645\u0646",
		prev: "\u0627\u0644\u0633\u0627\u0628\u0642",
		next: "\u0627\u0644\u062a\u0627\u0644\u064a",
	},
};

const numberValue = (value) => {
	if (value === null || value === undefined || value === "") return 0;
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	const parsed = Number(String(value).replace(/,/g, "").trim());
	return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) =>
	numberValue(value).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const getReservationKey = (reservation = {}) =>
	String(reservation._id || reservation.id || "");

const formatDate = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "2-digit",
	}).format(date);
};

const csvCell = (value) => {
	const textValue = String(value ?? "");
	if (/[",\n]/.test(textValue)) {
		return `"${textValue.replace(/"/g, '""')}"`;
	}
	return textValue;
};

const hasAdminReservationAccess = (account = {}) => {
	if (!account || account.activeUser === false) return false;
	if (SUPER_USER_IDS.includes(String(account._id || ""))) return true;
	const roles = [
		Number(account.role),
		...(Array.isArray(account.roles) ? account.roles.map(Number) : []),
	];
	const accessTo = Array.isArray(account.accessTo)
		? account.accessTo.map((item) => String(item || "").trim())
		: [];
	return (
		roles.includes(1000) &&
		(accessTo.includes("HotelsReservations") ||
			accessTo.includes("AllReservations"))
	);
};

const AdminRejectedReservationsMain = ({ chosenLanguage }) => {
	const lang = chosenLanguage === "Arabic" ? "Arabic" : "English";
	const labels = text[lang];
	const isArabic = lang === "Arabic";
	const history = useHistory();
	const location = useLocation();
	const auth = isAuthenticated() || {};
	const { user: authUser, token } = auth;

	const [adminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [getUser, setGetUser] = useState(null);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [dataState, setDataState] = useState({
		data: [],
		totalDocuments: 0,
		totalPages: 1,
		scorecards: {},
		hotels: [],
		bookingSources: [],
	});

	const params = useMemo(
		() => new URLSearchParams(location.search || ""),
		[location.search]
	);
	const currentPage = Math.max(parseInt(params.get("page"), 10) || 1, 1);
	const searchTerm = params.get("search") || "";
	const activeHotelId = params.get("hotelId") || "";
	const activeBookingSource = params.get("bookingSource") || "";
	const dateType = DATE_TYPES.has(params.get("dateType"))
		? params.get("dateType")
		: "";
	const dateFrom = params.get("dateFrom") || "";
	const dateTo = params.get("dateTo") || "";
	const detailsReservationId = params.get("reservationId") || "";

	const replaceQuery = useCallback(
		(updates = {}) => {
			const next = new URLSearchParams(location.search || "");
			Object.entries(updates).forEach(([key, value]) => {
				if (value === undefined || value === null || value === "") {
					next.delete(key);
				} else {
					next.set(key, String(value));
				}
			});
			const search = next.toString();
			history.replace({
				pathname: location.pathname,
				search: search ? `?${search}` : "",
			});
		},
		[history, location.pathname, location.search]
	);

	const apiParams = useMemo(() => {
		const payload = {
			page: currentPage,
			limit: PAGE_SIZE,
			searchQuery: searchTerm,
			hotelId: activeHotelId,
			bookingSource: activeBookingSource,
			reservationId: detailsReservationId,
		};
		if (dateType === "created") {
			payload.createdFrom = dateFrom;
			payload.createdTo = dateTo;
		}
		if (dateType === "checkin") {
			payload.checkinFrom = dateFrom;
			payload.checkinTo = dateTo;
		}
		if (dateType === "checkout") {
			payload.checkoutFrom = dateFrom;
			payload.checkoutTo = dateTo;
		}
		return payload;
	}, [
		activeBookingSource,
		activeHotelId,
		currentPage,
		dateFrom,
		dateTo,
		dateType,
		detailsReservationId,
		searchTerm,
	]);

	useEffect(() => {
		if (!authUser?._id || !token) return;
		readUserId(authUser._id, token).then((userData) => {
			if (userData && !userData.error) setGetUser(userData);
		});
		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [authUser?._id, token]);

	useEffect(() => {
		if (!getUser) return;
		if (!hasAdminReservationAccess(getUser)) history.push("/");
	}, [getUser, history]);

	const loadReservations = useCallback(
		async ({ silent = false } = {}) => {
			if (!getUser?._id || !token || !hasAdminReservationAccess(getUser)) return;
			if (!silent) setLoading(true);
			const response = await getAdminRejectedReservations(
				getUser._id,
				token,
				apiParams
			);
			if (response?.success) {
				setDataState({
					data: Array.isArray(response.data) ? response.data : [],
					totalDocuments: Number(response.totalDocuments || 0),
					totalPages: Number(response.totalPages || 1),
					scorecards: response.scorecards || {},
					hotels: Array.isArray(response.hotels) ? response.hotels : [],
					bookingSources: Array.isArray(response.bookingSources)
						? response.bookingSources
						: [],
				});
			} else {
				message.error(
					response?.message ||
						response?.error ||
						"Could not load rejected reservations"
				);
				setDataState({
					data: [],
					totalDocuments: 0,
					totalPages: 1,
					scorecards: {},
					hotels: [],
					bookingSources: [],
				});
			}
			if (!silent) setLoading(false);
		},
		[apiParams, getUser, token]
	);

	useEffect(() => {
		loadReservations();
	}, [loadReservations]);

	const reservations = dataState.data || [];
	const totalPages = Math.max(
		Number(dataState.totalPages || Math.ceil(dataState.totalDocuments / PAGE_SIZE)),
		1
	);
	const selectedReservation = reservations.find(
		(reservation) => getReservationKey(reservation) === detailsReservationId
	);

	const updateFilter = (updates = {}) =>
		replaceQuery({ ...updates, page: 1, reservationId: "" });

	const openDetails = (reservation) =>
		replaceQuery({ reservationId: getReservationKey(reservation) });
	const closeDetails = () => replaceQuery({ reservationId: "" });

	const handleReservationUpdated = (updated) => {
		if (!updated) return;
		const updatedKey = getReservationKey(updated);
		setDataState((previous) => ({
			...previous,
			data: (previous.data || []).map((reservation) =>
				getReservationKey(reservation) === updatedKey
					? {
							...reservation,
							...updated,
							hotelId: updated.hotelId || reservation.hotelId,
							belongsTo: updated.belongsTo || reservation.belongsTo,
					  }
					: reservation
			),
		}));
		window.setTimeout(() => loadReservations({ silent: true }), 300);
	};

	const clearFilters = () =>
		replaceQuery({
			search: "",
			hotelId: "",
			bookingSource: "",
			dateType: "",
			dateFrom: "",
			dateTo: "",
			reservationId: "",
			page: 1,
		});

	const downloadExport = async () => {
		if (!getUser?._id || !token) return;
		setExporting(true);
		const response = await exportAdminRejectedReservations(
			getUser._id,
			token,
			{ ...apiParams, page: 1, limit: 5000, reservationId: "" }
		);
		setExporting(false);
		if (!response?.success) {
			message.error(
				response?.message ||
					response?.error ||
					"Could not export rejected reservations"
			);
			return;
		}
		const rows = Array.isArray(response.data) ? response.data : [];
		const header = [
			"Hotel",
			"Confirmation",
			"Guest",
			"Phone",
			"Source",
			"Type",
			"Reason",
			"Rejected At",
			"Check In",
			"Check Out",
			"Total",
		];
		const body = rows.map((row) =>
			[
				row.hotel_name,
				row.confirmation_number,
				row.customer_name,
				row.customer_phone,
				row.booking_source,
				row.rejection_label,
				row.rejection_reason,
				formatDate(row.rejected_at || row.updatedAt),
				formatDate(row.checkin_date),
				formatDate(row.checkout_date),
				numberValue(row.total_amount),
			].map(csvCell)
		);
		const csv = [header.map(csvCell), ...body].map((row) => row.join(",")).join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `rejected-reservations-${new Date()
			.toISOString()
			.slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<RejectedPageWrapper dir={isArabic ? "rtl" : "ltr"} show={collapsed}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{isArabic ? (
						<AdminNavbarArabic
							fromPage='RejectedReservations'
							AdminMenuStatus={adminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
						/>
					) : (
						<AdminNavbar
							fromPage='RejectedReservations'
							AdminMenuStatus={adminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
						/>
					)}
				</div>
				<main className='otherContentWrapper'>
					<QueueSurface>
						<QueueHeader>
							<div>
								<h1>{labels.title}</h1>
								<p>{labels.subtitle}</p>
							</div>
							<HeaderActions>
								<Button
									icon={<ReloadOutlined />}
									onClick={() => loadReservations()}
									loading={loading}
								>
									{labels.refresh}
								</Button>
								<Button
									icon={<DownloadOutlined />}
									onClick={downloadExport}
									loading={exporting}
								>
									{labels.export}
								</Button>
							</HeaderActions>
						</QueueHeader>

						<StatsGrid>
							<StatTile accent='#b91c1c'>
								<span>{labels.totalRejected}</span>
								<strong>
									{dataState.scorecards.totalRejected ||
										dataState.totalDocuments ||
										0}
								</strong>
							</StatTile>
							<StatTile accent='#d97706'>
								<span>{labels.rejectedToday}</span>
								<strong>{dataState.scorecards.rejectedToday || 0}</strong>
							</StatTile>
							<StatTile accent='#0f766e'>
								<span>{labels.hotelsWithRejections}</span>
								<strong>
									{dataState.scorecards.hotelsWithRejections || 0}
								</strong>
							</StatTile>
							<StatTile accent='#1d4ed8'>
								<span>{labels.rejectedValue}</span>
								<strong>{money(dataState.scorecards.clientTotal)} SAR</strong>
							</StatTile>
							<StatTile accent='#7c3aed'>
								<span>{labels.hotelValue}</span>
								<strong>
									{money(dataState.scorecards.hotelVisibleTotal)} SAR
								</strong>
							</StatTile>
						</StatsGrid>

						<FilterGrid>
							<Input.Search
								allowClear
								defaultValue={searchTerm}
								enterButton={<SearchOutlined />}
								placeholder={labels.searchPlaceholder}
								onSearch={(value) =>
									updateFilter({ search: value.trim() })
								}
							/>
							<Select
								value={activeHotelId || ""}
								onChange={(value) => updateFilter({ hotelId: value })}
								options={[
									{ value: "", label: labels.allHotels },
									...(dataState.hotels || []).map((hotel) => ({
										value: String(hotel._id || ""),
										label: `${hotel.hotelName || labels.hotel} (${hotel.count || 0})`,
									})),
								]}
							/>
							<Select
								value={activeBookingSource || ""}
								onChange={(value) =>
									updateFilter({ bookingSource: value })
								}
								options={[
									{ value: "", label: labels.allSources },
									...(dataState.bookingSources || []).map((source) => ({
										value: source.source,
										label: `${source.source} (${source.count || 0})`,
									})),
								]}
							/>
							<Select
								value={dateType || ""}
								onChange={(value) =>
									updateFilter({
										dateType: value,
										dateFrom: value ? dateFrom : "",
										dateTo: value ? dateTo : "",
									})
								}
								options={[
									{ value: "", label: labels.noDate },
									{ value: "created", label: labels.created },
									{ value: "checkin", label: labels.checkin },
									{ value: "checkout", label: labels.checkout },
								]}
							/>
							<DateControl>
								<span>{labels.from}</span>
								<input
									type='date'
									value={dateFrom}
									disabled={!dateType}
									onChange={(event) =>
										updateFilter({ dateFrom: event.target.value })
									}
								/>
							</DateControl>
							<DateControl>
								<span>{labels.to}</span>
								<input
									type='date'
									value={dateTo}
									disabled={!dateType}
									onChange={(event) =>
										updateFilter({ dateTo: event.target.value })
									}
								/>
							</DateControl>
							<Button onClick={clearFilters}>{labels.clear}</Button>
						</FilterGrid>

						{loading ? (
							<LoadingBlock>
								<Spin />
							</LoadingBlock>
						) : (
							<TableWrap>
								<table>
									<thead>
										<tr>
											<th>#</th>
											<th>{labels.hotel}</th>
											<th>{labels.confirmation}</th>
											<th>{labels.guest}</th>
											<th>{labels.source}</th>
											<th>{labels.type}</th>
											<th>{labels.reason}</th>
											<th>{labels.rejectedAt}</th>
											<th>{labels.checkIn}</th>
											<th>{labels.checkOut}</th>
											<th>{labels.nights}</th>
											<th>{labels.total}</th>
											<th>{labels.details}</th>
										</tr>
									</thead>
									<tbody>
										{reservations.length ? (
											reservations.map((reservation, index) => (
												<tr key={getReservationKey(reservation)}>
													<td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
													<td>
														<Tooltip title={reservation.hotel_name}>
															<span className='truncate with-icon'>
																<ShopOutlined />
																{reservation.hotel_name || "-"}
															</span>
														</Tooltip>
													</td>
													<td>{reservation.confirmation_number || "-"}</td>
													<td>
														<Tooltip title={reservation.customer_name}>
															<span className='truncate'>
																{reservation.customer_name || "-"}
															</span>
														</Tooltip>
													</td>
													<td>{reservation.booking_source || "-"}</td>
													<td>
														<TypePill type={reservation.rejection_type}>
															<WarningOutlined />
															{reservation.rejection_label || "-"}
														</TypePill>
													</td>
													<td>
														<Tooltip title={reservation.rejection_reason}>
															<span className='reason'>
																{reservation.rejection_reason || "-"}
															</span>
														</Tooltip>
													</td>
													<td>{formatDate(reservation.rejected_at || reservation.updatedAt)}</td>
													<td>{formatDate(reservation.checkin_date)}</td>
													<td>{formatDate(reservation.checkout_date)}</td>
													<td>{reservation.days_of_residence || "-"}</td>
													<td>{money(reservation.total_amount)} SAR</td>
													<td>
														<ActionButton
															type='button'
															onClick={() => openDetails(reservation)}
														>
															<EyeOutlined /> {labels.details}
														</ActionButton>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan='13'>{labels.noRows}</td>
											</tr>
										)}
									</tbody>
								</table>
							</TableWrap>
						)}

						<PaginationRow>
							<Button
								disabled={currentPage <= 1}
								onClick={() => replaceQuery({ page: currentPage - 1 })}
							>
								{labels.prev}
							</Button>
							<span>
								{labels.page} {currentPage} {labels.of} {totalPages}
							</span>
							<Button
								disabled={currentPage >= totalPages}
								onClick={() => replaceQuery({ page: currentPage + 1 })}
							>
								{labels.next}
							</Button>
						</PaginationRow>
					</QueueSurface>
				</main>
			</div>

			<Modal
				open={!!detailsReservationId && !!selectedReservation}
				onCancel={closeDetails}
				width='min(98vw, 1720px)'
				centered
				className='admin-reservation-details-modal reservation-details-modal'
				rootClassName='admin-reservation-details-layer'
				wrapClassName='admin-reservation-details-wrap'
				footer={null}
				destroyOnClose
				zIndex={12000}
				styles={{
					mask: { zIndex: 11999 },
					header: { display: "none" },
					content: { padding: "6px 8px 8px" },
					body: {
						maxHeight: "92vh",
						overflowY: "auto",
						padding: "0",
					},
				}}
			>
				{selectedReservation ? (
					<MoreDetails
						key={getReservationKey(selectedReservation)}
						selectedReservation={selectedReservation}
						hotelDetails={selectedReservation.hotelId}
						reservation={selectedReservation}
						setReservation={handleReservationUpdated}
						onReservationUpdated={handleReservationUpdated}
					/>
				) : null}
			</Modal>
		</RejectedPageWrapper>
	);
};

export default AdminRejectedReservationsMain;

const RejectedPageWrapper = styled.div`
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => {
			const nav = props.show ? "70px" : "285px";
			return props.dir === "rtl" ? `1fr ${nav}` : `${nav} 1fr`;
		}};
		grid-template-areas: ${(props) =>
			props.dir === "rtl" ? "'content nav'" : "'nav content'"};
	}

	.navcontent {
		grid-area: nav;
	}

	.otherContentWrapper {
		grid-area: content;
		min-width: 0;
		padding: 28px 18px;
		background: #f5f7fb;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "content";
		}

		.otherContentWrapper {
			padding: 18px 10px;
		}
	}
`;

const QueueSurface = styled.section`
	border: 1px solid #d7e5f6;
	border-radius: 8px;
	background: #ffffff;
	box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
	padding: 18px;
`;

const QueueHeader = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 16px;

	h1 {
		margin: 0;
		font-size: 24px;
		line-height: 1.25;
		color: #111827;
	}

	p {
		margin: 5px 0 0;
		color: #64748b;
		font-size: 13px;
		font-weight: 700;
	}

	@media (max-width: 720px) {
		flex-direction: column;
	}
`;

const HeaderActions = styled.div`
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	justify-content: flex-end;
`;

const StatsGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(5, minmax(145px, 1fr));
	gap: 10px;
	margin-bottom: 14px;

	@media (max-width: 1200px) {
		grid-template-columns: repeat(3, minmax(145px, 1fr));
	}

	@media (max-width: 720px) {
		grid-template-columns: 1fr;
	}
`;

const StatTile = styled.div`
	border: 1px solid #dbeafe;
	border-top: 4px solid ${(props) => props.accent || "#1d4ed8"};
	border-radius: 8px;
	background: #f8fafc;
	padding: 12px;

	span {
		display: block;
		color: #64748b;
		font-size: 12px;
		font-weight: 800;
	}

	strong {
		display: block;
		margin-top: 4px;
		color: #0f172a;
		font-size: 22px;
		line-height: 1.15;
		word-break: break-word;
	}
`;

const FilterGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(260px, 1.8fr) minmax(170px, 1fr) minmax(150px, 1fr) minmax(150px, 1fr) 150px 150px auto;
	gap: 8px;
	align-items: center;
	margin-bottom: 14px;

	@media (max-width: 1280px) {
		grid-template-columns: repeat(3, minmax(180px, 1fr));
	}

	@media (max-width: 720px) {
		grid-template-columns: 1fr;
	}
`;

const DateControl = styled.label`
	display: grid;
	grid-template-columns: 34px minmax(0, 1fr);
	align-items: center;
	gap: 6px;
	height: 32px;

	span {
		color: #475569;
		font-size: 12px;
		font-weight: 800;
	}

	input {
		width: 100%;
		height: 32px;
		border: 1px solid #d9d9d9;
		border-radius: 4px;
		padding: 0 8px;
		font-size: 13px;
		color: #0f172a;
	}

	input:disabled {
		background: #f1f5f9;
		color: #94a3b8;
	}
`;

const LoadingBlock = styled.div`
	min-height: 260px;
	display: flex;
	align-items: center;
	justify-content: center;
`;

const TableWrap = styled.div`
	overflow-x: auto;
	border: 1px solid #e2e8f0;
	border-radius: 8px;

	table {
		width: 100%;
		min-width: 1320px;
		border-collapse: collapse;
	}

	th {
		background: #102033;
		color: #ffffff;
		font-size: 12px;
		font-weight: 800;
		padding: 11px 10px;
		white-space: nowrap;
	}

	td {
		border-top: 1px solid #e2e8f0;
		padding: 10px;
		font-size: 12px;
		color: #1f2937;
		vertical-align: middle;
		white-space: nowrap;
	}

	.truncate,
	.reason {
		display: inline-block;
		max-width: 190px;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: bottom;
	}

	.with-icon {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.reason {
		max-width: 280px;
	}
`;

const TypePill = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 5px;
	min-width: 112px;
	height: 28px;
	padding: 0 10px;
	border-radius: 999px;
	background: ${(props) =>
		props.type === "finance"
			? "#eff6ff"
			: props.type === "commission"
			? "#f5f3ff"
			: "#fff7ed"};
	color: ${(props) =>
		props.type === "finance"
			? "#1d4ed8"
			: props.type === "commission"
			? "#6d28d9"
			: "#9a3412"};
	font-weight: 800;
`;

const ActionButton = styled.button`
	border: 0;
	background: transparent;
	color: #1d4ed8;
	font-weight: 800;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: 5px;
`;

const PaginationRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin-top: 16px;

	span {
		color: #334155;
		font-size: 13px;
		font-weight: 800;
	}
`;
