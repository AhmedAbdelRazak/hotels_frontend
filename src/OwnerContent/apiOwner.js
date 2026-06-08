import { isJwtExpired } from "../auth";

const isHotelManagementRoutePath = () =>
	typeof window !== "undefined" &&
	String(window.location?.pathname || "").startsWith("/hotel-management");

const withHotelManagementSourceViewHeader = (headers = {}) => ({
	...headers,
	...(isHotelManagementRoutePath()
		? { "X-Reservation-Source-View": "hotel-management" }
		: {}),
});

const getStoredAuthHeaders = () => {
	try {
		if (typeof window === "undefined") return {};
		const raw = localStorage.getItem("jwt");
		const parsed = raw ? JSON.parse(raw) : null;
		if (parsed?.token && isJwtExpired(parsed.token)) {
			localStorage.removeItem("jwt");
			return withHotelManagementSourceViewHeader();
		}
		return withHotelManagementSourceViewHeader(
			parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}
		);
	} catch (err) {
		return withHotelManagementSourceViewHeader();
	}
};

export const hotelAccount = (userId, token, accountId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/account-data/${accountId}/${userId}`,
		{
			method: "GET",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getAggregatedReservations = (month, hotelIds) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/owner-aggregation/${month}/${hotelIds}`,
		{
			method: "GET",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getReservationToDate = (hotelIds, date) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/owner-reservation-date/${hotelIds}/${date}`,
		{
			method: "GET",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};
