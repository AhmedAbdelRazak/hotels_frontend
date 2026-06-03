import React, { useCallback, useEffect, useState } from "react";
import {
	CalendarOutlined,
	EditOutlined,
	PlusCircleOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import { message } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { isAuthenticated } from "../../auth";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import { getAdminGlobalHotelSettings } from "../apiAdmin";
import {
	EmptyState,
	formatDate,
	getOverallText,
	localizeStatus,
	OverallTableWrap,
	singleHotelRoute,
	StatusPill,
	statusTone,
	titleCase,
} from "../../HotelModule/TheOverallStructure/overallShared";
import AdminGlobalCalendarPricingModal from "./AdminGlobalCalendarPricingModal";
import AdminGlobalRoomManagerModal from "./AdminGlobalRoomManagerModal";

const ADMIN_GLOBAL_MODAL_PARAM = "globalSettingsModal";
const ADMIN_GLOBAL_ROOM_TAB_PARAM = "globalSettingsRoomTab";
const ADMIN_GLOBAL_CALENDAR_TAB_PARAM = "globalSettingsCalendarTab";
const ROOM_MANAGER_MODAL_VALUE = "rooms";
const CALENDAR_PRICING_MODAL_VALUE = "calendar";

const normalizeRoomManagerTab = (value) =>
	value === "update" ? "update" : "add";
const normalizeCalendarPricingTab = (value) =>
	value === "agents" ? "agents" : "general";

const PAGE_TEXT = {
	en: {
		title: "Global Hotel Settings",
		subtitle: "All hotels across the platform",
		roomAction: "Room Add / Update",
		calendarAction: "Calendar Pricing",
		owner: "Owner",
		refresh: "Refresh",
	},
	ar: {
		title: "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0643\u0644 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		subtitle: "\u0643\u0644 \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629",
		roomAction:
			"\u0625\u0636\u0627\u0641\u0629 / \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u063a\u0631\u0641",
		calendarAction:
			"\u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u062a\u0642\u0648\u064a\u0645",
		owner: "\u0627\u0644\u0645\u0627\u0644\u0643",
		refresh: "\u062a\u062d\u062f\u064a\u062b",
	},
};

const AdminGlobalHotelSettingsMain = ({ chosenLanguage }) => {
	const isArabic = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = {
		...common,
		...PAGE_TEXT[isArabic ? "ar" : "en"],
	};
	const auth = isAuthenticated() || {};
	const userId = auth.user?._id || "";
	const token = auth.token || "";
	const history = useHistory();
	const location = useLocation();
	const query = new URLSearchParams(location.search || "");
	const roomManagerTabParam = query.get(ADMIN_GLOBAL_ROOM_TAB_PARAM);
	const roomModalOpen =
		query.get(ADMIN_GLOBAL_MODAL_PARAM) === ROOM_MANAGER_MODAL_VALUE;
	const roomManagerTab = normalizeRoomManagerTab(roomManagerTabParam);
	const calendarPricingTabParam = query.get(ADMIN_GLOBAL_CALENDAR_TAB_PARAM);
	const calendarPricingModalOpen =
		query.get(ADMIN_GLOBAL_MODAL_PARAM) === CALENDAR_PRICING_MODAL_VALUE;
	const calendarPricingTab = normalizeCalendarPricingTab(
		calendarPricingTabParam
	);
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [loading, setLoading] = useState(false);
	const [rows, setRows] = useState([]);
	const [total, setTotal] = useState(0);

	const loadSettings = useCallback(() => {
		if (!userId || !token) return;
		setLoading(true);
		getAdminGlobalHotelSettings(userId, token)
			.then((data) => {
				if (data?.error) {
					message.error(data.error);
					setRows([]);
					setTotal(0);
					return;
				}
				setRows(Array.isArray(data?.hotels) ? data.hotels : []);
				setTotal(Number(data?.total || data?.hotels?.length || 0));
			})
			.finally(() => setLoading(false));
	}, [token, userId]);

	useEffect(() => {
		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, []);

	useEffect(() => {
		loadSettings();
	}, [loadSettings]);

	const pushQuery = useCallback(
		(nextQuery, { replace = false } = {}) => {
			const nextSearch = nextQuery.toString();
			const nextLocation = {
				pathname: location.pathname,
				search: nextSearch ? `?${nextSearch}` : "",
			};
			if (replace) history.replace(nextLocation);
			else history.push(nextLocation);
		},
		[history, location.pathname]
	);

	const openRoomManager = useCallback(
		(nextTab = "add", { replace = false } = {}) => {
			const nextQuery = new URLSearchParams(location.search || "");
			if (!nextQuery.get("page")) nextQuery.set("page", "1");
			nextQuery.set(ADMIN_GLOBAL_MODAL_PARAM, ROOM_MANAGER_MODAL_VALUE);
			nextQuery.set(
				ADMIN_GLOBAL_ROOM_TAB_PARAM,
				normalizeRoomManagerTab(nextTab)
			);
			nextQuery.delete(ADMIN_GLOBAL_CALENDAR_TAB_PARAM);
			pushQuery(nextQuery, { replace });
		},
		[location.search, pushQuery]
	);

	const openCalendarPricing = useCallback(
		(nextTab = "general", { replace = false } = {}) => {
			const nextQuery = new URLSearchParams(location.search || "");
			if (!nextQuery.get("page")) nextQuery.set("page", "1");
			nextQuery.set(ADMIN_GLOBAL_MODAL_PARAM, CALENDAR_PRICING_MODAL_VALUE);
			nextQuery.set(
				ADMIN_GLOBAL_CALENDAR_TAB_PARAM,
				normalizeCalendarPricingTab(nextTab)
			);
			nextQuery.delete(ADMIN_GLOBAL_ROOM_TAB_PARAM);
			pushQuery(nextQuery, { replace });
		},
		[location.search, pushQuery]
	);

	const closeModal = useCallback(() => {
		const nextQuery = new URLSearchParams(location.search || "");
		nextQuery.delete(ADMIN_GLOBAL_MODAL_PARAM);
		nextQuery.delete(ADMIN_GLOBAL_ROOM_TAB_PARAM);
		nextQuery.delete(ADMIN_GLOBAL_CALENDAR_TAB_PARAM);
		pushQuery(nextQuery);
	}, [location.search, pushQuery]);

	useEffect(() => {
		if (!roomModalOpen || roomManagerTabParam) return;
		openRoomManager("add", { replace: true });
	}, [openRoomManager, roomManagerTabParam, roomModalOpen]);

	useEffect(() => {
		if (!calendarPricingModalOpen || calendarPricingTabParam) return;
		openCalendarPricing("general", { replace: true });
	}, [
		calendarPricingModalOpen,
		calendarPricingTabParam,
		openCalendarPricing,
	]);

	const openSettings = (hotel = {}) => {
		const route = singleHotelRoute(hotel.ownerId, hotel._id, "settings");
		if (route) history.push(route);
	};

	return (
		<GlobalHotelSettingsWrapper
			dir={isArabic ? "rtl" : "ltr"}
			show={collapsed}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{isArabic ? (
						<AdminNavbarArabic
							fromPage='GlobalHotelSettings'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='GlobalHotelSettings'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					)}
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper'>
						<PageHeader>
							<div>
								<h1>{labels.title}</h1>
								<span>
									{labels.subtitle} | {total} {labels.hotels}
								</span>
							</div>
							<button
								type='button'
								className='refresh-action'
								onClick={loadSettings}
								disabled={loading}
							>
								<ReloadOutlined />
								{labels.refresh}
							</button>
						</PageHeader>

						<SettingsActions $isRTL={isArabic}>
							<SettingsActionButton
								type='button'
								$variant='rooms'
								onClick={() => openRoomManager("add")}
							>
								<span className='icon'>
									<PlusCircleOutlined />
								</span>
								<span>{labels.roomAction}</span>
								<EditOutlined className='ghost-icon' />
							</SettingsActionButton>
							<SettingsActionButton
								type='button'
								$variant='calendar'
								onClick={() => openCalendarPricing("general")}
							>
								<span className='icon'>
									<CalendarOutlined />
								</span>
								<span>{labels.calendarAction}</span>
							</SettingsActionButton>
						</SettingsActions>

						<AdminGlobalRoomManagerModal
							open={roomModalOpen}
							onClose={closeModal}
							activeTab={roomManagerTab}
							onTabChange={(nextTab) =>
								openRoomManager(nextTab, { replace: true })
							}
							userId={userId}
							token={token}
							chosenLanguage={chosenLanguage}
							onSaved={loadSettings}
						/>
						<AdminGlobalCalendarPricingModal
							open={calendarPricingModalOpen}
							onClose={closeModal}
							activeTab={calendarPricingTab}
							onTabChange={(nextTab) =>
								openCalendarPricing(nextTab, { replace: true })
							}
							userId={userId}
							token={token}
							chosenLanguage={chosenLanguage}
							onSaved={loadSettings}
						/>

						{!loading && !rows.length ? (
							<EmptyState>{labels.noHotelsFound}</EmptyState>
						) : (
							<OverallTableWrap>
								<table>
									<thead>
										<tr>
											<th>#</th>
											<th>{labels.hotel}</th>
											<th>{labels.owner}</th>
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
												<td colSpan='12'>{labels.loading}</td>
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
														<span className='table-truncate'>
															{hotel.ownerName || hotel.ownerEmail || "-"}
														</span>
													</td>
													<td>
														<StatusPill
															$tone={statusTone(
																hotel.setup?.settingsDone
																	? "ready"
																	: "pending"
															)}
														>
															{localizeStatus(
																hotel.setup?.settingsDone
																	? "ready"
																	: "pending",
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
					</div>
				</div>
			</div>
		</GlobalHotelSettingsWrapper>
	);
};

export default AdminGlobalHotelSettingsMain;

const heartbeat = keyframes`
	0%, 100% {
		transform: translateY(0) scale(1);
		box-shadow:
			0 12px 26px var(--pulse-shadow),
			0 0 0 0 var(--pulse-ring);
	}
	42% {
		transform: translateY(-2px) scale(1.045);
		box-shadow:
			0 18px 38px var(--pulse-shadow-strong),
			0 0 0 8px var(--pulse-ring-soft);
	}
	58% {
		transform: translateY(0) scale(1.018);
		box-shadow:
			0 14px 30px var(--pulse-shadow-mid),
			0 0 0 3px var(--pulse-ring-faint);
	}
`;

const GlobalHotelSettingsWrapper = styled.div`
	margin-top: 0;
	min-height: 715px;
	overflow-x: hidden;

	.grid-container-main {
		display: grid;
		min-width: 0;
		grid-template-columns: ${(props) => {
			const nav = props.show ? "70px" : "285px";
			return props.dir === "rtl" ? `1fr ${nav}` : `${nav} 1fr`;
		}};
		grid-template-areas: ${(props) =>
			props.dir === "rtl" ? "'content nav'" : "'nav content'"};
	}

	.navcontent {
		grid-area: nav;
		min-width: 0;
	}

	.otherContentWrapper {
		grid-area: content;
		min-width: 0;
		overflow: hidden;
	}

	.container-wrapper {
		width: auto;
		max-width: calc(100% - 20px);
		min-width: 0;
		border: 1px solid rgba(139, 190, 227, 0.42);
		padding: 16px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.97);
		margin: 14px 10px;
		box-shadow: 0 14px 34px rgba(13, 49, 88, 0.11);
		box-sizing: border-box;
		overflow: hidden;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "nav" "content";
		}

		.container-wrapper {
			max-width: calc(100% - 12px);
			margin: 10px 6px;
			padding: 12px;
		}
	}
`;

const PageHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	padding-bottom: 12px;
	border-bottom: 1px solid rgba(139, 190, 227, 0.3);

	h1 {
		margin: 0;
		color: #0f2b46;
		font-size: 1.28rem;
		font-weight: 950;
		letter-spacing: 0;
	}

	span {
		display: block;
		margin-top: 3px;
		color: #52677e;
		font-size: 0.82rem;
		font-weight: 850;
	}

	.refresh-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		min-height: 36px;
		border: 1px solid rgba(36, 144, 200, 0.38);
		border-radius: 6px;
		background: #f7fbff;
		color: #0f4b77;
		font-size: 0.8rem;
		font-weight: 950;
		padding: 0 12px;
		cursor: pointer;
	}

	.refresh-action:hover {
		border-color: rgba(36, 144, 200, 0.72);
		background: #eef8ff;
	}

	.refresh-action:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 620px) {
		align-items: stretch;
		flex-direction: column;

		.refresh-action {
			width: 100%;
		}
	}
`;

const SettingsActions = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: stretch;
	justify-content: center;
	gap: 12px;
	width: 100%;
	margin: 18px 0;
	padding: 0;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	@media (max-width: 640px) {
		display: grid;
		grid-template-columns: 1fr;
	}
`;

const SettingsActionButton = styled.button`
	--pulse-shadow: ${(props) =>
		props.$variant === "calendar"
			? "rgba(37, 99, 235, 0.22)"
			: "rgba(15, 118, 110, 0.22)"};
	--pulse-shadow-mid: ${(props) =>
		props.$variant === "calendar"
			? "rgba(37, 99, 235, 0.26)"
			: "rgba(15, 118, 110, 0.26)"};
	--pulse-shadow-strong: ${(props) =>
		props.$variant === "calendar"
			? "rgba(37, 99, 235, 0.34)"
			: "rgba(15, 118, 110, 0.34)"};
	--pulse-ring: ${(props) =>
		props.$variant === "calendar"
			? "rgba(96, 165, 250, 0.3)"
			: "rgba(45, 212, 191, 0.3)"};
	--pulse-ring-soft: ${(props) =>
		props.$variant === "calendar"
			? "rgba(96, 165, 250, 0.14)"
			: "rgba(45, 212, 191, 0.13)"};
	--pulse-ring-faint: ${(props) =>
		props.$variant === "calendar"
			? "rgba(96, 165, 250, 0.1)"
			: "rgba(45, 212, 191, 0.1)"};
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	min-height: 54px;
	min-width: min(100%, 250px);
	padding: 0 20px;
	border: 1px solid rgba(204, 251, 241, 0.72);
	border-radius: 8px;
	background: ${(props) =>
		props.$variant === "calendar"
			? "linear-gradient(135deg, #1e3a8a 0%, #2563eb 44%, #60a5fa 64%, #1d4ed8 100%)"
			: "linear-gradient(135deg, #064e3b 0%, #0f766e 42%, #2dd4bf 62%, #07564f 100%)"};
	color: #ffffff;
	font-size: 0.94rem;
	font-weight: 950;
	letter-spacing: 0;
	cursor: pointer;
	box-shadow: 0 12px 26px var(--pulse-shadow);
	transition:
		transform 180ms ease,
		border-color 180ms ease,
		box-shadow 180ms ease;
	animation: ${heartbeat} 2.35s ease-in-out infinite;

	.icon {
		display: inline-grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 7px;
		background: rgba(255, 255, 255, 0.18);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.32);
	}

	.ghost-icon {
		opacity: 0.68;
	}

	&:hover {
		transform: translateY(-2px) scale(1.018);
		border-color: rgba(204, 251, 241, 0.96);
		box-shadow: 0 18px 38px var(--pulse-shadow-strong);
	}

	&:focus-visible {
		outline: 3px solid rgba(15, 118, 110, 0.24);
		outline-offset: 2px;
	}

	@media (max-width: 640px) {
		width: 100%;
		min-width: 0;
	}
`;
