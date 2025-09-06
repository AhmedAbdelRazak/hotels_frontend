import axios from "axios";

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

export const createNewReservation = (
	userId,
	hotelId,
	token,
	new_reservation
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
	token
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
	reservationEmail
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
		}),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
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

export const getHotelReservations = (hotelId, userId, startdate, enddate) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/${startdate}/${enddate}/${hotelId}/${userId}`,
		{
			method: "GET",
		}
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
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getReservationSearch = (searchQuery, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/search/${searchQuery}/${hotelId}`,
		{
			method: "GET",
		}
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
		}
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
		}
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
	channel
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-checkedout/${page}/${records}/${hotelId}/${channel}/${startDate}/${endDate}`,
		{
			method: "GET",
		}
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
		}
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
	payment
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-general-report/${page}/${records}/${hotelId}/${channel}/${startDate}/${endDate}/${dateBy}/${noshow}/${cancel}/${inhouse}/${showCheckedout}/${payment}`,
		{
			method: "GET",
		}
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
	payment
) => {
	console.log("From API Admin getGeneralReportReservations", hotelId);
	return fetch(
		`${process.env.REACT_APP_API_URL}/general-report-reservations/list/${hotelId}/${channel}/${startDate}/${endDate}/${dateBy}/${noshow}/${cancel}/${inhouse}/${showCheckedout}/${payment}`,
		{
			method: "GET",
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getReservationSummary = (hotelId, date) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-summary/${hotelId}/${date}`,
		{
			method: "GET",
		}
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
	date
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations/get-total-records/${page}/${records}/${filters}/${hotelId}/${date}`,
		{
			method: "GET",
		}
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
	channel
) => {
	console.log("From API Admin checkedoutReservationsTotalRecords", hotelId);

	return fetch(
		`${process.env.REACT_APP_API_URL}/reservations-summary-checkedout/${hotelId}/${channel}/${startDate}/${endDate}`,
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
		`${process.env.REACT_APP_API_URL}/reservations/single-reservation/${reservationNumber}/${hotelId}/${belongsTo}`,
		{
			method: "GET",
		}
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
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
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

export const gettingRoomInventory = (startdate, enddate, userId, accountId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/room-inventory-reserved/${startdate}/${enddate}/${userId}/${accountId}`,
		{
			method: "GET",
		}
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
		}
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
		}
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
		}
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
		}
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
		}
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
		}
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
		}
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
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getHotelById = (hotelId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/hotel-details/${hotelId}`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
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
		}
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
		}
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
		}
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
		}
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
		}
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
		}
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
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const currecyConversion = (saudimoney) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/currencyapi/${Number(saudimoney).toFixed(
			2
		)}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		}
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
		}
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
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createNewHouseKeepingTask = (hotelId, housekeeping) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping/create/${hotelId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(housekeeping),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getAllHouseKeepingTasks = (page, records, hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping-list/${page}/${records}/${hotelId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getAllHouseKeepingTotalRecords = (hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping-total-records/${hotelId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		}
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
			},
		}
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
			},
			body: JSON.stringify(task),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getEmployeeWorkLoad = (userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/house-keeping-employee/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		}
	)
		.then((response) => {
			return response.json();
		})
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
		}
	)
		.then((response) => {
			return response.json();
		})
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
		}
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
		}
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
		}
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
		}
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
		}
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

export const gettingAdminDashboardFigures = (hotelId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin-dashboard-reports/${hotelId}`,
		{
			method: "GET",
		}
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
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/reservations-by-day/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/checkins-by-day/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/checkouts-by-day/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/reservations-by-day-by-hotel/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/reservations-by-booking-status/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/reservations-by-hotel-names/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/top-hotels-by-reservations/${userId}${query}`,
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
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/specific-list/${userId}?${queryString}`,
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
		`${process.env.REACT_APP_API_URL}/hotel-adminreports/export-to-excel/${userId}?${queryString}`,
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

/** Get owner (admin-side) PayPal client token for Card Fields */
export async function getOwnerPayPalClientToken({
	debug = false,
	buyerCountry,
} = {}) {
	const qs = new URLSearchParams();
	if (debug) qs.set("dbg", "1");
	if (buyerCountry) qs.set("bc", String(buyerCountry).toUpperCase());
	const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
	const url = `${base}/paypal-owner/token-generated${
		qs.toString() ? `?${qs}` : ""
	}`;
	const res = await fetch(url, { method: "GET" });
	const json = await res.json();
	if (!res.ok) {
		const errMsg =
			json?.error ||
			json?.message ||
			"Failed to fetch PayPal client token (owner)";
		throw new Error(errMsg);
	}
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

/** Soft delete owner method (hide from UI) */
export async function softDeleteOwnerPaymentMethod(
	{ hotelId, methodId },
	opts = {}
) {
	const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
	const url = `${base}/paypal-owner/payment-methods/delete`;
	const { data } = await axios.post(
		url,
		{ hotelId, methodId },
		{
			headers: {
				"Content-Type": "application/json",
				...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
			},
			withCredentials: false,
		}
	);
	return data;
}

/** Create a PayPal Vault setup_token for 'card' | 'paypal' | 'venmo' */
export async function createOwnerPayPalSetupToken({
	paymentSource = "card",
	token,
} = {}) {
	const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
	const url = `${base}/paypal-owner/setup-token`;
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({
			payment_source: String(paymentSource).toLowerCase(),
		}),
		credentials: "omit",
	});
	const json = await res.json();
	if (!res.ok || !json?.id) {
		const msg = json?.message || "Failed to create PayPal setup token";
		const e = new Error(msg);
		e.response = json;
		throw e;
	}
	return json.id; // setup_token id
}

/** Exchange setup_token -> vault & save on hotel (cards & wallets) */
export async function saveOwnerVaultCard(
	{ hotelId, setup_token, label, setDefault },
	opts = {}
) {
	const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
	const url = `${base}/paypal-owner/vault/exchange`;
	const { data } = await axios.post(
		url,
		{ hotelId, setup_token, label, setDefault: !!setDefault },
		{
			headers: {
				"Content-Type": "application/json",
				...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
			},
			withCredentials: false,
		}
	);
	return data; // { message, ownerPaymentMethods: [...] }
}

/** List stored owner payment methods (not deleted by default) */
export async function listOwnerPaymentMethods(hotelId, opts = {}) {
	const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
	const url = `${base}/paypal-owner/payment-methods/${hotelId}`;
	const { data } = await axios.get(url, {
		headers: {
			...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
		},
		withCredentials: false,
	});
	return data;
}

/** Set default owner method */
export async function setOwnerDefaultPaymentMethod(
	{ hotelId, methodId, vault_id },
	opts = {}
) {
	const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
	const url = `${base}/paypal-owner/payment-methods/set-default`;
	const { data } = await axios.post(
		url,
		{ hotelId, methodId, vault_id },
		{
			headers: {
				"Content-Type": "application/json",
				...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
			},
			withCredentials: false,
		}
	);
	return data;
}

/** Activate (soft) */
export async function activateOwnerPaymentMethod(
	{ hotelId, methodId },
	opts = {}
) {
	const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
	const url = `${base}/paypal-owner/payment-methods/activate`;
	const { data } = await axios.post(
		url,
		{ hotelId, methodId },
		{
			headers: {
				"Content-Type": "application/json",
				...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
			},
			withCredentials: false,
		}
	);
	return data;
}

/** Deactivate (soft) */
export async function deactivateOwnerPaymentMethod(
	{ hotelId, methodId },
	opts = {}
) {
	const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
	const url = `${base}/paypal-owner/payment-methods/deactivate`;
	const { data } = await axios.post(
		url,
		{ hotelId, methodId },
		{
			headers: {
				"Content-Type": "application/json",
				...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
			},
			withCredentials: false,
		}
	);
	return data;
}

/** Delete (hide) */
export async function deleteOwnerPaymentMethod(
	{ hotelId, methodId },
	opts = {}
) {
	const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
	const url = `${base}/paypal-owner/payment-methods/delete`;
	const { data } = await axios.post(
		url,
		{ hotelId, methodId },
		{
			headers: {
				"Content-Type": "application/json",
				...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
			},
			withCredentials: false,
		}
	);
	return data;
}

const API = process.env.REACT_APP_API_URL;

// Helper to add auth header when token is provided
const authHeaders = (token) =>
	token
		? {
				Authorization: `Bearer ${token}`,
		  }
		: {};

// List reservations: checked-out family + ("Paid Offline" | "Not Paid")
export async function listCommissionCandidates(
	{
		hotelId,
		page = 1,
		pageSize = 200,
		checkoutFrom, // optional ISO
		checkoutTo, // optional ISO
	},
	{ token } = {}
) {
	const params = new URLSearchParams();
	if (hotelId) params.set("hotelId", hotelId);
	params.set("page", String(page));
	params.set("pageSize", String(pageSize));
	if (checkoutFrom) params.set("checkoutFrom", checkoutFrom);
	if (checkoutTo) params.set("checkoutTo", checkoutTo);

	const res = await fetch(
		`${API}/paypal-owner/commission/candidates?${params.toString()}`,
		{ headers: { "Content-Type": "application/json", ...authHeaders(token) } }
	);
	const json = await res.json();
	if (!res.ok) throw json || new Error("Failed to fetch commission candidates");
	return json;
}

// Mark commission as paid for a batch of reservation IDs
export async function markCommissionPaid(payload, { token } = {}) {
	const res = await fetch(`${API}/paypal-owner/commission/mark-paid`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders(token) },
		body: JSON.stringify(payload),
	});
	const json = await res.json();
	if (!res.ok) throw json || new Error("Failed to mark commission paid");
	return json;
}
