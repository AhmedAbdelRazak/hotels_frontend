import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled, { createGlobalStyle } from "styled-components";
import {
	Alert,
	Button,
	Card,
	DatePicker,
	Modal,
	Progress,
	Select,
	Spin,
	Switch,
	Tag,
	Tooltip,
} from "antd";
import dayjs from "dayjs";
import moment from "moment-hijri";
import { isAuthenticated } from "../../auth";
import ReservationDetail from "../../HotelModule/ReservationsFolder/ReservationDetail";
import MoreDetails from "../AllReservation/MoreDetails";
import {
	getHotelOccupancyCalendar,
	getHotelOccupancyDayReservations,
	getHotelOccupancyWarnings,
	gettingHotelDetailsForAdmin,
} from "../apiAdmin";
import WarningsModal from "./WarningsModal";

const { Option } = Select;

const heatColor = (rate = 0) => {
	const clamped = Math.min(Math.max(rate, 0), 1);
	const start = [230, 245, 241]; // very light mint
	const end = [0, 140, 115]; // deep teal
	const mix = start.map((s, i) => Math.round(s + (end[i] - s) * clamped));
	return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
};

const extractHotels = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (payload?.hotels && Array.isArray(payload.hotels)) return payload.hotels;
	const firstArray = Object.values(payload || {}).find(Array.isArray);
	return firstArray || [];
};

const hijriMonthsEn = [
	"Muharram",
	"Safar",
	"Rabi Al-Awwal",
	"Rabi Al-Thani",
	"Jumada Al-Awwal",
	"Jumada Al-Thani",
	"Rajab",
	"Sha'ban",
	"Ramadan",
	"Shawwal",
	"Dhul-Qadah",
	"Dhul-Hijjah",
];

const shortLabel = (label = "") => {
	const words = label.split(/\s+/).filter(Boolean);
	return words.slice(0, 3).join(" ");
};

const HotelsInventoryMap = () => {
	const ModalZFix = createGlobalStyle`
		.day-details-modal .ant-modal,
		.reservation-details-modal .ant-modal {
			z-index: 4001 !important;
		}
		.day-details-modal .ant-modal-mask,
		.reservation-details-modal .ant-modal-mask {
			z-index: 4000 !important;
		}
	`;

	const { user, token } = isAuthenticated() || {};
	const supportsHijri =
		typeof moment.fn?.iMonth === "function" &&
		typeof moment.fn?.iYear === "function";
	const nowHijri = supportsHijri ? moment() : null;
	const defaultHijriMonth = supportsHijri ? nowHijri.iMonth() : 0;
	const defaultHijriYear = supportsHijri
		? nowHijri.iYear()
		: new Date().getFullYear();
	const defaultHijriStart = supportsHijri
		? nowHijri.clone().startOf("iMonth")
		: null;
	const defaultHijriEnd = supportsHijri
		? nowHijri.clone().endOf("iMonth")
		: null;

	const [allHotels, setAllHotels] = useState([]);
	const [selectedHotelId, setSelectedHotelId] = useState("");
	const [monthValue, setMonthValue] = useState(() =>
		defaultHijriStart
			? dayjs(defaultHijriStart.toDate())
			: dayjs().startOf("month")
	);
	const [calendarType, setCalendarType] = useState(
		defaultHijriStart ? "hijri" : "gregorian"
	); // gregorian | hijri
	const [hijriMonth, setHijriMonth] = useState(defaultHijriMonth);
	const [hijriYear, setHijriYear] = useState(defaultHijriYear);
	const [rangeOverride, setRangeOverride] = useState(() =>
		defaultHijriStart
			? {
					start: defaultHijriStart.toISOString(),
					end: defaultHijriEnd?.toISOString(),
					label: `${hijriMonthsEn[defaultHijriMonth]} ${defaultHijriYear}`,
			  }
			: null
	); // {start,end,label}
	const [includeCancelled, setIncludeCancelled] = useState(false);
	const [displayMode, setDisplayMode] = useState("displayName"); // roomType | displayName

	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [warningsModalOpen, setWarningsModalOpen] = useState(false);
	const [warningsLoading, setWarningsLoading] = useState(false);
	const [warningsData, setWarningsData] = useState([]);
	const [dayDetailsOpen, setDayDetailsOpen] = useState(false);
	const [dayDetailsLoading, setDayDetailsLoading] = useState(false);
	const [dayDetails, setDayDetails] = useState(null);
	const [dayDetailsError, setDayDetailsError] = useState("");
	const [detailsModalOpen, setDetailsModalOpen] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);

	const getPaymentStatusStyles = (status = "") => {
		const s = status.toLowerCase();
		if (s === "captured") return { backgroundColor: "var(--badge-bg-green)" };
		if (s === "paid offline")
			return { backgroundColor: "var(--accent-color-dark-green)", color: "#fff" };
		if (s === "not captured")
			return { backgroundColor: "var(--background-accent-yellow)" };
		return { backgroundColor: "var(--background-light)" };
	};

	const getReservationStatusStyles = (status = "") => {
		const s = (status || "").toLowerCase();
		if (s === "confirmed")
			return { backgroundColor: "var(--background-light)", color: "inherit" };
		if (s === "inhouse")
			return {
				backgroundColor: "var(--background-accent-yellow)",
				color: "inherit",
			};
		if (s === "checked_out" || s === "early_checked_out")
			return { backgroundColor: "var(--badge-bg-green)", color: "inherit" };
		if (s === "no_show")
			return { backgroundColor: "var(--accent-color-orange)", color: "inherit" };
		if (s === "cancelled")
			return {
				backgroundColor: "var(--badge-bg-red)",
				color: "var(--button-font-color)",
			};
		return {};
	};

	const sortedHotels = useMemo(() => {
		const hotels = Array.isArray(allHotels) ? allHotels : [];
		return hotels
			.map((h) => ({
				_id: h?._id,
				hotelName: h?.hotelName || "",
			}))
			.filter((h) => h._id && h.hotelName)
			.sort((a, b) =>
				a.hotelName.localeCompare(b.hotelName, undefined, {
					sensitivity: "base",
				})
			);
	}, [allHotels]);

	const roomTypes = data?.roomTypes || [];
	const days = data?.days || [];
	const summary = data?.summary || {};
	const hijriAvailable = supportsHijri;
	const paymentBreakdown = summary?.paymentBreakdown || [];
	const totalAmount = summary?.totalAmount || 0;
	const totalRoomsAll = summary?.totalRoomsAll || summary?.totalRooms || 0; // capacity units (rooms or beds)
	const totalPhysicalRooms = summary?.totalPhysicalRooms || 0; // raw room count before beds multiplication
	const capacityRoomNights =
		(summary.availableRoomNights || 0) + (summary.soldRoomNights || 0);

	const formatInt = (val = 0) => Number(val || 0).toLocaleString("en-US");
	const formatCurrency = (val = 0) =>
		Number(val || 0).toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});

	const paymentLabel = (status, label) => {
		if (label) return label;
		const normalized = String(status || "").toLowerCase();
		if (normalized === "paid online") return "Paid Online";
		if (normalized === "paid offline") return "Paid Offline";
		if (normalized === "not paid") return "Not Paid";
		if (normalized === "credit / debit") return "Credit / Debit";
		return "Not Captured";
	};

	const reservationPaymentStatus = (reservation = {}) => {
		const paymentRaw = String(reservation.payment || "").toLowerCase();
		const onsitePaid =
			Number(reservation?.payment_details?.onsite_paid_amount || 0) > 0;
		const captured =
			reservation?.payment_details?.captured === true ||
			paymentRaw === "paid online";

		if (captured) return "Captured";
		if (paymentRaw === "paid offline" || onsitePaid) return "Paid Offline";
		if (paymentRaw === "not paid") return "Not Paid";
		return "Not Captured";
	};

	const loadHotels = useCallback(() => {
		if (!user?._id || !token) return;
		gettingHotelDetailsForAdmin(user._id, token)
			.then((res) => setAllHotels(extractHotels(res)))
			.catch(() => setAllHotels([]));
	}, [token, user?._id]);

	useEffect(() => {
		loadHotels();
	}, [loadHotels]);

	const fetchOccupancy = useCallback(async () => {
		if (!user?._id || !token || !selectedHotelId) return;
		setLoading(true);
		setError("");
		try {
			const payload = await getHotelOccupancyCalendar(user._id, token, {
				hotelId: selectedHotelId,
				month: rangeOverride ? null : monthValue.format("YYYY-MM"),
				start: rangeOverride?.start,
				end: rangeOverride?.end,
				includeCancelled,
				display: displayMode,
			});
			setData(payload);
		} catch (err) {
			setError(err?.message || "Failed to load occupancy");
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [
		displayMode,
		includeCancelled,
		monthValue,
		rangeOverride,
		selectedHotelId,
		token,
		user?._id,
	]);

	useEffect(() => {
		fetchOccupancy();
	}, [fetchOccupancy]);

	const onMonthChange = (val) => {
		if (val) {
			setMonthValue(val.startOf("month"));
			setRangeOverride(null);
		}
	};

	const onHijriChange = (nextMonth, nextYear) => {
		if (!supportsHijri) return;

		const hStart = moment().iYear(nextYear).iMonth(nextMonth).startOf("iMonth");
		const hEnd = moment().iYear(nextYear).iMonth(nextMonth).endOf("iMonth");
		setHijriMonth(nextMonth);
		setHijriYear(nextYear);
		setRangeOverride({
			start: hStart.toISOString(),
			end: hEnd.toISOString(),
			label: `${hijriMonthsEn[nextMonth]} ${nextYear}`,
		});
		setMonthValue(dayjs(hStart.toDate()));
	};

	const monthLabel = useMemo(() => {
		if (rangeOverride?.label) return `Hijri: ${rangeOverride.label}`;
		return `Gregorian: ${monthValue.format("MMMM YYYY")}`;
	}, [monthValue, rangeOverride]);
	const firstWarning = summary?.warnings?.[0];

	const fetchWarnings = useCallback(async () => {
		if (!user?._id || !token || !selectedHotelId) return;
		setWarningsLoading(true);
		try {
			const payload = await getHotelOccupancyWarnings(user._id, token, {
				hotelId: selectedHotelId,
				month: rangeOverride ? null : monthValue.format("YYYY-MM"),
				start: rangeOverride?.start,
				end: rangeOverride?.end,
				includeCancelled,
				display: displayMode,
			});
			setWarningsData(payload?.warnings || []);
		} catch (err) {
			setWarningsData([]);
		} finally {
			setWarningsLoading(false);
		}
	}, [
		displayMode,
		includeCancelled,
		monthValue,
		rangeOverride,
		selectedHotelId,
		token,
		user?._id,
	]);

	useEffect(() => {
		if (warningsModalOpen) {
			fetchWarnings();
		}
	}, [fetchWarnings, warningsModalOpen]);

	const fetchDayDetails = useCallback(
		async ({ date, roomType }) => {
			if (!user?._id || !token || !selectedHotelId || !date) return;
			setDayDetailsOpen(true);
			setDayDetailsLoading(true);
			setDayDetailsError("");
			try {
				const payload = await getHotelOccupancyDayReservations(
					user._id,
					token,
					{
						hotelId: selectedHotelId,
						date,
						roomKey: roomType?.key,
						roomLabel: roomType?.label,
						includeCancelled,
						display: displayMode,
					}
				);
				setDayDetails(payload);
			} catch (err) {
				setDayDetails({
					date,
					roomKey: roomType?.key || null,
					roomLabel: roomType?.label || roomType?.key || "All room types",
					hotel: data?.hotel,
					capacity: roomType?.totalRooms ?? totalRoomsAll ?? 0,
					booked: 0,
					overbooked: false,
					overage: 0,
					reservations: [],
				});
				setDayDetailsError(
					err?.message || "Failed to load reservations for this day."
				);
			} finally {
				setDayDetailsLoading(false);
			}
		},
		[
			data?.hotel,
			displayMode,
			includeCancelled,
			selectedHotelId,
			token,
			totalRoomsAll,
			user?._id,
		]
	);

	return (
		<Wrapper>
			<ModalZFix />
			<ControlBar>
				<div className='control'>
					<label>Hotel</label>
					<Select
						showSearch
						style={{ minWidth: 220 }}
						value={selectedHotelId || undefined}
						onChange={(val) => setSelectedHotelId(val)}
						placeholder='Select a hotel'
						optionFilterProp='children'
						filterOption={(input, option) =>
							(option?.children || "")
								.toLowerCase()
								.includes(input.toLowerCase())
						}
					>
						{sortedHotels.map((h) => (
							<Option key={h._id} value={h._id}>
								{h.hotelName}
							</Option>
						))}
					</Select>
				</div>

				<div className='control'>
					<label>Calendar</label>
					<Select
						value={calendarType}
						onChange={(v) => {
							setCalendarType(v);
							if (v === "gregorian") {
								setRangeOverride(null);
								setMonthValue(dayjs().startOf("month"));
							} else {
								onHijriChange(hijriMonth, hijriYear);
							}
						}}
					>
						<Option value='gregorian'>Gregorian</Option>
						<Option value='hijri' disabled={!moment.fn?.iMonth}>
							Hijri
						</Option>
					</Select>
				</div>

				<div className='control month-picker'>
					<label>{calendarType === "hijri" ? "Hijri Month" : "Month"}</label>
					{calendarType === "hijri" && moment.fn?.iMonth ? (
						<div className='hijri-controls'>
							<Select
								value={hijriMonth}
								onChange={(v) => onHijriChange(Number(v), hijriYear)}
								style={{ minWidth: 150 }}
							>
								{hijriMonthsEn.map((m, idx) => (
									<Option key={m} value={idx}>
										{m}
									</Option>
								))}
							</Select>
							<Select
								value={hijriYear}
								onChange={(v) => onHijriChange(hijriMonth, Number(v))}
								style={{ width: 110 }}
							>
								{Array.from({ length: 6 }).map((_, idx) => {
									const base = moment().iYear();
									const y = base - 1 + idx;
									return (
										<Option key={y} value={y}>
											{y}
										</Option>
									);
								})}
							</Select>
							{rangeOverride?.start && (
								<span className='muted'>
									{dayjs(rangeOverride.start).format("YYYY-MM-DD")} -{" "}
									{dayjs(rangeOverride.end).format("YYYY-MM-DD")}
								</span>
							)}
						</div>
					) : (
						<div className='month-actions'>
							<DatePicker
								picker='month'
								value={monthValue}
								onChange={onMonthChange}
								allowClear={false}
							/>
							<Button
								size='small'
								onClick={() => setMonthValue(monthValue.subtract(1, "month"))}
							>
								Prev
							</Button>
							<Button
								size='small'
								onClick={() => setMonthValue(monthValue.add(1, "month"))}
							>
								Next
							</Button>
						</div>
					)}
				</div>

				<div className='control'>
					<label>Column labels</label>
					<Select
						value={displayMode}
						onChange={(v) => setDisplayMode(v)}
						style={{ minWidth: 160 }}
					>
						<Option value='displayName'>Display name (default)</Option>
						<Option value='roomType'>Room type (grouped)</Option>
					</Select>
				</div>

				<SwitchRow>
					<Switch
						size='small'
						checked={includeCancelled}
						onChange={(checked) => setIncludeCancelled(checked)}
					/>
					<span>Include cancelled / no-show</span>
				</SwitchRow>
			</ControlBar>

			{error && (
				<Alert
					type='error'
					message='Could not load occupancy data'
					description={error}
					showIcon
					style={{ marginBottom: 12 }}
				/>
			)}

			{loading ? (
				<Spin tip='Loading occupancy...' />
			) : !data ? (
				<Alert
					type='info'
					message='Select a hotel to view its occupancy map.'
					showIcon
				/>
			) : (
				<>
					<SummaryGrid>
						<Card size='small' title='Average Occupancy'>
							<Progress
								percent={Math.round((summary.averageOccupancyRate || 0) * 100)}
								status='active'
								strokeColor='#007f6b'
							/>
						</Card>
						<Card size='small' title='Room Nights'>
							<div className='metric'>
								<span>Sold</span>
								<b>{formatInt(summary.soldRoomNights || 0)}</b>
							</div>
							<div className='metric'>
								<span>Available</span>
								<b>{formatInt(summary.availableRoomNights || 0)}</b>
							</div>
							<div className='metric muted'>
								<span>Capacity</span>
								<b>{formatInt(capacityRoomNights)}</b>
							</div>
						</Card>
						<Card size='small' title='Room Counts'>
							<div className='metric'>
								<span>Inventory units</span>
								<b>{formatInt(totalRoomsAll)}</b>
							</div>
							<div className='metric muted'>
								<span>Physical rooms</span>
								<b>{formatInt(totalPhysicalRooms)}</b>
							</div>
						</Card>
						<Card size='small' title='Total Amount (SAR)'>
							<div className='metric'>
								<span>Gross</span>
								<b>{formatCurrency(totalAmount)}</b>
							</div>
						</Card>
						<Card size='small' title='Peak Day'>
							<div className='metric'>
								<span>{summary?.peakDay?.date || "n/a"}</span>
								<b>
									{Math.round((summary?.peakDay?.occupancyRate || 0) * 100)}%
								</b>
							</div>
						</Card>
						<Card
							size='small'
							title='Warnings'
							bodyStyle={{ cursor: firstWarning ? "pointer" : "default" }}
							onClick={() => firstWarning && setWarningsModalOpen(true)}
						>
							{firstWarning ? (
								<div className='warning single'>
									<Tag color='red'>Overbooked</Tag> {firstWarning.date} -{" "}
									{firstWarning.roomType} ({firstWarning.booked}/
									{firstWarning.capacity})
									{summary.warnings.length > 1 && (
										<span className='muted'>
											{" "}
											+{summary.warnings.length - 1} more
										</span>
									)}
								</div>
							) : (
								<span className='muted'>No overbooking detected</span>
							)}
						</Card>
					</SummaryGrid>

					<Card size='small' title='Occupancy by room type'>
						<TypeGrid>
							{(summary.occupancyByType || []).map((item) => (
								<div key={item.key} className='type-card'>
									<div className='type-title'>
										<Tooltip title={item.label}>
											{shortLabel(item.label)}
										</Tooltip>
									</div>
									<Progress
										percent={Math.round((item.occupancyRate || 0) * 100)}
										strokeColor={item.color || "#008c73"}
										size='small'
									/>
									<div className='type-meta muted'>
										{item.occupiedNights}/{item.capacityNights} nights used
									</div>
								</div>
							))}
						</TypeGrid>
					</Card>

					<Card
						size='small'
						title={
							<HeaderRow>
								<div className='card-title-text'>
									Day-over-day occupancy | {data?.hotel?.hotelName || ""} |{" "}
									{monthLabel}
								</div>
								<Legend>
									<div className='legend-swatch'>
										<span className='swatch low' /> <span>0-30%</span>
									</div>
									<div className='legend-swatch'>
										<span className='swatch mid' /> <span>30-70%</span>
									</div>
									<div className='legend-swatch'>
										<span className='swatch high' /> <span>70-100%</span>
									</div>
								</Legend>
							</HeaderRow>
						}
						extra={
							<span className='muted'>
								Cells show occupied / total & available; deeper green = fuller.
							</span>
						}
					>
						<TableWrapper>
							<table>
								<thead>
									<tr>
										<th style={{ width: 110 }}>Date</th>
										{roomTypes.map((rt) => (
											<th key={rt.key}>
												<Tooltip title={rt.label}>
													<span className='truncate'>
														{shortLabel(rt.label)}
													</span>
												</Tooltip>
											</th>
										))}
										<th>Total</th>
									</tr>
								</thead>
								<tbody>
									{days.map((day) => (
										<tr key={day.date}>
											<td className='sticky'>
												{hijriAvailable && (
													<div className='hijri-date'>
														{moment(day.date)
															.locale("en")
															.format("iD iMMMM iYYYY")}
													</div>
												)}
												<div>{day.date}</div>
											</td>
											{roomTypes.map((rt) => {
												const cell = day.rooms?.[rt.key] || {
													occupied: 0,
													available: rt.totalRooms,
													occupancyRate: 0,
													booked: 0,
												};
												const bookedDisplay =
													cell.booked ?? cell.occupied ?? 0;
												const availDisplay = Math.max(
													rt.totalRooms - (cell.booked ?? 0),
													0
												);
												const bg = heatColor(cell.occupancyRate);
												const textColor =
													cell.occupancyRate > 0.7 ? "#ffffff" : "#2a2a2a";
												const subColor =
													cell.occupancyRate > 0.7 ? "#e8f5f1" : "#777";
												return (
													<td
														key={`${day.date}-${rt.key}`}
														style={{ backgroundColor: bg }}
														className='clickable-cell'
														onClick={() =>
															fetchDayDetails({ date: day.date, roomType: rt })
														}
													>
														<div className='cell-top'>
															<span>
																{bookedDisplay}/{rt.totalRooms}
															</span>
															{cell.overbooked && (
																<Tag color='red' size='small'>
																	Over
																</Tag>
															)}
														</div>
														<div
															className='cell-bottom'
															style={{ color: textColor }}
														>
															<span
																className='muted'
																style={{ color: subColor }}
															>
																Avail {availDisplay}
															</span>
															<Tooltip
																title={`${Math.round(
																	(cell.occupancyRate || 0) * 100
																)}% booked`}
															>
																<span className='percent'>
																	{Math.round((cell.occupancyRate || 0) * 100)}%
																</span>
															</Tooltip>
														</div>
													</td>
												);
											})}
											<td
												className='total-col clickable-cell'
												onClick={() => fetchDayDetails({ date: day.date })}
											>
												<div className='cell-top'>
													{roomTypes.reduce(
														(sum, rt) =>
															sum + (day.rooms?.[rt.key]?.booked ?? 0),
														0
													)}
													/{summary.totalRooms || 0}
												</div>
												<div className='cell-bottom muted'>
													Avail{" "}
													{Math.max(
														(summary.totalRooms || 0) -
															roomTypes.reduce(
																(sum, rt) =>
																	sum +
																	(day.rooms?.[rt.key]?.booked ?? 0),
																0
															),
														0
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</TableWrapper>
					</Card>

					<Card size='small' title='Payment status breakdown'>
						<BreakdownTable>
							<table>
								<thead>
									<tr>
										<th>Status</th>
										<th>Reservations</th>
										<th>Total amount (SAR)</th>
										<th>Paid amount</th>
										<th>Onsite paid</th>
									</tr>
								</thead>
								<tbody>
									{paymentBreakdown.length ? (
										paymentBreakdown.map((pmt) => (
											<tr key={pmt.status}>
												<td>{paymentLabel(pmt.status, pmt.label)}</td>
												<td>{formatInt(pmt.count)}</td>
												<td>{formatCurrency(pmt.totalAmount)}</td>
												<td>{formatCurrency(pmt.paidAmount)}</td>
												<td>{formatCurrency(pmt.onsitePaidAmount)}</td>
											</tr>
										))
									) : (
										<tr>
											<td colSpan={5} className='empty'>
												No payment data in this range
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</BreakdownTable>
					</Card>
				</>
			)}
			<Modal
				title={`Reservations on ${dayDetails?.date || "selected day"}${
					dayDetails?.roomLabel ? ` | ${dayDetails.roomLabel}` : ""
				}`}
				open={dayDetailsOpen}
				onCancel={() => {
					setDayDetailsOpen(false);
					setDayDetailsError("");
				}}
				footer={null}
				width='95%'
				bodyStyle={{ padding: 12 }}
				style={{ top: 20, zIndex: 3000 }}
				maskStyle={{ backdropFilter: "blur(1px)", zIndex: 2999 }}
				zIndex={3000}
				wrapClassName='day-details-modal'
			>
				{dayDetailsLoading ? (
					<Spin tip='Loading reservations...' />
				) : (
					<>
						{dayDetailsError && (
							<Alert
								type='error'
								message='Unable to load reservations for this day'
								description={dayDetailsError}
								showIcon
								style={{ marginBottom: 8 }}
							/>
						)}
						{dayDetails && (
							<DetailsSummary>
								<div>
									<div className='label'>Hotel</div>
									<div className='value'>
										{dayDetails?.hotel?.hotelName ||
											data?.hotel?.hotelName ||
											"Selected hotel"}
									</div>
								</div>
								<div>
									<div className='label'>Date</div>
									<div className='value'>{dayDetails?.date || "n/a"}</div>
								</div>
								<div>
									<div className='label'>Room</div>
									<div className='value'>
										{dayDetails?.roomLabel || "All room types"}
									</div>
								</div>
								<div>
									<div className='label'>Booked / Capacity</div>
									<div className='value'>
										{formatInt(dayDetails?.booked || 0)} /{" "}
										{formatInt(dayDetails?.capacity || 0)}
										{dayDetails?.overbooked && (
											<Tag color='red' style={{ marginLeft: 6 }}>
												Over by {formatInt(dayDetails?.overage || 0)}
											</Tag>
										)}
									</div>
								</div>
							</DetailsSummary>
						)}
						{dayDetails?.reservations?.length ? (
							<DetailTableWrapper>
								<DetailTable>
									<thead>
										<tr>
											<th>#</th>
											<th>Confirmation</th>
											<th>Guest</th>
											<th>Phone</th>
											<th>Status</th>
											<th>Check-in</th>
											<th>Check-out</th>
											<th>Room Type</th>
											<th>Count</th>
											<th>Booking source</th>
											<th>Payment</th>
											<th>Total (SAR)</th>
											<th>Show Details</th>
										</tr>
									</thead>
									<tbody>
										{dayDetails.reservations.map((res, idx) => {
											const breakdownArray = Array.isArray(res?.roomBreakdown)
												? res.roomBreakdown
												: [];
											const roomLabelString = breakdownArray
												.map((rb) => rb?.label || rb?.key || "-")
												.join(", ");
											const roomCountString = breakdownArray
												.map((rb) => formatInt(rb?.count || 0))
												.join(", ");

											return (
												<tr
													key={
														res?._id ||
														res?.confirmation_number ||
														`${res?.date || ""}-${idx}`
													}
												>
													<td>{idx + 1}</td>
													<td>{res?.confirmation_number || "N/A"}</td>
													<td>{res?.customer_details?.name || "N/A"}</td>
													<td>{res?.customer_details?.phone || "N/A"}</td>
													<td style={getReservationStatusStyles(res?.reservation_status)}>
														{res?.reservation_status || "N/A"}
													</td>
													<td>
														{res?.checkin_date
															? dayjs(res.checkin_date).format("YYYY-MM-DD")
															: "N/A"}
													</td>
													<td>
														{res?.checkout_date
															? dayjs(res.checkout_date).format("YYYY-MM-DD")
															: "N/A"}
													</td>
													<td>{roomLabelString || "-"}</td>
													<td>{roomCountString || "-"}</td>
													<td>{res?.booking_source || "-"}</td>
													<td style={getPaymentStatusStyles(reservationPaymentStatus(res))}>
														{reservationPaymentStatus(res)}
													</td>
													<td>{formatCurrency(res?.total_amount || 0)}</td>
													<td>
														<Button
															size='small'
															onClick={() => {
																setSelectedReservation(res);
																setDetailsModalOpen(true);
															}}
														>
															Show Details
														</Button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</DetailTable>
							</DetailTableWrapper>
						) : (
							<div className='muted'>No reservations for this day.</div>
						)}
					</>
				)}
			</Modal>
			<WarningsModal
				open={warningsModalOpen}
				onClose={() => setWarningsModalOpen(false)}
				warnings={warningsData.length ? warningsData : summary?.warnings || []}
				loading={warningsLoading}
			/>
			<Modal
				open={detailsModalOpen}
				onCancel={() => {
					setDetailsModalOpen(false);
					setSelectedReservation(null);
				}}
				footer={null}
				className='float-right'
				width='95%'
				style={{ position: "absolute", left: "2.5%", top: "2%", zIndex: 3000 }}
				bodyStyle={{ padding: 0 }}
				maskStyle={{ backdropFilter: "blur(1px)", zIndex: 2999 }}
				zIndex={3000}
				wrapClassName='reservation-details-modal'
			>
				{selectedReservation && selectedReservation.hotelId ? (
					selectedReservation.hotelId.hotelName ? (
						<MoreDetails
							selectedReservation={{
								...selectedReservation,
								total_amount: selectedReservation.total_amount ?? 0,
								paid_amount: selectedReservation.paid_amount ?? 0,
								pickedRoomsType: selectedReservation.pickedRoomsType || [],
								customer_details: selectedReservation.customer_details || {},
								payment_details: selectedReservation.payment_details || {},
							}}
							hotelDetails={selectedReservation.hotelId}
							reservation={{
								...selectedReservation,
								total_amount: selectedReservation.total_amount ?? 0,
								paid_amount: selectedReservation.paid_amount ?? 0,
								pickedRoomsType: selectedReservation.pickedRoomsType || [],
								customer_details: selectedReservation.customer_details || {},
								payment_details: selectedReservation.payment_details || {},
							}}
							setReservation={setSelectedReservation}
						/>
					) : (
						<ReservationDetail
							reservation={selectedReservation}
							hotelDetails={selectedReservation.hotelId}
						/>
					)
				) : null}
			</Modal>
		</Wrapper>
	);
};

export default HotelsInventoryMap;

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;

	.metric {
		display: flex;
		justify-content: space-between;
		margin-bottom: 6px;
	}

	.warning {
		font-size: 12px;
		margin-bottom: 4px;
	}

	.warning.single {
		transition:
			transform 0.1s ease,
			color 0.1s ease;
	}

	.warning.single:hover {
		transform: translateX(2px);
		color: #006d5b;
	}

	.muted {
		color: #777;
		font-size: 12px;
	}
`;

const ControlBar = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 12px;
	align-items: center;

	.control {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.month-picker .month-actions,
	.hijri-controls {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		align-items: center;
	}
`;

const SwitchRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	justify-content: flex-start;
	font-size: 12px;
	color: #444;
`;

const SummaryGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 10px;
`;

const Legend = styled.div`
	display: flex;
	gap: 12px;
	align-items: center;
	flex-wrap: wrap;

	.legend-swatch {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #555;
	}

	.swatch {
		display: inline-block;
		width: 18px;
		height: 10px;
		border-radius: 6px;
	}
	.swatch.low {
		background: ${heatColor(0.1)};
	}
	.swatch.mid {
		background: ${heatColor(0.5)};
	}
	.swatch.high {
		background: ${heatColor(0.9)};
	}
`;

const HeaderRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	align-items: center;
	justify-content: space-between;

	.card-title-text {
		font-weight: 600;
	}
`;

const TableWrapper = styled.div`
	overflow-x: auto;

	table {
		width: 100%;
		table-layout: fixed;
		border-collapse: collapse;
		font-size: 12px;
	}

	th,
	td {
		border: 1px solid #f0f0f0;
		padding: 6px 4px;
		text-align: center;
		min-width: 90px;
		max-width: 140px;
		word-break: break-word;
		white-space: normal;
	}

	th {
		background: #f6f8f8;
		font-weight: 600;
	}

	.truncate {
		display: inline-block;
		max-width: 120px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sticky {
		position: sticky;
		left: 0;
		background: #fff;
		z-index: 1;
		min-width: 110px;
	}

	.cell-top {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-weight: 600;
	}

	.cell-bottom {
		display: flex;
		justify-content: space-between;
		margin-top: 4px;
	}

	.percent {
		font-weight: 600;
	}

	.total-col {
		background: #eef3f2;
		font-weight: 600;
	}

	.clickable-cell {
		cursor: pointer;
		transition:
			box-shadow 0.12s ease,
			transform 0.12s ease;
	}

	.clickable-cell:hover {
		box-shadow: inset 0 0 0 1px #0f7e6b;
		transform: translateY(-1px);
	}

	.hijri-date {
		font-weight: 700;
		color: #234f45;
	}
`;

const BreakdownTable = styled.div`
	overflow-x: auto;
	display: inline-block;
	min-width: 420px;
	max-width: 100%;

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	th,
	td {
		border: 1px solid #f0f0f0;
		padding: 6px 8px;
		text-align: left;
	}

	th {
		background: #f6f8f8;
		font-weight: 600;
	}

	.empty {
		text-align: center;
		color: #777;
	}
`;

const TypeGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 12px;

	.type-card {
		padding: 8px 10px;
		border: 1px solid #f0f0f0;
		border-radius: 8px;
		background: #fcfcfc;
	}

	.type-title {
		font-weight: 600;
		margin-bottom: 4px;
	}

	.type-meta {
		margin-top: 6px;
	}
`;

const DetailsSummary = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: 10px;
	margin-bottom: 12px;

	.label {
		color: #666;
		font-size: 12px;
	}

	.value {
		font-weight: 600;
	}
`;

const DetailTableWrapper = styled.div`
	overflow-x: auto;
`;

const DetailTable = styled.table`
	width: 100%;
	border-collapse: collapse;
	font-size: 12px;

	th,
	td {
		border: 1px solid #f0f0f0;
		padding: 6px 8px;
		text-align: left;
		white-space: nowrap;
	}

	th {
		background: #f6f8f8;
		font-weight: 600;
	}

	@media (max-width: 768px) {
		th,
		td {
			font-size: 11px;
		}
	}
`;
