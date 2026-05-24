import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { Modal, Spin } from "antd";
import moment from "moment";
import { useHistory, useLocation } from "react-router-dom";
import {
	getHotelById,
	getHotelMapSummary,
	getHotelReservationsCurrent,
	getHotelRooms,
	getOverallSettings,
} from "../../apiAdmin";
import HotelHeatMap from "../../NewReservation/HotelHeatMap";
import HotelMapCards from "../../NewReservation/HotelMapCards";
import {
	ActionButton,
	buildOwnerParams,
	EmptyState,
	InlineNote,
	OverallHeader,
	OverallPageShell,
	StatusPill,
	statusTone,
	titleCase,
} from "../overallShared";

const TEXT = {
	en: {
		title: "Hotel Map",
		subtitle: "Live room status maps for the hotels assigned to this account",
		openFullMap: "Open Full Heat Map",
		openMapSettings: "Open Hotel Map Settings",
		loading: "Loading hotel maps...",
		noHotels: "No assigned hotels were found.",
		noMap: "No room map is available for this hotel yet.",
		active: "Active",
		inactive: "Inactive",
		rooms: "Rooms",
		roomTypes: "Room Types",
		locationReady: "Location Ready",
		locationPending: "Location Pending",
		hotel: "Hotel",
	},
	ar: {
		title: "خريطة الفنادق",
		subtitle: "خرائط حالة الغرف للفنادق المخصصة لهذا الحساب",
		openFullMap: "فتح خريطة الفندق كاملة",
		loading: "جاري تحميل خرائط الفنادق...",
		noHotels: "لا توجد فنادق مخصصة لهذا الحساب.",
		noMap: "لا توجد خريطة غرف متاحة لهذا الفندق حتى الآن.",
		active: "نشط",
		inactive: "غير نشط",
		rooms: "الغرف",
		roomTypes: "أنواع الغرف",
		locationReady: "الموقع جاهز",
		locationPending: "الموقع غير مكتمل",
	},
};

const AR_TEXT = {
	title: "خريطة الفنادق",
	subtitle: "خرائط حالة الغرف للفنادق المخصصة لهذا الحساب",
	openFullMap: "فتح خريطة الفندق كاملة",
	loading: "جار تحميل خرائط الفنادق...",
	noHotels: "لا توجد فنادق مخصصة لهذا الحساب.",
	noMap: "لا توجد خريطة غرف متاحة لهذا الفندق حتى الآن.",
	active: "نشط",
	inactive: "غير نشط",
	rooms: "الغرف",
	roomTypes: "أنواع الغرف",
	locationReady: "الموقع جاهز",
	locationPending: "الموقع غير مكتمل",
	hotel: "فندق",
};

const formatDateOnly = (value) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
};

const emptyMapData = {
	hotelRooms: [],
	hotelDetails: null,
	allReservations: [],
	startDateMap: null,
	endDateMap: null,
	summary: null,
};

const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const withOwnerContext = (hotel = {}) => ({
	...hotel,
	belongsTo: hotel.ownerId
		? {
				_id: hotel.ownerId,
				name: hotel.ownerName || "",
		  }
		: hotel.belongsTo,
});

const OverallHotelMapMain = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const labels = isRTL ? AR_TEXT : TEXT.en;
	const history = useHistory();
	const location = useLocation();
	const [loading, setLoading] = useState(false);
	const [rows, setRows] = useState([]);
	const [mapLoading, setMapLoading] = useState(false);
	const [mapData, setMapData] = useState(emptyMapData);

	const queryState = useMemo(() => {
		const params = new URLSearchParams(location.search || "");
		return {
			mapHotelId: params.get("mapHotelId") || "",
			mapOwnerId: params.get("mapOwnerId") || "",
		};
	}, [location.search]);

	useEffect(() => {
		if (!userId || !token) return;
		let isMounted = true;
		setLoading(true);
		getOverallSettings(userId, token, {
			...buildOwnerParams(ownerId),
			purpose: "hotel-map",
		})
			.then(async (data) => {
				const hotels = Array.isArray(data?.hotels) ? data.hotels : [];
				const hydrated = await Promise.all(
					hotels.map(async (hotel) => {
						const hotelId = normalizeId(hotel._id);
						const hotelOwnerId = normalizeId(hotel.ownerId);
						if (!hotelId || !hotelOwnerId) {
							return { ...hotel, summary: null, mapError: true };
						}
						try {
							const summary = await getHotelMapSummary(hotelId, hotelOwnerId);
							return {
								...hotel,
								summary: summary && !summary.error ? summary : null,
								mapError: !!summary?.error,
							};
						} catch (error) {
							return { ...hotel, summary: null, mapError: true };
						}
					})
				);
				if (isMounted) setRows(hydrated);
			})
			.finally(() => {
				if (isMounted) setLoading(false);
			});
		return () => {
			isMounted = false;
		};
	}, [ownerId, token, userId]);

	const hotels = useMemo(
		() =>
			rows.map((hotel) => {
				const summaryRooms = Number(hotel.summary?.summary?.totalRooms || 0);
				const configuredRooms = Number(hotel.overallRoomsCount || 0);
				const configuredTypes = Number(hotel.roomTypes || 0);
				return {
					...hotel,
					mapAvailable: summaryRooms > 0 || configuredRooms > 0 || configuredTypes > 0,
				};
			}),
		[rows]
	);

	const selectedMapHotel = useMemo(
		() =>
			hotels.find(
				(hotel) => normalizeId(hotel._id) === normalizeId(queryState.mapHotelId)
			) || null,
		[hotels, queryState.mapHotelId]
	);

	const updateMapQuery = useCallback(
		(updates = {}, method = "push") => {
			const params = new URLSearchParams(location.search || "");
			Object.entries(updates).forEach(([key, value]) => {
				if (value === undefined || value === null || value === "") {
					params.delete(key);
				} else {
					params.set(key, String(value));
				}
			});
			const search = params.toString();
			const nextLocation = {
				pathname: location.pathname,
				search: search ? `?${search}` : "",
			};
			if (method === "replace") {
				history.replace(nextLocation);
				return;
			}
			history.push(nextLocation);
		},
		[history, location.pathname, location.search]
	);

	const openFullMap = (hotel = {}) => {
		const hotelId = normalizeId(hotel._id);
		const hotelOwnerId = normalizeId(hotel.ownerId);
		if (!hotelId || !hotelOwnerId) return;
		if (typeof window !== "undefined") {
			localStorage.setItem("selectedHotel", JSON.stringify(withOwnerContext(hotel)));
		}
		updateMapQuery(
			{
				overall: "hotel-map",
				mapHotelId: hotelId,
				mapOwnerId: hotelOwnerId,
				reservationId: "",
			},
			"push"
		);
	};

	const closeFullMap = () => {
		setMapData(emptyMapData);
		updateMapQuery(
			{
				mapHotelId: "",
				mapOwnerId: "",
				reservationId: "",
			},
			"replace"
		);
	};

	const activeMapHotelId = normalizeId(queryState.mapHotelId || selectedMapHotel?._id);
	const activeMapOwnerId = normalizeId(
		selectedMapHotel?.ownerId || queryState.mapOwnerId || ownerId
	);
	const openHotelMapSettings = useCallback(() => {
		if (!activeMapHotelId || !activeMapOwnerId) return;
		if (typeof window !== "undefined" && selectedMapHotel) {
			localStorage.setItem(
				"selectedHotel",
				JSON.stringify(withOwnerContext(selectedMapHotel))
			);
		}
		history.push(
			`/hotel-management/settings/${activeMapOwnerId}/${activeMapHotelId}?roomdetails`
		);
	}, [activeMapHotelId, activeMapOwnerId, history, selectedMapHotel]);

	useEffect(() => {
		const hotelId = normalizeId(queryState.mapHotelId);
		if (!hotelId) {
			setMapData(emptyMapData);
			return;
		}

		const hotel = selectedMapHotel;
		if (!hotel) return;

		const hotelOwnerId = normalizeId(hotel.ownerId || queryState.mapOwnerId);
		if (!hotelOwnerId) return;

		let isMounted = true;
		const start = new Date();
		const end = new Date();
		end.setDate(end.getDate() + 60);
		const heatMapStartDate = formatDateOnly(start);
		const heatMapEndDate = formatDateOnly(end);

		setMapLoading(true);
		if (typeof window !== "undefined") {
			localStorage.setItem("selectedHotel", JSON.stringify(withOwnerContext(hotel)));
		}

		Promise.all([
			getHotelById(hotelId).catch(() => null),
			getHotelRooms(hotelId, hotelOwnerId).catch(() => []),
			getHotelReservationsCurrent(hotelId, hotelOwnerId).catch(() => []),
		])
			.then(([hotelDetails, hotelRooms, reservations]) => {
				if (!isMounted) return;
				setMapData({
					hotelRooms: Array.isArray(hotelRooms) ? hotelRooms : [],
					hotelDetails:
						hotelDetails && !hotelDetails.error
							? {
									...hotelDetails,
									belongsTo:
										hotelDetails.belongsTo || hotel.belongsTo || hotelOwnerId,
							  }
							: withOwnerContext(hotel),
					allReservations: Array.isArray(reservations) ? reservations : [],
					startDateMap: moment(heatMapStartDate),
					endDateMap: moment(heatMapEndDate),
					summary: hotel.summary,
				});
			})
			.finally(() => {
				if (isMounted) setMapLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, [queryState.mapHotelId, queryState.mapOwnerId, selectedMapHotel]);

	return (
		<OverallPageShell $isRTL={isRTL}>
			<HotelMapModalGlobalStyle />
			<OverallHeader>
				<div>
					<h2>{labels.title}</h2>
					<p>{labels.subtitle}</p>
				</div>
			</OverallHeader>

			{loading ? (
				<EmptyState>{labels.loading}</EmptyState>
			) : !hotels.length ? (
				<EmptyState>{labels.noHotels}</EmptyState>
			) : (
				<HotelMapGrid>
					{hotels.map((hotel) => (
						<HotelMapPanel key={hotel._id} $isRTL={isRTL}>
							<PanelHeader>
								<div>
									<h3>{titleCase(hotel.hotelName || labels.hotel)}</h3>
									<p>{hotel.hotelAddress || hotel.hotelCity || "-"}</p>
								</div>
								<StatusPill $tone={statusTone(hotel.activateHotel ? "active" : "inactive")}>
									{hotel.activateHotel ? labels.active : labels.inactive}
								</StatusPill>
							</PanelHeader>

							<MapMeta>
								<span>
									<strong>{Number(hotel.overallRoomsCount || 0)}</strong>
									{labels.rooms}
								</span>
								<span>
									<strong>{Number(hotel.roomTypes || 0)}</strong>
									{labels.roomTypes}
								</span>
								<span>
									<strong>{hotel.setup?.locationDone ? "OK" : "!"}</strong>
									{hotel.setup?.locationDone
										? labels.locationReady
										: labels.locationPending}
								</span>
							</MapMeta>

							{hotel.mapAvailable && hotel.summary ? (
								<MapCardsWrap>
									<HotelMapCards
										chosenLanguage={chosenLanguage}
										summary={hotel.summary}
									/>
								</MapCardsWrap>
							) : (
								<InlineNote $error>{labels.noMap}</InlineNote>
							)}

							<PanelActions>
								<ActionButton
									type='button'
									disabled={!hotel.mapAvailable}
									onClick={() => openFullMap(hotel)}
								>
									{labels.openFullMap}
								</ActionButton>
							</PanelActions>
						</HotelMapPanel>
					))}
				</HotelMapGrid>
			)}

			<Modal
				open={!!queryState.mapHotelId}
				onCancel={closeFullMap}
				footer={null}
				width='min(96vw, 1400px)'
				zIndex={2200}
				centered
				destroyOnClose
				className={`overall-hotel-map-modal${isRTL ? " is-rtl" : ""}`}
				title={
					<ModalTitle $isRTL={isRTL}>
						<span>
							{titleCase(selectedMapHotel?.hotelName || labels.hotel)}
						</span>
						<small>{labels.openFullMap}</small>
					</ModalTitle>
				}
				styles={{
					content: { padding: "10px 12px 12px" },
					body: {
						maxHeight: "84vh",
						overflowY: "auto",
						padding: 0,
					},
				}}
			>
				<ModalMapBody $isRTL={isRTL}>
					<ModalMapToolbar $isRTL={isRTL}>
						<MapSettingsButton
							type='button'
							disabled={!activeMapHotelId || !activeMapOwnerId}
							onClick={openHotelMapSettings}
						>
							{labels.openMapSettings ||
								(isRTL
									? "فتح إعدادات خريطة الفندق"
									: "Open Hotel Map Settings")}
						</MapSettingsButton>
					</ModalMapToolbar>
					{!loading && queryState.mapHotelId && !selectedMapHotel ? (
						<InlineNote $error>{labels.noMap}</InlineNote>
					) : mapLoading || !mapData.hotelDetails ? (
						<MapModalLoading>
							<Spin size='large' />
							<span>{labels.loading}</span>
						</MapModalLoading>
					) : (
						<HotelHeatMap
							hotelRooms={mapData.hotelRooms}
							hotelDetails={mapData.hotelDetails}
							start_date={null}
							end_date={null}
							start_date_Map={mapData.startDateMap}
							end_date_Map={mapData.endDateMap}
							allReservations={mapData.allReservations}
							chosenLanguage={chosenLanguage}
							useCurrentOccupancy
							mapSummary={mapData.summary}
						/>
					)}
				</ModalMapBody>
			</Modal>
		</OverallPageShell>
	);
};

export default OverallHotelMapMain;

const HotelMapGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;

	@media (max-width: 920px) {
		grid-template-columns: 1fr;
	}

	@media (max-width: 640px) {
		gap: 0.75rem;
	}
`;

const HotelMapPanel = styled.article`
	display: grid;
	gap: 0.8rem;
	min-width: 0;
	padding: 1rem;
	border: 1px solid rgba(16, 24, 40, 0.08);
	border-radius: 8px;
	background: #fff;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	@media (max-width: 640px) {
		gap: 0.65rem;
		padding: 0.78rem;
		border-radius: 10px;
	}
`;

const PanelHeader = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 0.75rem;
	min-width: 0;

	> div {
		min-width: 0;
	}

	h3 {
		margin: 0;
		color: #0f4f86;
		font-size: 1rem;
		font-weight: 900;
	}

	p {
		margin: 0.2rem 0 0;
		color: #47627d;
		font-size: 0.78rem;
		font-weight: 800;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}

	@media (max-width: 560px) {
		flex-direction: column;
		align-items: stretch;
		gap: 0.55rem;

		h3 {
			font-size: 0.94rem;
		}

		p {
			font-size: 0.72rem;
		}
	}
`;

const MapMeta = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.5rem;

	span {
		min-height: 54px;
		display: grid;
		align-content: center;
		gap: 0.15rem;
		padding: 0.55rem;
		border: 1px solid #d7e8fb;
		border-radius: 8px;
		background: #f8fafc;
		color: #47627d;
		font-size: 0.7rem;
		font-weight: 900;
	}

	strong {
		color: #0f4f86;
		font-size: 1rem;
		line-height: 1;
	}

	@media (max-width: 580px) {
		grid-template-columns: 1fr;

		span {
			min-height: 48px;
			grid-template-columns: auto 1fr;
			align-items: center;
			align-content: center;
		}
	}
`;

const MapCardsWrap = styled.div`
	padding: 0.35rem;
	border: 1px solid #edf2f7;
	border-radius: 8px;
	background: #fff;
	overflow: hidden;

	> div {
		margin-bottom: 0;
	}

	> div > div {
		grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
	}

	@media (max-width: 580px) {
		> div > div {
			grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
		}
	}

	@media (max-width: 380px) {
		padding: 0.25rem;

		> div {
			padding: 8px;
		}

		> div > div {
			grid-template-columns: 1fr !important;
		}
	}
`;

const PanelActions = styled.div`
	display: flex;
	justify-content: flex-end;

	@media (max-width: 480px) {
		justify-content: stretch;
	}
`;

const HotelMapModalGlobalStyle = createGlobalStyle`
	.overall-hotel-map-modal {
		max-width: min(96vw, 1400px);
	}

	.overall-hotel-map-modal .ant-modal-close {
		align-items: center;
		background: #7f1d1d;
		border: 1px solid #991b1b;
		border-radius: 999px;
		color: #fff;
		display: inline-flex;
		height: 30px;
		justify-content: center;
		right: 10px;
		top: 10px;
		width: 30px;
		z-index: 5;
	}

	.overall-hotel-map-modal.is-rtl .ant-modal-close {
		left: 10px;
		right: auto;
	}

	.overall-hotel-map-modal .ant-modal-close:hover {
		background: #991b1b;
		border-color: #b91c1c;
	}

	.overall-hotel-map-modal .ant-modal-close-x,
	.overall-hotel-map-modal .ant-modal-close-icon {
		color: #fff;
		font-size: 14px;
		line-height: 1;
	}

	.overall-hotel-map-modal .ant-modal-header {
		margin-bottom: 8px;
		padding-inline-end: 42px;
	}

	.overall-hotel-map-modal.is-rtl .ant-modal-header {
		padding-inline-start: 42px;
		padding-inline-end: 0;
	}

	@media (max-width: 760px) {
		.overall-hotel-map-modal {
			width: calc(100vw - 10px) !important;
			max-width: calc(100vw - 10px);
		}
	}
`;

const ModalTitle = styled.div`
	display: grid;
	gap: 0.15rem;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: start;

	span {
		color: #0f4f86;
		font-size: 1rem;
		font-weight: 900;
	}

	small {
		color: #47627d;
		font-size: 0.75rem;
		font-weight: 800;
	}
`;

const ModalMapToolbar = styled.div`
	position: sticky;
	top: 0;
	z-index: 4;
	display: flex;
	justify-content: ${(props) => (props.$isRTL ? "flex-start" : "flex-end")};
	gap: 0.5rem;
	padding: 0.45rem 0.35rem 0.65rem;
	background: linear-gradient(180deg, #fff 72%, rgba(255, 255, 255, 0));
`;

const MapSettingsButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 38px;
	min-width: 190px;
	border: 1px solid #1677ff;
	border-radius: 9px;
	background: #1677ff;
	color: #fff;
	font-size: 0.85rem;
	font-weight: 900;
	padding: 0.45rem 0.85rem;
	box-shadow: 0 8px 18px rgba(22, 119, 255, 0.18);

	&:hover:not(:disabled) {
		background: #0f6fc3;
		border-color: #0f6fc3;
	}

	&:disabled {
		opacity: 0.58;
		cursor: not-allowed;
	}

	@media (max-width: 560px) {
		width: 100%;
		min-width: 0;
	}
`;

const ModalMapBody = styled.div`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	min-height: 320px;
	overflow-x: hidden;

	> div {
		margin-top: 0;
	}
`;

const MapModalLoading = styled.div`
	display: grid;
	place-items: center;
	gap: 0.75rem;
	min-height: 320px;
	color: #47627d;
	font-weight: 900;
`;
