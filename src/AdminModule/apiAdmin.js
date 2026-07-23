import axios from "axios";
import { isJwtExpired, stopDashboardPreview } from "../auth";

const authHeaders = (token) =>
	token ? { Authorization: `Bearer ${token}` } : {};

const isAdminRoutePath = () =>
	typeof window !== "undefined" &&
	String(window.location?.pathname || "").startsWith("/admin");

const getStoredBaseAuthHeaders = () => {
	try {
		if (typeof window === "undefined") return {};
		const raw = localStorage.getItem("jwt");
		const parsed = raw ? JSON.parse(raw) : null;
		if (parsed?.token && isJwtExpired(parsed.token)) {
			localStorage.removeItem("jwt");
			localStorage.removeItem("dashboardPreviewAuth");
			return {};
		}
		return parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {};
	} catch (error) {
		return {};
	}
};

const getStoredActiveAuthHeaders = () => {
	try {
		if (typeof window === "undefined") return {};
		if (isAdminRoutePath()) {
			return getStoredBaseAuthHeaders();
		}
		const previewRaw = localStorage.getItem("dashboardPreviewAuth");
		const preview = previewRaw ? JSON.parse(previewRaw) : null;
		if (preview?.auth?.token) {
			if (isJwtExpired(preview.auth.token)) {
				stopDashboardPreview();
				return getStoredBaseAuthHeaders();
			}
			return { Authorization: `Bearer ${preview.auth.token}` };
		}
		return getStoredBaseAuthHeaders();
	} catch (error) {
		return {};
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

export const createHotelDetails = (userId, token, hotelDetails) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/create/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(hotelDetails),
		},
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getHotelDetails = (userId, options = {}) => {
	const query = new URLSearchParams();
	if (options.view) query.set("view", options.view);
	if (options.summary) query.set("view", "summary");
	const suffix = query.toString() ? `?${query.toString()}` : "";
	return fetch(`${process.env.REACT_APP_API_URL}/hotel-details/${userId}${suffix}`, {
		method: "GET",
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createRooms = (userId, token, room) => {
	return fetch(`${process.env.REACT_APP_API_URL}/room/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(room),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getHotelRooms = (userId, hotelId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/room/${userId}/${hotelId}`, {
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

export const gettingHotelDetailsForAdmin = (userId, token, query = "") =>
	fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/admin/${userId}${
			query ? "?" + query : ""
		}`,
		{
			headers: { Authorization: `Bearer ${token}` },
		},
	)
		.then((res) => res.json())
		.catch((err) => console.error(err));

export const gettingHotelDetailsForAdminAll = (userId, token, query = "") =>
	fetch(
		`${process.env.REACT_APP_API_URL}/all/hotel-details/admin/${userId}${
			query ? "?" + query : ""
		}`,
		{
			headers: { Authorization: `Bearer ${token}` },
		},
	)
		.then((res) => res.json())
		.catch((err) => console.error(err));

export const updateAdminHotelActivation = (
	hotelId,
	userId,
	token,
	payload = {},
) =>
	fetch(
		`${process.env.REACT_APP_API_URL}/admin/hotel-details/${hotelId}/activation/${userId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			},
			body: JSON.stringify(payload),
		},
	)
		.then((res) => res.json())
		.catch((err) => ({
			error: err?.message || "Could not update hotel activation.",
		}));

const buildQuery = (params = {}) => {
	const searchParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "") return;
		searchParams.set(key, Array.isArray(value) ? value.join(",") : value);
	});
	const query = searchParams.toString();
	return query ? `?${query}` : "";
};

const buildAdminAccountQuery = (params = {}) => {
	const searchParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "") return;
		searchParams.set(key, Array.isArray(value) ? value.join(",") : value);
	});
	const query = searchParams.toString();
	return query ? `?${query}` : "";
};

export const getAdminAccounts = (userId, token, params = {}) =>
	fetch(
		`${process.env.REACT_APP_API_URL}/admin/accounts/${userId}${buildAdminAccountQuery(
			params,
		)}`,
		{
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((res) => res.json())
		.catch((err) => console.error(err));

export const createAdminHotelStaffAccount = (userId, token, payload = {}) =>
	fetch(`${process.env.REACT_APP_API_URL}/admin/accounts/hotel-staff/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(payload),
	})
		.then((res) => res.json())
		.catch((err) => console.error(err));

export const createAdminPlatformStaffAccount = (userId, token, payload = {}) =>
	fetch(`${process.env.REACT_APP_API_URL}/admin/accounts/platform-staff/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(payload),
	})
		.then((res) => res.json())
		.catch((err) => console.error(err));

export const updateAdminAccount = (userId, token, accountId, payload = {}) =>
	fetch(`${process.env.REACT_APP_API_URL}/admin/accounts/${accountId}/${userId}`, {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(payload),
	})
		.then((res) => res.json())
		.catch((err) => console.error(err));

const adminGlobalHotelSettingsHeaders = (token = "") => ({
	Accept: "application/json",
	"Content-Type": "application/json",
	...authHeaders(token),
	...getStoredActiveAuthHeaders(),
});

export const getAdminGlobalHotelSettings = (userId, token) =>
	fetch(
		`${process.env.REACT_APP_API_URL}/admin/global-hotel-settings/overview/${userId}`,
		{
			method: "GET",
			headers: adminGlobalHotelSettingsHeaders(token),
		},
	)
		.then((res) => res.json())
		.catch((err) => {
			console.error(err);
			return { error: "Could not load global hotel settings." };
		});

export const getAdminGlobalRoomManagerOptions = (userId, token) =>
	fetch(
		`${process.env.REACT_APP_API_URL}/admin/global-hotel-settings/room-manager/${userId}`,
		{
			method: "GET",
			headers: adminGlobalHotelSettingsHeaders(token),
		},
	)
		.then((res) => res.json())
		.catch((err) => {
			console.error(err);
			return { error: "Could not load global room options." };
		});

export const saveAdminGlobalRoomManagerRoom = (
	userId,
	token,
	payload = {},
) =>
	fetch(
		`${process.env.REACT_APP_API_URL}/admin/global-hotel-settings/room-manager/${userId}`,
		{
			method: "POST",
			headers: adminGlobalHotelSettingsHeaders(token),
			body: JSON.stringify(payload),
		},
	)
		.then((res) => res.json())
		.catch((err) => {
			console.error(err);
			return { error: "Could not save global room settings." };
		});

export const getAdminGlobalCalendarPricingOptions = (userId, token) =>
	fetch(
		`${process.env.REACT_APP_API_URL}/admin/global-hotel-settings/calendar-pricing/${userId}`,
		{
			method: "GET",
			headers: adminGlobalHotelSettingsHeaders(token),
		},
	)
		.then((res) => res.json())
		.catch((err) => {
			console.error(err);
			return { error: "Could not load global calendar pricing options." };
		});

export const saveAdminGlobalCalendarPricing = (
	userId,
	token,
	payload = {},
) =>
	fetch(
		`${process.env.REACT_APP_API_URL}/admin/global-hotel-settings/calendar-pricing/${userId}`,
		{
			method: "POST",
			headers: adminGlobalHotelSettingsHeaders(token),
			body: JSON.stringify(payload),
		},
	)
		.then((res) => res.json())
		.catch((err) => {
			console.error(err);
			return { error: "Could not save global calendar pricing." };
		});

export const sendReservationConfirmationSMS = (reservationId, opts = {}) => {
	const params = { notifyAdmins: opts.notifyAdmins ? "true" : "false" };
	return axios
		.post(
			`${process.env.REACT_APP_API_URL}/reservations/${reservationId}/wa/confirmation`,
			null,
			{ params },
		)
		.then((res) => res.data)
		.catch((err) => {
			if (err?.response?.data) return err.response.data;
			return { ok: false, message: "Network error" };
		});
};

export const sendReservationConfirmationSMSManualAdmin = (
	reservationId,
	payload = {},
	opts = {},
) => {
	const params = { notifyAdmins: opts.notifyAdmins ? "true" : "false" };
	return axios
		.post(
			`${process.env.REACT_APP_API_URL}/admin/reservations/${reservationId}/wa/confirmation-manual`,
			payload,
			{ params },
		)
		.then((res) => res.data)
		.catch((err) => {
			if (err?.response?.data) return err.response.data;
			return { ok: false, message: "Network error" };
		});
};

export const sendReservationPaymentLinkSMSManualAdmin = (
	reservationId,
	payload = {},
) => {
	return axios
		.post(
			`${process.env.REACT_APP_API_URL}/admin/reservations/${reservationId}/wa/payment-link-manual`,
			payload,
		)
		.then((res) => res.data)
		.catch((err) => {
			if (err?.response?.data) return err.response.data;
			return { ok: false, message: "Network error" };
		});
};

export const getSingleInboundEmailAudit = (inboundEmailId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/inbound-emails/single/${inboundEmailId}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
			return { error: "Could not load inbound email." };
		});
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

export const JanatWebsite = (documentId, JanatWebsite) => {
	return fetch(`${process.env.REACT_APP_API_URL}/janat-website/${documentId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(JanatWebsite),
		// body: image,
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getJanatWebsiteRecord = () => {
	return fetch(`${process.env.REACT_APP_API_URL}/janat-website-document`, {
		method: "GET",
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createHotelReviewInvitation = (
	reservationId,
	userId,
	token,
	{ language = "en", replace = false } = {},
) => {
	const normalizedLanguage = language === "ar" ? "ar" : "en";
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-reviews/invitations/${encodeURIComponent(
			reservationId,
		)}/${encodeURIComponent(userId)}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			},
			body: JSON.stringify({
				language: normalizedLanguage,
				replace: replace === true,
			}),
		},
	)
		.then(async (response) => {
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					...localizeApiError(
						data,
						"Could not create the guest review link.",
					),
					success: false,
				};
			}
			return data;
		})
		.catch((error) => ({
			success: false,
			error: error?.message || "Could not create the guest review link.",
		}));
};

const GUEST_CARD_PREVIEW_TIMEOUT_MS = 20 * 1000;
const GUEST_CARD_EMAIL_TIMEOUT_MS = 180 * 1000;

const fetchAdminGuestCardJson = async (
  url,
  options = {},
  timeoutMs = GUEST_CARD_PREVIEW_TIMEOUT_MS,
) => {
  const controller =
    typeof AbortController === "function" ? new AbortController() : null;
  const externalSignal = options.signal;
  const forwardAbort = () => controller?.abort();
  if (externalSignal?.aborted) forwardAbort();
  else
    externalSignal?.addEventListener?.("abort", forwardAbort, { once: true });
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller?.abort();
      const error = new Error("The Guest Card request timed out.");
      error.name = "AbortError";
      reject(error);
    }, timeoutMs);
  });
  try {
    const { signal: _externalSignal, ...requestOptions } = options;
    return await Promise.race([
      Promise.resolve().then(async () => {
        const response = await fetch(url, {
          ...requestOptions,
          ...(controller ? { signal: controller.signal } : {}),
        });
        const data = await response.json().catch(() => ({}));
        return { response, data };
      }),
      timeout,
    ]);
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener?.("abort", forwardAbort);
  }
};

const guestCardRequestFailure = (error, fallback) => ({
  success: false,
  error:
    error?.name === "AbortError"
      ? "The Guest Card request timed out or was cancelled."
      : error?.message || fallback,
});

export const getAdminReservationGuestCard = (
  reservationId,
  userId,
  token,
  { signal } = {},
) => {
  if (!reservationId || !userId) {
    return Promise.resolve({
      success: false,
      error: "Reservation and employee identifiers are required.",
    });
  }
  return fetchAdminGuestCardJson(
    `${process.env.REACT_APP_API_URL}/admin/reservations/${encodeURIComponent(
      reservationId,
    )}/guest-card/${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getStoredActiveAuthHeaders(),
        ...authHeaders(token),
      },
      cache: "no-store",
      signal,
    },
  )
    .then(({ response, data }) =>
      response.ok
        ? data
        : {
            ...localizeApiError(data, "Could not load the Guest Card."),
            success: false,
          },
    )
    .catch((error) =>
      guestCardRequestFailure(error, "Could not load the Guest Card."),
    );
};

export const emailAdminReservationGuestCard = (
  reservationId,
  userId,
  token,
  recipientEmail,
  { signal } = {},
) => {
  if (!reservationId || !userId) {
    return Promise.resolve({
      success: false,
      error: "Reservation and employee identifiers are required.",
    });
  }
  return fetchAdminGuestCardJson(
    `${process.env.REACT_APP_API_URL}/admin/reservations/${encodeURIComponent(
      reservationId,
    )}/guest-card/email/${encodeURIComponent(userId)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...getStoredActiveAuthHeaders(),
        ...authHeaders(token),
      },
      body: JSON.stringify({
        recipientEmail: String(recipientEmail || "").trim(),
      }),
      signal,
    },
    GUEST_CARD_EMAIL_TIMEOUT_MS,
  )
    .then(({ response, data }) =>
      response.ok
        ? data
        : {
            ...localizeApiError(data, "Could not send the Guest Card email."),
            success: false,
          },
    )
    .catch((error) =>
      guestCardRequestFailure(error, "Could not send the Guest Card email."),
    );
};

const buildHotelReviewAdminQuery = (filters = {}) => {
	const params = new URLSearchParams();
	Object.entries(filters || {}).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "") return;
		const normalizedValue = String(value).trim();
		if (!normalizedValue || normalizedValue === "all") return;
		params.set(key, normalizedValue);
	});
	return params.toString();
};

const HOTEL_REVIEW_ADMIN_TIMEOUT_MS = 15 * 1000;

const fetchHotelReviewAdminJson = async (url, options = {}) => {
	const controller =
		typeof AbortController === "function" ? new AbortController() : null;
	let timeoutId;
	const timeout = new Promise((resolve, reject) => {
		timeoutId = setTimeout(() => {
			controller?.abort();
			const error = new Error("The review request timed out.");
			error.name = "AbortError";
			reject(error);
		}, HOTEL_REVIEW_ADMIN_TIMEOUT_MS);
	});

	try {
		return await Promise.race([
			Promise.resolve().then(async () => {
				const response = await fetch(url, {
					...options,
					...(controller ? { signal: controller.signal } : {}),
				});
				const data = await response.json().catch(() => ({}));
				return { response, data };
			}),
			timeout,
		]);
	} finally {
		clearTimeout(timeoutId);
	}
};

const hotelReviewAdminRequestError = (error, fallback) =>
	error?.name === "AbortError"
		? localizeApiError({}, fallback).error
		: error?.message || fallback;

export const getAdminHotelReviews = (userId, token, filters = {}) => {
	const query = buildHotelReviewAdminQuery(filters);
	return fetchHotelReviewAdminJson(
		`${process.env.REACT_APP_API_URL}/admin/hotel-reviews/${encodeURIComponent(
			userId,
		)}${query ? `?${query}` : ""}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			},
			cache: "no-store",
		},
	)
		.then(({ response, data }) => {
			if (!response.ok) {
				return {
					...localizeApiError(data, "Could not load hotel reviews."),
					success: false,
					reviews: [],
					pagination: {},
					summary: {},
					hotels: [],
				};
			}
			return data;
		})
		.catch((error) => ({
			success: false,
			error: hotelReviewAdminRequestError(
				error,
				"Could not load hotel reviews.",
			),
			reviews: [],
			pagination: {},
			summary: {},
			hotels: [],
		}));
};

export const getAdminHotelReviewReservationDetails = (
	reservationId,
	userId,
	token,
) => {
	if (!reservationId || !userId || !token) {
		return Promise.resolve({
			success: false,
			error: "Reservation, employee, and authentication details are required.",
		});
	}
	return fetchHotelReviewAdminJson(
		`${process.env.REACT_APP_API_URL}/admin/hotel-reviews/reservation-details/${encodeURIComponent(
			reservationId,
		)}/${encodeURIComponent(userId)}?view=details`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			},
			cache: "no-store",
		},
	)
		.then(({ response, data }) =>
			response.ok
				? data
				: {
						...localizeApiError(
							data,
							"Could not load reservation details.",
						),
						success: false,
					},
		)
		.catch((error) => ({
			success: false,
			error: hotelReviewAdminRequestError(
				error,
				"Could not load reservation details.",
			),
		}));
};

const updateAdminHotelReviewModeration = (
	reviewId,
	userId,
	token,
	payload,
) => {
	return fetchHotelReviewAdminJson(
		`${process.env.REACT_APP_API_URL}/admin/hotel-reviews/${encodeURIComponent(
			reviewId,
		)}/status/${encodeURIComponent(userId)}`,
		{
			method: "PATCH",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			},
			body: JSON.stringify(payload),
		},
	)
		.then(({ response, data }) => {
			if (!response.ok) {
				return {
					...localizeApiError(data, "Could not update the review visibility."),
					success: false,
				};
			}
			return data;
		})
		.catch((error) => ({
			success: false,
			error: hotelReviewAdminRequestError(
				error,
				"Could not update the review visibility.",
			),
		}));
};

export const updateAdminHotelReviewStatus = (
	reviewId,
	userId,
	token,
	status,
) =>
	updateAdminHotelReviewModeration(reviewId, userId, token, {
		status: status === "inactive" ? "inactive" : "active",
	});

export const updateAdminHotelReviewVisibility = (
	reviewId,
	userId,
	token,
	visibility = {},
) => {
	const payload = {};
	if (typeof visibility?.ratingVisible === "boolean") {
		payload.ratingVisible = visibility.ratingVisible;
	}
	if (typeof visibility?.commentVisible === "boolean") {
		payload.commentVisible = visibility.commentVisible;
	}
	if (!Object.keys(payload).length) {
		return Promise.resolve({
			success: false,
			error: "Choose a valid rating or comment visibility setting.",
		});
	}
	return updateAdminHotelReviewModeration(reviewId, userId, token, payload);
};

export const gettingAllHotelAccounts = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/all-hotel-accounts/${userId}`,
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

export const getSupportChatRecipients = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/recipients/${userId}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...authHeaders(token),
				...getStoredActiveAuthHeaders(),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
			return { error: "Could not load support chat recipients" };
	});
};

export const getAdminHotelNotificationFeed = ({
	userId,
	token,
	limit = 8,
}) => {
	const query = new URLSearchParams();
	if (limit) query.append("limit", limit);
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		supportCaseFreshUrl(`/reservations/notifications/pending-confirmation/${userId}${queryString}`),
		{
			method: "GET",
			headers: supportCaseNoCacheHeaders({
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			}),
			cache: "no-store",
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			error: err?.message || "Could not load hotel notifications",
			total: 0,
			data: [],
		}));
};

export const getAdminSupportNotificationSummary = (userId, token) => {
	return fetch(
		supportCaseFreshUrl(`/support-cases/notifications/summary/${userId}`),
		{
			method: "GET",
			headers: supportCaseNoCacheHeaders({
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			}),
			cache: "no-store",
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			error: err?.message || "Could not load support notifications",
			openCases: 0,
			activeEscalatedClientCases: 0,
			unseenMessages: 0,
		}));
};

export const getAdminB2BChatUnreadSummary = (userId, token) => {
	return fetch(supportCaseFreshUrl(`/b2b-chat/unread/${userId}`), {
		method: "GET",
		headers: supportCaseNoCacheHeaders({
			Accept: "application/json",
			"Content-Type": "application/json",
			...getStoredActiveAuthHeaders(),
			...authHeaders(token),
		}),
		cache: "no-store",
	})
		.then((response) => response.json())
		.catch((err) => ({
			error: err?.message || "Could not load B2B chat notifications",
			unreadChats: 0,
			unreadMessages: 0,
			activeChats: 0,
		}));
};

export const listAdminB2BChats = (userId, token, params = {}) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			query.set(key, value);
		}
	});
	const suffix = query.toString() ? `?${query.toString()}` : "";
	return fetch(`${process.env.REACT_APP_API_URL}/b2b-chat/chats/${userId}${suffix}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...getStoredActiveAuthHeaders(),
			...authHeaders(token),
		},
		cache: "no-store",
	})
		.then((response) => response.json())
		.catch((err) => ({
			error: err?.message || "Could not load B2B chats",
			chats: [],
		}));
};

export const acknowledgeAdminHotelNotification = ({
	userId,
	token,
	ackKey = "",
	notificationType = "",
	entityId = "",
	reservationId = "",
	walletTransactionId = "",
}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/notifications/pending-confirmation/${userId}/acknowledge`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			},
			body: JSON.stringify({
				ackKey,
				notificationType,
				entityId,
				reservationId,
				walletTransactionId,
			}),
		},
	).then((response) => response.json());
};

export const reassignHotelOwner = (
	hotelId,
	userId,
	token,
	{ newOwnerId, transferExistingReservations = true },
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/reassign-owner/${hotelId}/${userId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ newOwnerId, transferExistingReservations }),
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
		});
};

// Create a new support case
export const createSupportCase = async (data) => {
	try {
		const response = await fetch(
			`${process.env.REACT_APP_API_URL}/support-cases/new`,
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			},
		);
		return await response.json();
	} catch (error) {
		console.error("Error creating support case:", error);
		throw error;
	}
};

export const updateSupportCase = (caseId, data, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/${caseId}`, {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...getStoredActiveAuthHeaders(),
			...authHeaders(token),
		},
		body: JSON.stringify(data),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

function supportCaseFreshUrl(path) {
	const separator = path.includes("?") ? "&" : "?";
	return `${process.env.REACT_APP_API_URL}${path}${separator}_=${Date.now()}`;
}

function supportCaseNoCacheHeaders(headers = {}) {
	return {
		...headers,
		"Cache-Control": "no-cache",
		Pragma: "no-cache",
	};
}

export const getFilteredSupportCases = (token) => {
	return fetch(supportCaseFreshUrl("/support-cases/active"), {
		method: "GET",
		cache: "no-store",
		headers: supportCaseNoCacheHeaders({
			"Content-Type": "application/json",
			Accept: "application/json",
			...getStoredActiveAuthHeaders(),
			...authHeaders(token),
		}),
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getFilteredSupportCasesClients = (token) => {
	return fetch(
		supportCaseFreshUrl("/support-cases-clients/active"),
		{
			method: "GET",
			cache: "no-store",
			headers: supportCaseNoCacheHeaders({
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			}),
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getEscalatedClientSupportCases = (token) => {
	return fetch(
		supportCaseFreshUrl("/support-cases-clients/escalated"),
		{
			method: "GET",
			cache: "no-store",
			headers: supportCaseNoCacheHeaders({
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			}),
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const createAiTrainingChat = (payload = {}, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/aiagent-learning/chats`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			...getStoredActiveAuthHeaders(),
			...authHeaders(token),
		},
		body: JSON.stringify(payload),
	})
		.then((response) => response.json())
		.catch((err) => ({
			error: err?.message || "Could not save AI training chat",
		}));
};

export const getAiTrainingChats = (token, params = {}) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "") return;
		query.set(key, value);
	});
	const suffix = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		`${process.env.REACT_APP_API_URL}/aiagent-learning/chats${suffix}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			error: err?.message || "Could not load AI training chats",
			chats: [],
		}));
};

export const getFilteredClosedSupportCases = (token) => {
	return fetch(supportCaseFreshUrl("/support-cases/closed"), {
		method: "GET",
		cache: "no-store",
		headers: supportCaseNoCacheHeaders({
			"Content-Type": "application/json",
			Accept: "application/json",
			...getStoredActiveAuthHeaders(),
			...authHeaders(token),
		}),
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getFilteredClosedSupportCasesClients = (token, params = {}) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "") return;
		query.set(key, value);
	});
	const suffix = query.toString() ? `?${query.toString()}` : "";
	return fetch(
		supportCaseFreshUrl(`/support-cases/closed/clients${suffix}`),
		{
			method: "GET",
			cache: "no-store",
			headers: supportCaseNoCacheHeaders({
				"Content-Type": "application/json",
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			}),
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
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

// Support Cases Setup For Super Admin
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

export const getSupportCases = (status, token) => {
	const url = supportCaseFreshUrl(`/support-cases?status=${status}`);
	return fetch(url, {
		method: "GET",
		cache: "no-store",
		headers: supportCaseNoCacheHeaders({
			Accept: "application/json",
			"Content-Type": "application/json",
			...getStoredActiveAuthHeaders(),
			...authHeaders(token),
		}),
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getSupportCaseById = (caseId, token) => {
	return fetch(supportCaseFreshUrl(`/support-cases/${caseId}`), {
		method: "GET",
		cache: "no-store",
		headers: supportCaseNoCacheHeaders({
			Accept: "application/json",
			"Content-Type": "application/json",
			...getStoredActiveAuthHeaders(),
			...authHeaders(token),
		}),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateSeenByCustomer = async (caseId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases-customer/${caseId}/seen`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...getStoredActiveAuthHeaders(),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			console.error("API error: ", err);
		});
};

export const deleteSpecificMessage = async (caseId, messageId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${caseId}/messages/${messageId}`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			console.error("API error: ", err);
		});
};

// Fetch unseen messages by Super Admin or PMS Owner
export const getUnseenMessagesCountByAdmin = async (userId) => {
	return fetch(
		supportCaseFreshUrl(`/support-cases/unseen/count?userId=${userId}`),
		{
			method: "GET",
			cache: "no-store",
			headers: supportCaseNoCacheHeaders({
				Accept: "application/json",
				...getStoredActiveAuthHeaders(),
			}),
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
		supportCaseFreshUrl(`/support-cases/${hotelId}/unseen/hotel-owner`),
		{
			method: "GET",
			cache: "no-store",
			headers: supportCaseNoCacheHeaders({
				Accept: "application/json",
			}),
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
		supportCaseFreshUrl(`/support-cases-client/${clientId}/unseen`),
		{
			method: "GET",
			cache: "no-store",
			headers: supportCaseNoCacheHeaders({
				Accept: "application/json",
			}),
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

export const markAllMessagesAsSeenByAdmin = async (caseId, userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${caseId}/seen-by-admin`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...getStoredActiveAuthHeaders(),
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

export const agodaData = (accountId, belongsTo, file, userId, token) => {
	let formData = new FormData();
	formData.append("file", file);

	console.log(file);

	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/agoda-data-dump/xhotel-admin/${accountId}/${belongsTo}/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`, // Add the token here
			},
			body: formData, // Use FormData as the body
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) => console.error("Error uploading file:", err));
};

export const expediaData = (accountId, belongsTo, file, userId, token) => {
	let formData = new FormData();
	formData.append("file", file);

	console.log(file);

	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/expedia-data-dump/xhotel-admin/${accountId}/${belongsTo}/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`, // Add the token here
			},
			body: formData, // Use FormData as the body
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) => console.error("Error uploading file:", err));
};

// apiAdmin.js

export const getAllReservationForAdmin = (
	userId,
	token,
	{
		page = 1,
		limit = 100,
		searchQuery = "",
		filterType = "",

		// NEW optional filters
		reservedBy = "",
		bookingSource = "",

		checkinDate = "",
		checkinFrom = "",
		checkinTo = "",

		checkoutDate = "",
		checkoutFrom = "",
		checkoutTo = "",

		createdDate = "",
		createdFrom = "",
		createdTo = "",
	} = {},
) => {
	const params = new URLSearchParams({
		page,
		limit,
	});

	if (searchQuery.trim()) params.set("searchQuery", searchQuery);
	if (filterType.trim()) params.set("filterType", filterType);

	// reservedBy (exact, case-insensitive on server)
	if (reservedBy && reservedBy.trim()) {
		params.set("reservedBy", reservedBy.trim());
	}

	// NEW: bookingSource (exact, case-insensitive on server)
	if (bookingSource && bookingSource.trim()) {
		params.set("bookingSource", bookingSource.trim());
	}

	// date filters
	const setIf = (key, val) => {
		if (val && String(val).trim()) params.set(key, String(val).trim());
	};

	setIf("checkinDate", checkinDate);
	setIf("checkinFrom", checkinFrom);
	setIf("checkinTo", checkinTo);

	setIf("checkoutDate", checkoutDate);
	setIf("checkoutFrom", checkoutFrom);
	setIf("checkoutTo", checkoutTo);

	setIf("createdDate", createdDate);
	setIf("createdFrom", createdFrom);
	setIf("createdTo", createdTo);

	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/all-reservations-list-admin/${userId}?${params.toString()}`,
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
		.catch((err) => console.error("Error fetching reservations:", err));
};

const buildAdminReservationCycleQuery = (params = {}) => {
	const searchParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "") return;
		const normalized = Array.isArray(value) ? value.join(",") : String(value);
		if (normalized.trim()) searchParams.set(key, normalized.trim());
	});
	const query = searchParams.toString();
	return query ? `?${query}` : "";
};

const getAdminReservationCycleData = (
	path,
	userId,
	token,
	params = {},
) =>
	fetch(
		`${process.env.REACT_APP_API_URL}${path}/${userId}${buildAdminReservationCycleQuery(
			params,
		)}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredActiveAuthHeaders(),
			},
			cache: "no-store",
		},
	)
		.then(async (response) => {
			const data = await response.json();
			if (!response.ok) {
				return localizeApiError(
					data,
					"Could not load the admin reservation cycle.",
				);
			}
			return data;
		})
		.catch((error) => ({
			error: error?.message || "Could not load the admin reservation cycle.",
			reservations: [],
			hotels: [],
			total: 0,
		}));

export const getAdminPendingConfirmationReservations = (
	userId,
	token,
	params = {},
) =>
	getAdminReservationCycleData(
		"/admin/reservation-cycle/pending-confirmations",
		userId,
		token,
		params,
	);

export const exportAdminPendingConfirmationReservations = (
	userId,
	token,
	params = {},
) =>
	getAdminReservationCycleData(
		"/admin/reservation-cycle/pending-confirmations-export",
		userId,
		token,
		params,
	);

export const getAdminPendingFinanceReservations = (
	userId,
	token,
	params = {},
) =>
	getAdminReservationCycleData(
		"/admin/reservation-cycle/pending-finance",
		userId,
		token,
		params,
	);

const buildAdminRejectedReservationQuery = (params = {}) => {
	const searchParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "") return;
		const stringValue = String(value).trim();
		if (!stringValue) return;
		searchParams.set(key, stringValue);
	});
	const query = searchParams.toString();
	return query ? `?${query}` : "";
};

export const getAdminRejectedReservations = (userId, token, params = {}) => {
	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/admin/rejected-reservations/${userId}${buildAdminRejectedReservationQuery(
			params,
		)}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredActiveAuthHeaders(),
			},
			cache: "no-store",
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			success: false,
			error: err?.message || "Could not load rejected reservations",
			data: [],
			totalDocuments: 0,
		}));
};

export const exportAdminRejectedReservations = (
	userId,
	token,
	params = {},
) => {
	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/admin/rejected-reservations-export/${userId}${buildAdminRejectedReservationQuery(
			params,
		)}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredActiveAuthHeaders(),
			},
			cache: "no-store",
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			success: false,
			error: err?.message || "Could not export rejected reservations",
			data: [],
			totalDocuments: 0,
		}));
};

export const getOtaReservationsForAdmin = (
	userId,
	token,
	{
		page = 1,
		limit = 50,
		searchQuery = "",
		bookingSource = "",
		checkinFrom = "",
		checkinTo = "",
		checkoutFrom = "",
		checkoutTo = "",
		createdFrom = "",
		createdTo = "",
	} = {},
) => {
	const params = new URLSearchParams({ page, limit });
	const setIf = (key, value) => {
		if (value && String(value).trim()) params.set(key, String(value).trim());
	};
	setIf("searchQuery", searchQuery);
	setIf("bookingSource", bookingSource);
	setIf("checkinFrom", checkinFrom);
	setIf("checkinTo", checkinTo);
	setIf("checkoutFrom", checkoutFrom);
	setIf("checkoutTo", checkoutTo);
	setIf("createdFrom", createdFrom);
	setIf("createdTo", createdTo);

	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservations/${userId}?${params.toString()}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredActiveAuthHeaders(),
			},
			cache: "no-store",
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			success: false,
			error: err?.message || "Could not load OTA reservations",
			data: [],
			totalDocuments: 0,
		}));
};

export const getOtaAssignableHotels = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservations/hotels/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredActiveAuthHeaders(),
			},
			cache: "no-store",
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			success: false,
			error: err?.message || "Could not load hotels",
			hotels: [],
		}));
};

export const getAdminReservationById = (reservationId, token = "", options = {}) => {
	const query = new URLSearchParams({ view: "details" });
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/single-reservation/${reservationId}?${query.toString()}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...authHeaders(token),
				...getStoredActiveAuthHeaders(),
			},
			cache: "no-store",
			signal: options.signal,
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			if (err?.name === "AbortError") throw err;
			return {
				error: err?.message || "Could not load reservation details",
			};
		});
};

export const prepareOtaReservationSyncJob = (
	userId,
	payload = {},
	token = "",
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservation-sync/jobs/${userId}/prepare`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...authHeaders(token),
				...getStoredActiveAuthHeaders(),
			},
			body: JSON.stringify(payload),
		},
	)
		.then(async (response) => {
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					ok: false,
					error:
						data?.error ||
						data?.message ||
						"Could not prepare OTA reservation sync job.",
				};
			}
			return data;
		})
		.catch((err) => ({
			ok: false,
			error: err?.message || "Could not prepare OTA reservation sync job.",
		}));
};

export const prepareExpediaReservationSyncJob = (
	userId,
	payload = {},
	token = "",
) =>
	prepareOtaReservationSyncJob(
		userId,
		{ ...payload, provider: payload.provider || "expedia" },
		token,
	);

export const readOtaReservationSyncJob = (userId, jobId, token = "") => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservation-sync/jobs/${userId}/${jobId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...authHeaders(token),
				...getStoredActiveAuthHeaders(),
			},
			cache: "no-store",
		},
	)
		.then(async (response) => {
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					ok: false,
					error:
						data?.error ||
						data?.message ||
						"Could not load OTA reservation sync job.",
				};
			}
			return data;
		})
		.catch((err) => ({
			ok: false,
			error: err?.message || "Could not load OTA reservation sync job.",
		}));
};

export const runOtaReservationSyncCollector = (
	userId,
	jobId,
	payload = {},
	token = "",
) => {
	const bodyPayload = typeof payload === "string" ? {} : payload || {};
	const authToken = typeof payload === "string" ? payload : token;
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservation-sync/jobs/${userId}/${jobId}/run`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...authHeaders(authToken),
				...getStoredActiveAuthHeaders(),
			},
			body: JSON.stringify(bodyPayload),
		},
	)
		.then(async (response) => {
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					ok: false,
					error:
						data?.error ||
						data?.message ||
						"Could not run OTA reservation sync collector.",
				};
			}
			return data;
		})
		.catch((err) => ({
			ok: false,
			error: err?.message || "Could not run OTA reservation sync collector.",
		}));
};

export const submitOtaReservationSyncMfaCode = (
	userId,
	jobId,
	payload = {},
	token = "",
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservation-sync/jobs/${userId}/${jobId}/mfa`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...authHeaders(token),
				...getStoredActiveAuthHeaders(),
			},
			body: JSON.stringify(payload || {}),
		},
	)
		.then(async (response) => {
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					ok: false,
					error:
						data?.error ||
						data?.message ||
						"Could not submit Expedia verification code.",
					job: data?.job,
				};
			}
			return data;
		})
		.catch((err) => ({
			ok: false,
		error: err?.message || "Could not submit Expedia verification code.",
	}));
};

export const applyOtaReservationSyncJob = (
	userId,
	jobId,
	payload = {},
	token = "",
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservation-sync/jobs/${userId}/${jobId}/apply`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...authHeaders(token),
				...getStoredActiveAuthHeaders(),
			},
			body: JSON.stringify(payload || {}),
		},
	)
		.then(async (response) => {
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					ok: false,
					error:
						data?.error ||
						data?.message ||
						"Could not save OTA reservation sync writes.",
					job: data?.job,
				};
			}
			return data;
		})
		.catch((err) => ({
			ok: false,
			error: err?.message || "Could not save OTA reservation sync writes.",
		}));
};

export const readExpediaReservationSyncJob = readOtaReservationSyncJob;
export const runExpediaReservationSyncCollector =
	runOtaReservationSyncCollector;
export const submitExpediaReservationSyncMfaCode =
	submitOtaReservationSyncMfaCode;
export const applyExpediaReservationSyncJob = applyOtaReservationSyncJob;

export const updateOtaReservationPricing = (
	reservationId,
	userId,
	token,
	payload = {},
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservations/${reservationId}/pricing/${userId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredActiveAuthHeaders(),
			},
			body: JSON.stringify(payload),
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			success: false,
			error: err?.message || "Could not update OTA reservation pricing",
		}));
};

export const assignOtaReservationHotel = (
	reservationId,
	userId,
	token,
	payload = {},
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservations/${reservationId}/hotel/${userId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredActiveAuthHeaders(),
			},
			body: JSON.stringify(payload),
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			success: false,
			error: err?.message || "Could not assign hotel",
		}));
};

export const releaseOtaReservationToHotel = (
	reservationId,
	userId,
	token,
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservations/${reservationId}/release/${userId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredActiveAuthHeaders(),
			},
			body: JSON.stringify({}),
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			success: false,
			error: err?.message || "Could not release OTA reservation",
		}));
};

export const revertOtaReservationToPlatformReview = (
	reservationId,
	userId,
	token,
	payload = {},
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/ota-reservations/${reservationId}/revert-platform-review/${userId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				...getStoredActiveAuthHeaders(),
			},
			body: JSON.stringify(payload),
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			success: false,
			error:
				err?.message ||
				"Could not return reservation to platform review",
		}));
};

export const distinctBookingSources = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/distinct-booking-sources/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((res) => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		})
		.then((json) => {
			// Return array directly (backend returns { success, data: [] })
			return Array.isArray(json?.data) ? json.data : [];
		})
		.catch((err) => {
			console.error("Error fetching booking sources:", err);
			return [];
		});
};

export const getUncompletedReservations = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/uncomplete-reservations-list/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`, // Add the token here
			},
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) => console.error("Error fetching reservations:", err));
};

export const updatePaymentToken = (
	userId,
	token,
	reservationId,
	newTokenId,
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/update-payment-token/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json", // Specify content type
				Authorization: `Bearer ${token}`, // Add the token here
			},
			body: JSON.stringify({
				reservationId, // Reservation ID to update
				newTokenId, // New tokenized payment ID
			}),
		},
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) => console.error("Error updating payment token:", err));
};

export const createNewReservationClient = async (reservationData) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/new-reservation-client-employee`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(reservationData), // This line was missing the body to send the request data
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			console.error("API error: ", err);
		});
};

export const getAdminHotelInventoryAvailability = (
	userId,
	token,
	hotelId,
	{ start, end, includeCancelled = false } = {},
) => {
	if (!hotelId) {
		return Promise.reject(new Error("hotelId is required"));
	}
	if (!userId) {
		return Promise.reject(new Error("userId is required"));
	}
	const params = new URLSearchParams();
	if (start) params.set("start", start);
	if (end) params.set("end", end);
	if (includeCancelled) params.set("includeCancelled", "true");

	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/admin/hotel-inventory/${hotelId}/availability/${userId}?${params.toString()}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.error("Error fetching availability:", err));
};

export const getAdminPriceVariantOptions = (
	userId,
	token,
	params = {},
) =>
	fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/settings-price-variants/${userId}${buildQuery(
			params,
		)}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...getStoredActiveAuthHeaders(),
				...authHeaders(token),
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => ({
			error: err?.message || "Could not load price variants",
		}));

const parseJSON = async (res) => {
	const text = await res.text();
	let data;
	try {
		data = text ? JSON.parse(text) : {};
	} catch {
		data = { message: text || null };
	}
	if (!res.ok) {
		const err = new Error(data?.message || `API error (${res.status})`);
		err.status = res.status;
		err.response = data;
		throw err;
	}
	return data;
};

export const getReservationVccStatus = (reservationId, token) => {
	if (!reservationId) {
		return Promise.reject(new Error("reservationId is required"));
	}
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/paypal/vcc-status/${reservationId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		},
	).then(parseJSON);
};

export const getPayPalClientTokenForVcc = ({
	token,
	buyerCountry = "US",
	debug = false,
} = {}) => {
	return fetch(`${process.env.REACT_APP_API_URL}/paypal/token-generated`, {
		method: "POST",
		cache: "no-store",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			"Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
			Pragma: "no-cache",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		credentials: "omit",
		body: JSON.stringify({
			bc: String(buyerCountry || "US").toUpperCase(),
			dbg: !!debug,
			_ts: Date.now(),
		}),
	}).then(parseJSON);
};

export const getBraintreeClientTokenForVcc = ({ token } = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/braintree/vcc/token-generated`,
		{
			method: "GET",
			cache: "no-store",
			headers: {
				Accept: "application/json",
				"Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
				Pragma: "no-cache",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			credentials: "omit",
		},
	).then(parseJSON);
};

export const getReservationBraintreeVccStatus = (reservationId, token) => {
	if (!reservationId) {
		return Promise.reject(new Error("reservationId is required"));
	}
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/braintree/vcc-status/${reservationId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		},
	).then(parseJSON);
};

export const getReservationBofaVccStatus = (reservationId, token) => {
	if (!reservationId) {
		return Promise.reject(new Error("reservationId is required"));
	}
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/bofa/vcc-status/${reservationId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		},
	).then(parseJSON);
};

export const getBofaVccHealth = ({ token, probe = true } = {}) => {
	const query = `probe=${probe ? "true" : "false"}`;
	return fetch(`${process.env.REACT_APP_API_URL}/bofa/health?${query}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		credentials: "omit",
	}).then(parseJSON);
};

export const createReservationVccOrder = ({
	token,
	reservationId,
	usdAmount,
	postalCode,
	proceedWithoutRoom = false,
	cmid = null,
}) => {
	if (!reservationId) {
		return Promise.reject(new Error("reservationId is required"));
	}
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/paypal/vcc-order/create`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			credentials: "omit",
			body: JSON.stringify({
				reservationId,
				usdAmount: Number(usdAmount),
				proceedWithoutRoom: !!proceedWithoutRoom,
				...(postalCode
					? {
							billingAddress: {
								postal_code: String(postalCode).trim(),
							},
					  }
					: {}),
				...(cmid ? { cmid } : {}),
			}),
		},
	).then(parseJSON);
};

export const captureReservationVccOrder = ({
	token,
	reservationId,
	orderId,
	usdAmount,
	postalCode,
	proceedWithoutRoom = false,
	cmid = null,
}) => {
	if (!reservationId) {
		return Promise.reject(new Error("reservationId is required"));
	}
	if (!orderId) {
		return Promise.reject(new Error("orderId is required"));
	}
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/paypal/vcc-order/capture`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			credentials: "omit",
			body: JSON.stringify({
				reservationId,
				orderId,
				usdAmount: Number(usdAmount),
				proceedWithoutRoom: !!proceedWithoutRoom,
				...(postalCode
					? {
							billingAddress: {
								postal_code: String(postalCode).trim(),
							},
					  }
					: {}),
				...(cmid ? { cmid } : {}),
			}),
		},
	).then(parseJSON);
};

export const chargeReservationViaVcc = ({
	token,
	reservationId,
	usdAmount,
	postalCode,
	cardNumber,
	cardExpiry,
	cardCVV,
	cmid = null,
}) => {
	if (!reservationId) {
		return Promise.reject(new Error("reservationId is required"));
	}
	return fetch(`${process.env.REACT_APP_API_URL}/reservations/paypal/vcc-charge`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		credentials: "omit",
		body: JSON.stringify({
			reservationId,
			usdAmount: Number(usdAmount),
			...(postalCode
				? {
						billingAddress: {
							postal_code: String(postalCode).trim(),
						},
				  }
				: {}),
			card: {
				number: cardNumber,
				expiry: cardExpiry,
				cvv: cardCVV,
			},
			...(cmid ? { cmid } : {}),
		}),
	}).then(parseJSON);
};

export const chargeReservationViaBraintreeVcc = ({
	token,
	reservationId,
	usdAmount,
	postalCode,
	paymentMethodNonce,
	cardholderName = "",
	proceedWithoutRoom = false,
}) => {
	if (!reservationId) {
		return Promise.reject(new Error("reservationId is required"));
	}
	if (!paymentMethodNonce) {
		return Promise.reject(new Error("paymentMethodNonce is required"));
	}
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/braintree/vcc-charge`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			credentials: "omit",
			body: JSON.stringify({
				reservationId,
				usdAmount: Number(usdAmount),
				proceedWithoutRoom: !!proceedWithoutRoom,
				paymentMethodNonce,
				...(cardholderName ? { cardholderName: String(cardholderName) } : {}),
				...(postalCode
					? {
							billingAddress: {
								postal_code: String(postalCode).trim(),
							},
					  }
					: {}),
			}),
		},
	).then(parseJSON);
};

export const chargeReservationViaBofaVcc = ({
	token,
	reservationId,
	usdAmount,
	currency = "USD",
	cardNumber,
	cardExpiry,
	cardCVV,
	cardType = "",
	proceedWithoutRoom = false,
}) => {
	if (!reservationId) {
		return Promise.reject(new Error("reservationId is required"));
	}
	return fetch(`${process.env.REACT_APP_API_URL}/reservations/bofa/vcc-charge`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		credentials: "omit",
		body: JSON.stringify({
			reservationId,
			usdAmount: Number(usdAmount),
			currency: String(currency || "USD").toUpperCase(),
			proceedWithoutRoom: !!proceedWithoutRoom,
			card: {
				number: String(cardNumber || ""),
				expiry: String(cardExpiry || ""),
				cvv: String(cardCVV || ""),
				...(cardType ? { type: String(cardType) } : {}),
			},
		}),
	}).then(parseJSON);
};

export const triggerPayment = (
	userId, // kept for call-site compatibility; not used in route
	token,
	reservationId,
	amountUSD, // number in USD
	paymentOption, // 'depositOnly' | 'depositAndOneNight' | 'fullAmount' | 'customAmount'
	customUSD, // original custom USD (optional)
	amountSAR, // number in SAR (for your own ledger)
	cmid = null, // optional PayPal Client-Metadata-ID if you have it
) => {
	const url = `${process.env.REACT_APP_API_URL}/reservations/paypal/mit-charge`;
	return fetch(url, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		credentials: "omit",
		body: JSON.stringify({
			reservationId,
			usdAmount: Number(amountUSD),
			sarAmount: Number(amountSAR),
			...(cmid ? { cmid } : {}),
			// keep human intent labels for audit/BI if you want to read them server-side
			meta: {
				paymentOption,
				customUSD: customUSD != null ? Number(customUSD) : null,
			},
		}),
	}).then(parseJSON);
};

export const emailSendForTriggeringPayment = async (
	userId,
	token,
	reservationId,
	amountSAR,
	amountUSD, // optional but recommended
) => {
	const headers = {
		Accept: "application/json",
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};

	// 1) Try new PayPal-namespaced route
	try {
		const urlNew = `${process.env.REACT_APP_API_URL}/reservations/paypal/send-capture-email/${userId}`;
		const resNew = await fetch(urlNew, {
			method: "POST",
			headers,
			credentials: "omit",
			body: JSON.stringify({
				reservationId,
				amount: {
					sar: Number(amountSAR),
					...(amountUSD != null ? { usd: Number(amountUSD) } : {}),
				},
			}),
		});
		if (resNew.ok) return await parseJSON(resNew);
		if (resNew.status !== 404) {
			// server exists but returned an error → throw it
			const data = await resNew.text();
			throw new Error(data || `HTTP ${resNew.status}`);
		}
	} catch (e) {
		// fall through to legacy if 404, otherwise keep trying
		if (e?.message && !/404/.test(e.message)) {
			// Non-404 errors should bubble up
			throw e;
		}
	}

	// 2) Fall back to legacy route (keeps your old email template)
	const urlOld = `${process.env.REACT_APP_API_URL}/email-send/${userId}`;
	const resOld = await fetch(urlOld, {
		method: "POST",
		headers,
		credentials: "omit",
		body: JSON.stringify({
			reservationId,
			amountInSAR: Number(amountSAR),
		}),
	});

	return parseJSON(resOld);
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

const attachReservationActor = (reservation = {}) => {
	try {
		if (!isAdminRoutePath()) {
			const previewAuth = JSON.parse(
				localStorage.getItem("dashboardPreviewAuth") || "null"
			);
			const previewUserId = previewAuth?.auth?.user?._id;
			if (previewUserId && !isJwtExpired(previewAuth?.auth?.token)) {
				return {
					...reservation,
					requestingUserId: previewUserId,
					__previewAudit: true,
					__previewAuditActorId:
						previewAuth?.actor?._id || previewAuth?.preview?.actorId || "",
				};
			}
			if (previewAuth?.auth?.token && isJwtExpired(previewAuth.auth.token)) {
				stopDashboardPreview();
			}
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
				...getStoredActiveAuthHeaders(),
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

export const distinctReservedByList = (userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/reserved-by-list/${userId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
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
		`${process.env.REACT_APP_API_URL}/adminreports/reservations-by-day/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/adminreports/checkins-by-day/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/adminreports/checkouts-by-day/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/adminreports/reservations-by-day-by-hotel/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/adminreports/reservations-by-booking-status/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/adminreports/reservations-by-hotel-names/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/adminreports/top-hotels-by-reservations/${userId}${query}`,
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
	 8) Booking Source x Payment Status summary
	 ======================================================================== */
export const getBookingSourcePaymentSummary = (
	userId,
	token,
	{
		selectedHotels = [],
		hotelId,
		start,
		end,
		month,
		includeCancelled,
		excludeCancelled,
		paymentStatuses,
		dateBasis,
		bookingSources,
	} = {},
) => {
	const params = new URLSearchParams();

	if (hotelId) params.set("hotelId", hotelId);
	if (!hotelId && selectedHotels?.length && !selectedHotels.includes("all")) {
		params.set("hotels", selectedHotels.join(","));
	}
	if (month) params.set("month", month);
	if (start) params.set("start", start);
	if (end) params.set("end", end);
	if (includeCancelled) params.set("includeCancelled", "true");
	if (excludeCancelled) params.set("excludeCancelled", "true");
	if (paymentStatuses?.length) {
		params.set("paymentStatuses", paymentStatuses.join(","));
	}
	if (dateBasis) params.set("dateBasis", dateBasis);
	if (bookingSources?.length) {
		params.set("bookingSources", bookingSources.join(","));
	}

	const query = params.toString();
	const suffix = query ? `?${query}` : "";

	return fetch(
		`${process.env.REACT_APP_API_URL}/adminreports/booking-source-payment-summary/${userId}${suffix}`,
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
		.catch((err) => {
			console.error("Error fetching booking source summary data:", err);
			return { success: false, data: null };
	});
};

/* ========================================================================
	 8.1) Checkout Date x Payment Status summary
	 ======================================================================== */
export const getCheckoutDatePaymentSummary = (
	userId,
	token,
	{
		selectedHotels = [],
		hotelId,
		start,
		end,
		month,
		includeCancelled,
		excludeCancelled,
		paymentStatuses,
		bookingSources,
		dateBasis,
	} = {},
) => {
	const params = new URLSearchParams();

	if (hotelId) params.set("hotelId", hotelId);
	if (!hotelId && selectedHotels?.length && !selectedHotels.includes("all")) {
		params.set("hotels", selectedHotels.join(","));
	}
	if (month) params.set("month", month);
	if (start) params.set("start", start);
	if (end) params.set("end", end);
	if (includeCancelled) params.set("includeCancelled", "true");
	if (excludeCancelled) params.set("excludeCancelled", "true");
	if (paymentStatuses?.length) {
		params.set("paymentStatuses", paymentStatuses.join(","));
	}
	if (bookingSources?.length) {
		params.set("bookingSources", bookingSources.join(","));
	}
	if (dateBasis) params.set("dateBasis", dateBasis);

	const query = params.toString();
	const suffix = query ? `?${query}` : "";

	return fetch(
		`${process.env.REACT_APP_API_URL}/adminreports/checkout-date-payment-summary/${userId}${suffix}`,
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
		.catch((err) => {
			console.error("Error fetching checkout date summary data:", err);
			return { success: false, data: null };
		});
};

/* ========================================================================
	 9) getSpecificListOfReservations (already takes queryParamsObj)
	 ======================================================================== */
export const getSpecificListOfReservations = (
	userId,
	token,
	queryParamsObj,
) => {
	const queryString = buildQueryString(queryParamsObj);

	return fetch(
		`${process.env.REACT_APP_API_URL}/adminreports/specific-list/${userId}?${queryString}`,
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

export const getExportToExcelList = (userId, token, queryParamsObj) => {
	const queryString = buildQueryString(queryParamsObj);

	return fetch(
		`${process.env.REACT_APP_API_URL}/adminreports/export-to-excel/${userId}?${queryString}`,
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

export const getAdminReservationExecutiveSummary = async (
	userId,
	token,
	day = "today",
	{ signal } = {},
) => {
	const params = new URLSearchParams({ day });
	const response = await fetch(
		`${process.env.REACT_APP_API_URL}/adminreports/reservation-executive-summary/${userId}?${params.toString()}`,
		{
			method: "GET",
			signal,
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	);
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const error = new Error(
			payload.error || "Unable to load the reservation executive summary.",
		);
		error.payload = payload;
		throw error;
	}
	return payload;
};

export const getPaidBreakdownReportAdmin = (
	userId,
	token,
	{
		hotelId,
		searchQuery = "",
		dateBy = "",
		dateFrom = "",
		dateTo = "",
		page = 1,
		limit = 200,
	} = {},
) => {
	const params = new URLSearchParams();
	if (hotelId) params.set("hotelId", hotelId);
	if (searchQuery) params.set("searchQuery", searchQuery);
	if (dateBy) params.set("dateBy", dateBy);
	if (dateFrom) params.set("dateFrom", dateFrom);
	if (dateTo) params.set("dateTo", dateTo);
	if (page) params.set("page", String(page));
	if (limit) params.set("limit", String(limit));

	return fetch(
		`${process.env.REACT_APP_API_URL}/adminreports/paid-breakdown/${userId}?${params.toString()}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then(async (response) => {
			let payload;
			try {
				payload = await response.json();
			} catch {
				throw new Error("Could not read the paid breakdown report response");
			}
			if (!response.ok) {
				throw new Error(
					payload?.error || payload?.message || "Could not load paid breakdown report",
				);
			}
			return payload;
		})
		.catch((err) => {
			console.error("Error fetching paid breakdown report:", err);
			throw err;
		});
};

const buildAdminUrlSearch = (params = {}) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (Array.isArray(value)) {
			const selected = value.filter(
				(item) => item !== undefined && item !== null && item !== "",
			);
			if (selected.length) query.set(key, selected.join(","));
			return;
		}
		if (value !== undefined && value !== null && value !== "") {
			query.set(key, value);
		}
	});
	const queryString = query.toString();
	return queryString ? `?${queryString}` : "";
};

const overallAdminHeaders = (token = "") => ({
	Accept: "application/json",
	"Content-Type": "application/json",
	...getStoredActiveAuthHeaders(),
	...authHeaders(token),
});

export const getOverallProfitReport = (userId, token, params = {}) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/overall-dashboard/profit-report/${userId}${buildAdminUrlSearch(
			params,
		)}`,
		{
			method: "GET",
			headers: overallAdminHeaders(token),
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			console.error("Error fetching overall profit report:", err);
			return { reservations: [], total: 0, error: "Could not load profit report" };
		});
};

export const exportOverallProfitReport = (userId, token, params = {}) =>
	getOverallProfitReport(userId, token, { ...params, exportAll: "true" });

export const getHotelOccupancyCalendar = (
	userId,
	token,
	{
		hotelId,
		month,
		includeCancelled = false,
		start,
		end,
		display = "roomType",
		paymentStatuses,
		bookingSources,
	} = {},
) => {
	if (!hotelId) {
		return Promise.reject(new Error("hotelId is required for occupancy view"));
	}

	const params = new URLSearchParams({ hotelId });
	if (month) params.set("month", month);
	if (start) params.set("start", start);
	if (end) params.set("end", end);
	if (includeCancelled) params.set("includeCancelled", "true");
	if (display) params.set("display", display);
	if (paymentStatuses?.length) {
		params.set("paymentStatuses", paymentStatuses.join(","));
	}
	if (bookingSources?.length) {
		params.set("bookingSources", bookingSources.join(","));
	}

	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/adminreports/hotel-occupancy/${userId}?${params.toString()}`,
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
		.catch((err) => {
			console.error("Error fetching hotel occupancy map:", err);
			throw err;
		});
};

export const getHotelOccupancyWarnings = (
	userId,
	token,
	{
		hotelId,
		month,
		includeCancelled = false,
		start,
		end,
		display = "roomType",
		paymentStatuses,
		bookingSources,
	} = {},
) => {
	if (!hotelId) {
		return Promise.reject(
			new Error("hotelId is required for occupancy warnings"),
		);
	}

	const params = new URLSearchParams({ hotelId });
	if (month) params.set("month", month);
	if (start) params.set("start", start);
	if (end) params.set("end", end);
	if (includeCancelled) params.set("includeCancelled", "true");
	if (display) params.set("display", display);
	if (paymentStatuses?.length) {
		params.set("paymentStatuses", paymentStatuses.join(","));
	}
	if (bookingSources?.length) {
		params.set("bookingSources", bookingSources.join(","));
	}

	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/adminreports/hotel-occupancy-warnings/${userId}?${params.toString()}`,
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
		.catch((err) => {
			console.error("Error fetching hotel occupancy warnings:", err);
			throw err;
		});
};

export const getHotelOccupancyDayReservations = (
	userId,
	token,
	{
		hotelId,
		date,
		roomKey,
		roomLabel,
		includeCancelled = false,
		display = "roomType",
		paymentStatuses,
		bookingSources,
	} = {},
) => {
	if (!hotelId) {
		return Promise.reject(
			new Error("hotelId is required for day reservations"),
		);
	}
	if (!date) {
		return Promise.reject(new Error("date (YYYY-MM-DD) is required"));
	}

	const params = new URLSearchParams({ hotelId, date });
	if (roomKey) params.set("roomKey", roomKey);
	if (roomLabel) params.set("roomLabel", roomLabel);
	if (includeCancelled) params.set("includeCancelled", "true");
	if (display) params.set("display", display);
	if (paymentStatuses?.length) {
		params.set("paymentStatuses", paymentStatuses.join(","));
	}
	if (bookingSources?.length) {
		params.set("bookingSources", bookingSources.join(","));
	}

	return fetch(
		`${
			process.env.REACT_APP_API_URL
		}/adminreports/hotel-occupancy-day-reservations/${userId}?${params.toString()}`,
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
		.catch((err) => {
			console.error("Error fetching day reservations for occupancy:", err);
			throw err;
		});
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

export async function chargeOwnerCommissions(body, { token } = {}) {
	const res = await fetch(
		`${process.env.REACT_APP_API_URL}/paypal-owner/commissions/charge`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders(token) },
			body: JSON.stringify(body),
			credentials: "omit",
		},
	);
	const json = await res.json();
	if (!res.ok) throw new Error(json?.message || "Charge failed");
	return json; // { ok, capture, batch, reservationsUpdated: [...] }
}

// ===== Admin payouts (platform-wide) =====
export async function getAdminPayoutsOverview(params = {}, { token } = {}) {
	const qs = new URLSearchParams({
		...params,
		_ts: Date.now().toString(),
	}).toString();
	const res = await fetch(
		`${process.env.REACT_APP_API_URL}/admin-payouts/overview?${qs}`,
		{
			headers: { ...authHeaders(token) },
			cache: "no-store",
		},
	);
	if (!res.ok) throw new Error("Failed to load admin payouts overview");
	return res.json();
}

export async function listAdminPayouts(params = {}, { token } = {}) {
	const qs = new URLSearchParams({
		...params,
		_ts: Date.now().toString(),
	}).toString();
	const res = await fetch(
		`${process.env.REACT_APP_API_URL}/admin-payouts/commissions?${qs}`,
		{
			headers: { ...authHeaders(token) },
			cache: "no-store",
		},
	);
	if (!res.ok) throw new Error("Failed to list admin payouts");
	return res.json();
}

export async function listAdminHotelsLite({ token } = {}) {
	const res = await fetch(
		`${
			process.env.REACT_APP_API_URL
		}/admin-payouts/hotels-lite?_ts=${Date.now()}`,
		{
			headers: { ...authHeaders(token) },
			cache: "no-store",
		},
	);
	if (!res.ok) throw new Error("Failed to list hotels");
	return res.json(); // { count, hotels: [{ _id, hotelName }] }
}

/* ===== Admin reservation updates (audit-logged) ===== */
export async function adminUpdateCommissionStatus(
	{ reservationId, commissionPaid, note },
	{ token } = {},
) {
	const res = await fetch(
		`${process.env.REACT_APP_API_URL}/admin-payouts/commission-status`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...authHeaders(token) },
			body: JSON.stringify({ reservationId, commissionPaid, note }),
		},
	);
	const json = await res.json();
	if (!res.ok)
		throw new Error(json?.message || "Failed to update commission status");
	return json;
}
export async function adminUpdateTransferStatus(
	{ reservationId, moneyTransferredToHotel, note },
	{ token } = {},
) {
	const res = await fetch(
		`${process.env.REACT_APP_API_URL}/admin-payouts/transfer-status`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...authHeaders(token) },
			body: JSON.stringify({ reservationId, moneyTransferredToHotel, note }),
		},
	);
	const json = await res.json();
	if (!res.ok)
		throw new Error(json?.message || "Failed to update transfer status");
	return json;
}
export async function adminUpdateReservationPayoutFlags(
	payload,
	{ token } = {},
) {
	const res = await fetch(
		`${process.env.REACT_APP_API_URL}/admin-payouts/update-reservation`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...authHeaders(token) },
			body: JSON.stringify(payload),
		},
	);
	const json = await res.json();
	if (!res.ok) throw new Error(json?.message || "Failed to update reservation");
	return json;
}

export const adminAutoReconcileHotel = async (params, { token }) => {
	// params must include { hotelId }
	const res = await fetch(
		`${
			process.env.REACT_APP_API_URL
		}/admin-payouts/reconcile?hotelId=${encodeURIComponent(params.hotelId)}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				note: params.note || "",
				toleranceHalala: params.toleranceHalala || 5,
			}),
		},
	);
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err?.message || "Failed to reconcile");
	}
	return res.json();
};

export const createExpense = (userId, token, expense) => {
	return fetch(`${process.env.REACT_APP_API_URL}/expenses/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(expense),
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const listExpenses = (userId, token, { hotelId } = {}) => {
	const params = new URLSearchParams();
	if (hotelId) params.set("hotelId", hotelId);
	const query = params.toString();
	const suffix = query ? `?${query}` : "";

	return fetch(
		`${process.env.REACT_APP_API_URL}/expenses/list/${userId}${suffix}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const listExpenseHotels = (userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/expenses/hotels/${userId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getFinancialReport = (
	userId,
	token,
	{ hotelId, year, excludeCancelled, paymentStatuses } = {},
) => {
	const params = new URLSearchParams();
	if (hotelId) params.set("hotelId", hotelId);
	if (year) params.set("year", year);
	if (excludeCancelled !== undefined)
		params.set("excludeCancelled", excludeCancelled);
	if (paymentStatuses) {
		const statusList = Array.isArray(paymentStatuses)
			? paymentStatuses.filter(Boolean)
			: [paymentStatuses];
		if (statusList.length) {
			params.set("paymentStatuses", statusList.join(","));
		}
	}
	const query = params.toString();
	const suffix = query ? `?${query}` : "";

	return fetch(
		`${process.env.REACT_APP_API_URL}/expenses/financial-report/${userId}${suffix}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const updateExpense = (expenseId, userId, token, expense) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/expenses/${expenseId}/${userId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(expense),
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const deleteExpense = (expenseId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/expenses/${expenseId}/${userId}`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};
