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

export const createNewReservation = (userId, token, new_reservation) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/new-reservation/create/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(new_reservation),
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

export const getHotelRooms = (userId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/room/${userId}`, {
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
		`${process.env.REACT_APP_API_URL}/hotel-details-admin/${userId}`,
		{
			method: "GET",
			Authorization: `Bearer ${token}`,
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getHotelReservations = (userId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/new-reservation/${userId}`, {
		method: "GET",
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getHotelReservations2 = (userId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/new-reservation2/${userId}`, {
		method: "GET",
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getListOfRoomSummary = (checkinDate, checkoutDate) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/room/${checkinDate}/${checkoutDate}`,
		{
			method: "GET",
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createNewReservation2 = (userId, token, new_reservation) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/pre-reservation/create/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(new_reservation),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getReservationSearch = (searchQuery) => {
	return fetch(`${process.env.REACT_APP_API_URL}/search/${searchQuery}`, {
		method: "GET",
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updatingPreReservation = (token, Id) => {
	return fetch(`${process.env.REACT_APP_API_URL}/update/${Id}`, {
		method: "PUT",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
		// body: JSON.stringify(room),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const prereservationList = () => {
	return fetch(`${process.env.REACT_APP_API_URL}/list-prereservation`, {
		method: "GET",
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const prerservationAuto = (hotelId, belongsTo) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-from-platforms/${hotelId}/${belongsTo}`,
		{
			method: "GET",
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const singlePreReservation = (reservationNumber, hotelId, belongsTo) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/single-prereservation/${reservationNumber}/${hotelId}/${belongsTo}`,
		{
			method: "GET",
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const singlePreReservationHotelRunner = (reservationNumber) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/single-reservation/hotel-runner/${reservationNumber}`,
		{
			method: "GET",
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};
