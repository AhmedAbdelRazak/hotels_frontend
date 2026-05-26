/** @format */

export const signup = (userData) => {
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

export const signupHotelStaff = (userId, token, userData) => {
	return fetch(`${process.env.REACT_APP_API_URL}/hotel-staff/create/${userId}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(userData),
	})
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
			throw err;
		});
};

export const getHotelStaffUsers = (userId, token, hotelId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/hotel-staff/${hotelId}/${userId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
			throw err;
		});
};

export const updateHotelStaffUser = (userId, token, hotelId, staffId, userData) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-staff/${staffId}/${hotelId}/${userId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(userData),
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
			throw err;
		});
};

export const previewHotelStaffDashboard = (userId, token, hotelId, staffId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-staff/${staffId}/${hotelId}/${userId}/preview-dashboard`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	)
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
			throw err;
		});
};

export const signin = (user) => {
	return fetch(`${process.env.REACT_APP_API_URL}/signin`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(user),
	})
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
		});
};

export const setLocalStorage = (key, value) => {
	if (window !== "undefined") {
		localStorage.setItem(key, JSON.stringify(value));
	}
};
// remove from localstorage
export const removeLocalStorage = (key) => {
	if (window !== "undefined") {
		localStorage.removeItem(key);
	}
};

export const authenticate = (data, next) => {
	if (typeof window !== "undefined") {
		localStorage.setItem("jwt", JSON.stringify(data));
		localStorage.removeItem(DASHBOARD_PREVIEW_STORAGE_KEY);
		next();
	}
};

export const authenticate2 = (response, next) => {
	console.log("AUTHENTICATE HELPER ON SIGNIN RESPONSE", response);
	// setCookie("token", response.data.token);
	setLocalStorage("jwt", response.data);
	localStorage.removeItem(DASHBOARD_PREVIEW_STORAGE_KEY);
	next();
};

export const signout = (next) => {
	if (typeof window !== "undefined") {
		localStorage.removeItem("jwt");
		localStorage.removeItem(DASHBOARD_PREVIEW_STORAGE_KEY);
		localStorage.removeItem("product");
		next();
		return fetch(`${process.env.REACT_APP_API_URL}/signout`, {
			method: "GET",
		})
			.then((response) => {
				console.log("signout", response);
			})
			.catch((err) => console.log(err));
	}
};

const DASHBOARD_PREVIEW_STORAGE_KEY = "dashboardPreviewAuth";
const TOKEN_EXPIRY_GRACE_SECONDS = 30;

const safeParseLocalJson = (key) => {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch (error) {
		return null;
	}
};

const decodeJwtPayload = (token = "") => {
	try {
		const [, payload] = String(token || "").split(".");
		if (!payload) return null;
		const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = normalized.padEnd(
			normalized.length + ((4 - (normalized.length % 4)) % 4),
			"="
		);
		return JSON.parse(window.atob(padded));
	} catch (error) {
		return null;
	}
};

export const isJwtExpired = (token = "") => {
	if (!token) return true;
	const payload = decodeJwtPayload(token);
	if (!payload?.exp) return false;
	return payload.exp <= Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_GRACE_SECONDS;
};

const restorePreviewSelectedHotel = (preview) => {
	if (!preview || typeof window === "undefined") return;
	if (Object.prototype.hasOwnProperty.call(preview, "originalSelectedHotel")) {
		if (preview.originalSelectedHotel) {
			localStorage.setItem(
				"selectedHotel",
				JSON.stringify(preview.originalSelectedHotel)
			);
		} else {
			localStorage.removeItem("selectedHotel");
		}
	}
};

const clearExpiredDashboardPreview = (preview) => {
	restorePreviewSelectedHotel(preview);
	localStorage.removeItem(DASHBOARD_PREVIEW_STORAGE_KEY);
};

export const getDashboardPreview = () => {
	const preview = safeParseLocalJson(DASHBOARD_PREVIEW_STORAGE_KEY);
	if (!preview?.auth?.token || !preview?.auth?.user) return null;
	if (isJwtExpired(preview.auth.token)) {
		clearExpiredDashboardPreview(preview);
		return null;
	}
	return preview;
};

const isAdminRoutePath = () =>
	typeof window !== "undefined" &&
	String(window.location?.pathname || "").startsWith("/admin");

export const getBaseAuthentication = () => {
	if (typeof window === "undefined") return false;
	const baseAuth = safeParseLocalJson("jwt");
	if (!baseAuth?.token || !baseAuth?.user) return false;
	if (isJwtExpired(baseAuth.token)) {
		localStorage.removeItem("jwt");
		localStorage.removeItem(DASHBOARD_PREVIEW_STORAGE_KEY);
		return false;
	}
	return baseAuth;
};

export const startDashboardPreview = ({ auth, preview, selectedHotel }) => {
	if (
		typeof window === "undefined" ||
		!auth?.token ||
		!auth?.user ||
		isJwtExpired(auth.token)
	) {
		return;
	}
	const baseAuth = safeParseLocalJson("jwt");
	const originalSelectedHotel = safeParseLocalJson("selectedHotel");
	localStorage.setItem(
		DASHBOARD_PREVIEW_STORAGE_KEY,
		JSON.stringify({
			auth,
			preview: preview || {},
			actor: baseAuth?.user || null,
			originalSelectedHotel,
			startedAt: new Date().toISOString(),
		}),
	);
	if (selectedHotel) {
		localStorage.setItem("selectedHotel", JSON.stringify(selectedHotel));
	}
};

export const stopDashboardPreview = () => {
	if (typeof window === "undefined") return null;
	const preview = getDashboardPreview();
	localStorage.removeItem(DASHBOARD_PREVIEW_STORAGE_KEY);
	restorePreviewSelectedHotel(preview);
	return preview;
};

export const isAuthenticated = () => {
	if (typeof window == "undefined") {
		return false;
	}
	if (localStorage.getItem("jwt")) {
		const baseAuth = getBaseAuthentication();
		if (!baseAuth) return false;
		if (isAdminRoutePath()) {
			return baseAuth;
		}
		const preview = getDashboardPreview();
		if (preview?.auth?.token && preview?.auth?.user) {
			return {
				...preview.auth,
				dashboardPreview: {
					...(preview.preview || {}),
					actor: preview.actor || baseAuth?.user || null,
					startedAt: preview.startedAt,
				},
			};
		}
		return baseAuth;
	} else {
		return false;
	}
};

export const contactUs = (form) => {
	return fetch(`${process.env.REACT_APP_API_URL}/submitform`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(form),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getSingleUser = (userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/user/${userId}`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};
