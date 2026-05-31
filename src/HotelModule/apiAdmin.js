import axios from "axios";
import { isJwtExpired, stopDashboardPreview } from "../auth";

const getStoredAuthHeaders = () => {
	try {
		if (typeof window === "undefined") return {};
		const previewRaw = localStorage.getItem("dashboardPreviewAuth");
		const preview = previewRaw ? JSON.parse(previewRaw) : null;
		if (preview?.auth?.token) {
			if (isJwtExpired(preview.auth.token)) {
				stopDashboardPreview();
			} else {
				return { Authorization: `Bearer ${preview.auth.token}` };
			}
		}
		const raw = localStorage.getItem("jwt");
		const parsed = raw ? JSON.parse(raw) : null;
		if (parsed?.token && isJwtExpired(parsed.token)) {
			localStorage.removeItem("jwt");
			localStorage.removeItem("dashboardPreviewAuth");
			return {};
		}
		return parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {};
	} catch (err) {
		return {};
	}
};

const getStoredPreviewAuth = () => {
	try {
		if (typeof window === "undefined") return null;
		const previewRaw = localStorage.getItem("dashboardPreviewAuth");
		const preview = previewRaw ? JSON.parse(previewRaw) : null;
		if (preview?.auth?.token && isJwtExpired(preview.auth.token)) {
			stopDashboardPreview();
			return null;
		}
		return preview;
	} catch (err) {
		return null;
	}
};

const getStoredLanguage = () => {
	try {
		if (typeof window === "undefined") return "";
		const raw = localStorage.getItem("lang");
		return raw ? JSON.parse(raw) : "";
	} catch (error) {
		return "";
	}
};

const localizeApiError = (
	data = {},
	fallback = "Request failed. Please try again."
) => {
	const isArabic = getStoredLanguage() === "Arabic";
	const localized = isArabic
		? data?.errorArabic || data?.messageArabic || data?.error || data?.message
		: data?.error || data?.message || data?.errorArabic || data?.messageArabic;
	return {
		...data,
		error:
			localized ||
			(isArabic ? "تعذر إكمال الطلب. يرجى المحاولة مرة أخرى." : fallback),
	};
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
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createNewReservation = (
	userId,
	hotelId,
	token,
	new_reservation,
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/create/${userId}/${hotelId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(new_reservation),
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const previewReservationExcelImport = ({
	userId,
	hotelId,
	file,
	answers = {},
}) => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("answers", JSON.stringify(answers || {}));
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/import-excel/${userId}/${hotelId}/preview`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
			body: formData,
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const commitReservationExcelImport = ({
	userId,
	hotelId,
	rows = [],
}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/import-excel/${userId}/${hotelId}/commit`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify({ rows }),
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getHotelDetails = (userId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/hotel-details/${userId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			...getStoredAuthHeaders(),
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getHotelMainDashboardStats = (
	hotelId,
	userId,
	token,
	params = {},
) => {
	const query = new URLSearchParams();
	if (params.range) query.append("range", params.range);
	if (params.dateBy) query.append("dateBy", params.dateBy);
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/stats/${hotelId}/${userId}${queryString}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getManagerExecutiveSummary = (userId, token, params = {}) => {
	const query = new URLSearchParams();
	if (params.range) query.append("range", params.range);
	if (params.dateBy) query.append("dateBy", params.dateBy);
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/executive-summary/${userId}${queryString}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getManagerExecutiveIncompleteReservations = (
	userId,
	token,
	params = {},
) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (Array.isArray(value) && !value.length) return;
		if (value !== undefined && value !== null && value !== "") {
			query.append(key, value);
		}
	});
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/executive-incomplete-reservations/${userId}${queryString}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getAgentWalletSummary = (hotelId, userId, token, params = {}) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			query.append(key, value);
		}
	});
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/agent-wallet/summary/${userId}${queryString}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getAgentTodoList = (hotelId, userId, token, params = {}) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			query.append(key, value);
		}
	});
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/agent-wallet/todos/${userId}${queryString}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const createAgentWalletClaim = (
	hotelId,
	userId,
	token,
	payload = {},
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/agent-wallet/claims/${userId}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(payload),
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const reviewAgentWalletClaim = (
	hotelId,
	userId,
	token,
	transactionId,
	payload = {},
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/agent-wallet/claims/${userId}/${transactionId}/review`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(payload),
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const updateAgentCommissionApproval = (
	reservationId,
	userId,
	token,
	payload = {},
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/agent-commission-approval/${reservationId}/${userId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(payload),
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const createAgentWalletTransaction = (
	hotelId,
	userId,
	token,
	payload = {},
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/agent-wallet/transactions/${userId}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(payload),
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const updateAgentWalletTransaction = (
	hotelId,
	userId,
	token,
	transactionId,
	payload = {},
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/agent-wallet/transactions/${userId}/${transactionId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(payload),
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const deleteAgentWalletTransaction = (
	hotelId,
	userId,
	token,
	transactionId,
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/agent-wallet/transactions/${userId}/${transactionId}`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getHotelDashboardOpenReservations = (
	hotelId,
	userId,
	token,
	params = {},
) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			query.append(key, value);
		}
	});
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/open-reservations/${hotelId}/${userId}${queryString}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getHotelDashboardIncompleteReservations = (
	hotelId,
	userId,
	token,
	params = {},
) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			query.append(key, value);
		}
	});
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/incomplete-reservations/${hotelId}/${userId}${queryString}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const createRooms = (userId, token, rooms) => {
	return fetch(`${process.env.REACT_APP_API_URL}/room/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(rooms),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const sendReservationConfirmationEmail = (
	reservationData,
	userId,
	hotelId,
	token,
) => {
	return fetch(`${process.env.REACT_APP_API_URL}/send-reservation-email`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(reservationData),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const sendPaymnetLinkToTheClient = (
	reservationLink,
	reservationEmail,
	extraPayload = {},
) => {
	return fetch(`${process.env.REACT_APP_API_URL}/send-payment-link-email`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			paymentLink: reservationLink,
			customerEmail: reservationEmail,
			...extraPayload,
		}),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const sendReservationConfirmationSMSManualHotel = (
	reservationId,
	payload = {},
) => {
	return axios
		.post(
			`${process.env.REACT_APP_API_URL}/hotel/reservations/${reservationId}/wa/confirmation-manual`,
			payload,
		)
		.then((res) => res.data)
		.catch((err) => {
			if (err?.response?.data) return err.response.data;
			return { ok: false, message: "Network error" };
		});
};

export const sendReservationPaymentLinkSMSManualHotel = (
	reservationId,
	payload = {},
) => {
	return axios
		.post(
			`${process.env.REACT_APP_API_URL}/hotel/reservations/${reservationId}/wa/payment-link-manual`,
			payload,
		)
		.then((res) => res.data)
		.catch((err) => {
			if (err?.response?.data) return err.response.data;
			return { ok: false, message: "Network error" };
		});
};

export const getHotelRooms = (accountId, userId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/room/${accountId}/${userId}`, {
		method: "GET",
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateSingleRoom = (roomId, userId, token, room) => {
	return fetch(`${process.env.REACT_APP_API_URL}/room/${roomId}/${userId}`, {
		method: "PUT",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(room),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const deleteSingleRoom = (roomId, userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/room/${roomId}/${userId}`, {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const gettingHotelDetailsForAdmin = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details-admin/${userId}`,
		{
			method: "GET",
			Authorization: `Bearer ${token}`,
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getHotelReservations = (hotelId, userId, startdate, enddate) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/${startdate}/${enddate}/${hotelId}/${userId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getHotelReservationsRange = (
	hotelId,
	userId,
	startdate,
	enddate,
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/occupancy/range/${startdate}/${enddate}/${hotelId}/${userId}`,
		{
			method: "GET",
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getHotelReservationsCurrent = (hotelId, userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/occupancy/current/${hotelId}/${userId}`,
		{
			method: "GET",
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getHotelMapSummary = (hotelId, userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/occupancy/summary/${hotelId}/${userId}`,
		{
			method: "GET",
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getTodaysCheckins = (hotelId, userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/checkins-today/${hotelId}/${userId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getListOfRoomSummary = (checkinDate, checkoutDate, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/room/${checkinDate}/${checkoutDate}/${hotelId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getHotelInventoryCalendar = (
	hotelId,
	{ start, end, includeCancelled = false, paymentStatuses = [] } = {},
) => {
	if (!hotelId) {
		return Promise.reject(new Error("hotelId is required"));
	}
	const params = new URLSearchParams();
	if (start) params.set("start", start);
	if (end) params.set("end", end);
	if (includeCancelled) params.set("includeCancelled", "true");
	if (Array.isArray(paymentStatuses) && paymentStatuses.length > 0) {
		params.set("paymentStatuses", paymentStatuses.join(","));
	}

	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/hotel-inventory/${hotelId}/calendar?${params.toString()}`,
		{
			method: "GET",
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getHotelInventoryDayReservations = (
	hotelId,
	{ date, roomKey, includeCancelled = false, paymentStatuses = [] } = {},
) => {
	if (!hotelId) {
		return Promise.reject(new Error("hotelId is required"));
	}
	if (!date) {
		return Promise.reject(new Error("date is required"));
	}
	const params = new URLSearchParams({ date });
	if (roomKey) params.set("roomKey", roomKey);
	if (includeCancelled) params.set("includeCancelled", "true");
	if (Array.isArray(paymentStatuses) && paymentStatuses.length > 0) {
		params.set("paymentStatuses", paymentStatuses.join(","));
	}

	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/hotel-inventory/${hotelId}/day?${params.toString()}`,
		{
			method: "GET",
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getHotelInventoryAvailability = (
	hotelId,
	{
		start,
		end,
		includeCancelled = false,
		agentId = "",
		includePendingConfirmation = false,
	} = {},
) => {
	if (!hotelId) {
		return Promise.reject(new Error("hotelId is required"));
	}
	const params = new URLSearchParams();
	if (start) params.set("start", start);
	if (end) params.set("end", end);
	if (includeCancelled) params.set("includeCancelled", "true");
	if (agentId) params.set("agentId", agentId);
	if (includePendingConfirmation) {
		params.set("includePendingConfirmation", "true");
	}

	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/hotel-inventory/${hotelId}/availability?${params.toString()}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getReservationSearch = (searchQuery, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/search/${searchQuery}/${hotelId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getReservationSearchAllMatches = (searchQuery, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/search/all-list/${searchQuery}/${hotelId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const reservationsList = (page, records, filters, hotelId, date) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/list/${page}/${records}/${filters}/${hotelId}/${date}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const checkedoutReservationsList = (
	page,
	records,
	startDate,
	endDate,
	hotelId,
	channel,
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-checkedout/${page}/${records}/${hotelId}/${channel}/${startDate}/${endDate}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getCheckedOutReservations = (page, records, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/checkedout-reservations/list/${page}/${records}/${hotelId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const generalReportReservationsList = (
	page,
	records,
	startDate,
	endDate,
	hotelId,
	channel,
	dateBy,
	noshow,
	cancel,
	inhouse,
	showCheckedout,
	payment,
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-general-report/${page}/${records}/${hotelId}/${channel}/${startDate}/${endDate}/${dateBy}/${noshow}/${cancel}/${inhouse}/${showCheckedout}/${payment}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getGeneralReportReservations = (
	startDate,
	endDate,
	hotelId,
	channel,
	dateBy,
	noshow,
	cancel,
	inhouse,
	showCheckedout,
	payment,
) => {
	console.log("From API Admin getGeneralReportReservations", hotelId);
	return fetch(
		`${process.env.REACT_APP_API_URL}/general-report-reservations/list/${hotelId}/${channel}/${startDate}/${endDate}/${dateBy}/${noshow}/${cancel}/${inhouse}/${showCheckedout}/${payment}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getReservationSummary = (hotelId, date, filters = {}) => {
	const query = new URLSearchParams();
	Object.entries(filters || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			query.append(key, value);
		}
	});
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-summary/${hotelId}/${date}${queryString}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const reservationsTotalRecords = (
	page,
	records,
	filters,
	hotelId,
	date,
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/get-total-records/${page}/${records}/${filters}/${hotelId}/${date}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const checkedoutReservationsTotalRecords = (
	startDate,
	endDate,
	hotelId,
	channel,
) => {
	console.log("From API Admin checkedoutReservationsTotalRecords", hotelId);

	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-summary-checkedout/${hotelId}/${channel}/${startDate}/${endDate}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const singlePreReservation = (reservationNumber, hotelId, belongsTo) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/single-reservation/${reservationNumber}/${hotelId}/${belongsTo}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const singlePreReservationById = (reservationId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/single-reservation/${reservationId}`,
		{
			method: "GET",
			headers: {
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

const attachReservationActor = (reservation = {}) => {
	try {
		const previewAuth = getStoredPreviewAuth();
		const previewUserId = previewAuth?.auth?.user?._id;
		if (previewUserId) {
			return {
				...reservation,
				requestingUserId: previewUserId,
				__previewAudit: true,
				__previewAuditActorId:
					previewAuth?.actor?._id || previewAuth?.preview?.actorId || "",
			};
		}
	} catch (error) {
		// Keep the update usable even if preview storage is unavailable.
	}

	if (reservation.requestingUserId) return reservation;

	try {
		const storedAuth = JSON.parse(localStorage.getItem("jwt") || "{}");
		const actorId = storedAuth?.user?._id;
		if (actorId) {
			return { ...reservation, requestingUserId: actorId };
		}
	} catch (error) {
		// Keep the update usable even if local storage is unavailable.
	}

	return reservation;
};

export const updateSingleReservation = (reservationId, reservation) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservation-update/${reservationId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(attachReservationActor(reservation)),
		},
	)
		.then(async (response) => {
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				return localizeApiError(
					{ ...data, status: response.status },
					`Reservation update failed (${response.status})`
				);
			}
			return data;
		})
		.catch((err) => ({
			error: err?.message || "Network error while updating reservation.",
		}));
};

export const getOpenFinanceCycleNotifications = (hotelId, userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/open-finance-cycles/${hotelId}/${userId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const gettingRoomInventory = (startdate, enddate, userId, accountId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/room-inventory-reserved/${startdate}/${enddate}/${userId}/${accountId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const gettingDayOverDayInventory = (userId, accountId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/inventory-report/${userId}/${accountId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const agodaData = (accountId, belongsTo, file) => {
	let formData = new FormData();
	formData.append("file", file);

	console.log(file);

	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/agoda-data-dump/${accountId}/${belongsTo}`,
		{
			method: "POST",
			body: formData, // send the file as FormData
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const expediaData = (accountId, belongsTo, file, country) => {
	let formData = new FormData();
	formData.append("file", file);

	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/expedia-data-dump/${accountId}/${belongsTo}/${country}`,
		{
			method: "POST",
			body: formData, // send the file as FormData
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const airbnbData = (accountId, belongsTo, file, country) => {
	let formData = new FormData();
	formData.append("file", file);

	console.log(file);

	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/airbnb-data-dump/${accountId}/${belongsTo}/${country}`,
		{
			method: "POST",
			body: formData, // send the file as FormData
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const bookingData = (accountId, belongsTo, file) => {
	let formData = new FormData();
	formData.append("file", file);

	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/booking-data-dump/${accountId}/${belongsTo}`,
		{
			method: "POST",
			body: formData, // send the file as FormData
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const janatData = (accountId, belongsTo, file) => {
	let formData = new FormData();
	formData.append("file", file);

	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/janat-data-dump/${accountId}/${belongsTo}`,
		{
			method: "POST",
			body: formData, // send the file as FormData
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const cloudinaryUpload1 = (userId, token, image) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/uploadimages/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(image),
			// body: image,
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateHotelDetails = (hotelId, userId, token, details) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/update/${hotelId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(details),
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateRoomAgentOverrides = (
	hotelId,
	roomId,
	userId,
	token,
	payload,
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/${hotelId}/rooms/${roomId}/agent-overrides/${userId}`,
		{
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(payload),
		},
	)
		.then(async (response) => {
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					...data,
					error: data?.error || data?.message || "Request failed",
				};
			}
			return data;
		})
		.catch((err) => ({
			error: err?.message || "Could not save agent room settings",
		}));
};

export const getHotelById = (hotelId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/hotel-details/${hotelId}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			...getStoredAuthHeaders(),
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const gettingDateReport = (date, hotelId, userMainId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/todate/ahowan/yaba/${date}/${hotelId}/${userMainId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const gettingDayOverDay = (hotelId, userMainId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/dayoverday/${hotelId}/${userMainId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const gettingMonthOverMonth = (hotelId, userMainId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/monthovermonth/${hotelId}/${userMainId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const gettingBookingSource = (hotelId, userMainId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/bookingsource/${hotelId}/${userMainId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const gettingReservationStatus = (hotelId, userMainId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservationstatus/${hotelId}/${userMainId}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

//For Payment
export const getBraintreeClientToken = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/braintree/getToken`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const processPayment_Subscription = (token, paymentData) => {
	return fetch(`${process.env.REACT_APP_API_URL}/braintree/subscription`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(paymentData),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const processPayment = (reservationId, paymentData) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/braintree/payment/${reservationId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(paymentData),
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const processCommissionPayment = (paymentData) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/braintree/commission-payment`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(paymentData),
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const currecyConversion = (saudimoney) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/currencyapi/${Number(saudimoney).toFixed(
			2,
		)}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateSubscriptionCardFn = (token, paymentData) => {
	console.log(paymentData, "paymentData");
	return fetch(
		`${process.env.REACT_APP_API_URL}/braintree/update-subscription-card`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(paymentData),
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateOwnerProfile = (userId, token, user) => {
	return fetch(`${process.env.REACT_APP_API_URL}/user/${userId}`, {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(user),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateUser = (user, next) => {
	if (typeof window !== "undefined") {
		if (localStorage.getItem("jwt")) {
			let auth = JSON.parse(localStorage.getItem("jwt"));
			auth.user = user;
			localStorage.setItem("jwt", JSON.stringify(auth));
			next();
		}
	}
};

export const getSubscriptionData = (userId, token, subscriptionId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/braintree/subscription-data/${userId}/${subscriptionId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

const buildHousekeepingQueryString = (filters = {}) => {
	const query = new URLSearchParams();
	Object.entries(filters || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			query.append(key, value);
		}
	});
	return query.toString() ? `?${query.toString()}` : "";
};

export const createNewHouseKeepingTask = (hotelId, housekeeping) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping/create/${hotelId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(housekeeping),
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getAllHouseKeepingTasks = (page, records, hotelId, filters = {}) => {
	const queryString = buildHousekeepingQueryString(filters);
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping-list/${page}/${records}/${hotelId}${queryString}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getAllHouseKeepingTotalRecords = (hotelId, filters = {}) => {
	const queryString = buildHousekeepingQueryString(filters);
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping-total-records/${hotelId}${queryString}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getHouseKeepingStaff = (hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping-staff/${hotelId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updatingHouseKeepingTask = (taskId, task) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping-update-document/${taskId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(task),
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getEmployeeWorkLoad = (userId, filters = {}) => {
	const queryString = buildHousekeepingQueryString(filters);
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping-employee/${userId}${queryString}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getHousekeepingSupplies = (hotelId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/house-keeping-supplies/${hotelId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			...getStoredAuthHeaders(),
		},
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const saveHousekeepingSupplyItem = (hotelId, item) => {
	return fetch(`${process.env.REACT_APP_API_URL}/house-keeping-supplies/${hotelId}/item`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...getStoredAuthHeaders(),
		},
		body: JSON.stringify(item),
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const createHousekeepingSupplyRequest = (hotelId, request) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping-supplies/${hotelId}/request`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(request),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const updateHousekeepingSupplyRequest = (requestId, payload) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping-supplies/request/${requestId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(payload),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const pendingPaymentReservationList = (page, records, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-pending/${page}/${records}/${hotelId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const pendingConfirmationReservationList = ({
	page = 1,
	records = 50,
	hotelId,
	userId,
	search = "",
	sortBy = "",
	sortOrder = "",
}) => {
	const params = new URLSearchParams();
	if (search) params.set("search", search);
	if (sortBy) params.set("sortBy", sortBy);
	if (sortOrder) params.set("sortOrder", sortOrder);
	const query = params.toString() ? `?${params.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/pending-confirmation/${page}/${records}/${hotelId}/${userId}${query}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const updatePendingConfirmationReservation = ({
	reservationId,
	userId,
	payload = {},
}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/pending-confirmation/${reservationId}/${userId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify(payload),
		},
	)
		.then(async (response) => {
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				return localizeApiError(
					{ ...data, status: response.status },
					`Reservation status update failed (${response.status})`
				);
			}
			return data;
		})
		.catch((err) => ({
			error: err?.message || "Network error while updating reservation status.",
		}));
};

export const pendingConfirmationNotificationFeed = ({
	userId,
	hotelId = "",
	ownerId = "",
	limit = 8,
}) => {
	const query = new URLSearchParams();
	if (hotelId) query.append("hotelId", hotelId);
	if (ownerId) query.append("ownerId", ownerId);
	if (limit) query.append("limit", limit);
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/notifications/pending-confirmation/${userId}${queryString}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			error: err?.message || "Network error while loading notifications.",
			data: [],
			total: 0,
		}));
};

export const acknowledgePendingNotification = ({
	userId,
	ackKey,
	notificationType = "",
	entityId = "",
	reservationId = "",
	walletTransactionId = "",
}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/notifications/pending-confirmation/${userId}/acknowledge`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
			body: JSON.stringify({
				ackKey,
				notificationType,
				entityId,
				reservationId,
				walletTransactionId,
			}),
		},
	)
		.then((response) => response.json())
		.catch((err) => ({ error: err?.message || "Notification update failed." }));
};

const buildOverallQuery = (params = {}) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (Array.isArray(value)) {
			const selected = value.filter(
				(item) => item !== undefined && item !== null && item !== ""
			);
			if (selected.length) query.append(key, selected.join(","));
		} else if (value !== undefined && value !== null && value !== "") {
			query.append(key, value);
		}
	});
	const queryString = query.toString();
	return queryString ? `?${queryString}` : "";
};

const overallHeaders = (token = "") => ({
	Accept: "application/json",
	"Content-Type": "application/json",
	...(token ? { Authorization: `Bearer ${token}` } : {}),
	...getStoredAuthHeaders(),
});

export const getOverallSummary = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/summary/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getOverallExecutiveReservationsReport = (
	userId,
	token,
	params = {}
) => {
	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/overall-dashboard/executive-report/reservations/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getOverallExecutiveInventoryReport = (
	userId,
	token,
	params = {}
) => {
	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/overall-dashboard/executive-report/inventory/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getOverallExecutiveInventoryDayReport = (
	userId,
	token,
	params = {}
) => {
	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/overall-dashboard/executive-report/inventory-day/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getOverallExecutivePaidReport = (userId, token, params = {}) => {
	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/overall-dashboard/executive-report/paid/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getOverallReservations = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/reservations/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const exportOverallReservations = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/reservations-export/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const trackOverallReservationSummaryExport = (
	userId,
	token,
	payload = {},
	params = {}
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/reservation-summary-export/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "POST",
			headers: overallHeaders(token),
			body: JSON.stringify(payload),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getOverallPendingReservations = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/pending-reservations/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getOverallFinancialActions = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/financial-actions/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const exportOverallFinancialActions = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/financial-actions/${userId}${buildOverallQuery(
			{ ...params, exportAll: "true" }
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const trackOverallFinancialReportExport = (
	userId,
	token,
	payload = {},
	params = {}
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/financial-report-export/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "POST",
			headers: overallHeaders(token),
			body: JSON.stringify(payload),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const exportOverallPendingReservations = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/pending-reservations-export/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getOverallHousekeeping = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/housekeeping/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getOverallAccounts = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/accounts/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const createSignupInvitation = (userId, token, payload = {}, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/signup-invitation/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "POST",
			headers: overallHeaders(token),
			body: JSON.stringify(payload),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const createOverallSystemAdmin = (userId, token, payload = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/system-admin/${userId}`,
		{
			method: "POST",
			headers: overallHeaders(token),
			body: JSON.stringify(payload),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const updateOverallSystemAdmin = (
	userId,
	token,
	accountId,
	payload = {}
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/system-admin/${accountId}/${userId}`,
		{
			method: "PUT",
			headers: overallHeaders(token),
			body: JSON.stringify(payload),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getOverallSettings = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/settings/${userId}${buildOverallQuery(
			params
		)}`,
		{
			method: "GET",
			headers: overallHeaders(token),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getReservationAgentWalletSnapshot = ({
	reservationId,
	userId,
}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/agent-wallet-snapshot/${reservationId}/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredAuthHeaders(),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const gettingCommissionPaidReservations = (page, records, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-paid-commission/${page}/${records}/${hotelId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const PropertySignup = (userData) => {
	console.log(userData, "userData");
	return fetch(`${process.env.REACT_APP_API_URL}/property-listing`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(userData),
	})
		.then((response) => {
			if (!response.ok) {
				return response.text().then((text) => {
					throw new Error(text);
				});
			}
			return response.json();
		})
		.catch((err) => {
			console.log(err);
			throw err;
		});
};

export const hotelsForAccount = (accountId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/super-admin/${accountId}`,
		{
			method: "GET",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
			},
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getFilteredSupportCases = (token, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases-hotels/active/${hotelId}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getFilteredClosedSupportCases = (token, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases-hotels/closed/${hotelId}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getFilteredClosedSupportCasesClients = (token, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases-hotels-clients/closed/${hotelId}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

// Support Cases Setup For Hotels
export const createNewSupportCase = async (data) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/new`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response was not ok " + response.statusText);
			}
			return response.json();
		})
		.catch((err) => {
			console.error("API error: ", err);
		});
};

export const getSupportCases = (status, token, hotelId) => {
	const url = `${process.env.REACT_APP_API_URL}/support-cases?status=${status}`;
	return fetch(url, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getSupportCaseById = (caseId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/${caseId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

// Fetch unseen messages by Super Admin or PMS Owner
export const getUnseenMessagesCountByAdmin = async (userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/unseen/count?userId=${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response was not ok " + response.statusText);
			}
			return response.json();
		})
		.catch((err) => {
			console.error("API error: ", err);
		});
};

// Fetch unseen messages by Hotel Owner
export const getUnseenMessagesByHotelOwner = async (hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${hotelId}/unseen/hotel-owner`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response was not ok " + response.statusText);
			}
			return response.json();
		})
		.catch((err) => {
			console.error("API error: ", err);
		});
};

// Fetch unseen messages by Regular Client
export const getUnseenMessagesByClient = async (clientId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases-client/${clientId}/unseen`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response was not ok " + response.statusText);
			}
			return response.json();
		})
		.catch((err) => {
			console.error("API error: ", err);
		});
};

// Update seen status for Admin or Owner
export const updateSeenStatusForAdminOrOwner = async (caseId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${caseId}/seen/admin-owner`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response was not ok " + response.statusText);
			}
			return response.json();
		})
		.catch((err) => {
			console.error("API error: ", err);
		});
};

// Update seen status for Regular Client
export const updateSeenStatusForClient = async (caseId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${caseId}/seen/client`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response was not ok " + response.statusText);
			}
			return response.json();
		})
		.catch((err) => {
			console.error("API error: ", err);
		});
};

// Mark all messages as seen by Super Admin
export const markAllMessagesAsSeenByHotel = async (caseId, userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${caseId}/seen-by-hotel`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ userId }), // Pass the current user's ID
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response was not ok " + response.statusText);
			}
			return response.json();
		})
		.catch((err) => {
			console.error("API error: ", err);
		});
};

export const gettingAdminDashboardFigures = (hotelId, params = {}) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			query.append(key, value);
		}
	});
	const queryString = query.toString() ? `?${query.toString()}` : "";

	return fetch(
		`${process.env.REACT_APP_API_URL}/admin-dashboard-reports/${hotelId}${queryString}`,
		{
			method: "GET",
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const readUserId = (userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/user/${userId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`, // Add the token here
		},
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) => console.error("Error fetching reservations:", err));
};

// Start of reports for the admin

// (A) Helper to build the combined query string with both hotel info + any extra params
function buildQueryWithParams(selectedHotels, limit, extraParams = {}) {
	// First build the basic query string for hotels & limit
	let baseQuery = buildHotelsQuery(selectedHotels, limit);

	// Then, if we have extra params, convert them to a query string
	const extraQuery = buildQueryString(extraParams);

	if (extraQuery) {
		// If we already have a base query (e.g. '?hotels=ABC'), then append with '&'
		if (baseQuery) {
			baseQuery += `&${extraQuery}`;
		} else {
			// Otherwise, start fresh with '?'
			baseQuery = `?${extraQuery}`;
		}
	}

	return baseQuery; // e.g. "?hotels=HotelA&limit=20&excludeCancelled=true"
}

/**
 * Build the query string for selectedHotels.
 * If hotels = ["all"], we do NOT filter by hotels.
 * If hotels are multiple, we pass them joined by comma.
 */
function buildHotelsQuery(selectedHotels, limit) {
	let queryArray = [];
	if (selectedHotels && !selectedHotels.includes("all")) {
		queryArray.push(`hotels=${encodeURIComponent(selectedHotels.join(","))}`);
	}
	if (limit) {
		queryArray.push(`limit=${encodeURIComponent(limit)}`);
	}
	return queryArray.length ? "?" + queryArray.join("&") : "";
}

function buildQueryString(params) {
	return Object.entries(params)
		.map(
			([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`,
		)
		.join("&");
}

/* ========================================================================
	 1) Reservations By Day
	 Added optional extraParams so you can pass { excludeCancelled: true }, etc.
	 ======================================================================== */
export const getReservationsByDay = (
	userId,
	token,
	selectedHotels = [],
	extraParams = {},
) => {
	const query = buildQueryWithParams(selectedHotels, null, extraParams);

	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/reservations-by-day/${userId}${query}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching reservationsByDay data:", err),
		);
};

/* ========================================================================
	 2) Checkins By Day
	 ======================================================================== */
export const getCheckinsByDay = (
	userId,
	token,
	selectedHotels = [],
	extraParams = {},
) => {
	const query = buildQueryWithParams(selectedHotels, null, extraParams);

	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/checkins-by-day/${userId}${query}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) => console.error("Error fetching checkinsByDay data:", err));
};

/* ========================================================================
	 3) Checkouts By Day
	 ======================================================================== */
export const getCheckoutsByDay = (
	userId,
	token,
	selectedHotels = [],
	extraParams = {},
) => {
	const query = buildQueryWithParams(selectedHotels, null, extraParams);

	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/checkouts-by-day/${userId}${query}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) => console.error("Error fetching checkoutsByDay data:", err));
};

/* ========================================================================
	 4) Reservations By Day By Hotel Name
	 ======================================================================== */
export const getReservationsByDayByHotelName = (
	userId,
	token,
	selectedHotels = [],
	extraParams = {},
) => {
	const query = buildQueryWithParams(selectedHotels, null, extraParams);

	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/reservations-by-day-by-hotel/${userId}${query}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching reservationsByDayByHotelName data:", err),
		);
};

/* ========================================================================
	 5) Reservations By Booking Status
	 ======================================================================== */
export const getReservationsByBookingStatus = (
	userId,
	token,
	selectedHotels = [],
	extraParams = {},
) => {
	const query = buildQueryWithParams(selectedHotels, null, extraParams);

	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/reservations-by-booking-status/${userId}${query}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching reservationsByBookingStatus data:", err),
		);
};

/* ========================================================================
	 6) Reservations By Hotel Names
	 ======================================================================== */
export const getReservationsByHotelNames = (
	userId,
	token,
	selectedHotels = [],
	extraParams = {},
) => {
	const query = buildQueryWithParams(selectedHotels, null, extraParams);

	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/reservations-by-hotel-names/${userId}${query}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching reservationsByHotelNames data:", err),
		);
};

/* ========================================================================
	 7) Top Hotels By Reservations
	 ======================================================================== */
export const getTopHotelsByReservations = (
	userId,
	token,
	limit = 5,
	selectedHotels = [],
	extraParams = {},
) => {
	const query = buildQueryWithParams(selectedHotels, limit, extraParams);

	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/top-hotels-by-reservations/${userId}${query}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching topHotelsByReservations data:", err),
		);
};

/* ========================================================================
	 8) getSpecificListOfReservations (already takes queryParamsObj)
	 ======================================================================== */
export const getSpecificListOfReservations = (
	userId,
	token,
	queryParamsObj,
) => {
	const queryString = buildQueryString(queryParamsObj);

	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/specific-list/${userId}?${queryString}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching specific list of reservations:", err),
		);
};

export const getPaidBreakdownReportHotel = (
	userId,
	token,
	{ hotelId, searchQuery = "", page = 1, limit = 200 } = {},
) => {
	const params = new URLSearchParams();
	if (hotelId) params.set("hotelId", hotelId);
	if (searchQuery) params.set("searchQuery", searchQuery);
	if (page) params.set("page", String(page));
	if (limit) params.set("limit", String(limit));

	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/hotel-adminreports/paid-breakdown/${userId}?${params.toString()}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			console.error("Error fetching paid breakdown report:", err);
			return { data: [], totalDocuments: 0 };
		});
};

export const getExportToExcelList = (userId, token, queryParamsObj) => {
	const queryString = buildQueryString(queryParamsObj);

	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/export-to-excel/${userId}?${queryString}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching specific list of reservations:", err),
		);
};

export const currencyConversion = (amounts) => {
	const saudimoney = amounts
		.map((amount) => Number(amount).toFixed(2))
		.join(",");
	return fetch(
		`${process.env.REACT_APP_API_URL}/currencyapi-amounts/${saudimoney}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

const API = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
const authHeaders = (token) =>
	token ? { Authorization: `Bearer ${token}` } : {};

/** Owner PayPal client token for Card Fields / Buttons */
export async function getOwnerPayPalClientToken({
	debug = false,
	buyerCountry,
	token,
} = {}) {
	const qs = new URLSearchParams();
	if (debug) qs.set("dbg", "1");
	if (buyerCountry) qs.set("bc", String(buyerCountry).toUpperCase());
	const res = await fetch(
		`${API}/paypal-owner/token-generated${qs.toString() ? `?${qs}` : ""}`,
		{
			method: "GET",
			headers: { ...authHeaders(token) },
		},
	);
	const json = await res.json();
	if (!res.ok)
		throw new Error(
			json?.error ||
				json?.message ||
				"Failed to fetch PayPal client token (owner)",
		);
	const clientToken =
		typeof json === "string"
			? json
			: json.clientToken || json.client_token || json.token;
	const env =
		typeof json === "object" && json && typeof json.env === "string"
			? json.env.toLowerCase()
			: null;
	return { clientToken, env, diag: json?.diag, cached: !!json?.cached };
}

/** Create PayPal vault setup_token for 'card' | 'paypal' | 'venmo' */
export async function createOwnerPayPalSetupToken({
	paymentSource = "card",
	token,
} = {}) {
	const res = await fetch(`${API}/paypal-owner/setup-token`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders(token) },
		body: JSON.stringify({
			payment_source: String(paymentSource).toLowerCase(),
		}),
		credentials: "omit",
	});
	const json = await res.json();
	if (!res.ok || !json?.id)
		throw new Error(json?.message || "Failed to create PayPal setup token");
	return json.id;
}

/** Exchange setup_token -> vault & save on hotel */
export async function saveOwnerVaultCard(
	{ hotelId, setup_token, label, setDefault },
	{ token } = {},
) {
	const { data } = await axios.post(
		`${API}/paypal-owner/vault/exchange`,
		{ hotelId, setup_token, label, setDefault: !!setDefault },
		{
			headers: { "Content-Type": "application/json", ...authHeaders(token) },
			withCredentials: false,
		},
	);
	return data; // { message, ownerPaymentMethods: [...] }
}

/** List stored owner payment methods (non-deleted by default) */
export async function listOwnerPaymentMethods(hotelId, { token } = {}) {
	const { data } = await axios.get(
		`${API}/paypal-owner/payment-methods/${hotelId}`,
		{
			headers: { ...authHeaders(token) },
			withCredentials: false,
		},
	);
	return data;
}

export async function setOwnerDefaultPaymentMethod(
	{ hotelId, methodId, vault_id },
	{ token } = {},
) {
	const { data } = await axios.post(
		`${API}/paypal-owner/payment-methods/set-default`,
		{ hotelId, methodId, vault_id },
		{ headers: { "Content-Type": "application/json", ...authHeaders(token) } },
	);
	return data;
}
export async function activateOwnerPaymentMethod(
	{ hotelId, methodId },
	{ token } = {},
) {
	const { data } = await axios.post(
		`${API}/paypal-owner/payment-methods/activate`,
		{ hotelId, methodId },
		{ headers: { "Content-Type": "application/json", ...authHeaders(token) } },
	);
	return data;
}
export async function deactivateOwnerPaymentMethod(
	{ hotelId, methodId },
	{ token } = {},
) {
	const { data } = await axios.post(
		`${API}/paypal-owner/payment-methods/deactivate`,
		{ hotelId, methodId },
		{ headers: { "Content-Type": "application/json", ...authHeaders(token) } },
	);
	return data;
}
export async function deleteOwnerPaymentMethod(
	{ hotelId, methodId },
	{ token } = {},
) {
	const { data } = await axios.post(
		`${API}/paypal-owner/payment-methods/delete`,
		{ hotelId, methodId },
		{ headers: { "Content-Type": "application/json", ...authHeaders(token) } },
	);
	return data;
}

/** GET /paypal-owner/commissions (token optional) */
export async function listHotelCommissions(params, { token } = {}) {
	const qs = new URLSearchParams({
		...params,
		_ts: Date.now().toString(),
	}).toString();
	const res = await fetch(`${API}/paypal-owner/commissions?${qs}`, {
		headers: { ...authHeaders(token) },
		cache: "no-store",
	});
	if (!res.ok) throw new Error("Failed to list commissions");
	return res.json();
}

/** GET /finance/overview (token optional) */
export async function getHotelFinanceOverview(hotelId, { token } = {}) {
	const qs = new URLSearchParams({
		hotelId,
		_ts: Date.now().toString(),
	}).toString();
	const res = await fetch(`${API}/finance/overview?${qs}`, {
		headers: { ...authHeaders(token) },
		cache: "no-store",
	});
	if (!res.ok) throw new Error("Failed to load finance overview");
	return res.json();
}

/** POST /paypal-owner/commissions/charge — server captures USD and only then flips commission flags. */
export async function chargeOwnerCommissions(body, { token } = {}) {
	const res = await fetch(`${API}/paypal-owner/commissions/charge`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders(token) },
		body: JSON.stringify(body),
		credentials: "omit",
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json?.message || "Charge failed");
	return json; // { ok, capture, batch, reservationsUpdated: [...] }
}

/** (If you still need it) POST /paypal-owner/commissions/mark-paid */
export async function markCommissionPaid(payload, { token } = {}) {
	const res = await fetch(`${API}/paypal-owner/commissions/mark-paid`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders(token) },
		body: JSON.stringify(payload),
	});
	if (!res.ok) throw new Error("Failed to mark commission paid");
	return res.json();
}

const b2bJsonRequest = async (url, { method = "GET", token, body } = {}) => {
	const res = await fetch(url, {
		method,
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...authHeaders(token),
			...getStoredAuthHeaders(),
		},
		body: body ? JSON.stringify(body) : undefined,
		cache: "no-store",
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error || data?.message || "Chat request failed");
	}
	return data;
};

export const getB2BChatRecipients = (userId, token) =>
	b2bJsonRequest(`${API}/b2b-chat/recipients/${userId}`, { token });

export const listB2BChats = (userId, token, params = {}) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			query.set(key, value);
		}
	});
	return b2bJsonRequest(
		`${API}/b2b-chat/chats/${userId}${query.toString() ? `?${query}` : ""}`,
		{ token },
	);
};

export const getB2BChatUnreadSummary = (userId, token) =>
	b2bJsonRequest(`${API}/b2b-chat/unread/${userId}`, { token });

export const readB2BChat = (chatId, userId, token) =>
	b2bJsonRequest(`${API}/b2b-chat/${chatId}/${userId}`, { token });

export const startB2BChat = (userId, token, payload = {}) =>
	b2bJsonRequest(`${API}/b2b-chat/start/${userId}`, {
		method: "POST",
		token,
		body: payload,
	});

export const sendB2BChatMessage = (chatId, userId, token, payload = {}) =>
	b2bJsonRequest(`${API}/b2b-chat/${chatId}/message/${userId}`, {
		method: "POST",
		token,
		body: payload,
	});

export const markB2BChatSeen = (chatId, userId, token) =>
	b2bJsonRequest(`${API}/b2b-chat/${chatId}/seen/${userId}`, {
		method: "POST",
		token,
		body: {},
	});

export const closeB2BChat = (chatId, userId, token, reason = "manual") =>
	b2bJsonRequest(`${API}/b2b-chat/${chatId}/close/${userId}`, {
		method: "POST",
		token,
		body: { reason },
	});
