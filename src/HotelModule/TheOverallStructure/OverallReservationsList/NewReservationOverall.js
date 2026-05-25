import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { getOverallReservations } from "../../apiAdmin";
import NewReservationMain from "../../NewReservation/NewReservationMain";
import {
	buildOwnerParams,
	getOverallText,
	OverallPageShell,
	OverallToolbar,
	titleCase,
} from "../overallShared";
import { useHistory, useLocation } from "react-router-dom";

const NEW_RESERVATION_OVERALL_TEXT = {
	en: {
		title: "New Reservation",
		subtitle: "Create a reservation for one of your assigned hotels.",
		chooseHotel: "Choose hotel",
		chooseHotelPlaceholder: "Select an assigned hotel",
		scopeNote:
			"Choose the hotel first. Reservations can only be created for hotels assigned to this account.",
		noHotels: "No assigned hotels are available for new reservations.",
		noPermission: "This account cannot create new reservations.",
		loadingHotels: "Loading assigned hotels...",
		ready: "Reservation form is ready for",
	},
	ar: {
		title: "حجز جديد",
		subtitle: "إنشاء حجز جديد لأحد الفنادق المخصصة لهذا الحساب.",
		chooseHotel: "اختر الفندق",
		chooseHotelPlaceholder: "اختر فندقاً مخصصاً للحساب",
		scopeNote:
			"يجب اختيار الفندق أولاً. يمكن إنشاء الحجوزات فقط للفنادق المخصصة لهذا الحساب.",
		noHotels: "لا توجد فنادق مخصصة متاحة لإنشاء حجز جديد.",
		noPermission: "هذا الحساب لا يملك صلاحية إنشاء حجوزات جديدة.",
		loadingHotels: "جاري تحميل الفنادق المخصصة...",
		ready: "نموذج الحجز جاهز لـ",
	},
};

const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const roleNumbers = (user = {}) => [
	Number(user.role),
	...(Array.isArray(user.roles) ? user.roles.map(Number) : []),
];

const roleDescriptions = (user = {}) => [
	String(user.roleDescription || "").toLowerCase(),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const userCanCreateReservation = (user = {}) => {
	const roles = roleNumbers(user);
	const descriptions = roleDescriptions(user);
	const accessTo = Array.isArray(user.accessTo) ? user.accessTo : [];

	if ([1000, 2000, 3000, 7000, 8000, 10000].some((role) => roles.includes(role))) {
		return true;
	}

	if (
		[
			"hotelmanager",
			"reception",
			"ordertaker",
			"reservationemployee",
			"systemadmin",
			"system admin",
		].some((role) => descriptions.includes(role))
	) {
		return true;
	}

	return accessTo.includes("newReservation");
};

const hotelOwnerId = (hotel = {}, fallbackOwnerId = "") =>
	normalizeId(
		hotel.ownerId ||
			hotel.belongsTo?._id ||
			hotel.belongsTo ||
			hotel.hotelOwnerId ||
			fallbackOwnerId
	);

const normalizeHotelForStorage = (hotel = {}, fallbackOwnerId = "") => {
	const ownerId = hotelOwnerId(hotel, fallbackOwnerId);
	return {
		...hotel,
		_id: normalizeId(hotel._id),
		hotelName: hotel.hotelName || hotel.name || "Hotel",
		ownerId,
		belongsTo: ownerId
			? {
					...(hotel.belongsTo && typeof hotel.belongsTo === "object"
						? hotel.belongsTo
						: {}),
					_id: ownerId,
			  }
			: hotel.belongsTo,
	};
};

const NewReservationOverall = ({
	userId,
	user,
	token,
	ownerId = "",
	chosenLanguage,
}) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = {
		...common,
		...NEW_RESERVATION_OVERALL_TEXT[isRTL ? "ar" : "en"],
	};
	const history = useHistory();
	const location = useLocation();
	const [loading, setLoading] = useState(false);
	const [hotels, setHotels] = useState([]);
	const [selectedHotelId, setSelectedHotelId] = useState("");
	const [hotelSelectorTouched, setHotelSelectorTouched] = useState(false);
	const canCreate = userCanCreateReservation(user);

	const queryHotelId = useMemo(() => {
		const params = new URLSearchParams(location.search || "");
		return normalizeId(params.get("hotelId"));
	}, [location.search]);

	useEffect(() => {
		if (!userId || !token || !canCreate) {
			setHotels([]);
			return;
		}
		setLoading(true);
		getOverallReservations(userId, token, {
			...buildOwnerParams(ownerId),
			page: 1,
			limit: 1,
			sortBy: "booked_at",
			sortOrder: "desc",
		})
			.then((data) => {
				const scopedHotels = Array.isArray(data?.hotels) ? data.hotels : [];
				setHotels(scopedHotels.map((hotel) => normalizeHotelForStorage(hotel, ownerId)));
			})
			.finally(() => setLoading(false));
	}, [canCreate, ownerId, token, userId]);

	useEffect(() => {
		if (!queryHotelId || !hotels.length) return;
		if (hotels.some((hotel) => normalizeId(hotel._id) === queryHotelId)) {
			setSelectedHotelId(queryHotelId);
		}
	}, [hotels, queryHotelId]);

	const selectedHotel = useMemo(
		() =>
			hotels.find((hotel) => normalizeId(hotel._id) === normalizeId(selectedHotelId)) ||
			null,
		[hotels, selectedHotelId]
	);
	const needsHotelSelection =
		canCreate &&
		!loading &&
		hotels.length > 0 &&
		!selectedHotel &&
		!hotelSelectorTouched;

	useEffect(() => {
		if (!selectedHotel?._id) return;
		localStorage.setItem("selectedHotel", JSON.stringify(selectedHotel));
	}, [selectedHotel]);

	const updateSelectedHotel = (hotelId = "") => {
		setSelectedHotelId(hotelId);
		setHotelSelectorTouched(Boolean(hotelId));
		const params = new URLSearchParams(location.search || "");
		params.set("overall", "new-reservation");
		if (hotelId) {
			params.set("hotelId", hotelId);
		} else {
			params.delete("hotelId");
		}
		history.replace({
			pathname: location.pathname,
			search: `?${params.toString()}`,
		});
	};

	return (
		<OverallPageShell $isRTL={isRTL}>
			<HotelSelectorToolbar
				onSubmit={(event) => event.preventDefault()}
				$isRTL={isRTL}
				$needsSelection={needsHotelSelection}
			>
				<label onPointerEnter={() => setHotelSelectorTouched(true)}>
					<span>{labels.chooseHotel}</span>
					<select
						dir={isRTL ? "rtl" : "ltr"}
						value={selectedHotelId}
						onFocus={() => setHotelSelectorTouched(true)}
						onPointerDown={() => setHotelSelectorTouched(true)}
						onKeyDown={() => setHotelSelectorTouched(true)}
						onChange={(event) => updateSelectedHotel(event.target.value)}
						disabled={!canCreate || loading || !hotels.length}
						required
					>
						<option value='' dir={isRTL ? "rtl" : "ltr"}>
							{loading ? labels.loadingHotels : labels.chooseHotelPlaceholder}
						</option>
						{hotels.map((hotel) => (
							<option key={hotel._id} value={hotel._id} dir='auto'>
								{titleCase(hotel.hotelName || "Hotel")}
							</option>
						))}
					</select>
				</label>
			</HotelSelectorToolbar>

			{!canCreate ? (
				<EmptyState>{labels.noPermission}</EmptyState>
			) : !loading && !hotels.length ? (
				<EmptyState>{labels.noHotels}</EmptyState>
			) : selectedHotel ? (
				<FormShell>
					<FormReadyLine>
						{labels.ready} <strong>{titleCase(selectedHotel.hotelName)}</strong>
					</FormReadyLine>
					<NewReservationMain
						key={selectedHotel._id}
						embedded
						forceNewReservation
						selectedHotelOverride={selectedHotel}
						hotelIdOverride={selectedHotel._id}
						ownerIdOverride={hotelOwnerId(selectedHotel, ownerId)}
					/>
				</FormShell>
			) : null}
		</OverallPageShell>
	);
};

export default NewReservationOverall;

const HotelSelectorToolbar = styled(OverallToolbar)`
	grid-template-columns: minmax(220px, min(100%, 460px));
	align-items: center;
	justify-content: center;
	justify-items: center;
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};

	label {
		display: grid;
		gap: 0.35rem;
		width: 100%;
		min-width: 0;
		justify-self: center;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
		color: #0f4f86;
		font-size: 0.78rem;
		font-weight: 900;
		transition:
			transform 180ms ease,
			filter 180ms ease;
		transform-origin: center;
		will-change: transform;
		animation: ${(props) =>
			props.$needsSelection
				? "hotelSelectorHeartbeat 1.45s ease-in-out infinite"
				: "none"};
	}

	select {
		min-height: 44px;
		border-color: ${(props) => (props.$needsSelection ? "#60a5fa" : "#d0d5dd")};
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
		text-align-last: ${(props) => (props.$isRTL ? "right" : "left")};
		box-shadow: ${(props) =>
			props.$needsSelection
				? "0 0 0 4px rgba(96, 165, 250, 0.16), 0 10px 24px rgba(15, 79, 134, 0.12)"
				: "none"};
		transition:
			border-color 180ms ease,
			box-shadow 180ms ease,
			transform 180ms ease;
	}

	select:focus {
		box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.16);
	}

	label:hover,
	label:focus-within {
		animation: none;
		transform: scale(1);
		filter: brightness(1);
	}

	@keyframes hotelSelectorHeartbeat {
		0%,
		100% {
			transform: scale(1);
			filter: brightness(1);
		}
		14% {
			transform: scale(1.025);
			filter: brightness(1.025);
		}
		28% {
			transform: scale(1);
			filter: brightness(1);
		}
		42% {
			transform: scale(1.016);
			filter: brightness(1.015);
		}
		70% {
			transform: scale(1);
			filter: brightness(1);
		}
	}

	@media (max-width: 560px) {
		grid-template-columns: 1fr;
		padding: 0.75rem;
	}

	@media (prefers-reduced-motion: reduce) {
		label {
			animation: none;
		}
	}
`;

const FormShell = styled.section`
	min-width: 0;
	border: 1px solid #cfe5fb;
	border-radius: 10px;
	background: #f7f8fc;
	overflow: hidden;
`;

const FormReadyLine = styled.div`
	padding: 0.72rem 0.9rem;
	border-bottom: 1px solid #dbeafe;
	background: #fff;
	color: #475467;
	font-size: 0.84rem;
	font-weight: 800;
	text-align: inherit;

	strong {
		color: #0f4f86;
	}
`;

const EmptyState = styled.div`
	padding: 1rem;
	border: 1px solid #d7e9fb;
	border-radius: 10px;
	background: #fff;
	color: #475467;
	font-weight: 800;
`;
