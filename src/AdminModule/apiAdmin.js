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

export const gettingHotelDetailsForAdmin = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/hotel-details/admin/${userId}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
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

export const getAllReservationForAdmin = (
	userId,
	token,
	page = 1,
	limit = 100
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/all-reservations-list-admin/${userId}?page=${page}&limit=${limit}`,
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

export const triggerPayment = (
	userId,
	token,
	reservationId,
	amountUSD,
	paymentOption,
	customUSD,
	amountSAR
) => {
	return fetch(`${process.env.REACT_APP_API_URL}/create-payment/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			reservationId,
			// The final USD amount to charge via Authorize.Net
			amount: amountUSD,
			paymentOption,
			// If customAmount chosen, original custom USD typed by user
			customUSD,
			// The matching SAR amount for your own records
			amountSAR,
		}),
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.catch((err) => console.error("Error triggering payment:", err));
};

export const emailSendForTriggeringPayment = (
	userId,
	token,
	reservationId,
	amountSAR
) => {
	return fetch(`${process.env.REACT_APP_API_URL}/email-send/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			reservationId,
			amountInSAR: amountSAR, // Correct key as expected by backend
		}),
	})
		.then(async (response) => {
			const data = await response.json();
			if (!response.ok) {
				throw new Error(
					data.message || `HTTP error! Status: ${response.status}`
				);
			}
			return data;
		})
		.catch((err) => {
			console.error("Error triggering payment:", err);
			throw err; // Re-throw to handle it in the caller
		});
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
	 8) getSpecificListOfReservations (already takes queryParamsObj)
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
// End of reports for the admin
