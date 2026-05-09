/** @format */

import React, { useEffect, useState } from "react";
import { Route, Redirect } from "react-router-dom";
import { isAuthenticated } from "./index";
import { isSuperAdminUser } from "../AdminModule/utils/superUsers";

const readSelectedHotel = () => {
	try {
		const stored = localStorage.getItem("selectedHotel");
		return stored ? JSON.parse(stored) : null;
	} catch (err) {
		console.warn("Failed to parse selectedHotel from localStorage", err);
		return null;
	}
};

const normalizeSelectedHotel = (hotel, { hotelId, userId, fallbackUserId }) => {
	const normalized = hotel && typeof hotel === "object" ? { ...hotel } : {};
	const normalizedHotelId = normalized._id || hotelId || "";

	if (normalizedHotelId) {
		normalized._id = normalizedHotelId;
	}

	const rawBelongsTo = normalized.belongsTo;
	const belongsToId =
		(rawBelongsTo && typeof rawBelongsTo === "object"
			? rawBelongsTo._id
			: rawBelongsTo) ||
		userId ||
		fallbackUserId ||
		"";

	if (belongsToId) {
		normalized.belongsTo = {
			...(typeof rawBelongsTo === "object" ? rawBelongsTo : {}),
			_id: belongsToId,
		};
	}

	if (!Array.isArray(normalized.roomCountDetails)) {
		normalized.roomCountDetails = [];
	}

	return normalized;
};

const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const getSupportedHotelIds = (user) =>
	Array.isArray(user?.hotelsToSupport)
		? user.hotelsToSupport.map(normalizeId).filter(Boolean)
		: [];

const getUserRoles = (user) => {
	const roles = Array.isArray(user?.roles) ? user.roles : [];
	return [...new Set([user?.role, ...roles].map(Number).filter(Boolean))];
};

const hasRole = (user, role) => getUserRoles(user).includes(Number(role));

const getUserRoleDescriptions = (user) => [
	String(user?.roleDescription || "").toLowerCase(),
	...(Array.isArray(user?.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const hasRoleDescription = (user, description) =>
	getUserRoleDescriptions(user).includes(String(description || "").toLowerCase());

const hasAnyRoleDescription = (user, descriptions = []) =>
	descriptions.some((description) => hasRoleDescription(user, description));

const isFullReservationAccessUser = (user) =>
	isSuperAdminUser(user) ||
	hasRole(user, 1000) ||
	hasRole(user, 2000) ||
	hasRole(user, 3000) ||
	hasAnyRoleDescription(user, ["hotelmanager", "reception"]);

const isLimitedOrderTakerUser = (user) => {
	const isOrderTaker =
		hasRole(user, 7000) ||
		hasRoleDescription(user, "ordertaker") ||
		(Array.isArray(user?.accessTo) && user.accessTo.includes("ownReservations"));

	return isOrderTaker && !isFullReservationAccessUser(user);
};

const isOrderTakerReservationSearchAllowed = (search = "") => {
	const params = new URLSearchParams(search || "");
	return params.has("newReservation") || params.has("list");
};

const isScopedHotelUser = (user) =>
	Boolean(user?.hotelIdWork) &&
	Boolean(user?.belongsToId) &&
	getUserRoles(user).some((role) =>
		[2000, 3000, 4000, 5000, 6000, 7000].includes(role)
	);

const pathAllowsRole = (pathname = "", user, search = "") => {
	const isScopedManager = hasRole(user, 2000) && hasRoleDescription(user, "hotelmanager");

	if (hasRole(user, 1000)) return true;
	if (hasRole(user, 2000) && !isScopedHotelUser(user)) return true;
	if (isScopedManager) return true;

	if (pathname.includes("/hotel-management/main-dashboard")) {
		return hasRole(user, 2000) || isScopedHotelUser(user);
	}
	if (pathname.includes("/hotel-management/dashboard")) {
		return [4000, 6000].some((role) => hasRole(user, role));
	}
	if (pathname.includes("/hotel-management/new-reservation")) {
		if (isLimitedOrderTakerUser(user)) {
			return isOrderTakerReservationSearchAllowed(search);
		}
		return hasRole(user, 3000) || hasRole(user, 7000);
	}
	if (
		pathname.includes("/hotel-management/reservation-history") ||
		pathname.includes("/hotel-management/customer-service")
	) {
		return false;
	}
	if (
		pathname.includes("/hotel-management/hotel-reports") ||
		pathname.includes("/hotel-management-payment")
	) {
		return hasRole(user, 6000);
	}
	if (pathname.includes("/hotel-management/house-keeping")) {
		return hasRole(user, 4000) || hasRole(user, 5000);
	}

	return false;
};

const getFirstAssignedHotelId = (user, routeHotelId = "") => {
	const possibleIds = [
		user?.hotelIdWork,
		...(Array.isArray(user?.hotelIdsWork) ? user.hotelIdsWork : []),
		...(Array.isArray(user?.hotelsToSupport) ? user.hotelsToSupport : []),
		...(Array.isArray(user?.hotelIdsOwner) ? user.hotelIdsOwner : []),
		routeHotelId,
	];
	return normalizeId(possibleIds.find((item) => normalizeId(item)));
};

const getLimitedAccountRedirect = (user, location, { hotelId, userId }) => {
	if (!user || isSuperAdminUser(user)) return null;
	const pathname = location?.pathname || "";
	const search = location?.search || "";
	if (!pathname.includes("/hotel-management")) return null;

	const isReceptionOnly =
		(hasRole(user, 3000) || hasRoleDescription(user, "reception")) &&
		!hasRole(user, 1000) &&
		!hasRole(user, 2000);
	const isOrderTakerOnly = isLimitedOrderTakerUser(user);

	if (!isReceptionOnly && !isOrderTakerOnly) return null;

	const isNewReservationPath = pathname.includes("/hotel-management/new-reservation");
	if (
		isOrderTakerOnly &&
		isNewReservationPath &&
		!isOrderTakerReservationSearchAllowed(search)
	) {
		return { pathname, search: "?newReservation" };
	}

	if (pathAllowsRole(pathname, user, search)) return null;

	const targetHotelId = getFirstAssignedHotelId(user, hotelId);
	const targetOwnerId =
		normalizeId(userId) || normalizeId(user?.belongsToId) || normalizeId(user?._id);

	if (!targetHotelId || !targetOwnerId) {
		return { pathname: "/", state: { from: location } };
	}

	return {
		pathname: `/hotel-management/new-reservation/${targetOwnerId}/${targetHotelId}`,
		search: isOrderTakerOnly ? "?newReservation" : "?reserveARoom",
	};
};

const userCanAccessHotel = (user, { hotelId, userId, pathname, search }) => {
	if (!user || user.activeUser === false) return false;
	if (isSuperAdminUser(user)) return true;

	const role = Number(user.role);
	const urlHotelId = normalizeId(hotelId);
	const urlOwnerId = normalizeId(userId);

	if (!pathAllowsRole(pathname, user, search)) return false;

	if (!urlHotelId) {
		return role === 1000 || role === 2000 || isScopedHotelUser(user);
	}

	if (role === 1000) {
		const supportIds = getSupportedHotelIds(user);
		return supportIds.length === 0 || supportIds.includes(urlHotelId);
	}

	if (isScopedHotelUser(user)) {
		const assignedHotelId = normalizeId(user.hotelIdWork);
		const assignedOwnerId = normalizeId(user.belongsToId);
		const supportIds = getSupportedHotelIds(user);
		return (
			(assignedHotelId === urlHotelId || supportIds.includes(urlHotelId)) &&
			(!urlOwnerId || assignedOwnerId === urlOwnerId)
		);
	}

	if (role === 2000) {
		return !urlOwnerId || normalizeId(user._id) === urlOwnerId;
	}

	return false;
};

const HotelContextGate = ({ children, hotelId, userId }) => {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let isActive = true;

		const hydrateSelectedHotel = async () => {
			if (!hotelId) {
				if (isActive) setReady(true);
				return;
			}

			const auth = isAuthenticated();
			const fallbackUserId = auth?.user?._id;
			const storedHotel = readSelectedHotel();
			const storedMatches = storedHotel?._id === hotelId;
			const normalizedStored = normalizeSelectedHotel(storedHotel, {
				hotelId,
				userId,
				fallbackUserId,
			});

			if (storedMatches) {
				localStorage.setItem("selectedHotel", JSON.stringify(normalizedStored));
				if (isActive) setReady(true);
				return;
			}

			try {
				const response = await fetch(
					`${process.env.REACT_APP_API_URL}/hotel-details/${hotelId}`,
					{ method: "GET" }
				);
				const data = await response.json();
				const normalized = normalizeSelectedHotel(data, {
					hotelId,
					userId,
					fallbackUserId,
				});
				localStorage.setItem("selectedHotel", JSON.stringify(normalized));
			} catch (err) {
				console.error("Failed to load selected hotel details", err);
				const fallback = normalizeSelectedHotel({}, {
					hotelId,
					userId,
					fallbackUserId,
				});
				localStorage.setItem("selectedHotel", JSON.stringify(fallback));
			}

			if (isActive) setReady(true);
		};

		hydrateSelectedHotel();

		return () => {
			isActive = false;
		};
	}, [hotelId, userId]);

	if (!ready) {
		return <div>Loading...</div>;
	}

	return children;
};

const HotelRoute = ({ component: Component, ...rest }) => (
	<Route
		{...rest}
		render={(props) => {
			const auth = isAuthenticated();
			const user = auth?.user;
			const { hotelId, userId } = props.match?.params || {};
			const limitedAccountRedirect = getLimitedAccountRedirect(
				user,
				props.location,
				{ hotelId, userId }
			);

			if (limitedAccountRedirect) {
				return <Redirect to={limitedAccountRedirect} />;
			}

			const isAllowed =
				auth &&
				userCanAccessHotel(user, {
					hotelId,
					userId,
					pathname: props.location?.pathname || "",
					search: props.location?.search || "",
				});

			if (!isAllowed) {
				return (
					<Redirect
						to={{
							pathname: "/",
							state: { from: props.location },
						}}
					/>
				);
			}

			const isHotelManagement =
				props.location?.pathname?.includes("/hotel-management");

			if (isHotelManagement && hotelId) {
				return (
					<HotelContextGate hotelId={hotelId} userId={userId}>
						<Component {...props} />
					</HotelContextGate>
				);
			}

			return <Component {...props} />;
		}}
	/>
);

export default HotelRoute;
