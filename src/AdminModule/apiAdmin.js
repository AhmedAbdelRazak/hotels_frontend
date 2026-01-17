import axios from "axios";

const authHeaders = (token) =>
	token ? { Authorization: `Bearer ${token}` } : {};

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
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getHotelDetails = (userId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/hotel-details/${userId}`, {
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
		}
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
		}
	)
		.then((res) => res.json())
		.catch((err) => console.error(err));

export const sendReservationConfirmationSMS = (reservationId, opts = {}) => {
	const params = { notifyAdmins: opts.notifyAdmins ? "true" : "false" };
	return axios
		.post(
			`${process.env.REACT_APP_API_URL}/reservations/${reservationId}/wa/confirmation`,
			null,
			{ params }
		)
		.then((res) => res.data)
		.catch((err) => {
			if (err?.response?.data) return err.response.data;
			return { ok: false, message: "Network error" };
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
		}
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
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
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
			}
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
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(data),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getFilteredSupportCases = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/active`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getFilteredSupportCasesClients = (token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases-clients/active`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getFilteredClosedSupportCases = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/closed`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getFilteredClosedSupportCasesClients = (token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/closed/clients`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
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
		}
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

export const updateSeenByCustomer = async (caseId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases-customer/${caseId}/seen`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		}
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
		}
	)
		.then((response) => response.json())
		.catch((err) => {
			console.error("API error: ", err);
		});
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
		}
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
		}
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
		}
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
		}
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
		}
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
			},
			body: JSON.stringify({ userId }), // Pass the current user's ID
		}
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
		}
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
		}
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
	} = {}
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
		}
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) => console.error("Error fetching reservations:", err));
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
		}
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
		}
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
	newTokenId
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
		}
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
		}
	)
		.then((response) => response.json())
		.catch((err) => {
			console.error("API error: ", err);
		});
};

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

export const triggerPayment = (
	userId, // kept for call-site compatibility; not used in route
	token,
	reservationId,
	amountUSD, // number in USD
	paymentOption, // 'depositOnly' | 'depositAndOneNight' | 'fullAmount' | 'customAmount'
	customUSD, // original custom USD (optional)
	amountSAR, // number in SAR (for your own ledger)
	cmid = null // optional PayPal Client-Metadata-ID if you have it
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
	amountUSD // optional but recommended
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

export const updateSingleReservation = (reservationId, reservation) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservation-update/${reservationId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				// Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(reservation),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
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
			([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`
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
			console.error("Error fetching reservationsByDay data:", err)
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
	extraParams = {}
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
		}
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching reservationsByDay data:", err)
		);
};

/* ========================================================================
	 2) Checkins By Day
	 ======================================================================== */
export const getCheckinsByDay = (
	userId,
	token,
	selectedHotels = [],
	extraParams = {}
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
		}
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
	extraParams = {}
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
		}
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
	extraParams = {}
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
		}
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching reservationsByDayByHotelName data:", err)
		);
};

/* ========================================================================
	 5) Reservations By Booking Status
	 ======================================================================== */
export const getReservationsByBookingStatus = (
	userId,
	token,
	selectedHotels = [],
	extraParams = {}
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
		}
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching reservationsByBookingStatus data:", err)
		);
};

/* ========================================================================
	 6) Reservations By Hotel Names
	 ======================================================================== */
export const getReservationsByHotelNames = (
	userId,
	token,
	selectedHotels = [],
	extraParams = {}
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
		}
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching reservationsByHotelNames data:", err)
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
	extraParams = {}
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
		}
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching topHotelsByReservations data:", err)
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
	} = {}
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
		}
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
	 9) getSpecificListOfReservations (already takes queryParamsObj)
	 ======================================================================== */
export const getSpecificListOfReservations = (
	userId,
	token,
	queryParamsObj
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
		}
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching specific list of reservations:", err)
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
		}
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) =>
			console.error("Error fetching specific list of reservations:", err)
		);
};

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
	} = {}
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

	return fetch(
		`${process.env.REACT_APP_API_URL}/adminreports/hotel-occupancy/${userId}?${params.toString()}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
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
	} = {}
) => {
	if (!hotelId) {
		return Promise.reject(new Error("hotelId is required for occupancy warnings"));
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

	return fetch(
		`${process.env.REACT_APP_API_URL}/adminreports/hotel-occupancy-warnings/${userId}?${params.toString()}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
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
	} = {}
) => {
	if (!hotelId) {
		return Promise.reject(new Error("hotelId is required for day reservations"));
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

	return fetch(
		`${process.env.REACT_APP_API_URL}/adminreports/hotel-occupancy-day-reservations/${userId}?${params.toString()}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
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
		}
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
		}
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
		}
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
		}
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
		}
	);
	if (!res.ok) throw new Error("Failed to list hotels");
	return res.json(); // { count, hotels: [{ _id, hotelName }] }
}

/* ===== Admin reservation updates (audit-logged) ===== */
export async function adminUpdateCommissionStatus(
	{ reservationId, commissionPaid, note },
	{ token } = {}
) {
	const res = await fetch(
		`${process.env.REACT_APP_API_URL}/admin-payouts/commission-status`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...authHeaders(token) },
			body: JSON.stringify({ reservationId, commissionPaid, note }),
		}
	);
	const json = await res.json();
	if (!res.ok)
		throw new Error(json?.message || "Failed to update commission status");
	return json;
}
export async function adminUpdateTransferStatus(
	{ reservationId, moneyTransferredToHotel, note },
	{ token } = {}
) {
	const res = await fetch(
		`${process.env.REACT_APP_API_URL}/admin-payouts/transfer-status`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...authHeaders(token) },
			body: JSON.stringify({ reservationId, moneyTransferredToHotel, note }),
		}
	);
	const json = await res.json();
	if (!res.ok)
		throw new Error(json?.message || "Failed to update transfer status");
	return json;
}
export async function adminUpdateReservationPayoutFlags(
	payload,
	{ token } = {}
) {
	const res = await fetch(
		`${process.env.REACT_APP_API_URL}/admin-payouts/update-reservation`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...authHeaders(token) },
			body: JSON.stringify(payload),
		}
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
		}
	);
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err?.message || "Failed to reconcile");
	}
	return res.json();
};
