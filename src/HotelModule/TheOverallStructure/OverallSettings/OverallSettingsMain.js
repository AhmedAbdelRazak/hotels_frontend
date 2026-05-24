import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { getOverallSettings } from "../../apiAdmin";
import {
	buildOwnerParams,
	EmptyState,
	formatDate,
	getOverallText,
	localizeStatus,
	OverallHeader,
	OverallPageShell,
	OverallTableWrap,
	singleHotelRoute,
	StatusPill,
	statusTone,
	titleCase,
} from "../overallShared";

const SETTINGS_TEXT = {
	en: {
		title: "Overall Settings",
		subtitle: "Hotel readiness across the selected group",
	},
	ar: {
		title: "الإعدادات العامة",
		subtitle: "جاهزية الفنادق عبر المجموعة المحددة",
	},
};

const OverallSettingsMain = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = { ...common, ...SETTINGS_TEXT[isRTL ? "ar" : "en"] };
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const [rows, setRows] = useState([]);

	useEffect(() => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallSettings(userId, token, buildOwnerParams(ownerId))
			.then((data) => {
				setRows(Array.isArray(data?.hotels) ? data.hotels : []);
			})
			.finally(() => setLoading(false));
	}, [ownerId, token, userId]);

	const openSettings = (hotel = {}) => {
		const route = singleHotelRoute(hotel.ownerId || ownerId, hotel._id, "settings");
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

			{!loading && !rows.length ? (
				<EmptyState>{labels.noHotelsFound}</EmptyState>
			) : (
				<OverallTableWrap>
					<table>
						<thead>
							<tr>
								<th>#</th>
								<th>{labels.hotel}</th>
								<th>{labels.status}</th>
								<th>{labels.rooms}</th>
								<th>{labels.roomTypes}</th>
								<th>{labels.photos}</th>
								<th>{labels.location}</th>
								<th>{labels.data}</th>
								<th>{labels.bank}</th>
								<th>{labels.updated}</th>
								<th>{labels.singleHotel}</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan='11'>{labels.loading}</td>
								</tr>
							) : (
								rows.map((hotel, index) => (
									<tr key={hotel._id}>
										<td>{index + 1}</td>
										<td>
											<button
												type='button'
												className='link-btn'
												onClick={() => openSettings(hotel)}
											>
												{titleCase(hotel.hotelName)}
											</button>
										</td>
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
										<td>{Number(hotel.overallRoomsCount || 0)}</td>
										<td>{Number(hotel.roomTypes || 0)}</td>
										<td>{Number(hotel.photos || 0)}</td>
										<td>
											{localizeStatus(
												hotel.setup?.locationDone ? "done" : "pending",
												chosenLanguage
											)}
										</td>
										<td>
											{localizeStatus(
												hotel.setup?.dataDone ? "done" : "pending",
												chosenLanguage
											)}
										</td>
										<td>
											{localizeStatus(
												hotel.setup?.bankDone ? "done" : "pending",
												chosenLanguage
											)}
										</td>
										<td>{formatDate(hotel.updatedAt, chosenLanguage)}</td>
										<td>
											<button
												type='button'
												className='link-btn'
												onClick={() => openSettings(hotel)}
											>
												{labels.openSettings}
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</OverallTableWrap>
			)}
		</OverallPageShell>
	);
};

export default OverallSettingsMain;
