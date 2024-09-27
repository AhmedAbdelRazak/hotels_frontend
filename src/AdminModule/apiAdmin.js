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
