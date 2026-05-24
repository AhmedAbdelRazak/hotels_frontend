import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { getOverallSummary } from "../../apiAdmin";
import {
	buildOwnerParams,
	formatMoney,
	getOverallText,
	localizeStatus,
	OverallCard,
	OverallCards,
	OverallHeader,
	OverallPageShell,
	OverallTableWrap,
	OverallToolbar,
	singleHotelRoute,
	StatusPill,
	statusTone,
	titleCase,
} from "../overallShared";

const SUMMARY_TEXT = {
	en: {
		title: "Overall Summary",
		subtitle: "All assigned properties in one operational view",
		today: "Today",
		yesterday: "Yesterday",
		last7: "Last 7 Days",
	},
	ar: {
		title: "الملخص العام",
		subtitle: "كل الفنادق المخصصة في واجهة تشغيلية واحدة",
		today: "اليوم",
		yesterday: "أمس",
		last7: "آخر 7 أيام",
	},
};

const OverallSummaryMain = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = { ...common, ...SUMMARY_TEXT[isRTL ? "ar" : "en"] };
	const history = useHistory();
	const [range, setRange] = useState("all");
	const [dateBy, setDateBy] = useState("createdAt");
	const [loading, setLoading] = useState(false);
	const [summary, setSummary] = useState(null);

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			range,
			dateBy,
		}),
		[dateBy, ownerId, range]
	);

	useEffect(() => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallSummary(userId, token, params)
			.then((data) => {
				setSummary(data && !data.error ? data : null);
			})
			.finally(() => setLoading(false));
	}, [params, token, userId]);

	const stats = summary?.stats || {};
	const hotels = Array.isArray(summary?.hotels) ? summary.hotels : [];
	const rangeOptions = [
		{ value: "today", label: labels.today },
		{ value: "yesterday", label: labels.yesterday },
		{ value: "last7", label: labels.last7 },
		{ value: "all", label: labels.all },
	];
	const dateByOptions = [
		{ value: "createdAt", label: labels.createdAt },
		{ value: "checkin_date", label: labels.checkIn },
		{ value: "checkout_date", label: labels.checkOut },
	];
	const openHotel = (hotel = {}, section = "dashboard") => {
		const route = singleHotelRoute(hotel.ownerId || ownerId, hotel._id, section);
		if (route) history.push(route);
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
					getOverallSummary(userId, token, params).then((data) =>
						setSummary(data && !data.error ? data : null)
					);
				}}
			>
				<select value={range} onChange={(event) => setRange(event.target.value)}>
					{rangeOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				<select value={dateBy} onChange={(event) => setDateBy(event.target.value)}>
					{dateByOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				<button type='submit'>{labels.refresh}</button>
			</OverallToolbar>

			<OverallCards>
				<OverallCard>
					<strong>{loading ? "..." : Number(stats.totalHotels || 0)}</strong>
					<span>{labels.hotels}</span>
				</OverallCard>
				<OverallCard>
					<strong>{loading ? "..." : Number(stats.totalRooms || 0)}</strong>
					<span>{labels.totalRooms}</span>
				</OverallCard>
				<OverallCard>
					<strong>{loading ? "..." : Number(stats.availableRooms || 0)}</strong>
					<span>{labels.availableRooms}</span>
				</OverallCard>
				<OverallCard>
					<strong>{loading ? "..." : Number(stats.totalReservations || 0)}</strong>
					<span>{labels.reservations}</span>
				</OverallCard>
				<OverallCard>
					<strong>{loading ? "..." : formatMoney(stats.totalAmount)}</strong>
					<span>{labels.totalAmount}</span>
				</OverallCard>
				<OverallCard>
					<strong>{loading ? "..." : Number(stats.pendingReservations || 0)}</strong>
					<span>{labels.pending}</span>
				</OverallCard>
			</OverallCards>

			<OverallTableWrap>
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>{labels.hotel}</th>
							<th>{labels.rooms}</th>
							<th>{labels.available}</th>
							<th>{labels.occupied}</th>
							<th>{labels.reservations}</th>
							<th>{labels.total}</th>
							<th>{labels.pending}</th>
							<th>{labels.housekeeping}</th>
							<th>{labels.settings}</th>
							<th>{labels.singleHotel}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='11'>{labels.loading}</td>
							</tr>
						) : hotels.length ? (
							hotels.map((hotel, index) => (
								<tr key={hotel._id}>
									<td>{index + 1}</td>
									<td>
										<button
											type='button'
											className='link-btn'
											onClick={() => openHotel(hotel)}
										>
											{titleCase(hotel.hotelName)}
										</button>
									</td>
									<td>{hotel.totalRooms}</td>
									<td>{hotel.availableRooms}</td>
									<td>{hotel.occupiedRooms}</td>
									<td>{hotel.totalReservations}</td>
									<td>
										{formatMoney(hotel.totalAmount)} {labels.sar}
									</td>
									<td>{hotel.pendingReservations}</td>
									<td>{hotel.openHousekeepingTasks}</td>
									<td>
										<StatusPill
											$tone={statusTone(
												hotel.setup?.settingsDone ? "ready" : "pending"
											)}
										>
											{localizeStatus(
												hotel.setup?.settingsDone ? "ready" : "pending",
												chosenLanguage
											)}
										</StatusPill>
									</td>
									<td>
										<button
											type='button'
											className='link-btn'
											onClick={() => openHotel(hotel, "dashboard")}
										>
											{labels.openDashboard}
										</button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan='11'>{labels.noHotelsFound}</td>
							</tr>
						)}
					</tbody>
				</table>
			</OverallTableWrap>
		</OverallPageShell>
	);
};

export default OverallSummaryMain;
