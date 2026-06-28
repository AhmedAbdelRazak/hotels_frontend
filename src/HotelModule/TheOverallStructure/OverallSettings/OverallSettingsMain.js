import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import {
	CalendarOutlined,
	DatabaseOutlined,
	EditOutlined,
	PlusCircleOutlined,
} from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { getOverallSettings } from "../../apiAdmin";
import {
	buildOwnerParams,
	EmptyState,
	formatDate,
	getOverallText,
	localizeStatus,
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

const ACTION_TEXT = {
	en: {
		roomAction: "Room Add / Update",
		priceVariantAction: "Price Variants",
		calendarAction: "Calendar Pricing",
		calendarLater:
			"Calendar Pricing will be prepared after the room workflow is confirmed.",
	},
	ar: {
		roomAction:
			"\u0625\u0636\u0627\u0641\u0629 / \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u063a\u0631\u0641",
		priceVariantAction: "\u062a\u0646\u0648\u064a\u0639\u0627\u062a \u0627\u0644\u0623\u0633\u0639\u0627\u0631",
		calendarAction:
			"\u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u062a\u0642\u0648\u064a\u0645",
		calendarLater:
			"\u0633\u0646\u0642\u0648\u0645 \u0628\u062a\u062c\u0647\u064a\u0632 \u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0628\u0639\u062f \u0627\u0639\u062a\u0645\u0627\u062f \u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u063a\u0631\u0641.",
	},
};

const ROOM_MANAGER_MODAL_PARAM = "settingsModal";
const ROOM_MANAGER_TAB_PARAM = "settingsRoomTab";
const ROOM_MANAGER_MODAL_VALUE = "rooms";
const CALENDAR_PRICING_MODAL_VALUE = "calendar";
const PRICE_VARIANTS_MODAL_VALUE = "price-variants";
const CALENDAR_PRICING_TAB_PARAM = "settingsCalendarTab";
const PRICE_VARIANTS_TAB_PARAM = "settingsPriceVariantTab";

const normalizeRoomManagerTab = (value) =>
	value === "update" ? "update" : "add";
const normalizeCalendarPricingTab = () => "general";
const normalizePriceVariantTab = (value) =>
	["update", "agents"].includes(value) ? value : "add";

const SETTINGS_STALE_QUERY_KEYS = [
	"modal",
	"hotelId",
	"mapHotelId",
	"mapOwnerId",
	"reservationId",
	"step",
	"summaryTab",
	"listPage",
	"listSearch",
	"dateFrom",
	"dateTo",
	"dateBy",
	"sortBy",
	"tab",
	"reservationTab",
	"agentId",
	"transactionId",
	"walletTab",
	"startDate",
	"endDate",
	"actionType",
	"invCal",
	"invHMonth",
	"invHYear",
	"invStart",
	"invEnd",
	"invHotel",
	"range",
];

const normalizeSettingsSearch = (search = "", ownerId = "") => {
	const nextQuery = new URLSearchParams(search || "");
	SETTINGS_STALE_QUERY_KEYS.forEach((key) => nextQuery.delete(key));
	if (ownerId) nextQuery.set("ownerId", ownerId);
	nextQuery.set("overall", "settings");
	nextQuery.set("page", "1");

	const modal = nextQuery.get(ROOM_MANAGER_MODAL_PARAM);
	const validModal = [
		ROOM_MANAGER_MODAL_VALUE,
		CALENDAR_PRICING_MODAL_VALUE,
		PRICE_VARIANTS_MODAL_VALUE,
	].includes(modal)
		? modal
		: "";

	if (!validModal) {
		nextQuery.delete(ROOM_MANAGER_MODAL_PARAM);
		nextQuery.delete(ROOM_MANAGER_TAB_PARAM);
		nextQuery.delete(CALENDAR_PRICING_TAB_PARAM);
		nextQuery.delete(PRICE_VARIANTS_TAB_PARAM);
		return nextQuery.toString();
	}

	nextQuery.set(ROOM_MANAGER_MODAL_PARAM, validModal);
	if (validModal === ROOM_MANAGER_MODAL_VALUE) {
		nextQuery.set(
			ROOM_MANAGER_TAB_PARAM,
			normalizeRoomManagerTab(nextQuery.get(ROOM_MANAGER_TAB_PARAM))
		);
		nextQuery.delete(CALENDAR_PRICING_TAB_PARAM);
		nextQuery.delete(PRICE_VARIANTS_TAB_PARAM);
		return nextQuery.toString();
	}

	if (validModal === CALENDAR_PRICING_MODAL_VALUE) {
		nextQuery.set(
			CALENDAR_PRICING_TAB_PARAM,
			normalizeCalendarPricingTab(nextQuery.get(CALENDAR_PRICING_TAB_PARAM))
		);
		nextQuery.delete(ROOM_MANAGER_TAB_PARAM);
		nextQuery.delete(PRICE_VARIANTS_TAB_PARAM);
		return nextQuery.toString();
	}

	nextQuery.set(
		PRICE_VARIANTS_TAB_PARAM,
		normalizePriceVariantTab(nextQuery.get(PRICE_VARIANTS_TAB_PARAM))
	);
	nextQuery.delete(ROOM_MANAGER_TAB_PARAM);
	nextQuery.delete(CALENDAR_PRICING_TAB_PARAM);
	return nextQuery.toString();
};

const OverallCalendarPricingModal = lazy(() =>
	import("./OverallCalendarPricingModal")
);
const OverallPriceVariantModal = lazy(() =>
	import("./OverallPriceVariantModal")
);
const OverallRoomManagerModal = lazy(() => import("./OverallRoomManagerModal"));

const OverallSettingsMain = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = {
		...common,
		...SETTINGS_TEXT[isRTL ? "ar" : "en"],
		...ACTION_TEXT[isRTL ? "ar" : "en"],
	};
	const history = useHistory();
	const location = useLocation();
	const query = new URLSearchParams(location.search || "");
	const roomManagerTabParam = query.get(ROOM_MANAGER_TAB_PARAM);
	const roomModalOpen =
		query.get(ROOM_MANAGER_MODAL_PARAM) === ROOM_MANAGER_MODAL_VALUE;
	const roomManagerTab = normalizeRoomManagerTab(roomManagerTabParam);
	const calendarPricingTabParam = query.get(CALENDAR_PRICING_TAB_PARAM);
	const priceVariantTabParam = query.get(PRICE_VARIANTS_TAB_PARAM);
	const calendarPricingModalOpen =
		query.get(ROOM_MANAGER_MODAL_PARAM) === CALENDAR_PRICING_MODAL_VALUE;
	const priceVariantModalOpen =
		query.get(ROOM_MANAGER_MODAL_PARAM) === PRICE_VARIANTS_MODAL_VALUE;
	const calendarPricingTab = normalizeCalendarPricingTab(calendarPricingTabParam);
	const priceVariantTab = normalizePriceVariantTab(priceVariantTabParam);
	const [loading, setLoading] = useState(false);
	const [rows, setRows] = useState([]);

	useEffect(() => {
		const normalizedSearch = normalizeSettingsSearch(location.search, ownerId);
		const nextSearch = normalizedSearch ? `?${normalizedSearch}` : "";
		if (nextSearch === (location.search || "")) return;
		history.replace({
			pathname: location.pathname,
			search: nextSearch,
		});
	}, [history, location.pathname, location.search, ownerId]);

	const loadSettings = useCallback(() => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallSettings(userId, token, buildOwnerParams(ownerId))
			.then((data) => {
				setRows(Array.isArray(data?.hotels) ? data.hotels : []);
			})
			.finally(() => setLoading(false));
	}, [ownerId, token, userId]);

	useEffect(() => {
		loadSettings();
	}, [loadSettings]);

	const openRoomManager = useCallback(
		(nextTab = "add", { replace = false } = {}) => {
			const nextQuery = new URLSearchParams(
				normalizeSettingsSearch(location.search, ownerId)
			);
			nextQuery.set(ROOM_MANAGER_MODAL_PARAM, ROOM_MANAGER_MODAL_VALUE);
			nextQuery.set(ROOM_MANAGER_TAB_PARAM, normalizeRoomManagerTab(nextTab));
			nextQuery.delete(CALENDAR_PRICING_TAB_PARAM);
			nextQuery.delete(PRICE_VARIANTS_TAB_PARAM);
			const nextLocation = {
				pathname: location.pathname,
				search: `?${nextQuery.toString()}`,
			};
			if (replace) history.replace(nextLocation);
			else history.push(nextLocation);
		},
		[history, location.pathname, location.search, ownerId]
	);

	const openCalendarPricing = useCallback(
		(nextTab = "general", { replace = false } = {}) => {
			const nextQuery = new URLSearchParams(
				normalizeSettingsSearch(location.search, ownerId)
			);
			nextQuery.set(ROOM_MANAGER_MODAL_PARAM, CALENDAR_PRICING_MODAL_VALUE);
			nextQuery.set(
				CALENDAR_PRICING_TAB_PARAM,
				normalizeCalendarPricingTab(nextTab)
			);
			nextQuery.delete(ROOM_MANAGER_TAB_PARAM);
			const nextLocation = {
				pathname: location.pathname,
				search: `?${nextQuery.toString()}`,
			};
			if (replace) history.replace(nextLocation);
			else history.push(nextLocation);
		},
		[history, location.pathname, location.search, ownerId]
	);

	const openPriceVariant = useCallback(
		(nextTab = "add", { replace = false } = {}) => {
			const nextQuery = new URLSearchParams(
				normalizeSettingsSearch(location.search, ownerId)
			);
			nextQuery.set(ROOM_MANAGER_MODAL_PARAM, PRICE_VARIANTS_MODAL_VALUE);
			nextQuery.set(PRICE_VARIANTS_TAB_PARAM, normalizePriceVariantTab(nextTab));
			nextQuery.delete(ROOM_MANAGER_TAB_PARAM);
			nextQuery.delete(CALENDAR_PRICING_TAB_PARAM);
			const nextLocation = {
				pathname: location.pathname,
				search: `?${nextQuery.toString()}`,
			};
			if (replace) history.replace(nextLocation);
			else history.push(nextLocation);
		},
		[history, location.pathname, location.search, ownerId]
	);

	const closeRoomManager = useCallback(() => {
		const nextQuery = new URLSearchParams(
			normalizeSettingsSearch(location.search, ownerId)
		);
		nextQuery.delete(ROOM_MANAGER_MODAL_PARAM);
		nextQuery.delete(ROOM_MANAGER_TAB_PARAM);
		nextQuery.delete(CALENDAR_PRICING_TAB_PARAM);
		nextQuery.delete(PRICE_VARIANTS_TAB_PARAM);
		const nextSearch = nextQuery.toString();
		history.push({
			pathname: location.pathname,
			search: nextSearch ? `?${nextSearch}` : "",
		});
	}, [history, location.pathname, location.search, ownerId]);

	const handleRoomManagerTabChange = useCallback(
		(nextTab) => openRoomManager(nextTab, { replace: true }),
		[openRoomManager]
	);

	const handleCalendarPricingTabChange = useCallback(
		(nextTab) => openCalendarPricing(nextTab, { replace: true }),
		[openCalendarPricing]
	);

	const handlePriceVariantTabChange = useCallback(
		(nextTab) => openPriceVariant(nextTab, { replace: true }),
		[openPriceVariant]
	);

	useEffect(() => {
		if (!roomModalOpen || roomManagerTabParam) return;
		openRoomManager("add", { replace: true });
	}, [openRoomManager, roomManagerTabParam, roomModalOpen]);

	useEffect(() => {
		if (!calendarPricingModalOpen) return;
		if (calendarPricingTabParam === "general") return;
		openCalendarPricing("general", { replace: true });
	}, [
		calendarPricingModalOpen,
		calendarPricingTabParam,
		openCalendarPricing,
	]);

	useEffect(() => {
		if (!priceVariantModalOpen) return;
		const normalized = normalizePriceVariantTab(priceVariantTabParam);
		if (priceVariantTabParam === normalized) return;
		openPriceVariant(normalized, { replace: true });
	}, [openPriceVariant, priceVariantModalOpen, priceVariantTabParam]);

	const openSettings = (hotel = {}) => {
		const route = singleHotelRoute(hotel.ownerId || ownerId, hotel._id, "settings");
		if (route) history.push(route);
	};

	return (
		<OverallPageShell $isRTL={isRTL}>
			<SettingsActions $isRTL={isRTL}>
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
					$variant='pricing'
					onClick={() => openPriceVariant("add")}
				>
					<span className='icon'>
						<DatabaseOutlined />
					</span>
					<span>{labels.priceVariantAction}</span>
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
			<Suspense fallback={null}>
				{roomModalOpen && (
					<OverallRoomManagerModal
						open={roomModalOpen}
						onClose={closeRoomManager}
						activeTab={roomManagerTab}
						onTabChange={handleRoomManagerTabChange}
						userId={userId}
						token={token}
						ownerId={ownerId}
						chosenLanguage={chosenLanguage}
						onSaved={loadSettings}
					/>
				)}
				{priceVariantModalOpen && (
					<OverallPriceVariantModal
						open={priceVariantModalOpen}
						onClose={closeRoomManager}
						userId={userId}
						token={token}
						ownerId={ownerId}
						chosenLanguage={chosenLanguage}
						activeTab={priceVariantTab}
						onTabChange={handlePriceVariantTabChange}
						onSaved={loadSettings}
					/>
				)}
				{calendarPricingModalOpen && (
					<OverallCalendarPricingModal
						open={calendarPricingModalOpen}
						onClose={closeRoomManager}
						activeTab={calendarPricingTab}
						onTabChange={handleCalendarPricingTabChange}
						userId={userId}
						token={token}
						ownerId={ownerId}
						chosenLanguage={chosenLanguage}
						onSaved={loadSettings}
					/>
				)}
			</Suspense>
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

const SettingsActions = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: stretch;
	justify-content: center;
	gap: 12px;
	width: 100%;
	margin: 20px 0;
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
			: props.$variant === "pricing"
			  ? "rgba(14, 116, 144, 0.22)"
			: "rgba(15, 118, 110, 0.22)"};
	--pulse-shadow-mid: ${(props) =>
		props.$variant === "calendar"
			? "rgba(37, 99, 235, 0.26)"
			: props.$variant === "pricing"
			  ? "rgba(124, 58, 237, 0.24)"
			: "rgba(15, 118, 110, 0.26)"};
	--pulse-shadow-strong: ${(props) =>
		props.$variant === "calendar"
			? "rgba(37, 99, 235, 0.34)"
			: props.$variant === "pricing"
			  ? "rgba(14, 116, 144, 0.34)"
			: "rgba(15, 118, 110, 0.34)"};
	--pulse-ring: ${(props) =>
		props.$variant === "calendar"
			? "rgba(96, 165, 250, 0.3)"
			: props.$variant === "pricing"
			  ? "rgba(34, 211, 238, 0.28)"
			: "rgba(45, 212, 191, 0.3)"};
	--pulse-ring-soft: ${(props) =>
		props.$variant === "calendar"
			? "rgba(96, 165, 250, 0.14)"
			: props.$variant === "pricing"
			  ? "rgba(34, 211, 238, 0.13)"
			: "rgba(45, 212, 191, 0.13)"};
	--pulse-ring-faint: ${(props) =>
		props.$variant === "calendar"
			? "rgba(96, 165, 250, 0.1)"
			: props.$variant === "pricing"
			  ? "rgba(34, 211, 238, 0.1)"
			: "rgba(45, 212, 191, 0.1)"};
	position: relative;
	order: ${(props) =>
		props.$variant === "pricing"
			? 3
			: props.$variant === "calendar"
			  ? 2
			  : 1};
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
			: props.$variant === "pricing"
			  ? "linear-gradient(135deg, #172554 0%, #7c3aed 42%, #06b6d4 72%, #164e63 100%)"
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
