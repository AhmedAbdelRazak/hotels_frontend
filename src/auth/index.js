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
		next();
	}
};

export const authenticate2 = (response, next) => {
	console.log("AUTHENTICATE HELPER ON SIGNIN RESPONSE", response);
	// setCookie("token", response.data.token);
	setLocalStorage("jwt", response.data);
	next();
};

export const signout = (next) => {
	if (typeof window !== "undefined") {
		localStorage.removeItem("jwt");
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

export const isAuthenticated = () => {
	if (typeof window == "undefined") {
		return false;
	}
	if (localStorage.getItem("jwt")) {
		return JSON.parse(localStorage.getItem("jwt"));
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
