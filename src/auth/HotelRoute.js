/** @format */

import React, { useEffect, useState } from "react";
import { Route, Redirect } from "react-router-dom";
import { isAuthenticated } from "./index";

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
			const isAllowed =
				auth && (auth.user.role === 2000 || auth.user.role === 1000);

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

			const { hotelId, userId } = props.match?.params || {};
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
